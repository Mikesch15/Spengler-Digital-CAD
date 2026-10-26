// Spengler Digital CAD – Kern: Materialien und Lagerformate
// Startwerte – mit Probebiegungen an der eigenen Abkantbank kalibrieren.
// t = Blechdicke mm, ri = Innenradius mm, k = K-Faktor, dichte = kg/dm³

export const MATERIALIEN = [
  { id: "zink07", name: "Titanzink 0.70", t: 0.7, ri: 1.0, k: 0.4, dichte: 7.2 },
  { id: "kupfer06", name: "Kupfer 0.60", t: 0.6, ri: 0.8, k: 0.4, dichte: 8.93 },
  { id: "alu08", name: "Aluminium 0.80", t: 0.8, ri: 1.2, k: 0.38, dichte: 2.7 },
  { id: "alu10", name: "Aluminium 1.00", t: 1.0, ri: 1.5, k: 0.38, dichte: 2.7 },
  { id: "cns05", name: "Chromstahl 0.50", t: 0.5, ri: 1.0, k: 0.42, dichte: 7.9 },
  { id: "stahl06", name: "Stahl verzinkt 0.60", t: 0.6, ri: 1.0, k: 0.4, dichte: 7.85 },
];

// Lagerformate des Betriebs (mm)
export const TAFELN = [[1000, 2000], [1250, 2500], [1500, 3000]];
export const COIL = 1000;
export const SPALTBAENDER = [200, 250, 330, 400, 500, 670];

export const LAGER = { spaltbaender: SPALTBAENDER, coil: COIL, tafeln: TAFELN };

// Passende Quelle für eine Zuschnittbreite: kleinstes Spaltband, sonst Coil oder Tafel
export function quelle(zuschnitt, lager = LAGER) {
  const band = [...lager.spaltbaender].sort((a, b) => a - b).find((b) => b >= zuschnitt);
  if (band) return { art: "Spaltband", breite: band, rest: band - zuschnitt };
  if (lager.coil && zuschnitt <= lager.coil) return { art: "Coil", breite: lager.coil, rest: lager.coil - zuschnitt };
  const tafel = [...lager.tafeln].sort((a, b) => a[0] - b[0]).find(([b]) => b >= zuschnitt);
  if (tafel) return { art: "Tafel", breite: tafel[0], laenge: tafel[1], rest: tafel[0] - zuschnitt };
  return null;
}

// K-Faktor aus einer Probebiegung: Streifen mit Zuschnitt z, eine 90°-Biegung mit Innenradius ri,
// danach die beiden Schenkel aussen gemessen (a, b). Masse auf Blechmitte = aussen − t/2.
export function kFaktorAusProbe({ zuschnitt, a, b, t, ri }) {
  const rm = ri + t / 2;
  const l1 = a - t / 2, l2 = b - t / 2;
  const bogen = zuschnitt - (l1 - rm) - (l2 - rm); // Länge der neutralen Faser im Bogen
  return (bogen / (Math.PI / 2) - ri) / t;
}
