// Spengler Digital CAD – Kern: Quetschfalte an der Ecke zweier Aufkantungen (Rechnung wie im Fusion-Add-in, core/quetschfalte.py)
// Basisfläche in z = 0, Ecke O im Ursprung, Kante e1 = (1,0,0), e2 = (cos β, sin β, 0); die Basisfläche liegt zwischen e1 und e2.
// Aufkantung 1 steht an e1, Aufkantung 2 an e2 (Winkel φ, 90° = senkrecht). Die Wände schneiden sich in der Ecklinie ε.
// Im ebenen Zuschnitt haben die Flansche an O die Sektorwinkel γ1, γ2; der Rest ψ = 360° − β − γ1 − γ2 ist Überschuss. Er wird an seiner
// Winkelhalbierenden um 180° gefaltet (beide Seiten fallen aufeinander und liegen an ε) – das ist die Quetschfalte.
// Voraussetzung: symmetrische Ecke (Spitzen auf der Winkelhalbierenden). Aussenmasse bis zu den virtuellen Kanten, Biegezugaben nicht eingerechnet.
const D = Math.PI / 180, TOL = 1e-6;
const sk = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const kreuz = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const betrag = (a) => Math.sqrt(sk(a, a));
const norm = (a) => { const n = betrag(a); if (n < 1e-12) throw new Error("Entartete Richtung."); return a.map((x) => x / n); };
const winkel = (a, b) => Math.acos(Math.max(-1, Math.min(1, sk(norm(a), norm(b))))) / D;

export function eckeGeometrie(beta, phi1 = 90, phi2 = 90) {
  if (!(beta >= 10 && beta <= 170)) throw new Error(`Der Winkel zwischen den Kanten (${beta.toFixed(1)}°) muss zwischen 10° und 170° liegen.`);
  for (const p of [phi1, phi2]) if (!(p >= 20 && p <= 160)) throw new Error(`Aufkantungswinkel ${p.toFixed(1)}° unplausibel (erlaubt 20°–160°).`);
  const b = beta * D, z = [0, 0, 1], e1 = [1, 0, 0], e2 = [Math.cos(b), Math.sin(b), 0], f1 = [0, -1, 0], f2 = [-Math.sin(b), Math.cos(b), 0];
  const d1 = f1.map((v, i) => Math.cos(phi1 * D) * v + Math.sin(phi1 * D) * z[i]), d2 = f2.map((v, i) => Math.cos(phi2 * D) * v + Math.sin(phi2 * D) * z[i]);
  let eps = kreuz(kreuz(e1, d1), kreuz(e2, d2));
  if (betrag(eps) < 1e-9) throw new Error("Die Wände der beiden Aufkantungen sind parallel – keine Ecke.");
  eps = norm(eps); if (eps[2] < 0) eps = eps.map((x) => -x);
  if (eps[2] < 0.05) throw new Error("Die Ecklinie verläuft fast parallel zur Basisfläche – keine sinnvolle Ecke.");
  for (const [e, d, n] of [[e1, d1, "1"], [e2, d2, "2"]]) if (sk(eps, d) - sk(eps, e) * sk(e, d) <= 1e-9) throw new Error(`Aufkantung ${n}: die Ecklinie liegt nicht auf der Flanschseite (Winkel unplausibel).`);
  const gamma1 = winkel(e1, eps), gamma2 = winkel(e2, eps);
  return { beta, phi1, phi2, e1, e2, d1, d2, eps, gamma1, gamma2, psi: 360 - beta - gamma1 - gamma2 };
}

// Ebener Zuschnitt der Ecke (Ursprung = Ecke O). hoehe = Aufkantungshöhe von Flansch 1; Flansch 2 wird so hoch, dass die Oberkanten an ε zusammentreffen.
export function quetschZuschnitt(beta, hoehe, phi1 = 90, phi2 = 90, laenge = null) {
  const g = eckeGeometrie(beta, phi1, phi2), { gamma1: g1, gamma2: g2, psi } = g;
  if (!(hoehe > 0)) throw new Error("Die Aufkantungshöhe muss grösser als 0 sein.");
  if (!(psi >= 5 && psi <= 175)) throw new Error(`Der Überschuss ψ = ${psi.toFixed(1)}° liegt ausserhalb von 5°…175° – keine Quetschfalte möglich.`);
  const ell = hoehe / Math.sin(g1 * D), h2 = ell * Math.sin(g2 * D), L = laenge || 2.5 * Math.max(hoehe, h2) + 10;
  const a1 = (360 - g1) * D, a2 = (beta + g2) * D, P1 = [ell * Math.cos(a1), ell * Math.sin(a1)], P2 = [ell * Math.cos(a2), ell * Math.sin(a2)];
  const mid = a2 + (psi * D) / 2, d = [Math.cos(mid), Math.sin(mid)], f2 = [-Math.sin(beta * D), Math.cos(beta * D)];
  if (Math.abs(d[1]) < 1e-9 || Math.abs(d[0] * f2[0] + d[1] * f2[1]) < 1e-9) throw new Error("Die Winkelhalbierende verläuft parallel zu einer Oberkante – keine Spitze.");
  const t1 = -hoehe / d[1], t2 = h2 / (d[0] * f2[0] + d[1] * f2[1]);
  if (t1 <= ell || t2 <= ell) throw new Error("Die Spitze der Quetschfalte liegt vor der Ecklinie (Überschuss zu klein für diese Höhe).");
  if (Math.abs(t1 - t2) > 1e-6 * Math.max(t1, t2)) throw new Error(`Asymmetrische Ecke (Spitzen ${t1.toFixed(3)} / ${t2.toFixed(3)} mm): die Quetschfalte wäre nicht deckungsgleich – noch nicht unterstützt.`);
  const C = [t1 * d[0], t1 * d[1]], m = Math.hypot(C[0] - P1[0], C[1] - P1[1]), e2d = [Math.cos(beta * D), Math.sin(beta * D)];
  const ende1 = [L, -hoehe], ende2 = [h2 * f2[0] + L * e2d[0], h2 * f2[1] + L * e2d[1]], O = [0, 0];
  return { geometrie: g, hoehe1: hoehe, hoehe2: h2, ell, P1, P2, C, m, tSpitze: t1, laenge: L, beta, psi, gamma1: g1, gamma2: g2,
    kontur: [ende1, P1, C, P2, ende2], faltlinien: { e1: [O, [L, 0]], e2: [O, [L * e2d[0], L * e2d[1]]], eps1: [O, P1], eps2: [O, P2], quetsch: [O, C] } };
}

