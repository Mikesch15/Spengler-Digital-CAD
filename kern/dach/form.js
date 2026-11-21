// Spengler Digital CAD – Kern: Dachform aus einem konvexen Grundriss.
// Jede Traufkante bekommt eine Dachebene (Neigung, Höhe an der Wand = Traufhöhe); die Dachfläche ist die niedrigste aller Ebenen (untere Hüllfläche).
// So entstehen Satteldach, Pultdach, Walmdach und Zeltdach aus einer Rechnung; First, Grate und Ortgang ergeben sich von selbst.
// Koordinaten: Grundriss (u, v) in mm, Höhe h in mm. Reine Rechnung, keine Abhängigkeit von three.js.
const rad = (g) => (g * Math.PI) / 180, EPS = 1e-6;
const flaecheVon = (p) => p.reduce((s, q, i) => s + q[0] * p[(i + 1) % p.length][1] - p[(i + 1) % p.length][0] * q[1], 0) / 2;
const gegenUhr = (p) => (flaecheVon(p) < 0 ? p.slice().reverse() : p);

// Halbebenen-Beschneiden (Sutherland–Hodgman): behält Punkte mit c0 + c1·u + c2·v ≥ 0
function beschneide(poly, [c0, c1, c2]) {
  const f = (p) => c0 + c1 * p[0] + c2 * p[1], out = [];
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i], b = poly[(i + 1) % poly.length], fa = f(a), fb = f(b);
    if (fa >= -EPS) out.push(a);
    if ((fa > EPS && fb < -EPS) || (fa < -EPS && fb > EPS)) { const t = fa / (fa - fb); out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]); }
  }
  return out.filter((p, i) => Math.hypot(p[0] - out[(i + out.length - 1) % out.length][0], p[1] - out[(i + out.length - 1) % out.length][1]) > 1e-4);
}
const schnittGerade = (a1, n1, a2, n2) => { // Geraden {p: n·p = d}: n1·x = d1, n2·x = d2
  const det = n1[0] * n2[1] - n1[1] * n2[0]; if (Math.abs(det) < 1e-12) return null;
  return [(a1 * n2[1] - a2 * n1[1]) / det, (n1[0] * a2 - n2[0] * a1) / det];
};

// grundriss: [[u,v]…] konvex; kanten[i] = { neigung: Grad oder null (= Giebel/Ortgang, keine Dachebene), ueberstand: mm } für die Kante i → i+1
export function dachFlaechen({ grundriss, kanten, traufhoehe }) {
  let poly = grundriss.map((p) => p.slice()), k = kanten.slice();
  if (flaecheVon(poly) < 0) { poly = poly.reverse(); k = k.reverse(); k.unshift(k.pop()); } // gegen den Uhrzeiger; Kanten bleiben bei ihren Punkten
  const n = poly.length, ebenen = [], aussen = [];
  // Aussenkante (Traufe + Überstand) und Dachebenen je Kante
  for (let i = 0; i < n; i++) {
    const A = poly[i], B = poly[(i + 1) % n], L = Math.hypot(B[0] - A[0], B[1] - A[1]) || 1, nu = [(B[1] - A[1]) / L, -(B[0] - A[0]) / L]; // nach aussen
    const ue = +k[i].ueberstand || 0, d0 = nu[0] * A[0] + nu[1] * A[1]; // Gerade n·p = d0 durch die Wand
    aussen.push({ nu, d: d0 + ue });
    if (k[i].neigung != null) { const t = Math.tan(rad(k[i].neigung)); ebenen.push({ kante: i, t, nu, d0, hoehe: (p) => traufhoehe + t * (d0 - (nu[0] * p[0] + nu[1] * p[1])) }); } // innen: wächst mit dem Abstand zur Wand
  }
  const huelle = aussen.map((e, i) => { const f = aussen[(i + n - 1) % n]; return schnittGerade(f.d, f.nu, e.d, e.nu) || poly[i]; });
  const flaechen = [];
  for (const e of ebenen) {
    let p = huelle.slice();
    for (const g of ebenen) {
      if (g === e) continue;
      // g darf nicht niedriger sein als e: z_g − z_e ≥ 0 (linear in u, v)
      const c0 = (g.t * g.d0 - e.t * e.d0), c1 = -g.t * g.nu[0] + e.t * e.nu[0], c2 = -g.t * g.nu[1] + e.t * e.nu[1];
      if (Math.abs(c1) < 1e-12 && Math.abs(c2) < 1e-12) { if (c0 < -EPS) p = []; continue; }
      p = beschneide(p, [c0, c1, c2]); if (p.length < 3) break;
    }
    if (p.length < 3 || Math.abs(flaecheVon(p)) < 1) continue;
    const pts = p.map((q) => [q[0], q[1], e.hoehe(q)]);
    // Kantenarten: auf der Aussenlinie = Traufe bzw. Ortgang; sonst First (waagrecht) oder Grat
    const seiten = pts.map((a, j) => {
      const b = pts[(j + 1) % pts.length];
      for (let m = 0; m < n; m++) { const o = aussen[m], da = o.nu[0] * a[0] + o.nu[1] * a[1] - o.d, db = o.nu[0] * b[0] + o.nu[1] * b[1] - o.d; if (Math.abs(da) < 1e-3 && Math.abs(db) < 1e-3) return k[m].neigung == null ? "ortgang" : "traufe"; }
      return Math.abs(a[2] - b[2]) < 1e-3 ? "first" : "grat";
    });
    const nz = Math.cos(Math.atan(e.t)), nrm = [e.nu[0] * Math.sin(Math.atan(e.t)), e.nu[1] * Math.sin(Math.atan(e.t)), nz]; // Flächennormale (nach oben/aussen)
    flaechen.push({ kante: e.kante, name: `Dachfläche ${flaechen.length + 1}`, neigung: (Math.atan(e.t) * 180) / Math.PI, azimut: (Math.atan2(e.nu[1], e.nu[0]) * 180) / Math.PI, normale: nrm, punkte: pts, seiten, flaeche: Math.abs(flaecheVon(p)) / nz / 1e6, grundflaeche: Math.abs(flaecheVon(p)) / 1e6 });
  }
  // First und Grate: gemeinsame Kanten zweier Dachflächen (je einmal)
  const linien = [], gesehen = new Set(), key = (a, b) => [a, b].map((q) => q.map((v) => Math.round(v)).join(",")).sort().join("|");
  for (const f of flaechen) f.punkte.forEach((a, j) => { const b = f.punkte[(j + 1) % f.punkte.length], s = f.seiten[j]; if (s !== "first" && s !== "grat") return; const kk = key(a, b); if (gesehen.has(kk)) return; gesehen.add(kk); linien.push({ art: s, von: a, bis: b, laenge: Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]) }); });
  const hoeheAn = (p) => ebenen.length ? Math.min(...ebenen.map((e) => e.hoehe(p))) : traufhoehe;
  return { flaechen, linien, huelle, grundriss: poly, hoeheAn, firsthoehe: Math.max(...flaechen.flatMap((f) => f.punkte.map((q) => q[2]))), traufhoehe };
}

