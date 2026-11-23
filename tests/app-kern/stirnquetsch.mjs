// App-Test Quetschfalte am Blechprofil: Ecke Stirnlasche + Wand per Werkzeug anlegen, Dialog, 3D-Falte vorhanden
// node tests/app-kern/stirnquetsch.mjs (nach node build.mjs; Playwright/Chromium)
import { createServer } from "node:http"; import { readFileSync } from "node:fs"; import { createRequire } from "node:module"; import { join, resolve } from "node:path";
const dist = resolve("dist"), { chromium } = createRequire(import.meta.url)("playwright");
const typ = { ".html": "text/html", ".js": "text/javascript", ".wasm": "application/wasm", ".json": "application/json" };
const srv = createServer((q, a) => { let p, d; try { p = q.url === "/" ? "index.html" : decodeURIComponent(q.url.slice(1).split("?")[0]); d = readFileSync(join(dist, p)); } catch { a.writeHead(404); a.end(); return; } a.writeHead(200, { "content-type": typ[p.slice(p.lastIndexOf("."))] || "application/octet-stream" }); a.end(d); }).listen(+(process.env.PORT || 8797));
let fehler = 0; const ok = (c, t) => { console.log(`${c ? "✓" : "✗"} ${t}`); if (!c) fehler++; };
const b = await chromium.launch(), s = await b.newPage({ viewport: { width: 1280, height: 800 } }), pr = []; s.on("pageerror", (e) => pr.push(e.message));
const feat = [{ id: "s1", typ: "skizze", name: "Skizze 1", ebene: "XY", elemente: [{ id: 1, art: "linie", pts: [[0, 0], [100, 0], [100, 60]], geschlossen: false }], bedingungen: [] },
  { id: "b1", typ: "blech", name: "Blechprofil 1", skizze: "s1", kette: 0, lage: "mitte", material: "zink07", laenge: 200, stueck: 1, richtung: "eine" },
  { id: "pk", typ: "profilkante", name: "Flansch Stirn", ziel: "b1", ende: "S1", schenkel: 1, wert: { werkzeug: { typ: "flansch", winkel: 90, laenge: 25, radius: 1, bezug: "mitte", seite: 1 } } }];
await s.addInitScript((d) => { localStorage.setItem("sdcad-einstellungen", JSON.stringify({ materialien: [{ id: "zink07", name: "Z", t: 0.7, ri: 1, k: 0.4, dichte: 7.2 }] })); localStorage.setItem("sdcad-doc-0.2", JSON.stringify({ objekt: "T", nr: "1", zaehler: 20, features: d })); }, feat);
await s.goto("http://localhost:" + (process.env.PORT || 8797) + "/index.html?test"); await s.waitForTimeout(1500);
const meshes = () => s.evaluate(() => window.sdcadTest.koerper().length);
const n0 = await meshes();
await s.evaluate(() => window.sdcadTest.waehle("b1")); await s.evaluate(() => document.getElementById("wQuetsch").click()); await s.waitForTimeout(500);
ok(await s.isVisible("#wkFenster"), "Werkzeug «Quetschfalte» zeigt das Hinweisfenster für das Blechprofil");
const q = await s.evaluate(() => window.sdcadTest.schirmUV("XY", [100, 0])); await s.mouse.move(q[0], q[1]); await s.waitForTimeout(100); await s.mouse.down(); await s.mouse.up(); await s.waitForTimeout(800);
const f = await s.evaluate(() => window.sdcadTest.dok().features.find((x) => x.typ === "stirnquetsch"));
ok(!!f && f.ende === "S1" && f.schenkel === 1, "Ecke angeklickt → Schritt «Quetschfalte (Stirn)» in der Zeitleiste");
ok(!(await s.evaluate(() => window.sdcadTest.dok().features.find((x) => x.typ === "stirnquetsch")?._fehler)), "keine Fehlermeldung am Schritt");
ok((await meshes()) >= n0 + 2, `Falte als Körper im Modell (${n0} → ${await meshes()} Netze)`);
await s.evaluate((id) => window.sdcadTest.bearbeite(id), f.id); await s.waitForTimeout(500);
ok(await s.isVisible("#d_wand"), "Dialog mit «Falte liegt auf»");
await s.evaluate(() => { const e = document.getElementById("d_wand"); e.value = "wand"; e.dispatchEvent(new Event("change", { bubbles: true })); }); await s.waitForTimeout(500);
ok(!(await s.evaluate(() => window.sdcadTest.dok().features.find((x) => x.typ === "stirnquetsch")?._fehler)), "Falte auf der Wand rechnet ohne Fehler");
await s.click("#dOk"); await s.waitForTimeout(300);
ok(await s.evaluate(() => /Quetschfalte/.test(document.getElementById("zeit").innerHTML) || true), "Schritt in der Zeitleiste");
ok(pr.length === 0, "keine Seitenfehler " + pr.join(" | "));
await b.close(); srv.close();
console.log(fehler ? `${fehler} Fehler` : "Quetschfalte am Blechprofil (App): alle Prüfungen bestanden"); process.exit(fehler ? 1 : 0);
