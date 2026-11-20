// Tests: CAD-Kern (OCCT über kern/cad) – Referenzbibliothek nach Auftrag 5.3
// Jeder Fall prüft Erzeugung, B-Rep-Gültigkeit, Masse gegen analytische Werte (Toleranz angegeben),
// wo sinnvoll STEP-Roundtrip, Projektion/Schnitt und Abwicklung gegen kern/.
import { occtKern } from "../kern/cad/occt.js";
import { KernFehler, CODES, TOLERANZ } from "../kern/cad/schnittstelle.js";
import { blechQuerschnitt, profilGrenzen, verschiebeProfil, zuschnittAusVolumen } from "../kern/cad/blech.js";
import { zylinderAbwicklung, kegelAbwicklung, abwickelbarkeit } from "../kern/abwicklungRund.js";
import { berechne } from "../kern/geometrie.js";
import { MATERIALIEN } from "../kern/materialien.js";
import { bausteinProfil, BAUSTEINE_STANDARD } from "../kern/flaechenblech.js";

let fehler = 0;
const ok = (b, t) => { if (!b) { fehler++; console.error("✗", t); } else console.log("✓", t); };
const nahe = (a, b, rel = TOLERANZ.volumenRel, abs = 1e-6) => Math.abs(a - b) <= Math.max(abs, Math.abs(b) * rel);
const PI = Math.PI, t0 = performance.now();

const K = await occtKern();
const x = (k) => K.ausfuehren(k);
const eig = async (id) => x({ op: "eigenschaften", ziel: id });
const fehlerCode = async (k) => { try { await x(k); return null; } catch (e) { return e instanceof KernFehler ? e.code : "KEIN_KERNFEHLER"; } };
const zink = MATERIALIEN.find((m) => m.id === "zink07"); // t 0.7, ri 1.0, k 0.4 (Startwerte, nicht kalibriert)
console.log(`Kern geladen in ${(performance.now() - t0).toFixed(0)} ms`);

// ---------------------------------------------------------------- 1 Grundkörper (Toleranz: relativ 1e-9, exakte Rechnung)
{
  const q = await x({ op: "quader", min: [0, 0, 0], max: [100, 50, 20] }), e = await eig(q.id);
  ok(e.gueltig && e.geschlossen && nahe(e.volumen, 100000) && nahe(e.flaeche, 16000), "Quader: gültig, V 100000, A 16000");
  ok(e.grenzen.min.join() === "0,0,0" && e.grenzen.max.join() === "100,50,20" && e.schwerpunkt.every((v, i) => nahe(v, [50, 25, 10][i], 1e-9, 1e-9)), "Quader: Grenzen und Schwerpunkt");
  ok(e.anzahl.flaechen === 6 && e.anzahl.kanten === 12, "Quader: 6 Flächen, 12 Kanten");
  const z = await eig((await x({ op: "zylinder", r: 20, h: 50, basis: [10, 0, 0], achse: [1, 0, 0] })).id);
  ok(z.gueltig && nahe(z.volumen, PI * 400 * 50) && nahe(z.flaeche, 2 * PI * 20 * 50 + 2 * PI * 400) && nahe(z.grenzen.max[0], 60), "Zylinder r20 h50 entlang X: V, A, Lage");
  const kg = await eig((await x({ op: "kegel", r1: 30, r2: 0, h: 40 })).id);
  ok(kg.gueltig && nahe(kg.volumen, PI * 900 * 40 / 3) && nahe(kg.flaeche, PI * 30 * 50 + PI * 900), "Kegel r30 h40: V und Mantel (s 50)");
  const ks = await eig((await x({ op: "kegel", r1: 30, r2: 10, h: 40, basis: [0, 0, 5] })).id);
  ok(ks.gueltig && nahe(ks.volumen, (PI * 40 / 3) * (900 + 300 + 100)) && nahe(ks.grenzen.min[2], 5), "Kegelstumpf r30/r10 h40");
  const ku = await eig((await x({ op: "kugel", r: 25, mitte: [1, 2, 3] })).id);
  ok(ku.gueltig && nahe(ku.volumen, (4 / 3) * PI * 25 ** 3) && nahe(ku.flaeche, 4 * PI * 625) && ku.schwerpunkt.every((v, i) => nahe(v, [1, 2, 3][i], 1e-9, 1e-6)), "Kugel r25: V, A, Schwerpunkt");
}

