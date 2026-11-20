// Adapter: OpenGeometry 3.x (Rust/WebAssembly). Kern rechnet in Metern → hier mm ↔ m umrechnen.
import { KernFehler, nichtUnterstuetzt, kreisMitte, gegenUhr } from "../kernschnittstelle.mjs";

let og, THREE;
const M = 0.001; // mm → m
const K = (roh) => ({ kern: "opengeometry", roh });
const EBENE = { XY: { origin: [0, 0, 0], normal: [0, 0, 1], xDirection: [1, 0, 0] }, XZ: { origin: [0, 0, 0], normal: [0, -1, 0], xDirection: [1, 0, 0] } };
const versuch = (was, f) => { try { return f(); } catch (e) { throw new KernFehler("FEHLGESCHLAGEN", `${was}: ${e?.code ? e.code + " " : ""}${e?.message ?? e}`); } };
const mm = (p) => p.map((v) => v * M);

function draht(profil, ebene, geschlossen = true, z = 0) {
  let vorher = profil.start;
  const segments = profil.segmente.map((s) => {
    const seg = { to: mm(s.bis) };
    if (s.bogenMitte) seg.arc = { center: mm(kreisMitte(vorher, s.bogenMitte, s.bis)), counterClockwise: gegenUhr(vorher, s.bogenMitte, s.bis) };
    vorher = s.bis;
    return seg;
  });
  // OpenGeometry verlangt, dass ein geschlossenes Profil ausdrücklich zum Start zurückführt
  if (geschlossen && Math.hypot(vorher[0] - profil.start[0], vorher[1] - profil.start[1]) > 1e-9) segments.push({ to: mm(profil.start) });
  const plane = { ...EBENE[ebene], origin: [0, 0, z * M] };
  return new og.Wire(og.OG_PRIMITIVE_PROFILE, { start: mm(profil.start), segments, closed: geschlossen }, { plane });
}
const kopie = (k) => k.roh.duplicate();
function bool(art, a, b) {
  const neu = kopie(a);
  neu.operate(art, { tools: [b.roh] });
  return K(neu);
}

