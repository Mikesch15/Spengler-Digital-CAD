// Spengler Digital CAD 0.2 – Fusion-artige Oberfläche: Skizzen, Extrusion, Blechprofil, Vorlagen
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { berechne, kontur } from "../kern/geometrie.js";
import { VORLAGEN, VORLAGE, standardwerte, freiesProfil, alsZeilen } from "../kern/profile.js";
import { MATERIALIEN, LAGER, quelle, kFaktorAusProbe } from "../kern/materialien.js";
import { abwicklungDxf } from "../kern/dxf.js";
import { profilSvg } from "../kern/zeichnung.js";
import { stueckliste, stuecklisteCsv } from "../kern/auftrag.js";

const $ = (id) => document.getElementById(id);
const SPEICHER = "sdcad-doc-0.2";
const RASTER = 5; // mm

// ------------------------------------------------------------ Ebenen
const EBENEN = {
  XY: { name: "Vorne (XY)", u: [1, 0, 0], v: [0, 1, 0], n: [0, 0, 1] },
  XZ: { name: "Boden (XZ)", u: [1, 0, 0], v: [0, 0, -1], n: [0, 1, 0] },
  YZ: { name: "Seite (YZ)", u: [0, 0, -1], v: [0, 1, 0], n: [1, 0, 0] },
};
const V = (a) => new THREE.Vector3(a[0], a[1], a[2]);
const basis = (e) => new THREE.Matrix4().makeBasis(V(EBENEN[e].u), V(EBENEN[e].v), V(EBENEN[e].n));
const zu3D = (e, p) => V(EBENEN[e].u).multiplyScalar(p[0]).add(V(EBENEN[e].v).multiplyScalar(p[1]));

// ------------------------------------------------------------ Dokument
let doc = { features: [], zaehler: 1, objekt: "Muster, Bern", nr: "2026-001" };
try { const s = JSON.parse(localStorage.getItem(SPEICHER) || "null"); if (s?.features) doc = s; } catch {}
const speichern = () => { try { localStorage.setItem(SPEICHER, JSON.stringify(doc, (k, v) => (k.startsWith("_") ? undefined : v))); } catch {} };
const neueId = () => "f" + doc.zaehler++;
const finde = (id) => doc.features.find((f) => f.id === id);
// Werkstatt-Einstellungen (pro Gerät): kalibrierte und eigene Materialien, Lagerformate
const EINST = "sdcad-einstellungen";
const standardEinst = () => JSON.parse(JSON.stringify({ materialien: MATERIALIEN, ...LAGER }));
let einst = standardEinst();
try { const e = JSON.parse(localStorage.getItem(EINST) || "null"); if (e?.materialien?.length) einst = { ...einst, ...e }; } catch {}
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
function schleifen(f) {
  // geschlossene Profile als Punktlisten [u,v]
  const out = [];
  for (const el of f.elemente) {
    if (el.art === "rechteck") { const [a, b] = [el.a, el.b]; out.push([[a[0], a[1]], [b[0], a[1]], [b[0], b[1]], [a[0], b[1]]]); }
    else if (el.art === "kreis") out.push(Array.from({ length: 64 }, (_, i) => [el.c[0] + el.r * Math.cos(i * Math.PI / 32), el.c[1] + el.r * Math.sin(i * Math.PI / 32)]));
    else if (el.art === "linie" && el.geschlossen) out.push(el.pts.slice());
  }
  return out;
}
const ketten = (f) => f.elemente.filter((e) => e.art === "linie" && !e.geschlossen).map((e) => e.pts);
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
function blechAusKette(pts, m) {
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
      ops.push({ typ: "biegung", winkel: +d.toFixed(4), ri: null, modus: "sharp" });
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

function skizzenObjekt(f, farbe = 0x1f5fbf) {
  const g = new THREE.Group();
  const mat = new THREE.LineBasicMaterial({ color: farbe, depthTest: false });
  const linie = (pts, zu) => {
    const l = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts.concat(zu ? [pts[0]] : []).map((p) => zu3D(f.ebene, p))), mat);
    l.renderOrder = 10; g.add(l);
  };
  for (const el of f.elemente) {
    if (el.art === "linie") linie(el.pts, el.geschlossen);
    else if (el.art === "rechteck") linie([el.a, [el.b[0], el.a[1]], el.b, [el.a[0], el.b[1]]], true);
    else if (el.art === "kreis") linie(Array.from({ length: 72 }, (_, i) => [el.c[0] + el.r * Math.cos(i * Math.PI / 36), el.c[1] + el.r * Math.sin(i * Math.PI / 36)]), true);
  }
  return g;
}

// ------------------------------------------------------------ Neuaufbau (parametrisch, in Reihenfolge der Zeitleiste)
function regen() {
  leeren(modell);
  // Verwendete Materialien ins Projekt schreiben, damit es auf jedem Gerät gleich rechnet
  const benutzt = [...new Set(doc.features.map((f) => f.material).filter(Boolean))].map(material);
  doc.materialien = benutzt.filter((m, i) => benutzt.indexOf(m) === i);
  for (const f of doc.features) {
    f._fehler = null; f._res = null;
    try {
      if (f.typ === "skizze") {
        if (!f.versteckt && f !== skizze?.f) modell.add(skizzenObjekt(f));
      } else if (f.typ === "extrusion") {
        const s = finde(f.skizze); if (!s) throw new Error("Skizze fehlt");
        const fs = formen(s); if (!fs.length) throw new Error("Skizze hat kein geschlossenes Profil");
        if (!f.versteckt) modell.add(koerper(fs, s.ebene, f.abstand, f.richtung, 0x9aa5ad, f.id));
      } else if (f.typ === "blech") {
        const s = finde(f.skizze); if (!s) throw new Error("Skizze fehlt");
        const k = ketten(s)[f.kette || 0]; if (!k) throw new Error("Skizze hat keinen offenen Linienzug");
        const m = material(f.material);
        f._res = blechAusKette(k, m);
        if (!f.versteckt) modell.add(koerper([konturForm(f._res, m.t, k[0])], s.ebene, f.laenge, f.richtung, farbe(m), f.id));
      } else if (f.typ === "vorlage") {
        const m = material(f.material), v = VORLAGE[f.vorlage];
        const { start, ops } = v.bau(f.params, m);
        f._res = berechne(start, ops, m.t, m.ri, m.k);
        if (!f.versteckt) modell.add(koerper([konturForm(f._res, m.t)], f.ebene, f.laenge, f.richtung, farbe(m), f.id));
      } else if (f.typ === "profil") {
        const m = material(f.material);
        if (f.zeilen.some((z) => !(z.L > 0))) throw new Error("Jeder Schenkel braucht eine Länge grösser als 0");
        const { start, ops } = freiesProfil(f.start, f.zeilen, m);
        f._res = berechne(start, ops, m.t, m.ri, m.k);
        if (!f.versteckt) modell.add(koerper([konturForm(f._res, m.t)], f.ebene, f.laenge, f.richtung, farbe(m), f.id));
      }
    } catch (e) { f._fehler = e.message; }
  }
  markiere();
  zeigeBrowser(); zeigeZeit(); zeigeWerkstatt();
  speichern(); merke();
}

// ------------------------------------------------------------ Rückgängig / Wiederholen
// Nach jedem abgeschlossenen Schritt (nicht während Dialog oder Skizze) wird der Projektzustand gemerkt.
const verlauf = { stapel: [], pos: -1 };
const zustand = () => JSON.stringify(doc, (k, v) => (k.startsWith("_") ? undefined : v));
function merke() {
  if (dlg || skizze) return zeigeVerlauf();
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
  if (!finde(auswahl)) auswahl = null;
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
  modell.children.forEach((o) => { if (o.isMesh) o.material.emissive?.setHex(o.userData.fid === auswahl ? 0x1d5c4f : 0x000000); });
}

