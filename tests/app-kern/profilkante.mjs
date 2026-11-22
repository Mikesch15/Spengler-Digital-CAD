// App-Test Blechprofil: nachträglich Flansch/Umschlag an Kante A und B ansetzen (Kanten-Werkzeug)
// node tests/app-kern/profilkante.mjs (nach node build.mjs; Playwright/Chromium)
import { createServer } from "node:http"; import { readFileSync } from "node:fs"; import { createRequire } from "node:module"; import { extname, join, resolve } from "node:path";
const dist = resolve("dist"), { chromium } = createRequire(import.meta.url)("playwright");
const typ = { ".html": "text/html", ".js": "text/javascript", ".wasm": "application/wasm", ".json": "application/json" };
const srv = createServer((q, a) => { let p, d; try { p = q.url === "/" ? "index.html" : decodeURIComponent(q.url.slice(1).split("?")[0]); d = readFileSync(join(dist, p)); } catch { a.writeHead(404); a.end(); return; } a.writeHead(200, { "content-type": typ[extname(p)] ?? "application/octet-stream" }); a.end(d); }).listen(+process.env.PORT || 8797);
let fehler = 0; const ok = (c, t) => { console.log(`${c ? "✓" : "✗"} ${t}`); if (!c) fehler++; };
const b = await chromium.launch(), s = await b.newPage({ viewport: { width: 1280, height: 800 } }), pr = []; s.on("pageerror", (e) => pr.push(e.message));
{ const f0 = s.fill.bind(s); s.fill = async (sel, v, o) => (o?.force ? s.evaluate(([q, w]) => { const e = document.querySelector(q); e.value = w; e.dispatchEvent(new Event("input", { bubbles: true })); }, [sel, v]) : f0(sel, v, o)); }
await s.addInitScript(() => localStorage.setItem("sdcad-doc-0.2", JSON.stringify({ objekt: "T", nr: "1", zaehler: 9, features: [{ id: "p1", typ: "profil", name: "Profil 1", ebene: "XY", start: 0, laenge: 500, richtung: "eine", material: "zink07", stueck: 1, zeilen: [{ L: 100, winkel: 90, art: "abkanten" }, { L: 60, winkel: 0, art: "abkanten" }] }] })));
await s.goto("http://localhost:" + (process.env.PORT || 8797) + "/index.html?test"); await s.waitForTimeout(1200);
const zuschnitt = () => s.evaluate(() => parseFloat(document.querySelector("#werkstatt .zahl b")?.textContent.replace(",", ".")));
await s.evaluate(() => window.sdcadTest.waehle("p1")); await s.waitForTimeout(300); const z0 = await zuschnitt();
ok(z0 > 150 && z0 < 170, "Profil vorher: Zuschnitt " + z0);
await s.evaluate(() => document.querySelector('[data-kantenwz="flansch"]').click()); await s.waitForTimeout(400);
ok(await s.evaluate(() => !document.getElementById("kbEnden").hidden), "Kanten-Werkzeug: Profil erkannt, Kante A / Kante B wählbar");
await s.fill("#kbLaenge", "25"); await s.click("#kbB"); await s.waitForTimeout(600); const z1 = await zuschnitt();
ok(z1 - z0 > 20 && z1 - z0 < 30, `Flansch 25 mm an Kante B: Zuschnitt ${z0} → ${z1}`);
await s.click("#kbEnde"); await s.evaluate(() => { window.sdcadTest.waehle("p1"); document.querySelector('[data-kantenwz="flansch"]').click(); }); await s.waitForTimeout(400);
await s.fill("#kbLaenge", "15"); await s.click("#kbA"); await s.waitForTimeout(600); const z2 = await zuschnitt();
ok(z2 - z1 > 10 && z2 - z1 < 20, `Flansch 15 mm an Kante A: Zuschnitt ${z1} → ${z2}`);
const doc = await s.evaluate(() => window.sdcadTest.dok()); const pk = doc.features.filter((f) => f.typ === "profilkante");
ok(pk.length === 2 && pk.map((f) => f.ende).sort().join() === "A,B", "Zwei Schritte «Profilkante» in der Zeitleiste");
await s.click("#kbEnde"); await s.evaluate((i) => window.sdcadTest.bearbeite(i), pk[1].id); await s.waitForSelector("#d_laenge", { state: "attached", timeout: 4000 });
await s.fill("#d_laenge", "40", { force: true }); await s.dispatchEvent("#d_laenge", "input"); await s.waitForTimeout(500); await s.click("#dOk"); await s.waitForTimeout(400);
await s.evaluate(() => window.sdcadTest.waehle("p1")); await s.waitForTimeout(300); const z3 = await zuschnitt();
ok(z3 - z2 > 20 && z3 - z2 < 30, `Schritt bearbeitet (Länge 40): Zuschnitt ${z2} → ${z3}`);
ok(pr.length === 0, "keine Seitenfehler " + pr.join(" | "));
await b.close(); srv.close();
console.log(fehler ? `${fehler} Fehler` : "Profilkante (App): alle Prüfungen bestanden"); process.exit(fehler ? 1 : 0);
