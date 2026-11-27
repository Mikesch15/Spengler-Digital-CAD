// App-Test Naht an einer Stossecke (Dokument des Nutzers): beide gewählten Kanten sind Stirnkanten; die Fahne muss innen auf dem Nachbarflansch liegen, nicht nach aussen
import { createServer } from "node:http"; import { readFileSync } from "node:fs"; import { createRequire } from "node:module"; import { extname, join, resolve } from "node:path";
const dist = resolve("dist"), { chromium } = createRequire(import.meta.url)("playwright");
const typ = { ".html": "text/html", ".js": "text/javascript", ".wasm": "application/wasm", ".json": "application/json" };
const srv = createServer((q, a) => { let p, d; try { p = q.url === "/" ? "index.html" : decodeURIComponent(q.url.slice(1).split("?")[0]); d = readFileSync(join(dist, p)); } catch { a.writeHead(404); a.end(); return; } a.writeHead(200, { "content-type": typ[extname(p)] || "application/octet-stream" }); a.end(d); }).listen(process.env.PORT || 8797);
let fehler = 0; const ok = (c, t) => { console.log(`${c ? "✓" : "✗"} ${t}`); if (!c) fehler++; };
const doc = JSON.parse(readFileSync("tests/daten/naht-stossecke.sdcad", "utf8")), b = await chromium.launch(), pr = [];
const s = await b.newPage({ viewport: { width: 1280, height: 800 } }); s.on("pageerror", (e) => pr.push(e.message));
await s.addInitScript((d) => localStorage.setItem("sdcad-doc-0.2", JSON.stringify(d)), doc);
await s.goto("http://localhost:" + (process.env.PORT || 8797) + "/index.html?test"); await s.waitForTimeout(2500);
const r = await s.evaluate(() => ({ w: window.sdcadTest.nahtWinkel("f52"), m: window.sdcadTest.meshListe("f38") }));
const fahnen = r.m.filter((m) => m.mn[0] < -127 && m.mx[0] > -131 && m.mx[2] < -200 && m.mn[2] < -226 && m.n > 100 && m.mx[0] - m.mn[0] < 4);
ok(r.w.w && Math.abs(Math.abs(r.w.w.b) - 90) < 1, `Winkel zwischen den Flanschen 90° (${JSON.stringify(r.w.w)})`);
ok(r.w.ka.inn[2] > 0.9 && r.w.kb.inn[0] > 0.9, `Blech A läuft nach +z, Blech B nach +x (inn ${r.w.ka.inn.map((v) => +v.toFixed(2))} / ${r.w.kb.inn.map((v) => +v.toFixed(2))})`);
ok(fahnen.length === 1, `genau eine Fahne am Eck des Kastens (${fahnen.length})`);
ok(fahnen[0] && fahnen[0].mn[2] >= -227.6 && fahnen[0].mx[2] > -226 + -1, `Fahne liegt innen im Kasten (z ${fahnen[0]?.mn[2]} … ${fahnen[0]?.mx[2]}), nicht ausserhalb`);
ok(pr.length === 0, "keine Seitenfehler " + pr.join(" | "));
await b.close(); srv.close();
console.log(fehler ? `${fehler} Fehler` : "Naht an der Stossecke (App): alle Prüfungen bestanden"); process.exit(fehler ? 1 : 0);
