// Prüft Ausdrücke und Parameter (kern/ausdruck.js)
import { rechne, parameterWerte, istZahl, namenIn } from "../kern/ausdruck.js";
let fehler = 0;
const ok = (bed, msg) => { if (!bed) { fehler++; console.log("FEHLER:", msg); } };
const nah = (a, b) => Math.abs(a - b) < 1e-9;
ok(rechne("1 + 2 * 3") === 7 && rechne("(1 + 2) * 3") === 9 && rechne("2^3^2") === 512, "Rangfolge");
ok(rechne("-3 + 5") === 2 && rechne("2 * -3") === -6, "Vorzeichen");
ok(rechne("1500 / 3") === 500 && rechne("12,5 + 0,5") === 13, "Komma als Dezimalzeichen");
ok(rechne("2 m + 5 cm") === 2050 && rechne("30°") === 30, "Einheiten");
ok(nah(rechne("sin(30)"), 0.5) && nah(rechne("sqrt(9) + max(1, 4)"), 7) && nah(rechne("atan(1)"), 45), "Funktionen in Grad");
ok(rechne("breite / 3", { breite: 1500 }) === 500, "Parameter");
for (const [a, m] of [["1 +", "unvollständig"], ["(1 + 2", "Klammer"], ["x * 2", "Unbekannt"], ["1 / 0", "Division"], ["2 # 3", "Zeichen"]]) {
  let t = ""; try { rechne(a); } catch (e) { t = e.message; } ok(t.includes(m), `Fehler «${a}» → ${t}`);
}
const p = parameterWerte([{ name: "drittel", ausdruck: "breite / 3" }, { name: "breite", ausdruck: "1500" }, { name: "falz", ausdruck: "25" }, { name: "zuschnitt", ausdruck: "drittel + 2 * falz" }]);
ok(p.werte.drittel === 500 && p.werte.zuschnitt === 550 && !Object.keys(p.fehler).length, "Parameter in beliebiger Reihenfolge");
const z = parameterWerte([{ name: "a", ausdruck: "b + 1" }, { name: "b", ausdruck: "a * 2" }, { name: "3x", ausdruck: "1" }]);
ok(z.fehler.a?.includes("Zirkel") && z.fehler["3x"], "Zirkelbezug und ungültiger Name erkannt");
ok(istZahl("12,5") && !istZahl("a/3") && namenIn("breite/3 + sin(n)").join() === "breite,n", "Hilfen");
console.log(fehler ? `${fehler} Fehler in Ausdrücken` : "Ausdrücke: alle Tests bestanden");
process.exit(fehler ? 1 : 0);
