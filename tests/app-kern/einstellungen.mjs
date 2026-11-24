// App-Test Einstellungen: Seite «Allgemein» (Voreinstellungen), Stiftpalette ein/aus, Einstellungen nicht mehr im Reiter Werkstatt
import { createServer } from "node:http"; import { readFileSync } from "node:fs"; import { createRequire } from "node:module"; import { extname, join, resolve } from "node:path";
const dist = resolve("dist"), { chromium } = createRequire(import.meta.url)("playwright");
const typ = { ".html": "text/html", ".js": "text/javascript", ".wasm": "application/wasm", ".json": "application/json" };
const srv = createServer((q, a) => { let p, d; try { p = q.url === "/" ? "index.html" : decodeURIComponent(q.url.slice(1).split("?")[0]); d = readFileSync(join(dist, p)); } catch { a.writeHead(404); a.end(); return; } a.writeHead(200, { "content-type": typ[extname(p)] || "application/octet-stream" }); a.end(d); }).listen(+(process.env.PORT || 8797));
let fehler = 0; const ok = (c, t) => { console.log(`${c ? "✓" : "✗"} ${t}`); if (!c) fehler++; };
const b = await chromium.launch(), pr = [], url = "http://localhost:" + (process.env.PORT || 8797) + "/index.html?test";
const sichtbar = (s) => s.evaluate(() => { const e = document.getElementById("stiftleiste"); return getComputedStyle(e).display !== "none" && e.querySelectorAll("button[data-for]").length > 0; });
// Maus: Palette automatisch aus
let c = await b.newContext({ viewport: { width: 1280, height: 800 } }), s = await c.newPage(); s.on("pageerror", (e) => pr.push(e.message));
await s.goto(url); await s.waitForTimeout(1500);
ok(await s.evaluate(() => !document.querySelector('[data-klapp="werkstatt"]')), "Reiter «Werkstatt» gibt es nicht mehr");
ok(await s.evaluate(() => { const e = document.getElementById("wEinst"); return !!e && !e.closest("[data-klapp]") && e.getBoundingClientRect().width > 0; }), "Einstellungen liegen oben in der Leiste (immer sichtbar)");
ok(!(await sichtbar(s)), "Mit Maus: Stiftpalette automatisch aus");
await s.click("#wEinst"); await s.waitForTimeout(400);
ok(await s.evaluate(() => document.querySelector('[data-ereg="allgemein"]')?.getAttribute("aria-selected") === "true" && !!document.getElementById("e_allgemein_stiftpalette")), "Einstellungen öffnen auf der Seite «Allgemein» mit Stiftpalette");
await s.selectOption("#e_allgemein_stiftpalette", "ein"); await s.click("#eOk"); await s.waitForTimeout(500);
ok(await sichtbar(s), "Stiftpalette «Immer anzeigen» ist sichtbar");
await s.evaluate(() => document.querySelector('#stiftleiste [data-for="zurueck"]') && 0);
ok(await s.evaluate(() => [...document.querySelectorAll("#stiftleiste button[data-for]")].filter((x) => getComputedStyle(x).display !== "none").map((x) => x.dataset.for).join().includes("wSkizze")), "Ausserhalb der Skizze: Skizze/Extrusion/Rückgängig in der Palette");
await s.click("#stiftleiste [data-for=wSkizze]"); await s.waitForTimeout(400);
ok(await s.evaluate(() => document.getElementById("dTitel").textContent === "Skizze erstellen"), "Palettenknopf löst die Aktion aus");
await s.click("#dAbbrechen"); await s.waitForTimeout(200);
await s.click("#wEinst"); await s.waitForTimeout(300); await s.selectOption("#e_allgemein_stiftpalette", "aus"); await s.click("#eOk"); await s.waitForTimeout(400);
ok(!(await sichtbar(s)), "Stiftpalette «Nie anzeigen» ist weg");
await c.close();
// Tablet: automatisch an
c = await b.newContext({ viewport: { width: 1280, height: 800 }, hasTouch: true }); s = await c.newPage(); s.on("pageerror", (e) => pr.push(e.message));
await s.goto(url); await s.waitForTimeout(1500); ok(await sichtbar(s), "Auf dem Tablet: Stiftpalette automatisch an");
await c.close();
ok(pr.length === 0, "keine Seitenfehler " + pr.join(" | "));
await b.close(); srv.close();
console.log(fehler ? `${fehler} Fehler` : "Einstellungen (App): alle Prüfungen bestanden"); process.exit(fehler ? 1 : 0);
