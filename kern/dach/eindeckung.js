// Spengler Digital CAD – Kern: Eindeckung mit einzelnen Ziegeln
// Erst werden die Spenglerbleche (Kehle, Wangen-/Fussanschluss, …) gezeichnet; die Eindeckung erkennt deren Flächen auf dem Dach
// und schneidet die Ziegel dort an. Ebenso an Öffnungen (Fenster, Kamin, Lukarne) und am Rand der Dachfläche.
import { flaechenRahmen } from "./koerper.js";
import { beschneide, flaecheVon } from "./form.js";
import { kantenEbenen } from "./fluegel.js";
const sub = (a, b) => a.map((x, i) => x - b[i]), dot = (a, b) => a.reduce((s, x, i) => s + x * b[i], 0);
// wie abziehen(), aber ohne Mindestfläche (Ziegelteile)
function abziehenKlein(poly, hps) {
  const out = []; let cur = poly;
  for (const g of hps) { const aussen = beschneide(cur, [-g[0], -g[1], -g[2]]); if (aussen.length >= 3 && Math.abs(flaecheVon(aussen)) > 1) out.push(aussen); cur = beschneide(cur, g); if (cur.length < 3) break; }
  return out;
}
const ccw = (p) => (flaecheVon(p) < 0 ? p.slice().reverse() : p.slice());

// fl: Dachfläche { punkte | stuecke, normale }; sperr: Polygone [[u, v, h] …] auf dieser Fläche (Blechflächen); ausschnitte: Rechtecke { s0, s1, t0, t1 }
export function eindeckung(fl, { deckung, sperr = [], ausschnitte = [], versatz = null }) {
  const R = flaechenRahmen(fl), S = R.S, lw = deckung.lattweite, db = deckung.deckbreite, ZL = Math.max(+deckung.ziegelLaenge || lw * 1.25, lw + 10), biber = versatz ?? /biber/.test(deckung.art || "");
  if (!(lw > 0 && db > 0)) throw new Error("Deckung braucht Lattweite und Deckbreite");
  const proj = (poly) => poly.map((p) => { const d = sub(p, S.o); return [dot(d, S.q), dot(d, S.up)]; });
  const sperren = [...sperr.map(proj), ...ausschnitte.map((a) => a.poly || [[a.s0, a.t0], [a.s1, a.t0], [a.s1, a.t1], [a.s0, a.t1]])].map(ccw).filter((p) => Math.abs(flaecheVon(p)) > 100);
  const stuecke = R.stuecke.map(ccw).map((b) => ({ hps: kantenEbenen(b), x0: Math.min(...b.map((p) => p[0])), x1: Math.max(...b.map((p) => p[0])), y0: Math.min(...b.map((p) => p[1])), y1: Math.max(...b.map((p) => p[1])) }));
  const sp = sperren.map((poly) => ({ hps: kantenEbenen(poly), x0: Math.min(...poly.map((p) => p[0])), x1: Math.max(...poly.map((p) => p[0])), y0: Math.min(...poly.map((p) => p[1])), y1: Math.max(...poly.map((p) => p[1])) }));
  const voll = (db - 3) * ZL, prismen = []; let geschnitten = 0, flaeche = 0; // Ziegel überlappen: Länge = Lattweite + Überdeckung
  for (let k = 0; R.t0 + k * lw < R.t1 - 30; k++) {
    const tlo = R.t0 + k * lw, thi = tlo + ZL, off = biber && k % 2 ? db / 2 : 0;
    for (let j = Math.floor((R.s0 - off) / db) - 1; R.s0 + off + j * db < R.s1; j++) {
      const a = R.s0 + off + j * db + 1.5, b = R.s0 + off + (j + 1) * db - 1.5; if (b < R.s0 || a > R.s1) continue;
      for (const st of stuecke) { // Ziegel ∩ Dachfläche (konvexes Stück), dann abzüglich der Blech- und Öffnungsflächen
        if (b < st.x0 || a > st.x1 || thi < st.y0 || tlo > st.y1) continue;
        let p = [[a, tlo], [b, tlo], [b, thi], [a, thi]];
        for (const hp of st.hps) { p = beschneide(p, hp); if (p.length < 3) break; }
        if (p.length < 3) continue;
        let teile = [p];
        for (const q of sp) { if (b < q.x0 || a > q.x1 || thi < q.y0 || tlo > q.y1) continue; teile = teile.flatMap((t) => abziehenKlein(t, q.hps)); }
        for (const t of teile) { const f = Math.abs(flaecheVon(t)); if (f < 0.12 * voll) continue; if (f < 0.97 * voll) geschnitten++; flaeche += f; prismen.push({ poly: t, tk: tlo }); }
      }
    }
  }
  return { prismen, anzahl: prismen.length, geschnitten, S, flaeche: flaeche / 1e6 };
}
// Ziegel liegt geneigt: oben an der Latte (Nase), unten auf dem Ziegel darunter (geschuppt). { unten, oben }: Ecken [u, v, h]
export function ziegelPrisma(S, z, D, deckung) {
  const lw = deckung.lattweite, ZL = Math.max(+deckung.ziegelLaenge || lw * 1.25, lw + 10), T = +deckung.ziegelT || +deckung.ziegelDicke || 20, Rh = (T * ZL) / lw;
  const unten = z.poly.map(([s, t]) => S.punkt(s, t, D.von + Rh * (1 - Math.min(1, Math.max(0, (t - z.tk) / ZL)))));
  return { unten, oben: z.poly.map(([s, t], i) => { const p = S.punkt(s, t, D.von + Rh * (1 - Math.min(1, Math.max(0, (t - z.tk) / ZL))) + T); return p; }) };
}
