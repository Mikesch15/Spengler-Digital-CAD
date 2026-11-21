// App-Test Extrusion bis Fläche/Kante
// node tests/app-kern/bis.mjs (nach node build.mjs; Playwright/Chromium)
import { createServer } from "node:http"; import { readFileSync } from "node:fs"; import { createRequire } from "node:module"; import { extname, join, resolve } from "node:path";
const dist = resolve("dist"), { chromium } = createRequire(import.meta.url)("playwright");
const typ = { ".html": "text/html", ".js": "text/javascript", ".wasm": "application/wasm", ".json": "application/json" };
const srv = createServer((q, a) => { let p, d; try { p = q.url === "/" ? "index.html" : decodeURIComponent(q.url.slice(1).split("?")[0]); d = readFileSync(join(dist, p)); } catch { a.writeHead(404); a.end(); return; } a.writeHead(200, { "content-type": typ[extname(p)] ?? "application/octet-stream" }); a.end(d); }).listen(8797);
let fehler = 0; const ok = (c, t) => { console.log(`${c ? "✓" : "✗"} ${t}`); if (!c) fehler++; };
const b = await chromium.launch(), s = await b.newPage({ viewport: { width: 1280, height: 800 } }), pr = []; s.on("pageerror", (e) => pr.push(e.message));
await s.addInitScript(() => localStorage.setItem("sdcad-doc-0.2", JSON.stringify({ objekt: "T", nr: "1", zaehler: 30, features: [
  { id: "s1", typ: "skizze", name: "Skizze 1", ebene: "XY", elemente: [{ id: 1, art: "rechteck", a: [0, 0], b: [50, 40] }], bedingungen: [] },
  { id: "e0", typ: "ebene", art: "versatz", name: "Ebene 80", ref: "XY", abstand: 80 },
  { id: "e1", typ: "extrusion", name: "Extrusion 1", skizze: "s1", abstand: 10, richtung: "eine", bis: "ebene", bisEbene: "e0", vorgang: "neu" },
  { id: "s2", typ: "skizze", name: "Skizze 2", ebene: "XZ", elemente: [{ id: 1, art: "linie", pts: [[0, 60], [40, 60]], geschlossen: false }], bedingungen: [] },
  { id: "e2", typ: "extrusion", name: "Extrusion 2", skizze: "s1", abstand: 10, richtung: "eine", bis: "kante", bisKante: "K:s2:0:0", vorgang: "neu" }] })));
await s.goto("http://localhost:8797/index.html?test"); await s.waitForTimeout(1800);
const k = await s.evaluate(() => window.sdcadTest.koerper());
const e1 = k.find((x) => x.fid === "e1"), e2 = k.find((x) => x.fid === "e2");
ok(e1 && e1.volumen === 160000 && Math.abs(e1.max[2] - 80) < 0.01, "Bis Ebene (z = 80): Volumen 160000, Oberkante " + e1?.max?.[2] + " (" + e1?.volumen + ")");
ok(e2 && Math.abs(Math.abs(e2.volumen - 120000)) < 1 && Math.abs(e2.min[2] + 60) < 0.01, "Bis Kante (liegt bei z = −60 der XZ-Skizze): Volumen 120000, Unterkante " + e2?.min?.[2] + " (" + e2?.volumen + ")");
await s.evaluate(() => window.sdcadTest.bearbeite("e1")); await s.waitForSelector("#d_bis", { state: "attached", timeout: 4000 });
ok(await s.inputValue("#d_bis") === "ebene" && await s.evaluate(() => !!document.getElementById("d_bisEbene")), "Dialog zeigt «Bis Fläche / Ebene» mit Auswahl");
await s.selectOption("#d_bis", "mass", { force: true }); await s.waitForTimeout(500);
ok(await s.evaluate(() => !document.getElementById("d_bisEbene")), "Bei «Mass» verschwindet die Auswahl");
ok(pr.length === 0, "keine Seitenfehler " + pr.join(" | "));
await b.close(); srv.close();
console.log(fehler ? `${fehler} Fehler` : "Bis Fläche/Kante (App): alle Prüfungen bestanden"); process.exit(fehler ? 1 : 0);
