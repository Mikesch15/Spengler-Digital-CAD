// Spengler Digital CAD – Kern: Normlasten (Richtwerte nach SIA 261 / EN 1991, vereinfacht) und Lastkombinationen
// Alle Funktionen liefern Werte in N/mm² (Flächenlast) bzw. N (Einzellast). Die Eingaben sind vor dem Einsatz an der gültigen Norm zu prüfen.

export const kNm2 = (x) => x * 1e-3; // kN/m² → N/mm²

// Schneelast auf dem Dach: s_k nach Höhe ü. M. (SIA 261, vereinfacht), Formbeiwert μ nach Dachneigung
export function schneelast({ hoehe = 500, neigung = 0, ce = 1, ct = 1 } = {}) {
  const sk = hoehe >= 300 ? (1 + (hoehe / 350) ** 2) * 0.4 : 0.9, a = Math.abs(neigung), mu = a <= 30 ? 0.8 : a < 60 ? (0.8 * (60 - a)) / 30 : 0;
  const q = mu * ce * ct * sk; return { sk, mu, qk_kNm2: q, q: kNm2(q), text: `s_k = ${sk.toFixed(2)} kN/m² (h₀ = ${hoehe} m ü. M.), μ = ${mu.toFixed(2)} → q = ${q.toFixed(2)} kN/m²` };
}
// Windlast: Staudruck q_p (kN/m²) mal Aussendruckbeiwert c_p (positiv Druck, negativ Sog); Betrag in N/mm²
export function windlast({ qp = 0.9, cp = 0.8 } = {}) { const q = Math.abs(qp * cp); return { qk_kNm2: q, q: kNm2(q), sog: cp < 0, text: `q_p = ${qp.toFixed(2)} kN/m², c_p = ${cp.toFixed(2)} → w = ${q.toFixed(2)} kN/m² (${cp < 0 ? "Sog" : "Druck"})` }; }
// Einzellast Person/Montage auf nicht begehbaren Dächern: Q_k = 1.0 kN auf 100 × 100 mm
export const personenlast = ({ Q = 1000, seite = 100 } = {}) => ({ F: Q, flaeche: seite * seite, seite, text: `Einzellast ${(Q / 1000).toFixed(2)} kN auf ${seite} × ${seite} mm` });

export const BEIWERTE = { gammaG: 1.35, gammaQ: 1.5, psi0: { schnee: 0.6, wind: 0.6, nutzlast: 0.7, person: 0 } };

// Lastfälle: [{ id, name, art: "G" | "Q", psi0? }] → Kombinationen GZT (Tragsicherheit, ULS) und GZG (Gebrauchstauglichkeit, SLS)
export function kombinationen(lastfaelle, { gammaG = BEIWERTE.gammaG, gammaQ = BEIWERTE.gammaQ } = {}) {
  const G = lastfaelle.filter((l) => l.art === "G"), Q = lastfaelle.filter((l) => l.art !== "G"), out = [];
  const bilde = (name, art, gG, gQ, lead) => { const f = {}; for (const g of G) f[g.id] = gG; for (const q of Q) f[q.id] = gQ * (lead === null ? 1 : q === lead ? 1 : q.psi0 ?? 0.6); return { name, art, faktoren: f }; };
  if (!Q.length) { out.push(bilde("GZT: Eigengewicht", "GZT", gammaG, 0, null)); out.push(bilde("GZG: Eigengewicht", "GZG", 1, 0, null)); return out; }
  for (const q of Q) { out.push(bilde(`GZT: ${q.name} führend`, "GZT", gammaG, gammaQ, q)); out.push(bilde(`GZG: ${q.name} führend`, "GZG", 1, 1, q)); }
  return out;
}
