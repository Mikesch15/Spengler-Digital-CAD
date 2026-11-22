// App-Test Blechprofil: nachträglich Flansch/Umschlag an Kante A und B ansetzen (Kanten-Werkzeug)
// node tests/app-kern/stirnflansch.mjs (nach node build.mjs; Playwright/Chromium)
import { createServer } from "node:http"; import { readFileSync } from "node:fs"; import { createRequire } from "node:module"; import { extname, join, resolve } from "node:path";
const dist = resolve("dist"), { chromium } = createRequire(import.meta.url)("playwright");
const typ = { ".html": "text/html", ".js": "text/javascript", ".wasm": "application/wasm", ".json": "application/json" };
const srv = createServer((q, a) => { let p, d; try { p = q.url === "/" ? "index.html" : decodeURIComponent(q.url.slice(1).split("?")[0]); d = readFileSync(join(dist, p)); } catch { a.writeHead(404); a.end(); return; } a.writeHead(200, { "content-type": typ[extname(p)] ?? "application/octet-stream" }); a.end(d); }).listen(+process.env.PORT || 8797);
let fehler = 0; const ok = (c, t) => { console.log(`${c ? "✓" : "✗"} ${t}`); if (!c) fehler++; };
const b = await chromium.launch(), pr = [];
const lauf = async (ecken, kanten) => { const s = await b.newPage({ viewport: { width: 1280, height: 800 } }); s.on("pageerror", (e) => pr.push(e.message));
  await s.addInitScript(([e, k]) => { localStorage.setItem("sdcad-einstellungen", JSON.stringify({ materialien: [{ id: "zink07", name: "Z", t: 0.7, ri: 1, k: 0.4, dichte: 7.2 }] }));
    localStorage.setItem("sdcad-doc-0.2", JSON.stringify({ objekt: "T", nr: "1", zaehler: 20, features: [
      { id: "sk", typ: "skizze", name: "Rechteck", ebene: "XY", elemente: [{ id: 1, art: "rechteck", a: [0, 0], b: [200, 120] }], bedingungen: [] },
      { id: "fl", typ: "flaeche", name: "Blech 1", skizze: "sk", material: "zink07", flaechen: [[10, 10]], kanten: k, ecken: e, eckSpalt: 2 }] })); }, [ecken, kanten]);
  await s.goto("http://localhost:" + (process.env.PORT || 8797) + "/index.html?test"); await s.waitForTimeout(1500);
  const r = await s.evaluate(() => ({ abw: window.sdcadTest.quetschAbw("fl"), vol: window.sdcadTest.koerper().filter((k) => String(k.fid).startsWith("fl")).reduce((a, k) => a + Math.abs(k.volumen), 0), st: document.getElementById("status").textContent }));
  await s.close(); return r; };
const flaeche = (u) => { let a = 0; for (let i = 0; i < u.length; i++) { const p = u[i], q = u[(i + 1) % u.length]; a += p[0] * q[1] - q[0] * p[1]; } return Math.abs(a / 2); };
const kant = { "0:0": "ortgang", "0:3": "ortgang" };
const g = await lauf("gehrung", kant), st = await lauf("stoss", kant), sp = await lauf("spalt", kant);
ok(g.vol > 100 && st.vol > 100 && sp.vol > 100, `Alle Eckenschlüsse erzeugen Körper (Volumen ${Math.round(g.vol)} / ${Math.round(st.vol)} / ${Math.round(sp.vol)})`);
ok(Math.abs(flaeche(g.abw.umriss) - flaeche(st.abw.umriss)) > 0.5 || g.abw.umriss.length !== st.abw.umriss.length, "Stoss verändert den Zuschnitt der Ecke gegenüber der Gehrung");
ok(flaeche(sp.abw.umriss) < flaeche(g.abw.umriss), `Offene Ecke mit Spalt: Zuschnitt kleiner als bei Gehrung (${flaeche(sp.abw.umriss).toFixed(1)} < ${flaeche(g.abw.umriss).toFixed(1)})`);
// Säume: offen und Tropfen als Bausteine
const sa = await lauf("gehrung", { "0:0": "saum-offen", "0:1": "saum-tropfen", "0:2": "kroepf-45" });
ok(sa.vol > 100 && !/⚠/.test(sa.st), "Offener Saum, Tropfensaum und Kröpfung 45° lassen sich anwenden (" + sa.st.slice(0, 50) + ")");
// Eckentlastung (rund / quadratisch) an der Ecke zweier Flansche
const lauf2 = async (art) => { const s2 = await b.newPage({ viewport: { width: 1280, height: 800 } }); s2.on("pageerror", (e) => pr.push(e.message));
  await s2.addInitScript((e) => { localStorage.setItem("sdcad-einstellungen", JSON.stringify({ materialien: [{ id: "zink07", name: "Z", t: 0.7, ri: 1, k: 0.4, dichte: 7.2 }] }));
    localStorage.setItem("sdcad-doc-0.2", JSON.stringify({ objekt: "T", nr: "1", zaehler: 20, features: [
      { id: "sk", typ: "skizze", name: "Rechteck", ebene: "XY", elemente: [{ id: 1, art: "rechteck", a: [0, 0], b: [200, 120] }], bedingungen: [] },
      { id: "fl", typ: "flaeche", name: "Blech 1", skizze: "sk", material: "zink07", flaechen: [[10, 10]], kanten: { "0:0": "ortgang", "0:3": "ortgang" }, eckEntl: e, eckEntlMass: 3 }] })); }, art);
  await s2.goto("http://localhost:" + (process.env.PORT || 8797) + "/index.html?test"); await s2.waitForTimeout(1500);
  const r = await s2.evaluate(() => ({ v: window.sdcadTest.koerper().filter((k) => String(k.fid).startsWith("fl")).reduce((a, k) => a + Math.abs(k.volumen), 0), l: window.sdcadTest.quetschAbw("fl")?.loecher, fehl: window.sdcadTest.dok().features.map((f) => f.id + ":" + (f._fehler || "")).filter((x) => !x.endsWith(":")) })); await s2.close(); return r; };
const e0 = await lauf2("keine"), e1 = await lauf2("rund"), e2 = await lauf2("quadrat");
ok(e1.fehl.length === 0 && e2.fehl.length === 0 && e1.v < e0.v - 5 && e2.v < e0.v - 5 && e2.v <= e1.v + 0.5, `Eckentlastung entfernt Material (${Math.round(e0.v)} → rund ${Math.round(e1.v)} → quadratisch ${Math.round(e2.v)} mm³)`);
ok(e0.l === 0 && e1.l >= 1 && e2.l >= 1, `Entlastung steht auch in der Abwicklung (Ausschnitte ${e0.l} → ${e1.l}/${e2.l})`);
ok(pr.length === 0, "keine Seitenfehler " + pr.join(" | "));
await b.close(); srv.close();
console.log(fehler ? `${fehler} Fehler` : "Eckenschluss und Säume (App): alle Prüfungen bestanden"); process.exit(fehler ? 1 : 0);
