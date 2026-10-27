// Spengler Digital CAD – Kern: Skizzengeometrie in der Ebene (u, v in mm)
// Bögen, Kreise, Polygone, Langlöcher, Abrunden, Versatz, Spiegeln, Schnittpunkte, Verbinden zu Linienzügen.
// Reines JavaScript ohne Abhängigkeiten.

const abst = (a, b) => Math.hypot(b[0] - a[0], b[1] - a[1]);
const winkelVon = (c, p) => Math.atan2(p[1] - c[1], p[0] - c[0]);
const norm2pi = (w) => { const z = 2 * Math.PI; return ((w % z) + z) % z; };
const auf = (c, r, w) => [c[0] + r * Math.cos(w), c[1] + r * Math.sin(w)];

// Kreis durch drei Punkte, null wenn sie auf einer Linie liegen
export function kreisDurch3(a, b, c) {
  const D = 2 * (a[0] * (b[1] - c[1]) + b[0] * (c[1] - a[1]) + c[0] * (a[1] - b[1]));
  if (Math.abs(D) < 1e-9 * Math.max(1, abst(a, b) * abst(b, c))) return null;
  const q = (p) => p[0] * p[0] + p[1] * p[1];
  const m = [(q(a) * (b[1] - c[1]) + q(b) * (c[1] - a[1]) + q(c) * (a[1] - b[1])) / D, (q(a) * (c[0] - b[0]) + q(b) * (a[0] - c[0]) + q(c) * (b[0] - a[0])) / D];
  return { c: m, r: abst(m, a) };
}

// Bogen { a: Start, b: Ende, m: Punkt auf dem Bogen } → Mittelpunkt, Radius, Startwinkel, Überstreichwinkel (± im Gegenuhrzeigersinn)
export function bogenDaten(bg) {
  const k = kreisDurch3(bg.a, bg.m, bg.b);
  if (!k) return null;
  const s = winkelVon(k.c, bg.a), bis = norm2pi(winkelVon(k.c, bg.b) - s), zuM = norm2pi(winkelVon(k.c, bg.m) - s);
  return { c: k.c, r: k.r, start: s, sweep: zuM < bis ? bis : bis - 2 * Math.PI };
}
export function bogenPunkte(bg, schrittGrad = 4) {
  const d = bogenDaten(bg);
  if (!d) return [bg.a.slice(), bg.b.slice()];
  const n = Math.max(2, Math.ceil(Math.abs(d.sweep) * 180 / Math.PI / schrittGrad));
  return Array.from({ length: n + 1 }, (_, i) => (i === 0 ? bg.a.slice() : i === n ? bg.b.slice() : auf(d.c, d.r, d.start + (d.sweep * i) / n)));
}
// Mittelpunktbogen: Mittelpunkt c, Start a, Endrichtung b (Radius von a); kürzerer Bogen
export function bogenAusMitte(c, a, b) {
  const r = abst(c, a), wa = winkelVon(c, a), wb = winkelVon(c, b);
  let sweep = norm2pi(wb - wa); if (sweep > Math.PI) sweep -= 2 * Math.PI;
  return { a: a.slice(), b: auf(c, r, wb), m: auf(c, r, wa + sweep / 2) };
}
export const kreisPunkte = (c, r, n = 72) => Array.from({ length: n }, (_, i) => auf(c, r, (i * 2 * Math.PI) / n));

// Regelmässiges Polygon: Mittelpunkt, eine Ecke, Eckenzahl
export function polygonPunkte(c, ecke, n) {
  n = Math.max(3, Math.round(n)); const r = abst(c, ecke), w0 = winkelVon(c, ecke);
  return Array.from({ length: n }, (_, i) => auf(c, r, w0 + (i * 2 * Math.PI) / n));
}
// Gedrehtes Rechteck aus drei Punkten: Kante a–b, Höhe bis c (senkrecht gemessen)
export function rechteck3(a, b, c) {
  const L = abst(a, b) || 1, n = [-(b[1] - a[1]) / L, (b[0] - a[0]) / L];
  const h = (c[0] - b[0]) * n[0] + (c[1] - b[1]) * n[1];
  return [a.slice(), b.slice(), [b[0] + n[0] * h, b[1] + n[1] * h], [a[0] + n[0] * h, a[1] + n[1] * h]];
}
// Langloch: Mittelpunkte a, b der Rundungen, Radius r → geschlossene Kontur
export function langlochPunkte(a, b, r, schrittGrad = 6) {
  const w = winkelVon(a, b), n = Math.ceil(180 / schrittGrad), pts = [];
  for (let i = 0; i <= n; i++) pts.push(auf(b, r, w - Math.PI / 2 + (Math.PI * i) / n));
  for (let i = 0; i <= n; i++) pts.push(auf(a, r, w + Math.PI / 2 + (Math.PI * i) / n));
  return pts;
}

