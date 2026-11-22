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

// Ebener Zuschnitt der Ecke (Ursprung = Ecke O, Abstände ab den Biegelinien e1/e2). Beliebige Winkel φ1/φ2 und unterschiedliche Flanschhöhen h1/h2
// (Höhe = Abstand der Oberkante von der Biegelinie in der Flanschebene). Die Seitenkanten der Flansche treffen sich als Ecklinie ε, ihre Längen
// s1 = h1/sin γ1 und s2 = h2/sin γ2 sind verschieden: bis s* = min(s1, s2) laufen beide Flansche an ε zusammen, dort liegt die Quetschfalte;
// der höhere Flansch behält darüber seine freie Seitenkante. Die Spitze C liegt auf der Winkelhalbierenden des Überschusses, in der Verlängerung
// der Oberkante des niedrigeren Flansches.
export function quetschZuschnitt(beta, hoehe, phi1 = 90, phi2 = 90, laenge = null, hoehe2 = null) {
  const g = eckeGeometrie(beta, phi1, phi2), { gamma1: g1, gamma2: g2, psi } = g;
  if (!(hoehe > 0)) throw new Error("Die Aufkantungshöhe muss grösser als 0 sein.");
  if (!(psi >= 5 && psi <= 175)) throw new Error(`Der Überschuss ψ = ${psi.toFixed(1)}° liegt ausserhalb von 5°…175° – keine Quetschfalte möglich.`);
  const s1 = hoehe / Math.sin(g1 * D), h2 = hoehe2 > 0 ? hoehe2 : s1 * Math.sin(g2 * D), s2 = h2 / Math.sin(g2 * D), sS = Math.min(s1, s2);
  const L = laenge || 2.5 * Math.max(hoehe, h2) + 10;
  const a1 = (360 - g1) * D, a2 = (beta + g2) * D, pol = (r, a) => [r * Math.cos(a), r * Math.sin(a)];
  const P1 = pol(s1, a1), P2 = pol(s2, a2), P1s = pol(sS, a1), P2s = pol(sS, a2);
  const mid = a2 + (psi * D) / 2, d = [Math.cos(mid), Math.sin(mid)], f2 = [-Math.sin(beta * D), Math.cos(beta * D)];
  if (Math.abs(d[1]) < 1e-9 || Math.abs(d[0] * f2[0] + d[1] * f2[1]) < 1e-9) throw new Error("Die Winkelhalbierende verläuft parallel zu einer Oberkante – keine Spitze.");
  const t1 = -hoehe / d[1], t2 = h2 / (d[0] * f2[0] + d[1] * f2[1]), tC = s1 <= s2 ? t1 : t2; // Spitze in der Verlängerung der Oberkante des niedrigeren Flansches
  if (tC <= sS * (1 + 1e-9)) throw new Error("Die Spitze der Quetschfalte liegt vor der Ecklinie (Überschuss zu klein für diese Höhe).");
  const C = [tC * d[0], tC * d[1]], m = Math.hypot(C[0] - P1s[0], C[1] - P1s[1]), e2d = [Math.cos(beta * D), Math.sin(beta * D)];
  const ende1 = [L, -hoehe], ende2 = [h2 * f2[0] + L * e2d[0], h2 * f2[1] + L * e2d[1]], O = [0, 0], gl = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]) < 1e-9;
  const kontur = [ende1, P1, ...(gl(P1, P1s) ? [] : [P1s]), C, ...(gl(P2, P2s) ? [] : [P2s]), P2, ende2];
  return { geometrie: g, hoehe1: hoehe, hoehe2: h2, s1, s2, sS, ell: sS, P1, P2, P1s, P2s, C, m, tSpitze: tC, laenge: L, beta, psi, gamma1: g1, gamma2: g2, kontur,
    faltlinien: { e1: [O, [L, 0]], e2: [O, [L * e2d[0], L * e2d[1]]], eps1: [O, P1], eps2: [O, P2], quetsch: [O, C] } };
}

