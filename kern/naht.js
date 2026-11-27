// Spengler Digital CAD – Kern: Verbindungsnähte zwischen zwei Blechen (Punktschweissnaht mit Überlappung, Falznaht, Schweissnaht, Ecknaht)
// Überlappung und Falz werden als Kantenbausteine (Abkantfolgen) an den beiden gewählten Kanten abgebildet; Schweiss- und Ecknaht sind nur Darstellung.
// Absetzung (Kröpfung) immer um genau eine Blechstärke, so dass die Bleche danach bündig liegen. Winkel + = zur Sichtseite, − = Rückseite.
import { bausteinProfil } from "./flaechenblech.js";
const mittig = (n) => !!n.mittig;
const zahl = (v) => String(+(+v).toFixed(3));
export const NAHT_ARTEN = { punkt: "Punktschweissnaht (Überlappung)", falz: "Falznaht", schweiss: "Schweissnaht (Raupe)", ecke: "Ecknaht (Raupe)" };
export const nahtStandard = (art = "punkt") => ({ art, absetz: art === "falz" || art === "punkt" ? "b" : "keine", richtung: "oben", zugabe: 15, falzA: 5, falzB: 10, mittig: false, absetzen: true, raupeBreite: 0, raupeHoehe: 0, seite: "oben" });

// Kröpfung um die Höhe h (Standard eine Blechstärke) mit 45°-Bögen: Schenkel zwischen den scharfen Kanten = h / sin 45°, Radius so klein, dass beide Tangentenlängen hineinpassen
export function kroepfung(t, ri, vorz, h = t) {
  const leg = h / Math.sin(Math.PI / 4), rMax = leg / (2 * Math.tan(Math.PI / 8)) - t / 2, r = Math.max(0.05, Math.min(ri > 0 ? ri : t, rMax * 0.98)), tang = (r + t / 2) * Math.tan(Math.PI / 8);
  return { leg, r, tang, folge: `${vorz * 45}r${zahl(r)} ${zahl(leg)} ${-vorz * 45}r${zahl(r)}`, tangente: tang, breite: h };
}

// Falzmasse (unabhängig von der Lage): Rücken des Hakens A berührt die Absetzung von B. Abstand c = kleinster Wert ohne Durchdringung der Querschnitte (Raster).
const falzCache = new Map();
function falzMasse(t, ri, s, W, m) {
  const key = [t, ri, s, W, m?.k].join("|"); if (falzCache.has(key)) return falzCache.get(key);
  const mm = { t, ri, k: m?.k ?? 0.4 }, kr = kroepfung(t, ri, s, 3 * t), rA = t / 2, rB = t / 2, rmB = rB + t / 2;
  const inP = (p, P) => { let c = false; for (let i = 0, j = P.length - 1; i < P.length; j = i++) { const [xi, yi] = P[i], [xj, yj] = P[j]; if ((yi > p[1]) !== (yj > p[1]) && p[0] < ((xj - xi) * (p[1] - yi)) / (yj - yi) + xi) c = !c; } return c; };
  const bau = (folge, versatz) => bausteinProfil({ name: "x", folge, versatz }, mm).quer;
  const stufe = (c) => {
    const hem = Math.max(2, 1.6 * t + 0.6, W - c - (t + 0.3)), rueck = Math.max(rmB + t / 2 + 1, hem - 0.5 - t), bf = (mid) => `${kr.folge} ${zahl(mid)} U${s > 0 ? "-" : "+"}r${zahl(rB)} ${zahl(rueck)}`;
    const x0 = Math.max(...bau(bf(10 + kr.tang + rmB + t), 0).map((q) => q[0])), mid = Math.max(2 + kr.tang + rmB + t / 2, 10 + kr.tang + rmB + t - (x0 - W)); // äusserstes Hakenende des abgesetzten Blechs genau W vom Fuss
    return { c, hem, rueck, mid, rA, rB, kr, B: bau(bf(mid), 0).map(([x, y]) => [-x, y]), A: bau(`U${s > 0 ? "+" : "-"}r${zahl(rA)} ${zahl(hem)}`, -c).map(([x, y]) => [x, y]) }; // B gespiegelt (Fuss bei 0), A: Rücken bei -c
  };
  const ueber = (g) => { let o = 0; const h = 0.1; for (let x = -W - 2; x <= 2; x += h) for (let y = -4 * t - 2; y <= 4 * t + 2; y += h) if (inP([x, y], g.A) && inP([x, y], g.B)) o += h * h; return o; };
  let best = null; for (let c = 0; c <= W / 2; c += 0.2) { const g = stufe(c), o = ueber(g); if (!best || o < best.o - 1e-9) best = { g, o }; if (o < 0.05) { best = { g, o }; break; } }
  const g = best.g; falzCache.set(key, g); return g;
}

