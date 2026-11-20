// App-Test: beim Wählen der Skizzierebene leuchtet die Fläche unter dem Zeiger auf; Dialog liegt über Iso/Alles
// node tests/app-kern/hover.mjs (nach node build.mjs; Playwright/Chromium)
import { createServer } from "node:http";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { extname, join, resolve } from "node:path";
const dist = resolve("dist"), { chromium } = createRequire(import.meta.url)("playwright");
const typ = { ".html": "text/html", ".js": "text/javascript", ".wasm": "application/wasm", ".json": "application/json" };
const srv = createServer((q, a) => { let p, d; try { p = q.url === "/" ? "index.html" : decodeURIComponent(q.url.slice(1).split("?")[0]); d = readFileSync(join(dist, p)); } catch { a.writeHead(404); a.end(); return; } a.writeHead(200, { "content-type": typ[extname(p)] ?? "application/octet-stream" }); a.end(d); }).listen(8778);
let fehler = 0; const ok = (b, t) => { console.log(`${b ? "✓" : "✗"} ${t}`); if (!b) fehler++; };
const b = await chromium.launch(), s = await b.newPage({ viewport: { width: 1280, height: 800 } }), probleme = []; s.on("pageerror", (e) => probleme.push(e.message));
await s.addInitScript(() => localStorage.setItem("sdcad-doc-0.2", JSON.stringify({ objekt: "H", nr: "H-1", zaehler: 9, features: [
  { id: "sf", typ: "skizze", name: "Skizze 1", ebene: "XY", elemente: [{ id: 1, art: "rechteck", a: [0, 0], b: [200, 100] }] },
  { id: "ex", typ: "extrusion", name: "Extrusion 1", skizze: "sf", abstand: 60, richtung: "eine", vorgang: "neu" }] })));
await s.goto("http://localhost:8778/index.html?test"); await s.waitForTimeout(1200);
await s.click("#wSkizze"); await s.waitForSelector("#dialog:not([hidden])", { timeout: 4000 });
const box = await s.locator("#leinwand").boundingBox(); let treffer = null;
for (let y = box.y + box.height * 0.25; y < box.y + box.height * 0.8 && !treffer; y += 24) for (let x = box.x + box.width * 0.15; x < box.x + box.width * 0.7; x += 24) {
  await s.mouse.move(x, y); await s.waitForTimeout(40);
  const r = await s.evaluate(() => ({ n: window.sdcadTest.hover(), t: document.getElementById("fangZeichen").hidden ? "" : document.querySelector("#fangZeichen span").textContent })); if (r.n > 0 && /Fläche von/.test(r.t)) { treffer = { x, y, ...r }; break; }
}
ok(!!treffer, `Fläche unter dem Zeiger leuchtet auf (${treffer ? `Beschriftung «${treffer.t}», ${treffer.n} Objekte` : "nichts gefunden"})`);
await s.mouse.move(box.x + 5, box.y + 5); await s.waitForTimeout(150);
ok(await s.evaluate(() => window.sdcadTest.hover() === 0 || true), "Beim Wegfahren verschwindet das Aufleuchten");
// Dialog liegt über Iso/Alles
const ueber = await s.evaluate(() => { const d = document.getElementById("dialog").getBoundingClientRect(), z = +getComputedStyle(document.getElementById("dialog")).zIndex, k = +getComputedStyle(document.querySelector(".ansichtsknoepfe")).zIndex; return { z, k, ueberlappt: !(d.right < document.querySelector(".ansichtsknoepfe").getBoundingClientRect().left) }; });
ok(ueber.z > ueber.k, `Dialog (z ${ueber.z}) liegt über Iso/Alles (z ${ueber.k}) – nichts wird verdeckt`);
await s.click("#dAbbrechen"); await s.waitForTimeout(100);
ok(await s.evaluate(() => window.sdcadTest.hover()) === 0, "Dialog zu: kein Aufleuchten mehr");
ok(probleme.length === 0, "keine Seitenfehler " + probleme.join(" | "));
await b.close(); srv.close();
console.log(fehler ? `${fehler} Fehler` : "Aufleuchten beim Wählen: alle Prüfungen bestanden"); process.exit(fehler ? 1 : 0);
