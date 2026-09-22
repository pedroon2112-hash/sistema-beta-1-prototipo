"""Comanda PDF REAL de 58 mm de largura com altura dinâmica (reportlab).

Sem A4: a página cresce conforme o conteúdo, como numa impressora térmica.
Preto e branco, alto contraste, sem decoração que desperdice papel.
O PDF é sempre gerado a partir do SNAPSHOT do pedido — nunca do cardápio atual.
"""

import io

from reportlab.lib.units import mm
from reportlab.pdfbase.pdfmetrics import stringWidth
from reportlab.pdfgen import canvas

from lib.dates_br import br_datetime
from lib.money import brl

WIDTH = 58 * mm
MARGIN = 3 * mm
CONTENT_W = WIDTH - 2 * MARGIN

FONT = "Helvetica"
FONT_B = "Helvetica-Bold"


def _wrap(text: str, font: str, size: float, max_w: float) -> list[str]:
    """Quebra de linha por palavra; palavras longas são cortadas por caractere."""
    words = str(text).split()
    lines: list[str] = []
    current = ""
    for word in words:
        candidate = f"{current} {word}".strip()
        if stringWidth(candidate, font, size) <= max_w:
            current = candidate
            continue
        if current:
            lines.append(current)
        # palavra maior que a linha: corta
        while stringWidth(word, font, size) > max_w and len(word) > 1:
            cut = len(word)
            while cut > 1 and stringWidth(word[:cut], font, size) > max_w:
                cut -= 1
            lines.append(word[:cut])
            word = word[cut:]
        current = word
    if current:
        lines.append(current)
    return lines or [""]


class _Block:
    """Linha a desenhar: texto simples, par label/valor, separador ou espaço."""

    def __init__(self, kind: str, **kw):
        self.kind = kind
        self.__dict__.update(kw)


def _build_blocks(order: dict) -> list[_Block]:
    kind_label = "LOCAL" if order["kind"] == "local" else "DELIVERY"
    b: list[_Block] = [
        _Block("text", text="GALEGONN", font=FONT_B, size=11, align="center"),
        _Block("text", text="Restaurante e Pizzaria", font=FONT, size=7, align="center"),
        _Block("gap", h=1.6 * mm),
        _Block("text", text=kind_label, font=FONT_B, size=9.5, align="center"),
        _Block("text", text=f"PEDIDO {order['number']}", font=FONT_B, size=13, align="center"),
        _Block(
            "text",
            text=br_datetime(order["local_date"], order["local_time"]),
            font=FONT,
            size=7.5,
            align="center",
        ),
        _Block("rule"),
    ]

    if order["kind"] == "local":
        # Mesa em bastante destaque (§18)
        b += [
            _Block("gap", h=0.8 * mm),
            _Block(
                "text",
                text=(order.get("table_label") or "MESA").upper(),
                font=FONT_B,
                size=16,
                align="center",
            ),
            _Block("gap", h=0.8 * mm),
            _Block("rule"),
        ]
    else:
        b.append(_Block("text", text="CLIENTE", font=FONT_B, size=8, align="left"))
        for label, value in (
            ("Nome", order.get("customer_name")),
            ("Telefone", order.get("phone")),
            ("Endereco", order.get("address")),
            ("Numero", order.get("address_number")),
            ("Complemento", order.get("complement")),
            ("Referencia", order.get("reference")),
        ):
            if value:
                b.append(_Block("text", text=f"{label}: {value}", font=FONT, size=7.5, align="left"))
        b.append(_Block("rule"))

    b.append(_Block("text", text="ITENS", font=FONT_B, size=8, align="left"))
    for item in order["items"]:
        b.append(
            _Block(
                "pair",
                left=f"{item['quantity']}x {item['product_name']}",
                right=brl(item["subtotal_cents"]),
                font=FONT_B,
                size=8,
            )
        )
        if item.get("variant_label"):
            b.append(
                _Block("text", text=f"  Tamanho: {item['variant_label']}", font=FONT, size=7, align="left")
            )
        incluidos = [o for o in item["options"] if o["no_extra_cost"]]
        extras = [o for o in item["options"] if not o["no_extra_cost"]]
        for opt in incluidos:
            b.append(
                _Block(
                    "text",
                    text=f"  {opt['group_label']}: {opt['option_label']}",
                    font=FONT,
                    size=7,
                    align="left",
                )
            )
        for opt in extras:
            b.append(
                _Block(
                    "pair",
                    left=f"  + {opt['quantity']}x {opt['option_label']}",
                    right=brl(opt["unit_price_cents"] * opt["quantity"] * item["quantity"]),
                    font=FONT,
                    size=7,
                )
            )
        if item.get("note"):
            b.append(_Block("text", text=f"  Obs: {item['note']}", font=FONT_B, size=7, align="left"))
        b.append(_Block("gap", h=0.8 * mm))

    b += [
        _Block("rule"),
        _Block(
            "pair",
            left="PAGAMENTO",
            right=order["payment_label"],
            font=FONT,
            size=8,
        ),
        _Block("pair", left="TOTAL", right=brl(order["total_cents"]), font=FONT_B, size=11.5),
        _Block("rule"),
        _Block("text", text="Obrigado pela preferencia!", font=FONT, size=7, align="center"),
    ]
    return b


