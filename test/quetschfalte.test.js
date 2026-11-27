// Tests: Quetschfalte an der Ecke zweier Aufkantungen
import { eckeGeometrie, quetschZuschnitt, faltenPruefen, quetschDreieck, quetschDxf, quetschAnschluss } from "../kern/quetschfalte.js";
let f = 0; const ok = (b, t) => { if (!b) { f++; console.error("✗", t); } else console.log("✓", t); };
const nah = (a, b, t = 1e-6) => Math.abs(a - b) < t;
const g = eckeGeometrie(90, 90, 90);
ok(nah(g.gamma1, 90, 1e-6) && nah(g.gamma2, 90, 1e-6) && nah(g.psi, 90, 1e-6), `Rechtwinklige Ecke: γ1 = γ2 = 90°, Überschuss 90° (${g.psi.toFixed(2)}°)`);
const z = quetschZuschnitt(90, 30);
ok(nah(z.hoehe2, 30, 1e-6) && nah(z.ell, 30, 1e-9), `Beide Aufkantungen 30 mm hoch, Ecklinie ${z.ell.toFixed(2)} mm`);
const p = faltenPruefen(z);
ok(p.ok, `Faltprobe: Seitenkanten auf der Ecklinie, Spiegelung deckt (Abweichung ${p.abweichung.toExponential(1)})`);
for (const [b, h, p1, p2] of [[90, 25, 90, 90], [80, 30, 90, 90], [100, 20, 90, 90], [75, 40, 90, 90]]) { try { const zz = quetschZuschnitt(b, h, p1, p2); ok(faltenPruefen(zz).ok || !(zz.hoehe2 > 0), `β ${b}°, Höhe ${h}: Faltprobe ${faltenPruefen(zz).ok ? "ok" : "asymmetrisch gemeldet"}`); } catch (e) { ok(/Asymmetrisch|Überschuss|Spitze/.test(e.message), `β ${b}°: ${e.message}`); } }
let fe = ""; try { quetschZuschnitt(5, 30); } catch (e) { fe = e.message; } ok(/zwischen 10/.test(fe), "Winkel ausserhalb → Fehlermeldung");
const t = quetschDreieck(z, "wand1"); ok(nah(Math.hypot(...t.P), z.ell, 1e-9) && nah(Math.hypot(t.C[0] - t.P[0], t.C[1] - t.P[1], t.C[2] - t.P[2]), z.m, 1e-9), "Dreieck der gefalteten Quetschfalte");
const dx = quetschDxf(z); ok(/QUETSCHFALTE/.test(dx) && dx.endsWith("EOF"), "DXF mit Quetschfalten-Layer");
// Beliebige Winkel und unterschiedliche Höhen
for (const [beta, h1, h2, p1, p2] of [[90, 30, 45, 90, 90], [90, 40, 25, 90, 90], [80, 30, 40, 75, 100], [90, 25, 35, 80, 100], [90, 30, 30, 100, 80]]) {
  try { const zz = quetschZuschnitt(beta, h1, p1, p2, null, h2); const pr = faltenPruefen(zz);
    ok(pr.ok && zz.sS <= Math.min(zz.s1, zz.s2) + 1e-9, `β ${beta}°, h ${h1}/${h2}, φ ${p1}/${p2}: Faltprobe ok (s* ${zz.sS.toFixed(2)}, Spitze ${zz.tSpitze.toFixed(2)}, Kontur ${zz.kontur.length} Punkte)`); }
  catch (e) { ok(false, `β ${beta}°, h ${h1}/${h2}, φ ${p1}/${p2}: ${e.message}`); }
}
const un = quetschZuschnitt(90, 30, 90, 90, null, 45); ok(un.sS === 30 && un.s2 === 45 && un.kontur.length === 6, "Ungleiche Höhen: Falte bis zur niedrigeren Ecklinie, höherer Flansch behält freie Seitenkante");
// Alle Kombinationen aus Eckwinkel, Abkantwinkeln und Flanschhöhen: rechenbar, solange der Überschuss ψ zwischen 5° und 175° liegt; Faltprobe stimmt immer
{
  let n = 0, schlecht = [];
  for (const beta of [45, 60, 90, 120, 135]) for (const p1 of [30, 45, 60, 90, 110, 135]) for (const p2 of [30, 45, 60, 90, 110, 135]) for (const [h1, h2] of [[40, 40], [40, 25], [25, 40], [60, 20], [20, 60]]) {
    let psi; try { psi = eckeGeometrie(beta, p1, p2).psi; } catch { continue; }
    if (!(psi >= 5 && psi <= 175)) continue; n++;
    try { const zz = quetschZuschnitt(beta, h1, p1, p2, null, h2); if (!faltenPruefen(zz).ok || !(zz.tSpitze > zz.sS)) schlecht.push(`β${beta} φ${p1}/${p2} h${h1}/${h2}`); } catch (e) { schlecht.push(`β${beta} φ${p1}/${p2} h${h1}/${h2}: ${e.message}`); }
  }
  ok(n > 300 && schlecht.length === 0, `${n} Kombinationen (Winkel gleich/verschieden, Höhen gleich/verschieden) rechnen mit stimmender Faltprobe${schlecht.length ? ": " + schlecht.slice(0, 3).join("; ") : ""}`);
}
// Anschluss der Falte an den anderen Flansch (t = 0,7): rechtwinklig 90°-Biegung, Mittelradius 1,5·t, Saum konzentrisch (aK = 1,5·t), Gehrungsende aI = 0,5·t
{
  const t = 0.7, a = quetschAnschluss(eckeGeometrie(90, 90, 90), "wand1", t), b = quetschAnschluss(eckeGeometrie(90, 90, 90), "wand2", t);
  ok(a && nah(a.th, Math.PI / 2, 1e-9) && nah(a.aK, 1.5 * t, 1e-9) && nah(a.aI, 0.5 * t, 1e-9) && nah(a.tl, 1.5 * t, 1e-9), "Rechtwinklige Ecke: Biegung 90°, Saummitte aK = 1,5·t, Gehrungsende aI = 0,5·t");
  ok(b && nah(b.aK, a.aK, 1e-9) && nah(b.th, a.th, 1e-9), "Symmetrie: Falte auf Wand 2 ergibt dieselben Masse");
  for (const beta of [63, 80, 100, 116, 130]) { const q = quetschAnschluss(eckeGeometrie(beta, 90, 90), "wand1", t); ok(q && q.aK > q.aI && q.th > 0 && q.th < Math.PI, `Ecke ${beta}°: Saum liegt hinter dem Gehrungsende (aI ${q?.aI.toFixed(3)} < aK ${q?.aK.toFixed(3)}), Biegung ${(q?.th * 180 / Math.PI).toFixed(1)}°`); }
  const w = quetschAnschluss(eckeGeometrie(63, 90, 90), "wand1", t).th, r = quetschAnschluss(eckeGeometrie(116, 90, 90), "wand1", t).th;
  ok(w > Math.PI / 2 && r < Math.PI / 2, "Spitzer Eckwinkel: Biegung stärker als 90°, stumpfer Eckwinkel: schwächer als 90°");
}
if (f) { console.error(`${f} Fehler`); process.exit(1); } else console.log("Quetschfalte: alle Tests bestanden");
