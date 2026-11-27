// App-Test Loft exakt: zwei Profile (Quadrat unten, kleineres Quadrat oben) → exakter Loftkörper mit plausiblem Volumen
import { createServer } from "node:http"; import { readFileSync } from "node:fs"; import { createRequire } from "node:module"; import { extname, join, resolve } from "node:path";
const dist = resolve("dist"), { chromium } = createRequire(import.meta.url)("playwright");
const typ = { ".html": "text/html", ".js": "text/javascript", ".wasm": "application/wasm", ".json": "application/json" };
const srv = createServer((q, a) => { let p, d; try { p = q.url === "/" ? "index.html" : decodeURIComponent(q.url.slice(1).split("?")[0]); d = readFileSync(join(dist, p)); } catch { a.writeHead(404); a.end(); return; } a.writeHead(200, { "content-type": typ[extname(p)] || "application/octet-stream" }); a.end(d); }).listen(process.env.PORT || 8797);
let fehler = 0; const ok = (c, t) => { console.log(`${c ? "✓" : "✗"} ${t}`); if (!c) fehler++; };
const b = await chromium.launch(), pr = [];
const doc = { objekt: "T", nr: "1", zaehler: 20, features: [
  { id: "s1", typ: "skizze", name: "unten", ebene: "XY", elemente: [{ id: 1, art: "rechteck", a: [-50, -50], b: [50, 50] }], bedingungen: [] },
  { id: "e1", typ: "ebene", art: "versatz", name: "oben", ref: "XY", abstand: 100 },
  { id: "s2", typ: "skizze", name: "oben", ebene: "e1", elemente: [{ id: 1, art: "rechteck", a: [-20, -20], b: [20, 20] }], bedingungen: [] },
  { id: "l1", typ: "loft", name: "Loft", profil1: "s1", profil2: "s2" }] };
const s = await b.newPage({ viewport: { width: 1280, height: 800 } }); s.on("pageerror", (e) => pr.push(e.message));
await s.addInitScript((d) => { localStorage.setItem("sdcad-doc-0.2", JSON.stringify(d)); localStorage.setItem("sdcad-einstellungen", JSON.stringify({ programm: { kern: "occt" }, materialien: [{ id: "zink07", name: "Z", t: 0.7, ri: 1, k: 0.4, dichte: 7.2 }] })); }, doc);
await s.goto("http://localhost:" + (process.env.PORT || 8797) + "/index.html?test");
await s.waitForFunction(() => /Exakt aus dem CAD-Kern/.test(document.getElementById("status").textContent), null, { timeout: 90000 }); await s.waitForTimeout(500);
const r = await s.evaluate(() => ({ st: document.getElementById("status").textContent, k: window.sdcadTest.koerper().filter((k) => String(k.fid).startsWith("l1")).map((k) => Math.abs(k.volumen)) }));
const erwartet = (100 / 3) * (100 * 100 + 40 * 40 + Math.sqrt(100 * 100 * 40 * 40)); // Pyramidenstumpf
ok(r.k.length === 1 && Math.abs(r.k[0] - erwartet) / erwartet < 0.03, `Loft exakt, Volumen ${r.k[0]?.toFixed(0)} mm³ (Pyramidenstumpf ${erwartet.toFixed(0)})`);
ok(!/Loft/.test(r.st), "Meldung nennt keinen Loft als «noch nicht exakt» (" + r.st.slice(0, 100) + ")");
ok(pr.length === 0, "keine Seitenfehler " + pr.join(" | "));
await b.close(); srv.close();
console.log(fehler ? `${fehler} Fehler` : "Loft exakt (App): alle Prüfungen bestanden"); process.exit(fehler ? 1 : 0);
