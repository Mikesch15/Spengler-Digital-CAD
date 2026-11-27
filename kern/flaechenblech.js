// Spengler Digital CAD – Kern: Flächenblech mit Kantenbausteinen
// Ein Blech wird nur als Grundfläche (Polygon in seiner Ebene) gezeichnet. An jeder Kante sitzt ein
// Kantenbaustein (Doppelstehfalz, Umschlag, Aufkantung …) als Abkantfolge ab der Kante nach aussen.
// Daraus: Zugabe je Kante, Zuschnitt (Umriss mit Eckausklinkung), Biegelinien, Abkantliste.
// Querschnitt eines Bausteins: x = von der Kante nach aussen, y = zur Sichtseite. Reines JavaScript.
import { bausteinFolge } from "./vorlagen/parameter.js";
import { werkzeugAuf } from "./flansch.js";
import { quetschEckeFlach, eckeGeometrie, eckSchnitt2, quetschAnschluss } from "./quetschfalte.js";
import { berechne, versatzLinie, grenzen, kontur } from "./geometrie.js";
import { freiesProfil } from "./profile.js";
import { folge } from "./details.js";

// Abkantfolge eines Bausteins beginnt mit dem Winkel an der Kante: «90 25 U+ 7» = 90° zur Sichtseite, 25, Umschlag, 7.
// versatz: Kante liegt so viel weiter aussen (Oberfalz neben dem Unterfalz). partner: Gegenstück an gemeinsamer Kante.
export const BAUSTEINE_STANDARD = [
  { id: "dsf-u", name: "Doppelstehfalz – Unterfalz", gruppe: "Falze", folge: "90 25 U+ 7", versatz: 0, partner: "dsf-o" },
  { id: "dsf-o", name: "Doppelstehfalz – Oberfalz", gruppe: "Falze", folge: "90 25.7 U-r1.75 10.5", versatz: 0.7, partner: "dsf-u" },
  { id: "sf-u", name: "Stehfalz einfach – Unterfalz", gruppe: "Falze", folge: "90 25", versatz: 0, partner: "sf-o" },
  { id: "sf-o", name: "Stehfalz einfach – Oberfalz", gruppe: "Falze", folge: "90 25.7 U-r1 8", versatz: 0.7, partner: "sf-u" },
  { id: "lf-u", name: "Liegender Falz – unten", gruppe: "Falze", folge: "U-r1 15", versatz: 0, partner: "lf-o" },
  { id: "lf-o", name: "Liegender Falz – oben", gruppe: "Falze", folge: "U+r1 15", versatz: 0, partner: "lf-u" },
  { id: "trauf", name: "Traufe: Umschlag nach unten (Einhang)", gruppe: "Abschlüsse", folge: "U-r1.4 40", versatz: 0 },
  { id: "ortgang", name: "Ortgang: Aufkantung", gruppe: "Abschlüsse", folge: "90 25", versatz: 0 },
  { id: "wasserfalz", name: "Aufkantung mit Wasserfalz", gruppe: "Abschlüsse", folge: "90 40 U- 10", versatz: 0 },
  { id: "first", name: "First: Aufkantung 25", gruppe: "Abschlüsse", folge: "90 25", versatz: 0 },
  { id: "saum-o", name: "Saum (Umschlag zur Sichtseite)", gruppe: "Kanten", folge: "U+ 10", versatz: 0 },
  { id: "saum-u", name: "Saum (Umschlag nach hinten)", gruppe: "Kanten", folge: "U- 10", versatz: 0 },
  { id: "abk-u", name: "Abkantung 90° nach hinten", gruppe: "Kanten", folge: "-90 30", versatz: 0 },
  { id: "abk-o", name: "Abkantung 90° zur Sichtseite", gruppe: "Kanten", folge: "90 30", versatz: 0 },
  { id: "tropf", name: "Abkantung mit Tropfkante", gruppe: "Kanten", folge: "-90 30 45 10", versatz: 0 },
  { id: "saum-offen", name: "Offener Saum (Lücke 2 mm)", gruppe: "Säume", folge: "U+r1.5 10", versatz: 0 },
  { id: "saum-tropfen", name: "Tropfensaum (Radius 4)", gruppe: "Säume", folge: "U+r4 12", versatz: 0 },
  { id: "kroepf-45", name: "Kröpfung 45° (Z-Abkantung, 12 mm)", gruppe: "Kröpfungen", folge: "45 12 -45 25", versatz: 0 },
  { id: "kroepf-90", name: "Kröpfung 90° (Stufe 10 mm)", gruppe: "Kröpfungen", folge: "90 10 -90 25", versatz: 0 },
  { id: "paneel", name: "Paneel: Abkantung 30 mit Einhang", gruppe: "Fassade", folge: "-90 30 -90 15", versatz: 0 },
];

// Abkantfolge des Bausteins rechnen (wie ein Profil mit einem langen Anfangsschenkel auf der Fläche)
const X = 100;
const zahl = (x) => String(+(+x).toFixed(2));
export function bausteinProfil(b0, m) {
  const b = werkzeugAuf(b0, m); // Flansch/Umschlag-Werkzeug → Abkantfolge und Versatz
  if (!b || !String(b.folge ?? "").trim()) return { zugabe: 0, biegungen: [], zeilen: [] };
  const zeilen = folge(`${X} ${bausteinFolge(b, m)}`);
  const { start, ops } = freiesProfil(0, zeilen, m);
  const res = berechne(start, ops, m.t, m.ri, m.k);
  const v = +b.versatz || 0, zugabe = res.zuschnitt - X + v;
  // Anschlag ab Schnittkante des Zuschnitts; abstand = Lage der Biegelinie ab der gezeichneten Kante (nach aussen)
  // Schenkelmass im Querschnitt: so wie eingegeben (Länge «bis» Mittellinie/Aussen/Innen/Tangente), nicht die rechnerische Länge der Mittellinie
  const w = b0?.werkzeug;
  if (w?.typ === "flansch" && res.beschriftungen?.[1]) { const bz = w.bezug || "mitte"; res.beschriftungen[1] = { ...res.beschriftungen[1], mass: +w.laenge, text: bz === "mitte" ? undefined : `${zahl(w.laenge)} ${{ aussen: "aussen", innen: "innen", tangente: "tang." }[bz] || ""}`.trim() }; }
  const biegungen = res.biegungen.filter((bg) => Math.abs(bg.winkel) > 1e-6).map((bg) => ({ ...bg, anschlag: res.zuschnitt - bg.pos, abstand: bg.pos - X + v, ende: bg.bis - X + v })); // 0°-Biegung = gerade Verlängerung, keine Biegelinie
  // Querschnitt (x nach aussen, y Höhe) ohne den Anfangsschenkel auf der Fläche – für die Eckprüfung
  const quer = kontur(res.pfad, m.t, 6).map(([x, y]) => [x - X + v, y]);
  return { zeilen, res, zugabe, biegungen, versatz: v, lage: profilLage(res, m, v), lageY: profilLage(res, m, v, true), quer, t: m.t, ri: m.ri, k: m.k };
}

