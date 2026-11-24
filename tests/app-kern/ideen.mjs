// App-Test: Startseite, Verlaufsliste, Masslinien (Winkel/Radius/Durchmesser)
import { createServer } from "node:http"; import { readFileSync } from "node:fs"; import { createRequire } from "node:module"; import { extname, join, resolve } from "node:path";
const dist = resolve("dist"), { chromium } = createRequire(import.meta.url)("playwright");
const typ = { ".html": "text/html", ".js": "text/javascript", ".wasm": "application/wasm", ".json": "application/json" };
const srv = createServer((q, a) => { let p, d; try { p = q.url === "/" ? "index.html" : decodeURIComponent(q.url.slice(1).split("?")[0]); d = readFileSync(join(dist, p)); } catch { a.writeHead(404); a.end(); return; } a.writeHead(200, { "content-type": typ[extname(p)] || "application/octet-stream" }); a.end(d); }).listen(+(process.env.PORT || 8797));
let fehler = 0; const ok = (c, t) => { console.log(`${c ? "✓" : "✗"} ${t}`); if (!c) fehler++; };
const b = await chromium.launch(), pr = [], basis = "http://localhost:" + (process.env.PORT || 8797) + "/index.html";
// Startseite (nur ohne ?test)
let c = await b.newContext({ viewport: { width: 1280, height: 800 } }), s = await c.newPage(); s.on("pageerror", (e) => pr.push(e.message));
await s.goto(basis); await s.waitForTimeout(2200);
ok(await s.evaluate(() => !!document.getElementById("startseite") && document.querySelectorAll("#startseite .startknopf").length >= 4), "Startseite erscheint beim Programmstart mit Aktionen");
await s.check("#startNie"); await s.click('#startseite [data-a="weiter"] >> nth=0'); await s.waitForTimeout(300);
ok(await s.evaluate(() => !document.getElementById("startseite")), "«Weiterarbeiten» schliesst die Startseite");
await s.reload(); await s.waitForTimeout(2200); ok(await s.evaluate(() => !document.getElementById("startseite")), "«Nicht mehr zeigen» wird gemerkt");
await c.close();
// Verlauf
c = await b.newContext({ viewport: { width: 1280, height: 800 } }); s = await c.newPage(); s.on("pageerror", (e) => pr.push(e.message));
await s.goto(basis + "?test"); await s.waitForTimeout(1500);
await s.evaluate(() => document.getElementById("wSkizze").click()); await s.waitForTimeout(400); await s.evaluate(() => document.getElementById("dOk").click()); await s.waitForTimeout(800);
await s.evaluate(() => { const t = document.getElementById("tFertig"); t?.click(); }); await s.waitForTimeout(500);
await s.click("#verlaufBtn"); await s.waitForTimeout(300);
const v = await s.evaluate(() => { const m = document.getElementById("verlaufMenue"); return m.hidden ? null : [...m.querySelectorAll("button b")].map((x) => x.textContent); });
ok(v && v.length >= 1 && v.some((x) => /Neu:|Geändert:|Start/.test(x)), `Verlaufsliste zeigt beschriftete Schritte (${v})`);
await c.close();
// Masslinien: Winkel/Radius/Durchmesser
c = await b.newContext({ viewport: { width: 1280, height: 800 } }); s = await c.newPage(); s.on("pageerror", (e) => pr.push(e.message));
await s.addInitScript(() => { localStorage.setItem("sdcad-doc-0.2", JSON.stringify({ objekt: "T", nr: "1", zaehler: 20, features: [{ id: "sk", typ: "skizze", name: "S", ebene: "XY", elemente: [{ id: 1, art: "linie", pts: [[0, 0], [100, 0], [60, 70], [0, 40]], geschlossen: true, layer: "0", radien: { 2: 10 } }, { id: 2, art: "kreis", c: [160, 40], r: 25, layer: "0" }], bedingungen: [] }] })); });
await s.goto(basis + "?test"); await s.waitForTimeout(1500); await s.evaluate(() => window.sdcadTest.bearbeite("sk")); await s.waitForTimeout(900);
const t = await s.evaluate(() => [...document.querySelectorAll("#labels div")].filter((d) => !d.hidden).map((d) => d.textContent));
ok(t.some((x) => /°/.test(x)) && t.some((x) => /^R /.test(x)) && t.some((x) => /^Ø /.test(x)), `Winkel-, Radius- und Durchmessermass vorhanden (${t.join(" ")})`);
ok(pr.length === 0, "keine Seitenfehler " + pr.join(" | "));
await b.close(); srv.close();
console.log(fehler ? `${fehler} Fehler` : "Startseite, Verlauf, Masslinien (App): alle Prüfungen bestanden"); process.exit(fehler ? 1 : 0);