def _measure(blocks: list[_Block]) -> tuple[float, list[tuple]]:
    """Calcula a altura exata e pré-resolve as linhas (altura dinâmica real)."""
    y = 0.0
    drawn: list[tuple] = []
    for blk in blocks:
        if blk.kind == "gap":
            y += blk.h
        elif blk.kind == "rule":
            y += 1.0 * mm
            drawn.append(("rule", y))
            y += 1.4 * mm
        elif blk.kind == "text":
            line_h = blk.size * 1.22
            for line in _wrap(blk.text, blk.font, blk.size, CONTENT_W):
                y += line_h
                drawn.append(("text", y, line, blk.font, blk.size, blk.align))
        elif blk.kind == "pair":
            line_h = blk.size * 1.22
            right_w = stringWidth(blk.right, blk.font, blk.size)
            left_w = CONTENT_W - right_w - 1.2 * mm
            lines = _wrap(blk.left, blk.font, blk.size, max(left_w, 8 * mm))
            for idx, line in enumerate(lines):
                y += line_h
                if idx == len(lines) - 1:
                    drawn.append(("pair", y, line, blk.right, blk.font, blk.size))
                else:
                    drawn.append(("text", y, line, blk.font, blk.size, "left"))
    return y, drawn


def build_comanda_pdf(order: dict) -> bytes:
    """Gera o PDF 58 mm do snapshot do pedido."""
    blocks = _build_blocks(order)
    content_h, drawn = _measure(blocks)
    height = content_h + 2 * MARGIN + 2 * mm

    buf = io.BytesIO()
    c = canvas.Canvas(buf, pagesize=(WIDTH, height))
    c.setTitle(f"Comanda {order['kind']} {order['number']}")

    def ypos(offset: float) -> float:
        return height - MARGIN - offset

    for entry in drawn:
        if entry[0] == "rule":
            y = ypos(entry[1])
            c.setLineWidth(0.5)
            c.line(MARGIN, y, WIDTH - MARGIN, y)
        elif entry[0] == "text":
            _, off, line, font, size, align = entry
            c.setFont(font, size)
            y = ypos(off)
            if align == "center":
                c.drawCentredString(WIDTH / 2, y, line)
            else:
                c.drawString(MARGIN, y, line)
        elif entry[0] == "pair":
            _, off, left, right, font, size = entry
            c.setFont(font, size)
            y = ypos(off)
            c.drawString(MARGIN, y, left)
            c.drawRightString(WIDTH - MARGIN, y, right)

    c.showPage()
    c.save()
    return buf.getvalue()


def comanda_filename(order: dict) -> str:
    if order["kind"] == "local":
        table = (order.get("table_label") or "mesa").lower().replace(" ", "-")
        return f"galegonn-local-pedido-{order['number']}-{table}.pdf"
    return f"galegonn-delivery-pedido-{order['number']}.pdf"
