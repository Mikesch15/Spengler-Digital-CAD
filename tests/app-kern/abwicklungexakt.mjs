// App-Test: abgewickeltes Flächenblech (Abwickeln, Ausschnitt) und Falten werden im exakten Kern gerechnet
import { createServer } from "node:http"; import { readFileSync } from "node:fs"; import { createRequire } from "node:module"; import { extname, join, resolve } from "node:path";
const dist = resolve("dist"), { chromium } = createRequire(import.meta.url)("playwright");
const typ = { ".html": "text/html", ".js": "text/javascript", ".wasm": "application/wasm", ".json": "application/json" };
const srv = createServer((q, a) => { let p, d; try { p = q.url === "/" ? "index.html" : decodeURIComponent(q.url.slice(1).split("?")[0]); d = readFileSync(join(dist, p)); } catch { a.writeHead(404); a.end(); return; } a.writeHead(200, { "content-type": typ[extname(p)] || "application/octet-stream" }); a.end(d); }).listen(process.env.PORT || 8797);
let fehler = 0; const ok = (c, t) => { console.log(`${c ? "✓" : "✗"} ${t}`); if (!c) fehler++; };
const b = await chromium.launch(), pr = [], mat = { id: "zink07", name: "Z", t: 0.7, ri: 1, k: 0.4, dichte: 7.2 };
const mk = (extra) => ({ objekt: "T", nr: "1", zaehler: 30, features: [
  { id: "s1", typ: "skizze", name: "A", ebene: "XY", elemente: [{ id: 1, art: "rechteck", a: [0, 0], b: [100, 80] }], bedingungen: [] },
  { id: "f1", typ: "flaeche", name: "Blech", skizze: "s1", material: "zink07", flaechen: [[50, 40]], kanten: { "0:0": "ortgang" } }, ...extra] });
const lauf = async (extra) => { const s = await b.newPage({ viewport: { width: 1280, height: 800 } }); s.on("pageerror", (e) => pr.push(e.message));
  await s.addInitScript(([d, m]) => { localStorage.setItem("sdcad-doc-0.2", JSON.stringify(d)); localStorage.setItem("sdcad-einstellungen", JSON.stringify({ materialien: [m], programm: { kern: "occt" } })); }, [mk(extra), mat]);
  await s.goto("http://localhost:" + (process.env.PORT || 8797) + "/index.html?test");
  await s.waitForFunction(() => /Exakt aus dem CAD-Kern/.test(document.getElementById("status").textContent), null, { timeout: 90000 }).catch(async () => { console.log("STATUS", await s.evaluate(() => document.getElementById("status").textContent), pr.join("|")); }); await s.waitForTimeout(500);
  const r = await s.evaluate(() => ({ st: document.getElementById("status").textContent, k: window.sdcadTest.koerper().filter((k) => String(k.fid).startsWith("f1")).map((k) => Math.abs(k.volumen)) })); await s.close(); return r; };
const gefaltet = await lauf([]), flach = await lauf([{ id: "ab", typ: "abwickeln", name: "Abwickeln", ziel: "f1" }]), ab = await lauf([{ id: "ab", typ: "abwickeln", name: "Abwickeln", ziel: "f1" }, { id: "fa", typ: "falten", name: "Falten", ziel: "f1" }]);
ok(gefaltet.k.length === 1 && gefaltet.k[0] > 5000, `gefaltetes Blech exakt (${gefaltet.k[0]?.toFixed(0)} mm³)`);
ok(flach.k.length === 1 && flach.k[0] > 5000 && !/Abwicklung\/Ausschnitte/.test(flach.st), `abgewickeltes Blech exakt als flache Platte (${flach.k[0]?.toFixed(0)} mm³) ${flach.st.slice(0, 120)}`);
ok(ab.k.length === 1 && Math.abs(ab.k[0] - gefaltet.k[0]) < 1 && !/noch nicht exakt/.test(ab.st), `Abwickeln + Falten: wieder dasselbe exakte Blech (${ab.k[0]?.toFixed(0)} mm³)`);
ok(pr.length === 0, "keine Seitenfehler " + pr.join(" | "));
await b.close(); srv.close();
console.log(fehler ? `${fehler} Fehler` : "Abwicklung exakt (App): alle Prüfungen bestanden"); process.exit(fehler ? 1 : 0);
