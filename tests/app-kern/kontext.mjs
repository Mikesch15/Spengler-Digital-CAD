// App-Test Kontextleiste: passende Werkzeuge je Auswahl
// node tests/app-kern/kontext.mjs (nach node build.mjs; Playwright/Chromium)
import { createServer } from "node:http"; import { readFileSync } from "node:fs"; import { createRequire } from "node:module"; import { extname, join, resolve } from "node:path";
const dist = resolve("dist"), { chromium } = createRequire(import.meta.url)("playwright");
const typ = { ".html": "text/html", ".js": "text/javascript", ".wasm": "application/wasm", ".json": "application/json" };
const srv = createServer((q, a) => { let p, d; try { p = q.url === "/" ? "index.html" : decodeURIComponent(q.url.slice(1).split("?")[0]); d = readFileSync(join(dist, p)); } catch { a.writeHead(404); a.end(); return; } a.writeHead(200, { "content-type": typ[extname(p)] ?? "application/octet-stream" }); a.end(d); }).listen(8797);
let fehler = 0; const ok = (c, t) => { console.log(`${c ? "✓" : "✗"} ${t}`); if (!c) fehler++; };
const b = await chromium.launch(), pr = [];
const neu = async (features) => { const s = await b.newPage({ viewport: { width: 1280, height: 800 } }); s.on("pageerror", (e) => pr.push(e.message)); await s.addInitScript((f) => localStorage.setItem("sdcad-doc-0.2", JSON.stringify({ objekt: "T", nr: "1", zaehler: 50, features: f })), features); await s.goto("http://localhost:8797/index.html?test"); await s.waitForTimeout(1500); await s.evaluate(() => document.getElementById("zoomAlles").click()); await s.waitForTimeout(300); return s; };
const warte = (s) => s.waitForTimeout(450);
const aktionen = (s) => s.evaluate(() => window.sdcadTest.kontext());
const klickAm = async (s, p) => { const q = await s.evaluate((x) => window.sdcadTest.schirm(x), p); await s.mouse.move(q[0], q[1]); await s.mouse.click(q[0], q[1]); await warte(s); };
const knopf = (s, text) => s.evaluate((t) => { const b = [...document.querySelectorAll("#kontextBar .kk-knopf")].find((x) => x.textContent.trim() === t); if (!b) return false; b.click(); return true; }, text);

// 1) Skizzen: geschlossene Fläche und offener Linienzug
{ const s = await neu([
  { id: "s1", typ: "skizze", name: "Skizze 1", ebene: "XY", elemente: [{ id: 1, art: "rechteck", a: [0, 0], b: [100, 60] }], bedingungen: [] },
  { id: "s2", typ: "skizze", name: "Skizze 2", ebene: "XY", elemente: [{ id: 1, art: "linie", pts: [[0, 120], [80, 120], [80, 180]], geschlossen: false }], bedingungen: [] }]);
  await klickAm(s, [50, 30, 0]); let k = await aktionen(s);
  ok(/Skizze «Skizze 1»/.test(k.titel) && ["Extrudieren", "Flächenblech", "Drehen"].every((x) => k.aktionen.includes(x)), "Klick in die Skizzenfläche: Extrudieren / Flächenblech / Drehen (" + k.aktionen.join(", ") + ")");
  ok(await s.evaluate(() => !document.getElementById("kontextBar").hidden), "Kontextleiste ist sichtbar");
  await klickAm(s, [40, 120, 0]); k = await aktionen(s);
  ok(/Skizze 2/.test(k.titel) && k.aktionen.includes("Blechprofil") && k.aktionen.includes("Sweep") && !k.aktionen.includes("Extrudieren"), "Offener Linienzug: Blechprofil / Sweep, kein Extrudieren (" + k.aktionen.join(", ") + ")");
  await klickAm(s, [50, 30, 0]); await knopf(s, "Flächenblech"); await s.waitForSelector("#d_skizze", { state: "attached" });
  ok(await s.inputValue("#d_skizze") === "s1", "Flächenblech-Dialog übernimmt die gewählte Skizze (nicht die letzte)");
  await s.click("#dAbbrechen"); await warte(s);
  await klickAm(s, [50, 30, 0]); await knopf(s, "Extrudieren"); await s.waitForSelector("#d_abstand", { state: "attached" });
  ok(await s.inputValue("#d_skizze") === "s1", "Extrusion übernimmt die gewählte Skizze");
  await s.click("#dAbbrechen"); await warte(s);
  await klickAm(s, [40, 120, 0]); await knopf(s, "Blechprofil"); await s.waitForSelector("#d_kette", { state: "attached" });
  ok(await s.inputValue("#d_skizze") === "s2", "Blechprofil übernimmt die gewählte Skizze s2");
  await s.close(); }

