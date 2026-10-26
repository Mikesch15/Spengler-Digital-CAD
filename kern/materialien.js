// Spengler Digital CAD – Kern: Materialien und Lagerformate
// Startwerte – mit Probebiegungen an der eigenen Abkantbank kalibrieren.
// t = Blechdicke mm, ri = Innenradius mm, k = K-Faktor

export const MATERIALIEN = [
  { id: "zink07", name: "Titanzink 0.70", t: 0.7, ri: 1.0, k: 0.4 },
  { id: "kupfer06", name: "Kupfer 0.60", t: 0.6, ri: 0.8, k: 0.4 },
  { id: "alu08", name: "Aluminium 0.80", t: 0.8, ri: 1.2, k: 0.38 },
  { id: "alu10", name: "Aluminium 1.00", t: 1.0, ri: 1.5, k: 0.38 },
  { id: "cns05", name: "Chromstahl 0.50", t: 0.5, ri: 1.0, k: 0.42 },
  { id: "stahl06", name: "Stahl verzinkt 0.60", t: 0.6, ri: 1.0, k: 0.4 },
];

// Lagerformate des Betriebs (mm)
export const TAFELN = [[1000, 2000], [1250, 2500], [1500, 3000]];
export const COIL = 1000;
export const SPALTBAENDER = [200, 250, 330, 400, 500, 670];

// Passende Quelle für eine Zuschnittbreite: kleinstes Spaltband, sonst Coil oder Tafel
export function quelle(zuschnitt) {
  const band = SPALTBAENDER.find((b) => b >= zuschnitt);
  if (band) return { art: "Spaltband", breite: band, rest: band - zuschnitt };
  if (zuschnitt <= COIL) return { art: "Coil", breite: COIL, rest: COIL - zuschnitt };
  const tafel = TAFELN.find(([b]) => b >= zuschnitt);
  if (tafel) return { art: "Tafel", breite: tafel[0], laenge: tafel[1], rest: tafel[0] - zuschnitt };
  return null;
}
