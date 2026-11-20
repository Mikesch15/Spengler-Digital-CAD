// Spengler Digital CAD – CAD-Kern-Schnittstelle (unabhängig von OCCT/replicad)
//
// Grundsätze
// - Exakte B-Rep-Geometrie im Kern ist die einzige geometrische Wahrheit. Netze (tessellieren) dienen nur der Anzeige/Auswahl.
// - Ein- und Ausgaben sind reine Daten (JSON-fähig): so laufen dieselben Kommandos in Node, im Web Worker und in Tauri.
// - Körper werden nur über Kennungen ("k1", "k2" …) angesprochen; die UI hält nie Kernobjekte.
// - Einheiten: Längen mm, Winkel Grad, Flächen mm², Volumen mm³.
// - Fehler: KernFehler mit `code` (siehe CODES). Kein Kommando liefert stillschweigend einen ungültigen Körper:
//   Ergebnisse werden geprüft (BRepCheck) und sonst mit UNGUELTIG abgewiesen.
//
// Datenformate
//   Punkt / Richtung: [x, y, z]
//   Ebene:  { ursprung: [x,y,z], x: [..], n: [..] }     u-Achse = x, v-Achse = n × x
//           oder Name "XY" | "XZ" | "YZ" (XZ: u = x, v = z)
//   Profil: { start: [u,v], segmente: [{ bis: [u,v] } | { bis: [u,v], bogenMitte: [u,v] }] }  (geschlossen; bogenMitte = Punkt auf dem Bogen)
//   Pfad:   wie Profil, aber offen
//   Referenz auf Fläche/Kante (stabil über Signatur, siehe topologie.js):
//           { art: "flaeche"|"kante", typ, mitte: [x,y,z], normale?, laenge?, flaeche? }  oder  { punkt: [x,y,z] }
//
// Kommandos (op → Felder → Rückgabe)
//   quader      min, max                                  → { id }
//   zylinder    r, h, basis?, achse?                      → { id }
//   kegel       r1, r2, h, basis?, achse?                 → { id }
//   kugel       r, mitte?                                 → { id }
//   extrusion   profil, ebene?, hoehe, loecher?           → { id }
//   rotation    profil, ebene?, winkel, achse? {punkt, richtung}   (Standard: Ebene XZ, Achse Z) → { id }
//   sweep       pfad, ebene?, kreis? (Radius) | profil?   → { id }
//   loft        schnitte: [{ profil, ebene }], regelflaeche? → { id }
//   boolesch    art: vereinigen|abziehen|schneiden, a, b  → { id }       (a, b bleiben erhalten)
//   verrunden   ziel, r, kanten: [Referenz]               → { id }
//   fasen       ziel, d, kanten: [Referenz]               → { id }
//   bohrung     ziel, punkt, richtung, d, tiefe? | durch?, senkung? { d, winkel } → { id }
//   schale      ziel, dicke, offen: [Referenz]            → { id }
//   transformieren ziel, verschieben?, drehen? { winkel, punkt, achse }, spiegeln? { punkt, normale } → { id }
//   matrix      ziel, m: [12] (3×4, zeilenweise; Drehung, Verschiebung, Spiegelung) → { id }
//   muster      ziel, linear? { richtung, anzahl, abstand } | kreis? { punkt, achse, anzahl, winkel } → { id }
//   eigenschaften ziel  → { volumen, flaeche, schwerpunkt, grenzen, gueltig, geschlossen, anzahl }
//   ueberschneidung a, b → { volumen }   (Kollision; 0 = berühren sich höchstens)
//   abstand     a, b     → { abstand }   (kleinster Abstand, 0 = berühren/durchdringen)
//   topologie   ziel    → { flaechen: [Signatur], kanten: [Signatur] }
//   tessellieren ziel, toleranz?, winkel?  → { positionen, normalen, indizes, flaechen: [{ index, start, anzahl }], linien, kanten: [{ index, start, anzahl }] }
//   projektion  ziel, ansicht (front|back|top|bottom|left|right), verdeckt? → { sichtbar: [[x,y]...][], verdeckt, laengeSichtbar, laengeVerdeckt }
//   schnitt     ziel, ebene { punkt, normale }            → { flaeche, kanten: [[x,y,z]...][] }
//   stepExport  ziele                                     → { text }
//   stepImport  text                                      → { ids }
//   freigeben   ziele                                     → { frei }
//   speicher                                              → { handles, heapBytes }

