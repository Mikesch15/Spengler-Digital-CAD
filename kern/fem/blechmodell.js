// Spengler Digital CAD – Kern: Schalenmodell aus Blech-Quellen (Profil/Vorlage/Blech-Linienzug und Flächenblech)
import { polylinie } from "../geometrie.js";
import { Modell, plattenAdd, streifenAdd, flaecheVon } from "./netz.js";

const X_START = 100; // Länge des Anfangsschenkels beim Rechnen der Bausteinprofile (siehe kern/flaechenblech.js)

// Profil: Mittellinie der Querschnitte, in der Ebene (o + x·u + y·v), von z0 bis z1 in Richtung n gezogen
// q = { art: "profil", name, t, pfad (Mittellinie als Pfad der Profilrechnung), versatz: [dx,dy], ebene: {o,u,v,n}, z0, z1 }
export function profilQuelle(M, q, h) {
  const lin = polylinie(q.pfad, 30).map(([x, y]) => [x + (q.versatz?.[0] || 0), y + (q.versatz?.[1] || 0)]);
  const e = q.ebene; return streifenAdd(M, lin, q.z0, q.z1, h, q.t, e.o, e.u, e.v, e.n, q.name);
}

// Flächenblech: Platte (Polygon pts, gegen den Uhrzeigersinn) mit Flanschen an den Kantengruppen
// q = { art: "flaeche", name, t, pts, gruppen, profile, ebene: {o,u,v,n}, seite: ±1 }
export function flaechenQuelle(M, q, h) {
  const e = q.ebene, s = q.seite === -1 ? -1 : 1, ids = [];
  const at = (a, b) => [e.o[0] + e.u[0] * a + e.v[0] * b, e.o[1] + e.u[1] * a + e.v[1] * b, e.o[2] + e.u[2] * a + e.v[2] * b];
  ids.push(plattenAdd(M, q.pts, h, q.t, e.o, e.u, e.v, q.name + " · Fläche", q.loecher || []));
  q.gruppen.forEach((g, k) => {
    const p = q.profile?.[k]; if (!p?.res?.pfad) return;
    const lin = polylinie(p.res.pfad, 30).map(([x, y]) => [x - X_START + (p.versatz || 0), y]);
    let i0 = lin.findIndex((c) => c[0] >= -1e-9); if (i0 < 0) return;
    let L = lin.slice(i0); if (i0 > 0) { const a = lin[i0 - 1], b = lin[i0], f = (0 - a[0]) / (b[0] - a[0] || 1); L = [[0, a[1] + f * (b[1] - a[1])], ...L]; }
    L = [[0, 0], ...L]; // Biegezone über der Platte wird zum Fuß des Flanschs an der Plattenkante zusammengezogen
    L = L.filter((c, i) => i === 0 || Math.hypot(c[0] - L[i - 1][0], c[1] - L[i - 1][1]) > 1e-6); if (L.length < 2) return;
    for (let i = 1; i < g.punkte.length; i++) {
      const a = g.punkte[i - 1], b = g.punkte[i], len = Math.hypot(b[0] - a[0], b[1] - a[1]); if (len < 1e-6) continue;
      const d = [(b[0] - a[0]) / len, (b[1] - a[1]) / len];
      const ex = [d[1] * e.u[0] - d[0] * e.v[0], d[1] * e.u[1] - d[0] * e.v[1], d[1] * e.u[2] - d[0] * e.v[2]], ez = [d[0] * e.u[0] + d[1] * e.v[0], d[0] * e.u[1] + d[1] * e.v[1], d[0] * e.u[2] + d[1] * e.v[2]], ey = [s * e.n[0], s * e.n[1], s * e.n[2]];
      ids.push(streifenAdd(M, L, 0, len, h, q.t, at(a[0], a[1]), ex, ey, ez, `${q.name} · Kante ${k + 1}`));
    }
  });
  return ids;
}

// Gesamtfläche (mm²) eines Quellenlistenelements – für die automatische Netzfeinheit
function groesse(q) {
  if (q.art === "profil") { const lin = polylinie(q.pfad, 30); let l = 0; for (let i = 1; i < lin.length; i++) l += Math.hypot(lin[i][0] - lin[i - 1][0], lin[i][1] - lin[i - 1][1]); return l * Math.abs(q.z1 - q.z0); }
  let A = Math.abs(flaecheVon(q.pts)); q.gruppen.forEach((g, k) => { const p = q.profile?.[k]; if (!p?.res?.pfad) return; const lin = polylinie(p.res.pfad, 30); let l = 0; for (let i = 1; i < lin.length; i++) l += Math.hypot(lin[i][0] - lin[i - 1][0], lin[i][1] - lin[i - 1][1]); let pl = 0; for (let i = 1; i < g.punkte.length; i++) pl += Math.hypot(g.punkte[i][0] - g.punkte[i - 1][0], g.punkte[i][1] - g.punkte[i - 1][1]); A += Math.max(0, l - 60) * pl; }); return A;
}

// Modell bauen; h = gewünschte Elementgrösse (mm) oder null → automatisch (≈ zielKnoten Knoten)
export function baueModell(quellen, h = null, zielKnoten = 2500) {
  const A = quellen.reduce((s, q) => s + groesse(q), 0), dicken = quellen.map((q) => q.t);
  let hh = h && h > 0 ? h : Math.sqrt(A / zielKnoten), M;
  for (let versuch = 0; versuch < 6; versuch++) {
    M = new Modell(); M.h = hh; M.quellen = [];
    for (const q of quellen) { const ids = q.art === "profil" ? [profilQuelle(M, q, hh)] : flaechenQuelle(M, q, hh); M.quellen.push({ name: q.name, flaechen: ids }); }
    if (M.nodes.length <= 1.6 * zielKnoten || (h && h > 0)) break; hh *= Math.sqrt(M.nodes.length / zielKnoten) * 0.95;
  }
  if (!M.tris.length) throw new Error("Kein Blech zum Berechnen gefunden");
  M.dickeMin = Math.min(...dicken); return M;
}
