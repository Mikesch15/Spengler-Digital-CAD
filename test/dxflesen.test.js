// Tests: DXF lesen → Skizzenelemente
import { dxfLesen } from "../kern/dxflesen.js";

let fehler = 0;
const ok = (b, t) => { if (!b) { fehler++; console.error("✗", t); } else console.log("✓", t); };
const nah = (a, b, e = 1e-6) => Math.abs(a - b) < e;
const dxf = (kopf, ents, bloecke = "") => [
  "0", "SECTION", "2", "HEADER", ...kopf, "0", "ENDSEC",
  ...(bloecke ? ["0", "SECTION", "2", "BLOCKS", ...bloecke, "0", "ENDSEC"] : []),
  "0", "SECTION", "2", "ENTITIES", ...ents, "0", "ENDSEC", "0", "EOF"].join("\n");

// Rechteck als geschlossene LWPOLYLINE, Kreis, Bogen 0–90°
let r = dxfLesen(dxf(["9", "$INSUNITS", "70", "4"], [
  "0", "LWPOLYLINE", "8", "0", "90", "4", "70", "1", "10", "0", "20", "0", "10", "100", "20", "0", "10", "100", "20", "50", "10", "0", "20", "50",
  "0", "CIRCLE", "8", "0", "10", "50", "20", "25", "40", "10",
  "0", "ARC", "8", "0", "10", "0", "20", "0", "40", "20", "50", "0", "51", "90",
  "0", "TEXT", "8", "0", "1", "Hallo"]));
ok(r.elemente.length === 3, "3 Elemente (Text übersprungen)");
ok(r.elemente[0].art === "linie" && r.elemente[0].geschlossen && r.elemente[0].pts.length === 4, "LWPOLYLINE geschlossen → Linienzug mit 4 Ecken");
ok(r.elemente[1].art === "kreis" && nah(r.elemente[1].r, 10), "Kreis r 10");
const bo = r.elemente[2]; ok(bo.art === "bogen" && nah(bo.a[0], 20) && nah(bo.b[1], 20) && nah(bo.m[0], 20 * Math.SQRT1_2), "Bogen 0–90°");
ok(r.uebersprungen.TEXT === 1, "Text gezählt");

// Einheit Meter, Bulge (Halbkreis) und Block
r = dxfLesen(dxf(["9", "$INSUNITS", "70", "6"], [
  "0", "LWPOLYLINE", "8", "0", "90", "2", "70", "0", "10", "0", "20", "0", "42", "1", "10", "0.2", "20", "0",
  "0", "INSERT", "8", "0", "2", "B1", "10", "1", "20", "0", "50", "90"],
  ["0", "BLOCK", "8", "0", "2", "B1", "10", "0", "20", "0", "0", "LINE", "8", "0", "10", "0", "20", "0", "11", "0.1", "21", "0", "0", "ENDBLK"]));
ok(r.faktor === 1000, "Einheit m → mm");
const hb = r.elemente[0]; ok(hb.art === "bogen" && nah(hb.b[0], 200) && nah(Math.hypot(hb.m[0] - 100, hb.m[1]), 100, 1e-6) && hb.m[1] < 0, "Bulge 1 = Halbkreis r 100 (gegen den Uhrzeiger, unten)");
const ln = r.elemente[1]; ok(ln.art === "linie" && nah(ln.pts[0][0], 1000) && nah(ln.pts[1][0], 1000) && nah(ln.pts[1][1], 100), "Block eingefügt und um 90° gedreht");

// POLYLINE mit VERTEX
r = dxfLesen(dxf([], ["0", "POLYLINE", "8", "0", "66", "1", "70", "0", "0", "VERTEX", "8", "0", "10", "0", "20", "0", "0", "VERTEX", "8", "0", "10", "5", "20", "5", "0", "SEQEND", "0", "LINE", "8", "0", "10", "0", "20", "0", "11", "1", "21", "0"]));
ok(r.elemente.length === 2 && r.elemente[0].pts.length === 2, "POLYLINE/VERTEX und folgendes Element");

if (fehler) { console.error(fehler + " Fehler"); process.exit(1); } else console.log("DXF lesen: alle Tests bestanden");
