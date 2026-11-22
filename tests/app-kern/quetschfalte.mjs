// App-Test Blechprofil: nachträglich Flansch/Umschlag an Kante A und B ansetzen (Kanten-Werkzeug)
// node tests/app-kern/stirnflansch.mjs (nach node build.mjs; Playwright/Chromium)
import { createServer } from "node:http"; import { readFileSync } from "node:fs"; import { createRequire } from "node:module"; import { extname, join, resolve } from "node:path";
const dist = resolve("dist"), { chromium } = createRequire(import.meta.url)("playwright");
const typ = { ".html": "text/html", ".js": "text/javascript", ".wasm": "application/wasm", ".json": "application/json" };
const srv = createServer((q, a) => { let p, d; try { p = q.url === "/" ? "index.html" : decodeURIComponent(q.url.slice(1).split("?")[0]); d = readFileSync(join(dist, p)); } catch { a.writeHead(404); a.end(); return; } a.writeHead(200, { "content-type": typ[extname(p)] ?? "application/octet-stream" }); a.end(d); }).listen(+process.env.PORT || 8797);
let fehler = 0; const ok = (c, t) => { console.log(`${c ? "✓" : "✗"} ${t}`); if (!c) fehler++; };
// App-Test Quetschfalte: Flächenblech mit Ortgang an zwei Kanten, Ecke anklicken
const b = await chromium.launch(), s = await b.newPage({ viewport: { width: 1280, height: 800 } }), pr = []; s.on("pageerror", (e) => pr.push(e.message));
const mk = (kanten) => ({ objekt: "T", nr: "1", zaehler: 20, features: [
  { id: "sk", typ: "skizze", name: "Rechteck", ebene: "XY", elemente: [{ id: 1, art: "rechteck", a: [0, 0], b: [200, 120] }], bedingungen: [] },
  { id: "fl", typ: "flaeche", name: "Blech 1", skizze: "sk", material: "zink07", flaechen: [[10, 10]], kanten }] });
await s.addInitScript((d) => { localStorage.setItem("sdcad-doc-0.2", JSON.stringify(d)); localStorage.setItem("sdcad-einstellungen", JSON.stringify({ materialien: [{ id: "zink07", name: "Z", t: 0.7, ri: 1, k: 0.4, dichte: 7.2 }] })); }, mk({ "0:0": "ortgang", "0:3": "ortgang" }));
await s.goto("http://localhost:" + (process.env.PORT || 8797) + "/index.html?test"); await s.waitForTimeout(1500);
await s.evaluate(() => document.getElementById("zoomAlles").click()); await s.waitForTimeout(300);
await s.evaluate(() => window.sdcadTest.waehle("fl")); await s.waitForTimeout(200);
await s.evaluate(() => document.getElementById("wQuetsch").click()); await s.waitForTimeout(300);
const q = await s.evaluate(() => window.sdcadTest.schirmUV("XY", [0, 0])); await s.mouse.move(q[0], q[1]); await s.mouse.click(q[0], q[1]); await s.waitForTimeout(700);
const d = await s.evaluate(() => { const f = window.sdcadTest.dok().features.find((x) => x.typ === "quetschfalte"); return f ? { ecke: f.ecke, fehler: f._fehler || "", q: !!f._q, ok: f._q?.pruefung?.ok, psi: f._q?.zus?.psi, vol: window.sdcadTest.koerper().filter((k) => k.fid === f.id).reduce((a, k) => a + Math.abs(k.volumen), 0) } : null; });
ok(!!d && !d.fehler && d.vol > 10, "Quetschfalte an der Ecke angelegt (" + JSON.stringify(d) + ")");
ok(d && d.vol > 10, "Gefaltete Quetschfalte als Körper (Volumen " + Math.round(d?.vol || 0) + ")");
// Ecke ohne Flansch an der Nachbarkante → Fehlermeldung statt Falte
const q2 = await s.evaluate(() => window.sdcadTest.schirmUV("XY", [200, 120])); await s.evaluate(() => window.sdcadTest.waehle("fl")); await s.evaluate(() => document.getElementById("wQuetsch").click()); await s.waitForTimeout(200); await s.mouse.click(q2[0], q2[1]); await s.waitForTimeout(600);
const st2 = await s.evaluate(() => document.getElementById("status")?.textContent || "");
ok(/Flansch/.test(st2), "Ecke ohne Flansche: verständliche Meldung (" + st2.slice(0, 80) + ")");
// Ungleiche Flansche (75° / 40 mm hoch an der linken Kante, 90° / 25 mm unten): Quetschfalte funktioniert, Zuschnitt enthält die Ecke
{ const s2 = await b.newPage({ viewport: { width: 1280, height: 800 } }); s2.on("pageerror", (e) => pr.push(e.message));
  await s2.addInitScript((d) => { localStorage.setItem("sdcad-doc-0.2", JSON.stringify(d)); localStorage.setItem("sdcad-einstellungen", JSON.stringify({ materialien: [{ id: "zink07", name: "Z", t: 0.7, ri: 1, k: 0.4, dichte: 7.2 }] })); }, mk({ "0:0": "ortgang", "0:3": { folge: "75 40", versatz: 0 } }));
  await s2.goto("http://localhost:" + (process.env.PORT || 8797) + "/index.html?test"); await s2.waitForTimeout(1500);
  await s2.evaluate(() => window.sdcadTest.waehle("fl")); await s2.evaluate(() => document.getElementById("wQuetsch").click()); await s2.waitForTimeout(300);
  const qq = await s2.evaluate(() => window.sdcadTest.schirmUV("XY", [0, 0])); await s2.mouse.click(qq[0], qq[1]); await s2.waitForTimeout(800);
  const a0 = await s2.evaluate(() => window.sdcadTest.quetschAbw("fl")), st3 = await s2.evaluate(() => document.getElementById("status").textContent);
  ok(a0 && a0.quetsch.length === 1 && a0.arten.includes("quetsch"), "Ungleiche Winkel/Höhen: Quetschfalte angelegt und im Zuschnitt als Faltlinie enthalten (" + JSON.stringify(a0?.fehler || {}) + " " + st3.slice(0, 60) + ")");
  const vol2 = await s2.evaluate(() => window.sdcadTest.koerper().filter((k) => /^f\d+$/.test(String(k.fid))).reduce((a, k) => a + Math.abs(k.volumen), 0));
  ok(vol2 > 10, "Gefaltete Quetschfalte (zwei Lagen mit gerundeter Faltkante) als Körper (Volumen " + Math.round(vol2) + ")");
  const gleich = await s.evaluate(() => window.sdcadTest.quetschAbw("fl")); ok(gleich && gleich.quetsch.length === 1 && gleich.arten.filter((x) => x === "ecklinie").length === 2 && gleich.arten.includes("quetsch") && Math.abs(gleich.umriss[0][1] + 24.3) < 0.2, "Gleiche Flansche (90°): Zuschnitt bleibt im Eck ein volles Quadrat (Überschuss wird gefaltet), Ecklinien und Faltlinie sind eingezeichnet");
  await s2.close(); }
ok(pr.length === 0, "keine Seitenfehler " + pr.join(" | "));
await b.close(); srv.close();
console.log(fehler ? `${fehler} Fehler` : "Quetschfalte (App): alle Prüfungen bestanden"); process.exit(fehler ? 1 : 0);