// Rechnerische Faltprobe: Seitenkanten beider Flansche landen auf derselben Ecklinie, gleich lang; die Spiegelung an der Winkelhalbierenden deckt die Seiten.
function rot(p, a, grad) { const c = Math.cos(grad * D), s = Math.sin(grad * D), k = kreuz(a, p), d = sk(a, p); return p.map((v, i) => v * c + k[i] * s + a[i] * d * (1 - c)); }
export function faltenPruefen(z) {
  const g = z.geometrie, p1 = rot([z.P1s[0], z.P1s[1], 0], g.e1, -g.phi1), p2 = rot([z.P2s[0], z.P2s[1], 0], g.e2, g.phi2), soll = g.eps.map((x) => z.sS * x);
  const dist = (a, b) => betrag(a.map((v, i) => v - b[i])), d = norm([z.C[0], z.C[1], 0]), k = 2 * (z.P2s[0] * d[0] + z.P2s[1] * d[1]);
  const sp = [k * d[0] - z.P2s[0], k * d[1] - z.P2s[1]], worst = Math.max(dist(p1, soll), dist(p2, soll), dist(p1, p2), Math.hypot(sp[0] - z.P1s[0], sp[1] - z.P1s[1]), Math.abs(Math.hypot(...z.P1s) - Math.hypot(...z.P2s)));
  return { ok: worst < TOL, abweichung: worst };
}

// Die gefaltete Quetschfalte als Dreieck (O, P, C') in lokalen Ecke-Koordinaten, auf Wand 1 (an e1) oder Wand 2 (an e2) gelegt
export function quetschDreieck(z, seite = "wand1") {
  const g = z.geometrie, P = g.eps.map((x) => z.sS * x), e = seite === "wand1" ? g.e1 : g.e2;
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

// Quetschfalte im ebenen Zuschnitt eines Flächenblechs: Ecke V (Umriss gegen den Uhrzeiger), dn = Richtung der Kante k (von V weg), dp = Richtung zur vorigen Ecke.
// fl1 = Flansch an Kante k, fl2 = Flansch an Kante k−1: { abstand: Biegelinie ab gezeichneter Kante nach aussen, zugabe: Länge bis zur Oberkante (jeweils im Zuschnitt), phi: Abkantwinkel in ° }.
// Rückgabe in Skizzenkoordinaten: Ecke O der beiden Biegelinien, Seitenkanten-Spitzen, Spitze C und alle Hilfsgrössen.
// Schnittpunkt der beiden Linien, die um r1 (Kante k) bzw. r2 (Kante k−1) nach aussen von den Kanten der Ecke V versetzt sind
export function eckSchnitt2(V, dn, dp, r1, r2) {
  const n1 = [dn[1], -dn[0]], n2 = [-dp[1], dp[0]], det = n1[0] * n2[1] - n1[1] * n2[0];
  if (Math.abs(det) < 1e-9) throw new Error("Die Kanten der Ecke sind parallel.");
  return [V[0] + (r1 * n2[1] - r2 * n1[1]) / det, V[1] + (n1[0] * r2 - n2[0] * r1) / det];
}
export function quetschEckeFlach(V, dn, dp, fl1, fl2) {
  const O = eckSchnitt2(V, dn, dp, fl1.abstand, fl2.abstand);
  const beta = Math.atan2(dn[0] * dp[1] - dn[1] * dp[0], dn[0] * dp[0] + dn[1] * dp[1]) / D;
  if (!(beta > 0)) throw new Error("Eine Quetschfalte gibt es nur an einer Aussenecke (konvex).");
  const H1 = fl1.zugabe - fl1.abstand, H2 = fl2.zugabe - fl2.abstand, z = quetschZuschnitt(beta, H1, fl1.phi, fl2.phi, null, H2), Y = [-dn[1], dn[0]];
  const W = (q) => [O[0] + q[0] * dn[0] + q[1] * Y[0], O[1] + q[0] * dn[1] + q[1] * Y[1]];
  return { O, beta, z, P1: W(z.P1), P2: W(z.P2), P1s: W(z.P1s), P2s: W(z.P2s), C: W(z.C), dn, dp, Y };
}
