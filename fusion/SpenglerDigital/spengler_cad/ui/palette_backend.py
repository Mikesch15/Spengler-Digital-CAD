"""Logik der Palette «Vorlagen & Einstellungen» – ohne Fusion, vollständig testbar.

Die HTML-Palette schickt (aktion, json) an Fusion; commands/palette_command.py ruft behandle() auf und
gibt die Antwort als JSON zurück: {"ok": true, "daten": …} oder {"ok": false, "fehler": "…"}.
"""
import json
import os

from .. import VERSION
from ..core import models, operation_plan, short_syntax, template_engine
from ..core.bend_geometry import ProfilFehler, zugabe_abwicklung
from ..storage import backup_service, paths
from ..storage.material_library import MaterialBibliothek
from ..storage.settings_service import Einstellungen
from ..storage.template_repository import VorlagenRepository
from . import help_content


def _ohne_intern(v):
    return {k: x for k, x in v.items() if k not in ("_datei",)}


class Backend(object):
    def __init__(self, wurzel=None):
        self.wurzel = wurzel

    @property
    def repo(self):
        e = Einstellungen(self.wurzel).laden()
        return VorlagenRepository(self.wurzel, projekt_ordner=e.get("projectLibraryFolder") or None)

    def zustand(self):
        e = Einstellungen(self.wurzel).laden()
        r = self.repo
        return {"version": VERSION, "datenordner": self.wurzel or paths.daten_ordner(),
                "vorlagen": [_ohne_intern(v) for v in r.liste("kantenvorlage")],
                "details": [_ohne_intern(v) for v in r.liste("detailvorlage")],
                "kategorien": r.kategorien("kantenvorlage"),
                "materialien": MaterialBibliothek(self.wurzel).liste(),
                "einstellungen": e,
                "sicherungen": [os.path.basename(p) for p in backup_service.liste(self.wurzel)],
                "papierkorb": [os.path.basename(p) for p in r.papierkorb()]}

    # ------------------------------------------------------------------ Aktionen
    def a_init(self, d):
        return self.zustand()

    def a_hilfe(self, d):
        return help_content.text(d.get("thema", ""))

    def a_neue_vorlage(self, d):
        return models.neue_kantenvorlage(d.get("name") or "Neue Vorlage")

    def a_kurzschrift(self, d):
        """Kurzschrift → Operationen (für Expertenmodus) inkl. neu erkannter Parameter."""
        v = template_engine.vorlage_aus_kurzschrift("x", d["text"])
        return {"operations": v["operations"], "parameter": [p["name"] for p in v["parameters"]], "text": short_syntax.als_text(v["operations"])}

    def a_pruefen(self, d):
        from ..core.validation import pruefe_kantenvorlage
        f, w = pruefe_kantenvorlage(d["vorlage"])
        erg = {"fehler": f, "warnungen": w, "kurzschrift": short_syntax.als_text(d["vorlage"].get("operations") or []) if not f else ""}
        if not f and d.get("materialId"):
            m = MaterialBibliothek(self.wurzel).holen(d["materialId"])
            try:
                ops, w2 = template_engine.aufloesen(d["vorlage"], d.get("werte") or {}, m)
                erg["aufgeloest"] = short_syntax.als_text(ops)
                erg["warnungen"] += w2
                if m.get("innerRadius") is not None and m.get("kFactor") is not None:
                    erg["zugabe"] = zugabe_abwicklung(ops, m["thickness"], m["innerRadius"], m["kFactor"])[0]
            except (template_engine.VorlagenFehler, ProfilFehler) as e:
                erg["fehler"].append(str(e))
        return erg

    def a_speichern(self, d):
        return _ohne_intern(self.repo.speichern(d["vorlage"], d.get("ebene", "benutzer")))

    def a_duplizieren(self, d):
        return _ohne_intern(self.repo.duplizieren(d["id"], d.get("typ", "kantenvorlage"), d.get("name")))

    def a_umbenennen(self, d):
        return _ohne_intern(self.repo.umbenennen(d["id"], d["name"], d.get("typ", "kantenvorlage")))

    def a_favorit(self, d):
        return _ohne_intern(self.repo.favorit(d["id"], d.get("an", True), d.get("typ", "kantenvorlage")))

    def a_kategorie(self, d):
        return _ohne_intern(self.repo.kategorie(d["id"], d.get("kategorie"), d.get("typ", "kantenvorlage")))

    def a_loeschen(self, d):
        return self.repo.loeschen(d["id"], d.get("typ", "kantenvorlage"), bestaetigt=d.get("bestaetigt") is True)

    def a_versionen(self, d):
        return self.repo.versionen(d["id"])

    def a_papierkorb_zurueck(self, d):
        r = self.repo
        pfad = next(p for p in r.papierkorb() if os.path.basename(p) == d["datei"])
        return _ohne_intern(r.wiederherstellen(pfad))

    def a_export(self, d):
        return self.repo.exportieren(d["ids"], d["pfad"])

    def a_import(self, d):
        return self.repo.importieren(d["pfad"], ueberschreiben=d.get("ueberschreiben") is True)

    def a_material_neu(self, d):
        return models.neues_materialprofil(d.get("name") or "Neues Material", d.get("dicke") or 1.0)

    def a_k_faktor(self, d):
        """Probebiegung → K-Faktor (Dicke/Innenradius kommen aus dem Materialeditor)."""
        from ..core.bend_geometry import k_faktor_aus_probe
        z = lambda k: float(d[k]) if d.get(k) not in (None, "") else None
        return k_faktor_aus_probe(z("zuschnitt"), z("a"), z("b"), z("t"), z("ri"))

    def a_material_speichern(self, d):
        return MaterialBibliothek(self.wurzel).speichern(d["material"])

    def a_material_loeschen(self, d):
        return MaterialBibliothek(self.wurzel).loeschen(d["id"], bestaetigt=d.get("bestaetigt") is True)

    def a_einstellungen_speichern(self, d):
        return Einstellungen(self.wurzel).speichern(d["einstellungen"])

    def a_sicherung(self, d):
        return backup_service.sichern(self.wurzel, ziel=d.get("pfad"), grund="manuell", addin_version=VERSION)

    def a_wiederherstellen(self, d):
        pfad = d.get("pfad")
        if not pfad and d.get("datei"):
            pfad = os.path.join(paths.unterordner("sicherungen", self.wurzel or paths.daten_ordner()), os.path.basename(d["datei"]))
        return backup_service.wiederherstellen(pfad, self.wurzel, bestaetigt=d.get("bestaetigt") is True, addin_version=VERSION)

    def a_bauplan_test(self, d):
        """Trockenlauf ohne Fusion: wie würde der Bauplan an einer gedachten geraden Blechkante aussehen?"""
        m = MaterialBibliothek(self.wurzel).holen(d["materialId"]) if d.get("materialId") else None
        k = {"ref": None, "text": "Testkante", "kurve": "linie", "laenge": 1000.0, "flaechen": 2, "blech": True,
             "dicke": m.get("thickness") if m else None, "frei": True}
        return operation_plan.beschreibung(operation_plan.erstelle(d["vorlage"], d.get("werte") or {}, m, [k]))

    # ------------------------------------------------------------------ Eingang
    def behandle(self, aktion, daten_json):
        try:
            d = json.loads(daten_json) if isinstance(daten_json, str) and daten_json else (daten_json or {})
            f = getattr(self, "a_" + aktion, None)
            if f is None:
                return json.dumps({"ok": False, "fehler": "Unbekannte Aktion %s" % aktion})
            return json.dumps({"ok": True, "daten": f(d)}, ensure_ascii=False, default=str)
        except Exception as e:  # jede Meldung verständlich zurück an die Palette
            from ..diagnostics import logger
            logger.ausnahme("Palette", aktion=aktion)
            return json.dumps({"ok": False, "fehler": str(e) or type(e).__name__}, ensure_ascii=False)
