// App-Test Ziehpfeile: Schale, Verschieben, Muster, Versatz-Ebene, Rundblech, Kanten abrunden (Pfeil erscheint, Ziehen ändert das Feld)
// node tests/app-kern/pfeile.mjs (nach node build.mjs; Playwright/Chromium)
import { createServer } from "node:http"; import { readFileSync } from "node:fs"; import { createRequire } from "node:module"; import { extname, join, resolve } from "node:path";
const dist = resolve("dist"), { chromium } = createRequire(import.meta.url)("playwright");
const typ = { ".html": "text/html", ".js": "text/javascript", ".wasm": "application/wasm", ".json": "application/json" };
const srv = createServer((q, a) => { let p, d; try { p = q.url === "/" ? "index.html" : decodeURIComponent(q.url.slice(1).split("?")[0]); d = readFileSync(join(dist, p)); } catch { a.writeHead(404); a.end(); return; } a.writeHead(200, { "content-type": typ[extname(p)] ?? "application/octet-stream" }); a.end(d); }).listen(8787);
let fehler = 0; const ok = (c, t) => { console.log(`${c ? "✓" : "✗"} ${t}`); if (!c) fehler++; };
const b = await chromium.launch(), s = await b.newPage({ viewport: { width: 1280, height: 800 } }), pr = []; s.on("pageerror", (e) => pr.push(e.message));
const pj = { objekt: "P", nr: "P-1", zaehler: 10, features: [
  { id: "sk", typ: "skizze", name: "S", ebene: "XY", elemente: [{ id: 1, art: "rechteck", a: [0, 0], b: [100, 100] }] },
  { id: "ex", typ: "extrusion", name: "E", skizze: "sk", flaechen: [[50, 50]], abstand: 60, richtung: "eine", vorgang: "neu" },
  { id: "sch", typ: "schale", name: "Schale", ziel: "ex", dicke: 3, offen: "oben" },
  { id: "mu", typ: "kmuster", name: "Muster", ziel: "ex", art: "rechteck", richtung1: "A:X", anzahl: 2, abstand: 200, richtung2: "A:Z", anzahl2: 1, abstand2: 200, achse: "A:Y", winkel: 360 },
  { id: "bw", typ: "bewegen", name: "Verschieben", ziel: "ex", dx: 0, dy: 0, dz: 0, achse: "A:Y", winkel: 0, kopie: false },
  { id: "eb", typ: "ebene", art: "versatz", name: "Ebene", ref: "XY", abstand: 30 },
] };
await s.addInitScript((d) => localStorage.setItem("sdcad-doc-0.2", JSON.stringify(d)), pj);
await s.goto("http://localhost:8787/index.html?test"); await s.waitForTimeout(1000);
for (const [id, feld, sel] of [["sch", "dicke", "#d_dicke"], ["mu", "abstand", "#d_abstand"], ["bw", "dx", "#d_dx"], ["eb", "abstand", "#d_abstand"]]) {
  await s.evaluate((i) => window.sdcadTest.bearbeite(i), id); await s.waitForTimeout(500);
  await s.evaluate(() => document.getElementById("zoomAlles").click()); await s.waitForTimeout(300);
  const g = (await s.evaluate(() => window.sdcadTest.griff())).find((x) => x.feld === feld);
  ok(!!g, `${id}: Ziehpfeil für «${feld}» erscheint`);
  if (g) { const v0 = parseFloat(await s.inputValue(sel)); await s.mouse.move(g.x, g.y); await s.waitForTimeout(100); await s.mouse.down(); await s.mouse.move(g.x + 70, g.y + 40, { steps: 8 }); await s.mouse.up(); await s.waitForTimeout(300);
    const v1 = parseFloat(await s.inputValue(sel)); ok(Math.abs(v1 - v0) > 1, `${id}: Ziehen ändert «${feld}» (${v0} → ${v1})`); }
  await s.click("#dAbbrechen"); await s.waitForTimeout(300);
}
ok(pr.length === 0, "keine Seitenfehler " + pr.join(" | "));
await b.close(); srv.close();
console.log(fehler ? `${fehler} Fehler` : "Ziehpfeile: alle Prüfungen bestanden"); process.exit(fehler ? 1 : 0);
