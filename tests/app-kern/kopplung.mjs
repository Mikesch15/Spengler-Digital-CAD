// App-Test Kopplung: Nachbarflächen des Dachs und Seitenwand ⇄ Gaubendach der Lukarne
// node tests/app-kern/kopplung.mjs (nach node build.mjs; Playwright/Chromium)
import { createServer } from "node:http"; import { readFileSync } from "node:fs"; import { createRequire } from "node:module"; import { extname, join, resolve } from "node:path";
const dist = resolve("dist"), { chromium } = createRequire(import.meta.url)("playwright");
const typ = { ".html": "text/html", ".js": "text/javascript", ".wasm": "application/wasm", ".json": "application/json" };
const srv = createServer((q, a) => { let p, d; try { p = q.url === "/" ? "index.html" : decodeURIComponent(q.url.slice(1).split("?")[0]); d = readFileSync(join(dist, p)); } catch { a.writeHead(404); a.end(); return; } a.writeHead(200, { "content-type": typ[extname(p)] ?? "application/octet-stream" }); a.end(d); }).listen(+process.env.PORT || 8797);
let fehler = 0; const ok = (c, t) => { console.log(`${c ? "✓" : "✗"} ${t}`); if (!c) fehler++; };
const b = await chromium.launch(), pr = [];
const neueSeite = async (doc) => { const s = await b.newPage({ viewport: { width: 1280, height: 800 } }); s.on("pageerror", (e) => pr.push(e.message)); { const f0 = s.fill.bind(s); s.fill = async (sel, v, o) => (o?.force ? s.evaluate(([q, w]) => { const e = document.querySelector(q); e.value = w; e.dispatchEvent(new Event("input", { bubbles: true })); }, [sel, v]) : f0(sel, v, o)); } if (doc) await s.addInitScript((d) => localStorage.setItem("sdcad-doc-0.2", d), doc); await s.goto("http://localhost:" + (process.env.PORT || 8797) + "/index.html?test"); await s.waitForTimeout(1200); return s; };
// ---- 1. Dach: Nachbarflächen
let s = await neueSeite();
await s.evaluate(() => document.getElementById("wDachAuto").click()); await s.waitForSelector("#d_quelle", { state: "attached", timeout: 6000 }); await s.waitForTimeout(400);
await s.selectOption("#d_quelle", "skizzen", { force: true }); await s.waitForSelector("#d_fAdd", { state: "attached", timeout: 6000 }); await s.waitForTimeout(800); await s.click("#dOk"); await s.waitForTimeout(500);
let doc = await s.evaluate(() => window.sdcadTest.dok()), dach = doc.features.find((f) => f.typ === "dach");
ok(Array.isArray(dach.kopplung) && dach.kopplung.length >= 2 && dach.kopplung.every((g) => g.m.length === 2 && g.m.every((x) => x.length === 3)), `Dach: ${dach.kopplung?.length} Eckgruppen (First-Ecken) gekoppelt`);
const sk0 = doc.features.find((f) => f.id === dach.flaechenSkizzen[0]), sk1 = doc.features.find((f) => f.id === dach.flaechenSkizzen[1]), P0 = sk0.elemente[0].pts, P1 = sk1.elemente[0].pts;
const grat = dach.kopplung[0], i0 = grat.m.find((m) => m[0] === sk0.id)[1], i1 = grat.m.find((m) => m[0] === sk1.id)[1];
const verl = P0.map((p, i) => (i === i0 ? [p[0] + (P0[i0][0] > (P0[(i0 + 1) % 4][0] + P0[(i0 + 3) % 4][0]) / 2 ? 100 : -100), p[1]] : p)); // First an dieser Ecke um 100 mm entlang der Kante verlängern
await s.close();
s = await neueSeite(JSON.stringify(doc).replace(JSON.stringify(P0), JSON.stringify(verl)));
const doc2 = await s.evaluate(() => window.sdcadTest.dok()), sk1b = doc2.features.find((f) => f.id === sk1.id).elemente[0].pts;
ok(JSON.stringify(sk1b) !== JSON.stringify(P1) && sk1b.filter((p, i) => JSON.stringify(p) !== JSON.stringify(P1[i])).length === 1, "Nachbarfläche folgt: genau eine Ecke ihrer Skizze hat sich mit verschoben");
await s.evaluate((id) => window.sdcadTest.bearbeite(id), dach.id); await s.waitForSelector("#d_quelle", { state: "attached", timeout: 6000 }); await s.waitForTimeout(600);
ok(!/gemeinsame Kante weicht/.test(await s.textContent("#dInfo")), "Keine Warnung «gemeinsame Kante weicht ab» nach dem Koppeln – " + (await s.textContent("#dInfo")).slice(0, 100));
await s.close();
// ---- 2. Lukarne: Seitenwand ⇄ Gaubendach
const basis = { objekt: "T", nr: "1", zaehler: 20, features: [{ id: "g1", typ: "gebaeude", name: "Gebäude 1", breite: 12000, tiefe: 9000, traufhoehe: 3000, wandstaerke: 300, x: 0, z: 0 }, { id: "d1", typ: "dach", name: "Dach 1", gebaeude: "g1", form: "sattel", firstRichtung: "laengs", neigung: 35, neigung2: 35, ueberstandTraufe: 400, ueberstandOrtgang: 300, deckung: "schiebeziegel", aufbau: "standard-200", darstellung: "platte" },
  { id: "l1", typ: "lukarne", name: "Lukarne 1", dach: "d1", flaeche: 0, masse: "aufmass", art: "schlepp", bu: 1800, bo: 1800, hf: 1200, hL: 0, wL: 90, lL: 1700, hR: 0, wR: 90, lR: 1700, neigung: 30, wd: 150, dd: 250, x: 5000, y: 1200 }] };
