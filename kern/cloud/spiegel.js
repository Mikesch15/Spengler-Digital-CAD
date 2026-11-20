// Spiegel: lokale Kopie der Cloud-Vorlagen (Add-in-Format) ⇄ Einstellungen der CAD-App (Bausteine, Materialien)
// Standardbausteine/-materialien (Startbestand) bleiben lokal, solange sie unverändert sind; geändert oder neu → Cloud.
import { bausteinZuVorlage, vorlageZuBaustein, materialZuProfil, profilZuMaterial } from "../vorlagen/wandler.js";
import { BAUSTEINE_STANDARD } from "../flaechenblech.js";
import { MATERIALIEN } from "../materialien.js";

export const leererSpiegel = () => ({ kantenvorlage: {}, detailvorlage: {}, materialprofil: {}, stand: {}, papierkorb: [] });
const norm = (x) => (Array.isArray(x) ? (x.length ? x : null) : x && Object.values(x).some((v) => (Array.isArray(v) ? v.length : v != null)) ? x : null);
const gleichB = (a, b) => a && b && JSON.stringify(norm(a.parameter)) === JSON.stringify(norm(b.parameter)) && JSON.stringify(norm(a.bedingungen)) === JSON.stringify(norm(b.bedingungen)) && a.name === b.name && a.folge === b.folge && (+a.versatz || 0) === (+b.versatz || 0) && (a.gruppe || "") === (b.gruppe || "") && (a.partner || "") === (b.partner || "");
const gleichM = (a, b) => a && b && a.name === b.name && a.t === b.t && a.ri === b.ri && a.k === b.k && (a.dichte ?? 0) === (b.dichte ?? 0) && JSON.stringify(a.umform ?? null) === JSON.stringify(b.umform ?? null);

// Einstellungen → Spiegel (vor dem Abgleich): neue/geänderte Bausteine und Materialien als Vorlagen eintragen
export function einstInSpiegel(einst, sp) {
  const vorlageZu = new Map(Object.values(sp.kantenvorlage).map((v) => [v.metadata?.appId || v.id, v]));
  for (const b of einst.bausteine || []) {
    const std = BAUSTEINE_STANDARD.find((s) => s.id === b.id), alt = vorlageZu.get(b.id);
    if (std && gleichB(std, b) && !alt) continue;
    if (alt && gleichB(vorlageZuBaustein(alt), b)) continue; // unverändert
    const v = bausteinZuVorlage(b, alt || null); sp.kantenvorlage[v.id] = v;
  }
  const profilZu = new Map(Object.values(sp.materialprofil).map((p) => [p.id, p]));
  for (const m of einst.materialien || []) {
    const std = MATERIALIEN.find((s) => s.id === m.id), alt = [...profilZu.values()].find((p) => p.id === m.id || p.id === `mat-${m.id}`);
    if (std && gleichM(std, m) && !alt) continue;
    if (alt && gleichM(profilZuMaterial(alt), { ...m })) continue;
    const p = materialZuProfil(m, alt || null); sp.materialprofil[p.id] = p;
  }
  return sp;
}
// Spiegel → Einstellungen (nach dem Abgleich): Cloud-Vorlagen erscheinen als Bausteine/Materialien, Papierkorb entfernt sie
export function spiegelInEinst(einst, sp) {
  const weg = new Set(sp.papierkorb.map((x) => x.split("/")[1]));
  const bausteine = (einst.bausteine || []).filter((b) => !weg.has(b.id) && !weg.has(b.vorlageId) && !weg.has(`kv-${b.id}`));
  for (const v of Object.values(sp.kantenvorlage)) {
    if (weg.has(v.id)) continue;
    let b; try { b = vorlageZuBaustein(v); } catch { continue; }
    const i = bausteine.findIndex((x) => x.id === b.id); if (i >= 0) bausteine[i] = { ...bausteine[i], ...b }; else bausteine.push(b);
  }
  const mats = (einst.materialien || []).filter((m) => !weg.has(m.id) && !weg.has(`mat-${m.id}`));
  for (const p of Object.values(sp.materialprofil)) {
    if (weg.has(p.id)) continue;
    const m = profilZuMaterial(p), i = mats.findIndex((x) => x.id === m.id || `mat-${x.id}` === m.id);
    if (i >= 0) mats[i] = { ...mats[i], ...m, id: mats[i].id }; else mats.push(m);
  }
  return { ...einst, bausteine, materialien: mats.length ? mats : einst.materialien };
}
// Speicher-Adapter für abgleichen()
export function spiegelSpeicher(sp, sichern = () => {}) {
  return { stand: sp.stand, lesen: async (t) => Object.values(sp[t]).map((x) => JSON.parse(JSON.stringify(x))),
    schreiben: async (t, d) => { sp[t][d.id] = JSON.parse(JSON.stringify(d)); sp.papierkorb = sp.papierkorb.filter((x) => x !== `${t}/${d.id}`); },
    papierkorb: async (t, id) => { sp.papierkorb.push(`${t}/${id}`); delete sp[t][id]; }, standSichern: async () => sichern() };
}
