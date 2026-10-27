// Spengler Digital CAD – Kern: Spenglerdetails
// Ein Detail ist ein Querschnitt aus Unterkonstruktion (Holz) und mehreren Blechteilen, wie in einer
// Schnittzeichnung. Jedes Blechteil ist ein freies Profil (Schenkel/Winkel/Umschlag) mit Startpunkt (Kante A).
// Querschnitt: x nach rechts, y nach oben, mm. Reines JavaScript ohne Abhängigkeiten.
import { berechne, grenzen, polylinie, kontur } from "./geometrie.js";
import { freiesProfil } from "./profile.js";

// ------------------------------------------------------------ Abkantfolge als Kurzschrift
// «150 90 25 U+ 7»: Schenkel 150, Abkanten 90° (+ = links/oben), Schenkel 25, Umschlag nach links, Schenkel 7.
// U+ / U− Umschlag zur linken/rechten Seite; «U+r2» Umschlag mit Innenradius 2 mm (um weitere Lagen), «90r5» Radius 5.
export function folge(text) {
  const t = String(text).replace(/[,;]/g, " ").replace(/−/g, "-").trim().split(/\s+/).filter(Boolean);
  if (!t.length) throw new Error("Abkantfolge ist leer");
  const zeilen = [];
  for (let i = 0; i < t.length; i += 2) {
    const L = parseFloat(t[i]);
    if (!(L > 0)) throw new Error(`«${t[i]}» ist keine Schenkellänge`);
    const z = { L, winkel: 0, art: "abkanten" };
    const w = t[i + 1];
    if (w != null) {
      const m = /^(U[+-]?|[+-]?\d+(?:\.\d+)?)(?:r(\d+(?:\.\d+)?))?$/i.exec(w);
      if (!m) throw new Error(`«${w}» ist kein Winkel (Zahl, U+ oder U−)`);
      if (/^u/i.test(m[1])) Object.assign(z, { art: "umschlag", winkel: m[1].endsWith("-") ? -180 : 180 });
      else z.winkel = parseFloat(m[1]);
      if (m[2]) z.ri = parseFloat(m[2]);
    }
    zeilen.push(z);
  }
  return zeilen;
}
export const folgeText = (zeilen) => zeilen.map((z, i) => {
  const L = +(+z.L).toFixed(2);
  if (i === zeilen.length - 1) return String(L);
  const w = z.art === "umschlag" ? (z.winkel < 0 ? "U-" : "U+") : String(+(+z.winkel).toFixed(2));
  return `${L} ${w}${z.ri > 0 ? "r" + +(+z.ri).toFixed(2) : ""}`;
}).join(" ");

// Hilfen für die Vorlagen
const Z = (...a) => folge(a.map((x) => (typeof x === "object" ? `${x.u ? (x.u > 0 ? "U+" : "U-") : x.w}r${x.ri}` : x)).join(" "));
const rechteck = (x0, y0, x1, y1) => [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];
const rad = (g) => (g * Math.PI) / 180;
const teil = (name, rolle, x, y, start, zeilen) => ({ name, rolle, x, y, start, zeilen });
const holz = (name, pts, art = "holz") => ({ name, pts, art });
const mass = (a, b, ab = 15, text = null) => ({ a, b, ab, text }); // ab: Abstand der Masslinie (links der Richtung a→b positiv)

// ------------------------------------------------------------ Vorlagen
// Rollen: dach, fassade, wappen, zubehoer (Hafte, Streifen) – je Rolle ein Material im Detail
export const ROLLEN = { dach: "Dach", fassade: "Fassade", wappen: "Wappen / Einlage", zubehoer: "Hafte, Streifen" };

