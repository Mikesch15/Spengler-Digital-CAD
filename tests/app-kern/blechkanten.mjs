// App-Test Blechprofil: nachträglich Flansch/Umschlag an Kante A und B ansetzen (Kanten-Werkzeug)
// node tests/app-kern/blechkanten.mjs (nach node build.mjs; Playwright/Chromium)
import { createServer } from "node:http"; import { readFileSync } from "node:fs"; import { createRequire } from "node:module"; import { extname, join, resolve } from "node:path";
const dist = resolve("dist"), { chromium } = createRequire(import.meta.url)("playwright");
const typ = { ".html": "text/html", ".js": "text/javascript", ".wasm": "application/wasm", ".json": "application/json" };
const srv = createServer((q, a) => { let p, d; try { p = q.url === "/" ? "index.html" : decodeURIComponent(q.url.slice(1).split("?")[0]); d = readFileSync(join(dist, p)); } catch { a.writeHead(404); a.end(); return; } a.writeHead(200, { "content-type": typ[extname(p)] ?? "application/octet-stream" }); a.end(d); }).listen(+process.env.PORT || 8797);
let fehler = 0; const ok = (c, t) => { console.log(`${c ? "✓" : "✗"} ${t}`); if (!c) fehler++; };
const b = await chromium.launch(), s = await b.newPage({ viewport: { width: 1280, height: 800 } }), pr = []; s.on("pageerror", (e) => pr.push(e.message));
{ const f0 = s.fill.bind(s); s.fill = async (sel, v, o) => (o?.force ? s.evaluate(([q, w]) => { const e = document.querySelector(q); e.value = w; e.dispatchEvent(new Event("input", { bubbles: true })); }, [sel, v]) : f0(sel, v, o)); }

const L = [[0, 0], [200, 0], [200, 60], [80, 60], [80, 120], [0, 120]]; // L-förmig: 6 Kanten
const pj = { objekt: "K", nr: "K-1", zaehler: 10, features: [
  { id: "sk", typ: "skizze", name: "Rechteck", ebene: "XY", elemente: [{ id: 1, art: "rechteck", a: [0, 0], b: [200, 100] }] },
  { id: "fl", typ: "flaeche", name: "Blech 1", skizze: "sk", material: "zink07", flaechen: [[10, 10]], kanten: {} },
  { id: "sl", typ: "skizze", name: "L-Form", ebene: "XY", elemente: [{ id: 1, art: "linie", pts: L.map(([x, y]) => [x + 400, y]), geschlossen: true }] },
  { id: "fl2", typ: "flaeche", name: "Blech 2", skizze: "sl", material: "zink07", flaechen: [[410, 10]], kanten: {} },
  { id: "sp", typ: "skizze", name: "Profil", ebene: "XY", elemente: [{ id: 1, art: "linie", pts: [[0, 300], [100, 300], [100, 360]], geschlossen: false }] },
  { id: "bp", typ: "blech", name: "Profil 1", skizze: "sp", kette: 0, lage: "mitte", material: "zink07", laenge: 200, stueck: 1, richtung: "eine" },
  { id: "p1", typ: "profil", name: "Freies Profil 1", ebene: "XY", start: 0, laenge: 200, richtung: "eine", material: "zink07", stueck: 1, zeilen: [{ L: 100, winkel: 90, art: "abkanten" }, { L: 60, winkel: 0, art: "abkanten" }] }] };
