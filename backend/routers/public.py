"""Rotas públicas: catálogo, mesas e criação de pedidos reais."""

import sqlite3
import uuid

from fastapi import APIRouter, HTTPException, Response
from pydantic import BaseModel, Field

from lib.catalog import (
    PAYMENT_LABELS,
    OrderValidationError,
    load_catalog,
    load_order,
    price_order_items,
)
from lib.dates_br import local_parts, now_utc, utc_iso
from lib.pdf import build_comanda_pdf, comanda_filename
from lib.sqlite_db import get_conn

router = APIRouter()


# ---------- Modelos (espelhados em frontend/src/data/types.ts) ----------


class SelectedOptionIn(BaseModel):
    groupId: str
    optionId: str
    quantity: int = 1


class OrderItemIn(BaseModel):
    productId: str
    variantId: str | None = None
    options: list[SelectedOptionIn] = Field(default_factory=list)
    quantity: int = 1
    note: str | None = None


class DeliveryIn(BaseModel):
    name: str
    phone: str
    address: str
    number: str
    complement: str | None = None
    reference: str | None = None


class OrderCreate(BaseModel):
    mode: str  # "local" | "delivery"
    tableLabel: str | None = None
    delivery: DeliveryIn | None = None
    paymentMethod: str
    items: list[OrderItemIn]
    expectedTotalCents: int | None = None
    idempotencyKey: str


class OrderItemOptionOut(BaseModel):
    groupLabel: str
    optionLabel: str
    unitPriceCents: int
    quantity: int
    noExtraCost: bool


class OrderItemOut(BaseModel):
    productId: str
    productName: str
    variantLabel: str | None
    unitPriceCents: int
    quantity: int
    subtotalCents: int
    note: str | None
    options: list[OrderItemOptionOut]


class OrderOut(BaseModel):
    id: str
    kind: str
    number: int
    localDate: str
    localTime: str
    tableLabel: str | None
    customerName: str | None
    phone: str | None
    address: str | None
    addressNumber: str | None
    complement: str | None
    reference: str | None
    paymentMethod: str
    paymentLabel: str
    totalCents: int
    items: list[OrderItemOut]
    comandaUrl: str
    comandaFilename: str


def serialize_order(order: dict) -> OrderOut:
    return OrderOut(
        id=order["id"],
        kind=order["kind"],
        number=order["number"],
        localDate=order["local_date"],
        localTime=order["local_time"],
        tableLabel=order.get("table_label"),
        customerName=order.get("customer_name"),
        phone=order.get("phone"),
        address=order.get("address"),
        addressNumber=order.get("address_number"),
        complement=order.get("complement"),
        reference=order.get("reference"),
        paymentMethod=order["payment_method"],
        paymentLabel=order["payment_label"],
        totalCents=order["total_cents"],
        items=[
            OrderItemOut(
                productId=i["product_id"],
                productName=i["product_name"],
                variantLabel=i["variant_label"],
                unitPriceCents=i["unit_price_cents"],
                quantity=i["quantity"],
                subtotalCents=i["subtotal_cents"],
                note=i["note"],
                options=[
                    OrderItemOptionOut(
                        groupLabel=o["group_label"],
                        optionLabel=o["option_label"],
                        unitPriceCents=o["unit_price_cents"],
                        quantity=o["quantity"],
                        noExtraCost=bool(o["no_extra_cost"]),
                    )
                    for o in i["options"]
                ],
            )
            for i in order["items"]
        ],
        comandaUrl=f"/api/orders/{order['id']}/comanda.pdf",
        comandaFilename=comanda_filename(order),
    )


# ---------- Catálogo público ----------


@router.get("/catalog")
def get_catalog():
    """Cardápio, destaques, mesas e dados do restaurante — direto do SQLite."""
    return load_catalog()


# ---------- Criação de pedido ----------


def _next_number(conn: sqlite3.Connection, kind: str) -> int:
    """Contadores Local/Delivery independentes, dentro da transação (§11/§32)."""
    conn.execute(
        "INSERT OR IGNORE INTO counters (kind, last_number) VALUES (?, 0)", (kind,)
    )
    conn.execute("UPDATE counters SET last_number = last_number + 1 WHERE kind = ?", (kind,))
    row = conn.execute("SELECT last_number FROM counters WHERE kind = ?", (kind,)).fetchone()
    return int(row["last_number"])


