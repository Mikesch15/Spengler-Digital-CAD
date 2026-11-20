// Prüft Flächenblech mit Kantenbausteinen (kern/flaechenblech.js)
import { eckFaktoren, BAUSTEINE_STANDARD, bausteinProfil, kantenGruppen, flaechenblech, plattenUmriss } from "../kern/flaechenblech.js";
import { bausteinQuerschnitt } from "../kern/cad/featureBau.js";
import { MATERIALIEN } from "../kern/materialien.js";

let fehler = 0;
const ok = (bed, msg) => { if (!bed) { fehler++; console.log("FEHLER:", msg); } };
const nah = (a, b, tol = 0.05) => Math.abs(a - b) < tol;
const m = MATERIALIEN[0], B = Object.fromEntries(BAUSTEINE_STANDARD.map((b) => [b.id, b]));

// Zugabe einer einfachen Aufkantung 90/25: 25 + Biegeausgleich (kleiner als 25 + t)
{
  const p = bausteinProfil(B.ortgang, m);
  ok(p.zugabe > 22 && p.zugabe < 26, `Aufkantung 25: Zugabe ${p.zugabe.toFixed(2)}`);
  ok(p.biegungen.length === 1 && nah(p.biegungen[0].anschlag + p.biegungen[0].abstand, p.zugabe, 1e-6), "Anschlag + Abstand = Zugabe");
}
for (const b of BAUSTEINE_STANDARD) { const p = bausteinProfil(b, m); ok(p.zugabe > 0 && p.biegungen.length >= 1, `${b.name}: Zugabe ${p.zugabe.toFixed(1)}`); }