s = await neueSeite(JSON.stringify(basis));
await s.evaluate(() => window.sdcadTest.bearbeite("l1")); await s.waitForSelector("#d_dachQuelle", { state: "attached", timeout: 6000 }); await s.selectOption("#d_dachQuelle", "skizzen", { force: true }); await s.waitForSelector("#d_lL", { state: "attached", timeout: 30000 }); await s.waitForTimeout(600); await s.click("#dOk"); await s.waitForTimeout(500);
doc = await s.evaluate(() => window.sdcadTest.dok()); let lk = doc.features.find((f) => f.id === "l1");
ok(lk.dachKopplung?.links && lk.dachKopplung?.rechts, "Lukarne: Traufende links und rechts mit je einer Ecke der Dachskizze gekoppelt");
const dachSk = doc.features.find((f) => f.id === lk.dachSkizzen[0]), vorher = JSON.stringify(dachSk.elemente[0].pts);
// (a) Seitenwand neu gemessen → Ecke der Dachskizze folgt
await s.evaluate(() => window.sdcadTest.bearbeite("l1")); await s.waitForSelector("#d_wL", { state: "attached", timeout: 6000 }); await s.fill("#d_wL", "93", { force: true }); await s.dispatchEvent("#d_wL", "input"); await s.waitForTimeout(800); await s.click("#dOk"); await s.waitForTimeout(500);
doc = await s.evaluate(() => window.sdcadTest.dok()); const nachher = JSON.stringify(doc.features.find((f) => f.id === lk.dachSkizzen[0]).elemente[0].pts);
ok(nachher !== vorher, "Winkel oben links neu gemessen (90° → 93°): die Ecke der Dachskizze ist mitgewandert");
// (b) Ecke in der Skizze verschoben → Seitenwand rechnet Winkel und Trauflänge neu
const ek = doc.features.find((f) => f.id === "l1").dachKopplung.rechts, skR = doc.features.find((f) => f.id === ek.sk), PR = skR.elemente[0].pts;
const PR2 = PR.map((p, i) => (i === ek.i ? [p[0] + 60, p[1]] : p)), lR0 = doc.features.find((f) => f.id === "l1").lR;
await s.close(); s = await neueSeite(JSON.stringify(doc).replace(JSON.stringify(PR), JSON.stringify(PR2)));
const doc3 = await s.evaluate(() => window.sdcadTest.dok()), lk3 = doc3.features.find((f) => f.id === "l1");
ok(Math.abs(lk3.lR - lR0) > 5 || Math.abs(lk3.wR - 90) > 0.05, `Ecke in der Skizze verschoben: Seitenwand rechts rechnet neu (Trauflänge ${lR0} → ${lk3.lR}, Winkel 90 → ${lk3.wR})`);
ok(pr.length === 0, "keine Seitenfehler " + pr.join(" | "));
await b.close(); srv.close();
console.log(fehler ? `${fehler} Fehler` : "Kopplung (App): alle Prüfungen bestanden"); process.exit(fehler ? 1 : 0);
