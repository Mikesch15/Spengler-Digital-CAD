// App-Test Ecknaht (Kehlnaht zwischen zwei Blechen): Dreieckskörper in der Fuge, auch als exakter Körper; Teilstück verkürzt ihn
import { createServer } from "node:http"; import { readFileSync } from "node:fs"; import { createRequire } from "node:module"; import { extname, join, resolve } from "node:path";
const dist = resolve("dist"), { chromium } = createRequire(import.meta.url)("playwright");
const typ = { ".html": "text/html", ".js": "text/javascript", ".wasm": "application/wasm", ".json": "application/json" };
const srv = createServer((q, a) => { let p, d; try { p = q.url === "/" ? "index.html" : decodeURIComponent(q.url.slice(1).split("?")[0]); d = readFileSync(join(dist, p)); } catch { a.writeHead(404); a.end(); return; } a.writeHead(200, { "content-type": typ[extname(p)] || "application/octet-stream" }); a.end(d); }).listen(process.env.PORT || 8797);
let fehler = 0; const ok = (c, t) => { console.log(`${c ? "✓" : "✗"} ${t}`); if (!c) fehler++; };
const b = await chromium.launch(), pr = [], mat = { id: "zink07", name: "Z", t: 0.7, ri: 1, k: 0.4, dichte: 7.2 };
const mk = (teil, art = "ecke") => ({ objekt: "T", nr: "1", zaehler: 30, features: [
  { id: "s1", typ: "skizze", name: "A", ebene: "XY", elemente: [{ id: 1, art: "rechteck", a: [0, 0], b: [100, 100] }], bedingungen: [] },
  { id: "f1", typ: "flaeche", name: "Blech A", skizze: "s1", material: "zink07", flaechen: [[50, 50]], kanten: {} },
  { id: "e1", typ: "ebene", art: "versatz", name: "Ebene", ref: "YZ", abstand: 100 },
  { id: "s2", typ: "skizze", name: "B", ebene: "e1", elemente: [{ id: 1, art: "rechteck", a: [0, 0], b: [100, 80] }], bedingungen: [] },
  { id: "f2", typ: "flaeche", name: "Blech B", skizze: "s2", material: "zink07", flaechen: [[50, 40]], kanten: {} },
  { id: "n1", typ: "naht", name: "Ecknaht", a: { ziel: "f1", key: "0:1", ...(teil ? { teil: { von: 20, bis: 60 } } : {}) }, b: { ziel: "f2", key: "0:3" }, art, absetz: "b", richtung: "oben", zugabe: 15, falzA: 5, falzB: 10, mittig: false, absetzen: true, raupeBreite: 0, raupeHoehe: 0, seite: "oben" }] });
const lauf = async (teil, art) => { const s = await b.newPage({ viewport: { width: 1280, height: 800 } }); s.on("pageerror", (e) => pr.push(e.message));
  await s.addInitScript(([d, m]) => { localStorage.setItem("sdcad-doc-0.2", JSON.stringify(d)); localStorage.setItem("sdcad-einstellungen", JSON.stringify({ materialien: [m], programm: { kern: "occt" } })); }, [mk(teil, art), mat]);
  await s.goto("http://localhost:" + (process.env.PORT || 8797) + "/index.html?test");
  await s.waitForFunction(() => /Exakt aus dem CAD-Kern/.test(document.getElementById("status").textContent), null, { timeout: 90000 }); await s.waitForTimeout(500);
  const r = await s.evaluate(() => ({ k: window.sdcadTest.koerper().filter((k) => String(k.fid).startsWith("n1")).map((k) => Math.abs(k.volumen)), fehl: window.sdcadTest.dok().features.map((x) => x._fehler).filter(Boolean), m: window.sdcadTest.meshListe("n1") })); await s.close(); return r; };
const g = await lauf(false, "ecke"), t = await lauf(true, "ecke"), sw = await lauf(false, "schweiss");
ok(g.fehl.length === 0 && g.m.length === 1, `Ecknaht erzeugt ein Dreieckprisma (${g.m.length} Netz) ${g.fehl.join(";")}`);
ok(g.k.length === 1 && Math.abs(g.k[0] - 0.5 * 1.4 * 1.4 * 100) < 5, `exakter Körper: Querschnitt ½·1,4² × 100 mm = 98 mm³ (${g.k[0]?.toFixed(1)})`);
ok(t.k.length === 1 && Math.abs(t.k[0] - 0.5 * 1.4 * 1.4 * 40) < 3, `Teilstück 40 mm: Volumen ≈ 39 mm³ (${t.k[0]?.toFixed(1)})`);
ok(sw.k.length === 1 && sw.k[0] > 50 && sw.k[0] < 140, `Schweissnaht (Linse) als exakter Körper (${sw.k[0]?.toFixed(1)} mm³)`);
ok(pr.length === 0, "keine Seitenfehler " + pr.join(" | "));
await b.close(); srv.close();
console.log(fehler ? `${fehler} Fehler` : "Ecknaht (App): alle Prüfungen bestanden"); process.exit(fehler ? 1 : 0);
