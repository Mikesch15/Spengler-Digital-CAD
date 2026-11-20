// App-Test: Baustein an runder Kante = eine durchgehende glatte Fläche (keine Einzelteile), Volumen positiv
// node tests/app-kern/rundkante.mjs (nach node build.mjs; Playwright/Chromium)
import { createServer } from "node:http"; import { readFileSync } from "node:fs"; import { createRequire } from "node:module"; import { extname, join, resolve } from "node:path";
const dist = resolve("dist"), { chromium } = createRequire(import.meta.url)("playwright");
const typ = { ".html": "text/html", ".js": "text/javascript", ".wasm": "application/wasm", ".json": "application/json" };
const srv = createServer((q, a) => { let p, d; try { p = q.url === "/" ? "index.html" : decodeURIComponent(q.url.slice(1).split("?")[0]); d = readFileSync(join(dist, p)); } catch { a.writeHead(404); a.end(); return; } a.writeHead(200, { "content-type": typ[extname(p)] ?? "application/octet-stream" }); a.end(d); }).listen(8783);
let fehler = 0; const ok = (c, t) => { console.log(`${c ? "✓" : "✗"} ${t}`); if (!c) fehler++; };
const b = await chromium.launch(), s = await b.newPage({ viewport: { width: 1280, height: 800 } }), pr = []; s.on("pageerror", (e) => pr.push(e.message));
const pj = { objekt: "R", nr: "R-1", zaehler: 10, features: [
  { id: "sk", typ: "skizze", name: "S", ebene: "XY", elemente: [{ id: 1, art: "kreis", c: [0, 0], r: 150 }] },
  { id: "fl", typ: "flaeche", name: "F", skizze: "sk", material: "zink07", flaechen: [[0, 0]], kanten: {} }] };
await s.addInitScript((d) => { localStorage.setItem("sdcad-doc-0.2", JSON.stringify(d)); localStorage.setItem("sdcad-einstellungen", JSON.stringify({ materialien: [{ id: "zink07", name: "Z", t: 0.7, ri: 1, k: 0.4, dichte: 7.2 }] })); }, pj);
await s.goto("http://localhost:8783/index.html?test"); await s.waitForTimeout(900);
const info = () => s.evaluate(() => window.sdcadTest.koerperInfo().filter((k) => k.fid.startsWith("fl")));
const v0 = (await info()).reduce((a, k) => a + k.volumen, 0);
await s.evaluate(() => window.sdcadTest.bearbeite("fl")); await s.waitForSelector('[data-b="0:0"]', { timeout: 5000 });
await s.selectOption('[data-b="0:0"]', "*f"); await s.waitForTimeout(600);
const teile = await info(), v1 = teile.reduce((a, k) => a + k.volumen, 0);
ok(v1 > v0 && teile.every((k) => k.volumen > 0), `Flansch an runder Kante: Volumen ${Math.round(v0)} → ${Math.round(v1)} mm³, alle Teile positiv`);
ok(teile.length === 2, `Platte + ein durchgehender Flansch statt vieler Einzelteile (${teile.length} Teile)`);
ok(pr.length === 0, "keine Seitenfehler " + pr.join(" | "));
await b.close(); srv.close();
console.log(fehler ? `${fehler} Fehler` : "Runde Kante: alle Prüfungen bestanden"); process.exit(fehler ? 1 : 0);
