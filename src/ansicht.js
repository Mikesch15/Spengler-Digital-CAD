// Spengler Digital CAD – Zeichnungsansichten: Körper → 2D-Linien (sichtbar / verdeckt) wie in einer Fusion-Zeichnung
// Kanten: Körperkanten (EdgesGeometry) und Umrisslinien gekrümmter Flächen. Sichtbarkeit über einen Tiefenpuffer.
import * as THREE from "three";
import { mergeVertices } from "three/addons/utils/BufferGeometryUtils.js";

export const RICHTUNGEN = { // Blickrichtung (zur Kamera) und «oben» – wie die Normansichten
  vorne: { d: [0, 0, 1], oben: [0, 1, 0], name: "Ansicht vorne" }, hinten: { d: [0, 0, -1], oben: [0, 1, 0], name: "Ansicht hinten" },
  rechts: { d: [1, 0, 0], oben: [0, 1, 0], name: "Ansicht rechts" }, links: { d: [-1, 0, 0], oben: [0, 1, 0], name: "Ansicht links" },
  oben: { d: [0, 1, 0], oben: [0, 0, -1], name: "Draufsicht" }, unten: { d: [0, -1, 0], oben: [0, 0, 1], name: "Untersicht" },
  iso: { d: [0.7, 0.55, 0.8], oben: [0, 1, 0], name: "Isometrie" },
};
const UNPACK = [255 / 256 / (256 * 256 * 256), 255 / 256 / (256 * 256), 255 / 256 / 256, 255 / 256];

// Umrisskanten: Kante zwischen einer zur Kamera und einer abgewandten Fläche (oder offener Rand)
function umrisse(geo, blick) {
  const nurPos = new THREE.BufferGeometry(); nurPos.setAttribute("position", (geo.index ? geo.toNonIndexed() : geo).attributes.position);
  const m = mergeVertices(nurPos, 1e-4), p = m.attributes.position, idx = m.index.array, kanten = new Map(), out = [];
  const v = (i) => new THREE.Vector3().fromBufferAttribute(p, i);
  for (let f = 0; f < idx.length; f += 3) {
    const a = v(idx[f]), b = v(idx[f + 1]), c = v(idx[f + 2]), n = b.clone().sub(a).cross(c.clone().sub(a));
    if (n.lengthSq() < 1e-12) continue;
    const s = Math.sign(n.dot(blick));
    for (const [i, j] of [[idx[f], idx[f + 1]], [idx[f + 1], idx[f + 2]], [idx[f + 2], idx[f]]]) {
      const k = i < j ? `${i}_${j}` : `${j}_${i}`, e = kanten.get(k);
      if (e) e.s.push(s); else kanten.set(k, { i, j, s: [s] });
    }
  }
  for (const e of kanten.values()) if ((e.s.length === 2 && e.s[0] * e.s[1] < 0)) out.push([v(e.i), v(e.j)]);
  return out;
}

