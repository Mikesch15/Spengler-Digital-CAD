# Spengler Digital – Add-in für Autodesk Fusion (Probe 0.1)
# Befehl «Kantenbaustein»: gerade Kante(n) eines Blechkörpers anklicken, Baustein wählen → je Schritt der Kurzschrift
# eine Lasche (Abkanten) bzw. ein Umschlag an der jeweils neuen Aussenkante. Abwicklung macht Fusion selbst.
# Die Blech-API von Fusion ist noch «Preview»: dieses Add-in probiert die Aufrufe vorsichtig und schreibt alles
# in spengler_protokoll.txt (neben dieser Datei) – bei Fehlern bitte diese Datei schicken.
import adsk.core, adsk.fusion, traceback, os, sys, datetime

ORDNER = os.path.dirname(os.path.abspath(__file__))
if ORDNER not in sys.path:
    sys.path.insert(0, ORDNER)
from kurzschrift import BAUSTEINE, schritte  # noqa: E402

BEFEHL_ID = "spenglerKantenbaustein"
handler = []  # Ereignis-Handler müssen am Leben bleiben
app = adsk.core.Application.get()
ui = app.userInterface


def protokoll(text):
    try:
        with open(os.path.join(ORDNER, "spengler_protokoll.txt"), "a", encoding="utf-8") as f:
            f.write(f"{datetime.datetime.now():%Y-%m-%d %H:%M:%S}  {text}\n")
    except Exception:
        pass


def api_namen(obj, muster=("flange", "hem", "bend", "angle", "height", "position", "flip", "radius", "extent", "distance")):
    try:
        return sorted(n for n in dir(obj) if not n.startswith("_") and any(m in n.lower() for m in muster))
    except Exception:
        return []


def setze(obj, namen, wert):
    """Erstes vorhandene Attribut bzw. Methode setzen – die Preview-API kann Namen noch ändern."""
    for n in namen:
        if not hasattr(obj, n):
            continue
        try:
            a = getattr(obj, n)
            if callable(a):
                a(wert)
            else:
                setattr(obj, n, wert)
            return n
        except Exception as e:
            protokoll(f"  {n} = {wert!r} ging nicht: {e}")
    return None


def gerade(kante):
    return kante.geometry.curveType == adsk.core.Curve3DTypes.Line3DCurveType


def aussenkante(feature, vorher):
    """Neue freie Kante der eben erzeugten Lasche: parallel zur vorigen Kante und am weitesten von ihr entfernt."""
    g = vorher.geometry
    p0, d0 = g.startPoint, g.startPoint.vectorTo(g.endPoint)
    d0.normalize()
    beste, abst = None, -1
    for f in feature.faces:
        for k in f.edges:
            if not gerade(k):
                continue
            q = k.geometry
            d = q.startPoint.vectorTo(q.endPoint)
            if d.length < 1e-6:
                continue
            d.normalize()
            if abs(abs(d.dotProduct(d0)) - 1) > 1e-4:
                continue
            v = p0.vectorTo(q.startPoint)
            quer = v.crossProduct(d0).length  # Abstand der Geraden
            if quer > abst:
                beste, abst = k, quer
    return beste


def baustein_anbringen(kante, folge):
    comp = kante.body.parentComponent
    feats = comp.features
    ff = getattr(feats, "flangeFeatures", None)
    if ff is None:
        raise RuntimeError("Diese Fusion-Version hat keine Laschen-API (features.flangeFeatures). Bitte Fusion aktualisieren.")
    protokoll(f"features: {api_namen(feats)}")
    for n in ("hemFeatures", "joinByBendFeatures", "loftedFlangeFeatures"):
        protokoll(f"{n}: {sorted(x for x in dir(getattr(feats, n, None)) if not x.startswith('_'))}")
    alle = sorted(n for n in dir(ff) if not n.startswith("_"))
    protokoll(f"flangeFeatures: {alle}")
    if not hasattr(ff, "createEdgeFlangeInput"):
        raise RuntimeError("Diese Fusion-Version kann Laschen noch nicht per Add-in erzeugen (seit Update Oktober 2026).\n"
                           "Bitte Fusion aktualisieren: Fusion schliessen und neu starten (Update wird angeboten)\n"
                           "oder Konto-Menü oben rechts → «Nach Updates suchen».\n\n"
                           f"Fusion {app.version}, vorhanden: {', '.join(n for n in alle if 'create' in n.lower()) or '–'}")
    aktuell = kante
    for i, s in enumerate(schritte(folge), 1):
        hoehe = adsk.core.ValueInput.createByString(f"{s['laenge']} mm")
        if s["art"] == "umschlag":
            hf = getattr(feats, "hemFeatures", None)
            if hf is not None:
                protokoll(f"hemFeatures: {api_namen(hf)}")
            # Umschlag: Lasche 180° (falls Fusion das zulässt) – Saumwerkzeug folgt, sobald die API bekannt ist
        inp = ff.createEdgeFlangeInput([aktuell], hoehe)
        protokoll(f"Schritt {i} {s}: EdgeFlangeInput hat {api_namen(inp)}")
        w = abs(s["winkel"])
        setze(inp, ["flangeAngle", "angle", "setAngle", "setFlangeAngle"], adsk.core.ValueInput.createByString(f"{w} deg"))
        if s["winkel"] < 0:  # nach hinten
            setze(inp, ["isFlipped", "isDirectionFlipped", "flipDirection", "isFlangeFlipped"], True)
        if s["ri"]:
            setze(inp, ["bendRadius", "setBendRadius"], adsk.core.ValueInput.createByString(f"{s['ri']} mm"))
        feat = ff.add(inp)
        protokoll(f"Schritt {i}: Lasche erzeugt ({feat.name if hasattr(feat, 'name') else feat})")
        naechste = aussenkante(feat, aktuell)
        if naechste is None:
            raise RuntimeError(f"Schritt {i}: neue Aussenkante nicht gefunden")
        aktuell = naechste


