// App-Test Datei-Reiter: Öffnen/Speichern mit Cloud- und PC-Wahl, DXF-Import über Datei › Import, Drucken in der Android-Hülle
import { createServer } from "node:http"; import { readFileSync } from "node:fs"; import { createRequire } from "node:module"; import { extname, join, resolve } from "node:path";
const dist = resolve("dist"), { chromium } = createRequire(import.meta.url)("playwright");
const typ = { ".html": "text/html", ".js": "text/javascript", ".wasm": "application/wasm", ".json": "application/json" };
const srv = createServer((q, a) => { let p, d; try { p = q.url === "/" ? "index.html" : decodeURIComponent(q.url.slice(1).split("?")[0]); d = readFileSync(join(dist, p)); } catch { a.writeHead(404); a.end(); return; } a.writeHead(200, { "content-type": typ[extname(p)] || "application/octet-stream" }); a.end(d); }).listen(+(process.env.PORT || 8797));
let fehler = 0; const ok = (c, t) => { console.log(`${c ? "✓" : "✗"} ${t}`); if (!c) fehler++; };
const b = await chromium.launch(), pr = [];
const doc = JSON.stringify({ objekt: "T", nr: "1", zaehler: 20, features: [
  { id: "sk", typ: "skizze", name: "Rechteck", ebene: "XY", elemente: [{ id: 1, art: "rechteck", a: [0, 0], b: [200, 120] }], bedingungen: [] },
  { id: "fl", typ: "flaeche", name: "Blech 1", skizze: "sk", material: "zink07", flaechen: [[10, 10]], kanten: {} }] });
const s = await b.newPage({ viewport: { width: 1280, height: 800 } }); s.on("pageerror", (e) => pr.push(e.message));
await s.addInitScript((d) => { localStorage.setItem("sdcad-einstellungen", JSON.stringify({ materialien: [{ id: "zink07", name: "Z", t: 0.7, ri: 1, k: 0.4, dichte: 7.2 }] })); if (!localStorage.getItem("sdcad-doc-0.2")) localStorage.setItem("sdcad-doc-0.2", d);
  window.__log = []; }, doc);
