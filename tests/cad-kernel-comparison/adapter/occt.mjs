// Adapter: OpenCascade (OCCT) über replicad + replicad-opencascadejs (WebAssembly)
import { KernFehler } from "../kernschnittstelle.mjs";

let r, oc; // replicad-Modul, OpenCascade-Instanz
const K = (roh) => ({ kern: "occt", roh });
const c = (k) => k.roh.clone(); // replicad verbraucht Eingaben → Kopie, damit Körper unverändert bleiben
const versuch = (was, f) => { try { return f(); } catch (e) { throw new KernFehler("FEHLGESCHLAGEN", `${was}: ${e?.message ?? e}`); } };

function zeichne(profil, schliessen = true) {
  let p = r.draw(profil.start);
  for (const s of profil.segmente) p = s.bogenMitte ? p.threePointsArcTo(s.bis, s.bogenMitte) : p.lineTo(s.bis);
  return schliessen ? p.close() : p.done();
}

export const occt = {
  info: () => ({ name: "OpenCascade (replicad)", paket: "replicad 1.2.1, replicad-opencascadejs 1.2.1", lizenz: "replicad MIT, OCCT-Build LGPL-2.1-only" }),
  async laden({ wasmUrl } = {}) { // wasmUrl: im Browser die URL der .wasm-Datei
    const m = await import("replicad-opencascadejs");
    const wasm = wasmUrl ?? new URL(import.meta.resolve("replicad-opencascadejs/wasm")).pathname;
    oc = await m.default({ locateFile: () => wasm });
    r = await import("replicad"); r.setOC(oc);
  },
  quader: (a, b) => K(r.makeBox(a, b)),
  zylinder: (rad, h) => K(r.makeCylinder(rad, h, [0, 0, 0], [0, 0, 1])),
  kegel: (r1, r2, h) => versuch("Kegel", () => K(zeichne({ start: [0, 0], segmente: [{ bis: [r1, 0] }, { bis: [r2, h] }, { bis: [0, h] }] }).sketchOnPlane("XZ").revolve([0, 0, 1]))),
  extrusion: (profil, h) => versuch("Extrusion", () => K(zeichne(profil).sketchOnPlane("XY").extrude(h))),
  rotation: (profil, winkel) => versuch("Rotation", () => K(zeichne(profil).sketchOnPlane("XZ").revolve([0, 0, 1], { angle: winkel }))),
  sweep: (rad, pfad) => versuch("Sweep", () => K(zeichne(pfad, false).sketchOnPlane("XZ").sweepSketch((plane, origin) => r.sketchCircle(rad, { plane, origin })))),
  loft: (schnitte) => versuch("Loft", () => {
    const [erst, ...rest] = schnitte.map((s) => zeichne(s.profil).sketchOnPlane("XY", s.z));
    return K(erst.loftWith(rest, { ruled: false }));
  }),
  nurbsFlaeche: (raster) => versuch("NURBS-Fläche", () => {
    const kanten = raster.map((zeile) => r.assembleWire([r.makeBSplineApproximation(zeile)]));
    const f = r.loft(kanten, {}, true).faces[0];
    return K(f);
  }),
  vereinigen: (a, b) => versuch("Vereinigung", () => K(c(a).fuse(c(b)))),
  abziehen: (a, b) => versuch("Differenz", () => K(c(a).cut(c(b)))),
  schneiden: (a, b) => versuch("Schnitt", () => K(c(a).intersect(c(b)))),
  verrunden: (k, rad, punkt) => versuch("Verrundung", () => K(c(k).fillet(rad, (e) => e.containsPoint(punkt)))),
  fasen: (k, d, punkt) => versuch("Fase", () => K(c(k).chamfer(d, (e) => e.containsPoint(punkt)))),
  schnittkurve: (a, b) => versuch("Schnittkurve", () => {
    const s = new oc.BRepAlgoAPI_Section(a.roh.wrapped, b.roh.wrapped, true);
    const form = r.cast(s.Shape());
    const kanten = form.edges;
    return { kanten: kanten.length, laenge: kanten.reduce((z, e) => z + r.measureLength(e), 0) };
  }),
  verschieben: (k, v) => K(c(k).translate(v)),
  drehen: (k, grad, punkt = [0, 0, 0], achse = [0, 0, 1]) => K(c(k).rotate(grad, punkt, achse)),
  volumen: (k) => r.measureVolume(k.roh),
  grenzen: (k) => { const b = k.roh.boundingBox.bounds; return { min: b[0], max: b[1] }; },
  pruefen(k) {
    const a = new oc.BRepCheck_Analyzer(k.roh.wrapped, true, false, false);
    const gueltig = a.IsValid();
    a.delete();
    const typ = r.shapeType(k.roh.wrapped);
    const fest = typ === oc.TopAbs_ShapeEnum.TopAbs_SOLID || typ === oc.TopAbs_ShapeEnum.TopAbs_COMPSOLID || (typ === oc.TopAbs_ShapeEnum.TopAbs_COMPOUND && k.roh.solids?.length > 0);
    return { gueltig, geschlossen: !!fest, info: `BRepCheck_Analyzer, Typ ${k.roh.constructor.name}` };
  },
  stepExport: async (k) => versuch("STEP-Export", () => k.roh.blobSTEP()).text(),
  stepImport: async (text) => K(await r.importSTEP(new Blob([text]))),
  netz(k, toleranz = 0.1) {
    const m = k.roh.mesh({ tolerance: toleranz, angularTolerance: 0.3 });
    return { positionen: Float32Array.from(m.vertices), normalen: Float32Array.from(m.normals), indizes: Uint32Array.from(m.triangles), flaechen: m.faceGroups.map((g) => ({ start: g.start, anzahl: g.count, id: g.faceId })) };
  },
};
