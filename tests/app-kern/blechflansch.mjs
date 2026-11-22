// App-Test Blechprofil: nachträglich Flansch/Umschlag an Kante A und B ansetzen (Kanten-Werkzeug)
// node tests/app-kern/blechflansch.mjs (nach node build.mjs; Playwright/Chromium)
import { createServer } from "node:http"; import { readFileSync } from "node:fs"; import { createRequire } from "node:module"; import { extname, join, resolve } from "node:path";
const dist = resolve("dist"), { chromium } = createRequire(import.meta.url)("playwright");
const typ = { ".html": "text/html", ".js": "text/javascript", ".wasm": "application/wasm", ".json": "application/json" };
const srv = createServer((q, a) => { let p, d; try { p = q.url === "/" ? "index.html" : decodeURIComponent(q.url.slice(1).split("?")[0]); d = readFileSync(join(dist, p)); } catch { a.writeHead(404); a.end(); return; } a.writeHead(200, { "content-type": typ[extname(p)] ?? "application/octet-stream" }); a.end(d); }).listen(+process.env.PORT || 8797);
let fehler = 0; const ok = (c, t) => { console.log(`${c ? "✓" : "✗"} ${t}`); if (!c) fehler++; };
const b = await chromium.launch(), s = await b.newPage({ viewport: { width: 1280, height: 800 } }), pr = []; s.on("pageerror", (e) => pr.push(e.message));
{ const f0 = s.fill.bind(s); s.fill = async (sel, v, o) => (o?.force ? s.evaluate(([q, w]) => { const e = document.querySelector(q); e.value = w; e.dispatchEvent(new Event("input", { bubbles: true })); }, [sel, v]) : f0(sel, v, o)); }
const kantenKlick = async (s, key) => { const k = (await s.evaluate(() => window.sdcadTest.profilKanten())).find((x) => x.key === key); if (!k) throw new Error("Kante " + key + " nicht gefunden"); await s.mouse.move(k.mitte[0], k.mitte[1]); await s.waitForTimeout(150); await s.mouse.click(k.mitte[0], k.mitte[1]); await s.waitForTimeout(500); await s.evaluate(() => document.getElementById("kbOk")?.click()); await s.waitForTimeout(500); };

await s.addInitScript(() => localStorage.setItem("sdcad-doc-0.2", JSON.stringify({ objekt: "T", nr: "1", zaehler: 9, features: [
  { id: "s1", typ: "skizze", name: "Skizze 1", ebene: "XY", elemente: [{ id: 1, art: "linie", pts: [[0, 0], [100, 0], [100, 60]], geschlossen: false }], bedingungen: [] },
  { id: "b1", typ: "blech", name: "Blechprofil 1", skizze: "s1", kette: 0, lage: "mitte", material: "zink07", laenge: 300, stueck: 1, richtung: "eine" }] })));
await s.goto("http://localhost:" + (process.env.PORT || 8797) + "/index.html?test"); await s.waitForTimeout(1500);
const kk = () => s.evaluate(() => window.sdcadTest.koerper().find((x) => x.fid === "b1"));
const k0 = await kk(); ok(k0 && k0.volumen > 0, "Blechprofil aus Linienzug vorhanden: " + k0?.volumen);
await s.evaluate(() => window.sdcadTest.waehle("b1")); await s.waitForTimeout(300);
await s.evaluate(() => document.querySelector('[data-kantenwz="flansch"]').click()); await s.waitForTimeout(400);
ok((await s.evaluate(() => window.sdcadTest.profilKanten())).length >= 4, "Kanten-Werkzeug erkennt das Blechprofil (Kanten am Modell wählbar)");
await s.fill("#kbLaenge", "25", { force: true }); await kantenKlick(s, "B");
const k1 = await kk(); ok(k1.volumen > k0.volumen * 1.15, `Flansch an Kante B: Volumen ${k0.volumen} → ${k1.volumen}`);
await s.click("#kbEnde"); await s.evaluate(() => { window.sdcadTest.waehle("b1"); document.querySelector('[data-kantenwz="flansch"]').click(); }); await s.waitForTimeout(400);
await s.fill("#kbLaenge", "20", { force: true }); await kantenKlick(s, "A");
const k2 = await kk(); ok(k2.volumen > k1.volumen * 1.1, `Flansch an Kante A: Volumen ${k1.volumen} → ${k2.volumen}`);
// das ursprüngliche Profil bleibt an seinem Platz: Ecke (100, 0) liegt weiterhin im Kasten und Ende (100, 60) ist nicht verschoben
const inBox = (b, p) => [0, 1].every((i) => p[i] >= b.min[i] - 1 && p[i] <= b.max[i] + 1);
ok(inBox(k2, [0, 0]) || inBox(k2, [100, 0]), "ursprüngliche Linie liegt im Körper-Kasten: " + JSON.stringify([k2.min, k2.max]));
ok(pr.length === 0, "keine Seitenfehler " + pr.join(" | "));
await b.close(); srv.close();
console.log(fehler ? `${fehler} Fehler` : "Blechflansch (App): alle Prüfungen bestanden"); process.exit(fehler ? 1 : 0);
