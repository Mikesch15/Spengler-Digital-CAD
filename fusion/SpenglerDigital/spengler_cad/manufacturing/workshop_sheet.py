"""Werkstattblatt (Fertigungszeichnung) als druckbare HTML-Datei mit SVG.

Hintergrund: Die Fusion-API kann (Stand der bekannten Dokumentation) keine Zeichnungsdokumente mit
Ansichten erzeugen. Deshalb erstellt das Add-in ein eigenes Werkstattblatt aus den Daten, die
zuverlässig vorliegen: Bauteilkennung, Material, Dicke, Vorlage/Version, Abwicklungsmasse aus
Fusion, Querschnitt und Biegeliste aus der Operationsfolge. Werte aus der theoretischen Rechnung
sind als «theoretisch» markiert.
"""
import html

from ..core.bend_geometry import berechne, grenzen_von, kontur, profil_aus_operationen


def _svg_querschnitt(ops, t, ri, k, basis=40.0, breite=360, hoehe=220):
    res = berechne(0.0, profil_aus_operationen(basis, ops, t), t, ri, k)
    pts = kontur(res["pfad"], t, 4)
    g = grenzen_von(pts)
    w, h = (g[2] - g[0]) or 1, (g[3] - g[1]) or 1
    s = min((breite - 40) / w, (hoehe - 40) / h)
    P = lambda p: (20 + (p[0] - g[0]) * s, hoehe - 20 - (p[1] - g[1]) * s)
    poly = " ".join("%.2f,%.2f" % P(p) for p in pts)
    return res, '<svg xmlns="http://www.w3.org/2000/svg" width="%d" height="%d"><polygon points="%s" fill="#9fb4c7" stroke="#1d3557" stroke-width="1"/></svg>' % (breite, hoehe, poly)


def erstelle(daten):
    """daten: {'bauteil','material','dicke','vorlage','vorlagenVersion','operationen' (Zahlen),
    'ri','k' (optional), 'abwicklung': {'breite','laenge','quelle'} (optional), 'datum','addinVersion','hinweise'}"""
    e = lambda s: html.escape(str(s if s is not None else "–"))
    z = ['<!doctype html><html lang="de"><head><meta charset="utf-8"><title>Werkstattblatt %s</title>' % e(daten.get("bauteil")),
         "<style>body{font-family:Segoe UI,Arial,sans-serif;margin:16mm;color:#111}table{border-collapse:collapse}"
         "td,th{border:1px solid #888;padding:3px 8px;text-align:left}h1{font-size:18pt;margin:0 0 6px}"
         ".theo{color:#8a5a00}.kopf td{border:none;padding:1px 12px 1px 0}</style></head><body>"]
    logo = daten.get("logo")
    if logo:
        z.append('<img src="%s" alt="" style="height:48px;float:right">' % e(logo))
    z.append("<h1>Werkstattblatt – %s</h1>" % e(daten.get("bauteil")))
    z.append('<table class="kopf"><tr><td>Material</td><td><b>%s</b></td><td>Dicke</td><td><b>%s mm</b></td></tr>'
             '<tr><td>Vorlage</td><td>%s (Version %s)</td><td>Datum</td><td>%s</td></tr></table>'
             % (e(daten.get("material")), e(daten.get("dicke")), e(daten.get("vorlage")), e(daten.get("vorlagenVersion")), e(daten.get("datum"))))
    ab = daten.get("abwicklung")
    if ab:
        z.append("<h2>Abwicklung</h2><p>Umschliessendes Rechteck: <b>%.1f × %.1f mm</b> (Quelle: %s)</p>" % (ab["breite"], ab["laenge"], e(ab.get("quelle"))))
    ops = daten.get("operationen") or []
    if ops and daten.get("ri") is not None and daten.get("k") is not None:
        res, svg = _svg_querschnitt(ops, float(daten["dicke"]), float(daten["ri"]), float(daten["k"]))
        z.append("<h2>Querschnitt ab Kante</h2>" + svg)
        z.append('<h2>Biegeliste <span class="theo">(theoretisch, K-Faktor %s)</span></h2>' % e(daten["k"]))
        z.append("<table><tr><th>Nr</th><th>Art</th><th>Winkel</th><th>Innenradius</th><th>Schenkel danach</th></tr>")
        for i, (op, b) in enumerate(zip(ops, res["biegungen"]), 1):
            z.append("<tr><td>%d</td><td>%s</td><td>%g°</td><td>%.2f mm</td><td>%.2f mm</td></tr>" % (
                i, "Umschlag" if op["typ"] == "umschlag" else "Abkanten", op["winkel"], b["ri"], op["laenge"]))
        z.append("</table>")
    elif ops:
        z.append("<h2>Operationen</h2><ol>%s</ol><p class='theo'>Ohne Innenradius/K-Faktor im Materialprofil kein Querschnitt.</p>" % "".join(
            "<li>%s %g°, %.2f mm</li>" % ("Umschlag" if o["typ"] == "umschlag" else "Abkanten", o["winkel"], o["laenge"]) for o in ops))
    for h in daten.get("hinweise") or []:
        z.append("<p>Hinweis: %s</p>" % e(h))
    z.append("<p style='font-size:8pt;color:#666'>Erstellt mit Spengler Digital CAD %s. Verbindlich sind die Fusion-Abwicklung und die Werkstattkontrolle.</p></body></html>" % e(daten.get("addinVersion", "")))
    return "\n".join(z)
