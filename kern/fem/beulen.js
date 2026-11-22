// Spengler Digital CAD – Kern: lineare Beulrechnung (kritischer Lastfaktor und Beulform)
// (K + λ·Kg) φ = 0 mit der geometrischen Steifigkeit Kg aus den Membrankräften des linearen Lastfalls; gesucht ist das kleinste λ > 0.
// Teilraum-Iteration mit Rayleigh-Ritz auf A = −K⁻¹ Kg (grösster positiver Eigenwert μ = 1/λ).
import { elementGeoSteifigkeit } from "./schale.js";

function jacobi(S, n) { // symmetrisch, Eigenwerte/-vektoren (kleine Matrizen)
  const V = Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => (i === j ? 1 : 0)));
  for (let sweep = 0; sweep < 60; sweep++) {
    let off = 0; for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) off += S[i][j] * S[i][j]; if (off < 1e-22) break;
    for (let p = 0; p < n; p++) for (let q = p + 1; q < n; q++) {
      if (Math.abs(S[p][q]) < 1e-300) continue; const th = (S[q][q] - S[p][p]) / (2 * S[p][q]), t = Math.sign(th || 1) / (Math.abs(th) + Math.sqrt(th * th + 1)), c = 1 / Math.sqrt(t * t + 1), s = t * c;
      for (let k = 0; k < n; k++) { const a = S[k][p], b = S[k][q]; S[k][p] = c * a - s * b; S[k][q] = s * a + c * b; }
      for (let k = 0; k < n; k++) { const a = S[p][k], b = S[q][k]; S[p][k] = c * a - s * b; S[q][k] = s * a + c * b; }
      for (let k = 0; k < n; k++) { const a = V[k][p], b = V[k][q]; V[k][p] = c * a - s * b; V[k][q] = s * a + c * b; }
    }
  }
  return { w: S.map((r, i) => r[i]), V };
}

export function beulen(M, sys, erg, opt = {}) {
  const N = sys.N, { tris, nodes, eq, fixd } = sys, ne = tris.length, Kge = [];
  for (let e = 0; e < ne; e++) { const s = erg.elem[e].membran, t = sys.dicke(e); Kge.push(elementGeoSteifigkeit(tris[e].map((i) => nodes[i]), [s[0] * t, s[1] * t, s[2] * t])); }
  const dof = (e) => { const d = []; for (const i of tris[e]) for (let k = 0; k < 6; k++) d.push(6 * i + k); return d; }, D = Array.from({ length: ne }, (_, e) => dof(e));
  const mulKg = (x) => { const r = new Float64Array(N); for (let e = 0; e < ne; e++) { const K = Kge[e], d = D[e]; for (let i = 0; i < 18; i++) { let s = 0; for (let j = 0; j < 18; j++) s += K[i][j] * x[d[j]]; r[d[i]] += s; } } for (let d = 0; d < N; d++) if (fixd[d]) r[d] = 0; return r; };
  const loeseGlobal = (b) => { const m = sys.m, bb = new Float64Array(m); for (let d = 0; d < N; d++) if (eq[d] >= 0) bb[eq[d]] = b[d]; const x = sys.solveEq(bb), u = new Float64Array(N); for (let d = 0; d < N; d++) if (eq[d] >= 0) u[d] = x[eq[d]]; return u; };
  const mulK = (x) => { const r = sys.mulK(x); for (let d = 0; d < N; d++) if (fixd[d]) r[d] = 0; return r; };
  const dot = (a, b) => { let s = 0; for (let i = 0; i < N; i++) s += a[i] * b[i]; return s; };
  const p = Math.min(opt.p || 6, Math.max(1, sys.m)); let X = [];
  let seed = 12345; const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296) - 0.5;
  for (let k = 0; k < p; k++) { const x = new Float64Array(N); for (let d = 0; d < N; d++) if (eq[d] >= 0) x[d] = rnd(); X.push(x); }
  let lam = Infinity, phi = null, alt = 0;
  for (let it = 0; it < (opt.iter || 40); it++) {
    // Y = K⁻¹ (−Kg X)
    const Y = X.map((x) => { const g = mulKg(x); for (let d = 0; d < N; d++) g[d] = -g[d]; return loeseGlobal(g); });
    // K-orthonormieren (Gram-Schmidt)
    const V = []; for (const y of Y) { const v = y.slice(); for (const w of V) { const c = dot(w, mulK(v)); for (let d = 0; d < N; d++) v[d] -= c * w[d]; } const nn = Math.sqrt(Math.max(0, dot(v, mulK(v)))); if (nn < 1e-14) continue; for (let d = 0; d < N; d++) v[d] /= nn; V.push(v); }
    if (!V.length) break; const q = V.length, G = V.map((v) => { const g = mulKg(v); for (let d = 0; d < N; d++) g[d] = -g[d]; return g; });
    const S = Array.from({ length: q }, (_, i) => Array.from({ length: q }, (_, j) => (dot(V[i], G[j]) + dot(V[j], G[i])) / 2)), { w, V: C } = jacobi(S, q);
    let ib = -1; for (let i = 0; i < q; i++) if (w[i] > 0 && (ib < 0 || w[i] > w[ib])) ib = i;
    X = []; for (let j = 0; j < q; j++) { const x = new Float64Array(N); for (let i = 0; i < q; i++) { const c = C[i][j]; for (let d = 0; d < N; d++) x[d] += c * V[i][d]; } X.push(x); }
    if (ib < 0) { lam = Infinity; phi = null; break; }
    lam = 1 / w[ib]; phi = X[ib];
    if (it > 2 && Math.abs(lam - alt) < 1e-5 * lam) break; alt = lam;
  }
  return { lambda: lam, form: phi };
}
