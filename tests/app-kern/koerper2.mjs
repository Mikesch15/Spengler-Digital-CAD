// App-Test Blechprofil: nachträglich Flansch/Umschlag an Kante A und B ansetzen (Kanten-Werkzeug)
// node tests/app-kern/stirnflansch.mjs (nach node build.mjs; Playwright/Chromium)
import { createServer } from "node:http"; import { readFileSync } from "node:fs"; import { createRequire } from "node:module"; import { extname, join, resolve } from "node:path";
const dist = resolve("dist"), { chromium } = createRequire(import.meta.url)("playwright");
const typ = { ".html": "text/html", ".js": "text/javascript", ".wasm": "application/wasm", ".json": "application/json" };
const srv = createServer((q, a) => { let p, d; try { p = q.url === "/" ? "index.html" : decodeURIComponent(q.url.slice(1).split("?")[0]); d = readFileSync(join(dist, p)); } catch { a.writeHead(404); a.end(); return; } a.writeHead(200, { "content-type": typ[extname(p)] ?? "application/octet-stream" }); a.end(d); }).listen(+process.env.PORT || 8797);
let fehler = 0; const ok = (c, t) => { console.log(`${c ? "✓" : "✗"} ${t}`); if (!c) fehler++; };
const b = await chromium.launch(), s = await b.newPage({ viewport: { width: 1280, height: 800 } }), pr = []; s.on("pageerror", (e) => pr.push(e.message));
const sk = (id, ebene, elemente) => ({ id, typ: "skizze", name: id, ebene, elemente, bedingungen: [] });
const features = [
  sk("s1", "XY", [{ id: 1, art: "rechteck", a: [0, 0], b: [100, 60] }]), { id: "e1", typ: "extrusion", name: "Block", skizze: "s1", abstand: 40, richtung: "eine", vorgang: "neu" },
  sk("sp", "XY", [{ id: 1, art: "punkt", p: [50, 30] }]), { id: "bo", typ: "bohrung", name: "Bohrung", ziel: "e1", skizze: "sp", art: "einfach", d: 10, durch: true, tiefe: 20, seite: "normale", dSenk: 16, tSenk: 5, winkel: 90 },
  { id: "sk2", typ: "skalieren", name: "Skalieren", ziel: "e1", faktor: 2, mitte: "ursprung", kopie: true },
  sk("sr", "XY", [{ id: 2, art: "linie", pts: [[200, 0], [300, 0], [300, 100]], geschlossen: false }]), { id: "ro", typ: "rohr", name: "Rohr", skizze: "sr", kette: 0, d: 10, wand: 1, vorgang: "neu" },
  { id: "sw", typ: "spirale", name: "Feder", dm: 40, steigung: 10, windungen: 6, draht: 3, achse: "Y", x: 500, y: 0, z: 0, vorgang: "neu" },
  sk("sl", "XY", [{ id: 3, art: "linie", pts: [[400, 0], [450, 0]], geschlossen: false }]), { id: "ri", typ: "rippe", name: "Rippe", skizze: "sl", kette: 0, dicke: 3, hoehe: 20, richtung: "eine", vorgang: "neu" }];
await s.addInitScript((d) => localStorage.setItem("sdcad-doc-0.2", JSON.stringify({ objekt: "T", nr: "1", zaehler: 60, features: d })), features);
await s.goto("http://localhost:" + (process.env.PORT || 8797) + "/index.html?test"); await s.waitForTimeout(2000);
const vol = (id) => s.evaluate((i) => window.sdcadTest.koerper().filter((k) => String(k.fid).split(":")[0] === i).reduce((a, k) => a + Math.abs(k.volumen), 0), id);
const fehl = await s.evaluate(() => window.sdcadTest.dok().features.map((f) => f.id + ":" + (f._fehler || "")).filter((x) => !x.endsWith(":")));
ok(fehl.length === 0, "Keine Fehler in den neuen Körperwerkzeugen " + fehl.join(" | "));
const v1 = await vol("e1"), soll = 100 * 60 * 40 - Math.PI * 25 * 40;
ok(Math.abs(v1 - soll) / soll < 0.02, `Bohrung Ø10 durchgehend: Volumen ${Math.round(v1)} ≈ ${Math.round(soll)}`);
const vk = await vol("sk2"); ok(Math.abs(vk / v1 - 8) < 0.2, `Skalieren ×2 als Kopie: Volumen ×${(vk / v1).toFixed(2)} ≈ 8`);
const vr = await vol("ro"), sr = Math.PI * (25 - 16) * 200; ok(vr > sr * 0.9 && vr < sr * 1.3, `Rohr Ø10 × 1 mm entlang des Pfads: Volumen ${Math.round(vr)} ≈ ${Math.round(sr)}`);
const vs = await vol("sw"), ss = Math.PI * 1.5 * 1.5 * 6 * Math.hypot(Math.PI * 40, 10); ok(vs > ss * 0.85 && vs < ss * 1.15, `Spirale (6 Windungen): Volumen ${Math.round(vs)} ≈ ${Math.round(ss)}`);
const vi = await vol("ri"); ok(vi > 3000 && vi < 3400, `Rippe 3 × 20 × 50 mm: Volumen ${Math.round(vi)}`);
// Dialog öffnet für alle fünf Werkzeuge
for (const [id, feld] of [["wBohrung", "#d_d"], ["wSkalieren", "#d_faktor"], ["wRohr", "#d_wand"], ["wSpirale", "#d_steigung"], ["wRippe", "#d_dicke"]]) {
  await s.evaluate((i) => document.getElementById(i).click(), id); await s.waitForSelector(feld, { state: "attached", timeout: 4000 }).then(() => ok(true, `Dialog ${id}`)).catch(() => ok(false, `Dialog ${id}`)); await s.evaluate(() => document.getElementById("dAbbrechen").click()); await s.waitForTimeout(200); }
ok(pr.length === 0, "keine Seitenfehler " + pr.join(" | "));
await b.close(); srv.close();
console.log(fehler ? `${fehler} Fehler` : "Körperwerkzeuge Bohrung/Skalieren/Rohr/Spirale/Rippe (App): alle Prüfungen bestanden"); process.exit(fehler ? 1 : 0);
