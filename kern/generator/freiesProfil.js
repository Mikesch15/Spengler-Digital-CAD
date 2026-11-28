// Produktgenerator «Freies Profil»: Import-Umschlag (kern/austausch.js) → Profil-Features für das CAD.
// Ein Feature je verschiedene Länge (Stück = Anzahl gleicher Segmente). Die Herkunft bleibt am Feature (`herkunft`),
// die Originalschenkel werden darin eingefroren, damit spätere CAD-Änderungen erkennbar sind (Messwert ≠ CAD-Parameter).
import { zeilenAusSchenkel } from "../cloud/appformat.js";
import { pruefe } from "../austausch.js";

export function erzeuge(umschlag) {
  const p = pruefe(umschlag);
  if (!p.ok || !p.cad) return { ok: false, fehler: p.ok ? ["Kein Generator für diese Art."] : p.fehler, warnungen: p.warnungen, teile: [] };
  const c = p.cad, zeilen = zeilenAusSchenkel(c.schenkel.map((s) => ({ laenge: s.laenge_mm, winkel: s.winkel_grad })));
  const gruppen = new Map();
  for (const l of c.laengen_mm.length ? c.laengen_mm : [null]) gruppen.set(l, (gruppen.get(l) || 0) + 1);
  const basis = umschlag.titel || "Freies Profil";
  const teile = [...gruppen].map(([laenge, stueck], i, a) => ({
    name: a.length > 1 ? `${basis} ${laenge ?? "?"} mm` : basis,
    zeilen: JSON.parse(JSON.stringify(zeilen)), laenge, stueck, staerke: c.dicke_mm,
    herkunft: { system: umschlag.quelle.system, messaufnahmeId: umschlag.quelle.id, projektId: umschlag.projekt.id, schema: umschlag.schema, version: umschlag.version,
      stand: umschlag.quelle.aktualisiert, zeilen: JSON.parse(JSON.stringify(zeilen)), laenge, stueck },
  }));
  return { ok: true, fehler: [], warnungen: p.warnungen, teile };
}

// Weicht das Bauteil von der Messung ab? → Liste der Änderungen (leer = identisch)
export function abweichungen(f) {
  const h = f?.herkunft; if (!h) return [];
  const d = [];
  if ((f.zeilen || []).length !== h.zeilen.length) d.push("Anzahl Schenkel");
  else f.zeilen.forEach((z, i) => { const o = h.zeilen[i];
    if (z.L !== o.L) d.push(`Schenkel ${i + 1}: ${o.L} → ${z.L} mm`);
    if ((z.winkel || 0) !== (o.winkel || 0)) d.push(`Winkel ${i + 1}: ${o.winkel}° → ${z.winkel}°`); });
  if (h.laenge != null && f.laenge !== h.laenge) d.push(`Länge: ${h.laenge} → ${f.laenge} mm`);
  return d;
}

// Neue Messwerte der App auf ein vorhandenes Bauteil anwenden. Zuordnung über die Länge (sonst nur eindeutig bei einem Teil).
// Ergebnis: { ok, geaendert, neu:{zeilen,laenge,stueck,herkunft}, fehler[] } – ändert f nicht.
export function aktualisiereAusMessung(f, umschlag) {
  const r = erzeuge(umschlag);
  if (!r.ok) return { ok: false, geaendert: false, neu: null, fehler: r.fehler };
  const h = f.herkunft, t = r.teile.find((x) => x.laenge === h?.laenge) || (r.teile.length === 1 ? r.teile[0] : null);
  if (!t) return { ok: false, geaendert: false, neu: null, fehler: ["Die Länge dieses Bauteils kommt in der neuen Messung nicht mehr vor."] };
  const gleich = JSON.stringify(t.herkunft.zeilen) === JSON.stringify(h.zeilen) && t.laenge === h.laenge && t.stueck === h.stueck && t.staerke === (h.staerke ?? t.staerke);
  return { ok: true, geaendert: !gleich, neu: { zeilen: t.zeilen, laenge: t.laenge, stueck: t.stueck, herkunft: t.herkunft }, fehler: [] };
}
