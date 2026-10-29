"""Befehle «Abwicklung & DXF» und «Material & Zuschnitt».

Abwicklung & DXF: je gewähltem Blechkörper die Fusion-Abwicklung verwenden (oder mit der gewählten
feststehenden Fläche erzeugen), Masse lesen, DXF mit dem Fusion-Exporter schreiben (Einzel- und
Sammelexport in einen Ordner) und optional ein Werkstattblatt (HTML) erstellen. Erfolg wird nur
gemeldet, wenn die Datei tatsächlich existiert.

Material & Zuschnitt: Abwicklungsmasse der gewählten Körper → Materialberechnung und Zuschnittplan
(Rechnung aus der App, siehe manufacturing/nesting.py) → Bericht, SVG, CSV, DXF.
"""
import datetime
import json
import os
import pathlib

import adsk.core
import adsk.fusion

from .. import VERSION
from ..diagnostics import logger
from ..geometry import fusion_adapter as fa
from ..manufacturing import dxf_writer, material_calculator, nesting, workshop_sheet
from ..storage import json_store, paths
from ..storage.material_library import MaterialBibliothek
from ..storage.settings_service import Einstellungen
from ..ui import help_content
from . import base

BID_ABW = "spenglerAbwicklungDxf"
BID_ZUS = "spenglerMaterialZuschnitt"
Z = {}


def _exportordner(e):
    o = (e.get("export") or {}).get("folder") or paths.unterordner("export")
    o = os.path.join(o, datetime.datetime.now().strftime("%Y-%m-%d_%H%M%S"))
    os.makedirs(o, exist_ok=True)
    return o


def _dateiname(e, bauteil, material, dicke):
    muster = (e.get("export") or {}).get("fileNamePattern") or "{bauteil}"
    try:
        n = muster.format(bauteil=bauteil, material=material or "", dicke=("%g" % dicke) if dicke else "")
    except (KeyError, IndexError, ValueError):
        n = bauteil
    return json_store.dateiname_sicher(n)


def _koerper(inp):
    sel = inp.itemById("koerper")
    out = []
    for i in range(sel.selectionCount):
        b = adsk.fusion.BRepBody.cast(sel.selection(i).entity)
        out.append(b.nativeObject or b)
    return out


def _quelle(body):
    """Vorlagen-Attribute der Features eines Körpers (falls mit dem Add-in erzeugt)."""
    try:
        for f in body.parentComponent.features:
            a = f.attributes.itemByName(fa.ATTR_GRUPPE, "quelle")
            if a:
                return json.loads(a.value)
    except Exception:
        pass
    return None


# ====================================================================== Abwicklung & DXF
def abw_erstellt(args):
    cmd = args.command
    inp = cmd.commandInputs
    s = inp.addSelectionInput("koerper", "Blechkörper", "Ein oder mehrere Blechkörper")
    s.addSelectionFilter("SolidBodies")
    s.setSelectionLimits(1, 0)
    f = inp.addSelectionInput("flaeche", "Feststehende Fläche (falls noch keine Abwicklung)", "Nur bei einem Körper ohne Abwicklung nötig")
    f.addSelectionFilter("PlanarFaces")
    f.setSelectionLimits(0, 1)
    inp.addBoolValueInput("dxf", "DXF exportieren", True, "", True)
    inp.addBoolValueInput("blatt", "Werkstattblatt (HTML) erstellen", True, "", True)
    inp.addBoolValueInput("hilfe", "Hilfe", False, "", False)
    base.handler(adsk.core.InputChangedEventHandler, cmd.inputChanged,
                 lambda a: a.input.id == "hilfe" and base.melden("Hilfe", help_content.text("abwicklung") + "\n\n" + help_content.text("zeichnung")))
    base.handler(adsk.core.CommandEventHandler, cmd.execute, abw_ausfuehren)


