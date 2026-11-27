// App-Test: Flansch nur auf einem Teilstück der Kante (Pfeile ziehen / Werte), Abwicklung mit Aussparungen, Bearbeiten auf ganze Länge
import { createServer } from "node:http"; import { readFileSync } from "node:fs"; import { createRequire } from "node:module"; import { extname, join, resolve } from "node:path";
const dist = resolve("dist"), { chromium } = createRequire(import.meta.url)("playwright");
const typ = { ".html": "text/html", ".js": "text/javascript", ".wasm": "application/wasm", ".json": "application/json" };
const srv = createServer((q, a) => { let p, d; try { p = q.url === "/" ? "index.html" : decodeURIComponent(q.url.slice(1).split("?")[0]); d = readFileSync(join(dist, p)); } catch { a.writeHead(404); a.end(); return; } a.writeHead(200, { "content-type": typ[extname(p)] ?? "application/octet-stream" }); a.end(d); }).listen(+(process.env.PORT || 8801));
let fehler = 0; const ok = (c, t) => { console.log(`${c ? "✓" : "✗"} ${t}`); if (!c) fehler++; };
const b = await chromium.launch(), s = await b.newPage({ viewport: { width: 1280, height: 800 } }), pr = []; s.on("pageerror", (e) => pr.push(e.message));
const projekt = { objekt: "T", nr: "1", zaehler: 20, features: [
  { id: "sk", typ: "skizze", name: "Rechteck", ebene: "XY", elemente: [{ id: 1, art: "rechteck", a: [0, 0], b: [200, 120] }], bedingungen: [], versteckt: true },
  { id: "fl", typ: "flaeche", name: "Blech", skizze: "sk", material: "zink07", flaechen: [[10, 10]], kanten: {} } ] };
