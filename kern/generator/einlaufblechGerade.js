// Produktgenerator «Einlaufblech gerade»: Profil Umschlag unten · Mass A · Biegung (180° − Winkel) · Restbreite · Umschlag oben,
// ein Feature je verschiedene Stücklänge (Stück = Anzahl). Vorzeichen: Umschlag unten rechts, Biegung rechts, Umschlag oben links
// (wie die Schnittzeichnung der App, js/11). Stücke mit Gehrung sind eigene Teile (Schlüssel), die Gehrung selbst ist noch nicht modelliert.
import { pruefe } from "../austausch.js";

export function erzeuge(umschlag) {
  const p = pruefe(umschlag);
  if (!p.ok || !p.cad) return { ok: false, fehler: p.ok ? ["Kein Generator für diese Art."] : p.fehler, warnungen: p.warnungen, teile: [] };
  const c = p.cad, u = c.umschlag_mm, zeilen = [
    { L: u, winkel: -180, art: "umschlag" },
    { L: c.mass_a_mm, winkel: -(180 - c.winkel_grad), art: "abkanten" },
    { L: c.rest_mm, winkel: 180, art: "umschlag" },
    { L: u, winkel: 0, art: "abkanten" },
  ];
  const gruppen = new Map();
  for (const s of c.stuecke) {
    const key = `${s.laenge_mm}|${s.gehrung_links ? "L" : ""}${s.gehrung_rechts ? "R" : ""}`;
    gruppen.set(key, { ...s, n: (gruppen.get(key)?.n || 0) + 1 });
  }
  const basis = umschlag.titel || "Einlaufblech";
  const teile = [...gruppen].map(([schluessel, g]) => {
    const gehr = (g.gehrung_links ? " Gehrung links" : "") + (g.gehrung_rechts ? " Gehrung rechts" : "");
    return {
      name: `${basis} ${g.laenge_mm} mm${gehr}`, zeilen: JSON.parse(JSON.stringify(zeilen)), laenge: g.laenge_mm, stueck: g.n, staerke: c.dicke_mm,
      notiz: gehr ? `Gehrung noch nicht modelliert:${gehr}.` : "",
      herkunft: { system: umschlag.quelle.system, messaufnahmeId: umschlag.quelle.id, projektId: umschlag.projekt.id, schema: umschlag.schema, version: umschlag.version,
        stand: umschlag.quelle.aktualisiert, art: umschlag.art, schluessel, staerke: c.dicke_mm, zeilen: JSON.parse(JSON.stringify(zeilen)), laenge: g.laenge_mm, stueck: g.n },
    };
  });
  return { ok: true, fehler: [], warnungen: p.warnungen, teile };
}