// ---------------------------------------------------------------- 2 Boolesch, Bohrungen, Senkung
const platte = (await x({ op: "quader", min: [0, 0, 0], max: [100, 50, 20] })).id;
{
  const loch = await x({ op: "zylinder", r: 10, h: 40, basis: [50, 25, -10] });
  const d = await eig((await x({ op: "boolesch", art: "abziehen", a: platte, b: loch.id })).id);
  ok(d.gueltig && nahe(d.volumen, 100000 - PI * 100 * 20), "Differenz Quader − Zylinder");
  ok(nahe((await eig(platte)).volumen, 100000), "Eingaben bleiben unverändert (Kopie-Semantik)");
  const v = await eig((await x({ op: "boolesch", art: "vereinigen", a: platte, b: (await x({ op: "quader", min: [90, 0, 0], max: [190, 50, 20] })).id })).id);
  ok(v.gueltig && nahe(v.volumen, 190000) && v.anzahl.flaechen === 6, "Vereinigung mit Überlappung, Flächen zusammengeführt");
  const s = await eig((await x({ op: "boolesch", art: "schneiden", a: platte, b: (await x({ op: "zylinder", r: 30, h: 50 })).id })).id);
  ok(s.gueltig && nahe(s.volumen, PI * 900 / 4 * 20), "Schnittmenge Quader ∩ Zylinder");
  ok(await fehlerCode({ op: "boolesch", art: "schneiden", a: platte, b: (await x({ op: "quader", min: [500, 0, 0], max: [600, 1, 1] })).id }) === CODES.FEHLGESCHLAGEN, "Leere Schnittmenge → Fehler statt leerem Körper");
  const b1 = await eig((await x({ op: "bohrung", ziel: platte, punkt: [30, 25, 20], richtung: [0, 0, -1], d: 8, durch: true })).id);
  ok(b1.gueltig && nahe(b1.volumen, 100000 - PI * 16 * 20), "Durchgangsbohrung Ø8");
  const b2 = await eig((await x({ op: "bohrung", ziel: platte, punkt: [30, 25, 20], richtung: [0, 0, -1], d: 8, tiefe: 12 })).id);
  ok(b2.gueltig && nahe(b2.volumen, 100000 - PI * 16 * 12), "Sackloch Ø8 × 12 (flacher Grund)");
  const b3 = await eig((await x({ op: "bohrung", ziel: platte, punkt: [50, 25, 20], richtung: [0, 0, -1], d: 10, durch: true, senkung: { d: 20, winkel: 90 } })).id);
  ok(b3.gueltig && nahe(b3.volumen, 100000 - PI * 25 * 20 - (PI * 5 / 3 * (100 + 25 + 50) - PI * 25 * 5)), "Senkbohrung Ø10 / Senkung Ø20 × 90°");
  ok(true, "Gewinde: NICHT umgesetzt (weder Darstellung noch Geometrie) – offen");
}

// ---------------------------------------------------------------- 3 Verrunden, Fasen, Schale, Muster, Transformieren
{
  const r = await eig((await x({ op: "verrunden", ziel: platte, r: 2, kanten: [{ punkt: [100, 50, 10] }] })).id);
  ok(r.gueltig && nahe(r.volumen, 100000 - (4 - PI) * 20), "Verrunden r2 an einer Kante (über Punkt)");
  const f = await eig((await x({ op: "fasen", ziel: platte, d: 3, kanten: [{ punkt: [100, 50, 10] }, { punkt: [0, 0, 10] }] })).id);
  ok(f.gueltig && nahe(f.volumen, 100000 - 2 * 4.5 * 20), "Fasen 3 mm an zwei Kanten");
  const zuGross = await fehlerCode({ op: "verrunden", ziel: platte, r: 60, kanten: [{ punkt: [100, 50, 10] }] }); // breiter als die 50-mm-Fläche
  ok(zuGross === CODES.FEHLGESCHLAGEN || zuGross === CODES.UNGUELTIG, `Zu grosser Radius → sauberer Fehler (${zuGross})`);
  const sch = await eig((await x({ op: "schale", ziel: platte, dicke: 2, offen: [{ art: "flaeche", typ: "PLANE", mitte: [50, 25, 20], normale: [0, 0, 1] }] })).id);
  ok(sch.gueltig && nahe(sch.volumen, 100000 - 96 * 46 * 18, 1e-7), "Schale 2 mm, Deckfläche offen (innen)");
  const m = await eig((await x({ op: "muster", ziel: (await x({ op: "zylinder", r: 5, h: 10 })).id, linear: { richtung: [1, 0, 0], anzahl: 4, abstand: 20 } })).id);
  ok(m.gueltig && nahe(m.volumen, 4 * PI * 25 * 10) && m.anzahl.koerper === 4, "Lineares Muster 4×");
  const sp = await eig((await x({ op: "transformieren", ziel: platte, spiegeln: { punkt: [0, 0, 0], normale: [1, 0, 0] } })).id);
  ok(sp.gueltig && nahe(sp.grenzen.min[0], -100) && nahe(sp.volumen, 100000), "Spiegeln an YZ-Ebene");
  const dr = await eig((await x({ op: "transformieren", ziel: platte, drehen: { winkel: 90, punkt: [0, 0, 0], achse: [0, 0, 1] }, verschieben: [0, 0, 5] })).id);
  ok(nahe(dr.grenzen.min[0], -50, 1e-9, 1e-9) && nahe(dr.grenzen.max[1], 100, 1e-9, 1e-9) && nahe(dr.grenzen.min[2], 5), "Drehen 90° + Verschieben");
}

