"""Datas ancoradas no fuso do restaurante (America/Sao_Paulo).

Pedidos feitos à noite precisam cair no dia correto: guardamos o instante em UTC
(ISO, para ordenação) e a data/hora local (para agrupar ano/mês/dia e exibir).
"""

from datetime import datetime, timezone
from zoneinfo import ZoneInfo

TZ = ZoneInfo("America/Sao_Paulo")


def now_utc() -> datetime:
    return datetime.now(timezone.utc)


def now_local() -> datetime:
    return datetime.now(TZ)


def utc_iso(dt: datetime | None = None) -> str:
    return (dt or now_utc()).astimezone(timezone.utc).isoformat()


def local_parts(dt: datetime | None = None) -> tuple[str, str, int, int, int]:
    """(data_iso_local, hora_local, ano, mes, dia)"""
    local = (dt or now_utc()).astimezone(TZ)
    return (
        local.strftime("%Y-%m-%d"),
        local.strftime("%H:%M"),
        local.year,
        local.month,
        local.day,
    )


def br_datetime(date_iso: str, time_hm: str) -> str:
    """('2026-09-20', '19:43') -> '20/09/2026 19:43'"""
    y, m, d = date_iso.split("-")
    return f"{d}/{m}/{y} {time_hm}"


MONTHS_PT = [
    "",
    "Janeiro",
    "Fevereiro",
    "Março",
    "Abril",
    "Maio",
    "Junho",
    "Julho",
    "Agosto",
    "Setembro",
    "Outubro",
    "Novembro",
    "Dezembro",
]
