// Richtung einer Extrusion/Länge: "eine" | "umgekehrt" | "symmetrisch" | "zwei:<Rückwärtsmass>" (zwei Seiten verschieden lang)
export const rueckVersatz = (richtung, tiefe) => richtung === "umgekehrt" ? tiefe : richtung === "symmetrisch" ? tiefe / 2 : typeof richtung === "string" && richtung.startsWith("zwei:") ? parseFloat(richtung.slice(5)) || 0 : 0;
// Gesamttiefe und wirksame Richtung eines Features; feld = Mass vorwärts, feld2 = Mass rückwärts (nur bei richtung "zwei")
export const zweiseitig = (f, feld, feld2) => f.richtung === "zwei" ? { tiefe: Math.abs(+f[feld] || 0) + Math.abs(+f[feld2] || 0), richtung: "zwei:" + Math.abs(+f[feld2] || 0) } : { tiefe: f[feld], richtung: f.richtung };
