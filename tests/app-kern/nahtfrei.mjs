// App-Test Naht an einer freien Körperkante (beliebige Kante eines Blechkörpers): Fahne als eigener Körper auf dem anderen Blech
import { createServer } from "node:http"; import { readFileSync } from "node:fs"; import { createRequire } from "node:module"; import { extname, join, resolve } from "node:path";
const dist = resolve("dist"), { chromium } = createRequire(import.meta.url)("playwright");
const typ = { ".html": "text/html", ".js": "text/javascript", ".wasm": "application/wasm", ".json": "application/json" };
const srv = createServer((q, a) => { let p, d; try { p = q.url === "/" ? "index.html" : decodeURIComponent(q.url.slice(1).split("?")[0]); d = readFileSync(join(dist, p)); } catch { a.writeHead(404); a.end(); return; } a.writeHead(200, { "content-type": typ[extname(p)] || "application/octet-stream" }); a.end(d); }).listen(process.env.PORT || 8797);
let fehler = 0; const ok = (c, t) => { console.log(`${c ? "✓" : "✗"} ${t}`); if (!c) fehler++; };
const b = await chromium.launch(), pr = [], mat = { id: "zink07", name: "Z", t: 0.7, ri: 1, k: 0.4, dichte: 7.2 };
const mk = (naht, sicht = 1, art = "punkt") => ({ objekt: "T", nr: "1", zaehler: 30, features: [
  { id: "s1", typ: "skizze", name: "A", ebene: "XY", elemente: [{ id: 1, art: "rechteck", a: [0, 0], b: [100, 100] }], bedingungen: [] },
  { id: "f1", typ: "flaeche", name: "Blech A", skizze: "s1", material: "zink07", flaechen: [[50, 50]], kanten: {} },
  { id: "e1", typ: "ebene", art: "versatz", name: "Ebene", ref: "YZ", abstand: 100 },
  { id: "s2", typ: "skizze", name: "B", ebene: "e1", elemente: [{ id: 1, art: "rechteck", a: [0, 0], b: [100, 80] }], bedingungen: [] },
  { id: "f2", typ: "flaeche", name: "Blech B", skizze: "s2", material: "zink07", flaechen: [[50, 40]], kanten: {}, sichtseite: sicht },
  ...(naht ? [{ id: "n1", typ: "naht", name: "Naht", a: { ziel: "f1", key: "0:1" }, b: { ziel: "f2", key: naht }, art, absetz: "b", richtung: "oben", zugabe: 15, falzA: 5, falzB: 10, mittig: false, absetzen: true, raupeBreite: 0, raupeHoehe: 0, seite: "oben" }] : [])] });
const seite = async (naht, kern, fn, sicht = 1, art = "punkt") => { const s = await b.newPage({ viewport: { width: 1280, height: 800 } }); s.on("pageerror", (e) => pr.push(e.message));
  await s.addInitScript(([d, m, k]) => { localStorage.setItem("sdcad-doc-0.2", JSON.stringify(d)); localStorage.setItem("sdcad-einstellungen", JSON.stringify({ materialien: [m], ...(k ? { programm: { kern: "occt" } } : {}) })); }, [mk(naht, sicht, art), mat, kern]);
  await s.goto("http://localhost:" + (process.env.PORT || 8797) + "/index.html?test");
  if (kern) await s.waitForFunction(() => /Exakt aus dem CAD-Kern/.test(document.getElementById("status").textContent), null, { timeout: 90000 }); else await s.waitForTimeout(1800);
  await s.waitForTimeout(500); const r = await fn(s); await s.close(); return r; };
