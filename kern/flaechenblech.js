// Spengler Digital CAD – Kern: Flächenblech mit Kantenbausteinen
// Ein Blech wird nur als Grundfläche (Polygon in seiner Ebene) gezeichnet. An jeder Kante sitzt ein
// Kantenbaustein (Doppelstehfalz, Umschlag, Aufkantung …) als Abkantfolge ab der Kante nach aussen.
// Daraus: Zugabe je Kante, Zuschnitt (Umriss mit Eckausklinkung), Biegelinien, Abkantliste.
// Querschnitt eines Bausteins: x = von der Kante nach aussen, y = zur Sichtseite. Reines JavaScript.
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
  { id: "paneel", name: "Paneel: Abkantung 30 mit Einhang", gruppe: "Fassade", folge: "-90 30 -90 15", versatz: 0 },
];

// Abkantfolge des Bausteins rechnen (wie ein Profil mit einem langen Anfangsschenkel auf der Fläche)
const X = 100;
export function bausteinProfil(b, m) {
  if (!b || !String(b.folge ?? "").trim()) return { zugabe: 0, biegungen: [], zeilen: [] };
  const zeilen = folge(`${X} ${b.folge}`);
  const { start, ops } = freiesProfil(0, zeilen, m);
  const res = berechne(start, ops, m.t, m.ri, m.k);
  const v = +b.versatz || 0, zugabe = res.zuschnitt - X + v;
  // Anschlag ab Schnittkante des Zuschnitts; abstand = Lage der Biegelinie ab der gezeichneten Kante (nach aussen)
  const biegungen = res.biegungen.map((bg) => ({ ...bg, anschlag: res.zuschnitt - bg.pos, abstand: bg.pos - X + v }));
  // Querschnitt (x nach aussen, y Höhe) ohne den Anfangsschenkel auf der Fläche – für die Eckprüfung
  const quer = kontur(res.pfad, m.t, 6).map(([x, y]) => [x - X + v, y]);
  return { zeilen, res, zugabe, biegungen, versatz: v, lage: profilLage(res, m, v), quer, t: m.t, ri: m.ri };
}

