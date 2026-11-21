// App-Test Dach-Modus Phase 3/5: Grundriss aus Skizze (konvex, Giebelkanten) und Dachbleche (Spengler-Brücke) mit Abwicklung
// node tests/app-kern/dachbleche.mjs (nach node build.mjs; Playwright/Chromium)
import { createServer } from "node:http"; import { readFileSync } from "node:fs"; import { createRequire } from "node:module"; import { extname, join, resolve } from "node:path";
const dist = resolve("dist"), { chromium } = createRequire(import.meta.url)("playwright");
const typ = { ".html": "text/html", ".js": "text/javascript", ".wasm": "application/wasm", ".json": "application/json" };
const srv = createServer((q, a) => { let p, d; try { p = q.url === "/" ? "index.html" : decodeURIComponent(q.url.slice(1).split("?")[0]); d = readFileSync(join(dist, p)); } catch { a.writeHead(404); a.end(); return; } a.writeHead(200, { "content-type": typ[extname(p)] ?? "application/octet-stream" }); a.end(d); }).listen(8797);
let fehler = 0; const ok = (c, t) => { console.log(`${c ? "✓" : "✗"} ${t}`); if (!c) fehler++; };
const b = await chromium.launch(), s = await b.newPage({ viewport: { width: 1280, height: 800 } }), pr = []; s.on("pageerror", (e) => pr.push(e.message));
await s.addInitScript(() => localStorage.setItem("sdcad-doc-0.2", JSON.stringify({ objekt: "Test", nr: "X", zaehler: 5, features: [{ id: "sk", typ: "skizze", name: "Grundriss", ebene: "XZ", elemente: [{ id: 1, art: "rechteck", a: [0, 0], b: [12000, 7000] }] }] })));
await s.goto("http://localhost:8797/index.html?test"); await s.waitForTimeout(900);
await s.evaluate(() => document.getElementById("wDachAuto").click()); await s.waitForSelector("#d_neigung", { timeout: 4000 });
await s.selectOption("#d_gform", "skizze"); await s.selectOption("#d_gskizze", "sk"); await s.waitForTimeout(600);
const info = () => s.textContent("#dInfo");
ok(/Dachfläche [\d.]+ m²/.test(await info()), "Grundriss aus Skizze: " + (await info()));
await s.selectOption("#d_form", "sattel"); await s.fill("#d_giebel", "2,4"); await s.dispatchEvent("#d_giebel", "input"); await s.waitForTimeout(600);
ok(/First 12\.\d m/.test(await info()), "Giebelkanten 2,4: Satteldach mit First – " + (await info()));
await s.click("#dOk"); await s.waitForTimeout(400);
// Dachbleche
await s.evaluate(() => document.getElementById("wDachBleche").click()); await s.waitForSelector("#d_a_traufe", { timeout: 4000 }); await s.waitForTimeout(500);
ok(/Traufblech/.test(await info()) && /Firstblech/.test(await info()) && /Ortgangblech/.test(await info()), "Dachbleche: " + (await info()));
await s.click("#dOk"); await s.waitForTimeout(400);
await s.evaluate(() => document.getElementById("zoomAlles").click()); await s.waitForTimeout(500); await s.screenshot({ path: "/tmp/t/dachbleche.png" });
const id = await s.evaluate(() => window.sdcadTest.dok().features.find((f) => f.typ === "dachbleche")?.id);
ok(!!id, "Feature Dachbleche angelegt");
await s.evaluate((i) => window.sdcadTest.waehle(i), id); await s.waitForTimeout(300);
ok(/Blechsorten/.test(await s.textContent("#werkstatt")), "Werkstatt: Liste der Bleche");
await s.evaluate((i) => window.sdcadTest.waehle(i + ":0"), id); await s.waitForTimeout(300);
const w = await s.textContent("#werkstatt"); ok(/Traufblech/.test(w) && /Biegungen/.test(w), "Einzelnes Blech: Abwicklung mit Biegungen");
ok(pr.length === 0, "keine Seitenfehler " + pr.join(" | "));
await b.close(); srv.close();
console.log(fehler ? `${fehler} Fehler` : "Dachbleche (App): alle Prüfungen bestanden"); process.exit(fehler ? 1 : 0);
