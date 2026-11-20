// Gemeinsame Testbeschreibung: beide Kerne bekommen exakt dieselben Aufgaben (mm, Grad)
import { berechne } from "../../kern/geometrie.js";
import { MATERIALIEN } from "../../kern/materialien.js";

const PI = Math.PI;
export const ZINK = MATERIALIEN.find((m) => m.id === "zink07"); // t 0.7, ri 1.0, k 0.4

// ---------------------------------------------------------------- Blechquerschnitt aus der eigenen Spenglerlogik
// Mittellinie aus kern/geometrie.js berechne() → geschlossener Querschnitt mit Dicke t (Linien und exakte Bögen)
export function blechQuerschnitt(ops, t, ri, k, startWinkel = 0) {
  const r = berechne(startWinkel, ops, t, ri, k);
  const seiten = (s) => r.pfad.map((g) => {
    const tang = (p) => g.typ === "linie"
      ? [g.p2[0] - g.p1[0], g.p2[1] - g.p1[1]]
      : (([dx, dy]) => (g.winkel > 0 ? [-dy, dx] : [dy, -dx]))([p[0] - g.zentrum[0], p[1] - g.zentrum[1]]);
    const off = (p) => { const [tx, ty] = tang(p), l = Math.hypot(tx, ty); return [p[0] - (s * ty / l) * t / 2, p[1] + (s * tx / l) * t / 2]; };
    return { typ: g.typ, a: off(g.p1), m: g.typ === "bogen" ? off(g.pm) : null, b: off(g.p2) };
  });
  const L = seiten(1), R = seiten(-1).reverse();
  const segmente = [];
  for (const g of L) segmente.push(g.m ? { bis: g.b, bogenMitte: g.m } : { bis: g.b });
  segmente.push({ bis: R[0].b });
  for (const g of R) segmente.push(g.m ? { bis: g.a, bogenMitte: g.m } : { bis: g.a });
  // Mittellänge und Biegewinkel für den Abgleich (Teil D)
  let mitte = 0, theta = 0;
  for (const g of r.pfad) {
    if (g.typ === "linie") mitte += Math.hypot(g.p2[0] - g.p1[0], g.p2[1] - g.p1[1]);
    else { mitte += g.rm * Math.abs(g.winkel) * PI / 180; theta += Math.abs(g.winkel) * PI / 180; }
  }
  return { profil: { start: L[0].a, segmente }, rechnung: r, mitte, theta };
}
const verschoben = (profil, du, dv) => ({ start: [profil.start[0] + du, profil.start[1] + dv], segmente: profil.segmente.map((s) => ({ bis: [s.bis[0] + du, s.bis[1] + dv], ...(s.bogenMitte ? { bogenMitte: [s.bogenMitte[0] + du, s.bogenMitte[1] + dv] } : {}) })) });
const minU = (p) => Math.min(p.start[0], ...p.segmente.map((s) => s.bis[0]));

// Rechteck-Querschnitt (für Rotationskörper: u = Radius, v = Höhe)
const viereck = (pts) => ({ start: pts[0], segmente: pts.slice(1).map((p) => ({ bis: p })) });

// ---------------------------------------------------------------- Referenzteile Teil D
const scharf = (winkel, ri = null) => ({ typ: "biegung", winkel, ri, modus: "sharp" });
const sch = (L) => ({ typ: "schenkel", L });
export const REFERENZ = {
  abgekantet: { name: "Einfach abgekantet (Winkel 40/60, 90°)", ops: [sch(40), scharf(90), sch(60)] },
  umschlag: { name: "Blech mit Umschlag (50 + U 10)", ops: [sch(50), { typ: "biegung", winkel: 180, ri: null, modus: "hem" }, sch(10)] },
  mehrfach: { name: "Mehrfach gekantet (Ortgang 30/50/80/50/15)", ops: [sch(30), scharf(90), sch(50), scharf(90), sch(80), scharf(-90), sch(50), scharf(-135), sch(15)] },
};
export const BREITE = 200; // Länge der Blechteile (Extrusion), mm

