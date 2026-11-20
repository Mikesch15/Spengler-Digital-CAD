// Spengler Digital CAD – App-Features → Kern-Kommandos (rein, ohne Kern, ohne Oberfläche)
// Damit die Oberfläche keine OCCT-Details kennt: sie liefert die Daten, die sie ohnehin hat
// (Rechenergebnis aus kern/geometrie.js, Material, Ebene {o,u,v,n}, Länge, Richtung, Versatz), hier entstehen Kommandos.
import { blechQuerschnitt, verschiebeProfil } from "./blech.js";

const kreuz = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

// Ebene der App ({ o, u, v, n }) → Kern-Ebene. Der Kern bildet v = n × u; eine linkshändige Ebene wäre gespiegelt → Fehler.
export function kernEbene(e, versatzNormale = 0) {
  if (!e?.u || !e?.n) throw new Error("Ebene fehlt");
  if (e.v && dot(kreuz(e.n, e.u), e.v) < 0.999) throw new Error("Ebene ist nicht rechtshändig (v ≠ n × u)");
  return { ursprung: e.o.map((w, i) => w + e.n[i] * versatzNormale), x: e.u, n: e.n };
}

// Blechteil (Vorlage, freies Profil, Blech aus Linienzug): Querschnitt aus res (berechne), extrudiert über die Länge.
// richtung: "normal" | "umgekehrt" | "symmetrisch" (wie koerper() in src/cad.js); versatz: [du, dv] in der Ebene.
export function blechTeilKommando({ res, t, ebene, laenge, richtung = "normal", versatz = [0, 0] }) {
  if (!(laenge > 0)) throw new Error("Länge muss grösser als 0 sein");
  const q = blechQuerschnitt(res, t);
  const start = richtung === "umgekehrt" ? -laenge : richtung === "symmetrisch" ? -laenge / 2 : 0;
  return {
    kommando: { op: "extrusion", profil: verschiebeProfil(q.profil, versatz[0], versatz[1]), ebene: kernEbene(ebene, start), hoehe: laenge },
    soll: { volumen: t * q.mitte * laenge, mitte: q.mitte, theta: q.theta, zuschnitt: res.zuschnitt },
  };
}

// Extrusion einer Skizze (Profile aus skizzeProfile.js) – wie koerperGeometrie(): Tiefe entlang der Ebenennormalen,
// richtung "umgekehrt" = nach hinten, "symmetrisch" = halb/halb. Ein Kommando je Aussenkontur (mit ihren Löchern).
export function extrusionKommandos({ profile, ebene, abstand, richtung = "eine" }) {
  if (!(abstand > 0)) throw new Error("Abstand muss grösser als 0 sein");
  const start = richtung === "umgekehrt" ? -abstand : richtung === "symmetrisch" ? -abstand / 2 : 0, e = kernEbene(ebene, start);
  return profile.map((p) => ({ op: "extrusion", profil: p.profil, loecher: p.loecher, ebene: e, hoehe: abstand }));
}
// Drehung einer Skizze um eine Achse der Skizze (Punkt a, Richtung d in u/v), Winkel in Grad, rechtshändig um d
// (wie LatheGeometry in drehGeometrie(): positiver Winkel dreht von der Profilseite zu Achse × Profilseite).
export function rotationKommandos({ profile, ebene, a, d, winkel }) {
  const e = kernEbene(ebene), w = (u, v) => [0, 1, 2].map((i) => ebene.u[i] * u + ebene.v[i] * v);
  const punkt = w(a[0], a[1]).map((x, i) => x + ebene.o[i]), richtung = w(d[0], d[1]);
  return profile.map((p) => {
    if (p.loecher.length) throw new Error("Drehung mit Löchern im Profil: noch nicht exakt");
    return { op: "rotation", profil: p.profil, ebene: e, winkel, achse: { punkt, richtung } };
  });
}

// Lage einer Extrusion entlang der Ebenennormalen: Boden h0 und Deckel h1 (h = Punkt · n)
export function extrusionsHoehen({ ebene, abstand, richtung = "eine" }) {
  const n = ebene.n, l = Math.hypot(...n), nn = n.map((v) => v / l), h = dot(ebene.o, nn);
  const start = richtung === "umgekehrt" ? -abstand : richtung === "symmetrisch" ? -abstand / 2 : 0;
  return { n: nn, h0: h + start, h1: h + start + abstand };
}
// Kanten einer extrudierten Form für «Abrunden/Fasen» wie in der App: "senkrecht" = gerade Kanten entlang der Extrusion
// (ohne Nähte), "quer" = Kanten in Boden- oder Deckelebene. topo: Ergebnis von { op: "topologie" }.
export function extrusionsKanten(topo, { n, h0, h1 }, art) {
  const auf = (k, hh) => [k.start, k.ende, k.mitte].every((p) => Math.abs(dot(p, n) - hh) < 1e-6);
  return topo.kanten.filter((k) => art === "senkrecht"
    ? !k.naht && k.richtung && Math.abs(Math.abs(dot(k.richtung, n)) - 1) < 1e-6
    : auf(k, h0) || auf(k, h1));
}
// Boden-/Deckelflächen einer Extrusion (für «Schale»: offen oben/unten/beide)
export function extrusionsFlaechen(topo, { n, h0, h1 }, offen) {
  const will = { oben: [h1], unten: [h0], beide: [h0, h1] }[offen] ?? [];
  return topo.flaechen.filter((f) => f.typ === "PLANE" && f.normale && Math.abs(Math.abs(dot(f.normale, n)) - 1) < 1e-6 && will.some((hh) => Math.abs(dot(f.mitte, n) - hh) < 1e-6));
}
// THREE.Matrix4 (spaltenweise elements) → 3×4 zeilenweise für { op: "matrix" }
export const matrixZeilen = (te) => [te[0], te[4], te[8], te[12], te[1], te[5], te[9], te[13], te[2], te[6], te[10], te[14]];