export const SCHNITTSTELLE_VERSION = 1;

export const CODES = Object.freeze({
  EINGABE: "EINGABE",                   // Kommando unvollständig oder unsinnig (z. B. Radius ≤ 0)
  UNBEKANNT_ID: "UNBEKANNT_ID",         // Körperkennung existiert nicht (mehr)
  NICHT_UNTERSTUETZT: "NICHT_UNTERSTUETZT",
  FEHLGESCHLAGEN: "FEHLGESCHLAGEN",     // Kern hat die Operation nicht geschafft
  UNGUELTIG: "UNGUELTIG",               // Ergebnis wäre kein gültiger Körper – verworfen
  REFERENZ: "REFERENZ",                 // Fläche/Kante nicht (eindeutig) wiedergefunden
  NICHT_GELADEN: "NICHT_GELADEN",       // Kern (WASM) konnte nicht geladen werden
  ZEIT: "ZEIT",                         // Zeitüberschreitung (Worker)
  ABGEBROCHEN: "ABGEBROCHEN",           // vom Benutzer abgebrochen
});

export class KernFehler extends Error {
  constructor(code, nachricht, details) { super(nachricht); this.name = "KernFehler"; this.code = code; this.details = details; }
  toJSON() { return { code: this.code, nachricht: this.message, details: this.details }; }
  static aus(o) { return o instanceof KernFehler ? o : new KernFehler(o?.code || CODES.FEHLGESCHLAGEN, o?.nachricht || o?.message || String(o), o?.details); }
}

// Toleranzen – begründet:
//  laenge   1e-6 mm  : Vergleich exakter Längen (OCCT rechnet mit Precision::Confusion = 1e-7 Modelleinheiten)
//  referenz 1e-3 mm  : Wiederfinden von Kanten/Flächen über Signaturen (Rundung der Koordinaten)
//  netz     0.05 mm  : Sehnenabweichung der Anzeige-Netze – kleiner als eine Blechdicke von 0.5 mm / 10
//  volumenRel 1e-9   : exakte Rechnungen (GProp) gegen analytische Werte
export const TOLERANZ = Object.freeze({ laenge: 1e-6, referenz: 1e-3, netz: 0.05, winkelNetz: 0.3, volumenRel: 1e-9 });

const zahl = (v) => typeof v === "number" && Number.isFinite(v);
const punkt = (p) => Array.isArray(p) && p.length === 3 && p.every(zahl);
const fehler = (m) => { throw new KernFehler(CODES.EINGABE, m); };

// Leichte Prüfung der Kommandos vor dem Kern (Fehler früh und verständlich)
export function pruefeKommando(k) {
  if (!k || typeof k.op !== "string") fehler("Kommando ohne op");
  const pos = (n, w) => { if (!(zahl(w) && w > 0)) fehler(`${k.op}: ${n} muss grösser als 0 sein`); };
  switch (k.op) {
    case "quader": if (!punkt(k.min) || !punkt(k.max) || [0, 1, 2].some((i) => !(k.max[i] > k.min[i]))) fehler("quader: max muss in allen Achsen grösser als min sein"); break;
    case "zylinder": pos("r", k.r); pos("h", k.h); break;
    case "kegel": if (!(k.r1 >= 0 && k.r2 >= 0 && k.r1 + k.r2 > 0)) fehler("kegel: Radien ≥ 0, nicht beide 0"); pos("h", k.h); break;
    case "kugel": pos("r", k.r); break;
    case "extrusion": if (!k.profil?.segmente?.length) fehler("extrusion: Profil fehlt"); if (!zahl(k.hoehe) || k.hoehe === 0) fehler("extrusion: hoehe ≠ 0"); break;
    case "verrunden": pos("r", k.r); if (!k.kanten?.length) fehler("verrunden: keine Kanten"); break;
    case "fasen": pos("d", k.d); if (!k.kanten?.length) fehler("fasen: keine Kanten"); break;
    case "bohrung": pos("d", k.d); if (!k.durch) pos("tiefe", k.tiefe); if (!punkt(k.punkt) || !punkt(k.richtung)) fehler("bohrung: punkt und richtung nötig"); break;
    case "schale": pos("dicke", k.dicke); break;
    case "boolesch": if (!["vereinigen", "abziehen", "schneiden"].includes(k.art)) fehler("boolesch: art = vereinigen|abziehen|schneiden"); break;
  }
  return k;
}
