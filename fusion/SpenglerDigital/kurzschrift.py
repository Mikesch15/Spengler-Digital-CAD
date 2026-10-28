# Spengler Digital – Kantenbausteine in Kurzschrift (gleich wie in der App, kern/details.js und kern/flaechenblech.js)
# Baustein-Folge ab der Blechkante: Winkel Schenkel Winkel Schenkel …  (+ = zur Sichtseite, − = nach hinten,
# U+ / U− = Umschlag 180°, «90r5» = Innenradius 5). Beispiel Doppelstehfalz Unterfalz: «90 25 U+ 7».
import re

BAUSTEINE = [
    ("dsf-u", "Doppelstehfalz – Unterfalz", "90 25 U+ 7"),
    ("dsf-o", "Doppelstehfalz – Oberfalz", "90 25.7 U-r1.75 10.5"),
    ("sf-u", "Stehfalz einfach – Unterfalz", "90 25"),
    ("sf-o", "Stehfalz einfach – Oberfalz", "90 25.7 U-r1 8"),
    ("lf-u", "Liegender Falz – unten", "U-r1 15"),
    ("lf-o", "Liegender Falz – oben", "U+r1 15"),
    ("trauf", "Traufe: Umschlag nach unten (Einhang)", "U-r1.4 40"),
    ("ortgang", "Ortgang: Aufkantung", "90 25"),
    ("wasserfalz", "Aufkantung mit Wasserfalz", "90 40 U- 10"),
    ("first", "First: Aufkantung 25", "90 25"),
    ("saum-o", "Saum (Umschlag zur Sichtseite)", "U+ 10"),
    ("saum-u", "Saum (Umschlag nach hinten)", "U- 10"),
    ("abk-u", "Abkantung 90° nach hinten", "-90 30"),
    ("abk-o", "Abkantung 90° zur Sichtseite", "90 30"),
    ("tropf", "Abkantung mit Tropfkante", "-90 30 45 10"),
    ("paneel", "Paneel: Abkantung 30 mit Einhang", "-90 30 -90 15"),
]

_WINKEL = re.compile(r"^(U[+-]?|[+-]?\d+(?:\.\d+)?)(?:r(\d+(?:\.\d+)?))?$", re.I)


def schritte(folge):
    """'90 25 U+ 7' → [{'winkel': 90, 'laenge': 25, 'art': 'abkanten', 'ri': None}, {'winkel': 180, 'laenge': 7, 'art': 'umschlag', ...}]"""
    t = [x for x in re.split(r"[\s,;]+", str(folge).replace("−", "-").strip()) if x]
    if not t:
        raise ValueError("Abkantfolge ist leer")
    if len(t) % 2:
        raise ValueError("Abkantfolge: je Biegung ein Winkel und eine Schenkellänge («90 25 U+ 7»)")
    out = []
    for i in range(0, len(t), 2):
        m = _WINKEL.match(t[i])
        if not m:
            raise ValueError(f"«{t[i]}» ist kein Winkel (Zahl, U+ oder U−)")
        try:
            L = float(t[i + 1])
        except ValueError:
            raise ValueError(f"«{t[i + 1]}» ist keine Schenkellänge")
        if L <= 0:
            raise ValueError(f"«{t[i + 1]}» ist keine Schenkellänge")
        umschlag = m.group(1).upper().startswith("U")
        w = (-180.0 if m.group(1).endswith("-") else 180.0) if umschlag else float(m.group(1))
        out.append({"winkel": w, "laenge": L, "art": "umschlag" if umschlag else "abkanten", "ri": float(m.group(2)) if m.group(2) else None})
    return out
