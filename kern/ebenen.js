// Spengler Digital CAD – Kern: Konstruktionsebenen (angelehnt an Fusion «Konstruieren»)
// Eine Ebene ist { o, u, v, n }: Ursprung und drei Einheitsvektoren (u × v = n), alles [x, y, z] in mm.
// Reines JavaScript ohne Abhängigkeiten.

export class EbenenFehler extends Error {}

const plus = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const minus = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const mal = (a, s) => [a[0] * s, a[1] * s, a[2] * s];
const punkt = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const kreuz = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const laenge = (a) => Math.hypot(a[0], a[1], a[2]);
const einheit = (a) => { const l = laenge(a); if (l < 1e-12) throw new EbenenFehler("Richtung hat die Länge 0"); return mal(a, 1 / l); };
const rad = (g) => (g * Math.PI) / 180;
export const vek = { plus, minus, mal, punkt, kreuz, laenge, einheit };

// Vektor v um die Achse k (Einheitsvektor) drehen (Rodrigues)
export function drehe(v, k, winkelGrad) {
  const c = Math.cos(rad(winkelGrad)), s = Math.sin(rad(winkelGrad));
  return plus(plus(mal(v, c), mal(kreuz(k, v), s)), mal(k, punkt(k, v) * (1 - c)));
}

// Ebene aus Ursprung, Normale und Vorzugsrichtung für u (wird in die Ebene projiziert)
export function ebeneAus(o, n, uWunsch) {
  n = einheit(n);
  let u = minus(uWunsch, mal(n, punkt(n, uWunsch)));
  if (laenge(u) < 1e-9) { // Vorzugsrichtung steht senkrecht: andere Weltachse nehmen
    const alt = Math.abs(n[0]) < 0.9 ? [1, 0, 0] : [0, 1, 0];
    u = minus(alt, mal(n, punkt(n, alt)));
  }
  u = einheit(u);
  return { o: o.slice(), u, v: kreuz(n, u), n };
}

// Grundebenen wie bisher: Vorne (XY), Boden (XZ), Seite (YZ)
export const BASIS = {
  XY: { o: [0, 0, 0], u: [1, 0, 0], v: [0, 1, 0], n: [0, 0, 1] },
  XZ: { o: [0, 0, 0], u: [1, 0, 0], v: [0, 0, -1], n: [0, 1, 0] },
  YZ: { o: [0, 0, 0], u: [0, 0, -1], v: [0, 1, 0], n: [1, 0, 0] },
};
export const ACHSEN = { X: { p: [0, 0, 0], d: [1, 0, 0] }, Y: { p: [0, 0, 0], d: [0, 1, 0] }, Z: { p: [0, 0, 0], d: [0, 0, 1] } };

export const zuWelt = (e, [x, y]) => plus(e.o, plus(mal(e.u, x), mal(e.v, y)));
export const zuLokal = (e, p) => { const d = minus(p, e.o); return [punkt(d, e.u), punkt(d, e.v)]; };

// 1. Versetzte Ebene: parallel im Abstand d (in Normalenrichtung)
export const versetzt = (e, d) => ({ ...e, o: plus(e.o, mal(e.n, d)) });

// 2. Ebene unter Winkel: enthält die Achse { p, d }, gegenüber der Bezugsebene e um winkel gedreht
export function unterWinkel(e, achse, winkel) {
  const k = einheit(achse.d);
  let n0 = minus(e.n, mal(k, punkt(k, e.n))); // Normale der Bezugsebene senkrecht zur Achse
  if (laenge(n0) < 1e-9) throw new EbenenFehler("Achse steht senkrecht auf der Bezugsebene");
  n0 = einheit(n0);
  return ebeneAus(achse.p, drehe(n0, k, winkel), k);
}

// 3. Mittelebene zwischen zwei Ebenen: parallel → in der Mitte, sonst Winkelhalbierende durch die Schnittlinie
export function mittelebene(e1, e2) {
  let n2 = e2.n;
  if (punkt(e1.n, n2) < 0) n2 = mal(n2, -1);
  const d1 = punkt(e1.n, e1.o), d2 = punkt(e1.n, e2.o);
  if (laenge(kreuz(e1.n, n2)) < 1e-9) return { ...e1, o: plus(e1.o, mal(e1.n, (d2 - d1) / 2)) };
  const n = einheit(plus(e1.n, n2)), l = kreuz(e1.n, n2);
  const q1 = punkt(e1.n, e1.o), q2 = punkt(n2, e2.o);
  const p = mal(kreuz(minus(mal(n2, q1), mal(e1.n, q2)), l), 1 / punkt(l, l)); // Punkt auf der Schnittlinie
  return ebeneAus(p, n, l);
}

// 4. Durch zwei Kanten { p, d } (müssen in einer Ebene liegen)
export function zweiKanten(k1, k2) {
  const d1 = einheit(k1.d), d2 = einheit(k2.d), w = minus(k2.p, k1.p);
  let n = kreuz(d1, d2);
  if (laenge(n) < 1e-9) { // parallel
    n = kreuz(d1, w);
    if (laenge(n) < 1e-9) throw new EbenenFehler("Die beiden Kanten liegen auf einer Linie");
  } else if (Math.abs(punkt(einheit(n), w)) > 1e-6 * Math.max(1, laenge(w))) {
    throw new EbenenFehler("Die beiden Kanten liegen nicht in einer Ebene");
  }
  return ebeneAus(k1.p, n, d1);
}

// 5. Durch drei Punkte
export function dreiPunkte(a, b, c) {
  const n = kreuz(minus(b, a), minus(c, a));
  if (laenge(n) < 1e-9 * Math.max(1, laenge(minus(b, a)) ** 2)) throw new EbenenFehler("Die drei Punkte liegen auf einer Linie");
  return ebeneAus(a, n, minus(b, a));
}

// 6. Tangential an einen Zylinder { p, d, r } (Achse, Radius); winkel um die Achse ab Bezugsrichtung ref
export function tangential(zyl, winkel, ref) {
  const k = einheit(zyl.d);
  let r0 = minus(ref, mal(k, punkt(k, ref)));
  if (laenge(r0) < 1e-9) r0 = ebeneAus([0, 0, 0], k, [1, 0, 0]).u;
  const radial = einheit(drehe(einheit(r0), k, winkel));
  return ebeneAus(plus(zyl.p, mal(radial, zyl.r)), radial, k);
}

// 7. Entlang Pfad: senkrecht zum Pfad (Punktliste) bei anteil 0 … 1 der Pfadlänge
export function entlangPfad(pts, anteil) {
  if (pts.length < 2) throw new EbenenFehler("Pfad braucht mindestens zwei Punkte");
  const seg = pts.slice(1).map((q, i) => laenge(minus(q, pts[i])));
  const gesamt = seg.reduce((a, b) => a + b, 0);
  if (gesamt < 1e-9) throw new EbenenFehler("Pfad hat die Länge 0");
  let rest = Math.min(Math.max(anteil, 0), 1) * gesamt, i = 0;
  while (i < seg.length - 1 && rest > seg[i]) { rest -= seg[i]; i++; }
  const d = einheit(minus(pts[i + 1], pts[i]));
  const o = plus(pts[i], mal(d, Math.min(rest, seg[i])));
  return ebeneAus(o, d, Math.abs(d[2]) < 0.9 ? [0, 0, 1] : [1, 0, 0]);
}

// Ebene auf einer ebenen Körperfläche (Punkt und Normale), u möglichst entlang Welt-X
export const aufFlaeche = (o, n) => ebeneAus(o, n, [1, 0, 0]);
