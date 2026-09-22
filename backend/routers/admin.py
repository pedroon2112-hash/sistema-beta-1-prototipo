"""Rotas administrativas — TODAS protegidas no backend por sessão real."""

import re
import secrets
import sqlite3

from fastapi import APIRouter, Cookie, Depends, File, HTTPException, Response, UploadFile
from pydantic import BaseModel

from lib.catalog import load_catalog, load_order
from lib.dates_br import MONTHS_PT
from lib.security import (
    SESSION_COOKIE,
    authenticate,
    create_session,
    current_admin,
    destroy_session,
)
from lib.sqlite_db import UPLOAD_DIR, get_conn
from routers.public import serialize_order

router = APIRouter(prefix="/admin")

ALLOWED_IMAGE_EXT = {".jpg", ".jpeg", ".png", ".webp"}
MAX_IMAGE_BYTES = 5 * 1024 * 1024
SAFE_ID = re.compile(r"^[a-z0-9][a-z0-9-]{1,80}$")


# ---------------- Autenticação ----------------


class LoginIn(BaseModel):
    username: str
    password: str


@router.post("/login")
def login(payload: LoginIn, response: Response):
    if not authenticate(payload.username.strip(), payload.password):
        raise HTTPException(status_code=401, detail="Usuário ou senha inválidos.")
    token, max_age = create_session(payload.username.strip())
    response.set_cookie(
        SESSION_COOKIE,
        token,
        httponly=True,
        samesite="lax",
        max_age=max_age,
        path="/",
    )
    return {"username": payload.username.strip()}


@router.post("/logout")
def logout(response: Response, galegonn_admin: str | None = Cookie(default=None)):
    destroy_session(galegonn_admin)
    response.delete_cookie(SESSION_COOKIE, path="/")
    return {"ok": True}


@router.get("/me")
def me(username: str = Depends(current_admin)):
    return {"username": username}


# ---------------- Catálogo administrativo ----------------


@router.get("/catalog")
def admin_catalog(_: str = Depends(current_admin)):
    """Mesmos dados do site público, incluindo produtos desativados."""
    return load_catalog(include_unavailable=True)


class ProductIn(BaseModel):
    id: str | None = None
    name: str
    description: str | None = None
    categoryId: str
    image: str | None = None
    basePriceCents: int | None = None
    available: bool = True


def _slug(text: str) -> str:
    import unicodedata

    norm = unicodedata.normalize("NFD", text)
    ascii_text = "".join(c for c in norm if unicodedata.category(c) != "Mn")
    slug = re.sub(r"[^a-z0-9]+", "-", ascii_text.lower()).strip("-")
    return slug[:80] or "produto"


@router.post("/products", status_code=201)
def create_product(payload: ProductIn, _: str = Depends(current_admin)):
    conn = get_conn()
    if not payload.name.strip():
        raise HTTPException(status_code=422, detail="Informe o nome do produto.")
    cat = conn.execute(
        "SELECT 1 FROM categories WHERE id = ?", (payload.categoryId,)
    ).fetchone()
    if cat is None:
        raise HTTPException(status_code=422, detail="Categoria inválida.")

    pid = (payload.id or _slug(payload.name)).strip()
    if not SAFE_ID.match(pid):
        pid = _slug(payload.name)
    base = pid
    n = 2
    while conn.execute("SELECT 1 FROM products WHERE id = ?", (pid,)).fetchone():
        pid = f"{base}-{n}"
        n += 1

    pos_row = conn.execute(
        "SELECT COALESCE(MAX(position), -1) + 1 AS p FROM products WHERE category_id = ?",
        (payload.categoryId,),
    ).fetchone()
    conn.execute(
        """INSERT INTO products (id, name, description, category_id, image,
                                 base_price_cents, available, position)
           VALUES (?,?,?,?,?,?,?,?)""",
        (
            pid,
            payload.name.strip(),
            (payload.description or "").strip() or None,
            payload.categoryId,
            payload.image or "",
            payload.basePriceCents,
            1 if payload.available else 0,
            pos_row["p"],
        ),
    )
    return {"id": pid}


class ProductPatch(BaseModel):
    name: str | None = None
    description: str | None = None
    categoryId: str | None = None
    image: str | None = None
    basePriceCents: int | None = None
    available: bool | None = None
    position: int | None = None