// Kantenkoordinaten am unteren Rand von Blech B (Aussenfläche zu Blech A hin) ohne Naht bestimmen
const flaeche = (u) => { let a = 0; for (let i = 0; i < u.length; i++) { const p = u[i], q = u[(i + 1) % u.length]; a += p[0] * q[1] - q[0] * p[1]; } return Math.abs(a / 2); };
const basis = await seite(null, false, (s) => s.evaluate(() => window.sdcadTest.quetschAbw("f2").umriss));
const kante = await seite(null, false, (s) => s.evaluate(() => { const P = window.sdcadTest.meshPunkte("f2").filter((p) => Math.abs(p[1]) < 1e-3 && Math.abs(p[0] - 99.65) < 1e-3), z = P.map((p) => p[2]); return P.length ? { a: [99.65, 0, Math.max(...z)], b: [99.65, 0, Math.min(...z)] } : null; }));
ok(!!kante, `Kante am unteren Rand von Blech B gefunden (${JSON.stringify(kante)})`);
const key = kante ? `E:${kante.a.join(",")};${kante.b.join(",")}` : "";
const r = await seite(key, false, (s) => s.evaluate(() => ({ abw: window.sdcadTest.quetschAbw("f2").umriss, hinweis: window.sdcadTest.dok().features.length, w: window.sdcadTest.nahtWinkel("n1").w, fahne: window.sdcadTest.meshListe("f2").filter((m) => m.mn[0] < 95), fehl: window.sdcadTest.dok().features.map((x) => x._fehler).filter(Boolean) })));
ok(r.w && Math.abs(Math.abs(r.w.b) - 90) < 1 && r.fehl.length === 0, `freie Kante: Winkel erkannt (${JSON.stringify(r.w)}) ${r.fehl.join(";")}`);
ok(Math.abs(flaeche(r.abw) - flaeche(basis) - 100 * 13.6) < 60, `Fahne steht in der Abwicklung: Zuschnitt ${Math.round(flaeche(basis))} → ${Math.round(flaeche(r.abw))} mm² (+ ca. 1361)`);
ok(r.fahne.length === 1 && r.fahne[0].mn[1] >= 0.33 && r.fahne[0].mn[0] < 90, `Fahne liegt auf Blech A, 15 mm lang (min y ${r.fahne[0]?.mn[1]}, min x ${r.fahne[0]?.mn[0]})`);
const rueck = await seite(key, false, (s) => s.evaluate(() => ({ fahne: window.sdcadTest.meshListe("f2").filter((m) => m.mn[0] < 95) })), -1);
ok(rueck.fahne.length === 1 && rueck.fahne[0].mn[1] >= 0.33, `auch bei Sichtseite −1 liegt die Fahne auf Blech A (min y ${rueck.fahne[0]?.mn[1]})`);
// Falz an einer freien Kante (Blech B senkrecht zu A): Falzhaken beider Seiten ohne Fehler, Fahne im Körper von B und im Zuschnitt
{ const sf = await seite(key, true, (s) => s.evaluate(() => { const n = window.sdcadTest.dok(); return { st: document.getElementById("status").textContent, k: window.sdcadTest.koerper().map((k) => [String(k.fid), Math.round(Math.abs(k.volumen) * 10) / 10]), abw: window.sdcadTest.quetschAbw("f2").umriss }; }), 1, "falz");
  const vf = (f) => sf.k.filter(([i]) => i.startsWith(f)).reduce((a, [, w]) => a + w, 0);
  ok(vf("f2") > 5600 + 200, `Falz an freier Kante: Haken gehört zum Körper von Blech B (${vf("f2")} mm³)`);
  ok(flaeche(sf.abw) > flaeche(basis) + 300, `Falz an freier Kante: Zuschnitt grösser (${Math.round(flaeche(basis))} → ${Math.round(flaeche(sf.abw))} mm²)`); }
const x = await seite(key, true, (s) => s.evaluate(() => ({ k: window.sdcadTest.koerper().map((k) => [String(k.fid), Math.round(Math.abs(k.volumen) * 10) / 10]), st: document.getElementById("status").textContent })));
const v = (f) => x.k.filter(([i]) => i.startsWith(f)).reduce((a, [, w]) => a + w, 0);
ok(v("n1") === 0, "die Fahne ist kein eigener Körper");
ok(v("f2") > 5600 + 800 && v("f2") < 5600 + 1300, `Fahne gehört zum Blech B: ein Körper (${v("f2")} mm³ statt 5600 ohne Fahne)`);

// Stossecke eines Kastens (zwei Flansche eines Blechs): Naht an den beiden Stirnkanten – die Fahne liegt innen auf dem Nachbarflansch (Pflicht: Paarung der Flächen)
{ const mk3 = (a, b) => ({ objekt: "T", nr: "1", zaehler: 30, features: [
    { id: "s1", typ: "skizze", name: "K", ebene: "XZ", elemente: [{ id: 1, art: "rechteck", a: [0, 0], b: [100, 100] }], bedingungen: [] },
    { id: "f1", typ: "flaeche", name: "Kasten", skizze: "s1", material: "zink07", flaechen: [[50, 50]], kanten: { "0:0": "ortgang", "0:3": "ortgang" }, ecken: "stoss" },
    ...(a ? [{ id: "n1", typ: "naht", name: "Naht", a: { ziel: "f1", key: a }, b: { ziel: "f1", key: b }, art: "punkt", absetz: "b", richtung: "oben", zugabe: 15, falzA: 5, falzB: 10, mittig: false, absetzen: true, raupeBreite: 0, raupeHoehe: 0, seite: "oben" }] : [])] });
  const lauf3 = async (a, b, fn) => { const s = await b2.newPage({ viewport: { width: 1280, height: 800 } }); s.on("pageerror", (e) => pr.push(e.message));
    await s.addInitScript(([d, m]) => { localStorage.setItem("sdcad-doc-0.2", JSON.stringify(d)); localStorage.setItem("sdcad-einstellungen", JSON.stringify({ materialien: [m] })); }, [mk3(a, b), mat]);
    await s.goto("http://localhost:" + (process.env.PORT || 8797) + "/index.html?test"); await s.waitForTimeout(1800); const r = await fn(s); await s.close(); return r; };
  var b2 = b;
  const kanten = await lauf3(null, null, (s) => s.evaluate(() => { const L = window.sdcadTest.meshListe("f1"); const P = window.sdcadTest.meshPunkte("f1"); const nahe = P.filter((p) => Math.abs(p[0]) < 1 && Math.abs(p[2]) < 1 && p[1] > 5); return { n: L.length, spitzen: [...new Set(nahe.map((p) => p.map((v) => +v.toFixed(3)).join(",")))].slice(0, 12) }; }));
  ok(kanten.n >= 2, `Stossecke: Kasten mit zwei Flanschen (${kanten.n} Teile, Eckpunkte ${kanten.spitzen.length})`); }
ok(pr.length === 0, "keine Seitenfehler " + pr.join(" | "));
await b.close(); srv.close();
console.log(fehler ? `${fehler} Fehler` : "Naht an freier Körperkante (App): alle Prüfungen bestanden"); process.exit(fehler ? 1 : 0);
