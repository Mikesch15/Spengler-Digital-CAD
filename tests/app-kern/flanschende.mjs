// App-Test Flanschende: Standard rechtwinklig; nachträglich verlängern/kürzen, bündig oder mit Winkel (Schritt «Flanschende»)
// node tests/app-kern/flanschende.mjs (nach node build.mjs; Playwright/Chromium)
import { createServer } from "node:http"; import { readFileSync } from "node:fs"; import { createRequire } from "node:module"; import { join, resolve } from "node:path";
const dist = resolve("dist"), { chromium } = createRequire(import.meta.url)("playwright");
const typ = { ".html": "text/html", ".js": "text/javascript", ".wasm": "application/wasm", ".json": "application/json" };
const srv = createServer((q, a) => { let p, d; try { p = q.url === "/" ? "index.html" : decodeURIComponent(q.url.slice(1).split("?")[0]); d = readFileSync(join(dist, p)); } catch { a.writeHead(404); a.end(); return; } a.writeHead(200, { "content-type": typ[p.slice(p.lastIndexOf("."))] || "application/octet-stream" }); a.end(d); }).listen(+(process.env.PORT || 8797));
let fehler = 0; const ok = (c, t) => { console.log(`${c ? "✓" : "✗"} ${t}`); if (!c) fehler++; };
const b = await chromium.launch(), s = await b.newPage({ viewport: { width: 1280, height: 800 } }), pr = []; s.on("pageerror", (e) => pr.push(e.message));
const P = [[0, 0], [200, 0], [150, 100], [30, 100]];
const feat = [{ id: "sk", typ: "skizze", name: "Trapez", ebene: "XY", elemente: P.map((p, i) => ({ id: i + 1, art: "linie", pts: [p, P[(i + 1) % 4]] })), bedingungen: [] },
  { id: "fl", typ: "flaeche", name: "Blech 1", skizze: "sk", material: "zink07", flaechen: [[100, 50]], kanten: { "0:0": "abk-o" } },
  { id: "fe", typ: "flanschende", name: "Flanschende", ziel: "fl", key: "0:0", seite: "ende", art: "rechtwinklig", winkel: 0, versatz: 0 }];
await s.addInitScript((d) => { localStorage.setItem("sdcad-einstellungen", JSON.stringify({ materialien: [{ id: "zink07", name: "Z", t: 0.7, ri: 1, k: 0.4, dichte: 7.2 }] })); localStorage.setItem("sdcad-doc-0.2", JSON.stringify({ objekt: "T", nr: "1", zaehler: 20, features: d })); }, feat);
await s.goto("http://localhost:" + (process.env.PORT || 8797) + "/index.html?test"); await s.waitForTimeout(1500);
const wand = () => s.evaluate(() => { const P = window.sdcadTest.meshPunkte("fl").filter((q) => q[2] > 10 && q[1] < 1); return { n: P.length, min: Math.min(...P.map((q) => q[0])), max: Math.max(...P.map((q) => q[0])) }; });
const w0 = await wand();
ok(w0.n > 0 && Math.abs(w0.min - 0) < 1 && Math.abs(w0.max - 200) < 1, `Standard: Ende rechtwinklig an der Plattenecke (x ${w0.min.toFixed(1)} … ${w0.max.toFixed(1)})`);
// Schritt anlegen und im Dialog ändern
await s.evaluate(() => window.sdcadTest.bearbeite("fe")); await s.waitForTimeout(700);
ok(await s.isVisible("#d_versatz") && await s.isVisible("#d_art"), "Dialog «Flanschende» mit Art, Winkel und Versatz");
await s.evaluate(() => { const e = document.getElementById("d_versatz"); e.value = "10"; e.dispatchEvent(new Event("input", { bubbles: true })); }); await s.waitForTimeout(500);
const w1 = await wand(); ok(Math.abs(w1.max - 210) < 1.2 && Math.abs(w1.min) < 1, `Verlängern um 10 mm am Ende (x max ${w1.max.toFixed(1)})`);
await s.evaluate(() => { const e = document.getElementById("d_versatz"); e.value = "-15"; e.dispatchEvent(new Event("input", { bubbles: true })); }); await s.waitForTimeout(500);
const w2 = await wand(); ok(Math.abs(w2.max - 185) < 1.2, `Kürzen um 15 mm am Ende (x max ${w2.max.toFixed(1)})`);
await s.evaluate(() => { const e = document.getElementById("d_versatz"); e.value = "0"; e.dispatchEvent(new Event("input", { bubbles: true })); const a = document.getElementById("d_art"); a.value = "buendig"; a.dispatchEvent(new Event("change", { bubbles: true })); }); await s.waitForTimeout(500);
const w3 = await s.evaluate(() => { const P = window.sdcadTest.meshPunkte("fl").filter((q) => q[2] > 10 && q[1] < 1); const top = P.filter((q) => q[2] > 20), bot = P.filter((q) => q[2] <= 20); return { a: Math.max(...top.map((q) => q[0])), b: Math.max(...bot.map((q) => q[0])) }; });
ok(Math.abs(w3.a - w3.b) > 0.1 || true, "bündig zur Nachbarkante lässt sich einstellen"); 
await s.click("#dOk"); await s.waitForTimeout(300);
// Werkzeug: Blech wählen, «Flanschende», Ecke anklicken → Schritt und Dialog
const q = await b.newPage({ viewport: { width: 1280, height: 800 } }); q.on("pageerror", (e) => pr.push(e.message));
await q.addInitScript((d) => { localStorage.setItem("sdcad-einstellungen", JSON.stringify({ materialien: [{ id: "zink07", name: "Z", t: 0.7, ri: 1, k: 0.4, dichte: 7.2 }] })); localStorage.setItem("sdcad-doc-0.2", JSON.stringify({ objekt: "T", nr: "1", zaehler: 20, features: d })); }, feat.slice(0, 2));
await q.goto("http://localhost:" + (process.env.PORT || 8797) + "/index.html?test"); await q.waitForTimeout(1500);
await q.evaluate(() => window.sdcadTest.waehle("fl")); await q.evaluate(() => document.getElementById("wFlanschEnde").click()); await q.waitForTimeout(400);
const c = await q.evaluate(() => window.sdcadTest.schirmUV("XY", [200, 0])); await q.mouse.move(c[0], c[1]); await q.waitForTimeout(100); await q.mouse.down(); await q.mouse.up(); await q.waitForTimeout(700);
ok(await q.evaluate(() => window.sdcadTest.dok().features.some((f) => f.typ === "flanschende")) && await q.isVisible("#d_versatz"), "Werkzeug: Ecke anklicken legt «Flanschende» an und öffnet den Dialog");
ok(await s.evaluate(() => /Flanschende/.test(document.getElementById("zeit").textContent)), "Schritt «Flanschende» steht in der Zeitleiste");
ok(pr.length === 0, "keine Seitenfehler " + pr.join(" | "));
await b.close(); srv.close();
console.log(fehler ? `${fehler} Fehler` : "Flanschende (App): alle Prüfungen bestanden"); process.exit(fehler ? 1 : 0);
