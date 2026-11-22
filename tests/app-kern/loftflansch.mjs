// App-Test Blechprofil: nachträglich Flansch/Umschlag an Kante A und B ansetzen (Kanten-Werkzeug)
// node tests/app-kern/stirnflansch.mjs (nach node build.mjs; Playwright/Chromium)
import { createServer } from "node:http"; import { readFileSync } from "node:fs"; import { createRequire } from "node:module"; import { extname, join, resolve } from "node:path";
const dist = resolve("dist"), { chromium } = createRequire(import.meta.url)("playwright");
const typ = { ".html": "text/html", ".js": "text/javascript", ".wasm": "application/wasm", ".json": "application/json" };
const srv = createServer((q, a) => { let p, d; try { p = q.url === "/" ? "index.html" : decodeURIComponent(q.url.slice(1).split("?")[0]); d = readFileSync(join(dist, p)); } catch { a.writeHead(404); a.end(); return; } a.writeHead(200, { "content-type": typ[extname(p)] ?? "application/octet-stream" }); a.end(d); }).listen(+process.env.PORT || 8797);
let fehler = 0; const ok = (c, t) => { console.log(`${c ? "✓" : "✗"} ${t}`); if (!c) fehler++; };
const b = await chromium.launch(), s = await b.newPage({ viewport: { width: 1280, height: 800 } }), pr = []; s.on("pageerror", (e) => pr.push(e.message));
const features = [
  { id: "s1", typ: "skizze", name: "Profil 1", ebene: "XY", elemente: [{ id: 1, art: "linie", pts: [[0, 0], [100, 0], [100, 50]], geschlossen: false }], bedingungen: [] },
  { id: "s2", typ: "skizze", name: "Profil 2", ebene: "XZ", elemente: [{ id: 2, art: "linie", pts: [[0, 100], [100, 100]], geschlossen: false }], bedingungen: [] },
  { id: "lf", typ: "loftflansch", name: "Lofted Flange 1", profil1: "s1", profil2: "s2", kette1: 0, kette2: 0, material: "zink07", stueck: 2, sichtseite: 1, lage: "mitte", teilung: 12 }];
await s.addInitScript((d) => { localStorage.setItem("sdcad-einstellungen", JSON.stringify({ materialien: [{ id: "zink07", name: "Z", t: 0.7, ri: 1, k: 0.4, dichte: 7.2 }] })); localStorage.setItem("sdcad-doc-0.2", JSON.stringify({ objekt: "T", nr: "1", zaehler: 60, features: d })); }, features);
await s.goto("http://localhost:" + (process.env.PORT || 8797) + "/index.html?test"); await s.waitForTimeout(2000);
const fehl = await s.evaluate(() => window.sdcadTest.dok().features.map((f) => f.id + ":" + (f._fehler || "")).filter((x) => !x.endsWith(":")));
ok(fehl.length === 0, "Lofted Flange ohne Fehler " + fehl.join(" | "));
const v = await s.evaluate(() => window.sdcadTest.koerper().filter((q) => String(q.fid).split(":")[0] === "lf").reduce((a, q) => a + Math.abs(q.volumen), 0));
ok(v > 5500 && v < 11500, `Blechkörper zwischen den Profilen (Volumen ${Math.round(v)} mm³ ≈ Fläche × 0.7)`);
await s.evaluate(() => window.sdcadTest.waehle("lf:0")); await s.waitForTimeout(700);
const txt = await s.evaluate(() => document.querySelector("aside.werkstatt")?.textContent || "");
ok(/Zuschnitt/.test(txt) && /Lofted Flange 1/.test(txt), "Teil-Panel zeigt Abwicklung/Zuschnitt des Lofted Flange");
await s.evaluate(() => document.getElementById("wLoftFlansch").click()); await s.waitForSelector("#d_teilung", { state: "attached", timeout: 4000 }).then(() => ok(true, "Dialog Lofted Flange")).catch(() => ok(false, "Dialog Lofted Flange"));
ok(pr.length === 0, "keine Seitenfehler " + pr.join(" | "));
await b.close(); srv.close();
console.log(fehler ? `${fehler} Fehler` : "Lofted Flange (App): alle Prüfungen bestanden"); process.exit(fehler ? 1 : 0);
