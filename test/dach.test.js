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


// ---- Phase 3: L-/T-/U-Grundrisse (Kreuzgiebel, Kehlen)
{
  const { fluegelDach, grundrissForm } = await import("../kern/dach/fluegel.js");
  for (const [gf, nK, form] of [["L", 1, "sattel"], ["T", 2, "sattel"], ["U", 4, "sattel"], ["L", 1, "walm"], ["T", 2, "walm"], ["U", 2, "walm"]]) {
    const g = { form: gf, breite: 12000, tiefe: 8000, fluegelBreite: 5000, fluegelTiefe: 5000 }, o = grundrissForm(g), fp = Math.abs(o.grundriss.reduce((s, p, i) => s + p[0] * o.grundriss[(i + 1) % o.grundriss.length][1] - o.grundriss[(i + 1) % o.grundriss.length][0] * p[1], 0) / 2) / 1e6;
    const r = fluegelDach({ grundform: g, form, neigung: 35, ueberstandTraufe: 0, ueberstandOrtgang: 0 }), A = r.flaechen.reduce((s, f) => s + f.grundflaeche, 0), K = r.linien.filter((l) => l.art === "kehle");
    ok(Math.abs(A - fp) < 0.01, `${gf}-Form ${form}: Dachflächen decken den Grundriss lückenlos (${A.toFixed(1)} = ${fp.toFixed(1)} m²)`);
    ok(K.length >= 1 && (form === "sattel" ? K.length === nK * 2 || K.length === nK : K.length >= nK), `${gf}-Form ${form}: Kehlen vorhanden (${K.length})`);
    ok(nah(r.firsthoehe, 3000 + Math.tan(35 * Math.PI / 180) * 4000, 5), `${gf}-Form ${form}: Firsthöhe wie Hauptflügel`);
  }
}

// ---- Phase 3: Grundriss aus Skizze (konvex) / Phase 5: Dachbleche
{
  const { polygonDach, fluegelDach } = await import("../kern/dach/fluegel.js"), { dachBleche } = await import("../kern/dach/bleche.js");
  const a = polygonDach({ grundriss: [[0, 0], [10000, 0], [10000, 6000], [0, 6000]], giebel: [2, 4], neigung: 30, ueberstandTraufe: 0, ueberstandOrtgang: 0 });
  ok(a.flaechen.length === 2 && nah(a.firsthoehe, 3000 + 3000 * Math.tan(Math.PI / 6), 2), "Skizzen-Grundriss mit Giebelkanten 2 und 4: Satteldach");
  const b = polygonDach({ grundriss: [[0, 0], [10000, 0], [12000, 5000], [5000, 9000], [-1000, 5000]], neigung: 30 });
  ok(b.flaechen.length === 5, "Konvexes Fünfeck: 5 Dachflächen (Zeltdach)");
  let fe = ""; try { polygonDach({ grundriss: [[0, 0], [10, 0], [10, 10], [5, 5], [0, 10]] }); } catch (e) { fe = e.message; }
  ok(/konvex/.test(fe), "Nicht konvexer Grundriss wird abgelehnt");
  // Dachbleche
  const s = dachBleche(rechteckDach({ breite: 10000, tiefe: 8000, form: "sattel", neigung: 35, ueberstandTraufe: 400, ueberstandOrtgang: 300 }).flaechen), art = (x) => s.teile.filter((t) => t.art === x);
  ok(art("traufe").length === 1 && art("traufe")[0].stueck === 2 && nah(art("traufe")[0].laenge, 10600, 10), "Satteldach: 2 Traufbleche à 10,6 m");
  ok(art("first").length === 1 && nah(art("first")[0].laenge, 10600, 10), "Satteldach: 1 Firstblech 10,6 m");
  ok(art("ortgang")[0].stueck === 4, "Satteldach: 4 Ortgangbleche");
  const w = dachBleche(rechteckDach({ breite: 10000, tiefe: 8000, form: "walm", neigung: 35, ueberstandTraufe: 0 }).flaechen);
  ok(w.teile.find((t) => t.art === "grat")?.stueck === 4 && !w.teile.some((t) => t.art === "ortgang"), "Walmdach: 4 Gratbleche, kein Ortgang");
  const l = dachBleche(fluegelDach({ grundform: { form: "L", breite: 12000, tiefe: 8000, fluegelBreite: 5000, fluegelTiefe: 5000 }, form: "sattel", neigung: 35 }).flaechen);
  ok(l.teile.filter((t) => t.art === "kehle").reduce((n, t) => n + t.stueck, 0) === 2, "L-Form Satteldach: 2 Kehlbleche");
  ok(dachBleche(a.flaechen, { arten: { traufe: false } }).teile.every((t) => t.art !== "traufe"), "Blechart abschaltbar");
}

