// Prüfseite im Browser ausführen: node tests/cad-worker/pruefen.mjs <dist> [chromium|msedge]  → ergebnis.json im dist-Ordner
import { createServer } from "node:http";
import { readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { resolve, extname, join } from "node:path";
const dist = resolve(process.argv[2] || "tests/cad-worker/dist"), kanal = process.argv[3] || "chromium";
const { chromium } = createRequire(import.meta.url)("playwright");
const typ = { ".html": "text/html", ".js": "text/javascript", ".wasm": "application/wasm", ".txt": "text/plain" };
const srv = createServer((q, a) => { let p, inhalt; try { p = q.url === "/" ? "index.html" : decodeURIComponent(q.url.slice(1).split("?")[0]); inhalt = readFileSync(join(dist, p)); } catch { a.writeHead(404); a.end(); return; } a.writeHead(200, { "content-type": typ[extname(p)] ?? "application/octet-stream" }); a.end(inhalt); }).listen(8766);
const b = await chromium.launch(kanal === "chromium" ? {} : { channel: kanal }), s = await b.newPage();
const konsole = []; s.on("console", (m) => konsole.push(`${m.type()}: ${m.text()}`)); s.on("pageerror", (e) => konsole.push("pageerror: " + e.message));
const t = Date.now(); await s.goto("http://localhost:8766/"); await s.waitForFunction(() => window.__ergebnis, null, { timeout: 300000 });
const erg = { kanal, browser: b.version(), gesamtMs: Date.now() - t, ...(await s.evaluate(() => window.__ergebnis)), konsole: konsole.filter((k) => !k.startsWith("log:")).slice(0, 20) };
writeFileSync(join(dist, `ergebnis-${kanal}.json`), JSON.stringify(erg, null, 1));
for (const z of erg.zeilen) console.log(`${z.ok ? "✓" : "✗"} ${z.text}${z.wert !== undefined ? "  " + JSON.stringify(z.wert) : ""}`);
console.log(`${kanal} ${erg.browser}: ${erg.fehler} Fehler, ${erg.gesamtMs} ms`);
await b.close(); srv.close(); process.exit(erg.fehler ? 1 : 0);
