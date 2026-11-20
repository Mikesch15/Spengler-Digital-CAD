// Abgleich lokale Vorlagen ⇄ Cloud (cad_daten) – gleiches Verfahren wie das Fusion-Add-in (sync_service.py)
// Lokal zuerst; Cloud-Version massgebend; Konflikt → Cloud-Fassung gilt, lokale bleibt als «Name (Konflikt TT.MM.)»; nie endgültig löschen.
import { TYPEN, SCHEMA, neueId, kopie, jetzt } from "../vorlagen/modelle.js";
import { CloudFehler } from "./client.js";

const PRAEFIX = { kantenvorlage: "kv", detailvorlage: "dv", materialprofil: "mat" };
async function sha256(text) {
  const b = new TextEncoder().encode(text), h = await globalThis.crypto.subtle.digest("SHA-256", b);
  return [...new Uint8Array(h)].map((x) => x.toString(16).padStart(2, "0")).join("");
}
const sortiert = (v) => Array.isArray(v) ? v.map(sortiert) : v && typeof v === "object" ? Object.fromEntries(Object.keys(v).sort().map((k) => [k, sortiert(v[k])])) : v;
// Inhaltsprüfsumme ohne version/modified und «_…»-Felder
export const pruefsumme = (d) => { const c = kopie(d); delete c.version; delete c.modified; for (const k of Object.keys(c)) if (k.startsWith("_")) delete c[k]; return sha256(JSON.stringify(sortiert(c))); };
const schl = (typ, id) => `${typ}/${id}`;
const kurz = () => { const d = new Date(); return `${String(d.getDate()).padStart(2, "0")}.${String(d.getMonth() + 1).padStart(2, "0")}.`; };

// speicher: { lesen(typ) → [Datensatz], schreiben(typ, d), papierkorb(typ, id), stand: {…} (wird verändert), standSichern() }
// Rückgabe: Bericht
export async function abgleichen(client, speicher, { hochladenErlaubt = null } = {}) {
  const b = { geladen: 0, hochgeladen: 0, geloescht: 0, konflikte: 0, nur_lokal: false, fehler: [], neuer: [] };
  const darf = hochladenErlaubt ?? (await client.darfBearbeiten("vorlagen"));
  b.nur_lokal = !darf;
  const cloud = await client.liste(TYPEN), stand = speicher.stand;
  const cloudMap = new Map(cloud.map((c) => [schl(c.typ, c.record_id), c]));
  for (const typ of TYPEN) {
    const lokal = new Map((await speicher.lesen(typ)).map((d) => [d.id, d]));
    // 1) Cloud → lokal
    for (const c of cloud.filter((x) => x.typ === typ)) {
      const k = schl(typ, c.record_id), s = stand[k], l = lokal.get(c.record_id);
      if (c.geloescht) { if (l) { await speicher.papierkorb(typ, c.record_id); lokal.delete(c.record_id); b.geloescht++; } delete stand[k]; continue; }
      if ((c.schema_version || 1) > (SCHEMA[typ] || 1)) { b.fehler.push(`${typ} «${c.daten?.name || c.record_id}»: neueres Format, nur gelesen`); }
      if (!l && s) continue; // lokal gelöscht, Löschung geht in Schritt 3 an die Cloud
      if (!l) { await speicher.schreiben(typ, { ...c.daten, version: c.version }); stand[k] = { version: c.version, hash: await pruefsumme(c.daten) }; lokal.set(c.record_id, { ...c.daten, version: c.version }); b.geladen++; b.neuer.push(c.daten?.name || c.record_id); continue; }
      const hl = await pruefsumme(l), hc = await pruefsumme(c.daten);
      const lokalGeaendert = s ? hl !== s.hash : hl !== hc, cloudNeuer = s ? c.version > s.version : hl !== hc;
      const cloudStand = async () => { stand[k] = { version: c.version, hash: hc }; lokal.set(c.record_id, { ...c.daten, version: c.version }); };
      if (!s && hl === hc) { await cloudStand(); await speicher.schreiben(typ, { ...l, version: c.version }); }
      else if (cloudNeuer && lokalGeaendert) { // Konflikt: Cloud gilt, lokale Fassung als Kopie behalten
        const kopieD = kopie(l); kopieD.id = neueId(PRAEFIX[typ]); kopieD.name = `${l.name} (Konflikt ${kurz()})`; kopieD.version = 1; kopieD.metadata = { ...(kopieD.metadata || {}), konfliktVon: l.id };
        await speicher.schreiben(typ, kopieD); lokal.set(kopieD.id, kopieD); b.konflikte++;
        await speicher.schreiben(typ, { ...c.daten, version: c.version }); await cloudStand(); b.geladen++;
      } else if (cloudNeuer) { await speicher.schreiben(typ, { ...c.daten, version: c.version }); await cloudStand(); b.geladen++; }
    }
    // 2) lokal → Cloud (nur mit Recht)
    for (const [id, l] of lokal) {
      const k = schl(typ, id), c = cloudMap.get(k), s = stand[k];
      if (c?.geloescht) continue;
      const h = await pruefsumme(l);
      if (!c) { // neu → hochladen
        if (!darf) continue;
        try { const r = await client.anlegen(typ, id, l, SCHEMA[typ] || 1); stand[k] = { version: r?.version || 1, hash: h }; b.hochgeladen++; } catch (e) { b.fehler.push(`${typ} «${l.name}»: ${e.message}`); }
      } else if (s && h !== s.hash && c.version === s.version) { // lokal geändert, Cloud unverändert
        if (!darf) continue;
        try { const r = await client.aendern(typ, id, s.version, l, SCHEMA[typ] || 1); if (r) { stand[k] = { version: r.version, hash: h }; b.hochgeladen++; } else b.fehler.push(`${typ} «${l.name}»: inzwischen geändert, beim nächsten Abgleich`); } catch (e) { b.fehler.push(`${typ} «${l.name}»: ${e.message}`); }
      }
    }
    // 3) lokal gelöscht (im Stand bekannt, nicht mehr lokal) → Cloud «geloescht»
    for (const k of Object.keys(stand).filter((x) => x.startsWith(typ + "/"))) {
      const id = k.slice(typ.length + 1), c = cloudMap.get(k);
      if (lokal.has(id) || !c || c.geloescht) { if (!lokal.has(id) && !c) delete stand[k]; continue; }
      if (!darf) continue;
      try { const r = await client.aendern(typ, id, stand[k].version, c.daten, SCHEMA[typ] || 1, true); if (r) { delete stand[k]; b.geloescht++; } } catch (e) { b.fehler.push(`${typ} ${id}: ${e.message}`); }
    }
  }
  await speicher.standSichern?.();
  return b;
}
export { CloudFehler };
