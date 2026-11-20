// Spengler Digital CAD – OCCT-Adapter (replicad 1.2.1 + replicad-opencascadejs 1.2.1, OpenCascade als WebAssembly)
// Einziger Ort, der replicad/OCCT kennt. Ein- und Ausgaben sind reine Daten (siehe schnittstelle.js).
// Speicher: replicad «verbraucht» Eingaben bei translate/rotate/fuse/cut… → hier wird immer auf Kopien gearbeitet;
// Zwischenergebnisse werden sofort mit delete() freigegeben, gehaltene Körper erst mit «freigeben».
import { KernFehler, CODES, TOLERANZ, pruefeKommando } from "./schnittstelle.js";
import { flaechenSignatur, kantenSignatur, aufloesen } from "./topologie.js";

const fehl = (code, m, d) => new KernFehler(code, m, d);
const norm = (v) => { const l = Math.hypot(...v); return v.map((x) => x / l); };
const kreuz = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const vec = (v) => [v.x, v.y, v.z];

// Mittelpunkt eines Kreises durch drei 2D-Punkte (für Bögen im Profil)
export function kreisMitte(a, m, b) {
  const d = 2 * (a[0] * (m[1] - b[1]) + m[0] * (b[1] - a[1]) + b[0] * (a[1] - m[1]));
  const q = (p) => p[0] * p[0] + p[1] * p[1];
  return [(q(a) * (m[1] - b[1]) + q(m) * (b[1] - a[1]) + q(b) * (a[1] - m[1])) / d, (q(a) * (b[0] - m[0]) + q(m) * (a[0] - b[0]) + q(b) * (m[0] - a[0])) / d];
}

