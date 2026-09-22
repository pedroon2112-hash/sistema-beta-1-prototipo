"""Catálogo lido do SQLite + motor de preços — o BACKEND é a autoridade final.

Nunca confiamos em preço, nome ou disponibilidade enviados pelo navegador:
tudo é recalculado a partir do banco no momento da finalização (§13/§31).
"""

import sqlite3

from lib.sqlite_db import get_conn


class PriceChanged(Exception):
    """Total recalculado difere do que o cliente viu — precisa revisar (§31)."""

    def __init__(self, server_total_cents: int, client_total_cents: int):
        super().__init__("preço alterado")
        self.server_total_cents = server_total_cents
        self.client_total_cents = client_total_cents


class OrderValidationError(Exception):
    def __init__(self, message: str, code: str = "invalid"):
        super().__init__(message)
        self.message = message
        self.code = code


def load_catalog(conn: sqlite3.Connection | None = None, include_unavailable: bool = False) -> dict:
    """Catálogo completo para o site público (ou para o Admin, com indisponíveis)."""
    conn = conn or get_conn()

    categories = [
        {"id": r["id"], "label": r["label"], "position": r["position"]}
        for r in conn.execute("SELECT * FROM categories ORDER BY position, label")
    ]

    where = "" if include_unavailable else "WHERE available = 1"
    products: dict[str, dict] = {}
    order = []
    for r in conn.execute(
        f"SELECT * FROM products {where} ORDER BY category_id, position, name"
    ):
        products[r["id"]] = {
            "id": r["id"],
            "name": r["name"],
            "description": r["description"],
            "categoryId": r["category_id"],
            "image": r["image"],
            "basePriceCents": r["base_price_cents"],
            "available": bool(r["available"]),
            "position": r["position"],
            "variants": [],
            "optionGroups": [],
        }
        order.append(r["id"])

    for r in conn.execute("SELECT * FROM variants ORDER BY product_id, position"):
        if r["product_id"] in products:
            products[r["product_id"]]["variants"].append(
                {
                    "id": r["variant_key"],
                    "label": r["label"],
                    "priceCents": r["price_cents"],
                }
            )

    groups: dict[int, dict] = {}
    for r in conn.execute("SELECT * FROM option_groups ORDER BY product_id, position"):
        group = {
            "id": r["group_key"],
            "groupDbId": r["id"],
            "label": r["label"],
            "hint": r["hint"],
            "required": bool(r["required"]),
            "minSelect": r["min_select"],
            "maxSelect": r["max_select"],
            "noExtraCost": bool(r["no_extra_cost"]),
            "allowQuantity": bool(r["allow_quantity"]),
            "options": [],
        }
        groups[r["id"]] = group
        if r["product_id"] in products:
            products[r["product_id"]]["optionGroups"].append(group)

    for r in conn.execute("SELECT * FROM options ORDER BY group_id, position"):
        if r["group_id"] in groups:
            groups[r["group_id"]]["options"].append(
                {
                    "id": r["option_key"],
                    "label": r["label"],
                    "priceCents": r["price_cents"],
                }
            )

    featured = [
        r["product_id"]
        for r in conn.execute("SELECT product_id FROM featured ORDER BY position")
        if r["product_id"] in products
    ]

    rest = conn.execute("SELECT * FROM restaurant WHERE id = 1").fetchone()
    restaurant = (
        {
            "name": rest["name"],
            "tagline": rest["tagline"],
            "logo": rest["logo"],
            "heroImage": rest["hero_image"],
            "instagram": rest["instagram"],
            "whatsapp": rest["whatsapp"],
            "phone": rest["phone"],
            "address": rest["address"],
            "openingHours": rest["opening_hours"],
        }
        if rest
        else {}
    )

    tables = [
        {"id": r["id"], "label": r["label"]}
        for r in conn.execute("SELECT * FROM tables ORDER BY position, id")
    ]

    return {
        "categories": categories,
        "products": [products[pid] for pid in order],
        "featuredProductIds": featured,
        "restaurant": restaurant,
        "tables": tables,
    }


PAYMENT_LABELS = {
    "pix": "PIX",
    "dinheiro": "Dinheiro",
    "cartao-credito": "Cartão — Crédito",
    "cartao-debito": "Cartão — Débito",
}


