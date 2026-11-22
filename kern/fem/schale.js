// Spengler Digital CAD – Kern: Schalenelement (3 Knoten, 6 Freiheitsgrade je Knoten) für dünne Bleche
// Scheibe: CST (konstante Dehnung) · Platte: DKT (Discrete Kirchhoff Triangle, Batoz 1980) · Bohrfreiheitsgrad θz: kleine künstliche Steifigkeit.
// Einheiten: mm, N, N/mm² (MPa). Freiheitsgrade je Knoten: ux uy uz θx θy θz (global).
const BSIGN = 1;
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const kreuz = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const norm = (a) => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };

// Lokales Koordinatensystem des Dreiecks: Zeilen e1, e2, e3 (e3 = Normale), lokale 2D-Koordinaten und Fläche
export function lokal(P) {
  const e1 = norm(sub(P[1], P[0])), n = kreuz(sub(P[1], P[0]), sub(P[2], P[0])), e3 = norm(n), e2 = kreuz(e3, e1), R = [e1, e2, e3];
  const q = P.map((p) => { const d = sub(p, P[0]); return [d[0] * e1[0] + d[1] * e1[1] + d[2] * e1[2], d[0] * e2[0] + d[1] * e2[1] + d[2] * e2[2]]; });
  const A = 0.5 * ((q[1][0] - q[0][0]) * (q[2][1] - q[0][1]) - (q[2][0] - q[0][0]) * (q[1][1] - q[0][1]));
  return { R, q, A };
}

const Dmembran = (E, nu, t) => { const c = (E * t) / (1 - nu * nu); return [[c, c * nu, 0], [c * nu, c, 0], [0, 0, (c * (1 - nu)) / 2]]; };
const Dbiegung = (E, nu, t) => { const c = (E * t * t * t) / (12 * (1 - nu * nu)); return [[c, c * nu, 0], [c * nu, c, 0], [0, 0, (c * (1 - nu)) / 2]]; };

// Scheibe: B-Matrix (3 × 6) mit Reihenfolge u1 v1 u2 v2 u3 v3
function BMembran(q, A) {
  const [x1, y1] = q[0], [x2, y2] = q[1], [x3, y3] = q[2], f = 1 / (2 * A);
  const bx = [y2 - y3, y3 - y1, y1 - y2], by = [x3 - x2, x1 - x3, x2 - x1];
  return [[bx[0] * f, 0, bx[1] * f, 0, bx[2] * f, 0], [0, by[0] * f, 0, by[1] * f, 0, by[2] * f], [by[0] * f, bx[0] * f, by[1] * f, bx[1] * f, by[2] * f, bx[2] * f]];
}

// DKT: B-Matrix (3 × 9) an (ξ, η), Reihenfolge w1 θx1 θy1 w2 θx2 θy2 w3 θx3 θy3
export function BDKT(q, A, xi, eta) {
  const [x1, y1] = q[0], [x2, y2] = q[1], [x3, y3] = q[2], x21 = x2 - x1, y21 = y2 - y1, x31 = x3 - x1, y31 = y3 - y1;
  const sx = [x2 - x3, x3 - x1, x1 - x2], sy = [y2 - y3, y3 - y1, y1 - y2]; // Seiten 4 (2-3), 5 (3-1), 6 (1-2)
  const l2 = sx.map((v, i) => v * v + sy[i] * sy[i]), A_ = sx.map((v, i) => -v / l2[i]), B_ = sx.map((v, i) => (0.75 * v * sy[i]) / l2[i]), C_ = sx.map((v, i) => (0.25 * v * v - 0.5 * sy[i] * sy[i]) / l2[i]), D_ = sy.map((v, i) => -v / l2[i]), E_ = sx.map((v, i) => (0.25 * sy[i] * sy[i] - 0.5 * v * v) / l2[i]);
  const s = xi + eta, N = [2 * (1 - s) * (0.5 - s), xi * (2 * xi - 1), eta * (2 * eta - 1), 4 * xi * eta, 4 * eta * (1 - s), 4 * xi * (1 - s)];
  const Nx = [4 * s - 3, 4 * xi - 1, 0, 4 * eta, -4 * eta, 4 - 8 * xi - 4 * eta], Ne = [4 * s - 3, 0, 4 * eta - 1, 4 * xi, 4 - 4 * xi - 8 * eta, -4 * xi];
  const [a4, a5, a6] = A_, [b4, b5, b6] = B_, [c4, c5, c6] = C_, [d4, d5, d6] = D_, [e4, e5, e6] = E_;
  const hx = (n) => [1.5 * (a6 * n[5] - a5 * n[4]), b5 * n[4] + b6 * n[5], n[0] - c5 * n[4] - c6 * n[5], 1.5 * (a4 * n[3] - a6 * n[5]), b6 * n[5] + b4 * n[3], n[1] - c6 * n[5] - c4 * n[3], 1.5 * (a5 * n[4] - a4 * n[3]), b4 * n[3] + b5 * n[4], n[2] - c4 * n[3] - c5 * n[4]];
  const hy = (n) => [1.5 * (d6 * n[5] - d5 * n[4]), -n[0] + e5 * n[4] + e6 * n[5], -b5 * n[4] - b6 * n[5], 1.5 * (d4 * n[3] - d6 * n[5]), -n[1] + e6 * n[5] + e4 * n[3], -b6 * n[5] - b4 * n[3], 1.5 * (d5 * n[4] - d4 * n[3]), -n[2] + e4 * n[3] + e5 * n[4], -b4 * n[3] - b5 * n[4]];
  // Ableitungen der H-Funktionen nach ξ und η (die Formfunktionen sind linear in N)
  const dHx = (dn) => hx(dn), dHy = (dn) => hy(dn);
  const hxx = dHx(Nx.map((v, i) => v)), hxe = dHx(Ne), hyx = dHy(Nx), hye = dHy(Ne);
  // hx/hy enthalten konstante Anteile nicht (die «N1»-Terme sind Funktionen) – alles linear in N, daher gilt die gleiche Linearkombination für die Ableitungen
  const f = 1 / (2 * A), B = [[], [], []];
  for (let j = 0; j < 9; j++) {
    B[0][j] = f * (y31 * hxx[j] - y21 * hxe[j]);
    B[1][j] = f * (-x31 * hyx[j] + x21 * hye[j]);
    B[2][j] = f * (-x31 * hxx[j] + x21 * hxe[j] + y31 * hyx[j] - y21 * hye[j]);
  }
  return B;
}

