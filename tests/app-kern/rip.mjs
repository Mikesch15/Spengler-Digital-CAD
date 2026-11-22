// App-Test Blechprofil: nachträglich Flansch/Umschlag an Kante A und B ansetzen (Kanten-Werkzeug)
// node tests/app-kern/stirnflansch.mjs (nach node build.mjs; Playwright/Chromium)
import { createServer } from "node:http"; import { readFileSync } from "node:fs"; import { createRequire } from "node:module"; import { extname, join, resolve } from "node:path";
const dist = resolve("dist"), { chromium } = createRequire(import.meta.url)("playwright");
const typ = { ".html": "text/html", ".js": "text/javascript", ".wasm": "application/wasm", ".json": "application/json" };
const srv = createServer((q, a) => { let p, d; try { p = q.url === "/" ? "index.html" : decodeURIComponent(q.url.slice(1).split("?")[0]); d = readFileSync(join(dist, p)); } catch { a.writeHead(404); a.end(); return; } a.writeHead(200, { "content-type": typ[extname(p)] ?? "application/octet-stream" }); a.end(d); }).listen(+process.env.PORT || 8797);
let fehler = 0; const ok = (c, t) => { console.log(`${c ? "✓" : "✗"} ${t}`); if (!c) fehler++; };
const b = await chromium.launch(), s = await b.newPage({ viewport: { width: 1280, height: 800 } }), pr = []; s.on("pageerror", (e) => pr.push(e.message));
const mk = (rip) => [
  { id: "sk", typ: "skizze", name: "Rechteck", ebene: "XY", elemente: [{ id: 1, art: "rechteck", a: [0, 0], b: [200, 100] }], bedingungen: [] },
  { id: "fl", typ: "flaeche", name: "Blech 1", skizze: "sk", material: "zink07", flaechen: [[10, 10]], kanten: {} },
  { id: "sr", typ: "skizze", name: "Trennlinie", ebene: "XY", elemente: [{ id: 2, art: "linie", pts: [[100, -10], [100, 50]], geschlossen: false }], bedingungen: [] },
  ...(rip ? [{ id: "ri", typ: "rip", name: "Rip 1", ziel: "fl", skizze: "sr", spalt: 2 }] : [])];
const vol = async (rip) => { const p = await b.newPage(); p.on("pageerror", (e) => pr.push(e.message));
  await p.addInitScript((d) => { localStorage.setItem("sdcad-einstellungen", JSON.stringify({ materialien: [{ id: "zink07", name: "Z", t: 0.7, ri: 1, k: 0.4, dichte: 7.2 }] })); localStorage.setItem("sdcad-doc-0.2", JSON.stringify({ objekt: "T", nr: "1", zaehler: 60, features: d })); }, mk(rip));
  await p.goto("http://localhost:" + (process.env.PORT || 8797) + "/index.html?test"); await p.waitForTimeout(1800);
  const r = await p.evaluate(() => ({ v: window.sdcadTest.koerper().filter((q) => String(q.fid).split(":")[0] === "fl").reduce((a, q) => a + Math.abs(q.volumen), 0), arten: window.sdcadTest.quetschAbw("fl")?.arten || [], fehl: window.sdcadTest.dok().features.map((f) => f.id + ":" + (f._fehler || "")).filter((x) => !x.endsWith(":")) })); await p.close(); return r; };
const o = await vol(false), m = await vol(true);
ok(m.fehl.length === 0, "Rip ohne Fehler " + m.fehl.join(" | "));
ok(o.v - m.v > 55 && o.v - m.v < 85, `Schlitz 2 mm × 50 mm entfernt Material (${Math.round(o.v)} → ${Math.round(m.v)} mm³)`);
ok(m.arten.includes("rip"), "Abwicklung enthält die Trennlinie (Layer RIP)");
ok(pr.length === 0, "keine Seitenfehler " + pr.join(" | "));
await b.close(); srv.close();
console.log(fehler ? `${fehler} Fehler` : "Rip (App): alle Prüfungen bestanden"); process.exit(fehler ? 1 : 0);