// Profil-Mittellinie: Abwicklungsmass u (ab gezeichneter Kante, wie im Zuschnitt) ↔ x = Abstand nach aussen im gekanteten Zustand.
// Liste [u, x] für u von 0 bis zur Zugabe; Bögen mit der Biegezugabe (K-Faktor) wie in berechne().
function profilLage(res, m, v) {
  const roh = []; let u = 0;
  for (const el of res.pfad) {
    if (el.typ === "linie") { if (!roh.length) roh.push([u, el.p1[0]]); u += Math.hypot(el.p2[0] - el.p1[0], el.p2[1] - el.p1[1]); roh.push([u, el.p2[0]]); }
    else {
      const a = (el.winkel * Math.PI) / 180, ba = (el.rm - m.t / 2 + m.k * m.t) * Math.abs(a), n = 8;
      if (!roh.length) roh.push([u, el.p1[0]]);
      for (let i = 1; i <= n; i++) roh.push([u + (ba * i) / n, el.zentrum[0] + el.rm * Math.cos(el.start + (a * i) / n)]);
      u += ba;
    }
  }
  const um = roh.map(([uu, x]) => [uu - X + v, x - X + v]), out = [[0, xBei(um, 0)]];
  for (const q of um) if (q[0] > 1e-9) out.push(q);
  return out;
}
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
function treffer(pA, pB, dA, dB, eA, eB, nurAusserhalb) {
  const t = Math.max(pA.t, pB.t), zone = Math.max(pA.ri || 1, pB.ri || 1) + 1.5 * t, nA = [dA[1], -dA[0]], nB = [dB[1], -dB[0]];
  const ys = [...new Set([...pA.quer, ...pB.quer].map(([, y]) => +y.toFixed(3)))].sort((a, b) => a - b), levels = [];
  for (let k = 0; k + 1 < ys.length; k++) { const n = Math.max(1, Math.min(10, Math.floor((ys[k + 1] - ys[k]) / 0.5))); for (let i = 0; i < n; i++) levels.push(ys[k] + ((ys[k + 1] - ys[k]) * (i + 0.5)) / n); }
  const ohneZone = (I) => I.flatMap(([u, v]) => [[u, Math.min(v, -zone)], [Math.max(u, zone), v]]).filter(([u, v]) => v - u > 1e-6);
  const ohnePlatte = (I) => I.map(([u, v]) => [Math.max(u, zone), v]).filter(([u, v]) => v - u > 1e-6);
  for (const y of levels) {
    let IA = intervalle(pA.quer, y), IB = intervalle(pB.quer, y);
    if (Math.abs(y) <= t / 2 + 0.02) { IA = ohnePlatte(IA); IB = ohnePlatte(IB); }
    if (nurAusserhalb) { IA = ohneZone(IA); IB = ohneZone(IB); }
    for (const a of IA) for (const b of IB) if (streifenSchnitt(dA, nA, a, eA, dB, nB, b, eB)) return true;
  }
  return false;
}
const UEB = new Map();
export function eckSchnitt(pA, pB, dA, dB) {
  const key = `${pA.zeilen?.map((z) => z.L + "/" + z.winkel + z.art).join()}|${pB.zeilen?.map((z) => z.L + "/" + z.winkel + z.art).join()}|${pA.versatz}|${pB.versatz}|${pA.t}|${dA.map((v) => v.toFixed(4))}|${dB.map((v) => v.toFixed(4))}`;
  if (UEB.has(key)) return UEB.get(key);
  const gleich = JSON.stringify(pA.zeilen) === JSON.stringify(pB.zeilen) && pA.versatz === pB.versatz;
  let r;
  if (gleich || treffer(pA, pB, dA, dB, 0, 0, true)) r = { gehrung: true, eA: 0, eB: 0 }; // gleiche oder deutlich überschneidende Bausteine
  else {
    // nur im Biegebereich: einen der beiden minimal zurücksetzen (den, der dafür am wenigsten verliert), der andere läuft durch
    const Z = 4, mass = (beiA) => { let e = 0; while (e <= Z && treffer(pA, pB, dA, dB, beiA ? e : 0, beiA ? 0 : e, false)) e = +(e + 0.05).toFixed(2); return e; };
    const eA = mass(true), eB = mass(false);
    r = Math.min(eA, eB) > Z ? { gehrung: true, eA: 0, eB: 0 } : eA <= eB ? { gehrung: false, eA, eB: 0 } : { gehrung: false, eA: 0, eB };
  }
  if (UEB.size > 500) UEB.clear();
  UEB.set(key, r); return r;
}
const knick = (d1, d2) => Math.atan2(d1[0] * d2[1] - d1[1] * d2[0], d1[0] * d2[0] + d1[1] * d2[1]);
const richtung = (a, b) => { const l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1; return [(b[0] - a[0]) / l, (b[1] - a[1]) / l]; };
export function eckFaktoren(gruppen, profile) {
  const n = gruppen.length;
  return gruppen.map((g, k) => {
    const vor = gruppen[(k - 1 + n) % n], nach = gruppen[(k + 1) % n];
    const dV = richtung(vor.punkte.at(-2), vor.punkte.at(-1)), d0 = richtung(g.punkte[0], g.punkte[1]), d1 = richtung(g.punkte.at(-2), g.punkte.at(-1)), dN = richtung(nach.punkte[0], nach.punkte[1]);
    const pV = profile[(k - 1 + n) % n], p = profile[k], pN = profile[(k + 1) % n];
    // Gehrung nur bei gleichen oder sich überschneidenden Bausteinen; sonst gerade (evtl. minimal zurückgesetzt)
    const a = pV?.quer && p?.quer ? eckSchnitt(pV, p, dV, d0) : null, b = p?.quer && pN?.quer ? eckSchnitt(p, pN, d1, dN) : null;
    return { k0: eckFaktor(knick(dV, d0), !!pV?.lage, !!a?.gehrung), e0: a?.eB || 0, k1: eckFaktor(knick(d1, dN), !!pN?.lage, !!b?.gehrung), e1: b?.eA || 0 };
  });
}
const sub = (a, b) => [a[0] - b[0], a[1] - b[1]];
const len = (a) => Math.hypot(a[0], a[1]);
const flaeche = (p) => p.reduce((s, a, i) => { const b = p[(i + 1) % p.length]; return s + a[0] * b[1] - b[0] * a[1]; }, 0) / 2;
export const gegenUhrzeiger = (pts) => (flaeche(pts) < 0 ? pts.slice().reverse() : pts.slice());

