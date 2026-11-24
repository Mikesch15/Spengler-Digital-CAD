// Cloud-Ablage der Modelle wie in Fusion: Projekte / <Jahr> / <Projekt> / { Modelle, Exporte, Pläne } – reine Rechnung ohne Netz.
// Ordner sind Pfade (Text); die Projektordner werden automatisch angelegt, sobald ein Modell einem Projekt zugeordnet wird – nur wenn es sie noch nicht gibt.
export const HAUPT = "Projekte", UNTER = ["Modelle", "Exporte", "Pläne"];
const SCHLECHT = /[\\/:*?"<>|\u0000-\u001f]+/g;
export const ordnerName = (s, ersatz = "Ohne Name") => String(s ?? "").replace(SCHLECHT, "-").replace(/\s+/g, " ").trim().replace(/^\.+/, "").slice(0, 80) || ersatz;
export const dateiName = (s) => ordnerName(s, "Datei").replace(/\s*-\s*$/, "");
// Name des Projektordners: «Auftrags-Nr. Projektname» (z. B. «2026-114 Dach Müller»)
export const projektOrdnerName = ({ auftrag, name }) => ordnerName([auftrag, name].filter((x) => x && String(x).trim()).join(" "), "Projekt");
export function ordnerPlan({ jahr = new Date().getFullYear(), auftrag = "", name = "" } = {}) {
  const jahrP = `${HAUPT}/${jahr}`, projekt = `${jahrP}/${projektOrdnerName({ auftrag, name })}`;
  return { haupt: HAUPT, jahr: jahrP, projekt, modelle: `${projekt}/Modelle`, exporte: `${projekt}/Exporte`, plaene: `${projekt}/Pläne`, alle: [HAUPT, jahrP, projekt, ...UNTER.map((u) => `${projekt}/${u}`)] };
}
// Vorhandenen Projektordner finden (egal in welchem Jahr): zuerst über die App-Projekt-Nummer, dann über die Auftrags-Nr. am Namensanfang
export function findeProjektOrdner(ordner, { projectId = null, auftrag = "" } = {}) {
  const tiefe = (o) => o.pfad.split("/").length, projekte = ordner.filter((o) => tiefe(o) === 3 && o.pfad.startsWith(HAUPT + "/"));
  if (projectId != null) { const t = projekte.find((o) => o.project_id != null && String(o.project_id) === String(projectId)); if (t) return t.pfad; }
  const a = String(auftrag || "").trim().toLowerCase();
  if (a) { const t = projekte.find((o) => { const n = o.pfad.split("/")[2].toLowerCase(); return n === a || n.startsWith(a + " "); }); if (t) return t.pfad; }
  return null;
}
// Plan für die Zuordnung: vorhandener Projektordner wird weiterverwendet, sonst im aktuellen Jahr angelegt. neu = Pfade, die noch fehlen (in Anlegereihenfolge)
export function zuordnung(ordner, { projectId = null, auftrag = "", name = "", jahr = new Date().getFullYear() } = {}) {
  const hat = new Set(ordner.map((o) => o.pfad)), vorh = findeProjektOrdner(ordner, { projectId, auftrag });
  const p = vorh ? { haupt: HAUPT, jahr: vorh.split("/").slice(0, 2).join("/"), projekt: vorh, modelle: `${vorh}/Modelle`, exporte: `${vorh}/Exporte`, plaene: `${vorh}/Pläne`, alle: [HAUPT, vorh.split("/").slice(0, 2).join("/"), vorh, ...UNTER.map((u) => `${vorh}/${u}`)] } : ordnerPlan({ jahr, auftrag, name });
  return { ...p, vorhanden: !!vorh, neu: p.alle.filter((x) => !hat.has(x)) };
}
// Baum für die Anzeige: [{ pfad, name, tiefe, dateien: [] }] sortiert (Jahre absteigend, sonst alphabetisch)
export function baum(ordner, dateien = []) {
  const alle = new Set(ordner.map((o) => o.pfad)); for (const d of dateien) alle.add(d.ordner);
  const liste = [...alle].map((pfad) => ({ pfad, name: pfad.split("/").at(-1), tiefe: pfad.split("/").length - 1, dateien: dateien.filter((d) => d.ordner === pfad && !d.geloescht) }));
  const schluessel = (p) => p.split("/").map((s, i) => (i === 1 && /^\d{4}$/.test(s) ? String(9999 - +s) : UNTER.includes(s) ? String(UNTER.indexOf(s)) : s.toLowerCase()));
  return liste.sort((a, b) => { const x = schluessel(a.pfad), y = schluessel(b.pfad); for (let i = 0; i < Math.max(x.length, y.length); i++) { if (x[i] === undefined) return -1; if (y[i] === undefined) return 1; if (x[i] !== y[i]) return x[i] < y[i] ? -1 : 1; } return 0; });
}
export const modellDateiName = (doc) => `${dateiName(String(doc.modellName ?? "").trim() || [doc.nr, doc.objekt].filter(Boolean).join(" ") || "Modell")}.sdcad`; // frei wählbarer Modellname, sonst «Nr. Objekt»
