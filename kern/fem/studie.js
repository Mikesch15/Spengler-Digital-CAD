// Spengler Digital CAD – Kern: Simulationsstudie (Lager, Lasten, Lastfälle, Auswertung) auf einem Schalenmodell
// Einheiten: mm, N, N/mm². Ergebnisse sind Richtwerte, kein statischer Nachweis.
import { system } from "./loeser.js";
import { beulen } from "./beulen.js";

const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const kreuz = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const len = (a) => Math.hypot(a[0], a[1], a[2]);
const nrm = (a) => { const l = len(a) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };

// Geometrie-Analyse des Netzes: Flächennormalen, Fläche, Schwerpunkte, Kantentabelle
export function analyse(M) {
  const { nodes, tris } = M, ne = tris.length, nor = [], fl = [], sp = [], kanten = new Map();
  for (let e = 0; e < ne; e++) {
    const [a, b, c] = tris[e], P = [nodes[a], nodes[b], nodes[c]], n = kreuz(sub(P[1], P[0]), sub(P[2], P[0])), A = len(n) / 2;
    nor.push(nrm(n)); fl.push(A); sp.push([(P[0][0] + P[1][0] + P[2][0]) / 3, (P[0][1] + P[1][1] + P[2][1]) / 3, (P[0][2] + P[1][2] + P[2][2]) / 3]);
    for (let k = 0; k < 3; k++) { const i = tris[e][k], j = tris[e][(k + 1) % 3], key = i < j ? i + "," + j : j + "," + i, v = kanten.get(key); if (v) v.e.push(e); else kanten.set(key, { a: Math.min(i, j), b: Math.max(i, j), e: [e] }); }
  }
  const nachbar = Array.from({ length: ne }, () => []); for (const k of kanten.values()) if (k.e.length === 2) { nachbar[k.e[0]].push(k.e[1]); nachbar[k.e[1]].push(k.e[0]); }
  return { nor, fl, sp, kanten: [...kanten.values()], nachbar };
}

const abstSeg = (p, a, b) => { const d = sub(b, a), L2 = dot(d, d) || 1e-12, t = Math.max(0, Math.min(1, dot(sub(p, a), d) / L2)); return len(sub(p, [a[0] + t * d[0], a[1] + t * d[1], a[2] + t * d[2]])); };

// Auswahl auflösen: liefert { knoten: Map(knoten → Gewicht), elemente: [..] }; Gewicht: Fläche bzw. Länge (anteilig), bei Punkt 1
export function auswahl(M, G, sel) {
  const { nodes, tris } = M, w = new Map(), add = (i, x) => w.set(i, (w.get(i) || 0) + x);
  if (sel.art === "punkt") {
    const r = sel.r || M.h || 5; for (let i = 0; i < nodes.length; i++) if (len(sub(nodes[i], sel.p)) <= r) add(i, 1);
    if (!w.size) { let b = -1, bd = Infinity; nodes.forEach((p, i) => { const d = len(sub(p, sel.p)); if (d < bd) { bd = d; b = i; } }); add(b, 1); }
    return { knoten: w, elemente: [] };
  }
  if (sel.art === "flaeche") {
    let s = -1, sd = Infinity; G.sp.forEach((p, e) => { const d = len(sub(p, sel.p)) - (sel.n && dot(G.nor[e], sel.n) < 0 ? -0 : 0); if (d < sd) { sd = d; s = e; } });
    const grenze = Math.cos(((sel.winkel ?? 12) * Math.PI) / 180), seen = new Set([s]), q = [s];
    for (let h = 0; h < q.length; h++) for (const n of G.nachbar[q[h]]) if (!seen.has(n) && Math.abs(dot(G.nor[n], G.nor[s])) >= grenze) { seen.add(n); q.push(n); }
    for (const e of q) for (const i of tris[e]) add(i, G.fl[e] / 3);
    return { knoten: w, elemente: q };
  }
  if (sel.art === "kante") { // freie Ränder und Knicklinien
    const kand = G.kanten.filter((k) => k.e.length === 1 || (k.e.length === 2 && Math.abs(dot(G.nor[k.e[0]], G.nor[k.e[1]])) < Math.cos((20 * Math.PI) / 180)));
    let best = null, bd = Infinity; for (const k of kand) { const d = abstSeg(sel.p, nodes[k.a], nodes[k.b]); if (d < bd) { bd = d; best = k; } }
    if (!best) return { knoten: w, elemente: [] };
    const dir = nrm(sub(nodes[best.b], nodes[best.a])), grenze = Math.cos((8 * Math.PI) / 180), an = new Map(); for (const k of kand) for (const i of [k.a, k.b]) { if (!an.has(i)) an.set(i, []); an.get(i).push(k); }
    const seen = new Set([best]), q = [best];
    for (let h = 0; h < q.length; h++) for (const i of [q[h].a, q[h].b]) for (const k of an.get(i) || []) { if (seen.has(k)) continue; const d = nrm(sub(nodes[k.b], nodes[k.a])); if (Math.abs(dot(d, dir)) >= grenze && (k.e.length === best.e.length)) { seen.add(k); q.push(k); } }
    for (const k of q) { const L = len(sub(nodes[k.b], nodes[k.a])); add(k.a, L / 2); add(k.b, L / 2); }
    return { knoten: w, elemente: [], laenge: q.reduce((s, k) => s + len(sub(nodes[k.b], nodes[k.a])), 0) };
  }
  throw new Error("Unbekannte Auswahl: " + sel.art);
}

