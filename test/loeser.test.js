// Prüft Gleichungslöser und Abhängigkeiten (kern/loeser.js, kern/bedingungen.js)
import { loese, freiheitsgrade } from "../kern/loeser.js";
import { GL } from "../kern/bedingungen.js";

let fehler = 0;
const ok = (bed, msg) => { if (!bed) { fehler++; console.log("FEHLER:", msg); } };
const nah = (a, b, tol = 1e-6) => Math.abs(a - b) < tol;
// kleine Hilfe: Punkte i → Variablen 2i, 2i+1; Gleichung aus GL-Funktion und Punkt-/Zahl-Argumenten
const P = (i) => ({ p: i }), Z = (i) => ({ z: i });
function gl(name, ...args) {
  const v = [], teile = [];
  for (const a of args) {
    if (a?.p != null) { teile.push({ n: 2 }); v.push(2 * a.p, 2 * a.p + 1); }
    else if (a?.z != null) { teile.push({ n: 1 }); v.push(a.z); }
    else teile.push({ k: a });
  }
  return { v, f: (w) => { let i = 0; return GL[name](...teile.map((t) => (t.k !== undefined ? t.k : t.n === 2 ? [w[i++], w[i++]] : w[i++]))); } };
}
const pt = (x, i) => [x[2 * i], x[2 * i + 1]];

// 1. Rechteck: 4 Punkte, H/V, Breite 100, Höhe 50, Punkt 0 fest im Ursprung
{
  const x0 = [1, -2, 97, 3, 104, 48, -3, 55];
  const g = [gl("horizontal", P(0), P(1)), gl("vertikal", P(1), P(2)), gl("horizontal", P(2), P(3)), gl("vertikal", P(3), P(0)),
    gl("abstand", P(0), P(1), 100), gl("abstand", P(1), P(2), 50)];
  const fest = new Set([0, 1]); x0[0] = 0; x0[1] = 0;
  const r = loese(x0, g, fest);
  ok(r.ok && nah(pt(r.x, 2)[0], 100) && nah(pt(r.x, 2)[1], 50) && nah(pt(r.x, 3)[0], 0), `Rechteck gelöst ${r.x.map((z) => z.toFixed(3))}`);
  const fg = freiheitsgrade(r.x, g, fest);
  ok(fg.dof === 0 && fg.bestimmt.every(Boolean), `Rechteck voll bestimmt (dof ${fg.dof})`);
  const ohneFest = freiheitsgrade(r.x, g);
  ok(ohneFest.dof === 2 && !ohneFest.bestimmt[0], `ohne Fixierung 2 Freiheitsgrade (dof ${ohneFest.dof})`);
  // Mass ändern: Breite 120 → nur die rechte Seite wandert
  g[4] = gl("abstand", P(0), P(1), 120);
  const r2 = loese(r.x, g, fest);
  ok(r2.ok && nah(pt(r2.x, 1)[0], 120) && nah(pt(r2.x, 3)[0], 0) && nah(pt(r2.x, 3)[1], 50), "Breite geändert, linke Seite bleibt");
}

// 2. Widerspruch: Länge 100 und Länge 50 für dieselbe Strecke
{
  const r = loese([0, 0, 80, 0], [gl("abstand", P(0), P(1), 100), gl("abstand", P(0), P(1), 50)], new Set([0, 1]));
  ok(!r.ok, "Widerspruch wird erkannt");
}

// 3. Minimale Änderung: nur «horizontal» → beide Punkte gehen je halb auf die gemeinsame Höhe
{
  const r = loese([0, 0, 10, 2], [gl("horizontal", P(0), P(1))]);
  ok(r.ok && nah(r.x[1], 1, 1e-4) && nah(r.x[3], 1, 1e-4) && nah(r.x[0], 0) && nah(r.x[2], 10), "minimale Änderung");
}

// 4. Tangentiale Linie an Kreis, Punkt auf Kreis, parallel, senkrecht, gleich, Winkel, Knick
{
  // Kreis c = P0, r = Variable 8; Linie P1–P2 tangential; P3 auf Kreis
  const x0 = [0, 0, -50, 22, 50, 18, 3, 25, 20];
  const g = [gl("tangentLinie", P(1), P(2), P(0), Z(8)), gl("aufKreis", P(3), P(0), Z(8)), gl("horizontal", P(1), P(2)), gl("wert", Z(8), 20)];
  const r = loese(x0, g, new Set([0, 1]));
  ok(r.ok && nah(Math.abs(r.x[3]), 20) && nah(Math.hypot(r.x[6], r.x[7]), 20), "tangential und auf Kreis");
  const s = loese([0, 0, 10, 1, 0, 5, 9, 7], [gl("parallel", P(0), P(1), P(2), P(3))], new Set([0, 1, 2, 3]));
  ok(s.ok && nah((s.x[7] - s.x[5]) / (s.x[6] - s.x[4]), 0.1, 1e-6), "parallel");
  const t = loese([0, 0, 10, 0, 0, 5, 3, 9], [gl("senkrecht", P(0), P(1), P(2), P(3))], new Set([0, 1, 2, 3, 5]));
  ok(t.ok && nah(t.x[6], t.x[4], 1e-6), "senkrecht");
  const u = loese([0, 0, 10, 0, 0, 5, 3, 9], [gl("gleichLang", P(0), P(1), P(2), P(3))], new Set([0, 1, 2, 3, 4, 5]));
  ok(u.ok && nah(Math.hypot(u.x[6] - u.x[4], u.x[7] - u.x[5]), 10), "gleich lang");
  const w = loese([0, 0, 100, 0, 150, 20], [gl("knick", P(0), P(1), P(2), Math.PI / 4), gl("abstand", P(1), P(2), 50)], new Set([0, 1, 2, 3]));
  ok(w.ok && nah(w.x[4], 100 + 50 * Math.SQRT1_2) && nah(w.x[5], 50 * Math.SQRT1_2), "Knickwinkel 45°");
}

// 5. Symmetrisch, Mittelpunkt, kollinear, konzentrisch
{
  const s = loese([-10, 3, 12, 5, 0, -10, 0, 10], [gl("symmetrisch", P(0), P(1), P(2), P(3))], new Set([4, 5, 6, 7, 0, 1]));
  ok(s.ok && nah(s.x[2], 10) && nah(s.x[3], 3), "symmetrisch zur Y-Achse");
  const m = loese([3, 4, 0, 0, 10, 0], [gl("mittelpunkt", P(0), P(1), P(2))], new Set([2, 3, 4, 5]));
  ok(m.ok && nah(m.x[0], 5) && nah(m.x[1], 0), "Mittelpunkt");
  const k = loese([0, 0, 10, 0, 20, 3, 30, -2], [gl("kollinear", P(0), P(1), P(2), P(3))], new Set([0, 1, 2, 3]));
  ok(k.ok && nah(k.x[5], 0) && nah(k.x[7], 0), "kollinear");
}

// 6. Freiheitsgrade eines freien Linienzugs: 3 Punkte = 6, mit «horizontal» 5
ok(freiheitsgrade([0, 0, 10, 0, 10, 5], []).dof === 6 && freiheitsgrade([0, 0, 10, 0, 10, 5], [gl("horizontal", P(0), P(1))]).dof === 5, "Freiheitsgrade zählen");

console.log(fehler ? `${fehler} Fehler im Löser` : "Löser: alle Tests bestanden");
process.exit(fehler ? 1 : 0);