@router.patch("/products/{product_id}")
def update_product(product_id: str, payload: ProductPatch, _: str = Depends(current_admin)):
    conn = get_conn()
    row = conn.execute("SELECT * FROM products WHERE id = ?", (product_id,)).fetchone()
    if row is None:
        raise HTTPException(status_code=404, detail="Produto não encontrado.")

    fields: list[str] = []
    values: list = []
    mapping = {
        "name": ("name", lambda v: v.strip()),
        "description": ("description", lambda v: (v or "").strip() or None),
        "categoryId": ("category_id", lambda v: v),
        "image": ("image", lambda v: v),
        "basePriceCents": ("base_price_cents", lambda v: v),
        "available": ("available", lambda v: 1 if v else 0),
        "position": ("position", lambda v: v),
    }
    data = payload.model_dump(exclude_unset=True)
    for key, value in data.items():
        column, coerce = mapping[key]
        if key == "basePriceCents" and value is not None and int(value) < 0:
            raise HTTPException(status_code=422, detail="Preço inválido.")
        if key == "categoryId":
            if conn.execute("SELECT 1 FROM categories WHERE id = ?", (value,)).fetchone() is None:
                raise HTTPException(status_code=422, detail="Categoria inválida.")
        fields.append(f"{column} = ?")
        values.append(coerce(value))
    if fields:
        values.append(product_id)
        conn.execute(f"UPDATE products SET {', '.join(fields)} WHERE id = ?", values)
    return {"ok": True}


@router.delete("/products/{product_id}")
def delete_product(product_id: str, _: str = Depends(current_admin)):
    """Remove do cardápio atual. Pedidos históricos preservam o snapshot."""
    conn = get_conn()
    if conn.execute("SELECT 1 FROM products WHERE id = ?", (product_id,)).fetchone() is None:
        raise HTTPException(status_code=404, detail="Produto não encontrado.")
    conn.execute("DELETE FROM products WHERE id = ?", (product_id,))
    return {"ok": True}


class VariantIn(BaseModel):
    label: str
    priceCents: int
    variantKey: str | None = None


@router.put("/products/{product_id}/variants")
def set_variants(product_id: str, payload: list[VariantIn], _: str = Depends(current_admin)):
    """Edita os preços/tamanhos DENTRO da mesma pizza (§25)."""
    conn = get_conn()
    if conn.execute("SELECT 1 FROM products WHERE id = ?", (product_id,)).fetchone() is None:
        raise HTTPException(status_code=404, detail="Produto não encontrado.")
    for v in payload:
        if v.priceCents < 0:
            raise HTTPException(status_code=422, detail="Preço inválido.")
    try:
        conn.execute("BEGIN IMMEDIATE")
        conn.execute("DELETE FROM variants WHERE product_id = ?", (product_id,))
        for idx, v in enumerate(payload):
            key = (v.variantKey or _slug(v.label))[:40]
            conn.execute(
                """INSERT INTO variants (product_id, variant_key, label, price_cents, position)
                   VALUES (?,?,?,?,?)""",
                (product_id, key, v.label.strip(), v.priceCents, idx),
            )
        conn.execute("COMMIT")
    except Exception:
        conn.execute("ROLLBACK")
        raise HTTPException(status_code=500, detail="Não foi possível salvar as variantes.")
    return {"ok": True}


class OptionIn(BaseModel):
    label: str
    priceCents: int = 0
    optionKey: str | None = None


class OptionGroupIn(BaseModel):
    groupKey: str | None = None
    label: str
    hint: str | None = None
    required: bool = False
    minSelect: int = 0
    maxSelect: int = 1
    noExtraCost: bool = False
    allowQuantity: bool = False
    options: list[OptionIn]


