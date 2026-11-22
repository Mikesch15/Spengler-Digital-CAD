// App-Test Extrusion zwei Seiten verschieden lang
// node tests/app-kern/zweiseitig.mjs (nach node build.mjs; Playwright/Chromium)
import { createServer } from "node:http"; import { readFileSync } from "node:fs"; import { createRequire } from "node:module"; import { extname, join, resolve } from "node:path";
const dist = resolve("dist"), { chromium } = createRequire(import.meta.url)("playwright");
const typ = { ".html": "text/html", ".js": "text/javascript", ".wasm": "application/wasm", ".json": "application/json" };
const srv = createServer((q, a) => { let p, d; try { p = q.url === "/" ? "index.html" : decodeURIComponent(q.url.slice(1).split("?")[0]); d = readFileSync(join(dist, p)); } catch { a.writeHead(404); a.end(); return; } a.writeHead(200, { "content-type": typ[extname(p)] ?? "application/octet-stream" }); a.end(d); }).listen(+process.env.PORT || 8797);
let fehler = 0; const ok = (c, t) => { console.log(`${c ? "✓" : "✗"} ${t}`); if (!c) fehler++; };
const b = await chromium.launch(), s = await b.newPage({ viewport: { width: 1280, height: 800 } }), pr = []; s.on("pageerror", (e) => pr.push(e.message));
await s.addInitScript(() => localStorage.setItem("sdcad-doc-0.2", JSON.stringify({ objekt: "T", nr: "1", zaehler: 20, features: [
  { id: "s1", typ: "skizze", name: "Skizze 1", ebene: "XY", elemente: [{ id: 1, art: "rechteck", a: [0, 0], b: [50, 40] }], bedingungen: [] },
  { id: "e1", typ: "extrusion", name: "Extrusion 1", skizze: "s1", abstand: 100, richtung: "zwei", abstand2: 30, vorgang: "neu" }] })));
await s.goto("http://localhost:" + (process.env.PORT || 8797) + "/index.html?test"); await s.waitForTimeout(1500);
const k = await s.evaluate(() => JSON.stringify(window.sdcadTest.koerper()).slice(0, 400)); 
const kk = JSON.parse(k).length ? await s.evaluate(() => window.sdcadTest.koerper()) : [];
const e = kk.find((x) => x.fid === "e1");
ok(e && e.volumen === 260000, "Volumen 50 × 40 × (100 + 30) = 260000: " + e?.volumen);
const ax = e ? [0, 1, 2].filter((i) => Math.abs(e.max[i] - e.min[i] - 130) < 0.01) : [];
ok(ax.length === 1 && Math.abs(e.max[ax[0]] - 100) < 0.01 && Math.abs(e.min[ax[0]] + 30) < 0.01, "reicht 100 vorwärts und 30 rückwärts: " + JSON.stringify([e?.min, e?.max]));
// Dialog: Gegenrichtung-Feld nur bei «Zwei Seiten»
await s.evaluate(() => window.sdcadTest.bearbeite("e1")); await s.waitForSelector("#d_abstand2", { state: "attached", timeout: 4000 });
ok(await s.inputValue("#d_abstand2") === "30", "Dialog zeigt Abstand 2 = 30");
await s.selectOption("#d_richtung", "eine", { force: true }); await s.waitForTimeout(400);
ok(await s.evaluate(() => !document.getElementById("d_abstand2")), "bei «Eine Seite» verschwindet Abstand 2");
// Pfeile an beiden Enden; negative Eingabe extrudiert bei einer Seite in die Gegenrichtung
await s.evaluate(() => document.getElementById("zoomAlles").click()); await s.waitForTimeout(300);
let g = await s.evaluate(() => window.sdcadTest.griffe()); ok(g.length === 2 && g.some((q) => q.feld === "abstand" && q.faktor === 1) && g.some((q) => q.feld === "abstand" && q.faktor === -1), "Eine Seite: zwei Pfeile (fern = +, nah = −): " + g.map((q) => q.feld + q.faktor).join(","));
await s.fill("#d_abstand", "-50", { force: true }); await s.waitForTimeout(500);
let e2 = (await s.evaluate(() => window.sdcadTest.koerper())).find((x) => x.fid === "e1");
ok(e2 && e2.volumen === 100000 && Math.abs(e2.min[2] + 50) < 0.01 && Math.abs(e2.max[2]) < 0.01, "Abstand −50 extrudiert 50 in die Gegenrichtung: " + JSON.stringify([e2?.volumen, e2?.min, e2?.max]));
g = await s.evaluate(() => window.sdcadTest.griffe()); ok(g.length === 2, "bei negativem Mass weiterhin zwei Pfeile");
const nah = g.find((q) => q.faktor === 1); // Pfeil am Fuss (nahes Ende) ziehen: Betrag wächst
const dx = nah.schirm.b[0] - nah.schirm.a[0], dy = nah.schirm.b[1] - nah.schirm.a[1], L = Math.hypot(dx, dy) || 1;
await s.mouse.move(nah.schirm.b[0], nah.schirm.b[1]); await s.mouse.down(); await s.mouse.move(nah.schirm.b[0] + dx / L * 25, nah.schirm.b[1] + dy / L * 25, { steps: 4 }); await s.mouse.up(); await s.waitForTimeout(400);
ok(+(await s.inputValue("#d_abstand")) > -50, "Nahen Pfeil nach aussen ziehen verkleinert den Betrag Richtung Null (" + await s.inputValue("#d_abstand") + ")");
await s.selectOption("#d_richtung", "zwei", { force: true }); await s.waitForTimeout(500);
g = await s.evaluate(() => window.sdcadTest.griffe()); ok(g.length === 2 && g.some((q) => q.feld === "abstand2"), "Zwei Seiten: je ein Pfeil für Abstand 1 und Abstand 2");
ok(pr.length === 0, "keine Seitenfehler " + pr.join(" | "));
await b.close(); srv.close();
console.log(fehler ? `${fehler} Fehler` : "Zweiseitig (App): alle Prüfungen bestanden"); process.exit(fehler ? 1 : 0);
