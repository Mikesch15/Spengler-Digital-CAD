// Tests: Rundblech-Abwicklung (Zylinder, Kegel, Segmente, Naht-Zugabe), DXF mit Bögen
import { rundblechAbwicklung, rundblechSvg, kegelAbwicklung } from "../kern/abwicklungRund.js";
import { rundblechDxf } from "../kern/dxf.js";
import { dxfLesen } from "../kern/dxflesen.js";
let fehler = 0;
const ok = (b, t) => { if (!b) { fehler++; console.error("✗", t); } else console.log("✓", t); };
const PI = Math.PI, t = 0.7, k = 0.4;
// Zylinder Ø 200 (Mitte), h 300, ganz, Zugabe 10: Breite = π·(d − t + 2kt)
const z = rundblechAbwicklung({ art: "zylinder", d1: 200, d2: 200, h: 300, t, k, zugabe: 10 });
ok(Math.abs(z.masse.breite - PI * (200 - t + 2 * k * t)) < 1e-9 && z.masse.zuschnitt[0] === z.masse.breite + 10, `Zylinder Ø200: Zuschnitt ${z.masse.zuschnitt[0].toFixed(2)} × 300 (inkl. 10 Zugabe)`);
// Kegelstumpf Ø 400 → Ø 200, h 150: Kreisringsektor; Bogenlängen = Umfänge der K-Faser
const kg = rundblechAbwicklung({ art: "kegel", d1: 400, d2: 200, h: 150, t, k });
const s = Math.hypot(100, 150), d = (k - 0.5) * t * (150 / s);
ok(Math.abs(kg.masse.R * kg.masse.phi * PI / 180 - 2 * PI * (200 + d)) < 1e-9 && Math.abs(kg.masse.r * kg.masse.phi * PI / 180 - 2 * PI * (100 + d)) < 1e-9, `Kegel Ø400/Ø200: Bogenlängen = Umfänge auf der K-Faser (φ ${kg.masse.phi.toFixed(3)}°)`);
ok(Math.abs(kg.masse.R - kg.masse.r - s) < 1e-9, "Kegel: R − r = Mantellinie");
// Spitzkegel (d2 = 0) und Segment 120°
const sp = rundblechAbwicklung({ art: "kegel", d1: 300, d2: 0, h: 200, t, k, winkel: 120 });
ok(sp.elemente.filter((e) => e.typ === "bogen").length === 1 && Math.abs(sp.masse.phi - 120 * 150 / Math.hypot(150, 200)) < 1e-9, "Spitzkegel-Segment 120°: ein Bogen, φ = 120°·sin α");
// Kontur geschlossen: Endpunkte der Elemente (ohne Naht) bilden eine Kette
const ends = (e) => e.typ === "linie" ? [e.a, e.b] : [[e.c[0] + e.r * Math.cos(e.w0 * PI / 180), e.c[1] + e.r * Math.sin(e.w0 * PI / 180)], [e.c[0] + e.r * Math.cos(e.w1 * PI / 180), e.c[1] + e.r * Math.sin(e.w1 * PI / 180)]];
for (const [n, a] of [["Zylinder", z], ["Kegel", kg], ["Kegel mit Zugabe", rundblechAbwicklung({ art: "kegel", d1: 400, d2: 200, h: 150, t, k, zugabe: 15 })]]) {
  const p = a.elemente.filter((e) => e.lage === "ZUSCHNITT").flatMap(ends), zaehl = new Map();
  p.forEach((q) => { const key = q.map((v) => v.toFixed(6)).join(); zaehl.set(key, (zaehl.get(key) || 0) + 1); });
  ok([...zaehl.values()].every((c) => c === 2), `${n}: Zuschnittkontur geschlossen (jeder Eckpunkt genau zweimal)`);
}
// DXF: Bögen als ARC, Layer, lesbar
const dx = rundblechDxf(rundblechAbwicklung({ art: "kegel", d1: 400, d2: 200, h: 150, t, k, zugabe: 15 }), "Kegel Test");
ok((dx.match(/\nARC\n/g) || []).length === 2 && /\nNAHT\n/.test(dx) && /\nZUSCHNITT\n/.test(dx), "DXF: 2 echte Bögen (ARC), Layer ZUSCHNITT und NAHT");
const gelesen = dxfLesen(dx);
ok(gelesen.elemente.filter((e) => e.art === "bogen").length === 2, "DXF wieder lesbar (2 Bögen)");
ok(/<svg/.test(rundblechSvg(kg)) && /A\d/.test(rundblechSvg(kg)), "SVG-Vorschau mit echten Bögen");
if (fehler) { console.error(fehler + " Fehler"); process.exit(1); } else console.log("Rundblech: alle Tests bestanden");
