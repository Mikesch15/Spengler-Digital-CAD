// Richtung einer Extrusion/Länge: "eine" | "umgekehrt" | "symmetrisch" | "zwei:<Rückwärtsmass>" (zwei Seiten verschieden lang)
export const rueckVersatz = (richtung, tiefe) => richtung === "umgekehrt" ? tiefe : richtung === "symmetrisch" ? tiefe / 2 : typeof richtung === "string" && richtung.startsWith("zwei:") ? parseFloat(richtung.slice(5)) || 0 : 0;
// Gesamttiefe und wirksame Richtung eines Features; feld = Mass vorwärts, feld2 = Mass rückwärts (nur bei richtung "zwei")
// Negatives Mass bei einer Seite = Gegenrichtung (eine ⇄ umgekehrt); bei «zwei» zählen beide Beträge
export const zweiseitig = (f, feld, feld2) => {
  const v = +f[feld] || 0;
  if (f.richtung === "zwei") { const w = Math.abs(+f[feld2] || 0); return { tiefe: Math.abs(v) + w, richtung: "zwei:" + w }; }
  return { tiefe: Math.abs(v), richtung: v < 0 ? (f.richtung === "umgekehrt" ? "eine" : f.richtung === "symmetrisch" ? "symmetrisch" : "umgekehrt") : f.richtung };
};
// Wirksame Länge eines Teils (Summe beider Seiten, Betrag)
export const laengeVon = (f) => (f.richtung === "zwei" ? Math.abs(+f.laenge || 0) + Math.abs(+f.laenge2 || 0) : Math.abs(+f.laenge || 0));
