// Tests: Flansch/Umschlag/Baustein an den Stirnkanten (Anfang/Ende der Länge) eines Blechprofils
import { berechne } from "../kern/geometrie.js";
import { schenkelBereiche, stirnLaschen, abwicklungUmriss, laschenBiegelinien } from "../kern/stirnflansch.js";
import { folge } from "../kern/details.js";
let f = 0; const ok = (b, t) => { if (!b) { f++; console.error("✗", t); } else console.log("✓", t); };
const nah = (a, b, t = 1e-6) => Math.abs(a - b) < t;
const m = { t: 0.7, ri: 1, k: 0.4 };
const res = berechne(0, [{ typ: "schenkel", L: 100 }, { typ: "biegung", winkel: 90, ri: 1, modus: "sharp" }, { typ: "schenkel", L: 60 }], m.t, m.ri, m.k);
const b = schenkelBereiche(res);
ok(b.length === 2 && nah(b[0].s0, 0) && b[1].s0 > b[0].s1 && nah(b[1].s1, res.zuschnitt), `Zwei gerade Schenkel in der Abwicklung: ${b.map((x) => `${x.s0.toFixed(1)}–${x.s1.toFixed(1)}`).join(", ")}`);
const z = folge("1 90 25"); // Platzhalter-Schenkel, Flansch 90°, 25 mm
const alle = stirnLaschen(res, [{ ende: "S1", schenkel: 0, zeilen: z }], m);
ok(alle.fehler.length === 0 && alle.laschen.length === 2 && alle.laschen.every((l) => l.ende === "S1"), "Flansch am Anfang: eine Lasche je Schenkel");
const L = alle.laschen[0];
ok(L.laenge > 25 && L.laenge < 27, `Laschenlänge in der Abwicklung ≈ 25 mm + Biegezone (${L.laenge.toFixed(2)})`);
ok(L.biegungen.length === 1 && L.ring.length > 8, "Eine Biegung, Querschnittsring der Lasche vorhanden");
const nur = stirnLaschen(res, [{ ende: "S2", schenkel: 2, zeilen: z }], m);
ok(nur.laschen.length === 1 && nur.laschen[0].schenkel === 2 && nur.laschen[0].ende === "S2", "Nur Schenkel 2 am Ende");
ok(stirnLaschen(res, [{ ende: "S1", schenkel: 9, zeilen: z }], m).fehler.length === 1, "Unbekannter Schenkel → Fehlermeldung");
const um = abwicklungUmriss(res.zuschnitt, 300, [...alle.laschen, ...nur.laschen]);
const ys = um.map((p) => p[1]);
ok(Math.min(...ys) < -25 && Math.max(...ys) > 300 + 25, "Abwicklungsumriss hat Laschen unten (Anfang) und oben (Ende)");
const lin = laschenBiegelinien(300, [...alle.laschen, ...nur.laschen]);
ok(lin.length === (1 + 1) * 3, "Biegelinien: je Lasche Kante + eine Biegung");
// Umschlag (180°) und mehrteiliger Baustein
const um2 = stirnLaschen(res, [{ ende: "S1", schenkel: 1, zeilen: folge("1 U+ 8") }], m);
ok(um2.fehler.length === 0 && um2.laschen.length === 1, "Umschlag an der Stirnkante");
const bs = stirnLaschen(res, [{ ende: "S2", schenkel: 1, zeilen: folge("1 90 20 -90 10") }], m);
ok(bs.laschen.length === 1 && bs.laschen[0].biegungen.length === 2, "Baustein mit zwei Biegungen an der Stirnkante");
if (f) { console.error(`${f} Fehler`); process.exit(1); } else console.log("Stirnflansch: alle Tests bestanden");
