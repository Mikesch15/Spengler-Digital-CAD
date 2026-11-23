// Test: Verbindungsnähte (kern/naht.js): Absetzung um genau eine Blechstärke, Folgen für Überlappung und Falz, Raupennetz
import { nahtFolgen, nahtStandard, kroepfung, raupenNetz } from "../kern/naht.js";
import { bausteinProfil } from "../kern/flaechenblech.js";
let f = 0; const ok = (b, t) => { if (!b) { f++; console.error("✗", t); } else console.log("✓", t); };
for (const [t, ri] of [[0.5, 1], [0.7, 1], [1, 1.5], [1.5, 2], [2, 2]]) {
  const m = { t, ri, k: 0.4 }, kr = kroepfung(t, ri, 1), p = bausteinProfil({ name: "k", folge: `${kr.folge} 10`, versatz: 0 }, m), pf = p.res.pfad, ende = pf.at(-1).p2, start = pf[0].p1;
  ok(Math.abs(Math.abs(ende[1] - start[1]) - t) < 2e-3, `Kröpfung t=${t}, r=${kr.r.toFixed(2)}: Versatz genau eine Blechstärke (${Math.abs(ende[1] - start[1]).toFixed(4)})`);
  for (const art of ["punkt", "falz"]) for (const absetz of ["a", "b"]) for (const richtung of ["oben", "unten"]) {
    const fo = nahtFolgen({ ...nahtStandard(art), absetz, richtung }, m); let gut = true;
    for (const s of ["a", "b"]) if (fo[s]) { try { bausteinProfil({ name: "x", folge: fo[s], versatz: 0 }, m); } catch (e) { gut = false; console.error(e.message, fo[s]); } }
    ok(gut && (fo.a || fo.b), `${art}/${absetz}/${richtung} (t=${t}): Abkantfolgen rechnen`);
  }
}
const m = { t: 0.7, ri: 1, k: 0.4 }, pu = nahtFolgen(nahtStandard("punkt"), m), zug = bausteinProfil({ name: "p", folge: pu.b, versatz: 0 }, m);
ok(pu.a === null && pu.b && zug.biegungen.length === 2, "Punktnaht: nur das abgesetzte Blech bekommt die Kröpfung (zwei Biegelinien)");
const gerade = nahtFolgen({ ...nahtStandard("punkt"), absetzen: false }, m), gz = bausteinProfil({ name: "g", folge: gerade.b, versatz: 0 }, m);
ok(Math.abs(gz.zugabe - 15) < 1e-6 && gz.biegungen.length === 0, "ohne Absetzung: gerade Zugabe 15 mm, keine Biegelinie");
const fz = nahtFolgen(nahtStandard("falz"), m), za = bausteinProfil({ name: "a", folge: fz.a, versatz: 0 }, m), zb = bausteinProfil({ name: "b", folge: fz.b, versatz: 0 }, m);
ok(/^U\+ 5$/.test(fz.a) && /U- 10$/.test(fz.b) && za.biegungen.length === 1 && zb.biegungen.length === 3, "Falz: 5 mm einfacher Umschlag, abgesetztes Blech 10 mm (Kröpfung + Umschlag)");
const mi = nahtFolgen({ ...nahtStandard("falz"), mittig: true }, m); ok(mi.a === "U+ 7.5" && mi.b === "U- 7.5", "Falz mittig: je 7.5 mm (Summe 15)");
ok(nahtFolgen(nahtStandard("schweiss"), m).a === null && nahtFolgen(nahtStandard("ecke"), m).b === null, "Raupennähte ändern die Bleche nicht");
const netz = raupenNetz([[0, 0, 0], [10, 0, 0], [20, 5, 0]], [0, 0, 1], "schweiss", 2, 1); ok(netz.length > 100 && netz.every((v) => Number.isFinite(v)), "Raupennetz entlang der Polylinie");
if (f) { console.error(`${f} Fehler`); process.exit(1); } else console.log("Naht (Kern): alle Tests bestanden");
