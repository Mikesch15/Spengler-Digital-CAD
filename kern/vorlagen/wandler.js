// Wandler zwischen den Vorlagen des Add-ins/der Cloud und den Datenstrukturen der CAD-App
//   Kantenvorlage  ⇄ Kantenbaustein (Kurzschrift «folge», Gruppe, Versatz)
//   Materialprofil ⇄ Material (t, ri, k, dichte, Tafeln, Rollen)
// Verlustfrei in beide Richtungen soweit die App die Felder kennt; alles andere bleibt in `daten` erhalten.
import { zerlege, alsText, aufloesen } from "./kurzschrift.js";
import { neueKantenvorlage, neuesMaterialprofil, parameter, KATEGORIE_OHNE, jetzt, kopie } from "./modelle.js";

// Baustein der App → Kantenvorlage (Parameter «Versatz» wird als fester Wert in metadata gehalten)
export function bausteinZuVorlage(b, bestehend = null) {
  const v = bestehend ? kopie(bestehend) : neueKantenvorlage(b.name);
  Object.assign(v, { name: b.name, category: b.gruppe || KATEGORIE_OHNE, operations: zerlege(b.folge), modified: jetzt() });
  if (bestehend) v.version = bestehend.version; // die Versionszählung führt der Abgleich
  v.metadata = { ...(v.metadata || {}), versatz: +b.versatz || 0, partner: b.partner || null, appId: b.id };
  if (b.id && !bestehend) v.id = String(b.id).startsWith("kv-") ? b.id : `kv-${String(b.id).replace(/[^A-Za-z0-9_.-]/g, "").slice(0, 70)}`;
  return v;
}
// Kantenvorlage → Baustein der App; Parameter werden mit ihren Standardwerten eingesetzt (t, ri, k aus dem Material)
export function vorlageZuBaustein(v, werte = {}) {
  const wert = { ...Object.fromEntries((v.parameters || []).filter((p) => p.default !== null && p.default !== undefined).map((p) => [p.name, p.default])), ...werte };
  const ops = (v.parameters || []).length || (v.operations || []).some((o) => [o.winkel, o.laenge, o.radius].some((x) => typeof x === "string")) ? aufloesen(v.operations, { t: 1, ri: 1, k: 0.4, ...wert }) : v.operations;
  return { id: v.metadata?.appId || v.id, name: v.name, gruppe: v.category === KATEGORIE_OHNE ? "" : v.category, folge: alsText(ops), versatz: +v.metadata?.versatz || 0, partner: v.metadata?.partner || undefined, vorlageId: v.id, vorlageVersion: v.version };
}
// Material der App → Materialprofil
export function materialZuProfil(m, bestehend = null) {
  const p = bestehend ? kopie(bestehend) : neuesMaterialprofil(m.name, m.t);
  Object.assign(p, { name: m.name, thickness: +m.t, innerRadius: m.ri ?? null, kFactor: m.k ?? null, density: m.dichte ?? null, modified: jetzt() });
  if (bestehend) p.version = bestehend.version;
  if (!bestehend && m.id) p.id = String(m.id).startsWith("mat-") ? m.id : `mat-${String(m.id).replace(/[^A-Za-z0-9_.-]/g, "").slice(0, 70)}`;
  p.sheets = m.tafeln ?? p.sheets; p.coils = m.coils ?? p.coils;
  return p;
}
export const profilZuMaterial = (p) => ({ id: p.id, name: p.name, t: +p.thickness, ri: p.innerRadius ?? 1, k: p.kFactor ?? 0.4, dichte: p.density ?? 0, tafeln: p.sheets || [], coils: p.coils || [] });
export { parameter };