// Profil-Mittellinie: Abwicklungsmass u (ab gezeichneter Kante, wie im Zuschnitt) ↔ x = Abstand nach aussen im gekanteten Zustand.
// Liste [u, x] für u von 0 bis zur Zugabe; Bögen mit der Biegezugabe (K-Faktor) wie in berechne().
function profilLage(res, m, v, yAchse = false) { // Lage x (oder y) der Mittellinie über dem Abwicklungsmass u
  const roh = []; let u = 0; const c = yAchse ? 1 : 0;
  for (const el of res.pfad) {
    if (el.typ === "linie") { if (!roh.length) roh.push([u, el.p1[c]]); u += Math.hypot(el.p2[0] - el.p1[0], el.p2[1] - el.p1[1]); roh.push([u, el.p2[c]]); }
    else {
      const a = (el.winkel * Math.PI) / 180, ba = (el.rm - m.t / 2 + m.k * m.t) * Math.abs(a), n = 8;
      if (!roh.length) roh.push([u, el.p1[c]]);
      for (let i = 1; i <= n; i++) roh.push([u + (ba * i) / n, el.zentrum[c] + el.rm * (yAchse ? Math.sin(el.start + (a * i) / n) : Math.cos(el.start + (a * i) / n))]);
      u += ba;
    }
  }
  const sh = yAchse ? 0 : -X + v, um = roh.map(([uu, x]) => [uu - X + v, x + sh]), out = [[0, xBei(um, 0)]];
  for (const q of um) if (q[0] > 1e-9) out.push(q);
  return out;
}
const yBei = (lage, u) => (lage ? xBei(lage, u) : 0);
const xBei = (lage, u) => { for (let i = 1; i < lage.length; i++) { const [u0, x0] = lage[i - 1], [u1, x1] = lage[i]; if (u <= u1 + 1e-9) return u1 - u0 < 1e-12 ? x1 : x0 + ((x1 - x0) * (u - u0)) / (u1 - u0); } return lage.at(-1)?.[1] ?? 0; };
// Ecken (gemeinsam für Abwicklung und 3D): Ende eines Lappens bei Lage x um x·k längs der Kante verschoben.
// Nachbar mit Baustein: Winkelhalbierende (k = tan β/2) – die Lappen berühren sich höchstens, durchdringen sich nie.
// Nachbar ohne Baustein: bündig zur Nachbarkante (k = −cot β). β = Knick an der Ecke (+ = links, konvex).
export function eckFaktor(beta, nachbarMitBaustein, gehrung = true) {
  const k = nachbarMitBaustein ? (gehrung ? Math.tan(beta / 2) : 0) : Math.abs(Math.sin(beta)) < 0.2 ? 0 : -1 / Math.tan(beta);
  return Math.max(-4, Math.min(4, k));
}
const innenPoly = (q, P) => { let drin = false; for (let i = 0, j = P.length - 1; i < P.length; j = i++) { const [xi, yi] = P[i], [xj, yj] = P[j]; if ((yi > q[1]) !== (yj > q[1]) && q[0] < ((xj - xi) * (q[1] - yi)) / (yj - yi) + xi) drin = !drin; } return drin; };
// Ecke zwischen Profil A (endet) und B (beginnt): wie müssen sie abgeschnitten werden, damit sie sich nicht durchdringen?
// Waagrechter Schnitt eines Querschnitts bei Höhe y → x-Intervalle
function intervalle(P, y) {
  const xs = [];
  for (let i = 0, j = P.length - 1; i < P.length; j = i++) { const [xi, yi] = P[i], [xj, yj] = P[j]; if ((yi > y) !== (yj > y)) xs.push(xi + ((y - yi) * (xj - xi)) / (yj - yi)); }
  xs.sort((a, b) => a - b); const out = []; for (let k = 0; k + 1 < xs.length; k += 2) out.push([xs[k], xs[k + 1]]); return out;
}
// Schneiden sich zwei Halbstreifen in der Ebene? A: s·dA ≤ −eA, a0 ≤ x·nA ≤ a1; B: s·dB ≥ eB, b0 ≤ x·nB ≤ b1 (Ecke im Ursprung)
function streifenSchnitt(dA, nA, a, eA, dB, nB, b, eB) {
  const H = [[dA, -eA, 1], [nA, a[0], -1], [nA, a[1], 1], [dB, eB, -1], [nB, b[0], -1], [nB, b[1], 1]]; // sg·(v·q − c) ≤ 0
  const ok = (q) => H.every(([v, c, sg]) => sg * (v[0] * q[0] + v[1] * q[1] - c) <= 1e-6);
  for (let i = 0; i < H.length; i++) for (let j = i + 1; j < H.length; j++) {
    const [u, cu] = H[i], [v, cv] = H[j], det = u[0] * v[1] - u[1] * v[0]; if (Math.abs(det) < 1e-12) continue;
    if (ok([(cu * v[1] - cv * u[1]) / det, (u[0] * cv - v[0] * cu) / det])) return true;
  }
  return false;
}
// Durchdringen sich A (endet bei sA ≤ −eA) und B (beginnt bei sB ≥ eB)? Je Höhe y: x-Intervalle der Querschnitte → Halbstreifen.
// nurAusserhalb: nur ausserhalb des Biegebereichs (|x| > Biegeradius + 1.5·t) zählen. Die Grundplatte zählt nie.
function treffer(pA, pB, dA, dB, eA, eB, nurAusserhalb, bandA = null, bandB = null) {
  const t = Math.max(pA.t, pB.t), zone = Math.max(pA.ri || 1, pB.ri || 1) + 1.5 * t, nA = [dA[1], -dA[0]], nB = [dB[1], -dB[0]];
  const ys = [...new Set([...pA.quer, ...pB.quer].map(([, y]) => +y.toFixed(3)))].sort((a, b) => a - b), levels = [];
  for (let k = 0; k + 1 < ys.length; k++) { const n = Math.max(1, Math.min(10, Math.floor((ys[k + 1] - ys[k]) / 0.5))); for (let i = 0; i < n; i++) levels.push(ys[k] + ((ys[k + 1] - ys[k]) * (i + 0.5)) / n); }
  const ohneZone = (I) => I.flatMap(([u, v]) => [[u, Math.min(v, -zone)], [Math.max(u, zone), v]]).filter(([u, v]) => v - u > 1e-6);
  const ohnePlatte = (I) => I.map(([u, v]) => [Math.max(u, zone), v]).filter(([u, v]) => v - u > 1e-6);
  for (const y of levels) {
    let IA = intervalle(pA.quer, y), IB = intervalle(pB.quer, y);
    if (Math.abs(y) <= t / 2 + 0.02) { IA = ohnePlatte(IA); IB = ohnePlatte(IB); }
    if (nurAusserhalb) { IA = ohneZone(IA); IB = ohneZone(IB); }
    const band = (I, b) => (b ? I.map(([u, v]) => [Math.max(u, b[0]), Math.min(v, b[1])]).filter(([u, v]) => v - u > 1e-6) : I);
    IA = band(IA, bandA); IB = band(IB, bandB);
    for (const a of IA) for (const b of IB) if (streifenSchnitt(dA, nA, a, eA, dB, nB, b, eB)) return true;
  }
  return false;
}
// Kürzeste schräge Schnittlinie e(x) = a + b·x (Rücksetzung längs der Kante je nach Lage x im Profil), so dass das
// gekürzte Profil den Nachbarn nicht mehr trifft. Je x-Streifen das nötige Mass (Halbierung), darüber die obere Hülle.
function schraegSchnitt(pA, pB, dA, dB, beiA) {
  const P = beiA ? pA : pB, t = P.t, xs = P.quer.filter(([x, y]) => !(x < 0 && Math.abs(y) <= t / 2 + 0.01)).map(([x]) => x);
  const x0 = Math.min(...xs), x1 = Math.max(...xs), Z = Math.max(Math.abs(x0), Math.abs(x1), 1) + 5, n = Math.min(80, Math.max(8, Math.ceil((x1 - x0) / 0.25)));
  const noetig = [];
  for (let i = 0; i < n; i++) {
    const b = [x0 + ((x1 - x0) * i) / n, x0 + ((x1 - x0) * (i + 1)) / n], hit = (e) => treffer(pA, pB, dA, dB, beiA ? e : 0, beiA ? 0 : e, false, beiA ? b : null, beiA ? null : b);
    if (!hit(0)) { noetig.push([b[0], 0], [b[1], 0]); continue; }
    if (hit(Z)) return null;
    let lo = 0, hi = Z; while (hi - lo > 0.02) { const mi = (lo + hi) / 2; if (hit(mi)) lo = mi; else hi = mi; }
    noetig.push([b[0], hi], [b[1], hi]);
  }
  // obere konvexe Hülle; die Gerade der Hülle über der Mitte ist die kürzeste Schräge, die alles abdeckt
  const pts = noetig.sort((p, q) => p[0] - q[0] || q[1] - p[1]), H = [];
  for (const p of pts) { while (H.length >= 2) { const [o, a] = [H.at(-2), H.at(-1)]; if ((a[0] - o[0]) * (p[1] - o[1]) - (a[1] - o[1]) * (p[0] - o[0]) >= 0) H.pop(); else break; } H.push(p); }
  const xm = (x0 + x1) / 2; let best = null;
  for (let i = 0; i + 1 < H.length; i++) { const [p, q] = [H[i], H[i + 1]]; if (q[0] - p[0] < 1e-9) continue; if (xm >= p[0] - 1e-9 && xm <= q[0] + 1e-9) { const b = (q[1] - p[1]) / (q[0] - p[0]); best = { a: p[1] - b * p[0], b }; } }
  if (!best) best = { a: Math.max(...noetig.map(([, e]) => e)), b: 0 };
  const verlust = ((best.a + best.b * x0) + (best.a + best.b * x1)) / 2 * (x1 - x0);
  return { ...best, verlust };
}
const UEB = new Map();
export function eckSchnitt(pA, pB, dA, dB) {
  const key = `${pA.zeilen?.map((z) => z.L + "/" + z.winkel + z.art).join()}|${pB.zeilen?.map((z) => z.L + "/" + z.winkel + z.art).join()}|${pA.versatz}|${pB.versatz}|${pA.t}|${dA.map((v) => v.toFixed(4))}|${dB.map((v) => v.toFixed(4))}`;
  if (UEB.has(key)) return UEB.get(key);
  const gleich = JSON.stringify(pA.zeilen) === JSON.stringify(pB.zeilen) && pA.versatz === pB.versatz;
  let r;
  if (gleich || treffer(pA, pB, dA, dB, 0, 0, true)) r = { gehrung: true, eA: 0, eB: 0 }; // gleiche oder deutlich überschneidende Bausteine
  else if (!treffer(pA, pB, dA, dB, 0, 0, false)) r = { gehrung: false, eA: 0, kA: 0, eB: 0, kB: 0 }; // berühren sich nicht
  else {
    // nur im Biegebereich: einer läuft bis ans Blechende und wird nur dort schräg angeschnitten, wo er in den Nachbarn ragen würde
    const A = schraegSchnitt(pA, pB, dA, dB, true), B = schraegSchnitt(pA, pB, dA, dB, false);
    r = !A && !B ? { gehrung: true, eA: 0, eB: 0 } : !B || (A && A.verlust <= B.verlust) ? { gehrung: false, eA: A.a, kA: A.b, eB: 0, kB: 0 } : { gehrung: false, eA: 0, kA: 0, eB: B.a, kB: B.b };
  }
  if (UEB.size > 500) UEB.clear();
  UEB.set(key, r); return r;
}
const knick = (d1, d2) => Math.atan2(d1[0] * d2[1] - d1[1] * d2[0], d1[0] * d2[0] + d1[1] * d2[1]);
const richtung = (a, b) => { const l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1; return [(b[0] - a[0]) / l, (b[1] - a[1]) / l]; };
// Hauptwand einer Aufkantung (längste gerade Strecke ausserhalb des Anfangsschenkels): Innenfläche als Gerade im Querschnitt (x nach aussen, y Höhe)
export function innenWand(p) {
  const v = p.versatz || 0, sh = -X + v;
  let best = null; for (const el of p.res?.pfad || []) { if (el.typ !== "linie") continue; const x1 = el.p1[0] + sh, x2 = el.p2[0] + sh; if (Math.max(x1, x2) <= 0.5) continue; const l = Math.hypot(el.p2[0] - el.p1[0], el.p2[1] - el.p1[1]); if (!best || l > best.l) best = { l, el }; }
  if (!best) return null;
  const { el } = best, w = [(el.p2[0] - el.p1[0]) / best.l, (el.p2[1] - el.p1[1]) / best.l];
  let o = [-w[1], w[0]]; if (o[0] > 0) o = [-o[0], -o[1]]; // Normale zur Platte hin (negatives x)
  if (Math.abs(o[0]) < 0.3 || Math.abs(w[1]) < 0.2) return null; // fast flach liegende Wand: keine Innenkante
  const t2 = (p.t || 1) / 2;
  return { f: [el.p1[0] + sh + o[0] * t2, el.p1[1] + o[1] * t2], w };
}
// Ecke zweier Aufkantungen (konvex): Die Innenflächen schneiden sich in einer Linie; beide Enden werden in einer Ebene durch diese Linie geschnitten,
// die senkrecht auf dem Blech steht (Schnittkante 90°) – die Innenecken treffen sich, an der Aussenecke bleibt ein Spalt.
// Ebene je Ende: z = e + kx·x + ky·y (Querschnittskoordinaten x nach aussen, y Höhe)
// Freistellung an der Gehrungsecke (wie in Fusion): die Biegezone endet um Biegeradius + Blechstärke vor der Ecke, damit sie nicht über die Ecke hinaussteht.
// fr0/fr1 = Rücksetzung der Biegezone am Anfang/Ende der Kante, bisU = Ende der Biegung (Abwicklungsmass ab der gezeichneten Kante)
function freistellen(ek, profile, kv, k, opt) {
  return; // Freistellung jetzt als runder Ausschnitt um die Ecke der Biegelinien (cad.js eckenEntlastung / kern/cad/featureBau.js), nicht mehr als Rücksetzung der Biegezone
  const rel = (p) => { const b = p?.biegungen?.[0]; return b && Math.abs(b.winkel) > 1e-6 ? { fr: (b.ri ?? p.ri ?? 1) + (p.t || 1), bis: b.ende } : null; };
  const a = rel(profile[kv]), b = rel(profile[k]);
  if (a) { ek[kv].fr1 = a.fr; ek[kv].bisU = a.bis; }
  if (b) { ek[k].fr0 = b.fr; ek[k].bisU = b.bis; }
}
// Flaches Profil (Saum, Falz, Umschlag): Höhe über der Platte höchstens 4,5 Blechstärken – hat keine aufstehende Wand, an der sich eine Ecke bilden liesse
function flachProfil(p) { const q = p?.quer || [], t = p?.t || 1; if (!q.length) return false; return Math.max(...q.map(([, y]) => Math.abs(y))) <= 4.5 * t; }
function quadratEcken(gruppen, profile, ek, opt = null) {
  const n = gruppen.length;
  gruppen.forEach((g, k) => {
    const kv = (k - 1 + n) % n; if (kv === k || !profile[k]?.lage || !profile[kv]?.lage) return;
    if (flachProfil(profile[k]) || flachProfil(profile[kv])) { for (const [j, w] of [[k, 0], [kv, 1]]) { const o = ek[j]; if (!o) continue; if (w === 0) { o.k0 = 0; o.ky0 = 0; o.e0 = 0; } else { o.k1 = 0; o.ky1 = 0; o.e1 = 0; } } return; } // flacher Saum/Falz an einer Nachbarkante: keine Innenwand – beide Enden rechtwinklig (statt Gehrungsebene aus einer Scheinwand)
    const dV = richtung(gruppen[kv].punkte.at(-2), gruppen[kv].punkte.at(-1)), d0 = richtung(g.punkte[0], g.punkte[1]), beta = knick(dV, d0), sb = Math.sin(beta);
    if (beta < 0.2 || sb < 0.2) return; // gerade Fortsetzung oder einspringende Ecke: wie bisher
    const nA = [dV[1], -dV[0]], nB = [d0[1], -d0[0]], WA = innenWand(profile[kv]), WB = innenWand(profile[k]);
    const xA = innenX(profile[kv]), xB = innenX(profile[k]);
    if (!WA && !WB) { // senkrechte oder flache Profile: Enden rechtwinklig zur Kante, Innenecken am Fuss
      const s = (xB - xA * (nA[0] * nB[0] + nA[1] * nB[1])) / sb, sB = xA * (nA[0] * d0[0] + nA[1] * d0[1]) + s * (dV[0] * d0[0] + dV[1] * d0[1]);
      ek[kv].k1 = 0; ek[kv].ky1 = 0; ek[kv].e1 = -s; ek[k].k0 = 0; ek[k].ky0 = 0; ek[k].e0 = sB; freistellen(ek, profile, kv, k, opt); return;
    }
    // Innenflächen als x(y) = xf + (y − yf)·r: ohne Wand (senkrecht) r = 0, x = innenX
    const fa = WA ? { xf: WA.f[0], yf: WA.f[1], r: WA.w[0] / WA.w[1] } : { xf: xA, yf: 0, r: 0 }, fb = WB ? { xf: WB.f[0], yf: WB.f[1], r: WB.w[0] / WB.w[1] } : { xf: xB, yf: 0, r: 0 };
    const det = nA[0] * nB[1] - nA[1] * nB[0], q = (y) => { const ra = fa.xf + (y - fa.yf) * fa.r, rb = fb.xf + (y - fb.yf) * fb.r; return [(ra * nB[1] - rb * nA[1]) / det, (nA[0] * rb - nB[0] * ra) / det]; };
    const q0 = q(0), q1 = q(1), zA0 = q0[0] * dV[0] + q0[1] * dV[1], zA1 = q1[0] * dV[0] + q1[1] * dV[1], zB0 = q0[0] * d0[0] + q0[1] * d0[1], zB1 = q1[0] * d0[0] + q1[1] * d0[1];
    const aS = zA1 - zA0, bS = zB1 - zB0; // Steigung der Schnittlinie je Höhe in A bzw. B
    const ebene = (F, w, z0, st) => { // z(x,y) = z0 + st·(y0 des Fusspunkts der Normalen) – senkrecht zur Wand: z hängt nur von der Lage τ entlang der Wand ab
      const wx = w ? w[0] : 0, wy = w ? w[1] : 1, xf = F.xf, yf = F.yf, c = z0 + st * yf - st * wy * (xf * wx + yf * wy);
      return { kx: st * wy * wx, ky: st * wy * wy, c };
    };
    const A = ebene(fa, WA?.w, zA0, aS), B = ebene(fb, WB?.w, zB0, bS);
    ek[kv].k1 = A.kx; ek[kv].ky1 = A.ky; ek[kv].e1 = -A.c; ek[k].k0 = -B.kx; ek[k].ky0 = -B.ky; ek[k].e0 = B.c;
    freistellen(ek, profile, kv, k, opt);
  });
}
function innenX(p) {
  const zone = (p.ri || 1) + 1.5 * (p.t || 1), q = p.quer || [], hoch = q.filter(([, y]) => y > zone), xs = (hoch.length ? hoch : q).map(([x]) => x);
  return xs.length ? Math.min(...xs) : 0;
}