// ------------------------------------------------------------ Browser und Zeitleiste
const NAMEN = { skizze: "Skizze", extrusion: "Extrusion", blech: "Blechprofil", vorlage: "Vorlage", profil: "Freies Profil" };
function zeigeBrowser() {
  const sk = doc.features.filter((f) => f.typ === "skizze"), kp = doc.features.filter((f) => f.typ !== "skizze");
  const zeile = (f, typ) => `<li data-id="${f.id}" class="${f.id === auswahl ? "aktiv" : ""}"><span class="typ ${typ}"></span>${f.name}${f._fehler ? " ⚠" : ""}
    <button class="auge" data-auge="${f.id}" aria-label="${f.versteckt ? "Einblenden" : "Ausblenden"}">${f.versteckt ? "○" : "●"}</button></li>`;
  $("baum").innerHTML = `<li class="kopf">Skizzen</li>${sk.map((f) => zeile(f, "skizze")).join("") || '<li class="hinweis">Noch keine</li>'}
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

function waehle(id) { auswahl = id; markiere(); zeigeBrowser(); zeigeWerkstatt(); }

// ------------------------------------------------------------ Werkstatt
const f1 = (v) => v.toFixed(1);
let register = "teil"; // Werkstatt: «teil» oder «auftrag»
document.querySelectorAll("[data-register]").forEach((b) => (b.onclick = () => { register = b.dataset.register; zeigeWerkstatt(); }));
const blechteile = () => doc.features.filter((f) => f._res && !f.versteckt);
function auftrag() {
  return stueckliste(blechteile().map((f) => ({ name: f.name, material: material(f.material), zuschnitt: f._res.zuschnitt, laenge: f.laenge, stueck: f.stueck ?? 1 })));
}
const f2 = (v) => v.toFixed(2);
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
    <div class="reihe"><button class="knopf haupt" id="kAlleDruck">Stückliste und Werkstattblätter drucken</button><button class="knopf" id="kCsv">Stückliste als CSV</button></div>`;
  $("kAlleDruck").onclick = () => drucke(blechteile(), true);
  $("kCsv").onclick = () => herunterladen(`${doc.nr || "auftrag"} Stückliste.csv`, stuecklisteCsv(a, [["Objekt", doc.objekt], ["Nr.", doc.nr], []]), "text/csv");
}
function zeigeWerkstatt() {
  const f = finde(auswahl);
  const w = $("werkstatt");
  document.querySelectorAll("[data-register]").forEach((b) => b.setAttribute("aria-selected", b.dataset.register === register));
  if (register === "auftrag") return zeigeAuftrag(w);
  if (!f || !f._res) { w.innerHTML = `<p class="leer">${f ? (f._fehler || "Volumenkörper: keine Abwicklung.") : "Blechteil anklicken, um Zuschnitt und Abkantfolge zu sehen."}</p>`; return; }
  const r = f._res, m = material(f.material), q = quelle(r.zuschnitt, einst);
  w.innerHTML = `<div class="zahl"><b>${f1(r.zuschnitt)}</b><span>mm Zuschnitt</span></div>
    <div class="unter">${f.name} · ${r.biegungen.length} Biegungen${r.hatRundung ? "" : ` · Summe Schenkel ${r.summeSchenkel.toFixed(0)} mm`}</div>
    <div class="zeichnung">${profilSvg(r, { dicke: m.t, breite: 276, hoehe: 200, schrift: 11 })}</div>
    <div class="quelle">${q ? `Aus <b>${q.art} ${q.breite}${q.laenge ? " × " + q.laenge : ""} mm</b> · Rest ${f1(q.rest)} mm` : "Breiter als alle Lagerformate"}</div>
    <table class="liste"><thead><tr><th>Biegung</th><th class="num">Anschlag ab A</th><th class="num">Winkel</th><th>Richtung</th></tr></thead><tbody>
    ${r.biegungen.map((b) => `<tr><td><span class="bnr">B${b.nr}</span> ${b.art === "Abkanten" ? "" : b.art}</td><td class="num">${b.art === "Rundung" ? `${b.von.toFixed(0)}–${b.bis.toFixed(0)}` : f1(b.pos)}</td><td class="num">${f1(Math.abs(b.winkel))}°</td><td>${b.richtung}</td></tr>`).join("")}
    </tbody></table>
    <div class="reihe"><button class="knopf haupt" id="kListe">Abkantliste kopieren</button><button class="knopf" id="kDxf">DXF speichern</button><button class="knopf" id="kDruck">Werkstattblatt drucken</button>${f.typ === "vorlage" && alsZeilen(...Object.values(VORLAGE[f.vorlage].bau(f.params, m))) ? '<button class="knopf" id="kFrei">Als freies Profil bearbeiten</button>' : ""}</div>
    <dl class="etikett"><dt>Objekt</dt><dd>${esc(doc.objekt)}</dd><dt>Nr.</dt><dd>${esc(doc.nr)}</dd><dt>Teil</dt><dd>${esc(f.name)}</dd>
    <dt>Blech</dt><dd>${m.name.replace(/ [\d.]+$/, "")} ${m.t.toFixed(2)} mm</dd><dt>Mass</dt><dd>${f1(r.zuschnitt)} × ${f.laenge} mm · ${f.stueck ?? 1} Stk.</dd></dl>`;
  $("kListe").onclick = () => kopiere([`${doc.objekt} · Nr. ${doc.nr} · ${f.name}`, `${m.name} · Zuschnitt ${f1(r.zuschnitt)} × ${f.laenge} mm`, "",
    "Biegung\tAnschlag ab A (mm)\tWinkel\tRichtung", ...r.biegungen.map((b) => `B${b.nr}\t${f1(b.pos)}\t${f1(Math.abs(b.winkel))}\t${b.richtung}`)].join("\n"));
  $("kDxf").onclick = () => herunterladen(`${doc.nr} ${f.name}.dxf`, abwicklungDxf(r, f.laenge, f.name), "application/dxf");
  $("kDruck").onclick = () => drucke([f]);
  if ($("kFrei")) $("kFrei").onclick = () => { // Vorlage in Tabelle umwandeln, um Schenkel frei zu ergänzen
    const { start, zeilen } = alsZeilen(...Object.values(VORLAGE[f.vorlage].bau(f.params, m)));
    Object.assign(f, { typ: "profil", start, zeilen }); delete f.vorlage; delete f.params;
    regen(); profilDialog(f);
  };
}

