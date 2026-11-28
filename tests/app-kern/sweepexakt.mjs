// App-Test Sweep exakt: Rechteckprofil entlang einer Linie bzw. eines Linienzugs mit Knick
import { createServer } from "node:http"; import { readFileSync } from "node:fs"; import { createRequire } from "node:module"; import { extname, join, resolve } from "node:path";
const dist = resolve("dist"), { chromium } = createRequire(import.meta.url)("playwright");
const typ = { ".html": "text/html", ".js": "text/javascript", ".wasm": "application/wasm", ".json": "application/json" };
const srv = createServer((q, a) => { let p, d; try { p = q.url === "/" ? "index.html" : decodeURIComponent(q.url.slice(1).split("?")[0]); d = readFileSync(join(dist, p)); } catch { a.writeHead(404); a.end(); return; } a.writeHead(200, { "content-type": typ[extname(p)] || "application/octet-stream" }); a.end(d); }).listen(process.env.PORT || 8797);
let fehler = 0; const ok = (c, t) => { console.log(`${c ? "✓" : "✗"} ${t}`); if (!c) fehler++; };
const b = await chromium.launch(), pr = [];
const mk = (pts) => ({ objekt: "T", nr: "1", zaehler: 20, features: [
  { id: "p1", typ: "skizze", name: "Profil", ebene: "YZ", elemente: [{ id: 1, art: "rechteck", a: [-5, -5], b: [5, 5] }], bedingungen: [] },
  { id: "w1", typ: "skizze", name: "Pfad", ebene: "XY", elemente: [{ id: 1, art: "linie", pts, geschlossen: false }], bedingungen: [] },
  { id: "sw", typ: "sweep", name: "Sweep", skizze: "p1", pfad: "L:w1:0", orientierung: "senkrecht" }] });
const lauf = async (pts, kern) => { const s = await b.newPage({ viewport: { width: 1280, height: 800 } }); s.on("pageerror", (e) => pr.push(e.message));
  await s.addInitScript(([d, k]) => { localStorage.setItem("sdcad-doc-0.2", JSON.stringify(d)); localStorage.setItem("sdcad-einstellungen", JSON.stringify({ materialien: [{ id: "zink07", name: "Z", t: 0.7, ri: 1, k: 0.4, dichte: 7.2 }], ...(k ? { programm: { kern: "occt" } } : {}) })); }, [mk(pts), kern]);
  await s.goto("http://localhost:" + (process.env.PORT || 8797) + "/index.html?test");
  if (kern) await s.waitForFunction(() => /Exakt aus dem CAD-Kern/.test(document.getElementById("status").textContent), null, { timeout: 90000 }); else await s.waitForTimeout(1500);
  await s.waitForTimeout(500);
  const r = await s.evaluate(() => ({ st: document.getElementById("status").textContent, k: window.sdcadTest.koerper().filter((k) => String(k.fid).startsWith("sw")).map((k) => Math.abs(k.volumen)) })); await s.close(); return r; };
const gerade = await lauf([[0, 0], [100, 0]], true);
ok(gerade.k.length === 1 && Math.abs(gerade.k[0] - 10 * 10 * 100) < 100 && !/Sweep/.test(gerade.st), `Sweep entlang einer Linie exakt: ${gerade.k[0]?.toFixed(0)} mm³ (erwartet 10000) ${gerade.st.slice(0, 80)}`);
const knick = await lauf([[0, 0], [100, 0], [100, 80]], true);
ok(knick.k.length === 1 && Math.abs(knick.k[0] - 18000) / 18000 < 0.03 && !/Sweep/.test(knick.st), `Sweep mit 90°-Knick exakt: ${knick.k[0]?.toFixed(0)} mm³ (Pfadlänge 180 × 100 mm² = 18000) ${knick.st.slice(0, 60)}`);
ok(pr.length === 0, "keine Seitenfehler " + pr.join(" | "));
await b.close(); srv.close();
console.log(fehler ? `${fehler} Fehler` : "Sweep exakt (App): alle Prüfungen bestanden"); process.exit(fehler ? 1 : 0);
