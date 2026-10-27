// Prüft die Verbindung Skizze ↔ Löser (kern/skizzenloeser.js)
import { vorbereiten, loeseSkizze, analyse, fuegeHinzu, bereinige } from "../kern/skizzenloeser.js";
import { bogenDaten } from "../kern/skizze.js";

let fehler = 0;
const ok = (bed, msg) => { if (!bed) { fehler++; console.log("FEHLER:", msg); } };
const nah = (a, b, tol = 1e-5) => Math.abs(a - b) < tol;
const np = (p, q, tol) => nah(p[0], q[0], tol) && nah(p[1], q[1], tol);

// 1. Altes Rechteck → Linienzug mit H/V; Ecke im Ursprung wird koinzident; Masse machen es voll bestimmt
{
  const f = { elemente: [{ art: "rechteck", a: [0, 0], b: [100, 50] }] };
  vorbereiten(f);
  const el = f.elemente[0];
  ok(el.art === "linie" && el.geschlossen && el.pts.length === 4 && el.id === 1, "Rechteck umgewandelt");
  ok(f.bedingungen.filter((b) => b.typ === "horizontal" || b.typ === "vertikal").length === 4, "vier H/V-Bedingungen");
  ok(f.bedingungen.some((b) => b.typ === "koinzident" && b.a.e === "O"), "Ecke im Ursprung koinzident");
  ok(analyse(f).dof === 2, `Rechteck am Ursprung: 2 Freiheitsgrade (${analyse(f).dof})`);
  ok(fuegeHinzu(f, { typ: "abstand", a: { e: 1, k: "p0" }, b: { e: 1, k: "p1" }, w: 120 }).ok, "Breite 120");
  ok(nah(el.pts[1][0], 120) && nah(el.pts[2][0], 120) && nah(el.pts[3][0], 0), `Breite wirkt ${JSON.stringify(el.pts)}`);
  ok(fuegeHinzu(f, { typ: "abstand", a: { e: 1, k: "p1" }, b: { e: 1, k: "p2" }, w: 60 }).ok, "Höhe 60");
  const a = analyse(f);
  ok(a.dof === 0 && a.bestimmt.has(1), `voll bestimmt (dof ${a.dof})`);
  const r = fuegeHinzu(f, { typ: "abstand", a: { e: 1, k: "p2" }, b: { e: 1, k: "p3" }, w: 120 });
  ok(!r.ok && r.grund === "ueberzaehlig", "überzähliges Mass abgelehnt: " + r.grund);
  const w = fuegeHinzu(f, { typ: "abstand", a: { e: 1, k: "p0" }, b: { e: 1, k: "p2" }, w: 10 });
  ok(!w.ok && nah(el.pts[1][0], 120), "Widerspruch abgelehnt, Geometrie unverändert: " + w.grund);
  // Mass ändern
  f.bedingungen.find((b) => b.typ === "abstand" && b.w === 120).w = 80;
  ok(loeseSkizze(f).ok && nah(el.pts[2][0], 80) && nah(el.pts[2][1], 60), "Mass geändert");
}

// 2. Ziehen: freier Punkt folgt der Maus, Partner über koinzident mit; bestimmter Punkt bleibt
{
  const f = { elemente: [{ art: "linie", pts: [[10, 10], [50, 10]] }, { art: "linie", pts: [[50, 10], [50, 40]] }] };
  vorbereiten(f);
  ok(f.bedingungen.length === 1 && f.bedingungen[0].typ === "koinzident", "gemeinsamer Punkt → koinzident");
  ok(loeseSkizze(f, { ziel: [{ ref: { e: 1, k: "p1" }, uv: [60, 20] }] }).ok, "ziehen lösbar");
  ok(np(f.elemente[0].pts[1], [60, 20]) && np(f.elemente[1].pts[0], [60, 20]), "Partner folgt");
  fuegeHinzu(f, { typ: "fix", e: 1 });
  loeseSkizze(f, { ziel: [{ ref: { e: 2, k: "p0" }, uv: [70, 70] }] });
  ok(np(f.elemente[1].pts[0], [60, 20]), "fixierter Punkt bleibt");
  ok(fuegeHinzu(f, { typ: "fix", e: 1 }).grund === "ueberzaehlig", "doppelt fixiert abgelehnt");
  // Element löschen → Bedingungen weg
  f.elemente.splice(0, 1);
  ok(bereinige(f) === 2 && f.bedingungen.length === 0, "Bereinigen nach Löschen");
}