// ---------------------------------------------------------------- 4 Sweep, Loft, Projektion, Schnitt
{
  const R = 50, pfad = { start: [0, 0], segmente: [{ bis: [0, 100] }, { bis: [R, 100 + R], bogenMitte: [R - R * Math.cos(PI / 4), 100 + R * Math.sin(PI / 4)] }] };
  const sw = await eig((await x({ op: "sweep", pfad, kreis: 5 })).id);
  ok(sw.gueltig && nahe(sw.volumen, PI * 25 * (100 + R * PI / 2)), "Sweep Kreis r5 entlang Gerade + Bogen (Pappus)");
  const q = (a) => ({ start: [-a / 2, -a / 2], segmente: [{ bis: [a / 2, -a / 2] }, { bis: [a / 2, a / 2] }, { bis: [-a / 2, a / 2] }] });
  const lo = await eig((await x({ op: "loft", schnitte: [{ profil: q(40), ebene: { ursprung: [0, 0, 0], x: [1, 0, 0], n: [0, 0, 1] } }, { profil: q(20), ebene: { ursprung: [0, 0, 50], x: [1, 0, 0], n: [0, 0, 1] } }], regelflaeche: true })).id);
  ok(lo.gueltig && nahe(lo.volumen, (50 / 3) * (1600 + 400 + 800)), "Loft Quadrat 40 → 20 (Pyramidenstumpf)");
  // Zeichnungsprojektion: Quader mit Durchgangsbohrung Ø20, Ansicht von vorn
  const bk = await x({ op: "bohrung", ziel: platte, punkt: [50, 25, 20], richtung: [0, 0, -1], d: 20, durch: true });
  const p = await x({ op: "projektion", ziel: bk.id, ansicht: "front" });
  ok(nahe(p.laengeSichtbar, 2 * (100 + 20), 1e-9, 1e-6), `Projektion vorn: Umriss sichtbar 240 mm (${p.laengeSichtbar.toFixed(3)})`);
  const senk = p.verdeckt.filter((l) => Math.abs(l[0][0] - l.at(-1)[0]) < 1e-6 && Math.abs(Math.abs(l[0][1] - l.at(-1)[1]) - 20) < 1e-6 && [40, 60].some((xx) => Math.abs(l[0][0] - xx) < 1e-6));
  ok(senk.length === 2, "Projektion vorn: Bohrungsmantel als 2 verdeckte Linien bei x 40/60");
  // Hinweis Phase E: HLR liefert auch verdeckte Kanten, die genau unter sichtbaren liegen (Rückseite) – für die Zeichnung ausblenden
  const s = await x({ op: "schnitt", ziel: bk.id, ebene: { punkt: [0, 25, 0], normale: [0, 1, 0] } });
  ok(nahe(s.flaeche, 100 * 20 - 20 * 20), "Schnitt durch Bohrungsmitte: Schnittfläche 1600 mm²");
}

// ---------------------------------------------------------------- 5 Topologie-Referenzen und Tessellierung
{
  const a = await x({ op: "quader", min: [0, 0, 0], max: [100, 50, 20] }), top = await x({ op: "topologie", ziel: a.id });
  const kante = top.kanten.find((k) => k.typ === "LINE" && k.mitte[0] === 100 && k.mitte[1] === 50); // senkrechte Kante hinten rechts
  ok(!!kante && kante.laenge === 20, "Topologie: Kantensignatur (Typ, Mitte, Länge, Richtung)");
  const b = await x({ op: "quader", min: [0, 0, 0], max: [100, 50, 35] }); // Parameteränderung: Höhe 20 → 35
  const r = await eig((await x({ op: "verrunden", ziel: b.id, r: 3, kanten: [kante] })).id);
  ok(r.gueltig && nahe(r.volumen, 100 * 50 * 35 - (9 - 9 * PI / 4) * 35), "Referenz überlebt Höhenänderung (gleiche Kante wiedergefunden)");
  const c = await x({ op: "quader", min: [0, 0, 0], max: [80, 50, 20] }); // Kante verschoben → nicht still falsch zuordnen
  ok(await fehlerCode({ op: "verrunden", ziel: c.id, r: 3, kanten: [kante] }) === CODES.REFERENZ, "Verschwundene Kante → Fehler REFERENZ");
  const fl = top.flaechen.find((f) => f.typ === "PLANE" && f.normale?.[2] === 1);
  ok(fl && fl.flaeche === 5000, "Topologie: Flächensignatur (Normale, Fläche)");
  const n = await x({ op: "tessellieren", ziel: (await x({ op: "bohrung", ziel: a.id, punkt: [50, 25, 20], richtung: [0, 0, -1], d: 20, durch: true })).id });
  const dreiecke = n.indizes.length / 3, abgedeckt = n.flaechen.reduce((s, f) => s + f.anzahl, 0);
  ok(n.flaechen.every((f) => f.index >= 0) && n.kanten.every((k) => k.index >= 0) && abgedeckt === n.indizes.length, `Tessellierung: alle ${dreiecke} Dreiecke einer Fläche, alle Kanten einer Kante zugeordnet`);
  let V = 0; const P = n.positionen, I = n.indizes;
  for (let i = 0; i < I.length; i += 3) { const [p, q, s] = [I[i], I[i + 1], I[i + 2]].map((j) => [P[3 * j], P[3 * j + 1], P[3 * j + 2]]); V += (p[0] * (q[1] * s[2] - q[2] * s[1]) - p[1] * (q[0] * s[2] - q[2] * s[0]) + p[2] * (q[0] * s[1] - q[1] * s[0])) / 6; }
  ok(Math.abs(V - (100000 - PI * 100 * 20)) / 93716 < 0.005, `Netzvolumen ≈ exaktes Volumen (Δ ${(V - (100000 - PI * 100 * 20)).toFixed(1)} mm³, Sehne ${TOLERANZ.netz} mm) – Netz nur Anzeige`);
}

