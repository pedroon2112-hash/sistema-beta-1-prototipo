"""Autenticação administrativa: senha em hash + sessão real no backend.

O cookie de sessão é httpOnly; no banco guardamos apenas o HASH do token
(um vazamento do banco não permite reutilizar sessões). Nenhuma comparação de
usuário/senha acontece no JavaScript público.
"""

import hashlib
import hmac
import os
import secrets
import sqlite3
from datetime import timedelta

from fastapi import Cookie, HTTPException
from passlib.context import CryptContext

from lib.dates_br import now_utc, utc_iso
from lib.sqlite_db import get_conn

_pwd = CryptContext(schemes=["bcrypt"], deprecated="auto")

SESSION_COOKIE = "galegonn_admin"
SESSION_TTL_HOURS = 12
# Segredo fora do bundle público; em produção defina ADMIN_SESSION_SECRET no .env.
_SECRET = os.environ.get("ADMIN_SESSION_SECRET", "")


def hash_password(password: str) -> str:
    return _pwd.hash(password)


def verify_password(password: str, password_hash: str) -> bool:
    try:
        return _pwd.verify(password, password_hash)
    except Exception:
        return False


def _token_hash(token: str) -> str:
    key = _SECRET.encode() if _SECRET else b"galegonn-local-dev"
    return hmac.new(key, token.encode(), hashlib.sha256).hexdigest()


def create_session(username: str) -> tuple[str, int]:
    """Retorna (token, max_age_segundos)."""
    conn = get_conn()
    token = secrets.token_urlsafe(32)
    expires = now_utc() + timedelta(hours=SESSION_TTL_HOURS)
    conn.execute(
        """INSERT INTO sessions (token_hash, username, created_at, expires_at)
           VALUES (?, ?, ?, ?)""",
        (_token_hash(token), username, utc_iso(), utc_iso(expires)),
    )
    # limpeza oportunista das sessões vencidas
    conn.execute("DELETE FROM sessions WHERE expires_at < ?", (utc_iso(),))
    return token, SESSION_TTL_HOURS * 3600


def destroy_session(token: str | None) -> None:
    if not token:
        return
    get_conn().execute("DELETE FROM sessions WHERE token_hash = ?", (_token_hash(token),))


def authenticate(username: str, password: str) -> bool:
    conn = get_conn()
    row = conn.execute(
        "SELECT password_hash FROM admin_users WHERE username = ?", (username,)
    ).fetchone()
    if row is None:
        return False
    return verify_password(password, row["password_hash"])


def current_admin(galegonn_admin: str | None = Cookie(default=None)) -> str:
    """Dependência FastAPI: protege TODAS as rotas administrativas no backend."""
    if not galegonn_admin:
        raise HTTPException(status_code=401, detail="Não autenticado")
    conn: sqlite3.Connection = get_conn()
    row = conn.execute(
        "SELECT username, expires_at FROM sessions WHERE token_hash = ?",
        (_token_hash(galegonn_admin),),
    ).fetchone()
    if row is None:
        raise HTTPException(status_code=401, detail="Sessão inválida")
    if row["expires_at"] < utc_iso():
        conn.execute("DELETE FROM sessions WHERE token_hash = ?", (_token_hash(galegonn_admin),))
        raise HTTPException(status_code=401, detail="Sessão expirada")
    return row["username"]