// Wände des Gebäudeansatzes: je Grundrisskante ein senkrechtes Polygon bis zur Dachfläche (Giebel werden Dreiecke), dazu Boden und Dachfläche im Grundriss
export function waende(grundriss, dach) {
  const poly = dach.grundriss, n = poly.length, out = [];
  for (let i = 0; i < n; i++) {
    const A = poly[i], B = poly[(i + 1) % n], T = [0, 1];
    // Knickstellen der Höhenlinie entlang der Kante: Abtasten fein genug, dann kollineare Punkte weglassen
    const N = 64, pts = Array.from({ length: N + 1 }, (_, s) => { const t = s / N, p = [A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t]; return [p[0], p[1], dach.hoeheAn(p)]; });
    const knick = pts.filter((p, j) => j === 0 || j === N || Math.abs((p[2] - pts[j - 1][2]) - (pts[j + 1][2] - p[2])) > 1e-6);
    out.push({ kante: i, punkte: [[A[0], A[1], 0], [B[0], B[1], 0], ...knick.slice().reverse()] }); T.length;
  }
  return out;
}

// Grundformen mit Massen (Rechteck): Dachform → Kanten. Kanten 0 (v = 0), 1 (u = B), 2 (v = T), 3 (u = 0)
export function rechteckDach({ breite, tiefe, form = "sattel", neigung = 35, neigung2 = null, ueberstandTraufe = 400, ueberstandOrtgang = 300, firstRichtung = "laengs", traufhoehe = 3000 }) {
  const grundriss = [[0, 0], [breite, 0], [breite, tiefe], [0, tiefe]], n2 = neigung2 ?? neigung, ut = ueberstandTraufe, uo = ueberstandOrtgang;
  let kanten;
  if (form === "sattel") kanten = firstRichtung === "quer" ? [{ neigung: null, ueberstand: uo }, { neigung, ueberstand: ut }, { neigung: null, ueberstand: uo }, { neigung: n2, ueberstand: ut }] : [{ neigung, ueberstand: ut }, { neigung: null, ueberstand: uo }, { neigung: n2, ueberstand: ut }, { neigung: null, ueberstand: uo }];
  else if (form === "pult") kanten = firstRichtung === "quer" ? [{ neigung: null, ueberstand: uo }, { neigung: null, ueberstand: uo }, { neigung: null, ueberstand: uo }, { neigung, ueberstand: ut }] : [{ neigung, ueberstand: ut }, { neigung: null, ueberstand: uo }, { neigung: null, ueberstand: uo }, { neigung: null, ueberstand: uo }];
  else if (form === "zelt") kanten = [0, 1, 2, 3].map(() => ({ neigung, ueberstand: ut }));
  else kanten = [{ neigung, ueberstand: ut }, { neigung: n2, ueberstand: ut }, { neigung, ueberstand: ut }, { neigung: n2, ueberstand: ut }]; // walm
  return dachFlaechen({ grundriss, kanten, traufhoehe });
}
export const DACHFORMEN = { sattel: "Satteldach", pult: "Pultdach", walm: "Walmdach", zelt: "Zeltdach" };
