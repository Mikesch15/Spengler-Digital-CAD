// Spengler Digital CAD – Kern: zusammengesetzte Grundrisse (L, T, U) mit Satteldach oder Walmdach, Kehlen und Kreuzgiebel
// Verfahren: Jeder Flügel ist ein Rechteck mit eigenem Dach (form.js); die Dachhöhe des Ganzen ist an jedem Punkt die höchste Flügelhöhe.
// Dachfläche = Teil einer Flügelebene, in dem diese Ebene oben liegt (Kehlen entstehen, wo zwei Flügelebenen sich schneiden).
import { dachFlaechen, beschneide, flaecheVon } from "./form.js";
const EPS = 1e-6, rad = (g) => (g * Math.PI) / 180;

export const GRUNDFORMEN = { rechteck: "Rechteck", L: "L-Form", T: "T-Form", U: "U-Form", skizze: "Aus Skizze (konvex)" };
// Umriss (gegen den Uhrzeiger) und Flügel-Rechtecke der Grundformen. Hauptflügel: [0,0]–[B,T]; Querflügel ragen um ft über die Rückseite (v = T) hinaus
export function grundrissForm({ form = "rechteck", breite: B, tiefe: T, fluegelBreite: fb = B / 3, fluegelTiefe: ft = T / 2 }) {
  fb = Math.min(Math.max(fb, 1), form === "U" ? B / 2 - 1 : B - 1);
  if (form === "L") return { grundriss: [[0, 0], [B, 0], [B, T], [fb, T], [fb, T + ft], [0, T + ft]], fluegel: [[0, fb]] };
  if (form === "T") { const x0 = (B - fb) / 2, x1 = x0 + fb; return { grundriss: [[0, 0], [B, 0], [B, T], [x1, T], [x1, T + ft], [x0, T + ft], [x0, T], [0, T]], fluegel: [[x0, x1]] }; }
  if (form === "U") return { grundriss: [[0, 0], [B, 0], [B, T + ft], [B - fb, T + ft], [B - fb, T], [fb, T], [fb, T + ft], [0, T + ft]], fluegel: [[0, fb], [B - fb, B]] };
  return { grundriss: [[0, 0], [B, 0], [B, T], [0, T]], fluegel: [] };
}

// Ebene aus einer Dachfläche: h = a + b·u + c·v
const ebeneVon = (f) => { const n = f.normale, p = f.punkte[0], b = -n[0] / n[2], c = -n[1] / n[2]; return { a: p[2] - b * p[0] - c * p[1], b, c }; };
const hoehe = (e, p) => e.a + e.b * p[0] + e.c * p[1];
const flaechePoly = (p) => Math.abs(flaecheVon(p));
const gleich = (e, g) => Math.abs(e.a - g.a) < 1e-3 && Math.abs(e.b - g.b) < 1e-9 && Math.abs(e.c - g.c) < 1e-9;
// Konvexes Polygon (CCW) → Halbebenen [c0, c1, c2] mit c0 + c1·u + c2·v ≥ 0 (innen)
export const kantenEbenen = (poly) => poly.map((a, i) => { const b = poly[(i + 1) % poly.length], du = b[0] - a[0], dv = b[1] - a[1]; return [dv * a[0] - du * a[1], -dv, du]; }); // links der Kante a→b
const inHuelle = (poly, p) => poly.every((a, i) => { const b = poly[(i + 1) % poly.length], L = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1; return ((b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0])) / L >= -1e-3; });
// Teil von poly ausserhalb des konvexen Bereichs {alle Halbebenen ≥ 0}: disjunkte konvexe Stücke
export function abziehen(poly, hps) {
  const out = []; let cur = poly;
  for (const g of hps) {
    const aussen = beschneide(cur, [-g[0], -g[1], -g[2]]); if (aussen.length >= 3 && flaechePoly(aussen) > 500) out.push(aussen);
    cur = beschneide(cur, g); if (cur.length < 3) break;
  }
  return out;
}

