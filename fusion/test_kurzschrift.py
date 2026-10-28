# python3 fusion/test_kurzschrift.py
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "SpenglerDigital"))
from kurzschrift import schritte, BAUSTEINE

s = schritte("90 25 U+ 7")
assert s[0] == {"winkel": 90.0, "laenge": 25.0, "art": "abkanten", "ri": None}, s
assert s[1]["art"] == "umschlag" and s[1]["winkel"] == 180 and s[1]["laenge"] == 7
assert schritte("U-r1.4 40")[0] == {"winkel": -180.0, "laenge": 40.0, "art": "umschlag", "ri": 1.4}
assert schritte("−90 30 45 10")[1]["winkel"] == 45
for _, name, f in BAUSTEINE:
    assert schritte(f), name
for falsch in ["", "90", "x 25", "90 -3"]:
    try:
        schritte(falsch); raise SystemExit(f"hätte Fehler geben sollen: {falsch!r}")
    except ValueError:
        pass
print("Kurzschrift: alle Tests bestanden")
