// Spengler Digital CAD – Kern: Maschinendaten der Biegesimulation (Schwenkbiegemaschinen) und Übernahme eines CAD-Profils.
// Es gibt KEINE erfundenen Standardwerte: Die Querschnitte von Unterwange, Oberwange und Biegewange pflegt der Betrieb
// (Einstellungen › Material & Lager › Biegemaschinen). Die Vorlagen unten tragen nur, was sicher bekannt ist (Typenschild);
// die Werkzeugquerschnitte der Schröder-Vorlage sind ungefähre Prospektwerte aus der Spengler-Digital-App und als «ungeprüft» markiert.
// Koordinaten (mm): Biegekante x = 0, Tischoberkante y = 0, y nach oben. Die Oberwange wird für die Blechstärke um t nach oben gesetzt.

// Schröder SPB 3200/3,0 – Typenschild: Maschinen-Nr. 310169, Leistung 3,0 mm bei Rm 400 N/mm², Baujahr 2009, 400 V, 9,0 kVA, 5600 kg
export const VORLAGE_SCHROEDER = Object.freeze({
  name: "Schröder SPB 3200/3,0 (Nr. 310169, Bj. 2009)", hersteller: "Hans Schröder Maschinenbau", typ: "SPB 3200/3,0",
  laenge_mm: 3200, leistung: "3,0 mm bei Rm 400 N/mm²", max_blech_mm: 3, min_klemm_mm: 10, max_winkel_auf: 145, toleranz_mm: 0.3, geprueft: false,
  hinweis: "Länge, Typ und Leistung vom Typenschild. Werkzeugquerschnitte: ungefähre Prospektwerte (Geissfussschiene ca. 130 mm hoch, 30°, Biegewange 10/25 mm) – an der Maschine nachmessen!",
  unterwange: [[[-320, 0], [0, 0], [-14, -60], [-40, -200], [-320, -200]]],
  klemmwange: [[[-50, 130], [-260, 130], [-260, 330], [-120, 330]]],
  oberwange_werkzeuge: [
    { name: "Scharf", teile: [[[0, 0], [-17, 10], [-48, 130], [-60, 130], [-60, 0]]] },
    { name: "Geissfuss", teile: [[[0, 0], [-17, 10], [-30, 14], [-30, 110], [-5, 118], [-5, 130], [-60, 130], [-60, 0]]] },
  ],
  biegewange_auf: { teile: [[[3, -60], [3, -3], [7, 0], [20, 0], [20, -60]]], achse: [0, 0] },
});
// Jorns Maxi-Line 150S SM CNC500-6: von der Maschine ist hier nur der Name bekannt (Länge «6» = 6 m laut Typbezeichnung, nicht geprüft).
export const VORLAGE_JORNS = Object.freeze({
  name: "Jorns Maxi-Line 150S SM CNC500-6", hersteller: "Jorns", typ: "Maxi-Line 150S SM CNC500-6",
  laenge_mm: 6000, min_klemm_mm: 10, max_winkel_auf: 145, toleranz_mm: 0.3, geprueft: false,
  hinweis: "Werkzeugquerschnitte fehlen: Unterwange, Oberwange und Biegewange nach Herstellerzeichnung eintragen oder von der Schröder-Maschine übernehmen und anpassen.",
  unterwange: [], klemmwange: [], oberwange_werkzeuge: [], biegewange_auf: { teile: [], achse: [0, 0] },
});
export const VORLAGEN = [VORLAGE_SCHROEDER, VORLAGE_JORNS];

export const neueMaschinenId = () => "m" + Date.now().toString(36) + Math.floor(Math.random() * 1e4).toString(36);
export const maschineAusVorlage = (v) => ({ ...JSON.parse(JSON.stringify(v)), id: neueMaschinenId() });

// Die Werkzeug-Querschnitte als bearbeitbarer Text (JSON) und zurück; Fehler werden als Text gemeldet
export function werkzeugeAlsText(m) {
  const o = { unterwange: m.unterwange || [], klemmwange: m.klemmwange || [], biegewange_auf: m.biegewange_auf || { teile: [], achse: [0, 0] } };
  if (Array.isArray(m.oberwange_werkzeuge) && m.oberwange_werkzeuge.length) o.oberwange_werkzeuge = m.oberwange_werkzeuge;
  return JSON.stringify(o, null, 1);
}
const polyOk = (p) => Array.isArray(p) && p.length >= 3 && p.every((q) => Array.isArray(q) && q.length === 2 && q.every((v) => Number.isFinite(+v)));
export function werkzeugeAusText(text) {
  let o; try { o = JSON.parse(text); } catch (e) { return { fehler: "Kein gültiges JSON: " + e.message }; }
  if (!o || typeof o !== "object") return { fehler: "Es wird ein Objekt mit unterwange, klemmwange und biegewange_auf erwartet." };
  const liste = (a, name) => { if (a == null) return []; if (!Array.isArray(a) || !a.every(polyOk)) throw new Error(`«${name}»: Liste von Polygonen, jedes mit mindestens 3 Punkten [x, y].`); return a.map((p) => p.map((q) => [+q[0], +q[1]])); };
  try {
    const r = { unterwange: liste(o.unterwange, "unterwange"), klemmwange: liste(o.klemmwange, "klemmwange") };
    const bw = o.biegewange_auf; r.biegewange_auf = { teile: liste(bw?.teile, "biegewange_auf.teile"), achse: Array.isArray(bw?.achse) && bw.achse.length === 2 ? bw.achse.map(Number) : [0, 0] };
    if (Array.isArray(o.oberwange_werkzeuge)) r.oberwange_werkzeuge = o.oberwange_werkzeuge.map((w, i) => ({ name: String(w?.name || "Werkzeug " + (i + 1)), teile: liste(w?.teile, `oberwange_werkzeuge[${i}].teile`) }));
    return { werte: r };
  } catch (e) { return { fehler: e.message }; }
}

// Maschinenzustand für die Anzeige: was fehlt noch?
export function maschineFehlt(m) {
  const f = [];
  if (!(+m?.laenge_mm > 0)) f.push("Arbeitslänge fehlt");
  if (!m?.unterwange?.length) f.push("Unterwange fehlt");
  if (!m?.klemmwange?.length && !(m?.oberwange_werkzeuge || []).some((w) => w.teile?.length)) f.push("Oberwange fehlt");
  if (!m?.biegewange_auf?.teile?.length) f.push("Biegewange fehlt");
  return f;
}

// CAD-Profil (Ergebnis von berechne(): schenkel = Mittellinienlängen, biegungen = Winkel in Grad, + = gegen den Uhrzeigersinn)
// → Schenkelliste der Biegesimulation (winkel = Drehung vor dem Schenkel, im Uhrzeigersinn positiv). Rundungen (tangentiale Bögen) sind keine Abkantungen.
export function schenkelAusProfil(res) {
  if (!res?.schenkel?.length) return { schenkel: [], hinweise: ["Das Profil hat keine Schenkel."] };
  const hinweise = [], bieg = res.biegungen || [];
  const schenkel = res.schenkel.map((L, i) => {
    if (i === 0) return { laenge: +L, winkel: 0 };
    const b = bieg[i - 1]; if (b?.art === "Rundung") hinweise.push(`Biegung ${i} ist eine Rundung – sie wird wie eine Abkantung behandelt.`);
    return { laenge: +L, winkel: b ? -b.winkel : 0 };
  });
  return { schenkel, hinweise };
}
