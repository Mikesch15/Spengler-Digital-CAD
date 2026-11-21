// Spengler Digital CAD 0.2 – Fusion-artige Oberfläche: Skizzen, Extrusion, Blechprofil, Vorlagen
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { planModul } from "./plan.js";
import { cloudModul } from "./cloud.js";
import { werkzeugAuf, flanschStandard, werkzeugName, folgeUmkehren, folgeAnhaengen } from "../kern/flansch.js";
import { projekteModul } from "./projekte.js";
import { kantenLage, detailAusStep, pruefeDetail, meshAusVorlage } from "../kern/vorlagen/detail3d.js";
import { selbsttest } from "../kern/selbsttest.js";
import { regionen, inRegion } from "../kern/regionen.js";
import { ablageModul } from "./ablage.js";
import { rechteckDach, waende, DACHFORMEN } from "../kern/dach/form.js";
import { dachAusFlaechen } from "../kern/dach/flaechen.js";
import { aufmassAusPunkt } from "../kern/dach/lukarneAufmass.js";
import { eindeckung as eindeckungKern, ziegelPrisma } from "../kern/dach/eindeckung.js";
import { lukarne as lukarneKern, LUKARNENARTEN } from "../kern/dach/lukarne.js";
import { elementRechteck, elementKoerper, elementFlaeche, kaminBleche, veluxListe, ELEMENTARTEN } from "../kern/dach/elemente.js";
import { dachBleche, dachSegmente, BLECHARTEN } from "../kern/dach/bleche.js";
import { dachSchnitt, dachSchnittSvg, DETAILARTEN } from "../kern/dach/detail.js";
import { fluegelDach, polygonDach, grundrissForm, GRUNDFORMEN } from "../kern/dach/fluegel.js";
import { flaechenKoerper as dachFlaechenKoerper, dachMengen } from "../kern/dach/koerper.js";
import { DECKUNGEN_STANDARD, AUFBAU_STANDARD, grundeinstellung as dachGrund, schichten as dachSchichten, pruefeDach } from "../kern/dach/vorlagen.js";
import { FARBEN, LINIENARTEN, farbeHex, standardLayer, skizzenDxf } from "../kern/zeichnung2d.js";
import { sichere, geloeschte, inPapierkorb, zurueckholen, einspielen } from "../kern/sicherung.js";
import { bausteinFolge, hatAusdruck, pruefeEignung, parameterText, parameterAusText } from "../kern/vorlagen/parameter.js";
import { kantenGeometrie, RICHTUNGEN as ANSICHT_RICHTUNGEN } from "./ansicht.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { Brush, Evaluator, ADDITION, SUBTRACTION, INTERSECTION } from "three-bvh-csg";
import { berechne, kontur, polylinie, grenzen, versatzLinie } from "../kern/geometrie.js";
import { VORLAGEN, VORLAGE, standardwerte, freiesProfil, profilErweitern, alsZeilen } from "../kern/profile.js";
import { MATERIALIEN, LAGER, quelle, kFaktorAusProbe } from "../kern/materialien.js";
import { abwicklungDxf, abwicklungenDxf, flaecheDxf, rundblechDxf } from "../kern/dxf.js";
import { scheibeMitRand, kragen, kegelstumpf, beurteilen, zuschnitt, zuschnittDxf, VERFAHREN } from "../kern/umformung.js";
import { rundblechAbwicklung, rundblechSvg } from "../kern/abwicklungRund.js";
import { stepDatei, stlDatei, stlLesen } from "../kern/step.js";
import { cadKlient } from "../kern/cad/klient.js";
import { blechTeilKommando, extrusionKommandos, rotationKommandos, extrusionsHoehen, extrusionsKanten, extrusionsFlaechen, matrixZeilen, flaechenblechPlan, baueFlaechenblech, bausteinQuerschnitt } from "../kern/cad/featureBau.js";
import { skizzenProfile, profilPolygon, NichtExakt } from "../kern/cad/skizzeProfile.js";
import { ansichtAusProjektion, kameraAchsen, kettenAusKanten } from "../kern/cad/ansichtExakt.js";
import { zuschnittAusVolumen } from "../kern/cad/blech.js";
import { dxfLesen } from "../kern/dxflesen.js";
import { Font } from "three/examples/jsm/loaders/FontLoader.js";
import schriftDaten from "three/examples/fonts/droid/droid_sans_bold.typeface.json";
import { ausschnittWerkzeug, ausschnittKante } from "../kern/flaechenblech.js";
import { BAUSTEINE_STANDARD, flaechenblech, plattenUmriss, kantenGruppen, gegenUhrzeiger, bausteinProfil, eckFaktoren } from "../kern/flaechenblech.js";
import { profilSvg, abwicklungSvg, zuschnittSvg, bausteinSvg, bausteinGrenzen } from "../kern/zeichnung.js";
import { folge } from "../kern/details.js";
import { stueckliste, stuecklisteCsv } from "../kern/auftrag.js";
import { materialbedarf } from "../kern/zuschnitt.js";
import { vorbereiten, loeseSkizze, analyse, fuegeHinzu, bereinige, punkte as skizzenPunkte, kantenZahl, rechteckBedingungen, neueElementId, sichereIds, IST_MASS } from "../kern/skizzenloeser.js";
import { abstandGerade, winkelZwischen } from "../kern/bedingungen.js";
import { rechne, parameterWerte, istZahl, namenIn, NAME as PARAMNAME } from "../kern/ausdruck.js";
import { splinePunkte, ellipsePunkte } from "../kern/skizze.js";
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
    if (b.typ === "winkel" || b.typ === "knick") v = Math.sign(b.w || 1) * Math.abs(v) * Math.PI / 180;
    if (Math.abs(v - b.w) > 1e-9) { b.w = v; neu = true; }
  }
  return neu;
}
// Blechteile eines Flächenblechs haben die ID «fid:nr»; sie sind keine eigenen Features
const teilFinden = (id) => { const [fid, i] = String(id ?? "").split(":"); return i == null ? null : finde(fid)?._teile?.[+i] || null; };
const waehlbar = (id) => finde(id) || teilFinden(id);
const hauptVon = (id) => finde(String(id ?? "").split(":")[0]);
// Werkstatt-Einstellungen (pro Gerät): kalibrierte und eigene Materialien, Lagerformate
const EINST = "sdcad-einstellungen";
const standardEinst = () => JSON.parse(JSON.stringify({
  materialien: MATERIALIEN, ...LAGER, vorlagen: [], bausteine: BAUSTEINE_STANDARD, eigeneDetails: [], detailvorlagen: [],
  neu: { laenge: 1000, stueck: 1, material: MATERIALIEN[0].id, ebene: "XY", lage: "mitte" }, // Vorgaben für neue Teile
  skizze: { raster: 0, abstand: 80 },                                                 // Fangraster mm (0 = aus), Abstand der Teile in 3D mm
  anzeige: { abB: true },                                                             // Spalte «ab Kante B»
  druck: { betrieb: "", abwicklung: true, etikett: true, bedarf: true },              // Werkstattblatt und Stückliste
  etiketten: { spalten: 3, zeilen: 8, breite: 70, hoehe: 37, oben: 0, links: 0, abstandX: 0, abstandY: 0 }, // mm
  programm: { darstellung: "auto", updates: true, zuletzt: 8, kern: "netz" },      // kern: "netz" (wie 0.2) | "occt" (exakter CAD-Kern, Beta)
}));
const GRUPPEN = ["neu", "skizze", "anzeige", "druck", "etiketten", "programm"];
// Gespeicherte oder geladene Einstellungen über die Standardwerte legen (neue Werte bekommen ihren Standard)
function mitStandard(e) {
  const s = standardEinst();
  const r = { ...s, ...e };
  for (const g of GRUPPEN) r[g] = { ...s[g], ...(e?.[g] || {}) };
  if (!Array.isArray(r.materialien) || !r.materialien.length) r.materialien = s.materialien;
  if (!Array.isArray(r.bausteine)) r.bausteine = s.bausteine;
  if (!Array.isArray(r.eigeneDetails)) r.eigeneDetails = [];
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
  const r = modellRadius(), minAbst = Math.max(4, r * 0.0004), maxAbst = Math.max(r * 40, 2000);
  let nd = d * faktor; if (faktor < 1) nd = Math.max(nd, Math.min(d, minAbst)); else nd = Math.min(nd, Math.max(d, maxAbst));
  const k = nd / d, ko = kamera.position.clone().sub(P).multiplyScalar(k), zo = steuerung.target.clone().sub(P).multiplyScalar(k); kamera.position.copy(P).add(ko); steuerung.target.copy(P).add(zo);
  kamera.near = Math.max(0.3, Math.min(r / 100, nd * 0.02)); kamera.far = Math.max(kamera.far, r * 50, nd * 20); kamera.updateProjectionMatrix();
}
leinwand.addEventListener("wheel", (e) => {
  if (skizze || modus2d) return; // in der Skizze bleibt das bisherige Zoomen
  e.preventDefault(); e.stopImmediatePropagation();
  const dy = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaMode === 2 ? e.deltaY * 100 : e.deltaY, treffer = flaechenTreffer(ndc(e));
  let P = treffer?.point; if (!P) P = strahl.ray.intersectPlane(new THREE.Plane().setFromNormalAndCoplanarPoint(kamera.getWorldDirection(new THREE.Vector3()), steuerung.target), new THREE.Vector3());
  if (P) ziehNahe(P, Math.exp(dy * 0.0011 * steuerung.zoomSpeed));
}, { capture: true, passive: false });
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
function blechAusKette(pts, m, riAn = () => null) {
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
  return berechne(start, ops, m.t, m.ri, m.k);
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
function koerperGeometrie(formen_, ebene, tiefe, richtung, ueber = 0) {
  const geo = new THREE.ExtrudeGeometry(formen_, { depth: tiefe + 2 * ueber, bevelEnabled: false, curveSegments: 48 });
  geo.translate(0, 0, -ueber);
  if (richtung === "umgekehrt") geo.translate(0, 0, -tiefe); else if (richtung === "symmetrisch") geo.translate(0, 0, -tiefe / 2);
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
function koerper(formen_, ebene, tiefe, richtung, farbe, fid) {
  const geo = new THREE.ExtrudeGeometry(formen_, { depth: tiefe, bevelEnabled: false, curveSegments: 48 });
  if (richtung === "umgekehrt") geo.translate(0, 0, -tiefe); else if (richtung === "symmetrisch") geo.translate(0, 0, -tiefe / 2);
  geo.applyMatrix4(basis(ebene));
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
  const flaeche = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ color: grund ? 0x8a969e : 0xe8a33d, transparent: true, opacity: grund ? 0.14 : 0.2, side: THREE.DoubleSide, depthWrite: false }));
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
  if (a) status({ ebene: "Ebene, Konstruktionsebene oder ebene Körperfläche in der Ansicht anklicken – oder in der Liste wählen.", kante: "Kante anklicken: Skizzenlinie, Körperkante oder Achse.",
    punkt: "Punkt anklicken: Skizzenpunkt, Körperecke oder Ursprung.", zylinder: "Zylindrische Fläche anklicken (extrudierter Kreis).", pfad: "Linie, Kreis oder Körperkante als Pfad anklicken.",
    profil: "Skizzenprofil anklicken – in die geschlossene Fläche oder auf ihre Linie.", flaechen: "Fläche(n) in der Skizze anklicken (jede Teilfläche einzeln, nochmals anklicken = abwählen).", kette: "Offenen Linienzug einer Skizze anklicken." }[a.wahl] + ` (Feld «${a.label}»)`);
}
// Vorschau beim Überfahren: was angeklickt würde, leuchtet orange auf (Fläche, Ebene, Kante, Punkt, Profil) – wie in Fusion
const hoverGruppe = new THREE.Group(); szene.add(hoverGruppe);
const HOVERFARBE = 0xff8a1f, hoverMat = () => new THREE.MeshBasicMaterial({ color: HOVERFARBE, transparent: true, opacity: 0.5, side: THREE.DoubleSide, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
const hoverCache = new WeakMap(); // Geometrie → Dreiecke je Eckpunkt (für zusammenhängende ebene Flächen)
function flaechenRegion(hit) { // alle zusammenhängenden, koplanaren Dreiecke der Fläche unter dem Zeiger (Weltkoordinaten)
  const m = hit.object, geo = m.geometry, pos = geo.attributes.position, idx = geo.index, n = (idx ? idx.count : pos.count) / 3;
  const vi = (t, k) => (idx ? idx.getX(t * 3 + k) : t * 3 + k), P = (t, k) => new THREE.Vector3().fromBufferAttribute(pos, vi(t, k)).applyMatrix4(m.matrixWorld);
  let adj = hoverCache.get(geo);
  if (!adj) { adj = new Map(); const key = (t, k) => { const v = new THREE.Vector3().fromBufferAttribute(pos, vi(t, k)); return `${Math.round(v.x * 100)},${Math.round(v.y * 100)},${Math.round(v.z * 100)}`; };
    for (let t = 0; t < n; t++) for (let k = 0; k < 3; k++) { const s = key(t, k); if (!adj.has(s)) adj.set(s, []); adj.get(s).push(t); }
    adj.key = key; hoverCache.set(geo, adj); }
  const tri = hit.faceIndex, nrm = (t) => new THREE.Triangle(P(t, 0), P(t, 1), P(t, 2)).getNormal(new THREE.Vector3()), n0 = nrm(tri), p0 = P(tri, 0), d0 = n0.dot(p0);
  const gleich = (t) => { const nn = nrm(t); return nn.dot(n0) > 0.9995 && Math.abs(nn.dot(P(t, 0)) - d0) < 0.02; };
  const gesehen = new Set([tri]), warte = [tri];
  while (warte.length) { const t = warte.pop(); for (let k = 0; k < 3; k++) for (const u of adj.get(adj.key(t, k)) || []) if (!gesehen.has(u) && gleich(u)) { gesehen.add(u); warte.push(u); } }
  const out = []; for (const t of gesehen) for (let k = 0; k < 3; k++) out.push(P(t, k).addScaledVector(n0, 0.04));
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
  leeren(waehlGruppe);
  const f = dlg?.feature, sk = f && finde(f.skizze); if (!sk || !Array.isArray(f.flaechen)) return;
  for (const r of gewaehlteRegionen(f, sk) || []) waehlGruppe.add(regionMesh(sk, r, 0x2f7dd1, 0.55));
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
  if (!w) { status("Hier ist nichts Passendes – " + ({ flaechen: "eine geschlossene Fläche einer Skizze (innen anklicken)", profil: "ein geschlossenes Skizzenprofil (innen) oder seine Linie", kette: "einen offenen Linienzug einer Skizze", ebene: "eine Ebene oder Fläche", kante: "eine Kante", punkt: "einen Punkt", zylinder: "eine Zylinderfläche", pfad: "eine Linie" }[a.wahl]) + " anklicken."); return true; }
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
function griffeFuer(f) {
  const l = [], mitte = (ms) => { const bb = new THREE.Box3(); ms.forEach((m) => bb.expandByObject(m)); return bb.isEmpty() ? null : bb; };
  if (f.typ === "extrusion") {
    const sk = finde(f.skizze); if (!sk) return l;
    const regs = gewaehlteRegionen(f, sk); let uv;
    if (regs) { if (!regs.length) return l; uv = regs[0].innen; }
    else { const p = schleifen(sk).sort((a, b) => Math.abs(flaeche(b)) - Math.abs(flaeche(a)))[0]; if (!p) return l; uv = [p.reduce((a, q) => a + q[0], 0) / p.length, p.reduce((a, q) => a + q[1], 0) / p.length]; }
    const E = E_(sk.ebene), n = V(E.n).normalize(), a = +f.abstand || 0, sym = f.richtung === "symmetrisch", sg = f.richtung === "umgekehrt" ? -1 : 1;
    l.push({ feld: "abstand", pos: zu3D(sk.ebene, uv).addScaledVector(n, sg * (sym ? a / 2 : a)), dir: n.clone().multiplyScalar(sg), faktor: sym ? 2 : 1, min: 0.1, farbe: 0xe0782b });
  } else if (["blech", "vorlage", "profil"].includes(f.typ) && f.laenge > 0) {
    const bb = mitte(modell.children.filter((o) => o.isMesh && o.userData.fid === f.id)); if (!bb) return l;
    const E = E_(f.ebene), n = V(E.n).normalize(), sg = f.richtung === "umgekehrt" ? -1 : 1, d = n.clone().multiplyScalar(sg), c = bb.getCenter(new THREE.Vector3());
    let ext = 0; for (const x of [bb.min.x, bb.max.x]) for (const y of [bb.min.y, bb.max.y]) for (const z of [bb.min.z, bb.max.z]) ext = Math.max(ext, new THREE.Vector3(x, y, z).sub(c).dot(d));
    l.push({ feld: "laenge", pos: c.addScaledVector(d, ext), dir: d, faktor: f.richtung === "symmetrisch" ? 2 : 1, min: 0.1, farbe: 0xe0782b });
  } else if (f.typ === "bewegen" || f.typ === "kmuster") {
    const bb = mitte(modell.children.filter((o) => o.isMesh && (String(o.userData.fid) === f.ziel || String(o.userData.fid).startsWith(f.ziel + ":")))); if (!bb) return l;
    const c = bb.getCenter(new THREE.Vector3());
    if (f.typ === "kmuster") { // Abstand der Kopien entlang der Mustrichtung(en)
      if (f.art !== "kreis") for (const [feld, ref] of [["abstand", f.richtung1], ["abstand2", f.richtung2]]) { if (feld === "abstand2" && !(f.anzahl2 > 1)) continue; try { const k = bezugKante(ref), d = V(k.d).normalize(); l.push({ feld, pos: c.clone(), dir: d, faktor: 1, min: 0, farbe: 0xe0782b }); } catch {} }
      return l;
    }
    [["dx", [1, 0, 0], 0xd23c3c], ["dy", [0, 1, 0], 0x3aa655], ["dz", [0, 0, 1], 0x2f7dd1]].forEach(([feld, d, farbe]) => l.push({ feld, pos: c.clone(), dir: V(d), faktor: 1, farbe }));
  } else if (f.typ === "schale" || f.typ === "kantenrund") { // Wanddicke bzw. Radius/Fase: Pfeil an der Aussenseite nach innen
    const bb = mitte(modell.children.filter((o) => o.isMesh && (o.userData.fid === f.ziel || String(o.userData.fid).startsWith(f.ziel + ":")))); if (!bb) return l;
    const c = bb.getCenter(new THREE.Vector3());
    if (f.typ === "schale") l.push({ feld: "dicke", pos: new THREE.Vector3(bb.max.x, c.y, c.z), dir: new THREE.Vector3(-1, 0, 0), faktor: 1, min: 0.1, farbe: 0xe0782b });
    else l.push({ feld: "mass", pos: new THREE.Vector3(bb.max.x, bb.max.y, bb.max.z), dir: new THREE.Vector3(-1, -1, -1).normalize(), faktor: 1 / Math.sqrt(3) * 1.0, min: 0.1, farbe: 0xe0782b });
  } else if (f.typ === "kanten3d") { // Radius/Fase der angeklickten Kanten: Pfeil in der Mitte der ersten Kante zum Körper hin
    const k = f.kanten?.[0]; if (!k) return l;
    const a = V(k.a), b = V(k.b), mid = a.clone().add(b).multiplyScalar(0.5), e = b.clone().sub(a).normalize();
    const bb = mitte(modell.children.filter((o) => o.isMesh && o.userData.fid === f.ziel)); if (!bb) return l;
    const zu = bb.getCenter(new THREE.Vector3()).sub(mid); zu.addScaledVector(e, -zu.dot(e)); if (zu.length() < 1e-6) return l;
    l.push({ feld: "mass", pos: mid, dir: zu.normalize(), faktor: 1, min: 0.1, farbe: 0xe0782b });
  } else if (f.typ === "ebene" && f.art === "versatz" && f._ebene) {
    l.push({ feld: "abstand", pos: V(f._ebene.o), dir: V(f._ebene.n).normalize(), faktor: 1, farbe: 0xe0782b });
  } else if (f.typ === "rundblech" && f.h > 0) {
    const bb = mitte(modell.children.filter((o) => o.isMesh && o.userData.fid === f.id)); if (!bb) return l;
    const E = E_(f.ebene), n = V(E.n).normalize(), c = bb.getCenter(new THREE.Vector3());
    let ext = 0; for (const x of [bb.min.x, bb.max.x]) for (const y of [bb.min.y, bb.max.y]) for (const z of [bb.min.z, bb.max.z]) ext = Math.max(ext, new THREE.Vector3(x, y, z).sub(c).dot(n));
    l.push({ feld: "h", pos: c.addScaledVector(n, ext), dir: n, faktor: 1, min: 0.1, farbe: 0xe0782b });
  }
  return l;
}
const griffLaenge = (pos) => kamera.position.distanceTo(pos) * 0.14;
function zeichneGriffe() {
  leeren(griffGruppe); griffe = [];
  if (!dlg?.feature || skizze) return;
  try { griffe = griffeFuer(dlg.feature).filter((g) => $("d_" + g.feld)); } catch { griffe = []; }
  for (const g of griffe) {
    const L = griffLaenge(g.pos), spitze = g.pos.clone().addScaledVector(g.dir, L), mat = new THREE.MeshBasicMaterial({ color: g.farbe, depthTest: false, transparent: true, opacity: 0.95 });
    const schaft = new THREE.Line(new THREE.BufferGeometry().setFromPoints([g.pos, spitze]), new THREE.LineBasicMaterial({ color: g.farbe, depthTest: false })); schaft.renderOrder = 30;
    const kopf = new THREE.Mesh(new THREE.ConeGeometry(L * 0.09, L * 0.28, 16), mat); kopf.renderOrder = 31;
    kopf.position.copy(spitze); kopf.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), g.dir);
    const kugel = new THREE.Mesh(new THREE.SphereGeometry(L * 0.045, 12, 8), mat); kugel.position.copy(g.pos); kugel.renderOrder = 31;
    griffGruppe.add(schaft, kopf, kugel);
  }
}
steuerung.addEventListener("change", () => { if (griffe.length && !griffZug) zeichneGriffe(); });
function griffAn(e) { // Pfeil unter dem Zeiger (Abstand zur Strecke Fuss–Spitze am Bildschirm)
  if (!griffe.length || skizze) return null;
  const sm = smPos(e), r = e.pointerType === "touch" ? 30 : e.pointerType === "pen" ? 22 : 14; let best = null, bd = r;
  for (const g of griffe) { const A = aufSchirm(g.pos.toArray()), B = aufSchirm(g.pos.clone().addScaledVector(g.dir, griffLaenge(g.pos)).toArray()); if (A[2] > 1 || B[2] > 1) continue; const d = abstandStrecke(sm, A, B); if (d < bd) { bd = d; best = g; } }
  return best;
}
leinwand.addEventListener("pointerdown", (e) => {
  if (e.button !== 0) return;
  const g = griffAn(e); if (!g) return;
  const A = aufSchirm(g.pos.toArray()), B = aufSchirm(g.pos.clone().addScaledVector(g.dir, 100).toArray()), dx = B[0] - A[0], dy = B[1] - A[1], L = Math.hypot(dx, dy);
  if (L < 0.5) return; // Pfeil zeigt genau auf die Kamera
  e.stopImmediatePropagation(); e.preventDefault(); leinwand.setPointerCapture(e.pointerId);
  griffZug = { g, m0: smPos(e), v0: zahlAus($("d_" + g.feld).value) || 0, d: [dx / L, dy / L], pxProMm: L / 100 };
}, true);
leinwand.addEventListener("pointermove", (e) => {
  if (!griffZug) { leinwand.style.cursor = !e.buttons && griffAn(e) ? "grab" : ""; return; }
  e.stopImmediatePropagation();
  const { g, m0, v0, d, pxProMm } = griffZug, sm = smPos(e), delta = ((sm[0] - m0[0]) * d[0] + (sm[1] - m0[1]) * d[1]) / pxProMm;
  let v = v0 + delta * g.faktor; v = Math.round(v * (e.shiftKey ? 100 : 2)) / (e.shiftKey ? 100 : 2); if (g.min != null) v = Math.max(g.min, v);
  const el = $("d_" + g.feld); if (!el) return; el.value = String(v); el.dispatchEvent(new Event("input"));
}, true);
const griffEnde = (e) => { if (!griffZug) return; try { leinwand.releasePointerCapture(e.pointerId); } catch {} griffZug = null; zeichneGriffe(); leinwand.style.cursor = ""; };
leinwand.addEventListener("pointerup", (e) => { if (griffZug) { e.stopImmediatePropagation(); griffEnde(e); } }, true);
leinwand.addEventListener("pointercancel", griffEnde, true);

// ------------------------------------------------------------ Neuaufbau (parametrisch, in Reihenfolge der Zeitleiste)
function regen() {
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
        if (Array.isArray(f.flaechen) && !f.flaechen.length) throw new Error("Fläche in der Skizze anklicken");
        const fs = formen(s, undefined, f); if (!fs.length) throw new Error(Array.isArray(f.flaechen) ? "Gewählte Fläche gibt es nicht mehr – neu anklicken" : "Skizze hat kein geschlossenes Profil");
        const kr = doc.features.filter((x) => x.typ === "kantenrund" && x.ziel === f.id && !x._aus);
        aktSchnitt = { ebene: s.ebene, loops: gewaehlteRegionen(f, s)?.map((r) => r.aussen) ?? schleifen(s) };
        try { volumenKoerper(f, kr.length ? gerundeteExtrusion(s, f, kr) : koerperGeometrie(fs, s.ebene, f.abstand, f.richtung, (f.vorgang || "neu") === "neu" ? 0 : 0.01)); } finally { aktSchnitt = null; }
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
        if (dlg?.feature === f) for (const k of f.kanten || []) { const l = new THREE.Line(new THREE.BufferGeometry().setFromPoints([V(k.a), V(k.b)]), new THREE.LineBasicMaterial({ color: 0xe0782b, depthTest: false })); l.renderOrder = 15; l.userData.konstruktion = true; modell.add(l); }
        if (fehlt) throw new Error(`${fehlt} Kante${fehlt === 1 ? "" : "n"} nicht mehr gefunden (Körper geändert?) – neu anklicken`);
      } else if (f.typ === "kantenrund") {
        const z = finde(f.ziel); if (z?.typ !== "extrusion") throw new Error("Abrunden/Fasen geht an Extrusionen – Extrusion wählen");
        if (doc.features.indexOf(z) > doc.features.indexOf(f)) throw new Error("Die Extrusion muss vor dem Abrunden stehen");
      } else if (f.typ === "schale") {
        const z = finde(f.ziel); if (z?.typ !== "extrusion" || (z.vorgang || "neu") !== "neu") throw new Error("Schale geht an einem Extrusionskörper (neuer Körper)");
        const m = volumen.get(z.id); if (!m) throw new Error("Zielkörper fehlt");
        verknuepfe(m, schalenWerkzeug(z, f), "ausschneiden");
      } else if (f.typ === "kmuster" || f.typ === "kspiegel" || f.typ === "bewegen") {
        koerperTransform(f, volumen);
      } else if (f.typ === "teilen") {
        koerperTeilen(f, volumen, flachStand);
      } else if (f.typ === "drehung") {
        const s = finde(f.skizze); if (!s) throw new Error("Skizze fehlt");
        const loops = schleifen(s); if (!loops.length) throw new Error("Skizze hat kein geschlossenes Profil");
        const [a, d] = drehAchse(s, f.achse); if (!a) throw new Error("Drehachse fehlt");
        volumenKoerper(f, drehGeometrie(loops, s.ebene, a, d, f.winkel ?? 360));
      } else if (f.typ === "sweep") {
        const s = finde(f.skizze); if (!s) throw new Error("Skizze fehlt");
        volumenKoerper(f, sweepGeometrie(s, bezugPfad(f.pfad)));
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
        f._res = blechAusKette(kk, m, riAn);
        f._kernLage = { ebene: E_(s.ebene), versatz: kk[0] }; // für den exakten CAD-Kern (gleiche Lage wie das Anzeige-Netz)
        if (!f.versteckt) modell.add(koerper([konturForm(f._res, m.t, kk[0])], s.ebene, f.laenge, f.richtung, darstellungVon(f, m), f.id));
      } else if (f.typ === "vorlage") {
        if (!ebene(f.ebene)) throw new Error("Ebene fehlt");
        const m = material(f.material), v = VORLAGE[f.vorlage];
        const { start, ops } = profilErweitern(v.bau(f.params, m), profilErweiterungen(f, m), m);
        f._res = berechne(start, ops, m.t, m.ri, m.k);
        f._kernLage = null;
        if (!f.versteckt) { const vz = daneben(f._res); f._kernLage = { ebene: E_(f.ebene), versatz: vz }; modell.add(koerper([konturForm(f._res, m.t, vz)], f.ebene, f.laenge, f.richtung, darstellungVon(f, m), f.id)); }
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
          return { pi, ...flaechenblech(loops[pi], [...Array(n).keys()].map((k) => { const b = bausteinFuer(f.kanten?.[`${pi}:${k}`]), w = f.kantenWerte?.[`${pi}:${k}`]; return b && w ? { ...b, _werte: w } : b; }), m) };
        });
        const viele = f._bleche.length > 1;
        f._teile = f._bleche.map((bl, i) => ({ id: `${f.id}:${i}`, typ: "flaechenteil", eltern: f, name: viele ? `${f.name} · Blech ${bl.pi + 1}` : f.name, material: f.material,
          laenge: +bl.abw.laenge.toFixed(1), stueck: f.stueck ?? 1, notiz: f.notiz, _blech: bl,
          _res: { zuschnitt: bl.abw.breite, biegungen: bl.profile.flatMap((p) => p?.biegungen || []), pfad: [], beschriftungen: [], schenkel: [], summeSchenkel: 0 } }));
        for (const bl of f._bleche) bl.abw.loecher = [];
        if (!f.versteckt) f._bleche.forEach((bl, i) => flaechenKoerper(bl, blechEbene(s.ebene, f, m), m, f.sichtseite === -1 ? -1 : 1, `${f.id}:${i}`, darstellungVon(f, m)).forEach((o) => modell.add(o)));
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
      } else if (f.typ === "profilkante") { // Flansch/Umschlag/Baustein, nachträglich an Kante A oder B eines Blechprofils – wirkt im Profil (profilErweiterungen)
        const z = finde(f.ziel); if (!z || (z.typ !== "profil" && z.typ !== "vorlage")) throw new Error("Das Blechprofil fehlt");
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
        flachStand.set(z.id, { schnitte: [] }); z._mitAbwicklung = true;
        if (!z.versteckt) z._bleche.forEach((bl, i) => { bl.abw.loecher = []; modell.add(flachKoerper(bl, blechEbene(s0.ebene, z, m), m, `${z.id}:${i}`, darstellungVon(z, m))); });
      } else if (f.typ === "falten") { // Refold: gefaltetes Blech zurück, die Ausschnitte der Abwicklung werden aufs gekantete Blech abgebildet
        const z = finde(f.ziel), st = z && flachStand.get(z.id); if (!st) throw new Error("Dieses Blech ist nicht abgewickelt (vorher «Abwickeln»)");
        const m = material(z.material), s0 = finde(z.skizze), seite = z.sichtseite === -1 ? -1 : 1;
        for (const o of modell.children.filter((o) => o.isMesh && String(o.userData.fid).startsWith(z.id + ":"))) { modell.remove(o); o.traverse((c) => c.geometry?.dispose()); }
        flachStand.delete(z.id);
        z._bleche.forEach((bl, i) => {
          bl.abw.loecher = st.schnitte.filter((l) => boxUeberlappt(l, bl.abw.umriss));
          if (z.versteckt) return;
          const eb = blechEbene(s0.ebene, z, m), teile = flaechenKoerper(bl, eb, m, seite, `${z.id}:${i}`, darstellungVon(z, m));
          let hinweis = null; if (bl.abw.loecher.length) try { schneideAus(teile, bl, bl.abw.loecher, eb, m, seite); } catch (e) { hinweis = e.message; }
          teile.forEach((o) => modell.add(o)); if (hinweis) f._fehler = hinweis;
        });
      } else if (f.typ === "rundblech") { // Zylinder-/Kegelmantel: exakte Abwicklung (kern/abwicklungRund.js), 3D als Drehkörper
        const m = material(f.material), kegel = f.art !== "zylinder";
        if (!(f.d1 > m.t && f.h > 0) || (kegel && !(f.d2 >= 0)) || !(f.winkel > 0 && f.winkel <= 360)) throw new Error("Durchmesser, Höhe und Winkel prüfen (Winkel 1–360°)");
        f._rund = rundblechAbwicklung({ art: kegel && Math.abs(f.d1 - f.d2) > 1e-9 ? "kegel" : "zylinder", d1: f.d1, d2: kegel ? f.d2 : f.d1, h: f.h, t: m.t, k: m.k, winkel: f.winkel, zugabe: f.zugabe, neigung: kegel ? 0 : +f.neigung || 0 });
        if (!f.versteckt) { const mesh = koerperMesh(rundGeometrie(f, m), darstellungVon(f, m), f.id); if (rohrNeigung(f)) verknuepfe(mesh, rohrSchnittWerkzeug(f), "ausschneiden"); modell.add(mesh); }
      } else if (f.typ === "detail") {
        f._teile = null; throw new Error("Spenglerdetails gibt es nicht mehr – als Flächenblech mit Kantenbausteinen zeichnen und dieses Feature löschen");
      } else if (f.typ === "profil") {
        if (!ebene(f.ebene)) throw new Error("Ebene fehlt");
        const m = material(f.material);
        if (f.zeilen.some((z) => !(z.L > 0))) throw new Error("Jeder Schenkel braucht eine Länge grösser als 0");
        const { start, ops } = profilErweitern(freiesProfil(f.start, f.zeilen, m), profilErweiterungen(f, m), m);
        f._res = berechne(start, ops, m.t, m.ri, m.k);
        f._kernLage = null;
        if (!f.versteckt) { const vz = daneben(f._res); f._kernLage = { ebene: E_(f.ebene), versatz: vz }; modell.add(koerper([konturForm(f._res, m.t, vz)], f.ebene, f.laenge, f.richtung, darstellungVon(f, m), f.id)); }
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
}

