// App-Test Blechprofil: nachträglich Flansch/Umschlag an Kante A und B ansetzen (Kanten-Werkzeug)
// node tests/app-kern/stirnflansch.mjs (nach node build.mjs; Playwright/Chromium)
import { createServer } from "node:http"; import { readFileSync } from "node:fs"; import { createRequire } from "node:module"; import { extname, join, resolve } from "node:path";
const dist = resolve("dist"), { chromium } = createRequire(import.meta.url)("playwright");
const typ = { ".html": "text/html", ".js": "text/javascript", ".wasm": "application/wasm", ".json": "application/json" };
const srv = createServer((q, a) => { let p, d; try { p = q.url === "/" ? "index.html" : decodeURIComponent(q.url.slice(1).split("?")[0]); d = readFileSync(join(dist, p)); } catch { a.writeHead(404); a.end(); return; } a.writeHead(200, { "content-type": typ[extname(p)] ?? "application/octet-stream" }); a.end(d); }).listen(+process.env.PORT || 8797);
let fehler = 0; const ok = (c, t) => { console.log(`${c ? "✓" : "✗"} ${t}`); if (!c) fehler++; };
const b = await chromium.launch(), s = await b.newPage({ viewport: { width: 1280, height: 800 } }), pr = []; s.on("pageerror", (e) => pr.push(e.message));
{ const f0 = s.fill.bind(s); s.fill = async (sel, v, o) => (o?.force ? s.evaluate(([q, w]) => { const e = document.querySelector(q); e.value = w; e.dispatchEvent(new Event("input", { bubbles: true })); }, [sel, v]) : f0(sel, v, o)); }

await s.addInitScript(() => localStorage.setItem("sdcad-doc-0.2", JSON.stringify({ objekt: "T", nr: "1", zaehler: 9, features: [
  { id: "s1", typ: "skizze", name: "Skizze 1", ebene: "XY", elemente: [{ id: 1, art: "linie", pts: [[0, 0], [100, 0], [100, 60]], geschlossen: false }], bedingungen: [] },
  { id: "b1", typ: "blech", name: "Blechprofil 1", skizze: "s1", kette: 0, lage: "mitte", material: "zink07", laenge: 300, stueck: 1, richtung: "eine" }] })));
await s.goto("http://localhost:" + (process.env.PORT || 8797) + "/index.html?test"); await s.waitForTimeout(1500);
const vol = () => s.evaluate(() => window.sdcadTest.koerper().filter((x) => x.fid === "b1").reduce((a, x) => a + Math.abs(x.volumen), 0));
const stirnAnz = () => s.evaluate(() => window.sdcadTest.dok().features.filter((f) => f.typ === "profilkante").map((f) => f.ende + ":" + (f.schenkel ?? "")).join(","));
const v0 = await vol(); ok(v0 > 0, "Blechprofil vorhanden (Volumen " + Math.round(v0) + ")");
await s.evaluate(() => window.sdcadTest.waehle("b1")); await s.waitForTimeout(300);
await s.evaluate(() => document.querySelector('[data-kantenwz="flansch"]').click()); await s.waitForTimeout(400);
ok(await s.evaluate(() => !document.getElementById("kbS1").hidden && !document.getElementById("kbS2").hidden && !!document.getElementById("kbSchenkel")), "Kantenleiste bietet Stirn 1 / Stirn 2 und Schenkelwahl");
await s.fill("#kbLaenge", "25", { force: true }); await s.click("#kbS1"); await s.waitForTimeout(800);
const v1 = await vol(); ok(v1 - v0 > 2000 && v1 - v0 < 3600, `Flansch an Stirn 1 (beide Schenkel): Volumen ${Math.round(v0)} → ${Math.round(v1)}`);
ok(await s.evaluate(() => !/⚠/.test(document.getElementById("status").textContent)), "keine Warnung beim Ansetzen");
// nur Schenkel 2 am Ende
await s.fill("#kbSchenkel", "2", { force: true }); await s.click("#kbS2"); await s.waitForTimeout(800);
const v2 = await vol(); ok(v2 - v1 > 700 && v2 - v1 < 1400, `Flansch an Stirn 2, nur Schenkel 2: Volumen ${Math.round(v1)} → ${Math.round(v2)}`);
ok(await stirnAnz() === "S1:0,S2:2", "Zwei Schritte «Profilkante» (S1 alle, S2 Schenkel 2): " + await stirnAnz());
// Umschlag an Stirn 1 (Schenkel 1)
await s.click("#kbEnde"); await s.evaluate(() => { window.sdcadTest.waehle("b1"); document.querySelector('[data-kantenwz="umschlag"]').click(); }); await s.waitForTimeout(400);
await s.fill("#kbLaenge", "8", { force: true }); await s.fill("#kbSchenkel", "1", { force: true }); await s.click("#kbS2"); await s.waitForTimeout(800);
const v3 = await vol(); ok(v3 > v2, `Umschlag an Stirn 2, Schenkel 1: Volumen ${Math.round(v2)} → ${Math.round(v3)}`);
// Schritt bearbeiten ändert die Lasche, Löschen nimmt sie wieder weg
await s.click("#kbEnde"); await s.evaluate(() => { const l = window.sdcadTest.dok().features.filter((f) => f.typ === "profilkante"); window.sdcadTest.bearbeite(l[0].id); }); await s.waitForSelector("#d_laenge", { state: "attached", timeout: 4000 });
await s.fill("#d_laenge", "50", { force: true }); await s.waitForTimeout(600); await s.click("#dOk"); await s.waitForTimeout(500);
const v4 = await vol(); ok(v4 - v3 > 2500, `Stirn-Flansch auf 50 mm verlängert: Volumen ${Math.round(v3)} → ${Math.round(v4)}`);
await s.evaluate(() => { const l = window.sdcadTest.dok().features.filter((f) => f.typ === "profilkante"); window.sdcadTest.bearbeite(l[0].id); }); await s.waitForSelector("#dLoeschen:not([hidden])", { timeout: 4000 }); await s.click("#dLoeschen"); await s.waitForTimeout(600);
ok(Math.abs((await vol()) - v3 + 0) > 100 && (await vol()) < v4, "Schritt löschen entfernt die Stirnlaschen wieder");
ok(pr.length === 0, "keine Seitenfehler " + pr.join(" | "));
await b.close(); srv.close();
console.log(fehler ? `${fehler} Fehler` : "Stirnflansch (App): alle Prüfungen bestanden"); process.exit(fehler ? 1 : 0);
