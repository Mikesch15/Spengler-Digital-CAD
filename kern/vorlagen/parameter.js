// Kantenbausteine mit Parametern (wie die Kantenvorlagen des Add-ins)
// Baustein: { folge: "90 H U+ u+4*t", parameter: [{ name, label, standard, min, max }], bedingungen: { dickeMin, dickeMax, kantenMin, materialien: [] } }
// t, ri, k stammen aus dem Material (reserviert); alle anderen Namen sind Parameter. Ohne Parameter/Ausdrücke bleibt alles wie bisher (reine Zahlen).
import { zerlege, alsText, aufloesen, KurzschriftFehler } from "./kurzschrift.js";

const ZAHL_TOKEN = /^(?:U[+-]?|[+-]?\d+(?:[.,]\d+)?)(?:r\d+(?:[.,]\d+)?)?$|^[+-]?\d+(?:[.,]\d+)?$/i;
export const hatAusdruck = (b) => String(b?.folge ?? "").replace(/−/g, "-").split(/[\s;]+/).filter(Boolean).some((t) => !ZAHL_TOKEN.test(t));
export const RESERVIERT = ["t", "ri", "k"];

// Werte für die Berechnung: Material (t, ri, k) + Standardwerte der Parameter + Überschreibungen
export function bausteinWerte(b, m, werte = {}) {
  const w = { t: m.t, ri: m.ri, k: m.k };
  for (const p of b?.parameter || []) if (p.standard !== null && p.standard !== undefined && p.standard !== "") w[p.name] = +p.standard;
  return Object.assign(w, werte, b?._werte || {});
}
// Abkantfolge als reine Zahlen (für folge() und die Rechnung); wirft KurzschriftFehler bei unbekannten Namen
export function bausteinFolge(b, m, werte = {}) {
  if (!hatAusdruck(b)) return String(b.folge);
  return alsText(aufloesen(zerlege(b.folge), bausteinWerte(b, m, werte)));
}
// Eignung für Material und Kante: Liste verständlicher Hinweise (leer = geeignet)
export function pruefeEignung(b, m, { kantenlaenge = null, werte = {} } = {}) {
  const h = [], c = b?.bedingungen || {};
  if (c.dickeMin > 0 && m.t < c.dickeMin) h.push(`Material ${m.t} mm ist dünner als erlaubt (min. ${c.dickeMin} mm).`);
  if (c.dickeMax > 0 && m.t > c.dickeMax) h.push(`Material ${m.t} mm ist dicker als erlaubt (max. ${c.dickeMax} mm).`);
  if (c.materialien?.length && !c.materialien.includes(m.id) && !c.materialien.includes(m.name)) h.push(`Material «${m.name}» ist für diesen Baustein nicht freigegeben.`);
  if (c.kantenMin > 0 && kantenlaenge != null && kantenlaenge < c.kantenMin) h.push(`Kante ${Math.round(kantenlaenge)} mm ist kürzer als erlaubt (min. ${c.kantenMin} mm).`);
  const w = bausteinWerte(b, m, werte);
  for (const p of b?.parameter || []) {
    const v = w[p.name];
    if (p.min !== null && p.min !== undefined && p.min !== "" && v < p.min) h.push(`${p.label || p.name} = ${v} ist kleiner als min. ${p.min}.`);
    if (p.max !== null && p.max !== undefined && p.max !== "" && v > p.max) h.push(`${p.label || p.name} = ${v} ist grösser als max. ${p.max}.`);
  }
  try { bausteinFolge(b, m, werte); } catch (e) { h.push(e.message); }
  return h;
}
// Parameter als Text (eine Zeile je Parameter): «H = 25 [10-60] Höhe der Aufkantung»
export function parameterText(ps) { return (ps || []).map((p) => `${p.name} = ${p.standard ?? ""}${p.min != null && p.min !== "" || p.max != null && p.max !== "" ? ` [${p.min ?? ""}-${p.max ?? ""}]` : ""}${p.label && p.label !== p.name ? " " + p.label : ""}`).join("\n"); }
export function parameterAusText(text) {
  const out = [], namen = new Set();
  for (const z of String(text || "").split(/\n+/).map((s) => s.trim()).filter(Boolean)) {
    const m = /^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(-?\d+(?:[.,]\d+)?)\s*(?:\[\s*(-?\d+(?:[.,]\d+)?)?\s*-\s*(-?\d+(?:[.,]\d+)?)?\s*\])?\s*(.*)$/.exec(z.replace(/−/g, "-"));
    if (!m) throw new KurzschriftFehler(`Parameterzeile «${z}»: Format «Name = Standard [min-max] Bezeichnung».`);
    if (RESERVIERT.includes(m[1])) throw new KurzschriftFehler(`«${m[1]}» ist reserviert (Materialdicke t, Innenradius ri, K-Faktor k).`);
    if (namen.has(m[1])) throw new KurzschriftFehler(`Parameter «${m[1]}» doppelt.`);
    namen.add(m[1]); const n = (x) => (x == null || x === "" ? null : parseFloat(x.replace(",", ".")));
    out.push({ name: m[1], label: m[5] || m[1], standard: n(m[2]), min: n(m[3]), max: n(m[4]) });
  }
  return out;
}
