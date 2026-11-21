// App-Test Dach aus Skizzen (Variante C): automatisches Dach in Skizzen auf geneigten Ebenen umwandeln, mm-genau bearbeiten
// node tests/app-kern/dachflaechen.mjs (nach node build.mjs; Playwright/Chromium)
import { createServer } from "node:http"; import { readFileSync } from "node:fs"; import { createRequire } from "node:module"; import { extname, join, resolve } from "node:path";
const dist = resolve("dist"), { chromium } = createRequire(import.meta.url)("playwright");
const typ = { ".html": "text/html", ".js": "text/javascript", ".wasm": "application/wasm", ".json": "application/json" };
const srv = createServer((q, a) => { let p, d; try { p = q.url === "/" ? "index.html" : decodeURIComponent(q.url.slice(1).split("?")[0]); d = readFileSync(join(dist, p)); } catch { a.writeHead(404); a.end(); return; } a.writeHead(200, { "content-type": typ[extname(p)] ?? "application/octet-stream" }); a.end(d); }).listen(8797);
let fehler = 0; const ok = (c, t) => { console.log(`${c ? "✓" : "✗"} ${t}`); if (!c) fehler++; };
const b = await chromium.launch(), s = await b.newPage({ viewport: { width: 1280, height: 800 } }), pr = []; s.on("pageerror", (e) => pr.push(e.message));
await s.goto("http://localhost:8797/index.html?test"); await s.waitForTimeout(900);
await s.evaluate(() => document.getElementById("wDachAuto").click()); await s.waitForSelector("#d_quelle", { timeout: 6000 }); await s.waitForTimeout(500);
const info = () => s.textContent("#dInfo"), a0 = (await info()).match(/Dachfläche ([\d.]+) m²/)?.[1];
await s.selectOption("#d_quelle", "skizzen"); await s.waitForSelector("#d_fAdd", { timeout: 6000 }); await s.waitForTimeout(800);
const a1 = (await info()).match(/Dachfläche ([\d.]+) m²/)?.[1];
ok(a0 && a0 === a1 && !/⚠/.test(await info()), `Umwandlung in Skizzen: gleiche Dachfläche (${a0} → ${a1} m²), keine Warnung`);
let doc = await s.evaluate(() => window.sdcadTest.dok()), dach = doc.features.find((f) => f.typ === "dach");
ok(dach.quelle === "skizzen" && dach.flaechenSkizzen.length === 2 && doc.features.filter((f) => f.typ === "ebene" && f.art === "punkte").length === 2, "Dach hat 2 Dachflächen-Skizzen auf Ebenen durch 3 Punkte");
const sk = doc.features.find((f) => f.id === dach.flaechenSkizzen[0]); ok(sk.elemente[0].pts.length === 4 && sk.elemente[0].geschlossen, "Skizze der Dachfläche: geschlossenes Vieleck mit 4 Ecken");
await s.click("#dOk"); await s.waitForTimeout(400);
// Eine Ecke am First um 20 mm verschieben: Warnung über die gemeinsame Kante
const sk0 = JSON.parse(JSON.stringify(doc.features.find((f) => f.id === dach.flaechenSkizzen[0]))), P = sk0.elemente[0].pts, k = P.map((p) => p[1]).indexOf(Math.max(...P.map((p) => p[1])));
const sk1 = JSON.stringify(doc).replace(JSON.stringify(P), JSON.stringify(P.map((p, i) => (i === k ? [p[0] + 20, p[1]] : p))));
await s.close(); const s2 = await b.newPage({ viewport: { width: 1280, height: 800 } }), pr2 = []; s2.on("pageerror", (e) => pr2.push(e.message));
await s2.addInitScript((d) => localStorage.setItem("sdcad-doc-0.2", d), sk1); await s2.goto("http://localhost:8797/index.html?test"); await s2.waitForTimeout(1200);
await s2.evaluate((id) => window.sdcadTest.bearbeite(id), dach.id); await s2.waitForSelector("#d_quelle", { timeout: 6000 }); await s2.waitForTimeout(600);
const i2 = await s2.textContent("#dInfo"); ok(/gemeinsame Kante weicht um/.test(i2), "Verschobene Ecke: Warnung «gemeinsame Kante weicht ab» – " + i2.slice(0, 110));
// Weitere Teile rechnen auf den Skizzen-Flächen weiter
await s2.click("#dOk"); await s2.waitForTimeout(500);
await s2.evaluate((id) => window.sdcadTest.waehle(id), dach.id); await s2.waitForTimeout(300);
ok(/Sparren/.test(await s2.textContent("#werkstatt")), "Holzliste aus den Skizzen-Dachflächen");
ok(pr.length === 0 && pr2.length === 0, "keine Seitenfehler " + pr.concat(pr2).join(" | "));
await b.close(); srv.close();
console.log(fehler ? `${fehler} Fehler` : "Dachflächen aus Skizzen (App): alle Prüfungen bestanden"); process.exit(fehler ? 1 : 0);
