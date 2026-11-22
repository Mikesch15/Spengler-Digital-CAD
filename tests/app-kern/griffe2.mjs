// App-Test Ziehpfeile für Dachfenster/Kamin/Lukarne
// node tests/app-kern/griffe.mjs (nach node build.mjs; Playwright/Chromium)
import { createServer } from "node:http"; import { readFileSync } from "node:fs"; import { createRequire } from "node:module"; import { extname, join, resolve } from "node:path";
const dist = resolve("dist"), { chromium } = createRequire(import.meta.url)("playwright");
const typ = { ".html": "text/html", ".js": "text/javascript", ".wasm": "application/wasm", ".json": "application/json" };
const srv = createServer((q, a) => { let p, d; try { p = q.url === "/" ? "index.html" : decodeURIComponent(q.url.slice(1).split("?")[0]); d = readFileSync(join(dist, p)); } catch { a.writeHead(404); a.end(); return; } a.writeHead(200, { "content-type": typ[extname(p)] ?? "application/octet-stream" }); a.end(d); }).listen(+process.env.PORT || 8797);
let fehler = 0; const ok = (c, t) => { console.log(`${c ? "✓" : "✗"} ${t}`); if (!c) fehler++; };
const b = await chromium.launch(), s = await b.newPage({ viewport: { width: 1400, height: 900 } }), pr = []; s.on("pageerror", (e) => pr.push(e.message));
const doc = { objekt: "T", nr: "1", zaehler: 40, features: [
  { id: "sk", typ: "skizze", name: "Rechteck", ebene: "XY", elemente: [{ id: 1, art: "rechteck", a: [0, 0], b: [200, 120] }], bedingungen: [] },
  { id: "fl", typ: "flaeche", name: "Blech 1", skizze: "sk", material: "zink07", flaechen: [[10, 10]], kanten: {} },
  { id: "sp", typ: "skizze", name: "Profil", ebene: "XY", elemente: [{ id: 1, art: "linie", pts: [[300, 0], [400, 0], [400, 60]], geschlossen: false }], bedingungen: [] },
  { id: "bp", typ: "blech", name: "Blechprofil 1", skizze: "sp", kette: 0, lage: "mitte", material: "zink07", laenge: 200, stueck: 1, richtung: "eine" },
  { id: "sd", typ: "skizze", name: "Drehprofil", ebene: "XY", elemente: [{ id: 1, art: "rechteck", a: [520, 0], b: [560, 30] }], bedingungen: [] },
  { id: "dr", typ: "drehung", name: "Drehung 1", skizze: "sd", achse: "V", winkel: 200, vorgang: "neu" },
  { id: "g1", typ: "gebaeude", name: "Gebäude 1", breite: 4000, tiefe: 3000, traufhoehe: 2500, wandstaerke: 200, x: 3000, z: 0 }] };