// Rechnerische Faltprobe: Seitenkanten beider Flansche landen auf derselben Ecklinie, gleich lang; die Spiegelung an der Winkelhalbierenden deckt die Seiten.
function rot(p, a, grad) { const c = Math.cos(grad * D), s = Math.sin(grad * D), k = kreuz(a, p), d = sk(a, p); return p.map((v, i) => v * c + k[i] * s + a[i] * d * (1 - c)); }
export function faltenPruefen(z) {
  const g = z.geometrie, p1 = rot([z.P1[0], z.P1[1], 0], g.e1, -g.phi1), p2 = rot([z.P2[0], z.P2[1], 0], g.e2, g.phi2), soll = g.eps.map((x) => z.ell * x);
  const dist = (a, b) => betrag(a.map((v, i) => v - b[i])), d = norm([z.C[0], z.C[1], 0]), k = 2 * (z.P2[0] * d[0] + z.P2[1] * d[1]);
  const sp = [k * d[0] - z.P2[0], k * d[1] - z.P2[1]], worst = Math.max(dist(p1, soll), dist(p2, soll), dist(p1, p2), Math.hypot(sp[0] - z.P1[0], sp[1] - z.P1[1]), Math.abs(Math.hypot(...z.P1) - Math.hypot(...z.P2)));
  return { ok: worst < TOL, abweichung: worst };
}

// Die gefaltete Quetschfalte als Dreieck (O, P, C') in lokalen Ecke-Koordinaten, auf Wand 1 (an e1) oder Wand 2 (an e2) gelegt
export function quetschDreieck(z, seite = "wand1") {
  const g = z.geometrie, P = g.eps.map((x) => z.ell * x), e = seite === "wand1" ? g.e1 : g.e2;
  return { O: [0, 0, 0], P, C: P.map((v, i) => v + z.m * e[i]) };
}

// DXF (R12) des Eckzuschnitts: Kontur, Biegelinien (blau), Quetschfalte (rot), Seitenkanten
export function quetschDxf(z, titel = "Quetschfalte") {
  const o = ["0", "SECTION", "2", "ENTITIES"], f = (v) => v.toFixed(4);
  const linie = (lay, a, b, farbe) => o.push("0", "LINE", "8", lay, "62", String(farbe), "10", f(a[0]), "20", f(a[1]), "30", "0", "11", f(b[0]), "21", f(b[1]), "31", "0");
  const K = z.kontur; for (let i = 1; i < K.length; i++) linie("ZUSCHNITT", K[i - 1], K[i], 7);
  linie("ZUSCHNITT", K[0], [z.laenge, 0], 7); linie("ZUSCHNITT", K.at(-1), [z.laenge * Math.cos(z.beta * D), z.laenge * Math.sin(z.beta * D)], 7);
  linie("BIEGELINIE", ...z.faltlinien.e1, 5); linie("BIEGELINIE", ...z.faltlinien.e2, 5); linie("QUETSCHFALTE", ...z.faltlinien.quetsch, 1);
  linie("HILFSLINIE", ...z.faltlinien.eps1, 8); linie("HILFSLINIE", ...z.faltlinien.eps2, 8);
  o.push("0", "TEXT", "8", "BESCHRIFTUNG", "62", "7", "10", f(0), "20", f(-z.hoehe1 - 12), "30", "0", "40", "4.00", "1", `${titel} - beta ${z.beta.toFixed(1)} Grad, Hoehe ${z.hoehe1.toFixed(1)} / ${z.hoehe2.toFixed(1)} mm, Ueberschuss ${z.psi.toFixed(1)} Grad`);
  o.push("0", "ENDSEC", "0", "EOF"); return o.join("\n");
}
