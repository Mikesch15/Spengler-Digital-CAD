import { kantenLage, anwenden, detailAusStep, pruefeDetail, meshAusVorlage } from "../kern/vorlagen/detail3d.js";
let f = 0; const ok = (b, t) => { if (!b) { f++; console.error("✗", t); } else console.log("✓", t); };
const nah = (a, b, t = 1e-9) => a.length === b.length && a.every((v, i) => Math.abs(v - b[i]) < t);
// Kante in X-Richtung: Vorlage unverändert, nur verschoben
let m = kantenLage([10, 20, 30], [100, 0, 0]);
ok(nah(anwenden(m, [0, 0, 0]), [10, 20, 30]) && nah(anwenden(m, [5, 0, 0]), [15, 20, 30]) && nah(anwenden(m, [0, 0, 7]), [10, 20, 37]), "Kante in +X: Ursprung am Kantenanfang, Z bleibt oben");
// Kante in Y-Richtung: Vorlagen-X → Welt-Y, oben bleibt Z
m = kantenLage([0, 0, 0], [0, 50, 0]); ok(nah(anwenden(m, [5, 0, 0]), [0, 5, 0]) && nah(anwenden(m, [0, 0, 1]), [0, 0, 1]), "Kante in +Y: X → Y, oben = Z");
// Schräge Kante: Längen bleiben, Z senkrecht zur Kante
m = kantenLage([0, 0, 0], [1, 1, 1]); const ez = anwenden(m, [0, 0, 1]), ex = anwenden(m, [1, 0, 0]);
ok(Math.abs(Math.hypot(...ez) - 1) < 1e-9 && Math.abs(ex[0] * ez[0] + ex[1] * ez[1] + ex[2] * ez[2]) < 1e-9 && Math.abs(Math.hypot(...ex) - 1) < 1e-9, "Schräge Kante: orthonormal");
// Versatz entlang der Kante, Drehung um die Kante
m = kantenLage([0, 0, 0], [0, 10, 0], { versatz: 3 }); ok(nah(anwenden(m, [0, 0, 0]), [0, 3, 0]), "Versatz 3 mm entlang der Kante");
m = kantenLage([0, 0, 0], [10, 0, 0], { drehung: 90 }); ok(nah(anwenden(m, [0, 0, 1]), [0, -1, 0], 1e-9) || nah(anwenden(m, [0, 0, 1]), [0, 1, 0], 1e-9), "Drehung 90° um die Kante: oben zeigt zur Seite");
m = kantenLage([0, 0, 0], [10, 0, 0], { drehung: 180 }); ok(nah(anwenden(m, [0, 0, 1]), [0, 0, -1], 1e-9), "Drehung 180°: oben zeigt nach unten");
// Senkrechte Kante (parallel zu «oben»): trotzdem gültig
m = kantenLage([0, 0, 0], [0, 0, 20]); ok(nah(anwenden(m, [3, 0, 0]), [0, 0, 3]) && Math.abs(Math.hypot(...anwenden(m, [0, 0, 1])) - 1) < 1e-9, "Senkrechte Kante: Z-Achse der Vorlage bleibt gültig");
let w = false; try { kantenLage([0, 0, 0], [0, 0, 0]); } catch { w = true; } ok(w, "Kante ohne Länge → Fehler");
// Vorlage aus Dreiecken
const tri = Float32Array.from([0, 0, 0, 40, 0, 0, 0, 5, 0, 10, 0, 0, 20, 5, 5, 0, 0, 5]);
const v = detailAusStep("Kehle 40", "ISO-10303-21;", tri, "kehle.step");
ok(v.typ === "detailvorlage" && /^dv-/.test(v.id) && v.anchor.edgeLength === 40 && v.source.strategy === "step" && v.source.step === "ISO-10303-21;" && meshAusVorlage(v).length === 18 && meshAusVorlage(v)[3] === 40, "Vorlage aus STEP: Ankerlänge 40 mm, Dreiecke Hin und zurück");
v.compatibility = { ...v.compatibility, thickness: 0.7, thicknessTolerance: 0.01, edgeLengthMin: 100 };
ok(pruefeDetail(v, { kantenlaenge: 500, dicke: 0.7 }).length === 0 && pruefeDetail(v, { kantenlaenge: 30, dicke: 0.7 }).length === 2 && pruefeDetail(v, { kantenlaenge: 500, dicke: 0.8 })[0].includes("0.7 mm Blech") && pruefeDetail({ source: {} }).length === 1, "Eignung: Kantenlänge, Überstand, Blechdicke, leere Vorlage");
if (f) { console.error(f + " Fehler"); process.exit(1); } else console.log("3D-Details: alle Tests bestanden");