@base.sicher("Abwicklung & DXF")
def _abw(self, args):
    inp = args.command.commandInputs
    e = Einstellungen().laden()
    ordner = _exportordner(e)
    fsel = inp.itemById("flaeche")
    flaeche = adsk.fusion.BRepFace.cast(fsel.selection(0).entity) if fsel.selectionCount else None
    if flaeche is not None:
        flaeche = flaeche.nativeObject or flaeche
    z, ok_n, sammel = [], 0, []
    mats = MaterialBibliothek().liste()
    for nr, body in enumerate(_koerper(inp), 1):
        comp = body.parentComponent
        name = body.name or comp.name
        try:
            if not fa.ist_blech(body):
                raise fa.AdapterFehler("kein Blechkörper")
            fp, neu = fa.abwicklung(comp, flaeche if flaeche is not None and flaeche.body == body else None)
            masse = fa.abwicklung_masse(fp)
            t = fa.blechdicke_mm(body)
            q = _quelle(body) or {}
            mat = (q.get("material") or {}).get("name") or next((m["name"] for m in mats if t and abs(m["thickness"] - t) < 0.005), "")
            zeile = "%s: Abwicklung %.1f × %.1f mm%s" % (name, masse["breite"], masse["laenge"], " (neu erzeugt)" if neu else "")
            basis = _dateiname(e, name, mat, t)
            if inp.itemById("dxf").value:
                p = fa.dxf_abwicklung(fp, os.path.join(ordner, basis + ".dxf"))
                zeile += ", DXF ✓"
                sammel.append(p)
            if inp.itemById("blatt").value:
                m = next((x for x in mats if x["id"] == (q.get("material") or {}).get("id")), None)
                logo = os.path.join(paths.ADDIN_ORDNER, "assets", "logo", "logo_256.png")
                html = workshop_sheet.erstelle({
                    "bauteil": name, "material": mat or "nicht zugeordnet", "dicke": t, "vorlage": q.get("vorlageName") or "–",
                    "vorlagenVersion": q.get("vorlageVersion") or "–", "abwicklung": masse,
                    "operationen": q.get("operationen"), "ri": (m or {}).get("innerRadius"), "k": (m or {}).get("kFactor"), "datum": datetime.date.today().isoformat(),
                    "addinVersion": VERSION, "logo": pathlib.Path(logo).as_uri() if os.path.exists(logo) else None,
                    "hinweise": ["Querschnitt/Biegeliste nur für Bauteile, die mit «Kanten bearbeiten» erzeugt wurden."] if not q else []})
                with open(os.path.join(ordner, basis + "_werkstattblatt.html"), "w", encoding="utf-8") as f:
                    f.write(html)
                zeile += ", Werkstattblatt ✓"
            z.append("✓ " + zeile)
            ok_n += 1
        except fa.AdapterFehler as ex:
            z.append("✗ %s: %s" % (name, ex))
        except Exception as ex:
            logger.ausnahme("Abwicklung", koerper=name)
            z.append("✗ %s: Fusion meldet: %s" % (name, base.fehlertext(ex)))
    z.append("\n%d von %d Körpern erfolgreich. Ordner:\n%s" % (ok_n, len(z), ordner))
    base.melden("Abwicklung & DXF", "\n".join(z), ok_n == 0)
    if ok_n:
        try:
            base.oeffnen(ordner)
        except Exception:
            pass


def abw_ausfuehren(args):
    _abw(None, args)


# ====================================================================== Material & Zuschnitt
def zus_erstellt(args):
    cmd = args.command
    inp = cmd.commandInputs
    e = Einstellungen().laden()
    Z["mat"] = MaterialBibliothek().liste()
    s = inp.addSelectionInput("koerper", "Blechkörper", "Körper mit vorhandener Fusion-Abwicklung")
    s.addSelectionFilter("SolidBodies")
    s.setSelectionLimits(1, 0)
    md = inp.addDropDownCommandInput("material", "Material", adsk.core.DropDownStyles.TextListDropDownStyle)
    for m in Z["mat"]:
        md.listItems.add("%s (%.2f mm)" % (m["name"], m["thickness"]), m["id"] == e.get("defaultMaterialId"))
    if Z["mat"] and md.selectedItem is None:
        md.listItems.item(0).isSelected = True
    inp.addIntegerSpinnerCommandInput("stueck", "Stück je Teil", 1, 10000, 1, 1)
    inp.addValueInput("fuge", "Schnittfuge", "mm", adsk.core.ValueInput.createByString("%s mm" % e["nesting"]["kerf"]))
    inp.addValueInput("rand", "Randabstand", "mm", adsk.core.ValueInput.createByString("%s mm" % e["nesting"]["margin"]))
    inp.addBoolValueInput("drehen", "Drehen erlaubt", True, "", bool(e["nesting"]["rotationAllowed"]))
    inp.addBoolValueInput("hilfe", "Hilfe", False, "", False)
    base.handler(adsk.core.InputChangedEventHandler, cmd.inputChanged,
                 lambda a: a.input.id == "hilfe" and base.melden("Hilfe", help_content.text("zuschnitt") + "\n\n" + help_content.text("material")))
    base.handler(adsk.core.CommandEventHandler, cmd.execute, zus_ausfuehren)


