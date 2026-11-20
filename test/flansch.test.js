// Tests: einfacher Flansch / Umschlag wie in Fusion (Bezug Mittellinie/Aussen/Innen), Platte bis Biegebeginn, runde Kanten exakt
import { werkzeugAuf, flanschStandard, werkzeugName } from "../kern/flansch.js";
import { flaechenblech, bausteinProfil } from "../kern/flaechenblech.js";
import { flaechenblechPlan, baueFlaechenblech } from "../kern/cad/featureBau.js";
import { occtKern } from "../kern/cad/occt.js";
let f = 0; const ok = (b, t) => { if (!b) { f++; console.error("✗", t); } else console.log("✓", t); };
const nah = (a, b, t = 1e-6) => Math.abs(a - b) < t;
const m = { id: "z", name: "Zink", t: 0.7, ri: 1, k: 0.4 };
const w = (extra) => werkzeugAuf({ werkzeug: { ...flanschStandard("flansch"), ...extra } }, m);
// 90°: Mittellinie unverändert, Aussenmass: Platte um t/2 kürzer (Versatz −t/2) und Schenkel t/2 kürzer
let a = w({}); ok(a.folge === "90 25" && a.versatz === 0, "Flansch 90°, Mass bis Mittellinie: «90 25», Versatz 0");
a = w({ bezug: "aussen" }); ok(a.folge === "90 24.65" && nah(a.versatz, -0.35), `Aussenkante: Schenkel 24.65, Versatz ${a.versatz} (= −t/2)`);
a = w({ bezug: "innen" }); ok(a.folge === "90 25.35" && nah(a.versatz, 0.35), "Innenkante: Schenkel 25.35, Versatz +0.35");
a = w({ winkel: 45, bezug: "aussen" }); const k = 0.35 * Math.tan(Math.PI / 8); ok(nah(parseFloat(a.folge.split(" ")[1]), 25 - k, 1e-3) && nah(a.versatz, -k, 1e-3), `45°: Korrektur (t/2)·tan(22.5°) = ${k.toFixed(4)}`);
a = w({ winkel: 135, seite: -1, radius: 2 }); ok(a.folge === "-135r2 25", "135° nach hinten mit Radius 2: «-135r2 25»");
a = werkzeugAuf({ werkzeug: { ...flanschStandard("umschlag"), laenge: 7 } }, m); ok(a.folge === "U+ 7" && werkzeugAuf({ werkzeug: { ...flanschStandard("umschlag"), seite: -1, radius: 1.4, laenge: 40 } }, m).folge === "U-r1.4 40", "Umschlag: «U+ 7», nach hinten mit Radius «U-r1.4 40»");
ok(werkzeugName({ ...flanschStandard(), bezug: "aussen" }) === "Flansch 90° 25 mm (aussen)", "Name des Werkzeugs");
ok(werkzeugAuf({ folge: "90 25", versatz: 0 }, m).folge === "90 25", "Baustein ohne Werkzeug bleibt unverändert");
// Rechnung: Aussenkante → Zugabe stimmt mit manuellem Versatz überein
const rect = [[0, 0], [1000, 0], [1000, 500], [0, 500]];
const mitW = bausteinProfil({ werkzeug: { ...flanschStandard(), bezug: "aussen" } }, m), manuell = bausteinProfil({ folge: "90 24.65", versatz: -0.35 }, m);
ok(nah(mitW.zugabe, manuell.zugabe) && nah(mitW.versatz, -0.35), `Zugabe mit Werkzeug = manuell (${mitW.zugabe.toFixed(4)} mm)`);
// Runde Kante: Flansch und Umschlag am Kreis rechnen sich, exakter Körper ist gültig, Platte endet am Biegebeginn
const kreis = Array.from({ length: 96 }, (_, i) => [150 * Math.cos((2 * Math.PI * i) / 96), 150 * Math.sin((2 * Math.PI * i) / 96)]);
const K = await occtKern(), x = async (kmd) => K.ausfuehren(kmd), E = { o: [0, 0, 0], u: [1, 0, 0], v: [0, 1, 0], n: [0, 0, 1] };
for (const [nm, b] of [["Flansch 90° (rund)", { werkzeug: flanschStandard("flansch") }], ["Flansch 60° aussen (rund)", { werkzeug: { ...flanschStandard("flansch"), winkel: 60, bezug: "aussen" } }], ["Umschlag (rund)", { werkzeug: flanschStandard("umschlag") }]]) {
  const bl = flaechenblech(kreis, [b], m), id = await baueFlaechenblech(x, flaechenblechPlan(bl, E, m, 1)), e = await K.ausfuehren({ op: "eigenschaften", ziel: id });
  ok(bl.gruppen.length === 1 && !bl.gruppen[0].gerade && e.gueltig && e.volumen > 0 && bl.abw.laenge > 300 && bl.abw.laenge < 420, `${nm}: Abwicklung Ø ${bl.abw.laenge.toFixed(1)} mm, exakter Körper gültig (V ${(e.volumen / 1000).toFixed(1)} cm³)`);
}
// Konvexer Kreis: Platte endet am Biegebeginn (Volumen der Platte + Flansch < Platte bis zur gezeichneten Kante + Flansch)
const sehrKurz = flaechenblech(kreis, [{ werkzeug: flanschStandard("flansch") }], m); ok(sehrKurz.profile[0].zugabe > 20 && sehrKurz.profile[0].zugabe < 30, `Zugabe Flansch 90/25 = ${sehrKurz.profile[0].zugabe.toFixed(2)} mm`);
if (f) { console.error(f + " Fehler"); process.exit(1); } else console.log("Flansch/Umschlag: alle Tests bestanden");
