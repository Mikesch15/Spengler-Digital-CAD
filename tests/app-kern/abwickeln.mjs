// App-Test Abwickeln/Falten: flach schalten, Ausschnitte in der Abwicklung zeichnen, falten → Ausschnitte im gekanteten Blech (Platte + Flansch)
// node tests/app-kern/abwickeln.mjs (nach node build.mjs; Playwright/Chromium)
import { createServer } from "node:http"; import { readFileSync } from "node:fs"; import { createRequire } from "node:module"; import { extname, join, resolve } from "node:path";
const dist = resolve("dist"), { chromium } = createRequire(import.meta.url)("playwright");
const typ = { ".html": "text/html", ".js": "text/javascript", ".wasm": "application/wasm", ".json": "application/json" };
const srv = createServer((q, a) => { let p, d; try { p = q.url === "/" ? "index.html" : decodeURIComponent(q.url.slice(1).split("?")[0]); d = readFileSync(join(dist, p)); } catch { a.writeHead(404); a.end(); return; } a.writeHead(200, { "content-type": typ[extname(p)] ?? "application/octet-stream" }); a.end(d); }).listen(8790);
let fehler = 0; const ok = (c, t) => { console.log(`${c ? "✓" : "✗"} ${t}`); if (!c) fehler++; };
const b = await chromium.launch(), pr = [];
// Rechteck 200 × 100 mit Ortgang (Aufkantung 25) an Kante 1; Abwickeln → Skizze (Loch Ø 20 in der Platte, Schlitz im Flansch) → Extrusion Ausschneiden → Falten
const basis = () => [
  { id: "sk", typ: "skizze", name: "Blech", ebene: "XY", elemente: [{ id: 1, art: "rechteck", a: [0, 0], b: [200, 100] }] },
  { id: "fl", typ: "flaeche", name: "Blech 1", skizze: "sk", material: "zink07", flaechen: [[10, 10]], kanten: { "0:0": "ortgang" } },
  { id: "ab", typ: "abwickeln", name: "Abwickeln Blech 1", ziel: "fl" },
  { id: "s2", typ: "skizze", name: "Auf Abwicklung", ebene: "XY", elemente: [{ id: 1, art: "kreis", c: [100, 60], r: 10 }, { id: 2, art: "rechteck", a: [90, -18], b: [110, -10] }] }];
const schnitt = { id: "ex", typ: "extrusion", name: "Ausschnitt 1", skizze: "s2", flaechen: [[100, 60], [100, -14]], abstand: 10, richtung: "symmetrisch", vorgang: "ausschneiden", ziel: "fl" };
const falten = { id: "fa", typ: "falten", name: "Falten Blech 1", ziel: "fl" };
const volumen = async (features) => {
  const s = await b.newPage({ viewport: { width: 1280, height: 800 } }); s.on("pageerror", (e) => pr.push(e.message));
  await s.addInitScript((d) => { localStorage.setItem("sdcad-doc-0.2", JSON.stringify({ objekt: "U", nr: "U-1", zaehler: 10, features: d })); localStorage.setItem("sdcad-einstellungen", JSON.stringify({ materialien: [{ id: "zink07", name: "Z", t: 0.7, ri: 1, k: 0.4, dichte: 7.2 }] })); }, features);
  await s.goto("http://localhost:8790/index.html?test"); await s.waitForTimeout(1500);
  const r = await s.evaluate(() => window.sdcadTest.koerperInfo().filter((k) => k.fid.startsWith("fl")).map((k) => k.volumen)); await s.close(); return r;
};
const t = 0.7, soll = Math.PI * 100 * t + 20 * 8 * t;
const ohneAbw = (await volumen([basis()[0], basis()[1]])).reduce((a, v) => a + v, 0);
const flachOhne = await volumen(basis()), flachMit = await volumen([...basis(), schnitt]), gefaltet = await volumen([...basis(), schnitt, falten]), gefaltetOhneSchnitt = await volumen([...basis(), falten]);
ok(flachOhne.length === 1 && Math.abs(flachOhne[0] - 200 * 124.3 * t) < 0.03 * 200 * 124.3 * t, `Abgewickelt: ein flaches Blech (${Math.round(flachOhne[0])} mm³), noch nichts ausgeschnitten`);
ok(flachOhne[0] - flachMit[0] > 0.7 * soll && flachOhne[0] - flachMit[0] < 1.3 * soll, `Erst die Extrusion «Ausschneiden» schneidet die Abwicklung (${(flachOhne[0] - flachMit[0]).toFixed(0)} mm³ weg)`);
ok(Math.abs(gefaltetOhneSchnitt.reduce((a, v) => a + v, 0) - ohneAbw) < 1, "Falten ohne Ausschneiden: Blech unverändert, nichts wird «zurückgeschnitten»");
const gs = gefaltet.reduce((a, v) => a + v, 0); ok(ohneAbw - gs > 0.7 * soll && ohneAbw - gs < 1.3 * soll, `Gefaltet: Ausschnitte in Platte und Flansch (${(ohneAbw - gs).toFixed(0)} mm³ weg, erwartet ≈ ${soll.toFixed(0)})`);
// Keine Geisterlinien: Ausklinkung am Rand des Flanschs – Kantenlinien im ausgeschnittenen Bereich dürfen nicht stehen bleiben
for (const [nm, fs] of [["flach", [...basis(), { ...schnitt, id: "ex2", skizze: "s3", flaechen: [[100, -18]] }]], ["gefaltet", [...basis(), { ...schnitt, id: "ex2", skizze: "s3", flaechen: [[100, -18]] }, falten]]]) {
  const s3 = { id: "s3", typ: "skizze", name: "Ausklinkung", ebene: "XY", elemente: [{ id: 1, art: "rechteck", a: [90, -30], b: [110, -12] }] };
  const f2 = fs.slice(); f2.splice(f2.findIndex((x) => x.id === "ex2"), 0, s3);
  const sx = await b.newPage({ viewport: { width: 1280, height: 800 } }); sx.on("pageerror", (e) => pr.push(e.message));
  await sx.addInitScript((d) => { localStorage.setItem("sdcad-doc-0.2", JSON.stringify({ objekt: "U", nr: "U-1", zaehler: 10, features: d })); localStorage.setItem("sdcad-einstellungen", JSON.stringify({ materialien: [{ id: "zink07", name: "Z", t: 0.7, ri: 1, k: 0.4, dichte: 7.2 }] })); }, f2);
  await sx.goto("http://localhost:8790/index.html?test"); await sx.waitForTimeout(1500);
  const n = await sx.evaluate((fl) => fl ? window.sdcadTest.segmenteImKasten("fl", 92, 108, -28, -14) : window.sdcadTest.segmenteImKasten("fl", 92, 108, -3, 3, 15, 23), nm === "flach"); ok(n === 0, `${nm}: keine Kantenlinien mehr im ausgeklinkten Bereich (${n})`); await sx.close();
}
await b.close(); srv.close();
if (pr.length) { console.log("✗ Seitenfehler", pr.join(" | ")); fehler++; }
console.log(fehler ? `${fehler} Fehler` : "Abwickeln/Falten: alle Prüfungen bestanden"); process.exit(fehler ? 1 : 0);
