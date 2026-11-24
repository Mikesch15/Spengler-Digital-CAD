import { rueckVersatz } from "../richtung.js";
// Spengler Digital CAD – App-Features → Kern-Kommandos (rein, ohne Kern, ohne Oberfläche)
// Damit die Oberfläche keine OCCT-Details kennt: sie liefert die Daten, die sie ohnehin hat
// (Rechenergebnis aus kern/geometrie.js, Material, Ebene {o,u,v,n}, Länge, Richtung, Versatz), hier entstehen Kommandos.
import { werkzeugAuf } from "../flansch.js";
import { blechQuerschnitt, verschiebeProfil } from "./blech.js";
import { berechne } from "../geometrie.js";
import { freiesProfil } from "../profile.js";
import { folge } from "../details.js";
import { eckFaktoren } from "../flaechenblech.js";

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
  const start = -rueckVersatz(richtung, laenge);
  return {
    kommando: { op: "extrusion", profil: verschiebeProfil(q.profil, versatz[0], versatz[1]), ebene: kernEbene(ebene, start), hoehe: laenge },
    soll: { volumen: t * q.mitte * laenge, mitte: q.mitte, theta: q.theta, zuschnitt: res.zuschnitt },
  };
}

// Extrusion einer Skizze (Profile aus skizzeProfile.js) – wie koerperGeometrie(): Tiefe entlang der Ebenennormalen,
// richtung "umgekehrt" = nach hinten, "symmetrisch" = halb/halb. Ein Kommando je Aussenkontur (mit ihren Löchern).
export function extrusionKommandos({ profile, ebene, abstand, richtung = "eine" }) {
  if (!(abstand > 0)) throw new Error("Abstand muss grösser als 0 sein");
  const start = -rueckVersatz(richtung, abstand), e = kernEbene(ebene, start);
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
  const start = -rueckVersatz(richtung, abstand);
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

// ---------------------------------------------------------------- Flächenblech mit Kantenbausteinen (exakt)
// Querschnitt eines Bausteins wie bausteinKontur() in der App (kurzer Anlauf L auf der Fläche), aber mit exakten Bögen.
// xFlach: wo der Anlauf in die erste Biegung übergeht (x nach aussen ab der gezeichneten Kante) – bis dorthin ist es Fläche.
export function bausteinQuerschnitt(b0, m) {
  const b = werkzeugAuf(b0, m);
  for (const L of [1, 2, 4, 8, 16, 30]) {
    try {
      const { start, ops } = freiesProfil(0, folge(`${L} ${b.folge}`), m), res = berechne(start, ops, m.t, m.ri, m.k), v = +b.versatz || 0;
      const q = blechQuerschnitt(res, m.t), g = res.pfad[0];
      const pk = [q.profil.start, ...q.profil.segmente.flatMap((x) => [x.bis, x.bogenMitte].filter(Boolean))], xs = pk.map((p) => p[0] - L + v), ys = pk.map((p) => p[1]);
      return { profil: verschiebeProfil(q.profil, -L + v, 0), xFlach: (g?.typ === "linie" ? g.p2[0] : 0) - L + v, xmin: Math.min(...xs), xmax: Math.max(...xs), ymin: Math.min(...ys), ymax: Math.max(...ys) };
    } catch {}
  }
  return null;
}
const mal = (A, B) => { // 3×4-Matrizen (zeilenweise) verketten: A · B
  const r = [];
  for (let i = 0; i < 3; i++) for (let j = 0; j < 4; j++) r.push(A[i * 4] * B[j] + A[i * 4 + 1] * B[4 + j] + A[i * 4 + 2] * B[8 + j] + (j === 3 ? A[i * 4 + 3] : 0));
  return r;
};
const basisMatrix = (e) => [e.u[0], e.v[0], e.n[0], e.o[0], e.u[1], e.v[1], e.n[1], e.o[1], e.u[2], e.v[2], e.n[2], e.o[2]];
// Bauplan eines Blechs aus flaechenblech() (bl: { pts, gruppen, profile }) in der Ebene der Skizze, seite ±1 (Sichtseite).
// Korrekt gegenüber dem Anzeige-Netz: die Fläche endet an jeder Bausteinkante dort, wo die erste Biegung beginnt (xFlach),
// statt bis zur gezeichneten Kante zu laufen – sonst stünde unter der Biegung eine scharfe Plattenecke über.
// Ecken: dieselben Faktoren (Gehrung / bündig / schräg) wie Abwicklung und Netz (eckFaktoren).
export function flaechenblechPlan(bl, ebene, m, seite = 1) {
  const B = basisMatrix(ebene), t = m.t, s = seite === -1 ? -1 : 1;
  const richt = (a, b) => { const L = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1; return [(b[0] - a[0]) / L, (b[1] - a[1]) / L]; };
  const knick = (d1, d2) => Math.atan2(d1[0] * d2[1] - d1[1] * d2[0], d1[0] * d2[0] + d1[1] * d2[1]);
  const plan = { reliefs: [], platte: { op: "extrusion", profil: { start: bl.pts[0], segmente: bl.pts.slice(1).map((p) => ({ bis: p })) }, ebene: kernEbene(ebene, -t / 2), hoehe: t }, schnitte: [], prismen: [] };
  const ek = eckFaktoren(bl.gruppen, bl.profile, bl.opt);
  bl.gruppen.forEach((g, k) => {
    const p = bl.profile[k]; if (!p?.baustein) return;
    const bq = bausteinQuerschnitt(p.baustein, m); if (!bq) throw new Error(`Baustein «${p.baustein.name ?? p.baustein.folge}» lässt sich nicht rechnen`);
    for (let i = 1; i < g.punkte.length; i++) {
      const a = g.punkte[i - 1], b = g.punkte[i], L = Math.hypot(b[0] - a[0], b[1] - a[1]); if (L < 1e-6) continue;
      const d = richt(a, b);
      const k0 = i > 1 ? Math.tan(knick(richt(g.punkte[i - 2], a), d) / 2) : ek[k].k0, e0 = i > 1 ? 0 : ek[k].e0 || 0;
      const k1 = i < g.punkte.length - 1 ? Math.tan(knick(d, richt(b, g.punkte[i + 1])) / 2) : ek[k].k1, e1 = i < g.punkte.length - 1 ? 0 : ek[k].e1 || 0;
      // lokal: x nach aussen (d rechtwinklig), y = Sichtseite, z entlang der Kante ab a
      const lokal = [d[1], 0, d[0], a[0], -d[0], 0, d[1], a[1], 0, s, 0, 0], M = mal(B, lokal);
      const ky0 = i > 1 ? 0 : ek[k].ky0 || 0, ky1 = i < g.punkte.length - 1 ? 0 : ek[k].ky1 || 0, ecken = [[bq.xmin, bq.ymin], [bq.xmin, bq.ymax], [bq.xmax, bq.ymin], [bq.xmax, bq.ymax]];
      const z0 = Math.min(...ecken.map(([x, y]) => -x * k0 - y * ky0)) + e0 - 1, z1 = L + Math.max(...ecken.map(([x, y]) => x * k1 + y * ky1)) - e1 + 1;
      plan.prismen.push({
        extrusion: { op: "extrusion", profil: bq.profil, ebene: { ursprung: [0, 0, z0], x: [1, 0, 0], n: [0, 0, 1] }, hoehe: z1 - z0 },
        halbraeume: [{ punkt: [0, 0, e0], normale: [-k0, -ky0, -1] }, { punkt: [0, 0, L - e1], normale: [-k1, -ky1, 1] }],
        m: M,
      });
      const frS = i > 1 ? 0 : ek[k].fr0 || 0, frE = i < g.punkte.length - 1 ? 0 : ek[k].fr1 || 0, bg = p.res?.pfad?.find((e) => e.typ === "bogen");
      if ((frS > 0 || frE > 0) && bg) { // Freistellung: Biegezone endet vor der Gehrungsecke (Quader durch die Biegezone, nach dem Vereinigen abgezogen)
        const xe = bg.p2[0] - 100 + (p.versatz || 0), ye = bg.p2[1], x0 = Math.min(bq.xFlach, xe) - 1, x1 = Math.max(xe, bq.xFlach) + 0.01, y0 = Math.min(ye, -t) - 0.01, y1 = Math.max(ye, t) + 0.01;
        if (frS > 0) plan.reliefs.push({ quader: { min: [x0, y0, e0 - 5], max: [x1, y1, e0 + frS] }, m: M });
        if (frE > 0) plan.reliefs.push({ quader: { min: [x0, y0, L - e1 - frE], max: [x1, y1, L - e1 + 5] }, m: M });
      }
      if (bq.xFlach < -1e-9) plan.schnitte.push({ quader: { min: [bq.xFlach, -t, 0], max: [1, t, L] }, m: M }); // Fläche bis zum Biegebeginn kürzen
    }
  });
  return plan;
}
// Plan ausführen (x = Kommando-Funktion des Kerns): Fläche kürzen, Profile auf Länge/Gehrung schneiden, alles vereinigen
export async function baueFlaechenblech(x, plan) {
  let k = (await x(plan.platte)).id;
  for (const s of plan.schnitte) {
    const q = (await x({ op: "quader", ...s.quader })).id, w = (await x({ op: "matrix", ziel: q, m: s.m })).id;
    k = (await x({ op: "boolesch", art: "abziehen", a: k, b: w })).id;
  }
  for (const p of plan.prismen) {
    let z = (await x(p.extrusion)).id;
    for (const h of p.halbraeume) z = (await x({ op: "halbraum", ziel: z, ...h })).id;
    z = (await x({ op: "matrix", ziel: z, m: p.m })).id;
    k = (await x({ op: "boolesch", art: "vereinigen", a: k, b: z })).id;
  }
  for (const r of plan.reliefs || []) { const q = (await x({ op: "quader", ...r.quader })).id, w = (await x({ op: "matrix", ziel: q, m: r.m })).id; k = (await x({ op: "boolesch", art: "abziehen", a: k, b: w })).id; } // Freistellungen
  return k;
}