@router.post("/orders", response_model=OrderOut, status_code=201)
def create_order(payload: OrderCreate):
    conn = get_conn()

    if payload.mode not in ("local", "delivery"):
        raise HTTPException(status_code=422, detail="Modo de pedido inválido.")
    if payload.paymentMethod not in PAYMENT_LABELS:
        raise HTTPException(status_code=422, detail="Forma de pagamento inválida.")
    if not payload.idempotencyKey or len(payload.idempotencyKey) < 8:
        raise HTTPException(status_code=422, detail="Identificação da tentativa ausente.")

    # Idempotência: reenvio/clique duplo devolve o MESMO pedido (§32)
    existing = conn.execute(
        "SELECT id FROM orders WHERE idempotency_key = ?", (payload.idempotencyKey,)
    ).fetchone()
    if existing:
        order = load_order(conn, existing["id"])
        if order:
            return serialize_order(order)

    table_label = None
    customer = None
    if payload.mode == "local":
        if not payload.tableLabel:
            raise HTTPException(status_code=422, detail="Selecione a mesa.")
        row = conn.execute(
            "SELECT label FROM tables WHERE label = ?", (payload.tableLabel,)
        ).fetchone()
        if row is None:
            raise HTTPException(status_code=422, detail="Mesa inválida.")
        table_label = row["label"]
    else:
        d = payload.delivery
        if d is None:
            raise HTTPException(status_code=422, detail="Dados de entrega ausentes.")
        name = (d.name or "").strip()
        phone_digits = "".join(ch for ch in (d.phone or "") if ch.isdigit())
        address = (d.address or "").strip()
        number = (d.number or "").strip()
        if len(name) < 3:
            raise HTTPException(status_code=422, detail="Informe o nome completo.")
        if len(phone_digits) not in (10, 11):
            raise HTTPException(status_code=422, detail="Informe um telefone com DDD.")
        if len(address) < 5:
            raise HTTPException(status_code=422, detail="Informe o endereço.")
        if not number:
            raise HTTPException(status_code=422, detail="Informe o número do endereço.")
        customer = {
            "name": name[:120],
            "phone": phone_digits,
            "address": address[:200],
            "number": number[:20],
            "complement": ((d.complement or "").strip() or None),
            "reference": ((d.reference or "").strip() or None),
        }

    # Backend recalcula o valor real — nunca confia no navegador (§13)
    try:
        items, total = price_order_items(conn, payload.items)
    except OrderValidationError as exc:
        raise HTTPException(
            status_code=409, detail={"code": exc.code, "message": exc.message}
        ) from exc

    # Preço mudou entre montar e finalizar: cliente precisa revisar (§31)
    if payload.expectedTotalCents is not None and payload.expectedTotalCents != total:
        raise HTTPException(
            status_code=409,
            detail={
                "code": "price_changed",
                "message": "O preço de um item foi atualizado. Revise o carrinho.",
                "serverTotalCents": total,
                "clientTotalCents": payload.expectedTotalCents,
            },
        )

    order_id = str(uuid.uuid4())
    date_iso, time_hm, year, month, day = local_parts(now_utc())

    try:
        conn.execute("BEGIN IMMEDIATE")
        number = _next_number(conn, payload.mode)
        conn.execute(
            """INSERT INTO orders (id, kind, number, created_at, local_date, local_time,
                                   year, month, day, table_label, customer_name, phone,
                                   address, address_number, complement, reference,
                                   payment_method, total_cents, idempotency_key)
               VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
            (
                order_id,
                payload.mode,
                number,
                utc_iso(),
                date_iso,
                time_hm,
                year,
                month,
                day,
                table_label,
                customer["name"] if customer else None,
                customer["phone"] if customer else None,
                customer["address"] if customer else None,
                customer["number"] if customer else None,
                customer["complement"] if customer else None,
                customer["reference"] if customer else None,
                payload.paymentMethod,
                total,
                payload.idempotencyKey,
            ),
        )
        for pos, item in enumerate(items):
            cur = conn.execute(
                """INSERT INTO order_items (order_id, product_id, product_name, variant_label,
                                            unit_price_cents, quantity, subtotal_cents, note, position)
                   VALUES (?,?,?,?,?,?,?,?,?)""",
                (
                    order_id,
                    item["product_id"],
                    item["product_name"],
                    item["variant_label"],
                    item["unit_price_cents"],
                    item["quantity"],
                    item["subtotal_cents"],
                    item["note"],
                    pos,
                ),
            )
            item_id = cur.lastrowid
            for opt in item["options"]:
                conn.execute(
                    """INSERT INTO order_item_options (order_item_id, group_label, option_label,
                                                       unit_price_cents, quantity, no_extra_cost)
                       VALUES (?,?,?,?,?,?)""",
                    (
                        item_id,
                        opt["group_label"],
                        opt["option_label"],
                        opt["unit_price_cents"],
                        opt["quantity"],
                        opt["no_extra_cost"],
                    ),
                )
        conn.execute("COMMIT")
    except sqlite3.IntegrityError:
        conn.execute("ROLLBACK")
        # corrida na chave de idempotência: devolve o pedido já criado
        existing = conn.execute(
            "SELECT id FROM orders WHERE idempotency_key = ?", (payload.idempotencyKey,)
        ).fetchone()
        if existing:
            order = load_order(conn, existing["id"])
            if order:
                return serialize_order(order)
        raise HTTPException(status_code=500, detail="Não foi possível salvar o pedido.")
    except Exception:
        conn.execute("ROLLBACK")
        raise HTTPException(status_code=500, detail="Não foi possível salvar o pedido.")

    order = load_order(conn, order_id)
    if order is None:
        raise HTTPException(status_code=500, detail="Não foi possível salvar o pedido.")
    return serialize_order(order)


@router.get("/orders/{order_id}")
def get_order(order_id: str):
    order = load_order(get_conn(), order_id)
    if order is None:
        raise HTTPException(status_code=404, detail="Pedido não encontrado.")
    return serialize_order(order)


@router.get("/orders/{order_id}/comanda.pdf")
def get_comanda(order_id: str):
    """Comanda 58 mm regenerada do snapshot histórico (§19)."""
    order = load_order(get_conn(), order_id)
    if order is None:
        raise HTTPException(status_code=404, detail="Pedido não encontrado.")
    try:
        pdf = build_comanda_pdf(order)
    except Exception as exc:
        raise HTTPException(status_code=500, detail="Não foi possível gerar a comanda.") from exc
    return Response(
        content=pdf,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="{comanda_filename(order)}"',
            "Cache-Control": "no-store",
        },
    )
