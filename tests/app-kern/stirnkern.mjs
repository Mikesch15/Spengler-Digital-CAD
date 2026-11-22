// App-Test Blechprofil: nachträglich Flansch/Umschlag an Kante A und B ansetzen (Kanten-Werkzeug)
// node tests/app-kern/stirnflansch.mjs (nach node build.mjs; Playwright/Chromium)
import { createServer } from "node:http"; import { readFileSync } from "node:fs"; import { createRequire } from "node:module"; import { extname, join, resolve } from "node:path";
const dist = resolve("dist"), { chromium } = createRequire(import.meta.url)("playwright");
const typ = { ".html": "text/html", ".js": "text/javascript", ".wasm": "application/wasm", ".json": "application/json" };
const srv = createServer((q, a) => { let p, d; try { p = q.url === "/" ? "index.html" : decodeURIComponent(q.url.slice(1).split("?")[0]); d = readFileSync(join(dist, p)); } catch { a.writeHead(404); a.end(); return; } a.writeHead(200, { "content-type": typ[extname(p)] ?? "application/octet-stream" }); a.end(d); }).listen(+process.env.PORT || 8797);
let fehler = 0; const ok = (c, t) => { console.log(`${c ? "✓" : "✗"} ${t}`); if (!c) fehler++; };
const b = await chromium.launch(), s = await b.newPage({ viewport: { width: 1280, height: 800 } }), pr = []; s.on("pageerror", (e) => pr.push(e.message));
await s.addInitScript(() => { localStorage.setItem("sdcad-einstellungen", JSON.stringify({ materialien: [{ id: "zink07", name: "Z", t: 0.7, ri: 1, k: 0.4, dichte: 7.2 }], programm: { kern: "occt" } }));
  localStorage.setItem("sdcad-doc-0.2", JSON.stringify({ objekt: "T", nr: "1", zaehler: 9, features: [
  { id: "s1", typ: "skizze", name: "Skizze 1", ebene: "XY", elemente: [{ id: 1, art: "linie", pts: [[0, 0], [100, 0], [100, 60]], geschlossen: false }], bedingungen: [] },
  { id: "b1", typ: "blech", name: "Blechprofil 1", skizze: "s1", kette: 0, lage: "mitte", material: "zink07", laenge: 300, stueck: 1, richtung: "eine" },
  { id: "pk", typ: "profilkante", name: "Flansch Stirn", ziel: "b1", ende: "S1", schenkel: 1, wert: { werkzeug: { typ: "flansch", winkel: 90, laenge: 25, radius: 1, bezug: "mitte", seite: 1 } } }] })); });
await s.goto("http://localhost:" + (process.env.PORT || 8797) + "/index.html?test");
await s.waitForFunction(() => /Exakt aus dem CAD-Kern|CAD-Kern:/.test(document.getElementById("status").textContent), null, { timeout: 90000 }); await s.waitForTimeout(1500);
const n = await s.evaluate(() => ({ koerper: window.sdcadTest.koerper().filter((k) => k.fid === "b1").length, vol: window.sdcadTest.koerper().filter((k) => k.fid === "b1").reduce((a, k) => a + Math.abs(k.volumen), 0), st: document.getElementById("status").textContent }));
ok(n.koerper >= 2, `Nach dem exakten Kernlauf bleibt die Stirnlasche sichtbar (${n.koerper} Körper, Volumen ${Math.round(n.vol)})`);
ok(n.vol > 300 * 0.7 * 160 + 25 * 100 * 0.7 * 0.9, "Volumen enthält die Lasche (> Profil allein)");
ok(pr.length === 0, "keine Seitenfehler " + pr.join(" | "));
await b.close(); srv.close();
console.log(fehler ? `${fehler} Fehler` : "Stirnlasche + exakter Kern (App): alle Prüfungen bestanden"); process.exit(fehler ? 1 : 0);
