// Tests: Quetschfalte an der Ecke zweier Aufkantungen
import { eckeGeometrie, quetschZuschnitt, faltenPruefen, quetschDreieck, quetschDxf } from "../kern/quetschfalte.js";
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
if (f) { console.error(`${f} Fehler`); process.exit(1); } else console.log("Quetschfalte: alle Tests bestanden");
