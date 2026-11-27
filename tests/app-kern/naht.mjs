// App-Test Naht: Punktnaht (Überlappung 15 mm, abgesetzt), Falz, Schweissraupe; Werkzeug wählt zwei Kanten und öffnet den Dialog
// node tests/app-kern/naht.mjs (nach node build.mjs; Playwright/Chromium)
import { createServer } from "node:http"; import { readFileSync } from "node:fs"; import { createRequire } from "node:module"; import { join, resolve } from "node:path";
const dist = resolve("dist"), { chromium } = createRequire(import.meta.url)("playwright");
const typ = { ".html": "text/html", ".js": "text/javascript", ".wasm": "application/wasm", ".json": "application/json" };
const srv = createServer((q, a) => { let p, d; try { p = q.url === "/" ? "index.html" : decodeURIComponent(q.url.slice(1).split("?")[0]); d = readFileSync(join(dist, p)); } catch { a.writeHead(404); a.end(); return; } a.writeHead(200, { "content-type": typ[p.slice(p.lastIndexOf("."))] || "application/octet-stream" }); a.end(d); }).listen(+(process.env.PORT || 8797));
let fehler = 0; const ok = (c, t) => { console.log(`${c ? "✓" : "✗"} ${t}`); if (!c) fehler++; };
const b = await chromium.launch(), pr = [];
const basis = [{ id: "sk", typ: "skizze", name: "Bleche", ebene: "XY", elemente: [{ id: 1, art: "rechteck", a: [0, 0], b: [100, 60] }, { id: 2, art: "rechteck", a: [100, 0], b: [200, 60] }], bedingungen: [] },
  { id: "f1", typ: "flaeche", name: "Blech 1", skizze: "sk", material: "zink07", flaechen: [[50, 30]], kanten: {} }, { id: "f2", typ: "flaeche", name: "Blech 2", skizze: "sk", material: "zink07", flaechen: [[150, 30]], kanten: {} }];
const naht = (extra) => ({ id: "n1", typ: "naht", name: "Naht 1", a: { ziel: "f1", key: "0:1" }, b: { ziel: "f2", key: "0:3" }, art: "punkt", absetz: "b", richtung: "oben", absetzen: true, zugabe: 15, falzA: 5, falzB: 10, mittig: false, seite: "oben", raupeBreite: 0, raupeHoehe: 0, ...extra });
const seite = async (features) => { const p = await b.newPage({ viewport: { width: 1280, height: 800 } }); p.on("pageerror", (e) => pr.push(e.message));
  await p.addInitScript((d) => { localStorage.setItem("sdcad-einstellungen", JSON.stringify({ materialien: [{ id: "zink07", name: "Z", t: 0.7, ri: 1, k: 0.4, dichte: 7.2 }] })); localStorage.setItem("sdcad-doc-0.2", JSON.stringify({ objekt: "T", nr: "1", zaehler: 30, features: d })); }, features);
  await p.goto("http://localhost:" + (process.env.PORT || 8797) + "/index.html?test"); await p.waitForTimeout(1500); return p; };
