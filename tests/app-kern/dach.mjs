// App-Test Dach-Modus Phase 1: «Dach automatisch» legt Gebäude + Dach an, ändert live (Dachform, Neigung), prüft Mindestneigung; Einstellungen › Dach
// node tests/app-kern/dach.mjs (nach node build.mjs; Playwright/Chromium)
import { createServer } from "node:http"; import { readFileSync } from "node:fs"; import { createRequire } from "node:module"; import { extname, join, resolve } from "node:path";
const dist = resolve("dist"), { chromium } = createRequire(import.meta.url)("playwright");
const typ = { ".html": "text/html", ".js": "text/javascript", ".wasm": "application/wasm", ".json": "application/json" };
const srv = createServer((q, a) => { let p, d; try { p = q.url === "/" ? "index.html" : decodeURIComponent(q.url.slice(1).split("?")[0]); d = readFileSync(join(dist, p)); } catch { a.writeHead(404); a.end(); return; } a.writeHead(200, { "content-type": typ[extname(p)] ?? "application/octet-stream" }); a.end(d); }).listen(8797);
let fehler = 0; const ok = (c, t) => { console.log(`${c ? "✓" : "✗"} ${t}`); if (!c) fehler++; };
const b = await chromium.launch(), s = await b.newPage({ viewport: { width: 1280, height: 800 } }), pr = []; s.on("pageerror", (e) => pr.push(e.message));
await s.goto("http://localhost:8797/index.html?test"); await s.waitForTimeout(900);
ok(await s.evaluate(() => !!document.querySelector('[data-klapp="dach"] #wDachAuto')), "Register «Dach» mit «Dach automatisch» ist da");
await s.evaluate(() => document.getElementById("wDachAuto").click()); await s.waitForSelector("#d_neigung", { timeout: 4000 }); await s.waitForTimeout(500);
const feats = () => s.evaluate(() => window.sdcadTest.dok().features.map((f) => f.typ).filter((t) => t === "gebaeude" || t === "dach"));
ok((await feats()).join() === "gebaeude,dach", "Legt Gebäude und Dach an");
const info = () => s.textContent("#dInfo"), koerper = () => s.evaluate(() => window.sdcadTest.sichtbareKoerper());
await s.selectOption("#d_darstellung", "detail"); await s.waitForTimeout(600);
let n1 = await koerper(); ok(n1 >= 6, `Satteldach: ${n1} Körper (2 Dachflächen + Wände)`);
ok(/Dachfläche [\d.]+ m² · First 10\.6 m/.test(await info()), "Info: " + (await info()));
await s.selectOption("#d_form", "walm"); await s.waitForTimeout(500); const n2 = await koerper(); ok(/Grate [12]\d\.\d m/.test(await info()) && n2 >= 8, `Walmdach: Grate in der Info, ${n2} Körper`);
await s.fill("#d_neigung", "15"); await s.dispatchEvent("#d_neigung", "input"); await s.waitForTimeout(500);
ok(/Richtwert-Mindestneigung/.test(await info()), "15° ist zu flach für Schiebeziegel – Hinweis");
await s.selectOption("#d_deckung", "biber-doppel"); await s.fill("#d_neigung", "40"); await s.dispatchEvent("#d_neigung", "input"); await s.waitForTimeout(500);
ok(!/Mindestneigung/.test(await info()), "40° mit Biber doppelt: kein Hinweis");
await s.selectOption("#d_gform", "L"); await s.waitForTimeout(700);
ok(/Kehlen [\d.]+ m/.test(await info()), "L-Form (Walm): Kehle in der Info – " + (await info()));
await s.evaluate(() => document.getElementById("zoomAlles").click()); await s.waitForTimeout(400); await s.screenshot({ path: "/tmp/t/dach.png" });
await s.selectOption("#d_darstellung", "ziegel"); await s.waitForTimeout(12000);
const nZiegel = await s.evaluate(() => window.sdcadTest.koerperInfo?.().length ?? 0); ok(nZiegel > 0, "Darstellung mit einzelnen Ziegeln baut (" + nZiegel + " Körper)");
await s.selectOption("#d_darstellung", "detail"); await s.waitForTimeout(800);
await s.click("#dOk"); await s.waitForTimeout(400);
// Phase 2: einzelne Körper (Sparren, Dämmung, Unterdach, Latten, Deckung) + Holzliste im Werkstatt-Panel
const nDetail = await koerper(); ok(nDetail >= 11, `Aufbau detailliert: ${nDetail} Körper (je Art ein Netz)`);
await s.evaluate(() => { const t = window.sdcadTest, f = t.dok().features.find((x) => x.typ === "dach"); t.waehle?.(f.id); });
await s.evaluate(() => document.querySelector('[data-register="werkstatt"]')?.click()); await s.waitForTimeout(400);
const wk = await s.evaluate(() => document.getElementById("werkstatt").textContent);
ok(/Sparren/.test(wk) && /Dachlattung/.test(wk) && /Ziegel/.test(wk), "Werkstatt: Holzliste mit Sparren, Latten, Ziegel");
const d = await s.evaluate(() => window.sdcadTest.dok()); const dach = d.features.find((f) => f.typ === "dach");
ok(dach.form === "walm" && dach.neigung === 40 && dach.deckung === "biber-doppel" && d.dachVorlagen.deckungen.some((x) => x.id === "biber-doppel"), "Gespeichert; Deckung ins Projekt übernommen (Dachvorlagen)");
// Einstellungen › Dach
await s.evaluate(() => { document.getElementById("wEinst").click(); document.querySelector('[data-ereg="dach"]').click(); });
await s.waitForSelector('[data-dach="d:0:lattweite"]', { timeout: 15000 });
ok((await s.inputValue('[data-dach="d:0:lattweite"]')) === "340", "Einstellungen › Dach: Deckungen mit Lattweite (Richtwerte) sind einstellbar");
ok(pr.length === 0, "keine Seitenfehler " + pr.join(" | "));
await b.close(); srv.close();
console.log(fehler ? `${fehler} Fehler` : "Dach (App): alle Prüfungen bestanden"); process.exit(fehler ? 1 : 0);
