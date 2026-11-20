// Spengler Digital CAD – Skizzenelemente → exakte Kern-Profile (rein, ohne Kern)
// Exakt: Linien/Linienzüge (auch mit Eckradien), Dreipunktbögen, Kreise, Rechtecke, Langlöcher.
// Nicht exakt (noch): Splines, Ellipsen, Text → Fehler NichtExakt, damit nie still eine Näherung als exakt gilt.
import { abrundung, verbindeStuecke } from "../skizze.js";

export class NichtExakt extends Error {}
const auf = (c, r, w) => [c[0] + r * Math.cos(w), c[1] + r * Math.sin(w)];
const gleich = (a, b, tol = 1e-6) => Math.hypot(a[0] - b[0], a[1] - b[1]) <= tol;

// Linienzug mit Eckradien → Pfad { start, segmente } (offen) oder geschlossenes Profil
function linienzug(pts, radien = {}, geschlossen = false) {
  const n = pts.length, ecken = pts.map((p, i) => (radien[i] > 0 ? abrundung(pts, i, radien[i], geschlossen) : null));
  const segmente = [];
  let start;
  if (!geschlossen) {
    start = pts[0];
    for (let i = 1; i < n; i++) {
      const e = ecken[i];
      if (e) { segmente.push({ bis: e.t1 }, { bis: e.t2, bogenMitte: e.m }); } else segmente.push({ bis: pts[i] });
    }
  } else {
    start = ecken[0] ? ecken[0].t2 : pts[0];
    for (let k = 1; k <= n; k++) {
      const i = k % n, e = ecken[i];
      if (e) segmente.push({ bis: e.t1 }, { bis: e.t2, bogenMitte: e.m }); else segmente.push({ bis: pts[i] }); // k = n schliesst bei Ecke 0
    }
  }
  // Nullsegmente (Ecke direkt am Tangentenpunkt) entfernen
  const out = []; let vor = start;
  for (const s of segmente) { if (!gleich(vor, s.bis)) { out.push(s); vor = s.bis; } }
  if (geschlossen && out.length && gleich(out.at(-1).bis, start) && !out.at(-1).bogenMitte) out.pop(); // Schliessen übernimmt der Kern
  return { start, segmente: out };
}

// Einzelnes Element als offener Pfad (für Ketten) – Rückgabe { start, segmente, ende }
export function elementPfad(el) {
  switch (el.art) {
    case "linie": if (el.geschlossen) return null; { const p = linienzug(el.pts, el.radien || {}, false); return { ...p, ende: el.pts.at(-1) }; }
    case "bogen": return { start: el.a, segmente: [{ bis: el.b, bogenMitte: el.m }], ende: el.b };
    case "spline": throw new NichtExakt("Spline");
    default: return null;
  }
}
// Geschlossenes Einzelelement als Profil
export function elementProfil(el) {
  switch (el.art) {
    case "linie": return el.geschlossen ? linienzug(el.pts, el.radien || {}, true) : null;
    case "rechteck": { const c = [el.a, [el.b[0], el.a[1]], el.b, [el.a[0], el.b[1]]]; return { start: c[0], segmente: c.slice(1).map((p) => ({ bis: p })) }; }
    case "kreis": { const { c, r } = el; return { start: auf(c, r, 0), segmente: [{ bis: auf(c, r, Math.PI), bogenMitte: auf(c, r, Math.PI / 2) }, { bis: auf(c, r, 0), bogenMitte: auf(c, r, -Math.PI / 2) }] }; }
    case "langloch": {
      const { a, b, r } = el, w = Math.atan2(b[1] - a[1], b[0] - a[0]), q = Math.PI / 2;
      return { start: auf(b, r, w - q), segmente: [{ bis: auf(b, r, w + q), bogenMitte: auf(b, r, w) }, { bis: auf(a, r, w + q) }, { bis: auf(a, r, w - q), bogenMitte: auf(a, r, w + 2 * q) }] };
    }
    case "spline": if (el.geschlossen) throw new NichtExakt("Spline"); return null;
    case "ellipse": throw new NichtExakt("Ellipse");
    case "text": throw new NichtExakt("Skizzentext");
    default: return null;
  }
}
// Kette verbundener Stücke (aus verbindeStuecke) → Profil; umgekehrte Stücke werden gespiegelt durchlaufen
function kettenProfil(teile) {
  let start = null; const segmente = [];
  for (const { stueck, umgekehrt } of teile) {
    const p = elementPfad(stueck.el); if (!p) throw new NichtExakt(stueck.el.art);
    let s = p.segmente, a = p.start;
    if (umgekehrt) { // rückwärts: Endpunkte verschieben sich, Bogenmitte bleibt
      const pkt = [p.start, ...p.segmente.map((x) => x.bis)];
      s = p.segmente.map((x, i) => ({ bis: pkt[i], ...(x.bogenMitte ? { bogenMitte: x.bogenMitte } : {}) })).reverse();
      a = pkt.at(-1);
    }
    if (!start) start = a;
    segmente.push(...s);
  }
  if (segmente.length && gleich(segmente.at(-1).bis, start) && !segmente.at(-1).bogenMitte) segmente.pop();
  return { start, segmente };
}

