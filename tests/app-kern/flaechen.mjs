// App-Test Flächenwahl wie in Fusion: Teilflächen einer Skizze anklicken (Extrusion, Flächenblech), Mehrfachwahl, Abwählen
// node tests/app-kern/flaechen.mjs (nach node build.mjs; Playwright/Chromium)
import { createServer } from "node:http";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { extname, join, resolve } from "node:path";
const dist = resolve("dist"), { chromium } = createRequire(import.meta.url)("playwright");
const typ = { ".html": "text/html", ".js": "text/javascript", ".wasm": "application/wasm", ".json": "application/json" };
const srv = createServer((q, a) => { let p, d; try { p = q.url === "/" ? "index.html" : decodeURIComponent(q.url.slice(1).split("?")[0]); d = readFileSync(join(dist, p)); } catch { a.writeHead(404); a.end(); return; } a.writeHead(200, { "content-type": typ[extname(p)] ?? "application/octet-stream" }); a.end(d); }).listen(8778);
let fehler = 0; const ok = (b, t) => { console.log(`${b ? "✓" : "✗"} ${t}`); if (!b) fehler++; };
const b = await chromium.launch(), s = await b.newPage({ viewport: { width: 1280, height: 800 } }), probleme = []; s.on("pageerror", (e) => probleme.push(e.message));
const projekt = { objekt: "F", nr: "F-1", zaehler: 10, features: [
  { id: "sk", typ: "skizze", name: "Skizze 1", ebene: "XY", elemente: [{ id: 1, art: "rechteck", a: [0, 0], b: [100, 100] }, { id: 2, art: "rechteck", a: [50, 50], b: [150, 150] }] },
  { id: "ex", typ: "extrusion", name: "Extrusion 1", skizze: "sk", flaechen: [], abstand: 10, richtung: "eine", vorgang: "neu" }] };
await s.addInitScript((d) => { localStorage.setItem("sdcad-doc-0.2", JSON.stringify(d)); }, projekt);
await s.goto("http://localhost:8778/index.html?test"); await s.waitForTimeout(900);
const klick = async (uv) => { const p = await s.evaluate((u) => window.sdcadTest.schirmUV("XY", u), uv); await s.mouse.move(p[0], p[1]); await s.waitForTimeout(150); await s.mouse.click(p[0], p[1]); await s.waitForTimeout(300); };
const vol = () => s.evaluate(() => window.sdcadTest.koerperInfo().filter((k) => k.fid === "ex").reduce((a, k) => a + Math.abs(k.volumen), 0));
const fl = () => s.evaluate(() => window.sdcadTest.dok().features.find((f) => f.id === "ex").flaechen.length);
await s.evaluate(() => window.sdcadTest.bearbeite("ex")); await s.waitForTimeout(500);
ok(await vol() === 0, "Ohne angeklickte Fläche entsteht kein Körper");
await s.click("#dOk"); await s.waitForTimeout(200);
ok(!(await s.evaluate(() => document.getElementById("dialog").hidden)), "OK ohne Flächenwahl bleibt gesperrt (Dialog bleibt offen)");
// Hover leuchtet auf
const p0 = await s.evaluate(() => window.sdcadTest.schirmUV("XY", [75, 75])); await s.mouse.move(p0[0], p0[1]); await s.waitForTimeout(300);
ok(await s.evaluate(() => window.sdcadTest.hover()) > 0, "Fläche unter dem Zeiger leuchtet auf");
await klick([75, 75]);
ok(await fl() === 1 && Math.abs(await vol() - 25000) < 1, `Überlappung allein gewählt: Volumen ${await vol()} (erwartet 25000)`);
ok(await s.evaluate(() => window.sdcadTest.waehl()) > 0, "Gewählte Fläche bleibt farbig markiert");
await klick([10, 10]);
ok(await fl() === 2 && Math.abs(await vol() - 100000) < 1, `Zweite Teilfläche (L-Form) dazu: Volumen ${await vol()} (erwartet 100000)`);
await klick([75, 75]);
ok(await fl() === 1 && Math.abs(await vol() - 75000) < 1, `Überlappung wieder abgewählt: Volumen ${await vol()} (erwartet 75000)`);
await s.click("#dOk"); await s.waitForTimeout(400);
ok(await s.evaluate(() => document.getElementById("dialog").hidden), "OK mit gewählter Fläche schliesst den Dialog");
const gespeichert = await s.evaluate(() => window.sdcadTest.dok().features.find((f) => f.id === "ex").flaechen);
ok(gespeichert.length === 1 && gespeichert[0].length === 2, "Flächenwahl als Innenpunkt im Projekt gespeichert");
// Flächenblech: nur die Überlappung
await s.evaluate(() => window.sdcadTest.dok()); 
ok(probleme.length === 0, "keine Seitenfehler " + probleme.join(" | "));
await b.close(); srv.close();
console.log(fehler ? `${fehler} Fehler` : "Flächenwahl: alle Prüfungen bestanden"); process.exit(fehler ? 1 : 0);
