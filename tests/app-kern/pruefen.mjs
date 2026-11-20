// App-Test für Phase C1: node tests/app-kern/pruefen.mjs  (vorher node build.mjs; Playwright/Chromium nötig)
// 1. Schalter aus (Standard): wie Version 0.2, kein Kern-Download, kein exakter STEP-Knopf
// 2. Schalter ein: Werkstatt «3D-Prüfung (exakt)» stimmt mit der Abwicklung, «STEP exakt» liefert B-Rep (AP242)
import { createServer } from "node:http";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { extname, join, resolve } from "node:path";
const dist = resolve("dist"), { chromium } = createRequire(import.meta.url)("playwright");
const typ = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".wasm": "application/wasm", ".json": "application/json", ".webmanifest": "application/manifest+json" };
const srv = createServer((q, a) => { let p, d; try { p = q.url === "/" ? "index.html" : decodeURIComponent(q.url.slice(1).split("?")[0]); d = readFileSync(join(dist, p)); } catch { a.writeHead(404); a.end(); return; } a.writeHead(200, { "content-type": typ[extname(p)] ?? "application/octet-stream" }); a.end(d); }).listen(8767);
let fehler = 0; const ok = (b, t) => { console.log(`${b ? "✓" : "✗"} ${t}`); if (!b) fehler++; };
const b = await chromium.launch();
async function seite(kern) {
  const s = await b.newPage({ acceptDownloads: true }), anfragen = [], probleme = [];
  s.on("request", (r) => anfragen.push(r.url())); s.on("pageerror", (e) => probleme.push(e.message)); s.on("console", (m) => m.type() === "error" && probleme.push(m.text()));
  // Einstellungen werden nur mit Materialliste übernommen (wie gespeicherte Einstellungen der App)
  if (kern) await s.addInitScript((k) => localStorage.setItem("sdcad-einstellungen", JSON.stringify({ materialien: [{ id: "zink07", name: "Titanzink 0.70", t: 0.7, ri: 1.0, k: 0.4, dichte: 7.2 }], programm: { kern: k } })), kern);
  await s.goto("http://localhost:8767/index.html?test");
  await s.waitForTimeout(800);
  return { s, anfragen, probleme };
}
{ // 1 Schalter aus
  const { s, anfragen, probleme } = await seite(null);
  ok(await s.evaluate(() => document.getElementById("wStepExakt").hidden), "Aus: Knopf «STEP exakt» verborgen");
  ok(!anfragen.some((u) => /\/cad\//.test(u)), "Aus: kein Laden des CAD-Kerns");
  ok(!(await s.$("#k3D")), "Aus: keine 3D-Prüfung in der Werkstatt");
  ok(probleme.length === 0, `Aus: keine Fehler in der Konsole ${probleme.join(" | ")}`);
  await s.close();
}
{ // 2 Schalter ein
  const { s, anfragen, probleme } = await seite("occt");
  ok(await s.evaluate(() => !document.getElementById("wStepExakt").hidden), "Ein: Knopf «STEP exakt» sichtbar");
  ok(!anfragen.some((u) => /replicad_single\.wasm/.test(u)), "Ein: Kern wird erst bei Gebrauch geladen (lazy)");
  await s.waitForSelector("#k3D", { timeout: 5000 });
  await s.click("#k3D");
  await s.waitForFunction(() => /^[✓⚠]|CAD-Kern/.test(document.getElementById("k3DErg").textContent), null, { timeout: 60000 });
  const erg = await s.textContent("#k3DErg");
  ok(erg.startsWith("✓") && /Δ -?0\.0000/.test(erg), `Ein: 3D-Prüfung Traufblech: ${erg}`);
  const [dl] = await Promise.all([s.waitForEvent("download", { timeout: 60000 }), s.evaluate(() => document.getElementById("wStepExakt").click())]);
  const text = readFileSync(await dl.path(), "utf8");
  ok(/exakt\)\.step$/.test(dl.suggestedFilename()) && /AP242/.test(text) && /MANIFOLD_SOLID_BREP/.test(text) && /CYLINDRICAL_SURFACE/.test(text), `Ein: STEP exakt «${dl.suggestedFilename()}» – AP242, Volumenkörper, exakte Biegezylinder`);
  ok(/STEP exakt \(B-Rep, AP242\): 1 Blechteil/.test(await s.textContent("#status")), "Ein: Statusmeldung nennt exportierte Teile");
  ok(probleme.length === 0, `Ein: keine Fehler in der Konsole ${probleme.join(" | ")}`);
  await s.close();
}
await b.close(); srv.close();
console.log(fehler ? `${fehler} Fehler` : "App mit CAD-Kern: alle Prüfungen bestanden"); process.exit(fehler ? 1 : 0);
