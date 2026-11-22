// App-Test Direktwahl am Modell: Dachfläche (mit Lage), Körper, Blechkanten
// node tests/app-kern/direktwahl.mjs (nach node build.mjs; Playwright/Chromium)
import { createServer } from "node:http"; import { readFileSync } from "node:fs"; import { createRequire } from "node:module"; import { extname, join, resolve } from "node:path";
const dist = resolve("dist"), { chromium } = createRequire(import.meta.url)("playwright");
const typ = { ".html": "text/html", ".js": "text/javascript", ".wasm": "application/wasm", ".json": "application/json" };
const srv = createServer((q, a) => { let p, d; try { p = q.url === "/" ? "index.html" : decodeURIComponent(q.url.slice(1).split("?")[0]); d = readFileSync(join(dist, p)); } catch { a.writeHead(404); a.end(); return; } a.writeHead(200, { "content-type": typ[extname(p)] ?? "application/octet-stream" }); a.end(d); }).listen(+process.env.PORT || 8797);
let fehler = 0; const ok = (c, t) => { console.log(`${c ? "✓" : "✗"} ${t}`); if (!c) fehler++; };
const b = await chromium.launch(), pr = [];
const neu = async (features) => { const s = await b.newPage({ viewport: { width: 1280, height: 800 } }); s.on("pageerror", (e) => pr.push(e.message)); await s.addInitScript((f) => localStorage.setItem("sdcad-doc-0.2", JSON.stringify({ objekt: "T", nr: "1", zaehler: 50, features: f })), features); await s.goto("http://localhost:" + (process.env.PORT || 8797) + "/index.html?test"); await s.waitForTimeout(1800); await s.evaluate(() => document.getElementById("zoomAlles").click()); await s.waitForTimeout(400); return s; };
const g = { id: "g1", typ: "gebaeude", name: "Gebäude 1", breite: 10000, tiefe: 8000, traufhoehe: 3000, wandstaerke: 300, x: 0, z: 0 };
const d = { id: "d1", typ: "dach", name: "Dach 1", gebaeude: "g1", form: "sattel", firstRichtung: "laengs", neigung: 35, neigung2: 35, ueberstandTraufe: 400, ueberstandOrtgang: 300 };
// 1) Dachfenster: Dachfläche anklicken setzt Fläche und Lage
{ const s = await neu([g, d]);
  await s.evaluate(() => document.getElementById("wDachElement").click()); await s.waitForSelector("#d_flaeche", { state: "attached" }); await s.waitForTimeout(500);
  const w = async (ds, dt) => { const q = await s.evaluate(([a, c]) => window.sdcadTest.dachPunkt("d1", 0, a, c), [ds, dt]); await s.mouse.move(q[0], q[1]); await s.mouse.click(q[0], q[1]); await s.waitForTimeout(500); return [+(await s.inputValue("#d_x")), +(await s.inputValue("#d_y")), await s.inputValue("#d_flaeche")]; };
  const a1 = await w(0.25, 0.5), a2 = await w(0.75, 0.3);
  ok(a1[2] === "0" && a2[2] === "0" && a2[0] > a1[0] + 2000, `Dachfläche anklicken: Lage folgt dem Klick (x ${a1[0]} → ${a2[0]} mm)`);
  ok(a2[1] > 0, "Unterkante ab Traufe aus dem Klick berechnet (y " + a2[1] + " mm)");
  ok(await s.evaluate(() => !!document.querySelector('#dInhalt .feld[data-wahl="dachflaeche"]')), "Dachfläche ist ein Wahlfeld (⊕)");
  await s.close(); }
// 2) Körper per Klick für Schale
{ const s = await neu([
  { id: "s1", typ: "skizze", name: "Skizze 1", ebene: "XY", elemente: [{ id: 1, art: "rechteck", a: [0, 0], b: [100, 60] }], bedingungen: [] },
  { id: "e1", typ: "extrusion", name: "Extrusion 1", skizze: "s1", abstand: 50, richtung: "eine", vorgang: "neu" },
  { id: "s2", typ: "skizze", name: "Skizze 2", ebene: "XY", elemente: [{ id: 1, art: "rechteck", a: [200, 0], b: [260, 40] }], bedingungen: [] },
  { id: "e2", typ: "extrusion", name: "Extrusion 2", skizze: "s2", abstand: 30, richtung: "eine", vorgang: "neu" }]);
  await s.evaluate(() => document.querySelector('[data-kwz="schale"]').click()); await s.waitForSelector("#d_ziel", { state: "attached" });
  ok(await s.evaluate(() => !!document.querySelector('#dInhalt .feld[data-wahl="koerper"]')), "Körper ist ein Wahlfeld (⊕)");
  const v0 = await s.inputValue("#d_ziel"); const q = await s.evaluate(() => window.sdcadTest.schirm([30, 20, 50])); await s.mouse.click(q[0], q[1]); await s.waitForTimeout(400);
  const q2 = await s.evaluate(() => window.sdcadTest.schirm([230, 20, 30])); await s.mouse.click(q2[0], q2[1]); await s.waitForTimeout(400);
  ok(await s.inputValue("#d_ziel") === "e2", "Anklicken des Körpers wählt ihn für die Schale (vorher " + v0 + ")");
  await s.close(); }
ok(pr.length === 0, "keine Seitenfehler " + pr.join(" | "));
await b.close(); srv.close();
console.log(fehler ? `${fehler} Fehler` : "Direktwahl (App): alle Prüfungen bestanden"); process.exit(fehler ? 1 : 0);
