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
