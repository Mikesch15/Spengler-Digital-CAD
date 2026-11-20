// App-Test: Körper teilen, Flächenblech-Lage, Löschen-Knopf in der Skizze (Tablet), eigene Komponente
// node tests/app-kern/teilen.mjs (nach node build.mjs; Playwright/Chromium)
import { createServer } from "node:http"; import { readFileSync } from "node:fs"; import { createRequire } from "node:module"; import { extname, join, resolve } from "node:path";
const dist = resolve("dist"), { chromium } = createRequire(import.meta.url)("playwright");
const typ = { ".html": "text/html", ".js": "text/javascript", ".wasm": "application/wasm", ".json": "application/json" };
const srv = createServer((q, a) => { let p, d; try { p = q.url === "/" ? "index.html" : decodeURIComponent(q.url.slice(1).split("?")[0]); d = readFileSync(join(dist, p)); } catch { a.writeHead(404); a.end(); return; } a.writeHead(200, { "content-type": typ[extname(p)] ?? "application/octet-stream" }); a.end(d); }).listen(8779);
let fehler = 0; const ok = (c, x) => { console.log(`${c ? "✓" : "✗"} ${x}`); if (!c) fehler++; };
const b = await chromium.launch(), s = await b.newPage({ viewport: { width: 1280, height: 800 } }), pr = []; s.on("pageerror", (e) => pr.push(e.message));
const projekt = { objekt: "T", nr: "T-1", zaehler: 10, features: [
  { id: "sk", typ: "skizze", name: "S", ebene: "XY", elemente: [{ id: 1, art: "rechteck", a: [-50, -50], b: [50, 50] }] },
  { id: "ex", typ: "extrusion", name: "E", skizze: "sk", abstand: 50, richtung: "eine", vorgang: "neu" },
  { id: "te", typ: "teilen", name: "T1", ziel: "ex", ebene: "YZ", behalten: "beide" },
  { id: "sk2", typ: "skizze", name: "S2", ebene: "XY", elemente: [{ id: 1, art: "rechteck", a: [0, 0], b: [200, 100] }] },
  { id: "fl", typ: "flaeche", name: "F", skizze: "sk2", material: "zink07", flaechen: [[10, 10]], lage: "vorne", kanten: {} }] };
await s.addInitScript((d) => { localStorage.setItem("sdcad-doc-0.2", JSON.stringify(d)); localStorage.setItem("sdcad-einstellungen", JSON.stringify({ materialien: [{ id: "zink07", name: "Z", t: 0.7, ri: 1, k: 0.4, dichte: 7.2 }] })); }, projekt);
await s.goto("http://localhost:8779/index.html?test"); await s.waitForTimeout(1200);
const info = await s.evaluate(() => window.sdcadTest.koerperInfo().map((k) => [k.fid, Math.round(k.volumen)]));
ok(info.some((k) => k[0] === "ex" && k[1] === 250000) && info.some((k) => k[0] === "te:0" && k[1] === 250000), "Körper an der Ebene in zwei Hälften à 250000 mm³ geteilt " + JSON.stringify(info));
ok(info.some((k) => k[0] === "fl:0" && k[1] === 14000), "Flächenblech mit Skizze auf der Vorderseite (Lage) baut");
// Löschen-Knopf in der Skizze
await s.evaluate(() => window.sdcadTest.bearbeite("sk2")); await s.waitForTimeout(700);
await s.click("#tAuswahl"); const p = await s.evaluate(() => window.sdcadTest.schirmUV("XY", [60, 0])); await s.mouse.move(p[0] + 3, p[1] + 2, { steps: 4 }); await s.mouse.move(p[0], p[1]); await s.waitForTimeout(200); await s.mouse.down(); await s.mouse.up(); await s.waitForTimeout(250);
await s.click("#tEntf"); await s.waitForTimeout(300); console.log(await s.evaluate(() => document.getElementById("status")?.textContent));
const n = await s.evaluate(() => window.sdcadTest.dok().features.find((f) => f.id === "sk2").elemente.length);
ok(n === 0, `Löschen-Knopf ausgeführt (Elemente übrig: ${n})`);
await s.evaluate(() => window.sdcadTest.beendeSkizze?.());
const w0 = (await s.locator("#leinwand").boundingBox()).width; await s.click("#werkZu"); await s.waitForTimeout(300);
const w1 = (await s.locator("#leinwand").boundingBox()).width; ok(w1 > w0 + 200 && await s.isHidden("aside.werkstatt"), `Teil/Auftrag zugeklappt: Ansicht ${Math.round(w0)} → ${Math.round(w1)} px`);
await s.click("#werkAuf"); await s.waitForTimeout(300); ok(await s.isVisible("aside.werkstatt"), "Teil/Auftrag wieder aufklappbar");
ok(pr.length === 0, "keine Seitenfehler " + pr.join(" | "));
await b.close(); srv.close();
console.log(fehler ? `${fehler} Fehler` : "Teilen/Lage/Löschen: alle Prüfungen bestanden"); process.exit(fehler ? 1 : 0);
