// App-Test Flansch / Umschlag an Flächenblech-Kanten (gerade und rund), Mass bis Aussenkante, Netz und exakter Körper
// node tests/app-kern/flansch.mjs (nach node build.mjs; Playwright/Chromium)
import { createServer } from "node:http";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { extname, join, resolve } from "node:path";
const dist = resolve("dist"), { chromium } = createRequire(import.meta.url)("playwright");
const typ = { ".html": "text/html", ".js": "text/javascript", ".wasm": "application/wasm", ".json": "application/json" };
const srv = createServer((q, a) => { let p, d; try { p = q.url === "/" ? "index.html" : decodeURIComponent(q.url.slice(1).split("?")[0]); d = readFileSync(join(dist, p)); } catch { a.writeHead(404); a.end(); return; } a.writeHead(200, { "content-type": typ[extname(p)] ?? "application/octet-stream" }); a.end(d); }).listen(8776);
let fehler = 0; const ok = (b, t) => { console.log(`${b ? "✓" : "✗"} ${t}`); if (!b) fehler++; };
const b = await chromium.launch();
for (const kern of [null, "occt"]) {
  const s = await b.newPage({ viewport: { width: 1280, height: 800 } }), probleme = []; s.on("pageerror", (e) => probleme.push(e.message));
  const projekt = { objekt: "F", nr: "F-1", zaehler: 10, features: [
    { id: "sf", typ: "skizze", name: "Umriss", ebene: "XY", elemente: [{ id: 1, art: "rechteck", a: [0, 0], b: [1000, 500] }] },
    { id: "fl", typ: "flaeche", name: "Abdeckung", skizze: "sf", material: "zink07", profil: "alle", kanten: {} }] };
  await s.addInitScript(([d, k]) => { localStorage.setItem("sdcad-doc-0.2", JSON.stringify(d)); localStorage.setItem("sdcad-einstellungen", JSON.stringify({ materialien: [{ id: "zink07", name: "Titanzink 0.70", t: 0.7, ri: 1.0, k: 0.4, dichte: 7.2 }], ...(k ? { programm: { kern: k } } : {}) })); }, [projekt, kern]);
  await s.goto("http://localhost:8776/index.html?test"); await s.waitForTimeout(900);
  const nm = kern ? "Ein" : "Aus";
  await s.evaluate(() => window.sdcadTest.bearbeite("fl")); await s.waitForSelector('[data-b="0:0"]', { timeout: 5000 });
  await s.selectOption('[data-b="0:0"]', "*f"); await s.waitForSelector('[data-fw="winkel"]', { timeout: 3000 });
  const z0 = parseFloat(await s.textContent('[data-z="0:0"]'));
  ok(z0 > 20 && z0 < 30, `${nm}: Flansch 90°/25 an Kante 1: Zugabe ${z0}`);
  await s.fill('[data-fw="winkel"]', "60"); await s.dispatchEvent('[data-fw="winkel"]', "change"); await s.waitForTimeout(300);
  await s.fill('[data-fw="laenge"]', "40"); await s.dispatchEvent('[data-fw="laenge"]', "change"); await s.waitForTimeout(300);
  const z1 = parseFloat(await s.textContent('[data-z="0:0"]'));
  ok(z1 > z0 + 10, `${nm}: Winkel 60° und Länge 40 verändern die Zugabe (${z0} → ${z1})`);
  await s.selectOption('[data-fw="bezug"]', "aussen"); await s.waitForTimeout(300);
  const z2 = parseFloat(await s.textContent('[data-z="0:0"]'));
  ok(z2 < z1 && z1 - z2 < 0.5, `${nm}: Mass bis Aussenkante verkürzt die Zugabe leicht (${z1} → ${z2})`);
  await s.selectOption('[data-b="0:1"]', "*u"); await s.waitForSelector('[data-fw="laenge"][data-key="0:1"]', { timeout: 3000 });
  ok(await s.evaluate(() => !document.querySelector('[data-fw="winkel"][data-key="0:1"]')) && parseFloat(await s.textContent('[data-z="0:1"]')) > 5, `${nm}: Umschlag an Kante 2: kein Winkelfeld, Zugabe ${await s.textContent('[data-z="0:1"]')}`);
  await s.click("#dOk"); await s.waitForTimeout(500);
  const gespeichert = await s.evaluate(() => window.sdcadTest.dok().features.find((f) => f.id === "fl").kanten);
  ok(gespeichert["0:0"]?.werkzeug?.winkel === 60 && gespeichert["0:0"].werkzeug.bezug === "aussen" && gespeichert["0:1"]?.werkzeug?.typ === "umschlag", `${nm}: Werkzeugwerte im Projekt gespeichert`);
  if (kern) {
    await s.waitForFunction(() => window.sdcadTest.koerperInfo().some((k) => k.fid.startsWith("fl") && k.exakt), null, { timeout: 60000 });
    const k = (await s.evaluate(() => window.sdcadTest.koerperInfo())).find((x) => x.fid.startsWith("fl"));
    ok(k.exakt && k.volumen > 0, `Ein: Flächenblech mit Flansch und Umschlag als exakter Körper (V ${(k.volumen / 1000).toFixed(1)} cm³)`);
  }
  ok(probleme.length === 0, `${nm}: keine Seitenfehler ${probleme.join(" | ")}`);
  await s.close();
}
await b.close(); srv.close();
console.log(fehler ? `${fehler} Fehler` : "Flansch/Umschlag in der App: alle Prüfungen bestanden"); process.exit(fehler ? 1 : 0);
