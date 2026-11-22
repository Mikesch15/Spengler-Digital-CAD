// App-Test Blechprofil: nachträglich Flansch/Umschlag an Kante A und B ansetzen (Kanten-Werkzeug)
// node tests/app-kern/stirnflansch.mjs (nach node build.mjs; Playwright/Chromium)
import { createServer } from "node:http"; import { readFileSync } from "node:fs"; import { createRequire } from "node:module"; import { extname, join, resolve } from "node:path";
const dist = resolve("dist"), { chromium } = createRequire(import.meta.url)("playwright");
const typ = { ".html": "text/html", ".js": "text/javascript", ".wasm": "application/wasm", ".json": "application/json" };
const srv = createServer((q, a) => { let p, d; try { p = q.url === "/" ? "index.html" : decodeURIComponent(q.url.slice(1).split("?")[0]); d = readFileSync(join(dist, p)); } catch { a.writeHead(404); a.end(); return; } a.writeHead(200, { "content-type": typ[extname(p)] ?? "application/octet-stream" }); a.end(d); }).listen(+process.env.PORT || 8797);
let fehler = 0; const ok = (c, t) => { console.log(`${c ? "✓" : "✗"} ${t}`); if (!c) fehler++; };
const b = await chromium.launch(), s = await b.newPage({ viewport: { width: 1280, height: 800 } }), pr = []; s.on("pageerror", (e) => pr.push(e.message));
const features = [
  { id: "sk", typ: "skizze", name: "Rechteck", ebene: "XY", elemente: [{ id: 1, art: "rechteck", a: [0, 0], b: [200, 100] }], bedingungen: [] },
  { id: "fl", typ: "flaeche", name: "Blech 1", skizze: "sk", material: "zink07", flaechen: [[10, 10]], kanten: {} },
  { id: "sb", typ: "skizze", name: "Biegelinie", ebene: "XY", elemente: [{ id: 2, art: "linie", pts: [[100, -10], [100, 110]], geschlossen: false }], bedingungen: [] },
  { id: "bi", typ: "biegung", name: "Biegung 1", ziel: "fl", skizze: "sb", winkel: 90, radius: 0, richtung: "vorne", blech: 0 }];
await s.addInitScript((d) => { localStorage.setItem("sdcad-einstellungen", JSON.stringify({ materialien: [{ id: "zink07", name: "Z", t: 0.7, ri: 1, k: 0.4, dichte: 7.2 }] })); localStorage.setItem("sdcad-doc-0.2", JSON.stringify({ objekt: "T", nr: "1", zaehler: 60, features: d })); }, features);
await s.goto("http://localhost:" + (process.env.PORT || 8797) + "/index.html?test"); await s.waitForTimeout(2000);
const k = await s.evaluate(() => window.sdcadTest.koerper().filter((q) => String(q.fid).split(":")[0] === "fl").map((q) => ({ vol: Math.abs(q.volumen), min: q.min, max: q.max })));
const fehl = await s.evaluate(() => window.sdcadTest.dok().features.map((f) => f.id + ":" + (f._fehler || "")).filter((x) => !x.endsWith(":")));
ok(fehl.length === 0, "Biegung ohne Fehler " + fehl.join(" | "));
const vol = k.reduce((a, q) => a + q.vol, 0), mx = Math.max(...k.map((q) => q.max[2])), mnx = Math.min(...k.map((q) => q.min[0])), Mx = Math.max(...k.map((q) => q.max[0]));
ok(Math.abs(vol - 200 * 100 * 0.7) / (200 * 100 * 0.7) < 0.04, `Blechvolumen bleibt erhalten (${Math.round(vol)} ≈ ${200 * 100 * 0.7})`);
ok(mx > 90 && mx < 105, `Hälfte um 90° nach oben gebogen (Höhe ${mx.toFixed(1)} mm)`);
ok(Mx > 199 && mnx > 95, `Eine Hälfte bleibt flach liegen, die andere steht senkrecht an der Biegelinie (x ${mnx.toFixed(1)}…${Mx.toFixed(1)})`);
const a = await s.evaluate(() => { const bl = window.sdcadTest.quetschAbw("fl"); return bl?.arten || []; }); ok(a.filter((x) => x === "biegung").length === 2, "Abwicklung enthält die beiden Biegelinien der Biegezone");
await s.evaluate(() => document.getElementById("wBiegung").click()); await s.waitForSelector("#d_winkel", { state: "attached", timeout: 4000 }).then(() => ok(true, "Dialog Biegung an Linie")).catch(() => ok(false, "Dialog Biegung an Linie"));
ok(pr.length === 0, "keine Seitenfehler " + pr.join(" | "));
await b.close(); srv.close();
console.log(fehler ? `${fehler} Fehler` : "Biegung an Linie (App): alle Prüfungen bestanden"); process.exit(fehler ? 1 : 0);
