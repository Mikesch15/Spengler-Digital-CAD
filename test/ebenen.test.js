// Prüft die Konstruktionsebenen (kern/ebenen.js)
import { BASIS, ACHSEN, versetzt, unterWinkel, mittelebene, zweiKanten, dreiPunkte, tangential, entlangPfad, aufFlaeche, zuWelt, zuLokal, vek } from "../kern/ebenen.js";

let fehler = 0;
const ok = (bed, msg) => { if (!bed) { fehler++; console.log("FEHLER:", msg); } };
const nah = (a, b, tol = 1e-9) => a.every((x, i) => Math.abs(x - b[i]) < tol);
const abstand = (e, p) => vek.punkt(vek.minus(p, e.o), e.n);
const wirft = (f) => { try { f(); return false; } catch { return true; } };
// jede Ebene muss orthonormal und rechtshändig sein
const sauber = (e, name) => {
  ok([e.u, e.v, e.n].every((x) => Math.abs(vek.laenge(x) - 1) < 1e-9) && Math.abs(vek.punkt(e.u, e.v)) < 1e-9 && nah(vek.kreuz(e.u, e.v), e.n), `${name}: nicht orthonormal`);
  return e;
};

for (const [k, e] of Object.entries(BASIS)) sauber(e, "Basis " + k);

// 1. Versetzt
const v50 = sauber(versetzt(BASIS.XY, 50), "versetzt");
ok(nah(v50.o, [0, 0, 50]) && nah(v50.n, [0, 0, 1]), "versetzt XY 50");

// 2. Unter Winkel: um die X-Achse gedrehte XY-Ebene
const w90 = sauber(unterWinkel(BASIS.XY, ACHSEN.X, 90), "Winkel 90");
ok(Math.abs(Math.abs(w90.n[1]) - 1) < 1e-9 && Math.abs(abstand(w90, [100, 0, 0])) < 1e-9, "Winkel 90° um X: Normale ±Y, X-Achse liegt drin");
const w45 = sauber(unterWinkel(BASIS.XY, ACHSEN.X, 45), "Winkel 45");
ok(Math.abs(vek.punkt(w45.n, [0, 0, 1]) - Math.SQRT1_2) < 1e-9, "Winkel 45°");
ok(wirft(() => unterWinkel(BASIS.XY, ACHSEN.Z, 30)), "Achse senkrecht zur Bezugsebene wird abgelehnt");
const kante = { p: [0, 20, 0], d: [1, 0, 0] }; // Kante 20 mm über dem Ursprung in XY
ok(Math.abs(abstand(sauber(unterWinkel(BASIS.XY, kante, 30), "Winkel Kante"), [55, 20, 0])) < 1e-9, "Winkel um Kante: Kante liegt in der Ebene");

// 3. Mittelebene
ok(nah(mittelebene(BASIS.XY, versetzt(BASIS.XY, 100)).o, [0, 0, 50]), "Mittelebene parallel");
const m2 = sauber(mittelebene(BASIS.XY, BASIS.YZ), "Mittelebene schräg");
ok(Math.abs(abstand(m2, [0, 77, 0])) < 1e-9 && Math.abs(Math.abs(abstand(m2, [1, 0, 0])) - Math.SQRT1_2) < 1e-9, "Mittelebene XY/YZ: Y-Achse drin, 45°");
const m3 = mittelebene(versetzt(BASIS.XY, 5), versetzt(BASIS.YZ, 3));
ok(Math.abs(abstand(m3, [3, 12, 5])) < 1e-9, "Mittelebene versetzter Ebenen geht durch die Schnittlinie");

// 4. Zwei Kanten
const zk = sauber(zweiKanten({ p: [0, 0, 0], d: [1, 0, 0] }, { p: [0, 10, 0], d: [1, 0, 0] }), "zwei Kanten");
ok(Math.abs(Math.abs(zk.n[2]) - 1) < 1e-9, "zwei parallele Kanten in XY");
ok(Math.abs(Math.abs(zweiKanten({ p: [0, 0, 0], d: [1, 0, 0] }, { p: [0, 0, 0], d: [0, 0, 1] }).n[1]) - 1) < 1e-9, "zwei sich schneidende Kanten");
ok(wirft(() => zweiKanten({ p: [0, 0, 0], d: [1, 0, 0] }, { p: [0, 0, 5], d: [0, 1, 0] })), "windschiefe Kanten werden abgelehnt");
ok(wirft(() => zweiKanten({ p: [0, 0, 0], d: [1, 0, 0] }, { p: [5, 0, 0], d: [2, 0, 0] })), "Kanten auf einer Linie werden abgelehnt");

// 5. Drei Punkte
const dp = sauber(dreiPunkte([0, 0, 10], [1, 0, 10], [0, 1, 10]), "drei Punkte");
ok(nah(dp.n, [0, 0, 1]) && Math.abs(abstand(dp, [7, 8, 10])) < 1e-9, "drei Punkte z = 10");
ok(wirft(() => dreiPunkte([0, 0, 0], [1, 1, 1], [2, 2, 2])), "Punkte auf einer Linie werden abgelehnt");

// 6. Tangential an Zylinder (Achse Z, r = 20)
const t0 = sauber(tangential({ p: [0, 0, 0], d: [0, 0, 1], r: 20 }, 0, [1, 0, 0]), "tangential");
ok(nah(t0.o, [20, 0, 0]) && nah(t0.n, [1, 0, 0]), "tangential 0°");
ok(nah(tangential({ p: [0, 0, 0], d: [0, 0, 1], r: 20 }, 90, [1, 0, 0]).o, [0, 20, 0]), "tangential 90°");

// 7. Entlang Pfad
const pfad = [[0, 0, 0], [100, 0, 0], [100, 100, 0]];
const p75 = sauber(entlangPfad(pfad, 0.75), "entlang Pfad");
ok(nah(p75.o, [100, 50, 0]) && nah(p75.n, [0, 1, 0]), "entlang Pfad 75 %");
ok(nah(entlangPfad(pfad, 0.25).o, [50, 0, 0]) && nah(entlangPfad(pfad, 0).o, [0, 0, 0]) && nah(entlangPfad(pfad, 1).o, [100, 100, 0]), "entlang Pfad 25 %, Anfang, Ende");

// Auf Fläche und Umrechnung lokal ↔ Welt
const af = sauber(aufFlaeche([5, 5, 5], [0, 1, 1]), "auf Fläche");
const q = zuWelt(af, [12.5, -3]);
ok(Math.abs(abstand(af, q)) < 1e-9 && nah(zuLokal(af, q), [12.5, -3]), "lokal ↔ Welt");
ok(nah(zuWelt(BASIS.XZ, [10, 20]), [10, 0, -20]), "XZ wie bisher (v = −Z)");

console.log(fehler ? `${fehler} Fehler in Ebenen` : "Ebenen: alle Tests bestanden");
process.exit(fehler ? 1 : 0);