// Ansicht rechnen. meshes = sichtbare Körper. massstab = Papier-mm je Modell-mm. Ergebnis in Papier-mm:
// { breite, hoehe, sichtbar: [[x1,y1,x2,y2]…], verdeckt: […], punkte: [{ x, y, w: [x,y,z] }] (Fangpunkte), abbild(w) → [x,y] }
export function rechneAnsicht(renderer, meshes, art, massstab, { verdeckte = true, pxProMm = 5 } = {}) {
  const R = RICHTUNGEN[art] || RICHTUNGEN.vorne, blick = new THREE.Vector3(...R.d).normalize();
  const box = new THREE.Box3(); meshes.forEach((m) => box.expandByObject(m));
  if (box.isEmpty()) return null;
  const c = box.getCenter(new THREE.Vector3()), r = box.getSize(new THREE.Vector3()).length() / 2 || 100;
  const kam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, r * 6);
  kam.position.copy(c).addScaledVector(blick, r * 3); kam.up.set(...R.oben); kam.lookAt(c); kam.updateMatrixWorld();
  // Ausdehnung im Kamerasystem
  const inv = kam.matrixWorldInverse, ecken = [];
  for (const x of [box.min.x, box.max.x]) for (const y of [box.min.y, box.max.y]) for (const z of [box.min.z, box.max.z]) ecken.push(new THREE.Vector3(x, y, z).applyMatrix4(inv));
  const minx = Math.min(...ecken.map((e) => e.x)), maxx = Math.max(...ecken.map((e) => e.x)), miny = Math.min(...ecken.map((e) => e.y)), maxy = Math.max(...ecken.map((e) => e.y));
  const rand = (Math.max(maxx - minx, maxy - miny) || 1) * 0.01;
  Object.assign(kam, { left: minx - rand, right: maxx + rand, bottom: miny - rand, top: maxy + rand }); kam.updateProjectionMatrix();
  const breite = (kam.right - kam.left) * massstab, hoehe = (kam.top - kam.bottom) * massstab;
  const W = Math.max(64, Math.min(4096, Math.round(breite * pxProMm))), H = Math.max(64, Math.min(4096, Math.round(hoehe * pxProMm)));
  // Tiefenpuffer
  const szene = new THREE.Scene(), tiefe = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, side: THREE.DoubleSide });
  for (const m of meshes) { const k = new THREE.Mesh(m.geometry, tiefe); k.matrixAutoUpdate = false; k.matrix.copy(m.matrixWorld); k.matrixWorld.copy(m.matrixWorld); szene.add(k); }
  const rt = new THREE.WebGLRenderTarget(W, H), alt = renderer.getRenderTarget(), altClip = renderer.clippingPlanes, altFarbe = renderer.getClearColor(new THREE.Color()), altAlpha = renderer.getClearAlpha();
  renderer.clippingPlanes = []; renderer.setRenderTarget(rt); renderer.setClearColor(0xffffff, 1); renderer.clear(); renderer.render(szene, kam);
  const px = new Uint8Array(W * H * 4); renderer.readRenderTargetPixels(rt, 0, 0, W, H, px);
  renderer.setRenderTarget(alt); renderer.clippingPlanes = altClip; renderer.setClearColor(altFarbe, altAlpha); rt.dispose(); tiefe.dispose();
  const puffer = new Float32Array(W * H);
  for (let i = 0; i < W * H; i++) puffer[i] = (px[i * 4] * UNPACK[0] + px[i * 4 + 1] * UNPACK[1] + px[i * 4 + 2] * UNPACK[2] + px[i * 4 + 3] * UNPACK[3]) / 255;
  const tiefeBei = (ix, iy) => { let t = 1; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const x = ix + dx, y = iy + dy; if (x >= 0 && y >= 0 && x < W && y < H) t = Math.min(t, puffer[y * W + x]); } return t; };
  const proj = (w) => { const v = w.clone().project(kam); return { x: (v.x + 1) / 2 * breite, y: (1 - v.y) / 2 * hoehe, z: (v.z + 1) / 2 }; };
  const abbild = (w) => { const q = proj(new THREE.Vector3(...w)); return [q.x, q.y]; };
  // Kanten sammeln (Weltkoordinaten)
  const kanten = [];
  for (const m of meshes) {
    const e = { geometry: kantenGeometrie(m.geometry) };
    if (e) { const p = e.geometry.attributes.position; for (let i = 0; i < p.count; i += 2) kanten.push([new THREE.Vector3().fromBufferAttribute(p, i).applyMatrix4(m.matrixWorld), new THREE.Vector3().fromBufferAttribute(p, i + 1).applyMatrix4(m.matrixWorld)]); }
    const lokalBlick = blick.clone().transformDirection(m.matrixWorld.clone().invert());
    for (const [a, b] of umrisse(m.geometry, lokalBlick)) kanten.push([a.applyMatrix4(m.matrixWorld), b.applyMatrix4(m.matrixWorld)]);
  }
  const sichtbar = [], verdeckt = [], punkte = [], eps = 0.0025;
  for (const [a, b] of kanten) {
    const A = proj(a), B = proj(b), L = Math.hypot(B.x - A.x, B.y - A.y) * pxProMm, n = Math.max(2, Math.ceil(L));
    let lauf = null, start = null;
    const ende = (t) => { if (lauf === null) return; const P = (u) => [A.x + (B.x - A.x) * u, A.y + (B.y - A.y) * u]; const [x1, y1] = P(start), [x2, y2] = P(t); (lauf ? sichtbar : verdeckt).push([x1, y1, x2, y2]); };
    for (let k = 0; k <= n; k++) {
      const t = k / n, x = A.x + (B.x - A.x) * t, y = A.y + (B.y - A.y) * t, z = A.z + (B.z - A.z) * t;
      const ix = Math.round((x / breite) * W - 0.5), iy = Math.round((1 - y / hoehe) * H - 0.5);
      const sicht = z <= tiefeBei(ix, iy) + eps;
      if (lauf === null) { lauf = sicht; start = t; } else if (sicht !== lauf) { ende(t); lauf = sicht; start = t; }
    }
    ende(1);
    for (const [w, q] of [[a, A], [b, B]]) { const ix = Math.round((q.x / breite) * W - 0.5), iy = Math.round((1 - q.y / hoehe) * H - 0.5); if (q.z <= tiefeBei(ix, iy) + eps) punkte.push({ x: q.x, y: q.y, w: w.toArray() }); }
  }
  return { breite, hoehe, sichtbar: verbinde(sichtbar), verdeckt: verdeckte ? verbinde(verdeckt) : [], punkte, abbild, blick: R };
}
// Kurze Stücke gleicher Richtung zusammenfassen (kleinere Datei)
function verbinde(seg) { return seg.filter(([x1, y1, x2, y2]) => Math.hypot(x2 - x1, y2 - y1) > 0.05); }

