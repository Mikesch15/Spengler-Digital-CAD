import { regionen, inRegion } from "../kern/regionen.js";
let f = 0; const ok = (b, t) => { if (!b) { f++; console.error("✗", t); } else console.log("✓", t); };
const rect = (x0, y0, x1, y1) => [[[x0, y0], [x1, y0]], [[x1, y0], [x1, y1]], [[x1, y1], [x0, y1]], [[x0, y1], [x0, y0]]];
const kreis = (cx, cy, r, n = 72) => Array.from({ length: n }, (_, i) => [[cx + r * Math.cos((2 * Math.PI * i) / n), cy + r * Math.sin((2 * Math.PI * i) / n)], [cx + r * Math.cos((2 * Math.PI * (i + 1)) / n), cy + r * Math.sin((2 * Math.PI * (i + 1)) / n)]]);
const nah = (a, b, t = 1e-6) => Math.abs(a - b) < t;
let r = regionen(rect(0, 0, 100, 50)); ok(r.length === 1 && nah(r[0].flaeche, 5000) && inRegion(r[0], r[0].innen), "Rechteck: eine Fläche 5000, Innenpunkt liegt innen");
r = regionen([...rect(0, 0, 100, 50), [[40, -10], [40, 60]]]); ok(r.length === 2 && nah(r.reduce((s, x) => s + x.flaeche, 0), 5000) && r.some((x) => nah(x.flaeche, 2000)) && r.some((x) => nah(x.flaeche, 3000)), "Rechteck mit durchgehender Linie: zwei Teilflächen 2000 + 3000 (Linie ragt über den Rand)");
r = regionen([...rect(0, 0, 100, 50), [[40, 0], [40, 30]]]); ok(r.length === 1 && nah(r[0].flaeche, 5000), "Linie, die im Innern endet (loses Ende): keine Teilung");
r = regionen([...rect(0, 0, 60, 60), ...rect(30, 30, 100, 100)]); ok(r.length === 3 && r.some((x) => nah(x.flaeche, 900)) && r.some((x) => nah(x.flaeche, 3600 - 900)) && r.some((x) => nah(x.flaeche, 4900 - 900)), "Zwei überlappende Rechtecke: Überlappung 900 und zwei Restflächen");
r = regionen([...rect(0, 0, 200, 200), ...kreis(100, 100, 30)]); const ring = r.find((x) => x.loecher.length), scheibe = r.find((x) => !x.loecher.length && x.flaeche < 3000);
ok(r.length === 2 && ring && scheibe && nah(ring.flaeche + scheibe.flaeche, 40000, 1e-3) && inRegion(ring, ring.innen) && !inRegion(ring, [100, 100]) && inRegion(scheibe, [100, 100]), `Kreis im Rechteck: Fläche mit Loch (${ring?.flaeche.toFixed(1)}) und Kreisscheibe (${scheibe?.flaeche.toFixed(1)})`);
r = regionen([...rect(0, 0, 200, 200), ...kreis(100, 100, 60), ...kreis(100, 100, 30)]); ok(r.length === 3 && r.filter((x) => x.loecher.length).length === 2, "Kreis im Kreis im Rechteck: drei Flächen, zwei davon mit Loch");
r = regionen([...rect(0, 0, 50, 50), ...rect(100, 0, 150, 50)]); ok(r.length === 2 && r.every((x) => nah(x.flaeche, 2500)), "Zwei getrennte Rechtecke: zwei Flächen");
r = regionen([...kreis(0, 0, 50), ...kreis(40, 0, 50)]); ok(r.length === 3, `Zwei sich schneidende Kreise: Linse + zwei Monde (${r.length} Flächen)`);
r = regionen([...rect(0, 0, 100, 100), [[0, 50], [100, 50]], [[50, 0], [50, 100]]]); ok(r.length === 4 && r.every((x) => nah(x.flaeche, 2500)), "Rechteck mit Kreuz (Berührungen an den Seiten): vier gleiche Teilflächen");
r = regionen([[[0, 0], [10, 0]], [[10, 0], [10, 10]]]); ok(r.length === 0, "Offener Linienzug: keine Fläche");
r = regionen([...rect(0, 0, 100, 50), [[0, 0], [100, 50]]]); ok(r.length === 2 && r.every((x) => nah(x.flaeche, 2500)), "Diagonale durch das Rechteck: zwei Dreiecke");
if (f) { console.error(f + " Fehler"); process.exit(1); } else console.log("Regionen: alle Tests bestanden");

// Freies Linienende knapp neben einer Kreissehne (Vieleck) wird angeschlossen
{
  const kreis = (c, r, n = 72) => Array.from({ length: n + 1 }, (_, i) => [c[0] + r * Math.cos((2 * Math.PI * i) / n), c[1] + r * Math.sin((2 * Math.PI * i) / n)]);
  const pl = (l) => l.slice(1).map((q, i) => [l[i], q]);
  const quad = [[0, 0], [540, 60], [520, 300], [5, 200]], segs = [...quad.map((q, i) => [q, quad[(i + 1) % 4]]), ...pl(kreis([270, 200], 165))];
  // Diagonale von der linken Kante bis genau auf den Kreis (echter Kreispunkt, bis ~0.16 mm ausserhalb der Sehne)
  const ende = [270 + 165 * Math.cos((252.5 * Math.PI) / 180), 200 + 165 * Math.sin((252.5 * Math.PI) / 180)];
  segs.push([[2.5, 100], ende]);
  const ohne = regionen(segs, 1e-4).length, mit = regionen(segs, 1e-4, 0.5).length;
  console.log(mit > ohne ? "✓" : "✗", `Linie endet auf dem Kreis: ohne Anschluss ${ohne} Flächen, mit Anschluss ${mit}`);
  if (!(mit > ohne)) process.exitCode = 1;
}
