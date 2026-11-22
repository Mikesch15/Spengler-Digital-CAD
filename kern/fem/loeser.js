// Spengler Digital CAD – Kern: FEM-Löser (lineare Statik, Bandmatrix-Cholesky mit RCM-Sortierung)
import { elementSteifigkeit, elementSpannung } from "./schale.js";

// Reverse Cuthill-McKee auf dem Knotengraphen
export function rcm(n, tris) {
  const adj = Array.from({ length: n }, () => new Set());
  for (const t of tris) for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) if (i !== j) adj[t[i]].add(t[j]);
  const seen = new Uint8Array(n), ord = [];
  const nodes = [...Array(n).keys()].sort((a, b) => adj[a].size - adj[b].size);
  for (const s of nodes) {
    if (seen[s]) continue; seen[s] = 1; const q = [s];
    for (let h = 0; h < q.length; h++) { const v = q[h]; ord.push(v); for (const w of [...adj[v]].sort((a, b) => adj[a].size - adj[b].size)) if (!seen[w]) { seen[w] = 1; q.push(w); } }
  }
  return ord.reverse();
}

// Gleichungssystem aufbauen und zerlegen (einmal), danach beliebig viele Lastfälle lösen.
// fix: Array globaler Freiheitsgrade, die gesperrt sind (Wert 0 oder aus «vorgabe» von solve)
export function system(nodes, tris, dicke, mat, fix) {
  const n = nodes.length, N = 6 * n, fixd = new Uint8Array(N); for (const d of fix) fixd[d] = 1;
  const ord = rcm(n, tris), eq = new Int32Array(N).fill(-1); let m = 0;
  for (const v of ord) for (let k = 0; k < 6; k++) if (!fixd[6 * v + k]) eq[6 * v + k] = m++;
  const dk = (e) => (Array.isArray(dicke) ? dicke[e] : dicke), bw = new Int32Array(m), elK = [], elD = [];
  for (let e = 0; e < tris.length; e++) {
    const { K } = elementSteifigkeit(tris[e].map((i) => nodes[i]), dk(e), mat.E, mat.nu); elK.push(K);
    const d = []; for (const i of tris[e]) for (let k = 0; k < 6; k++) d.push(6 * i + k); elD.push(d);
    for (const a of d) { const ea = eq[a]; if (ea < 0) continue; for (const b of d) { const eb = eq[b]; if (eb < 0 || eb >= ea) continue; if (ea - eb > bw[ea]) bw[ea] = ea - eb; } }
  }
  const start = new Float64Array(m + 1); let tot = 0; for (let i = 0; i < m; i++) { start[i] = tot; tot += bw[i] + 1; } start[m] = tot;
  const A = new Float64Array(tot), idx = (i, j) => start[i] + bw[i] - (i - j);
  for (let e = 0; e < tris.length; e++) { const K = elK[e], d = elD[e]; for (let i = 0; i < 18; i++) { const ei = eq[d[i]]; if (ei < 0) continue; for (let j = 0; j < 18; j++) { const ej = eq[d[j]]; if (ej < 0 || ej > ei) continue; A[idx(ei, ej)] += K[i][j]; } } }
  let spur = 0; for (let i = 0; i < m; i++) spur = Math.max(spur, A[idx(i, i)]);
  for (let i = 0; i < m; i++) { // Skyline-Cholesky L Lᵀ
    const j0 = i - bw[i];
    for (let j = j0; j <= i; j++) {
      let s = A[idx(i, j)]; const k0 = Math.max(j0, j - bw[j]);
      for (let k = k0; k < j; k++) s -= A[idx(i, k)] * A[idx(j, k)];
      if (j === i) { if (!(s > 1e-10 * spur)) throw new Error("Modell nicht ausreichend gelagert (Starrkörperbewegung) – Lager prüfen"); A[idx(i, i)] = Math.sqrt(s); } else A[idx(i, j)] = s / A[idx(j, j)];
    }
  }
  const solveEq = (b) => {
    const y = new Float64Array(m);
    for (let i = 0; i < m; i++) { let s = b[i]; for (let k = i - bw[i]; k < i; k++) s -= A[idx(i, k)] * y[k]; y[i] = s / A[idx(i, i)]; }
    const x = new Float64Array(m);
    for (let i = m - 1; i >= 0; i--) { let s = y[i]; for (let k = i + 1; k < m && k - bw[k] <= i; k++) s -= A[idx(k, i)] * x[k]; x[i] = s / A[idx(i, i)]; }
    return x;
  };
  const mulK = (u) => { const r = new Float64Array(N); for (let e = 0; e < tris.length; e++) { const K = elK[e], d = elD[e]; for (let i = 0; i < 18; i++) { let s = 0; for (let j = 0; j < 18; j++) s += K[i][j] * u[d[j]]; r[d[i]] += s; } } return r; };
  const spannungen = (u) => tris.map((tr, e) => { const ue = []; for (const i of tr) for (let k = 0; k < 6; k++) ue.push(u[6 * i + k]); return elementSpannung(tr.map((i) => nodes[i]), dk(e), mat.E, mat.nu, ue); });
  // F: Lastvektor (6n), vorgabe: vorgeschriebene Werte an gesperrten Freiheitsgraden (6n) oder null
  const solve = (F, vorgabe = null) => {
    const b = new Float64Array(m); for (let d = 0; d < N; d++) if (eq[d] >= 0) b[eq[d]] = F[d];
    if (vorgabe && vorgabe.some((v) => v)) { // b −= K_(frei,fest) · u_fest
      const uf = new Float64Array(N); for (let d = 0; d < N; d++) if (fixd[d]) uf[d] = vorgabe[d];
      const r = mulK(uf); for (let d = 0; d < N; d++) if (eq[d] >= 0) b[eq[d]] -= r[d];
    }
    const x = m ? solveEq(b) : new Float64Array(0), u = new Float64Array(N); for (let d = 0; d < N; d++) { if (eq[d] >= 0) u[d] = x[eq[d]]; else if (fixd[d] && vorgabe) u[d] = vorgabe[d]; }
    const reaktion = mulK(u); for (let d = 0; d < N; d++) reaktion[d] = fixd[d] ? reaktion[d] - F[d] : 0;
    return { u, reaktion, elem: spannungen(u) };
  };
  return { n, N, m, bandbreite: Math.max(0, ...bw), solve, mulK, solveEq, eq, fixd, elK, elD, spannungen, nodes, tris, dicke: dk };
}

// Kurzform: ein Lastfall
export function loese(nodes, tris, dicke, mat, fix, F, vorgabe = null) { return system(nodes, tris, dicke, mat, fix).solve(F, vorgabe); }
