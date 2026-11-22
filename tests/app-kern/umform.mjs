// App-Test «Rundblech beurteilen» und Umformgrenzen im Material
// node tests/app-kern/umform.mjs (nach node build.mjs; Playwright/Chromium)
import { createServer } from "node:http";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { extname, join, resolve } from "node:path";
const dist = resolve("dist"), { chromium } = createRequire(import.meta.url)("playwright");
const typ = { ".html": "text/html", ".js": "text/javascript", ".wasm": "application/wasm", ".json": "application/json" };
const srv = createServer((q, a) => { let p, d; try { p = q.url === "/" ? "index.html" : decodeURIComponent(q.url.slice(1).split("?")[0]); d = readFileSync(join(dist, p)); } catch { a.writeHead(404); a.end(); return; } a.writeHead(200, { "content-type": typ[extname(p)] ?? "application/octet-stream" }); a.end(d); }).listen(+process.env.PORT || 8771);
let fehler = 0; const ok = (b, t) => { console.log(`${b ? "✓" : "✗"} ${t}`); if (!b) fehler++; };
const b = await chromium.launch(), s = await (await b.newContext({ acceptDownloads: true })).newPage(), probleme = []; s.on("pageerror", (e) => probleme.push(e.message));
{ const f0 = s.fill.bind(s); s.fill = async (sel, v, o) => (o?.force ? s.evaluate(([q, w]) => { const e = document.querySelector(q); e.value = w; e.dispatchEvent(new Event("input", { bubbles: true })); }, [sel, v]) : f0(sel, v, o)); }
await s.addInitScript(() => { localStorage.setItem("sdcad-doc-0.2", JSON.stringify({ objekt: "U", nr: "U-1", zaehler: 5, features: [] }));
  localStorage.setItem("sdcad-einstellungen", JSON.stringify({ materialien: [{ id: "zink07", name: "Titanzink 0.70", t: 0.7, ri: 1.0, k: 0.4, dichte: 7.2 }] })); });
await s.goto("http://localhost:" + (process.env.PORT || 8771) + "/index.html?test"); await s.waitForTimeout(600);
await s.evaluate(() => document.getElementById("wUmform").click()); await s.waitForSelector("#dZusatz", { timeout: 4000 });
let t = await s.textContent("#dZusatz");
ok(/konstruierbar.*ja/.test(t) && /abwickelbar.*nein/.test(t) && /herstellbar.*nicht beurteilbar/.test(t) && /Stauchen \/ Schweifen \(Rand wird kürzer\)/.test(t) && /Rohling D 240\.0/.test(t), "Scheibe R100/h20: Empfehlung Stauchen, Rohling Ø240, herstellbar «nicht beurteilbar» ohne Grenzwert");
const [dl] = await Promise.all([s.waitForEvent("download", { timeout: 8000 }), s.click("#uDxf")]); const dxfText = readFileSync(await dl.path(), "utf8");
ok(/CIRCLE/.test(dxfText) && /BIEGELINIE/.test(dxfText) && /Scheibe/.test(dxfText), "Zuschnitt als DXF gespeichert (Kreis + Biegelinie)");
await s.selectOption("#d_fall", "kegel", { force: true }); await s.waitForTimeout(300);
t = await s.textContent("#dZusatz"); ok(/abwickelbar.*ja/.test(t) && /herstellbar.*ja/.test(t) && /Kegelstumpf/.test(t), "Kegelstumpf: abwickelbar und herstellbar");
await s.selectOption("#d_fall", "kragen", { force: true }); await s.waitForTimeout(300); await s.fill("#d_r", "10", { force: true }); await s.fill("#d_h", "15", { force: true }); await s.waitForTimeout(200);
t = await s.textContent("#dZusatz"); ok(/herstellbar.*nein/.test(t) && /nicht ohne Einschnitte/.test(t), "Kragen höher als Loch: nicht herstellbar, keine Einschnitte");
await s.click("#dAbbrechen");
// Grenzwert im Material eintragen → herstellbar
await s.evaluate(() => { document.getElementById("wEinst").click(); });
await s.fill('[data-k="umSchr"]', "20"); await s.click("#eOk"); await s.waitForTimeout(300);
await s.evaluate(() => document.getElementById("wUmform").click()); await s.waitForSelector("#dZusatz"); await s.selectOption("#d_fall", "scheibe", { force: true }); await s.waitForTimeout(300); await s.fill("#d_r", "100", { force: true }); await s.fill("#d_h", "20", { force: true }); await s.waitForTimeout(200);
t = await s.textContent("#dZusatz"); ok(/herstellbar.*ja/.test(t) && /Grenzwert 20\.0 %/.test(t), "Mit eigenem Grenzwert 20 % → herstellbar (Quelle genannt)");
await s.evaluate(() => { document.getElementById("wEinst").click(); document.querySelector('[data-ereg="programm"]').click(); });
await s.click("#eSelbstTest"); const st = await s.textContent("#eSelbst");
ok(/Alle 6 Prüfungen bestanden/.test(st), "Selbsttest im Programm-Register: " + st.slice(0, 50));
ok(probleme.length === 0, "keine Seitenfehler " + probleme.join(" | "));
await b.close(); srv.close();
console.log(fehler ? `${fehler} Fehler` : "Rundblech beurteilen: alle Prüfungen bestanden"); process.exit(fehler ? 1 : 0);
