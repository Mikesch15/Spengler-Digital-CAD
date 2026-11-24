// App-Test Skizze/Allgemein: Fenster verschiebbar, Masse frei verschiebbar + ausblendbar, Löschen als Werkzeug, Abhängigkeit öffnet mit einem Klick, FG-Erklärung, Stift-Hover
import { createServer } from "node:http"; import { readFileSync } from "node:fs"; import { createRequire } from "node:module"; import { extname, join, resolve } from "node:path";
const dist = resolve("dist"), { chromium } = createRequire(import.meta.url)("playwright");
const typ = { ".html": "text/html", ".js": "text/javascript", ".wasm": "application/wasm", ".json": "application/json" };
const srv = createServer((q, a) => { let p, d; try { p = q.url === "/" ? "index.html" : decodeURIComponent(q.url.slice(1).split("?")[0]); d = readFileSync(join(dist, p)); } catch { a.writeHead(404); a.end(); return; } a.writeHead(200, { "content-type": typ[extname(p)] || "application/octet-stream" }); a.end(d); }).listen(+(process.env.PORT || 8797));
let fehler = 0; const ok = (c, t) => { console.log(`${c ? "✓" : "✗"} ${t}`); if (!c) fehler++; };
const b = await chromium.launch(), pr = [];
const doc = JSON.stringify({ objekt: "T", nr: "1", zaehler: 20, features: [
  { id: "sk", typ: "skizze", name: "Skizze 1", ebene: "XY", elemente: [{ id: 1, art: "linie", pts: [[0, 0], [100, 0]], layer: "0" }, { id: 2, art: "linie", pts: [[100, 0], [100, 60]], layer: "0" }], bedingungen: [{ typ: "horizontal", l: { e: 1, s: 0 } }] }] });