await s.addInitScript((d) => { localStorage.setItem("sdcad-doc-0.2", JSON.stringify(d)); localStorage.setItem("sdcad-einstellungen", JSON.stringify({ materialien: [{ id: "zink07", name: "Z", t: 0.7, ri: 1, k: 0.4, dichte: 7.2 }] })); }, projekt);
await s.goto("http://localhost:" + (process.env.PORT || 8801) + "/index.html?test"); await s.waitForTimeout(1800);
await s.evaluate(() => document.getElementById("zoomAlles").click()); await s.waitForTimeout(400);
const flaeche0 = await s.evaluate(() => window.sdcadTest.quetschAbw("fl")?.umriss.length);
await s.evaluate(() => window.sdcadTest.waehle("fl"));
await s.click(".klappknopf:visible:has-text('Blech')"); await s.waitForTimeout(300); await s.click('[data-kantenwz="flansch"]'); await s.waitForTimeout(400);
ok(await s.evaluate(() => !document.getElementById("kbTeilL").hidden), "Kantenfenster bietet «Länge auf der Kante»");
await s.selectOption("#kbTeil", "teil"); await s.waitForTimeout(200);
ok(await s.evaluate(() => !document.getElementById("kbTeilWL").hidden), "Teilstück: Felder von/bis sichtbar");
const mid = await s.evaluate(() => window.sdcadTest.schirmUV("XY", [100, 0])); await s.mouse.move(mid[0], mid[1]); await s.waitForTimeout(150); await s.mouse.click(mid[0], mid[1]); await s.waitForTimeout(700);
let k = await s.evaluate(() => window.sdcadTest.dok().features.filter((f) => f.typ === "kante").map((f) => ({ key: f.key, teil: f.teil })));
ok(k.length === 1 && k[0].teil && k[0].teil.von > 0 && k[0].teil.bis < 200, `Flansch an Kante 0:0 mit Teilstück ${JSON.stringify(k[0]?.teil)}`);
ok(await s.evaluate(() => window.sdcadTest.griffe().some((g) => g.feld === "teilVon") && window.sdcadTest.griffe().some((g) => g.feld === "teilBis")), "zwei Pfeile (von/bis) an der Kante");
// Pfeil «von» ziehen: Wert wächst
const von0 = await s.evaluate(() => parseFloat(document.getElementById("kbVon").value));
const gv = await s.evaluate(() => { const g = window.sdcadTest.griffe().find((x) => x.feld === "teilVon"); return g ? { a: g.schirm.a, b: g.schirm.b } : null; });
if (gv) { const dx = gv.b[0] - gv.a[0], dy = gv.b[1] - gv.a[1], l = Math.hypot(dx, dy) || 1, sx = gv.b[0] - (dx / l) * 4, sy = gv.b[1] - (dy / l) * 4; await s.mouse.move(sx, sy); await s.mouse.down(); await s.mouse.move(sx + (dx / l) * 40, sy + (dy / l) * 40, { steps: 6 }); await s.mouse.up(); await s.waitForTimeout(300); }
const von1 = await s.evaluate(() => parseFloat(document.getElementById("kbVon").value));
ok(von1 > von0 + 1, `Pfeil ziehen verschiebt den Anfang des Teilstücks (${von0} → ${von1} mm)`);
await s.click("#kbOk"); await s.waitForTimeout(500); await s.click("#kbEnde"); await s.waitForTimeout(400);
k = await s.evaluate(() => window.sdcadTest.dok().features.filter((f) => f.typ === "kante").map((f) => f.teil));
ok(k.length === 1 && k[0] && Math.abs(k[0].von - von1) < 0.6, `Schritt gespeichert mit Teilstück ${JSON.stringify(k[0])}`);
const ab = await s.evaluate(() => window.sdcadTest.quetschAbw("fl")); const fehl = await s.evaluate(() => window.sdcadTest.dok().features.map((f) => f._fehler).filter(Boolean));
ok(ab && ab.umriss.length >= 8 && fehl.length === 0, `Zuschnitt hat Aussparungen am Teilstück (${ab?.umriss.length} Eckpunkte statt ${flaeche0})`);
// Bearbeiten: auf ganze Kante umstellen
await s.evaluate(() => { const f = window.sdcadTest.dok().features.find((x) => x.typ === "kante"); window.sdcadTest.bearbeite(f.id); }); await s.waitForTimeout(500);
await s.selectOption("#d_kLaenge", "ganz"); await s.waitForTimeout(500);
const ab2 = await s.evaluate(() => window.sdcadTest.quetschAbw("fl")); ok(ab2 && ab2.umriss.length < ab.umriss.length, `Umstellen auf ganze Kante: Zuschnitt ohne Aussparungen (${ab2?.umriss.length} Eckpunkte)`);
// Naht auf einem Teilstück (Felder im Naht-Fenster): zwei Bleche nebeneinander, Naht an Kante 0:1 von Blech 1 und 0:3 von Blech 2
{
  const p = await b.newPage({ viewport: { width: 1280, height: 800 } }), pe = []; p.on("pageerror", (e) => pe.push(e.message));
  const feats = [{ id: "sk", typ: "skizze", name: "Skizze", ebene: "XY", elemente: [{ id: 1, art: "rechteck", a: [0, 0], b: [100, 60] }, { id: 2, art: "rechteck", a: [100, 0], b: [200, 60] }], bedingungen: [], versteckt: true },
    { id: "f1", typ: "flaeche", name: "Blech 1", skizze: "sk", material: "zink07", flaechen: [[50, 30]], kanten: {} }, { id: "f2", typ: "flaeche", name: "Blech 2", skizze: "sk", material: "zink07", flaechen: [[150, 30]], kanten: {} },
    { id: "n1", typ: "naht", name: "Naht 1", a: { ziel: "f1", key: "0:1" }, b: { ziel: "f2", key: "0:3" }, art: "punkt", absetz: "b", richtung: "oben", absetzen: true, zugabe: 15, falzA: 5, falzB: 10, mittig: false, seite: "oben", raupeBreite: 0, raupeHoehe: 0 }];
  await p.addInitScript((d) => { localStorage.setItem("sdcad-einstellungen", JSON.stringify({ materialien: [{ id: "zink07", name: "Z", t: 0.7, ri: 1, k: 0.4, dichte: 7.2 }] })); localStorage.setItem("sdcad-doc-0.2", JSON.stringify({ objekt: "T", nr: "1", zaehler: 30, features: d })); }, feats);
  await p.goto("http://localhost:" + (process.env.PORT || 8801) + "/index.html?test"); await p.waitForTimeout(1500);
  const b0 = await p.evaluate(() => { const a = window.sdcadTest.quetschAbw("f2"); const ys = a.umriss.map((q) => q[1]); return { n: a.umriss.length, h: Math.max(...ys) - Math.min(...ys) }; });
  await p.evaluate(() => window.sdcadTest.bearbeite("n1")); await p.waitForTimeout(500);
  ok(await p.evaluate(() => !!document.getElementById("d_nahtLaenge")), "Naht-Fenster hat «Länge der Naht»");
  await p.selectOption("#d_nahtLaenge", "teil"); await p.waitForTimeout(600);
  const n1 = await p.evaluate(() => { const f = window.sdcadTest.dok().features.find((x) => x.id === "n1"); return { a: f.a.teil, b: f.b.teil, fehl: window.sdcadTest.dok().features.map((x) => x._fehler).filter(Boolean) }; });
  ok(n1.a && n1.b && n1.a.bis - n1.a.von > 1 && n1.fehl.length === 0, `Naht auf Teilstück: A ${JSON.stringify(n1.a)}, B ${JSON.stringify(n1.b)}`);
  const b1 = await p.evaluate(() => { const a = window.sdcadTest.quetschAbw("f2"); return a.umriss.length; });
  ok(b1 > b0.n, `Zuschnitt von Blech 2 hat Aussparungen am Nahtende (${b0.n} → ${b1} Eckpunkte)`);
  await p.selectOption("#d_nahtLaenge", "ganz"); await p.waitForTimeout(500);
  ok(await p.evaluate(() => { const f = window.sdcadTest.dok().features.find((x) => x.id === "n1"); return !f.a.teil && !f.b.teil; }), "zurück auf ganze Kante");
  ok(pe.length === 0, "keine Seitenfehler (Naht) " + pe.join("|")); await p.close();
}
ok(pr.length === 0, "keine Seitenfehler " + pr.join("|"));
await b.close(); srv.close(); process.exit(fehler ? 1 : 0);
