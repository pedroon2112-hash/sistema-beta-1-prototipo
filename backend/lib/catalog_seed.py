"""Seed inicial: os dados do cardápio criados no Prompt 1.

Roda UMA ÚNICA VEZ (guardado por `migrations`). Depois disso o SQLite é a fonte
de verdade e reiniciar o servidor nunca restaura preços/produtos por cima das
alterações feitas no Admin.
"""

import os
import sqlite3
import unicodedata

from lib.money import to_cents
from lib.sqlite_db import mark_migration, migration_applied

SEED_NAME = "0001_seed_prompt1_catalog"

CATEGORIES = [
    ("pratos", "Pratos Principais"),
    ("pizzas", "Pizzas"),
    ("porcoes-1", "Porções 1 pessoa"),
    ("porcoes-2", "Porções 2 pessoas"),
    ("cervejas", "Cervejas"),
    ("refri-lata", "Refrigerantes · Lata"),
    ("refri-600", "Refrigerantes · 600ml"),
    ("refri-15l", "Refrigerantes · 1,5L"),
    ("sucos", "Sucos e Cremes"),
    ("agua", "Água e Outros"),
]

# Tabela de acompanhamentos/adicionais (§17 do briefing)
ACCOMPANIMENTS = [
    ("pure-batata", "Purê de batata", 7.00),
    ("arroz-com-alho", "Arroz com Alho", 7.00),
    ("tropeiro", "Tropeiro", 7.00),
    ("farofa-de-ovo", "Farofa de Ovo", 7.00),
    ("fritas", "Fritas", 7.00),
    ("couve-refogada", "Couve Refogada", 7.00),
    ("salada-simples", "Salada Simples", 7.00),
    ("macarrao-alho-oleo", "Macarrão Alho e Óleo", 7.00),
    ("ovo-frito", "Ovo Frito", 3.50),
    ("feijao-de-caldo", "Feijão de caldo", 7.00),
    ("arroz-com-brocolis", "Arroz com brócolis", 7.00),
    ("arroz", "Arroz", 7.00),
]

# (id, nome, preço, descrição, monta_prato)
#   monta_prato=True  -> até 3 acompanhamentos INCLUSOS (R$ 0,00) + extras pagos
#   monta_prato=False -> somente adicionais extras pagos (itens "SO ...")
DISHES = [
    ("tilapia-crocante", "Tilápia Crocante", 28.90, "Isca de filé de tilápia", True),
    ("so-tilapia", "SO TILAPIA", 23.90, "5 iscas de tilápia", False),
    ("so-picanha", "SO PICANHA", 42.90, "CARNE", False),
    ("so-parmegiana", "SO PARMEGIANA", 22.90, "SO O FRANGO", False),
    ("so-frango", "SO FRANGO", 17.90, "CARNE", False),
    ("so-costelinha-barbecue", "SO COSTELINHA BARBECUE", 27.90, "PORÇÃO", False),
    ("so-carne-de-sol", "SO CARNE DE SOL", 34.90, "SO A CARNE", False),
    ("so-bisteca", "SO BISTECA", 14.90, "CARNE", False),
    ("so-bife", "SO BIFE", 24.90, "CARNE", False),
    ("pudim", "PUDIM", 6.50, "PUDIM PEQUENO", None),
    ("picanha-na-chapa", "Picanha na Chapa", 47.90, None, True),
    ("parmegiana-frango", "Parmegiana de Frango", 27.90, None, True),
    (
        "frango-grelhado",
        "Frango Grelhado",
        22.90,
        "Filé de peito de frango grelhado na chapa",
        True,
    ),
    (
        "costelinha-barbecue",
        "Costelinha ao molho barbecue",
        32.90,
        "Arroz, feijão, salada e fritas",
        True,
    ),
    ("carne-de-sol", "CARNE DE SOL", 39.90, "CARNE DE SOL", True),
    ("bisteca", "Bisteca", 19.90, None, True),
    ("bife-acebolado", "Bife Acebolado", 29.90, None, True),
]

