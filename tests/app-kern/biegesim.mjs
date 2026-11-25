// App-Test Biegesimulation: Fenster, Maschinenwahl, Folge, Bewegung, Einstellungen › Biegemaschinen
import { createServer } from "node:http"; import { readFileSync } from "node:fs"; import { createRequire } from "node:module"; import { extname, join, resolve } from "node:path";
const dist = resolve("dist"), { chromium } = createRequire(import.meta.url)("playwright");
const typ = { ".html": "text/html", ".js": "text/javascript", ".wasm": "application/wasm", ".json": "application/json", ".jpg": "image/jpeg", ".png": "image/png" };
const srv = createServer((q, a) => { let p, d; try { p = q.url === "/" ? "index.html" : decodeURIComponent(q.url.slice(1).split("?")[0]); d = readFileSync(join(dist, p)); } catch { a.writeHead(404); a.end(); return; } a.writeHead(200, { "content-type": typ[extname(p)] || "application/octet-stream" }); a.end(d); }).listen(+(process.env.PORT || 8797));
let fehler = 0; const ok = (c, t) => { console.log(`${c ? "✓" : "✗"} ${t}`); if (!c) fehler++; };
const b = await chromium.launch(), s = await b.newPage({ viewport: { width: 1280, height: 800 } }), pr = []; s.on("pageerror", (e) => pr.push(e.message));
await s.goto("http://localhost:" + (process.env.PORT || 8797) + "/index.html?test"); await s.waitForTimeout(1800);
// Beispiel-Traufblech ist geladen
await s.click(".klappknopf:visible:has-text('Blech')"); await s.waitForTimeout(200);
ok(await s.evaluate(() => !!document.getElementById("wBiegesim") && getComputedStyle(document.getElementById("wBiegesim")).display !== "none"), "Blech-Reiter hat «Biegesimulation»");
await s.click("#wBiegesim"); await s.waitForTimeout(800);
ok(await s.evaluate(() => !document.getElementById("bgFenster").hidden), "Fenster öffnet");
const z = await s.evaluate(() => { const o = document.getElementById("bgaMaschine"); return { opts: [...(o?.options || [])].map((x) => x.textContent), kopf: document.getElementById("bgaKopfZeile").textContent, bild: !!document.querySelector("#bgaBild svg"), ketten: document.querySelectorAll(".bga-chip").length }; });
ok(z.opts.length >= 2 && z.opts.some((x) => /Schröder/.test(x)) && z.opts.some((x) => /Jorns/.test(x)), `Maschinen: ${z.opts.join(" | ")}`);
ok(z.bild && z.ketten >= 1, `Bild und ${z.ketten} Biegeschritte`);
ok(/Machbar|Problem|nicht machbar/.test(await s.evaluate(() => document.getElementById("bgFenster").textContent)), "Ergebnis (machbar oder Probleme) wird angezeigt");
// Bewegung: Regler
await s.evaluate(() => { const r = document.getElementById("bgaRegler"); r.value = 500; r.dispatchEvent(new Event("input", { bubbles: true })); });
ok(/\d+°\s*\/\s*\d+°/.test(await s.evaluate(() => document.querySelector(".bga-regler-text")?.textContent || "")), "Regler fährt die Biegung (Winkelanzeige)");
// Jorns: Werkzeuge fehlen
await s.selectOption("#bgaMaschine", "jorns-maxi150s"); await s.waitForTimeout(400);
ok(/Unterwange fehlt|Oberwange fehlt|Biegewange/.test(await s.evaluate(() => document.getElementById("bgaBild").textContent)), "Jorns ohne Werkzeugdaten: Hinweis statt Rechnung");
await s.selectOption("#bgaMaschine", "schroeder-spb3200"); await s.waitForTimeout(400);
ok(await s.evaluate(() => /ungeprüft|nicht als «mit der Herstellerzeichnung geprüft»/.test(document.getElementById("bgaErgebnis").textContent)), "Schröder-Werte als ungeprüft gekennzeichnet");
// Abspielen
await s.click('[data-bga-akt="spielen"]'); await s.waitForTimeout(600); const w1 = await s.evaluate(() => document.querySelector(".bga-regler-text")?.textContent); await s.click('[data-bga-akt="spielen"]');
ok(!!w1, "Abspielen läuft");
await s.click("#bgZu2"); ok(await s.evaluate(() => document.getElementById("bgFenster").hidden), "Fenster schliesst");
// Einstellungen
await s.click("#wEinst"); await s.evaluate(() => window.sdcadTest.einstSeite("maschinen")); await s.waitForTimeout(400);
ok(await s.evaluate(() => document.querySelectorAll(".mkarte").length >= 2 && !!document.querySelector(".mkarte svg")), "Einstellungen zeigen beide Maschinen mit Querschnitt");
await s.evaluate(() => { const t = document.querySelector("[data-mjson='1']"); t.value = JSON.stringify({ unterwange: [[[-300, 0], [0, 0], [-20, -80], [-300, -80]]], klemmwange: [[[-100, 120], [-20, 120], [-20, 300], [-100, 300]]], biegewange_auf: { teile: [[[3, -50], [3, -3], [8, 0], [30, 0], [30, -50]]], achse: [0, 0] } }); t.dispatchEvent(new Event("change", { bubbles: true })); });
await s.waitForTimeout(300);
ok(await s.evaluate(() => !/fehlt/.test(document.querySelector("[data-mkarte='1'] .mkopf").textContent)), "Jorns-Querschnitte eintragbar → Maschine vollständig");
await s.click("#eAbbrechen");
// Flächenblech mit Kantenbausteinen
const q = await b.newPage({ viewport: { width: 1280, height: 800 } }); q.on("pageerror", (e) => pr.push(e.message));
await q.addInitScript(() => { localStorage.setItem("sdcad-doc-0.2", JSON.stringify({ objekt: "T", nr: "1", zaehler: 20, features: [
  { id: "sk", typ: "skizze", name: "Rechteck", ebene: "XY", elemente: [{ id: 1, art: "rechteck", a: [0, 0], b: [400, 200] }], bedingungen: [] },
  { id: "fl", typ: "flaeche", name: "Dachblech", skizze: "sk", material: "zink07", flaechen: [[10, 10]], kanten: { "0:0": "abk-o", "0:2": "abk-o" } }] })); localStorage.setItem("sdcad-einstellungen", JSON.stringify({ materialien: [{ id: "zink07", name: "Z", t: 0.7, ri: 1, k: 0.4, dichte: 7.2 }] })); });
