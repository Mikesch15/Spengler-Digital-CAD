// App-Test Blechprofil: nachträglich Flansch/Umschlag an Kante A und B ansetzen (Kanten-Werkzeug)
// node tests/app-kern/stirnflansch.mjs (nach node build.mjs; Playwright/Chromium)
import { createServer } from "node:http"; import { readFileSync } from "node:fs"; import { createRequire } from "node:module"; import { extname, join, resolve } from "node:path";
const dist = resolve("dist"), { chromium } = createRequire(import.meta.url)("playwright");
const typ = { ".html": "text/html", ".js": "text/javascript", ".wasm": "application/wasm", ".json": "application/json" };
const srv = createServer((q, a) => { let p, d; try { p = q.url === "/" ? "index.html" : decodeURIComponent(q.url.slice(1).split("?")[0]); d = readFileSync(join(dist, p)); } catch { a.writeHead(404); a.end(); return; } a.writeHead(200, { "content-type": typ[extname(p)] ?? "application/octet-stream" }); a.end(d); }).listen(+process.env.PORT || 8797);
let fehler = 0; const ok = (c, t) => { console.log(`${c ? "✓" : "✗"} ${t}`); if (!c) fehler++; };
const b = await chromium.launch(), s = await b.newPage({ viewport: { width: 1280, height: 800 } }), pr = []; s.on("pageerror", (e) => pr.push(e.message)); s.on("dialog", (d) => d.accept("2"));
await s.addInitScript(() => localStorage.setItem("sdcad-doc-0.2", JSON.stringify({ objekt: "T", nr: "1", zaehler: 20, features: [
  { id: "s1", typ: "skizze", name: "Skizze 1", ebene: "XY", elemente: [{ id: 1, art: "rechteck", a: [0, 0], b: [100, 60] }], bedingungen: [] },
  { id: "k0", typ: "skizze", name: "Körperprofil", ebene: "XY", elemente: [{ id: 5, art: "rechteck", a: [-50, -30], b: [50, 30] }], bedingungen: [] },
  { id: "e0", typ: "extrusion", name: "Block", skizze: "k0", abstand: 40, richtung: "eine", vorgang: "neu" },
  { id: "s2", typ: "skizze", name: "Schnittskizze", ebene: "XZ", elemente: [], bedingungen: [] }] })));
await s.goto("http://localhost:" + (process.env.PORT || 8797) + "/index.html?test"); await s.waitForTimeout(1800);
const els = (id) => s.evaluate((i) => window.sdcadTest.dok().features.find((f) => f.id === i).elemente, id);
// Fase
await s.evaluate(() => window.sdcadTest.bearbeite("s1")); await s.waitForTimeout(1500);
await s.evaluate(() => document.getElementById("zoomAlles").click()); await s.waitForTimeout(300);
await s.evaluate(() => document.getElementById("tFase").click()); await s.waitForTimeout(200);
await s.evaluate(() => { const e = document.getElementById("eLaenge"); e.value = "10"; e.dispatchEvent(new Event("input", { bubbles: true })); e.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true })); }); await s.waitForTimeout(200);
const q = await s.evaluate(() => window.sdcadTest.schirmUV("XY", [0, 0])); await s.mouse.click(q[0], q[1]); await s.waitForTimeout(400);
let e = await els("s1"); const lin = e.find((x) => x.art === "linie");
ok(lin && lin.pts.length === 5 && lin.pts.some((p) => Math.abs(p[0] - 10) < 1e-6 && Math.abs(p[1]) < 1e-6) && lin.pts.some((p) => Math.abs(p[0]) < 1e-6 && Math.abs(p[1] - 10) < 1e-6), "Fase 10 mm: Ecke durch zwei Punkte (10,0) und (0,10) ersetzt (" + JSON.stringify(lin?.pts) + ")");
// Skalieren
await s.evaluate(() => document.getElementById("tSkalieren").click()); await s.waitForTimeout(500); e = await els("s1");
const xs = e.find((x) => x.art === "linie").pts.map((p) => p[0]), brt = Math.max(...xs) - Math.min(...xs); ok(Math.abs(brt - 200) < 1e-6, `Skalieren ×2: Breite ${brt.toFixed(1)} mm`);
await s.evaluate(() => window.sdcadTest.beendeSkizze()); await s.waitForTimeout(300);
// Schnitt mit Körper
await s.evaluate(() => window.sdcadTest.bearbeite("s2")); await s.waitForTimeout(1500);
await s.evaluate(() => document.getElementById("tSchnitt").click()); await s.waitForTimeout(300); const q2 = await s.evaluate(() => window.sdcadTest.schirmUV("XZ", [0, 0])); await s.mouse.click(q2[0], q2[1]); await s.waitForTimeout(500);
e = await els("s2"); const pk = e.flatMap((x) => x.pts || []); ok(e.length >= 4 && e.every((x) => x.projiziert) && Math.max(...pk.map((p) => p[0])) - Math.min(...pk.map((p) => p[0])) > 99 && Math.max(...pk.map((p) => p[1])) - Math.min(...pk.map((p) => p[1])) > 39, `Schnitt mit Körper: Querschnitt 100 × 40 als fixierte Linien (${e.length} Elemente)`);
ok(pr.length === 0, "keine Seitenfehler " + pr.join(" | "));
await b.close(); srv.close();
console.log(fehler ? `${fehler} Fehler` : "Skizze Fase/Skalieren/Schnitt (App): alle Prüfungen bestanden"); process.exit(fehler ? 1 : 0);