# (id, sabor, ingredientes, média, grande) — cada sabor UMA vez (§20)
PIZZAS = [
    ("pizza-calabresa", "Calabresa", "Molho de tomate, mussarela, calabresa, cebola, azeitona e orégano", 34.99, 38.99),
    ("pizza-bacon", "Bacon", "Molho de tomate, mussarela, bacon, cebola roxa e orégano", 37.99, 39.99),
    ("pizza-marguerita", "Marguerita", "Molho de tomate, mussarela, tomate cereja, manjericão e orégano", 35.99, 37.99),
    ("pizza-frango-catupiry", "Frango com Catupiry", "Molho de tomate, mussarela, frango desfiado, catupiry e orégano", 39.99, 43.99),
    ("pizza-portuguesa", "Portuguesa", "Molho de tomate, mussarela, presunto, calabresa, cebola, pimentão, azeitona, ovo e orégano", 39.99, 43.99),
    ("pizza-presunto", "Presunto", "Molho de tomate, mussarela, presunto, azeitona e orégano", 33.99, 37.99),
    ("pizza-napolitana", "Napolitana", "Molho de tomate, mussarela, tomate em rodelas, alho frito, manjericão e orégano", 31.99, 35.99),
    ("pizza-mussarela", "Mussarela", "Molho de tomate, mussarela e orégano", 32.99, 37.99),
    ("pizza-quatro-queijos", "Quatro Queijos", "Molho de tomate, mussarela, gorgonzola, catupiry, parmesão e orégano", 43.99, 46.99),
    ("pizza-linguicinha", "Linguiçinha", "Molho de tomate, mussarela, linguiça apimentada, pimenta calabresa, manjericão e orégano", 37.99, 39.99),
    ("pizza-milho", "Milho", "Molho de tomate, mussarela, milho verde e orégano", 34.99, 39.99),
    ("pizza-alho-oleo", "Alho e Óleo", "Molho de tomate, mussarela, parmesão, alho frito e orégano", 34.99, 39.99),
    ("pizza-carne-de-sol", "Carne de Sol", "Molho de tomate, mussarela, carne de sol, cebola, catupiry, parmesão e orégano", 43.99, 46.99),
    ("pizza-peperoni", "Peperoni", "Molho de tomate, mussarela, peperoni, manjericão e orégano", 50.99, 54.99),
    ("pizza-da-casa", "Da Casa", "Molho de tomate, mussarela, frango desfiado, bacon, catupiry, azeitona, milho e orégano", 43.99, 46.99),
    ("pizza-lombo-canadense", "Lombo Canadense", "Molho de tomate, mussarela, lombo canadense, abacaxi, parmesão e orégano", 38.99, 42.99),
    ("pizza-galegonn", "Galegonn", "Molho de tomate, mussarela, camarão, catupiry, parmesão, cebola roxa e orégano", 50.99, 54.99),
    ("pizza-nordestina", "Nordestina", "Molho de tomate, mussarela, carne seca, gorgonzola, pimenta de cheiro, parmesão e orégano", 43.99, 46.99),
    ("pizza-paulistana", "Paulistana", "Molho de tomate, mussarela, tomate em rodela, bacon, cebola, catupiry e orégano", 40.99, 44.99),
    ("pizza-americana", "Americana", "Molho de tomate, mussarela, presunto, bacon, catupiry, parmesão e orégano", 43.99, 46.99),
    ("pizza-a-cheirosa", "À Cheirosa", "Molho de tomate, mussarela, calabresa, cebola roxa, alho frito, pimenta de cheiro e orégano", 38.99, 42.99),
    ("pizza-goiana", "Goiana", "Molho de tomate, mussarela, picanha, cebola, parmesão e orégano", 50.99, 54.99),
    ("pizza-fortaleza", "Fortaleza", "Queijo coalho e rapadura", 32.99, 43.99),
    ("pizza-banana-canela", "Banana com Canela", "Mussarela, banana, leite condensado e açúcar com canela", 29.99, 39.99),
    ("pizza-chocolate", "Chocolate", "Mussarela, raspa de chocolate e calda de chocolate", 37.99, 42.99),
    ("pizza-romeu-julieta", "Romeu e Julieta", "Mussarela e goiabada", 34.99, 39.99),
    ("pizza-banana-chocolate", "Banana com Chocolate", "Mussarela, banana e chocolate", 44.99, 47.99),
    ("pizza-kids", "Kids", "Mussarela, calda de chocolate, marshmallow, m&m, sonho de valsa e jujuba", 46.99, 50.99),
    ("pizza-sonho-de-valsa", "Sonho de Valsa", "Mussarela, calda de chocolate e sonho de valsa", 44.99, 48.99),
    ("pizza-charmosa", "Charmosa", "MUSSARELA, BANANA E RAPADURA", 43.99, 46.99),
    ("pizza-coco", "Coco", "MUSSARELA, COCO RALADO E LEITE CONDENSADO", 44.99, 47.99),
    ("pizza-mexicana", "Mexicana", "MOLHO DE TOMATE, MUSSARELA, CALABRESA, PIMENTA CALABRESA, TOMATE EM RODELAS, MANJERICÃO E ORÉGANO", 36.99, 38.99),
    ("pizza-belesura", "Belesura", "MOLHO DE TOMATE, CALABRESA, LOMBO, TOMATE EM RODELAS, PARMESÃO E ORÉGANO", 43.99, 46.99),
    ("pizza-mineirinha", "Mineirinha", "MOLHO DE TOMATE, MUSSARELA, MILHO, BACON, BRÓCOLIS, CREME DE LEITE E ORÉGANO", 43.99, 46.99),
    ("pizza-carbonara", "Carbonara", "MOLHO DE TOMATE, MUSSARELA, BACON, CEBOLA, CREME DE LEITE E ORÉGANO", 43.99, 46.99),
]