const mulBtDB = (B, D, w, K, ni, nj, off) => { // K += w · Bᵀ D B (B: 3×n)
  const n = B[0].length, DB = [0, 1, 2].map((i) => Array.from({ length: n }, (_, j) => D[i][0] * B[0][j] + D[i][1] * B[1][j] + D[i][2] * B[2][j]));
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) K[i][j] += w * (B[0][i] * DB[0][j] + B[1][i] * DB[1][j] + B[2][i] * DB[2][j]);
};

// Elementsteifigkeit in Weltkoordinaten (18 × 18), dazu Rotation für Spannungen
export function elementSteifigkeit(P, t, E, nu) {
  const { R, q, A } = lokal(P); if (!(A > 1e-12)) throw new Error("Entartetes Dreieck");
  const Km = Array.from({ length: 6 }, () => new Array(6).fill(0)), Bm = BMembran(q, A); mulBtDB(Bm, Dmembran(E, nu, t), A, Km);
  const Kb = Array.from({ length: 9 }, () => new Array(9).fill(0)), Db = Dbiegung(E, nu, t);
  for (const [xi, eta] of [[1 / 6, 1 / 6], [2 / 3, 1 / 6], [1 / 6, 2 / 3]]) mulBtDB(BDKT(q, A, xi, eta), Db, (1 / 3) * A, Kb);
  const S = BSIGN; // Batoz-Freiheitsgrade = physikalische Drehungen (θy = −∂w/∂x, θx = ∂w/∂y)
  const Tb = Array.from({ length: 9 }, () => new Array(9).fill(0)); for (let a = 0; a < 3; a++) { Tb[3 * a][3 * a] = 1; Tb[3 * a + 1][3 * a + 1] = S; Tb[3 * a + 2][3 * a + 2] = S; }
  const Kb2 = Array.from({ length: 9 }, (_, i) => Array.from({ length: 9 }, (_, j) => { let r = 0; for (let k = 0; k < 9; k++) for (let l = 0; l < 9; l++) r += Tb[k][i] * Kb[k][l] * Tb[l][j]; return r; }));
  const K = Array.from({ length: 18 }, () => new Array(18).fill(0)), kd = 1e-4 * E * t * A;
  for (let a = 0; a < 3; a++) {
    for (let b = 0; b < 3; b++) {
      for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) K[6 * a + i][6 * b + j] += Km[2 * a + i][2 * b + j];
      for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) K[6 * a + 2 + i][6 * b + 2 + j] += Kb2[3 * a + i][3 * b + j];
    }
    K[6 * a + 5][6 * a + 5] += kd;
  }
  // lokal → global: K_g = Tᵀ K_l T mit T = blockdiag(R, R, R, R, R, R) (je Knoten Translation und Rotation)
  const T = Array.from({ length: 18 }, () => new Array(18).fill(0)); for (let b = 0; b < 6; b++) for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) T[3 * b + i][3 * b + j] = R[i][j];
  const KT = Array.from({ length: 18 }, (_, i) => Array.from({ length: 18 }, (_, j) => { let s = 0; for (let k = 0; k < 18; k++) s += K[i][k] * T[k][j]; return s; }));
  const Kg = Array.from({ length: 18 }, (_, i) => Array.from({ length: 18 }, (_, j) => { let s = 0; for (let k = 0; k < 18; k++) s += T[k][i] * KT[k][j]; return s; }));
  return { K: Kg, R, q, A };
}

