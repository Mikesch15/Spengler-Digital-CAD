// Tests 2D-Zeichnen: Layer, Farben, Linienarten, DXF-Ausgabe
import { skizzenDxf, standardLayer, farbeHex, LINIENARTEN } from "../kern/zeichnung2d.js";
let fehler = 0; const ok = (b, t) => { console.log(`${b ? "✓" : "✗"} ${t}`); if (!b) fehler++; };
const layers = [...standardLayer(), { id: "a", name: "Achsen", aci: 1, art: "mittellinie", sichtbar: true }, { id: "b", name: "Verdeckt Ä", aci: 5, art: "gestrichelt", sichtbar: true }, { id: "c", name: "Aus", aci: 3, art: "durchgezogen", sichtbar: false }];
const obj = [{ layer: "0", art: "linie", a: [0, 0], b: [100, 0] }, { layer: "a", art: "kreis", c: [50, 50], r: 20 }, { layer: "b", art: "bogen", c: [0, 0], r: 10, w0: 0, w1: 90 },
  { layer: "b", art: "poly", pts: [[0, 0], [10, 0], [10, 10]], geschlossen: true }, { layer: "c", art: "linie", a: [0, 0], b: [1, 1] }];
const d = skizzenDxf(layers, obj, "Test"), z = d.split("\n");
const nach = (...ks) => z.some((v, i) => ks.every((k, j) => z[i + j] === k));
ok(z[0] === "0" && z.at(-2) === "EOF" && z.includes("TABLES"), "Aufbau: TABLES, ENTITIES, EOF");
ok(nach("0", "LTYPE", "2", "CENTER") && nach("0", "LTYPE", "2", "DASHED") && nach("0", "LTYPE", "2", "CONTINUOUS"), "Nur benutzte Linienarten als LTYPE (CENTER, DASHED, CONTINUOUS)");
ok(z.includes("ACHSEN") && z.includes("VERDECKT AE"), "Layernamen DXF-tauglich (Grossbuchstaben, ohne Umlaute)");
ok(nach("2", "ACHSEN", "70", "0", "62", "1", "6", "CENTER"), "Layer ACHSEN: Farbe 1 (Rot), Linienart CENTER");
ok(nach("2", "VERDECKT AE", "70", "0", "62", "5", "6", "DASHED"), "Layer VERDECKT: Farbe 5 (Blau), Linienart DASHED");
ok(d.includes("CIRCLE") && d.includes("ARC") && d.includes("POLYLINE") && d.includes("SEQEND") && z.filter((v) => v === "LINE").length === 1, "Linie, Kreis, Bogen, Polylinie; Linie des ausgeblendeten Layers fehlt");
ok(!z.includes("\"") && z.filter((v) => v === "LAYER").length === 4, "Tabelle enthält 3 sichtbare Layer (+ Tabellenkopf)");
ok(farbeHex(1) === 0xe02424 && farbeHex(99) === farbeHex(7) && LINIENARTEN.mittellinie[2].length === 4, "Farb- und Linienart-Tabellen");
console.log(fehler ? `${fehler} Fehler` : "2D-Zeichnen: alle Tests bestanden"); process.exit(fehler ? 1 : 0);