// ---------------------------------------------------------------- Testfälle
// Jeder Fall: { test, teil, lauf(K) → { koerper?, erwartet?, ... } }. Volumen in mm³.
export const FAELLE = [
  // TEST 1 Grundkörper
  { test: "1 Grundkörper", teil: "Quader 100×50×20", lauf: (K) => ({ koerper: K.quader([0, 0, 0], [100, 50, 20]), erwartet: 100 * 50 * 20, bbox: [[0, 0, 0], [100, 50, 20]] }) },
  { test: "1 Grundkörper", teil: "Zylinder r20 h50", lauf: (K) => ({ koerper: K.zylinder(20, 50), erwartet: PI * 400 * 50 }) },
  { test: "1 Grundkörper", teil: "Kegelstumpf r30/r10 h40 (Kegelfläche)", lauf: (K) => ({ koerper: K.kegel(30, 10, 40), erwartet: (PI * 40 / 3) * (900 + 300 + 100) }) },
  // TEST 2 Boolesche Operationen
  { test: "2 Boolesch", teil: "Quader − Zylinder (Loch r10 durch)", lauf: (K) => ({ koerper: K.abziehen(K.quader([0, 0, 0], [100, 50, 20]), K.verschieben(K.zylinder(10, 40), [50, 25, -10])), erwartet: 100000 - PI * 100 * 20 }) },
  { test: "2 Boolesch", teil: "Vereinigung zweier Quader (Überlappung 10)", lauf: (K) => ({ koerper: K.vereinigen(K.quader([0, 0, 0], [100, 50, 20]), K.quader([90, 0, 0], [190, 50, 20])), erwartet: 190 * 50 * 20 }) },
  { test: "2 Boolesch", teil: "Schnitt Quader ∩ Zylinder", lauf: (K) => ({ koerper: K.schneiden(K.quader([0, 0, 0], [100, 50, 20]), K.zylinder(30, 50)), erwartet: (PI * 900 / 4) * 20 }) },
  // TEST 3 Verrundungen und Fasen
  { test: "3 Verrundung/Fase", teil: "Kante verrunden r2", lauf: (K) => ({ koerper: K.verrunden(K.quader([0, 0, 0], [100, 50, 20]), 2, [100, 50, 10]), erwartet: 100000 - (4 - PI) * 20 }) },
  { test: "3 Verrundung/Fase", teil: "Kante fasen 3 mm", lauf: (K) => ({ koerper: K.fasen(K.quader([0, 0, 0], [100, 50, 20]), 3, [100, 50, 10]), erwartet: 100000 - 4.5 * 20 }) },
  // TEST 4 Komplexere Flächen
  { test: "4 Flächen", teil: "Sweep Kreis r5 entlang Gerade+Bogen", lauf: (K) => {
    const R = 50, pfad = { start: [0, 0], segmente: [{ bis: [0, 100] }, { bis: [R, 100 + R], bogenMitte: [R - R * Math.cos(PI / 4), 100 + R * Math.sin(PI / 4)] }] };
    return { koerper: K.sweep(5, pfad), erwartet: PI * 25 * (100 + R * PI / 2) };
  } },
  { test: "4 Flächen", teil: "Loft Quadrat 40 → Quadrat 20 (h 50)", lauf: (K) => {
    const q = (a, z) => ({ profil: viereck([[-a / 2, -a / 2], [a / 2, -a / 2], [a / 2, a / 2], [-a / 2, a / 2]]), z });
    return { koerper: K.loft([q(40, 0), q(20, 50)]), erwartet: (50 / 3) * (1600 + 400 + 800) };
  } },
  { test: "4 Flächen", teil: "NURBS-Fläche aus 3×4 Punkten", lauf: (K) => ({ koerper: K.nurbsFlaeche([0, 1, 2].map((i) => [0, 1, 2, 3].map((j) => [j * 30, i * 30, 5 * Math.sin(i + j)]))), flaeche: true }) },
  { test: "4 Flächen", teil: "Schnittkurve Zylinder r20 × Quader-Deckfläche", lauf: (K) => {
    const s = K.schnittkurve(K.zylinder(20, 50), K.quader([-50, -50, 25], [50, 50, 60]));
    return { wert: s, erwartetLaenge: 2 * PI * 20 };
  } },
  // TEST 5 Spengler-Testgeometrien (Querschnitt aus kern/geometrie.js)
  ...["abgekantet", "umschlag", "mehrfach"].map((id) => ({ test: "5 Spengler", teil: REFERENZ[id].name, referenz: id, lauf: (K) => {
    const q = blechQuerschnitt(REFERENZ[id].ops, ZINK.t, ZINK.ri, ZINK.k);
    return { koerper: K.extrusion(q.profil, BREITE), erwartet: ZINK.t * q.mitte * BREITE, querschnitt: q };
  } })),
  { test: "5 Spengler", teil: "Zylindrisches Blechsegment Rm 200, 90°, h 300", referenz: "zylinder", lauf: (K) => {
    const t = ZINK.t, Rm = 200;
    return { koerper: K.rotation(viereck([[Rm - t / 2, 0], [Rm + t / 2, 0], [Rm + t / 2, 300], [Rm - t / 2, 300]]), 90), erwartet: t * Rm * (PI / 2) * 300 };
  } },
  { test: "5 Spengler", teil: "Konisches Blechsegment r 200→100, h 150, 90°", referenz: "kegel", lauf: (K) => {
    const t = ZINK.t, r1 = 200, r2 = 100, h = 150, s = Math.hypot(r1 - r2, h), nx = h / s, ny = (r1 - r2) / s; // Normale zur Mantellinie
    const p = (r, z, d) => [r + nx * d, z + ny * d];
    return { koerper: K.rotation(viereck([p(r1, 0, -t / 2), p(r1, 0, t / 2), p(r2, h, t / 2), p(r2, h, -t / 2)]), 90), erwartet: t * s * ((r1 + r2) / 2) * (PI / 2) };
  } },
  { test: "5 Spengler", teil: "Gehrung: 2 Winkelprofile 90°-Ecke, verschnitten + vereinigt", lauf: (K) => {
    const L = 300, q = blechQuerschnitt(REFERENZ.mehrfach.ops, ZINK.t, ZINK.ri, ZINK.k), pr = verschoben(q.profil, -minU(q.profil), 0);
    const roh = K.drehen(K.extrusion(pr, L), -90, [0, 0, 0], [1, 0, 0]);    // x = u, y ∈ [0, L], z = −v
    const A = K.verschieben(roh, [0, -L, 0]);                                  // läuft in +y bis zur Ecke
    const B = K.drehen(roh, -90, [0, 0, 0], [0, 0, 1]);                       // startet an der Ecke, läuft in +x
    const H = K.drehen(K.quader([-3 * L, 0, -3 * L], [3 * L, 6 * L, 3 * L]), -45, [0, 0, 0], [0, 0, 1]); // Halbraum x + y ≥ 0
    const Am = K.abziehen(A, H), Bm = K.schneiden(B, H);
    const vA = K.volumen(Am), vB = K.volumen(Bm), U = K.vereinigen(Am, Bm), ueberlapp = K.volumen(K.schneiden(Am, Bm));
    return { koerper: U, erwartet: vA + vB, zusatz: { vA, vB, ueberlappung_mm3: ueberlapp, gehrungOk: ueberlapp < 1e-3 } };
  } },
];
