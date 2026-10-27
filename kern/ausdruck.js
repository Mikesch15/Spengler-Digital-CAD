// Spengler Digital CAD – Kern: Ausdrücke und Parameter (wie «Parameter ändern» in Fusion)
// Erlaubt: Zahlen (auch mit Komma), + − * / ^, Klammern, Parameternamen, Einheiten mm/cm/m/° (werden umgerechnet),
// Funktionsargumente mit «, » oder «;» trennen. Funktionen sqrt, abs, min, max, round, floor, ceil, sin/cos/tan (Grad), asin/acos/atan (Grad), pi.
// Kein eval – eigener Parser.

export class AusdruckFehler extends Error {}
const FUNK = {
  sqrt: Math.sqrt, abs: Math.abs, min: Math.min, max: Math.max, round: Math.round, floor: Math.floor, ceil: Math.ceil,
  sin: (g) => Math.sin((g * Math.PI) / 180), cos: (g) => Math.cos((g * Math.PI) / 180), tan: (g) => Math.tan((g * Math.PI) / 180),
  asin: (x) => (Math.asin(x) * 180) / Math.PI, acos: (x) => (Math.acos(x) * 180) / Math.PI, atan: (x) => (Math.atan(x) * 180) / Math.PI,
};
const EINHEIT = { mm: 1, cm: 10, m: 1000, "°": 1, deg: 1, grad: 1 };
export const NAME = /^[A-Za-z_ÄÖÜäöü][A-Za-z0-9_ÄÖÜäöü]*$/;

function zerlege(text) {
  const t = [], s = String(text).replace(/−/g, "-").replace(/×/g, "*").replace(/÷/g, "/");
  let i = 0;
  while (i < s.length) {
    const c = s[i];
    if (/\s/.test(c)) { i++; continue; }
    const zahl = /^(\d+(?:[.,]\d+)?\.?|\.\d+)(?:e[+-]?\d+)?/i.exec(s.slice(i)); // Komma nur mit Ziffer direkt dahinter als Dezimalzeichen
    if (zahl) { t.push({ z: parseFloat(zahl[0].replace(",", ".")) }); i += zahl[0].length; continue; }
    const wort = /^[A-Za-z_ÄÖÜäöü][A-Za-z0-9_ÄÖÜäöü]*/.exec(s.slice(i));
    if (wort) { t.push({ w: wort[0] }); i += wort[0].length; continue; }
    if ("+-*/^(),;°".includes(c)) { t.push({ o: c === ";" ? "," : c }); i++; continue; }
    throw new AusdruckFehler(`Unerwartetes Zeichen «${c}»`);
  }
  return t;
}

// Ausdruck auswerten. werte: Name → Zahl (oder Funktion name → Zahl, z. B. für Parameter in Abhängigkeitsreihenfolge)
export function rechne(text, werte = {}) {
  if (typeof text === "number") return text;
  const t = zerlege(text); let i = 0;
  const sieh = () => t[i], nimm = (o) => { if (t[i]?.o === o) { i++; return true; } return false; };
  const wert = (name) => {
    const v = typeof werte === "function" ? werte(name) : werte[name];
    if (v === undefined) throw new AusdruckFehler(`Unbekannter Parameter «${name}»`);
    return v;
  };
  function summe() { let v = produkt(); for (;;) { if (nimm("+")) v += produkt(); else if (nimm("-")) v -= produkt(); else return v; } }
  function produkt() { let v = potenz(); for (;;) { if (nimm("*")) v *= potenz(); else if (nimm("/")) { const d = potenz(); if (d === 0) throw new AusdruckFehler("Division durch 0"); v /= d; } else return v; } }
  function potenz() { const b = vorzeichen(); return nimm("^") ? b ** potenz() : b; }
  function vorzeichen() { if (nimm("-")) return -vorzeichen(); if (nimm("+")) return vorzeichen(); return einheit(atom()); }
  function einheit(v) { // «25 mm», «2 m», «30°»
    const n = sieh();
    if (n?.o === "°") { i++; return v; }
    if (n?.w && EINHEIT[n.w] && !(t[i + 1]?.o === "(")) { i++; return v * EINHEIT[n.w]; }
    return v;
  }
  function atom() {
    const n = t[i++];
    if (!n) throw new AusdruckFehler("Ausdruck ist unvollständig");
    if (n.z !== undefined) return n.z;
    if (n.o === "(") { const v = summe(); if (!nimm(")")) throw new AusdruckFehler("Klammer «)» fehlt"); return v; }
    if (n.w) {
      if (n.w === "pi") return Math.PI;
      if (FUNK[n.w] && nimm("(")) {
        const args = [summe()]; while (nimm(",")) args.push(summe());
        if (!nimm(")")) throw new AusdruckFehler("Klammer «)» fehlt");
        return FUNK[n.w](...args);
      }
      return wert(n.w);
    }
    throw new AusdruckFehler(`Unerwartet: «${n.o}»`);
  }
  const v = summe();
  if (i < t.length) throw new AusdruckFehler(`Unerwartet: «${t[i].o ?? t[i].w ?? t[i].z}»`);
  if (!Number.isFinite(v)) throw new AusdruckFehler("Ergebnis ist keine Zahl");
  return v;
}
export const istZahl = (text) => /^\s*[+-]?(\d+([.,]\d*)?|[.,]\d+)\s*$/.test(String(text));
export function namenIn(text) { try { return zerlege(text).filter((x) => x.w && !FUNK[x.w] && !EINHEIT[x.w] && x.w !== "pi").map((x) => x.w); } catch { return []; } }

// Parameterliste [{ name, ausdruck }] → { werte: {name: Zahl}, fehler: {name: Text} }; erkennt Zirkelbezüge
export function parameterWerte(liste) {
  const def = new Map(liste.map((p) => [p.name, p.ausdruck])), werte = {}, fehler = {}, unterwegs = new Set();
  const hole = (name) => {
    if (name in werte) return werte[name];
    if (!def.has(name)) return undefined;
    if (unterwegs.has(name)) throw new AusdruckFehler(`Zirkelbezug über «${name}»`);
    unterwegs.add(name);
    try { werte[name] = rechne(def.get(name), hole); } finally { unterwegs.delete(name); }
    return werte[name];
  };
  for (const p of liste) {
    if (!NAME.test(p.name)) { fehler[p.name] = "Name: Buchstaben, Ziffern, _ (nicht mit Ziffer beginnen)"; continue; }
    try { hole(p.name); } catch (e) { fehler[p.name] = e.message; }
  }
  return { werte, fehler };
}
