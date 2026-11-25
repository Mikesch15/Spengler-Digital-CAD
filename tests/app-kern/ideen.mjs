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
// Blaues Logo wird auf der blauen Fläche automatisch weiss, auf Papier bleibt es blau
{ const c2 = await b.newContext({ viewport: { width: 1000, height: 760 } }), s2 = await c2.newPage(); s2.on("pageerror", (e) => pr.push(e.message));
  await s2.addInitScript(() => { const cv = document.createElement("canvas"); cv.width = 300; cv.height = 100; const g = cv.getContext("2d"); g.fillStyle = "#0f4c8e"; g.font = "bold 70px sans-serif"; g.fillText("KÜNZI", 10, 75); localStorage.setItem("sdcad-einstellungen", JSON.stringify({ materialien: [{ id: "z", name: "Z", t: 0.7, ri: 1, k: 0.4, dichte: 7.2 }], firma: { logo: cv.toDataURL("image/png"), vorname: "Mike" } })); });
  await s2.goto(basis); await s2.waitForTimeout(2500);
  const r = await s2.evaluate(() => { const f = JSON.parse(localStorage.getItem("sdcad-einstellungen")).firma, img = document.querySelector("#startseite .sblogo img"); return { src: img?.src === f.logoWeiss, orig: img?.src === f.logo, hell: f.logoHell, transp: f.logoTransp, weiss: !!f.logoWeiss, emblem: !!document.querySelector("#startseite .sbemblem") }; });
  ok(r.transp && r.hell < 0.5 && r.weiss && r.src && !r.orig, `Blaues Logo: Banner nutzt automatisch die weisse Fassung (${JSON.stringify(r)})`);
  ok(r.emblem, "Spengler-Digital-Zeichen steht im Banner");
  await c2.close(); }
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
// Winkel = Innenwinkel im Dreieck; Masszahl folgt der Masslinie
c = await b.newContext({ viewport: { width: 1280, height: 800 } }); s = await c.newPage(); s.on("pageerror", (e) => pr.push(e.message));
await s.addInitScript(() => { localStorage.setItem("sdcad-doc-0.2", JSON.stringify({ objekt: "T", nr: "1", zaehler: 20, features: [{ id: "sk", typ: "skizze", name: "S", ebene: "XY", elemente: [{ id: 1, art: "linie", pts: [[0, 0], [100, 0], [60, 70]], geschlossen: true, layer: "0" }], bedingungen: [] }] })); });
await s.goto(basis + "?test"); await s.waitForTimeout(1500); await s.evaluate(() => window.sdcadTest.bearbeite("sk")); await s.waitForTimeout(900);
await s.click("#tAuswahl"); await s.waitForTimeout(300);
const lab = () => s.evaluate(() => [...document.querySelectorAll("#labels div")].filter((d) => !d.hidden && d.textContent).map((d) => { const r = d.getBoundingClientRect(); return { t: d.textContent, x: r.x + r.width / 2, y: r.y + r.height / 2 }; }));
let L = await lab(); const wk = L.filter((l) => /°$/.test(l.t)).map((l) => parseFloat(l.t)), sum = wk.reduce((a, b) => a + b, 0);
ok(wk.length === 3 && Math.abs(sum - 180) < 0.6, `Dreieck: Winkel sind die Innenwinkel (${wk.join(" + ")} = ${sum.toFixed(1)})`);
const l0 = L.find((l) => l.t === "100.0"); await s.mouse.move(l0.x, l0.y); await s.mouse.down(); await s.mouse.move(l0.x + 40, l0.y + 5, { steps: 4 }); await s.mouse.move(l0.x + 80, l0.y + 5, { steps: 4 }); await s.mouse.up(); await s.waitForTimeout(300);
L = await lab(); const l1 = L.find((l) => l.t === "100.0");
ok(Math.abs(l1.x - l0.x) < 3, `Masszahl bleibt auf der Masslinie (nur der Abstand ändert sich: ${l0.x | 0}→${l1.x | 0}, ${l0.y | 0}→${l1.y | 0})`);
await c.close();
ok(pr.length === 0, "keine Seitenfehler " + pr.join(" | "));
await b.close(); srv.close();
console.log(fehler ? `${fehler} Fehler` : "Startseite, Verlauf, Masslinien (App): alle Prüfungen bestanden"); process.exit(fehler ? 1 : 0);
