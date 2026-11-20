// Test 7 im Browser: beide Kerne laden, Körper als Three.js-Netz zeigen, Lage/Normalen/Picking prüfen
import * as THREE from "three";
import { occt } from "../adapter/occt.mjs";
import { opengeometry } from "../adapter/opengeometry.mjs";
import { blechQuerschnitt, REFERENZ, ZINK } from "../faelle.mjs";

const aus = document.getElementById("aus"), protokoll = [];
const log = (z) => { protokoll.push(z); aus.textContent += JSON.stringify(z) + "\n"; };
const szene = new THREE.Scene(); szene.background = new THREE.Color(0xf4f2ee);
szene.add(new THREE.HemisphereLight(0xffffff, 0x777777, 2.2)); const sonne = new THREE.DirectionalLight(0xffffff, 1.5); sonne.position.set(1, 2, 3); szene.add(sonne);
const kamera = new THREE.PerspectiveCamera(35, 16 / 9, 1, 5000); kamera.position.set(260, 260, 520); kamera.lookAt(110, 40, 100);
const r = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true }); r.setSize(960, 540); document.getElementById("bild").appendChild(r.domElement);

async function zeige(K, wasmUrl, dx, farbe) {
  let t = performance.now(); await K.laden({ wasmUrl }); const laden = performance.now() - t;
  t = performance.now();
  const q = blechQuerschnitt(REFERENZ.mehrfach.ops, ZINK.t, ZINK.ri, ZINK.k);
  // Ortgangprofil (Querschnitt in XY, 200 mm entlang Z) mit Loch Ø12 durch den 80er-Schenkel
  const loch = K.verschieben(K.drehen(K.zylinder(6, 300), -90, [0, 0, 0], [1, 0, 0]), [-10, -150, 100]);
  const k = K.abziehen(K.extrusion(q.profil, 200), loch);
  const bauen = performance.now() - t; t = performance.now();
  const n = K.netz(k, 0.05), netz = performance.now() - t;
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(n.positionen, 3)); if (n.normalen) g.setAttribute("normal", new THREE.BufferAttribute(n.normalen, 3)); g.setIndex(new THREE.BufferAttribute(n.indizes, 1));
  const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ color: farbe, metalness: 0.3, roughness: 0.5 })); m.position.x = dx; szene.add(m);
  szene.updateMatrixWorld();
  // Picking: Strahl von oben auf den 80er-Schenkel
  const ray = new THREE.Raycaster(new THREE.Vector3(dx + 10, 500, 60), new THREE.Vector3(0, -1, 0)), hit = ray.intersectObject(m)[0];
  let flaeche = null;
  if (hit && n.flaechen.length) flaeche = n.flaechen.find((f) => hit.faceIndex * 3 >= f.start && hit.faceIndex * 3 < f.start + f.anzahl)?.id ?? null;
  else if (hit && K.modul) { const og = K.modul(); const s2 = new THREE.Scene(); s2.add(k.roh); s2.updateMatrixWorld(); og.OpenGeometry.flush({ geometry: "sync", bodies: [k.roh] }); const h2 = new THREE.Raycaster(new THREE.Vector3(0.010, 0.5, 0.060), new THREE.Vector3(0, -1, 0)).intersectObject(k.roh, true)[0]; flaeche = h2 ? (og.OpenGeometry.resolveHit(h2) ?? { kernTreffer: "kein resolveHit", objekt: h2.object.type }) : "kein Treffer am Kernkörper"; }
  log({ kern: K.info().name, laden_ms: Math.round(laden), bauen_ms: Math.round(bauen), netz_ms: Math.round(netz), dreiecke: n.indizes.length / 3, gueltig: K.pruefen(k).gueltig, volumen: Math.round(K.volumen(k)), treffer: hit ? hit.point.toArray().map((v) => +v.toFixed(2)) : null, flaeche });
}
await zeige(occt, "./replicad_single.wasm", 0, 0xb87333);
await zeige(opengeometry, "./opengeometry_bg.wasm", 220, 0x8a9aa6);
r.render(szene, kamera);
window.__ergebnis = protokoll;