const breite = (p, id) => p.evaluate((i) => { const a = window.sdcadTest.quetschAbw(i); if (!a) return null; const xs = a.umriss.map((q) => q[0]), ys = a.umriss.map((q) => q[1]); return { w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys) }; }, id);
const fe = (p) => p.evaluate(() => window.sdcadTest.dok().features.map((f) => f._fehler || "").filter(Boolean).join("|"));
let p = await seite(basis); const w0 = await breite(p, "f2"), v0 = await breite(p, "f1"); await p.close();
ok(w0 && Math.abs(w0.w - 100) < 1, `ohne Naht: Blech 2 ist 100 mm breit (${w0?.w.toFixed(1)})`);
p = await seite([...basis, naht({})]); const w1 = await breite(p, "f2"), v1 = await breite(p, "f1");
ok(!(await fe(p)), "Punktnaht rechnet ohne Fehler " + (await fe(p)));
ok(w1 && Math.abs(w1.w - w0.w - 15.5) < 1.5 && Math.abs(v1.w - v0.w) < 0.1, `Punktnaht: abgesetztes Blech 2 wird um die Überlappung länger (${w0.w.toFixed(1)} → ${w1.w.toFixed(1)}), Blech 1 bleibt`); await p.close();
p = await seite([...basis, naht({ absetz: "a" })]); const w2 = await breite(p, "f1"); ok(w2 && w2.w - v0.w > 14, `Absetzung an Blech A: Blech 1 wird länger (${w2.w.toFixed(1)})`); await p.close();
p = await seite([...basis, naht({ absetzen: false })]); const w3 = await breite(p, "f2"); ok(w3 && Math.abs(w3.w - w0.w - 16.3) < 0.5, `Punktnaht (Absetzung entfällt als Option): 15 mm + Kröpfung = +16.3 mm (${w3?.w.toFixed(1)})`); await p.close();
p = await seite([...basis, naht({ art: "falz" })]); const fa = await breite(p, "f1"), fb = await breite(p, "f2");
ok(!(await fe(p)) && fa.w - v0.w > 3 && fb.w - w0.w > 8, `Falznaht: Blech 1 +${(fa.w - v0.w).toFixed(1)} mm, Blech 2 (abgesetzt) +${(fb.w - w0.w).toFixed(1)} mm`); await p.close();
p = await seite([...basis, naht({ art: "falz", mittig: true })]); const ma = await breite(p, "f1"), mb = await breite(p, "f2"); ok(Math.abs((ma.w - v0.w) - (mb.w - w0.w)) < 1.5 && ma.w - v0.w > 5, `Falz mittig: beide Bleche gleich lang zugegeben (+${(ma.w - v0.w).toFixed(1)} / +${(mb.w - w0.w).toFixed(1)})`); await p.close();
p = await seite([...basis, naht({ art: "schweiss" })]); const n1 = await p.evaluate(() => window.sdcadTest.koerper().filter((q) => q.fid === "n1").length);
ok(!(await fe(p)) && n1 >= 1, "Schweissnaht: Raupe als Körper im Modell"); await p.close();
p = await seite([...basis, naht({ art: "ecke" })]); ok(!(await fe(p)) && (await p.evaluate(() => window.sdcadTest.koerper().filter((q) => q.fid === "n1").length)) >= 1, "Ecknaht: Raupe im Modell"); await p.close();
// Rohr: Längsnaht zwischen Anfang und Ende der Abwicklung
{
  const rohr = { id: "r1", typ: "rundblech", name: "Rohr 1", art: "zylinder", ebene: "XY", d1: 100, d2: 100, h: 150, winkel: 360, material: "zink07", zugabe: 0 };
  p = await seite([rohr]); const auf = async () => { await p.click('[data-register="auftrag"]'); await p.waitForTimeout(300); const t = await p.textContent("#werkstatt"); const m = /× (\d+(?:\.\d)?)/.exec(t); return m ? +m[1] : null; };
  const z0 = await auf(); await p.close();
  p = await seite([rohr, { ...naht({ id: "n2" }), a: { ziel: "r1", key: "N0" }, b: { ziel: "r1", key: "N1" } }]);
  const z1 = await auf(), kr = await p.evaluate(() => window.sdcadTest.koerper().filter((q) => q.fid === "r1").length);
  ok(!(await fe(p)) && z1 - z0 > 14, `Rohr-Längsnaht (Punktnaht): Zuschnitt ${z0?.toFixed(1)} → ${z1?.toFixed(1)} mm, Überlappungsstreifen im Modell (${kr} Körper)`); await p.close();
  p = await seite([rohr, { ...naht({ id: "n3", art: "schweiss" }), a: { ziel: "r1", key: "N0" }, b: { ziel: "r1", key: "N1" } }]);
  ok(!(await fe(p)) && (await p.evaluate(() => window.sdcadTest.koerper().filter((q) => q.fid === "n3").length)) >= 1, "Rohr-Längsnaht mit Schweissraupe"); await p.close();
}
// Gebogene Kante: Kreisblech mit Naht (Punktnaht und Raupe folgen der Rundung)
{
  const rund = [{ id: "sk", typ: "skizze", name: "Rund", ebene: "XY", elemente: [{ id: 1, art: "kreis", c: [50, 50], r: 40 }, { id: 2, art: "rechteck", a: [200, 0], b: [300, 60] }], bedingungen: [] },
    { id: "f3", typ: "flaeche", name: "Kreis", skizze: "sk", material: "zink07", flaechen: [[50, 50]], kanten: {} }, { id: "f4", typ: "flaeche", name: "Platte", skizze: "sk", material: "zink07", flaechen: [[250, 30]], kanten: {} }];
  p = await seite(rund); const k0 = await breite(p, "f3"); await p.close();
  p = await seite([...rund, { ...naht({ id: "n4" }), a: { ziel: "f3", key: "0:0" }, b: { ziel: "f4", key: "0:3" }, absetz: "a" }]); const k1 = await breite(p, "f3");
  ok(!(await fe(p)) && k1 && k0 && k1.w - k0.w > 20, `gebogene Kante (Kreis): Punktnaht rechnet, Zuschnitt ${k0?.w.toFixed(1)} → ${k1?.w.toFixed(1)} mm`); await p.close();
  p = await seite([...rund, { ...naht({ id: "n5", art: "schweiss" }), a: { ziel: "f3", key: "0:0" }, b: { ziel: "f4", key: "0:3" } }]);
  ok(!(await fe(p)) && (await p.evaluate(() => window.sdcadTest.koerper().filter((q) => q.fid === "n5").length)) >= 1, "gebogene Kante: Raupe folgt der Rundung"); await p.close();
}
// Blechprofile: Naht an Kante B des einen und Kante A des anderen
{
  const prof = [{ id: "s1", typ: "skizze", name: "L1", ebene: "XY", elemente: [{ id: 1, art: "linie", pts: [[0, 0], [100, 0]], geschlossen: false }], bedingungen: [] },
    { id: "s2", typ: "skizze", name: "L2", ebene: "XY", elemente: [{ id: 1, art: "linie", pts: [[100, 0], [200, 0]], geschlossen: false }], bedingungen: [] },
    { id: "p1", typ: "blech", name: "Profil 1", skizze: "s1", kette: 0, lage: "mitte", material: "zink07", laenge: 100, stueck: 1, richtung: "eine" }, { id: "p2", typ: "blech", name: "Profil 2", skizze: "s2", kette: 0, lage: "mitte", material: "zink07", laenge: 100, stueck: 1, richtung: "eine" }];
  const zus = async (pp) => { await pp.click('[data-register="auftrag"]'); await pp.waitForTimeout(300); return (await pp.textContent("#werkstatt")).replace(/\s+/g, " "); };
  p = await seite(prof); const t0 = await zus(p); await p.close();
  p = await seite([...prof, { ...naht({ id: "n6" }), a: { ziel: "p1", key: "B" }, b: { ziel: "p2", key: "A" }, absetz: "b" }]); const t1 = await zus(p);
  ok(!(await fe(p)) && t0 !== t1, "Blechprofile: Punktnaht an Kante B / Kante A ändert den Zuschnitt " + (await fe(p))); await p.close();
  p = await seite([...prof, { ...naht({ id: "n7", art: "schweiss" }), a: { ziel: "p1", key: "B" }, b: { ziel: "p2", key: "A" } }]);
  ok(!(await fe(p)) && (await p.evaluate(() => window.sdcadTest.koerper().filter((q) => q.fid === "n7").length)) >= 1, "Blechprofile: Raupe an der Kante"); await p.close();
}
// Werkzeug: Kante an Blech A, dann Blech B → Naht + Dialog
p = await seite(basis); await p.evaluate(() => document.getElementById("wNaht").click()); await p.waitForTimeout(400);
ok(await p.isVisible("#dialog") && /Naht/.test(await p.textContent("#dTitel")) && await p.isVisible("#d_art"), "Werkzeug «Naht»: das Naht-Fenster öffnet sich sofort (mit Nahtart)");
// neuer Ablauf: erst das Blech, dann die Kante – für beide Nahtseiten (4 Schritte)
const klickUV = async (uv, text) => { const q = await p.evaluate((u) => window.sdcadTest.schirmUV("XY", u), uv); await p.mouse.move(q[0], q[1]); await p.waitForTimeout(100); await p.mouse.down(); await p.mouse.up(); await p.waitForTimeout(600); if (text) ok(new RegExp(text).test(await p.textContent("#dInfo")), `Naht-Fenster zeigt «${text}»`); };
ok(/Schritt 1 von 4/.test(await p.textContent("#dInfo")), "Naht-Fenster: Schritt 1 von 4 (Blech A)");
await klickUV([50, 30], "Schritt 2 von 4"); await klickUV([100, 30], "Schritt 3 von 4"); await klickUV([150, 30], "Schritt 4 von 4"); await klickUV([100, 30], null);
const f = await p.evaluate(() => window.sdcadTest.dok().features.find((x) => x.typ === "naht"));
ok(!!f && f.a.ziel !== f.b.ziel && f.a.key && f.b.key && f.art === "punkt", "vier Klicks → Naht mit beiden Kanten im offenen Fenster");
await p.click("#dOk"); await p.waitForTimeout(400); ok(await p.evaluate(() => document.getElementById("dialog").hidden) && (await p.evaluate(() => window.sdcadTest.dok().features.filter((x) => x.typ === "naht").length)) === 1, "OK schliesst das Fenster, die Naht bleibt");
await p.evaluate(() => window.sdcadTest.bearbeite("" + window.sdcadTest.dok().features.find((x) => x.typ === "naht").id)); await p.waitForTimeout(500);
ok(await p.isVisible("#d_art") && await p.isVisible("#d_zugabe"), "Dialog mit Nahtart, Richtung, Überlappung");
{ // Blechwahl auch im Browser: Blech A über die Auswahl (wie ein Klick im Browser) wählen
  const p2 = await seite(basis); await p2.evaluate(() => document.getElementById("wNaht").click()); await p2.waitForTimeout(400);
  await p2.evaluate(() => window.sdcadTest.waehle("f1")); await p2.waitForTimeout(400);
  ok(/Schritt 2 von 4/.test(await p2.textContent("#dInfo")), "Blech A im Browser gewählt → Schritt 2 von 4 (Kante an Blech A)"); await p2.close();
}
await p.evaluate(() => { const e = document.getElementById("d_art"); e.value = "falz"; e.dispatchEvent(new Event("change", { bubbles: true })); }); await p.waitForTimeout(500);
ok(!(await fe(p)), "Art im Dialog auf Falz gestellt, rechnet");
const da = async (art) => { await p.evaluate((a) => { const e = document.getElementById("d_art"); e.value = a; e.dispatchEvent(new Event("change", { bubbles: true })); }, art); await p.waitForTimeout(400); return p.evaluate(() => ["zugabe", "falzA", "falzB", "mittig", "seite", "raupeBreite", "absetz", "absetzen"].filter((i) => document.getElementById("d_" + i))); };
ok((await da("falz")).join() === "falzB,mittig,absetz", "Dialog Falznaht: nur Falzfelder");
ok((await da("punkt")).join() === "zugabe,absetz", "Dialog Punktnaht: nur Überlappung/Absetzung");
ok((await da("schweiss")).join() === "seite,raupeBreite", "Dialog Schweissnaht: nur Raupenfelder");
await da("falz");
ok(!(await p.evaluate(() => document.getElementById("baum").textContent.includes("Naht 1"))), "Naht erscheint nicht im Browser (nur Zeitleiste)");
const zb = async (id) => p.evaluate((i) => { document.getElementById(i).click(); return window.sdcadTest.dok().marke ?? null; }, id);
const m0 = await p.evaluate(() => window.sdcadTest.dok().features.length); const z1 = await zb("zeitZurueck");
ok(z1 === m0 - 1, `Zeitleistenpfeil zurück (Marke ${z1})`); ok((await zb("zeitVor")) === null, "Zeitleistenpfeil vor (alles aktiv)");
await p.click("#dOk"); await p.waitForTimeout(300); await p.close();
ok(pr.length === 0, "keine Seitenfehler " + pr.join(" | "));
await b.close(); srv.close();
console.log(fehler ? `${fehler} Fehler` : "Naht (App): alle Prüfungen bestanden"); process.exit(fehler ? 1 : 0);