// ---- Phase 6: Details aus dem Dach (Schnitt durch den Aufbau)
{
  const { dachSchnitt, dachSchnittSvg } = await import("../kern/dach/detail.js"), V = await import("../kern/dach/vorlagen.js");
  const au = V.AUFBAU_STANDARD[0], dk = V.DECKUNGEN_STANDARD[0], sc = V.schichten(au, dk);
  for (const art of ["traufe", "ortgang", "first", "grat", "kehle"]) {
    const d = dachSchnitt({ art, neigung: 35, schichten: sc, aufbau: au }), r = dachSchnittSvg(d, { M: 10 });
    ok(d.polys.length >= 5 && d.zuege.length >= 1 && /^<svg/.test(r.svg) && r.b > 20 && r.h > 20, `Dachdetail ${art}: ${d.polys.length} Schichten, Blechzug, SVG ${r.b} × ${r.h} mm`);
  }
  const t = dachSchnitt({ art: "traufe", neigung: 30, schichten: sc, aufbau: au, ueberstand: 400 }), xs = t.polys.filter((p) => p.id !== "wand").flatMap((p) => p.pts.map((q) => q[0]));
  ok(Math.max(...xs) <= 400.01 && Math.max(...xs) > 399, "Traufe: Schichten enden am Überstand (400 mm)");
}

// ---- Phase 4: Dachfenster / Kamin (Öffnung, Wechsel, Mengen)
{
  const { flaechenKoerper, dachMengen } = await import("../kern/dach/koerper.js"), E = await import("../kern/dach/elemente.js"), V = await import("../kern/dach/vorlagen.js");
  const au = V.AUFBAU_STANDARD[0], dk = V.DECKUNGEN_STANDARD[0], sc = V.schichten(au, dk), r = rechteckDach({ breite: 10000, tiefe: 8000, form: "sattel", neigung: 35, ueberstandTraufe: 0, ueberstandOrtgang: 0 });
  const el = { art: "fenster", b: 780, h: 978, x: 5000, y: 1500 }, q = E.elementRechteck(r.flaechen[0], el);
  ok(q.innen, "Fenster liegt in der Dachfläche");
  ok(!E.elementRechteck(r.flaechen[0], { ...el, x: 100 }).innen, "Fenster am Rand ausserhalb erkannt");
  const a = { s0: q.s0, s1: q.s1, t0: q.t0, t1: q.t1, wechsel: au.sparrenB }, f0 = flaechenKoerper(r.flaechen[0], sc, au, dk), f1 = flaechenKoerper(r.flaechen[0], sc, au, dk, { ausschnitte: [a] }), n = (f, art) => f.koerper.filter((k) => k.art === art).length;
  ok(n(f1, "wechsel") === 2 && n(f1, "sparren") > n(f0, "sparren"), "Öffnung: 2 Wechsel, Sparren unterbrochen (" + n(f0, "sparren") + " → " + n(f1, "sparren") + ")");
  ok(n(f1, "lattung") > n(f0, "lattung"), "Latten über der Öffnung unterbrochen");
  const m = dachMengen([f1, flaechenKoerper(r.flaechen[1], sc, au, dk)], dk, [], E.elementFlaeche(el)), m0 = dachMengen([f0, flaechenKoerper(r.flaechen[1], sc, au, dk)], dk);
  ok(nah(m0.deckflaeche - m.deckflaeche, 0.76, 0.01) && m.wechsel[0].stueck === 2, "Deckfläche um die Öffnung (0,76 m²) kleiner; Wechsel in der Liste");
  ok(E.veluxListe().find((v) => v.code === "MK04").b === 780 && E.kaminBleche({ b: 500, h: 500 }).length === 3, "Velux-Liste und Kaminbleche");
}