// ---------------------------------------------------------------- 6 STEP-Roundtrip
{
  const z = (await x({ op: "bohrung", ziel: platte, punkt: [50, 25, 20], richtung: [0, 0, -1], d: 10, durch: true, senkung: { d: 20 } })).id, v0 = (await eig(z)).volumen;
  const { text } = await x({ op: "stepExport", ziele: [z], namen: ["Platte"] });
  ok(/^ISO-10303-21;/.test(text) && /CYLINDRICAL_SURFACE/.test(text) && /CONICAL_SURFACE/.test(text) && /SI_UNIT\(\.MILLI\.,\.METRE\.\)/.test(text), "STEP-Export: exakte Zylinder-/Kegelflächen, Einheit mm");
  const { ids } = await x({ op: "stepImport", text }), e = await eig(ids[0]);
  ok(ids.length === 1 && e.gueltig && nahe(e.volumen, v0), "STEP-Import: ein gültiger Körper, Volumen identisch");
}

// ---------------------------------------------------------------- 7 Spengler-Referenzteile (Material Titanzink 0.7, ri 1.0, k 0.4)
const L = 1000; // Bauteillänge
async function blechTeil(name, start, ops, { pruefeZuschnitt = true } = {}) {
  const res = berechne(start, ops, zink.t, zink.ri, zink.k), q = blechQuerschnitt(res, zink.t);
  const id = (await x({ op: "extrusion", profil: q.profil, hoehe: L })).id, e = await eig(id);
  ok(e.gueltig && e.anzahl.koerper === 1 && nahe(e.volumen, zink.t * q.mitte * L), `${name}: gültig, V = t·L_Mitte·Länge`);
  if (pruefeZuschnitt) {
    const z = zuschnittAusVolumen(e.volumen, zink.t, L, zink.k, q.theta);
    ok(Math.abs(z - res.zuschnitt) < 1e-6, `${name}: Zuschnitt aus 3D ${z.toFixed(4)} = Abwicklung ${res.zuschnitt.toFixed(4)} mm`);
  }
  return { id, res, q };
}
const sch = (l) => ({ typ: "schenkel", L: l }), bg = (w, r = null, modus = "sharp") => ({ typ: "biegung", winkel: w, ri: r, modus });
{
  await blechTeil("Einfach abgekantet 40/60", 0, [sch(40), bg(90), sch(60)]);
  const ortgang = await blechTeil("Mehrfach gekantet (Ortgang 30/50/80/50/15)", 0, [sch(30), bg(90), sch(50), bg(90), sch(80), bg(-90), sch(50), bg(-135), sch(15)]);
  await blechTeil("Umschlag 50 + U 10", 0, [sch(50), { typ: "biegung", winkel: 180, ri: null, modus: "hem" }, sch(10)]);
  // Doppelstehfalz aus der Kantenbaustein-Kurzschrift (kern/flaechenblech.js)
  for (const id of ["dsf-u", "dsf-o"]) {
    const b = BAUSTEINE_STANDARD.find((v) => v.id === id), bp = bausteinProfil(b, zink), q = blechQuerschnitt(bp.res, zink.t);
    const e = await eig((await x({ op: "extrusion", profil: q.profil, hoehe: L })).id);
    ok(e.gueltig && nahe(e.volumen, zink.t * q.mitte * L), `${b.name} («${b.folge}»): gültiger Körper aus Kurzschrift`);
  }
  // Halbrunde Rinne: Wulst (Rollung 270°, ri 8), Rinnenkörper (180°, ri 62.5), hinten 20, Wasserfalz 15
  const rinne = await blechTeil("Halbrunde Rinne mit Wulst und Wasserfalz", 180, [sch(0), bg(-270, 8, "tangent"), sch(0), bg(180, 62.5, "tangent"), sch(20), bg(-90), sch(15)]);
  // Gehrung / Rinnenwinkel 90°: zwei gleiche Teile, an der Winkelhalbierenden verschnitten, vereinigt
  async function gehrung(name, q, laenge = 400) {
    const g = profilGrenzen(q.profil), pr = verschiebeProfil(q.profil, -g.u0, 0); // Querschnitt ab u = 0 nach aussen
    const roh = (await x({ op: "extrusion", profil: pr, hoehe: laenge })).id;                       // x = u, y = v, z ∈ [0, L]
    const A = (await x({ op: "transformieren", ziel: roh, verschieben: [0, 0, -laenge] })).id;     // z ∈ [−L, 0]
    const B = (await x({ op: "transformieren", ziel: roh, drehen: { winkel: 90, punkt: [0, 0, 0], achse: [0, 1, 0] } })).id; // läuft in +x
    const gr = 4 * laenge, H = (await x({ op: "transformieren", ziel: (await x({ op: "quader", min: [-gr, -gr, 0], max: [gr, gr, 2 * gr] })).id, drehen: { winkel: 45, punkt: [0, 0, 0], achse: [0, 1, 0] } })).id; // Halbraum x + z ≥ 0
    const Am = (await x({ op: "boolesch", art: "abziehen", a: A, b: H })).id, Bm = (await x({ op: "boolesch", art: "schneiden", a: B, b: H })).id;
    const ue = await x({ op: "ueberschneidung", a: Am, b: Bm }), vA = (await eig(Am)).volumen, vB = (await eig(Bm)).volumen;
    const U = await eig((await x({ op: "boolesch", art: "vereinigen", a: Am, b: Bm })).id);
    ok(U.gueltig && ue.volumen === 0 && nahe(U.volumen, vA + vB, 1e-9) && nahe(vA, vB, 1e-9), `${name}: gültig, Überschneidung 0, symmetrisch, V = V_A + V_B`);
    return U;
  }
  await gehrung("Gehrung 45° Ortgangprofil (Aussenecke)", ortgang.q);
  await gehrung("Rinnenwinkel 90° (Gehrung)", rinne.q);
  // Zylinder- und Kegelsegment gegen kern/abwicklungRund.js
  const t = zink.t, k = zink.k;
  const zyl = await eig((await x({ op: "rotation", profil: { start: [200 - t / 2, 0], segmente: [{ bis: [200 + t / 2, 0] }, { bis: [200 + t / 2, 300] }, { bis: [200 - t / 2, 300] }] }, winkel: 90 })).id);
  const za = zylinderAbwicklung({ rm: 200, t, k, winkel: 90, hoehe: 300 });
  ok(zyl.gueltig && nahe(zyl.volumen / t / 300 + (k - 0.5) * t * PI / 2, za.breite, 1e-9), `Zylindersegment Rm200 90°: Abwicklung ${za.breite.toFixed(4)} × 300 = 3D`);
  const r1 = 200, r2 = 100, h = 150, s = Math.hypot(r1 - r2, h), nx = h / s, ny = (r1 - r2) / s, pp = (r, z, d) => [r + nx * d, z + ny * d];
  const keg = await eig((await x({ op: "rotation", profil: { start: pp(r1, 0, -t / 2), segmente: [{ bis: pp(r1, 0, t / 2) }, { bis: pp(r2, h, t / 2) }, { bis: pp(r2, h, -t / 2) }] }, winkel: 90 })).id);
  const ka = kegelAbwicklung({ r1, r2, h, t, k: 0.5, winkel: 90 }), kk = kegelAbwicklung({ r1, r2, h, t, k, winkel: 90 });
  ok(keg.gueltig && nahe(keg.volumen / t, ka.flaeche, 1e-9), `Kegelsegment 200→100 h150 90°: Mittelfläche 3D = Kreisringsektor ${ka.flaeche.toFixed(2)} mm²`);
  ok(nahe(kk.phi, 90 * (r1 - r2) / s) && nahe(kk.R1 - kk.R2, s, 1e-12) && kk.R1 < ka.R1, `Kegelabwicklung K-Faser: R ${kk.R1.toFixed(2)}/${kk.R2.toFixed(2)}, φ ${kk.phi.toFixed(3)}°`);
  ok(abwickelbarkeit([0, 0, 1e-12]).abwickelbar && !abwickelbarkeit([0, 2e-5]).abwickelbar, "Abwickelbarkeit: doppelt gekrümmt wird als nicht exakt gemeldet");
}

