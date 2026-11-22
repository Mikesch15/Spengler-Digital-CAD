// App-Test Kanten-Werkzeug: Flansch/Umschlag/Baustein über das Feld «Kanten»: erst Blech, dann Kante; anhängen; Richtung; Layer-Leiste nur in der Skizze
// node tests/app-kern/kantenwz.mjs (nach node build.mjs; Playwright/Chromium)
import { createServer } from "node:http"; import { readFileSync } from "node:fs"; import { createRequire } from "node:module"; import { extname, join, resolve } from "node:path";
const dist = resolve("dist"), { chromium } = createRequire(import.meta.url)("playwright");
const typ = { ".html": "text/html", ".js": "text/javascript", ".wasm": "application/wasm", ".json": "application/json" };
const srv = createServer((q, a) => { let p, d; try { p = q.url === "/" ? "index.html" : decodeURIComponent(q.url.slice(1).split("?")[0]); d = readFileSync(join(dist, p)); } catch { a.writeHead(404); a.end(); return; } a.writeHead(200, { "content-type": typ[extname(p)] ?? "application/octet-stream" }); a.end(d); }).listen(+process.env.PORT || 8791);
let fehler = 0; const ok = (c, t) => { console.log(`${c ? "✓" : "✗"} ${t}`); if (!c) fehler++; };
const b = await chromium.launch(), s = await b.newPage({ viewport: { width: 1280, height: 800 } }), pr = []; s.on("pageerror", (e) => pr.push(e.message));
{ const f0 = s.fill.bind(s); s.fill = async (sel, v, o) => (o?.force ? s.evaluate(([q, w]) => { const e = document.querySelector(q); e.value = w; e.dispatchEvent(new Event("input", { bubbles: true })); }, [sel, v]) : f0(sel, v, o)); }
const pj = { objekt: "K", nr: "K-1", zaehler: 10, features: [
  { id: "sk", typ: "skizze", name: "Blech", ebene: "XY", elemente: [{ id: 1, art: "rechteck", a: [0, 0], b: [200, 100] }] },
  { id: "fl", typ: "flaeche", name: "Blech 1", skizze: "sk", material: "zink07", flaechen: [[10, 10]], kanten: {} }] };
