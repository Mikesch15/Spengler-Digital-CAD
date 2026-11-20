// Spengler Digital CAD – Topologie-Referenzen (rein, ohne Kern)
// OCCT kennt keine dauerhaften Namen für Flächen/Kanten: nach jeder Änderung entstehen neue Objekte.
// Darum werden Flächen und Kanten über eine geometrische Signatur angesprochen (Typ, Mittelpunkt, Normale/Richtung, Mass)
// und nach einer Änderung über die ähnlichste Signatur wiedergefunden. Grenze: Wird ein Element stark verschoben oder
// zerfällt es in mehrere, ist die Zuordnung nicht eindeutig → Fehler REFERENZ statt einer stillen Falschzuordnung.
import { KernFehler, CODES, TOLERANZ } from "./schnittstelle.js";

const r = (v, s = 1e-4) => Math.round(v / s) * s;
const rp = (p) => p.map((v) => +r(v).toFixed(4));
const abst = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

// Signatur aus vom Kern gelieferten Rohdaten
export function flaechenSignatur(index, { typ, mitte, normale, flaeche }) {
  return { art: "flaeche", index, typ, mitte: rp(mitte), normale: normale ? rp(normale) : null, flaeche: +r(flaeche).toFixed(4) };
}
export function kantenSignatur(index, { typ, mitte, start, ende, laenge }) {
  const d = [ende[0] - start[0], ende[1] - start[1], ende[2] - start[2]], l = Math.hypot(...d);
  return { art: "kante", index, typ, mitte: rp(mitte), start: rp(start), ende: rp(ende), laenge: +r(laenge).toFixed(4), richtung: typ === "LINE" && l > 0 ? rp(d.map((v) => v / l)) : null };
}

// Abweichung zwischen Referenz und Kandidat (mm-ähnliches Mass):
//  Gerade ↔ Gerade: Abstand der Trägergeraden + Richtungsabweichung (bleibt bei Längenänderung gleich)
//  Ebene ↔ Ebene:   Abstand der Trägerebenen + Normalenabweichung (bleibt bei Verschiebung in der Ebene gleich)
//  sonst:           Abstand der Mittelpunkte
function abweichung(ref, s) {
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  if (ref.art === "kante" && ref.richtung && s.richtung) {
    const par = Math.abs(dot(ref.richtung, s.richtung));
    const w = [ref.mitte[0] - s.mitte[0], ref.mitte[1] - s.mitte[1], ref.mitte[2] - s.mitte[2]], a = dot(w, s.richtung);
    const quer = Math.hypot(w[0] - a * s.richtung[0], w[1] - a * s.richtung[1], w[2] - a * s.richtung[2]);
    return quer + (1 - par) * 100 + Math.abs(a) * 1e-3; // längs nur schwach gewichtet (eindeutig bei mehreren Kanten auf einer Geraden)
  }
  if (ref.art === "flaeche" && ref.normale && s.normale) {
    const w = [ref.mitte[0] - s.mitte[0], ref.mitte[1] - s.mitte[1], ref.mitte[2] - s.mitte[2]];
    return Math.abs(dot(w, s.normale)) + abst(ref.normale, s.normale) * 100 + abst(ref.mitte, s.mitte) * 1e-3;
  }
  return abst(s.mitte, ref.mitte);
}

// Referenz auflösen: liefert Indizes der passenden Elemente in `liste` (Signaturen desselben Körpers)
//   { punkt }                → alle Elemente, deren Mittelpunkt oder Endpunkte (Kante) bzw. Mitte (Fläche) dort liegen – sonst über Kern
//   Signatur (art/typ/mitte) → das eine Element mit gleichem Typ und kleinster Abweichung; mehrdeutig/zu weit → Fehler
export function aufloesen(ref, liste, { toleranz = 0.5 } = {}) {
  const kand = liste.filter((s) => s.art === ref.art && (!ref.typ || s.typ === ref.typ));
  if (!kand.length) throw new KernFehler(CODES.REFERENZ, `Keine ${ref.art === "kante" ? "Kante" : "Fläche"} vom Typ ${ref.typ ?? "?"} vorhanden`);
  const sortiert = kand.map((s) => [abweichung(ref, s), s]).sort((a, b) => a[0] - b[0]);
  const [d0, best] = sortiert[0];
  if (d0 > toleranz) throw new KernFehler(CODES.REFERENZ, `${ref.art === "kante" ? "Kante" : "Fläche"} nicht mehr gefunden (nächste Abweichung ${d0.toFixed(2)} mm)`, { ref });
  if (sortiert[1] && sortiert[1][0] - d0 < TOLERANZ.referenz) throw new KernFehler(CODES.REFERENZ, "Referenz ist nicht eindeutig", { ref });
  return best.index;
}
