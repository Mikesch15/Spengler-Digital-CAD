// App-Test Browser: durchscheinend über der Ansicht, Auge vor dem Namen blendet ein/aus, Kopfzeile klappt zu
// node tests/app-kern/browser.mjs (nach node build.mjs; Playwright/Chromium)
import { createServer } from "node:http";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { extname, join, resolve } from "node:path";
const dist = resolve("dist"), { chromium } = createRequire(import.meta.url)("playwright");
const typ = { ".html": "text/html", ".js": "text/javascript", ".wasm": "application/wasm", ".json": "application/json" };
const srv = createServer((q, a) => { let p, d; try { p = q.url === "/" ? "index.html" : decodeURIComponent(q.url.slice(1).split("?")[0]); d = readFileSync(join(dist, p)); } catch { a.writeHead(404); a.end(); return; } a.writeHead(200, { "content-type": typ[extname(p)] ?? "application/octet-stream" }); a.end(d); }).listen(8773);
let fehler = 0; const ok = (b, t) => { console.log(`${b ? "✓" : "✗"} ${t}`); if (!b) fehler++; };
const b = await chromium.launch(), s = await b.newPage({ viewport: { width: 1280, height: 760 } }), probleme = []; s.on("pageerror", (e) => probleme.push(e.message));
await s.goto("http://localhost:8773/index.html?test"); await s.waitForTimeout(1200);
const r = await s.evaluate(() => { const br = document.querySelector(".browser").getBoundingClientRect(), an = document.querySelector("#ansicht").getBoundingClientRect(), st = getComputedStyle(document.querySelector(".browser"));
  return { links: br.left >= an.left && br.right <= an.right, pos: st.position, bg: st.backgroundColor, blur: st.backdropFilter || st.webkitBackdropFilter }; });
ok(r.pos === "absolute" && r.links && /blur/.test(r.blur) && /rgba|color\(/.test(r.bg), `Browser liegt durchscheinend über der Ansicht (${r.pos}, ${r.blur}, ${r.bg})`);
const reihe = await s.evaluate(() => { const li = document.querySelector("#baum li[data-id]"); return [...li.children].map((c) => c.className.split(" ")[0]); });
ok(reihe[0] === "auge" && reihe[1] === "typ" && reihe[2] === "nm", `Reihenfolge in der Zeile: ${reihe.join(" → ")} (Auge vor dem Namen)`);
const id = await s.evaluate(() => document.querySelector("#baum li[data-id]").dataset.id);
await s.click(`#baum [data-auge="${id}"]`); await s.waitForTimeout(400);
ok(await s.evaluate((i) => JSON.parse(localStorage.getItem("sdcad-doc-0.2")).features.find((f) => f.id === i).versteckt === true, id) && await s.evaluate(() => document.querySelector("#baum li.verborgen .auge.zu") !== null), "Auge angeklickt: Körper ausgeblendet, Auge durchgestrichen");
await s.click(`#baum [data-auge="${id}"]`); await s.waitForTimeout(400);
ok(await s.evaluate((i) => !JSON.parse(localStorage.getItem("sdcad-doc-0.2")).features.find((f) => f.id === i).versteckt, id) && await s.evaluate(() => document.querySelector("#baum li.verborgen") === null), "Nochmals: wieder eingeblendet");
await s.click(".browser .ptitel"); ok(await s.evaluate(() => getComputedStyle(document.querySelector("#baum")).display === "none"), "Kopfzeile klappt den Browser zu");
await s.click(".browser .ptitel"); ok(await s.evaluate(() => getComputedStyle(document.querySelector("#baum")).display !== "none"), "… und wieder auf");
const m = await b.newPage({ viewport: { width: 412, height: 860 } }); await m.goto("http://localhost:8773/index.html?test"); await m.waitForTimeout(1000);
ok(await m.evaluate(() => getComputedStyle(document.querySelector(".browser")).position !== "absolute"), "Schmale Anzeige (Handy): Browser bleibt unter der Ansicht");
ok(probleme.length === 0, "keine Seitenfehler " + probleme.join(" | "));
await b.close(); srv.close();
console.log(fehler ? `${fehler} Fehler` : "Browser: alle Prüfungen bestanden"); process.exit(fehler ? 1 : 0);