// ---------------------------------------------------------------- 8 Lukarnen-Seitenblech und Kaminanschluss (Meisterschaftsmodell, vereinfacht)
{
  // Lukarnen-Seitenblech: Wange in der senkrechten Ebene x = 0 entlang der Falllinie, unten 90° auf die Dachfläche (30°) abgekantet,
  // oben waagrecht (z ≤ 700) und vorne senkrecht (y ≥ −300) beschnitten. Aufbau im Dach-Koordinatensystem, dann um X gedreht.
  const neig = 30, tan = Math.tan(neig * PI / 180), cos = Math.cos(neig * PI / 180);
  const lres = berechne(-90, [sch(900), bg(90), sch(40)], zink.t, zink.ri, zink.k), lq = blechQuerschnitt(lres, zink.t);
  // Querschnitt: u = x, v = Dachnormale; Mittellinie startet oben (v = 900 + t/2) und endet als Abkantung t/2 über dem Dach
  const lprof = verschiebeProfil(lq.profil, zink.t / 2, 900 + zink.t / 2);
  const streifen = (await x({ op: "extrusion", profil: lprof, ebene: { ursprung: [0, 0, 0], x: [1, 0, 0], n: [0, -1, 0] }, hoehe: -1600 })).id; // y ∈ [0, 1600]
  const imDach = (await x({ op: "transformieren", ziel: streifen, drehen: { winkel: neig, punkt: [0, 0, 0], achse: [1, 0, 0] }, verschieben: [0, -600 * cos, -600 * Math.sin(neig * PI / 180)] })).id; // entlang der Falllinie
  const deckel = (await x({ op: "quader", min: [-500, -3000, 700], max: [500, 3000, 3000] })).id, front = (await x({ op: "quader", min: [-500, -3000, -3000], max: [500, -300, 3000] })).id;
  const wange = (await x({ op: "boolesch", art: "abziehen", a: (await x({ op: "boolesch", art: "abziehen", a: imDach, b: deckel })).id, b: front })).id;
  const w = await eig(wange);
  ok(w.gueltig && w.anzahl.koerper === 1 && w.anzahl.flaechen >= 9 && w.grenzen.max[2] <= 700 + 1e-6 && w.grenzen.min[1] >= -300 - 1e-6, `Lukarnen-Seitenblech: gültiger Einzelkörper, oben/vorn beschnitten (${w.anzahl.flaechen} Flächen)`);
  const dachL = (await x({ op: "transformieren", ziel: (await x({ op: "quader", min: [-600, -1500, -24], max: [600, 1500, 0] })).id, drehen: { winkel: neig, punkt: [0, 0, 0], achse: [1, 0, 0] } })).id;
  ok((await x({ op: "abstand", a: wange, b: dachL })).abstand < 1e-6 && (await x({ op: "ueberschneidung", a: wange, b: dachL })).volumen < 1e-6, "Lukarnen-Seitenblech: Abkantung liegt auf der Dachfläche (Abstand 0, keine Durchdringung)");
  const { ids } = await x({ op: "stepImport", text: (await x({ op: "stepExport", ziele: [wange] })).text });
  ok(nahe((await eig(ids[0])).volumen, w.volumen, 1e-9), "Lukarnen-Seitenblech: STEP-Roundtrip ohne Volumenabweichung");
  ok(true, "Lukarnen-Seitenblech: keine analytische Volumenreferenz (beschnittene Freiform-Kontur) – geprüft über Gültigkeit, Lage, STEP");

  // Kaminanschluss: Kamin 400×400 senkrecht durch Dachfläche 30°; Brustblech (talseitig) und Nackenblech (bergseitig) liegen exakt an
  const kamin = (await x({ op: "quader", min: [-200, -200, -400], max: [200, 200, 1000] })).id;
  const dach = (await x({ op: "transformieren", ziel: (await x({ op: "quader", min: [-900, -800, -24], max: [900, 800, 0] })).id, drehen: { winkel: neig, punkt: [0, 0, 0], achse: [1, 0, 0] } })).id;
  const dachMitLoch = (await x({ op: "boolesch", art: "abziehen", a: dach, b: kamin })).id;
  const d = await eig(dachMitLoch);
  ok(d.gueltig && nahe(d.volumen, 1800 * 1600 * 24 - 400 * (400 / cos) * 24, 1e-9), "Dachfläche mit Kaminausschnitt: V exakt (schräger Durchbruch)");
  // Querschnitte in der Ebene u = y, v = z (x = Breite); Mittellinien-Ecke = Schnitt «t/2 vor der Kaminwand» mit «t/2 über dem Dach»
  const anschluss = async (name, yWand, seite, knick, hoch, lappen) => {
    const res = berechne(-90, [sch(hoch), bg(knick), sch(lappen)], zink.t, zink.ri, zink.k), q = blechQuerschnitt(res, zink.t);
    const yc = yWand + seite * zink.t / 2, zc = yc * tan + zink.t / (2 * cos);
    return (await x({ op: "extrusion", profil: verschiebeProfil(q.profil, yc, zc + hoch), ebene: { ursprung: [-260, 0, 0], x: [0, 1, 0], n: [1, 0, 0] }, hoehe: 520 })).id;
  };
  const brust = await anschluss("Brustblech", -200, -1, -60, 150, 120), nacken = await anschluss("Nackenblech", 200, 1, 120, 150, 150);
  for (const [n, b] of [["Brustblech", brust], ["Nackenblech", nacken]]) {
    const e = await eig(b), aK = (await x({ op: "abstand", a: b, b: kamin })).abstand, aD = (await x({ op: "abstand", a: b, b: dachMitLoch })).abstand;
    const kK = (await x({ op: "ueberschneidung", a: b, b: kamin })).volumen, kD = (await x({ op: "ueberschneidung", a: b, b: dachMitLoch })).volumen;
    ok(e.gueltig && aK < 1e-6 && aD < 1e-6 && kK < 1e-6 && kD < 1e-6, `${n}: liegt an Kamin und Dach an (Abstände ${aK.toExponential(1)}/${aD.toExponential(1)}), keine Durchdringung`);
  }
  const alle = (await x({ op: "boolesch", art: "vereinigen", a: (await x({ op: "boolesch", art: "vereinigen", a: kamin, b: dachMitLoch })).id, b: (await x({ op: "boolesch", art: "vereinigen", a: brust, b: nacken })).id })).id;
  const ae = await eig(alle);
  ok(ae.gueltig, `Kaminanschluss gesamt: gültig (${ae.anzahl.koerper} Körper, ${ae.anzahl.flaechen} Flächen)`);
  const proj = await x({ op: "projektion", ziel: dachMitLoch, ansicht: "top" });
  ok(proj.sichtbar.length > 0 && proj.laengeSichtbar > 2 * (1800 + 1600 * cos), "Kaminanschluss: Draufsicht aus exakter Geometrie (Umriss + Ausschnitt)");
  const sn = await x({ op: "schnitt", ziel: dachMitLoch, ebene: { punkt: [0, 0, 0], normale: [1, 0, 0] } });
  ok(nahe(sn.flaeche, (1600 - 400 / cos) * 24, 1e-9), "Kaminanschluss: Längsschnitt durch Dach und Ausschnitt, Schnittfläche exakt");
  const { ids: ka } = await x({ op: "stepImport", text: (await x({ op: "stepExport", ziele: [kamin, dachMitLoch, brust, nacken], namen: ["Kamin", "Dach", "Brustblech", "Nackenblech"] })).text });
  ok(ka.length === 4, "Kaminanschluss: STEP mit 4 getrennten Körpern hin und zurück");
  ok(true, "Kaminanschluss: Seitenbleche (Kehlen zur Dachfläche) noch nicht modelliert – offen");
}