// Dachkanten eines Flügels (Kanten 0 unten v0, 1 rechts u1, 2 oben v1, 3 links u0)
function kantenHaupt(form, n, n2, ut, uo) { return form === "sattel" ? [{ neigung: n, ueberstand: ut }, { neigung: null, ueberstand: uo }, { neigung: n2, ueberstand: ut }, { neigung: null, ueberstand: uo }] : [{ neigung: n, ueberstand: ut }, { neigung: n2, ueberstand: ut }, { neigung: n, ueberstand: ut }, { neigung: n2, ueberstand: ut }]; }
function kantenQuer(form, n, n2, ut, uo) { return form === "sattel" ? [{ neigung: null, ueberstand: 0 }, { neigung: n, ueberstand: ut }, { neigung: null, ueberstand: uo }, { neigung: n, ueberstand: ut }] : [{ neigung: n2, ueberstand: ut }, { neigung: n, ueberstand: ut }, { neigung: n2, ueberstand: ut }, { neigung: n, ueberstand: ut }]; }

export function fluegelDach({ grundform, form = "sattel", neigung = 35, neigung2 = null, ueberstandTraufe = 400, ueberstandOrtgang = 300, traufhoehe = 3000 }) {
  if (form !== "sattel" && form !== "walm") throw new Error("L-, T- und U-Grundrisse: bitte Satteldach oder Walmdach wählen");
  const { breite: B, tiefe: T } = grundform, { grundriss, fluegel } = grundrissForm(grundform), ft = grundform.fluegelTiefe ?? T / 2;
  const n = neigung, n2 = neigung2 ?? neigung, t1 = Math.tan(rad(n)), t2 = Math.tan(rad(n2)), ut = ueberstandTraufe, uo = ueberstandOrtgang;
  const rects = [{ name: "Hauptflügel", poly: [[0, 0], [B, 0], [B, T], [0, T]], kanten: kantenHaupt(form, n, n2, ut, uo) }];
  const vr = form === "sattel" ? (t2 * T) / (t1 + t2) : 0; // Sattel: Querflügel enden am First des Hauptflügels
  const hinweise = [];
  fluegel.forEach(([u0, u1], i) => { rects.push({ name: `Querflügel ${i + 1}`, poly: [[u0, vr], [u1, vr], [u1, T + ft], [u0, T + ft]], kanten: kantenQuer(form, n, n2, ut, uo) }); if (form === "sattel" && t1 * (u1 - u0) / 2 > t1 * vr + 1) hinweise.push(`Querflügel ${i + 1} ist breiter als der Hauptflügel – er ragt über dessen First.`); });
  const W = rects.map((r) => { const d = dachFlaechen({ grundriss: r.poly, kanten: r.kanten, traufhoehe }); return { ...r, d, ebenen: d.flaechen.map(ebeneVon), hull: d.huelle }; });
  // Je Fläche: nur dort, wo ihre Ebene oben liegt
  const flaechen = [];
  W.forEach((w, wi) => w.d.flaechen.forEach((fl, fi) => {
    const P = w.ebenen[fi]; let stuecke = [fl.punkte.map((p) => [p[0], p[1]])];
    W.forEach((v, vi) => {
      if (vi === wi || !stuecke.length) return;
      const hps = kantenEbenen(v.hull); let leer = false;
      for (const Q of v.ebenen) {
        if (gleich(Q, P)) { if (vi > wi) { leer = true; break; } continue; } // gleiche Ebene: der frühere Flügel behält sie
        const g = [Q.a - P.a, Q.b - P.b, Q.c - P.c]; hps.push(g);
      }
      if (leer) return;
      stuecke = stuecke.flatMap((s) => abziehen(s, hps));
    });
    if (!stuecke.length) return;
    const pts = stuecke.map((s) => s.map((p) => [p[0], p[1], hoehe(P, p)])), nz = fl.normale[2], g = stuecke.reduce((s, x) => s + flaechePoly(x), 0);
    flaechen.push({ kante: wi * 10 + fl.kante, fluegel: w.name, name: `Dachfläche ${flaechen.length + 1}`, neigung: fl.neigung, azimut: fl.azimut, normale: fl.normale, punkte: pts[0], stuecke: pts, flaeche: g / nz / 1e6, grundflaeche: g / 1e6 });
  }));
  // First / Grat / Kehle: gemeinsame Kanten zweier Flächen (überlappende Strecken)
  const kanten3 = flaechen.map((f) => f.stuecke.flatMap((s) => s.map((a, j) => [a, s[(j + 1) % s.length]])));
  const linien = [], mitte = flaechen.map((f) => { const s = f.stuecke[0]; return s.reduce((m, p) => m.map((x, i) => x + p[i] / s.length), [0, 0, 0]); });
  for (let i = 0; i < flaechen.length; i++) for (let j = i + 1; j < flaechen.length; j++) {
    for (const [a, b] of kanten3[i]) for (const [c, d] of kanten3[j]) {
      const v = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], L = Math.hypot(...v); if (L < 1) continue; const e = v.map((x) => x / L);
      const dist = (p) => { const w = [p[0] - a[0], p[1] - a[1], p[2] - a[2]], s = w[0] * e[0] + w[1] * e[1] + w[2] * e[2]; return [Math.hypot(w[0] - e[0] * s, w[1] - e[1] * s, w[2] - e[2] * s), s]; };
      const [dc, sc] = dist(c), [dd, sd] = dist(d); if (dc > 1 || dd > 1) continue;
      const s0 = Math.max(0, Math.min(sc, sd)), s1 = Math.min(L, Math.max(sc, sd)); if (s1 - s0 < 1) continue;
      const p0 = a.map((x, k) => x + e[k] * s0), p1 = a.map((x, k) => x + e[k] * s1), nf = flaechen[i].normale, dm = mitte[j].map((x, k) => x - p0[k]), s = dm[0] * nf[0] + dm[1] * nf[1] + dm[2] * nf[2];
      if (Math.abs(s) < 1e-3) continue; // gleiche Ebene
      const waag = Math.abs(p0[2] - p1[2]) < 1e-3, art = s < 0 ? (waag ? "first" : "grat") : "kehle";
      linien.push({ art, von: p0, bis: p1, laenge: Math.hypot(p1[0] - p0[0], p1[1] - p0[1], p1[2] - p0[2]), flaechen: [i, j] });
    }
  }
  const hoeheAn = (p) => { let h = -Infinity; for (const w of W) if (inHuelle(w.hull, p)) h = Math.max(h, Math.min(...w.ebenen.map((e) => hoehe(e, p)))); return h === -Infinity ? traufhoehe : h; };
  return { flaechen, linien, huelle: W[0].hull, grundriss, hoeheAn, firsthoehe: Math.max(...flaechen.flatMap((f) => f.punkte.map((q) => q[2]))), traufhoehe, hinweise, fluegel: W.map((w) => w.name) };
}

