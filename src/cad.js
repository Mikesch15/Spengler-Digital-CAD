// Spengler Digital CAD 0.2 – Fusion-artige Oberfläche: Skizzen, Extrusion, Blechprofil, Vorlagen
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { berechne, kontur, polylinie, grenzen, versatzLinie } from "../kern/geometrie.js";
import { VORLAGEN, VORLAGE, standardwerte, freiesProfil, alsZeilen } from "../kern/profile.js";
import { MATERIALIEN, LAGER, quelle, kFaktorAusProbe } from "../kern/materialien.js";
import { abwicklungDxf, abwicklungenDxf } from "../kern/dxf.js";
import { profilSvg, abwicklungSvg, detailSvg, passenderMassstab, MASSSTAEBE } from "../kern/zeichnung.js";
import { DETAILS, DETAIL, detailStandard, baueDetail, teilKontur, folge, folgeText, ROLLEN, rollenVon } from "../kern/details.js";
import { stueckliste, stuecklisteCsv } from "../kern/auftrag.js";
import { materialbedarf } from "../kern/zuschnitt.js";
import { vorbereiten, loeseSkizze, analyse, fuegeHinzu, bereinige, punkte as skizzenPunkte, kantenZahl, rechteckBedingungen, neueElementId, sichereIds, IST_MASS } from "../kern/skizzenloeser.js";
import { abstandGerade, winkelZwischen } from "../kern/bedingungen.js";
import { kreisDurch3, bogenDaten, bogenPunkte, bogenAusMitte, kreisPunkte, polygonPunkte, rechteck3, langlochPunkte, abrundung, rundePolylinie, versatzPolylinie, spiegelPunkt, schnittStrecken, schnittStreckeKreis, verbindeStuecke } from "../kern/skizze.js";
import { BASIS, ACHSEN, versetzt, unterWinkel, mittelebene, zweiKanten, dreiPunkte, tangential, entlangPfad, aufFlaeche, zuWelt, zuLokal } from "../kern/ebenen.js";

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
const basis = (id) => { const e = E_(id); return new THREE.Matrix4().makeBasis(V(e.u), V(e.v), V(e.n)).setPosition(V(e.o)); };
const zu3D = (id, p) => V(zuWelt(E_(id), p));
const ebenenEbene = (id) => { const e = E_(id); return new THREE.Plane().setFromNormalAndCoplanarPoint(V(e.n), V(e.o)); };
const aufEbene = (id, p) => zuLokal(E_(id), [p.x, p.y, p.z]);

// ------------------------------------------------------------ Dokument
let doc = { features: [], zaehler: 1, objekt: "Muster, Bern", nr: "2026-001" };
try { const s = JSON.parse(localStorage.getItem(SPEICHER) || "null"); if (s?.features) doc = s; } catch {}
const speichern = () => { try { localStorage.setItem(SPEICHER, JSON.stringify(doc, (k, v) => (k.startsWith("_") ? undefined : v))); } catch {} };
const neueId = () => "f" + doc.zaehler++;
const finde = (id) => doc.features.find((f) => f.id === id);
// Blechteile eines Spenglerdetails haben die ID «detail:nr»; sie sind keine eigenen Features
const teilFinden = (id) => { const [fid, i] = String(id ?? "").split(":"); return i == null ? null : finde(fid)?._teile?.[+i] || null; };
const waehlbar = (id) => finde(id) || teilFinden(id);
const hauptVon = (id) => finde(String(id ?? "").split(":")[0]);
// Werkstatt-Einstellungen (pro Gerät): kalibrierte und eigene Materialien, Lagerformate
const EINST = "sdcad-einstellungen";
const standardEinst = () => JSON.parse(JSON.stringify({
  materialien: MATERIALIEN, ...LAGER, vorlagen: [],
  neu: { laenge: 1000, stueck: 1, material: MATERIALIEN[0].id, ebene: "XY", lage: "mitte" }, // Vorgaben für neue Teile
  skizze: { raster: 5, abstand: 80 },                                                 // Fangraster mm, Abstand der Teile in 3D mm
  anzeige: { abB: true },                                                             // Spalte «ab Kante B»
  druck: { betrieb: "", abwicklung: true, etikett: true, bedarf: true },              // Werkstattblatt und Stückliste
  etiketten: { spalten: 3, zeilen: 8, breite: 70, hoehe: 37, oben: 0, links: 0, abstandX: 0, abstandY: 0 }, // mm
  programm: { darstellung: "auto", updates: true, zuletzt: 8 },
}));
const GRUPPEN = ["neu", "skizze", "anzeige", "druck", "etiketten", "programm"];
// Gespeicherte oder geladene Einstellungen über die Standardwerte legen (neue Werte bekommen ihren Standard)
function mitStandard(e) {
  const s = standardEinst();
  const r = { ...s, ...e };
  for (const g of GRUPPEN) r[g] = { ...s[g], ...(e?.[g] || {}) };
  if (!Array.isArray(r.materialien) || !r.materialien.length) r.materialien = s.materialien;
  return r;
}
let einst = standardEinst();
try { const e = JSON.parse(localStorage.getItem(EINST) || "null"); if (e?.materialien?.length) einst = mitStandard(e); } catch {}
// Darstellung hell/dunkel/automatisch
const darstellung = () => {
  const d = einst.programm.darstellung;
  if (d === "hell") document.documentElement.dataset.theme = "light";
  else if (d === "dunkel") document.documentElement.dataset.theme = "dark";
  else delete document.documentElement.dataset.theme;
};
darstellung();
const neuMaterial = () => (einst.materialien.some((m) => m.id === einst.neu.material) ? einst.neu.material : einst.materialien[0].id);
const einstSpeichern = () => { try { localStorage.setItem(EINST, JSON.stringify(einst)); } catch {} };
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
steuerung.enableDamping = true;
szene.add(new THREE.HemisphereLight(0xffffff, 0x66727a, 1.5));
const licht = new THREE.DirectionalLight(0xffffff, 1.7); licht.position.set(1, 2, 3); szene.add(licht);
const licht2 = new THREE.DirectionalLight(0xffffff, 0.5); licht2.position.set(-2, -1, -1); szene.add(licht2);
const boden = new THREE.GridHelper(2000, 40, 0x8a969e, 0xb7c0c6); boden.material.transparent = true; boden.material.opacity = 0.5; szene.add(boden);
szene.add(new THREE.AxesHelper(80));
const modell = new THREE.Group(), live = new THREE.Group(); szene.add(modell, live);
let skizzenRaster = null;

function groesse() {
  const w = leinwand.clientWidth, h = leinwand.clientHeight;
  if (!w || !h) return;
  renderer.setSize(w, h, false); kamera.aspect = w / h; kamera.updateProjectionMatrix();
}
new ResizeObserver(groesse).observe(leinwand);
kamera.position.set(600, 450, 700);

const leeren = (g) => g.children.slice().forEach((c) => { g.remove(c); c.traverse?.((o) => { o.geometry?.dispose(); o.material?.dispose?.(); }); });

// ------------------------------------------------------------ Skizzengeometrie
// Jedes Element liefert seine Geometrie: linien (zum Zeichnen und Treffen), kontur (geschlossen) oder offen (Stück eines Linienzugs)
function elGeo(el) {
  switch (el.art) {
    case "linie": {
      const pts = rundePolylinie(el.pts, el.radien || {}, !!el.geschlossen);
      return el.geschlossen ? { linien: [[...pts, pts[0]]], kontur: pts } : { linien: [pts], offen: pts };
    }
    case "rechteck": { const c = [el.a, [el.b[0], el.a[1]], el.b, [el.a[0], el.b[1]]]; return { linien: [[...c, c[0]]], kontur: c }; }
    case "kreis": { const k = kreisPunkte(el.c, el.r, 72); return { linien: [[...k, k[0]]], kontur: k }; }
    case "bogen": { const b = bogenPunkte(el); return { linien: [b], offen: b }; }
    case "langloch": { const k = langlochPunkte(el.a, el.b, el.r); return { linien: [[...k, k[0]]], kontur: k }; }
    default: return { linien: [] }; // Punkt
  }
}
const profilElemente = (f) => f.elemente.filter((el) => !el.hilfs && el.art !== "punkt");
// Wie in Fusion: einzelne Linien und Bögen, die sich an den Enden berühren, bilden zusammen einen Linienzug oder ein Profil
const verbunden = (f) => verbindeStuecke(profilElemente(f).filter((el) => elGeo(el).offen).map((el) => ({ pts: el.art === "linie" ? el.pts : [el.a, el.b], el })));
function zugPunkte(z) {
  const pts = [];
  for (const { stueck, umgekehrt } of z.teile) { let q = elGeo(stueck.el).offen; if (umgekehrt) q = q.slice().reverse(); pts.push(...(pts.length ? q.slice(1) : q)); }
  if (z.geschlossen && pts.length > 1 && gleich(pts[0], pts.at(-1))) pts.pop();
  return pts;
}
function schleifen(f) {
  // geschlossene Profile als Punktlisten [u,v]
  const out = profilElemente(f).map((el) => elGeo(el).kontur).filter(Boolean);
  for (const z of verbunden(f).filter((z) => z.geschlossen)) out.push(zugPunkte(z));
  return out;
}
// Offene Linienzüge für Blechprofile: Eckpunkte und Abrundungsradien { Eckenindex: R }
const ketten = (f) => verbunden(f).filter((z) => !z.geschlossen).map((z) => {
  const pts = [], radien = {}; let mitBogen = false;
  for (const { stueck, umgekehrt } of z.teile) {
    const el = stueck.el; if (el.art === "bogen") mitBogen = true;
    const roh = el.art === "linie" ? el.pts : [el.a, el.b], r = el.radien || {}, n = roh.length;
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
function formen(f) {
  // Aussenkonturen mit Löchern (eine Ebene tief)
  const ls = schleifen(f).map((p) => ({ p, a: Math.abs(flaeche(p)) })).sort((x, y) => y.a - x.a);
  const aussen = [];
  for (const l of ls) {
    const eltern = aussen.filter((o) => innen(l.p[0], o.p)).sort((x, y) => x.a - y.a)[0];
    if (eltern && !eltern.loch) eltern.loecher.push(l.p); else aussen.push({ ...l, loecher: [] });
  }
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
const FARBE = { zink07: 0x8d99a2, kupfer06: 0xb8734a, alu08: 0xc9cfd4, alu10: 0xc9cfd4, cns05: 0xb4bcc2, stahl06: 0x99a3aa };
const farbe = (m) => FARBE[m.id] ?? (/kupfer/i.test(m.name) ? 0xb8734a : /alu/i.test(m.name) ? 0xc9cfd4 : 0x8d99a2);
function koerper(formen_, ebene, tiefe, richtung, farbe, fid) {
  const geo = new THREE.ExtrudeGeometry(formen_, { depth: tiefe, bevelEnabled: false, curveSegments: 48 });
  if (richtung === "umgekehrt") geo.translate(0, 0, -tiefe); else if (richtung === "symmetrisch") geo.translate(0, 0, -tiefe / 2);
  geo.applyMatrix4(basis(ebene));
  const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: farbe, metalness: 0.5, roughness: 0.45, side: THREE.DoubleSide,
    polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1 }));
  mesh.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo, 28), new THREE.LineBasicMaterial({ color: 0x27303a, transparent: true, opacity: 0.6 })));
  mesh.userData.fid = fid;
  return mesh;
}
const konturForm = (res, t, versatz = [0, 0]) => new THREE.Shape(kontur(res.pfad, t, 3).map(([x, y]) => new THREE.Vector2(x + versatz[0], y + versatz[1])));

