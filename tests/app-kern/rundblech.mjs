// App-Test Rund-/Kegelblech: Werkzeug, Dialog, Werkstatt mit Abwicklung/DXF, Netz und exakter Körper
// node tests/app-kern/rundblech.mjs (nach node build.mjs; Playwright/Chromium)
import { createServer } from "node:http";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { extname, join, resolve } from "node:path";
const dist = resolve("dist"), { chromium } = createRequire(import.meta.url)("playwright");
const typ = { ".html": "text/html", ".js": "text/javascript", ".wasm": "application/wasm", ".json": "application/json" };
const srv = createServer((q, a) => { let p, d; try { p = q.url === "/" ? "index.html" : decodeURIComponent(q.url.slice(1).split("?")[0]); d = readFileSync(join(dist, p)); } catch { a.writeHead(404); a.end(); return; } a.writeHead(200, { "content-type": typ[extname(p)] ?? "application/octet-stream" }); a.end(d); }).listen(+process.env.PORT || 8768);
let fehler = 0; const ok = (b, t) => { console.log(`${b ? "✓" : "✗"} ${t}`); if (!b) fehler++; };
const b = await chromium.launch(), PI = Math.PI, t = 0.7;
for (const kern of [null, "occt"]) {
  const s = await b.newPage({ acceptDownloads: true }), probleme = []; s.on("pageerror", (e) => probleme.push(e.message));
  await s.addInitScript((k) => { localStorage.setItem("sdcad-doc-0.2", JSON.stringify({ objekt: "Rund", nr: "R-1", zaehler: 5, features: [] }));
    localStorage.setItem("sdcad-einstellungen", JSON.stringify({ materialien: [{ id: "zink07", name: "Titanzink 0.70", t: 0.7, ri: 1.0, k: 0.4, dichte: 7.2 }], programm: { kern: k || "netz" } })); }, kern);
  await s.goto("http://localhost:" + (process.env.PORT || 8768) + "/index.html?test"); await s.waitForTimeout(500);
  await s.evaluate(() => document.getElementById("wRund").click());           // Werkzeug: Standard Kegelstumpf Ø400/Ø200, h 150, Zugabe 10
  await s.waitForSelector("#kRundDxf", { timeout: 5000 });
  const info = await s.textContent("#dInfo");
  await s.click("#dOk");
  if (kern) await s.waitForFunction(() => /Exakt aus dem CAD-Kern|CAD-Kern:/.test(document.getElementById("status").textContent), null, { timeout: 60000 });
  const k = (await s.evaluate(() => window.sdcadTest.koerperInfo())).at(-1), st = await s.textContent("#status");
  const sl = Math.hypot(100, 150), V = t * PI * (200 + 100) * sl; // Pappus: t · Mantelfläche der Mittelfläche
  const name = kern ? "Ein" : "Aus";
  ok(/R 360\.\d \/ r 180\.\d · \d+\.\d\d°/.test(info), `${name}: Dialog zeigt Abwicklung «${info}»`);
  ok(k && Math.abs(k.volumen - V) / V < (kern ? 0.002 : 0.01) && (!!k.exakt === !!kern), `${name}: 3D-Mantel V ${k?.volumen.toFixed(0)} ≈ ${V.toFixed(0)} mm³ (exakt: ${k?.exakt})${kern ? " – " + st : ""}`);
  ok(Math.abs(k.min[1] + t / 2 * 100 / sl) < 1e-3 && Math.abs(k.max[1] - 150 - t / 2 * 100 / sl) < 0.5 && Math.abs(k.max[0] - 200 - t / 2 * 150 / sl) < 1, `${name}: Lage – Grundfläche XZ, Achse Y (y ${k.min[1].toFixed(2)}…${k.max[1].toFixed(2)}, x max ${k.max[0].toFixed(2)})`);
  const [dl] = await Promise.all([s.waitForEvent("download"), s.click("#kRundDxf")]);
  const dx = readFileSync(await dl.path(), "utf8");
  ok((dx.match(/\nARC\n/g) || []).length === 2 && /\nNAHT\n/.test(dx), `${name}: Werkstatt → DXF mit 2 Bögen und Nahtlinie`);
  await s.click('[data-register="auftrag"]');
  const auftrag = await s.textContent("#werkstatt");
  ok(/Rundblech 1/.test(auftrag) && /431\.9/.test(auftrag), `${name}: Rundblech in der Stückliste (Zuschnitt 431.9 mm)`);
  ok(probleme.length === 0, `${name}: keine Seitenfehler ${probleme.join(" | ")}`);
  await s.close();
}
// Rohr Ø150 durch Dach 30° (kürzeste Länge 200): Volumen = t·2π·rm·(h + rm·tan α), Netz (CSG) und exakt (Halbraum)
for (const kern of [null, "occt"]) {
  const s = await b.newPage(), probleme = []; s.on("pageerror", (e) => probleme.push(e.message));
  await s.addInitScript((k) => { localStorage.setItem("sdcad-doc-0.2", JSON.stringify({ objekt: "Rohr", nr: "R-2", zaehler: 5, features: [{ id: "ro", typ: "rundblech", name: "Entlüftungsrohr", art: "zylinder", d1: 150, d2: 150, h: 200, neigung: 30, winkel: 360, zugabe: 8, material: "zink07", ebene: "XZ" }] }));
    localStorage.setItem("sdcad-einstellungen", JSON.stringify({ materialien: [{ id: "zink07", name: "Titanzink 0.70", t: 0.7, ri: 1.0, k: 0.4, dichte: 7.2 }], programm: { kern: k || "netz" } })); }, kern);
  await s.goto("http://localhost:" + (process.env.PORT || 8768) + "/index.html?test");
  if (kern) await s.waitForFunction(() => /Exakt aus dem CAD-Kern|CAD-Kern:/.test(document.getElementById("status").textContent), null, { timeout: 60000 }); else await s.waitForTimeout(1500);
  const k = (await s.evaluate(() => window.sdcadTest.koerperInfo())).find((o) => o.fid === "ro"), ta = Math.tan(PI / 6), V = t * 2 * PI * 75 * (200 + 75 * ta);
  const name = kern ? "Ein" : "Aus";
  ok(k && Math.abs(k.volumen - V) / V < (kern ? 0.002 : 0.02) && !!k.exakt === !!kern, `${name}: Rohr mit Anschnitt 30° V ${k?.volumen.toFixed(0)} ≈ ${V.toFixed(0)} mm³ (exakt: ${k?.exakt})`);
  ok(k && Math.abs(k.max[1] - (200 + 75 * ta)) < 0.05 && Math.abs(k.min[1] + 75.35 * ta) < 0.5, `${name}: Oberkante ${k?.max[1].toFixed(2)}, tiefster Punkt ${k?.min[1].toFixed(2)} (Dachseite)`);
  ok(probleme.length === 0, `${name}: keine Seitenfehler ${probleme.join(" | ")}`);
  await s.close();
}
await b.close(); srv.close();
console.log(fehler ? `${fehler} Fehler` : "Rund-/Kegelblech in der App: alle Prüfungen bestanden"); process.exit(fehler ? 1 : 0);