// Polygon zur Flächen-/Lagebestimmung (Bögen fein abgetastet)
export function profilPolygon(p, n = 16) {
  const out = [p.start]; let vor = p.start;
  for (const s of p.segmente) {
    if (s.bogenMitte) {
      const a = vor, m = s.bogenMitte, b = s.bis;
      const d = 2 * (a[0] * (m[1] - b[1]) + m[0] * (b[1] - a[1]) + b[0] * (a[1] - m[1])), q = (x) => x[0] * x[0] + x[1] * x[1];
      const c = [(q(a) * (m[1] - b[1]) + q(m) * (b[1] - a[1]) + q(b) * (a[1] - m[1])) / d, (q(a) * (b[0] - m[0]) + q(m) * (a[0] - b[0]) + q(b) * (m[0] - a[0])) / d];
      const r = Math.hypot(a[0] - c[0], a[1] - c[1]), wa = Math.atan2(a[1] - c[1], a[0] - c[0]), wm = Math.atan2(m[1] - c[1], m[0] - c[0]), wb = Math.atan2(b[1] - c[1], b[0] - c[0]);
      const norm = (w) => ((w % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI), bis = norm(wb - wa), zuM = norm(wm - wa), sw = zuM < bis ? bis : bis - 2 * Math.PI;
      for (let i = 1; i <= n; i++) out.push(auf(c, r, wa + (sw * i) / n));
    } else out.push(s.bis);
    vor = s.bis;
  }
  if (gleich(out[0], out.at(-1))) out.pop();
  return out;
}
const flaeche = (p) => p.reduce((s, a, i) => { const b = p[(i + 1) % p.length]; return s + a[0] * b[1] - b[0] * a[1]; }, 0) / 2;
function innen(pt, poly) {
  let drin = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const [xi, yi] = poly[i], [xj, yj] = poly[j]; if ((yi > pt[1]) !== (yj > pt[1]) && pt[0] < ((xj - xi) * (pt[1] - yi)) / (yj - yi) + xi) drin = !drin; }
  return drin;
}

// Alle geschlossenen Profile einer Skizze, verschachtelt wie in der App (Aussenkontur mit Löchern, eine Ebene tief).
// elemente: Skizzenelemente ohne Hilfslinien/Punkte. Rückgabe: [{ profil, loecher: [profil] }]
export function skizzenProfile(elemente) {
  const loops = [];
  for (const el of elemente) { const p = elementProfil(el); if (p) loops.push(p); }
  const offen = elemente.filter((el) => (el.art === "linie" && !el.geschlossen) || el.art === "bogen" || (el.art === "spline" && !el.geschlossen));
  const ketten = verbindeStuecke(offen.map((el) => ({ pts: el.art === "linie" ? el.pts : el.art === "spline" ? [el.pts[0], el.pts.at(-1)] : [el.a, el.b], el })));
  for (const k of ketten.filter((k) => k.geschlossen)) loops.push(kettenProfil(k.teile));
  const mit = loops.map((p) => { const poly = profilPolygon(p); return { p, poly, a: Math.abs(flaeche(poly)) }; }).sort((x, y) => y.a - x.a);
  const aussen = [];
  for (const l of mit) {
    const imAussen = aussen.find((o) => innen(l.poly[0], o.poly) && !o.loecher.some((h) => innen(l.poly[0], h.poly)));
    if (imAussen) imAussen.loecher.push(l); else aussen.push({ ...l, loecher: [] });
  }
  return aussen.map((o) => ({ profil: o.p, loecher: o.loecher.map((h) => h.p), flaeche: o.a - o.loecher.reduce((s, h) => s + h.a, 0) }));
}