// Lager → gesperrte Freiheitsgrade (+ Vorgabewerte)
export function lagerAnwenden(M, G, lager) {
  const fix = new Set(), vorgabe = new Float64Array(6 * M.nodes.length);
  for (const l of lager) {
    const { knoten } = auswahl(M, G, l.sel), f = l.fest || {}, dofs = ["ux", "uy", "uz", "rx", "ry", "rz"], w = l.weg || [0, 0, 0];
    for (const i of knoten.keys()) dofs.forEach((k, j) => { if (f[k]) { fix.add(6 * i + j); if (j < 3) vorgabe[6 * i + j] = w[j] || 0; } });
  }
  return { fix: [...fix], vorgabe };
}
export const LAGER_ARTEN = { eingespannt: { ux: 1, uy: 1, uz: 1, rx: 1, ry: 1, rz: 1 }, gelenkig: { ux: 1, uy: 1, uz: 1 }, gleitX: { uy: 1, uz: 1 }, gleitY: { ux: 1, uz: 1 }, gleitZ: { ux: 1, uy: 1 }, nurX: { ux: 1 }, nurY: { uy: 1 }, nurZ: { uz: 1 } };

// Lastvektor (6n) eines Lastfalls
export function lastVektor(M, G, lasten, mat, faktorFn = (l) => l.faktor ?? 1) {
  const F = new Float64Array(6 * M.nodes.length), { tris } = M;
  for (const l of lasten) {
    const f = faktorFn(l);
    if (l.art === "kraft" || l.art === "strecke") {
      const { knoten, laenge } = auswahl(M, G, l.sel); let S = 0; for (const x of knoten.values()) S += x; if (!(S > 0)) continue;
      const tot = l.art === "strecke" ? (l.q || [0, 0, 0]).map((x) => x * (laenge || 0)) : l.F || [0, 0, 0];
      for (const [i, x] of knoten) for (let j = 0; j < 3; j++) F[6 * i + j] += (f * tot[j] * x) / S;
    } else if (l.art === "druck") {
      const { elemente } = auswahl(M, G, l.sel), ref = l.nref || null;
      for (const e of elemente) {
        let d; if (l.modus === "richtung") d = nrm(l.dir || [0, 0, -1]); else { d = G.nor[e].slice(); if (ref && dot(d, ref) < 0) d = d.map((x) => -x); d = d.map((x) => -x * (l.vorzeichen || 1)); } // Druck wirkt auf die angeklickte Seite hinein
        const Fe = (f * l.p * G.fl[e] * (l.projiziert ? Math.abs(dot(G.nor[e], d)) : 1)) / 3; for (const i of tris[e]) for (let j = 0; j < 3; j++) F[6 * i + j] += Fe * d[j];
      }
    } else if (l.art === "schwerkraft") {
      const g = l.g || [0, 0, -9810];
      for (let e = 0; e < tris.length; e++) { const m = ((mat.dichte || 7.85e-9) * M.dicke[e] * G.fl[e] * f) / 3; for (const i of tris[e]) for (let j = 0; j < 3; j++) F[6 * i + j] += m * g[j]; }
    }
  }
  return F;
}

// Auswertung eines Ergebnisses: Spannung je Element (von Mises, Maximum oben/unten), je Knoten gemittelt, Kennwerte
export function auswerten(M, sys, erg, mat, opt = {}) {
  const nn = M.nodes.length, vmN = new Float64Array(nn), cnt = new Float64Array(nn), vmE = erg.elem.map((e) => e.vm);
  M.tris.forEach((tr, e) => { for (const i of tr) { vmN[i] += vmE[e]; cnt[i]++; } }); for (let i = 0; i < nn; i++) if (cnt[i]) vmN[i] /= cnt[i];
  let umax = 0, iu = 0; const disp = new Float64Array(nn);
  for (let i = 0; i < nn; i++) { const d = Math.hypot(erg.u[6 * i], erg.u[6 * i + 1], erg.u[6 * i + 2]); disp[i] = d; if (d > umax) { umax = d; iu = i; } }
  let smax = 0, es = 0; vmE.forEach((v, e) => { if (opt.ohne && opt.ohne.has(e)) return; if (v > smax) { smax = v; es = e; } });
  const zul = mat.rp / (opt.gammaM || 1), R = [0, 0, 0]; for (let i = 0; i < nn; i++) for (let j = 0; j < 3; j++) R[j] += erg.reaktion[6 * i + j];
  return { vmN, vmE, disp, umax, umaxKnoten: iu, smax, smaxElement: es, zul, sicherheit: smax > 0 ? zul / smax : Infinity, faktorZul: smax > 0 ? zul / smax : Infinity, summeReaktion: R };
}