// 2) Körper, Kante, Fläche
{ const s = await neu([
  { id: "s1", typ: "skizze", name: "Skizze 1", ebene: "XY", elemente: [{ id: 1, art: "rechteck", a: [0, 0], b: [100, 60] }], bedingungen: [] },
  { id: "e1", typ: "extrusion", name: "Extrusion 1", skizze: "s1", abstand: 50, richtung: "eine", vorgang: "neu" }]);
  await klickAm(s, [50, 30, 50]); let k = await aktionen(s);
  ok(/Fläche von «Extrusion 1»/.test(k.titel) && k.aktionen.includes("Skizze auf Fläche") && k.aktionen.includes("Blech auf Fläche"), "Klick auf eine Körperfläche: Skizze auf Fläche / Blech auf Fläche (" + k.aktionen.join(", ") + ")");
  await klickAm(s, [50, 0, 50]); k = await aktionen(s);
  ok(/Kante von «Extrusion 1»/.test(k.titel) && k.aktionen.includes("Abrunden") && k.aktionen.includes("Fasen"), "Klick auf eine Kante: Abrunden / Fasen (" + k.aktionen.join(", ") + ")");
  await knopf(s, "Fasen"); await s.waitForSelector("#d_mass", { state: "attached" });
  ok(await s.inputValue("#d_art") === "fase" && /1 Kante gewählt/.test(await s.textContent("#kKanten")), "Fasen-Dialog mit der angeklickten Kante vorbelegt");
  await s.click("#dAbbrechen"); await warte(s);
  await s.evaluate(() => window.sdcadTest.waehle("e1")); await warte(s); k = await aktionen(s);
  ok(/Körper «Extrusion 1»/.test(k.titel) && k.aktionen.includes("Kanten abrunden / fasen") && k.aktionen.includes("Schale"), "Körper gewählt: Kanten abrunden / Schale / Muster … (" + k.aktionen.join(", ") + ")");
  await klickAm(s, [50, 30, 50]); await knopf(s, "Skizze auf Fläche"); await s.waitForTimeout(800);
  ok(await s.evaluate(() => !document.getElementById("gSkizze").hidden), "Skizze auf Fläche startet das Zeichnen auf dieser Fläche");
  await s.close(); }

// 3) Bleche
{ const s = await neu([
  { id: "s1", typ: "skizze", name: "Skizze 1", ebene: "XY", elemente: [{ id: 1, art: "linie", pts: [[0, 0], [100, 0], [100, 60]], geschlossen: false }], bedingungen: [] },
  { id: "b1", typ: "blech", name: "Blechprofil 1", skizze: "s1", kette: 0, lage: "mitte", material: "zink07", laenge: 300, stueck: 1, richtung: "eine" }]);
  await s.evaluate(() => window.sdcadTest.waehle("b1")); await warte(s); const k = await aktionen(s);
  ok(/Blechprofil «Blechprofil 1»/.test(k.titel) && ["Flansch", "Umschlag", "Kantenbaustein"].every((x) => k.aktionen.includes(x)), "Blechprofil gewählt: Flansch / Umschlag / Kantenbaustein (" + k.aktionen.join(", ") + ")");
  await knopf(s, "Flansch"); await warte(s);
  ok(await s.evaluate(() => !document.getElementById("kbEnden").hidden && /Kante A/.test(document.getElementById("kbA").textContent)), "Flansch startet mit dem gewählten Blechprofil (Kante A / B wählbar)");
  await s.close(); }

// 4) Dach: gewähltes Dach wird vorbelegt, Leiste verschwindet bei offenem Dialog
{ const g = (id, x) => ({ id, typ: "gebaeude", name: "Gebäude " + id, breite: 10000, tiefe: 8000, traufhoehe: 3000, wandstaerke: 300, x, z: 0 });
  const d = (id, gid, x) => ({ id, typ: "dach", name: "Dach " + id, gebaeude: gid, form: "sattel", firstRichtung: "laengs", neigung: 35, neigung2: 35, ueberstandTraufe: 400, ueberstandOrtgang: 300 });
  const s = await neu([g("g1", 0), d("d1", "g1"), g("g2", 20000), d("d2", "g2")]);
  await s.evaluate(() => window.sdcadTest.waehle("d1")); await warte(s); const k = await aktionen(s);
  ok(/Dach «Dach d1»/.test(k.titel) && ["Dachbleche", "Fenster / Kamin", "Lukarne", "Ziegel eindecken"].every((x) => k.aktionen.includes(x)), "Dach gewählt: Dachbleche / Fenster / Lukarne / Eindeckung (" + k.aktionen.join(", ") + ")");
  await knopf(s, "Lukarne"); await s.waitForSelector("#d_dach", { state: "attached" });
  ok(await s.inputValue("#d_dach") === "d1", "Lukarne-Dialog übernimmt das gewählte Dach d1 (nicht das letzte d2)");
  ok(await s.evaluate(() => document.getElementById("kontextBar").hidden), "Bei offenem Dialog ist die Kontextleiste ausgeblendet");
  await s.close(); }
