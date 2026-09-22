"""Dinheiro em CENTAVOS inteiros — nunca float (evita erro de ponto flutuante)."""


def brl(cents: int) -> str:
    """2790 -> 'R$ 27,90'"""
    sign = "-" if cents < 0 else ""
    cents = abs(int(cents))
    inteiro, centavos = divmod(cents, 100)
    milhar = f"{inteiro:,}".replace(",", ".")
    return f"{sign}R$ {milhar},{centavos:02d}"


def to_cents(value: float | int) -> int:
    """28.9 -> 2890 (usado apenas no seed inicial)."""
    return int(round(float(value) * 100))
