// Spengler Digital CAD – Kern: Dach aus frei gezeichneten Dachflächen (mm-genau)
// Jede Fläche ist ein ebenes Vieleck [[u, v, h] …] (z. B. aus einer Skizze auf einer geneigten Ebene). Daraus entsteht dasselbe Ergebnis wie bei der automatischen Dachform:
// Flächen (bei einspringenden Ecken in konvexe Stücke zerlegt), First/Grat/Kehle, Höhe über jedem Punkt, Hinweise (Ebenheit, Anschluss der Nachbarkanten).
import { dachSegmente } from "./bleche.js";
const sub = (a, b) => a.map((x, i) => x - b[i]), len = (a) => Math.hypot(...a), cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const area2 = (p) => p.reduce((s, q, i) => { const r = p[(i + 1) % p.length]; return s + q[0] * r[1] - r[0] * q[1]; }, 0) / 2;
const links = (a, b, c) => (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);

// Einfaches Vieleck (gegen den Uhrzeiger) in konvexe Stücke zerlegen: Ohren abschneiden, danach benachbarte Dreiecke verschmelzen, solange das Ergebnis konvex bleibt
export function zerlegeKonvex(poly) {
  const P = area2(poly) < 0 ? poly.slice().reverse() : poly.slice(), idx = P.map((_, i) => i), tris = [];
  const inDreieck = (p, a, b, c) => links(a, b, p) > 1e-9 && links(b, c, p) > 1e-9 && links(c, a, p) > 1e-9;
  let schutz = 0;
  while (idx.length > 3 && schutz++ < 10000) {
    let ok = false;
    for (let i = 0; i < idx.length; i++) {
      const a = idx[(i + idx.length - 1) % idx.length], b = idx[i], c = idx[(i + 1) % idx.length];
      if (links(P[a], P[b], P[c]) <= 1e-9) continue; // nicht konvex
      if (idx.some((k) => k !== a && k !== b && k !== c && inDreieck(P[k], P[a], P[b], P[c]))) continue;
      tris.push([a, b, c]); idx.splice(i, 1); ok = true; break;
    }
    if (!ok) { // kollineare Punkte entfernen und weiter
      const k = idx.findIndex((_, i) => Math.abs(links(P[idx[(i + idx.length - 1) % idx.length]], P[idx[i]], P[idx[(i + 1) % idx.length]])) <= 1e-9);
      if (k < 0) throw new Error("Die Dachfläche ist kein einfaches Vieleck (Linien kreuzen sich)"); idx.splice(k, 1);
    }
  }
  if (idx.length === 3 && links(P[idx[0]], P[idx[1]], P[idx[2]]) > 1e-9) tris.push([...idx]);
  let teile = tris.map((t) => t.slice()), geaendert = true;
  const konvexIdx = (v) => v.every((_, i) => links(P[v[(i + v.length - 1) % v.length]], P[v[i]], P[v[(i + 1) % v.length]]) >= -1e-9);
  while (geaendert) {
    geaendert = false;
    outer: for (let i = 0; i < teile.length; i++) for (let j = i + 1; j < teile.length; j++) {
      const A = teile[i], B = teile[j];
      for (let a = 0; a < A.length; a++) { const a0 = A[a], a1 = A[(a + 1) % A.length], b = B.findIndex((x, k) => x === a1 && B[(k + 1) % B.length] === a0); if (b < 0) continue;
        // A: … a0 a1 …, B: … a1 a0 … → zusammensetzen
        const rotA = [...A.slice(a + 1), ...A.slice(0, a + 1)]; // beginnt bei a1, endet bei a0
        const rotB = [...B.slice(b + 1), ...B.slice(0, b + 1)]; // beginnt bei a0, endet bei a1
        const neu = [...rotA, ...rotB.slice(1, -1)]; // a1 … a0, dann B ohne a0 und a1
        if (konvexIdx(neu)) { teile[i] = neu; teile.splice(j, 1); geaendert = true; break outer; }
      }
    }
  }
  return teile.map((t) => t.map((k) => P[k]));
}

