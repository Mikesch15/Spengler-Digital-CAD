// App-Test Blechprofil: nachträglich Flansch/Umschlag an Kante A und B ansetzen (Kanten-Werkzeug)
// node tests/app-kern/stirnflansch.mjs (nach node build.mjs; Playwright/Chromium)
import { createServer } from "node:http"; import { readFileSync } from "node:fs"; import { createRequire } from "node:module"; import { extname, join, resolve } from "node:path";
const dist = resolve("dist"), { chromium } = createRequire(import.meta.url)("playwright");
const typ = { ".html": "text/html", ".js": "text/javascript", ".wasm": "application/wasm", ".json": "application/json" };
const srv = createServer((q, a) => { let p, d; try { p = q.url === "/" ? "index.html" : decodeURIComponent(q.url.slice(1).split("?")[0]); d = readFileSync(join(dist, p)); } catch { a.writeHead(404); a.end(); return; } a.writeHead(200, { "content-type": typ[extname(p)] ?? "application/octet-stream" }); a.end(d); }).listen(+process.env.PORT || 8797);
let fehler = 0; const ok = (c, t) => { console.log(`${c ? "✓" : "✗"} ${t}`); if (!c) fehler++; };
const b = await chromium.launch(), s = await b.newPage({ viewport: { width: 1280, height: 800 } }), pr = []; s.on("pageerror", (e) => pr.push(e.message));
await s.addInitScript(() => { localStorage.setItem("sdcad-einstellungen", JSON.stringify({ materialien: [{ id: "zink07", name: "Z", t: 0.7, ri: 1, k: 0.4, dichte: 7.2 }] }));
  localStorage.setItem("sdcad-doc-0.2", JSON.stringify({ objekt: "T", nr: "1", zaehler: 20, features: [
    { id: "sk", typ: "skizze", name: "Rechteck", ebene: "XY", elemente: [{ id: 1, art: "rechteck", a: [0, 0], b: [200, 120] }], bedingungen: [] },
    { id: "fl", typ: "flaeche", name: "Blech 1", skizze: "sk", material: "zink07", flaechen: [[10, 10]], kanten: { "0:0": "ortgang", "0:3": "ortgang" } }] })); });
await s.goto("http://localhost:" + (process.env.PORT || 8797) + "/index.html?test"); await s.waitForTimeout(1800);
const P = await s.evaluate(() => window.sdcadTest.meshPunkte("fl"));
// Wand der unteren Kante: Punkte oberhalb der Biegung (z > 5), nahe der Ecke (x < 6), Dicke in y
const wand = P.filter((p) => p[2] > 5 && p[0] > 0.2 && p[0] < 6 && p[1] < 3 && p[1] > -1); // Wand A ohne die Stirn der Nachbarwand (x < 0.2)
const proY = new Map(); for (const p of wand) { const k = Math.round(p[1] * 10) / 10; proY.set(k, Math.min(proY.get(k) ?? 1e9, p[0])); }
const ys = [...proY.keys()].sort((a, c) => a - c), mins = [proY.get(ys[0]), proY.get(ys.at(-1))]; // Aussen- und Innenfläche der Wand
ok(ys.length >= 2, `Wand der unteren Kante gefunden (${proY.size} Dickenlagen)`);
ok(Math.max(...mins) - Math.min(...mins) < 0.02 && Math.abs(mins[0] - 0.35) < 0.03, `Gehrung: Stirnfläche steht 90° zum Blech (über die Blechstärke gleiche Endlage) und trifft die Innenfläche der Nachbarwand bei x = t/2 (${[...proY.entries()].map(([y, x]) => y + ":" + x.toFixed(2)).join(" ")})`);
// Freistellung: nur die Biegezone wird ausgeschnitten, die Wand der Gehrung bleibt unverändert (Vergleich mit freistellung = keine)
{ const wand = async (frei) => { const p2 = await b.newPage({ viewport: { width: 1280, height: 800 } });
    await p2.addInitScript((frei) => { localStorage.setItem("sdcad-einstellungen", JSON.stringify({ materialien: [{ id: "zink07", name: "Z", t: 0.7, ri: 1, k: 0.4, dichte: 7.2 }] }));
      localStorage.setItem("sdcad-doc-0.2", JSON.stringify({ objekt: "T", nr: "1", zaehler: 20, features: [
        { id: "sk", typ: "skizze", name: "Rechteck", ebene: "XY", elemente: [{ id: 1, art: "rechteck", a: [0, 0], b: [200, 120] }], bedingungen: [] },
        { id: "fl", typ: "flaeche", name: "Blech 1", skizze: "sk", material: "zink07", flaechen: [[10, 10]], kanten: { "0:0": "abk-o", "0:1": "abk-o", "0:2": "abk-o", "0:3": "abk-o" }, ...(frei ? { freistellung: "keine" } : {}) }] })); }, frei);
    await p2.goto("http://localhost:" + (process.env.PORT || 8797) + "/index.html?test"); await p2.waitForTimeout(1800);
    const Q = await p2.evaluate(() => window.sdcadTest.meshPunkte("fl")); await p2.close(); return Q.filter((p) => p[2] > 29.9); };
  // Die runde Freistellung schneidet das Netz im Eckbereich neu auf (neue Netzpunkte an den Schnittkanten); die Wand der Gehrung selbst bleibt unverändert: gleiche Ausdehnung der Oberkante der Wand
  const huelle = (P) => [0, 1, 2].map((i) => [Math.min(...P.map((p) => p[i])), Math.max(...P.map((p) => p[i]))]), mitP = await wand(false), ohneP = await wand(true), hm = huelle(mitP), ho = huelle(ohneP);
  const abw = hm.flat().filter((v, i) => Math.abs(v - ho.flat()[i]) > 0.05).length, mit = { size: mitP.length };
  ok(mit.size >= 8 && abw === 0, `Freistellung ändert die Ausdehnung der Wand der Gehrung nicht (${mit.size} Wandpunkte, ${abw} abweichende Grenzwerte)`); }
ok(pr.length === 0, "keine Seitenfehler " + pr.join(" | "));
await b.close(); srv.close();
console.log(fehler ? `${fehler} Fehler` : "Gehrung ohne Schnitt durch die Blechstärke (App): alle Prüfungen bestanden"); process.exit(fehler ? 1 : 0);