await s.goto("http://localhost:" + (process.env.PORT || 8797) + "/index.html?test"); await s.waitForTimeout(1800);
await s.click(".klappknopf:visible:has-text('Datei')"); await s.waitForTimeout(300);
const menue = () => s.evaluate(() => { const m = document.getElementById("dateiMenue"); return m.hidden ? null : [...m.querySelectorAll("b")].map((e) => e.textContent); });
await s.click("#wOeffnen"); await s.waitForTimeout(200);
let m = await menue(); ok(m?.length === 2 && /Cloud/.test(m[0]) && /öffnen/.test(m[1]), `Öffnen bietet Cloud und Gerät (${m})`);
await s.click("#dateiMenue button[data-k=pc]", { trial: true }).catch(() => {}); await s.keyboard.press("Escape");
await s.evaluate(() => document.body.click()); m = await menue(); ok(m === null, "Menü schliesst bei Klick daneben");
await s.click("#wSpeichern"); await s.waitForTimeout(200);
m = await menue(); ok(m?.length === 2 && /Cloud/.test(m[0]) && /speichern/.test(m[1]), `Speichern bietet Cloud und Gerät (${m})`);
// Speichern fragt nach dem Namen (Gerät) und schreibt den Namen ins Modell
await s.click("#dateiMenue button[data-k=pc]"); await s.waitForTimeout(400);
ok(await s.evaluate(() => document.getElementById("dTitel").textContent.includes("speichern") && !!document.getElementById("d_name")), "Speichern fragt nach dem Namen des Modells");
await s.fill("#d_name", "Mein Modell"); await s.click("#dOk"); await s.waitForTimeout(600);
ok(await s.evaluate(() => window.sdcadTest.dok().modellName === "Mein Modell" && document.getElementById("aModell").value === "Mein Modell"), "Modellname gespeichert und im Auftragsfeld sichtbar");
await s.click("#wSpeichern"); await s.waitForTimeout(200);
await s.click("#dateiMenue button[data-k=cloud]"); await s.waitForTimeout(300);
ok(/anmelden/i.test(await s.evaluate(() => document.getElementById("status").textContent)), "Cloud-Speichern ohne Anmeldung: Hinweis zum Anmelden");
// DXF-Import
const dxf = "0\nSECTION\n2\nENTITIES\n0\nLINE\n8\n0\n10\n0\n20\n0\n11\n100\n21\n0\n0\nLINE\n8\n0\n10\n100\n20\n0\n11\n100\n21\n50\n0\nCIRCLE\n8\n0\n10\n50\n20\n25\n40\n10\n0\nENDSEC\n0\nEOF\n";
await s.setInputFiles("#importDatei", { name: "zeichnung.dxf", mimeType: "application/dxf", buffer: Buffer.from(dxf) }); await s.waitForTimeout(600);
ok(await s.evaluate(() => !!document.getElementById("dOk")), "DXF-Import öffnet den Ebenen-Dialog");
await s.click("#dOk"); await s.waitForTimeout(600);
const n = await s.evaluate(() => window.sdcadTest.dok().features.find((f) => f.name === "DXF zeichnung")?.elemente?.length ?? 0);
ok(n === 3, `DXF-Import legt eine Skizze mit 3 Elementen an (${n})`);
await s.setInputFiles("#importDatei", { name: "plan.dwg", mimeType: "application/acad", buffer: Buffer.from("AC1027") }); await s.waitForTimeout(500);
ok(/als DXF speichern/.test(await s.evaluate(() => document.getElementById("status").textContent)), "DWG: Hinweis, als DXF zu speichern");
// Drucken in der Android-Hülle ohne Druck-Plugin: HTML über das Teilen-Menü
const s2 = await b.newPage({ viewport: { width: 1280, height: 800 } }); s2.on("pageerror", (e) => pr.push(e.message));
await s2.addInitScript((d) => { localStorage.setItem("sdcad-einstellungen", JSON.stringify({ materialien: [{ id: "zink07", name: "Z", t: 0.7, ri: 1, k: 0.4, dichte: 7.2 }] })); localStorage.setItem("sdcad-doc-0.2", d);
  window.__log = []; window.Capacitor = { isNativePlatform: () => true, Plugins: { Filesystem: { writeFile: async (o) => { window.__log.push(["w", o.path, o.data.length, /<div id="druck">/.test(o.data)]); return { uri: "file:///x" }; } }, Share: { share: async (o) => { window.__log.push(["s", o.title]); } } } }; }, doc);
await s2.goto("http://localhost:" + (process.env.PORT || 8797) + "/index.html?test"); await s2.waitForTimeout(1800);
await s2.evaluate(() => document.getElementById("wDrucken").click()); await s2.waitForTimeout(800);
const lg = await s2.evaluate(() => window.__log); ok(lg.some((x) => x[0] === "w" && x[3] && x[2] > 500) && lg.some((x) => x[0] === "s"), `Drucken ohne Plugin: druckfertige Seite wird geteilt (${lg.map((x) => x[0]).join(",")})`);
// mit Druck-Plugin
await s2.evaluate(() => { window.__log.length = 0; window.Capacitor.Plugins.Druck = { drucken: async (o) => { window.__log.push(["d", o.name]); } }; document.getElementById("wDrucken").click(); }); await s2.waitForTimeout(500);
ok((await s2.evaluate(() => window.__log)).some((x) => x[0] === "d"), "Drucken mit Druck-Plugin ruft den Android-Druckdienst");
ok(pr.length === 0, "keine Seitenfehler " + pr.join(" | "));
await b.close(); srv.close();
console.log(fehler ? `${fehler} Fehler` : "Datei-Reiter (App): alle Prüfungen bestanden"); process.exit(fehler ? 1 : 0);