// Gehrung an Aussenecken zweier einfacher Flansche: beide Enden liegen in EINER Ebene, die die Ecklinie ε (Schnitt der Innenflächen) enthält und den Winkel der beiden
// Wände halbiert (Normale = nA − nB der äusseren Wandnormalen). Gilt für beliebige Flanschwinkel (auch 61° und 90° gemischt): die Kanten der Flansche laufen dann
// parallel und lassen oben keine Lücke. Ergebnis: Map Eckenindex k (Anfang der Kante k) → { I (Punkt auf ε), M (Ebenennormale), H (Höhe des Biegebereichs), voll }.
// voll = true: die Ebene gilt über die ganze Höhe (Ecken mit Quetschfalte); sonst nur im Biegebereich, darüber gilt der Eckenschnitt der Wand.
// s = Sichtseite (+1/−1): lokales y der Flanschprofile liegt in Richtung s·(Plattennormale).
export function gehrungEcken(gruppen, profile, opt, t, s = 1, volleEcken = []) {
  const n = gruppen.length, ecke = new Map(), sg = s === -1 ? -1 : 1;
  if ((opt?.ecken || "gehrung") !== "gehrung") return ecke;
  const kr = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]], pr = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2], nm = (a) => { const l = Math.hypot(...a) || 1; return a.map((x) => x / l); };
  for (let k = 0; k < n; k++) {
    const kv = (k - 1 + n) % n, gk = gruppen[k], gv = gruppen[kv], pk = profile[k], pv = profile[kv];
    if (kv === k || !gk.gerade || !gv.gerade || pk?.biegungen?.length !== 1 || pv?.biegungen?.length !== 1 || !pk.baustein || !pv.baustein) continue;
    if (!reichtBisAnfang(pk) || !reichtBisEnde(pv)) continue; // Teilstück: der Baustein erreicht die Ecke nicht
    if (flachProfil(pk) || flachProfil(pv)) continue; // flacher Falz/Saum an einer der Kanten: keine Innenwand, die Enden bleiben rechtwinklig (wie in quadratEcken) – sonst schneidet die Gehrungsebene das flache Profil weit über die Platte hinaus (Spitze)
    const V0 = gk.punkte[0], dn = richtung(V0, gk.punkte[1]), dp = richtung(V0, gv.punkte.at(-2));
    if (!(knick(dn, dp) > 0)) continue; // nur Aussenecken
    const WA = innenWand(pv), WB = innenWand(pk), fa = WA ? { xf: WA.f[0], yf: WA.f[1], r: WA.w[0] / WA.w[1] } : { xf: innenX(pv), yf: 0, r: 0 }, fb = WB ? { xf: WB.f[0], yf: WB.f[1], r: WB.w[0] / WB.w[1] } : { xf: innenX(pk), yf: 0, r: 0 };
    const dV = [-dp[0], -dp[1]], xrA = [dV[1], -dV[0]], xrB = [dn[1], -dn[0]], la = Math.hypot(1, fa.r), lb = Math.hypot(1, fb.r);
    const nA = [xrA[0] / la, xrA[1] / la, (-fa.r / la) * sg], nB = [xrB[0] / lb, xrB[1] / lb, (-fb.r / lb) * sg]; // äussere Wandnormalen
    const PA = [V0[0] + fa.xf * xrA[0], V0[1] + fa.xf * xrA[1], fa.yf * sg], PB = [V0[0] + fb.xf * xrB[0], V0[1] + fb.xf * xrB[1], fb.yf * sg];
    const e = kr(nA, nB); if (Math.hypot(...e) < 1e-6) continue;
    // Punkt I auf ε: nA·I = nA·PA, nB·I = nB·PB, e·I = e·V0 (Cramer)
    const Z = [V0[0], V0[1], 0], r1 = [pr(nA, PA), pr(nB, PB), pr(e, Z)], det3 = (a, b, c) => pr(a, kr(b, c)), D = det3(nA, nB, e); if (Math.abs(D) < 1e-9) continue;
    const I = [0, 0, 0];
    // Lösung des 3×3-Systems A·I = r (Zeilen nA, nB, e) über die Adjungierte
    const cA = kr(nB, e), cB = kr(e, nA), cE = kr(nA, nB); // Spalten der Inversen
    I[0] = (r1[0] * cA[0] + r1[1] * cB[0] + r1[2] * cE[0]) / D; I[1] = (r1[0] * cA[1] + r1[1] * cB[1] + r1[2] * cE[1]) / D; I[2] = (r1[0] * cA[2] + r1[1] * cB[2] + r1[2] * cE[2]) / D;
    const M = nm([nA[0] - nB[0], nA[1] - nB[1], nA[2] - nB[2]]), rB = (q) => (q.biegungen[0].ri ?? q.ri ?? 1) + (q.t || t);
    ecke.set(k, { I, M, H: Math.max(rB(pk), rB(pv)) + 0.2, voll: volleEcken.includes(k) });
  }
  return ecke;
}
// Gehrungsebene im lokalen System eines Flansch-Abschnitts (x nach aussen, y Höhe, z entlang der Kante ab a, Richtung d): z = z0 + zx·x + zy·y.
// kuerz: zusätzliche Kürzung dieses Endes entlang der Kante (Flansch unter einer Quetschfalte); start = Anfang (true) oder Ende (false) der Kante
export function gehrungLokal(c, a, d, s = 1, kuerz = 0, start = true) {
  const sg = s === -1 ? -1 : 1, X = [d[1], -d[0], 0], Y = [0, 0, sg], Zd = [d[0], d[1], 0], M = c.M, pr = (u, v) => u[0] * v[0] + u[1] * v[1] + u[2] * v[2];
  const MZ = pr(M, Zd); if (Math.abs(MZ) < 1e-9) return null;
  const k0 = pr(M, [a[0] - c.I[0], a[1] - c.I[1], -c.I[2]]);
  return { zx: -pr(M, X) / MZ, zy: -pr(M, Y) / MZ, z0: -k0 / MZ + (start ? kuerz : -kuerz), H: c.voll ? Infinity : c.H, voll: !!c.voll };
}
// Eckfaktoren mit nachträglichen Überschreibungen je Flanschende (opt.enden["k:start"|"k:ende"] = { art: "rechtwinklig" | "buendig" | "winkel", winkel, versatz })
export function eckFaktoren(gruppen, profile, opt = null) {
  const ek = eckFaktorenRoh(gruppen, profile, opt), n = gruppen.length;
  for (const [key, ov] of Object.entries(opt?.enden || {})) {
    const [ks, seite] = key.split(":"), k = +ks, g = gruppen[k]; if (!g || !ek[k] || !ov) continue;
    const start = seite === "start", nb = gruppen[start ? (k - 1 + n) % n : (k + 1) % n];
    const beta = start ? knick(richtung(nb.punkte.at(-2), nb.punkte.at(-1)), richtung(g.punkte[0], g.punkte[1])) : knick(richtung(g.punkte.at(-2), g.punkte.at(-1)), richtung(nb.punkte[0], nb.punkte[1]));
    const kw = ov.art === "buendig" ? eckFaktor(beta, false) : ov.art === "winkel" ? Math.tan((Math.max(-80, Math.min(80, +ov.winkel || 0)) * Math.PI) / 180) : 0, ver = +ov.versatz || 0;
    if (start) Object.assign(ek[k], { k0: kw, ky0: 0, e0: -ver }); else Object.assign(ek[k], { k1: kw, ky1: 0, e1: -ver });
  }
  gruppen.forEach((g, k) => { // Teilstück: dort, wo der Baustein nicht bis zur Ecke reicht, enden Baustein und Nachbarkante rechtwinklig
    const tl = profile[k]?.teil; if (!tl || !ek[k]) return; const quadr = (o, anfang) => { if (!o) return; if (anfang) { o.k0 = 0; o.ky0 = 0; o.e0 = 0; o.fr0 = 0; } else { o.k1 = 0; o.ky1 = 0; o.e1 = 0; o.fr1 = 0; } };
    if (!reichtBisAnfang(profile[k])) { quadr(ek[k], true); quadr(ek[(k - 1 + n) % n], false); }
    if (!reichtBisEnde(profile[k])) { quadr(ek[k], false); quadr(ek[(k + 1) % n], true); }
  });
  for (const [key, d] of Object.entries(opt?.kuerzen || {})) { const [ks, seite] = key.split(":"), k = +ks; if (!ek[k]) continue; if (seite === "start") ek[k].e0 += d; else ek[k].e1 += d; } // Flansch unter der Quetschfalte endet um eine Blechstärke früher (Saum der Falte)
  return ek;
}
function eckFaktorenRoh(gruppen, profile, opt = null) { // opt: { ecken: "gehrung" | "stoss" | "spalt", spalt, t } – Eckenschluss wie in Fusion (Gehrung, Stoss/Überlappung, offene Ecke mit Spalt)
  const n = gruppen.length;
  const ek = gruppen.map((g, k) => {
    const vor = gruppen[(k - 1 + n) % n], nach = gruppen[(k + 1) % n];
    const dV = richtung(vor.punkte.at(-2), vor.punkte.at(-1)), d0 = richtung(g.punkte[0], g.punkte[1]), d1 = richtung(g.punkte.at(-2), g.punkte.at(-1)), dN = richtung(nach.punkte[0], nach.punkte[1]);
    const pV = profile[(k - 1 + n) % n], p = profile[k], pN = profile[(k + 1) % n];
    // Gehrung nur bei gleichen oder sich überschneidenden Bausteinen; sonst gerade (evtl. minimal zurückgesetzt)
    const a = pV?.quer && p?.quer ? eckSchnitt(pV, p, dV, d0) : null, b = p?.quer && pN?.quer ? eckSchnitt(p, pN, d1, dN) : null;
    const kk = (beta, mit, geh) => (mit ? eckFaktor(beta, true, geh) : 0); // Nachbar ohne Baustein: Ende rechtwinklig zur Biegekante (nachträglich mit «Flanschende» änderbar)
    return { k0: kk(knick(dV, d0), !!pV?.lage, !!a?.gehrung) - (a?.kB || 0), e0: a?.eB || 0, k1: kk(knick(d1, dN), !!pN?.lage, !!b?.gehrung) - (b?.kA || 0), e1: b?.eA || 0 };
  });
  const art = opt?.ecken || "gehrung"; if (art === "gehrung") { quadratEcken(gruppen, profile, ek, opt); return ek; }
  const t = +opt?.t || 0.7, gap = Math.max(0, +opt?.spalt || 0);
  gruppen.forEach((g, k) => { // Ecke am Anfang der Kante k (zwischen Kante k−1 und k): nur wo beide Kanten einen Baustein haben
    const kv = (k - 1 + n) % n; if (!profile[k]?.lage || !profile[kv]?.lage || kv === k) return;
    const dV = richtung(gruppen[kv].punkte.at(-2), gruppen[kv].punkte.at(-1)), d0 = richtung(g.punkte[0], g.punkte[1]), beta = knick(dV, d0);
    if (art === "spalt") { ek[k].e0 += gap / 2; ek[kv].e1 += gap / 2; }
    else if (art === "stoss") { const dd = (t / 2) / Math.max(0.2, Math.abs(Math.sin(beta))); ek[k].k0 = eckFaktor(beta, false); ek[k].e0 -= dd; ek[kv].k1 = 0; ek[kv].e1 += dd; } // Blech liegt mittig auf der Linie: Kante k reicht um t/2 über die Ecke bis zur Aussenfläche der Nachbarkante, diese endet t/2 vor der Ecke an der Innenfläche von k (kein Spalt, keine Durchdringung) // Kante k läuft bis zur Aussenfläche der Nachbarkante, die Nachbarkante endet an ihrer Innenfläche
  });
  return ek;
}
const sub = (a, b) => [a[0] - b[0], a[1] - b[1]];
const len = (a) => Math.hypot(a[0], a[1]);
const flaeche = (p) => p.reduce((s, a, i) => { const b = p[(i + 1) % p.length]; return s + a[0] * b[1] - b[0] * a[1]; }, 0) / 2;
export const gegenUhrzeiger = (pts) => (flaeche(pts) < 0 ? pts.slice().reverse() : pts.slice());

