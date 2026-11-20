// App-Test: Skizzen als Zeichnung im Plan (Layer-Farben/Linienarten), Auto-Bemassung, Druck/PDF-Blatt
// node tests/app-kern/plan2d.mjs (nach node build.mjs; Playwright/Chromium)
import { createServer } from "node:http"; import { readFileSync } from "node:fs"; import { createRequire } from "node:module"; import { extname, join, resolve } from "node:path";
const dist = resolve("dist"), { chromium } = createRequire(import.meta.url)("playwright");
const typ = { ".html": "text/html", ".js": "text/javascript", ".wasm": "application/wasm", ".json": "application/json" };
const srv = createServer((q, a) => { let p, d; try { p = q.url === "/" ? "index.html" : decodeURIComponent(q.url.slice(1).split("?")[0]); d = readFileSync(join(dist, p)); } catch { a.writeHead(404); a.end(); return; } a.writeHead(200, { "content-type": typ[extname(p)] ?? "application/octet-stream" }); a.end(d); }).listen(8792);
let fehler = 0; const ok = (c, t) => { console.log(`${c ? "✓" : "✗"} ${t}`); if (!c) fehler++; };
const b = await chromium.launch(), s = await b.newPage({ viewport: { width: 1280, height: 800 } }), pr = []; s.on("pageerror", (e) => pr.push(e.message));
const pj = { objekt: "P", nr: "P-1", zaehler: 10, layer: [{ id: "0", name: "0", aci: null, art: "durchgezogen", sichtbar: true }, { id: "m", name: "Achsen", aci: 1, art: "mittellinie", sichtbar: true }],
  features: [{ id: "sk", typ: "skizze", name: "Platte", ebene: "XY", elemente: [{ id: 1, art: "rechteck", a: [0, 0], b: [200, 100] }, { id: 2, art: "kreis", c: [100, 50], r: 20 }, { id: 3, art: "linie", pts: [[0, 50], [200, 50]], layer: "m" }] },
    { id: "bl", typ: "skizze", name: "Blechumriss", ebene: "XY", elemente: [{ id: 1, art: "rechteck", a: [300, 0], b: [400, 60] }] },
    { id: "fl", typ: "flaeche", name: "Blech 1", skizze: "bl", material: "zink07", flaechen: [[310, 10]], kanten: { "0:0": "ortgang" } }] };