// 3. Bogen und Kreis: tangential, Radius, konzentrisch, gleich; Bogen bleibt Bogen (m auf dem Kreis)
{
  const f = { elemente: [{ art: "linie", pts: [[0, 0], [100, 3]] }, { art: "kreis", c: [50, 30], r: 20 }, { art: "bogen", a: [200, 0], b: [240, 0], m: [220, 20] }, { art: "kreis", c: [205, 3], r: 5 }] };
  vorbereiten(f);
  ok(fuegeHinzu(f, { typ: "horizontal", l: { e: 1, s: 0 } }).ok, "Linie horizontal");
  ok(fuegeHinzu(f, { typ: "tangential", l: { e: 1, s: 0 }, k: { e: 2 } }).ok, "Kreis tangential");
  const k = f.elemente[1], L = f.elemente[0];
  ok(nah(Math.abs(k.c[1] - L.pts[0][1]), k.r), "Abstand Mitte–Linie = Radius");
  ok(fuegeHinzu(f, { typ: "durchmesser", k: { e: 2 }, w: 30 }).ok && nah(k.r, 15), "Durchmesser 30");
  ok(fuegeHinzu(f, { typ: "radius", k: { e: 3 }, w: 30 }).ok, "Bogenradius 30");
  const b = f.elemente[2], d = bogenDaten(b);
  ok(d && nah(d.r, 30, 1e-4) && nah(Math.hypot(b.b[0] - d.c[0], b.b[1] - d.c[1]), 30, 1e-4), `Bogen R30 ${JSON.stringify(d)}`);
  ok(fuegeHinzu(f, { typ: "konzentrisch", k1: { e: 3 }, k2: { e: 4 } }).ok && np(f.elemente[3].c, bogenDaten(b).c, 1e-4), "konzentrisch");
  ok(fuegeHinzu(f, { typ: "gleich", k1: { e: 2 }, k2: { e: 4 } }).ok && nah(f.elemente[3].r, 15, 1e-4), "gleicher Radius");
}

// 4. Symmetrisch zur Y-Achse, Punkt auf Linie, Mittelpunkt, Winkel
{
  const f = { elemente: [{ art: "punkt", p: [-30, 10] }, { art: "punkt", p: [25, 14] }, { art: "linie", pts: [[0, 0], [100, 0]] }, { art: "punkt", p: [40, 7] }, { art: "linie", pts: [[0, 50], [80, 60]] }] };
  vorbereiten(f);
  ok(fuegeHinzu(f, { typ: "symmetrisch", a: { e: 1, k: "p" }, b: { e: 2, k: "p" }, l: { e: "Y" } }).ok, "symmetrisch Y");
  ok(nah(f.elemente[0].p[0], -f.elemente[1].p[0]) && nah(f.elemente[0].p[1], f.elemente[1].p[1]), "symmetrisch Lage");
  ok(fuegeHinzu(f, { typ: "mittelpunkt", p: { e: 4, k: "p" }, l: { e: 3, s: 0 } }).ok && np(f.elemente[3].p, [(f.elemente[2].pts[0][0] + f.elemente[2].pts[1][0]) / 2, (f.elemente[2].pts[0][1] + f.elemente[2].pts[1][1]) / 2]), "Mittelpunkt");
  ok(fuegeHinzu(f, { typ: "winkel", l1: { e: "X" }, l2: { e: 5, s: 0 }, w: Math.PI / 6 }).ok, "Winkel 30°");
  const q = f.elemente[4].pts; ok(nah(Math.atan2(q[1][1] - q[0][1], q[1][0] - q[0][0]), Math.PI / 6), "Winkel wirkt");
  ok(fuegeHinzu(f, { typ: "parallel", l1: { e: 3, s: 0 }, l2: { e: "X" } }).ok, "parallel zur X-Achse");
}

// 5. Wie in Fusion: beim Tangential-Setzen wandert der Kreis, der Radius bleibt fast gleich
{
  const f = { elemente: [{ art: "linie", pts: [[0, 60], [120, 60]] }, { art: "kreis", c: [0, 150], r: 20 }] };
  vorbereiten(f);
  ok(fuegeHinzu(f, { typ: "tangential", l: { e: 1, s: 0 }, k: { e: 2 } }).ok && f.elemente[1].r < 25, `Radius bleibt (${f.elemente[1].r.toFixed(2)})`);
}

console.log(fehler ? `${fehler} Fehler im Skizzenlöser` : "Skizzenlöser: alle Tests bestanden");
process.exit(fehler ? 1 : 0);
