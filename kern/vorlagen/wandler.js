// Wandler zwischen den Vorlagen des Add-ins/der Cloud und den Datenstrukturen der CAD-App
//   Kantenvorlage  ⇄ Kantenbaustein (Kurzschrift «folge», Gruppe, Versatz)
//   Materialprofil ⇄ Material (t, ri, k, dichte, Tafeln, Rollen)
// Verlustfrei in beide Richtungen soweit die App die Felder kennt; alles andere bleibt in `daten` erhalten.
import { zerlege, alsText } from "./kurzschrift.js";
import { bausteinFolge } from "./parameter.js";
import { neueKantenvorlage, neuesMaterialprofil, parameter, KATEGORIE_OHNE, jetzt, kopie } from "./modelle.js";

// Baustein der App → Kantenvorlage (Parameter «Versatz» wird als fester Wert in metadata gehalten)
export function bausteinZuVorlage(b, bestehend = null) {
  const v = bestehend ? kopie(bestehend) : neueKantenvorlage(b.name);
  Object.assign(v, { name: b.name, category: b.gruppe || KATEGORIE_OHNE, operations: zerlege(b.folge), modified: jetzt() });
  if (bestehend) v.version = bestehend.version; // die Versionszählung führt der Abgleich
  v.parameters = (b.parameter || []).map((q) => parameter(q.name, { label: q.label, standard: q.standard, minimum: q.min, maximum: q.max }));
  const c = b.bedingungen || {}; v.constraints = { ...(v.constraints || {}), thicknessMin: c.dickeMin ?? null, thicknessMax: c.dickeMax ?? null, materials: c.materialien || [], edgeLengthMin: c.kantenMin ?? null };
  v.metadata = { ...(v.metadata || {}), versatz: +b.versatz || 0, partner: b.partner || null, appId: b.id };
  if (b.id && !bestehend) v.id = String(b.id).startsWith("kv-") ? b.id : `kv-${String(b.id).replace(/[^A-Za-z0-9_.-]/g, "").slice(0, 70)}`;
  return v;
}
// Kantenvorlage → Baustein; Parameter und Ausdrücke bleiben erhalten (aufgelöst wird erst mit dem Material beim Berechnen)
export function vorlageZuBaustein(v) {
  const c = v.constraints || {}, ps = (v.parameters || []).map((p) => ({ name: p.name, label: p.label || p.name, standard: p.default ?? null, min: p.min ?? null, max: p.max ?? null }));
  const bed = { dickeMin: c.thicknessMin ?? null, dickeMax: c.thicknessMax ?? null, kantenMin: c.edgeLengthMin ?? null, materialien: c.materials || [] };
  const b = { id: v.metadata?.appId || v.id, name: v.name, gruppe: v.category === KATEGORIE_OHNE ? "" : v.category, folge: alsText(v.operations), versatz: +v.metadata?.versatz || 0, partner: v.metadata?.partner || undefined, vorlageId: v.id, vorlageVersion: v.version };
  if (ps.length) b.parameter = ps;
  if (Object.values(bed).some((x) => (Array.isArray(x) ? x.length : x != null))) b.bedingungen = bed;
  return b;
}
// Material der App → Materialprofil
export function materialZuProfil(m, bestehend = null) {
  const p = bestehend ? kopie(bestehend) : neuesMaterialprofil(m.name, m.t);
  Object.assign(p, { name: m.name, thickness: +m.t, innerRadius: m.ri ?? null, kFactor: m.k ?? null, density: m.dichte ?? null, modified: jetzt() });
  if (bestehend) p.version = bestehend.version;
  if (!bestehend && m.id) p.id = String(m.id).startsWith("mat-") ? m.id : `mat-${String(m.id).replace(/[^A-Za-z0-9_.-]/g, "").slice(0, 70)}`;
  p.sheets = m.tafeln ?? p.sheets; p.coils = m.coils ?? p.coils;
  if (m.umform) p.formingLimits = { shrinkMaxPercent: m.umform.schrumpfMaxProzent ?? null, stretchMaxPercent: m.umform.streckMaxProzent ?? null, source: m.umform.quelle || "" };
  return p;
}
export const profilZuMaterial = (p) => ({ id: p.id, name: p.name, t: +p.thickness, ri: p.innerRadius ?? 1, k: p.kFactor ?? 0.4, dichte: p.density ?? 0, tafeln: p.sheets || [], coils: p.coils || [], ...(p.formingLimits && (p.formingLimits.shrinkMaxPercent != null || p.formingLimits.stretchMaxPercent != null) ? { umform: { schrumpfMaxProzent: p.formingLimits.shrinkMaxPercent, streckMaxProzent: p.formingLimits.stretchMaxPercent, quelle: p.formingLimits.source || "" } } : {}) });
export { parameter };
