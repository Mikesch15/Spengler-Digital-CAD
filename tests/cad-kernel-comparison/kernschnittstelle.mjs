// Spengler Digital CAD – Kernvergleich: gemeinsame Schnittstelle für Geometrie-Kerne (Entwurf, Teil E)
//
// Regeln
// - Einheiten: Längen in mm, Winkel in Grad, Volumen in mm³ – an der Schnittstelle immer, egal was der Kern intern nutzt.
// - Ein «Körper» ist ein undurchsichtiges Handle des Kerns ({ kern, roh }); die Anwendung greift nie auf `roh` zu.
// - Darstellung (Three.js) bekommt nur das Ergebnis von netz(); ein Three.js-Mesh ist nie die exakte CAD-Quelle.
// - Fehler: immer KernFehler mit `code`:
//     NICHT_UNTERSTUETZT  der Kern kann das nicht (kein Ersatz, keine Näherung)
//     FEHLGESCHLAGEN      der Kern hat es versucht, aber kein Ergebnis geliefert
//     UNGUELTIG           Ergebnis vorhanden, aber Gültigkeitsprüfung schlägt fehl
// - Spenglerlogik (kern/*.js) hängt nicht von dieser Schnittstelle ab; sie liefert Profile/Pfade, der Kern baut daraus Körper.
//
// Profil (geschlossen, 2D in einer Ebene):
//   { start: [u, v], segmente: [ { bis: [u, v] } | { bis: [u, v], bogenMitte: [u, v] } ] }
//   bogenMitte = ein Punkt auf dem Bogen (Dreipunktbogen). Ebene "XY": u=x, v=y; Ebene "XZ": u=x, v=z.
//
// Methoden jedes Adapters (async erlaubt):
//   info() → { name, paket, version, lizenz }         laden()
//   quader(min, max)  zylinder(r, h)  kegel(r1, r2, h)
//   extrusion(profil, hoehe)                     Profil in XY, entlang +Z
//   rotation(profil, winkel)                     Profil in XZ (u = Radius), um die Z-Achse
//   sweep(profilKreisRadius, pfad)               Kreisprofil entlang eines offenen Pfads in XZ (Start im Ursprung, Richtung +Z)
//   loft(schnitte)                               schnitte: [{ profil, z }] in XY-Ebenen
//   nurbsFlaeche(raster)                         raster: Zeilen von [x, y, z]
//   vereinigen(a, b)  abziehen(a, b)  schneiden(a, b)
//   verrunden(k, r, punkt)  fasen(k, d, punkt)  Kanten, die durch `punkt` laufen
//   schnittkurve(a, b) → { kanten, laenge }
//   verschieben(k, [dx, dy, dz])  drehen(k, grad, punkt, achse)
//   volumen(k)  grenzen(k) → { min, max }  pruefen(k) → { gueltig, geschlossen, info }
//   stepExport(k) → Text  stepImport(text) → Körper
//   netz(k, toleranz) → { positionen: Float32Array, normalen, indizes, flaechen: [{ start, anzahl, id }] }

export class KernFehler extends Error {
  constructor(code, nachricht, details) { super(nachricht); this.code = code; this.details = details; }
}
export const nichtUnterstuetzt = (was, grund) => { throw new KernFehler("NICHT_UNTERSTUETZT", `${was}: ${grund}`); };

// Hilfen für Adapter
export function kreisMitte(a, m, b) { // Mittelpunkt des Kreises durch drei Punkte
  const d = 2 * (a[0] * (m[1] - b[1]) + m[0] * (b[1] - a[1]) + b[0] * (a[1] - m[1]));
  const q = (p) => p[0] * p[0] + p[1] * p[1];
  return [(q(a) * (m[1] - b[1]) + q(m) * (b[1] - a[1]) + q(b) * (a[1] - m[1])) / d, (q(a) * (b[0] - m[0]) + q(m) * (a[0] - b[0]) + q(b) * (m[0] - a[0])) / d];
}
export const gegenUhr = (a, m, b) => (m[0] - a[0]) * (b[1] - a[1]) - (m[1] - a[1]) * (b[0] - a[0]) > 0;
