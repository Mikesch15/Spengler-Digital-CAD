// App-Test Blechprofil: nachträglich Flansch/Umschlag an Kante A und B ansetzen (Kanten-Werkzeug)
// node tests/app-kern/skizzenansicht.mjs (nach node build.mjs; Playwright/Chromium)
import { createServer } from "node:http"; import { readFileSync } from "node:fs"; import { createRequire } from "node:module"; import { extname, join, resolve } from "node:path";
const dist = resolve("dist"), { chromium } = createRequire(import.meta.url)("playwright");
const typ = { ".html": "text/html", ".js": "text/javascript", ".wasm": "application/wasm", ".json": "application/json" };
const srv = createServer((q, a) => { let p, d; try { p = q.url === "/" ? "index.html" : decodeURIComponent(q.url.slice(1).split("?")[0]); d = readFileSync(join(dist, p)); } catch { a.writeHead(404); a.end(); return; } a.writeHead(200, { "content-type": typ[extname(p)] ?? "application/octet-stream" }); a.end(d); }).listen(+process.env.PORT || 8797);
let fehler = 0; const ok = (c, t) => { console.log(`${c ? "✓" : "✗"} ${t}`); if (!c) fehler++; };
const b = await chromium.launch(), s = await b.newPage({ viewport: { width: 1280, height: 800 } }), pr = []; s.on("pageerror", (e) => pr.push(e.message));
{ const f0 = s.fill.bind(s); s.fill = async (sel, v, o) => (o?.force ? s.evaluate(([q, w]) => { const e = document.querySelector(q); e.value = w; e.dispatchEvent(new Event("input", { bubbles: true })); }, [sel, v]) : f0(sel, v, o)); }

await s.addInitScript(() => localStorage.setItem("sdcad-doc-0.2", JSON.stringify({ objekt: "T", nr: "1", zaehler: 9, features: [{ id: "s1", typ: "skizze", name: "Skizze 1", ebene: "XY", elemente: [{ id: 1, art: "rechteck", a: [0, 0], b: [100, 60] }], bedingungen: [] }] })));
await s.goto("http://localhost:" + (process.env.PORT || 8797) + "/index.html?test"); await s.waitForTimeout(1200);
await s.evaluate(() => window.sdcadTest.bearbeite("s1")); await s.waitForTimeout(2000);
ok(await s.evaluate(() => document.elementFromPoint(900, 300)?.id === "leinwand"), "Testpunkt liegt auf der Leinwand");
const q0 = await s.evaluate(() => window.sdcadTest.kameraQ());
const gleich = (a, b) => a.every((v, i) => Math.abs(v - b[i]) < 1e-6);
await s.mouse.move(900, 300); await s.mouse.down({ button: "middle" }); await s.mouse.move(1000, 360, { steps: 6 }); await s.mouse.up({ button: "middle" }); await s.waitForTimeout(200);
ok(gleich(q0, await s.evaluate(() => window.sdcadTest.kameraQ())), "Verschieben (Mausrad gedrückt) lässt die Ansicht unverändert");
await s.keyboard.down("Shift"); await s.mouse.move(900, 300); await s.mouse.down({ button: "middle" }); await s.mouse.move(1000, 400, { steps: 6 }); await s.mouse.up({ button: "middle" }); await s.keyboard.up("Shift"); await s.waitForTimeout(200);
const blick = () => s.evaluate(() => window.sdcadTest.kameraBlick());
ok(Math.abs((await blick())[2]) > 0.999, "Blick senkrecht auf die XY-Fläche (z = " + (await blick())[2] + ")");
ok(!gleich(q0, await s.evaluate(() => window.sdcadTest.kameraQ())) && Math.abs((await blick())[2]) > 0.999, "Umschalt + Mausrad dreht in der Skizze nur in der Ebene (Blick bleibt, Ansicht 2D)");
await s.evaluate(() => window.sdcadTest.beendeSkizze()); await s.waitForTimeout(400);
await s.keyboard.down("Shift"); await s.mouse.move(900, 300); await s.mouse.down({ button: "middle" }); await s.mouse.move(1000, 400, { steps: 6 }); await s.mouse.up({ button: "middle" }); await s.keyboard.up("Shift"); await s.waitForTimeout(200);
ok(!gleich(q0, await s.evaluate(() => window.sdcadTest.kameraQ())), "Nach der Skizze dreht Umschalt + Mausrad wieder");
ok(pr.length === 0, "keine Seitenfehler " + pr.join(" | "));
await b.close(); srv.close();
console.log(fehler ? `${fehler} Fehler` : "Skizzenansicht (App): alle Prüfungen bestanden"); process.exit(fehler ? 1 : 0);
