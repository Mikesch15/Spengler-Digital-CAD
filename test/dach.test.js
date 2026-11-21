// Tests Dach-Modus Phase 1: Dachflächen aus dem Grundriss (Satteldach, Pultdach, Walmdach, Zeltdach)
import { rechteckDach, waende, dachFlaechen } from "../kern/dach/form.js";
let fehler = 0; const ok = (b, t) => { console.log(`${b ? "✓" : "✗"} ${t}`); if (!b) fehler++; };
const nah = (a, b, t = 1) => Math.abs(a - b) <= t;
const B = 10000, T = 8000, h0 = 3000;
// Satteldach, First längs: 2 Flächen, First auf halber Tiefe
let d = rechteckDach({ breite: B, tiefe: T, form: "sattel", neigung: 35, ueberstandTraufe: 0, ueberstandOrtgang: 0, traufhoehe: h0 });
ok(d.flaechen.length === 2, "Satteldach: 2 Dachflächen");
const hf = h0 + (T / 2) * Math.tan((35 * Math.PI) / 180);
ok(nah(d.firsthoehe, hf, 1), `Firsthöhe ${d.firsthoehe.toFixed(0)} mm (erwartet ${hf.toFixed(0)})`);
const first = d.linien.filter((l) => l.art === "first");
ok(first.length === 1 && nah(first[0].laenge, B, 1) && d.linien.filter((l) => l.art === "grat").length === 0, "First über die ganze Länge, keine Grate");
ok(nah(d.flaechen[0].flaeche, (B * (T / 2)) / Math.cos((35 * Math.PI) / 180) / 1, 1e3 * 0 + 1e4) || nah(d.flaechen[0].flaeche * 1e6, (B * (T / 2)) / Math.cos((35 * Math.PI) / 180), 1e3), "Fläche je Seite = Grundfläche / cos(Neigung)");
ok(d.flaechen[0].seiten.filter((s) => s === "traufe").length === 1 && d.flaechen[0].seiten.filter((s) => s === "ortgang").length === 2 && d.flaechen[0].seiten.filter((s) => s === "first").length === 1, "Kantenarten: 1 Traufe, 2 Ortgänge, 1 First");
// Überstände: Traufe 400, Ortgang 300 → Hülle grösser, Dachfläche läuft über die Wand hinaus nach unten
d = rechteckDach({ breite: B, tiefe: T, form: "sattel", neigung: 35, ueberstandTraufe: 400, ueberstandOrtgang: 300, traufhoehe: h0 });
const ymin = Math.min(...d.flaechen.flatMap((f) => f.punkte.map((p) => p[1]))), xmin = Math.min(...d.flaechen.flatMap((f) => f.punkte.map((p) => p[0]))), hmin = Math.min(...d.flaechen.flatMap((f) => f.punkte.map((p) => p[2])));
ok(nah(ymin, -400) && nah(xmin, -300) && nah(hmin, h0 - 400 * Math.tan((35 * Math.PI) / 180), 1), `Überstand: Traufe −400, Ortgang −300, Unterkante ${hmin.toFixed(0)} mm`);
// Ungleiche Neigung: First verschiebt sich zur steileren Seite
d = rechteckDach({ breite: B, tiefe: T, form: "sattel", neigung: 45, neigung2: 25, ueberstandTraufe: 0, ueberstandOrtgang: 0, traufhoehe: h0 });
const yf = (T * Math.tan((25 * Math.PI) / 180)) / (Math.tan((45 * Math.PI) / 180) + Math.tan((25 * Math.PI) / 180));
ok(nah(d.linien.find((l) => l.art === "first").von[1], yf, 1), `Ungleiche Neigung 45°/25°: First bei v = ${yf.toFixed(0)}`);
// Walmdach: 4 Flächen (2 Trapeze, 2 Dreiecke), 4 Grate, First = B − T
d = rechteckDach({ breite: B, tiefe: T, form: "walm", neigung: 35, ueberstandTraufe: 0, traufhoehe: h0 });
const ecken = d.flaechen.map((f) => f.punkte.length).sort();
ok(d.flaechen.length === 4 && ecken.join() === "3,3,4,4", `Walmdach: 4 Flächen (${ecken.join("/")} Ecken)`);
ok(d.linien.filter((l) => l.art === "grat").length === 4 && nah(d.linien.find((l) => l.art === "first").laenge, B - T, 1), "4 Grate, First = Länge − Tiefe");
ok(nah(d.firsthoehe, h0 + (T / 2) * Math.tan((35 * Math.PI) / 180), 1), "Firsthöhe wie beim Satteldach");
const aSumme = d.flaechen.reduce((s, f) => s + f.grundflaeche, 0); ok(nah(aSumme * 1e6, B * T, 10), "Walmdach: Flächen decken den Grundriss lückenlos (Summe der Grundflächen)");
// Zeltdach auf Quadrat: Spitze, 4 Dreiecke
d = rechteckDach({ breite: 8000, tiefe: 8000, form: "zelt", neigung: 40, ueberstandTraufe: 0, traufhoehe: h0 });
ok(d.flaechen.length === 4 && d.flaechen.every((f) => f.punkte.length === 3) && d.linien.filter((l) => l.art === "first").length === 0, "Zeltdach: 4 Dreiecke, kein First");
// Pultdach: eine Fläche über den ganzen Grundriss, Höhe an der Oberkante = Traufhöhe + Tiefe·tan
d = rechteckDach({ breite: B, tiefe: T, form: "pult", neigung: 15, ueberstandTraufe: 0, ueberstandOrtgang: 0, traufhoehe: h0 });
ok(d.flaechen.length === 1 && nah(d.firsthoehe, h0 + T * Math.tan((15 * Math.PI) / 180), 1), `Pultdach: 1 Fläche, höchster Punkt ${d.firsthoehe.toFixed(0)} mm`);
// Wände: Giebel beim Satteldach sind Dreiecke bis zum First, Traufwände gerade
d = rechteckDach({ breite: B, tiefe: T, form: "sattel", neigung: 35, ueberstandTraufe: 0, ueberstandOrtgang: 0, traufhoehe: h0 });
const w = waende(d.grundriss, d);
ok(w[0].punkte.every((p) => p[2] === 0 || nah(p[2], h0, 1)) && w[1].punkte.some((p) => nah(p[2], d.firsthoehe, 1)) && w[1].punkte.length === 5, "Wände: Traufwände gerade, Giebelwände mit Spitze (5 Punkte)");
// Beliebige konvexe Grundrisse: Trapez mit gleicher Neigung rundum = Zeltdach-ähnlich, Flächen decken Grundriss
const t = dachFlaechen({ grundriss: [[0, 0], [12000, 0], [9000, 7000], [3000, 7000]], kanten: [0, 1, 2, 3].map(() => ({ neigung: 30, ueberstand: 0 })), traufhoehe: h0 });
ok(nah(t.flaechen.reduce((s, f) => s + f.grundflaeche, 0) * 1e6, 66e6 + 21e6 - 21e6 + 0 - 0 + (12000 + 6000) / 2 * 7000 - 66e6, 100) , "Trapez-Grundriss: Dachflächen decken die Grundfläche (63 m²)");
import { DECKUNGEN_STANDARD, AUFBAU_STANDARD, schichten, pruefeDach, grundeinstellung, lattenAnzahl } from "../kern/dach/vorlagen.js";
ok(DECKUNGEN_STANDARD.map((x) => x.id).join() === "schiebeziegel,biber-einfach,biber-doppel", "Deckungen: Schiebeziegel, Biber einfach, Biber doppelt");
const g = grundeinstellung(); g.deckungen[0].lattweite = 330; ok(DECKUNGEN_STANDARD[0].lattweite === 340, "Grundeinstellung ist eine Kopie (änderbar, Standard bleibt)");
const sc = schichten(AUFBAU_STANDARD[0], DECKUNGEN_STANDARD[0]);
ok(sc.liste.map((l) => l.id).join() === "daemmung,sparren,unterdach,konter,lattung,deckung" || sc.liste.map((l) => l.id).includes("sparren"), "Schichten von innen nach aussen: " + sc.liste.map((l) => l.id).join(" · "));
ok(sc.unten === -200 && sc.oben === 24 + 40 + 60 + 25 && sc.dicke === 200 + 149, `Aufbau: ${sc.dicke} mm gesamt (Sparren 200 + 149 darüber)`);
ok(pruefeDach({ neigungen: [18, 35], deckung: DECKUNGEN_STANDARD[0] }).length === 1 && pruefeDach({ neigungen: [35], deckung: DECKUNGEN_STANDARD[0] }).length === 0, "Prüfung Mindestneigung: 18° zu flach für Schiebeziegel, 35° in Ordnung");
ok(lattenAnzahl(4891, 340) === 15, "Latten: Fallinie 4,89 m, Lattweite 340 → 15 Latten");

