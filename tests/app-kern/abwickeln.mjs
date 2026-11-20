// App-Test Abwickeln/Falten: flach schalten, Ausschnitte in der Abwicklung zeichnen, falten → Ausschnitte im gekanteten Blech (Platte + Flansch)
// node tests/app-kern/abwickeln.mjs (nach node build.mjs; Playwright/Chromium)
import { createServer } from "node:http"; import { readFileSync } from "node:fs"; import { createRequire } from "node:module"; import { extname, join, resolve } from "node:path";
const dist = resolve("dist"), { chromium } = createRequire(import.meta.url)("playwright");
const typ = { ".html": "text/html", ".js": "text/javascript", ".wasm": "application/wasm", ".json": "application/json" };
const srv = createServer((q, a) => { let p, d; try { p = q.url === "/" ? "index.html" : decodeURIComponent(q.url.slice(1).split("?")[0]); d = readFileSync(join(dist, p)); } catch { a.writeHead(404); a.end(); return; } a.writeHead(200, { "content-type": typ[extname(p)] ?? "application/octet-stream" }); a.end(d); }).listen(8790);
let fehler = 0; const ok = (c, t) => { console.log(`${c ? "✓" : "✗"} ${t}`); if (!c) fehler++; };
const b = await chromium.launch(), pr = [];
const pj0 = { objekt: "U", nr: "U-1", zaehler: 10, features: [
  { id: "sk", typ: "skizze", name: "Blech", ebene: "XY", elemente: [{ id: 1, art: "rechteck", a: [0, 0], b: [200, 100] }] },
  { id: "fl", typ: "flaeche", name: "Blech 1", skizze: "sk", material: "zink07", flaechen: [[10, 10]], kanten: { "0:0": "ortgang" }, ausschnitt: "ab", flach: false },
  { id: "ab", typ: "skizze", name: "Ausschnitte", ebene: "XY", elemente: [{ id: 1, art: "kreis", c: [100, 60], r: 10 }, { id: 2, art: "rechteck", a: [90, -18], b: [110, -10] }] }] };
const volumen = async (mod) => {
  const d = JSON.parse(JSON.stringify(pj0)); mod(d.features.find((f) => f.id === "fl"));
  const s = await b.newPage({ viewport: { width: 1280, height: 800 } }); s.on("pageerror", (e) => pr.push(e.message));
  await s.addInitScript((x) => { localStorage.setItem("sdcad-doc-0.2", JSON.stringify(x)); localStorage.setItem("sdcad-einstellungen", JSON.stringify({ materialien: [{ id: "zink07", name: "Z", t: 0.7, ri: 1, k: 0.4, dichte: 7.2 }] })); }, d);
  await s.goto("http://localhost:8790/index.html?test"); await s.waitForTimeout(1500);
  const r = await s.evaluate(() => window.sdcadTest.koerperInfo().filter((k) => k.fid.startsWith("fl")).map((k) => k.volumen)); await s.close(); return r;
};
const t = 0.7, mitLoch = (await volumen(() => {})).reduce((a, v) => a + v, 0), ohne = (await volumen((f) => { delete f.ausschnitt; })).reduce((a, v) => a + v, 0), soll = Math.PI * 100 * t + 20 * 8 * t;
ok(ohne - mitLoch > 0.7 * soll && ohne - mitLoch < 1.3 * soll, `Gefaltet: Ausschnitte in Platte und Flansch entfernen ${(ohne - mitLoch).toFixed(0)} mm³ (erwartet ≈ ${soll.toFixed(0)})`);
const flach = await volumen((f) => { f.flach = true; });
ok(flach.length === 1 && flach[0] > 0 && flach[0] < 200 * 130 * t, `Abgewickelt: ein flacher Körper mit Löchern (${Math.round(flach[0])} mm³)`);
ok(pr.length === 0, "keine Seitenfehler " + pr.join(" | "));
await b.close(); srv.close();
console.log(fehler ? `${fehler} Fehler` : "Abwickeln/Falten: alle Prüfungen bestanden"); process.exit(fehler ? 1 : 0);
