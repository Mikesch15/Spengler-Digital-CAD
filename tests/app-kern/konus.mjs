// App-Test Blechprofil: nachträglich Flansch/Umschlag an Kante A und B ansetzen (Kanten-Werkzeug)
// node tests/app-kern/stirnflansch.mjs (nach node build.mjs; Playwright/Chromium)
import { createServer } from "node:http"; import { readFileSync } from "node:fs"; import { createRequire } from "node:module"; import { extname, join, resolve } from "node:path";
const dist = resolve("dist"), { chromium } = createRequire(import.meta.url)("playwright");
const typ = { ".html": "text/html", ".js": "text/javascript", ".wasm": "application/wasm", ".json": "application/json" };
const srv = createServer((q, a) => { let p, d; try { p = q.url === "/" ? "index.html" : decodeURIComponent(q.url.slice(1).split("?")[0]); d = readFileSync(join(dist, p)); } catch { a.writeHead(404); a.end(); return; } a.writeHead(200, { "content-type": typ[extname(p)] ?? "application/octet-stream" }); a.end(d); }).listen(+process.env.PORT || 8797);
let fehler = 0; const ok = (c, t) => { console.log(`${c ? "✓" : "✗"} ${t}`); if (!c) fehler++; };
const b = await chromium.launch(), s = await b.newPage({ viewport: { width: 1280, height: 800 } }), pr = []; s.on("pageerror", (e) => pr.push(e.message));
const features = [
  { id: "s1", typ: "skizze", name: "Quadrat", ebene: "XY", elemente: [{ id: 1, art: "rechteck", a: [0, 0], b: [100, 100] }], bedingungen: [] },
  { id: "e1", typ: "extrusion", name: "Konus", skizze: "s1", abstand: 50, richtung: "eine", vorgang: "neu", konisch: 10 },
  { id: "s2", typ: "skizze", name: "Quadrat 2", ebene: "XY", elemente: [{ id: 2, art: "rechteck", a: [300, 0], b: [330, 30] }], bedingungen: [] },
  { id: "e2", typ: "extrusion", name: "Würfel", skizze: "s2", abstand: 30, richtung: "eine", vorgang: "neu" },
  { id: "sp", typ: "skizze", name: "Pfad", ebene: "XY", elemente: [{ id: 3, art: "linie", pts: [[0, 200], [200, 200], [200, 400]], geschlossen: false }], bedingungen: [] },
  { id: "mu", typ: "kmuster", name: "Pfadmuster", ziel: "e2", art: "pfad", pfadSkizze: "sp", pfadKette: 0, anzahl: 4 }];
await s.addInitScript((d) => localStorage.setItem("sdcad-doc-0.2", JSON.stringify({ objekt: "T", nr: "1", zaehler: 60, features: d })), features);
await s.goto("http://localhost:" + (process.env.PORT || 8797) + "/index.html?test"); await s.waitForTimeout(2000);
const fehl = await s.evaluate(() => window.sdcadTest.dok().features.map((f) => f.id + ":" + (f._fehler || "")).filter((x) => !x.endsWith(":")));
ok(fehl.length === 0, "Keine Fehler " + fehl.join(" | "));
const vol = (id) => s.evaluate((i) => window.sdcadTest.koerper().filter((k) => String(k.fid).split(":")[0] === i).reduce((a, k) => a + Math.abs(k.volumen), 0), id);
const a = 100, h = 50, d = Math.tan(10 * Math.PI / 180) * h, soll = (h / 3) * (a * a + (a - 2 * d) ** 2 + a * (a - 2 * d));
const v = await vol("e1"); ok(Math.abs(v - soll) / soll < 0.01, `Konische Extrusion (10°): Volumen ${Math.round(v)} ≈ Pyramidenstumpf ${Math.round(soll)}`);
const vm = await vol("mu"); ok(Math.abs(vm - 3 * 27000) / 81000 < 0.01, `Muster entlang des Pfads: 3 Kopien (Volumen ${Math.round(vm)})`);
const mm = await s.evaluate(() => window.sdcadTest.koerper().filter((k) => String(k.fid).startsWith("mu:")).map((k) => k.min.map(Math.round)));
ok(mm.length === 3 && Math.max(...mm.map((q) => q[1])) >= 199 && Math.max(...mm.map((q) => q[0])) >= 499, "Kopien liegen gleichmässig entlang des Pfads (relativ zum Pfadanfang) bis zu dessen Ende (" + JSON.stringify(mm) + ")");
await s.evaluate(() => window.sdcadTest.bearbeite("e1")); await s.waitForSelector("#d_konisch", { state: "attached", timeout: 4000 }).then(() => ok(true, "Konuswinkel im Extrusionsdialog")).catch(() => ok(false, "Konuswinkel im Extrusionsdialog"));
ok(pr.length === 0, "keine Seitenfehler " + pr.join(" | "));
await b.close(); srv.close();
console.log(fehler ? `${fehler} Fehler` : "Konuswinkel und Pfadmuster (App): alle Prüfungen bestanden"); process.exit(fehler ? 1 : 0);