// Spannungen im Element aus den Knotenverschiebungen (global, 18 Werte): Membran- und Biegespannung, Vergleichsspannung (von Mises) oben/unten
export function elementSpannung(P, t, E, nu, u) {
  const { R, q, A } = lokal(P), ul = new Array(18).fill(0);
  for (let b = 0; b < 6; b++) for (let i = 0; i < 3; i++) { let s = 0; for (let j = 0; j < 3; j++) s += R[i][j] * u[3 * b + j]; ul[3 * b + i] = s; }
  const um = [ul[0], ul[1], ul[6], ul[7], ul[12], ul[13]], ub = [ul[2], ul[3], ul[4], ul[8], ul[9], ul[10], ul[14], ul[15], ul[16]];
  const eps = Dm0(BMembran(q, A), um), Dm = Dmembran(E, nu, t), sm = [Dm[0][0] * eps[0] + Dm[0][1] * eps[1], Dm[1][0] * eps[0] + Dm[1][1] * eps[1], Dm[2][2] * eps[2]].map((v) => v / t);
  const kap = Dm0(BDKT(q, A, 1 / 3, 1 / 3), ub), Db = Dbiegung(E, nu, t), M = [Db[0][0] * kap[0] + Db[0][1] * kap[1], Db[1][0] * kap[0] + Db[1][1] * kap[1], Db[2][2] * kap[2]];
  const sb = M.map((m) => (6 * m) / (t * t)), vm = (s) => Math.sqrt(Math.max(0, s[0] * s[0] - s[0] * s[1] + s[1] * s[1] + 3 * s[2] * s[2]));
  const oben = [sm[0] + sb[0], sm[1] + sb[1], sm[2] + sb[2]], unten = [sm[0] - sb[0], sm[1] - sb[1], sm[2] - sb[2]];
  return { membran: sm, biegung: sb, oben, unten, vm: Math.max(vm(oben), vm(unten)), kappa: kap, eps };
}
const Dm0 = (B, u) => B.map((r) => r.reduce((s, v, j) => s + v * u[j], 0));

// Geometrische Steifigkeit (Eigenspannungs-Steifigkeit) für die Beulrechnung: lineare Verschiebungsinterpolation w, Membrankräfte N (N/mm)
export function elementGeoSteifigkeit(P, N) {
  const { R, q, A } = lokal(P), [x1, y1] = q[0], [x2, y2] = q[1], [x3, y3] = q[2], f = 1 / (2 * A);
  const bx = [(y2 - y3) * f, (y3 - y1) * f, (y1 - y2) * f], by = [(x3 - x2) * f, (x1 - x3) * f, (x2 - x1) * f], Kl = Array.from({ length: 18 }, () => new Array(18).fill(0));
  // Wirkung auf die Querverschiebung w und – für Stabilität gegen Starrkörperkippung – auf alle Translationen; Drehfreiheitsgrade bleiben unbelastet
  for (let a = 0; a < 3; a++) for (let b = 0; b < 3; b++) { const k = A * (N[0] * bx[a] * bx[b] + N[1] * by[a] * by[b] + N[2] * (bx[a] * by[b] + by[a] * bx[b])); Kl[6 * a + 2][6 * b + 2] += k; }
  const T = Array.from({ length: 18 }, () => new Array(18).fill(0)); for (let b = 0; b < 6; b++) for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) T[3 * b + i][3 * b + j] = R[i][j];
  const KT = Array.from({ length: 18 }, (_, i) => Array.from({ length: 18 }, (_, j) => { let s = 0; for (let k = 0; k < 18; k++) s += Kl[i][k] * T[k][j]; return s; }));
  return Array.from({ length: 18 }, (_, i) => Array.from({ length: 18 }, (_, j) => { let s = 0; for (let k = 0; k < 18; k++) s += T[k][i] * KT[k][j]; return s; }));
}
