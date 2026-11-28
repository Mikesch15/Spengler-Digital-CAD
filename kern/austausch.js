// Austauschformat App → CAD: «sdcad.massaufnahme» Version 1. Rein (kein DOM, kein Netz).
// Grundsätze: Originalmesswerte bleiben unverändert in `messwerte` (nie überschrieben), alle Zahlen sind
// Zahlen (nie Text) mit festen Einheiten (mm, Grad, m²), IDs sind die Datenbank-IDs, nicht die Auftragsnummer.
// Fehlerhafte Aufnahmen werden mit Befund (fehler/warnung) gemeldet, nie stillschweigend repariert.
export const SCHEMA = "sdcad.massaufnahme";
export const VERSION = 1;
export const EINHEITEN = Object.freeze({ laenge: "mm", winkel: "grad", flaeche: "m2" });

const zahl = (x) => (typeof x === "number" ? x : typeof x === "string" && /^-?\d+([.,]\d+)?$/.test(x.trim()) ? Number(x.trim().replace(",", ".")) : NaN);

// Produktarten, für die das CAD einen Generator hat bzw. haben wird. Alle anderen werden importiert, aber als «noch kein Generator» markiert.
export const GENERATOREN = Object.freeze({ freies_profil: { name: "Freies Profil", bereit: true } });

// Zeile der App-Tabelle `measurements` (+ optional Projekt) → Austausch-Umschlag. Unverändert bleibt `messwerte` (= data).
export function ausAppZeile(zeile, projekt = null, jetzt = new Date().toISOString()) {
  const z = zeile || {};
  return {
    schema: SCHEMA, version: VERSION, einheiten: EINHEITEN, erzeugt: jetzt,
    quelle: { system: "spengler-digital-app", tabelle: "measurements", id: z.id ?? null, aktualisiert: z.updated_at ?? null },
    projekt: { id: z.project_id ?? projekt?.id ?? null, auftragsnr: projekt?.order_no ?? null, name: projekt?.name ?? null },
    art: z.type ?? null,
    titel: z.title ?? "",
    material: { code: z.data?.material ?? null, staerke_mm: z.staerke_mm == null ? null : zahl(z.staerke_mm) },
    messwerte: z.data ?? {},          // Originalstand der App – nicht verändern
    anhaenge: Array.isArray(z.attachments) ? z.attachments.map((a) => ({ id: a.id ?? null, name: a.name ?? a.file_name ?? "", mime: a.mime ?? a.type ?? "", pfad: a.path ?? a.storage_path ?? null })) : [],
  };
}

// Freies Profil: Schenkel {laenge mm, winkel grad} + Länge je Segment → normierte CAD-Parameter (getrennt von den Messwerten).
function freiesProfil(u, f, w) {
  const m = u.messwerte, sch = m.schenkel;
  if (!Array.isArray(sch) || sch.length < 2) { f.push("Profil braucht mindestens 2 Schenkel."); return null; }
  const s = sch.map((x, i) => {
    const l = zahl(x?.laenge), a = zahl(x?.winkel ?? 0);
    if (!(l > 0) || l > 5000) f.push(`Schenkel ${i + 1}: Länge ${x?.laenge} mm ist nicht plausibel (0 < L ≤ 5000).`);
    if (!Number.isFinite(a) || Math.abs(a) > 360) f.push(`Schenkel ${i + 1}: Winkel ${x?.winkel}° ist nicht plausibel.`);
    return { laenge_mm: l, winkel_grad: a };
  });
  if (s[0].winkel_grad !== 0) w.push("Schenkel 1 hat einen Winkel – er dreht das ganze Profil (meist ist 0° gemeint). Die Werte werden unverändert übernommen.");
  const t = u.material.staerke_mm;
  if (t == null || !(t >= 0.2 && t <= 5)) f.push(`Blechstärke ${t ?? "fehlt"} mm fehlt oder ist nicht plausibel (0.2–5 mm).`);
  const segs = Array.isArray(m.segmente) ? m.segmente.map((x) => zahl(x?.laenge)).filter((x) => x > 0) : [];
  if (!segs.length) w.push("Keine Länge angegeben – Länge muss im CAD eingegeben werden.");
  if (segs.some((x) => x > 100000)) f.push("Segmentlänge über 100 m ist nicht plausibel.");
  return { schenkel: s, dicke_mm: t, laengen_mm: segs, stueck: segs.length || 1 };
}

// Prüft einen Umschlag. Ergebnis: { ok, fehler[], warnungen[], cad } – cad nur wenn ok. Nie werfen.
export function pruefe(u) {
  const f = [], w = [];
  if (!u || typeof u !== "object") return { ok: false, fehler: ["Kein gültiger Datensatz."], warnungen: [], cad: null };
  if (u.schema !== SCHEMA) f.push(`Unbekanntes Format «${u.schema}».`);
  if (u.version !== VERSION) f.push(u.version > VERSION ? `Format Version ${u.version} ist neuer als dieses CAD (${VERSION}) – CAD aktualisieren.` : `Format Version ${u.version} wird nicht unterstützt.`);
  if (u.quelle?.id == null) f.push("Messaufnahme-ID fehlt.");
  if (u.projekt?.id == null) f.push("Projekt-ID fehlt.");
  if (!u.art) f.push("Produktart fehlt.");
  if (!u.messwerte || typeof u.messwerte !== "object") f.push("Messwerte fehlen.");
  let cad = null;
  if (!f.length) {
    const g = GENERATOREN[u.art];
    if (!g) w.push(`Für «${u.art}» gibt es noch keinen Generator – die Aufnahme wird nur angezeigt.`);
    else if (u.art === "freies_profil") cad = freiesProfil(u, f, w);
  }
  return { ok: f.length === 0, fehler: f, warnungen: w, cad: f.length ? null : cad };
}

// Kurzstatus für die Importliste.
export function status(u) {
  const p = pruefe(u);
  return { ...p, stufe: !p.ok ? "fehler" : !p.cad ? "ohneGenerator" : p.warnungen.length ? "warnung" : "bereit" };
}