@base.sicher("Material & Zuschnitt")
def _zus(self, args):
    from ..core import units
    inp = args.command.commandInputs
    if not Z["mat"]:
        raise fa.AdapterFehler("Kein Materialprofil vorhanden. Bitte unter «Vorlagen & Einstellungen → Materialien» anlegen.")
    m = Z["mat"][inp.itemById("material").selectedItem.index]
    stueck = inp.itemById("stueck").value
    teile, fehlt = [], []
    for body in _koerper(inp):
        fp = getattr(body.parentComponent, "flatPattern", None)
        if not fp:
            fehlt.append(body.name)
            continue
        masse = fa.abwicklung_masse(fp)
        teile.append({"name": body.name, "materialId": m["id"], "flaeche": masse["flaeche"], "breite": masse["breite"],
                      "laenge": masse["laenge"], "stueck": stueck})
    if not teile:
        raise fa.AdapterFehler("Keiner der gewählten Körper hat eine Abwicklung. Zuerst «Abwicklung & DXF» ausführen.")
    e = Einstellungen().laden()
    e["nesting"].update({"kerf": units.cm_zu_mm(inp.itemById("fuge").value), "margin": units.cm_zu_mm(inp.itemById("rand").value),
                         "rotationAllowed": inp.itemById("drehen").value})
    erg = material_calculator.berechne(teile, [m], e)
    text = material_calculator.bericht_text(erg)
    ordner = _exportordner(e)
    x = erg["materialien"][0]
    if x.get("zuschnitt") and x["zuschnitt"]["bestes"]:
        best = x["zuschnitt"]["bestes"]
        blaetter = nesting.lage(best, e["nesting"]["kerf"], e["nesting"]["margin"])
        koll = nesting.kollisionen(blaetter, e["nesting"]["kerf"], e["nesting"]["margin"])
        if koll:
            text += "\nKOLLISIONEN:\n" + "\n".join(koll)
        with open(os.path.join(ordner, "zuschnittplan.svg"), "w", encoding="utf-8") as f:
            f.write(nesting.als_svg(blaetter))
        with open(os.path.join(ordner, "zuschnittplan.csv"), "w", encoding="utf-8") as f:
            f.write(nesting.als_csv(best))
        dxf_writer.zuschnittplan_dxf(blaetter, m["name"], e["export"]["layerContour"], e["export"]["layerText"]).speichern(os.path.join(ordner, "zuschnittplan.dxf"))
    if fehlt:
        text += "\nOhne Abwicklung (nicht berechnet): " + ", ".join(fehlt)
    text += "\n\nAnnahme: Teile als umschliessendes Rechteck der Abwicklung; Rechnung der Spengler-Digital-App (ohne Rollenmischung)."
    with open(os.path.join(ordner, "bericht.txt"), "w", encoding="utf-8") as f:
        f.write(text)
    base.melden("Material & Zuschnitt", text + "\n\nDateien: " + ordner)
    try:
        base.oeffnen(ordner)
    except Exception:
        pass


def zus_ausfuehren(args):
    _zus(None, args)


def registrieren():
    return [base.befehl_definieren(BID_ABW, "Abwicklung & DXF", "Fusion-Abwicklung, DXF-Export (einzeln/gesammelt) und Werkstattblatt.", abw_erstellt),
            base.befehl_definieren(BID_ZUS, "Material & Zuschnitt", "Materialbedarf, Gewicht (Schätzung) und Zuschnittplan aus den Abwicklungen.", zus_erstellt)]
