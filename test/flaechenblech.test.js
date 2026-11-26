// Prüft Flächenblech mit Kantenbausteinen (kern/flaechenblech.js)
import { innenWand, eckFaktoren, BAUSTEINE_STANDARD, bausteinProfil, kantenGruppen, flaechenblech, plattenUmriss } from "../kern/flaechenblech.js";
import { flaechenblechPlan } from "../kern/cad/featureBau.js";
import { BASIS } from "../kern/ebenen.js";
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
// Konische Bahn: Lappen neben Kanten ohne Baustein enden rechtwinklig; mit «Flanschende» bündig zur Nachbarkante
{
  const pts = [[0, 0], [500, 0], [400, 1500], [100, 1500]];
  const r = flaechenblech(pts, [B.trauf, null, null, null], m);
  const saum = r.abw.umriss.filter((p) => p[1] < -20);
  ok(saum.length >= 2 && saum.every((p) => p[0] >= -1e-6 && p[0] <= 500 + 1e-6), "Traufsaum endet rechtwinklig zur Biegekante an den Plattenecken");
  const rb = flaechenblech(pts, [B.trauf, null, null, null], m, [], { ecken: "gehrung", enden: { "0:start": { art: "buendig" }, "0:ende": { art: "buendig" } } }), sb = rb.abw.umriss.filter((p) => p[1] < -20);
  ok(sb.length >= 2 && sb.every((p) => p[0] > 0 && p[0] < 500), "«Flanschende» bündig: Saum kürzer als die Kante – ragt nicht über die schrägen Seiten");
}
// Gehrung nur bei Überschneidung: Saum innen + Aufkantung aussen → gerade; zwei Säume innen → Gehrung
{
  const eck = (a, b) => { const r = flaechenblech([[0, 0], [1000, 0], [1000, 600], [0, 600]], [B[a], B[b], null, null], m); return eckFaktoren(r.gruppen, r.profile)[0]; };
  const ek = (a, b) => eck(a, b).k1;
  const sa = eck("saum-o", "ortgang");
  const ende = (x) => sa.e1 - sa.k1 * x; // Rücksetzung des Saums je nach Lage x (innen negativ)
  ok(Math.abs(sa.k1) < 0.2 && ende(0) < 1.5 && ende(-10) < 0.5, `Saum + Aufkantung: keine Gehrung, Saum schräg angeschnitten (${ende(0).toFixed(2)} → ${ende(-10).toFixed(2)} mm)`);
  ok(Math.abs(ek("ortgang", "wasserfalz")) < 1e-9, "Aufkantung + Wasserfalz: gerade (nur Biegebereich)");
  ok(Math.abs(ek("ortgang", "ortgang")) < 1e-9 && Math.abs(eck("ortgang", "ortgang").e1) < 3, "zwei gleiche Aufkantungen: Enden 90° zur Fläche, Innenecken treffen sich");
  ok(Math.abs(ek("saum-o", "saum-o")) < 1e-9, "zwei Säume auf der Fläche: Enden rechtwinklig");
  ok(Math.abs(ek("trauf", "trauf")) < 1e-9, "zwei Traufsäume unter der Fläche: Enden rechtwinklig");
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
// Gehrung geneigter Aufkantungen: Endebene geht durch die Schnittlinie der Innenflächen und steht senkrecht auf dem Blech
{
  const mm = { t: 1.5, ri: 1, k: 0.4 }, bs = { name: "Schräg", folge: "60 40", versatz: 0 }, r = flaechenblech([[0, 0], [200, 0], [200, 120], [0, 120]], [bs, bs, null, null], mm), ek = eckFaktoren(r.gruppen, r.profile), A = r.profile[0], B = r.profile[1], WA = innenWand(A), WB = innenWand(B);
  ok(!!WA && !!WB && Math.abs(WA.w[1]) < 0.99, `Neigung erkannt (Wand ${WA?.w.map((v) => v.toFixed(2))})`);
  const kA = ek[0], dA = [1, 0], nA = [0, -1], nB = [1, 0], dB = [0, 1], xin = (W, y) => W.f[0] + (y - W.f[1]) * (W.w[0] / W.w[1]);
  let maxF = 0, maxS = 0;
  for (const y of [3, 12, 25]) {
    const ra = xin(WA, y), rb = xin(WB, y), q = [rb, -ra]; // q·nA = ra → q[1] = −ra; q·nB = rb → q[0] = rb  (Ecke bei (200,0): Vektor relativ)
    const zA = q[0] * dA[0] + q[1] * dA[1], zEnd = kA.k1 * ra + (kA.ky1 || 0) * y - kA.e1; maxF = Math.max(maxF, Math.abs(zEnd - zA));
    const wx = WA.w[0], wy = WA.w[1], lam = 3, x2 = ra - wy * lam, y2 = y + wx * lam; // Punkt senkrecht zur Wand verschoben
    maxS = Math.max(maxS, Math.abs(kA.k1 * x2 + (kA.ky1 || 0) * y2 - kA.e1 - zEnd));
  }
  ok(maxF < 1e-6, `Endebene enthält die Schnittlinie der Innenflächen (Abweichung ${maxF.toExponential(1)} mm)`);
  ok(maxS < 1e-6, `Endebene steht senkrecht auf dem Blech (Abweichung ${maxS.toExponential(1)} mm)`);
}
// Flansch mit 180° (Saum): Länge bezieht sich auf den geraden Schenkel bzw. die gewählte Bezugslinie – nie ein Vielfaches davon
{
  const mm = { t: 1, ri: 1, k: 0.4 };
  for (const [bz, soll] of [["tangente", 25], ["mitte", 23.5], ["aussen", 23], ["innen", 24]]) for (const po of ["mitte", "aussen", "innen", "tangente"]) {
    const p = bausteinProfil({ name: "t", werkzeug: { typ: "flansch", winkel: 180, laenge: 25, radius: null, bezug: bz, biegepos: po, seite: 1 } }, mm), ln = p.res.pfad.filter((e) => e.typ === "linie")[1];
    ok(ln && Math.abs(Math.hypot(ln.p2[0] - ln.p1[0], ln.p2[1] - ln.p1[1]) - soll) < 0.01, `180°-Flansch bis ${bz}: gerader Schenkel ${soll} mm`);
  }
}
// Runde Freistellung an der Ecke zweier Flansche – an einer Ecke mit Quetschfalte entfällt sie
{
  const pts = [[0, 0], [200, 0], [200, 120], [0, 120]], kt = [B.ortgang, null, null, B.ortgang];
  const ohne = flaechenblechPlan(flaechenblech(pts, kt, m, [], { freistellung: "eckig" }), BASIS.XY, m, 1), mit = flaechenblechPlan(flaechenblech(pts, kt, m, [0], { freistellung: "eckig" }), BASIS.XY, m, 1);
  ok(ohne.reliefs.length === 1 && ohne.reliefs[0].zyl, "Ecke mit zwei Flanschen: eine runde Freistellung");
  ok(mit.reliefs.length === 0, "Ecke mit Quetschfalte: keine Freistellung (kein Loch)");
}

