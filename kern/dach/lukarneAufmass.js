// Spengler Digital CAD – Kern: Lukarne nach Aufmass (so, wie der Spengler sie am Objekt misst)
// Front: Breite unten, Breite oben, Höhe. Jede Seitenwand (links, rechts unabhängig): vordere Höhe, Winkel oben an der vorderen Höhe zur Traufe der Lukarne, Trauflänge.
// Das entspricht der Massaufnahmeart «Lukarne Seitenwand» der Spengler-App: Dreieck aus vorderer Höhe, Winkel und Trauflänge; die Unterkante liegt auf der Dachfläche.
// Lokales System: X quer (links −, rechts +, Blick auf die Front von aussen), Y waagrecht den Hang hinauf ab der Front, Z senkrecht; Ursprung auf der Dachfläche in der Mitte der Front.
import { flaechenRahmen } from "./koerper.js";
import { beschneide } from "./form.js";
const rad = (g) => (g * Math.PI) / 180, norm = (a) => { const l = Math.hypot(...a) || 1; return a.map((x) => x / l); };
const sub = (a, b) => a.map((x, i) => x - b[i]), add = (a, b) => a.map((x, i) => x + b[i]), mul = (a, k) => a.map((x) => x * k), dot = (a, b) => a.reduce((s, x, i) => s + x * b[i], 0);
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]], len = (a) => Math.hypot(...a);
const innenPunkt = (poly, p) => { let v = 0; for (let i = 0; i < poly.length; i++) { const a = poly[i], b = poly[(i + 1) % poly.length], k = (b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0]); if (Math.abs(k) < 1e-6) continue; if (v && Math.sign(k) !== v) return false; v = Math.sign(k); } return true; };
// Ebene Z = a + b·X + c·Y durch drei Punkte
function ebene3(p, q, r) {
  const u = sub(q, p), v = sub(r, p), det = u[0] * v[1] - u[1] * v[0]; if (Math.abs(det) < 1e-9) throw new Error("Die Dachfläche der Lukarne ist nicht eindeutig (Punkte in einer Linie)");
  const b = (u[2] * v[1] - v[2] * u[1]) / det, c = (u[0] * v[2] - v[0] * u[2]) / det; return { a: p[2] - b * p[0] - c * p[1], b, c };
}
const hull = (pts) => { const P = pts.slice().sort((x, y) => x[0] - y[0] || x[1] - y[1]), cr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]), h = [];
  for (const p of P) { while (h.length >= 2 && cr(h.at(-2), h.at(-1), p) <= 0) h.pop(); h.push(p); } const n = h.length;
  for (let i = P.length - 2; i >= 0; i--) { const p = P[i]; while (h.length > n && cr(h.at(-2), h.at(-1), p) <= 0) h.pop(); h.push(p); } h.pop(); return h; };