// Kanten eines geschlossenen Umrisses: gerade Strecken; Strecken mit kleinem Knick (Bogen) bilden eine Kante
// Teilstück einer geraden Kante: der Baustein (Flansch, Falz …) liegt nur zwischen von und bis (mm ab dem Anfang der Kante), nicht auf der ganzen Länge.
// teilGruppe liefert die Gruppe, auf die der Baustein wirkt (Anfang/Ende verschoben), oder null bei voller Länge.
export function teilGruppe(g, p) {
  const t = p?.teil; if (!t || !g?.gerade || g.punkte.length !== 2) return null;
  const d = richtung(g.punkte[0], g.punkte[1]), P = (u) => [g.punkte[0][0] + d[0] * u, g.punkte[0][1] + d[1] * u];
  return { ...g, punkte: [P(t.von), P(t.bis)], laenge: t.bis - t.von, teil: t };
}
export const reichtBisAnfang = (p) => !p?.teil || p.teil.von <= 1e-6, reichtBisEnde = (p) => !p?.teil || p.teil.bis >= p.teil.L - 1e-6;
export function kantenGruppen(pts, knickGrad = 15) {
  const n = pts.length, ri = (i) => { const d = sub(pts[(i + 1) % n], pts[i]); return Math.atan2(d[1], d[0]); };
  const knick = (i) => { let d = ri(i) - ri((i - 1 + n) % n); while (d > Math.PI) d -= 2 * Math.PI; while (d <= -Math.PI) d += 2 * Math.PI; return Math.abs(d) * 180 / Math.PI; };
  const sl = (i) => len(sub(pts[(i + 1) % n], pts[i]));
  // Ecke: deutlicher Knick – oder Übergang von einer langen Geraden in einen Bogen (sehr ungleiche Strecken)
  const ecke = (i) => { const a = sl((i - 1 + n) % n), b = sl(i); return knick(i) >= knickGrad || Math.max(a, b) / Math.max(Math.min(a, b), 1e-9) > 3; };
  const ecken = [...Array(n).keys()].filter(ecke);
  if (!ecken.length) ecken.push(0); // ganz rund (Kreis): eine Kante
  return ecken.map((e, k) => {
    const bis = ecken[(k + 1) % ecken.length], idx = [];
    for (let i = e; ; i = (i + 1) % n) { idx.push(i); if ((i + 1) % n === bis) break; }
    const punkte = [...idx.map((i) => pts[i]), pts[bis]];
    const laenge = punkte.slice(1).reduce((s, q, i) => s + len(sub(q, punkte[i])), 0);
    return { segmente: idx, punkte, laenge, gerade: idx.length === 1 };
  });
}

