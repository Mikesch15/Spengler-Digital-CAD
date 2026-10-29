# python3 fusion/test_kurzschrift.py – Kurztest der Kurzschrift (Prototyp 0.1), heute im Kern des Add-ins.
# Vollständige Tests: python3 fusion/SpenglerDigital/tests/run_all.py
import json
import os
import sys

ORDNER = os.path.join(os.path.dirname(os.path.abspath(__file__)), "SpenglerDigital")
sys.path.insert(0, ORDNER)
from spengler_cad.core.short_syntax import schritte  # noqa: E402

s = schritte("90 25 U+ 7")
assert s[0] == {"winkel": 90.0, "laenge": 25.0, "art": "abkanten", "ri": None}, s
assert s[1]["art"] == "umschlag" and s[1]["winkel"] == 180 and s[1]["laenge"] == 7
assert schritte("U-r1.4 40")[0] == {"winkel": -180.0, "laenge": 40.0, "art": "umschlag", "ri": 1.4}
assert schritte("−90 30 45 10")[1]["winkel"] == 45
# Die früheren Bausteine sind nur noch Testdaten (keine mitgelieferten Vorlagen mehr)
with open(os.path.join(ORDNER, "tests", "fixtures", "prototyp_0_1_bausteine_TESTDATEN.json"), encoding="utf-8") as f:
    for b in json.load(f)["bausteine"]:
        assert schritte(b["folge"]), b["name"]
for falsch in ["", "90", "x 25", "90 -3"]:
    try:
        schritte(falsch)
        raise SystemExit("hätte Fehler geben sollen: %r" % falsch)
    except ValueError:
        pass
print("Kurzschrift: alle Tests bestanden")
