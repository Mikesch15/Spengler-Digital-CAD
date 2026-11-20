// Spengler Digital CAD – Vorlagen-Datenmodelle, kompatibel zum Fusion-Add-in (spengler_cad/core/models.py, Schema 1)
// Alles sind einfache, versionierte JSON-Datensätze: unbekannte (neuere) Felder bleiben beim Laden und Speichern erhalten.
// Längen in mm, Winkel in Grad. Dieselben Feldnamen wie im Add-in, damit beide Programme dieselben Datensätze in der Cloud lesen.

export const SCHEMA = Object.freeze({ kantenvorlage: 1, detailvorlage: 1, materialprofil: 1, einstellungen: 1, bibliothek_export: 1 });
export const KATEGORIE_OHNE = "Ohne Kategorie";
export const TYPEN = Object.freeze(["kantenvorlage", "detailvorlage", "materialprofil"]);

export const jetzt = () => new Date().toISOString().replace(/\.\d+Z$/, "");
const hex = (n) => Array.from({ length: n }, () => Math.floor(Math.random() * 16).toString(16)).join("");
export const neueId = (praefix) => `${praefix}-${hex(12)}`;
export const kopie = (d) => JSON.parse(JSON.stringify(d));

export const parameter = (name, { label = "", einheit = "mm", standard = null, minimum = null, maximum = null, beschreibung = "", variabel = true } = {}) =>
  ({ name, label: label || name, unit: einheit, default: standard, min: minimum, max: maximum, description: beschreibung, variable: !!variabel });
export const operation = (typ, winkel, laenge, radius = null, extra = {}) => ({ typ, winkel, laenge, radius, ...extra });

export function neueKantenvorlage(name, { operations = [], parameters = [], ...extra } = {}) {
  return {
    schemaVersion: SCHEMA.kantenvorlage, typ: "kantenvorlage", id: neueId("kv"), name, description: "", category: KATEGORIE_OHNE, favorite: false,
    version: 1, created: jetzt(), modified: jetzt(), parameters, operations,
    connection: { edgeType: "gerade", side: "sichtseite" },
    constraints: { thicknessMin: null, thicknessMax: null, materials: [], edgeLengthMin: null },
    manufacturing: { cutsAllowed: false, relief: { type: "fusion" } },
    metadata: { author: "", notes: "" }, ...extra,
  };
}
export function neueDetailvorlage(name, extra = {}) {
  return {
    schemaVersion: SCHEMA.detailvorlage, typ: "detailvorlage", id: neueId("dv"), name, description: "", category: KATEGORIE_OHNE, favorite: false,
    version: 1, created: jetzt(), modified: jetzt(),
    source: { strategy: "fusion-archiv", file: null, componentName: "", fusionVersion: "" },
    anchor: { kind: "kante", edgeLength: null, edgeType: "gerade", frame: null },
    parameters: [], fixedParameters: [], featureMapping: [],
    compatibility: { thickness: null, thicknessTolerance: 0.01, edgeLengthMin: null, edgeLengthMax: null, materials: [], edgeType: "gerade" },
    preview: { image: null, text: "" }, metadata: { author: "", notes: "" }, ...extra,
  };
}
export function neuesMaterialprofil(name, dickeMm, extra = {}) {
  return {
    schemaVersion: SCHEMA.materialprofil, typ: "materialprofil", id: neueId("mat"), name, material: "", thickness: +dickeMm,
    density: null, innerRadius: null, kFactor: null, sheetMetalRule: "", notes: "", sheets: [], coils: [],
    formingLimits: { shrinkMaxPercent: null, stretchMaxPercent: null, source: "" }, created: jetzt(), modified: jetzt(), ...extra,
  };
}