const dunkelModus = () => { const t = document.documentElement.dataset.theme; return t === "dark" || (t !== "light" && matchMedia("(prefers-color-scheme: dark)").matches); };
function skizzenObjekt(f, farbe = 0x1f5fbf, bestimmt = null) {
  const g = new THREE.Group();
  const normal = new THREE.LineBasicMaterial({ color: farbe, depthTest: false });
  const fertigMat = bestimmt && new THREE.LineBasicMaterial({ color: dunkelModus() ? 0xf2f5f8 : 0x10161d, depthTest: false });
  const projMat = new THREE.LineBasicMaterial({ color: 0x9b59b6, depthTest: false });
  const hilfsMat = new THREE.LineDashedMaterial({ color: 0xd08a2c, dashSize: 4, gapSize: 3, depthTest: false });
  for (const el of f.elemente) {
    const mat = el.projiziert ? projMat : bestimmt?.has(el.id) ? fertigMat : normal;
    for (const pts of elGeo(el).linien) {
      const l = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts.map((p) => zu3D(f.ebene, p))), el.hilfs ? hilfsMat : mat);
      if (el.hilfs) l.computeLineDistances();
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
  modell.children.forEach((o) => { if (!o.userData.ebene) box.expandByObject(o); });
  const g = box.isEmpty() ? 300 : Math.min(Math.max(box.getSize(new THREE.Vector3()).length() * 0.7, 150), 5000);
  [...modell.children, ...grundebenen.children].forEach((o) => { if (o.userData.ebene) o.scale.set(g, g, 1); });
}

// Bezüge als Text, damit sie im Projekt gespeichert werden können:
//   Ebene: "XY" | Ebenen-ID | "F:o;n" (Körperfläche)   Kante: "A:X" | "K:skizze:element:kante" | "E:a;b" (Körperkante)
//   Punkt: "O" | "P:skizze:element:punkt" | "V:p"       Zylinder: "Z:extrusion:kreis"   Pfad: "L:skizze:element" | "E:a;b"
const zahl3 = (t) => t.split(",").map(Number);
const fmt3 = (p) => p.map((x) => +x.toFixed(3)).join(",");
const elementPunkte = (el) => ({ linie: () => el.pts, rechteck: () => [el.a, [el.b[0], el.a[1]], el.b, [el.a[0], el.b[1]]], kreis: () => [el.c],
  bogen: () => [el.a, el.b, bogenDaten(el)?.c || el.m], langloch: () => [el.a, el.b], punkt: () => [el.p] })[el.art]();