// Abkantfolgen der beiden Seiten: { a: { folge, versatz } | null, b: ... }. Die Folge hängt an der Kante des Blechs (wie ein Kantenbaustein), «versatz» setzt die Kante des nicht
// abgesetzten Blechs zurück, so dass sich die Bleche nirgends durchdringen (Bleche liegen nur aufeinander, Falzhaken greifen ineinander).
// Das abgesetzte Blech (n.absetz) wird gekröpft, die Oberflächen sind danach bündig; Richtung + = zur Sichtseite.
export function nahtFolgen(n, m, winkel = null) { // winkel: { a, b } Winkel zwischen den Blechen in Grad (siehe nahtWinkelAuto in der App); null/0 = in einer Ebene
  const t = +m?.t || 0.7, ri = +m?.ri || 1, s = n.richtung === "unten" ? -1 : 1, art = n.art || "punkt", absB = n.absetz !== "a", kopf = (x) => (absB ? { a: x.flach, b: x.abg } : { a: x.abg, b: x.flach });
  if (art === "schweiss" || art === "ecke") return { a: null, b: null };
  if (art === "punkt" && winkel && Math.abs(absB ? winkel.b : winkel.a) > 2) { // Bleche nicht in einer Ebene: die Fahne des abgekanteten Blechs wird um den Winkel zwischen den Blechen umgelegt und liegt auf dem anderen Blech auf (Überlappung)
    const zug = Math.max(1, +n.zugabe || 15), th = Math.max(-170, Math.min(170, absB ? winkel.b : winkel.a));
    // Die Fahne soll mit ihrer Unterseite auf dem anderen Blech liegen (keine Durchdringung): Das abgekantete Blech endet um s vor der Fugenlinie, s = t / sin γ (scharfe Ecke der Biegung auf Höhe der Fahnen-Mittellinie; die Biegung beginnt die Tangentenlänge davor)
    // mit γ = Winkel zwischen den Blechen = 180° − |θ|.
    const gam = (Math.PI * (180 - Math.abs(th))) / 180, versatz = -(t / Math.max(0.05, Math.sin(gam)));
    return kopf({ abg: { folge: `${zahl(th)} ${zahl(zug)}`, versatz }, flach: { folge: "0 2", versatz: 0 } });
  }
  if (art === "punkt") {
    const zug = Math.max(1, +n.zugabe || 15), kr = kroepfung(t, ri, s), rueck = t + kr.tang + 0.3; // Kröpfung des einen Blechs reicht um t + Tangente über die Kante: das andere endet davor
    return kopf({ abg: { folge: `${kr.folge} ${zahl(zug + kr.tang)}`, versatz: 0 }, flach: { folge: "0 2", versatz: -(rueck + 2) } });
  }
  // Falz: «falzB» ist die GESAMTE Falzbreite (Fuss der Absetzung bis Aussenkante des Hakens des abgesetzten Blechs, inkl. Kröpfung und Biegung).
  // Das nicht abgesetzte Blech hat einen 180°-Haken; sein Rücken liegt genau an der Absetzung (kleinster kollisionsfreier Abstand), der Haken des abgesetzten Blechs greift darum.
  // «mittig»: die Falzmitte (Fuss der Absetzung … Hakenende) liegt genau über der früheren Blechkante – der ganze Falz verschiebt sich, beide Bleche werden entsprechend versetzt.
  const W = Math.max(4, +n.falzB || 10), fuss = mittig(n) ? W / 2 : 0, g = falzMasse(t, ri, s, W, m);
  const hemB = `${g.kr.folge} ${zahl(g.mid)} U${s > 0 ? "-" : "+"}r${zahl(g.rB)} ${zahl(g.rueck)}`;
  let vA = fuss - g.c, hemL = g.hem;
  if (vA > 1e-6) { // Anlauf neben der Biegung muss lang genug sein (Biegeradien): sonst kürzester gültiger Anlauf, Hakenende bleibt an derselben Stelle
    const mm = { t, ri, k: m?.k ?? 0.4 }, hakenFolge = (l, h) => `0 ${zahl(l)} U${s > 0 ? "+" : "-"}r${zahl(g.rA)} ${zahl(h)}`;
    let ok = false; try { bausteinProfil({ name: "x", folge: hakenFolge(vA, hemL), versatz: 0 }, mm); ok = true; } catch { /* Anlauf zu kurz */ }
    if (!ok) { hemL = Math.max(1.6 * t + 0.6, g.hem - vA); vA = 0; } // Rücken an der Blechkante, Hakenende bleibt an derselben Stelle
  }
  const th = winkel ? (absB ? winkel.b : winkel.a) : 0, lead = Math.max(2, 2 * t + g.kr.tang), prefix = Math.abs(th) > 2 ? `${zahl(Math.max(-170, Math.min(170, th)))} ${zahl(lead)} ` : ''; // Bleche nicht in einer Ebene: das abgesetzte Blech wird erst um den Winkel zwischen den Blechen umgelegt, danach greift der Falz wie bei parallelen Blechen
  return kopf({ abg: { folge: prefix + hemB, versatz: -fuss }, flach: { folge: (vA > 1e-6 ? `0 ${zahl(vA)} ` : "") + `U${s > 0 ? "+" : "-"}r${zahl(g.rA)} ${zahl(hemL)}`, versatz: Math.min(0, vA) } }); // Rücken des Hakens relativ zur Blechkante: nach aussen (> 0) als gerader Anlauf, damit die Fläche bis zum Haken reicht (kein Spalt)
}