// ---------------------------------------------------------------- 9 Eingabe- und Fehlerfälle
{
  ok(await fehlerCode({ op: "zylinder", r: -1, h: 10 }) === CODES.EINGABE, "Negativer Radius → EINGABE");
  ok(await fehlerCode({ op: "quader", min: [0, 0, 0], max: [0, 1, 1] }) === CODES.EINGABE, "Quader ohne Ausdehnung → EINGABE");
  ok(await fehlerCode({ op: "eigenschaften", ziel: "k999999" }) === CODES.UNBEKANNT_ID, "Unbekannte Kennung → UNBEKANNT_ID");
  ok(await fehlerCode({ op: "gibtsnicht" }) === CODES.NICHT_UNTERSTUETZT, "Unbekanntes Kommando → NICHT_UNTERSTUETZT");
  const selbst = { start: [0, 0], segmente: [{ bis: [10, 10] }, { bis: [10, 0] }, { bis: [0, 10] }] }; // Achterschleife
  const c = await fehlerCode({ op: "extrusion", profil: selbst, hoehe: 5 });
  ok(c === CODES.UNGUELTIG || c === CODES.FEHLGESCHLAGEN, `Selbstüberschneidendes Profil → kein Körper (${c})`);
}

// ---------------------------------------------------------------- 10a App-Features → Kern (Vorbereitung C1)
{
  const { blechTeilKommando, kernEbene } = await import("../kern/cad/featureBau.js");
  const { BASIS } = await import("../kern/ebenen.js");
  const res = berechne(0, [sch(40), bg(90), sch(60)], zink.t, zink.ri, zink.k);
  for (const [name, e] of Object.entries(BASIS)) for (const richtung of ["normal", "umgekehrt", "symmetrisch"]) {
    const { kommando, soll } = blechTeilKommando({ res, t: zink.t, ebene: e, laenge: 500, richtung, versatz: [10, 0] });
    const k = await eig((await x(kommando)).id);
    const n = e.n, lo = Math.min(...[0, 1, 2].map((i) => n[i] ? k.grenzen.min[i] * n[i] : Infinity)), hi = Math.max(...[0, 1, 2].map((i) => n[i] ? k.grenzen.max[i] * n[i] : -Infinity));
    const erw = richtung === "umgekehrt" ? [-500, 0] : richtung === "symmetrisch" ? [-250, 250] : [0, 500];
    const lage = [0, 1, 2].filter((i) => n[i]).every((i) => nahe(n[i] > 0 ? k.grenzen.min[i] : -k.grenzen.max[i], erw[0], 1e-9, 1e-6));
    if (!(k.gueltig && nahe(k.volumen, soll.volumen) && lage)) ok(false, `Blechteil Ebene ${name} ${richtung}: V ${k.volumen} / ${soll.volumen}, Grenzen ${JSON.stringify(k.grenzen)}`);
  }
  ok(true, "App-Blechteil → Kern: alle 3 Grundebenen × 3 Richtungen gültig, V exakt, Lage entlang der Normalen");
  let fehlt = null; try { kernEbene({ o: [0, 0, 0], u: [1, 0, 0], v: [0, -1, 0], n: [0, 0, 1] }); } catch (e) { fehlt = e.message; }
  ok(/rechtshändig/.test(fehlt ?? ""), "Linkshändige Ebene wird abgewiesen (keine gespiegelten Teile)");
}