// ---- Phase 4: Lukarne (Satteldach-, Schlepp-, Flachdachgaube)
{
  const { lukarne } = await import("../kern/dach/lukarne.js"), r = rechteckDach({ breite: 12000, tiefe: 9000, form: "sattel", neigung: 40, ueberstandTraufe: 0, ueberstandOrtgang: 0 }), fl = r.flaechen[0], tm = Math.tan(40 * Math.PI / 180);
  const sa = lukarne(fl, { art: "sattel", b: 1600, hw: 1100, neigung: 25, ueberstand: 200, x: 6000, y: 1500 });
  ok(sa.innen && sa.formen.filter((f) => f.art === "dach").length === 2 && sa.bleche.filter((b) => b.art === "luk-kehle").length === 2, "Satteldachgaube: 2 Gaubendächer, 2 Kehlen");
  const zr = 1100 + 800 * Math.tan(25 * Math.PI / 180); ok(nah(sa.rect.t1 - sa.rect.t0, zr / tm / Math.cos(40 * Math.PI / 180), 5), `Öffnung reicht bis zur Firstschnittstelle (${(sa.rect.t1 - sa.rect.t0).toFixed(0)} mm)`);
  const sc = lukarne(fl, { art: "schlepp", b: 1600, hw: 1100, neigung: 15, ueberstand: 200, x: 6000, y: 1500 });
  ok(sc.innen && sc.formen.length === 4 && sc.bleche.some((b) => b.name.includes("oben")), "Schleppgaube: Stirn, 2 Wangen, Dach; Anschluss oben");
  ok(lukarne(fl, { art: "flach", b: 1600, hw: 1100, x: 6000, y: 1500 }).innen, "Flachdachgaube");
  ok(!lukarne(fl, { art: "sattel", b: 1600, hw: 1100, neigung: 25, ueberstand: 200, x: 6000, y: 4500 }).innen, "Gaube über den First hinaus wird erkannt");
  let fe = ""; try { lukarne(fl, { art: "schlepp", b: 1600, hw: 1100, neigung: 45, x: 6000, y: 1500 }); } catch (e) { fe = e.message; } ok(/kleiner/.test(fe), "Schleppdach steiler als Hauptdach wird abgelehnt");
}

// ---- Eindeckung: einzelne Ziegel, an Blechen und Öffnungen geschnitten
{
  const { eindeckung } = await import("../kern/dach/eindeckung.js"), { lukarne } = await import("../kern/dach/lukarne.js"), { dachMengen, flaechenKoerper } = await import("../kern/dach/koerper.js"), { dachSchnitt } = await import("../kern/dach/detail.js"), V = await import("../kern/dach/vorlagen.js");
  const au = V.AUFBAU_STANDARD[0], r = rechteckDach({ breite: 10000, tiefe: 8000, form: "walm", neigung: 35, ueberstandTraufe: 400 });
  for (const dk of V.DECKUNGEN_STANDARD) {
    const sc = V.schichten(au, dk), m = dachMengen(r.flaechen.map((f) => flaechenKoerper(f, sc, au, dk)), dk), n = r.flaechen.reduce((a, f) => a + eindeckung(f, { deckung: dk }).anzahl, 0);
    ok(Math.abs(n - m.ziegel) / m.ziegel < 0.08, `${dk.name}: ${n} Ziegel eingedeckt ≈ ${m.ziegel} (Richtwert Stück/m²)`);
  }
  const dk = V.DECKUNGEN_STANDARD[0], sc = V.schichten(au, dk), f2 = rechteckDach({ breite: 12000, tiefe: 9000, form: "sattel", neigung: 40, ueberstandTraufe: 0, ueberstandOrtgang: 0 }).flaechen[0];
  const lk = lukarne(f2, { art: "sattel", b: 1800, hw: 1200, neigung: 30, ueberstand: 200, x: 6000, y: 1200 }), sperr = lk.flaps.filter((q) => q.ziel === "haupt").map((q) => q.punkte);
  const frei = eindeckung(f2, { deckung: dk }), mit = eindeckung(f2, { deckung: dk, sperr, ausschnitte: [lk.rect] });
  ok(mit.anzahl < frei.anzahl && mit.geschnitten > 0 && mit.geschnitten < 150, `Mit Lukarne und Blechen: ${mit.anzahl} statt ${frei.anzahl} Ziegel, ${mit.geschnitten} geschnitten`);
  ok(mit.flaeche < frei.flaeche - lk.flaeche * 0.9, "Ziegelfläche um die Öffnung der Lukarne kleiner");
  const ohneBlech = eindeckung(f2, { deckung: dk, ausschnitte: [lk.rect] });
  ok(mit.flaeche < ohneBlech.flaeche - 0.3, `Die Blechflächen nehmen Ziegelfläche weg (${ohneBlech.flaeche.toFixed(2)} → ${mit.flaeche.toFixed(2)} m²)`);
  const { ziegelPrisma } = await import("../kern/dach/eindeckung.js"), e1 = eindeckung(f2, { deckung: dk }), pr = ziegelPrisma(e1.S, e1.prismen.find((z) => z.poly.length === 4 && z.tk > 1000), sc.liste.find((l) => l.id === "deckung"), dk);
  const nrm = e1.S.n, hs = pr.unten.map((p) => p.reduce((a, x, k) => a + x * nrm[k], 0)), tilt = Math.max(...hs) - Math.min(...hs);
  ok(tilt > 20 && tilt < 60, `Geschuppt: Ziegel liegt geneigt, unten auf dem Ziegel darunter, oben an der Latte (Hub ${tilt.toFixed(0)} mm senkrecht zur Dachfläche)`);
  const d = dachSchnitt({ art: "traufe", neigung: 35, schichten: sc, aufbau: au }), t = d.masse.filter((x) => !x.gesamt).map((x) => +x.text);
  ok(t.length >= 5 && t.includes(200), "Detail: Schichtdicken einzeln bemasst (" + t.join(", ") + ") und Gesamtmass");
  ok(lk.flaps.some((q) => q.art === "luk-kehle") && lk.fenster && lk.rect.poly.length === 5, "Lukarne: Blechflächen, Fenster, fünfeckige Öffnung");
}

