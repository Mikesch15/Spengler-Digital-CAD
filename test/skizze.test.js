// Prüft die Skizzengeometrie (kern/skizze.js)
import { kreisDurch3, bogenDaten, bogenPunkte, bogenAusMitte, polygonPunkte, rechteck3, langlochPunkte, abrundung, rundePolylinie, versatzPolylinie, spiegelPunkt, schnittStrecken, schnittStreckeKreis, verbindeStuecke } from "../kern/skizze.js";

let fehler = 0;
const ok = (bed, msg) => { if (!bed) { fehler++; console.log("FEHLER:", msg); } };
const nah = (a, b, tol = 1e-9) => a.every((x, i) => Math.abs(x - b[i]) < tol);
const lang = (pts, zu = false) => pts.slice(zu ? 0 : 1).reduce((s, q, i) => { const p = zu ? pts[(i - 1 + pts.length) % pts.length] : pts[i]; return s + Math.hypot(q[0] - p[0], q[1] - p[1]); }, 0);

// Kreis durch drei Punkte
const k = kreisDurch3([10, 0], [0, 10], [-10, 0]);
ok(nah(k.c, [0, 0]) && Math.abs(k.r - 10) < 1e-9, "Kreis durch 3 Punkte");
ok(kreisDurch3([0, 0], [1, 1], [2, 2]) === null, "3 Punkte auf einer Linie: kein Kreis");

// Bögen: Halbkreis oben (gegen Uhrzeiger) und unten (mit Uhrzeiger)
const oben = bogenDaten({ a: [10, 0], b: [-10, 0], m: [0, 10] }), unten = bogenDaten({ a: [10, 0], b: [-10, 0], m: [0, -10] });
ok(Math.abs(oben.sweep - Math.PI) < 1e-9 && Math.abs(unten.sweep + Math.PI) < 1e-9, "Bogen Richtung");
const bp = bogenPunkte({ a: [10, 0], b: [-10, 0], m: [0, 10] }, 2);
ok(nah(bp[0], [10, 0]) && nah(bp.at(-1), [-10, 0]) && Math.abs(lang(bp) - Math.PI * 10) < 0.02, "Bogen Länge ≈ π·r");
const bm = bogenAusMitte([0, 0], [10, 0], [0, 5]); // Viertelkreis, Ende auf Radius 10 projiziert
ok(nah(bm.b, [0, 10]) && Math.abs(bogenDaten(bm).sweep - Math.PI / 2) < 1e-9, "Mittelpunktbogen");

// Polygon, gedrehtes Rechteck, Langloch
const sechs = polygonPunkte([0, 0], [10, 0], 6);
ok(sechs.length === 6 && Math.abs(lang(sechs, true) - 60) < 1e-9, "Sechseck Umfang = 6·r");
const r3 = rechteck3([0, 0], [10, 0], [3, 4]);
ok(nah(r3[2], [10, 4]) && nah(r3[3], [0, 4]), "Rechteck 3 Punkte");
const ll = langlochPunkte([0, 0], [100, 0], 10, 1);
ok(Math.abs(lang(ll, true) - (200 + 2 * Math.PI * 10)) < 0.05, "Langloch Umfang");

// Abrunden: rechter Winkel mit R 10 → Tangentenpunkte 10 mm vor der Ecke, Bogen 1/4·2π·10
const L = [[0, 0], [100, 0], [100, 50]];
const a = abrundung(L, 1, 10);
ok(nah(a.t1, [90, 0]) && nah(a.t2, [100, 10]) && Math.abs(a.r - 10) < 1e-9 && nah(a.c, [90, 10]), "Abrundung 90°");
ok(Math.abs(abrundung(L, 1, 1000).r - 25) < 1e-9, "Radius begrenzt auf halbe kürzere Kante");
ok(abrundung(L, 0, 10) === null, "Endpunkt eines offenen Zugs nicht abrundbar");
const rund = rundePolylinie(L, { 1: 10 }, false, 1);
ok(Math.abs(lang(rund) - (90 + 40 + Math.PI * 5)) < 0.01, "abgerundeter Linienzug: Länge");

// Versatz: offenes L nach links (innen) um 1; geschlossenes Quadrat nach aussen
ok(nah(versatzPolylinie(L, 1)[1], [99, 1]), "Versatz offen");
const q = [[0, 0], [10, 0], [10, 10], [0, 10]];
ok(nah(versatzPolylinie(q, -1, true)[0], [-1, -1]) && nah(versatzPolylinie(q, -1, true)[2], [11, 11]), "Versatz geschlossen nach aussen");

// Spiegeln an der Y-Achse und an der Diagonalen
ok(nah(spiegelPunkt([3, 4], [0, 0], [0, 1]), [-3, 4]) && nah(spiegelPunkt([3, 0], [0, 0], [1, 1]), [0, 3]), "Spiegeln");

// Schnitte
ok(Math.abs(schnittStrecken([0, 0], [10, 0], [4, -1], [4, 1]) - 0.4) < 1e-12, "Schnitt zweier Strecken");
ok(schnittStrecken([0, 0], [10, 0], [0, 1], [10, 1]) === null && schnittStrecken([0, 0], [10, 0], [11, -1], [11, 1]) === null, "parallel / ausserhalb");
const sk = schnittStreckeKreis([-20, 0], [20, 0], [0, 0], 10);
ok(sk.length === 2 && Math.abs(sk[0] - 0.25) < 1e-12 && Math.abs(sk[1] - 0.75) < 1e-12, "Strecke schneidet Kreis");

// Verbinden: drei einzelne Linien zu einem offenen Zug, vier zu einem geschlossenen
const z = verbindeStuecke([{ pts: [[10, 0], [10, 10]] }, { pts: [[0, 0], [10, 0]] }, { pts: [[20, 10], [10, 10]] }]);
ok(z.length === 1 && !z[0].geschlossen && z[0].pts.length === 4 && nah(z[0].pts[0], [0, 0]) && nah(z[0].pts[3], [20, 10]), "drei Linien → ein offener Zug");
const zu = verbindeStuecke([{ pts: [[0, 0], [10, 0]] }, { pts: [[10, 10], [10, 0]] }, { pts: [[10, 10], [0, 10]] }, { pts: [[0, 10], [0, 0]] }]);
ok(zu.length === 1 && zu[0].geschlossen && zu[0].pts.length === 4, "vier Linien → geschlossenes Profil");
ok(verbindeStuecke([{ pts: [[0, 0], [1, 0]] }, { pts: [[5, 5], [6, 6]] }]).length === 2, "getrennte Linien bleiben getrennt");

console.log(fehler ? `${fehler} Fehler in Skizze` : "Skizze: alle Tests bestanden");
process.exit(fehler ? 1 : 0);
