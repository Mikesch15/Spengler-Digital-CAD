// Kurzschrift für Kantenoperationen mit Parametern – Port von spengler_cad/core/short_syntax.py
// «90 25 U+ 7»; Schenkel/Winkel/Radius dürfen Parameternamen oder Ausdrücke ohne Leerzeichen sein: «90 H U+ u+4*t», «{w} H».
import { rechne, AusdruckFehler } from "../ausdruck.js";

export class KurzschriftFehler extends Error {}
const WINKEL = /^(U[+-]?|[+-]?\d+(?:[.,]\d+)?|\{[^{}]+\})(?:r(.+))?$/i, ZAHL = /^[+-]?\d+(?:[.,]\d+)?$/;
const zahlOderAusdruck = (s) => { s = s.trim(); return ZAHL.test(s) ? parseFloat(s.replace(",", ".")) : s; };

// Kurzschrift → Operationen: { typ: "flansch"|"umschlag", winkel, laenge, radius } (Werte Zahl oder Ausdruckstext, Umschlag ±180)
export function zerlege(text) {
  const t = String(text).replace(/−/g, "-").trim().split(/[\s;]+/).filter(Boolean);
  if (!t.length) throw new KurzschriftFehler("Die Abkantfolge ist leer.");
  if (t.length % 2) throw new KurzschriftFehler("Je Biegung braucht es einen Winkel und eine Schenkellänge, z. B. «90 25 U+ 7».");
  const ops = [];
  for (let i = 0; i < t.length; i += 2) {
    const m = WINKEL.exec(t[i]);
    if (!m) throw new KurzschriftFehler(`«${t[i]}» ist kein Winkel (Zahl, U+, U- oder {Ausdruck}).`);
    const w = m[1], umschlag = w.toUpperCase().startsWith("U");
    const winkel = umschlag ? (w.endsWith("-") ? -180 : 180) : w.startsWith("{") ? w.slice(1, -1).trim() : parseFloat(w.replace(",", "."));
    const laenge = zahlOderAusdruck(t[i + 1]);
    if (typeof laenge === "number" && laenge <= 0) throw new KurzschriftFehler(`«${t[i + 1]}» ist keine gültige Schenkellänge (muss grösser als 0 sein).`);
    ops.push({ typ: umschlag ? "umschlag" : "flansch", winkel, laenge, radius: m[2] ? zahlOderAusdruck(m[2]) : null });
  }
  return ops;
}
const txt = (v) => { if (typeof v === "number") { v = +v.toFixed(3); return String(v); } return String(v); };
const negativ = (w) => (typeof w === "number" && w < 0) || (typeof w === "string" && w.trim().startsWith("-"));
// Operationen → Kurzschrift (Umkehrung von zerlege)
export function alsText(ops) {
  return ops.flatMap((op) => {
    let w = op.typ === "umschlag" ? (negativ(op.winkel) ? "U-" : "U+") : typeof op.winkel === "string" ? `{${op.winkel}}` : txt(op.winkel);
    if (op.radius !== null && op.radius !== undefined && op.radius !== "") w += "r" + txt(op.radius);
    return [w, txt(op.laenge)];
  }).join(" ");
}
// Ausdrücke mit Parameterwerten (mm/Grad, inkl. t, ri, k) berechnen → nur Zahlen
export function aufloesen(ops, werte) {
  return ops.map((op, i) => {
    try {
      let w = rechne(op.winkel, werte); const L = rechne(op.laenge, werte), r = op.radius === null || op.radius === "" || op.radius === undefined ? null : rechne(op.radius, werte);
      if (op.typ === "umschlag") w = w < 0 ? -180 : 180;
      const d = { typ: op.typ, winkel: w, laenge: L, radius: r };
      for (const f of ["bezug", "lage"]) if (op[f]) d[f] = op[f];
      return d;
    } catch (e) { if (e instanceof AusdruckFehler) throw new KurzschriftFehler(`Schritt ${i + 1}: ${e.message}`); throw e; }
  });
}
