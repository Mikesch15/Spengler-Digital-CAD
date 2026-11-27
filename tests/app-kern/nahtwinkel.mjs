// App-Test Naht an Blechen, die nicht in einer Ebene liegen (Punktnaht: Fahne wird um den Winkel zwischen den Blechen umgelegt)
import { createServer } from "node:http"; import { readFileSync } from "node:fs"; import { createRequire } from "node:module"; import { extname, join, resolve } from "node:path";
const dist = resolve("dist"), { chromium } = createRequire(import.meta.url)("playwright");
const typ = { ".html": "text/html", ".js": "text/javascript", ".wasm": "application/wasm", ".json": "application/json" };
const srv = createServer((q, a) => { let p, d; try { p = q.url === "/" ? "index.html" : decodeURIComponent(q.url.slice(1).split("?")[0]); d = readFileSync(join(dist, p)); } catch { a.writeHead(404); a.end(); return; } a.writeHead(200, { "content-type": typ[extname(p)] || "application/octet-stream" }); a.end(d); }).listen(process.env.PORT || 8797);
let fehler = 0; const ok = (c, t) => { console.log(`${c ? "✓" : "✗"} ${t}`); if (!c) fehler++; };
const b = await chromium.launch(), pr = [];
const mk = (art, hoch) => ({ objekt: "T", nr: "1", zaehler: 30, features: [
  { id: "s1", typ: "skizze", name: "A", ebene: "XY", elemente: [{ id: 1, art: "rechteck", a: [0, 0], b: [100, 100] }], bedingungen: [] },
  { id: "f1", typ: "flaeche", name: "Blech A", skizze: "s1", material: "zink07", flaechen: [[50, 50]], kanten: {} },
  { id: "e1", typ: "ebene", art: "versatz", name: "Ebene", ref: "YZ", abstand: 100 },
  { id: "s2", typ: "skizze", name: "B", ebene: "e1", elemente: [{ id: 1, art: "rechteck", a: [0, 0], b: [100, hoch] }], bedingungen: [] },
  { id: "f2", typ: "flaeche", name: "Blech B", skizze: "s2", material: "zink07", flaechen: [[50, hoch / 2]], kanten: {} },
  { id: "n1", typ: "naht", name: "Naht", a: { ziel: "f1", key: "0:1" }, b: { ziel: "f2", key: "0:0" }, art, absetz: "b", richtung: "oben", zugabe: 15, falzA: 5, falzB: 10, mittig: false, absetzen: true, raupeBreite: 0, raupeHoehe: 0, seite: "oben" }] });
const lauf = async (art, hoch = 80) => { const s = await b.newPage({ viewport: { width: 1280, height: 800 } }); s.on("pageerror", (e) => pr.push(e.message));
  await s.addInitScript((d) => { localStorage.setItem("sdcad-einstellungen", JSON.stringify({ materialien: [{ id: "zink07", name: "Z", t: 0.7, ri: 1, k: 0.4, dichte: 7.2 }] })); localStorage.setItem("sdcad-doc-0.2", JSON.stringify(d)); }, mk(art, hoch));
  await s.goto("http://localhost:" + (process.env.PORT || 8797) + "/index.html?test"); await s.waitForTimeout(1800);
  const r = await s.evaluate(() => { const f = window.sdcadTest.dok().features, n = f.find((x) => x.id === "n1"); return { w: window.sdcadTest.nahtWinkel("n1").w, fehl: f.map((x) => x._fehler).filter(Boolean), kanten: f.find((x) => x.id === "f2")?.kanten, tief: Math.min(...window.sdcadTest.meshListe("f2").map((m) => m.mn[1])), hoch: Math.max(...window.sdcadTest.meshListe("f2").map((m) => m.mx[1])), zug: window.sdcadTest.blechDaten("f2")?.[0]?.profile?.[0]?.zugabe }; });
  await s.close(); return r; };
const p = await lauf("punkt");
ok(p.w && Math.abs(Math.abs(p.w.b) - 90) < 1 && p.fehl.length === 0, `Winkel zwischen den Blechen erkannt (B ${p.w?.b}°) ${p.fehl.join(";")}`);
ok(/^-?90 15$/.test(p.kanten?.["0:0"]?.folge || ""), `Punktnaht im Winkel: Fahne mit 90° und 15 mm Überlappung (${JSON.stringify(p.kanten?.["0:0"])})`);
ok(p.tief >= 0.34 && p.tief < 0.5, `Fahne liegt auf dem anderen Blech, keine Durchdringung (tiefster Punkt ${p.tief} mm, Blech A bis 0.35)`);
ok(pr.length === 0, "keine Seitenfehler " + pr.join(" | "));
await b.close(); srv.close();
console.log(fehler ? `${fehler} Fehler` : "Naht im Winkel (App): alle Prüfungen bestanden"); process.exit(fehler ? 1 : 0);
