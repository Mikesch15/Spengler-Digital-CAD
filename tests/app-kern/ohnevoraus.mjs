// App-Test: Werkzeuge ohne Voraussetzung (keine Skizze/kein Blech) melden nichts mehr, sondern starten deren Erstellung
import { createServer } from "node:http"; import { readFileSync } from "node:fs"; import { createRequire } from "node:module"; import { extname, join, resolve } from "node:path";
const dist = resolve("dist"), { chromium } = createRequire(import.meta.url)("playwright");
const typ = { ".html": "text/html", ".js": "text/javascript", ".wasm": "application/wasm", ".json": "application/json" };
const srv = createServer((q, a) => { let p, d; try { p = q.url === "/" ? "index.html" : decodeURIComponent(q.url.slice(1).split("?")[0]); d = readFileSync(join(dist, p)); } catch { a.writeHead(404); a.end(); return; } a.writeHead(200, { "content-type": typ[extname(p)] ?? "application/octet-stream" }); a.end(d); }).listen(+process.env.PORT || 8797);
let fehler = 0; const ok = (c, t) => { console.log(`${c ? "✓" : "✗"} ${t}`); if (!c) fehler++; };

const b = await chromium.launch(), s = await b.newPage({ viewport: { width: 1280, height: 800 } }), pr = []; s.on("pageerror", (e) => pr.push(e.message));
await s.addInitScript(() => { localStorage.setItem("sdcad-doc-0.2", JSON.stringify({ objekt: "T", nr: "1", zaehler: 1, features: [] })); });
await s.goto("http://localhost:" + (process.env.PORT || 8797) + "/index.html?test"); await s.waitForTimeout(1500);
for (const id of ["wExtrusion", "wSweep", "wDrehung"]) {
  await s.evaluate((i) => document.getElementById(i).click(), id); await s.waitForTimeout(500);
  const z = await s.evaluate(() => ({ st: document.getElementById("status")?.textContent || "", dlg: !!document.querySelector(".dialog:not([hidden])"), skizze: !document.getElementById("gSkizze").hidden, ebene: !!document.querySelector("#kantenMenue:not([hidden]), .ebenenwahl, #ebenenMenue:not([hidden])") }));
  ok(z.dlg || z.skizze, `${id}: ohne Skizze startet die Skizze statt nur einer Meldung`);
  await s.keyboard.press("Escape"); await s.evaluate(() => window.sdcadTest.beendeSkizze()); await s.waitForTimeout(200);
}
ok(!pr.length, "keine Seitenfehler " + pr.join("|"));
await b.close(); srv.close(); process.exit(fehler ? 1 : 0);