// Beliebiger konvexer Grundriss (z. B. aus einer Skizze): überall dieselbe Neigung; giebel = Kantennummern (ab 1, in Umlaufrichtung gegen den Uhrzeiger) ohne Dachfläche (Ortgang), alle übrigen Kanten sind Traufen (Walm-/Zeltdach)
export const gegenUhrzeiger = (p) => (flaecheVon(p) < 0 ? p.slice().reverse() : p.slice());
export function konvex(p) { let v = 0; for (let i = 0; i < p.length; i++) { const a = p[i], b = p[(i + 1) % p.length], c = p[(i + 2) % p.length], k = (b[0] - a[0]) * (c[1] - b[1]) - (b[1] - a[1]) * (c[0] - b[0]); if (Math.abs(k) < 1e-6) continue; if (v && Math.sign(k) !== v) return false; v = Math.sign(k); } return true; }
export function polygonDach({ grundriss, neigung = 35, giebel = [], ueberstandTraufe = 400, ueberstandOrtgang = 300, traufhoehe = 3000 }) {
  const poly = gegenUhrzeiger(grundriss).filter((q, i, a) => Math.hypot(q[0] - a[(i + a.length - 1) % a.length][0], q[1] - a[(i + a.length - 1) % a.length][1]) > 1e-3);
  if (poly.length < 3) throw new Error("Der Grundriss braucht mindestens 3 Ecken");
  if (!konvex(poly)) throw new Error("Der Skizzen-Grundriss muss konvex sein (keine einspringenden Ecken). Für L-, T- und U-Formen die Grundform wählen.");
  const G = new Set(giebel.map((x) => x - 1)), kanten = poly.map((_, i) => (G.has(i) ? { neigung: null, ueberstand: ueberstandOrtgang } : { neigung, ueberstand: ueberstandTraufe }));
  if (G.size >= poly.length) throw new Error("Mindestens eine Kante muss eine Dachfläche tragen (nicht alle Kanten Giebel)");
  const d = dachFlaechen({ grundriss: poly, kanten, traufhoehe });
  return { ...d, hinweise: [] };
}
