// Tests: STEP- und STL-Export, STL lesen
import { stepDatei, stlDatei, stlLesen } from "../kern/step.js";

let fehler = 0;
const ok = (b, t) => { if (!b) { fehler++; console.error("✗", t); } else console.log("✓", t); };

// Würfel 10 mm als 12 Dreiecke
const P = [[0, 0, 0], [10, 0, 0], [10, 10, 0], [0, 10, 0], [0, 0, 10], [10, 0, 10], [10, 10, 10], [0, 10, 10]];
const F = [[0, 2, 1], [0, 3, 2], [4, 5, 6], [4, 6, 7], [0, 1, 5], [0, 5, 4], [1, 2, 6], [1, 6, 5], [2, 3, 7], [2, 7, 6], [3, 0, 4], [3, 4, 7]];
const dreiecke = F.flatMap((f) => f.flatMap((i) => P[i]));

const step = stepDatei([{ name: "Würfel", dreiecke }], { name: "Test Würfel", zeit: new Date(0) });
ok(step.startsWith("ISO-10303-21;") && step.trim().endsWith("END-ISO-10303-21;"), "STEP: Kopf und Ende");
ok((step.match(/VERTEX_POINT/g) || []).length === 8, "STEP: 8 Ecken (zusammengefasst)");
ok((step.match(/EDGE_CURVE/g) || []).length === 12, "STEP: 12 Kanten (Diagonalen der Dreiecke fallen weg)");
ok((step.match(/ADVANCED_FACE/g) || []).length === 6, "STEP: 6 ebene Flächen statt 12 Dreiecke");
ok(/MANIFOLD_SOLID_BREP\('Wuerfel'/.test(step), "STEP: dichter Körper als Volumen, Umlaute ersetzt");
ok(/SI_UNIT\(\.MILLI\.,\.METRE\.\)/.test(step), "STEP: Einheit mm");
const refs = new Set([...step.matchAll(/#(\d+)/g)].map((m) => +m[1])), def = new Set([...step.matchAll(/^#(\d+)=/gm)].map((m) => +m[1]));
ok([...refs].every((r) => def.has(r)), "STEP: alle Verweise definiert");

const stl = stlDatei([{ dreiecke }], "W");
ok((stl.match(/facet normal/g) || []).length === 12, "STL: 12 Facetten");
const zurueck = stlLesen(new TextEncoder().encode(stl).buffer);
ok(zurueck.length === 108 && Math.abs(zurueck[3] - 10) < 1e-6, "STL ASCII lesen");
// binär
const buf = new ArrayBuffer(84 + 12 * 50), dv = new DataView(buf); dv.setUint32(80, 12, true);
for (let i = 0; i < 12; i++) for (let j = 0; j < 9; j++) dv.setFloat32(84 + i * 50 + 12 + j * 4, dreiecke[i * 9 + j], true);
const bin = stlLesen(buf);
ok(bin.length === 108 && bin[107] === dreiecke[107], "STL binär lesen");

if (fehler) { console.error(fehler + " Fehler"); process.exit(1); } else console.log("STEP/STL: alle Tests bestanden");
