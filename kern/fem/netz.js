// Spengler Digital CAD – Kern: Netzgenerierung für Blech-Schalenmodelle (Mittelfläche, Dreiecke)
// Ein Modell besteht aus Knoten [[x,y,z]], Dreiecken [[a,b,c]] und je Dreieck einer Flächenkennung (für Auswahl per Klick) und Dicke.

// Delaunay-Triangulation (Bowyer–Watson), pts: [[x,y]]; liefert Dreiecke [a,b,c] (gegen den Uhrzeigersinn)
export function delaunay(pts) {
  const n = pts.length; if (n < 3) return [];
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity; for (const [x, y] of pts) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
  const d = Math.max(x1 - x0, y1 - y0) || 1, mx = (x0 + x1) / 2, my = (y0 + y1) / 2, P = pts.slice();
  P.push([mx - 20 * d, my - d], [mx, my + 20 * d], [mx + 20 * d, my - d]);
  const kreis = (a, b, c) => { const [ax, ay] = P[a], [bx, by] = P[b], [cx, cy] = P[c], D = 2 * (ax * (by - cy) + bx * (cy - ay) + cx * (ay - by)); if (Math.abs(D) < 1e-300) return null; const ux = ((ax * ax + ay * ay) * (by - cy) + (bx * bx + by * by) * (cy - ay) + (cx * cx + cy * cy) * (ay - by)) / D, uy = ((ax * ax + ay * ay) * (cx - bx) + (bx * bx + by * by) * (ax - cx) + (cx * cx + cy * cy) * (bx - ax)) / D; return { x: ux, y: uy, r2: (ax - ux) ** 2 + (ay - uy) ** 2 }; };
  let T = [{ v: [n, n + 1, n + 2], c: kreis(n, n + 1, n + 2) }];
  for (let i = 0; i < n; i++) {
    const [px, py] = P[i], schlecht = [], gut = [];
    for (const t of T) { if (t.c && (px - t.c.x) ** 2 + (py - t.c.y) ** 2 < t.c.r2 * (1 - 1e-12)) schlecht.push(t); else gut.push(t); }
    const kanten = new Map(); for (const t of schlecht) for (let k = 0; k < 3; k++) { const a = t.v[k], b = t.v[(k + 1) % 3], key = a < b ? a + "," + b : b + "," + a; kanten.set(key, kanten.has(key) ? null : [a, b]); }
    for (const e of kanten.values()) { if (!e) continue; const v = [e[0], e[1], i], c = kreis(...v); if (c) gut.push({ v, c }); }
    T = gut;
  }
  return T.filter((t) => t.v.every((i) => i < n)).map((t) => { const [a, b, c] = t.v, [A, B, C] = [P[a], P[b], P[c]]; return (B[0] - A[0]) * (C[1] - A[1]) - (B[1] - A[1]) * (C[0] - A[0]) > 0 ? [a, b, c] : [a, c, b]; });
}

export const flaecheVon = (poly) => { let s = 0; for (let i = 0; i < poly.length; i++) { const a = poly[i], b = poly[(i + 1) % poly.length]; s += a[0] * b[1] - b[0] * a[1]; } return s / 2; };
export function inPolygon(p, poly) { let in_ = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const [xi, yi] = poly[i], [xj, yj] = poly[j]; if ((yi > p[1]) !== (yj > p[1]) && p[0] < ((xj - xi) * (p[1] - yi)) / (yj - yi) + xi) in_ = !in_; } return in_; }
const abstandSeg = (p, a, b) => { const dx = b[0] - a[0], dy = b[1] - a[1], L2 = dx * dx + dy * dy || 1e-12, t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / L2)); return Math.hypot(p[0] - a[0] - t * dx, p[1] - a[1] - t * dy); };

// Randpunkte eines Polygons mit Teilung je Kante n_k = ceil(L/h) (gleiche Regel wie bei den Streifen, damit die Knoten zusammenfallen)
export const teilungen = (L, h) => Math.max(1, Math.ceil(L / h - 1e-9));
export function randPunkte(poly, h) { const out = []; for (let i = 0; i < poly.length; i++) { const a = poly[i], b = poly[(i + 1) % poly.length], L = Math.hypot(b[0] - a[0], b[1] - a[1]), n = teilungen(L, h); for (let k = 0; k < n; k++) out.push([a[0] + ((b[0] - a[0]) * k) / n, a[1] + ((b[1] - a[1]) * k) / n]); } return out; }

