// Prüft Flächenblech mit Kantenbausteinen (kern/flaechenblech.js)
import { BAUSTEINE_STANDARD, bausteinProfil, kantenGruppen, flaechenblech } from "../kern/flaechenblech.js";
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
  ok(r.abw.umriss.length === 12, `Umriss mit 4 Ausklinkungen (${r.abw.umriss.length} Punkte)`);
  ok(r.abw.linien.length === r.profile.reduce((s, p) => s + p.biegungen.length, 0), "eine Biegelinie je Biegung");
  console.log(`Bahn 600: Zuschnitt ${r.abw.breite.toFixed(1)} × ${r.abw.laenge.toFixed(1)} mm (Unterfalz ${zu.toFixed(1)}, Oberfalz ${zo.toFixed(1)}, Traufe ${zt.toFixed(1)}, First ${zf.toFixed(1)})`);
}
// Konische Bahn: Kante ohne Zugabe wird bis zur Nachbarkante verlängert (keine Ausklinkung)
{
  const pts = [[0, 0], [500, 0], [400, 1500], [100, 1500]];
  const r = flaechenblech(pts, [B.trauf, null, null, null], m);
  ok(r.abw.umriss.length === 4, `konisch: 4 Punkte (${r.abw.umriss.length})`);
  const unten = r.abw.umriss.filter((p) => p[1] < -1);
  ok(unten.length === 2 && unten[0][0] < 0 && unten[1][0] > 500, "Traufe verlängert die schrägen Kanten nach aussen");
}
// Halbkreis-Kante (Wappen): viele kleine Strecken bilden eine Kante
{
  const pts = [[0, 0], [500, 0], [500, 300]]; for (let i = 0; i <= 36; i++) { const w = Math.PI * i / 36; pts.push([250 + 250 * Math.cos(w), 300 + 250 * Math.sin(w)]); }
  pts.splice(3, 1); pts.push([0, 300]);
  const g = kantenGruppen(pts.filter((p, i, a) => !i || Math.hypot(p[0] - a[i - 1][0], p[1] - a[i - 1][1]) > 1e-6));
  ok(g.length === 4 && g.filter((x) => !x.gerade).length === 1 && g.some((x) => !x.gerade && x.laenge > 700), `Bogen als eine Kante (${g.map((x) => x.laenge.toFixed(0)).join(", ")})`);
}
console.log(fehler ? `${fehler} Fehler im Flächenblech` : "Flächenblech: alle Tests bestanden");
process.exit(fehler ? 1 : 0);
