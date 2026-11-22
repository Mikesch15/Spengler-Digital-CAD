// App-Test Projektdatei: Speichern, Öffnen und Neustart erhalten Features, IDs und Parameter
// node tests/app-kern/projektdatei.mjs (nach node build.mjs; Playwright/Chromium)
import { createServer } from "node:http"; import { readFileSync } from "node:fs"; import { createRequire } from "node:module"; import { extname, join, resolve } from "node:path";
const dist = resolve("dist"), { chromium } = createRequire(import.meta.url)("playwright");
const typ = { ".html": "text/html", ".js": "text/javascript", ".wasm": "application/wasm", ".json": "application/json" };
const srv = createServer((q, a) => { let p, d; try { p = q.url === "/" ? "index.html" : decodeURIComponent(q.url.slice(1).split("?")[0]); d = readFileSync(join(dist, p)); } catch { a.writeHead(404); a.end(); return; } a.writeHead(200, { "content-type": typ[extname(p)] ?? "application/octet-stream" }); a.end(d); }).listen(+process.env.PORT || 8797);
let fehler = 0; const ok = (c, t) => { console.log(`${c ? "✓" : "✗"} ${t}`); if (!c) fehler++; };
const b = await chromium.launch(), pr = [];
const DOC = { objekt: "Muster", nr: "7", zaehler: 40, features: [
  { id: "s1", typ: "skizze", name: "Skizze 1", ebene: "XY", elemente: [{ id: 1, art: "rechteck", a: [0, 0], b: [50, 40] }], bedingungen: [] },
  { id: "e1", typ: "extrusion", name: "Extrusion 1", skizze: "s1", abstand: 25, richtung: "zwei", abstand2: 5, vorgang: "neu" },
  { id: "d1", typ: "dach", name: "Dach 1", gebaeude: "g1", form: "sattel", firstRichtung: "laengs", neigung: 35, neigung2: 35, ueberstandTraufe: 400, ueberstandOrtgang: 300 },
  { id: "g1", typ: "gebaeude", name: "Gebäude 1", breite: 10000, tiefe: 8000, traufhoehe: 3000, wandstaerke: 300, x: 0, z: 0 }] };
const neu = async (init) => { const s = await b.newPage({ viewport: { width: 1280, height: 800 } }); s.on("pageerror", (e) => pr.push(e.message)); if (init) await s.addInitScript((d) => localStorage.setItem("sdcad-doc-0.2", JSON.stringify(d)), init); await s.goto("http://localhost:" + (process.env.PORT || 8797) + "/index.html?test"); await s.waitForTimeout(1500); return s; };
const sig = (d) => JSON.stringify(d.features.map((f) => [f.id, f.typ, f.name]));
const s1 = await neu(DOC); const d1 = await s1.evaluate(() => window.sdcadTest.dok());
ok(sig(d1) === sig(DOC) && d1.objekt === "Muster" && d1.nr === "7", "Bestehendes Projekt wird mit allen Features und IDs geladen");
ok(d1.features.find((f) => f.id === "e1").richtung === "zwei" && d1.features.find((f) => f.id === "e1").abstand2 === 5, "Neuere Feature-Felder (zwei Seiten) bleiben erhalten");
// Neustart: Zustand bleibt im Browser erhalten
await s1.reload(); await s1.waitForTimeout(1500); const d2 = await s1.evaluate(() => window.sdcadTest.dok());
ok(sig(d2) === sig(DOC), "Nach Neustart derselbe Projektinhalt");
// Datei öffnen (.sdcad/.json über das Dateifeld)
const s2 = await neu(); const text = JSON.stringify(DOC);
await s2.setInputFiles("#datei", { name: "test.sdcad", mimeType: "application/json", buffer: Buffer.from(text) }); await s2.waitForTimeout(1500);
const d3 = await s2.evaluate(() => window.sdcadTest.dok());
ok(sig(d3) === sig(DOC) && d3.objekt === "Muster", "Datei öffnen (.sdcad): Inhalt identisch");
ok(await s2.evaluate(() => window.sdcadTest.koerper().some((k) => k.fid === "e1" && k.volumen > 0)), "Geöffnetes Projekt wird neu aufgebaut (Körper vorhanden)");
ok(pr.length === 0, "keine Seitenfehler " + pr.join(" | "));
await b.close(); srv.close();
console.log(fehler ? `${fehler} Fehler` : "Projektdatei (App): alle Prüfungen bestanden"); process.exit(fehler ? 1 : 0);
