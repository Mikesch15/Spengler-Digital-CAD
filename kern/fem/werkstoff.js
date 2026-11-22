// Spengler Digital CAD – Kern: Festigkeitskennwerte der Blechwerkstoffe (Richtwerte, in den Einstellungen je Material überschreibbar)
// E-Modul und Rp0,2 in N/mm² (MPa), Querdehnzahl ν, Dichte in t/mm³ (7.85 kg/dm³ = 7.85e-9 t/mm³)
const TAB = [
  { s: /zink/i, E: 100000, nu: 0.3, rp: 110, rm: 160 },
  { s: /kupfer|cu/i, E: 120000, nu: 0.34, rp: 160, rm: 240 },
  { s: /alu/i, E: 70000, nu: 0.33, rp: 120, rm: 160 },
  { s: /chrom|cns|edelstahl|inox/i, E: 200000, nu: 0.3, rp: 230, rm: 540 },
  { s: /stahl|verzinkt|s\d{3}/i, E: 210000, nu: 0.3, rp: 250, rm: 330 },
];
export function werkstoff(m) {
  const t = TAB.find((x) => x.s.test(`${m?.id || ""} ${m?.name || ""}`)) || TAB.at(-1);
  const dichte = (+m?.dichte > 0 ? +m.dichte : 7.85) * 1e-9; // kg/dm³ → t/mm³
  return { E: +m?.emod > 0 ? +m.emod : t.E, nu: t.nu, rp: +m?.rp > 0 ? +m.rp : t.rp, rm: t.rm, dichte };
}