SIMPLE_PRODUCTS = [
    # porções 1 pessoa (§18)
    ("porcao-picanha-fritas-1p", "Porção de Picanha com Fritas", 59.90, "porcoes-1", "Fritas, queijo e cebola"),
    ("porcao-tilapia-crocante-1p", "Porção de Tilápia Crocante", 49.90, "porcoes-1", "Cebola roxa e molho galegonn"),
    # porções 2 pessoas (§19)
    ("porcao-picanha-fritas-2p", "Porção de Picanha com Fritas", 73.90, "porcoes-2", "Fritas, queijo e cebola"),
    ("porcao-tilapia-crocante-2p", "Porção de Tilápia Crocante", 69.90, "porcoes-2", "Cebola roxa e molho galegonn"),
    ("porcao-fritas-2p", "Porção de Fritas", 24.90, "porcoes-2", None),
    ("porcao-fritas-queijo-bacon", "Porção de Fritas com Queijo e Bacon", 28.90, "porcoes-2", None),
    ("porcao-espaguete-alho-oleo", "Porção de Espaguete Alho e Óleo", 20.90, "porcoes-2", None),
    # cervejas (§23)
    ("cerveja-antartica-600ml", "Antártica 600ml", 13.90, "cervejas", None),
    ("cerveja-brahma-chopp-600ml", "Brahma Chopp 600ml", 13.90, "cervejas", None),
    ("cerveja-heineken-long-neck", "Heineken Long Neck", 10.90, "cervejas", None),
    ("cerveja-original-600ml", "Original 600ml", 14.90, "cervejas", None),
    # refrigerantes lata (§24)
    ("refri-coca-cola-lata", "Coca Cola", 6.00, "refri-lata", None),
    ("refri-coca-cola-zero-lata", "Coca Cola Zero", 6.00, "refri-lata", None),
    ("refri-fanta-guarana-mineiro-lata", "Fanta Guaraná/mineiro", 6.00, "refri-lata", None),
    ("refri-fanta-laranja-lata", "Fanta Laranja", 6.00, "refri-lata", None),
    ("refri-fanta-uva-lata", "Fanta Uva", 6.00, "refri-lata", None),
    ("refri-sprite-lata", "Sprite", 6.00, "refri-lata", None),
    # refrigerantes 600ml
    ("refri-coca-cola-600ml", "Coca Cola", 9.90, "refri-600", None),
    ("refri-guarana-600ml", "Guarana", 8.90, "refri-600", None),
    ("refri-fanta-uva-600ml", "Fanta Uva", 8.90, "refri-600", None),
    ("refri-fanta-laranja-600ml", "Fanta Laranja", 8.90, "refri-600", None),
    ("refri-sprite-600ml", "Sprite", 8.90, "refri-600", None),
    ("refri-coca-zero-600ml", "Coca Zero", 9.90, "refri-600", None),
    # refrigerantes 1,5L
    ("refri-sprite-15l", "Sprite", 9.90, "refri-15l", None),
    ("refri-kuat-15l", "Kuat", 9.90, "refri-15l", None),
    ("refri-fanta-laranja-15l", "Fanta Laranja", 9.90, "refri-15l", None),
    ("refri-coca-cola-15l", "Coca Cola", 13.90, "refri-15l", None),
    ("refri-coca-cola-zero-15l", "Coca Cola Zero", 13.90, "refri-15l", None),
    ("refri-mineiro-15l", "Mineiro", 9.90, "refri-15l", None),
    ("refri-guarana-antarctica-15l", "Guarana Antarctica", 9.90, "refri-15l", None),
    ("refri-fanta-uva-15l", "Fanta Uva", 9.90, "refri-15l", None),
    # água e outros (§26) — sem seletores
    ("agua-sem-gas", "Água Sem Gás", 3.00, "agua", None),
    ("agua-com-gas", "Água Com Gás", 4.00, "agua", None),
    ("h2o", "H2O", 9.90, "agua", None),
]