// Körperkanten ohne die inneren Nähte, die bei Booleschen Operationen entstehen (T-Stösse in ebenen Flächen).
// Kanten mit zwei Flächen: Knick > schwelle. Kanten mit nur einer Fläche: auf ihrer Geraden zusammengefasst –
// wo zwei Stücke gegenüberliegen und die Flächen eben weiterlaufen, entfällt die Kante.
export function kantenGeometrie(geo, schwelle = 28) {
  const p = (geo.index ? geo.toNonIndexed() : geo).attributes.position, cos = Math.cos((schwelle * Math.PI) / 180);
  const r = (v) => Math.round(v * 1000), id = new Map(), pts = [];
  const vi = (i) => { const k = `${r(p.getX(i))},${r(p.getY(i))},${r(p.getZ(i))}`; let j = id.get(k); if (j === undefined) { j = pts.length; id.set(k, j); pts.push(new THREE.Vector3().fromBufferAttribute(p, i)); } return j; };
  const kanten = new Map();
  for (let f = 0; f < p.count; f += 3) {
    const a = vi(f), b = vi(f + 1), c = vi(f + 2); if (a === b || b === c || a === c) continue;
    const n = pts[b].clone().sub(pts[a]).cross(pts[c].clone().sub(pts[a])); if (n.lengthSq() < 1e-14) continue; n.normalize();
    for (const [i, j] of [[a, b], [b, c], [c, a]]) { const k = i < j ? `${i}_${j}` : `${j}_${i}`, e = kanten.get(k); if (e) e.n.push(n); else kanten.set(k, { i, j, n: [n] }); }
  }
  const out = [], einzeln = [];
  for (const e of kanten.values()) {
    if (e.n.length === 2) { if (e.n[0].dot(e.n[1]) < cos) out.push(pts[e.i], pts[e.j]); }
    else if (e.n.length === 1) einzeln.push(e); else out.push(pts[e.i], pts[e.j]);
  }
  // Einzelkanten je Gerade: Abdeckung entlang der Geraden zählen
  const gruppen = new Map();
  for (const e of einzeln) {
    const a = pts[e.i], b = pts[e.j], d = b.clone().sub(a).normalize();
    if (d.x < -1e-9 || (Math.abs(d.x) < 1e-9 && (d.y < -1e-9 || (Math.abs(d.y) < 1e-9 && d.z < 0)))) d.negate();
    const o = a.clone().sub(d.clone().multiplyScalar(a.dot(d)));
    const k = `${Math.round(d.x * 1e4)},${Math.round(d.y * 1e4)},${Math.round(d.z * 1e4)}|${Math.round(o.x * 100)},${Math.round(o.y * 100)},${Math.round(o.z * 100)}`;
    let g = gruppen.get(k); if (!g) gruppen.set(k, (g = { d, o, st: [] }));
    const t1 = a.dot(d), t2 = b.dot(d); g.st.push({ t1: Math.min(t1, t2), t2: Math.max(t1, t2), n: e.n[0] });
  }
  for (const g of gruppen.values()) {
    const ts = [...new Set(g.st.flatMap((x) => [x.t1, x.t2]))].sort((a, b) => a - b);
    for (let i = 0; i < ts.length - 1; i++) {
      const m = (ts[i] + ts[i + 1]) / 2, aktiv = g.st.filter((x) => x.t1 <= m && x.t2 >= m);
      const behalten = aktiv.length === 1 || aktiv.length > 2 || (aktiv.length === 2 && aktiv[0].n.dot(aktiv[1].n) < cos);
      if (behalten) out.push(g.o.clone().addScaledVector(g.d, ts[i]), g.o.clone().addScaledVector(g.d, ts[i + 1]));
    }
  }
  return new THREE.BufferGeometry().setFromPoints(out);
}