const ELEMENTNAME = { linie: "Linie", rechteck: "Rechteck", kreis: "Kreis", bogen: "Bogen", langloch: "Langloch", punkt: "Punkt" };
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
  const l = [["A:X", "X-Achse"], ["A:Y", "Y-Achse"], ["A:Z", "Z-Achse"]];
  for (const sk of vorher(f).filter((x) => x.typ === "skizze"))
    sk.elemente.forEach((el, ei) => elementKanten(el).forEach((_, ki, alle) => l.push([`K:${sk.id}:${ei}:${ki}`, `${sk.name} · ${ELEMENTNAME[el.art]} ${ei + 1}${alle.length > 1 ? ` · Kante ${ki + 1}` : ""}`])));
  return l;
}
function punkteListe(f) {
  const l = [["O", "Ursprung"]];
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
function waehleImRaum(art, e, f) {
  const sm = smPos(e);
  strahl.setFromCamera(ndc(e), kamera);
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
  grundebenen.visible = a?.wahl === "ebene";
  if (a) status({ ebene: "Ebene, Konstruktionsebene oder ebene Körperfläche in der Ansicht anklicken – oder in der Liste wählen.", kante: "Kante anklicken: Skizzenlinie, Körperkante oder Achse.",
    punkt: "Punkt anklicken: Skizzenpunkt, Körperecke oder Ursprung.", zylinder: "Zylindrische Fläche anklicken (extrudierter Kreis).", pfad: "Linie, Kreis oder Körperkante als Pfad anklicken." }[a.wahl] + ` (Feld «${a.label}»)`);
}
function uebernimmWahl(e) {
  const a = aktiveWahl(); if (!a) return false;
  let w = null;
  try { w = waehleImRaum(a.wahl, e, dlg.feature); } catch { w = null; }
  if (!w) { status("Hier ist nichts Passendes – " + ({ ebene: "eine Ebene oder Fläche", kante: "eine Kante", punkt: "einen Punkt", zylinder: "eine Zylinderfläche", pfad: "eine Linie" }[a.wahl]) + " anklicken."); return true; }
  const sel = $("d_" + a.id);
  if (![...sel.options].some((o) => o.value === w[0])) sel.add(new Option(w[1], w[0]));
  sel.value = w[0];
  for (const [k, v] of Object.entries(w[2] || {})) if ($("d_" + k)) $("d_" + k).value = v; // z. B. Winkel der angeklickten Stelle
  sel.dispatchEvent(new Event("change"));
  if (dlg?.sofort) { $("dOk").click(); return true; }
  const pf = dlg.felder.filter((fd) => fd.wahl), i = pf.indexOf(a);
  if (i < pf.length - 1) dlg.wahlNr = i + 1; // wie in Fusion: weiter zum nächsten Bezug
  zeigeWahl();
  return true;
}

// ------------------------------------------------------------ Neuaufbau (parametrisch, in Reihenfolge der Zeitleiste)
function regen() {
  leeren(modell);
  // Verwendete Materialien ins Projekt schreiben, damit es auf jedem Gerät gleich rechnet
  const benutzt = [...new Set(doc.features.map((f) => f.material).filter(Boolean))].map(material);
  doc.materialien = benutzt.filter((m, i) => benutzt.indexOf(m) === i);
  let platz = 0; // Vorlagen und freie Profile haben keine Lage: nebeneinander aufreihen statt übereinander
  const daneben = (res) => { const g = grenzen(polylinie(res.pfad)), v = [platz - g.x0, 0]; platz += g.x1 - g.x0 + einst.skizze.abstand; return v; };
  for (const f of doc.features) {
    f._fehler = null; f._res = null;
    try {
      if (f.typ === "ebene") {
        f._ebene = null;
        f._ebene = baueEbene(f);
        if (!f.versteckt) modell.add(ebenenObjekt(f._ebene, f.id));
      } else if (f.typ === "skizze") {
        if (!ebene(f.ebene)) throw new Error("Ebene fehlt");
        if (!f.versteckt && f !== skizze?.f) modell.add(skizzenObjekt(f));
      } else if (f.typ === "extrusion") {
        const s = finde(f.skizze); if (!s) throw new Error("Skizze fehlt");
        const fs = formen(s); if (!fs.length) throw new Error("Skizze hat kein geschlossenes Profil");
        if (!f.versteckt) modell.add(koerper(fs, s.ebene, f.abstand, f.richtung, 0x9aa5ad, f.id));
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
        if (!f.versteckt) modell.add(koerper([konturForm(f._res, m.t, kk[0])], s.ebene, f.laenge, f.richtung, farbe(m), f.id));
      } else if (f.typ === "vorlage") {
        if (!ebene(f.ebene)) throw new Error("Ebene fehlt");
        const m = material(f.material), v = VORLAGE[f.vorlage];
        const { start, ops } = v.bau(f.params, m);
        f._res = berechne(start, ops, m.t, m.ri, m.k);
        if (!f.versteckt) modell.add(koerper([konturForm(f._res, m.t, daneben(f._res))], f.ebene, f.laenge, f.richtung, farbe(m), f.id));
      } else if (f.typ === "detail") {
        f._detail = null; f._teile = null;
        if (!ebene(f.ebene)) throw new Error("Ebene fehlt");
        const d = baueDetail(detailAufbau(f), (tl) => detailMaterial(f, tl));
        f._detail = d;
        f._teile = d.teile.map((tl, i) => ({ id: `${f.id}:${i}`, typ: "detailteil", eltern: f, name: `${f.name} · ${tl.name}`, material: tl.material || f.materialien?.[tl.rolle] || f.material,
          laenge: f.laenge, stueck: f.stueck ?? 1, notiz: f.notiz, _res: tl.res }));
        if (!f.versteckt) {
          d.teile.forEach((tl, i) => modell.add(koerper([konturForm(tl.res, tl.m.t, tl.versatz)], f.ebene, f.laenge, f.richtung, farbe(tl.m), `${f.id}:${i}`)));
          for (const h of d.holz) modell.add(koerper([new THREE.Shape(h.pts.map(([x, y]) => new THREE.Vector2(x, y)))], f.ebene, f.laenge, f.richtung, h.art === "led" ? 0x2a2a2a : 0xc8a46e, f.id));
        }
      } else if (f.typ === "profil") {
        if (!ebene(f.ebene)) throw new Error("Ebene fehlt");
        const m = material(f.material);
        if (f.zeilen.some((z) => !(z.L > 0))) throw new Error("Jeder Schenkel braucht eine Länge grösser als 0");
        const { start, ops } = freiesProfil(f.start, f.zeilen, m);
        f._res = berechne(start, ops, m.t, m.ri, m.k);
        if (!f.versteckt) modell.add(koerper([konturForm(f._res, m.t, daneben(f._res))], f.ebene, f.laenge, f.richtung, farbe(m), f.id));
      }
    } catch (e) { f._fehler = e.message; }
  }
  ebenenGroesse();
  markiere();
  zeigeBrowser(); zeigeZeit(); zeigeWerkstatt();
  speichern(); merke();
  if (dlg?.info) { const t = dlg.info(); $("dInfo").textContent = t; $("dInfo").className = t.startsWith("⚠") ? "fehler" : ""; }
  dlg?.nachRegen?.();
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
const richtungSkalieren = () => richtung.children.forEach((o) => {
  if (o.userData.bildschirm) o.scale.setScalar(kamera.position.distanceTo(o.position) * o.userData.bildschirm);
});

// ------------------------------------------------------------ Browser und Zeitleiste
const NAMEN = { skizze: "Skizze", extrusion: "Extrusion", blech: "Blechprofil", vorlage: "Vorlage", profil: "Freies Profil", detail: "Spenglerdetail" };
function zeigeBrowser() {
  const eb = doc.features.filter((f) => f.typ === "ebene"), sk = doc.features.filter((f) => f.typ === "skizze"), kp = doc.features.filter((f) => f.typ !== "skizze" && f.typ !== "ebene");
  const zeile = (f, typ) => `<li data-id="${f.id}" class="${f.id === auswahl ? "aktiv" : ""}"><span class="typ ${typ}"></span>${f.name}${f._fehler ? " ⚠" : ""}
    <button class="auge" data-auge="${f.id}" aria-label="${f.versteckt ? "Einblenden" : "Ausblenden"}">${f.versteckt ? "○" : "●"}</button></li>`;
  $("baum").innerHTML = (eb.length ? `<li class="kopf">Konstruktion</li>${eb.map((f) => zeile(f, "ebene")).join("")}` : "") + `<li class="kopf">Skizzen</li>${sk.map((f) => zeile(f, "skizze")).join("") || '<li class="hinweis">Noch keine</li>'}
    <li class="kopf">Körper</li>${kp.map((f) => zeile(f, f.typ === "extrusion" ? "koerper" : "blech")).join("") || '<li class="hinweis">Noch keine</li>'}`;
}
$("baum").addEventListener("click", (e) => {
  const auge = e.target.dataset.auge;
  if (auge) { const f = finde(auge); f.versteckt = !f.versteckt; regen(); return; }
  const id = e.target.closest("li")?.dataset.id;
  if (id) waehle(id);
});
$("baum").addEventListener("dblclick", (e) => { const id = e.target.closest("li")?.dataset.id; if (id) bearbeite(finde(id)); });

function zeigeZeit() {
  $("zeit").innerHTML = doc.features.map((f) => `<button data-id="${f.id}" title="${f._fehler || "Bearbeiten"}">${f.name}${f._fehler ? " ⚠" : ""}</button>`).join("")
    || '<span class="hinweis">Leer: mit «Skizze» oder «Spengler-Vorlage» beginnen</span>';
  $("rueckgaengig").disabled = !doc.features.length || !!skizze;
}
$("zeit").addEventListener("click", (e) => { const id = e.target.closest("button")?.dataset.id; if (id) bearbeite(finde(id)); });
$("rueckgaengig").addEventListener("click", () => { doc.features.pop(); auswahl = null; regen(); });

function waehle(id) {
  auswahl = id; markiere(); zeigeWerkstatt();
  // nur die Markierung umschalten: ein Neuaufbau der Liste würde den Doppelklick zum Bearbeiten verschlucken
  document.querySelectorAll("#baum li[data-id]").forEach((li) => li.classList.toggle("aktiv", li.dataset.id === id || String(id).startsWith(li.dataset.id + ":")));
}

// ------------------------------------------------------------ Werkstatt
const f1 = (v) => v.toFixed(1);
let register = "teil"; // Werkstatt: «teil» oder «auftrag»
document.querySelectorAll("[data-register]").forEach((b) => (b.onclick = () => { register = b.dataset.register; zeigeWerkstatt(); }));
const blechteile = () => doc.features.filter((f) => !f.versteckt).flatMap((f) => f._teile || (f._res ? [f] : []));
function auftrag() {
  return stueckliste(blechteile().map((f) => ({ name: f.name, notiz: f.notiz, material: material(f.material), zuschnitt: f._res.zuschnitt, laenge: f.laenge, stueck: f.stueck ?? 1 })));
}
const f2 = (v) => v.toFixed(2);
// Materialbedarf: Spaltband/Coil in Laufmetern, Tafeln als Stückzahl (Schätzung)
const bedarf = () => materialbedarf(blechteile().map((f) => ({ name: f.name, material: material(f.material), zuschnitt: f._res.zuschnitt, laenge: f.laenge, stueck: f.stueck ?? 1 })), einst);
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
    abwicklungenDxf(blechteile().map((f) => ({ res: f._res, laenge: f.laenge, titel: `${f.name} ${f.stueck ?? 1} Stk ${material(f.material).name}` })), einst.skizze.abstand), "application/dxf");
  $("kCsv").onclick = () => herunterladen(`${doc.nr || "auftrag"} Stückliste.csv`, stuecklisteCsv(a, [["Objekt", doc.objekt], ["Nr.", doc.nr], []]) + bedarfCsv(), "text/csv");
}
function zeigeWerkstatt() {
  const f = waehlbar(auswahl);
  const w = $("werkstatt");
  document.querySelectorAll("[data-register]").forEach((b) => b.setAttribute("aria-selected", b.dataset.register === register));
  if (register === "auftrag") return zeigeAuftrag(w);
  if (f?.typ === "ebene") {
    const e = f._ebene, v3 = (a) => a.map((x) => +x.toFixed(2)).join(" / ");
    w.innerHTML = `<div class="unter" style="padding-top:12px">${esc(f.name)} · ${EBENEN_ARTEN[f.art]}</div>
      ${e ? `<p class="leer">Ursprung ${v3(e.o)} mm<br>Normale ${v3(e.n)}</p><div class="reihe"><button class="knopf haupt" id="kSkizzeHier">Skizze auf dieser Ebene</button></div>` : `<p class="leer">⚠ ${esc(f._fehler || "nicht berechenbar")}</p>`}`;
    if ($("kSkizzeHier")) $("kSkizzeHier").onclick = () => neueSkizze(f.id);
    return;
  }
  if (f?.typ === "detail" && f._detail) return zeigeDetail(w, f);
  if (!f || !f._res) { w.innerHTML = `<p class="leer">${f ? (f._fehler || "Volumenkörper: keine Abwicklung.") : "Blechteil anklicken, um Zuschnitt und Abkantfolge zu sehen."}</p>`; return; }
  const r = f._res, m = material(f.material), q = quelle(r.zuschnitt, einst), abB = einst.anzeige.abB;
  w.innerHTML = `<div class="zahl"><b>${f1(r.zuschnitt)}</b><span>mm Zuschnitt</span></div>
    ${f.eltern ? `<div class="unter"><button class="knopf klein" id="kZumDetail">← ${esc(f.eltern.name)}</button></div>` : ""}
    <div class="unter">${esc(f.name)} · ${r.biegungen.length} Biegungen${r.hatRundung ? "" : ` · Summe Schenkel ${r.summeSchenkel.toFixed(0)} mm`}</div>
    ${f.notiz?.trim() ? `<div class="notiz"><b>Notiz</b> ${esc(f.notiz)}</div>` : ""}
    <div class="zeichnung">${profilSvg(r, { dicke: m.t, breite: 276, hoehe: 200, schrift: 11 })}${abwicklungSvg(r, { breite: 276, schrift: 10 })}</div>
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
async function herunterladen(name, inhalt, typ, pfad = null) {
  const endung = name.split(".").pop();
  if (pc) {
    try {
      const ziel = await pc.invoke("datei_speichern", { name, inhalt, filter: DATEITYPEN[endung] || endung, endungen: [endung], pfad });
      if (ziel) status(`${dateiname(ziel)} gespeichert.`);
      return ziel;
    } catch (e) { status("Speichern fehlgeschlagen: " + e); return null; }
  }
  const a = document.createElement("a");
  // Browser verwerfen Download-Namen mit Umlauten teils («download»), daher umschreiben
  const sicher = name.replace(/[äöüÄÖÜß]/g, (c) => ({ ä: "ae", ö: "oe", ü: "ue", Ä: "Ae", Ö: "Oe", Ü: "Ue", ß: "ss" })[c]);
  a.href = URL.createObjectURL(new Blob([inhalt], { type: typ })); a.download = sicher;
  document.body.appendChild(a); a.click(); a.remove();
  status(`${sicher} gespeichert (Download-Ordner).`);
  return null;
}

// ------------------------------------------------------------ Befehlsdialog
let dlg = null;
function dialog(opt) {
  dlg = opt;
  $("dTitel").textContent = opt.titel;
  $("dInfo").textContent = "";
  $("dLoeschen").hidden = !opt.loeschen;
  $("dInhalt").innerHTML = opt.felder.map((fd) => {
    const inp = fd.optionen
      ? `<select id="d_${fd.id}">${fd.optionen.map(([w, t]) => `<option value="${w}" ${String(w) === String(fd.wert) ? "selected" : ""}>${esc(t)}</option>`).join("")}</select>`
      : fd.text ? `<input id="d_${fd.id}" type="text" value="${esc(fd.wert)}">`
      : `<input id="d_${fd.id}" type="number" step="any" inputmode="decimal" value="${fd.wert}">`;
    return `<div class="feld"${fd.wahl ? ` data-wahl="${fd.wahl}" data-feld="${fd.id}"` : ""}><label for="d_${fd.id}">${fd.wahl ? "⊕ " : ""}${fd.label}${fd.einheit ? ` (${fd.einheit})` : ""}</label>${inp}</div>`;
  }).join("") + (opt.zusatz ? `<div id="dZusatz">${opt.zusatz()}</div>` : "") + (opt.hinweis ? `<p class="hinweis">${opt.hinweis}</p>` : "");
  $("dialog").hidden = false;
  opt.felder.forEach((fd) => $("d_" + fd.id).addEventListener(fd.optionen ? "change" : "input", () => opt.aendern?.(werte(), fd.id)));
  opt.binden?.($("dZusatz"));
  // Wahlfelder: das aktive Feld nimmt den nächsten Klick in der Ansicht auf
  document.querySelectorAll("#dInhalt .feld[data-wahl]").forEach((el) => el.addEventListener("pointerdown", () => { dlg.wahlNr = opt.felder.filter((fd) => fd.wahl).findIndex((fd) => fd.id === el.dataset.feld); zeigeWahl(); }));
  zeigeWahl();
}
const werte = () => Object.fromEntries(dlg.felder.map((fd) => { const v = $("d_" + fd.id).value; return [fd.id, fd.optionen || fd.text ? v : parseFloat(v)]; }));
function schliesse() {
  if (dlg?.felder.some((fd) => fd.wahl)) status(""); // Hinweis «… anklicken» gilt nur im Dialog
  $("dialog").hidden = true; dlg = null; grundebenen.visible = false;
}
$("dOk").onclick = () => { dlg?.ok?.(werte()); schliesse(); regen(); };
$("dAbbrechen").onclick = () => { dlg?.abbrechen?.(); schliesse(); regen(); };
$("dLoeschen").onclick = () => { dlg?.loeschen?.(); schliesse(); regen(); };

// Neue oder bestehende Features mit Live-Vorschau. felder(f) liefert die Felder, setze(f, w) übernimmt Werte.
function featureDialog(f, istNeu, felder, setze, titel, hinweis, extra = {}) {
  const kopie = JSON.parse(JSON.stringify(f, (k, v) => (k.startsWith("_") ? undefined : v))), alteAuswahl = auswahl;
  if (istNeu) doc.features.push(f);
  auswahl = f.id; // Werkstatt zeigt das Teil schon während der Eingabe
  dialog({
    titel, hinweis, felder: felder(f), feature: f,
    info: () => (f._fehler ? "⚠ " + f._fehler : f._res ? `Zuschnitt ${f1(f._res.zuschnitt)} × ${f.laenge} mm · ${f._res.biegungen.length} Biegungen` : ""),
    ...extra,
    aendern: (w, feld) => {
      setze(f, w);
      if (feld === "vorlage" || feld === "skizze" || feld === "detail") { const d = dlg; dialog({ ...d, felder: felder(f) }); setze(f, werte()); }
      regen();
    },
    ok: (w) => { setze(f, w); auswahl = f.id; },
    abbrechen: () => { if (istNeu) { doc.features.splice(doc.features.indexOf(f), 1); auswahl = alteAuswahl; } else Object.assign(f, kopie); },
    loeschen: istNeu ? null : () => { doc.features.splice(doc.features.indexOf(f), 1); auswahl = null; },
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
  if (f.typ === "blech") return blechDialog(f);
  if (f.typ === "vorlage") return vorlageDialog(f);
  if (f.typ === "profil") return profilDialog(f);
  if (f.typ === "detail") return detailDialog(f);
  if (f.typ === "detailteil") return bearbeite(f.eltern);
  if (f.typ === "ebene") return ebeneDialog(f.art, f);
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
  const sk = doc.features.filter((x) => x.typ === "skizze" && schleifen(x).length);
  if (!sk.length) return status("Zuerst eine Skizze mit geschlossenem Profil zeichnen (Rechteck, Kreis oder geschlossener Linienzug).");
  f ||= { id: neueId(), typ: "extrusion", name: "Extrusion " + (doc.features.filter((x) => x.typ === "extrusion").length + 1), skizze: sk.at(-1).id, abstand: 100, richtung: "eine" };
  featureDialog(f, istNeu, (f) => [
    { id: "skizze", label: "Profil aus", optionen: sk.map((s) => [s.id, s.name]), wert: f.skizze },
    { id: "abstand", label: "Abstand", einheit: "mm", wert: f.abstand },
    { id: "richtung", label: "Richtung", optionen: RICHTUNGEN, wert: f.richtung },
  ], (f, w) => Object.assign(f, w), "Extrudieren", "Alle geschlossenen Profile der Skizze werden extrudiert, innere Profile werden zu Löchern.");
}

function blechDialog(f) {
  const istNeu = !f;
  const sk = doc.features.filter((x) => x.typ === "skizze" && ketten(x).length);
  if (!sk.length) return status("Zuerst eine Skizze mit offenem Linienzug zeichnen: Blechmitte oder eine Blechoberfläche.");
  f ||= { id: neueId(), typ: "blech", name: "Blechprofil " + (doc.features.filter((x) => x.typ === "blech").length + 1), skizze: sk.at(-1).id, kette: Math.max(0, ketten(sk.at(-1)).findIndex((k) => !k.mitBogen)), lage: einst.neu.lage, material: neuMaterial(), laenge: einst.neu.laenge, stueck: einst.neu.stueck, richtung: "eine" };
  featureDialog(f, istNeu, (f) => [
    { id: "skizze", label: "Linienzug aus", optionen: sk.map((s) => [s.id, s.name]), wert: f.skizze },
    { id: "kette", label: "Linienzug", optionen: ketten(finde(f.skizze) || sk.at(-1)).map((k, i) => [i, `Nr. ${i + 1}${k.mitBogen ? " (mit Bogen)" : ""}`]), wert: f.kette },
    { id: "lage", label: "Blech zur Linie", optionen: LAGEN, wert: f.lage ?? "mitte" },
    { id: "umkehren", label: "Kante A", optionen: [["", "Am Anfang der Linie"], ["1", "Am Ende der Linie"]], wert: f.umkehren ? "1" : "" },
    { id: "material", label: "Material", optionen: matOpt(), wert: f.material },
    { id: "laenge", label: "Länge", einheit: "mm", wert: f.laenge },
    { id: "stueck", label: "Stück", wert: f.stueck ?? 1 },
    { id: "notiz", label: "Notiz", text: true, wert: f.notiz ?? "" },
    { id: "richtung", label: "Richtung", optionen: RICHTUNGEN, wert: f.richtung },
  ], (f, w) => Object.assign(f, w, { kette: Math.min(+w.kette || 0, ketten(finde(w.skizze)).length - 1), umkehren: w.umkehren === "1" }), "Blechprofil",
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
  featureDialog(f, istNeu, felder, setze, "Spengler-Vorlage", "", { wahlNr: -1 });
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


// ------------------------------------------------------------ Spenglerdetail: Holz + mehrere Blechteile in einem Querschnitt
// f.detail = Vorlage (Parameter f.params) oder "frei" (f.aufbau: holz, teile mit Abkantfolge, masse)
const detailMaterial = (f, tl) => material(tl.material || f.materialien?.[tl.rolle] || f.material);
function detailAufbau(f) {
  if (f.detail === "frei") return f.aufbau;
  const v = DETAIL[f.detail]; if (!v) throw new Error("Detailvorlage fehlt");
  const t = material(f.materialien?.dach || f.materialien?.fassade || f.material).t;
  return v.bau({ ...detailStandard(f.detail), ...f.params }, t);
}
const detailZeichnung = (f, opt) => detailSvg(f._detail, f._detail.teile.map(teilKontur), opt);
function zeigeDetail(w, f) {
  const d = f._detail, n = f.stueck ?? 1;
  w.innerHTML = `<div class="unter" style="padding-top:10px"><b>${esc(f.name)}</b> · Spenglerdetail · ${d.teile.length} Blechteile · ${f.laenge} mm · ${n} Stk.</div>
    <div class="zeichnung detailbild">${detailZeichnung(f, { breite: 276, hoehe: 230, schrift: 9, rand: 14 })}</div>
    <table class="liste"><thead><tr><th>Pos.</th><th>Teil</th><th class="num">Zuschnitt</th><th class="num">Biegungen</th></tr></thead><tbody>
    ${d.teile.map((tl, i) => `<tr class="klickbar" data-teil="${i}"><td>${i + 1}</td><td>${esc(tl.name)}<br><small>${esc(tl.m.name)}</small></td><td class="num">${f1(tl.res.zuschnitt)}</td><td class="num">${tl.res.biegungen.length}</td></tr>`).join("")}
    </tbody></table>
    <p class="hinweis">Teil anklicken (hier oder in 3D) für Abkantfolge und Werkstattblatt.</p>
    <div class="reihe"><button class="knopf haupt" id="kDetailBearb">Bearbeiten</button><button class="knopf" id="kDetailDruck">Detailblatt drucken</button><button class="knopf" id="kDetailTeile">Werkstattblätter</button><button class="knopf" id="kKopie" title="Strg+D">Duplizieren</button></div>`;
  w.querySelectorAll("[data-teil]").forEach((tr) => (tr.onclick = () => waehle(`${f.id}:${tr.dataset.teil}`)));
  $("kDetailBearb").onclick = () => bearbeite(f);
  $("kDetailDruck").onclick = () => druckeDetails([f]);
  $("kDetailTeile").onclick = () => drucke(f._teile);
  $("kKopie").onclick = () => dupliziere(f);
}
// Detailblatt (A4 quer): Schnitt mit Schraffur und Massen, Positionsliste
function detailblatt(f) {
  const d = f._detail, M = +f.massstab > 0 ? +f.massstab : passenderMassstab(d, 270, 118); // Zeichenfläche A4 quer in mm
  return `<section class="blatt detailblatt">
    <header><div>${kopf("Detail")}<h1>${esc(f.name)}</h1></div>
      <dl><dt>Objekt</dt><dd>${esc(doc.objekt)}</dd><dt>Nr.</dt><dd>${esc(doc.nr)}</dd><dt>Massstab</dt><dd>1:${M}</dd><dt>Datum</dt><dd>${new Date().toLocaleDateString("de-CH")}</dd></dl></header>
    <div class="grosszeichnung massstabgetreu">${detailZeichnung(f, { breite: 275, hoehe: 122, schrift: 3, rand: 0, massstab: 1 / M, papier: true, schenkel: !!f.schenkelmasse })}</div>
    <table class="liste"><thead><tr><th>Pos.</th><th>Teil</th><th>Material</th><th>Abkantfolge (Schenkel Winkel …)</th><th class="num">Zuschnitt × Länge mm</th><th class="num">Stück</th></tr></thead><tbody>
    ${d.teile.map((tl, i) => `<tr><td>${i + 1}</td><td>${esc(tl.name)}</td><td>${esc(tl.m.name)}</td><td class="folge">${esc(folgeText(tl.zeilen))}</td><td class="num">${f1(tl.res.zuschnitt)} × ${f.laenge}</td><td class="num">${f.stueck ?? 1}</td></tr>`).join("")}
    </tbody></table>
    ${f.notiz?.trim() ? `<div class="notiz"><b>Notiz</b> ${esc(f.notiz)}</div>` : ""}
    <p class="hinweis">Masse in mm. Blech auf der Blechmitte gerechnet; Holz schraffiert. Kreis = Kante A des Blechteils (Positionsnummer).</p>
  </section>`;
}
function druckeDetails(liste) {
  liste = liste.filter((f) => f._detail);
  if (!liste.length) return status("Kein Spenglerdetail zum Drucken.");
  $("druck").innerHTML = liste.map(detailblatt).join("");
  window.print();
}
function detailDialog(f) {
  const istNeu = !f, v0 = DETAILS.find((d) => d.gruppe === "SwissSkills 2026") || DETAILS[0];
  f ||= { id: neueId(), typ: "detail", name: v0.name, detail: v0.id, params: detailStandard(v0.id), material: neuMaterial(), materialien: {},
    laenge: einst.neu.laenge, stueck: einst.neu.stueck, richtung: "eine", ebene: einst.neu.ebene };
  const rollen = () => { try { return rollenVon(detailAufbau(f)); } catch { return []; } };
  const gruppen = [...new Set(DETAILS.map((d) => d.gruppe))];
  const felder = (f) => [
    { id: "detail", label: "Detail", optionen: [["frei", "Eigenes Detail (frei)"], ...gruppen.flatMap((g) => DETAILS.filter((d) => d.gruppe === g).map((d) => [d.id, `${g}: ${d.name}`]))], wert: f.detail },
    { id: "name", label: "Name", text: true, wert: f.name },
    ...(f.detail === "frei" ? [] : DETAIL[f.detail].params.map(([k, l, e]) => ({ id: "p_" + k, label: l, einheit: e, wert: f.params[k] ?? detailStandard(f.detail)[k] }))),
    ...rollen().map((r) => ({ id: "m_" + r, label: "Material " + ROLLEN[r], optionen: matOpt(), wert: f.materialien?.[r] || f.material })),
    { id: "laenge", label: "Länge", einheit: "mm", wert: f.laenge },
    { id: "stueck", label: "Stück", wert: f.stueck ?? 1 },
    { id: "notiz", label: "Notiz", text: true, wert: f.notiz ?? "" },
    { id: "richtung", label: "Richtung", optionen: RICHTUNGEN, wert: f.richtung },
    { id: "ebene", label: "Querschnitt in", wahl: "ebene", optionen: ebenenOpt(f, f.ebene), wert: f.ebene },
    { id: "massstab", label: "Detailblatt Massstab", optionen: [["auto", "Automatisch"], ...MASSSTAEBE.map((m) => [m, "1:" + m])], wert: f.massstab ?? "auto" },
    { id: "schenkelmasse", label: "Schenkelmasse zeigen", optionen: [["", "Nein"], ["1", "Ja"]], wert: f.schenkelmasse ? "1" : "" },
  ];
  const setze = (f, w) => {
    if (w.detail !== f.detail) {
      if (w.detail === "frei") f.aufbau = JSON.parse(JSON.stringify(f._detail ? { holz: f._detail.holz, teile: f._detail.teile.map(({ name, rolle, x, y, start, zeilen, material }) => ({ name, rolle, x, y, start, zeilen, material })), masse: f._detail.masse } : { holz: [], teile: [], masse: [] }));
      else { if (!f.name || f.name === DETAIL[f.detail]?.name) f.name = DETAIL[w.detail].name; f.params = detailStandard(w.detail); delete f.aufbau; }
      f.detail = w.detail; return;
    }
    f.name = w.name?.trim() || f.name;
    if (f.detail !== "frei") for (const [k] of DETAIL[f.detail].params) if (Number.isFinite(w["p_" + k])) f.params[k] = w["p_" + k];
    f.materialien = { ...f.materialien }; for (const r of Object.keys(ROLLEN)) if (w["m_" + r]) f.materialien[r] = w["m_" + r];
    Object.assign(f, { laenge: w.laenge, stueck: w.stueck, notiz: w.notiz, richtung: w.richtung, ebene: w.ebene, massstab: w.massstab, schenkelmasse: !!w.schenkelmasse });
  };
  // Vorschau als Schnitt und – bei «frei» – Tabellen für Blechteile (Abkantfolge in Kurzschrift) und Holz
  const tabelle = () => `<div id="detailVorschau" class="detailvorschau"></div>${f.detail === "frei" ? `
    <table class="zeilen teile"><thead><tr><th>#</th><th>Blechteil</th><th>Rolle</th><th>x</th><th>y</th><th>Start°</th><th>Abkantfolge</th><th></th></tr></thead><tbody>
    ${f.aufbau.teile.map((tl, i) => `<tr data-i="${i}" data-art="teil"><td>${i + 1}</td><td><input data-k="name" value="${esc(tl.name)}"></td>
      <td><select data-k="rolle">${Object.entries(ROLLEN).map(([k, t]) => `<option value="${k}" ${tl.rolle === k ? "selected" : ""}>${t}</option>`).join("")}</select></td>
      <td><input data-k="x" type="number" step="any" value="${+tl.x.toFixed(2)}"></td><td><input data-k="y" type="number" step="any" value="${+tl.y.toFixed(2)}"></td>
      <td><input data-k="start" type="number" step="any" value="${+tl.start.toFixed(2)}"></td><td><input data-k="folge" class="folge" value="${esc(folgeText(tl.zeilen))}" title="Schenkel Winkel Schenkel …  Winkel + = links/oben, − = rechts/unten; U+ / U− = Umschlag; 90r5 = Radius 5"></td>
      <td><button class="weg" data-weg="teil:${i}" aria-label="Teil ${i + 1} entfernen">×</button></td></tr>`).join("")}
    </tbody></table><button class="knopf" data-neu="teil">+ Blechteil</button>
    <table class="zeilen holz"><thead><tr><th>Holz / Unterkonstruktion</th><th>Eckpunkte x,y …</th><th></th></tr></thead><tbody>
    ${f.aufbau.holz.map((h, i) => `<tr data-i="${i}" data-art="holz"><td><input data-k="name" value="${esc(h.name)}"></td><td><input data-k="pts" class="folge" value="${h.pts.map((p) => p.map((v) => +v.toFixed(2)).join(",")).join(" ")}"></td>
      <td><button class="weg" data-weg="holz:${i}" aria-label="Holz ${i + 1} entfernen">×</button></td></tr>`).join("")}
    </tbody></table><button class="knopf" data-neu="holz">+ Holz (Rechteck)</button>` : `<div class="reihe"><button class="knopf" data-frei>Frei anpassen (Teile und Holz bearbeiten)</button></div>`}`;
  const zeigeVorschau = () => { const b = $("detailVorschau"); if (b) b.innerHTML = f._detail ? detailZeichnung(f, { breite: 460, hoehe: 300, schrift: 10, rand: 16, schenkel: !!f.schenkelmasse }) : ""; };
  const binden = (box) => {
    const neu = () => { const d = dlg; dialog({ ...d, felder: felder(f) }); regen(); };
    box.addEventListener("change", (e) => {
      const k = e.target.dataset.k, tr = e.target.closest("tr"); if (!k || !tr) return;
      const i = +tr.dataset.i, v = e.target.value;
      try {
        if (tr.dataset.art === "teil") {
          const tl = f.aufbau.teile[i];
          if (k === "folge") tl.zeilen = folge(v); else if (k === "name" || k === "rolle") tl[k] = v; else tl[k] = parseFloat(v) || 0;
        } else {
          const h = f.aufbau.holz[i];
          if (k === "pts") { const pts = v.trim().split(/\s+/).map((q) => q.split(",").map(Number)); if (pts.length < 3 || pts.some((q) => q.length !== 2 || q.some((x) => !Number.isFinite(x)))) throw new Error("Mindestens drei Punkte «x,y» mit Leerzeichen getrennt"); h.pts = pts; }
          else h[k] = v;
        }
        e.target.classList.remove("ungueltig"); regen();
      } catch (err) { e.target.classList.add("ungueltig"); status(err.message); }
    });
    box.addEventListener("click", (e) => {
      if (e.target.dataset.frei != null) { const w = werte(); setze(f, { ...w, detail: "frei" }); neu(); return; }
      const weg = e.target.dataset.weg, dazu = e.target.dataset.neu;
      if (weg) { const [art, i] = weg.split(":"); f.aufbau[art === "teil" ? "teile" : "holz"].splice(+i, 1); neu(); }
      else if (dazu === "teil") { f.aufbau.teile.push({ name: "Blechteil " + (f.aufbau.teile.length + 1), rolle: "fassade", x: 0, y: 0, start: 0, zeilen: folge("100 90 25") }); neu(); }
      else if (dazu === "holz") { f.aufbau.holz.push({ name: "Holz " + (f.aufbau.holz.length + 1), pts: [[0, -27], [200, -27], [200, 0], [0, 0]], art: "holz" }); neu(); }
    });
    zeigeVorschau();
  };
  featureDialog(f, istNeu, felder, setze, "Spenglerdetail",
    "Detail wählen und Masse anpassen – Blechteile, Holz und Schnitt passen sich an. «Frei anpassen» öffnet alle Teile als Abkantfolge (z. B. «150 90 25 U+ 7»).",
    { zusatz: tabelle, binden, nachRegen: zeigeVorschau, wahlNr: -1,
      info: () => (f._fehler ? "⚠ " + f._fehler : f._detail ? f._detail.teile.map((tl, i) => `${i + 1} ${tl.name} ${f1(tl.res.zuschnitt)}`).join(" · ") : "") });
}

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
const EINST_REGISTER = [["material", "Materialien"], ["lager", "Lager"], ["neu", "Neue Teile"], ["druck", "Druck"], ["etiketten", "Etiketten"], ["programm", "Programm"], ["vorlagen", "Vorlagen & Sichern"]];
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
    <div class="tabwrap"><table class="zeilen mat"><thead><tr><th>Name</th><th>Dicke mm</th><th>Innenradius mm</th><th>K-Faktor</th><th>Dichte kg/dm³</th><th></th></tr></thead><tbody>
    ${e.materialien.map((m, i) => `<tr><td>${feld(i, "name", m.name)}</td><td>${feld(i, "t", m.t)}</td><td>${feld(i, "ri", m.ri)}</td><td>${feld(i, "k", m.k)}</td><td>${feld(i, "dichte", m.dichte ?? "")}</td>
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
      ${einstFeld("skizze.raster", "Fangraster mm", "zahl", null, "Punkte rasten auf dieses Mass ein (Umschalt hält das Raster aus)")}
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
    <h4>PC-Programm</h4>
    ${pc ? `<div class="egitter">
      ${einstFeld("programm.updates", "Beim Start nach Updates suchen", "janein")}
      ${einstFeld("programm.zuletzt", "Anzahl «Zuletzt»-Projekte")}
    </div>
    <div class="reihe ohnerand"><button class="knopf" id="eUpdate">Jetzt nach Updates suchen</button></div>`
      : '<p class="hinweis">Updates und «Zuletzt» gibt es nur im Windows-Programm. Die Web-Version ist immer aktuell.</p>'}
    <p class="hinweis">Version ${VERSION}</p>`,
    vorlagen: `
    <h4>Eigene Vorlagen</h4>
    ${e.vorlagen.length ? `<ul class="eigene">${e.vorlagen.map((v, i) => `<li>${esc(v.name)} <small class="hinweis">${v.zeilen.length} Schenkel</small><button class="weg" data-vweg="${i}" aria-label="${esc(v.name)} entfernen">×</button></li>`).join("")}</ul>`
      : '<p class="hinweis">Noch keine. Ein freies Profil wählen und in der Werkstatt «Als eigene Vorlage speichern».</p>'}
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
  if (t.dataset.k) { const m = entwurf.materialien[+t.dataset.i]; m[t.dataset.k] = t.dataset.k === "name" ? t.value : parseFloat(t.value); }
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
  if (ev.target.id === "eUpdate") {
    meldung("Suche nach Updates …");
    try {
      const r = await pc.invoke("nach_update_suchen");
      meldung(r === "aktuell" ? `Programm ist aktuell (Version ${VERSION}).` : "Update später installieren – beim nächsten Start wird wieder gefragt.");
    } catch (e) { meldung("Keine Update-Information erreichbar (Internet? Noch kein Release auf main?): " + e); }
    return;
  }
  if (ev.target.dataset.weg != null) { entwurf.materialien.splice(+ev.target.dataset.weg, 1); zeigeEinst(); }
  else if (ev.target.dataset.vweg != null) { entwurf.vorlagen.splice(+ev.target.dataset.vweg, 1); zeigeEinst(); }
  else if (ev.target.id === "eNeuMat") {
    const v = entwurf.materialien.at(-1);
    entwurf.materialien.push({ ...v, id: "eigen" + Date.now().toString(36), name: v.name + " (Kopie)" }); zeigeEinst();
    $("eInhalt").querySelector(`tr:nth-child(${entwurf.materialien.length}) input`)?.focus();
  }
});
$("wEinst").onclick = () => { if (dlg) $("dAbbrechen").click(); entwurf = JSON.parse(JSON.stringify(einst)); meldung(""); zeigeEinst(); $("einst").hidden = false; };
$("eAbbrechen").onclick = () => { $("einst").hidden = true; entwurf = null; };
$("eStandard").onclick = () => { entwurf = { ...standardEinst(), vorlagen: entwurf.vorlagen }; zeigeEinst(); meldung("Alle Standardwerte geladen (eigene Vorlagen bleiben) – mit «Übernehmen» speichern."); };
$("eOk").onclick = () => {
  const falsch = entwurf.materialien.find((m) => !m.name.trim() || !(m.t > 0) || !(m.ri >= 0) || !(m.k > 0 && m.k < 1));
  if (falsch) { einstRegister = "material"; zeigeEinst(); return meldung(`Material «${falsch.name || "ohne Namen"}»: Dicke > 0, Innenradius ≥ 0 und K-Faktor zwischen 0 und 1 nötig.`); }
  const { neu: n, skizze: sk, etiketten: et, programm: pr } = entwurf;
  const ganz = (v) => Number.isInteger(v) && v >= 1;
  const fehler = !(n.laenge > 0) ? ["neu", "Länge für neue Teile muss grösser als 0 sein."]
    : !ganz(n.stueck) ? ["neu", "Stück für neue Teile: ganze Zahl ab 1."]
    : !(sk.raster > 0) ? ["neu", "Fangraster muss grösser als 0 sein."]
    : !(sk.abstand >= 0) ? ["neu", "Abstand der Teile darf nicht negativ sein."]
    : !(ganz(et.spalten) && ganz(et.zeilen)) ? ["etiketten", "Spalten und Zeilen: ganze Zahlen ab 1."]
    : !(et.breite > 0 && et.hoehe > 0) ? ["etiketten", "Etikettgrösse muss grösser als 0 sein."]
    : ![et.oben, et.links, et.abstandX, et.abstandY].every((v) => v >= 0) ? ["etiketten", "Ränder und Abstände dürfen nicht negativ sein."]
    : !ganz(pr.zuletzt) ? ["programm", "Anzahl «Zuletzt»: ganze Zahl ab 1."] : null;
  if (fehler) { einstRegister = fehler[0]; zeigeEinst(); return meldung(fehler[1]); }
  einst = entwurf; entwurf = null; $("einst").hidden = true;
  einstSpeichern(); darstellung();
  regen(); status("Einstellungen gespeichert. Alle Teile neu berechnet.");
};

