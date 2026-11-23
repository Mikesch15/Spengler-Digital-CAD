// Test: Quetschfalte an der Ecke Stirnlasche + Wand eines Blechprofils (Kern): Kandidaten, Zuschnitt-Umriss, Biegelinien
import { berechne } from "../kern/geometrie.js";
import { folge } from "../kern/details.js";
import { stirnLaschen, abwicklungUmriss, laschenBiegelinien } from "../kern/stirnflansch.js";
import { stirnQuetsch, stirnQuetschKandidaten } from "../kern/stirnquetsch.js";
let fehler = 0; const ok = (c, t) => { if (!c) { fehler++; console.log("FEHLER:", t); } };
const m = { t: 0.7, ri: 1, k: 0.4 }, H = 500;
const flaeche = (P) => Math.abs(P.reduce((s, p, i) => s + (p[0] * P[(i + 1) % P.length][1] - P[(i + 1) % P.length][0] * p[1]), 0)) / 2;
const kreuzt = (a, b, c, d) => { const o = (p, q, r) => Math.sign((q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0])); return o(a, b, c) * o(a, b, d) < 0 && o(c, d, a) * o(c, d, b) < 0; };
const einfach = (P) => { for (let i = 0; i < P.length; i++) for (let j = i + 2; j < P.length; j++) { if (i === 0 && j === P.length - 1) continue; if (kreuzt(P[i], P[(i + 1) % P.length], P[j], P[(j + 1) % P.length])) return false; } return true; };
const res = berechne(0, [{ typ: "schenkel", L: 50 }, { typ: "biegung", winkel: 90, ri: 1, modus: "sharp" }, { typ: "schenkel", L: 100 }, { typ: "biegung", winkel: 90, ri: 1, modus: "sharp" }, { typ: "schenkel", L: 40 }], m.t, m.ri, m.k);
for (const ende of ["S1", "S2"]) {
  const { laschen } = stirnLaschen(res, [{ ende, schenkel: 2, zeilen: folge("1 90 25") }], m), kand = stirnQuetschKandidaten(res, laschen);
  ok(kand.length === 2 && kand.every((k) => k.ende === ende), `${ende}: zwei Kandidaten (links und rechts vom Boden)`);
  const ohne = abwicklungUmriss(res.zuschnitt, H, laschen), a0 = flaeche(ohne);
  for (const k of kand) {
    const l = laschen[0], r = stirnQuetsch(res, laschen, k, H); l.quetschListe = [r];
    const U = abwicklungUmriss(res.zuschnitt, H, laschen);
    ok(einfach(U), `${ende}/${k.seite}: Umriss mit Quetschfalte ohne Selbstüberschneidung`);
    ok(flaeche(U) > a0 - 1e-6 && U.length > ohne.length - 1, `${ende}/${k.seite}: Überschuss kommt zum Zuschnitt dazu (${(flaeche(U) - a0).toFixed(1)} mm²)`);
    ok(U.some((p) => Math.hypot(p[0] - r.flach.C[0], p[1] - r.flach.C[1]) < 1e-6), `${ende}/${k.seite}: Spitze der Falte im Umriss`);
    ok(r.pruefung.ok, `${ende}/${k.seite}: Faltprobe stimmt`);
    ok(laschenBiegelinien(H, laschen).some((b) => Math.hypot(b.a[0] - r.flach.O[0], b.a[1] - r.flach.O[1]) < 1e-6 || Math.hypot(b.b[0] - r.flach.O[0], b.b[1] - r.flach.O[1]) < 1e-6), `${ende}/${k.seite}: Biegelinien treffen sich in der Ecke O`);
    delete l.quetschListe;
  }
}
// Ungeeignet: Lasche mit zwei Biegungen
{ const { laschen } = stirnLaschen(res, [{ ende: "S1", schenkel: 2, zeilen: folge("1 90 25 90 10") }], m);
  ok(stirnQuetschKandidaten(res, laschen).length === 0, "Lasche mit zwei Biegungen: keine Quetschfalte"); }
console.log(fehler ? `${fehler} Fehler` : "Stirn-Quetschfalte (Kern): alle Tests bestanden"); process.exit(fehler ? 1 : 0);