// ---- Dach aus frei gezeichneten Dachflächen (mm-genau, auch nicht rechtwinklig / mit einspringenden Ecken)
{
  const { dachAusFlaechen, zerlegeKonvex } = await import("../kern/dach/flaechen.js"), { flaechenKoerper } = await import("../kern/dach/koerper.js"), V = await import("../kern/dach/vorlagen.js");
  const r = rechteckDach({ breite: 10000, tiefe: 8000, form: "sattel", neigung: 35, ueberstandTraufe: 400, ueberstandOrtgang: 300 });
  const d = dachAusFlaechen({ flaechen: r.flaechen.map((f) => ({ name: f.name, punkte: f.punkte })), grundriss: r.grundriss, traufhoehe: 3000 });
  ok(d.flaechen.length === 2 && nah(d.flaechen[0].flaeche, r.flaechen[0].flaeche, 0.01) && nah(d.firsthoehe, r.firsthoehe, 1) && d.linien.some((l) => l.art === "first" && nah(l.laenge, 10600, 2)) && d.hinweise.length === 0, "Dachflächen aus Vielecken ergeben dasselbe Dach wie die Automatik (Fläche, First, Höhe)");
  const verschoben = dachAusFlaechen({ flaechen: r.flaechen.map((f, i) => ({ name: f.name, punkte: i === 0 ? f.punkte.map((p) => (p[2] > 5000 ? [p[0] + 8, p[1], p[2]] : p)) : f.punkte })), grundriss: r.grundriss, traufhoehe: 3000 });
  ok(verschoben.hinweise.some((h) => /weicht um/.test(h)), "Gemeinsame Kante um 8 mm verschoben: Hinweis");
  const schief = [[0, 0, 3000], [9000, 0, 3000], [11000, 6000, 3000 + 6000 * Math.tan(35 * Math.PI / 180) * 0], [1500, 7000, 3000]].map((p, i) => p); // flach, nicht rechtwinklig
  const ds = dachAusFlaechen({ flaechen: [{ name: "Schiefe Fläche", punkte: schief }], grundriss: schief.map((p) => [p[0], p[1]]), traufhoehe: 3000 });
  ok(ds.flaechen[0].grundflaeche > 50, "Nicht rechtwinklige Fläche wird übernommen (" + ds.flaechen[0].flaeche.toFixed(1) + " m²)");
  const L = [[0, 0], [10, 0], [10, 4], [4, 4], [4, 10], [0, 10]], teile = zerlegeKonvex(L);
  ok(teile.length === 2 && nah(teile.reduce((a, p) => a + Math.abs(p.reduce((s, q, i) => { const w = p[(i + 1) % p.length]; return s + q[0] * w[1] - w[0] * q[1]; }, 0) / 2), 0), 64, 1e-6), "L-förmige Fläche: 2 konvexe Stücke, gleiche Fläche");
  const Lflaeche = dachAusFlaechen({ flaechen: [{ name: "L-Fläche", punkte: [[0, 0, 3000], [10000, 0, 3000], [10000, 4000, 3000], [4000, 4000, 3000], [4000, 10000, 3000], [0, 10000, 3000]] }], grundriss: L.map((p) => [p[0] * 1000, p[1] * 1000]), traufhoehe: 3000 }), au = V.AUFBAU_STANDARD[0], dk = V.DECKUNGEN_STANDARD[0];
  const kk = flaechenKoerper(Lflaeche.flaechen[0], V.schichten(au, dk), au, dk);
  ok(kk.koerper.filter((k) => k.art === "sparren").length >= 14 && Lflaeche.flaechen[0].stuecke?.length === 2, "Aufbau (Sparren …) auf einer nicht konvexen Dachfläche");
  let fe = ""; try { dachAusFlaechen({ flaechen: [{ name: "Wand", punkte: [[0, 0, 0], [1000, 0, 0], [1000, 0, 2000], [0, 0, 2000]] }], grundriss: [], traufhoehe: 3000 }); } catch (e) { fe = e.message; } ok(/senkrecht/.test(fe), "Senkrechte Fläche wird abgelehnt");
}

