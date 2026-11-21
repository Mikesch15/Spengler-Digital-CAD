// App-Test Dach-Modus Phase 3/5: Grundriss aus Skizze (konvex, Giebelkanten) und Dachbleche (Spengler-Brücke) mit Abwicklung
// node tests/app-kern/dachbleche.mjs (nach node build.mjs; Playwright/Chromium)
import { createServer } from "node:http"; import { readFileSync } from "node:fs"; import { createRequire } from "node:module"; import { extname, join, resolve } from "node:path";
const dist = resolve("dist"), { chromium } = createRequire(import.meta.url)("playwright");
const typ = { ".html": "text/html", ".js": "text/javascript", ".wasm": "application/wasm", ".json": "application/json" };
const srv = createServer((q, a) => { let p, d; try { p = q.url === "/" ? "index.html" : decodeURIComponent(q.url.slice(1).split("?")[0]); d = readFileSync(join(dist, p)); } catch { a.writeHead(404); a.end(); return; } a.writeHead(200, { "content-type": typ[extname(p)] ?? "application/octet-stream" }); a.end(d); }).listen(8797);
let fehler = 0; const ok = (c, t) => { console.log(`${c ? "✓" : "✗"} ${t}`); if (!c) fehler++; };
const b = await chromium.launch(), s = await b.newPage({ viewport: { width: 1280, height: 800 } }), pr = []; s.on("pageerror", (e) => pr.push(e.message));
{ const f0 = s.fill.bind(s); s.fill = async (sel, v, o) => (o?.force ? s.evaluate(([q, w]) => { const e = document.querySelector(q); e.value = w; e.dispatchEvent(new Event("input", { bubbles: true })); }, [sel, v]) : f0(sel, v, o)); }
await s.addInitScript(() => localStorage.setItem("sdcad-doc-0.2", JSON.stringify({ objekt: "Test", nr: "X", zaehler: 5, features: [{ id: "sk", typ: "skizze", name: "Grundriss", ebene: "XZ", elemente: [{ id: 1, art: "rechteck", a: [0, 0], b: [12000, 7000] }] }] })));
await s.goto("http://localhost:8797/index.html?test"); await s.waitForTimeout(900);
await s.evaluate(() => document.getElementById("wDachAuto").click()); await s.waitForSelector("#d_neigung", { state: "attached", timeout: 4000 });
await s.selectOption("#d_gform", "skizze", { force: true }); await s.selectOption("#d_gskizze", "sk", { force: true }); await s.waitForTimeout(600);
const info = () => s.textContent("#dInfo");
ok(/Dachfläche [\d.]+ m²/.test(await info()), "Grundriss aus Skizze: " + (await info()));
await s.selectOption("#d_form", "sattel", { force: true }); await s.fill("#d_giebel", "2,4", { force: true }); await s.dispatchEvent("#d_giebel", "input"); await s.waitForTimeout(600);
ok(/First 12\.\d m/.test(await info()), "Giebelkanten 2,4: Satteldach mit First – " + (await info()));
await s.click("#dOk"); await s.waitForTimeout(400);
// Dachbleche
await s.evaluate(() => document.getElementById("wDachBleche").click()); await s.waitForSelector("#d_a_traufe", { state: "attached", timeout: 4000 }); await s.waitForTimeout(500);
ok(/Traufblech/.test(await info()) && /Firstblech/.test(await info()) && /Ortgangblech/.test(await info()), "Dachbleche: " + (await info()));
await s.click("#dOk"); await s.waitForTimeout(400);
await s.evaluate(() => document.getElementById("zoomAlles").click()); await s.waitForTimeout(500); await s.screenshot({ path: "/tmp/t/dachbleche.png" });
const id = await s.evaluate(() => window.sdcadTest.dok().features.find((f) => f.typ === "dachbleche")?.id);
ok(!!id, "Feature Dachbleche angelegt");
await s.evaluate((i) => window.sdcadTest.waehle(i), id); await s.waitForTimeout(300);
ok(/Blechsorten/.test(await s.textContent("#werkstatt")), "Werkstatt: Liste der Bleche");
await s.evaluate((i) => window.sdcadTest.waehle(i + ":0"), id); await s.waitForTimeout(300);
const w = await s.textContent("#werkstatt"); ok(/Traufblech/.test(w) && /Biegungen/.test(w), "Einzelnes Blech: Abwicklung mit Biegungen");
// Phase 4: Dachfenster und Kamin
await s.evaluate(() => document.getElementById("wDachElement").click()); await s.waitForSelector("#d_velux", { state: "attached", timeout: 4000 }); await s.waitForTimeout(400);
ok(/Öffnung 780 × 978/.test(await info()), "Dachfenster MK04 (Velux): " + (await info()));
await s.click("#dOk"); await s.waitForTimeout(400);
await s.evaluate(() => document.getElementById("wDachElement").click()); await s.waitForSelector("#d_velux", { state: "attached", timeout: 4000 });
await s.selectOption("#d_art", "kamin", { force: true }); await s.selectOption("#d_velux", "", { force: true }); await s.fill("#d_b", "500", { force: true }); await s.dispatchEvent("#d_b", "input"); await s.fill("#d_h", "500", { force: true }); await s.dispatchEvent("#d_h", "input");
await s.fill("#d_x", "9000", { force: true }); await s.dispatchEvent("#d_x", "input"); await s.fill("#d_y", "1200", { force: true }); await s.dispatchEvent("#d_y", "input"); await s.waitForTimeout(500);
ok(/Öffnung 500 × 500/.test(await info()), "Kamin 500 × 500: " + (await info()));
await s.click("#dOk"); await s.waitForTimeout(400);
const dachId = await s.evaluate(() => window.sdcadTest.dok().features.find((f) => f.typ === "dach")?.id);
await s.evaluate((i) => window.sdcadTest.waehle(i), dachId); await s.waitForTimeout(300);
await s.evaluate(() => document.getElementById("zoomAlles").click()); await s.waitForTimeout(500); await s.screenshot({ path: "/tmp/t/elemente.png" });
ok(/Wechsel/.test(await s.textContent("#werkstatt")), "Holzliste: Wechsel für Fenster und Kamin");
await s.evaluate((i) => window.sdcadTest.waehle(i), id); await s.waitForTimeout(300);
ok(/Kaminanschluss/.test(await s.textContent("#werkstatt")), "Dachbleche: Kaminanschluss");
// Lukarne
await s.evaluate(() => document.getElementById("wLukarne").click()); await s.waitForSelector("#d_bu", { state: "attached", timeout: 4000 }); await s.waitForTimeout(500);
ok(/Öffnung [\d.]+ m²/.test(await info()), "Lukarne (Sattel): " + (await info()));
await s.selectOption("#d_art", "schlepp", { force: true }); await s.fill("#d_neigung", "15", { force: true }); await s.dispatchEvent("#d_neigung", "input"); await s.waitForTimeout(500);
ok(/Öffnung [\d.]+ m²/.test(await info()), "Lukarne (Schlepp): " + (await info()));
await s.selectOption("#d_art", "sattel", { force: true }); await s.waitForTimeout(400);
// Aufmass: Front und Seitenwände einzeln (links/rechts unabhängig), Winkel und Trauflänge wie in der Massaufnahme «Lukarne Seitenwand»
await s.fill("#d_wL", "95", { force: true }); await s.dispatchEvent("#d_wL", "input"); await s.fill("#d_lR", "1800", { force: true }); await s.dispatchEvent("#d_lR", "input"); await s.fill("#d_bo", "1700", { force: true }); await s.dispatchEvent("#d_bo", "input"); await s.waitForTimeout(500);
ok(/Links: Schräge \d+, Tiefe \d+, Fläche [\d.]+ m² · Rechts: Schräge/.test(await info()), "Lukarne Aufmass: Seitenwände einzeln berechnet – " + (await info()).slice(0, 150));
await s.selectOption("#d_dachQuelle", "skizzen", { force: true }); await s.waitForSelector("#d_bu", { state: "attached", timeout: 60000 }); await s.waitForTimeout(800);
{ const dd = await s.evaluate(() => window.sdcadTest.dok()), lk = dd.features.find((f) => f.typ === "lukarne"); ok(lk.dachQuelle === "skizzen" && lk.dachSkizzen.length === 2 && dd.features.findIndex((f) => f.id === lk.dachSkizzen[0]) < dd.features.findIndex((f) => f.typ === "dach"), "Gaubendach in 2 Skizzen auf Ebenen umgewandelt (vor dem Dach)"); }
ok(/Öffnung [\d.]+ m²/.test(await info()), "Lukarne mit gezeichnetem Gaubendach rechnet weiter – " + (await info()).slice(0, 90));
await s.click("#dOk"); await s.waitForTimeout(500);
await s.evaluate(() => document.getElementById("zoomAlles").click()); await s.waitForTimeout(500); await s.screenshot({ path: "/tmp/t/lukarne.png" });
await s.evaluate((i) => window.sdcadTest.waehle(i), id); await s.waitForTimeout(300);
ok(/Lukarne Kehle/.test(await s.textContent("#werkstatt")) && /Wangenanschluss/.test(await s.textContent("#werkstatt")), "Dachbleche: Lukarne Kehle und Wangenanschluss");
// Eindeckung: Ziegel einzeln, nach den Blechen
await s.evaluate(() => document.getElementById("wEindeckung").click()); await s.waitForSelector("#d_dach", { state: "attached", timeout: 90000 }); await s.waitForTimeout(2500);
ok(/Ziegel \d+ Stk\. \(davon \d+ geschnitten\)/.test(await info()), "Eindeckung: " + (await info()));
await s.click("#dOk"); await s.waitForTimeout(500);
const eid = await s.evaluate(() => window.sdcadTest.dok().features.find((f) => f.typ === "eindeckung")?.id);
await s.evaluate((i) => window.sdcadTest.waehle(i), eid); await s.waitForTimeout(300);
ok(/Ziegel gezeichnet/.test(await s.textContent("#werkstatt")) && /geschnitten/.test(await s.textContent("#werkstatt")), "Werkstatt: Ziegelzahl und geschnittene Ziegel");
const ml = await s.evaluate((i) => window.sdcadTest.maxLinie(i), eid); ok(ml.n > 500 && ml.max < 500 && ml.bad === 0, `Ziegel-Netz sauber (${ml.n} Kantenstücke, längste ${ml.max.toFixed(0)} mm)`);
// Phase 6: Details aus dem Dach und Dachaufsicht im Plan
await s.evaluate(() => document.getElementById("wPlan").click()); await s.waitForTimeout(800);
await s.evaluate(() => document.getElementById("plNeuDetail").click()); await s.waitForTimeout(300);
const dm = await s.textContent("#plDetailMenue"); ok(/Traufe 30°|Traufe 35°/.test(dm) && /Ortgang/.test(dm) && /First/.test(dm), "Plan › Detail: Dachaufbau-Schnitte – " + dm.replace(/\s+/g, " ").slice(0, 160));
await s.evaluate(() => document.querySelector("#plDetailMenue [data-detail^='dach|']").click()); await s.waitForTimeout(500);
ok(await s.evaluate(() => [...document.querySelectorAll("svg")].some((v) => /Dachlattung|Unterdach|Sparren/.test(v.textContent))), "Detail «Traufe» mit Schichten im Plan");
await s.evaluate(() => document.getElementById("plNeuAnsicht").click()); await s.waitForTimeout(300);
ok(/Dachaufsicht/.test(await s.textContent("#plAnsichtMenue")), "Plan › Ansicht: Dachaufsicht wählbar");
await s.evaluate(() => document.querySelector("#plAnsichtMenue [data-plskizze^='dach:']").click()); await s.waitForTimeout(600);
await s.screenshot({ path: "/tmp/t/plan.png" });
ok(await s.evaluate(() => (document.querySelector("#plan, #planBlatt, [id^=plan]")?.innerHTML.length ?? 0) > 500), "Dachaufsicht gezeichnet");
ok(pr.length === 0, "keine Seitenfehler " + pr.join(" | "));
await b.close(); srv.close();
console.log(fehler ? `${fehler} Fehler` : "Dachbleche (App): alle Prüfungen bestanden"); process.exit(fehler ? 1 : 0);