// Abrunden einer Ecke i im Linienzug: wirksamer Radius (begrenzt durch die halben Nachbarkanten) und Tangentenpunkte
export function abrundung(pts, i, R, geschlossen = false) {
  const n = pts.length, vor = pts[(i - 1 + n) % n], p = pts[i], nach = pts[(i + 1) % n];
  if (!geschlossen && (i === 0 || i === n - 1)) return null;
  const l1 = abst(p, vor), l2 = abst(p, nach);
  if (l1 < 1e-9 || l2 < 1e-9 || !(R > 0)) return null;
  const u1 = [(vor[0] - p[0]) / l1, (vor[1] - p[1]) / l1], u2 = [(nach[0] - p[0]) / l2, (nach[1] - p[1]) / l2];
  const th = Math.acos(Math.max(-1, Math.min(1, u1[0] * u2[0] + u1[1] * u2[1]))); // Innenwinkel der Ecke
  if (th < 1e-6 || Math.PI - th < 1e-6) return null; // Umkehr oder gerade: nicht abrundbar
  let t = R / Math.tan(th / 2);
  const tMax = Math.min(l1, l2) / 2;
  if (t > tMax) t = tMax;
  const r = t * Math.tan(th / 2);
  const t1 = [p[0] + u1[0] * t, p[1] + u1[1] * t], t2 = [p[0] + u2[0] * t, p[1] + u2[1] * t];
  const bis = [u1[0] + u2[0], u1[1] + u2[1]], lb = Math.hypot(bis[0], bis[1]);
  const c = [p[0] + (bis[0] / lb) * (r / Math.sin(th / 2)), p[1] + (bis[1] / lb) * (r / Math.sin(th / 2))];
  const m = [c[0] - (bis[0] / lb) * r, c[1] - (bis[1] / lb) * r];
  return { r, t1, t2, c, m };
}
// Linienzug mit abgerundeten Ecken (radien: { Eckenindex: Radius }) als Punktliste
export function rundePolylinie(pts, radien = {}, geschlossen = false, schrittGrad = 4) {
  const out = [];
  const add = (q) => { const l = out[out.length - 1]; if (!l || abst(l, q) > 1e-9) out.push(q); };
  pts.forEach((p, i) => {
    const a = radien[i] > 0 ? abrundung(pts, i, radien[i], geschlossen) : null;
    if (!a) return add(p.slice());
    bogenPunkte({ a: a.t1, b: a.t2, m: a.m }, schrittGrad).forEach(add);
  });
  return out;
}

// Linienzug parallel versetzen (d > 0 links in Zeichenrichtung), Ecken auf Gehrung, offen oder geschlossen
export function versatzPolylinie(pts, d, geschlossen = false) {
  const n = pts.length;
  if (n < 2 || !d) return pts.map((p) => p.slice());
  const nrm = (a, b) => { const l = abst(a, b) || 1; return [-(b[1] - a[1]) / l, (b[0] - a[0]) / l]; };
  const kanten = geschlossen ? n : n - 1;
  const N = Array.from({ length: kanten }, (_, i) => nrm(pts[i], pts[(i + 1) % n]));
  return pts.map((p, i) => {
    const a = geschlossen ? N[(i - 1 + kanten) % kanten] : N[i - 1], b = geschlossen ? N[i % kanten] : N[i];
    if (!a) return [p[0] + b[0] * d, p[1] + b[1] * d];
    if (!b) return [p[0] + a[0] * d, p[1] + a[1] * d];
    const k = 1 + a[0] * b[0] + a[1] * b[1];
    if (k < 1e-6) return [p[0] + a[0] * d, p[1] + a[1] * d];
    return [p[0] + ((a[0] + b[0]) / k) * d, p[1] + ((a[1] + b[1]) / k) * d];
  });
}

// Punkt p an der Geraden durch a, b spiegeln
export function spiegelPunkt(p, a, b) {
  const dx = b[0] - a[0], dy = b[1] - a[1], l2 = dx * dx + dy * dy || 1;
  const t = ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / l2, f = [a[0] + t * dx, a[1] + t * dy];
  return [2 * f[0] - p[0], 2 * f[1] - p[1]];
}

// Schnitt der Strecke p1–p2 mit q1–q2: Parameter t auf p1–p2 (0 … 1) oder null
export function schnittStrecken(p1, p2, q1, q2) {
  const r = [p2[0] - p1[0], p2[1] - p1[1]], s = [q2[0] - q1[0], q2[1] - q1[1]], rxs = r[0] * s[1] - r[1] * s[0];
  if (Math.abs(rxs) < 1e-12) return null;
  const w = [q1[0] - p1[0], q1[1] - p1[1]];
  const t = (w[0] * s[1] - w[1] * s[0]) / rxs, u = (w[0] * r[1] - w[1] * r[0]) / rxs;
  return t >= -1e-9 && t <= 1 + 1e-9 && u >= -1e-9 && u <= 1 + 1e-9 ? Math.min(Math.max(t, 0), 1) : null;
}
// Schnitte der Strecke p1–p2 mit dem Kreis (c, r): Parameter t (0 … 1)
export function schnittStreckeKreis(p1, p2, c, r) {
  const d = [p2[0] - p1[0], p2[1] - p1[1]], f = [p1[0] - c[0], p1[1] - c[1]];
  const A = d[0] * d[0] + d[1] * d[1], B = 2 * (f[0] * d[0] + f[1] * d[1]), C = f[0] * f[0] + f[1] * f[1] - r * r, D = B * B - 4 * A * C;
  if (A < 1e-12 || D < 0) return [];
  const w = Math.sqrt(D);
  return [(-B - w) / (2 * A), (-B + w) / (2 * A)].filter((t) => t >= -1e-9 && t <= 1 + 1e-9);
}

