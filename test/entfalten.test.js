// Tests Abwickeln/Falten: Abbildung der flachen Abwicklung auf das gekantete Blech, Ausschnitt-Werkzeug
import { flaechenblech, BAUSTEINE_STANDARD, profilPunkt, faltePunkt, ausschnittWerkzeug } from "../kern/flaechenblech.js";
let fehler = 0; const ok = (b, t) => { console.log(`${b ? "✓" : "✗"} ${t}`); if (!b) fehler++; };
const m = { t: 0.7, ri: 1, k: 0.4 }, bst = (id) => BAUSTEINE_STANDARD.find((b) => b.id === id);
const volumen = (pos) => { let v = 0; for (let i = 0; i < pos.length; i += 9) { const a = [pos[i], pos[i + 1], pos[i + 2]], b = [pos[i + 3], pos[i + 4], pos[i + 5]], c = [pos[i + 6], pos[i + 7], pos[i + 8]]; v += a[0] * (b[1] * c[2] - b[2] * c[1]) - a[1] * (b[0] * c[2] - b[2] * c[0]) + a[2] * (b[0] * c[1] - b[1] * c[0]); } return v / 6; };
// Rechteck 200 × 100, Ortgang (90°/25) an der unteren Kante (Kante 1), sonst keine Bausteine
const bl = flaechenblech([[0, 0], [200, 0], [200, 100], [0, 100]], [bst("ortgang"), null, null, null], m);
const pr = bl.profile.find(Boolean);
ok(pr && pr.res, "Baustein-Profil mit Mittellinie vorhanden");
// Profilabbildung: erste Biegung beginnt kurz vor der gezeichneten Kante, danach steht der Schenkel senkrecht (x ≈ konstant)
const p0 = profilPunkt(pr, -5), p1 = profilPunkt(pr, pr.zugabe - 1);
ok(Math.abs(p0.y) < 1e-9 && Math.abs(p0.x + 5) < 1e-9, "Auf der Platte: Abbild = identisch");
ok(p1 && Math.abs(p1.th - Math.PI / 2) < 0.05 && p1.y > 20, `Am Ende des Schenkels: senkrecht, Höhe ${p1?.y.toFixed(1)} mm`);
ok(profilPunkt(pr, pr.zugabe + 5) === null, "Ausserhalb des Zuschnitts: kein Abbild");
// Abbildung eines Punkts in der Flanschzone: u = Zugabe − 10 → Höhe ≈ 10 + Biegungsanteil, gleiche Lage entlang der Kante
const f = faltePunkt(bl, [100, -(pr.zugabe - 10)], 1);
ok(Math.abs(f.p[0] - 100) < 1e-6 && f.p[2] > 13 && f.p[2] < 16 && Math.abs(f.p[1]) < 1.5, `Flansch-Punkt: x ${f.p[0].toFixed(2)}, y ${f.p[1].toFixed(2)}, Höhe ${f.p[2].toFixed(2)}`);
const g = faltePunkt(bl, [100, 50], 1); ok(g.p[2] === 0 && g.n[2] === 1, "Punkt auf der Platte bleibt in der Ebene");
// Werkzeug in der Platte: Volumen = Fläche × 2T
const T = 1, v1 = volumen(ausschnittWerkzeug(bl, [[80, 40], [120, 40], [120, 60], [80, 60]], 1, T, 2));
ok(Math.abs(v1 - 40 * 20 * 2 * T) < 1, `Ausschnitt in der Platte: Volumen ${v1.toFixed(1)} (erwartet ${40 * 20 * 2 * T})`);
// Werkzeug im Flansch: geschlossen (Volumen positiv, ≈ Fläche × 2T im Flachen)
const uA = -(pr.zugabe - 6), uB = -(pr.zugabe - 14); // 8 mm breit im Schenkel
const v2 = volumen(ausschnittWerkzeug(bl, [[90, uB], [110, uB], [110, uA], [90, uA]], 1, T, 1));
ok(v2 > 0 && Math.abs(v2 - 20 * 8 * 2 * T) < 0.1 * 20 * 8 * 2 * T, `Ausschnitt im Flansch: Volumen ${v2.toFixed(1)} (≈ ${20 * 8 * 2 * T})`);
const v3 = volumen(ausschnittWerkzeug(bl, [[90, 40], [110, 40], [110, 60], [90, 60]], -1, T, 2)); ok(v3 > 0, "Sichtseite −1: Umlaufsinn korrigiert (Volumen positiv)");
console.log(fehler ? `${fehler} Fehler` : "Abwickeln/Falten: alle Tests bestanden"); process.exit(fehler ? 1 : 0);
