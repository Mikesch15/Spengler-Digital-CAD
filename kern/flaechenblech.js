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
  return { zeilen, res, zugabe, biegungen };
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
function versetzeKante(gruppen, z, k, d) {
  const g = gruppen[k], n = gruppen.length, pts = versatzLinie(g.punkte, -d);
  if (!d) return pts;
  const vor = gruppen[(k - 1 + n) % n], nach = gruppen[(k + 1) % n];
  const anfangR = sub(pts[1], pts[0]), endeR = sub(pts.at(-1), pts.at(-2));
  if (!(z[(k - 1 + n) % n] > 0)) { const a = vor.punkte.at(-2), b = vor.punkte.at(-1), s = schnitt(pts[0], anfangR, b, sub(b, a)); if (s) pts[0] = s; }
  if (!(z[(k + 1) % n] > 0)) { const a = nach.punkte[0], b = nach.punkte[1], s = schnitt(pts.at(-1), endeR, a, sub(b, a)); if (s) pts[pts.length - 1] = s; }
  return pts;
}

// Zuschnitt: Umriss, Biegelinien (je Kante je Biegung), Abmessungen in Richtung der längsten geraden Kante
export function abwicklung(pts, gruppen, profile) {
  const z = profile.map((p) => p?.zugabe || 0), umriss = [];
  gruppen.forEach((g, k) => {
    const off = versetzeKante(gruppen, z, k, z[k]);
    umriss.push(...off);
    if (z[k] > 0 && z[(k + 1) % gruppen.length] > 0) umriss.push(g.punkte.at(-1)); // Ecke ausklinken
  });
  let sauber = umriss.filter((p, i) => len(sub(p, umriss[(i + umriss.length - 1) % umriss.length])) > 1e-6);
  sauber = sauber.filter((p, i) => { // Punkte auf einer Geraden zwischen ihren Nachbarn weglassen
    const a = sauber[(i - 1 + sauber.length) % sauber.length], b = sauber[(i + 1) % sauber.length], u = sub(p, a), v = sub(b, p);
    return Math.abs(u[0] * v[1] - u[1] * v[0]) > 1e-6 * len(u) * len(v) || u[0] * v[0] + u[1] * v[1] < 0;
  });
  const linien = [];
  gruppen.forEach((g, k) => (profile[k]?.biegungen || []).forEach((b) => linien.push({ kante: k, nr: b.nr, art: b.art, punkte: versetzeKante(gruppen, z, k, Math.max(b.abstand, 0)) })));
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