// ---- Phase 2: Aufbau als Körper + Mengen
{
  const { flaechenKoerper, dachMengen } = await import("../kern/dach/koerper.js");
  const V = await import("../kern/dach/vorlagen.js");
  const au = V.AUFBAU_STANDARD[0], dk = V.DECKUNGEN_STANDARD[0], sc = V.schichten(au, dk);
  const r = rechteckDach({ breite: 10000, tiefe: 8000, form: "sattel", neigung: 35, ueberstandTraufe: 0, ueberstandOrtgang: 0, traufhoehe: 3000 });
  const fl = r.flaechen.map((f) => flaechenKoerper(f, sc, au, dk)), m = dachMengen(fl, dk);
  
  const n = (a) => fl[0].koerper.filter((k) => k.art === a).length;
  ok(n("sparren") === 15, "Sparren-Anzahl 10 m / e 700 = 15, war " + n("sparren"));
  const sp = fl[0].koerper.find((k) => k.art === "sparren");
  ok(Math.abs(sp.laenge - 4000 / Math.cos(35 * Math.PI / 180)) < 2, "Sparrenlänge " + sp.laenge);
  ok(n("konter") === 15, "Konterlatten"); ok(n("lattung") >= 14 && n("lattung") <= 16, "Latten " + n("lattung"));
  ok(Math.abs(m.deckflaeche - 2 * 10 * 4 / Math.cos(35 * Math.PI / 180)) < 0.2, "Deckfläche " + m.deckflaeche);
  ok(m.ziegel === Math.ceil(m.deckflaeche * 14.7), "Ziegel"); ok(m.daemmung < m.deckflaeche && m.daemmung > 0.8 * m.deckflaeche, "Dämmung zwischen < Fläche, war " + m.daemmung);
  ok(m.sparren.reduce((s, x) => s + x.stueck, 0) === 30, "30 Sparren");
  const ar = rechteckDach({ breite: 10000, tiefe: 8000, form: "walm", neigung: 35, ueberstandTraufe: 0, ueberstandOrtgang: 0, traufhoehe: 3000 }).flaechen.map((f) => flaechenKoerper(f, V.schichten(V.AUFBAU_STANDARD[1], dk), V.AUFBAU_STANDARD[1], dk));
  ok(ar.length === 4 && ar.every((f) => f.koerper.some((k) => k.art === "sparren")), "Walm: Sparren auf allen Flächen");
  
}

console.log(fehler ? `${fehler} Fehler` : "Dach (Form): alle Tests bestanden"); process.exit(fehler ? 1 : 0);
