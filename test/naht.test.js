// Test: Verbindungsnähte (kern/naht.js): Absetzung um genau eine Blechstärke, Folgen für Überlappung und Falz, Raupennetz
import { nahtFolgen, nahtStandard, kroepfung, raupenNetz } from "../kern/naht.js";
import { bausteinProfil } from "../kern/flaechenblech.js";
import { freiesProfil, profilErweitern } from "../kern/profile.js";
let f = 0; const ok = (b, t) => { if (!b) { f++; console.error("✗", t); } else console.log("✓", t); };
for (const [t, ri] of [[0.5, 1], [0.7, 1], [1, 1.5], [1.5, 2], [2, 2]]) {
  const m = { t, ri, k: 0.4 }, kr = kroepfung(t, ri, 1), p = bausteinProfil({ name: "k", folge: `${kr.folge} 10`, versatz: 0 }, m), pf = p.res.pfad, ende = pf.at(-1).p2, start = pf[0].p1;
  ok(Math.abs(Math.abs(ende[1] - start[1]) - t) < 2e-3, `Kröpfung t=${t}, r=${kr.r.toFixed(2)}: Versatz genau eine Blechstärke (${Math.abs(ende[1] - start[1]).toFixed(4)})`);
  for (const art of ["punkt", "falz"]) for (const absetz of ["a", "b"]) for (const richtung of ["oben", "unten"]) {
    const fo = nahtFolgen({ ...nahtStandard(art), absetz, richtung }, m); let gut = true;
    for (const s of ["a", "b"]) if (fo[s]) { try { bausteinProfil({ name: "x", folge: fo[s].folge, versatz: fo[s].versatz }, m); } catch (e) { gut = false; console.error(e.message, fo[s]); } }
    ok(gut && (fo.a || fo.b), `${art}/${absetz}/${richtung} (t=${t}): Abkantfolgen rechnen`);
  }
}
const m = { t: 0.7, ri: 1, k: 0.4 }, pu = nahtFolgen(nahtStandard("punkt"), m), zug = bausteinProfil({ name: "p", folge: pu.b.folge, versatz: 0 }, m);
ok(pu.a.folge === "0 2" && pu.a.versatz < 0 && pu.b && zug.biegungen.length === 2, "Punktnaht: abgesetztes Blech mit Kröpfung (zwei Biegelinien), das andere Blech endet davor");
ok(Math.abs(zug.zugabe - 16.27) < 0.05, `Punktnaht: Zugabe am abgesetzten Blech ≈ 15 mm + Kröpfung (${zug.zugabe.toFixed(2)})`);
const fz = nahtFolgen(nahtStandard("falz"), m), za = bausteinProfil({ name: "a", folge: fz.a.folge, versatz: fz.a.versatz }, m), zb = bausteinProfil({ name: "b", folge: fz.b.folge, versatz: 0 }, m);
ok(/^U\+r[\d.]+ [\d.]+$/.test(fz.a.folge) && /U-r[\d.]+ [\d.]+$/.test(fz.b.folge) && za.biegungen.length === 1 && zb.biegungen.length === 3, "Falz: Haken, abgesetztes Blech gekröpft und um den Haken gelegt");
const xmax = (p, v) => Math.max(...p.quer.map((q) => q[0])) - v;
ok(Math.abs(xmax(zb, fz.b.versatz) - 10) < 0.05, `Falz: gesamte Falzbreite (Fuss der Absetzung bis Hakenende) = 10 mm (${xmax(zb, fz.b.versatz).toFixed(2)})`);
ok(fz.a.versatz <= 0 && fz.a.versatz > -4 && fz.b.versatz === 0, `Falz: Rücken des Hakens liegt an der Absetzung (Abstand ${(-fz.a.versatz).toFixed(2)} mm), keine Lücke`);
const mi = nahtFolgen({ ...nahtStandard("falz"), mittig: true }, m), zbm = bausteinProfil({ name: "b", folge: mi.b.folge, versatz: mi.b.versatz }, m);
ok(Math.abs(mi.b.versatz + 5) < 1e-9 && Math.abs(xmax(zbm, mi.b.versatz) - 10) < 0.05 && Math.abs(Math.max(...bausteinProfil({ name: "a", folge: mi.a.folge, versatz: mi.a.versatz }, m).quer.map((q) => q[0])) - (5 + fz.a.versatz)) < 0.01, `Falz mittig: ganzer Falz um 5 mm verschoben, Falzmitte über der Blechkante (B ${mi.b.versatz}, A ${mi.a.folge})`);
// Blechprofil: Rücksetzung des nicht abgesetzten Blechs verkürzt den letzten bzw. ersten Schenkel
{ const mm = { t: 0.7, ri: 1, k: 0.4 }, p = freiesProfil(0, [{ L: 50, winkel: 90 }, { L: 40 }], mm);
  const b = profilErweitern(p, [{ ende: "B", zeilen: [], kuerzen: 6 }], mm), a = profilErweitern(p, [{ ende: "A", zeilen: [], kuerzen: 6 }], mm), z = profilErweitern(p, [{ ende: "B", zeilen: [], kuerzen: 500 }], mm);
  ok(b.ops.at(-1).L === 34 && b.ops[0].L === 50, "Profil: Rücksetzung kürzt den letzten Schenkel (Kante B)");
  ok(a.ops[0].L === 44 && a.ops.at(-1).L === 40, "Profil: Rücksetzung kürzt den ersten Schenkel (Kante A)");
  ok(z.ops.at(-1).L === 1, "Profil: nie kürzer als 1 mm"); }
