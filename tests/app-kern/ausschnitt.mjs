// App-Test: Ausschneiden trifft Blechkörper; Ausschnitt erscheint nicht als Körper im Browser; runde Körper glatt (Normalen)
// node tests/app-kern/ausschnitt.mjs (nach node build.mjs; Playwright/Chromium)
import { createServer } from "node:http"; import { readFileSync } from "node:fs"; import { createRequire } from "node:module"; import { extname, join, resolve } from "node:path";
const dist = resolve("dist"), { chromium } = createRequire(import.meta.url)("playwright");
const typ = { ".html": "text/html", ".js": "text/javascript", ".wasm": "application/wasm", ".json": "application/json" };
const srv = createServer((q, a) => { let p, d; try { p = q.url === "/" ? "index.html" : decodeURIComponent(q.url.slice(1).split("?")[0]); d = readFileSync(join(dist, p)); } catch { a.writeHead(404); a.end(); return; } a.writeHead(200, { "content-type": typ[extname(p)] ?? "application/octet-stream" }); a.end(d); }).listen(+process.env.PORT || 8789);
let fehler = 0; const ok = (c, t) => { console.log(`${c ? "✓" : "✗"} ${t}`); if (!c) fehler++; };
const b = await chromium.launch(), s = await b.newPage({ viewport: { width: 1280, height: 800 } }), pr = []; s.on("pageerror", (e) => pr.push(e.message));
const pj = { objekt: "A", nr: "A-1", zaehler: 10, features: [
  { id: "sk", typ: "skizze", name: "Blech", ebene: "XY", elemente: [{ id: 1, art: "rechteck", a: [0, 0], b: [200, 100] }] },
  { id: "fl", typ: "flaeche", name: "Blech 1", skizze: "sk", material: "zink07", flaechen: [[10, 10]], kanten: {} },
  { id: "sk2", typ: "skizze", name: "Loch", ebene: "XY", elemente: [{ id: 1, art: "kreis", c: [100, 50], r: 20 }] },
  { id: "ex", typ: "extrusion", name: "Ausschnitt 1", skizze: "sk2", flaechen: [[100, 50]], abstand: 10, richtung: "symmetrisch", vorgang: "ausschneiden", ziel: "alle" }] };
await s.addInitScript((d) => { localStorage.setItem("sdcad-doc-0.2", JSON.stringify(d)); localStorage.setItem("sdcad-einstellungen", JSON.stringify({ materialien: [{ id: "zink07", name: "Z", t: 0.7, ri: 1, k: 0.4, dichte: 7.2 }] })); }, pj);
await s.goto("http://localhost:" + (process.env.PORT || 8789) + "/index.html?test"); await s.waitForTimeout(1200);
const v = await s.evaluate(() => window.sdcadTest.koerperInfo().filter((k) => k.fid.startsWith("fl")).reduce((a, k) => a + k.volumen, 0));
const soll = 200 * 100 * 0.7 - Math.PI * 400 * 0.7;
ok(Math.abs(v - soll) < 0.02 * soll, `Blech mit Loch: Volumen ${Math.round(v)} mm³ (erwartet ≈ ${Math.round(soll)})`);
const browser = await s.evaluate(() => document.getElementById("baum").textContent);
ok(browser.includes("Blech 1") && !browser.includes("Ausschnitt 1"), "Ausschnitt erscheint nicht als Körper im Browser");
ok(await s.evaluate(() => document.getElementById("zeitleiste")?.textContent.includes("Ausschnitt 1") ?? document.body.textContent.includes("Ausschnitt 1")), "Ausschnitt steht weiter in der Zeitleiste");
const fehl = await s.evaluate(() => document.getElementById("status")?.textContent || ""); ok(!/nicht ausschneiden|Kein Körper/.test(fehl), "keine Fehlermeldung beim Ausschneiden");
ok(pr.length === 0, "keine Seitenfehler " + pr.join(" | "));
await b.close(); srv.close();
console.log(fehler ? `${fehler} Fehler` : "Ausschnitt an Blech: alle Prüfungen bestanden"); process.exit(fehler ? 1 : 0);
