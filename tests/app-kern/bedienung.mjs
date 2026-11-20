// App-Test Bedienung: Maus wie Fusion, kein 5-mm-Raster, Objektfang mit Fangzeichen (Endpunkt, Mittelpunkt)
// node tests/app-kern/bedienung.mjs (nach node build.mjs; Playwright/Chromium)
import { createServer } from "node:http";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { extname, join, resolve } from "node:path";
const dist = resolve("dist"), { chromium } = createRequire(import.meta.url)("playwright");
const typ = { ".html": "text/html", ".js": "text/javascript", ".wasm": "application/wasm", ".json": "application/json" };
const srv = createServer((q, a) => { let p, d; try { p = q.url === "/" ? "index.html" : decodeURIComponent(q.url.slice(1).split("?")[0]); d = readFileSync(join(dist, p)); } catch { a.writeHead(404); a.end(); return; } a.writeHead(200, { "content-type": typ[extname(p)] ?? "application/octet-stream" }); a.end(d); }).listen(8774);
let fehler = 0; const ok = (b, t) => { console.log(`${b ? "✓" : "✗"} ${t}`); if (!b) fehler++; };
const b = await chromium.launch(), s = await b.newPage({ viewport: { width: 1280, height: 760 } }), probleme = []; s.on("pageerror", (e) => probleme.push(e.message));
// Skizze mit zwei Punkten, dazu das alte Raster 5 in den Einstellungen (muss jetzt aus sein)
await s.addInitScript(() => {
  localStorage.setItem("sdcad-doc-0.2", JSON.stringify({ objekt: "B", nr: "B-1", zaehler: 5, features: [{ id: "sk", typ: "skizze", name: "Skizze 1", ebene: "XY", elemente: [{ id: 1, art: "linie", pts: [[-123.4, 10.3], [197.7, 10.3]] }] }] }));
  localStorage.setItem("sdcad-einstellungen", JSON.stringify({ materialien: [{ id: "zink07", name: "Titanzink 0.70", t: 0.7, ri: 1.0, k: 0.4, dichte: 7.2 }], skizze: { raster: 5, abstand: 80 } }));
});
await s.goto("http://localhost:8774/index.html?test"); await s.waitForTimeout(800);
ok(await s.evaluate(() => window.sdcadTest.raster() === 0), "Altes 5-mm-Raster ist aus");
await s.evaluate(() => window.sdcadTest.bearbeite("sk")); await s.waitForTimeout(800);
const mitte = await s.evaluate(() => window.sdcadTest.schirmUV("XY", [37.15, 10.3]));
const ende = await s.evaluate(() => window.sdcadTest.schirmUV("XY", [197.7, 10.3]));
const zeichen = async (p) => { await s.mouse.move(p[0] + 2, p[1] + 3, { steps: 3 }); await s.waitForTimeout(250); return s.evaluate(() => { const e = document.getElementById("fangZeichen"); return { sichtbar: !e.hidden, text: e.querySelector("span").textContent }; }); };
await s.click("#tLinie");
const z1 = await zeichen(mitte); ok(z1.sichtbar && z1.text === "Mittelpunkt", `Fangzeichen in der Linienmitte: «${z1.text}»`);
const z2 = await zeichen(ende); ok(z2.sichtbar && z2.text === "Endpunkt", `Fangzeichen am Linienende: «${z2.text}»`);
await s.mouse.move(mitte[0], mitte[1] - 120, { steps: 3 }); await s.waitForTimeout(250);
ok(await s.evaluate(() => document.getElementById("fangZeichen").hidden), "Ohne Fangpunkt in der Nähe: kein Zeichen");
// Kein Raster: ein Klick weit weg von Fangpunkten setzt den Punkt dorthin, nicht auf ein 5-mm-Vielfaches
await s.mouse.click(mitte[0] + 40, mitte[1] - 60); await s.mouse.move(mitte[0] + 120, mitte[1] - 90); await s.mouse.dblclick(mitte[0] + 120, mitte[1] - 90); await s.waitForTimeout(300);
const pts = await s.evaluate(() => window.sdcadTest.dok().features.find((f) => f.typ === "skizze").elemente.flatMap((e) => e.pts || []));
const neu = pts.filter((p) => !(Math.abs(p[1] - 10.3) < 1e-6));
ok(neu.length >= 1 && neu.some((p) => Math.abs(p[0] / 5 - Math.round(p[0] / 5)) > 0.02), `Kein 5-mm-Raster: neue Punkte ${JSON.stringify(neu.map((p) => p.map((v) => +v.toFixed(2))))}`);
// Mausrad gedrückt (mit/ohne Umschalt) in der 3D-Ansicht ohne Skizze
await s.evaluate(() => document.getElementById("zoomAlles").click()); await s.keyboard.press("Escape"); await s.waitForTimeout(100);
await s.click("#dAbbrechen").catch(() => {}); await s.evaluate(() => window.sdcadTest.beendeSkizze?.()); await s.waitForTimeout(400);
const c0 = await s.evaluate(() => window.sdcadTest.kamera()), bx = await s.locator("#leinwand").boundingBox(), px = bx.x + bx.width * 0.4, py = bx.y + bx.height * 0.6;
await s.mouse.move(px, py); await s.mouse.down({ button: "middle" }); await s.mouse.move(px + 120, py + 40, { steps: 6 }); await s.mouse.up({ button: "middle" }); await s.waitForTimeout(150);
const c1 = await s.evaluate(() => window.sdcadTest.kamera()), d = (a, b) => Math.hypot(...a.map((v, i) => v - b[i]));
ok(d(c0.ziel, c1.ziel) > 1, `Mausrad gedrückt verschiebt die Ansicht (Ziel bewegt um ${d(c0.ziel, c1.ziel).toFixed(1)} mm)`);
await s.keyboard.down("Shift"); await s.mouse.move(px, py); await s.mouse.down({ button: "middle" }); await s.mouse.move(px + 120, py + 40, { steps: 6 }); await s.mouse.up({ button: "middle" }); await s.keyboard.up("Shift"); await s.waitForTimeout(150);
const c2 = await s.evaluate(() => window.sdcadTest.kamera());
ok(d(c1.ziel, c2.ziel) < 1e-6 && d(c1.pos, c2.pos) > 1, `Umschalt + Mausrad gedrückt dreht um das Ziel (Kamera bewegt um ${d(c1.pos, c2.pos).toFixed(1)} mm, Ziel fest)`);
const cfg = await s.evaluate(() => window.sdcadTest.steuerung());
ok(cfg.damping === false && cfg.mitte === 2 && cfg.zoomZeiger === true, `Steuerung: keine Dämpfung, Mausrad = Verschieben, Umschalt tauscht auf Drehen, Zoom zum Zeiger (${JSON.stringify(cfg)})`);
ok(probleme.length === 0, "keine Seitenfehler " + probleme.join(" | "));
await b.close(); srv.close();
console.log(fehler ? `${fehler} Fehler` : "Bedienung: alle Prüfungen bestanden"); process.exit(fehler ? 1 : 0);
