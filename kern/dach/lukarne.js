// Spengler Digital CAD – Kern: Lukarne (Dachgaube) auf einer Dachfläche – Satteldach-, Schlepp- und Flachdachgaube
// Lokales System der Gaube: X quer zur Traufe, Y waagrecht den Hang hinauf (ab der Stirnwand), Z senkrecht; Ursprung auf der Dachoberfläche an der Stirnwand (Mitte).
import { flaechenRahmen } from "./koerper.js";
import { beschneide } from "./form.js";
import { lukarneAufmass } from "./lukarneAufmass.js";
const rad = (g) => (g * Math.PI) / 180, norm = (a) => { const l = Math.hypot(...a) || 1; return a.map((x) => x / l); };
export const LUKARNENARTEN = { sattel: "Satteldachgaube", schlepp: "Schleppgaube", flach: "Flachdachgaube" };
const innenPunkt = (poly, p) => { let v = 0; for (let i = 0; i < poly.length; i++) { const a = poly[i], b = poly[(i + 1) % poly.length], k = (b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0]); if (Math.abs(k) < 1e-6) continue; if (v && Math.sign(k) !== v) return false; v = Math.sign(k); } return true; };

// el: { art, b (Breite aussen), hw (Stirnwandhöhe), neigung (Gaubendach), ueberstand, x (Mitte quer ab linker Kante), y (Fusspunkt ab Traufe), wd (Wandstärke), dd (Dachstärke) }
export function lukarne(fl, el, oben = 0) {
  if (el.masse === "aufmass") return lukarneAufmass(fl, el, oben); // Aufmass: Front und Seitenwände einzeln gemessen
  const R = flaechenRahmen(fl), S = R.S, B = +el.b || 0, Hw = +el.hw || 0, U = +el.ueberstand || 0, art = el.art || "sattel", hinweise = [];
  if (!(B > 0 && Hw > 0)) throw new Error("Breite und Stirnhöhe müssen grösser als 0 sein");
  const run = Math.hypot(S.up[0], S.up[1]), tanM = S.up[2] / (run || 1e-9), cosM = run;
  if (tanM < 0.1) throw new Error("Die Dachfläche ist zu flach für eine Lukarne");
  const w = norm([S.up[0], S.up[1], 0]), q = [S.q[0], S.q[1], 0], sC = R.s0 + (+el.x || 0), tA = R.t0 + (+el.y || 0), C = S.punkt(sC, tA, oben);
  const P = (X, Y, Z) => [C[0] + X * q[0] + Y * w[0], C[1] + X * q[1] + Y * w[1], C[2] + Z];
  const td = Math.tan(rad(art === "flach" ? 0 : +el.neigung || 30)), n3 = (a) => norm(a);
  const wd = +el.wd || 150, dd = +el.dd || 250, formen = [], bleche = [], hoch = (poly) => poly.map(([X, Y, Z]) => P(X, Y, Z));
  let Ylast, valley = [], Yw; const idx = { front: -1, wange: {}, dach: [] }, flaps = [];
  if (art === "sattel") {
    const zR = Hw + (B / 2) * td, Ye = Hw / tanM, Yr = zR / tanM; Ylast = Yr;
    idx.front = formen.length; formen.push({ art: "front", punkte: hoch([[-B / 2, 0, 0], [B / 2, 0, 0], [B / 2, 0, Hw], [0, 0, zR], [-B / 2, 0, Hw]]), normale: n3(w.map((x) => -x)), dicke: -wd }); Yw = Ye;
    for (const sg of [-1, 1]) {
      idx.wange[sg] = formen.length; formen.push({ art: "wange", punkte: hoch([[sg * B / 2, 0, 0], [sg * B / 2, 0, Hw], [sg * B / 2, Ye, Hw]]), normale: n3(q.map((x) => sg * x)), dicke: -wd });
      // Dachfläche: Z = Hw + (B/2)·td + grad·X (fällt nach aussen), nur dort, wo sie über der Hauptdachfläche liegt (Z ≥ tanM·Y)
      const X0 = sg < 0 ? -B / 2 - U : 0, X1 = sg < 0 ? 0 : B / 2 + U, grad = sg < 0 ? td : -td, z0 = Hw + (B / 2) * td;
      const poly = beschneide([[X0, -U], [X1, -U], [X1, Yr + 2000], [X0, Yr + 2000]], [z0, grad, -tanM]);
      if (poly.length >= 3) {
        const pts = poly.map((p) => [p[0], p[1], z0 + grad * p[0]]);
        idx.dach.push(formen.length); formen.push({ art: "dach", punkte: hoch(pts), normale: n3([-grad * q[0], -grad * q[1], 1]), dicke: -dd });
        const auf = pts.filter((p) => Math.abs(p[2] - tanM * p[1]) < 1);
        if (auf.length >= 2) { const a = P(...auf[0]), b = P(...auf.at(-1)); valley.push({ a, b, form: formen.length - 1, laenge: Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]), steigung: (Math.atan2(Math.abs(auf[0][2] - auf.at(-1)[2]), Math.hypot(auf[0][0] - auf.at(-1)[0], auf[0][1] - auf.at(-1)[1])) * 180) / Math.PI }); }
      }
    }
    for (const v of valley) bleche.push({ art: "luk-kehle", name: "Lukarne Kehle", laenge: Math.round(v.laenge / 10) * 10, stueck: 1, neigung: Math.round(v.steigung * 2) / 2 || 20 });
    bleche.push({ art: "luk-wand", name: "Lukarne Wangenanschluss", laenge: Math.round((Ye * Math.hypot(1, tanM)) / 10) * 10, stueck: 2 }, { art: "luk-wand", name: "Lukarne Fussanschluss", laenge: Math.round(B / 10) * 10, stueck: 1 });
  } else {
    const Ys = Hw / (tanM - td); if (!(tanM > td + 0.01)) throw new Error("Die Neigung der Gaube muss kleiner sein als die der Dachfläche"); Ylast = Ys;
    idx.front = formen.length; formen.push({ art: "front", punkte: hoch([[-B / 2, 0, 0], [B / 2, 0, 0], [B / 2, 0, Hw], [-B / 2, 0, Hw]]), normale: n3(w.map((x) => -x)), dicke: -wd }); Yw = Ys;
    for (const sg of [-1, 1]) { idx.wange[sg] = formen.length; formen.push({ art: "wange", punkte: hoch([[sg * B / 2, 0, 0], [sg * B / 2, 0, Hw], [sg * B / 2, Ys, tanM * Ys]]), normale: n3(q.map((x) => sg * x)), dicke: -wd }); }
    const poly = beschneide([[-B / 2 - U, -U], [B / 2 + U, -U], [B / 2 + U, Ys], [-B / 2 - U, Ys]], [Hw, 0, td - tanM]);
    idx.dach.push(formen.length); formen.push({ art: "dach", punkte: hoch(poly.map((p) => [p[0], p[1], Hw + td * p[1]])), normale: n3([0, 0, 1].map((z, i) => (i === 2 ? 1 : -td * w[i]))), dicke: -dd });
    bleche.push({ art: "luk-wand", name: "Lukarne Wangenanschluss", laenge: Math.round((Ys * Math.hypot(1, tanM)) / 10) * 10, stueck: 2 }, { art: "luk-wand", name: "Lukarne Fussanschluss", laenge: Math.round(B / 10) * 10, stueck: 1 }, { art: "luk-wand", name: "Lukarne Anschluss oben", laenge: Math.round((B + 2 * U) / 10) * 10, stueck: 1 });
  }
  // Blechflächen auf den Flächen (Streifen entlang der Anschlusslinien) – die Eindeckung schneidet die Ziegel daran an
  const nM = S.n, Cc = P(0, Ylast / 2, 0), WB = 150, add3 = (a, b, k = 1) => a.map((x, i) => x + b[i] * k), un = (a) => norm(a), cr = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const mitte = (poly) => poly.reduce((m, p) => m.map((x, i) => x + p[i] / poly.length), [0, 0, 0]);
  const streifen = (a, b, e, wbr, normale, ziel, art, name) => { flaps.push({ art, name, punkte: [a, b, add3(b, e, wbr), add3(a, e, wbr)], normale, ziel }); };
  const seite = (a, b, nrm, zu) => { const d = un([b[0] - a[0], b[1] - a[1], b[2] - a[2]]), m = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2]; let e = un(cr(nrm, d)); const r = [zu[0] - m[0], zu[1] - m[1], zu[2] - m[2]]; if (e[0] * r[0] + e[1] * r[1] + e[2] * r[2] < 0) e = e.map((x) => -x); return e; };
  const gegen = (e) => e.map((x) => -x);
  const wandAnschl = (a, b, formI, name) => { const nF = formen[formI].normale; streifen(a, b, seite(a, b, nM, Cc).map((x) => -x), WB, nM, "haupt", "luk-wand", name + " (Dach)"); streifen(a, b, [0, 0, 1], WB, nF, formI, "luk-wand", name + " (Wand)"); };
  for (const v of valley) { streifen(v.a, v.b, gegen(seite(v.a, v.b, nM, Cc)), WB, nM, "haupt", "luk-kehle", "Kehle (Dach)"); streifen(v.a, v.b, seite(v.a, v.b, formen[v.form].normale, mitte(formen[v.form].punkte)), WB, formen[v.form].normale, v.form, "luk-kehle", "Kehle (Gaube)"); }
  for (const sg of [-1, 1]) wandAnschl(P(sg * B / 2, 0, 0), P(sg * B / 2, Yw, tanM * Yw), idx.wange[sg], "Wangenanschluss");
  { const a = P(-B / 2, 0, 0), b = P(B / 2, 0, 0); streifen(a, b, S.up.map((x) => -x), WB, nM, "haupt", "luk-wand", "Fussanschluss (Dach)"); streifen(a, b, [0, 0, 1], WB, formen[idx.front].normale, idx.front, "luk-wand", "Fussanschluss (Wand)"); }
  if (art !== "sattel") { const a = P(-B / 2 - U, Ylast, tanM * Ylast), b = P(B / 2 + U, Ylast, tanM * Ylast); streifen(a, b, S.up, WB, nM, "haupt", "luk-wand", "Anschluss oben (Dach)"); streifen(a, b, seite(a, b, formen[idx.dach[0]].normale, mitte(formen[idx.dach[0]].punkte)), WB, formen[idx.dach[0]].normale, idx.dach[0], "luk-wand", "Anschluss oben (Gaube)"); }
  // Fenster in der Stirnwand (Glasfläche)
  let fenster = null; if (el.fenster !== false) { const fw = Math.min(B - 500, B * 0.6), fh = Hw * 0.7, f0 = Hw * 0.12; fenster = { punkte: hoch([[-fw / 2, 0, f0], [fw / 2, 0, f0], [fw / 2, 0, f0 + fh], [-fw / 2, 0, f0 + fh]]), normale: n3(w.map((x) => -x)), b: fw, h: fh }; }
  const t1 = tA + Ylast / cosM, sa = sC - B / 2, sb = sC + B / 2, tE = tA + (Yw ?? Ylast) / cosM, ecken = [[sa, tA], [sb, tA], [sb, t1], [sa, t1]], poly = art === "sattel" ? [[sa, tA], [sb, tA], [sb, tE], [sC, t1], [sa, tE]] : ecken, innen = ecken.every((p) => R.stuecke.some((st) => innenPunkt(st, p)));
  if (!innen) hinweise.push("Die Lukarne ragt über den Rand der Dachfläche (First/Seite) – tiefer setzen, schmaler oder niedriger machen.");
  return { innen, hinweise, flaps, fenster, idx, rect: { s0: sa, s1: sb, t0: tA, t1, poly }, flaeche: Math.abs(poly.reduce((a, p, i) => { const q = poly[(i + 1) % poly.length]; return a + p[0] * q[1] - q[0] * p[1]; }, 0)) / 2 / 1e6, formen, bleche, firsthoehe: Math.max(...formen.flatMap((f) => f.punkte.map((p) => p[2]))) };
}
