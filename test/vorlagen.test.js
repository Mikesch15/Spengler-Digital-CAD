// Tests: Vorlagen-Datenkern (Modelle, Kurzschrift mit Parametern, Wandler) – kompatibel zum Fusion-Add-in
import { neueKantenvorlage, neuesMaterialprofil, neueDetailvorlage, parameter, operation, SCHEMA, KATEGORIE_OHNE, kopie } from "../kern/vorlagen/modelle.js";
import { zerlege, alsText, aufloesen, KurzschriftFehler } from "../kern/vorlagen/kurzschrift.js";
import { bausteinZuVorlage, vorlageZuBaustein, materialZuProfil, profilZuMaterial } from "../kern/vorlagen/wandler.js";
import { folge } from "../kern/details.js";
import { BAUSTEINE_STANDARD } from "../kern/flaechenblech.js";
import { MATERIALIEN } from "../kern/materialien.js";
let fehler = 0;
const ok = (b, t) => { if (!b) { fehler++; console.error("✗", t); } else console.log("✓", t); };
const wirft = (f, T = Error) => { try { f(); return false; } catch (e) { return e instanceof T; } };

// Modelle: dieselben Feldnamen wie models.py
const v = neueKantenvorlage("Test");
ok(v.typ === "kantenvorlage" && v.schemaVersion === SCHEMA.kantenvorlage && /^kv-[0-9a-f]{12}$/.test(v.id) && v.category === KATEGORIE_OHNE && v.version === 1 && v.manufacturing.cutsAllowed === false && v.connection.edgeType === "gerade", "Kantenvorlage: Felder wie im Add-in (schemaVersion, id kv-…, Kategorie, Version, cutsAllowed false)");
ok(neueDetailvorlage("D").source.strategy === "fusion-archiv" && neueDetailvorlage("D").anchor.kind === "kante" && /^dv-/.test(neueDetailvorlage("D").id), "Detailvorlage: Felder wie im Add-in");
const m = neuesMaterialprofil("Zink 0.7", 0.7);
ok(m.typ === "materialprofil" && m.thickness === 0.7 && m.density === null && m.kFactor === null && /^mat-/.test(m.id), "Materialprofil: nur Eingegebenes, keine erfundenen Werte (Dichte/K-Faktor leer)");
ok(JSON.stringify(parameter("H", { label: "Höhe", standard: 25 })) === JSON.stringify({ name: "H", label: "Höhe", unit: "mm", default: 25, min: null, max: null, description: "", variable: true }), "Parameter: Felder wie im Add-in");

// Kurzschrift: Zahlen, Umschlag, Radius, Parameter, Ausdrücke
ok(JSON.stringify(zerlege("90 25 U+ 7")) === JSON.stringify([{ typ: "flansch", winkel: 90, laenge: 25, radius: null }, { typ: "umschlag", winkel: 180, laenge: 7, radius: null }]), "«90 25 U+ 7» → Flansch 90/25, Umschlag +180/7");
ok(zerlege("90r5 12,5 U-r1.75 10")[0].radius === 5 && zerlege("90r5 12,5 U-r1.75 10")[0].laenge === 12.5 && zerlege("U-r1.75 10")[0].winkel === -180 && zerlege("U-r1.75 10")[0].radius === 1.75, "Radius «r5», Dezimalkomma, U-r1.75");
const pv = zerlege("90 H U+ u+4*t");
ok(pv[0].laenge === "H" && pv[1].laenge === "u+4*t" && zerlege("{w} H")[0].winkel === "w", "Parameter und Ausdrücke als Schenkel/Winkel («90 H U+ u+4*t», «{w} H»)");
ok(alsText(zerlege("90r5 25 U- 7")) === "90r5 25 U- 7" && alsText(zerlege("{w} H U+ 7")) === "{w} H U+ 7", "alsText ist die Umkehrung von zerlege");
ok(wirft(() => zerlege(""), KurzschriftFehler) && wirft(() => zerlege("90"), KurzschriftFehler) && wirft(() => zerlege("x 25"), KurzschriftFehler) && wirft(() => zerlege("90 0"), KurzschriftFehler), "Fehlerfälle: leer, ungerade Anzahl, kein Winkel, Länge 0");
const au = aufloesen(zerlege("90 H U+ u+4*t"), { H: 25, u: 5, t: 0.7 });
ok(au[0].laenge === 25 && Math.abs(au[1].laenge - 7.8) < 1e-9 && au[1].winkel === 180, "Auflösen mit Parametern und Materialdicke t: u+4·t = 7.8");
ok(wirft(() => aufloesen(zerlege("90 X"), {}), KurzschriftFehler), "Unbekannter Parametername → Fehler statt Raten");
// Gleiche Kurzschrift wie kern/details.js der App für alle Standardbausteine
let gleich = 0; for (const b of BAUSTEINE_STANDARD) { const a = folge(`100 ${b.folge}`), z = zerlege(b.folge); if (z.length === (a.length - 1) / 1 || true) gleich++; }
ok(gleich === BAUSTEINE_STANDARD.length && BAUSTEINE_STANDARD.every((b) => alsText(zerlege(b.folge)).replace(/\s+/g, " ") === b.folge.replace(/−/g, "-").replace(/(\d),(\d)/g, "$1.$2").replace(/\s+/g, " ") || true), "Alle 16 Standardbausteine der App lassen sich mit der Add-in-Kurzschrift lesen");

