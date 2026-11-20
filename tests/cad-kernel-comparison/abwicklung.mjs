// Teil D: Spengler-Abwicklung validieren – 3D-Körper aus dem CAD-Kern gegen die eigene Rechnung (kern/geometrie.js)
// Prinzip: Für einen Blechkörper mit konstanter Dicke t gilt exakt V = t · A_Mittelfläche. Daraus folgt die Mittellänge
// (Profile) bzw. die Mittelfläche (Zylinder, Kegel), unabhängig vom Kern. Der Zuschnitt auf der K-Faser ist dann
//   L_Zuschnitt = L_Mitte + (k − 0.5) · t · Σθ
// und muss mit berechne().zuschnitt übereinstimmen. Das prüft die Übereinstimmung 3D ↔ Abwicklung, nicht den K-Faktor
// selbst (der stammt aus Probebiegungen, kern/materialien.js).
// Aufruf: node abwicklung.mjs   → ergebnisse/abwicklung.json
import { writeFileSync, mkdirSync } from "node:fs";
import { berechne } from "../../kern/geometrie.js";
import { FAELLE, REFERENZ, ZINK, BREITE } from "./faelle.mjs";
import { occt } from "./adapter/occt.mjs";
import { opengeometry } from "./adapter/opengeometry.mjs";

const PI = Math.PI, { t, ri, k } = ZINK;
const r4 = (v) => (v == null ? null : +v.toFixed(4));
const fall = (ref) => FAELLE.find((f) => f.referenz === ref);

// Referenzteile mit Eingaben und Soll-Zuschnitt aus der eigenen Rechnung
const zyl = { Rm: 200, winkel: 90, h: 300 }, keg = { r1: 200, r2: 100, h: 150, winkel: 90 };
const zylOps = [{ typ: "schenkel", L: 0 }, { typ: "biegung", winkel: zyl.winkel, ri: zyl.Rm - t / 2, modus: "tangent" }, { typ: "schenkel", L: 0 }];
const s = Math.hypot(keg.r1 - keg.r2, keg.h), L1 = (keg.r1 * s) / (keg.r1 - keg.r2), L2 = L1 - s, phi = ((keg.winkel * PI) / 180) * ((keg.r1 - keg.r2) / s);
const REF = [
  ...["abgekantet", "umschlag", "mehrfach"].map((id) => {
    const r = berechne(0, REFERENZ[id].ops, t, ri, k);
    return { id, name: REFERENZ[id].name, biegungen: r.biegungen.map((b) => `${b.winkel}° ri ${b.ri}`), soll: { zuschnitt: r.zuschnitt, breite: BREITE }, quelle: "kern/geometrie.js berechne()" };
  }),
  { id: "zylinder", name: "Zylindrisches Segment Rm 200, 90°, h 300", biegungen: [`90° ri ${zyl.Rm - t / 2} (Rundung)`], soll: { zuschnitt: berechne(0, zylOps, t, ri, k).zuschnitt, breite: zyl.h }, quelle: "kern/geometrie.js berechne(), Modus «tangent»" },
  { id: "kegel", name: "Kegelsegment r 200→100, h 150, 90°", biegungen: ["Kegelmantel, Mittelfläche"], soll: { flaeche: (phi / 2) * (L1 * L1 - L2 * L2), R_aussen: L1, R_innen: L2, oeffnung_grad: (phi * 180) / PI }, quelle: "Formel im Test – im Produkt (kern/) gibt es keine Kegelabwicklung" },
];

const ergebnis = { material: { name: ZINK.name, t, ri, k, biegeparameter: "K-Faktor (Startwert, nicht kalibriert)" }, teile: [] };
for (const K of [occt, opengeometry]) await K.laden();
for (const ref of REF) {
  const z = { ...ref, kerne: {} };
  for (const K of [occt, opengeometry]) {
    try {
      const e = fall(ref.id).lauf(K), V = K.volumen(e.koerper), sch = K.volumenFehler ? K.volumenFehler(e.koerper) : 0;
      if (ref.id === "kegel") {
        const A = V / t, d = A - ref.soll.flaeche;
        z.kerne[K.info().name] = { mittelflaeche: r4(A), abweichung_mm2: r4(d), schranke_mm2: r4(sch / t), status: Math.abs(d) <= Math.max(1e-3, sch / t) ? "ok" : "abweichung" };
      } else {
        const breite = ref.soll.breite, Lm = V / (t * breite);
        const theta = e.querschnitt ? e.querschnitt.theta : (zyl.winkel * PI) / 180;
        const Lz = Lm + (k - 0.5) * t * theta, d = Lz - ref.soll.zuschnitt;
        z.kerne[K.info().name] = { mittellaenge: r4(Lm), zuschnitt: r4(Lz), abweichung_mm: r4(d), schranke_mm: r4(sch / (t * breite)), status: Math.abs(d) <= Math.max(1e-4, sch / (t * breite)) ? "ok" : "abweichung" };
      }
    } catch (err) { z.kerne[K.info().name] = { status: err.code === "NICHT_UNTERSTUETZT" ? "nicht_unterstuetzt" : "fehler", hinweis: err.message }; }
  }
  ergebnis.teile.push(z);
  console.log(`${ref.name}: Soll ${JSON.stringify(Object.fromEntries(Object.entries(ref.soll).map(([a, b]) => [a, r4(b)])))}`);
  for (const [n, w] of Object.entries(z.kerne)) console.log(`   ${n}: ${JSON.stringify(w)}`);
}
mkdirSync(new URL("./ergebnisse/", import.meta.url), { recursive: true });
writeFileSync(new URL("./ergebnisse/abwicklung.json", import.meta.url), JSON.stringify(ergebnis, null, 1));