// ------------------------------------------------------------ Druck: Werkstattblatt je Blechteil (A4)
function werkstattblatt(f) {
  const r = f._res, m = material(f.material), q = quelle(r.zuschnitt, einst);
  return `<section class="blatt">
    <header><div><small>Werkstattblatt</small><h1>${esc(f.name)}</h1></div>
      <dl><dt>Objekt</dt><dd>${esc(doc.objekt)}</dd><dt>Nr.</dt><dd>${esc(doc.nr)}</dd><dt>Datum</dt><dd>${new Date().toLocaleDateString("de-CH")}</dd></dl></header>
    <div class="eckdaten">
      <div><small>Zuschnitt</small><b>${f1(r.zuschnitt)} × ${f.laenge} mm</b></div>
      <div><small>Material</small><b>${esc(m.name)}</b></div>
      <div><small>Stück</small><b>${f.stueck ?? 1}</b></div>
      <div><small>Aus</small><b>${q ? `${q.art} ${q.breite}${q.laenge ? " × " + q.laenge : ""}` : "Sonderformat"}</b></div>
    </div>
    <div class="grosszeichnung">${profilSvg(r, { dicke: m.t, breite: 640, hoehe: 360, schrift: 14, rand: 44 })}</div>
    <table class="liste"><thead><tr><th>Biegung</th><th>Art</th><th class="num">Anschlag ab A (mm)</th><th class="num">Winkel</th><th>Richtung</th></tr></thead><tbody>
      ${r.biegungen.map((b) => `<tr><td><span class="bnr">B${b.nr}</span></td><td>${b.art}</td><td class="num">${b.art === "Rundung" ? `${b.von.toFixed(0)}–${b.bis.toFixed(0)}` : f1(b.pos)}</td><td class="num">${f1(Math.abs(b.winkel))}°</td><td>${b.richtung}</td></tr>`).join("")}
    </tbody></table>
    <p class="hinweis">Masse in mm auf der Blechmitte. Anschlag ab Kante A (grüner Punkt). Richtung «oben/unten» mit Kante A links.
      Innenradius ${m.ri} mm, K-Faktor ${m.k}.</p>
    <dl class="etikett"><dt>Objekt</dt><dd>${esc(doc.objekt)}</dd><dt>Nr.</dt><dd>${esc(doc.nr)}</dd><dt>Teil</dt><dd>${esc(f.name)}</dd>
      <dt>Blech</dt><dd>${esc(m.name)}</dd><dt>Mass</dt><dd>${f1(r.zuschnitt)} × ${f.laenge} mm · ${f.stueck ?? 1} Stk.</dd></dl>
  </section>`;
}
function stuecklisteBlatt() {
  const a = auftrag();
  return `<section class="blatt">
    <header><div><small>Stückliste</small><h1>${esc(doc.objekt)}</h1></div>
      <dl><dt>Nr.</dt><dd>${esc(doc.nr)}</dd><dt>Datum</dt><dd>${new Date().toLocaleDateString("de-CH")}</dd></dl></header>
    <table class="liste"><thead><tr><th>Teil</th><th>Material</th><th class="num">Zuschnitt × Länge mm</th><th class="num">Stück</th><th class="num">m²</th><th class="num">kg</th></tr></thead><tbody>
    ${a.zeilen.map((z) => `<tr><td>${esc(z.name)}</td><td>${esc(z.material)}</td><td class="num">${f1(z.zuschnitt)} × ${z.laenge}</td><td class="num">${z.stueck}</td><td class="num">${f2(z.flaeche)}</td><td class="num">${z.gewicht.toFixed(1)}</td></tr>`).join("")}
    </tbody></table>
    <table class="liste"><thead><tr><th>Summe je Material</th><th class="num">Stück</th><th class="num">Laufmeter</th><th class="num">m²</th><th class="num">kg</th></tr></thead><tbody>
    ${a.jeMaterial.map((m) => `<tr><td>${esc(m.material)}</td><td class="num">${m.stueck}</td><td class="num">${m.laufmeter.toFixed(1)}</td><td class="num">${f2(m.flaeche)}</td><td class="num">${m.gewicht.toFixed(1)}</td></tr>`).join("")}
    <tr><td><b>Total</b></td><td class="num"><b>${a.summe.stueck}</b></td><td></td><td class="num"><b>${f2(a.summe.flaeche)}</b></td><td class="num"><b>${a.summe.gewicht.toFixed(1)}</b></td></tr>
    </tbody></table>
  </section>`;
}
function drucke(teile, mitListe = false) {
  teile = teile.filter((f) => f._res);
  if (!teile.length) return status("Keine Blechteile zum Drucken.");
  $("druck").innerHTML = (mitListe ? stuecklisteBlatt() : "") + teile.map(werkstattblatt).join("");
  window.print();
}
const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
for (const [id, k] of [["aObjekt", "objekt"], ["aNr", "nr"]]) { $(id).value = doc[k]; $(id).addEventListener("input", (e) => { doc[k] = e.target.value; speichern(); zeigeWerkstatt(); }); }

function status(t) { $("status").textContent = t; }
async function kopiere(text) {
  try { await navigator.clipboard.writeText(text); status("In die Zwischenablage kopiert."); } catch { status("Kopieren wird hier nicht unterstützt."); }
}
// ------------------------------------------------------------ Dateien
// Im PC-Programm (Tauri) mit echtem Speichern-/Öffnen-Dialog, im Browser als Download bzw. Dateiauswahl.
const pc = window.__TAURI__?.core;
const DATEITYPEN = { sdcad: "Spengler-Digital-CAD-Projekt", dxf: "DXF-Zeichnung", csv: "CSV-Tabelle" };
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
  $("dLoeschen").hidden = !opt.loeschen;
  $("dInhalt").innerHTML = opt.felder.map((fd) => {
    const inp = fd.optionen
      ? `<select id="d_${fd.id}">${fd.optionen.map(([w, t]) => `<option value="${w}" ${String(w) === String(fd.wert) ? "selected" : ""}>${esc(t)}</option>`).join("")}</select>`
      : fd.text ? `<input id="d_${fd.id}" type="text" value="${esc(fd.wert)}">`
      : `<input id="d_${fd.id}" type="number" step="any" inputmode="decimal" value="${fd.wert}">`;
    return `<div class="feld"><label for="d_${fd.id}">${fd.label}${fd.einheit ? ` (${fd.einheit})` : ""}</label>${inp}</div>`;
  }).join("") + (opt.zusatz ? `<div id="dZusatz">${opt.zusatz()}</div>` : "") + (opt.hinweis ? `<p class="hinweis">${opt.hinweis}</p>` : "");
  $("dialog").hidden = false;
  opt.felder.forEach((fd) => $("d_" + fd.id).addEventListener(fd.optionen ? "change" : "input", () => opt.aendern?.(werte(), fd.id)));
  opt.binden?.($("dZusatz"));
}
const werte = () => Object.fromEntries(dlg.felder.map((fd) => { const v = $("d_" + fd.id).value; return [fd.id, fd.optionen || fd.text ? v : parseFloat(v)]; }));
function schliesse() { $("dialog").hidden = true; dlg = null; }
$("dOk").onclick = () => { dlg?.ok?.(werte()); schliesse(); regen(); };
$("dAbbrechen").onclick = () => { dlg?.abbrechen?.(); schliesse(); regen(); };
$("dLoeschen").onclick = () => { dlg?.loeschen?.(); schliesse(); regen(); };

// Neue oder bestehende Features mit Live-Vorschau. felder(f) liefert die Felder, setze(f, w) übernimmt Werte.
function featureDialog(f, istNeu, felder, setze, titel, hinweis, extra = {}) {
  const kopie = JSON.parse(JSON.stringify(f)), alteAuswahl = auswahl;
  if (istNeu) doc.features.push(f);
  auswahl = f.id; // Werkstatt zeigt das Teil schon während der Eingabe
  dialog({
    titel, hinweis, felder: felder(f), ...extra,
    aendern: (w, feld) => {
      setze(f, w);
      if (feld === "vorlage" || feld === "skizze") { const d = dlg; dialog({ ...d, felder: felder(f) }); setze(f, werte()); }
      regen();
    },
    ok: (w) => { setze(f, w); auswahl = f.id; },
    abbrechen: () => { if (istNeu) { doc.features.splice(doc.features.indexOf(f), 1); auswahl = alteAuswahl; } else Object.assign(f, kopie); },
    loeschen: istNeu ? null : () => { doc.features.splice(doc.features.indexOf(f), 1); auswahl = null; },
  });
  setze(f, werte()); regen();
}
const RICHTUNGEN = [["eine", "Eine Seite"], ["umgekehrt", "Umgekehrt"], ["symmetrisch", "Symmetrisch"]];