class Erstellt(adsk.core.CommandCreatedEventHandler):
    def notify(self, args):
        try:
            cmd = args.command
            inputs = cmd.commandInputs
            sel = inputs.addSelectionInput("kanten", "Kanten", "Gerade Kanten des Blechs anklicken")
            sel.addSelectionFilter("LinearEdges")
            sel.setSelectionLimits(1, 0)
            dd = inputs.addDropDownCommandInput("baustein", "Baustein", adsk.core.DropDownStyles.TextListDropDownStyle)
            for i, (_, name, f) in enumerate(BAUSTEINE):
                dd.listItems.add(f"{name}  ({f})", i == 0)
            inputs.addStringValueInput("folge", "Kurzschrift", BAUSTEINE[0][2])
            inputs.addTextBoxCommandInput("hilfe", "", "Winkel Schenkel Winkel Schenkel … ab der Kante. + = zur Sichtseite, − = nach hinten, U+/U− = Umschlag, 90r5 = Radius 5.", 3, True)
            for h in (Geaendert(), Ausfuehren()):
                (cmd.inputChanged if isinstance(h, Geaendert) else cmd.execute).add(h)
                handler.append(h)
        except Exception:
            ui.messageBox("Spengler Digital:\n" + traceback.format_exc())


class Geaendert(adsk.core.InputChangedEventHandler):
    def notify(self, args):
        if args.input.id == "baustein":
            i = args.input.selectedItem.index
            args.inputs.itemById("folge").value = BAUSTEINE[i][2]


class Ausfuehren(adsk.core.CommandEventHandler):
    def notify(self, args):
        inputs = args.command.commandInputs
        sel, folge = inputs.itemById("kanten"), inputs.itemById("folge").value
        try:
            schritte(folge)
        except ValueError as e:
            ui.messageBox(f"Kurzschrift: {e}")
            return
        kanten = [adsk.fusion.BRepEdge.cast(sel.selection(i).entity) for i in range(sel.selectionCount)]
        protokoll(f"--- Kantenbaustein «{folge}» an {len(kanten)} Kante(n), Fusion {app.version}")
        for k in kanten:
            try:
                baustein_anbringen(k, folge)
            except Exception:
                protokoll(traceback.format_exc())
                ui.messageBox("Spengler Digital – das ging nicht:\n\n" + (str(sys.exc_info()[1]) if isinstance(sys.exc_info()[1], RuntimeError) else traceback.format_exc().splitlines()[-1])
                              + f"\n\nDetails in:\n{os.path.join(ORDNER, 'spengler_protokoll.txt')}")
                return


def run(context):
    try:
        alt = ui.commandDefinitions.itemById(BEFEHL_ID)
        if alt:
            alt.deleteMe()
        cdef = ui.commandDefinitions.addButtonDefinition(BEFEHL_ID, "Kantenbaustein", "Spengler-Baustein an Blechkante (Falz, Saum, Aufkantung …)")
        h = Erstellt()
        cdef.commandCreated.add(h)
        handler.append(h)
        # in die Blech-Werkzeugleiste, sonst unter Volumenkörper → Erstellen
        for panel_id in ("SheetMetalCreatePanel", "SolidCreatePanel"):
            panel = ui.allToolbarPanels.itemById(panel_id)
            if panel and not panel.controls.itemById(BEFEHL_ID):
                panel.controls.addCommand(cdef)
        protokoll(f"Add-in gestartet (Fusion {app.version})")
    except Exception:
        ui.messageBox("Spengler Digital startet nicht:\n" + traceback.format_exc())


def stop(context):
    try:
        for panel_id in ("SheetMetalCreatePanel", "SolidCreatePanel"):
            panel = ui.allToolbarPanels.itemById(panel_id)
            c = panel.controls.itemById(BEFEHL_ID) if panel else None
            if c:
                c.deleteMe()
        cdef = ui.commandDefinitions.itemById(BEFEHL_ID)
        if cdef:
            cdef.deleteMe()
    except Exception:
        pass
