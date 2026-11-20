// 3D-Detailvorlagen: STEP-Körper mit Ankerkante (Ersatz für die .f3d-Detailvorlagen des Fusion-Add-ins)
// Konvention der Vorlage: Ursprung = Anfang der Ankerkante, +X = Richtung der Kante, +Z = Sichtseite («oben»). Masse in mm.
// Eine Detailvorlage hat das Add-in-Format «detailvorlage»; der Körper steht in source.step (Text) und source.mesh (Dreiecke, Base64).
import { neueDetailvorlage } from "./modelle.js";

const norm = (v) => { const l = Math.hypot(...v); return l < 1e-12 ? [0, 0, 0] : v.map((x) => x / l); };
const kreuz = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];

// Lage der Vorlage an einer Kante: Punkt p, Vektor d (Kante), versatz entlang der Kante, drehung um die Kante (Grad), oben = Sichtseite
// Rückgabe: 12 Werte (3 × 4, zeilenweise) – Zeilen: Bild der Vorlagenachsen X/Y/Z als Spalten, letzte Spalte = Verschiebung
export function kantenLage(p, d, { versatz = 0, drehung = 0, oben = [0, 0, 1] } = {}) {
  const x = norm(d); if (!(Math.hypot(...x) > 0)) throw new Error("Die Kante hat keine Länge.");
  let ref = norm(oben); if (Math.abs(ref[0] * x[0] + ref[1] * x[1] + ref[2] * x[2]) > 0.99) ref = Math.abs(x[2]) > 0.99 ? [0, 1, 0] : [0, 0, 1];
  let z = norm(kreuz(kreuz(x, ref), x)); // «oben» senkrecht zur Kante
  let y = kreuz(z, x);
  const w = (drehung * Math.PI) / 180, c = Math.cos(w), s = Math.sin(w);
  [y, z] = [y.map((v, i) => c * v + s * z[i]), z.map((v, i) => c * v - s * y[i])];
  const o = p.map((v, i) => v + x[i] * versatz);
  return [x[0], y[0], z[0], o[0], x[1], y[1], z[1], o[1], x[2], y[2], z[2], o[2]];
}
export const anwenden = (m, q) => [0, 1, 2].map((r) => m[r * 4] * q[0] + m[r * 4 + 1] * q[1] + m[r * 4 + 2] * q[2] + m[r * 4 + 3]);

// Vorlage aus STEP: Name, STEP-Text, Dreiecke (Float32Array, 9 je Dreieck), Dateiname; Ankerlänge = Ausdehnung in X
export function detailAusStep(name, stepText, dreiecke, datei = "") {
  let min = Infinity, max = -Infinity; for (let i = 0; i < dreiecke.length; i += 3) { min = Math.min(min, dreiecke[i]); max = Math.max(max, dreiecke[i]); }
  const u8 = new Uint8Array(dreiecke.buffer, dreiecke.byteOffset, dreiecke.byteLength); let bin = ""; for (let i = 0; i < u8.length; i += 0x8000) bin += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000));
  const v = neueDetailvorlage(name, { source: { strategy: "step", file: datei, componentName: name, fusionVersion: "", step: stepText, mesh: btoa(bin) } });
  v.anchor = { kind: "kante", edgeLength: +(max - min).toFixed(3), edgeType: "gerade", frame: { ursprung: "Kantenanfang", x: "Kantenrichtung", z: "Sichtseite" } };
  return v;
}
// Eignung einer Vorlage für eine Kante und ein Material: Hinweise (leer = geeignet)
export function pruefeDetail(v, { kantenlaenge = null, dicke = null } = {}) {
  const h = [], c = v?.compatibility || {};
  if (!v?.source?.step && !v?.source?.mesh) h.push("Die Vorlage enthält keinen Körper.");
  if (kantenlaenge != null) {
    if (c.edgeLengthMin > 0 && kantenlaenge < c.edgeLengthMin) h.push(`Kante ${Math.round(kantenlaenge)} mm ist kürzer als erlaubt (min. ${c.edgeLengthMin} mm).`);
    if (c.edgeLengthMax > 0 && kantenlaenge > c.edgeLengthMax) h.push(`Kante ${Math.round(kantenlaenge)} mm ist länger als erlaubt (max. ${c.edgeLengthMax} mm).`);
    if (v?.anchor?.edgeLength > 0 && kantenlaenge + 1e-6 < v.anchor.edgeLength) h.push(`Das Detail ist ${v.anchor.edgeLength} mm lang, die Kante nur ${Math.round(kantenlaenge)} mm – es ragt über die Kante hinaus.`);
  }
  if (dicke != null && c.thickness > 0 && Math.abs(dicke - c.thickness) > (c.thicknessTolerance ?? 0.01)) h.push(`Das Detail ist für ${c.thickness} mm Blech gemacht, das Material hat ${dicke} mm.`);
  return h;
}
export const meshAusVorlage = (v) => { const bin = atob(v?.source?.mesh || ""), u8 = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i); return new Float32Array(u8.buffer); };
