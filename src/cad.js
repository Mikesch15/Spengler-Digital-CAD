// Spengler Digital CAD 0.2 – Fusion-artige Oberfläche: Skizzen, Extrusion, Blechprofil, Vorlagen
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { planModul } from "./plan.js";
import { simModul } from "./simulation.js";
import { cloudModul } from "./cloud.js";
import { werkzeugAuf, flanschStandard, werkzeugName, folgeUmkehren, folgeAnhaengen, SAUMARTEN, BEZUEGE, BIEGEPOS } from "../kern/flansch.js";
import { projekteModul } from "./projekte.js";
import { kantenLage, detailAusStep, pruefeDetail, meshAusVorlage } from "../kern/vorlagen/detail3d.js";
import { selbsttest } from "../kern/selbsttest.js";
import { regionen, inRegion } from "../kern/regionen.js";
import { ablageModul } from "./ablage.js";
import "./befehlssuche.js";
import "./arbeitsbereich.js";
import { initKontext, kontextAktionen } from "./kontext.js";
import { zeigeMeldung } from "./meldungen.js";
import { rueckVersatz, zweiseitig, laengeVon } from "../kern/richtung.js";
import { stirnLaschen, schenkelBereiche, laschenStart, laschenEnde } from "../kern/stirnflansch.js";
import { stirnQuetsch, stirnQuetschKandidaten } from "../kern/stirnquetsch.js";
import { nahtFolgen, nahtStandard, raupeMasse, raupenNetz, NAHT_ARTEN } from "../kern/naht.js";
import { bewerteGenauigkeit, modellStatus } from "../kern/genauigkeit.js";
import { quetschZuschnitt, quetschDreieck, quetschDxf, faltenPruefen, eckSchnitt2, quetschAnschluss } from "../kern/quetschfalte.js";
import { rechteckDach, waende, DACHFORMEN } from "../kern/dach/form.js";
import { dachAusFlaechen } from "../kern/dach/flaechen.js";
import { aufmassAusPunkt } from "../kern/dach/lukarneAufmass.js";
import { eindeckung as eindeckungKern, ziegelPrisma } from "../kern/dach/eindeckung.js";
import { lukarne as lukarneKern, LUKARNENARTEN } from "../kern/dach/lukarne.js";
import { elementRechteck, elementKoerper, elementFlaeche, kaminBleche, veluxListe, ELEMENTARTEN } from "../kern/dach/elemente.js";
import { dachBleche, dachSegmente, BLECHARTEN } from "../kern/dach/bleche.js";
import { dachSchnitt, dachSchnittSvg, DETAILARTEN } from "../kern/dach/detail.js";
import { fluegelDach, polygonDach, grundrissForm, GRUNDFORMEN } from "../kern/dach/fluegel.js";
import { flaechenKoerper as dachFlaechenKoerper, flaechenRahmen as dachRahmen, dachMengen } from "../kern/dach/koerper.js";
import { DECKUNGEN_STANDARD, AUFBAU_STANDARD, grundeinstellung as dachGrund, schichten as dachSchichten, pruefeDach } from "../kern/dach/vorlagen.js";
import { FARBEN, LINIENARTEN, farbeHex, standardLayer, skizzenDxf } from "../kern/zeichnung2d.js";
import { sichere, geloeschte, inPapierkorb, zurueckholen, einspielen } from "../kern/sicherung.js";
import { bausteinFolge, hatAusdruck, pruefeEignung, parameterText, parameterAusText } from "../kern/vorlagen/parameter.js";
import { kantenGeometrie, RICHTUNGEN as ANSICHT_RICHTUNGEN } from "./ansicht.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { Brush, Evaluator, ADDITION, SUBTRACTION, INTERSECTION } from "three-bvh-csg";
import { berechne, kontur, polylinie, grenzen, versatzLinie } from "../kern/geometrie.js";
import { VORLAGEN, VORLAGE, standardwerte, freiesProfil, profilErweitern, alsZeilen } from "../kern/profile.js";
import { abweichungen, aktualisiereAusMessung } from "../kern/generator/index.js";
import { ausAppZeile } from "../kern/austausch.js";
import { MATERIALIEN, LAGER, quelle, kFaktorAusProbe } from "../kern/materialien.js";
import { abwicklungDxf, abwicklungenDxf, flaecheDxf, rundblechDxf } from "../kern/dxf.js";
import { rundblechAbwicklung, rundblechSvg } from "../kern/abwicklungRund.js";
import { stepDatei, stlDatei, stlLesen } from "../kern/step.js";
import { cadKlient } from "../kern/cad/klient.js";
import { kernEbene, blechTeilKommando, extrusionKommandos, rotationKommandos, extrusionsHoehen, extrusionsKanten, extrusionsFlaechen, matrixZeilen, flaechenblechPlan, baueFlaechenblech, bausteinQuerschnitt } from "../kern/cad/featureBau.js";
import { skizzenProfile, profilPolygon, NichtExakt } from "../kern/cad/skizzeProfile.js";
import { ansichtAusProjektion, kameraAchsen, kettenAusKanten } from "../kern/cad/ansichtExakt.js";
import { zuschnittAusVolumen } from "../kern/cad/blech.js";
import { dxfLesen } from "../kern/dxflesen.js";
import { Font } from "three/examples/jsm/loaders/FontLoader.js";
import { Line2 } from "three/examples/jsm/lines/Line2.js";
import { LineMaterial } from "three/examples/jsm/lines/LineMaterial.js";
import { LineGeometry } from "three/examples/jsm/lines/LineGeometry.js";
import schriftDaten from "three/examples/fonts/droid/droid_sans_bold.typeface.json";
import { ausschnittWerkzeug, ausschnittKante, profilPunkt, gehrungEcken, gehrungLokal, teilGruppe, eckenFreiraum } from "../kern/flaechenblech.js";
import { BAUSTEINE_STANDARD, flaechenblech, plattenUmriss, kantenGruppen, gegenUhrzeiger, bausteinProfil, eckFaktoren } from "../kern/flaechenblech.js";
import { profilSvg, abwicklungSvg, zuschnittSvg, bausteinSvg, bausteinGrenzen } from "../kern/zeichnung.js";
import { folge } from "../kern/details.js";
import { stueckliste, stuecklisteCsv } from "../kern/auftrag.js";
import { materialbedarf } from "../kern/zuschnitt.js";
import { vorbereiten, loeseSkizze, analyse, fuegeHinzu, bereinige, punkte as skizzenPunkte, kantenZahl, rechteckBedingungen, neueElementId, sichereIds, IST_MASS } from "../kern/skizzenloeser.js";
import { abstandGerade, winkelZwischen } from "../kern/bedingungen.js";
import { rechne, parameterWerte, istZahl, namenIn, NAME as PARAMNAME } from "../kern/ausdruck.js";
import { splinePunkte, ellipsePunkte } from "../kern/skizze.js";
import { langdruck, tastaturSichtbar, wertBlase, maus, schalter as touchSchalter } from "./touch.js";
import { fensterVerschieben, fensterGroesse } from "./fenster.js";
import { logoVarianten, logoBanner, logoPapier } from "./logo.js";
import { biegenInit, biegenOeffnen, biegenOeffnenQuellen, biegenOffen, biegenNeuZeichnen, maschinenVorschau } from "./biegen.js";
import { VORLAGE_SCHROEDER, VORLAGE_JORNS, VORLAGEN as MASCHINEN_VORLAGEN, maschineAusVorlage, werkzeugeAlsText, werkzeugeAusText, maschineFehlt } from "../kern/biegen/maschinen.js";
document.documentElement.lang = "de"; // Sprache der Seite (Vorlesen, Silbentrennung, Prüfwerkzeuge)
import { dateiName as sicherName, modellDateiName } from "../kern/cloud/ablage.js";
import { kreisDurch3, bogenDaten, bogenPunkte, bogenAusMitte, kreisPunkte, polygonPunkte, rechteck3, langlochPunkte, abrundung, rundePolylinie, versatzPolylinie, spiegelPunkt, schnittStrecken, schnittStreckeKreis, verbindeStuecke } from "../kern/skizze.js";
import { BASIS, ACHSEN, versetzt, unterWinkel, mittelebene, zweiKanten, dreiPunkte, tangential, entlangPfad, aufFlaeche, zuWelt, zuLokal } from "../kern/ebenen.js";
const zuWeltK = zuWelt;

const $ = (id) => document.getElementById(id);
const VERSION = typeof __VERSION__ === "string" ? __VERSION__ : "dev"; // beim Bauen eingesetzt
const SPEICHER = "sdcad-doc-0.2";

// ------------------------------------------------------------ Ebenen
// Grundebenen und Konstruktionsebenen (Feature «ebene», berechnet in regen). Eine Ebene ist { o, u, v, n }.
const EBENEN = {
  XY: { name: "Vorne (XY)", ...BASIS.XY },
  XZ: { name: "Boden (XZ)", ...BASIS.XZ },
  YZ: { name: "Seite (YZ)", ...BASIS.YZ },
};
const V = (a) => new THREE.Vector3(a[0], a[1], a[2]);
const ebene = (id) => EBENEN[id] || finde(id)?._ebene || null;
const E_ = (id) => ebene(id) || EBENEN.XY; // Ersatz, damit eine fehlende Ebene nichts zum Absturz bringt
const ebenenName = (id) => EBENEN[id]?.name || finde(id)?.name || "Ebene fehlt";
const basis = (id) => { const e = typeof id === "object" ? id : E_(id); return new THREE.Matrix4().makeBasis(V(e.u), V(e.v), V(e.n)).setPosition(V(e.o)); };
const zu3D = (id, p) => V(zuWelt(E_(id), p));
const ebenenEbene = (id) => { const e = E_(id); return new THREE.Plane().setFromNormalAndCoplanarPoint(V(e.n), V(e.o)); };
const aufEbene = (id, p) => zuLokal(E_(id), [p.x, p.y, p.z]);

// ------------------------------------------------------------ Dokument
let doc = { features: [], zaehler: 1, objekt: "Muster, Bern", nr: "2026-001" };
try { const s = JSON.parse(localStorage.getItem(SPEICHER) || "null"); if (s?.features) doc = s; } catch {}
const speichern = () => { try { localStorage.setItem(SPEICHER, JSON.stringify(doc, (k, v) => (k.startsWith("_") ? undefined : v))); } catch {} };
const neueId = () => "f" + doc.zaehler++;
// Neues Feature an der Rückrollmarke einfügen (wie in Fusion), sonst ans Ende
function entferneFeature(f) {
  const i = doc.features.indexOf(f); if (i < 0) return;
  doc.features.splice(i, 1); if (doc.marke != null && i < doc.marke) doc.marke--;
}
function einfuegen(f) {
  const m = doc.marke;
  if (m != null && m < doc.features.length) { doc.features.splice(m, 0, f); doc.marke = m + 1; } else doc.features.push(f);
}
// IDs anderer Features, auf die f verweist (Skizze, Ebene, Ziel, Bezüge wie «K:f3:…» oder «f5:2»)
function bezuegeVon(f) {
  const ids = new Set(doc.features.map((x) => x.id)), out = new Set();
  const lauf = (v, k) => {
    if (k && k.startsWith("_")) return;
    if (typeof v === "string") { if (ids.has(v) && v !== f.id) out.add(v); for (const t of v.split(/[:;]/)) if (ids.has(t) && t !== f.id) out.add(t); }
    else if (Array.isArray(v)) v.forEach((x) => lauf(x));
    else if (v && typeof v === "object") for (const [kk, x] of Object.entries(v)) if (kk !== "id") lauf(x, kk);
  };
  for (const [k, v] of Object.entries(f)) if (!["id", "name", "notiz", "typ"].includes(k)) lauf(v, k);
  return [...out];
}
const finde = (id) => doc.features.find((f) => f.id === id);
// Parameter (wie «Parameter ändern» in Fusion): in jedem Zahlenfeld und Skizzenmass als Formel nutzbar, z. B. «breite / 3»
const paramWerte = () => parameterWerte(doc.parameter || []).werte;
const zahlAus = (text) => { const t = String(text ?? "").trim(); if (!t) return NaN; if (istZahl(t)) return parseFloat(t.replace(",", ".")); try { return rechne(t, paramWerte()); } catch { return NaN; } };
function wendeAusdrueckeAn(f, P) {
  for (const [id, a] of Object.entries(f.ausdruecke || {})) {
    let v; try { v = rechne(a, P); } catch (e) { throw new Error(`Ausdruck «${a}»: ${e.message}`); }
    if (id.startsWith("p_")) (f.params ||= {})[id.slice(2)] = v;
    else if (id === "lage") f.anteil = Math.min(Math.max(v / 100, 0), 1);
    else f[id] = v;
  }
}
// Skizzenmasse mit Ausdruck nachführen; true, wenn sich ein Wert geändert hat
function skizzenAusdruecke(f, P) {
  let neu = false;
  for (const b of f.bedingungen || []) if (b.ausdruck) {
    let v = rechne(b.ausdruck, P);
    if (b.typ === "knick") v = Math.sign(b.w || 1) * Math.abs(180 - Math.abs(v)) * Math.PI / 180; else if (b.typ === "winkel") v = Math.sign(b.w || 1) * Math.abs(v) * Math.PI / 180;
    if (Math.abs(v - b.w) > 1e-9) { b.w = v; neu = true; }
  }
  return neu;
}
// Blechteile eines Flächenblechs haben die ID «fid:nr»; sie sind keine eigenen Features
const teilFinden = (id) => { const [fid, i] = String(id ?? "").split(":"); return i == null ? null : finde(fid)?._teile?.[+i] || null; };
const waehlbar = (id) => finde(id) || teilFinden(id);
const hauptVon = (id) => finde(String(id ?? "").split(":")[0]);
// Auswahl als Vorgabe für Dialoge: gewählte Skizze bzw. gewähltes Dach (sonst die jeweils letzte)
const vorSk = (liste) => liste.find((x) => x.id === hauptVon(auswahl)?.id) ?? liste.at(-1);
const vorDach = (liste) => { const f = hauptVon(auswahl), id = f?.typ === "dach" ? f.id : f?.dach; return liste.find((x) => x.id === id) ?? liste.at(-1); };
let zeigerAuswahl = null; // gewählte Kante/Fläche eines Körpers: { art: "kante"|"flaeche", fid, a, b | ref }
// Werkstatt-Einstellungen (pro Gerät): kalibrierte und eigene Materialien, Lagerformate
const EINST = "sdcad-einstellungen";
const standardEinst = () => JSON.parse(JSON.stringify({
  materialien: MATERIALIEN, ...LAGER, vorlagen: [], bausteine: BAUSTEINE_STANDARD, eigeneDetails: [], detailvorlagen: [],
  neu: { laenge: 1000, stueck: 1, material: MATERIALIEN[0].id, ebene: "XY", lage: "mitte" }, // Vorgaben für neue Teile
  skizze: { raster: 0, abstand: 80 },                                                 // Fangraster mm (0 = aus), Abstand der Teile in 3D mm
  anzeige: { abB: true },                                                             // Spalte «ab Kante B»
  druck: { betrieb: "", abwicklung: true, etikett: true, bedarf: true },              // Werkstattblatt und Stückliste
  etiketten: { spalten: 3, zeilen: 8, breite: 70, hoehe: 37, oben: 0, links: 0, abstandX: 0, abstandY: 0 }, // mm
  maschinen: [{ ...JSON.parse(JSON.stringify(VORLAGE_SCHROEDER)), id: "schroeder-spb3200" }, { ...JSON.parse(JSON.stringify(VORLAGE_JORNS)), id: "jorns-maxi150s" }], // Biegemaschinen (Biegesimulation)
  firma: { logo: "", vorname: "", logoModus: "auto" },                                                  // Firmenlogo (Bild als Daten-URL) und Vorname für die Begrüssung
  allgemein: { startseite: true, stiftpalette: "auto", langdruck: true, masse: true, abh: true, speichern: "zuletzt", startAnsicht: "iso", stift: ["tAuswahl", "tLinie", "tRechteck", "tKreis", "tMass", "tEntf", "tFertig", "zurueck", "vor", "wSkizze", "wExtrusion"] }, // Voreinstellungen für das ganze Programm
  programm: { darstellung: "auto", updates: true, zuletzt: 8, kern: "netz" },      // kern: "netz" (wie 0.2) | "occt" (exakter CAD-Kern, Beta)
}));
const GRUPPEN = ["neu", "skizze", "anzeige", "druck", "etiketten", "programm", "allgemein", "firma"];
// Gespeicherte oder geladene Einstellungen über die Standardwerte legen (neue Werte bekommen ihren Standard)
function mitStandard(e) {
  const s = standardEinst();
  const r = { ...s, ...e };
  for (const g of GRUPPEN) r[g] = { ...s[g], ...(e?.[g] || {}) };
  if (!Array.isArray(r.materialien) || !r.materialien.length) r.materialien = s.materialien;
  if (!Array.isArray(r.bausteine)) r.bausteine = s.bausteine;
  if (!Array.isArray(r.eigeneDetails)) r.eigeneDetails = [];
  if (!Array.isArray(r.maschinen)) r.maschinen = s.maschinen;
  return r;
}
let einst = standardEinst();
try { const e = JSON.parse(localStorage.getItem(EINST) || "null"); if (e?.materialien?.length) einst = mitStandard(e); } catch {}
if (einst.skizze && !einst.skizze.rasterAus) { if (einst.skizze.raster === 5) einst.skizze.raster = 0; einst.skizze.rasterAus = true; } // einmalig: das alte 5-mm-Raster ist jetzt aus
const rastern = (x) => (einst.skizze.raster > 0 ? Math.round(x / einst.skizze.raster) * einst.skizze.raster : x);
// Darstellung hell/dunkel/automatisch
const darstellung = () => {
  const d = einst.programm.darstellung;
  if (d === "hell") document.documentElement.dataset.theme = "light";
  else if (d === "dunkel") document.documentElement.dataset.theme = "dark";
  else delete document.documentElement.dataset.theme;
};
darstellung();
const neuMaterial = () => (einst.materialien.some((m) => m.id === einst.neu.material) ? einst.neu.material : einst.materialien[0].id);
const SICHERUNG = "sdcad-sicherung";
const sichLesen = () => { try { return JSON.parse(localStorage.getItem(SICHERUNG)) || { liste: [], korb: [] }; } catch { return { liste: [], korb: [] }; } };
const sichSchreiben = (s) => { try { localStorage.setItem(SICHERUNG, JSON.stringify(s)); } catch {} };
// Vor jeder Änderung der Einstellungen: alten Stand sichern, Gelöschtes in den Papierkorb
function sichereEinst(alt, neu, grund) { const s = sichLesen(); s.liste = sichere(s.liste, alt, grund); s.korb = inPapierkorb(s.korb, geloeschte(alt, neu)); sichSchreiben(s); }
const einstSpeichern = () => { try { localStorage.setItem(EINST, JSON.stringify(einst)); } catch { status("⚠ Einstellungen konnten nicht gespeichert werden (Speicher voll – 3D-Detailvorlagen sind gross)."); } };
// Reihenfolge: Einstellungen, dann die im Projekt mitgespeicherten Werte (Projekt von einem anderen Gerät)
const material = (id) => einst.materialien.find((m) => m.id === id) || doc.materialien?.find((m) => m.id === id) || einst.materialien[0];
const matOpt = () => [...einst.materialien, ...(doc.materialien || []).filter((m) => !einst.materialien.some((e) => e.id === m.id))].map((m) => [m.id, m.name]);
let auswahl = null;

// ------------------------------------------------------------ Szene
const leinwand = $("leinwand");
const renderer = new THREE.WebGLRenderer({ canvas: leinwand, antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
const szene = new THREE.Scene();
const kamera = new THREE.PerspectiveCamera(35, 1, 1, 100000);
// In der Skizze keine Perspektive: echte orthogonale Projektion (Projektionsmatrix der Kamera), Raycaster und Steuerung sehen eine Ortho-Kamera
const FOV_NORMAL = 35, orthoK = 1; let orthoAn = false;
const perspUpdate = THREE.PerspectiveCamera.prototype.updateProjectionMatrix, perspFlags = { p: true, o: false };
function orthoUpdate() {
  const d = kamera.position.distanceTo(steuerung.target) || 1, hh = d * Math.tan(FOV_NORMAL * Math.PI / 360) / (kamera.zoom || 1), hw = hh * kamera.aspect;
  Object.assign(kamera, { left: -hw, right: hw, top: hh, bottom: -hh, near: -2e5, far: 2e6 });
  kamera.projectionMatrix.makeOrthographic(-hw, hw, hh, -hh, -2e5, 2e6); kamera.projectionMatrixInverse.copy(kamera.projectionMatrix).invert();
}
function orthoSetzen(an) {
  if (an === orthoAn) return; orthoAn = an;
  if (an) { kamera.fov = FOV_NORMAL; kamera.isPerspectiveCamera = false; kamera.isOrthographicCamera = true; kamera.updateProjectionMatrix = orthoUpdate; kamera.near = -2e5; kamera.far = 2e6; kamera.zoom = 1; orthoUpdate(); }
  else {
    const L = kamera.zoom || 1; if (L !== 1) { const d = kamera.position.clone().sub(steuerung.target).multiplyScalar(1 / L); kamera.position.copy(steuerung.target).add(d); }
    kamera.zoom = 1; kamera.isPerspectiveCamera = true; kamera.isOrthographicCamera = false; delete kamera.updateProjectionMatrix; kamera.near = 1; kamera.far = 100000; perspUpdate.call(kamera);
  }
}
const steuerung = new OrbitControls(kamera, leinwand);
steuerung.enableDamping = false; // keine Nachlaufzeit: Drehen und Verschieben folgen der Maus sofort
steuerung.rotateSpeed = 1.1; steuerung.panSpeed = 1.2; steuerung.zoomSpeed = 1.2; steuerung.zoomToCursor = true;
// Wie Fusion: Mausrad gedrückt = Verschieben, Umschalt + Mausrad gedrückt = Drehen, Rad = Zoom zum Zeiger (OrbitControls tauscht Verschieben/Drehen bei Umschalt)
steuerung.mouseButtons = { LEFT: null, MIDDLE: THREE.MOUSE.PAN, RIGHT: null }; // linke und rechte Taste bewegen die Ansicht nicht; Finger/Stift (Touch) drehen und verschieben weiter
// Drehpunkt: beim Drehen (Umschalt + Mausrad, Stift, ein Finger) dreht das Modell um die Stelle unter dem Zeiger bei Beginn der Drehung
let drehPivot = null, drehQ = null;
addEventListener("pointerdown", (e) => {
  if (!e.isPrimary) { drehPivot = null; return; }
  drehPivot = null; if (skizze || e.target !== leinwand) return;
  const rot = (e.pointerType === "pen" && e.button === 0) || (e.pointerType === "touch" && steuerung.touches.ONE === THREE.TOUCH.ROTATE) || (e.pointerType === "mouse" && e.button === 1 && e.shiftKey);
  if (!rot) return;
  strahl.setFromCamera(ndc(e), kamera);
  const hit = strahl.intersectObjects(modell.children.filter((o) => o.isMesh), false)[0];
  let P = hit?.point; // sonst: Punkt unter dem Zeiger in der Tiefe des bisherigen Drehpunkts
  if (!P) P = strahl.ray.intersectPlane(new THREE.Plane().setFromNormalAndCoplanarPoint(kamera.getWorldDirection(new THREE.Vector3()), steuerung.target), new THREE.Vector3());
  if (P) { drehPivot = P.clone(); drehQ = kamera.quaternion.clone(); }
}, true);
for (const t of ["pointerup", "pointercancel"]) addEventListener(t, () => { drehPivot = null; }, true);
steuerung.addEventListener("change", () => { // OrbitControls dreht um sein Ziel; hier um den gemerkten Punkt korrigiert (Kamera und Ziel um dieselbe Verschiebung)
  if (!drehPivot) return;
  const R = kamera.quaternion.clone().multiply(drehQ.clone().invert()), d = drehPivot.clone().sub(steuerung.target), sh = d.clone().sub(d.clone().applyQuaternion(R));
  kamera.position.add(sh); steuerung.target.add(sh); drehQ.copy(kamera.quaternion);
});
// Grosse Modelle: Zoom zur Oberfläche unter dem Zeiger (Kamera und Ziel werden um diesen Punkt skaliert) – die Kamera nähert sich nur bis zu einem Mindestabstand und fährt nie durch die Wand.
// Verschieben und Drehen beginnen mit dem Ziel auf der Oberfläche in Bildmitte: die Geschwindigkeit passt zum betrachteten Teil (nicht zur Entfernung zum Modellmittelpunkt).
const modellRadius = () => { const b = new THREE.Box3(); modell.children.forEach((o) => { if (!o.userData.konstruktion) b.expandByObject(o); }); return b.isEmpty() ? 500 : b.getSize(new THREE.Vector3()).length() / 2; };
const flaechenTreffer = (ndcPunkt) => { kamera.updateMatrixWorld(true); strahl.setFromCamera(ndcPunkt, kamera); return strahl.intersectObjects(modell.children.filter((o) => o.isMesh && o.visible), false)[0] || null; };
function ziehNahe(P, faktor) {
  const d = kamera.position.distanceTo(P); if (d < 1e-6) return;
  const r = modellRadius(), minAbst = Math.max(4, r * 0.0004) * orthoK, maxAbst = Math.max(r * 40, 2000) * orthoK;
  let nd = d * faktor; if (faktor < 1) nd = Math.max(nd, Math.min(d, minAbst)); else nd = Math.min(nd, Math.max(d, maxAbst));
  const k = nd / d, ko = kamera.position.clone().sub(P).multiplyScalar(k), zo = steuerung.target.clone().sub(P).multiplyScalar(k); kamera.position.copy(P).add(ko); steuerung.target.copy(P).add(zo);
  kamera.near = Math.max(0.3, Math.min(r / 100 * orthoK, nd * 0.02)); kamera.far = Math.max(kamera.far, r * 50 * orthoK, nd * 20); kamera.updateProjectionMatrix();
}
leinwand.addEventListener("wheel", (e) => {
  if (skizze || modus2d) return; // in der Skizze bleibt das bisherige Zoomen
  e.preventDefault(); e.stopImmediatePropagation();
  const dy = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaMode === 2 ? e.deltaY * 100 : e.deltaY, treffer = flaechenTreffer(ndc(e));
  let P = treffer?.point; if (!P) P = strahl.ray.intersectPlane(new THREE.Plane().setFromNormalAndCoplanarPoint(kamera.getWorldDirection(new THREE.Vector3()), steuerung.target), new THREE.Vector3());
  if (P) ziehNahe(P, Math.exp(dy * 0.0011 * steuerung.zoomSpeed));
}, { capture: true, passive: false });
// Skizze: Umschalt + Mausrad gedrückt dreht die Ansicht nur in der Ebene (2D, Blick bleibt senkrecht auf die Fläche)
let rollZug = null;
leinwand.addEventListener("pointerdown", (e) => { if (!skizze || e.pointerType !== "mouse" || e.button !== 1 || !e.shiftKey) return; e.stopImmediatePropagation(); e.preventDefault(); leinwand.setPointerCapture(e.pointerId); rollZug = { x: e.clientX }; }, true);
leinwand.addEventListener("pointermove", (e) => { if (!rollZug) return; e.stopImmediatePropagation(); const ang = -(e.clientX - rollZug.x) * 0.008; rollZug.x = e.clientX; kamera.up.applyAxisAngle(kamera.getWorldDirection(new THREE.Vector3()), ang); kamera.lookAt(steuerung.target); steuerung.update(); }, true);
for (const t of ["pointerup", "pointercancel"]) leinwand.addEventListener(t, (e) => { if (!rollZug) return; try { leinwand.releasePointerCapture(e.pointerId); } catch {} rollZug = null; }, true);
addEventListener("pointerdown", (e) => { // Ziel auf die Oberfläche in Bildmitte legen (Ansicht bleibt gleich)
  if (!e.isPrimary || skizze || modus2d || e.target !== leinwand || (e.pointerType === "mouse" && e.button !== 1)) return;
  const t = flaechenTreffer(new THREE.Vector2(0, 0)); if (t && t.distance > kamera.near * 2) steuerung.target.copy(t.point);
}, true);
// Stift (Tablet) bewegt das Modell wie der Finger (drehen), ausser in der Skizze – dort zeichnet er; die Maus bleibt unberührt
addEventListener("pointerdown", (e) => { steuerung.mouseButtons.LEFT = e.pointerType === "pen" && !skizze && e.target === leinwand ? THREE.MOUSE.ROTATE : null; }, true);
szene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture; // Studiolicht: Spiegelungen wie im CAD-Programm
szene.add(new THREE.HemisphereLight(0xffffff, 0x66727a, 0.55));
const licht = new THREE.DirectionalLight(0xffffff, 1.15); licht.position.set(1, 2, 3); szene.add(licht);
const licht2 = new THREE.DirectionalLight(0xffffff, 0.3); licht2.position.set(-2, -1, -1); szene.add(licht2);
const boden = new THREE.GridHelper(2000, 40, 0x9aa6b0, 0xc3ccd4); boden.material.transparent = true; boden.material.opacity = 0.55; szene.add(boden);
szene.add(new THREE.AxesHelper(80));
const modell = new THREE.Group(), live = new THREE.Group(); szene.add(modell, live);
let skizzenRaster = null;
// Ansichtswürfel (wie ViewCube): spiegelt die Blickrichtung, Fläche anklicken = Normalansicht
const WUERFEL = ["rechts", "links", "oben", "unten", "vorne", "hinten"], WUERFELNAME = { rechts: "Rechts", links: "Links", oben: "Oben", unten: "Unten", vorne: "Vorne", hinten: "Hinten" };
const wuerfelSzene = new THREE.Scene(), wuerfelKamera = new THREE.OrthographicCamera(-1.55, 1.55, 1.55, -1.55, 0.1, 20), wuerfelRay = new THREE.Raycaster();
const wuerfelMat = WUERFEL.map((n) => { const c = document.createElement("canvas"); c.width = c.height = 128; const g = c.getContext("2d");
  const gr = g.createLinearGradient(0, 0, 0, 128); gr.addColorStop(0, "#ffffff"); gr.addColorStop(1, "#e3e8ee"); g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
  g.strokeStyle = "#9aa6b2"; g.lineWidth = 6; g.strokeRect(3, 3, 122, 122); g.fillStyle = "#1d4f7a"; g.font = '600 26px "Segoe UI", Arial, sans-serif'; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(WUERFELNAME[n].toUpperCase(), 64, 66);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return new THREE.MeshBasicMaterial({ map: t }); });
const wuerfel = new THREE.Mesh(new THREE.BoxGeometry(2, 2, 2), wuerfelMat); wuerfelSzene.add(wuerfel);
wuerfel.add(new THREE.LineSegments(new THREE.EdgesGeometry(wuerfel.geometry), new THREE.LineBasicMaterial({ color: 0x5b6672 })));
const wuerfelHit = $("wuerfelHit");
function wuerfelTreffer(e) {
  const r = wuerfelHit.getBoundingClientRect(); wuerfelRay.setFromCamera(new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -(((e.clientY - r.top) / r.height) * 2 - 1)), wuerfelKamera);
  return wuerfelRay.intersectObject(wuerfel, false)[0]?.face?.materialIndex ?? -1;
}
wuerfelHit.addEventListener("pointermove", (e) => { const i = wuerfelTreffer(e); wuerfelMat.forEach((m, k) => m.color.set(k === i ? 0xcfe2f5 : 0xffffff)); wuerfelHit.style.cursor = i >= 0 ? "pointer" : "default"; });
wuerfelHit.addEventListener("pointerleave", () => wuerfelMat.forEach((m) => m.color.set(0xffffff)));
wuerfelHit.addEventListener("click", (e) => { const i = wuerfelTreffer(e); if (i >= 0) ansicht(WUERFEL[i]); });
function zeichneWuerfel() {
  const r = wuerfelHit.getBoundingClientRect(), c = leinwand.getBoundingClientRect(); if (!r.width || !c.width) return;
  wuerfelKamera.position.copy(kamera.position).sub(steuerung.target).normalize().multiplyScalar(6); wuerfelKamera.up.copy(kamera.up); wuerfelKamera.lookAt(0, 0, 0);
  const x = r.left - c.left, y = c.bottom - r.bottom; renderer.setScissorTest(true); renderer.setViewport(x, y, r.width, r.height); renderer.setScissor(x, y, r.width, r.height);
  renderer.autoClear = false; renderer.clearDepth(); renderer.render(wuerfelSzene, wuerfelKamera); renderer.autoClear = true; renderer.setScissorTest(false); renderer.setViewport(0, 0, c.width, c.height);
}

function groesse() {
  const w = leinwand.clientWidth, h = leinwand.clientHeight;
  if (!w || !h) return;
  renderer.setSize(w, h, false); kamera.aspect = w / h; kamera.updateProjectionMatrix();
}
new ResizeObserver(groesse).observe(leinwand);
// Rechtes Feld (Teil / Auftrag) zuklappen für mehr Platz; Zustand wird gemerkt
{ const mitte = document.querySelector(".mitte"), setze = (zu) => { mitte.classList.toggle("werkzu", zu); try { localStorage.setItem("sdcad-werkzu", zu ? "1" : "0"); } catch {} };
  try { if (localStorage.getItem("sdcad-werkzu") === "1") mitte.classList.add("werkzu"); } catch {}
  $("werkZu").onclick = () => setze(true); $("werkAuf").onclick = () => setze(false); }
kamera.position.set(600, 450, 700);

const leeren = (g) => g.children.slice().forEach((c) => { g.remove(c); c.traverse?.((o) => { o.geometry?.dispose(); o.material?.dispose?.(); }); });

// ------------------------------------------------------------ Skizzengeometrie
// Jedes Element liefert seine Geometrie: linien (zum Zeichnen und Treffen), kontur (geschlossen) oder offen (Stück eines Linienzugs)
// Skizzentext: Umrisse der Buchstaben (Droid Sans Bold, mit Umlauten) als geschlossene Konturen – Löcher (o, a, e …) inklusive
let schrift = null;
const TEXTE = new Map();
function textKonturen(el) {
  const key = `${el.text}|${el.hoehe}|${el.winkel || 0}|${el.p[0]}|${el.p[1]}`;
  if (TEXTE.has(key)) return TEXTE.get(key);
  schrift ||= new Font(schriftDaten);
  const w = ((el.winkel || 0) * Math.PI) / 180, c = Math.cos(w), sn = Math.sin(w);
  const zu = (q) => [el.p[0] + q.x * c - q.y * sn, el.p[1] + q.x * sn + q.y * c], out = [];
  for (const sh of schrift.generateShapes(String(el.text || ""), Math.max(0.1, +el.hoehe || 10))) {
    const { shape, holes } = sh.extractPoints(4);
    for (const l of [shape, ...holes]) { const q = l.map(zu); if (q.length > 2 && gleich(q[0], q.at(-1))) q.pop(); if (q.length > 2) out.push(q); }
  }
  if (TEXTE.size > 200) TEXTE.clear();
  TEXTE.set(key, out); return out;
}
function elGeo(el) {
  switch (el.art) {
    case "text": { const k = textKonturen(el); return { linien: k.map((q) => [...q, q[0]]), konturen: k }; }
    case "linie": {
      const pts = rundePolylinie(el.pts, el.radien || {}, !!el.geschlossen);
      return el.geschlossen ? { linien: [[...pts, pts[0]]], kontur: pts } : { linien: [pts], offen: pts };
    }
    case "rechteck": { const c = [el.a, [el.b[0], el.a[1]], el.b, [el.a[0], el.b[1]]]; return { linien: [[...c, c[0]]], kontur: c }; }
    case "kreis": { const k = kreisPunkte(el.c, el.r, Math.min(720, Math.max(72, Math.ceil((2 * Math.PI * el.r) / 2.5)))); return { linien: [[...k, k[0]]], kontur: k }; }
    case "bogen": { const b = bogenPunkte(el); return { linien: [b], offen: b }; }
    case "langloch": { const k = langlochPunkte(el.a, el.b, el.r); return { linien: [[...k, k[0]]], kontur: k }; }
    case "spline": { const q = splinePunkte(el.pts, !!el.geschlossen); return el.geschlossen ? { linien: [[...q, q[0]]], kontur: q } : { linien: [q], offen: q }; }
    case "ellipse": { const k = ellipsePunkte(el.c, el.a, el.r2); return { linien: [[...k, k[0]]], kontur: k }; }
    default: return { linien: [] }; // Punkt
  }
}
const profilElemente = (f) => f.elemente.filter((el) => !el.hilfs && el.art !== "punkt");
// Wie in Fusion: einzelne Linien und Bögen, die sich an den Enden berühren, bilden zusammen einen Linienzug oder ein Profil
const verbunden = (f) => verbindeStuecke(profilElemente(f).filter((el) => elGeo(el).offen).map((el) => ({ pts: el.art === "linie" ? el.pts : el.art === "spline" ? [el.pts[0], el.pts.at(-1)] : [el.a, el.b], el })));
function zugPunkte(z) {
  const pts = [];
  for (const { stueck, umgekehrt } of z.teile) { let q = elGeo(stueck.el).offen; if (umgekehrt) q = q.slice().reverse(); pts.push(...(pts.length ? q.slice(1) : q)); }
  if (z.geschlossen && pts.length > 1 && gleich(pts[0], pts.at(-1))) pts.pop();
  return pts;
}
function schleifen(f) {
  // geschlossene Profile als Punktlisten [u,v]
  const out = profilElemente(f).flatMap((el) => { const g = elGeo(el); return g.konturen || (g.kontur ? [g.kontur] : []); });
  for (const z of verbunden(f).filter((z) => z.geschlossen)) out.push(zugPunkte(z));
  return out;
}
// Offene Linienzüge für Blechprofile: Eckpunkte und Abrundungsradien { Eckenindex: R }
const ketten = (f) => verbunden(f).filter((z) => !z.geschlossen).map((z) => {
  const pts = [], radien = {}; let mitBogen = false;
  for (const { stueck, umgekehrt } of z.teile) {
    const el = stueck.el; if (el.art === "bogen" || el.art === "spline") mitBogen = true;
    const roh = el.art === "linie" ? el.pts : el.art === "spline" ? [el.pts[0], el.pts.at(-1)] : [el.a, el.b], r = el.radien || {}, n = roh.length;
    const q = umgekehrt ? roh.slice().reverse() : roh, basis = pts.length ? pts.length - 1 : 0;
    q.forEach((_, i) => { const j = umgekehrt ? n - 1 - i : i; if (r[j] > 0) radien[basis + i] = r[j]; });
    pts.push(...(pts.length ? q.slice(1) : q).map((x) => x.slice()));
  }
  return { pts, radien, mitBogen };
});
const flaeche = (p) => p.reduce((s, a, i) => { const b = p[(i + 1) % p.length]; return s + a[0] * b[1] - b[0] * a[1]; }, 0) / 2;
function innen(pt, poly) {
  let drin = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i], [xj, yj] = poly[j];
    if ((yi > pt[1]) !== (yj > pt[1]) && pt[0] < ((xj - xi) * (pt[1] - yi)) / (yj - yi) + xi) drin = !drin;
  }
  return drin;
}
// Flächen (Regionen) einer Skizze wie in Fusion: Linien werden an Schnittpunkten getrennt, jede geschlossene Teilfläche ist wählbar
const REGIONEN = new Map();
function skizzenRegionen(sk) {
  const segs = [];
  for (const el of profilElemente(sk)) for (const l of elGeo(el).linien || []) for (let i = 0; i + 1 < l.length; i++) segs.push([l[i], l[i + 1]]);
  const key = JSON.stringify(segs); let r = REGIONEN.get(key);
  if (!r) {
    const xs = segs.flatMap(([a, b]) => [a[0], b[0]]), ys = segs.flatMap(([a, b]) => [a[1], b[1]]), diag = xs.length ? Math.hypot(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys)) : 0;
    // Linienenden knapp neben einer Kreis-/Bogensehne werden angeschlossen
    r = regionen(segs, 1e-4, Math.max(0.05, diag * 1e-3)); if (REGIONEN.size > 40) REGIONEN.clear(); REGIONEN.set(key, r); }
  return r;
}
// gewählte Flächen eines Features (f.flaechen = Innenpunkte [u,v]); undefined = ältere Projekte: alle Profile der Skizze
function gewaehlteRegionen(f, sk) {
  if (!Array.isArray(f?.flaechen)) return null;
  const alle = skizzenRegionen(sk), out = [];
  for (const p of f.flaechen) { const r = alle.find((x) => inRegion(x, p)); if (r && !out.includes(r)) out.push(r); }
  return out;
}
// Exakte Profile für den Kern: gewählte Flächen = ganze Profile (exakt, mit Kreisen/Bögen) oder, bei Teilflächen, Polygone
function exakteProfile(s, f) {
  const alle = skizzenProfile(profilElemente(s)), gew = f.typ === "extrusion" ? gewaehlteRegionen(f, s) : null;
  if (!gew) return alle;
  if (!gew.length) throw new NichtExakt("keine Fläche gewählt");
  return gew.map((r) => {
    const t = alle.find((a) => a.loecher.length === r.loecher.length && Math.abs(a.flaeche - r.flaeche) <= 0.02 * r.flaeche && innen(r.innen, profilPolygon(a.profil)) && !a.loecher.some((h) => innen(r.innen, profilPolygon(h))));
    if (t) return t;
    const poly = (pts) => ({ start: pts[0], segmente: pts.slice(1).map((q) => ({ bis: q })) });
    return { profil: poly(r.aussen), loecher: r.loecher.map(poly), flaeche: r.flaeche };
  });
}
function formen(f, { aussenFn = (p) => p, lochFn = (p) => p } = {}, feat = null) {
  // Aussenkonturen mit Löchern (eine Ebene tief); aussenFn/lochFn bearbeiten die Konturen (gegen den Uhrzeiger)
  const gew = gewaehlteRegionen(feat, f);
  const aussen = [];
  if (gew) for (const r of gew) aussen.push({ p: r.aussen, a: r.flaeche, loecher: r.loecher });
  else {
    const ls = schleifen(f).map((p) => ({ p, a: Math.abs(flaeche(p)) })).sort((x, y) => y.a - x.a);
    for (const l of ls) {
      const eltern = aussen.filter((o) => innen(l.p[0], o.p)).sort((x, y) => x.a - y.a)[0];
      if (eltern && !eltern.loch) eltern.loecher.push(l.p); else aussen.push({ ...l, loecher: [] });
    }
  }
  const ccw0 = (p) => (flaeche(p) < 0 ? p.slice().reverse() : p);
  for (const o of aussen) { o.p = aussenFn(ccw0(o.p)); o.loecher = o.loecher.map((h) => lochFn(ccw0(h))); }
  return aussen.map((o) => {
    const ccw = (p) => (flaeche(p) < 0 ? p.slice().reverse() : p);
    const s = new THREE.Shape(ccw(o.p).map(([u, v]) => new THREE.Vector2(u, v)));
    o.loecher.forEach((h) => s.holes.push(new THREE.Path(ccw(h).reverse().map(([u, v]) => new THREE.Vector2(u, v)))));
    return s;
  });
}

// ------------------------------------------------------------ Blech aus Linienzug
function blechAusKette(pts, m, riAn = () => null) { const { start, ops } = blechOps(pts, m, riAn); return berechne(start, ops, m.t, m.ri, m.k); }
function blechOps(pts, m, riAn = () => null) {
  const ops = [];
  let start = 0, alt = null;
  for (let i = 0; i < pts.length - 1; i++) {
    const du = pts[i + 1][0] - pts[i][0], dv = pts[i + 1][1] - pts[i][1];
    const L = Math.hypot(du, dv), w = (Math.atan2(dv, du) * 180) / Math.PI;
    if (L < 1e-6) continue;
    if (alt === null) start = w;
    else {
      let d = w - alt; while (d > 180) d -= 360; while (d <= -180) d += 360;
      if (Math.abs(d) < 0.01) { ops[ops.length - 1].L += L; alt = w; continue; }
      ops.push({ typ: "biegung", winkel: +d.toFixed(4), ri: riAn(i), modus: "sharp" });
    }
    ops.push({ typ: "schenkel", L });
    alt = w;
  }
  return { start, ops };
}

// ------------------------------------------------------------ Körper erzeugen
// ------------------------------------------------------------ Darstellung (wie «Erscheinungsbild» in Fusion): Metalle der Spenglerei, Holz, Beton
const OBERFLAECHEN = {
  grau: { name: "Standard grau", farbe: 0x9aa5ad, metall: 0.5, rauh: 0.45 },
  titanzink: { name: "Titanzink walzblank", farbe: 0xb3bdc5, metall: 0.8, rauh: 0.36 },
  titanzink_vb: { name: "Titanzink vorbewittert (blaugrau)", farbe: 0x8795a0, metall: 0.45, rauh: 0.55, textur: "fleck" },
  titanzink_sw: { name: "Titanzink vorbewittert (schiefergrau)", farbe: 0x66717a, metall: 0.45, rauh: 0.55, textur: "fleck" },
  kupfer: { name: "Kupfer blank", farbe: 0xc4774a, metall: 0.9, rauh: 0.3 },
  kupfer_braun: { name: "Kupfer brüniert", farbe: 0x7a4a33, metall: 0.6, rauh: 0.55, textur: "fleck" },
  kupfer_patina: { name: "Kupfer Patina", farbe: 0x6fae96, metall: 0.15, rauh: 0.8, textur: "fleck" },
  aluminium: { name: "Aluminium blank", farbe: 0xd2d7db, metall: 0.85, rauh: 0.32 },
  alu_anthrazit: { name: "Aluminium anthrazit (RAL 7016)", farbe: 0x3a4148, metall: 0.3, rauh: 0.55 },
  chromstahl: { name: "Chromstahl", farbe: 0xc3cacf, metall: 0.95, rauh: 0.2, textur: "schliff" },
  stahl_verzinkt: { name: "Stahl verzinkt", farbe: 0xaab3b8, metall: 0.8, rauh: 0.4, textur: "zinkblume" },
  holz: { name: "Holz (Schalung, Lattung)", farbe: 0xc49a64, metall: 0, rauh: 0.75, textur: "holz" },
  beton: { name: "Beton", farbe: 0xa8a7a1, metall: 0, rauh: 0.9, textur: "fleck" },
  ziegel: { name: "Ziegel / Mauerwerk", farbe: 0xa65a3e, metall: 0, rauh: 0.85, textur: "fleck" },
};
// Darstellung nach Material (Blech) – eigene Wahl am Feature geht vor
const oberflaecheFuer = (m) => /kupfer/i.test(m?.name) ? "kupfer" : /chrom|cns|inox/i.test(m?.name) ? "chromstahl" : /alu/i.test(m?.name) ? "aluminium" : /stahl/i.test(m?.name) ? "stahl_verzinkt" : /zink/i.test(m?.name) ? "titanzink" : "grau";
const farbe = (m) => oberflaecheFuer(m);
const TEXTUREN = {};
function textur(art) { // kleine Kacheln aus Zufallsmustern (keine Bilddateien nötig, offline)
  if (TEXTUREN[art]) return TEXTUREN[art];
  const c = document.createElement("canvas"); c.width = c.height = 256; const g = c.getContext("2d"); let z = 7;
  const rnd = () => ((z = (z * 16807) % 2147483647) / 2147483647);
  g.fillStyle = "#fff"; g.fillRect(0, 0, 256, 256);
  if (art === "holz") for (let y = 0; y < 256; y++) { const v = 200 + 40 * Math.sin(y * 0.35 + Math.sin(y * 0.05) * 4) + 15 * rnd(); g.fillStyle = `rgb(${v},${v},${v})`; g.fillRect(0, y, 256, 1); }
  else if (art === "schliff") for (let y = 0; y < 256; y++) { const v = 225 + 30 * rnd(); g.fillStyle = `rgb(${v},${v},${v})`; g.fillRect(0, y, 256, 1); }
  else if (art === "zinkblume") for (let i = 0; i < 90; i++) { const v = 200 + 55 * rnd(); g.fillStyle = `rgb(${v},${v},${v})`; g.beginPath(); const x = rnd() * 256, y = rnd() * 256; for (let k = 0; k < 6; k++) { const w = k * Math.PI / 3 + rnd() * 0.5, r = 12 + 22 * rnd(); g.lineTo(x + Math.cos(w) * r, y + Math.sin(w) * r); } g.fill(); }
  else for (let i = 0; i < 5000; i++) { const v = 232 + 23 * rnd(); g.fillStyle = `rgba(${v},${v},${v},0.35)`; g.beginPath(); g.arc(rnd() * 256, rnd() * 256, 0.6 + 1.6 * rnd(), 0, 7); g.fill(); } // feines Korn statt Flecken
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace;
  return (TEXTUREN[art] = t);
}
// Texturkoordinaten in mm (Würfelprojektion), damit Muster auf allen Körpern gleich gross sind
function wuerfelUV(geo, mm = 400) {
  const pos = geo.attributes.position; if (!geo.attributes.normal) geo.computeVertexNormals();
  const nor = geo.attributes.normal, uv = new Float32Array(pos.count * 2);
  for (let i = 0; i < pos.count; i++) {
    const ax = Math.abs(nor.getX(i)), ay = Math.abs(nor.getY(i)), az = Math.abs(nor.getZ(i)), x = pos.getX(i), y = pos.getY(i), zz = pos.getZ(i);
    const [u, v] = ax >= ay && ax >= az ? [zz, y] : ay >= az ? [x, zz] : [x, y];
    uv[2 * i] = u / mm; uv[2 * i + 1] = v / mm;
  }
  geo.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
}
// Glatte Schattierung runder Flächen: Normalen über Dreiecke mit nahezu gleicher Richtung (< grad) mitteln, scharfe Kanten bleiben hart
function glatteNormalen(geo, grad = 32) {
  if (!geo || geo.index || !geo.attributes.position || geo.userData.glatt) return geo;
  const pos = geo.attributes.position, n = pos.count; if (n % 3 || n > 600000) return geo;
  const nt = n / 3, fn = new Float32Array(nt * 3), A = new Float32Array(nt), tab = new Map(), key = (i) => `${Math.round(pos.getX(i) * 1000)},${Math.round(pos.getY(i) * 1000)},${Math.round(pos.getZ(i) * 1000)}`;
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3(), nv = new THREE.Vector3();
  for (let t = 0; t < nt; t++) {
    a.fromBufferAttribute(pos, t * 3); b.fromBufferAttribute(pos, t * 3 + 1); c.fromBufferAttribute(pos, t * 3 + 2);
    nv.crossVectors(b.sub(a), c.sub(a)); const l = nv.length(); A[t] = l; if (l > 0) nv.divideScalar(l); fn.set([nv.x, nv.y, nv.z], t * 3);
    for (let k = 0; k < 3; k++) { const kk = key(t * 3 + k); (tab.get(kk) || tab.set(kk, []).get(kk)).push(t); }
  }
  const cos = Math.cos((grad * Math.PI) / 180), out = new Float32Array(n * 3);
  for (let t = 0; t < nt; t++) for (let k = 0; k < 3; k++) {
    let x = 0, y = 0, z = 0; const nx = fn[t * 3], ny = fn[t * 3 + 1], nz = fn[t * 3 + 2];
    for (const u of tab.get(key(t * 3 + k))) if (fn[u * 3] * nx + fn[u * 3 + 1] * ny + fn[u * 3 + 2] * nz > cos) { x += fn[u * 3] * A[u]; y += fn[u * 3 + 1] * A[u]; z += fn[u * 3 + 2] * A[u]; }
    const l = Math.hypot(x, y, z) || 1; out.set([x / l, y / l, z / l], (t * 3 + k) * 3);
  }
  geo.setAttribute("normal", new THREE.BufferAttribute(out, 3)); geo.userData.glatt = true; return geo;
}
function oberflaechenMaterial(art, geo) {
  glatteNormalen(geo);
  if (typeof art === "number") return new THREE.MeshStandardMaterial({ color: art, metalness: 0.5, roughness: 0.45, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1 });
  const o = OBERFLAECHEN[art] || OBERFLAECHEN.grau;
  if (o.textur && geo) wuerfelUV(geo, o.textur === "holz" ? 600 : 400);
  return new THREE.MeshStandardMaterial({ color: o.farbe, metalness: o.metall, roughness: o.rauh, envMapIntensity: 1, map: o.textur && geo ? textur(o.textur) : null,
    side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1 });
}
const darstellungVon = (f, m) => f?.darstellung || (m ? oberflaecheFuer(m) : "grau");
const csg = new Evaluator(); csg.attributes = ["position", "normal"]; csg.useGroups = false;
function koerperMesh(geo, farbe, fid, kanten) {
  let mat; if (kanten) { geo.computeVertexNormals(); mat = new THREE.MeshStandardMaterial({ color: farbe, metalness: 0.2, roughness: 0.7, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1 }); } // vorgegebene Kanten: Quader, flach schattiert (schnell)
  const mesh = new THREE.Mesh(geo, mat || oberflaechenMaterial(farbe, geo)); mesh.userData.art = farbe;
  mesh.add(new THREE.LineSegments(kanten || kantenGeometrie(geo), new THREE.LineBasicMaterial({ color: 0x2c3a46, transparent: true, opacity: 0.45 })));
  mesh.userData.fid = fid; return mesh;
}
// Vereinigen, Ausschneiden, Schneiden (wie in Fusion) – Geometrie des Zielkörpers wird ersetzt
function verknuepfe(ziel, werkzeug, op, kantenNeu = true) {
  const a = new Brush(nurPos(ziel.geometry)), b = new Brush(nurPos(werkzeug));
  a.updateMatrixWorld(); b.updateMatrixWorld();
  const r = csg.evaluate(a, b, { verbinden: ADDITION, ausschneiden: SUBTRACTION, schneiden: INTERSECTION }[op]).geometry;
  ziel.geometry.dispose(); ziel.geometry = glatteNormalen(r);
  if (!kantenNeu) return;
  const kante = ziel.children[0]; kante.geometry.dispose(); kante.geometry = kantenGeometrie(r); // ohne Nähte der Booleschen Rechnung
}
const nurPos = (g) => { const n = g.index ? g.toNonIndexed() : g.clone(); for (const k of Object.keys(n.attributes)) if (k !== "position" && k !== "normal") n.deleteAttribute(k); if (!n.attributes.normal) n.computeVertexNormals(); return n; };
// ueber > 0: Werkzeug für Vereinigen/Ausschneiden an beiden Enden etwas länger – deckungsgleiche Flächen (Skizze auf der
// Körperfläche) machen die Boolesche Rechnung sonst sehr langsam und unsauber; 0.01 mm ist für die Werkstatt ohne Belang
// Konische Extrusion (Entformungsschräge wie der «Konuswinkel» der Fusion-Extrusion): Deckfläche um tan(Winkel)·Tiefe nach innen (+) bzw. aussen (−) versetzt
function konischGeometrie(loops, ebene, tiefe, richtung, winkel) {
  const d = Math.tan((winkel * Math.PI) / 180) * Math.abs(tiefe), pos = [], tri = (a, b, c) => pos.push(...a, ...b, ...c);
  for (const roh of loops) {
    let L = roh.slice(); if (L.length > 2 && gleich(L[0], L.at(-1))) L.pop(); if (L.length < 3) continue; if (flaeche(L) < 0) L = L.reverse();
    const T = versatzPolylinie(L, d, true), n = L.length, B = (i) => [L[i][0], L[i][1], 0], Tp = (i) => [T[i][0], T[i][1], tiefe];
    for (let i = 0; i < n; i++) { const j = (i + 1) % n; tri(B(i), B(j), Tp(j)); tri(B(i), Tp(j), Tp(i)); } // Seiten (gegen den Uhrzeigersinn: aussen)
    for (const [a, b, c] of THREE.ShapeUtils.triangulateShape(L.map(([x, y]) => new THREE.Vector2(x, y)), [])) { tri(B(a), B(c), B(b)); tri(Tp(a), Tp(b), Tp(c)); }
  }
  if (!pos.length) throw new Error("Konische Extrusion: kein geschlossenes Profil");
  const geo = new THREE.BufferGeometry(); geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); geo.computeVertexNormals();
  geo.translate(0, 0, -rueckVersatz(richtung, tiefe)); geo.applyMatrix4(basis(ebene)); return geo;
}
function koerperGeometrie(formen_, ebene, tiefe, richtung, ueber = 0) {
  const geo = new THREE.ExtrudeGeometry(formen_, { depth: tiefe + 2 * ueber, bevelEnabled: false, curveSegments: 48 });
  geo.translate(0, 0, -ueber);
  geo.translate(0, 0, -rueckVersatz(richtung, tiefe));
  geo.applyMatrix4(basis(ebene));
  return geo;
}
// Drehen: geschlossene Profile um eine Achse der Skizze (Punkt a, Richtung d in u/v) um «winkel» Grad
function drehGeometrie(loops, ebene, a, d, winkel) {
  const L = Math.hypot(d[0], d[1]) || 1, ax = [d[0] / L, d[1] / L], geos = [];
  for (const pts of loops) {
    const rh = pts.map(([u, v]) => { const q = [u - a[0], v - a[1]]; return [q[0] * ax[1] - q[1] * ax[0], q[0] * ax[0] + q[1] * ax[1]]; }); // r quer zur Achse, h entlang
    const seite = Math.sign(rh.reduce((s, p) => s + p[0], 0)) || 1;
    if (rh.some((p) => p[0] * seite < -1e-6)) throw new Error("Profil liegt auf beiden Seiten der Achse");
    const profil = rh.map(([r, h]) => new THREE.Vector2(Math.abs(r), h)); profil.push(profil[0].clone());
    const voll = Math.abs(winkel) >= 359.999, phi = (Math.abs(winkel) * Math.PI) / 180;
    const start = winkel < 0 ? -phi : 0;
    const geo = new THREE.LatheGeometry(profil, Math.max(8, Math.round(64 * phi / (2 * Math.PI))), start, phi);
    const teile = [geo];
    if (!voll) for (const w of [start, start + phi]) { // Endflächen schliessen (Lathe: Punkt bei φ = (r·sinφ, h, r·cosφ))
      const kappe = new THREE.ShapeGeometry(new THREE.Shape(profil.slice(0, -1)));
      kappe.applyMatrix4(new THREE.Matrix4().makeRotationY(w - Math.PI / 2)); teile.push(kappe);
    }
    for (const g of teile) {
      const n = g.index ? g.toNonIndexed() : g; n.deleteAttribute("uv");
      // Lathe dreht um die lokale Y-Achse; bei φ = 0 liegt das Profil in Richtung lokal +Z → Z = zur Profilseite in der Ebene, Y = Achse, X = Y × Z
      const Y = new THREE.Vector3(ax[0], ax[1], 0), Z = new THREE.Vector3(ax[1] * seite, -ax[0] * seite, 0), X = new THREE.Vector3().crossVectors(Y, Z);
      n.applyMatrix4(new THREE.Matrix4().makeBasis(X, Y, Z).setPosition(a[0], a[1], 0)); n.applyMatrix4(basis(ebene)); geos.push(n);
    }
  }
  return zusammen(geos);
}
function zusammen(geos) { // Dreiecke zusammenlegen; jede Teilfläche nach aussen ausrichten (für Boolesche Rechnung)
  const pos = [];
  for (const g of geos) { const n = g.index ? g.toNonIndexed() : g; pos.push(...n.attributes.position.array); }
  const r = new THREE.BufferGeometry(); r.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  return nachAussen(r);
}
// Vorzeichenbehaftetes Volumen; negativ = Dreiecke zeigen nach innen → Reihenfolge umdrehen
function nachAussen(geo) {
  const p = geo.attributes.position.array; let v = 0;
  for (let i = 0; i < p.length; i += 9) v += p[i] * (p[i + 4] * p[i + 8] - p[i + 5] * p[i + 7]) - p[i + 1] * (p[i + 3] * p[i + 8] - p[i + 5] * p[i + 6]) + p[i + 2] * (p[i + 3] * p[i + 7] - p[i + 4] * p[i + 6]);
  if (v < 0) for (let i = 0; i < p.length; i += 9) for (let k = 0; k < 3; k++) { const t = p[i + 3 + k]; p[i + 3 + k] = p[i + 6 + k]; p[i + 6 + k] = t; }
  geo.attributes.position.needsUpdate = true; geo.computeVertexNormals(); geo.userData.glatt = false;
  return geo;
}
// Stirnflansche (Kante S1 = Anfang, S2 = Ende der Länge): je Lasche ein Querschnitt (u = Fortsetzung der Blechebene, v = Abkantrichtung), über die Schenkellänge gezogen
function spiegleFlaechen(geo) { for (const n of ["position", "normal", "uv"]) { const a = geo.attributes[n]; if (!a) continue; const sz = a.itemSize; for (let i = 0; i + 2 < a.count; i += 3) for (let k = 0; k < sz; k++) { const x = a.array[(i + 1) * sz + k]; a.array[(i + 1) * sz + k] = a.array[(i + 2) * sz + k]; a.array[(i + 2) * sz + k] = x; } a.needsUpdate = true; } geo.computeVertexNormals(); }
function stirnMeshes(f, ebeneRef, versatz, zw, farbe) {
  const rueck = rueckVersatz(zw.richtung, zw.tiefe), meshes = [];
  for (const l of f._stirn || []) {
    const len = Math.hypot(l.p2[0] - l.p1[0], l.p2[1] - l.p1[1]); if (len < 1e-6) continue;
    const d = [(l.p2[0] - l.p1[0]) / len, (l.p2[1] - l.p1[1]) / len], sg = l.ende === "S1" ? -1 : 1, zEnde = l.ende === "S1" ? -rueck : zw.tiefe - rueck;
    const geo = new THREE.ExtrudeGeometry(new THREE.Shape(l.ring.map(([u, v]) => new THREE.Vector2(u, v))), { depth: len, bevelEnabled: false, curveSegments: 48 });
    if (l.gehrungStart || l.gehrungEnde) { // Gehrung: Endflächen als Ebene parallel zur Länge schräg stellen (Schnitt in der Winkelhalbierenden)
      const P = geo.attributes.position, mitte = [[0, 0]]; let ang = 0, u0 = 0, v0 = 0, p0 = 0; // Mittellinie der Lasche in (u, v): die Gehrung gilt für sie, nicht für die Blechstärke
      for (const b of [...l.biegungen].sort((a, c) => a.pos - c.pos).concat([{ pos: l.laenge, winkel: 0 }])) { const d = b.pos - p0; u0 += d * Math.cos(ang); v0 += d * Math.sin(ang); mitte.push([u0, v0]); p0 = b.pos; ang += (b.winkel * Math.PI) / 180; }
      const vMitte = (u, v) => { let best = 1e30, bv = v; for (let i = 1; i < mitte.length; i++) { const a = mitte[i - 1], c = mitte[i], dx = c[0] - a[0], dy = c[1] - a[1], l2 = dx * dx + dy * dy || 1e-12, t = Math.max(0, Math.min(1, ((u - a[0]) * dx + (v - a[1]) * dy) / l2)), px = a[0] + dx * t, py = a[1] + dy * t, dd = (u - px) ** 2 + (v - py) ** 2; if (dd < best) { best = dd; bv = py; } } return bv; };
      for (let i = 0; i < P.count; i++) { const z = P.getZ(i), v = vMitte(P.getX(i), P.getY(i)); if (Math.abs(z) < 1e-6) P.setZ(i, laschenStart(l, v)); else if (Math.abs(z - len) < 1e-6) P.setZ(i, len + laschenEnde(l, v)); }
      P.needsUpdate = true; geo.computeVertexNormals();
    }
    if (l.quetschListe?.length) { // Quetschfalte: Lasche endet an der Ecklinie (Schnittebene durch die Ecke O, unabhängig von der Abkanthöhe)
      const mitteQ = [[0, 0]]; let ang = 0, u0 = 0, v0 = 0, p0 = 0;
      for (const b of [...l.biegungen].sort((a, c2) => a.pos - c2.pos).concat([{ pos: l.laenge, winkel: 0 }])) { const dd = b.pos - p0; u0 += dd * Math.cos(ang); v0 += dd * Math.sin(ang); mitteQ.push([u0, v0]); p0 = b.pos; ang += (b.winkel * Math.PI) / 180; }
      const uMitte = (u, v) => { let best = 1e30, bu = u; for (let i = 1; i < mitteQ.length; i++) { const a = mitteQ[i - 1], c2 = mitteQ[i], dx = c2[0] - a[0], dy = c2[1] - a[1], l2 = dx * dx + dy * dy || 1e-12, t = Math.max(0, Math.min(1, ((u - a[0]) * dx + (v - a[1]) * dy) / l2)), px = a[0] + dx * t, py = a[1] + dy * t, dd = (u - px) ** 2 + (v - py) ** 2; if (dd < best) { best = dd; bu = px; } } return bu; };
      const P = geo.attributes.position;
      for (const q of l.quetschListe) {
        const nach = q.seite === "nach", endZ = nach ? len : 0, zO = (q.S[0] - l.p1[0]) * d[0] + (q.S[1] - l.p1[1]) * d[1];
        for (let i = 0; i < P.count; i++) if (Math.abs(P.getZ(i) - endZ) < 1e-6) P.setZ(i, zO + (nach ? -1 : 1) * q.cotLasche * (uMitte(P.getX(i), P.getY(i)) - q.us));
      }
      P.needsUpdate = true; geo.computeVertexNormals();
    }
    const M = new THREE.Matrix4().makeBasis(new THREE.Vector3(0, 0, sg), new THREE.Vector3(-d[1], d[0], 0), new THREE.Vector3(d[0], d[1], 0)).setPosition(l.p1[0] + versatz[0], l.p1[1] + versatz[1], zEnde);
    geo.applyMatrix4(M); if (M.determinant() < 0) spiegleFlaechen(geo);
    geo.applyMatrix4(basis(ebeneRef)); meshes.push(koerperAusGeo(geo, farbe, f.id));
    for (const q of l.quetschListe || []) { // gefaltetes Dreieck an der Ecke (auf der Wand oder der Lasche)
      const m = material(f.material), v3 = (a) => new THREE.Vector3(...a), zO3 = (q.ende === "S1" ? -rueck : zw.tiefe - rueck) - q.sgIn * q.us;
      const FM = basis(ebeneRef).multiply(new THREE.Matrix4().makeBasis(v3(q.X3), v3(q.Y3), v3(q.Z3)).setPosition(q.S[0] + versatz[0], q.S[1] + versatz[1], zO3)), wandId = (q.wand === "wand") === q.laschIst1 ? "wand2" : "wand1";
      meshes.push(...quetschFaltMeshes(q.zus, wandId, m.t, FM, farbe, f.id));
    }
  }
  return meshes;
}
// Stirnlaschen und Quetschfalten an Stirnecken rechnen (vor dem Körper, weil die Wand an der Ecklinie geschnitten wird)
function stirnBerechnen(f, m) {
  f._stirn = null; f._stirnFehler = null;
  for (const x of doc.features) if (x.typ === "stirnquetsch" && x.ziel === f.id) x._sqFehler = null;
  const er = stirnErweiterungen(f, m); if (!er.length) return;
  const r = stirnLaschen(f._res, er, m); f._stirn = r.laschen; f._stirnFehler = r.fehler[0] || null;
  const H = laengeVon(f);
  for (const x of doc.features) {
    if (x.typ !== "stirnquetsch" || x.ziel !== f.id || x._aus) continue;
    try {
      const l = r.laschen.find((q) => q.ende === x.ende && q.schenkel === +x.schenkel); if (!l) throw new Error("Die Stirnlasche an diesem Schenkel fehlt");
      const info = stirnQuetsch(f._res, r.laschen, { ende: x.ende, schenkel: +x.schenkel, seite: x.seite }, H); info.feature = x; info.wand = x.wand === "wand" ? "wand" : "lasche"; (l.quetschListe ||= []).push(info);
    } catch (e) { x._sqFehler = e.message; }
  }
}
function stirnAnhaengen(f, m, ebeneRef, versatz) {
  if (!f._stirn || f.versteckt) return;
  for (const mesh of stirnMeshes(f, ebeneRef, versatz, zweiseitig(f, "laenge", "laenge2"), darstellungVon(f, m))) { mesh.userData.stirn = true; modell.add(mesh); } // Stirnlaschen bleiben Netz (der exakte Kern kennt sie noch nicht) – sie dürfen nicht durch den exakten Körper verschwinden
}
// Wand an der Ecklinie einer Quetschfalte schneiden: Endpunkte des Profils an der Stirn werden entlang der Länge auf die Schnittebene durch die Ecke O gelegt
function stirnWandVor(f, versatz, zw) {
  const qs = (f._stirn || []).flatMap((l) => l.quetschListe || []); if (!qs.length) return null;
  const rueck = rueckVersatz(zw.richtung, zw.tiefe), mitte = polylinie(f._res.pfad, 6).map(([x, y]) => [x + versatz[0], y + versatz[1]]);
  const nahe = (x, y) => { let best = 1e30, bp = [x, y]; for (let i = 1; i < mitte.length; i++) { const a = mitte[i - 1], b = mitte[i], dx = b[0] - a[0], dy = b[1] - a[1], l2 = dx * dx + dy * dy || 1e-12, t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (y - a[1]) * dy) / l2)), px = a[0] + dx * t, py = a[1] + dy * t, d = (x - px) ** 2 + (y - py) ** 2; if (d < best) { best = d; bp = [px, py]; } } return bp; };
  return (geo) => {
    const P = geo.attributes.position;
    for (const q of qs) {
      const zEnde = q.ende === "S1" ? -rueck : zw.tiefe - rueck, sgIn = q.sgIn, zO = zEnde - sgIn * q.us, S = [q.S[0] + versatz[0], q.S[1] + versatz[1]], w = q.wandRichtung, tang = Math.max(q.tangW, 1e-6);
      for (let i = 0; i < P.count; i++) {
        if (Math.abs(P.getZ(i) - zEnde) > 1e-6) continue;
        const [cx, cy] = nahe(P.getX(i), P.getY(i)), out = (cx - S[0]) * w[0] + (cy - S[1]) * w[1];
        if (out <= -tang) continue;
        P.setZ(i, out >= 0 ? zO + sgIn * q.cotWand * out : zEnde + (zO - zEnde) * ((out + tang) / tang));
      }
    }
    P.needsUpdate = true; geo.computeVertexNormals();
  };
}
function koerper(formen_, ebene, tiefe, richtung, farbe, fid, vor = null) {
  const geo = new THREE.ExtrudeGeometry(formen_, { depth: tiefe, bevelEnabled: false, curveSegments: 48 });
  geo.translate(0, 0, -rueckVersatz(richtung, tiefe)); vor?.(geo);
  geo.applyMatrix4(basis(ebene));
  return koerperAusGeo(geo, farbe, fid);
}
function koerperAusGeo(geo, farbe, fid) {
  const mesh = new THREE.Mesh(geo, oberflaechenMaterial(farbe, geo)); mesh.userData.art = farbe;
  mesh.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo, 28), new THREE.LineBasicMaterial({ color: 0x27303a, transparent: true, opacity: 0.6 })));
  mesh.userData.fid = fid;
  return mesh;
}
const konturForm = (res, t, versatz = [0, 0]) => new THREE.Shape(kontur(res.pfad, t, 3).map(([x, y]) => new THREE.Vector2(x + versatz[0], y + versatz[1])));

const dunkelModus = () => { const t = document.documentElement.dataset.theme; return t === "dark" || (t !== "light" && matchMedia("(prefers-color-scheme: dark)").matches); };
// ------------------------------------------------------------ Layer (2D): Farbe und Linienart je Layer, Elemente verweisen mit el.layer
const layerListe = () => (doc.layer?.length ? doc.layer : (doc.layer = standardLayer()));
const layerVon = (el) => layerListe().find((l) => l.id === (el.layer ?? "0")) || layerListe()[0];
function skizzenObjekt(f, farbe = 0x1f5fbf, bestimmt = null) {
  const g = new THREE.Group();
  const normal = new THREE.LineBasicMaterial({ color: farbe, depthTest: false });
  const fertigMat = bestimmt && new THREE.LineBasicMaterial({ color: dunkelModus() ? 0xf2f5f8 : 0x10161d, depthTest: false });
  const projMat = new THREE.LineBasicMaterial({ color: 0x9b59b6, depthTest: false });
  const hilfsMat = new THREE.LineDashedMaterial({ color: 0xd08a2c, dashSize: 4, gapSize: 3, depthTest: false });
  const layerMats = new Map();
  const layerMat = (ly) => { // eigene Farbe und/oder Linienart des Layers; sonst null (Standarddarstellung)
    const art = ly.art || "durchgezogen"; if (ly.aci == null && art === "durchgezogen") return null;
    const key = `${ly.aci}|${art}`; if (!layerMats.has(key)) {
      const c = ly.aci != null ? farbeHex(ly.aci) : farbe, mu = LINIENARTEN[art]?.[2] || [];
      layerMats.set(key, mu.length ? new THREE.LineDashedMaterial({ color: c, dashSize: Math.abs(mu[0]) || 1, gapSize: Math.abs(mu[1]) || 1, depthTest: false }) : new THREE.LineBasicMaterial({ color: c, depthTest: false }));
    }
    return layerMats.get(key);
  };
  for (const el of f.elemente) {
    const ly = layerVon(el); if (ly.sichtbar === false) continue;
    const lm = layerMat(ly), mat = el.projiziert ? projMat : lm || (bestimmt?.has(el.id) ? fertigMat : normal);
    for (const pts of elGeo(el).linien) {
      const l = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts.map((p) => zu3D(f.ebene, p))), el.hilfs ? hilfsMat : mat);
      if (el.hilfs || mat.isLineDashedMaterial) l.computeLineDistances();
      l.renderOrder = 10; g.add(l);
    }
    if (el.art === "punkt") {
      const pk = new THREE.Points(new THREE.BufferGeometry().setFromPoints([zu3D(f.ebene, el.p)]), new THREE.PointsMaterial({ color: farbe, size: 8, sizeAttenuation: false, depthTest: false }));
      pk.renderOrder = 11; g.add(pk);
    }
  }
  return g;
}

// ------------------------------------------------------------ Konstruktionsebenen: Darstellung und Bezüge
const EBENEN_ARTEN = {
  versatz: "Versetzte Ebene", winkel: "Ebene unter Winkel", mitte: "Mittelebene", kanten: "Ebene durch zwei Kanten",
  punkte: "Ebene durch drei Punkte", tangente: "Tangentiale Ebene", pfad: "Ebene entlang Pfad", flaeche: "Ebene auf Fläche",
};
// Halbtransparente Fläche mit Rand; Grösse setzt ebenenGroesse() passend zum Modell
function ebenenObjekt(e, id, grund = false) {
  const g = new THREE.Group();
  g.position.copy(V(e.o)); g.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(V(e.u), V(e.v), V(e.n)));
  const flaeche = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ color: grund ? 0x8a969e : 0x4da3ff, transparent: true, opacity: grund ? 0.14 : 0.2, side: THREE.DoubleSide, depthWrite: false }));
  const rand = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.PlaneGeometry(1, 1)), new THREE.LineBasicMaterial({ color: grund ? 0x5f6b74 : 0xc77d16 }));
  flaeche.userData.ebene = rand.userData.ebene = g.userData.ebene = id; flaeche.renderOrder = 5;
  g.add(flaeche, rand);
  return g;
}
const grundebenen = new THREE.Group(); szene.add(grundebenen); grundebenen.visible = false; // zum Anklicken beim Skizzieren
for (const k of Object.keys(EBENEN)) grundebenen.add(ebenenObjekt(EBENEN[k], k, true));
function ebenenGroesse() {
  const box = new THREE.Box3();
  modell.children.forEach((o) => { if (!o.userData.ebene && !o.userData.konstruktion) box.expandByObject(o); });
  const g = box.isEmpty() ? 300 : Math.min(Math.max(box.getSize(new THREE.Vector3()).length() * 0.7, 150), 5000);
  [...modell.children, ...grundebenen.children].forEach((o) => { if (o.userData.ebene) o.scale.set(g, g, 1); });
}

// Bezüge als Text, damit sie im Projekt gespeichert werden können:
//   Ebene: "XY" | Ebenen-ID | "F:o;n" (Körperfläche)   Kante: "A:X" | "K:skizze:element:kante" | "E:a;b" (Körperkante)
//   Punkt: "O" | "P:skizze:element:punkt" | "V:p"       Zylinder: "Z:extrusion:kreis"   Pfad: "L:skizze:element" | "E:a;b"
const zahl3 = (t) => t.split(",").map(Number);
const fmt3 = (p) => p.map((x) => +x.toFixed(3)).join(",");
const elementPunkte = (el) => ({ linie: () => el.pts, spline: () => el.pts, ellipse: () => [el.c, el.a], rechteck: () => [el.a, [el.b[0], el.a[1]], el.b, [el.a[0], el.b[1]]], kreis: () => [el.c],
  bogen: () => [el.a, el.b, bogenDaten(el)?.c || el.m], langloch: () => [el.a, el.b], punkt: () => [el.p] })[el.art]();
const ELEMENTNAME = { spline: "Spline", ellipse: "Ellipse", linie: "Linie", rechteck: "Rechteck", kreis: "Kreis", bogen: "Bogen", langloch: "Langloch", punkt: "Punkt" };
const elementKanten = (el) => {
  if (el.art === "langloch") { // die beiden geraden Seiten
    const L = Math.hypot(el.b[0] - el.a[0], el.b[1] - el.a[1]) || 1, n = [-(el.b[1] - el.a[1]) / L * el.r, (el.b[0] - el.a[0]) / L * el.r];
    return [[[el.a[0] + n[0], el.a[1] + n[1]], [el.b[0] + n[0], el.b[1] + n[1]]], [[el.b[0] - n[0], el.b[1] - n[1]], [el.a[0] - n[0], el.a[1] - n[1]]]];
  }
  if (el.art !== "linie" && el.art !== "rechteck") return [];
  const p = elementPunkte(el), zu = el.art === "rechteck" || el.geschlossen;
  return p.slice(0, zu ? p.length : -1).map((a, i) => [a, p[(i + 1) % p.length]]);
};
const elementPfad = (el) => { const g = elGeo(el); return g.kontur ? [...g.kontur, g.kontur[0]] : g.offen || []; };
const skizzeElement = (sid, ei) => { const sk = finde(sid); const el = sk?.typ === "skizze" && sk.elemente[+ei]; if (!el || !ebene(sk.ebene)) throw new Error("Bezug in der Skizze fehlt"); return [sk, el]; };
const welt = (sk, p) => zuWelt(E_(sk.ebene), p);
const ACHSEN_EBENE = { X: "XY", Y: "YZ", Z: "XZ" }; // Bezugsebene, wenn um eine Achse gedreht wird

function bezugEbene(r) {
  if (r?.startsWith("F:")) { const [o, n] = r.slice(2).split(";").map(zahl3); return aufFlaeche(o, n); }
  const e = ebene(r); if (!e) throw new Error("Bezugsebene fehlt"); return e;
}
function bezugKante(r) {
  if (!r) throw new Error("Kante wählen");
  if (r.startsWith("X:")) { const a = finde(r.slice(2))?._achse; if (!a) throw new Error("Konstruktionsachse fehlt"); return { p: a.p, d: a.d.map((v) => v * 500), ebene: EBENEN.XY }; }
  if (r.startsWith("A:")) return { ...ACHSEN[r[2]], ebene: EBENEN[ACHSEN_EBENE[r[2]]] };
  if (r.startsWith("E:")) { const [a, b] = r.slice(2).split(";").map(zahl3); return { p: a, d: [b[0] - a[0], b[1] - a[1], b[2] - a[2]], ebene: Math.abs(b[2] - a[2]) > 0.9 * Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]) ? EBENEN.XZ : EBENEN.XY }; }
  const [, sid, ei, ki] = r.split(":"), [sk, el] = skizzeElement(sid, ei), k = elementKanten(el)[+ki];
  if (!k) throw new Error("Kante in der Skizze fehlt");
  const a = welt(sk, k[0]), b = welt(sk, k[1]);
  return { p: a, d: [b[0] - a[0], b[1] - a[1], b[2] - a[2]], ebene: E_(sk.ebene) };
}
function bezugPunkt(r) {
  if (!r) throw new Error("Punkt wählen");
  if (r === "O") return [0, 0, 0];
  if (r.startsWith("Q:")) { const q = finde(r.slice(2))?._punkt; if (!q) throw new Error("Konstruktionspunkt fehlt"); return q; }
  if (r.startsWith("V:")) return zahl3(r.slice(2));
  const [, sid, ei, pi] = r.split(":"), [sk, el] = skizzeElement(sid, ei), q = elementPunkte(el)[+pi];
  if (!q) throw new Error("Punkt in der Skizze fehlt");
  return welt(sk, q);
}
function bezugZylinder(r) {
  if (!r?.startsWith("Z:")) throw new Error("Zylindrische Fläche wählen (Extrusion eines Kreises)");
  const [, xid, ki] = r.split(":"), x = finde(xid), sk = x && finde(x.skizze);
  const kreis = sk?.elemente.filter((el) => el.art === "kreis")[+ki];
  if (!kreis || !ebene(sk.ebene)) throw new Error("Zylinder fehlt");
  const e = E_(sk.ebene);
  return { p: zuWelt(e, kreis.c), d: e.n, r: kreis.r, ref: e.u };
}
function bezugPfad(r) {
  if (!r) throw new Error("Pfad wählen");
  if (r.startsWith("E:")) return r.slice(2).split(";").map(zahl3);
  const [, sid, ei] = r.split(":"), [sk, el] = skizzeElement(sid, ei);
  return elementPfad(el).map((q) => welt(sk, q));
}
function baueEbene(f) {
  switch (f.art) {
    case "versatz": return versetzt(bezugEbene(f.ref), f.abstand || 0);
    case "winkel": { const k = bezugKante(f.achse); return unterWinkel(f.ref ? bezugEbene(f.ref) : k.ebene, k, f.winkel || 0); }
    case "mitte": return mittelebene(bezugEbene(f.ref), bezugEbene(f.ref2));
    case "kanten": return zweiKanten(bezugKante(f.kante1), bezugKante(f.kante2));
    case "punkte": return dreiPunkte(bezugPunkt(f.p1), bezugPunkt(f.p2), bezugPunkt(f.p3));
    case "tangente": { const z = bezugZylinder(f.zylinder); return tangential(z, f.winkel || 0, z.ref); }
    case "pfad": return entlangPfad(bezugPfad(f.pfad), f.anteil ?? 0.5);
    case "flaeche": return bezugEbene(f.flaeche);
  }
  throw new Error("Unbekannte Ebenenart");
}

// Auswahllisten für die Dialoge, nur aus Elementen vor dem bearbeiteten Feature (keine Kreisbezüge)
const vorher = (f) => { const i = f ? doc.features.indexOf(f) : -1; return doc.features.slice(0, i < 0 ? doc.features.length : i); };
const SCHNAPP = { F: "Gewählte Körperfläche", E: "Gewählte Körperkante", V: "Gewählter Körperpunkt" };
const mitWert = (liste, wert) => (wert && !liste.some(([w]) => w === wert) ? [...liste, [wert, SCHNAPP[wert[0]] || wert]] : liste);
const ebenenOpt = (f, wert) => mitWert([...Object.entries(EBENEN).map(([k, e]) => [k, e.name]), ...vorher(f).filter((x) => x.typ === "ebene" && x !== f).map((x) => [x.id, x.name])], wert);
function kantenListe(f) {
  const l = [["A:X", "X-Achse"], ["A:Y", "Y-Achse"], ["A:Z", "Z-Achse"], ...vorher(f).filter((x) => x.typ === "achse" && x._achse && x !== f).map((x) => [`X:${x.id}`, x.name])];
  for (const sk of vorher(f).filter((x) => x.typ === "skizze"))
    sk.elemente.forEach((el, ei) => elementKanten(el).forEach((_, ki, alle) => l.push([`K:${sk.id}:${ei}:${ki}`, `${sk.name} · ${ELEMENTNAME[el.art]} ${ei + 1}${alle.length > 1 ? ` · Kante ${ki + 1}` : ""}`])));
  return l;
}
function punkteListe(f) {
  const l = [["O", "Ursprung"], ...vorher(f).filter((x) => x.typ === "konpunkt" && x._punkt && x !== f).map((x) => [`Q:${x.id}`, x.name])];
  for (const sk of vorher(f).filter((x) => x.typ === "skizze"))
    sk.elemente.forEach((el, ei) => elementPunkte(el).forEach((_, pi, alle) => l.push([`P:${sk.id}:${ei}:${pi}`, `${sk.name} · ${el.art === "kreis" ? "Kreismitte" : ELEMENTNAME[el.art]} ${ei + 1}${alle.length > 1 ? ` · Punkt ${pi + 1}` : ""}`])));
  return l;
}
function zylinderListe(f) {
  const l = [];
  for (const x of vorher(f).filter((x) => x.typ === "extrusion")) {
    const kreise = finde(x.skizze)?.elemente.filter((el) => el.art === "kreis") || [];
    kreise.forEach((k, i) => l.push([`Z:${x.id}:${i}`, `${x.name} · Kreis Ø ${f1(k.r * 2)}`]));
  }
  return l;
}
const pfadListe = (f) => vorher(f).filter((x) => x.typ === "skizze").flatMap((sk) => sk.elemente.map((el, ei) => elementPfad(el).length > 1 ? [`L:${sk.id}:${ei}`, `${sk.name} · ${ELEMENTNAME[el.art]} ${ei + 1}`] : null).filter(Boolean));

// ------------------------------------------------------------ Auswahl im 3D-Raum (Bezüge in Dialogen, Skizzierebene)
const aufSchirm = (p) => { const v = V(p).project(kamera), r = leinwand.getBoundingClientRect(); return [(v.x + 1) / 2 * r.width, (1 - v.y) / 2 * r.height, v.z]; };
const abstandStrecke = (s, a, b) => { const dx = b[0] - a[0], dy = b[1] - a[1], l2 = dx * dx + dy * dy || 1, t = Math.max(0, Math.min(1, ((s[0] - a[0]) * dx + (s[1] - a[1]) * dy) / l2)); return Math.hypot(s[0] - a[0] - t * dx, s[1] - a[1] - t * dy); };
function koerperKanten() { // Kanten aller sichtbaren Körper in Weltkoordinaten
  const l = [];
  for (const m of modell.children.filter((o) => o.isMesh)) {
    const pos = m.children[0]?.geometry.attributes.position; if (!pos) continue;
    for (let i = 0; i < pos.count; i += 2) l.push([[pos.getX(i), pos.getY(i), pos.getZ(i)], [pos.getX(i + 1), pos.getY(i + 1), pos.getZ(i + 1)]]);
  }
  return l;
}
function waehleImRaum(art, e, f, feld) {
  const sm = smPos(e);
  strahl.setFromCamera(ndc(e), kamera);
  if (art === "flaechen") { // Teilfläche einer Skizze (Regionen, auch Überlappungen und Inseln): innen anklicken
    const erlaubt = new Set((feld?.optionen || []).map(([w]) => String(w)));
    let best = null, tiefe = Infinity;
    for (const sk of doc.features.filter((x) => x.typ === "skizze" && erlaubt.has(x.id) && !x._aus && !x.versteckt)) {
      const t = strahl.ray.intersectPlane(ebenenEbene(sk.ebene), new THREE.Vector3()); if (!t) continue;
      const d = t.distanceTo(strahl.ray.origin), uv = aufEbene(sk.ebene, t);
      const r = skizzenRegionen(sk).find((x) => inRegion(x, uv));
      if (r && d < tiefe) { tiefe = d; best = [sk.id, `${sk.name} · Fläche ${f1(r.flaeche)} mm²`, { _flaechen: r.innen }]; }
    }
    return best;
  }
  if (art === "koerper" || art === "dach") { // Körper bzw. Dach direkt in der Ansicht anklicken
    const erlaubt = new Set((feld?.optionen || []).map(([w]) => String(w)));
    const t = strahl.intersectObjects(modell.children.filter((o) => o.isMesh && o.visible), false)[0], id = t && hauptVon(t.object.userData.fid)?.id;
    return id && erlaubt.has(id) && (art === "koerper" || finde(id)?.typ === "dach") ? [id, finde(id)?.name || id] : null;
  }
  if (art === "dachflaeche") { // Dachfläche anklicken: wählt die Fläche und setzt die Lage des Fensters/Kamins/der Lukarne an die angeklickte Stelle
    const t = strahl.intersectObjects(modell.children.filter((o) => o.isMesh && o.visible), false).find((h) => hauptVon(h.object.userData.fid)?.typ === "dach"), d = t && hauptVon(t.object.userData.fid), g = d && finde(d.gebaeude); if (!d?._dach || !g) return null;
    const p = dachKoordinaten(t.point.toArray(), g), oben = d._schichten?.oben ?? 0; let best = null, bd = Infinity;
    d._dach.flaechen.forEach((fl, i) => { const R = dachRahmen(fl), S = R.S, rel = p.map((x, k) => x - S.o[k]), dot = (a) => a.reduce((s2, x, k) => s2 + x * rel[k], 0), s = dot(S.q), tt = dot(S.up), dn = Math.abs(dot(S.n) - oben);
      if (s >= R.s0 - 1 && s <= R.s1 + 1 && tt >= R.t0 - 1 && tt <= R.t1 + 1 && dn < bd && dn < 600) { bd = dn; best = { i, s: s - R.s0, t: tt - R.t0, fl }; } });
    if (!best) return null;
    const h = +$("d_h")?.value || 0, y = f?.typ === "dachelement" ? best.t - h / 2 : best.t;
    return [String(best.i), `Fläche ${best.i + 1}: ${best.fl.neigung.toFixed(0)}°, ${best.fl.flaeche.toFixed(1)} m²`, { x: Math.round(best.s), y: Math.max(0, Math.round(y)), dach: d.id }];
  }
  if (art === "profil" || art === "kette") {
    // Skizzenprofil (Fläche innen anklicken oder Linie) bzw. offener Linienzug – wie in Fusion
    const erlaubt = new Set((feld?.optionen || []).map(([w]) => String(w)));
    let best = null, bd = 12, tiefe = Infinity;
    for (const sk of doc.features.filter((x) => x.typ === "skizze" && erlaubt.has(x.id) && !x._aus)) {
      const linie = (pts, zu, geschlossen, w) => { for (let i = 0; i < pts.length - (geschlossen ? 0 : 1); i++) {
        const A = aufSchirm(zu3D(sk.ebene, pts[i]).toArray()), B = aufSchirm(zu3D(sk.ebene, pts[(i + 1) % pts.length]).toArray());
        if (A[2] < 1 && B[2] < 1) { const d = abstandStrecke(sm, A, B); if (d < bd) { bd = d; best = w; tiefe = -1; } } } };
      if (art === "kette") { ketten(sk).forEach((k, i) => linie(k.pts, null, false, [sk.id, `${sk.name} · Linienzug ${i + 1}`, { kette: i }])); continue; }
      const ls = schleifen(sk);
      ls.forEach((l, i) => linie(l, null, true, [sk.id, `${sk.name} · Profil ${i + 1}`, { profil: i }]));
      if (best && tiefe < 0) continue;
      const t = strahl.ray.intersectPlane(ebenenEbene(sk.ebene), new THREE.Vector3()); if (!t) continue;
      const d = t.distanceTo(strahl.ray.origin), uv = aufEbene(sk.ebene, t);
      const treffer = ls.map((l, i) => ({ i, a: Math.abs(flaeche(l)) })).filter(({ i }) => innen(uv, ls[i])).sort((x, y) => x.a - y.a)[0];
      if (treffer && d < tiefe - 1e-6) { tiefe = d; best = [sk.id, `${sk.name} · Profil ${treffer.i + 1}`, { profil: treffer.i }]; }
    }
    return best;
  }
  const koerper_ = strahl.intersectObjects(modell.children.filter((o) => o.isMesh), false)[0];
  if (art === "ebene") {
    const ziele = [...modell.children.filter((o) => o.userData.ebene && o.userData.ebene !== f?.id && vorher(f).some((x) => x.id === o.userData.ebene)), ...(grundebenen.visible ? grundebenen.children : [])];
    const t = strahl.intersectObjects(ziele, true).find((x) => x.object.isMesh);
    if (koerper_ && (!t || koerper_.distance < t.distance)) {
      const n = koerper_.face.normal.clone().transformDirection(koerper_.object.matrixWorld);
      return [`F:${fmt3(koerper_.point.toArray())};${fmt3(n.toArray())}`, `Fläche von ${finde(koerper_.object.userData.fid)?.name ?? "Körper"}`];
    }
    return t ? [t.object.userData.ebene, ebenenName(t.object.userData.ebene)] : null;
  }
  if (art === "zylinder") {
    if (!koerper_) return null;
    const x = finde(koerper_.object.userData.fid);
    const treffer = zylinderListe(f).filter(([w]) => w.startsWith(`Z:${x?.id}:`)).map(([w, l]) => {
      const z = bezugZylinder(w), d = V(z.d).normalize(), q = koerper_.point.clone().sub(V(z.p));
      const radial = q.sub(d.clone().multiplyScalar(q.dot(d))), ref = V(z.ref);
      const winkel = (Math.atan2(radial.dot(d.clone().cross(ref)), radial.dot(ref)) * 180) / Math.PI; // wie tangential() misst
      return [w, l, Math.abs(radial.length() - z.r), { winkel: +winkel.toFixed(2) }];
    }).sort((a, b) => a[2] - b[2])[0];
    return treffer && treffer[2] < 1 ? [treffer[0], treffer[1], treffer[3]] : null; // Treffer liegt auf dem Zylindermantel (±1 mm)
  }
  // Kante, Punkt, Pfad: was auf dem Bildschirm am nächsten liegt (bis 12 px)
  let best = null, bd = 12;
  const nimm = (d, w) => { if (d < bd) { bd = d; best = w; } };
  const strecke = (a, b, w, malus = 0) => { const A = aufSchirm(a), B = aufSchirm(b); if (A[2] < 1 && B[2] < 1) nimm(abstandStrecke(sm, A, B) + malus, w); };
  if (art === "kante") {
    for (const [w, l] of kantenListe(f)) {
      if (w.startsWith("A:")) { const d = ACHSEN[w[2]].d; strecke(d.map((x) => -x * 5000), d.map((x) => x * 5000), [w, l], 4); continue; } // Achsen nachrangig
      const k = bezugKante(w); strecke(k.p, k.p.map((x, i) => x + k.d[i]), [w, l]);
    }
    for (const [a, b] of koerperKanten()) strecke(a, b, [`E:${fmt3(a)};${fmt3(b)}`, "Körperkante"]);
  } else if (art === "drehachse") { // Drehachse der Profilskizze: Skizzenlinien (auch Hilfslinien) und die Skizzenachsen U/V anklicken
    const sk = finde(f?.skizze); if (sk) {
      for (const [w, l] of achsenOpt(sk)) { const [a, d] = drehAchse(sk, w); if (!a) continue; const ax = w === "U" || w === "V", p0 = zu3D(sk.ebene, ax ? [a[0] - d[0] * 5000, a[1] - d[1] * 5000] : a).toArray(), p1 = zu3D(sk.ebene, ax ? [a[0] + d[0] * 5000, a[1] + d[1] * 5000] : [a[0] + d[0], a[1] + d[1]]).toArray(); strecke(p0, p1, [w, l], ax ? 4 : 0); }
    }
  } else if (art === "pfad") {
    for (const [w, l] of pfadListe(f)) { const pts = bezugPfad(w); for (let i = 0; i < pts.length - 1; i++) strecke(pts[i], pts[i + 1], [w, l]); }
    for (const [a, b] of koerperKanten()) strecke(a, b, [`E:${fmt3(a)};${fmt3(b)}`, "Körperkante"]);
  } else if (art === "punkt") {
    const kandidat = (p, w) => { const S = aufSchirm(p); if (S[2] < 1) nimm(Math.hypot(S[0] - sm[0], S[1] - sm[1]), w); };
    for (const [w, l] of punkteListe(f)) kandidat(bezugPunkt(w), [w, l]);
    for (const [a, b] of koerperKanten()) for (const q of [a, b]) kandidat(q, [`V:${fmt3(q)}`, "Körperpunkt"]);
  }
  return best;
}
// Aktives Wahlfeld; wahlNr = -1: erst aktiv, wenn man das Feld antippt (Dialoge, in denen die Ebene Nebensache ist)
const aktiveWahl = () => { const pf = dlg?.felder.filter((fd) => fd.wahl); return pf?.length && dlg.wahlNr !== -1 ? pf[Math.min(dlg.wahlNr ?? 0, pf.length - 1)] : null; };
function zeigeWahl() {
  const a = aktiveWahl();
  document.querySelectorAll("#dInhalt .feld[data-wahl]").forEach((el) => el.classList.toggle("waehlt", el.dataset.feld === a?.id));
  grundebenen.visible = a?.wahl === "ebene"; zeichneGewaehlt();
  if (a) status({ ebene: "Ebene, Konstruktionsebene oder ebene Körperfläche in der Ansicht anklicken – oder in der Liste wählen.", kante: "Kante anklicken: Skizzenlinie, Körperkante oder Achse.", drehachse: "Drehachse anklicken: Linie oder Hilfslinie der Skizze, oder die waagrechte/senkrechte Skizzenachse.",
    punkt: "Punkt anklicken: Skizzenpunkt, Körperecke oder Ursprung.", zylinder: "Zylindrische Fläche anklicken (extrudierter Kreis).", pfad: "Linie, Kreis oder Körperkante als Pfad anklicken.",
    profil: "Skizzenprofil anklicken – in die geschlossene Fläche oder auf ihre Linie.", flaechen: "Fläche(n) in der Skizze anklicken (jede Teilfläche einzeln, nochmals anklicken = abwählen).", kette: "Offenen Linienzug einer Skizze anklicken.", koerper: "Körper in der Ansicht anklicken.", dach: "Dach in der Ansicht anklicken.", dachflaeche: "Dachfläche anklicken – dort sitzt das Element (Lage wird übernommen)." }[a.wahl] + ` (Feld «${a.label}»)`);
}
// Vorschau beim Überfahren: was angeklickt würde, leuchtet blau auf (Fläche, Ebene, Kante, Punkt, Profil) – wie in Fusion
const hoverGruppe = new THREE.Group(); szene.add(hoverGruppe);
const HOVERFARBE = 0x59b0ff, hoverMat = () => new THREE.MeshBasicMaterial({ color: HOVERFARBE, transparent: true, opacity: 0.5, side: THREE.DoubleSide, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
const hoverCache = new WeakMap(); // Geometrie → Dreiecke je Eckpunkt (für zusammenhängende ebene Flächen)
function flaechenRegion(hit) { // alle zusammenhängenden Dreiecke der Fläche unter dem Zeiger (Weltkoordinaten): ebene Fläche oder gebogene Fläche (Biegung eines Blechs)
  const m = hit.object, geo = m.geometry, pos = geo.attributes.position, idx = geo.index, n = (idx ? idx.count : pos.count) / 3;
  const vi = (t, k) => (idx ? idx.getX(t * 3 + k) : t * 3 + k), P = (t, k) => new THREE.Vector3().fromBufferAttribute(pos, vi(t, k)).applyMatrix4(m.matrixWorld);
  let adj = hoverCache.get(geo);
  if (!adj) { adj = new Map(); const key = (t, k) => { const v = new THREE.Vector3().fromBufferAttribute(pos, vi(t, k)); return `${Math.round(v.x * 100)},${Math.round(v.y * 100)},${Math.round(v.z * 100)}`; };
    for (let t = 0; t < n; t++) for (let k = 0; k < 3; k++) { const s = key(t, k); if (!adj.has(s)) adj.set(s, []); adj.get(s).push(t); }
    adj.key = key; hoverCache.set(geo, adj); }
  const nrm = (t) => new THREE.Triangle(P(t, 0), P(t, 1), P(t, 2)).getNormal(new THREE.Vector3());
  const ebeneVon = (tri) => { // koplanare, zusammenhängende Dreiecke
    const n0 = nrm(tri), d0 = n0.dot(P(tri, 0)), gleich = (t) => { const nn = nrm(t); return nn.dot(n0) > 0.9995 && Math.abs(nn.dot(P(t, 0)) - d0) < 0.02; };
    const gesehen = new Set([tri]), warte = [tri];
    while (warte.length) { const t = warte.pop(); for (let k = 0; k < 3; k++) for (const u of adj.get(adj.key(t, k)) || []) if (!gesehen.has(u) && gleich(u)) { gesehen.add(u); warte.push(u); } }
    return gesehen;
  };
  const streifen = (c) => { // schmaler, langer Streifen = Teil einer gebogenen Fläche
    let A = 0, rand = new Map(); for (const t of c) { A += new THREE.Triangle(P(t, 0), P(t, 1), P(t, 2)).getArea(); for (let k = 0; k < 3; k++) { const a = adj.key(t, k), b = adj.key(t, (k + 1) % 3), e = a < b ? a + "|" + b : b + "|" + a; rand.set(e, (rand.get(e) || 0) + 1); } }
    let per = 0, lang = 0; for (const t of c) for (let k = 0; k < 3; k++) { const a = adj.key(t, k), b = adj.key(t, (k + 1) % 3), e = a < b ? a + "|" + b : b + "|" + a; if (rand.get(e) === 1) { const l = P(t, k).distanceTo(P(t, (k + 1) % 3)); per += l; lang = Math.max(lang, l); } }
    return per > 0 && (2 * A) / per < 0.04 * lang;
  };
  let alle = ebeneVon(hit.faceIndex);
  if (streifen(alle) && alle.size <= 8) { // gebogen: benachbarte Streifen mit leicht abweichender Normale gehören zur selben Fläche
    const zu = new Set(alle), warte = [alle]; let rund = 0;
    while (warte.length && rund++ < 400) {
      const c = warte.pop();
      for (const t of c) for (let k = 0; k < 3; k++) { const a = adj.key(t, k), b = adj.key(t, (k + 1) % 3); for (const u of adj.get(a) || []) if (!zu.has(u) && (adj.get(b) || []).includes(u) && nrm(u).dot(nrm(t)) > 0.906) { const c2 = ebeneVon(u); if (streifen(c2) && c2.size <= 8) { for (const x of c2) zu.add(x); warte.push(c2); } } }
    }
    alle = zu;
  }
  const out = []; for (const t of alle) { const nt = nrm(t); for (let k = 0; k < 3; k++) out.push(P(t, k).addScaledVector(nt, 0.04)); }
  return new THREE.BufferGeometry().setFromPoints(out);
}
const waehlGruppe = new THREE.Group(); szene.add(waehlGruppe);
function regionMesh(sk, r, farbe, deckkraft) {
  const sh = new THREE.Shape(r.aussen.map(([u, v]) => new THREE.Vector2(u, v)));
  for (const h of r.loecher) sh.holes.push(new THREE.Path(h.map(([u, v]) => new THREE.Vector2(u, v))));
  const g = new THREE.ShapeGeometry(sh); g.applyMatrix4(basis(sk.ebene));
  const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color: farbe, transparent: true, opacity: deckkraft, side: THREE.DoubleSide, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 }));
  m.renderOrder = 18; return m;
}
function zeichneGewaehlt() { // bereits gewählte Skizzenflächen des Dialog-Features bleiben blau eingefärbt
  leeren(waehlGruppe); zeichneAchse();
  const f = dlg?.feature, sk = f && finde(f.skizze); if (!sk || !Array.isArray(f.flaechen)) return;
  for (const r of gewaehlteRegionen(f, sk) || []) waehlGruppe.add(regionMesh(sk, r, 0x2f7dd1, 0.55));
}
function zeichneAchse() { // gewählte Drehachse bleibt als kräftige blaue Linie sichtbar
  const f = dlg?.feature; if (f?.typ !== "drehung" || !f.achse) return; const sk = finde(f.skizze), [p, d] = sk ? drehAchse(sk, f.achse) : [null]; if (!p) return;
  const ax = f.achse === "U" || f.achse === "V", pts = ax ? [zu3D(sk.ebene, [p[0] - d[0] * 5000, p[1] - d[1] * 5000]), zu3D(sk.ebene, [p[0] + d[0] * 5000, p[1] + d[1] * 5000])] : [zu3D(sk.ebene, p), zu3D(sk.ebene, [p[0] + d[0], p[1] + d[1]])];
  waehlGruppe.add(dickeLinie(pts, 0x2f7dd1, 3, 21));
}
let hoverWartet = false;
function hoverWahl(e) {
  if (hoverWartet) return; hoverWartet = true;
  requestAnimationFrame(() => { hoverWartet = false; hoverZeichnen(e); });
}
function hoverLoeschen() { leeren(hoverGruppe); fangZeigen(null); if (!dlg) leeren(waehlGruppe); }
function hoverZeichnen(e) {
  const a = aktiveWahl(); if (!a || skizze) return hoverLoeschen();
  leeren(hoverGruppe); const sm = smPos(e);
  let w = null; try { w = waehleImRaum(a.wahl, e, dlg.feature, a); } catch { w = null; }
  if (!w) return fangZeigen(null);
  const ref = String(w[0]), linie = (pts) => { const l = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: HOVERFARBE, depthTest: false, linewidth: 2 })); l.renderOrder = 20; hoverGruppe.add(l); };
  try {
    if (a.wahl === "flaechen") { const sk = finde(w[0]), r = sk && skizzenRegionen(sk).find((x) => inRegion(x, w[2]._flaechen)); if (r) hoverGruppe.add(regionMesh(sk, r, HOVERFARBE, 0.55)); }
    else if (ref.startsWith("F:")) { // Körperfläche: die ganze ebene Fläche aufleuchten lassen
      strahl.setFromCamera(ndc(e), kamera);
      const hit = strahl.intersectObjects(modell.children.filter((o) => o.isMesh), false)[0];
      if (hit) { const g = flaechenRegion(hit), mesh = new THREE.Mesh(g, hoverMat()); mesh.renderOrder = 19; hoverGruppe.add(mesh); const rand = new THREE.LineSegments(new THREE.EdgesGeometry(g, 5), new THREE.LineBasicMaterial({ color: HOVERFARBE, depthTest: false })); rand.renderOrder = 20; hoverGruppe.add(rand); }
    } else if (a.wahl === "ebene") { // Konstruktionsebene oder Grundebene
      const ziele = [...modell.children.filter((o) => o.userData.ebene === ref), ...(grundebenen.visible ? grundebenen.children : [])];
      strahl.setFromCamera(ndc(e), kamera);
      const t = strahl.intersectObjects(ziele, true).find((x) => x.object.isMesh);
      if (t) { const m = new THREE.Mesh(t.object.geometry, hoverMat()); m.matrixAutoUpdate = false; t.object.updateWorldMatrix(true, false); m.matrix.copy(t.object.matrixWorld); m.renderOrder = 19; hoverGruppe.add(m); }
    } else if (a.wahl === "drehachse") { const sk = finde(dlg.feature.skizze), [p, d] = sk ? drehAchse(sk, ref) : [null]; if (p) { const ax = ref === "U" || ref === "V"; linie(ax ? [zu3D(sk.ebene, [p[0] - d[0] * 5000, p[1] - d[1] * 5000]), zu3D(sk.ebene, [p[0] + d[0] * 5000, p[1] + d[1] * 5000])] : [zu3D(sk.ebene, p), zu3D(sk.ebene, [p[0] + d[0], p[1] + d[1]])]); }
    } else if (a.wahl === "kante" || a.wahl === "pfad") {
      const k = bezugKante(ref); const d = ref.startsWith("A:") || ref.startsWith("X:") ? k.d.map((x) => x * 5000 / (Math.hypot(...k.d) || 1)) : k.d;
      linie(ref.startsWith("A:") || ref.startsWith("X:") ? [V(k.p).sub(V(d)), V(k.p).add(V(d))] : [V(k.p), V(k.p).add(V(k.d))]);
    } else if (a.wahl === "punkt") { const q = bezugPunkt(ref), S = aufSchirm(q); return fangZeigen({ art: "wahl", s: [S[0], S[1]], text: w[1] }); }
    else if (a.wahl === "profil" || a.wahl === "kette") { const sk = finde(w[0]), i = w[2]?.profil ?? w[2]?.kette; const pts = a.wahl === "profil" ? schleifen(sk)[i] : ketten(sk)[i]?.pts; if (pts) { const l = pts.map((p) => zu3D(sk.ebene, p)); if (a.wahl === "profil") l.push(l[0]); linie(l); } }
  } catch { /* Vorschau ist nur Zugabe */ }
  fangZeigen({ art: "wahl", s: sm, text: w[1] });
}
function uebernimmWahl(e) {
  const a = aktiveWahl(); if (!a) return false;
  let w = null;
  try { w = waehleImRaum(a.wahl, e, dlg.feature, a); } catch { w = null; }
  if (!w) { status("Hier ist nichts Passendes – " + ({ flaechen: "eine geschlossene Fläche einer Skizze (innen anklicken)", profil: "ein geschlossenes Skizzenprofil (innen) oder seine Linie", kette: "einen offenen Linienzug einer Skizze", ebene: "eine Ebene oder Fläche", kante: "eine Kante", drehachse: "eine Linie der Profilskizze oder die Skizzenachse", punkt: "einen Punkt", zylinder: "eine Zylinderfläche", pfad: "eine Linie", koerper: "einen Körper", dach: "ein Dach", dachflaeche: "eine Dachfläche des gewählten Dachs" }[a.wahl]) + " anklicken."); return true; }
  if (a.wahl === "flaechen") { // Teilfläche wählen / abwählen (Mehrfachwahl, Klick auf gewählte Fläche hebt sie auf)
    const f = dlg.feature, sel = $("d_" + a.id), p = w[2]._flaechen;
    if (sel.value !== w[0]) { sel.value = w[0]; sel.dispatchEvent(new Event("change")); f.flaechen = []; }
    const sk = finde(w[0]), alle = skizzenRegionen(sk), neu = alle.find((x) => inRegion(x, p));
    const liste = Array.isArray(f.flaechen) ? f.flaechen.slice() : [], i = liste.findIndex((q) => neu && inRegion(neu, q));
    if (i >= 0) liste.splice(i, 1); else liste.push(p);
    f.flaechen = liste; dlg.aendern?.(werte(), "skizze"); zeichneGewaehlt(); hoverLoeschen();
    status(liste.length ? `${liste.length} Fläche${liste.length === 1 ? "" : "n"} gewählt – weitere anklicken, nochmals anklicken = abwählen, dann OK.` : "Keine Fläche gewählt.");
    return true;
  }
  const sel = $("d_" + a.id);
  if (![...sel.options].some((o) => o.value === w[0])) sel.add(new Option(w[1], w[0]));
  sel.value = w[0];
  for (const [k, v] of Object.entries(w[2] || {})) if ($("d_" + k)) $("d_" + k).value = v; // z. B. Winkel der angeklickten Stelle
  sel.dispatchEvent(new Event("change"));
  // Nach einem Wechsel der Skizze baut sich der Dialog neu auf: Zusatzwerte (Linienzug, Fläche) nochmals setzen
  for (const [k, v] of Object.entries(w[2] || {})) { const el = $("d_" + k); if (el && el.value !== String(v) && [...(el.options || [])].some((o) => o.value === String(v))) { el.value = v; el.dispatchEvent(new Event("change")); } }
  if (dlg?.sofort) { $("dOk").click(); return true; }
  const pf = dlg.felder.filter((fd) => fd.wahl), i = pf.indexOf(a);
  if (i < pf.length - 1) dlg.wahlNr = i + 1; // wie in Fusion: weiter zum nächsten Bezug
  zeigeWahl();
  if (a.wahl === "profil" || a.wahl === "kette") status(`Gewählt: ${w[1]} – OK oder weitere Werte eingeben.`);
  return true;
}

// ------------------------------------------------------------ Ziehpfeile (wie in Fusion): Masse im Dialog zusätzlich mit einem Pfeil in der Ansicht ziehen
const griffGruppe = new THREE.Group(); szene.add(griffGruppe);
let griffe = [], griffZug = null;
// Pfeile an beiden Enden einer Extrusion/Länge: plus = Ende in +Normalenrichtung. Einseitig: der ferne Pfeil ändert das Mass, der nahe zieht es durch Null (negatives Mass = Gegenrichtung)
function beidseitig(f, feld, feld2) {
  const farbe = 0x1d8fff, v = +f[feld] || 0, vz = v < 0 ? -1 : 1;
  if (f.richtung === "zwei") return [{ plus: true, feld, faktor: 1, min: 0.1, farbe }, { plus: false, feld: feld2, faktor: 1, min: 0.1, farbe }];
  if (f.richtung === "symmetrisch") return [{ plus: true, feld, faktor: 2, min: 0.1, farbe }, { plus: false, feld, faktor: 2, min: 0.1, farbe }];
  const d = f.richtung === "umgekehrt" ? -1 : 1, fern = d * vz; // Richtung des fernen Endes (+1 = Normale)
  return [{ plus: fern > 0, feld, faktor: vz, farbe }, { plus: fern < 0, feld, faktor: -vz, farbe, nah: true }]; // nah: Pfeil am Fuss (liegt auf der Profilfläche)
}
// Flansch/Umschlag (Flächenblech-Kante, Blechprofil A/B, Stirnlasche): Pfeile an der Spitze – Länge in beide Richtungen, Winkel tangential in beide Richtungen
function griffeKante(f) {
  const z = finde(f.ziel), wk = f.wert?.werkzeug; if (!z || !wk || typeof wk !== "object") return [];
  const laenge = Math.max(1, +wk.laenge || 10), s = wk.seite === -1 ? -1 : 1, l = [];
  const mk = (tip, dir, tan, radius) => {
    l.push({ feld: "laenge", pos: tip, dir, faktor: 1, min: 0.5, farbe: 0x1d8fff }, { feld: "laenge", pos: tip.clone(), dir: dir.clone().negate(), faktor: -1, min: 0.5, farbe: 0x1d8fff });
    if (wk.typ === "flansch") { const k = 180 / Math.PI / Math.max(4, radius); const bogen = { c: tip.clone().addScaledVector(dir, -radius), R: radius, versetzt: true }; l.push({ feld: "winkel", pos: tip.clone(), dir: tan.clone().multiplyScalar(s), faktor: k, min: -170, max: 170, farbe: 0x2f7dd1, bogen, erst: true }, { feld: "winkel", pos: tip.clone(), dir: tan.clone().multiplyScalar(-s), faktor: -k, min: -170, max: 170, farbe: 0x2f7dd1, bogen }); }
  };
  if (z.typ === "flaeche") {
    const [pi, k] = String(f.key).split(":").map(Number), bl = z._bleche?.find((b) => b.pi === pi), g = bl?.gruppen[k], pr = bl?.profile[k]; if (!g?.gerade || !pr?.res) return [];
    const a = g.punkte[0], b = g.punkte.at(-1), L = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1, d = [(b[0] - a[0]) / L, (b[1] - a[1]) / L], no = [d[1], -d[0]], mid = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
    const pp = profilPunkt(pr, pr.zugabe * 0.999); if (!pp) return [];
    const sicht = z.sichtseite === -1 ? -1 : 1, B = basis(blechEbene(finde(z.skizze).ebene, z, material(z.material))), LM = lageVon(z);
    const pos = new THREE.Vector3(mid[0] + no[0] * pp.x, mid[1] + no[1] * pp.x, sicht * pp.y).applyMatrix4(B), W = (v) => new THREE.Vector3(...v).transformDirection(B);
    if (LM) pos.applyMatrix4(LM);
    mk(pos, W([Math.cos(pp.th) * no[0], Math.cos(pp.th) * no[1], sicht * Math.sin(pp.th)]), W([-Math.sin(pp.th) * no[0], -Math.sin(pp.th) * no[1], sicht * Math.cos(pp.th)]), laenge);
    if (f.teil) { // Teilstück: zwei Pfeile an der Kante begrenzen den Bereich (ziehen = verschieben)
      const tp = (u) => { const q = new THREE.Vector3(a[0] + d[0] * u, a[1] + d[1] * u, 0).applyMatrix4(B); if (LM) q.applyMatrix4(LM); return q; }, dd = W([d[0], d[1], 0]);
      l.push({ feld: "teilVon", pos: tp(f.teil.von), dir: dd.clone(), faktor: 1, min: 0, max: L, farbe: 0xff8a00 }, { feld: "teilBis", pos: tp(f.teil.bis), dir: dd.clone().negate(), faktor: -1, min: 0, max: L, farbe: 0xff8a00 });
    }
    return l;
  }
  const kl = z._kernLage, res = z._res; if (!kl || !res?.pfad?.length || z.versteckt) return [];
  const zw = zweiseitig(z, "laenge", "laenge2"), rueck = rueckVersatz(zw.richtung, zw.tiefe), zm = (-rueck + zw.tiefe - rueck) / 2, M = basis(kl.ebene), vz = kl.versatz;
  const Pt = (p, zz) => new THREE.Vector3(p[0] + vz[0], p[1] + vz[1], zz).applyMatrix4(M), Dv = (x, y, zz) => new THREE.Vector3(x, y, zz).transformDirection(M);
  if (f.ende === "A" || f.ende === "B") {
    const el = f.ende === "B" ? res.pfad.at(-1) : res.pfad[0]; if (el?.typ !== "linie") return [];
    const p = f.ende === "B" ? el.p2 : el.p1, q = f.ende === "B" ? el.p1 : el.p2, L = Math.hypot(p[0] - q[0], p[1] - q[1]) || 1, d = [(p[0] - q[0]) / L, (p[1] - q[1]) / L];
    mk(Pt(p, zm), Dv(d[0], d[1], 0), Dv(-d[1], d[0], 0), laenge); return l;
  }
  const la = (z._stirn || []).find((x) => x.ende === f.ende && (!(f.schenkel > 0) || x.schenkel === f.schenkel)); if (!la) return [];
  const len = Math.hypot(la.p2[0] - la.p1[0], la.p2[1] - la.p1[1]) || 1, d = [(la.p2[0] - la.p1[0]) / len, (la.p2[1] - la.p1[1]) / len], lk = [-d[1], d[0]], sg = f.ende === "S1" ? -1 : 1, zE = f.ende === "S1" ? -rueck : zw.tiefe - rueck;
  let ang = 0, u = 0, v = 0, pos0 = 0; for (const b of [...la.biegungen].sort((a, c) => a.pos - c.pos)) { const sg2 = b.pos - pos0; u += sg2 * Math.cos(ang); v += sg2 * Math.sin(ang); pos0 = b.pos; ang += b.winkel * Math.PI / 180; }
  const rest = Math.max(0, la.laenge - pos0); u += rest * Math.cos(ang); v += rest * Math.sin(ang);
  const du = Math.cos(ang), dv = Math.sin(ang), mx = la.p1[0] + d[0] * len / 2 + lk[0] * v, my = la.p1[1] + d[1] * len / 2 + lk[1] * v;
  mk(Pt([mx, my], zE + sg * u), Dv(lk[0] * dv, lk[1] * dv, sg * du), Dv(lk[0] * du, lk[1] * du, -sg * dv), laenge);
  return l;
}
// Drehung: Pfeile am Ende des gedrehten Profils, tangential – Winkel in beide Richtungen ziehbar
function griffeDrehung(f) {
  const s = finde(f.skizze); if (!s || f.bis) return [];
  const loops = schleifen(s); if (!loops.length) return []; const [a, d] = drehAchse(s, f.achse); if (!a) return [];
  const p = loops.sort((x, y) => Math.abs(flaeche(y)) - Math.abs(flaeche(x)))[0], c = [p.reduce((q, r) => q + r[0], 0) / p.length, p.reduce((q, r) => q + r[1], 0) / p.length];
  const A = zu3D(s.ebene, a), ax = zu3D(s.ebene, [a[0] + d[0], a[1] + d[1]]).sub(A).normalize(), C = zu3D(s.ebene, c), rv = C.clone().sub(A); rv.addScaledVector(ax, -rv.dot(ax)); const R = rv.length(); if (R < 1e-6) return [];
  const th = (f.winkel ?? 360) * Math.PI / 180, r2 = rv.clone().applyAxisAngle(ax, th), pos = A.clone().add(C.clone().sub(A).projectOnVector(ax)).add(r2), tan = new THREE.Vector3().crossVectors(ax, r2).normalize(), k = 180 / Math.PI / R;
  const bogen = { c: pos.clone().sub(r2), R }; return [{ feld: "winkel", pos, dir: tan, faktor: k, min: 1, max: 360, farbe: 0x2f7dd1, bogen, erst: true }, { feld: "winkel", pos: pos.clone(), dir: tan.clone().negate(), faktor: -k, min: 1, max: 360, farbe: 0x2f7dd1, bogen }];
}
function griffeFuer(f) {
  if (f.bis && f.bis !== "mass" && (f.typ === "extrusion" || ["blech", "vorlage", "profil"].includes(f.typ))) return []; // Ausdehnung folgt der gewählten Fläche/Kante
  const l = [], mitte = (ms) => { const bb = new THREE.Box3(); ms.forEach((m) => bb.expandByObject(m)); return bb.isEmpty() ? null : bb; };
  if (f.typ === "extrusion") {
    const sk = finde(f.skizze); if (!sk) return l;
    const regs = gewaehlteRegionen(f, sk); let uv;
    if (regs) { if (!regs.length) return l; uv = regs[0].innen; }
    else { const p = schleifen(sk).sort((a, b) => Math.abs(flaeche(b)) - Math.abs(flaeche(a)))[0]; if (!p) return l; uv = [p.reduce((a, q) => a + q[0], 0) / p.length, p.reduce((a, q) => a + q[1], 0) / p.length]; }
    const E = E_(sk.ebene), n = V(E.n).normalize(), z = zweiseitig(f, "abstand", "abstand2"), r = rueckVersatz(z.richtung, z.tiefe), b0 = zu3D(sk.ebene, uv);
    for (const g of beidseitig(f, "abstand", "abstand2")) l.push({ ...g, pos: b0.clone().addScaledVector(n, g.plus ? z.tiefe - r : -r), dir: n.clone().multiplyScalar(g.plus ? 1 : -1) });
  } else if (["blech", "vorlage", "profil"].includes(f.typ) && f.laenge != 0) {
    const bb = mitte(modell.children.filter((o) => o.isMesh && o.userData.fid === f.id)); if (!bb) return l;
    const E = E_(f.ebene), n = V(E.n).normalize(), c = bb.getCenter(new THREE.Vector3());
    let eMax = -Infinity, eMin = Infinity; for (const x of [bb.min.x, bb.max.x]) for (const y of [bb.min.y, bb.max.y]) for (const z of [bb.min.z, bb.max.z]) { const e = new THREE.Vector3(x, y, z).sub(c).dot(n); eMax = Math.max(eMax, e); eMin = Math.min(eMin, e); }
    for (const g of beidseitig(f, "laenge", "laenge2")) l.push({ ...g, pos: c.clone().addScaledVector(n, g.plus ? eMax : eMin), dir: n.clone().multiplyScalar(g.plus ? 1 : -1) });
  } else if (f.typ === "bewegen" || f.typ === "kmuster") {
    const bb = mitte(modell.children.filter((o) => o.isMesh && (String(o.userData.fid) === f.ziel || String(o.userData.fid).startsWith(f.ziel + ":")))); if (!bb) return l;
    const c = bb.getCenter(new THREE.Vector3());
    if (f.typ === "kmuster") { // Abstand der Kopien entlang der Mustrichtung(en)
      if (f.art !== "kreis") for (const [feld, ref] of [["abstand", f.richtung1], ["abstand2", f.richtung2]]) { if (feld === "abstand2" && !(f.anzahl2 > 1)) continue; try { const k = bezugKante(ref), d = V(k.d).normalize(); l.push({ feld, pos: c.clone(), dir: d, faktor: 1, min: 0, farbe: 0x1d8fff }); } catch {} }
      return l;
    }
    [["dx", [1, 0, 0], 0xd23c3c], ["dy", [0, 1, 0], 0x3aa655], ["dz", [0, 0, 1], 0x2f7dd1]].forEach(([feld, d, farbe]) => l.push({ feld, pos: c.clone(), dir: V(d), faktor: 1, farbe }));
  } else if (f.typ === "schale" || f.typ === "kantenrund") { // Wanddicke bzw. Radius/Fase: Pfeil an der Aussenseite nach innen
    const bb = mitte(modell.children.filter((o) => o.isMesh && (o.userData.fid === f.ziel || String(o.userData.fid).startsWith(f.ziel + ":")))); if (!bb) return l;
    const c = bb.getCenter(new THREE.Vector3());
    if (f.typ === "schale") l.push({ feld: "dicke", pos: new THREE.Vector3(bb.max.x, c.y, c.z), dir: new THREE.Vector3(-1, 0, 0), faktor: 1, min: 0.1, farbe: 0x1d8fff });
    else l.push({ feld: "mass", pos: new THREE.Vector3(bb.max.x, bb.max.y, bb.max.z), dir: new THREE.Vector3(-1, -1, -1).normalize(), faktor: 1 / Math.sqrt(3) * 1.0, min: 0.1, farbe: 0x1d8fff });
  } else if (f.typ === "kanten3d") { // Radius/Fase der angeklickten Kanten: Pfeil in der Mitte der ersten Kante zum Körper hin
    const k = f.kanten?.[0]; if (!k) return l;
    const a = V(k.a), b = V(k.b), mid = a.clone().add(b).multiplyScalar(0.5), e = b.clone().sub(a).normalize();
    const bb = mitte(modell.children.filter((o) => o.isMesh && o.userData.fid === f.ziel)); if (!bb) return l;
    const zu = bb.getCenter(new THREE.Vector3()).sub(mid); zu.addScaledVector(e, -zu.dot(e)); if (zu.length() < 1e-6) return l;
    l.push({ feld: "mass", pos: mid, dir: zu.normalize(), faktor: 1, min: 0.1, farbe: 0x1d8fff });
  } else if (f.typ === "ebene" && f.art === "versatz" && f._ebene) {
    l.push({ feld: "abstand", pos: V(f._ebene.o), dir: V(f._ebene.n).normalize(), faktor: 1, farbe: 0x1d8fff });
  } else if (f.typ === "dachelement" || f.typ === "lukarne") { // Kamin, Dachfenster, Lukarne: Pfeile quer (links/rechts) und entlang der Fallinie (Traufe/First) auf der Dachfläche
    const r = f._rect || f._luk?.rect, d = finde(f.dach), g = finde(d?.gebaeude), fl = d?._dach?.flaechen?.[f.flaeche]; if (!r || !g || !fl) return l;
    const S = dachRahmen(fl).S, n = d._schichten?.oben ?? 0, sm = (r.s0 + r.s1) / 2, tm = (r.t0 + r.t1) / 2, P = (s, t) => V(dachWelt(g, S.punkt(s, t, n))), c = P(sm, tm);
    const ds = P(sm + 100, tm).sub(c).normalize(), dt = P(sm, tm + 100).sub(c).normalize();
    for (const [feld, dir, faktor, farbe] of [["x", ds, 1, 0xd23c3c], ["x", ds.clone().negate(), -1, 0xd23c3c], ["y", dt, 1, 0x3aa655], ["y", dt.clone().negate(), -1, 0x3aa655]]) l.push({ feld, pos: c.clone(), dir, faktor, farbe });
  } else if (f.typ === "kante" || f.typ === "profilkante") { return griffeKante(f);
  } else if (f.typ === "naht") { // Naht auf Teilstück: Pfeile an Kante A (Von/Bis in mm ab Kantenanfang)
    const t = f.a?.teil, ke = t ? nahtKante(f.a) : null, pk = ke?.punkte; if (!pk || pk.length < 2) return l;
    const P0 = pk[0], P1 = pk.at(-1), L = P0.distanceTo(P1), d = P1.clone().sub(P0).normalize(), at = (u) => P0.clone().addScaledVector(d, u);
    l.push({ feld: "nahtVon", pos: at(t.von), dir: d.clone(), faktor: 1, min: 0, max: L, farbe: 0xff8a00 }, { feld: "nahtBis", pos: at(t.bis), dir: d.clone().negate(), faktor: -1, min: 0, max: L, farbe: 0xff8a00 });
    return l;
  } else if (f.typ === "drehung") { return griffeDrehung(f);
  } else if (f.typ === "gebaeude") { // Breite/Tiefe/Wandhöhe: Pfeile an den Wänden, in beide Richtungen ziehbar
    const bb = mitte(modell.children.filter((o) => o.isMesh && o.userData.fid === f.id)); if (!bb) return l;
    const c = bb.getCenter(new THREE.Vector3());
    for (const [feld, pos, dir, farbe] of [["breite", new THREE.Vector3(bb.max.x, c.y, c.z), [1, 0, 0], 0xd23c3c], ["breite", new THREE.Vector3(bb.min.x, c.y, c.z), [-1, 0, 0], 0xd23c3c], ["tiefe", new THREE.Vector3(c.x, c.y, bb.max.z), [0, 0, 1], 0x3aa655], ["tiefe", new THREE.Vector3(c.x, c.y, bb.min.z), [0, 0, -1], 0x3aa655], ["traufhoehe", new THREE.Vector3(c.x, bb.max.y, c.z), [0, 1, 0], 0x2f7dd1]]) l.push({ feld, pos, dir: V(dir), faktor: 1, min: 100, farbe });
  } else if (f.typ === "rundblech" && f.h > 0) {
    const bb = mitte(modell.children.filter((o) => o.isMesh && o.userData.fid === f.id)); if (!bb) return l;
    const E = E_(f.ebene), n = V(E.n).normalize(), c = bb.getCenter(new THREE.Vector3());
    let ext = 0; for (const x of [bb.min.x, bb.max.x]) for (const y of [bb.min.y, bb.max.y]) for (const z of [bb.min.z, bb.max.z]) ext = Math.max(ext, new THREE.Vector3(x, y, z).sub(c).dot(n));
    l.push({ feld: "h", pos: c.addScaledVector(n, ext), dir: n, faktor: 1, min: 0.1, farbe: 0x1d8fff });
  }
  return l;
}
const GRIFFFARBE = 0x1f6fb2; const griffKey = (g) => `${g.feld}|${g.faktor}|${g.dir.x.toFixed(3)},${g.dir.y.toFixed(3)},${g.dir.z.toFixed(3)}`; let hoverGriff = null; // alle Ziehpfeile gleich (Akzentblau), unter dem Zeiger orange
// Hervorgehobene Kante: scharfe Linie in Bildschirmpixeln (kein Leuchten, keine Röhre)
function dickeLinie(punkte, farbe, px = 3, ordnung = 14) {
  const g = new LineGeometry(); g.setPositions(punkte.flatMap((p) => (Array.isArray(p) ? p : p.toArray())));
  const r = leinwand.getBoundingClientRect(), m = new LineMaterial({ color: farbe, linewidth: px, depthTest: false, transparent: true, opacity: 1 }); m.resolution.set(r.width || 800, r.height || 600);
  const l = new Line2(g, m); l.renderOrder = ordnung; l.userData.dicke = true; return l;
}
addEventListener("resize", () => { const r = leinwand.getBoundingClientRect(); for (const g of [kantenZeiger, projGruppe]) g.traverse((o) => { if (o.userData?.dicke) o.material.resolution.set(r.width, r.height); }); });
const griffLaenge = (pos) => kamera.position.distanceTo(pos) * 0.1;
// Eingabefeld hinter einem Ziehpfeil: im Dialog «d_<feld>», beim Kantenwerkzeug die Felder der Kantenleiste (Länge/Winkel gelten für alle Vorschau-Flansche)
const griffInput = (feld) => (dlg?.feature ? $("d_" + feld) : feld === "laenge" ? $("kbLaenge") : feld === "winkel" ? $("kbWinkel") : feld === "teilVon" ? $("kbVon") : feld === "teilBis" ? $("kbBis") : null);
const vorschauFeature = () => { const l = kantenWz?.letzte; return l && l._vorschau && doc.features.includes(l) && l.wert?.werkzeug ? l : null; };
function zeichneGriffe() {
  leeren(griffGruppe); griffe = [];
  const gf = dlg?.feature || vorschauFeature(); if (!gf || skizze) return;
  try { griffe = griffeFuer(gf).filter((g) => griffInput(g.feld)); } catch { griffe = []; }
  for (const g of griffe) { // Drehgriff am Flansch: Bogen um die Biegekante mit mindestens bildschirmgrossem Radius, seitlich versetzt – so liegt er nicht auf dem Längenpfeil
    const bg = g.bogen; if (!bg?.versetzt) continue;
    if (g.erst) { bg.t0 = g.dir.clone(); bg.e1 = g.pos.clone().sub(bg.c).normalize(); bg.L = griffLaenge(g.pos); bg.Rv = Math.max(bg.R, bg.L * 1.2); const w = leinwand.getBoundingClientRect(), pp = (ph) => aufSchirm(bg.c.clone().addScaledVector(bg.e1, Math.cos(ph) * bg.Rv).addScaledVector(bg.t0, Math.sin(ph) * bg.Rv).toArray()), ab = (ph) => { const q = pp(ph), t = bg.t0.clone().multiplyScalar(Math.cos(ph)).addScaledVector(bg.e1, -Math.sin(ph)), pk = bg.c.clone().addScaledVector(bg.e1, Math.cos(ph) * bg.Rv).addScaledVector(bg.t0, Math.sin(ph) * bg.Rv), ends = [1, -1].map((s) => aufSchirm(pk.clone().addScaledVector(t, s * bg.L * 0.7).toArray())); return Math.hypot(q[0] - w.width * 0.6, q[1] - w.height * 0.55) + [q, ...ends].filter((e) => document.elementFromPoint(w.left + e[0], w.top + e[1]) !== leinwand).length * 1e6; }; bg.p0 = [0.5, -0.5, 0.3, -0.3, 0.8, -0.8, 0.15, -0.15].map((p) => [p, ab(p)]).sort((x, y) => x[1] - y[1])[0][0]; } // Versatz zur Bildmitte hin (leicht rechts): so liegt der Griff nicht unter Browser/Teil-Panel
    const sg = g.erst ? 1 : -1, ph = bg.p0, nt = bg.e1.clone().multiplyScalar(-Math.sin(ph)).addScaledVector(bg.t0, Math.cos(ph)).normalize();
    g.pos = bg.c.clone().addScaledVector(bg.e1, Math.cos(ph) * bg.Rv).addScaledVector(bg.t0, Math.sin(ph) * bg.Rv); g.dir = nt.multiplyScalar(sg); g.faktor = Math.sign(g.faktor) * (180 / Math.PI) / bg.Rv;
  }
  const mat = (cl) => new THREE.MeshBasicMaterial({ color: cl, depthTest: false, transparent: true }), kegel = (pos, dirv, rK, h, cl, ord) => { const m = new THREE.Mesh(new THREE.ConeGeometry(rK, h, 20), mat(cl)); m.position.copy(pos); m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dirv); m.renderOrder = ord; return m; };
  const kugel = (pos, r, cl, ord) => { const m = new THREE.Mesh(new THREE.SphereGeometry(r, 16, 12), mat(cl)); m.position.copy(pos); m.renderOrder = ord; return m; };
  for (const g of griffe) { // wie in Fusion: Ziehpfeil = dünne Linie mit grossem Kegel; Drehgriff = Kreisbogen mit Pfeilspitzen an beiden Enden und Griffpunkt; blau, unter dem Zeiger orange
    const an = griffKey(g) === hoverGriff || (g.bogen && griffe.some((x) => x.bogen === g.bogen && griffKey(x) === hoverGriff)), farbe = an ? 0x1d8fff : GRIFFFARBE, L = griffLaenge(g.pos), dir = g.dir;
    if (g.bogen) {
      if (!g.erst) continue;
      const bg = g.bogen, c = bg.c, R = bg.Rv ?? bg.R, e1 = bg.e1 || g.pos.clone().sub(c).normalize(), tn = bg.t0 || dir, p0 = bg.p0 || 0, th = Math.max(0.3, Math.min(1.05, (L * 0.8) / Math.max(R, 1e-6))), pt = (p) => c.clone().addScaledVector(e1, Math.cos(p0 + p) * R).addScaledVector(tn, Math.sin(p0 + p) * R), tg = (p) => e1.clone().multiplyScalar(-Math.sin(p0 + p)).addScaledVector(tn, Math.cos(p0 + p)).normalize();
      const kopfL = L * 0.22, dphi = kopfL / Math.max(R, 1e-6), pts = Array.from({ length: 25 }, (_, i) => pt(-th + dphi * 0.5 + ((2 * th - dphi) * i) / 24));
      const rohr = (cl, r, ord) => { const m = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 24, r, 8, false), mat(cl)); m.renderOrder = ord; return m; };
      griffGruppe.add(rohr(0xffffff, L * 0.02, 29), kegel(pt(th), tg(th), L * 0.092, kopfL * 1.14, 0xffffff, 29), kegel(pt(-th), tg(-th).negate(), L * 0.092, kopfL * 1.14, 0xffffff, 29), kugel(pt(0), L * 0.05, 0xffffff, 29),
        rohr(farbe, L * 0.011, 30), kegel(pt(th), tg(th), L * 0.07, kopfL, farbe, 31), kegel(pt(-th), tg(-th).negate(), L * 0.07, kopfL, farbe, 31), kugel(pt(0), L * 0.036, farbe, 31));
      continue;
    }
    const kopfL = L * 0.26, schaftL = L - kopfL, q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir), rS = L * (an ? 0.014 : 0.01), rK = L * (an ? 0.085 : 0.075);
    const teil = (geo, pos, cl, ord) => { const m = new THREE.Mesh(geo, mat(cl)); m.position.copy(pos); m.quaternion.copy(q); m.renderOrder = ord; return m; };
    const mitteSchaft = g.pos.clone().addScaledVector(dir, schaftL / 2), kopfPos = g.pos.clone().addScaledVector(dir, schaftL + kopfL / 2);
    griffGruppe.add(teil(new THREE.CylinderGeometry(rS * 2, rS * 2, schaftL, 8), mitteSchaft, 0xffffff, 29), teil(new THREE.ConeGeometry(rK * 1.3, kopfL * 1.12, 20), kopfPos, 0xffffff, 29),
      teil(new THREE.CylinderGeometry(rS, rS, schaftL, 8), mitteSchaft, farbe, 30), teil(new THREE.ConeGeometry(rK, kopfL, 20), kopfPos, farbe, 31), kugel(g.pos, L * 0.03, farbe, 31));
  }
}steuerung.addEventListener("change", () => { if (griffe.length && !griffZug) zeichneGriffe(); });
function griffAn(e) { // Pfeil unter dem Zeiger (Abstand zur Strecke Fuss–Spitze am Bildschirm)
  if (!griffe.length || skizze) return null;
  const sm = smPos(e), r = e.pointerType === "touch" ? 30 : e.pointerType === "pen" ? 22 : 14; let best = null, bd = r;
  const flaechenWahl = aktiveWahl()?.wahl === "flaechen"; // bei der Flächenwahl in der Skizze darf der Fusspfeil keine Klicks auf die Flächen abfangen
  for (const g of griffe) { if (g.nah && flaechenWahl) continue; const A = aufSchirm(g.pos.toArray()), B = aufSchirm(g.pos.clone().addScaledVector(g.dir, griffLaenge(g.pos)).toArray()); if (A[2] > 1 || B[2] > 1) continue; const d = abstandStrecke(sm, A, B); if (d < bd) { bd = d; best = g; } }
  return best;
}
leinwand.addEventListener("pointerdown", (e) => {
  if (e.button !== 0) return;
  const g = griffAn(e); if (!g) return;
  const A = aufSchirm(g.pos.toArray()), B = aufSchirm(g.pos.clone().addScaledVector(g.dir, 100).toArray()), dx = B[0] - A[0], dy = B[1] - A[1], L = Math.hypot(dx, dy);
  if (L < 0.5) return; // Pfeil zeigt genau auf die Kamera
  e.stopImmediatePropagation(); e.preventDefault(); leinwand.setPointerCapture(e.pointerId);
  griffZug = { g, m0: smPos(e), v0: zahlAus(griffInput(g.feld).value) || 0, d: [dx / L, dy / L], pxProMm: L / 100 };
}, true);
leinwand.addEventListener("pointermove", (e) => {
  if (!griffZug) { const gh = !e.buttons ? griffAn(e) : null; leinwand.style.cursor = gh ? "grab" : ""; const gk = gh ? griffKey(gh) : null; if (gk !== hoverGriff) { hoverGriff = gk; if (griffe.length) zeichneGriffe(); } return; }
  e.stopImmediatePropagation();
  const { g, m0, v0, d, pxProMm } = griffZug, sm = smPos(e), delta = ((sm[0] - m0[0]) * d[0] + (sm[1] - m0[1]) * d[1]) / pxProMm;
  let v = v0 + delta * g.faktor; v = Math.round(v * (e.shiftKey ? 100 : 2)) / (e.shiftKey ? 100 : 2); if (g.min != null) v = Math.max(g.min, v); if (g.max != null) v = Math.min(g.max, v);
  const el = griffInput(g.feld); if (!el) return; el.value = String(v); el.dispatchEvent(new Event("input"));
  if (e.pointerType !== "mouse") griffBlase.zeige(`${g.feld === "winkel" ? v + "°" : v + " mm"}`, e.clientX, e.clientY);
}, true);
const griffBlase = wertBlase();
const griffEnde = (e) => { griffBlase.weg(); if (!griffZug) return; try { leinwand.releasePointerCapture(e.pointerId); } catch {} griffZug = null; zeichneGriffe(); leinwand.style.cursor = ""; };
leinwand.addEventListener("pointerup", (e) => { if (griffZug) { e.stopImmediatePropagation(); griffEnde(e); } }, true);
leinwand.addEventListener("pointercancel", griffEnde, true);

// ------------------------------------------------------------ Neuaufbau (parametrisch, in Reihenfolge der Zeitleiste)
let simulation = null; // Simulationsmodul (src/simulation.js), unten angelegt
let nahtWinkelGeaendert = false, regenTiefe = 0;
function regen() { // Nähte brauchen die Lage beider Bleche: ändert sich der Winkel zwischen den Blechen gegenüber der Rechnung der Bleche, wird einmal nachgerechnet
  nahtWinkelGeaendert = false; regenEinmal();
  if (nahtWinkelGeaendert && regenTiefe === 0) { regenTiefe = 1; try { nahtWinkelGeaendert = false; regenEinmal(); } finally { regenTiefe = 0; } }
}
function regenEinmal() {
  leeren(modell); bilder.clear(); try { kollisionen.children.forEach((o) => o.geometry.dispose()); kollisionen.clear(); } catch {}
  // Verwendete Materialien ins Projekt schreiben, damit es auf jedem Gerät gleich rechnet
  const benutzt = [...new Set(doc.features.map((f) => f.material).filter(Boolean))].map(material);
  doc.materialien = benutzt.filter((m, i) => benutzt.indexOf(m) === i);
  // Verwendete Kantenbausteine ebenfalls ins Projekt (andere Geräte haben evtl. andere Bausteine)
  const bIds = new Set([...doc.features.filter((f) => f.typ === "flaeche").flatMap((f) => Object.values(f.kanten || {})), ...doc.features.filter((f) => f.typ === "kante").map((f) => f.wert)].filter((v) => typeof v === "string"));
  doc.bausteine = [...bIds].map((id) => alleBausteine().find((b) => b.id === id)).filter(Boolean);
  const flachStand = new Map(); let aktSchnitt = null; // Abwickeln/Falten: abgewickelte Bleche mit den Ausschnitten (Skizzenumrisse) dazwischen
  const volumen = new Map(); // Volumenkörper (Extrusion, Drehung) für Vereinigen/Ausschneiden/Schneiden
  const volumenKoerper = (f, geo) => {
    const op = f.vorgang || "neu";
    if (op === "neu") { const m = koerperMesh(geo, darstellungVon(f), f.id); volumen.set(f.id, m); if (!f.versteckt) modell.add(m); return; }
    const ziele = f.ziel && f.ziel !== "alle" ? [volumen.get(f.ziel)].filter(Boolean) : [...volumen.values()];
    // Ausschneiden trifft auch Blechkörper (Flächenblech, Blechprofil, Vorlagen): alle bzw. das gewählte Blech
    const bleche = op !== "ausschneiden" ? [] : modell.children.filter((o) => { if (!o.isMesh || o.userData.fid == null) return false; const hid = String(o.userData.fid).split(":")[0], x = finde(hid); return x && ["flaeche", "blech", "vorlage", "profil"].includes(x.typ) && !x.versteckt && (!f.ziel || f.ziel === "alle" || hid === f.ziel); });
    if (!ziele.length && !bleche.length) throw new Error("Kein Körper zum " + ({ verbinden: "Vereinigen", ausschneiden: "Ausschneiden", schneiden: "Schneiden" })[op]);
    for (const z of op === "verbinden" ? ziele.slice(0, 1) : ziele) verknuepfe(z, geo, op);
    let nicht = 0;
    for (const z of bleche) {
      const hid = String(z.userData.fid).split(":")[0], fl = flachStand.has(hid) && aktSchnitt; // abgewickeltes Blech: Kanten wie beim Falten sauber halten
      try { verknuepfe(z, geo, "ausschneiden", !fl); if (fl) { const zf = finde(hid), eb = blechEbene(finde(zf.skizze).ebene, zf, material(zf.material)); kantenBeschneiden(z, geo); lochRaender(z, aktSchnitt.loops, eb, material(zf.material).t / 2); } } catch { nicht++; }
    }
    for (const hid of new Set(bleche.map((o) => String(o.userData.fid).split(":")[0]))) { // abgewickelte Bleche: Umriss des Ausschnitts für «Falten» merken
      const st = flachStand.get(hid); if (!st) continue;
      f._imFlachen = true; // dieser Ausschnitt liegt in der Abwicklung (exakt über die Lochliste des abgewickelten Blechs)
      if (!aktSchnitt || aktSchnitt.ebene !== finde(finde(hid).skizze).ebene) throw new Error("Ausschneiden an der Abwicklung: die Skizze muss auf derselben Ebene wie das Blech liegen");
      st.schnitte.push(...aktSchnitt.loops); finde(hid)._bleche?.forEach((bl) => { bl.abw.loecher = st.schnitte.filter((l) => boxUeberlappt(l, bl.abw.umriss)); });
    }
    if (nicht) throw new Error(`${nicht} Blechteil${nicht === 1 ? "" : "e"} lie${nicht === 1 ? "ss" : "ssen"} sich nicht ausschneiden`);
  };
  doc.features.forEach((f) => (f._faktor = 1));
  let platz = 0; // Vorlagen und freie Profile haben keine Lage: nebeneinander aufreihen statt übereinander
  const daneben = (res) => { const g = grenzen(polylinie(res.pfad)), v = [platz - g.x0, 0]; platz += g.x1 - g.x0 + einst.skizze.abstand; return v; };
  const P = (() => { const r = parameterWerte(doc.parameter || []); return r.werte; })();
  const aus = new Set();
  doc.features.forEach((f, i) => {
    f._aus = (doc.marke != null && i >= doc.marke) ? "zurueck" : f.unterdrueckt ? "unterdrueckt" : null;
    if (f._aus) { aus.add(f.id); f._teile = null; f._detail = null; f._bleche = null; }
  });
  for (const f of doc.features) {
    f._fehler = null; f._res = null;
    if (f._aus) continue;
    try {
      const fehlt = bezuegeVon(f).find((id) => aus.has(id));
      if (fehlt) throw new Error(`Bezug «${finde(fehlt).name}» ist ${finde(fehlt)._aus === "zurueck" ? "zurückgerollt" : "unterdrückt"}`);
      wendeAusdrueckeAn(f, P);
      if (f.typ === "ebene") {
        f._ebene = null;
        f._ebene = baueEbene(f);
        if (!f.versteckt) modell.add(ebenenObjekt(f._ebene, f.id));
      } else if (f.typ === "achse") {
        f._achse = null; f._achse = baueAchse(f);
        if (!f.versteckt) modell.add(achsenObjekt(f._achse, f.id));
      } else if (f.typ === "konpunkt") {
        f._punkt = null; f._punkt = bauePunkt(f);
        if (!f.versteckt) modell.add(punktObjekt(f._punkt, f.id));
      } else if (f.typ === "skizze") {
        if (!ebene(f.ebene)) throw new Error("Ebene fehlt");
        if (skizzenAusdruecke(f, P) && !loeseSkizze(f).ok) throw new Error("Skizze lässt sich mit den Parameterwerten nicht lösen");
        if (!f.versteckt && f !== skizze?.f) modell.add(skizzenObjekt(f));
      } else if (f.typ === "extrusion") {
        const s = finde(f.skizze); if (!s) throw new Error("Skizze fehlt");
        if (f.bis && f.bis !== "mass") { const uv = extrusionMitteUV(f, s); if (uv) f.abstand = bisWert(f, bisAbstand(f, E_(s.ebene).n, zu3D(s.ebene, uv))); }
        if (Array.isArray(f.flaechen) && !f.flaechen.length) throw new Error("Fläche in der Skizze anklicken");
        const fs = formen(s, undefined, f); if (!fs.length) throw new Error(Array.isArray(f.flaechen) ? "Gewählte Fläche gibt es nicht mehr – neu anklicken" : "Skizze hat kein geschlossenes Profil");
        const kr = doc.features.filter((x) => x.typ === "kantenrund" && x.ziel === f.id && !x._aus);
        aktSchnitt = { ebene: s.ebene, loops: gewaehlteRegionen(f, s)?.map((r) => r.aussen) ?? schleifen(s) };
        try { volumenKoerper(f, kr.length ? gerundeteExtrusion(s, f, kr) : +f.konisch ? konischGeometrie(aktSchnitt.loops, s.ebene, zweiseitig(f, "abstand", "abstand2").tiefe, zweiseitig(f, "abstand", "abstand2").richtung, +f.konisch) : koerperGeometrie(fs, s.ebene, zweiseitig(f, "abstand", "abstand2").tiefe, zweiseitig(f, "abstand", "abstand2").richtung, (f.vorgang || "neu") === "neu" ? 0 : 0.01)); } finally { aktSchnitt = null; }
      } else if (f.typ === "bild") {
        if (!ebene(f.ebene)) throw new Error("Ebene fehlt");
        if (!f.versteckt) bilder.add(bildObjekt(f));
      } else if (f.typ === "import") {
        if (!f._geo) { const bin = atob(f.daten || ""), u8 = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
          f._geo = new THREE.BufferGeometry(); f._geo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(u8.buffer), 3)); f._geo.computeVertexNormals(); }
        volumenKoerper({ ...f, vorgang: "neu" }, f._geo.clone());
      } else if (f.typ === "detail3d") {
        const v = (einst.detailvorlagen || []).find((x) => x.id === f.vorlage); if (!v) throw new Error("Detailvorlage fehlt (Einstellungen › Details 3D)");
        const k = bezugKante(f.kante), M = kantenLage(k.p, k.d, { versatz: +f.versatz || 0, drehung: +f.drehung || 0 });
        let pos = DETAILMESH.get(v.id + "|" + (v.version ?? 1)); if (!pos) DETAILMESH.set(v.id + "|" + (v.version ?? 1), pos = meshAusVorlage(v));
        const geo = new THREE.BufferGeometry(); geo.setAttribute("position", new THREE.BufferAttribute(Float32Array.from(pos), 3));
        geo.applyMatrix4(new THREE.Matrix4().set(...M, 0, 0, 0, 1)); geo.computeVertexNormals();
        f._detail3d = { vorlage: v, kantenlaenge: Math.hypot(...k.d), m: M };
        volumenKoerper({ ...f, vorgang: "neu" }, geo);
      } else if (f.typ === "kehle") {
        const r = kehlBlech(f); f._res = r.res; f._kehle = r;
        if (!f.versteckt) { const m = koerperMesh(r.geo, darstellungVon(f, material(f.material)), f.id); modell.add(m); }
      } else if (f.typ === "kanten3d") {
        const m = volumen.get(f.ziel); if (!m) throw new Error("Körper fehlt – Kanten eines Volumenkörpers anklicken");
        if (doc.features.indexOf(finde(f.ziel)) > doc.features.indexOf(f)) throw new Error("Der Körper muss vor dem Abrunden stehen");
        const fehlt = kantenBearbeiten(m, f);
        if (dlg?.feature === f) for (const k of f.kanten || []) { const l = new THREE.Line(new THREE.BufferGeometry().setFromPoints([V(k.a), V(k.b)]), new THREE.LineBasicMaterial({ color: 0x1d8fff, depthTest: false })); l.renderOrder = 15; l.userData.konstruktion = true; modell.add(l); }
        if (fehlt) throw new Error(`${fehlt} Kante${fehlt === 1 ? "" : "n"} nicht mehr gefunden (Körper geändert?) – neu anklicken`);
      } else if (f.typ === "kantenrund") {
        const z = finde(f.ziel); if (z?.typ !== "extrusion") throw new Error("Abrunden/Fasen geht an Extrusionen – Extrusion wählen");
        if (doc.features.indexOf(z) > doc.features.indexOf(f)) throw new Error("Die Extrusion muss vor dem Abrunden stehen");
      } else if (f.typ === "schale") {
        const z = finde(f.ziel); if (z?.typ !== "extrusion" || (z.vorgang || "neu") !== "neu") throw new Error("Schale geht an einem Extrusionskörper (neuer Körper)");
        const m = volumen.get(z.id); if (!m) throw new Error("Zielkörper fehlt");
        verknuepfe(m, schalenWerkzeug(z, f), "ausschneiden");
      } else if (f.typ === "kmuster" || f.typ === "kspiegel" || f.typ === "bewegen" || f.typ === "skalieren") {
        koerperTransform(f, volumen);
      } else if (f.typ === "bohrung") {
        bohrungOp(f, volumen);
      } else if (f.typ === "biegung") {
        biegungOp(f);
      } else if (f.typ === "rip") {
        ripOp(f);
      } else if (f.typ === "rohr") {
        volumenKoerper(f, rohrGeometrie(f));
      } else if (f.typ === "spirale") {
        volumenKoerper(f, spiraleGeometrie(f));
      } else if (f.typ === "rippe") {
        volumenKoerper(f, rippeGeometrie(f));
      } else if (f.typ === "teilen") {
        koerperTeilen(f, volumen, flachStand);
      } else if (f.typ === "drehung") {
        const s = finde(f.skizze); if (!s) throw new Error("Skizze fehlt");
        const loops = schleifen(s); if (!loops.length) throw new Error("Skizze hat kein geschlossenes Profil");
        const [a, d] = drehAchse(s, f.achse); if (!a) throw new Error("Drehachse fehlt");
        volumenKoerper(f, drehGeometrie(loops, s.ebene, a, d, f.winkel ?? 360));
      } else if (f.typ === "sweep") {
        const s = finde(f.skizze); if (!s) throw new Error("Skizze fehlt");
        volumenKoerper(f, sweepGeometrie(s, bezugPfad(f.pfad), { orientierung: f.orientierung, fuehrung: f.fuehrung ? bezugPfad(f.fuehrung) : null, skalieren: f.fuehrSkal }));
      } else if (f.typ === "loft") {
        const sks = [f.profil1, f.profil2, f.profil3].filter(Boolean).map((id) => finde(id) || (() => { throw new Error("Profilskizze fehlt"); })());
        if (sks.length < 2 || new Set(sks).size !== sks.length) throw new Error("Zwei verschiedene Profilskizzen wählen");
        volumenKoerper(f, loftGeometrie(sks));
      } else if (f.typ === "blech") {
        const s = finde(f.skizze); if (!s) throw new Error("Skizze fehlt");
        const kette = ketten(s)[f.kette || 0]; if (!kette) throw new Error("Skizze hat keinen offenen Linienzug");
        if (kette.mitBogen) throw new Error("Linienzug enthält Bögen – für Blech die Ecken mit «Abrunden» runden");
        let k = kette.pts, radien = kette.radien;
        if (f.umkehren) { // Kante A am anderen Ende des Linienzugs
          const n = k.length; k = k.slice().reverse();
          radien = Object.fromEntries(Object.entries(radien).map(([i, r]) => [n - 1 - i, r]));
        }
        f._linie = { pts: k, ebene: s.ebene };
        const m = material(f.material);
        // Lage des Blechs zur Linie: Mitte, oder Linie = Blechoberfläche und Blech links/rechts daneben
        const d = ({ links: m.t / 2, rechts: -m.t / 2 })[f.lage] ?? 0;
        const kk = versatzLinie(k, d);
        // Abrundung der Skizze → Radius auf der Blechmitte (Innenseite kleiner) → Innenradius der Biegung
        const riAn = (i) => (radien[i] > 0 ? Math.max(radien[i] - d * Math.sign(drehung(k, i)) - m.t / 2, 0) : null);
        const oo = blechOps(kk, m, riAn), ext = profilErweiterungen(f, m), ber = (p) => berechne(p.start, p.ops, m.t, m.ri, m.k); let vz0 = kk[0];
        if (!ext.length) f._res = ber(oo);
        else { // nachträgliche Flansche/Bausteine: Lage so, dass das ursprüngliche Ende des Linienzugs an seinem Platz bleibt (auch bei Kante A, die den Anfang verlängert)
          const letzter = (r) => polylinie(r.pfad).at(-1), e0 = letzter(ber(oo)), eA = letzter(ber(profilErweitern(oo, ext.filter((x) => x.ende === "A"), m)));
          vz0 = [kk[0][0] + e0[0] - eA[0], kk[0][1] + e0[1] - eA[1]]; f._res = ber(profilErweitern(oo, ext, m));
        }
        f._kernLage = { ebene: E_(s.ebene), versatz: vz0 }; // für den exakten CAD-Kern (gleiche Lage wie das Anzeige-Netz)
        wendeBisAn(f, s.ebene, vz0);
        stirnBerechnen(f, m);
        if (!f.versteckt) modell.add(koerper([konturForm(f._res, m.t, vz0)], s.ebene, zweiseitig(f, "laenge", "laenge2").tiefe, zweiseitig(f, "laenge", "laenge2").richtung, darstellungVon(f, m), f.id, stirnWandVor(f, vz0, zweiseitig(f, "laenge", "laenge2"))));
        stirnAnhaengen(f, m, s.ebene, vz0);
      } else if (f.typ === "vorlage") {
        if (!ebene(f.ebene)) throw new Error("Ebene fehlt");
        const m = material(f.material), v = vorlageVon(f);
        const { start, ops } = profilErweitern(v.bau(f.params, m), profilErweiterungen(f, m), m);
        f._res = berechne(start, ops, m.t, m.ri, m.k);
        f._kernLage = null; stirnBerechnen(f, m);
        if (!f.versteckt) { const vz = daneben(f._res); f._kernLage = { ebene: E_(f.ebene), versatz: vz }; wendeBisAn(f, f.ebene, vz); modell.add(koerper([konturForm(f._res, m.t, vz)], f.ebene, zweiseitig(f, "laenge", "laenge2").tiefe, zweiseitig(f, "laenge", "laenge2").richtung, darstellungVon(f, m), f.id, stirnWandVor(f, vz, zweiseitig(f, "laenge", "laenge2")))); }
        stirnAnhaengen(f, m, f.ebene, f._kernLage?.versatz ?? [0, 0]);
      } else if (f.typ === "flaeche") {
        f._bleche = null; f._teile = null; f._mitAbwicklung = false;
        if (!f.kantenBasis) f.kantenBasis = { ...(f.kanten || {}) };
        f.kanten = berechneKanten(f);
        const s = finde(f.skizze); if (!s) throw new Error("Skizze fehlt");
        if (Array.isArray(f.flaechen) && !f.flaechen.length) throw new Error("Fläche in der Skizze anklicken");
        const loops = gewaehlteRegionen(f, s)?.map((r) => r.aussen) ?? schleifen(s); if (!loops.length) throw new Error(Array.isArray(f.flaechen) ? "Gewählte Fläche gibt es nicht mehr – neu anklicken" : "Skizze hat keine geschlossene Fläche");
        const m = material(f.material), nr = Array.isArray(f.flaechen) || f.profil === "alle" || f.profil == null ? loops.map((_, i) => i) : [+f.profil];
        f._bleche = nr.map((pi) => {
          if (!loops[pi]) throw new Error(`Fläche ${pi + 1} fehlt in der Skizze`);
          const n = kantenGruppen(gegenUhrzeiger(loops[pi])).length;
          return { pi, ...flaechenblech(loops[pi], [...Array(n).keys()].map((k) => { const b = bausteinFuer(f.kanten?.[`${pi}:${k}`]), w = f.kantenWerte?.[`${pi}:${k}`]; return b && w ? { ...b, _werte: w } : b; }), m, doc.features.filter((q) => q.typ === "quetschfalte" && q.ziel === f.id && !q._aus).map((q) => String(q.ecke).split(":").map(Number)).filter(([p0]) => p0 === pi).map(([, k0]) => k0), (() => { const enden = {}; for (const q of doc.features) if (q.typ === "flanschende" && q.ziel === f.id && !q._aus) { const [p0, k0] = String(q.key).split(":").map(Number); if (p0 === pi) enden[`${k0}:${q.seite === "ende" ? "ende" : "start"}`] = { art: q.art || "rechtwinklig", winkel: +q.winkel || 0, versatz: +q.versatz || 0 }; } const quetschRichtung = {}; for (const q of doc.features) if (q.typ === "quetschfalte" && q.ziel === f.id && !q._aus) { const [p0, k0] = String(q.ecke).split(":").map(Number); if (p0 === pi) quetschRichtung[k0] = q.richtung; } const teil = {}; for (const [key, t] of Object.entries(teilKanten(f))) { const [p0, k0] = key.split(":").map(Number); if (p0 === pi) teil[k0] = t; } return Object.keys(enden).length || Object.keys(teil).length || (f.ecken && f.ecken !== "gehrung") || f.freistellung === "keine" || Object.keys(quetschRichtung).length ? { ecken: f.ecken || "gehrung", spalt: +f.eckSpalt || 1, enden, freistellung: f.freistellung, freistellungMass: +f.freistellungMass || 0, quetschRichtung, sichtseite: f.sichtseite, teil } : null; })()) };
        });
        const viele = f._bleche.length > 1;
        f._teile = f._bleche.map((bl, i) => ({ id: `${f.id}:${i}`, typ: "flaechenteil", eltern: f, name: viele ? `${f.name} · Blech ${bl.pi + 1}` : f.name, material: f.material,
          laenge: +bl.abw.laenge.toFixed(1), stueck: f.stueck ?? 1, notiz: f.notiz, _blech: bl,
          _res: { zuschnitt: bl.abw.breite, biegungen: bl.profile.flatMap((p) => p?.biegungen || []), pfad: [], beschriftungen: [], schenkel: [], summeSchenkel: 0 } }));
        for (const bl of f._bleche) bl.abw.loecher = []; f._flach = false;
        if (!f.versteckt) f._bleche.forEach((bl, i) => flaechenKoerper(bl, blechEbene(s.ebene, f, m), m, f.sichtseite === -1 ? -1 : 1, `${f.id}:${i}`, darstellungVon(f, m)).forEach((o) => modell.add(o)));
        if ((f.eckEntl && f.eckEntl !== "keine") || (f.freistellung !== "keine" && ["gehrung", "gehrung45"].includes(f.ecken || "gehrung"))) f._bleche.forEach((bl) => eckenEntlastung(f, bl, m, s));
      } else if (f.typ === "loftflansch") { // Lofted Flange: Blech zwischen zwei Profilen
        f._teile = null; const lb = loftflanschBau(f);
        if (!f.versteckt) modell.add(koerperAusGeo(lb.geo, darstellungVon(f, lb.m), `${f.id}:0`));
        f._teile = [{ id: `${f.id}:0`, typ: "flaechenteil", eltern: f, name: f.name, material: f.material, laenge: +lb.abw.laenge.toFixed(1), stueck: f.stueck ?? 1, notiz: f.notiz, _blech: { pi: 0, pts: [], gruppen: [], profile: [], abw: lb.abw }, _res: { zuschnitt: lb.abw.breite, biegungen: lb.abw.linien.map((l, i) => ({ nr: i + 1, pos: l.punkte[0][0], winkel: 0, art: "Abkanten", richtung: "oben" })), pfad: [], beschriftungen: [], schenkel: [], summeSchenkel: 0 } }];
      } else if (f.typ === "gebaeude") { // Gebäude-Ansatz: Wände bis zur Traufe bzw. zum Dach (Giebel)
        if (!(f.traufhoehe > 0) || (f.form !== "skizze" && !(f.breite > 0 && f.tiefe > 0))) throw new Error("Breite, Tiefe und Wandhöhe müssen grösser als 0 sein");
        const dach = doc.features.find((x) => x.typ === "dach" && x.gebaeude === f.id && !x._aus), r = dach ? dachErgebnis(dach, f) : { grundriss: gebaeudeUmriss(f), hoeheAn: () => f.traufhoehe };
        const ws = waende(r.grundriss, r), t = Math.min(+f.wandstaerke || 0, ...(f.form === "skizze" ? [] : [f.breite / 2 - 1, f.tiefe / 2 - 1]));
        if (!f.versteckt) for (const w of ws) { const i = w.kante, A = r.grundriss[i], B = r.grundriss[(i + 1) % r.grundriss.length], L = Math.hypot(B[0] - A[0], B[1] - A[1]); if (t > 0) modell.add(koerperMesh(wandPlatte(w.punkte, [-(B[1] - A[1]) / L, (B[0] - A[0]) / L], t, f), 0xd9d5cc, f.id)); }
      } else if (f.typ === "dach") { // Dachflächen mit Aufbau (Phase 1: eine Platte je Fläche von Sparrenunterkante bis Deckung)
        const g = finde(f.gebaeude); if (g?.typ !== "gebaeude") throw new Error("Gebäude fehlt"); if (doc.features.indexOf(g) > doc.features.indexOf(f)) throw new Error("Das Gebäude muss vor dem Dach stehen");
        const r = dachErgebnis(f, g); f._dach = r; const dk = deckungVon(f), au = aufbauVon(f); doc.dachVorlagen ||= { deckungen: [], aufbauten: [] };
        for (const [l, id, q] of [[doc.dachVorlagen.deckungen, dk?.id, deckungBasis(f)], [doc.dachVorlagen.aufbauten, au?.id, aufbauBasis(f)]]) if (q && !l.some((x) => x.id === id)) l.push(JSON.parse(JSON.stringify(q)));
        const sc = dachSchichten(au, dk); f._schichten = sc;
        const detail = f.darstellung !== "platte", eind = true; /* Deckung nur durch «Ziegel eindecken»: bis dahin sind Dachlatten sichtbar */ const luks = doc.features.filter((x) => x.typ === "lukarne" && x.dach === f.id && !x._aus && r.flaechen[x.flaeche]), els = doc.features.filter((x) => x.typ === "dachelement" && x.dach === f.id && !x._aus && r.flaechen[x.flaeche]), au2 = aufbauVon(f);
        f._koerper = r.flaechen.map((fl, i) => dachFlaechenKoerper(fl, sc, au2, dk, { deckungUnsichtbar: eind, ausschnitte: [...els.filter((x) => x.flaeche === i).map((x) => { const q = elementRechteck(fl, x); return { s0: q.s0, s1: q.s1, t0: q.t0, t1: q.t1, wechsel: au2.sparrenB, name: x.name }; }),
          ...luks.filter((x) => x.flaeche === i).flatMap((x) => { try { const q = lukarneGeo(fl, x, 0).rect; return [{ ...q, wechsel: au2.sparrenB, name: x.name }]; } catch { return []; } })] }));
        // Lukarnen: gleicher Schichtaufbau auf Gaubendach, Stirn und Wangen
        for (const x of luks) { x._lukK = null; try { const lk = lukarneGeo(r.flaechen[x.flaeche], x, 0); x._lukK = { lk, koerper: lk.formen.map((fo) => { const k = dachFlaechenKoerper({ punkte: fo.punkte, normale: fo.normale }, sc, au2, dk, { deckungUnsichtbar: eind && fo.art === "dach" }); if (fo.art !== "dach") for (const b of k.koerper) if (b.art === "deckung") b.art = "verkleidung"; return k; }) }; } catch {} }
        f._mengen = dachMengen([...f._koerper, ...luks.flatMap((x) => x._lukK?.koerper || [])], dk, r.linien, els.reduce((a, x) => a + elementFlaeche(x), 0) + luks.reduce((a, x) => a + (x._lukK?.lk.flaeche || 0), 0));
        if (!f.versteckt) {
          if (!detail) for (const fl of r.flaechen) for (const st of fl.stuecke || [fl.punkte]) modell.add(koerperMesh(dachPrisma(st, fl.normale, sc.unten, sc.oben, g), 0xb5543a, f.id));
          else zeigeDachKoerper(f._koerper, g, f.id);
        }
      } else if (f.typ === "dachbleche") { // Spengler-Brücke: Anschlussbleche aus den Dachflächen (Profilvorlagen mit Abwicklung)
        f._teile = null; const d = finde(f.dach); if (d?.typ !== "dach" || !d._dach) throw new Error("Dach fehlt – das Dach muss vor den Dachblechen stehen und fehlerfrei sein");
        if (doc.features.indexOf(d) > doc.features.indexOf(f)) throw new Error("Das Dach muss vor den Dachblechen stehen");
        const m = material(f.material), par = Object.fromEntries(Object.keys(BLECHARTEN).map((a) => [a, { ...standardwerte(BLECH_VORLAGE[a]), ...(f.params?.[a] || {}) }]));
        const br = dachBleche(d._dach.flaechen, { abstand: d._schichten?.oben ?? 0, arten: f.arten || {}, params: par }), gd = finde(d.gebaeude);
        const kam = doc.features.filter((x) => x.typ === "dachelement" && x.dach === d.id && x.art === "kamin" && !x._aus && d._dach.flaechen[x.flaeche] && elementRechteck(d._dach.flaechen[x.flaeche], x).innen).flatMap((x) => kaminBleche(x, +par.traufe.dach || 150).map((t) => ({ ...t, neigung: 0, name: `${t.name} (${x.name})` })));
        const lukB = doc.features.filter((x) => x.typ === "lukarne" && x.dach === d.id && !x._aus && d._dach.flaechen[x.flaeche]).flatMap((x) => { try { const lk = lukarneGeo(d._dach.flaechen[x.flaeche], x, 0); return lk.innen ? lk.bleche.map((t) => ({ ...t, name: `${t.name} (${x.name})` })) : []; } catch { return []; } });
        br.teile.push(...kam, ...lukB);
        const abst = d._schichten?.oben ?? 0, lukF = doc.features.filter((x) => x.typ === "lukarne" && x.dach === d.id && !x._aus && d._dach.flaechen[x.flaeche]).flatMap((x) => { try { return lukarneGeo(d._dach.flaechen[x.flaeche], x, 0).flaps.map((fp) => ({ art: fp.art, punkte: fp.punkte.map((p) => p.map((v, i) => v + fp.normale[i] * abst)), normale: fp.normale, ziel: fp.ziel, lukId: x.id, hauptFlaeche: x.flaeche })); } catch { return []; } });
        f._formen = [...br.formen, ...lukF];
        f._teile = br.teile.map((t, i) => { const vid = { kamin: "kamin", "luk-wand": "wand", "luk-kehle": "kehle" }[t.art] || BLECH_VORLAGE[t.art], { start, ops } = VORLAGE[vid].bau({ ...(BLECH_VORLAGE[t.art] ? par[t.art] : { ...standardwerte(vid), ...(par[vid] || {}) }), neigung: t.neigung }, m);
          return { id: `${f.id}:${i}`, typ: "dachblech", eltern: f, name: `${t.name} ${t.laenge} mm`, material: f.material, laenge: t.laenge, stueck: t.stueck, notiz: `Neigung ${t.neigung}° · aus «${d.name}»`, _res: berechne(start, ops, m.t, m.ri, m.k) }; });
        if (!f.versteckt && gd) for (const fo of f._formen) modell.add(koerperMesh(dachPlatte(fo.punkte, fo.normale, 4, gd), BLECH_FARBE[fo.art] || 0xa9622f, f.id));
      } else if (f.typ === "quetschfalte") { // Quetschfalte an der Ecke zweier Aufkantungen eines Flächenblechs (Überschuss 180° gefaltet, liegt auf einer Wand)
        f._q = null;
        const z = finde(f.ziel); if (z?.typ !== "flaeche") throw new Error("Flächenblech fehlt");
        if (doc.features.indexOf(z) > doc.features.indexOf(f)) throw new Error("Das Flächenblech muss vor diesem Schritt stehen");
        f._q = quetschGeo(z, f);
        if (!f.versteckt) quetschMeshes(z, f).forEach((o) => modell.add(o));
      } else if (f.typ === "naht") { // Verbindungsnaht zwischen zwei Blechen: Überlappung/Falz wirken über die Kantenbausteine (berechneKanten, profilErweiterungen), Raupen sind Darstellung
        if (!f.a?.key || !f.b?.key) throw new Error("Blech und Kante für beide Seiten wählen (Schritte im Naht-Fenster)"); // noch nicht vollständig
        const za = finde(f.a?.ziel), zb = finde(f.b?.ziel); if (!za || !zb) throw new Error("Eines der beiden Bleche der Naht fehlt");
        if (doc.features.indexOf(za) > doc.features.indexOf(f) || doc.features.indexOf(zb) > doc.features.indexOf(f)) throw new Error("Beide Bleche müssen vor der Naht stehen");
        if (za.versteckt || zb.versteckt) throw new Error("Ein Blech der Naht ist ausgeblendet");
        if (!nahtKante(f.a)) throw new Error("Die Kante an Blech A gibt es nicht mehr – Naht neu setzen");
        if (!nahtKante(f.b)) throw new Error("Die Kante an Blech B gibt es nicht mehr – Naht neu setzen");
        { const wn = nahtWinkelAuto(f); if (JSON.stringify(wn) !== JSON.stringify(f._winkel ?? null)) { f._winkel = wn; nahtWinkelGeaendert = true; } }
        if ((f.art === "schweiss" || f.art === "ecke") && !f.versteckt) { const o = nahtRaupe(f); if (o) modell.add(o); }
        f._fahnen = ["a", "b"].map((sd) => nahtFahneDaten(f, sd)).filter(Boolean); for (const fd of f._fahnen) { if (!f.versteckt && !flachStand.has(fd.host)) modell.add(nahtFahneMesh(f, fd)); nahtFahneAbwicklung(f, fd); }
      } else if (f.typ === "stirnquetsch") { // Quetschfalte an der Ecke Stirnlasche + Wand eines Blechprofils (Rechnung beim Profil: stirnBerechnen)
        const z = finde(f.ziel); if (!z || !istProfil(z)) throw new Error("Das Blechprofil fehlt");
        if (doc.features.indexOf(z) > doc.features.indexOf(f)) throw new Error("Das Blechprofil muss vor diesem Schritt stehen");
        if (f._sqFehler) throw new Error(f._sqFehler);
      } else if (f.typ === "flanschende") { // Ende eines Flansches nachträglich ändern (rechtwinklig / bündig / Winkel, Versatz) – wirkt im Flächenblech (eckFaktoren)
        const z = finde(f.ziel); if (z?.typ !== "flaeche") throw new Error("Flächenblech fehlt");
        if (doc.features.indexOf(z) > doc.features.indexOf(f)) throw new Error("Das Flächenblech muss vor diesem Schritt stehen");
      } else if (f.typ === "profilkante") { // Flansch/Umschlag/Baustein, nachträglich an Kante A oder B eines Blechprofils – wirkt im Profil (profilErweiterungen)
        const z = finde(f.ziel); if (!z || (z.typ !== "profil" && z.typ !== "vorlage" && z.typ !== "blech")) throw new Error("Das Blechprofil fehlt");
        if (doc.features.indexOf(z) > doc.features.indexOf(f)) throw new Error("Das Blechprofil muss vor diesem Schritt stehen");
      } else if (f.typ === "eindeckung") { // Ziegel einzeln eindecken – nach den Spenglerblechen: die Ziegel werden an Kehle, Anschlüssen und Öffnungen geschnitten
        f._ziegel = null; const d = finde(f.dach); if (d?.typ !== "dach" || !d._dach) throw new Error("Dach fehlt – das Dach muss vor der Eindeckung stehen und fehlerfrei sein");
        if (doc.features.indexOf(d) > doc.features.indexOf(f)) throw new Error("Das Dach muss vor der Eindeckung stehen");
        const dk = deckungVon(d), D = d._schichten?.liste.find((l) => l.id === "deckung"); if (!D) throw new Error("Der Dachaufbau hat keine Deckung");
        const bl = doc.features.find((x) => x.typ === "dachbleche" && x.dach === d.id && !x._aus && doc.features.indexOf(x) < doc.features.indexOf(f)); f._ohneBleche = !bl; const formen = bl?._formen || [];
        const luks = doc.features.filter((x) => x.typ === "lukarne" && x.dach === d.id && !x._aus && d._dach.flaechen[x.flaeche]), els = doc.features.filter((x) => x.typ === "dachelement" && x.dach === d.id && !x._aus && d._dach.flaechen[x.flaeche]);
        const prismen = []; let anz = 0, gesch = 0;
        const decke = (fl, opt) => { const r = eindeckungKern(fl, { deckung: dk, ...opt }); for (const p of r.prismen) prismen.push(ziegelPrisma(r.S, p, D, dk)); anz += r.anzahl; gesch += r.geschnitten; };
        d._dach.flaechen.forEach((fl, i) => decke(fl, { sperr: formen.filter((fo) => (fo.flaeche === i && fo.art === "kehle") || fo.hauptFlaeche === i && fo.ziel === "haupt").map((fo) => fo.punkte),
          ausschnitte: [...els.filter((x) => x.flaeche === i).map((x) => { const q = elementRechteck(fl, x); return { s0: q.s0, s1: q.s1, t0: q.t0, t1: q.t1 }; }), ...luks.filter((x) => x.flaeche === i).flatMap((x) => { try { return [lukarneGeo(fl, x, 0).rect]; } catch { return []; } })] }));
        for (const x of luks) { try { const lk = x._lukK?.lk || lukarneGeo(d._dach.flaechen[x.flaeche], x, 0); for (const j of lk.idx.dach) decke({ punkte: lk.formen[j].punkte, normale: lk.formen[j].normale }, { sperr: formen.filter((q) => q.lukId === x.id && q.ziel === j).map((q) => q.punkte) }); } catch {} }
        f._ziegel = { anzahl: anz, geschnitten: gesch, richtwert: d._mengen?.ziegel ?? 0, deckung: dk.name };
        const gd = finde(d.gebaeude); if (!f.versteckt && gd && prismen.length) { const [zg, , , zk] = dachZiegelGeo(prismen, gd); modell.add(koerperMesh(zg, /biber/.test(dk.art || "") ? 0xa04a35 : 0xb5543a, f.id, zk)); }
      } else if (f.typ === "dachelement") { // Dachfenster / Kamin auf einer Dachfläche (Öffnung, Wechsel, Anschlussbleche)
        f._rect = null; const d = finde(f.dach); if (d?.typ !== "dach" || !d._dach) throw new Error("Dach fehlt");
        const fl = d._dach.flaechen[f.flaeche]; if (!fl) throw new Error("Diese Dachfläche gibt es nicht (mehr) – andere Fläche wählen");
        if (!(f.b > 0 && f.h > 0)) throw new Error("Breite und Höhe/Tiefe müssen grösser als 0 sein");
        const ek = elementKoerper(fl, f, d._schichten?.oben ?? 0); f._rect = ek.rect;
        if (!ek.rect.innen) throw new Error("Das Element ragt über den Rand der Dachfläche – verschieben oder verkleinern");
        const gd = finde(d.gebaeude); if (!f.versteckt && gd) modell.add(koerperMesh(dachBoxenGeo([{ ecken: ek.ecken }], gd), f.art === "kamin" ? 0x8c8179 : 0x5f7f99, f.id, dachBoxenKanten([{ ecken: ek.ecken }], gd)));
      } else if (f.typ === "lukarne") { // Lukarne (Gaube) auf einer Dachfläche: Stirn, Wangen, Gaubendach; Öffnung im Hauptdach (Wechsel, Mengenabzug)
        f._luk = null; const d = finde(f.dach); if (d?.typ !== "dach" || !d._dach) throw new Error("Dach fehlt");
        const fl = d._dach.flaechen[f.flaeche]; if (!fl) throw new Error("Diese Dachfläche gibt es nicht (mehr) – andere Fläche wählen");
        const lk = lukarneGeo(fl, f, 0); f._luk = lk;
        if (!lk.innen) throw new Error(lk.hinweise.find((h) => /ragt über/.test(h)) || lk.hinweise[0]);
        const gd = finde(d.gebaeude), ko = f._lukK?.koerper;
        if (!f.versteckt && gd && ko) { zeigeDachKoerper(ko, gd, f.id); // gleicher Aufbau wie das Hauptdach (Sparren, Dämmung, Unterdach, Latten, Deckung)
          if (lk.fenster) { const o = d._schichten?.oben ?? 0, fp = lk.fenster.punkte.map((p) => p.map((v, i) => v + lk.fenster.normale[i] * (o + 5))); modell.add(koerperMesh(dachPlatte(fp, lk.fenster.normale, -70, gd), 0x6f93b0, f.id)); } }
      } else if (f.typ === "kante") { // Flansch/Umschlag/Baustein an einer Kante: wirkt über das Flächenblech (berechneKanten)
        const z = finde(f.ziel); if (z?.typ !== "flaeche") throw new Error("Flächenblech fehlt");
        if (doc.features.indexOf(z) > doc.features.indexOf(f)) throw new Error("Das Flächenblech muss vor diesem Schritt stehen");
      } else if (f.typ === "abwickeln") { // Unfold: das Blech liegt flach, bis «Falten» folgt – dazwischen schneiden Extrusionen (Ausschneiden) die Abwicklung
        const z = finde(f.ziel); if (z?.typ !== "flaeche" || !z._bleche) throw new Error("Flächenblech fehlt (Abwickeln braucht ein Flächenblech vor diesem Schritt)");
        if (flachStand.has(z.id)) throw new Error(`«${z.name}» ist schon abgewickelt`);
        const m = material(z.material), s0 = finde(z.skizze);
        for (const o of modell.children.filter((o) => o.isMesh && String(o.userData.fid).startsWith(z.id + ":"))) { modell.remove(o); o.traverse((c) => c.geometry?.dispose()); }
        flachStand.set(z.id, { schnitte: [] }); z._mitAbwicklung = true; z._flach = true;
        if (!z.versteckt) z._bleche.forEach((bl, i) => { bl.abw.loecher = [...(bl._eckLoecher || [])]; modell.add(flachKoerper(bl, blechEbene(s0.ebene, z, m), m, `${z.id}:${i}`, darstellungVon(z, m))); });
      } else if (f.typ === "falten") { // Refold: gefaltetes Blech zurück, die Ausschnitte der Abwicklung werden aufs gekantete Blech abgebildet
        const z = finde(f.ziel), st = z && flachStand.get(z.id); if (!st) throw new Error("Dieses Blech ist nicht abgewickelt (vorher «Abwickeln»)");
        const m = material(z.material), s0 = finde(z.skizze), seite = z.sichtseite === -1 ? -1 : 1;
        for (const o of modell.children.filter((o) => o.isMesh && String(o.userData.fid).startsWith(z.id + ":"))) { modell.remove(o); o.traverse((c) => c.geometry?.dispose()); }
        flachStand.delete(z.id); z._flach = false;
        z._bleche.forEach((bl, i) => {
          bl.abw.loecher = st.schnitte.filter((l) => boxUeberlappt(l, bl.abw.umriss));
          if (z.versteckt) return;
          const eb = blechEbene(s0.ebene, z, m), teile = flaechenKoerper(bl, eb, m, seite, `${z.id}:${i}`, darstellungVon(z, m));
          let hinweis = null; if (bl.abw.loecher.length) try { schneideAus(teile, bl, bl.abw.loecher, eb, m, seite); } catch (e) { hinweis = e.message; }
          teile.forEach((o) => modell.add(o)); if (hinweis) f._fehler = hinweis;
          for (const nx of doc.features) if (doc.features.indexOf(nx) < doc.features.indexOf(f) && nx.typ === "naht" && !nx._aus && !nx.versteckt && nx._fahnen?.length) for (const fd of nx._fahnen) if (fd.host === z.id && String(fd.hostFid) === `${z.id}:${i}`) modell.add(nahtFahneMesh(nx, fd)); // Nahtfahnen bleiben im gefalteten Blech erhalten
          if ((z.eckEntl && z.eckEntl !== "keine") || (z.freistellung !== "keine" && ["gehrung", "gehrung45"].includes(z.ecken || "gehrung"))) eckenEntlastung(z, bl, m, s0); // Eckfreistellung wie im Grundkörper (schneidet das gefaltete Blech, Loch steht wieder in der Abwicklung)
        });
      } else if (f.typ === "rundblech") { // Zylinder-/Kegelmantel: exakte Abwicklung (kern/abwicklungRund.js), 3D als Drehkörper
        const m = material(f.material), kegel = f.art !== "zylinder";
        if (!(f.d1 > m.t && f.h > 0) || (kegel && !(f.d2 >= 0)) || !(f.winkel > 0 && f.winkel <= 360)) throw new Error("Durchmesser, Höhe und Winkel prüfen (Winkel 1–360°)");
        f._rund = rundblechAbwicklung({ art: kegel && Math.abs(f.d1 - f.d2) > 1e-9 ? "kegel" : "zylinder", d1: f.d1, d2: kegel ? f.d2 : f.d1, h: f.h, t: m.t, k: m.k, winkel: f.winkel, zugabe: (+f.zugabe || 0) + rundNahtZugabe(f, m), neigung: kegel ? 0 : +f.neigung || 0 });
        if (!f.versteckt) { const mesh = koerperMesh(rundGeometrie(f, m), darstellungVon(f, m), f.id); if (rohrNeigung(f)) verknuepfe(mesh, rohrSchnittWerkzeug(f), "ausschneiden"); modell.add(mesh); for (const o of rundNahtStreifen(f, m)) modell.add(o); }
      } else if (f.typ === "detail") {
        f._teile = null; throw new Error("Spenglerdetails gibt es nicht mehr – als Flächenblech mit Kantenbausteinen zeichnen und dieses Feature löschen");
      } else if (f.typ === "profil") {
        if (!ebene(f.ebene)) throw new Error("Ebene fehlt");
        const m = material(f.material);
        if (f.zeilen.some((z) => !(z.L > 0))) throw new Error("Jeder Schenkel braucht eine Länge grösser als 0");
        const { start, ops } = profilErweitern(freiesProfil(f.start, f.zeilen, m), profilErweiterungen(f, m), m);
        f._res = berechne(start, ops, m.t, m.ri, m.k);
        f._kernLage = null; stirnBerechnen(f, m);
        if (!f.versteckt) { const vz = daneben(f._res); f._kernLage = { ebene: E_(f.ebene), versatz: vz }; wendeBisAn(f, f.ebene, vz); modell.add(koerper([konturForm(f._res, m.t, vz)], f.ebene, zweiseitig(f, "laenge", "laenge2").tiefe, zweiseitig(f, "laenge", "laenge2").richtung, darstellungVon(f, m), f.id, stirnWandVor(f, vz, zweiseitig(f, "laenge", "laenge2")))); }
        stirnAnhaengen(f, m, f.ebene, f._kernLage?.versatz ?? [0, 0]);
      }
    } catch (e) { f._fehler = e.message; }
  }
  wendeKomponentenLageAn();
  ebenenGroesse();
  zeigeKanten();
  try { if (schnitt) zeigeKappen(renderer.clippingPlanes[0]); } catch {} // gefüllte Schnittfläche neu (beim Start noch nicht da)
  markiere();
  zeigeBrowser(); zeigeZeit(); zeigeWerkstatt();
  speichern(); merke();
  if (dlg?.info) { const t = dlg.info(); $("dInfo").textContent = t; $("dInfo").className = t.startsWith("⚠") ? "fehler" : ""; }
  dlg?.nachRegen?.(); zeichneGriffe(); if (modus2d) for (const o of modell.children) if (o.isMesh) o.visible = false;
  exaktPlanen(); // exakter CAD-Kern (nur wenn eingeschaltet): Netze durch exakte Körper ersetzen
  try { simulation?.nachRegen(); } catch {}
}

// ------------------------------------------------------------ Rückgängig / Wiederholen
// Nach jedem abgeschlossenen Schritt (nicht während Dialog oder Skizze) wird der Projektzustand gemerkt.
const verlauf = { stapel: [], namen: [], pos: -1 };
// Beschriftung eines Schritts: was gegenüber dem vorigen Stand neu, geändert oder gelöscht ist
function verlaufName(a, b) {
  try { const A = JSON.parse(a), B = JSON.parse(b), ia = new Map(A.features.map((f) => [f.id, JSON.stringify(f)]));
    for (const f of B.features) { if (!ia.has(f.id)) return `Neu: ${f.name}`; if (ia.get(f.id) !== JSON.stringify(f)) return `Geändert: ${f.name}`; }
    for (const f of A.features) if (!B.features.some((x) => x.id === f.id)) return `Gelöscht: ${f.name}`;
    return "Dokument geändert"; } catch { return "Änderung"; }
}
const zustand = () => JSON.stringify(doc, (k, v) => (k.startsWith("_") ? undefined : v));
function merke() {
  // nicht während Dialog/Skizze und nicht für eine eben angelegte, noch leere Skizze
  if (dlg || skizze || doc.features.some((f) => f.typ === "skizze" && !f.elemente.length)) return zeigeVerlauf();
  const z = zustand();
  if (z !== verlauf.stapel[verlauf.pos]) {
    const vorher = verlauf.stapel[verlauf.pos], name = vorher === undefined ? "Start" : verlaufName(vorher, z);
    verlauf.stapel.splice(verlauf.pos + 1, Infinity, z); verlauf.namen.splice(verlauf.pos + 1, Infinity, name);
    if (verlauf.stapel.length > 200) { verlauf.stapel.shift(); verlauf.namen.shift(); }
    verlauf.pos = verlauf.stapel.length - 1;
  }
  zeigeVerlauf();
}
function springe(d) {
  const i = verlauf.pos + d;
  if (dlg || skizze || i < 0 || i >= verlauf.stapel.length) return;
  verlauf.pos = i; doc = JSON.parse(verlauf.stapel[i]);
  if (!finde(auswahl) && !hauptVon(auswahl)) auswahl = null;
  $("aObjekt").value = doc.objekt; $("aNr").value = doc.nr; $("aModell").value = doc.modellName || "";
  regen(); status(d < 0 ? "Rückgängig gemacht." : "Wiederhergestellt."); $("verlaufMenue").hidden = true;
}
function zeigeVerlauf() {
  const gesperrt = !!(dlg || skizze);
  $("zurueck").disabled = gesperrt || verlauf.pos <= 0;
  $("vor").disabled = gesperrt || verlauf.pos >= verlauf.stapel.length - 1;
}
// Verlaufsliste: zu jedem früheren Stand springen
$("verlaufBtn").onclick = (e) => {
  e.stopPropagation(); const m = $("verlaufMenue"); if (!m.hidden) { m.hidden = true; return; }
  const n = verlauf.stapel.length; m.innerHTML = n ? [...Array(n).keys()].reverse().map((i) => `<button data-i="${i}" class="${i === verlauf.pos ? "jetzt" : ""}"><b>${esc(verlauf.namen[i] || "Änderung")}</b><small>${i === verlauf.pos ? "aktueller Stand" : i < verlauf.pos ? "zurückgehen" : "wiederherstellen"} · Schritt ${i + 1}</small></button>`).join("") : '<p class="hinweis">Noch keine Änderungen.</p>';
  const r = $("verlaufBtn").getBoundingClientRect(); Object.assign(m.style, { right: Math.max(8, innerWidth - r.right) + "px", left: "auto", bottom: innerHeight - r.top + 6 + "px", top: "auto" }); m.hidden = false; m.querySelector(".jetzt")?.scrollIntoView({ block: "center" });
};
$("verlaufMenue").onclick = (e) => { const i = e.target.closest("button")?.dataset.i; if (i == null) return; $("verlaufMenue").hidden = true; springe(+i - verlauf.pos); };
document.addEventListener("click", (e) => { if (!e.target.closest?.("#verlaufMenue, #verlaufBtn")) $("verlaufMenue").hidden = true; });
$("zurueck").onclick = () => springe(-1);
$("vor").onclick = () => springe(1);
document.addEventListener("keydown", (e) => {
  if (!(e.ctrlKey || e.metaKey) || skizze || e.target.closest?.("input,select,textarea")) return;
  const k = e.key.toLowerCase();
  if (k === "z" && !e.shiftKey) { e.preventDefault(); springe(-1); }
  else if (k === "y" || (k === "z" && e.shiftKey)) { e.preventDefault(); springe(1); }
});

function markiere() {
  zeigeKanten();
  modell.children.forEach((o) => {
    if (o.isMesh) o.material.emissive?.setHex(o.userData.fid === auswahl || String(o.userData.fid).startsWith(auswahl + ":") ? 0x1d5c4f : 0x000000);
    else if (o.userData.ebene) o.children[0].material.opacity = o.userData.ebene === auswahl ? 0.42 : 0.2;
  });
  zeigeRichtung();
}

// Gewähltes Blechprofil aus Skizze: Linienzug, Kante A (grün) und Zeichenrichtung (Pfeil),
// damit «Blech links/rechts der Linie» eindeutig ist
const richtung = new THREE.Group(); szene.add(richtung);
function zeigeRichtung() {
  leeren(richtung);
  const f = finde(auswahl);
  if (!f?._linie || skizze) return;
  const { pts, ebene } = f._linie, p3 = pts.map((p) => zu3D(ebene, p));
  const ohneTiefe = (m) => Object.assign(m, { depthTest: false, transparent: true });
  const linie = new THREE.Line(new THREE.BufferGeometry().setFromPoints(p3), ohneTiefe(new THREE.LineBasicMaterial({ color: 0x1d8fff })));
  // Punkt und Pfeil in Einheitsgrösse; die Bildschleife skaliert sie nach Kameraabstand (immer gleich gross sichtbar)
  const punkt = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 12), ohneTiefe(new THREE.MeshBasicMaterial({ color: 0x2e9b4f })));
  punkt.position.copy(p3[0]); punkt.userData.bildschirm = 0.008;
  const pfeil = new THREE.ArrowHelper(p3[1].clone().sub(p3[0]).normalize(), p3[0], 1, 0x1d8fff, 0.35, 0.22);
  pfeil.traverse((o) => { if (o.material) ohneTiefe(o.material); });
  pfeil.userData.bildschirm = 0.07;
  [linie, punkt, pfeil].forEach((o) => { o.renderOrder = 12; richtung.add(o); });
}
const richtungSkalieren = () => [...richtung.children, ...(typeof messGruppe === "undefined" ? [] : messGruppe.children)].forEach((o) => {
  if (o.userData.bildschirm) o.scale.setScalar(kamera.position.distanceTo(o.position) * o.userData.bildschirm);
});

// Browser ein-/ausklappen (Kopfzeile antippen)
document.querySelector(".browser .ptitel").addEventListener("click", () => document.querySelector(".browser").classList.toggle("zu"));
// ------------------------------------------------------------ Browser und Zeitleiste
const NAMEN = { loftflansch: "Lofted Flange", rip: "Rip (Auftrennen)", biegung: "Biegung an Linie", skalieren: "Skalieren", bohrung: "Bohrung", rohr: "Rohr", spirale: "Spirale", rippe: "Rippe", quetschfalte: "Quetschfalte", flanschende: "Flanschende", stirnquetsch: "Quetschfalte (Stirn)", naht: "Naht", profilkante: "Profilkante", eindeckung: "Eindeckung", lukarne: "Lukarne", dachelement: "Dachfenster/Kamin", dachbleche: "Dachbleche", dach: "Dach", gebaeude: "Gebäude", kante: "Kante", abwickeln: "Abwickeln", falten: "Falten", detail3d: "3D-Detail", rundblech: "Rund-/Kegelblech", kehle: "Kehle/Grat", kanten3d: "Kanten abrunden", bild: "Bild", import: "Import", kantenrund: "Abrunden/Fasen", schale: "Schale", kmuster: "Muster", kspiegel: "Spiegeln", teilen: "Teilen", bewegen: "Verschieben", sweep: "Sweep", loft: "Übergang", achse: "Achse", konpunkt: "Punkt", skizze: "Skizze", extrusion: "Extrusion", drehung: "Drehung", blech: "Blechprofil", vorlage: "Vorlage", profil: "Freies Profil", detail: "Spenglerdetail", flaeche: "Flächenblech" };
const AUGE = (zu) => `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>${zu ? '<path d="M4 4l16 16"/>' : ""}</svg>`;
// Hinweisblase für Kennzeichen im Browser («≈» = Näherung/teilweise exakt): erscheint beim Darüberfahren (Maus, Stift-Schweben) und beim Antippen
{
  let blase = null, zeitweg = 0;
  const zu = () => { blase?.remove(); blase = null; clearTimeout(zeitweg); };
  const zeige = (el) => {
    zu(); const t = el.dataset.hinweis; if (!t) return;
    blase = document.createElement("div"); blase.className = "hinweisblase"; blase.setAttribute("role", "tooltip"); blase.textContent = t; document.body.appendChild(blase);
    const r = el.getBoundingClientRect(), b = blase.getBoundingClientRect(); blase.style.left = Math.max(8, Math.min(innerWidth - b.width - 8, r.right + 8)) + "px"; blase.style.top = Math.max(8, Math.min(innerHeight - b.height - 8, r.top - 4)) + "px";
    zeitweg = setTimeout(zu, 9000);
  };
  document.addEventListener("pointerover", (e) => { const g = e.target.closest?.(".gen[data-hinweis]"); if (g) zeige(g); });
  document.addEventListener("pointerout", (e) => { if (e.target.closest?.(".gen[data-hinweis]") && e.pointerType !== "touch") zu(); });
  document.addEventListener("click", (e) => { const g = e.target.closest?.(".gen[data-hinweis]"); if (g) { e.stopPropagation(); e.preventDefault(); zeige(g); } else zu(); }, true);
}
function zeigeBrowser() {
  aktualisiereGenauigkeit();
  const KON = ["ebene", "achse", "konpunkt", "bild"];
  const eb = doc.features.filter((f) => KON.includes(f.typ)), sk = doc.features.filter((f) => f.typ === "skizze"), kp = doc.features.filter((f) => f.typ !== "skizze" && !KON.includes(f.typ) && !(["extrusion", "drehung", "sweep", "loft", "rohr", "spirale", "rippe"].includes(f.typ) && (f.vorgang || "neu") !== "neu") && f.typ !== "bohrung" && f.typ !== "biegung" && f.typ !== "rip" && !(f.typ === "skalieren" && !f.kopie) && f.typ !== "abwickeln" && f.typ !== "falten" && f.typ !== "kante" && f.typ !== "profilkante" && f.typ !== "quetschfalte" && f.typ !== "naht" && f.typ !== "flanschende" && f.typ !== "stirnquetsch"); // Flansche/Kanten/Falten/Flanschenden gehören zum Blech (nur Zeitleiste); Ausschnitte/Vereinigungen sind keine eigenen Körper (nur in der Zeitleiste)
  const zeile = (f, typ) => `<li data-id="${f.id}" class="${f.id === auswahl ? "aktiv" : ""}${f._aus ? " aus" : ""}${f.versteckt ? " verborgen" : ""}"><button class="auge${f.versteckt ? " zu" : ""}" data-auge="${f.id}" aria-label="${f.versteckt ? "Einblenden" : "Ausblenden"}" title="${f.versteckt ? "Einblenden" : "Ausblenden"}">${AUGE(f.versteckt)}</button><span class="typ ${typ}"></span><span class="nm">${f.name}${f._fehler ? " ⚠" : ""}</span>${f._genau && f._genau.klasse !== "exact" && f.typ !== "skizze" ? `<span class="gen gen-${f._genau.klasse}" tabindex="0" role="img" data-hinweis="${esc(`${GENAU_TEXT[f._genau.klasse]}: ${f._genau.grund}`)}" aria-label="${esc(`${GENAU_TEXT[f._genau.klasse]}: ${f._genau.grund}`)}">≈</span>` : ""}</li>`;
  $("baum").innerHTML = (eb.length ? `<li class="kopf">Konstruktion</li>${eb.map((f) => zeile(f, f.typ === "ebene" ? "ebene" : f.typ)).join("")}` : "") + `<li class="kopf">Skizzen</li>${sk.map((f) => zeile(f, "skizze")).join("") || '<li class="hinweis">Noch keine</li>'}
    <li class="kopf">Körper</li>${kp.filter((f) => !f.komponente).map((f) => zeile(f, f.typ === "extrusion" ? "koerper" : "blech")).join("") || (kp.length ? "" : '<li class="hinweis">Noch keine</li>')}` +
    // Komponenten (wie in Fusion): Körper zu Baugruppen zusammenfassen, gemeinsam ein-/ausblenden
    [...new Set(kp.map((f) => f.komponente).filter(Boolean))].map((k) => { const fs = kp.filter((f) => f.komponente === k), aus = fs.every((f) => f.versteckt);
      return `<li class="komp${aus ? " verborgen" : ""}" data-komp="${esc(k)}"><button class="auge${aus ? " zu" : ""}" data-kompauge="${esc(k)}" aria-label="${aus ? "Einblenden" : "Ausblenden"}" title="${aus ? "Einblenden" : "Ausblenden"}">${AUGE(aus)}</button><span class="typ komponente"></span><span class="nm">${esc(k)} <small>(${fs.length})</small></span></li>` +
        fs.map((f) => zeile(f, f.typ === "extrusion" ? "koerper" : "blech").replace("<li ", '<li style="padding-left:22px" ')).join(""); }).join("");
}
$("baum").addEventListener("click", (e) => {
  const ab = e.target.closest("button.auge"), auge = ab?.dataset.auge;
  if (auge) { const f = finde(auge); f.versteckt = !f.versteckt; regen(); return; }
  const ka = ab?.dataset.kompauge;
  if (ka != null) { const fs = doc.features.filter((f) => f.komponente === ka), aus = fs.every((f) => f.versteckt); fs.forEach((f) => (f.versteckt = !aus)); regen(); return; }
  const id = e.target.closest("li")?.dataset.id;
  if (id) waehle(id);
});
$("baum").addEventListener("dblclick", (e) => {
  const k = e.target.closest("li.komp")?.dataset.komp;
  if (k != null) { const n = prompt("Komponente umbenennen", k); if (n?.trim()) { doc.features.forEach((f) => { if (f.komponente === k) f.komponente = n.trim(); }); regen(); } }
});
$("baum").addEventListener("dblclick", (e) => { const id = e.target.closest("li")?.dataset.id; if (id) bearbeite(finde(id)); });

// Zeitleiste: Symbole statt Namen (Name erscheint beim Überfahren)
const ZEIT_ICON = {
  loftflansch: '<path d="M3 18c4 0 5-12 9-12s5 12 9 12"/><path d="M3 21h18"/>', rip: '<path d="M3 12h7l2-3 2 6 2-3h5"/>', biegung: '<path d="M3 17h8l6-9h4"/>', skalieren: '<rect x="4" y="10" width="8" height="8"/><rect x="4" y="4" width="16" height="16" stroke-dasharray="2 2"/>', bohrung: '<circle cx="12" cy="12" r="4"/><path d="M12 2v4M12 18v4"/>', rohr: '<path d="M4 18h8a4 4 0 0 0 4-4V6"/>', spirale: '<path d="M6 20c8 0 8-4 0-4s-8-4 0-4 8-4 0-4"/>', rippe: '<path d="M4 20h16M12 20V6"/>',
  skizze: '<path d="M4 17l4-7 3 4 4-6"/><circle cx="4" cy="17" r="1.3"/><circle cx="15" cy="8" r="1.3"/>', extrusion: '<path d="M4 15l8 4 8-4-8-4z"/><path d="M12 11V3M9 6l3-3 3 3"/>', drehung: '<path d="M12 3v18" stroke-dasharray="2 2.5"/><path d="M12 7h5c1.4 3.5 1.4 6.5 0 10h-5z"/>', sweep: '<path d="M5 18c0-7 5-10 14-12" stroke-dasharray="2 2.5"/><rect x="3" y="16" width="5" height="5" rx=".8"/>', loft: '<rect x="3" y="16" width="18" height="4" rx="1"/><ellipse cx="12" cy="6" rx="5" ry="2.5"/><path d="M3 17L7 7M21 17l-4-10"/>',
  blech: '<path d="M3 17h5l5-9h8"/>', vorlage: '<path d="M3 17h5l5-9h8"/>', profil: '<path d="M3 17h5l5-9h8"/>', flaeche: '<path d="M4 8l8-4 8 4-8 4z"/><path d="M4 8v8l8 4 8-4V8"/>', kante: '<path d="M4 18h10a4 4 0 0 0 0-8H8"/>', profilkante: '<path d="M4 18h10a4 4 0 0 0 0-8H8"/>', naht: '<path d="M3 15h8l2 3h8M3 9h8l2-3h8"/>', stirnquetsch: '<path d="M4 18h12V6"/><path d="M16 18L8 10" stroke-dasharray="2 2"/>', flanschende: '<path d="M4 18h10l4-9"/><path d="M14 18l4-9" stroke-dasharray="2 2"/>', quetschfalte: '<path d="M4 20V8l8 4 8-4v12z"/><path d="M12 12v8"/>',
  dach: '<path d="M3 12l9-8 9 8"/><path d="M6 11v8h12v-8"/>', gebaeude: '<path d="M5 20V9l7-5 7 5v11z"/>', dachbleche: '<path d="M3 12l9-8 9 8"/><path d="M7 12l5-4 5 4"/>', eindeckung: '<path d="M3 12l9-8 9 8"/><path d="M6 14h12M8 17h8"/>', dachelement: '<path d="M3 12l9-8 9 8"/><rect x="9" y="11" width="6" height="5"/>', lukarne: '<path d="M3 12l9-8 9 8"/><path d="M9 20v-6l3-3 3 3v6z"/>',
  ebene: '<path d="M3 16l5-8h13l-5 8z"/>', achse: '<path d="M4 20L20 4" stroke-dasharray="3 2"/>', konpunkt: '<circle cx="12" cy="12" r="2.5"/>', kmuster: '<rect x="3" y="3" width="6" height="6"/><rect x="14" y="3" width="6" height="6"/><rect x="3" y="14" width="6" height="6"/><rect x="14" y="14" width="6" height="6"/>', schale: '<path d="M4 8l8-4 8 4v8l-8 4-8-4z"/><path d="M8 10l4-2 4 2v4l-4 2-4-2z"/>', kantenrund: '<path d="M4 20V8a4 4 0 0 1 4-4h12"/>', kanten3d: '<path d="M4 20V8a4 4 0 0 1 4-4h12"/>', teilen: '<path d="M4 12h16" stroke-dasharray="3 2"/><rect x="5" y="4" width="14" height="16" rx="1"/>', abwickeln: '<path d="M4 6h16v12H4z"/><path d="M9 6v12M15 6v12" stroke-dasharray="2 2"/>', falten: '<path d="M4 6l6 3v9l-6-3zM10 9l6-3 4 2v9l-4-2-6 3"/>', rundblech: '<ellipse cx="12" cy="8" rx="6" ry="3"/><path d="M6 8l-2 10h16L18 8"/>', bild: '<rect x="3" y="5" width="18" height="14" rx="1"/><circle cx="9" cy="10" r="1.5"/><path d="M4 18l5-5 4 3 3-3 4 4"/>', import: '<path d="M12 3v12M8 11l4 4 4-4M5 20h14"/>'
};
const zeitIcon = (typ) => `<svg class="zi" viewBox="0 0 24 24" aria-hidden="true">${ZEIT_ICON[typ] || '<rect x="5" y="5" width="14" height="14" rx="2"/>'}</svg>`;
// Ohne zugeordnetes Projekt arbeitet man normal weiter; einmal je Sitzung kommt nach dem ersten Schritt ein Hinweis mit Knopf «Projekt wählen»
let projektHinweisGezeigt = false;
function projektHinweis() {
  if (projektHinweisGezeigt || doc.appProjekt || !doc.features.length || new URLSearchParams(location.search).has("test")) return;
  projektHinweisGezeigt = true; zeigeMeldung("Kein Projekt zugeordnet – das Modell wird ohne Projekt gespeichert.", "info", 12000, { text: "Projekt wählen", fn: () => projekte.oeffnen() });
}
function zeigeZeit() {
  const m = doc.marke ?? doc.features.length;
  const zieh = maus() ? ' draggable="true"' : ""; // Finger: kein HTML5-Ziehen (Langdruck öffnet das Menü mit «nach links/rechts», Marke über die Pfeile)
  const knopf = (f) => `<button data-id="${f.id}" data-name="${esc(f.name)}"${zieh} class="${f._aus ? "aus " + f._aus : ""}${f._fehler ? " fehler" : ""}" aria-label="${esc(f.name)}" title="${esc(f.name + (f._fehler ? " – ⚠ " + f._fehler : f._aus === "unterdrueckt" ? " – unterdrückt" : f._aus ? " – zurückgerollt" : ""))}">${zeitIcon(f.typ)}<span class="zn">${esc(f.name)}</span>${f._fehler ? '<i class="zw">!</i>' : ""}</button>`;
  const marke = `<span class="marke"${zieh} title="Rückrollmarke: ziehen oder Rechtsklick auf ein Feature → «Bis hier zurückrollen»"></span>`;
  $("zeit").innerHTML = doc.features.length ? [...doc.features.slice(0, m).map(knopf), marke, ...doc.features.slice(m).map(knopf)].join("")
    : '<span class="hinweis">Leer: mit «Skizze» oder «Spengler-Vorlage» beginnen</span>';
  $("rueckgaengig").disabled = !doc.features.length || !!skizze;
  $("zeitZurueck").disabled = m <= 0 || !doc.features.length; $("zeitVor").disabled = doc.marke == null;
  projektHinweis();
}
const zeitTip = document.body.appendChild(Object.assign(document.createElement("div"), { className: "zeitTip", hidden: true }));
$("zeit").addEventListener("pointerover", (e) => { const b = e.target.closest("button[data-name]"); if (!b) return; zeitTip.textContent = b.dataset.name; zeitTip.hidden = false; const r = b.getBoundingClientRect(), t = zeitTip.getBoundingClientRect(); zeitTip.style.left = Math.max(6, Math.min(r.left + r.width / 2 - t.width / 2, innerWidth - t.width - 6)) + "px"; zeitTip.style.top = r.top - t.height - 8 + "px"; });
let zeitTipZeit = 0;
$("zeit").addEventListener("pointerover", (e) => { if (e.pointerType === "touch") { clearTimeout(zeitTipZeit); zeitTipZeit = setTimeout(() => (zeitTip.hidden = true), 1800); } });
$("zeit").addEventListener("pointerout", (e) => { if (e.pointerType !== "touch" && e.target.closest("button[data-name]")) zeitTip.hidden = true; }); // Finger: Name bleibt kurz stehen
// Unerwartete Fehler: nie stumm bleiben – Stand sichern und verständlich melden (höchstens alle 10 s, Browser-Rauschen ignorieren)
{ let letzte = 0;
  const melden = (text) => { text = String(text ?? "").trim(); if (!text || /ResizeObserver|^Script error|AbortError|cancel/i.test(text) || Date.now() - letzte < 10000) return; letzte = Date.now();
    try { speichern(); } catch {} zeigeMeldung(`Unerwarteter Fehler: ${text.slice(0, 140)}. Dein Modell ist automatisch gesichert – mit «Rückgängig» oder nach einem Neustart geht es weiter.`, "warn", 12000); };
  addEventListener("error", (e) => melden(e.message)); addEventListener("unhandledrejection", (e) => melden(e.reason?.message ?? e.reason)); }
fensterVerschieben(); fensterGroesse(); langdruck($("zeit"), "button[data-id]"); langdruck($("baum"), "li[data-id]"); tastaturSichtbar();
$("zeit").addEventListener("click", (e) => { const id = e.target.closest("button")?.dataset.id; const f = finde(id); if (!f) return; if (f._aus) return status(`«${f.name}» ist ${f._aus === "zurueck" ? "zurückgerollt – Marke dahinter ziehen" : "unterdrückt – Rechtsklick → Aktivieren"}.`); bearbeite(f); });
// Ziehen: Feature verschieben (nur wenn Bezüge davor bleiben) oder Rückrollmarke setzen
let gezogen = null;
$("zeit").addEventListener("dragstart", (e) => { gezogen = e.target.closest(".marke") ? "marke" : e.target.closest("button")?.dataset.id; e.dataTransfer.effectAllowed = "move"; e.dataTransfer.setData("text/plain", gezogen || ""); });
$("zeit").addEventListener("dragover", (e) => { if (gezogen) { e.preventDefault(); } });
$("zeit").addEventListener("drop", (e) => {
  e.preventDefault(); if (!gezogen || skizze || dlg) return;
  const knoepfe = [...$("zeit").querySelectorAll("button[data-id]")];
  let ziel = knoepfe.findIndex((b) => { const r = b.getBoundingClientRect(); return e.clientX < r.left + r.width / 2; }); if (ziel < 0) ziel = knoepfe.length;
  if (gezogen === "marke") { doc.marke = ziel >= doc.features.length ? null : ziel; gezogen = null; regen(); return status(doc.marke == null ? "Alle Features aktiv." : `Zurückgerollt vor «${doc.features[ziel].name}».`); }
  verschiebeFeature(finde(gezogen), ziel); gezogen = null;
});
function verschiebeFeature(f, ziel) {
  const von = doc.features.indexOf(f); if (von < 0) return;
  const liste = doc.features.filter((x) => x !== f), pos = ziel > von ? ziel - 1 : ziel;
  liste.splice(pos, 0, f);
  const davor = new Set(liste.slice(0, pos).map((x) => x.id));
  const fehlt = bezuegeVon(f).find((id) => !davor.has(id));
  if (fehlt) return status(`«${f.name}» braucht «${finde(fehlt).name}» – kann nicht davor stehen.`);
  const frueher = liste.slice(0, pos).find((x) => bezuegeVon(x).includes(f.id));
  if (frueher) return status(`«${frueher.name}» verwendet «${f.name}» – es muss davor bleiben.`);
  doc.features = liste; regen(); status(`«${f.name}» verschoben.`);
}
// Abwickeln / Falten wie Unfold / Refold in Fusion: Abwickeln · Skizze auf dem flachen Blech · Extrusion «Ausschneiden» · Falten
function abwickelnSchalten(f) {
  if (!f) { f = hauptVon(auswahl); if (f?.typ !== "flaeche" || f.versteckt) f = null; }
  if (!f) { if (skizze) return status("Erst die Skizze beenden."); if (dlg) $("dAbbrechen").click(); return starteBlechWahl("Abwickeln / Falten", "Flächenblech", (x) => x.typ === "flaeche" && istBlechWahl(x), (h) => abwickelnSchalten(h)); }
  if (skizze) return status("Erst die Skizze beenden.");
  if (dlg) $("dAbbrechen").click();
  const flach = istAbgewickelt(f);
  einfuegen({ id: neueId(), typ: flach ? "falten" : "abwickeln", name: `${flach ? "Falten" : "Abwickeln"} ${f.name}`, ziel: f.id }); regen();
  if (!flach) { const sk0 = finde(f.skizze), sk = { id: neueId(), typ: "skizze", name: `Skizze auf Abwicklung ${f.name}`, ebene: sk0.ebene, elemente: [] }; einfuegen(sk); regen();
    status("Abgewickelt: Skizze auf dem flachen Blech zeichnen, dann «Extrudieren › Ausschneiden» (Richtung symmetrisch oder Abstand > Blechdicke) und zuletzt «Abwickeln / Falten» erneut (Falten)."); return starteSkizze(sk); }
  status("Gefaltet: die Ausschnitte der Abwicklung sind im gekanteten Blech.");
}
$("wAbwickeln").onclick = () => abwickelnSchalten();
$("wDachAuto").onclick = () => { if (dlg) $("dAbbrechen").click(); if (skizze) return status("Erst die Skizze beenden."); dachDialog(); };
$("wDachBleche").onclick = () => { if (dlg) $("dAbbrechen").click(); if (skizze) return status("Erst die Skizze beenden."); dachblecheDialog(); };
$("wDachElement").onclick = () => { if (dlg) $("dAbbrechen").click(); if (skizze) return status("Erst die Skizze beenden."); dachelementDialog(); };
$("wEindeckung").onclick = () => { if (dlg) $("dAbbrechen").click(); if (skizze) return status("Erst die Skizze beenden."); eindeckungDialog(); };
$("wLukarne").onclick = () => { if (dlg) $("dAbbrechen").click(); if (skizze) return status("Erst die Skizze beenden."); lukarneDialog(); };
$("wGebaeude").onclick = () => { if (dlg) $("dAbbrechen").click(); if (skizze) return status("Erst die Skizze beenden."); gebaeudeDialog(); };
$("wTeilMenue").onclick = () => { const f = hauptVon(auswahl); if (!f) return status("Zuerst ein Teil im Browser, in der Zeitleiste oder in der Ansicht anwählen."); const r = $("wTeilMenue").getBoundingClientRect(); featureMenue(f, r.left, r.bottom + 6); };
// Ist das Flächenblech gerade abgewickelt? (letzter Abwickeln/Falten-Schritt für dieses Blech ist «Abwickeln»)
const istAbgewickelt = (f) => doc.features.filter((x) => (x.typ === "abwickeln" || x.typ === "falten") && x.ziel === f.id && !x.unterdrueckt).at(-1)?.typ === "abwickeln";
// Kontextmenü (Rechtsklick oder langes Antippen) in Zeitleiste und Browser
function featureMenue(f, x, y) {
  const m = $("featureMenue"), i = doc.features.indexOf(f);
  const punkte = [...((f.typ === "kante" || f.typ === "profilkante") ? [["kumk", "Richtung umkehren"]] : []), ...(f.typ === "flaeche" ? [["abw", istAbgewickelt(f) ? "Falten (zurück in Form)" : "Abwickeln (flach bearbeiten) …"]] : []), ["bearb", "Bearbeiten"], ["umbenennen", "Umbenennen …"], ["unter", f.unterdrueckt ? "Aktivieren" : "Unterdrücken"],
    ["zurueck", "Bis hier zurückrollen (danach aus)"], ["ende", "Alle aktivieren (Marke ans Ende)"], ["links", "Nach vorne verschieben"], ["rechts", "Nach hinten verschieben"],
    ...(["skizze", "ebene", "achse", "konpunkt"].includes(f.typ) ? [] : [["darst", "Darstellung …"]]),
    ...(["skizze", "ebene", "achse", "konpunkt"].includes(f.typ) ? [] : [["kompNeu", "Eigene Komponente aus diesem Teil"], ["komp", f.komponente ? `Komponente «${esc(f.komponente)}» ändern …` : "In Komponente …"], ...(f.komponente ? [["kompAus", "Aus Komponente herauslösen"], ["kompLage", `Komponente «${esc(f.komponente)}» verschieben / drehen …`], ["kompName", "Komponente umbenennen …"], ["kompLoesen", "Komponente auflösen"]] : [])]), ["kopie", "Duplizieren"], ["weg", "Löschen"]];
  m.innerHTML = punkte.map(([k, t]) => `<button data-fm="${k}" ${(k === "links" && i === 0) || (k === "rechts" && i === doc.features.length - 1) || (k === "ende" && doc.marke == null) ? "disabled" : ""}>${t}</button>`).join("");
  m.dataset.id = f.id; m.hidden = false;
  Object.assign(m.style, { left: Math.min(x, innerWidth - 240) + "px", top: Math.min(y, innerHeight - 330) + "px" });
}
$("baum").addEventListener("contextmenu", (e) => {
  const k = e.target.closest("li.komp")?.dataset.komp; if (k == null || skizze) return;
  e.preventDefault(); e.stopImmediatePropagation(); const m = $("featureMenue");
  m.innerHTML = `<button data-komphan="lage">Verschieben / Drehen …</button><button data-komphan="name">Umbenennen …</button><button data-komphan="loesen">Komponente auflösen</button>`;
  m.dataset.komp = k; m.dataset.id = ""; m.hidden = false; Object.assign(m.style, { left: Math.min(e.clientX, innerWidth - 240) + "px", top: Math.min(e.clientY, innerHeight - 160) + "px" });
});
for (const box of ["zeit", "baum"]) $(box).addEventListener("contextmenu", (e) => {
  const id = e.target.closest("[data-id]")?.dataset.id, f = finde(id); if (!f || skizze) return;
  e.preventDefault(); featureMenue(f, e.clientX, e.clientY);
});
document.addEventListener("click", (e) => { if (e.target.isConnected && !e.target.closest?.("#featureMenue")) $("featureMenue").hidden = true; }); // ersetzte Knöpfe (Untermenü) zählen nicht als «daneben»
$("featureMenue").onclick = (e) => {
  const kh = e.target.closest("button")?.dataset.komphan;
  if (kh) { const k = $("featureMenue").dataset.komp; $("featureMenue").hidden = true; if (dlg) $("dAbbrechen").click();
    if (kh === "lage") return komponenteDialog(k);
    if (kh === "name") { const n = prompt("Komponente umbenennen", k)?.trim(); if (!n) return; doc.features.forEach((f) => { if (f.komponente === k) f.komponente = n; }); if (doc.komponentenLage?.[k]) { doc.komponentenLage[n] = doc.komponentenLage[k]; delete doc.komponentenLage[k]; } return regen(); }
    if (kh === "loesen") { doc.features.forEach((f) => { if (f.komponente === k) delete f.komponente; }); if (doc.komponentenLage) delete doc.komponentenLage[k]; regen(); return status(`Komponente «${k}» aufgelöst – Körper bleiben.`); } }
  const dz = e.target.closest("button")?.dataset.darst;
  if (dz != null) { const f = finde($("featureMenue").dataset.id); $("featureMenue").hidden = true; if (!f) return; if (dz) f.darstellung = dz; else delete f.darstellung; regen(); return status(`Darstellung «${f.name}»: ${dz ? OBERFLAECHEN[dz].name : "automatisch"}.`); }
  const k = e.target.closest("button")?.dataset.fm; if (!k) return;
  const f = finde($("featureMenue").dataset.id), i = doc.features.indexOf(f); $("featureMenue").hidden = true; if (!f) return;
  if (dlg) $("dAbbrechen").click();
  if (k === "bearb") { if (f._aus) return status("Zuerst aktivieren bzw. Marke dahinter setzen."); bearbeite(f); }
  else if (k === "umbenennen") { const n = prompt("Neuer Name", f.name); if (n?.trim()) { f.name = n.trim(); regen(); } }
  else if (k === "unter") { f.unterdrueckt = !f.unterdrueckt; regen(); status(f.unterdrueckt ? `«${f.name}» unterdrückt – zählt nicht mehr (auch nicht in der Stückliste).` : `«${f.name}» wieder aktiv.`); }
  else if (k === "zurueck") { doc.marke = i + 1 >= doc.features.length ? null : i + 1; regen(); status("Zurückgerollt – neue Features kommen an die Marke."); }
  else if (k === "ende") { doc.marke = null; regen(); status("Alle Features aktiv."); }
  else if (k === "links") verschiebeFeature(f, i - 1);
  else if (k === "rechts") verschiebeFeature(f, i + 2);
  else if (k === "darst") {
    const m = $("featureMenue"), hex = (c) => "#" + c.toString(16).padStart(6, "0");
    m.innerHTML = `<button data-darst="">Automatisch${f.material ? " (nach Material)" : " (grau)"}</button>` + Object.entries(OBERFLAECHEN).map(([id, o]) =>
      `<button data-darst="${id}" class="${f.darstellung === id ? "an" : ""}"><span class="farbfeld" style="background:${hex(o.farbe)}"></span>${esc(o.name)}</button>`).join("");
    m.dataset.id = f.id; m.hidden = false; return;
  }
  else if (k === "kumk") { kanteUmkehren(f, f.key); status("Richtung umgekehrt."); }
  else if (k === "abw") abwickelnSchalten(f);
  else if (k === "kompNeu") { // jedes Teil kann seine eigene Komponente werden (verschieben/drehen, ein-/ausblenden)
    const vorhanden = new Set(doc.features.map((x) => x.komponente).filter(Boolean)); let n = f.name, i = 2; while (vorhanden.has(n)) n = `${f.name} ${i++}`;
    f.komponente = n; regen(); status(`«${f.name}» ist jetzt eine eigene Komponente (im Browser: Doppelklick = umbenennen, Rechtsklick = verschieben/drehen).`);
  }
  else if (k === "kompLage") komponenteDialog(f.komponente);
  else if (k === "kompName") { const alt = f.komponente, n = prompt("Komponente umbenennen", alt)?.trim(); if (n) { doc.features.forEach((x) => { if (x.komponente === alt) x.komponente = n; }); if (doc.komponentenLage?.[alt]) { doc.komponentenLage[n] = doc.komponentenLage[alt]; delete doc.komponentenLage[alt]; } regen(); } }
  else if (k === "kompLoesen") { const alt = f.komponente; doc.features.forEach((x) => { if (x.komponente === alt) delete x.komponente; }); if (doc.komponentenLage) delete doc.komponentenLage[alt]; regen(); status(`Komponente «${alt}» aufgelöst – Körper bleiben.`); }
  else if (k === "kompAus") { delete f.komponente; regen(); status(`«${f.name}» ist nicht mehr in einer Komponente.`); }
  else if (k === "komp") {
    const da = [...new Set(doc.features.map((x) => x.komponente).filter(Boolean))];
    const n = prompt(`Komponente (Baugruppe) für «${f.name}»${da.length ? " – vorhanden: " + da.join(", ") : ""}. Leer = keine.`, f.komponente || da[0] || "Komponente 1");
    if (n == null) return; if (n.trim()) f.komponente = n.trim(); else delete f.komponente; regen(); status(n.trim() ? `«${f.name}» gehört zu «${n.trim()}».` : `«${f.name}» ohne Komponente.`);
  }
  else if (k === "kopie") dupliziere(f);
  else if (k === "weg") { entferneFeature(f); if (auswahl === f.id) auswahl = null; regen(); status(`«${f.name}» gelöscht. Strg+Z holt es zurück.`); }
};
$("zeitZurueck").addEventListener("click", () => { const m = doc.marke ?? doc.features.length; if (m <= 0) return; doc.marke = m - 1; regen(); status(`Zurückgerollt vor «${doc.features[doc.marke].name}».`); });
$("zeitVor").addEventListener("click", () => { if (doc.marke == null) return; const m = doc.marke + 1; doc.marke = m >= doc.features.length ? null : m; regen(); status(doc.marke == null ? "Alle Features aktiv." : `Zurückgerollt vor «${doc.features[doc.marke].name}».`); });
$("rueckgaengig").addEventListener("click", () => { const f = doc.features[(doc.marke ?? doc.features.length) - 1]; if (f) entferneFeature(f); auswahl = null; regen(); });

function waehle(id, behalteZeiger = false) { // behalteZeiger: Klick im Raum setzt Kante/Fläche vorher selbst
  if (!behalteZeiger || (zeigerAuswahl && hauptVon(id)?.id !== zeigerAuswahl.fid)) zeigerAuswahl = null;
  auswahl = id; markiere(); zeigeWerkstatt();
  // nur die Markierung umschalten: ein Neuaufbau der Liste würde den Doppelklick zum Bearbeiten verschlucken
  document.querySelectorAll("#baum li[data-id]").forEach((li) => li.classList.toggle("aktiv", li.dataset.id === id || String(id).startsWith(li.dataset.id + ":")));
  if (blechWahl && id) { const h = hauptVon(id); if (h && blechWahl.filter(h)) { const w = blechWahl; blechWahl = null; wkZu(); w.weiter(h); } }
}
// Blech-Auswahl als erster Schritt eines Werkzeugs (ohne Vorauswahl): Blech in der Ansicht oder im Browser anklicken, dann geht das Werkzeug weiter
let blechWahl = null;
const istBlechWahl = (h) => !!h && !h._aus && !h.versteckt && (h.typ === "flaeche" || istProfil(h));
function starteBlechWahl(titel, text, filter, weiter) {
  blechWahl = { filter, weiter }; wkZeigen(titel, "Blech anklicken: " + text + " (in der Ansicht oder im Browser) – Esc bricht ab.", () => { blechWahl = null; wkZu(); }); status(titel + ": zuerst das Blech anklicken.");
}
document.addEventListener("keydown", (e) => { if (e.key === "Escape" && blechWahl && !dlg && !skizze) { blechWahl = null; wkZu(); status(""); } });

// ------------------------------------------------------------ Werkstatt
const f1 = (v) => v.toFixed(1);
let register = "teil"; // Werkstatt: «teil» oder «auftrag»
document.querySelectorAll("[data-register]").forEach((b) => (b.onclick = () => { register = b.dataset.register; zeigeWerkstatt(); }));
const blechteile = () => doc.features.filter((f) => !f.versteckt && !f._aus).flatMap((f) => (f._teile || (f._res ? [f] : [])).map((t) => (f._faktor > 1 ? { ...t, stueck: (t.stueck ?? 1) * f._faktor, notiz: [t.notiz, `${f._faktor}× durch Muster`].filter(Boolean).join(" · ") } : t)));
// Rundbleche (Zylinder/Kegel): Materialverbrauch = Rechteck um die Abwicklung (schmale Seite als Zuschnitt, lange als Länge)
const rundteile = () => doc.features.filter((f) => f.typ === "rundblech" && !f.versteckt && !f._aus && f._rund).map((f) => {
  const [a, b] = f._rund.masse.zuschnitt;
  return { name: f.name, notiz: [f.notiz, "Rundblech: Rechteck um die Abwicklung"].filter(Boolean).join(" · "), material: material(f.material), zuschnitt: Math.min(a, b), laenge: +Math.max(a, b).toFixed(1), stueck: (f.stueck ?? 1) * (f._faktor || 1) };
});
function auftrag() {
  return stueckliste([...blechteile().map((f) => ({ name: f.name, notiz: f.notiz, material: material(f.material), zuschnitt: f._res.zuschnitt, laenge: laengeVon(f), stueck: f.stueck ?? 1 })), ...rundteile()]);
}
const f2 = (v) => v.toFixed(2);
// Materialbedarf: Spaltband/Coil in Laufmetern, Tafeln als Stückzahl (Schätzung)
const bedarf = () => materialbedarf([...blechteile().map((f) => ({ name: f.name, material: material(f.material), zuschnitt: f._res.zuschnitt, laenge: laengeVon(f), stueck: f.stueck ?? 1 })), ...rundteile()], einst);
function bedarfCsv() {
  const zeilen = bedarf().flatMap((e) => [
    ...e.baender.map((b) => [e.material, `Spaltband ${b.breite}`, +b.laufmeter.toFixed(2), "lfm", b.stueck]),
    ...(e.coil ? [[e.material, `Coil ${e.coil.breite}`, +e.coil.laufmeter.toFixed(2), "lfm", e.coil.stueck]] : []),
    ...e.tafeln.map((t) => [e.material, `Tafel ${t.format[0]}x${t.format[1]}`, t.anzahl, "Tafeln", t.stueck]),
    ...e.ohne.map((o) => [e.material, o, "", "", ""]),
  ]);
  return ["", "Materialbedarf;Aus;Menge;Einheit;Streifen", ...zeilen.map((z) => z.map((v) => (/[;"]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : v)).join(";"))].join("\r\n") + "\r\n";
}
function bedarfHtml() {
  const zeilen = bedarf().flatMap((e) => [
    ...e.baender.map((b) => [e.material, `Spaltband ${b.breite}`, `${b.laufmeter.toFixed(1)} lfm`, b.stueck]),
    ...(e.coil ? [[e.material, `Coil ${e.coil.breite}`, `${e.coil.laufmeter.toFixed(1)} lfm`, e.coil.stueck]] : []),
    ...e.tafeln.map((t) => [e.material, `Tafel ${t.format[0]} × ${t.format[1]}`, `${t.anzahl} Tafel${t.anzahl > 1 ? "n" : ""} <small class="hinweis">${Math.round(t.ausnutzung * 100)} % genutzt</small>`, t.stueck]),
    ...e.ohne.map((o) => [e.material, `<span class="warnung">⚠ ${esc(o)}</span>`, "", ""]),
  ]);
  return `<table class="liste summen"><thead><tr><th>Materialbedarf</th><th>Aus</th><th class="num">Menge</th><th class="num">Streifen</th></tr></thead><tbody>
    ${zeilen.map(([m, a, menge, n]) => `<tr><td>${esc(m)}</td><td>${a}</td><td class="num">${menge}</td><td class="num">${n}</td></tr>`).join("")}
    </tbody></table><p class="hinweis bedarfhinweis">Ohne Verschnitt an den Enden. Tafeln: Streifen nebeneinander, Schätzung.</p>`;
}
function zeigeAuftrag(w) {
  const a = auftrag();
  if (!a.zeilen.length) { w.innerHTML = '<p class="leer">Noch keine Blechteile im Auftrag.</p>'; return; }
  w.innerHTML = `<div class="zahl"><b>${a.summe.stueck}</b><span>Teile · ${f2(a.summe.flaeche)} m² · ${a.summe.gewicht.toFixed(1)} kg</span></div>
    <table class="liste"><thead><tr><th>Teil</th><th class="num">Stk</th><th class="num">Zuschnitt × Länge</th><th class="num">m²</th></tr></thead><tbody>
    ${a.zeilen.map((z) => `<tr><td>${esc(z.name)}<br><small class="hinweis">${esc(z.material)}</small></td><td class="num">${z.stueck}</td><td class="num">${f1(z.zuschnitt)} × ${z.laenge}</td><td class="num">${f2(z.flaeche)}</td></tr>`).join("")}
    </tbody></table>
    <table class="liste summen"><thead><tr><th>Material</th><th class="num">lfm</th><th class="num">m²</th><th class="num">kg</th></tr></thead><tbody>
    ${a.jeMaterial.map((m) => `<tr><td>${esc(m.material)}</td><td class="num">${m.laufmeter.toFixed(1)}</td><td class="num">${f2(m.flaeche)}</td><td class="num">${m.gewicht.toFixed(1)}</td></tr>`).join("")}
    </tbody></table>
    ${bedarfHtml()}
    <div class="reihe"><button class="knopf haupt" id="kAlleDruck">Stückliste und Werkstattblätter drucken</button><button class="knopf" id="kCsv">Stückliste als CSV</button><button class="knopf" id="kAlleDxf" title="Alle Abwicklungen übereinander in einer DXF-Datei">Alle als DXF</button><button class="knopf" id="kEtiketten" title="Ein Etikett pro Stück, Bogen ${einst.etiketten.spalten} × ${einst.etiketten.zeilen} (${einst.etiketten.breite} × ${einst.etiketten.hoehe} mm)">Etiketten drucken</button></div>`;
  $("kAlleDruck").onclick = () => drucke(blechteile(), true);
  $("kEtiketten").onclick = druckeEtiketten;
  $("kAlleDxf").onclick = () => herunterladen(`${doc.nr || "auftrag"} Abwicklungen.dxf`,
    abwicklungenDxf(blechteile().map((f) => ({ res: f._res, abw: f._blech?.abw, laschen: f._stirn || [], laenge: laengeVon(f), titel: `${f.name} ${f.stueck ?? 1} Stk ${material(f.material).name}` })), einst.skizze.abstand), "application/dxf");
  $("kCsv").onclick = () => herunterladen(`${doc.nr || "auftrag"} Stückliste.csv`, stuecklisteCsv(a, [["Objekt", doc.objekt], ["Nr.", doc.nr], []]) + bedarfCsv(), "text/csv");
}
// Dach: Holzliste, Latten, Flächen, Ziegel (Werkstatt-Panel, CSV)
function dachListeZeilen(f) {
  const m = f._mengen, dk = deckungVon(f), z = [["Art", "Querschnitt mm", "Länge", "Menge"]];
  for (const h of m.sparren) z.push(["Sparren", h.querschnitt, h.laenge + " mm", h.stueck + " Stk."]);
  for (const h of m.wechsel || []) z.push(["Wechsel (Fenster/Kamin)", h.querschnitt, h.laenge + " mm", h.stueck + " Stk."]);
  for (const h of m.gratKehl || []) z.push([h.art, "", h.laenge + " mm", h.stueck + " Stk."]);
  for (const h of m.konter) z.push(["Konterlattung", h.querschnitt, h.meter + " m", h.stueck + " Stk."]);
  for (const h of m.lattung) z.push(["Dachlattung", h.querschnitt, h.meter + " m", h.stueck + " Stk."]);
  z.push(["Dämmung", "", "", m.daemmung + " m²"], ["Unterdach", "", "", m.unterdach + " m²"], ["Deckung " + dk.name, "", "", m.deckflaeche + " m²"], ["Ziegel (Richtwert)", "", "", m.ziegel + " Stk. · " + m.gewichtKg + " kg"]);
  return z;
}
function zeigeDachListe(w, f) {
  const z = dachListeZeilen(f), r = f._dach, sch = f._schichten?.liste || [];
  w.innerHTML = `<div class="unter" style="padding-top:12px">${esc(f.name)} · Holz- und Mengenliste</div>
    <table class="liste"><thead><tr><th>Schichtaufbau (aussen → innen)</th><th class="num">Dicke mm</th></tr></thead><tbody>${[...sch].sort((a, b) => b.bis - a.bis || b.von - a.von).map((l) => `<tr><td>${esc(l.name)}</td><td class="num">${f1(l.bis - l.von)}</td></tr>`).join("")}<tr><td><b>Gesamt</b></td><td class="num"><b>${f1(f._schichten?.dicke || 0)}</b></td></tr></tbody></table>
    <table class="liste"><thead><tr>${z[0].map((h) => `<th>${h}</th>`).join("")}</tr></thead><tbody>${z.slice(1).map((r) => `<tr>${r.map((c, i) => `<td${i > 1 ? ' class="num"' : ""}>${esc(String(c))}</td>`).join("")}</tr>`).join("")}</tbody></table>
    <p class="leer">Dachfläche ${r.flaechen.reduce((s, x) => s + x.flaeche, 0).toFixed(1)} m² · Sparren ohne Gehrung (Grat/Kehle folgen) · Deckungswerte sind Richtwerte.</p>
    <div class="reihe"><button class="knopf haupt" id="kDachCsv">Liste kopieren (CSV)</button></div>`;
  $("kDachCsv").onclick = () => { const t = z.map((r) => r.join(";")).join("\n"); navigator.clipboard?.writeText(t).then(() => status("Holzliste kopiert."), () => status("Kopieren nicht möglich.")); };
}
function zeigeWerkstatt() {
  const f = waehlbar(auswahl);
  const w = $("werkstatt");
  document.querySelectorAll("[data-register]").forEach((b) => b.setAttribute("aria-selected", b.dataset.register === register));
  if (register === "auftrag") return zeigeAuftrag(w);
  if (register === "eigenschaften") return zeigeEigenschaften(w);
  if (f?.typ === "ebene") {
    const e = f._ebene, v3 = (a) => a.map((x) => +x.toFixed(2)).join(" / ");
    w.innerHTML = `<div class="unter" style="padding-top:12px">${esc(f.name)} · ${EBENEN_ARTEN[f.art]}</div>
      ${e ? `<p class="leer">Ursprung ${v3(e.o)} mm<br>Normale ${v3(e.n)}</p><div class="reihe"><button class="knopf haupt" id="kSkizzeHier">Skizze auf dieser Ebene</button></div>` : `<p class="leer">⚠ ${esc(f._fehler || "nicht berechenbar")}</p>`}`;
    if ($("kSkizzeHier")) $("kSkizzeHier").onclick = () => neueSkizze(f.id);
    return;
  }
  if (f?.typ === "dach" && f._mengen) return zeigeDachListe(w, f);
  if (f?.typ === "eindeckung" && f._ziegel) { const z = f._ziegel;
    w.innerHTML = `<div class="unter" style="padding-top:12px">${esc(f.name)} · ${esc(z.deckung)}</div><table class="liste"><tbody><tr><td>Ziegel gezeichnet</td><td class="num">${z.anzahl}</td></tr><tr><td>davon geschnitten</td><td class="num">${z.geschnitten}</td></tr><tr><td>Richtwert aus Stück/m²</td><td class="num">${z.richtwert}</td></tr></tbody></table>${f._ohneBleche ? '<p class="fehler">Noch keine Dachbleche vor dieser Eindeckung – die Ziegel werden nur an Rand und Öffnungen geschnitten.</p>' : '<p class="leer">Geschnittene Ziegel: an Kehle, Wangen-/Fussanschluss, Fenster, Kamin und Lukarne.</p>'}`; return; }
  if (f?.typ === "dachbleche" && f._teile) { const lm = f._teile.reduce((s, t) => s + t.laenge * t.stueck, 0) / 1000;
    w.innerHTML = `<div class="unter" style="padding-top:12px">${esc(f.name)} · ${f._teile.length} Blechsorten · ${lm.toFixed(1)} m Länge</div><table class="liste"><thead><tr><th>Blech</th><th class="num">Länge</th><th class="num">Stk.</th><th class="num">Zuschnitt</th></tr></thead><tbody>${f._teile.map((t) => `<tr data-teil="${t.id}"><td>${esc(t.name.replace(/ \d+ mm$/, ""))}</td><td class="num">${t.laenge}</td><td class="num">${t.stueck}</td><td class="num">${f1(t._res.zuschnitt)}</td></tr>`).join("")}</tbody></table><p class="leer">Teil in der Zeitleiste oder Stückliste wählen für Abkantliste und DXF. 3D-Darstellung schematisch.</p><div class="reihe"><button class="knopf haupt" id="kBlechCsv">Liste kopieren (CSV)</button></div>`;
    $("kBlechCsv").onclick = () => { const t = [["Blech", "Länge mm", "Stück", "Zuschnitt mm"], ...f._teile.map((x) => [x.name.replace(/ \d+ mm$/, ""), x.laenge, x.stueck, f1(x._res.zuschnitt)])].map((r) => r.join(";")).join("\n"); navigator.clipboard?.writeText(t).then(() => status("Blechliste kopiert."), () => status("Kopieren nicht möglich.")); };
    w.querySelectorAll("[data-teil]").forEach((r) => (r.onclick = () => waehle(r.dataset.teil))); return; }
  if (f?.typ === "flaeche" && f._teile?.length) return waehle(f._teile[0].id);
  if (f?._blech) return zeigeFlaechenteil(w, f);
  if (f?.typ === "rundblech" && f._rund) return zeigeRund(w, f);
  if (!f || !f._res) { w.innerHTML = `<p class="leer">${f ? (f._fehler || "Volumenkörper: keine Abwicklung.") : "Blechteil anklicken, um Zuschnitt und Abkantfolge zu sehen."}</p>`; return; }
  const r = f._res, m = material(f.material), q = quelle(r.zuschnitt, einst), abB = einst.anzeige.abB;
  w.innerHTML = `<div class="zahl"><b>${f1(r.zuschnitt)}</b><span>mm Zuschnitt</span></div>
    ${f.eltern ? `<div class="unter"><button class="knopf klein" id="kZumDetail">← ${esc(f.eltern.name)}</button></div>` : ""}
    <div class="unter">${esc(f.name)} · ${r.biegungen.length} Biegungen${r.hatRundung ? "" : ` · Summe Schenkel ${r.summeSchenkel.toFixed(0)} mm`}</div>
    ${f.notiz?.trim() ? `<div class="notiz"><b>Notiz</b> ${esc(f.notiz)}</div>` : ""}
    <div class="zeichnung">${profilSvg(r, { dicke: m.t, breite: 276, hoehe: 200, schrift: 11 })}${abwicklungSvg(r, { breite: 276, schrift: 10 })}</div>
    ${kernAn() && f._kernLage ? '<div class="reihe ohnerand"><button class="knopf klein" id="k3D" title="Exakten 3D-Körper im CAD-Kern bauen und den Zuschnitt daraus mit der Abwicklung vergleichen">3D-Prüfung (exakt)</button><span id="k3DErg" class="hinweis"></span></div>' : ""}
    <div class="quelle">${q ? `Aus <b>${q.art} ${q.breite}${q.laenge ? " × " + q.laenge : ""} mm</b> · Rest ${f1(q.rest)} mm` : "Breiter als alle Lagerformate"}</div>
    <table class="liste"><thead><tr><th>Biegung</th><th class="num" title="Anschlag ab Kante A${abB ? ", darunter ab Kante B (Blech gewendet)" : ""}">Anschlag ${abB ? 'A<br><span class="abb">ab B</span>' : "ab A"}</th><th class="num">Winkel</th><th>Richtung</th></tr></thead><tbody>
    ${r.biegungen.map((b) => `<tr><td><span class="bnr">B${b.nr}</span> ${b.art === "Abkanten" ? "" : b.art}</td><td class="num">${b.art === "Rundung" ? `${b.von.toFixed(0)}–${b.bis.toFixed(0)}` : `${f1(b.pos)}${abB ? `<br><span class="abb">${f1(r.zuschnitt - b.pos)}</span>` : ""}`}</td><td class="num">${f1(Math.abs(b.winkel))}°</td><td>${b.richtung}</td></tr>`).join("")}
    </tbody></table>
    <div class="reihe"><button class="knopf haupt" id="kListe">Abkantliste kopieren</button><button class="knopf" id="kDxf">DXF speichern</button><button class="knopf" id="kDruck">Werkstattblatt drucken</button><button class="knopf" id="kKopie" title="Strg+D">Duplizieren</button>${f.typ === "profil" ? '<button class="knopf" id="kEigene">Als eigene Vorlage speichern</button>' : ""}${f.typ === "vorlage" && alsZeilen(...Object.values(vorlageDef(f.vorlage).bau(f.params, m))) ? '<button class="knopf" id="kFrei">Als freies Profil bearbeiten</button>' : ""}</div>
    <dl class="etikett"><dt>Objekt</dt><dd>${esc(doc.objekt)}</dd><dt>Nr.</dt><dd>${esc(doc.nr)}</dd><dt>Teil</dt><dd>${esc(f.name)}</dd>
    <dt>Blech</dt><dd>${m.name.replace(/ [\d.]+$/, "")} ${m.t.toFixed(2)} mm</dd><dt>Mass</dt><dd>${f1(r.zuschnitt)} × ${laengeVon(f)} mm${f._stirn?.length ? ` + ${f._stirn.length} Stirnlaschen` : ""} · ${f.stueck ?? 1} Stk.</dd></dl>`;
  $("kListe").onclick = () => kopiere([`${doc.objekt} · Nr. ${doc.nr} · ${f.name}`, `${m.name} · Zuschnitt ${f1(r.zuschnitt)} × ${laengeVon(f)} mm`, "",
    `Biegung\tAnschlag ab A (mm)${abB ? "\tAnschlag ab B (mm)" : ""}\tWinkel\tRichtung`,
    ...r.biegungen.map((b) => `B${b.nr}\t${f1(b.pos)}${abB ? `\t${f1(r.zuschnitt - b.pos)}` : ""}\t${f1(Math.abs(b.winkel))}\t${b.richtung}`)].join("\n"));
  $("kDxf").onclick = () => herunterladen(`${doc.nr} ${f.name}.dxf`, abwicklungDxf(r, laengeVon(f), f.name, f._stirn || []), "application/dxf");
  $("kDruck").onclick = () => drucke([f]);
  $("kKopie").onclick = () => dupliziere(f.eltern || f);
  if ($("k3D")) $("k3D").onclick = () => pruefe3D(f, $("k3DErg"));
  if ($("kZumDetail")) $("kZumDetail").onclick = () => waehle(f.eltern.id);
  if ($("kEigene")) $("kEigene").onclick = () => {
    const v = { name: f.name, start: f.start, zeilen: JSON.parse(JSON.stringify(f.zeilen)) }, i = einst.vorlagen.findIndex((x) => x.name === f.name);
    if (i >= 0) einst.vorlagen[i] = v; else einst.vorlagen.push(v);
    einstSpeichern();
    status(`«${f.name}» ${i >= 0 ? "aktualisiert" : "gespeichert"}: unter «Freies Profil» → «Eigene Vorlage» wählbar.`);
  };
  if ($("kFrei")) $("kFrei").onclick = () => { // Vorlage in Tabelle umwandeln, um Schenkel frei zu ergänzen
    const { start, zeilen } = alsZeilen(...Object.values(vorlageVon(f).bau(f.params, m)));
    Object.assign(f, { typ: "profil", start, zeilen }); delete f.vorlage; delete f.params;
    regen(); profilDialog(f);
  };
}

function dupliziere(f) {
  if (!f || f.typ === "skizze" || skizze || dlg) return;
  const kopie = JSON.parse(JSON.stringify(f, (k, v) => (k.startsWith("_") ? undefined : v)));
  const basis = f.name.replace(/ \(\d+\)$/, "");
  let n = 2; while (doc.features.some((x) => x.name === `${basis} (${n})`)) n++;
  Object.assign(kopie, { id: neueId(), name: `${basis} (${n})` });
  doc.features.splice(doc.features.indexOf(f) + 1, 0, kopie);
  auswahl = kopie.id; regen(); status(`${kopie.name} erstellt.`);
}

// ------------------------------------------------------------ Druck: Werkstattblatt je Blechteil (A4)
const logoImg = () => (einst.firma?.logo ? `<img class="firmenlogo" src="${logoPapier(einst.firma)}" alt="">` : "");
// Logo einlesen: Bilder auf höchstens 800×400 verkleinern (bleibt klein genug für den lokalen Speicher), SVG unverändert
async function logoLesen(datei) {
  if (/svg/.test(datei.type) || /\.svg$/i.test(datei.name)) return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(await datei.text());
  const url = URL.createObjectURL(datei), img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error("Bild nicht lesbar")); i.src = url; });
  const k = Math.min(1, 800 / img.width, 400 / img.height), c = document.createElement("canvas"); c.width = Math.max(1, Math.round(img.width * k)); c.height = Math.max(1, Math.round(img.height * k)); c.getContext("2d").drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(url);
  return c.toDataURL(/png|webp|gif/.test(datei.type) ? "image/png" : "image/jpeg", 0.9);
}
const blattFuss = () => `<footer class="blattfuss"><span>${esc(einst.druck.betrieb || "Spengler Digital CAD")}</span><span>${esc(doc.objekt)}${doc.nr ? " · Nr. " + esc(doc.nr) : ""}</span><span>${new Date().toLocaleDateString("de-CH")}</span></footer>`;
const kopf = (art) => `<small>${art}${einst.druck.betrieb ? " · " + esc(einst.druck.betrieb) : ""}</small>`;
function werkstattblatt(f) {
  if (f._blech) return flaechenblatt(f);
  const r = f._res, m = material(f.material), q = quelle(r.zuschnitt, einst), d = einst.druck, abB = einst.anzeige.abB;
  return `<section class="blatt">
    <header>${logoImg()}<div>${kopf("Werkstattblatt")}<h1>${esc(f.name)}</h1></div>
      <dl><dt>Objekt</dt><dd>${esc(doc.objekt)}</dd><dt>Nr.</dt><dd>${esc(doc.nr)}</dd><dt>Datum</dt><dd>${new Date().toLocaleDateString("de-CH")}</dd>${f.herkunft ? `<dt>Messung</dt><dd>Nr. ${esc(f.herkunft.messaufnahmeId)}${abweichungen(f, m.t).length ? " (geändert)" : ""}</dd>` : ""}</dl></header>
    <div class="eckdaten">
      <div><small>Zuschnitt</small><b>${f1(r.zuschnitt)} × ${laengeVon(f)} mm</b></div>
      <div><small>Material</small><b>${esc(m.name)}</b></div>
      <div><small>Stück</small><b>${f.stueck ?? 1}</b></div>
      <div><small>Aus</small><b>${q ? `${q.art} ${q.breite}${q.laenge ? " × " + q.laenge : ""}` : "Sonderformat"}</b></div>
    </div>
    ${f.herkunft && abweichungen(f, m.t).length ? `<div class="notiz"><b>Gegenüber der Messung geändert</b> ${esc(abweichungen(f, m.t).join("; "))}</div>` : ""}
    ${f.notiz?.trim() ? `<div class="notiz"><b>Notiz</b> ${esc(f.notiz)}</div>` : ""}
    <div class="grosszeichnung">${profilSvg(r, { dicke: m.t, breite: 640, hoehe: 360, schrift: 14, rand: 44 })}</div>
    ${d.abwicklung ? `<div class="abwicklung"><small>Abwicklung · Anschlag ab Kante A${abB ? " (ab B: Blech gewendet)" : ""}</small>${abwicklungSvg(r, { breite: 640, schrift: 12 })}</div>` : ""}
    <table class="liste"><thead><tr><th>Biegung</th><th>Art</th><th class="num">Anschlag ab A (mm)</th>${abB ? '<th class="num">ab B (mm)</th>' : ""}<th class="num">Winkel</th><th>Richtung</th></tr></thead><tbody>
      ${r.biegungen.map((b) => `<tr><td><span class="bnr">B${b.nr}</span></td><td>${b.art}</td><td class="num">${b.art === "Rundung" ? `${b.von.toFixed(0)}–${b.bis.toFixed(0)}` : f1(b.pos)}</td>${abB ? `<td class="num">${b.art === "Rundung" ? `${(r.zuschnitt - b.bis).toFixed(0)}–${(r.zuschnitt - b.von).toFixed(0)}` : f1(r.zuschnitt - b.pos)}</td>` : ""}<td class="num">${f1(Math.abs(b.winkel))}°</td><td>${b.richtung}</td></tr>`).join("")}
    </tbody></table>
    <p class="hinweis">Masse in mm auf der Blechmitte. Anschlag ab Kante A (grüner Punkt)${abB ? ", «ab B» ab der anderen Kante für gewendetes Blech" : ""}. Richtung «oben/unten» mit Kante A links.
      Innenradius ${m.ri} mm, K-Faktor ${m.k}.</p>
    ${d.etikett ? `<dl class="etikett"><dt>Objekt</dt><dd>${esc(doc.objekt)}</dd><dt>Nr.</dt><dd>${esc(doc.nr)}</dd><dt>Teil</dt><dd>${esc(f.name)}</dd>
      <dt>Blech</dt><dd>${esc(m.name)}</dd><dt>Mass</dt><dd>${f1(r.zuschnitt)} × ${laengeVon(f)} mm${f._stirn?.length ? ` + ${f._stirn.length} Stirnlaschen` : ""} · ${f.stueck ?? 1} Stk.</dd></dl>` : ""}
    ${blattFuss()}
  </section>`;
}
function stuecklisteBlatt() {
  const a = auftrag();
  return `<section class="blatt">
    <header>${logoImg()}<div>${kopf("Stückliste")}<h1>${esc(doc.objekt)}</h1></div>
      <dl><dt>Nr.</dt><dd>${esc(doc.nr)}</dd><dt>Datum</dt><dd>${new Date().toLocaleDateString("de-CH")}</dd></dl></header>
    <table class="liste"><thead><tr><th>Teil</th><th>Material</th><th class="num">Zuschnitt × Länge mm</th><th class="num">Stück</th><th class="num">m²</th><th class="num">kg</th></tr></thead><tbody>
    ${a.zeilen.map((z) => `<tr><td>${esc(z.name)}${z.notiz ? `<br><small>${esc(z.notiz)}</small>` : ""}</td><td>${esc(z.material)}</td><td class="num">${f1(z.zuschnitt)} × ${z.laenge}</td><td class="num">${z.stueck}</td><td class="num">${f2(z.flaeche)}</td><td class="num">${z.gewicht.toFixed(1)}</td></tr>`).join("")}
    </tbody></table>
    <table class="liste"><thead><tr><th>Summe je Material</th><th class="num">Stück</th><th class="num">Laufmeter</th><th class="num">m²</th><th class="num">kg</th></tr></thead><tbody>
    ${a.jeMaterial.map((m) => `<tr><td>${esc(m.material)}</td><td class="num">${m.stueck}</td><td class="num">${m.laufmeter.toFixed(1)}</td><td class="num">${f2(m.flaeche)}</td><td class="num">${m.gewicht.toFixed(1)}</td></tr>`).join("")}
    <tr><td><b>Total</b></td><td class="num"><b>${a.summe.stueck}</b></td><td></td><td class="num"><b>${f2(a.summe.flaeche)}</b></td><td class="num"><b>${a.summe.gewicht.toFixed(1)}</b></td></tr>
    </tbody></table>
    ${einst.druck.bedarf ? bedarfHtml() : ""}
    ${blattFuss()}
  </section>`;
}
// Etiketten: eins pro Stück, Bogenformat aus den Einstellungen (Standard A4, 3 × 8 à 70 × 37 mm)
function druckeEtiketten() {
  const e = einst.etiketten, proBogen = e.spalten * e.zeilen;
  const etiketten = blechteile().flatMap((f) => {
    const n = Math.max(0, Math.round(f.stueck ?? 1)), m = material(f.material);
    return Array.from({ length: n }, (_, i) => `<dl class="etikett klebe"><dt>Objekt</dt><dd>${esc(doc.objekt)}</dd><dt>Nr.</dt><dd>${esc(doc.nr)}</dd>
      <dt>Teil</dt><dd>${esc(f.name)}${n > 1 ? ` <small>${i + 1}/${n}</small>` : ""}</dd><dt>Blech</dt><dd>${esc(m.name)}</dd><dt>Mass</dt><dd>${f1(f._res.zuschnitt)} × ${laengeVon(f)}</dd></dl>`);
  });
  if (!etiketten.length) return status("Keine Blechteile für Etiketten.");
  const boegen = [];
  const stil = `grid-template-columns: repeat(${e.spalten}, ${e.breite}mm); grid-auto-rows: ${e.hoehe}mm; column-gap: ${e.abstandX}mm; row-gap: ${e.abstandY}mm; padding: ${e.oben}mm 0 0 ${e.links}mm;`;
  for (let i = 0; i < etiketten.length; i += proBogen) boegen.push(`<section class="etikettenbogen" style="${stil}">${etiketten.slice(i, i + proBogen).join("")}</section>`);
  $("druck").innerHTML = boegen.join("");
  druckeAusgabe("Etiketten");
}
function drucke(teile, mitListe = false) {
  teile = teile.filter((f) => f._res);
  if (!teile.length) return status("Keine Blechteile zum Drucken.");
  $("druck").innerHTML = (mitListe ? stuecklisteBlatt() : "") + teile.map(werkstattblatt).join("");
  druckeAusgabe("Werkstattblätter");
}
// Drucken: Browser und PC-Programm mit dem Druckdialog; Android-App (Capacitor, dort fehlt window.print) über das Druck-Plugin der Hülle,
// ältere Hüllen ohne Plugin: druckfertige HTML-Seite über das Teilen-Menü (im Browser öffnen → drucken / als PDF)
async function druckeAusgabe(titel = "Spengler Digital CAD") {
  const cap = window.Capacitor?.isNativePlatform?.() ? window.Capacitor.Plugins : null;
  if (!cap) return window.print();
  try { if (cap.Druck?.drucken) { await cap.Druck.drucken({ name: `${doc.nr ? doc.nr + " – " : ""}${titel}` }); return; } } catch (e) { if (!/not implemented|nicht/i.test(String(e?.message ?? e))) return status("Drucken fehlgeschlagen: " + (e?.message ?? e)); }
  if (!(cap.Filesystem && cap.Share)) return status("Drucken wird hier nicht unterstützt – die Seite als PDF exportieren geht im Browser.");
  try {
    const stile = [...document.styleSheets].map((b) => { try { return [...b.cssRules].map((r) => r.cssText).join("\n"); } catch { return ""; } }).join("\n");
    const html = `<!doctype html><html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(titel)}</title><style>${stile}\n@media screen { body { background: #fff; display: block; padding: 8px; } #druck { display: block; color: #000; } }</style></head><body><div id="druck">${$("druck").innerHTML}</div><script>addEventListener("load", () => setTimeout(() => print(), 500));<\/script></body></html>`;
    const name = `${(doc.nr || "druck").replace(/[\\/:*?"<>|]+/g, "-")}-${titel.replace(/[^\wäöüÄÖÜ-]+/g, "-")}.html`;
    const r = await cap.Filesystem.writeFile({ path: name, data: html, directory: "CACHE", encoding: "utf8" });
    await cap.Share.share({ title: name, url: r.uri, dialogTitle: "Druckseite im Browser öffnen und drucken" });
    status("Druckseite bereit – im Browser öffnen, dann drucken oder als PDF speichern.");
  } catch (e) { if (!/cancel/i.test(String(e?.message ?? e))) status("Drucken fehlgeschlagen: " + (e?.message ?? e)); }
}
const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
for (const [id, k] of [["aObjekt", "objekt"], ["aNr", "nr"], ["aModell", "modellName"]]) { $(id).value = doc[k] ?? ""; $(id).addEventListener("input", (e) => { doc[k] = e.target.value; speichern(); zeigeWerkstatt(); }); }

let hinweisZeit = 0; // Hinweise bleiben kurz stehen, bevor die Mauskoordinaten sie ersetzen
function status(t, koordinaten = false) {
  if (koordinaten && Date.now() - hinweisZeit < 3000) return; if (!koordinaten) hinweisZeit = Date.now();
  const el = $("status"); el.textContent = t;
  const warn = !koordinaten && /^(⚠|Fehler|Zuerst |Bitte |Kein[e]? |Nicht |Das .* (fehlt|geht nicht)|.*fehlgeschlagen)/.test(t);
  el.classList.toggle("warn", warn); // Warnungen fallen auf, Hinweise bleiben ruhig
  if (warn) zeigeMeldung(t, "warn");
}
async function kopiere(text) {
  try { await navigator.clipboard.writeText(text); status("In die Zwischenablage kopiert."); } catch { status("Kopieren wird hier nicht unterstützt."); }
}
// ------------------------------------------------------------ Dateien
// Im PC-Programm (Tauri) mit echtem Speichern-/Öffnen-Dialog, im Browser als Download bzw. Dateiauswahl.
const pc = window.__TAURI__?.core;
const DATEITYPEN = { sdcad: "Spengler-Digital-CAD-Projekt", dxf: "DXF-Zeichnung", csv: "CSV-Tabelle", json: "Einstellungen" };
const dateiname = (pfad) => pfad.split(/[\\/]/).pop();
async function herunterladen(name, inhalt, typ, pfad = null, ablageArt = "export", ohneAblage = false) {
  const endung = name.split(".").pop();
  if (!ohneAblage && endung !== "sdcad") ablage?.kopie(name, inhalt, ablageArt); // Kopie in der Cloud-Ablage (Exporte bzw. Pläne), wenn angemeldet und ein Projekt zugeordnet ist
  if (pc) {
    try {
      const ziel = await pc.invoke("datei_speichern", { name, inhalt, filter: DATEITYPEN[endung] || endung, endungen: [endung], pfad });
      if (ziel) status(`${dateiname(ziel)} gespeichert.`);
      return ziel;
    } catch (e) { status("Speichern fehlgeschlagen: " + e); return null; }
  }
  const cap = window.Capacitor?.isNativePlatform?.() ? window.Capacitor.Plugins : null; // Android-App (Capacitor): Datei ablegen und über das Android-Teilen-Menü speichern/senden
  if (cap?.Filesystem && cap?.Share) {
    try {
      const sicherA = name.replace(/[\\/:*?"<>|]+/g, "-"), r = await cap.Filesystem.writeFile({ path: sicherA, data: inhalt, directory: "CACHE", encoding: "utf8" });
      await cap.Share.share({ title: name, url: r.uri, dialogTitle: `${name} speichern oder senden` }); status(`${sicherA} bereit – im Android-Menü speichern oder senden.`);
    } catch (e) { if (!/cancel/i.test(String(e?.message ?? e))) status("Speichern fehlgeschlagen: " + (e?.message ?? e)); }
    return null;
  }
  const a = document.createElement("a");
  // Browser verwerfen Download-Namen mit Umlauten teils («download»), daher umschreiben
  const sicher = name.replace(/[äöüÄÖÜß]/g, (c) => ({ ä: "ae", ö: "oe", ü: "ue", Ä: "Ae", Ö: "Oe", Ü: "Ue", ß: "ss" })[c]).replace(/[^\x20-\x7e]/g, "-");
  a.href = URL.createObjectURL(new Blob([inhalt], { type: typ })); a.download = sicher;
  document.body.appendChild(a); a.click(); a.remove();
  status(`${sicher} gespeichert (Download-Ordner).`);
  return null;
}

// ------------------------------------------------------------ Befehlsdialog
let dlg = null;
$("dKlein").onclick = () => $("dialog").classList.toggle("klein");
function dialog(opt) {
  if (opt !== dlg && opt.titel !== dlg?.titel) $("dialog").classList.remove("klein");
  dlg = opt;
  setTimeout(leisteZustand);
  $("dTitel").textContent = opt.titel;
  $("dInfo").textContent = "";
  $("dLoeschen").hidden = !opt.loeschen;
  opt.schritt ??= 0;
  $("dInhalt").innerHTML = opt.felder.map((fd) => {
    const inp = fd.optionen
      ? `<select id="d_${fd.id}">${fd.optionen.map(([w, t]) => `<option value="${w}" ${String(w) === String(fd.wert) ? "selected" : ""}>${esc(t)}</option>`).join("")}</select>`
      : fd.text ? `<input id="d_${fd.id}" type="text" value="${esc(fd.wert)}">`
      : `<input id="d_${fd.id}" type="text" class="zahlfeld" inputmode="${(doc.parameter || []).length ? "text" : "decimal"}" autocomplete="off" value="${esc(opt.feature?.ausdruecke?.[fd.id] ?? fd.wert)}">`;
    return `<div class="feld" data-s="${esc(fd.schritt || "")}"${fd.wahl ? ` data-wahl="${fd.wahl}" data-feld="${fd.id}"` : ""}><label for="d_${fd.id}">${fd.wahl ? "⊕ " : ""}${fd.label}${fd.einheit ? ` (${fd.einheit})` : ""}</label>${inp}</div>`;
  }).join("") + (opt.zusatz ? `<div id="dZusatz">${opt.zusatz()}</div>` : "") + (opt.hinweis ? `<p class="hinweis">${opt.hinweis}</p>` : "");
  $("dialog").hidden = false;
  document.querySelector(".mitte")?.classList.toggle("dialogMitWerk", ["blech", "vorlage", "profil", "rundblech", "kehle", "loftflansch", "flaeche", "flaechenteil", "kante", "profilkante"].includes(opt.feature?.typ)); // Blechwerkzeuge zeigen Zuschnitt/Abwicklung im Teil-Panel
  zeigeSchritt();
  opt.felder.forEach((fd) => $("d_" + fd.id).addEventListener(fd.optionen ? "change" : "input", () => opt.aendern?.(werte(), fd.id)));
  opt.binden?.($("dZusatz"));
  // Wahlfelder: das aktive Feld nimmt den nächsten Klick in der Ansicht auf
  document.querySelectorAll("#dInhalt .feld[data-wahl]").forEach((el) => el.addEventListener("pointerdown", () => { dlg.wahlNr = opt.felder.filter((fd) => fd.wahl).findIndex((fd) => fd.id === el.dataset.feld); zeigeWahl(); }));
  zeigeWahl();
}
// Assistent: Felder mit gleichem fd.schritt bilden eine Seite; die Dialoge führen so Schritt für Schritt durch die Eingabe (alle Felder bleiben im DOM, nur die Sichtbarkeit wechselt)
const schrittNamen = (o = dlg) => [...new Set((o?.felder || []).map((fd) => fd.schritt).filter(Boolean))];
function zeigeSchritt(nr) {
  const o = dlg, namen = schrittNamen(o), viele = namen.length > 1;
  if (nr != null) o.schritt = Math.max(0, Math.min(namen.length - 1, nr));
  const i = viele ? Math.min(o.schritt ?? 0, namen.length - 1) : 0;
  $("dSchritte").hidden = !viele; $("dZurueck").hidden = !viele || i === 0; $("dWeiter").hidden = !viele || i === namen.length - 1;
  document.querySelectorAll("#dInhalt .feld").forEach((el) => { el.hidden = viele && el.dataset.s !== namen[i]; });
  const zus = $("dZusatz"); if (zus) zus.hidden = viele && i !== namen.length - 1 && !o.zusatzAlle; // zusatzAlle: der Zusatzbereich bleibt in jedem Schritt sichtbar
  const hin = document.querySelector("#dInhalt .hinweis"); if (hin) hin.hidden = viele && i !== 0;
  if (viele) $("dSchritte").innerHTML = `<span class="titel">Schritt ${i + 1} von ${namen.length}: ${esc(namen[i])}</span>` + namen.map((n, k) => `<button type="button" data-k="${k}" class="${k === i ? "jetzt" : ""}" title="${esc(n)}">${k + 1}</button>`).join("");
  $("dSchritte").querySelectorAll("button").forEach((b) => (b.onclick = () => zeigeSchritt(+b.dataset.k)));
  if (viele) { const w = o.felder.filter((fd) => fd.wahl && fd.schritt === namen[i]); o.wahlNr = o.wahlNr === -1 ? -1 : (w.length ? o.felder.filter((fd) => fd.wahl).indexOf(w[0]) : o.wahlNr); if (nr != null) zeigeWahl(); }
}
$("dZurueck").onclick = () => zeigeSchritt((dlg?.schritt ?? 0) - 1);
$("dWeiter").onclick = () => zeigeSchritt((dlg?.schritt ?? 0) + 1);
// Felder den Schritten zuordnen: regeln = [[Schrittname, (id) => Bedingung], …]; das erste passende gilt, sonst der vorige Schritt
const mitSchritten = (felder, regeln) => { let akt = regeln[0][0]; return felder.map((fd) => { const r = regeln.slice(1).find(([, test]) => test(fd.id)); if (r) akt = r[0]; return { ...fd, schritt: akt }; }); };
const werte = () => Object.fromEntries(dlg.felder.map((fd) => { const v = $("d_" + fd.id).value; return [fd.id, fd.optionen || fd.text ? v : zahlAus(v)]; }));
// Formeln der Zahlenfelder (keine reinen Zahlen) → f.ausdruecke; ungültige Formeln rot markieren
function merkeAusdruecke(f) {
  if (!f || !dlg) return;
  const a = {};
  for (const fd of dlg.felder) {
    if (fd.optionen || fd.text) continue;
    const el = $("d_" + fd.id), t = el?.value.trim() ?? "";
    const gut = !t || istZahl(t) || Number.isFinite(zahlAus(t));
    el?.classList.toggle("ungueltig", !gut); el?.classList.toggle("formel", gut && !!t && !istZahl(t));
    if (el) el.title = gut && t && !istZahl(t) ? `= ${+zahlAus(t).toFixed(4)}` : gut ? "" : "Formel ungültig";
    if (gut && t && !istZahl(t)) a[fd.id] = t;
  }
  if (Object.keys(a).length) f.ausdruecke = a; else delete f.ausdruecke;
}
function schliesse() {
  if (dlg?.felder.some((fd) => fd.wahl)) status(""); // Hinweis «… anklicken» gilt nur im Dialog
  $("dialog").hidden = true; document.querySelector(".mitte")?.classList.remove("dialogMitWerk"); dlg = null; grundebenen.visible = false; hoverLoeschen(); zeichneGriffe(); setTimeout(leisteZustand);
}
$("dOk").onclick = () => { const m = dlg?.pflicht?.(); if (m) return status(m); dlg?.ok?.(werte()); schliesse(); if (nahtWz) endeNahtWz(); regen(); };
$("dAbbrechen").onclick = () => { dlg?.abbrechen?.(); schliesse(); if (nahtWz) endeNahtWz(); regen(); if (typeof wendeSchnittAn === "function") wendeSchnittAn(); };
$("dLoeschen").onclick = () => { dlg?.loeschen?.(); schliesse(); regen(); };

// Neue oder bestehende Features mit Live-Vorschau. felder(f) liefert die Felder, setze(f, w) übernimmt Werte.
// Skizzen, die ein neues Feature als Profil/Pfad/Fläche verwendet, werden ausgeblendet (im Browser wieder einblendbar)
function verwendeteSkizzenAusblenden(f) {
  const ids = new Set(); const nimm = (v) => { if (typeof v !== "string") return; const t = v.startsWith("L:") ? v.split(":")[1] : v.split(":")[0]; if (t) ids.add(t); };
  for (const k of ["skizze", "profil1", "profil2", "pfad", "fuehrung", "quelle"]) nimm(f[k]);
  for (const id of ids) { const sk = finde(id); if (sk?.typ === "skizze" && id !== f.id) sk.versteckt = true; }
}
function featureDialog(f, istNeu, felder, setze, titel, hinweis, extra = {}) {
  const kopie = JSON.parse(JSON.stringify(f, (k, v) => (k.startsWith("_") ? undefined : v))), alteAuswahl = auswahl;
  if (istNeu) einfuegen(f);
  auswahl = f.id; // Werkstatt zeigt das Teil schon während der Eingabe
  dialog({
    titel, hinweis, felder: felder(f), feature: f,
    info: () => (f._fehler ? "⚠ " + f._fehler : f._rund ? `Zuschnitt ${f1(f._rund.masse.zuschnitt[0])} × ${f1(f._rund.masse.zuschnitt[1])} mm${f._rund.art === "kegel" ? ` · R ${f1(f._rund.masse.R)} / r ${f1(f._rund.masse.r)} · ${f._rund.masse.phi.toFixed(2)}°` : ""}` : f._res ? `Zuschnitt ${f1(f._res.zuschnitt)} × ${laengeVon(f)} mm · ${f._res.biegungen.length} Biegungen` : ""),
    ...extra,
    aendern: (w, feld) => {
      setze(f, w); merkeAusdruecke(f);
      if (feld === "vorlage" || feld === "skizze" || feld === "vorgang" || extra.neuBei?.includes(feld)) { const d = dlg; dialog({ ...d, felder: felder(f) }); setze(f, werte()); }
      regen();
    },
    ok: (w) => { setze(f, w); merkeAusdruecke(f); auswahl = f.id; if (istNeu) verwendeteSkizzenAusblenden(f); },
    abbrechen: () => { if (istNeu) { entferneFeature(f); auswahl = alteAuswahl; } else Object.assign(f, kopie); },
    loeschen: istNeu ? null : () => { entferneFeature(f); auswahl = null; },
  });
  setze(f, werte()); regen();
}
// «Bis»: Ausdehnung bis zu einer gewählten Fläche/Ebene oder Kante statt eines Masses
const bisFelder = (f) => [{ id: "bis", label: "Bis", optionen: [["mass", "Mass (Abstand/Länge)"], ["ebene", "Bis Fläche / Ebene"], ["kante", "Bis Kante"]], wert: f.bis || "mass" },
  ...(f.bis === "ebene" ? [{ id: "bisEbene", label: "Bis Fläche / Ebene", wahl: "ebene", optionen: ebenenOpt(f, f.bisEbene || "XY"), wert: f.bisEbene || "XY" }] : []),
  ...(f.bis === "kante" ? [{ id: "bisKante", label: "Bis Kante", wahl: "kante", optionen: mitWert(kantenListe(f), f.bisKante), wert: f.bisKante || kantenListe(f)[0]?.[0] || "" }] : [])];
// Abstand entlang der Normalen n vom Punkt c bis zur gewählten Fläche (Schnitt der Geraden c + t·n mit der Ebene) bzw. Kante (Mittelpunkt); vorzeichenbehaftet
function bisAbstand(f, n, c) {
  n = V(n).normalize(); c = V(c);
  if (f.bis === "ebene") { const P = bezugEbene(f.bisEbene), n2 = V(P.n).normalize(), dn = n.dot(n2); if (Math.abs(dn) < 1e-6) throw new Error("Die gewählte Fläche liegt parallel zur Ausdehnungsrichtung – eine andere Fläche wählen"); return V(P.o).sub(c).dot(n2) / dn; }
  const k = bezugKante(f.bisKante); return V(k.p).addScaledVector(V(k.d), 0.5).sub(c).dot(n);
}
// Wert des Masses (abstand bzw. laenge) bei «Bis»: Vorzeichen je nach Richtung des Features
const wendeBisAn = (f, ebeneRef, versatz) => { if (!f.bis || f.bis === "mass") return; const E = E_(ebeneRef); f.laenge = bisWert(f, bisAbstand(f, E.n, zuWelt(E, versatz))); };
function extrusionMitteUV(f, sk) { // Punkt im Profil (Schwerpunkt der ersten gewählten Fläche bzw. der grössten Schleife)
  const regs = gewaehlteRegionen(f, sk); if (regs) return regs.length ? regs[0].innen : null;
  const p = schleifen(sk).sort((a, b) => Math.abs(flaeche(b)) - Math.abs(flaeche(a)))[0]; return p ? [p.reduce((a, q) => a + q[0], 0) / p.length, p.reduce((a, q) => a + q[1], 0) / p.length] : null;
}
const bisWert = (f, t) => (f.richtung === "umgekehrt" ? -t : f.richtung === "symmetrisch" ? 2 * Math.abs(t) : t);
const zweiFeld = (f, feld, label = "Länge") => (f.richtung === "zwei" ? [{ id: feld + "2", label: `${label} 2 (Gegenrichtung)`, einheit: "mm", wert: f[feld + "2"] ?? Math.round((+f[feld] || 100) / 2) }] : []);
const RICHTUNGEN = [["eine", "Eine Seite"], ["umgekehrt", "Umgekehrt"], ["symmetrisch", "Symmetrisch"], ["zwei", "Zwei Seiten (verschieden lang)"]];
const LAGEN = [["mitte", "Mitte"], ["links", "Links"], ["rechts", "Rechts"]];

function bearbeite(f) {
  if (!f || skizze) return;
  if (dlg) $("dAbbrechen").click();
  waehle(f.id);
  if (f.typ === "skizze") return starteSkizze(f);
  if (f.typ === "extrusion") return extrusionDialog(f);
  if (f.typ === "drehung") return drehungDialog(f);
  if (f.typ === "sweep") return sweepDialog(f);
  if (f.typ === "bild") return bildDialog(f);
  if (f.typ === "kanten3d") return kantenDialog(f);
  if (f.typ === "kehle") return kehleDialog(f);
  if (f.typ === "rundblech") return rundDialog(f);
  if (f.typ === "detail3d") return detail3dDialog(f);
  if (KOERPER_WZ[f.typ]) return koerperDialog(f.typ, f);
  if (KOERPER_WZ2[f.typ]) return koerper2Dialog(f.typ, f);
  if (f.typ === "biegung") return biegungDialog(f);
  if (f.typ === "rip") return ripDialog(f);
  if (f.typ === "loftflansch") return loftflanschDialog(f);
  if (f.typ === "loft") return loftDialog(f);
  if (f.typ === "blech") return blechDialog(f);
  if (f.typ === "vorlage") return vorlageDialog(f);
  if (f.typ === "profil") return profilDialog(f);
  if (f.typ === "flaechenteil") return bearbeite(f.eltern);
  if (f.typ === "flaeche") return flaecheDialog(f);
  if (f.typ === "kante") return kanteDialog(f);
  if (f.typ === "dach") return dachDialog(f);
  if (f.typ === "dachbleche") return dachblecheDialog(f);
  if (f.typ === "dachelement") return dachelementDialog(f);
  if (f.typ === "lukarne") return lukarneDialog(f);
  if (f.typ === "eindeckung") return eindeckungDialog(f);
  if (f.typ === "profilkante") return kanteDialog(f);
  if (f.typ === "quetschfalte") return quetschDialog(f);
  if (f.typ === "flanschende") return flanschEndeDialog(f);
  if (f.typ === "stirnquetsch") return stirnQuetschDialog(f);
  if (f.typ === "naht") return nahtDialog(f);
  if (f.typ === "gebaeude") { const d = doc.features.find((x) => x.typ === "dach" && x.gebaeude === f.id); return d ? dachDialog(d) : gebaeudeDialog(f); }
  if (f.typ === "abwickeln" || f.typ === "falten") return status(f.typ === "abwickeln" ? "Abwickeln: das Blech liegt flach, bis «Falten» folgt. Dazwischen Skizze + Extrusion «Ausschneiden»." : "Falten: bildet die Ausschnitte der Abwicklung aufs gekantete Blech ab.");
  if (f.typ === "ebene") return ebeneDialog(f.art, f);
  if (f.typ === "achse" || f.typ === "konpunkt") return konstruktionDialog(f.typ, f.art, f);
}

// Konstruktionsebene erstellen oder bearbeiten (Felder je nach Art, wie in Fusion)
function ebeneDialog(art, f) {
  const istNeu = !f, gew = finde(auswahl);
  const startRef = gew?.typ === "ebene" ? gew.id : "XY", erste = (l, i = 0) => l[i]?.[0] ?? "";
  if (!f) {
    const n = doc.features.filter((x) => x.typ === "ebene").length + 1;
    f = { id: neueId(), typ: "ebene", art, name: `${EBENEN_ARTEN[art]} ${n}` };
    Object.assign(f, {
      versatz: { ref: startRef, abstand: 50 }, winkel: { achse: "A:X", ref: "", winkel: 45 }, mitte: { ref: startRef, ref2: startRef === "XY" ? "YZ" : "XY" },
      kanten: { kante1: erste(kantenListe(), 3) || "A:X", kante2: erste(kantenListe(), 4) || "A:Y" }, punkte: { p1: "O", p2: erste(punkteListe(), 1), p3: erste(punkteListe(), 2) },
      tangente: { zylinder: erste(zylinderListe()), winkel: 0 }, pfad: { pfad: erste(pfadListe()), anteil: 0.5 }, flaeche: { flaeche: "" },
    }[art]);
  }
  const auswahlFeld = (id, label, wahl, liste) => ({ id, label, wahl, optionen: mitWert(liste.length ? liste : [["", "– nichts vorhanden –"]], f[id]), wert: f[id] });
  const felder = (f) => [
    { id: "name", label: "Name", text: true, wert: f.name },
    ...({
      versatz: () => [auswahlFeld("ref", "Bezugsebene", "ebene", ebenenOpt(f)), { id: "abstand", label: "Abstand", einheit: "mm", wert: f.abstand }],
      winkel: () => [auswahlFeld("achse", "Drehachse (Kante)", "kante", kantenListe(f)), auswahlFeld("ref", "Bezugsebene", "ebene", [["", "Automatisch (Ebene der Kante)"], ...ebenenOpt(f)]), { id: "winkel", label: "Winkel", einheit: "°", wert: f.winkel }],
      mitte: () => [auswahlFeld("ref", "Erste Ebene", "ebene", ebenenOpt(f)), auswahlFeld("ref2", "Zweite Ebene", "ebene", ebenenOpt(f))],
      kanten: () => [auswahlFeld("kante1", "Erste Kante", "kante", kantenListe(f)), auswahlFeld("kante2", "Zweite Kante", "kante", kantenListe(f))],
      punkte: () => ["p1", "p2", "p3"].map((k, i) => auswahlFeld(k, `Punkt ${i + 1}`, "punkt", punkteListe(f))),
      tangente: () => [auswahlFeld("zylinder", "Zylinderfläche", "zylinder", zylinderListe(f)), { id: "winkel", label: "Winkel um die Achse", einheit: "°", wert: f.winkel }],
      pfad: () => [auswahlFeld("pfad", "Pfad", "pfad", pfadListe(f)), { id: "lage", label: "Lage auf dem Pfad", einheit: "%", wert: +((f.anteil ?? 0.5) * 100).toFixed(2) }],
      flaeche: () => [auswahlFeld("flaeche", "Körperfläche", "ebene", [])],
    }[f.art])(),
  ];
  const setze = (f, w) => {
    const { name, lage, ...rest } = w;
    Object.assign(f, rest, { name: name?.trim() || f.name });
    if (lage != null) f.anteil = Math.min(Math.max((Number.isFinite(lage) ? lage : 50) / 100, 0), 1);
    for (const k of ["abstand", "winkel"]) if (k in f && !Number.isFinite(f[k])) f[k] = 0;
  };
  const hinweise = {
    versatz: "Bezugsebene oder ebene Körperfläche anklicken, Abstand eingeben (negativ = andere Seite).",
    winkel: "Drehachse anklicken: Skizzenlinie, Körperkante oder Achse. Ohne Bezugsebene wird bei Skizzenlinien deren Skizzenebene genommen.",
    mitte: "Zwei Ebenen oder Flächen anklicken. Parallel: Ebene genau dazwischen, sonst Winkelhalbierende durch die Schnittlinie.",
    kanten: "Zwei Kanten anklicken, die in einer Ebene liegen (parallel oder sich schneidend).",
    punkte: "Drei Punkte anklicken: Skizzenpunkte, Körperecken oder Ursprung.",
    tangente: "Zylindrische Fläche anklicken (extrudierter Kreis), Winkel um die Zylinderachse eingeben.",
    pfad: "Linie, Kreis oder Körperkante als Pfad anklicken. Lage in % der Pfadlänge (0 = Anfang, 100 = Ende); die Ebene steht senkrecht zum Pfad.",
    flaeche: "Ebene Körperfläche anklicken.",
  };
  const v3 = (a) => a.map((x) => +x.toFixed(1)).join(" / ");
  featureDialog(f, istNeu, felder, setze, EBENEN_ARTEN[f.art], hinweise[f.art],
    { info: () => (f._fehler ? "⚠ " + f._fehler : f._ebene ? `Ursprung ${v3(f._ebene.o)} · Normale ${v3(f._ebene.n)}` : "") });
}

function extrusionDialog(f) {
  const istNeu = !f;
  const sk = doc.features.filter((x) => x.typ === "skizze" && (schleifen(x).length || skizzenRegionen(x).length));
  if (!sk.length) return fehltDialog("Extrudieren", "Zuerst eine Skizze mit geschlossenem Profil zeichnen (Rechteck, Kreis oder geschlossener Linienzug).");
  f ||= { id: neueId(), typ: "extrusion", name: "Extrusion " + (doc.features.filter((x) => x.typ === "extrusion").length + 1), skizze: vorSk(sk).id, flaechen: [], abstand: 100, richtung: "eine", vorgang: finde(vorSk(sk).ebene)?.art === "flaeche" ? "verbinden" : "neu" }; // Skizze auf einer Körperfläche: sinnvoll ist meist «Vereinigen»
  featureDialog(f, istNeu, (f) => [
    { id: "skizze", label: Array.isArray(f.flaechen) ? "Flächen in" : "Profil aus", wahl: Array.isArray(f.flaechen) ? "flaechen" : "profil", optionen: sk.map((s) => [s.id, s.name]), wert: f.skizze },
    { id: "abstand", label: f.richtung === "zwei" ? "Abstand 1" : "Abstand", einheit: "mm", wert: f.abstand },
    { id: "richtung", label: "Richtung", optionen: RICHTUNGEN, wert: f.richtung },
    ...zweiFeld(f, "abstand", "Abstand"),
    { id: "konisch", label: "Konuswinkel (Entformung, + = nach innen)", einheit: "°", wert: f.konisch ?? 0 },
    ...bisFelder(f),
    ...vorgangFelder(f),
  ], (f, w) => { if (Array.isArray(f.flaechen) && w.skizze !== f.skizze) f.flaechen = []; Object.assign(f, w); }, "Extrudieren",
  "Fläche(n) in der Skizze anklicken (jede Teilfläche einzeln, auch Überlappungen und Inseln; nochmals anklicken = abwählen). Vorgang wie in Fusion: neuer Körper, vereinigen, ausschneiden oder schneiden.",
  { neuBei: ["richtung", "bis"], pflicht: () => (Array.isArray(f.flaechen) && !f.flaechen.length ? "Zuerst mindestens eine Fläche in der Skizze anklicken." : "") });
}

const VORGAENGE = [["neu", "Neuer Körper"], ["verbinden", "Vereinigen"], ["ausschneiden", "Ausschneiden"], ["schneiden", "Schneiden (Schnittmenge)"]];
const vorgangFelder = (f) => [
  { id: "vorgang", label: "Vorgang", optionen: VORGAENGE, wert: f.vorgang || "neu" },
  ...((f.vorgang || "neu") === "neu" ? [] : [{ id: "ziel", label: "Körper", optionen: [["alle", f.vorgang === "verbinden" ? "Erster Körper" : "Alle Körper"], ...vorher(f).filter((x) => (["extrusion", "drehung", "sweep", "loft"].includes(x.typ) || (f.vorgang === "ausschneiden" && ["flaeche", "blech", "vorlage", "profil"].includes(x.typ))) && (x.vorgang || "neu") === "neu").map((x) => [x.id, x.name])], wert: f.ziel || "alle" }]),
];
// Drehachse: «U»/«V» (Skizzenachsen durch den Ursprung) oder «Element-ID:Kante» einer geraden Linie der Skizze
function drehAchse(sk, achse) {
  if (achse === "U" || !achse) return [[0, 0], [1, 0]];
  if (achse === "V") return [[0, 0], [0, 1]];
  const [id, k] = String(achse).split(":").map(Number), el = sk.elemente.find((e) => e.id === id);
  if (el?.art !== "linie" || !el.pts[k]) return [null, null];
  const a = el.pts[k], b = el.pts[(k + 1) % el.pts.length]; return [a, [b[0] - a[0], b[1] - a[1]]];
}
const achsenOpt = (sk) => [["U", "Horizontale Achse der Skizze"], ["V", "Vertikale Achse der Skizze"],
  ...(sk?.elemente || []).filter((el) => el.art === "linie").flatMap((el, n) => el.pts.slice(0, el.geschlossen ? undefined : -1).map((_, k) => [`${el.id}:${k}`, `${el.hilfs ? "Hilfslinie" : "Linie"} ${n + 1}, Kante ${k + 1}`]))];
function drehungDialog(f) {
  const istNeu = !f;
  const sk = doc.features.filter((x) => x.typ === "skizze" && schleifen(x).length);
  if (!sk.length) return fehltDialog("Drehen", "Zuerst eine Skizze mit geschlossenem Profil und einer Achse (z. B. Hilfslinie) zeichnen.");
  f ||= { id: neueId(), typ: "drehung", name: "Drehung " + (doc.features.filter((x) => x.typ === "drehung").length + 1), skizze: vorSk(sk).id, achse: "V", winkel: 360, vorgang: "neu" };
  featureDialog(f, istNeu, (f) => [
    { id: "skizze", label: "Profil aus", wahl: "profil", optionen: sk.map((s) => [s.id, s.name]), wert: f.skizze },
    { id: "achse", label: "Achse", wahl: "drehachse", optionen: achsenOpt(finde(f.skizze)), wert: f.achse },
    { id: "winkel", label: "Winkel", einheit: "°", wert: f.winkel ?? 360 },
    ...vorgangFelder(f),
  ], (f, w) => Object.assign(f, w), "Drehen", "Geschlossene Profile der Skizze um eine Achse drehen. Achse: das Feld «Achse» antippen und eine Linie (auch Hilfslinie) oder die Skizzenachse in der Ansicht anklicken – sie leuchtet blau. Das Profil darf die Achse nicht kreuzen.");
}

function blechDialog(f) {
  const istNeu = !f;
  const sk = doc.features.filter((x) => x.typ === "skizze" && ketten(x).length);
  if (!sk.length) return fehltDialog("Blechprofil", "Zuerst eine Skizze mit offenem Linienzug zeichnen: Blechmitte oder eine Blechoberfläche.");
  f ||= { id: neueId(), typ: "blech", name: "Blechprofil " + (doc.features.filter((x) => x.typ === "blech").length + 1), skizze: vorSk(sk).id, kette: Math.max(0, ketten(vorSk(sk)).findIndex((k) => !k.mitBogen)), lage: einst.neu.lage, material: neuMaterial(), laenge: einst.neu.laenge, stueck: einst.neu.stueck, richtung: "eine" };
  const REGELN = [["Linienzug", () => true], ["Lage des Blechs", (id) => ["lage", "umkehren"].includes(id)], ["Material und Länge", (id) => ["material", "laenge", "laenge2", "stueck", "notiz", "richtung", "bis", "bisEbene", "bisKante"].includes(id)]];
  featureDialog(f, istNeu, (f) => mitSchritten([
    { id: "skizze", label: "Linienzug aus", wahl: "kette", optionen: sk.map((s) => [s.id, s.name]), wert: f.skizze },
    { id: "kette", label: "Linienzug", optionen: ketten(finde(f.skizze) || vorSk(sk)).map((k, i) => [i, `Nr. ${i + 1}${k.mitBogen ? " (mit Bogen)" : ""}`]), wert: f.kette },
    { id: "lage", label: "Blech zur Linie", optionen: LAGEN, wert: f.lage ?? "mitte" },
    { id: "umkehren", label: "Kante A", optionen: [["", "Am Anfang der Linie"], ["1", "Am Ende der Linie"]], wert: f.umkehren ? "1" : "" },
    { id: "material", label: "Material", optionen: matOpt(), wert: f.material },
    { id: "laenge", label: "Länge", einheit: "mm", wert: f.laenge },
    { id: "stueck", label: "Stück", wert: f.stueck ?? 1 },
    { id: "notiz", label: "Notiz", text: true, wert: f.notiz ?? "" },
    { id: "richtung", label: "Richtung", optionen: RICHTUNGEN, wert: f.richtung },
    ...zweiFeld(f, "laenge"),
    ...bisFelder(f),
  ], REGELN), (f, w) => Object.assign(f, w, { kette: Math.min(+w.kette || 0, ketten(finde(w.skizze)).length - 1), umkehren: w.umkehren === "1" }), "Blechprofil",
  "Jeder Knick wird zur Biegung mit dem Innenradius des Materials. «Mitte»: die Linie ist die Blechmitte. «Links/Rechts»: die Linie ist eine Blechoberfläche (gezeichnete Masse = Innen- bzw. Aussenmasse), das Blech liegt in Pfeilrichtung gesehen links bzw. rechts davon. In der Ansicht: grüner Punkt = Kante A, blauer Pfeil = Richtung.", { neuBei: ["richtung", "bis"] });
}

// Spengler-Vorlagen: eingebaute (parametrisch) und eigene (gespeicherte Profile, Einstellungen › Vorlagen); eigene haben die Kennung «eigen:<Name>» und keine Parameter
const vorlagenListe = () => [...VORLAGEN, ...(einst.vorlagen || []).map((v) => ({ id: `eigen:${v.name}`, name: `${v.name} (eigene)`, params: [], eigen: v, bau: (p, m) => freiesProfil(v.start, v.zeilen, m) }))];
const vorlageDef = (id) => VORLAGE[id] || vorlagenListe().find((x) => x.id === id) || (String(id).startsWith("eigen:") ? null : VORLAGEN[0]);
// Vorlage eines Features: eigene Vorlagen werden im Feature als Kopie mitgeführt, damit das Projekt auch ohne die Einstellung geöffnet werden kann
const vorlageVon = (f) => { const d = vorlageDef(f.vorlage); if (d) return d; if (f.eigen) return { id: f.vorlage, name: f.name, params: [], bau: (p, m) => freiesProfil(f.eigen.start, f.eigen.zeilen, m) }; throw new Error(`Eigene Vorlage «${String(f.vorlage).slice(6)}» fehlt – unter Einstellungen › Vorlagen anlegen oder eine andere Vorlage wählen`); };
const vorlageStandard = (id) => (VORLAGE[id] ? standardwerte(id) : {});
function eigeneVorlageSpeichern(name, start, zeilen) { // legt die Vorlage an oder aktualisiert die gleichnamige
  name = String(name || "").trim(); if (!name) return status("Zuerst einen Namen für die Vorlage eingeben.");
  const v = { name, start: Number.isFinite(start) ? start : 0, zeilen: JSON.parse(JSON.stringify(zeilen)) }, i = einst.vorlagen.findIndex((x) => x.name === name);
  if (i >= 0) einst.vorlagen[i] = v; else einst.vorlagen.push(v);
  einstSpeichern(); status(`Vorlage «${name}» ${i >= 0 ? "aktualisiert" : "gespeichert"}: im Werkzeug «Spengler-Vorlage» unter «Vorlage» wählbar.`);
}
function vorlageDialog(f) {
  const istNeu = !f;
  f ||= { id: neueId(), typ: "vorlage", name: VORLAGEN[0].name, vorlage: VORLAGEN[0].id, params: standardwerte(VORLAGEN[0].id), material: neuMaterial(), laenge: einst.neu.laenge, stueck: einst.neu.stueck, richtung: "eine", ebene: einst.neu.ebene };
  const felder = (f) => [
    { id: "vorlage", label: "Vorlage", optionen: vorlagenListe().map((x) => [x.id, x.name]), wert: f.vorlage },
    { id: "name", label: "Name", text: true, wert: f.name },
    ...vorlageVon(f).params.map(([k, l, e]) => ({ id: "p_" + k, label: l, einheit: e, wert: f.params[k] })),
    { id: "material", label: "Material", optionen: matOpt(), wert: f.material },
    { id: "laenge", label: "Länge", einheit: "mm", wert: f.laenge },
    { id: "richtung", label: "Richtung", optionen: RICHTUNGEN, wert: f.richtung || "eine" },
    ...zweiFeld(f, "laenge"),
    ...bisFelder(f),
    { id: "stueck", label: "Stück", wert: f.stueck ?? 1 },
    { id: "notiz", label: "Notiz", text: true, wert: f.notiz ?? "" },
    { id: "ebene", label: "Querschnitt in", wahl: "ebene", optionen: ebenenOpt(f, f.ebene), wert: f.ebene },
  ];
  const setze = (f, w) => {
    if (w.vorlage !== f.vorlage) { // Name nur mitwechseln, wenn er nicht von Hand geändert wurde
      if (f.name === vorlageVon(f).name) f.name = vorlageDef(w.vorlage).name;
      f.vorlage = w.vorlage; f.params = vorlageStandard(w.vorlage); const ev = vorlageDef(w.vorlage)?.eigen; if (ev) f.eigen = JSON.parse(JSON.stringify(ev)); else delete f.eigen; return;
    }
    f.name = w.name.trim() || f.name;
    for (const [k] of vorlageVon(f).params) if (Number.isFinite(w["p_" + k])) f.params[k] = w["p_" + k];
    Object.assign(f, { material: w.material, laenge: w.laenge, stueck: w.stueck, ebene: w.ebene, notiz: w.notiz, richtung: w.richtung || f.richtung || "eine", bis: w.bis || "mass", ...(w.bisEbene ? { bisEbene: w.bisEbene } : {}), ...(w.bisKante ? { bisKante: w.bisKante } : {}) }); if (Number.isFinite(w.laenge2)) f.laenge2 = w.laenge2;
  };
  const REGELN = [["Vorlage", () => true], ["Masse", (id) => id.startsWith("p_")], ["Material, Länge, Lage", (id) => ["material", "laenge", "laenge2", "richtung", "bis", "bisEbene", "bisKante", "stueck", "notiz", "ebene"].includes(id)]];
  featureDialog(f, istNeu, (f) => mitSchritten(felder(f), REGELN), setze, "Spengler-Vorlage", "Eigene Vorlagen anlegen: die gewählte Vorlage unten als eigene Vorlage speichern oder ein neues Profil zeichnen – sie erscheinen danach in der Liste «Vorlage».", {
    wahlNr: -1, neuBei: ["richtung", "bis"], zusatzAlle: true,
    zusatz: () => `<div class="reihe"><button class="knopf" type="button" data-vorlage="speichern" title="Die Form der gewählten Vorlage (mit den eingestellten Massen) als eigene Vorlage ablegen">Als eigene Vorlage speichern</button><button class="knopf" type="button" data-vorlage="neu" title="Neues Profil schenkelweise eingeben und als Vorlage ablegen">Neue Vorlage anlegen …</button></div>`,
    binden: (box) => box?.addEventListener("click", (e) => {
      const t = e.target.closest("[data-vorlage]"); if (!t) return;
      if (t.dataset.vorlage === "neu") { const d = dlg; $("dAbbrechen").click(); setTimeout(() => profilDialog(), 0); return; }
      try { const m = material(f.material), { start, zeilen } = alsZeilen(...Object.values(vorlageVon(f).bau(f.params, m))); const name = f.name.trim() || vorlageVon(f).name; eigeneVorlageSpeichern(name === vorlageVon(f).name ? name + " (eigen)" : name, start, zeilen); const d = dlg; if (d) { dialog({ ...d, felder: mitSchritten(felder(f), REGELN) }); } }
      catch (err) { status("Diese Vorlage lässt sich nicht als Zeilen ablegen: " + err.message); }
    }) });
}

// Freies Profil: Schenkel als Tabelle, Winkel jeweils nach dem Schenkel
function profilDialog(f) {
  const istNeu = !f;
  f ||= { id: neueId(), typ: "profil", name: "Profil " + (doc.features.filter((x) => x.typ === "profil").length + 1), start: 0,
    zeilen: [{ L: 100, winkel: 90, art: "abkanten" }, { L: 50, winkel: 0, art: "abkanten" }], material: neuMaterial(), laenge: einst.neu.laenge, stueck: einst.neu.stueck, richtung: "eine", ebene: einst.neu.ebene };
  const felder = (f) => [
    ...(einst.vorlagen.length ? [{ id: "eigene", label: "Eigene Vorlage", optionen: [["", "–"], ...einst.vorlagen.map((v, i) => [i, v.name])], wert: "" }] : []),
    { id: "name", label: "Name", text: true, wert: f.name },
    { id: "start", label: "Startwinkel", einheit: "°", wert: f.start },
    { id: "material", label: "Material", optionen: matOpt(), wert: f.material },
    { id: "laenge", label: "Länge", einheit: "mm", wert: f.laenge },
    { id: "richtung", label: "Richtung", optionen: RICHTUNGEN, wert: f.richtung || "eine" },
    ...zweiFeld(f, "laenge"),
    ...bisFelder(f),
    { id: "stueck", label: "Stück", wert: f.stueck ?? 1 },
    { id: "notiz", label: "Notiz", text: true, wert: f.notiz ?? "" },
    { id: "ebene", label: "Querschnitt in", wahl: "ebene", optionen: ebenenOpt(f, f.ebene), wert: f.ebene },
  ];
  const setze = (f, w) => {
    const { eigene, ...rest } = w;
    Object.assign(f, rest, { name: w.name.trim() || f.name, start: Number.isFinite(w.start) ? w.start : 0 });
    if (eigene !== "" && eigene != null && einst.vorlagen[+eigene]) { // Schenkel aus der eigenen Vorlage übernehmen
      const v = einst.vorlagen[+eigene];
      Object.assign(f, { name: v.name, start: v.start, zeilen: JSON.parse(JSON.stringify(v.zeilen)) });
      setTimeout(() => { const d = dlg; if (d) { dialog({ ...d, felder: felder(f) }); regen(); } });
    }
  };
  const messungHtml = () => { if (!f.herkunft) return ""; const d = abweichungen(f, material(f.material)?.t);
    return `<div class="messung ${d.length ? "abw" : ""}"><b>Aus Massaufnahme ${esc(f.herkunft.messaufnahmeId)}</b> <span class="pjmarke${d.length ? " warn" : ""}">${d.length ? "im CAD geändert" : "wie gemessen"}</span>
      ${d.length ? `<ul>${d.map((x) => `<li>${esc(x)}</li>`).join("")}</ul><button class="knopf klein" data-messung-zurueck>Auf Messwerte zurücksetzen</button>` : '<small class="hinweis">Masse stimmen mit der Baustellen-Messung überein.</small>'}
      ${cloud.angemeldet ? '<div class="mknoepfe"><button class="knopf klein" data-messung-neu title="Aktuelle Messwerte aus der App holen">Aus App aktualisieren</button></div>' : ""}<small class="hinweis" data-messung-text></small></div>`; };
  const tabelle = () => messungHtml() + `<table class="zeilen"><thead><tr><th>#</th><th>Schenkel mm</th><th>Winkel °</th><th>Art</th><th></th></tr></thead><tbody>
    ${f.zeilen.map((z, i) => { const letzte = i === f.zeilen.length - 1; return `<tr data-i="${i}"><td>${i + 1}</td>
      <td><input data-k="L" type="number" step="any" inputmode="decimal" value="${z.L}" aria-label="Schenkel ${i + 1} Länge"></td>
      <td>${letzte ? "–" : `<input data-k="winkel" type="number" step="any" inputmode="decimal" value="${z.winkel}" aria-label="Winkel nach Schenkel ${i + 1}">`}</td>
      <td>${letzte ? "" : `<select data-k="art" aria-label="Art nach Schenkel ${i + 1}"><option value="abkanten" ${z.art !== "umschlag" ? "selected" : ""}>Abkanten</option><option value="umschlag" ${z.art === "umschlag" ? "selected" : ""}>Umschlag</option></select>`}</td>
      <td>${f.zeilen.length > 2 ? `<button class="weg" data-weg="${i}" aria-label="Schenkel ${i + 1} entfernen">×</button>` : ""}</td></tr>`; }).join("")}
    </tbody></table><div class="reihe"><button class="knopf" data-neu>+ Schenkel</button><button class="knopf" data-vorlage-speichern title="Dieses Profil unter dem eingegebenen Namen als Vorlage ablegen (Werkzeug «Spengler-Vorlage»)">Als Vorlage speichern</button></div>`;
  const neu = () => { const d = dlg; dialog({ ...d, felder: felder(f) }); regen(); };
  const messungNeuLaden = async (box) => { // aktuelle Messwerte aus der App holen; geänderte CAD-Masse nur nach Rückfrage überschreiben
    const t = box.querySelector("[data-messung-text]"), say = (x) => { if (t) t.textContent = x; };
    say("Lade aus der App …");
    try {
      const z = await cloud.client.appMassaufnahme(f.herkunft.messaufnahmeId);
      if (!z) return say("Die Massaufnahme gibt es in der App nicht mehr.");
      const r = aktualisiereAusMessung(f, ausAppZeile(z));
      if (!r.ok) return say(r.fehler.join(" "));
      if (!r.geaendert) return say("Keine neuere Messung – Stand der App ist unverändert.");
      if (abweichungen(f, material(f.material)?.t).length && !confirm("Das Bauteil wurde im CAD geändert. Mit den neuen Messwerten der App überschreiben?")) return say("Abgebrochen.");
      Object.assign(f, r.neu);
      const mm = einst.materialien.find((x) => x.t === +r.staerke);
      if (mm) f.material = mm.id;
      neu(); status(mm ? "Bauteil mit den aktuellen Messwerten der App aktualisiert." : `Bauteil aktualisiert – aber kein Material mit ${r.staerke} mm vorhanden, Material bitte prüfen.`);
    } catch (x) { say(x.art === "netz" ? "Keine Verbindung zur App." : x.message || String(x)); }
  };
  const binden = (box) => {
    box.addEventListener("input", (e) => {
      const k = e.target.dataset.k, i = +e.target.closest("tr")?.dataset.i; if (!k) return;
      f.zeilen[i][k] = k === "art" ? e.target.value : parseFloat(e.target.value);
      const mb = box.querySelector(".messung"); if (mb) mb.outerHTML = messungHtml();
      regen();
    });
    box.addEventListener("click", (e) => {
      if (e.target.dataset.messungNeu != null) { messungNeuLaden(box); }
      else if (e.target.dataset.messungZurueck != null) { f.zeilen = JSON.parse(JSON.stringify(f.herkunft.zeilen)); if (f.herkunft.laenge != null) f.laenge = f.herkunft.laenge; const mm0 = einst.materialien.find((x) => x.t === +f.herkunft.staerke); if (mm0) f.material = mm0.id; neu(); }
      else if (e.target.dataset.weg != null) { f.zeilen.splice(+e.target.dataset.weg, 1); f.zeilen.at(-1).winkel = 0; neu(); }
      else if (e.target.dataset.vorlageSpeichern != null) { const w = werte(); eigeneVorlageSpeichern(w.name || f.name, Number.isFinite(w.start) ? w.start : f.start, f.zeilen); }
      else if (e.target.dataset.neu != null) { const l = f.zeilen.at(-1); l.winkel = 90; l.art = "abkanten"; f.zeilen.push({ L: 30, winkel: 0, art: "abkanten" }); neu(); box.querySelector("tr:last-child input")?.focus(); }
    });
  };
  featureDialog(f, istNeu, felder, setze, "Freies Profil",
    "Winkel nach dem Schenkel: + biegt nach oben (links), − nach unten (rechts). Umschlag = 180°, Vorzeichen gibt die Seite. Masse auf der Blechmitte.",
    { zusatz: tabelle, binden, wahlNr: -1, neuBei: ["richtung", "bis"] });
}


// ------------------------------------------------------------ Rund-/Kegelblech (Zylinder- oder Kegelmantel mit exakter Abwicklung)
// Meridian-Querschnitt (r, h) mit Dicke t senkrecht zur Mantellinie – gleich für Netz und exakten Körper
const rohrNeigung = (f) => (f.art === "zylinder" && +f.neigung > 0 ? +f.neigung : 0);
// Rohr mit schrägem Anschnitt: Schnittebene durch den Ursprung der Grundfläche, z = tan α · x_u (kürzeste Mantellinie bei +u)
function rohrSchnitt(f) {
  const E = E_(f.ebene), ta = Math.tan((rohrNeigung(f) * Math.PI) / 180), N = V(E.u).multiplyScalar(ta).sub(V(E.n)).normalize();
  return { E, ta, N, H: f.h + (f.d1 / 2) * ta };
}
function rohrSchnittWerkzeug(f) { // grosser Quader auf der wegzuschneidenden Seite (Netz-Rechnung)
  const { E, N } = rohrSchnitt(f), S = 4 * (f.d1 + f.h + 100), X = new THREE.Vector3().crossVectors(N, Math.abs(N.y) < 0.9 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0)).normalize(), Y = new THREE.Vector3().crossVectors(N, X);
  const g = new THREE.BoxGeometry(S, S, S); g.translate(0, 0, S / 2); g.applyMatrix4(new THREE.Matrix4().makeBasis(X, Y, N).setPosition(V(E.o))); return g;
}
function rundMeridian(f, m) {
  if (rohrNeigung(f)) { // Rohr: Rechteck vom Schnitt (unten, mit Reserve) bis zur Oberkante H
    const { ta, H } = rohrSchnitt(f), ri = f.d1 / 2 - m.t / 2, ra = f.d1 / 2 + m.t / 2, zb = -ra * ta - 1;
    return [[ri, zb], [ra, zb], [ra, H], [ri, H], [ri, zb]];
  }
  const t = m.t, r1 = f.d1 / 2, r2 = (f.art === "zylinder" ? f.d1 : f.d2) / 2, s = Math.hypot(r1 - r2, f.h), nx = f.h / s, ny = (r1 - r2) / s;
  const p = (r, z, d) => [r + nx * d, z + ny * d];
  return [p(r1, 0, -t / 2), p(r1, 0, t / 2), p(r2, f.h, t / 2), p(r2, f.h, -t / 2), p(r1, 0, -t / 2)];
}
function rundGeometrie(f, m) {
  const E = E_(f.ebene), q = rundMeridian(f, m).map(([r, h]) => new THREE.Vector2(r, h));
  const phi = (Math.min(360, f.winkel || 360) * Math.PI) / 180, voll = phi >= 2 * Math.PI - 1e-9, geos = [new THREE.LatheGeometry(q, Math.max(16, Math.round((96 * phi) / (2 * Math.PI))), 0, phi)];
  if (!voll) for (const w of [0, phi]) { const k = new THREE.ShapeGeometry(new THREE.Shape(q.slice(0, -1))); k.applyMatrix4(new THREE.Matrix4().makeRotationY(w - Math.PI / 2)); geos.push(k); }
  // Lathe: um lokal Y, Start bei lokal +Z → Y = Ebenennormale, Z = u, X = Y × Z = v (wie der exakte Drehkörper)
  const M = new THREE.Matrix4().makeBasis(V(E.v), V(E.n), V(E.u)).setPosition(V(E.o));
  return zusammen(geos.map((g) => { const n = g.index ? g.toNonIndexed() : g; n.deleteAttribute("uv"); n.applyMatrix4(M); return n; }));
}
function rundDialog(f) {
  const istNeu = !f;
  f ||= { id: neueId(), typ: "rundblech", name: "Rundblech " + (doc.features.filter((x) => x.typ === "rundblech").length + 1), art: "kegel", d1: 400, d2: 200, h: 150, winkel: 360, zugabe: 10,
    material: neuMaterial(), stueck: einst.neu.stueck, ebene: "XZ" };
  const felder = (f) => [
    { id: "name", label: "Name", text: true, wert: f.name },
    { id: "art", label: "Form", optionen: [["kegel", "Kegelstumpf / Kegel"], ["zylinder", "Zylinder (Rohr)"]], wert: f.art },
    { id: "d1", label: "Ø unten (Blechmitte)", einheit: "mm", wert: f.d1 },
    ...(f.art === "zylinder" ? [] : [{ id: "d2", label: "Ø oben (0 = Spitze)", einheit: "mm", wert: f.d2 }]),
    { id: "h", label: f.art === "zylinder" ? "Höhe (kürzeste Seite)" : "Höhe", einheit: "mm", wert: f.h },
    ...(f.art === "zylinder" ? [{ id: "neigung", label: "Anschnitt unten (Dachneigung, 0 = gerade)", einheit: "°", wert: f.neigung ?? 0 }] : []),
    { id: "winkel", label: "Umfang (360 = ganz)", einheit: "°", wert: f.winkel },
    { id: "zugabe", label: "Zugabe an der Naht", einheit: "mm", wert: f.zugabe ?? 0 },
    { id: "material", label: "Material", optionen: matOpt(), wert: f.material },
    { id: "stueck", label: "Stück", wert: f.stueck ?? 1 },
    { id: "notiz", label: "Notiz", text: true, wert: f.notiz ?? "" },
    { id: "ebene", label: "Grundfläche in", wahl: "ebene", optionen: ebenenOpt(f, f.ebene), wert: f.ebene },
  ];
  const setze = (f, w) => { const alt = f.art; Object.assign(f, w, { name: w.name.trim() || f.name }); if (alt !== f.art) setTimeout(() => { const d = dlg; if (d) dialog({ ...d, felder: felder(f) }); }); };
  const REGELN = [["Form und Masse", () => true], ["Material und Lage", (id) => ["zugabe", "material", "stueck", "notiz", "ebene"].includes(id)]];
  featureDialog(f, istNeu, (f) => mitSchritten(felder(f), REGELN), setze, "Rund-/Kegelblech",
    "Masse auf der Blechmitte. Die Abwicklung wird exakt auf der K-Faser des Materials gerechnet (Zylinder und Kegel sind abwickelbar). Zugabe = Überlappung an der Naht.");
}
function zeigeRund(w, f) {
  const a = f._rund, M = a.masse, m = material(f.material), kegel = a.art === "kegel", rohr = a.art === "rohr", rk = M.faserDurchmesser / 2;
  const flaeche = kegel ? (M.phi * Math.PI / 360) * (M.R * M.R - M.r * M.r) + M.zugabe * (M.R - M.r)
    : rohr ? M.breite * M.kurz + rk * rk * Math.tan((M.neigung * Math.PI) / 180) * (M.breite / rk - Math.sin(M.breite / rk)) + M.zugabe * M.kurz : (M.breite + M.zugabe) * M.hoehe;
  const zeilen = rohr ? [["Abwicklungsbreite", `${f1(M.breite)} mm`], ["Länge kurz / lang", `${f1(M.kurz)} / ${f1(M.lang)} mm`], ["Anschnitt (Dachneigung)", `${M.neigung}°`], ["Ø K-Faser", `${f1(M.faserDurchmesser)} mm`]]
    : kegel
    ? [["Radius aussen R", `${f1(M.R)} mm`], ["Radius innen r", `${f1(M.r)} mm`], ["Öffnungswinkel", `${M.phi.toFixed(3)}°`], ["Sehne", `${f1(M.sehne)} mm`], ["Mantellinie", `${f1(M.mantellinie)} mm`]]
    : [["Abwicklungsbreite", `${f1(M.breite)} mm`], ["Höhe", `${f1(M.hoehe)} mm`], ["Ø K-Faser", `${f1(M.faserDurchmesser)} mm`]];
  zeilen.push(["Zugabe Naht", `${f1(M.zugabe)} mm`], ["Gewicht", m.dichte ? `${(flaeche * m.t * m.dichte * 1e-6).toFixed(3)} kg` : "–"]);
  w.innerHTML = `<div class="zahl"><b>${f1(M.zuschnitt[0])} × ${f1(M.zuschnitt[1])}</b><span>mm Zuschnitt (Rechteck)</span></div>
    <div class="unter">${esc(f.name)} · ${kegel ? (f.d2 > 0 ? "Kegelstumpf" : "Kegel") : rohr ? `Rohr, Anschnitt ${M.neigung}°` : "Zylinder"} · ${esc(m.name)} · ${f.stueck ?? 1} Stk.</div>
    ${f.notiz?.trim() ? `<div class="notiz"><b>Notiz</b> ${esc(f.notiz)}</div>` : ""}
    <div class="zeichnung">${rundblechSvg(a, { breite: 276 })}</div>
    <table class="liste"><tbody>${zeilen.map(([k, v]) => `<tr><td>${k}</td><td class="num">${v}</td></tr>`).join("")}</tbody></table>
    <p class="hinweis">Exakt abwickelbar${rohr ? "; die Anschnittkurve ist L(θ) = h + r·tan α·(1 − cos θ), im DXF als Polylinie in 1°-Schritten" : ""}. Gerechnet auf der K-Faser (k ${m.k}, t ${m.t} mm). Rot gestrichelt: Nahtlinie (Überlappung anreissen).</p>
    <div class="reihe"><button class="knopf haupt" id="kRundDxf">DXF speichern</button><button class="knopf" id="kRundKopie">Masse kopieren</button></div>`;
  $("kRundDxf").onclick = () => herunterladen(`${doc.nr} ${f.name}.dxf`, rundblechDxf(a, f.name), "application/dxf");
  $("kRundKopie").onclick = () => kopiere([`${doc.objekt} · Nr. ${doc.nr} · ${f.name}`, `${m.name} · Zuschnitt ${f1(M.zuschnitt[0])} × ${f1(M.zuschnitt[1])} mm`, ...zeilen.map(([k, v]) => `${k}\t${v}`)].join("\n"));
}

// ------------------------------------------------------------ Flächenblech: Grundfläche aus der Skizze, Kantenbausteine je Kante
const alleBausteine = () => [...(einst.bausteine || []), ...(doc.bausteine || []).filter((b) => !(einst.bausteine || []).some((e) => e.id === b.id))];
const bausteinFuer = (v) => !v ? null : typeof v === "string" ? alleBausteine().find((b) => b.id === v) || null : { id: "", name: v.werkzeug ? werkzeugName(v.werkzeug) : "Eigene Abkantfolge", folge: v.folge, versatz: +v.versatz || 0, ...(v.werkzeug ? { werkzeug: v.werkzeug } : {}) };
const bausteinName = (v) => (!v ? "–" : bausteinFuer(v)?.name || `fehlt (${v})`);
// Profilquerschnitt eines Bausteins für 3D: kurzer Anfangsschenkel auf der Fläche, Kante bei x = 0
function bausteinKontur(b0, m) {
  const b = werkzeugAuf(b0, m);
  const zeilen0 = (L) => folge(`${L} ${bausteinFolge(b, m)}`);
  for (const L of [1, 2, 4, 8, 16, 30]) {
    try {
      const { start, ops } = freiesProfil(0, zeilen0(L), m), res = berechne(start, ops, m.t, m.ri, m.k), v = +b.versatz || 0;
      const ring = kontur(res.pfad, m.t, 6).map(([x, y]) => [x - L + v, y]), mitte = [];
      for (const el of res.pfad) { if (el.typ === "linie") { if (!mitte.length) mitte.push([el.p1[0] - L + v, el.p1[1]]); mitte.push([el.p2[0] - L + v, el.p2[1]]); } else { const a = (el.winkel * Math.PI) / 180; for (let i = 0; i <= 12; i++) { const w = el.start + (a * i) / 12; mitte.push([el.zentrum[0] + el.rm * Math.cos(w) - L + v, el.zentrum[1] + el.rm * Math.sin(w)]); } } }
      const bg0 = res.pfad.find((e) => e.typ === "bogen"); if (bg0) ring.bisPunkt = [bg0.p2[0] - L + v, bg0.p2[1]]; // Ende der ersten Biegung (für die Freistellung)
      ring.mitte = mitte; return ring;
    } catch {}
  }
  return null;
}
// Profil (x = nach aussen, y) entlang z extrudiert; Enden schräg: Anfang bei z = −x·k0, Ende bei z = L + x·k1
const rundFr = (cs, sBis) => (cs >= sBis - 1e-6 ? 0 : Math.sqrt(Math.max(0, 1 - (cs / sBis) ** 2))); // Viertelkreis über den Biegebereich
function prisma(kont, L, k0, k1, e0 = 0, e1 = 0, ky0 = 0, ky1 = 0, fr0 = 0, fr1 = 0, gh0 = null, gh1 = null) { // gh0/gh1: Gehrungsebene im Biegebereich (z = z0 + zx·x); e0/e1: an der Ecke zurückgesetzt (wie in der Abwicklung)
  // Die Gehrung gilt für die Mittellinie des Blechs: Jeder Ringpunkt wird mit dem x der nächsten Mittellinienstelle verschoben, so steht die Schnittfläche
  // senkrecht auf dem Blech (wie aus der Abwicklung geschnitten) und die Blechstärke wird nicht schräg angeschnitten.
  const mitte = kont.mitte, mx = mitte ? (x, y) => { let best = 1e30, bx = x, by = y, bs = 0; for (let i = 1; i < mitte.length; i++) { const a = mitte[i - 1], b = mitte[i], dx = b[0] - a[0], dy = b[1] - a[1], l2 = dx * dx + dy * dy || 1e-12, t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (y - a[1]) * dy) / l2)), px = a[0] + dx * t, py = a[1] + dy * t, d = (x - px) ** 2 + (y - py) ** 2; if (d < best) { best = d; bx = px; by = py; bs = cum[i - 1] + Math.hypot(px - a[0], py - a[1]); } } return [bx, by, bs]; } : (x, y) => [x, y, 0];
  let q = kont.slice(); if (gleich(q[0], q.at(-1))) q.pop(); if (flaeche(q) < 0) q = q.reverse();
  const luft = window.__prismaLuft || 0; // nur für Tests: Gehrungsflächen minimal auseinander
  const cum = [0]; if (mitte) for (let i = 1; i < mitte.length; i++) cum.push(cum[i - 1] + Math.hypot(mitte[i][0] - mitte[i - 1][0], mitte[i][1] - mitte[i - 1][1]));
  const sBis = mitte && kont.bisPunkt ? (() => { let bi = 0, bd = 1e30; mitte.forEach((p, i) => { const d = (p[0] - kont.bisPunkt[0]) ** 2 + (p[1] - kont.bisPunkt[1]) ** 2; if (d < bd) { bd = d; bi = i; } }); return cum[bi] + 1e-6; })() : -1; // Ende der ersten Biegung entlang der Mittellinie
  if (((gh0 && !gh0.voll) || (gh1 && !gh1.voll)) && sBis > 0) { // Gehrung nur im Biegebereich: an jeder Kontur-Strecke über die Grenze Biegung/Wand zwei Punkte dicht nebeneinander einfügen (scharfe Stufe statt Schrägfläche über die ganze Wand)
    const q2 = [], im = (a) => mx(a[0], a[1])[2] <= sBis;
    for (let i = 0; i < q.length; i++) { const a = q[i], b = q[(i + 1) % q.length]; q2.push(a);
      if (im(a) !== im(b)) { let lo = 0, hi = 1; for (let it = 0; it < 40; it++) { const mm = (lo + hi) / 2, pm = [a[0] + (b[0] - a[0]) * mm, a[1] + (b[1] - a[1]) * mm]; if (im(pm) === im(a)) lo = mm; else hi = mm; }
        for (const tt of [lo, hi]) q2.push([a[0] + (b[0] - a[0]) * tt, a[1] + (b[1] - a[1]) * tt]); } }
    q = q2; }
  if ((fr0 || fr1) && sBis > 0) { // runde Freistellung: Kontur im Biegebereich fein unterteilen, damit der Viertelkreis sauber ausgeschnitten wird
    const q2 = [], N = 6;
    for (let i = 0; i < q.length; i++) { const a = q[i], b = q[(i + 1) % q.length]; q2.push(a); if (Math.abs(mx(a[0], a[1])[2] - mx(b[0], b[1])[2]) > 1e-6 && Math.min(mx(a[0], a[1])[2], mx(b[0], b[1])[2]) < sBis) for (let j = 1; j < N; j++) q2.push([a[0] + (b[0] - a[0]) * j / N, a[1] + (b[1] - a[1]) * j / N]); }
    q = q2; }
  const z0 = (x, y) => { const [cx, cy, cs] = mx(x, y); if (gh0 && (gh0.voll || cs <= sBis)) return gh0.z0 + gh0.zx * x + gh0.zy * y + luft; return -cx * k0 - cy * ky0 + e0 + (fr0 ? fr0 * rundFr(cs, sBis) : 0) + luft; }, z1 = (x, y) => { const [cx, cy, cs] = mx(x, y); if (gh1 && (gh1.voll || cs <= sBis)) return Math.max(gh1.z0 + gh1.zx * x + gh1.zy * y - luft, z0(x, y) + 0.01); return Math.max(L + cx * k1 + cy * ky1 - e1 - (fr1 ? fr1 * rundFr(cs, sBis) : 0) - luft, z0(x, y) + 0.01); }, pos = [];
  const P = (x, y, z) => pos.push(x, y, z), n = q.length;
  for (let i = 0; i < n; i++) { const [xa, ya] = q[i], [xb, yb] = q[(i + 1) % n];
    P(xa, ya, z0(xa, ya)); P(xb, yb, z0(xb, yb)); P(xb, yb, z1(xb, yb)); P(xa, ya, z0(xa, ya)); P(xb, yb, z1(xb, yb)); P(xa, ya, z1(xa, ya)); }
  for (const [i, j, k] of THREE.ShapeUtils.triangulateShape(q.map(([x, y]) => new THREE.Vector2(x, y)), [])) {
    P(q[i][0], q[i][1], z0(q[i][0], q[i][1])); P(q[k][0], q[k][1], z0(q[k][0], q[k][1])); P(q[j][0], q[j][1], z0(q[j][0], q[j][1]));
    P(q[i][0], q[i][1], z1(q[i][0], q[i][1])); P(q[j][0], q[j][1], z1(q[j][0], q[j][1])); P(q[k][0], q[k][1], z1(q[k][0], q[k][1])); }
  const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  return nachAussen(g);
}
// Gebogene Kante: Bausteinprofil als durchgehende, glatte Fläche entlang des Bogens (keine Einzelteile, keine Nähte)
function sweepGlatt(kont, pts0, ek, seite) {
  let q = kont.slice(); if (gleich(q[0], q.at(-1))) q.pop(); if (flaeche(q) < 0) q = q.reverse();
  const pts = pts0.filter((p, i) => i === 0 || Math.hypot(p[0] - pts0[i - 1][0], p[1] - pts0[i - 1][1]) > 1e-6), n = pts.length, m = q.length;
  const dirs = pts.slice(1).map((b, i) => { const a = pts[i], L = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1; return [(b[0] - a[0]) / L, (b[1] - a[1]) / L]; });
  const ringe = pts.map((p, i) => {
    let d, ofs = () => 0, mf = () => 1;
    if (i === 0) { d = dirs[0]; ofs = (x) => -x * ek.k0 + (ek.e0 || 0); }
    else if (i === n - 1) { d = dirs[n - 2]; ofs = (x) => x * ek.k1 - (ek.e1 || 0); }
    else { const a = dirs[i - 1], b = dirs[i], t = [a[0] + b[0], a[1] + b[1]], L = Math.hypot(...t) || 1; d = [t[0] / L, t[1] / L]; mf = () => 1 / Math.max(0.2, d[0] * a[0] + d[1] * a[1]); }
    const nx = [d[1], -d[0]];
    return { d, nx, pos: q.map(([x, y]) => [p[0] + nx[0] * x * mf() + d[0] * ofs(x), p[1] + nx[1] * x * mf() + d[1] * ofs(x), seite * y]) };
  });
  const pos = [], nor = [];
  const tri = (a, b, c, nm) => { // Reihenfolge so, dass die Dreiecksnormale zur vorgegebenen Normale passt
    const u = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], v = [c[0] - a[0], c[1] - a[1], c[2] - a[2]], g = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
    const [A, B, C] = g[0] * nm[0][0] + g[1] * nm[0][1] + g[2] * nm[0][2] < 0 ? [a, c, b] : [a, b, c], [NA, NB, NC] = g[0] * nm[0][0] + g[1] * nm[0][1] + g[2] * nm[0][2] < 0 ? [nm[0], nm[2], nm[1]] : nm;
    pos.push(...A, ...B, ...C); nor.push(...NA, ...NB, ...NC);
  };
  const seitenN = (r, j) => { const [xa, ya] = q[j], [xb, yb] = q[(j + 1) % m], L = Math.hypot(xb - xa, yb - ya) || 1, ex = (yb - ya) / L, ey = -(xb - xa) / L; // 2D-Aussennormale (Profil ccw)
    return [ex * r.nx[0], ex * r.nx[1], ey * seite]; };
  for (let i = 0; i + 1 < n; i++) for (let j = 0; j < m; j++) {
    const r0 = ringe[i], r1 = ringe[i + 1], a0 = r0.pos[j], b0 = r0.pos[(j + 1) % m], a1 = r1.pos[j], b1 = r1.pos[(j + 1) % m], n0 = seitenN(r0, j), n1 = seitenN(r1, j);
    tri(a0, b0, b1, [n0, n0, n1]); tri(a0, b1, a1, [n0, n1, n1]);
  }
  const kappe = (r, vorn) => { const d = r.d, nn = vorn ? [-d[0], -d[1], 0] : [d[0], d[1], 0];
    for (const [i, j, k] of THREE.ShapeUtils.triangulateShape(q.map(([x, y]) => new THREE.Vector2(x, y)), [])) tri(r.pos[i], r.pos[j], r.pos[k], [nn, nn, nn]); };
  kappe(ringe[0], true); kappe(ringe[n - 1], false);
  const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute("normal", new THREE.Float32BufferAttribute(nor, 3));
  return g;
}
// Liegt (teilweise) ein Ausschnitt-Umriss im Umriss des Blechs? (Rand-Ausklinkungen beginnen ausserhalb) – Boxvergleich genügt, die Werkzeuge schneiden nur dort, wo Material ist
const boxUeberlappt = (a, b) => { const bx = (p) => [Math.min(...p.map((q) => q[0])), Math.max(...p.map((q) => q[0])), Math.min(...p.map((q) => q[1])), Math.max(...p.map((q) => q[1]))], A = bx(a), B = bx(b); return A[0] <= B[1] && A[1] >= B[0] && A[2] <= B[3] && A[3] >= B[2]; };
// Abgewickelter Zustand (Unfold): das flache Blech mit allen Ausschnitten als Löcher und den Biegelinien
function flachKoerper(bl, ebene, m, fid, art) {
  const sh = new THREE.Shape(bl.abw.umriss.map(([u, v]) => new THREE.Vector2(u, v)));
  for (const h of bl.abw.loecher || []) sh.holes.push(new THREE.Path(h.map(([u, v]) => new THREE.Vector2(u, v))));
  const geo = new THREE.ExtrudeGeometry(sh, { depth: m.t, bevelEnabled: false, curveSegments: 12 }); geo.translate(0, 0, -m.t / 2); geo.applyMatrix4(basis(ebene));
  const mesh = new THREE.Mesh(geo, oberflaechenMaterial(art, geo)); mesh.userData.fid = fid; mesh.userData.art = art; mesh.userData.flach = true;
  mesh.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo, 28), new THREE.LineBasicMaterial({ color: 0x27303a, transparent: true, opacity: 0.5 })));
  const B = basis(ebene);
  for (const l of bl.abw.linien || []) { // Biegelinien rot gestrichelt
    const ln = new THREE.Line(new THREE.BufferGeometry().setFromPoints(l.punkte.map(([u, v]) => new THREE.Vector3(u, v, m.t / 2 + 0.05).applyMatrix4(B))), new THREE.LineDashedMaterial({ color: 0xd23c3c, dashSize: 6, gapSize: 3, depthTest: false }));
    ln.computeLineDistances(); ln.renderOrder = 12; mesh.add(ln);
  }
  return mesh;
}
// Kantenlinien eines Blechs nach einem Ausschnitt: alte Linien, soweit sie nicht im Werkzeug liegen (keine Geisterlinien am Ausgeschnittenen)
function kantenBeschneiden(mesh, werkzeug) {
  const kante = mesh.children[0]; if (!kante?.geometry?.attributes?.position) return;
  werkzeug.computeBoundingBox(); const box = werkzeug.boundingBox.clone().expandByScalar(0.05);
  const tm = new THREE.Mesh(werkzeug, new THREE.MeshBasicMaterial({ side: THREE.DoubleSide })), rc = new THREE.Raycaster(), dir = new THREE.Vector3(0.5773, 0.4382, 0.6897).normalize();
  const innen_ = (p) => { if (!box.containsPoint(p)) return false; rc.set(p, dir); return rc.intersectObject(tm, false).length % 2 === 1; };
  const pos = kante.geometry.attributes.position, out = [], a = new THREE.Vector3(), b = new THREE.Vector3(), m = new THREE.Vector3();
  for (let i = 0; i + 1 < pos.count; i += 2) {
    a.fromBufferAttribute(pos, i); b.fromBufferAttribute(pos, i + 1);
    if (!new THREE.Box3().setFromPoints([a, b]).intersectsBox(box)) { out.push(a.x, a.y, a.z, b.x, b.y, b.z); continue; }
    const n = Math.max(1, Math.ceil(a.distanceTo(b) / 1.5));
    for (let k = 0; k < n; k++) { const t0 = k / n, t1 = (k + 1) / n; m.lerpVectors(a, b, (t0 + t1) / 2); if (innen_(m)) continue; const p0 = a.clone().lerp(b, t0), p1 = a.clone().lerp(b, t1); out.push(p0.x, p0.y, p0.z, p1.x, p1.y, p1.z); }
  }
  kante.geometry.dispose(); kante.geometry = new THREE.BufferGeometry(); kante.geometry.setAttribute("position", new THREE.Float32BufferAttribute(out, 3));
}
// Lochränder (Vorder- und Rückseite) für die Kantenlinien: loops in Skizzenkoordinaten der Blechebene
function lochRaender(mesh, loops, ebene, halb) {
  const B = basis(ebene);
  for (const lp of loops) for (const zz of [halb, -halb]) mesh.add(new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(lp.map(([u, v]) => new THREE.Vector3(u, v, zz).applyMatrix4(B))), new THREE.LineBasicMaterial({ color: 0x27303a, transparent: true, opacity: 0.5 })));
}
// Gefalteter Zustand (Refold): Ausschnitte der Abwicklung als Werkzeuge auf das gekantete Blech abbilden und abziehen
function schneideAus(teile, bl, loops, ebene, m, seite) {
  const B = basis(ebene); let nicht = 0;
  for (const lp of loops) {
    const pos = ausschnittWerkzeug(bl, lp, seite, m.t / 2 + 0.4, 2); if (!pos.length) continue;
    const tool = new THREE.BufferGeometry(); tool.setAttribute("position", new THREE.BufferAttribute(pos, 3)); tool.applyMatrix4(B); tool.computeBoundingBox();
    for (const mesh of teile) {
      mesh.geometry.computeBoundingBox(); if (!mesh.geometry.boundingBox.intersectsBox(tool.boundingBox)) continue;
      try { verknuepfe(mesh, tool, "ausschneiden", false); } catch { nicht++; continue; } // Kanten: alte, soweit nicht ausgeschnitten, + Lochränder (das Netz der Booleschen Rechnung ist für Kantenlinien zu unruhig)
      kantenBeschneiden(mesh, tool);
      for (const pts of ausschnittKante(bl, lp, seite, m.t / 2)) { const l = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(pts.map((q) => new THREE.Vector3(...q).applyMatrix4(B))), new THREE.LineBasicMaterial({ color: 0x27303a, transparent: true, opacity: 0.5 })); mesh.add(l); }
    }
  }
  if (nicht) throw new Error(`${nicht} Ausschnitt${nicht === 1 ? "" : "e"} liess${nicht === 1 ? "" : "en"} sich im gefalteten Blech nicht ausführen`);
}
// Lage des Blechs zur Skizzenebene: Mitte (Standard), Skizze auf der Vorderseite (Blech dahinter) oder auf der Rückseite
function blechEbene(id, f, m) {
  const e = E_(id), s = f.sichtseite === -1 ? -1 : 1, dz = f.lage === "vorne" ? -s * m.t / 2 : f.lage === "hinten" ? s * m.t / 2 : 0;
  return dz ? { ...e, o: e.o.map((v, i) => v + e.n[i] * dz) } : e;
}
function flaechenKoerper(bl, ebene, m, seite, fid, art = oberflaecheFuer(m)) {
  const B = basis(ebene), teile = [];
  // Platte endet am Biegebeginn jeder Kante mit Baustein (wie im exakten Kern), nicht an der gezeichneten Kante
  const kuerzen = bl.gruppen.map((g, k) => { const p = bl.profile[k]; if (!p) return 0; try { const q = bausteinQuerschnitt(p.baustein, m); return q ? Math.max(0, -q.xFlach) : 0; } catch { return 0; } });
  const flaeche = new THREE.ExtrudeGeometry(new THREE.Shape(plattenUmriss(bl.pts, bl.gruppen, kuerzen, new Map(bl.profile.map((p, k) => [k, p?.teil]).filter(([, t]) => t))).map(([u, v]) => new THREE.Vector2(u, v))), { depth: m.t, bevelEnabled: false });
  flaeche.translate(0, 0, -m.t / 2); flaeche.applyMatrix4(B);
  const geos = [flaeche];
  // Ecken: Profile auf Gehrung (Nachbarkante mit Baustein) bzw. bündig zur Nachbarkante (ohne) – keine Überschneidungen
  const richt = (a, b) => { const L = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1; return [(b[0] - a[0]) / L, (b[1] - a[1]) / L]; };
  const knick = (d1, d2) => Math.atan2(d1[0] * d2[1] - d1[1] * d2[0], d1[0] * d2[0] + d1[1] * d2[1]); // + = links (konvexe Ecke)
  const ek = eckFaktoren(bl.gruppen, bl.profile, bl.opt); // dieselbe Eckregel wie die Abwicklung
  const n = bl.gruppen.length, gehrung = gehrungEcken(bl.gruppen, bl.profile, bl.opt, m.t, seite, [...(bl.quetsch?.keys?.() || [])]); // Gehrung wie im exakten Kern (Biegebereich; an Ecken mit Quetschfalte über die ganze Höhe)

  // (früher: flache Eckfläche bis zur gezeichneten Ecke – sie stand unter der aufsteigenden Biegung als Block heraus und ist entfernt; die Ecke schliessen die gehrungsgeschnittenen Biegungen und die Falte)
  for (const k of bl.quetsch?.keys() || []) { // Quetschfalte: beide Flansche enden an der Ecklinie ε; der Flansch der vorigen Kante wird um die halbe Blechstärke zurückgesetzt, damit die Blechstärke nicht doppelt in der Ecke steckt
    const e3 = quetschEcke3D(bl, k); if (!e3) continue; const { q, A, B, V, O, kv } = e3, g1 = q.z.gamma1 * Math.PI / 180, g2 = q.z.gamma2 * Math.PI / 180, cot = (x) => Math.cos(x) / Math.sin(x);
    const dv = richt(bl.gruppen[kv].punkte.at(-2), bl.gruppen[kv].punkte.at(-1)), sO = (O[0] - V[0]) * q.dn[0] + (O[1] - V[1]) * q.dn[1], p = (O[0] - V[0]) * dv[0] + (O[1] - V[1]) * dv[1], ds = m.t / 2 / Math.sin(q.beta * Math.PI / 180);
    ek[k] = { ...ek[k], k0: -cot(g1), e0: sO - A.a * cot(g1) }; ek[kv] = { ...ek[kv], k1: -cot(g2), e1: -(p + B.a * cot(g2)) + ds };
  }
  bl.gruppen.forEach((g, k) => {
    const p = bl.profile[k]; if (!p) return;
    const k2 = bausteinKontur(p.baustein, m); if (!k2) return;
    const tg = teilGruppe(g, p), pk2 = tg ? tg.punkte : g.punkte; // Teilstück: der Baustein liegt nur zwischen von und bis
    for (let i = 1; i < pk2.length; i++) {
      const a = pk2[i - 1], b = pk2[i], L = Math.hypot(b[0] - a[0], b[1] - a[1]); if (L < 1e-6) continue;
      const d = richt(a, b);
      const k0 = i > 1 ? Math.tan(knick(richt(pk2[i - 2], a), d) / 2) : ek[k].k0, e0 = i > 1 ? 0 : ek[k].e0 || 0;
      const k1 = i < pk2.length - 1 ? Math.tan(knick(d, richt(b, pk2[i + 1])) / 2) : ek[k].k1, e1 = i < pk2.length - 1 ? 0 : ek[k].e1 || 0;
      if (!g.gerade && g.punkte.length > 3) { // gebogene Kante: eine durchgehende glatte Fläche statt Einzelteilen
        if (i === 1) {
          const sw = sweepGlatt(k2, g.punkte, ek[k], seite); sw.applyMatrix4(B);
          if (B.determinant() < 0) for (const nm of ["position", "normal"]) { const arr = sw.attributes[nm].array; for (let t = 0; t < arr.length; t += 9) for (let c = 0; c < 3; c++) { const x = arr[t + 3 + c]; arr[t + 3 + c] = arr[t + 6 + c]; arr[t + 6 + c] = x; } } // gespiegelte Basis: Umlaufsinn zurück
          geos.push(sw);
        }
        continue;
      }
      const geo = prisma(k2, L, k0, k1, e0, e1, i > 1 ? 0 : ek[k].ky0 || 0, i < pk2.length - 1 ? 0 : ek[k].ky1 || 0, i > 1 ? 0 : ek[k].fr0 || 0, i < pk2.length - 1 ? 0 : ek[k].fr1 || 0, i === 1 && gehrung.has(k) ? gehrungLokal(gehrung.get(k), a, d, seite, 0, true) : null, i === pk2.length - 1 && gehrung.has((k + 1) % n) ? gehrungLokal(gehrung.get((k + 1) % n), a, d, seite, 0, false) : null);
      geo.applyMatrix4(new THREE.Matrix4().makeBasis(new THREE.Vector3(d[1], -d[0], 0), new THREE.Vector3(0, 0, seite), new THREE.Vector3(d[0], d[1], 0)).setPosition(a[0], a[1], 0));
      geo.applyMatrix4(B); geos.push(nachAussen(geo)); // Basis kann gespiegelt sein: Dreiecke wieder nach aussen
    }
  });
  for (const geo of geos) {
    const mesh = new THREE.Mesh(geo, oberflaechenMaterial(art, geo)); mesh.userData.fid = fid; mesh.userData.art = art;
    mesh.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo, 28), new THREE.LineBasicMaterial({ color: 0x27303a, transparent: true, opacity: 0.5 })));
    teile.push(mesh);
  }
  return teile;
}
// Kanten des gewählten Flächenblechs in 3D zeigen; die aktive Kante (Dialog) orange und dick
const kantenZeiger = new THREE.Group(); szene.add(kantenZeiger);
let menueKante = null; // { fid, key } – Kante, deren Bausteinmenü offen ist (ohne Dialog)
let kantenLabels = [];
const kantenName = (f, key) => { const [pi, k] = key.split(":").map(Number); return `${f._bleche?.length > 1 ? `B${pi + 1} ` : ""}K${k + 1}`; };
function zeigeKanten() {
  leeren(kantenZeiger); kantenLabels = [];
  if (nahtWz && !skizze) { zeigeNahtKanten(); return; }
  if (quetschWz && !skizze) { if (quetschWz.art === "stirn") zeigeStirnQuetschPunkte(quetschWz.f); else zeigeQuetschEcken(quetschWz.f); return; }
  if (kantenWz?.schritt === "kante" && istProfil(kantenWz.f) && !skizze) return zeigeProfilKanten(kantenWz.f);
  const kd = dlg?.feature?.typ === "kante" ? dlg.feature : null; // Dialog eines Schritts «Kante»: dessen Kante leuchtet
  const f = kd ? finde(kd.ziel) : dlg?.feature?.typ === "flaeche" ? dlg.feature : hauptVon(auswahl);
  if (f?.typ !== "flaeche" || !f._bleche || skizze || f.versteckt) return;
  const ebene = finde(f.skizze)?.ebene, aktiv = kd ? kd.key : dlg?.feature === f ? dlg.aktiveKante : menueKante?.fid === f.id ? menueKante.key : null;
  const LM = lageVon(f), zu3D = (e, p) => { const v = V(zuWelt(E_(e), p)); return LM ? v.applyMatrix4(LM) : v; }; // Komponente verschoben
  f._bleche.forEach((bl) => bl.gruppen.forEach((g, k) => {
    const an = aktiv === `${bl.pi}:${k}` || (kantenWz?.f === f && kantenWz.sel?.includes(`${bl.pi}:${k}`)), belegt = !!f.kanten?.[`${bl.pi}:${k}`];
    // Beschriftung in der Kantenmitte: antippen öffnet das Bausteinmenü (gut auf dem Handy)
    const mitte = g.punkte[Math.floor((g.punkte.length - 1) / 2)], nach = g.punkte[Math.floor((g.punkte.length - 1) / 2) + 1] || mitte;
    kantenLabels.push({ p: zu3D(ebene, [(mitte[0] + nach[0]) / 2, (mitte[1] + nach[1]) / 2]), t: kantenName(f, `${bl.pi}:${k}`) + (belegt ? " ✓" : ""), kante: `${bl.pi}:${k}`, fid: f.id, an, belegt });
    const l = new THREE.Line(new THREE.BufferGeometry().setFromPoints(g.punkte.map((p) => zu3D(ebene, p))),
      new THREE.LineBasicMaterial({ color: an ? 0x1d8fff : belegt ? 0x2e9b4f : 0x1f5fbf, depthTest: false, transparent: true, linewidth: an ? 3 : 1 }));
    l.renderOrder = 13; kantenZeiger.add(l);
    if (an) kantenZeiger.add(dickeLinie(g.punkte.map((p) => zu3D(ebene, p)), 0x1d8fff, 3));
  }));
}
// Nächste Kante unter dem Mauszeiger (Bildschirmabstand) → «Blech:Kante»
// Kanten eines Blechprofils im Raum: A/B = Längsseiten (Anfang/Ende des Querschnitts), Stirn 1/2 = Anfang/Ende der Länge, je gerader Schenkel einzeln
function profilKanten(f) {
  const kl = f._kernLage, res = f._res; if (!kl || !res?.pfad?.length || f.versteckt) return [];
  const zw = zweiseitig(f, "laenge", "laenge2"), rueck = rueckVersatz(zw.richtung, zw.tiefe), z0 = -rueck, z1 = zw.tiefe - rueck, M = basis(kl.ebene), vz = kl.versatz;
  const P = (p, z) => new THREE.Vector3(p[0] + vz[0], p[1] + vz[1], z).applyMatrix4(M), el = res.pfad, l = [];
  l.push({ key: "A", name: "Kante A (Anfang)", t: "A", p: [P(el[0].p1, z0), P(el[0].p1, z1)] }, { key: "B", name: "Kante B (Ende)", t: "B", p: [P(el.at(-1).p2, z0), P(el.at(-1).p2, z1)] });
  for (const b of schenkelBereiche(res)) for (const [s, z] of [["S1", z0], ["S2", z1]]) l.push({ key: `${s}:${b.nr}`, name: `Stirn ${s === "S1" ? 1 : 2} · Schenkel ${b.nr}`, t: `${s === "S1" ? 1 : 2}·${b.nr}`, p: [P(b.p1, z), P(b.p2, z)] });
  return l;
}
const profilKanteBelegt = (f, key) => { const [e, n] = key.split(":"); return doc.features.some((x) => x.typ === "profilkante" && x.ziel === f.id && !x._aus && x.ende === e && (e === "A" || e === "B" || !x.schenkel || x.schenkel === +n)); };
function zeigeProfilKanten(f) { // alle wählbaren Kanten blau, die unter dem Zeiger hellblau und dick, bereits belegte grün
  const aktiv = menueKante?.fid === f.id ? menueKante.key : null;
  for (const k of profilKanten(f)) {
    const an = aktiv === k.key || !!kantenWz?.sel?.includes(k.key), belegt = profilKanteBelegt(f, k.key), len = k.p[0].distanceTo(k.p[1]);
    const l = new THREE.Line(new THREE.BufferGeometry().setFromPoints(k.p), new THREE.LineBasicMaterial({ color: an ? 0x1d8fff : belegt ? 0x2e9b4f : 0x1f5fbf, depthTest: false, transparent: true })); l.renderOrder = 13; kantenZeiger.add(l);
    if (an) kantenZeiger.add(dickeLinie([k.p[0], k.p[1]], 0x1d8fff, 3));
    kantenLabels.push({ p: k.p[0].clone().add(k.p[1]).multiplyScalar(0.5), t: k.t + (belegt ? " ✓" : ""), kante: k.key, fid: f.id, an, belegt });
  }
}
function kanteUnterMaus(f, e) {
  if (istProfil(f)) { const sm = smPos(e); let best = null, bd = e.pointerType === "touch" ? 30 : 14; for (const k of profilKanten(f)) { const A = aufSchirm(k.p[0].toArray()), B = aufSchirm(k.p[1].toArray()); if (A[2] > 1 || B[2] > 1) continue; const d = abstandStrecke(sm, A, B); if (d < bd) { bd = d; best = k.key; } } return best; }
  const ebene = finde(f.skizze)?.ebene, sm = smPos(e), LM = lageVon(f), zuWelt = (E, p) => { const v = V(zuWeltK(E, p)); return (LM ? v.applyMatrix4(LM) : v).toArray(); };
  let best = null, bd = e.pointerType === "touch" ? 30 : 14; // Finger: grösserer Fangbereich
  for (const bl of f._bleche || []) bl.gruppen.forEach((g, k) => {
    for (let i = 1; i < g.punkte.length; i++) {
      const A = aufSchirm(zuWelt(E_(ebene), g.punkte[i - 1])), B = aufSchirm(zuWelt(E_(ebene), g.punkte[i]));
      const d = abstandStrecke(sm, A, B); if (d < bd) { bd = d; best = `${bl.pi}:${k}`; }
    }
  });
  return best;
}
// ------------------------------------------------------------ Komponenten: Lage (verschieben/drehen als Ganzes) und Kollisionsprüfung
// doc.komponentenLage = { Name: { dx, dy, dz, achse, winkel } } – wirkt nach allen Features auf alle Körper der Komponente
function lageMatrix(name) {
  const l = name && doc.komponentenLage?.[name]; if (!l) return null;
  const M = new THREE.Matrix4().makeTranslation(+l.dx || 0, +l.dy || 0, +l.dz || 0);
  if (+l.winkel && l.achse) { try { const a = bezugKante(l.achse), p = V(a.p), d = V(a.d).normalize();
    M.multiply(new THREE.Matrix4().makeTranslation(p.x, p.y, p.z).multiply(new THREE.Matrix4().makeRotationAxis(d, (l.winkel * Math.PI) / 180)).multiply(new THREE.Matrix4().makeTranslation(-p.x, -p.y, -p.z))); } catch {} }
  return M;
}
const lageVon = (f) => lageMatrix(f?.komponente);
function wendeKomponentenLageAn() {
  for (const o of modell.children) {
    if (!o.isMesh || !o.userData.fid) continue;
    const M = lageVon(hauptVon(o.userData.fid)); if (!M) continue;
    o.geometry = o.geometry.clone().applyMatrix4(M); // Geometrie selbst verschieben: Export, Plan, Messen sehen die Lage
    for (const c of o.children) if (c.geometry) c.geometry = c.geometry.clone().applyMatrix4(M);
  }
}
function komponenteDialog(name) {
  doc.komponentenLage ||= {};
  const vorher = JSON.stringify(doc.komponentenLage[name] || null), l = (doc.komponentenLage[name] ||= { dx: 0, dy: 0, dz: 0, achse: "A:Z", winkel: 0 });
  dialog({ titel: "Komponente verschieben / drehen", feature: null, wahlNr: -1,
    hinweis: `Bewegt alle Körper und Bleche von «${name}» gemeinsam (z. B. Dachteil ans Modell setzen). Wirkt nach allen Features – Masse und Abwicklungen bleiben gleich.`,
    felder: [{ id: "dx", label: "Verschieben X", einheit: "mm", wert: l.dx }, { id: "dy", label: "Verschieben Y", einheit: "mm", wert: l.dy }, { id: "dz", label: "Verschieben Z", einheit: "mm", wert: l.dz },
      { id: "achse", label: "Drehachse", wahl: "kante", optionen: mitWert(kantenListe(null), l.achse), wert: l.achse }, { id: "winkel", label: "Drehwinkel", einheit: "°", wert: l.winkel }],
    aendern: (w) => { Object.assign(l, Object.fromEntries(Object.entries(w).map(([k, v]) => [k, k === "achse" ? v : Number.isFinite(v) ? v : 0]))); regen(); },
    abbrechen: () => { if (vorher === "null") delete doc.komponentenLage[name]; else doc.komponentenLage[name] = JSON.parse(vorher); },
    ok: () => { if (!l.dx && !l.dy && !l.dz && !l.winkel) delete doc.komponentenLage[name]; regen(); merke(); status(`Lage von «${name}» gespeichert.`); } });
}
// Kollision (Interferenz wie in Fusion): sich durchdringende Körper verschiedener Features finden und rot zeigen
const kollisionen = new THREE.Group(); szene.add(kollisionen);
function pruefeKollision() {
  kollisionen.children.forEach((o) => o.geometry.dispose()); kollisionen.clear();
  const ks = modell.children.filter((o) => o.isMesh && o.visible && o.userData.fid).map((o) => { o.geometry.computeBoundingBox(); return { o, f: hauptVon(o.userData.fid), box: o.geometry.boundingBox.clone().applyMatrix4(o.matrixWorld) }; });
  const treffer = []; let paare = 0;
  for (let i = 0; i < ks.length; i++) for (let j = i + 1; j < ks.length; j++) {
    const a = ks[i], b = ks[j]; if (!a.f || !b.f || a.f === b.f || !a.box.intersectsBox(b.box)) continue;
    paare++;
    try {
      const A = new Brush(nurPos(a.o.geometry)), B = new Brush(nurPos(b.o.geometry)); A.updateMatrixWorld(); B.updateMatrixWorld();
      const g = csg.evaluate(A, B, INTERSECTION).geometry, p = g.attributes.position?.array || [];
      let v = 0; for (let k = 0; k + 8 < p.length; k += 9) v += p[k] * (p[k + 4] * p[k + 8] - p[k + 5] * p[k + 7]) - p[k + 1] * (p[k + 3] * p[k + 8] - p[k + 5] * p[k + 6]) + p[k + 2] * (p[k + 3] * p[k + 7] - p[k + 4] * p[k + 6]);
      v = Math.abs(v / 6);
      if (v > 1) { treffer.push({ a: a.f.name, b: b.f.name, v }); const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color: 0xe02424, depthTest: false, transparent: true, opacity: 0.75 })); m.renderOrder = 20; kollisionen.add(m); }
      else g.dispose();
    } catch {}
  }
  const zus = new Map(); for (const t of treffer) { const k = t.a < t.b ? `${t.a} ↔ ${t.b}` : `${t.b} ↔ ${t.a}`; zus.set(k, (zus.get(k) || 0) + t.v); }
  return { liste: [...zus.entries()].map(([k, v]) => ({ paar: k, volumen: v })), paare };
}
// Baustein einer Kante setzen (v: Baustein-ID, {folge, versatz} oder leer); Gegenstück bekommt den Partner
// Querschnitt (bausteinProfil) einer belegten Kante mit Namen – für Schnitte im Plan
function kantenProfil(f, key) {
  const [pi, k] = key.split(":").map(Number), p = f._bleche?.find((b) => b.pi === pi)?.profile?.[k], v = f.kanten?.[key];
  return p?.res ? { ...p, name: typeof v === "string" ? bausteinName(v) : "Eigene Abkantfolge" } : null;
}
// Kanten eines Flächenblechs = Grundbelegung (ältere Projekte) + Schritte «Kante» in der Zeitleiste (Flansch, Umschlag, Baustein), der Reihe nach;
// «anhängen» setzt die Abkantfolge der Kante fort (Flansch an Flansch)
// Teilstücke: Baustein nur zwischen von und bis (mm ab dem Anfang der Kante) – Schritte «Kante» (Feld teil) und Nähte (a.teil / b.teil); ohne Angabe gilt die ganze Kantenlänge
function teilKanten(f) {
  const t = {}, ok = (x) => x && Number.isFinite(+x.von) && Number.isFinite(+x.bis) && +x.bis > +x.von;
  for (const x of doc.features) {
    if (x._aus) continue;
    if (x.typ === "kante" && x.ziel === f.id && x.wert) { if (ok(x.teil)) t[x.key] = { von: +x.teil.von, bis: +x.teil.bis }; else if (!x.anhaengen) delete t[x.key]; }
    else if (x.typ === "naht") for (const seite of ["a", "b"]) { const e = x[seite]; if (e?.ziel === f.id && ok(e.teil)) t[e.key] = { von: +e.teil.von, bis: +e.teil.bis }; }
  }
  return t;
}
function berechneKanten(f, ohneNaht = false) {
  const m = material(f.material), k = { ...(f.kantenBasis || {}) };
  for (const x of doc.features) {
    if (x.typ !== "kante" || x.ziel !== f.id || x._aus || !x.wert) continue;
    const vor = k[x.key];
    if (x.anhaengen && vor) { const bv = werkzeugAuf(bausteinFuer(vor), m), nb = werkzeugAuf(bausteinFuer(x.wert), m); k[x.key] = { folge: folgeAnhaengen(bausteinFolge(bv, m), bausteinFolge(nb, m)), versatz: +bv.versatz || 0 }; }
    else k[x.key] = x.wert;
  }
  for (const x of doc.features) { // Verbindungsnähte (Überlappung / Falz): Abkantfolge zusätzlich an die gewählte Kante – auch auf einem schon vorhandenen Flansch
    if (x.typ !== "naht" || x._aus || ohneNaht) continue;
    for (const seite of ["a", "b"]) {
      const s = x[seite]; if (s?.ziel !== f.id || !s.key || String(s.key).startsWith("E:")) continue; // freie Körperkanten: Fahne als eigener Körper (nahtFahne)
      const nf = nahtFolgen(x, m, x._winkel || null)[seite]; if (!nf) continue; // Winkel zwischen den Blechen: Wert der letzten Naht-Rechnung (siehe Zweig «naht»)
      const vor = k[s.key]; if (vor) { const bv = werkzeugAuf(bausteinFuer(vor), m); k[s.key] = { folge: folgeAnhaengen(bausteinFolge(bv, m), nf.folge), versatz: +bv.versatz || 0 }; } else k[s.key] = { folge: nf.folge, versatz: nf.versatz || 0 }; // Rücksetzung der Kante nur ohne vorhandenen Flansch
    }
  }
  return k;
}
// Winkel zwischen den Blechen einer Naht (Grad): Mit welchem Winkel muss die Kante des abgekanteten Blechs umgelegt werden, damit ihre Fahne auf dem anderen Blech liegt (0 = in einer Ebene).
// Rückgabe { a, b } – Winkel für Blech A bzw. B (Vorzeichen: + zur Sichtseite des jeweiligen Blechs); null, wenn nicht bestimmbar.
function nahtWinkelAuto(x) {
  try {
    const { a: ka, b: kb } = nahtPaar(x); if (!ka?.inn || !kb?.inn) return null;
    const d = ka.punkte.at(-1).clone().sub(ka.punkte[0]).normalize(), W = (uA, uB, nB) => { const c = uB.clone().negate(); return Math.round(Math.atan2(uA.dot(nB), uA.dot(c)) * 1800 / Math.PI) / 10; }; // Fahne = Fortsetzung c·cosθ + n·sinθ
    const wb = W(ka.inn, kb.inn, kb.normale), wa = W(kb.inn, ka.inn, ka.normale);
    return Number.isFinite(wa) && Number.isFinite(wb) ? { a: wa, b: wb } : null;
  } catch { return null; }
}
const kantenSchritte = (f, key) => doc.features.filter((x) => x.typ === "kante" && x.ziel === f.id && x.key === key);
function setzeKanteRoh(f, key, v) { // Änderung über Tabelle/Dialog: den letzten Schritt der Kante ändern, sonst die Grundbelegung
  const schritte = kantenSchritte(f, key);
  if (schritte.length) {
    if (v) { const l = schritte.at(-1); l.wert = v; l.anhaengen = false; }
    else for (const x of schritte) entferneFeature(x);
  } else { f.kantenBasis = { ...(f.kantenBasis || f.kanten) }; if (v) f.kantenBasis[key] = v; else delete f.kantenBasis[key]; }
  f.kanten = { ...f.kanten }; if (v) f.kanten[key] = v; else delete f.kanten[key];
}
function setzeKanteVon(f, key, v) {
  setzeKanteRoh(f, key, v);
  if (f.kantenWerte?.[key]) { f.kantenWerte = { ...f.kantenWerte }; delete f.kantenWerte[key]; } // Parameterwerte gehören zum Baustein der Kante
  const b = typeof v === "string" && bausteinFuer(v), p = b?.partner && partnerKante(f, key);
  if (p) { setzeKanteRoh(f, p, b.partner); status(`Gegenstück an ${kantenName(f, p)}: ${bausteinName(b.partner)}.`); }
}
// Einfacher Flansch / Umschlag wie in Fusion als Kantenwert: { werkzeug, folge, versatz } – folge/versatz werden mit der Materialdicke neu gerechnet
const werkzeugKante = (typ, m) => { const w = flanschStandard(typ), a = werkzeugAuf({ werkzeug: w }, m); return { werkzeug: w, folge: a.folge, versatz: a.versatz }; };
const werkzeugNeu = (v, w, m) => { const a = werkzeugAuf({ werkzeug: w }, m); return { werkzeug: w, folge: a.folge, versatz: a.versatz }; };
// Menü an der angetippten Kante: Baustein direkt zuweisen (im Dialog und wenn das Flächenblech nur gewählt ist)
function kantenMenue(f, key, x, y, fertig = () => {}) {
  const m = $("kantenMenue"), v = f.kanten?.[key], [pi, k] = key.split(":").map(Number), g = f._bleche?.find((b) => b.pi === pi)?.gruppen[k];
  const gruppen = [...new Set(alleBausteine().map((b) => b.gruppe || "Eigene"))];
  m.innerHTML = `<div class="kmkopf"><b>${kantenName(f, key)}</b> · ${g ? f1(g.laenge) + " mm" : ""}<button class="kmzu" data-kmzu aria-label="Schliessen">×</button></div>
    <button data-kb="" class="${!v ? "an" : ""}">– keine (Schnittkante)</button>
    ${gruppen.map((gr) => `<div class="kmgruppe">${esc(gr)}</div>${alleBausteine().filter((b) => (b.gruppe || "Eigene") === gr).map((b) => `<button data-kb="${esc(b.id)}" class="${v === b.id ? "an" : ""}">${esc(b.name)}<small>${esc(b.folge)}</small></button>`).join("")}`).join("")}
    <div class="kmgruppe">Weitere</div><button data-kb="*f" class="${v?.werkzeug?.typ === "flansch" ? "an" : ""}">Flansch …<small>Winkel, Länge, Radius</small></button><button data-kb="*u" class="${v?.werkzeug?.typ === "umschlag" ? "an" : ""}">Umschlag …<small>Saum, Länge, Radius</small></button><button data-kb="*" class="${v && typeof v === "object" && !v.werkzeug ? "an" : ""}">Eigene Abkantfolge …</button><button data-kneu>+ Neuer Baustein …</button>`;
  m.hidden = false;
  const r = m.getBoundingClientRect(); Object.assign(m.style, { left: Math.max(8, Math.min(x + 8, innerWidth - r.width - 8)) + "px", top: Math.max(8, Math.min(y + 8, innerHeight - r.height - 8)) + "px" });
  m.onclick = (e) => {
    const t = e.target.closest("button"); if (!t) return;
    const zu = () => { m.hidden = true; if (menueKante?.fid === f.id) menueKante = null; zeigeKanten(); };
    if (t.dataset.kmzu != null) return zu();
    if (t.dataset.kneu != null) { zu(); return bausteinEditor(neuerBaustein(v && typeof v === "object" ? v.folge : undefined), einst.bausteine, (neu) => { einstSpeichern(); setzeKanteVon(f, key, neu.id); regen(); fertig(key); }); }
    const w = t.dataset.kb; zu();
    if (w === "*" || w === "*f" || w === "*u") { if (w !== "*") { if (v?.werkzeug?.typ !== (w === "*f" ? "flansch" : "umschlag")) setzeKanteVon(f, key, werkzeugKante(w === "*f" ? "flansch" : "umschlag", material(f.material))); } else if (!(v && typeof v === "object")) setzeKanteVon(f, key, { folge: "90 25", versatz: 0 }); regen(); if (dlg?.feature === f) fertig(key); else { flaecheDialog(f); dlg.aktiveKante = key; const d = dlg; dialog({ ...d }); fertig(key); } return; }
    setzeKanteVon(f, key, w); regen(); fertig(key);
    status(`${kantenName(f, key)}: ${w ? bausteinName(w) : "keine (Schnittkante)"}${f.kanten?.[partnerKante(f, key) || ""] ? " · Gegenstück gesetzt" : ""}`);
  };
}
document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !$("kantenMenue").hidden) { $("kantenMenue").hidden = true; menueKante = null; zeigeKanten(); e.stopPropagation(); } }, true);
document.addEventListener("pointerdown", (e) => { if (!$("kantenMenue").hidden && !e.target.closest("#kantenMenue") && !e.target.closest("#labels .kante")) { $("kantenMenue").hidden = true; if (menueKante) { menueKante = null; zeigeKanten(); } } });
// Gemeinsame Kante zweier Bleche (gleiche Endpunkte, gegenläufig) → Gegenstück bekommt den Partner-Baustein
function partnerKante(f, key) {
  const [pi, k] = key.split(":").map(Number), bl = f._bleche.find((b) => b.pi === pi); if (!bl) return null;
  const g = bl.gruppen[k], a = g.punkte[0], b = g.punkte.at(-1), nah = (p, q) => Math.hypot(p[0] - q[0], p[1] - q[1]) < 0.5;
  for (const o of f._bleche) if (o.pi !== pi) for (let kk = 0; kk < o.gruppen.length; kk++) {
    const h = o.gruppen[kk]; if (nah(h.punkte[0], b) && nah(h.punkte.at(-1), a)) return `${o.pi}:${kk}`;
  }
  return null;
}
// ------------------------------------------------------------ Dach-Modus (Phase 1): Gebäude-Ansatz + Dach aus Grundriss, Dachform und Aufbau
const dachEinst = () => (einst.dach ||= dachGrund());
const deckungBasis = (f) => [...(doc.dachVorlagen?.deckungen || []), ...dachEinst().deckungen, ...DECKUNGEN_STANDARD].find((d) => d.id === f.deckung) || dachEinst().deckungen[0];
const aufbauBasis = (f) => [...(doc.dachVorlagen?.aufbauten || []), ...dachEinst().aufbauten, ...AUFBAU_STANDARD].find((a) => a.id === f.aufbau) || dachEinst().aufbauten[0];
const BLECH_VORLAGE = { traufe: "traufe", ortgang: "ortgang", first: "first", grat: "first", kehle: "kehle" }, BLECH_FARBE = { traufe: 0xb8733a, ortgang: 0xc0834a, first: 0xa9622f, grat: 0xa9622f, kehle: 0x9b5a2b };
// Ebenes Polygon (Grundriss-Koordinaten u, v, h) beliebiger Lage um dicke entlang der Normale aufgedickt → Dreiecke in Weltkoordinaten
function dachPlatte(punkte, normale, dicke, g) {
  const n = new THREE.Vector3(...normale).normalize(), h = Math.abs(n.z) < 0.9 ? new THREE.Vector3(0, 0, 1) : new THREE.Vector3(1, 0, 0), ex = new THREE.Vector3().crossVectors(h, n).normalize(), ey = new THREE.Vector3().crossVectors(n, ex), p0 = new THREE.Vector3(...punkte[0]);
  const P = punkte.map((p) => new THREE.Vector3(...p)), uv = P.map((p) => { const d = p.clone().sub(p0); return new THREE.Vector2(d.dot(ex), d.dot(ey)); }), tri = THREE.ShapeUtils.triangulateShape(uv.slice(), []), ob = P.map((p) => p.clone().addScaledVector(n, dicke)), pos = [], W = (v) => dachWelt(g, v.toArray());
  const T = (a, b, c) => pos.push(...W(a), ...W(b), ...W(c));
  for (const [i, j, k] of tri) { T(ob[i], ob[j], ob[k]); T(P[i], P[k], P[j]); }
  for (let i = 0; i < P.length; i++) { const j = (i + 1) % P.length; T(P[i], P[j], ob[j]); T(P[i], ob[j], ob[i]); }
  const geo = new THREE.BufferGeometry(); geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); return nachAussen(geo);
}
// Körper je Art (Sparren, Dämmung, …, einzelne Ziegel) zu je einem Netz zusammenfassen und anzeigen
function zeigeDachKoerper(liste, g, fid) {
  for (const art of DACH_ARTEN) { const boxen = liste.flatMap((x) => x.koerper.filter((k) => k.art === art.id && !k.unsichtbar)); if (boxen.length) modell.add(koerperMesh(dachBoxenGeo(boxen, g), art.farbe, fid, dachBoxenKanten(boxen, g))); }
}
const DACH_ARTEN = [{ id: "verkleidung", name: "Verkleidung", farbe: 0xcfc6b8 }, { id: "wechsel", name: "Wechsel", farbe: 0xa07a3a }, { id: "sparren", name: "Sparren", farbe: 0xc9a26b }, { id: "daemmung", name: "Dämmung", farbe: 0xe6cf55 }, { id: "unterdach", name: "Unterdach", farbe: 0x7d6444 }, { id: "konter", name: "Konterlattung", farbe: 0xb98b55 }, { id: "lattung", name: "Dachlattung", farbe: 0xa87a48 }, { id: "deckung", name: "Deckung", farbe: 0xb5543a }];
// Quader (8 Ecken [u, v, h], Index = Normale·4 + t·2 + s) → Dreiecke in Weltkoordinaten; Umlaufsinn über das Volumen nach aussen
function dachBoxenGeo(boxen, g) {
  const F = [[0, 2, 6, 4], [1, 5, 7, 3], [0, 4, 5, 1], [2, 3, 7, 6], [0, 1, 3, 2], [4, 6, 7, 5]], pos = [];
  for (const b of boxen) {
    const W = b.ecken.map((p) => dachWelt(g, p)), t = [];
    for (const [a, c, d, e] of F) t.push([W[a], W[c], W[d]], [W[a], W[d], W[e]]);
    const vol = t.reduce((v, [a, c, d]) => v + (a[0] * (c[1] * d[2] - c[2] * d[1]) - a[1] * (c[0] * d[2] - c[2] * d[0]) + a[2] * (c[0] * d[1] - c[1] * d[0])), 0);
    for (const [a, c, d] of t) pos.push(...(vol < 0 ? [a, d, c] : [a, c, d]).flat());
  }
  const geo = new THREE.BufferGeometry(); geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); return geo;
}
// Kanten der Quader direkt (12 je Körper) – viel schneller als die Winkelsuche über das ganze Netz
// Ziegel (konvexe Vielecke mit Dicke) → Netz und Umrisslinien
function dachZiegelGeo(prismen, g) {
  const pos = [], lin = [], W = (p) => dachWelt(g, p);
  for (const { unten, oben } of prismen) {
    const n = unten.length, U = unten.map(W), O = oben.map(W);
    for (let i = 1; i + 1 < n; i++) { pos.push(...O[0], ...O[i], ...O[i + 1], ...U[0], ...U[i + 1], ...U[i]); }
    for (let i = 0; i < n; i++) { const j = (i + 1) % n; pos.push(...U[i], ...U[j], ...O[j], ...U[i], ...O[j], ...O[i]); lin.push(...O[i], ...O[j]); }
  }
  const geo = new THREE.BufferGeometry(), kg = new THREE.BufferGeometry(); geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); kg.setAttribute("position", new THREE.Float32BufferAttribute(lin, 3)); return [geo, undefined, undefined, kg];
}
function dachBoxenKanten(boxen, g) {
  const E = [[0, 1], [2, 3], [4, 5], [6, 7], [0, 2], [1, 3], [4, 6], [5, 7], [0, 4], [1, 5], [2, 6], [3, 7]], pos = [];
  for (const b of boxen) { const W = b.ecken.map((p) => dachWelt(g, p)); for (const [i, j] of E) pos.push(...W[i], ...W[j]); }
  const geo = new THREE.BufferGeometry(); geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); return geo;
}
// Grundriss einer Skizze (erste/gewählte geschlossene Fläche, gegen den Uhrzeiger): u → x, v → −z (Skizze auf der Grundebene)
function skizzenGrundriss(g) {
  const sk = finde(g.skizze); if (sk?.typ !== "skizze") throw new Error("Skizze für den Grundriss fehlt – zuerst eine geschlossene Fläche skizzieren");
  const l = schleifen(sk); if (!l.length) throw new Error("Die Skizze hat keine geschlossene Fläche");
  return gegenUhrzeiger(l[Math.min(+g.profil || 0, l.length - 1)]);
}
const gebaeudeUmriss = (g) => (g.form === "skizze" ? skizzenGrundriss(g) : grundrissForm(g).grundriss);
// Werte der Vorlage, überschrieben mit den Massen, die beim Erstellen des Dachs eingegeben wurden (f.deckungW / f.aufbauW)
const deckungVon = (f) => { const b = deckungBasis(f); return b ? { ...b, ...(f.deckungW || {}) } : b; };
const aufbauVon = (f) => { const b = aufbauBasis(f); return b ? { ...b, ...(f.aufbauW || {}) } : b; };
// Ebene einer Skizze direkt berechnet (nicht aus dem Zwischenspeicher der letzten Berechnung): die Dachberechnung braucht die aktuelle Lage in jeder Reihenfolge
function ebeneAktuell(id) { const eb = finde(id); if (eb?.typ === "ebene") { try { return baueEbene(eb); } catch {} } return E_(id); }
const weltAkt = (sk, q) => zuWelt(ebeneAktuell(sk.ebene), q);
const dist3 = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]), r2k = (x) => Math.round(x * 100) / 100;
const dachKoordinaten = (w, g) => [w[0] - (+g.x || 0), -(w[2] - (+g.z || 0)), w[1]]; // Welt → Grundriss-Koordinaten (u, v, h) des Dachs
// Einzelnes geschlossenes Vieleck einer Skizze (so wie die Umwandlung es anlegt) – nur dort ist die Zuordnung der Ecken eindeutig
function skizzenVieleck(sk) { const els = profilElemente(sk).filter((el) => el.art === "linie" && el.geschlossen); return els.length === 1 && els[0].pts.length >= 3 ? els[0] : null; }
// Dachflächen koppeln: gemeinsame Ecken zweier (oder mehrerer) Flächen bleiben beisammen. Bewegst du eine Ecke in einer Skizze, folgen die Nachbarflächen – die Ecke wird in deren Ebene gelegt.
// Das ist genau (und die Kante bleibt gemeinsam), wenn die Ecke entlang der gemeinsamen Kante wandert, z. B. First länger oder kürzer; quer dazu bleibt eine Abweichung und der Hinweis «gemeinsame Kante weicht ab».
function dachKoppeln(f) {
  const info = new Map();
  for (const id of f.flaechenSkizzen || []) { const sk = finde(id); if (sk?.typ !== "skizze") continue; const el = skizzenVieleck(sk); if (!el) continue; const E = ebeneAktuell(sk.ebene); info.set(id, { sk, el, E, p3: el.pts.map((q) => zuWelt(E, q)) }); }
  let gr = (f.kopplung || []).filter((g) => g.m.every((x) => Array.isArray(x[2]))).map((g) => ({ n: g.n, m: g.m.map((x) => x.slice()) })); // m: [Skizze, Ecke, zuletzt abgeglichene Lage]
  const gueltig = (g) => g.m.map(([sid, i, rem]) => { const x = info.get(sid); return x && x.el.pts.length === g.n[sid] ? { x, i, rem, pos: x.p3[i], eintrag: [sid, i] } : null; }).filter(Boolean);
  for (const g of gr) {
    const mem = gueltig(g); if (mem.length < 2) continue;
    const bewegt = mem.filter((m) => dist3(m.pos, m.rem) > 0.3); if (bewegt.length !== 1) continue; // genau eine Ecke wurde verschoben: sie führt
    const master = bewegt[0];
    for (const m of mem) if (m !== master) { const lok = zuLokal(m.x.E, master.pos).map(r2k); m.x.el.pts[m.i] = lok; m.x.p3[m.i] = zuWelt(m.x.E, lok); m.pos = m.x.p3[m.i]; }
    g.m = g.m.map(([sid, i]) => { const m = mem.find((q) => q.eintrag[0] === sid && q.eintrag[1] === i); return [sid, i, (m ? m.pos : [0, 0, 0]).map(r2k)]; }); // neue Lage als Stand merken (kein Hin und Her)
  }
  // neue Gruppen: Ecken verschiedener Flächen, die zusammenfallen (1 mm)
  const belegt = new Set(gr.flatMap((g) => g.m.map(([s, i]) => s + ":" + i)));
  const ecken = [...info.values()].flatMap((x) => x.p3.map((p, i) => ({ sid: x.sk.id, i, p }))).filter((e) => !belegt.has(e.sid + ":" + e.i)), vergeben = new Set();
  ecken.forEach((a, ia) => { if (vergeben.has(ia)) return; const grp = [a], sk = new Set([a.sid]); ecken.forEach((b, ib) => { if (ib > ia && !vergeben.has(ib) && !sk.has(b.sid) && dist3(a.p, b.p) < 1) { grp.push(b); sk.add(b.sid); vergeben.add(ib); } });
    if (grp.length >= 2) { vergeben.add(ia); gr.push({ m: grp.map((e) => [e.sid, e.i, e.p.map(r2k)]), n: Object.fromEntries(grp.map((e) => [e.sid, info.get(e.sid).el.pts.length])) }); } });
  gr = gr.filter((g) => gueltig(g).length >= 2);
  if (JSON.stringify(gr) !== JSON.stringify(f.kopplung || [])) f.kopplung = gr;
}
// Lukarne: Traufende der Seitenwand ⇄ Ecke des Gaubendachs (nächstgelegene Ecke der Dachskizzen)
function lukarneKopplungSetzen(x, lk, ids) {
  x.dachKopplung = {};
  for (const seite of ["links", "rechts"]) { const E = lk.eave[seite].E; let best = null;
    lk.idx.dach.forEach((j, a) => lk.formen[j].punkte.forEach((p, i) => { const dd = dist3(p, E); if (!best || dd < best.d) best = { d: dd, sk: ids[a], i, n: lk.formen[j].punkte.length, pos: p.map(r2k) }; }));
    if (best && best.d < 400) x.dachKopplung[seite] = { sk: best.sk, i: best.i, n: best.n, posS: best.pos, posM: E.map(r2k) }; } // posS = Ecke der Skizze, posM = Traufende aus dem Aufmass (beim letzten Abgleich)
  x.dachSnap = lukarneSkizzenStand(x);
}
const lukarneSkizzenStand = (x) => JSON.stringify((x.dachSkizzen || []).map((id) => { const sk = finde(id), el = sk && skizzenVieleck(sk); return el ? el.pts : null; }));
// Dachskizzen neu aus dem Aufmass erzeugen (Ebenen und Eckpunkte werden überschrieben, Namen und Verknüpfungen bleiben)
function lukarneDachNeu(fl, x, oben) {
  const d = finde(x.dach), g = d && finde(d.gebaeude), lk = lukarneKern(fl, { ...x, dachFlaechen: null }, oben); if (!g || lk.idx.dach.length !== (x.dachSkizzen || []).length) return false;
  lk.idx.dach.forEach((j, a) => { const [eb, sk] = skizzeAusFlaeche({ punkte: lk.formen[j].punkte, normale: lk.formen[j].normale }, g, "x"), alt = finde(x.dachSkizzen[a]), ebAlt = alt && finde(alt.ebene);
    if (!alt || ebAlt?.typ !== "ebene") return; Object.assign(ebAlt, { p1: eb.p1, p2: eb.p2, p3: eb.p3 }); alt.elemente = sk.elemente; delete alt.bedingungen; delete alt.ausdruecke; });
  lukarneKopplungSetzen(x, lk, x.dachSkizzen); return true;
}
// Seitenwand und Gaubendach bleiben verbunden:
//  · Ecke in der Dachskizze verschoben → die Seitenwand rechnet Winkel oben und Trauflänge neu.
//  · Aufmass der Seitenwand/Front geändert → ist die Dachskizze noch unverändert, wird sie neu aus dem Aufmass erzeugt; wurde sie von Hand verfeinert, bleibt sie und der Hinweis «weicht ab» erscheint.
function lukarneKoppeln(fl, x, oben) {
  const k = x.dachKopplung, d = finde(x.dach), g = d && finde(d.gebaeude); x._kopplungHinweis = null; if (!k || !g) return;
  for (let durchlauf = 0; durchlauf < 3; durchlauf++) {
    const basis = lukarneKern(fl, { ...x, dachFlaechen: null }, oben); let geaendert = false, abweichung = false;
    for (const seite of ["links", "rechts"]) {
      const e = k[seite], sk = e && finde(e.sk), el = sk && skizzenVieleck(sk); if (!el || el.pts.length !== e.n) continue;
      const cur = dachKoordinaten(zuWelt(ebeneAktuell(sk.ebene), el.pts[e.i]), g), mess = basis.eave[seite].E;
      if (e.nachgefuehrt) { e.posM = mess.map(r2k); delete e.nachgefuehrt; continue; } // nach dem Nachführen der Seitenwand: neuer Stand des Aufmasses
      const dM = dist3(mess, e.posM), dS = dist3(cur, e.posS);
      if (dS > 0.3 && dM <= 0.3) { const m = aufmassAusPunkt(fl, x, oben, seite === "links" ? -1 : 1, cur); x[seite === "links" ? "wL" : "wR"] = r2k(m.winkel); x[seite === "links" ? "lL" : "lR"] = r2k(m.laenge); e.posS = cur.map(r2k); e.nachgefuehrt = true; x.dachSnap = null; geaendert = true; }
      else if (dM > 0.3 && dS <= 0.3) abweichung = true;
    }
    if (abweichung && !geaendert) { // Aufmass geändert
      if (x.dachSnap && lukarneSkizzenStand(x) === x.dachSnap && lukarneDachNeu(fl, x, oben)) geaendert = true; else x._kopplungHinweis = "Aufmass der Seitenwand geändert, die von Hand angepasste Dachskizze folgt nicht – Eckpunkt der Skizze prüfen oder «Gaubendach» neu erzeugen.";
    }
    if (!geaendert) break;
  }
}
// Lukarne: Gaubendach optional aus Skizzen (mm-genau, Längen und Diagonalen); sonst aus Neigung und Aufmass berechnet
function lukarneGeo(fl, x, oben) {
  let ov = null;
  if (x.masse === "aufmass" && x.dachQuelle === "skizzen") {
    const d = finde(x.dach), g = d && finde(d.gebaeude); if (!g) throw new Error("Dach fehlt");
    lukarneKoppeln(fl, x, oben);
    ov = [];
    for (const id of x.dachSkizzen || []) { const sk = finde(id); if (sk?.typ !== "skizze") throw new Error("Eine Skizze des Gaubendachs fehlt"); if (doc.features.indexOf(sk) > doc.features.indexOf(d)) throw new Error(`«${sk.name}» muss vor dem Dach stehen`);
      for (const l of schleifen(sk)) ov.push(l.map((q) => dachKoordinaten(weltAkt(sk, q), g))); }
  }
  return lukarneKern(fl, ov ? { ...x, dachFlaechen: ov } : x, oben);
}
// Ebene durch drei Punkte (Traufkante + 3. Punkt in der Fläche) und Skizze mit dem Umriss einer Dachfläche (Koordinaten: u entlang der Traufkante, v die Fläche hinauf)
function skizzeAusFlaeche(fl, g, name) {
  const W = (p) => dachWelt(g, p), r2 = (x) => Math.round(x * 100) / 100, kreuz = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]], pts = fl.punkte, n = pts.length; let best = 0, bs = Infinity;
  pts.forEach((a, k) => { const b = pts[(k + 1) % n], sc = ((a[2] + b[2]) / 2) * 1e6 - Math.hypot(b[0] - a[0], b[1] - a[1]); if (sc < bs) { bs = sc; best = k; } }); // tiefste, längste Kante = Traufe
  const P0 = pts[best], P1 = pts[(best + 1) % n], uv = [P1[0] - P0[0], P1[1] - P0[1], P1[2] - P0[2]], ul = Math.hypot(...uv), u = uv.map((x) => x / ul), vv = kreuz(fl.normale, u), P2 = P0.map((x, k) => x + vv[k] * 1000);
  const a = W(P0), b = W(P1), c = W(P2), E = dreiPunkte(a, b, c);
  const eb = { id: neueId(), typ: "ebene", art: "punkte", name: `${name} · Ebene`, p1: "V:" + fmt3(a), p2: "V:" + fmt3(b), p3: "V:" + fmt3(c), versteckt: true };
  const sk = { id: neueId(), typ: "skizze", name, ebene: eb.id, elemente: [{ id: 1, art: "linie", pts: pts.map((p) => zuLokal(E, W(p)).map(r2)), geschlossen: true }] };
  return [eb, sk];
}
function lukarneDachZuSkizzen(f) {
  const d = finde(f.dach), g = d && finde(d.gebaeude), lk = f._luk; if (!g || !lk) throw new Error("Lukarne noch nicht berechnet");
  const neu = [], ids = [], namen = lk.idx.dach.length > 1 ? ["Gaubendach links", "Gaubendach rechts"] : ["Gaubendach"];
  lk.idx.dach.forEach((j, i) => { const [eb, sk] = skizzeAusFlaeche({ punkte: lk.formen[j].punkte, normale: lk.formen[j].normale }, g, `${f.name} · ${namen[i]}`); neu.push(eb, sk); ids.push(sk.id); });
  const idx = doc.features.indexOf(d); doc.features.splice(idx, 0, ...neu); if (doc.marke != null && doc.marke > idx) doc.marke += neu.length; // vor dem Dach: dessen Öffnungen brauchen die Skizzen
  f.dachSkizzen = ids; f.dachQuelle = "skizzen";
  lukarneKopplungSetzen(f, lk, ids);
}
// Dach aus frei gezeichneten Dachflächen: jede geschlossene Fläche der gewählten Skizzen (auf geneigten Ebenen) ist eine Dachfläche
function dachAusSkizzen(f, g) {
  dachKoppeln(f);
  const flaechen = [];
  for (const id of f.flaechenSkizzen || []) {
    const sk = finde(id); if (sk?.typ !== "skizze") throw new Error("Eine Skizze der Dachflächen fehlt");
    if (doc.features.indexOf(sk) > doc.features.indexOf(f)) throw new Error(`«${sk.name}» muss vor dem Dach stehen`);
    const loops = schleifen(sk);
    loops.forEach((l, k) => flaechen.push({ name: loops.length > 1 ? `${sk.name} ${k + 1}` : sk.name, punkte: l.map((q) => dachKoordinaten(weltAkt(sk, q), g)) }));
  }
  const r = dachAusFlaechen({ flaechen, grundriss: gebaeudeUmriss(g), traufhoehe: g.traufhoehe });
  return r;
}
// Automatisch berechnete Dachflächen in Skizzen auf geneigten Ebenen umwandeln (Ebene aus Traufkante + 3. Punkt, Skizze mit dem Umriss der Fläche): danach mm-genau bearbeitbar
function dachZuSkizzen(f, g) {
  const r = f._dach; if (!r?.flaechen?.length) throw new Error("Noch kein Dach berechnet");
  const idx = doc.features.indexOf(f), neu = [], ids = [];
  r.flaechen.forEach((fl, i) => { const [eb, sk] = skizzeAusFlaeche(fl, g, `Dachfläche ${i + 1}`); neu.push(eb, sk); ids.push(sk.id); });
  doc.features.splice(idx, 0, ...neu); if (doc.marke != null && doc.marke > idx) doc.marke += neu.length;
  f.flaechenSkizzen = ids; f.quelle = "skizzen";
}
function dachErgebnis(f, g) {
  if (f.quelle === "skizzen") return dachAusSkizzen(f, g);
  if (g.form === "skizze") return polygonDach({ grundriss: skizzenGrundriss(g), neigung: +f.neigung || 35, giebel: String(f.giebel ?? "").split(/[^\d]+/).filter(Boolean).map(Number), ueberstandTraufe: +f.ueberstandTraufe || 0, ueberstandOrtgang: +f.ueberstandOrtgang || 0, traufhoehe: g.traufhoehe });
  if (g.form && g.form !== "rechteck") return fluegelDach({ grundform: g, form: f.form || "sattel", neigung: +f.neigung || 35, neigung2: f.neigung2 ? +f.neigung2 : null, ueberstandTraufe: +f.ueberstandTraufe || 0, ueberstandOrtgang: +f.ueberstandOrtgang || 0, traufhoehe: g.traufhoehe });
  return rechteckDach({ breite: g.breite, tiefe: g.tiefe, form: f.form || "sattel", neigung: +f.neigung || 35, neigung2: f.neigung2 ? +f.neigung2 : null, ueberstandTraufe: +f.ueberstandTraufe || 0, ueberstandOrtgang: +f.ueberstandOrtgang || 0, firstRichtung: f.firstRichtung || "laengs", traufhoehe: g.traufhoehe });
}
// Dach (u, v, h) → Welt (x, y = Höhe, z = −v); Ursprung des Gebäudes bei g.x/g.z
const dachWelt = (g, p) => [p[0] + (+g.x || 0), p[2], -p[1] + (+g.z || 0)];
// Prisma über einem ebenen Polygon (Grundriss-Koordinaten u, v, h): entlang der Normale von unten bis oben aufgedickt; Rückgabe: Dreiecke in Weltkoordinaten
function dachPrisma(punkte, normale, unten, oben, g) {
  const n = punkte.length, ob = punkte.map((p) => p.map((v, i) => v + normale[i] * oben)), un = punkte.map((p) => p.map((v, i) => v + normale[i] * unten));
  const uv2 = punkte.map((p) => new THREE.Vector2(p[0], p[1])), tri = THREE.ShapeUtils.triangulateShape(uv2, []), pos = [], W = (p) => dachWelt(g, p);
  const T = (a, b, c) => pos.push(...W(a), ...W(b), ...W(c));
  for (const [i, j, k] of tri) { T(ob[i], ob[j], ob[k]); T(un[i], un[k], un[j]); }
  for (let i = 0; i < n; i++) { const j = (i + 1) % n; T(un[i], un[j], ob[j]); T(un[i], ob[j], ob[i]); }
  const geo = new THREE.BufferGeometry(); geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); return nachAussen(geo);
}
// Wandplatte: senkrechtes Polygon (u, v, h) um t nach innen aufgedickt
function wandPlatte(punkte, innenNormal, t, g) {
  const W = (p) => dachWelt(g, p), a = punkte.map((p) => p.slice()), b = punkte.map((p) => [p[0] + innenNormal[0] * t, p[1] + innenNormal[1] * t, p[2]]);
  const e1 = [punkte[1][0] - punkte[0][0], punkte[1][1] - punkte[0][1]], l = Math.hypot(...e1) || 1, ex = [e1[0] / l, e1[1] / l];
  const pl = punkte.map((p) => new THREE.Vector2((p[0] - punkte[0][0]) * ex[0] + (p[1] - punkte[0][1]) * ex[1], p[2])), tri = THREE.ShapeUtils.triangulateShape(pl, []), pos = [], T = (x, y, z) => pos.push(...W(x), ...W(y), ...W(z));
  for (const [i, j, k] of tri) { T(a[i], a[j], a[k]); T(b[i], b[k], b[j]); }
  for (let i = 0; i < a.length; i++) { const j = (i + 1) % a.length; T(a[i], a[j], b[j]); T(a[i], b[j], b[i]); }
  const geo = new THREE.BufferGeometry(); geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); return nachAussen(geo);
}
function eindeckungDialog(f) {
  const daecher = doc.features.filter((x) => x.typ === "dach" && x._dach); if (!daecher.length && !f) return fehltDialog("Dach", "Zuerst ein Dach anlegen («Dach automatisch»).");
  const istNeu = !f; f ||= { id: neueId(), typ: "eindeckung", name: "Eindeckung " + (doc.features.filter((x) => x.typ === "eindeckung").length + 1), dach: vorDach(daecher).id };
  featureDialog(f, istNeu, (f) => [{ id: "name", label: "Name", text: true, wert: f.name }, { id: "dach", label: "Dach", wahl: "dach", optionen: daecher.map((d) => [d.id, d.name]), wert: f.dach }], (f, w) => { f.name = w.name?.trim() || f.name; if (w.dach) f.dach = w.dach; },
    "Ziegel eindecken", "Zuerst alle Spenglerbleche zeichnen («Dachbleche»): die Eindeckung erkennt Kehle, Wangen-/Fussanschlüsse, Fenster, Kamine und Lukarnen und schneidet die Ziegel dort an. Deckbreite und Lattweite kommen aus der Deckung des Dachs (Einstellungen › Dach). Ziegel sind schematisch (Rechtecke ohne Falzform).",
    { info: () => f._fehler ? "⚠ " + f._fehler : f._ziegel ? (f._ohneBleche ? "⚠ Noch keine Dachbleche vor der Eindeckung – die Ziegel werden nur an Rand und Öffnungen geschnitten. " : "") + `Ziegel ${f._ziegel.anzahl} Stk. (davon ${f._ziegel.geschnitten} geschnitten) · Richtwert ${f._ziegel.richtwert}` : "" });
}
function lukarneDialog(f) {
  const daecher = doc.features.filter((x) => x.typ === "dach" && x._dach); if (!daecher.length && !f) return fehltDialog("Dach", "Zuerst ein Dach anlegen («Dach automatisch»).");
  const istNeu = !f; f ||= { id: neueId(), typ: "lukarne", name: "Lukarne " + (doc.features.filter((x) => x.typ === "lukarne").length + 1), dach: vorDach(daecher).id, flaeche: 0, masse: "aufmass", art: "sattel", bu: 1800, bo: 1800, hf: 1200, hL: 0, wL: 90, lL: 1500, hR: 0, wR: 90, lR: 1500, b: 1600, hw: 1100, neigung: 30, ueberstand: 200, wd: 150, dd: 250, x: 3000, y: 1500 };
  if (istNeu) { const fl0 = finde(f.dach)?._dach?.flaechen?.[0]; if (fl0) f.lL = f.lR = Math.round(f.hf / Math.tan((fl0.neigung * Math.PI) / 180)); } // Vorgabe: waagrechte Traufe bis zur Dachfläche
  const flOpt = (id) => (finde(id)?._dach?.flaechen || []).map((x, i) => [String(i), `Fläche ${i + 1}: ${x.neigung.toFixed(0)}°, ${x.flaeche.toFixed(1)} m²`]);
  const aufmass = (f) => f.masse === "aufmass";
  const felder = (f) => [{ id: "name", label: "Name", text: true, wert: f.name }, { id: "dach", label: "Dach", optionen: daecher.map((d) => [d.id, d.name]), wert: f.dach }, { id: "flaeche", label: "Dachfläche (anklicken)", wahl: "dachflaeche", optionen: flOpt(f.dach), wert: String(f.flaeche ?? 0) },
    { id: "masse", label: "Eingabe", optionen: [["aufmass", "Aufmass: Front und Seitenwände einzeln gemessen"], ["modell", "Modell: Breite, Stirnhöhe, Dachüberstand"]], wert: f.masse || "modell" },
    { id: "art", label: "Art", optionen: Object.entries(LUKARNENARTEN), wert: f.art },
    ...(aufmass(f) ? [{ id: "bu", label: "Front: Breite unten", einheit: "mm", wert: f.bu }, { id: "bo", label: "Front: Breite oben", einheit: "mm", wert: f.bo }, { id: "hf", label: "Front: Höhe", einheit: "mm", wert: f.hf },
      { id: "hL", label: "Seite links: vordere Höhe (0 = wie Front)", einheit: "mm", wert: f.hL ?? 0 }, { id: "wL", label: "Seite links: Winkel oben an der vorderen Höhe zur Traufe", einheit: "°", wert: f.wL ?? 90 }, { id: "lL", label: "Seite links: Trauflänge der Lukarne", einheit: "mm", wert: f.lL },
      { id: "hR", label: "Seite rechts: vordere Höhe (0 = wie Front)", einheit: "mm", wert: f.hR ?? 0 }, { id: "wR", label: "Seite rechts: Winkel oben an der vorderen Höhe zur Traufe", einheit: "°", wert: f.wR ?? 90 }, { id: "lR", label: "Seite rechts: Trauflänge der Lukarne", einheit: "mm", wert: f.lR },
      { id: "dachQuelle", label: "Gaubendach", optionen: [["auto", "Aus Dachneigung berechnet"], ["skizzen", "Aus Skizzen (mm-genau, Längen und Diagonalen)"]], wert: f.dachQuelle || "auto" }, { id: "neigung", label: "Dachneigung Gaube (nur Satteldachgaube, bei «berechnet»)", einheit: "°", wert: f.neigung }]
    : [{ id: "b", label: "Breite aussen", einheit: "mm", wert: f.b }, { id: "hw", label: "Stirnwandhöhe (ab Dach)", einheit: "mm", wert: f.hw }, { id: "neigung", label: "Dachneigung Gaube (Sattel/Schlepp)", einheit: "°", wert: f.neigung }, { id: "ueberstand", label: "Dachüberstand Gaube", einheit: "mm", wert: f.ueberstand }]),
    { id: "wd", label: "Wandstärke", einheit: "mm", wert: f.wd }, { id: "dd", label: "Dachaufbau Gaube (Dicke)", einheit: "mm", wert: f.dd },
    { id: "x", label: "Lage: Mitte quer ab linker Kante", einheit: "mm", wert: f.x }, { id: "y", label: "Lage: Front ab Traufe", einheit: "mm", wert: f.y }];
  const setze = (f, w) => { f.name = w.name?.trim() || f.name; if (w.dach) f.dach = w.dach; if (w.flaeche !== undefined) f.flaeche = +w.flaeche || 0; if (w.art) f.art = w.art; if (w.masse) f.masse = w.masse;
    if (w.dachQuelle === "skizzen" && f.dachQuelle !== "skizzen") { if (f.dachSkizzen?.length) f.dachQuelle = "skizzen"; else lukarneDachZuSkizzen(f); } else if (w.dachQuelle === "auto" && f.dachQuelle === "skizzen") f.dachQuelle = "auto";
    for (const k of ["bu", "bo", "hf", "hL", "wL", "lL", "hR", "wR", "lR", "b", "hw", "neigung", "ueberstand", "wd", "dd", "x", "y"]) if (Number.isFinite(w[k])) f[k] = w[k]; };
  const REGELN = [["Art und Lage", () => true], ["Front", (id) => ["bu", "bo", "hf", "b", "hw"].includes(id)], ["Seitenwand links", (id) => ["hL", "wL", "lL"].includes(id)], ["Seitenwand rechts", (id) => ["hR", "wR", "lR"].includes(id)],
    ["Gaubendach und Aufbau", (id) => ["dachQuelle", "neigung", "ueberstand", "wd", "dd"].includes(id)], ["Lage am Dach", (id) => id === "x" || id === "y"]];
  featureDialog(f, istNeu, (f) => mitSchritten(felder(f), REGELN), setze, "Lukarne", "Aufmass wie am Objekt: Front (Breite unten, Breite oben, Höhe) und je Seitenwand links/rechts die vordere Höhe, der Winkel oben an der vorderen Höhe zur Traufe und die Trauflänge – genau wie die Massaufnahme «Lukarne Seitenwand». Die Unterkante der Seitenwand liegt auf der Dachfläche. Im Hauptdach werden Sparren und Latten unterbrochen, Wechsel eingefügt und die Fläche abgezogen; die Anschlussbleche erscheinen bei den Dachblechen. Das Gaubendach ist eine einfache Platte.",
    { neuBei: ["masse", "dachQuelle"], info: () => { if (f._fehler) return "⚠ " + f._fehler; const l = f._luk; if (!l) return ""; const am = l.aufmass, seite = (n, x) => `${n}: Schräge ${x.schraege.toFixed(0)}, Tiefe ${x.tiefe.toFixed(0)}, Fläche ${x.flaeche.toFixed(2)} m²`;
      return (f._kopplungHinweis ? "⚠ " + f._kopplungHinweis + " " : "") + (l.hinweise.length ? "⚠ " + l.hinweise.join(" · ") + " " : "") + (am ? `${seite("Links", am.links)} · ${seite("Rechts", am.rechts)} · ` : "") + `Öffnung ${l.flaeche.toFixed(2)} m² · höchster Punkt ${(l.firsthoehe / 1000).toFixed(2)} m`; } });
}
function dachelementDialog(f) {
  const daecher = doc.features.filter((x) => x.typ === "dach" && x._dach); if (!daecher.length && !f) return fehltDialog("Dach", "Zuerst ein Dach anlegen («Dach automatisch»).");
  const istNeu = !f; f ||= { id: neueId(), typ: "dachelement", name: "Dachfenster " + (doc.features.filter((x) => x.typ === "dachelement").length + 1), dach: vorDach(daecher).id, flaeche: 0, art: "fenster", velux: "MK04", b: 780, h: 978, x: 3000, y: 1500, hoehe: 1000 };
  const flOpt = (id) => (finde(id)?._dach?.flaechen || []).map((x, i) => [String(i), `Fläche ${i + 1}: ${x.neigung.toFixed(0)}°, ${(x.flaeche).toFixed(1)} m²`]);
  const felder = (f) => [{ id: "name", label: "Name", text: true, wert: f.name }, { id: "dach", label: "Dach", optionen: daecher.map((d) => [d.id, d.name]), wert: f.dach }, { id: "flaeche", label: "Dachfläche (anklicken)", wahl: "dachflaeche", optionen: flOpt(f.dach), wert: String(f.flaeche ?? 0) },
    { id: "art", label: "Art", optionen: Object.entries(ELEMENTARTEN), wert: f.art }, { id: "velux", label: "Velux-Grösse (nur Dachfenster)", optionen: [["", "frei (Masse unten)"], ...veluxListe().map((v) => [v.code, `${v.code} · ${v.b} × ${v.h}${v.bestaetigt ? "" : " (abgeleitet)"}`])], wert: f.velux || "" },
    { id: "b", label: "Breite", einheit: "mm", wert: f.b }, { id: "h", label: "Höhe (Fenster) / Tiefe (Kamin)", einheit: "mm", wert: f.h }, { id: "hoehe", label: "Kamin: Höhe über Dach", einheit: "mm", wert: f.hoehe ?? 1000 },
    { id: "x", label: "Lage: Mitte quer ab linker Kante", einheit: "mm", wert: f.x }, { id: "y", label: "Lage: Unterkante ab Traufe", einheit: "mm", wert: f.y }];
  const setze = (f, w) => { f.name = w.name?.trim() || f.name; if (w.dach) f.dach = w.dach; if (w.flaeche !== undefined) f.flaeche = +w.flaeche || 0; if (w.art) f.art = w.art; f.velux = w.velux || ""; if (f.art === "kamin") f.name = f.name.replace(/^Dachfenster (\d+)$/, "Kamin $1"); else f.name = f.name.replace(/^Kamin (\d+)$/, "Dachfenster $1");
    for (const k of ["b", "h", "hoehe", "x", "y"]) if (Number.isFinite(w[k])) f[k] = w[k];
    const v = f.art === "fenster" && f.velux && veluxListe().find((q) => q.code === f.velux); if (v) { f.b = v.b; f.h = v.h; } };
  const REGELN = [["Art und Dachfläche", () => true], ["Masse", (id) => ["velux", "b", "h", "hoehe"].includes(id)], ["Lage", (id) => id === "x" || id === "y"]];
  featureDialog(f, istNeu, (f) => mitSchritten(felder(f), REGELN), setze, "Dachfenster / Kamin", "Öffnung in der Dachfläche: Sparren, Konter- und Dachlatten werden unterbrochen, Wechsel oben und unten eingefügt, Fläche aus Dämmung/Unterdach/Deckung abgezogen. Velux: Aussenmasse des Blendrahmens – Eindeckrahmen und Dachöffnung je Deckung sind noch nicht berücksichtigt. Kamin: Anschlussbleche erscheinen bei den Dachblechen.",
    { info: () => f._fehler ? "⚠ " + f._fehler : f._rect ? `Öffnung ${f.b} × ${f.h} mm · ${(elementFlaeche(f)).toFixed(2)} m²` : "" });
}
function dachblecheDialog(f) {
  const daecher = doc.features.filter((x) => x.typ === "dach"); if (!daecher.length && !f) return fehltDialog("Dach", "Zuerst ein Dach anlegen («Dach automatisch»).");
  const istNeu = !f; f ||= { id: neueId(), typ: "dachbleche", name: "Dachbleche " + (doc.features.filter((x) => x.typ === "dachbleche").length + 1), dach: vorDach(daecher).id, material: neuMaterial(), arten: {}, params: {} };
  const felder = (f) => [{ id: "name", label: "Name", text: true, wert: f.name }, { id: "dach", label: "Dach", wahl: "dach", optionen: daecher.map((d) => [d.id, d.name]), wert: f.dach }, { id: "material", label: "Material", optionen: matOpt(), wert: f.material },
    ...Object.keys(BLECHARTEN).flatMap((a) => { const v = VORLAGE[BLECH_VORLAGE[a]], w = { ...standardwerte(v.id), ...(f.params?.[a] || {}) };
      return [{ id: "a_" + a, label: BLECHARTEN[a], optionen: [["ja", "ja – erstellen"], ["nein", "nein"]], wert: f.arten?.[a] === false ? "nein" : "ja" }, ...v.params.filter(([k]) => k !== "neigung").map(([k, l, e]) => ({ id: `p_${a}_${k}`, label: `${BLECHARTEN[a]}: ${l}`, einheit: e, wert: w[k] }))]; })];
  const setze = (f, w) => { f.name = w.name?.trim() || f.name; if (w.dach) f.dach = w.dach; if (w.material) f.material = w.material; f.arten = {}; f.params = {};
    for (const a of Object.keys(BLECHARTEN)) { f.arten[a] = w["a_" + a] !== "nein"; f.params[a] = {}; for (const [k] of VORLAGE[BLECH_VORLAGE[a]].params) if (Number.isFinite(w[`p_${a}_${k}`])) f.params[a][k] = w[`p_${a}_${k}`]; } };
  const REGELN = [["Dach und Material", () => true], ...Object.keys(BLECHARTEN).map((a) => [BLECHARTEN[a], (id) => id === "a_" + a || id.startsWith(`p_${a}_`)])];
  featureDialog(f, istNeu, (f) => mitSchritten(felder(f), REGELN), setze, "Dachbleche (Spengler-Brücke)", "Aus den Dachflächen entstehen automatisch Traufblech, Ortgangblech, Firstblech, Gratblech und Kehlblech mit Abwicklung, Stückliste und DXF. Schenkelmasse je Blechart sind einstellbar; Neigung und Länge kommen aus dem Dach.",
    { info: () => f._fehler ? "⚠ " + f._fehler : f._teile ? f._teile.map((t) => `${t.name} × ${t.stueck}`).join(" · ") : "" });
}
function gebaeudeDialog(f) {
  const istNeu = !f; f ||= { id: neueId(), typ: "gebaeude", name: "Gebäude " + (doc.features.filter((x) => x.typ === "gebaeude").length + 1), breite: 10000, tiefe: 8000, traufhoehe: 3000, wandstaerke: 300, x: 0, z: 0 };
  const REGELN = [["Abmessungen", () => true], ["Grundform", (id) => ["gform", "gskizze", "gprofil", "fluegelBreite", "fluegelTiefe"].includes(id)], ["Höhe und Lage", (id) => ["traufhoehe", "wandstaerke", "x", "z"].includes(id)]];
  featureDialog(f, istNeu, (f) => mitSchritten([{ id: "name", label: "Name", text: true, wert: f.name }, { id: "breite", label: "Breite (Länge)", einheit: "mm", wert: f.breite }, { id: "tiefe", label: "Tiefe", einheit: "mm", wert: f.tiefe },
    { id: "gform", label: "Grundform", optionen: Object.entries(GRUNDFORMEN), wert: f.form || "rechteck" }, { id: "gskizze", label: "Skizze (bei «Aus Skizze»)", optionen: [["", "–"], ...doc.features.filter((x) => x.typ === "skizze").map((x) => [x.id, x.name])], wert: f.skizze || "" }, { id: "gprofil", label: "Fläche Nr. in der Skizze", wert: (f.profil ?? 0) + 1 }, { id: "fluegelBreite", label: "Querflügel: Breite", einheit: "mm", wert: f.fluegelBreite ?? 4000 }, { id: "fluegelTiefe", label: "Querflügel: ragt über Rückseite", einheit: "mm", wert: f.fluegelTiefe ?? 5000 }, 
    { id: "traufhoehe", label: "Wandhöhe bis Traufe", einheit: "mm", wert: f.traufhoehe }, { id: "wandstaerke", label: "Wandstärke", einheit: "mm", wert: f.wandstaerke }, { id: "x", label: "Lage X", einheit: "mm", wert: f.x ?? 0 }, { id: "z", label: "Lage Z", einheit: "mm", wert: f.z ?? 0 }], REGELN),
    (f, w) => { for (const k of ["breite", "tiefe", "traufhoehe", "wandstaerke", "x", "z", "fluegelBreite", "fluegelTiefe"]) if (Number.isFinite(w[k])) f[k] = w[k]; if (w.gform) f.form = w.gform; if (w.gskizze !== undefined) f.skizze = w.gskizze || null; if (Number.isFinite(+w.gprofil) && +w.gprofil >= 1) f.profil = +w.gprofil - 1; f.name = w.name?.trim() || f.name; }, "Gebäude (Ansatz)", "Rechteckiger Gebäudekörper: Wände bis zur Traufe, Giebel bis zum Dach. Später erweiterbar (Geschosse, Öffnungen).");
}
// Alle Masse des Dachaufbaus und der Deckung beim Erstellen eingeben: Vorlage wählen, einzelne Werte überschreiben (nur Abweichungen werden im Dach gespeichert)
const AUFBAU_ZAHLEN = [["sparrenB", "Sparren: Breite"], ["sparrenH", "Sparren: Höhe"], ["achsabstand", "Sparren: Achsabstand"], ["daemmDicke", "Dämmung: Dicke"], ["unterdachDicke", "Unterdach: Dicke (Schalung)"], ["konterB", "Konterlattung: Breite"], ["konterH", "Konterlattung: Höhe"]];
const DECKUNG_ZAHLEN = [["lattenB", "Dachlattung: Breite"], ["lattenH", "Dachlattung: Höhe"], ["lattweite", "Lattweite (Abstand der Latten)"], ["deckbreite", "Ziegel: Deckbreite"], ["ziegelLaenge", "Ziegel: Länge"], ["ziegelT", "Ziegel: Dicke"], ["ziegelDicke", "Deckung: Schichtdicke im Aufbau"], ["stueckProM2", "Stück je m²"], ["gewichtProM2", "Gewicht je m²"], ["mindestNeigung", "Mindestneigung"]];
const dachAufbauFelder = (f) => { const a = aufbauVon(f) || {}; return [{ id: "aw_daemmung", label: "Dämmung", optionen: [["zwischen", "zwischen den Sparren"], ["aufsparren", "auf den Sparren"]], wert: a.daemmung || "zwischen" }, { id: "aw_unterdach", label: "Unterdach", optionen: [["schalung", "Schalung + Bahn"], ["bahn", "diffusionsoffene Bahn"]], wert: a.unterdach || "schalung" }, ...AUFBAU_ZAHLEN.map(([k, l]) => ({ id: "aw_" + k, label: l, einheit: "mm", wert: a[k] }))]; };
const dachDeckungFelder = (f) => { const d = deckungVon(f) || {}; return DECKUNG_ZAHLEN.map(([k, l]) => ({ id: "dw_" + k, label: l, einheit: k === "mindestNeigung" ? "°" : k === "stueckProM2" ? "" : k === "gewichtProM2" ? "kg" : "mm", wert: d[k] })); };
function dachMasseUebernehmen(f, w) {
  for (const [auswahlId, basisFn, feldPraefix, ziel, zahlen, texte] of [["aufbau", aufbauBasis, "aw_", "aufbauW", AUFBAU_ZAHLEN, ["daemmung", "unterdach"]], ["deckung", deckungBasis, "dw_", "deckungW", DECKUNG_ZAHLEN, []]]) {
    if (w[auswahlId] && w[auswahlId] !== f[auswahlId]) { f[auswahlId] = w[auswahlId]; f[ziel] = {}; continue; } // andere Vorlage: eigene Masse verwerfen
    const basis = basisFn(f); if (!basis) { if (w[auswahlId]) f[auswahlId] = w[auswahlId]; continue; }
    const ov = {}; for (const [k] of zahlen) { const v = w[feldPraefix + k]; if (Number.isFinite(v) && v > 0 && v !== basis[k]) ov[k] = v; }
    for (const k of texte) { const v = w[feldPraefix + k]; if (v && v !== basis[k]) ov[k] = v; }
    f[ziel] = ov; if (w[auswahlId]) f[auswahlId] = w[auswahlId];
  }
}
function dachDialog(f, vor) { // vor: { skizze } = Grundriss aus der Kontextleiste
  const istNeu = !f; let g;
  if (istNeu) {
    g = { id: neueId(), typ: "gebaeude", name: "Gebäude " + (doc.features.filter((x) => x.typ === "gebaeude").length + 1), breite: 10000, tiefe: 8000, traufhoehe: 3000, wandstaerke: 300, x: 0, z: 0, ...(vor?.skizze ? { form: "skizze", skizze: vor.skizze, profil: 0 } : {}) }; einfuegen(g);
    f = { id: neueId(), typ: "dach", name: "Dach " + (doc.features.filter((x) => x.typ === "dach").length + 1), gebaeude: g.id, form: "sattel", firstRichtung: "laengs", neigung: 35, neigung2: 35, ueberstandTraufe: 400, ueberstandOrtgang: 300, deckung: dachEinst().standardDeckung, aufbau: dachEinst().standardAufbau };
  } else g = finde(f.gebaeude);
  if (!g) return status("Das Gebäude dieses Dachs fehlt.");
  const felder = (f) => [{ id: "name", label: "Name", text: true, wert: f.name }, { id: "breite", label: "Gebäude: Breite", einheit: "mm", wert: g.breite }, { id: "tiefe", label: "Gebäude: Tiefe", einheit: "mm", wert: g.tiefe }, { id: "traufhoehe", label: "Wandhöhe bis Traufe", einheit: "mm", wert: g.traufhoehe }, { id: "wandstaerke", label: "Wandstärke", einheit: "mm", wert: g.wandstaerke },
    { id: "gform", label: "Grundform", optionen: Object.entries(GRUNDFORMEN), wert: g.form || "rechteck" }, { id: "gskizze", label: "Skizze (bei «Aus Skizze»)", optionen: [["", "–"], ...doc.features.filter((x) => x.typ === "skizze").map((x) => [x.id, x.name])], wert: g.skizze || "" }, { id: "gprofil", label: "Fläche Nr. in der Skizze", wert: (g.profil ?? 0) + 1 }, { id: "fluegelBreite", label: "Querflügel: Breite", einheit: "mm", wert: g.fluegelBreite ?? 4000 }, { id: "fluegelTiefe", label: "Querflügel: ragt über Rückseite", einheit: "mm", wert: g.fluegelTiefe ?? 5000 }, 
    { id: "quelle", label: "Dachflächen", optionen: [["auto", "Automatisch aus Grundriss und Neigung"], ["skizzen", "Aus Skizzen (mm-genau, frei bearbeitbar)"]], wert: f.quelle || "auto" },
    ...(f.quelle === "skizzen" ? [{ id: "fAdd", label: "Skizze als Dachfläche hinzufügen", optionen: [["", "–"], ...doc.features.filter((x) => x.typ === "skizze" && !(f.flaechenSkizzen || []).includes(x.id)).map((x) => [x.id, x.name])], wert: "" }, { id: "fDel", label: "Dachfläche entfernen", optionen: [["", "–"], ...(f.flaechenSkizzen || []).map((id) => [id, finde(id)?.name || id])], wert: "" }] : []),
    { id: "form", label: "Dachform", optionen: Object.entries(DACHFORMEN), wert: f.form }, { id: "firstRichtung", label: "First / Gefälle", optionen: [["laengs", "First längs (Länge)"], ["quer", "First quer (Tiefe)"]], wert: f.firstRichtung || "laengs" },
    { id: "neigung", label: "Neigung", einheit: "°", wert: f.neigung }, { id: "giebel", label: "Giebelkanten Nr. (nur Grundform «Aus Skizze», z. B. 2,4)", text: true, wert: f.giebel ?? "" }, ...(["sattel", "walm"].includes(f.form) ? [{ id: "neigung2", label: "Neigung 2. Seite", einheit: "°", wert: f.neigung2 ?? f.neigung }] : []),
    { id: "ueberstandTraufe", label: "Überstand Traufe", einheit: "mm", wert: f.ueberstandTraufe }, { id: "ueberstandOrtgang", label: "Überstand Ortgang", einheit: "mm", wert: f.ueberstandOrtgang },
    { id: "aufbau", label: "Dachaufbau (Vorlage)", optionen: dachEinst().aufbauten.map((a) => [a.id, a.name]), wert: f.aufbau }, ...dachAufbauFelder(f),
    { id: "deckung", label: "Deckung (Vorlage)", optionen: dachEinst().deckungen.map((d) => [d.id, d.name]), wert: f.deckung }, ...dachDeckungFelder(f),
    { id: "darstellung", label: "Darstellung", optionen: [["detail", "Aufbau detailliert (Sparren, Dämmung, Latten …)"], ["platte", "Nur Platte (schnell)"]], wert: f.darstellung || "detail" }];
  const setze = (f, w) => {
    for (const k of ["breite", "tiefe", "traufhoehe", "wandstaerke", "fluegelBreite", "fluegelTiefe"]) if (w[k] > 0) g[k] = w[k]; if (w.gform) g.form = w.gform; if (w.gskizze !== undefined) g.skizze = w.gskizze || null; if (Number.isFinite(+w.gprofil) && +w.gprofil >= 1) g.profil = +w.gprofil - 1;
    for (const k of ["neigung", "neigung2", "ueberstandTraufe", "ueberstandOrtgang"]) if (Number.isFinite(w[k]) && w[k] >= 0) f[k] = w[k];
    dachMasseUebernehmen(f, w);
    if (w.quelle === "skizzen" && f.quelle !== "skizzen") { if (f.flaechenSkizzen?.length) f.quelle = "skizzen"; else dachZuSkizzen(f, g); }
    else if (w.quelle === "auto" && f.quelle === "skizzen") f.quelle = "auto";
    if (w.fAdd) f.flaechenSkizzen = [...(f.flaechenSkizzen || []), w.fAdd];
    if (w.fDel) f.flaechenSkizzen = (f.flaechenSkizzen || []).filter((id) => id !== w.fDel);
    for (const k of ["form", "firstRichtung", "darstellung"]) if (w[k]) f[k] = w[k]; if (w.giebel !== undefined) f.giebel = w.giebel;
    f.name = w.name?.trim() || f.name; if (f.neigung > 80) f.neigung = 80; if (f.neigung2 > 80) f.neigung2 = 80;
  };
  const REGELN = [["Gebäude", () => true], ["Dachform", (id) => ["quelle", "fAdd", "fDel", "form", "firstRichtung", "neigung", "giebel", "neigung2", "ueberstandTraufe", "ueberstandOrtgang"].includes(id)],
    ["Aufbau (Sparren, Dämmung, Unterdach)", (id) => id === "aufbau" || id.startsWith("aw_")], ["Deckung (Latten, Ziegel)", (id) => id === "deckung" || id.startsWith("dw_")], ["Darstellung", (id) => id === "darstellung"]];
  featureDialog(f, istNeu, (f) => mitSchritten(felder(f), REGELN), setze, "Dach automatisch",
    "Grundform (Rechteck) mit Massen, Dachform, Neigung, Überstände, Deckung und Aufbau – alles andere rechnet das Programm. Deckungs- und Aufbauwerte stellst du in den Einstellungen › Dach ein.",
    { neuBei: ["deckung", "aufbau", "quelle", "fAdd", "fDel"], info: () => { const r = f._dach; if (f._fehler) return "⚠ " + f._fehler; if (!r) return ""; const m = pruefeDach({ neigungen: r.flaechen.map((x) => x.neigung), deckung: deckungVon(f) }), A = r.flaechen.reduce((s, x) => s + x.flaeche, 0), L = (a) => r.linien.filter((l) => l.art === a).reduce((s, l) => s + l.laenge, 0) / 1000;
        return (m.length ? "⚠ " + m[0] + " " : "") + (r.hinweise?.length ? "⚠ " + r.hinweise[0] + " " : "") + `Dachfläche ${A.toFixed(1)} m² · First ${L("first").toFixed(1)} m · Grate ${L("grat").toFixed(1)} m${L("kehle") ? ` · Kehlen ${L("kehle").toFixed(1)} m` : ""} · Firsthöhe ${(r.firsthoehe / 1000).toFixed(2)} m`; } });
  if (istNeu) { const d = dlg, alt = d.abbrechen; d.abbrechen = () => { alt(); entferneFeature(g); }; setTimeout(() => $("zoomAlles").click(), 50); }
}
// ------------------------------------------------------------ Kanten-Werkzeug: Flansch / Umschlag / Kantenbaustein (erst Blech anklicken, dann die Kante)
let kantenWz = null; // { typ, baustein, seite, schritt: "blech" | "kante", f }
const kantenWzText = () => { const w = kantenWz; if (!w) return ""; return w.schritt === "blech" ? "① Flächenblech oder Blechprofil anklicken" : istProfil(w.f) ? `② «${w.f.name}»: Kante am Modell anklicken (Längsseite A/B oder Stirnkante eines Schenkels – sie leuchtet beim Überfahren auf)` : `② Kante von «${w.f.name}» anklicken`; };
function kantenBarZeigen() {
  const w = kantenWz, bar = $("kantenBar"); bar.hidden = !w; if (!w) { if (!dlg) document.querySelector(".mitte")?.classList.remove("dialogMitWerk"); return; }
  $("kbTitel").textContent = w.typ === "flansch" ? "Flansch" : w.typ === "umschlag" ? "Umschlag" : `Baustein: ${bausteinName(w.baustein)}`;
  $("kbText").textContent = kantenWzText();
  $("kbOk").hidden = w.schritt !== "kante"; $("kbOk").disabled = !w.vorschau?.size; $("kbOk").textContent = w.vorschau?.size ? `Übernehmen (${w.vorschau.size})` : "Übernehmen";
  $("kbWinkelL").hidden = w.typ !== "flansch"; $("kbSaumL").hidden = w.typ !== "umschlag"; $("kbBezugL").hidden = $("kbPosL").hidden = w.typ !== "flansch"; $("kbLaengeL").hidden = w.typ === "baustein";
  { const blech = w.f?.typ === "flaeche"; $("kbTeilL").hidden = !blech; $("kbTeil").value = w.teil && blech ? "teil" : "ganz"; $("kbTeilWL").hidden = !(blech && w.teil);
    if (blech && w.teil) { const l0 = vorschauFeatures().at(-1); if (l0?.teil) { $("kbVon").value = String(l0.teil.von); $("kbBis").value = String(l0.teil.bis); } } }
  $("kbBausteinL").hidden = w.typ !== "baustein";
  if (w.typ === "baustein") { const alle = alleBausteine(), gr = [...new Set(alle.map((b) => b.gruppe || "Eigene"))], sel = $("kbBaustein"); sel.innerHTML = gr.map((g) => `<optgroup label="${esc(g)}">${alle.filter((b) => (b.gruppe || "Eigene") === g).map((b) => `<option value="${esc(b.id)}">${esc(b.name)} – ${esc(b.folge)}</option>`).join("")}</optgroup>`).join(""); sel.value = w.baustein; }
  $("kbRichtung").textContent = `${w.seite === -1 ? "Nach hinten" : "Sichtseite"} ⇄`; document.querySelector(".mitte")?.classList.add("dialogMitWerk"); // Teil-Panel (Zuschnitt) bleibt unter dem Werkzeugfenster sichtbar
}
function endeKantenWz() { vorschauVerwerfen(); regen(); kantenWz = null; menueKante = null; kantenBarZeigen(); zeigeKanten(); }
let kHoverWartet = false, kHoverPos = null; // Kante unter dem Zeiger leuchtet auf (Werkzeug Schritt 2)
leinwand.addEventListener("pointermove", (e) => {
  if (!kantenWz || kantenWz.schritt !== "kante" || skizze || dlg) return; kHoverPos = { clientX: e.clientX, clientY: e.clientY, pointerType: e.pointerType }; if (kHoverWartet) return; kHoverWartet = true;
  requestAnimationFrame(() => { kHoverWartet = false; if (!kantenWz || kantenWz.schritt !== "kante") return; const k = kanteUnterMaus(kantenWz.f, kHoverPos); if ((k || null) !== (menueKante?.key || null)) { menueKante = k ? { fid: kantenWz.f.id, key: k } : null; zeigeKanten(); } });
});
$("labels").addEventListener("pointerover", (e) => { // auch die Beschriftung «K1» in der Kantenmitte lässt die Kante aufleuchten
  const kd = e.target.closest?.(".kante"); if (!kantenWz || kantenWz.schritt !== "kante" || !kd || kd.dataset.fid !== kantenWz.f.id || menueKante?.key === kd.dataset.kante) return;
  menueKante = { fid: kantenWz.f.id, key: kd.dataset.kante }; zeigeKanten();
});
// Nachträgliche Kantenbausteine eines Blechprofils (Kante A = Anfang, B = Ende) als Verlängerung der Abkantfolge
// Stirnflansche an Anfang (S1) und Ende (S2) der Länge, je Schenkel (0 = alle geraden Schenkel)
function stirnErweiterungen(f, m) {
  return doc.features.filter((x) => x.typ === "profilkante" && x.ziel === f.id && !x._aus && (x.ende === "S1" || x.ende === "S2")).map((x) => { const b = werkzeugAuf(bausteinFuer(x.wert), m); return b && String(b.folge ?? "").trim() ? { ende: x.ende, schenkel: +x.schenkel || 0, zeilen: folge(`1 ${bausteinFolge(b, m)}`) } : null; }).filter(Boolean);
}
function profilErweiterungen(f, m) {
  return doc.features.filter((x) => x.typ === "profilkante" && x.ziel === f.id && !x._aus && x.ende !== "S1" && x.ende !== "S2").map((x) => { const b = werkzeugAuf(bausteinFuer(x.wert), m); return b && String(b.folge ?? "").trim() ? { ende: x.ende === "B" ? "B" : "A", zeilen: folge(`1 ${bausteinFolge(b, m)}`) } : null; }).filter(Boolean).concat(doc.features.filter((x) => x.typ === "naht" && !x._aus).flatMap((x) => ["a", "b"].filter((s) => x[s]?.ziel === f.id && (x[s].key === "A" || x[s].key === "B")).map((s) => { const fo = nahtFolgen(x, m)[s]; if (!fo) return null; const hat = !/^0 /.test(fo.folge), flach = /^0 ([\d.]+)$/.exec(fo.folge.trim()), kuerzen = Math.max(0, -(fo.versatz || 0) - (flach ? +flach[1] : 0)); return hat || kuerzen ? { ende: x[s].key, zeilen: hat ? folge(`1 ${fo.folge}`) : [], kuerzen } : null; }).filter(Boolean))); // Rücksetzung des nicht abgesetzten Blechs auch an Blechprofilen (kuerzen)
}
const istProfil = (h) => h?.typ === "profil" || h?.typ === "vorlage" || h?.typ === "blech";
function kantenWert(w, m) { // Baustein bzw. Werkzeug der Kantenleiste → Wert für einen Schritt
  if (w.typ === "baustein") { const b = bausteinFuer(w.baustein); return w.seite === -1 ? { folge: folgeUmkehren(bausteinFolge(werkzeugAuf(b, m), m)), versatz: +b.versatz || 0 } : w.baustein; }
  const wk = { ...flanschStandard(w.typ), winkel: parseFloat($("kbWinkel").value) || 90, laenge: parseFloat($("kbLaenge").value) || (w.typ === "umschlag" ? 10 : 25), seite: w.seite, ...(w.typ === "umschlag" ? { saum: $("kbSaum").value } : { bezug: $("kbBezug").value, biegepos: $("kbPos").value }) }; return werkzeugNeu({ werkzeug: wk }, wk, m);
}
function wendeProfilKante(key) { // Schritt «Profilkante» in der Zeitleiste anlegen (live); key: A, B, S1:n oder S2:n (Stirnkante von Schenkel n)
  const [ende, nr] = String(key).split(":");
  const w = kantenWz, f = w?.f; if (!istProfil(f)) return status("Zuerst ein Blechprofil anklicken.");
  const m = material(f.material), titel = w.typ === "flansch" ? "Flansch" : w.typ === "umschlag" ? "Umschlag" : bausteinName(w.baustein);
  const stirn = ende === "S1" || ende === "S2", ort = stirn ? `Stirn ${ende === "S1" ? 1 : 2}, Schenkel ${nr}` : `Kante ${ende}`;
  const n = { id: neueId(), typ: "profilkante", name: `${titel} ${f.name} · ${ort}`, ziel: f.id, ende, wert: kantenWert(w, m), ...(stirn ? { schenkel: Math.max(0, Math.round(+nr || 0)) } : {}) };
  einfuegen(n); w.letzte = n; regen(); menueKante = { fid: f.id, key }; zeigeKanten();
  status(f._fehler ? "⚠ " + f._fehler : f._stirnFehler ? "⚠ " + f._stirnFehler : `${ort} von «${f.name}»${""}: «${titel}» angesetzt (Schritt in der Zeitleiste). Weitere Kante wählen oder «Fertig».`);
}
// ---- Quetschfalte (Ecke zweier Aufkantungen eines Flächenblechs) ----
let quetschWz = null; // { f } – Werkzeug aktiv: Ecke eines Flächenblechs anklicken
// Eckentlastung an Ecken mit zwei Flanschen: rund oder quadratisch um den Schnittpunkt der Biegelinien (Blech wird dort ausgeschnitten, auch in der Abwicklung)
function eckenEntlastung(f, bl, m, s) {
  const n = bl.gruppen.length, manuell = !!(f.eckEntl && f.eckEntl !== "keine"), form = manuell ? f.eckEntl : "rund", cuts = [], B = basis(blechEbene(s.ebene, f, m)); // ohne eigene Eckentlastung: runde Freistellung der Biegezone (Radius = Biegeradius + Blechstärke)
  bl._eckLoecher = [];
  for (let k = 0; k < n; k++) {
    const kv = (k - 1 + n) % n; if (bl.quetsch?.has(k) || !bl.gruppen[k].gerade || !bl.gruppen[kv].gerade) continue;
    const einfach = (p) => bl.profile[p]?.biegungen?.length === 1 && bl.profile[p]?.res; if (!einfach(k) || !einfach(kv)) continue;
    const V0 = bl.gruppen[k].punkte[0], dn = [bl.gruppen[k].punkte[1][0] - V0[0], bl.gruppen[k].punkte[1][1] - V0[1]], dl = Math.hypot(...dn), dnn = [dn[0] / dl, dn[1] / dl], pv = bl.gruppen[kv].punkte.at(-2), dpl = Math.hypot(pv[0] - V0[0], pv[1] - V0[1]), dp = [(pv[0] - V0[0]) / dpl, (pv[1] - V0[1]) / dpl];
    const beta = Math.atan2(dnn[0] * dp[1] - dnn[1] * dp[0], dnn[0] * dp[0] + dnn[1] * dp[1]); if (!(beta > 0)) continue; // nur Aussenecken
    const rBieg = (p) => { const b0 = bl.profile[p].biegungen[0]; return (b0.ri ?? bl.profile[p].ri ?? 1) + (bl.profile[p].t || m.t); }, r = manuell ? Math.max(0.2, +f.eckEntlMass || 2) : +f.freistellungMass > 0 ? +f.freistellungMass : Math.max(rBieg(k), rBieg(kv)), hoch = manuell ? 6 * m.t + 2 : 2 * (r - m.t / 2) + 0.2;
    const O3 = eckSchnitt2(V0, dnn, dp, quetschFlansch3D(bl, k).a, quetschFlansch3D(bl, kv).a), Of = eckSchnitt2(V0, dnn, dp, bl.profile[k].biegungen[0].abstand, bl.profile[kv].biegungen[0].abstand);
    const fr = manuell || f.ecken === "gehrung45" ? null : eckenFreiraum(V0, dnn, dp, m.t, +f.freistellungMass > 0 ? +f.freistellungMass : Math.max(rBieg(k), rBieg(kv))); // 90°-Schnittkanten: Viereck von der Innenecke bis zum Schnittpunkt der Biegelinien
    if (fr) {
      const sg = f.sichtseite === -1 ? -1 : 1, hy = Math.max(rBieg(k), rBieg(kv)) - m.t / 2 + 0.1, g2 = new THREE.CylinderGeometry(fr.r, fr.r, hy + m.t, 32); // rundes Loch über den Biegebereichen im Eck
      g2.rotateX(Math.PI / 2); g2.translate(fr.c[0], fr.c[1], sg === -1 ? -hy + (hy + m.t) / 2 : -m.t + (hy + m.t) / 2); g2.applyMatrix4(B); cuts.push(g2);
      const loch2 = Array.from({ length: 32 }, (_, i) => [fr.c[0] + fr.r * Math.cos((i / 32) * 2 * Math.PI), fr.c[1] + fr.r * Math.sin((i / 32) * 2 * Math.PI)]); loch2._auto = true; bl.abw.loecher = [...(bl.abw.loecher || []), loch2]; (bl._eckLoecher ||= []).push(loch2); continue;
    }
    const geo = form === "quadrat" ? new THREE.BoxGeometry(2 * r, 2 * r, hoch) : new THREE.CylinderGeometry(r, r, hoch, 24); if (form !== "quadrat") geo.rotateX(Math.PI / 2);
    const Z3 = manuell ? O3 : Of; geo.translate(Z3[0], Z3[1], 0); geo.applyMatrix4(B); cuts.push(geo);
    const poly = form === "quadrat" ? [[-r, -r], [r, -r], [r, r], [-r, r]] : Array.from({ length: 24 }, (_, i) => [r * Math.cos((i / 24) * 2 * Math.PI), r * Math.sin((i / 24) * 2 * Math.PI)]);
    const loch = poly.map(([x, y]) => [Of[0] + x, Of[1] + y]); if (!manuell) loch._auto = true; // automatische Freistellung: der exakte Kern schneidet sie selbst
    bl.abw.loecher = [...(bl.abw.loecher || []), loch]; (bl._eckLoecher ||= []).push(loch); // merken: «Abwickeln»/«Falten» bauen die Lochliste neu auf, die Eckfreistellung gehört in die Abwicklung
  }
  for (const o of modell.children.filter((o) => o.isMesh && o.userData.fid === `${f.id}:${bl.pi}`)) for (const g of cuts) verknuepfe(o, g, "ausschneiden");
}
// Flanschdaten im 3D (Mittellinie des Blechs): scharfe Linie = Schnitt der beiden Schenkel, Höhe bis zur Oberkante ab der scharfen Linie
function quetschFlansch3D(bl, p) {
  const pf = bl.profile[p].res.pfad, bg = pf.find((e) => e.typ === "bogen"), li = pf.filter((e) => e.typ === "linie")[1], d = [li.p2[0] - li.p1[0], li.p2[1] - li.p1[1]], L = Math.hypot(d[0], d[1]), phi = Math.abs(bg.winkel);
  const t = -li.p1[1] / (d[1] / L), xv = li.p1[0] + (d[0] / L) * t, tang = bg.rm * Math.tan(phi * Math.PI / 360); // x der scharfen Ecke im Profilquerschnitt (y = 0: Blechebene)
  return { leg: L, rm: bg.rm, phi, a: xv - 100 + (bl.profile[p].versatz || 0), h: L + tang };
}
// Ecke der scharfen Biegelinien im 3D und Flanschdaten beider Kanten
function quetschEcke3D(bl, k) {
  const n = bl.gruppen.length, kv = (k - 1 + n) % n, q = bl.quetsch?.get(k); if (!q) return null;
  const A = quetschFlansch3D(bl, k), B = quetschFlansch3D(bl, kv), V = bl.gruppen[k].punkte[0];
  return { q, A, B, V, O: eckSchnitt2(V, q.dn, q.dp, A.a, B.a), kv };
}
function quetschGeo(z, f) {
  const [pi, k] = String(f.ecke).split(":").map(Number), bl = z._bleche?.find((b) => b.pi === pi); if (!bl) throw new Error("Die Ecke gibt es nicht mehr – neu wählen");
  if (bl.quetschFehler?.[k]) throw new Error(bl.quetschFehler[k]);
  const e3 = quetschEcke3D(bl, k); if (!e3) throw new Error("Die Ecke gibt es nicht mehr – neu wählen");
  const { q, A, B } = e3, seite = z.sichtseite === -1 ? -1 : 1, Zs = q.vz * seite, tausch = Zs < 0; // von der Rückseite gesehen vertauschen sich die Kanten
  const E1 = tausch ? q.dp : q.dn, [F1, F2] = tausch ? [B, A] : [A, B];
  const zus = quetschZuschnitt(q.beta, F1.h, F1.phi, F2.phi, null, F2.h); // 3D: Höhen bis zu den scharfen Kanten
  const Z3 = [0, 0, Zs], X3 = [E1[0], E1[1], 0], Y3 = [Z3[1] * X3[2] - Z3[2] * X3[1], Z3[2] * X3[0] - Z3[0] * X3[2], 0];
  return { zus, flach: q.z, O: e3.O, X3, Y3, Z3, pruefung: faltenPruefen(zus), wand: f.richtung === "rechts" ? "wand2" : "wand1", ri: Math.min(A.rm, B.rm) };
}
// Gefaltete Quetschfalte: zwei Blechlagen (2 t) hinter der Aussenfläche der Aufkantung; die Faltkante O–C' ist gerundet (geschlossener Saum, Innenradius 0 → Aussenradius t)
function quetschMeshes(z, f) {
  const q = f._q, m = material(z.material), B = basis(blechEbene(finde(z.skizze).ebene, z, m)), v = (a) => new THREE.Vector3(...a);
  const Mf = B.clone().multiply(new THREE.Matrix4().makeBasis(v(q.X3), v(q.Y3), v(q.Z3)).setPosition(q.O[0], q.O[1], 0)), sammle = [];
  const ms = quetschFaltMeshes(q.zus, q.wand, m.t, Mf, darstellungVon(z, m), f.id, sammle); f._qk = { desc: sammle, M: Mf, t: m.t }; return ms;
}
// Gefaltetes Dreieck mit gerundeten Kanten; M = Matrix vom Eckensystem (O, X3, Y3, Z3) in die Welt
function quetschFaltMeshes(zus, wand, t, M, farbe, fid, sammle = null) { // sammle: Teilkörper-Beschreibung für den exakten Kern (gleiche Rechnung wie das Netz)
  const q = { zus, wand }, tri = quetschDreieck(q.zus, q.wand), g = q.zus.geometrie;
  const v = (a) => new THREE.Vector3(...a), P = v(tri.P).sub(v(tri.O)), C = v(tri.C).sub(v(tri.O)), e = v(q.wand === "wand1" ? g.e1 : g.e2), d = v(q.wand === "wand1" ? g.d1 : g.d2);
  let n = new THREE.Vector3().crossVectors(e, d).normalize(); if (n.dot(new THREE.Vector3(Math.cos(g.beta * Math.PI / 360), Math.sin(g.beta * Math.PI / 360), 0)) > 0) n.negate(); // nach aussen
  const u = P.clone().normalize(), y = new THREE.Vector3().crossVectors(n, u), O2 = new THREE.Vector2(0, 0), P2 = new THREE.Vector2(P.dot(u), P.dot(y)), C2 = new THREE.Vector2(C.dot(u), C.dot(y));
  // Beide Kanten der Lasche sind Biegungen: die Faltkante O–C (geschlossener Saum) und die Kante O–P an der Ecklinie, an der die Lasche mit den Flanschen verbunden ist.
  // Jede Kante wird um den Radius r nach innen zurückversetzt, dort sitzt die Rundung (Radius r = t) – so bleibt die Gesamtausdehnung gleich und die Kanten sind rund.
  const lin = (A, Bp) => { const ed = Bp.clone().sub(A), en = ed.clone().normalize(), nm = new THREE.Vector2(-en.y, en.x); return { A, Bp, en, nm, ed }; };
  const fold = lin(O2, C2), eps = lin(O2, P2), schn = (a, b, c0, d0) => { const w = b.clone().sub(a), x = d0.clone().sub(c0), den = w.x * x.y - w.y * x.x; if (Math.abs(den) < 1e-12) return null; const tt = ((c0.x - a.x) * x.y - (c0.y - a.y) * x.x) / den; return a.clone().addScaledVector(w, tt); };
  const zuSeite = (l, P) => (l.nm.dot(P.clone().sub(l.A)) < 0 ? l.nm.clone().negate() : l.nm.clone()); // Normale zur Dreiecksseite hin
  const dF = zuSeite(fold, P2).dot(P2.clone().sub(O2)), dE = zuSeite(eps, C2).dot(C2.clone().sub(O2)), r = Math.min(t, dF * 0.3, dE * 0.3);
  // Die Dreiecksflächen beginnen erst dort, wo die Biegungen an der Ecklinie enden (90°-Biegung und 180°-Saum): Abstand der Anschlusskante von der Ecklinie
  let aStart = r;
  { const an = quetschAnschluss(g, q.wand, t); if (an) aStart = Math.max(an.aK, r); }
  aStart = Math.min(aStart, dE * 0.45);
  const nF = zuSeite(fold, P2).multiplyScalar(r), nE = zuSeite(eps, C2).multiplyScalar(aStart);
  const fA = O2.clone().add(nF), fB = C2.clone().add(nF), eA = O2.clone().add(nE), eB = P2.clone().add(nE);
  const Oi = schn(fA, fB, eA, eB) || O2, Pi = schn(eA, eB, P2, C2) || P2, Ci = schn(fA, fB, P2, C2) || C2;
  const mk = (geo, lage) => { geo.applyMatrix4(lage); geo.applyMatrix4(M); return koerperAusGeo(geo, farbe, fid); };
  const aussen = new THREE.Matrix4().makeBasis(u, y, n).setPosition(n.clone().multiplyScalar(t / 2));
  const koerper = new THREE.ExtrudeGeometry(new THREE.Shape([Oi, Pi, Ci]), { depth: 2 * t, bevelEnabled: false }), meshes = [mk(koerper, aussen)];
  sammle?.push({ art: "extr", shape: new THREE.Shape([Oi, Pi, Ci]), lage: aussen.clone(), tiefe: 2 * t, mitre: null });
  // Anschluss an den anderen Flansch: Kante O–P (Ecklinie) ist eine Biegung (meist 90°), die das Blech aus dem Flansch B auf die Lage der Falte führt
  let biegeStueck = null, biegeTeile = [];
  try {
    const eB = v(q.wand === "wand1" ? g.e2 : g.e1), eA = v(q.wand === "wand1" ? g.e1 : g.e2), uV = v(g.eps).normalize();
    const ayV = eA.clone().addScaledVector(uV, -eA.dot(uV)).normalize(), wB = eB.clone().addScaledVector(uV, -eB.dot(uV)).normalize(), dBa = wB.dot(ayV), dBb = wB.dot(n);
    if (dBb < -0.05) {
      const R = Math.max(t, 0.5) * 1.5, u1 = [-dBa, -dBb], len = Math.hypot(...u1); u1[0] /= len; u1[1] /= len;
      const bt = 2 * t, sk = bt / u1[1], S = [u1[0] * sk, bt]; // Schnitt der Mittelfläche von Flansch B (durch die Ecklinie) mit der äusseren Lage der Falte
      const cosT = u1[0], th = Math.acos(Math.max(-1, Math.min(1, cosT))), tl = R * Math.tan(th / 2), z = u1[0] * 0 - u1[1] * 1, links = z > 0;
      const nrm = links ? [-u1[1], u1[0]] : [u1[1], -u1[0]], P1 = [S[0] - tl * u1[0], S[1] - tl * u1[1]], K = [P1[0] + R * nrm[0], P1[1] + R * nrm[1]];
      const a0 = Math.atan2(P1[1] - K[1], P1[0] - K[0]), a1 = a0 + (links ? th : -th), Ro = R + t / 2, Ri = Math.max(0.01, R - t / 2), cw = !links;
      if (th > 0.05 && Number.isFinite(K[0] + K[1])) {
        const sh = new THREE.Shape(); sh.moveTo(K[0] + Ro * Math.cos(a0), K[1] + Ro * Math.sin(a0)); sh.absarc(K[0], K[1], Ro, a0, a1, cw);
        sh.lineTo(K[0] + Ri * Math.cos(a1), K[1] + Ri * Math.sin(a1)); sh.absarc(K[0], K[1], Ri, a1, a0, !cw); sh.closePath();
        const geoR = new THREE.ExtrudeGeometry(sh, { depth: P.length(), bevelEnabled: false, curveSegments: 16 });
        const lageR = new THREE.Matrix4().makeBasis(ayV, n, uV), dC = C.clone().normalize(), mV = uV.clone().sub(dC), mitre = (gq) => { // Gehrung an der Ecke O: Anfangsfläche liegt in der Ebene durch O, die den Winkel zwischen Ecklinie und Faltkante halbiert (kein Überstand über die Dreiecksspitze)
          if (mV.length() < 1e-6) return; mV.normalize(); const ps = gq.attributes.position, w = new THREE.Vector3(), den = uV.dot(mV); if (Math.abs(den) < 1e-6) return;
          for (let i = 0; i < ps.count; i++) { w.fromBufferAttribute(ps, i); const d = w.dot(mV); if (d < 0) { w.addScaledVector(uV, -d / den); ps.setXYZ(i, w.x, w.y, w.z); } } ps.needsUpdate = true; },
        dazu = (shape) => { sammle?.push({ art: "extr", shape, lage: lageR.clone(), tiefe: P.length(), mitre: (() => { const mm = mV.clone(); if (mm.length() < 1e-6) return null; mm.normalize(); return Math.abs(uV.dot(mm)) < 1e-6 ? null : mm; })() }); const gq = new THREE.ExtrudeGeometry(shape, { depth: P.length(), bevelEnabled: false, curveSegments: 16 }); gq.applyMatrix4(lageR); mitre(gq); gq.applyMatrix4(M); biegeTeile.push(koerperAusGeo(gq, farbe, fid)); };
        sammle?.push({ art: "extr", shape: sh, lage: lageR.clone(), tiefe: P.length(), mitre: (() => { const mm = mV.clone(); if (mm.length() < 1e-6) return null; mm.normalize(); return Math.abs(uV.dot(mm)) < 1e-6 ? null : mm; })() });
        geoR.applyMatrix4(lageR); mitre(geoR); geoR.applyMatrix4(M); biegeStueck = koerperAusGeo(geoR, farbe, fid);
        // Ende von Flansch B: Gehrungsschnitt durch die Innenkante der Ecklinie – von dort läuft das Blech gerade bis zum Beginn der Biegung
        let pB = [-dBb, dBa]; if (pB[0] < 0) pB = [-pB[0], -pB[1]];
        const sE = (-t / 2 - (t / 2) * pB[1]) / dBb, lamE = -sE, lamP = sk - tl, aI = (t / 2) * pB[0] + sE * dBa;
        if (lamP - lamE > 0.01) { const pt = (lam, sg) => [lam * u1[0] + sg * (t / 2) * pB[0], lam * u1[1] + sg * (t / 2) * pB[1]], sq = new THREE.Shape(); sq.moveTo(...pt(lamE, -1)); sq.lineTo(...pt(lamE, 1)); sq.lineTo(...pt(lamP, 1)); sq.lineTo(...pt(lamP, -1)); sq.closePath(); dazu(sq); }
        // Flansch A, auf dem die Falte liegt: sein Ende wird um 180° (geschlossener Saum) auf die erste Lage der Falte zurückgebogen
        const aH = quetschAnschluss(g, q.wand, t).aK, hs = new THREE.Shape();
        // Mittelpunkt des Saums = Mittelpunkt der 90°-Biegung (konzentrisch)
        hs.moveTo(aH, -t / 2); hs.absarc(aH, t / 2, t, -Math.PI / 2, -1.5 * Math.PI, true); hs.closePath(); dazu(hs); // um eine Blechstärke nach innen: liegt im Hohlraum der 90°-Biegung
      }
    }
  } catch (e) { biegeStueck = null; }
  if (biegeStueck) meshes.push(biegeStueck, ...biegeTeile);
  if (r > 1e-6) for (const [a0, b0] of (biegeStueck ? [[Oi, Ci]] : [[Oi, Ci], [Oi, Pi]])) { // Wulst der Faltkante (und der Anschlusskante, falls keine Biegung berechnet werden konnte)
    const fold = a0 === Oi && b0 === Ci, ax = new THREE.Vector3(b0.x - a0.x, b0.y - a0.y, 0).normalize(), ext = fold ? 4 * t + a0.distanceTo(O2) : 0, a1 = a0.clone().addScaledVector(ax, -ext); // Wulst der Faltkante bis über die Ecke hinaus ziehen, dann an der Gehrung abschneiden
    const L = b0.distanceTo(a1), mitte = a1.clone().add(b0).multiplyScalar(0.5);
    const cyl = new THREE.CylinderGeometry(r, r, L, 16, 1, false); cyl.applyMatrix4(new THREE.Matrix4().makeRotationFromQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), ax)));
    cyl.translate(mitte.x, mitte.y, t); // Mitte der beiden Lagen (Dicke 2 t)
    if (fold) { // Gehrung an der Ecke O: gleiche Ebene wie bei der 90°-Biegung (halbiert den Winkel zwischen Ecklinie und Faltkante); der Überstand wird entlang der Faltkante auf die Ebene gezogen
      cyl.applyMatrix4(aussen); const uR = P.clone().normalize(), dR = C.clone().normalize(), mR = uR.clone().sub(dR);
      if (mR.length() > 1e-6) { mR.normalize(); const ps = cyl.attributes.position, w = new THREE.Vector3(), den = dR.dot(mR); if (Math.abs(den) > 1e-6) { for (let i = 0; i < ps.count; i++) { w.fromBufferAttribute(ps, i); const d = w.dot(mR); if (d > 0) { w.addScaledVector(dR, -d / den); ps.setXYZ(i, w.x, w.y, w.z); } } ps.needsUpdate = true; } }
      { // oberes Ende: parallel zur freien Oberkante des Dreiecks (P–C) abschneiden, damit die Wulst nicht darüber hinausragt
        const tk = C.clone().sub(P).normalize(), nTop = new THREE.Vector3().crossVectors(n, tk).normalize(); if (nTop.dot(P.clone().negate()) > 0) nTop.negate(); // zeigt vom Dreieck weg
        const ps = cyl.attributes.position, w = new THREE.Vector3(), axR = C.clone().normalize(), den = axR.dot(nTop);
        if (Math.abs(den) > 1e-6) { for (let i = 0; i < ps.count; i++) { w.fromBufferAttribute(ps, i); const d = w.clone().sub(P).dot(nTop); if (d > 0) { w.addScaledVector(axR, -d / den); ps.setXYZ(i, w.x, w.y, w.z); } } ps.needsUpdate = true; }
      }
      if (sammle) { const uR2 = P.clone().normalize(), dR2 = C.clone().normalize(), mR2 = uR2.clone().sub(dR2), mitreR = mR2.length() > 1e-6 && Math.abs(dR2.dot(mR2.clone().normalize())) > 1e-6 ? mR2.normalize() : null, tk2 = C.clone().sub(P).normalize(), nT2 = new THREE.Vector3().crossVectors(n, tk2).normalize(); if (nT2.dot(P.clone().negate()) > 0) nT2.negate();
        sammle.push({ art: "zyl", r, L, start: u.clone().multiplyScalar(a1.x).addScaledVector(y, a1.y).addScaledVector(n, t + t / 2), achse: u.clone().multiplyScalar(ax.x).addScaledVector(y, ax.y).normalize(), mitre: mitreR, top: { P: P.clone(), n: nT2 } }); }
      cyl.applyMatrix4(M); meshes.push(koerperAusGeo(cyl, farbe, fid)); continue;
    }
    meshes.push(mk(cyl, aussen));
  }
  return meshes;
}
const quetschEcken = (z) => (z._bleche || []).flatMap((bl) => bl.gruppen.map((g, k) => ({ key: `${bl.pi}:${k}`, p: g.punkte[0] })));
function zeigeQuetschEcken(z) {
  const s = finde(z.skizze), B = basis(blechEbene(s.ebene, z, material(z.material)));
  for (const e of quetschEcken(z)) { const w = new THREE.Vector3(e.p[0], e.p[1], 0).applyMatrix4(B); const r = new THREE.Mesh(new THREE.SphereGeometry(3, 12, 8), new THREE.MeshBasicMaterial({ color: 0x1d8fff, depthTest: false, transparent: true })); r.position.copy(w); r.renderOrder = 13; r.scale.setScalar(Math.max(1, kamera.position.distanceTo(w) / 120)); kantenZeiger.add(r); }
}
// Hinweisfenster für Werkzeuge ohne eigene Felder (gleiche Optik wie alle Werkzeugfenster)
let wkAbbruch = null;
function wkZeigen(titel, text, abbrechen) { $("wkTitel").textContent = titel; $("wkText").textContent = text; wkAbbruch = abbrechen; $("wkFenster").hidden = false; }
function wkZu() { $("wkFenster").hidden = true; wkAbbruch = null; }
document.addEventListener("click", (e) => { const b = e.target.closest?.(".dklein[data-gen]"); if (b) b.closest(".dialog").classList.toggle("klein"); });
$("wkAbbr").onclick = () => { const f = wkAbbruch; wkZu(); f?.(); status(""); };
function starteQuetschWz() {
  if (dlg) $("dAbbrechen").click(); if (skizze) return status("Erst die Skizze beenden.");
  const h = hauptVon(auswahl);
  if (istProfil(h) && !h.versteckt) {
    if (!stirnQuetschPunkte(h).length) return status("Quetschfalte am Blechprofil: braucht eine Stirnlasche mit einer Biegung (Flansch an der Stirn) neben einer einfachen Wand – erst «Flansch» an der Stirnkante setzen.");
    quetschWz = { f: h, art: "stirn" }; zeigeKanten(); wkZeigen("Quetschfalte", `Ecke von «${h.name}» anklicken (blaue Punkte): dort treffen Stirnlasche und Wand zusammen – der Überschuss wird gefaltet.`, endeQuetschWz); return status("Quetschfalte: Ecke anklicken – Esc bricht ab.");
  }
  if (h?.typ !== "flaeche" || h.versteckt) return starteBlechWahl("Quetschfalte", "Flächenblech mit Flanschen an zwei Kanten oder Blechprofil mit Stirnlasche", istBlechWahl, starteQuetschWz);
  quetschWz = { f: h, art: "quetsch" }; zeigeKanten(); wkZeigen("Quetschfalte", `Ecke des Flächenblechs «${h.name}» anklicken (blaue Punkte). Beide Nachbarkanten brauchen einen Flansch; Winkel und Höhe dürfen verschieden sein.`, endeQuetschWz); status("Quetschfalte: Ecke anklicken – Esc bricht ab.");
}
function starteEndeWz() {
  if (dlg) $("dAbbrechen").click(); if (skizze) return status("Erst die Skizze beenden.");
  const h = hauptVon(auswahl); if (h?.typ !== "flaeche" || h.versteckt) return starteBlechWahl("Flanschende", "Flächenblech mit Flansch", (x) => x.typ === "flaeche" && istBlechWahl(x), starteEndeWz);
  quetschWz = { f: h, art: "ende" }; zeigeKanten(); wkZeigen("Flanschende", `Ecke des Flächenblechs «${h.name}» anklicken (blaue Punkte): dort lässt sich das Ende des Flansches an einer der beiden Kanten ändern – rechtwinklig, bündig zur Nachbarkante oder mit Winkel, verlängern oder kürzen.`, endeQuetschWz); status("Flanschende: Ecke anklicken – Esc bricht ab.");
}
// Ecken eines Blechprofils, an denen eine Quetschfalte möglich ist (Stirnlasche + Wand), mit Lage im Raum
function stirnQuetschPunkte(f) {
  const kl = f._kernLage, zw = zweiseitig(f, "laenge", "laenge2"); if (!kl || !f._stirn?.length || f.versteckt) return [];
  const rueck = rueckVersatz(zw.richtung, zw.tiefe), B = basis(kl.ebene), out = [];
  for (const k of stirnQuetschKandidaten(f._res, f._stirn)) {
    try { const q = stirnQuetsch(f._res, f._stirn, k, laengeVon(f)), zO = (k.ende === "S1" ? -rueck : zw.tiefe - rueck) - q.sgIn * q.us; const p = new THREE.Vector3(q.S[0] + kl.versatz[0], q.S[1] + kl.versatz[1], zO).applyMatrix4(B), L = lageVon(f); if (L) p.applyMatrix4(L); out.push({ ...k, p }); } catch {}
  }
  return out;
}
function zeigeStirnQuetschPunkte(f) {
  for (const e of stirnQuetschPunkte(f)) { const r = new THREE.Mesh(new THREE.SphereGeometry(3, 12, 8), new THREE.MeshBasicMaterial({ color: 0x1d8fff, depthTest: false, transparent: true })); r.position.copy(e.p); r.renderOrder = 13; r.userData.bildschirm = 0.008; kantenZeiger.add(r); }
}
function stirnQuetschDialog(f) {
  featureDialog(f, false, (ff) => [{ id: "name", label: "Name", text: true, wert: ff.name }, { id: "wand", label: "Falte liegt auf", optionen: [["lasche", "der Stirnlasche"], ["wand", "der Wand"]], wert: ff.wand || "lasche" }],
    (ff, w) => { if (w.name != null) ff.name = w.name; if (w.wand) ff.wand = w.wand; }, "Quetschfalte (Stirn)", "Der Überschuss an der Ecke zwischen Stirnlasche und Wand wird an seiner Winkelhalbierenden 180° gefaltet und liegt auf der gewählten Fläche. Die Abwicklung (DXF) enthält den Überschuss mit Faltlinie.",
    { info: () => (f._fehler ? "⚠ " + f._fehler : "") });
}
// ------------------------------------------------------------ Verbindungsnähte (Naht)
// Kante eines Blechs: Flächenblech «pi:k» (auch gebogene Kanten) oder Blechprofil «A» / «B»; Rückgabe { punkte: [Vector3], normale (Sichtseite) }
// Freie Körperkante (Schlüssel «E:x,y,z;x,y,z»): beliebige Kante eines Blechkörpers. Die anliegende Blechfläche (grösste Höhe senkrecht zur Kante) liefert Normale und die Richtung in das Blech hinein.
function freieKante(s) {
  const f = finde(s?.ziel); if (!f || !String(s.key).startsWith("E:")) return null;
  const mat = material(f.material || doc.features.find((x) => x.material)?.material), t = mat?.t || 0.7;
  const meshes = modell.children.filter((o) => o.isMesh && hauptVon(o.userData.fid)?.id === f.id && !o.userData.nahtFahne && !o.userData.naht);
  let [a, b] = s.key.slice(2).split(";").map(zahl3).map((p) => new THREE.Vector3(...p));
  const suche = (a, b) => { // alle anliegenden Flächen der Kante (je Normale die grösste Ausdehnung quer zur Kante)
    const e = b.clone().sub(a), L = e.length(); if (L < 1e-6) return []; e.divideScalar(L); const gruppen = new Map();
    for (const m of meshes) {
      const P = m.geometry.attributes.position, idx = m.geometry.index, n = idx ? idx.count : P.count, vert = (i) => new THREE.Vector3().fromBufferAttribute(P, idx ? idx.getX(i) : i);
      for (let i = 0; i + 2 < n; i += 3) {
        const v = [vert(i), vert(i + 1), vert(i + 2)], ia = v.findIndex((q) => q.distanceTo(a) < 2e-3), ib = v.findIndex((q) => q.distanceTo(b) < 2e-3); if (ia < 0 || ib < 0 || ia === ib) continue;
        const c = v[3 - ia - ib], w = c.clone().sub(a), quer = w.clone().addScaledVector(e, -w.dot(e)), h = quer.length(); if (h < 1e-6) continue;
        const nrm = new THREE.Vector3().subVectors(v[1], v[0]).cross(new THREE.Vector3().subVectors(v[2], v[0])).normalize(), key = nrm.toArray().map((x) => Math.round(x * 20)).join(","), alt = gruppen.get(key);
        if (!alt || h > alt.h) gruppen.set(key, { h, quer: quer.normalize(), nrm, fid: String(m.userData.fid) });
      }
    }
    return [...gruppen.values()];
  };
  let flaechen = suche(a, b);
  if (!flaechen.length) { // Kante nach einer Änderung nicht mehr genau da: die nächstliegende Körperkante desselben Blechs nehmen (die Naht darf nicht verschwinden)
    let nah = null, bd = 6;
    for (const m of meshes) { const pos = m.children[0]?.geometry.attributes.position; if (!pos) continue; for (let i = 0; i + 1 < pos.count; i += 2) { const p = new THREE.Vector3().fromBufferAttribute(pos, i), q = new THREE.Vector3().fromBufferAttribute(pos, i + 1), d1 = p.distanceTo(a) + q.distanceTo(b), d2 = p.distanceTo(b) + q.distanceTo(a), d = Math.min(d1, d2) / 2; if (d < bd) { bd = d; nah = d1 <= d2 ? [p, q] : [q, p]; } } }
    if (nah) { [a, b] = nah; flaechen = suche(a, b); }
  }
  if (!flaechen.length) return null;
  // Aussenrichtung jeder Fläche über die Innen/Aussen-Prüfung (Strahl, ungerade Trefferzahl = im Körper), nicht über die Dreiecksreihenfolge
  const rc = new THREE.Raycaster(), alteSeite = meshes.map((m) => m.material?.side); meshes.forEach((m) => { if (m.material) m.material.side = THREE.DoubleSide; });
  const dir = new THREE.Vector3(0.3713, 0.5412, 0.7565).normalize(), imKoerper = (p) => { rc.set(p, dir); rc.far = 1e5; return rc.intersectObjects(meshes, false).filter((h) => h.distance > 1e-5).length % 2 === 1; };
  const kand = [];
  try {
    for (const fl of flaechen) {
      const flaechig = fl.h > 1.6 * t, p0 = a.clone().add(b).multiplyScalar(0.5).addScaledVector(fl.quer, Math.min(fl.h * 0.4, flaechig ? 3 : t * 0.4)); // Punkt auf der Fläche
      let nout = fl.nrm.clone(); const innen = imKoerper(p0.clone().addScaledVector(nout, -0.03)), aussen = imKoerper(p0.clone().addScaledVector(nout, 0.03));
      if (innen !== aussen && !innen) nout.negate(); // Winkelhalbierend: nout muss nach aussen zeigen (innen im Körper, aussen davor)
      if (flaechig) kand.push({ art: "flaeche", h: fl.h, normale: nout, inn: fl.quer.clone(), mid: a.clone().addScaledVector(nout, -t / 2), fid: fl.fid });
      else kand.push({ art: "stirn", h: fl.h, normale: fl.quer.clone(), inn: nout.clone().negate(), mid: a.clone().addScaledVector(fl.quer, t / 2), fid: fl.fid }); // Stirnfläche: Blech liegt hinter ihr, Blechmitte in der Mitte der Stirn
    }
  } finally { meshes.forEach((m, i) => { if (m.material) m.material.side = alteSeite[i]; }); }
  kand.sort((p, q) => (p.art === "flaeche" ? 0 : 1) - (q.art === "flaeche" ? 0 : 1) || q.h - p.h);
  const k0 = kand[0];
  return { punkte: [a, b], normale: k0.normale, inn: k0.inn, mid: k0.mid, f, frei: true, meshFid: k0.fid, kand, name: `${f.name} · Körperkante` };
}
// Beide Seiten einer Naht gemeinsam auflösen: bei freien Kanten (mehrere anliegende Flächen, z. B. an einer Stossecke) die Flächenpaarung wählen, bei der die Blechmitten an der Fuge zusammenliegen
function nahtPaar(x) {
  const ka = nahtKante(x.a), kb = nahtKante(x.b); if (!ka || !kb) return { a: ka, b: kb };
  const wahl = (k) => (k.kand?.length ? k.kand : [{ normale: k.normale, inn: k.inn, mid: k.mid || k.punkte[0].clone().add(k.punkte.at(-1)).multiplyScalar(0.5), fid: k.meshFid, art: "flaeche" }]);
  const mitte = (k, c) => (c.mid && k.kand ? c.mid.clone().add(k.punkte[1].clone().sub(k.punkte[0]).multiplyScalar(0.5)) : k.punkte[0].clone().add(k.punkte.at(-1)).multiplyScalar(0.5));
  let best = null;
  for (const ca of wahl(ka)) for (const cb of wahl(kb)) {
    const d = mitte(ka, ca).distanceTo(mitte(kb, cb)) + (ca.inn.dot(cb.inn) > 0.5 ? 5 : 0) /* beide Bleche laufen in dieselbe Richtung: kein sinnvolles Paar */ + (ca.art === "flaeche" ? 0 : 0.01) + (cb.art === "flaeche" ? 0 : 0.01) + (ca.normale.dot(cb.normale) > 0.999 && ca.art === "flaeche" && cb.art === "flaeche" ? 0.5 : 0);
    if (!best || d < best.d) best = { d, ca, cb };
  }
  const mit = (k, c) => ({ ...k, normale: c.normale, inn: c.inn, mid: c.mid, meshFid: c.fid ?? k.meshFid });
  return { a: ka.frei ? mit(ka, best.ca) : ka, b: kb.frei ? mit(kb, best.cb) : kb };
}
function nahtKante(s) {
  const f = finde(s?.ziel); if (!f || !s.key) return null;
  if (String(s.key).startsWith("E:")) return freieKante(s);
  if (f.typ === "flaeche" && f._bleche) {
    const [pi, k] = String(s.key).split(":").map(Number), bl = f._bleche.find((b) => b.pi === pi), g = bl?.gruppen[k], sk = finde(f.skizze); if (!g || !sk) return null;
    const E = E_(sk.ebene), LM = lageVon(f), sg = f.sichtseite === -1 ? -1 : 1, pk = g.punkte.map((p) => { const v = V(zuWelt(blechEbene(sk.ebene, f, material(f.material)), p)); return LM ? v.applyMatrix4(LM) : v; });
    const n = V(E.n).multiplyScalar(sg); if (LM) n.transformDirection(LM);
    const dE = pk.at(-1).clone().sub(pk[0]).normalize(), nE = V(E.n); if (LM) nE.transformDirection(LM); const inn = nE.clone().cross(dE).normalize(); // Richtung in die Blechfläche hinein (Umriss gegen den Uhrzeigersinn: links der Kante)
    let innEnde = inn, nEnde = n; // sitzt schon ein Flansch an der Kante, setzt die Naht an seinem Ende an: Richtung in den Flansch hinein (rückwärts entlang des letzten Schenkels)
    let lin = null, nb = 0; try { const kb = berechneKanten(f, true)[s.key], pr = kb ? bausteinProfil(werkzeugAuf(bausteinFuer(kb), material(f.material)), material(f.material)) : null; lin = pr?.res?.pfad?.filter((e) => e.typ === "linie").at(-1); nb = pr?.biegungen?.length || 0; } catch { /* ohne Flansch */ } // Flansch ohne die Naht selbst
    if (lin && nb) { const dx = lin.p2[0] - lin.p1[0], dy = lin.p2[1] - lin.p1[1], l = Math.hypot(dx, dy) || 1; innEnde = inn.clone().multiplyScalar(dx / l).sub(n.clone().multiplyScalar(dy / l)).normalize(); nEnde = inn.clone().multiplyScalar(dy / l).add(n.clone().multiplyScalar(dx / l)).normalize(); /* Blechnormale am Ende des Flansches */ /* Fortsetzung c = dx·(−inn) + dy·n zeigt nach aussen, in den Flansch hinein: −c */ }
    return { punkte: pk, normale: nEnde, inn: innEnde, f, name: `${f.name} · ${kantenName(f, s.key)}` };
  }
  if (f.typ === "rundblech" && (s.key === "N0" || s.key === "N1") && !f._fehler) { // Längsnaht am Rohr/Kegel: Rand der Abwicklung bei Winkel 0 bzw. Endwinkel
    const E = E_(f.ebene), M = new THREE.Matrix4().makeBasis(V(E.v), V(E.n), V(E.u)).setPosition(V(E.o)), phi = (Math.min(360, f.winkel || 360) * Math.PI) / 180, w = s.key === "N1" ? phi : 0, r1 = f.d1 / 2, r2 = (f.art === "zylinder" ? f.d1 : f.d2) / 2;
    const p = (r, h) => new THREE.Vector3(r * Math.sin(w), h, r * Math.cos(w)).applyMatrix4(M), n = new THREE.Vector3(Math.sin(w), 0, Math.cos(w)).transformDirection(M), LM = lageVon(f);
    const pk = [p(r1, 0), p(r2, f.h)]; if (LM) { pk.forEach((v) => v.applyMatrix4(LM)); n.transformDirection(LM); }
    const inn = new THREE.Vector3(Math.cos(w) * (s.key === "N1" ? -1 : 1), 0, -Math.sin(w) * (s.key === "N1" ? -1 : 1)).transformDirection(M); if (LM) inn.transformDirection(LM); // tangential in den Mantel hinein
    return { punkte: pk, normale: n, inn, f, name: `${f.name} · Längsnaht ${s.key === "N1" ? "Ende" : "Anfang"}` };
  }
  if (istProfil(f) && (s.key === "A" || s.key === "B")) {
    const e = profilKanten(f).find((x) => x.key === s.key), kl = f._kernLage, el = f._res?.pfad; if (!e || !kl || !el?.length) return null;
    const seg = s.key === "A" ? el[0] : el.at(-1), d = [seg.p2[0] - seg.p1[0], seg.p2[1] - seg.p1[1]], l = Math.hypot(...d) || 1, M = basis(kl.ebene), n = new THREE.Vector3(-d[1] / l, d[0] / l, 0).transformDirection(M);
    const inn = new THREE.Vector3((s.key === "A" ? d[0] : -d[0]) / l, (s.key === "A" ? d[1] : -d[1]) / l, 0).transformDirection(M); // in den Blechkörper hinein
    return { punkte: [e.p[0].clone(), e.p[1].clone()], normale: n, inn, f, name: `${f.name} · Kante ${s.key}` };
  }
  return null;
}
// Alle wählbaren Kanten (sichtbare Flächenbleche und Blechprofile)
function nahtKandidaten() {
  const out = [];
  for (const f of doc.features) {
    if (f._aus || f.versteckt) continue;
    if (f.typ === "flaeche" && f._bleche) for (const bl of f._bleche) bl.gruppen.forEach((_, k) => { const s = { ziel: f.id, key: `${bl.pi}:${k}` }, e = nahtKante(s); if (e) out.push({ ...s, ...e }); });
    else if (istProfil(f)) for (const key of ["A", "B"]) { const s = { ziel: f.id, key }, e = nahtKante(s); if (e) out.push({ ...s, ...e }); }
    else if (f.typ === "rundblech") for (const key of ["N0", "N1"]) { const s = { ziel: f.id, key }, e = nahtKante(s); if (e) out.push({ ...s, ...e }); }
  }
  return out;
}
// Punktnaht an einer freien Körperkante: Fahne als eigener Körper entlang der Kante (Querschnitt aus dem Kantenbaustein, nicht an Umrisskanten gebunden)
function nahtFahneDaten(f, seite) {
  if (f.art !== "punkt" && f.art !== "falz") return null;
  const bent = f.absetz === "a" ? "a" : "b", andere = seite === "a" ? "b" : "a"; if (f.art === "punkt" && seite !== bent) return null; // Punktnaht: nur das abgekantete Blech bekommt eine Fahne
  if (!String(f[seite]?.key).startsWith("E:")) return null;
  const paar = nahtPaar(f), ke = paar[seite], ko = paar[andere]; if (!ke || !ko) return null;
  const m = material(ke.f.material || doc.features.find((x) => x.material)?.material), t = m.t, w = nahtWinkelAuto(f);
  const e = ke.punkte[1].clone().sub(ke.punkte[0]), L = e.length(); e.normalize();
  const c = ke.inn.clone().negate(), v = e.clone().cross(c).normalize(), spiegel = v.dot(ke.normale) < 0; // Querschnitt-y soll zur Blechnormale zeigen, sonst Winkel/Richtung spiegeln
  const w2 = w ? { a: spiegel ? -w.a : w.a, b: spiegel ? -w.b : w.b } : null, nf = nahtFolgen({ ...f, richtung: spiegel ? (f.richtung === "unten" ? "oben" : "unten") : f.richtung }, m, w2)[seite]; if (!nf) return null;
  const mid = (ke.mid || ke.punkte[0].clone().addScaledVector(ke.normale, -t / 2)).clone(); // Blechmitte an der Kante
  const q = bausteinQuerschnitt({ name: "n", folge: nf.folge, versatz: nf.versatz || 0 }, m); if (!q) return null;
  return { seite, m, t, L, e, c, v, mid, folge: nf.folge, versatz: nf.versatz || 0, profil: q.profil, host: ke.f.id, hostFid: ke.meshFid, a: ke.punkte[0].clone(), b: ke.punkte[1].clone(), inn: ke.inn.clone(), nrm: ke.normale.clone(), zugabe: (() => { try { return bausteinProfil({ name: "n", folge: nf.folge, versatz: nf.versatz || 0 }, m); } catch { return null; } })() };
}
function nahtFahneMesh(f, fd) {
  const poly = profilPolygon(fd.profil), shape = new THREE.Shape(poly.map(([x, y]) => new THREE.Vector2(x, y)));
  const geo = new THREE.ExtrudeGeometry(shape, { depth: fd.L, bevelEnabled: false, curveSegments: 12 });
  geo.applyMatrix4(new THREE.Matrix4().makeBasis(fd.c, fd.v, fd.e).setPosition(fd.mid));
  const o = koerperAusGeo(geo, darstellungVon(finde(fd.host), fd.m), fd.hostFid); o.userData.nahtFahne = f.id; return o; // Teil des Blechs: gleiche Kennung wie der Blechkörper
}
// Die Fahne gehört zum Blech: in der Abwicklung als Lappen am Rand des Zuschnitts (Breite = Kantenlänge, Tiefe = Zugabe des Bausteins), mit Biegelinie
function nahtFahneAbwicklung(f, fd) {
  f._abwHinweis = null;
  const z = finde(fd.host); if (z?.typ !== "flaeche" || !z._bleche) return; // nur Flächenbleche haben diese Abwicklung
  const pi = +String(fd.hostFid).split(":")[1], bl = z._bleche.find((b) => b.pi === pi) || z._bleche[0], sk = finde(z.skizze), m = material(z.material), sg = z.sichtseite === -1 ? -1 : 1, t = m.t, hint = (x) => { f._abwHinweis = x; };
  if (!bl || !sk || !(fd.zugabe?.zugabe > 0)) return hint("Fahne nicht in der Abwicklung (keine Zugabe)");
  const B = basis(blechEbene(sk.ebene, z, m)), LM = lageVon(z), Binv = B.clone().invert(), LMinv = LM ? LM.clone().invert() : null;
  const flach = (P) => { // Weltpunkt auf dem Blech → Punkt der Abwicklung (Skizzenkoordinaten)
    const q = P.clone(); if (LMinv) q.applyMatrix4(LMinv); q.applyMatrix4(Binv); const h = q.z * sg;
    if (Math.abs(q.z) <= t / 2 + 0.02) return [q.x, q.y]; // auf der Platte
    let best = null;
    bl.gruppen.forEach((g, k) => { const pr = bl.profile[k]; if (!g.gerade || !pr?.res || !pr.biegungen?.length) return;
      const a = g.punkte[0], b = g.punkte.at(-1), L = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1, d = [(b[0] - a[0]) / L, (b[1] - a[1]) / L], no = [d[1], -d[0]], sx = (q.x - a[0]) * d[0] + (q.y - a[1]) * d[1], out = (q.x - a[0]) * no[0] + (q.y - a[1]) * no[1];
      if (sx < -5 || sx > L + 5) return;
      for (let u = 0; u <= pr.zugabe; u += 0.05) { const pp = profilPunkt(pr, u); if (!pp) continue; const dd = Math.hypot(pp.x - out, pp.y - h); if (!best || dd < best.dd) best = { dd, p: [a[0] + d[0] * sx + no[0] * u, a[1] + d[1] * sx + no[1] * u] }; } });
    return best && best.dd <= t + 0.4 ? best.p : null;
  };
  const A = flach(fd.a), Bp = flach(fd.b); if (!A || !Bp) return hint("Fahne nicht in der Abwicklung (Kante liegt nicht auf Platte oder Flansch einer Umrisskante)");
  const U = bl.abw.umriss, n = U.length, D = fd.zugabe.zugabe, flaecheU = U.reduce((acc, p, i) => { const r = U[(i + 1) % n]; return acc + p[0] * r[1] - r[0] * p[1]; }, 0);
  const abst = (P, S, E) => { const dx = E[0] - S[0], dy = E[1] - S[1], l2 = dx * dx + dy * dy || 1e-12, u = Math.max(0, Math.min(1, ((P[0] - S[0]) * dx + (P[1] - S[1]) * dy) / l2)); return Math.hypot(P[0] - (S[0] + u * dx), P[1] - (S[1] + u * dy)); };
  for (let i = 0; i < n; i++) {
    const S = U[i], E = U[(i + 1) % n]; if (abst(A, S, E) > 0.35 || abst(Bp, S, E) > 0.35) continue;
    const L = Math.hypot(E[0] - S[0], E[1] - S[1]), u = [(E[0] - S[0]) / L, (E[1] - S[1]) / L], aus = flaecheU > 0 ? [u[1], -u[0]] : [-u[1], u[0]], sa = (A[0] - S[0]) * u[0] + (A[1] - S[1]) * u[1], sb = (Bp[0] - S[0]) * u[0] + (Bp[1] - S[1]) * u[1];
    const [P1, P2] = sa <= sb ? [A, Bp] : [Bp, A], ausP = (P, d) => [P[0] + aus[0] * d, P[1] + aus[1] * d];
    bl.abw.umriss = [...U.slice(0, i + 1), P1, ausP(P1, D), ausP(P2, D), P2, ...U.slice(i + 1)];
    const bg = fd.zugabe.biegungen?.[0]; if (bg) bl.abw.linien.push({ kante: -1, nr: bg.nr || 1, art: bg.art || "Abkanten", punkte: [ausP(P1, bg.abstand), ausP(P2, bg.abstand)], nahtFahne: f.id });
    const gr = grenzen(bl.abw.umriss.map(bl.abw.dreh)); bl.abw.laenge = gr.x1 - gr.x0; bl.abw.breite = gr.y1 - gr.y0; bl.abw.flaeche = Math.abs(bl.abw.umriss.reduce((acc, p, j, arr) => { const r = arr[(j + 1) % arr.length]; return acc + p[0] * r[1] - r[0] * p[1]; }, 0)) / 2e6;
    const tl = z._teile?.find((x) => x._blech === bl); if (tl) { tl.laenge = +bl.abw.laenge.toFixed(1); if (tl._res) tl._res.zuschnitt = bl.abw.breite; }
    return;
  }
  hint("Fahne nicht in der Abwicklung (Kante liegt nicht am Rand des Zuschnitts)");
}
// Schweissraupe (Stumpf-/Kehlnaht) entlang der Kante von Blech A
function nahtEckDaten(f) { // Ecknaht (Kehlnaht): Dreieck in der Fuge zwischen beiden Blechen, entlang der Kante von Blech A (Teilstück möglich)
  const { a: ka, b: kb } = nahtPaar(f); if (!ka || !kb || !ka.inn || !kb.inn) return null;
  const t = material(ka.f.material || doc.features.find((x) => x.material)?.material).t, { b: leg } = raupeMasse(f, t), sg = f.seite === "unten" ? -1 : 1;
  let p0 = ka.punkte[0].clone(), p1 = ka.punkte.at(-1).clone(); const e = p1.clone().sub(p0), L0 = e.length(); if (L0 < 1e-6) return null; e.divideScalar(L0);
  if (f.a?.teil && ka.punkte.length === 2) { const [v, bis] = [f.a.teil.von, f.a.teil.bis]; p1 = p0.clone().addScaledVector(e, bis); p0 = p0.clone().addScaledVector(e, v); }
  const nA = ka.normale.clone(), uA = ka.inn.clone(), uB = kb.inn.clone(), apex = p0.clone().addScaledVector(nA, sg * t / 2);
  const x = uA.clone(), v = e.clone().cross(x).normalize(), hoehe = p1.distanceTo(p0);
  let pts = [[0, 0], [leg, 0], [leg * uB.dot(x), leg * uB.dot(v)]];
  if (Math.abs(leg * leg * (uB.dot(v))) < 1e-3 * leg * leg) { const hoch = v.dot(nA) * sg >= 0 ? 1 : -1; pts = [[-leg / 2, 0], [leg / 2, 0], [0, hoch * leg / 2]]; } // Bleche in einer Ebene (Stossnaht): flaches Dreieck auf der Fuge
  const fl = pts[0][0] * pts[1][1] - pts[1][0] * pts[0][1] + pts[1][0] * pts[2][1] - pts[2][0] * pts[1][1] + pts[2][0] * pts[0][1] - pts[0][0] * pts[2][1]; if (fl < 0) pts = pts.reverse();
  if (Math.abs(fl) < 1e-6) return null;
  return { pts, x, v, e, apex, L: hoehe, ebene: { ursprung: apex.toArray(), x: x.toArray(), n: e.toArray() }, profil: { start: pts[0], segmente: [{ bis: pts[1] }, { bis: pts[2] }, { bis: pts[0] }] }, host: ka.f.id };
}
function nahtRaupe(f) {
  if (f.art === "ecke") { // Dreieck zwischen den Blechen
    const d = nahtEckDaten(f); f._eck = d; if (!d) return null;
    const shape = new THREE.Shape(d.pts.map(([u, w]) => new THREE.Vector2(u, w))), geo = new THREE.ExtrudeGeometry(shape, { depth: d.L, bevelEnabled: false });
    geo.applyMatrix4(new THREE.Matrix4().makeBasis(d.x, d.v, d.e).setPosition(d.apex));
    const mesh = koerperAusGeo(geo, 0x7d8288, f.id); mesh.userData.naht = true; return mesh;
  }
  f._eck = null;
  const e = nahtKante(f.a); if (!e) return null;
  const t = material(e.f.material).t, { b, h } = raupeMasse(f, t), sg = f.seite === "unten" ? -1 : 1; let pts = e.punkte.map((p) => p.toArray());
  if (f.a?.teil && pts.length === 2) { const [p0, p1] = pts, L = Math.hypot(p1[0] - p0[0], p1[1] - p0[1], p1[2] - p0[2]) || 1, lerp = (u) => p0.map((v, i) => v + (p1[i] - v) * u / L); pts = [lerp(f.a.teil.von), lerp(f.a.teil.bis)]; } // Teilstück: Raupe nur dort
  if (pts.length === 2) { // gerade Kante: Raupe auch als exakter Körper (Linsenquerschnitt, Bogen)
    const T = new THREE.Vector3(...pts[1]).sub(new THREE.Vector3(...pts[0])), Lr = T.length(); T.normalize();
    const N = e.normale.clone().multiplyScalar(sg).normalize(), Q = new THREE.Vector3().crossVectors(T, N).normalize();
    if (Lr > 1e-6) f._eck = { L: Lr, ebene: { ursprung: pts[0], x: Q.toArray(), n: T.toArray() }, profil: { start: [-b / 2, 0], segmente: [{ bis: [b / 2, 0], bogenMitte: [0, -h] }, { bis: [-b / 2, 0] }] }, host: e.f.id };
  }
  const arr = raupenNetz(pts, e.normale.clone().multiplyScalar(sg).toArray(), f.art, b, h), geo = new THREE.BufferGeometry(); geo.setAttribute("position", new THREE.BufferAttribute(arr, 3)); geo.computeVertexNormals();
  const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: 0x7d8288, metalness: 0.5, roughness: 0.45, side: THREE.DoubleSide })); mesh.userData.fid = f.id; mesh.userData.naht = true; return mesh;
}
let nahtWz = null; // { schritt: "blechA" | "kanteA" | "blechB" | "kanteB", blech: Blech-ID der aktuellen Seite, a: { ziel, key } | null }
const NAHT_TEXT = {
  blechA: "Schritt 1 von 4: Blech A anklicken (in der Ansicht oder im Browser).", kanteA: "Schritt 2 von 4: die Kante an Blech A anklicken (blaue Linien).",
  blechB: "Schritt 3 von 4: Blech B anklicken (in der Ansicht oder im Browser).", kanteB: "Schritt 4 von 4: die Kante an Blech B anklicken (blaue Linien).",
};
function nahtSchritt(schritt, blech = null) { // zeigt den Schritt im Naht-Fenster (Zeile unten) an; bei «blech…» nimmt auch der Browser eine Blechwahl entgegen
  nahtWz = { ...nahtWz, schritt, blech }; status("Naht: " + NAHT_TEXT[schritt].replace(/^Schritt \d von 4: /, ""));
  blechWahl = schritt.startsWith("blech") ? { filter: (h) => nahtKandidaten().some((k) => k.ziel === h.id), weiter: (h) => nahtBlechGewaehlt(h.id) } : null; zeigeKanten(); if (dlg?.info) $("dInfo").textContent = dlg.info();
}
function nahtBlechGewaehlt(id) {
  if (!nahtWz || !nahtWz.schritt.startsWith("blech")) return;
  nahtSchritt(nahtWz.schritt === "blechA" ? "kanteA" : "kanteB", id);
}
function starteNahtWz() {
  if (dlg) $("dAbbrechen").click(); if (skizze) return status("Erst die Skizze beenden.");
  if (!nahtKandidaten().length) return fehltDialog("Naht", "Keine Bleche mit wählbaren Kanten vorhanden – zuerst ein Flächenblech oder Blechprofil anlegen.");
  const n = { id: neueId(), typ: "naht", name: `Naht ${doc.features.filter((x) => x.typ === "naht").length + 1}`, a: { ziel: "", key: "" }, b: { ziel: "", key: "" }, ...nahtStandard("punkt") };
  nahtWz = { a: null, f: n }; nahtDialog(n, true); nahtSchritt("blechA"); // das Fenster öffnet sofort; Blech und Kante beider Seiten werden darin der Reihe nach gewählt
}
function endeNahtWz() { nahtWz = null; blechWahl = null; wkZu(); zeigeKanten(); }
// Kanten, die im aktuellen Schritt wählbar sind: nur die des gewählten Blechs (Schritt «kante…»), sonst keine
const nahtWaehlbar = () => (nahtWz?.schritt === "kanteA" || nahtWz?.schritt === "kanteB" ? nahtKandidaten().filter((k) => k.ziel === nahtWz.blech && !(nahtWz.a && nahtWz.a.ziel === k.ziel && nahtWz.a.key === k.key)) : []);
function zeigeNahtKanten() {
  const gewaehlt = (k) => nahtWz?.a && nahtWz.a.ziel === k.ziel && nahtWz.a.key === k.key;
  const frei = new Set(nahtWaehlbar().map((k) => k.ziel + "|" + k.key));
  for (const k of nahtKandidaten()) {
    if (!frei.has(k.ziel + "|" + k.key) && !gewaehlt(k)) continue; // in den Blechschritten keine Kanten, im Kantenschritt nur die des gewählten Blechs
    kantenZeiger.add(Object.assign(dickeLinie(k.punkte, gewaehlt(k) ? 0xff8a00 : 0x1d8fff, gewaehlt(k) ? 4 : 3, 13), { userData: { dicke: true } }));
  }
}
function nahtKlick(e) {
  const w = nahtWz;
  if (w.schritt.startsWith("blech")) { // Blech in der Ansicht anklicken
    strahl.setFromCamera(ndc(e), kamera);
    const t = strahl.intersectObjects(modell.children.filter((o) => o.isMesh), false)[0], h = t ? hauptVon(t.object.userData.fid) : null;
    if (!h || !nahtKandidaten().some((k) => k.ziel === h.id)) { status("Hier ist kein Blech mit Kanten – " + NAHT_TEXT[w.schritt]); return true; }
    nahtBlechGewaehlt(h.id); return true;
  }
  const sm = smPos(e); let best = null, bd = e.pointerType === "touch" ? 30 : 16;
  for (const k of nahtWaehlbar()) for (let i = 1; i < k.punkte.length; i++) { const A = aufSchirm(k.punkte[i - 1].toArray()), B = aufSchirm(k.punkte[i].toArray()); if (A[2] > 1 || B[2] > 1) continue; const d = abstandStrecke(sm, A, B); if (d < bd) { bd = d; best = k; } }
  for (const m of modell.children.filter((o) => o.isMesh && hauptVon(o.userData.fid)?.id === w.blech && !o.userData.naht)) { // jede beliebige Körperkante des gewählten Blechs (Flanschseiten, Gehrungskanten …)
    const pos = m.children[0]?.geometry.attributes.position; if (!pos) continue;
    for (let i = 0; i + 1 < pos.count; i += 2) {
      const a = [pos.getX(i), pos.getY(i), pos.getZ(i)], b = [pos.getX(i + 1), pos.getY(i + 1), pos.getZ(i + 1)], A = aufSchirm(a), B = aufSchirm(b); if (A[2] > 1 || B[2] > 1) continue;
      const d = abstandStrecke(sm, A, B) + 3; // gelistete Umrisskanten haben Vorrang
      if (d < bd) { const key = `E:${fmt3(a)};${fmt3(b)}`; if (nahtWz.a && nahtWz.a.ziel === w.blech && nahtWz.a.key === key) continue; bd = d; best = { ziel: w.blech, key }; }
    }
  }
  if (!best) { status("Eine Kante des gewählten Blechs anklicken (blaue Linien, auch jede andere Körperkante) – " + NAHT_TEXT[w.schritt]); return true; }
  if (w.schritt === "kanteA") { nahtWz.a = { ziel: best.ziel, key: best.key }; nahtSchritt("blechB"); return true; }
  const n = nahtWz.f; n.a = { ...nahtWz.a }; n.b = { ziel: best.ziel, key: best.key };
  endeNahtWz(); regen(); zeigeKanten(); if (dlg?.info) $("dInfo").textContent = dlg.info(); status(n._fehler ? "⚠ " + n._fehler : "Naht gesetzt – Art und Richtung im Fenster einstellen, dann OK."); return true;
}
// Vorschau beim Schweben/Überfahren in den Werkzeugen (Naht, Flansch/Umschlag/Kantenbaustein, Quetschfalte): das, was ein Antippen wählen würde, leuchtet orange auf (Stift-Schweben, Maus)
function hoverWerkzeug(e) {
  leeren(hoverGruppe); if (e.buttons) return;
  const linie = (pts) => hoverGruppe.add(Object.assign(dickeLinie(pts, 0xff8a00, 5, 20), { userData: { dicke: true } }));
  const blechAn = (h) => { for (const o of modell.children.filter((o) => o.isMesh && hauptVon(o.userData.fid)?.id === h.id && !o.userData.naht)) { const m = new THREE.Mesh(o.geometry, hoverMat()); m.matrixAutoUpdate = false; o.updateWorldMatrix(true, false); m.matrix.copy(o.matrixWorld); m.renderOrder = 19; hoverGruppe.add(m); } };
  const blechUnter = () => { strahl.setFromCamera(ndc(e), kamera); const t = strahl.intersectObjects(modell.children.filter((o) => o.isMesh), false)[0]; return t ? hauptVon(t.object.userData.fid) : null; };
  try {
    if (nahtWz) {
      if (nahtWz.schritt.startsWith("blech")) { const h = blechUnter(); if (h && nahtKandidaten().some((k) => k.ziel === h.id)) blechAn(h); return; }
      const sm = smPos(e); let best = null, bd = e.pointerType === "touch" ? 30 : 16;
      for (const k of nahtWaehlbar()) for (let i = 1; i < k.punkte.length; i++) { const A = aufSchirm(k.punkte[i - 1].toArray()), B = aufSchirm(k.punkte[i].toArray()); if (A[2] > 1 || B[2] > 1) continue; const d = abstandStrecke(sm, A, B); if (d < bd) { bd = d; best = k.punkte; } }
      for (const m of modell.children.filter((o) => o.isMesh && hauptVon(o.userData.fid)?.id === nahtWz.blech && !o.userData.nahtFahne && !o.userData.naht)) { const pos = m.children[0]?.geometry.attributes.position; if (!pos) continue; for (let i = 0; i + 1 < pos.count; i += 2) { const a = new THREE.Vector3().fromBufferAttribute(pos, i), b = new THREE.Vector3().fromBufferAttribute(pos, i + 1), A = aufSchirm(a.toArray()), B = aufSchirm(b.toArray()); if (A[2] > 1 || B[2] > 1) continue; const d = abstandStrecke(sm, A, B) + 3; if (d < bd) { bd = d; best = [a, b]; } } }
      if (best) linie(best); return;
    }
    if (kantenWz) {
      const w = kantenWz;
      if (w.schritt === "kante" && (w.f?.typ === "flaeche" || istProfil(w.f))) { const k = kanteUnterMaus(w.f, e); const pts = k ? nahtKante({ ziel: w.f.id, key: k })?.punkte : null; if (pts) { linie(pts); return; } }
      const h = blechUnter(); if (h && (h.typ === "flaeche" || istProfil(h)) && (w.schritt !== "kante" || h !== w.f)) blechAn(h); return;
    }
    if (quetschWz) {
      const z = quetschWz.f, sk = finde(z.skizze), sm = smPos(e), B = basis(blechEbene(sk.ebene, z, material(z.material))); let best = null, bd = e.pointerType === "touch" ? 36 : 20;
      for (const c of quetschEcken(z)) { const w3 = new THREE.Vector3(c.p[0], c.p[1], 0).applyMatrix4(B), S = aufSchirm(w3.toArray()), d = Math.hypot(S[0] - sm[0], S[1] - sm[1]); if (S[2] < 1 && d < bd) { bd = d; best = w3; } }
      if (best) { const m = new THREE.Mesh(new THREE.SphereGeometry(4, 16, 12), new THREE.MeshBasicMaterial({ color: 0xff8a00, depthTest: false, transparent: true })); m.position.copy(best); m.renderOrder = 30; hoverGruppe.add(m); }
    }
  } catch { /* Vorschau ist nur Zugabe */ }
}
document.addEventListener("keydown", (e) => { if (e.key === "Escape" && nahtWz && !dlg && !skizze) { endeNahtWz(); status(""); } });
// Längsnaht am Rohr/Kegel: Zugabe in der Abwicklung (Summe der Abkantzugaben beider Seiten) und Überlappungsstreifen im Modell
const rundNaehte = (f) => doc.features.filter((x) => x.typ === "naht" && !x._aus && (x.art === "punkt" || x.art === "falz") && ["a", "b"].some((s) => x[s]?.ziel === f.id && /^N[01]$/.test(x[s].key || "")));
function rundNahtZugabe(f, m) {
  let z = 0; for (const x of rundNaehte(f)) { const fo = nahtFolgen(x, m); for (const s of ["a", "b"]) if (x[s]?.ziel === f.id && fo[s]) { try { z += bausteinProfil({ name: "naht", folge: fo[s].folge, versatz: fo[s].versatz || 0 }, m).zugabe; } catch {} } }
  return z;
}
function rundNahtStreifen(f, m) {
  const out = [];
  for (const x of rundNaehte(f)) {
    const w = x.art === "falz" ? (x.mittig ? ((+x.falzA || 5) + (+x.falzB || 10)) / 2 : +x.falzB || 10) : +x.zugabe || 15, rm = f.d1 / 2, s = x.richtung === "unten" ? -1 : 1;
    const q = rundMeridian(f, m).map(([r, h]) => new THREE.Vector2(r + s * m.t, h)), E = E_(f.ebene), M = new THREE.Matrix4().makeBasis(V(E.v), V(E.n), V(E.u)).setPosition(V(E.o));
    const geo = new THREE.LatheGeometry(q, Math.max(6, Math.round(w / 4)), -w / rm, w / rm), n = geo.index ? geo.toNonIndexed() : geo; n.deleteAttribute("uv"); n.applyMatrix4(M);
    out.push(koerperAusGeo(n, darstellungVon(f, m), f.id));
  }
  return out;
}
// Länge der Naht: ganze Kantenlänge oder ein Teilstück (mm ab dem Anfang der Kante von Blech A); an Blech B gilt derselbe Abschnitt, bezogen auf die Länge seiner Kante in Gegenrichtung
const nahtKantenLaenge = (ref) => { const [pi, k] = String(ref?.key || "").split(":").map(Number); return finde(ref?.ziel)?._bleche?.find((b) => b.pi === pi)?.gruppen[k]?.laenge || 0; };
const nahtTeilFelder = (ff) => [{ id: "nahtLaenge", label: "Länge der Naht", optionen: [["ganz", "Ganze Kante"], ["teil", "Teilstück ab Kantenanfang"]], wert: ff.a?.teil ? "teil" : "ganz" },
  ...(ff.a?.teil ? [{ id: "nahtVon", label: "Von (mm ab Anfang Kante A)", einheit: "mm", wert: ff.a.teil.von }, { id: "nahtBis", label: "Bis (mm ab Anfang Kante A)", einheit: "mm", wert: ff.a.teil.bis }] : [])];
function nahtTeilSetzen(ff, w) {
  if (w.nahtLaenge === "ganz") { delete ff.a?.teil; delete ff.b?.teil; return; }
  if (w.nahtLaenge !== "teil") return;
  const LA = nahtKantenLaenge(ff.a), LB = nahtKantenLaenge(ff.b); if (!(LA > 0)) return;
  let von = Number.isFinite(w.nahtVon) ? w.nahtVon : ff.a?.teil?.von ?? LA * 0.25, bis = Number.isFinite(w.nahtBis) ? w.nahtBis : ff.a?.teil?.bis ?? LA * 0.75;
  von = Math.max(0, Math.min(von, LA - 1)); bis = Math.max(von + 1, Math.min(bis, LA)); ff.a.teil = { von: Math.round(von * 10) / 10, bis: Math.round(bis * 10) / 10 };
  if (LB > 0) { const vb = LB - bis / LA * LB, bb = LB - von / LA * LB; ff.b.teil = { von: Math.round(vb * 10) / 10, bis: Math.round(bb * 10) / 10 }; }
}
function nahtDialog(f, istNeu = false) {
  const ea = nahtKante(f.a), eb = nahtKante(f.b);
  const NUR = { punkt: ["absetz", "richtung", "zugabe"], falz: ["absetz", "richtung", "mittig", "falzB"], schweiss: ["seite", "raupeBreite", "raupeHoehe"], ecke: ["seite", "raupeBreite", "raupeHoehe"] }; // je Nahtart nur die passenden Felder
  featureDialog(f, istNeu, (ff) => [{ id: "name", label: "Name", text: true, wert: ff.name }, { id: "art", label: "Nahtart", optionen: Object.entries(NAHT_ARTEN), wert: ff.art || "punkt" },
    { id: "absetz", label: "Abgesetztes Blech (Punkt/Falz)", optionen: [["b", "Blech B"], ["a", "Blech A"]], wert: ff.absetz === "a" ? "a" : "b" },
    { id: "richtung", label: "Absetzung / Falz Richtung", optionen: [["oben", "zur Sichtseite"], ["unten", "zur Rückseite"]], wert: ff.richtung || "oben" },
    { id: "zugabe", label: "Überlappung (Punktnaht)", einheit: "mm", wert: ff.zugabe ?? 15 },
    { id: "mittig", label: "Falz (Falznaht)", optionen: [["nein", "Falz beginnt an der Blechkante"], ["ja", "Falzmitte genau über den Blechkanten"]], wert: ff.mittig ? "ja" : "nein" },
    { id: "falzB", label: "Falzbreite gesamt (Absetzung bis Hakenende)", einheit: "mm", wert: ff.falzB ?? 10 },
    { id: "seite", label: "Raupe auf der Seite (Schweiss-/Ecknaht)", optionen: [["oben", "Sichtseite"], ["unten", "Rückseite"]], wert: ff.seite || "oben" },
    { id: "raupeBreite", label: "Raupenbreite (0 = automatisch)", einheit: "mm", wert: ff.raupeBreite ?? 0 }, { id: "raupeHoehe", label: "Raupenhöhe (0 = automatisch)", einheit: "mm", wert: ff.raupeHoehe ?? 0 }].filter((x) => x.id === "name" || x.id === "art" || (NUR[ff.art || "punkt"] || []).includes(x.id)).concat(nahtTeilFelder(ff)),
    (ff, w) => { nahtTeilSetzen(ff, w); if (w.name != null) ff.name = w.name; if (w.art) ff.art = w.art; if (w.absetz) ff.absetz = w.absetz; if (w.richtung) ff.richtung = w.richtung; if (w.mittig) ff.mittig = w.mittig === "ja"; if (w.seite) ff.seite = w.seite;
      for (const k of ["zugabe", "falzA", "falzB", "raupeBreite", "raupeHoehe"]) if (Number.isFinite(w[k])) ff[k] = Math.max(0, w[k]); },
    "Naht", "Verbindung zweier Bleche an den gewählten Kanten. Punktnaht: Überlappung (Standard 15 mm), das abgesetzte Blech wird um eine Blechstärke gekröpft, so dass beide bündig liegen. Falznaht: einfacher liegender Falz; die Falzbreite (Standard 10 mm) gilt gesamt, der Haken des unteren Blechs liegt an der Absetzung. «Mittig»: Falzmitte genau über den Blechkanten. Schweiss-/Ecknaht: nur Darstellung als Raupe. Sitzt an der Kante schon ein Flansch, läuft die Naht zusätzlich darauf.",
    { neuBei: ["art", "nahtLaenge"], pflicht: () => (!f.a?.key || !f.b?.key ? "Zuerst Blech und Kante für beide Seiten wählen (Schritte 1–4)." : ""),
      info: () => (!f.a?.key || !f.b?.key ? "▶ " + NAHT_TEXT[nahtWz?.schritt || "blechA"] : f._fehler ? "⚠ " + f._fehler : `A: ${nahtKante(f.a)?.name || "–"} · B: ${nahtKante(f.b)?.name || "–"}`) });
}
function endeQuetschWz() { quetschWz = null; wkZu(); zeigeKanten(); }
function quetschKlick(e) {
  if (quetschWz.art === "stirn") {
    const f = quetschWz.f, sm = smPos(e); let best = null, bd = e.pointerType === "touch" ? 36 : 22;
    for (const c of stirnQuetschPunkte(f)) { const w = aufSchirm(c.p.toArray()); const d = Math.hypot(w[0] - sm[0], w[1] - sm[1]); if (d < bd) { bd = d; best = c; } }
    if (!best) { status("Eine Ecke anklicken (blaue Punkte)."); return true; }
    const n = { id: neueId(), typ: "stirnquetsch", name: `Quetschfalte ${f.name} · ${best.ende === "S1" ? "Stirn 1" : "Stirn 2"} Schenkel ${best.schenkel}`, ziel: f.id, ende: best.ende, schenkel: best.schenkel, seite: best.seite, wand: "lasche" };
    quetschWz = null; wkZu(); einfuegen(n); regen(); zeigeKanten(); waehle(n.id); status(n._fehler ? "⚠ " + n._fehler : "Quetschfalte angesetzt (Schritt in der Zeitleiste)."); return true;
  }
  const z = quetschWz.f, s = finde(z.skizze), B = basis(blechEbene(s.ebene, z, material(z.material))), sm = smPos(e); let best = null, bd = e.pointerType === "touch" ? 36 : 20;
  for (const c of quetschEcken(z)) { const w = aufSchirm(new THREE.Vector3(c.p[0], c.p[1], 0).applyMatrix4(B).toArray()); const d = Math.hypot(w[0] - sm[0], w[1] - sm[1]); if (d < bd) { bd = d; best = c; } }
  if (!best) { status("Eine Ecke des Flächenblechs anklicken (blaue Punkte)."); return true; }
  if (quetschWz.art === "ende") {
    const [p0, k0] = best.key.split(":").map(Number), bl = z._bleche?.find((b) => b.pi === p0), n0 = bl?.gruppen.length || 1, kv = (k0 - 1 + n0) % n0, hat = (k) => !!(z.kanten?.[`${p0}:${k}`] || z.kantenBasis?.[`${p0}:${k}`]);
    const seite = hat(k0) || !hat(kv) ? { key: best.key, seite: "start" } : { key: `${p0}:${kv}`, seite: "ende" };
    const n = { id: neueId(), typ: "flanschende", name: `Flanschende ${z.name} · ${kantenName(z, seite.key)} ${seite.seite === "ende" ? "Ende" : "Anfang"}`, ziel: z.id, key: seite.key, seite: seite.seite, art: "buendig", winkel: 0, versatz: 0 };
    quetschWz = null; wkZu(); einfuegen(n); regen(); zeigeKanten(); waehle(n.id); flanschEndeDialog(n); status("Flanschende: Art, Winkel und Versatz einstellen – OK übernimmt."); return true;
  }
  const n = { id: neueId(), typ: "quetschfalte", name: `Quetschfalte ${z.name} · Ecke ${best.key}`, ziel: z.id, ecke: best.key, richtung: "links" };
  quetschWz = null; wkZu(); einfuegen(n); regen(); zeigeKanten(); waehle(n.id); status(n._fehler ? "⚠ " + n._fehler : "Quetschfalte angesetzt (Schritt in der Zeitleiste)."); return true;
}
function flanschEndeDialog(f) {
  const z = finde(f.ziel), [p0, k0] = String(f.key).split(":").map(Number), bl = z?._bleche?.find((b) => b.pi === p0), n0 = bl?.gruppen.length || 1, kv = (k0 - 1 + n0) % n0;
  const optionen = [[`${p0}:${k0}|start`, `${kantenName(z, `${p0}:${k0}`)} · Anfang`], [`${p0}:${kv}|ende`, `${kantenName(z, `${p0}:${kv}`)} · Ende`]];
  const ecke = f.seite === "ende" ? `${f.key}|ende` : `${f.key}|start`;
  featureDialog(f, false, (ff) => [{ id: "name", label: "Name", text: true, wert: ff.name }, { id: "ecke", label: "Flansch an der Ecke", optionen: mitWert(optionen, ecke), wert: ecke },
    { id: "art", label: "Schnitt am Ende", optionen: [["rechtwinklig", "Rechtwinklig zur Biegekante (90°)"], ["buendig", "Bündig zur Nachbarkante"], ["winkel", "Freier Schnittwinkel"]], wert: ff.art || "rechtwinklig" },
    { id: "winkel", label: "Schnittwinkel (+ aussen länger, − kürzer)", einheit: "°", wert: ff.winkel ?? 0 }, { id: "versatz", label: "Verlängern (+) / kürzen (−)", einheit: "mm", wert: ff.versatz ?? 0 }],
    (ff, w) => { if (w.name != null) ff.name = w.name; if (typeof w.ecke === "string" && w.ecke.includes("|")) { const [kk, s] = w.ecke.split("|"); ff.key = kk; ff.seite = s; } if (w.art) ff.art = w.art; if (Number.isFinite(w.winkel)) ff.winkel = Math.max(-80, Math.min(80, w.winkel)); if (Number.isFinite(w.versatz)) ff.versatz = w.versatz; },
    "Flanschende", "Ändert nachträglich das Ende eines Flansches: rechtwinklig zur Biegekante (Standard), bündig zur Nachbarkante oder mit freiem Schnittwinkel – in beide Richtungen, ausserdem verlängern oder kürzen.", { info: () => (f._fehler ? "⚠ " + f._fehler : "") });
}
function quetschDialog(f) {
  featureDialog(f, false, (ff) => [{ id: "name", label: "Name", text: true, wert: ff.name }, { id: "richtung", label: "Falte liegt auf", optionen: [["links", "hinten links (Wand 1)"], ["rechts", "hinten rechts (Wand 2)"]], wert: ff.richtung || "links" }],
    (ff, w) => { if (w.name != null) ff.name = w.name; if (w.richtung) ff.richtung = w.richtung; }, "Quetschfalte", "Der Überschuss der Ecke wird an seiner Winkelhalbierenden 180° gefaltet und liegt auf der gewählten Aufkantung (von der Sichtseite aus gesehen).",
    { info: () => (f._fehler ? "⚠ " + f._fehler : f._q ? `Überschuss ${f1(f._q.zus.psi)}° · Ecklinie ${f1(f._q.zus.ell)} mm · Falte ${f1(f._q.zus.m)} mm lang · Faltprobe ${f._q.pruefung.ok ? "ok" : "FEHLER"} · DXF der Ecke im Teil-Panel` : "") });
}
function starteKantenWz(typ, x = 200, y = 80) {
  if (dlg) $("dAbbrechen").click(); if (skizze) return status("Erst die Skizze beenden.");
  const los = (baustein) => { kantenWz = { typ, baustein, seite: 1, schritt: "blech", f: null, sel: [] }; const h = hauptVon(auswahl); if ((h?.typ === "flaeche" || istProfil(h)) && !h.versteckt) { kantenWz.f = h; kantenWz.schritt = "kante"; zeigeKanten(); } kantenBarZeigen(); status(kantenWzText()); };
  if (typ !== "baustein") return los(null);
  // Das Bearbeitungsfenster öffnet sich zuerst; den Baustein wählt man darin (Feld «Baustein»), zuletzt benutzter Baustein ist vorgewählt
  const alle = alleBausteine(); if (!alle.length) return status("Keine Bausteine vorhanden – unter Einstellungen › Bausteine anlegen.");
  los(alle.some((b) => b.id === letzterBaustein) ? letzterBaustein : alle[0].id);
}
let letzterBaustein = "";
function kantenWzKlick(e) { // true = Klick verbraucht
  const w = kantenWz;
  strahl.setFromCamera(ndc(e), kamera);
  const t = strahl.intersectObjects(modell.children.filter((o) => o.isMesh), false)[0], h = t ? hauptVon(t.object.userData.fid) : null;
  if (w.schritt === "kante") { if (w.f.typ === "flaeche" || istProfil(w.f)) { const k = kanteUnterMaus(w.f, e); if (k) { waehleKante(k); return true; } } if (!((h?.typ === "flaeche" || istProfil(h)) && h !== w.f)) { status(kantenWzText()); return true; } }
  if (h?.typ !== "flaeche" && !istProfil(h)) { status("Hier ist kein Blech – " + kantenWzText()); return true; }
  w.f = h; w.schritt = "kante"; waehle(h.id); zeigeKanten(); kantenBarZeigen(); status(kantenWzText()); return true;
}
// Kanten werden nur gewählt (orange); erst «Übernehmen» (Enter) legt Flansch/Umschlag/Baustein an
function waehleKante(key) { // Kante wählen: der Flansch/Umschlag/Baustein erscheint sofort als Vorschau (blaue Kante); «Übernehmen» bestätigt, Esc verwirft
  const w = kantenWz; if (!w) return; w.vorschau ||= new Map();
  if (w.vorschau.has(key)) { for (const id of w.vorschau.get(key)) { const f0 = finde(id); if (f0) entferneFeature(f0); } w.vorschau.delete(key); w.letzte = [...w.vorschau.values()].flat().map(finde).filter(Boolean).at(-1) || null; regen(); }
  else { const n0 = doc.features.length; wendeKantenWz(key); const neu = doc.features.slice(n0); neu.forEach((x) => { x._vorschau = true; }); w.vorschau.set(key, neu.map((x) => x.id)); w.letzte = neu.find((x) => x.wert?.werkzeug) || neu.at(-1) || null; }
  w.sel = [...w.vorschau.keys()]; zeigeKanten(); kantenBarZeigen(); zeichneGriffe();
  status(w.sel.length ? `${w.sel.length} Kante(n) in der Vorschau – Länge und Winkel in der Leiste oder mit den Pfeilen ändern, «Übernehmen» (Enter) bestätigt, Esc verwirft. Kante nochmals anklicken = entfernen.` : kantenWzText());
}
function vorschauFeatures() { return [...(kantenWz?.vorschau?.values() || [])].flat().map(finde).filter(Boolean); }
function vorschauVerwerfen() { for (const f0 of vorschauFeatures()) entferneFeature(f0); kantenWz?.vorschau?.clear(); if (kantenWz) { kantenWz.sel = []; kantenWz.letzte = null; } }
function uebernehmeKanten() {
  const w = kantenWz; if (!w?.vorschau?.size) return; const n = w.vorschau.size;
  for (const f0 of vorschauFeatures()) delete f0._vorschau; w.vorschau.clear(); w.sel = []; w.letzte = null;
  zeigeKanten(); kantenBarZeigen(); zeichneGriffe(); status(`${n} Kante(n) übernommen (Schritte in der Zeitleiste). Weitere Kanten wählen oder «Fertig».`);
}
// Änderungen in der Kantenleiste wirken sofort auf alle Vorschau-Flansche
function vorschauAktualisieren() {
  const w = kantenWz; if (!w) return; const a = parseFloat($("kbWinkel").value), c = parseFloat($("kbLaenge").value), m = material(w.f?.material);
  for (const l of vorschauFeatures()) { if (!l.wert?.werkzeug) continue; const wk = { ...l.wert.werkzeug }; if (a > 0 && wk.typ === "flansch") wk.winkel = a; if (c > 0) wk.laenge = c; if (wk.typ === "umschlag") wk.saum = $("kbSaum").value; else { wk.bezug = $("kbBezug").value; wk.biegepos = $("kbPos").value; } l.wert = werkzeugNeu(l.wert, wk, m); }
  if (w.teil && w.f?.typ === "flaeche") for (const l of vorschauFeatures()) { l.teil = teilFuer(w.f, l.key); }
  regen(); zeigeKanten(); zeichneGriffe();
  if (w.teil) { const l0 = vorschauFeatures().at(-1); if (l0?.teil) { if (document.activeElement !== $("kbVon")) $("kbVon").value = String(l0.teil.von); if (document.activeElement !== $("kbBis")) $("kbBis").value = String(l0.teil.bis); } }
}
// Teilstück für eine Kante: eingegebene Werte (mm) auf die Kantenlänge begrenzen, sonst von 25 % bis 75 % der Länge
function teilFuer(f, key, von = parseFloat($("kbVon").value), bis = parseFloat($("kbBis").value)) {
  const [pi, k] = String(key).split(":").map(Number), L = f._bleche?.find((b) => b.pi === pi)?.gruppen[k]?.laenge || 100;
  if (!(von >= 0) || !(bis > von)) { von = L * 0.25; bis = L * 0.75; }
  von = Math.max(0, Math.min(von, L - 1)); bis = Math.max(von + 1, Math.min(bis, L));
  return { von: Math.round(von * 10) / 10, bis: Math.round(bis * 10) / 10 };
}
function wendeKantenWz(key) { // legt einen Schritt «Kante» in der Zeitleiste an (live, mit eigenem Dialog)
  if (istProfil(kantenWz.f)) return wendeProfilKante(key);
  const w = kantenWz, f = w.f, m = material(f.material), vor = f.kanten?.[key];
  let neu;
  if (w.typ === "baustein") { const b = bausteinFuer(w.baustein); neu = w.seite === -1 ? { folge: folgeUmkehren(bausteinFolge(werkzeugAuf(b, m), m)), versatz: +b.versatz || 0 } : w.baustein; }
  else { const wk = { ...flanschStandard(w.typ), winkel: parseFloat($("kbWinkel").value) || 90, laenge: parseFloat($("kbLaenge").value) || (w.typ === "umschlag" ? 10 : 25), seite: w.seite, ...(w.typ === "umschlag" ? { saum: $("kbSaum").value } : { bezug: $("kbBezug").value, biegepos: $("kbPos").value }) }; neu = werkzeugNeu({ werkzeug: wk }, wk, m); }
  const titel = w.typ === "flansch" ? "Flansch" : w.typ === "umschlag" ? "Umschlag" : bausteinName(w.baustein);
  const n = { id: neueId(), typ: "kante", name: `${titel} ${kantenName(f, key)}`, ziel: f.id, key, wert: neu, anhaengen: !!vor, ...(w.teil ? { teil: teilFuer(f, key) } : {}) };
  einfuegen(n); w.letzte = n;
  const b = typeof neu === "string" && bausteinFuer(neu), pk = b?.partner && partnerKante(f, key); // Doppelfalz: Gegenstück am Nachbarblech
  if (pk && !f.kanten?.[pk]) einfuegen({ id: neueId(), typ: "kante", name: `${bausteinName(b.partner)} ${kantenName(f, pk)}`, ziel: f.id, key: pk, wert: b.partner, anhaengen: false });
  regen(); menueKante = { fid: f.id, key }; zeigeKanten();
  status(vor ? `${kantenName(f, key)}: an ${bausteinName(vor)} angehängt (Schritt «${n.name}» in der Zeitleiste).` : `${kantenName(f, key)}: «${n.name}» in der Zeitleiste angelegt. Weitere Kante anklicken oder «Fertig».`);
}
// Richtung eines Schritts umkehren (Sichtseite ⇄ hinten), live
function kanteUmkehren(f, key) {
  const m = material(f.material), schritt = f.typ === "kante" || f.typ === "profilkante" ? f : kantenSchritte(f, key).at(-1), ziel = f.typ === "kante" || f.typ === "profilkante" ? finde(f.ziel) : f, v = schritt ? schritt.wert : ziel.kanten?.[key]; if (!v) return;
  const neu = v.werkzeug ? werkzeugNeu(v, { ...v.werkzeug, seite: v.werkzeug.seite === -1 ? 1 : -1 }, m) : (() => { const b = bausteinFuer(v); return { folge: folgeUmkehren(bausteinFolge(werkzeugAuf(b, m), m)), versatz: +b.versatz || 0 }; })();
  if (schritt) schritt.wert = neu; else setzeKanteVon(ziel, key, neu);
  regen();
}
// Dialog eines Schritts «Kante»: Winkel, Länge, Radius, Mass bis, Richtung – wirkt live
function kanteDialog(f) {
  const z = finde(f.ziel), m = material(z?.material), w = f.wert;
  const felder = (ff) => { const x = ff.wert; return [{ id: "name", label: "Name", text: true, wert: ff.name },
    ...(x?.werkzeug ? [...(x.werkzeug.typ === "flansch" ? [{ id: "winkel", label: "Winkel", einheit: "°", wert: x.werkzeug.winkel }] : []), ...(x.werkzeug.typ === "umschlag" ? [{ id: "saum", label: "Saumart", optionen: Object.entries(SAUMARTEN), wert: x.werkzeug.saum || "geschlossen" }] : []), { id: "laenge", label: "Länge", einheit: "mm", wert: x.werkzeug.laenge }, { id: "radius", label: "Radius (0 = automatisch)", einheit: "mm", wert: x.werkzeug.radius ?? 0 },
      ...(x.werkzeug.typ === "flansch" ? [{ id: "bezug", label: "Länge gemessen bis", optionen: Object.entries(BEZUEGE), wert: x.werkzeug.bezug || "mitte" }, { id: "biegepos", label: "Biegeposition an der Kante", optionen: Object.entries(BIEGEPOS), wert: x.werkzeug.biegepos || (x.werkzeug.bezug === "aussen" || x.werkzeug.bezug === "innen" ? x.werkzeug.bezug : "mitte") }] : []),
      { id: "seite", label: "Richtung", optionen: [["1", "zur Sichtseite"], ["-1", "nach hinten"]], wert: String(x.werkzeug.seite === -1 ? -1 : 1) }]
      : typeof x === "string" ? [{ id: "baustein", label: "Baustein", optionen: alleBausteine().map((b) => [b.id, b.name]), wert: x }]
      : [{ id: "folge", label: "Abkantfolge", text: true, wert: x?.folge ?? "" }]),
    ...(ff.typ === "kante" && z?.typ === "flaeche" ? [{ id: "kLaenge", label: "Länge auf der Kante", optionen: [["ganz", "Ganze Kante"], ["teil", "Teilstück (Pfeile an der Kante ziehen)"]], wert: ff.teil ? "teil" : "ganz" }, ...(ff.teil ? [{ id: "teilVon", label: "Von (mm ab Kantenanfang)", einheit: "mm", wert: ff.teil.von }, { id: "teilBis", label: "Bis (mm ab Kantenanfang)", einheit: "mm", wert: ff.teil.bis }] : [])] : []),
    ...(ff.typ === "kante" ? [{ id: "anhaengen", label: "Bei belegter Kante", optionen: [["", "ersetzt den Baustein der Kante"], ["1", "setzt ihn fort (anhängen)"]], wert: ff.anhaengen ? "1" : "" }] : [])]; };
  const setze = (ff, ww) => {
    ff.name = ww.name?.trim() || ff.name; ff.anhaengen = !!ww.anhaengen;
    if (ww.kLaenge === "ganz") delete ff.teil; else if (ww.kLaenge === "teil" && ff.typ === "kante") ff.teil = teilFuer(z, ff.key, ww.teilVon ?? ff.teil?.von ?? NaN, ww.teilBis ?? ff.teil?.bis ?? NaN);
    if (ff.wert?.werkzeug) { const wk = { ...ff.wert.werkzeug }; if (ww.winkel > 0) wk.winkel = ww.winkel; if (ww.laenge > 0) wk.laenge = ww.laenge; wk.radius = ww.radius > 0 ? ww.radius : null; if (ww.bezug) wk.bezug = ww.bezug; if (ww.biegepos) wk.biegepos = ww.biegepos; if (ww.saum) wk.saum = ww.saum; wk.seite = +ww.seite === -1 ? -1 : 1; ff.wert = werkzeugNeu(ff.wert, wk, m); }
    else if (typeof ff.wert === "string") ff.wert = ww.baustein || ff.wert;
    else if (ww.folge) { try { folge("100 " + ww.folge); ff.wert = { ...ff.wert, folge: ww.folge }; } catch {} }
  };
  featureDialog(f, false, felder, setze, "Kante bearbeiten", "Ändert den Flansch bzw. Baustein dieser Kante – das Blech passt sich sofort an. Richtung auch per Rechtsklick › «Richtung umkehren».", { wahlNr: -1, aktiveKante: f.key, neuBei: ["kLaenge"], nachRegen: () => zeigeKanten() });
  zeigeKanten();
}
$("wLoftFlansch")?.addEventListener("click", () => { if (dlg) $("dAbbrechen").click(); loftflanschDialog(); });
$("wRip")?.addEventListener("click", () => { if (dlg) $("dAbbrechen").click(); ripDialog(); });
$("wBiegung")?.addEventListener("click", () => { if (dlg) $("dAbbrechen").click(); biegungDialog(); });
for (const [id, t] of [["wSkalieren", "skalieren"], ["wBohrung", "bohrung"], ["wRohr", "rohr"], ["wSpirale", "spirale"], ["wRippe", "rippe"]]) $(id).addEventListener("click", () => { if (dlg) $("dAbbrechen").click(); koerper2Dialog(t); });
$("wQuetsch").addEventListener("click", () => setTimeout(starteQuetschWz, 0));
$("wFlanschEnde").addEventListener("click", () => setTimeout(starteEndeWz, 0));
$("wNaht").addEventListener("click", () => setTimeout(starteNahtWz, 0));
document.querySelectorAll("[data-kantenwz]").forEach((b) => b.addEventListener("click", () => { const r = b.getBoundingClientRect(); setTimeout(() => starteKantenWz(b.dataset.kantenwz, r.right + 6, r.top), 0); }));
$("kbRichtung").onclick = () => { if (!kantenWz) return; kantenWz.seite = kantenWz.seite === -1 ? 1 : -1; kantenBarZeigen(); for (const l of vorschauFeatures()) kanteUmkehren(l, l.key); zeichneGriffe(); };
for (const id of ["kbWinkel", "kbLaenge", "kbVon", "kbBis"]) $(id).addEventListener("input", vorschauAktualisieren);
$("kbTeil").addEventListener("change", () => { // ganze Kante oder Teilstück: gilt für die nächsten Kanten und sofort für die noch nicht übernommenen
  const w = kantenWz; if (!w) return; w.teil = $("kbTeil").value === "teil";
  for (const l of vorschauFeatures()) { if (w.teil) l.teil = teilFuer(w.f, l.key, NaN, NaN); else delete l.teil; }
  kantenBarZeigen(); if (vorschauFeatures().length) { regen(); zeigeKanten(); } zeichneGriffe(); status(w.teil ? "Teilstück: die orangen Pfeile an der Kante verschieben Anfang und Ende (oder Werte eintippen)." : "Ganze Kantenlänge.");
});
for (const id of ["kbBezug", "kbPos", "kbSaum"]) $(id).addEventListener("change", vorschauAktualisieren);
$("kbBaustein").addEventListener("change", () => { // anderen Baustein wählen: gilt für die nächsten Kanten und sofort für die noch nicht übernommenen Vorschau-Kanten
  const w = kantenWz; if (!w || w.typ !== "baustein") return; w.baustein = letzterBaustein = $("kbBaustein").value; const m = material(w.f?.material);
  for (const l of vorschauFeatures()) l.wert = kantenWert(w, m);
  kantenBarZeigen(); status(kantenWzText()); if (vorschauFeatures().length) { regen(); zeigeKanten(); zeichneGriffe(); }
});
$("kbEnde").onclick = () => { if (kantenWz?.vorschau?.size) uebernehmeKanten(); endeKantenWz(); }; // «Fertig» übernimmt noch offene Vorschauen
$("kbOk").onclick = uebernehmeKanten;
$("kbAbbr").onclick = () => { endeKantenWz(); status(""); };
$("messZu").onclick = () => messenUmschalten(false);
$("pbOk").onclick = () => projizierenBestaetigen();
$("pbAbbr").onclick = () => projWahlLeeren();
document.addEventListener("keydown", (e) => { if (e.key === "Enter" && kantenWz?.sel?.length && !dlg && !skizze && !e.target.closest?.("#kantenMenue")) { e.preventDefault(); uebernehmeKanten(); } });
document.addEventListener("keydown", (e) => { if (e.key === "Escape" && kantenWz && !dlg && !skizze) { endeKantenWz(); status(""); } });
document.addEventListener("keydown", (e) => { if (e.key === "Escape" && quetschWz && !dlg && !skizze) { endeQuetschWz(); status(""); } });
function flaecheDialog(f) {
  const istNeu = !f;
  const sk = doc.features.filter((x) => x.typ === "skizze" && (schleifen(x).length || skizzenRegionen(x).length));
  if (!sk.length && !f) return fehltDialog("Flächenblech", "Zuerst die Grundfläche des Blechs als geschlossenes Profil skizzieren (z. B. Rechteck oder Linienzug, Dachbahnen nebeneinander).");
  f ||= { id: neueId(), typ: "flaeche", name: "Flächenblech " + (doc.features.filter((x) => x.typ === "flaeche").length + 1), skizze: vorSk(sk).id, flaechen: [],
    kanten: {}, material: neuMaterial(), stueck: einst.neu.stueck, sichtseite: 1 };
  const felder = (f) => [
    { id: "skizze", label: Array.isArray(f.flaechen) ? "Flächen in" : "Grundfläche aus", wahl: Array.isArray(f.flaechen) ? "flaechen" : "profil", optionen: sk.map((s) => [s.id, s.name]), wert: f.skizze },
    ...(Array.isArray(f.flaechen) ? [] : [{ id: "profil", label: "Flächen", optionen: [["alle", "Alle Flächen (je ein Blech)"], ...schleifen(finde(f.skizze) || vorSk(sk)).map((_, i) => [i, `Fläche ${i + 1}`])], wert: f.profil ?? "alle" }]),
    { id: "name", label: "Name", text: true, wert: f.name },
    { id: "material", label: "Material", optionen: matOpt(), wert: f.material },
    { id: "sichtseite", label: "Richtung der Abkantungen / Sichtseite", optionen: [["1", "Vorne (Richtung Ebenen-Normale)"], ["-1", "Hinten (gegen die Normale)"]], wert: String(f.sichtseite ?? 1) },
    { id: "lage", label: "Skizze liegt …", optionen: [["mitte", "in der Blechmitte"], ["vorne", "auf der Vorderseite (Blech dahinter)"], ["hinten", "auf der Rückseite (Blech davor)"]], wert: f.lage || "mitte" },
    { id: "ecken", label: "Eckenschluss", optionen: [["gehrung", "Gehrung (Enden 90° zum Blech, Innenecken treffen sich)"], ["gehrung45", "Gehrung 45° über die ganze Höhe (wie Fusion «Miter»)"], ["stoss", "Stoss (Überlappung)"], ["spalt", "Offene Ecke mit Spalt"]], wert: f.ecken || "gehrung" },
    { id: "eckSpalt", label: "Eckspalt (offene Ecke)", einheit: "mm", wert: f.eckSpalt ?? 1 },
    { id: "freistellung", label: "Freistellung der Biegezone (Gehrung)", optionen: [["eckig", "ja – Biegezone endet vor der Ecke"], ["keine", "nein"]], wert: f.freistellung === "keine" ? "keine" : "eckig" },
    { id: "freistellungMass", label: "Freistellung: Radius (0 = automatisch Biegeradius + Blechstärke)", einheit: "mm", wert: f.freistellungMass ?? 0 },
    { id: "eckEntl", label: "Eckentlastung", optionen: [["keine", "Keine"], ["rund", "Rund"], ["quadrat", "Quadratisch"]], wert: f.eckEntl || "keine" },
    { id: "eckEntlMass", label: "Entlastung: Radius / halbe Seite", einheit: "mm", wert: f.eckEntlMass ?? 2 },
    { id: "stueck", label: "Stück", wert: f.stueck ?? 1 },
    { id: "notiz", label: "Notiz", text: true, wert: f.notiz ?? "" },
  ];
  const setze = (f, w) => { if (Array.isArray(f.flaechen) && w.skizze !== f.skizze) f.flaechen = []; Object.assign(f, { ...w, name: w.name?.trim() || f.name, sichtseite: +w.sichtseite || 1 }); delete f.ansicht; delete f.ausschnitt; delete f.flach; };
  const optionen = (v) => {
    const g = [...new Set(alleBausteine().map((b) => b.gruppe || "Eigene"))];
    return `<option value="">– keine (Schnittkante)</option>${g.map((gr) => `<optgroup label="${esc(gr)}">${alleBausteine().filter((b) => (b.gruppe || "Eigene") === gr).map((b) => `<option value="${esc(b.id)}" ${v === b.id ? "selected" : ""}>${esc(b.name)}</option>`).join("")}</optgroup>`).join("")}
      <option value="*f" ${v?.werkzeug?.typ === "flansch" ? "selected" : ""}>Flansch …</option><option value="*u" ${v?.werkzeug?.typ === "umschlag" ? "selected" : ""}>Umschlag …</option>
      <option value="*" ${v && typeof v === "object" && !v.werkzeug ? "selected" : ""}>Eigene Abkantfolge …</option>`;
  };
  const kantenParam = (key, v) => { const b = typeof v === "string" && bausteinFuer(v); if (!b?.parameter?.length) return ""; const w = f.kantenWerte?.[key] || {};
    return `<div class="kparam">${b.parameter.map((p) => `<label>${esc(p.label || p.name)} <input data-kw="${key}" data-p="${esc(p.name)}" type="number" step="any" placeholder="${p.standard ?? ""}" value="${w[p.name] ?? ""}" aria-label="${esc(p.label || p.name)} Kante ${key}"></label>`).join(" ")}</div>`; };
  const kantenWarn = (key, v, g) => { const b = typeof v === "string" && bausteinFuer(v); if (!b) return ""; const h = pruefeEignung({ ...b, _werte: f.kantenWerte?.[key] }, material(f.material), { kantenlaenge: g.laenge }); return h.length ? ` <span class="fehler" title="${esc(h.join(" · "))}">⚠</span>` : ""; };
  const fwFeld = (key, v) => { const w = v.werkzeug, fl = w.typ === "flansch", feld = (k, l, wert, e, ph = "") => `<label>${l} <input data-fw="${k}" data-key="${key}" type="number" step="any" value="${wert ?? ""}" placeholder="${ph}" aria-label="${l} Kante ${key}">${e}</label>`;
    return `<div class="kparam fw">${fl ? feld("winkel", "Winkel", w.winkel, "°") : ""}${feld("laenge", "Länge", w.laenge, " mm")}${feld("radius", "Radius", w.radius, " mm", "auto")}
      <label>Richtung <select data-fw="seite" data-key="${key}"><option value="1" ${w.seite !== -1 ? "selected" : ""}>zur Sichtseite</option><option value="-1" ${w.seite === -1 ? "selected" : ""}>nach hinten</option></select></label>
      ${fl ? `<label>Länge bis <select data-fw="bezug" data-key="${key}">${Object.entries(BEZUEGE).map(([v, n]) => `<option value="${v}" ${(w.bezug || "mitte") === v ? "selected" : ""}>${n}</option>`).join("")}</select></label><label>Biegeposition <select data-fw="biegepos" data-key="${key}">${Object.entries(BIEGEPOS).map(([v, n]) => `<option value="${v}" ${(w.biegepos || (w.bezug === "aussen" || w.bezug === "innen" ? w.bezug : "mitte")) === v ? "selected" : ""}>${n}</option>`).join("")}</select></label>` : ""}</div>`; };
  const tabelle = () => `<p class="hinweis">Kante in der Ansicht anklicken (oder hier wählen) und den Baustein zuweisen. Gemeinsame Kanten zweier Bleche bekommen automatisch das Gegenstück (Unter-/Oberfalz).</p>
    <table class="zeilen kanten"><thead><tr><th>Kante</th><th class="num">Länge</th><th>Baustein</th><th class="num">Zugabe</th></tr></thead><tbody>
    ${(f._bleche || []).flatMap((bl) => bl.gruppen.map((g, k) => { const key = `${bl.pi}:${k}`, v = f.kanten?.[key];
      return `<tr data-k="${key}" class="${dlg?.aktiveKante === key ? "aktiv" : ""}"><td>${f._bleche.length > 1 ? `B${bl.pi + 1} ` : ""}K${k + 1}${g.gerade ? "" : " ⌒"}</td><td class="num">${f1(g.laenge)}</td>
        <td><select data-b="${key}" aria-label="Baustein ${key}">${optionen(v)}</select>${v ? `<button class="knopf klein" data-rev="${key}" title="Richtung der Abkantung umkehren (Sichtseite ⇄ nach hinten)">⇅ Richtung</button>` : ""}${kantenParam(key, v)}${v?.werkzeug ? fwFeld(key, v) : ""}${v && typeof v === "object" && !v.werkzeug ? `<input data-eigen="${key}" class="folge" value="${esc(v.folge)}" placeholder="90 25 U+ 7" title="Ab der Kante: Winkel Schenkel Winkel Schenkel …">` : ""}</td>
        <td class="num" data-z="${key}">${bl.profile[k] ? f1(bl.profile[k].zugabe) : "0"}${kantenWarn(key, v, g)}</td></tr>`; })).join("")}
    </tbody></table>
    <div class="reihe"><select id="kAlle" aria-label="Baustein für alle Kanten ohne Baustein">${optionen("")}</select><button class="knopf" data-alle>Allen freien Kanten zuweisen</button></div>
    <div class="reihe"><button class="knopf" data-bneu>+ Neuer Baustein …</button><button class="knopf" data-bkante ${dlg?.aktiveKante && f.kanten?.[dlg.aktiveKante] ? "" : "disabled"}>✎ Baustein der gewählten Kante</button></div>`;
  const neu = () => { const d = dlg; dialog({ ...d, felder: felder(f) }); regen(); };
  const setzeKante = (key, v) => setzeKanteVon(f, key, v);
  const binden = (box) => {
    const fwAendern = (e, neuBauen) => { // Winkel, Länge, Radius, Mass bis, Richtung eines Flanschs/Umschlags – beim Tippen live (ohne den Dialog neu aufzubauen)
      const kk = e.target.dataset.key, v0 = f.kanten?.[kk]; if (!v0?.werkzeug) return; const w = { ...v0.werkzeug }, k = e.target.dataset.fw;
      if (k === "seite") w.seite = +e.target.value; else if (k === "bezug" || k === "biegepos") w[k] = e.target.value; else { const x = e.target.value === "" ? null : parseFloat(e.target.value); if (k === "radius") w.radius = x > 0 ? x : null; else if (x > 0) w[k] = x; }
      setzeKante(kk, werkzeugNeu(v0, w, material(f.material))); dlg.aktiveKante = kk; if (neuBauen) neu(); else regen();
    };
    box.addEventListener("input", (e) => { if (e.target.dataset.fw && e.target.tagName === "INPUT") fwAendern(e, false); });
    box.addEventListener("change", (e) => {
      const key = e.target.dataset.b, ek = e.target.dataset.eigen;
      if (e.target.dataset.kw) { const kk = e.target.dataset.kw, p = e.target.dataset.p, x = e.target.value === "" ? null : parseFloat(e.target.value); f.kantenWerte = { ...f.kantenWerte, [kk]: { ...(f.kantenWerte?.[kk] || {}) } }; if (x == null || isNaN(x)) delete f.kantenWerte[kk][p]; else f.kantenWerte[kk][p] = x; dlg.aktiveKante = kk; neu(); return; }
      if (e.target.dataset.fw) return fwAendern(e, true);
      if (key) { const v = e.target.value; setzeKante(key, v === "*f" ? werkzeugKante("flansch", material(f.material)) : v === "*u" ? werkzeugKante("umschlag", material(f.material)) : v === "*" ? { folge: "90 25", versatz: 0 } : v); dlg.aktiveKante = key; neu(); return; }
      if (ek) { try { folge("100 " + e.target.value); setzeKante(ek, { folge: e.target.value, versatz: 0 }); e.target.classList.remove("ungueltig"); regen(); } catch (err) { e.target.classList.add("ungueltig"); status(err.message); } }
    });
    box.addEventListener("click", (e) => {
      if (e.target.dataset.rev != null) { kanteUmkehren(f, e.target.dataset.rev); dlg.aktiveKante = e.target.dataset.rev; neu(); return; }
      if (e.target.dataset.bneu != null || e.target.dataset.bkante != null) { // Baustein-Editor; gespeichert wird in die Bibliothek (Einstellungen)
        const key = dlg.aktiveKante, v = key && f.kanten?.[key], vorhanden = typeof v === "string" && (einst.bausteine || []).find((b) => b.id === v);
        const b = e.target.dataset.bneu != null ? neuerBaustein(v && typeof v === "object" ? v.folge : undefined) : vorhanden || { ...bausteinFuer(v), id: neuerBaustein().id, name: "Eigener Baustein" };
        bausteinEditor(b, einst.bausteine, (neu) => { einstSpeichern(); if (key && (e.target.dataset.bneu != null || !vorhanden)) setzeKante(key, neu.id); dlg.aktiveKante = key; const d = dlg; dialog({ ...d, felder: felder(f) }); regen(); zeigeKanten(); });
        return;
      }
      if (e.target.dataset.alle != null) { const v = $("kAlle").value; if (!v || v === "*" || v === "*f" || v === "*u") return; for (const bl of f._bleche || []) bl.gruppen.forEach((_, k) => { if (!f.kanten?.[`${bl.pi}:${k}`]) setzeKante(`${bl.pi}:${k}`, v); }); neu(); return; }
      const tr = e.target.closest("tr[data-k]"); if (tr && e.target.tagName !== "SELECT" && e.target.tagName !== "INPUT") { dlg.aktiveKante = tr.dataset.k; box.querySelectorAll("tr[data-k]").forEach((r) => r.classList.toggle("aktiv", r === tr)); zeigeKanten(); }
    });
  };
  featureDialog(f, istNeu, felder, setze, "Flächenblech",
    "Grundfläche des Blechs in einer Skizze zeichnen (Masse = Achsen der Falze bzw. fertige Kanten). Dann je Kante den Spenglerbaustein wählen – Zuschnitt, Ausklinkungen, Biegelinien und Abkantliste rechnet das Programm.",
    { zusatz: tabelle, binden, wahlNr: Array.isArray(f.flaechen) && !f.flaechen.length ? 0 : -1, aktiveKante: null,
      pflicht: () => (Array.isArray(f.flaechen) && !f.flaechen.length ? "Zuerst mindestens eine Fläche in der Skizze anklicken." : ""),
      kantenWahl: (e) => { const k = kanteUnterMaus(f, e); if (!k) return false; waehleKanteImDialog(k, e.clientX, e.clientY); return true; },
      nachRegen: () => { for (const bl of f._bleche || []) bl.gruppen.forEach((_, k) => { const c = document.querySelector(`#dInhalt [data-z="${bl.pi}:${k}"]`); if (c) c.innerHTML = (bl.profile[k] ? f1(bl.profile[k].zugabe) : "0") + kantenWarn(`${bl.pi}:${k}`, f.kanten?.[`${bl.pi}:${k}`], bl.gruppen[k]); }); },
      info: () => (f._fehler ? "⚠ " + f._fehler : f._teile ? f._teile.map((t) => `${t.name}: ${f1(t._blech.abw.breite)} × ${f1(t._blech.abw.laenge)}`).join(" · ") : "") });
  const d = dlg; dialog({ ...d, felder: felder(f) }); zeigeKanten(); $("dInfo").textContent = dlg.info(); // Kantentabelle braucht die eben berechneten Bleche
  // Kante gewählt (Ansicht oder Beschriftung): Zeile markieren und Bausteinmenü an der Stelle öffnen
  const waehleKanteImDialog = (k, x, y) => {
    const auffrischen = (key) => { if (dlg?.feature !== f) return; dlg.aktiveKante = key; const d = dlg; dialog({ ...d, felder: felder(f) }); zeigeKanten(); $("dInfo").textContent = dlg.info(); };
    auffrischen(k);
  };
  dlg.kanteGewaehlt = waehleKanteImDialog;
}
// Werkstatt und Werkstattblatt für ein Blech aus Fläche: Zuschnitt mit Biegelinien, Abkantliste je Kante
function belegteKanten(bl) {
  return bl.gruppen.map((g, k) => ({ k, g, p: bl.profile[k] })).filter((x) => x.p);
}
function zeigeFlaechenteil(w, f) {
  const bl = f._blech, a = bl.abw, m = material(f.material), q = quelle(a.breite, einst), quetschen = doc.features.filter((x) => x.typ === "quetschfalte" && x.ziel === f.eltern.id && x._q && !x._aus);
  w.innerHTML = `<div class="zahl zwei"><b>${f1(a.breite)} × ${f1(a.laenge)}</b><span>mm Zuschnitt</span></div>
    <div class="unter"><button class="knopf klein" id="kZumDetail">← ${esc(f.eltern.name)}</button> · ${f2(a.flaeche)} m² · ${f._res.biegungen.length} Biegungen</div>
    ${f.notiz?.trim() ? `<div class="notiz"><b>Notiz</b> ${esc(f.notiz)}</div>` : ""}
    <div class="zeichnung">${zuschnittSvg(a, bl.gruppen, { breite: 276, hoehe: 220, schrift: 10 })}</div>
    <div class="quelle">${q ? `Aus <b>${q.art} ${q.breite}${q.laenge ? " × " + q.laenge : ""} mm</b> · Rest ${f1(q.rest)} mm` : "Breiter als alle Lagerformate"}</div>
    <table class="liste"><thead><tr><th>Kante</th><th>Baustein</th><th class="num">Anschlag</th><th class="num">Winkel</th><th>Richtung</th></tr></thead><tbody>
    ${belegteKanten(bl).map(({ k, g, p }) => p.biegungen.map((b, i) => `<tr><td>${i ? "" : `<b>K${k + 1}</b> <small>${f1(g.laenge)}</small>`}</td><td>${i ? "" : `${esc(p.baustein.name)}<br><small>Zugabe ${f1(p.zugabe)}</small>`}</td>
      <td class="num">${f1(b.anschlag)}</td><td class="num">${f1(Math.abs(b.winkel))}°</td><td>${b.art === "Umschlag" ? "U " : ""}${b.winkel > 0 ? "Sicht" : "hinten"}</td></tr>`).join("")).join("") || '<tr><td colspan="5" class="hinweis">Noch keine Kantenbausteine – «Bearbeiten», dann Kante anklicken.</td></tr>'}
    </tbody></table>
    <p class="hinweis unter">Anschlag ab der Schnittkante des Zuschnitts, je Kante in Reihenfolge der Abkantfolge.</p>
    <div class="reihe"><button class="knopf haupt" id="kFlBearb">Bearbeiten</button><button class="knopf" id="kDxf">DXF speichern</button>${quetschen.map((q, i) => `<button class="knopf" data-qdxf="${i}">DXF ${esc(q.name.replace(/^Quetschfalte .* · /, "Quetschfalte "))}</button>`).join("")}<button class="knopf" id="kDruck">Werkstattblatt drucken</button><button class="knopf" id="kKopie" title="Strg+D">Duplizieren</button></div>`;
  $("kZumDetail").onclick = () => bearbeite(f.eltern);
  $("kFlBearb").onclick = () => bearbeite(f.eltern);
  $("kDxf").onclick = () => herunterladen(`${doc.nr} ${f.name}.dxf`, flaecheDxf(a, f.name), "application/dxf");
  w.querySelectorAll("[data-qdxf]").forEach((bt) => { const q = quetschen[+bt.dataset.qdxf]; bt.onclick = () => herunterladen(`${doc.nr} ${q.name}.dxf`, quetschDxf(q._q.flach, q.name), "application/dxf"); });
  $("kDruck").onclick = () => drucke([f]);
  $("kKopie").onclick = () => dupliziere(f.eltern);
}
function flaechenblatt(f) {
  const bl = f._blech, a = bl.abw, m = material(f.material), q = quelle(a.breite, einst);
  return `<section class="blatt">
    <header>${logoImg()}<div>${kopf("Werkstattblatt")}<h1>${esc(f.name)}</h1></div>
      <dl><dt>Objekt</dt><dd>${esc(doc.objekt)}</dd><dt>Nr.</dt><dd>${esc(doc.nr)}</dd><dt>Datum</dt><dd>${new Date().toLocaleDateString("de-CH")}</dd></dl></header>
    <div class="eckdaten">
      <div><small>Zuschnitt</small><b>${f1(a.breite)} × ${f1(a.laenge)} mm</b></div>
      <div><small>Material</small><b>${esc(m.name)}</b></div>
      <div><small>Stück</small><b>${f.stueck ?? 1}</b></div>
      <div><small>Aus</small><b>${q ? `${q.art} ${q.breite}${q.laenge ? " × " + q.laenge : ""}` : "Sonderformat"}</b></div>
    </div>
    ${f.notiz?.trim() ? `<div class="notiz"><b>Notiz</b> ${esc(f.notiz)}</div>` : ""}
    <div class="grosszeichnung">${zuschnittSvg(a, bl.gruppen, { breite: 640, hoehe: 380, schrift: 14, rand: 40 })}</div>
    <table class="liste"><thead><tr><th>Kante</th><th class="num">Länge</th><th>Baustein</th><th>Abkantfolge</th><th class="num">Zugabe</th><th>Biegungen: Anschlag ab Schnittkante · Winkel</th></tr></thead><tbody>
    ${belegteKanten(bl).map(({ k, g, p }) => `<tr><td>K${k + 1}</td><td class="num">${f1(g.laenge)}</td><td>${esc(p.baustein.name)}</td><td class="folge">${esc(p.baustein.folge)}</td><td class="num">${f1(p.zugabe)}</td>
      <td>${p.biegungen.map((b) => `${f1(b.anschlag)} · ${f1(Math.abs(b.winkel))}° ${b.winkel > 0 ? "Sichtseite" : "hinten"}`).join("<br>")}</td></tr>`).join("")}
    </tbody></table>
    <p class="hinweis">Masse in mm. Zuschnitt mit Eckausklinkungen; Biegelinien rot gestrichelt. Gezeichnete Grundfläche = Falzachse bzw. fertige Kante.</p>
    ${blattFuss()}
  </section>`;
}

// ------------------------------------------------------------ Baustein-Editor: Abkantfolge als Tabelle mit Live-Querschnitt und Zugabe
let bEdit = null; // { b: Arbeitskopie, liste: Ziel (Bibliothek bzw. Entwurf der Einstellungen), fertig(b), mat }
const neuerBaustein = (folgeText = "90 25") => ({ id: "b" + Date.now().toString(36) + Math.random().toString(36).slice(2, 5), name: "Eigener Baustein", gruppe: "Eigene", folge: folgeText, versatz: 0 });
// Abkantfolge ↔ Zeilen { winkel: Zahl | "U+" | "U-", ri, L }: Winkel an der Kante bzw. nach dem vorigen Schenkel, dann Schenkel
function bZeilen(text) {
  const z = folge("100 " + text);
  return z.slice(0, -1).map((x, i) => ({ winkel: x.art === "umschlag" ? (x.winkel < 0 ? "U-" : "U+") : x.winkel, ri: x.ri || "", L: z[i + 1].L }));
}
const bText = (zeilen) => zeilen.map((r) => `${r.winkel}${r.ri ? "r" + r.ri : ""} ${r.L}`).join(" ");
function bausteinEditor(b, liste, fertig) {
  bEdit = { b: JSON.parse(JSON.stringify(b)), liste, fertig, mat: bEdit?.mat || neuMaterial() };
  $("bMeldung").textContent = ""; zeigeBEditor(); $("bEditor").hidden = false;
  $("bInhalt").querySelector("#b_name")?.select();
}
function bVorschau() {
  const { b } = bEdit, m = material(bEdit.mat);
  let p = null, fehler = "";
  try { p = bausteinProfil(b, m); } catch (e) { fehler = e.message; }
  $("bVorschau").innerHTML = p ? bausteinSvg(p, m.t, { breite: 440, hoehe: 230, schrift: 11 }) : "";
  $("bZugabe").innerHTML = p ? `Zugabe <b>${f1(p.zugabe)} mm</b> ab der gezeichneten Kante · ${p.biegungen.length} Biegung${p.biegungen.length === 1 ? "" : "en"} · Anschlag ab Schnittkante ${p.biegungen.map((x) => f1(x.anschlag)).join(" / ")}`
    : `<span class="fehler">⚠ ${esc(fehler || "Abkantfolge fehlt")}</span>`;
  const hinweise = pruefeEignung(b, m); if (p && hinweise.length) $("bZugabe").innerHTML += `<br><span class="fehler">⚠ ${hinweise.map(esc).join(" · ")}</span>`;
}
const bFolgeOk = (b) => folge("100 " + bausteinFolge(b, material(bEdit.mat)));
function zeigeBEditor() {
  const { b, liste } = bEdit;
  let zeilen = []; try { zeilen = bZeilen(b.folge); } catch {}
  const ausdruck = hatAusdruck(b), bd = b.bedingungen || {};
  const gruppen = [...new Set(liste.map((x) => x.gruppe).filter(Boolean))];
  $("bInhalt").innerHTML = `<div class="egitter">
      <label class="feld"><span>Name</span><input id="b_name" data-bf="name" value="${esc(b.name)}"></label>
      <label class="feld"><span>Gruppe</span><input data-bf="gruppe" list="bGruppen" value="${esc(b.gruppe || "")}"><datalist id="bGruppen">${gruppen.map((g) => `<option value="${esc(g)}">`).join("")}</datalist></label>
      <label class="feld"><span>Versatz der Kante (mm)</span><input data-bf="versatz" type="number" step="any" value="${b.versatz || 0}"></label>
      <label class="feld"><span>Partner (gemeinsame Kante)</span><select data-bf="partner"><option value="">–</option>${liste.filter((x) => x.id !== b.id).map((x) => `<option value="${esc(x.id)}" ${b.partner === x.id ? "selected" : ""}>${esc(x.name)}</option>`).join("")}</select></label>
      <label class="feld"><span>Vorschau mit Material</span><select data-bf="mat">${matOpt().map(([id, n]) => `<option value="${id}" ${id === bEdit.mat ? "selected" : ""}>${esc(n)}</option>`).join("")}</select></label>
    </div>
    <div class="bvorschau" id="bVorschau"></div><div class="bzugabe" id="bZugabe"></div>
    ${ausdruck ? '<p class="hinweis">Die Kurzschrift enthält Parameter oder Ausdrücke (z. B. «90 H U+ u+4*t»). Die Tabelle ist dann ausgeblendet – bearbeite die Kurzschrift unten.</p>' : ""}
    <table class="zeilen bfolge" ${ausdruck ? "hidden" : ""}><thead><tr><th>#</th><th>Biegung</th><th>Winkel °</th><th>Radius innen</th><th>Schenkel mm</th><th></th></tr></thead><tbody>
    ${zeilen.map((r, i) => { const u = typeof r.winkel === "string"; return `<tr data-i="${i}"><td>B${i + 1}</td>
      <td><select data-z="art"><option value="ab" ${u ? "" : "selected"}>Abkanten</option><option value="U+" ${r.winkel === "U+" ? "selected" : ""}>Umschlag zur Sichtseite</option><option value="U-" ${r.winkel === "U-" ? "selected" : ""}>Umschlag nach hinten</option></select></td>
      <td>${u ? "180" : `<input data-z="winkel" type="number" step="any" inputmode="decimal" value="${r.winkel}" aria-label="Winkel B${i + 1}">`}</td>
      <td><input data-z="ri" type="number" step="any" inputmode="decimal" value="${r.ri}" placeholder="auto" title="leer = Innenradius des Materials" aria-label="Radius B${i + 1}"></td>
      <td><input data-z="L" type="number" step="any" inputmode="decimal" value="${r.L}" aria-label="Schenkel nach B${i + 1}"></td>
      <td>${zeilen.length > 1 ? `<button class="weg" data-zweg="${i}" aria-label="B${i + 1} entfernen">×</button>` : ""}</td></tr>`; }).join("")}
    </tbody></table>
    <div class="reihe ohnerand" ${ausdruck ? "hidden" : ""}><button class="knopf" data-zneu>+ Biegung und Schenkel</button></div>
    <label class="feld breit"><span>Kurzschrift</span><input id="bText" class="folge" value="${esc(b.folge)}"></label>
    <details ${b.parameter?.length || b.bedingungen ? "open" : ""}><summary>Parameter und Bedingungen (wie Kantenvorlagen im Add-in)</summary>
      <label class="feld breit"><span>Parameter (eine Zeile je Parameter: «H = 25 [10-60] Höhe»)</span><textarea id="bParam" rows="3" class="folge">${esc(parameterText(b.parameter))}</textarea></label>
      <p class="hinweis">In der Kurzschrift als Name oder Ausdruck verwenden, z. B. «90 H U+ u+4*t». Reserviert: t = Materialdicke, ri = Innenradius, k = K-Faktor.</p>
      <div class="egitter">
      <label class="feld"><span>Materialdicke min (mm)</span><input data-bd="dickeMin" type="number" step="any" value="${bd.dickeMin ?? ""}"></label>
      <label class="feld"><span>Materialdicke max (mm)</span><input data-bd="dickeMax" type="number" step="any" value="${bd.dickeMax ?? ""}"></label>
      <label class="feld"><span>Kantenlänge min (mm)</span><input data-bd="kantenMin" type="number" step="any" value="${bd.kantenMin ?? ""}"></label></div></details>
    <p class="hinweis">Die erste Biegung sitzt an der gezeichneten Kante der Fläche. Winkel + biegt zur Sichtseite, − nach hinten. Radius leer = Innenradius des Materials; bei Umschlägen um weitere Lagen grösser wählen.
      Schenkelmasse wie beim freien Profil (bis zur Kante, Umschlag bis Aussenkante). Versatz: Kante liegt so viel weiter aussen (Oberfalz = Blechdicke).</p>`;
  bVorschau();
}
const bZeilenAusTabelle = () => [...$("bInhalt").querySelectorAll("table.bfolge tbody tr")].map((tr) => {
  const art = tr.querySelector('[data-z="art"]').value, w = tr.querySelector('[data-z="winkel"]');
  return { winkel: art === "ab" ? (w ? parseFloat(w.value) || 0 : 90) : art, ri: parseFloat(tr.querySelector('[data-z="ri"]').value) || "", L: parseFloat(tr.querySelector('[data-z="L"]').value) || 0 };
});
$("bInhalt").addEventListener("input", (e) => {
  const t = e.target, b = bEdit?.b; if (!b) return;
  if (t.dataset.bf) { if (t.dataset.bf === "mat") bEdit.mat = t.value; else if (t.dataset.bf === "versatz") b.versatz = parseFloat(t.value) || 0; else if (t.dataset.bf === "partner") b.partner = t.value || undefined; else b[t.dataset.bf] = t.value; return bVorschau(); }
  if (t.id === "bParam") { try { b.parameter = parameterAusText(t.value); t.classList.remove("ungueltig"); $("bMeldung").textContent = ""; } catch (err) { t.classList.add("ungueltig"); $("bMeldung").textContent = err.message; } return bVorschau(); }
  if (t.dataset.bd) { const w = t.value === "" ? null : parseFloat(t.value); b.bedingungen = { ...(b.bedingungen || {}), [t.dataset.bd]: w }; return bVorschau(); }
  if (t.id === "bText") { b.folge = t.value; try { bFolgeOk(b); t.classList.remove("ungueltig"); } catch { t.classList.add("ungueltig"); } return bVorschau(); }
  if (t.dataset.z) { b.folge = bText(bZeilenAusTabelle()); $("bText").value = b.folge; $("bText").classList.remove("ungueltig"); bVorschau(); }
});
$("bInhalt").addEventListener("change", (e) => {
  if (e.target.dataset.z === "art" || e.target.id === "bText") { try { bFolgeOk(bEdit.b); zeigeBEditor(); } catch {} }
});
$("bInhalt").addEventListener("click", (e) => {
  const z = (() => { try { return bZeilen(bEdit.b.folge); } catch { return []; } })();
  if (e.target.dataset.zweg != null) { z.splice(+e.target.dataset.zweg, 1); bEdit.b.folge = bText(z); zeigeBEditor(); }
  else if (e.target.dataset.zneu != null) { z.push({ winkel: 90, ri: "", L: 20 }); bEdit.b.folge = bText(z); zeigeBEditor(); $("bInhalt").querySelector("table.bfolge tr:last-child [data-z=L]")?.focus(); }
});
$("bAbbrechen").onclick = () => { $("bEditor").hidden = true; bEdit = null; };
$("bOk").onclick = () => {
  const { b, liste, fertig } = bEdit;
  try { bFolgeOk(b); } catch (err) { return ($("bMeldung").textContent = "Abkantfolge: " + err.message); }
  try { b.parameter = parameterAusText($("bParam")?.value ?? parameterText(b.parameter)); } catch (err) { return ($("bMeldung").textContent = "Parameter: " + err.message); }
  if (!b.parameter.length) delete b.parameter;
  if (b.bedingungen && Object.values(b.bedingungen).every((x) => x == null || x === "")) delete b.bedingungen;
  if (!b.name.trim()) return ($("bMeldung").textContent = "Bitte einen Namen eingeben.");
  b.name = b.name.trim();
  const i = liste.findIndex((x) => x.id === b.id);
  if (i >= 0) liste[i] = b; else liste.push(b);
  const pt = b.partner && liste.find((x) => x.id === b.partner); if (pt && !pt.partner) pt.partner = b.id; // Gegenstück kennt den neuen Baustein
  $("bEditor").hidden = true; bEdit = null;
  fertig?.(b); status(`Baustein «${b.name}» gespeichert.`);
};

// ------------------------------------------------------------ Konstruieren: Achsen und Punkte (wie in Fusion)
const ACHSEN_ARTEN = { kante: "Achse durch Kante", punkte: "Achse durch zwei Punkte", normal: "Achse senkrecht zur Ebene durch Punkt", ebenen: "Achse als Schnitt zweier Ebenen" };
const PUNKT_ARTEN = { koordinaten: "Punkt mit Koordinaten", mitte: "Punkt in Kantenmitte", zwischen: "Punkt zwischen zwei Punkten", kanteEbene: "Punkt: Kante schneidet Ebene" };
const v3n = (a) => { const l = Math.hypot(...a) || 1; return a.map((x) => x / l); };
const kreuz3 = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const skal3 = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
function baueAchse(f) {
  switch (f.art) {
    case "kante": { const k = bezugKante(f.ref); return { p: k.p, d: v3n(k.d) }; }
    case "punkte": { const a = bezugPunkt(f.p1), b = bezugPunkt(f.p2), d = b.map((v, i) => v - a[i]); if (Math.hypot(...d) < 1e-9) throw new Error("Die Punkte fallen zusammen"); return { p: a, d: v3n(d) }; }
    case "normal": { const e = bezugEbene(f.ref); return { p: bezugPunkt(f.p1), d: v3n(e.n) }; }
    case "ebenen": {
      const a = bezugEbene(f.ref), b = bezugEbene(f.ref2), d = kreuz3(a.n, b.n);
      if (Math.hypot(...d) < 1e-9) throw new Error("Die Ebenen sind parallel");
      // Punkt auf beiden Ebenen: p = (d1 (n2×d) + d2 (d×n1)) / |d|²
      const d1 = skal3(a.n, a.o), d2 = skal3(b.n, b.o), dd = skal3(d, d), x = kreuz3(b.n, d), y = kreuz3(d, a.n);
      return { p: x.map((v, i) => (d1 * v + d2 * y[i]) / dd), d: v3n(d) };
    }
  }
  throw new Error("Unbekannte Achsenart");
}
function bauePunkt(f) {
  switch (f.art) {
    case "koordinaten": return [f.x || 0, f.y || 0, f.z || 0];
    case "mitte": { const k = bezugKante(f.ref); return k.p.map((v, i) => v + k.d[i] / 2); }
    case "zwischen": { const a = bezugPunkt(f.p1), b = bezugPunkt(f.p2); return a.map((v, i) => (v + b[i]) / 2); }
    case "kanteEbene": {
      const k = bezugKante(f.ref), e = bezugEbene(f.ref2), nd = skal3(e.n, k.d);
      if (Math.abs(nd) < 1e-12) throw new Error("Kante ist parallel zur Ebene");
      const t = skal3(e.n, e.o.map((v, i) => v - k.p[i])) / nd; return k.p.map((v, i) => v + k.d[i] * t);
    }
  }
  throw new Error("Unbekannte Punktart");
}
function achsenObjekt(a, id) {
  const l = new THREE.Line(new THREE.BufferGeometry().setFromPoints([V(a.p).addScaledVector(V(a.d), -1500), V(a.p).addScaledVector(V(a.d), 1500)]),
    new THREE.LineDashedMaterial({ color: 0xc77d16, dashSize: 12, gapSize: 6 }));
  l.computeLineDistances(); l.userData.konstruktion = id; return l;
}
function punktObjekt(q, id) {
  const o = new THREE.Points(new THREE.BufferGeometry().setFromPoints([V(q)]), new THREE.PointsMaterial({ color: 0xc77d16, size: 9, sizeAttenuation: false, depthTest: false }));
  o.renderOrder = 12; o.userData.konstruktion = id; return o;
}
function konstruktionDialog(typ, art, f) {
  const istNeu = !f, ARTEN = typ === "achse" ? ACHSEN_ARTEN : PUNKT_ARTEN;
  if (!f) {
    const n = doc.features.filter((x) => x.typ === typ).length + 1;
    f = { id: neueId(), typ, art, name: `${typ === "achse" ? "Achse" : "Punkt"} ${n}`,
      ...({ kante: { ref: "A:Z" }, punkte: { p1: "O", p2: punkteListe()[1]?.[0] || "O" }, normal: { ref: "XY", p1: "O" }, ebenen: { ref: "XY", ref2: "YZ" },
        koordinaten: { x: 0, y: 0, z: 0 }, mitte: { ref: kantenListe()[3]?.[0] || "A:X" }, zwischen: { p1: "O", p2: punkteListe()[1]?.[0] || "O" }, kanteEbene: { ref: "A:Z", ref2: "XY" } })[art] };
  }
  const wahl = (id, label, w, liste) => ({ id, label, wahl: w, optionen: mitWert(liste.length ? liste : [["", "– nichts vorhanden –"]], f[id]), wert: f[id] });
  const felder = (f) => [{ id: "name", label: "Name", text: true, wert: f.name }, ...({
    kante: () => [wahl("ref", "Kante", "kante", kantenListe(f))],
    punkte: () => [wahl("p1", "Punkt 1", "punkt", punkteListe(f)), wahl("p2", "Punkt 2", "punkt", punkteListe(f))],
    normal: () => [wahl("ref", "Ebene", "ebene", ebenenOpt(f)), wahl("p1", "Durch Punkt", "punkt", punkteListe(f))],
    ebenen: () => [wahl("ref", "Erste Ebene", "ebene", ebenenOpt(f)), wahl("ref2", "Zweite Ebene", "ebene", ebenenOpt(f))],
    koordinaten: () => ["x", "y", "z"].map((k) => ({ id: k, label: k.toUpperCase(), einheit: "mm", wert: f[k] ?? 0 })),
    mitte: () => [wahl("ref", "Kante", "kante", kantenListe(f))],
    zwischen: () => [wahl("p1", "Punkt 1", "punkt", punkteListe(f)), wahl("p2", "Punkt 2", "punkt", punkteListe(f))],
    kanteEbene: () => [wahl("ref", "Kante", "kante", kantenListe(f)), wahl("ref2", "Ebene", "ebene", ebenenOpt(f))],
  }[f.art])()];
  const v = (a) => a.map((x) => +x.toFixed(1)).join(" / ");
  featureDialog(f, istNeu, felder, (f, w) => Object.assign(f, w, { name: w.name?.trim() || f.name }), ARTEN[f.art],
    "Bezüge in der Ansicht anklicken oder in der Liste wählen. Achsen und Punkte stehen danach in allen Bezugslisten (Ebenen, weitere Achsen/Punkte).",
    { info: () => (f._fehler ? "⚠ " + f._fehler : f._achse ? `Durch ${v(f._achse.p)} · Richtung ${v(f._achse.d.map((x) => x * 1))}` : f._punkt ? `Punkt ${v(f._punkt)}` : "") });
}

// ------------------------------------------------------------ Körper: Abrunden/Fasen, Schale, Muster, Spiegeln, Verschieben/Kopieren (wie in Fusion)
// Ecken einer Kontur runden (r > 0) oder fasen (fase > 0); nur echte Ecken (Knick > 20°), Bögen bleiben
function eckenBearbeiten(p, { r = 0, fase = 0 }) {
  const n = p.length, knick = (i) => Math.abs(drehung(p, i));
  if (r > 0) { const radien = {}; for (let i = 0; i < n; i++) if (knick(i) > 20) radien[i] = r; return rundePolylinie(p, radien, true); }
  if (!(fase > 0)) return p;
  const out = [];
  for (let i = 0; i < n; i++) {
    if (knick(i) <= 20) { out.push(p[i]); continue; }
    const a = p[(i - 1 + n) % n], b = p[i], c = p[(i + 1) % n], la = abst(a, b), lc = abst(b, c), d = Math.min(fase, la / 2, lc / 2);
    out.push([b[0] + ((a[0] - b[0]) / la) * d, b[1] + ((a[1] - b[1]) / la) * d], [b[0] + ((c[0] - b[0]) / lc) * d, b[1] + ((c[1] - b[1]) / lc) * d]);
  }
  return out;
}
function gerundeteExtrusion(s, f, kr) {
  const senk = kr.find((k) => k.kanten !== "quer"), quer = kr.find((k) => k.kanten !== "senkrecht");
  const opt = (k) => (k ? (k.art === "fase" ? { fase: k.mass } : { r: k.mass }) : {});
  let fs = formen(s, { aussenFn: (p) => eckenBearbeiten(p, opt(senk)), lochFn: (p) => eckenBearbeiten(p, opt(senk)) }, f);
  if (!quer) return koerperGeometrie(fs, s.ebene, zweiseitig(f, "abstand", "abstand2").tiefe, zweiseitig(f, "abstand", "abstand2").richtung);
  const m = Math.min(quer.mass, Math.abs(zweiseitig(f, "abstand", "abstand2").tiefe) / 2 - 0.01); if (!(m > 0)) return koerperGeometrie(fs, s.ebene, zweiseitig(f, "abstand", "abstand2").tiefe, zweiseitig(f, "abstand", "abstand2").richtung);
  // Oben/unten: Kontur um m einziehen, dann mit Fase bzw. Rundung (Bevel) wieder auf die volle Grösse
  fs = formen(s, { aussenFn: (p) => versatzPolylinie(eckenBearbeiten(p, opt(senk)), m, true), lochFn: (p) => versatzPolylinie(eckenBearbeiten(p, opt(senk)), -m, true) }, f);
  const geo = new THREE.ExtrudeGeometry(fs, { depth: Math.abs(zweiseitig(f, "abstand", "abstand2").tiefe) - 2 * m, bevelEnabled: true, bevelThickness: m, bevelSize: m, bevelOffset: 0, bevelSegments: quer.art === "fase" ? 1 : 6, curveSegments: 48 });
  geo.translate(0, 0, m);
  const zw = zweiseitig(f, "abstand", "abstand2"), t = Math.abs(zw.tiefe); geo.translate(0, 0, -rueckVersatz(zw.richtung, t));
  geo.applyMatrix4(basis(s.ebene)); return geo;
}
// Schale: Innenraum = Kontur um die Wanddicke eingezogen (Löcher erweitert), Boden/Deckel bleiben je nach «offen»
function schalenWerkzeug(z, f) {
  const s = finde(z.skizze), d = f.dicke > 0 ? f.dicke : 2, t = Math.abs(zweiseitig(z, "abstand", "abstand2").tiefe);
  const fs = formen(s, { aussenFn: (p) => versatzPolylinie(p, d, true), lochFn: (p) => versatzPolylinie(p, -d, true) }, z);
  let z0 = d, z1 = t - d;
  if (f.offen === "oben" || f.offen === "beide") z1 = t + 1;
  if (f.offen === "unten" || f.offen === "beide") z0 = -1;
  if (z1 - z0 <= 0) throw new Error("Wanddicke zu gross");
  const geo = new THREE.ExtrudeGeometry(fs, { depth: z1 - z0, bevelEnabled: false, curveSegments: 48 }); geo.translate(0, 0, z0);
  geo.translate(0, 0, -rueckVersatz(zweiseitig(z, "abstand", "abstand2").richtung, t));
  geo.applyMatrix4(basis(s.ebene)); return geo;
}
// Körper eines Features in der Szene (auch Blechteile «id:n») und als Volumenkörper
// ---- Weitere Körperwerkzeuge (wie in Fusion): Skalieren, Bohrung, Rohr, Spirale, Rippe ----
// ---- Biegung an frei gezeichneter Linie (Flächenblech): Blech entlang einer Skizzenlinie um einen Winkel biegen ----
const BLECH_WZ = { biegung: "Biegung an Linie", rip: "Rip (Auftrennen)" };
const polyKlipp = (poly, nx, ny, c) => { // behält den Teil mit nx·x + ny·y − c ≥ 0 (Sutherland–Hodgman)
  const out = [], n = poly.length; for (let i = 0; i < n; i++) { const a = poly[i], b = poly[(i + 1) % n], da = nx * a[0] + ny * a[1] - c, db = nx * b[0] + ny * b[1] - c;
    if (da >= 0) out.push(a); if ((da > 0 && db < 0) || (da < 0 && db > 0)) { const t = da / (da - db); out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]); } } return out;
};
function unterteile(geo, h) { // Dreiecke so lange teilen, bis keine Kante länger als h ist (für die Biegezone)
  const a = geo.index ? geo.toNonIndexed() : geo, P = a.attributes.position.array, out = [], mid = (A, B) => [(A[0] + B[0]) / 2, (A[1] + B[1]) / 2, (A[2] + B[2]) / 2], dist = (A, B) => Math.hypot(A[0] - B[0], A[1] - B[1], A[2] - B[2]);
  const tri = (A, B, C, d) => { const ab = dist(A, B), bc = dist(B, C), ca = dist(C, A), m = Math.max(ab, bc, ca); if (m <= h || d > 40) { out.push(...A, ...B, ...C); return; }
    if (ab >= bc && ab >= ca) { const M = mid(A, B); tri(A, M, C, d + 1); tri(M, B, C, d + 1); } else if (bc >= ca) { const M = mid(B, C); tri(A, B, M, d + 1); tri(A, M, C, d + 1); } else { const M = mid(C, A); tri(A, B, M, d + 1); tri(M, B, C, d + 1); } };
  for (let i = 0; i + 8 < P.length; i += 9) tri([P[i], P[i + 1], P[i + 2]], [P[i + 3], P[i + 4], P[i + 5]], [P[i + 6], P[i + 7], P[i + 8]], 0);
  const r = new THREE.BufferGeometry(); r.setAttribute("position", new THREE.Float32BufferAttribute(out, 3)); return r;
}
function biegungOp(f) {
  const z = finde(f.ziel); if (z?.typ !== "flaeche" || !z._bleche?.length) throw new Error("Flächenblech fehlt"); if (doc.features.indexOf(z) > doc.features.indexOf(f)) throw new Error("Das Flächenblech muss vor diesem Schritt stehen");
  const bl = z._bleche[Math.min(+f.blech || 0, z._bleche.length - 1)];
  if (bl.profile.some(Boolean)) throw new Error("Biegung an Linie: das Blech darf keine Kantenbausteine haben (erst die Biegung, Flansche an den Kanten danach nicht möglich)");
  const sk = finde(f.skizze); if (!sk) throw new Error("Skizze mit der Biegelinie fehlt"); const el = sk.elemente.find((e) => e.art === "linie" && e.pts?.length >= 2); if (!el) throw new Error("In der Skizze eine Linie zeichnen – sie ist die Biegelinie");
  const m = material(z.material), t = m.t, ri = +f.radius > 0 ? +f.radius : m.ri, kf = m.k, alpha = ((+f.winkel || 0) * Math.PI) / 180; if (!alpha) throw new Error("Biegewinkel angeben");
  const skZ = finde(z.skizze), Ez = E_(skZ.ebene), lok = (p) => zuLokal(Ez, zuWeltK(E_(sk.ebene), p)), P0 = lok(el.pts[0]), P1 = lok(el.pts[1]);
  const L = Math.hypot(P1[0] - P0[0], P1[1] - P0[1]); if (L < 1e-6) throw new Error("Die Biegelinie ist zu kurz"); const dx = (P1[0] - P0[0]) / L, dy = (P1[1] - P0[1]) / L, nx = -dy, ny = dx, a_ = Math.abs(alpha), sgn = Math.sign(alpha) * (f.richtung === "hinten" ? -1 : 1);
  const R = ri + kf * t, BA = a_ * R, zn = t / 2 - kf * t, cu = nx * P0[0] + ny * P0[1], poly = bl.pts;
  const A = polyKlipp(poly, -nx, -ny, -(cu - BA / 2)), B = polyKlipp(poly, nx, ny, cu + BA / 2), S = polyKlipp(polyKlipp(poly, nx, ny, cu - BA / 2), -nx, -ny, -(cu + BA / 2));
  if (A.length < 3 || B.length < 3) throw new Error("Die Biegelinie muss das Blech ganz durchschneiden");
  const ext = (poly2) => { if (poly2.length < 3) return null; const g = new THREE.ExtrudeGeometry(new THREE.Shape(poly2.map(([x, y]) => new THREE.Vector2(x, y))), { depth: t, bevelEnabled: false }); g.translate(0, 0, -t / 2); return g.index ? g.toNonIndexed() : g; };
  const gs = [ext(A), ext(B)].filter(Boolean), gb = ext(S); if (gb) gs.push(unterteile(gb, Math.max(0.3, BA / 10)));
  const geo = mergeGeos(gs), pos = geo.attributes.position, ctrB = zn + R;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), zz = pos.getZ(i), u = nx * (x - P0[0]) + ny * (y - P0[1]), v = dx * (x - P0[0]) + dy * (y - P0[1]), zs = sgn * zz; let a, b;
    if (u <= -BA / 2) { a = u; b = zs; } else { const th = Math.min((u + BA / 2) / R, a_), rz = ri + t / 2 - zs; a = -BA / 2 + rz * Math.sin(th); b = ctrB - rz * Math.cos(th); if (u > BA / 2) { const e = u - BA / 2; a += e * Math.cos(a_); b += e * Math.sin(a_); } }
    pos.setXYZ(i, P0[0] + dx * v + nx * a, P0[1] + dy * v + ny * a, sgn * b);
  }
  geo.computeVertexNormals(); geo.applyMatrix4(basis(blechEbene(skZ.ebene, z, m)));
  const fid = `${z.id}:${bl.pi}`; for (const o of modell.children.filter((o) => o.isMesh && o.userData.fid === fid)) { modell.remove(o); o.traverse((c) => c.geometry?.dispose()); }
  if (!f.versteckt) modell.add(koerperAusGeo(geo, darstellungVon(z, m), fid));
  // Abwicklung: die beiden Biegelinien (Anfang/Ende der Biegezone) einzeichnen und in die Biegeliste aufnehmen
  const vs = poly.map(([x, y]) => dx * (x - P0[0]) + dy * (y - P0[1])), v0 = Math.min(...vs), v1 = Math.max(...vs);
  for (const off of [-BA / 2, BA / 2]) bl.abw.linien.push({ kante: -1, nr: 0, art: "biegung", punkte: [[P0[0] + dx * v0 + nx * off, P0[1] + dy * v0 + ny * off], [P0[0] + dx * v1 + nx * off, P0[1] + dy * v1 + ny * off]] });
  const teil = z._teile?.[0]; if (teil) { teil._res.biegungen = [...teil._res.biegungen, { nr: teil._res.biegungen.length + 1, pos: BA / 2 + (cu - Math.min(...poly.map(([x, y]) => nx * x + ny * y))), winkel: (alpha * 180) / Math.PI * (f.richtung === "hinten" ? -1 : 1), art: "Abkanten", richtung: sgn > 0 ? "oben" : "unten", ri }]; }
  f._biege = { BA, R, ri, winkel: (alpha * 180) / Math.PI };
}
function ripOp(f) { // Rip: Blech entlang einer Skizzenlinie auftrennen (Schlitz der Breite «Spalt»), damit z. B. Ecken ohne Zwang falten
  const z = finde(f.ziel); if (z?.typ !== "flaeche" || !z._bleche?.length) throw new Error("Flächenblech fehlt"); if (doc.features.indexOf(z) > doc.features.indexOf(f)) throw new Error("Das Flächenblech muss vor diesem Schritt stehen");
  const sk = finde(f.skizze); if (!sk) throw new Error("Skizze mit der Trennlinie fehlt"); const el = sk.elemente.find((e) => e.art === "linie" && e.pts?.length >= 2); if (!el) throw new Error("In der Skizze eine Linie zeichnen – entlang ihr wird aufgetrennt");
  const m = material(z.material), t = m.t, gap = Math.max(0.05, +f.spalt || 0.5), skZ = finde(z.skizze), Ez = E_(skZ.ebene), lok = (p) => zuLokal(Ez, zuWeltK(E_(sk.ebene), p)), A = lok(el.pts[0]), B = lok(el.pts.at(-1));
  const L = Math.hypot(B[0] - A[0], B[1] - A[1]); if (L < 1e-6) throw new Error("Die Trennlinie ist zu kurz"); const nx = -(B[1] - A[1]) / L * gap / 2, ny = (B[0] - A[0]) / L * gap / 2;
  const rechteck = [[A[0] + nx, A[1] + ny], [B[0] + nx, B[1] + ny], [B[0] - nx, B[1] - ny], [A[0] - nx, A[1] - ny]];
  const g = new THREE.ExtrudeGeometry(new THREE.Shape(rechteck.map(([x, y]) => new THREE.Vector2(x, y))), { depth: 4 * t + 2, bevelEnabled: false }); g.translate(0, 0, -(2 * t + 1)); g.applyMatrix4(basis(blechEbene(skZ.ebene, z, m)));
  for (const o of modell.children.filter((o) => o.isMesh && (o.userData.fid === z.id || String(o.userData.fid).startsWith(z.id + ":")))) verknuepfe(o, g, "ausschneiden");
  const bl = z._bleche[0]; bl.abw.loecher = [...(bl.abw.loecher || []), rechteck]; bl.abw.linien.push({ kante: -1, nr: 0, art: "rip", punkte: [A, B] }); f._rip = { laenge: L, spalt: gap };
}
// ---- Lofted Flange: Blechfläche zwischen zwei offenen Profilen (Linienzügen), Dicke aus dem Material, mit genäherter Abwicklung ----
function loftflanschBau(f) {
  const m = material(f.material), t = m.t, holen = (id, k, nr) => { const sk = finde(id); if (!sk) throw new Error(`Profilskizze ${nr} fehlt`); const kt = ketten(sk)[k || 0]; if (!kt) throw new Error(`Skizze ${nr} hat keinen offenen Linienzug`); return kt.pts.map((p) => zu3D(sk.ebene, p)); };
  if (f.profil1 === f.profil2 && (f.kette1 || 0) === (f.kette2 || 0)) throw new Error("Zwei verschiedene Profile wählen");
  const A = holen(f.profil1, f.kette1, 1), B = holen(f.profil2, f.kette2, 2), par = (P) => { const L = [0]; for (let i = 1; i < P.length; i++) L.push(L[i - 1] + P[i].distanceTo(P[i - 1])); const tot = L.at(-1) || 1; return L.map((v) => v / tot); };
  const pa = par(A), pb = par(B), us = [...new Set([...pa, ...pb].map((v) => +v.toFixed(6)))].sort((x, y) => x - y);
  const bei = (P, pr, u) => { for (let i = 1; i < pr.length; i++) if (u <= pr[i] + 1e-9) return P[i - 1].clone().lerp(P[i], Math.min(1, (u - pr[i - 1]) / Math.max(pr[i] - pr[i - 1], 1e-12))); return P.at(-1).clone(); };
  const J = us.length - 1, M = Math.max(4, Math.round(+f.teilung || 12)), g = []; for (let i = 0; i <= M; i++) g.push(us.map((u) => bei(A, pa, u).lerp(bei(B, pb, u), i / M)));
  if (J < 1) throw new Error("Profile zu kurz");
  const nrm = (i, j) => { const tu = g[i][Math.min(J, j + 1)].clone().sub(g[i][Math.max(0, j - 1)]), tv = g[Math.min(M, i + 1)][j].clone().sub(g[Math.max(0, i - 1)][j]); return tu.cross(tv).normalize(); };
  const N = g.map((r, i) => r.map((_, j) => nrm(i, j))), versch = f.lage === "vorne" ? t / 2 : f.lage === "hinten" ? -t / 2 : 0, sg = f.sichtseite === -1 ? -1 : 1, pos = [];
  const top = (i, j) => g[i][j].clone().addScaledVector(N[i][j], sg * (t / 2 + versch)), bot = (i, j) => g[i][j].clone().addScaledVector(N[i][j], sg * (-t / 2 + versch));
  const tri = (a, b, c, aussen) => { const n = b.clone().sub(a).cross(c.clone().sub(a)); if (n.dot(aussen) < 0) [b, c] = [c, b]; pos.push(...a.toArray(), ...b.toArray(), ...c.toArray()); };
  const quad = (a, b, c, d, aussen) => { tri(a, b, c, aussen); tri(a, c, d, aussen); };
  for (let i = 0; i < M; i++) for (let j = 0; j < J; j++) {
    const nT = N[i][j].clone().multiplyScalar(sg), nB = nT.clone().negate();
    quad(top(i, j), top(i, j + 1), top(i + 1, j + 1), top(i + 1, j), nT); quad(bot(i, j), bot(i, j + 1), bot(i + 1, j + 1), bot(i + 1, j), nB);
    if (j === 0) quad(top(i, 0), top(i + 1, 0), bot(i + 1, 0), bot(i, 0), g[i][0].clone().sub(g[i][1])); if (j === J - 1) quad(top(i, J), top(i + 1, J), bot(i + 1, J), bot(i, J), g[i][J].clone().sub(g[i][J - 1]));
    if (i === 0) quad(top(0, j), top(0, j + 1), bot(0, j + 1), bot(0, j), g[0][j].clone().sub(g[1][j])); if (i === M - 1) quad(top(M, j), top(M, j + 1), bot(M, j + 1), bot(M, j), g[M][j].clone().sub(g[M - 1][j]));
  }
  const geo = new THREE.BufferGeometry(); geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); geo.computeVertexNormals();
  // Abwicklung: Dreiecke der Reihe nach in die Ebene klappen (für nicht abwickelbare Flächen eine Näherung)
  const f2 = (x, y) => ({ x, y }), plan = g.map((r) => r.map(() => null)); let x = 0; plan[0][0] = f2(0, 0);
  for (let j = 1; j <= J; j++) { x += g[0][j].distanceTo(g[0][j - 1]); plan[0][j] = f2(x, 0); }
  const platz = (P, Q, dP, dQ, seite) => { const dx = Q.x - P.x, dy = Q.y - P.y, d = Math.hypot(dx, dy) || 1e-9, a = (dP * dP - dQ * dQ + d * d) / (2 * d), h = Math.sqrt(Math.max(0, dP * dP - a * a)); return f2(P.x + (a * dx) / d + (seite * -dy * h) / d, P.y + (a * dy) / d + (seite * dx * h) / d); };
  for (let i = 1; i <= M; i++) for (let j = 0; j <= J; j++) {
    if (j === 0) plan[i][0] = platz(plan[i - 1][0], plan[i - 1][1], g[i][0].distanceTo(g[i - 1][0]), g[i][0].distanceTo(g[i - 1][1]), 1);
    else plan[i][j] = platz(plan[i][j - 1], plan[i - 1][j], g[i][j].distanceTo(g[i][j - 1]), g[i][j].distanceTo(g[i - 1][j]), -1);
  }
  const rand = []; for (let i = 0; i <= M; i++) rand.push(plan[i][0]); for (let j = 1; j <= J; j++) rand.push(plan[M][j]); for (let i = M - 1; i >= 0; i--) rand.push(plan[i][J]); for (let j = J - 1; j >= 1; j--) rand.push(plan[0][j]);
  const umriss = rand.map((q) => [q.x, q.y]), xs = umriss.map((q) => q[0]), ys = umriss.map((q) => q[1]), flaeche = Math.abs(umriss.reduce((a, q, i) => { const r = umriss[(i + 1) % umriss.length]; return a + q[0] * r[1] - r[0] * q[1]; }, 0) / 2);
  const biege = []; for (let j = 1; j < J; j++) { const a = A.length > 2, kn = us[j]; if (pa.some((v) => Math.abs(v - kn) < 1e-5) || pb.some((v) => Math.abs(v - kn) < 1e-5)) biege.push({ kante: -1, nr: biege.length + 1, art: "Abkanten", punkte: plan.map((r) => [r[j].x, r[j].y]) }); }
  const abw = { umriss, linien: biege, drehung: 0, laenge: Math.max(...xs) - Math.min(...xs), breite: Math.max(...ys) - Math.min(...ys), flaeche: flaeche / 1e6, dreh: (p) => p, loecher: [] };
  return { geo, abw, m };
}
const KOERPER_WZ2 = { skalieren: "Skalieren", bohrung: "Bohrung", rohr: "Rohr", spirale: "Spirale", rippe: "Rippe" };
const csgGeo = (a, b, op) => { const A = new Brush(nurPos(a)), B = new Brush(nurPos(b)); A.updateMatrixWorld(); B.updateMatrixWorld(); return csg.evaluate(A, B, op).geometry; };
const vereinigeGeos = (liste) => liste.slice(1).reduce((acc, g) => csgGeo(acc, g, ADDITION), liste[0]);
function zylinderZwischen(a, b, r, seg = 24) { // Zylinder von Punkt a nach Punkt b
  const d = b.clone().sub(a), L = d.length(); if (L < 1e-9) return null; const g = new THREE.CylinderGeometry(r, r, L, seg); g.translate(0, L / 2, 0);
  g.applyMatrix4(new THREE.Matrix4().makeRotationFromQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize())).setPosition(a)); return g;
}
function bohrungOp(f, volumen) {
  const s = finde(f.skizze); if (!s) throw new Error("Skizze mit Punkten fehlt");
  const pts = s.elemente.filter((e) => e.art === "punkt" || e.art === "kreis").map((e) => (e.art === "punkt" ? e.p : e.c)); if (!pts.length) throw new Error("In der Skizze Punkte setzen (Werkzeug «Punkt») – dort wird gebohrt");
  const quellen = koerperVon(f.ziel, volumen); if (!quellen.length) { if (finde(f.ziel)?.versteckt) return; throw new Error("Körper fehlt (ausgeblendet, unterdrückt oder noch nicht da)"); }
  const E = E_(s.ebene), n = V(E.n).normalize(), dir = f.seite === "normale" ? n : n.clone().negate(), bb = new THREE.Box3(); quellen.forEach((q) => bb.expandByObject(q));
  const d = +f.d, r = d / 2, L = f.durch ? bb.getSize(new THREE.Vector3()).length() * 2 + 10 : +f.tiefe, dS = +f.dSenk || d * 2, tS = +f.tSenk || d, w = ((+f.winkel || 90) * Math.PI) / 360;
  if (!(d > 0) || !(L > 0)) throw new Error("Durchmesser und Tiefe müssen grösser als 0 sein");
  const geos = [];
  for (const p of pts) {
    const P = zu3D(s.ebene, p), A = P.clone().addScaledVector(dir, -1); // 1 mm ausserhalb starten: sauberer Schnitt
    geos.push(zylinderZwischen(A, P.clone().addScaledVector(dir, L), r));
    if (f.art === "senkung") geos.push(zylinderZwischen(A, P.clone().addScaledVector(dir, tS), dS / 2));
    if (f.art === "kegel" && dS > d) { const h = (dS - d) / 2 / Math.tan(w), g = new THREE.CylinderGeometry(r, dS / 2, h, 32); g.translate(0, h / 2, 0); g.applyMatrix4(new THREE.Matrix4().makeRotationFromQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir)).setPosition(P)); geos.push(g, zylinderZwischen(A, P, dS / 2)); }
  }
  for (const q of quellen) for (const g of geos.filter(Boolean)) verknuepfe(q, g, "ausschneiden");
}
function rohrGeometrie(f) {
  const s = finde(f.skizze); if (!s) throw new Error("Skizze fehlt"); const kette = ketten(s)[f.kette || 0]; if (!kette) throw new Error("Skizze hat keinen offenen Linienzug (Pfad des Rohrs)");
  const P = kette.pts.map((p) => zu3D(s.ebene, p)), R = (+f.d || 0) / 2, ri = f.wand > 0 ? R - f.wand : 0; if (!(R > 0)) throw new Error("Durchmesser muss grösser als 0 sein"); if (f.wand > 0 && !(ri > 0)) throw new Error("Wanddicke muss kleiner als der Radius sein");
  const koerper = (rr, ueber = 0) => { const l = []; for (let i = 1; i < P.length; i++) { const d = P[i].clone().sub(P[i - 1]).normalize(), a = P[i - 1].clone().addScaledVector(d, -ueber), b = P[i].clone().addScaledVector(d, ueber); l.push(zylinderZwischen(a, b, rr)); if (i > 1) { const k = new THREE.SphereGeometry(rr, 24, 16); k.translate(P[i - 1].x, P[i - 1].y, P[i - 1].z); l.push(k); } } return vereinigeGeos(l.filter(Boolean)); };
  const aussen = koerper(R); return ri > 0 ? csgGeo(aussen, koerper(ri, 1), SUBTRACTION) : aussen;
}
function mergeGeos(liste) { // einfache Zusammenfassung nicht indexierter Geometrien
  const pos = []; for (const g of liste) { const n = g.index ? g.toNonIndexed() : g, a = n.attributes.position.array; for (let i = 0; i < a.length; i++) pos.push(a[i]); }
  const r = new THREE.BufferGeometry(); r.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); r.computeVertexNormals(); return r;
}
function spiraleGeometrie(f) {
  const D = +f.dm, steig = +f.steigung, n = +f.windungen, r = (+f.draht || 0) / 2; if (!(D > 0 && steig > 0 && n > 0 && r > 0)) throw new Error("Durchmesser, Steigung, Windungen und Drahtstärke müssen grösser als 0 sein");
  const N = Math.max(24, Math.round(n * 48)), pts = []; for (let i = 0; i <= N; i++) { const a = (i / N) * n * 2 * Math.PI; pts.push(new THREE.Vector3((D / 2) * Math.cos(a), (steig * a) / (2 * Math.PI), (D / 2) * Math.sin(a))); }
  const kurve = new THREE.CatmullRomCurve3(pts, false, "centripetal"), rohr = new THREE.TubeGeometry(kurve, N * 2, r, 16, false), kappen = [];
  for (const [t, ri] of [[0, 0], [1, 1]]) { const c = new THREE.CircleGeometry(r, 16), tg = kurve.getTangentAt(t), q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), ri ? tg : tg.clone().negate()); c.applyMatrix4(new THREE.Matrix4().makeRotationFromQuaternion(q).setPosition(kurve.getPointAt(t))); kappen.push(c); }
  const g = mergeGeos([rohr, ...kappen]); const ax = f.achse || "Y", M = new THREE.Matrix4();
  if (ax === "X") M.makeRotationZ(-Math.PI / 2); else if (ax === "Z") M.makeRotationX(Math.PI / 2);
  M.setPosition(+f.x || 0, +f.y || 0, +f.z || 0); g.applyMatrix4(M); return g;
}
function rippeGeometrie(f) {
  const s = finde(f.skizze); if (!s) throw new Error("Skizze fehlt"); const kette = ketten(s)[f.kette || 0]; if (!kette) throw new Error("Skizze hat keinen offenen Linienzug (Verlauf der Rippe)");
  const dk = +f.dicke, h = +f.hoehe; if (!(dk > 0 && h > 0)) throw new Error("Dicke und Höhe müssen grösser als 0 sein");
  const geos = []; for (let i = 1; i < kette.pts.length; i++) {
    const a = kette.pts[i - 1], b = kette.pts[i], l = Math.hypot(b[0] - a[0], b[1] - a[1]); if (l < 1e-9) continue; const nx = -(b[1] - a[1]) / l * dk / 2, ny = (b[0] - a[0]) / l * dk / 2, ex = (b[0] - a[0]) / l * dk / 2, ey = (b[1] - a[1]) / l * dk / 2;
    const sh = new THREE.Shape([[a[0] - ex + nx, a[1] - ey + ny], [b[0] + ex + nx, b[1] + ey + ny], [b[0] + ex - nx, b[1] + ey - ny], [a[0] - ex - nx, a[1] - ey - ny]].map(([x, y]) => new THREE.Vector2(x, y)));
    const g = new THREE.ExtrudeGeometry(sh, { depth: h, bevelEnabled: false }); g.translate(0, 0, -rueckVersatz(f.richtung || "eine", h)); g.applyMatrix4(basis(s.ebene)); geos.push(g);
  }
  if (!geos.length) throw new Error("Der Linienzug ist zu kurz"); return vereinigeGeos(geos);
}
const koerperVon = (id, volumen) => {
  const l = modell.children.filter((o) => o.isMesh && (o.userData.fid === id || String(o.userData.fid).startsWith(id + ":")));
  const v = volumen.get(id); if (v && !l.includes(v)) l.push(v);
  return l;
};
function transformAus(f, k) {
  const M = new THREE.Matrix4();
  if (f.typ === "skalieren") { const bb = new THREE.Box3(); koerperVon(f.ziel, new Map()).forEach((q) => bb.expandByObject(q)); const c = f.mitte === "ursprung" || bb.isEmpty() ? new THREE.Vector3() : bb.getCenter(new THREE.Vector3()), k0 = +f.faktor; if (!(k0 > 0)) throw new Error("Faktor muss grösser als 0 sein");
    return new THREE.Matrix4().makeTranslation(c.x, c.y, c.z).multiply(new THREE.Matrix4().makeScale(k0, k0, k0)).multiply(new THREE.Matrix4().makeTranslation(-c.x, -c.y, -c.z)); }
  if (f.typ === "bewegen") {
    M.makeTranslation(f.dx || 0, f.dy || 0, f.dz || 0);
    if (f.winkel && f.achse) { const a = bezugKante(f.achse), p = V(a.p), d = V(a.d).normalize(); M.multiply(new THREE.Matrix4().makeTranslation(p.x, p.y, p.z).multiply(new THREE.Matrix4().makeRotationAxis(d, (f.winkel * Math.PI) / 180)).multiply(new THREE.Matrix4().makeTranslation(-p.x, -p.y, -p.z))); }
    return M;
  }
  if (f.typ === "kspiegel") { const e = bezugEbene(f.ebene), n = V(e.n).normalize(), d = n.dot(V(e.o)); return new THREE.Matrix4().set(1 - 2 * n.x * n.x, -2 * n.x * n.y, -2 * n.x * n.z, 2 * d * n.x, -2 * n.y * n.x, 1 - 2 * n.y * n.y, -2 * n.y * n.z, 2 * d * n.y, -2 * n.z * n.x, -2 * n.z * n.y, 1 - 2 * n.z * n.z, 2 * d * n.z, 0, 0, 0, 1); }
  if (f.art === "pfad") { // Muster entlang eines Pfads (offener Linienzug einer Skizze): Kopien in gleichen Abständen, Lage relativ zum Pfadanfang
    const sk = finde(f.pfadSkizze), kt = sk && ketten(sk)[f.pfadKette || 0]; if (!kt) throw new Error("Pfad (offener Linienzug) fehlt");
    const P = kt.pts.map((p) => zu3D(sk.ebene, p)), Ls = [0]; for (let i = 1; i < P.length; i++) Ls.push(Ls[i - 1] + P[i].distanceTo(P[i - 1])); const n = Math.max(2, Math.round(f.anzahl || 2)), ziel = (Ls.at(-1) * k) / (n - 1);
    let i = 1; while (i < Ls.length - 1 && Ls[i] < ziel) i++; const q = P[i - 1].clone().lerp(P[i], Math.min(1, (ziel - Ls[i - 1]) / Math.max(Ls[i] - Ls[i - 1], 1e-9))); return new THREE.Matrix4().makeTranslation(q.x - P[0].x, q.y - P[0].y, q.z - P[0].z); }
  if (f.art === "kreis") { const a = bezugKante(f.achse), p = V(a.p), d = V(a.d).normalize(), voll = Math.abs(Math.abs(f.winkel ?? 360) - 360) < 1e-6, w = (((f.winkel ?? 360) * Math.PI) / 180) / (voll ? f.anzahl : Math.max(1, f.anzahl - 1)) * k;
    return new THREE.Matrix4().makeTranslation(p.x, p.y, p.z).multiply(new THREE.Matrix4().makeRotationAxis(d, w)).multiply(new THREE.Matrix4().makeTranslation(-p.x, -p.y, -p.z)); }
  const d1 = V(bezugKante(f.richtung1 || "A:X").d).normalize(), n1 = Math.max(1, Math.round(f.anzahl || 2)), i = k % n1, j = Math.floor(k / n1);
  const v = d1.multiplyScalar((f.abstand || 0) * i);
  if (f.anzahl2 > 1) v.add(V(bezugKante(f.richtung2 || "A:Z").d).normalize().multiplyScalar((f.abstand2 || 0) * j));
  return M.makeTranslation(v.x, v.y, v.z);
}
// Teilen: Körper oder Blech (Netz) an einer Ebene in zwei Teile schneiden; behalten = beide / nur die Seite der Ebenen-Normale / nur die Gegenseite
function koerperTeilen(f, volumen, flachStand = new Map()) {
  if (flachStand.has(f.ziel)) throw new Error("Teilen an der Abwicklung ist noch nicht möglich – Ausschnitte mit «Extrudieren › Ausschneiden», danach «Falten»");
  const quellen = koerperVon(f.ziel, volumen); if (!quellen.length && finde(f.ziel)?.versteckt) return;
  if (!quellen.length) throw new Error("Körper fehlt (ausgeblendet, unterdrückt oder noch nicht da)");
  const e = bezugEbene(f.ebene), S = 20000, M = new THREE.Matrix4().makeBasis(V(e.u), V(e.v), V(e.n)).setPosition(V(e.o));
  const seite = (s) => { const g = new THREE.BoxGeometry(S, S, S); g.translate(0, 0, s * S / 2); g.applyMatrix4(M); return g; };
  const wo = f.behalten === "oben" ? [1] : f.behalten === "unten" ? [-1] : [1, -1];
  quellen.forEach((q, n) => {
    const a = new Brush(nurPos(q.geometry)); a.updateMatrixWorld();
    const teile = wo.map((s) => { const b = new Brush(seite(s)); b.updateMatrixWorld(); return csg.evaluate(a, b, INTERSECTION).geometry; });
    if (teile.some((g) => !g.attributes.position?.count)) { if (teile.length === 1) throw new Error("Auf dieser Seite der Ebene ist nichts vom Körper"); }
    const ok = teile.filter((g) => g.attributes.position?.count);
    if (!ok.length) throw new Error("Die Ebene schneidet den Körper nicht");
    if (ok.length < teile.length && wo.length === 2) { status("Die Ebene liegt ausserhalb des Körpers – nichts geteilt."); return; }
    q.geometry.dispose(); q.geometry = ok[0]; const k0 = q.children[0]; if (k0) { k0.geometry.dispose(); k0.geometry = kantenGeometrie(ok[0]); }
    if (ok[1]) { const m = koerperMesh(ok[1], q.userData.art ?? q.material.color.getHex(), `${f.id}:${n}`); if (volumen.get(f.ziel) === q) volumen.set(`${f.id}`, m); if (!f.versteckt) modell.add(m); }
  });
}
function koerperTransform(f, volumen) {
  const quellen = koerperVon(f.ziel, volumen); if (!quellen.length && finde(f.ziel)?.versteckt) return; // ausgeblendet: Kopien auch
  if (!quellen.length) throw new Error("Körper fehlt (ausgeblendet, unterdrückt oder noch nicht da)");
  const kopie = f.typ === "kspiegel" || f.typ === "kmuster" || f.kopie;
  const anzahl = f.typ === "kmuster" ? (f.art === "pfad" ? Math.max(2, Math.round(f.anzahl || 2)) : f.art === "kreis" ? Math.max(2, Math.round(f.anzahl)) : Math.max(1, Math.round(f.anzahl || 1)) * Math.max(1, Math.round(f.anzahl2 || 1))) : 2;
  if (f.typ === "kmuster" && anzahl < 2) throw new Error("Anzahl mindestens 2");
  for (let k = 1; k < anzahl; k++) {
    const M = transformAus(f, k), spiegel = M.determinant() < 0;
    quellen.forEach((q, n) => {
      let geo = q.geometry.clone().applyMatrix4(M);
      if (spiegel) { geo = geo.index ? geo.toNonIndexed() : geo; geo = nachAussen(geo); }
      if (!kopie) { q.geometry.dispose(); q.geometry = geo; const e = q.children[0]; if (e) { e.geometry.dispose(); e.geometry = kantenGeometrie(geo); } return; }
      const m = koerperMesh(geo, q.userData.art ?? q.material.color.getHex(), `${f.id}:${k}:${n}`);
      if (volumen.get(f.ziel) === q) volumen.set(`${f.id}:${k}`, m); // Kopie eines Volumenkörpers: zählt für spätere Verknüpfungen
      if (!f.versteckt) modell.add(m);
    });
  }
  const ziel = finde(f.ziel); if (kopie && ziel) ziel._faktor = (ziel._faktor || 1) * (f.typ === "kspiegel" ? 2 : anzahl); // Stückliste
}
const koerperOpt = (f) => vorher(f).filter((x) => ["extrusion", "drehung", "sweep", "loft", "blech", "vorlage", "profil", "flaeche"].includes(x.typ) && (x.vorgang || "neu") === "neu").map((x) => [x.id, x.name]);
const KOERPER_WZ = {
  kantenrund: "Abrunden / Fasen", schale: "Schale", kmuster: "Muster (Körper)", kspiegel: "Spiegeln (Körper)", teilen: "Körper teilen", bewegen: "Verschieben / Kopieren",
};
function biegungDialog(f) {
  const istNeu = !f, fl = doc.features.filter((x) => x.typ === "flaeche"), sk = doc.features.filter((x) => x.typ === "skizze" && x.elemente.some((e) => e.art === "linie" && e.pts?.length >= 2));
  if (!fl.length) return fehltDialog("Biegung an Linie", "Zuerst ein Flächenblech erstellen."); if (!sk.length) return fehltDialog("Biegung an Linie", "Zuerst die Biegelinie als Linie in einer Skizze zeichnen (auf der Ebene des Blechs).");
  f ||= { id: neueId(), typ: "biegung", name: "Biegung " + (doc.features.filter((x) => x.typ === "biegung").length + 1), ziel: (hauptVon(auswahl)?.typ === "flaeche" ? hauptVon(auswahl) : fl.at(-1)).id, skizze: sk.at(-1).id, winkel: 90, radius: 0, richtung: "vorne", blech: 0 };
  featureDialog(f, istNeu, (ff) => [{ id: "name", label: "Name", text: true, wert: ff.name }, { id: "ziel", label: "Flächenblech", optionen: fl.map((x) => [x.id, x.name]), wert: ff.ziel }, { id: "skizze", label: "Biegelinie (Skizze, erste Linie)", optionen: sk.map((x) => [x.id, x.name]), wert: ff.skizze },
    { id: "winkel", label: "Biegewinkel", einheit: "°", wert: ff.winkel }, { id: "radius", label: "Innenradius (0 = Material)", einheit: "mm", wert: ff.radius }, { id: "richtung", label: "Biegerichtung", optionen: [["vorne", "Nach oben (Normale)"], ["hinten", "Nach unten"]], wert: ff.richtung }],
    (ff, w) => Object.assign(ff, w, { name: w.name?.trim() || ff.name }), "Biegung an Linie", "Biegt das Flächenblech entlang der ersten Linie der gewählten Skizze (muss das Blech ganz durchschneiden). Die Biegezone wird mit Innenradius und K-Faktor des Materials gerechnet; die Abwicklung zeigt die beiden Biegelinien.",
    { info: () => (f._fehler ? "⚠ " + f._fehler : f._biege ? `Biegezone ${f1(f._biege.BA)} mm · Radius innen ${f1(f._biege.ri)} mm` : "") });
}
function ripDialog(f) {
  const istNeu = !f, fl = doc.features.filter((x) => x.typ === "flaeche"), sk = doc.features.filter((x) => x.typ === "skizze" && x.elemente.some((e) => e.art === "linie" && e.pts?.length >= 2));
  if (!fl.length) return fehltDialog("Rip (Auftrennen)", "Zuerst ein Flächenblech erstellen."); if (!sk.length) return fehltDialog("Rip (Auftrennen)", "Zuerst die Trennlinie als Linie in einer Skizze zeichnen (auf der Ebene des Blechs).");
  f ||= { id: neueId(), typ: "rip", name: "Rip " + (doc.features.filter((x) => x.typ === "rip").length + 1), ziel: (hauptVon(auswahl)?.typ === "flaeche" ? hauptVon(auswahl) : fl.at(-1)).id, skizze: sk.at(-1).id, spalt: 0.5 };
  featureDialog(f, istNeu, (ff) => [{ id: "name", label: "Name", text: true, wert: ff.name }, { id: "ziel", label: "Flächenblech", optionen: fl.map((x) => [x.id, x.name]), wert: ff.ziel }, { id: "skizze", label: "Trennlinie (Skizze, erste Linie)", optionen: sk.map((x) => [x.id, x.name]), wert: ff.skizze }, { id: "spalt", label: "Spalt (Schlitzbreite)", einheit: "mm", wert: ff.spalt }],
    (ff, w) => Object.assign(ff, w, { name: w.name?.trim() || ff.name }), "Rip (Auftrennen)", "Trennt das Blech entlang der Linie auf (Schlitz mit Spalt): Eckentlastung bzw. Naht, damit sich Ecken ohne Zwang falten lassen. Der Schlitz erscheint auch in der Abwicklung.",
    { info: () => (f._fehler ? "⚠ " + f._fehler : f._rip ? `Schlitz ${f1(f._rip.laenge)} × ${f1(f._rip.spalt)} mm` : "") });
}
function loftflanschDialog(f) {
  const istNeu = !f, sk = doc.features.filter((x) => x.typ === "skizze" && ketten(x).length);
  if (sk.length < 2) return fehltDialog("Lofted Flange", "Zuerst zwei Profile als offene Linienzüge in zwei Skizzen zeichnen (z. B. auf zwei parallelen Ebenen).");
  f ||= { id: neueId(), typ: "loftflansch", name: "Lofted Flange " + (doc.features.filter((x) => x.typ === "loftflansch").length + 1), profil1: sk.at(-2).id, profil2: sk.at(-1).id, kette1: 0, kette2: 0, material: neuMaterial(), stueck: einst.neu.stueck, sichtseite: 1, lage: "mitte", teilung: 12 };
  featureDialog(f, istNeu, (ff) => [{ id: "name", label: "Name", text: true, wert: ff.name }, { id: "profil1", label: "Profil 1 (Skizze)", optionen: sk.map((x) => [x.id, x.name]), wert: ff.profil1 }, { id: "profil2", label: "Profil 2 (Skizze)", optionen: sk.map((x) => [x.id, x.name]), wert: ff.profil2 },
    { id: "material", label: "Material", optionen: matOpt(), wert: ff.material }, { id: "sichtseite", label: "Sichtseite", optionen: [["1", "Vorne (Flächennormale)"], ["-1", "Hinten"]], wert: String(ff.sichtseite ?? 1) },
    { id: "lage", label: "Profile liegen …", optionen: [["mitte", "in der Blechmitte"], ["vorne", "auf der Vorderseite"], ["hinten", "auf der Rückseite"]], wert: ff.lage || "mitte" }, { id: "teilung", label: "Unterteilung", wert: ff.teilung ?? 12 }, { id: "stueck", label: "Stück", wert: ff.stueck ?? 1 }, { id: "notiz", label: "Notiz", text: true, wert: ff.notiz ?? "" }],
    (ff, w) => Object.assign(ff, w, { name: w.name?.trim() || ff.name, sichtseite: +w.sichtseite || 1 }), "Lofted Flange", "Blechfläche zwischen zwei offenen Profilen (Linienzügen): Die Ecken der Profile bleiben als Kanten erhalten, die Abwicklung ist bei nicht abwickelbaren Flächen eine Näherung.",
    { info: () => (f._fehler ? "⚠ " + f._fehler : f._teile?.[0] ? `Zuschnitt ≈ ${f1(f._teile[0]._blech.abw.laenge)} × ${f1(f._teile[0]._blech.abw.breite)} mm` : "") });
}
function koerper2Dialog(typ, f) {
  const istNeu = !f, opt = koerperOpt(f), sk = (arten) => doc.features.filter((x) => x.typ === "skizze" && x.elemente.some((el) => arten.includes(el.art)));
  if (["skalieren", "bohrung"].includes(typ) && !opt.length) return fehltDialog(KOERPER_WZ2[typ], "Zuerst einen Körper erstellen.");
  if (typ === "bohrung" && !sk(["punkt", "kreis"]).length) return fehltDialog(KOERPER_WZ2[typ], "Zuerst eine Skizze mit Punkten auf der Fläche setzen (Werkzeug «Punkt») – dort wird gebohrt.");
  if ((typ === "rohr" || typ === "rippe") && !sk(["linie"]).some((x) => ketten(x).length)) return fehltDialog(KOERPER_WZ2[typ], typ === "rohr" ? "Zuerst den Pfad des Rohrs als offenen Linienzug skizzieren." : "Zuerst den Verlauf der Rippe als offenen Linienzug skizzieren.");
  const ziel = finde(auswahl)?.id && opt.some(([id]) => id === auswahl) ? auswahl : opt.at(-1)?.[0], letzteSk = (a) => sk(a).at(-1)?.id;
  f ||= { id: neueId(), typ, name: KOERPER_WZ2[typ] + " " + (doc.features.filter((x) => x.typ === typ).length + 1), ...({
    skalieren: { ziel, faktor: 1.5, mitte: "mitte", kopie: false },
    bohrung: { ziel, skizze: letzteSk(["punkt", "kreis"]), art: "einfach", d: 8, durch: true, tiefe: 20, dSenk: 16, tSenk: 5, winkel: 90, seite: "gegen" },
    rohr: { skizze: letzteSk(["linie"]), kette: 0, d: 20, wand: 2, vorgang: "neu" },
    spirale: { dm: 40, steigung: 10, windungen: 6, draht: 3, achse: "Y", x: 0, y: 0, z: 0, vorgang: "neu" },
    rippe: { skizze: letzteSk(["linie"]), kette: 0, dicke: 3, hoehe: 20, richtung: "eine", vorgang: "verbinden", ziel: "alle" } })[typ] };
  const skF = (arten, label) => ({ id: "skizze", label, optionen: sk(arten).map((x) => [x.id, x.name]), wert: f.skizze }), zielF = (extra = {}) => ({ id: "ziel", label: "Körper", ...extra, optionen: opt, wert: f.ziel });
  const felder = (f) => [{ id: "name", label: "Name", text: true, wert: f.name }, ...({
    skalieren: () => [{ ...zielF({ wahl: "koerper" }) }, { id: "faktor", label: "Faktor", wert: f.faktor }, { id: "mitte", label: "Skalieren um", optionen: [["mitte", "Mitte des Körpers"], ["ursprung", "Ursprung"]], wert: f.mitte },
      { id: "kopie", label: "Kopie erstellen", optionen: [["", "Nein – Körper skalieren"], ["1", "Ja – skalierte Kopie"]], wert: f.kopie ? "1" : "" }],
    bohrung: () => [zielF({ wahl: "koerper" }), skF(["punkt", "kreis"], "Bohrpunkte (Skizze)"), { id: "art", label: "Art", optionen: [["einfach", "Einfache Bohrung"], ["senkung", "Senkung (Flachsenkung)"], ["kegel", "Kegelsenkung"]], wert: f.art },
      { id: "d", label: "Durchmesser", einheit: "mm", wert: f.d }, { id: "durch", label: "Tiefe", optionen: [["1", "Durchgehend"], ["", "Sacklochbohrung"]], wert: f.durch ? "1" : "" }, ...(f.durch ? [] : [{ id: "tiefe", label: "Tiefe", einheit: "mm", wert: f.tiefe }]),
      ...(f.art === "einfach" ? [] : [{ id: "dSenk", label: "Senkdurchmesser", einheit: "mm", wert: f.dSenk }, ...(f.art === "senkung" ? [{ id: "tSenk", label: "Senktiefe", einheit: "mm", wert: f.tSenk }] : [{ id: "winkel", label: "Senkwinkel", einheit: "°", wert: f.winkel }])]),
      { id: "seite", label: "Bohrrichtung", optionen: [["gegen", "Gegen die Skizzen-Normale (in den Körper)"], ["normale", "In Richtung der Normale"]], wert: f.seite }],
    rohr: () => [skF(["linie"], "Pfad (Skizze)"), { id: "d", label: "Aussendurchmesser", einheit: "mm", wert: f.d }, { id: "wand", label: "Wanddicke (0 = Vollmaterial)", einheit: "mm", wert: f.wand }, ...vorgangFelder(f)],
    spirale: () => [{ id: "dm", label: "Durchmesser (Mittellinie)", einheit: "mm", wert: f.dm }, { id: "steigung", label: "Steigung", einheit: "mm", wert: f.steigung }, { id: "windungen", label: "Windungen", wert: f.windungen }, { id: "draht", label: "Drahtstärke", einheit: "mm", wert: f.draht },
      { id: "achse", label: "Achse", optionen: [["X", "X"], ["Y", "Y (Höhe)"], ["Z", "Z"]], wert: f.achse }, { id: "x", label: "Lage X", einheit: "mm", wert: f.x }, { id: "y", label: "Lage Y", einheit: "mm", wert: f.y }, { id: "z", label: "Lage Z", einheit: "mm", wert: f.z }, ...vorgangFelder(f)],
    rippe: () => [skF(["linie"], "Verlauf (Skizze)"), { id: "dicke", label: "Rippendicke", einheit: "mm", wert: f.dicke }, { id: "hoehe", label: "Höhe", einheit: "mm", wert: f.hoehe }, { id: "richtung", label: "Richtung", optionen: [["eine", "Eine Seite (Normale)"], ["umgekehrt", "Gegenseite"], ["symmetrisch", "Symmetrisch"]], wert: f.richtung }, ...vorgangFelder(f)],
  }[typ])()];
  const hinweise = { skalieren: "Vergrössert oder verkleinert einen Körper gleichmässig (Faktor) um seine Mitte oder den Ursprung – optional als Kopie.", bohrung: "Bohrt an den Punkten einer Skizze: einfach, mit Senkung oder Kegelsenkung, durchgehend oder als Sackloch.", rohr: "Rohr entlang eines offenen Linienzugs (Skizze) mit Aussendurchmesser und Wanddicke.", spirale: "Spirale/Feder: Durchmesser, Steigung, Windungen und Drahtstärke.", rippe: "Rippe: der offene Linienzug der Skizze wird mit der Rippendicke zur Wand und über die Höhe extrudiert (Vereinigen mit dem Körper)." };
  featureDialog(f, istNeu, felder, (f, w) => Object.assign(f, w, { name: w.name?.trim() || f.name, ...(typ === "skalieren" ? { kopie: !!w.kopie } : {}), ...(typ === "bohrung" ? { durch: !!w.durch } : {}) }), KOERPER_WZ2[typ], hinweise[typ], { wahlNr: -1, neuBei: ["art", "durch"] });
}
function koerperDialog(typ, f) {
  const istNeu = !f, opt = typ === "kantenrund" || typ === "schale" ? vorher(f).filter((x) => x.typ === "extrusion" && (x.vorgang || "neu") === "neu").map((x) => [x.id, x.name]) : koerperOpt(f);
  if (!opt.length) return fehltDialog((KOERPER_WZ[typ]?.titel || KOERPER_WZ[typ] || "Körper"), typ === "kantenrund" || typ === "schale" ? "Zuerst einen Körper extrudieren." : "Zuerst einen Körper oder ein Blechteil erstellen.");
  const ziel = finde(auswahl)?.id && opt.some(([id]) => id === auswahl) ? auswahl : opt.at(-1)[0];
  f ||= { id: neueId(), typ, name: KOERPER_WZ[typ] + " " + (doc.features.filter((x) => x.typ === typ).length + 1), ziel,
    ...({ kantenrund: { art: "rund", mass: 5, kanten: "alle" }, schale: { dicke: 2, offen: "oben" }, kmuster: { art: "rechteck", richtung1: "A:X", anzahl: 3, abstand: 200, richtung2: "A:Z", anzahl2: 1, abstand2: 200, achse: "A:Y", winkel: 360 },
      kspiegel: { ebene: "YZ" }, teilen: { ebene: "YZ", behalten: "beide" }, bewegen: { dx: 0, dy: 0, dz: 0, achse: "A:Y", winkel: 0, kopie: false } })[typ] };
  const felder = (f) => [{ id: "name", label: "Name", text: true, wert: f.name }, { id: "ziel", label: "Körper", ...(["schale", "kantenrund", "bewegen"].includes(typ) ? { wahl: "koerper" } : {}), optionen: opt, wert: f.ziel }, ...({
    kantenrund: () => [{ id: "art", label: "Art", optionen: [["rund", "Abrunden (Radius)"], ["fase", "Fasen (Abstand)"]], wert: f.art }, { id: "mass", label: f.art === "fase" ? "Fase" : "Radius", einheit: "mm", wert: f.mass },
      { id: "kanten", label: "Kanten", optionen: [["alle", "Alle Kanten"], ["senkrecht", "Kanten in Extrusionsrichtung"], ["quer", "Kanten oben und unten"]], wert: f.kanten }],
    schale: () => [{ id: "dicke", label: "Wanddicke", einheit: "mm", wert: f.dicke }, { id: "offen", label: "Offene Seite", optionen: [["oben", "Oben (Ende der Extrusion)"], ["unten", "Unten (Skizzenebene)"], ["beide", "Oben und unten"], ["keine", "Keine (geschlossen hohl)"]], wert: f.offen }],
    kmuster: () => [{ id: "art", label: "Art", optionen: [["rechteck", "Rechteckig"], ["kreis", "Kreisförmig"], ["pfad", "Entlang eines Pfads"]], wert: f.art },
      ...(f.art === "pfad" ? [{ id: "pfadSkizze", label: "Pfad (Skizze, offener Linienzug)", optionen: doc.features.filter((x) => x.typ === "skizze" && ketten(x).length).map((x) => [x.id, x.name]), wert: f.pfadSkizze || doc.features.filter((x) => x.typ === "skizze" && ketten(x).length).at(-1)?.id }, { id: "anzahl", label: "Anzahl (inkl. Original)", wert: f.anzahl }] : []),
      ...(f.art === "pfad" ? [] : f.art === "kreis" ? [{ id: "achse", label: "Achse", wahl: "kante", optionen: mitWert(kantenListe(f), f.achse), wert: f.achse }, { id: "anzahl", label: "Anzahl", wert: f.anzahl }, { id: "winkel", label: "Gesamtwinkel", einheit: "°", wert: f.winkel }]
        : [{ id: "richtung1", label: "Richtung 1", wahl: "kante", optionen: mitWert(kantenListe(f), f.richtung1), wert: f.richtung1 }, { id: "anzahl", label: "Anzahl 1", wert: f.anzahl }, { id: "abstand", label: "Abstand 1", einheit: "mm", wert: f.abstand },
          { id: "richtung2", label: "Richtung 2", wahl: "kante", optionen: mitWert(kantenListe(f), f.richtung2), wert: f.richtung2 }, { id: "anzahl2", label: "Anzahl 2", wert: f.anzahl2 }, { id: "abstand2", label: "Abstand 2", einheit: "mm", wert: f.abstand2 }])],
    kspiegel: () => [{ id: "ebene", label: "Spiegelebene", wahl: "ebene", optionen: ebenenOpt(f, f.ebene), wert: f.ebene }],
    teilen: () => [{ id: "ebene", label: "Teilen mit Ebene", wahl: "ebene", optionen: ebenenOpt(f, f.ebene), wert: f.ebene },
      { id: "behalten", label: "Behalten", optionen: [["beide", "Beide Teile"], ["oben", "Nur Seite der Ebenen-Normale"], ["unten", "Nur Gegenseite"]], wert: f.behalten || "beide" }],
    bewegen: () => [{ id: "dx", label: "Verschieben X", einheit: "mm", wert: f.dx }, { id: "dy", label: "Verschieben Y", einheit: "mm", wert: f.dy }, { id: "dz", label: "Verschieben Z", einheit: "mm", wert: f.dz },
      { id: "achse", label: "Drehachse", wahl: "kante", optionen: mitWert(kantenListe(f), f.achse), wert: f.achse }, { id: "winkel", label: "Drehwinkel", einheit: "°", wert: f.winkel },
      { id: "kopie", label: "Kopie erstellen", optionen: [["", "Nein – Körper verschieben"], ["1", "Ja – Kopie"]], wert: f.kopie ? "1" : "" }],
  }[typ])()];
  const hinweise = { kantenrund: "Rundet bzw. fast die Kanten einer Extrusion – in Extrusionsrichtung (Ecken der Skizze) und/oder oben/unten.", schale: "Höhlt eine Extrusion aus: Wanddicke nach innen, eine Seite bleibt offen (z. B. Kasten, Rinne).",
    kmuster: "Kopiert Körper oder Blechteile in einer oder zwei Richtungen bzw. um eine Achse. Gemusterte Blechteile zählen mehrfach in der Stückliste.", kspiegel: "Spiegelt einen Körper oder ein Blechteil an einer Ebene (Kopie).",
    teilen: "Schneidet einen Körper oder ein Blechteil an einer Ebene (Konstruktionsebene, Grundebene oder ebene Körperfläche anklicken) in zwei Teile. Zwei Teile bleiben getrennt, einzeln gewählt und ein-/ausblendbar. Hinweis: bei Blechteilen wird das 3D-Modell geteilt; die Abwicklung bleibt die des ganzen Blechs – ein Blech in der Fläche trennt man besser mit einer Linie in der Skizze.",
    bewegen: "Verschiebt und dreht einen Körper – oder legt eine Kopie an." };
  featureDialog(f, istNeu, felder, (f, w) => Object.assign(f, w, { name: w.name?.trim() || f.name, ...(typ === "bewegen" ? { kopie: !!w.kopie } : {}) }), KOERPER_WZ[typ], hinweise[typ],
    { wahlNr: -1 });
  if (typ === "kmuster" || typ === "kantenrund") { // Felder hängen von «Art» ab
    const d = dlg, alt = d.aendern;
    d.aendern = (w, feld) => { alt(w, feld); if (feld === "art") { const dd = dlg; dialog({ ...dd, felder: felder(f) }); } };
  }
}

// ------------------------------------------------------------ Bild / PDF-Plan als Hintergrund (wie «Arbeitsfläche» in Fusion) und DXF in die Skizze
const bilder = new THREE.Group(); szene.add(bilder); // nicht im Modell: zählt nicht für Auswahl, Export, Plan
const BILDTEX = new Map();
function bildObjekt(f) {
  let tex = BILDTEX.get(f.id);
  if (!tex || tex.userData.quelle !== f.daten) { const img = new Image(); img.src = f.daten; tex = new THREE.Texture(img); img.onload = () => { tex.needsUpdate = true; }; tex.colorSpace = THREE.SRGBColorSpace; tex.userData.quelle = f.daten; BILDTEX.set(f.id, tex); }
  const b = Math.max(1, +f.breite || 1000), h = (b * (f.pxH || 1)) / (f.pxB || 1);
  const geo = new THREE.PlaneGeometry(b, h); geo.translate(b / 2, h / 2, 0);
  const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: f.deckkraft ?? 0.6, side: THREE.DoubleSide, depthWrite: false }));
  const w = ((f.drehung || 0) * Math.PI) / 180;
  m.applyMatrix4(new THREE.Matrix4().makeRotationZ(w).setPosition(+f.x || 0, +f.y || 0, -0.5));
  m.applyMatrix4(basis(f.ebene)); m.renderOrder = -1; m.userData.bild = f.id;
  return m;
}
// Bild verkleinern (max. 3000 px, JPEG) – das Projekt bleibt handlich
function bildAusQuelle(quelle, b0, h0) {
  const k = Math.min(1, 3000 / Math.max(b0, h0)), c = document.createElement("canvas");
  c.width = Math.round(b0 * k); c.height = Math.round(h0 * k);
  const g = c.getContext("2d"); g.fillStyle = "#fff"; g.fillRect(0, 0, c.width, c.height); g.drawImage(quelle, 0, 0, c.width, c.height);
  return { daten: c.toDataURL("image/jpeg", 0.85), pxB: c.width, pxH: c.height };
}
let pdfjs = null;
async function pdfLaden() {
  if (pdfjs) return pdfjs;
  for (const basis of ["pdfjs/", "dist/pdfjs/"]) {
    try { const m = await import(/* @vite-ignore */ new URL(basis + "pdf.min.mjs", location.href).href); m.GlobalWorkerOptions.workerSrc = new URL(basis + "pdf.worker.min.mjs", location.href).href; return (pdfjs = m); } catch {}
  }
  throw new Error("PDF-Leser nicht gefunden (Ordner «pdfjs» fehlt neben dem Programm)");
}
async function bildEinfuegen(datei) {
  try {
    let bild, papier = null;
    if (/\.pdf$/i.test(datei.name)) {
      status("PDF wird gelesen …"); const lib = await pdfLaden(), pdf = await lib.getDocument({ data: new Uint8Array(await datei.arrayBuffer()) }).promise;
      let nr = 1; if (pdf.numPages > 1) { nr = Math.max(1, Math.min(pdf.numPages, parseInt(prompt(`Welche Seite? (1–${pdf.numPages})`, "1")) || 1)); }
      const seite = await pdf.getPage(nr), v1 = seite.getViewport({ scale: 1 }), k = Math.min(3000 / Math.max(v1.width, v1.height), 6), v = seite.getViewport({ scale: k });
      const c = document.createElement("canvas"); c.width = Math.round(v.width); c.height = Math.round(v.height);
      await seite.render({ canvasContext: c.getContext("2d"), viewport: v, background: "#ffffff" }).promise;
      bild = bildAusQuelle(c, c.width, c.height); papier = (v1.width / 72) * 25.4; // Papierbreite in mm
    } else {
      const url = URL.createObjectURL(datei), img = new Image(); img.src = url; await img.decode();
      bild = bildAusQuelle(img, img.naturalWidth, img.naturalHeight); URL.revokeObjectURL(url);
    }
    const ziel = finde(auswahl)?.typ === "ebene" ? auswahl : einst.neu.ebene || "XY";
    const f = { id: neueId(), typ: "bild", name: datei.name.replace(/\.[^.]+$/, ""), ebene: ziel, x: 0, y: 0, drehung: 0, deckkraft: 0.6, ...bild,
      ...(papier ? { papier, massstab: 50, breite: papier * 50 } : { breite: 1000 }) };
    bildDialog(f);
  } catch (err) { status("Bild/PDF konnte nicht gelesen werden: " + err.message); }
}
function bildDialog(f) {
  const istNeu = !finde(f.id);
  const felder = (f) => [
    { id: "name", label: "Name", text: true, wert: f.name },
    { id: "ebene", label: "Ebene", wahl: "ebene", optionen: ebenenOpt(f, f.ebene), wert: f.ebene },
    ...(f.papier ? [{ id: "massstab", label: "Plan-Massstab 1:", wert: f.massstab }] : []),
    { id: "breite", label: "Breite in Wirklichkeit", einheit: "mm", wert: +(+f.breite).toFixed(1) },
    { id: "x", label: "Lage links (u)", einheit: "mm", wert: f.x }, { id: "y", label: "Lage unten (v)", einheit: "mm", wert: f.y },
    { id: "drehung", label: "Drehung", einheit: "°", wert: f.drehung },
    { id: "deckkraft", label: "Deckkraft", optionen: [["0.25", "25 %"], ["0.4", "40 %"], ["0.6", "60 %"], ["0.8", "80 %"], ["1", "100 %"]], wert: String(f.deckkraft ?? 0.6) },
  ];
  featureDialog(f, istNeu, felder, (f, w) => {
    const alt = f.massstab;
    Object.assign(f, w, { name: w.name?.trim() || f.name, deckkraft: +w.deckkraft });
    if (f.papier && Number.isFinite(w.massstab) && w.massstab > 0 && w.massstab !== alt) { f.breite = f.papier * w.massstab; if ($("d_breite")) $("d_breite").value = +f.breite.toFixed(1); }
  }, "Bild / Plan als Hintergrund",
  `Bild oder PDF-Plan auf eine Ebene legen und darauf skizzieren. ${f.papier ? "Breite ergibt sich aus Papiergrösse × Massstab. " : ""}Genauer: «Kalibrieren» – zwei Punkte im Bild anklicken und das wirkliche Mass eingeben.`,
  { wahlNr: -1, zusatz: () => `<div class="reihe ohnerand"><button class="knopf" data-kalib>Kalibrieren …</button></div>`,
    binden: (box) => box.addEventListener("click", (e) => { if (e.target.dataset.kalib == null) return; dlg.kalib = []; status("Kalibrieren: ersten Punkt im Bild anklicken."); }),
    kantenWahl: (e) => {
      if (!dlg.kalib) return false;
      strahl.setFromCamera(ndc(e), kamera);
      const t = strahl.intersectObjects(bilder.children.filter((o) => o.userData.bild === f.id))[0]; if (!t) { status("Ins Bild klicken."); return true; }
      const uv = aufEbene(f.ebene, t.point); dlg.kalib.push(uv);
      if (dlg.kalib.length === 1) { status("Zweiten Punkt anklicken (möglichst weit weg, z. B. Ende einer Masslinie)."); return true; }
      const [a, b] = dlg.kalib, ist = abst(a, b); dlg.kalib = null;
      const soll = parseFloat(String(prompt(`Gemessen ${f1(ist)} mm. Wirkliches Mass zwischen den Punkten (mm)?`, f1(ist))).replace(",", "."));
      if (!(soll > 0) || ist < 1e-6) return true;
      const k = soll / ist; // um den ersten Punkt skalieren
      f.breite *= k; f.x = a[0] + (f.x - a[0]) * k; f.y = a[1] + (f.y - a[1]) * k; if (f.papier) f.massstab = f.breite / f.papier;
      const d = dlg; dialog({ ...d, felder: felder(f) }); regen(); status(`Kalibriert: Faktor ${k.toFixed(4)}${f.papier ? ` · Massstab ≈ 1:${f.massstab.toFixed(1)}` : ""}.`); return true;
    } });
}
$("bildDatei").onchange = async (e) => { const d = e.target.files[0]; e.target.value = ""; if (d) await bildEinfuegen(d); };
// DXF in die offene Skizze (fixiert, wie projizierte Linien – Abhängigkeit «fix» lässt sich löschen)
$("dxfDatei").onchange = async (e) => {
  const d = e.target.files[0]; e.target.value = ""; if (!d || !skizze) return;
  try {
    const r = dxfLesen(await d.text()), f = skizze.f;
    if (!r.elemente.length) return status("In der DXF-Datei sind keine Linien, Bögen oder Kreise.");
    if (r.elemente.length > 3000 && !confirm(`${r.elemente.length} Elemente – das kann langsam werden. Trotzdem einfügen?`)) return;
    for (const el of r.elemente) { el.id = neueElementId(f); f.elemente.push(el); f.bedingungen.push({ typ: "fix", e: el.id }); }
    loeseSkizze(f); zeichneLive();
    const weg = Object.entries(r.uebersprungen).map(([k, n]) => `${n}× ${k}`).join(", ");
    status(`${r.elemente.length} Elemente aus «${d.name}» eingefügt (fixiert)${r.faktor !== 1 ? `, Einheit umgerechnet ×${r.faktor}` : ""}${weg ? ` · übersprungen: ${weg}` : ""}.`);
  } catch (err) { status("DXF konnte nicht gelesen werden: " + err.message); }
};

// ------------------------------------------------------------ Abrunden / Fasen an angeklickten Kanten (beliebige Volumenkörper, gerade Kanten zwischen ebenen Flächen)
// Kante (a, b) im Netz: die zwei angrenzenden Flächen (Normale n, Richtung d in der Fläche weg von der Kante)
function kantenInfo(geo, a, b) {
  const A = V(a), B = V(b), t = B.clone().sub(A), L = t.length(); if (L < 1e-6) return null; t.normalize();
  const p = (geo.index ? geo.toNonIndexed() : geo).attributes.position, aufLinie = (q) => q.clone().sub(A).cross(t).length() < 2e-3;
  const fl = [];
  for (let i = 0; i + 2 < p.count; i += 3) {
    const P = [0, 1, 2].map((k) => new THREE.Vector3().fromBufferAttribute(p, i + k));
    for (let k = 0; k < 3; k++) {
      const q1 = P[k], q2 = P[(k + 1) % 3], q3 = P[(k + 2) % 3]; if (!aufLinie(q1) || !aufLinie(q2) || aufLinie(q3)) continue;
      const s1 = q1.clone().sub(A).dot(t), s2 = q2.clone().sub(A).dot(t); if (Math.max(s1, s2) < 1e-3 || Math.min(s1, s2) > L - 1e-3) continue; // Überlappung mit der Kante
      const n = P[1].clone().sub(P[0]).cross(P[2].clone().sub(P[0])); if (n.lengthSq() < 1e-14) continue; n.normalize();
      if (!fl.some((x) => x.n.dot(n) > 0.9999)) { const d = t.clone().cross(n).normalize(); if (d.dot(q3.clone().sub(q1)) < 0) d.negate(); fl.push({ n, d }); }
    }
  }
  if (fl.length !== 2) return null;
  return { A, B, t, L, f1: fl[0], f2: fl[1], konvex: fl[0].n.dot(fl[1].d) < 0 };
}
function kantenWerkzeug(k, art, mass) {
  const { A, t, L, f1, f2, konvex } = k, d1 = f1.d, d2 = f2.d, phi = Math.acos(Math.max(-1, Math.min(1, d1.dot(d2))));
  if (phi < 0.05 || phi > Math.PI - 0.05) return null;
  const w = t.clone().cross(d1).normalize(), zu2 = (v) => [v.dot(d1), v.dot(w)], eps = 0.05;
  const raus = konvex ? 1 : -1; // Werkzeug minimal über die Körperflächen hinaus (konvex) bzw. hinein (konkav): keine deckungsgleichen Flächen
  const n1 = f1.n.clone().multiplyScalar(raus * eps), n2 = f2.n.clone().multiplyScalar(raus * eps);
  const pts = [n1.clone().add(n2)];
  if (art === "fase") { // Fasenlinie exakt, nur über ihre Enden hinaus verlängert
    const T1 = d1.clone().multiplyScalar(mass), T2 = d2.clone().multiplyScalar(mass), r = T1.clone().sub(T2).normalize().multiplyScalar(2 * eps);
    pts.push(T1.clone().add(r), T2.clone().sub(r));
  }
  else {
    const s = mass / Math.tan(phi / 2), m = d1.clone().add(d2).normalize(), C = m.clone().multiplyScalar(mass / Math.sin(phi / 2));
    const T1 = d1.clone().multiplyScalar(s), T2 = d2.clone().multiplyScalar(s), a1 = T1.clone().sub(C), a2 = T2.clone().sub(C), bogen = Math.acos(Math.max(-1, Math.min(1, a1.dot(a2) / (a1.length() * a2.length()))));
    pts.push(T1.clone().add(n1));
    const ax = a1.clone().cross(a2).normalize();
    for (let i = 1; i < 16; i++) pts.push(C.clone().add(a1.clone().applyAxisAngle(ax, (bogen * i) / 16)));
    pts.push(T2.clone().add(n2));
  }
  let q = pts.map(zu2); if (flaeche(q) < 0) q = q.reverse();
  const verl = konvex ? 0.5 : 0; // konvex: über die Kantenenden hinaus (dort ist Luft)
  const geo = new THREE.ExtrudeGeometry(new THREE.Shape(q.map(([x, y]) => new THREE.Vector2(x, y))), { depth: L + 2 * verl, bevelEnabled: false });
  geo.applyMatrix4(new THREE.Matrix4().makeBasis(d1, w, t).setPosition(A.clone().addScaledVector(t, -verl)));
  return { geo, konvex };
}
function kantenBearbeiten(mesh, f) {
  let fehlt = 0;
  for (const k of f.kanten || []) {
    const info = kantenInfo(mesh.geometry, k.a, k.b); if (!info) { fehlt++; continue; }
    const wz = kantenWerkzeug(info, f.art, Math.max(0.1, +f.mass || 1)); if (!wz) { fehlt++; continue; }
    verknuepfe(mesh, wz.geo, wz.konvex ? "ausschneiden" : "verbinden");
  }
  return fehlt;
}
// Angeklickte Körperkante → ganze gerade Kante (zusammenhängende Stücke auf derselben Geraden)
// Skizze im Raum anklicken: Linie (nah am Zeiger) oder Fläche einer geschlossenen Schleife; liegt ein Körper davor, gewinnt dieser
function skizzenTreffer(e, koerper) {
  const r = strahl.ray; let best = null, bd = Infinity;
  const sm = smPos(e);
  for (const sk of doc.features) {
    if (sk.typ !== "skizze" || sk._aus || sk.versteckt || sk === skizze?.f || !ebene(sk.ebene) || !sk.elemente?.length) continue;
    const t = r.intersectPlane(ebenenEbene(sk.ebene), new THREE.Vector3()); if (!t) continue;
    const d = t.distanceTo(r.origin); if (koerper && d > koerper.distance + 0.5) continue; // hinter dem Körper
    const uv = aufEbene(sk.ebene, t); let treffer = false;
    const nah = (pts, zu) => { for (let i = 0; i < pts.length - (zu ? 0 : 1); i++) { const A = aufSchirm(zu3D(sk.ebene, pts[i]).toArray()), B = aufSchirm(zu3D(sk.ebene, pts[(i + 1) % pts.length]).toArray()); if (A[2] < 1 && B[2] < 1 && abstandStrecke(sm, A, B) < 9) return true; } return false; };
    const ls = schleifen(sk);
    if (ls.some((l) => nah(l, true)) || ketten(sk).some((k) => nah(k.pts, false))) treffer = true;
    else if (!koerper || d < koerper.distance - 0.5) treffer = ls.some((l) => innen(uv, l));
    if (treffer && d < bd) { bd = d; best = sk.id; }
  }
  return best;
}
function kanteAmKoerper(e) {
  const sm = smPos(e); let best = null, bd = e.pointerType === "touch" ? 24 : 10;
  for (const m of modell.children) {
    if (!m.isMesh || !m.userData.fid) continue; const pos = m.children[0]?.geometry.attributes.position; if (!pos) continue;
    for (let i = 0; i < pos.count; i += 2) {
      const a = [pos.getX(i), pos.getY(i), pos.getZ(i)], b = [pos.getX(i + 1), pos.getY(i + 1), pos.getZ(i + 1)], A = aufSchirm(a), B = aufSchirm(b);
      if (A[2] < 1 && B[2] < 1) { const d = abstandStrecke(sm, A, B); if (d < bd) { bd = d; best = { m, a, b }; } }
    }
  }
  if (!best) return null;
  const A = V(best.a), t = V(best.b).sub(A).normalize(), pos = best.m.children[0].geometry.attributes.position; let lo = 0, hi = V(best.b).sub(A).dot(t);
  for (let wieder = 0; wieder < 50; wieder++) { let mehr = false;
    for (let i = 0; i < pos.count; i += 2) {
      const p = new THREE.Vector3(pos.getX(i), pos.getY(i), pos.getZ(i)), q = new THREE.Vector3(pos.getX(i + 1), pos.getY(i + 1), pos.getZ(i + 1));
      if (p.clone().sub(A).cross(t).length() > 1e-3 || q.clone().sub(A).cross(t).length() > 1e-3) continue;
      const s1 = Math.min(p.sub(A).dot(t), q.sub(A).dot(t)), s2 = Math.max(V([pos.getX(i), pos.getY(i), pos.getZ(i)]).sub(A).dot(t), V([pos.getX(i + 1), pos.getY(i + 1), pos.getZ(i + 1)]).sub(A).dot(t));
      if (s1 <= hi + 1e-3 && s2 >= lo - 1e-3 && (s1 < lo - 1e-6 || s2 > hi + 1e-6)) { lo = Math.min(lo, s1); hi = Math.max(hi, s2); mehr = true; }
    }
    if (!mehr) break; }
  const r3 = (v) => v.toArray().map((x) => +x.toFixed(4));
  return { fid: hauptVon(best.m.userData.fid)?.id, a: r3(A.clone().addScaledVector(t, lo)), b: r3(A.clone().addScaledVector(t, hi)) };
}
function kantenDialog(f, vor) { // vor: { art, fid, a, b } = Kante aus der Kontextleiste
  const istNeu = !f;
  f ||= { id: neueId(), typ: "kanten3d", name: "Kanten abrunden " + (doc.features.filter((x) => x.typ === "kanten3d").length + 1), art: vor?.art || "rund", mass: 5, kanten: vor ? [{ a: vor.a, b: vor.b }] : [], ziel: vor?.fid ?? null };
  const felder = (f) => [{ id: "name", label: "Name", text: true, wert: f.name },
    { id: "art", label: "Art", optionen: [["rund", "Abrunden (Radius)"], ["fase", "Fasen (Abstand)"]], wert: f.art },
    { id: "mass", label: f.art === "fase" ? "Fase" : "Radius", einheit: "mm", wert: f.mass }];
  featureDialog(f, istNeu, felder, (f, w) => Object.assign(f, w, { name: w.name?.trim() || f.name }), "Kanten abrunden / fasen",
    "Gerade Kanten eines Körpers anklicken (nochmals anklicken = abwählen). Aussenkanten werden abgerundet, Innenkanten (Kehlen) ausgefüllt – wie in Fusion. Ecken, an denen drei gerundete Kanten zusammenkommen, werden nicht kugelig verschliffen.",
    { wahlNr: -1, zusatz: () => `<p class="hinweis" id="kKanten">${f.kanten.length} Kante${f.kanten.length === 1 ? "" : "n"} gewählt${f.ziel ? ` an «${esc(finde(f.ziel)?.name || "?")}»` : ""}</p><div class="reihe ohnerand"><button class="knopf" data-kleer>Auswahl leeren</button></div>`,
      binden: (box) => box.addEventListener("click", (e) => { if (e.target.dataset.kleer == null) return; f.kanten = []; f.ziel = null; const d = dlg; dialog({ ...d, felder: felder(f) }); regen(); }),
      kantenWahl: (e) => {
        // gewählte Kante wieder anklicken = abwählen (sie ist nach dem Abrunden nicht mehr im Netz)
        const sm = smPos(e), weg = f.kanten.findIndex((k) => { const A = aufSchirm(k.a), B = aufSchirm(k.b); return abstandStrecke(sm, A, B) < 8; });
        if (weg >= 0) { f.kanten.splice(weg, 1); if (!f.kanten.length) f.ziel = null; }
        else {
          const k = kanteAmKoerper(e); if (!k) return false;
          const z = finde(k.fid); if (!z || !["extrusion", "drehung", "sweep", "loft", "import"].includes(z.typ) || (z.vorgang || "neu") !== "neu") { status("Nur Kanten von Volumenkörpern (Extrusion, Drehung, Sweep, Übergang, Import)."); return true; }
          if (f.ziel && f.ziel !== z.id) { status("Alle Kanten müssen zum selben Körper gehören – für einen anderen Körper ein neues Abrunden anlegen."); return true; }
          f.ziel = z.id; f.kanten.push({ a: k.a, b: k.b });
          if (doc.features.indexOf(f) < doc.features.indexOf(z)) { doc.features.splice(doc.features.indexOf(f), 1); doc.features.splice(doc.features.indexOf(z) + 1, 0, f); }
        }
        const d = dlg; dialog({ ...d, felder: felder(f) }); regen(); return true;
      } });
}

// ------------------------------------------------------------ Kehl- und Gratblech zwischen zwei Flächen (gekantet, mit Abwicklung)
// Flächen: Körperfläche «F:Punkt;Normale» oder Ebene. Schenkel liegen auf den Flächen (Blech aussen), Enden mit Kantenbausteinen.
function flaechenEbene(ref) { const e = bezugEbene(ref); if (!e) throw new Error("Fläche fehlt"); return { o: V(e.o), n: V(e.n).normalize() }; }
function flaechenAusdehnung(ref, t) { // Lage der Körperfläche entlang t (aus dem Netz) – für die automatische Länge
  if (!String(ref).startsWith("F:")) return null;
  const { o, n } = flaechenEbene(ref); let lo = Infinity, hi = -Infinity;
  for (const m of modell.children) { if (!m.isMesh || !m.userData.fid) continue;
    const p = (m.geometry.index ? m.geometry.toNonIndexed() : m.geometry).attributes.position;
    for (let i = 0; i + 2 < p.count; i += 3) {
      const P = [0, 1, 2].map((k) => new THREE.Vector3().fromBufferAttribute(p, i + k)), nn = P[1].clone().sub(P[0]).cross(P[2].clone().sub(P[0]));
      if (nn.lengthSq() < 1e-12 || nn.normalize().dot(n) < 0.999 || P.some((q) => Math.abs(q.clone().sub(o).dot(n)) > 0.05)) continue;
      for (const q of P) { const s = q.dot(t); lo = Math.min(lo, s); hi = Math.max(hi, s); }
    } }
  return lo < hi ? [lo, hi] : null;
}
// Kurzschrift-Zeilen einer Endung umkehren (vom Ende her gelesen: Längen rückwärts, Biegungen gespiegelt)
function umkehren(z) { return z.map((_, j) => { const o = z[z.length - 1 - j], b = z[z.length - 2 - j]; return b ? { L: o.L, winkel: -b.winkel, art: b.art, ri: b.ri } : { L: o.L }; }); }
function kehlBlech(f) {
  const m = material(f.material), F1 = flaechenEbene(f.flaeche1), F2 = flaechenEbene(f.flaeche2);
  const t = F1.n.clone().cross(F2.n); if (t.length() < 1e-4) throw new Error("Die Flächen sind parallel – keine Kehle/Grat"); t.normalize();
  // Punkt auf beiden Ebenen (nächster zum Mittel der Bezugspunkte)
  const c1 = F1.n.dot(F1.o), c2 = F2.n.dot(F2.o), n12 = F1.n.dot(F2.n), det = 1 - n12 * n12;
  const E0 = F1.n.clone().multiplyScalar((c1 - c2 * n12) / det).add(F2.n.clone().multiplyScalar((c2 - c1 * n12) / det));
  const mitte = F1.o.clone().add(F2.o).multiplyScalar(0.5); E0.addScaledVector(t, mitte.clone().sub(E0).dot(t));
  const d1 = t.clone().cross(F1.n).normalize(), d2 = t.clone().cross(F2.n).normalize();
  if (d1.dot(F1.o.clone().sub(E0)) < 0) d1.negate(); if (d2.dot(F2.o.clone().sub(E0)) < 0) d2.negate();
  const phi = Math.acos(Math.max(-1, Math.min(1, d1.dot(d2)))), winkel = 180 - (phi * 180) / Math.PI;
  if (winkel < 1) throw new Error("Die Flächen liegen in einer Ebene");
  // Länge: Überlappung der beiden Körperflächen entlang der Kehllinie – oder von Hand
  let s0, L;
  const a1 = flaechenAusdehnung(f.flaeche1, t), a2 = flaechenAusdehnung(f.flaeche2, t), ab = a1 && a2 ? [Math.max(a1[0], a2[0]), Math.min(a1[1], a2[1])] : a1 || a2;
  if (+f.laengeVorgabe > 0) { L = +f.laengeVorgabe; s0 = ab ? (ab[0] + ab[1]) / 2 - L / 2 : E0.dot(t) - L / 2; } else { if (!ab || ab[1] - ab[0] < 1) throw new Error("Länge angeben (Flächen sind Ebenen, keine Körperflächen)"); s0 = ab[0]; L = ab[1] - ab[0]; }
  const ende = (id) => { const b = id && bausteinFuer(id); return b?.folge?.trim() ? b.folge : ""; };
  const baue = (s1, s2) => {
    const e1 = ende(f.ende1), e2 = ende(f.ende2), flip = (z, s) => z.map((x) => (x.winkel ? { ...x, winkel: x.winkel * s } : x));
    const z1 = flip(folge(`${+f.breite1 || 150}${e1 ? " " + e1 : ""}`), s1), z2 = flip(folge(`${+f.breite2 || 150}${e2 ? " " + e2 : ""}`), s2);
    const r1 = umkehren(z1); r1[r1.length - 1] = { ...r1.at(-1), winkel, art: "abkanten" };
    const zeilen = [...r1, ...z2], { start, ops } = freiesProfil(0, zeilen, m), res = berechne(start, ops, m.t, m.ri, m.k);
    const linien = res.pfad.filter((e) => e.typ === "linie"); if (linien.length !== zeilen.length) throw new Error("Schenkel zu kurz für die Biegungen");
    return { res, l1: linien[r1.length - 1], l2: linien[r1.length] };
  };
  const rot = ([x, y]) => [-y, x];
  let s1 = 1, s2 = 1, r, M, V2;
  for (let durchgang = 0; durchgang < 2; durchgang++) { // 1. Lage bestimmen, 2. mit richtig gespiegelten Enden
    r = baue(s1, s2);
    const { l1, l2 } = r, dir1 = norm2([l1.p2[0] - l1.p1[0], l1.p2[1] - l1.p1[1]]), dir2 = norm2([l2.p2[0] - l2.p1[0], l2.p2[1] - l2.p1[1]]);
    V2 = schnitt2(l1.p1, dir1, l2.p1, dir2) || l1.p2;
    // 2D → 3D: (−dir1) ↦ d1, dir2 ↦ d2
    const a = [-dir1[0], -dir1[1]], b = dir2, dt = a[0] * b[1] - a[1] * b[0];
    const ex = d1.clone().multiplyScalar(b[1] / dt).add(d2.clone().multiplyScalar(-a[1] / dt)), ey = d1.clone().multiplyScalar(-b[0] / dt).add(d2.clone().multiplyScalar(a[0] / dt));
    M = (v) => ex.clone().multiplyScalar(v[0]).add(ey.clone().multiplyScalar(v[1]));
    // Sichtseite: «+» der Endbausteine biegt zur Flächennormale (Aussenseite)
    // links der Richtung nach aussen ↦ Flächennormale? Sonst die Biegungen dieses Endes spiegeln (die Kehlbiegung bleibt)
    if (durchgang === 0) { s1 = M(rot(a)).dot(F1.n) > 0 ? 1 : -1; s2 = M(rot(b)).dot(F2.n) > 0 ? 1 : -1; if (s1 === 1 && s2 === 1) break; }
  }
  const ex = M([1, 0]), ey = M([0, 1]);
  const al = (m.t / 2) / d1.dot(F2.n), be = (m.t / 2) / d2.dot(F1.n), E = E0.clone().addScaledVector(d1, al).addScaledVector(d2, be); // Blechmitte über den Flächen
  E.addScaledVector(t, s0 - E.dot(t));
  const geo = new THREE.ExtrudeGeometry(konturForm(r.res, m.t), { depth: L, bevelEnabled: false });
  const T = new THREE.Matrix4().makeBasis(ex, ey, t).setPosition(E.clone().sub(ex.clone().multiplyScalar(V2[0])).sub(ey.clone().multiplyScalar(V2[1])));
  geo.applyMatrix4(T);
  let g = geo; if (T.determinant() < 0) { g = geo.toNonIndexed(); g = nachAussen(g); }
  f.laenge = +L.toFixed(1); // tatsächliche Länge (Werkstatt, Stückliste); Vorgabe steht in laengeVorgabe
  return { res: r.res, geo: g, laenge: L, winkel, T };
}
const norm2 = (v) => { const l = Math.hypot(v[0], v[1]) || 1; return [v[0] / l, v[1] / l]; };
function schnitt2(p, u, q, v) { const d = u[0] * v[1] - u[1] * v[0]; if (Math.abs(d) < 1e-9) return null; const s = ((q[0] - p[0]) * v[1] - (q[1] - p[1]) * v[0]) / d; return [p[0] + u[0] * s, p[1] + u[1] * s]; }
function kehleDialog(f) {
  const istNeu = !f;
  f ||= { id: neueId(), typ: "kehle", name: "Kehle " + (doc.features.filter((x) => x.typ === "kehle").length + 1), flaeche1: "", flaeche2: "", breite1: 150, breite2: 150, ende1: "", ende2: "", laengeVorgabe: 0, material: neuMaterial(), stueck: 1 };
  const bOpt = [["", "– keine (Schnittkante)"], ...alleBausteine().map((b) => [b.id, `${b.name} (${b.folge})`])];
  const felder = (f) => [{ id: "name", label: "Name", text: true, wert: f.name },
    { id: "flaeche1", label: "Fläche 1", wahl: "ebene", optionen: mitWert([["", "– anklicken –"], ...ebenenOpt(f).slice(0)], f.flaeche1), wert: f.flaeche1 },
    { id: "flaeche2", label: "Fläche 2", wahl: "ebene", optionen: mitWert([["", "– anklicken –"], ...ebenenOpt(f).slice(0)], f.flaeche2), wert: f.flaeche2 },
    { id: "breite1", label: "Schenkel auf Fläche 1", einheit: "mm", wert: f.breite1 }, { id: "breite2", label: "Schenkel auf Fläche 2", einheit: "mm", wert: f.breite2 },
    { id: "ende1", label: "Ende 1", optionen: bOpt, wert: f.ende1 || "" }, { id: "ende2", label: "Ende 2", optionen: bOpt, wert: f.ende2 || "" },
    { id: "material", label: "Material", optionen: matOpt(), wert: f.material },
    { id: "laengeVorgabe", label: "Länge (0 = automatisch)", einheit: "mm", wert: f.laengeVorgabe || 0 }, { id: "stueck", label: "Stück", wert: f.stueck ?? 1 }];
  featureDialog(f, istNeu, felder, (f, w) => Object.assign(f, w, { name: w.name?.trim() || f.name }), "Kehle / Grat",
    "Zwei Körperflächen anklicken (z. B. zwei Dachflächen). Das Blech liegt aussen auf beiden Flächen, gekantet entlang der Kehl- bzw. Gratlinie; Länge aus den Flächen. An den Enden Kantenbausteine (z. B. Saum, Wasserfalz). Zuschnitt und Abkantliste in der Werkstatt.",
    { info: () => (f._fehler ? "⚠ " + f._fehler : f._res ? `Zuschnitt ${f1(f._res.zuschnitt)} × ${f1(f.laenge || 0)} mm · Winkel ${f1(f._kehle?.winkel || 0)}° · ${f._res.biegungen.length} Biegungen` : "") });
}
// Blech auf eine Körperfläche: Ebene (um halbe Blechdicke versetzt) + Skizze mit dem Umriss + Flächenblech – dann Kanten antippen
function blechAufFlaeche(ref) {
  const m = material(neuMaterial()), { o, n } = flaechenEbene(ref);
  const e = { id: neueId(), typ: "ebene", art: "versatz", name: "Ebene Blech " + (doc.features.filter((x) => x.typ === "ebene").length + 1), ref, abstand: +(m.t / 2).toFixed(3), versteckt: true };
  einfuegen(e); regen();
  const E = E_(e.id), inEbene = (w) => Math.abs(V(w).sub(o).dot(n)) < 0.05;
  const stuecke = koerperKanten().filter(([a, b]) => inEbene(a) && inEbene(b)).map(([a, b]) => ({ pts: [zuLokal(E, a), zuLokal(E, b)] }));
  const zuege = verbindeStuecke(stuecke).filter((z) => z.geschlossen && z.pts.length > 3);
  if (!zuege.length) { entferneFeature(e); regen(); return status("Kein geschlossener Umriss auf dieser Fläche gefunden."); }
  const sk = { id: neueId(), typ: "skizze", name: "Umriss Blech", ebene: e.id, versteckt: true, elemente: zuege.map((z, i) => { const pts = z.pts.slice(); if (gleich(pts[0], pts.at(-1))) pts.pop(); return { art: "linie", pts, geschlossen: true, projiziert: true, id: i + 1 }; }) };
  einfuegen(sk); regen();
  const f = { id: neueId(), typ: "flaeche", name: "Blech auf Fläche " + (doc.features.filter((x) => x.typ === "flaeche").length + 1), skizze: sk.id, profil: "alle", kanten: {}, material: m.id, stueck: 1, sichtseite: 1 };
  einfuegen(f); regen(); auswahl = f.id; flaecheDialog(f);
  status("Blech liegt auf der Fläche – jetzt Kanten antippen und Bausteine zuweisen.");
}
function blechAufFlaecheStart() {
  if (dlg) $("dAbbrechen").click();
  dialog({ titel: "Blech auf Körperfläche", sofort: true, felder: [{ id: "flaeche", label: "Fläche", wahl: "ebene", optionen: [["", "– Körperfläche anklicken –"]], wert: "" }],
    hinweis: "Ebene Fläche eines Körpers anklicken (z. B. Dachfläche, Brüstung). Das Blech bekommt ihren Umriss; danach die Kanten antippen und Bausteine zuweisen.",
    ok: (w) => { if (String(w.flaeche).startsWith("F:")) setTimeout(() => blechAufFlaeche(w.flaeche)); else status("Bitte eine Körperfläche anklicken."); } });
}

// ------------------------------------------------------------ Sweep und Loft (wie in Fusion)
const v3 = (a) => new THREE.Vector3(...a);
// Ring-Netz: ringe[k][j] (gleich viele Punkte, Schleifen gegen den Uhrzeiger um die Laufrichtung), Deckel an beiden Enden
function ringNetz(ringe, deckelAnfang, deckelEnde) {
  const pos = [], dreieck = (a, b, c) => pos.push(a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z);
  for (let k = 0; k < ringe.length - 1; k++) {
    const A = ringe[k], B = ringe[k + 1], n = A.length;
    for (let j = 0; j < n; j++) { const j2 = (j + 1) % n; dreieck(A[j], A[j2], B[j2]); dreieck(A[j], B[j2], B[j]); }
  }
  for (const [d, umdrehen] of [[deckelAnfang, true], [deckelEnde, false]]) for (const [a, b, c] of d) umdrehen ? dreieck(a, c, b) : dreieck(a, b, c);
  const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  return nachAussen(g);
}
// Deckel: Profil (Aussenkontur + Löcher in 2D) dreieckig zerlegen, Punkte über abbild(x, y) in 3D
function deckel(aussen, loecher, abbild) {
  const alle = [aussen, ...loecher].flat(), tri = THREE.ShapeUtils.triangulateShape(aussen.map((p) => new THREE.Vector2(...p)), loecher.map((h) => h.map((p) => new THREE.Vector2(...p))));
  return tri.map((t) => t.map((i) => abbild(...alle[i])));
}
const flaeche2 = (p) => p.reduce((s, a, i) => { const b = p[(i + 1) % p.length]; return s + a[0] * b[1] - b[0] * a[1]; }, 0) / 2;
function sweepGeometrie(sk, pfad, opt = {}) {
  if (pfad.length < 2) throw new Error("Pfad zu kurz");
  const E = E_(sk.ebene), P = pfad.map(v3).filter((p, i, a) => !i || p.distanceTo(a[i - 1]) > 1e-6), parallel = opt.orientierung === "parallel" && !opt.fuehrung?.length;
  // Rahmen entlang des Pfads (Doppelspiegelung: verdreht sich nicht)
  const T = P.map((p, i) => (i < P.length - 1 ? P[i + 1].clone().sub(p) : p.clone().sub(P[i - 1])).normalize());
  let N0 = v3(E.u).sub(T[0].clone().multiplyScalar(v3(E.u).dot(T[0]))); if (N0.lengthSq() < 1e-9) N0 = v3(E.v).sub(T[0].clone().multiplyScalar(v3(E.v).dot(T[0])));
  // Führungsschiene (wie «Pfad und Führungsschiene» in Fusion): die Profilrichtung N zeigt zu jedem Pfadpunkt zur Schiene, das Profil wird mit dem Abstand skaliert
  const G = (opt.fuehrung || []).map(v3).filter((p, i, a) => !i || p.distanceTo(a[i - 1]) > 1e-6), laengen = [0]; for (let i = 1; i < P.length; i++) laengen.push(laengen[i - 1] + P[i].distanceTo(P[i - 1]));
  const gl = [0]; for (let i = 1; i < G.length; i++) gl.push(gl[i - 1] + G[i].distanceTo(G[i - 1]));
  const aufSchiene = (i) => { if (G.length < 2) return null; const t = laengen.at(-1) > 0 ? laengen[i] / laengen.at(-1) : 0, z = t * gl.at(-1); let j = 1; while (j < G.length - 1 && gl[j] < z) j++; const u = (z - gl[j - 1]) / ((gl[j] - gl[j - 1]) || 1); return G[j - 1].clone().lerp(G[j], Math.max(0, Math.min(1, u))); };
  const r = P.map((p, i) => { const g = aufSchiene(i); if (!g) return null; const v = g.sub(p); return v.sub(T[i].clone().multiplyScalar(v.dot(T[i]))); });
  const fuehrung = !!r[0] && r[0].length() > 1e-6;
  if (fuehrung) N0 = r[0].clone();
  const N = [N0.normalize()];
  for (let i = 0; i < P.length - 1; i++) {
    const v1 = P[i + 1].clone().sub(P[i]), c1 = v1.dot(v1) || 1, rL = N[i].clone().sub(v1.clone().multiplyScalar((2 / c1) * v1.dot(N[i]))), tL = T[i].clone().sub(v1.clone().multiplyScalar((2 / c1) * v1.dot(T[i])));
    const v2 = T[i + 1].clone().sub(tL), c2 = v2.dot(v2) || 1; N.push(rL.sub(v2.multiplyScalar((2 / c2) * v2.dot(rL))).normalize());
  }
  const skal = P.map(() => 1);
  if (fuehrung) for (let i = 0; i < P.length; i++) { // Richtung und Grösse folgen der Schiene (fällt sie auf den Pfad, bleibt der letzte Rahmen)
    const ri = r[i]; if (ri && ri.length() > 1e-6) { N[i] = ri.clone().normalize(); if (opt.skalieren !== "nein") skal[i] = ri.length() / r[0].length(); } else if (i) { N[i] = N[i - 1].clone(); skal[i] = skal[i - 1]; }
  }
  const B = N.map((n, i) => new THREE.Vector3().crossVectors(T[i], n));
  // Profilpunkte: senkrecht zum Pfad in (N0, B0) relativ zum Pfadanfang; parallel: unverändert in der Profilebene, nur verschoben
  const ab = (uv) => { if (parallel) return uv; const w = v3(zuWelt(E, uv)).sub(P[0]); return [w.dot(N[0]), w.dot(B[0])]; };
  const geos = [];
  for (const s of formen(sk)) {
    const aussen0 = s.getPoints().map((q) => ab([q.x, q.y])), loecher0 = s.holes.map((h) => h.getPoints().map((q) => ab([q.x, q.y])));
    const ccw = (p, soll) => (Math.sign(flaeche2(p)) === soll ? p : p.slice().reverse());
    const aussen = ccw(aussen0.filter((p, i, a) => i < a.length - 1 || Math.hypot(p[0] - a[0][0], p[1] - a[0][1]) > 1e-6), 1);
    const loecher = loecher0.map((h) => ccw(h.filter((p, i, a) => i < a.length - 1 || Math.hypot(p[0] - a[0][0], p[1] - a[0][1]) > 1e-6), -1));
    const bei = (i) => (a, b) => parallel ? v3(zuWelt(E, [a, b])).add(P[i].clone().sub(P[0])) : P[i].clone().addScaledVector(N[i], a * skal[i]).addScaledVector(B[i], b * skal[i]);
    const ringe = (schleife) => P.map((_, i) => schleife.map(([a, b]) => bei(i)(a, b)));
    const teile = [ringNetz(ringe(aussen), deckel(aussen, loecher, bei(0)), deckel(aussen, loecher, bei(P.length - 1)))];
    for (const h of loecher) teile.push(ringNetz(ringe(h), [], []));
    geos.push(...teile);
  }
  return zusammen(geos.map((g) => g));
}
// Loft: je Skizze die grösste geschlossene Kontur, gleich viele Punkte, gleiche Umlaufrichtung und Anfang
function loftGeometrie(skizzen, n = 96) {
  const konturen = skizzen.map((sk) => {
    const l = schleifen(sk).sort((a, b) => Math.abs(flaeche2(b)) - Math.abs(flaeche2(a)))[0]; if (!l) throw new Error(`«${sk.name}» hat kein geschlossenes Profil`);
    return l.map((uv) => v3(zuWelt(E_(sk.ebene), uv)));
  });
  const mitte = (k) => k.reduce((s, p) => s.add(p), new THREE.Vector3()).divideScalar(k.length);
  const achse = mitte(konturen.at(-1)).sub(mitte(konturen[0])).normalize();
  if (achse.lengthSq() < 1e-9) throw new Error("Profile liegen aufeinander");
  const ref = Math.abs(achse.x) < 0.9 ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 1, 0), X = ref.sub(achse.clone().multiplyScalar(ref.dot(achse))).normalize(), Y = new THREE.Vector3().crossVectors(achse, X);
  const ringe = konturen.map((k) => {
    const c = mitte(k), w = (p) => Math.atan2(p.clone().sub(c).dot(Y), p.clone().sub(c).dot(X));
    let q = k.slice(); const fl = q.reduce((s, p, i) => { const a = p.clone().sub(c), b = q[(i + 1) % q.length].clone().sub(c); return s + a.cross(b).dot(achse); }, 0);
    if (fl < 0) q.reverse();
    const s0 = q.reduce((bi, p, i) => (Math.abs(w(p)) < Math.abs(w(q[bi])) ? i : bi), 0); q = [...q.slice(s0), ...q.slice(0, s0)];
    const L = q.map((p, i) => p.distanceTo(q[(i + 1) % q.length])), gesamt = L.reduce((a, b) => a + b, 0), out = [];
    for (let j = 0, i = 0, lauf = 0; j < n; j++) { const ziel = (gesamt * j) / n; while (lauf + L[i] < ziel) { lauf += L[i]; i++; } const t = (ziel - lauf) / (L[i] || 1); out.push(q[i].clone().lerp(q[(i + 1) % q.length], t)); }
    return out;
  });
  // Deckel liegen in ihrer eigenen Ebene: Punkte direkt verwenden
  const deckelEcht = (ring) => THREE.ShapeUtils.triangulateShape(ring.map((p) => new THREE.Vector2(p.clone().dot(X), p.clone().dot(Y))), []).map((t) => t.map((i) => ring[i]));
  return ringNetz(ringe, deckelEcht(ringe[0]), deckelEcht(ringe.at(-1)));
}
function sweepDialog(f) {
  const istNeu = !f, sk = doc.features.filter((x) => x.typ === "skizze" && schleifen(x).length);
  if (!sk.length) return fehltDialog("Sweep", "Zuerst ein geschlossenes Profil skizzieren – und einen Pfad (Linie, Bogen, Linienzug oder Körperkante).");
  f ||= { id: neueId(), typ: "sweep", name: "Sweep " + (doc.features.filter((x) => x.typ === "sweep").length + 1), skizze: vorSk(sk).id, pfad: "", vorgang: "neu" };
  if (!f.pfad) f.pfad = pfadListe().find(([w]) => !w.startsWith(`L:${f.skizze}:`))?.[0] || ""; // Pfad nicht aus der Profilskizze
  featureDialog(f, istNeu, (f) => [
    { id: "skizze", label: "Profil aus", wahl: "profil", optionen: sk.map((s) => [s.id, s.name]), wert: f.skizze },
    { id: "pfad", label: "Pfad", wahl: "pfad", optionen: mitWert(pfadListe(f).length ? pfadListe(f) : [["", "– nichts vorhanden –"]], f.pfad), wert: f.pfad },
    { id: "orientierung", label: "Ausrichtung", optionen: [["senkrecht", "Senkrecht zum Pfad (folgt dem Pfad)"], ["parallel", "Parallel (Profil behält seine Lage)"]], wert: f.fuehrung ? "senkrecht" : f.orientierung || "senkrecht" },
    { id: "fuehrung", label: "Führungsschiene", wahl: "pfad", optionen: [["", "– keine –"], ...mitWert(pfadListe(f), f.fuehrung || "")], wert: f.fuehrung || "" },
    ...(f.fuehrung ? [{ id: "fuehrSkal", label: "Profil an der Schiene", optionen: [["ja", "mit dem Abstand skalieren"], ["nein", "Grösse beibehalten"]], wert: f.fuehrSkal || "ja" }] : []),
    ...vorgangFelder(f),
  ], (f, w) => Object.assign(f, w), "Sweep", "Geschlossenes Profil entlang eines Pfads ziehen. Ausrichtung: «Senkrecht» dreht das Profil mit dem Pfad, «Parallel» behält die Lage des Profils bei (reine Verschiebung). Führungsschiene (optional): das Feld antippen und eine Linie anklicken – das Profil dreht sich dann zur Schiene und wird mit dem Abstand skaliert (wie «Pfad und Führungsschiene» in Fusion). Das Profil wird am Pfadanfang angesetzt – am besten senkrecht zum Pfad skizzieren (Konstruieren → Ebene entlang Pfad).", { neuBei: ["fuehrung"] });
}
function loftDialog(f) {
  const istNeu = !f, sk = doc.features.filter((x) => x.typ === "skizze" && schleifen(x).length);
  if (sk.length < 2) return fehltDialog("Übergang", "Für einen Übergang zwei Skizzen mit geschlossenem Profil auf verschiedenen Ebenen zeichnen.");
  f ||= { id: neueId(), typ: "loft", name: "Übergang " + (doc.features.filter((x) => x.typ === "loft").length + 1), profil1: sk.at(-2).id, profil2: vorSk(sk).id, profil3: "", vorgang: "neu" };
  featureDialog(f, istNeu, (f) => [
    { id: "profil1", wahl: "profil", label: "Profil 1", optionen: sk.map((s) => [s.id, s.name]), wert: f.profil1 },
    { id: "profil2", wahl: "profil", label: "Profil 2", optionen: sk.map((s) => [s.id, s.name]), wert: f.profil2 },
    { id: "profil3", wahl: "profil", label: "Profil 3 (optional)", optionen: [["", "–"], ...sk.map((s) => [s.id, s.name])], wert: f.profil3 || "" },
    ...vorgangFelder(f),
  ], (f, w) => Object.assign(f, w), "Übergang (Loft)", "Verbindet die grösste geschlossene Kontur jeder Skizze – z. B. Rechteck unten, Kreis oben (Ablauf, Rohrübergang, Kaminhut).");
}

// ------------------------------------------------------------ Parameter ändern (Fusion: Ändern → Parameter ändern)
function parameterDialog() {
  if (dlg) $("dAbbrechen").click();
  const alt = JSON.parse(JSON.stringify(doc.parameter || []));
  let liste = JSON.parse(JSON.stringify(alt));
  const verwendet = (name) => {
    const n = doc.features.filter((f) => Object.values(f.ausdruecke || {}).some((a) => namenIn(a).includes(name)) || (f.bedingungen || []).some((b) => b.ausdruck && namenIn(b.ausdruck).includes(name))).length;
    return n + liste.filter((q) => q.name !== name && namenIn(q.ausdruck).includes(name)).length;
  };
  const tabelle = () => {
    const r = parameterWerte(liste);
    return `<div class="tabwrap"><table class="zeilen parameter"><thead><tr><th>Name</th><th>Ausdruck</th><th class="num">Wert</th><th>Kommentar</th><th class="num">verw.</th><th></th></tr></thead><tbody>
      ${liste.map((q, i) => `<tr data-i="${i}"><td><input data-p="name" value="${esc(q.name)}" class="${r.fehler[q.name]?.startsWith("Name") ? "ungueltig" : ""}" aria-label="Name"></td>
        <td><input data-p="ausdruck" value="${esc(q.ausdruck)}" class="folge ${r.fehler[q.name] && !r.fehler[q.name].startsWith("Name") ? "ungueltig" : ""}" title="${esc(r.fehler[q.name] || "")}" aria-label="Ausdruck"></td>
        <td class="num" data-wert="${i}">${q.name in r.werte ? +r.werte[q.name].toFixed(4) : "⚠"}</td><td><input data-p="kommentar" value="${esc(q.kommentar || "")}" aria-label="Kommentar"></td>
        <td class="num">${verwendet(q.name)}</td><td><button class="weg" data-pweg="${i}" aria-label="${esc(q.name)} entfernen">×</button></td></tr>`).join("") || '<tr><td colspan="6" class="hinweis">Noch keine Parameter.</td></tr>'}
      </tbody></table></div><div class="reihe ohnerand"><button class="knopf" data-pneu>+ Parameter</button></div>
      <p class="hinweis">Parameter in jedem Zahlenfeld und in Skizzenmassen verwenden, z. B. «breite / 3» oder «falz + 2 * t». Erlaubt: + − * / ^, Klammern, mm/cm/m, sqrt, sin/cos/tan (Grad), min, max, round, pi.
        Ändert man hier einen Wert, rechnet das ganze Modell nach.</p>`;
  };
  const zeige = () => { const d = dlg; dialog({ ...d }); };
  const pruefen = () => {
    const r = parameterWerte(liste), namen = liste.map((q) => q.name), doppelt = namen.find((n, i) => namen.indexOf(n) !== i);
    document.querySelectorAll("#dInhalt [data-wert]").forEach((c) => { const q = liste[+c.dataset.wert]; c.textContent = q && q.name in r.werte ? +r.werte[q.name].toFixed(4) : "⚠"; });
    document.querySelectorAll("#dInhalt tr[data-i]").forEach((tr) => { const q = liste[+tr.dataset.i], e = r.fehler[q.name];
      tr.querySelector('[data-p="name"]').classList.toggle("ungueltig", !!e?.startsWith("Name") || q.name === doppelt);
      const a = tr.querySelector('[data-p="ausdruck"]'); a.classList.toggle("ungueltig", !!e && !e.startsWith("Name")); a.title = e || ""; });
    const fehler = doppelt ? `Name «${doppelt}» doppelt` : Object.entries(r.fehler).map(([n, e]) => `${n}: ${e}`)[0];
    $("dInfo").textContent = fehler ? "⚠ " + fehler : `${liste.length} Parameter`; $("dInfo").className = fehler ? "fehler" : "";
    return !fehler;
  };
  dialog({ titel: "Parameter ändern", felder: [], zusatz: tabelle,
    binden: (box) => {
      box.addEventListener("input", (e) => { const k = e.target.dataset.p; if (!k) return; liste[+e.target.closest("tr").dataset.i][k] = e.target.value.trim(); if (pruefen()) { doc.parameter = liste; regen(); } });
      box.addEventListener("click", (e) => {
        if (e.target.dataset.pneu != null) { let n = 1; while (liste.some((q) => q.name === "p" + n)) n++; liste.push({ name: "p" + n, ausdruck: "100", kommentar: "" }); zeige(); box.querySelector("tr:last-child input")?.select(); }
        else if (e.target.dataset.pweg != null) { liste.splice(+e.target.dataset.pweg, 1); doc.parameter = liste; zeige(); regen(); }
      });
      setTimeout(pruefen);
    },
    ok: () => { if (!pruefen()) { doc.parameter = alt; return status("Parameter nicht übernommen – Fehler in der Liste."); } doc.parameter = liste; status("Parameter übernommen."); },
    abbrechen: () => { doc.parameter = alt; } });
}
$("wParameter").onclick = parameterDialog;

// ------------------------------------------------------------ Prüfen: Messen und Schnittanalyse (wie in Fusion)
let messen = null; // { a: Punkt | null }
const messGruppe = new THREE.Group(); szene.add(messGruppe);
// Messpunkt: Körperecke oder Kantenmitte in der Nähe (Fang), sonst Treffpunkt auf der Körperfläche
function messPunkt(e) {
  const sm = smPos(e), k = koerperFang(sm);
  if (k) return { p: k.p, art: FANGNAME[k.art], fa: k.art, s: k.s };
  strahl.setFromCamera(ndc(e), kamera);
  const hit = strahl.intersectObjects(modell.children.filter((o) => o.isMesh), false)[0];
  return hit ? { p: hit.point.toArray(), art: "Fläche", fa: "flaeche", s: sm } : null;
}
function messMarke(p, farbe = 0x1d8fff) {
  const k = new THREE.Mesh(new THREE.SphereGeometry(1, 12, 8), new THREE.MeshBasicMaterial({ color: farbe, depthTest: false }));
  k.position.set(...p); k.userData.bildschirm = 0.006; k.renderOrder = 15; messGruppe.add(k); return k;
}
function messKlick(e) {
  const q = messPunkt(e); if (!q) return status("Hier ist kein Körper – eine Ecke, Kante oder Fläche anklicken.");
  if (!messen.a || messen.b) { leeren(messGruppe); messen = { a: q.p }; messMarke(q.p); $("messInhalt").innerHTML = `<b>Punkt 1</b> (${q.art}) ${q.p.map((v) => f1(v)).join(" / ")} – zweiten Punkt anklicken`; return; }
  messen.b = q.p; messMarke(q.p);
  const a = messen.a, b = q.p, d = b.map((v, i) => v - a[i]), L = Math.hypot(...d);
  const l = new THREE.Line(new THREE.BufferGeometry().setFromPoints([V(a), V(b)]), new THREE.LineBasicMaterial({ color: 0x1d8fff, depthTest: false }));
  l.renderOrder = 15; messGruppe.add(l);
  $("messInhalt").innerHTML = `<b>Abstand ${f1(L)} mm</b><br>ΔX ${f1(d[0])} · ΔY ${f1(d[1])} · ΔZ ${f1(d[2])} <small>(${q.art})</small>`;
  status(`Abstand ${f1(L)} mm – nächster Klick beginnt eine neue Messung, Esc beendet.`);
}
function messenUmschalten(an = !messen) {
  messen = an ? { a: null } : null; leeren(messGruppe);
  $("messAnzeige").hidden = !an; $("messInhalt").innerHTML = "Ersten Punkt anklicken: Körperecke, Kantenmitte oder Fläche.";
  $("wMessen").setAttribute("aria-pressed", an);
  status(an ? "Messen: zwei Punkte anklicken. Esc beendet." : "");
}
$("wMessen").onclick = () => { if (skizze) return status("Messen ausserhalb der Skizze – in der Skizze zeigen die Masse die Längen."); if (dlg) $("dAbbrechen").click(); messenUmschalten(); };
document.addEventListener("keydown", (e) => { if (e.key === "Escape" && messen && !skizze) { messenUmschalten(false); e.preventDefault(); } });

// ------------------------------------------------------------ Simulation (Tragfähigkeit von Blechen, Richtwert – src/simulation.js, kern/fem/)
// Blechquellen für das Schalenmodell: Mittellinie der Profile (Blechprofil, Vorlage, freies Profil) bzw. Fläche + Flansche des Flächenblechs, in Weltlage
function femQuellen(ids = null) {
  const out = [], tr = (e, L) => { if (!L) return { o: e.o, u: e.u, v: e.v, n: e.n }; const p = (x) => V(x).applyMatrix4(L).toArray(), d = (x) => V(x).transformDirection(L).toArray(); return { o: p(e.o), u: d(e.u), v: d(e.v), n: d(e.n) }; };
  for (const f of doc.features) {
    if (f._aus || f.versteckt || (ids && !ids.includes(f.id))) continue;
    const L = lageVon(f), m = material(f.material);
    if (["blech", "vorlage", "profil"].includes(f.typ) && f._res?.pfad?.length && f._kernLage) {
      const zw = zweiseitig(f, "laenge", "laenge2"), rueck = rueckVersatz(zw.richtung, zw.tiefe);
      out.push({ art: "profil", id: f.id, name: f.name, t: m.t, material: f.material, pfad: f._res.pfad, versatz: f._kernLage.versatz, ebene: tr(f._kernLage.ebene, L), z0: -rueck, z1: -rueck + zw.tiefe });
    } else if (f.typ === "flaeche" && f._bleche?.length) {
      const s = finde(f.skizze); if (!s) continue;
      f._bleche.forEach((bl, i) => out.push({ art: "flaeche", id: `${f.id}:${i}`, name: f._teile?.[i]?.name || f.name, t: m.t, material: f.material, pts: bl.pts, gruppen: bl.gruppen, profile: bl.profile, ebene: tr(blechEbene(s.ebene, f, m), L), seite: f.sichtseite === -1 ? -1 : 1 }));
    }
  }
  return out;
}
simulation = simModul({
  $, esc, status, szene, modell, kamera, renderer, leeren, doc: () => doc, treffer: (e, ziele = null) => { strahl.setFromCamera(ndc(e), kamera); return strahl.intersectObjects(ziele || modell.children.filter((o) => o.isMesh), false)[0] || null; }, merke: () => merke(), material, drucken: (html) => { $("druck").innerHTML = html; druckeAusgabe("Plan"); },
  quellen: (ids) => femQuellen().filter((q) => !ids || ids.includes(q.id)),
  vorOeffnen: () => { if (dlg) $("dAbbrechen").click(); if (messen) messenUmschalten(false); if (quetschWz) endeQuetschWz(); if (nahtWz) endeNahtWz(); },
});
const simStart = (fn) => () => { if (skizze) return status("Simulation ausserhalb der Skizze – erst die Skizze beenden."); if (dlg) $("dAbbrechen").click(); simulation.oeffnen(true); fn?.(); };
$("wSimFenster").onclick = () => { if (skizze) return status("Erst die Skizze beenden."); if (dlg) $("dAbbrechen").click(); simulation.oeffnen(!simulation.offen()); };
for (const [id, fn] of [["wSimFest", () => simulation.formStart("lager", { art: "eingespannt" })], ["wSimGelenk", () => simulation.formStart("lager", { art: "gelenkig" })], ["wSimGleit", () => simulation.formStart("lager", { art: "gleitX" })], ["wSimWeg", () => simulation.formStart("lager", { art: "vorgabe" })],
  ["wSimKraft", () => simulation.formStart("kraft")], ["wSimDruck", () => simulation.formStart("druck")], ["wSimStrecke", () => simulation.formStart("strecke")], ["wSimGrav", () => simulation.formStart("schwerkraft")], ["wSimNorm", () => simulation.formStart("norm")], ["wSimLF", () => simulation.formStart("lastfall")],
  ["wSimRechnen", () => simulation.rechnen()], ["wSimSpannung", () => simulation.zeige("spannung")], ["wSimVerschiebung", () => simulation.zeige("verschiebung")], ["wSimSicherheit", () => simulation.zeige("sicherheit")], ["wSimBeulform", () => simulation.zeige("beulform")], ["wSimBericht", () => simulation.test.bericht()]]) $(id).onclick = simStart(fn);

let schnitt = null; // { ebene, versatz, umkehren }
renderer.localClippingEnabled = false;
// Gefüllte Schnittfläche (Schablonenpuffer wie im three.js-Beispiel): Rück- und Vorderseiten zählen, wo innen → Deckel mit Schraffur
const kappen = new THREE.Group(); szene.add(kappen);
let schraffur = null;
function schraffurTextur() {
  if (schraffur) return schraffur;
  const c = document.createElement("canvas"); c.width = c.height = 64; const g = c.getContext("2d");
  g.fillStyle = "#e46d3a"; g.fillRect(0, 0, 64, 64); g.strokeStyle = "#8a2f12"; g.lineWidth = 3;
  for (let i = -64; i < 128; i += 16) { g.beginPath(); g.moveTo(i, 64); g.lineTo(i + 64, 0); g.stroke(); }
  schraffur = new THREE.CanvasTexture(c); schraffur.wrapS = schraffur.wrapT = THREE.RepeatWrapping; schraffur.colorSpace = THREE.SRGBColorSpace; return schraffur;
}
function zeigeKappen(ebene) {
  kappen.children.forEach((o) => o.geometry !== undefined && o.userData.eigen && o.geometry.dispose()); kappen.clear();
  if (!schnitt || !ebene) return;
  const zaehl = (seite, op) => new THREE.MeshBasicMaterial({ side: seite, depthWrite: false, depthTest: false, colorWrite: false, stencilWrite: true, stencilFunc: THREE.AlwaysStencilFunc, stencilFail: op, stencilZFail: op, stencilZPass: op });
  const hinten = zaehl(THREE.BackSide, THREE.IncrementWrapStencilOp), vorne = zaehl(THREE.FrontSide, THREE.DecrementWrapStencilOp);
  modell.updateMatrixWorld(true);
  for (const o of modell.children) if (o.isMesh && o.visible) for (const mat of [hinten, vorne]) {
    const k = new THREE.Mesh(o.geometry, mat); k.matrixAutoUpdate = false; k.matrix.copy(o.matrixWorld); k.renderOrder = 1; kappen.add(k);
  }
  // Deckel: grosse Fläche in der Schnittebene, minimal auf die sichtbare Seite versetzt (sonst schneidet sie sich selbst weg)
  const box = alleBox(), gr = box.isEmpty() ? 5000 : box.getSize(new THREE.Vector3()).length() * 2;
  const tex = schraffurTextur(); tex.repeat.set(gr / 120, gr / 120);
  const deckel = new THREE.Mesh(new THREE.PlaneGeometry(gr, gr), new THREE.MeshBasicMaterial({ map: tex, side: THREE.DoubleSide, stencilWrite: true, stencilRef: 0,
    stencilFunc: THREE.NotEqualStencilFunc, stencilFail: THREE.ReplaceStencilOp, stencilZFail: THREE.ReplaceStencilOp, stencilZPass: THREE.ReplaceStencilOp }));
  deckel.userData.eigen = true;
  const n = ebene.normal.clone(), p = n.clone().multiplyScalar(-ebene.constant + 0.05);
  deckel.position.copy(p); deckel.lookAt(p.clone().add(n)); deckel.position.add(box.isEmpty() ? new THREE.Vector3() : box.getCenter(new THREE.Vector3()).projectOnPlane(n));
  deckel.renderOrder = 2; deckel.onAfterRender = (r) => r.clearStencil(); kappen.add(deckel);
}
function wendeSchnittAn() {
  if (!schnitt) { renderer.clippingPlanes = []; zeigeKappen(null); $("wSchnitt").setAttribute("aria-pressed", false); return; }
  const E = E_(schnitt.ebene), n = V(E.n).multiplyScalar(schnitt.umkehren ? 1 : -1);
  renderer.clippingPlanes = [new THREE.Plane().setFromNormalAndCoplanarPoint(n, V(E.o).add(V(E.n).multiplyScalar(schnitt.versatz || 0)))];
  zeigeKappen(renderer.clippingPlanes[0]);
  $("wSchnitt").setAttribute("aria-pressed", true);
}
$("wKollision").onclick = () => {
  if (skizze) return; if (dlg) $("dAbbrechen").click();
  if (kollisionen.children.length) { kollisionen.children.forEach((o) => o.geometry.dispose()); kollisionen.clear(); return status("Kollisionsanzeige aus."); }
  status("Prüfe Kollisionen …");
  setTimeout(() => {
    const r = pruefeKollision();
    status(r.liste.length ? `⚠ ${r.liste.length} Kollision${r.liste.length === 1 ? "" : "en"} (rot): ` + r.liste.map((t) => `${t.paar} ${t.volumen > 1000 ? (t.volumen / 1000).toFixed(1) + " cm³" : t.volumen.toFixed(0) + " mm³"}`).join(" · ") + " – nochmals klicken blendet aus."
      : `Keine Kollisionen (${r.paare} Körperpaare nahe beieinander geprüft).`);
  }, 30);
};
$("wSchnitt").onclick = () => {
  if (skizze) return;
  if (schnitt && !dlg) { schnitt = null; wendeSchnittAn(); return status("Schnittanalyse aus."); }
  if (dlg) $("dAbbrechen").click();
  const vorher = schnitt; schnitt = schnitt || { ebene: "XZ", versatz: 0, umkehren: false };
  dialog({ titel: "Schnittanalyse", felder: [
      { id: "ebene", label: "Schnittebene", wahl: "ebene", optionen: ebenenOpt(null, schnitt.ebene), wert: schnitt.ebene },
      { id: "versatz", label: "Versatz", einheit: "mm", wert: schnitt.versatz },
      { id: "umkehren", label: "Seite", optionen: [["", "Vorderseite wegschneiden"], ["1", "Rückseite wegschneiden"]], wert: schnitt.umkehren ? "1" : "" }],
    hinweis: "Ebene in der Ansicht anklicken oder wählen, Versatz eintippen. Der Schnitt bleibt nach OK aktiv – nochmals «Schnitt» klicken schaltet ihn aus.",
    aendern: (w) => { schnitt = { ebene: w.ebene, versatz: Number.isFinite(w.versatz) ? w.versatz : 0, umkehren: !!w.umkehren }; wendeSchnittAn(); },
    ok: (w) => { schnitt = { ebene: w.ebene, versatz: Number.isFinite(w.versatz) ? w.versatz : 0, umkehren: !!w.umkehren }; status("Schnittanalyse aktiv – «Schnitt» schaltet sie aus."); },
    abbrechen: () => { schnitt = vorher; } });
  wendeSchnittAn();
};

// ------------------------------------------------------------ Planblatt (Zeichnung): Ansichten, Details, Bemassung, Schriftfeld
// Abwicklung eines Blechteils im Plan: Umriss (mit Ausklinkungen und Löchern) und Biegelinien, längste Kante waagrecht
function abwicklungPlanAnsicht(ref, k) {
  const x = blechteile().find((b) => String(b.id) === ref); if (!x) return null;
  let aussen = [], loecher = [], biegen = [];
  if (x._blech?.abw) { const A = x._blech.abw, R = (p) => A.dreh(p); aussen = A.umriss.map(R); loecher = (A.loecher || []).map((l) => l.map(R)); biegen = (A.linien || []).map((l) => l.punkte.map(R)); }
  else if (x._res) { const W = x._res.zuschnitt, H = +x.laenge || 100; aussen = [[0, 0], [W, 0], [W, H], [0, H]]; biegen = (x._res.biegungen || []).map((b) => [[b.pos, 0], [b.pos, H]]); }
  if (!aussen.length) return null;
  const polySeg = (p) => p.map((q, i) => [q, p[(i + 1) % p.length]]);
  let konturen = [aussen];
  if (loecher.length) { // zugeschnitten: Ausschnitte vom Umriss abziehen (auch Ausklinkungen am Rand) – übrig bleibt die Fläche im Umriss ausserhalb der Ausschnitte
    const rest = regionen([...polySeg(aussen), ...loecher.flatMap(polySeg)], 1e-4, 0.05).filter((r) => innen(r.innen, aussen) && !loecher.some((l) => innen(r.innen, l)));
    if (rest.length) konturen = rest.flatMap((r) => [r.aussen, ...r.loecher]);
  }
  const imLoch = (p) => loecher.some((l) => innen(p, l));
  const biegeStuecke = biegen.flatMap((l) => l.slice(1).flatMap((q, i) => { const a = l[i], n = Math.max(1, Math.ceil(Math.hypot(q[0] - a[0], q[1] - a[1]) / 1)), st = []; for (let t = 0; t < n; t++) { const p0 = [a[0] + ((q[0] - a[0]) * t) / n, a[1] + ((q[1] - a[1]) * t) / n], p1 = [a[0] + ((q[0] - a[0]) * (t + 1)) / n, a[1] + ((q[1] - a[1]) * (t + 1)) / n]; if (!imLoch([(p0[0] + p1[0]) / 2, (p0[1] + p1[1]) / 2])) { const l = st.at(-1); if (l && l[1][0] === p0[0] && l[1][1] === p0[1]) l[1] = p1; else st.push([p0, p1]); } } return st; })); // zusammenhängende Stücke zu einer Linie, damit der Strichpunkt durchläuft
  const xs = aussen.map((p) => p[0]), ys = aussen.map((p) => p[1]), x0 = Math.min(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys), x1 = Math.max(...xs);
  const T = (p) => [(p[0] - x0) * k, (y1 - p[1]) * k];
  const layer = [{ farbe: "#000000", strich: "", linien: konturen.flatMap((c) => polySeg(c).map(([a, b]) => [...T(a), ...T(b)])) }];
  if (biegeStuecke.length) layer.push({ farbe: "#e02424", strich: "8 1.5 1.5 1.5", linien: biegeStuecke.map(([a, b]) => [...T(a), ...T(b)]) });
  const punkte = konturen.flat().map((p) => { const [px, py] = T(p); return { x: px, y: py, w: [p[0], p[1], 0] }; });
  return { breite: (x1 - x0) * k, hoehe: (y1 - y0) * k, layer, sichtbar: layer.flatMap((l) => l.linien), verdeckt: [], flaechen: [], massstab: 1 / k, abbild: (w) => T(w), punkte, kreise: [] };
}
// Skizzen als Zeichnung im Plan: Linien je Layer (Farbe, Linienart), Eckpunkte/Mittelpunkte zum Bemassen, Kreise für Ø/R; Papier-mm = Skizzen-mm · k
// Details aus dem Dach: Schnitt durch den Aufbau mit Anschlussblech an Traufe, Ortgang, First, Grat, Kehle (je Dach und Neigung)
function dachDetails() {
  return doc.features.filter((f) => f.typ === "dach" && f._dach && f._schichten && !f._aus).flatMap((f) => {
    const gesehen = new Set(), out = [];
    for (const sg of dachSegmente(f._dach.flaechen)) { const n = Math.round(sg.neigung); if (gesehen.has(sg.art + n)) continue; gesehen.add(sg.art + n); out.push([`dach|${f.id}|${sg.art}|${n}`, `${f.name} · ${DETAILARTEN[sg.art]} ${n}° (Dachaufbau)`]); }
    return out.sort((a, b) => Object.keys(DETAILARTEN).findIndex((k) => a[0].includes("|" + k + "|")) - Object.keys(DETAILARTEN).findIndex((k) => b[0].includes("|" + k + "|")));
  });
}
function dachDetailSvg(ref, M) {
  const [, id, art, n] = String(ref).split("|"), f = finde(id); if (f?.typ !== "dach" || !f._schichten) return null;
  const bl = doc.features.find((x) => x.typ === "dachbleche" && x.dach === id), par = { ...standardwerte(BLECH_VORLAGE[art]), ...(bl?.params?.[art] || {}) };
  const sch = dachSchnitt({ art, neigung: +n || 35, schichten: f._schichten, aufbau: aufbauVon(f), wandstaerke: finde(f.gebaeude)?.wandstaerke || 300, ueberstand: art === "ortgang" ? +f.ueberstandOrtgang || 0 : +f.ueberstandTraufe || 0, blech: par });
  return dachSchnittSvg(sch, { M: Math.max(1, M), blechDicke: material(bl?.material).t });
}
// Dachaufsicht im Plan: Aussenkanten, First, Grate, Kehlen (Linienarten) und Gebäudeumriss; Eckpunkte zum Bemassen
function dachAufsichtAnsicht(id, k) {
  const f = finde(id), r = f?._dach, g = f && finde(f.gebaeude); if (!r || !g) return null;
  const P = (p) => [p[0] + (+g.x || 0), p[1] - (+g.z || 0)], segs = dachSegmente(r.flaechen), pts = new Map();
  const art = (a) => segs.filter((x) => x.art === a).map((x) => [P(x.von), P(x.bis)]), umriss = gebaeudeUmriss(g).map(P);
  const gruppen = [{ farbe: "#888888", strich: "1.5 1", segs: umriss.map((a, i) => [a, umriss[(i + 1) % umriss.length]]) }, { farbe: "#000000", strich: "", segs: [...art("traufe"), ...art("ortgang")] }, { farbe: "#e02424", strich: "", segs: art("first") },
    { farbe: "#7a3fb0", strich: "4 1.2 0.4 1.2", segs: art("grat") }, { farbe: "#1f5fbf", strich: "3 1.5", segs: art("kehle") }].filter((x) => x.segs.length);
  const alle = gruppen.flatMap((x) => x.segs).flat(); if (!alle.length) return null;
  const x0 = Math.min(...alle.map((p) => p[0])), x1 = Math.max(...alle.map((p) => p[0])), y0 = Math.min(...alle.map((p) => p[1])), y1 = Math.max(...alle.map((p) => p[1])), T = (p) => [(p[0] - x0) * k, (y1 - p[1]) * k];
  for (const p of alle) pts.set(`${Math.round(p[0])},${Math.round(p[1])}`, p);
  const layer = gruppen.map((x) => ({ farbe: x.farbe, strich: x.strich, linien: x.segs.map(([a, b]) => [...T(a), ...T(b)]) }));
  return { breite: (x1 - x0) * k, hoehe: (y1 - y0) * k, layer, sichtbar: layer.flatMap((l) => l.linien), verdeckt: [], flaechen: [], massstab: 1 / k, abbild: (w) => T(w), punkte: [...pts.values()].map((p) => { const [x, y] = T(p); return { x, y, w: [p[0], p[1], 0] }; }), kreise: [] };
}
function skizzenPlanAnsicht(id, k) {
  if (String(id).startsWith("dach:")) return dachAufsichtAnsicht(String(id).slice(5), k);
  const sks = id === "alle" ? doc.features.filter((x) => x.typ === "skizze" && !x.versteckt && !x._aus) : [finde(id)].filter((x) => x?.typ === "skizze");
  const gruppen = new Map(), punkte = [], kreise = [], strich = { gestrichelt: "3 1.5", strichpunkt: "4 1.2 0.4 1.2", mittellinie: "8 1.5 1.5 1.5", verdeckt: "1.5 1", gepunktet: "0.3 1.2" };
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  const pkt = (p) => punkte.push(p), erw = (p) => { x0 = Math.min(x0, p[0]); y0 = Math.min(y0, p[1]); x1 = Math.max(x1, p[0]); y1 = Math.max(y1, p[1]); };
  for (const sk of sks) for (const el of sk.elemente) {
    if (el.hilfs || el.projiziert || el.art === "punkt") continue;
    const ly = layerVon(el); if (ly.sichtbar === false) continue;
    const g = gruppen.get(ly.id) || gruppen.set(ly.id, { ly, segs: [] }).get(ly.id);
    for (const pts of elGeo(el).linien) for (let i = 0; i + 1 < pts.length; i++) { g.segs.push([pts[i], pts[i + 1]]); erw(pts[i]); erw(pts[i + 1]); }
    if (el.art === "linie") el.pts.forEach(pkt); else if (el.art === "rechteck") [el.a, [el.b[0], el.a[1]], el.b, [el.a[0], el.b[1]]].forEach(pkt);
    else if (el.art === "kreis") { pkt(el.c); kreise.push({ c: el.c, r: el.r, voll: true }); }
    else if (el.art === "bogen") { pkt(el.a); pkt(el.b); const d = bogenDaten(el); if (d) { pkt(d.c); kreise.push({ c: d.c, r: d.r, voll: false }); } }
    else if (el.art === "langloch") { pkt(el.a); pkt(el.b); }
  }
  if (!isFinite(x0)) return null;
  const T = (p) => [(p[0] - x0) * k, (y1 - p[1]) * k], farbe = (ly) => "#" + (ly.aci == null || ly.aci === 7 ? 0x000000 : farbeHex(ly.aci)).toString(16).padStart(6, "0");
  const layer = [...gruppen.values()].map((g) => ({ farbe: farbe(g.ly), strich: strich[g.ly.art] || "", linien: g.segs.map(([a, b]) => [...T(a), ...T(b)]) }));
  const doppelt = new Set();
  return { breite: (x1 - x0) * k, hoehe: (y1 - y0) * k, layer, sichtbar: layer.flatMap((l) => l.linien), verdeckt: [], flaechen: [], massstab: 1 / k, abbild: (w) => T(w),
    punkte: punkte.filter((p) => { const key = `${Math.round(p[0] * 100)},${Math.round(p[1] * 100)}`; if (doppelt.has(key)) return false; doppelt.add(key); return true; }).map((p) => { const [x, y] = T(p); return { x, y, w: [p[0], p[1], 0] }; }),
    kreise: kreise.map((c) => ({ w: [c.c[0], c.c[1], 0], r: c.r, voll: c.voll })) };
}
const plaene = planModul({
  renderer, status, herunterladen, einst: () => einst, doc: () => doc, signatur: () => zustand(), speichern: () => { speichern(); },
  meshes: (aus) => { modell.updateMatrixWorld(true); return modell.children.filter((o) => o.isMesh && o.visible && !planAus(aus, o.userData.fid)); },
  exaktAnsicht: (art, massstab, verdeckt, bereit, lage, aus) => exakteAnsicht(art, massstab, verdeckt, bereit, lage, aus),
  // Browser im Plan: sichtbare Körper (ohne Ausschnitte) nach Komponenten
  koerperBaum: () => { const ids = new Set(); for (const o of modell.children) if (o.isMesh && o.userData.fid != null) { const h = hauptVon(o.userData.fid); if (h) ids.add(h.id); } return [...ids].map((id) => finde(id)).filter(Boolean).map((f) => ({ id: f.id, name: f.name, komp: f.komponente || "" })); },
  groesse: () => { const b = alleBox(); return b.isEmpty() ? 1000 : Math.max(...b.getSize(new THREE.Vector3()).toArray()); },
  // Schnitte = Querschnitte der Kantenbausteine an Flächenblechen («fid|Blech:Kante»), massstäblich
  details: () => [...dachDetails(), ...doc.features.filter((f) => f.typ === "flaeche" && f._bleche && !f._aus).flatMap((f) => Object.keys(f.kanten || {}).filter((k) => kantenProfil(f, k))
    .map((k) => [`${f.id}|${k}`, `${f.name} · ${kantenName(f, k)} · ${kantenProfil(f, k).name}`]))],
  detailSvg: (ref, M) => {
    if (String(ref).startsWith("dach|")) return dachDetailSvg(ref, M);
    const [fid, k] = String(ref).split("|"), f = finde(fid), p = f && k && kantenProfil(f, k); if (!p) return null;
    const { w, h } = bausteinGrenzen(p), rand = 5, b = w / M + 2 * rand, hh = h / M + 2 * rand;
    return { svg: bausteinSvg(p, material(f.material).t, { breite: b, hoehe: hh, rand, schrift: 2.5, massstab: 1 / M, papier: true }), b, h: hh, name: `Schnitt ${kantenName(f, k)} · ${p.name}` };
  },
  // Tabellen aufs Blatt: Stückliste (alle Blechteile) und Biegeliste je Teil – aus dem Modell, aktualisieren sich selbst
  tabellenListe: () => { const t = blechteile().filter((x) => x._res); return t.length ? [["stueck", null, "Stückliste (alle Blechteile)"], ...t.map((x) => ["biege", String(x.id), "Biegeliste: " + x.name])] : []; },
  tabelle: (art, fid) => {
    const t = blechteile().filter((x) => x._res), L = (x) => (x.typ === "flaechenteil" ? x.laenge : laengeVon(x));
    if (art === "stueck") return t.length ? { titel: "Stückliste", kopf: ["Pos.", "Bezeichnung", "Material", "Zuschnitt", "Stk."], zeilen: t.map((x, i) => { const m = material(x.material); return [String(i + 1), x.name, `${m.name.replace(/ [\d.]+$/, "")} ${m.t} mm`, `${f1(x._res.zuschnitt)} × ${f1(L(x))} mm`, String(x.stueck ?? 1)]; }) } : null;
    const x = t.find((q) => String(q.id) === fid); if (!x) return null;
    return { titel: "Biegeliste " + x.name, kopf: ["Nr.", "Winkel", "Anschlag A", "Anschlag B", "Richtung"], zeilen: (x._res.biegungen || []).map((b, i) => [String(b.nr ?? i + 1), `${f1(Math.abs(b.winkel))}°`, f1(b.pos), f1(x._res.zuschnitt - b.pos), b.richtung || (b.winkel > 0 ? "oben" : "unten")]) };
  },
  abwicklungen: () => blechteile().filter((x) => x._blech?.abw || x._res).map((x) => [String(x.id), x.name]),
  abwicklungAnsicht: (ref, k) => abwicklungPlanAnsicht(ref, k),
  skizzen: () => [...doc.features.filter((x) => x.typ === "dach" && x._dach && !x._aus).map((x) => ["dach:" + x.id, "Dachaufsicht " + x.name]), ...doc.features.filter((x) => x.typ === "skizze" && !x._aus && x.elemente.some((el) => !el.hilfs && el.art !== "punkt")).map((x) => [x.id, x.name])],
  skizzenAnsicht: (id, k) => skizzenPlanAnsicht(id, k),
  ablageKopie: (n, i, art) => ablage?.kopie(n, i, art),
  drucken: (html) => { $("druck").innerHTML = html; window.print(); },
  fertig: () => { merke(); status("Pläne gespeichert – sie gehören zum Projekt."); },
});
plaene.binden();
$("wPlan").onclick = () => { if (skizze) return status("Zuerst die Skizze beenden."); if (dlg) $("dAbbrechen").click(); regen(); plaene.oeffnen(); };

// ------------------------------------------------------------ Einstellungen: Materialien kalibrieren, Lagerformate
let entwurf = null; // Arbeitskopie, erst «Übernehmen» speichert
// Skizze zur Probebiegung: Streifen vor dem Biegen, danach 90° mit den Aussenmassen a und b
const PROBE_SKIZZE = `<svg class="probeskizze" viewBox="0 0 250 150" role="img" aria-label="Skizze: Streifen mit Zuschnitt, nach dem Biegen Schenkel a und b aussen gemessen">
  <defs><marker id="pf" viewBox="0 0 8 8" refX="4" refY="4" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0 0L8 4L0 8z" fill="currentColor"/></marker></defs>
  <g font-size="11" text-anchor="middle" fill="currentColor">
    <text x="55" y="14" font-weight="600">1. vor dem Biegen</text>
    <rect x="10" y="26" width="90" height="5" fill="none" stroke="currentColor" stroke-width="1.5"/>
    <line x1="10" y1="42" x2="100" y2="42" stroke="currentColor" marker-start="url(#pf)" marker-end="url(#pf)"/>
    <text x="55" y="56">Zuschnitt</text>
    <text x="180" y="14" font-weight="600">2. nach 90°-Biegung</text>
    <path d="M150 30V118a6 6 0 0 0 6 6H230" fill="none" stroke="currentColor" stroke-width="5" stroke-linejoin="round"/>
    <line x1="137" y1="30" x2="137" y2="126.5" stroke="#c4352b" marker-start="url(#pf)" marker-end="url(#pf)"/>
    <text x="128" y="82" fill="#c4352b" font-weight="600">a</text>
    <line x1="147.5" y1="139" x2="230" y2="139" stroke="#c4352b" marker-start="url(#pf)" marker-end="url(#pf)"/>
    <text x="190" y="135" fill="#c4352b" font-weight="600">b</text>
    <text x="196" y="108" font-size="10">aussen messen</text>
  </g></svg>`;
const probeWerte = { mat: 0, z: 130, a: "", b: "" };
const meldung = (t) => { $("eMeldung").textContent = t; };
const zahlen = (t) => String(t).split(/[\s,;]+/).map(parseFloat).filter((v) => v > 0);
let einstRegister = "allgemein", einstLetzte = null, einstSeiteLetzte = null, einstOffen = new Set();
// Einstellungen: sechs Seiten, darin klappbare Abschnitte (statt zwölf Register)
const EINST_SEITEN = [["allgemein", "Allgemein", ["allgemein"]], ["ausgabe", "Firma & Ausgabe", ["firma", "druck", "etiketten"]], ["material", "Material & Lager", ["material", "lager", "maschinen"]], ["konstruktion", "Konstruktion", ["neu", "bausteine", "detail3d", "dach"]], ["daten", "Konto & Daten", ["konto", "vorlagen"]], ["programm", "Programm", ["programm"]]];
const EINST_TITEL = { allgemein: "Darstellung, Bedienung und Speichern", firma: "Firmenlogo und Begrüssung", druck: "Werkstattblatt und Stückliste", etiketten: "Etiketten", material: "Materialien und K-Faktor", lager: "Lagerformate", maschinen: "Biegemaschinen (Biegesimulation)", neu: "Vorgaben für neue Teile", bausteine: "Kantenbausteine", detail3d: "3D-Details", dach: "Dach: Deckungen und Aufbauten", konto: "Konto und Cloud", vorlagen: "Vorlagen, Sicherungen und Übertragen", programm: "Programm, Kern und Diagnose" };
const EINST_REGISTER = [["allgemein", "Allgemein"], ["material", "Materialien"], ["lager", "Lager"], ["neu", "Neue Teile"], ["druck", "Druck"], ["etiketten", "Etiketten"], ["programm", "Programm"], ["bausteine", "Bausteine"], ["detail3d", "Details 3D"], ["vorlagen", "Vorlagen & Sichern"], ["dach", "Dach"], ["konto", "Konto & Cloud"]];
// Feld an einen Wert der Einstellungen binden: data-e="gruppe.schluessel", data-typ zahl|text|janein|wahl
function einstFeld(pfad, label, typ = "zahl", optionen = null, hinweis = "") {
  const [g, k] = pfad.split("."), w = entwurf[g][k], id = "e_" + g + "_" + k;
  const inp = typ === "janein" ? `<input id="${id}" type="checkbox" data-e="${pfad}" data-typ="janein" ${w ? "checked" : ""}>`
    : typ === "wahl" ? `<select id="${id}" data-e="${pfad}" data-typ="wahl">${optionen.map(([v, t]) => `<option value="${esc(v)}" ${String(v) === String(w) ? "selected" : ""}>${esc(t)}</option>`).join("")}</select>`
    : `<input id="${id}" type="${typ === "zahl" ? "number" : "text"}" step="any" ${typ === "zahl" ? 'inputmode="decimal"' : ""} data-e="${pfad}" data-typ="${typ}" value="${esc(w)}">`;
  return `<div class="efeld ${typ === "janein" ? "janein" : ""}"><label for="${id}">${label}</label>${inp}${hinweis ? `<small class="hinweis">${hinweis}</small>` : ""}</div>`;
}
function zeigeEinst() {
  const MATLAB = { name: "Name", t: "Dicke", ri: "Innenradius", k: "K-Faktor", dichte: "Dichte", emod: "E-Modul", rp02: "Rp0,2", umSchr: "Stauchen max", umStr: "Strecken max" }, e = entwurf, feld = (i, k, wert, schritt = "any") => `<input aria-label="${esc((MATLAB[k] || k) + " " + (e.materialien?.[i]?.name ?? ""))}" data-i="${i}" data-k="${k}" type="${k === "name" ? "text" : "number"}" step="${schritt}" inputmode="decimal" value="${esc(wert)}">`;
  const seite = EINST_SEITEN.find(([, , k]) => k.includes(einstRegister)) || EINST_SEITEN[0];
  const ICO = { allgemein: '<circle cx="12" cy="12" r="3.2"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1"/>', ausgabe: '<path d="M7 9V3h10v6"/><rect x="3" y="9" width="18" height="8" rx="2"/><path d="M7 14h10v7H7z"/>', material: '<path d="M12 3l9 4.5-9 4.5-9-4.5z"/><path d="M3 12l9 4.5 9-4.5M3 16.5L12 21l9-4.5"/>', konstruktion: '<path d="M4 9h4V5h4v4h4v4h-4v4H8v-4H4z"/><path d="M16 13h4v6h-6v-2"/>', daten: '<path d="M7 18h10a4 4 0 0 0 .6-7.95A5.5 5.5 0 0 0 7.1 8.6 4.7 4.7 0 0 0 7 18z"/>', programm: '<path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0"/><circle cx="16" cy="6" r="2"/><circle cx="10" cy="12" r="2"/><circle cx="18" cy="18" r="2"/>' };
  $("eNav").innerHTML = EINST_SEITEN.map(([id, t]) => `<button role="tab" data-ereg="${id}" aria-selected="${id === seite[0]}"><svg viewBox="0 0 24 24" aria-hidden="true">${ICO[id]}</svg>${t}</button>`).join("");
  const inhalt = {
    allgemein: `
    <h4>Firma</h4>
    <div class="firmaeinst">
      <div class="logovorschauen"><div class="logovorschau blau">${entwurf.firma.logo ? `<img src="${(logoBanner(entwurf.firma) || {}).src}" alt="Logo auf Blau">` : '<span class="hinweis">Kein Logo</span>'}</div><div class="logovorschau">${entwurf.firma.logo ? `<img src="${logoPapier(entwurf.firma)}" alt="Logo auf Papier">` : ""}</div><small class="hinweis">auf Blau · auf Papier</small></div>
      <div><div class="reihe ohnerand"><label class="knopf" for="eLogoDatei">Logo hochladen …</label><input type="file" id="eLogoDatei" accept="image/png,image/jpeg,image/webp,image/svg+xml" hidden>${entwurf.firma.logo ? '<button class="knopf weg" id="eLogoWeg" type="button">Entfernen</button>' : ""}</div>
      <p class="hinweis">Erscheint auf Startseite, Blättern und Plänen. Am besten PNG (transparent) oder SVG.</p></div>
    </div>
    <div class="egitter">${einstFeld("firma.vorname", "Vorname für die Begrüssung", "text", null, "leer = Name aus der Cloud-Anmeldung")}
      ${einstFeld("firma.logoModus", "Logo auf blauen Flächen", "wahl", [["auto", "Automatisch (dunkle Logos werden weiss)"], ["original", "Original"], ["weiss", "Immer weiss"]], "Auf Papier wird ein weisses Logo automatisch dunkelblau")}</div>
    <h4>Start</h4>
    <div class="egitter">${einstFeld("allgemein.startseite", "Startseite beim Programmstart zeigen", "janein")}</div>
    <h4>Darstellung</h4>
    <div class="egitter">${einstFeld("programm.darstellung", "Farben", "wahl", [["auto", "Wie das Gerät"], ["hell", "Hell"], ["dunkel", "Dunkel"]])}</div>
    <h4>Bedienung mit Stift und Finger</h4>
    <div class="egitter">
      ${einstFeld("allgemein.stiftpalette", "Stiftpalette", "wahl", [["auto", "Automatisch (nur auf Tablets)"], ["ein", "Immer anzeigen"], ["aus", "Nie anzeigen"]], "Knöpfe am rechten Bildrand: Auswahl, Linie, Rechteck, Kreis, Löschen, Bemassung, Rückgängig …")}
      ${einstFeld("allgemein.langdruck", "Langer Fingerdruck öffnet das Kontextmenü", "janein")}
    </div>
    <h4>Stiftpalette: sichtbare Knöpfe</h4>
    <div class="egitter">${STIFT_ALLE.map(([id, t, g]) => `<div class="efeld janein"><label for="e_stift_${id}">${t}${g === "skizze" ? ' <small class="hinweis">(Skizze)</small>' : g === "modell" ? ' <small class="hinweis">(Modell)</small>' : ""}</label><input type="checkbox" id="e_stift_${id}" data-stift="${id}" ${entwurf.allgemein.stift.includes(id) ? "checked" : ""}></div>`).join("")}</div>
    <p class="hinweis">Verschieben am Griff ⋮⋮; Doppelklick setzt zurück.</p>
    <h4>Skizze: beim Öffnen anzeigen</h4>
    <div class="egitter">
      ${einstFeld("allgemein.masse", "Masse", "janein")}
      ${einstFeld("allgemein.abh", "Abhängigkeitssymbole", "janein")}
    </div>
    <h4>Speichern und Ansicht</h4>
    <div class="egitter">
      ${einstFeld("allgemein.speichern", "Speichern in (Vorauswahl)", "wahl", [["zuletzt", "Wie zuletzt gewählt"], ["cloud", "Cloud"], ["pc", pc ? "Auf dem PC" : "Auf dem Gerät"]])}
      ${einstFeld("allgemein.startAnsicht", "Ansicht nach dem Öffnen", "wahl", [["iso", "Isometrisch"], ["vorne", "Vorne"], ["oben", "Oben"], ["rechts", "Rechts"]])}
    </div>
    <p class="hinweis">Weitere Voreinstellungen: Seiten «Firma & Ausgabe», «Konstruktion» und «Konto & Daten».</p>`,
    material: `
    <h4>Materialien</h4>
    <div class="tabwrap"><table class="zeilen mat"><thead><tr><th>Name</th><th>Dicke mm</th><th>Innenradius mm</th><th>K-Faktor</th><th>Dichte kg/dm³</th><th title="Simulation: Elastizitätsmodul in N/mm² – leer = Richtwert nach Werkstoff">E-Modul N/mm²</th><th title="Simulation: Streckgrenze Rp0,2 in N/mm² – leer = Richtwert nach Werkstoff">Rp0,2 N/mm²</th><th title="Eigener Erfahrungswert: um wie viel % lässt sich der Rand stauchen">Stauchen max %</th><th title="Eigener Erfahrungswert: um wie viel % lässt sich der Rand strecken">Strecken max %</th><th></th></tr></thead><tbody>
    ${e.materialien.map((m, i) => `<tr><td>${feld(i, "name", m.name)}</td><td>${feld(i, "t", m.t)}</td><td>${feld(i, "ri", m.ri)}</td><td>${feld(i, "k", m.k)}</td><td>${feld(i, "dichte", m.dichte ?? "")}</td><td>${feld(i, "emod", m.emod ?? "")}</td><td>${feld(i, "rp", m.rp ?? "")}</td><td>${feld(i, "umSchr", m.umform?.schrumpfMaxProzent ?? "")}</td><td>${feld(i, "umStr", m.umform?.streckMaxProzent ?? "")}</td>
      <td>${e.materialien.length > 1 ? `<button class="weg" data-weg="${i}" aria-label="${esc(m.name)} entfernen">×</button>` : ""}</td></tr>`).join("")}
    </tbody></table></div>
    <button class="knopf" id="eNeuMat">+ Material</button>
    <h4>K-Faktor aus Probebiegung</h4>
    <details class="ehilfe"><summary>So misst du den K-Faktor (Anleitung)</summary>
    <div class="anleitung">
      ${PROBE_SKIZZE}
      <ol>
        <li><b>Material wählen</b> und oben in der Tabelle prüfen: Dicke stimmt, Innenradius = Radius der Biegekante (Oberwange) an deiner Abkantbank.</li>
        <li><b>Streifen zuschneiden</b>, z. B. 100 mm breit und 150–200 mm lang. Breite mit dem Messschieber nachmessen und als <b>Zuschnitt</b> eintragen.</li>
        <li><b>Eine Biegung, genau 90°</b>: etwa in der Mitte abkanten (Anschlag ca. 50 mm), Winkel mit dem Anschlagwinkel prüfen.</li>
        <li><b>Beide Schenkel aussen messen</b>: von der Schnittkante bis zur <i>Aussenseite</i> des anderen Schenkels (Skizze). Am besten an 2–3 Stellen messen und den Mittelwert nehmen.</li>
        <li><b>a und b eintragen</b>, K-Faktor mit «Übernehmen» in die Tabelle setzen, dann unten «Übernehmen» zum Speichern.</li>
      </ol>
    </div>
    <p class="hinweis">Je Material und Dicke einmal machen.</p></details>
    <div class="probe">
      <label>Material <select id="pMat">${e.materialien.map((m, i) => `<option value="${i}" ${i === probeWerte.mat ? "selected" : ""}>${esc(m.name)}</option>`).join("")}</select></label>
      <label>Zuschnitt mm <input id="pZ" type="number" step="any" inputmode="decimal" value="${probeWerte.z}"></label>
      <label>Schenkel a aussen mm <input id="pA" type="number" step="any" inputmode="decimal" placeholder="z. B. 50.7" value="${probeWerte.a}"></label>
      <label>Schenkel b aussen mm <input id="pB" type="number" step="any" inputmode="decimal" placeholder="z. B. 50.7" value="${probeWerte.b}"></label>
    </div>
    <p id="pErgebnis" class="hinweis">a und b eingeben.</p>`,
    lager: `
    <h4>Lagerformate</h4>
    <p class="hinweis">Vorschlag «Aus …»: kleinstes passendes Spaltband, sonst Coil, sonst Tafel.</p>
    <div class="probe">
      <label>Spaltbänder mm <input id="lBand" type="text" value="${e.spaltbaender.join(", ")}"><small class="hinweis">mit Komma getrennt</small></label>
      <label>Coil-Breite mm <input id="lCoil" type="number" step="any" value="${e.coil}"><small class="hinweis">0 = kein Coil</small></label>
      <label>Tafeln B×L mm <input id="lTafeln" type="text" value="${e.tafeln.map(([b, l]) => `${b}×${l}`).join(", ")}"><small class="hinweis">z. B. 1000×2000, 1250×2500</small></label>
    </div>`,
    maschinen: `
    <p class="hinweis">Für die Biegesimulation: Querschnitte von Unterwange, Oberwange und Biegewange eintragen (mm; Biegekante x = 0, Tischoberkante y = 0, y nach oben). Es gibt keine erfundenen Standardwerte – nur was geprüft ist, gilt als «geprüft».</p>
    ${(e.maschinen || []).map((m, i) => { const fehlt = maschineFehlt(m), mf = (label, k, w, st = "any") => `<label class="mfeld"><span>${label}</span><input data-mk="${k}" data-mi="${i}" type="${k === "name" ? "text" : "number"}" step="${st}" value="${esc(w ?? "")}"></label>`;
      return `<div class="mkarte" data-mkarte="${i}"><div class="mkopf"><b>${esc(m.name || "Maschine")}</b><span>${fehlt.length ? `<span class="mpille warn">unvollständig: ${esc(fehlt.join(", "))}</span>` : m.geprueft ? '<span class="mpille ok">geprüft</span>' : '<span class="mpille warn">ungeprüft</span>'}</span><button class="weg" data-mweg="${i}" aria-label="${esc(m.name)} entfernen" title="Maschine entfernen">×</button></div>
      <div class="mgrid">${mf("Name", "name", m.name)}${mf("Arbeitslänge mm", "laenge_mm", m.laenge_mm)}${mf("Mindest-Klemmbreite mm", "min_klemm_mm", m.min_klemm_mm)}${mf("Max. Biegewinkel nach oben °", "max_winkel_auf", m.max_winkel_auf)}${mf("Toleranz mm", "toleranz_mm", m.toleranz_mm)}${mf("Max. Blechdicke mm", "max_blech_mm", m.max_blech_mm)}</div>
      <label class="efeld janein"><label for="mg_${i}">Werkzeugwerte mit der Herstellerzeichnung geprüft</label><input id="mg_${i}" type="checkbox" data-mk="geprueft" data-mi="${i}" ${m.geprueft ? "checked" : ""}></label>
      ${m.hinweis ? `<p class="hinweis">${esc(m.hinweis)}</p>` : ""}
      ${maschinenVorschau(m, 340)}
      <details class="ehilfe"><summary>Querschnitte bearbeiten (JSON)</summary><textarea class="mjson" data-mjson="${i}" rows="9" spellcheck="false" aria-label="Werkzeug-Querschnitte ${esc(m.name)}">${esc(werkzeugeAlsText(m))}</textarea><p class="hinweis" id="mjsonMeldung${i}">Polygone als [[x, y], …]. Änderungen werden beim Verlassen des Feldes übernommen.</p></details></div>`; }).join("") || '<p class="hinweis">Noch keine Maschine.</p>'}
    <div class="reihe ohnerand">${MASCHINEN_VORLAGEN.filter((v) => !(e.maschinen || []).some((m) => m.typ === v.typ)).map((v) => `<button class="knopf" type="button" data-mvorlage="${esc(v.typ)}">+ ${esc(v.name.split(" (")[0])} (Vorlage)</button>`).join("")}<button class="knopf" type="button" data-mneu>+ Leere Maschine</button></div>`,
    neu: `
    <h4>Vorgaben für neue Teile</h4>
    <div class="egitter">
      ${einstFeld("neu.material", "Material", "wahl", e.materialien.map((m) => [m.id, m.name]))}
      ${einstFeld("neu.laenge", "Länge mm")}
      ${einstFeld("neu.stueck", "Stück")}
      ${einstFeld("neu.ebene", "Querschnitt in", "wahl", Object.entries(EBENEN).map(([k, x]) => [k, x.name]))}
      ${einstFeld("neu.lage", "Blechprofil aus Skizze: Blech zur Linie", "wahl", LAGEN)}
    </div>
    <h4>Skizze und 3D-Ansicht</h4>
    <div class="egitter">
      ${einstFeld("skizze.raster", "Fangraster mm", "zahl", null, "0 = aus. Sonst rasten Punkte auf dieses Mass (Umschalt = ohne)")}
      ${einstFeld("skizze.abstand", "Abstand der Teile mm", "zahl", null, "Abstand in 3D")}
    </div>
    <h4>Abkantliste</h4>
    <div class="egitter">${einstFeld("anzeige.abB", "Anschlag auch ab Kante B zeigen (Blech gewendet)", "janein")}</div>`,
    druck: `
    <h4>Werkstattblatt und Stückliste</h4>
    <div class="egitter">
      ${einstFeld("druck.betrieb", "Betrieb (Kopfzeile)", "text", null, "erscheint oben auf jedem Blatt, leer = keine")}
      ${einstFeld("druck.abwicklung", "Abwicklung auf dem Werkstattblatt", "janein")}
      ${einstFeld("druck.etikett", "Etikett auf dem Werkstattblatt", "janein")}
      ${einstFeld("druck.bedarf", "Materialbedarf auf der Stückliste", "janein")}
    </div>`,
    etiketten: `
    <h4>Etikettenbogen (A4)</h4>
    <p class="hinweis">Masse von der Packung ablesen. Standard: 3 × 8 à 70 × 37 mm.</p>
    <div class="egitter">
      ${einstFeld("etiketten.spalten", "Spalten")}${einstFeld("etiketten.zeilen", "Zeilen")}
      ${einstFeld("etiketten.breite", "Etikett breit mm")}${einstFeld("etiketten.hoehe", "Etikett hoch mm")}
      ${einstFeld("etiketten.oben", "Rand oben mm")}${einstFeld("etiketten.links", "Rand links mm")}
      ${einstFeld("etiketten.abstandX", "Abstand waagrecht mm")}${einstFeld("etiketten.abstandY", "Abstand senkrecht mm")}
    </div>
    <p class="hinweis" id="eEtikPruef"></p>`,
    programm: `
    <h4>Exakter CAD-Kern (Beta)</h4>
    <div class="egitter">${einstFeld("programm.kern", "CAD-Kern", "wahl", [["netz", "Aus – wie Version 0.2"], ["occt", "Ein – OpenCascade 8.0 (Beta)"]])}</div>
    <p class="hinweis">Ein: exakter STEP-Export und 3D-Prüfung des Zuschnitts. Lädt einmalig ~7 MB. Lizenz OpenCascade (LGPL 2.1).</p>
    <h4>PC-Programm</h4>
    ${pc ? `<div class="egitter">
      ${einstFeld("programm.updates", "Beim Start nach Updates suchen", "janein")}
      ${einstFeld("programm.zuletzt", "Anzahl «Zuletzt»-Projekte")}
    </div>
    <div class="reihe ohnerand"><button class="knopf" id="eUpdate">Jetzt nach Updates suchen</button></div>`
      : '<p class="hinweis">Updates gibt es nur im Windows-Programm.</p>'}
    <p class="hinweis">Version ${VERSION}</p>
    <h4>Eingabe-Diagnose (Stift, Finger, Maus)</h4>
    <p class="hinweis">Mit dem Stift über dem Feld schweben, dann antippen und ziehen: die Zähler zeigen, was das Gerät meldet. Klick ins Feld setzt zurück.</p>
    <div class="diagfeld" tabindex="0" role="group" aria-label="Diagnosefeld für Stift, Finger und Maus">Hier schweben, tippen oder ziehen</div>
    <pre class="diagaus" id="diagAus" aria-live="off">noch keine Ereignisse</pre>
    <h4>Selbsttest</h4><p class="hinweis">Prüft die Rechenkerne gegen bekannte Werte.</p>
    <div class="reihe ohnerand"><button class="knopf" id="eSelbstTest">Selbsttest ausführen</button></div><div id="eSelbst"></div>`,
    bausteine: `
    <h4>Kantenbausteine für Flächenbleche</h4>
    <p class="hinweis">Abkantfolge: Winkel Schenkel Winkel Schenkel … (+ Sichtseite, − hinten, U± Umschlag, «90r5» = Radius 5). Versatz: Kante weiter aussen. Partner: Gegenstück.</p>
    <div class="tabwrap"><table class="zeilen bausteine"><thead><tr><th></th><th>Name</th><th>Gruppe</th><th>Abkantfolge</th><th>Versatz</th><th>Partner</th><th></th></tr></thead><tbody>
    ${e.bausteine.map((b, i) => `<tr data-bi="${i}"><td><button class="knopf klein" data-bedit="${i}" aria-label="${esc(b.name)} bearbeiten">✎</button></td><td><input data-bk="name" value="${esc(b.name)}" aria-label="Name"></td><td><input data-bk="gruppe" value="${esc(b.gruppe || "")}" aria-label="Gruppe"></td>
      <td><input data-bk="folge" class="folge" value="${esc(b.folge)}" aria-label="Abkantfolge"></td><td><input data-bk="versatz" type="number" step="any" value="${b.versatz || 0}" aria-label="Versatz"></td>
      <td><select data-bk="partner" aria-label="Partner"><option value="">–</option>${e.bausteine.filter((x) => x !== b).map((x) => `<option value="${esc(x.id)}" ${b.partner === x.id ? "selected" : ""}>${esc(x.name)}</option>`).join("")}</select></td>
      <td class="nowrap"><button class="weg" data-bweg="${i}" aria-label="${esc(b.name)} entfernen">×</button></td></tr>`).join("")}
    </tbody></table></div>
    <div class="reihe ohnerand"><button class="knopf" id="eNeuBaustein">+ Baustein</button><button class="knopf" id="eBausteineStandard">Standard-Bausteine ergänzen</button></div>`,
    dach: `<h4>Dachdeckung</h4>
    <p class="hinweis">Richtwerte – am gewählten Produkt prüfen und anpassen.</p>
    <div class="tabwrap"><table class="zeilen"><thead><tr><th>Name</th><th>Lattweite</th><th>Deckbreite</th><th>Schichtdicke</th><th>Ziegellänge</th><th>Ziegeldicke</th><th>Stück/m²</th><th>kg/m²</th><th>Min.-Neigung °</th><th>Latte b</th><th>Latte h</th><th></th></tr></thead><tbody>
    ${(e.dach ||= dachGrund()).deckungen.map((d, i) => `<tr>${[["name", "text"], ["lattweite"], ["deckbreite"], ["ziegelDicke"], ["ziegelLaenge"], ["ziegelT"], ["stueckProM2"], ["gewichtProM2"], ["mindestNeigung"], ["lattenB"], ["lattenH"]].map(([k, t]) => `<td><input data-dach="d:${i}:${k}" type="${t || "number"}" step="any" value="${esc(d[k] ?? "")}" aria-label="${k}"></td>`).join("")}<td>${e.dach.deckungen.length > 1 ? `<button class="weg" data-dweg="d:${i}" aria-label="entfernen">×</button>` : ""}</td></tr>`).join("")}</tbody></table></div>
    <button class="knopf" data-dneu="d">+ Deckung (Kopie der letzten)</button>
    <h4>Dachaufbau</h4>
    <div class="tabwrap"><table class="zeilen"><thead><tr><th>Name</th><th>Sparren b</th><th>Sparren h</th><th>Achsabstand</th><th>Dämmung</th><th>Dämmdicke</th><th>Unterdach</th><th>Konterlatte b</th><th>Konterlatte h</th><th></th></tr></thead><tbody>
    ${e.dach.aufbauten.map((a, i) => `<tr>${[["name", "text"], ["sparrenB"], ["sparrenH"], ["achsabstand"], ["daemmung", "sel"], ["daemmDicke"], ["unterdachDicke"], ["konterB"], ["konterH"]].map(([k, t]) => t === "sel" ? `<td><select aria-label="Dämmung ${esc(a.name)}" data-dach="a:${i}:${k}"><option value="zwischen" ${a[k] === "zwischen" ? "selected" : ""}>zwischen</option><option value="aufsparren" ${a[k] === "aufsparren" ? "selected" : ""}>auf Sparren</option></select></td>` : `<td><input data-dach="a:${i}:${k}" type="${t || "number"}" step="any" value="${esc(a[k] ?? "")}" aria-label="${k}"></td>`).join("")}<td>${e.dach.aufbauten.length > 1 ? `<button class="weg" data-dweg="a:${i}" aria-label="entfernen">×</button>` : ""}</td></tr>`).join("")}</tbody></table></div>
    <button class="knopf" data-dneu="a">+ Aufbau (Kopie des letzten)</button>
    <h4>Voreinstellung</h4>
    <div class="reihe"><label>Deckung <select data-dach="s:0:standardDeckung">${e.dach.deckungen.map((d) => `<option value="${esc(d.id)}" ${e.dach.standardDeckung === d.id ? "selected" : ""}>${esc(d.name)}</option>`).join("")}</select></label>
    <label>Aufbau <select data-dach="s:0:standardAufbau">${e.dach.aufbauten.map((a) => `<option value="${esc(a.id)}" ${e.dach.standardAufbau === a.id ? "selected" : ""}>${esc(a.name)}</option>`).join("")}</select></label></div>`,
    detail3d: `
    <h4>3D-Detailvorlagen (STEP)</h4>
    <p class="hinweis">Wiederkehrende Teile als STEP-Datei. Ursprung = Anfang der Ankerkante, +X = Kante, +Z = Sichtseite.</p>
    ${(e.detailvorlagen || []).length ? `<div class="tabwrap"><table class="zeilen"><thead><tr><th>Name</th><th>Gruppe</th><th>Länge mm</th><th>Blechdicke mm</th><th>Kante min mm</th><th>Kante max mm</th><th></th></tr></thead><tbody>
    ${e.detailvorlagen.map((v, i) => `<tr><td><input data-dv="name" data-i="${i}" value="${esc(v.name)}" aria-label="Name"></td><td><input data-dv="category" data-i="${i}" value="${esc(v.category || "")}" aria-label="Gruppe"></td>
      <td>${esc(v.anchor?.edgeLength ?? "")}</td><td><input data-dv="thickness" data-i="${i}" type="number" step="any" value="${v.compatibility?.thickness ?? ""}" aria-label="Blechdicke"></td>
      <td><input data-dv="edgeLengthMin" data-i="${i}" type="number" step="any" value="${v.compatibility?.edgeLengthMin ?? ""}" aria-label="Kante min"></td><td><input data-dv="edgeLengthMax" data-i="${i}" type="number" step="any" value="${v.compatibility?.edgeLengthMax ?? ""}" aria-label="Kante max"></td>
      <td><button class="weg" data-dvweg="${i}" aria-label="${esc(v.name)} entfernen">×</button></td></tr>`).join("")}</tbody></table></div>` : '<p class="hinweis">Noch keine Detailvorlage.</p>'}
    <div class="reihe ohnerand"><button class="knopf" id="eNeuDetail">+ Aus STEP-Datei</button></div>`,
    konto: cloud.html(),
    vorlagen: `
    <h4>Eigene Vorlagen</h4>
    ${e.vorlagen.length ? `<ul class="eigene">${e.vorlagen.map((v, i) => `<li>${esc(v.name)} <small class="hinweis">${v.zeilen.length} Schenkel</small><button class="weg" data-vweg="${i}" aria-label="${esc(v.name)} entfernen">×</button></li>`).join("")}</ul>`
      : '<p class="hinweis">Noch keine. Ein freies Profil wählen und in der Werkstatt «Als eigene Vorlage speichern».</p>'}
    <h4>Sicherungen (automatisch vor jedem «Übernehmen»)</h4>
    ${(() => { const s = sichLesen(); return s.liste.length ? `<ul class="eigene">${s.liste.map((x, i) => `<li>${esc(new Date(x.zeit).toLocaleString("de-CH"))} <small class="hinweis">${esc(x.grund)} · ${x.einst.bausteine?.length ?? 0} Bausteine, ${x.einst.materialien?.length ?? 0} Materialien</small><button class="knopf klein" data-sich="${i}">Wiederherstellen</button></li>`).join("")}</ul>` : '<p class="hinweis">Noch keine Sicherung.</p>'; })()}
    <h4>Papierkorb</h4>
    ${(() => { const s = sichLesen(); return s.korb.length ? `<ul class="eigene">${s.korb.map((x, i) => `<li>${esc(x.daten.name)} <small class="hinweis">${{ baustein: "Baustein", material: "Material", detail: "3D-Detail" }[x.art]} · gelöscht ${esc(new Date(x.zeit).toLocaleString("de-CH"))}</small><button class="knopf klein" data-korb="${i}">Zurückholen</button></li>`).join("")}</ul>` : '<p class="hinweis">Leer. Gelöschte Bausteine und Materialien landen hier.</p>'; })()}
    <h4>Sichern und übertragen</h4>
    <p class="hinweis">Einstellungen gelten pro Gerät. Zum Übertragen als Datei sichern und auf dem anderen Gerät laden.</p>
    <div class="reihe ohnerand"><button class="knopf" id="eExport">Als Datei sichern</button><button class="knopf" id="eImport">Aus Datei laden</button></div>`,
  };
  { const al = inhalt.allgemein, i = al.indexOf("<h4>Start</h4>"); inhalt.firma = al.slice(0, i); inhalt.allgemein = al.slice(i); } // Firma gehört zu «Firma & Ausgabe»
  if (einstLetzte !== einstRegister) einstOffen.add(einstRegister); // ein Sprung auf einen Abschnitt (Fehlermeldung, Konto …) öffnet ihn
  if (!seite[2].some((k) => einstOffen.has(k))) einstOffen.add(seite[2][0]);
  const sek = (k) => `<details class="esek" data-sek="${k}"${einstOffen.has(k) ? " open" : ""}><summary><b>${EINST_TITEL[k]}</b></summary><div class="esekinhalt">${inhalt[k]}</div></details>`;
  const st = $("eInhalt").scrollTop, gleich = einstSeiteLetzte === seite[0]; einstSeiteLetzte = seite[0];
  $("eInhalt").innerHTML = seite[2].length === 1 ? inhalt[seite[2][0]] : seite[2].map(sek).join(""); $("eInhalt").scrollTop = gleich ? st : 0; einstLetzte = einstRegister;
  if (seite[2].includes("material")) probe();
  if (seite[2].includes("etiketten")) etikettenPruefen();
}
function etikettenPruefen() {
  const e = entwurf.etiketten, b = e.links + e.spalten * e.breite + (e.spalten - 1) * e.abstandX, h = e.oben + e.zeilen * e.hoehe + (e.zeilen - 1) * e.abstandY;
  $("eEtikPruef").textContent = `Belegt ${f1(b)} × ${f1(h)} mm von 210 × 297 mm, ${e.spalten * e.zeilen} Etiketten pro Bogen.` + (b > 210.5 || h > 297.5 ? " ⚠ Passt nicht auf A4." : "");
}
function probe() {
  Object.assign(probeWerte, { mat: Math.min(+$("pMat").value, entwurf.materialien.length - 1), z: $("pZ").value, a: $("pA").value, b: $("pB").value });
  const m = entwurf.materialien[probeWerte.mat], z = parseFloat(probeWerte.z), a = parseFloat(probeWerte.a), b = parseFloat(probeWerte.b);
  if (!(z > 0 && a > 0 && b > 0)) { $("pErgebnis").textContent = "Zuschnitt, a und b eingeben."; return; }
  // Aussenmasse sind zusammen immer etwas länger als der Streifen (Biegeverkürzung)
  const verkuerzung = a + b - z;
  if (verkuerzung <= 0) { $("pErgebnis").textContent = `a + b (${f1(a + b)}) ist nicht grösser als der Zuschnitt (${f1(z)}). Wurde aussen gemessen, und stimmt der Zuschnitt?`; return; }
  const k = kFaktorAusProbe({ zuschnitt: z, a, b, t: m.t, ri: m.ri });
  const plausibel = k > 0.1 && k < 0.6;
  $("pErgebnis").innerHTML = `K-Faktor für ${esc(m.name)}: <b>${k.toFixed(3)}</b> <small>(Biegeverkürzung ${verkuerzung.toFixed(2)} mm)</small>${plausibel ? ` <button class="knopf" id="pUebernehmen">Übernehmen</button>`
    : `<br>Unplausibel – üblich sind 0.3 bis 0.5. Prüfen: genau 90° gebogen? Aussen gemessen? Dicke und Innenradius von «${esc(m.name)}» richtig?`}`;
  if (plausibel) $("pUebernehmen").onclick = () => { m.k = +k.toFixed(3); zeigeEinst(); meldung(`K-Faktor ${m.k} bei ${m.name} eingetragen – mit «Übernehmen» speichern.`); };
}
$("eInhalt").addEventListener("input", (ev) => {
  const t = ev.target;
  if (t.dataset.dach) { const [g, i, k] = t.dataset.dach.split(":"), d = entwurf.dach; if (g === "s") d[k] = t.value; else { const o = (g === "d" ? d.deckungen : d.aufbauten)[+i]; o[k] = t.type === "number" ? parseFloat(t.value) || 0 : t.value; o.richtwert = false; } return; }
  if (t.dataset.bk) { const b = entwurf.bausteine[+t.closest("tr").dataset.bi], k = t.dataset.bk; b[k] = k === "versatz" ? parseFloat(t.value) || 0 : t.value;
    if (k === "folge") { try { folge("100 " + bausteinFolge({ ...entwurf.bausteine[+t.closest("tr").dataset.bi], folge: t.value }, entwurf.materialien[0])); t.classList.remove("ungueltig"); } catch (err) { t.classList.add("ungueltig"); meldung(err.message); } } }
  else if (t.dataset.dv) { const v = entwurf.detailvorlagen[+t.dataset.i], k = t.dataset.dv, x = t.type === "number" ? (t.value === "" ? null : parseFloat(t.value)) : t.value; if (k === "name" || k === "category") v[k] = x; else v.compatibility = { ...(v.compatibility || {}), [k]: x }; v.modified = new Date().toISOString().replace(/\.\d+Z$/, ""); }
  else if (t.dataset.k === "umSchr" || t.dataset.k === "umStr") { const m = entwurf.materialien[+t.dataset.i], v = t.value === "" ? null : parseFloat(t.value); m.umform = { ...(m.umform || {}), quelle: "Eigener Wert (Einstellungen)", [t.dataset.k === "umSchr" ? "schrumpfMaxProzent" : "streckMaxProzent"]: v }; }
  else if (t.dataset.k) { const m = entwurf.materialien[+t.dataset.i]; m[t.dataset.k] = t.dataset.k === "name" ? t.value : parseFloat(t.value); }
  else if (t.id === "lBand") entwurf.spaltbaender = zahlen(t.value);
  else if (t.id === "lCoil") entwurf.coil = parseFloat(t.value) || 0;
  else if (t.id === "lTafeln") entwurf.tafeln = t.value.split(/[,;]+/).map((x) => zahlen(x.replace(/[x×*]/gi, " "))).filter((x) => x.length === 2);
  else if (t.dataset.mk) { const m = entwurf.maschinen[+t.dataset.mi]; m[t.dataset.mk] = t.type === "checkbox" ? t.checked : t.dataset.mk === "name" ? t.value : (t.value === "" ? "" : parseFloat(t.value)); }
  else if (t.dataset.stift) { const l = new Set(entwurf.allgemein.stift); t.checked ? l.add(t.dataset.stift) : l.delete(t.dataset.stift); entwurf.allgemein.stift = STIFT_ALLE.map((x) => x[0]).filter((x) => l.has(x)); }
  else if (t.dataset.e) einstWert(t);
  if (["pMat", "pZ", "pA", "pB"].includes(t.id)) probe();
});
function einstWert(t) {
  const [g, k] = t.dataset.e.split("."), typ = t.dataset.typ;
  entwurf[g][k] = typ === "janein" ? t.checked : typ === "zahl" ? parseFloat(t.value) : t.value;
  if (g === "etiketten" && $("eEtikPruef")) etikettenPruefen();
}
$("eInhalt").addEventListener("change", async (ev) => {
  if (ev.target.id === "eLogoDatei") { const d = ev.target.files[0]; if (!d) return; try { const url = await logoLesen(d); entwurf.firma = { ...entwurf.firma, logo: url, ...(await logoVarianten(url)) }; zeigeEinst(); meldung("Logo geladen – mit «Übernehmen» speichern."); } catch (err) { meldung("Logo konnte nicht gelesen werden: " + (err?.message ?? err)); } return; }
  if (ev.target.id === "pMat") probe();
  else if (ev.target.dataset.mjson != null) { const i = +ev.target.dataset.mjson, r = werkzeugeAusText(ev.target.value), me = document.getElementById("mjsonMeldung" + i); if (r.fehler) { if (me) { me.textContent = "⚠ " + r.fehler; me.style.color = "#c0261b"; } } else { Object.assign(entwurf.maschinen[i], r.werte); if (!r.werte.oberwange_werkzeuge) delete entwurf.maschinen[i].oberwange_werkzeuge; zeigeEinst(); } }
  else if (ev.target.dataset.mk === "geprueft" || ev.target.dataset.mk === "name") { zeigeEinst(); }
  else if (ev.target.dataset.stift) { const t = ev.target, l = new Set(entwurf.allgemein.stift); t.checked ? l.add(t.dataset.stift) : l.delete(t.dataset.stift); entwurf.allgemein.stift = STIFT_ALLE.map((x) => x[0]).filter((x) => l.has(x)); }
  else if (ev.target.dataset.e && (ev.target.dataset.typ === "janein" || ev.target.dataset.typ === "wahl")) einstWert(ev.target);
  else if (ev.target.dataset.bk === "partner") entwurf.bausteine[+ev.target.closest("tr").dataset.bi].partner = ev.target.value || undefined;
});
function einstLaden(text) {
  try {
    const e = JSON.parse(text);
    if (e.art !== "sdcad-einstellungen" || !Array.isArray(e.materialien) || !e.materialien.length) throw 0;
    const vorlagen = [...entwurf.vorlagen];
    for (const v of e.vorlagen || []) { const i = vorlagen.findIndex((x) => x.name === v.name); if (i >= 0) vorlagen[i] = v; else vorlagen.push(v); }
    const { art, version, ...rest } = e;
    entwurf = { ...mitStandard(rest), vorlagen };
    zeigeEinst(); meldung(`Geladen: ${e.materialien.length} Materialien, ${(e.vorlagen || []).length} Vorlagen – mit «Übernehmen» speichern.`);
  } catch { meldung("Diese Datei enthält keine Spengler-Digital-CAD-Einstellungen."); }
}
$("eInhalt").addEventListener("click", (ev) => { const w = ev.target.closest("[data-mweg]"), v = ev.target.closest("[data-mvorlage]"), n = ev.target.closest("[data-mneu]"); if (w) { entwurf.maschinen.splice(+w.dataset.mweg, 1); zeigeEinst(); } else if (v) { const vo = MASCHINEN_VORLAGEN.find((x) => x.typ === v.dataset.mvorlage); if (vo) { entwurf.maschinen.push(maschineAusVorlage(vo)); zeigeEinst(); } } else if (n) { entwurf.maschinen.push({ id: "m" + Date.now().toString(36), name: "Neue Maschine", laenge_mm: 3000, min_klemm_mm: 10, max_winkel_auf: 120, toleranz_mm: 0.3, geprueft: false, unterwange: [], klemmwange: [], biegewange_auf: { teile: [], achse: [0, 0] } }); zeigeEinst(); } });
$("eInhalt").addEventListener("click", (ev) => { if (ev.target.id === "eLogoWeg") { entwurf.firma = { ...entwurf.firma, logo: "", logoWeiss: "", logoDunkel: "", logoHell: undefined, logoTransp: undefined }; zeigeEinst(); } });
$("eInhalt").addEventListener("click", async (ev) => {
  if (ev.target.id === "eExport") {
    const inhalt = JSON.stringify({ art: "sdcad-einstellungen", version: VERSION, ...entwurf }, null, 1);
    await herunterladen("Spengler-CAD Einstellungen.json", inhalt, "application/json");
    meldung("Einstellungen gesichert (so wie hier angezeigt).");
  } else if (ev.target.id === "eImport") {
    if (!pc) return $("einstDatei").click();
    try { const d = await pc.invoke("datei_oeffnen", { filter: DATEITYPEN.json, endungen: ["json"] }); if (d) einstLaden(d.inhalt); }
    catch (e) { meldung("Laden fehlgeschlagen: " + e); }
  }
});
$("einstDatei").onchange = async (e) => { if (e.target.files[0]) einstLaden(await e.target.files[0].text()); e.target.value = ""; };
$("eInhalt").addEventListener("click", async (ev) => {
  if (ev.target.dataset.ereg) { einstRegister = ev.target.dataset.ereg; zeigeEinst(); return; }
  if (ev.target.id === "eNeuDetail") return $("detailDatei").click();
  if (ev.target.dataset.dvweg != null) { entwurf.detailvorlagen.splice(+ev.target.dataset.dvweg, 1); return zeigeEinst(); }
  if (ev.target.id === "eSelbstTest") {
    const r = selbsttest(), ok = r.every((x) => x.ok);
    $("eSelbst").innerHTML = `<p class="${ok ? "" : "fehler"}"><b>${ok ? "✓ Alle " + r.length + " Prüfungen bestanden" : "⚠ " + r.filter((x) => !x.ok).length + " von " + r.length + " Prüfungen fehlgeschlagen"}</b></p><ul>${r.map((x) => `<li>${x.ok ? "✓" : "✗"} ${esc(x.name)} <small class="hinweis">${esc(x.detail)}</small></li>`).join("")}</ul>`;
    return;
  }
  if (ev.target.id === "eUpdate") {
    meldung("Suche nach Updates …");
    try {
      const r = await pc.invoke("nach_update_suchen");
      meldung(r === "aktuell" ? `Programm ist aktuell (Version ${VERSION}).` : "Update später installieren – beim nächsten Start wird wieder gefragt.");
    } catch (e) { meldung("Keine Update-Information erreichbar (Internet? Noch kein Release auf main?): " + e); }
    return;
  }
  if (ev.target.dataset.dweg != null) { const [g, i] = ev.target.dataset.dweg.split(":"); (g === "d" ? entwurf.dach.deckungen : entwurf.dach.aufbauten).splice(+i, 1); zeigeEinst(); return; }
  if (ev.target.dataset.dneu) { const l = ev.target.dataset.dneu === "d" ? entwurf.dach.deckungen : entwurf.dach.aufbauten, v = l.at(-1); l.push({ ...v, id: "eigen" + Date.now().toString(36), name: v.name + " (Kopie)", richtwert: false }); zeigeEinst(); return; }
  if (ev.target.dataset.weg != null) { entwurf.materialien.splice(+ev.target.dataset.weg, 1); zeigeEinst(); }
  else if (ev.target.dataset.vweg != null) { entwurf.vorlagen.splice(+ev.target.dataset.vweg, 1); zeigeEinst(); }
  else if (ev.target.dataset.bweg != null) { const [b] = entwurf.bausteine.splice(+ev.target.dataset.bweg, 1); entwurf.bausteine.forEach((x) => { if (x.partner === b.id) delete x.partner; }); zeigeEinst(); }
  else if (ev.target.id === "eNeuBaustein") bausteinEditor(neuerBaustein(), entwurf.bausteine, () => zeigeEinst());
  else if (ev.target.dataset.bedit != null) bausteinEditor(entwurf.bausteine[+ev.target.dataset.bedit], entwurf.bausteine, () => zeigeEinst());
  else if (ev.target.id === "eBausteineStandard") { const n = BAUSTEINE_STANDARD.filter((b) => !entwurf.bausteine.some((x) => x.id === b.id)); entwurf.bausteine.push(...JSON.parse(JSON.stringify(n))); zeigeEinst(); meldung(n.length ? `${n.length} Standard-Bausteine ergänzt.` : "Alle Standard-Bausteine sind schon da."); }
  else if (ev.target.id === "eNeuMat") {
    const v = entwurf.materialien.at(-1);
    entwurf.materialien.push({ ...v, id: "eigen" + Date.now().toString(36), name: v.name + " (Kopie)" }); zeigeEinst();
    $("eInhalt").querySelector(`tr:nth-child(${entwurf.materialien.length}) input`)?.focus();
  }
});
$("eInhalt").addEventListener("click", (ev) => {
  const sb = ev.target.closest("[data-sich]"), kb = ev.target.closest("[data-korb]"); if (!sb && !kb) return;
  const s = sichLesen();
  if (sb) { const e = s.liste[+sb.dataset.sich]; if (!e) return; sichereEinst(einst, einspielen(e), "Vor Wiederherstellung"); entwurf = mitStandard(einspielen(e)); meldung("Sicherung geladen – mit «Übernehmen» gelten lassen oder «Abbrechen»."); }
  else { const e = s.korb[+kb.dataset.korb]; if (!e) return; entwurf = zurueckholen(entwurf, e); s.korb.splice(+kb.dataset.korb, 1); sichSchreiben(s); meldung(`«${e.daten.name}» zurückgeholt – mit «Übernehmen» speichern.`); }
  zeigeEinst();
});
$("wEinst").onclick = () => { if (dlg) $("dAbbrechen").click(); entwurf = JSON.parse(JSON.stringify(einst)); meldung(""); zeigeEinst(); $("einst").hidden = false; };
$("eAbbrechen").onclick = () => { $("einst").hidden = true; entwurf = null; };
// Android-App: Stift-Schweben kommt vom Gerät (MainActivity) als window.sdcadHover(x, y, art) – daraus wird ein pointermove vom Typ «pen» ohne Taste für die Ansicht
window.sdcadHover = (x, y, art) => {
  const el = document.elementFromPoint(x, y); window.__nativHover = (window.__nativHover || 0) + 1; document.dispatchEvent(new CustomEvent("sdcad-nativ-hover", { detail: art }));
  if (!el || art === "exit") return;
  el.dispatchEvent(new PointerEvent("pointermove", { clientX: x, clientY: y, pointerType: "pen", pointerId: 91, isPrimary: true, buttons: 0, pressure: 0, bubbles: true, cancelable: true }));
};
$("eZu").onclick = () => $("eAbbrechen").click();
// Eingabe-Diagnose: zählt die Ereignisse im Diagnosefeld, damit sich zeigt, was Stift/Finger/Maus (z. B. am Android-Tablet) wirklich melden
{ const Z = {}, ART = ["pointerover", "pointerenter", "pointermove", "pointerrawupdate", "pointerdown", "pointerup", "pointercancel", "pointerleave", "mousemove", "mousedown", "touchstart", "touchmove", "touchend", "contextmenu"]; let letzte = "";
  const zeige = () => { const o = $("diagAus"); if (!o) return; o.textContent = `${letzte || "noch keine Ereignisse"}\n\n` + ART.map((a) => `${a.padEnd(17)} ${Z[a] || 0}`).join("\n") + `\n${"davon Schweben".padEnd(17)} ${Z.schweben || 0}  (pointermove ohne Taste/Berührung, Typ pen)` + `\n${"Pointer-Typen".padEnd(17)} ${["pen", "touch", "mouse"].map((k) => k + " " + (Z["typ_" + k] || 0)).join(" · ")}` + `\n${"Nativ-Schweben".padEnd(17)} ${Z.nativ || 0}  (Android-App: Stift über dem Bildschirm, direkt vom Gerät)`; };
  for (const a of ART) $("eInhalt").addEventListener(a, (e) => { if (!e.target.closest?.(".diagfeld")) return; Z[a] = (Z[a] || 0) + 1; const t = e.touches?.[0] || e;
    if (a === "pointermove" && e.pointerType === "pen" && !e.buttons && !e.pressure) Z.schweben = (Z.schweben || 0) + 1;
    if (e.pointerType && a.startsWith("pointer")) Z["typ_" + e.pointerType] = (Z["typ_" + e.pointerType] || 0) + 1;
    letzte = `letztes: ${a}` + (e.pointerType ? ` · Typ ${e.pointerType}` : "") + (e.buttons != null ? ` · Tasten ${e.buttons}` : "") + (e.pressure != null ? ` · Druck ${(+e.pressure).toFixed(2)}` : "") + (e.tiltX != null ? ` · Neigung ${e.tiltX | 0}/${e.tiltY | 0}` : "") + ` · x ${Math.round(t.clientX || 0)} y ${Math.round(t.clientY || 0)}`; zeige(); }, { capture: true, passive: true });
  document.addEventListener("sdcad-nativ-hover", () => { Z.nativ = (Z.nativ || 0) + 1; zeige(); });
  $("eInhalt").addEventListener("click", (e) => { if (e.target.closest?.(".diagfeld")) { for (const k of Object.keys(Z)) delete Z[k]; letzte = ""; zeige(); } }); } // Klick ins Feld setzt die Zähler zurück
$("eNav").addEventListener("click", (ev) => { const b = ev.target.closest("[data-ereg]"), p = b && EINST_SEITEN.find((x) => x[0] === b.dataset.ereg); if (p) { einstRegister = p[2][0]; einstOffen = new Set([p[2][0]]); zeigeEinst(); } });
$("eInhalt").addEventListener("toggle", (ev) => { const k = ev.target.dataset?.sek; if (k) ev.target.open ? einstOffen.add(k) : einstOffen.delete(k); }, true);
$("eStandard").onclick = () => { entwurf = { ...standardEinst(), vorlagen: entwurf.vorlagen, eigeneDetails: entwurf.eigeneDetails, bausteine: entwurf.bausteine }; zeigeEinst(); meldung("Alle Standardwerte geladen (eigene Vorlagen, Details und Bausteine bleiben) – mit «Übernehmen» speichern."); };
$("eOk").onclick = () => {
  const falsch = entwurf.materialien.find((m) => !m.name.trim() || !(m.t > 0) || !(m.ri >= 0) || !(m.k > 0 && m.k < 1));
  if (falsch) { einstRegister = "material"; zeigeEinst(); return meldung(`Material «${falsch.name || "ohne Namen"}»: Dicke > 0, Innenradius ≥ 0 und K-Faktor zwischen 0 und 1 nötig.`); }
  const { neu: n, skizze: sk, etiketten: et, programm: pr } = entwurf;
  const ganz = (v) => Number.isInteger(v) && v >= 1;
  const fehler = !(n.laenge > 0) ? ["neu", "Länge für neue Teile muss grösser als 0 sein."]
    : !ganz(n.stueck) ? ["neu", "Stück für neue Teile: ganze Zahl ab 1."]
    : !(sk.raster >= 0) ? ["neu", "Fangraster: 0 (aus) oder grösser."]
    : !(sk.abstand >= 0) ? ["neu", "Abstand der Teile darf nicht negativ sein."]
    : !(ganz(et.spalten) && ganz(et.zeilen)) ? ["etiketten", "Spalten und Zeilen: ganze Zahlen ab 1."]
    : !(et.breite > 0 && et.hoehe > 0) ? ["etiketten", "Etikettgrösse muss grösser als 0 sein."]
    : ![et.oben, et.links, et.abstandX, et.abstandY].every((v) => v >= 0) ? ["etiketten", "Ränder und Abstände dürfen nicht negativ sein."]
    : !ganz(pr.zuletzt) ? ["programm", "Anzahl «Zuletzt»: ganze Zahl ab 1."] : null;
  const bFalsch = !fehler && entwurf.bausteine.find((b) => { try { folge("100 " + bausteinFolge(b, entwurf.materialien[0])); return !b.name.trim(); } catch { return true; } });
  if (bFalsch) { einstRegister = "bausteine"; zeigeEinst(); return meldung(`Baustein «${bFalsch.name || "ohne Namen"}»: Name und gültige Abkantfolge nötig (z. B. «90 25 U+ 7»).`); }
  if (fehler) { einstRegister = fehler[0]; zeigeEinst(); return meldung(fehler[1]); }
  sichereEinst(einst, entwurf, "Vor «Übernehmen»"); { const g = geloeschte(einst, entwurf); g.baustein = g.baustein.filter((b) => !BAUSTEINE_STANDARD.some((s) => s.id === b.id)); g.material = g.material.filter((m) => !MATERIALIEN.some((s) => s.id === m.id)); cloud.loeschungen(g); }
  einst = entwurf; entwurf = null; $("einst").hidden = true;
  einstSpeichern(); darstellung(); kernAnzeige(); bedienungAnwenden(true);
  regen(); status("Einstellungen gespeichert. Alle Teile neu berechnet.");
};

// ------------------------------------------------------------ Hilfe
// Hilfe: Kapitel aus den Überschriften der Vorlage (<h4>), Suche, Sprung zu einem Kapitel
const HILFE_KURZ = { "Kontextleiste": "Kontextleiste", "Blechteil erstellen": "Blechteil erstellen", "Flansch, Umschlag": "Flansch, Umschlag, Bausteine", "Flächenblech mit": "Flächenblech & Bausteine", "Konto, Cloud": "Konto, Cloud, Vorlagen", "Pläne": "Pläne (Zeichnung)", "Modellieren wie": "Modellieren", "Konstruieren und": "Konstruieren & Skizzieren", "Skizzenwerkzeuge": "Skizzenwerkzeuge", "Werkstatt": "Werkstatt", "Simulation": "Simulation", "Biegesimulation": "Biegesimulation (Abkanten)", "Start, Speichern": "Start, Speichern, Bedienung", "Tastenkürzel": "Tastenkürzel", "Konventionen": "Konventionen" };
let hilfeKapitel = null;
function hilfeBauen() {
  if (hilfeKapitel) return; const q = document.createElement("div"); q.append($("hilfeQuelle").content.cloneNode(true)); hilfeKapitel = [];
  for (const n of [...q.childNodes]) { if (n.nodeType === 1 && n.tagName === "H4") hilfeKapitel.push({ titel: n.textContent.trim(), knoten: [n] }); else if (hilfeKapitel.length) hilfeKapitel.at(-1).knoten.push(n); }
  hilfeKapitel.forEach((k, i) => { k.kurz = Object.entries(HILFE_KURZ).find(([a]) => k.titel.startsWith(a))?.[1] || k.titel; k.text = k.knoten.map((x) => x.textContent || "").join(" ").toLowerCase(); k.i = i; });
  $("hListe").innerHTML = hilfeKapitel.map((k, i) => `<button role="tab" data-kap="${i}" aria-selected="false"><span class="hnr">${i + 1}</span><span>${esc(k.kurz)}</span></button>`).join("");
}
let hilfeAktiv = 0;
function hilfeZeige(i, suchwort = "") {
  hilfeBauen(); hilfeAktiv = Math.max(0, Math.min(hilfeKapitel.length - 1, i)); const k = hilfeKapitel[hilfeAktiv], box = $("hInhalt"); box.replaceChildren(...k.knoten.map((n) => n.cloneNode(true)));
  $("hUnter").textContent = `Kapitel ${hilfeAktiv + 1} von ${hilfeKapitel.length} · ${k.kurz}`; box.scrollTop = 0;
  document.querySelectorAll("#hListe [data-kap]").forEach((b) => b.setAttribute("aria-selected", String(+b.dataset.kap === hilfeAktiv)));
  if (suchwort) { const w = document.createTreeWalker(box, NodeFilter.SHOW_TEXT), liste = []; while (w.nextNode()) liste.push(w.currentNode); let erster = null;
    for (const tn of liste) { const idx = tn.nodeValue.toLowerCase().indexOf(suchwort); if (idx < 0 || !tn.parentElement) continue; const r = tn.splitText(idx); r.splitText(suchwort.length); const m = document.createElement("mark"); r.parentNode.replaceChild(m, r); m.append(r); erster ||= m; }
    erster?.scrollIntoView({ block: "center" }); }
}
const hilfe = (auf, kapitel = null) => { $("hilfe").hidden = !auf; if (!auf) return; hilfeBauen(); const i = typeof kapitel === "string" ? hilfeKapitel.findIndex((k) => k.titel.toLowerCase().startsWith(kapitel.toLowerCase())) : (kapitel ?? hilfeAktiv); hilfeZeige(i < 0 ? 0 : i); setTimeout(() => $("hSuche").focus(), 50); };
$("hListe").addEventListener("click", (e) => { const b = e.target.closest("[data-kap]"); if (b) hilfeZeige(+b.dataset.kap); });
$("hSuche").addEventListener("input", (e) => { const w = e.target.value.trim().toLowerCase(); hilfeBauen(); let erster = -1;
  document.querySelectorAll("#hListe [data-kap]").forEach((b) => { const k = hilfeKapitel[+b.dataset.kap], treffer = !w || k.text.includes(w) || k.kurz.toLowerCase().includes(w); b.hidden = !treffer; if (treffer && erster < 0) erster = +b.dataset.kap; });
  if (w.length >= 2 && erster >= 0) hilfeZeige(hilfeKapitel[hilfeAktiv].text.includes(w) ? hilfeAktiv : erster, w); else if (!w) hilfeZeige(hilfeAktiv); });
$("hZu2").onclick = () => hilfe(false);
$("wHilfe").onclick = () => hilfe(true);
$("hZu").onclick = () => hilfe(false);
$("hVersion").textContent = `Version ${VERSION}` + (pc ? " · PC-Programm" : " · Web-Version");
document.addEventListener("keydown", (e) => {
  if (e.key === "F1") { e.preventDefault(); hilfe($("hilfe").hidden); }
  else if (e.key === "Escape") {
    if (!$("bEditor").hidden) $("bAbbrechen").click(); else if (!$("hilfe").hidden) hilfe(false); else if (!$("einst").hidden) $("eAbbrechen").click();
    else if (dlg && !skizze && !document.querySelector(".modal:not([hidden])") && !e.defaultPrevented) { $("dAbbrechen").click(); e.preventDefault(); } // Esc bricht den offenen Dialog ab
  } else if (e.key === "Enter" && dlg && !e.shiftKey && !e.isComposing && e.target?.closest?.("#dialog input") && !e.target.closest("#dZusatz")) { // Enter im Dialog: nächster Schritt, auf der letzten Seite OK
    e.preventDefault(); const w = $("dWeiter"); if (!w.hidden) w.click(); else $("dOk").click();
  }
});
document.querySelectorAll(".modal").forEach((m) => m.addEventListener("click", (e) => { if (e.target === m) (m.id === "hilfe" ? hilfe(false) : $("eAbbrechen").click()); }));

// ------------------------------------------------------------ Ansichten
function fitte(box) {
  if (box.isEmpty()) box = new THREE.Box3(new THREE.Vector3(-200, -200, -200), new THREE.Vector3(200, 200, 200));
  const c = box.getCenter(new THREE.Vector3()), r = box.getSize(new THREE.Vector3()).length() / 2 || 200;
  const dir = kamera.position.clone().sub(steuerung.target).normalize();
  steuerung.target.copy(c); kamera.position.copy(c.clone().add(dir.multiplyScalar(r * 3 * orthoK)));
  kamera.near = Math.max(r / 100, r * 3 * orthoK * 0.02 * (orthoK > 1 ? 1 : 0)); kamera.far = r * 50 * orthoK; kamera.updateProjectionMatrix();
}
const alleBox = () => { const b = new THREE.Box3(); modell.children.forEach((o) => { if (!o.userData.konstruktion) b.expandByObject(o); }); b.union(new THREE.Box3().setFromObject(live)); if (bilder.children.length) b.union(new THREE.Box3().setFromObject(bilder)); return b; }; // Achsen sind «unendlich» lang
function ansicht(name) {
  if (skizze) return; // in der Skizze bleibt die Ansicht senkrecht auf die Fläche
  const d = { oben: [0, 1, 0.0001], unten: [0, -1, 0.0001], vorne: [0, 0, 1], hinten: [0, 0, -1], rechts: [1, 0, 0], links: [-1, 0, 0], iso: [0.7, 0.5, 0.8] }[name];
  kamera.position.copy(steuerung.target.clone().add(V(d).normalize()));
  fitte(alleBox());
}
document.querySelectorAll("[data-ansicht]").forEach((b) => (b.onclick = () => ansicht(b.dataset.ansicht)));
$("zoomAlles").onclick = () => fitte(alleBox());

// ------------------------------------------------------------ Skizzieren
let skizze = null; // { f, werkzeug, pkt: [] Klickpunkte des laufenden Elements, maus: [u,v], sel, quelle, ecken, radius }
// Skizzenwerkzeuge wie in Fusion: Knopf, Eingabefelder je Schritt (Anzahl gesetzter Punkte), Hinweis
const WERKZEUGE = {
  loeschen: { knopf: "tEntf", text: "Löschen: Linien, Kreise usw. oder Abhängigkeiten anklicken – jeder Klick löscht. Esc oder ein anderes Werkzeug beendet." },
  auswahl: { knopf: "tAuswahl", text: "Auswahl: Punkte ziehen, Mass anklicken zum Ändern. Element anklicken: Entf löscht, X macht es zur Hilfslinie." },
  linie: { knopf: "tLinie", ein: () => ["L", "∠"], text: "Linie: Punkte anklicken. Länge eintippen und Enter für genaue Masse. Doppelklick oder Esc beendet, Klick auf Startpunkt schliesst." },
  rechteck: { knopf: "tRechteck", ein: () => ["B", "H"], text: "Rechteck (2 Punkte): zwei Ecken anklicken oder Breite/Höhe eintippen." },
  rechteckM: { knopf: "tRechteck", ein: () => ["B", "H"], text: "Rechteck um Mittelpunkt: Mitte, dann eine Ecke anklicken – oder Breite/Höhe eintippen." },
  rechteck3: { knopf: "tRechteck", ein: (n) => (n === 2 ? ["H"] : ["L", "∠"]), text: "3-Punkt-Rechteck: erste Kante mit zwei Punkten, dann die Höhe anklicken." },
  kreis: { knopf: "tKreis", ein: () => ["Ø"], text: "Kreis: Mittelpunkt, dann Radius anklicken oder Durchmesser eintippen." },
  kreis2: { knopf: "tKreis", ein: () => ["Ø"], text: "2-Punkt-Kreis: zwei gegenüberliegende Punkte anklicken." },
  kreis3: { knopf: "tKreis", text: "3-Punkt-Kreis: drei Punkte auf dem Kreis anklicken." },
  bogen3: { knopf: "tBogen", text: "3-Punkt-Bogen: Start, Ende, dann einen Punkt auf dem Bogen anklicken." },
  bogenM: { knopf: "tBogen", ein: (n) => (n === 2 ? ["∠"] : ["R"]), text: "Bogen um Mittelpunkt: Mitte, Start (oder Radius eintippen), dann Ende (oder Winkel eintippen)." },
  polygon: { knopf: "tPolygon", ein: () => ["R", "n"], text: "Polygon: Mitte, dann eine Ecke anklicken. Umkreisradius R und Eckenzahl n lassen sich eintippen." },
  langloch: { knopf: "tLangloch", ein: (n) => (n === 2 ? ["B"] : ["L", "B"]), text: "Langloch: Mitte der ersten, dann der zweiten Rundung, dann die Breite anklicken – oder Länge und Breite eintippen." },
  spline: { knopf: "tSpline", text: "Spline: Stützpunkte anklicken – die Kurve geht durch alle Punkte. Doppelklick, Enter oder Esc beendet, Klick auf den ersten Punkt schliesst." },
  ellipse: { knopf: "tEllipse", ein: (n) => (n === 2 ? ["b"] : ["a"]), text: "Ellipse: Mitte, Ende der Hauptachse, dann die Breite anklicken – oder Halbachsen a/b eintippen." },
  punkt: { knopf: "tPunkt", text: "Punkt: Stelle anklicken (z. B. als Bezug für Konstruktionsebenen)." },
  text: { knopf: "tText", text: "Text: Stelle anklicken (linke Grundlinie), Text und Höhe eingeben. Mit Extrudieren → Gravur (Ausschneiden) oder Prägung (Vereinigen)." },
  abrunden: { aendern: true, knopf: "tAbrunden", ein: () => ["R"], immer: true, text: "Abrunden: Radius eintippen (Enter), dann Ecken anklicken. Beim Blechprofil wird daraus der Biegeradius." },
  fase: { aendern: true, knopf: "tFase", ein: () => ["Abst."], immer: true, text: "Fase: Abstand eintippen (Enter), dann Ecken anklicken – die Ecke wird um diesen Abstand auf beiden Schenkeln gekappt." },
  schnitt: { knopf: "tSchnitt", text: "Schnitt mit Körpern: ein Klick projiziert die Schnittlinien aller sichtbaren Körper mit der Skizzenebene (fixierte Linien)." },
  versatz: { aendern: true, knopf: "tVersatz", ein: () => ["Abst."], text: "Versatz: Element anklicken, dann mit der Maus die Seite zeigen und klicken – oder Abstand eintippen und Enter." },
  spiegeln: { aendern: true, knopf: "tSpiegeln", text: "Spiegeln: zu spiegelndes Element anklicken, dann die Spiegellinie (gerade Kante) anklicken." },
  stutzen: { aendern: true, knopf: "tStutzen", text: "Stutzen: Teilstück zwischen Schnittpunkten anklicken – es wird entfernt." },
  hilfslinie: { aendern: true, knopf: "tHilfslinie", text: "Hilfslinie: Element anklicken, um es zur Hilfslinie (gestrichelt, zählt nicht als Profil) zu machen oder zurück." },
  dehnen: { aendern: true, knopf: "tDehnen", text: "Dehnen: Linie nahe dem Ende anklicken, das bis zur nächsten Kante verlängert werden soll." },
  trennen: { aendern: true, knopf: "tTrennen", text: "Trennen: Linie, Kreis oder Bogen anklicken – wird an den Schnittpunkten (sonst an der Klickstelle) in Stücke geteilt." },
  verschieben: { aendern: true, knopf: "tVerschieben", ein: () => ["dx", "dy"], immer: true, text: "Verschieben: Elemente anklicken, dann Basispunkt und Zielpunkt – oder dx/dy eintippen und Enter." },
  kopieren: { aendern: true, knopf: "tVerschieben", ein: () => ["dx", "dy"], immer: true, text: "Kopieren: Elemente anklicken, dann Basispunkt und Zielpunkt – oder dx/dy eintippen und Enter." },
  drehen: { aendern: true, knopf: "tVerschieben", ein: () => ["∠"], immer: true, text: "Drehen: Elemente anklicken, dann Drehpunkt; Winkel eintippen und Enter – oder Bezugs- und Zielrichtung anklicken." },
  musterR: { aendern: true, knopf: "tMuster", text: "Rechteckiges Muster: Elemente anklicken, dann auf eine freie Stelle klicken (oder Enter) – Anzahl und Abstände eingeben." },
  musterK: { aendern: true, knopf: "tMuster", text: "Kreisförmiges Muster: Elemente anklicken, dann den Mittelpunkt anklicken – Anzahl und Winkel eingeben." },
  projizieren: { aendern: true, knopf: "tProjizieren", text: "Projizieren: Körperkante, Körperfläche (auch Blech und Biegungen) oder Linie einer anderen Skizze anklicken – sie leuchtet blau; mehrere wählen, dann «OK» (Enter) projiziert (Umschalt + Klick: ganze Skizze). Kreise und Bögen parallel liegender Skizzen bleiben Kreise/Bögen. Projizierte Linien sind fixiert (violett)." },
  // Abhängigkeiten und Bemassung: Auswahlmuster P = Punkt, L = Linie (Kante, Achse), K = Kreis/Bogen/Langloch
  abhHV: { knopf: "tAbh", muster: ["L", "PP"], text: "Horizontal/Vertikal: Linie anklicken – oder zwei Punkte. Die Richtung ergibt sich aus der Lage." },
  abhKoinzident: { knopf: "tAbh", muster: ["PP", "PL", "PK"], text: "Koinzident: Punkt anklicken, dann zweiten Punkt – oder Linie/Kreis/Bogen (Punkt liegt darauf)." },
  abhTangential: { knopf: "tAbh", muster: ["LK", "KL", "KK"], text: "Tangential: Linie und Kreis/Bogen anklicken – oder zwei Kreise/Bögen." },
  abhGleich: { knopf: "tAbh", muster: ["LL", "KK"], text: "Gleich: zwei Linien (gleich lang) oder zwei Kreise/Bögen (gleicher Radius) anklicken." },
  abhParallel: { knopf: "tAbh", muster: ["LL"], text: "Parallel: zwei Linien anklicken (auch die X- oder Y-Achse)." },
  abhSenkrecht: { knopf: "tAbh", muster: ["LL"], text: "Senkrecht: zwei Linien anklicken." },
  abhFix: { knopf: "tAbh", muster: ["P", "L", "K"], text: "Fixieren: Punkt, Linie oder Kreis anklicken – bleibt an seinem Platz." },
  abhMitte: { knopf: "tAbh", muster: ["PL", "LP"], text: "Mittelpunkt: Punkt und Linie anklicken – der Punkt liegt in der Mitte der Linie." },
  abhKonzentrisch: { knopf: "tAbh", muster: ["KK"], text: "Konzentrisch: zwei Kreise/Bögen anklicken." },
  abhKollinear: { knopf: "tAbh", muster: ["LL"], text: "Kollinear: zwei Linien anklicken – sie liegen auf einer Geraden." },
  abhSymmetrisch: { knopf: "tAbh", muster: ["PPL", "KKL"], text: "Symmetrisch: zwei Punkte (oder zwei Kreise), dann die Symmetrielinie anklicken." },
  mass: { knopf: "tMass", muster: ["L", "K", "PP", "PL", "LP", "LL", "KL", "LK", "KK", "KP", "PK"], text: "Bemassung (D): Linie → Länge, Kreis → Ø, Bogen → R, zwei Punkte → Abstand, Punkt + Linie → Abstand, zwei Linien → Abstand (parallel) oder Winkel, Kreis + Linie/Kreis/Punkt → Abstand der Mitte. Zweites Objekt gleich anklicken, dann Wert eintippen, Enter." },
};
const ABH_NAME = { horizontal: "Horizontal", vertikal: "Vertikal", koinzident: "Koinzident", aufKurve: "Koinzident (auf Kurve)", tangential: "Tangential", gleich: "Gleich", parallel: "Parallel",
  senkrecht: "Senkrecht", fix: "Fixiert", mittelpunkt: "Mittelpunkt", konzentrisch: "Konzentrisch", kollinear: "Kollinear", symmetrisch: "Symmetrisch" };
const GLYPHE = { horizontal: "H", vertikal: "V", koinzident: "●", aufKurve: "⊙", tangential: "T", gleich: "=", parallel: "∥", senkrecht: "⊥", fix: "🔒", mittelpunkt: "△", konzentrisch: "◎", kollinear: "≡", symmetrisch: "⇋" };
const GRUND = { widerspruch: "Nicht möglich – widerspricht den vorhandenen Abhängigkeiten oder Massen.", ueberzaehlig: "Überzählig – ist durch andere Abhängigkeiten oder Masse schon bestimmt.", "Bezug fehlt": "Diese Auswahl passt nicht zu dieser Abhängigkeit." };
const KNOPF_MENUE = {
  tRechteck: [["rechteck", "2-Punkt-Rechteck"], ["rechteckM", "Rechteck um Mittelpunkt"], ["rechteck3", "3-Punkt-Rechteck (gedreht)"]],
  tKreis: [["kreis", "Kreis um Mittelpunkt"], ["kreis2", "2-Punkt-Kreis"], ["kreis3", "3-Punkt-Kreis"]],
  tBogen: [["bogen3", "3-Punkt-Bogen"], ["bogenM", "Bogen um Mittelpunkt"]],
  tVerschieben: [["verschieben", "Verschieben"], ["kopieren", "Kopieren"], ["drehen", "Drehen"]],
  tMuster: [["musterR", "Rechteckiges Muster"], ["musterK", "Kreisförmiges Muster"]],
  tAbh: [["abhHV", "H/V  Horizontal/Vertikal"], ["abhKoinzident", "●  Koinzident"], ["abhTangential", "T  Tangential"], ["abhGleich", "=  Gleich"], ["abhParallel", "∥  Parallel"],
    ["abhSenkrecht", "⊥  Senkrecht"], ["abhFix", "🔒  Fixieren"], ["abhMitte", "△  Mittelpunkt"], ["abhKonzentrisch", "◎  Konzentrisch"], ["abhKollinear", "≡  Kollinear"], ["abhSymmetrisch", "⇋  Symmetrisch"]],
};
const braucheEingabe = (s) => !!WERKZEUGE[s.werkzeug].ein && (s.pkt.length > 0 || WERKZEUGE[s.werkzeug].immer || (s.werkzeug === "versatz" && !!s.quelle));
function eingabeBeschriften() {
  const s = skizze, felder = WERKZEUGE[s.werkzeug].ein?.(s.pkt.length) || [], lab = $("eingabe").querySelectorAll("label");
  lab.forEach((l, i) => { l.hidden = !felder[i]; if (felder[i]) l.firstChild.textContent = felder[i] + " "; });
}
function setzeWerkzeug(w) {
  if (!skizze) return;
  skizze.projWahl = []; skizze.projHover = null; leeren(projGruppe);
  skizze.werkzeug = w; skizze.pkt = []; skizze.quelle = null; skizze.picks = []; skizze.fangRefs = []; skizze.mehr = new Set(); skizze.basis = null; skizze.basis2 = null;
  document.querySelectorAll(".massbox").forEach((b) => b.remove());
  const knopf = WERKZEUGE[w].knopf;
  document.querySelectorAll("#gSkizze .wz[id^='t']").forEach((b) => b.setAttribute("aria-pressed", b.id === knopf));
  projBarZeigen();
  $("eLaenge").value = w === "abrunden" ? skizze.radius : ""; $("eWinkel").value = "";
  const ein = $("eingabe");
  ein.hidden = !WERKZEUGE[w].immer;
  if (WERKZEUGE[w].immer) { eingabeBeschriften(); ein.style.left = "12px"; ein.style.top = "48px"; }
  status(WERKZEUGE[w].text);
  zeichneLive();
}
// Löschen / Hilfslinie auch per Knopf (Tablet ohne Tastatur)
function loescheSkizzenAuswahl() {
  if (!skizze) return;
  if (skizze.bsel) return entferneBed(skizze.bsel);
  if (skizze.sel) { const i = skizze.f.elemente.indexOf(skizze.sel); if (i >= 0) skizze.f.elemente.splice(i, 1); skizze.sel = null; bereinige(skizze.f); zeichneLive(); }
  else status("Zuerst ein Element anklicken (Werkzeug Auswahl).");
}
// Anzeige in der Skizze: Masse und Abhängigkeitssymbole lassen sich ausblenden
const skAnz = (() => { try { return { masse: einst.allgemein.masse !== false, abh: einst.allgemein.abh !== false, ...JSON.parse(localStorage.getItem("sdcad-skizze-anzeige") || "{}") }; } catch { return { masse: true, abh: true }; } })();
// Programmweite Voreinstellungen (Einstellungen › Allgemein) anwenden: Stiftpalette, Langdruck, Skizzenanzeige
// Ältere Logos ohne Analyse (Helligkeit/Varianten) einmalig nachrechnen
if (einst.firma.logo && einst.firma.logoHell === undefined) logoVarianten(einst.firma.logo).then((v) => { Object.assign(einst.firma, v); einstSpeichern(); }).catch(() => {});
function bedienungAnwenden(neuSetzen = false) {
  const a = einst.allgemein, p = a.stiftpalette, an = p === "ein" || (p !== "aus" && matchMedia("(pointer: coarse), (any-pointer: coarse)").matches);
  document.body.classList.toggle("stiftpalette", an); touchSchalter.langdruck = a.langdruck !== false;
  if (an) stiftBauen();
  if (neuSetzen) { skAnz.masse = a.masse !== false; skAnz.abh = a.abh !== false; try { localStorage.setItem("sdcad-skizze-anzeige", JSON.stringify(skAnz)); } catch {} for (const [id, k] of [["anzMasse", "masse"], ["anzAbh", "abh"]]) $(id).setAttribute("aria-pressed", String(skAnz[k])); if (skizze) zeichneLive(); }
}
// Stiftpalette: Kopien der wichtigsten Knöpfe (Symbol + Aktion), die Zustände folgen den Originalen
const STIFT_ALLE = [["tAuswahl", "Auswahl", "skizze"], ["tLinie", "Linie", "skizze"], ["tRechteck", "Rechteck", "skizze"], ["tKreis", "Kreis", "skizze"], ["tBogen", "Bogen", "skizze"], ["tProjizieren", "Projizieren", "skizze"], ["tHilfs", "Hilfslinie", "skizze"], ["tAbh", "Abhängigkeit", "skizze"], ["tMass", "Bemassung", "skizze"], ["tEntf", "Löschen", "skizze"], ["tFertig", "Skizze beenden", "skizze"], ["zurueck", "Rückgängig", ""], ["vor", "Wiederholen", ""], ["wSkizze", "Skizze erstellen", "modell"], ["wExtrusion", "Extrudieren", "modell"], ["wDrehung", "Drehen", "modell"], ["wFlaeche", "Flächenblech", "modell"]];
const STIFTPOS = "sdcad-stiftpalette";
function stiftLage() { // gemerkte Lage anwenden (innerhalb der Ansicht halten)
  const box = $("stiftleiste"), r = box.parentElement.getBoundingClientRect(); let p = null; try { p = JSON.parse(localStorage.getItem(STIFTPOS)); } catch {}
  if (!p) { Object.assign(box.style, { left: "", top: "", right: "", transform: "" }); return; }
  const b = box.getBoundingClientRect(), x = Math.max(0, Math.min(p.x, r.width - Math.max(60, b.width))), y = Math.max(0, Math.min(p.y, r.height - Math.max(60, b.height)));
  Object.assign(box.style, { left: x + "px", top: y + "px", right: "auto", transform: "none" });
}
function stiftBauen() {
  const box = $("stiftleiste"), sel = new Set(einst.allgemein.stift || []); box.hidden = false;
  let letzte = null, html = '<div class="stiftgriff" title="Palette verschieben (Doppelklick: zurücksetzen)" aria-label="Palette verschieben">⋮⋮</div>';
  for (const [id, t, g] of STIFT_ALLE) { if (!sel.has(id)) continue; const q = $(id); if (!q) continue;
    if (letzte !== null && letzte !== g) html += `<hr data-nur="${g || (letzte === "skizze" ? "skizze" : "modell")}">`; letzte = g;
    const sv = q.querySelector("svg")?.outerHTML || `<svg viewBox="0 0 24 24">${id === "zurueck" ? '<path d="M9 7L4 12l5 5M4 12h11a5 5 0 0 1 0 10"/>' : '<path d="M15 7l5 5-5 5M20 12H9a5 5 0 0 0 0 10"/>'}</svg>`;
    html += `<button data-for="${id}" ${g ? `data-nur="${g}"` : ""} title="${esc(t)}" aria-label="${esc(t)}">${sv}</button>`; }
  box.innerHTML = html;
  if (!box.dataset.fertig) { box.dataset.fertig = "1";
    box.addEventListener("click", (e) => { const b = e.target.closest("button[data-for]"); if (b) { $(b.dataset.for).click(); setTimeout(stiftSync, 50); } });
    let zug = null; // Palette am Griff frei verschieben
    box.addEventListener("pointerdown", (e) => { const gr = e.target.closest(".stiftgriff"); if (!gr || e.button > 0) return; const r = box.getBoundingClientRect(), pr = box.parentElement.getBoundingClientRect(); zug = { dx: e.clientX - r.left, dy: e.clientY - r.top, pr, id: e.pointerId }; try { gr.setPointerCapture(e.pointerId); } catch {} e.preventDefault(); });
    box.addEventListener("pointermove", (e) => { if (!zug || e.pointerId !== zug.id) return; const b = box.getBoundingClientRect(), x = Math.max(0, Math.min(e.clientX - zug.dx - zug.pr.left, zug.pr.width - b.width)), y = Math.max(0, Math.min(e.clientY - zug.dy - zug.pr.top, zug.pr.height - b.height)); Object.assign(box.style, { left: x + "px", top: y + "px", right: "auto", transform: "none" }); zug.x = x; zug.y = y; });
    const ende = () => { if (zug?.x != null) try { localStorage.setItem(STIFTPOS, JSON.stringify({ x: zug.x, y: zug.y })); } catch {} zug = null; };
    box.addEventListener("pointerup", ende); box.addEventListener("pointercancel", ende);
    box.addEventListener("dblclick", (e) => { if (e.target.closest(".stiftgriff")) { try { localStorage.removeItem(STIFTPOS); } catch {} stiftLage(); } });
    addEventListener("resize", stiftLage); }
  stiftLage(); stiftSync();
}
function stiftSync() { for (const b of $("stiftleiste").querySelectorAll("button[data-for]")) { const q = $(b.dataset.for); b.disabled = q.disabled; b.setAttribute("aria-pressed", q.getAttribute("aria-pressed") === "true" ? "true" : "false"); } }
new MutationObserver(() => stiftSync()).observe(document.getElementById("leiste"), { subtree: true, attributes: true, attributeFilter: ["aria-pressed", "disabled"] });
// Erklärung zu «n FG» (auch mit Stift/Finger: beim Überfahren bzw. Antippen)
{ const tip = document.body.appendChild(Object.assign(document.createElement("div"), { className: "zeitTip", hidden: true })); let zeit = 0;
  Object.assign(tip.style, { whiteSpace: "normal", maxWidth: "320px", lineHeight: "1.4" });
  const an = () => { const fg = $("fgAnzeige"); tip.textContent = fg.title; if (!fg.title) return; tip.hidden = false; const r = fg.getBoundingClientRect(), t = tip.getBoundingClientRect(); tip.style.left = Math.max(6, Math.min(r.left + r.width / 2 - t.width / 2, innerWidth - t.width - 6)) + "px"; tip.style.top = r.bottom + 8 + "px"; clearTimeout(zeit); zeit = setTimeout(() => (tip.hidden = true), 6000); };
  $("fgAnzeige").addEventListener("pointerenter", an); $("fgAnzeige").addEventListener("pointerleave", (e) => { if (e.pointerType === "mouse") tip.hidden = true; }); $("fgAnzeige").addEventListener("click", an);
  // Masse / Abhängigkeiten ein- und ausblenden
  for (const [id, k] of [["anzMasse", "masse"], ["anzAbh", "abh"]]) { const b = $(id); b.setAttribute("aria-pressed", String(skAnz[k]));
    b.onclick = () => { skAnz[k] = !skAnz[k]; b.setAttribute("aria-pressed", String(skAnz[k])); try { localStorage.setItem("sdcad-skizze-anzeige", JSON.stringify(anz)); } catch {} status(`${k === "masse" ? "Masse" : "Abhängigkeitssymbole"} ${skAnz[k] ? "eingeblendet" : "ausgeblendet"}.`); zeichneLive(); }; } }
$("tEntf").onclick = () => { if (!skizze) return; if (skizze.werkzeug === "loeschen") return setzeWerkzeug("auswahl"); setzeWerkzeug("loeschen"); skizze.sel = null; skizze.bsel = null; zeichneLive(); }; // erst «Löschen» wählen, dann die Elemente anklicken
function hilfslinieUmschalten() { // gewähltes Element, sonst das zuletzt Projizierte
  const ziele = skizze.sel ? [skizze.sel] : (skizze.projNeu || []).filter((el) => skizze.f.elemente.includes(el)); if (!ziele.length) return;
  const an = !ziele[0].hilfs; for (const el of ziele) el.hilfs = an; status(an ? "Hilfslinie." : "Normale Linie."); zeichneLive();
}
$("tSkalieren")?.addEventListener("click", skizzeSkalieren);
$("tHilfs").onclick = () => { if (!skizze?.sel && !skizze?.projNeu?.length) return status("Zuerst ein Element anklicken (Werkzeug Auswahl)."); hilfslinieUmschalten(); };
function starteSkizze(f) {
  vorbereiten(f); // IDs, Abhängigkeiten; alte Rechtecke werden Linienzüge mit H/V
  skizze = { f, werkzeug: "linie", pkt: [], maus: null, sel: null, bsel: null, zug: null, quelle: null, ecken: 6, radius: 10, picks: [], fangRefs: [], mehr: new Set(), basis: null };
  $("gSkizze").hidden = false; setTimeout(leisteZustand); setTimeout(layerZeigen);
  ["wSkizze", "wExtrusion", "wDrehung", "wSweep", "wLoft", "wBlech", "wVorlage", "wFlaeche", "wEbene"].forEach((id) => ($(id).disabled = true));
  steuerung.mouseButtons = { LEFT: null, MIDDLE: THREE.MOUSE.PAN, RIGHT: null };
  steuerung.touches = { ONE: null, TWO: THREE.TOUCH.DOLLY_PAN };
  orthoSetzen(true);
  steuerung.enableRotate = false; // Skizze: immer senkrecht auf die Fläche – Verschieben und Zoomen drehen die Ansicht nie
  const E = E_(f.ebene);
  skizzenRaster = new THREE.GridHelper(2000, 400, 0x1f5fbf, 0x9db7dd);
  skizzenRaster.material.transparent = true; skizzenRaster.material.opacity = 0.25; skizzenRaster.material.depthWrite = false;
  skizzenRaster.applyMatrix4(new THREE.Matrix4().makeBasis(V(E.u), V(E.n), V(E.v).negate()).setPosition(V(E.o)));
  szene.add(skizzenRaster); boden.visible = false;
  for (const [q, farbe] of [[[1000, 0], 0xc0392b], [[0, 1000], 0x2e8b57]]) { // Achsen durch den Ursprung (zum Anklicken für Abhängigkeiten)
    const lokal = (u, v) => new THREE.Vector3(u, 0, -v); // Raster liegt lokal in x/z (u → x, v → −z)
    const ax = new THREE.Line(new THREE.BufferGeometry().setFromPoints([lokal(-q[0], -q[1]), lokal(q[0], q[1])]), new THREE.LineBasicMaterial({ color: farbe, transparent: true, opacity: 0.45, depthTest: false }));
    ax.renderOrder = 9; skizzenRaster.add(ax);
  }
  // Blick senkrecht auf die Skizzenebene (bei waagrechten Ebenen leicht gekippt, sonst ist «oben» nicht bestimmt)
  steuerung.target.copy(V(E.o));
  kamera.position.copy(V(E.o).add(V(E.n).multiplyScalar(500 * orthoK)).add(new THREE.Vector3(0, 0, Math.abs(E.n[1]) > 0.999 ? 0.5 : 0)));
  regen(); fitte(alleBox().isEmpty() ? new THREE.Box3(new THREE.Vector3(-150, -150, -150), new THREE.Vector3(150, 150, 150)) : alleBox());
  setzeWerkzeug(f.elemente.length ? "auswahl" : "linie");
}
// ------------------------------------------------------------ 2D-Modus: nur Skizzen/Zeichnung, Körper ausgeblendet, Layer-Leiste, DXF-Ausgabe
let modus2d = false;
function layerZeigen() {
  const box = $("layerBox"); box.hidden = !skizze; if (box.hidden) return;
  const ls = layerListe(), akt = doc.aktivLayer && ls.some((l) => l.id === doc.aktivLayer) ? doc.aktivLayer : "0";
  $("layerListe").innerHTML = ls.map((l) => `<div class="lrow${l.id === akt ? " aktiv" : ""}" data-l="${esc(l.id)}">
    <input type="radio" name="layerAkt" ${l.id === akt ? "checked" : ""} title="Aktiver Layer: neue Linien kommen hierher" aria-label="Aktiver Layer ${esc(l.name)}">
    <input type="checkbox" data-lf="sichtbar" ${l.sichtbar !== false ? "checked" : ""} title="Layer ein-/ausblenden" aria-label="Sichtbar">
    <input type="text" data-lf="name" value="${esc(l.name)}" aria-label="Layername">
    <select data-lf="aci" aria-label="Farbe"><option value="">Standard</option>${FARBEN.map(([c, n]) => `<option value="${c}" ${l.aci === c ? "selected" : ""}>${n}</option>`).join("")}</select>
    <select data-lf="art" aria-label="Linienart">${Object.entries(LINIENARTEN).map(([k, [, n]]) => `<option value="${k}" ${(l.art || "durchgezogen") === k ? "selected" : ""}>${n}</option>`).join("")}</select>
    <span class="lfarbe" style="background:#${(l.aci != null ? farbeHex(l.aci) : 0x1f5fbf).toString(16).padStart(6, "0")}"></span>
    ${l.id !== "0" ? `<button data-ldel="${esc(l.id)}" title="Layer löschen (Linien wandern nach Layer 0)" aria-label="Layer löschen">✕</button>` : ""}</div>`).join("");
}
$("layerListe").addEventListener("change", (e) => {
  const row = e.target.closest(".lrow"); if (!row) return; const l = layerListe().find((x) => x.id === row.dataset.l); if (!l) return;
  if (e.target.name === "layerAkt") doc.aktivLayer = l.id;
  const k = e.target.dataset.lf;
  if (k === "sichtbar") l.sichtbar = e.target.checked; else if (k === "name") l.name = e.target.value.trim() || l.name; else if (k === "aci") l.aci = e.target.value === "" ? null : +e.target.value; else if (k === "art") l.art = e.target.value;
  layerZeigen(); if (skizze) zeichneLive(); else regen(); merke();
});
$("layerListe").addEventListener("click", (e) => {
  const d = e.target.closest("[data-ldel]")?.dataset.ldel; if (!d) return;
  for (const f of doc.features) for (const el of f.elemente || []) if (el.layer === d) el.layer = "0";
  doc.layer = layerListe().filter((l) => l.id !== d); if (doc.aktivLayer === d) doc.aktivLayer = "0";
  layerZeigen(); if (skizze) zeichneLive(); else regen(); merke();
});
$("lTitel").onclick = () => $("layerBox").classList.toggle("zu");
$("lNeu").onclick = () => { const ls = layerListe(), n = ls.length; const l = { id: "L" + Date.now().toString(36), name: `Layer ${n}`, aci: FARBEN[n % FARBEN.length][0], art: "durchgezogen", sichtbar: true }; ls.push(l); doc.aktivLayer = l.id; layerZeigen(); merke(); };
$("lZuw").onclick = () => {
  if (!skizze?.sel && !skizze?.mehr?.size) return status("Zuerst ein Element anklicken (Werkzeug Auswahl), dann «Element → Layer».");
  const ziele = skizze.mehr?.size ? [...skizze.mehr].map((x) => (typeof x === "object" ? x : skizze.f.elemente.find((e) => e.id === x))).filter(Boolean) : [skizze.sel];
  for (const el of ziele) el.layer = doc.aktivLayer || "0"; zeichneLive(); status(`${ziele.length} Element${ziele.length === 1 ? "" : "e"} auf Layer «${layerVon(ziele[0]).name}» gelegt.`);
};
function zeichnungObjekte() { // Skizzenelemente aller sichtbaren Skizzen als DXF-Objekte (Skizzenkoordinaten, mm)
  const out = [];
  for (const sk of doc.features.filter((x) => x.typ === "skizze" && !x.versteckt && !x._aus)) for (const el of sk.elemente) {
    if (el.hilfs || el.projiziert || el.art === "punkt") continue;
    const layer = el.layer ?? "0";
    if (el.art === "kreis") { out.push({ layer, art: "kreis", c: el.c, r: el.r }); continue; }
    if (el.art === "bogen") { const d = bogenDaten(el); if (d) { const w0 = (d.start * 180) / Math.PI, sw = (d.sweep * 180) / Math.PI, a = sw >= 0 ? w0 : w0 + sw, b = sw >= 0 ? w0 + sw : w0, nm = (v) => ((v % 360) + 360) % 360; out.push({ layer, art: "bogen", c: d.c, r: d.r, w0: nm(a), w1: nm(b) }); continue; } }
    for (const pts of elGeo(el).linien) { const zu = pts.length > 2 && Math.hypot(pts[0][0] - pts.at(-1)[0], pts[0][1] - pts.at(-1)[1]) < 1e-9; if (pts.length === 2 && !zu) out.push({ layer, art: "linie", a: pts[0], b: pts[1] }); else out.push({ layer, art: "poly", pts: zu ? pts.slice(0, -1) : pts, geschlossen: zu }); }
  }
  return out;
}
$("lDxf").onclick = () => { const o = zeichnungObjekte(); if (!o.length) return status("Noch nichts gezeichnet."); herunterladen(`${doc.nr || "Zeichnung"} 2D.dxf`, skizzenDxf(layerListe(), o, doc.objekt || ""), "application/dxf"); status(`DXF mit ${o.length} Elementen und ${layerListe().filter((l) => l.sichtbar !== false).length} Layern gespeichert.`); };
function schalte2D(an = !modus2d) {
  if (dlg) $("dAbbrechen").click();
  modus2d = an; $("w2D").classList.toggle("an", an); document.body.classList.toggle("modus2d", an);
  if (an) {
    if (!skizze) {
      let f = finde(auswahl); if (f?.typ !== "skizze") f = [...doc.features].reverse().find((x) => x.typ === "skizze");
      if (!f) { f = { id: neueId(), typ: "skizze", name: "Zeichnung " + (doc.features.filter((x) => x.typ === "skizze").length + 1), ebene: "XY", elemente: [] }; einfuegen(f); }
      starteSkizze(f);
    }
  } else { if (skizze) beendeSkizze(); regen(); }
  layerZeigen();
}
$("w2D").onclick = () => schalte2D();
// Fehlt eine Voraussetzung (Skizze, Blech, Körper …), öffnet das Werkzeug trotzdem – im Fenster steht, was fehlt
function fehltDialog(titel, hinweis) {
  if (skizze) return status("Erst die Skizze beenden.");
  if (dlg) $("dAbbrechen").click();
  dialog({ titel, felder: [], hinweis: "⚠ " + hinweis });
  status(hinweis);
}
function beendeSkizze() {
  if (!skizze) return;
  abschliessenLinie();
  const f = skizze.f;
  leeren(projGruppe); $("projBar").hidden = true;
  skizze = null;
  if (!f.elemente.length) entferneFeature(f);
  $("gSkizze").hidden = true; setTimeout(leisteZustand); setTimeout(layerZeigen);
  ["wSkizze", "wExtrusion", "wDrehung", "wSweep", "wLoft", "wBlech", "wVorlage", "wFlaeche", "wEbene"].forEach((id) => ($(id).disabled = false));
  steuerung.mouseButtons = { LEFT: null, MIDDLE: THREE.MOUSE.PAN, RIGHT: null };
  steuerung.touches = { ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_PAN }; steuerung.enableRotate = true; kamera.up.set(0, 1, 0);
  orthoSetzen(false);
  szene.remove(skizzenRaster); skizzenRaster = null; boden.visible = true;
  $("eingabe").hidden = true; leeren(live); labels = []; document.querySelectorAll(".massbox").forEach((b) => b.remove()); $("fgAnzeige").textContent = "";
  status(f.elemente.length ? "Skizze fertig – die passenden Werkzeuge stehen oben in der Kontextleiste." : "");
  regen();
  if (f.elemente.length && doc.features.includes(f) && !modus2d) waehle(f.id); // fertige Skizze ist gewählt → Kontextleiste bietet Extrudieren / Flächenblech / Blechprofil an
}

// Punkt auf der Skizzenebene unter dem Mauszeiger, mit Fang
const strahl = new THREE.Raycaster();
function ndc(e) { const r = leinwand.getBoundingClientRect(); return new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1); }
function bildschirm(p) { const v = zu3D(skizze.f.ebene, p).project(kamera), r = leinwand.getBoundingClientRect(); return [(v.x + 1) / 2 * r.width, (1 - v.y) / 2 * r.height]; }
function fangPunkte() { // Punkte mit Bezug (für automatische Koinzidenz); Punkte des laufenden Linienzugs ohne
  return skizzenPunkte(skizze.f).map((q) => ({ uv: q.uv, ref: q.ref, el: q.el })).concat(skizze.pkt.map((uv) => ({ uv, ref: null })));
}
// Objektfang: Endpunkte, Mittelpunkte, Kreismitten, Punkte auf Linien und auf Körperkanten; liefert das Fangzeichen mit
const FANGNAME = { endpunkt: "Endpunkt", zentrum: "Mitte", mitte: "Mittelpunkt", linie: "Auf Linie", kecke: "Körperecke", kmitte: "Körperkante · Mitte", kkante: "Auf Körperkante", flaeche: "Auf Fläche" };
let kantenCache = { key: "", segs: [] };
function koerperKantenCache() { // Kanten aller Körper in Weltkoordinaten, nur neu berechnet, wenn sich die Körper ändern
  const ms = modell.children.filter((o) => o.isMesh), key = ms.map((m) => m.uuid + ":" + (m.children[0]?.geometry.uuid || "")).join("|");
  if (kantenCache.key !== key) kantenCache = { key, segs: koerperKanten() };
  return kantenCache.segs;
}
function koerperFang(sm, radius = 12) { // → { p: [x,y,z], art, s: [x,y] } oder null
  const r = leinwand.getBoundingClientRect(), v = new THREE.Vector3(), proj = (q) => { v.set(q[0], q[1], q[2]).project(kamera); return [(v.x + 1) / 2 * r.width, (1 - v.y) / 2 * r.height, v.z]; };
  let best = null, bd = radius;
  const nimm = (q, art, bonus, S) => { if (S[2] >= 1) return; const d = Math.hypot(S[0] - sm[0], S[1] - sm[1]) - bonus; if (d < bd) { bd = d; best = { p: q, art, s: [S[0], S[1]] }; } };
  for (const [a, b] of koerperKantenCache()) {
    const A = proj(a), B = proj(b); if (A[2] >= 1 && B[2] >= 1) continue;
    nimm(a, "kecke", 5, A); nimm(b, "kecke", 5, B); nimm([(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2], "kmitte", 3, proj([(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2]));
    const dx = B[0] - A[0], dy = B[1] - A[1], l2 = dx * dx + dy * dy; if (l2 < 1) continue;
    const tt = Math.max(0, Math.min(1, ((sm[0] - A[0]) * dx + (sm[1] - A[1]) * dy) / l2)), d = Math.hypot(sm[0] - (A[0] + tt * dx), sm[1] - (A[1] + tt * dy));
    if (d < Math.min(bd, 8) && tt > 0 && tt < 1) { bd = d; best = { p: [0, 1, 2].map((i) => a[i] + tt * (b[i] - a[i])), art: "kkante", s: [A[0] + tt * dx, A[1] + tt * dy] }; }
  }
  return best;
}
function skizzenFang(sm) { // → { uv, art, ref, s } oder null (Bildschirmabstand < 12 px)
  let best = null, bd = 12;
  const kand = (uv, art, ref, bonus, S) => { const s = S || bildschirm(uv), d = Math.hypot(s[0] - sm[0], s[1] - sm[1]) - bonus; if (d < bd) { bd = d; best = { uv: uv.slice(), art, ref, s }; } };
  for (const q of fangPunkte()) kand(q.uv, q.ref?.k === "c" ? "zentrum" : "endpunkt", q.ref, 5);
  for (const el of skizze.f.elemente) for (const [a, b] of elementKanten(el)) {
    kand([(a[0] + b[0]) / 2, (a[1] + b[1]) / 2], "mitte", null, 3);
    const A = bildschirm(a), B = bildschirm(b), dx = B[0] - A[0], dy = B[1] - A[1], l2 = dx * dx + dy * dy; if (l2 < 1) continue;
    const tt = Math.max(0, Math.min(1, ((sm[0] - A[0]) * dx + (sm[1] - A[1]) * dy) / l2)), d = Math.hypot(sm[0] - (A[0] + tt * dx), sm[1] - (A[1] + tt * dy));
    if (d < Math.min(bd, 8) && tt > 0 && tt < 1) { bd = d; best = { uv: [a[0] + tt * (b[0] - a[0]), a[1] + tt * (b[1] - a[1])], art: "linie", ref: null, s: [A[0] + tt * dx, A[1] + tt * dy] }; }
  }
  const k = koerperFang(sm); // Körper unter der Skizze: Punkt auf die Skizzenebene projiziert
  if (k) { const uv = aufEbene(skizze.f.ebene, new THREE.Vector3(...k.p)), d = Math.hypot(k.s[0] - sm[0], k.s[1] - sm[1]); if (d - (k.art === "kecke" ? 4 : 0) < bd) { bd = d; best = { uv, art: k.art, ref: null, s: k.s }; } }
  return best;
}
const FANGGLYPHE = { endpunkt: '<rect x="-6" y="-6" width="12" height="12"/>', zentrum: '<circle r="6"/><circle r="1.4"/>', mitte: '<path d="M0 -7L7 6H-7Z"/>', linie: '<path d="M-6 -6L6 6M-6 6L6 -6"/>',
  kecke: '<path d="M0 -7L7 0L0 7L-7 0Z"/>', kmitte: '<path d="M0 -7L7 0L0 7L-7 0Z"/><circle r="1.4"/>', kkante: '<path d="M-7 0H7M0 -7V7"/>', flaeche: '<circle r="5"/>' };
let fangArtZuletzt = "";
function fangZeigen(f) { // Fangzeichen mit Beschriftung an der Mausposition
  const z = $("fangZeichen"); if (!z) return;
  if (!f) { z.hidden = true; fangArtZuletzt = ""; return; }
  z.hidden = false; z.style.left = f.s[0] + "px"; z.style.top = f.s[1] + "px";
  const marke = f.art + "|" + (f.text || "");
  if (marke !== fangArtZuletzt) { fangArtZuletzt = marke; z.querySelector("g").innerHTML = f.art === "wahl" ? "" : FANGGLYPHE[f.art] || ""; z.querySelector("span").textContent = f.text || FANGNAME[f.art] || f.art; }
}
function ebenenPunkt(e) {
  strahl.setFromCamera(ndc(e), kamera);
  const p = strahl.ray.intersectPlane(ebenenEbene(skizze.f.ebene), new THREE.Vector3());
  if (!p) return null;
  let uv = aufEbene(skizze.f.ebene, p);
  const sm = smPos(e), fg = skizzenFang(sm);
  if (fg) return { uv: fg.uv, fang: fg.art === "endpunkt" || fg.art === "zentrum", ref: fg.ref, art: fg.art, s: fg.s };
  if (!e.shiftKey) uv = uv.map(rastern);
  const letzt = skizze.pkt.at(-1);
  if (letzt) { // waagrecht / senkrecht ausrichten
    const sl = bildschirm(letzt);
    if (Math.abs(bildschirm([letzt[0], uv[1]])[0] - sm[0]) < 8 && Math.abs(sl[0] - sm[0]) < 8) uv[0] = letzt[0];
    if (Math.abs(sl[1] - sm[1]) < 8) uv[1] = letzt[1];
  }
  return { uv };
}

const abst = (a, b) => Math.hypot(b[0] - a[0], b[1] - a[1]);
const abstandZurGeraden = (p, a, b) => { const L = abst(a, b) || 1; return Math.abs((b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0])) / L; };
const rechteckMitte = (c, ecke) => { const dx = Math.abs(ecke[0] - c[0]), dy = Math.abs(ecke[1] - c[1]); return dx && dy ? { art: "rechteck", a: [c[0] - dx, c[1] - dy], b: [c[0] + dx, c[1] + dy] } : null; };
const rechteckEl = (a, b) => ({ art: "linie", pts: [a.slice(), [b[0], a[1]], b.slice(), [a[0], b[1]]], geschlossen: true });
const rechteckM = (e, c) => [...rechteckBedingungen(e), { typ: "mittelpunkt", p: { e: c, k: "p" }, a: { e, k: "p0" }, b: { e, k: "p2" } }];
const rechteck3Bed = (e) => [{ typ: "senkrecht", l1: { e, s: 0 }, l2: { e, s: 1 } }, { typ: "parallel", l1: { e, s: 0 }, l2: { e, s: 2 } }, { typ: "parallel", l1: { e, s: 1 }, l2: { e, s: 3 } }];
const polygonBed = (n) => (e, k) => Array.from({ length: n }, (_, i) => [{ typ: "aufKurve", p: { e, k: "p" + i }, k: { e: k } }, ...(i ? [{ typ: "gleich", l1: { e, s: 0 }, l2: { e, s: i } }] : [])]).flat();
// Neue Elemente einfügen (mit ID) und Abhängigkeiten wie in Fusion setzen: eigene (Rechteck H/V …), waagrecht/senkrecht gezeichnet, Fang auf Punkte → koinzident
function erstelle(els, bedFn, { hv = false } = {}) {
  const f = skizze.f; f.bedingungen ||= [];
  for (const el of els) { el.id = neueElementId(f); f.elemente.push(el); }
  const neu = bedFn ? bedFn(...els.map((x) => x.id)) : [];
  if (hv) for (const el of els) for (let k = 0; k < kantenZahl(el); k++) {
    const a = el.pts[k], b = el.pts[(k + 1) % el.pts.length];
    if (Math.abs(a[1] - b[1]) < 1e-9) neu.push({ typ: "horizontal", l: { e: el.id, s: k } }); else if (Math.abs(a[0] - b[0]) < 1e-9) neu.push({ typ: "vertikal", l: { e: el.id, s: k } });
  }
  const eigene = skizzenPunkte({ elemente: els }).filter((q) => q.e !== "O");
  for (const { uv, ref } of skizze.fangRefs) {
    const q = eigene.find((x) => gleich(x.uv, uv));
    if (q && ref.e !== q.e && !neu.some((b) => b.typ === "koinzident" && b.b.e === q.e && b.b.k === q.ref.k)) neu.push({ typ: "koinzident", a: ref, b: q.ref });
  }
  skizze.fangRefs = [];
  f.bedingungen.push(...neu);
}
function klick(uv, fang, sm, ref) {
  const s = skizze, el = s.f.elemente, w = s.werkzeug, P = s.pkt;
  if (ref && !WERKZEUGE[w].aendern && !WERKZEUGE[w].muster) s.fangRefs.push({ uv: uv.slice(), ref });
  const fertig = (neu, bedFn, opt) => { if (neu) erstelle([].concat(neu), bedFn, opt); s.pkt = []; s.fangRefs = []; };
  switch (w) {
    case "linie": {
      const erster = P[0];
      if (erster && P.length >= 3 && fang && uv[0] === erster[0] && uv[1] === erster[1]) fertig({ art: "linie", pts: P.slice(), geschlossen: true }, null, { hv: true });
      else if (!P.length || abst(uv, P.at(-1)) > 1e-6) P.push(uv);
      break;
    }
    case "rechteck":
      if (!P.length) P.push(uv);
      else { const a = P[0]; fertig(a[0] !== uv[0] && a[1] !== uv[1] ? rechteckEl([Math.min(a[0], uv[0]), Math.min(a[1], uv[1])], [Math.max(a[0], uv[0]), Math.max(a[1], uv[1])]) : null, rechteckBedingungen); }
      break;
    case "rechteckM": if (!P.length) P.push(uv); else { const r = rechteckMitte(P[0], uv); fertig(r && [rechteckEl(r.a, r.b), { art: "punkt", p: P[0].slice(), hilfs: true }], rechteckM); } break;
    case "rechteck3":
      if (P.length < 2) { if (!P.length || abst(P[0], uv) > 1e-6) P.push(uv); }
      else { const q = rechteck3(P[0], P[1], uv); fertig(Math.abs(flaeche(q)) > 1e-6 ? { art: "linie", pts: q, geschlossen: true } : null, rechteck3Bed); }
      break;
    case "kreis": if (!P.length) P.push(uv); else { const r = abst(P[0], uv); fertig(r > 0 ? { art: "kreis", c: P[0], r } : null); } break;
    case "kreis2": if (!P.length) P.push(uv); else { const r = abst(P[0], uv) / 2; fertig(r > 0 ? { art: "kreis", c: [(P[0][0] + uv[0]) / 2, (P[0][1] + uv[1]) / 2], r } : null); } break;
    case "kreis3":
      if (P.length < 2) P.push(uv);
      else { const k = kreisDurch3(P[0], P[1], uv); if (!k) status("Die drei Punkte liegen auf einer Linie."); fertig(k ? { art: "kreis", c: k.c, r: k.r } : null); }
      break;
    case "bogen3":
      if (P.length < 2) P.push(uv);
      else { const b = { art: "bogen", a: P[0], b: P[1], m: uv }; if (!bogenDaten(b)) status("Der dritte Punkt liegt auf der Geraden – kein Bogen."); fertig(bogenDaten(b) ? b : null); }
      break;
    case "bogenM": if (P.length < 2) { if (!P.length || abst(P[0], uv) > 1e-6) P.push(uv); } else fertig({ art: "bogen", ...bogenAusMitte(P[0], P[1], uv) }); break;
    case "polygon": if (!P.length) P.push(uv); else fertig(abst(P[0], uv) > 0 ? [{ art: "linie", pts: polygonPunkte(P[0], uv, s.ecken), geschlossen: true }, { art: "kreis", c: P[0].slice(), r: abst(P[0], uv), hilfs: true }] : null, polygonBed(Math.max(3, Math.round(s.ecken)))); break;
    case "langloch":
      if (P.length < 2) { if (!P.length || abst(P[0], uv) > 1e-6) P.push(uv); }
      else { const r = abstandZurGeraden(uv, P[0], P[1]); fertig(r > 0 ? { art: "langloch", a: P[0], b: P[1], r } : null); }
      break;
    case "punkt": fertig({ art: "punkt", p: uv }); break;
    case "text": {
      const t = prompt("Text (z. B. Objektnummer, Firmenname)", s.letzterText || "SM 2026"); if (!t?.trim()) break;
      const h = parseFloat(String(prompt("Schrifthöhe in mm", s.letzteHoehe || 40)).replace(",", ".")); if (!(h > 0)) break;
      s.letzterText = t; s.letzteHoehe = h;
      fertig({ art: "text", p: uv, text: t.trim(), hoehe: h, winkel: 0 }); status("Text gesetzt – Doppelklick (Auswahl) ändert ihn. Extrudieren mit «Ausschneiden» = Gravur, «Vereinigen» = Prägung."); break;
    }
    case "spline": {
      const erster = P[0];
      if (erster && P.length >= 3 && fang && uv[0] === erster[0] && uv[1] === erster[1]) fertig({ art: "spline", pts: P.slice(), geschlossen: true });
      else if (!P.length || abst(uv, P.at(-1)) > 1e-6) P.push(uv);
      break;
    }
    case "ellipse":
      if (P.length < 2) { if (!P.length || abst(P[0], uv) > 1e-6) P.push(uv); }
      else { const r2 = abstandZurGeraden(uv, P[0], P[1]); fertig(r2 > 0 ? { art: "ellipse", c: P[0], a: P[1], r2 } : null); }
      break;
    case "abrunden": abrunden(sm); break;
    case "fase": fase(sm); break;
    case "schnitt": schnittMitKoerpern(); setzeWerkzeug("auswahl"); break;
    case "versatz": versatzKlick(uv, sm); break;
    case "spiegeln": spiegelnKlick(sm); break;
    case "stutzen": stutzen(uv, sm); break;
    case "hilfslinie": { const t = trefferElement(sm); if (t) { t.hilfs = !t.hilfs; status(t.hilfs ? "Hilfslinie: zählt nicht als Profil." : "Wieder normale Linie."); } break; }
    case "dehnen": dehnen(uv, sm); break;
    case "trennen": trennen(uv, sm); break;
    case "verschieben": case "kopieren": case "drehen": case "musterR": case "musterK": mehrfachKlick(uv, sm, fang); break;
    case "projizieren": projizieren(sm); break;
    default: if (WERKZEUGE[w].muster) wahlKlick(sm);
  }
  sichereIds(s.f); bereinige(s.f); // neue Elemente der Ändern-Werkzeuge bekommen IDs, Abhängigkeiten zu entfernten Elementen fallen weg
  $("eLaenge").value = w === "abrunden" ? s.radius : ""; $("eWinkel").value = "";
  if (!braucheEingabe(s)) $("eingabe").hidden = true; else eingabeBeschriften();
  zeichneLive();
}

// ------------------------------------------------------------ Ändern: Abrunden, Versatz, Spiegeln, Stutzen
const zuLinienzug = (el) => { // Rechteck für Änderungen in einen geschlossenen Linienzug umwandeln (gleicher Platz in der Liste)
  if (el.art !== "rechteck") return el;
  const neu = { art: "linie", pts: elementPunkte(el).map((p) => p.slice()), geschlossen: true, ...(el.hilfs ? { hilfs: true } : {}) };
  skizze.f.elemente.splice(skizze.f.elemente.indexOf(el), 1, neu);
  return neu;
};
function trefferEcke(sm) {
  for (const el of skizze.f.elemente) {
    if (el.art !== "linie" && el.art !== "rechteck") continue;
    const pts = elementPunkte(el);
    for (let i = 0; i < pts.length; i++) { const q = bildschirm(pts[i]); if (Math.hypot(q[0] - sm[0], q[1] - sm[1]) < 12) return { el, i }; }
  }
  return null;
}
// Fase in der Skizze: Ecke eines Linienzugs, Polygons oder Rechtecks um den Abstand auf beiden Schenkeln kappen
function fase(sm) {
  const t = trefferEcke(sm); if (!t) return status("Ecke eines Linienzugs, Polygons oder Rechtecks anklicken.");
  const el = zuLinienzug(t.el), i = t.i, D = skizze.radius, n = el.pts.length;
  if (!el.geschlossen && (i === 0 || i === n - 1)) return status("Endpunkte eines offenen Linienzugs lassen sich nicht fasen.");
  if (!(D > 0)) return status("Zuerst den Fasenabstand eintippen (Enter).");
  const vor = el.pts[(i - 1 + n) % n], p = el.pts[i], nach = el.pts[(i + 1) % n], l1 = abst(p, vor), l2 = abst(p, nach); if (l1 < 1e-9 || l2 < 1e-9) return;
  const d1 = Math.min(D, l1 / 2), d2 = Math.min(D, l2 / 2), a = [p[0] + ((vor[0] - p[0]) / l1) * d1, p[1] + ((vor[1] - p[1]) / l1) * d1], b = [p[0] + ((nach[0] - p[0]) / l2) * d2, p[1] + ((nach[1] - p[1]) / l2) * d2];
  const rad = {}; for (const [k, v] of Object.entries(el.radien || {})) { const kk = +k; if (kk !== i) rad[kk > i ? kk + 1 : kk] = v; } el.radien = rad;
  el.pts.splice(i, 1, a, b); status(d1 < D - 1e-6 || d2 < D - 1e-6 ? `Fase auf ${f1(Math.min(d1, d2))} mm begrenzt (Kanten zu kurz).` : `Ecke mit ${f1(D)} mm gefast.`);
}
// Skizze oder gewähltes Element mit einem Faktor skalieren (Masse der Bemassungen werden mitgeführt)
function skizzeSkalieren() {
  if (!skizze) return; const k = parseFloat(String(prompt("Skalierfaktor (z. B. 2 = doppelt, 0.5 = halb)", "2") || "").replace(",", ".")); if (!(k > 0)) return;
  const f = skizze.f, ziele = skizze.sel ? [skizze.sel] : f.elemente.filter((e) => !e.projiziert), pts = ziele.flatMap((e) => elementPunkte(e)), c = pts.length ? [pts.reduce((a, q) => a + q[0], 0) / pts.length, pts.reduce((a, q) => a + q[1], 0) / pts.length] : [0, 0];
  const fn = (q) => [c[0] + (q[0] - c[0]) * k, c[1] + (q[1] - c[1]) * k];
  for (const el of ziele) { transformiere(el, fn); if (el.r > 0) el.r *= k; if (el.radien) for (const key of Object.keys(el.radien)) el.radien[key] *= k; }
  for (const b of f.bedingungen || []) if (typeof b.w === "number" && IST_MASS.has?.(b.typ) !== false && !/winkel/i.test(b.typ)) b.w *= k;
  sichereIds(f); bereinige(f); zeichneLive(); status(`Skizze mit Faktor ${k} skaliert.`);
}
// Schnitt mit Körpern: Dreiecke aller sichtbaren Netze mit der Skizzenebene schneiden und die Schnittlinien als fixierte Linien übernehmen
function schnittMitKoerpern() {
  const f = skizze.f, E = E_(f.ebene), n = V(E.n).normalize(), d0 = n.dot(V(E.o)), segs = [];
  for (const m of modell.children.filter((o) => o.isMesh && o.visible)) {
    m.updateMatrixWorld(true); const P = m.geometry.attributes.position, idx = m.geometry.index, tn = (idx ? idx.count : P.count) / 3, W = (i) => new THREE.Vector3().fromBufferAttribute(P, idx ? idx.getX(i) : i).applyMatrix4(m.matrixWorld);
    for (let t = 0; t < tn; t++) {
      const a = W(t * 3), b = W(t * 3 + 1), c = W(t * 3 + 2), da = n.dot(a) - d0, db = n.dot(b) - d0, dc = n.dot(c) - d0; if ((da > 1e-6 && db > 1e-6 && dc > 1e-6) || (da < -1e-6 && db < -1e-6 && dc < -1e-6) || (Math.abs(da) < 1e-6 && Math.abs(db) < 1e-6 && Math.abs(dc) < 1e-6)) continue;
      const pk = []; for (const [p, q, dp, dq] of [[a, b, da, db], [b, c, db, dc], [c, a, dc, da]]) if ((dp > 0) !== (dq > 0) && dp !== dq) pk.push(p.clone().lerp(q, dp / (dp - dq))); else if (Math.abs(dp) <= 1e-6) pk.push(p.clone());
      const u = pk.filter((p, i) => pk.findIndex((q) => q.distanceTo(p) < 1e-5) === i); if (u.length === 2) segs.push([u[0], u[1]]);
    }
  }
  if (!segs.length) return status("Die Skizzenebene schneidet keinen sichtbaren Körper.");
  const auf = (w) => zuLokal(E, w.toArray()), stuecke = segs.map(([a, b]) => ({ pts: [auf(a), auf(b)] })), neu = [];
  for (const z of verbindeStuecke(stuecke).flatMap((z) => teileAnEcken(z.pts, z.geschlossen))) {
    const pts = z.pts.filter((q, i) => !i || abst(q, z.pts[i - 1]) > 1e-6); if (z.zu && pts.length > 2 && gleich(pts[0], pts.at(-1))) pts.pop(); if (pts.length < 2) continue;
    const el = { art: "linie", pts, geschlossen: !!z.zu && pts.length > 2, projiziert: true, id: neueElementId(f) }; f.elemente.push(el); f.bedingungen.push({ typ: "fix", e: el.id }); neu.push(el);
  }
  skizze.projNeu = neu; status(`Schnitt: ${neu.length} Linie${neu.length === 1 ? "" : "n"} projiziert (fixiert, X = Hilfslinie).`);
}
function abrunden(sm) {
  const t = trefferEcke(sm); if (!t) return status("Ecke eines Linienzugs, Polygons oder Rechtecks anklicken.");
  const el = zuLinienzug(t.el), i = t.i, R = skizze.radius;
  if (!el.geschlossen && (i === 0 || i === el.pts.length - 1)) return status("Endpunkte eines offenen Linienzugs lassen sich nicht abrunden.");
  el.radien = { ...(el.radien || {}) };
  if (R > 0) el.radien[i] = R; else delete el.radien[i];
  const a = R > 0 && abrundung(el.pts, i, R, el.geschlossen);
  status(!R ? "Abrundung entfernt." : a && a.r < R - 1e-6 ? `Radius in der Zeichnung auf ${f1(a.r)} mm begrenzt (Kanten zu kurz).` : `Ecke mit R ${f1(R)} abgerundet.`);
}
// Versatz-Vorschau: Seite (und Abstand, wenn nicht eingetippt) aus der Mausposition
function versatzVorschau(uv, betrag) {
  const q = skizze.quelle; if (!q || !uv) return null;
  const rund = (x) => rastern(x) || x;
  const mitSeite = (seite) => (betrag != null ? Math.sign(seite || 1) * betrag : rund(seite)); // seite > 0: aussen bzw. links
  const neu = (x) => (q.hilfs ? { ...x, hilfs: true } : x);
  if (q.art === "kreis") { const d = mitSeite(abst(uv, q.c) - q.r); return q.r + d > 0 ? neu({ art: "kreis", c: q.c.slice(), r: q.r + d }) : null; }
  if (q.art === "langloch") {
    const L = abst(q.a, q.b) || 1, t = Math.max(0, Math.min(1, ((uv[0] - q.a[0]) * (q.b[0] - q.a[0]) + (uv[1] - q.a[1]) * (q.b[1] - q.a[1])) / (L * L)));
    const d = mitSeite(abst(uv, [q.a[0] + (q.b[0] - q.a[0]) * t, q.a[1] + (q.b[1] - q.a[1]) * t]) - q.r);
    return q.r + d > 0 ? neu({ art: "langloch", a: q.a.slice(), b: q.b.slice(), r: q.r + d }) : null;
  }
  if (q.art === "bogen") {
    const bd = bogenDaten(q); if (!bd) return null;
    const d = mitSeite(abst(uv, bd.c) - bd.r), k = (bd.r + d) / bd.r, sk = (p) => [bd.c[0] + (p[0] - bd.c[0]) * k, bd.c[1] + (p[1] - bd.c[1]) * k];
    return k > 0 ? neu({ art: "bogen", a: sk(q.a), b: sk(q.b), m: sk(q.m) }) : null;
  }
  if (q.art !== "linie" && q.art !== "rechteck") return null;
  const zu = q.art === "rechteck" || q.geschlossen, pts = elementPunkte(q);
  let dmin = Infinity, links = true;
  pts.slice(0, zu ? pts.length : -1).forEach((a, i) => {
    const b = pts[(i + 1) % pts.length], L = abst(a, b) || 1, t = Math.max(0, Math.min(1, ((uv[0] - a[0]) * (b[0] - a[0]) + (uv[1] - a[1]) * (b[1] - a[1])) / (L * L)));
    const dd = abst(uv, [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]);
    if (dd < dmin) { dmin = dd; links = (b[0] - a[0]) * (uv[1] - a[1]) - (b[1] - a[1]) * (uv[0] - a[0]) > 0; }
  });
  let dLinks;
  if (zu) { const aussen = mitSeite(innen(uv, pts) ? -dmin : dmin); dLinks = flaeche(pts) > 0 ? -aussen : aussen; } // links eines Zugs gegen den Uhrzeiger ist innen
  else dLinks = mitSeite(links ? dmin : -dmin);
  if (!dLinks) return null;
  // Abrundungen bleiben konzentrisch: auf der Innenseite einer Ecke kleiner, aussen grösser (wie in Fusion)
  const radien = {};
  for (const [i, R] of Object.entries(q.radien || {})) { const r = R - dLinks * Math.sign(drehung(pts, +i)); if (r > 1e-6) radien[i] = r; }
  return neu({ art: "linie", pts: versatzPolylinie(pts, dLinks, zu), geschlossen: zu, ...(Object.keys(radien).length ? { radien } : {}) });
}
function versatzKlick(uv, sm) {
  const s = skizze;
  if (!s.quelle) {
    const t = trefferElement(sm);
    if (t && t.art !== "punkt") { s.quelle = t; status("Seite zeigen und klicken – oder Abstand eintippen und Enter."); }
    return;
  }
  const v = versatzVorschau(uv); if (v) s.f.elemente.push(v);
  s.quelle = null; status("Versetzt. Nächstes Element anklicken.");
}
function trefferStrecke(sm) {
  let best = null, bd = 10;
  for (const el of skizze.f.elemente) for (const [a, b] of elementKanten(el)) { const d = abstandStrecke(sm, bildschirm(a), bildschirm(b)); if (d < bd) { bd = d; best = [a, b]; } }
  return best;
}
function spiegelnKlick(sm) {
  const s = skizze;
  if (!s.quelle) { const t = trefferElement(sm); if (t) { s.quelle = t; status("Jetzt die Spiegellinie anklicken (gerade Kante, gern eine Hilfslinie)."); } return; }
  const achse = trefferStrecke(sm); if (!achse) return status("Gerade Kante als Spiegellinie anklicken.");
  const sp = (p) => spiegelPunkt(p, achse[0], achse[1]), q = s.quelle;
  const neu = { linie: () => ({ art: "linie", pts: q.pts.map(sp), geschlossen: q.geschlossen, ...(q.radien ? { radien: { ...q.radien } } : {}) }),
    rechteck: () => ({ art: "linie", pts: elementPunkte(q).map(sp), geschlossen: true }), kreis: () => ({ art: "kreis", c: sp(q.c), r: q.r }),
    bogen: () => ({ art: "bogen", a: sp(q.a), b: sp(q.b), m: sp(q.m) }), spline: () => ({ art: "spline", pts: q.pts.map(sp), geschlossen: q.geschlossen }), ellipse: () => ({ art: "ellipse", c: sp(q.c), a: sp(q.a), r2: q.r2 }), langloch: () => ({ art: "langloch", a: sp(q.a), b: sp(q.b), r: q.r }), punkt: () => ({ art: "punkt", p: sp(q.p) }), text: () => ({ art: "text", p: sp(q.p), text: q.text, hoehe: q.hoehe, winkel: q.winkel }) }[q.art]();
  if (q.hilfs) neu.hilfs = true;
  s.f.elemente.push(neu); s.quelle = null; status("Gespiegelt. Nächstes Element anklicken.");
}
// Alle Kanten anderer Elemente als feine Strecken (Schneidkanten fürs Stutzen)
const schneidKanten = (ausser) => skizze.f.elemente.filter((el) => el !== ausser).flatMap((el) => elGeo(el).linien.flatMap((pts) => pts.slice(1).map((q, i) => [pts[i], q])));
function stutzen(uv, sm) {
  const t = trefferElement(sm); if (!t) return status("Teilstück anklicken.");
  if (t.art === "linie" || t.art === "rechteck") stutzeLinie(zuLinienzug(t), sm);
  else if (t.art === "kreis" || t.art === "bogen") stutzeBogen(t, uv);
  else status("Dieses Element lässt sich nicht stutzen – mit Entf löschen.");
}
function stutzeLinie(el, sm) {
  const pts = el.pts, n = pts.length, zu = !!el.geschlossen, kanten = zu ? n : n - 1;
  let j = -1, tc = 0, bd = 12;
  for (let i = 0; i < kanten; i++) {
    const A = bildschirm(pts[i]), B = bildschirm(pts[(i + 1) % n]), d = abstandStrecke(sm, A, B);
    if (d < bd) { bd = d; j = i; const dx = B[0] - A[0], dy = B[1] - A[1]; tc = Math.max(0, Math.min(1, ((sm[0] - A[0]) * dx + (sm[1] - A[1]) * dy) / (dx * dx + dy * dy || 1))); }
  }
  if (j < 0) return;
  const p = pts[j], q = pts[(j + 1) % n], ts = [];
  const nimm = (t) => { if (t != null && t > 1e-6 && t < 1 - 1e-6) ts.push(t); };
  for (const [a, b] of schneidKanten(el)) nimm(schnittStrecken(p, q, a, b));
  for (let i = 0; i < kanten; i++) if (Math.abs(i - j) > 1 && !(zu && Math.abs(i - j) === kanten - 1)) nimm(schnittStrecken(p, q, pts[i], pts[(i + 1) % n]));
  ts.sort((a, b) => a - b);
  const t0 = [0, ...ts].filter((t) => t <= tc).at(-1), t1 = [...ts, 1].find((t) => t >= tc);
  const P = (t) => [p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t];
  const knoten = pts.map((x, i) => ({ p: x, r: el.radien?.[i] }));
  const teile = zu ? [[...(t1 < 1 ? [{ p: P(t1) }] : []), ...knoten.slice(j + 1), ...knoten.slice(0, j + 1), ...(t0 > 0 ? [{ p: P(t0) }] : [])]]
    : [[...knoten.slice(0, j + 1), ...(t0 > 0 ? [{ p: P(t0) }] : [])], [...(t1 < 1 ? [{ p: P(t1) }] : []), ...knoten.slice(j + 1)]];
  const neu = teile.filter((k) => k.length >= 2).map((k) => {
    const radien = {}; k.forEach((x, i) => { if (x.r > 0 && i > 0 && i < k.length - 1) radien[i] = x.r; });
    return { art: "linie", pts: k.map((x) => x.p), geschlossen: false, ...(Object.keys(radien).length ? { radien } : {}), ...(el.hilfs ? { hilfs: true } : {}) };
  });
  skizze.f.elemente.splice(skizze.f.elemente.indexOf(el), 1, ...neu);
  status(ts.length ? "Teilstück entfernt." : "Kante ohne Schnittpunkt – ganz entfernt.");
}
function stutzeBogen(el, uv) {
  const kreis = el.art === "kreis", bd = kreis ? { c: el.c, r: el.r, start: 0, sweep: 2 * Math.PI } : bogenDaten(el);
  if (!bd) return;
  const sg = Math.sign(bd.sweep), voll = Math.abs(bd.sweep), z = 2 * Math.PI;
  const lage = (p) => (((Math.atan2(p[1] - bd.c[1], p[0] - bd.c[0]) - bd.start) * sg) % z + z) % z; // 0 … 2π ab Start in Laufrichtung
  const punktBei = (u) => [bd.c[0] + bd.r * Math.cos(bd.start + sg * u), bd.c[1] + bd.r * Math.sin(bd.start + sg * u)];
  const us = [];
  for (const [a, b] of schneidKanten(el)) for (const t of schnittStreckeKreis(a, b, bd.c, bd.r)) { const u = lage([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]); if (kreis || (u > 1e-6 && u < voll - 1e-6)) us.push(u); } // beim Kreis zählt jeder Winkel
  us.sort((a, b) => a - b);
  const um = lage(uv), liste = skizze.f.elemente, idx = liste.indexOf(el);
  if (kreis) {
    if (us.length < 2) { liste.splice(idx, 1); return status("Kreis ohne zwei Schnittpunkte – ganz entfernt."); }
    const i = us.findIndex((u) => u > um), u1 = us[(i < 0 ? 0 : i)], u0 = us[(i <= 0 ? us.length : i) - 1]; // Lücke u0 … u1 um die Klickstelle
    const rest = ((u0 - u1) % z + z) % z || z; // verbleibender Bogen von u1 bis u0
    liste.splice(idx, 1, { art: "bogen", a: punktBei(u1), b: punktBei(u1 + rest), m: punktBei(u1 + rest / 2), ...(el.hilfs ? { hilfs: true } : {}) });
  } else {
    const u0 = [0, ...us].filter((u) => u <= um).at(-1), u1 = [...us, voll].find((u) => u >= um);
    const neu = [[0, u0], [u1, voll]].filter(([x, y]) => y - x > 1e-6).map(([x, y]) => ({ art: "bogen", a: punktBei(x), b: punktBei(y), m: punktBei((x + y) / 2), ...(el.hilfs ? { hilfs: true } : {}) }));
    liste.splice(idx, 1, ...neu);
  }
  status("Teilstück entfernt.");
}
// ------------------------------------------------------------ Dehnen, Trennen, Verschieben/Kopieren/Drehen, Muster, Projizieren
const REF_FELDER = ["a", "b", "p", "n", "l", "l1", "l2", "k", "k1", "k2"];
const refsVon = (b) => [...REF_FELDER.filter((k) => b[k]).map((k) => b[k]), ...(b.typ === "fix" && b.e != null ? [{ e: b.e }] : [])];
// Nach Verschieben ungültig: Bezug auf Ursprung oder Lage zu den Achsen; nach Drehen auch Richtungen (H/V, Achsen)
const lageGebunden = (b, drehen) => (drehen && ["horizontal", "vertikal", "abstandH", "abstandV"].includes(b.typ))
  || refsVon(b).some((r) => r.e === "O" || ((r.e === "X" || r.e === "Y") && (drehen || !["parallel", "senkrecht", "winkel"].includes(b.typ))));
function transformiere(el, fn) {
  if (el.pts) el.pts = el.pts.map(fn);
  for (const k of ["c", "a", "b", "m", "p"]) if (el[k]) el[k] = fn(el[k]);
}
// Elemente bewegen (kopie: neue Elemente samt ihren inneren Abhängigkeiten); Abhängigkeiten nach aussen fallen weg
function bewege(els, fn, { kopie = false, drehen = false } = {}) {
  const f = skizze.f, ids = new Set(els.map((el) => el.id));
  const innen = (b) => refsVon(b).every((r) => ids.has(r.e) || ["X", "Y", "O"].includes(r.e)) && !lageGebunden(b, drehen);
  if (!kopie) {
    f.bedingungen = f.bedingungen.filter((b) => !refsVon(b).some((r) => ids.has(r.e)) || innen(b));
    els.forEach((el) => transformiere(el, fn)); loeseSkizze(f);
    return els;
  }
  const neu = els.map((el) => { const c = JSON.parse(JSON.stringify(el)); transformiere(c, fn); c.id = neueElementId(f); delete c.projiziert; return c; });
  const map = new Map(els.map((el, i) => [el.id, neu[i].id]));
  for (const b of f.bedingungen.filter((b) => refsVon(b).some((r) => ids.has(r.e)) && innen(b))) {
    const c = JSON.parse(JSON.stringify(b));
    for (const k of REF_FELDER) if (c[k] && map.has(c[k].e)) c[k].e = map.get(c[k].e);
    if (c.typ === "fix" && map.has(c.e)) c.e = map.get(c.e);
    f.bedingungen.push(c);
  }
  f.elemente.push(...neu);
  return neu;
}
const dreher = (c, w) => (p) => { const dx = p[0] - c[0], dy = p[1] - c[1], co = Math.cos(w), si = Math.sin(w); return [c[0] + dx * co - dy * si, c[1] + dx * si + dy * co]; };
const fertigMehr = (t) => { const s = skizze; if (s.werkzeug !== "kopieren") s.mehr = new Set(); s.basis = s.basis2 = null; status(t); zeichneLive(); };
function verschiebeUm(d) {
  const s = skizze, kopie = s.werkzeug === "kopieren";
  const neu = bewege([...s.mehr], (p) => [p[0] + d[0], p[1] + d[1]], { kopie });
  if (kopie) s.mehr = new Set(neu);
  fertigMehr(`${kopie ? "Kopiert" : "Verschoben"} um ${f1(d[0])} / ${f1(d[1])} mm.`);
}
function dreheUm(w) { bewege([...skizze.mehr], dreher(skizze.basis, w), { drehen: true }); fertigMehr(`Gedreht um ${grad(w)}.`); }
// Mehrfachauswahl: Elemente anklicken; Klick auf Punkt oder freie Stelle setzt Basis-/Drehpunkt bzw. Mittelpunkt
function mehrfachKlick(uv, sm, fang) {
  const s = skizze, w = s.werkzeug, el = !s.basis && (!fang || !s.mehr.size) && trefferElement(sm); // ohne Auswahl wählt auch ein Klick auf einen Punkt das Element
  if (el) { if (s.mehr.has(el)) s.mehr.delete(el); else s.mehr.add(el); return status(`${s.mehr.size} Element${s.mehr.size === 1 ? "" : "e"} gewählt. ` + WERKZEUGE[w].text.split(": ")[1]); }
  if (!s.mehr.size) return status("Zuerst die Elemente anklicken.");
  if (w === "musterR") return musterDialog();
  if (!s.basis) { s.basis = uv.slice(); return status({ verschieben: "Zielpunkt anklicken – oder dx/dy eintippen.", kopieren: "Zielpunkt anklicken – oder dx/dy eintippen.", drehen: "Winkel eintippen und Enter – oder Bezugsrichtung anklicken.", musterK: "" }[w] || ""), w === "musterK" && musterDialog(); }
  if (w === "verschieben" || w === "kopieren") return verschiebeUm([uv[0] - s.basis[0], uv[1] - s.basis[1]]);
  if (w === "drehen") {
    if (!s.basis2) { s.basis2 = uv.slice(); return status("Zielrichtung anklicken."); }
    const wi = (q) => Math.atan2(q[1] - s.basis[1], q[0] - s.basis[0]);
    return dreheUm(wi(uv) - wi(s.basis2));
  }
}
function musterDialog() {
  const s = skizze, rund = s.werkzeug === "musterR", els = [...s.mehr];
  if (!rund && !s.basis) return status("Mittelpunkt des Musters anklicken.");
  if (dlg) $("dAbbrechen").click();
  dialog({ titel: rund ? "Rechteckiges Muster" : "Kreisförmiges Muster",
    felder: rund ? [{ id: "nx", label: "Anzahl in X", wert: 3 }, { id: "dx", label: "Abstand X", einheit: "mm", wert: 50 }, { id: "ny", label: "Anzahl in Y", wert: 1 }, { id: "dy", label: "Abstand Y", einheit: "mm", wert: 50 }]
      : [{ id: "n", label: "Anzahl", wert: 6 }, { id: "w", label: "Gesamtwinkel", einheit: "°", wert: 360 }],
    hinweis: rund ? "Abstände von Element zu Element, negativ = in Gegenrichtung (Skizzenachsen)." : "360° verteilt gleichmässig rundum; sonst vom ersten bis zum letzten Element.",
    ok: (v) => {
      let n = 0;
      if (rund) {
        for (let i = 0; i < Math.max(1, Math.round(v.nx)); i++) for (let j = 0; j < Math.max(1, Math.round(v.ny)); j++) if (i || j) { bewege(els, (p) => [p[0] + i * (v.dx || 0), p[1] + j * (v.dy || 0)], { kopie: true }); n++; }
      } else {
        const k = Math.max(2, Math.round(v.n)), voll = Math.abs(Math.abs(v.w) - 360) < 1e-6, schritt = (v.w * RAD) / (voll ? k : k - 1);
        for (let i = 1; i < k; i++) { bewege(els, dreher(s.basis, schritt * i), { kopie: true, drehen: true }); n++; }
      }
      fertigMehr(`Muster: ${n} Kopie${n === 1 ? "" : "n"} erstellt.`);
    },
    abbrechen: () => { s.basis = null; zeichneLive(); } });
}
// Dehnen: Endkante einer Linie bis zur nächsten Kante in Verlängerung
function aufBogen(bd, p) { const z = 2 * Math.PI, u = (((Math.atan2(p[1] - bd.c[1], p[0] - bd.c[0]) - bd.start) * Math.sign(bd.sweep)) % z + z) % z; return u <= Math.abs(bd.sweep) + 1e-9; }
function dehnen(uv, sm) {
  const t = waehleGeo(sm, new Set(["L"])), f = skizze.f;
  const el = t && f.elemente.find((x) => x.id === t.ref.e);
  if (!el) return status("Linie nahe dem Ende anklicken.");
  if (el.geschlossen) return status("Ein geschlossener Linienzug hat kein Ende zum Dehnen.");
  const n = el.pts.length, k = t.ref.s, amEnde = k === n - 2 && (k !== 0 || abst(uv, el.pts[n - 1]) < abst(uv, el.pts[0]));
  if (k !== 0 && !amEnde) return status("Nur die erste oder letzte Kante eines Linienzugs lässt sich dehnen.");
  const i = amEnde ? n - 1 : 0, E = el.pts[i], Q = el.pts[amEnde ? n - 2 : 1], L = abst(Q, E) || 1, d = [(E[0] - Q[0]) / L, (E[1] - Q[1]) / L], W = 1e5;
  const weit = [E[0] + d[0] * W, E[1] + d[1] * W];
  let best = Infinity;
  const nimm = (tt) => { if (tt != null && tt * W > 1e-6 && tt * W < best) best = tt * W; };
  for (const x of f.elemente) {
    if (x.art === "kreis") { schnittStreckeKreis(E, weit, x.c, x.r).forEach(nimm); continue; }
    if (x.art === "bogen") { const bd = bogenDaten(x); if (bd) schnittStreckeKreis(E, weit, bd.c, bd.r).filter((tt) => aufBogen(bd, [E[0] + d[0] * W * tt, E[1] + d[1] * W * tt])).forEach(nimm); continue; }
    for (const pts of elGeo(x).linien) for (let j = 1; j < pts.length; j++) if (x !== el || (j - 1 !== k)) nimm(schnittStrecken(E, weit, pts[j - 1], pts[j]));
  }
  if (!Number.isFinite(best)) return status("In Verlängerung liegt keine Kante.");
  f.bedingungen = f.bedingungen.filter((b) => !refsVon(b).some((r) => r.e === el.id && r.k === "p" + i)); // Ende wird frei
  el.pts[i] = [E[0] + d[0] * best, E[1] + d[1] * best];
  loeseSkizze(f); status(`Gedehnt um ${f1(best)} mm.`);
}
// Trennen: an allen Schnittpunkten der angeklickten Kante bzw. des Kreises/Bogens; Stücke bleiben koinzident
function trennen(uv, sm) {
  const t = trefferElement(sm); if (!t) return status("Linie, Kreis oder Bogen anklicken.");
  const f = skizze.f, idx = f.elemente.indexOf(t), mit = (x) => ({ ...x, ...(t.hilfs ? { hilfs: true } : {}) });
  let teile, fuge; // fuge: Paare [i, "b"|"pN", j, "a"|"p0"] koinzident
  if (t.art === "linie") {
    const pts = t.pts, n = pts.length, zu = !!t.geschlossen, kanten = zu ? n : n - 1;
    let j = -1, tc = 0, bd = 12;
    for (let i = 0; i < kanten; i++) {
      const A = bildschirm(pts[i]), B = bildschirm(pts[(i + 1) % n]), d = abstandStrecke(sm, A, B);
      if (d < bd) { bd = d; j = i; const dx = B[0] - A[0], dy = B[1] - A[1]; tc = Math.max(0, Math.min(1, ((sm[0] - A[0]) * dx + (sm[1] - A[1]) * dy) / (dx * dx + dy * dy || 1))); }
    }
    if (j < 0) return;
    const p = pts[j], q = pts[(j + 1) % n], ts = [];
    for (const [a, b] of schneidKanten(t)) { const x = schnittStrecken(p, q, a, b); if (x != null && x > 1e-6 && x < 1 - 1e-6) ts.push(x); }
    if (!ts.length) ts.push(tc);
    ts.sort((a, b) => a - b);
    const P = (x) => [p[0] + (q[0] - p[0]) * x, p[1] + (q[1] - p[1]) * x], kn = pts.map((x, i) => ({ p: x, r: t.radien?.[i] }));
    const zuege = ts.slice(1).map((x, i) => [{ p: P(ts[i]) }, { p: P(x) }]);
    if (zu) zuege.unshift([{ p: P(ts.at(-1)) }, ...kn.slice(j + 1), ...kn.slice(0, j + 1), { p: P(ts[0]) }]);
    else { zuege.unshift([...kn.slice(0, j + 1), { p: P(ts[0]) }]); zuege.push([{ p: P(ts.at(-1)) }, ...kn.slice(j + 1)]); }
    teile = zuege.map((k) => { const radien = {}; k.forEach((x, i) => { if (x.r > 0 && i > 0 && i < k.length - 1) radien[i] = x.r; }); return mit({ art: "linie", pts: k.map((x) => x.p), geschlossen: false, ...(Object.keys(radien).length ? { radien } : {}) }); });
    if (zu) teile.push(teile.shift()); // Reihenfolge entlang der Kante: … letztes Stück schliesst an das erste an
    fuge = teile.slice(0, -1).map((x, i) => [i, "p" + (x.pts.length - 1), i + 1, "p0"]);
    if (zu) fuge.push([teile.length - 1, "p" + (teile.at(-1).pts.length - 1), 0, "p0"]);
  } else if (t.art === "kreis" || t.art === "bogen") {
    const kreis = t.art === "kreis", bd = kreis ? { c: t.c, r: t.r, start: 0, sweep: 2 * Math.PI } : bogenDaten(t); if (!bd) return;
    const sg = Math.sign(bd.sweep), voll = Math.abs(bd.sweep), z = 2 * Math.PI;
    const lage = (q) => (((Math.atan2(q[1] - bd.c[1], q[0] - bd.c[0]) - bd.start) * sg) % z + z) % z, bei = (u) => [bd.c[0] + bd.r * Math.cos(bd.start + sg * u), bd.c[1] + bd.r * Math.sin(bd.start + sg * u)];
    let us = [];
    for (const [a, b] of schneidKanten(t)) for (const x of schnittStreckeKreis(a, b, bd.c, bd.r)) { const u = lage([a[0] + (b[0] - a[0]) * x, a[1] + (b[1] - a[1]) * x]); if (u > 1e-6 && u < voll - 1e-6) us.push(u); }
    us = [...new Set(us.map((u) => +u.toFixed(9)))].sort((a, b) => a - b);
    if (kreis && us.length < 2) return status("Ein Kreis braucht zwei Schnittpunkte zum Trennen.");
    if (!us.length) us = [lage(uv)];
    const grenzen = kreis ? [...us, us[0] + z] : [0, ...us, voll];
    teile = grenzen.slice(1).map((y, i) => { const x = grenzen[i]; return mit({ art: "bogen", a: bei(x), b: bei(y), m: bei((x + y) / 2) }); });
    fuge = teile.slice(0, -1).map((_, i) => [i, "b", i + 1, "a"]);
    if (kreis) fuge.push([teile.length - 1, "b", 0, "a"]);
  } else return status("Dieses Element lässt sich nicht trennen.");
  teile.forEach((x) => (x.id = neueElementId(f)));
  f.elemente.splice(idx, 1, ...teile);
  for (const [i, ka, j, kb] of fuge) f.bedingungen.push({ typ: "koinzident", a: { e: teile[i].id, k: ka }, b: { e: teile[j].id, k: kb } });
  status(`In ${teile.length} Stücke getrennt.`);
}
// Projizieren: Körperkanten, Körperflächen (Umriss) oder Linien früherer Skizzen auf die Skizzenebene – fixiert
let umschaltAn = false; addEventListener("keydown", (e) => { if (e.key === "Shift") umschaltAn = true; }); addEventListener("keyup", (e) => { if (e.key === "Shift") umschaltAn = false; }); addEventListener("blur", () => { umschaltAn = false; });
// Randkanten der angeklickten ebenen Körperfläche (zusammenhängende koplanare Dreiecke), Weltkoordinaten
function flaechenRand(hit) {
  const pos = flaechenRegion(hit).attributes.position, n0 = hit.face.normal.clone().transformDirection(hit.object.matrixWorld), kanten = new Map();
  const K = (v) => `${Math.round(v.x * 100)},${Math.round(v.y * 100)},${Math.round(v.z * 100)}`;
  for (let i = 0; i + 2 < pos.count; i += 3) for (let k = 0; k < 3; k++) {
    const a = new THREE.Vector3().fromBufferAttribute(pos, i + k), b = new THREE.Vector3().fromBufferAttribute(pos, i + ((k + 1) % 3)), ka = K(a), kb = K(b), key = ka < kb ? ka + "|" + kb : kb + "|" + ka, e = kanten.get(key);
    if (e) e.n++; else kanten.set(key, { a, b, n: 1 });
  }
  return [...kanten.values()].filter((e) => e.n === 1).map((e) => [e.a.addScaledVector(n0, -0.04).toArray(), e.b.addScaledVector(n0, -0.04).toArray()]);
}
// Linienzug an scharfen Ecken (> 25°) in einzelne Elemente teilen; glatte Folgen (Kreisbogen aus Streckenzug) bleiben ein Element, Geraden werden auf die Endpunkte gekürzt
function teileAnEcken(pts, zu) {
  const n = pts.length; if (n < 2) return [];
  const P = zu && gleich(pts[0], pts.at(-1)) ? pts.slice(0, -1) : pts.slice(), m = P.length;
  const winkel = (i) => { const a = P[(i + m - 1) % m], b = P[i], c = P[(i + 1) % m], u = [b[0] - a[0], b[1] - a[1]], v = [c[0] - b[0], c[1] - b[1]]; return Math.abs(Math.atan2(u[0] * v[1] - u[1] * v[0], u[0] * v[0] + u[1] * v[1])) * 180 / Math.PI; };
  const ecke = P.map((_, i) => (zu || (i > 0 && i < m - 1)) && winkel(i) > 25);
  const gerade = (l) => l.length > 2 && l.every((q, i) => i === 0 || i === l.length - 1 || Math.abs((q[0] - l[0][0]) * (l.at(-1)[1] - l[0][1]) - (q[1] - l[0][1]) * (l.at(-1)[0] - l[0][0])) < 1e-6 * (abst(l[0], l.at(-1)) || 1));
  const kurz = (l) => (gerade(l) ? [l[0], l.at(-1)] : l);
  if (zu && !ecke.some(Boolean)) return [{ pts: P, zu: true }];
  const start = zu ? ecke.indexOf(true) : 0, ordnung = zu ? [...P.slice(start), ...P.slice(0, start), P[start]] : P, eOrd = zu ? [...ecke.slice(start), ...ecke.slice(0, start), true] : ecke, out = [];
  let akt = [ordnung[0]];
  for (let i = 1; i < ordnung.length; i++) { akt.push(ordnung[i]); if (eOrd[i] && i < ordnung.length - 1 || i === ordnung.length - 1) { out.push({ pts: kurz(akt), zu: false }); akt = [ordnung[i]]; } }
  return out.filter((o) => o.pts.length >= 2);
}
// ---- Projizieren: Kanten, Flächen und Skizzenlinien wählen (leuchten blau); erst «OK» (Enter) projiziert ----
const projGruppe = new THREE.Group(); szene.add(projGruppe);
const projLinienSchluessel = (pts) => pts.map((q) => q.map((v) => Math.round(v * 10)).join(",")).join(">");
function projKandidat(sm) {
  const f = skizze.f, kand = [];
  for (const [a, b] of koerperKanten()) kand.push({ typ: "kante", key: "k:" + [projLinienSchluessel([a]), projLinienSchluessel([b])].sort().join("|"), zug: [a, b], zu: false, vis: [[a, b]], a, b });
  for (const sk of vorher(f).filter((x) => x.typ === "skizze" && ebene(x.ebene))) for (const el of sk.elemente) {
    if (el.art === "linie" || el.art === "rechteck") { // jede Kante einzeln
      elementKanten(el).forEach(([a, b], n) => { const A = zuWelt(E_(sk.ebene), a), B = zuWelt(E_(sk.ebene), b); kand.push({ typ: "skel", key: `s:${sk.id}:${el.id}:${n}`, sk, el, zug: [A, B], zu: false, vis: [[A, B]], a: A, b: B }); });
      continue;
    }
    for (const pts of elGeo(el).linien) { const w = pts.map((q) => zuWelt(E_(sk.ebene), q)), zu = !!elGeo(el).kontur; for (let n = 1; n < w.length; n++) kand.push({ typ: "skel", key: `s:${sk.id}:${el.id}`, sk, el, zug: w, zu, vis: [w], a: w[n - 1], b: w[n] }); }
  }
  let best = null, bd = e_projRadius();
  for (const k of kand) { const A = aufSchirm(k.a), B = aufSchirm(k.b); if (A[2] < 1 && B[2] < 1) { const d = abstandStrecke(sm, A, B); if (d < bd) { bd = d; best = k; } } }
  if (best && umschaltAn && best.sk) { // Umschalt: die ganze Skizze
    const vis = best.sk.elemente.filter((el) => !el.hilfs && el.art !== "punkt").flatMap((el) => elGeo(el).linien.map((pts) => pts.map((q) => zuWelt(E_(best.sk.ebene), q))));
    return { typ: "skizze", key: "S:" + best.sk.id, sk: best.sk, vis };
  }
  if (best) return best;
  const r = leinwand.getBoundingClientRect();
  strahl.setFromCamera(new THREE.Vector2((sm[0] / r.width) * 2 - 1, -(sm[1] / r.height) * 2 + 1), kamera);
  const hit = strahl.intersectObjects(modell.children.filter((o) => o.isMesh), false)[0]; if (!hit) return null;
  const rand = flaechenRand(hit); if (!rand.length) return null;
  return { typ: "flaeche", key: "F:" + projLinienSchluessel(rand.flat().slice(0, 6)) + ":" + rand.length, rand, vis: rand };
}
const e_projRadius = () => (leinwandTouch ? 30 : 12);
function projZeichnen() {
  leeren(projGruppe); if (!skizze) return;
  const dist = kamera.position.distanceTo(steuerung.target), hoehe = 2 * dist * Math.tan(kamera.fov * Math.PI / 360), r = Math.max(0.2, hoehe / 380);
  const zeige = (item, farbe, dick) => { for (const pts of item.vis) if (pts.length > 1) projGruppe.add(dickeLinie(pts.map((p) => V(p)), farbe, dick, 15)); };
  if (skizze.projHover && !(skizze.projWahl || []).some((x) => x.key === skizze.projHover.key)) zeige(skizze.projHover, 0x4da3ff, 5); // Linie unter Stift/Zeiger leuchtet kräftig
  for (const it of skizze.projWahl || []) zeige(it, 0x1d8fff, 3);
}
let projHoverWartet = false, leinwandTouch = false;
leinwand.addEventListener("pointerdown", (e) => { leinwandTouch = e.pointerType === "touch"; }, true);
function projHover(e) {
  if (projHoverWartet) return; projHoverWartet = true; const sm = smPos(e);
  requestAnimationFrame(() => { projHoverWartet = false; if (!skizze || skizze.werkzeug !== "projizieren") return; const k = projKandidat(sm); if ((k?.key || null) !== (skizze.projHover?.key || null)) { skizze.projHover = k; projZeichnen(); } });
}
function projBarZeigen() {
  const an = !!skizze && skizze.werkzeug === "projizieren", n = skizze?.projWahl?.length || 0; $("projBar").hidden = !an; if (!an) return;
  $("pbText").textContent = n ? `${n} gewählt – «OK» (Enter) projiziert, nochmals anklicken hebt die Wahl auf. Umschalt + Klick: ganze Skizze.` : "Kanten, Flächen oder Skizzenlinien anklicken (sie leuchten blau).";
  $("pbOk").disabled = !n; $("pbOk").textContent = n ? `OK (${n})` : "OK";
}
function projWahlLeeren() { if (skizze) { skizze.projWahl = []; skizze.projHover = null; } leeren(projGruppe); projBarZeigen(); }
function projizieren(sm) { // Klick: Element wählen bzw. abwählen
  const k = projKandidat(sm); if (!k) return status("Körperkante, Körperfläche oder Linie einer anderen Skizze anklicken.");
  skizze.projWahl ||= []; const i = skizze.projWahl.findIndex((x) => x.key === k.key); if (i >= 0) skizze.projWahl.splice(i, 1); else skizze.projWahl.push(k);
  projZeichnen(); projBarZeigen();
}
function projizierenBestaetigen() {
  const items = skizze?.projWahl || []; if (!items.length) return;
  const f = skizze.f, E = E_(f.ebene), auf = (w) => zuLokal(E, w); let zuege = [], exakt = []; const gesehen = new Set();
  const parallel = (sk) => Math.abs(V(E_(sk.ebene).n).dot(V(E.n))) > 0.99999;
  const exaktes = (sk, el) => { if (!parallel(sk) || (el.art !== "kreis" && el.art !== "bogen")) return null; const Es = E_(sk.ebene), P = (q) => auf(zuWelt(Es, q)); return el.art === "kreis" ? { art: "kreis", c: P(el.c), r: el.r } : { art: "bogen", a: P(el.a), b: P(el.b), m: P(el.m) }; };
  for (const it of items) {
    if (it.typ === "kante") zuege.push({ pts: [auf(it.a), auf(it.b)], zu: false });
    else if (it.typ === "skel") { if (gesehen.has(it.key)) continue; gesehen.add(it.key); const e = exaktes(it.sk, it.el); if (e) exakt.push(e); else zuege.push({ pts: it.zug.map(auf), zu: it.zu }); }
    else if (it.typ === "skizze") { for (const el of it.sk.elemente) { if (el.hilfs || el.art === "punkt") continue; const e = exaktes(it.sk, el); if (e) { exakt.push(e); continue; } for (const pts of elGeo(el).linien) zuege.push({ pts: pts.map((q) => auf(zuWelt(E_(it.sk.ebene), q))), zu: !!elGeo(el).kontur }); } }
    else if (it.typ === "flaeche") { const stuecke = it.rand.map(([a, b]) => ({ pts: [auf(a), auf(b)] })); zuege.push(...verbindeStuecke(stuecke).flatMap((z) => teileAnEcken(z.pts, z.geschlossen))); }
  }
  const neu = [];
  for (const e of exakt) { const el = { ...e, projiziert: true, id: neueElementId(f) }; f.elemente.push(el); f.bedingungen.push({ typ: "fix", e: el.id }); neu.push(el); }
  for (const z of zuege) {
    const pts = z.pts.filter((q, i) => !i || abst(q, z.pts[i - 1]) > 1e-6);
    if (z.zu && pts.length > 2 && gleich(pts[0], pts.at(-1))) pts.pop();
    if (pts.length < 2 || pts.every((q) => abst(q, pts[0]) < 1e-6)) continue;
    const el = { art: "linie", pts, geschlossen: !!z.zu && pts.length > 2, projiziert: true, id: neueElementId(f) };
    f.elemente.push(el); f.bedingungen.push({ typ: "fix", e: el.id }); neu.push(el);
  }
  skizze.projNeu = neu; // X macht das zuletzt Projizierte zur Hilfslinie
  projWahlLeeren(); sichereIds(f); bereinige(f); zeichneLive();
  status(neu.length ? `Projiziert: ${neu.length} Element${neu.length === 1 ? "" : "e"} (fixiert, X = Hilfslinie).` : "Die gewählten Kanten stehen senkrecht zur Skizzenebene – nichts zu projizieren.");
}
function abschliessenLinie() {
  if (skizze?.werkzeug === "linie" && skizze.pkt.length >= 2) erstelle([{ art: "linie", pts: skizze.pkt.slice(), geschlossen: false }], null, { hv: true });
  if (skizze?.werkzeug === "spline" && skizze.pkt.length >= 2) erstelle([{ art: "spline", pts: skizze.pkt.slice(), geschlossen: false }]);
  if (skizze) { skizze.pkt = []; skizze.fangRefs = []; }
  zeichneLive();
}
// Getippte Masse anwenden (Felder je Werkzeug und Schritt, siehe WERKZEUGE)
function eingabeAnwenden() {
  const s = skizze, w = s.werkzeug, P = s.pkt;
  const a = parseFloat($("eLaenge").value), b = parseFloat($("eWinkel").value), p = P.at(-1), m = s.maus || p;
  if (w === "abrunden") { if (a >= 0) { s.radius = a; status(a ? `Radius ${f1(a)} mm – jetzt Ecken anklicken.` : "Radius 0: angeklickte Ecken werden wieder scharf."); } return; }
  if (w === "versatz") { if (s.quelle && a > 0) { const v = versatzVorschau(m, a); if (v) s.f.elemente.push(v); s.quelle = null; status("Versetzt. Nächstes Element anklicken."); zeichneLive(); } return; }
  if ((w === "verschieben" || w === "kopieren") && s.mehr.size && (Number.isFinite(a) || Number.isFinite(b))) return verschiebeUm([a || 0, b || 0]);
  if (w === "drehen" && s.mehr.size && s.basis && Number.isFinite(a)) return dreheUm(a * RAD);
  if ((w === "musterR" || w === "musterK") && s.mehr.size) return musterDialog();
  if (w === "polygon" && b >= 3) s.ecken = Math.round(b);
  if (!P.length || !m) return zeichneLive();
  const richtung = Number.isFinite(b) && w === "linie" || (w === "rechteck3" && P.length === 1 && Number.isFinite(b)) ? (b * Math.PI) / 180 : Math.atan2(m[1] - p[1], m[0] - p[0]);
  const ziel = (L, wi = richtung) => [+(p[0] + L * Math.cos(wi)).toFixed(4), +(p[1] + L * Math.sin(wi)).toFixed(4)];
  const seite = (x, y) => (m[x] >= p[x] ? 1 : -1) * y;
  switch (w) {
    case "linie": if (a > 0) klick(ziel(a)); break;
    case "rechteck": if (a > 0 && b > 0) klick([p[0] + seite(0, a), p[1] + seite(1, b)]); break;
    case "rechteckM": if (a > 0 && b > 0) klick([p[0] + a / 2, p[1] + b / 2]); break;
    case "rechteck3":
      if (P.length === 1 && a > 0) klick(ziel(a));
      else if (P.length === 2 && a > 0) { // Höhe auf der Seite, auf der die Maus ist
        const [A, B] = P, L = abst(A, B) || 1, n = [-(B[1] - A[1]) / L, (B[0] - A[0]) / L], sg = (m[0] - B[0]) * n[0] + (m[1] - B[1]) * n[1] >= 0 ? 1 : -1;
        klick([B[0] + n[0] * a * sg, B[1] + n[1] * a * sg]);
      }
      break;
    case "kreis": if (a > 0) klick([p[0] + a / 2, p[1]]); break;
    case "kreis2": if (a > 0) klick(ziel(a)); break;
    case "bogenM":
      if (P.length === 1 && a > 0) klick(ziel(a));
      else if (P.length === 2 && Number.isFinite(a)) { const c = P[0], r = abst(c, P[1]), w0 = Math.atan2(P[1][1] - c[1], P[1][0] - c[0]) + (a * Math.PI) / 180; klick([c[0] + r * Math.cos(w0), c[1] + r * Math.sin(w0)]); }
      break;
    case "polygon": if (a > 0) klick(ziel(a)); break;
    case "ellipse":
      if (P.length === 1 && a > 0) klick(ziel(a));
      else if (P.length === 2 && a > 0) { erstelle([{ art: "ellipse", c: P[0], a: P[1], r2: a }]); s.pkt = []; $("eingabe").hidden = true; zeichneLive(); }
      break;
    case "langloch":
      if (P.length === 1 && a > 0) { klick(ziel(a)); if (b > 0) { erstelle([{ art: "langloch", a: s.pkt[0], b: s.pkt[1], r: b / 2 }]); s.pkt = []; $("eingabe").hidden = true; zeichneLive(); } }
      else if (P.length === 2 && a > 0) { erstelle([{ art: "langloch", a: P[0], b: P[1], r: a / 2 }]); s.pkt = []; $("eingabe").hidden = true; zeichneLive(); }
      break;
  }
}

// ------------------------------------------------------------ Bemassung und Auswahl
const gleich = (a, b) => Math.abs(a[0] - b[0]) < 1e-6 && Math.abs(a[1] - b[1]) < 1e-6;
const drehung = (pts, i) => { // vorzeichenbehafteter Knickwinkel am Punkt i (Grad)
  const n = pts.length, a = pts[(i - 1 + n) % n], b = pts[i], c = pts[(i + 1) % n];
  let d = Math.atan2(c[1] - b[1], c[0] - b[0]) - Math.atan2(b[1] - a[1], b[0] - a[0]);
  while (d > Math.PI) d -= 2 * Math.PI; while (d <= -Math.PI) d += 2 * Math.PI;
  return (d * 180) / Math.PI;
};
const RAD = Math.PI / 180;
const grad = (w) => (Math.abs(w) / RAD).toFixed(1).replace(/\.0$/, "") + "°";
const FG_ERKLAERUNG = "FG = Freiheitsgrade: so viele Masse bzw. Abhängigkeiten fehlen noch, bis die Skizze vollständig bestimmt ist (dann steht «bestimmt», grün). Blaue Linien sind noch beweglich.";
const fgText = (dof) => (dof ? `${dof} Freiheitsgrad${dof === 1 ? "" : "e"} offen` : "Skizze vollständig bestimmt");
// Abhängigkeit oder Mass übernehmen (der Löser prüft: lösbar und nicht überzählig)
function uebernimm(b) {
  const r = fuegeHinzu(skizze.f, b);
  status(r.ok ? `${ABH_NAME[b.typ] || "Mass"} gesetzt · ${fgText(r.dof)}` : GRUND[r.grund] || r.grund);
  zeichneLive(); return r.ok;
}
function entferneBed(b) {
  const f = skizze.f, i = f.bedingungen.indexOf(b); if (i < 0) return;
  f.bedingungen.splice(i, 1); skizze.bsel = null;
  status(`${ABH_NAME[b.typ] || "Mass"} entfernt.`); zeichneLive();
}
// Referenzmass anklicken und Wert eintippen → treibendes Mass (wie in Fusion); bestehendes treibendes Mass → neuer Wert
function massAendern(m, wert, ausdruck = null) {
  if (!Number.isFinite(wert) || wert <= 0) return status("Bitte einen Wert grösser als 0 eingeben.");
  if (m.bed) {
    const b = m.bed, alt = b.w;
    if (ausdruck) b.ausdruck = ausdruck; else delete b.ausdruck;
    if (b.typ === "knick" && wert >= 180) return status("Der Winkel muss kleiner als 180° sein.");
    b.w = b.typ === "knick" ? Math.sign(alt || 1) * (180 - wert) * RAD : b.typ === "winkel" ? Math.sign(alt || 1) * wert * RAD : wert;
    if (!loeseSkizze(skizze.f).ok) { b.w = alt; loeseSkizze(skizze.f); status(GRUND.widerspruch); }
    return zeichneLive();
  }
  const el = m.el, e = el.id;
  if (m.art === "radius") { el.radien = { ...el.radien, [m.i]: wert }; return zeichneLive(); } // Abrundung = Biegeradius, direkt
  const n = el.pts?.length, ring = (i) => "p" + ((i + n) % n);
  const b = { laenge: () => ({ typ: "abstand", a: { e, k: "p" + m.i }, b: { e, k: ring(m.i + 1) }, w: wert }),
    winkel: () => (wert >= 180 ? null : { typ: "knick", a: { e, k: ring(m.i - 1) }, p: { e, k: "p" + m.i }, n: { e, k: ring(m.i + 1) }, w: (drehung(el.pts, m.i) < 0 ? -1 : 1) * (180 - wert) * RAD }), // eingegeben wird der Innenwinkel
    durchmesser: () => ({ typ: "durchmesser", k: { e }, w: wert }), langB: () => ({ typ: "durchmesser", k: { e }, w: wert }),
    bogenR: () => ({ typ: "radius", k: { e }, w: wert }), langL: () => ({ typ: "abstand", a: { e, k: "a" }, b: { e, k: "b" }, w: wert }) }[m.art]?.();
  if (b && ausdruck) b.ausdruck = ausdruck;
  if (b) uebernimm(b);
}
// Bezüge → Koordinaten
function bezuege(f) {
  const pm = new Map(skizzenPunkte(f).map((q) => [q.e === "O" ? "O" : q.ref.e + ":" + q.ref.k, q.uv]));
  const els = new Map(f.elemente.map((el) => [el.id, el]));
  const P = (r) => r && pm.get(r.e === "O" ? "O" : r.e + ":" + r.k);
  const L = (r) => {
    if (r?.e === "X") return [[0, 0], [1, 0]]; if (r?.e === "Y") return [[0, 0], [0, 1]];
    const el = els.get(r?.e); return el?.art === "linie" && r.s < kantenZahl(el) ? [el.pts[r.s], el.pts[(r.s + 1) % el.pts.length]] : null;
  };
  const K = (r) => {
    const el = els.get(r?.e); if (!el) return null;
    if (el.art === "kreis") return { el, c: el.c, r: el.r, anker: [el.c[0] + el.r * Math.SQRT1_2, el.c[1] + el.r * Math.SQRT1_2] };
    if (el.art === "bogen") { const d = bogenDaten(el); return d && { el, c: d.c, r: d.r, anker: el.m }; }
    if (el.art === "langloch") return { el, c: [(el.a[0] + el.b[0]) / 2, (el.a[1] + el.b[1]) / 2], r: el.r, anker: el.b };
    return null;
  };
  return { P, L, K, els };
}
const projektion = (p, [a, b]) => { const d = [b[0] - a[0], b[1] - a[1]], t = ((p[0] - a[0]) * d[0] + (p[1] - a[1]) * d[1]) / (d[0] * d[0] + d[1] * d[1] || 1); return [a[0] + d[0] * t, a[1] + d[1] * t]; };
const mitte = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
// Geometrie unter dem Mauszeiger für Abhängigkeiten/Bemassung: arten ⊂ {P, L, K}; Punkte haben Vorrang
function waehleGeo(sm, arten, schon = []) {
  const gewaehlt = (ref) => schon.some((p) => JSON.stringify(p.ref) === JSON.stringify(ref));
  const d2 = (uv) => { const q = bildschirm(uv); return Math.hypot(q[0] - sm[0], q[1] - sm[1]); };
  if (arten.has("P")) {
    let best = null, bd = 11;
    for (const q of skizzenPunkte(skizze.f)) { const d = d2(q.uv); if (d < bd && !gewaehlt(q.ref)) { bd = d; best = { art: "P", ref: q.ref, uv: q.uv }; } }
    if (best) return best;
  }
  let best = null, bd = 9;
  for (const el of skizze.f.elemente) {
    if (arten.has("L") && el.art === "linie") for (let k = 0; k < kantenZahl(el); k++) {
      const d = abstandStrecke(sm, bildschirm(el.pts[k]), bildschirm(el.pts[(k + 1) % el.pts.length]));
      if (d < bd && !gewaehlt({ e: el.id, s: k })) { bd = d; best = { art: "L", ref: { e: el.id, s: k } }; }
    }
    if (arten.has("K") && ["kreis", "bogen", "langloch"].includes(el.art)) for (const [a, b] of segmente(el)) {
      const d = abstandStrecke(sm, bildschirm(a), bildschirm(b));
      if (d < bd && !gewaehlt({ e: el.id })) { bd = d; best = { art: "K", ref: { e: el.id } }; }
    }
  }
  if (!best && arten.has("L")) for (const [ax, q] of [["X", [1, 0]], ["Y", [0, 1]]]) { // Achsen durch den Ursprung
    const A = bildschirm([0, 0]), B = bildschirm(q), L = Math.hypot(B[0] - A[0], B[1] - A[1]) || 1;
    if (Math.abs((B[0] - A[0]) * (sm[1] - A[1]) - (B[1] - A[1]) * (sm[0] - A[0])) / L < 6 && !gewaehlt({ e: ax })) return { art: "L", ref: { e: ax } };
  }
  return best;
}
function wahlKlick(sm) {
  const s = skizze, wz = WERKZEUGE[s.werkzeug];
  const naechste = (pre) => { const a = pre.map((p) => p.art).join(""); return new Set(wz.muster.filter((m) => m.startsWith(a) && m.length > a.length).map((m) => m[a.length])); };
  let t = naechste(s.picks).size ? waehleGeo(sm, naechste(s.picks), s.picks) : null;
  if (!t && s.picks.length) { s.picks = []; t = waehleGeo(sm, naechste([])); } // neue Auswahl beginnen
  if (!t) return status(wz.text);
  document.querySelectorAll(".massbox").forEach((b) => b.remove());
  s.picks.push(t);
  const art = s.picks.map((p) => p.art).join("");
  if (!wz.muster.includes(art)) return status("Weiter: " + [...naechste(s.picks)].map((k) => ({ P: "Punkt", L: "Linie", K: "Kreis/Bogen" })[k]).join(" oder ") + " anklicken.");
  if (s.werkzeug === "mass") return massFuerWahl(sm);
  const b = abhAusWahl(s.werkzeug, s.picks); s.picks = [];
  if (b) uebernimm(b);
}
function abhAusWahl(w, picks) {
  const B = bezuege(skizze.f), [p1, p2, p3] = picks, r1 = p1.ref, r2 = p2?.ref;
  const hv = (a, b) => (Math.abs(b[0] - a[0]) >= Math.abs(b[1] - a[1]) ? "horizontal" : "vertikal");
  switch (w) {
    case "abhHV": return p1.art === "L" ? { typ: hv(...B.L(r1)), l: r1 } : { typ: hv(B.P(r1), B.P(r2)), a: r1, b: r2 };
    case "abhKoinzident": return p2.art === "P" ? { typ: "koinzident", a: r1, b: r2 } : p2.art === "L" ? { typ: "aufKurve", p: r1, l: r2 } : { typ: "aufKurve", p: r1, k: r2 };
    case "abhTangential": {
      if (p1.art === "K" && p2.art === "K") { const a = B.K(r1), b = B.K(r2); return { typ: "tangential", k1: r1, k2: r2, innen: abst(a.c, b.c) < Math.max(a.r, b.r) }; }
      return { typ: "tangential", l: p1.art === "L" ? r1 : r2, k: p1.art === "K" ? r1 : r2 };
    }
    case "abhGleich": return p1.art === "L" ? { typ: "gleich", l1: r1, l2: r2 } : { typ: "gleich", k1: r1, k2: r2 };
    case "abhParallel": return { typ: "parallel", l1: r1, l2: r2 };
    case "abhSenkrecht": return { typ: "senkrecht", l1: r1, l2: r2 };
    case "abhKollinear": return { typ: "kollinear", l1: r1, l2: r2 };
    case "abhFix": return p1.art === "P" ? { typ: "fix", p: r1 } : p1.art === "L" ? { typ: "fix", l: r1 } : { typ: "fix", e: r1.e };
    case "abhMitte": return { typ: "mittelpunkt", p: p1.art === "P" ? r1 : r2, l: p1.art === "L" ? r1 : r2 };
    case "abhKonzentrisch": return { typ: "konzentrisch", k1: r1, k2: r2 };
    case "abhSymmetrisch": return p1.art === "P" ? { typ: "symmetrisch", a: r1, b: r2, l: p3.ref } : { typ: "symmetrisch", k1: r1, k2: r2, l: p3.ref };
  }
  return null;
}
// Bemassung: Wert eintippen; bei zwei Punkten wahlweise ausgerichtet, horizontal oder vertikal
function massFuerWahl(sm) {
  const s = skizze, B = bezuege(s.f), [p1, p2] = s.picks, art = s.picks.map((p) => p.art).join("");
  const istAchse = (r) => r.e === "X" || r.e === "Y";
  let fertig, wert, optionen = null;
  if (art === "L") {
    if (istAchse(p1.ref)) { s.picks = []; return status("Achsen haben keine Länge – zweite Linie für einen Winkel anklicken."); }
    const el = B.els.get(p1.ref.e), k = p1.ref.s, l = B.L(p1.ref);
    wert = abst(l[0], l[1]); fertig = (w) => ({ typ: "abstand", a: { e: el.id, k: "p" + k }, b: { e: el.id, k: "p" + ((k + 1) % el.pts.length) }, w });
  } else if (art === "K") {
    const k = B.K(p1.ref), bogen = k.el.art === "bogen";
    wert = bogen ? k.r : 2 * k.r; fertig = (w) => ({ typ: bogen ? "radius" : "durchmesser", k: p1.ref, w });
  } else if (art === "PP") {
    const a = B.P(p1.ref), b = B.P(p2.ref), dx = b[0] - a[0], dy = b[1] - a[1];
    optionen = [["abstand", "ausgerichtet", Math.hypot(dx, dy)], ["abstandH", "horizontal", Math.abs(dx)], ["abstandV", "vertikal", Math.abs(dy)]];
    if (Math.abs(dy) < 1e-9) optionen.unshift(optionen.splice(1, 1)[0]); else if (Math.abs(dx) < 1e-9) optionen.unshift(optionen.splice(2, 1)[0]);
    wert = optionen[0][2];
    fertig = (w, typ) => ({ typ, a: p1.ref, b: p2.ref, w, ...(typ === "abstandH" ? { s: dx < 0 ? -1 : 1 } : typ === "abstandV" ? { s: dy < 0 ? -1 : 1 } : {}) });
  } else if (art === "KL" || art === "LK") { // Mitte eines Kreises/Bogens zur Linie
    const [kk, ll] = art === "KL" ? [p1, p2] : [p2, p1], k = B.K(kk.ref);
    if (k.el.art === "langloch") { s.picks = []; return status("Langloch: bitte Punkt oder Linie wählen."); }
    const d = abstandGerade(k.c, ...B.L(ll.ref)); wert = Math.abs(d); fertig = (w) => ({ typ: "punktLinie", p: { e: kk.ref.e, k: "c" }, l: ll.ref, w, s: d < 0 ? -1 : 1 });
  } else if (art === "KK") { // Mittelpunktabstand zweier Kreise/Bögen
    const a = B.K(p1.ref), b = B.K(p2.ref); if (a.el.art === "langloch" || b.el.art === "langloch") { s.picks = []; return status("Langloch: bitte Punkt oder Linie wählen."); }
    wert = abst(a.c, b.c); fertig = (w) => ({ typ: "abstand", a: { e: p1.ref.e, k: "c" }, b: { e: p2.ref.e, k: "c" }, w });
  } else if (art === "KP" || art === "PK") { // Mitte eines Kreises/Bogens zu einem Punkt
    const [kk, pp] = art === "KP" ? [p1, p2] : [p2, p1], k = B.K(kk.ref); if (k.el.art === "langloch") { s.picks = []; return status("Langloch: bitte Punkt oder Linie wählen."); }
    wert = abst(k.c, B.P(pp.ref)); fertig = (w) => ({ typ: "abstand", a: { e: kk.ref.e, k: "c" }, b: pp.ref, w });
  } else if (art === "PL" || art === "LP") {
    const [pp, ll] = art === "PL" ? [p1, p2] : [p2, p1], d = abstandGerade(B.P(pp.ref), ...B.L(ll.ref));
    wert = Math.abs(d); fertig = (w) => ({ typ: "punktLinie", p: pp.ref, l: ll.ref, w, s: d < 0 ? -1 : 1 });
  } else { // zwei Linien: Winkel, bei parallelen Linien Abstand
    let [l1, l2] = [p1.ref, p2.ref]; if (istAchse(l2) && !istAchse(l1)) [l1, l2] = [l2, l1];
    const a = B.L(l1), b = B.L(l2), d1 = [a[1][0] - a[0][0], a[1][1] - a[0][1]], d2 = [b[1][0] - b[0][0], b[1][1] - b[0][1]];
    const w0 = winkelZwischen(d1, d2);
    if (Math.abs(Math.sin(w0)) < 1e-6) {
      if (istAchse(l2)) { s.picks = []; return status("Zwei parallele Achsen lassen sich nicht bemassen."); }
      const p = { e: l2.e, k: "p" + l2.s }, d = abstandGerade(b[0], ...a);
      wert = Math.abs(d); fertig = (w) => ({ typ: "punktLinie", p, l: l1, w, s: d < 0 ? -1 : 1 });
    } else { // nicht parallel: Winkel – oder Abstand eines Endpunkts der zweiten Linie zur ersten
      const n = B.els.get(l2.e)?.pts.length || 2, pA = { e: l2.e, k: "p" + l2.s }, pB = { e: l2.e, k: "p" + ((l2.s + 1) % n) }, dA = abstandGerade(b[0], ...a), dB = abstandGerade(b[1], ...a);
      optionen = [["winkel", "Winkel", Math.abs(w0) / RAD], ["pl1", "Abstand Anfang → Linie", Math.abs(dA)], ["pl2", "Abstand Ende → Linie", Math.abs(dB)]]; wert = optionen[0][2];
      fertig = (w, typ) => typ === "pl1" ? { typ: "punktLinie", p: pA, l: l1, w, s: dA < 0 ? -1 : 1 } : typ === "pl2" ? { typ: "punktLinie", p: pB, l: l1, w, s: dB < 0 ? -1 : 1 } : (w < 180 ? { typ: "winkel", l1, l2, w: Math.sign(w0) * w * RAD } : null);
    }
  }
  massEingabe(sm[0] + "px", sm[1] + "px", wert, (w, typ, ausdruck) => {
    s.picks = [];
    if (!(w > 0)) return status("Bitte einen Wert grösser als 0 eingeben.");
    const b = fertig(w, typ); if (b) { if (ausdruck) b.ausdruck = ausdruck; uebernimm(b); } else status("Winkel kleiner als 180° eingeben.");
  }, optionen, s.picks.length === 1 ? "Weiter: zweite Linie, Punkt oder Kreis anklicken → Abstand oder Winkel" : "");
  zeichneLive();
}
// Eingabefeld für ein Mass an der Stelle left/top (CSS); ok(wert | null, option)
function massEingabe(left, top, wert, ok, optionen = null, hinweis = "") {
  document.querySelectorAll(".massbox").forEach((b) => b.remove());
  const box = document.createElement("div"); box.className = "massbox"; box.style.left = left; box.style.top = top;
  box.innerHTML = `<input type="number" step="any" class="massfeld">` + (optionen ? `<select>${optionen.map(([k, t]) => `<option value="${k}">${t}</option>`).join("")}</select>` : "") + (hinweis ? `<small class="masshinweis">${esc(hinweis)}</small>` : "");
  $("ansicht").appendChild(box);
  const inp = box.querySelector("input"), sel = box.querySelector("select");
  inp.type = "text"; inp.setAttribute("inputmode", (doc.parameter || []).length ? "text" : "decimal");
  inp.value = typeof wert === "string" ? wert : +(+wert).toFixed(3); inp.focus(); inp.select();
  sel?.addEventListener("change", () => { inp.value = +optionen.find((o) => o[0] === sel.value)[2].toFixed(3); inp.focus(); inp.select(); });
  let erledigt = false;
  const fertig = (an) => {
    if (erledigt) return;
    const t = inp.value.trim(), v = t === "" ? null : zahlAus(t);
    if (an && v !== null && !Number.isFinite(v)) { inp.classList.add("ungueltig"); return status("Formel ungültig – Zahl oder Parameter eingeben, z. B. «breite / 3»."); }
    erledigt = true; box.remove(); if (an) ok(v, sel?.value, t && !istZahl(t) ? t : null);
  };
  box.addEventListener("keydown", (ev) => { ev.stopPropagation(); if (ev.key === "Enter") fertig(true); if (ev.key === "Escape") fertig(false); });
  box.addEventListener("focusout", (ev) => { if (!box.contains(ev.relatedTarget)) setTimeout(() => { if (!box.contains(document.activeElement)) fertig(false); }); });
}
// Ziehen: gezogene Punkte folgen der Maus, der Löser hält alle Abhängigkeiten ein
function zugZiele(t) {
  const B = bezuege(skizze.f), el = B.els.get(t.ref.e);
  if (t.art === "L") { const n = el.pts.length; return { ziele: [t.ref.s, (t.ref.s + 1) % n].map((i) => ({ ref: { e: el.id, k: "p" + i }, uv0: el.pts[i].slice() })) }; }
  if (el.art === "kreis") return { kreis: { id: el.id, c: el.c.slice() } }; // Kreis am Rand ziehen ändert den Radius
  return { ziele: skizzenPunkte({ elemente: [el] }).filter((q) => q.e !== "O").map((q) => ({ ref: q.ref, uv0: q.uv.slice() })) };
}
function segmente(el) {
  if (el.art === "punkt") return [[el.p, el.p]];
  return elGeo(el).linien.flatMap((pts) => pts.slice(1).map((q, i) => [pts[i], q]));
}
function trefferElement(sm) {
  let best = null, bd = 8;
  for (const el of skizze.f.elemente) for (const [a, b] of segmente(el)) {
    const A = bildschirm(a), B = bildschirm(b), dx = B[0] - A[0], dy = B[1] - A[1], l2 = dx * dx + dy * dy || 1;
    const t = Math.max(0, Math.min(1, ((sm[0] - A[0]) * dx + (sm[1] - A[1]) * dy) / l2));
    const d = Math.hypot(sm[0] - A[0] - t * dx, sm[1] - A[1] - t * dy);
    if (d < bd) { bd = d; best = el; }
  }
  return best;
}
function trefferPunkt(sm) { // ziehbare Punkte (nicht der Ursprung)
  for (const q of skizzenPunkte(skizze.f)) { if (q.e === "O") continue; const s = bildschirm(q.uv); if (Math.hypot(s[0] - sm[0], s[1] - sm[1]) < 10) return q; }
  return null;
}
// Mass anklicken: Eingabefeld über dem Mass (leer + Enter löscht ein treibendes Mass); Symbol anklicken wählt die Abhängigkeit
// Masse frei verschieben: am Mass ziehen (Doppelklick setzt es zurück)
let massZug = null, massZugEnde = 0;
$("labels").addEventListener("pointerdown", (e) => {
  const d = e.target.closest(".mass"); if (!d || !skizze || e.button > 0) return; const l = labels[+d.dataset.i]; if (!l?.key) return;
  massZug = { key: l.key, zug: l.zug, x: e.clientX, y: e.clientY, id: e.pointerId, bewegt: false, d };
});
// auch in den Zeichenwerkzeugen: am Mass ziehen verschiebt es (ein Klick ohne Ziehen geht wie bisher an das Werkzeug)
leinwand.addEventListener("pointerdown", (e) => {
  if (!skizze || e.button > 0 || ["auswahl", "loeschen"].includes(skizze.werkzeug)) return;
  for (const d of $("labels").children) { if (d.hidden || d.dataset.i === "" || d.dataset.kante != null && d.dataset.kante !== "") continue; const l = labels[+d.dataset.i], r = d.getBoundingClientRect();
    if (l?.key && e.clientX > r.left - 6 && e.clientX < r.right + 6 && e.clientY > r.top - 6 && e.clientY < r.bottom + 6) { massZug = { key: l.key, zug: l.zug, x: e.clientX, y: e.clientY, id: e.pointerId, bewegt: false, d: leinwand }; return; } }
}, true);
document.addEventListener("pointermove", (e) => {
  if (!massZug || e.pointerId !== massZug.id || !skizze) return;
  if (!massZug.bewegt) { if (Math.hypot(e.clientX - massZug.x, e.clientY - massZug.y) < 8) return; massZug.bewegt = true; runter = null; try { massZug.d.setPointerCapture(e.pointerId); } catch {} }
  e.stopPropagation();
  const uv = planUV(e); if (!uv) return;
  (skizze.f.massV ||= {})[massZug.key] = massZug.zug(uv); zeichneLive(); zeigeLabels(); e.preventDefault();
}, true);
const massZugAus = () => { if (massZug?.bewegt) { massZugEnde = performance.now(); merke?.(); } massZug = null; };
document.addEventListener("pointerup", massZugAus, true); document.addEventListener("pointercancel", massZugAus, true);
$("labels").addEventListener("dblclick", (e) => { const d = e.target.closest(".mass"); const l = d && labels[+d.dataset.i]; if (l?.key && skizze?.f.massV?.[l.key]) { delete skizze.f.massV[l.key]; zeichneLive(); zeigeLabels(); } });
$("labels").addEventListener("click", (e) => {
  if (performance.now() - massZugEnde < 400) { e.stopPropagation(); return; }
  const kd = e.target.closest(".kante");
  if (kd && !skizze) { const f = finde(kd.dataset.fid); if (!f) return; const r = kd.getBoundingClientRect();
    if (dlg?.feature === f && dlg.kanteGewaehlt) return dlg.kanteGewaehlt(kd.dataset.kante, r.right, r.top);
    if (!dlg && kantenWz?.schritt === "kante" && kantenWz.f === f) waehleKante(kd.dataset.kante); return; }
  const d = e.target.closest(".mass, .klickbar"); if (!d || !skizze) return;
  const l = labels[+d.dataset.i]; if (!l) return;
  if (skizze.werkzeug === "loeschen") { if (l.bed) entferneBed(l.bed); return; }
  if (l.glyph) { skizze.bsel = l.bed; skizze.sel = null; status(`${ABH_NAME[l.bed.typ]} gewählt – Entf löscht die Abhängigkeit.`); return zeichneLive(); }
  if (!l.edit) return;
  massEingabe(d.style.left, d.style.top, l.edit.bed?.ausdruck ?? parseFloat(l.t.replace(/[^\d.\-]/g, "")), (w, _, ausdruck) => (w == null && l.edit.bed ? entferneBed(l.edit.bed) : massAendern(l.edit, w, ausdruck)));
});

let labels = [];
const massKey = (ed) => ed?.bed ? "b:" + (ed.bed.mid ||= Math.random().toString(36).slice(2, 8)) : ed?.el ? `e:${ed.el.id}:${ed.art}:${ed.i ?? ""}` : null;
let fgCache = { key: null, a: null };
function analyseGecacht(f) {
  const key = JSON.stringify([f.elemente, f.bedingungen]);
  if (fgCache.key !== key) {
    let a = null;
    try { if (skizzenPunkte(f).length < 800) a = analyse(f); } catch (err) { console.warn(err); }
    fgCache = { key, a };
  }
  return fgCache.a;
}
function zeichneLive() {
  leeren(live); labels = [];
  if (!skizze) return;
  for (const el of skizze.f.elemente) if (el.layer == null) el.layer = doc.aktivLayer || "0"; // neue Elemente kommen auf den aktiven Layer
  const f = skizze.f, s = skizze, A = analyseGecacht(f), B = bezuege(f);
  live.add(skizzenObjekt(f, 0x1f5fbf, A?.bestimmt));
  const fg = $("fgAnzeige"); fg.textContent = A ? (A.dof ? A.dof + " FG" : "bestimmt") : ""; fg.classList.toggle("voll", A?.dof === 0);
  fg.title = A ? `${fgText(A.dof)}. ${FG_ERKLAERUNG}` : "";

  const temp = { ebene: f.ebene, elemente: [] };
  const m = s.maus;
  const P = s.pkt, vor = (x) => x && temp.elemente.push(x), strich = () => vor({ art: "linie", pts: [P[0], m] });
  if (P.length && m) {
    switch (s.werkzeug) {
      case "linie": vor({ art: "linie", pts: [...P, m] }); break;
      case "rechteck": vor({ art: "rechteck", a: P[0], b: m }); break;
      case "rechteckM": vor(rechteckMitte(P[0], m)); break;
      case "rechteck3": if (P.length === 1) strich(); else vor({ art: "linie", pts: rechteck3(P[0], P[1], m), geschlossen: true }); break;
      case "kreis": vor({ art: "kreis", c: P[0], r: abst(P[0], m) || 0.001 }); break;
      case "kreis2": vor({ art: "kreis", c: [(P[0][0] + m[0]) / 2, (P[0][1] + m[1]) / 2], r: abst(P[0], m) / 2 || 0.001 }); break;
      case "kreis3": if (P.length === 1) strich(); else { const k = kreisDurch3(P[0], P[1], m); vor(k ? { art: "kreis", c: k.c, r: k.r } : { art: "linie", pts: [P[0], P[1], m] }); } break;
      case "bogen3": if (P.length === 1) strich(); else vor(bogenDaten({ a: P[0], b: P[1], m }) ? { art: "bogen", a: P[0], b: P[1], m } : null); break;
      case "bogenM": if (P.length === 1) strich(); else vor({ art: "bogen", ...bogenAusMitte(P[0], P[1], m) }); break;
      case "spline": vor({ art: "spline", pts: [...P, m] }); break;
      case "ellipse": if (P.length === 1) strich(); else { const r2 = abstandZurGeraden(m, P[0], P[1]); if (r2 > 0) vor({ art: "ellipse", c: P[0], a: P[1], r2 }); } break;
      case "polygon": if (abst(P[0], m) > 0) vor({ art: "linie", pts: polygonPunkte(P[0], m, s.ecken), geschlossen: true }); break;
      case "langloch": if (P.length === 1) strich(); else { const r = abstandZurGeraden(m, P[0], P[1]); if (r > 0) vor({ art: "langloch", a: P[0], b: P[1], r }); } break;
    }
  } else if (P.length > 1) vor({ art: "linie", pts: P });
  if (s.werkzeug === "versatz" && s.quelle) vor(versatzVorschau(m));
  live.add(skizzenObjekt(temp, 0x1d8fff));
  // Punkte
  const pts = fangPunkte().map((q) => q.uv).concat(m ? [m] : []);
  const pg = new THREE.BufferGeometry().setFromPoints(pts.map((p) => zu3D(f.ebene, p)));
  const pk = new THREE.Points(pg, new THREE.PointsMaterial({ color: 0x1f5fbf, size: 6, sizeAttenuation: false, depthTest: false })); pk.renderOrder = 11; live.add(pk);
  // Auswahl hervorheben
  const hl = [s.sel, s.quelle, ...(s.mehr || [])].filter((h) => h && f.elemente.includes(h)), hp = [s.basis, s.basis2].filter(Boolean);
  for (const pk of s.picks || []) {
    if (pk.art === "P") hp.push(pk.uv);
    else if (pk.art === "K") hl.push(B.els.get(pk.ref.e));
    else { const l = B.L(pk.ref); if (l) hl.push({ art: "linie", pts: pk.ref.e === "X" || pk.ref.e === "Y" ? [l[0].map((z, i) => z - (l[1][i] - l[0][i]) * 1000), l[1].map((z, i) => l[0][i] + (z - l[0][i]) * 1000)] : l }); }
  }
  if (hl.length) live.add(skizzenObjekt({ ebene: f.ebene, elemente: hl.filter(Boolean) }, 0x1d8fff));
  if (hp.length) { const o = new THREE.Points(new THREE.BufferGeometry().setFromPoints(hp.map((p) => zu3D(f.ebene, p))), new THREE.PointsMaterial({ color: 0x1d8fff, size: 11, sizeAttenuation: false, depthTest: false })); o.renderOrder = 12; live.add(o); }
  // Masse: treibende Masse ersetzen die Referenzmasse an derselben Stelle
  const getrieben = new Set();
  for (const b of f.bedingungen || []) {
    if (b.typ === "abstand" && b.a.e === b.b.e) getrieben.add("L:" + b.a.e + ":" + [b.a.k, b.b.k].sort().join(":"));
    if (b.typ === "knick") getrieben.add("W:" + b.p.e + ":" + b.p.k);
    if (b.typ === "radius" || b.typ === "durchmesser") getrieben.add("K:" + b.k.e);
  }
  const frei = (k) => !getrieben.has(k);
  const mv = f.massV || {};
  const pxA = bildschirm([0, 0]), pxB = bildschirm([1, 0]), mmProPx = 1 / (Math.hypot(pxB[0] - pxA[0], pxB[1] - pxA[1]) || 1);
  // Längenmasse haben eine Masslinie von Punkt zu Punkt (parallel zur Strecke, Abstand = Versatz des Masses, Standard 14 px); frei verschobene Masse: Versatz je Mass in der Skizze
  const einh = (v) => { const L = Math.hypot(v[0], v[1]); return L > 1e-12 ? [v[0] / L, v[1] / L] : null; }, px = mmProPx, skal = (a, b) => a[0] * b[0] + a[1] * b[1], wrap = (x) => { while (x > Math.PI) x -= 2 * Math.PI; while (x <= -Math.PI) x += 2 * Math.PI; return x; };
  // Die Masszahl gehört zur Masslinie: Ziehen verschiebt die Masslinie (Abstand bei Längen, Radius des Winkelbogens, Richtung bei Radius/Durchmesser), die Zahl folgt ihr immer
  const setzeLabel = (uv, l, seg = null, form = null) => {
    const key = massKey(l.edit), o = (key && mv[key]) || null; let p = uv, zug = null, off = null, F = form;
    if (seg) { const A = seg[0], Bp = seg[1], d = einh([Bp[0] - A[0], Bp[1] - A[1]]);
      if (d) { const n = [-d[1], d[0]], mid = [(A[0] + Bp[0]) / 2, (A[1] + Bp[1]) / 2], aussen = seg[3] && skal(n, [mid[0] - seg[3][0], mid[1] - seg[3][1]]) < 0 ? -1 : 1, h = o ? skal(o, n) : 14 * px * aussen; off = [n[0] * h, n[1] * h]; p = [mid[0] + off[0], mid[1] + off[1]]; zug = (q) => { const hh = skal([q[0] - mid[0], q[1] - mid[1]], n); return [n[0] * hh, n[1] * hh]; }; } }
    else if (F?.typ === "winkel") { const bis = einh([F.d0[0] + F.d1[0], F.d0[1] + F.d1[1]]) || [-F.d0[1], F.d0[0]], r0 = F.r, r = Math.max(8 * px, r0 + (o ? skal(o, bis) : 0)), ab = 11 * px;
      F = { ...F, r }; p = [F.v[0] + bis[0] * (r + ab), F.v[1] + bis[1] * (r + ab)]; off = [bis[0] * (r - r0), bis[1] * (r - r0)];
      zug = (q) => { const rr = Math.max(8 * px, skal([q[0] - F.v[0], q[1] - F.v[1]], bis) - ab); return [bis[0] * (rr - r0), bis[1] * (rr - r0)]; }; }
    else if (F?.typ === "radius") { const phi0 = Math.atan2(F.p0[1] - F.c[1], F.p0[0] - F.c[0]), R = Math.hypot(F.p0[0] - F.c[0], F.p0[1] - F.c[1]), ph = phi0 + (o ? o[0] : 0), pt = [F.c[0] + Math.cos(ph) * R, F.c[1] + Math.sin(ph) * R], nn = [-Math.sin(ph), Math.cos(ph)];
      F = { typ: "radius", c: F.c, p: pt }; p = [(F.c[0] + pt[0]) / 2 + nn[0] * 12 * px, (F.c[1] + pt[1]) / 2 + nn[1] * 12 * px]; off = [ph - phi0, 0]; zug = (q) => [wrap(Math.atan2(q[1] - F.c[1], q[0] - F.c[0]) - phi0), 0]; }
    else if (F?.typ === "durchm") { const phi0 = Math.PI / 4, ph = phi0 + (o ? o[0] : 0), dir = [Math.cos(ph), Math.sin(ph)];
      F = { typ: "durchm", c: F.c, r: F.r, dir }; p = [F.c[0] + dir[0] * (F.r + 18 * px), F.c[1] + dir[1] * (F.r + 18 * px)]; off = [ph - phi0, 0]; zug = (q) => [wrap(Math.atan2(q[1] - F.c[1], q[0] - F.c[0]) - phi0), 0]; }
    else if (o) { p = [uv[0] + o[0], uv[1] + o[1]]; off = o; zug = (q) => [q[0] - uv[0], q[1] - uv[1]]; }
    labels.push({ ...l, p: zu3D(f.ebene, p), key, uv0: uv, verb: !seg && !form && o ? uv : null, seg, form: F, off, zug: zug || ((q) => [q[0] - uv[0], q[1] - uv[1]]) });
  };
  const radiusForm = (c, pnt) => ({ typ: "radius", c, p0: pnt });
  const durchmForm = (c, r) => ({ typ: "durchm", c, r });
  const winkelForm = (v, a, c, r = 28 * px) => { const d0 = einh([a[0] - v[0], a[1] - v[1]]), d1 = einh([c[0] - v[0], c[1] - v[1]]); return d0 && d1 ? { typ: "winkel", v, d0, d1, r } : null; }; // Innenwinkel zwischen den beiden Schenkeln am Punkt v
  const lab = (a, b, txt, edit, winkel, seg = false, ref = null) => { if (skAnz.masse) setzeLabel([(a[0] + b[0]) / 2, (a[1] + b[1]) / 2], { t: txt, edit, winkel }, seg ? [a, b, null, ref] : null); }; // ref: Mitte der Figur – die Masslinie liegt standardmässig ausserhalb
  const fest = new Set(f.elemente);
  for (const el of [...f.elemente, ...temp.elemente]) {
    const ed = fest.has(el);
    if (el.art === "linie") {
      const zentrum = [el.pts.reduce((a, q) => a + q[0], 0) / el.pts.length, el.pts.reduce((a, q) => a + q[1], 0) / el.pts.length];
      el.pts.forEach((p, i) => { const j = el.pts[i + 1] ? i + 1 : el.geschlossen ? 0 : -1, q = el.pts[j]; if (q && frei("L:" + el.id + ":" + ["p" + i, "p" + j].sort().join(":"))) lab(p, q, f1(Math.hypot(q[0] - p[0], q[1] - p[1])), ed && { el, art: "laenge", i }, false, true, el.geschlossen ? zentrum : null); });
      const n = el.pts.length;
      for (let i = el.geschlossen ? 0 : 1; i < (el.geschlossen ? n : n - 1); i++) {
        const w = drehung(el.pts, i);
        if (Math.abs(w) > 0.05 && n > 2 && frei("W:" + el.id + ":p" + i) && skAnz.masse) { // Winkel zur vorherigen Linie: der Innenwinkel zwischen den beiden Schenkeln
          const a = el.pts[(i - 1 + n) % n], b = el.pts[i], c = el.pts[(i + 1) % n], wf = winkelForm(b, a, c), innen = 180 - Math.abs(w);
          setzeLabel(b, { t: innen.toFixed(1).replace(/\.0$/, "") + "°", edit: ed && { el, art: "winkel", i }, winkel: true }, null, wf);
        }
      }
      for (const [i, R] of Object.entries(el.radien || {})) { const a = abrundung(el.pts, +i, R, el.geschlossen); if (a && skAnz.masse) setzeLabel([(a.c[0] + a.m[0]) / 2, (a.c[1] + a.m[1]) / 2], { t: "R " + f1(a.r), edit: ed && { el, art: "radius", i: +i }, winkel: true }, null, radiusForm(a.c, a.m)); }
    } else if (el.art === "rechteck") {
      lab(el.a, [el.b[0], el.a[1]], f1(Math.abs(el.b[0] - el.a[0])), ed && { el, art: "breite" }, false, true, [(el.a[0] + el.b[0]) / 2, (el.a[1] + el.b[1]) / 2]);
      lab(el.a, [el.a[0], el.b[1]], f1(Math.abs(el.b[1] - el.a[1])), ed && { el, art: "hoehe" }, false, true, [(el.a[0] + el.b[0]) / 2, (el.a[1] + el.b[1]) / 2]);
    } else if (el.art === "kreis") { if (frei("K:" + el.id)) { if (skAnz.masse) setzeLabel(el.c, { t: "Ø " + f1(el.r * 2), edit: ed && { el, art: "durchmesser" } }, null, durchmForm(el.c, el.r)); } }
    else if (el.art === "bogen") { const d = bogenDaten(el); if (d && frei("K:" + el.id) && skAnz.masse) setzeLabel([(d.c[0] + el.m[0]) / 2, (d.c[1] + el.m[1]) / 2], { t: "R " + f1(d.r), edit: ed && { el, art: "bogenR" }, winkel: true }, null, radiusForm(d.c, el.m)); }
    else if (el.art === "ellipse") { lab(el.c, el.a, "a " + f1(abst(el.c, el.a)), false); lab(el.c, el.c, "b " + f1(el.r2), false, true); }
    else if (el.art === "langloch") { if (frei("L:" + el.id + ":a:b")) lab(el.a, el.b, f1(abst(el.a, el.b)), ed && { el, art: "langL" }, false, true); if (frei("K:" + el.id)) lab(el.b, el.b, "B " + f1(el.r * 2), ed && { el, art: "langB" }, true); }
  }
  // Treibende Masse (fett, umrandet) und Symbole der Abhängigkeiten (anklicken → Entf löscht)
  const dim = (uv, t, b, w, seg = null, form = null) => uv && skAnz.masse && setzeLabel(uv, { t: b.ausdruck ? `fx ${t}` : t, edit: { bed: b }, bed: b, treibend: true, winkel: w }, seg, form);
  const zaehler = new Map(), lm = (r) => { const l = B.L(r); return l && mitte(l[0], l[1]); };
  const glyph = (uv, b) => {
    if (!uv || !skAnz.abh) return;
    const k = uv.map((z) => Math.round(z * 10)).join(","), n = zaehler.get(k) || 0; zaehler.set(k, n + 1);
    labels.push({ p: zu3D(f.ebene, uv), t: GLYPHE[b.typ], bed: b, glyph: true, versatz: [12 + 15 * n, 12] });
  };
  const nahMaus = (uv) => { if (!uv || !m) return false; const a = bildschirm(uv), c = bildschirm(m); return Math.hypot(a[0] - c[0], a[1] - c[1]) < 30; };
  for (const b of f.bedingungen || []) switch (b.typ) {
    case "abstand": { const a = B.P(b.a), q = B.P(b.b); if (a && q) dim(mitte(a, q), f1(b.w), b, false, [a, q]); break; }
    case "abstandH": case "abstandV": { const a = B.P(b.a), q = B.P(b.b); if (a && q) dim(mitte(a, q), (b.typ === "abstandH" ? "↔ " : "↕ ") + f1(b.w), b, false, b.typ === "abstandH" ? [a, [q[0], a[1]], [a, q]] : [a, [a[0], q[1]], [a, q]]); break; }
    case "punktLinie": { const p = B.P(b.p), l = B.L(b.l); if (p && l) dim(mitte(p, projektion(p, l)), f1(b.w), b, false, [p, projektion(p, l)]); break; }
    case "winkel": { const l = B.L(b.l2), l1 = B.L(b.l1); if (l) { let form = null; if (l1) { // Winkelbogen im Schnittpunkt der beiden Linien
      const d1 = [l1[1][0] - l1[0][0], l1[1][1] - l1[0][1]], d2 = [l[1][0] - l[0][0], l[1][1] - l[0][1]], det = d1[0] * d2[1] - d1[1] * d2[0];
      if (Math.abs(det) > 1e-9) { const t = ((l[0][0] - l1[0][0]) * d2[1] - (l[0][1] - l1[0][1]) * d2[0]) / det, c = [l1[0][0] + d1[0] * t, l1[0][1] + d1[1] * t], m1 = mitte(l1[0], l1[1]), m2 = mitte(l[0], l[1]), e1 = einh([m1[0] - c[0], m1[1] - c[1]]), e2 = einh([m2[0] - c[0], m2[1] - c[1]]);
        if (e1 && e2) { const bs = einh([e1[0] + e2[0], e1[1] + e2[1]]) || [-e1[1], e1[0]], rA = 34 * px; dim([c[0] + bs[0] * rA * 1.5, c[1] + bs[1] * rA * 1.5], grad(b.w), b, true, null, { typ: "winkel", v: c, d0: e1, d1: e2, r: rA, legs: true }); break; } } }
      dim(lm(b.l2), grad(b.w), b, true); } break; }
    case "knick": { const v = B.P(b.p), a = B.P(b.a), c = B.P(b.n); dim(v, grad(Math.PI - Math.abs(b.w)), b, true, null, v && a && c ? winkelForm(v, a, c, 28 * px) : null); break; } // Innenwinkel zwischen den Schenkeln
    case "radius": { const k = B.K(b.k); if (k) dim(mitte(k.c, k.anker), "R " + f1(b.w), b, true, null, radiusForm(k.c, k.anker)); break; }
    case "durchmesser": { const k = B.K(b.k); if (k) { const lg = k.el.art === "langloch"; if (lg) dim(k.el.b, "B " + f1(b.w), b, true); else dim(k.c, "Ø " + f1(b.w), b, false, null, durchmForm(k.c, k.r)); } break; }
    case "horizontal": case "vertikal": if (b.l) glyph(lm(b.l), b); else { glyph(B.P(b.a), b); glyph(B.P(b.b), b); } break;
    case "parallel": case "senkrecht": case "kollinear": glyph(lm(b.l1), b); glyph(lm(b.l2), b); break;
    case "gleich": if (b.l1) { glyph(lm(b.l1), b); glyph(lm(b.l2), b); } else { glyph(B.K(b.k1)?.anker, b); glyph(B.K(b.k2)?.anker, b); } break;
    case "konzentrisch": glyph(B.K(b.k1)?.c, b); break;
    case "tangential": {
      if (b.l) { const l = B.L(b.l), k = B.K(b.k); if (l && k) glyph(projektion(k.c, l), b); break; }
      const k1 = B.K(b.k1), k2 = B.K(b.k2); if (!k1 || !k2) break;
      const [g, kl] = b.innen && k2.r > k1.r ? [k2, k1] : [k1, k2], d = abst(g.c, kl.c) || 1;
      glyph([g.c[0] + ((kl.c[0] - g.c[0]) / d) * g.r, g.c[1] + ((kl.c[1] - g.c[1]) / d) * g.r], b); break;
    }
    case "koinzident": { const p = B.P(b.b); if (nahMaus(p) || s.bsel === b) glyph(p, b); break; } // wie in Fusion nur in der Nähe der Maus
    case "aufKurve": case "mittelpunkt": glyph(B.P(b.p), b); break;
    case "symmetrisch": if (b.a) { glyph(B.P(b.a), b); glyph(B.P(b.b), b); } else { glyph(B.K(b.k1)?.c, b); glyph(B.K(b.k2)?.c, b); } break;
    case "fix": glyph(b.p ? B.P(b.p) : b.l ? lm(b.l) : skizzenPunkte({ elemente: [B.els.get(b.e)].filter(Boolean) })[1]?.uv, b); break;
  }
  for (const l of labels) if (l.verb) { const ln = new THREE.Line(new THREE.BufferGeometry().setFromPoints([zu3D(f.ebene, l.verb), l.p]), new THREE.LineBasicMaterial({ color: 0x7a8794, depthTest: false })); ln.renderOrder = 10; live.add(ln); } // Hilfslinie zum verschobenen Mass
  massStand++;
  if (m) status(`u ${f1(m[0])}  v ${f1(m[1])} mm · ${f.name} auf ${ebenenName(f.ebene)}`, true);
}
// Masslinien (Hilfslinien, Masslinie mit Pfeilen) wie im Plan; Pfeil- und Überstandsgrösse folgen dem Zoom
const massGruppe = new THREE.Group(); szene.add(massGruppe); let massStand = 0, massLinienKey = "";
const einh2 = (v) => { const L = Math.hypot(v[0], v[1]); return L > 1e-12 ? [v[0] / L, v[1] / L] : null; };
function baueMassLinien() {
  const key = skizze ? [massStand, skizze.f.id, ...kamera.position.toArray().map((v) => Math.round(v * 2)), kamera.zoom].join("|") : "";
  if (key === massLinienKey) return; massLinienKey = key; leeren(massGruppe);
  if (!skizze) return;
  const f = skizze.f, pos = [], P = (uv) => { const v = zu3D(f.ebene, uv); pos.push(v.x, v.y, v.z); };
  const seg = (a, b) => { P(a); P(b); };
  for (const l of labels) if (l.seg && l.off) {
    const [a, b] = l.seg, L = Math.hypot(b[0] - a[0], b[1] - a[1]); if (L < 1e-6) continue;
    const d = [(b[0] - a[0]) / L, (b[1] - a[1]) / L], n = [-d[1], d[0]], h = l.off[0] * n[0] + l.off[1] * n[1]; if (Math.abs(h) < 1e-6) continue;
    const pa = [a[0] + n[0] * h, a[1] + n[1] * h], pb = [b[0] + n[0] * h, b[1] + n[1] * h], px = bildschirm([a[0] + 1, a[1]]), p0 = bildschirm(a), mm = 1 / (Math.hypot(px[0] - p0[0], px[1] - p0[1]) || 1);
    const ue = 4 * mm * Math.sign(h), sz = Math.min(9 * mm, L / 3), an = l.seg[2] || [a, b];
    seg(an[0], [pa[0] + n[0] * ue, pa[1] + n[1] * ue]); seg(an[1], [pb[0] + n[0] * ue, pb[1] + n[1] * ue]); // Hilfslinien (bei H/V-Abständen von den wirklichen Punkten)
    seg(pa, pb); // Masslinie
    for (const [t, r] of [[pa, 1], [pb, -1]]) for (const w of [1, -1]) seg(t, [t[0] + r * d[0] * sz + w * n[0] * sz * 0.28, t[1] + r * d[1] * sz + w * n[1] * sz * 0.28]); // Pfeile
  }
  const mmAn = (uv) => { const q = bildschirm(uv), r = bildschirm([uv[0] + 1, uv[1]]); return 1 / (Math.hypot(q[0] - r[0], q[1] - r[1]) || 1); };
  const pfeil = (tip, d, sz) => { const n = [-d[1], d[0]]; for (const w of [1, -1]) seg(tip, [tip[0] - d[0] * sz + w * n[0] * sz * 0.28, tip[1] - d[1] * sz + w * n[1] * sz * 0.28]); }; // Pfeilspitze bei tip, zeigt in Richtung d
  for (const l of labels) if (l.form) {
    const F = l.form, mm = mmAn(F.c || F.v), sz = 9 * mm;
    if (F.typ === "radius") { const d = einh2([F.p[0] - F.c[0], F.p[1] - F.c[1]]); if (!d) continue; seg(F.c, F.p); pfeil(F.p, d, Math.min(sz, Math.hypot(F.p[0] - F.c[0], F.p[1] - F.c[1]) / 2)); }
    else if (F.typ === "durchm") { const p0 = [F.c[0] - F.dir[0] * F.r, F.c[1] - F.dir[1] * F.r], p1 = [F.c[0] + F.dir[0] * F.r, F.c[1] + F.dir[1] * F.r]; seg(p0, p1); const s2 = Math.min(sz, F.r / 2); pfeil(p1, F.dir, s2); pfeil(p0, [-F.dir[0], -F.dir[1]], s2); seg(p1, [F.c[0] + F.dir[0] * (F.r + 14 * mm), F.c[1] + F.dir[1] * (F.r + 14 * mm)]); }
    else if (F.typ === "winkel") { // Bogen von Richtung d0 nach d1 (kleiner Winkel), Pfeile an beiden Enden
      const a0 = Math.atan2(F.d0[1], F.d0[0]); let da = Math.atan2(F.d1[1], F.d1[0]) - a0; while (da > Math.PI) da -= 2 * Math.PI; while (da <= -Math.PI) da += 2 * Math.PI; const r = F.r, N = Math.max(6, Math.ceil(Math.abs(da) / 0.15)), pt = (t) => [F.v[0] + Math.cos(a0 + da * t) * r, F.v[1] + Math.sin(a0 + da * t) * r];
      if (F.legs) { seg(F.v, [F.v[0] + F.d0[0] * r * 1.3, F.v[1] + F.d0[1] * r * 1.3]); seg(F.v, [F.v[0] + F.d1[0] * r * 1.3, F.v[1] + F.d1[1] * r * 1.3]); } // Hilfslinien nur, wo die Schenkel nicht schon Linien der Skizze sind
      for (let i = 0; i < N; i++) seg(pt(i / N), pt((i + 1) / N));
      const sg = Math.sign(da) || 1, t1 = [-Math.sin(a0 + da) * sg, Math.cos(a0 + da) * sg], t0 = [Math.sin(a0) * sg, -Math.cos(a0) * sg], s3 = Math.min(sz, r * Math.abs(da) / 3);
      pfeil(pt(1), t1, s3); pfeil(pt(0), t0, s3); }
  }
  if (!pos.length) return;
  const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  const ln = new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color: 0x56616c, depthTest: false })); ln.renderOrder = 10; massGruppe.add(ln);
}
function zeigeLabels() {
  baueMassLinien();
  const box = $("labels"), alle = labels; // Kantenbeschriftungen entfallen: Kanten werden direkt am Modell angeklickt
  while (box.children.length < alle.length) box.appendChild(document.createElement("div"));
  [...box.children].forEach((d, i) => {
    const l = alle[i];
    if (!l) { d.hidden = true; return; }
    if (l.kante) { const v = l.p.clone().project(kamera); d.hidden = v.z > 1; d.textContent = l.t; d.dataset.i = ""; d.dataset.kante = l.kante; d.dataset.fid = l.fid;
      d.className = ["kante", l.an && "an", l.belegt && "belegt"].filter(Boolean).join(" "); d.style.transform = ""; d.style.left = ((v.x + 1) / 2) * 100 + "%"; d.style.top = ((1 - v.y) / 2) * 100 + "%"; return; }
    delete d.dataset.kante;
    const v = l.p.clone().project(kamera);
    d.hidden = false; d.textContent = l.t; d.dataset.i = i;
    // Masse ändern nur im Werkzeug «Auswahl» (Esc); beim Zeichnen und Ändern gehen Klicks an die Skizze
    const aw = skizze?.werkzeug === "auswahl", lw = skizze?.werkzeug === "loeschen";
    d.className = [l.edit && aw && "mass", l.winkel && "winkel", l.treibend && "treibend", l.glyph && "glyph", l.glyph && (aw || lw) && "klickbar", l.bed && lw && "klickbar", l.bed && l.bed === skizze?.bsel && "gewaehlt"].filter(Boolean).join(" ");
    d.style.transform = l.versatz ? `translate(-50%, -50%) translate(${l.versatz[0]}px, ${l.versatz[1]}px)` : "";
    d.style.left = ((v.x + 1) / 2) * 100 + "%"; d.style.top = ((1 - v.y) / 2) * 100 + "%";
  });
}

// ------------------------------------------------------------ Maus und Tastatur
let runter = null;
leinwand.addEventListener("contextmenu", (e) => e.preventDefault());
leinwand.addEventListener("mousedown", (e) => { if (e.button === 1) e.preventDefault(); }); // kein Windows-Autoscroll beim Drücken des Mausrads
const planUV = (e) => { strahl.setFromCamera(ndc(e), kamera); const p = strahl.ray.intersectPlane(ebenenEbene(skizze.f.ebene), new THREE.Vector3()); return p && aufEbene(skizze.f.ebene, p); };
const smPos = (e) => { const r = leinwand.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
leinwand.addEventListener("pointerdown", (e) => {
  runter = { x: e.clientX, y: e.clientY, b: e.button };
  if (skizze?.werkzeug === "auswahl" && e.button === 0) {
    const sm = smPos(e), p = trefferPunkt(sm), start = planUV(e);
    if (p) skizze.zug = { start, punkt: true, ziele: [{ ref: p.ref, uv0: p.uv.slice() }] };
    else { const t = waehleGeo(sm, new Set(["L", "K"])); if (t && t.ref.e !== "X" && t.ref.e !== "Y") skizze.zug = { start, ...zugZiele(t) }; }
    if (skizze.zug && start) leinwand.setPointerCapture(e.pointerId); else skizze.zug = null;
  }
});
leinwand.addEventListener("pointerleave", () => hoverLoeschen());
// Stift-Hover auch auf Geräten, die nur pointerrawupdate bzw. die Kompatibilitäts-Mausereignisse liefern (z. B. Windows-Tablets mit Stift): als pointermove weiterreichen
{ let letztes = 0;
  leinwand.addEventListener("pointermove", () => (letztes = performance.now()), true);
  for (const art of ["pointerrawupdate", "mousemove"]) leinwand.addEventListener(art, (e) => {
    if (e.buttons || performance.now() - letztes < 60) return; letztes = performance.now();
    leinwand.dispatchEvent(new PointerEvent("pointermove", { clientX: e.clientX, clientY: e.clientY, pointerType: e.pointerType || "pen", pointerId: e.pointerId ?? 1, isPrimary: true, buttons: 0, bubbles: true, cancelable: true }));
  }, true); }
leinwand.addEventListener("pointermove", (e) => {
  if (!skizze) { if (messen) { const q = messPunkt(e); fangZeigen(q ? { art: q.fa, s: q.s } : null); } else if (aktiveWahl()) hoverWahl(e); else if (nahtWz || kantenWz || quetschWz) hoverWerkzeug(e); else hoverLoeschen(); return; }
  if (skizze.zug) {
    const uv = planUV(e); if (!uv) return;
    const z = skizze.zug, rund = (v) => (e.shiftKey ? v : rastern(v));
    if (!z.bewegt) { const a = bildschirm(z.start), b = bildschirm(uv); if (Math.hypot(a[0] - b[0], a[1] - b[1]) < 4) return; }
    const ziel = z.punkt ? [{ ref: z.ziele[0].ref, uv: uv.map(rund) }]
      : z.kreis ? [{ r: z.kreis.id, wert: Math.max(rund(abst(z.kreis.c, uv)), (einst.skizze.raster || 1) / 10) }]
      : z.ziele.map((q) => ({ ref: q.ref, uv: [q.uv0[0] + rund(uv[0] - z.start[0]), q.uv0[1] + rund(uv[1] - z.start[1])] }));
    const key = JSON.stringify(ziel); if (key === z.letzt) return;
    z.letzt = key; z.bewegt = true;
    loeseSkizze(skizze.f, { ziel }); zeichneLive();
    return;
  }
  if (skizze.werkzeug === "projizieren") projHover(e);
  if (skizze.werkzeug === "loeschen") { const t = trefferElement(smPos(e)); if (t !== skizze.sel) { skizze.sel = t; zeichneLive(); } return; } // Vorschau: was der Klick löschen würde, leuchtet
  const r = ebenenPunkt(e); if (!r) return fangZeigen(null);
  fangZeigen(r.art ? r : null); skizze.maus = r.uv; zeichneLive();
  if (braucheEingabe(skizze)) {
    const rr = leinwand.getBoundingClientRect(), ein = $("eingabe");
    ein.hidden = false; ein.style.left = Math.min(e.clientX - rr.left + 16, rr.width - 170) + "px"; ein.style.top = (e.clientY - rr.top + 16) + "px";
    eingabeBeschriften();
  } else $("eingabe").hidden = true;
});
leinwand.addEventListener("pointerup", (e) => {
  if (skizze?.zug) { const bewegt = skizze.zug.bewegt; skizze.zug = null; if (bewegt) { zeichneLive(); runter = null; return; } }
  if (!runter || Math.hypot(e.clientX - runter.x, e.clientY - runter.y) > 5 || runter.b !== 0) { runter = null; return; }
  runter = null;
  if (skizze?.werkzeug === "auswahl") { skizze.sel = trefferElement(smPos(e)); skizze.bsel = null; zeichneLive(); return; }
  if (skizze?.werkzeug === "loeschen") { skizze.sel = trefferElement(smPos(e)); skizze.bsel = null; if (skizze.sel) loescheSkizzenAuswahl(); else zeichneLive(); return; }
  if (skizze) { const r = ebenenPunkt(e); if (r) klick(r.uv, r.fang, smPos(e), r.ref); return; }
  if (messen && !skizze) { messKlick(e); return; }
  if (simulation?.klick(e)) return;
  if (dlg?.kantenWahl?.(e)) return;
  if (uebernimmWahl(e)) return;
  if (nahtWz && nahtKlick(e)) return;
  if (quetschWz && !dlg && quetschKlick(e)) return;
  if (kantenWz && !dlg && kantenWzKlick(e)) return;
  strahl.setFromCamera(ndc(e), kamera);
  const treffer = strahl.intersectObjects(modell.children.filter((o) => o.isMesh), false)[0]; // Körper vor Ebenen
  const ebenenTreffer = strahl.intersectObjects(modell.children.filter((o) => o.userData.ebene), true).find((x) => x.object.isMesh);
  const skId = skizzenTreffer(e, treffer); zeigerAuswahl = null;
  if (skId) return waehle(skId); // Skizzenfläche oder -linie angeklickt
  { // Kante (auch am Rand des Körpers, wo der Strahl danebengeht) oder Fläche eines Körpers: Unterauswahl für die Kontextleiste, der Körper bleibt gewählt
    const k = kanteAmKoerper(e);
    if (k?.fid) { zeigerAuswahl = { art: "kante", fid: k.fid, a: k.a, b: k.b }; return waehle(k.fid, true); }
    const fid = treffer && hauptVon(treffer.object.userData.fid)?.id;
    if (fid) { const n = treffer.face.normal.clone().transformDirection(treffer.object.matrixWorld); zeigerAuswahl = { art: "flaeche", fid, ref: `F:${fmt3(treffer.point.toArray())};${fmt3(n.toArray())}` }; }
  }
  waehle(treffer ? treffer.object.userData.fid : ebenenTreffer ? ebenenTreffer.object.userData.ebene : null, true);
});
leinwand.addEventListener("dblclick", () => {
  if (skizze?.werkzeug === "linie" || skizze?.werkzeug === "spline") abschliessenLinie();
  else if (!skizze && !dlg && !messen && !kantenWz && !modus2d && auswahl && !document.querySelector(".modal:not([hidden])")) { const f = hauptVon(auswahl); if (f && f.typ !== "ebene") bearbeite(f.typ === "flaechenteil" ? f.eltern : f); } // Doppelklick auf das Gewählte = Bearbeiten
  else if (skizze?.werkzeug === "auswahl" && skizze.sel?.art === "text") { // Text ändern: Inhalt, Höhe, Winkel
    const el = skizze.sel, t = prompt("Text", el.text); if (t == null) return;
    const h = parseFloat(String(prompt("Schrifthöhe in mm", el.hoehe)).replace(",", ".")), w = parseFloat(String(prompt("Drehwinkel in °", el.winkel || 0)).replace(",", "."));
    if (t.trim()) el.text = t.trim(); if (h > 0) el.hoehe = h; if (Number.isFinite(w)) el.winkel = w; TEXTE.clear(); zeichneLive();
  }
});
document.addEventListener("keydown", (e) => {
  if (!skizze) return;
  const imFeld = e.target.closest?.("#eingabe");
  if (skizze.werkzeug === "projizieren" && skizze.projWahl?.length && !e.target.closest?.("input,select,textarea")) {
    if (e.key === "Enter") { projizierenBestaetigen(); e.preventDefault(); return; }
    if (e.key === "Escape") { projWahlLeeren(); e.preventDefault(); return; }
  }
  if (e.key === "Escape" && (skizze.picks.length || skizze.bsel)) { skizze.picks = []; skizze.bsel = null; document.querySelectorAll(".massbox").forEach((b) => b.remove()); zeichneLive(); e.preventDefault(); return; }
  if (e.key === "Escape") { if (skizze.pkt.length || skizze.quelle) { abschliessenLinie(); skizze.pkt = []; skizze.quelle = null; zeichneLive(); } else if (skizze.werkzeug !== "auswahl") setzeWerkzeug("auswahl"); else { skizze.sel = null; zeichneLive(); } e.preventDefault(); return; }
  if ((e.key === "x" || e.key === "X") && (skizze.sel || skizze.projNeu?.length) && !e.target.closest?.("input,select")) { hilfslinieUmschalten(); e.preventDefault(); return; }
  if ((e.key === "Delete" || e.key === "Backspace") && (skizze.bsel || skizze.sel) && !e.target.closest?.("input,select")) { loescheSkizzenAuswahl(); e.preventDefault(); return; }
  // Tastenkürzel wie in Fusion: L Linie, R Rechteck, C Kreis, D Bemassung
  const kurz = { l: "linie", r: "rechteck", c: "kreis", d: "mass" }[e.key];
  if (kurz && !e.ctrlKey && !e.metaKey && !e.altKey && !e.target.closest?.("input,select,textarea")) { abschliessenLinie(); setzeWerkzeug(kurz); e.preventDefault(); return; }
  if (e.key === "Enter") { if (imFeld) eingabeAnwenden(); else abschliessenLinie(); e.preventDefault(); return; }
  if ((e.ctrlKey || e.metaKey) && e.key === "z") { if (skizze.pkt.length) skizze.pkt.pop(); else { skizze.f.elemente.pop(); bereinige(skizze.f); } zeichneLive(); e.preventDefault(); return; }
  if (!imFeld && braucheEingabe(skizze) && /^[\d.\-]$/.test(e.key) && !e.target.closest?.("input,select")) {
    $("eingabe").hidden = false; eingabeBeschriften(); $("eLaenge").value = e.key; $("eLaenge").focus(); e.preventDefault();
  }
});

// ------------------------------------------------------------ Werkzeugleiste
function neueSkizze(ebenenId) {
  let id = ebenenId;
  if (id.startsWith("F:")) { // Körperfläche: erst eine Ebene darauf anlegen, dann darauf skizzieren
    const e = { id: neueId(), typ: "ebene", art: "flaeche", name: "Ebene auf Fläche " + (doc.features.filter((x) => x.art === "flaeche").length + 1), flaeche: id };
    einfuegen(e); id = e.id; regen();
  }
  const f = { id: neueId(), typ: "skizze", name: "Skizze " + (doc.features.filter((x) => x.typ === "skizze").length + 1), ebene: id, elemente: [] };
  einfuegen(f); setTimeout(() => starteSkizze(f));
  const eb = finde(id); if (eb?.typ === "ebene") eb.versteckt = true; // die Konstruktionsebene ist verwendet: ausblenden (im Browser wieder einblendbar)
}
$("wSkizzeBlech").onclick = () => $("wSkizze").click(); // Skizze direkt aus dem Blech-Reiter
$("wSkizze").onclick = () => {
  if (dlg) $("dAbbrechen").click();
  const vor = finde(auswahl)?.typ === "ebene" && finde(auswahl)._ebene ? auswahl : einst.neu.ebene;
  dialog({ titel: "Skizze erstellen", sofort: true, felder: [{ id: "ebene", label: "Ebene", wahl: "ebene", optionen: ebenenOpt(null), wert: vor }],
    hinweis: "Ebene, Konstruktionsebene oder ebene Körperfläche in der Ansicht anklicken – oder in der Liste wählen und OK.",
    ok: (w) => neueSkizze(w.ebene) });
};
$("wExtrusion").onclick = () => { if (dlg) $("dAbbrechen").click(); extrusionDialog(); };
$("wDrehung").onclick = () => { if (dlg) $("dAbbrechen").click(); drehungDialog(); };
$("wSweep").onclick = () => { if (dlg) $("dAbbrechen").click(); sweepDialog(); };
$("wFlaeche").onclick = () => { if (dlg) $("dAbbrechen").click(); flaecheDialog(); };
$("wRund").onclick = () => { if (dlg) $("dAbbrechen").click(); rundDialog(); };
$("wBlechAufFlaeche").onclick = () => blechAufFlaecheStart();
$("wKehle").onclick = () => { if (dlg) $("dAbbrechen").click(); kehleDialog(); };
// ------------------------------------------------------------ Werkzeugleiste: Klappmenüs (fest positioniert, die Leiste rollt seitlich)
const leiste = $("leiste");
// Menüband (Desktop): die Klappmenüs der Hauptgruppe sind Reiter; das Menü des gewählten Reiters steht dauernd unter der Reiterzeile
const bandAn = () => innerWidth > 1000 && !skizze && !dlg;
let aktTab = (() => { try { const t = localStorage.getItem("sdcad-reiter") || "koerper"; return t === "kanten" ? "blech" : t; } catch { return "koerper"; } })();
function klappZu() {
  leiste.querySelectorAll(".klappmenue").forEach((m) => (m.hidden = true)); leiste.querySelectorAll(".klappknopf").forEach((k) => { k.setAttribute("aria-expanded", "false"); k.removeAttribute("aria-current"); });
  if (!bandAn()) return;
  const kp = leiste.querySelector(`#gHaupt .klapp[data-klapp="${aktTab}"]`) || leiste.querySelector("#gHaupt .klapp"); if (!kp) return;
  kp.querySelector(".klappmenue").hidden = false; kp.querySelector(".klappknopf").setAttribute("aria-current", "true");
  leiste.dataset.tab = kp.dataset.klapp;
}
addEventListener("resize", klappZu);
setTimeout(klappZu);
leiste.addEventListener("click", (e) => {
  const k = e.target.closest(".klappknopf");
  if (k) {
    if (bandAn() && k.closest("#gHaupt")) { aktTab = k.parentElement.dataset.klapp; try { localStorage.setItem("sdcad-reiter", aktTab); } catch {} klappZu(); return; }
    const m = k.nextElementSibling, offen = !m.hidden; klappZu(); if (offen) return;
    m.hidden = false; k.setAttribute("aria-expanded", "true");
    const r = k.getBoundingClientRect(), b = m.getBoundingClientRect();
    Object.assign(m.style, { left: Math.max(8, Math.min(r.left, innerWidth - b.width - 8)) + "px", top: r.bottom + 4 + "px" });
    return;
  }
  const b = e.target.closest(".klappmenue button"); if (!b) return;
  if (!e.target.closest(".pfeil, .sammelknopf")) setTimeout(klappZu); // ▾ im Menü öffnet die Varianten, Menü bleibt offen
  if (b.dataset.kwz || b.dataset.aus) { if (dlg) $("dAbbrechen").click();
    if (b.dataset.kwz === "kanten3d") return kantenDialog(); if (b.dataset.kwz) return koerperDialog(b.dataset.kwz);
    return b.dataset.aus === "import" ? $("importDatei").click() : b.dataset.aus === "bild" ? $("bildDatei").click() : exportiere(b.dataset.aus); }
}, true);
document.addEventListener("pointerdown", (e) => { if (!e.target.closest?.(".klapp") && !e.target.closest?.("#skizzenMenue")) klappZu(); });
// Zuklappbare Gruppen (wie «Ebene ▾»): zusammengehörige Werkzeuge stehen hinter einem Knopf; die Originalknöpfe bleiben (mit Kennung und Funktion) im Menü
const SAMMEL = [
  ["Weitere Körper", "Rohr, Spirale, Rippe", ["#wRohr", "#wSpirale", "#wRippe"]],
  ["Sonderformen", "Lofted Flange, Rund-/Kegelblech, Kehle/Grat, Blech auf Körperfläche", ["#wLoftFlansch", "#wRund", "#wKehle", "#wBlechAufFlaeche"]],
  ["Biegen / Trennen", "Biegung an Linie, Rip", ["#wBiegung", "#wRip"]],
  ["Abrunden", "Kanten abrunden / fasen, Extrusion ringsum abrunden", ['[data-kwz="kanten3d"]', '[data-kwz="kantenrund"]']],
  ["Muster / Spiegeln", "Muster und Spiegeln", ['[data-kwz="kmuster"]', '[data-kwz="kspiegel"]']],
  ["Analyse", "Kollision und Schnittanalyse", ["#wKollision", "#wSchnitt"]],
  ["Export", "STEP, STEP exakt, STL", ['[data-aus="step"]', "#wStepExakt", '[data-aus="stl"]']],
  ["Import", "STEP/STL und Bild/PDF-Plan einlesen", ['[data-aus="import"]', '[data-aus="bild"]']],
  ["Lager", "Einspannung, gelenkig, Gleitlager, vorgegebene Verschiebung", ["#wSimFest", "#wSimGelenk", "#wSimGleit", "#wSimWeg"]],
  ["Lasten", "Kraft, Druck, Linienlast, Eigengewicht, Normlast", ["#wSimKraft", "#wSimDruck", "#wSimStrecke", "#wSimGrav", "#wSimNorm"]],
  ["Ergebnis ▸", "Spannung, Verschiebung, Sicherheit, Beulform", ["#wSimSpannung", "#wSimVerschiebung", "#wSimSicherheit", "#wSimBeulform"]],
];
function sammelZu(ausser = null) { leiste.querySelectorAll(".sammelmenue").forEach((m) => { if (m !== ausser) m.hidden = true; }); }
for (const [label, titel, sels] of SAMMEL) {
  const bts = sels.map((s) => leiste.querySelector(s)).filter(Boolean); if (bts.length < 2) continue;
  const wrap = document.createElement("span"), kn = document.createElement("button"), m = document.createElement("div");
  wrap.className = "sammel"; kn.className = "wz sammelknopf"; kn.type = "button"; kn.title = titel; kn.setAttribute("aria-haspopup", "true"); m.className = "menue sammelmenue"; m.hidden = true;
  kn.innerHTML = (bts[0].querySelector("svg")?.outerHTML || "") + `<span class="kz">${label.replace(" ▸", "")}<span class="kpfeil">▾</span></span>`;
  bts[0].before(wrap); wrap.append(kn, m); bts.forEach((b) => m.append(b));
  kn.addEventListener("click", () => { const offen = !m.hidden; sammelZu(); if (offen) return; m.hidden = false; const r = kn.getBoundingClientRect(); Object.assign(m.style, { left: Math.max(8, Math.min(r.left, innerWidth - m.offsetWidth - 8)) + "px", top: r.bottom + 4 + "px" }); });
  m.addEventListener("click", () => { m.hidden = true; });
}
document.addEventListener("pointerdown", (e) => { if (!e.target.closest?.(".sammel")) sammelZu(); });
document.addEventListener("keydown", (e) => { if (e.key === "Escape") sammelZu(); });
// Klappknopf zeigt das aktive Werkzeug darin
new MutationObserver(() => leiste.querySelectorAll(".klapp").forEach((kp) => {
  const k = kp.querySelector(".klappknopf"), an = kp.querySelector(".klappmenue .wz[aria-pressed='true']");
  if (bandAn() && kp.closest("#gHaupt")) { const kl0 = k.querySelector(".kl"); if (k.dataset.label && kl0 && kl0.textContent !== k.dataset.label) kl0.textContent = k.dataset.label; return; }
  const soll = an ? "true" : "false", kl = k.querySelector(".kl"); k.dataset.label ||= kl.textContent;
  if (k.getAttribute("aria-pressed") !== soll) k.setAttribute("aria-pressed", soll); // nur bei Änderung, sonst ruft sich der Beobachter endlos auf
  const text = an ? an.textContent.replace("▾", "").trim().split(/\s{2,}/)[0] : k.dataset.label; if (kl.textContent !== text) kl.textContent = text;
})).observe(leiste, { subtree: true, attributes: true, attributeFilter: ["aria-pressed"] });
// Nur zeigen, was gerade gebraucht wird: in der Skizze die Skizzenwerkzeuge, bei offenem Befehl nur dessen Name
function leisteZustand() {
  leiste.classList.toggle("imSkizze", !!skizze);
  document.body.classList.toggle("skizzeAktiv", !!skizze);
  const imDialog = !!dlg && !skizze; leiste.classList.toggle("imDialog", imDialog);
  $("aktivWz").hidden = !imDialog; if (imDialog) $("aktivWz").textContent = dlg.titel + " – im Dialog fertigstellen";
  klappZu();
}
$("wLoft").onclick = () => { if (dlg) $("dAbbrechen").click(); loftDialog(); };
$("wBlech").onclick = () => { if (dlg) $("dAbbrechen").click(); blechDialog(); };
$("wVorlage").onclick = () => { if (dlg) $("dAbbrechen").click(); vorlageDialog(); };
// Konstruieren: Menü mit allen Ebenenarten
$("wEbene").onclick = (e) => {
  e.stopPropagation();
  const m = $("ebenenMenue");
  if (!m.hidden && m.dataset.quelle !== "koerper") { m.hidden = true; return; }
  m.dataset.quelle = "ebene";
  m.innerHTML = Object.entries(EBENEN_ARTEN).filter(([k]) => k !== "flaeche").map(([k, t]) => `<button data-art="${k}"><b>${t}</b></button>`).join("")
    + '<hr>' + Object.entries(ACHSEN_ARTEN).map(([k, t]) => `<button data-achse="${k}"><b>${t}</b></button>`).join("")
    + '<hr>' + Object.entries(PUNKT_ARTEN).map(([k, t]) => `<button data-punkt="${k}"><b>${t}</b></button>`).join("");
  const r = $("wEbene").getBoundingClientRect();
  Object.assign(m.style, { left: Math.min(r.left, innerWidth - 330) + "px", top: r.bottom + 4 + "px" });
  m.hidden = false;
};
$("ebenenMenue").onclick = (e) => {
  const b = e.target.closest("button"); if (!b) return; $("ebenenMenue").hidden = true; if (dlg) $("dAbbrechen").click();
  if (b.dataset.kwz === "kanten3d") return kantenDialog();
  if (b.dataset.blech) return b.dataset.blech === "skizze" ? flaecheDialog() : b.dataset.blech === "flaeche" ? blechAufFlaecheStart() : kehleDialog();
  if (b.dataset.kwz) return koerperDialog(b.dataset.kwz);
  if (b.dataset.aus) { return b.dataset.aus === "import" ? $("importDatei").click() : b.dataset.aus === "bild" ? $("bildDatei").click() : exportiere(b.dataset.aus); }
  if (b.dataset.art) ebeneDialog(b.dataset.art); else if (b.dataset.achse) konstruktionDialog("achse", b.dataset.achse); else if (b.dataset.punkt) konstruktionDialog("konpunkt", b.dataset.punkt);
};
document.addEventListener("click", (e) => { if (!e.target.closest?.("#ebenenMenue")) $("ebenenMenue").hidden = true; });
// Skizzenwerkzeuge: Knöpfe mit ▾ öffnen ein Menü mit den Varianten (wie in Fusion)
for (const [w, d] of Object.entries(WERKZEUGE)) if (!KNOPF_MENUE[d.knopf] && $(d.knopf)) $(d.knopf).onclick = () => { abschliessenLinie(); setzeWerkzeug(w); };
// Klick: zuletzt benutzte Variante; Klick auf ▾ oder auf den schon aktiven Knopf: Menü mit allen Varianten
const letzteVariante = {};
for (const [knopf, varianten] of Object.entries(KNOPF_MENUE)) $(knopf).onclick = (e) => {
  e.stopPropagation();
  const m = $("skizzenMenue"), aktiv = WERKZEUGE[skizze?.werkzeug]?.knopf === knopf;
  if (!m.hidden && m.dataset.knopf === knopf) { m.hidden = true; return; }
  if (!e.target.closest(".pfeil") && !aktiv && knopf !== "tAbh") { m.hidden = true; abschliessenLinie(); setzeWerkzeug(letzteVariante[knopf] || varianten[0][0]); return; } // Abhängigkeit: ein Klick öffnet gleich die Liste
  m.dataset.knopf = knopf;
  m.innerHTML = varianten.map(([w, t]) => `<button data-wz="${w}"${skizze?.werkzeug === w ? ' aria-pressed="true"' : ""}><b>${t}</b></button>`).join("");
  const r = $(knopf).getBoundingClientRect();
  Object.assign(m.style, { left: Math.min(r.left, innerWidth - 330) + "px", top: r.bottom + 4 + "px" });
  m.hidden = false;
};
$("skizzenMenue").onclick = (e) => { const w = e.target.closest("button")?.dataset.wz; if (!w) return; $("skizzenMenue").hidden = true; klappZu(); letzteVariante[WERKZEUGE[w].knopf] = w; abschliessenLinie(); setzeWerkzeug(w); };
document.addEventListener("click", (e) => { if (!e.target.closest?.("#skizzenMenue")) $("skizzenMenue").hidden = true; });
$("tFertig").onclick = beendeSkizze;
let projektPfad = null; // PC-Programm: Speichern schreibt ohne Rückfrage in diese Datei
// PC-Programm: zuletzt geöffnete/gespeicherte Projekte
const ZULETZT = "sdcad-zuletzt";
const zuletzt = () => { try { return JSON.parse(localStorage.getItem(ZULETZT) || "[]"); } catch { return []; } };
function merkeDatei(pfad) {
  if (!pfad) return;
  const liste = [pfad, ...zuletzt().filter((p) => p !== pfad)].slice(0, Math.max(1, einst.programm.zuletzt));
  try { localStorage.setItem(ZULETZT, JSON.stringify(liste)); } catch {}
}
function titel() {
  document.title = (projektPfad ? dateiname(projektPfad) + " – " : "") + "Spengler Digital CAD";
  window.__TAURI__?.window.getCurrentWindow().setTitle(document.title).catch(() => {});
}
async function projektSpeichern(unter = false) {
  const inhalt = JSON.stringify(doc, (k, v) => (k.startsWith("_") ? undefined : v), 1);
  const ziel = await herunterladen(modellDateiName(doc), inhalt, "application/json", unter ? null : projektPfad);
  if (ziel) { projektPfad = ziel; titel(); merkeDatei(ziel); }
}
function ladeProjekt(text, pfad = null) {
  try {
    const d = JSON.parse(text); if (!d.features) throw 0;
    doc = d; auswahl = null; projektPfad = pfad; titel(); merkeDatei(pfad); verlauf.stapel = []; verlauf.namen = []; verlauf.pos = -1;
    $("aObjekt").value = doc.objekt; $("aNr").value = doc.nr; $("aModell").value = doc.modellName || ""; auftragAnzeige(); regen();
    waehle(doc.features.find((f) => f._res)?.id || null); ansicht(einst.allgemein.startAnsicht || "iso"); status("Projekt geöffnet.");
  } catch { status("Diese Datei ist kein Spengler-Digital-CAD-Projekt."); }
}
async function projektOeffnen() {
  if (!pc) return $("datei").click();
  try { const d = await pc.invoke("datei_oeffnen", { filter: DATEITYPEN.sdcad, endungen: ["sdcad", "json"] }); if (d) ladeProjekt(d.inhalt, d.pfad); }
  catch (e) { status("Öffnen fehlgeschlagen: " + e); }
}
// Öffnen / Speichern: Cloud oder PC/Gerät zur Wahl
const dateiMenue = $("dateiMenue"); let dateiAktionen = {};
function dateiWahl(knopf, eintraege) {
  if (!dateiMenue.hidden && dateiMenue.dataset.knopf === knopf.id) { dateiMenue.hidden = true; return; }
  dateiMenue.dataset.knopf = knopf.id; dateiAktionen = Object.fromEntries(eintraege.map(([k, , , fn]) => [k, fn]));
  dateiMenue.innerHTML = eintraege.map(([k, t, u]) => `<button data-k="${k}"><b>${t}</b><small>${u}</small></button>`).join("");
  const r = knopf.getBoundingClientRect(), ok = r.width > 0;
  Object.assign(dateiMenue.style, { left: (ok ? Math.max(8, Math.min(r.left, innerWidth - 340)) : 12) + "px", top: (ok ? r.bottom + 4 : 64) + "px" }); dateiMenue.hidden = false;
}
dateiMenue.onclick = (e) => { const k = e.target.closest("button")?.dataset.k; if (!k) return; dateiMenue.hidden = true; dateiAktionen[k]?.(); };
document.addEventListener("click", (e) => { if (!e.target.closest?.("#dateiMenue, #wOeffnen, #wSpeichern")) dateiMenue.hidden = true; });
const ZIEL = "sdcad-speichern-ziel";
const cloudBereit = () => cloud.angemeldet && !!doc.appProjekt;
// Speichern: eine einzige Möglichkeit – Name und Ort (Cloud oder PC/Gerät) wählen; gibt es die Datei schon, wird vor dem Überschreiben gefragt
const bestaetigt = new Set(); // in dieser Sitzung schon zum Überschreiben freigegebene Ziele: Strg+S speichert dann ohne Rückfrage
async function cloudAusfuehren() {
  if (!cloud.angemeldet) return status("Zuerst anmelden (Einstellungen › Konto & Cloud), dann lässt sich in der Cloud speichern.");
  if (!doc.appProjekt) { status("Zuerst dem Modell ein App-Projekt zuordnen (Datei › Projekte)."); return projekte.oeffnen(); }
  if (!bestaetigt.has("cloud:" + modellDateiName(doc))) {
    const v = await ablage.modellVorhanden();
    if (v && !confirm(`«${modellDateiName(doc)}» gibt es in der Cloud schon.\n\nOK = überschreiben (die alte Fassung bleibt als frühere Version erhalten)\nAbbrechen = anderen Namen wählen`)) return speichernStart();
    bestaetigt.add("cloud:" + modellDateiName(doc));
  }
  await ablage.modellSpeichern();
}
async function pcAusfuehren() {
  const datei = modellDateiName(doc); let neu = !projektPfad;
  if (pc && !neu) {
    if (dateiname(projektPfad).toLowerCase() === datei.toLowerCase()) { if (bestaetigt.has("pc:" + projektPfad) || confirm(`«${datei}» überschreiben?\n\nOK = überschreiben\nAbbrechen = unter neuem Namen bzw. an neuem Ort speichern`)) bestaetigt.add("pc:" + projektPfad); else neu = true; }
    else neu = true; // anderer Name: eigene Datei (der Systemdialog fragt bei einer vorhandenen Datei selbst)
  }
  await projektSpeichern(neu); if (pc && projektPfad) bestaetigt.add("pc:" + projektPfad);
}
function speichernStart(schnell = false) {
  let z = null; try { z = localStorage.getItem(ZIEL); } catch {}
  const v = einst.allgemein.speichern, ort0 = v === "cloud" || v === "pc" ? v : z === "cloud" || (z == null && cloudBereit()) ? "cloud" : "pc";
  const tun = (ort) => { try { localStorage.setItem(ZIEL, ort); } catch {} return ort === "cloud" ? cloudAusfuehren() : pcAusfuehren(); };
  if (schnell && doc.modellName && ((ort0 === "cloud" && cloudBereit() && bestaetigt.has("cloud:" + modellDateiName(doc))) || (ort0 === "pc" && projektPfad && bestaetigt.has("pc:" + projektPfad)))) return tun(ort0); // Strg+S: dieselbe Datei wie zuvor
  if (dlg) $("dAbbrechen").click();
  dialog({ titel: "Speichern", sofort: true,
    felder: [{ id: "name", label: "Name des Modells", text: true, wert: doc.modellName || [doc.nr, doc.objekt].filter(Boolean).join(" ") || "Modell" },
      { id: "ort", label: "Speichern in", optionen: [["cloud", cloudBereit() ? `Cloud · ${doc.appProjekt.name}` : "Cloud (Anmeldung + Projekt nötig)"], ["pc", pc ? "Auf dem PC" : "Auf dem Gerät"]], wert: ort0 }],
    hinweis: "Gibt es die Datei am gewählten Ort schon, wirst du gefragt, ob sie überschrieben werden soll.",
    ok: (w) => { const n = String(w.name ?? "").trim(); if (!n) return status("Bitte einen Namen eingeben."); doc.modellName = n; $("aModell").value = n; speichern(); tun(w.ort === "pc" ? "pc" : "cloud"); } });
}
$("wSpeichern").onclick = () => speichernStart();
$("wOeffnen").onclick = () => dateiWahl($("wOeffnen"), [
  ["cloud", "Aus der Cloud öffnen", cloud.angemeldet ? "Modelle der Cloud-Ablage durchsuchen" : "Zuerst anmelden (Einstellungen)", () => ablage.oeffnen()],
  ["pc", pc ? "Vom PC öffnen" : "Vom Gerät öffnen", "Projektdatei (.sdcad) wählen", projektOeffnen]]);
// ------------------------------------------------------------ Konto & Cloud (Spengler-Digital-App)
function setzeAuftrag({ nr, objekt, appProjekt }) { doc.nr = nr; doc.objekt = objekt; if (appProjekt) doc.appProjekt = appProjekt; else delete doc.appProjekt; $("aNr").value = nr; $("aObjekt").value = objekt; auftragAnzeige(); speichern(); if (appProjekt) ablage?.sicherstellen(); } // Projekt zugeordnet: Cloud-Ordner anlegen (falls es sie noch nicht gibt)
const neuesProfilAus = ({ name, zeilen, laenge, stueck, staerke, herkunft, notiz }) => {
    const gefunden = staerke > 0 && einst.materialien.find((x) => x.t === +staerke);
    const m = gefunden || einst.materialien.find((x) => x.id === neuMaterial()) || einst.materialien[0];
    if (staerke > 0 && !gefunden) status(`Achtung: Kein Material mit ${staerke} mm Stärke vorhanden – «${m.name}» (${m.t} mm) verwendet. Bitte Material prüfen.`);
    const f = { id: neueId(), typ: "profil", name, start: 0, zeilen: zeilen.length ? zeilen : [{ L: 100, winkel: 0, art: "abkanten" }], material: m.id, laenge: laenge > 0 ? +laenge : einst.neu.laenge, stueck: stueck > 0 ? +stueck : 1, richtung: "eine", ebene: einst.neu.ebene, ...(herkunft ? { herkunft } : {}), ...(notiz ? { notiz } : {}) };
    einfuegen(f); regen(); waehle(f.id); return f; };
const cloud = cloudModul({
  esc, status, getEinst: () => einst, setEinst: (e) => { einst = e; if (entwurf) entwurf = JSON.parse(JSON.stringify(einst)); }, einstSpeichern, getDoc: () => doc, regen,
  projektAktualisieren: () => projekte.aktualisiere(), projekteOeffnen: () => { $("einst").hidden = true; entwurf = null; projekte.oeffnen(); },
  setzeAuftrag,
  projektText: () => JSON.stringify(doc, (k, v) => (k.startsWith("_") ? undefined : v)), ladeProjektText: (x) => ladeProjekt(x),
  neuZeichnen: () => { if (!$("einst").hidden && einstRegister === "konto") zeigeEinst(); },
  teile: () => blechteile().filter((f) => f._res).map((f) => ({ f, res: f._res, mat: material(f.material) })),
  neuesProfil: (a) => neuesProfilAus(a),
});
// Projekte der App (anlegen, bearbeiten, zuordnen)
const projekte = projekteModul({ esc, status, getDoc: () => doc, speichern, neuesProfil: (a) => neuesProfilAus(a), client: () => cloud.client, angemeldet: () => cloud.angemeldet,
  setzeAuftrag, zumKonto: () => { if (dlg) $("dAbbrechen").click(); entwurf = JSON.parse(JSON.stringify(einst)); einstRegister = "konto"; zeigeEinst(); $("einst").hidden = false; } });
projekte.binden();
const ablage = ablageModul({ esc, status, getDoc: () => doc, client: () => cloud.client, angemeldet: () => cloud.angemeldet, projektText: () => JSON.stringify(doc, (k, v) => (k.startsWith("_") ? undefined : v), 1), ladeProjektText: (x) => ladeProjekt(x), herunterladen });
ablage.binden();
$("wAblage").onclick = () => { if (dlg) $("dAbbrechen").click(); ablage.oeffnen(); };
function auftragAnzeige() { // zugeordnetes Projekt: Objekt und Nummer kommen aus der App (nur dort änderbar)
  const z = !!doc.appProjekt; $("aProjektName").textContent = z ? doc.appProjekt.name : "Ohne Projekt";
  for (const id of ["aObjekt", "aNr"]) { $(id).readOnly = z; $(id).title = z ? "Kommt aus dem App-Projekt – im Projekt ändern (Datei › Projekte)" : ""; }
}
$("wProjekte").onclick = () => { if (dlg) $("dAbbrechen").click(); projekte.oeffnen(); };
$("aProjektWahl").onclick = () => projekte.oeffnen();
auftragAnzeige();
$("eInhalt").addEventListener("click", (ev) => { const b = ev.target.closest("[data-cloud]"); if (b) cloud.aktion(b.dataset.cloud, b.dataset.id); });
cloud.start().then(() => { if (!$("einst").hidden && einstRegister === "konto") zeigeEinst(); });
// ------------------------------------------------------------ 3D-Detailvorlagen (STEP-Körper mit Ankerkante, ersetzen die .f3d-Vorlagen des Add-ins)
const DETAILMESH = new Map(); // dekodierte Dreiecke je Vorlage und Version
function detail3dDialog(f) {
  const vl = einst.detailvorlagen || [];
  if (!vl.length) return status("Zuerst unter Einstellungen › Details 3D eine Detailvorlage aus einer STEP-Datei anlegen.");
  const istNeu = !f;
  f ||= { id: neueId(), typ: "detail3d", name: "3D-Detail " + (doc.features.filter((x) => x.typ === "detail3d").length + 1), vorlage: vl[0].id, kante: "A:X", versatz: 0, drehung: 0 };
  const felder = (f) => [
    { id: "name", label: "Name", text: true, wert: f.name },
    { id: "vorlage", label: "Detailvorlage", optionen: mitWert(vl.map((v) => [v.id, v.name]), f.vorlage), wert: f.vorlage },
    { id: "kante", label: "Ankerkante", wahl: "kante", optionen: mitWert(kantenListe(f), f.kante), wert: f.kante },
    { id: "versatz", label: "Versatz entlang der Kante", einheit: "mm", wert: f.versatz ?? 0 },
    { id: "drehung", label: "Drehung um die Kante", einheit: "°", wert: f.drehung ?? 0 },
  ];
  const hinweise = () => { const v = vl.find((x) => x.id === f.vorlage); return f._fehler ? "⚠ " + f._fehler : v ? (pruefeDetail(v, { kantenlaenge: f._detail3d?.kantenlaenge, dicke: null }).map((h) => "⚠ " + h).join(" · ") || `Detail ${v.anchor?.edgeLength ?? "?"} mm lang an einer Kante von ${f1(f._detail3d?.kantenlaenge ?? 0)} mm.`) : ""; };
  featureDialog(f, istNeu, felder, (f, w) => Object.assign(f, w, { name: w.name?.trim() || f.name }), "3D-Detail einfügen",
    "Setzt den Körper der Detailvorlage an eine Kante: Vorlagen-Ursprung am Kantenanfang, Vorlagen-X entlang der Kante, Vorlagen-Z zur Sichtseite. Kante in der Ansicht anklicken (Körperkante oder Skizzenkante).", { wahlNr: -1, info: hinweise });
}
$("wDetail3d").onclick = () => { if (dlg) $("dAbbrechen").click(); detail3dDialog(); };
// Kanten eines Flächenblechs mit Baustein (Flansch, Umschlag, Falz …) als Abkantfolgen für die Biegesimulation
function flaechenKanten(f) {
  const m = material(f.material), k = berechneKanten(f), out = [];
  for (const [key, v] of Object.entries(k)) {
    let b; try { b = werkzeugAuf(bausteinFuer(v), m); } catch { b = null; } if (!b || !String(b.folge ?? "").trim()) continue;
    let z; try { z = folge("100 " + bausteinFolge(b, m)); } catch { continue; } if (z.length < 2) continue;
    const [pi, ki] = key.split(":").map(Number);
    out.push({ name: `Kante ${Number.isFinite(ki) ? ki + 1 : key}${Number.isFinite(pi) && pi > 0 ? " (Fläche " + (pi + 1) + ")" : ""} · ${b.name || "Eigene Abkantfolge"}`, mitPlatte: true,
      schenkel: z.map((x, i) => ({ laenge: x.L, winkel: i === 0 ? 0 : -z[i - 1].winkel })), hinweise: z.some((x) => x.art === "umschlag") ? ["Umschlag/Falz: wird bis zum grössten Biegewinkel der Maschine gebogen und dann zugedrückt."] : [] });
  }
  return out;
}
// Biegesimulation: gewähltes Blechprofil auf der Schwenkbiegemaschine (Einstellungen › Biegemaschinen)
biegenInit({ maschinen: () => einst.maschinen || [], status, einstellungen: () => { einstRegister = "maschinen"; $("wEinst").click(); } });
$("wBiegesim").onclick = () => {
  if (dlg) $("dAbbrechen").click();
  const gewaehlt = hauptVon(auswahl), brauchbar = (x) => !x._aus && !x.versteckt && ((istProfil(x) && x._res?.schenkel?.length > 1) || (x.typ === "flaeche" && flaechenKanten(x).length));
  const f = gewaehlt && brauchbar(gewaehlt) ? gewaehlt : doc.features.find(brauchbar) || null;
  if (!f) return fehltDialog("Biegesimulation", "Zuerst ein Blechprofil oder ein Flächenblech mit Kantenbaustein (Flansch, Umschlag …) erstellen.");
  waehle(f.id);
  if (f.typ === "flaeche") return biegenOeffnenQuellen(flaechenKanten(f), { staerke: material(f.material)?.t, titel: f.name, platte: 150 });
  biegenOeffnen(f._res, { staerke: material(f.material)?.t, laenge: laengeVon(f), titel: f.name });
};
async function detailAusDatei(datei) {
  const name = datei.name.replace(/\.[^.]+$/, ""), puffer = await datei.arrayBuffer();
  try {
    status("STEP wird gelesen …"); const o = await occtLaden(), r = o.ReadStepFile(new Uint8Array(puffer), null);
    if (!r.success || !r.meshes.length) return status("STEP-Datei enthält keine lesbaren Körper.");
    const teile = r.meshes.map((m) => { const p = m.attributes.position.array, ix = m.index?.array; if (!ix) return Float32Array.from(p); const out = new Float32Array(ix.length * 3); ix.forEach((v, i) => { out[i * 3] = p[v * 3]; out[i * 3 + 1] = p[v * 3 + 1]; out[i * 3 + 2] = p[v * 3 + 2]; }); return out; });
    const alle = new Float32Array(teile.reduce((s, x) => s + x.length, 0)); let o2 = 0; for (const x of teile) { alle.set(x, o2); o2 += x.length; }
    const v = detailAusStep(name, new TextDecoder().decode(puffer), alle, datei.name);
    if (JSON.stringify(v).length > 1.5e6) return status(`«${name}» ist zu gross für eine Vorlage (${(JSON.stringify(v).length / 1e6).toFixed(1)} MB, max. 1.5 MB). Das Detail vereinfachen.`);
    entwurf.detailvorlagen = [...(entwurf.detailvorlagen || []), v]; zeigeEinst(); meldung(`«${name}» als Detailvorlage angelegt – Ankerlänge ${v.anchor.edgeLength} mm. Mit «Übernehmen» speichern.`);
  } catch (err) { status("Vorlage nicht angelegt: " + err.message); }
}
$("detailDatei").onchange = async (e) => { const d = e.target.files[0]; e.target.value = ""; if (d && entwurf) await detailAusDatei(d); };
// ------------------------------------------------------------ Exakter CAD-Kern (Beta): OpenCascade im Web Worker (kern/cad)
// Schalter in den Einstellungen (Standard aus = Version 0.2). Die Anzeige bleibt vorerst das Netz; der Kern liefert exakte
// Körper für STEP und Prüfungen. Fällt er aus, bleibt alles andere unverändert nutzbar.
let cadK = null;
const kernAn = () => einst.programm.kern === "occt";
function kern() {
  if (!cadK) {
    cadK = cadKlient({ workerUrl: new URL("./cad/cad-worker.js", location.href).href, wasmUrl: new URL("./cad/replicad_single.wasm", location.href).href });
    cadK.on("neustart", () => { exaktFuer = -1; exaktAnsichtIds = []; exaktAnsichtCache = new Map(); }); // Kennungen des alten Workers sind ungültig
    cadK.on("status", (s) => status(s.status === "laden" ? "Exakter CAD-Kern wird geladen (einmalig ~7 MB) …" : `Exakter CAD-Kern bereit (${(s.ms / 1000).toFixed(1)} s).`));
  }
  return cadK;
}
function kernAnzeige() {
  for (const id of ["wStepExakt", "wEigenschaften"]) { const b = $(id); if (b) b.hidden = !kernAn(); }
  if (!kernAn() && cadK) { cadK.beenden(); cadK = null; }
}
const kernFehlerText = (e) => e?.code === "NICHT_GELADEN" ? `Der CAD-Kern konnte nicht geladen werden (${e.message}). Web-Version oder PC-Programm verwenden; alles andere funktioniert weiter.` : `CAD-Kern: ${e?.message ?? e}`;
// Exakter Körper eines Blechteils (Vorlage, freies Profil, Blech aus Linienzug) – gleiche Lage wie das Anzeige-Netz
async function exaktKoerper(f) {
  const m = material(f.material);
  const { kommando, soll } = blechTeilKommando({ res: f._res, t: m.t, ebene: f._kernLage.ebene, laenge: zweiseitig(f, "laenge", "laenge2").tiefe, richtung: zweiseitig(f, "laenge", "laenge2").richtung, versatz: f._kernLage.versatz });
  const { id } = await kern().ausfuehren(kommando);
  return { id, soll, m };
}
async function stepExakt() {
  status("STEP exakt: Körper werden im CAD-Kern gebaut …");
  try { await exaktesModell({ step: true }); } catch (e) { status(kernFehlerText(e)); }
}
// Werkstatt: Zuschnitt aus dem exakten 3D-Körper gegen die Abwicklung (V = t · L_Mitte · Länge)
async function pruefe3D(f, aus) {
  aus.textContent = "Exakter Körper wird gebaut …"; let id = null;
  try {
    const k = await exaktKoerper(f); id = k.id;
    const e = await kern().ausfuehren({ op: "eigenschaften", ziel: id });
    const z = zuschnittAusVolumen(e.volumen, k.m.t, laengeVon(f), k.m.k, k.soll.theta), d = z - f._res.zuschnitt;
    const gut = e.gueltig && e.geschlossen && Math.abs(d) < 1e-3;
    aus.textContent = `${gut ? "✓" : "⚠"} Körper ${e.gueltig ? "gültig" : "UNGÜLTIG"} · Zuschnitt aus 3D ${z.toFixed(3)} mm, Abwicklung ${f._res.zuschnitt.toFixed(3)} mm (Δ ${d.toFixed(4)})`;
    aus.className = gut ? "hinweis" : "fehler";
  } catch (e) { aus.textContent = kernFehlerText(e); aus.className = "fehler"; }
  finally { if (id) kern().ausfuehren({ op: "freigeben", ziele: [id] }).catch(() => {}); }
}

// Exaktes Modell: Volumenkörper (Extrusion, Drehung inkl. Verbinden/Ausschneiden/Schneiden) und Blechteile werden im Kern
// gebaut; ihr Anzeige-Netz wird durch die Tessellierung des exakten Körpers ersetzt (mit Flächenzuordnung).
// Was noch nicht exakt geht (Abrunden/Fasen, Schale, Muster, Sweep, Loft, Import, Splines …), bleibt als Netz und wird genannt.
let exaktLauf = 0, exaktTimer = null, exaktEig = new Map(), exaktNicht = new Map(); // fid → Eigenschaften aus dem Kern / Grund «nicht exakt»
// Zeichnungsansichten aus dem exakten Modell: Körper in Weltlage bleiben im Kern, bis das nächste Modell fertig ist
let regenStand = 0, exaktFuer = -1, exaktAnsichtIds = [], exaktAnsichtFids = [], exaktVollstaendig = false, exaktBeschaeftigt = 0, exaktAnsichtCache = new Map();
const exaktPlanen = () => { if (!kernAn()) return; regenStand++; clearTimeout(exaktTimer); exaktTimer = setTimeout(() => exaktesModell().catch((e) => status(kernFehlerText(e))), 250); };
// Rückgabe { stand: "aus" | "mesh" | "warte" | "fertig", r? } – für das Planblatt (src/plan.js); «bereit» wird nach der Rechnung aufgerufen
// Im Plan ausgeblendete Körper/Komponenten (plan.aus = { ids, komp }) – unabhängig vom Modell
const planAus = (aus, fid) => { if (!aus) return false; const h = hauptVon(fid); return !!h && (!!aus.ids?.includes(h.id) || !!(h.komponente && aus.komp?.includes(h.komponente))); };
function exakteAnsicht(art, massstab, verdeckt, bereit, schnittLage = null, aus = null) {
  if (!kernAn()) return { stand: "aus" };
  if (exaktFuer !== regenStand || !exaktAnsichtIds.length || !exaktVollstaendig) return { stand: exaktBeschaeftigt || exaktTimer ? "warte" : "mesh" };
  const sichtIds = aus ? exaktAnsichtIds.filter((_, i) => !planAus(aus, exaktAnsichtFids[i])) : exaktAnsichtIds; if (!sichtIds.length) return { stand: "mesh" };
  const key = `${art}|${massstab}|${verdeckt}|${schnittLage ?? ""}|${aus ? JSON.stringify(aus) : ""}`, c = exaktAnsichtCache.get(key), R = ANSICHT_RICHTUNGEN[art];
  if (c?.r) return { stand: "fertig", r: c.r };
  if (c?.fehler || !R) return { stand: "mesh" };
  if (!c) {
    exaktAnsichtCache.set(key, {});
    const gen = exaktFuer, d = R.d, oben = R.oben, ach = kameraAchsen(d, oben), K = kern(), temp = [];
    (async () => {
      let ziele = sichtIds, loops = [];
      if (schnittLage != null) { // Schnitt: alles mit d·p > lage entfernen, Schnittflächen aus den Schnittkanten verketten
        const dn = ach.n, punkt = dn.map((v) => v * schnittLage); ziele = [];
        for (const id of sichtIds) {
          try {
            const g = (await K.ausfuehren({ op: "halbraum", ziel: id, punkt, normale: dn })).id; temp.push(g); ziele.push(g);
            const sn = await K.ausfuehren({ op: "schnitt", ziel: id, ebene: { punkt, normale: dn } }); loops.push(...kettenAusKanten(sn.kanten));
          } catch (e) { if (e.code !== "FEHLGESCHLAGEN" && e.code !== "UNGUELTIG") throw e; } // Körper liegt ganz hinter der Schnittebene
        }
        if (!ziele.length) throw new Error("Schnittebene trifft keinen Körper");
      }
      const p = await K.ausfuehren({ op: "projektion", ziele, richtung: ach.n, xAchse: ach.x, verdeckt });
      const r = ansichtAusProjektion(p, { d, oben, massstab, verdeckt }); if (!r) throw new Error("Ansicht ist leer");
      if (schnittLage != null) r.flaechen = loops.map((l) => l.map((w) => r.abbild(w)));
      return r;
    })().then((r) => { if (gen === exaktFuer) { exaktAnsichtCache.set(key, { r }); bereit(); } })
      .catch((e) => { if (gen === exaktFuer) { exaktAnsichtCache.set(key, { fehler: e.message }); bereit(); } })
      .finally(() => { if (temp.length) K.ausfuehren({ op: "freigeben", ziele: temp }).catch(() => {}); });
  }
  return { stand: "warte" };
}
function ersetzeNetz(mesh, n, M) { // Anzeige-Netz durch die Tessellierung des exakten Körpers ersetzen (Flächenzuordnung je Dreieck)
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(n.positionen, 3)); g.setAttribute("normal", new THREE.BufferAttribute(n.normalen, 3)); g.setIndex(new THREE.BufferAttribute(n.indizes, 1));
  const l = new THREE.BufferGeometry(); l.setAttribute("position", new THREE.BufferAttribute(n.linien, 3));
  if (M) { g.applyMatrix4(M); l.applyMatrix4(M); }
  mesh.geometry.dispose(); mesh.geometry = g;
  const kante = mesh.children.find((c) => c.isLineSegments); if (kante) { kante.geometry.dispose(); kante.geometry = l; }
  mesh.userData.exakt = { flaechen: n.flaechen }; // Dreieck → Flächenindex (Auswahl auf exakte Topologie)
}
// Genauigkeitsstatus je Feature (kern/genauigkeit.js): exakt, hybrid, Netz (Näherung), nicht unterstützt, Fehler; abgeleitete Features erben die ungenauere Klasse
function aktualisiereGenauigkeit() {
  const kernBereit = kernAn() && exaktFuer === regenStand, offen = kernAn() && !kernBereit;
  const erg = bewerteGenauigkeit({ features: doc.features, kernAn: kernAn() && !offen, exakt: new Set(kernBereit ? exaktEig.keys() : []), exaktTeil: kernBereit ? exaktTeile : new Set(), nicht: kernBereit ? exaktNicht : new Map() });
  for (const f of doc.features) { const r = erg.get(f.id); f._genau = r ? (offen && r.klasse !== "exact" && r.klasse !== "failed" ? { ...r, grund: "exakte Berechnung läuft …" } : r) : null; }
  const st = modellStatus(erg, doc.features); modellGenauigkeit = st; return st;
}
let exaktTeile = new Set(); // Features, deren Geometrie als Teil eines exakten Blechkörpers vorliegt (z. B. Quetschfalte)
let modellGenauigkeit = { gesamt: "exact", zaehl: {}, nichtExakt: [] };
const GENAU_TEXT = { exact: "exakt", hybrid: "teilweise exakt", mesh: "Näherung (Netz)", unsupported: "nicht unterstützt", failed: "Fehler" };
async function exaktesModell({ step = false } = {}) { // step: exakte Körper als STEP herunterladen statt Netze ersetzen
  if (!kernAn()) return;
  const lauf = step ? null : ++exaktLauf, stand = regenStand, uebernommen = new Set(), K = kern(), ids = [], koerper = new Map(), nicht = new Map(), blech = new Map(), netzVon = new Map(); // netzVon: Körperschlüssel → fid des Netzes (Kopien «id:k» → «id:k:0»)
  const x = async (k) => { const r = await K.ausfuehren(k); if (r.id) ids.push(r.id); return r; };
  const vereinige = async (liste) => { let a = liste[0]; for (const b of liste.slice(1)) a = (await x({ op: "boolesch", art: "vereinigen", a, b })).id; return a; };
  const markiereZiel = (f, grund) => { if (f.ziel && f.ziel !== "alle") nicht.set(f.ziel, grund); else for (const k of koerper.keys()) nicht.set(k, grund); };
  // Abrunden/Fasen einer Extrusion wie gerundeteExtrusion(): erst Kanten entlang der Extrusion, dann Boden/Deckel
  const kantenRunden = async (w, kr, f, s) => {
    const senk = kr.find((k) => k.kanten !== "quer"), quer = kr.find((k) => k.kanten !== "senkrecht"), lage = extrusionsHoehen({ ebene: E_(s.ebene), abstand: zweiseitig(f, "abstand", "abstand2").tiefe, richtung: zweiseitig(f, "abstand", "abstand2").richtung });
    for (const [k, art] of [[senk, "senkrecht"], [quer, "quer"]]) {
      if (!k) continue;
      const kanten = extrusionsKanten(await K.ausfuehren({ op: "topologie", ziel: w }), lage, art), mass = art === "quer" ? Math.min(k.mass, Math.abs(zweiseitig(f, "abstand", "abstand2").tiefe) / 2 - 0.01) : k.mass;
      if (kanten.length && mass > 0) w = (await x(k.art === "fase" ? { op: "fasen", ziel: w, d: mass, kanten } : { op: "verrunden", ziel: w, r: mass, kanten })).id;
    }
    return w;
  };
  exaktBeschaeftigt++;
  try {
    for (const f of doc.features) {
      if (!step && lauf !== exaktLauf) return;
      if (f._aus || f._fehler) continue;
      if (["vorlage", "profil", "blech"].includes(f.typ)) {
        if (f._kernLage && !f.versteckt && !lageVon(f)) { const k = await exaktKoerper(f); ids.push(k.id); blech.set(f.id, k.id); }
      } else if (f.typ === "extrusion" || f.typ === "drehung") {
        const s = finde(f.skizze), op = f.vorgang || "neu";
        let kmd;
        try {
          const profile = exakteProfile(s, f);
          if (!profile.length) throw new NichtExakt("kein geschlossenes Profil");
          if (f.typ === "extrusion") kmd = extrusionKommandos({ profile, ebene: E_(s.ebene), abstand: zweiseitig(f, "abstand", "abstand2").tiefe, richtung: zweiseitig(f, "abstand", "abstand2").richtung });
          else { const [a, d] = drehAchse(s, f.achse); kmd = rotationKommandos({ profile, ebene: E_(s.ebene), a, d, winkel: f.winkel ?? 360 }); }
        } catch (e) { if (op === "neu") nicht.set(f.id, `${e.message} noch nicht exakt`); else markiereZiel(f, `${f.name}: ${e.message} noch nicht exakt`); continue; }
        let w = await vereinige(await Promise.all(kmd.map(async (k) => (await x(k)).id)));
        const kr = f.typ === "extrusion" ? doc.features.filter((k) => k.typ === "kantenrund" && k.ziel === f.id && !k._aus) : [];
        if (kr.length) try { w = await kantenRunden(w, kr, f, s); } catch (e) { if (op === "neu") nicht.set(f.id, `Abrunden/Fasen: ${e.message}`); else markiereZiel(f, `${f.name} Abrunden/Fasen: ${e.message}`); continue; }
        if (op === "neu") { koerper.set(f.id, w); continue; }
        if (op === "ausschneiden") for (const k of [...blech.keys()]) if ((!f.ziel || f.ziel === "alle" || k.split(":")[0] === f.ziel) && !nicht.has(k)) { // Ausschnitt durch das Blech: im Flachen über die Lochliste, sonst räumlich durchschneiden
          if (f._imFlachen || finde(k.split(":")[0])?._flach) continue;
          try { blech.set(k, (await x({ op: "boolesch", art: "abziehen", a: blech.get(k), b: w })).id); } catch (e) { nicht.set(k, `${f.name} (Ausschneiden): ${e.message}`); }
        }
        const ziele = f.ziel && f.ziel !== "alle" ? [f.ziel].filter((z) => koerper.has(z)) : [...koerper.keys()];
        for (const z of op === "verbinden" ? ziele.slice(0, 1) : ziele) {
          if (nicht.has(z)) continue;
          koerper.set(z, (await x({ op: "boolesch", art: { verbinden: "vereinigen", ausschneiden: "abziehen", schneiden: "schneiden" }[op], a: koerper.get(z), b: w })).id);
        }
      } else if (f.typ === "kanten3d") { // angeklickte Kanten: Kante über ihren Mittelpunkt (Toleranz 0.2 mm für Netzkanten)
        const z = f.ziel; if (!koerper.has(z) || nicht.has(z) || !(f.kanten || []).length) continue;
        if (lageVon(hauptVon(z))) { nicht.set(z, `${f.name} an verschobener Komponente noch nicht exakt`); continue; }
        const kanten = f.kanten.map((k) => ({ punkt: k.a.map((v, i) => (v + k.b[i]) / 2), toleranz: 0.2 })), mass = Math.max(0.1, +f.mass || 1);
        try { koerper.set(z, (await x(f.art === "fase" ? { op: "fasen", ziel: koerper.get(z), d: mass, kanten } : { op: "verrunden", ziel: koerper.get(z), r: mass, kanten })).id); }
        catch (e) { nicht.set(z, `${f.name}: ${e.message}`); }
      } else if (f.typ === "schale") { // Wände nach innen, Boden/Deckel der Extrusion offen
        const z = finde(f.ziel); if (!koerper.has(f.ziel) || nicht.has(f.ziel)) continue;
        if (!["oben", "unten", "beide"].includes(f.offen)) { nicht.set(f.ziel, "Schale ohne offene Seite noch nicht exakt"); continue; }
        try {
          const lage = extrusionsHoehen({ ebene: E_(finde(z.skizze).ebene), abstand: zweiseitig(z, "abstand", "abstand2").tiefe, richtung: zweiseitig(z, "abstand", "abstand2").richtung });
          const offen = extrusionsFlaechen(await K.ausfuehren({ op: "topologie", ziel: koerper.get(f.ziel) }), lage, f.offen);
          koerper.set(f.ziel, (await x({ op: "schale", ziel: koerper.get(f.ziel), dicke: f.dicke > 0 ? f.dicke : 2, offen })).id);
        } catch (e) { nicht.set(f.ziel, `${f.name}: ${e.message}`); }
      } else if (f.typ === "teilen") { // Körper an einer Ebene teilen: Halbräume; der obere Teil bleibt am Ziel, der untere wird «Teilen:0»
        if (blech.has(f.ziel)) { nicht.set(f.ziel, `${f.name} an Blechteil noch nicht exakt`); continue; }
        if (!koerper.has(f.ziel) || nicht.has(f.ziel)) continue;
        try {
          const e = bezugEbene(f.ebene), id0 = koerper.get(f.ziel), wo = f.behalten === "oben" ? [1] : f.behalten === "unten" ? [-1] : [1, -1], teile = [];
          for (const sg of wo) teile.push((await x({ op: "halbraum", ziel: id0, punkt: e.o, normale: e.n.map((v) => -sg * v) })).id);
          koerper.set(f.ziel, teile[0]); if (teile[1]) { koerper.set(f.id, teile[1]); netzVon.set(f.id, `${f.id}:0`); }
        } catch (e) { nicht.set(f.ziel, `${f.name}: ${e.message}`); }
      } else if (["kmuster", "kspiegel", "bewegen"].includes(f.typ)) { // wie koerperTransform(): Kopien «id:k» oder Lage ändern
        const z = f.ziel;
        if (blech.has(z)) { nicht.set(z, `${f.name} an Blechteil noch nicht exakt`); continue; }
        if (!koerper.has(z) || nicht.has(z)) continue;
        const kopie = f.typ === "kspiegel" || f.typ === "kmuster" || f.kopie;
        const anzahl = f.typ === "kmuster" ? (f.art === "kreis" ? Math.max(2, Math.round(f.anzahl)) : Math.max(1, Math.round(f.anzahl || 1)) * Math.max(1, Math.round(f.anzahl2 || 1))) : 2;
        try {
          let id = koerper.get(z);
          for (let k = 1; k < anzahl; k++) {
            const m = matrixZeilen(transformAus(f, k).elements);
            if (!kopie) id = (await x({ op: "matrix", ziel: id, m })).id;
            else { koerper.set(`${f.id}:${k}`, (await x({ op: "matrix", ziel: koerper.get(z), m })).id); netzVon.set(`${f.id}:${k}`, `${f.id}:${k}:0`); }
          }
          if (!kopie) koerper.set(z, id);
        } catch (e) { nicht.set(z, `${f.name}: ${e.message}`); }
      } else if (f.typ === "flaeche") { // Flächenblech: Fläche bis Biegebeginn, Bausteinprofile exakt mit derselben Eckregel wie die Abwicklung
        if (f.versteckt || !f._bleche) continue;
        const m = material(f.material), ebene = blechEbene(finde(f.skizze).ebene, f, m);
        const flachJetzt = !!f._flach, manuell = f._bleche.some((bl) => bl.abw.loecher?.some((h) => !h._auto));
        // Ausschnitte: im flachen Blech Teil der Platte; im gefalteten Blech exakt nur, wenn sie ganz in der ebenen Platte liegen (Biegezonen brauchen die Abbildung auf die Biegung)
        const profilVon = (poly) => ({ start: poly[0], segmente: poly.slice(1).map((q) => ({ bis: q })) });
        for (const [i, bl] of f._bleche.entries()) {
          try {
            if (flachJetzt) { // abgewickeltes Blech: flache Platte aus dem Zuschnitt mit allen Ausschnitten
              const plan = flaechenblechPlan(bl, ebene, m, f.sichtseite === -1 ? -1 : 1);
              blech.set(`${f.id}:${i}`, (await x({ ...plan.platte, profil: profilVon(bl.abw.umriss), loecher: (bl.abw.loecher || []).map(profilVon) })).id);
            } else {
              let id = await baueFlaechenblech(x, flaechenblechPlan(bl, ebene, m, f.sichtseite === -1 ? -1 : 1));
              const von = (bl.abw.loecher || []).filter((h) => !h._auto);
              if (von.length) {
                const kz = bl.gruppen.map((g, k) => { const p = bl.profile[k]; if (!p) return 0; try { const q = bausteinQuerschnitt(p.baustein, m); return q ? Math.max(0, -q.xFlach) : 0; } catch { return 0; } });
                const platte = plattenUmriss(bl.pts, bl.gruppen, kz, new Map(bl.profile.map((p, k) => [k, p?.teil]).filter(([, t]) => t)));
                if (von.some((h) => !h.every((q) => innen(q, platte)))) throw new Error("Ausschnitt reicht in die Biegezone (dort noch nicht exakt)");
                const eb = flaechenblechPlan(bl, ebene, m, f.sichtseite === -1 ? -1 : 1).platte.ebene;
                for (const h of von) id = (await x({ op: "boolesch", art: "abziehen", a: id, b: (await x({ op: "extrusion", profil: { start: h[0], segmente: h.slice(1).map((q) => ({ bis: q })) }, ebene: { ...eb, ursprung: eb.ursprung.map((w, j) => w - eb.n[j] * m.t) }, hoehe: 3 * m.t })).id })).id;
              }
              blech.set(`${f.id}:${i}`, id);
            }
          }
          catch (e) { nicht.set(`${f.id}:${i}`, e.message); }
        }
      } else if (f.typ === "rundblech") { // Mantel als Drehkörper um die Ebenennormale (Meridianebene u/n)
        if (f.versteckt || !f._rund) continue;
        const E = E_(f.ebene), q = rundMeridian(f, material(f.material)), profil = { start: q[0], segmente: q.slice(1, 4).map((p) => ({ bis: p })) };
        try {
          let id = (await x({ op: "rotation", profil, ebene: { ursprung: E.o, x: E.u, n: E.v.map((v) => -v) }, winkel: Math.min(360, f.winkel || 360), achse: { punkt: E.o, richtung: E.n } })).id;
          if (rohrNeigung(f)) id = (await x({ op: "halbraum", ziel: id, punkt: E.o, normale: rohrSchnitt(f).N.toArray() })).id;
          blech.set(f.id, id);
        }
        catch (e) { nicht.set(f.id, e.message); }
      } else if (f.typ === "detail3d") { // STEP der Vorlage exakt importieren und an die Kante legen
        if (f.versteckt || !f._detail3d) continue;
        const v = f._detail3d.vorlage; if (!v.source?.step) { nicht.set(f.id, "Vorlage ohne STEP-Körper"); continue; }
        try { const r = await K.ausfuehren({ op: "stepImport", text: v.source.step }); ids.push(...r.ids); const id = await vereinige(r.ids); koerper.set(f.id, (await x({ op: "matrix", ziel: id, m: f._detail3d.m })).id); }
        catch (e) { nicht.set(f.id, e.message); }
      } else if (f.typ === "import" && f.step) { // STEP-Import als exakter Körper
        try { const r = await K.ausfuehren({ op: "stepImport", text: f.step }); ids.push(...r.ids); koerper.set(f.id, await vereinige(r.ids)); }
        catch (e) { nicht.set(f.id, `STEP-Import: ${e.message}`); }
      } else if (f.typ === "loft") { // Loft: Profile der Skizzen als Schnitte (exakt, glatte Verbindung)
        if (f.versteckt) continue;
        try {
          const sks = [f.profil1, f.profil2, f.profil3].filter(Boolean).map((id) => finde(id));
          const schnitte = sks.map((sk) => { const p = exakteProfile(sk, f).sort((a, c) => c.flaeche - a.flaeche)[0]; if (!p) throw new Error("Profil fehlt"); return { profil: p.profil, ebene: kernEbene(E_(sk.ebene)) }; });
          koerper.set(f.id, (await x({ op: "loft", schnitte })).id);
        } catch (e) { nicht.set(f.id, `Loft: ${e.message}`); }
      } else if (f.typ === "sweep") { // Sweep: Profil an seiner Lage entlang des (ebenen) Pfads; Führungsschiene/parallele Ausrichtung noch Netz
        if (f.versteckt) continue;
        try {
          if (f.fuehrung || f.orientierung === "parallel") throw new Error("Führungsschiene bzw. parallele Ausrichtung noch nicht exakt");
          const sk = finde(f.skizze), prof = exakteProfile(sk, f).sort((a, c) => c.flaeche - a.flaeche)[0]; if (!prof) throw new Error("Profil fehlt");
          let pfad, pe;
          if (String(f.pfad).startsWith("E:")) { const [a0, b0] = String(f.pfad).slice(2).split(";").map(zahl3), d = [b0[0] - a0[0], b0[1] - a0[1], b0[2] - a0[2]], L = Math.hypot(...d) || 1, ux = d.map((v) => v / L), h = Math.abs(ux[2]) < 0.9 ? [0, 0, 1] : [1, 0, 0], n0 = [ux[1] * h[2] - ux[2] * h[1], ux[2] * h[0] - ux[0] * h[2], ux[0] * h[1] - ux[1] * h[0]], ln = Math.hypot(...n0); pe = { ursprung: a0, x: ux, n: n0.map((v) => v / ln) }; pfad = { start: [0, 0], segmente: [{ bis: [L, 0] }] }; }
          else { const [, sid, ei] = String(f.pfad).split(":"), [psk, el] = skizzeElement(sid, ei), pts = elementPfad(el).filter((p, i, a) => !i || Math.hypot(p[0] - a[i - 1][0], p[1] - a[i - 1][1]) > 1e-6); pe = kernEbene(E_(psk.ebene)); pfad = { start: pts[0], segmente: pts.slice(1).map((q) => ({ bis: q })) }; }
          koerper.set(f.id, (await x({ op: "sweep", pfad, ebene: pe, profil: prof.profil, profilEbene: kernEbene(E_(sk.ebene)) })).id);
        } catch (e) { nicht.set(f.id, `Sweep: ${e.message}`); }
      } else if (f.typ === "kehle") { // Kehl-/Gratblech: Biegeprofil (exakte Bögen) in der lokalen Ebene extrudieren, dann in die Lage der Kehle bringen
        if (f.versteckt || !f._kehle?.T) continue;
        try {
          const k = f._kehle, { kommando } = blechTeilKommando({ res: k.res, t: material(f.material).t, ebene: { o: [0, 0, 0], u: [1, 0, 0], v: [0, 1, 0], n: [0, 0, 1] }, laenge: k.laenge });
          koerper.set(f.id, (await x({ op: "matrix", ziel: (await x(kommando)).id, m: matrixZeilen(k.T.elements) })).id);
        } catch (e) { nicht.set(f.id, `Kehle: ${e.message}`); }
      } else if (f.typ === "import") nicht.set(f.id, "noch nicht exakt");
    }
    // Nahtfahnen an freien Körperkanten: die Fahne gehört zum Blech – Streifen am Rand abziehen, Fahne mit dem Blechkörper vereinigen
    for (const x0 of doc.features) for (const fd of (x0.typ === "naht" && !x0._aus && !x0.versteckt ? x0._fahnen : null) || []) {
      const wirt = fd.hostFid; if (!blech.has(wirt) || nicht.has(wirt)) { if (!nicht.has(wirt)) nicht.set(wirt, "Nahtfahne: Blechkörper nicht exakt"); continue; }
      try {
        const ebene = { ursprung: fd.mid.toArray(), x: fd.c.toArray(), n: fd.e.toArray() };
        const fahne = (await x({ op: "extrusion", profil: fd.profil, ebene, hoehe: fd.L })).id; let wirtId = blech.get(wirt);
        if (fd.versatz < -1e-6) { // Rücksetzung: Streifen am Blechende abziehen
          const rechteck = { start: [fd.versatz - 0.01, -fd.t], segmente: [{ bis: [0.3, -fd.t] }, { bis: [0.3, fd.t] }, { bis: [fd.versatz - 0.01, fd.t] }, { bis: [fd.versatz - 0.01, -fd.t] }] };
          wirtId = (await x({ op: "boolesch", art: "abziehen", a: wirtId, b: (await x({ op: "extrusion", profil: rechteck, ebene, hoehe: fd.L })).id })).id;
        }
        blech.set(wirt, (await x({ op: "boolesch", art: "vereinigen", a: wirtId, b: fahne })).id);
      } catch (e) { nicht.set(wirt, `Nahtfahne: ${e.message}`); }
    }
    // Quetschfalte: Teilkörper (Dreieck, Biegungen, Saum, Wulst) aus derselben Rechnung wie das Netz exakt bauen und mit dem Blechkörper vereinigen
    const teilIds = new Set();
    for (const x0 of doc.features) {
      if (x0.typ !== "quetschfalte" || x0._aus || x0.versteckt || !x0._qk) continue;
      const z = finde(x0.ziel), pi = +String(x0.ecke).split(":")[0], wirt = `${z?.id}:${z?._bleche?.findIndex((b) => b.pi === pi)}`;
      if (!blech.has(wirt) || nicht.has(wirt)) continue;
      try {
        const { desc, M } = x0._qk; let alle = null;
        for (const d of desc) {
          let id;
          if (d.art === "extr") {
            const e = d.lage.elements, ax = [e[0], e[1], e[2]], ay = [e[4], e[5], e[6]], az = [e[8], e[9], e[10]], pos = [e[12], e[13], e[14]], vv = [az[1] * ax[2] - az[2] * ax[1], az[2] * ax[0] - az[0] * ax[2], az[0] * ax[1] - az[1] * ax[0]], sp = vv[0] * ay[0] + vv[1] * ay[1] + vv[2] * ay[2] < 0 ? -1 : 1; // Profil-y muss v = n × x entsprechen
            const kurven = d.shape.curves, pt = (c, tt) => { const q = c.getPoint(tt); return [q.x, sp * q.y]; };
            const profil = { start: pt(kurven[0], 0), segmente: kurven.map((c) => (c.isLineCurve ? { bis: pt(c, 1) } : { bis: pt(c, 1), bogenMitte: pt(c, 0.5) })) };
            id = (await x({ op: "extrusion", profil, ebene: { ursprung: pos, x: ax, n: az }, hoehe: d.tiefe })).id;
            if (d.mitre) id = (await x({ op: "halbraum", ziel: id, punkt: [0, 0, 0], normale: d.mitre.clone().negate().toArray() })).id;
          } else {
            id = (await x({ op: "zylinder", r: d.r, h: d.L, basis: d.start.toArray(), achse: d.achse.toArray() })).id;
            if (d.mitre) id = (await x({ op: "halbraum", ziel: id, punkt: [0, 0, 0], normale: d.mitre.toArray() })).id;
            id = (await x({ op: "halbraum", ziel: id, punkt: d.top.P.toArray(), normale: d.top.n.toArray() })).id;
          }
          alle = alle ? (await x({ op: "boolesch", art: "vereinigen", a: alle, b: id })).id : id;
        }
        const falte = (await x({ op: "matrix", ziel: alle, m: matrixZeilen(M.elements) })).id;
        blech.set(wirt, (await x({ op: "boolesch", art: "vereinigen", a: blech.get(wirt), b: falte })).id);
        teilIds.add(x0.id);
        for (const o of modell.children.filter((o) => o.isMesh && o.userData.fid === x0.id)) { modell.remove(o); o.traverse((c) => c.geometry?.dispose()); } // das Netz der Falte steckt jetzt im exakten Blechkörper
      } catch (e) { nicht.set(wirt, `Quetschfalte: ${e.message}`); }
    }
    exaktTeile = teilIds;
    // Ecknaht (Dreieck in der Fuge) und Schweissnaht (Linse): eigener exakter Körper der Naht
    for (const x0 of doc.features) {
      const d = x0.typ === "naht" && (x0.art === "ecke" || x0.art === "schweiss") && !x0._aus && !x0.versteckt ? x0._eck : null; if (!d) continue;
      try { koerper.set(x0.id, (await x({ op: "extrusion", profil: d.profil, ebene: d.ebene, hoehe: d.L })).id); } catch (e) { nicht.set(x0.id, `Ecknaht: ${e.message}`); }
    }
    // Durchdringungsschutz: Blechteile dürfen sich nie durchdringen – das später angelegte Blechteil wird um den Überschnitt zurückgeschnitten
    let zurueck = 0;
    try {
      const gueltig = (k) => !nicht.has(k) && !(k.includes(":") && nicht.has(k.split(":")[0])), kandidaten = [];
      for (const [k, id] of [...koerper, ...blech]) { const h = hauptVon(k); if (!h || h.versteckt || !gueltig(k)) continue; if (blech.has(k) || h.typ === "blech" || h.typ === "vorlage") kandidaten.push({ k, h, set: (v) => (blech.has(k) ? blech.set(k, v) : koerper.set(k, v)), get: () => (blech.get(k) ?? koerper.get(k)) }); }
      kandidaten.sort((p, q) => doc.features.indexOf(p.h) - doc.features.indexOf(q.h) || (p.k < q.k ? -1 : 1));
      const grenzen = new Map(); for (const c of kandidaten) grenzen.set(c.k, (await K.ausfuehren({ op: "eigenschaften", ziel: c.get() })).grenzen);
      const nah = (a, b) => a && b && [0, 1, 2].every((i) => a.min[i] <= b.max[i] + 0.01 && b.min[i] <= a.max[i] + 0.01);
      for (let j = 1; j < kandidaten.length; j++) for (let i = 0; i < j; i++) {
        const A = kandidaten[i], B = kandidaten[j]; if (lageVon(A.h) || lageVon(B.h) || !nah(grenzen.get(A.k), grenzen.get(B.k))) continue; // Teile mit Komponentenverschiebung: Lage unterschiedlich, hier nicht verglichen
        try {
          const sch = await x({ op: "boolesch", art: "schneiden", a: A.get(), b: B.get() }), vol = (await K.ausfuehren({ op: "eigenschaften", ziel: sch.id })).volumen;
          if (!(vol > 0.02)) continue;
          const neu = await x({ op: "boolesch", art: "abziehen", a: B.get(), b: A.get() }); B.set(neu.id); zurueck++; grenzen.set(B.k, (await K.ausfuehren({ op: "eigenschaften", ziel: neu.id })).grenzen);
        } catch { /* kein Überschnitt berechenbar (z. B. nur Flächenkontakt) */ }
      }
    } catch { /* Durchdringungsschutz ist best effort */ }
    if (step) { // alle sichtbaren exakten Körper (mit Komponentenlage) in eine STEP-Datei
      const ziele = [], namen = [], ungueltig = [];
      for (const [schl, id] of [...koerper, ...blech]) {
        if (nicht.has(schl) || (schl.includes(":") && nicht.has(schl.split(":")[0]))) continue;
        const h = hauptVon(schl); if (!h || h.versteckt) continue;
        const gp = await K.ausfuehren({ op: "eigenschaften", ziel: id }); if (!(gp.gueltig && gp.geschlossen)) { ungueltig.push(h.name); continue; } // nur gültige, geschlossene B-Rep-Körper exportieren
        const L = lageVon(h);
        ziele.push(L ? (await x({ op: "matrix", ziel: id, m: matrixZeilen(L.elements) })).id : id);
        namen.push(schl.includes(":") ? `${h.name} ${schl.split(":")[1]}` : h.name);
      }
      const rest = [...nicht].filter(([fid]) => !finde(fid)?.versteckt).map(([fid, g]) => `${finde(fid)?.name ?? fid} (${g})`);
      if (ungueltig.length) rest.push(...ungueltig.map((n) => `${n} (kein gültiger B-Rep-Körper)`));
      if (!ziele.length) return status(`STEP exakt: keine exakten Körper${rest.length ? ` (nicht exportiert: ${rest.join(", ")})` : ""}.`);
      const { text } = await K.ausfuehren({ op: "stepExport", ziele, namen });
      herunterladen(dateiBasis() + " (exakt).step", text, "application/step");
      return status(rest.length ? `STEP nur teilweise exakt (B-Rep, AP242): ${ziele.length} Körper exportiert · NICHT enthalten: ${rest.join(", ")}.` : `STEP exakt (B-Rep, AP242): ${ziele.length} Körper, alle gültig.`);
    }
    let n = 0; const eig = new Map(), ansichtIds = [], ansichtFids = [];
    for (const [schl, id] of [...koerper, ...blech]) {
      if (nicht.has(schl) || nicht.has(schl.split(":")[0]) && schl.includes(":")) continue;
      const fid = netzVon.get(schl) ?? schl;
      const netze = modell.children.filter((o) => o.isMesh && o.userData.fid === fid && !o.userData.stirn), mesh = netze[0]; if (!mesh) continue;
      const netz = await K.ausfuehren({ op: "tessellieren", ziel: id }), e = await K.ausfuehren({ op: "eigenschaften", ziel: id });
      if (!step && lauf !== exaktLauf) return;
      ersetzeNetz(mesh, netz, lageVon(hauptVon(fid))); n++;
      if (mesh.visible) { const L = lageVon(hauptVon(fid)); ansichtIds.push(L ? (await x({ op: "matrix", ziel: id, m: matrixZeilen(L.elements) })).id : id); ansichtFids.push(fid); }
      for (const o of netze.slice(1)) { modell.remove(o); o.traverse((c) => c.geometry?.dispose()); } // Flächenblech: Platte + Profile → ein exakter Körper
      eig.set(fid, { ...e, verschoben: !!lageVon(hauptVon(fid)) });
    }
    exaktEig = eig; exaktNicht = nicht;
    exaktFuer = stand; aktualisiereGenauigkeit(); zeigeBrowser?.();
    // Zeichnungsansichten: Körper in Weltlage behalten (die der vorigen Runde werden frei), nur wenn alle sichtbaren Körper exakt sind
    const alte = exaktAnsichtIds; ansichtIds.forEach((i) => uebernommen.add(i));
    exaktAnsichtIds = ansichtIds; exaktAnsichtFids = ansichtFids; exaktFuer = stand; exaktAnsichtCache = new Map();
    exaktVollstaendig = modell.children.filter((o) => o.isMesh && o.visible && o.userData.fid).every((o) => o.userData.exakt);
    if (alte.length) K.ausfuehren({ op: "freigeben", ziele: alte }).catch(() => {});
    document.dispatchEvent(new Event("sdcad-exakt")); // Planblatt: Ansichten jetzt aus dem exakten Modell
    if (register === "eigenschaften") zeigeWerkstatt();
    zeigeKanten?.();
    const rest = [...nicht].map(([fid, g]) => `${hauptVon(fid)?.name ?? fid}${fid.includes(":") ? " " + (+fid.split(":")[1] + 1) : ""} (${g})`);
    status(`Exakt aus dem CAD-Kern: ${n} Körper${zurueck ? ` · ${zurueck} Überschneidung${zurueck > 1 ? "en" : ""} zurückgeschnitten` : ""}${rest.length ? ` · als Netz: ${rest.join(", ")}` : ""}`);
  } finally { exaktBeschaeftigt--; const frei = ids.filter((i) => !uebernommen.has(i)); if (frei.length) K.ausfuehren({ op: "freigeben", ziele: frei }).catch(() => {}); }
}

// Prüfen → Eigenschaften (exakt): Volumen, Oberfläche, Schwerpunkt, Abmessungen, Masse, Gültigkeit je Körper aus dem Kern
function zeigeEigenschaften(w) {
  if (!kernAn()) { register = "teil"; return zeigeWerkstatt(); }
  const f3 = (v) => v.toLocaleString("de-CH", { maximumFractionDigits: 3 }), zeilen = [];
  for (const [fid, e] of exaktEig) {
    const f = finde(fid), m = f?.material ? material(f.material) : null, masse = m?.dichte ? e.volumen * m.dichte * 1e-6 : null; // mm³ · kg/dm³
    const ab = e.grenzen.max.map((v, i) => v - e.grenzen.min[i]);
    zeilen.push({ name: f?.name ?? fid, volumen: e.volumen, flaeche: e.flaeche, sp: e.schwerpunkt, ab, masse, material: m?.name ?? "", gueltig: e.gueltig && e.geschlossen, verschoben: e.verschoben });
  }
  w.innerHTML = `<h3>Eigenschaften (exakt, CAD-Kern)</h3>
    <p class="hinweis">Aus den exakten B-Rep-Körpern gerechnet, nicht aus dem Anzeige-Netz. Einheiten: mm, mm², cm³, kg. ${exaktNicht.size ? `Nicht exakt (nicht in der Liste): ${[...exaktNicht].map(([fid, g]) => esc(`${finde(fid)?.name ?? fid} – ${g}`)).join(", ")}.` : ""}</p>
    ${zeilen.length ? `<table class="liste"><thead><tr><th>Körper</th><th class="num">Volumen cm³</th><th class="num">Oberfläche mm²</th><th class="num">Masse kg</th><th>Schwerpunkt mm</th><th>Abmessungen mm</th><th>Gültig</th></tr></thead><tbody>
    ${zeilen.map((z) => `<tr><td>${esc(z.name)}${z.verschoben ? ' <small title="Schwerpunkt und Abmessungen ohne Komponentenverschiebung">*</small>' : ""}</td><td class="num">${f3(z.volumen / 1000)}</td><td class="num">${f3(z.flaeche)}</td><td class="num">${z.masse == null ? "–" : f3(z.masse)}</td><td>${z.sp.map((v) => v.toFixed(2)).join(" / ")}</td><td>${z.ab.map((v) => v.toFixed(2)).join(" × ")}</td><td>${z.gueltig ? "✓" : "✗ ungültig"}</td></tr>`).join("")}
    </tbody></table><div class="reihe"><button class="knopf" id="kEigCsv">Als CSV speichern</button></div>` : '<p class="leer">Noch keine exakten Körper – der Kern rechnet nach jeder Änderung neu.</p>'}`;
  if ($("kEigCsv")) $("kEigCsv").onclick = () => herunterladen(`${doc.nr || "modell"} Eigenschaften.csv`, ["Körper;Volumen mm3;Oberfläche mm2;Masse kg;Material;Schwerpunkt X;Y;Z;Abmessung X;Y;Z;gültig",
    ...zeilen.map((z) => [z.name, z.volumen.toFixed(3), z.flaeche.toFixed(3), z.masse == null ? "" : z.masse.toFixed(4), z.material, ...z.sp.map((v) => v.toFixed(3)), ...z.ab.map((v) => v.toFixed(3)), z.gueltig ? "ja" : "nein"].join(";"))].join("\n"), "text/csv");
}
if ($("wEigenschaften")) $("wEigenschaften").onclick = () => { register = "eigenschaften"; zeigeWerkstatt(); status(exaktEig.size ? `Eigenschaften von ${exaktEig.size} exakten Körpern.` : "Der CAD-Kern rechnet noch …"); };

// ------------------------------------------------------------ Austausch: STEP/STL exportieren, STEP/STL importieren
function sichtbareKoerper() {
  modell.updateMatrixWorld(true);
  return modell.children.filter((o) => o.isMesh && o.visible && !o.userData.konstruktion && o.userData.fid).map((o) => {
    const g = (o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone()).applyMatrix4(o.matrixWorld);
    const f = hauptVon(o.userData.fid); return { name: f?.name || "Koerper", dreiecke: g.attributes.position.array };
  });
}
const dateiBasis = () => `${doc.nr || ""} ${doc.objekt || "Modell"}`.trim().replace(/[\\/:*?"<>|]+/g, "-");
function exportiere(art) {
  if (art === "stepExakt") return stepExakt();
  const k = sichtbareKoerper(); if (!k.length) return status("Keine sichtbaren Körper zum Exportieren.");
  if (art === "step") herunterladen(dateiBasis() + ".step", stepDatei(k, { name: doc.objekt || "Modell" }), "application/step");
  else herunterladen(dateiBasis() + ".stl", stlDatei(k, doc.objekt || "Modell"), "model/stl");
}
let occt = null;
async function occtLaden() { // OpenCascade (WebAssembly, ~7 MB) erst beim ersten STEP-Import laden
  if (occt) return occt;
  for (const basis of ["occt/", "dist/occt/"]) {
    try {
      await new Promise((ok, nein) => { const sc = document.createElement("script"); sc.src = basis + "occt-import-js.js"; sc.onload = ok; sc.onerror = nein; document.head.appendChild(sc); });
      occt = await window.occtimportjs({ locateFile: (n) => basis + n }); return occt;
    } catch {}
  }
  throw new Error("STEP-Leser nicht gefunden (Ordner «occt» fehlt neben dem Programm)");
}
function importFeature(name, pos, stepText = null) {
  if (pos.length < 9) return status("In der Datei sind keine Dreiecke.");
  const u8 = new Uint8Array(pos.buffer, pos.byteOffset, pos.byteLength); let bin = "";
  for (let i = 0; i < u8.length; i += 0x8000) bin += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000));
  const f = { id: neueId(), typ: "import", name, daten: btoa(bin), ...(stepText && kernAn() && stepText.length < 8e6 ? { step: stepText } : {}) };
  einfuegen(f); auswahl = f.id; regen(); merke?.();
  status(`«${name}» importiert: ${pos.length / 9} Dreiecke${bin.length > 3e6 ? " – gross: das Projekt wird entsprechend gross" : ""}. Wie ein Körper verwendbar (Verschieben, Vereinigen, Ausschneiden …).`);
}
async function importiereDatei(datei) {
  const name = datei.name.replace(/\.[^.]+$/, ""), endung = datei.name.split(".").pop().toLowerCase(), puffer = await datei.arrayBuffer();
  try {
    if (endung === "stl") return importFeature(name, stlLesen(puffer));
    if (endung === "step" || endung === "stp") {
      status("STEP wird gelesen …"); const o = await occtLaden(), r = o.ReadStepFile(new Uint8Array(puffer), null);
      if (!r.success || !r.meshes.length) return status("STEP-Datei enthält keine lesbaren Körper.");
      const teile = r.meshes.map((m) => { const p = m.attributes.position.array, ix = m.index?.array; if (!ix) return Float32Array.from(p); const out = new Float32Array(ix.length * 3); ix.forEach((v, i) => { out[i * 3] = p[v * 3]; out[i * 3 + 1] = p[v * 3 + 1]; out[i * 3 + 2] = p[v * 3 + 2]; }); return out; });
      const alle = new Float32Array(teile.reduce((s, t) => s + t.length, 0)); let o2 = 0; for (const t of teile) { alle.set(t, o2); o2 += t.length; }
      return importFeature(name, alle, new TextDecoder().decode(puffer));
    }
    if (endung === "dxf") return dxfImport(name, new TextDecoder().decode(puffer));
    if (endung === "dwg") return status("DWG ist ein geschlossenes Format und lässt sich hier noch nicht lesen – bitte in der CAD-Software als DXF speichern («Speichern unter … DXF», z. B. AutoCAD, BricsCAD, LibreCAD) und die DXF-Datei importieren.");
    status("Importierbar sind STEP (.step/.stp), STL und DXF.");
  } catch (err) { status("Import fehlgeschlagen: " + err.message); }
}
// DXF über Datei › Import: eigene Skizze auf der gewählten Ebene (Elemente fixiert wie beim Einfügen in eine offene Skizze)
function dxfImport(name, text) {
  const r = dxfLesen(text); if (!r.elemente.length) return status("In der DXF-Datei sind keine Linien, Bögen oder Kreise.");
  if (r.elemente.length > 3000 && !confirm(`${r.elemente.length} Elemente – das kann langsam werden. Trotzdem importieren?`)) return;
  if (dlg) $("dAbbrechen").click();
  dialog({ titel: `DXF importieren: ${name}`, sofort: true, felder: [{ id: "ebene", label: "Auf Ebene", wahl: "ebene", optionen: ebenenOpt(null), wert: einst.neu.ebene }],
    hinweis: `${r.elemente.length} Elemente${r.faktor !== 1 ? `, Einheit umgerechnet ×${r.faktor}` : ""}. Ebene wählen und OK – die Zeichnung wird als fixierte Skizze angelegt (Schritt in der Zeitleiste).`,
    ok: (w) => {
      const f = { id: neueId(), typ: "skizze", name: `DXF ${name}`, ebene: w.ebene, elemente: [], bedingungen: [] };
      einfuegen(f); for (const el of r.elemente) { el.id = neueElementId(f); f.elemente.push(el); f.bedingungen.push({ typ: "fix", e: el.id }); }
      loeseSkizze(f); regen(); ansicht("iso"); const weg = Object.entries(r.uebersprungen).map(([k, n]) => `${n}× ${k}`).join(", ");
      status(`${r.elemente.length} Elemente aus «${name}.dxf» importiert${weg ? ` · übersprungen: ${weg}` : ""}.`);
    } });
}
$("tDxf").onclick = () => { if (skizze) $("dxfDatei").click(); };
$("importDatei").onchange = async (e) => { const d = e.target.files[0]; e.target.value = ""; if (d) await importiereDatei(d); };
if (pc) $("wZuletzt").hidden = false;
$("wZuletzt").onclick = (e) => {
  e.stopPropagation();
  const menue = $("zuletztMenue"), liste = zuletzt();
  if (!menue.hidden) { menue.hidden = true; return; }
  menue.innerHTML = liste.length ? liste.map((p, i) => `<button data-i="${i}" title="${esc(p)}"><b>${esc(dateiname(p))}</b><small>${esc(p.slice(0, -dateiname(p).length))}</small></button>`).join("")
    : '<p class="hinweis">Noch keine Projekte gespeichert oder geöffnet.</p>';
  const r = $("wZuletzt").getBoundingClientRect();
  Object.assign(menue.style, { left: Math.min(r.left, innerWidth - 330) + "px", top: r.bottom + 4 + "px" });
  menue.hidden = false;
};
$("zuletztMenue").onclick = async (e) => {
  const i = e.target.closest("button")?.dataset.i; if (i == null) return;
  $("zuletztMenue").hidden = true;
  const pfad = zuletzt()[+i];
  try { const d = await pc.invoke("datei_lesen", { pfad }); ladeProjekt(d.inhalt, d.pfad); }
  catch (err) {
    try { localStorage.setItem(ZULETZT, JSON.stringify(zuletzt().filter((p) => p !== pfad))); } catch {}
    status("Datei nicht gefunden, aus der Liste entfernt: " + err);
  }
};
document.addEventListener("click", (e) => { if (!e.target.closest?.("#zuletztMenue")) $("zuletztMenue").hidden = true; });
$("datei").onchange = async (e) => { ladeProjekt(await e.target.files[0].text()); e.target.value = ""; };
document.addEventListener("keydown", (e) => {
  if (!(e.ctrlKey || e.metaKey)) return;
  const k = e.key.toLowerCase();
  if (k === "s") { e.preventDefault(); speichernStart(!e.shiftKey); }
  else if (k === "p") { e.preventDefault(); drucke(blechteile(), true); }
  else if (k === "d" && !e.target.closest?.("input,select,textarea")) { e.preventDefault(); dupliziere(hauptVon(auswahl)); }
  else if (k === "o") { e.preventDefault(); $("wOeffnen").click(); }
});
// Entf: gewähltes Teil löschen (Rückgängig holt es zurück)
document.addEventListener("keydown", (e) => {
  if (e.key !== "Delete" || skizze || dlg || !$("einst").hidden || e.target.closest?.("input,select,textarea")) return;
  const f = hauptVon(auswahl); if (!f) return; // Blechteil eines Details: ganzes Detail
  e.preventDefault();
  const benutzt = doc.features.filter((x) => x.skizze === f.id || x.ebene === f.id || Object.values(x).some((v) => typeof v === "string" && v.includes(":" + f.id + ":")) || [x.ref, x.ref2].includes(f.id));
  entferneFeature(f); auswahl = null; regen();
  status(`«${f.name}» gelöscht${benutzt.length ? ` – ${benutzt.map((x) => x.name).join(", ")} hat jetzt einen fehlenden Bezug` : ""}. Strg+Z holt es zurück.`);
});
let neuBestaetigt = 0;
$("wDrucken").onclick = () => drucke(blechteile(), true);
$("wNeu").onclick = () => {
  if (Date.now() - neuBestaetigt > 3000) { neuBestaetigt = Date.now(); status("Nochmals «Neu» klicken, um alles zu löschen."); return; }
  doc = { features: [], zaehler: 1, objekt: doc.objekt, nr: doc.nr }; auswahl = null; projektPfad = null; titel(); regen(); status("Neues Projekt.");
};

// ------------------------------------------------------------ Start
groesse();
if (!doc.features.length) { // Beispiel: Traufblech als Vorlage
  doc.features.push({ id: neueId(), typ: "vorlage", name: "Traufblech", vorlage: "traufe", params: standardwerte("traufe"), material: einst.materialien[0].id, laenge: 1000, richtung: "eine", ebene: "XY" });
}
regen();
auswahl = doc.features.find((f) => f._res)?.id || null; markiere(); zeigeBrowser(); zeigeWerkstatt();
ansicht("iso");
kernAnzeige(); bedienungAnwenden();
function skizzeSenkrecht() { // Blick immer genau senkrecht auf die Skizzenebene (nur Drehung in der Ebene erlaubt)
  const E = E_(skizze.f.ebene), n = V(E.n), d = kamera.position.clone().sub(steuerung.target), L = d.length(); if (L < 1e-6) return;
  const c = d.dot(n) / L; if (Math.abs(c) > 0.9999999) return;
  kamera.position.copy(steuerung.target).add(n.multiplyScalar(L * (c < 0 ? -1 : 1)));
}
(function schleife() { if (skizze) skizzeSenkrecht(); steuerung.update(); if (orthoAn) orthoUpdate(); richtungSkalieren(); renderer.render(szene, kamera); zeichneWuerfel(); zeigeLabels(); requestAnimationFrame(schleife); })();
// Nur für automatische Tests (Adresse mit ?test): Bildschirmposition von Weltpunkten
// Kontextleiste (siehe src/kontext.js): passende Werkzeuge zur Auswahl
initKontext({
  kontext: () => { const f = hauptVon(auswahl); return { feature: f?.typ === "flaechenteil" ? f.eltern : f, zeiger: zeigerAuswahl }; },
  frei: () => !dlg && !skizze && !kantenWz && !messen && !modus2d,
  signatur: () => [auswahl, JSON.stringify(zeigerAuswahl), doc.features.length, dlg ? 1 : 0, skizze ? 1 : 0, kantenWz ? 1 : 0, messen ? 1 : 0, modus2d ? 1 : 0, hauptVon(auswahl)?.elemente?.length ?? ""].join("|"),
  skizzeArt: (f) => ({ geschlossen: schleifen(f).length > 0, offen: ketten(f).length > 0, leer: !f.elemente.length }),
  bearbeite: (f) => bearbeite(f),
  kanteAktion: (art) => kantenDialog(undefined, { ...zeigerAuswahl, art }),
  dachAusSkizze: (id) => dachDialog(undefined, { skizze: id }),
  flaecheSkizze: (ref) => neueSkizze(ref), flaecheBlech: (ref) => blechAufFlaeche(ref), ebeneSkizze: (id) => neueSkizze(id),
});
if (new URLSearchParams(location.search).has("test")) window.sdcadTest = { startseite: () => startseite(true), blatt: (id) => werkstattblatt(finde(id)), hoverAnzahl: () => hoverGruppe.children.length, freiraumTest: (id) => { const f = finde(id), bl = f._bleche[0], n = bl.gruppen.length, out = []; for (let k = 0; k < n; k++) { const kv = (k - 1 + n) % n, p1 = bl.profile[k], p2 = bl.profile[kv]; out.push([k, p1?.biegungen?.[0]?.abstand, p2?.biegungen?.[0]?.abstand, bl.gruppen[k].punkte[0]]); } return out; }, regenTest: () => { try { regen(); return "ok " + doc.features.map((f) => f.id + ":" + (f._fehler || "")).join("|"); } catch (e) { return String(e.stack).slice(0, 600); } }, nahtEck: (id) => { const d = nahtEckDaten(finde(id)); return d && { L: d.L, pts: d.pts, apex: d.apex.toArray() }; }, nahtWinkel: (id) => { const x = finde(id), { a: ka, b: kb } = nahtPaar(x); return { w: nahtWinkelAuto(x), kk: [ka?.kand, kb?.kand].map((l) => l?.map((c) => ({ h: +c.h.toFixed(2), a: c.art, n: c.normale.toArray().map((v) => +v.toFixed(2)), i: c.inn.toArray().map((v) => +v.toFixed(2)) }))), ka: ka && { inn: ka.inn?.toArray(), n: ka.normale.toArray(), p: ka.punkte.map((q) => q.toArray()) }, kb: kb && { inn: kb.inn?.toArray(), n: kb.normale.toArray(), p: kb.punkte.map((q) => q.toArray()) } }; }, meshFarbe: (fid) => { const f = [0xff0000, 0x00aa00, 0x0000ff, 0xffaa00, 0xaa00ff, 0x00aaaa]; let i = 0; for (const o of modell.children) if (o.isMesh && String(o.userData.fid).split(":")[0] === fid) { o.material = new THREE.MeshBasicMaterial({ color: f[i++ % f.length], side: THREE.DoubleSide }); } }, meshListe: (fid) => modell.children.filter((o) => o.isMesh && String(o.userData.fid).split(":")[0] === fid).map((o) => { o.updateMatrixWorld(true); const b = new THREE.Box3().setFromObject(o); return { mn: b.min.toArray().map((v) => +v.toFixed(2)), mx: b.max.toArray().map((v) => +v.toFixed(2)), n: o.geometry.attributes.position.count, tief: (() => { const P = o.geometry.attributes.position, r = []; for (let i = 0; i < P.count; i++) { const v = new THREE.Vector3().fromBufferAttribute(P, i).applyMatrix4(o.matrixWorld); r.push(v.toArray().map((x) => +x.toFixed(2))); } return r.sort((x, y) => x[1] - y[1]).slice(0, 8); })() }; }), quetschEckenSchirm: () => { const z = quetschWz?.f; if (!z) return null; const s0 = finde(z.skizze), B = basis(blechEbene(s0.ebene, z, material(z.material))), r = leinwand.getBoundingClientRect(); return quetschEcken(z).map((c) => { const w = aufSchirm(new THREE.Vector3(c.p[0], c.p[1], 0).applyMatrix4(B).toArray()); return { key: c.key, x: r.left + w[0], y: r.top + w[1] }; }); }, setzeKamera: (p, z) => { kamera.position.set(...p); steuerung.target.set(...z); steuerung.update(); }, einstSeite: (id) => { einstRegister = id; zeigeEinst(); }, sim: simulation.test, simApi: simulation, fov: () => kamera.fov, meshPunkte: (fid) => { const r = []; for (const o of modell.children) if (o.isMesh && String(o.userData.fid).split(":")[0] === fid) { o.updateMatrixWorld(true); const P = o.geometry.attributes.position; for (let i = 0; i < P.count; i++) r.push(new THREE.Vector3().fromBufferAttribute(P, i).applyMatrix4(o.matrixWorld).toArray()); } return r; }, quetschAbw: (id) => { const bl = finde(id)?._bleche?.[0]; return bl ? { umriss: bl.abw.umriss, arten: bl.abw.linien.map((l) => l.art), quetsch: [...(bl.quetsch?.keys() || [])], fehler: bl.quetschFehler, loecher: (bl.abw.loecher || []).length } : null; }, dachPunkt: (id, i, ds = 0.5, dt = 0.5) => { const d = finde(id), fl = d?._dach?.flaechen?.[i], g = d && finde(d.gebaeude); if (!fl || !g) return null; const R = dachRahmen(fl), p = dachWelt(g, R.S.punkt(R.s0 + (R.s1 - R.s0) * ds, R.t0 + (R.t1 - R.t0) * dt, d._schichten?.oben ?? 0)), q = aufSchirm(p), r = leinwand.getBoundingClientRect(); return [r.left + q[0], r.top + q[1]]; }, kantenWahl: (key) => wendeKantenWz(key), kantenAktiv: () => menueKante?.key ?? null, profilKanten: () => { const f = kantenWz?.f; return f ? profilKanten(f).map((k) => ({ key: k.key, mitte: (() => { const m = k.p[0].clone().add(k.p[1]).multiplyScalar(0.5), q = aufSchirm(m.toArray()), r = leinwand.getBoundingClientRect(); return [r.left + q[0], r.top + q[1]]; })() })) : []; }, kontext: kontextAktionen, zeigerAuswahl: () => zeigerAuswahl, pruefeNeueVersion, offlineStatus: () => offlineStatus, skizzeAktiv: () => !!skizze, blechDaten: (id) => (finde(id)?._bleche || []).map((bl) => ({ loecher: (bl.abw.loecher || []).length, lochB: (() => { const l = bl.abw.loecher?.[0] || []; const xs = l.map((q) => q[0]); return xs.length ? Math.max(...xs) - Math.min(...xs) : 0; })(), pts: bl.pts, gruppen: bl.gruppen.map((g) => ({ laenge: +g.laenge.toFixed(2), n: g.punkte.length, gerade: g.gerade, a: g.punkte[0].map((x) => +x.toFixed(1)), b: g.punkte.at(-1).map((x) => +x.toFixed(1)) })), profile: bl.profile.map((p) => p && { ymax: Math.max(...(p.quer || [[0, 0]]).map((q) => Math.abs(q[1]))), t: p.t, lage: !!p.lage, ekk: 0, zugabe: p.zugabe, teil: p.teil, biegungen: p.biegungen?.length }) })), quetschDaten: (id) => { const f = finde(id); if (!f?._q) return null; const q = f._q, z = q.zus; return JSON.parse(JSON.stringify({ wand: q.wand, O: q.O, X3: q.X3, Y3: q.Y3, Z3: q.Z3, ri: q.ri, geometrie: z.geometrie, m: z.m, ell: z.ell, hoehe: z.hoehe, hoehe2: z.hoehe2, psi: z.psi, sS: z.sS, pruefung: q.pruefung })); }, kameraBlick: () => kamera.getWorldDirection(new THREE.Vector3()).toArray(), kameraQ: () => kamera.quaternion.toArray(), griffe: () => griffe.map((g) => ({ feld: g.feld, faktor: g.faktor, dir: g.dir.toArray(), pos: g.pos.toArray(), schirm: (() => { const r = leinwand.getBoundingClientRect(), A = aufSchirm(g.pos.toArray()), B = aufSchirm(g.pos.clone().addScaledVector(g.dir, griffLaenge(g.pos) * 0.7).toArray()); return { b: [r.left + B[0], r.top + B[1]], a: [r.left + A[0], r.top + A[1]] }; })() })), kameraZiel: () => { const t = flaechenTreffer(new THREE.Vector2(0, 0)); return { abstand: t ? t.distance : null, kamera: kamera.position.toArray(), min: Math.max(4, modellRadius() * 0.0004) }; }, maxLinie: (fid) => { let m = 0, n = 0, bad = 0; for (const o of modell.children) if (o.userData.fid === fid) for (const l of o.children) { const p = l.geometry?.attributes.position; if (!p) continue; for (let i = 0; i + 1 < p.count; i += 2) { const d = Math.hypot(p.getX(i) - p.getX(i + 1), p.getY(i) - p.getY(i + 1), p.getZ(i) - p.getZ(i + 1)); if (!isFinite(d)) bad++; else m = Math.max(m, d); n++; } } let tm = 0, ti = -1; for (const o of modell.children) if (o.userData.fid === fid && o.geometry?.attributes.position) { const p = o.geometry.attributes.position; for (let i = 0; i + 2 < p.count; i += 3) for (const [a, b] of [[0, 1], [1, 2], [2, 0]]) { const d = Math.hypot(p.getX(i + a) - p.getX(i + b), p.getY(i + a) - p.getY(i + b), p.getZ(i + a) - p.getZ(i + b)); if (d > tm) { tm = d; ti = i / 3; } } } return { max: m, n, bad, dreieckMax: tm, ti }; }, setzeAuftrag: (x) => setzeAuftrag(x), exportiere: (n, i, art) => herunterladen(n, i, "text/plain", null, art), waehle: (id) => waehle(id), segmenteImKasten: (praefix, u0, u1, v0, v1, w0 = -1e9, w1 = 1e9) => { let n = 0; for (const o of modell.children.filter((x) => x.isMesh && String(x.userData.fid).startsWith(praefix))) { const pos = o.children[0]?.geometry.attributes.position; if (!pos) continue; for (let i = 0; i + 1 < pos.count; i += 2) { const m = new THREE.Vector3((pos.getX(i) + pos.getX(i + 1)) / 2, (pos.getY(i) + pos.getY(i + 1)) / 2, (pos.getZ(i) + pos.getZ(i + 1)) / 2), uv = aufEbene("XY", m); const E0 = E_("XY"); uv[2] = m.clone().sub(V(E0.o)).dot(V(E0.n)); if (uv[0] > u0 && uv[0] < u1 && uv[1] > v0 && uv[1] < v1 && uv[2] > w0 && uv[2] < w1) n++; } } return n; }, kanteBei: (x, y) => kanteUnterMaus(kantenWz.f, { clientX: x, clientY: y, pointerType: "mouse" }), kantenAn: () => kantenLabels.filter((l) => l.an).map((l) => l.kante), sichtbareKoerper: () => modell.children.filter((o) => o.isMesh && o.visible).length, pivot: () => drehPivot?.toArray() ?? null, griff: () => { const r = leinwand.getBoundingClientRect(); return griffe.map((g) => { const A = aufSchirm(g.pos.toArray()), B = aufSchirm(g.pos.clone().addScaledVector(g.dir, griffLaenge(g.pos)).toArray()); return { feld: g.feld, x: r.left + (A[0] + B[0]) / 2, y: r.top + (A[1] + B[1]) / 2 }; }); }, waehl: () => waehlGruppe.children.length, hover: () => hoverGruppe.children.length, beendeSkizze: () => beendeSkizze(), kamera: () => ({ pos: kamera.position.toArray(), ziel: steuerung.target.toArray() }), dok: () => JSON.parse(JSON.stringify(doc, (k, v) => (k.startsWith("_") ? undefined : v))), raster: () => einst.skizze.raster, steuerung: () => ({ damping: steuerung.enableDamping, mitte: steuerung.mouseButtons.MIDDLE, links: steuerung.mouseButtons.LEFT, rechts: steuerung.mouseButtons.RIGHT, zoomZeiger: steuerung.zoomToCursor }), bearbeite: (id) => bearbeite(doc.features.find((f) => f.id === id)), exaktAnsicht: (art, m = 1, verdeckt = true, lage = null) => { const e = exakteAnsicht(art, m, verdeckt, () => {}, lage); return { stand: e.stand, exakt: !!e.r?.exakt, flaechen: e.r?.flaechen ?? null, sichtbar: e.r?.sichtbar ?? null, verdeckt: e.r?.verdeckt ?? null, breite: e.r?.breite, hoehe: e.r?.hoehe }; }, koerperInfo: () => { modell.updateMatrixWorld(true); return modell.children.filter((o) => o.isMesh && o.userData.fid).map((o) => { const g = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry, p = g.attributes.position.array; let v = 0;
    for (let i = 0; i < p.length; i += 9) v += (p[i] * (p[i + 4] * p[i + 8] - p[i + 5] * p[i + 7]) - p[i + 1] * (p[i + 3] * p[i + 8] - p[i + 5] * p[i + 6]) + p[i + 2] * (p[i + 3] * p[i + 7] - p[i + 4] * p[i + 6])) / 6;
    g.computeBoundingBox(); return { fid: o.userData.fid, exakt: !!o.userData.exakt, flaechen: o.userData.exakt?.flaechen.length ?? 0, volumen: v, min: g.boundingBox.min.toArray(), max: g.boundingBox.max.toArray() }; }); }, abw: () => doc.features.flatMap((f) => (f._bleche || []).map((b) => b.abw.flaeche)), profilUeberschneidung: () => { // Test: Kantenprofile desselben Blechs untereinander (ohne Grundplatte)
    const out = []; const ms = modell.children.filter((o) => o.isMesh && String(o.userData.fid).includes(":"));
    const je = new Map(); ms.forEach((m) => { const k = m.userData.fid; if (!je.has(k)) je.set(k, []); je.get(k).push(m); });
    for (const [fid, l] of je) { const pr = l.slice(1); for (let i = 0; i < pr.length; i++) for (let j = i + 1; j < pr.length; j++) {
      const A = new Brush(nurPos(pr[i].geometry)), Bb = new Brush(nurPos(pr[j].geometry)); A.updateMatrixWorld(); Bb.updateMatrixWorld();
      const p = csg.evaluate(A, Bb, INTERSECTION).geometry.attributes.position?.array || []; let v = 0;
      for (let k = 0; k + 8 < p.length; k += 9) v += p[k] * (p[k + 4] * p[k + 8] - p[k + 5] * p[k + 7]) - p[k + 1] * (p[k + 3] * p[k + 8] - p[k + 5] * p[k + 6]) + p[k + 2] * (p[k + 3] * p[k + 7] - p[k + 4] * p[k + 6]);
      let ymin = Infinity, ymax = -Infinity; for (let k = 1; k < p.length; k += 3) { ymin = Math.min(ymin, p[k]); ymax = Math.max(ymax, p[k]); }
      out.push({ fid, i, j, v: Math.round(Math.abs(v / 6)), y: p.length ? [+ymin.toFixed(2), +ymax.toFixed(2)] : null }); } }
    return out; }, schirm: (p) => { const r = leinwand.getBoundingClientRect(), s = aufSchirm(p); return [r.left + s[0], r.top + s[1]]; }, schirmUV: (e, uv) => { const r = leinwand.getBoundingClientRect(), s = aufSchirm(zu3D(e, uv).toArray()); return [r.left + s[0], r.top + s[1]]; }, koerper: () => modell.children.filter((o) => o.isMesh).map((o) => { const g = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry, a = g.attributes.position.array; let v = 0;
    for (let i = 0; i < a.length; i += 9) v += a[i] * (a[i + 4] * a[i + 8] - a[i + 5] * a[i + 7]) - a[i + 1] * (a[i + 3] * a[i + 8] - a[i + 5] * a[i + 6]) + a[i + 2] * (a[i + 3] * a[i + 7] - a[i + 4] * a[i + 6]);
    const bx = new THREE.Box3().setFromBufferAttribute(g.attributes.position); return { fid: o.userData.fid, dreiecke: a.length / 9, volumen: Math.round(v / 6), min: bx.min.toArray(), max: bx.max.toArray() }; }), aufSchirm: (p) => { const r = leinwand.getBoundingClientRect(), s = aufSchirm(p); return [r.left + s[0], r.top + s[1]]; } };
// PC-Programm: Update-Prüfung beim Start (abschaltbar in den Einstellungen)
if (pc && einst.programm.updates) pc.invoke("nach_update_suchen").catch(() => {}); // ohne Netz still weiter
// PC-Programm: per Doppelklick geöffnete .sdcad-Datei laden
pc?.invoke("startdatei").then((d) => d && ladeProjekt(d.inhalt, d.pfad)).catch((e) => status("Datei konnte nicht geöffnet werden: " + e));
// Web-Version: offline nutzbar machen (nicht im PC-Programm und nicht per Doppelklick)
// Service Worker (Web/Tablet): Offline-Kaltstart, versionskonsistenter Zwischenspeicher, kontrolliertes Update (siehe web/sw.js)
let offlineStatus = { bekannt: false, vollstaendig: false, fehlt: [] }, swRegistrierung = null;
if ("serviceWorker" in navigator && location.protocol.startsWith("http") && !("__TAURI_INTERNALS__" in window)) {
  navigator.serviceWorker.addEventListener("message", (e) => {
    if (!e.data?.sdcad || e.data.typ !== "offline-status") return;
    const war = offlineStatus.vollstaendig; offlineStatus = { bekannt: true, vollstaendig: e.data.vollstaendig, fehlt: e.data.fehlt || [], version: e.data.version };
    if (e.data.vollstaendig && !war) { try { if (localStorage.getItem("sdcad-offline-bereit") !== e.data.version) { localStorage.setItem("sdcad-offline-bereit", e.data.version); status("Offline-Betrieb bereit: Programm und CAD-Kern sind auf diesem Gerät gespeichert."); } } catch { /* Speicher nicht verfügbar */ } }
  });
  navigator.serviceWorker.register("sw.js", { updateViaCache: "none" }).then((reg) => {
    swRegistrierung = reg;
    const frage = () => { const w = reg.active; if (w) { w.postMessage({ typ: "status" }); w.postMessage({ typ: "nachladen" }); } }; // grosse Dateien nachladen lassen und Stand erfragen
    if (reg.active) frage(); navigator.serviceWorker.ready.then(frage);
  }).catch(() => {});
}
window.addEventListener("offline", () => zeigeMeldung(`Offline: Du arbeitest lokal weiter – Projekte werden auf diesem Gerät gespeichert, die Cloud wartet auf die Verbindung.${offlineStatus.bekannt && !offlineStatus.vollstaendig ? " Achtung: nicht alle Programmteile sind offline verfügbar (z. B. exakter CAD-Kern)." : ""}`, "ok", 8000));
window.addEventListener("online", () => zeigeMeldung("Wieder online.", "ok", 3000));
// «Jetzt neu laden»: eine wartende neue Version zuerst aktivieren (kontrolliertes Update), dann neu laden
async function neuLaden() {
  const reg = swRegistrierung || (await navigator.serviceWorker?.getRegistration?.().catch(() => null));
  if (reg?.waiting) { navigator.serviceWorker.addEventListener("controllerchange", () => location.reload(), { once: true }); reg.waiting.postMessage({ typ: "aktivieren" }); setTimeout(() => location.reload(), 4000); } else location.reload();
}
// Neue Version erkennen (Web/Tablet): version.json beim Start, beim Zurückkehren in die App und alle 5 Minuten; die App bleibt im Hintergrund sonst auf dem alten Stand
let neueVersionGemeldet = "";
async function pruefeNeueVersion() {
  if (!location.protocol.startsWith("http") || "__TAURI_INTERNALS__" in window || VERSION === "dev") return;
  try { const j = await (await fetch("version.json?t=" + Date.now(), { cache: "no-store" })).json(); if (j?.version && j.version !== VERSION && j.version !== neueVersionGemeldet) { neueVersionGemeldet = j.version; zeigeMeldung(`Neue Version ${j.version} ist verfügbar (du nutzt ${VERSION}).`, "ok", 0, { text: "Jetzt neu laden", fn: () => neuLaden() }); } } catch { /* offline: nichts melden */ }
}
setTimeout(pruefeNeueVersion, 3000); setInterval(pruefeNeueVersion, 5 * 60 * 1000); document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") pruefeNeueVersion(); });
// Startseite: neues Modell, Öffnen, zuletzt geöffnete Projekte, Hilfe – abschaltbar in Einstellungen › Allgemein
async function startseite(erzwingen = false) {
  if (!erzwingen && (new URLSearchParams(location.search).has("test") || einst.allgemein.startseite === false) || document.getElementById("startseite") || document.querySelector(".modal:not([hidden])")) return;
  if (einst.firma.logo && einst.firma.logoHell === undefined) { try { Object.assign(einst.firma, await logoVarianten(einst.firma.logo)); einstSpeichern(); } catch { /* Logo bleibt unverändert */ } }
  if (document.getElementById("startseite")) return;
  const el = document.createElement("div"); el.className = "modal startmodal"; el.id = "startseite"; el.setAttribute("role", "dialog"); el.setAttribute("aria-label", "Startseite");
  const liste = pc ? zuletzt() : [], zu = () => el.remove();
  const aktion = (id) => { zu(); $(id).click(); };
  const h = new Date().getHours(), gruss = h >= 5 && h < 11 ? "Guten Morgen" : h < 17 && h >= 11 ? "Guten Tag" : h >= 17 && h < 22 ? "Guten Abend" : "Gute Nacht";
  const voll = cloud.angemeldet ? cloud.client.sitzung?.name || "" : "", vorname = (einst.firma.vorname || voll.split(" ")[0] || "").trim(), datum = new Date().toLocaleDateString("de-CH", { weekday: "long", day: "numeric", month: "long" }), logoB = logoBanner(einst.firma);
  const IC = { neu: '<path d="M6 3h8l4 4v14H6z"/><path d="M14 3v4h4M12 11v6M9 14h6"/>', oeffnen: '<path d="M3 7.5h6l2 2.5h10V19H3z"/>', weiter: '<path d="M5 12h13M13 6l6 6-6 6"/>', hilfe: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9.6a2.5 2.5 0 1 1 3.6 2.2c-.7.4-1.1.9-1.1 1.7M12 17v.2"/>', datei: '<path d="M6 3h8l4 4v14H6z"/><path d="M14 3v4h4M9 13h6M9 16h6"/>', cloud: '<path d="M7 18h10a4 4 0 0 0 .6-7.95A5.5 5.5 0 0 0 7.1 8.6 4.7 4.7 0 0 0 7 18z"/>' };
  const sv = (k) => `<svg viewBox="0 0 24 24" aria-hidden="true">${IC[k]}</svg>`;
  const karte = (k, titel, text, attr, haupt = false) => `<button class="startknopf karte${haupt ? " haupt" : ""}" ${attr}><span class="szeichen">${sv(k)}</span><span class="stext"><b>${titel}</b><small>${text}</small></span></button>`;
  const zeileHtml = (k, name, meta, attr, tip) => `<button class="startknopf zeile" ${attr} title="${esc(tip)}"><span class="szeichen">${sv(k)}</span><span class="stext"><b>${name}</b><small>${meta}</small></span></button>`;
  window.__startZeile = zeileHtml; // von der Cloud-Liste nachgeladen
  const initialen = (voll || vorname).split(/\s+/).filter(Boolean).slice(0, 2).map((x) => x[0].toUpperCase()).join("");
  el.innerHTML = `<div class="startkarte">
    <div class="skopf"><div class="stitel"><b>Heute</b><span>${esc(datum)}${voll || vorname ? " · " + esc(voll || vorname) : ""}</span></div>
      <button class="sinfo" data-a="wHilfe" title="Hilfe und Kurzanleitung (F1)" aria-label="Hilfe">i</button>${initialen ? `<span class="savatar" aria-hidden="true">${esc(initialen)}</span>` : ""}
      <button class="startzu" data-a="weiter" aria-label="Schliessen" title="Schliessen (Esc)">×</button></div>
    <div class="sbanner"><div class="sbbild"><div class="sbemblem" aria-hidden="true"></div><div class="sblogo${logoB?.platte ? " platte" : ""}">${logoB ? `<img src="${logoB.src}" alt="Firmenlogo">` : '<img src="logo.png" alt="Spengler Digital CAD"><b>Spengler Digital <i>CAD</i></b>'}</div></div>
      <div class="sbgruss">${gruss}${vorname ? ", " + esc(vorname) : ""}</div></div>
    <section class="startmain">
      <h4>Beginnen</h4>
      <div class="startkarten">
        ${karte("neu", "Neues Modell", "Leeres Projekt anlegen", 'data-a="wNeu"', true)}
        ${karte("oeffnen", "Öffnen", `Aus der Cloud oder vom ${pc ? "PC" : "Gerät"}`, 'data-a="wOeffnen"')}
        ${karte("weiter", "Weiterarbeiten", `${esc(doc.modellName || doc.objekt || "Letzter Stand")} · ${doc.features.length} ${doc.features.length === 1 ? "Schritt" : "Schritte"}`, 'data-a="weiter"')}
        ${karte("hilfe", "Hilfe", "Anleitung und Kürzel (F1)", 'data-a="wHilfe"')}
      </div>
      <h4>Zuletzt verwendet</h4>
      <div class="startzuletzt">${pc && liste.length ? liste.slice(0, 3).map((pf, i) => zeileHtml("datei", esc(dateiname(pf)), esc(pf.slice(0, -dateiname(pf).length)), `data-z="${i}"`, pf)).join("") : ""}<div id="startCloud"><p class="hinweis">Lade …</p></div></div>
      <div class="startfuss"><label><input type="checkbox" id="startNie"> Startseite nicht mehr zeigen</label><span style="flex:1"></span><span>Version ${esc(VERSION)}</span></div>
    </section></div>`;
  document.body.appendChild(el);
  // Zuletzt gespeicherte Modelle aus der Cloud (sobald angemeldet; die Anmeldung wird beim Start erst wiederhergestellt)
  const cloudListe = async (versuch = 0) => {
    const box = el.querySelector("#startCloud"); if (!box || !el.isConnected) return;
    if (!cloud.angemeldet) { if (versuch < 4) { box.innerHTML = '<p class="hinweis">Lade …</p>'; return setTimeout(() => cloudListe(versuch + 1), 900); } box.innerHTML = '<p class="hinweis">Nicht angemeldet – Einstellungen › Konto &amp; Cloud.</p>'; return; }
    try {
      const l = (await cloud.client.dateiListe()).filter((d) => d.art === "modell").sort((a, b) => String(b.geaendert).localeCompare(String(a.geaendert))).slice(0, 5);
      box.innerHTML = l.length ? l.map((d) => window.__startZeile("cloud", esc(d.name.replace(/\.sdcad$/i, "")), `${esc(d.ordner.split("/").slice(-2, -1)[0] || "")} · ${d.geaendert ? new Date(d.geaendert).toLocaleDateString("de-CH") : ""} · v${d.version}`, `data-c="${esc(d.id)}"`, d.ordner)).join("") : '<p class="hinweis">Noch keine Modelle in der Cloud gespeichert.</p>';
    } catch { box.innerHTML = '<p class="hinweis">Cloud gerade nicht erreichbar.</p>'; }
  };
  cloudListe();
  el.addEventListener("click", async (e) => {
    if (e.target === el) return zu();
    const b = e.target.closest("button"); if (!b) return;
    if (el.querySelector("#startNie")?.checked) { einst.allgemein.startseite = false; einstSpeichern(); }
    if (b.dataset.a === "weiter") return zu();
    if (b.dataset.a) return aktion(b.dataset.a);
    if (b.dataset.c) { const id = b.dataset.c; zu(); try { const d = await cloud.client.dateiLaden(id); ladeProjekt(d.kodierung === "base64" ? new TextDecoder().decode(Uint8Array.from(atob(d.inhalt), (c) => c.charCodeAt(0))) : d.inhalt); status(`«${d.name}» aus der Cloud geöffnet.`); } catch (err) { status("Cloud-Datei konnte nicht geöffnet werden: " + (err?.message ?? err)); } return; }
    if (b.dataset.z != null) { const pf = zuletzt()[+b.dataset.z]; zu(); try { const d = await pc.invoke("datei_lesen", { pfad: pf }); ladeProjekt(d.inhalt, d.pfad); } catch (err) { status("Datei nicht gefunden: " + err); } }
  });
  el.addEventListener("keydown", (e) => { if (e.key === "Escape") zu(); });
}
status("Beispiel geladen. Neu zeichnen: «Skizze» → Ebene wählen → Linienzug zeichnen → «Blechprofil».");
startseite();