# Bebidas configuráveis (§25) — sabores pertencem SÓ a cada bebida
JUICES = [
    (
        "suco-polpa-300ml",
        "Suco de Polpa 300ml",
        8.00,
        ["Abacaxi com Hortelã", "Goiaba", "Manga", "Morango", "Cupuaçu", "Acerola", "Cajá"],
    ),
    (
        "creme-polpa-300ml",
        "Creme de Polpa 300ml",
        10.00,
        ["Cupuaçu", "Goiaba", "Abacaxi com Hortelã", "Morango", "Acerola", "Manga", "Cajá"],
    ),
    ("suco-natural-300ml", "Suco Natural 300ml", 10.00, ["Laranja", "Limão"]),
]

FEATURED_IDS = [
    "tilapia-crocante",
    "parmegiana-frango",
    "pizza-portuguesa",
    "pizza-galegonn",
]


def slugify(text: str) -> str:
    norm = unicodedata.normalize("NFD", text)
    ascii_text = "".join(c for c in norm if unicodedata.category(c) != "Mn")
    out = []
    for ch in ascii_text.lower():
        out.append(ch if ch.isalnum() else "-")
    slug = "".join(out)
    while "--" in slug:
        slug = slug.replace("--", "-")
    return slug.strip("-")


def _img(product_id: str) -> str:
    return f"/assets/products/{product_id}.jpg"


def _insert_product(
    conn: sqlite3.Connection,
    pid: str,
    name: str,
    description: str | None,
    category: str,
    price: float | None,
    position: int,
) -> None:
    conn.execute(
        """INSERT INTO products (id, name, description, category_id, image,
                                 base_price_cents, available, position)
           VALUES (?, ?, ?, ?, ?, ?, 1, ?)""",
        (
            pid,
            name,
            description,
            category,
            _img(pid),
            to_cents(price) if price is not None else None,
            position,
        ),
    )


