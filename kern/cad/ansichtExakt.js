// Spengler Digital CAD – Zeichnungsansicht aus exakter Projektion (rein, ohne Kern)
// Eingabe: Ergebnis von { op: "projektion" } (Linienzüge sichtbar/verdeckt in Kamera-mm, y nach oben),
// Ausgabe im Format des Planblatts (src/plan.js): Papier-mm, y nach unten, Segmente [x1,y1,x2,y2].
// Verdeckte Kanten, die genau hinter sichtbaren liegen (Rückseite derselben Kante), werden weggelassen.
import { KernFehler, CODES } from "./schnittstelle.js";

// Blickrichtung d (zur Kamera) und «oben» wie die Normansichten in src/ansicht.js
const kreuz = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const norm = (v) => { const l = Math.hypot(...v); return v.map((x) => x / l); };
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
export function kameraAchsen(d, oben) {
  const n = norm(d), x = norm(kreuz(oben, n)), y = kreuz(n, x); // x nach rechts, y nach oben, n zur Kamera
  return { n, x, y };
}

// Linienzüge → Einzelsegmente
const segmente = (zuege) => zuege.flatMap((z) => z.slice(1).map((q, i) => [z[i][0], z[i][1], q[0], q[1]]));

// Abstand eines Punktes zu einem Segment
function abstand(px, py, s) {
  const [x1, y1, x2, y2] = s, dx = x2 - x1, dy = y2 - y1, l2 = dx * dx + dy * dy;
  const t = l2 < 1e-18 ? 0 : Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / l2));
  return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
}
// Verdeckte Segmente entfernen, deren Mitte auf einem sichtbaren Segment liegt (Rückseite derselben Kante)
export function ohneDeckungsgleiche(verdeckt, sichtbar, tol = 1e-3) {
  return verdeckt.filter((v) => !sichtbar.some((s) => abstand((v[0] + v[2]) / 2, (v[1] + v[3]) / 2, s) < tol && abstand(v[0], v[1], s) < tol && abstand(v[2], v[3], s) < tol));
}

// p: Kernergebnis; d/oben: Blickrichtung; massstab: Papier-mm je Modell-mm; verdeckte: verdeckte Kanten mitnehmen
export function ansichtAusProjektion(p, { d, oben, massstab, verdeckte = true }) {
  if (!p?.sichtbar) throw new KernFehler(CODES.EINGABE, "Projektion ohne Ergebnis");
  const { x: xa, y: ya } = kameraAchsen(d, oben), alle = [...p.sichtbar, ...(verdeckte ? p.verdeckt : [])].flat();
  if (!alle.length) return null;
  const xs = alle.map((q) => q[0]), ys = alle.map((q) => q[1]);
  const minx = Math.min(...xs), maxx = Math.max(...xs), miny = Math.min(...ys), maxy = Math.max(...ys);
  const rand = (Math.max(maxx - minx, maxy - miny) || 1) * 0.01, x0 = minx - rand, y1 = maxy + rand;
  const breite = (maxx + rand - x0) * massstab, hoehe = (y1 - (miny - rand)) * massstab;
  const aufPapier = ([x, y]) => [(x - x0) * massstab, (y1 - y) * massstab];
  const papier = (z) => z.map((s) => [...aufPapier([s[0], s[1]]), ...aufPapier([s[2], s[3]])]);
  const sicht = papier(segmente(p.sichtbar)), verd = verdeckte ? papier(ohneDeckungsgleiche(segmente(p.verdeckt), segmente(p.sichtbar))) : [];
  const lang = (s) => Math.hypot(s[2] - s[0], s[3] - s[1]) > 0.05;
  // Fangpunkte: Enden der sichtbaren Linienzüge
  const punkte = [], gesehen = new Set();
  for (const z of p.sichtbar) for (const q of [z[0], z.at(-1)]) {
    const [x, y] = aufPapier(q), k = `${x.toFixed(2)}|${y.toFixed(2)}`; if (gesehen.has(k)) continue; gesehen.add(k);
    punkte.push({ x, y, w: null, q });
  }
  const abbild = (w) => aufPapier([dot(w, xa), dot(w, ya)]);
  // Weltpunkt in der Bildebene (Tiefe 0): abbild(w) trifft den Punkt, Abstände zwischen Punkten sind die wahren Abstände in der Ansicht
  for (const pt of punkte) pt.w = [0, 1, 2].map((i) => pt.q[0] * xa[i] + pt.q[1] * ya[i]);
  // Kreise/Bögen der sichtbaren Linien: Mittelpunkt als Weltpunkt in der Bildebene, Radius in Modell-mm (für Ø- und R-Masse)
  const kreise = kreiseAusLinienzuegen(p.sichtbar).map((k) => ({ x: aufPapier(k.c)[0], y: aufPapier(k.c)[1], r: k.r, voll: k.voll, w: [0, 1, 2].map((i) => k.c[0] * xa[i] + k.c[1] * ya[i]) }));
  return { breite, hoehe, sichtbar: sicht.filter(lang), verdeckt: verd.filter(lang), punkte: punkte.map(({ x, y, w }) => ({ x, y, w })), kreise, abbild, exakt: true };
}

