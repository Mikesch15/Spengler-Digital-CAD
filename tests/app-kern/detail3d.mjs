// App-Test 3D-Detailvorlagen (STEP) und exakter STEP-Import
// node tests/app-kern/detail3d.mjs (nach node build.mjs; Playwright/Chromium)
import { createServer } from "node:http";
import { readFileSync, writeFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { createRequire } from "node:module";
import { extname, join, resolve } from "node:path";
import { occtKern } from "../../kern/cad/occt.js";
const dist = resolve("dist"), { chromium } = createRequire(import.meta.url)("playwright");
const typ = { ".html": "text/html", ".js": "text/javascript", ".wasm": "application/wasm", ".json": "application/json" };
const srv = createServer((q, a) => { let p, d; try { p = q.url === "/" ? "index.html" : decodeURIComponent(q.url.slice(1).split("?")[0]); d = readFileSync(join(dist, p)); } catch { a.writeHead(404); a.end(); return; } a.writeHead(200, { "content-type": typ[extname(p)] ?? "application/octet-stream" }); a.end(d); }).listen(+process.env.PORT || 8772);
let fehler = 0; const ok = (b, t) => { console.log(`${b ? "✓" : "✗"} ${t}`); if (!b) fehler++; };
// STEP-Datei: Quader 40 × 10 × 5 (Ursprung am Kantenanfang, X entlang der Kante)
const K = await occtKern(), q = await K.ausfuehren({ op: "quader", min: [0, 0, 0], max: [40, 10, 5] }), { text } = await K.ausfuehren({ op: "stepExport", ziele: [q.id], namen: ["Kehle"] });
const ordner = mkdtempSync(join(tmpdir(), "sdcad-")), datei = join(ordner, "kehle40.step"); writeFileSync(datei, text);
const b = await chromium.launch(), s = await b.newPage(), probleme = []; s.on("pageerror", (e) => probleme.push(e.message));
{ const f0 = s.fill.bind(s); s.fill = async (sel, v, o) => (o?.force ? s.evaluate(([q, w]) => { const e = document.querySelector(q); e.value = w; e.dispatchEvent(new Event("input", { bubbles: true })); }, [sel, v]) : f0(sel, v, o)); }
await s.addInitScript(() => { localStorage.setItem("sdcad-doc-0.2", JSON.stringify({ objekt: "D", nr: "D-1", zaehler: 5, features: [] }));
  localStorage.setItem("sdcad-einstellungen", JSON.stringify({ materialien: [{ id: "zink07", name: "Titanzink 0.70", t: 0.7, ri: 1.0, k: 0.4, dichte: 7.2 }], programm: { kern: "occt" } })); });
await s.goto("http://localhost:" + (process.env.PORT || 8772) + "/index.html?test"); await s.waitForTimeout(800);
// 1) Vorlage aus STEP anlegen
await s.evaluate(() => { document.getElementById("wEinst").click(); document.querySelector('[data-ereg="detail3d"]').click(); });
await s.setInputFiles("#detailDatei", datei); await s.waitForSelector('[data-dv="name"]', { timeout: 20000 });
ok(await s.inputValue('[data-dv="name"]') === "kehle40", "Vorlage aus der STEP-Datei angelegt: Name «kehle40»");
await s.fill('[data-dv="category"]', "Kehlen"); await s.click("#eOk"); await s.waitForTimeout(400);
const v = await s.evaluate(() => JSON.parse(localStorage.getItem("sdcad-einstellungen")).detailvorlagen[0]);
ok(v?.anchor.edgeLength === 40 && v.category === "Kehlen" && v.source.step.includes("ISO-10303-21") && v.source.mesh.length > 100, `Gespeichert: Ankerlänge ${v?.anchor.edgeLength} mm, STEP-Text und Dreiecke enthalten`);
// 2) Einsetzen an der Y-Achse (Kante)
await s.evaluate(() => document.getElementById("wDetail3d").click()); await s.waitForSelector("#d_kante", { state: "attached", timeout: 5000 });
await s.selectOption("#d_kante", "A:Y", { force: true }); await s.waitForTimeout(200); await s.click("#dOk");
const dfid = await s.evaluate(() => JSON.parse(localStorage.getItem("sdcad-doc-0.2")).features.find((f) => f.typ === "detail3d")?.id);
await s.waitForFunction((id) => window.sdcadTest.koerperInfo().some((k) => k.fid === id && k.exakt), dfid, { timeout: 60000 });
const k = (await s.evaluate(() => window.sdcadTest.koerperInfo())).find((x) => x.fid === dfid);
const ab = k.max.map((m, i) => m - k.min[i]);
ok(Math.abs(k.volumen - 2000) < 2 && Math.abs(ab[1] - 40) < 1e-6 && Math.abs(Math.min(ab[0], ab[2]) - 5) < 1e-6 && Math.abs(Math.max(ab[0], ab[2]) - 10) < 1e-6 && Math.abs(k.min[1]) < 1e-6, `3D-Detail exakt an der Y-Achse: V ${k.volumen.toFixed(1)} mm³, Ausdehnung ${ab.map((v) => v.toFixed(1)).join(" × ")}, Anfang bei y = ${k.min[1].toFixed(2)}`);
// 3) Drehung um 90° vertauscht die Ausdehnung in X und Z, Volumen bleibt
const fid = await s.evaluate(() => JSON.parse(localStorage.getItem("sdcad-doc-0.2")).features.find((f) => f.typ === "detail3d").id);
await s.evaluate((id) => window.sdcadTest.bearbeite(id), fid); await s.waitForSelector("#d_drehung", { state: "attached", timeout: 5000 });
await s.fill("#d_drehung", "90", { force: true }); await s.click("#dOk"); await s.waitForTimeout(1500);
await s.waitForTimeout(1500); await s.waitForFunction((id) => window.sdcadTest.koerperInfo().some((k) => k.fid === id && k.exakt), fid, { timeout: 60000 });
const k2 = (await s.evaluate(() => window.sdcadTest.koerperInfo())).find((x) => x.fid === fid), ab2 = k2.max.map((m, i) => m - k2.min[i]);
ok(Math.abs(k2.volumen - 2000) < 2 && Math.abs(ab2[0] - ab[2]) < 1e-6 && Math.abs(ab2[2] - ab[0]) < 1e-6 && Math.abs(ab2[1] - 40) < 1e-6, `Drehung 90°: Ausdehnung ${ab2.map((v) => v.toFixed(1)).join(" × ")} (vorher ${ab.map((v) => v.toFixed(1)).join(" × ")})`);
// 4) STEP-Import exakt (Kern ein)
await s.evaluate(() => { const l = document.getElementById("wEinst"); }); 
await s.setInputFiles("#importDatei", datei);
await s.waitForFunction(() => JSON.parse(localStorage.getItem("sdcad-doc-0.2")).features.some((f) => f.typ === "import"), null, { timeout: 30000 });
const ifid = await s.evaluate(() => JSON.parse(localStorage.getItem("sdcad-doc-0.2")).features.find((f) => f.typ === "import").id);
await s.waitForFunction((id) => window.sdcadTest.koerperInfo().some((k) => k.fid === id && k.exakt), ifid, { timeout: 60000 });
const im = (await s.evaluate(() => window.sdcadTest.koerperInfo())).find((x) => x.fid === ifid);
ok(Math.abs(im.volumen - 2000) < 2 && im.flaechen === 6 && (await s.evaluate(() => JSON.parse(localStorage.getItem("sdcad-doc-0.2")).features.some((f) => f.typ === "import" && f.step?.includes("ISO-10303-21")))), "STEP-Import als exakter Körper (B-Rep) mit gespeichertem STEP-Text");
ok(probleme.length === 0, "keine Seitenfehler " + probleme.join(" | "));
await b.close(); srv.close();
console.log(fehler ? `${fehler} Fehler` : "3D-Detail: alle Prüfungen bestanden"); process.exit(fehler ? 1 : 0);
