// App-Test Projektion: einzelne Fläche/Kante, X = Hilfslinie
// node tests/app-kern/projflaeche.mjs (nach node build.mjs; Playwright/Chromium)
import { createServer } from "node:http"; import { readFileSync } from "node:fs"; import { createRequire } from "node:module"; import { extname, join, resolve } from "node:path";
const dist = resolve("dist"), { chromium } = createRequire(import.meta.url)("playwright");
const typ = { ".html": "text/html", ".js": "text/javascript", ".wasm": "application/wasm", ".json": "application/json" };
const srv = createServer((q, a) => { let p, d; try { p = q.url === "/" ? "index.html" : decodeURIComponent(q.url.slice(1).split("?")[0]); d = readFileSync(join(dist, p)); } catch { a.writeHead(404); a.end(); return; } a.writeHead(200, { "content-type": typ[extname(p)] ?? "application/octet-stream" }); a.end(d); }).listen(+process.env.PORT || 8797);
let fehler = 0; const ok = (c, t) => { console.log(`${c ? "✓" : "✗"} ${t}`); if (!c) fehler++; };
const b = await chromium.launch(), s = await b.newPage({ viewport: { width: 1280, height: 800 } }), pr = []; s.on("pageerror", (e) => pr.push(e.message));
await s.addInitScript(() => localStorage.setItem("sdcad-doc-0.2", JSON.stringify({ objekt: "T", nr: "1", zaehler: 30, features: [
  { id: "s1", typ: "skizze", name: "Skizze 1", ebene: "XY", elemente: [{ id: 1, art: "rechteck", a: [0, 0], b: [50, 40] }], bedingungen: [] },
  { id: "e1", typ: "extrusion", name: "Extrusion 1", skizze: "s1", abstand: 100, richtung: "eine", vorgang: "neu" },
  { id: "s2", typ: "skizze", name: "Skizze 2", ebene: "XY", elemente: [], bedingungen: [] }] })));
await s.goto("http://localhost:" + (process.env.PORT || 8797) + "/index.html?test"); await s.waitForTimeout(1500);
await s.evaluate(() => document.getElementById("zoomAlles").click()); await s.waitForTimeout(300);
await s.evaluate(() => window.sdcadTest.bearbeite("s2")); await s.waitForTimeout(2000);
await s.evaluate(() => document.getElementById("tProjizieren").click()); await s.waitForTimeout(200);
const els = () => s.evaluate(() => window.sdcadTest.dok().features.find((f) => f.id === "s2").elemente);
// obere Fläche des Körpers (z = 100) anklicken: nur ihr Umriss, jede Kante ein eigenes Element
const p = await s.evaluate(() => window.sdcadTest.schirm([25, 20, 100])); await s.mouse.click(p[0], p[1]); await s.waitForTimeout(500); await s.evaluate(() => document.getElementById("pbOk").click()); await s.waitForTimeout(400);
let e = await els(); ok(e.length === 4 && e.every((x) => x.art === "linie" && x.pts.length === 2 && x.projiziert), "Fläche: Umriss als 4 einzelne Kanten (" + e.length + " Elemente)");
await s.keyboard.press("x"); await s.waitForTimeout(300); e = await els();
ok(e.every((x) => x.hilfs), "X macht das zuletzt Projizierte zur Hilfslinie");
await s.keyboard.press("x"); await s.waitForTimeout(300); e = await els(); ok(e.every((x) => !x.hilfs), "nochmals X: wieder normale Linie");
ok(pr.length === 0, "keine Seitenfehler " + pr.join(" | "));
await b.close(); srv.close();
console.log(fehler ? `${fehler} Fehler` : "Projektion Fläche/Kante (App): alle Prüfungen bestanden"); process.exit(fehler ? 1 : 0);