function bearbeite(f) {
  if (!f || skizze) return;
  if (dlg) $("dAbbrechen").click();
  waehle(f.id);
  if (f.typ === "skizze") return starteSkizze(f);
  if (f.typ === "extrusion") return extrusionDialog(f);
  if (f.typ === "blech") return blechDialog(f);
  if (f.typ === "vorlage") return vorlageDialog(f);
  if (f.typ === "profil") return profilDialog(f);
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
  if (!sk.length) return status("Zuerst eine Skizze mit offenem Linienzug zeichnen: das Blechprofil auf der Blechmitte.");
  f ||= { id: neueId(), typ: "blech", name: "Blechprofil " + (doc.features.filter((x) => x.typ === "blech").length + 1), skizze: sk.at(-1).id, kette: 0, material: einst.materialien[0].id, laenge: 1000, richtung: "eine" };
  featureDialog(f, istNeu, (f) => [
    { id: "skizze", label: "Linienzug aus", optionen: sk.map((s) => [s.id, s.name]), wert: f.skizze },
    { id: "kette", label: "Linienzug", optionen: Array.from({ length: ketten(finde(f.skizze) || sk.at(-1)).length }, (_, i) => [i, `Nr. ${i + 1}`]), wert: f.kette },
    { id: "material", label: "Material", optionen: matOpt(), wert: f.material },
    { id: "laenge", label: "Länge", einheit: "mm", wert: f.laenge },
    { id: "stueck", label: "Stück", wert: f.stueck ?? 1 },
    { id: "richtung", label: "Richtung", optionen: RICHTUNGEN, wert: f.richtung },
  ], (f, w) => Object.assign(f, w, { kette: Math.min(+w.kette || 0, ketten(finde(w.skizze)).length - 1) }), "Blechprofil", "Der Linienzug ist die Blechmitte. Jeder Knick wird zur Biegung mit dem Innenradius des Materials.");
}

function vorlageDialog(f) {
  const istNeu = !f;
  f ||= { id: neueId(), typ: "vorlage", name: VORLAGEN[0].name, vorlage: VORLAGEN[0].id, params: standardwerte(VORLAGEN[0].id), material: einst.materialien[0].id, laenge: 1000, richtung: "eine", ebene: "XY" };
  const felder = (f) => [
    { id: "vorlage", label: "Vorlage", optionen: VORLAGEN.map((x) => [x.id, x.name]), wert: f.vorlage },
    ...VORLAGE[f.vorlage].params.map(([k, l, e]) => ({ id: "p_" + k, label: l, einheit: e, wert: f.params[k] })),
    { id: "material", label: "Material", optionen: matOpt(), wert: f.material },
    { id: "laenge", label: "Länge", einheit: "mm", wert: f.laenge },
    { id: "stueck", label: "Stück", wert: f.stueck ?? 1 },
    { id: "ebene", label: "Querschnitt in", optionen: Object.entries(EBENEN).map(([k, e]) => [k, e.name]), wert: f.ebene },
  ];
  const setze = (f, w) => {
    if (w.vorlage !== f.vorlage) { f.vorlage = w.vorlage; f.params = standardwerte(w.vorlage); f.name = VORLAGE[w.vorlage].name; return; }
    for (const [k] of VORLAGE[f.vorlage].params) if (Number.isFinite(w["p_" + k])) f.params[k] = w["p_" + k];
    Object.assign(f, { material: w.material, laenge: w.laenge, stueck: w.stueck, ebene: w.ebene });
  };
  featureDialog(f, istNeu, felder, setze, "Spengler-Vorlage");
}

// Freies Profil: Schenkel als Tabelle, Winkel jeweils nach dem Schenkel
const EBENEN_OPT = Object.entries(EBENEN).map(([k, e]) => [k, e.name]);
function profilDialog(f) {
  const istNeu = !f;
  f ||= { id: neueId(), typ: "profil", name: "Profil " + (doc.features.filter((x) => x.typ === "profil").length + 1), start: 0,
    zeilen: [{ L: 100, winkel: 90, art: "abkanten" }, { L: 50, winkel: 0, art: "abkanten" }], material: einst.materialien[0].id, laenge: 1000, richtung: "eine", ebene: "XY" };
  const felder = (f) => [
    { id: "name", label: "Name", text: true, wert: f.name },
    { id: "start", label: "Startwinkel", einheit: "°", wert: f.start },
    { id: "material", label: "Material", optionen: matOpt(), wert: f.material },
    { id: "laenge", label: "Länge", einheit: "mm", wert: f.laenge },
    { id: "stueck", label: "Stück", wert: f.stueck ?? 1 },
    { id: "ebene", label: "Querschnitt in", optionen: EBENEN_OPT, wert: f.ebene },
  ];
  const setze = (f, w) => { Object.assign(f, w, { name: w.name.trim() || f.name, start: Number.isFinite(w.start) ? w.start : 0 }); };
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
    { zusatz: tabelle, binden });
}