// Fläche (Polygon, optional Löcher) in der Ebene → { pts: [[x,y]], tris }
export function flaechenNetz(poly, h, loecher = []) {
  const ring = flaecheVon(poly) < 0 ? poly.slice().reverse() : poly, rs = loecher.map((l) => (flaecheVon(l) > 0 ? l.slice().reverse() : l));
  const pts = randPunkte(ring, h); for (const l of rs) pts.push(...randPunkte(l, h));
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity; for (const [x, y] of ring) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
  const nx = Math.max(1, Math.round((x1 - x0) / h)), ny = Math.max(1, Math.round((y1 - y0) / h)), hx = (x1 - x0) / nx, hy = (y1 - y0) / ny, rand = [ring, ...rs];
  for (let j = 1; j < ny; j++) for (let i = 1; i < nx; i++) { const p = [x0 + i * hx, y0 + j * hy]; if (!inPolygon(p, ring) || rs.some((l) => inPolygon(p, l))) continue; let dmin = Infinity; for (const r of rand) for (let k = 0; k < r.length; k++) dmin = Math.min(dmin, abstandSeg(p, r[k], r[(k + 1) % r.length])); if (dmin > 0.45 * Math.min(hx, hy)) pts.push(p); }
  const tris = delaunay(pts).filter(([a, b, c]) => { const m = [(pts[a][0] + pts[b][0] + pts[c][0]) / 3, (pts[a][1] + pts[b][1] + pts[c][1]) / 3]; return inPolygon(m, ring) && !rs.some((l) => inPolygon(m, l)); });
  return { pts, tris };
}

// Modell-Sammler: Knoten werden über ihre Lage zusammengeführt, damit angrenzende Flächen/Streifen verbunden sind
export class Modell {
  constructor(tol = 1e-4) { this.nodes = []; this.tris = []; this.dicke = []; this.flaeche = []; this.namen = []; this.map = new Map(); this.tol = tol; }
  knoten(p) { const k = Math.round(p[0] / this.tol) + "," + Math.round(p[1] / this.tol) + "," + Math.round(p[2] / this.tol); let i = this.map.get(k); if (i === undefined) { i = this.nodes.length; this.nodes.push([p[0], p[1], p[2]]); this.map.set(k, i); } return i; }
  flaecheNeu(name) { this.namen.push(name); return this.namen.length - 1; }
  dreieck(a, b, c, t, fl) { if (a === b || b === c || a === c) return; this.tris.push([a, b, c]); this.dicke.push(t); this.flaeche.push(fl); }
}

// Ebene (Ursprung o, Achsen u, v) → 3D
export const auf3D = (o, u, v) => (p) => [o[0] + u[0] * p[0] + v[0] * p[1], o[1] + u[1] * p[0] + v[1] * p[1], o[2] + u[2] * p[0] + v[2] * p[1]];

export function plattenAdd(M, poly, h, t, o, u, v, name, loecher = []) {
  const { pts, tris } = flaechenNetz(poly, h, loecher), f = auf3D(o, u, v), id = M.flaecheNeu(name), ix = pts.map((p) => M.knoten(f(p)));
  for (const [a, b, c] of tris) M.dreieck(ix[a], ix[b], ix[c], t, id);
  return id;
}

// Streifen: Linienzug [[x,y]] in der Querschnittsebene (o + x·ex + y·ey) entlang ez von z0 bis z1; Teilung je Segment aus h
export function streifenAdd(M, linie, z0, z1, h, t, o, ex, ey, ez, name, nzFix = null) {
  const L = z1 - z0, nz = nzFix ?? teilungen(Math.abs(L), h), id0 = M.flaecheNeu(name), id1 = id0;
  const P = []; // Querschnittspunkte inkl. Zwischenpunkte
  const marke = []; // Segmentindex je Punkt (für Flächenkennung)
  for (let i = 0; i + 1 < linie.length; i++) { const a = linie[i], b = linie[i + 1], n = teilungen(Math.hypot(b[0] - a[0], b[1] - a[1]), h); for (let k = 0; k < n; k++) { P.push([a[0] + ((b[0] - a[0]) * k) / n, a[1] + ((b[1] - a[1]) * k) / n]); marke.push(i); } }
  P.push(linie.at(-1)); marke.push(linie.length - 2);
  const pt = (q, j) => { const z = z0 + ((z1 - z0) * j) / nz; return [o[0] + ex[0] * q[0] + ey[0] * q[1] + ez[0] * z, o[1] + ex[1] * q[0] + ey[1] * q[1] + ez[1] * z, o[2] + ex[2] * q[0] + ey[2] * q[1] + ez[2] * z]; };
  const idx = P.map((q) => Array.from({ length: nz + 1 }, (_, j) => M.knoten(pt(q, j))));
  for (let i = 0; i + 1 < P.length; i++) for (let j = 0; j < nz; j++) { const a = idx[i][j], b = idx[i + 1][j], c = idx[i + 1][j + 1], d = idx[i][j + 1]; M.dreieck(a, b, c, t, id1); M.dreieck(a, c, d, t, id1); }
  return id1;
}