await q.goto("http://localhost:" + (process.env.PORT || 8797) + "/index.html?test"); await q.waitForTimeout(1800);
await q.click(".klappknopf:visible:has-text('Blech')"); await q.click("#wBiegesim"); await q.waitForTimeout(800);
const fk = await q.evaluate(() => ({ opts: [...(document.getElementById("bgaQuelle")?.options || [])].map((x) => x.textContent), platte: !!document.getElementById("bgaPlatte"), bild: !!document.querySelector("#bgaBild svg"), ketten: document.querySelectorAll(".bga-chip").length }));
ok(fk.opts.length === 2 && /Kante/.test(fk.opts[0]) && fk.platte && fk.bild && fk.ketten >= 1, `Flächenblech: ${fk.opts.length} Kanten mit Baustein wählbar, Blechlänge einstellbar, Bild und ${fk.ketten} Schritt(e)`);
await q.selectOption("#bgaQuelle", "1"); await q.waitForTimeout(400); ok(await q.evaluate(() => !!document.querySelector("#bgaBild svg")), "Zweite Kante lässt sich wählen");
await q.fill("#bgaPlatte", "6"); await q.dispatchEvent("#bgaPlatte", "change"); await q.waitForTimeout(400);
ok(/Machbar|Problem|nicht machbar/.test(await q.evaluate(() => document.getElementById("bgFenster").textContent)) && await q.evaluate(() => document.getElementById("bgaPlatte").value === "6"), "Geänderte Blechlänge wird neu gerechnet");
ok(pr.length === 0, "keine Seitenfehler " + pr.join(" | "));
await b.close(); srv.close();
console.log(fehler ? `${fehler} Fehler` : "Biegesimulation (App): alle Prüfungen bestanden"); process.exit(fehler ? 1 : 0);