// Schnittpunkt der Geraden p+t·r und q+u·s
const schnitt = (p, r, q, s) => { const d = r[0] * s[1] - r[1] * s[0]; if (Math.abs(d) < 1e-12) return null; const t = ((q[0] - p[0]) * s[1] - (q[1] - p[1]) * s[0]) / d; return [p[0] + r[0] * t, p[1] + r[1] * t]; };
// Polylinie um d nach aussen (rechts bei Umriss gegen den Uhrzeiger) versetzen; Enden: Ausklinkung (senkrecht) oder
// bis zur Verlängerung der Nachbarkante, wenn diese keine Zugabe hat
// Lappen einer Kante im Zuschnitt bei Abwicklungsmass u: Kante um u nach aussen versetzt, Enden je nach Ecke (x(u)·k)
// Runde Freistellung: Viertelkreis über genau den Biegebereich (u = 0 … bisU): volle Tiefe an der Platte, null am Ende der Biegung
export const freiFaktor = (u, bisU) => (bisU == null || !(bisU > 0) || u >= bisU - 1e-9 ? 0 : Math.sqrt(Math.max(0, 1 - (Math.max(u, 0) / bisU) ** 2)));
function lappenLinie(g, u, x, f, y = 0, rel = null) {
  const pts = versatzLinie(g.punkte, -u), d0 = richtung(g.punkte[0], g.punkte[1]), d1 = richtung(g.punkte.at(-2), g.punkte.at(-1));
  const fr = rel == null ? freiFaktor(u, f.bisU) : rel === true ? 1 : rel === false ? 0 : rel, a = -x * f.k0 - y * (f.ky0 || 0) + (f.e0 || 0) + fr * (f.fr0 || 0), b = x * f.k1 + y * (f.ky1 || 0) - (f.e1 || 0) - fr * (f.fr1 || 0); // Verschiebung längs der Kante am Anfang / Ende
  pts[0] = [pts[0][0] + d0[0] * a, pts[0][1] + d0[1] * a];
  pts[pts.length - 1] = [pts.at(-1)[0] + d1[0] * b, pts.at(-1)[1] + d1[1] * b];
  return pts;
}
// Zuschnitt = aufgefaltetes 3D-Blech: Grundfläche + je Kante der Lappen bis zur Zugabe; an den Enden für jedes u
// genau dort abgeschnitten, wo das gekantete Profil an der Ecke endet. Biegelinien auf denselben Lappen.
export function abwicklung(pts, gruppen, profile, quetsch = null, opt = null) { // quetsch: Map k → Quetschfalte an der Ecke am Anfang der Kante k (siehe quetschEckeFlach)
  const ek = eckFaktoren(gruppen, profile, opt), umriss = [], n0 = gruppen.length, qA = (k) => quetsch?.get(k), qE = (k) => quetsch?.get((k + 1) % n0);
  gruppen.forEach((g0, k) => {
    const p = profile[k], tg = p?.lage && p.zugabe > 0 ? teilGruppe(g0, p) : null, g = tg || g0; // Teilstück: der Lappen liegt nur zwischen von und bis, davor/danach läuft der Umriss an der Plattenkante
    if (tg && !reichtBisAnfang(p)) umriss.push(g0.punkte[0]);
    if (p?.lage && p.zugabe < -1e-9) { umriss.push(...lappenLinie(g, p.zugabe, 0, ek[k], 0, false).slice(0, -1)); return; } // Kante nach innen gesetzt (z. B. bei Nähten): Zuschnitt kürzer als gezeichnet
    if (!p?.lage || !(p.zugabe > 0)) { umriss.push(...g.punkte.slice(0, -1)); return; }
    const lage = p.lage.filter(([u]) => u <= p.zugabe + 1e-9); if (lage.at(-1)[0] < p.zugabe - 1e-9) lage.push([p.zugabe, xBei(p.lage, p.zugabe)]);
    if (ek[k].bisU != null && (ek[k].fr0 || ek[k].fr1)) for (let j = 1; j < 12; j++) { const u = ek[k].bisU * j / 12; if (u < p.zugabe - 1e-9) lage.push([u, xBei(p.lage, u)]); } // Freistellung: Stützpunkte im Kreisbogen
    lage.sort((a, b) => a[0] - b[0]);
    const stufe = lage.map(([u, x]) => [u, x, null]);
    if (qA(k)) umriss.push(qA(k).P1); else for (const [u, x, rel] of stufe) umriss.push(lappenLinie(g, u, x, ek[k], yBei(p.lageY, u), rel)[0]); // Anfang: von der Kante nach aussen (bei Quetschfalte: Spitze der Seitenkante)
    const aussen = lappenLinie(g, p.zugabe, lage.at(-1)[1], ek[k], yBei(p.lageY, p.zugabe)); umriss.push(...aussen.slice(1, -1));
    if (qE(k)) { const q = qE(k); umriss.push(q.P2, ...(q.z.P2s[0] === q.z.P2[0] && q.z.P2s[1] === q.z.P2[1] ? [] : [q.P2s]), q.C, ...(q.z.P1s[0] === q.z.P1[0] && q.z.P1s[1] === q.z.P1[1] ? [] : [q.P1s])); } // Quetschfalte: Überschuss der Ecke
    else for (const [u, x, rel] of stufe.slice().reverse()) umriss.push(lappenLinie(g, u, x, ek[k], yBei(p.lageY, u), rel).at(-1)); // Ende: zurück zur Kante
    if (tg && !reichtBisEnde(p)) umriss.push(g0.punkte.at(-1));
  });
  let sauber = umriss.filter((p, i) => len(sub(p, umriss[(i + umriss.length - 1) % umriss.length])) > 1e-6);
  sauber = sauber.filter((p, i) => { // Punkte auf einer Geraden zwischen ihren Nachbarn weglassen
    const a = sauber[(i - 1 + sauber.length) % sauber.length], b = sauber[(i + 1) % sauber.length], u = sub(p, a), v = sub(b, p);
    return Math.abs(u[0] * v[1] - u[1] * v[0]) > 1e-6 * len(u) * len(v) || u[0] * v[0] + u[1] * v[1] < 0;
  });
  const linien = [];
  gruppen.forEach((g, k) => (profile[k]?.biegungen || []).forEach((b) => { const u = profile[k].zugabe < -1e-9 ? b.abstand : Math.max(b.abstand, 0), pk = lappenLinie(teilGruppe(g, profile[k]) || g, u, xBei(profile[k].lage, u), ek[k], yBei(profile[k].lageY, u)); if (qA(k) && b === profile[k].biegungen[0]) pk[0] = qA(k).O; if (qE(k) && b === profile[k].biegungen[0]) pk[pk.length - 1] = qE(k).O; linien.push({ kante: k, nr: b.nr, art: b.art, punkte: pk }); }));
  if (quetsch) for (const q of quetsch.values()) linien.push({ kante: -1, nr: 0, art: "quetsch", punkte: [q.O, q.C] }, { kante: -1, nr: 0, art: "ecklinie", punkte: [q.O, q.P1] }, { kante: -1, nr: 0, art: "ecklinie", punkte: [q.O, q.P2] });
  // Ausrichtung: längste gerade Kante waagrecht
  const gerade = gruppen.filter((g) => g.gerade).sort((a, b) => b.laenge - a.laenge)[0] || gruppen[0];
  const d = sub(gerade.punkte.at(-1), gerade.punkte[0]), w = -Math.atan2(d[1], d[0]), c = Math.cos(w), s = Math.sin(w);
  const dreh = (p) => [p[0] * c - p[1] * s, p[0] * s + p[1] * c];
  const gr = grenzen(sauber.map(dreh));
  return { umriss: sauber, linien, drehung: w, laenge: gr.x1 - gr.x0, breite: gr.y1 - gr.y0, flaeche: Math.abs(flaeche(sauber)) / 1e6, dreh };
}

