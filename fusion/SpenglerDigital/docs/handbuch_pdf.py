"""Erzeugt docs/Benutzerhandbuch.pdf aus docs/Benutzerhandbuch.md (Werkzeug für Entwickler, nicht Teil des Add-ins).

Aufruf: python3 docs/handbuch_pdf.py   – braucht reportlab und eine DejaVu-Schrift (Umlaute).
Unterstützt die im Handbuch verwendete Markdown-Teilmenge: #/##, Absätze, -, 1., Tabellen, ```-Blöcke, > Hinweis, **fett**, `code`.
"""
import os
import re
import sys

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (Image, ListFlowable, ListItem, PageBreak, Paragraph, Preformatted,
                                SimpleDocTemplate, Spacer, Table, TableStyle)

HIER = os.path.dirname(os.path.abspath(__file__))
SCHRIFTEN = ["/usr/share/fonts/truetype/dejavu", "C:/Windows/Fonts"]


def schriften():
    for o in SCHRIFTEN:
        if os.path.exists(os.path.join(o, "DejaVuSans.ttf")):
            pdfmetrics.registerFont(TTFont("S", os.path.join(o, "DejaVuSans.ttf")))
            pdfmetrics.registerFont(TTFont("SB", os.path.join(o, "DejaVuSans-Bold.ttf")))
            pdfmetrics.registerFont(TTFont("M", os.path.join(o, "DejaVuSansMono.ttf")))
            from reportlab.pdfbase.pdfmetrics import registerFontFamily
            registerFontFamily("S", normal="S", bold="SB", italic="S", boldItalic="SB")
            return
    sys.exit("DejaVu-Schrift nicht gefunden")


def inline(t):
    t = t.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
    t = re.sub(r"\*\*(.+?)\*\*", r"<b>\1</b>", t)
    t = re.sub(r"\*(.+?)\*", r"<i>\1</i>", t)
    t = re.sub(r"`([^`]+)`", r'<font face="M" size="8.5">\1</font>', t)
    return t