// ------------------------------------------------------------ Einstellungen: Materialien kalibrieren, Lagerformate
let entwurf = null; // Arbeitskopie, erst «Übernehmen» speichert
const probeWerte = { mat: 0, z: 130, a: "", b: "" };
const meldung = (t) => { $("eMeldung").textContent = t; };
const zahlen = (t) => String(t).split(/[\s,;]+/).map(parseFloat).filter((v) => v > 0);
function zeigeEinst() {
  const e = entwurf, feld = (i, k, wert, schritt = "any") => `<input data-i="${i}" data-k="${k}" type="${k === "name" ? "text" : "number"}" step="${schritt}" inputmode="decimal" value="${esc(wert)}">`;
  $("eInhalt").innerHTML = `
    <h4>Materialien</h4>
    <div class="tabwrap"><table class="zeilen mat"><thead><tr><th>Name</th><th>Dicke mm</th><th>Innenradius mm</th><th>K-Faktor</th><th>Dichte kg/dm³</th><th></th></tr></thead><tbody>
    ${e.materialien.map((m, i) => `<tr><td>${feld(i, "name", m.name)}</td><td>${feld(i, "t", m.t)}</td><td>${feld(i, "ri", m.ri)}</td><td>${feld(i, "k", m.k)}</td><td>${feld(i, "dichte", m.dichte ?? "")}</td>
      <td>${e.materialien.length > 1 ? `<button class="weg" data-weg="${i}" aria-label="${esc(m.name)} entfernen">×</button>` : ""}</td></tr>`).join("")}
    </tbody></table></div>
    <button class="knopf" id="eNeuMat">+ Material</button>
    <h4>K-Faktor aus Probebiegung</h4>
    <p class="hinweis">Streifen zuschneiden, genau eine 90°-Biegung an der eigenen Abkantbank, dann beide Schenkel aussen messen.</p>
    <div class="probe">
      <label>Material <select id="pMat">${e.materialien.map((m, i) => `<option value="${i}" ${i === probeWerte.mat ? "selected" : ""}>${esc(m.name)}</option>`).join("")}</select></label>
      <label>Zuschnitt mm <input id="pZ" type="number" step="any" inputmode="decimal" value="${probeWerte.z}"></label>
      <label>Schenkel a aussen <input id="pA" type="number" step="any" inputmode="decimal" value="${probeWerte.a}"></label>
      <label>Schenkel b aussen <input id="pB" type="number" step="any" inputmode="decimal" value="${probeWerte.b}"></label>
    </div>
    <p id="pErgebnis" class="hinweis">a und b eingeben.</p>
    <h4>Lagerformate</h4>
    <div class="probe">
      <label>Spaltbänder mm <input id="lBand" type="text" value="${e.spaltbaender.join(", ")}"></label>
      <label>Coil-Breite mm <input id="lCoil" type="number" step="any" value="${e.coil}"></label>
      <label>Tafeln B×L mm <input id="lTafeln" type="text" value="${e.tafeln.map(([b, l]) => `${b}×${l}`).join(", ")}"></label>
    </div>`;
  probe();
}
function probe() {
  Object.assign(probeWerte, { mat: Math.min(+$("pMat").value, entwurf.materialien.length - 1), z: $("pZ").value, a: $("pA").value, b: $("pB").value });
  const m = entwurf.materialien[probeWerte.mat], z = parseFloat(probeWerte.z), a = parseFloat(probeWerte.a), b = parseFloat(probeWerte.b);
  if (!(z > 0 && a > 0 && b > 0)) { $("pErgebnis").textContent = "Zuschnitt, a und b eingeben."; return; }
  const k = kFaktorAusProbe({ zuschnitt: z, a, b, t: m.t, ri: m.ri });
  const plausibel = k > 0.1 && k < 0.6;
  $("pErgebnis").innerHTML = `K-Faktor für ${esc(m.name)}: <b>${k.toFixed(3)}</b>${plausibel ? ` <button class="knopf" id="pUebernehmen">Übernehmen</button>` : " – unplausibel, Masse prüfen (üblich 0.3–0.5)."}`;
  if (plausibel) $("pUebernehmen").onclick = () => { m.k = +k.toFixed(3); zeigeEinst(); meldung(`K-Faktor ${m.k} bei ${m.name} eingetragen – mit «Übernehmen» speichern.`); };
}
$("eInhalt").addEventListener("input", (ev) => {
  const t = ev.target;
  if (t.dataset.k) { const m = entwurf.materialien[+t.dataset.i]; m[t.dataset.k] = t.dataset.k === "name" ? t.value : parseFloat(t.value); }
  else if (t.id === "lBand") entwurf.spaltbaender = zahlen(t.value);
  else if (t.id === "lCoil") entwurf.coil = parseFloat(t.value) || 0;
  else if (t.id === "lTafeln") entwurf.tafeln = t.value.split(/[,;]+/).map((x) => zahlen(x.replace(/[x×*]/gi, " "))).filter((x) => x.length === 2);
  if (["pMat", "pZ", "pA", "pB"].includes(t.id)) probe();
});
$("eInhalt").addEventListener("change", (ev) => { if (ev.target.id === "pMat") probe(); });
$("eInhalt").addEventListener("click", (ev) => {
  if (ev.target.dataset.weg != null) { entwurf.materialien.splice(+ev.target.dataset.weg, 1); zeigeEinst(); }
  else if (ev.target.id === "eNeuMat") {
    const v = entwurf.materialien.at(-1);
    entwurf.materialien.push({ ...v, id: "eigen" + Date.now().toString(36), name: v.name + " (Kopie)" }); zeigeEinst();
    $("eInhalt").querySelector(`tr:nth-child(${entwurf.materialien.length}) input`)?.focus();
  }
});
$("wEinst").onclick = () => { if (dlg) $("dAbbrechen").click(); entwurf = JSON.parse(JSON.stringify(einst)); meldung(""); zeigeEinst(); $("einst").hidden = false; };
$("eAbbrechen").onclick = () => { $("einst").hidden = true; entwurf = null; };
$("eStandard").onclick = () => { entwurf = standardEinst(); zeigeEinst(); meldung("Standardwerte geladen – mit «Übernehmen» speichern."); };
$("eOk").onclick = () => {
  const falsch = entwurf.materialien.find((m) => !m.name.trim() || !(m.t > 0) || !(m.ri >= 0) || !(m.k > 0 && m.k < 1));
  if (falsch) return meldung(`Material «${falsch.name || "ohne Namen"}»: Dicke > 0, Innenradius ≥ 0 und K-Faktor zwischen 0 und 1 nötig.`);
  einst = entwurf; entwurf = null; $("einst").hidden = true;
  try { localStorage.setItem(EINST, JSON.stringify(einst)); } catch {}
  regen(); status("Einstellungen gespeichert. Alle Teile neu berechnet.");
};

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
let skizze = null; // { f, werkzeug, pkt: [] Klickpunkte des laufenden Elements, maus: [u,v] }
function setzeWerkzeug(w) {
  if (!skizze) return;
  skizze.werkzeug = w; skizze.pkt = [];
  ["Auswahl", "Linie", "Rechteck", "Kreis"].forEach((n) => $("t" + n).setAttribute("aria-pressed", w === n.toLowerCase()));
  $("eingabe").hidden = true;
  status({ auswahl: "Auswahl: Punkte ziehen, Mass anklicken zum Ändern, Element anklicken und mit Entf löschen.", linie: "Linie: Punkte anklicken. Länge eintippen und Enter für genaue Masse. Doppelklick oder Esc beendet, Klick auf Startpunkt schliesst.",
    rechteck: "Rechteck: zwei Ecken anklicken oder Breite/Höhe eintippen.", kreis: "Kreis: Mittelpunkt, dann Radius anklicken oder Durchmesser eintippen." }[w]);
  zeichneLive();
}
function starteSkizze(f) {
  skizze = { f, werkzeug: "linie", pkt: [], maus: null, sel: null, zug: null };
  $("gSkizze").hidden = false;
  ["wSkizze", "wExtrusion", "wBlech", "wVorlage", "wProfil"].forEach((id) => ($(id).disabled = true));
  steuerung.mouseButtons = { LEFT: null, MIDDLE: THREE.MOUSE.PAN, RIGHT: THREE.MOUSE.ROTATE };
  steuerung.touches = { ONE: null, TWO: THREE.TOUCH.DOLLY_PAN };
  const E = EBENEN[f.ebene];
  skizzenRaster = new THREE.GridHelper(2000, 400, 0x1f5fbf, 0x9db7dd);
  skizzenRaster.material.transparent = true; skizzenRaster.material.opacity = 0.25; skizzenRaster.material.depthWrite = false;
  skizzenRaster.applyMatrix4(new THREE.Matrix4().makeBasis(V(E.u), V(E.n), V(E.v).negate()));
  szene.add(skizzenRaster); boden.visible = false;
  kamera.position.copy(steuerung.target.clone().add(V(E.n)).add(new THREE.Vector3(0, 0, f.ebene === "XZ" ? 0.001 : 0)));
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
  ["wSkizze", "wExtrusion", "wBlech", "wVorlage", "wProfil"].forEach((id) => ($(id).disabled = false));
  steuerung.mouseButtons = { LEFT: THREE.MOUSE.ROTATE, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.PAN };
  steuerung.touches = { ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_PAN };
  szene.remove(skizzenRaster); skizzenRaster = null; boden.visible = true;
  $("eingabe").hidden = true; leeren(live); labels = [];
  status(f.elemente.length ? "Skizze fertig. Jetzt «Extrudieren» (geschlossene Profile) oder «Blechprofil» (offener Linienzug)." : "");
  regen();
}

