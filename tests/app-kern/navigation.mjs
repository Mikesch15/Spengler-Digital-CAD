// App-Test Navigation bei grossen Modellen: Zoom zur Oberfläche, Mindestabstand (nicht durch die Wand), Ziel in Bildmitte
// node tests/app-kern/navigation.mjs (nach node build.mjs; Playwright/Chromium)
import { createServer } from "node:http"; import { readFileSync } from "node:fs"; import { createRequire } from "node:module"; import { extname, join, resolve } from "node:path";
const dist = resolve("dist"), { chromium } = createRequire(import.meta.url)("playwright");
const typ = { ".html": "text/html", ".js": "text/javascript", ".wasm": "application/wasm", ".json": "application/json" };
const srv = createServer((q, a) => { let p, d; try { p = q.url === "/" ? "index.html" : decodeURIComponent(q.url.slice(1).split("?")[0]); d = readFileSync(join(dist, p)); } catch { a.writeHead(404); a.end(); return; } a.writeHead(200, { "content-type": typ[extname(p)] ?? "application/octet-stream" }); a.end(d); }).listen(+process.env.PORT || 8797);
let fehler = 0; const ok = (c, t) => { console.log(`${c ? "✓" : "✗"} ${t}`); if (!c) fehler++; };
const b = await chromium.launch(), s = await b.newPage({ viewport: { width: 1280, height: 800 } }), pr = []; s.on("pageerror", (e) => pr.push(e.message));
await s.addInitScript(() => localStorage.setItem("sdcad-doc-0.2", JSON.stringify({ objekt: "T", nr: "1", zaehler: 9, features: [{ id: "g1", typ: "gebaeude", name: "Gebäude 1", breite: 20000, tiefe: 12000, traufhoehe: 6000, wandstaerke: 300, x: 0, z: 0 }, { id: "d1", typ: "dach", name: "Dach 1", gebaeude: "g1", form: "sattel", firstRichtung: "laengs", neigung: 35, neigung2: 35, ueberstandTraufe: 400, ueberstandOrtgang: 300, deckung: "schiebeziegel", aufbau: "standard-200", darstellung: "platte" }] })));
await s.goto("http://localhost:" + (process.env.PORT || 8797) + "/index.html?test"); await s.waitForTimeout(1500);
await s.evaluate(() => document.getElementById("zoomAlles").click()); await s.waitForTimeout(400);
const box = await s.evaluate(() => { const r = document.querySelector("canvas").getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
await s.mouse.move(box.x, box.y);
const a0 = (await s.evaluate(() => window.sdcadTest.kameraZiel())).abstand;
ok(a0 > 5000, "Ausgangslage: Abstand zur Oberfläche in Bildmitte " + Math.round(a0) + " mm");
for (let i = 0; i < 25; i++) await s.mouse.wheel(0, -600);
await s.waitForTimeout(200);
const z = await s.evaluate(() => window.sdcadTest.kameraZiel());
ok(z.abstand !== null && z.abstand >= z.min * 0.9 && z.abstand < 400, `Nach 25 grossen Rad-Schritten hinein: noch vor der Oberfläche (Abstand ${z.abstand?.toFixed(1)} mm, Mindestabstand ${z.min.toFixed(1)} mm) – nicht durch die Wand`);
const hit = await s.evaluate(() => window.sdcadTest.kameraZiel());
ok(hit.abstand > 1, "Kamera steckt nicht im Körper (Treffer in Blickrichtung vor der Kamera)");
for (let i = 0; i < 25; i++) await s.mouse.wheel(0, 600);
await s.waitForTimeout(200);
const zz = await s.evaluate(() => window.sdcadTest.kameraZiel()), kdist = Math.hypot(...zz.kamera);
ok(kdist < 2e6, "Herauszoomen ist begrenzt (Kameraabstand " + Math.round(kdist) + " mm)");
ok(pr.length === 0, "keine Seitenfehler " + pr.join(" | "));
await b.close(); srv.close();
console.log(fehler ? `${fehler} Fehler` : "Navigation (App): alle Prüfungen bestanden"); process.exit(fehler ? 1 : 0);