// Gesamte Studie rechnen: Lastfälle einzeln lösen (linear), Kombinationen überlagern
// studie: { material, lager, lasten:[{lastfall,...}], lastfaelle:[{id,name,art}], kombis:[{name, faktoren:{id:γ}}], gammaM, durchbiegung:{L, n} }
export function rechneStudie(M, studie, mat) {
  const G = analyse(M), { fix, vorgabe } = lagerAnwenden(M, G, studie.lager || []); if (!fix.length) throw new Error("Kein Lager definiert – mindestens eine Einspannung oder Auflagerung setzen");
  const sys = system(M.nodes, M.tris, M.dicke, mat, fix), lf = studie.lastfaelle?.length ? studie.lastfaelle : [{ id: "LF1", name: "Lastfall 1" }], rohe = {};
  for (const fall of lf) {
    const lasten = (studie.lasten || []).filter((l) => (l.lastfall || lf[0].id) === fall.id && l.aktiv !== false), F = lastVektor(M, G, lasten, mat);
    const nur = lasten.some((l) => l.art !== "kraft" && l.art !== "druck" && l.art !== "strecke" && l.art !== "schwerkraft"); void nur;
    rohe[fall.id] = sys.solve(F, studie.lager?.some((l) => l.weg?.some((x) => x)) ? vorgabe : null);
  }
  const kombis = studie.kombis?.length ? studie.kombis : lf.map((f) => ({ name: f.name, faktoren: { [f.id]: 1 } })), ergebnisse = [];
  for (const k of kombis) {
    const N = 6 * M.nodes.length, u = new Float64Array(N), r = new Float64Array(N); let elem = null;
    for (const [id, g] of Object.entries(k.faktoren)) {
      const e = rohe[id]; if (!e || !g) continue; for (let d = 0; d < N; d++) { u[d] += g * e.u[d]; r[d] += g * e.reaktion[d]; }
      if (!elem) elem = e.elem.map((x) => ({ oben: x.oben.map((v) => v * g), unten: x.unten.map((v) => v * g), membran: x.membran.map((v) => v * g), biegung: x.biegung.map((v) => v * g) }));
      else e.elem.forEach((x, i) => { for (const q of ["oben", "unten", "membran", "biegung"]) for (let j = 0; j < 3; j++) elem[i][q][j] += g * x[q][j]; });
    }
    if (!elem) elem = M.tris.map(() => ({ oben: [0, 0, 0], unten: [0, 0, 0], membran: [0, 0, 0], biegung: [0, 0, 0] }));
    const vm = (s) => Math.sqrt(Math.max(0, s[0] * s[0] - s[0] * s[1] + s[1] * s[1] + 3 * s[2] * s[2]));
    for (const x of elem) x.vm = Math.max(vm(x.oben), vm(x.unten));
    const a = auswerten(M, sys, { u, reaktion: r, elem }, mat, { gammaM: studie.gammaM });
    const erg = { u, reaktion: r, elem }; let beul = null;
    if (studie.beulen && (k.art || "GZT") !== "GZG") { try { beul = beulen(M, sys, erg); } catch (err) { beul = { fehler: err.message }; } }
    ergebnisse.push({ name: k.name, art: k.art || "alle", faktoren: k.faktoren, u, beul, ...a });
  }
  let b = [Infinity, -Infinity, Infinity, -Infinity, Infinity, -Infinity]; for (const p of M.nodes) for (let j = 0; j < 3; j++) { b[2 * j] = Math.min(b[2 * j], p[j]); b[2 * j + 1] = Math.max(b[2 * j + 1], p[j]); }
  const Lref = Math.max(b[1] - b[0], b[3] - b[2], b[5] - b[4]), grenze = studie.durchbiegung?.n ? (studie.durchbiegung.L || Lref) / studie.durchbiegung.n : null;
  for (const e of ergebnisse) { e.wGrenze = grenze; e.faktorDurchbiegung = grenze && e.umax > 0 ? grenze / e.umax : Infinity; e.hoechstlast = e.art === "GZT" ? e.faktorZul : e.art === "GZG" ? e.faktorDurchbiegung : Math.min(e.faktorZul, e.faktorDurchbiegung); if (e.beul?.lambda) e.hoechstlast = Math.min(e.hoechstlast, e.beul.lambda); }
  return { G, sys, ergebnisse, Lref, massgebend: ergebnisse.reduce((m, e) => (e.hoechstlast < (m?.hoechstlast ?? Infinity) ? e : m), null), mat };
}
