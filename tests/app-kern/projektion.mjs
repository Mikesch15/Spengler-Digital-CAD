// App-Test Skizze: Projizieren von Linien anderer Skizzen
// node tests/app-kern/projektion.mjs (nach node build.mjs; Playwright/Chromium)
import { createServer } from "node:http"; import { readFileSync } from "node:fs"; import { createRequire } from "node:module"; import { extname, join, resolve } from "node:path";
const dist = resolve("dist"), { chromium } = createRequire(import.meta.url)("playwright");
const typ = { ".html": "text/html", ".js": "text/javascript", ".wasm": "application/wasm", ".json": "application/json" };
const srv = createServer((q, a) => { let p, d; try { p = q.url === "/" ? "index.html" : decodeURIComponent(q.url.slice(1).split("?")[0]); d = readFileSync(join(dist, p)); } catch { a.writeHead(404); a.end(); return; } a.writeHead(200, { "content-type": typ[extname(p)] ?? "application/octet-stream" }); a.end(d); }).listen(+process.env.PORT || 8797);
let fehler = 0; const ok = (c, t) => { console.log(`${c ? "✓" : "✗"} ${t}`); if (!c) fehler++; };
const b = await chromium.launch(), s = await b.newPage({ viewport: { width: 1280, height: 800 } }), pr = []; s.on("pageerror", (e) => pr.push(e.message));
await s.addInitScript(() => localStorage.setItem("sdcad-doc-0.2", JSON.stringify({ objekt: "T", nr: "1", zaehler: 20, features: [
  { id: "s1", typ: "skizze", name: "Skizze 1", ebene: "XY", elemente: [{ id: 1, art: "rechteck", a: [0, 0], b: [100, 60] }, { id: 2, art: "kreis", c: [50, 30], r: 15 }, { id: 3, art: "linie", pts: [[0, 80], [100, 90]] }], bedingungen: [] },
  { id: "s2", typ: "skizze", name: "Skizze 2", ebene: "XZ", elemente: [], bedingungen: [] }, { id: "s3", typ: "skizze", name: "Skizze 3", ebene: "XY", elemente: [], bedingungen: [] }] })));
await s.goto("http://localhost:" + (process.env.PORT || 8797) + "/index.html?test"); await s.waitForTimeout(1200);
await s.evaluate(() => document.getElementById("zoomAlles").click()); await s.waitForTimeout(300);
await s.evaluate(() => window.sdcadTest.bearbeite("s2")); await s.waitForTimeout(2000);
const eltn = () => s.evaluate(() => window.sdcadTest.dok().features.find((f) => f.id === "s2").elemente.length);
ok(await eltn() === 0, "Skizze 2 ist offen und leer");
await s.evaluate(() => document.getElementById("tProjizieren").click()); await s.waitForTimeout(200);
// Rechteckkante von Skizze 1 (Welt: x = u, y = v auf der Ebene XY): untere Kante bei y = 0
const p = await s.evaluate(() => window.sdcadTest.schirm([50, 0, 0]));
await s.mouse.click(p[0], p[1]); await s.waitForTimeout(400);
ok(await eltn() === 0 && (await s.evaluate(() => document.getElementById("pbOk").textContent)).includes("(1)"), "Klick wählt nur (orange) – projiziert wird erst mit OK");
await s.evaluate(() => document.getElementById("pbOk").click()); await s.waitForTimeout(400);
const n1 = await eltn(); ok(n1 >= 1, "Linie einer anderen Skizze (Rechteck) projiziert: " + n1 + " Element(e)");
ok(await s.evaluate(() => { const l = window.sdcadTest.dok().features.find((f) => f.id === "s2").elemente; return l.length === 1 && l[0].pts?.length === 2; }), "Rechteck: nur die angeklickte Kante wird projiziert (eine Strecke)");
const pk = await s.evaluate(() => window.sdcadTest.schirm([50, 85, 0]));
await s.mouse.click(pk[0], pk[1]); await s.waitForTimeout(400); await s.evaluate(() => document.getElementById("pbOk").click()); await s.waitForTimeout(400);
const n2 = await eltn(); ok(n2 > n1, "Einzelne Linie projiziert: " + n2 + " Elemente");
const pc = await s.evaluate(() => window.sdcadTest.schirm([65, 30, 0]));
await s.mouse.click(pc[0], pc[1]); await s.waitForTimeout(400); await s.evaluate(() => document.getElementById("pbOk").click()); await s.waitForTimeout(400);
const n3 = await eltn(); ok(n3 > n2, "Kreis einer anderen Skizze projiziert: " + n3 + " Elemente");
// Parallele Ebene (XY → XY): Kreis bleibt Kreis; Umschalt + Klick projiziert die ganze Skizze
await s.evaluate(() => window.sdcadTest.beendeSkizze()); await s.waitForTimeout(300);
await s.evaluate(() => window.sdcadTest.bearbeite("s3")); await s.waitForTimeout(2000); await s.evaluate(() => document.getElementById("tProjizieren").click()); await s.waitForTimeout(200);
const els3 = () => s.evaluate(() => window.sdcadTest.dok().features.find((f) => f.id === "s3").elemente);
const pc3 = await s.evaluate(() => window.sdcadTest.schirm([65, 30, 0])); await s.mouse.click(pc3[0], pc3[1]); await s.waitForTimeout(400); await s.evaluate(() => document.getElementById("pbOk").click()); await s.waitForTimeout(400);
let e3 = await els3(); ok(e3.length === 1 && e3[0].art === "kreis" && Math.abs(e3[0].r - 15) < 1e-6 && e3[0].projiziert, "Kreis einer parallelen Skizze bleibt ein Kreis (r = " + e3[0]?.r + ")");
const pr3 = await s.evaluate(() => window.sdcadTest.schirm([50, 85, 0]));
await s.keyboard.down("Shift"); await s.mouse.click(pr3[0], pr3[1]); await s.keyboard.up("Shift"); await s.waitForTimeout(500); await s.evaluate(() => document.getElementById("pbOk").click()); await s.waitForTimeout(400);
e3 = await els3(); ok(e3.length >= 4 && e3.filter((e) => e.art === "kreis").length === 2, `Umschalt + Klick: ganze Skizze projiziert (${e3.length} Elemente, darunter 2 Kreise)`);
ok(pr.length === 0, "keine Seitenfehler " + pr.join(" | "));
await b.close(); srv.close();
console.log(fehler ? `${fehler} Fehler` : "Projektion (App): alle Prüfungen bestanden"); process.exit(fehler ? 1 : 0);