// Fläche des Blechs bis zum Biegebeginn: jede Kante mit Baustein wird um kuerzen[k] mm nach innen versetzt (Ecken mit den Nachbarkanten
// verschnitten). So endet die ebene Platte dort, wo die erste Biegung beginnt – nicht erst an der gezeichneten Kante.
export function plattenUmriss(pts, gruppen, kuerzen, teile = null) { // teile: Map Kantenindex → { von, bis } (Teilstück): die Platte wird nur dort zurückgesetzt (Aussparung statt Versatz der ganzen Kante)
  const n = pts.length, d = new Array(n).fill(0), tk = [];
  gruppen.forEach((g, k) => g.segmente.forEach((i) => { const t = teile?.get?.(k) ?? teile?.[k]; if (t && g.gerade) { tk.push({ i, k, t, dist: Math.max(0, kuerzen[k] || 0) }); d[i] = 0; } else d[i] = Math.max(0, kuerzen[k] || 0); }));
  if (!d.some((v) => v > 1e-9) && !tk.some((x) => x.dist > 1e-9)) return pts;
  const lin = pts.map((a, i) => { const r = richtung(a, pts[(i + 1) % n]); return { p: [a[0] - r[1] * d[i], a[1] + r[0] * d[i]], r }; }); // nach links = nach innen (Umriss gegen den Uhrzeiger)
  const res = pts.map((_, i) => { const L0 = lin[(i - 1 + n) % n], L1 = lin[i]; return schnitt(L0.p, L0.r, L1.p, L1.r) ?? L1.p; });
  if (!tk.length) return res;
  const aus = [];
  res.forEach((q, i) => {
    aus.push(q); const x = tk.find((e) => e.i === i); if (!x || x.dist < 1e-9) return;
    const r = lin[i].r, nrm = [-r[1], r[0]], sA = (q[0] - pts[i][0]) * r[0] + (q[1] - pts[i][1]) * r[1], P = (u) => [q[0] + r[0] * (u - sA), q[1] + r[1] * (u - sA)];
    for (const [u, innen] of [[x.t.von, false], [x.t.von, true], [x.t.bis, true], [x.t.bis, false]]) { const pp = P(u); aus.push(innen ? [pp[0] + nrm[0] * x.dist, pp[1] + nrm[1] * x.dist] : pp); }
  });
  return aus;
}

