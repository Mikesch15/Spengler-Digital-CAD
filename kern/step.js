// Spengler Digital CAD – STEP-Export (ISO 10303-21, AP214) als B-Rep: ebene Flächen (zusammenhängende Dreiecke
// gleicher Ebene → eine Fläche mit Löchern), gemeinsame Kanten. Dicht = Volumenkörper, sonst Flächenmodell.
// Lesbar in Fusion, FreeCAD, SolidWorks, Inventor …
// koerper: [{ name, dreiecke: Float32Array|number[] (x,y,z je Ecke, 9 Werte je Dreieck) }]

const zahl = (v) => { const s = (Math.abs(v) < 1e-9 ? 0 : v).toFixed(4).replace(/0+$/, "").replace(/\.$/, "."); return s.includes(".") ? s : s + "."; };
const text = (s) => `'${String(s).replace(/'/g, "''").replace(/[^\x20-\x7e]/g, (c) => ({ ä: "ae", ö: "oe", ü: "ue", Ä: "Ae", Ö: "Oe", Ü: "Ue", ß: "ss" })[c] || "_")}'`;

const vek = (a, b) => [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
const kreuz = (u, v) => [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
const punkt3 = (u, v) => u[0] * v[0] + u[1] * v[1] + u[2] * v[2];
const norm = (u) => { const l = Math.hypot(...u) || 1; return u.map((x) => x / l); };

function brep(d, e, name) {
  // Punkte verschweissen
  const idx = new Map(), P = [], T = [];
  const id = (i) => { const k = `${Math.round(d[i] * 1e4)},${Math.round(d[i + 1] * 1e4)},${Math.round(d[i + 2] * 1e4)}`; if (!idx.has(k)) { idx.set(k, P.length); P.push([d[i], d[i + 1], d[i + 2]]); } return idx.get(k); };
  for (let i = 0; i + 8 < d.length; i += 9) {
    const t = [id(i), id(i + 3), id(i + 6)]; if (t[0] === t[1] || t[1] === t[2] || t[0] === t[2]) continue;
    const n = kreuz(vek(P[t[0]], P[t[1]]), vek(P[t[0]], P[t[2]])); if (Math.hypot(...n) < 1e-9) continue;
    T.push({ v: t, n: norm(n) });
  }
  if (!T.length) return null;
  const gerichtet = new Map(); // "a,b" → Dreieck
  T.forEach((t, k) => { for (let j = 0; j < 3; j++) gerichtet.set(`${t.v[j]},${t.v[(j + 1) % 3]}`, k); });
  const geschlossen = [...gerichtet.keys()].every((key) => { const [a, b] = key.split(","); return gerichtet.has(`${b},${a}`); });
  // Gruppen: benachbarte Dreiecke in derselben Ebene
  const gruppe = new Array(T.length).fill(-1); let g = 0;
  for (let s = 0; s < T.length; s++) {
    if (gruppe[s] >= 0) continue;
    const n0 = T[s].n, d0 = punkt3(n0, P[T[s].v[0]]), stapel = [s]; gruppe[s] = g;
    while (stapel.length) {
      const t = T[stapel.pop()];
      for (let j = 0; j < 3; j++) {
        const nb = gerichtet.get(`${t.v[(j + 1) % 3]},${t.v[j]}`);
        if (nb == null || gruppe[nb] >= 0) continue;
        const q = T[nb]; if (punkt3(q.n, n0) < 0.99999 || Math.abs(punkt3(n0, P[q.v[0]]) - d0) > 1e-3 || q.v.some((v) => Math.abs(punkt3(n0, P[v]) - d0) > 1e-3)) continue;
        gruppe[nb] = g; stapel.push(nb);
      }
    }
    g++;
  }
  // Gemeinsame Topologie: Ecken, Kanten (ungerichtet)
  const ecke = new Map(), kante = new Map();
  const cp = (v) => { if (!ecke.has(v)) { const p = P[v]; ecke.set(v, e(`VERTEX_POINT('',${e(`CARTESIAN_POINT('',(${zahl(p[0])},${zahl(p[1])},${zahl(p[2])}))`)})`)); } return ecke.get(v); };
  const kanteVon = (a, b) => {
    const key = a < b ? `${a},${b}` : `${b},${a}`;
    if (!kante.has(key)) {
      const [u, w] = a < b ? [a, b] : [b, a], A = P[u], dir = vek(A, P[w]), l = Math.hypot(...dir);
      const linie = e(`LINE('',${e(`CARTESIAN_POINT('',(${zahl(A[0])},${zahl(A[1])},${zahl(A[2])}))`)},${e(`VECTOR('',${e(`DIRECTION('',(${dir.map((x) => zahl(x / l)).join(",")}))`)},${zahl(l)})`)})`);
      kante.set(key, { ref: e(`EDGE_CURVE('',${cp(u)},${cp(w)},${linie},.T.)`), von: u });
    }
    const k = kante.get(key); return e(`ORIENTED_EDGE('',*,*,${k.ref},${k.von === a ? ".T." : ".F."})`);
  };
  const flaechen = [];
  for (let gi = 0; gi < g; gi++) {
    const tri = T.filter((_, k) => gruppe[k] === gi), drin = new Set();
    tri.forEach((t) => { for (let j = 0; j < 3; j++) drin.add(`${t.v[j]},${t.v[(j + 1) % 3]}`); });
    const rand = new Map(); // Randkanten der Gruppe: Start → [Ziele]
    tri.forEach((t) => { for (let j = 0; j < 3; j++) { const a = t.v[j], b = t.v[(j + 1) % 3]; if (!drin.has(`${b},${a}`)) { if (!rand.has(a)) rand.set(a, []); rand.get(a).push(b); } } });
    const schleifen = [];
    for (const start of [...rand.keys()]) while (rand.get(start)?.length) {
      const loop = [start]; let v = rand.get(start).pop();
      while (v !== start && rand.get(v)?.length && loop.length < 100000) { loop.push(v); v = rand.get(v).pop(); }
      if (loop.length >= 3) schleifen.push(loop);
    }
    if (!schleifen.length) continue;
    const n = tri[0].n, flaecheVon = (l) => { let s = [0, 0, 0]; for (let i = 0; i < l.length; i++) s = s.map((x, k) => x + kreuz(P[l[i]], P[l[(i + 1) % l.length]])[k]); return punkt3(s, n) / 2; };
    schleifen.sort((a, b) => Math.abs(flaecheVon(b)) - Math.abs(flaecheVon(a)));
    const grenzen = schleifen.map((l, i) => e(`${i ? "FACE_BOUND" : "FACE_OUTER_BOUND"}('',${e(`EDGE_LOOP('',(${l.map((a, k) => kanteVon(a, l[(k + 1) % l.length])).join(",")}))`)},.T.)`));
    const ref = Math.abs(n[0]) < 0.9 ? [1, 0, 0] : [0, 1, 0], x = norm(kreuz(kreuz(n, ref), n).map((v) => -v)), p0 = P[schleifen[0][0]];
    const ebene = e(`PLANE('',${e(`AXIS2_PLACEMENT_3D('',${e(`CARTESIAN_POINT('',(${p0.map(zahl).join(",")}))`)},${e(`DIRECTION('',(${n.map(zahl).join(",")}))`)},${e(`DIRECTION('',(${x.map(zahl).join(",")}))`)})`)})`);
    flaechen.push(e(`ADVANCED_FACE('',(${grenzen.join(",")}),${ebene},.T.)`));
  }
  if (geschlossen) return { geschlossen, item: e(`MANIFOLD_SOLID_BREP(${text(name)},${e(`CLOSED_SHELL('',(${flaechen.join(",")}))`)})`) };
  return { geschlossen, item: e(`SHELL_BASED_SURFACE_MODEL(${text(name)},(${e(`OPEN_SHELL('',(${flaechen.join(",")}))`)}))`) };
}

export function stepDatei(koerper, { name = "Modell", zeit = new Date() } = {}) {
  const z = []; let n = 0;
  const e = (s) => { z.push(`#${++n}=${s};`); return `#${n}`; };
  // Produktstruktur und Einheiten (mm)
  const appCtx = e(`APPLICATION_CONTEXT('core data for automotive mechanical design processes')`);
  e(`APPLICATION_PROTOCOL_DEFINITION('international standard','automotive_design',2000,${appCtx})`);
  const prodCtx = e(`PRODUCT_CONTEXT('',${appCtx},'mechanical')`);
  const prod = e(`PRODUCT(${text(name)},${text(name)},'',(${prodCtx}))`);
  e(`PRODUCT_RELATED_PRODUCT_CATEGORY('part',$,(${prod}))`);
  const form = e(`PRODUCT_DEFINITION_FORMATION('','',${prod})`);
  const defCtx = e(`PRODUCT_DEFINITION_CONTEXT('part definition',${appCtx},'design')`);
  const def = e(`PRODUCT_DEFINITION('design','',${form},${defCtx})`);
  const shapeDef = e(`PRODUCT_DEFINITION_SHAPE('','',${def})`);
  const mm = e(`(LENGTH_UNIT()NAMED_UNIT(*)SI_UNIT(.MILLI.,.METRE.))`);
  const rad = e(`(NAMED_UNIT(*)PLANE_ANGLE_UNIT()SI_UNIT($,.RADIAN.))`);
  const sr = e(`(NAMED_UNIT(*)SI_UNIT($,.STERADIAN.)SOLID_ANGLE_UNIT())`);
  const unsicher = e(`UNCERTAINTY_MEASURE_WITH_UNIT(LENGTH_MEASURE(0.001),${mm},'distance_accuracy_value','')`);
  const geoCtx = e(`(GEOMETRIC_REPRESENTATION_CONTEXT(3)GLOBAL_UNCERTAINTY_ASSIGNED_CONTEXT((${unsicher}))GLOBAL_UNIT_ASSIGNED_CONTEXT((${mm},${rad},${sr}))REPRESENTATION_CONTEXT('',''))`);
  const ursprung = e(`CARTESIAN_POINT('',(0.,0.,0.))`), zA = e(`DIRECTION('',(0.,0.,1.))`), xA = e(`DIRECTION('',(1.,0.,0.))`);
  const achse = e(`AXIS2_PLACEMENT_3D('',${ursprung},${zA},${xA})`);
  const fest = [], offen = [];
  for (const k of koerper) {
    const r = brep(k.dreiecke, e, k.name || "Koerper"); if (!r) continue;
    (r.geschlossen ? fest : offen).push(r.item);
  }
  // Hauptdarstellung + Körper (geschlossen: Volumen, sonst Flächenmodell) – über Beziehungen verbunden (wie FreeCAD/Fusion)
  const haupt = e(`SHAPE_REPRESENTATION(${text(name)},(${achse}),${geoCtx})`);
  e(`SHAPE_DEFINITION_REPRESENTATION(${shapeDef},${haupt})`);
  if (fest.length) { const r = e(`ADVANCED_BREP_SHAPE_REPRESENTATION('',(${[...fest, achse].join(",")}),${geoCtx})`); e(`SHAPE_REPRESENTATION_RELATIONSHIP('','',${haupt},${r})`); }
  if (offen.length) { const r = e(`MANIFOLD_SURFACE_SHAPE_REPRESENTATION('',(${[...offen, achse].join(",")}),${geoCtx})`); e(`SHAPE_REPRESENTATION_RELATIONSHIP('','',${haupt},${r})`); }
  const iso = zeit.toISOString().slice(0, 19);
  return `ISO-10303-21;
HEADER;
FILE_DESCRIPTION(('Spengler Digital CAD'),'2;1');
FILE_NAME(${text(name + ".step")},'${iso}',(''),(''),'Spengler Digital CAD','Spengler Digital CAD','');
FILE_SCHEMA(('AUTOMOTIVE_DESIGN { 1 0 10303 214 1 1 1 1 }'));
ENDSEC;
DATA;
${z.join("\n")}
ENDSEC;
END-ISO-10303-21;
`;
}

// ASCII-STL (für 3D-Druck, Visualisierung); gleiches Eingabeformat
export function stlDatei(koerper, name = "Modell") {
  const out = [`solid ${name.replace(/\s+/g, "_")}`];
  for (const k of koerper) {
    const d = k.dreiecke;
    for (let i = 0; i + 8 < d.length; i += 9) {
      const ux = d[i + 3] - d[i], uy = d[i + 4] - d[i + 1], uz = d[i + 5] - d[i + 2], vx = d[i + 6] - d[i], vy = d[i + 7] - d[i + 1], vz = d[i + 8] - d[i + 2];
      let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx; const l = Math.hypot(nx, ny, nz) || 1; nx /= l; ny /= l; nz /= l;
      out.push(` facet normal ${nx.toExponential(5)} ${ny.toExponential(5)} ${nz.toExponential(5)}`, "  outer loop");
      for (let j = 0; j < 9; j += 3) out.push(`   vertex ${d[i + j].toExponential(6)} ${d[i + j + 1].toExponential(6)} ${d[i + j + 2].toExponential(6)}`);
      out.push("  endloop", " endfacet");
    }
  }
  out.push(`endsolid ${name.replace(/\s+/g, "_")}`);
  return out.join("\n") + "\n";
}

// STL lesen (ASCII oder binär) → Float32Array mit 9 Werten je Dreieck
export function stlLesen(puffer) {
  const u8 = new Uint8Array(puffer), kopf = new TextDecoder().decode(u8.slice(0, Math.min(u8.length, 512)));
  const dv = new DataView(u8.buffer, u8.byteOffset, u8.byteLength);
  const binaer = u8.length >= 84 && 84 + dv.getUint32(80, true) * 50 === u8.length;
  if (binaer || !/^\s*solid/.test(kopf) || !/facet/.test(new TextDecoder().decode(u8.slice(0, Math.min(u8.length, 4096))))) {
    const n = dv.getUint32(80, true), out = new Float32Array(n * 9);
    for (let i = 0; i < n; i++) for (let j = 0; j < 9; j++) out[i * 9 + j] = dv.getFloat32(84 + i * 50 + 12 + j * 4, true);
    return out;
  }
  const zahlen = [...new TextDecoder().decode(u8).matchAll(/vertex\s+([-+\d.eE]+)\s+([-+\d.eE]+)\s+([-+\d.eE]+)/g)].flatMap((m) => [+m[1], +m[2], +m[3]]);
  return new Float32Array(zahlen.slice(0, zahlen.length - (zahlen.length % 9)));
}
