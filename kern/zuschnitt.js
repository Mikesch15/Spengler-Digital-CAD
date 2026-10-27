// Spengler Digital CAD – Kern: Materialbedarf eines Auftrags
// Je Material: Laufmeter je Spaltband bzw. Coil, Anzahl Tafeln (Streifen auf Tafeln verteilt).
// teile: [{ name, material: { name }, zuschnitt (mm), laenge (mm), stueck }], lager wie in materialien.js
import { quelle } from "./materialien.js";

// Streifen (b quer zur Tafel, l längs) regalweise auf Tafeln B × L legen, grösste zuerst.
// Schätzung für den Einkauf, kein optimaler Schachtelplan.
export function tafelnBelegen(streifen, [B, L]) {
  const offen = [...streifen].sort((x, y) => y.l - x.l || y.b - x.b);
  const tafeln = [];
  for (const s of offen) {
    let platz = null;
    for (const t of tafeln) {
      platz = t.regale.find((r) => r.l >= s.l && r.frei >= s.b);
      if (platz) break;
      if (t.restL >= s.l) { platz = { l: s.l, frei: B }; t.regale.push(platz); t.restL -= s.l; break; }
    }
    if (!platz) { const t = { regale: [], restL: L - s.l }; platz = { l: s.l, frei: B }; t.regale.push(platz); tafeln.push(t); }
    platz.frei -= s.b;
  }
  const flaeche = streifen.reduce((a, s) => a + s.b * s.l, 0);
  return { anzahl: tafeln.length, ausnutzung: tafeln.length ? flaeche / (tafeln.length * B * L) : 0 };
}

export function materialbedarf(teile, lager) {
  const jeMaterial = new Map();
  const eintrag = (name) => {
    if (!jeMaterial.has(name)) jeMaterial.set(name, { material: name, baender: new Map(), coil: null, tafeln: new Map(), ohne: [] });
    return jeMaterial.get(name);
  };
  for (const t of teile) {
    const stueck = Math.max(0, Math.round(t.stueck ?? 1));
    if (!stueck) continue;
    const e = eintrag(t.material.name), q = quelle(t.zuschnitt, lager);
    const lfm = (t.laenge / 1000) * stueck;
    if (!q) { e.ohne.push(`${t.name}: ${t.zuschnitt.toFixed(1)} mm breiter als alle Lagerformate`); continue; }
    if (q.art === "Spaltband") {
      const b = e.baender.get(q.breite) || { breite: q.breite, laufmeter: 0, stueck: 0 };
      b.laufmeter += lfm; b.stueck += stueck; e.baender.set(q.breite, b);
    } else if (q.art === "Coil") {
      e.coil ||= { breite: q.breite, laufmeter: 0, stueck: 0 };
      e.coil.laufmeter += lfm; e.coil.stueck += stueck;
    } else {
      if (t.laenge > q.laenge) { e.ohne.push(`${t.name}: ${t.laenge} mm länger als die Tafel ${q.breite} × ${q.laenge}`); continue; }
      const k = `${q.breite}×${q.laenge}`;
      const g = e.tafeln.get(k) || { format: [q.breite, q.laenge], streifen: [] };
      for (let i = 0; i < stueck; i++) g.streifen.push({ b: t.zuschnitt, l: t.laenge });
      e.tafeln.set(k, g);
    }
  }
  return [...jeMaterial.values()].map((e) => ({
    material: e.material,
    baender: [...e.baender.values()].sort((a, b) => a.breite - b.breite),
    coil: e.coil,
    tafeln: [...e.tafeln.values()].map((g) => ({ format: g.format, stueck: g.streifen.length, ...tafelnBelegen(g.streifen, g.format) })),
    ohne: e.ohne,
  }));
}