export const DETAILS = [
  { id: "dsf", name: "Doppelstehfalz", gruppe: "Falze", params: [["H", "Falzhöhe", "mm", 25], ["b", "Bahn je Seite (Ausschnitt)", "mm", 90], ["u", "Umschlag Unterfalz", "mm", 7], ["holz", "Schalung", "mm", 27]],
    bau: (p, t) => ({
      holz: [holz("Schalung", rechteck(-p.b, -p.holz, p.b, 0))],
      teile: [
        teil("Bahn links (Unterfalz)", "dach", -p.b, t / 2, 0, Z(p.b, 90, p.H, "U+", p.u)),
        teil("Bahn rechts (Oberfalz)", "dach", p.b, t / 2, 180, Z(p.b - t, -90, p.H + t, { u: 1, ri: 2.5 * t }, p.u + 4 * t)),
      ],
      masse: [mass([p.b * 0.3, t], [p.b * 0.3, p.H + t], -20, String(p.H))],
    }) },
  { id: "wsf", name: "Winkelstehfalz", gruppe: "Falze", params: [["H", "Falzhöhe", "mm", 25], ["b", "Bahn je Seite (Ausschnitt)", "mm", 90], ["u", "Umschlag", "mm", 10], ["holz", "Schalung", "mm", 27]],
    bau: (p, t) => ({
      holz: [holz("Schalung", rechteck(-p.b, -p.holz, p.b, 0))],
      teile: [
        teil("Bahn links", "dach", -p.b, t / 2, 0, Z(p.b, 90, p.H, -90, p.u)),
        teil("Bahn rechts", "dach", p.b, t / 2, 180, Z(p.b - t, -90, p.H + t, 90, p.u + t)),
      ],
      masse: [mass([p.b * 0.3, t], [p.b * 0.3, p.H + t], -20, String(p.H))],
    }) },

  // SwissSkills Zug 2026 – Details A bis K (Masse aus den Plänen, Unterkonstruktion angenommen)
  { id: "ss26A", name: "A Sockelabschluss", gruppe: "SwissSkills 2026", params: [["tiefe", "Tiefe unten", "mm", 33], ["luft", "Abstand Sockel", "mm", 20], ["auf", "Aufkantung", "mm", 8], ["hoehe", "Fassade (Ausschnitt)", "mm", 250], ["holz", "Wandstärke", "mm", 30]],
    bau: (p, t) => ({
      holz: [holz("Wand / Sockel", [[-p.holz, p.hoehe], [0, p.hoehe], [0, p.luft], [-p.holz, p.luft], [-p.holz, -200], [-2 * p.holz, -200], [-2 * p.holz, p.hoehe - 25], [-p.holz, p.hoehe - 25]])],
      teile: [
        teil("Fassadenblech", "fassade", p.tiefe, p.hoehe, -90, Z(p.hoehe, -90, p.tiefe - t, -90, p.auf)),
        teil("Haftstreifen", "zubehoer", t / 2, p.luft, 90, Z(p.hoehe - p.luft - 30)),
      ],
      masse: [mass([t, 0], [p.tiefe, 0], -12, String(p.tiefe)), mass([0, 0], [0, p.luft], 14, String(p.luft))],
    }) },
  { id: "ss26B", name: "B Horizontaler Paneelstoss mit Hafte", gruppe: "SwissSkills 2026", params: [["tiefe", "Tiefe Stoss", "mm", 30], ["fuge", "Fuge", "mm", 10], ["oben", "Einhang oben", "mm", 50], ["unten", "Abkantung unten", "mm", 30], ["holz", "Wandstärke", "mm", 30]],
    bau: (p, t) => ({
      holz: [holz("Wand", rechteck(-p.holz, -220, 0, 220))],
      teile: [
        teil("Hafte", "zubehoer", t / 2, -40, 90, Z(p.oben + 70, "U-", 40)),
        teil("Paneel oben", "fassade", p.tiefe, 220, -90, Z(220 - p.fuge, -90, p.tiefe - 2 * t, -90, p.oben)),
        teil("Paneel unten", "fassade", p.tiefe, -220, 90, Z(220, 90, p.tiefe - t, 90, p.unten)),
      ],
      masse: [mass([0, -12], [p.tiefe, -12], -10, String(p.tiefe)), mass([p.tiefe + 8, 0], [p.tiefe + 8, p.fuge], 12, String(p.fuge))],
    }) },
  { id: "ss26C", name: "C Fassadenecke mit Abschlussprofil", gruppe: "SwissSkills 2026", params: [["hoehe", "Abschlussprofil", "mm", 75], ["unten", "Überstand unten", "mm", 30], ["abstand", "Abstand Paneel", "mm", 10], ["auf", "Aufkantung Paneel", "mm", 25], ["holz", "Plattenstärke", "mm", 30], ["u", "Umschlag", "mm", 10]],
    bau: (p, t) => ({
      holz: [holz("Wandplatte", rechteck(t, 0, 520, p.holz))],
      teile: [
        teil("Abschlussprofil", "fassade", 3.5 * t, -p.unten + p.u, -90, Z(p.u, "U-", p.hoehe, "U-", p.u)),
        teil("Haftwinkel", "zubehoer", 2 * t, -p.unten + 6, 90, Z(p.unten - 6 - t / 2, -90, 100)),
        teil("Fassadenpaneel", "fassade", 520, -p.unten, 180, Z(520 - p.abstand, -90, p.auf)),
      ],
      masse: [mass([-6, -p.unten], [-6, p.hoehe - p.unten], 14, String(p.hoehe)), mass([-18, -p.unten], [-18, 0], 14, String(p.unten)), mass([0, -p.unten - 10], [p.abstand, -p.unten - 10], 12, String(p.abstand))],
    }) },
  { id: "ss26D", name: "D Fuge mit Abkantungen (5 mm)", gruppe: "SwissSkills 2026", params: [["fuge", "Fuge", "mm", 5], ["H", "Abkantung", "mm", 25], ["b", "Paneel je Seite (Ausschnitt)", "mm", 120], ["streifen", "Unterlagsstreifen", "mm", 100], ["holz", "Plattenstärke", "mm", 30]],
    bau: (p, t) => ({
      holz: [holz("Platte", rechteck(-p.b, -p.H - 8 - p.holz, p.b, -p.H - 8))],
      teile: [
        teil("Paneel links", "fassade", -p.b, 0, 0, Z(p.b - p.fuge / 2, -90, p.H)),
        teil("Paneel rechts", "wappen", p.b, 0, 180, Z(p.b - p.fuge / 2, 90, p.H)),
        teil("Unterlagsstreifen", "zubehoer", -p.streifen / 2, -p.H - 8 + t / 2, 0, Z(p.streifen)),
      ],
      masse: [mass([-p.fuge / 2, 10], [p.fuge / 2, 10], 10, String(p.fuge)), mass([p.fuge / 2 + 15, 0], [p.fuge / 2 + 15, -p.H], 12, String(p.H))],
    }) },
  { id: "ss26F", name: "F Wappen-Einfassung mit LED", gruppe: "SwissSkills 2026", params: [["abstand", "Abstand Fassade–Wappen", "mm", 15], ["auf", "Aufkantung Fassade", "mm", 25], ["ueber", "Höhe Fassade über Wand", "mm", 10], ["abk", "Abkantung Wappen", "mm", 10], ["wappen", "Wappenplatte", "mm", 30], ["holz", "Wandplatte", "mm", 20]],
    bau: (p, t) => {
      const wb = 300, top = p.ueber + p.auf + 10; // Oberkante Wappenplatte
      return {
        holz: [holz("Wandplatte", rechteck(-wb, -p.holz, 320, 0)), holz("Rippe", rechteck(100, -p.holz - 90, 130, -p.holz)),
          holz("Wappenplatte", rechteck(-wb, top - p.wappen, 0, top)), holz("LED-Streifen", rechteck(0, 0, 8, 3), "led")],
        teile: [
          teil("Wappenblech", "wappen", -wb, top + t / 2, 0, Z(wb + 6, -90, p.abk)),
          teil("Fassadenpaneel", "fassade", 320, p.ueber, 180, Z(320 - p.abstand, -90, p.auf)),
        ],
        masse: [mass([0, -8], [p.abstand, -8], -10, String(p.abstand)), mass([p.abstand + 12, p.ueber], [p.abstand + 12, p.ueber + p.auf], -12, String(p.auf)), mass([p.abstand + 30, 0], [p.abstand + 30, p.ueber], -12, String(p.ueber))],
      };
    } },
  { id: "ss26G", name: "G Traufe mit Einhängestreifen", gruppe: "SwissSkills 2026", params: [["n", "Dachneigung", "°", 40], ["einhang", "Einhängestreifen auf Dach", "mm", 60], ["umschlag", "Umschlag Dachblech", "mm", 40], ["stirn", "Stirn", "mm", 50], ["luft", "Abstand Fassade", "mm", 15], ["holz", "Schalung", "mm", 25]],
    bau: (p, t) => {
      const c = Math.cos(rad(p.n)), s = Math.sin(rad(p.n)), L = 260;
      return {
        holz: [holz("Schalung", [[0, 0], [L * c, L * s], [L * c + p.holz * s, L * s - p.holz * c], [p.holz * s, -p.holz * c]]),
          holz("Traufholz", [[p.holz * s, -p.holz * c], [p.holz * s + 90, -p.holz * c], [p.holz * s + 90, -p.holz * c - 50], [p.holz * s, -p.holz * c - 50]]),
          holz("Wand", rechteck(p.holz * s + 90, -260, p.holz * s + 150, 60))],
        teile: [
          teil("Einhängestreifen", "zubehoer", p.einhang * c, p.einhang * s + t / 2, 180 + p.n, Z(p.einhang, 90 - p.n, p.stirn, -45, 10)),
          teil("Dachblech", "dach", L * c, L * s + 1.5 * t, 180 + p.n, Z(L, { u: 1, ri: 2 * t }, p.umschlag)),
          teil("Fassadenblech", "fassade", p.luft - t, -260, 90, Z(200, -90, p.holz * s + 90 - p.luft, 90, 20)),
        ],
        masse: [mass([0, 0], [p.einhang * c, p.einhang * s], 25, String(p.einhang)), mass([0, -60], [p.luft - t, -60], -10, String(p.luft))],
      };
    } },
  { id: "ss26H", name: "H Ortabschluss mit Abschlussprofil", gruppe: "SwissSkills 2026", params: [["hoehe", "Abschlussprofil", "mm", 75], ["auf", "Über Dachfläche", "mm", 25], ["u", "Umschlag", "mm", 10], ["b", "Dachfläche (Ausschnitt)", "mm", 150], ["holz", "Schalung", "mm", 40]],
    bau: (p, t) => ({
      holz: [holz("Schalung", rechteck(t, -p.holz, p.b, 0))],
      teile: [
        teil("Abschlussprofil", "dach", 3 * t, -(p.hoehe - p.auf) + p.u, -90, Z(p.u, "U-", p.hoehe, "U-", p.u)),
        teil("Dachblech", "dach", p.b, t / 2, 180, Z(p.b - 2 * t, -90, p.auf - 4)),
      ],
      masse: [mass([-8, -(p.hoehe - p.auf)], [-8, p.auf], 14, String(p.hoehe)), mass([p.b * 0.4, 0], [p.b * 0.4, p.auf], 12, String(p.auf))],
    }) },
  { id: "ss26I", name: "I Doppelstehfalz Dach", gruppe: "SwissSkills 2026", params: [["H", "Falzhöhe", "mm", 25], ["neig", "Falz geneigt", "°", 12], ["u", "Umschlag Unterfalz", "mm", 7], ["b", "Bahn je Seite (Ausschnitt)", "mm", 100], ["holz", "Schalung", "mm", 40]],
    bau: (p, t) => ({
      holz: [holz("Schalung", rechteck(-p.b, -p.holz, p.b, 0))],
      teile: [
        teil("Bahn links (Unterfalz)", "dach", -p.b, t / 2, 0, Z(p.b, 90 - p.neig, p.H, "U+", p.u)),
        teil("Bahn rechts (Oberfalz)", "dach", p.b, t / 2, 180, Z(p.b - t, -(90 + p.neig), p.H + t, { u: 1, ri: 2.5 * t }, p.u + 4 * t)),
      ],
      masse: [mass([0, t], [p.H * Math.sin(rad(p.neig)) * -1, p.H * Math.cos(rad(p.neig))], 18, String(p.H))],
    }) },
  { id: "ss26J", name: "J First mit Doppelstehfalz", gruppe: "SwissSkills 2026", params: [["n", "Dachneigung", "°", 33], ["H", "Falzhöhe", "mm", 25], ["u", "Umschlag Unterfalz", "mm", 7], ["b", "Dachfläche je Seite", "mm", 200], ["holz", "Schalung", "mm", 40]],
    bau: (p, t) => {
      const c = Math.cos(rad(p.n)), s = Math.sin(rad(p.n)), d = p.holz / c;
      return {
        holz: [holz("Firstschalung", [[0, 0], [p.b * c, -p.b * s], [p.b * c, -p.b * s - d], [0, -d * 1.6], [-p.b * c, -p.b * s - d], [-p.b * c, -p.b * s]])],
        teile: [
          teil("Bahn links (Unterfalz)", "dach", -p.b * c, -p.b * s + t / 2, p.n, Z(p.b, 90 - p.n, p.H, "U+", p.u)),
          teil("Bahn rechts (Oberfalz)", "dach", p.b * c, -p.b * s + t / 2, 180 - p.n, Z(p.b - t, -(90 - p.n), p.H + t, { u: 1, ri: 2.5 * t }, p.u + 4 * t)),
        ],
        masse: [mass([-12, t], [-12, p.H + t], 14, String(p.H))],
      };
    } },
  { id: "ss26K", name: "K Ortgang mit Bordprofil", gruppe: "SwissSkills 2026", params: [["n", "Dachneigung", "°", 40], ["ueber", "Bordprofil über Dach", "mm", 45], ["hoehe", "Höhe Bordprofil (zu Orthöhe)", "mm", 180], ["auf", "Aufkantung Dachblech", "mm", 25], ["u", "Umschlag", "mm", 10], ["holz", "Schalung", "mm", 25]],
    bau: (p, t) => {
      const c = Math.cos(rad(p.n)), s = Math.sin(rad(p.n)), L = 300, d = p.holz / c;
      return {
        holz: [holz("Schalung", [[0, 0], [-L * c, -L * s], [-L * c, -L * s - d], [0, -d]]), holz("Ortbrett", rechteck(-30, -d - 60, 0, -d))],
        teile: [
          teil("Bordprofil", "dach", t / 2 - 3 * t, p.ueber - p.hoehe + p.u, -90, Z(p.u, "U+", p.hoehe, "U+", p.u)),
          teil("Dachblech", "dach", -L * c, -L * s + t / 2, p.n, Z(L - 2 * t, 90 - p.n, p.auf)),
        ],
        masse: [mass([20, 0], [20, p.ueber], -14, String(p.ueber)), mass([40, p.ueber - p.hoehe], [40, p.ueber], -14, "Höhe passend zu Orthöhe")],
      };
    } },
];
export const DETAIL = Object.fromEntries(DETAILS.map((d) => [d.id, d]));
export const detailStandard = (id) => Object.fromEntries(DETAIL[id].params.map(([k, , , v]) => [k, v]));
export const rollenVon = (aufbau) => [...new Set(aufbau.teile.map((x) => x.rolle))];