// ------------------------------------------------------------ Hilfe
const hilfe = (auf) => { $("hilfe").hidden = !auf; };
$("wHilfe").onclick = () => hilfe(true);
$("hZu").onclick = () => hilfe(false);
$("hVersion").textContent = `Version ${VERSION}` + (pc ? " · PC-Programm" : " · Web-Version");
document.addEventListener("keydown", (e) => {
  if (e.key === "F1") { e.preventDefault(); hilfe($("hilfe").hidden); }
  else if (e.key === "Escape") { if (!$("hilfe").hidden) hilfe(false); else if (!$("einst").hidden) $("eAbbrechen").click(); }
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
const alleBox = () => { const b = new THREE.Box3().setFromObject(modell); b.union(new THREE.Box3().setFromObject(live)); return b; };
function ansicht(name) {
  const d = { oben: [0, 1, 0.0001], vorne: [0, 0, 1], rechts: [1, 0, 0], iso: [0.7, 0.5, 0.8] }[name];
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
  punkt: { knopf: "tPunkt", text: "Punkt: Stelle anklicken (z. B. als Bezug für Konstruktionsebenen)." },
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
  projizieren: { aendern: true, knopf: "tProjizieren", text: "Projizieren: Körperkante oder Linie einer anderen Skizze anklicken – oder eine Körperfläche (ihr Umriss). Projizierte Linien sind fixiert (violett)." },
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
  mass: { knopf: "tMass", muster: ["L", "K", "PP", "PL", "LP", "LL"], text: "Bemassung (D): Linie → Länge, Kreis → Ø, Bogen → R, zwei Punkte → Abstand, Punkt + Linie → Abstand, zwei Linien → Winkel. Wert eintippen, Enter." },
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
function starteSkizze(f) {
  vorbereiten(f); // IDs, Abhängigkeiten; alte Rechtecke werden Linienzüge mit H/V
  skizze = { f, werkzeug: "linie", pkt: [], maus: null, sel: null, bsel: null, zug: null, quelle: null, ecken: 6, radius: 10, picks: [], fangRefs: [], mehr: new Set(), basis: null };
  $("gSkizze").hidden = false;
  ["wSkizze", "wExtrusion", "wBlech", "wVorlage", "wProfil", "wDetail", "wEbene"].forEach((id) => ($(id).disabled = true));
  steuerung.mouseButtons = { LEFT: null, MIDDLE: THREE.MOUSE.PAN, RIGHT: THREE.MOUSE.ROTATE };
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
function beendeSkizze() {
  if (!skizze) return;
  abschliessenLinie();
  const f = skizze.f;
  skizze = null;
  if (!f.elemente.length) doc.features.splice(doc.features.indexOf(f), 1);
  $("gSkizze").hidden = true;
  ["wSkizze", "wExtrusion", "wBlech", "wVorlage", "wProfil", "wDetail", "wEbene"].forEach((id) => ($(id).disabled = false));
  steuerung.mouseButtons = { LEFT: THREE.MOUSE.ROTATE, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.PAN };
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
  return skizzenPunkte(skizze.f).map((q) => ({ uv: q.uv, ref: q.ref })).concat(skizze.pkt.map((uv) => ({ uv, ref: null })));
}
function ebenenPunkt(e) {
  strahl.setFromCamera(ndc(e), kamera);
  const p = strahl.ray.intersectPlane(ebenenEbene(skizze.f.ebene), new THREE.Vector3());
  if (!p) return null;
  let uv = aufEbene(skizze.f.ebene, p);
  const r = leinwand.getBoundingClientRect(), sm = [e.clientX - r.left, e.clientY - r.top];
  for (const q of fangPunkte()) { const s = bildschirm(q.uv); if (Math.hypot(s[0] - sm[0], s[1] - sm[1]) < 10) return { uv: q.uv.slice(), fang: true, ref: q.ref }; }
  if (!e.shiftKey) uv = uv.map((x) => Math.round(x / einst.skizze.raster) * einst.skizze.raster);
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
  const rund = (x) => Math.round(x / einst.skizze.raster) * einst.skizze.raster || x;
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
    bogen: () => ({ art: "bogen", a: sp(q.a), b: sp(q.b), m: sp(q.m) }), langloch: () => ({ art: "langloch", a: sp(q.a), b: sp(q.b), r: q.r }), punkt: () => ({ art: "punkt", p: sp(q.p) }) }[q.art]();
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
function projizieren(sm) {
  const f = skizze.f, E = E_(f.ebene), auf = (w) => zuLokal(E, w), kand = [];
  for (const [a, b] of koerperKanten()) kand.push({ a, b, zug: [a, b], name: "Körperkante" });
  for (const sk of vorher(f).filter((x) => x.typ === "skizze" && ebene(x.ebene))) for (const el of sk.elemente) for (const pts of elGeo(el).linien) {
    const w = pts.map((q) => zuWelt(E_(sk.ebene), q));
    for (let i = 1; i < w.length; i++) kand.push({ a: w[i - 1], b: w[i], zug: w, zu: !!elGeo(el).kontur, name: sk.name });
  }
  let best = null, bd = 12;
  for (const k of kand) { const A = aufSchirm(k.a), B = aufSchirm(k.b); if (A[2] < 1 && B[2] < 1) { const d = abstandStrecke(sm, A, B); if (d < bd) { bd = d; best = k; } } }
  let zuege = [];
  if (best) zuege = [{ pts: best.zug.map(auf), zu: best.zu }];
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
  for (const z of zuege) {
    const pts = z.pts.filter((q, i) => !i || abst(q, z.pts[i - 1]) > 1e-6);
    if (z.zu && pts.length > 2 && gleich(pts[0], pts.at(-1))) pts.pop();
    if (pts.length < 2 || pts.every((q) => abst(q, pts[0]) < 1e-6)) continue;
    const el = { art: "linie", pts, geschlossen: !!z.zu && pts.length > 2, projiziert: true, id: neueElementId(f) };
    f.elemente.push(el); f.bedingungen.push({ typ: "fix", e: el.id }); neu.push(el);
  }
  status(neu.length ? `Projiziert: ${neu.length} Linienzug${neu.length === 1 ? "" : "züge"} (fixiert).` : "Die Kante steht senkrecht zur Skizzenebene – nichts zu projizieren.");
}
function abschliessenLinie() {
  if (skizze?.werkzeug === "linie" && skizze.pkt.length >= 2) erstelle([{ art: "linie", pts: skizze.pkt.slice(), geschlossen: false }], null, { hv: true });
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
function massAendern(m, wert) {
  if (!Number.isFinite(wert) || wert <= 0) return status("Bitte einen Wert grösser als 0 eingeben.");
  if (m.bed) {
    const b = m.bed, alt = b.w;
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
    } else { wert = Math.abs(w0) / RAD; fertig = (w) => (w < 180 ? { typ: "winkel", l1, l2, w: Math.sign(w0) * w * RAD } : null); }
  }
  massEingabe(sm[0] + "px", sm[1] + "px", wert, (w, typ) => {
    s.picks = [];
    if (!(w > 0)) return status("Bitte einen Wert grösser als 0 eingeben.");
    const b = fertig(w, typ); if (b) uebernimm(b); else status("Winkel kleiner als 180° eingeben.");
  }, optionen);
  zeichneLive();
}
// Eingabefeld für ein Mass an der Stelle left/top (CSS); ok(wert | null, option)
function massEingabe(left, top, wert, ok, optionen = null) {
  document.querySelectorAll(".massbox").forEach((b) => b.remove());
  const box = document.createElement("div"); box.className = "massbox"; box.style.left = left; box.style.top = top;
  box.innerHTML = `<input type="number" step="any" class="massfeld">` + (optionen ? `<select>${optionen.map(([k, t]) => `<option value="${k}">${t}</option>`).join("")}</select>` : "");
  $("ansicht").appendChild(box);
  const inp = box.querySelector("input"), sel = box.querySelector("select");
  inp.value = +(+wert).toFixed(3); inp.focus(); inp.select();
  sel?.addEventListener("change", () => { inp.value = +optionen.find((o) => o[0] === sel.value)[2].toFixed(3); inp.focus(); inp.select(); });
  let erledigt = false;
  const fertig = (an) => { if (erledigt) return; erledigt = true; box.remove(); if (an) ok(inp.value.trim() === "" ? null : parseFloat(inp.value), sel?.value); };
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
  const d = e.target.closest(".mass, .klickbar"); if (!d || !skizze) return;
  const l = labels[+d.dataset.i]; if (!l) return;
  if (l.glyph) { skizze.bsel = l.bed; skizze.sel = null; status(`${ABH_NAME[l.bed.typ]} gewählt – Entf löscht die Abhängigkeit.`); return zeichneLive(); }
  if (!l.edit) return;
  massEingabe(d.style.left, d.style.top, parseFloat(l.t.replace(/[^\d.\-]/g, "")), (w) => (w == null && l.edit.bed ? entferneBed(l.edit.bed) : massAendern(l.edit, w)));
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
    else if (el.art === "langloch") { if (frei("L:" + el.id + ":a:b")) lab(el.a, el.b, f1(abst(el.a, el.b)), ed && { el, art: "langL" }); if (frei("K:" + el.id)) lab(el.b, el.b, "B " + f1(el.r * 2), ed && { el, art: "langB" }, true); }
  }
  // Treibende Masse (fett, umrandet) und Symbole der Abhängigkeiten (anklicken → Entf löscht)
  const dim = (uv, t, b, w) => uv && labels.push({ p: zu3D(f.ebene, uv), t, edit: { bed: b }, bed: b, treibend: true, winkel: w });
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
  const box = $("labels");
  while (box.children.length < labels.length) box.appendChild(document.createElement("div"));
  [...box.children].forEach((d, i) => {
    const l = labels[i];
    if (!l) { d.hidden = true; return; }
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
leinwand.addEventListener("pointermove", (e) => {
  if (!skizze) return;
  if (skizze.zug) {
    const uv = planUV(e); if (!uv) return;
    const z = skizze.zug, rund = (v) => (e.shiftKey ? v : Math.round(v / einst.skizze.raster) * einst.skizze.raster);
    if (!z.bewegt) { const a = bildschirm(z.start), b = bildschirm(uv); if (Math.hypot(a[0] - b[0], a[1] - b[1]) < 4) return; }
    const ziel = z.punkt ? [{ ref: z.ziele[0].ref, uv: uv.map(rund) }]
      : z.kreis ? [{ r: z.kreis.id, wert: Math.max(rund(abst(z.kreis.c, uv)), einst.skizze.raster / 10) }]
      : z.ziele.map((q) => ({ ref: q.ref, uv: [q.uv0[0] + rund(uv[0] - z.start[0]), q.uv0[1] + rund(uv[1] - z.start[1])] }));
    const key = JSON.stringify(ziel); if (key === z.letzt) return;
    z.letzt = key; z.bewegt = true;
    loeseSkizze(skizze.f, { ziel }); zeichneLive();
    return;
  }
  const r = ebenenPunkt(e); if (!r) return;
  skizze.maus = r.uv; zeichneLive();
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
  if (uebernimmWahl(e)) return;
  strahl.setFromCamera(ndc(e), kamera);
  const treffer = strahl.intersectObjects(modell.children.filter((o) => o.isMesh), false)[0]; // Körper vor Ebenen
  const ebenenTreffer = strahl.intersectObjects(modell.children.filter((o) => o.userData.ebene), true).find((x) => x.object.isMesh);
  waehle(treffer ? treffer.object.userData.fid : ebenenTreffer ? ebenenTreffer.object.userData.ebene : null);
});
leinwand.addEventListener("dblclick", () => { if (skizze?.werkzeug === "linie") abschliessenLinie(); });
document.addEventListener("keydown", (e) => {
  if (!skizze) return;
  const imFeld = e.target.closest?.("#eingabe");
  if (e.key === "Escape" && (skizze.picks.length || skizze.bsel)) { skizze.picks = []; skizze.bsel = null; document.querySelectorAll(".massbox").forEach((b) => b.remove()); zeichneLive(); e.preventDefault(); return; }
  if (e.key === "Escape") { if (skizze.pkt.length || skizze.quelle) { abschliessenLinie(); skizze.pkt = []; skizze.quelle = null; zeichneLive(); } else if (skizze.werkzeug !== "auswahl") setzeWerkzeug("auswahl"); else { skizze.sel = null; zeichneLive(); } e.preventDefault(); return; }
  if ((e.key === "x" || e.key === "X") && skizze.sel && !e.target.closest?.("input,select")) { skizze.sel.hilfs = !skizze.sel.hilfs; status(skizze.sel.hilfs ? "Hilfslinie." : "Normale Linie."); zeichneLive(); e.preventDefault(); return; }
  if ((e.key === "Delete" || e.key === "Backspace") && skizze.bsel && !e.target.closest?.("input,select")) { entferneBed(skizze.bsel); e.preventDefault(); return; }
  if ((e.key === "Delete" || e.key === "Backspace") && skizze.sel && !e.target.closest?.("input,select")) {
    skizze.f.elemente.splice(skizze.f.elemente.indexOf(skizze.sel), 1); skizze.sel = null; bereinige(skizze.f); zeichneLive(); e.preventDefault(); return;
  }
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
    doc.features.push(e); id = e.id; regen();
  }
  const f = { id: neueId(), typ: "skizze", name: "Skizze " + (doc.features.filter((x) => x.typ === "skizze").length + 1), ebene: id, elemente: [] };
  doc.features.push(f); setTimeout(() => starteSkizze(f));
}
$("wSkizze").onclick = () => {
  if (dlg) $("dAbbrechen").click();
  const vor = finde(auswahl)?.typ === "ebene" && finde(auswahl)._ebene ? auswahl : einst.neu.ebene;
  dialog({ titel: "Skizze erstellen", sofort: true, felder: [{ id: "ebene", label: "Ebene", wahl: "ebene", optionen: ebenenOpt(null), wert: vor }],
    hinweis: "Ebene, Konstruktionsebene oder ebene Körperfläche in der Ansicht anklicken – oder in der Liste wählen und OK.",
    ok: (w) => neueSkizze(w.ebene) });
};
$("wExtrusion").onclick = () => { if (dlg) $("dAbbrechen").click(); extrusionDialog(); };
$("wBlech").onclick = () => { if (dlg) $("dAbbrechen").click(); blechDialog(); };
$("wVorlage").onclick = () => { if (dlg) $("dAbbrechen").click(); vorlageDialog(); };
$("wProfil").onclick = () => { if (dlg) $("dAbbrechen").click(); profilDialog(); };
$("wDetail").onclick = () => { if (dlg) $("dAbbrechen").click(); detailDialog(); };
// Konstruieren: Menü mit allen Ebenenarten
$("wEbene").onclick = (e) => {
  e.stopPropagation();
  const m = $("ebenenMenue");
  if (!m.hidden) { m.hidden = true; return; }
  m.innerHTML = Object.entries(EBENEN_ARTEN).filter(([k]) => k !== "flaeche").map(([k, t]) => `<button data-art="${k}"><b>${t}</b></button>`).join("");
  const r = $("wEbene").getBoundingClientRect();
  Object.assign(m.style, { left: Math.min(r.left, innerWidth - 330) + "px", top: r.bottom + 4 + "px" });
  m.hidden = false;
};
$("ebenenMenue").onclick = (e) => { const art = e.target.closest("button")?.dataset.art; if (!art) return; $("ebenenMenue").hidden = true; if (dlg) $("dAbbrechen").click(); ebeneDialog(art); };
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
$("skizzenMenue").onclick = (e) => { const w = e.target.closest("button")?.dataset.wz; if (!w) return; $("skizzenMenue").hidden = true; letzteVariante[WERKZEUGE[w].knopf] = w; abschliessenLinie(); setzeWerkzeug(w); };
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
}
function ladeProjekt(text, pfad = null) {
  try {
    const d = JSON.parse(text); if (!d.features) throw 0;
    doc = d; auswahl = null; projektPfad = pfad; titel(); merkeDatei(pfad); verlauf.stapel = []; verlauf.pos = -1;
    $("aObjekt").value = doc.objekt; $("aNr").value = doc.nr; regen();
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
  doc.features.splice(doc.features.indexOf(f), 1); auswahl = null; regen();
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
(function schleife() { steuerung.update(); richtungSkalieren(); renderer.render(szene, kamera); zeigeLabels(); requestAnimationFrame(schleife); })();
// Nur für automatische Tests (Adresse mit ?test): Bildschirmposition von Weltpunkten
if (new URLSearchParams(location.search).has("test")) window.sdcadTest = { aufSchirm: (p) => { const r = leinwand.getBoundingClientRect(), s = aufSchirm(p); return [r.left + s[0], r.top + s[1]]; } };
// PC-Programm: Update-Prüfung beim Start (abschaltbar in den Einstellungen)
if (pc && einst.programm.updates) pc.invoke("nach_update_suchen").catch(() => {}); // ohne Netz still weiter
// PC-Programm: per Doppelklick geöffnete .sdcad-Datei laden
pc?.invoke("startdatei").then((d) => d && ladeProjekt(d.inhalt, d.pfad)).catch((e) => status("Datei konnte nicht geöffnet werden: " + e));
// Web-Version: offline nutzbar machen (nicht im PC-Programm und nicht per Doppelklick)
if ("serviceWorker" in navigator && location.protocol.startsWith("http") && !("__TAURI_INTERNALS__" in window)) navigator.serviceWorker.register("sw.js").catch(() => {});
status("Beispiel geladen. Neu zeichnen: «Skizze» → Ebene wählen → Linienzug zeichnen → «Blechprofil».");
