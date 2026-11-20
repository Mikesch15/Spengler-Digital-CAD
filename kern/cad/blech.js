// Spengler Digital CAD – Blech → Bauanweisungen für den CAD-Kern (rein, ohne Kern)
// Aus der Mittellinie von kern/geometrie.js berechne() entsteht der geschlossene Querschnitt mit Dicke t
// (Linien und exakte Bögen). Der Kern extrudiert ihn; Abwicklung und 3D stammen so aus derselben Rechnung.

// Querschnitt aus berechne()-Ergebnis. Rückgabe: { profil, mitte (Länge der Mittellinie), theta (Summe Biegewinkel, rad) }
export function blechQuerschnitt(res, t) {
  if (!(t > 0)) throw new Error("Blechdicke muss grösser als 0 sein");
  const seiten = (s) => res.pfad.map((g) => {
    const tang = (p) => g.typ === "linie"
      ? [g.p2[0] - g.p1[0], g.p2[1] - g.p1[1]]
      : (([dx, dy]) => (g.winkel > 0 ? [-dy, dx] : [dy, -dx]))([p[0] - g.zentrum[0], p[1] - g.zentrum[1]]);
    const off = (p) => { const [tx, ty] = tang(p), l = Math.hypot(tx, ty); return [p[0] - (s * ty / l) * t / 2, p[1] + (s * tx / l) * t / 2]; };
    return { a: off(g.p1), m: g.typ === "bogen" ? off(g.pm) : null, b: off(g.p2) };
  });
  const L = seiten(1), R = seiten(-1).reverse(), segmente = [];
  for (const g of L) segmente.push(g.m ? { bis: g.b, bogenMitte: g.m } : { bis: g.b });
  segmente.push({ bis: R[0].b });
  for (const g of R) segmente.push(g.m ? { bis: g.a, bogenMitte: g.m } : { bis: g.a });
  let mitte = 0, theta = 0;
  for (const g of res.pfad) {
    if (g.typ === "linie") mitte += Math.hypot(g.p2[0] - g.p1[0], g.p2[1] - g.p1[1]);
    else { const w = (Math.abs(g.winkel) * Math.PI) / 180; mitte += g.rm * w; theta += w; }
  }
  return { profil: { start: L[0].a, segmente }, mitte, theta };
}

// Profil verschieben (2D)
export function verschiebeProfil(p, du, dv) {
  const v = (q) => [q[0] + du, q[1] + dv];
  return { start: v(p.start), segmente: p.segmente.map((s) => ({ bis: v(s.bis), ...(s.bogenMitte ? { bogenMitte: v(s.bogenMitte) } : {}) })) };
}
export const profilGrenzen = (p) => {
  const pts = [p.start, ...p.segmente.flatMap((s) => [s.bis, s.bogenMitte].filter(Boolean))];
  return { u0: Math.min(...pts.map((q) => q[0])), u1: Math.max(...pts.map((q) => q[0])), v0: Math.min(...pts.map((q) => q[1])), v1: Math.max(...pts.map((q) => q[1])) };
};

// Kommandos für ein extrudiertes Blechteil (Querschnitt in XY, Länge entlang +Z)
export const blechExtrusion = (q, laenge) => ({ op: "extrusion", profil: q.profil, hoehe: laenge });
// Zuschnitt aus dem exakten 3D-Körper (Gegenprüfung): V = t · L_Mitte · Länge  →  L_K-Faser = L_Mitte + (k − ½)·t·Σθ
export const zuschnittAusVolumen = (volumen, t, laenge, k, theta) => volumen / (t * laenge) + (k - 0.5) * t * theta;