// ------------------------------------------------------------ Rückgängig / Wiederholen
// Nach jedem abgeschlossenen Schritt (nicht während Dialog oder Skizze) wird der Projektzustand gemerkt.
const verlauf = { stapel: [], pos: -1 };
const zustand = () => JSON.stringify(doc, (k, v) => (k.startsWith("_") ? undefined : v));
function merke() {
  // nicht während Dialog/Skizze und nicht für eine eben angelegte, noch leere Skizze
  if (dlg || skizze || doc.features.some((f) => f.typ === "skizze" && !f.elemente.length)) return zeigeVerlauf();
  const z = zustand();
  if (z !== verlauf.stapel[verlauf.pos]) {
    verlauf.stapel.splice(verlauf.pos + 1, Infinity, z);
    if (verlauf.stapel.length > 200) verlauf.stapel.shift();
    verlauf.pos = verlauf.stapel.length - 1;
  }
  zeigeVerlauf();
}
function springe(d) {
  const i = verlauf.pos + d;
  if (dlg || skizze || i < 0 || i >= verlauf.stapel.length) return;
  verlauf.pos = i; doc = JSON.parse(verlauf.stapel[i]);
  if (!finde(auswahl) && !hauptVon(auswahl)) auswahl = null;
  $("aObjekt").value = doc.objekt; $("aNr").value = doc.nr;
  regen(); status(d < 0 ? "Rückgängig gemacht." : "Wiederhergestellt.");
}
function zeigeVerlauf() {
  const gesperrt = !!(dlg || skizze);
  $("zurueck").disabled = gesperrt || verlauf.pos <= 0;
  $("vor").disabled = gesperrt || verlauf.pos >= verlauf.stapel.length - 1;
}
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
  const linie = new THREE.Line(new THREE.BufferGeometry().setFromPoints(p3), ohneTiefe(new THREE.LineBasicMaterial({ color: 0xe0782b })));
  // Punkt und Pfeil in Einheitsgrösse; die Bildschleife skaliert sie nach Kameraabstand (immer gleich gross sichtbar)
  const punkt = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 12), ohneTiefe(new THREE.MeshBasicMaterial({ color: 0x2e9b4f })));
  punkt.position.copy(p3[0]); punkt.userData.bildschirm = 0.008;
  const pfeil = new THREE.ArrowHelper(p3[1].clone().sub(p3[0]).normalize(), p3[0], 1, 0xe0782b, 0.35, 0.22);
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
const NAMEN = { profilkante: "Profilkante", eindeckung: "Eindeckung", lukarne: "Lukarne", dachelement: "Dachfenster/Kamin", dachbleche: "Dachbleche", dach: "Dach", gebaeude: "Gebäude", kante: "Kante", abwickeln: "Abwickeln", falten: "Falten", detail3d: "3D-Detail", rundblech: "Rund-/Kegelblech", kehle: "Kehle/Grat", kanten3d: "Kanten abrunden", bild: "Bild", import: "Import", kantenrund: "Abrunden/Fasen", schale: "Schale", kmuster: "Muster", kspiegel: "Spiegeln", teilen: "Teilen", bewegen: "Verschieben", sweep: "Sweep", loft: "Übergang", achse: "Achse", konpunkt: "Punkt", skizze: "Skizze", extrusion: "Extrusion", drehung: "Drehung", blech: "Blechprofil", vorlage: "Vorlage", profil: "Freies Profil", detail: "Spenglerdetail", flaeche: "Flächenblech" };
const AUGE = (zu) => `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>${zu ? '<path d="M4 4l16 16"/>' : ""}</svg>`;
function zeigeBrowser() {
  const KON = ["ebene", "achse", "konpunkt", "bild"];
  const eb = doc.features.filter((f) => KON.includes(f.typ)), sk = doc.features.filter((f) => f.typ === "skizze"), kp = doc.features.filter((f) => f.typ !== "skizze" && !KON.includes(f.typ) && !(["extrusion", "drehung", "sweep", "loft"].includes(f.typ) && (f.vorgang || "neu") !== "neu") && f.typ !== "abwickeln" && f.typ !== "falten" && f.typ !== "kante"); // Ausschnitte/Vereinigungen sind keine eigenen Körper (nur in der Zeitleiste)
  const zeile = (f, typ) => `<li data-id="${f.id}" class="${f.id === auswahl ? "aktiv" : ""}${f._aus ? " aus" : ""}${f.versteckt ? " verborgen" : ""}"><button class="auge${f.versteckt ? " zu" : ""}" data-auge="${f.id}" aria-label="${f.versteckt ? "Einblenden" : "Ausblenden"}" title="${f.versteckt ? "Einblenden" : "Ausblenden"}">${AUGE(f.versteckt)}</button><span class="typ ${typ}"></span><span class="nm">${f.name}${f._fehler ? " ⚠" : ""}</span></li>`;
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

function zeigeZeit() {
  const m = doc.marke ?? doc.features.length;
  const knopf = (f) => `<button data-id="${f.id}" draggable="true" class="${f._aus ? "aus " + f._aus : ""}${f._fehler ? " fehler" : ""}" title="${esc(f._fehler || (f._aus === "unterdrueckt" ? "Unterdrückt" : f._aus ? "Zurückgerollt" : "Bearbeiten – Rechtsklick für mehr"))}">${esc(f.name)}${f._fehler ? " ⚠" : ""}</button>`;
  const marke = `<span class="marke" draggable="true" title="Rückrollmarke: ziehen oder Rechtsklick auf ein Feature → «Bis hier zurückrollen»"></span>`;
  $("zeit").innerHTML = doc.features.length ? [...doc.features.slice(0, m).map(knopf), marke, ...doc.features.slice(m).map(knopf)].join("")
    : '<span class="hinweis">Leer: mit «Skizze» oder «Spengler-Vorlage» beginnen</span>';
  $("rueckgaengig").disabled = !doc.features.length || !!skizze;
}
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
  if (!f) { const fl = doc.features.filter((x) => x.typ === "flaeche" && !x._aus); f = hauptVon(auswahl); if (f?.typ !== "flaeche") f = fl.length === 1 ? fl[0] : null; }
  if (!f) return status("Zuerst das Flächenblech im Browser oder in der Ansicht anwählen, dann «Abwickeln / Falten».");
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
$("rueckgaengig").addEventListener("click", () => { const f = doc.features[(doc.marke ?? doc.features.length) - 1]; if (f) entferneFeature(f); auswahl = null; regen(); });

function waehle(id) {
  auswahl = id; markiere(); zeigeWerkstatt();
  // nur die Markierung umschalten: ein Neuaufbau der Liste würde den Doppelklick zum Bearbeiten verschlucken
  document.querySelectorAll("#baum li[data-id]").forEach((li) => li.classList.toggle("aktiv", li.dataset.id === id || String(id).startsWith(li.dataset.id + ":")));
}

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
  return stueckliste([...blechteile().map((f) => ({ name: f.name, notiz: f.notiz, material: material(f.material), zuschnitt: f._res.zuschnitt, laenge: f.laenge, stueck: f.stueck ?? 1 })), ...rundteile()]);
}
const f2 = (v) => v.toFixed(2);
// Materialbedarf: Spaltband/Coil in Laufmetern, Tafeln als Stückzahl (Schätzung)
const bedarf = () => materialbedarf([...blechteile().map((f) => ({ name: f.name, material: material(f.material), zuschnitt: f._res.zuschnitt, laenge: f.laenge, stueck: f.stueck ?? 1 })), ...rundteile()], einst);
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
    abwicklungenDxf(blechteile().map((f) => ({ res: f._res, abw: f._blech?.abw, laenge: f.laenge, titel: `${f.name} ${f.stueck ?? 1} Stk ${material(f.material).name}` })), einst.skizze.abstand), "application/dxf");
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
    <div class="reihe"><button class="knopf haupt" id="kListe">Abkantliste kopieren</button><button class="knopf" id="kDxf">DXF speichern</button><button class="knopf" id="kDruck">Werkstattblatt drucken</button><button class="knopf" id="kKopie" title="Strg+D">Duplizieren</button>${f.typ === "profil" ? '<button class="knopf" id="kEigene">Als eigene Vorlage speichern</button>' : ""}${f.typ === "vorlage" && alsZeilen(...Object.values(VORLAGE[f.vorlage].bau(f.params, m))) ? '<button class="knopf" id="kFrei">Als freies Profil bearbeiten</button>' : ""}</div>
    <dl class="etikett"><dt>Objekt</dt><dd>${esc(doc.objekt)}</dd><dt>Nr.</dt><dd>${esc(doc.nr)}</dd><dt>Teil</dt><dd>${esc(f.name)}</dd>
    <dt>Blech</dt><dd>${m.name.replace(/ [\d.]+$/, "")} ${m.t.toFixed(2)} mm</dd><dt>Mass</dt><dd>${f1(r.zuschnitt)} × ${f.laenge} mm · ${f.stueck ?? 1} Stk.</dd></dl>`;
  $("kListe").onclick = () => kopiere([`${doc.objekt} · Nr. ${doc.nr} · ${f.name}`, `${m.name} · Zuschnitt ${f1(r.zuschnitt)} × ${f.laenge} mm`, "",
    `Biegung\tAnschlag ab A (mm)${abB ? "\tAnschlag ab B (mm)" : ""}\tWinkel\tRichtung`,
    ...r.biegungen.map((b) => `B${b.nr}\t${f1(b.pos)}${abB ? `\t${f1(r.zuschnitt - b.pos)}` : ""}\t${f1(Math.abs(b.winkel))}\t${b.richtung}`)].join("\n"));
  $("kDxf").onclick = () => herunterladen(`${doc.nr} ${f.name}.dxf`, abwicklungDxf(r, f.laenge, f.name), "application/dxf");
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
    const { start, zeilen } = alsZeilen(...Object.values(VORLAGE[f.vorlage].bau(f.params, m)));
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
const kopf = (art) => `<small>${art}${einst.druck.betrieb ? " · " + esc(einst.druck.betrieb) : ""}</small>`;
function werkstattblatt(f) {
  if (f._blech) return flaechenblatt(f);
  const r = f._res, m = material(f.material), q = quelle(r.zuschnitt, einst), d = einst.druck, abB = einst.anzeige.abB;
  return `<section class="blatt">
    <header><div>${kopf("Werkstattblatt")}<h1>${esc(f.name)}</h1></div>
      <dl><dt>Objekt</dt><dd>${esc(doc.objekt)}</dd><dt>Nr.</dt><dd>${esc(doc.nr)}</dd><dt>Datum</dt><dd>${new Date().toLocaleDateString("de-CH")}</dd></dl></header>
    <div class="eckdaten">
      <div><small>Zuschnitt</small><b>${f1(r.zuschnitt)} × ${f.laenge} mm</b></div>
      <div><small>Material</small><b>${esc(m.name)}</b></div>
      <div><small>Stück</small><b>${f.stueck ?? 1}</b></div>
      <div><small>Aus</small><b>${q ? `${q.art} ${q.breite}${q.laenge ? " × " + q.laenge : ""}` : "Sonderformat"}</b></div>
    </div>
    ${f.notiz?.trim() ? `<div class="notiz"><b>Notiz</b> ${esc(f.notiz)}</div>` : ""}
    <div class="grosszeichnung">${profilSvg(r, { dicke: m.t, breite: 640, hoehe: 360, schrift: 14, rand: 44 })}</div>
    ${d.abwicklung ? `<div class="abwicklung"><small>Abwicklung · Anschlag ab Kante A${abB ? " (ab B: Blech gewendet)" : ""}</small>${abwicklungSvg(r, { breite: 640, schrift: 12 })}</div>` : ""}
    <table class="liste"><thead><tr><th>Biegung</th><th>Art</th><th class="num">Anschlag ab A (mm)</th>${abB ? '<th class="num">ab B (mm)</th>' : ""}<th class="num">Winkel</th><th>Richtung</th></tr></thead><tbody>
      ${r.biegungen.map((b) => `<tr><td><span class="bnr">B${b.nr}</span></td><td>${b.art}</td><td class="num">${b.art === "Rundung" ? `${b.von.toFixed(0)}–${b.bis.toFixed(0)}` : f1(b.pos)}</td>${abB ? `<td class="num">${b.art === "Rundung" ? `${(r.zuschnitt - b.bis).toFixed(0)}–${(r.zuschnitt - b.von).toFixed(0)}` : f1(r.zuschnitt - b.pos)}</td>` : ""}<td class="num">${f1(Math.abs(b.winkel))}°</td><td>${b.richtung}</td></tr>`).join("")}
    </tbody></table>
    <p class="hinweis">Masse in mm auf der Blechmitte. Anschlag ab Kante A (grüner Punkt)${abB ? ", «ab B» ab der anderen Kante für gewendetes Blech" : ""}. Richtung «oben/unten» mit Kante A links.
      Innenradius ${m.ri} mm, K-Faktor ${m.k}.</p>
    ${d.etikett ? `<dl class="etikett"><dt>Objekt</dt><dd>${esc(doc.objekt)}</dd><dt>Nr.</dt><dd>${esc(doc.nr)}</dd><dt>Teil</dt><dd>${esc(f.name)}</dd>
      <dt>Blech</dt><dd>${esc(m.name)}</dd><dt>Mass</dt><dd>${f1(r.zuschnitt)} × ${f.laenge} mm · ${f.stueck ?? 1} Stk.</dd></dl>` : ""}
  </section>`;
}
function stuecklisteBlatt() {
  const a = auftrag();
  return `<section class="blatt">
    <header><div>${kopf("Stückliste")}<h1>${esc(doc.objekt)}</h1></div>
      <dl><dt>Nr.</dt><dd>${esc(doc.nr)}</dd><dt>Datum</dt><dd>${new Date().toLocaleDateString("de-CH")}</dd></dl></header>
    <table class="liste"><thead><tr><th>Teil</th><th>Material</th><th class="num">Zuschnitt × Länge mm</th><th class="num">Stück</th><th class="num">m²</th><th class="num">kg</th></tr></thead><tbody>
    ${a.zeilen.map((z) => `<tr><td>${esc(z.name)}${z.notiz ? `<br><small>${esc(z.notiz)}</small>` : ""}</td><td>${esc(z.material)}</td><td class="num">${f1(z.zuschnitt)} × ${z.laenge}</td><td class="num">${z.stueck}</td><td class="num">${f2(z.flaeche)}</td><td class="num">${z.gewicht.toFixed(1)}</td></tr>`).join("")}
    </tbody></table>
    <table class="liste"><thead><tr><th>Summe je Material</th><th class="num">Stück</th><th class="num">Laufmeter</th><th class="num">m²</th><th class="num">kg</th></tr></thead><tbody>
    ${a.jeMaterial.map((m) => `<tr><td>${esc(m.material)}</td><td class="num">${m.stueck}</td><td class="num">${m.laufmeter.toFixed(1)}</td><td class="num">${f2(m.flaeche)}</td><td class="num">${m.gewicht.toFixed(1)}</td></tr>`).join("")}
    <tr><td><b>Total</b></td><td class="num"><b>${a.summe.stueck}</b></td><td></td><td class="num"><b>${f2(a.summe.flaeche)}</b></td><td class="num"><b>${a.summe.gewicht.toFixed(1)}</b></td></tr>
    </tbody></table>
    ${einst.druck.bedarf ? bedarfHtml() : ""}
  </section>`;
}
// Etiketten: eins pro Stück, Bogenformat aus den Einstellungen (Standard A4, 3 × 8 à 70 × 37 mm)
function druckeEtiketten() {
  const e = einst.etiketten, proBogen = e.spalten * e.zeilen;
  const etiketten = blechteile().flatMap((f) => {
    const n = Math.max(0, Math.round(f.stueck ?? 1)), m = material(f.material);
    return Array.from({ length: n }, (_, i) => `<dl class="etikett klebe"><dt>Objekt</dt><dd>${esc(doc.objekt)}</dd><dt>Nr.</dt><dd>${esc(doc.nr)}</dd>
      <dt>Teil</dt><dd>${esc(f.name)}${n > 1 ? ` <small>${i + 1}/${n}</small>` : ""}</dd><dt>Blech</dt><dd>${esc(m.name)}</dd><dt>Mass</dt><dd>${f1(f._res.zuschnitt)} × ${f.laenge}</dd></dl>`);
  });
  if (!etiketten.length) return status("Keine Blechteile für Etiketten.");
  const boegen = [];
  const stil = `grid-template-columns: repeat(${e.spalten}, ${e.breite}mm); grid-auto-rows: ${e.hoehe}mm; column-gap: ${e.abstandX}mm; row-gap: ${e.abstandY}mm; padding: ${e.oben}mm 0 0 ${e.links}mm;`;
  for (let i = 0; i < etiketten.length; i += proBogen) boegen.push(`<section class="etikettenbogen" style="${stil}">${etiketten.slice(i, i + proBogen).join("")}</section>`);
  $("druck").innerHTML = boegen.join("");
  window.print();
}
function drucke(teile, mitListe = false) {
  teile = teile.filter((f) => f._res);
  if (!teile.length) return status("Keine Blechteile zum Drucken.");
  $("druck").innerHTML = (mitListe ? stuecklisteBlatt() : "") + teile.map(werkstattblatt).join("");
  window.print();
}
const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
for (const [id, k] of [["aObjekt", "objekt"], ["aNr", "nr"]]) { $(id).value = doc[k]; $(id).addEventListener("input", (e) => { doc[k] = e.target.value; speichern(); zeigeWerkstatt(); }); }

let hinweisZeit = 0; // Hinweise bleiben kurz stehen, bevor die Mauskoordinaten sie ersetzen
function status(t, koordinaten = false) { if (koordinaten && Date.now() - hinweisZeit < 3000) return; if (!koordinaten) hinweisZeit = Date.now(); $("status").textContent = t; }
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
  const zus = $("dZusatz"); if (zus) zus.hidden = viele && i !== namen.length - 1;
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
  $("dialog").hidden = true; dlg = null; grundebenen.visible = false; hoverLoeschen(); zeichneGriffe(); setTimeout(leisteZustand);
}
$("dOk").onclick = () => { const m = dlg?.pflicht?.(); if (m) return status(m); dlg?.ok?.(werte()); schliesse(); regen(); };
$("dAbbrechen").onclick = () => { dlg?.abbrechen?.(); schliesse(); regen(); if (typeof wendeSchnittAn === "function") wendeSchnittAn(); };
$("dLoeschen").onclick = () => { dlg?.loeschen?.(); schliesse(); regen(); };

// Neue oder bestehende Features mit Live-Vorschau. felder(f) liefert die Felder, setze(f, w) übernimmt Werte.
function featureDialog(f, istNeu, felder, setze, titel, hinweis, extra = {}) {
  const kopie = JSON.parse(JSON.stringify(f, (k, v) => (k.startsWith("_") ? undefined : v))), alteAuswahl = auswahl;
  if (istNeu) einfuegen(f);
  auswahl = f.id; // Werkstatt zeigt das Teil schon während der Eingabe
  dialog({
    titel, hinweis, felder: felder(f), feature: f,
    info: () => (f._fehler ? "⚠ " + f._fehler : f._rund ? `Zuschnitt ${f1(f._rund.masse.zuschnitt[0])} × ${f1(f._rund.masse.zuschnitt[1])} mm${f._rund.art === "kegel" ? ` · R ${f1(f._rund.masse.R)} / r ${f1(f._rund.masse.r)} · ${f._rund.masse.phi.toFixed(2)}°` : ""}` : f._res ? `Zuschnitt ${f1(f._res.zuschnitt)} × ${f.laenge} mm · ${f._res.biegungen.length} Biegungen` : ""),
    ...extra,
    aendern: (w, feld) => {
      setze(f, w); merkeAusdruecke(f);
      if (feld === "vorlage" || feld === "skizze" || feld === "vorgang" || extra.neuBei?.includes(feld)) { const d = dlg; dialog({ ...d, felder: felder(f) }); setze(f, werte()); }
      regen();
    },
    ok: (w) => { setze(f, w); merkeAusdruecke(f); auswahl = f.id; },
    abbrechen: () => { if (istNeu) { entferneFeature(f); auswahl = alteAuswahl; } else Object.assign(f, kopie); },
    loeschen: istNeu ? null : () => { entferneFeature(f); auswahl = null; },
  });
  setze(f, werte()); regen();
}
const RICHTUNGEN = [["eine", "Eine Seite"], ["umgekehrt", "Umgekehrt"], ["symmetrisch", "Symmetrisch"]];
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
  if (!sk.length) return status("Zuerst eine Skizze mit geschlossenem Profil zeichnen (Rechteck, Kreis oder geschlossener Linienzug).");
  f ||= { id: neueId(), typ: "extrusion", name: "Extrusion " + (doc.features.filter((x) => x.typ === "extrusion").length + 1), skizze: sk.at(-1).id, flaechen: [], abstand: 100, richtung: "eine", vorgang: "neu" };
  featureDialog(f, istNeu, (f) => [
    { id: "skizze", label: Array.isArray(f.flaechen) ? "Flächen in" : "Profil aus", wahl: Array.isArray(f.flaechen) ? "flaechen" : "profil", optionen: sk.map((s) => [s.id, s.name]), wert: f.skizze },
    { id: "abstand", label: "Abstand", einheit: "mm", wert: f.abstand },
    { id: "richtung", label: "Richtung", optionen: RICHTUNGEN, wert: f.richtung },
    ...vorgangFelder(f),
  ], (f, w) => { if (Array.isArray(f.flaechen) && w.skizze !== f.skizze) f.flaechen = []; Object.assign(f, w); }, "Extrudieren",
  "Fläche(n) in der Skizze anklicken (jede Teilfläche einzeln, auch Überlappungen und Inseln; nochmals anklicken = abwählen). Vorgang wie in Fusion: neuer Körper, vereinigen, ausschneiden oder schneiden.",
  { pflicht: () => (Array.isArray(f.flaechen) && !f.flaechen.length ? "Zuerst mindestens eine Fläche in der Skizze anklicken." : "") });
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
  if (!sk.length) return status("Zuerst eine Skizze mit geschlossenem Profil und einer Achse (z. B. Hilfslinie) zeichnen.");
  f ||= { id: neueId(), typ: "drehung", name: "Drehung " + (doc.features.filter((x) => x.typ === "drehung").length + 1), skizze: sk.at(-1).id, achse: "V", winkel: 360, vorgang: "neu" };
  featureDialog(f, istNeu, (f) => [
    { id: "skizze", label: "Profil aus", wahl: "profil", optionen: sk.map((s) => [s.id, s.name]), wert: f.skizze },
    { id: "achse", label: "Achse", optionen: achsenOpt(finde(f.skizze)), wert: f.achse },
    { id: "winkel", label: "Winkel", einheit: "°", wert: f.winkel ?? 360 },
    ...vorgangFelder(f),
  ], (f, w) => Object.assign(f, w), "Drehen", "Geschlossene Profile der Skizze um eine Achse drehen – Achse = Skizzenachse oder eine gerade (Hilfs-)Linie. Das Profil darf die Achse nicht kreuzen.");
}

function blechDialog(f) {
  const istNeu = !f;
  const sk = doc.features.filter((x) => x.typ === "skizze" && ketten(x).length);
  if (!sk.length) return status("Zuerst eine Skizze mit offenem Linienzug zeichnen: Blechmitte oder eine Blechoberfläche.");
  f ||= { id: neueId(), typ: "blech", name: "Blechprofil " + (doc.features.filter((x) => x.typ === "blech").length + 1), skizze: sk.at(-1).id, kette: Math.max(0, ketten(sk.at(-1)).findIndex((k) => !k.mitBogen)), lage: einst.neu.lage, material: neuMaterial(), laenge: einst.neu.laenge, stueck: einst.neu.stueck, richtung: "eine" };
  const REGELN = [["Linienzug", () => true], ["Lage des Blechs", (id) => ["lage", "umkehren"].includes(id)], ["Material und Länge", (id) => ["material", "laenge", "stueck", "notiz", "richtung"].includes(id)]];
  featureDialog(f, istNeu, (f) => mitSchritten([
    { id: "skizze", label: "Linienzug aus", wahl: "kette", optionen: sk.map((s) => [s.id, s.name]), wert: f.skizze },
    { id: "kette", label: "Linienzug", optionen: ketten(finde(f.skizze) || sk.at(-1)).map((k, i) => [i, `Nr. ${i + 1}${k.mitBogen ? " (mit Bogen)" : ""}`]), wert: f.kette },
    { id: "lage", label: "Blech zur Linie", optionen: LAGEN, wert: f.lage ?? "mitte" },
    { id: "umkehren", label: "Kante A", optionen: [["", "Am Anfang der Linie"], ["1", "Am Ende der Linie"]], wert: f.umkehren ? "1" : "" },
    { id: "material", label: "Material", optionen: matOpt(), wert: f.material },
    { id: "laenge", label: "Länge", einheit: "mm", wert: f.laenge },
    { id: "stueck", label: "Stück", wert: f.stueck ?? 1 },
    { id: "notiz", label: "Notiz", text: true, wert: f.notiz ?? "" },
    { id: "richtung", label: "Richtung", optionen: RICHTUNGEN, wert: f.richtung },
  ], REGELN), (f, w) => Object.assign(f, w, { kette: Math.min(+w.kette || 0, ketten(finde(w.skizze)).length - 1), umkehren: w.umkehren === "1" }), "Blechprofil",
  "Jeder Knick wird zur Biegung mit dem Innenradius des Materials. «Mitte»: die Linie ist die Blechmitte. «Links/Rechts»: die Linie ist eine Blechoberfläche (gezeichnete Masse = Innen- bzw. Aussenmasse), das Blech liegt in Pfeilrichtung gesehen links bzw. rechts davon. In der Ansicht: grüner Punkt = Kante A, oranger Pfeil = Richtung.");
}

function vorlageDialog(f) {
  const istNeu = !f;
  f ||= { id: neueId(), typ: "vorlage", name: VORLAGEN[0].name, vorlage: VORLAGEN[0].id, params: standardwerte(VORLAGEN[0].id), material: neuMaterial(), laenge: einst.neu.laenge, stueck: einst.neu.stueck, richtung: "eine", ebene: einst.neu.ebene };
  const felder = (f) => [
    { id: "vorlage", label: "Vorlage", optionen: VORLAGEN.map((x) => [x.id, x.name]), wert: f.vorlage },
    { id: "name", label: "Name", text: true, wert: f.name },
    ...VORLAGE[f.vorlage].params.map(([k, l, e]) => ({ id: "p_" + k, label: l, einheit: e, wert: f.params[k] })),
    { id: "material", label: "Material", optionen: matOpt(), wert: f.material },
    { id: "laenge", label: "Länge", einheit: "mm", wert: f.laenge },
    { id: "stueck", label: "Stück", wert: f.stueck ?? 1 },
    { id: "notiz", label: "Notiz", text: true, wert: f.notiz ?? "" },
    { id: "ebene", label: "Querschnitt in", wahl: "ebene", optionen: ebenenOpt(f, f.ebene), wert: f.ebene },
  ];
  const setze = (f, w) => {
    if (w.vorlage !== f.vorlage) { // Name nur mitwechseln, wenn er nicht von Hand geändert wurde
      if (f.name === VORLAGE[f.vorlage].name) f.name = VORLAGE[w.vorlage].name;
      f.vorlage = w.vorlage; f.params = standardwerte(w.vorlage); return;
    }
    f.name = w.name.trim() || f.name;
    for (const [k] of VORLAGE[f.vorlage].params) if (Number.isFinite(w["p_" + k])) f.params[k] = w["p_" + k];
    Object.assign(f, { material: w.material, laenge: w.laenge, stueck: w.stueck, ebene: w.ebene, notiz: w.notiz });
  };
  const REGELN = [["Vorlage", () => true], ["Masse", (id) => id.startsWith("p_")], ["Material, Länge, Lage", (id) => ["material", "laenge", "stueck", "notiz", "ebene"].includes(id)]];
  featureDialog(f, istNeu, (f) => mitSchritten(felder(f), REGELN), setze, "Spengler-Vorlage", "", { wahlNr: -1 });
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
  const tabelle = () => `<table class="zeilen"><thead><tr><th>#</th><th>Schenkel mm</th><th>Winkel °</th><th>Art</th><th></th></tr></thead><tbody>
    ${f.zeilen.map((z, i) => { const letzte = i === f.zeilen.length - 1; return `<tr data-i="${i}"><td>${i + 1}</td>
      <td><input data-k="L" type="number" step="any" inputmode="decimal" value="${z.L}" aria-label="Schenkel ${i + 1} Länge"></td>
      <td>${letzte ? "–" : `<input data-k="winkel" type="number" step="any" inputmode="decimal" value="${z.winkel}" aria-label="Winkel nach Schenkel ${i + 1}">`}</td>
      <td>${letzte ? "" : `<select data-k="art" aria-label="Art nach Schenkel ${i + 1}"><option value="abkanten" ${z.art !== "umschlag" ? "selected" : ""}>Abkanten</option><option value="umschlag" ${z.art === "umschlag" ? "selected" : ""}>Umschlag</option></select>`}</td>
      <td>${f.zeilen.length > 2 ? `<button class="weg" data-weg="${i}" aria-label="Schenkel ${i + 1} entfernen">×</button>` : ""}</td></tr>`; }).join("")}
    </tbody></table><button class="knopf" data-neu>+ Schenkel</button>`;
  const binden = (box) => {
    const neu = () => { const d = dlg; dialog({ ...d, felder: felder(f) }); regen(); };
    box.addEventListener("input", (e) => {
      const k = e.target.dataset.k, i = +e.target.closest("tr")?.dataset.i; if (!k) return;
      f.zeilen[i][k] = k === "art" ? e.target.value : parseFloat(e.target.value);
      regen();
    });
    box.addEventListener("click", (e) => {
      if (e.target.dataset.weg != null) { f.zeilen.splice(+e.target.dataset.weg, 1); f.zeilen.at(-1).winkel = 0; neu(); }
      else if (e.target.dataset.neu != null) { const l = f.zeilen.at(-1); l.winkel = 90; l.art = "abkanten"; f.zeilen.push({ L: 30, winkel: 0, art: "abkanten" }); neu(); box.querySelector("tr:last-child input")?.focus(); }
    });
  };
  featureDialog(f, istNeu, felder, setze, "Freies Profil",
    "Winkel nach dem Schenkel: + biegt nach oben (links), − nach unten (rechts). Umschlag = 180°, Vorzeichen gibt die Seite. Masse auf der Blechmitte.",
    { zusatz: tabelle, binden, wahlNr: -1 });
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
      return kontur(res.pfad, m.t, 6).map(([x, y]) => [x - L + v, y]);
    } catch {}
  }
  return null;
}
// Profil (x = nach aussen, y) entlang z extrudiert; Enden schräg: Anfang bei z = −x·k0, Ende bei z = L + x·k1
function prisma(kont, L, k0, k1, e0 = 0, e1 = 0) { // e0/e1: an der Ecke zurückgesetzt (wie in der Abwicklung)
  let q = kont.slice(); if (gleich(q[0], q.at(-1))) q.pop(); if (flaeche(q) < 0) q = q.reverse();
  const luft = window.__prismaLuft || 0; // nur für Tests: Gehrungsflächen minimal auseinander
  const z0 = (x) => -x * k0 + e0 + luft, z1 = (x) => Math.max(L + x * k1 - e1 - luft, z0(x) + 0.01), pos = [];
  const P = (x, y, z) => pos.push(x, y, z), n = q.length;
  for (let i = 0; i < n; i++) { const [xa, ya] = q[i], [xb, yb] = q[(i + 1) % n];
    P(xa, ya, z0(xa)); P(xb, yb, z0(xb)); P(xb, yb, z1(xb)); P(xa, ya, z0(xa)); P(xb, yb, z1(xb)); P(xa, ya, z1(xa)); }
  for (const [i, j, k] of THREE.ShapeUtils.triangulateShape(q.map(([x, y]) => new THREE.Vector2(x, y)), [])) {
    P(q[i][0], q[i][1], z0(q[i][0])); P(q[k][0], q[k][1], z0(q[k][0])); P(q[j][0], q[j][1], z0(q[j][0]));
    P(q[i][0], q[i][1], z1(q[i][0])); P(q[j][0], q[j][1], z1(q[j][0])); P(q[k][0], q[k][1], z1(q[k][0])); }
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
  const flaeche = new THREE.ExtrudeGeometry(new THREE.Shape(plattenUmriss(bl.pts, bl.gruppen, kuerzen).map(([u, v]) => new THREE.Vector2(u, v))), { depth: m.t, bevelEnabled: false });
  flaeche.translate(0, 0, -m.t / 2); flaeche.applyMatrix4(B);
  const geos = [flaeche];
  // Ecken: Profile auf Gehrung (Nachbarkante mit Baustein) bzw. bündig zur Nachbarkante (ohne) – keine Überschneidungen
  const richt = (a, b) => { const L = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1; return [(b[0] - a[0]) / L, (b[1] - a[1]) / L]; };
  const knick = (d1, d2) => Math.atan2(d1[0] * d2[1] - d1[1] * d2[0], d1[0] * d2[0] + d1[1] * d2[1]); // + = links (konvexe Ecke)
  const ek = eckFaktoren(bl.gruppen, bl.profile); // dieselbe Eckregel wie die Abwicklung
  const n = bl.gruppen.length;
  bl.gruppen.forEach((g, k) => {
    const p = bl.profile[k]; if (!p) return;
    const k2 = bausteinKontur(p.baustein, m); if (!k2) return;
    for (let i = 1; i < g.punkte.length; i++) {
      const a = g.punkte[i - 1], b = g.punkte[i], L = Math.hypot(b[0] - a[0], b[1] - a[1]); if (L < 1e-6) continue;
      const d = richt(a, b);
      const k0 = i > 1 ? Math.tan(knick(richt(g.punkte[i - 2], a), d) / 2) : ek[k].k0, e0 = i > 1 ? 0 : ek[k].e0 || 0;
      const k1 = i < g.punkte.length - 1 ? Math.tan(knick(d, richt(b, g.punkte[i + 1])) / 2) : ek[k].k1, e1 = i < g.punkte.length - 1 ? 0 : ek[k].e1 || 0;
      if (!g.gerade && g.punkte.length > 3) { // gebogene Kante: eine durchgehende glatte Fläche statt Einzelteilen
        if (i === 1) {
          const sw = sweepGlatt(k2, g.punkte, ek[k], seite); sw.applyMatrix4(B);
          if (B.determinant() < 0) for (const nm of ["position", "normal"]) { const arr = sw.attributes[nm].array; for (let t = 0; t < arr.length; t += 9) for (let c = 0; c < 3; c++) { const x = arr[t + 3 + c]; arr[t + 3 + c] = arr[t + 6 + c]; arr[t + 6 + c] = x; } } // gespiegelte Basis: Umlaufsinn zurück
          geos.push(sw);
        }
        continue;
      }
      const geo = prisma(k2, L, k0, k1, e0, e1);
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
  const kd = dlg?.feature?.typ === "kante" ? dlg.feature : null; // Dialog eines Schritts «Kante»: dessen Kante leuchtet
  const f = kd ? finde(kd.ziel) : dlg?.feature?.typ === "flaeche" ? dlg.feature : hauptVon(auswahl);
  if (f?.typ !== "flaeche" || !f._bleche || skizze || f.versteckt) return;
  const ebene = finde(f.skizze)?.ebene, aktiv = kd ? kd.key : dlg?.feature === f ? dlg.aktiveKante : menueKante?.fid === f.id ? menueKante.key : null;
  const LM = lageVon(f), zu3D = (e, p) => { const v = V(zuWelt(E_(e), p)); return LM ? v.applyMatrix4(LM) : v; }; // Komponente verschoben
  f._bleche.forEach((bl) => bl.gruppen.forEach((g, k) => {
    const an = aktiv === `${bl.pi}:${k}`, belegt = !!f.kanten?.[`${bl.pi}:${k}`];
    // Beschriftung in der Kantenmitte: antippen öffnet das Bausteinmenü (gut auf dem Handy)
    const mitte = g.punkte[Math.floor((g.punkte.length - 1) / 2)], nach = g.punkte[Math.floor((g.punkte.length - 1) / 2) + 1] || mitte;
    kantenLabels.push({ p: zu3D(ebene, [(mitte[0] + nach[0]) / 2, (mitte[1] + nach[1]) / 2]), t: kantenName(f, `${bl.pi}:${k}`) + (belegt ? " ✓" : ""), kante: `${bl.pi}:${k}`, fid: f.id, an, belegt });
    const l = new THREE.Line(new THREE.BufferGeometry().setFromPoints(g.punkte.map((p) => zu3D(ebene, p))),
      new THREE.LineBasicMaterial({ color: an ? 0xe0782b : belegt ? 0x2e9b4f : 0x1f5fbf, depthTest: false, transparent: true, linewidth: an ? 3 : 1 }));
    l.renderOrder = 13; kantenZeiger.add(l);
    if (an) { // dicker: zusätzlich eine Röhre
      const kurve = new THREE.CatmullRomCurve3(g.punkte.map((p) => zu3D(ebene, p)), false, "catmullrom", 0);
      const r = new THREE.Mesh(new THREE.TubeGeometry(kurve, Math.max(2, g.punkte.length * 2), Math.max(2, g.laenge / 150), 6), new THREE.MeshBasicMaterial({ color: 0xe0782b, depthTest: false, transparent: true, opacity: 0.85 }));
      r.renderOrder = 14; kantenZeiger.add(r);
    }
  }));
}
// Nächste Kante unter dem Mauszeiger (Bildschirmabstand) → «Blech:Kante»
function kanteUnterMaus(f, e) {
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
function berechneKanten(f) {
  const m = material(f.material), k = { ...(f.kantenBasis || {}) };
  for (const x of doc.features) {
    if (x.typ !== "kante" || x.ziel !== f.id || x._aus || !x.wert) continue;
    const vor = k[x.key];
    if (x.anhaengen && vor) { const bv = werkzeugAuf(bausteinFuer(vor), m), nb = werkzeugAuf(bausteinFuer(x.wert), m); k[x.key] = { folge: folgeAnhaengen(bausteinFolge(bv, m), bausteinFolge(nb, m)), versatz: +bv.versatz || 0 }; }
    else k[x.key] = x.wert;
  }
  return k;
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
  const daecher = doc.features.filter((x) => x.typ === "dach" && x._dach); if (!daecher.length && !f) return status("Zuerst ein Dach anlegen («Dach automatisch»).");
  const istNeu = !f; f ||= { id: neueId(), typ: "eindeckung", name: "Eindeckung " + (doc.features.filter((x) => x.typ === "eindeckung").length + 1), dach: daecher.at(-1).id };
  featureDialog(f, istNeu, (f) => [{ id: "name", label: "Name", text: true, wert: f.name }, { id: "dach", label: "Dach", optionen: daecher.map((d) => [d.id, d.name]), wert: f.dach }], (f, w) => { f.name = w.name?.trim() || f.name; if (w.dach) f.dach = w.dach; },
    "Ziegel eindecken", "Zuerst alle Spenglerbleche zeichnen («Dachbleche»): die Eindeckung erkennt Kehle, Wangen-/Fussanschlüsse, Fenster, Kamine und Lukarnen und schneidet die Ziegel dort an. Deckbreite und Lattweite kommen aus der Deckung des Dachs (Einstellungen › Dach). Ziegel sind schematisch (Rechtecke ohne Falzform).",
    { info: () => f._fehler ? "⚠ " + f._fehler : f._ziegel ? (f._ohneBleche ? "⚠ Noch keine Dachbleche vor der Eindeckung – die Ziegel werden nur an Rand und Öffnungen geschnitten. " : "") + `Ziegel ${f._ziegel.anzahl} Stk. (davon ${f._ziegel.geschnitten} geschnitten) · Richtwert ${f._ziegel.richtwert}` : "" });
}
function lukarneDialog(f) {
  const daecher = doc.features.filter((x) => x.typ === "dach" && x._dach); if (!daecher.length && !f) return status("Zuerst ein Dach anlegen («Dach automatisch»).");
  const istNeu = !f; f ||= { id: neueId(), typ: "lukarne", name: "Lukarne " + (doc.features.filter((x) => x.typ === "lukarne").length + 1), dach: daecher.at(-1).id, flaeche: 0, masse: "aufmass", art: "sattel", bu: 1800, bo: 1800, hf: 1200, hL: 0, wL: 90, lL: 1500, hR: 0, wR: 90, lR: 1500, b: 1600, hw: 1100, neigung: 30, ueberstand: 200, wd: 150, dd: 250, x: 3000, y: 1500 };
  if (istNeu) { const fl0 = finde(f.dach)?._dach?.flaechen?.[0]; if (fl0) f.lL = f.lR = Math.round(f.hf / Math.tan((fl0.neigung * Math.PI) / 180)); } // Vorgabe: waagrechte Traufe bis zur Dachfläche
  const flOpt = (id) => (finde(id)?._dach?.flaechen || []).map((x, i) => [String(i), `Fläche ${i + 1}: ${x.neigung.toFixed(0)}°, ${x.flaeche.toFixed(1)} m²`]);
  const aufmass = (f) => f.masse === "aufmass";
  const felder = (f) => [{ id: "name", label: "Name", text: true, wert: f.name }, { id: "dach", label: "Dach", optionen: daecher.map((d) => [d.id, d.name]), wert: f.dach }, { id: "flaeche", label: "Dachfläche", optionen: flOpt(f.dach), wert: String(f.flaeche ?? 0) },
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
  const daecher = doc.features.filter((x) => x.typ === "dach" && x._dach); if (!daecher.length && !f) return status("Zuerst ein Dach anlegen («Dach automatisch»).");
  const istNeu = !f; f ||= { id: neueId(), typ: "dachelement", name: "Dachfenster " + (doc.features.filter((x) => x.typ === "dachelement").length + 1), dach: daecher.at(-1).id, flaeche: 0, art: "fenster", velux: "MK04", b: 780, h: 978, x: 3000, y: 1500, hoehe: 1000 };
  const flOpt = (id) => (finde(id)?._dach?.flaechen || []).map((x, i) => [String(i), `Fläche ${i + 1}: ${x.neigung.toFixed(0)}°, ${(x.flaeche).toFixed(1)} m²`]);
  const felder = (f) => [{ id: "name", label: "Name", text: true, wert: f.name }, { id: "dach", label: "Dach", optionen: daecher.map((d) => [d.id, d.name]), wert: f.dach }, { id: "flaeche", label: "Dachfläche", optionen: flOpt(f.dach), wert: String(f.flaeche ?? 0) },
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
  const daecher = doc.features.filter((x) => x.typ === "dach"); if (!daecher.length && !f) return status("Zuerst ein Dach anlegen («Dach automatisch»).");
  const istNeu = !f; f ||= { id: neueId(), typ: "dachbleche", name: "Dachbleche " + (doc.features.filter((x) => x.typ === "dachbleche").length + 1), dach: daecher.at(-1).id, material: neuMaterial(), arten: {}, params: {} };
  const felder = (f) => [{ id: "name", label: "Name", text: true, wert: f.name }, { id: "dach", label: "Dach", optionen: daecher.map((d) => [d.id, d.name]), wert: f.dach }, { id: "material", label: "Material", optionen: matOpt(), wert: f.material },
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
function dachDialog(f) {
  const istNeu = !f; let g;
  if (istNeu) {
    g = { id: neueId(), typ: "gebaeude", name: "Gebäude " + (doc.features.filter((x) => x.typ === "gebaeude").length + 1), breite: 10000, tiefe: 8000, traufhoehe: 3000, wandstaerke: 300, x: 0, z: 0 }; einfuegen(g);
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
const kantenWzText = () => { const w = kantenWz; if (!w) return ""; return w.schritt === "blech" ? "① Flächenblech oder Blechprofil anklicken" : istProfil(w.f) ? `② «${w.f.name}»: Kante A (Anfang) oder Kante B (Ende) wählen` : `② Kante von «${w.f.name}» anklicken`; };
function kantenBarZeigen() {
  const w = kantenWz, bar = $("kantenBar"); bar.hidden = !w; if (!w) return;
  $("kbTitel").textContent = w.typ === "flansch" ? "Flansch" : w.typ === "umschlag" ? "Umschlag" : `Baustein: ${bausteinName(w.baustein)}`;
  $("kbText").textContent = kantenWzText();
  $("kbWinkelL").hidden = w.typ !== "flansch"; document.querySelector("#kantenBar label:nth-of-type(2)").hidden = w.typ === "baustein";
  $("kbRichtung").textContent = `Richtung: ${w.seite === -1 ? "nach hinten" : "Sichtseite"} ⇄`; $("kbEnden").hidden = !(w.schritt === "kante" && istProfil(w.f));
}
function endeKantenWz() { kantenWz = null; menueKante = null; kantenBarZeigen(); zeigeKanten(); }
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
function profilErweiterungen(f, m) {
  return doc.features.filter((x) => x.typ === "profilkante" && x.ziel === f.id && !x._aus).map((x) => { const b = werkzeugAuf(bausteinFuer(x.wert), m); return b && String(b.folge ?? "").trim() ? { ende: x.ende === "B" ? "B" : "A", zeilen: folge(`1 ${bausteinFolge(b, m)}`) } : null; }).filter(Boolean);
}
const istProfil = (h) => h?.typ === "profil" || h?.typ === "vorlage";
function kantenWert(w, m) { // Baustein bzw. Werkzeug der Kantenleiste → Wert für einen Schritt
  if (w.typ === "baustein") { const b = bausteinFuer(w.baustein); return w.seite === -1 ? { folge: folgeUmkehren(bausteinFolge(werkzeugAuf(b, m), m)), versatz: +b.versatz || 0 } : w.baustein; }
  const wk = { ...flanschStandard(w.typ), winkel: parseFloat($("kbWinkel").value) || 90, laenge: parseFloat($("kbLaenge").value) || (w.typ === "umschlag" ? 10 : 25), seite: w.seite }; return werkzeugNeu({ werkzeug: wk }, wk, m);
}
function wendeProfilKante(ende) { // Schritt «Profilkante» in der Zeitleiste anlegen (live)
  const w = kantenWz, f = w?.f; if (!istProfil(f)) return status("Zuerst ein Blechprofil anklicken.");
  const m = material(f.material), titel = w.typ === "flansch" ? "Flansch" : w.typ === "umschlag" ? "Umschlag" : bausteinName(w.baustein);
  const n = { id: neueId(), typ: "profilkante", name: `${titel} ${f.name} · Kante ${ende}`, ziel: f.id, ende, wert: kantenWert(w, m) };
  einfuegen(n); w.letzte = n; regen();
  status(f._fehler ? "⚠ " + f._fehler : `Kante ${ende} von «${f.name}»: «${titel}» angesetzt (Schritt in der Zeitleiste). Weitere Kante wählen oder «Fertig».`);
}
function starteKantenWz(typ, x = 200, y = 80) {
  if (dlg) $("dAbbrechen").click(); if (skizze) return status("Erst die Skizze beenden.");
  const los = (baustein) => { kantenWz = { typ, baustein, seite: 1, schritt: "blech", f: null }; const h = hauptVon(auswahl); if ((h?.typ === "flaeche" || istProfil(h)) && !h.versteckt) { kantenWz.f = h; kantenWz.schritt = "kante"; zeigeKanten(); } kantenBarZeigen(); status(kantenWzText()); };
  if (typ !== "baustein") return los(null);
  const m = $("kantenMenue"), gruppen = [...new Set(alleBausteine().map((b) => b.gruppe || "Eigene"))];
  m.innerHTML = `<div class="kmkopf"><b>Baustein wählen</b><button class="kmzu" data-kmzu aria-label="Schliessen">×</button></div>${gruppen.map((gr) => `<div class="kmgruppe">${esc(gr)}</div>${alleBausteine().filter((b) => (b.gruppe || "Eigene") === gr).map((b) => `<button data-kb="${esc(b.id)}">${esc(b.name)}<small>${esc(b.folge)}</small></button>`).join("")}`).join("")}`;
  m.hidden = false; const r = m.getBoundingClientRect(); Object.assign(m.style, { left: Math.max(8, Math.min(x, innerWidth - r.width - 8)) + "px", top: Math.max(8, Math.min(y, innerHeight - r.height - 8)) + "px" });
  m.onclick = (e) => { const t = e.target.closest("button"); if (!t) return; m.hidden = true; if (t.dataset.kb) los(t.dataset.kb); };
}
function kantenWzKlick(e) { // true = Klick verbraucht
  const w = kantenWz;
  strahl.setFromCamera(ndc(e), kamera);
  const t = strahl.intersectObjects(modell.children.filter((o) => o.isMesh), false)[0], h = t ? hauptVon(t.object.userData.fid) : null;
  if (w.schritt === "kante") { if (w.f.typ === "flaeche") { const k = kanteUnterMaus(w.f, e); if (k) { wendeKantenWz(k); return true; } } if (!((h?.typ === "flaeche" || istProfil(h)) && h !== w.f)) { status(kantenWzText()); return true; } }
  if (h?.typ !== "flaeche" && !istProfil(h)) { status("Hier ist kein Blech – " + kantenWzText()); return true; }
  w.f = h; w.schritt = "kante"; waehle(h.id); zeigeKanten(); kantenBarZeigen(); status(kantenWzText()); return true;
}
function wendeKantenWz(key) { // legt einen Schritt «Kante» in der Zeitleiste an (live, mit eigenem Dialog)
  const w = kantenWz, f = w.f, m = material(f.material), vor = f.kanten?.[key];
  let neu;
  if (w.typ === "baustein") { const b = bausteinFuer(w.baustein); neu = w.seite === -1 ? { folge: folgeUmkehren(bausteinFolge(werkzeugAuf(b, m), m)), versatz: +b.versatz || 0 } : w.baustein; }
  else { const wk = { ...flanschStandard(w.typ), winkel: parseFloat($("kbWinkel").value) || 90, laenge: parseFloat($("kbLaenge").value) || (w.typ === "umschlag" ? 10 : 25), seite: w.seite }; neu = werkzeugNeu({ werkzeug: wk }, wk, m); }
  const titel = w.typ === "flansch" ? "Flansch" : w.typ === "umschlag" ? "Umschlag" : bausteinName(w.baustein);
  const n = { id: neueId(), typ: "kante", name: `${titel} ${kantenName(f, key)}`, ziel: f.id, key, wert: neu, anhaengen: !!vor };
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
    ...(x?.werkzeug ? [...(x.werkzeug.typ === "flansch" ? [{ id: "winkel", label: "Winkel", einheit: "°", wert: x.werkzeug.winkel }] : []), { id: "laenge", label: "Länge", einheit: "mm", wert: x.werkzeug.laenge }, { id: "radius", label: "Radius (0 = automatisch)", einheit: "mm", wert: x.werkzeug.radius ?? 0 },
      ...(x.werkzeug.typ === "flansch" ? [{ id: "bezug", label: "Mass bis", optionen: [["mitte", "Mittellinie"], ["aussen", "Aussenkante"], ["innen", "Innenkante"]], wert: x.werkzeug.bezug || "mitte" }] : []),
      { id: "seite", label: "Richtung", optionen: [["1", "zur Sichtseite"], ["-1", "nach hinten"]], wert: String(x.werkzeug.seite === -1 ? -1 : 1) }]
      : typeof x === "string" ? [{ id: "baustein", label: "Baustein", optionen: alleBausteine().map((b) => [b.id, b.name]), wert: x }]
      : [{ id: "folge", label: "Abkantfolge", text: true, wert: x?.folge ?? "" }]),
    ...(ff.typ === "kante" ? [{ id: "anhaengen", label: "Bei belegter Kante", optionen: [["", "ersetzt den Baustein der Kante"], ["1", "setzt ihn fort (anhängen)"]], wert: ff.anhaengen ? "1" : "" }] : [])]; };
  const setze = (ff, ww) => {
    ff.name = ww.name?.trim() || ff.name; ff.anhaengen = !!ww.anhaengen;
    if (ff.wert?.werkzeug) { const wk = { ...ff.wert.werkzeug }; if (ww.winkel > 0) wk.winkel = ww.winkel; if (ww.laenge > 0) wk.laenge = ww.laenge; wk.radius = ww.radius > 0 ? ww.radius : null; if (ww.bezug) wk.bezug = ww.bezug; wk.seite = +ww.seite === -1 ? -1 : 1; ff.wert = werkzeugNeu(ff.wert, wk, m); }
    else if (typeof ff.wert === "string") ff.wert = ww.baustein || ff.wert;
    else if (ww.folge) { try { folge("100 " + ww.folge); ff.wert = { ...ff.wert, folge: ww.folge }; } catch {} }
  };
  featureDialog(f, false, felder, setze, "Kante bearbeiten", "Ändert den Flansch bzw. Baustein dieser Kante – das Blech passt sich sofort an. Richtung auch per Rechtsklick › «Richtung umkehren».", { wahlNr: -1, aktiveKante: f.key, nachRegen: () => zeigeKanten() });
  zeigeKanten();
}
document.querySelectorAll("[data-kantenwz]").forEach((b) => b.addEventListener("click", () => { const r = b.getBoundingClientRect(); setTimeout(() => starteKantenWz(b.dataset.kantenwz, r.right + 6, r.top), 0); }));
$("kbRichtung").onclick = () => { if (!kantenWz) return; kantenWz.seite = kantenWz.seite === -1 ? 1 : -1; kantenBarZeigen(); if (kantenWz.letzte && finde(kantenWz.letzte.id)) kanteUmkehren(kantenWz.letzte, kantenWz.letzte.key); };
for (const id of ["kbWinkel", "kbLaenge"]) $(id).addEventListener("input", () => { const l = kantenWz?.letzte; if (!l || !finde(l.id) || !l.wert?.werkzeug) return; const wk = { ...l.wert.werkzeug }, a = parseFloat($("kbWinkel").value), c = parseFloat($("kbLaenge").value); if (a > 0 && wk.typ === "flansch") wk.winkel = a; if (c > 0) wk.laenge = c; l.wert = werkzeugNeu(l.wert, wk, material(kantenWz.f.material)); regen(); zeigeKanten(); });
$("kbEnde").onclick = endeKantenWz; $("kbA").onclick = () => wendeProfilKante("A"); $("kbB").onclick = () => wendeProfilKante("B");
document.addEventListener("keydown", (e) => { if (e.key === "Escape" && kantenWz && !dlg && !skizze) { endeKantenWz(); status(""); } });
function flaecheDialog(f) {
  const istNeu = !f;
  const sk = doc.features.filter((x) => x.typ === "skizze" && (schleifen(x).length || skizzenRegionen(x).length));
  if (!sk.length && !f) return status("Zuerst die Grundfläche des Blechs als geschlossenes Profil skizzieren (z. B. Rechteck oder Linienzug, Dachbahnen nebeneinander).");
  f ||= { id: neueId(), typ: "flaeche", name: "Flächenblech " + (doc.features.filter((x) => x.typ === "flaeche").length + 1), skizze: sk.at(-1).id, flaechen: [],
    kanten: {}, material: neuMaterial(), stueck: einst.neu.stueck, sichtseite: 1 };
  const felder = (f) => [
    { id: "skizze", label: Array.isArray(f.flaechen) ? "Flächen in" : "Grundfläche aus", wahl: Array.isArray(f.flaechen) ? "flaechen" : "profil", optionen: sk.map((s) => [s.id, s.name]), wert: f.skizze },
    ...(Array.isArray(f.flaechen) ? [] : [{ id: "profil", label: "Flächen", optionen: [["alle", "Alle Flächen (je ein Blech)"], ...schleifen(finde(f.skizze) || sk.at(-1)).map((_, i) => [i, `Fläche ${i + 1}`])], wert: f.profil ?? "alle" }]),
    { id: "name", label: "Name", text: true, wert: f.name },
    { id: "material", label: "Material", optionen: matOpt(), wert: f.material },
    { id: "sichtseite", label: "Richtung der Abkantungen / Sichtseite", optionen: [["1", "Vorne (Richtung Ebenen-Normale)"], ["-1", "Hinten (gegen die Normale)"]], wert: String(f.sichtseite ?? 1) },
    { id: "lage", label: "Skizze liegt …", optionen: [["mitte", "in der Blechmitte"], ["vorne", "auf der Vorderseite (Blech dahinter)"], ["hinten", "auf der Rückseite (Blech davor)"]], wert: f.lage || "mitte" },
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
      ${fl ? `<label>Mass bis <select data-fw="bezug" data-key="${key}"><option value="mitte" ${w.bezug === "mitte" || !w.bezug ? "selected" : ""}>Mittellinie</option><option value="aussen" ${w.bezug === "aussen" ? "selected" : ""}>Aussenkante</option><option value="innen" ${w.bezug === "innen" ? "selected" : ""}>Innenkante</option></select></label>` : ""}</div>`; };
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
      if (k === "seite") w.seite = +e.target.value; else if (k === "bezug") w.bezug = e.target.value; else { const x = e.target.value === "" ? null : parseFloat(e.target.value); if (k === "radius") w.radius = x > 0 ? x : null; else if (x > 0) w[k] = x; }
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
  const bl = f._blech, a = bl.abw, m = material(f.material), q = quelle(a.breite, einst);
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
    <div class="reihe"><button class="knopf haupt" id="kFlBearb">Bearbeiten</button><button class="knopf" id="kDxf">DXF speichern</button><button class="knopf" id="kDruck">Werkstattblatt drucken</button><button class="knopf" id="kKopie" title="Strg+D">Duplizieren</button></div>`;
  $("kZumDetail").onclick = () => bearbeite(f.eltern);
  $("kFlBearb").onclick = () => bearbeite(f.eltern);
  $("kDxf").onclick = () => herunterladen(`${doc.nr} ${f.name}.dxf`, flaecheDxf(a, f.name), "application/dxf");
  $("kDruck").onclick = () => drucke([f]);
  $("kKopie").onclick = () => dupliziere(f.eltern);
}
function flaechenblatt(f) {
  const bl = f._blech, a = bl.abw, m = material(f.material), q = quelle(a.breite, einst);
  return `<section class="blatt">
    <header><div>${kopf("Werkstattblatt")}<h1>${esc(f.name)}</h1></div>
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
  if (!quer) return koerperGeometrie(fs, s.ebene, f.abstand, f.richtung);
  const m = Math.min(quer.mass, Math.abs(f.abstand) / 2 - 0.01); if (!(m > 0)) return koerperGeometrie(fs, s.ebene, f.abstand, f.richtung);
  // Oben/unten: Kontur um m einziehen, dann mit Fase bzw. Rundung (Bevel) wieder auf die volle Grösse
  fs = formen(s, { aussenFn: (p) => versatzPolylinie(eckenBearbeiten(p, opt(senk)), m, true), lochFn: (p) => versatzPolylinie(eckenBearbeiten(p, opt(senk)), -m, true) }, f);
  const geo = new THREE.ExtrudeGeometry(fs, { depth: Math.abs(f.abstand) - 2 * m, bevelEnabled: true, bevelThickness: m, bevelSize: m, bevelOffset: 0, bevelSegments: quer.art === "fase" ? 1 : 6, curveSegments: 48 });
  geo.translate(0, 0, m);
  const t = Math.abs(f.abstand); if (f.richtung === "umgekehrt") geo.translate(0, 0, -t); else if (f.richtung === "symmetrisch") geo.translate(0, 0, -t / 2);
  geo.applyMatrix4(basis(s.ebene)); return geo;
}
// Schale: Innenraum = Kontur um die Wanddicke eingezogen (Löcher erweitert), Boden/Deckel bleiben je nach «offen»
function schalenWerkzeug(z, f) {
  const s = finde(z.skizze), d = f.dicke > 0 ? f.dicke : 2, t = Math.abs(z.abstand);
  const fs = formen(s, { aussenFn: (p) => versatzPolylinie(p, d, true), lochFn: (p) => versatzPolylinie(p, -d, true) }, z);
  let z0 = d, z1 = t - d;
  if (f.offen === "oben" || f.offen === "beide") z1 = t + 1;
  if (f.offen === "unten" || f.offen === "beide") z0 = -1;
  if (z1 - z0 <= 0) throw new Error("Wanddicke zu gross");
  const geo = new THREE.ExtrudeGeometry(fs, { depth: z1 - z0, bevelEnabled: false, curveSegments: 48 }); geo.translate(0, 0, z0);
  if (z.richtung === "umgekehrt") geo.translate(0, 0, -t); else if (z.richtung === "symmetrisch") geo.translate(0, 0, -t / 2);
  geo.applyMatrix4(basis(s.ebene)); return geo;
}
// Körper eines Features in der Szene (auch Blechteile «id:n») und als Volumenkörper
const koerperVon = (id, volumen) => {
  const l = modell.children.filter((o) => o.isMesh && (o.userData.fid === id || String(o.userData.fid).startsWith(id + ":")));
  const v = volumen.get(id); if (v && !l.includes(v)) l.push(v);
  return l;
};
function transformAus(f, k) {
  const M = new THREE.Matrix4();
  if (f.typ === "bewegen") {
    M.makeTranslation(f.dx || 0, f.dy || 0, f.dz || 0);
    if (f.winkel && f.achse) { const a = bezugKante(f.achse), p = V(a.p), d = V(a.d).normalize(); M.multiply(new THREE.Matrix4().makeTranslation(p.x, p.y, p.z).multiply(new THREE.Matrix4().makeRotationAxis(d, (f.winkel * Math.PI) / 180)).multiply(new THREE.Matrix4().makeTranslation(-p.x, -p.y, -p.z))); }
    return M;
  }
  if (f.typ === "kspiegel") { const e = bezugEbene(f.ebene), n = V(e.n).normalize(), d = n.dot(V(e.o)); return new THREE.Matrix4().set(1 - 2 * n.x * n.x, -2 * n.x * n.y, -2 * n.x * n.z, 2 * d * n.x, -2 * n.y * n.x, 1 - 2 * n.y * n.y, -2 * n.y * n.z, 2 * d * n.y, -2 * n.z * n.x, -2 * n.z * n.y, 1 - 2 * n.z * n.z, 2 * d * n.z, 0, 0, 0, 1); }
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
  const anzahl = f.typ === "kmuster" ? (f.art === "kreis" ? Math.max(2, Math.round(f.anzahl)) : Math.max(1, Math.round(f.anzahl || 1)) * Math.max(1, Math.round(f.anzahl2 || 1))) : 2;
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
function koerperDialog(typ, f) {
  const istNeu = !f, opt = typ === "kantenrund" || typ === "schale" ? vorher(f).filter((x) => x.typ === "extrusion" && (x.vorgang || "neu") === "neu").map((x) => [x.id, x.name]) : koerperOpt(f);
  if (!opt.length) return status(typ === "kantenrund" || typ === "schale" ? "Zuerst einen Körper extrudieren." : "Zuerst einen Körper oder ein Blechteil erstellen.");
  const ziel = finde(auswahl)?.id && opt.some(([id]) => id === auswahl) ? auswahl : opt.at(-1)[0];
  f ||= { id: neueId(), typ, name: KOERPER_WZ[typ] + " " + (doc.features.filter((x) => x.typ === typ).length + 1), ziel,
    ...({ kantenrund: { art: "rund", mass: 5, kanten: "alle" }, schale: { dicke: 2, offen: "oben" }, kmuster: { art: "rechteck", richtung1: "A:X", anzahl: 3, abstand: 200, richtung2: "A:Z", anzahl2: 1, abstand2: 200, achse: "A:Y", winkel: 360 },
      kspiegel: { ebene: "YZ" }, teilen: { ebene: "YZ", behalten: "beide" }, bewegen: { dx: 0, dy: 0, dz: 0, achse: "A:Y", winkel: 0, kopie: false } })[typ] };
  const felder = (f) => [{ id: "name", label: "Name", text: true, wert: f.name }, { id: "ziel", label: "Körper", optionen: opt, wert: f.ziel }, ...({
    kantenrund: () => [{ id: "art", label: "Art", optionen: [["rund", "Abrunden (Radius)"], ["fase", "Fasen (Abstand)"]], wert: f.art }, { id: "mass", label: f.art === "fase" ? "Fase" : "Radius", einheit: "mm", wert: f.mass },
      { id: "kanten", label: "Kanten", optionen: [["alle", "Alle Kanten"], ["senkrecht", "Kanten in Extrusionsrichtung"], ["quer", "Kanten oben und unten"]], wert: f.kanten }],
    schale: () => [{ id: "dicke", label: "Wanddicke", einheit: "mm", wert: f.dicke }, { id: "offen", label: "Offene Seite", optionen: [["oben", "Oben (Ende der Extrusion)"], ["unten", "Unten (Skizzenebene)"], ["beide", "Oben und unten"], ["keine", "Keine (geschlossen hohl)"]], wert: f.offen }],
    kmuster: () => [{ id: "art", label: "Art", optionen: [["rechteck", "Rechteckig"], ["kreis", "Kreisförmig"]], wert: f.art },
      ...(f.art === "kreis" ? [{ id: "achse", label: "Achse", wahl: "kante", optionen: mitWert(kantenListe(f), f.achse), wert: f.achse }, { id: "anzahl", label: "Anzahl", wert: f.anzahl }, { id: "winkel", label: "Gesamtwinkel", einheit: "°", wert: f.winkel }]
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
function kantenDialog(f) {
  const istNeu = !f;
  f ||= { id: neueId(), typ: "kanten3d", name: "Kanten abrunden " + (doc.features.filter((x) => x.typ === "kanten3d").length + 1), art: "rund", mass: 5, kanten: [], ziel: null };
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
  return { res: r.res, geo: g, laenge: L, winkel };
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
function sweepGeometrie(sk, pfad) {
  if (pfad.length < 2) throw new Error("Pfad zu kurz");
  const E = E_(sk.ebene), P = pfad.map(v3).filter((p, i, a) => !i || p.distanceTo(a[i - 1]) > 1e-6);
  // Rahmen entlang des Pfads (Doppelspiegelung: verdreht sich nicht)
  const T = P.map((p, i) => (i < P.length - 1 ? P[i + 1].clone().sub(p) : p.clone().sub(P[i - 1])).normalize());
  let N0 = v3(E.u).sub(T[0].clone().multiplyScalar(v3(E.u).dot(T[0]))); if (N0.lengthSq() < 1e-9) N0 = v3(E.v).sub(T[0].clone().multiplyScalar(v3(E.v).dot(T[0])));
  const N = [N0.normalize()];
  for (let i = 0; i < P.length - 1; i++) {
    const v1 = P[i + 1].clone().sub(P[i]), c1 = v1.dot(v1) || 1, rL = N[i].clone().sub(v1.clone().multiplyScalar((2 / c1) * v1.dot(N[i]))), tL = T[i].clone().sub(v1.clone().multiplyScalar((2 / c1) * v1.dot(T[i])));
    const v2 = T[i + 1].clone().sub(tL), c2 = v2.dot(v2) || 1; N.push(rL.sub(v2.multiplyScalar((2 / c2) * v2.dot(rL))).normalize());
  }
  const B = N.map((n, i) => new THREE.Vector3().crossVectors(T[i], n));
  // Profilpunkte relativ zum Pfadanfang in (N0, B0)
  const ab = (uv) => { const w = v3(zuWelt(E, uv)).sub(P[0]); return [w.dot(N[0]), w.dot(B[0])]; };
  const geos = [];
  for (const s of formen(sk)) {
    const aussen0 = s.getPoints().map((q) => ab([q.x, q.y])), loecher0 = s.holes.map((h) => h.getPoints().map((q) => ab([q.x, q.y])));
    const ccw = (p, soll) => (Math.sign(flaeche2(p)) === soll ? p : p.slice().reverse());
    const aussen = ccw(aussen0.filter((p, i, a) => i < a.length - 1 || Math.hypot(p[0] - a[0][0], p[1] - a[0][1]) > 1e-6), 1);
    const loecher = loecher0.map((h) => ccw(h.filter((p, i, a) => i < a.length - 1 || Math.hypot(p[0] - a[0][0], p[1] - a[0][1]) > 1e-6), -1));
    const bei = (i) => (a, b) => P[i].clone().addScaledVector(N[i], a).addScaledVector(B[i], b);
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
  if (!sk.length) return status("Zuerst ein geschlossenes Profil skizzieren – und einen Pfad (Linie, Bogen, Linienzug oder Körperkante).");
  f ||= { id: neueId(), typ: "sweep", name: "Sweep " + (doc.features.filter((x) => x.typ === "sweep").length + 1), skizze: sk.at(-1).id, pfad: "", vorgang: "neu" };
  if (!f.pfad) f.pfad = pfadListe().find(([w]) => !w.startsWith(`L:${f.skizze}:`))?.[0] || ""; // Pfad nicht aus der Profilskizze
  featureDialog(f, istNeu, (f) => [
    { id: "skizze", label: "Profil aus", wahl: "profil", optionen: sk.map((s) => [s.id, s.name]), wert: f.skizze },
    { id: "pfad", label: "Pfad", wahl: "pfad", optionen: mitWert(pfadListe(f).length ? pfadListe(f) : [["", "– nichts vorhanden –"]], f.pfad), wert: f.pfad },
    ...vorgangFelder(f),
  ], (f, w) => Object.assign(f, w), "Sweep", "Geschlossenes Profil entlang eines Pfads ziehen. Das Profil wird am Pfadanfang angesetzt – am besten auf einer Ebene senkrecht zum Pfad skizzieren (Konstruieren → Ebene entlang Pfad).");
}
function loftDialog(f) {
  const istNeu = !f, sk = doc.features.filter((x) => x.typ === "skizze" && schleifen(x).length);
  if (sk.length < 2) return status("Für einen Übergang zwei Skizzen mit geschlossenem Profil auf verschiedenen Ebenen zeichnen.");
  f ||= { id: neueId(), typ: "loft", name: "Übergang " + (doc.features.filter((x) => x.typ === "loft").length + 1), profil1: sk.at(-2).id, profil2: sk.at(-1).id, profil3: "", vorgang: "neu" };
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
function messMarke(p, farbe = 0xe0782b) {
  const k = new THREE.Mesh(new THREE.SphereGeometry(1, 12, 8), new THREE.MeshBasicMaterial({ color: farbe, depthTest: false }));
  k.position.set(...p); k.userData.bildschirm = 0.006; k.renderOrder = 15; messGruppe.add(k); return k;
}
function messKlick(e) {
  const q = messPunkt(e); if (!q) return status("Hier ist kein Körper – eine Ecke, Kante oder Fläche anklicken.");
  if (!messen.a || messen.b) { leeren(messGruppe); messen = { a: q.p }; messMarke(q.p); $("messAnzeige").innerHTML = `<b>Punkt 1</b> (${q.art}) ${q.p.map((v) => f1(v)).join(" / ")} – zweiten Punkt anklicken`; return; }
  messen.b = q.p; messMarke(q.p);
  const a = messen.a, b = q.p, d = b.map((v, i) => v - a[i]), L = Math.hypot(...d);
  const l = new THREE.Line(new THREE.BufferGeometry().setFromPoints([V(a), V(b)]), new THREE.LineBasicMaterial({ color: 0xe0782b, depthTest: false }));
  l.renderOrder = 15; messGruppe.add(l);
  $("messAnzeige").innerHTML = `<b>Abstand ${f1(L)} mm</b><br>ΔX ${f1(d[0])} · ΔY ${f1(d[1])} · ΔZ ${f1(d[2])} <small>(${q.art})</small>`;
  status(`Abstand ${f1(L)} mm – nächster Klick beginnt eine neue Messung, Esc beendet.`);
}
function messenUmschalten(an = !messen) {
  messen = an ? { a: null } : null; leeren(messGruppe);
  $("messAnzeige").hidden = !an; $("messAnzeige").innerHTML = "Ersten Punkt anklicken: Körperecke, Kantenmitte oder Fläche.";
  $("wMessen").setAttribute("aria-pressed", an);
  status(an ? "Messen: zwei Punkte anklicken. Esc beendet." : "");
}
$("wMessen").onclick = () => { if (skizze) return status("Messen ausserhalb der Skizze – in der Skizze zeigen die Masse die Längen."); if (dlg) $("dAbbrechen").click(); messenUmschalten(); };
document.addEventListener("keydown", (e) => { if (e.key === "Escape" && messen && !skizze) { messenUmschalten(false); e.preventDefault(); } });

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
  const biegeStuecke = biegen.flatMap((l) => l.slice(1).flatMap((q, i) => { const a = l[i], n = Math.max(1, Math.ceil(Math.hypot(q[0] - a[0], q[1] - a[1]) / 1)), st = []; for (let t = 0; t < n; t++) { const p0 = [a[0] + ((q[0] - a[0]) * t) / n, a[1] + ((q[1] - a[1]) * t) / n], p1 = [a[0] + ((q[0] - a[0]) * (t + 1)) / n, a[1] + ((q[1] - a[1]) * (t + 1)) / n]; if (!imLoch([(p0[0] + p1[0]) / 2, (p0[1] + p1[1]) / 2])) st.push([p0, p1]); } return st; }));
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
let einstRegister = "material";
const EINST_REGISTER = [["material", "Materialien"], ["lager", "Lager"], ["neu", "Neue Teile"], ["druck", "Druck"], ["etiketten", "Etiketten"], ["programm", "Programm"], ["bausteine", "Bausteine"], ["detail3d", "Details 3D"], ["vorlagen", "Vorlagen & Sichern"], ["dach", "Dach"], ["konto", "Konto & Cloud"]];
// Feld an einen Wert der Einstellungen binden: data-e="gruppe.schluessel", data-typ zahl|text|janein|wahl
function einstFeld(pfad, label, typ = "zahl", optionen = null, hinweis = "") {
  const [g, k] = pfad.split("."), w = entwurf[g][k], id = "e_" + g + "_" + k;
  const inp = typ === "janein" ? `<input id="${id}" type="checkbox" data-e="${pfad}" data-typ="janein" ${w ? "checked" : ""}>`
    : typ === "wahl" ? `<select id="${id}" data-e="${pfad}" data-typ="wahl">${optionen.map(([v, t]) => `<option value="${esc(v)}" ${String(v) === String(w) ? "selected" : ""}>${esc(t)}</option>`).join("")}</select>`
    : `<input id="${id}" type="${typ === "zahl" ? "number" : "text"}" step="any" ${typ === "zahl" ? 'inputmode="decimal"' : ""} data-e="${pfad}" data-typ="${typ}" value="${esc(w)}">`;
  return `<div class="efeld ${typ === "janein" ? "janein" : ""}"><label for="${id}">${label}</label>${inp}${hinweis ? `<small class="hinweis">${hinweis}</small>` : ""}</div>`;
}
function zeigeEinst() {
  const e = entwurf, feld = (i, k, wert, schritt = "any") => `<input data-i="${i}" data-k="${k}" type="${k === "name" ? "text" : "number"}" step="${schritt}" inputmode="decimal" value="${esc(wert)}">`;
  const reiter = `<div class="register eregister" role="tablist">${EINST_REGISTER.map(([id, t]) => `<button role="tab" data-ereg="${id}" aria-selected="${id === einstRegister}">${t}</button>`).join("")}</div>`;
  const inhalt = {
    material: `
    <h4>Materialien</h4>
    <div class="tabwrap"><table class="zeilen mat"><thead><tr><th>Name</th><th>Dicke mm</th><th>Innenradius mm</th><th>K-Faktor</th><th>Dichte kg/dm³</th><th title="Eigener Erfahrungswert: um wie viel % lässt sich der Rand stauchen">Stauchen max %</th><th title="Eigener Erfahrungswert: um wie viel % lässt sich der Rand strecken">Strecken max %</th><th></th></tr></thead><tbody>
    ${e.materialien.map((m, i) => `<tr><td>${feld(i, "name", m.name)}</td><td>${feld(i, "t", m.t)}</td><td>${feld(i, "ri", m.ri)}</td><td>${feld(i, "k", m.k)}</td><td>${feld(i, "dichte", m.dichte ?? "")}</td><td>${feld(i, "umSchr", m.umform?.schrumpfMaxProzent ?? "")}</td><td>${feld(i, "umStr", m.umform?.streckMaxProzent ?? "")}</td>
      <td>${e.materialien.length > 1 ? `<button class="weg" data-weg="${i}" aria-label="${esc(m.name)} entfernen">×</button>` : ""}</td></tr>`).join("")}
    </tbody></table></div>
    <button class="knopf" id="eNeuMat">+ Material</button>
    <h4>K-Faktor aus Probebiegung</h4>
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
    <p class="hinweis">Je Material und Dicke einmal machen. Zur Kontrolle danach ein Profil mit mehreren Biegungen abkanten und mit der Abkantliste vergleichen.</p>
    <div class="probe">
      <label>Material <select id="pMat">${e.materialien.map((m, i) => `<option value="${i}" ${i === probeWerte.mat ? "selected" : ""}>${esc(m.name)}</option>`).join("")}</select></label>
      <label>Zuschnitt mm <input id="pZ" type="number" step="any" inputmode="decimal" value="${probeWerte.z}"></label>
      <label>Schenkel a aussen mm <input id="pA" type="number" step="any" inputmode="decimal" placeholder="z. B. 50.7" value="${probeWerte.a}"></label>
      <label>Schenkel b aussen mm <input id="pB" type="number" step="any" inputmode="decimal" placeholder="z. B. 50.7" value="${probeWerte.b}"></label>
    </div>
    <p id="pErgebnis" class="hinweis">a und b eingeben.</p>`,
    lager: `
    <h4>Lagerformate</h4>
    <p class="hinweis">Für den Vorschlag «Aus …» in der Werkstatt und den Materialbedarf: zuerst das kleinste passende Spaltband, sonst Coil, sonst Tafel.</p>
    <div class="probe">
      <label>Spaltbänder mm <input id="lBand" type="text" value="${e.spaltbaender.join(", ")}"><small class="hinweis">mit Komma getrennt</small></label>
      <label>Coil-Breite mm <input id="lCoil" type="number" step="any" value="${e.coil}"><small class="hinweis">0 = kein Coil</small></label>
      <label>Tafeln B×L mm <input id="lTafeln" type="text" value="${e.tafeln.map(([b, l]) => `${b}×${l}`).join(", ")}"><small class="hinweis">z. B. 1000×2000, 1250×2500</small></label>
    </div>`,
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
      ${einstFeld("skizze.raster", "Fangraster mm", "zahl", null, "0 = aus (Standard): es wird nur an Punkten, Mitten und Linien gefangen. Mit einem Wert rasten Punkte zusätzlich auf dieses Mass ein (Umschalt hält das Raster aus)")}
      ${einstFeld("skizze.abstand", "Abstand der Teile mm", "zahl", null, "Vorlagen und freie Profile stehen in 3D nebeneinander")}
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
    <p class="hinweis">Masse vom Etikettenbogen ablesen (Packung des Herstellers). Standard: 3 × 8 Etiketten à 70 × 37 mm ohne Rand.</p>
    <div class="egitter">
      ${einstFeld("etiketten.spalten", "Spalten")}${einstFeld("etiketten.zeilen", "Zeilen")}
      ${einstFeld("etiketten.breite", "Etikett breit mm")}${einstFeld("etiketten.hoehe", "Etikett hoch mm")}
      ${einstFeld("etiketten.oben", "Rand oben mm")}${einstFeld("etiketten.links", "Rand links mm")}
      ${einstFeld("etiketten.abstandX", "Abstand waagrecht mm")}${einstFeld("etiketten.abstandY", "Abstand senkrecht mm")}
    </div>
    <p class="hinweis" id="eEtikPruef"></p>`,
    programm: `
    <h4>Darstellung</h4>
    <div class="egitter">${einstFeld("programm.darstellung", "Farben", "wahl", [["auto", "Wie das Gerät"], ["hell", "Hell"], ["dunkel", "Dunkel"]])}</div>
    <h4>Exakter CAD-Kern (Beta)</h4>
    <div class="egitter">${einstFeld("programm.kern", "CAD-Kern", "wahl", [["netz", "Aus – wie Version 0.2"], ["occt", "Ein – OpenCascade 8.0 (Beta)"]])}</div>
    <p class="hinweis">Ein: exakter STEP-Export (B-Rep, AP242) für Blechteile und 3D-Prüfung des Zuschnitts in der Werkstatt. Lädt beim ersten Gebrauch einmalig ~7 MB; braucht die Web-Version oder das PC-Programm (nicht als Datei per Doppelklick). Lizenz: OpenCascade LGPL 2.1, Hinweise im Ordner «cad/LIZENZEN».</p>
    <h4>PC-Programm</h4>
    ${pc ? `<div class="egitter">
      ${einstFeld("programm.updates", "Beim Start nach Updates suchen", "janein")}
      ${einstFeld("programm.zuletzt", "Anzahl «Zuletzt»-Projekte")}
    </div>
    <div class="reihe ohnerand"><button class="knopf" id="eUpdate">Jetzt nach Updates suchen</button></div>`
      : '<p class="hinweis">Updates und «Zuletzt» gibt es nur im Windows-Programm. Die Web-Version ist immer aktuell.</p>'}
    <p class="hinweis">Version ${VERSION}</p>
    <h4>Selbsttest</h4><p class="hinweis">Prüft die Rechenkerne (Biegung, Kurzschrift, Parameter, Kantenbausteine, Rundblech, Umformung) gegen bekannte Werte.</p>
    <div class="reihe ohnerand"><button class="knopf" id="eSelbstTest">Selbsttest ausführen</button></div><div id="eSelbst"></div>`,
    bausteine: `
    <h4>Kantenbausteine für Flächenbleche</h4>
    <p class="hinweis">Abkantfolge ab der gezeichneten Kante nach aussen: Winkel Schenkel Winkel Schenkel … – + biegt zur Sichtseite, − nach hinten, U+ / U− = Umschlag, «90r5» = Radius 5, «U-r1.4» = Umschlag um eine Lage.
      Versatz: die Kante liegt so viel weiter aussen (z. B. Oberfalz neben dem Unterfalz = Blechdicke). Partner: Gegenstück, das eine gemeinsame Kante automatisch bekommt.</p>
    <div class="tabwrap"><table class="zeilen bausteine"><thead><tr><th></th><th>Name</th><th>Gruppe</th><th>Abkantfolge</th><th>Versatz</th><th>Partner</th><th></th></tr></thead><tbody>
    ${e.bausteine.map((b, i) => `<tr data-bi="${i}"><td><button class="knopf klein" data-bedit="${i}" aria-label="${esc(b.name)} bearbeiten">✎</button></td><td><input data-bk="name" value="${esc(b.name)}" aria-label="Name"></td><td><input data-bk="gruppe" value="${esc(b.gruppe || "")}" aria-label="Gruppe"></td>
      <td><input data-bk="folge" class="folge" value="${esc(b.folge)}" aria-label="Abkantfolge"></td><td><input data-bk="versatz" type="number" step="any" value="${b.versatz || 0}" aria-label="Versatz"></td>
      <td><select data-bk="partner" aria-label="Partner"><option value="">–</option>${e.bausteine.filter((x) => x !== b).map((x) => `<option value="${esc(x.id)}" ${b.partner === x.id ? "selected" : ""}>${esc(x.name)}</option>`).join("")}</select></td>
      <td class="nowrap"><button class="weg" data-bweg="${i}" aria-label="${esc(b.name)} entfernen">×</button></td></tr>`).join("")}
    </tbody></table></div>
    <div class="reihe ohnerand"><button class="knopf" id="eNeuBaustein">+ Baustein</button><button class="knopf" id="eBausteineStandard">Standard-Bausteine ergänzen</button></div>`,
    dach: `<h4>Dachdeckung</h4>
    <p class="hinweis">Richtwerte – vor dem Einsatz am gewählten Produkt prüfen und hier anpassen. Beim Erstellen eines Dachs wählst du die Deckung; die Werte werden ins Projekt übernommen.</p>
    <div class="tabwrap"><table class="zeilen"><thead><tr><th>Name</th><th>Lattweite</th><th>Deckbreite</th><th>Schichtdicke</th><th>Ziegellänge</th><th>Ziegeldicke</th><th>Stück/m²</th><th>kg/m²</th><th>Min.-Neigung °</th><th>Latte b</th><th>Latte h</th><th></th></tr></thead><tbody>
    ${(e.dach ||= dachGrund()).deckungen.map((d, i) => `<tr>${[["name", "text"], ["lattweite"], ["deckbreite"], ["ziegelDicke"], ["ziegelLaenge"], ["ziegelT"], ["stueckProM2"], ["gewichtProM2"], ["mindestNeigung"], ["lattenB"], ["lattenH"]].map(([k, t]) => `<td><input data-dach="d:${i}:${k}" type="${t || "number"}" step="any" value="${esc(d[k] ?? "")}" aria-label="${k}"></td>`).join("")}<td>${e.dach.deckungen.length > 1 ? `<button class="weg" data-dweg="d:${i}" aria-label="entfernen">×</button>` : ""}</td></tr>`).join("")}</tbody></table></div>
    <button class="knopf" data-dneu="d">+ Deckung (Kopie der letzten)</button>
    <h4>Dachaufbau</h4>
    <div class="tabwrap"><table class="zeilen"><thead><tr><th>Name</th><th>Sparren b</th><th>Sparren h</th><th>Achsabstand</th><th>Dämmung</th><th>Dämmdicke</th><th>Unterdach</th><th>Konterlatte b</th><th>Konterlatte h</th><th></th></tr></thead><tbody>
    ${e.dach.aufbauten.map((a, i) => `<tr>${[["name", "text"], ["sparrenB"], ["sparrenH"], ["achsabstand"], ["daemmung", "sel"], ["daemmDicke"], ["unterdachDicke"], ["konterB"], ["konterH"]].map(([k, t]) => t === "sel" ? `<td><select data-dach="a:${i}:${k}"><option value="zwischen" ${a[k] === "zwischen" ? "selected" : ""}>zwischen</option><option value="aufsparren" ${a[k] === "aufsparren" ? "selected" : ""}>auf Sparren</option></select></td>` : `<td><input data-dach="a:${i}:${k}" type="${t || "number"}" step="any" value="${esc(a[k] ?? "")}" aria-label="${k}"></td>`).join("")}<td>${e.dach.aufbauten.length > 1 ? `<button class="weg" data-dweg="a:${i}" aria-label="entfernen">×</button>` : ""}</td></tr>`).join("")}</tbody></table></div>
    <button class="knopf" data-dneu="a">+ Aufbau (Kopie des letzten)</button>
    <h4>Voreinstellung</h4>
    <div class="reihe"><label>Deckung <select data-dach="s:0:standardDeckung">${e.dach.deckungen.map((d) => `<option value="${esc(d.id)}" ${e.dach.standardDeckung === d.id ? "selected" : ""}>${esc(d.name)}</option>`).join("")}</select></label>
    <label>Aufbau <select data-dach="s:0:standardAufbau">${e.dach.aufbauten.map((a) => `<option value="${esc(a.id)}" ${e.dach.standardAufbau === a.id ? "selected" : ""}>${esc(a.name)}</option>`).join("")}</select></label></div>`,
    detail3d: `
    <h4>3D-Detailvorlagen (STEP)</h4>
    <p class="hinweis">Körper für wiederkehrende Details (Kehle, Stutzen, Halter …) als STEP-Datei. Konvention: <b>Ursprung = Anfang der Ankerkante, +X = Richtung der Kante, +Z = Sichtseite</b>, Masse in mm. Eingesetzt wird mit «3D-Detail» (Blech ▾) an einer Kante. Die Vorlagen werden mit der Firma abgeglichen (bis 1.5 MB je Vorlage).</p>
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
    <p class="hinweis">Einstellungen gelten pro Gerät. Zum Übertragen (z. B. PC → Handy) hier als Datei sichern und auf dem anderen Gerät laden.
      Laden übernimmt alle Einstellungen und ergänzt eigene Vorlagen.</p>
    <div class="reihe ohnerand"><button class="knopf" id="eExport">Als Datei sichern</button><button class="knopf" id="eImport">Aus Datei laden</button></div>`,
  };
  $("eInhalt").innerHTML = reiter + inhalt[einstRegister];
  if (einstRegister === "material") probe();
  if (einstRegister === "etiketten") etikettenPruefen();
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
  else if (t.dataset.e) einstWert(t);
  if (["pMat", "pZ", "pA", "pB"].includes(t.id)) probe();
});
function einstWert(t) {
  const [g, k] = t.dataset.e.split("."), typ = t.dataset.typ;
  entwurf[g][k] = typ === "janein" ? t.checked : typ === "zahl" ? parseFloat(t.value) : t.value;
  if (g === "etiketten" && $("eEtikPruef")) etikettenPruefen();
}
$("eInhalt").addEventListener("change", (ev) => {
  if (ev.target.id === "pMat") probe();
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
  einstSpeichern(); darstellung(); kernAnzeige();
  regen(); status("Einstellungen gespeichert. Alle Teile neu berechnet.");
};

// ------------------------------------------------------------ Hilfe
const hilfe = (auf) => { $("hilfe").hidden = !auf; };
$("wHilfe").onclick = () => hilfe(true);
$("hZu").onclick = () => hilfe(false);
$("hVersion").textContent = `Version ${VERSION}` + (pc ? " · PC-Programm" : " · Web-Version");
document.addEventListener("keydown", (e) => {
  if (e.key === "F1") { e.preventDefault(); hilfe($("hilfe").hidden); }
  else if (e.key === "Escape") { if (!$("bEditor").hidden) $("bAbbrechen").click(); else if (!$("hilfe").hidden) hilfe(false); else if (!$("einst").hidden) $("eAbbrechen").click(); }
});
document.querySelectorAll(".modal").forEach((m) => m.addEventListener("click", (e) => { if (e.target === m) (m.id === "hilfe" ? hilfe(false) : $("eAbbrechen").click()); }));

// ------------------------------------------------------------ Ansichten
function fitte(box) {
  if (box.isEmpty()) box = new THREE.Box3(new THREE.Vector3(-200, -200, -200), new THREE.Vector3(200, 200, 200));
  const c = box.getCenter(new THREE.Vector3()), r = box.getSize(new THREE.Vector3()).length() / 2 || 200;
  const dir = kamera.position.clone().sub(steuerung.target).normalize();
  steuerung.target.copy(c); kamera.position.copy(c.clone().add(dir.multiplyScalar(r * 3)));
  kamera.near = r / 100; kamera.far = r * 50; kamera.updateProjectionMatrix();
}
const alleBox = () => { const b = new THREE.Box3(); modell.children.forEach((o) => { if (!o.userData.konstruktion) b.expandByObject(o); }); b.union(new THREE.Box3().setFromObject(live)); if (bilder.children.length) b.union(new THREE.Box3().setFromObject(bilder)); return b; }; // Achsen sind «unendlich» lang
function ansicht(name) {
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
  projizieren: { aendern: true, knopf: "tProjizieren", text: "Projizieren: Körperkante oder Linie einer anderen Skizze anklicken (Umschalt + Klick: die ganze Skizze) – oder eine Körperfläche (ihr Umriss). Kreise und Bögen parallel liegender Skizzen bleiben Kreise/Bögen. Projizierte Linien sind fixiert (violett)." },
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
  skizze.werkzeug = w; skizze.pkt = []; skizze.quelle = null; skizze.picks = []; skizze.fangRefs = []; skizze.mehr = new Set(); skizze.basis = null; skizze.basis2 = null;
  document.querySelectorAll(".massbox").forEach((b) => b.remove());
  const knopf = WERKZEUGE[w].knopf;
  document.querySelectorAll("#gSkizze .wz[id^='t']").forEach((b) => b.setAttribute("aria-pressed", b.id === knopf));
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
$("tEntf").onclick = () => { if (skizze && !skizze.sel && !skizze.bsel && skizze.werkzeug !== "auswahl") setzeWerkzeug("auswahl"); loescheSkizzenAuswahl(); };
$("tHilfs").onclick = () => { if (!skizze?.sel) return status("Zuerst ein Element anklicken (Werkzeug Auswahl)."); skizze.sel.hilfs = !skizze.sel.hilfs; status(skizze.sel.hilfs ? "Hilfslinie." : "Normale Linie."); zeichneLive(); };
function starteSkizze(f) {
  vorbereiten(f); // IDs, Abhängigkeiten; alte Rechtecke werden Linienzüge mit H/V
  skizze = { f, werkzeug: "linie", pkt: [], maus: null, sel: null, bsel: null, zug: null, quelle: null, ecken: 6, radius: 10, picks: [], fangRefs: [], mehr: new Set(), basis: null };
  $("gSkizze").hidden = false; setTimeout(leisteZustand); setTimeout(layerZeigen);
  ["wSkizze", "wExtrusion", "wDrehung", "wSweep", "wLoft", "wBlech", "wVorlage", "wProfil", "wFlaeche", "wEbene"].forEach((id) => ($(id).disabled = true));
  steuerung.mouseButtons = { LEFT: null, MIDDLE: THREE.MOUSE.PAN, RIGHT: null };
  steuerung.touches = { ONE: null, TWO: THREE.TOUCH.DOLLY_PAN };
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
  kamera.position.copy(V(E.o).add(V(E.n).multiplyScalar(500)).add(new THREE.Vector3(0, 0, Math.abs(E.n[1]) > 0.999 ? 0.5 : 0)));
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
function beendeSkizze() {
  if (!skizze) return;
  abschliessenLinie();
  const f = skizze.f;
  skizze = null;
  if (!f.elemente.length) entferneFeature(f);
  $("gSkizze").hidden = true; setTimeout(leisteZustand); setTimeout(layerZeigen);
  ["wSkizze", "wExtrusion", "wDrehung", "wSweep", "wLoft", "wBlech", "wVorlage", "wProfil", "wFlaeche", "wEbene"].forEach((id) => ($(id).disabled = false));
  steuerung.mouseButtons = { LEFT: null, MIDDLE: THREE.MOUSE.PAN, RIGHT: null };
  steuerung.touches = { ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_PAN };
  szene.remove(skizzenRaster); skizzenRaster = null; boden.visible = true;
  $("eingabe").hidden = true; leeren(live); labels = []; document.querySelectorAll(".massbox").forEach((b) => b.remove()); $("fgAnzeige").textContent = "";
  status(f.elemente.length ? "Skizze fertig. Jetzt «Extrudieren» (geschlossene Profile) oder «Blechprofil» (offener Linienzug)." : "");
  regen();
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
function projizieren(sm) {
  const f = skizze.f, E = E_(f.ebene), auf = (w) => zuLokal(E, w), kand = [];
  for (const [a, b] of koerperKanten()) kand.push({ a, b, zug: [a, b], name: "Körperkante" });
  for (const sk of vorher(f).filter((x) => x.typ === "skizze" && ebene(x.ebene))) for (const el of sk.elemente) for (const pts of elGeo(el).linien) {
    const w = pts.map((q) => zuWelt(E_(sk.ebene), q));
    for (let i = 1; i < w.length; i++) kand.push({ a: w[i - 1], b: w[i], zug: w, zu: !!elGeo(el).kontur, name: sk.name, sk, el });
  }
  let best = null, bd = 12;
  for (const k of kand) { const A = aufSchirm(k.a), B = aufSchirm(k.b); if (A[2] < 1 && B[2] < 1) { const d = abstandStrecke(sm, A, B); if (d < bd) { bd = d; best = k; } } }
  let zuege = [], exakt = [];
  // Ebenen parallel: Kreise und Bögen bleiben echte Kreise/Bögen (sonst Linienzug)
  const parallel = (sk) => Math.abs(V(E_(sk.ebene).n).dot(V(E.n))) > 0.99999;
  const exaktes = (sk, el) => { if (!parallel(sk) || (el.art !== "kreis" && el.art !== "bogen")) return null; const Es = E_(sk.ebene), P = (q) => auf(zuWelt(Es, q)); return el.art === "kreis" ? { art: "kreis", c: P(el.c), r: el.r } : { art: "bogen", a: P(el.a), b: P(el.b), m: P(el.m) }; };
  if (best && umschaltAn && best.sk) { // Umschalt: die ganze Skizze (alle Linien, Kreise, Bögen)
    for (const el of best.sk.elemente) { if (el.hilfs || el.art === "punkt") continue; const e = exaktes(best.sk, el); if (e) { exakt.push(e); continue; }
      for (const pts of elGeo(el).linien) zuege.push({ pts: pts.map((q) => auf(zuWelt(E_(best.sk.ebene), q))), zu: !!elGeo(el).kontur }); }
  } else if (best) { const e = best.sk && exaktes(best.sk, best.el); if (e) exakt.push(e); else zuege = [{ pts: best.zug.map(auf), zu: best.zu }]; }
  else { // Fläche angeklickt: alle Körperkanten in ihrer Ebene
    const r = leinwand.getBoundingClientRect();
    strahl.setFromCamera(new THREE.Vector2((sm[0] / r.width) * 2 - 1, -(sm[1] / r.height) * 2 + 1), kamera);
    const hit = strahl.intersectObjects(modell.children.filter((o) => o.isMesh), false)[0];
    if (!hit) return status("Körperkante, Körperfläche oder Linie einer anderen Skizze anklicken.");
    const n = hit.face.normal.clone().transformDirection(hit.object.matrixWorld), o = hit.point, inEbene = (w) => Math.abs(V(w).sub(o).dot(n)) < 0.01;
    const stuecke = koerperKanten().filter(([a, b]) => inEbene(a) && inEbene(b)).map(([a, b]) => ({ pts: [auf(a), auf(b)] }));
    zuege = verbindeStuecke(stuecke).map((z) => ({ pts: z.pts, zu: z.geschlossen }));
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
  status(neu.length ? `Projiziert: ${neu.length} Element${neu.length === 1 ? "" : "e"} (fixiert)${best?.sk && !umschaltAn ? " – mit Umschalt + Klick die ganze Skizze «" + best.sk.name + "»" : ""}.` : "Die Kante steht senkrecht zur Skizzenebene – nichts zu projizieren.");
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
    b.w = b.typ === "knick" || b.typ === "winkel" ? Math.sign(alt || 1) * wert * RAD : wert;
    if (!loeseSkizze(skizze.f).ok) { b.w = alt; loeseSkizze(skizze.f); status(GRUND.widerspruch); }
    return zeichneLive();
  }
  const el = m.el, e = el.id;
  if (m.art === "radius") { el.radien = { ...el.radien, [m.i]: wert }; return zeichneLive(); } // Abrundung = Biegeradius, direkt
  const n = el.pts?.length, ring = (i) => "p" + ((i + n) % n);
  const b = { laenge: () => ({ typ: "abstand", a: { e, k: "p" + m.i }, b: { e, k: ring(m.i + 1) }, w: wert }),
    winkel: () => ({ typ: "knick", a: { e, k: ring(m.i - 1) }, p: { e, k: "p" + m.i }, n: { e, k: ring(m.i + 1) }, w: (drehung(el.pts, m.i) < 0 ? -1 : 1) * wert * RAD }),
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
$("labels").addEventListener("click", (e) => {
  const kd = e.target.closest(".kante");
  if (kd && !skizze) { const f = finde(kd.dataset.fid); if (!f) return; const r = kd.getBoundingClientRect();
    if (dlg?.feature === f && dlg.kanteGewaehlt) return dlg.kanteGewaehlt(kd.dataset.kante, r.right, r.top);
    if (!dlg && kantenWz?.schritt === "kante" && kantenWz.f === f) wendeKantenWz(kd.dataset.kante); return; }
  const d = e.target.closest(".mass, .klickbar"); if (!d || !skizze) return;
  const l = labels[+d.dataset.i]; if (!l) return;
  if (l.glyph) { skizze.bsel = l.bed; skizze.sel = null; status(`${ABH_NAME[l.bed.typ]} gewählt – Entf löscht die Abhängigkeit.`); return zeichneLive(); }
  if (!l.edit) return;
  massEingabe(d.style.left, d.style.top, l.edit.bed?.ausdruck ?? parseFloat(l.t.replace(/[^\d.\-]/g, "")), (w, _, ausdruck) => (w == null && l.edit.bed ? entferneBed(l.edit.bed) : massAendern(l.edit, w, ausdruck)));
});

let labels = [];
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
  fg.title = A ? fgText(A.dof) + " (Freiheitsgrade: so viele Masse/Abhängigkeiten fehlen noch)" : "";

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
  live.add(skizzenObjekt(temp, 0xe0782b));
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
  if (hl.length) live.add(skizzenObjekt({ ebene: f.ebene, elemente: hl.filter(Boolean) }, 0xe0782b));
  if (hp.length) { const o = new THREE.Points(new THREE.BufferGeometry().setFromPoints(hp.map((p) => zu3D(f.ebene, p))), new THREE.PointsMaterial({ color: 0xe0782b, size: 11, sizeAttenuation: false, depthTest: false })); o.renderOrder = 12; live.add(o); }
  // Masse: treibende Masse ersetzen die Referenzmasse an derselben Stelle
  const getrieben = new Set();
  for (const b of f.bedingungen || []) {
    if (b.typ === "abstand" && b.a.e === b.b.e) getrieben.add("L:" + b.a.e + ":" + [b.a.k, b.b.k].sort().join(":"));
    if (b.typ === "knick") getrieben.add("W:" + b.p.e + ":" + b.p.k);
    if (b.typ === "radius" || b.typ === "durchmesser") getrieben.add("K:" + b.k.e);
  }
  const frei = (k) => !getrieben.has(k);
  const lab = (a, b, txt, edit, winkel) => labels.push({ p: zu3D(f.ebene, [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]), t: txt, edit, winkel });
  const fest = new Set(f.elemente);
  for (const el of [...f.elemente, ...temp.elemente]) {
    const ed = fest.has(el);
    if (el.art === "linie") {
      el.pts.forEach((p, i) => { const j = el.pts[i + 1] ? i + 1 : el.geschlossen ? 0 : -1, q = el.pts[j]; if (q && frei("L:" + el.id + ":" + ["p" + i, "p" + j].sort().join(":"))) lab(p, q, f1(Math.hypot(q[0] - p[0], q[1] - p[1])), ed && { el, art: "laenge", i }); });
      const n = el.pts.length;
      for (let i = el.geschlossen ? 0 : 1; i < (el.geschlossen ? n : n - 1); i++) {
        const w = drehung(el.pts, i);
        if (Math.abs(w) > 0.05 && n > 2 && frei("W:" + el.id + ":p" + i)) lab(el.pts[i], el.pts[i], Math.abs(w).toFixed(1).replace(/\.0$/, "") + "°", ed && { el, art: "winkel", i }, true);
      }
      for (const [i, R] of Object.entries(el.radien || {})) { const a = abrundung(el.pts, +i, R, el.geschlossen); if (a) lab(a.m, a.m, "R " + f1(a.r), ed && { el, art: "radius", i: +i }, true); }
    } else if (el.art === "rechteck") {
      lab(el.a, [el.b[0], el.a[1]], f1(Math.abs(el.b[0] - el.a[0])), ed && { el, art: "breite" });
      lab(el.a, [el.a[0], el.b[1]], f1(Math.abs(el.b[1] - el.a[1])), ed && { el, art: "hoehe" });
    } else if (el.art === "kreis") { if (frei("K:" + el.id)) lab(el.c, [el.c[0] + el.r * 2, el.c[1]], "Ø " + f1(el.r * 2), ed && { el, art: "durchmesser" }); }
    else if (el.art === "bogen") { const d = bogenDaten(el); if (d && frei("K:" + el.id)) lab(el.m, el.m, "R " + f1(d.r), ed && { el, art: "bogenR" }, true); }
    else if (el.art === "ellipse") { lab(el.c, el.a, "a " + f1(abst(el.c, el.a)), false); lab(el.c, el.c, "b " + f1(el.r2), false, true); }
    else if (el.art === "langloch") { if (frei("L:" + el.id + ":a:b")) lab(el.a, el.b, f1(abst(el.a, el.b)), ed && { el, art: "langL" }); if (frei("K:" + el.id)) lab(el.b, el.b, "B " + f1(el.r * 2), ed && { el, art: "langB" }, true); }
  }
  // Treibende Masse (fett, umrandet) und Symbole der Abhängigkeiten (anklicken → Entf löscht)
  const dim = (uv, t, b, w) => uv && labels.push({ p: zu3D(f.ebene, uv), t: b.ausdruck ? `fx ${t}` : t, edit: { bed: b }, bed: b, treibend: true, winkel: w });
  const zaehler = new Map(), lm = (r) => { const l = B.L(r); return l && mitte(l[0], l[1]); };
  const glyph = (uv, b) => {
    if (!uv) return;
    const k = uv.map((z) => Math.round(z * 10)).join(","), n = zaehler.get(k) || 0; zaehler.set(k, n + 1);
    labels.push({ p: zu3D(f.ebene, uv), t: GLYPHE[b.typ], bed: b, glyph: true, versatz: [12 + 15 * n, 12] });
  };
  const nahMaus = (uv) => { if (!uv || !m) return false; const a = bildschirm(uv), c = bildschirm(m); return Math.hypot(a[0] - c[0], a[1] - c[1]) < 30; };
  for (const b of f.bedingungen || []) switch (b.typ) {
    case "abstand": { const a = B.P(b.a), q = B.P(b.b); if (a && q) dim(mitte(a, q), f1(b.w), b); break; }
    case "abstandH": case "abstandV": { const a = B.P(b.a), q = B.P(b.b); if (a && q) dim(mitte(a, q), (b.typ === "abstandH" ? "↔ " : "↕ ") + f1(b.w), b); break; }
    case "punktLinie": { const p = B.P(b.p), l = B.L(b.l); if (p && l) dim(mitte(p, projektion(p, l)), f1(b.w), b); break; }
    case "winkel": { const l = B.L(b.l2); if (l) dim(lm(b.l2), grad(b.w), b, true); break; }
    case "knick": dim(B.P(b.p), grad(b.w), b, true); break;
    case "radius": { const k = B.K(b.k); if (k) dim(k.anker, "R " + f1(b.w), b, true); break; }
    case "durchmesser": { const k = B.K(b.k); if (k) dim(k.el.art === "langloch" ? k.el.b : [k.c[0] + k.r, k.c[1]], (k.el.art === "langloch" ? "B " : "Ø ") + f1(b.w), b, k.el.art === "langloch"); break; }
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
  if (m) status(`u ${f1(m[0])}  v ${f1(m[1])} mm · ${f.name} auf ${ebenenName(f.ebene)}`, true);
}
function zeigeLabels() {
  const box = $("labels"), alle = skizze ? labels : [...labels, ...kantenLabels];
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
    const aw = skizze?.werkzeug === "auswahl";
    d.className = [l.edit && aw && "mass", l.winkel && "winkel", l.treibend && "treibend", l.glyph && "glyph", l.glyph && aw && "klickbar", l.bed && l.bed === skizze?.bsel && "gewaehlt"].filter(Boolean).join(" ");
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
leinwand.addEventListener("pointermove", (e) => {
  if (!skizze) { if (messen) { const q = messPunkt(e); fangZeigen(q ? { art: q.fa, s: q.s } : null); } else if (aktiveWahl()) hoverWahl(e); else hoverLoeschen(); return; }
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
  if (skizze) { const r = ebenenPunkt(e); if (r) klick(r.uv, r.fang, smPos(e), r.ref); return; }
  if (messen && !skizze) { messKlick(e); return; }
  if (dlg?.kantenWahl?.(e)) return;
  if (uebernimmWahl(e)) return;
  if (kantenWz && !dlg && kantenWzKlick(e)) return;
  strahl.setFromCamera(ndc(e), kamera);
  const treffer = strahl.intersectObjects(modell.children.filter((o) => o.isMesh), false)[0]; // Körper vor Ebenen
  const ebenenTreffer = strahl.intersectObjects(modell.children.filter((o) => o.userData.ebene), true).find((x) => x.object.isMesh);
  waehle(treffer ? treffer.object.userData.fid : ebenenTreffer ? ebenenTreffer.object.userData.ebene : null);
});
leinwand.addEventListener("dblclick", () => {
  if (skizze?.werkzeug === "linie" || skizze?.werkzeug === "spline") abschliessenLinie();
  else if (skizze?.werkzeug === "auswahl" && skizze.sel?.art === "text") { // Text ändern: Inhalt, Höhe, Winkel
    const el = skizze.sel, t = prompt("Text", el.text); if (t == null) return;
    const h = parseFloat(String(prompt("Schrifthöhe in mm", el.hoehe)).replace(",", ".")), w = parseFloat(String(prompt("Drehwinkel in °", el.winkel || 0)).replace(",", "."));
    if (t.trim()) el.text = t.trim(); if (h > 0) el.hoehe = h; if (Number.isFinite(w)) el.winkel = w; TEXTE.clear(); zeichneLive();
  }
});
document.addEventListener("keydown", (e) => {
  if (!skizze) return;
  const imFeld = e.target.closest?.("#eingabe");
  if (e.key === "Escape" && (skizze.picks.length || skizze.bsel)) { skizze.picks = []; skizze.bsel = null; document.querySelectorAll(".massbox").forEach((b) => b.remove()); zeichneLive(); e.preventDefault(); return; }
  if (e.key === "Escape") { if (skizze.pkt.length || skizze.quelle) { abschliessenLinie(); skizze.pkt = []; skizze.quelle = null; zeichneLive(); } else if (skizze.werkzeug !== "auswahl") setzeWerkzeug("auswahl"); else { skizze.sel = null; zeichneLive(); } e.preventDefault(); return; }
  if ((e.key === "x" || e.key === "X") && skizze.sel && !e.target.closest?.("input,select")) { skizze.sel.hilfs = !skizze.sel.hilfs; status(skizze.sel.hilfs ? "Hilfslinie." : "Normale Linie."); zeichneLive(); e.preventDefault(); return; }
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
}
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
// Rundblech beurteilen: Scheibe mit Rand / Kragen / Kegel – konstruierbar, abwickelbar, herstellbar (wie im Fusion-Add-in)
let umformLetzt = null; // letzter berechneter Zuschnitt für den DXF-Knopf
let umformWerte = { fall: "scheibe", r: 100, h: 20, winkel: 90, r2: 50, verfahren: "auto", material: null };
function umformDialog() {
  const w = umformWerte; w.material ||= neuMaterial();
  const rechne = () => {
    const m = material(w.material); let e;
    try { e = w.fall === "scheibe" ? scheibeMitRand(+w.r, +w.h, +w.winkel) : w.fall === "kragen" ? kragen(+w.r, +w.h, +w.winkel) : kegelstumpf(+w.r, +w.r2, +w.h); } catch (err) { return { fehler: err.message }; }
    const b = beurteilen(e, w.verfahren, m); let z = null, zf = ""; try { z = zuschnitt(e); } catch (err) { zf = err.message; }
    return { e, b, z, zf };
  };
  const html = () => {
    const r = rechne(); umformLetzt = r.z ? { z: r.z, fall: w.fall } : null; if (r.fehler) return `<p class="fehler">⚠ ${esc(r.fehler)}</p>`;
    const ja = (v) => v === true ? "ja" : v === false ? "nein" : "nicht beurteilbar", { e, b } = r;
    return `<table class="zeilen"><tbody><tr><td>konstruierbar</td><td><b>ja</b></td></tr><tr><td>abwickelbar</td><td><b>${ja(e.abwickelbar)}</b></td></tr><tr><td>herstellbar</td><td><b>${ja(b.herstellbar)}</b></td></tr></tbody></table>
      ${r.z ? `<p>${esc(r.z.beschreibung)}</p><div class="reihe ohnerand"><button class="knopf" id="uDxf">Zuschnitt als DXF speichern</button></div>` : `<p class="hinweis">${esc(r.zf)}</p>`}<ul>${b.hinweise.map((h) => `<li>${esc(h)}</li>`).join("")}</ul>`;
  };
  const felder = () => [
      { id: "fall", label: "Fall", optionen: [["scheibe", "Scheibe mit aufgebogenem Rand"], ["kragen", "Kragen an rundem Ausschnitt"], ["kegel", "Kegelstumpf / Zylinder"]], wert: w.fall },
      { id: "r", label: w.fall === "kegel" ? "Radius unten (Blechmitte)" : w.fall === "kragen" ? "Fertiger Lochradius" : "Radius bis zur Biegung", einheit: "mm", wert: w.r },
      ...(w.fall === "kegel" ? [{ id: "r2", label: "Radius oben", einheit: "mm", wert: w.r2 }] : []),
      { id: "h", label: w.fall === "kegel" ? "Höhe" : w.fall === "kragen" ? "Kragenhöhe" : "Randhöhe", einheit: "mm", wert: w.h },
      ...(w.fall === "kegel" ? [] : [{ id: "winkel", label: "Randwinkel", einheit: "°", wert: w.winkel }]),
      { id: "verfahren", label: "Verfahren", optionen: Object.entries(VERFAHREN), wert: w.verfahren },
      { id: "material", label: "Material", optionen: matOpt(), wert: w.material },
    ];
  dialog({
    titel: "Rundblech beurteilen", hinweis: "Theoretische Beurteilung wie im Fusion-Add-in. «Herstellbar» gibt es nur mit eigenem Erfahrungswert im Material (Einstellungen › Materialien, Stauchen/Strecken max %). Es werden nie Einschnitte erzeugt.",
    felder: felder(),
    zusatz: html,
    aendern: (v, feld) => { const alt = w.fall; Object.assign(w, v); if (alt !== w.fall) { const d = dlg; return setTimeout(() => dialog({ ...d, felder: felder() })); } $("dZusatz").innerHTML = html(); },
    ok: () => {},
  });
}
$("dInhalt").addEventListener("click", (e) => { if (e.target.id === "uDxf" && umformLetzt) herunterladen(`Rundblech ${umformLetzt.fall} Zuschnitt.dxf`, zuschnittDxf(umformLetzt.z, "Rundblech " + umformLetzt.fall), "application/dxf"); });
$("wUmform").onclick = () => { if (dlg) $("dAbbrechen").click(); umformDialog(); };
$("wBlechAufFlaeche").onclick = () => blechAufFlaecheStart();
$("wKehle").onclick = () => { if (dlg) $("dAbbrechen").click(); kehleDialog(); };
// ------------------------------------------------------------ Werkzeugleiste: Klappmenüs (fest positioniert, die Leiste rollt seitlich)
const leiste = $("leiste");
function klappZu() { leiste.querySelectorAll(".klappmenue").forEach((m) => (m.hidden = true)); leiste.querySelectorAll(".klappknopf").forEach((k) => k.setAttribute("aria-expanded", "false")); }
leiste.addEventListener("click", (e) => {
  const k = e.target.closest(".klappknopf");
  if (k) {
    const m = k.nextElementSibling, offen = !m.hidden; klappZu(); if (offen) return;
    m.hidden = false; k.setAttribute("aria-expanded", "true");
    const r = k.getBoundingClientRect(), b = m.getBoundingClientRect();
    Object.assign(m.style, { left: Math.max(8, Math.min(r.left, innerWidth - b.width - 8)) + "px", top: r.bottom + 4 + "px" });
    return;
  }
  const b = e.target.closest(".klappmenue button"); if (!b) return;
  if (!e.target.closest(".pfeil")) setTimeout(klappZu); // ▾ im Menü öffnet die Varianten, Menü bleibt offen
  if (b.dataset.kwz || b.dataset.aus) { if (dlg) $("dAbbrechen").click();
    if (b.dataset.kwz === "kanten3d") return kantenDialog(); if (b.dataset.kwz) return koerperDialog(b.dataset.kwz);
    return b.dataset.aus === "import" ? $("importDatei").click() : b.dataset.aus === "bild" ? $("bildDatei").click() : exportiere(b.dataset.aus); }
}, true);
document.addEventListener("pointerdown", (e) => { if (!e.target.closest?.(".klapp") && !e.target.closest?.("#skizzenMenue")) klappZu(); });
// Klappknopf zeigt das aktive Werkzeug darin
new MutationObserver(() => leiste.querySelectorAll(".klapp").forEach((kp) => {
  const k = kp.querySelector(".klappknopf"), an = kp.querySelector(".klappmenue .wz[aria-pressed='true']");
  const soll = an ? "true" : "false", kl = k.querySelector(".kl"); k.dataset.label ||= kl.textContent;
  if (k.getAttribute("aria-pressed") !== soll) k.setAttribute("aria-pressed", soll); // nur bei Änderung, sonst ruft sich der Beobachter endlos auf
  const text = an ? an.textContent.replace("▾", "").trim().split(/\s{2,}/)[0] : k.dataset.label; if (kl.textContent !== text) kl.textContent = text;
})).observe(leiste, { subtree: true, attributes: true, attributeFilter: ["aria-pressed"] });
// Nur zeigen, was gerade gebraucht wird: in der Skizze die Skizzenwerkzeuge, bei offenem Befehl nur dessen Name
function leisteZustand() {
  leiste.classList.toggle("imSkizze", !!skizze);
  const imDialog = !!dlg && !skizze; leiste.classList.toggle("imDialog", imDialog);
  $("aktivWz").hidden = !imDialog; if (imDialog) $("aktivWz").textContent = dlg.titel + " – im Dialog fertigstellen";
  klappZu();
}
$("wLoft").onclick = () => { if (dlg) $("dAbbrechen").click(); loftDialog(); };
$("wBlech").onclick = () => { if (dlg) $("dAbbrechen").click(); blechDialog(); };
$("wVorlage").onclick = () => { if (dlg) $("dAbbrechen").click(); vorlageDialog(); };
$("wProfil").onclick = () => { if (dlg) $("dAbbrechen").click(); profilDialog(); };
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
  if (!e.target.closest(".pfeil") && !aktiv) { m.hidden = true; abschliessenLinie(); setzeWerkzeug(letzteVariante[knopf] || varianten[0][0]); return; }
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
  const ziel = await herunterladen(`${doc.nr || "projekt"}.sdcad`, inhalt, "application/json", unter ? null : projektPfad);
  if (ziel) { projektPfad = ziel; titel(); merkeDatei(ziel); }
  if (ziel || !pc) ablage?.nachSpeichern(); // Cloud-Ablage: Modelle/<Projekt>.sdcad
}
function ladeProjekt(text, pfad = null) {
  try {
    const d = JSON.parse(text); if (!d.features) throw 0;
    doc = d; auswahl = null; projektPfad = pfad; titel(); merkeDatei(pfad); verlauf.stapel = []; verlauf.pos = -1;
    $("aObjekt").value = doc.objekt; $("aNr").value = doc.nr; auftragAnzeige(); regen();
    waehle(doc.features.find((f) => f._res)?.id || null); ansicht("iso"); status("Projekt geöffnet.");
  } catch { status("Diese Datei ist kein Spengler-Digital-CAD-Projekt."); }
}
async function projektOeffnen() {
  if (!pc) return $("datei").click();
  try { const d = await pc.invoke("datei_oeffnen", { filter: DATEITYPEN.sdcad, endungen: ["sdcad", "json"] }); if (d) ladeProjekt(d.inhalt, d.pfad); }
  catch (e) { status("Öffnen fehlgeschlagen: " + e); }
}
$("wSpeichern").onclick = () => projektSpeichern();
$("wOeffnen").onclick = projektOeffnen;
// ------------------------------------------------------------ Konto & Cloud (Spengler-Digital-App)
function setzeAuftrag({ nr, objekt, appProjekt }) { doc.nr = nr; doc.objekt = objekt; if (appProjekt) doc.appProjekt = appProjekt; else delete doc.appProjekt; $("aNr").value = nr; $("aObjekt").value = objekt; auftragAnzeige(); speichern(); if (appProjekt) ablage?.sicherstellen(); } // Projekt zugeordnet: Cloud-Ordner anlegen (falls es sie noch nicht gibt)
const cloud = cloudModul({
  esc, status, getEinst: () => einst, setEinst: (e) => { einst = e; if (entwurf) entwurf = JSON.parse(JSON.stringify(einst)); }, einstSpeichern, getDoc: () => doc, regen,
  projektAktualisieren: () => projekte.aktualisiere(), projekteOeffnen: () => { $("einst").hidden = true; entwurf = null; projekte.oeffnen(); },
  setzeAuftrag,
  projektText: () => JSON.stringify(doc, (k, v) => (k.startsWith("_") ? undefined : v)), ladeProjektText: (x) => ladeProjekt(x),
  neuZeichnen: () => { if (!$("einst").hidden && einstRegister === "konto") zeigeEinst(); },
  teile: () => blechteile().filter((f) => f._res).map((f) => ({ f, res: f._res, mat: material(f.material) })),
  neuesProfil: ({ name, zeilen, laenge, stueck, staerke }) => {
    const m = (staerke > 0 && einst.materialien.find((x) => x.t === +staerke)) || einst.materialien.find((x) => x.id === neuMaterial()) || einst.materialien[0];
    const f = { id: neueId(), typ: "profil", name, start: 0, zeilen: zeilen.length ? zeilen : [{ L: 100, winkel: 0, art: "abkanten" }], material: m.id, laenge: laenge > 0 ? +laenge : einst.neu.laenge, stueck: stueck > 0 ? +stueck : 1, richtung: "eine", ebene: einst.neu.ebene };
    einfuegen(f); regen(); waehle(f.id); },
});
// Projekte der App (anlegen, bearbeiten, zuordnen)
const projekte = projekteModul({ esc, status, getDoc: () => doc, client: () => cloud.client, angemeldet: () => cloud.angemeldet,
  setzeAuftrag, zumKonto: () => { if (dlg) $("dAbbrechen").click(); entwurf = JSON.parse(JSON.stringify(einst)); einstRegister = "konto"; zeigeEinst(); $("einst").hidden = false; } });
projekte.binden();
const ablage = ablageModul({ esc, status, getDoc: () => doc, client: () => cloud.client, angemeldet: () => cloud.angemeldet, projektText: () => JSON.stringify(doc, (k, v) => (k.startsWith("_") ? undefined : v), 1), ladeProjektText: (x) => ladeProjekt(x), herunterladen });
ablage.binden();
$("wAblage").onclick = () => { if (dlg) $("dAbbrechen").click(); ablage.oeffnen(); };
function auftragAnzeige() { // zugeordnetes Projekt: Objekt und Nummer kommen aus der App (nur dort änderbar)
  const z = !!doc.appProjekt; $("aProjektName").textContent = z ? doc.appProjekt.name : "nicht zugeordnet";
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
  const { kommando, soll } = blechTeilKommando({ res: f._res, t: m.t, ebene: f._kernLage.ebene, laenge: f.laenge, richtung: f.richtung, versatz: f._kernLage.versatz });
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
    const z = zuschnittAusVolumen(e.volumen, k.m.t, f.laenge, k.m.k, k.soll.theta), d = z - f._res.zuschnitt;
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
async function exaktesModell({ step = false } = {}) { // step: exakte Körper als STEP herunterladen statt Netze ersetzen
  if (!kernAn()) return;
  const lauf = step ? null : ++exaktLauf, stand = regenStand, uebernommen = new Set(), K = kern(), ids = [], koerper = new Map(), nicht = new Map(), blech = new Map(), netzVon = new Map(); // netzVon: Körperschlüssel → fid des Netzes (Kopien «id:k» → «id:k:0»)
  const x = async (k) => { const r = await K.ausfuehren(k); if (r.id) ids.push(r.id); return r; };
  const vereinige = async (liste) => { let a = liste[0]; for (const b of liste.slice(1)) a = (await x({ op: "boolesch", art: "vereinigen", a, b })).id; return a; };
  const markiereZiel = (f, grund) => { if (f.ziel && f.ziel !== "alle") nicht.set(f.ziel, grund); else for (const k of koerper.keys()) nicht.set(k, grund); };
  // Abrunden/Fasen einer Extrusion wie gerundeteExtrusion(): erst Kanten entlang der Extrusion, dann Boden/Deckel
  const kantenRunden = async (w, kr, f, s) => {
    const senk = kr.find((k) => k.kanten !== "quer"), quer = kr.find((k) => k.kanten !== "senkrecht"), lage = extrusionsHoehen({ ebene: E_(s.ebene), abstand: f.abstand, richtung: f.richtung });
    for (const [k, art] of [[senk, "senkrecht"], [quer, "quer"]]) {
      if (!k) continue;
      const kanten = extrusionsKanten(await K.ausfuehren({ op: "topologie", ziel: w }), lage, art), mass = art === "quer" ? Math.min(k.mass, Math.abs(f.abstand) / 2 - 0.01) : k.mass;
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
          if (f.typ === "extrusion") kmd = extrusionKommandos({ profile, ebene: E_(s.ebene), abstand: f.abstand, richtung: f.richtung });
          else { const [a, d] = drehAchse(s, f.achse); kmd = rotationKommandos({ profile, ebene: E_(s.ebene), a, d, winkel: f.winkel ?? 360 }); }
        } catch (e) { if (op === "neu") nicht.set(f.id, `${e.message} noch nicht exakt`); else markiereZiel(f, `${f.name}: ${e.message} noch nicht exakt`); continue; }
        let w = await vereinige(await Promise.all(kmd.map(async (k) => (await x(k)).id)));
        const kr = f.typ === "extrusion" ? doc.features.filter((k) => k.typ === "kantenrund" && k.ziel === f.id && !k._aus) : [];
        if (kr.length) try { w = await kantenRunden(w, kr, f, s); } catch (e) { if (op === "neu") nicht.set(f.id, `Abrunden/Fasen: ${e.message}`); else markiereZiel(f, `${f.name} Abrunden/Fasen: ${e.message}`); continue; }
        if (op === "neu") { koerper.set(f.id, w); continue; }
        if (op === "ausschneiden") for (const k of blech.keys()) if (!f.ziel || f.ziel === "alle" || k.split(":")[0] === f.ziel) nicht.set(k, `${f.name} (Ausschneiden) an Blech noch nicht exakt`);
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
          const lage = extrusionsHoehen({ ebene: E_(finde(z.skizze).ebene), abstand: z.abstand, richtung: z.richtung });
          const offen = extrusionsFlaechen(await K.ausfuehren({ op: "topologie", ziel: koerper.get(f.ziel) }), lage, f.offen);
          koerper.set(f.ziel, (await x({ op: "schale", ziel: koerper.get(f.ziel), dicke: f.dicke > 0 ? f.dicke : 2, offen })).id);
        } catch (e) { nicht.set(f.ziel, `${f.name}: ${e.message}`); }
      } else if (f.typ === "teilen") { // im Netz-Pfad gerechnet; der exakte Kern teilt noch nicht
        if (koerper.has(f.ziel) || blech.has(f.ziel)) nicht.set(f.ziel, `${f.name} noch nicht exakt`);
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
        if (f._mitAbwicklung || f._bleche.some((bl) => bl.abw.loecher?.length)) { f._bleche.forEach((_, i) => nicht.set(`${f.id}:${i}`, "Abwicklung/Ausschnitte noch nicht exakt")); continue; }
        for (const [i, bl] of f._bleche.entries()) {
          try { blech.set(`${f.id}:${i}`, await baueFlaechenblech(x, flaechenblechPlan(bl, ebene, m, f.sichtseite === -1 ? -1 : 1))); }
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
      } else if (["sweep", "loft", "import", "kehle"].includes(f.typ)) nicht.set(f.id, "noch nicht exakt");
    }
    if (step) { // alle sichtbaren exakten Körper (mit Komponentenlage) in eine STEP-Datei
      const ziele = [], namen = [];
      for (const [schl, id] of [...koerper, ...blech]) {
        if (nicht.has(schl) || (schl.includes(":") && nicht.has(schl.split(":")[0]))) continue;
        const h = hauptVon(schl); if (!h || h.versteckt) continue;
        const L = lageVon(h);
        ziele.push(L ? (await x({ op: "matrix", ziel: id, m: matrixZeilen(L.elements) })).id : id);
        namen.push(schl.includes(":") ? `${h.name} ${schl.split(":")[1]}` : h.name);
      }
      const rest = [...nicht].filter(([fid]) => !finde(fid)?.versteckt).map(([fid, g]) => `${finde(fid)?.name ?? fid} (${g})`);
      if (!ziele.length) return status(`STEP exakt: keine exakten Körper${rest.length ? ` (noch nicht exakt: ${rest.join(", ")})` : ""}.`);
      const { text } = await K.ausfuehren({ op: "stepExport", ziele, namen });
      herunterladen(dateiBasis() + " (exakt).step", text, "application/step");
      return status(`STEP exakt (B-Rep, AP242): ${ziele.length} Körper${rest.length ? ` · nicht enthalten, da noch nicht exakt: ${rest.join(", ")}` : ""}.`);
    }
    let n = 0; const eig = new Map(), ansichtIds = [], ansichtFids = [];
    for (const [schl, id] of [...koerper, ...blech]) {
      if (nicht.has(schl) || nicht.has(schl.split(":")[0]) && schl.includes(":")) continue;
      const fid = netzVon.get(schl) ?? schl;
      const netze = modell.children.filter((o) => o.isMesh && o.userData.fid === fid), mesh = netze[0]; if (!mesh) continue;
      const netz = await K.ausfuehren({ op: "tessellieren", ziel: id }), e = await K.ausfuehren({ op: "eigenschaften", ziel: id });
      if (!step && lauf !== exaktLauf) return;
      ersetzeNetz(mesh, netz, lageVon(hauptVon(fid))); n++;
      if (mesh.visible) { const L = lageVon(hauptVon(fid)); ansichtIds.push(L ? (await x({ op: "matrix", ziel: id, m: matrixZeilen(L.elements) })).id : id); ansichtFids.push(fid); }
      for (const o of netze.slice(1)) { modell.remove(o); o.traverse((c) => c.geometry?.dispose()); } // Flächenblech: Platte + Profile → ein exakter Körper
      eig.set(fid, { ...e, verschoben: !!lageVon(hauptVon(fid)) });
    }
    exaktEig = eig; exaktNicht = nicht;
    // Zeichnungsansichten: Körper in Weltlage behalten (die der vorigen Runde werden frei), nur wenn alle sichtbaren Körper exakt sind
    const alte = exaktAnsichtIds; ansichtIds.forEach((i) => uebernommen.add(i));
    exaktAnsichtIds = ansichtIds; exaktAnsichtFids = ansichtFids; exaktFuer = stand; exaktAnsichtCache = new Map();
    exaktVollstaendig = modell.children.filter((o) => o.isMesh && o.visible && o.userData.fid).every((o) => o.userData.exakt);
    if (alte.length) K.ausfuehren({ op: "freigeben", ziele: alte }).catch(() => {});
    document.dispatchEvent(new Event("sdcad-exakt")); // Planblatt: Ansichten jetzt aus dem exakten Modell
    if (register === "eigenschaften") zeigeWerkstatt();
    zeigeKanten?.();
    const rest = [...nicht].map(([fid, g]) => `${hauptVon(fid)?.name ?? fid}${fid.includes(":") ? " " + (+fid.split(":")[1] + 1) : ""} (${g})`);
    status(`Exakt aus dem CAD-Kern: ${n} Körper${rest.length ? ` · als Netz: ${rest.join(", ")}` : ""}`);
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
    status("Nur STEP (.step/.stp) und STL lassen sich importieren.");
  } catch (err) { status("Import fehlgeschlagen: " + err.message); }
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
  if (k === "s") { e.preventDefault(); projektSpeichern(e.shiftKey); }
  else if (k === "p") { e.preventDefault(); drucke(blechteile(), true); }
  else if (k === "d" && !e.target.closest?.("input,select,textarea")) { e.preventDefault(); dupliziere(hauptVon(auswahl)); }
  else if (k === "o") { e.preventDefault(); projektOeffnen(); }
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
kernAnzeige();
(function schleife() { steuerung.update(); richtungSkalieren(); renderer.render(szene, kamera); zeichneWuerfel(); zeigeLabels(); requestAnimationFrame(schleife); })();
// Nur für automatische Tests (Adresse mit ?test): Bildschirmposition von Weltpunkten
if (new URLSearchParams(location.search).has("test")) window.sdcadTest = { kameraZiel: () => { const t = flaechenTreffer(new THREE.Vector2(0, 0)); return { abstand: t ? t.distance : null, kamera: kamera.position.toArray(), min: Math.max(4, modellRadius() * 0.0004) }; }, maxLinie: (fid) => { let m = 0, n = 0, bad = 0; for (const o of modell.children) if (o.userData.fid === fid) for (const l of o.children) { const p = l.geometry?.attributes.position; if (!p) continue; for (let i = 0; i + 1 < p.count; i += 2) { const d = Math.hypot(p.getX(i) - p.getX(i + 1), p.getY(i) - p.getY(i + 1), p.getZ(i) - p.getZ(i + 1)); if (!isFinite(d)) bad++; else m = Math.max(m, d); n++; } } let tm = 0, ti = -1; for (const o of modell.children) if (o.userData.fid === fid && o.geometry?.attributes.position) { const p = o.geometry.attributes.position; for (let i = 0; i + 2 < p.count; i += 3) for (const [a, b] of [[0, 1], [1, 2], [2, 0]]) { const d = Math.hypot(p.getX(i + a) - p.getX(i + b), p.getY(i + a) - p.getY(i + b), p.getZ(i + a) - p.getZ(i + b)); if (d > tm) { tm = d; ti = i / 3; } } } return { max: m, n, bad, dreieckMax: tm, ti }; }, setzeAuftrag: (x) => setzeAuftrag(x), exportiere: (n, i, art) => herunterladen(n, i, "text/plain", null, art), waehle: (id) => waehle(id), segmenteImKasten: (praefix, u0, u1, v0, v1, w0 = -1e9, w1 = 1e9) => { let n = 0; for (const o of modell.children.filter((x) => x.isMesh && String(x.userData.fid).startsWith(praefix))) { const pos = o.children[0]?.geometry.attributes.position; if (!pos) continue; for (let i = 0; i + 1 < pos.count; i += 2) { const m = new THREE.Vector3((pos.getX(i) + pos.getX(i + 1)) / 2, (pos.getY(i) + pos.getY(i + 1)) / 2, (pos.getZ(i) + pos.getZ(i + 1)) / 2), uv = aufEbene("XY", m); const E0 = E_("XY"); uv[2] = m.clone().sub(V(E0.o)).dot(V(E0.n)); if (uv[0] > u0 && uv[0] < u1 && uv[1] > v0 && uv[1] < v1 && uv[2] > w0 && uv[2] < w1) n++; } } return n; }, kanteBei: (x, y) => kanteUnterMaus(kantenWz.f, { clientX: x, clientY: y, pointerType: "mouse" }), kantenAn: () => kantenLabels.filter((l) => l.an).map((l) => l.kante), sichtbareKoerper: () => modell.children.filter((o) => o.isMesh && o.visible).length, pivot: () => drehPivot?.toArray() ?? null, griff: () => { const r = leinwand.getBoundingClientRect(); return griffe.map((g) => { const A = aufSchirm(g.pos.toArray()), B = aufSchirm(g.pos.clone().addScaledVector(g.dir, griffLaenge(g.pos)).toArray()); return { feld: g.feld, x: r.left + (A[0] + B[0]) / 2, y: r.top + (A[1] + B[1]) / 2 }; }); }, waehl: () => waehlGruppe.children.length, hover: () => hoverGruppe.children.length, beendeSkizze: () => beendeSkizze(), kamera: () => ({ pos: kamera.position.toArray(), ziel: steuerung.target.toArray() }), dok: () => JSON.parse(JSON.stringify(doc, (k, v) => (k.startsWith("_") ? undefined : v))), raster: () => einst.skizze.raster, steuerung: () => ({ damping: steuerung.enableDamping, mitte: steuerung.mouseButtons.MIDDLE, links: steuerung.mouseButtons.LEFT, rechts: steuerung.mouseButtons.RIGHT, zoomZeiger: steuerung.zoomToCursor }), bearbeite: (id) => bearbeite(doc.features.find((f) => f.id === id)), exaktAnsicht: (art, m = 1, verdeckt = true, lage = null) => { const e = exakteAnsicht(art, m, verdeckt, () => {}, lage); return { stand: e.stand, exakt: !!e.r?.exakt, flaechen: e.r?.flaechen ?? null, sichtbar: e.r?.sichtbar ?? null, verdeckt: e.r?.verdeckt ?? null, breite: e.r?.breite, hoehe: e.r?.hoehe }; }, koerperInfo: () => { modell.updateMatrixWorld(true); return modell.children.filter((o) => o.isMesh && o.userData.fid).map((o) => { const g = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry, p = g.attributes.position.array; let v = 0;
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
    return { fid: o.userData.fid, dreiecke: a.length / 9, volumen: Math.round(v / 6) }; }), aufSchirm: (p) => { const r = leinwand.getBoundingClientRect(), s = aufSchirm(p); return [r.left + s[0], r.top + s[1]]; } };
// PC-Programm: Update-Prüfung beim Start (abschaltbar in den Einstellungen)
if (pc && einst.programm.updates) pc.invoke("nach_update_suchen").catch(() => {}); // ohne Netz still weiter
// PC-Programm: per Doppelklick geöffnete .sdcad-Datei laden
pc?.invoke("startdatei").then((d) => d && ladeProjekt(d.inhalt, d.pfad)).catch((e) => status("Datei konnte nicht geöffnet werden: " + e));
// Web-Version: offline nutzbar machen (nicht im PC-Programm und nicht per Doppelklick)
if ("serviceWorker" in navigator && location.protocol.startsWith("http") && !("__TAURI_INTERNALS__" in window)) navigator.serviceWorker.register("sw.js").catch(() => {});
status("Beispiel geladen. Neu zeichnen: «Skizze» → Ebene wählen → Linienzug zeichnen → «Blechprofil».");