// Geschnittene Kanten (3D-Polylinien je Kante, aus { op: "schnitt" }) zu geschlossenen Linienzügen verketten
export function kettenAusKanten(kanten, tol = 1e-4) {
  const key = (p) => p.map((v) => Math.round(v / tol)).join(","), frei = kanten.filter((k) => k.length >= 2).map((k) => k.slice()), loops = [];
  const an = new Map();
  frei.forEach((k, i) => { for (const e of [k[0], k.at(-1)]) { const s = key(e); if (!an.has(s)) an.set(s, []); an.get(s).push(i); } });
  const benutzt = new Set();
  for (let i = 0; i < frei.length; i++) {
    if (benutzt.has(i)) continue; benutzt.add(i);
    let zug = frei[i].slice(), ok = true;
    for (let n = 0; n < frei.length; n++) {
      const ende = key(zug.at(-1)); if (ende === key(zug[0]) && zug.length > 2) break;
      const j = (an.get(ende) || []).find((x) => !benutzt.has(x)); if (j == null) { ok = false; break; }
      benutzt.add(j); const k = frei[j]; zug = zug.concat(key(k[0]) === ende ? k.slice(1) : k.slice(0, -1).reverse());
    }
    if (ok && zug.length > 3) { zug.pop(); loops.push(zug); }
  }
  return loops;
}

// Kreise und Kreisbögen aus Linienzügen erkennen (Kern liefert Bögen als dichte Punktfolgen auf dem exakten Kreis).
// Rückgabe: [{ c: [x, y], r, voll, w0, w1 }] in denselben Einheiten wie die Eingabe; Winkel in Grad (gegen den Uhrzeiger von w0 nach w1).
export function kreiseAusLinienzuegen(zuege, { minPunkte = 12, tol = 2e-3 } = {}) {
  const out = [];
  for (const z of zuege) {
    if (z.length < minPunkte) continue;
    const a = z[0], m = z[Math.floor(z.length / 2)], b = z.at(-1), c0 = z[Math.floor(z.length / 4)];
    const mitte = (p, q, r) => { // Umkreis dreier Punkte
      const d = 2 * (p[0] * (q[1] - r[1]) + q[0] * (r[1] - p[1]) + r[0] * (p[1] - q[1])); if (Math.abs(d) < 1e-12) return null;
      const f = (u) => u[0] * u[0] + u[1] * u[1];
      return [(f(p) * (q[1] - r[1]) + f(q) * (r[1] - p[1]) + f(r) * (p[1] - q[1])) / d, (f(p) * (r[0] - q[0]) + f(q) * (p[0] - r[0]) + f(r) * (q[0] - p[0])) / d];
    };
    const voll = Math.hypot(a[0] - b[0], a[1] - b[1]) < 1e-6, c = mitte(a, c0, m) ?? mitte(c0, m, z[Math.floor((3 * z.length) / 4)]);
    if (!c) continue;
    const r = Math.hypot(a[0] - c[0], a[1] - c[1]);
    if (!(r > 1e-6) || !z.every((p) => Math.abs(Math.hypot(p[0] - c[0], p[1] - c[1]) - r) <= tol * Math.max(1, r))) continue;
    const w = (p) => (Math.atan2(p[1] - c[1], p[0] - c[0]) * 180) / Math.PI;
    out.push({ c, r, voll, w0: w(a), w1: w(b) });
  }
  return out;
}
