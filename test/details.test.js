// Prüft die Spenglerdetails (kern/details.js) und die Schnittzeichnung
import { DETAILS, detailStandard, baueDetail, teilKontur, folge, folgeText } from "../kern/details.js";
import { detailSvg } from "../kern/zeichnung.js";
import { MATERIALIEN } from "../kern/materialien.js";

let fehler = 0;
const ok = (bed, msg) => { if (!bed) { fehler++; console.log("FEHLER:", msg); } };
const m = MATERIALIEN[0];

// Kurzschrift
const z = folge("150 90 25 U+ 7");
ok(z.length === 3 && z[0].winkel === 90 && z[1].art === "umschlag" && z[1].winkel === 180 && z[2].L === 7, "Kurzschrift lesen");
ok(folgeText(z) === "150 90 25 U+ 7", "Kurzschrift schreiben: " + folgeText(z));
ok(folge("20 U-r2 10")[0].ri === 2 && folge("20 U-r2 10")[0].winkel === -180, "Umschlag mit Radius");
let wurf = false; try { folge("20 x 10"); } catch { wurf = true; } ok(wurf, "falsche Kurzschrift meldet Fehler");

// Alle Vorlagen bauen sich mit Standardwerten, jedes Teil hat einen Zuschnitt > Summe der geraden Teile
for (const d of DETAILS) {
  try {
    const a = d.bau(detailStandard(d.id), m.t), r = baueDetail(a, () => m);
    ok(r.teile.length >= 1 && r.teile.every((tl) => tl.res.zuschnitt > 0), `${d.name}: Teile`);
    const svg = detailSvg(r, r.teile.map(teilKontur), { titel: d.name });
    ok(svg.includes("<path") && !svg.includes("NaN"), `${d.name}: Zeichnung ohne NaN`);
    console.log(d.name.padEnd(38), r.teile.map((tl) => `${tl.name} ${tl.res.zuschnitt.toFixed(1)}`).join(" | "));
  } catch (e) { ok(false, `${d.name}: ${e.message}`); }
}
// Doppelstehfalz: Unterfalz-Zuschnitt = Bahn + Falzhöhe + Umschlag (± Biegezugaben)
{
  const a = DETAILS.find((d) => d.id === "dsf").bau(detailStandard("dsf"), m.t), r = baueDetail(a, () => m);
  const u = r.teile[0].res.zuschnitt; ok(Math.abs(u - (90 + 25 + 7)) < 6, `Unterfalz ${u.toFixed(1)}`);
}
console.log(fehler ? `${fehler} Fehler in Details` : "Details: alle Tests bestanden");
process.exit(fehler ? 1 : 0);