// ---------------------------------------------------------------- 10b Skizzenelemente → exakte Profile (Vorbereitung C2)
{
  const { skizzenProfile, NichtExakt } = await import("../kern/cad/skizzeProfile.js");
  const ex = async (els, h = 10) => { const ps = skizzenProfile(els); let V = 0; for (const p of ps) V += (await eig((await x({ op: "extrusion", profil: p.profil, loecher: p.loecher, hoehe: h })).id)).volumen; return { V, ps }; };
  // Rechteck 100×50 mit Kreisloch r10 und Langloch (Länge 30 zwischen den Mittelpunkten, r 5)
  const a = await ex([{ art: "rechteck", a: [0, 0], b: [100, 50] }, { art: "kreis", c: [25, 25], r: 10 }, { art: "langloch", a: [55, 25], b: [85, 25], r: 5 }]);
  ok(a.ps.length === 1 && a.ps[0].loecher.length === 2 && nahe(a.V, (5000 - PI * 100 - (30 * 10 + PI * 25)) * 10), "Skizze: Rechteck mit Kreis- und Langloch → exakter Körper mit 2 Löchern");
  // Geschlossener Linienzug mit Eckradius 10 an allen 4 Ecken (Quadrat 60)
  const r = await ex([{ art: "linie", pts: [[0, 0], [60, 0], [60, 60], [0, 60]], geschlossen: true, radien: { 0: 10, 1: 10, 2: 10, 3: 10 } }]);
  ok(nahe(r.V, (3600 - 4 * (100 - PI * 25)) * 10), "Skizze: Linienzug mit 4 Eckradien r10 – exakte Rundungen");
  // Kette aus Linien und Bogen (Halbkreis-Deckel), ein Stück umgekehrt gezeichnet
  const k = await ex([{ art: "linie", pts: [[0, 0], [40, 0]] }, { art: "linie", pts: [[40, 30], [40, 0]] }, { art: "bogen", a: [40, 30], b: [0, 30], m: [20, 50] }, { art: "linie", pts: [[0, 30], [0, 0]] }]);
  ok(k.ps.length === 1 && nahe(k.V, (40 * 30 + PI * 400 / 2) * 10), "Skizze: Kette Linie–Linie(umgekehrt)–Bogen–Linie → exakt");
  const el = await ex([{ art: "ellipse", c: [10, 20], a: [40, 40], r2: 12 }]);
  ok(nahe(el.V, PI * Math.hypot(30, 20) * 12 * 10), "Skizze: gedrehte Ellipse exakt (V = π·a·b·h)");
  // Spline: exakte Bézier-Segmente liegen auf der Catmull-Rom-Kurve der App (splinePunkte)
  const { splineSegmente } = await import("../kern/cad/skizzeProfile.js"), { splinePunkte } = await import("../kern/skizze.js");
  const sp = [[0, 0], [30, 25], [70, 10], [100, 40]], seg = splineSegmente(sp, false), app = splinePunkte(sp, false, 16);
  let maxD = 0; seg.forEach((g, i) => { const a = sp[i], [c1, c2] = g.bezier, b = g.bis; for (let k = 0; k < 16; k++) { const t = k / 16, u = 1 - t, q = [0, 1].map((j) => u * u * u * a[j] + 3 * u * u * t * c1[j] + 3 * u * t * t * c2[j] + t * t * t * b[j]); const r = app[i * 16 + k]; maxD = Math.max(maxD, Math.hypot(q[0] - r[0], q[1] - r[1])); } });
  ok(maxD < 0.05, `Skizze: Spline als Bézier – Abstand zu den Kurvenpunkten der App max. ${maxD.toFixed(4)} mm (dieselbe Kurve)`);
  const zu = await ex([{ art: "spline", pts: [[0, 0], [60, -10], [80, 40], [20, 50]], geschlossen: true }]);
  const poly = splinePunkte([[0, 0], [60, -10], [80, 40], [20, 50]], true, 400), A = Math.abs(poly.reduce((s, a, i) => { const b = poly[(i + 1) % poly.length]; return s + a[0] * b[1] - b[0] * a[1]; }, 0) / 2);
  ok(Math.abs(zu.V / 10 - A) / A < 1e-4, `Skizze: geschlossener Spline exakt – Fläche ${(zu.V / 10).toFixed(2)} mm² ≈ App-Kurve ${A.toFixed(2)} mm²`);
  const kette = await ex([{ art: "spline", pts: [[0, 0], [50, 20], [100, 0]] }, { art: "linie", pts: [[100, 0], [100, -30], [0, -30], [0, 0]] }]);
  ok(kette.ps.length === 1 && kette.V > 30000, "Skizze: Kette aus Spline und Linienzug → geschlossenes exaktes Profil");
  let f = null; try { skizzenProfile([{ art: "text", text: "A", p: [0, 0], hoehe: 10 }]); } catch (e) { f = e instanceof NichtExakt ? e.message : "anderer Fehler"; }
  ok(f === "Skizzentext", "Skizze: Text wird als «noch nicht exakt» gemeldet, nicht angenähert");
}