// Kanten eines geschlossenen Umrisses: gerade Strecken; Strecken mit kleinem Knick (Bogen) bilden eine Kante
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
function lappenLinie(g, u, x, f) {
  const pts = versatzLinie(g.punkte, -u), d0 = richtung(g.punkte[0], g.punkte[1]), d1 = richtung(g.punkte.at(-2), g.punkte.at(-1));
  const a = -x * f.k0 + (f.e0 || 0), b = x * f.k1 - (f.e1 || 0); // Verschiebung längs der Kante am Anfang / Ende
  pts[0] = [pts[0][0] + d0[0] * a, pts[0][1] + d0[1] * a];
  pts[pts.length - 1] = [pts.at(-1)[0] + d1[0] * b, pts.at(-1)[1] + d1[1] * b];
  return pts;
}
// Zuschnitt = aufgefaltetes 3D-Blech: Grundfläche + je Kante der Lappen bis zur Zugabe; an den Enden für jedes u
// genau dort abgeschnitten, wo das gekantete Profil an der Ecke endet. Biegelinien auf denselben Lappen.
export function abwicklung(pts, gruppen, profile) {
  const ek = eckFaktoren(gruppen, profile), umriss = [];
  gruppen.forEach((g, k) => {
    const p = profile[k];
    if (!p?.lage || !(p.zugabe > 0)) { umriss.push(...g.punkte.slice(0, -1)); return; }
    const lage = p.lage.filter(([u]) => u <= p.zugabe + 1e-9); if (lage.at(-1)[0] < p.zugabe - 1e-9) lage.push([p.zugabe, xBei(p.lage, p.zugabe)]);
    for (const [u, x] of lage) umriss.push(lappenLinie(g, u, x, ek[k])[0]); // Anfang: von der Kante nach aussen
    const aussen = lappenLinie(g, p.zugabe, lage.at(-1)[1], ek[k]); umriss.push(...aussen.slice(1, -1));
    for (const [u, x] of lage.slice().reverse()) umriss.push(lappenLinie(g, u, x, ek[k]).at(-1)); // Ende: zurück zur Kante
  });
  let sauber = umriss.filter((p, i) => len(sub(p, umriss[(i + umriss.length - 1) % umriss.length])) > 1e-6);
  sauber = sauber.filter((p, i) => { // Punkte auf einer Geraden zwischen ihren Nachbarn weglassen
    const a = sauber[(i - 1 + sauber.length) % sauber.length], b = sauber[(i + 1) % sauber.length], u = sub(p, a), v = sub(b, p);
    return Math.abs(u[0] * v[1] - u[1] * v[0]) > 1e-6 * len(u) * len(v) || u[0] * v[0] + u[1] * v[1] < 0;
  });
  const linien = [];
  gruppen.forEach((g, k) => (profile[k]?.biegungen || []).forEach((b) => { const u = Math.max(b.abstand, 0); linien.push({ kante: k, nr: b.nr, art: b.art, punkte: lappenLinie(g, u, xBei(profile[k].lage, u), ek[k]) }); }));
  // Ausrichtung: längste gerade Kante waagrecht
  const gerade = gruppen.filter((g) => g.gerade).sort((a, b) => b.laenge - a.laenge)[0] || gruppen[0];
  const d = sub(gerade.punkte.at(-1), gerade.punkte[0]), w = -Math.atan2(d[1], d[0]), c = Math.cos(w), s = Math.sin(w);
  const dreh = (p) => [p[0] * c - p[1] * s, p[0] * s + p[1] * c];
  const gr = grenzen(sauber.map(dreh));
  return { umriss: sauber, linien, drehung: w, laenge: gr.x1 - gr.x0, breite: gr.y1 - gr.y0, flaeche: Math.abs(flaeche(sauber)) / 1e6, dreh };
}

// Alles für ein Blech: Kanten, Profile der Bausteine, Abwicklung. kanten[k] = Baustein (oder null)
export function flaechenblech(ptsRoh, kanten, m) {
  const pts = gegenUhrzeiger(ptsRoh), gruppen = kantenGruppen(pts);
  const profile = gruppen.map((_, k) => { const b = kanten[k]; try { return b ? { ...bausteinProfil(b, m), baustein: b } : null; } catch (e) { throw new Error(`Kante ${k + 1} (${b.name}): ${e.message}`); } });
  return { pts, gruppen, profile, abw: abwicklung(pts, gruppen, profile) };
}