// Offene Stücke ({ pts, ... }) an gemeinsamen Endpunkten zu Linienzügen verbinden.
// Ergebnis: [{ pts, teile: [{ stueck, umgekehrt }], geschlossen }]
export function verbindeStuecke(stuecke, tol = 1e-6) {
  const frei = stuecke.map((s) => s);
  const gleich = (a, b) => abst(a, b) <= tol;
  const ketten = [];
  while (frei.length) {
    const erstes = frei.shift();
    let pts = erstes.pts.map((p) => p.slice());
    const teile = [{ stueck: erstes, umgekehrt: false }];
    let weiter = true;
    while (weiter) {
      weiter = false;
      for (let i = 0; i < frei.length; i++) {
        const s = frei[i], a = s.pts[0], b = s.pts[s.pts.length - 1], ende = pts[pts.length - 1], anfang = pts[0];
        if (gleich(ende, anfang) && pts.length > 2) break; // schon geschlossen
        let neu = null;
        if (gleich(ende, a)) { neu = [...pts, ...s.pts.slice(1)]; teile.push({ stueck: s, umgekehrt: false }); }
        else if (gleich(ende, b)) { neu = [...pts, ...s.pts.slice(0, -1).reverse()]; teile.push({ stueck: s, umgekehrt: true }); }
        else if (gleich(anfang, b)) { neu = [...s.pts.slice(0, -1), ...pts]; teile.unshift({ stueck: s, umgekehrt: false }); }
        else if (gleich(anfang, a)) { neu = [...s.pts.slice(1).reverse(), ...pts]; teile.unshift({ stueck: s, umgekehrt: true }); }
        if (neu) { pts = neu.map((p) => p.slice()); frei.splice(i, 1); weiter = true; break; }
      }
    }
    const geschlossen = pts.length > 2 && gleich(pts[0], pts[pts.length - 1]);
    if (geschlossen) pts.pop();
    ketten.push({ pts, teile, geschlossen });
  }
  return ketten;
}

// Spline durch Stützpunkte (Catmull-Rom, zentripetal) – wie die «Spline durch Punkte» in Fusion
export function splinePunkte(pts, geschlossen = false, schritte = 16) {
  if (pts.length < 2) return pts.map((p) => p.slice());
  const n = pts.length, P = (i) => (geschlossen ? pts[(i + n) % n] : pts[Math.min(Math.max(i, 0), n - 1)]);
  const out = [], seg = geschlossen ? n : n - 1;
  for (let i = 0; i < seg; i++) {
    const p0 = P(i - 1), p1 = P(i), p2 = P(i + 1), p3 = P(i + 2);
    const t = (a, b) => Math.max(Math.sqrt(Math.hypot(b[0] - a[0], b[1] - a[1])), 1e-6);
    const t1 = t(p0, p1), t2 = t1 + t(p1, p2), t3 = t2 + t(p2, p3);
    const L = (a, b, ta, tb, u) => [a[0] * (tb - u) / (tb - ta) + b[0] * (u - ta) / (tb - ta), a[1] * (tb - u) / (tb - ta) + b[1] * (u - ta) / (tb - ta)];
    for (let k = 0; k < schritte; k++) {
      const u = t1 + ((t2 - t1) * k) / schritte;
      const A1 = L(p0, p1, 0, t1, u), A2 = L(p1, p2, t1, t2, u), A3 = L(p2, p3, t2, t3, u);
      const B1 = L(A1, A2, 0, t2, u), B2 = L(A2, A3, t1, t3, u);
      out.push(L(B1, B2, t1, t2, u));
    }
  }
  if (!geschlossen) out.push(pts[n - 1].slice());
  return out;
}
// Ellipse: Mitte c, Endpunkt der Hauptachse a, kleine Halbachse r2
export function ellipsePunkte(c, a, r2, n = 72) {
  const dx = a[0] - c[0], dy = a[1] - c[1], R = Math.hypot(dx, dy) || 1, w = Math.atan2(dy, dx), co = Math.cos(w), si = Math.sin(w);
  return Array.from({ length: n }, (_, i) => { const t = (2 * Math.PI * i) / n, x = R * Math.cos(t), y = r2 * Math.sin(t); return [c[0] + x * co - y * si, c[1] + x * si + y * co]; });
}