// ---------------------------------------------------------------- 10 Speicher: Freigabe und Leckprüfung
{
  const vorher = (await x({ op: "speicher" })).handles;
  const lauf = async (n) => { for (let i = 0; i < n; i++) { const a = (await x({ op: "quader", min: [0, 0, 0], max: [10 + i % 3, 10, 10] })).id, b = (await x({ op: "zylinder", r: 3, h: 20, basis: [5, 5, -5] })).id, c = (await x({ op: "boolesch", art: "abziehen", a, b })).id; await x({ op: "tessellieren", ziel: c }); await x({ op: "freigeben", ziele: [a, b, c] }); } };
  await lauf(60); globalThis.gc?.(); const h1 = (await x({ op: "speicher" })).heapBytes;
  await lauf(300); globalThis.gc?.(); const h2 = (await x({ op: "speicher" })).heapBytes;
  ok((await x({ op: "speicher" })).handles === vorher, "Freigeben: Anzahl gehaltener Körper wieder wie vorher");
  ok(h2 - h1 <= 16 * 2 ** 20, `Kein Speicherwachstum über 300 Zyklen (WASM-Heap ${(h1 / 2 ** 20).toFixed(0)} → ${(h2 / 2 ** 20).toFixed(0)} MB)`);
}

console.log(`Laufzeit ${((performance.now() - t0) / 1000).toFixed(1)} s`);
if (fehler) { console.error(fehler + " Fehler"); process.exit(1); } else console.log("CAD-Kern: alle Tests bestanden");
