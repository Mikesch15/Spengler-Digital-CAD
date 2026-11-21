// Spengler Digital CAD – Kern: Elemente auf einer Dachfläche – Dachfenster (Velux) und Kamin mit Öffnung, Wechsel und Anschlussblechen
// Lage in der Fläche: x = Mitte quer ab linker Kante (in Blickrichtung zur Fläche, entlang der Traufe), y = Unterkante ab Traufe entlang der Fallinie.
import { flaechenRahmen } from "./koerper.js";

// Velux-Aussenmasse Blendrahmen (Datenblätter GGL/GGU); Eindeckrahmen und Dachöffnung je Deckung sind NICHT enthalten (noch offen)
export const VELUX_BREITEN = { BK: 472, CK: 550, FK: 660, MK: 780, PK: 942, SK: 1140, UK: 1340 };
export const VELUX_HOEHEN = { "02": 778, "04": 978, "06": 1178, "08": 1398, "10": 1600 };
const BESTAETIGT = new Set(["CK02", "CK04", "CK06", "FK06", "FK08", "MK04", "MK06", "MK08", "PK10", "SK06", "UK08"]);
export const veluxListe = () => Object.entries(VELUX_BREITEN).flatMap(([b, w]) => Object.entries(VELUX_HOEHEN).map(([h, hh]) => ({ code: b + h, b: w, h: hh, bestaetigt: BESTAETIGT.has(b + h) })));
export const ELEMENTARTEN = { fenster: "Dachfenster", kamin: "Kamin" };

const innenPunkt = (poly, p) => { let v = 0; for (let i = 0; i < poly.length; i++) { const a = poly[i], b = poly[(i + 1) % poly.length], k = (b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0]); if (Math.abs(k) < 1e-6) continue; if (v && Math.sign(k) !== v) return false; v = Math.sign(k); } return true; };
// Rechteck des Elements in (s, t) der Fläche und ob es ganz in der Fläche liegt
export function elementRechteck(fl, el) {
  const R = flaechenRahmen(fl), b = +el.b || 0, h = +el.h || 0, sa = R.s0 + (+el.x || 0) - b / 2, sb = sa + b, ta = R.t0 + (+el.y || 0), tb = ta + h;
  const ecken = [[sa, ta], [sb, ta], [sb, tb], [sa, tb]];
  return { R, s0: sa, s1: sb, t0: ta, t1: tb, name: el.name || ELEMENTARTEN[el.art], innen: ecken.every((p) => R.stuecke.some((st) => innenPunkt(st, p))) };
}
// 8 Ecken [u, v, h] (Index = n·4 + t·2 + s) für die 3D-Darstellung
export function elementKoerper(fl, el, oben) {
  const r = elementRechteck(fl, el), S = r.R.S;
  if (el.art === "kamin") {
    const unten = [[r.s0, r.t0], [r.s1, r.t0], [r.s0, r.t1], [r.s1, r.t1]].map(([s, t]) => S.punkt(s, t, oben)), zTop = Math.max(...unten.map((p) => p[2])) + (+el.hoehe || 1000);
    return { rect: r, ecken: [...unten, ...unten.map((p) => [p[0], p[1], zTop])] };
  }
  const e = []; for (const nn of [oben - 40, oben + 90]) for (const t of [r.t0, r.t1]) for (const s of [r.s0, r.s1]) e.push(S.punkt(s, t, nn));
  return { rect: r, ecken: e };
}
export const elementFlaeche = (el) => ((+el.b || 0) * (+el.h || 0)) / 1e6;
// Anschlussbleche des Kamins (Richtwerte): Fuss (Traufseite), zwei Seiten, Rückseite (Firstseite)
export function kaminBleche(el, dachSchenkel = 150) {
  const b = +el.b || 0, d = +el.h || 0, z = 2 * dachSchenkel;
  return [{ art: "kamin", name: "Kaminanschluss Fuss", laenge: Math.round((b + z) / 10) * 10, stueck: 1 }, { art: "kamin", name: "Kaminanschluss Seite", laenge: Math.round((d + dachSchenkel) / 10) * 10, stueck: 2 }, { art: "kamin", name: "Kaminanschluss Rückseite", laenge: Math.round((b + z) / 10) * 10, stueck: 1 }];
}
