// App-Test Blechprofil: nachträglich Flansch/Umschlag an Kante A und B ansetzen (Kanten-Werkzeug)
// node tests/app-kern/stirnflansch.mjs (nach node build.mjs; Playwright/Chromium)
import { createServer } from "node:http"; import { readFileSync } from "node:fs"; import { createRequire } from "node:module"; import { extname, join, resolve } from "node:path";
const dist = resolve("dist"), { chromium } = createRequire(import.meta.url)("playwright");
const typ = { ".html": "text/html", ".js": "text/javascript", ".wasm": "application/wasm", ".json": "application/json" };
const srv = createServer((q, a) => { let p, d; try { p = q.url === "/" ? "index.html" : decodeURIComponent(q.url.slice(1).split("?")[0]); d = readFileSync(join(dist, p)); } catch { a.writeHead(404); a.end(); return; } a.writeHead(200, { "content-type": typ[extname(p)] ?? "application/octet-stream" }); a.end(d); }).listen(+process.env.PORT || 8797);
let fehler = 0; const ok = (c, t) => { console.log(`${c ? "✓" : "✗"} ${t}`); if (!c) fehler++; };
const b = await chromium.launch(), s = await b.newPage({ viewport: { width: 1400, height: 900 } }), pr = []; s.on("pageerror", (e) => pr.push(e.message));
await s.addInitScript(() => { localStorage.setItem("sdcad-einstellungen", JSON.stringify({ materialien: [{ id: "zink07", name: "Titanzink 0.70", t: 0.7, ri: 1, k: 0.4, dichte: 7.2 }] }));
  localStorage.setItem("sdcad-doc-0.2", JSON.stringify({ objekt: "Muster", nr: "P-7", zaehler: 20, features: [
    { id: "sp", typ: "skizze", name: "Profil", ebene: "XY", elemente: [{ id: 1, art: "linie", pts: [[0, 0], [100, 0], [100, 60]], geschlossen: false }], bedingungen: [] },
    { id: "bp", typ: "blech", name: "Traufblech", skizze: "sp", kette: 0, lage: "mitte", material: "zink07", laenge: 1000, stueck: 3, richtung: "eine" }] })); });
