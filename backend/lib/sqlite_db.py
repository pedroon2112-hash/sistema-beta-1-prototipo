"""SQLite: conexão, schema, migrations e seed inicial.

O arquivo do banco vive em /app/data/galegonn.db (configurável por DB_PATH).
Depois do primeiro seed, o SQLITE É A FONTE DE VERDADE: o seed nunca sobrescreve
alterações feitas no Admin (guardado pela tabela `migrations`).
"""

import os
import sqlite3
import threading
from pathlib import Path

from dotenv import load_dotenv

load_dotenv(Path(__file__).parent.parent / ".env")

DB_PATH = Path(
    os.environ.get("DB_PATH", str(Path(__file__).parent.parent.parent / "data" / "galegonn.db"))
)
UPLOAD_DIR = Path(
    os.environ.get(
        "UPLOAD_DIR", str(Path(__file__).parent.parent.parent / "frontend" / "public" / "uploads")
    )
)

_local = threading.local()

SCHEMA = """
CREATE TABLE IF NOT EXISTS migrations (
    name TEXT PRIMARY KEY,
    applied_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS categories (
    id TEXT PRIMARY KEY,
    label TEXT NOT NULL,
    position INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS products (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    category_id TEXT NOT NULL REFERENCES categories(id),
    image TEXT NOT NULL DEFAULT '',
    base_price_cents INTEGER,
    available INTEGER NOT NULL DEFAULT 1,
    position INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id, position);

CREATE TABLE IF NOT EXISTS variants (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    variant_key TEXT NOT NULL,
    label TEXT NOT NULL,
    price_cents INTEGER NOT NULL,
    position INTEGER NOT NULL DEFAULT 0,
    UNIQUE(product_id, variant_key)
);

CREATE TABLE IF NOT EXISTS option_groups (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    group_key TEXT NOT NULL,
    label TEXT NOT NULL,
    hint TEXT,
    required INTEGER NOT NULL DEFAULT 0,
    min_select INTEGER NOT NULL DEFAULT 0,
    max_select INTEGER NOT NULL DEFAULT 1,
    no_extra_cost INTEGER NOT NULL DEFAULT 0,
    allow_quantity INTEGER NOT NULL DEFAULT 0,
    position INTEGER NOT NULL DEFAULT 0,
    UNIQUE(product_id, group_key)
);

CREATE TABLE IF NOT EXISTS options (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    group_id INTEGER NOT NULL REFERENCES option_groups(id) ON DELETE CASCADE,
    option_key TEXT NOT NULL,
    label TEXT NOT NULL,
    price_cents INTEGER NOT NULL DEFAULT 0,
    position INTEGER NOT NULL DEFAULT 0,
    UNIQUE(group_id, option_key)
);

CREATE TABLE IF NOT EXISTS featured (
    product_id TEXT PRIMARY KEY REFERENCES products(id) ON DELETE CASCADE,
    position INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS tables (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    label TEXT NOT NULL UNIQUE,
    position INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS restaurant (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    name TEXT NOT NULL,
    tagline TEXT NOT NULL,
    logo TEXT NOT NULL,
    hero_image TEXT NOT NULL,
    instagram TEXT,
    whatsapp TEXT,
    phone TEXT,
    address TEXT,
    opening_hours TEXT
);

CREATE TABLE IF NOT EXISTS admin_users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
    token_hash TEXT PRIMARY KEY,
    username TEXT NOT NULL,
    created_at TEXT NOT NULL,
    expires_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS counters (
    kind TEXT PRIMARY KEY,
    last_number INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS orders (
    id TEXT PRIMARY KEY,
    kind TEXT NOT NULL CHECK (kind IN ('local','delivery')),
    number INTEGER NOT NULL,
    created_at TEXT NOT NULL,
    local_date TEXT NOT NULL,
    local_time TEXT NOT NULL,
    year INTEGER NOT NULL,
    month INTEGER NOT NULL,
    day INTEGER NOT NULL,
    table_label TEXT,
    customer_name TEXT,
    phone TEXT,
    address TEXT,
    address_number TEXT,
    complement TEXT,
    reference TEXT,
    payment_method TEXT NOT NULL,
    total_cents INTEGER NOT NULL,
    idempotency_key TEXT UNIQUE,
    UNIQUE(kind, number)
);
CREATE INDEX IF NOT EXISTS idx_orders_period ON orders(year, month, day, kind);
CREATE INDEX IF NOT EXISTS idx_orders_date ON orders(local_date, kind);
CREATE INDEX IF NOT EXISTS idx_orders_table ON orders(local_date, table_label);

CREATE TABLE IF NOT EXISTS order_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id TEXT NOT NULL,
    product_name TEXT NOT NULL,
    variant_label TEXT,
    unit_price_cents INTEGER NOT NULL,
    quantity INTEGER NOT NULL,
    subtotal_cents INTEGER NOT NULL,
    note TEXT,
    position INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id, position);

CREATE TABLE IF NOT EXISTS order_item_options (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_item_id INTEGER NOT NULL REFERENCES order_items(id) ON DELETE CASCADE,
    group_label TEXT NOT NULL,
    option_label TEXT NOT NULL,
    unit_price_cents INTEGER NOT NULL DEFAULT 0,
    quantity INTEGER NOT NULL DEFAULT 1,
    no_extra_cost INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_item_options ON order_item_options(order_item_id);
"""


def get_conn() -> sqlite3.Connection:
    """Conexão por thread (FastAPI roda handlers sync em threadpool)."""
    conn = getattr(_local, "conn", None)
    if conn is None:
        DB_PATH.parent.mkdir(parents=True, exist_ok=True)
        conn = sqlite3.connect(str(DB_PATH), timeout=30.0, isolation_level=None)
        conn.row_factory = sqlite3.Row
        conn.execute("PRAGMA journal_mode=WAL")
        conn.execute("PRAGMA foreign_keys=ON")
        conn.execute("PRAGMA busy_timeout=10000")
        _local.conn = conn
    return conn


def init_db() -> None:
    """Cria schema e aplica o seed inicial uma única vez."""
    conn = get_conn()
    conn.executescript(SCHEMA)
    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

    from lib.catalog_seed import seed_catalog

    seed_catalog(conn)


def migration_applied(conn: sqlite3.Connection, name: str) -> bool:
    row = conn.execute("SELECT 1 FROM migrations WHERE name = ?", (name,)).fetchone()
    return row is not None


def mark_migration(conn: sqlite3.Connection, name: str) -> None:
    from lib.dates_br import utc_iso

    conn.execute(
        "INSERT OR IGNORE INTO migrations (name, applied_at) VALUES (?, ?)",
        (name, utc_iso()),
    )