await s.addInitScript((d) => { localStorage.setItem("sdcad-doc-0.2", JSON.stringify(d)); localStorage.setItem("sdcad-einstellungen", JSON.stringify({ materialien: [{ id: "zink07", name: "Z", t: 0.7, ri: 1, k: 0.4, dichte: 7.2 }] })); }, pj);
await s.goto("http://localhost:" + (process.env.PORT || 8791) + "/index.html?test"); await s.waitForTimeout(1200);
const uv = (p) => s.evaluate((u) => window.sdcadTest.schirmUV("XY", u), p);
const klick = async (p) => { const q = await uv(p); await s.mouse.move(q[0], q[1]); await s.waitForTimeout(120); await s.mouse.down(); await s.mouse.up(); await s.waitForTimeout(350); await s.evaluate(() => document.getElementById("kbOk")?.click()); await s.waitForTimeout(500); };
const kanten = () => s.evaluate(() => window.sdcadTest.dok().features.find((f) => f.id === "fl").kanten);
const werkzeug = async (name) => { await s.click('[data-klapp="kanten"] .klappknopf'); await s.waitForTimeout(150); await s.click(`[data-kantenwz="${name}"]`); await s.waitForTimeout(250); };
// ohne Werkzeug: Klick auf die Kante legt nichts an
await klick([100, 50]); await klick([100, 0]); ok(Object.keys(await kanten()).length === 0, "Ohne Werkzeug legt ein Klick auf die Kante nichts an");
await s.keyboard.press("Escape");
// Flansch: erst Blech, dann Kante
await s.evaluate(() => window.sdcadTest.waehleNichts?.()); await werkzeug("flansch");
ok(await s.isVisible("#kantenBar"), "Werkzeugleiste «Flansch» erscheint");
await klick([100, 50]); ok(/Kante/.test(await s.textContent("#kbText")), "Schritt 1: Blech angeklickt, jetzt Kante");
const q0 = await uv([100, 0]); await s.mouse.move(q0[0], q0[1] + 1); await s.waitForTimeout(250);
ok((await s.evaluate(() => window.sdcadTest.kantenAn())).includes("0:0"), "Kante unter dem Zeiger leuchtet auf");
await klick([100, 0]); let k = await kanten(); ok(k["0:0"]?.werkzeug?.typ === "flansch", "Schritt 2: Kante angeklickt → Flansch an Kante 1");
const feats = () => s.evaluate(() => window.sdcadTest.dok().features.filter((f) => f.typ === "kante"));
ok((await feats()).length === 1 && /Flansch K1/.test(await s.textContent("#zeit")), "Flansch steht als Schritt «Flansch K1» in der Zeitleiste");
// Umschlag an dieselbe Kante: anhängen
await werkzeug("umschlag"); await klick([100, 0]); k = await kanten();
ok(typeof k["0:0"]?.folge === "string" && /^90 .* U\+ /.test(k["0:0"].folge), `Umschlag an Flansch angehängt: «${k["0:0"]?.folge}»`);
// Richtung umkehren im Werkzeug: Flansch nach hinten an Kante 3 (oben)
await s.keyboard.press("Escape"); await werkzeug("flansch"); await s.click("#kbRichtung"); await klick([100, 100]); k = await kanten();
// live: Richtung des eben angelegten Flanschs im Werkzeug umschalten
await s.click("#kbRichtung"); await s.waitForTimeout(300); k = await kanten(); ok(k["0:2"]?.werkzeug?.seite === 1, "Richtung-Schalter kehrt den eben angelegten Flansch sofort um");
await s.click("#kbRichtung"); await s.waitForTimeout(300);
// live: Länge im Werkzeug ändert den eben angelegten Flansch
await s.fill("#kbLaenge", "40"); await s.waitForTimeout(300); k = await kanten(); ok(k["0:2"]?.werkzeug?.laenge === 40, "Länge im Werkzeug ändert den Flansch sofort");
ok(k["0:2"]?.werkzeug?.seite === -1, "Richtung «nach hinten» gilt für den neuen Flansch");
// bestehende Kante umkehren (Dialog)
await s.keyboard.press("Escape"); await s.evaluate(() => window.sdcadTest.bearbeite("fl")); await s.waitForSelector('[data-rev="0:2"]', { timeout: 4000 });
await s.click('[data-rev="0:2"]'); await s.waitForTimeout(300); k = await kanten(); ok(k["0:2"]?.werkzeug?.seite === 1, "«⇅ Richtung» im Dialog kehrt die Kante um");
await s.click("#dOk"); await s.waitForTimeout(300);
// Schritt in der Zeitleiste bearbeiten: Dialog wirkt live
const id = (await feats()).find((f) => f.key === "0:2").id; await s.evaluate((i) => window.sdcadTest.bearbeite(i), id); await s.waitForSelector("#d_laenge", { state: "attached", timeout: 4000 });
await s.fill("#d_laenge", "55", { force: true }); await s.waitForTimeout(300); k = await kanten(); ok(k["0:2"]?.werkzeug?.laenge === 55, "Dialog des Schritts: Länge 55 wirkt sofort am Blech");
ok((await s.evaluate(() => window.sdcadTest.kantenAn())).includes("0:2"), "Im Dialog leuchtet die Kante des Schritts");
await s.click("#dOk"); await s.waitForTimeout(200);
ok(!(await s.isVisible("#layerBox")), "Layer-Leiste ist ohne aktive Skizze nicht da");
await s.evaluate(() => document.getElementById("w2D").click()); await s.waitForTimeout(700); ok(await s.isVisible("#layerBox"), "Layer-Leiste erscheint in der aktiven Skizze");
ok(pr.length === 0, "keine Seitenfehler " + pr.join(" | "));
await b.close(); srv.close();
console.log(fehler ? `${fehler} Fehler` : "Kanten-Werkzeug: alle Prüfungen bestanden"); process.exit(fehler ? 1 : 0);