await s.goto("http://localhost:" + (process.env.PORT || 8797) + "/index.html?test"); await s.waitForTimeout(1500);
await s.evaluate(() => document.getElementById("wPlan").click()); await s.waitForTimeout(800);
const plan = () => s.evaluate(() => window.sdcadTest.dok().plaene[0]);
const blatt = async (x, y) => s.evaluate(([a, c]) => { const svg = document.querySelector("#plFlaeche svg"), p = svg.createSVGPoint(); p.x = a; p.y = c; const q = p.matrixTransform(svg.getScreenCTM()); return [q.x, q.y]; }, [x, y]);
const ziehe = async (modus, [x1, y1], [x2, y2]) => { await s.click(`[data-modus="${modus}"]`); const a = await blatt(x1, y1), c = await blatt(x2, y2); await s.mouse.move(a[0], a[1]); await s.mouse.down(); await s.mouse.move(c[0], c[1], { steps: 6 }); await s.mouse.up(); await s.waitForTimeout(250); };
ok((await s.isVisible("#plStatus")) && /Zoom/.test(await s.textContent("#plStatus")), "Statuszeile unter dem Blatt (Position, Zoom, Raster, Werkzeug)");
// Zeichenelemente
await ziehe("rechteck", [50, 40], [101, 82]); await ziehe("linie", [50, 100], [120.3, 100.4]); await ziehe("kreis", [200, 60], [215, 60]); await ziehe("pfeil", [150, 150], [190, 150]);
let p = await plan(); ok(p.formen.length === 4 && p.formen.map((f) => f.art).join() === "rechteck,linie,kreis,pfeil", "Rechteck, Linie, Kreis und Pfeil gezeichnet (" + p.formen.map((f) => f.art) + ")");
ok(p.formen[1].x2 % 5 === 0 && p.formen[1].y2 % 5 === 0, `Fangraster 5 mm: Linienende ${p.formen[1].x2} / ${p.formen[1].y2}`);
// Auswahl, Eigenschaften, Verschieben
await s.click('[data-modus="auswahl"]'); const k = await blatt(50, 61); await s.mouse.click(k[0], k[1]); await s.waitForTimeout(250);
ok(await s.isVisible('#plEigen [data-e="staerke"]'), "Gewählte Form zeigt Linienart und -stärke");
await s.selectOption('#plEigen [data-e="linie"]', "strich"); await s.waitForTimeout(200); p = await plan(); ok(p.formen[0].linie === "strich", "Linienart gestrichelt eingestellt");
await s.mouse.move(k[0], k[1]); await s.mouse.down(); const k2 = await blatt(70, 81); await s.mouse.move(k2[0], k2[1], { steps: 6 }); await s.mouse.up(); await s.waitForTimeout(250); p = await plan();
ok(p.formen[0].x1 > 50 && p.formen[0].x1 % 5 === 0, `Form verschoben und gefangen (x1 ${p.formen[0].x1})`);
// Duplizieren, Entfernen, Rückgängig/Wiederholen
await s.click('[data-pl="kopie"]'); await s.waitForTimeout(250); p = await plan(); ok(p.formen.length === 5, "Duplizieren legt eine Kopie an");
await s.click('[data-pl="loeschen"]'); await s.waitForTimeout(250); p = await plan(); ok(p.formen.length === 4, "Entfernen");
await s.click("#plUndo"); await s.waitForTimeout(250); p = await plan(); ok(p.formen.length === 5, "Rückgängig stellt die Kopie wieder her");
await s.keyboard.press("Control+z"); await s.waitForTimeout(250); p = await plan(); ok(p.formen.length === 4, "Strg + Z macht das Duplizieren rückgängig");
await s.click("#plRedo"); await s.waitForTimeout(250); p = await plan(); ok(p.formen.length === 5, "Wiederholen");
// Positionsnummer
await s.click('[data-modus="ballon"]'); const bp = await blatt(260, 120); await s.mouse.click(bp[0], bp[1]); await s.waitForTimeout(250); p = await plan();
ok(p.texte.some((t) => t.ballon && t.text === "1") && (await s.evaluate(() => !!document.querySelector("#plFlaeche circle.ballon"))), "Positionsnummer 1 (Ballon) gesetzt");
// Tabellen aus dem Modell
await s.click("#plNeuTab"); await s.waitForTimeout(200); ok((await s.locator('#plTabMenue button').count()) === 2, "Tabellenmenü: Stückliste und Biegeliste");
await s.click('#plTabMenue [data-tab^="stueck"]'); await s.waitForTimeout(300);
let svg = await s.evaluate(() => document.querySelector("#plFlaeche svg").textContent);
ok(/Stückliste/.test(svg) && /Traufblech/.test(svg) && /Titanzink/.test(svg), "Stückliste mit Teil, Material und Zuschnitt");
await s.click("#plNeuTab"); await s.click('#plTabMenue [data-tab^="biege"]'); await s.waitForTimeout(300);
svg = await s.evaluate(() => document.querySelector("#plFlaeche svg").textContent); ok(/Biegeliste Traufblech/.test(svg) && /90\.0°/.test(svg), "Biegeliste mit Winkel und Anschlägen");
// Schriftfeld
await s.click('[data-modus="auswahl"]'); await s.mouse.click((await blatt(10, 5))[0], (await blatt(10, 5))[1]); await s.waitForTimeout(200);
await s.fill('#plEigen [data-s="zeichner"]', "M. Muster"); await s.dispatchEvent('#plEigen [data-s="zeichner"]', "change"); await s.waitForTimeout(250);
svg = await s.evaluate(() => document.querySelector("#plFlaeche svg").textContent); ok(/M\. Muster/.test(svg) && /GEZEICHNET/.test(svg), "Schriftfeld: Gezeichnet von erscheint im Blatt");
await s.screenshot({ path: "/tmp/t/plan2.png" });
ok(pr.length === 0, "keine Seitenfehler " + pr.join(" | "));
await b.close(); srv.close();
console.log(fehler ? `${fehler} Fehler` : "Planblatt Zeichenwerkzeuge/Tabellen (App): alle Prüfungen bestanden"); process.exit(fehler ? 1 : 0);
