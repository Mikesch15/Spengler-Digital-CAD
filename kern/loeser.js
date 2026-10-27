// Spengler Digital CAD – Kern: Gleichungslöser für Skizzen (wie der Abhängigkeitslöser in Fusion)
// Variablen x (Koordinaten, Radien), Gleichungen { v: [Variablenindizes], f: (werte) => [Residuen] }.
// Gedämpftes Gauss-Newton (Levenberg–Marquardt) mit minimaler Änderung: die Skizze bewegt sich so wenig wie möglich.
// Reines JavaScript ohne Abhängigkeiten.

const rest = (x, gl) => { const r = []; for (const g of gl) r.push(...g.f(g.v.map((i) => x[i]))); return r; };
const quadsumme = (r) => r.reduce((s, z) => s + z * z, 0);
const groesster = (r) => r.reduce((s, z) => Math.max(s, Math.abs(z)), 0);

// Jacobi-Matrix als Zeilen { spalte: wert } nur für freie Variablen (zentrale Differenzen)
function jacobi(x, gl, spalte) {
  const zeilen = [];
  for (const g of gl) {
    const w = g.v.map((i) => x[i]), n = g.f(w).length;
    const z = Array.from({ length: n }, () => new Map());
    g.v.forEach((vi, k) => {
      const s = spalte.get(vi); if (s == null) return;
      const h = 1e-6 * (1 + Math.abs(w[k])), alt = w[k];
      w[k] = alt + h; const a = g.f(w); w[k] = alt - h; const b = g.f(w); w[k] = alt;
      for (let r = 0; r < n; r++) { const d = (a[r] - b[r]) / (2 * h); if (d) z[r].set(s, (z[r].get(s) || 0) + d); }
    });
    zeilen.push(...z);
  }
  return zeilen;
}

// Lineares Gleichungssystem A y = b (Gauss mit Spaltenpivot), A wird verändert
function lgs(A, b) {
  const n = b.length, y = b.slice();
  for (let k = 0; k < n; k++) {
    let p = k; for (let i = k + 1; i < n; i++) if (Math.abs(A[i][k]) > Math.abs(A[p][k])) p = i;
    if (Math.abs(A[p][k]) < 1e-300) continue;
    [A[k], A[p]] = [A[p], A[k]]; [y[k], y[p]] = [y[p], y[k]];
    for (let i = k + 1; i < n; i++) { const f = A[i][k] / A[k][k]; if (!f) continue; for (let j = k; j < n; j++) A[i][j] -= f * A[k][j]; y[i] -= f * y[k]; }
  }
  for (let k = n - 1; k >= 0; k--) { let s = y[k]; for (let j = k + 1; j < n; j++) s -= A[k][j] * y[j]; y[k] = Math.abs(A[k][k]) < 1e-300 ? 0 : s / A[k][k]; }
  return y;
}

// Löst die Gleichungen; fest = Set fester Variablen. Ergebnis { x, ok, rest }
export function loese(x0, gl, fest = new Set(), { iter = 100, tol = 1e-9 } = {}) {
  let x = x0.slice();
  if (!gl.length) return { x, ok: true, rest: 0 };
  const frei = [...x.keys()].filter((i) => !fest.has(i)), spalte = new Map(frei.map((v, j) => [v, j]));
  let F = rest(x, gl), q = quadsumme(F), lambda = 1e-6;
  for (let it = 0; it < iter && groesster(F) > tol; it++) {
    const J = jacobi(x, gl, spalte), m = J.length;
    const A = Array.from({ length: m }, () => new Float64Array(m));
    for (let r = 0; r < m; r++) for (let s = r; s < m; s++) {
      let d = 0; const [klein, gross] = J[r].size < J[s].size ? [J[r], J[s]] : [J[s], J[r]];
      for (const [c, w] of klein) { const u = gross.get(c); if (u) d += w * u; }
      A[r][s] = A[s][r] = d;
    }
    let angenommen = false;
    for (let versuch = 0; versuch < 12 && !angenommen; versuch++) {
      const B = A.map((zeile, r) => { const z = Array.from(zeile); z[r] += lambda * (1 + zeile[r]); return z; });
      const y = lgs(B, F), d = new Float64Array(frei.length);
      J.forEach((zeile, r) => { for (const [c, w] of zeile) d[c] -= w * y[r]; });
      const xn = x.slice(); frei.forEach((v, j) => (xn[v] += d[j]));
      const Fn = rest(xn, gl), qn = quadsumme(Fn);
      if (qn < q || qn < tol * tol) { x = xn; F = Fn; q = qn; lambda = Math.max(lambda * 0.2, 1e-12); angenommen = true; }
      else lambda *= 10;
    }
    if (!angenommen) break;
  }
  const r = groesster(F);
  return { x, ok: r < 1e-6, rest: r };
}

// Freiheitsgrade: Rang der Jacobi-Matrix; bestimmt[i] = Variable i ist durch die Gleichungen festgelegt
export function freiheitsgrade(x, gl, fest = new Set()) {
  const frei = [...x.keys()].filter((i) => !fest.has(i)), spalte = new Map(frei.map((v, j) => [v, j]));
  const n = frei.length, M = jacobi(x, gl, spalte).map((z) => { const a = new Float64Array(n); for (const [c, w] of z) a[c] = w; return a; });
  const tolRang = 1e-7 * Math.max(1, ...M.map((z) => Math.max(...z.map(Math.abs), 0)));
  const pivot = []; let zeile = 0;
  for (let c = 0; c < n && zeile < M.length; c++) { // reduzierte Zeilenstufenform
    let p = zeile; for (let i = zeile + 1; i < M.length; i++) if (Math.abs(M[i][c]) > Math.abs(M[p][c])) p = i;
    if (Math.abs(M[p][c]) < tolRang) continue;
    [M[zeile], M[p]] = [M[p], M[zeile]];
    const d = M[zeile][c]; for (let j = 0; j < n; j++) M[zeile][j] /= d;
    for (let i = 0; i < M.length; i++) if (i !== zeile && M[i][c]) { const f = M[i][c]; for (let j = 0; j < n; j++) M[i][j] -= f * M[zeile][j]; }
    pivot.push(c); zeile++;
  }
  const istPivot = new Set(pivot), freieSpalten = [...Array(n).keys()].filter((c) => !istPivot.has(c));
  const bestimmt = new Array(x.length).fill(true);
  freieSpalten.forEach((c) => (bestimmt[frei[c]] = false));
  pivot.forEach((c, r) => { if (freieSpalten.some((fc) => Math.abs(M[r][fc]) > 1e-7)) bestimmt[frei[c]] = false; });
  return { dof: n - pivot.length, rang: pivot.length, bestimmt };
}
