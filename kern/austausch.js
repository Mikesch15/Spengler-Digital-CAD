// Austauschformat App → CAD: «sdcad.massaufnahme» Version 1. Rein (kein DOM, kein Netz).
// Grundsätze: Originalmesswerte bleiben unverändert in `messwerte` (nie überschrieben), alle Zahlen sind
// Zahlen (nie Text) mit festen Einheiten (mm, Grad, m²), IDs sind die Datenbank-IDs, nicht die Auftragsnummer.
// Fehlerhafte Aufnahmen werden mit Befund (fehler/warnung) gemeldet, nie stillschweigend repariert.
export const SCHEMA = "sdcad.massaufnahme";
export const VERSION = 1;
export const EINHEITEN = Object.freeze({ laenge: "mm", winkel: "grad", flaeche: "m2" });

const zahl = (x) => (typeof x === "number" ? x : typeof x === "string" && /^-?\d+([.,]\d+)?$/.test(x.trim()) ? Number(x.trim().replace(",", ".")) : NaN);

// Produktarten, für die das CAD einen Generator hat bzw. haben wird. Alle anderen werden importiert, aber als «noch kein Generator» markiert.
export const GENERATOREN = Object.freeze({ freies_profil: { name: "Freies Profil", bereit: true }, einlaufblech_gerade: { name: "Einlaufblech gerade", bereit: true } });

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

// Einlaufblech gerade: Profil = Umschlag unten · Mass A · Biegung (180° − Winkel) · Restbreite · Umschlag oben.
// Die App speichert die Umschläge NICHT (Firmeneinstellung), nur Abwicklung, Mass A und Restbreite → Umschlag gesamt = Abwicklung − Mass A − Restbreite,
// hier zu gleichen Teilen auf oben/unten verteilt (Annahme, als Warnung gemeldet).
function einlaufblech(u, f, w) {
  const m = u.messwerte, A = zahl(m.massA), wi = zahl(m.winkel), ab = zahl(m.abwicklung), rb = zahl(m.restBreite);
  if (!(A > 0)) f.push("Mass A fehlt oder ist nicht grösser als 0.");
  if (!(wi > 0 && wi < 180)) f.push(`Winkel ${m.winkel ?? "fehlt"}° ist nicht plausibel (nur zwischen 0° und 180°).`);
  if (!(ab > 0)) f.push("Abwicklung fehlt.");
  if (!(rb >= 0)) f.push("Restbreite fehlt oder ist negativ (Mass A und Umschläge sind grösser als die Abwicklung).");
  const um = ab - A - rb;
  if (Number.isFinite(um) && um < 0) f.push(`Mass A (${A}) + Restbreite (${rb}) sind grösser als die Abwicklung (${ab}).`);
  if (Number.isFinite(um) && um > 100) f.push(`Umschlag gesamt ${um} mm ist nicht plausibel.`);
  if (rb === 0) w.push("Restbreite ist 0 mm – für die Dachschräge bleibt nichts übrig.");
  const t = u.material.staerke_mm;
  if (t == null || !(t >= 0.2 && t <= 5)) f.push(`Blechstärke ${t ?? "fehlt"} mm fehlt oder ist nicht plausibel (0.2–5 mm).`);
  const st = Array.isArray(m.pieces) ? m.pieces.map((x, i) => {
    const l = zahl(x?.laenge);
    if (!(l > 0) || l > 20000) f.push(`Stück ${i + 1}: Länge ${x?.laenge} mm ist nicht plausibel.`);
    return { laenge_mm: l, winkel_grad: zahl(x?.winkel ?? 0) || 0, gehrung_links: !!x?.gehrungLinks, gehrung_rechts: !!x?.gehrungRechts };
  }) : [];
  if (!st.length) f.push("Keine Stücke erfasst.");
  if (st.some((x) => x.gehrung_links || x.gehrung_rechts)) w.push("Stücke mit Gehrung: die Gehrungsschnitte sind im Bauteil noch nicht umgesetzt (gerade Enden).");
  if (um >= 0 && um <= 100) w.push(`Umschlag oben/unten ist in der Aufnahme nicht gespeichert – je ${Math.round(um * 5) / 10} mm angenommen (Summe ${um} mm aus Abwicklung − Mass A − Restbreite).`);
  if (f.length) return null;
  return { schenkel: [], dicke_mm: t, mass_a_mm: A, winkel_grad: wi, rest_mm: rb, abwicklung_mm: ab, umschlag_mm: um / 2, stuecke: st, laengen_mm: [...new Set(st.map((x) => x.laenge_mm))], stueck: st.length };
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
    else if (u.art === "einlaufblech_gerade") cad = einlaufblech(u, f, w);
  }
  return { ok: f.length === 0, fehler: f, warnungen: w, cad: f.length ? null : cad };
}

// Kurzstatus für die Importliste.
export function status(u) {
  const p = pruefe(u);
  return { ...p, stufe: !p.ok ? "fehler" : !p.cad ? "ohneGenerator" : p.warnungen.length ? "warnung" : "bereit" };
}