// Quetschfalte an der Ecke am Anfang der Kante k: beide Nachbarkanten brauchen einen Flansch (eine Biegung) – Winkel und Höhen dürfen verschieden sein
export function quetschEcke(pts, gruppen, profile, k) {
  const n = gruppen.length, kv = (k - 1 + n) % n, gk = gruppen[k], gv = gruppen[kv];
  if (!gk?.gerade || !gv?.gerade) throw new Error("Quetschfalte: beide Kanten der Ecke müssen gerade sein.");
  const fl = (p, nr) => { const b = p?.biegungen; if (!b?.length) throw new Error(`Quetschfalte: an Kante ${nr + 1} fehlt ein Flansch.`); if (b.length > 1) throw new Error(`Quetschfalte: Kante ${nr + 1} hat mehrere Biegungen – nur ein einfacher Flansch wird unterstützt.`); return { abstand: b[0].abstand, zugabe: p.zugabe, phi: Math.abs(b[0].winkel), vz: Math.sign(b[0].winkel) }; };
  const F1 = fl(profile[k], k), F2 = fl(profile[kv], kv);
  if (F1.vz !== F2.vz) throw new Error("Quetschfalte: beide Flansche müssen zur selben Seite abgekantet sein.");
  const V = gk.punkte[0], dn = richtung(gk.punkte[0], gk.punkte[1]), dp = richtung(gv.punkte.at(-1), gv.punkte.at(-2));
  return { ...quetschEckeFlach(V, dn, dp, F1, F2), vz: F1.vz, F1, F2 };
}

// Alles für ein Blech: Kanten, Profile der Bausteine, Abwicklung. kanten[k] = Baustein (oder null)
export function flaechenblech(ptsRoh, kanten, m, quetschEcken = [], opt = null) { // quetschEcken: Ecken (Index k = Anfang der Kante k), an denen eine Quetschfalte gesetzt ist
  const pts = gegenUhrzeiger(ptsRoh), gruppen = kantenGruppen(pts);
  const profile = gruppen.map((_, k) => { const b = kanten[k]; try { return b ? { ...bausteinProfil(b, m), baustein: b } : null; } catch (e) { throw new Error(`Kante ${k + 1} (${b.name}): ${e.message}`); } });
  if (opt?.teil) gruppen.forEach((g, k) => { // Teilstücke: nur gerade Kanten mit Baustein; ausserhalb von 0…Länge beschnitten
    const t = opt.teil[k]; if (!t || !g.gerade || !profile[k]) return;
    const von = Math.max(0, +t.von || 0), bis = Math.min(g.laenge, Number.isFinite(+t.bis) ? +t.bis : g.laenge);
    if (bis - von > 1e-6 && (von > 1e-6 || bis < g.laenge - 1e-6)) profile[k].teil = { von, bis, L: g.laenge };
  });
  const quetsch = new Map(), fehlerQ = {};
  for (const k of quetschEcken || []) {
    try { quetsch.set(k, quetschEcke(pts, gruppen, profile, k)); } catch (e) { fehlerQ[k] = e.message; }
  }
  let opt2 = opt ? { ...opt, t: m.t } : null;
  if (quetsch.size) { // Quetschfalte: Gehrung an der Ecke; der Flansch, auf dem die Falte liegt, endet um eine Blechstärke früher (dort beginnt der 180°-Saum)
    const n = gruppen.length, kuerzen = {}; opt2 = { ...(opt2 || { t: m.t }), kuerzen };
    for (const [k, q] of quetsch) {
      const kv = (k - 1 + n) % n, tausch = q.vz * (opt?.sichtseite === -1 ? -1 : 1) < 0, rechts = opt?.quetschRichtung?.[k] === "rechts", e1Flansch = !tausch ? k : kv, aKante = rechts ? (e1Flansch === k ? kv : k) : e1Flansch;
      try { const g = eckeGeometrie(q.beta, (tausch ? q.F2 : q.F1).phi, (tausch ? q.F1 : q.F2).phi), gam = (rechts ? g.gamma2 : g.gamma1) * Math.PI / 180, an = quetschAnschluss(g, rechts ? "wand2" : "wand1", m.t), dist = an ? Math.max(0, an.aK - an.aI) : m.t; kuerzen[aKante === k ? `${k}:start` : `${kv}:ende`] = dist / Math.max(0.2, Math.sin(gam)); } catch { /* ohne Kürzung */ } // der Flansch endet dort, wo der 180°-Saum beginnt (aK), statt an der Gehrung (aI)
    }
  }
  return { pts, gruppen, profile, quetsch, quetschFehler: fehlerQ, opt: opt2, abw: abwicklung(pts, gruppen, profile, quetsch.size ? quetsch : null, opt2) };
}