ok(nahtFolgen(nahtStandard("schweiss"), m).a === null && nahtFolgen(nahtStandard("ecke"), m).b === null, "Raupennähte ändern die Bleche nicht");
const netz = raupenNetz([[0, 0, 0], [10, 0, 0], [20, 5, 0]], [0, 0, 1], "schweiss", 2, 1); ok(netz.length > 100 && netz.every((v) => Number.isFinite(v)), "Raupennetz entlang der Polylinie");
// Kollisionsprüfung im Querschnitt: beide Bleche (A links, B rechts, Kanten bei x = 100) dürfen sich nirgends durchdringen
{
  const inPoly = (p, P) => { let in_ = false; for (let i = 0, j = P.length - 1; i < P.length; j = i++) { const [xi, yi] = P[i], [xj, yj] = P[j]; if ((yi > p[1]) !== (yj > p[1]) && p[0] < ((xj - xi) * (p[1] - yi)) / (yj - yi) + xi) in_ = !in_; } return in_; };
  const ring = (n, seite, mm) => { const fo = nahtFolgen(n, mm)[seite]; const p = fo ? bausteinProfil({ name: "x", folge: fo.folge, versatz: fo.versatz }, mm) : null; const plain = [[-100, -mm.t / 2], [0, -mm.t / 2], [0, mm.t / 2], [-100, mm.t / 2]]; return (p ? p.quer : plain).map(([x, y]) => (seite === "a" ? [100 + x, y] : [100 - x, y])); };
  const flaeche = (P) => { let a = 0; for (let i = 0; i < P.length; i++) { const [x1, y1] = P[i], [x2, y2] = P[(i + 1) % P.length]; a += x1 * y2 - x2 * y1; } return Math.abs(a) / 2; };
  let schlecht = [], n = 0;
  for (const t of [0.5, 0.7, 1, 1.5]) for (const art of ["punkt", "falz"]) for (const absetz of ["a", "b"]) for (const richtung of ["oben", "unten"]) for (const mittig of art === "falz" ? [false, true] : [false]) {
    const mm = { t, ri: Math.max(1, t), k: 0.4 }, nn = { ...nahtStandard(art), absetz, richtung, mittig }; n++;
    let A, B; try { A = ring(nn, "a", mm); B = ring(nn, "b", mm); } catch (e) { schlecht.push(`${art}/${absetz}/${richtung}/t${t}: ${e.message}`); continue; }
    const bb = (P) => [Math.min(...P.map((p) => p[0])), Math.max(...P.map((p) => p[0])), Math.min(...P.map((p) => p[1])), Math.max(...P.map((p) => p[1]))], ba = bb(A), bc = bb(B), x0 = Math.max(ba[0], bc[0]), x1 = Math.min(ba[1], bc[1]), y0 = Math.max(ba[2], bc[2]), y1 = Math.min(ba[3], bc[3]), h = 0.04; let ueber = 0;
    for (let x = x0 + h / 2; x <= x1; x += h) for (let y = y0 + h / 2; y <= y1; y += h) if (inPoly([x, y], A) && inPoly([x, y], B)) ueber += h * h; // nur der gemeinsame Bereich der Umrisse
    if (ueber > 0.2) schlecht.push(`${art}/${absetz}/${richtung}${mittig ? "/mittig" : ""}/t${t}: Durchdringung ${ueber.toFixed(2)} mm²`);
  }
  ok(schlecht.length === 0, `${n} Nahtvarianten ohne Durchdringung der Bleche${schlecht.length ? ": " + schlecht.slice(0, 4).join("; ") : ""}`);
}
if (f) { console.error(`${f} Fehler`); process.exit(1); } else console.log("Naht (Kern): alle Tests bestanden");