def _add_group(
    conn: sqlite3.Connection,
    product_id: str,
    group_key: str,
    label: str,
    hint: str | None,
    required: bool,
    min_select: int,
    max_select: int,
    no_extra_cost: bool,
    allow_quantity: bool,
    position: int,
    options: list[tuple[str, str, float]],
) -> None:
    cur = conn.execute(
        """INSERT INTO option_groups (product_id, group_key, label, hint, required,
                                      min_select, max_select, no_extra_cost, allow_quantity, position)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
        (
            product_id,
            group_key,
            label,
            hint,
            1 if required else 0,
            min_select,
            max_select,
            1 if no_extra_cost else 0,
            1 if allow_quantity else 0,
            position,
        ),
    )
    gid = cur.lastrowid
    for idx, (okey, olabel, oprice) in enumerate(options):
        conn.execute(
            """INSERT INTO options (group_id, option_key, label, price_cents, position)
               VALUES (?, ?, ?, ?, ?)""",
            (gid, okey, olabel, to_cents(oprice), idx),
        )


def _included_group(conn: sqlite3.Connection, product_id: str, position: int) -> None:
    """Até 3 acompanhamentos INCLUSOS — preço 0 (§14/§15)."""
    _add_group(
        conn,
        product_id,
        "acompanhamentos",
        "Acompanhamentos inclusos",
        "Escolha até 3 — já inclusos no preço",
        False,
        0,
        3,
        True,
        False,
        position,
        [(k, l, 0.0) for k, l, _ in ACCOMPANIMENTS],
    )


def _extras_group(conn: sqlite3.Connection, product_id: str, position: int) -> None:
    """Adicionais EXTRAS pagos à parte, com quantidade (§15/§17)."""
    _add_group(
        conn,
        product_id,
        "adicionais",
        "Adicionais extras",
        "Quantidade extra — cobrados à parte",
        False,
        0,
        12,
        False,
        True,
        position,
        list(ACCOMPANIMENTS),
    )


def seed_catalog(conn: sqlite3.Connection) -> None:
    """Popula o banco na primeira inicialização. Idempotente e não destrutivo."""
    if migration_applied(conn, SEED_NAME):
        _ensure_admin_user(conn)
        return

    try:
        conn.execute("BEGIN IMMEDIATE")

        for idx, (cid, label) in enumerate(CATEGORIES):
            conn.execute(
                "INSERT OR IGNORE INTO categories (id, label, position) VALUES (?, ?, ?)",
                (cid, label, idx),
            )

        # Pratos principais
        for idx, (pid, name, price, desc, assembles) in enumerate(DISHES):
            _insert_product(conn, pid, name, desc, "pratos", price, idx)
            pos = 0
            if assembles is True:
                _included_group(conn, pid, pos)
                pos += 1
                _extras_group(conn, pid, pos)
            elif assembles is False:
                _extras_group(conn, pid, pos)
            # None (PUDIM) -> sem grupos

        # Pizzas: sabor único + variantes Média/Grande
        for idx, (pid, name, desc, media, grande) in enumerate(PIZZAS):
            _insert_product(conn, pid, name, desc, "pizzas", None, idx)
            for vidx, (vkey, vlabel, vprice) in enumerate(
                [("media", "Média", media), ("grande", "Grande", grande)]
            ):
                conn.execute(
                    """INSERT INTO variants (product_id, variant_key, label, price_cents, position)
                       VALUES (?, ?, ?, ?, ?)""",
                    (pid, vkey, vlabel, to_cents(vprice), vidx),
                )

        # Produtos simples
        by_cat: dict[str, int] = {}
        for pid, name, price, cat, desc in SIMPLE_PRODUCTS:
            pos = by_cat.get(cat, 0)
            _insert_product(conn, pid, name, desc, cat, price, pos)
            by_cat[cat] = pos + 1

        # Bebidas configuráveis (sabor obrigatório, sem custo extra)
        for pid, name, price, flavors in JUICES:
            pos = by_cat.get("sucos", 0)
            _insert_product(conn, pid, name, None, "sucos", price, pos)
            by_cat["sucos"] = pos + 1
            _add_group(
                conn,
                pid,
                "sabor",
                "Sabores",
                "Escolha o sabor",
                True,
                1,
                1,
                True,
                False,
                0,
                [(slugify(f), f, 0.0) for f in flavors],
            )

        # Mais Pedidos — referencia produtos por id (§26)
        for idx, pid in enumerate(FEATURED_IDS):
            conn.execute(
                "INSERT OR IGNORE INTO featured (product_id, position) VALUES (?, ?)",
                (pid, idx),
            )

        # Exatamente 12 mesas no cadastro inicial (§10)
        for n in range(1, 13):
            conn.execute(
                "INSERT OR IGNORE INTO tables (label, position) VALUES (?, ?)",
                (f"Mesa {n}", n),
            )

        # Informações do restaurante — campos oficiais seguem vazios (nada inventado)
        conn.execute(
            """INSERT OR IGNORE INTO restaurant
               (id, name, tagline, logo, hero_image, instagram, whatsapp, phone, address, opening_hours)
               VALUES (1, ?, ?, ?, ?, NULL, NULL, NULL, NULL, NULL)""",
            (
                "GalegonN Restaurante e Pizzaria",
                "Restaurante e Pizzaria",
                "/assets/brand/galegonn-logo.png",
                "/assets/products/hero-pizzaria.jpg",
            ),
        )

        # Contadores independentes Local/Delivery começando em 1 (§11)
        for kind in ("local", "delivery"):
            conn.execute(
                "INSERT OR IGNORE INTO counters (kind, last_number) VALUES (?, 0)",
                (kind,),
            )

        mark_migration(conn, SEED_NAME)
        conn.execute("COMMIT")
    except Exception:
        conn.execute("ROLLBACK")
        raise

    _ensure_admin_user(conn)


def _ensure_admin_user(conn: sqlite3.Connection) -> None:
    """Cria o usuário administrativo com senha em HASH (nunca texto puro)."""
    from lib.security import hash_password

    username = os.environ.get("ADMIN_USERNAME", "galegonn")
    password = os.environ.get("ADMIN_PASSWORD", "galeggon123")
    row = conn.execute("SELECT 1 FROM admin_users WHERE username = ?", (username,)).fetchone()
    if row is None:
        conn.execute(
            "INSERT INTO admin_users (username, password_hash) VALUES (?, ?)",
            (username, hash_password(password)),
        )