// Detail berechnen: aufbau { holz, teile, masse }, materialVon(rolle | teil) → Material { t, ri, k }
// Ergebnis je Teil: res (wie berechne), versatz [x,y], m; dazu Grenzen über alles
export function baueDetail(aufbau, materialVon) {
  const teile = aufbau.teile.map((tl) => {
    const m = materialVon(tl);
    if (tl.zeilen.some((z) => !(z.L > 0))) throw new Error(`${tl.name}: jeder Schenkel braucht eine Länge grösser als 0`);
    const { start, ops } = freiesProfil(tl.start, tl.zeilen, m);
    let res;
    try { res = berechne(start, ops, m.t, m.ri, m.k); } catch (e) { throw new Error(`${tl.name}: ${e.message}`); }
    return { ...tl, m, res, versatz: [tl.x, tl.y] };
  });
  const pts = [...aufbau.holz.flatMap((h) => h.pts), ...teile.flatMap((tl) => polylinie(tl.res.pfad).map(([x, y]) => [x + tl.x, y + tl.y]))];
  for (const m of aufbau.masse || []) { // Masslinien samt Text gehören zur Zeichnung
    const dx = m.b[0] - m.a[0], dy = m.b[1] - m.a[1], L = Math.hypot(dx, dy) || 1, k = m.ab * 1.25 + Math.sign(m.ab || 1) * 8;
    pts.push(...[m.a, m.b].map((p) => [p[0] - (dy / L) * k, p[1] + (dx / L) * k]));
  }
  return { holz: aufbau.holz, teile, masse: aufbau.masse || [], grenzen: grenzen(pts) };
}
// Blechkontur eines Teils (geschlossen, mit Dicke) im Detail-Koordinatensystem
export const teilKontur = (tl) => kontur(tl.res.pfad, tl.m.t, 3).map(([x, y]) => [x + tl.x, y + tl.y]);
