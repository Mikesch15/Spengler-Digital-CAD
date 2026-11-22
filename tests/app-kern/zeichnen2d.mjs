// App-Test 2D-Modus: Layer (Farbe, Linienart), Zuweisen, Körper ausgeblendet, DXF mit Layern
// node tests/app-kern/zeichnen2d.mjs (nach node build.mjs; Playwright/Chromium)
import { createServer } from "node:http"; import { readFileSync } from "node:fs"; import { createRequire } from "node:module"; import { extname, join, resolve } from "node:path";
const dist = resolve("dist"), { chromium } = createRequire(import.meta.url)("playwright");
const typ = { ".html": "text/html", ".js": "text/javascript", ".wasm": "application/wasm", ".json": "application/json" };
const srv = createServer((q, a) => { let p, d; try { p = q.url === "/" ? "index.html" : decodeURIComponent(q.url.slice(1).split("?")[0]); d = readFileSync(join(dist, p)); } catch { a.writeHead(404); a.end(); return; } a.writeHead(200, { "content-type": typ[extname(p)] ?? "application/octet-stream" }); a.end(d); }).listen(+process.env.PORT || 8785);
let fehler = 0; const ok = (c, t) => { console.log(`${c ? "✓" : "✗"} ${t}`); if (!c) fehler++; };
const b = await chromium.launch(), ctx = await b.newContext({ acceptDownloads: true, viewport: { width: 1280, height: 800 } }), s = await ctx.newPage(), pr = []; s.on("pageerror", (e) => pr.push(e.message));
const pj = { objekt: "Z", nr: "Z-1", zaehler: 10, features: [
  { id: "sk", typ: "skizze", name: "Zeichnung 1", ebene: "XY", elemente: [{ id: 1, art: "linie", pts: [[0, 0], [200, 0]] }, { id: 2, art: "kreis", c: [100, 80], r: 40 }, { id: 3, art: "rechteck", a: [0, 150], b: [200, 250] }] },
  { id: "ex", typ: "extrusion", name: "E", skizze: "sk", flaechen: [[100, 200]], abstand: 20, richtung: "eine", vorgang: "neu" }] };
await s.addInitScript((d) => localStorage.setItem("sdcad-doc-0.2", JSON.stringify(d)), pj);
await s.goto("http://localhost:" + (process.env.PORT || 8785) + "/index.html?test"); await s.waitForTimeout(900);
const vor = await s.evaluate(() => window.sdcadTest.koerperInfo().length);
await s.evaluate(() => document.getElementById("w2D").click()); await s.waitForTimeout(700);
ok(await s.isVisible("#layerBox"), "2D-Modus: Layer-Leiste sichtbar");
ok(vor === 1 && await s.evaluate(() => window.sdcadTest.sichtbareKoerper()) === 0, "2D-Modus: Körper ausgeblendet");
// neuer Layer: Mittellinie, Rot
await s.click("#lNeu"); await s.waitForTimeout(200);
const zeilen = await s.locator("#layerListe .lrow").count(); ok(zeilen === 2, `Neuer Layer angelegt (${zeilen} Layer)`);
await s.selectOption('#layerListe .lrow.aktiv [data-lf="aci"]', "1"); await s.selectOption('#layerListe .lrow.aktiv [data-lf="art"]', "mittellinie"); await s.waitForTimeout(200);
// Kreis wählen und dem aktiven Layer zuweisen
await s.evaluate(() => document.getElementById("zoomAlles").click()); await s.waitForTimeout(300);
const p = await s.evaluate(() => window.sdcadTest.schirmUV("XY", [60, 80])); await s.mouse.move(p[0] + 2, p[1]); await s.waitForTimeout(150); await s.mouse.down(); await s.mouse.up(); await s.waitForTimeout(250);
console.log("pos", p, await s.evaluate(([x, y]) => { const e = document.elementFromPoint(x, y); return e.tagName + "#" + e.id; }, p)); await s.click("#lZuw"); await s.waitForTimeout(200); console.log(await s.evaluate(() => document.getElementById("status").textContent));
const d = await s.evaluate(() => window.sdcadTest.dok()); const lay = d.layer.find((l) => l.id !== "0");
ok(lay.aci === 1 && lay.art === "mittellinie", "Layer: Farbe Rot, Linienart Mittellinie gespeichert");
ok(d.features[0].elemente.find((e) => e.id === 2).layer === lay.id && d.features[0].elemente.find((e) => e.id === 1).layer === "0", "Kreis auf dem neuen Layer, Linie bleibt auf Layer 0");
// DXF
const [dl] = await Promise.all([s.waitForEvent("download", { timeout: 8000 }).catch(() => null), s.click("#lDxf")]);
let text = ""; if (dl) { const path = await dl.path(); text = readFileSync(path, "utf8"); }
ok(dl && text.includes("CIRCLE") && text.includes("LAYER") && text.includes("CENTER") && /\n62\n1\n6\nCENTER/.test(text), "DXF: Kreis auf Layer mit Farbe 1 und Linienart CENTER, Layertabelle vorhanden");
ok((text.match(/\nLINE\n/g) || []).length >= 1 && text.includes("POLYLINE"), "DXF: Linie und Rechteck (Polylinie) enthalten");
await s.evaluate(() => document.getElementById("w2D").click()); await s.waitForTimeout(500);
ok(await s.evaluate(() => window.sdcadTest.sichtbareKoerper()) === 1 && !(await s.isVisible("#layerBox")), "2D-Modus beendet: Körper wieder sichtbar");
ok(pr.length === 0, "keine Seitenfehler " + pr.join(" | "));
await b.close(); srv.close();
console.log(fehler ? `${fehler} Fehler` : "2D-Modus: alle Prüfungen bestanden"); process.exit(fehler ? 1 : 0);
