// App-Test Tablet-Bedienung: Langdruck = Kontextmenü, kein HTML5-Ziehen mit Finger, grosse Trefferflächen, Rechteck-Menü liegt vor dem Menüband
import { createServer } from "node:http"; import { readFileSync } from "node:fs"; import { createRequire } from "node:module"; import { extname, join, resolve } from "node:path";
const dist = resolve("dist"), { chromium } = createRequire(import.meta.url)("playwright");
const typ = { ".html": "text/html", ".js": "text/javascript", ".wasm": "application/wasm", ".json": "application/json" };
const srv = createServer((q, a) => { let p, d; try { p = q.url === "/" ? "index.html" : decodeURIComponent(q.url.slice(1).split("?")[0]); d = readFileSync(join(dist, p)); } catch { a.writeHead(404); a.end(); return; } a.writeHead(200, { "content-type": typ[extname(p)] || "application/octet-stream" }); a.end(d); }).listen(+(process.env.PORT || 8797));
let fehler = 0; const ok = (c, t) => { console.log(`${c ? "✓" : "✗"} ${t}`); if (!c) fehler++; };
const b = await chromium.launch(), pr = [];
const doc = JSON.stringify({ objekt: "T", nr: "1", zaehler: 20, features: [
  { id: "sk", typ: "skizze", name: "Rechteck", ebene: "XY", elemente: [{ id: 1, art: "rechteck", a: [0, 0], b: [200, 120] }], bedingungen: [] },
  { id: "fl", typ: "flaeche", name: "Blech 1", skizze: "sk", material: "zink07", flaechen: [[10, 10]], kanten: {} }] });
const init = (d) => { localStorage.setItem("sdcad-einstellungen", JSON.stringify({ materialien: [{ id: "zink07", name: "Z", t: 0.7, ri: 1, k: 0.4, dichte: 7.2 }] })); localStorage.setItem("sdcad-doc-0.2", d); };
// Tablet (Finger)
const c = await b.newContext({ viewport: { width: 1280, height: 800 }, hasTouch: true }), s = await c.newPage(); s.on("pageerror", (e) => pr.push(e.message));
await s.addInitScript(init, doc); await s.goto("http://localhost:" + (process.env.PORT || 8797) + "/index.html?test"); await s.waitForTimeout(1800);
ok(await s.evaluate(() => matchMedia("(pointer: coarse)").matches), "Gerät meldet grobe Zeigereingabe (Finger)");
ok(await s.evaluate(() => !document.querySelector("#zeit button[data-id]").draggable), "Zeitleiste: kein HTML5-Ziehen mit dem Finger");
// Langdruck auf ein Zeitleisten-Feature öffnet das Menü
const r = await s.evaluate(() => { const e = document.querySelector("#zeit button[data-id]").getBoundingClientRect(); return [e.x + e.width / 2, e.y + e.height / 2]; });
await s.evaluate(([x, y]) => { window.__cm = 0; document.addEventListener("contextmenu", () => window.__cm++, true); const el = document.elementFromPoint(x, y); const o = { pointerId: 7, pointerType: "touch", isPrimary: true, clientX: x, clientY: y, bubbles: true, cancelable: true }; el.dispatchEvent(new PointerEvent("pointerdown", o)); }, r);
await s.waitForTimeout(900);
ok(await s.evaluate(() => window.__cm >= 1), "Langdruck auf Zeitleisten-Feature löst das Kontextmenü aus");
await s.evaluate(([x, y]) => document.elementFromPoint(x, y)?.dispatchEvent(new PointerEvent("pointerup", { pointerId: 7, pointerType: "touch", isPrimary: true, bubbles: true })), r);
await c.close();
// Maus: Ziehen bleibt, Rechteck-Menü liegt vorn
const c2 = await b.newContext({ viewport: { width: 1280, height: 800 } }), m = await c2.newPage(); m.on("pageerror", (e) => pr.push(e.message));
await m.addInitScript(init, doc); await m.goto("http://localhost:" + (process.env.PORT || 8797) + "/index.html?test"); await m.waitForTimeout(1800);
ok(await m.evaluate(() => document.querySelector("#zeit button[data-id]").draggable), "Maus: Zeitleiste lässt sich ziehen");
const z = await m.evaluate(() => { const css = (id) => +getComputedStyle(document.getElementById(id)).zIndex; return { sk: css("skizzenMenue"), kl: Math.max(...[...document.querySelectorAll(".klappmenue, .menue:not(#skizzenMenue):not(#ebenenMenue):not(#verlaufMenue):not(#dateiMenue)")].map((e) => +getComputedStyle(e).zIndex || 0)) }; });
ok(z.sk > z.kl, `Skizzen-Variantenmenü (z ${z.sk}) liegt vor den Klappmenüs (z ${z.kl})`);
const vorn = await m.evaluate(() => { document.getElementById("leiste").classList.add("imSkizze"); document.querySelectorAll(".klappmenue").forEach((k) => (k.hidden = false)); const l = document.getElementById("leiste").getBoundingClientRect(), me = document.getElementById("skizzenMenue"); me.innerHTML = '<button data-wz="rechteck"><b>2-Punkt-Rechteck</b></button><button data-wz="rechteckM"><b>Rechteck um Mittelpunkt</b></button>'; me.hidden = false; me.style.left = "120px"; me.style.top = l.top + 10 + "px"; const r = me.querySelector("button").getBoundingClientRect(); const e = document.elementFromPoint(r.x + 10, r.y + 10); me.hidden = true; return !!e?.closest("#skizzenMenue"); });
ok(vorn, "Skizzen-Variantenmenü liegt sichtbar über dem Menüband (nicht dahinter)");
ok(pr.length === 0, "keine Seitenfehler " + pr.join(" | "));
await b.close(); srv.close();
console.log(fehler ? `${fehler} Fehler` : "Tablet-Bedienung (App): alle Prüfungen bestanden"); process.exit(fehler ? 1 : 0);
