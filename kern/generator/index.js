// Verteiler der Produktgeneratoren: Umschlag (kern/austausch.js) → Bauteile je Produktart.
import { erzeuge as freiesProfil, abweichungen } from "./freiesProfil.js";
import { erzeuge as einlaufblechGerade } from "./einlaufblechGerade.js";
export { abweichungen };

const GEN = { freies_profil: freiesProfil, einlaufblech_gerade: einlaufblechGerade };
export function erzeuge(umschlag) {
  const g = GEN[umschlag?.art];
  return g ? g(umschlag) : { ok: false, fehler: ["Kein Generator für diese Art."], warnungen: [], teile: [] };
}

// Neue Messwerte der App auf ein vorhandenes Bauteil anwenden. Zuordnung über Schlüssel (Länge + Gehrung), sonst über die Länge,
// sonst nur eindeutig bei einem Teil. Ergebnis: { ok, geaendert, neu, staerke, fehler[] } – ändert f nicht.
export function aktualisiereAusMessung(f, umschlag) {
  const r = erzeuge(umschlag);
  if (!r.ok) return { ok: false, geaendert: false, neu: null, fehler: r.fehler };
  const h = f.herkunft, t = (h?.schluessel && r.teile.find((x) => x.herkunft.schluessel === h.schluessel)) || r.teile.find((x) => x.laenge === h?.laenge && !h?.schluessel) || (r.teile.length === 1 && !h?.schluessel ? r.teile[0] : null);
  if (!t) return { ok: false, geaendert: false, neu: null, fehler: ["Dieses Bauteil kommt in der neuen Messung nicht mehr vor (Länge geändert oder Stück entfernt)."] };
  const gleich = JSON.stringify(t.herkunft.zeilen) === JSON.stringify(h.zeilen) && t.laenge === h.laenge && t.stueck === h.stueck && t.staerke === (h.staerke ?? t.staerke);
  return { ok: true, geaendert: !gleich, neu: { zeilen: t.zeilen, laenge: t.laenge, stueck: t.stueck, herkunft: t.herkunft }, staerke: t.staerke, fehler: [] };
}
