// Spengler Digital CAD – Kern: Quetschfalte an der Ecke Stirnlasche + angrenzende Wand eines Blechprofils
// Die Stirnlasche (Schenkel A) und die Wand daneben (Schenkel B, über die Biegung am Schenkelende) stehen wie zwei Flansche auf der Fläche von Schenkel A;
// ihr Überschuss an der Ecke wird wie beim Flächenblech (kern/quetschfalte.js) an der Winkelhalbierenden 180° gefaltet.
import { quetschEckeFlach, quetschZuschnitt, faltenPruefen } from "./quetschfalte.js";
import { schenkelBereiche } from "./stirnflansch.js";

const D = Math.PI / 180, hyp = Math.hypot;
const kreuz = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]], sk = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const schnittGeraden = (p, d, q, e) => { const den = d[0] * e[1] - d[1] * e[0]; if (Math.abs(den) < 1e-9) return null; const t = ((q[0] - p[0]) * e[1] - (q[1] - p[1]) * e[0]) / den; return [p[0] + d[0] * t, p[1] + d[1] * t]; };

// Mögliche Ecken: Laschen mit einer Biegung, deren Nachbarschenkel eine einfache Wand (Endschenkel ohne weitere Biegung) ist und zur selben Seite abgekantet wird
export function stirnQuetschKandidaten(res, laschen) {
  const legs = schenkelBereiche(res), out = [];
  for (const l of laschen || []) {
    if (!l.einzel) continue;
    for (const seite of ["nach", "vor"]) {
      const bi = seite === "nach" ? l.nach : l.vor, nb = seite === "nach" ? legs[l.schenkel] : legs[l.schenkel - 2];
      if (!bi || !nb || (seite === "nach" ? nb.nach : nb.vor) || Math.sign(bi.winkel) !== Math.sign(l.einzel.winkel)) continue;
      out.push({ ende: l.ende, schenkel: l.schenkel, seite });
    }
  }
  return out;
}

// st = { ende: "S1"|"S2", schenkel, seite: "nach"|"vor" }, H = Länge des Profils (Abwicklungshöhe)
export function stirnQuetsch(res, laschen, st, H) {
  const legs = schenkelBereiche(res), nr = +st.schenkel, leg = legs[nr - 1], l = (laschen || []).find((x) => x.ende === st.ende && x.schenkel === nr), nach = st.seite !== "vor";
  if (!leg) throw new Error(`Schenkel ${nr} gibt es nicht mehr`);
  if (!l) throw new Error("Die Stirnlasche an diesem Schenkel fehlt");
  if (!l.einzel) throw new Error("Quetschfalte: die Lasche darf nur eine Biegung haben (z. B. ein einfacher Flansch)");
  const bi = nach ? l.nach : l.vor, nb = nach ? legs[nr] : legs[nr - 2];
  if (!bi || !nb) throw new Error("Quetschfalte: an dieser Seite des Schenkels gibt es keine Biegung zu einer Wand");
  if (nach ? nb.nach : nb.vor) throw new Error("Quetschfalte: die Wand neben der Lasche darf keine weitere Biegung haben");
  if (Math.sign(bi.winkel) !== Math.sign(l.einzel.winkel)) throw new Error("Quetschfalte: Lasche und Wand müssen zur selben Seite abgekantet sein");
  const phiW = Math.abs(bi.winkel), phiL = Math.abs(l.einzel.winkel), g = bi.g, Lb = nb.laenge, b1 = l.biegungen[0];
  const flWand = { abstand: g / 2, zugabe: g + Lb, phi: phiW }, flLasche = { abstand: b1.pos, zugabe: l.laenge, phi: phiL };
  const S1 = st.ende === "S1", V = [nach ? leg.s1 : leg.s0, S1 ? 0 : H];
  // Rolle der Flansche an der Ecke im ebenen Zuschnitt (Umriss gegen den Uhrzeiger, innen links)
  const tab = { "S1-nach": { dn: [0, 1], dp: [-1, 0], f1: "wand" }, "S1-vor": { dn: [1, 0], dp: [0, 1], f1: "lasche" }, "S2-nach": { dn: [-1, 0], dp: [0, -1], f1: "lasche" }, "S2-vor": { dn: [0, -1], dp: [1, 0], f1: "wand" } }[`${st.ende}-${nach ? "nach" : "vor"}`];
  const flach = quetschEckeFlach(V, tab.dn, tab.dp, tab.f1 === "wand" ? flWand : flLasche, tab.f1 === "wand" ? flLasche : flWand);
  // Räumliche Lage im Querschnittssystem des Profils (x, y = Querschnitt, z = Länge)
  const dA = [(leg.p2[0] - leg.p1[0]) / leg.laenge, (leg.p2[1] - leg.p1[1]) / leg.laenge], S = schnittGeraden(leg.p1, dA, nb.p1, [(nb.p2[0] - nb.p1[0]) / nb.laenge, (nb.p2[1] - nb.p1[1]) / nb.laenge]);
  if (!S) throw new Error("Quetschfalte: Schenkel und Wand sind parallel");
  const links = [-dA[1], dA[0]], sg = Math.sign(bi.winkel) || 1, Z3 = [links[0] * sg, links[1] * sg, 0];
  const rEnde = nach ? [-dA[0], -dA[1], 0] : [dA[0], dA[1], 0], rBiegung = S1 ? [0, 0, 1] : [0, 0, -1];
  const laschIst1 = sk(kreuz(rEnde, rBiegung), Z3) > 0; // Lasche liegt an Kante e1 (sonst die Wand)
  const X3 = laschIst1 ? rEnde : rBiegung, Y3 = kreuz(Z3, X3);
  const tangW = bi.rm * Math.tan(phiW * D / 2), tangL = l.einzel.rm * Math.tan(phiL * D / 2);
  const hW = Lb + tangW, hL = l.einzel.gerade + tangL;
  const [F1, F2] = laschIst1 ? [{ h: hL, phi: phiL }, { h: hW, phi: phiW }] : [{ h: hW, phi: phiW }, { h: hL, phi: phiL }];
  const zus = quetschZuschnitt(90, F1.h, F1.phi, F2.phi, null, F2.h), e = zus.geometrie.eps;
  const cot1 = Math.abs(e[1]) > 1e-9 ? e[0] / -e[1] : 0, cot2 = Math.abs(e[0]) > 1e-9 ? e[1] / -e[0] : 0; // Schnittebene durch die Ecklinie (Grundriss-Spur), senkrecht zur Fläche
  return { st, l, flach, zus, pruefung: faltenPruefen(zus), S, X3, Y3, Z3, tangW, tangL, us: tangL, laschIst1, cotLasche: laschIst1 ? cot1 : cot2, cotWand: laschIst1 ? cot2 : cot1,
    dA, wandRichtung: nach ? dA : [-dA[0], -dA[1]], sgIn: S1 ? 1 : -1, ende: st.ende, seite: nach ? "nach" : "vor", ri: Math.min(bi.rm, l.einzel.rm) };
}
