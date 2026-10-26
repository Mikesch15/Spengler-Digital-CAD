// Spengler Digital CAD – Kern: Stückliste eines Auftrags (Fläche, Gewicht, Laufmeter je Material)
// teile: [{ name, material: { name, t, dichte }, zuschnitt (mm), laenge (mm), stueck }]

export function stueckliste(teile) {
  const zeilen = teile.map((t) => {
    const stueck = Math.max(0, Math.round(t.stueck ?? 1));
    const flaeche = (t.zuschnitt * t.laenge) / 1e6 * stueck; // m²
    return {
      name: t.name, material: t.material.name, zuschnitt: t.zuschnitt, laenge: t.laenge, stueck,
      laufmeter: (t.laenge / 1000) * stueck,
      flaeche,
      gewicht: flaeche * t.material.t * (t.material.dichte ?? 0), // m² × mm = dm³
    };
  });
  const jeMaterial = new Map();
  for (const z of zeilen) {
    const s = jeMaterial.get(z.material) || { material: z.material, stueck: 0, laufmeter: 0, flaeche: 0, gewicht: 0 };
    s.stueck += z.stueck; s.laufmeter += z.laufmeter; s.flaeche += z.flaeche; s.gewicht += z.gewicht;
    jeMaterial.set(z.material, s);
  }
  const summe = zeilen.reduce((s, z) => ({ stueck: s.stueck + z.stueck, flaeche: s.flaeche + z.flaeche, gewicht: s.gewicht + z.gewicht }), { stueck: 0, flaeche: 0, gewicht: 0 });
  return { zeilen, jeMaterial: [...jeMaterial.values()], summe };
}

// CSV für Excel (Semikolon, Dezimalpunkt, mit BOM für Umlaute)
export function stuecklisteCsv(liste, kopf = []) {
  const feld = (v) => (typeof v === "number" ? String(+v.toFixed(3)) : /[;"\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : String(v));
  const zeile = (a) => a.map(feld).join(";");
  return "﻿" + [
    ...kopf.map(zeile),
    zeile(["Teil", "Material", "Zuschnitt mm", "Länge mm", "Stück", "Laufmeter m", "Fläche m²", "Gewicht kg"]),
    ...liste.zeilen.map((z) => zeile([z.name, z.material, +z.zuschnitt.toFixed(1), z.laenge, z.stueck, z.laufmeter, z.flaeche, z.gewicht])),
    "",
    zeile(["Summe je Material", "", "", "", "Stück", "Laufmeter m", "Fläche m²", "Gewicht kg"]),
    ...liste.jeMaterial.map((s) => zeile([s.material, "", "", "", s.stueck, s.laufmeter, s.flaeche, s.gewicht])),
  ].join("\r\n") + "\r\n";
}
