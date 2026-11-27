// App-Test Durchdringungsschutz: überlappende Blechteile werden im exakten Kern zurückgeschnitten (das später angelegte weicht)
import { createServer } from "node:http"; import { readFileSync } from "node:fs"; import { createRequire } from "node:module"; import { extname, join, resolve } from "node:path";
const dist = resolve("dist"), { chromium } = createRequire(import.meta.url)("playwright");
const typ = { ".html": "text/html", ".js": "text/javascript", ".wasm": "application/wasm", ".json": "application/json" };
const srv = createServer((q, a) => { let p, d; try { p = q.url === "/" ? "index.html" : decodeURIComponent(q.url.slice(1).split("?")[0]); d = readFileSync(join(dist, p)); } catch { a.writeHead(404); a.end(); return; } a.writeHead(200, { "content-type": typ[extname(p)] || "application/octet-stream" }); a.end(d); }).listen(process.env.PORT || 8797);
let fehler = 0; const ok = (c, t) => { console.log(`${c ? "✓" : "✗"} ${t}`); if (!c) fehler++; };
const b = await chromium.launch(), pr = [];
const mat = { id: "zink07", name: "Z", t: 0.7, ri: 1.0, k: 0.4, dichte: 7.2 };
const mk = (b2) => ({ objekt: "D", nr: "1", zaehler: 20, features: [
  { id: "s1", typ: "skizze", name: "A", ebene: "XY", elemente: [{ id: 1, art: "rechteck", a: [0, 0], b: [100, 100] }] },
  { id: "f1", typ: "flaeche", name: "Blech A", skizze: "s1", material: "zink07", flaechen: [[50, 50]], kanten: {} },
  { id: "s2", typ: "skizze", name: "B", ebene: "XY", elemente: [{ id: 1, art: "rechteck", a: b2[0], b: b2[1] }] },
  { id: "f2", typ: "flaeche", name: "Blech B", skizze: "s2", material: "zink07", flaechen: [[(b2[0][0] + b2[1][0]) / 2, (b2[0][1] + b2[1][1]) / 2]], kanten: {} }] });
const lauf = async (b2) => { const s = await b.newPage({ viewport: { width: 1280, height: 800 } }); s.on("pageerror", (e) => pr.push(e.message));
  await s.addInitScript(([d, m]) => { localStorage.setItem("sdcad-doc-0.2", JSON.stringify(d)); localStorage.setItem("sdcad-einstellungen", JSON.stringify({ materialien: [m], programm: { kern: "occt" } })); }, [mk(b2), mat]);
  await s.goto("http://localhost:" + (process.env.PORT || 8797) + "/index.html?test");
  await s.waitForFunction(() => /Exakt aus dem CAD-Kern/.test(document.getElementById("status").textContent), null, { timeout: 90000 }); await s.waitForTimeout(500);
  const r = await s.evaluate(() => ({ st: document.getElementById("status").textContent, k: window.sdcadTest.koerper().map((k) => [String(k.fid), Math.round(Math.abs(k.volumen) * 10) / 10]) })); await s.close(); return r; };
const getrennt = await lauf([[200, 0], [300, 100]]), ueber = await lauf([[50, 50], [150, 150]]);
const vol = (r, f) => r.k.filter(([id]) => id.startsWith(f)).reduce((a, [, v]) => a + v, 0);
ok(vol(getrennt, "f2") > 6900 && vol(getrennt, "f1") > 6900, `getrennte Bleche unverändert (${vol(getrennt, "f1")} / ${vol(getrennt, "f2")} mm³)`);
ok(!/zurückgeschnitten/.test(getrennt.st), "getrennte Bleche: keine Zurückschneidung gemeldet");
ok(Math.abs(vol(ueber, "f1") - vol(getrennt, "f1")) < 1, `Blech A bleibt unverändert (${vol(ueber, "f1")} mm³)`);
ok(vol(ueber, "f2") < vol(getrennt, "f2") - 1500, `Blech B wird um den Überschnitt (50×50×0.7 = 1750 mm³) zurückgeschnitten (${vol(getrennt, "f2")} → ${vol(ueber, "f2")} mm³)`);
ok(/1 Überschneidung zurückgeschnitten/.test(ueber.st), "Statusmeldung nennt die Zurückschneidung");
ok(pr.length === 0, "keine Seitenfehler " + pr.join(" | "));
await b.close(); srv.close();
console.log(fehler ? `${fehler} Fehler` : "Durchdringungsschutz (App): alle Prüfungen bestanden"); process.exit(fehler ? 1 : 0);