await s.addInitScript((d) => { localStorage.setItem("sdcad-doc-0.2", JSON.stringify(d)); localStorage.setItem("sdcad-einstellungen", JSON.stringify({ materialien: [{ id: "zink07", name: "Z", t: 0.7, ri: 1, k: 0.4, dichte: 7.2 }] })); }, pj);
await s.goto("http://localhost:8792/index.html?test"); await s.waitForTimeout(900);
await s.evaluate(() => document.getElementById("wPlan").click()); await s.waitForTimeout(500);
await s.click("#plNeuAnsicht"); await s.waitForTimeout(150);
ok(await s.isVisible('[data-plskizze="sk"]'), "Menü «+ Ansicht» bietet die Skizze an");
await s.click('[data-plskizze="sk"]'); await s.waitForTimeout(400);
let svg = await s.innerHTML("#plFlaeche");
ok(/stroke:#e02424;stroke-dasharray:8 1\.5 1\.5 1\.5/.test(svg), "Layer «Achsen»: rot, Mittellinie im Plan");
await s.click("#plAutoMass"); await s.waitForTimeout(400);
svg = await s.innerHTML("#plFlaeche");
ok(/>200</.test(svg) && />100</.test(svg), "Auto-Bemassung: Gesamtmasse 200 und 100");
ok(/Ø40/.test(svg), "Auto-Bemassung: Kreis Ø40");
ok(/Platte 1:/.test(svg), "Beschriftung mit Skizzenname und Massstab");
// Zoomen und Verschieben
const vb = () => s.evaluate(() => document.querySelector("#plFlaeche svg").getAttribute("viewBox").split(" ").map(Number));
const bb = await s.locator("#plFlaeche svg").boundingBox(), v0 = await vb();
await s.mouse.move(bb.x + bb.width * 0.3, bb.y + bb.height * 0.3); await s.mouse.wheel(0, -400); await s.waitForTimeout(200);
const v1 = await vb(); ok(v1[2] < v0[2] * 0.7, `Mausrad zoomt hinein (Ausschnitt ${v0[2].toFixed(0)} → ${v1[2].toFixed(0)} mm)`);
await s.mouse.move(bb.x + bb.width * 0.8, bb.y + bb.height * 0.8); await s.mouse.down({ button: "middle" }); await s.mouse.move(bb.x + bb.width * 0.6, bb.y + bb.height * 0.7, { steps: 5 }); await s.mouse.up({ button: "middle" }); await s.waitForTimeout(200);
const v2 = await vb(); ok(Math.abs(v2[0] - v1[0]) > 5 && Math.abs(v2[2] - v1[2]) < 1e-6, `Mausrad gedrückt verschiebt das Blatt (x ${v1[0].toFixed(1)} → ${v2[0].toFixed(1)})`);
await s.mouse.move(bb.x + bb.width * 0.9, bb.y + bb.height * 0.5); await s.mouse.down(); await s.mouse.move(bb.x + bb.width * 0.7, bb.y + bb.height * 0.5, { steps: 5 }); await s.mouse.up(); await s.waitForTimeout(200);
const v3 = await vb(); ok(Math.abs(v3[0] - v2[0]) > 5, "Leere Fläche ziehen verschiebt das Blatt");
await s.click("#plZoomAlles"); await s.waitForTimeout(200); const v4 = await vb(); ok(v4[0] === 0 && v4[2] > v1[2] * 1.2, "«Blatt» zeigt wieder das ganze Blatt");
// Abwicklung im Plan
await s.click("#plNeuAnsicht"); await s.waitForTimeout(150);
ok(await s.isVisible("[data-plabw]"), "Menü «+ Ansicht» bietet die Abwicklung des Blechs an");
await s.click("[data-plabw]"); await s.waitForTimeout(400);
svg = await s.innerHTML("#plFlaeche"); ok(/Abwicklung Blech 1/.test(svg) && /stroke:#e02424/.test(svg), "Abwicklung im Plan mit roten Biegelinien");
// grössere Formate
await s.selectOption("#plFormat", "A1"); await s.waitForTimeout(300); ok((await vb())[2] === 841, "Format A1 quer (841 × 594 mm) einstellbar");
await s.selectOption("#plFormat", "A3"); await s.waitForTimeout(200);
// Fangmarke beim Bemassen: Zeiger nahe an einem Eckpunkt zeigt die orange Marke
await s.click('[data-modus="mass"]'); await s.waitForTimeout(150);
const eck = await s.evaluate(() => { const svg = document.querySelector("#plFlaeche svg"), p = svg.querySelector("path.sichtbar"); const d = p.getAttribute("d").match(/M([\d.]+) ([\d.]+)/), g = p.closest("g"), t = g.getAttribute("transform").match(/translate\(([\d.]+) ([\d.]+)\)/), pt = svg.createSVGPoint(); pt.x = +d[1] + +t[1]; pt.y = +d[2] + +t[2]; const q = pt.matrixTransform(svg.getScreenCTM()); return [q.x, q.y]; });
await s.mouse.move(eck[0] + 6, eck[1] + 5, { steps: 4 }); await s.waitForTimeout(200);
ok(await s.locator("#plFangZ").count() === 1, "Beim Bemassen zeigt eine orange Marke den Fangpunkt (auch ca. 8 px daneben)");
ok(await s.isVisible("#plDruck"), "Knopf «Drucken / PDF» vorhanden");
ok(pr.length === 0, "keine Seitenfehler " + pr.join(" | "));
await b.close(); srv.close();
console.log(fehler ? `${fehler} Fehler` : "Skizze im Plan: alle Prüfungen bestanden"); process.exit(fehler ? 1 : 0);