await s.addInitScript((d) => { localStorage.setItem("sdcad-doc-0.2", JSON.stringify(d)); localStorage.setItem("sdcad-einstellungen", JSON.stringify({ materialien: [{ id: "zink07", name: "Z", t: 0.7, ri: 1, k: 0.4, dichte: 7.2 }] })); }, pj);
await s.goto("http://localhost:" + (process.env.PORT || 8797) + "/index.html?test"); await s.waitForTimeout(1500);
await s.evaluate(() => document.getElementById("zoomAlles").click()); await s.waitForTimeout(300);
const uv = (p) => s.evaluate((u) => window.sdcadTest.schirmUV("XY", u), p);
const klick = async (p) => { const q = await uv(p); await s.mouse.move(q[0], q[1]); await s.waitForTimeout(100); await s.mouse.down(); await s.mouse.up(); await s.waitForTimeout(300); };
const kanten = (id) => s.evaluate((i) => window.sdcadTest.dok().features.find((f) => f.id === i).kanten, id);
const fehler_ = (id) => s.evaluate((i) => window.sdcadTest.dok().features.find((f) => f.id === i)._fehler || "", id);
const werkzeug = async (name) => { await s.click('[data-klapp="kanten"] .klappknopf'); await s.waitForTimeout(120); await s.click(`[data-kantenwz="${name}"]`); await s.waitForTimeout(250); if (name === "baustein") { await s.click("#kantenMenue [data-kb]"); await s.waitForTimeout(250); } };
const mitte = (P, i) => { const a = P[i], b = P[(i + 1) % P.length]; return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]; };
// Flächenblech: jede Kante × jedes Werkzeug
for (const [id, P, off, name] of [["fl", [[0, 0], [200, 0], [200, 100], [0, 100]], 0, "rechteckig"], ["fl2", L, 400, "L-förmig"]]) {
  const Q = P.map(([x, y]) => [x + off, y]), innen = [Q[0][0] + 10, Q[0][1] + 10];
  let alle = true, meldungen = [];
  for (const wz of ["flansch", "umschlag", "baustein"]) for (let i = 0; i < Q.length; i++) {
    await s.keyboard.press("Escape"); await s.evaluate((i0) => window.sdcadTest.waehle(i0), id); await werkzeug(wz);
    if (!(await s.evaluate(() => /Kante/.test(document.getElementById("kbText").textContent)))) await klick(innen);
    await klick(mitte(Q, i)); const k = await kanten(id), f = await fehler_(id);
    const da = !!k[`0:${i}`]; if (!da || f) { alle = false; meldungen.push(`${wz} Kante ${i + 1}: ${da ? "" : "nicht angelegt"} ${f}`); }
  }
  ok(alle, `Flächenblech ${name}: Flansch, Umschlag und Baustein an allen ${Q.length} Kanten ${meldungen.join(" | ")}`);
  await s.keyboard.press("Escape");
}
// Blechprofil: Kante A, B, Stirn 1, Stirn 2 × Werkzeug
for (const pid of ["bp", "p1"]) { let alle = true, meldungen = [];
  for (const wz of ["flansch", "umschlag", "baustein"]) for (const ende of ["kbA", "kbB", "kbS1", "kbS2"]) {
    await s.keyboard.press("Escape"); await s.evaluate((i0) => window.sdcadTest.waehle(i0), pid); await werkzeug(wz);
    const vorher = await s.evaluate(() => window.sdcadTest.dok().features.filter((f) => f.typ === "profilkante").length);
    await s.click("#" + ende); await s.waitForTimeout(500);
    const d = await s.evaluate((pid) => { const f = window.sdcadTest.dok().features; const bp = f.find((x) => x.id === pid); return { n: f.filter((x) => x.typ === "profilkante").length, fehler: bp._fehler || bp._stirnFehler || "" }; }, pid);
    if (d.n !== vorher + 1 || d.fehler) { alle = false; meldungen.push(`${wz} ${ende}: ${d.n === vorher + 1 ? "" : "nicht angelegt"} ${d.fehler}`); }
  }
  ok(alle, pid + " Blechprofil: Flansch, Umschlag und Baustein an Kante A, B, Stirn 1 und Stirn 2 " + meldungen.join(" | ")); }
ok(pr.length === 0, "keine Seitenfehler " + pr.join(" | "));
await b.close(); srv.close();
console.log(fehler ? `${fehler} Fehler` : "Blechkanten (App): alle Prüfungen bestanden"); process.exit(fehler ? 1 : 0);