function flaecheAus(pts, name, i) {
  let P = pts.filter((p, k) => len(sub(p, pts[(k + pts.length - 1) % pts.length])) > 0.5);
  if (P.length > 1 && len(sub(P[0], P.at(-1))) < 0.5) P.pop();
  if (P.length < 3) throw new Error(`${name}: weniger als 3 Eckpunkte`);
  let n = [0, 0, 0]; for (let k = 0; k < P.length; k++) { const c = cross(P[k], P[(k + 1) % P.length]); n = n.map((x, j) => x + c[j]); }
  if (len(n) < 1e-6) throw new Error(`${name}: Fläche ohne Ausdehnung`);
  n = n.map((x) => x / len(n)); if (n[2] < 0) { n = n.map((x) => -x); P = P.slice().reverse(); }
  if (n[2] < 0.05) throw new Error(`${name} steht (fast) senkrecht – Dachflächen müssen geneigt oder waagrecht sein`);
  if (area2(P) < 0) P = P.slice().reverse();
  const c = P.reduce((m, p) => m.map((x, j) => x + p[j] / P.length), [0, 0, 0]), dev = Math.max(...P.map((p) => Math.abs((p[0] - c[0]) * n[0] + (p[1] - c[1]) * n[1] + (p[2] - c[2]) * n[2])));
  const h = (u, v) => c[2] - (n[0] * (u - c[0]) + n[1] * (v - c[1])) / n[2], heben = (p) => [p[0], p[1], h(p[0], p[1])];
  const plan = P.map((p) => [p[0], p[1]]), teile = zerlegeKonvex(plan), g = Math.abs(area2(plan));
  return { flaeche: { kante: i, name, neigung: (Math.acos(Math.min(1, n[2])) * 180) / Math.PI, azimut: (Math.atan2(n[1], n[0]) * 180) / Math.PI, normale: n, punkte: P.map((p) => heben(p)), ...(teile.length > 1 ? { stuecke: teile.map((t) => t.map(heben)) } : {}), seiten: [], flaeche: g / n[2] / 1e6, grundflaeche: g / 1e6 }, abweichung: dev };
}

// flaechen: [{ name, punkte: [[u, v, h] …] }]; grundriss: Umriss des Gebäudes [[u, v] …] (für die Wände); traufhoehe: Wandhöhe
export function dachAusFlaechen({ flaechen, grundriss, traufhoehe }) {
  if (!flaechen?.length) throw new Error("Keine Dachfläche – Skizzen mit geschlossenen Flächen wählen");
  const hinweise = [], fl = [];
  flaechen.forEach((f, i) => { const r = flaecheAus(f.punkte, f.name || `Dachfläche ${i + 1}`, i); if (r.abweichung > 2) hinweise.push(`${r.flaeche.name}: Punkte liegen nicht in einer Ebene (Abweichung ${r.abweichung.toFixed(1)} mm)`); fl.push(r.flaeche); });
  // gemeinsame Kanten: Endpunkte dürfen höchstens 1 mm voneinander abweichen
  const kanten = fl.map((f) => f.punkte.map((a, k) => [a, f.punkte[(k + 1) % f.punkte.length]]));
  for (let i = 0; i < fl.length; i++) for (let j = i + 1; j < fl.length; j++) for (const [a, b] of kanten[i]) for (const [c, d] of kanten[j]) {
    const x = Math.max(len(sub(a, c)), len(sub(b, d))), y = Math.max(len(sub(a, d)), len(sub(b, c))), m = Math.min(x, y);
    if (m > 1 && m < 60 && len(sub(a, b)) > 200) hinweise.push(`${fl[i].name} und ${fl[j].name}: gemeinsame Kante weicht um ${m.toFixed(1)} mm ab`);
  }
  const linien = dachSegmente(fl).filter((s) => ["first", "grat", "kehle"].includes(s.art)).map((s) => ({ art: s.art, von: s.von, bis: s.bis, laenge: s.laenge }));
  const enthalten = (poly, p) => { let drin = false; for (let a = 0, b = poly.length - 1; a < poly.length; b = a++) { const [xi, yi] = poly[a], [xj, yj] = poly[b]; if ((yi > p[1]) !== (yj > p[1]) && p[0] < ((xj - xi) * (p[1] - yi)) / (yj - yi) + xi) drin = !drin; } return drin; };
  const ebenen = fl.map((f) => { const n = f.normale, p = f.punkte[0]; return { f, h: (u, v) => p[2] - (n[0] * (u - p[0]) + n[1] * (v - p[1])) / n[2], poly: f.punkte.map((q) => [q[0], q[1]]) }; });
  const hoeheAn = (p) => { let h = -Infinity; for (const e of ebenen) if (enthalten(e.poly, p)) h = Math.max(h, e.h(p[0], p[1])); return h === -Infinity ? traufhoehe : h; };
  return { flaechen: fl, linien, huelle: grundriss, grundriss, hoeheAn, firsthoehe: Math.max(...fl.flatMap((f) => f.punkte.map((q) => q[2]))), traufhoehe, hinweise, fluegel: [] };
}