export function lukarneAufmass(fl, el, oben = 0) {
  const R = flaechenRahmen(fl), S = R.S, bu = +el.bu || 0, bo = +el.bo || bu, hf = +el.hf || 0, art = el.art || "sattel", hinweise = [], wd = +el.wd || 150, dd = +el.dd || 250;
  if (!(bu > 0 && bo > 0 && hf > 0)) throw new Error("Breite unten, Breite oben und Höhe der Front müssen grösser als 0 sein");
  const run = Math.hypot(S.up[0], S.up[1]), tanM = S.up[2] / (run || 1e-9), cosM = run;
  if (tanM < 0.1) throw new Error("Die Dachfläche ist zu flach für eine Lukarne");
  const w = norm([S.up[0], S.up[1], 0]), q = [S.q[0], S.q[1], 0], sC = R.s0 + (+el.x || 0), tA = R.t0 + (+el.y || 0), C0 = S.punkt(sC, tA, oben);
  const P = (X, Y, Z) => [C0[0] + X * q[0] + Y * w[0], C0[1] + X * q[1] + Y * w[1], C0[2] + Z], V = (v) => [v[0] * q[0] + v[1] * w[0], v[0] * q[1] + v[1] * w[1], v[2]], hoch = (poly) => poly.map(([X, Y, Z]) => P(X, Y, Z));
  const seiten = { [-1]: { h: +el.hL || hf, phi: el.wL ?? 90, L: +el.lL || 0, name: "links" }, 1: { h: +el.hR || hf, phi: el.wR ?? 90, L: +el.lR || 0, name: "rechts" } };
  const info = {}, Bp = {}, Ap = {}, Cp = {}, Ep = {};
  for (const sg of [-1, 1]) {
    const s = seiten[sg]; if (!(s.h > 0)) throw new Error(`Vordere Höhe ${s.name} muss grösser als 0 sein`); if (!(s.L > 0)) throw new Error(`Trauflänge ${s.name} muss grösser als 0 sein`);
    const A = [sg * bu / 2, 0, 0], B = [sg * bo / 2, 0, s.h], p = norm(sub(A, B)), ph = rad(s.phi), d = add(mul(p, Math.cos(ph)), mul([0, 1, 0], Math.sin(ph))), C = add(B, mul(d, s.L));
    const dz = d[2] - tanM * d[1]; let E = null, lCalc = null; if (dz < -1e-9) { const t = (tanM * B[1] - B[2]) / dz; if (t > 0) { E = add(B, mul(d, t)); lCalc = t; } }
    if (!E) throw new Error(`Seitenwand ${s.name}: Die Traufe steigt stärker als das Dach – sie trifft die Dachfläche nie (Winkel/Höhe prüfen)`);
    Ap[sg] = A; Bp[sg] = B; Cp[sg] = C; Ep[sg] = E;
    const dev = C[2] - tanM * C[1]; if (Math.abs(lCalc - s.L) > 10) hinweise.push(`Seitenwand ${s.name}: gemessene Trauflänge ${s.L.toFixed(0)} mm, aus der Dachfläche ${lCalc.toFixed(0)} mm (Abweichung ${(s.L - lCalc).toFixed(0)} mm, Ende ${dev > 0 ? "über" : "unter"} dem Dach) – Masse prüfen`);
    info[sg] = { schraege: len(sub(C, A)), tiefe: C[1], flaeche: len(cross(sub(B, A), sub(C, A))) / 2 / 1e6, lBerechnet: lCalc, abweichung: s.L - lCalc };
  }
  // Dachflächen der Lukarne
  const td = Math.tan(rad(art === "flach" ? 0 : +el.neigung || 30)), mitte = [(Bp[-1][0] + Bp[1][0]) / 2, 0, (Bp[-1][2] + Bp[1][2]) / 2];
  const PK = [mitte[0], 0, mitte[2] + ((Bp[1][0] - Bp[-1][0]) / 2) * td];
  const ebenen = art === "sattel" ? { [-1]: ebene3(Bp[-1], Ep[-1], PK), 1: ebene3(Bp[1], Ep[1], PK) } : { 0: art === "flach" ? ebene3(Bp[-1], Bp[1], add(Bp[-1], [0, 1000, 0])) : ebene3(Bp[-1], Bp[1], Ep[-1]) };
  const k = { [-1]: (Bp[-1][0] - Ap[-1][0]) / seiten[-1].h, 1: (Bp[1][0] - Ap[1][0]) / seiten[1].h }, Xb = Math.max(bu, bo) * 3, Yb = (Math.max(seiten[-1].h, seiten[1].h) * 3) / tanM + 5000;
  const formen = [], idx = { front: -1, wange: {}, dach: [] }, flaps = [], bleche = [], rueck = [];
  const Z = (e, X, Y) => e.a + e.b * X + e.c * Y;
  const dachPoly = (e, extra) => { // Ebene ∩ über dem Hauptdach ∩ zwischen den Seitenwänden ∩ Zusatzbedingung
    let poly = [[-Xb, 0], [Xb, 0], [Xb, Yb], [-Xb, Yb]];
    const bed = [[e.a, e.b, e.c - tanM], [-(Ap[-1][0] + k[-1] * e.a), 1 - k[-1] * e.b, -k[-1] * e.c], [Ap[1][0] + k[1] * e.a, k[1] * e.b - 1, k[1] * e.c], ...extra];
    for (const g of bed) { poly = beschneide(poly, g); if (poly.length < 3) return null; }
    return poly.map(([X, Y]) => [X, Y, Z(e, X, Y)]);
  };
  const front = art === "sattel" ? [Ap[-1], Ap[1], Bp[1], PK, Bp[-1]] : [Ap[-1], Ap[1], Bp[1], Bp[-1]];
  idx.front = formen.length; formen.push({ art: "front", punkte: hoch(front), normale: norm(w.map((x) => -x)), dicke: -wd });
  for (const sg of [-1, 1]) {
    const tri = [Ap[sg], Bp[sg], Cp[sg]], n = norm(cross(sub(Bp[sg], Ap[sg]), sub(Cp[sg], Ap[sg]))), aus = [sg, 0, 0], nn = dot(n, aus) >= 0 ? n : mul(n, -1);
    idx.wange[sg] = formen.length; formen.push({ art: "wange", punkte: hoch(tri), normale: norm(V(nn)), dicke: -wd });
  }
  const dachListe = art === "sattel" ? [{ e: ebenen[-1], extra: [[ebenen[1].a - ebenen[-1].a, ebenen[1].b - ebenen[-1].b, ebenen[1].c - ebenen[-1].c]] }, { e: ebenen[1], extra: [[ebenen[-1].a - ebenen[1].a, ebenen[-1].b - ebenen[1].b, ebenen[-1].c - ebenen[1].c]] }] : [{ e: ebenen[0], extra: [] }];
  const valleys = [], ov = Array.isArray(el.dachFlaechen) ? el.dachFlaechen : null; // ov: gezeichnete Dachflächen der Lukarne (Grundriss-Koordinaten u, v, h), z. B. aus Skizzen mit Längen und Diagonalen
  if (ov && ov.length !== dachListe.length) throw new Error(`Gaubendach aus Skizzen: ${dachListe.length} Fläche(n) nötig, ${ov.length} gewählt`);
  const lokal = (p) => { const d = sub(p, C0); return [dot(d, q), dot(d, w), d[2]]; };
  dachListe.forEach(({ e, extra }, i) => {
    let poly, nl;
    if (ov) {
      poly = ov[i].map(lokal); let n = [0, 0, 0]; poly.forEach((a, k) => { const c = cross(a, poly[(k + 1) % poly.length]); n = add(n, c); }); n = norm(n); if (n[2] < 0) { n = mul(n, -1); poly.reverse(); } nl = n;
      const c = poly.reduce((m, p) => add(m, mul(p, 1 / poly.length)), [0, 0, 0]), dev = Math.max(...poly.map((p) => Math.abs(dot(sub(p, c), n)))); if (dev > 2) hinweise.push(`Gaubendach ${i + 1}: Punkte liegen nicht in einer Ebene (Abweichung ${dev.toFixed(1)} mm)`);
    } else { poly = dachPoly(e, extra); if (!poly) throw new Error("Die Dachfläche der Lukarne trifft die Hauptdachfläche nicht – Höhe/Winkel prüfen"); nl = norm([-e.b, -e.c, 1]); }
    idx.dach.push(formen.length); formen.push({ art: "dach", punkte: hoch(poly), normale: norm(V(nl)), dicke: -dd });
    const tol = ov ? 3 : 0.5; poly.forEach((a, k) => { const b = poly[(k + 1) % poly.length]; if (Math.abs(a[2] - tanM * a[1]) < tol && Math.abs(b[2] - tanM * b[1]) < tol && len(sub(a, b)) > 50) valleys.push({ a: P(...a), b: P(...b), form: formen.length - 1 }); });
  });
  // Blechflächen: Streifen entlang der Anschlusslinien
  const nM = S.n, Cc = P(0, 300, 0), WB = 150, add3 = (a, b, kk = 1) => a.map((x, i) => x + b[i] * kk), un = norm;
  const mit = (poly) => poly.reduce((m, p) => m.map((x, i) => x + p[i] / poly.length), [0, 0, 0]);
  const streifen = (a, b, e, wbr, normale, ziel, artF, name) => flaps.push({ art: artF, name, punkte: [a, b, add3(b, e, wbr), add3(a, e, wbr)], normale, ziel });
  const seite = (a, b, nrm, zu) => { const d = un(sub(b, a)), m = mul(add(a, b), 0.5); let e = un(cross(nrm, d)); if (dot(e, sub(zu, m)) < 0) e = mul(e, -1); return e; };
  for (const v of valleys) {
    const nF = formen[v.form].normale, art2 = art === "sattel" ? "luk-kehle" : "luk-wand";
    streifen(v.a, v.b, mul(seite(v.a, v.b, nM, Cc), -1), WB, nM, "haupt", art2, art === "sattel" ? "Kehle (Dach)" : "Anschluss oben (Dach)");
    streifen(v.a, v.b, seite(v.a, v.b, nF, mit(formen[v.form].punkte)), WB, nF, v.form, art2, art === "sattel" ? "Kehle (Gaube)" : "Anschluss oben (Gaube)");
    const L = len(sub(v.b, v.a)); bleche.push({ art: art2, name: art === "sattel" ? "Lukarne Kehle" : "Lukarne Anschluss oben", laenge: Math.round(L / 10) * 10, stueck: 1, neigung: art === "sattel" ? Math.round((Math.atan2(Math.abs(v.b[2] - v.a[2]), Math.hypot(v.b[0] - v.a[0], v.b[1] - v.a[1])) * 360) / Math.PI) / 2 || 20 : undefined });
  }
  for (const sg of [-1, 1]) {
    const a = P(...Ap[sg]), c = P(...Cp[sg]), nF = formen[idx.wange[sg]].normale;
    streifen(a, c, mul(seite(a, c, nM, Cc), -1), WB, nM, "haupt", "luk-wand", "Wangenanschluss (Dach)"); streifen(a, c, [0, 0, 1], WB, nF, idx.wange[sg], "luk-wand", "Wangenanschluss (Wand)");
    bleche.push({ art: "luk-wand", name: "Lukarne Wangenanschluss " + seiten[sg].name, laenge: Math.round(len(sub(c, a)) / 10) * 10, stueck: 1 });
  }
  { const a = P(...Ap[-1]), b = P(...Ap[1]); streifen(a, b, S.up.map((x) => -x), WB, nM, "haupt", "luk-wand", "Fussanschluss (Dach)"); streifen(a, b, [0, 0, 1], WB, formen[idx.front].normale, idx.front, "luk-wand", "Fussanschluss (Wand)"); bleche.push({ art: "luk-wand", name: "Lukarne Fussanschluss", laenge: Math.round(bu / 10) * 10, stueck: 1 }); }
  // Fenster in der Front
  const f0 = Math.min(hf * 0.12, 400), fw = Math.min(Math.min(bu, bo) - 500, Math.min(bu, bo) * 0.6), fh = Math.min(seiten[-1].h, seiten[1].h) * 0.7;
  const fenster = el.fenster !== false && fw > 200 ? { punkte: hoch([[-fw / 2, 0, f0], [fw / 2, 0, f0], [fw / 2, 0, f0 + fh], [-fw / 2, 0, f0 + fh]]), normale: norm(w.map((x) => -x)), b: fw, h: fh } : null;
  // Öffnung im Hauptdach: Grundriss der Lukarne auf der Dachfläche, in (s, t)
  const plan = hull([Ap[-1], Ap[1], Ep[-1], Ep[1], Cp[-1], Cp[1], ...valleys.flatMap((v) => [v.a, v.b].map((p) => [(p[0] - C0[0]) * q[0] + (p[1] - C0[1]) * q[1], (p[0] - C0[0]) * w[0] + (p[1] - C0[1]) * w[1], 0]))].map((p) => [p[0], p[1]]));
  const poly = plan.map(([X, Y]) => [sC + X, tA + Y / cosM]), innen = poly.every((p) => R.stuecke.some((st) => innenPunkt(st, p)));
  if (!innen) hinweise.push("Die Lukarne ragt über den Rand der Dachfläche (First/Seite) – tiefer setzen oder kleiner messen.");
  const sx = poly.map((p) => p[0]), tx = poly.map((p) => p[1]);
  return { innen, hinweise, flaps, fenster, idx, rect: { s0: Math.min(...sx), s1: Math.max(...sx), t0: Math.min(...tx), t1: Math.max(...tx), poly }, flaeche: Math.abs(poly.reduce((a, p, i) => { const r = poly[(i + 1) % poly.length]; return a + p[0] * r[1] - r[0] * p[1]; }, 0)) / 2 / 1e6, formen, bleche, firsthoehe: Math.max(...formen.flatMap((f) => f.punkte.map((p) => p[2]))), aufmass: { links: info[-1], rechts: info[1] } };
}