// 5) Fertige Skizze ist gewählt; Doppelklick auf das Gewählte = Bearbeiten
{ const s = await neu([
  { id: "s1", typ: "skizze", name: "Skizze 1", ebene: "XY", elemente: [{ id: 1, art: "rechteck", a: [0, 0], b: [100, 60] }], bedingungen: [] },
  { id: "e1", typ: "extrusion", name: "Extrusion 1", skizze: "s1", abstand: 50, richtung: "eine", vorgang: "neu" }]);
  await s.evaluate(() => window.sdcadTest.bearbeite("s1")); await s.waitForTimeout(1500); await s.evaluate(() => window.sdcadTest.beendeSkizze()); await s.waitForTimeout(600);
  const k = await aktionen(s); ok(/Skizze «Skizze 1»/.test(k.titel) && k.aktionen.includes("Extrudieren"), "Nach «Skizze beenden» ist die Skizze gewählt und die Leiste bietet Extrudieren an (" + k.titel + ")");
  await s.evaluate(() => window.sdcadTest.waehle("e1")); await warte(s);
  const q = await s.evaluate(() => window.sdcadTest.schirm([50, 30, 50])); await s.mouse.dblclick(q[0], q[1]); await s.waitForSelector("#d_abstand", { state: "attached", timeout: 4000 });
  ok(await s.evaluate(() => !document.getElementById("dialog").hidden), "Doppelklick auf den Körper öffnet «Bearbeiten»");
  await s.close(); }
// 6) Skizze auf einer Körperfläche: Extrusion schlägt «Vereinigen» vor
{ const s = await neu([
  { id: "s1", typ: "skizze", name: "Skizze 1", ebene: "XY", elemente: [{ id: 1, art: "rechteck", a: [0, 0], b: [100, 60] }], bedingungen: [] },
  { id: "e1", typ: "extrusion", name: "Extrusion 1", skizze: "s1", abstand: 50, richtung: "eine", vorgang: "neu" },
  { id: "eb1", typ: "ebene", art: "flaeche", name: "Ebene auf Fläche 1", flaeche: "F:50,30,50;0,0,1" },
  { id: "s3", typ: "skizze", name: "Skizze 3", ebene: "eb1", elemente: [{ id: 1, art: "rechteck", a: [20, 20], b: [40, 40] }], bedingungen: [] }]);
  await s.evaluate(() => window.sdcadTest.waehle("s3")); await warte(s); await knopf(s, "Extrudieren"); await s.waitForSelector("#d_vorgang", { state: "attached" });
  ok(await s.inputValue("#d_skizze") === "s3" && await s.inputValue("#d_vorgang") === "verbinden", "Skizze auf Körperfläche: Extrusion schlägt «Vereinigen» vor (" + await s.inputValue("#d_vorgang") + ")");
  await s.close(); }
// 7) «Dach darauf» übernimmt die Skizze als Grundriss; «Mehr …» öffnet die Befehlssuche
{ const s = await neu([
  { id: "s1", typ: "skizze", name: "Skizze 1", ebene: "XY", elemente: [{ id: 1, art: "rechteck", a: [0, 0], b: [10000, 6000] }], bedingungen: [] },
  { id: "e1", typ: "extrusion", name: "Extrusion 1", skizze: "s1", abstand: 50, richtung: "eine", vorgang: "neu" }]);
  await s.evaluate(() => window.sdcadTest.waehle("s1")); await warte(s); const k = await aktionen(s);
  ok(k.aktionen.includes("Dach darauf"), "Geschlossene Skizze bietet «Dach darauf» an");
  await knopf(s, "Dach darauf"); await s.waitForSelector("#d_gform", { state: "attached" });
  ok(await s.inputValue("#d_gform") === "skizze" && await s.inputValue("#d_gskizze") === "s1", "Dach-Dialog: Grundform «Aus Skizze» mit der gewählten Skizze");
  await s.click("#dAbbrechen"); await warte(s);
  await s.evaluate(() => window.sdcadTest.waehle("e1")); await warte(s);
  ok(await s.evaluate(() => !!document.querySelector("#kontextBar .kk-mehr") && [...document.querySelectorAll("#kontextBar .kk-knopf")].some((b) => b.textContent.trim() === "Bearbeiten")), "Körper: «Bearbeiten» bleibt sichtbar, «Mehr …» für den Rest");
  await s.evaluate(() => document.querySelector("#kontextBar .kk-mehr").click()); await s.waitForSelector(".bs input", { timeout: 3000 });
  ok(true, "«Mehr …» öffnet die Befehlssuche");
  await s.close(); }
ok(pr.length === 0, "keine Seitenfehler " + pr.join(" | "));
await b.close(); srv.close();
console.log(fehler ? `${fehler} Fehler` : "Kontextleiste (App): alle Prüfungen bestanden"); process.exit(fehler ? 1 : 0);