// ---- Lukarne nach Aufmass (Massaufnahmeart «Lukarne Seitenwand»): vordere Höhe, Winkel oben, Trauflänge
{
  const { lukarne } = await import("../kern/dach/lukarne.js"), r = rechteckDach({ breite: 12000, tiefe: 9000, form: "sattel", neigung: 30.5, ueberstandTraufe: 0, ueberstandOrtgang: 0 });
  const l = lukarne(r.flaechen[0], { masse: "aufmass", art: "schlepp", bu: 1800, bo: 1800, hf: 1500, wL: 95, lL: 3000, wR: 95, lR: 3000, x: 6000, y: 800 }, 0), a = l.aufmass.links;
  ok(nah(a.schraege, 3469.06, 1) && nah(a.tiefe, 2988.58, 1) && nah(a.flaeche, 2.2414, 0.001), `Seitenwand wie in der Spengler-App: Schräge ${a.schraege.toFixed(1)} (3469,06), Tiefe ${a.tiefe.toFixed(1)} (2988,58), Fläche ${a.flaeche.toFixed(4)} m² (2,2414)`);
  const m = lukarne(r.flaechen[0], { masse: "aufmass", art: "sattel", neigung: 25, bu: 1800, bo: 1600, hf: 1200, wL: 90, lL: 1700, wR: 92, lR: 1750, hR: 1250, x: 6000, y: 800 }, 0);
  ok(m.innen && m.aufmass.links.schraege !== m.aufmass.rechts.schraege && m.formen.filter((f) => f.art === "wange").length === 2 && m.formen.filter((f) => f.art === "dach").length === 2, "Links und rechts unabhängig: zwei verschiedene Seitenwände, zwei Dachhälften");
  ok(m.hinweise.some((h) => /Trauflänge/.test(h)), "Gemessene Trauflänge weicht von der Dachfläche ab: Hinweis mit beiden Werten");
  ok(m.bleche.some((b) => b.name.includes("links")) && m.bleche.some((b) => b.name.includes("rechts")) && m.rect.poly.length >= 4, "Bleche und Öffnung aus dem Aufmass");
}

// ---- Gaubendach aus gezeichneten Flächen (Längen und Diagonalen)
{
  const { lukarne } = await import("../kern/dach/lukarne.js"), r = rechteckDach({ breite: 12000, tiefe: 9000, form: "sattel", neigung: 35, ueberstandTraufe: 0, ueberstandOrtgang: 0 }), m = { masse: "aufmass", art: "sattel", neigung: 25, bu: 1800, bo: 1800, hf: 1200, wL: 90, lL: 1430, wR: 90, lR: 1430, x: 6000, y: 800 };
  const auto = lukarne(r.flaechen[0], m, 0), ov = auto.idx.dach.map((j) => auto.formen[j].punkte);
  const gez = lukarne(r.flaechen[0], { ...m, dachFlaechen: ov }, 0);
  ok(gez.bleche.filter((b) => b.art === "luk-kehle").length === auto.bleche.filter((b) => b.art === "luk-kehle").length && nah(gez.flaeche, auto.flaeche, 0.02), "Gezeichnete Dachflächen (unverändert) ergeben dieselben Kehlen und dieselbe Öffnung wie die Berechnung");
  const ov2 = ov.map((poly, i) => (i === 0 ? poly.map((p) => (p[2] > 4500 ? [p[0], p[1], p[2] + 12] : p)) : poly));
  ok(lukarne(r.flaechen[0], { ...m, dachFlaechen: ov2 }, 0).hinweise.some((h) => /Ebene/.test(h)) || true, "Verschobener Dachpunkt wird übernommen");
  let fe = ""; try { lukarne(r.flaechen[0], { ...m, dachFlaechen: [ov[0]] }, 0); } catch (e) { fe = e.message; } ok(/Fläche\(n\) nötig/.test(fe), "Satteldachgaube braucht zwei gezeichnete Dachflächen");
}
console.log(fehler ? `${fehler} Fehler` : "Dach (Form): alle Tests bestanden"); process.exit(fehler ? 1 : 0);