export const opengeometry = {
  info: () => ({ name: "OpenGeometry", paket: "opengeometry 3.0.1", lizenz: "MPL-2.0" }),
  async laden({ wasmUrl } = {}) { // im Browser: URL der .wasm-Datei; in Node: Datei aus node_modules
    og = await import("opengeometry");
    THREE = await import("three");
    if (wasmUrl) { await og.OpenGeometry.create({ wasmURL: wasmUrl }, { tessellation: "inline" }); return; }
    const { readFileSync } = await import("node:fs");
    const wasm = readFileSync(new URL(import.meta.resolve("opengeometry/opengeometry_bg.wasm")));
    await og.OpenGeometry.create({ wasmModule: new WebAssembly.Module(wasm) }, { tessellation: "inline" });
  },
  quader(a, b) {
    const s = new og.Solid(og.OG_PRIMITIVE_CUBOID, { width: (b[0] - a[0]) * M, depth: (b[1] - a[1]) * M, height: (b[2] - a[2]) * M }, { plane: EBENE.XY });
    const g = s.getBounds();
    s.transform(og.OG_TRANSFORM_TRANSLATE, { offset: [a[0] * M - g[0], a[1] * M - g[1], a[2] * M - g[2]] });
    return K(s);
  },
  zylinder: (rad, h) => K(new og.Solid(og.OG_PRIMITIVE_CYLINDER, { radius: rad * M, height: h * M }, { plane: EBENE.XY })),
  kegel: (r1, r2, h) => K(new og.Solid(og.OG_PRIMITIVE_CONE, { radiusBottom: r1 * M, radiusTop: r2 * M, height: h * M }, { plane: EBENE.XY })),
  extrusion: (profil, h) => versuch("Extrusion", () => K(new og.Solid(og.OG_OPERATION_EXTRUDE, { profile: draht(profil, "XY"), distance: h * M }))),
  rotation(profil, winkel) {
    // 3.x dreht nur volle Umdrehungen: volle Rotation, bei Teilwinkel mit Zylindersektor schneiden (exakt, aber zwei Schritte)
    const voll = versuch("Rotation", () => new og.Solid(og.OG_OPERATION_REVOLVE, { profile: draht(profil, "XZ"), axis: { point: [0, 0], direction: [0, 1] } }));
    if (Math.abs(winkel) >= 360) return K(voll);
    const g = voll.getBounds(), R = Math.max(...g.map(Math.abs)) * 2;
    const sektor = new og.Solid(og.OG_PRIMITIVE_CYLINDER_SECTOR, { radius: R, height: 2 * R, startAngle: 0, sweepAngle: (winkel * Math.PI) / 180 }, { plane: { ...EBENE.XY, origin: [0, 0, -R] } });
    voll.operate(og.OG_OPERATION_INTERSECT, { tools: [sektor] });
    return K(voll);
  },
  sweep: (rad, pfad) => versuch("Sweep", () => {
    const profile = new og.Wire(og.OG_PRIMITIVE_CIRCLE, { radius: rad * M }, { plane: EBENE.XY });
    return K(new og.Solid(og.OG_OPERATION_SWEEP, { profile, path: draht(pfad, "XZ", false), caps: true }));
  }),
  loft: () => nichtUnterstuetzt("Loft", "in OpenGeometry 3.x nicht vorhanden (README: «What does not exist … loft»)"),
  nurbsFlaeche: () => nichtUnterstuetzt("NURBS-Fläche", "3.x kennt nur Linien, Kreise, Bögen, Polylinien – keine Splines/NURBS"),
  vereinigen: (a, b) => versuch("Vereinigung", () => bool(og.OG_OPERATION_UNION, a, b)),
  abziehen: (a, b) => versuch("Differenz", () => bool(og.OG_OPERATION_SUBTRACT, a, b)),
  schneiden: (a, b) => versuch("Schnitt", () => bool(og.OG_OPERATION_INTERSECT, a, b)),
  verrunden: () => nichtUnterstuetzt("Verrundung", "3.x hat keine Fillets (README: «You need … fillets … 3.0 does not have them»); nur ROUNDED_BOX als Grundkörper"),
  fasen: () => nichtUnterstuetzt("Fase", "3.x hat keine Chamfer-Operation"),
  schnittkurve: () => nichtUnterstuetzt("Schnittkurve", "keine öffentliche Flächen-/Körper-Schnittkurve in 3.x (nur 2D-Regionen)"),
  modul: () => og, // nur Vorschau: Picking über OpenGeometry.resolveHit
  verschieben(k, v) { const n = kopie(k); n.transform(og.OG_TRANSFORM_TRANSLATE, { offset: mm(v) }); return K(n); },
  drehen(k, grad, punkt = [0, 0, 0], achse = [0, 0, 1]) { const n = kopie(k); n.transform(og.OG_TRANSFORM_ROTATE, { axis: achse, degrees: grad, pivot: mm(punkt) }); return K(n); },
  volumen: (k) => k.roh.measure({ deflection: 1e-6 }).volume / M ** 3,
  volumenFehler: (k) => k.roh.measure({ deflection: 1e-6 }).errorBound / M ** 3, // vom Kern angegebene Fehlerschranke
  grenzen(k) { const g = k.roh.getBounds(); return { min: g.slice(0, 3).map((v) => v / M), max: g.slice(3).map((v) => v / M) }; },
  pruefen(k) { const v = k.roh.validity(); return { gueltig: !!v.valid, geschlossen: !!v.closed, info: `validity(): ${v.bodyType}${v.error ? " " + v.error : ""}` }; },
  stepExport: async (k) => (await og.OpenGeometry.exportStep({ nodes: [k.roh], unit: "millimetre", upAxis: "Z" })).text,
  stepImport: () => nichtUnterstuetzt("STEP-Import", "OpenGeometry 3.x exportiert STEP nur; kein Import"),
  netz(k, toleranz = 0.1) {
    const szene = new THREE.Scene(); szene.add(k.roh); szene.updateMatrixWorld();
    og.OpenGeometry.flush({ geometry: "sync", bodies: [k.roh] });
    const g = k.roh.surface.geometry.clone().applyMatrix4(k.roh.surface.matrixWorld), pos = g.getAttribute("position"), nor = g.getAttribute("normal");
    const positionen = Float32Array.from(pos.array, (v) => v / M);
    const indizes = g.index ? Uint32Array.from(g.index.array) : Uint32Array.from({ length: pos.count }, (_, i) => i);
    const erg = { positionen, normalen: nor ? Float32Array.from(nor.array) : null, indizes, flaechen: (g.groups || []).map((x) => ({ start: x.start, anzahl: x.count, id: x.materialIndex })) };
    szene.remove(k.roh);
    return erg;
  },
};
