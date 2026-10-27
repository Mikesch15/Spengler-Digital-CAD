// Spengler Digital CAD – Kern: Flächenblech mit Kantenbausteinen
// Ein Blech wird nur als Grundfläche (Polygon in seiner Ebene) gezeichnet. An jeder Kante sitzt ein
// Kantenbaustein (Doppelstehfalz, Umschlag, Aufkantung …) als Abkantfolge ab der Kante nach aussen.
// Daraus: Zugabe je Kante, Zuschnitt (Umriss mit Eckausklinkung), Biegelinien, Abkantliste.
// Querschnitt eines Bausteins: x = von der Kante nach aussen, y = zur Sichtseite. Reines JavaScript.
import { berechne, versatzLinie, grenzen } from "./geometrie.js";
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
  return { zeilen, res, zugabe, biegungen, versatz: v, lage: profilLage(res, m, v) };
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
export function eckFaktor(beta, nachbarMitBaustein) {
  const k = nachbarMitBaustein || Math.abs(Math.sin(beta)) < 0.2 ? Math.tan(beta / 2) : -1 / Math.tan(beta);
  return Math.max(-4, Math.min(4, k));
}
const knick = (d1, d2) => Math.atan2(d1[0] * d2[1] - d1[1] * d2[0], d1[0] * d2[0] + d1[1] * d2[1]);
const richtung = (a, b) => { const l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1; return [(b[0] - a[0]) / l, (b[1] - a[1]) / l]; };
export function eckFaktoren(gruppen, profile) {
  const n = gruppen.length;
  return gruppen.map((g, k) => {
    const vor = gruppen[(k - 1 + n) % n], nach = gruppen[(k + 1) % n];
    return { k0: eckFaktor(knick(richtung(vor.punkte.at(-2), vor.punkte.at(-1)), richtung(g.punkte[0], g.punkte[1])), !!profile[(k - 1 + n) % n]?.lage),
      k1: eckFaktor(knick(richtung(g.punkte.at(-2), g.punkte.at(-1)), richtung(nach.punkte[0], nach.punkte[1])), !!profile[(k + 1) % n]?.lage) };
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
  pts[0] = [pts[0][0] - d0[0] * x * f.k0, pts[0][1] - d0[1] * x * f.k0];
  pts[pts.length - 1] = [pts.at(-1)[0] + d1[0] * x * f.k1, pts.at(-1)[1] + d1[1] * x * f.k1];
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
