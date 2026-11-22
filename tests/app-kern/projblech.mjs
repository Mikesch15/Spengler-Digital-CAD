// App-Test Projektion: einzelne Fläche/Kante, X = Hilfslinie
// node tests/app-kern/projflaeche.mjs (nach node build.mjs; Playwright/Chromium)
import { createServer } from "node:http"; import { readFileSync } from "node:fs"; import { createRequire } from "node:module"; import { extname, join, resolve } from "node:path";
const dist = resolve("dist"), { chromium } = createRequire(import.meta.url)("playwright");
const typ = { ".html": "text/html", ".js": "text/javascript", ".wasm": "application/wasm", ".json": "application/json" };
const srv = createServer((q, a) => { let p, d; try { p = q.url === "/" ? "index.html" : decodeURIComponent(q.url.slice(1).split("?")[0]); d = readFileSync(join(dist, p)); } catch { a.writeHead(404); a.end(); return; } a.writeHead(200, { "content-type": typ[extname(p)] ?? "application/octet-stream" }); a.end(d); }).listen(+process.env.PORT || 8797);
let fehler = 0; const ok = (c, t) => { console.log(`${c ? "✓" : "✗"} ${t}`); if (!c) fehler++; };
const b = await chromium.launch(), s = await b.newPage({ viewport: { width: 1280, height: 800 } }), pr = []; s.on("pageerror", (e) => pr.push(e.message));
await s.addInitScript(() => { localStorage.setItem("sdcad-einstellungen", JSON.stringify({ materialien: [{ id: "zink07", name: "Z", t: 0.7, ri: 1, k: 0.4, dichte: 7.2 }] })); localStorage.setItem("sdcad-doc-0.2", JSON.stringify({ objekt: "T", nr: "1", zaehler: 20, features: [
  { id: "sk", typ: "skizze", name: "Rechteck", ebene: "XY", elemente: [{ id: 1, art: "rechteck", a: [0, 0], b: [200, 120] }], bedingungen: [] },
  { id: "fl", typ: "flaeche", name: "Blech 1", skizze: "sk", material: "zink07", flaechen: [[10, 10]], kanten: { "0:0": "ortgang" } },
  { id: "s2", typ: "skizze", name: "Skizze 2", ebene: "XZ", elemente: [], bedingungen: [] }] })); });
await s.goto("http://localhost:" + (process.env.PORT || 8797) + "/index.html?test"); await s.waitForTimeout(1500);
await s.evaluate(() => window.sdcadTest.bearbeite("s2")); await s.waitForTimeout(2000);
await s.evaluate(() => document.getElementById("zoomAlles").click()); await s.waitForTimeout(300);
await s.evaluate(() => document.getElementById("tProjizieren").click()); await s.waitForTimeout(200);
const els = () => s.evaluate(() => window.sdcadTest.dok().features.find((f) => f.id === "s2").elemente);
const ok2 = (c, t) => ok(c, t);
// Aufkantung (Fläche des Blechs) anklicken: Hover-Leuchten, Wahl, erst OK projiziert
const p = await s.evaluate(() => window.sdcadTest.schirm([100, 2, 12]));
await s.mouse.move(p[0], p[1]); await s.waitForTimeout(300);
await s.mouse.click(p[0], p[1]); await s.waitForTimeout(400);
ok2((await els()).length === 0 && (await s.evaluate(() => document.getElementById("pbOk").textContent)).includes("(1)"), "Blechfläche gewählt, noch nichts projiziert");
await s.evaluate(() => document.getElementById("pbOk").click()); await s.waitForTimeout(400);
const e = await els(); ok2(e.length === 4 && e.every((x) => x.projiziert), "Fläche der Aufkantung projiziert (4 Kanten) (" + e.length + " Elemente)");
// Mehrere Kanten wählen: zwei Blechkanten, dann OK
const k1 = await s.evaluate(() => window.sdcadTest.schirm([0, 2, 12])), k2 = await s.evaluate(() => window.sdcadTest.schirm([200, 2, 12]));
await s.mouse.click(k1[0], k1[1]); await s.waitForTimeout(250); await s.mouse.click(k2[0], k2[1]); await s.waitForTimeout(250);
const t = await s.evaluate(() => document.getElementById("pbOk").textContent); ok2(/\(\d\)/.test(t), "Mehrere Kanten/Flächen lassen sich nacheinander wählen (" + t + ")");
await s.keyboard.press("Escape"); await s.waitForTimeout(200);
ok2((await s.evaluate(() => document.getElementById("pbOk").disabled)), "Esc verwirft die Wahl");
// Biegung (gebogene Fläche) lässt sich ebenfalls als ganze Fläche wählen: langer Streifen über die ganze Länge
await s.evaluate(() => { const f = window.sdcadTest.dok().features.find((x) => x.id === "s2"); f.elemente.length = 0; });
const pb = await s.evaluate(() => window.sdcadTest.schirm([100, 5, 0.9]));
await s.mouse.move(pb[0], pb[1]); await s.waitForTimeout(300); await s.mouse.click(pb[0], pb[1]); await s.waitForTimeout(300);
await s.evaluate(() => document.getElementById("pbOk").click()); await s.waitForTimeout(400);
const eb = await els(); const lang = eb.filter((x) => x.pts && Math.hypot(x.pts[1][0] - x.pts[0][0], x.pts[1][1] - x.pts[0][1]) > 150);
ok2(eb.length >= 2 && lang.length >= 1, "Biegung als ganze Fläche gewählt: Längskanten über die ganze Blechlänge (" + eb.length + " Elemente, " + lang.length + " lang)");
ok(pr.length === 0, "keine Seitenfehler " + pr.join(" | "));
await b.close(); srv.close();
console.log(fehler ? `${fehler} Fehler` : "Projektion Blech (App): alle Prüfungen bestanden"); process.exit(fehler ? 1 : 0);
