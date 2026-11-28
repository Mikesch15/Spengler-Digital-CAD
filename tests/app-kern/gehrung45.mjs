// App-Test «Gehrung 45° über die ganze Höhe»: Kasten aus zwei Flanschen – Wandenden und Biegebereich liegen in derselben Ebene (kein Absatz, kein Spickel)
import { createServer } from "node:http"; import { readFileSync } from "node:fs"; import { createRequire } from "node:module"; import { extname, join, resolve } from "node:path";
const dist = resolve("dist"), { chromium } = createRequire(import.meta.url)("playwright");
const typ = { ".html": "text/html", ".js": "text/javascript", ".wasm": "application/wasm", ".json": "application/json" };
const srv = createServer((q, a) => { let p, d; try { p = q.url === "/" ? "index.html" : decodeURIComponent(q.url.slice(1).split("?")[0]); d = readFileSync(join(dist, p)); } catch { a.writeHead(404); a.end(); return; } a.writeHead(200, { "content-type": typ[extname(p)] || "application/octet-stream" }); a.end(d); }).listen(process.env.PORT || 8797);
let fehler = 0; const ok = (c, t) => { console.log(`${c ? "✓" : "✗"} ${t}`); if (!c) fehler++; };
const b = await chromium.launch(), pr = [];
const lauf = async (ecken, mass = 0) => { const s = await b.newPage({ viewport: { width: 1280, height: 800 } }); s.on("pageerror", (e) => pr.push(e.message));
  await s.addInitScript(([e, m]) => { localStorage.setItem("sdcad-einstellungen", JSON.stringify({ materialien: [{ id: "zink07", name: "Z", t: 0.7, ri: 1.5, k: 0.4, dichte: 7.2 }] })); localStorage.setItem("sdcad-doc-0.2", JSON.stringify({ objekt: "T", nr: "1", zaehler: 20, features: [
    { id: "sk", typ: "skizze", name: "R", ebene: "XY", elemente: [{ id: 1, art: "rechteck", a: [0, 0], b: [200, 120] }], bedingungen: [] },
    { id: "fl", typ: "flaeche", name: "Kasten", skizze: "sk", material: "zink07", flaechen: [[10, 10]], kanten: { "0:0": "abk-o", "0:3": "abk-o" }, ecken: e, freistellungMass: m }] })); }, [ecken, mass]);
  await s.goto("http://localhost:" + (process.env.PORT || 8797) + "/index.html?test"); await s.waitForTimeout(1800);
  const r = await s.evaluate(() => { const P = window.sdcadTest.meshPunkte("fl").filter((p) => Math.abs(p[0]) < 3 && Math.abs(p[1]) < 3), runde = (v) => +v.toFixed(2); return { oben: [...new Set(P.filter((p) => p[2] > 29.9).map((p) => p.map(runde).join(",")))], mitte: P.filter((p) => p[2] > 3 && p[2] < 29.9).length, loch: window.sdcadTest.blechDaten("fl")?.[0]?.lochB || 0, fehl: window.sdcadTest.dok().features.map((x) => x._fehler).filter(Boolean) }; }); await s.close(); return r; };
const g45 = await lauf("gehrung45"), g = await lauf("gehrung");
ok(g45.fehl.length === 0, `Gehrung 45° rechnet ohne Fehler ${g45.fehl.join(";")}`);
const diag = g45.oben.map((q) => q.split(",").map(Number)).filter((p) => Math.abs(p[0] - p[1]) < 0.05); // Punkte der Oberkante auf der Winkelhalbierenden x = y
ok(diag.length >= 2, `Oberkante der Wände läuft auf der 45°-Ebene durch die Ecke (${diag.length} Punkte mit x = y)`);
ok(g45.oben.length > 0 && g.oben.length > 0, `Oberkante vorhanden (45°: ${g45.oben.length}, Stoss-Gehrung: ${g.oben.length} Punkte)`);
const klein = await lauf("gehrung", 1);
ok(Math.abs(g.loch - 2.2) < 0.15 && Math.abs(klein.loch - 1) < 0.15, `Freistellung bei 90°-Schnittkanten: Viereck mit Seite ${g.loch.toFixed(1)} mm (= Biegeradius + Blechstärke), mit Vorgabe 1 mm: ${klein.loch.toFixed(1)} mm`);
ok(pr.length === 0, "keine Seitenfehler " + pr.join(" | "));
await b.close(); srv.close();
console.log(fehler ? `${fehler} Fehler` : "Gehrung 45° (App): alle Prüfungen bestanden"); process.exit(fehler ? 1 : 0);