// ------------------------------------------------------------------------------------------------------------------
// Abwickeln / Falten: Punkte der flachen Abwicklung (Skizzenkoordinaten) auf das gekantete Blech abbilden.
// Profil-Mittellinie bei Abwicklungsmass u (ab gezeichneter Kante nach aussen): x = Abstand nach aussen, y = Höhe, th = Richtung.
export function profilPunkt(p, u) {
  if (!p?.res) return null;
  let s = u + X - (p.versatz || 0);
  if (s < 0) return { x: u, y: 0, th: 0 };
  const v = p.versatz || 0;
  for (const el of p.res.pfad) {
    if (el.typ === "linie") {
      const l = Math.hypot(el.p2[0] - el.p1[0], el.p2[1] - el.p1[1]);
      if (s <= l + 1e-9) { const f = l > 0 ? s / l : 0; return { x: el.p1[0] + (el.p2[0] - el.p1[0]) * f - X + v, y: el.p1[1] + (el.p2[1] - el.p1[1]) * f, th: Math.atan2(el.p2[1] - el.p1[1], el.p2[0] - el.p1[0]) }; }
      s -= l;
    } else {
      const a = (el.winkel * Math.PI) / 180, ba = (el.rm - p.t / 2 + p.k * p.t) * Math.abs(a);
      if (s <= ba + 1e-9) { const w = el.start + a * (ba > 0 ? s / ba : 0); return { x: el.zentrum[0] + el.rm * Math.cos(w) - X + v, y: el.zentrum[1] + el.rm * Math.sin(w), th: w + (a > 0 ? 1 : -1) * Math.PI / 2 }; }
      s -= ba;
    }
  }
  return null; // ausserhalb des Zuschnitts
}
// Flacher Punkt q (Skizzenkoordinaten) → { p: [x, y, z] im gekanteten Zustand (z = Höhe zur Sichtseite), n: Flächennormale }.
// Nur gerade Kanten mit Baustein sind abgebildet; sonst bleibt der Punkt in der Platte.
export function faltePunkt(bl, q, seite = 1) {
  let best = null;
  bl.gruppen.forEach((g, k) => {
    const pr = bl.profile[k]; if (!pr?.res || !g.gerade) return;
    for (let i = 1; i < g.punkte.length; i++) {
      const a = g.punkte[i - 1], b = g.punkte[i], L = Math.hypot(b[0] - a[0], b[1] - a[1]); if (L < 1e-9) continue;
      const d = [(b[0] - a[0]) / L, (b[1] - a[1]) / L], nout = [d[1], -d[0]], t = (q[0] - a[0]) * d[0] + (q[1] - a[1]) * d[1], u = (q[0] - a[0]) * nout[0] + (q[1] - a[1]) * nout[1];
      if (t < -1e-6 || t > L + 1e-6) continue;
      const pp = profilPunkt(pr, u); if (!pp) continue;
      if (!best || u > best.u) best = { u, a, d, nout, t, pp };
    }
  });
  if (!best) return { p: [q[0], q[1], 0], n: [0, 0, seite] };
  const { a, d, nout, t, pp } = best;
  return { p: [a[0] + d[0] * t + nout[0] * pp.x, a[1] + d[1] * t + nout[1] * pp.x, seite * pp.y], n: [-Math.sin(pp.th) * nout[0], -Math.sin(pp.th) * nout[1], seite * Math.cos(pp.th)] };
}
// Ausschnitt (Polygon in der Abwicklung) als geschlossener Werkzeugkörper im gekanteten Blech: Fläche fein unterteilt, abgebildet
// und beidseitig um T entlang der Flächennormale versetzt. Rückgabe: Dreiecke (x,y,z je Ecke), Aussenseite nach aussen.
export function ausschnittWerkzeug(bl, loop, seite = 1, T = 1, h = 2) {
  let poly = loop.slice(); if (poly.length > 1 && Math.hypot(poly[0][0] - poly.at(-1)[0], poly[0][1] - poly.at(-1)[1]) < 1e-9) poly.pop();
  if (poly.length < 3) return new Float32Array(0);
  const A = poly.reduce((s, q, i) => s + q[0] * poly[(i + 1) % poly.length][1] - poly[(i + 1) % poly.length][0] * q[1], 0);
  if (A < 0) poly = poly.reverse();
  // Dreiecke der Fläche (Ohrenschnitt) – Eigene, kleine Implementierung, damit der Kern ohne three.js auskommt
  const idx = poly.map((_, i) => i), tris = [], cr = (a, b, c) => (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
  const inTri = (p, a, b, c) => cr(a, b, p) >= -1e-12 && cr(b, c, p) >= -1e-12 && cr(c, a, p) >= -1e-12;
  let schutz = 0;
  while (idx.length > 3 && schutz++ < 10000) {
    let ok = false;
    for (let i = 0; i < idx.length; i++) {
      const i0 = idx[(i + idx.length - 1) % idx.length], i1 = idx[i], i2 = idx[(i + 1) % idx.length], a = poly[i0], b = poly[i1], c = poly[i2];
      if (cr(a, b, c) <= 1e-12) continue;
      if (idx.some((j) => j !== i0 && j !== i1 && j !== i2 && inTri(poly[j], a, b, c))) continue;
      tris.push([i0, i1, i2]); idx.splice(i, 1); ok = true; break;
    }
    if (!ok) break;
  }
  if (idx.length === 3) tris.push([idx[0], idx[1], idx[2]]);
  // Gleichmässig unterteilen (jede Dreiecksseite in N Stücke), Knoten über gerundete Koordinaten vereinigen
  const maxKante = Math.max(...tris.flatMap(([i, j, k]) => [[i, j], [j, k], [k, i]].map(([x, y]) => Math.hypot(poly[x][0] - poly[y][0], poly[x][1] - poly[y][1]))));
  // Liegt der ganze Ausschnitt auf der ebenen Platte, braucht es keine Unterteilung
  const xs = poly.map((q) => q[0]), ys = poly.map((q) => q[1]), x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
  let eben = true; for (let i = 0; i <= 6 && eben; i++) for (let j = 0; j <= 6 && eben; j++) { const q = [x0 + ((x1 - x0) * i) / 6, y0 + ((y1 - y0) * j) / 6], f = faltePunkt(bl, q, seite); if (Math.abs(f.p[2]) > 1e-9 || Math.hypot(f.p[0] - q[0], f.p[1] - q[1]) > 1e-9) eben = false; }
  const N = eben ? 1 : Math.min(64, Math.max(1, 2 ** Math.ceil(Math.log2(Math.max(1, maxKante / h)))));
  const key = (q) => `${Math.round(q[0] * 1e5)},${Math.round(q[1] * 1e5)}`, knoten = new Map(), pos = [];
  const vid = (q) => { const k = key(q); let e = knoten.get(k); if (!e) { const f = faltePunkt(bl, q, seite); e = { i: knoten.size, f }; knoten.set(k, e); } return e; };
  const flach = []; // [e1,e2,e3] je Teildreieck, gegen den Uhrzeiger in der Abwicklung
  for (const [i, j, k] of tris) {
    const P = [poly[i], poly[j], poly[k]], pt = (a, b) => [P[0][0] + ((P[1][0] - P[0][0]) * a + (P[2][0] - P[0][0]) * b) / N, P[0][1] + ((P[1][1] - P[0][1]) * a + (P[2][1] - P[0][1]) * b) / N];
    for (let a = 0; a < N; a++) for (let b = 0; b < N - a; b++) {
      flach.push([vid(pt(a, b)), vid(pt(a + 1, b)), vid(pt(a, b + 1))]);
      if (a + b < N - 1) flach.push([vid(pt(a + 1, b)), vid(pt(a + 1, b + 1)), vid(pt(a, b + 1))]);
    }
  }
  const lis = [...knoten.values()].sort((x, y) => x.i - y.i);
  const oben = lis.map(({ f }) => f.p.map((v, c) => v + f.n[c] * T)), unten = lis.map(({ f }) => f.p.map((v, c) => v - f.n[c] * T));
  const tri = (a, b, c) => pos.push(...a, ...b, ...c), kanten = new Map();
  for (const [a, b, c] of flach) { tri(oben[a.i], oben[b.i], oben[c.i]); tri(unten[a.i], unten[c.i], unten[b.i]); for (const [x, y] of [[a, b], [b, c], [c, a]]) { const k1 = `${x.i}>${y.i}`, k2 = `${y.i}>${x.i}`; if (kanten.has(k2)) kanten.delete(k2); else kanten.set(k1, [x.i, y.i]); } }
  for (const [x, y] of kanten.values()) { tri(unten[x], unten[y], oben[y]); tri(unten[x], oben[y], oben[x]); } // Seitenwand an der Aussenkontur
  // Umlaufsinn prüfen: negatives Volumen (z. B. Sichtseite -1) → alle Dreiecke umdrehen
  let vol = 0; for (let i = 0; i < pos.length; i += 9) { const [a, b, c] = [pos.slice(i, i + 3), pos.slice(i + 3, i + 6), pos.slice(i + 6, i + 9)]; vol += a[0] * (b[1] * c[2] - b[2] * c[1]) - a[1] * (b[0] * c[2] - b[2] * c[0]) + a[2] * (b[0] * c[1] - b[1] * c[0]); }
  if (vol < 0) for (let i = 0; i < pos.length; i += 9) for (let c = 0; c < 3; c++) { const t = pos[i + 3 + c]; pos[i + 3 + c] = pos[i + 6 + c]; pos[i + 6 + c] = t; }
  return Float32Array.from(pos);
}

// Kontur des Ausschnitts auf Vorder- und Rückseite des gekanteten Blechs (für die Kantenlinien): [vorn, hinten], je Punktliste
export function ausschnittKante(bl, loop, seite = 1, halb = 0.35, h = 1.5) {
  let poly = loop.slice(); if (poly.length > 1 && Math.hypot(poly[0][0] - poly.at(-1)[0], poly[0][1] - poly.at(-1)[1]) < 1e-9) poly.pop();
  const vorn = [], hinten = [];
  poly.forEach((a, i) => {
    const b = poly[(i + 1) % poly.length], n = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / h));
    for (let k = 0; k < n; k++) { const q = [a[0] + ((b[0] - a[0]) * k) / n, a[1] + ((b[1] - a[1]) * k) / n], f = faltePunkt(bl, q, seite); vorn.push(f.p.map((v, c) => v + f.n[c] * halb)); hinten.push(f.p.map((v, c) => v - f.n[c] * halb)); }
  });
  return [vorn, hinten];
}