export async function occtKern({ wasmUrl } = {}) {
  let oc, R;
  try {
    const m = await import("replicad-opencascadejs");
    // Node: Dateipfad über fileURLToPath (unter Windows ergäbe URL.pathname «/D:/…» → falscher Pfad)
    const pfad = wasmUrl ?? (typeof process !== "undefined" && process.versions?.node
      ? (await import("node:url")).fileURLToPath(import.meta.resolve("replicad-opencascadejs/wasm")) : undefined);
    oc = await m.default(pfad ? { locateFile: () => pfad } : {});
    R = await import("replicad");
    R.setOC(oc);
  } catch (e) { throw fehl(CODES.NICHT_GELADEN, `OpenCascade konnte nicht geladen werden: ${e?.message ?? e}`); }

  const koerper = new Map(); // id → replicad-Form
  let nr = 0;
  const neu = (form) => { const id = `k${++nr}`; koerper.set(id, form); return id; };
  const hol = (id) => { const f = koerper.get(id); if (!f) throw fehl(CODES.UNBEKANNT_ID, `Körper ${id} gibt es nicht (mehr)`); return f; };
  const kopie = (id) => hol(id).clone();
  const weg = (...fs) => fs.forEach((f) => { try { f?.delete?.(); } catch {} });
  const versuch = (was, fn) => { try { return fn(); } catch (e) { if (e instanceof KernFehler) throw e; throw fehl(CODES.FEHLGESCHLAGEN, `${was}: ${e?.message ?? e}`); } };

  const ebene = (e = "XY") => {
    if (typeof e === "string") return e;
    return new R.Plane(e.ursprung ?? [0, 0, 0], e.x, e.n);
  };
  const zeichne = (profil, schliessen = true) => {
    let p = R.draw(profil.start);
    for (const s of profil.segmente) {
      if (s.bogenMitte) p = p.threePointsArcTo(s.bis, s.bogenMitte);
      else if (s.bezier) p = p.cubicBezierCurveTo(s.bis, s.bezier[0], s.bezier[1]);
      else if (s.ellipse) p = p.ellipseTo(s.bis, s.ellipse.rx, s.ellipse.ry, (s.ellipse.w * 180) / Math.PI, false, true);
      else p = p.lineTo(s.bis);
    }
    const zu = profil.segmente.length && Math.hypot(profil.segmente.at(-1).bis[0] - profil.start[0], profil.segmente.at(-1).bis[1] - profil.start[1]) < 1e-9;
    return schliessen ? (zu ? p.done() : p.close()) : p.done(); // endet das Profil schon am Start (Kurve), nicht nochmals schliessen
  };
  // Körper entlang +Z gebaut → auf basis/achse ausrichten
  const ausrichten = (form, basis = [0, 0, 0], achse = [0, 0, 1]) => {
    const a = norm(achse), w = (Math.acos(Math.max(-1, Math.min(1, a[2]))) * 180) / Math.PI;
    let f = form;
    if (w > 1e-9) { const ax = Math.abs(w - 180) < 1e-9 ? [1, 0, 0] : kreuz([0, 0, 1], a); f = f.rotate(w, [0, 0, 0], ax); }
    return basis.some((v) => v !== 0) ? f.translate(basis) : f;
  };
  const pruefe = (form) => {
    const a = new oc.BRepCheck_Analyzer(form.wrapped, true, false, false);
    const ok = a.IsValid(); a.delete(); return ok;
  };
  // Neues Ergebnis: prüfen, sonst verwerfen (keine ungültigen Körper)
  const ergebnis = (form, was) => {
    if (!form || form.isNull) throw fehl(CODES.FEHLGESCHLAGEN, `${was}: kein Ergebnis`);
    if (!pruefe(form)) { weg(form); throw fehl(CODES.UNGUELTIG, `${was}: Ergebnis ist kein gültiger Körper – verworfen`); }
    if (form.solids && form.solids.length === 0 && was !== "STEP-Import") { weg(form); throw fehl(CODES.UNGUELTIG, `${was}: Ergebnis enthält keinen Volumenkörper`); }
    return { id: neu(form) };
  };

  // Topologie: Signaturen der Flächen/Kanten in fester Reihenfolge (Index = Reihenfolge von replicad .faces/.edges)
  const flaechenDaten = (form) => form.faces.map((f, i) => {
    const typ = f.geomType, c = vec(f.center);
    let n = null; if (typ === "PLANE") n = vec(f.normalAt());
    return flaechenSignatur(i, { typ, mitte: c, normale: n, flaeche: R.measureArea(f) });
  });
  // Nahtkanten (z. B. die Naht eines Zylindermantels) gehören zweimal zur selben Fläche – sie lassen sich nicht verrunden
  const nahtKanten = (form) => { const n = new Set(); for (const f of form.faces) for (const e of f.edges) if (oc.BRep_Tool.IsClosed(e.wrapped, f.wrapped)) n.add(e.hashCode); return n; };
  const kantenDaten = (form) => { const naht = nahtKanten(form); return form.edges.map((e, i) => ({ ...kantenSignatur(i, { typ: e.geomType, mitte: vec(e.pointAt(0.5)), start: vec(e.startPoint), ende: vec(e.endPoint), laenge: e.length }), naht: naht.has(e.hashCode) })); };
  const kantenWahl = (form, refs) => {
    const sig = kantenDaten(form), alle = form.edges, gew = new Set();
    for (const ref of refs) {
      if (ref.punkt) { // alle Kanten, auf denen der Punkt liegt
        const v = R.makeVertex(ref.punkt), tol = ref.toleranz ?? 1e-4, t = alle.filter((e) => R.measureDistanceBetween(e, v) < tol); weg(v);
        if (!t.length) throw fehl(CODES.REFERENZ, `Keine Kante durch Punkt ${ref.punkt.join(", ")}`);
        t.forEach((e) => gew.add(alle.indexOf(e)));
      } else gew.add(aufloesen({ ...ref, art: "kante" }, sig));
    }
    return [...gew].map((i) => alle[i]);
  };
  const flaechenWahl = (form, refs) => {
    const sig = flaechenDaten(form), alle = form.faces;
    return refs.map((ref) => {
      if (ref.punkt) { const v = R.makeVertex(ref.punkt), f = alle.find((x) => R.measureDistanceBetween(x, v) < 1e-4); weg(v); if (!f) throw fehl(CODES.REFERENZ, "Keine Fläche an diesem Punkt"); return f; }
      return alle[aufloesen({ ...ref, art: "flaeche" }, sig)];
    });
  };
  const eigenschaften = (form) => {
    const b = form.boundingBox.bounds, vp = R.measureShapeVolumeProperties(form), sp = R.measureShapeSurfaceProperties(form);
    const e = { volumen: vp.volume, flaeche: sp.area, schwerpunkt: vp.centerOfMass, grenzen: { min: b[0], max: b[1] }, gueltig: pruefe(form),
      geschlossen: (form.solids?.length ?? 0) > 0, anzahl: { koerper: form.solids?.length ?? 0, flaechen: form.faces.length, kanten: form.edges.length } };
    vp.delete?.(); sp.delete?.();
    return e;
  };
  const punkteDerKante = (e, n = 24) => {
    const typ = e.geomType;
    if (typ === "LINE") return [vec(e.startPoint), vec(e.endPoint)];
    return Array.from({ length: n + 1 }, (_, i) => vec(e.pointAt(i / n)));
  };

  const KOMMANDOS = {
    quader: (k) => ergebnis(R.makeBox(k.min, k.max), "Quader"),
    zylinder: (k) => ergebnis(R.makeCylinder(k.r, k.h, k.basis ?? [0, 0, 0], norm(k.achse ?? [0, 0, 1])), "Zylinder"),
    kegel: (k) => versuch("Kegel", () => {
      const pts = [[0, 0], ...(k.r1 > 0 ? [[k.r1, 0]] : []), ...(k.r2 > 0 ? [[k.r2, k.h]] : []), [0, k.h]];
      const s = zeichne({ start: pts[0], segmente: pts.slice(1).map((p) => ({ bis: p })) }).sketchOnPlane("XZ");
      return ergebnis(ausrichten(s.revolve([0, 0, 1]), k.basis, k.achse), "Kegel");
    }),
    kugel: (k) => ergebnis(R.makeSphere(k.r).translate(k.mitte ?? [0, 0, 0]), "Kugel"),
    extrusion: (k) => versuch("Extrusion", () => {
      let d = zeichne(k.profil);
      for (const l of k.loecher ?? []) d = d.cut(zeichne(l));
      return ergebnis(d.sketchOnPlane(ebene(k.ebene)).extrude(k.hoehe), "Extrusion");
    }),
    rotation: (k) => versuch("Rotation", () => {
      const s = zeichne(k.profil).sketchOnPlane(ebene(k.ebene ?? "XZ"));
      return ergebnis(s.revolve(k.achse?.richtung ?? [0, 0, 1], { origin: k.achse?.punkt ?? [0, 0, 0], angle: k.winkel ?? 360 }), "Rotation");
    }),
    sweep: (k) => versuch("Sweep", () => {
      const pfad = zeichne(k.pfad, false).sketchOnPlane(ebene(k.ebene ?? "XZ"));
      if (k.kreis) return ergebnis(pfad.sweepSketch((plane, origin) => R.sketchCircle(k.kreis, { plane, origin })), "Sweep");
      if (k.profil) return ergebnis(pfad.sweepSketch((plane) => zeichne(k.profil).sketchOnPlane(plane)), "Sweep");
      throw fehl(CODES.EINGABE, "sweep: kreis oder profil angeben");
    }),
    loft: (k) => versuch("Loft", () => {
      if (!(k.schnitte?.length >= 2)) throw fehl(CODES.EINGABE, "loft: mindestens zwei Schnitte");
      const [a, ...rest] = k.schnitte.map((s) => zeichne(s.profil).sketchOnPlane(ebene(s.ebene)));
      return ergebnis(a.loftWith(rest, { ruled: !!k.regelflaeche }), "Loft");
    }),
    boolesch: (k) => versuch("Boolesche Operation", () => {
      const a = kopie(k.a), b = kopie(k.b);
      const f = k.art === "vereinigen" ? a.fuse(b) : k.art === "abziehen" ? a.cut(b) : a.intersect(b);
      weg(a, b);
      if (k.art === "schneiden" && R.measureVolume(f) <= 0) { weg(f); throw fehl(CODES.FEHLGESCHLAGEN, "Schnittmenge ist leer"); }
      return ergebnis(f, "Boolesche Operation");
    }),
    verrunden: (k) => versuch("Verrunden", () => { const a = kopie(k.ziel), ks = kantenWahl(a, k.kanten); const f = a.fillet(k.r, (e) => e.inList(ks)); weg(a); return ergebnis(f, "Verrunden"); }),
    fasen: (k) => versuch("Fasen", () => { const a = kopie(k.ziel), ks = kantenWahl(a, k.kanten); const f = a.chamfer(k.d, (e) => e.inList(ks)); weg(a); return ergebnis(f, "Fasen"); }),
    schale: (k) => versuch("Schale", () => { const a = kopie(k.ziel), fs = flaechenWahl(a, k.offen ?? []); const f = a.shell(k.dicke, (x) => x.inList(fs)); weg(a); return ergebnis(f, "Schale"); }),
    bohrung: (k) => versuch("Bohrung", () => {
      const ziel = kopie(k.ziel), dir = norm(k.richtung), g = ziel.boundingBox.bounds;
      const tiefe = k.durch ? Math.hypot(...[0, 1, 2].map((i) => g[1][i] - g[0][i])) * 2 + 10 : k.tiefe;
      // Werkzeug: Zylinder ab Punkt in Bohrrichtung, bei «durch» auch etwas davor; optional Senkkegel am Eintritt
      const start = k.durch ? k.punkt.map((v, i) => v - dir[i] * tiefe / 2) : k.punkt;
      let wz = ausrichten(R.makeCylinder(k.d / 2, tiefe), start, dir);
      if (k.senkung) {
        const sw = ((k.senkung.winkel ?? 90) / 2) * Math.PI / 180, hs = (k.senkung.d - k.d) / 2 / Math.tan(sw);
        const pts = [[0, -0.01], [k.senkung.d / 2 + 0.01 * Math.tan(sw), -0.01], [k.d / 2, hs], [0, hs]];
        const kg = ausrichten(zeichne({ start: pts[0], segmente: pts.slice(1).map((p) => ({ bis: p })) }).sketchOnPlane("XZ").revolve([0, 0, 1]), k.punkt, dir);
        wz = wz.fuse(kg);
      }
      const f = ziel.cut(wz); weg(wz, ziel);
      return ergebnis(f, "Bohrung");
    }),
    transformieren: (k) => versuch("Transformieren", () => {
      let f = kopie(k.ziel);
      if (k.drehen) f = f.rotate(k.drehen.winkel, k.drehen.punkt ?? [0, 0, 0], k.drehen.achse ?? [0, 0, 1]);
      if (k.spiegeln) f = f.mirror(new R.Plane(k.spiegeln.punkt ?? [0, 0, 0], null, k.spiegeln.normale));
      if (k.verschieben) f = f.translate(k.verschieben);
      return ergebnis(f, "Transformieren");
    }),
    // Halbraum abschneiden: entfernt alles auf der Seite, in die «normale» zeigt (Ebene durch «punkt»)
    halbraum: (k) => versuch("Halbraum", () => {
      const f = kopie(k.ziel), g = f.boundingBox.bounds, S = Math.hypot(...[0, 1, 2].map((i) => g[1][i] - g[0][i])) + Math.hypot(...[0, 1, 2].map((i) => Math.max(Math.abs(g[0][i] - k.punkt[i]), Math.abs(g[1][i] - k.punkt[i])))) + 10;
      const n = norm(k.normale), x = norm(Math.abs(n[2]) < 0.9 ? kreuz([0, 0, 1], n) : kreuz([1, 0, 0], n)), y = kreuz(n, x), p = k.punkt;
      const box = R.makeBox([-S, -S, 0], [S, S, 2 * S]), t = new oc.gp_Trsf();
      t.SetValues(x[0], y[0], n[0], p[0], x[1], y[1], n[1], p[1], x[2], y[2], n[2], p[2]);
      const b = new oc.BRepBuilderAPI_Transform(box.wrapped, t, true, false), wz = R.cast(b.Shape());
      const r = f.cut(wz); weg(f, wz, box); t.delete(); b.delete();
      return ergebnis(r, "Halbraum");
    }),
    // Allgemeine Lage (Zeilen einer 3×4-Matrix, auch Spiegelung): für Muster/Spiegeln/Bewegen der App
    matrix: (k) => versuch("Matrix", () => {
      if (!(k.m?.length === 12)) throw fehl(CODES.EINGABE, "matrix: m = 12 Werte (3 Zeilen × 4)");
      const t = new oc.gp_Trsf(); t.SetValues(...k.m);
      const b = new oc.BRepBuilderAPI_Transform(hol(k.ziel).wrapped, t, true, false), f = R.cast(b.Shape());
      t.delete(); b.delete();
      return ergebnis(f, "Matrix");
    }),
    muster: (k) => versuch("Muster", () => {
      let f = kopie(k.ziel);
      const n = k.linear?.anzahl ?? k.kreis?.anzahl;
      if (!(n >= 2)) throw fehl(CODES.EINGABE, "muster: anzahl ≥ 2");
      for (let i = 1; i < n; i++) {
        let c = kopie(k.ziel);
        if (k.linear) { const d = norm(k.linear.richtung); c = c.translate(d.map((v) => v * k.linear.abstand * i)); }
        else c = c.rotate(((k.kreis.winkel ?? 360) / (k.kreis.winkel && k.kreis.winkel < 360 ? n - 1 : n)) * i, k.kreis.punkt ?? [0, 0, 0], k.kreis.achse ?? [0, 0, 1]);
        f = f.fuse(c);
      }
      return ergebnis(f, "Muster");
    }),
    eigenschaften: (k) => eigenschaften(hol(k.ziel)),
    // Kollision: Volumen der Durchdringung (0 = berühren sich höchstens)
    ueberschneidung: (k) => versuch("Überschneidung", () => {
      const a = kopie(k.a), b = kopie(k.b), s = a.intersect(b), v = s.isNull ? 0 : R.measureVolume(s);
      weg(a, b, s); return { volumen: Math.abs(v) < 1e-9 ? 0 : v };
    }),
    abstand: (k) => versuch("Abstand", () => ({ abstand: R.measureDistanceBetween(hol(k.a), hol(k.b)) })),
    topologie: (k) => { const f = hol(k.ziel); return { flaechen: flaechenDaten(f), kanten: kantenDaten(f) }; },
    tessellieren: (k) => {
      const f = hol(k.ziel), tol = k.toleranz ?? TOLERANZ.netz, w = k.winkel ?? TOLERANZ.winkelNetz;
      const m = f.mesh({ tolerance: tol, angularTolerance: w }), ml = f.meshEdges({ tolerance: tol, angularTolerance: w });
      // replicad liefert Hash-IDs → auf Index in .faces/.edges abbilden (stabile Reihenfolge, siehe topologie)
      const fIdx = new Map(f.faces.map((x, i) => [x.hashCode, i])), eIdx = new Map(f.edges.map((x, i) => [x.hashCode, i]));
      return {
        positionen: Float32Array.from(m.vertices), normalen: Float32Array.from(m.normals), indizes: Uint32Array.from(m.triangles),
        flaechen: m.faceGroups.map((g) => ({ index: fIdx.get(g.faceId) ?? -1, start: g.start, anzahl: g.count })),
        linien: Float32Array.from(ml.lines), kanten: ml.edgeGroups.map((g) => ({ index: eIdx.get(g.edgeId) ?? -1, start: g.start, anzahl: g.count })),
      };
    },
    projektion: (k) => versuch("Projektion", () => {
      const f = hol(k.ziel), kam = R.lookFromPlane(k.ansicht ?? "front"), { visible, hidden } = R.makeProjectedEdges(f, kam, k.verdeckt !== false);
      const zuLinien = (es) => es.map((e) => punkteDerKante(e).map((p) => [p[0], p[1]]));
      const lang = (es) => es.reduce((s, e) => s + e.length, 0);
      const r = { sichtbar: zuLinien(visible), verdeckt: zuLinien(hidden), laengeSichtbar: lang(visible), laengeVerdeckt: lang(hidden) };
      weg(...visible, ...hidden, kam);
      return r;
    }),
    schnitt: (k) => versuch("Schnitt", () => {
      const f = kopie(k.ziel), g = f.boundingBox.bounds, gross = Math.hypot(...[0, 1, 2].map((i) => g[1][i] - g[0][i])) * 2 + 10;
      const n = norm(k.ebene.normale), x = norm(Math.abs(n[2]) < 0.9 ? kreuz([0, 0, 1], n) : kreuz([1, 0, 0], n)), y = kreuz(n, x), p = k.ebene.punkt;
      const ecke = (a, b) => p.map((v, i) => v + (x[i] * a + y[i] * b) * gross);
      const flaeche = R.makePolygon([ecke(-1, -1), ecke(1, -1), ecke(1, 1), ecke(-1, 1)]);
      const s = f.intersect(flaeche);
      const r = { flaeche: R.measureArea(s), kanten: s.edges.map((e) => punkteDerKante(e)) };
      weg(s, flaeche);
      return r;
    }),
    stepExport: (k) => versuch("STEP-Export", async () => {
      const formen = (k.ziele ?? []).map((id, i) => ({ shape: hol(id), name: k.namen?.[i] ?? id }));
      if (!formen.length) throw fehl(CODES.EINGABE, "stepExport: keine Körper");
      return { text: await R.exportSTEP(formen, { unit: "MM" }).text() };
    }),
    stepImport: (k) => versuch("STEP-Import", async () => {
      const form = await R.importSTEP(new Blob([k.text]));
      const loese = form.solids?.length ? form.solids : [form];
      const ids = loese.map((s) => ergebnis(s, "STEP-Import").id);
      return { ids };
    }),
    freigeben: (k) => { let frei = 0; for (const id of k.ziele ?? []) { const f = koerper.get(id); if (f) { weg(f); koerper.delete(id); frei++; } } return { frei }; },
    speicher: () => ({ handles: koerper.size, heapBytes: oc.wasmMemory?.buffer?.byteLength ?? null }),
  };

  return {
    name: "OpenCascade (replicad)",
    async ausfuehren(kommando) {
      pruefeKommando(kommando);
      const f = KOMMANDOS[kommando.op];
      if (!f) throw fehl(CODES.NICHT_UNTERSTUETZT, `Unbekanntes Kommando ${kommando.op}`);
      return await f(kommando);
    },
    info: () => ({ kern: "OpenCascade", bindung: "replicad 1.2.1 / replicad-opencascadejs 1.2.1", lizenz: "replicad: MIT · OCCT-Build: LGPL-2.1-only (separate, austauschbare WASM-Datei)" }),
  };
}
