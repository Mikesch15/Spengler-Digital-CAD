// Vorschau im Chromium (Playwright) öffnen, Messwerte und Bildschirmfoto speichern
import { createServer } from "node:http";
import { readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
const { chromium } = createRequire(import.meta.url)("playwright");
const d = new URL("./dist/", import.meta.url), typ = { ".html": "text/html", ".js": "text/javascript", ".wasm": "application/wasm" };
const srv = createServer((q, a) => { try { const p = q.url === "/" ? "index.html" : q.url.slice(1); a.writeHead(200, { "content-type": typ[p.slice(p.lastIndexOf("."))] ?? "application/octet-stream" }); a.end(readFileSync(new URL(p, d))); } catch { a.writeHead(404); a.end(); } }).listen(8765);
const b = await chromium.launch(), s = await b.newPage({ viewport: { width: 1000, height: 820 } });
const fehler = []; s.on("pageerror", (e) => fehler.push(e.message)); s.on("console", (m) => m.type() === "error" && fehler.push(m.text()));
const t = Date.now(); await s.goto("http://localhost:8765/"); await s.waitForFunction(() => window.__ergebnis, null, { timeout: 120000 });
const erg = await s.evaluate(() => window.__ergebnis);
await s.screenshot({ path: new URL("../ergebnisse/vorschau.png", import.meta.url).pathname });
writeFileSync(new URL("../ergebnisse/vorschau.json", import.meta.url), JSON.stringify({ seite_bis_fertig_ms: Date.now() - t, erg, fehler }, null, 1));
console.log(JSON.stringify({ seite_bis_fertig_ms: Date.now() - t, erg, fehler }, null, 1));
await b.close(); srv.close();