// Raupenmasse: Breite etwa 2 t, Höhe etwa t (mindestens 1.2 / 0.6 mm)
export const raupeMasse = (n, t) => ({ b: +n.raupeBreite > 0 ? +n.raupeBreite : Math.max(1.2, 2 * t), h: +n.raupeHoehe > 0 ? +n.raupeHoehe : Math.max(0.6, t) });

// Raupe entlang einer Polylinie (3D-Punkte), Querschnitt in der Ebene senkrecht zur Linie: n = Richtung «oben» (Normale zur Naht), Linse bzw. Dreieck (Ecknaht)
export function raupenNetz(punkte, nrm, art, b, h) {
  const pos = [], zv = (a, c) => [a[0] - c[0], a[1] - c[1], a[2] - c[2]], kr = (a, c) => [a[1] * c[2] - a[2] * c[1], a[2] * c[0] - a[0] * c[2], a[0] * c[1] - a[1] * c[0]], nr = (a) => { const l = Math.hypot(...a) || 1; return a.map((x) => x / l); };
  const N = nr(nrm), ringe = punkte.map((p, i) => {
    const T = nr(zv(punkte[Math.min(i + 1, punkte.length - 1)], punkte[Math.max(i - 1, 0)])), Q = nr(kr(T, N)), q = [];
    if (art === "ecke") for (const [u, v] of [[-h, 0], [0, 0], [0, h]]) q.push([p[0] + Q[0] * u + N[0] * v, p[1] + Q[1] * u + N[1] * v, p[2] + Q[2] * u + N[2] * v]);
    else for (let k = 0; k <= 10; k++) { const x = (k / 10 - 0.5) * b, y = h * (1 - (2 * x / b) ** 2); q.push([p[0] + Q[0] * x + N[0] * y, p[1] + Q[1] * x + N[1] * y, p[2] + Q[2] * x + N[2] * y]); }
    return q;
  });
  for (let i = 0; i + 1 < ringe.length; i++) for (let k = 0; k + 1 < ringe[i].length; k++) { const a = ringe[i][k], c = ringe[i][k + 1], d = ringe[i + 1][k + 1], e = ringe[i + 1][k]; pos.push(...a, ...c, ...d, ...a, ...d, ...e); }
  return new Float32Array(pos);
}
