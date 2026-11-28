// App-Test Teilen exakt: Quader an einer Ebene in zwei exakte Körper teilen
import { createServer } from "node:http"; import { readFileSync } from "node:fs"; import { createRequire } from "node:module"; import { extname, join, resolve } from "node:path";
const dist = resolve("dist"), { chromium } = createRequire(import.meta.url)("playwright");
const typ = { ".html": "text/html", ".js": "text/javascript", ".wasm": "application/wasm", ".json": "application/json" };
const srv = createServer((q, a) => { let p, d; try { p = q.url === "/" ? "index.html" : decodeURIComponent(q.url.slice(1).split("?")[0]); d = readFileSync(join(dist, p)); } catch { a.writeHead(404); a.end(); return; } a.writeHead(200, { "content-type": typ[extname(p)] || "application/octet-stream" }); a.end(d); }).listen(process.env.PORT || 8797);
let fehler = 0; const ok = (c, t) => { console.log(`${c ? "✓" : "✗"} ${t}`); if (!c) fehler++; };
const b = await chromium.launch(), pr = [];
const mk = (behalten) => ({ objekt: "T", nr: "1", zaehler: 20, features: [
  { id: "s1", typ: "skizze", name: "S", ebene: "XY", elemente: [{ id: 1, art: "rechteck", a: [0, 0], b: [100, 60] }], bedingungen: [] },
  { id: "x1", typ: "extrusion", name: "Quader", skizze: "s1", abstand: 40, richtung: "eine", vorgang: "neu", flaechen: [[50, 30]] },
  { id: "e1", typ: "ebene", art: "versatz", name: "Schnitt", ref: "XY", abstand: 10 },
  { id: "t1", typ: "teilen", name: "Teilen", ziel: "x1", ebene: "e1", behalten } ] });
const lauf = async (behalten) => { const s = await b.newPage({ viewport: { width: 1280, height: 800 } }); s.on("pageerror", (e) => pr.push(e.message));
  await s.addInitScript(([d]) => { localStorage.setItem("sdcad-doc-0.2", JSON.stringify(d)); localStorage.setItem("sdcad-einstellungen", JSON.stringify({ programm: { kern: "occt" }, materialien: [{ id: "zink07", name: "Z", t: 0.7, ri: 1, k: 0.4, dichte: 7.2 }] })); }, [mk(behalten)]);
  await s.goto("http://localhost:" + (process.env.PORT || 8797) + "/index.html?test");
  await s.waitForFunction(() => /Exakt aus dem CAD-Kern/.test(document.getElementById("status").textContent), null, { timeout: 90000 }); await s.waitForTimeout(500);
  const r = await s.evaluate(() => ({ st: document.getElementById("status").textContent, k: window.sdcadTest.koerper().map((k) => [String(k.fid), Math.round(Math.abs(k.volumen))]) })); await s.close(); return r; };
const beide = await lauf("beide"), oben = await lauf("oben");
const v = (r) => r.k.map(([, w]) => w).sort((a, c) => a - c);
ok(v(beide).length === 2 && Math.abs(v(beide)[0] - 100 * 60 * 10) < 50 && Math.abs(v(beide)[1] - 100 * 60 * 30) < 50, `Teilen (beide): zwei Teile 60000 / 180000 mm³ (${v(beide)})`);
ok(!/noch nicht exakt/.test(beide.st), "keine Meldung «noch nicht exakt» (" + beide.st.slice(0, 90) + ")");
ok(v(oben).length === 1 && Math.abs(v(oben)[0] - 180000) < 100 || v(oben).length === 1 && Math.abs(v(oben)[0] - 60000) < 100, `Teilen (nur einen Teil behalten): ein Körper (${v(oben)})`);
ok(pr.length === 0, "keine Seitenfehler " + pr.join(" | "));
await b.close(); srv.close();
console.log(fehler ? `${fehler} Fehler` : "Teilen exakt (App): alle Prüfungen bestanden"); process.exit(fehler ? 1 : 0);