// Dachbahn 600 × 2000: links Unterfalz, rechts Oberfalz, unten Traufe, oben First
{
  const pts = [[0, 0], [600, 0], [600, 2000], [0, 2000]]; // Kanten: 0 unten, 1 rechts, 2 oben, 3 links
  const r = flaechenblech(pts, [B.trauf, B["dsf-o"], B.first, B["dsf-u"]], m);
  const zu = r.profile[3].zugabe, zo = r.profile[1].zugabe, zt = r.profile[0].zugabe, zf = r.profile[2].zugabe;
  ok(r.gruppen.length === 4, "vier Kanten");
  ok(nah(r.abw.laenge, 2000 + zt + zf, 0.01) && nah(r.abw.breite, 600 + zu + zo, 0.01), `Zuschnitt ${r.abw.breite.toFixed(1)} × ${r.abw.laenge.toFixed(1)}`);
  ok(r.abw.umriss.length >= 12, `Umriss mit Eckausbildung (${r.abw.umriss.length} Punkte)`);
  ok(r.abw.linien.length === r.profile.reduce((s, p) => s + p.biegungen.length, 0), "eine Biegelinie je Biegung");
  console.log(`Bahn 600: Zuschnitt ${r.abw.breite.toFixed(1)} × ${r.abw.laenge.toFixed(1)} mm (Unterfalz ${zu.toFixed(1)}, Oberfalz ${zo.toFixed(1)}, Traufe ${zt.toFixed(1)}, First ${zf.toFixed(1)})`);
}
// Konische Bahn: Lappen neben Kanten ohne Baustein enden bündig zur Nachbarkante (im gekanteten Zustand)
{
  const pts = [[0, 0], [500, 0], [400, 1500], [100, 1500]];
  const r = flaechenblech(pts, [B.trauf, null, null, null], m);
  const saum = r.abw.umriss.filter((p) => p[1] < -20);
  ok(saum.length >= 2 && saum.every((p) => p[0] > 0 && p[0] < 500), "Traufsaum (unter dem Blech) kürzer als die Kante – ragt nicht über die schrägen Seiten");
}
// Gehrung nur bei Überschneidung: Saum innen + Aufkantung aussen → gerade; zwei Säume innen → Gehrung
{
  const eck = (a, b) => { const r = flaechenblech([[0, 0], [1000, 0], [1000, 600], [0, 600]], [B[a], B[b], null, null], m); return eckFaktoren(r.gruppen, r.profile)[0]; };
  const ek = (a, b) => eck(a, b).k1;
  const sa = eck("saum-o", "ortgang");
  const ende = (x) => sa.e1 - sa.k1 * x; // Rücksetzung des Saums je nach Lage x (innen negativ)
  ok(Math.abs(sa.k1) < 0.2 && ende(0) < 1.5 && ende(-10) < 0.5, `Saum + Aufkantung: keine Gehrung, Saum schräg angeschnitten (${ende(0).toFixed(2)} → ${ende(-10).toFixed(2)} mm)`);
  ok(Math.abs(ek("ortgang", "wasserfalz")) < 1e-9, "Aufkantung + Wasserfalz: gerade (nur Biegebereich)");
  ok(Math.abs(ek("ortgang", "ortgang") - 1) < 1e-9, "zwei gleiche Aufkantungen: Gehrung");
  ok(Math.abs(ek("saum-o", "saum-o") - 1) < 1e-9, "zwei Säume auf der Fläche: Gehrung 45°");
  ok(Math.abs(ek("trauf", "trauf") - 1) < 1e-9, "zwei Traufsäume unter der Fläche: Gehrung 45°");
}
// Gehrung: zwei Aufkantungen an einer Ecke – Enden symmetrisch zur Winkelhalbierenden
{
  const r = flaechenblech([[0, 0], [1000, 0], [1000, 600], [0, 600]], [B.ortgang, B.ortgang, null, null], m);
  const p0 = r.profile[0], x = p0.lage.at(-1)[1];
  ok(Math.abs(x) < 2, `Aufkantung steht senkrecht (x oben ${x.toFixed(2)} mm)`);
  ok(r.abw.umriss.some((p) => Math.abs(p[0] - 1000) < 2 && p[1] < -20) && r.abw.umriss.some((p) => p[0] > 1020 && Math.abs(p[1]) < 2), "Ecke ausgeklinkt (Lappen enden an der Ecke)");
}
// Halbkreis-Kante (Wappen): viele kleine Strecken bilden eine Kante
{
  const pts = [[0, 0], [500, 0], [500, 300]]; for (let i = 0; i <= 36; i++) { const w = Math.PI * i / 36; pts.push([250 + 250 * Math.cos(w), 300 + 250 * Math.sin(w)]); }
  pts.splice(3, 1); pts.push([0, 300]);
  const g = kantenGruppen(pts.filter((p, i, a) => !i || Math.hypot(p[0] - a[i - 1][0], p[1] - a[i - 1][1]) > 1e-6));
  ok(g.length === 4 && g.filter((x) => !x.gerade).length === 1 && g.some((x) => !x.gerade && x.laenge > 700), `Bogen als eine Kante (${g.map((x) => x.laenge.toFixed(0)).join(", ")})`);
}
// Platte bis zum Biegebeginn: die ebene Fläche wird an Kanten mit Baustein um das Mass bis zur ersten Biegung gekürzt
{
  const flaeche = (q) => Math.abs(q.reduce((s, p, i) => s + (p[0] * q[(i + 1) % q.length][1] - q[(i + 1) % q.length][0] * p[1]), 0) / 2);
  const rect = [[0, 0], [1000, 0], [1000, 500], [0, 500]], g = kantenGruppen(rect), x = bausteinQuerschnitt(B.ortgang, m), d = -x.xFlach;
  ok(d > 0.5 && d < 3, `Biegebeginn liegt ${d.toFixed(2)} mm innerhalb der gezeichneten Kante`);
  const einKante = plattenUmriss(rect, g, g.map((_, k) => (k === 0 ? d : 0)));
  ok(nah(flaeche(einKante), 1000 * (500 - d), 1e-6) && nah(einKante[0][1], d, 1e-9) && nah(einKante[1][1], d, 1e-9) && nah(einKante[0][0], 0, 1e-9), `Eine Kante gekürzt: Fläche ${flaeche(einKante).toFixed(2)} = 1000 × (500 − ${d.toFixed(2)})`);
  const alle = plattenUmriss(rect, g, g.map(() => d));
  ok(nah(flaeche(alle), (1000 - 2 * d) * (500 - 2 * d), 1e-6), "Alle vier Kanten gekürzt: Ecken verschnitten, Rechteck schrumpft rundum");
  ok(plattenUmriss(rect, g, g.map(() => 0)) === rect, "Ohne Baustein bleibt der Umriss unverändert");
  const R = 200, kreis = Array.from({ length: 64 }, (_, i) => [R * Math.cos((2 * Math.PI * i) / 64), R * Math.sin((2 * Math.PI * i) / 64)]), gk = kantenGruppen(kreis);
  const rund = plattenUmriss(kreis, gk, gk.map(() => d)), r1 = Math.hypot(...rund[0]), r2 = Math.hypot(...rund[10]);
  ok(gk.length === 1 && nah(r1, (R - d / Math.cos(Math.PI / 64)) * 1, 0.02) && nah(r1, r2, 1e-9), `Runde Kante: Radius ${r1.toFixed(3)} statt ${R} (rundum gleichmässig gekürzt)`);
  // L-förmiges Blech (einspringende Ecke): nur die Kante mit Baustein wird gekürzt, der Rest bleibt
  const L = [[0, 0], [600, 0], [600, 200], [200, 200], [200, 500], [0, 500]], gl = kantenGruppen(L), u = plattenUmriss(L, gl, gl.map((_, k) => (k === 0 ? d : 0)));
  ok(nah(flaeche(u), flaeche(L) - 600 * d, 1e-6), "L-Blech: nur die untere Kante gekürzt (Fläche −600 × d), einspringende Ecke unberührt");
}
console.log(fehler ? `${fehler} Fehler im Flächenblech` : "Flächenblech: alle Tests bestanden");
process.exit(fehler ? 1 : 0);