def bauen(md_pfad, pdf_pfad, logo, fusszeile="Bedienungsanleitung", deckblatt=True):
    schriften()
    S = {
        "titel": ParagraphStyle("titel", fontName="SB", fontSize=22, leading=27, alignment=TA_CENTER, spaceAfter=6),
        "unter": ParagraphStyle("unter", fontName="S", fontSize=11, leading=15, alignment=TA_CENTER, textColor=colors.HexColor("#444")),
        "h2": ParagraphStyle("h2", fontName="SB", fontSize=14, leading=18, spaceBefore=12, spaceAfter=6, keepWithNext=1, textColor=colors.HexColor("#1d4f7a")),
        "p": ParagraphStyle("p", fontName="S", fontSize=9.5, leading=13.5, spaceAfter=5),
        "zelle": ParagraphStyle("zelle", fontName="S", fontSize=8.5, leading=11),
        "hinweis": ParagraphStyle("hinweis", fontName="S", fontSize=9.5, leading=13.5, backColor=colors.HexColor("#fff6e0"),
                                  borderColor=colors.HexColor("#e0b040"), borderWidth=0.6, borderPadding=6, spaceBefore=6, spaceAfter=10),
        "code": ParagraphStyle("code", fontName="M", fontSize=8, leading=10, backColor=colors.HexColor("#f2f4f6"), borderPadding=4),
    }
    zeilen = open(md_pfad, encoding="utf-8").read().splitlines()
    story, i = [], 0
    if deckblatt and os.path.exists(logo):
        story += [Spacer(1, 30 * mm), Image(logo, 60 * mm, 60 * mm), Spacer(1, 10 * mm)]
    while i < len(zeilen):
        z = zeilen[i]
        if z.startswith("# "):
            story.append(Paragraph(inline(z[2:]), S["titel"]))
            i += 1
            if i < len(zeilen) and not zeilen[i].strip():
                i += 1
            if i < len(zeilen) and zeilen[i].strip() and not zeilen[i].startswith(("#", ">")):
                story.append(Paragraph(inline(zeilen[i]), S["unter"]))
                i += 1
            continue
        if z.startswith("## "):
            if deckblatt and z.startswith("## 1."):
                story.append(PageBreak())
            story.append(Paragraph(inline(z[3:]), S["h2"]))
        elif z.startswith("> "):
            story.append(Paragraph(inline(z[2:]), S["hinweis"]))
        elif z.startswith("```"):
            block = []
            i += 1
            while i < len(zeilen) and not zeilen[i].startswith("```"):
                block.append(zeilen[i])
                i += 1
            story.append(Preformatted("\n".join(block), S["code"]))
        elif z.startswith("|"):
            tab, zeilen_roh = [], []
            while i < len(zeilen) and zeilen[i].startswith("|"):
                zeilen_roh.append(zeilen[i])
                if not re.match(r"^\|[\s\-|:]+\|$", zeilen[i]):
                    tab.append([Paragraph(inline(c.strip()), S["zelle"]) for c in zeilen[i].strip("|").split("|")])
                i += 1
            n = len(tab[0])
            if zeilen_roh[0].strip("| ").startswith("☐"):   # Abhak-Spalte schmal, Rest 40/60
                breiten = [8 * mm] + ([162 * mm] if n == 2 else [64 * mm, 98 * mm] if n == 3 else [162 * mm / (n - 1)] * (n - 1))
            else:
                breiten = [170 * mm / n] * n
            t = Table(tab, colWidths=breiten, repeatRows=1)
            t.setStyle(TableStyle([("GRID", (0, 0), (-1, -1), 0.4, colors.HexColor("#b8c0c8")),
                                   ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#e6eef6")),
                                   ("VALIGN", (0, 0), (-1, -1), "TOP")]))
            story += [t, Spacer(1, 6)]
            continue
        elif re.match(r"^(\s*)(-|\d+\.) ", z):
            punkte, nummeriert = [], bool(re.match(r"^\d+\.", z.strip()))
            while i < len(zeilen) and re.match(r"^\s*(-|\d+\.) ", zeilen[i]):
                text = re.sub(r"^\s*(-|\d+\.) ", "", zeilen[i])
                i += 1
                while i < len(zeilen) and zeilen[i].startswith("   ") and not re.match(r"^\s*(-|\d+\.) ", zeilen[i]):
                    text += " " + zeilen[i].strip()
                    i += 1
                punkte.append(ListItem(Paragraph(inline(text), S["p"]), leftIndent=12))
            story.append(ListFlowable(punkte, bulletType="1" if nummeriert else "bullet", start=1 if nummeriert else None,
                                      bulletFontName="S", bulletFontSize=9, leftIndent=14))
            continue
        elif z.strip():
            text = z
            while i + 1 < len(zeilen) and zeilen[i + 1].strip() and not re.match(r"^(#|>|\||```|\s*(-|\d+\.) )", zeilen[i + 1]):
                i += 1
                text += " " + zeilen[i].strip()
            story.append(Paragraph(inline(text), S["p"]))
        i += 1

    def fuss(c, d):
        c.saveState()
        c.setFont("S", 7.5)
        c.setFillColor(colors.HexColor("#666"))
        c.drawString(20 * mm, 10 * mm, "Spengler Digital CAD 0.3.1 – " + fusszeile)
        c.drawRightString(190 * mm, 10 * mm, "Seite %d" % d.page)
        c.restoreState()

    doc = SimpleDocTemplate(pdf_pfad, pagesize=A4, leftMargin=20 * mm, rightMargin=20 * mm, topMargin=18 * mm, bottomMargin=18 * mm,
                            title="Spengler Digital CAD – " + fusszeile, author="Spengler Digital", lang="de")
    doc.build(story, onFirstPage=fuss, onLaterPages=fuss)


if __name__ == "__main__":
    logo = os.path.join(HIER, "..", "assets", "logo", "logo_256.png")
    for name, fuss in (("Benutzerhandbuch", "Bedienungsanleitung"), ("Testanleitung", "Testanleitung")):
        bauen(os.path.join(HIER, name + ".md"), os.path.join(HIER, name + ".pdf"), logo, fuss, deckblatt=name == "Benutzerhandbuch")
        print("PDF erstellt:", os.path.join(HIER, name + ".pdf"))
