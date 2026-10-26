// Prüft den JavaScript-Kern gegen die Werte des Python-Add-ins
import { readFileSync } from "node:fs";
import { berechne, kontur, polylinie } from "../kern/geometrie.js";
import { VORLAGEN, standardwerte, freiesProfil, alsZeilen } from "../kern/profile.js";
import { MATERIALIEN, quelle, kFaktorAusProbe } from "../kern/materialien.js";
import { abwicklungDxf } from "../kern/dxf.js";
import { profilSvg, abwicklungSvg } from "../kern/zeichnung.js";
import { stueckliste, stuecklisteCsv } from "../kern/auftrag.js";

const ref = JSON.parse(readFileSync(new URL("./referenz_python.json", import.meta.url)));
const m = MATERIALIEN[0];
let fehler = 0;
const ok = (bed, msg) => { if (!bed) { fehler++; console.log("FEHLER:", msg); } };

for (const v of VORLAGEN) {
  const { start, ops } = v.bau(standardwerte(v.id), m);
  const r = berechne(start, ops, m.t, m.ri, m.k);
  const py = ref[v.id]; // Referenz aus dem Python-Add-in (nur für die ursprünglichen Vorlagen)
  if (py) {
    ok(Math.abs(r.zuschnitt - py.flat) < 1e-6, `${v.id} Zuschnitt ${r.zuschnitt} vs ${py.flat}`);
    r.biegungen.forEach((b, i) => ok(Math.abs(b.pos - py.bends[i]) < 1e-6, `${v.id} B${i + 1}`));
  }
  // Kontur geschlossen und mit Fläche ≈ Zuschnitt × t
  const k = kontur(r.pfad, m.t, 1);
  let fl = 0;
  for (let i = 0; i < k.length; i++) { const [a, b] = k[i], [c, d] = k[(i + 1) % k.length]; fl += a * d - b * c; }
  fl = Math.abs(fl / 2);
  const soll = (r.zuschnitt) * m.t;
  ok(Math.abs(fl - soll) / soll < 0.03, `${v.id} Konturfläche ${fl.toFixed(1)} vs ${soll.toFixed(1)}`);
  // Endpunkt des Pfads = Ende der Polylinie
  const pl = polylinie(r.pfad);
  ok(pl.length > 2, `${v.id} Polylinie`);
  const dxf = abwicklungDxf(r, 1000, v.name);
  ok(dxf.trimEnd().endsWith("EOF") && dxf.split("\n").length % 2 === 1, `${v.id} DXF`);
  const svg = profilSvg(r, { dicke: m.t });
  ok(svg.startsWith("<svg") && svg.trimEnd().endsWith("</svg>") && !svg.includes("NaN"), `${v.id} SVG gültig`);
  ok((svg.match(/class="biegung"/g) || []).length === r.biegungen.length && svg.includes('class="kante-a"'), `${v.id} SVG Biegungen und Kante A`);
  const ab = abwicklungSvg(r);
  ok(!ab.includes("NaN") && (ab.match(/class="biegung"/g) || []).length === r.biegungen.length, `${v.id} Abwicklung SVG`);
  console.log(v.name.padEnd(22), r.zuschnitt.toFixed(1).padStart(6), "mm  Fläche", fl.toFixed(1), "/", soll.toFixed(1), " Quelle", JSON.stringify(quelle(r.zuschnitt)));
}

// Freies Profil = gleiche Rechnung wie Vorlage
const t = VORLAGEN[0].bau(standardwerte("traufe"), m);
const z = alsZeilen(t.start, t.ops);
const f = freiesProfil(z.start, z.zeilen, m);
ok(Math.abs(berechne(f.start, f.ops, m.t, m.ri, m.k).zuschnitt - ref.traufe.flat) < 1e-6, "freies Profil Traufe");

// Fensterbank (ohne Python-Referenz): 3 Biegungen, Zuschnitt etwas kleiner als die Summe der Schenkel
{
  const fb = VORLAGEN.find((v) => v.id === "fensterbank").bau(standardwerte("fensterbank"), m);
  const r = berechne(fb.start, fb.ops, m.t, m.ri, m.k);
  ok(r.biegungen.length === 3 && r.summeSchenkel === 280 && r.zuschnitt < 280 && r.zuschnitt > 270, `Fensterbank ${r.zuschnitt}`);
  ok(r.biegungen.map((b) => b.richtung).join() === "oben,unten,oben", "Fensterbank Richtungen");
}

// Stückliste: 2 × 333.3 × 2000 mm Titanzink 0.70 = 1.3332 m², 6.72 kg
const sl = stueckliste([
  { name: "Rinne", material: MATERIALIEN[0], zuschnitt: 333.3, laenge: 2000, stueck: 2 },
  { name: "Ort", material: MATERIALIEN[1], zuschnitt: 250, laenge: 1000, stueck: 3 },
  { name: "Traufe", material: MATERIALIEN[0], zuschnitt: 200, laenge: 3000, stueck: 1 },
]);
ok(Math.abs(sl.zeilen[0].flaeche - 1.3332) < 1e-9, "Stückliste Fläche");
ok(Math.abs(sl.zeilen[0].gewicht - 1.3332 * 0.7 * 7.2) < 1e-9, "Stückliste Gewicht");
ok(sl.jeMaterial.length === 2 && sl.jeMaterial[0].stueck === 3 && Math.abs(sl.jeMaterial[0].laufmeter - 7) < 1e-9, "Stückliste je Material");
ok(sl.summe.stueck === 6, "Stückliste Summe");
const csv = stuecklisteCsv(sl, [["Objekt", "Muster; Bern"]]);
ok(csv.startsWith("\ufeffObjekt;\"Muster; Bern\"") && csv.includes("Rinne;Titanzink 0.70;333.3;2000;2;4;1.333;6.719"), "Stückliste CSV");

// K-Faktor aus Probebiegung: Rechnung mit bekanntem k und wieder zurück
for (const k of [0.33, 0.4, 0.45]) {
  const probe = berechne(0, [{ typ: "schenkel", L: 49.65 }, { typ: "biegung", winkel: 90, ri: null, modus: "sharp" }, { typ: "schenkel", L: 79.65 }], 0.7, 1, k);
  const kk = kFaktorAusProbe({ zuschnitt: probe.zuschnitt, a: 50, b: 80, t: 0.7, ri: 1 });
  ok(Math.abs(kk - k) < 1e-9, `K-Faktor aus Probe ${k} → ${kk}`);
}
// Eigene Lagerformate
ok(quelle(210, { spaltbaender: [300, 220], coil: 0, tafeln: [] }).breite === 220, "eigene Spaltbänder");
ok(quelle(900, { spaltbaender: [300], coil: 0, tafeln: [[1250, 2500], [1000, 2000]] }).breite === 1000, "eigene Tafeln");
ok(quelle(2000, { spaltbaender: [], coil: 1000, tafeln: [] }) === null, "zu breit");

// Fehlerfall: zu kurzer Schenkel
let geworfen = false;
try { berechne(0, [{ typ: "schenkel", L: 0.5 }, { typ: "biegung", winkel: 90, ri: null, modus: "sharp" }, { typ: "schenkel", L: 50 }], 0.7, 1, 0.4); } catch { geworfen = true; }
ok(geworfen, "zu kurzer Schenkel erkannt");

console.log(fehler ? `${fehler} Fehler` : "Alle Tests bestanden");
process.exit(fehler ? 1 : 0);