const s = await b.newPage({ viewport: { width: 1280, height: 800 } }); s.on("pageerror", (e) => pr.push(e.message));
await s.addInitScript((d) => { localStorage.setItem("sdcad-einstellungen", JSON.stringify({ materialien: [{ id: "zink07", name: "Z", t: 0.7, ri: 1, k: 0.4, dichte: 7.2 }] })); localStorage.setItem("sdcad-doc-0.2", d); }, doc);
await s.goto("http://localhost:" + (process.env.PORT || 8797) + "/index.html?test"); await s.waitForTimeout(1800);
if (pr.length) console.log("PAGEERR", pr.join(" | "));
await s.evaluate(() => window.sdcadTest.bearbeite("sk")); await s.waitForTimeout(900);
const lab = () => s.evaluate(() => [...document.querySelectorAll("#labels div")].filter((d) => !d.hidden && d.className !== "kante" && d.textContent).map((d) => ({ t: d.textContent, c: d.className, x: d.getBoundingClientRect().x + d.getBoundingClientRect().width / 2, y: d.getBoundingClientRect().y + d.getBoundingClientRect().height / 2 })));
let L = await lab(); ok(L.some((l) => /^100/.test(l.t)) && L.some((l) => l.c.includes("glyph")), `Skizze zeigt Masse und Abhängigkeitssymbol (${L.map((l) => l.t)})`);
// Anzeige
await s.click("#anzMasse"); await s.waitForTimeout(300); L = await lab(); ok(!L.some((l) => /^\d/.test(l.t)), "Masse ausgeblendet"); await s.click("#anzMasse");
await s.click("#anzAbh"); await s.waitForTimeout(300); L = await lab(); ok(!L.some((l) => l.c.includes("glyph")), "Abhängigkeitssymbole ausgeblendet"); await s.click("#anzAbh"); await s.waitForTimeout(300);
// Mass frei verschieben (im Auswahl-Werkzeug)
await s.click("#tAuswahl"); await s.waitForTimeout(200);
L = await lab(); const m0 = L.find((l) => /^100/.test(l.t)); ok(!!m0 && m0.c.includes("mass"), "Mass ist im Auswahl-Werkzeug greifbar");
await s.mouse.move(m0.x, m0.y); await s.mouse.down(); await s.mouse.move(m0.x + 20, m0.y + 30, { steps: 4 }); await s.mouse.move(m0.x + 40, m0.y + 70, { steps: 4 }); await s.mouse.up(); await s.waitForTimeout(300);
L = await lab(); const m1 = L.find((l) => /^100/.test(l.t)); ok(m1 && Math.hypot(m1.x - m0.x, m1.y - m0.y) > 30, `Mass wurde verschoben (${m0.x | 0},${m0.y | 0} → ${m1?.x | 0},${m1?.y | 0})`);
ok(await s.evaluate(() => !document.querySelector("#massbox, .massbox")), "Verschieben öffnet kein Eingabefeld");
// Mass auch im Zeichenwerkzeug (Linie) ziehen
await s.click("#tLinie"); await s.waitForTimeout(200);
L = await lab(); const w0 = L.find((l) => /^100/.test(l.t));
await s.mouse.move(w0.x, w0.y); await s.mouse.down(); await s.mouse.move(w0.x - 30, w0.y + 20, { steps: 4 }); await s.mouse.move(w0.x - 60, w0.y + 40, { steps: 4 }); await s.mouse.up(); await s.waitForTimeout(300);
L = await lab(); const w1 = L.find((l) => /^100/.test(l.t)); ok(w1 && Math.hypot(w1.x - w0.x, w1.y - w0.y) > 30, `Mass lässt sich auch im Linien-Werkzeug ziehen (${w0.x | 0},${w0.y | 0} → ${w1?.x | 0},${w1?.y | 0})`);
ok(await s.evaluate(() => window.sdcadTest.dok().features[0].elemente.length) === 2, "…ohne dabei eine Linie zu beginnen");
await s.click("#tAuswahl"); await s.waitForTimeout(200);
// Löschen als Werkzeug
const n0 = await s.evaluate(() => window.sdcadTest.dok().features[0].elemente.length);
await s.click("#tEntf"); await s.waitForTimeout(200);
ok(await s.evaluate(() => document.getElementById("tEntf").getAttribute("aria-pressed") === "true"), "Löschen ist als Werkzeug gewählt");
ok(await s.evaluate(() => window.sdcadTest.dok().features[0].elemente.length) === n0, "Der Löschen-Knopf selbst löscht nichts");
// Abhängigkeit: ein Klick öffnet die Liste
await s.click("#tAbh"); await s.waitForTimeout(250);
ok(await s.evaluate(() => { const m = document.getElementById("skizzenMenue"); return !m.hidden && m.querySelectorAll("button").length >= 8; }), "Abhängigkeit öffnet mit einem Klick die Liste");
await s.keyboard.press("Escape"); await s.evaluate(() => document.body.click());
// FG-Erklärung
const fg = await s.evaluate(() => document.getElementById("fgAnzeige").title); ok(/Freiheitsgrade/.test(fg), "FG-Anzeige erklärt Freiheitsgrade");
await s.hover("#fgAnzeige"); await s.waitForTimeout(200);
ok(await s.evaluate(() => [...document.querySelectorAll(".zeitTip")].some((e) => !e.hidden && /Freiheitsgrade/.test(e.textContent))), "Beim Überfahren erscheint die Erklärung");
// Stift-Hover: nur mousemove-Ereignisse werden als pointermove weitergereicht
const hov = await s.evaluate(() => new Promise((res) => { const c = document.getElementById("leinwand"); let n = 0; c.addEventListener("pointermove", () => n++); const r = c.getBoundingClientRect(); c.dispatchEvent(new MouseEvent("mousemove", { clientX: r.x + 300, clientY: r.y + 300, bubbles: true })); setTimeout(() => res(n), 100); }));
ok(hov >= 1, "Stift-Hover: mousemove wird als pointermove weitergereicht");
await s.click("#tFertig"); await s.waitForTimeout(500);
// Fenster verschieben
await s.evaluate(() => window.sdcadTest.bearbeite("sk")); await s.waitForTimeout(300); await s.click("#tFertig").catch(() => {});
await s.click("#wSkizze").catch(async () => { await s.click(".klappknopf:visible:has-text('Körper')"); await s.click("#wSkizze"); }); await s.waitForTimeout(500);
const k0 = await s.evaluate(() => { const h = document.querySelector("#dialog > h3"), r = h.getBoundingClientRect(); return [r.x + 40, r.y + 10, document.getElementById("dialog").getBoundingClientRect().x]; });
await s.mouse.move(k0[0], k0[1]); await s.mouse.down(); await s.mouse.move(k0[0] - 120, k0[1] + 60, { steps: 5 }); await s.mouse.up(); await s.waitForTimeout(200);
const x1 = await s.evaluate(() => document.getElementById("dialog").getBoundingClientRect().x); ok(Math.abs(x1 - (k0[2] - 120)) < 3, `Dialog lässt sich am Titel verschieben (${k0[2] | 0} → ${x1 | 0})`);
await s.dblclick("#dialog > h3"); await s.waitForTimeout(200);
ok(Math.abs(await s.evaluate(() => document.getElementById("dialog").getBoundingClientRect().x) - k0[2]) < 3, "Doppelklick auf den Titel setzt die Lage zurück");
ok(pr.length === 0, "keine Seitenfehler " + pr.join(" | "));
await b.close(); srv.close();
console.log(fehler ? `${fehler} Fehler` : "Skizzenbedienung (App): alle Prüfungen bestanden"); process.exit(fehler ? 1 : 0);