@router.put("/products/{product_id}/option-groups")
def set_option_groups(
    product_id: str, payload: list[OptionGroupIn], _: str = Depends(current_admin)
):
    """Sabores, acompanhamentos, adicionais e LIMITES — tudo no banco (§25)."""
    conn = get_conn()
    if conn.execute("SELECT 1 FROM products WHERE id = ?", (product_id,)).fetchone() is None:
        raise HTTPException(status_code=404, detail="Produto não encontrado.")
    for g in payload:
        if g.maxSelect < 1 or g.minSelect < 0 or g.minSelect > g.maxSelect:
            raise HTTPException(status_code=422, detail="Limites de seleção inválidos.")
    try:
        conn.execute("BEGIN IMMEDIATE")
        conn.execute("DELETE FROM option_groups WHERE product_id = ?", (product_id,))
        for gidx, g in enumerate(payload):
            cur = conn.execute(
                """INSERT INTO option_groups (product_id, group_key, label, hint, required,
                                              min_select, max_select, no_extra_cost,
                                              allow_quantity, position)
                   VALUES (?,?,?,?,?,?,?,?,?,?)""",
                (
                    product_id,
                    (g.groupKey or _slug(g.label))[:40],
                    g.label.strip(),
                    (g.hint or "").strip() or None,
                    1 if g.required else 0,
                    g.minSelect,
                    g.maxSelect,
                    1 if g.noExtraCost else 0,
                    1 if g.allowQuantity else 0,
                    gidx,
                ),
            )
            gid = cur.lastrowid
            for oidx, o in enumerate(g.options):
                conn.execute(
                    """INSERT INTO options (group_id, option_key, label, price_cents, position)
                       VALUES (?,?,?,?,?)""",
                    (
                        gid,
                        (o.optionKey or _slug(o.label))[:40],
                        o.label.strip(),
                        max(0, o.priceCents),
                        oidx,
                    ),
                )
        conn.execute("COMMIT")
    except HTTPException:
        conn.execute("ROLLBACK")
        raise
    except Exception:
        conn.execute("ROLLBACK")
        raise HTTPException(status_code=500, detail="Não foi possível salvar as opções.")
    return {"ok": True}


# ---------------- Mais Pedidos ----------------


class FeaturedIn(BaseModel):
    productIds: list[str]


@router.put("/featured")
def set_featured(payload: FeaturedIn, _: str = Depends(current_admin)):
    conn = get_conn()
    for pid in payload.productIds:
        if conn.execute("SELECT 1 FROM products WHERE id = ?", (pid,)).fetchone() is None:
            raise HTTPException(status_code=422, detail=f"Produto inexistente: {pid}")
    try:
        conn.execute("BEGIN IMMEDIATE")
        conn.execute("DELETE FROM featured")
        for idx, pid in enumerate(payload.productIds):
            conn.execute(
                "INSERT INTO featured (product_id, position) VALUES (?, ?)", (pid, idx)
            )
        conn.execute("COMMIT")
    except Exception:
        conn.execute("ROLLBACK")
        raise HTTPException(status_code=500, detail="Não foi possível salvar os destaques.")
    return {"ok": True}


# ---------------- Mesas ----------------


class TableIn(BaseModel):
    label: str


@router.post("/tables", status_code=201)
def create_table(payload: TableIn, _: str = Depends(current_admin)):
    conn = get_conn()
    label = payload.label.strip()
    if not label:
        raise HTTPException(status_code=422, detail="Informe a identificação da mesa.")
    if conn.execute("SELECT 1 FROM tables WHERE label = ?", (label,)).fetchone():
        raise HTTPException(status_code=409, detail="Já existe uma mesa com essa identificação.")
    pos = conn.execute("SELECT COALESCE(MAX(position),0)+1 AS p FROM tables").fetchone()["p"]
    cur = conn.execute("INSERT INTO tables (label, position) VALUES (?, ?)", (label[:40], pos))
    return {"id": cur.lastrowid, "label": label[:40]}


@router.patch("/tables/{table_id}")
def rename_table(table_id: int, payload: TableIn, _: str = Depends(current_admin)):
    conn = get_conn()
    label = payload.label.strip()[:40]
    if not label:
        raise HTTPException(status_code=422, detail="Informe a identificação da mesa.")
    if conn.execute("SELECT 1 FROM tables WHERE id = ?", (table_id,)).fetchone() is None:
        raise HTTPException(status_code=404, detail="Mesa não encontrada.")
    if conn.execute(
        "SELECT 1 FROM tables WHERE label = ? AND id <> ?", (label, table_id)
    ).fetchone():
        raise HTTPException(status_code=409, detail="Já existe uma mesa com essa identificação.")
    conn.execute("UPDATE tables SET label = ? WHERE id = ?", (label, table_id))
    return {"ok": True}


@router.delete("/tables/{table_id}")
def delete_table(table_id: int, _: str = Depends(current_admin)):
    """Remove do cadastro atual; pedidos antigos mantêm a mesa no snapshot (§28)."""
    conn = get_conn()
    if conn.execute("SELECT 1 FROM tables WHERE id = ?", (table_id,)).fetchone() is None:
        raise HTTPException(status_code=404, detail="Mesa não encontrada.")
    conn.execute("DELETE FROM tables WHERE id = ?", (table_id,))
    return {"ok": True}


