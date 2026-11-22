// App-Test Eingabegeräte: Touch und Stift drehen die Ansicht, in der Skizze nicht
// node tests/app-kern/eingabegeraete.mjs (nach node build.mjs; Playwright/Chromium)
import { createServer } from "node:http"; import { readFileSync } from "node:fs"; import { createRequire } from "node:module"; import { extname, join, resolve } from "node:path";
const dist = resolve("dist"), { chromium } = createRequire(import.meta.url)("playwright");
const typ = { ".html": "text/html", ".js": "text/javascript", ".wasm": "application/wasm", ".json": "application/json" };
const srv = createServer((q, a) => { let p, d; try { p = q.url === "/" ? "index.html" : decodeURIComponent(q.url.slice(1).split("?")[0]); d = readFileSync(join(dist, p)); } catch { a.writeHead(404); a.end(); return; } a.writeHead(200, { "content-type": typ[extname(p)] ?? "application/octet-stream" }); a.end(d); }).listen(+process.env.PORT || 8797);
let fehler = 0; const ok = (c, t) => { console.log(`${c ? "✓" : "✗"} ${t}`); if (!c) fehler++; };
const b = await chromium.launch(), pr = [];
const ctx = await b.newContext({ viewport: { width: 1100, height: 800 }, hasTouch: true }), s = await ctx.newPage(); s.on("pageerror", (e) => pr.push(e.message));
await s.addInitScript(() => localStorage.setItem("sdcad-doc-0.2", JSON.stringify({ objekt: "T", nr: "1", zaehler: 9, features: [{ id: "s1", typ: "skizze", name: "Skizze 1", ebene: "XY", elemente: [{ id: 1, art: "rechteck", a: [0, 0], b: [100, 60] }], bedingungen: [] }, { id: "e1", typ: "extrusion", name: "Extrusion 1", skizze: "s1", abstand: 50, richtung: "eine", vorgang: "neu" }] })));
await s.goto("http://localhost:" + (process.env.PORT || 8797) + "/index.html?test"); await s.waitForTimeout(1500);
await s.evaluate(() => document.getElementById("zoomAlles").click()); await s.waitForTimeout(300);
const cdp = await ctx.newCDPSession(s), q = () => s.evaluate(() => window.sdcadTest.kameraQ()), gleich = (a, c) => a.every((v, i) => Math.abs(v - c[i]) < 1e-6);
const pt = (x, y) => ({ x, y, id: 1 });
async function fingerZug(x0, y0, x1, y1) { await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [pt(x0, y0)] }); for (let i = 1; i <= 8; i++) await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [pt(x0 + (x1 - x0) * i / 8, y0 + (y1 - y0) * i / 8)] }); await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] }); await s.waitForTimeout(250); }
async function stiftZug(x0, y0, x1, y1) { await cdp.send("Input.dispatchMouseEvent", { type: "mousePressed", x: x0, y: y0, button: "left", buttons: 1, clickCount: 1, pointerType: "pen" }); for (let i = 1; i <= 8; i++) await cdp.send("Input.dispatchMouseEvent", { type: "mouseMoved", x: x0 + (x1 - x0) * i / 8, y: y0 + (y1 - y0) * i / 8, button: "left", buttons: 1, pointerType: "pen" }); await cdp.send("Input.dispatchMouseEvent", { type: "mouseReleased", x: x1, y: y1, button: "left", buttons: 0, clickCount: 1, pointerType: "pen" }); await s.waitForTimeout(250); }
const q0 = await q();
await fingerZug(300, 400, 420, 380); const q1 = await q(); ok(!gleich(q0, q1), "Ein Finger dreht die 3D-Ansicht");
await stiftZug(700, 500, 640, 440); const q2 = await q(); ok(!gleich(q1, q2), "Stift dreht die 3D-Ansicht (ausserhalb der Skizze)");
await s.evaluate(() => window.sdcadTest.bearbeite("s1")); await s.waitForTimeout(2000);
const qs = await q(); await fingerZug(300, 400, 420, 380); ok(gleich(qs, await q()), "In der Skizze dreht ein Finger die Ansicht nicht (2D bleibt senkrecht)");
await s.evaluate(() => document.getElementById("tAuswahl").click()); await stiftZug(700, 500, 640, 440); ok(gleich(qs, await q()), "In der Skizze dreht der Stift die Ansicht nicht");
ok(pr.length === 0, "keine Seitenfehler " + pr.join(" | "));
await b.close(); srv.close();
console.log(fehler ? `${fehler} Fehler` : "Eingabegeräte (App): alle Prüfungen bestanden"); process.exit(fehler ? 1 : 0);
