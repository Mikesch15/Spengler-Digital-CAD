// Spengler Digital CAD – Skizzenelemente → exakte Kern-Profile (rein, ohne Kern)
// Exakt: Linien/Linienzüge (auch mit Eckradien), Dreipunktbögen, Kreise, Rechtecke, Langlöcher, Ellipsen und Splines.
// Splines: die App zeichnet zentripetale Catmull-Rom-Kurven (kern/skizze.js splinePunkte). Jedes Segment ist ein kubisches
// Polynom und wird hier exakt als kubische Bézierkurve übergeben – Kern und Anzeige haben dieselbe Kurve.
// Nicht exakt (noch): Text → Fehler NichtExakt, damit nie still eine Näherung als exakt gilt.
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

// Zentripetale Catmull-Rom-Kurve (wie splinePunkte) → kubische Bézier-Segmente { bis, bezier: [c1, c2] }
// Hermite-Tangenten nach Barry–Goldman (Yuksel et al.): m1, m2 auf das Intervall [t1, t2] skaliert, c1 = p1 + m1/3, c2 = p2 − m2/3.
export function splineSegmente(pts, geschlossen = false) {
  const n = pts.length, P = (i) => (geschlossen ? pts[(i + n) % n] : pts[Math.min(Math.max(i, 0), n - 1)]);
  const dt = (a, b) => Math.max(Math.sqrt(Math.hypot(b[0] - a[0], b[1] - a[1])), 1e-6), seg = [];
  for (let i = 0; i < (geschlossen ? n : n - 1); i++) {
    const p0 = P(i - 1), p1 = P(i), p2 = P(i + 1), p3 = P(i + 2);
    const d0 = dt(p0, p1), d1 = dt(p1, p2), d2 = dt(p2, p3);
    const m1 = [0, 1].map((k) => ((p1[k] - p0[k]) / d0 - (p2[k] - p0[k]) / (d0 + d1) + (p2[k] - p1[k]) / d1) * d1);
    const m2 = [0, 1].map((k) => ((p2[k] - p1[k]) / d1 - (p3[k] - p1[k]) / (d1 + d2) + (p3[k] - p2[k]) / d2) * d1);
    seg.push({ bis: p2.slice(), bezier: [[p1[0] + m1[0] / 3, p1[1] + m1[1] / 3], [p2[0] - m2[0] / 3, p2[1] - m2[1] / 3]] });
  }
  return seg;
}

// Einzelnes Element als offener Pfad (für Ketten) – Rückgabe { start, segmente, ende }
export function elementPfad(el) {
  switch (el.art) {
    case "linie": if (el.geschlossen) return null; { const p = linienzug(el.pts, el.radien || {}, false); return { ...p, ende: el.pts.at(-1) }; }
    case "bogen": return { start: el.a, segmente: [{ bis: el.b, bogenMitte: el.m }], ende: el.b };
    case "spline": return el.geschlossen ? null : { start: el.pts[0], segmente: splineSegmente(el.pts, false), ende: el.pts.at(-1) };
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
    case "spline": return el.geschlossen ? { start: el.pts[0], segmente: splineSegmente(el.pts, true) } : null;
    case "ellipse": { // zwei halbe Ellipsenbögen zwischen den Enden der Hauptachse (c, a = Ende der Hauptachse, r2 = kleine Halbachse)
      const { c, a, r2 } = el, R = Math.hypot(a[0] - c[0], a[1] - c[1]), w = Math.atan2(a[1] - c[1], a[0] - c[0]), b = [2 * c[0] - a[0], 2 * c[1] - a[1]];
      const e = { c, rx: R, ry: r2, w }; return { start: a, segmente: [{ bis: b, ellipse: e }, { bis: a, ellipse: e }] };
    }
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
      s = p.segmente.map((x, i) => ({ bis: pkt[i], ...(x.bogenMitte ? { bogenMitte: x.bogenMitte } : {}), ...(x.bezier ? { bezier: [x.bezier[1], x.bezier[0]] } : {}) })).reverse();
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
    } else if (s.bezier) {
      const [c1, c2] = s.bezier, a = vor, b = s.bis;
      for (let i = 1; i <= n; i++) { const t = i / n, u = 1 - t; out.push([0, 1].map((k) => u * u * u * a[k] + 3 * u * u * t * c1[k] + 3 * u * t * t * c2[k] + t * t * t * b[k])); }
    } else if (s.ellipse) { // halber Bogen von «vor» bis «bis» (gegen den Uhrzeiger in Ellipsen-Koordinaten)
      const { c, rx, ry, w } = s.ellipse, co = Math.cos(w), si = Math.sin(w), t0 = Math.atan2(((vor[1] - c[1]) * co - (vor[0] - c[0]) * si) / ry, ((vor[0] - c[0]) * co + (vor[1] - c[1]) * si) / rx);
      for (let i = 1; i <= n; i++) { const t = t0 + (Math.PI * i) / n, x = rx * Math.cos(t), y = ry * Math.sin(t); out.push([c[0] + x * co - y * si, c[1] + x * si + y * co]); }
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