await s.addInitScript((d) => { localStorage.setItem("sdcad-doc-0.2", JSON.stringify(d)); localStorage.setItem("sdcad-einstellungen", JSON.stringify({ materialien: [{ id: "zink07", name: "Z", t: 0.7, ri: 1, k: 0.4, dichte: 7.2 }] })); }, doc);
await s.goto("http://localhost:" + (process.env.PORT || 8797) + "/index.html?test"); await s.waitForTimeout(1800);
const griffe = () => s.evaluate(() => window.sdcadTest.griffe());
const feat = (typ, n = 0) => s.evaluate(([t, i]) => window.sdcadTest.dok().features.filter((f) => f.typ === t)[i]?.id, [typ, n]);
async function ziehe(feld, vorz, px, titel) {
  const g = (await griffe()).find((k) => k.feld === feld && k.faktor * vorz > 0); if (!g) return ok(false, `${titel}: Pfeil ${feld} (${vorz > 0 ? "+" : "−"}) fehlt`);
  const v0 = +(await s.inputValue("#d_" + feld)), dx = g.schirm.b[0] - g.schirm.a[0], dy = g.schirm.b[1] - g.schirm.a[1], L = Math.hypot(dx, dy) || 1;
  await s.mouse.move(g.schirm.b[0], g.schirm.b[1]); await s.mouse.down(); await s.mouse.move(g.schirm.b[0] + dx / L * px, g.schirm.b[1] + dy / L * px, { steps: 5 }); await s.mouse.up(); await s.waitForTimeout(300);
  const v1 = +(await s.inputValue("#d_" + feld)); ok(vorz > 0 ? v1 > v0 : v1 < v0, `${titel}: ${feld} ${vorz > 0 ? "Pfeil +" : "Pfeil −"} ${v0} → ${v1}`);
}
async function pruefe(id, titel, felder, ziel, nurPlus) {
  await s.evaluate((i) => window.sdcadTest.bearbeite(i), id); await s.waitForTimeout(800); await s.evaluate(() => document.getElementById("zoomAlles").click()); await s.waitForTimeout(400);
  const g = await griffe(); for (const [feld, n] of Object.entries(felder)) ok(g.filter((k) => k.feld === feld).length === n, `${titel}: ${n} Pfeile für «${feld}» (in beide Richtungen)`);
  if (ziel) { // die Pfeile sitzen am Körper (Spitze des Flansches bzw. Ende der Drehung)
    const bb = await s.evaluate((z) => { const k = window.sdcadTest.koerper().filter((q) => String(q.fid).split(":")[0] === z); return k.length ? { min: [0, 1, 2].map((i) => Math.min(...k.map((q) => q.min[i]))), max: [0, 1, 2].map((i) => Math.max(...k.map((q) => q.max[i]))) } : null; }, ziel);
    const nah = g.every((k) => bb && k.pos.every((v, i) => v >= bb.min[i] - 3 && v <= bb.max[i] + 3)); ok(nah, `${titel}: Pfeile sitzen am Körper (${g[0]?.pos.map((v) => Math.round(v))} in ${bb && bb.min.map(Math.round)}…${bb && bb.max.map(Math.round)})`); }
  for (const feld of Object.keys(felder)) { await ziehe(feld, 1, 35, titel); if (!nurPlus) await ziehe(feld, -1, 25, titel); }
  await s.evaluate(() => document.getElementById("dOk").click()); await s.waitForTimeout(300);
}
// Flansch am Flächenblech
await s.evaluate(() => window.sdcadTest.waehle("fl")); await s.evaluate(() => document.querySelector('[data-kantenwz="flansch"]').click()); await s.waitForTimeout(300);
await s.evaluate(() => window.sdcadTest.kantenWahl("0:0")); await s.waitForTimeout(500); await s.keyboard.press("Escape");
await pruefe(await feat("kante"), "Flansch Flächenblech", { laenge: 2, winkel: 2 }, "fl");
// Flansch/Umschlag am Blechprofil: Kante B und Stirn
await s.evaluate(() => window.sdcadTest.waehle("bp")); await s.evaluate(() => document.querySelector('[data-kantenwz="flansch"]').click()); await s.waitForTimeout(300);
await s.evaluate(() => window.sdcadTest.kantenWahl("B")); await s.waitForTimeout(500); await s.evaluate(() => window.sdcadTest.kantenWahl("S1:1")); await s.waitForTimeout(500); await s.keyboard.press("Escape");
await pruefe(await feat("profilkante", 0), "Flansch Kante B", { laenge: 2, winkel: 2 }, "bp");
await pruefe(await feat("profilkante", 1), "Flansch Stirn", { laenge: 2, winkel: 2 }, "bp");
// Drehung und Gebäude
await pruefe("dr", "Drehung", { winkel: 2 }, "dr");
await pruefe("g1", "Gebäude", { breite: 2, tiefe: 2, traufhoehe: 1 }, "g1", true);
ok(pr.length === 0, "keine Seitenfehler " + pr.join(" | "));
await b.close(); srv.close();
console.log(fehler ? `${fehler} Fehler` : "Ziehpfeile Kanten/Drehung/Gebäude (App): alle Prüfungen bestanden"); process.exit(fehler ? 1 : 0);