# ---------------- Informações do restaurante ----------------


class RestaurantIn(BaseModel):
    name: str | None = None
    tagline: str | None = None
    logo: str | None = None
    heroImage: str | None = None
    instagram: str | None = None
    whatsapp: str | None = None
    phone: str | None = None
    address: str | None = None
    openingHours: str | None = None


@router.patch("/restaurant")
def update_restaurant(payload: RestaurantIn, _: str = Depends(current_admin)):
    conn = get_conn()
    mapping = {
        "name": "name",
        "tagline": "tagline",
        "logo": "logo",
        "heroImage": "hero_image",
        "instagram": "instagram",
        "whatsapp": "whatsapp",
        "phone": "phone",
        "address": "address",
        "openingHours": "opening_hours",
    }
    data = payload.model_dump(exclude_unset=True)
    fields, values = [], []
    for key, value in data.items():
        cleaned = (value or "").strip() or None
        if key in ("name", "tagline") and not cleaned:
            raise HTTPException(status_code=422, detail="Nome e slogan não podem ficar vazios.")
        fields.append(f"{mapping[key]} = ?")
        values.append(cleaned)
    if fields:
        values.append(1)
        conn.execute(f"UPDATE restaurant SET {', '.join(fields)} WHERE id = ?", values)
    return {"ok": True}


# ---------------- Upload de imagem ----------------


@router.post("/uploads", status_code=201)
async def upload_image(file: UploadFile = File(...), _: str = Depends(current_admin)):
    """Salva a imagem com nome seguro; o site público passa a usá-la sem recompilar."""
    original = (file.filename or "").strip()
    ext = ""
    if "." in original:
        ext = "." + original.rsplit(".", 1)[1].lower()
    if ext not in ALLOWED_IMAGE_EXT:
        raise HTTPException(
            status_code=422, detail="Formato inválido. Use JPG, PNG ou WEBP."
        )
    if (file.content_type or "") not in (
        "image/jpeg",
        "image/png",
        "image/webp",
    ):
        raise HTTPException(status_code=422, detail="Tipo de arquivo inválido.")

    data = await file.read()
    if len(data) == 0:
        raise HTTPException(status_code=422, detail="Arquivo vazio.")
    if len(data) > MAX_IMAGE_BYTES:
        raise HTTPException(status_code=422, detail="Imagem maior que 5 MB.")

    # valida que é imagem de verdade
    try:
        from io import BytesIO

        from PIL import Image

        Image.open(BytesIO(data)).verify()
    except Exception as exc:
        raise HTTPException(status_code=422, detail="Arquivo não é uma imagem válida.") from exc

    # nome seguro + sufixo aleatório: sem path traversal e sem colisão
    stem = re.sub(r"[^a-z0-9-]+", "-", original.rsplit(".", 1)[0].lower()).strip("-")[:40]
    safe_name = f"{stem or 'imagem'}-{secrets.token_hex(6)}{ext}"
    target = (UPLOAD_DIR / safe_name).resolve()
    if UPLOAD_DIR.resolve() not in target.parents:
        raise HTTPException(status_code=400, detail="Caminho de arquivo inválido.")
    target.write_bytes(data)
    return {"url": f"/uploads/{safe_name}"}


# ---------------- Pedidos, histórico e faturamento ----------------


@router.get("/orders/periods")
def order_periods(_: str = Depends(current_admin)):
    """Árvore Ano → Mês → Dia com faturamento por nível (§22/§23)."""
    conn = get_conn()
    rows = conn.execute(
        """SELECT year, month, day, kind, COUNT(*) AS orders, SUM(total_cents) AS total
           FROM orders GROUP BY year, month, day, kind
           ORDER BY year DESC, month DESC, day DESC"""
    ).fetchall()

    years: dict[int, dict] = {}
    for r in rows:
        y = years.setdefault(
            r["year"],
            {"year": r["year"], "localCents": 0, "deliveryCents": 0, "orders": 0, "months": {}},
        )
        m = y["months"].setdefault(
            r["month"],
            {
                "month": r["month"],
                "label": MONTHS_PT[r["month"]],
                "localCents": 0,
                "deliveryCents": 0,
                "orders": 0,
                "days": {},
            },
        )
        d = m["days"].setdefault(
            r["day"],
            {"day": r["day"], "localCents": 0, "deliveryCents": 0, "orders": 0},
        )
        key = "localCents" if r["kind"] == "local" else "deliveryCents"
        total = int(r["total"] or 0)
        for node in (y, m, d):
            node[key] += total
            node["orders"] += r["orders"]
        d["date"] = f"{r['year']:04d}-{r['month']:02d}-{r['day']:02d}"

    def finish(node: dict) -> dict:
        node["totalCents"] = node["localCents"] + node["deliveryCents"]
        return node

    out = []
    for y in sorted(years.values(), key=lambda x: -x["year"]):
        months = []
        for m in sorted(y["months"].values(), key=lambda x: -x["month"]):
            days = [finish(d) for d in sorted(m["days"].values(), key=lambda x: -x["day"])]
            m["days"] = days
            months.append(finish(m))
        y["months"] = months
        out.append(finish(y))
    return {"years": out}