// Punkt auf der Skizzenebene unter dem Mauszeiger, mit Fang
const strahl = new THREE.Raycaster();
function ndc(e) { const r = leinwand.getBoundingClientRect(); return new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1); }
function bildschirm(p) { const v = zu3D(skizze.f.ebene, p).project(kamera), r = leinwand.getBoundingClientRect(); return [(v.x + 1) / 2 * r.width, (1 - v.y) / 2 * r.height]; }
function fangPunkte() {
  const pts = [[0, 0]];
  for (const el of skizze.f.elemente) {
    if (el.art === "linie") pts.push(...el.pts);
    else if (el.art === "rechteck") pts.push(el.a, el.b, [el.a[0], el.b[1]], [el.b[0], el.a[1]]);
    else pts.push(el.c);
  }
  return pts.concat(skizze.pkt);
}
function ebenenPunkt(e) {
  strahl.setFromCamera(ndc(e), kamera);
  const E = EBENEN[skizze.f.ebene];
  const p = strahl.ray.intersectPlane(new THREE.Plane(V(E.n), 0), new THREE.Vector3());
  if (!p) return null;
  let uv = [p.dot(V(E.u)), p.dot(V(E.v))];
  const r = leinwand.getBoundingClientRect(), sm = [e.clientX - r.left, e.clientY - r.top];
  for (const q of fangPunkte()) { const s = bildschirm(q); if (Math.hypot(s[0] - sm[0], s[1] - sm[1]) < 10) return { uv: q.slice(), fang: true }; }
  if (!e.shiftKey) uv = uv.map((x) => Math.round(x / RASTER) * RASTER);
  const letzt = skizze.pkt.at(-1);
  if (letzt) { // waagrecht / senkrecht ausrichten
    const sl = bildschirm(letzt);
    if (Math.abs(bildschirm([letzt[0], uv[1]])[0] - sm[0]) < 8 && Math.abs(sl[0] - sm[0]) < 8) uv[0] = letzt[0];
    if (Math.abs(sl[1] - sm[1]) < 8) uv[1] = letzt[1];
  }
  return { uv };
}

function klick(uv, fang) {
  const s = skizze, el = s.f.elemente;
  if (s.werkzeug === "linie") {
    const erster = s.pkt[0];
    if (erster && s.pkt.length >= 3 && fang && uv[0] === erster[0] && uv[1] === erster[1]) {
      el.push({ art: "linie", pts: s.pkt.slice(), geschlossen: true }); s.pkt = [];
    } else if (!s.pkt.length || Math.hypot(uv[0] - s.pkt.at(-1)[0], uv[1] - s.pkt.at(-1)[1]) > 1e-6) s.pkt.push(uv);
  } else if (s.werkzeug === "rechteck") {
    if (!s.pkt.length) s.pkt.push(uv);
    else { const a = s.pkt[0]; if (a[0] !== uv[0] && a[1] !== uv[1]) el.push({ art: "rechteck", a: [Math.min(a[0], uv[0]), Math.min(a[1], uv[1])], b: [Math.max(a[0], uv[0]), Math.max(a[1], uv[1])] }); s.pkt = []; }
  } else if (s.werkzeug === "kreis") {
    if (!s.pkt.length) s.pkt.push(uv);
    else { const r = Math.hypot(uv[0] - s.pkt[0][0], uv[1] - s.pkt[0][1]); if (r > 0) el.push({ art: "kreis", c: s.pkt[0], r }); s.pkt = []; }
  }
  $("eLaenge").value = ""; $("eWinkel").value = "";
  zeichneLive();
}
function abschliessenLinie() {
  if (skizze?.werkzeug === "linie" && skizze.pkt.length >= 2) skizze.f.elemente.push({ art: "linie", pts: skizze.pkt.slice(), geschlossen: false });
  if (skizze) skizze.pkt = [];
  zeichneLive();
}
// Getippte Masse anwenden
function eingabeAnwenden() {
  const s = skizze; if (!s?.pkt.length) return;
  const a = parseFloat($("eLaenge").value), b = parseFloat($("eWinkel").value), p = s.pkt.at(-1), m = s.maus || p;
  if (s.werkzeug === "linie" && a > 0) {
    const w = Number.isFinite(b) ? (b * Math.PI) / 180 : Math.atan2(m[1] - p[1], m[0] - p[0]);
    klick([+(p[0] + a * Math.cos(w)).toFixed(4), +(p[1] + a * Math.sin(w)).toFixed(4)]);
  } else if (s.werkzeug === "rechteck" && a > 0 && b > 0) {
    klick([p[0] + a * (m[0] >= p[0] ? 1 : -1), p[1] + b * (m[1] >= p[1] ? 1 : -1)]);
  } else if (s.werkzeug === "kreis" && a > 0) klick([p[0] + a / 2, p[1]]);
}

