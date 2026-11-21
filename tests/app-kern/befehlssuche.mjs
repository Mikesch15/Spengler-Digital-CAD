// App-Test Befehlssuche und angedockter Dialog
// node tests/app-kern/befehlssuche.mjs (nach node build.mjs; Playwright/Chromium)
import { createServer } from "node:http"; import { readFileSync } from "node:fs"; import { createRequire } from "node:module"; import { extname, join, resolve } from "node:path";
const dist = resolve("dist"), { chromium } = createRequire(import.meta.url)("playwright");
const typ = { ".html": "text/html", ".js": "text/javascript", ".wasm": "application/wasm", ".json": "application/json" };
const srv = createServer((q, a) => { let p, d; try { p = q.url === "/" ? "index.html" : decodeURIComponent(q.url.slice(1).split("?")[0]); d = readFileSync(join(dist, p)); } catch { a.writeHead(404); a.end(); return; } a.writeHead(200, { "content-type": typ[extname(p)] ?? "application/octet-stream" }); a.end(d); }).listen(8797);
let fehler = 0; const ok = (c, t) => { console.log(`${c ? "✓" : "✗"} ${t}`); if (!c) fehler++; };
const b = await chromium.launch(), s = await b.newPage({ viewport: { width: 1280, height: 800 } }), pr = []; s.on("pageerror", (e) => pr.push(e.message));
await s.addInitScript(() => localStorage.setItem("sdcad-doc-0.2", JSON.stringify({ objekt: "T", nr: "1", zaehler: 30, features: [
  { id: "s1", typ: "skizze", name: "Skizze 1", ebene: "XY", elemente: [{ id: 1, art: "rechteck", a: [0, 0], b: [50, 40] }], bedingungen: [] }] })));
await s.goto("http://localhost:8797/index.html?test"); await s.waitForTimeout(1500);
await s.keyboard.press("Control+k"); await s.waitForSelector(".bs input", { timeout: 3000 });
const n0 = await s.evaluate(() => document.querySelectorAll(".bs li[data-i]").length);
ok(n0 > 30, "Befehlssuche listet viele Werkzeuge (" + n0 + ")");
await s.keyboard.type("dachfenster"); await s.waitForTimeout(200);
ok(await s.evaluate(() => /Fenster \/ Kamin/.test(document.querySelector(".bs li.aktiv")?.textContent || "")), "Suche «dachfenster» findet das Dachfenster-Werkzeug");
await s.keyboard.press("Escape"); await s.waitForTimeout(100);
ok(await s.evaluate(() => !document.querySelector(".bs")), "Esc schliesst die Suche");
await s.keyboard.press("/"); await s.waitForSelector(".bs input"); await s.keyboard.type("extru"); await s.keyboard.press("Enter");
await s.waitForSelector("#d_abstand", { state: "attached", timeout: 4000 });
ok(await s.evaluate(() => !document.getElementById("dialog").hidden && !document.querySelector(".bs")), "Enter startet «Extrudieren» (Dialog offen, Suche zu)");
const pos = await s.evaluate(() => { const d = document.getElementById("dialog").getBoundingClientRect(), a = document.getElementById("ansicht").getBoundingClientRect(); return { dl: d.left, ar: a.right, parent: document.getElementById("dialog").parentElement.className }; });
ok(pos.parent === "mitte" && pos.dl >= pos.ar - 1, "Dialog ist rechts angedockt und überdeckt die 3D-Ansicht nicht (" + JSON.stringify(pos) + ")");
await s.click("#dAbbrechen"); await s.waitForTimeout(300);
ok(await s.evaluate(() => document.getElementById("dialog").hidden && getComputedStyle(document.querySelector(".werkstatt")).display !== "none"), "Nach dem Schliessen ist Teil/Auftrag wieder da");
// Esc bricht den Dialog ab; Enter geht im Assistenten weiter, auf der letzten Seite/ohne Schritte = OK
await s.evaluate(() => document.getElementById("wExtrusion").click()); await s.waitForSelector("#d_abstand", { state: "attached" });
await s.keyboard.press("Escape"); await s.waitForTimeout(300);
ok(await s.evaluate(() => document.getElementById("dialog").hidden), "Esc bricht den Dialog ab");
await s.evaluate(() => document.getElementById("wDachAuto").click()); await s.waitForSelector("#d_name", { state: "attached" });
await s.focus("#d_name"); await s.keyboard.press("Enter"); await s.waitForTimeout(300);
ok(/Schritt 2 von 5/.test(await s.evaluate(() => document.querySelector("#dSchritte .titel")?.textContent || "")), "Enter im Assistenten: nächster Schritt");
await s.keyboard.press("Escape"); await s.waitForTimeout(300);
await s.evaluate(() => document.getElementById("wExtrusion").click()); await s.waitForSelector("#d_abstand", { state: "attached" });
await s.focus("#d_abstand"); await s.keyboard.press("Enter"); await s.waitForTimeout(400);
ok(await s.evaluate(() => document.getElementById("dialog").hidden || /Zuerst mindestens eine Fl/.test(document.getElementById("status").textContent)), "Enter im Einzeldialog = OK (schliesst oder meldet die fehlende Pflichtangabe)");
// Warnmeldungen fallen auf
await s.evaluate(() => document.getElementById("wDachElement").click()); await s.waitForTimeout(300);
ok(await s.evaluate(() => document.getElementById("status").classList.contains("warn")), "Warnung («Zuerst ein Dach anlegen») wird hervorgehoben");
ok(pr.length === 0, "keine Seitenfehler " + pr.join(" | "));
await b.close(); srv.close();
console.log(fehler ? `${fehler} Fehler` : "Befehlssuche/Dialog (App): alle Prüfungen bestanden"); process.exit(fehler ? 1 : 0);