def price_order_items(conn: sqlite3.Connection, items: list) -> tuple[list[dict], int]:
    """Recalcula cada item a partir do banco e devolve (snapshots, total_cents).

    Rejeita produto inexistente/indisponível, variante inválida, opção que não
    pertence ao produto e estouro do limite de seleção do grupo.
    """
    if not items:
        raise OrderValidationError("O carrinho está vazio.", "empty_cart")

    snapshots: list[dict] = []
    total = 0

    for raw in items:
        product = conn.execute(
            "SELECT * FROM products WHERE id = ?", (raw.productId,)
        ).fetchone()
        if product is None:
            raise OrderValidationError(
                f"Produto não encontrado no cardápio.", "product_not_found"
            )
        if not product["available"]:
            raise OrderValidationError(
                f"{product['name']} ficou indisponível.", "product_unavailable"
            )

        quantity = int(raw.quantity)
        if quantity < 1 or quantity > 50:
            raise OrderValidationError("Quantidade inválida.", "invalid_quantity")

        # --- preço base: variante (quando existir) ou preço do produto ---
        variants = conn.execute(
            "SELECT * FROM variants WHERE product_id = ? ORDER BY position",
            (product["id"],),
        ).fetchall()
        variant_label = None
        if variants:
            if not raw.variantId:
                raise OrderValidationError(
                    f"Escolha o tamanho de {product['name']}.", "variant_required"
                )
            match = next((v for v in variants if v["variant_key"] == raw.variantId), None)
            if match is None:
                raise OrderValidationError("Tamanho inválido.", "variant_invalid")
            base_unit = match["price_cents"]
            variant_label = match["label"]
        else:
            if product["base_price_cents"] is None:
                raise OrderValidationError(
                    f"{product['name']} está sem preço definido.", "no_price"
                )
            base_unit = product["base_price_cents"]

        # --- opções: precisam pertencer a um grupo DESTE produto ---
        group_rows = conn.execute(
            "SELECT * FROM option_groups WHERE product_id = ? ORDER BY position",
            (product["id"],),
        ).fetchall()
        groups_by_key = {g["group_key"]: g for g in group_rows}

        selected_by_group: dict[str, int] = {}
        option_snapshots: list[dict] = []
        extras_unit = 0

        for sel in raw.options or []:
            group = groups_by_key.get(sel.groupId)
            if group is None:
                raise OrderValidationError(
                    "Opção inválida para este produto.", "option_group_invalid"
                )
            option = conn.execute(
                "SELECT * FROM options WHERE group_id = ? AND option_key = ?",
                (group["id"], sel.optionId),
            ).fetchone()
            if option is None:
                raise OrderValidationError("Opção inválida.", "option_invalid")

            opt_qty = int(sel.quantity or 1)
            if group["allow_quantity"]:
                if opt_qty < 1 or opt_qty > 20:
                    raise OrderValidationError("Quantidade de adicional inválida.", "invalid_quantity")
            else:
                opt_qty = 1

            selected_by_group[group["group_key"]] = selected_by_group.get(group["group_key"], 0) + 1

            # Acompanhamento incluso NÃO soma; adicional extra soma (§15)
            unit_price = 0 if group["no_extra_cost"] else option["price_cents"]
            extras_unit += unit_price * opt_qty

            option_snapshots.append(
                {
                    "group_label": group["label"],
                    "option_label": option["label"],
                    "unit_price_cents": unit_price,
                    "quantity": opt_qty,
                    "no_extra_cost": 1 if group["no_extra_cost"] else 0,
                }
            )

        # limites de seleção vindos do banco (nada hardcoded)
        for group in group_rows:
            count = selected_by_group.get(group["group_key"], 0)
            if count > group["max_select"]:
                raise OrderValidationError(
                    f"{group['label']}: máximo de {group['max_select']} seleções.",
                    "max_select",
                )
            if group["required"] and count < group["min_select"]:
                raise OrderValidationError(
                    f"{product['name']}: escolha {group['label'].lower()}.", "option_required"
                )

        unit_price_cents = base_unit + extras_unit
        subtotal = unit_price_cents * quantity
        total += subtotal

        note = (raw.note or "").strip() or None
        snapshots.append(
            {
                "product_id": product["id"],
                "product_name": product["name"],
                "variant_label": variant_label,
                "unit_price_cents": unit_price_cents,
                "quantity": quantity,
                "subtotal_cents": subtotal,
                "note": note[:300] if note else None,
                "options": option_snapshots,
            }
        )

    return snapshots, total


def load_order(conn: sqlite3.Connection, order_id: str) -> dict | None:
    """Carrega um pedido com seu snapshot completo (para Admin e PDF)."""
    row = conn.execute("SELECT * FROM orders WHERE id = ?", (order_id,)).fetchone()
    if row is None:
        return None
    order = dict(row)
    order["payment_label"] = PAYMENT_LABELS.get(row["payment_method"], row["payment_method"])
    items = []
    for item in conn.execute(
        "SELECT * FROM order_items WHERE order_id = ? ORDER BY position, id", (order_id,)
    ):
        item_dict = dict(item)
        item_dict["options"] = [
            dict(o)
            for o in conn.execute(
                "SELECT * FROM order_item_options WHERE order_item_id = ? ORDER BY id",
                (item["id"],),
            )
        ]
        items.append(item_dict)
    order["items"] = items
    return order