@router.get("/orders")
def list_orders(
    date: str | None = None,
    year: int | None = None,
    month: int | None = None,
    kind: str | None = None,
    limit: int = 100,
    offset: int = 0,
    _: str = Depends(current_admin),
):
    """Lista paginada por período — nunca carrega o histórico inteiro (§36)."""
    conn = get_conn()
    clauses, params = [], []
    if date:
        clauses.append("local_date = ?")
        params.append(date)
    if year:
        clauses.append("year = ?")
        params.append(year)
    if month:
        clauses.append("month = ?")
        params.append(month)
    if kind in ("local", "delivery"):
        clauses.append("kind = ?")
        params.append(kind)
    where = f"WHERE {' AND '.join(clauses)}" if clauses else ""
    limit = max(1, min(int(limit), 200))

    total_row = conn.execute(
        f"SELECT COUNT(*) AS c, COALESCE(SUM(total_cents),0) AS t FROM orders {where}", params
    ).fetchone()
    rows = conn.execute(
        f"""SELECT id, kind, number, local_date, local_time, table_label, customer_name,
                   payment_method, total_cents
            FROM orders {where}
            ORDER BY created_at DESC LIMIT ? OFFSET ?""",
        [*params, limit, max(0, int(offset))],
    ).fetchall()

    from lib.catalog import PAYMENT_LABELS

    return {
        "count": total_row["c"],
        "sumCents": total_row["t"],
        "orders": [
            {
                "id": r["id"],
                "kind": r["kind"],
                "number": r["number"],
                "localDate": r["local_date"],
                "localTime": r["local_time"],
                "tableLabel": r["table_label"],
                "customerName": r["customer_name"],
                "paymentLabel": PAYMENT_LABELS.get(r["payment_method"], r["payment_method"]),
                "totalCents": r["total_cents"],
                "comandaUrl": f"/api/orders/{r['id']}/comanda.pdf",
            }
            for r in rows
        ],
    }


@router.get("/orders/by-table")
def orders_by_table(date: str, _: str = Depends(current_admin)):
    """Agrupamento HISTÓRICO por mesa — não é conta aberta (§9/§22)."""
    conn = get_conn()
    rows = conn.execute(
        """SELECT table_label, COUNT(*) AS comandas, SUM(total_cents) AS total
           FROM orders WHERE kind = 'local' AND local_date = ?
           GROUP BY table_label ORDER BY table_label""",
        (date,),
    ).fetchall()
    groups = []
    for r in rows:
        orders = conn.execute(
            """SELECT id, number, local_time, total_cents FROM orders
               WHERE kind='local' AND local_date=? AND table_label IS ?
               ORDER BY number""",
            (date, r["table_label"]),
        ).fetchall()
        groups.append(
            {
                "tableLabel": r["table_label"],
                "comandas": r["comandas"],
                "totalCents": int(r["total"] or 0),
                "orders": [
                    {
                        "id": o["id"],
                        "number": o["number"],
                        "localTime": o["local_time"],
                        "totalCents": o["total_cents"],
                        "comandaUrl": f"/api/orders/{o['id']}/comanda.pdf",
                    }
                    for o in orders
                ],
            }
        )
    return {"date": date, "groups": groups}


@router.get("/orders/{order_id}")
def admin_order_detail(order_id: str, _: str = Depends(current_admin)):
    order = load_order(get_conn(), order_id)
    if order is None:
        raise HTTPException(status_code=404, detail="Pedido não encontrado.")
    return serialize_order(order)