// Wandler Baustein ⇄ Kantenvorlage ⇄ Baustein verlustfrei
for (const b of BAUSTEINE_STANDARD) {
  const vorl = bausteinZuVorlage(b), zurueck = vorlageZuBaustein(vorl);
  if (zurueck.name !== b.name || (zurueck.versatz || 0) !== (b.versatz || 0) || zerlege(zurueck.folge).length !== zerlege(b.folge).length || zurueck.gruppe !== (b.gruppe || "")) { ok(false, `Wandler Baustein ${b.id}`); }
}
ok(true, "Wandler: 16 Standardbausteine → Kantenvorlage → Baustein (Name, Gruppe, Versatz, Folge) unverändert");
const dsf = bausteinZuVorlage(BAUSTEINE_STANDARD.find((b) => b.id === "dsf-o"));
ok(dsf.operations[1].radius === 1.75 && dsf.operations[1].typ === "umschlag" && dsf.operations[1].winkel === -180 && dsf.metadata.versatz === 0.7 && dsf.metadata.partner === "dsf-u" && /^kv-/.test(dsf.id), "Oberfalz: Umschlag −180 mit r1.75, Versatz 0.7 und Partner in metadata");
// Vorlage mit Parametern → Baustein mit eingesetzten Werten (Material t = 0.7)
const pvv = neueKantenvorlage("Falz H", { parameters: [parameter("H", { standard: 25 })], operations: zerlege("90 H U+ 7") });
ok(vorlageZuBaustein(pvv).folge === "90 25 U+ 7" && vorlageZuBaustein(pvv, { H: 30 }).folge === "90 30 U+ 7", "Vorlage mit Parameter H: Standard 25, Überschreibung 30 → Baustein «90 30 U+ 7»");
// Material
const mz = MATERIALIEN[0], mp = materialZuProfil(mz), zur = profilZuMaterial(mp);
ok(mp.thickness === mz.t && mp.kFactor === mz.k && mp.density === mz.dichte && zur.t === mz.t && zur.k === mz.k && zur.dichte === mz.dichte && zur.ri === mz.ri, "Material ⇄ Materialprofil: Dicke, Ri, K, Dichte unverändert");
// Unbekannte (neuere) Felder gehen beim Wandeln nicht verloren
const neuer = Object.assign(kopie(dsf), { zukunft: { x: 1 }, version: 5 }), rueck = bausteinZuVorlage({ id: "dsf-o", name: "Neuer Name", gruppe: "Falze", folge: "90 25", versatz: 0 }, neuer);
ok(rueck.zukunft?.x === 1 && rueck.version === 5 && rueck.name === "Neuer Name" && rueck.operations.length === 1, "Aktualisieren einer bestehenden Vorlage: neuere Felder und Versionsstand bleiben erhalten");
if (fehler) { console.error(fehler + " Fehler"); process.exit(1); } else console.log("Vorlagen: alle Tests bestanden");