// ------------------------------------------------------------ Bemassung und Auswahl
const gleich = (a, b) => Math.abs(a[0] - b[0]) < 1e-6 && Math.abs(a[1] - b[1]) < 1e-6;
const drehung = (pts, i) => { // vorzeichenbehafteter Knickwinkel am Punkt i (Grad)
  const n = pts.length, a = pts[(i - 1 + n) % n], b = pts[i], c = pts[(i + 1) % n];
  let d = Math.atan2(c[1] - b[1], c[0] - b[0]) - Math.atan2(b[1] - a[1], b[0] - a[0]);
  while (d > Math.PI) d -= 2 * Math.PI; while (d <= -Math.PI) d += 2 * Math.PI;
  return (d * 180) / Math.PI;
};
function massAendern(m, wert) {
  const el = m.el;
  if (!Number.isFinite(wert) || wert <= 0) return status("Bitte einen Wert grösser als 0 eingeben.");
  if (m.art === "laenge") {
    const n = el.pts.length, i = m.i, j = (i + 1) % n, p = el.pts[i], q = el.pts[j];
    const L = Math.hypot(q[0] - p[0], q[1] - p[1]); if (!L) return;
    const d = [((q[0] - p[0]) / L) * (wert - L), ((q[1] - p[1]) / L) * (wert - L)];
    if (el.geschlossen && j === 0) el.pts[i] = [p[0] - d[0], p[1] - d[1]];
    else for (let k = j; k < n; k++) el.pts[k] = [el.pts[k][0] + d[0], el.pts[k][1] + d[1]];
  } else if (m.art === "winkel") {
    const cur = drehung(el.pts, m.i), neu = (cur < 0 ? -1 : 1) * wert, r = ((neu - cur) * Math.PI) / 180, z = el.pts[m.i];
    const c = Math.cos(r), sn = Math.sin(r);
    for (let k = m.i + 1; k < el.pts.length; k++) { const dx = el.pts[k][0] - z[0], dy = el.pts[k][1] - z[1]; el.pts[k] = [z[0] + dx * c - dy * sn, z[1] + dx * sn + dy * c]; }
  } else if (m.art === "breite") el.b[0] = el.a[0] + wert;
  else if (m.art === "hoehe") el.b[1] = el.a[1] + wert;
  else if (m.art === "durchmesser") el.r = wert / 2;
  zeichneLive();
}
function verschiebePunkt(q, uv) {
  for (const el of skizze.f.elemente) {
    if (el.art === "linie") el.pts = el.pts.map((p) => (gleich(p, q) ? uv.slice() : p));
    else if (el.art === "kreis") { if (gleich(el.c, q)) el.c = uv.slice(); }
    else {
      if (gleich(el.a, q)) el.a = uv.slice(); else if (gleich(el.b, q)) el.b = uv.slice();
      else if (gleich([el.a[0], el.b[1]], q)) { el.a = [uv[0], el.a[1]]; el.b = [el.b[0], uv[1]]; }
      else if (gleich([el.b[0], el.a[1]], q)) { el.b = [uv[0], el.b[1]]; el.a = [el.a[0], uv[1]]; }
    }
  }
}
function ordneRechtecke() {
  for (const el of skizze.f.elemente) if (el.art === "rechteck") { const a = el.a, b = el.b; el.a = [Math.min(a[0], b[0]), Math.min(a[1], b[1])]; el.b = [Math.max(a[0], b[0]), Math.max(a[1], b[1])]; }
}
function segmente(el) {
  if (el.art === "linie") return el.pts.map((p, i) => [p, el.pts[i + 1] || (el.geschlossen ? el.pts[0] : null)]).filter((x) => x[1]);
  if (el.art === "rechteck") { const c = [el.a, [el.b[0], el.a[1]], el.b, [el.a[0], el.b[1]]]; return c.map((p, i) => [p, c[(i + 1) % 4]]); }
  const k = Array.from({ length: 48 }, (_, i) => [el.c[0] + el.r * Math.cos(i * Math.PI / 24), el.c[1] + el.r * Math.sin(i * Math.PI / 24)]);
  return k.map((p, i) => [p, k[(i + 1) % 48]]);
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
function trefferPunkt(sm) {
  for (const el of skizze.f.elemente) {
    const pts = el.art === "linie" ? el.pts : el.art === "kreis" ? [el.c] : [el.a, el.b, [el.a[0], el.b[1]], [el.b[0], el.a[1]]];
    for (const p of pts) { const s = bildschirm(p); if (Math.hypot(s[0] - sm[0], s[1] - sm[1]) < 10) return p.slice(); }
  }
  return null;
}
// Mass anklicken: Eingabefeld über dem Mass
$("labels").addEventListener("click", (e) => {
  const d = e.target.closest(".mass"); if (!d || !skizze) return;
  const l = labels[+d.dataset.i]; if (!l?.edit) return;
  const inp = document.createElement("input");
  inp.type = "number"; inp.step = "any"; inp.className = "massfeld"; inp.value = parseFloat(l.t.replace(/[^\d.\-]/g, ""));
  inp.style.left = d.style.left; inp.style.top = d.style.top;
  $("ansicht").appendChild(inp); inp.focus(); inp.select();
  const fertig = (ok) => { if (ok) massAendern(l.edit, parseFloat(inp.value)); inp.remove(); };
  inp.addEventListener("keydown", (ev) => { ev.stopPropagation(); if (ev.key === "Enter") fertig(true); if (ev.key === "Escape") fertig(false); });
  inp.addEventListener("blur", () => fertig(false));
});

let labels = [];
function zeichneLive() {
  leeren(live); labels = [];
  if (!skizze) return;
  const f = skizze.f, s = skizze;
  live.add(skizzenObjekt(f, 0x1f5fbf));
  const temp = { ebene: f.ebene, elemente: [] };
  const m = s.maus;
  if (s.pkt.length && m) {
    if (s.werkzeug === "linie") temp.elemente.push({ art: "linie", pts: [...s.pkt, m] });
    if (s.werkzeug === "rechteck") temp.elemente.push({ art: "rechteck", a: s.pkt[0], b: m });
    if (s.werkzeug === "kreis") temp.elemente.push({ art: "kreis", c: s.pkt[0], r: Math.hypot(m[0] - s.pkt[0][0], m[1] - s.pkt[0][1]) || 0.001 });
  } else if (s.pkt.length > 1) temp.elemente.push({ art: "linie", pts: s.pkt });
  live.add(skizzenObjekt(temp, 0xe0782b));
  // Punkte
  const pts = fangPunkte().concat(m ? [m] : []);
  const pg = new THREE.BufferGeometry().setFromPoints(pts.map((p) => zu3D(f.ebene, p)));
  const pk = new THREE.Points(pg, new THREE.PointsMaterial({ color: 0x1f5fbf, size: 6, sizeAttenuation: false, depthTest: false })); pk.renderOrder = 11; live.add(pk);
  // Masse
  if (s.sel && f.elemente.includes(s.sel)) live.add(skizzenObjekt({ ebene: f.ebene, elemente: [s.sel] }, 0xe0782b));
  const lab = (a, b, txt, edit, winkel) => labels.push({ p: zu3D(f.ebene, [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]), t: txt, edit, winkel });
  const fest = new Set(f.elemente);
  for (const el of [...f.elemente, ...temp.elemente]) {
    const ed = fest.has(el);
    if (el.art === "linie") {
      el.pts.forEach((p, i) => { const q = el.pts[i + 1] || (el.geschlossen ? el.pts[0] : null); if (q) lab(p, q, f1(Math.hypot(q[0] - p[0], q[1] - p[1])), ed && { el, art: "laenge", i }); });
      const n = el.pts.length;
      for (let i = el.geschlossen ? 0 : 1; i < (el.geschlossen ? n : n - 1); i++) {
        const w = drehung(el.pts, i);
        if (Math.abs(w) > 0.05 && n > 2) lab(el.pts[i], el.pts[i], Math.abs(w).toFixed(1).replace(/\.0$/, "") + "°", ed && !el.geschlossen && { el, art: "winkel", i }, true);
      }
    } else if (el.art === "rechteck") {
      lab(el.a, [el.b[0], el.a[1]], f1(Math.abs(el.b[0] - el.a[0])), ed && { el, art: "breite" });
      lab(el.a, [el.a[0], el.b[1]], f1(Math.abs(el.b[1] - el.a[1])), ed && { el, art: "hoehe" });
    } else lab(el.c, [el.c[0] + el.r * 2, el.c[1]], "Ø " + f1(el.r * 2), ed && { el, art: "durchmesser" });
  }
  if (m) status(`u ${f1(m[0])}  v ${f1(m[1])} mm · ${f.name} auf ${EBENEN[f.ebene].name}`);
}
function zeigeLabels() {
  const box = $("labels");
  while (box.children.length < labels.length) box.appendChild(document.createElement("div"));
  [...box.children].forEach((d, i) => {
    const l = labels[i];
    if (!l) { d.hidden = true; return; }
    const v = l.p.clone().project(kamera);
    d.hidden = false; d.textContent = l.t; d.dataset.i = i;
    d.className = (l.edit ? "mass" : "") + (l.winkel ? " winkel" : "");
    d.style.left = ((v.x + 1) / 2) * 100 + "%"; d.style.top = ((1 - v.y) / 2) * 100 + "%";
  });
}

// ------------------------------------------------------------ Maus und Tastatur
let runter = null;
leinwand.addEventListener("contextmenu", (e) => e.preventDefault());
const smPos = (e) => { const r = leinwand.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
leinwand.addEventListener("pointerdown", (e) => {
  runter = { x: e.clientX, y: e.clientY, b: e.button };
  if (skizze?.werkzeug === "auswahl" && e.button === 0) {
    const p = trefferPunkt(smPos(e));
    if (p) { skizze.zug = { q: p }; leinwand.setPointerCapture(e.pointerId); }
  }
});
leinwand.addEventListener("pointermove", (e) => {
  if (!skizze) return;
  if (skizze.zug) {
    const E = EBENEN[skizze.f.ebene]; strahl.setFromCamera(ndc(e), kamera);
    const p = strahl.ray.intersectPlane(new THREE.Plane(V(E.n), 0), new THREE.Vector3()); if (!p) return;
    let uv = [p.dot(V(E.u)), p.dot(V(E.v))];
    if (!e.shiftKey) uv = uv.map((x) => Math.round(x / RASTER) * RASTER);
    if (!gleich(uv, skizze.zug.q)) { verschiebePunkt(skizze.zug.q, uv); skizze.zug.q = uv; zeichneLive(); }
    return;
  }
  const r = ebenenPunkt(e); if (!r) return;
  skizze.maus = r.uv; zeichneLive();
  if (skizze.pkt.length) {
    const rr = leinwand.getBoundingClientRect(), ein = $("eingabe");
    ein.hidden = false; ein.style.left = Math.min(e.clientX - rr.left + 16, rr.width - 170) + "px"; ein.style.top = (e.clientY - rr.top + 16) + "px";
    ein.querySelector("label").firstChild.textContent = skizze.werkzeug === "kreis" ? "Ø " : skizze.werkzeug === "rechteck" ? "B " : "L ";
    ein.querySelectorAll("label")[1].firstChild.textContent = skizze.werkzeug === "rechteck" ? "H " : "∠ ";
    ein.querySelectorAll("label")[1].hidden = skizze.werkzeug === "kreis";
  } else $("eingabe").hidden = true;
});
leinwand.addEventListener("pointerup", (e) => {
  if (skizze?.zug) { skizze.zug = null; ordneRechtecke(); zeichneLive(); runter = null; return; }
  if (!runter || Math.hypot(e.clientX - runter.x, e.clientY - runter.y) > 5 || runter.b !== 0) { runter = null; return; }
  runter = null;
  if (skizze?.zug) { skizze.zug = null; ordneRechtecke(); zeichneLive(); return; }
  if (skizze?.werkzeug === "auswahl") { skizze.sel = trefferElement(smPos(e)); zeichneLive(); return; }
  if (skizze) { const r = ebenenPunkt(e); if (r) klick(r.uv, r.fang); return; }
  strahl.setFromCamera(ndc(e), kamera);
  const treffer = strahl.intersectObjects(modell.children.filter((o) => o.isMesh), false)[0];
  waehle(treffer ? treffer.object.userData.fid : null);
});
leinwand.addEventListener("dblclick", () => { if (skizze?.werkzeug === "linie") abschliessenLinie(); });
document.addEventListener("keydown", (e) => {
  if (!skizze) return;
  const imFeld = e.target.closest?.("#eingabe");
  if (e.key === "Escape") { if (skizze.pkt.length) { abschliessenLinie(); skizze.pkt = []; zeichneLive(); } else if (skizze.werkzeug !== "auswahl") setzeWerkzeug("auswahl"); else { skizze.sel = null; zeichneLive(); } e.preventDefault(); return; }
  if ((e.key === "Delete" || e.key === "Backspace") && skizze.sel && !e.target.closest?.("input,select")) {
    skizze.f.elemente.splice(skizze.f.elemente.indexOf(skizze.sel), 1); skizze.sel = null; zeichneLive(); e.preventDefault(); return;
  }
  if (e.key === "Enter") { if (imFeld) eingabeAnwenden(); else abschliessenLinie(); e.preventDefault(); return; }
  if ((e.ctrlKey || e.metaKey) && e.key === "z") { if (skizze.pkt.length) skizze.pkt.pop(); else skizze.f.elemente.pop(); zeichneLive(); e.preventDefault(); return; }
  if (!imFeld && skizze.pkt.length && /^[\d.\-]$/.test(e.key) && !e.target.closest?.("input,select")) {
    $("eingabe").hidden = false; $("eLaenge").value = e.key; $("eLaenge").focus(); e.preventDefault();
  }
});

// ------------------------------------------------------------ Werkzeugleiste
$("wSkizze").onclick = () => {
  if (dlg) $("dAbbrechen").click();
  dialog({ titel: "Skizze erstellen", felder: [{ id: "ebene", label: "Ebene", optionen: Object.entries(EBENEN).map(([k, e]) => [k, e.name]), wert: "XY" }],
    hinweis: "Für Blechprofile den Querschnitt zeichnen, meist auf Vorne (XY).",
    ok: (w) => { const f = { id: neueId(), typ: "skizze", name: "Skizze " + (doc.features.filter((x) => x.typ === "skizze").length + 1), ebene: w.ebene, elemente: [] }; doc.features.push(f); setTimeout(() => starteSkizze(f)); } });
};
$("wExtrusion").onclick = () => { if (dlg) $("dAbbrechen").click(); extrusionDialog(); };
$("wBlech").onclick = () => { if (dlg) $("dAbbrechen").click(); blechDialog(); };
$("wVorlage").onclick = () => { if (dlg) $("dAbbrechen").click(); vorlageDialog(); };
$("wProfil").onclick = () => { if (dlg) $("dAbbrechen").click(); profilDialog(); };
$("tAuswahl").onclick = () => { abschliessenLinie(); setzeWerkzeug("auswahl"); };
$("tLinie").onclick = () => { abschliessenLinie(); setzeWerkzeug("linie"); };
$("tRechteck").onclick = () => { abschliessenLinie(); setzeWerkzeug("rechteck"); };
$("tKreis").onclick = () => { abschliessenLinie(); setzeWerkzeug("kreis"); };
$("tFertig").onclick = beendeSkizze;
let projektPfad = null; // PC-Programm: Speichern schreibt ohne Rückfrage in diese Datei
function titel() {
  document.title = (projektPfad ? dateiname(projektPfad) + " – " : "") + "Spengler Digital CAD";
  window.__TAURI__?.window.getCurrentWindow().setTitle(document.title).catch(() => {});
}
async function projektSpeichern(unter = false) {
  const inhalt = JSON.stringify(doc, (k, v) => (k.startsWith("_") ? undefined : v), 1);
  const ziel = await herunterladen(`${doc.nr || "projekt"}.sdcad`, inhalt, "application/json", unter ? null : projektPfad);
  if (ziel) { projektPfad = ziel; titel(); }
}
function ladeProjekt(text, pfad = null) {
  try {
    const d = JSON.parse(text); if (!d.features) throw 0;
    doc = d; auswahl = null; projektPfad = pfad; titel(); verlauf.stapel = []; verlauf.pos = -1;
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
$("datei").onchange = async (e) => { ladeProjekt(await e.target.files[0].text()); e.target.value = ""; };
document.addEventListener("keydown", (e) => {
  if (!(e.ctrlKey || e.metaKey)) return;
  const k = e.key.toLowerCase();
  if (k === "s") { e.preventDefault(); projektSpeichern(e.shiftKey); }
  else if (k === "p") { e.preventDefault(); drucke(blechteile(), true); }
  else if (k === "o") { e.preventDefault(); projektOeffnen(); }
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
(function schleife() { steuerung.update(); renderer.render(szene, kamera); zeigeLabels(); requestAnimationFrame(schleife); })();
// PC-Programm: per Doppelklick geöffnete .sdcad-Datei laden
pc?.invoke("startdatei").then((d) => d && ladeProjekt(d.inhalt, d.pfad)).catch((e) => status("Datei konnte nicht geöffnet werden: " + e));
// Web-Version: offline nutzbar machen (nicht im PC-Programm und nicht per Doppelklick)
if ("serviceWorker" in navigator && location.protocol.startsWith("http") && !("__TAURI_INTERNALS__" in window)) navigator.serviceWorker.register("sw.js").catch(() => {});
status("Beispiel geladen. Neu zeichnen: «Skizze» → Ebene wählen → Linienzug zeichnen → «Blechprofil».");
