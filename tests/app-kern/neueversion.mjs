// App-Test Hinweis «Neue Version verfügbar»
// node tests/app-kern/neueversion.mjs (nach node build.mjs; Playwright/Chromium)
import { createServer } from "node:http"; import { readFileSync } from "node:fs"; import { createRequire } from "node:module"; import { extname, join, resolve } from "node:path";
const dist = resolve("dist"), { chromium } = createRequire(import.meta.url)("playwright");
const typ = { ".html": "text/html", ".js": "text/javascript", ".wasm": "application/wasm", ".json": "application/json" };
const srv = createServer((q, a) => { let p, d; try { p = q.url === "/" ? "index.html" : decodeURIComponent(q.url.slice(1).split("?")[0]); d = readFileSync(join(dist, p)); } catch { a.writeHead(404); a.end(); return; } a.writeHead(200, { "content-type": typ[extname(p)] ?? "application/octet-stream" }); a.end(d); }).listen(8797);
let fehler = 0; const ok = (c, t) => { console.log(`${c ? "✓" : "✗"} ${t}`); if (!c) fehler++; };
const b = await chromium.launch(), ctx = await b.newContext({ viewport: { width: 1100, height: 800 }, serviceWorkers: "block" }), s = await ctx.newPage(), pr = []; s.on("pageerror", (e) => pr.push(e.message));
let angebot = "99.9.9"; await s.route("**/version.json*", (r) => r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ version: angebot }) }));
await s.goto("http://localhost:8797/index.html?test"); await s.waitForTimeout(1200);
await s.evaluate(() => window.sdcadTest.pruefeNeueVersion()); await s.waitForTimeout(400);
ok(await s.evaluate(() => /Neue Version 99\.9\.9/.test(document.querySelector("#meldungen .meldung-toast")?.textContent || "")), "Neuere Version auf dem Server → Meldung mit Versionsnummer");
ok(await s.evaluate(() => !!document.querySelector("#meldungen .meldung-toast .aktion")), "Meldung hat den Knopf «Jetzt neu laden»");
await s.evaluate(() => window.sdcadTest.pruefeNeueVersion()); await s.waitForTimeout(300);
ok(await s.evaluate(() => document.querySelectorAll("#meldungen .meldung-toast").length === 1), "dieselbe Version wird nicht mehrfach gemeldet");
const echteVersion = await s.evaluate(() => document.getElementById("hVersion")?.textContent.match(/[0-9][0-9.]*/)?.[0] || ""); angebot = echteVersion; // nach dem Neuladen bietet der Server dieselbe Version an
const geladen = s.waitForNavigation({ timeout: 5000 }).then(() => true).catch(() => false);
await s.click("#meldungen .aktion"); ok(await geladen, "Knopf lädt die Seite neu");
await s.waitForTimeout(1200);
await s.evaluate(() => window.sdcadTest.pruefeNeueVersion()); await s.waitForTimeout(400);
ok(await s.evaluate(() => !document.querySelector("#meldungen .meldung-toast")), "gleiche Version → keine Meldung (" + angebot + ")");
ok(pr.length === 0, "keine Seitenfehler " + pr.join(" | "));
await b.close(); srv.close();
console.log(fehler ? `${fehler} Fehler` : "Neue Version (App): alle Prüfungen bestanden"); process.exit(fehler ? 1 : 0);
