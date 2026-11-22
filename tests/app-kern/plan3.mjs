// App-Test: Plan – Abwicklung zugeschnitten, Sichtbarkeit einzelner Körper/Komponenten nur im Plan, Abwickeln im Blech-Register
// node tests/app-kern/plan3.mjs (nach node build.mjs; Playwright/Chromium)
import { createServer } from "node:http"; import { readFileSync } from "node:fs"; import { createRequire } from "node:module"; import { extname, join, resolve } from "node:path";
const dist = resolve("dist"), { chromium } = createRequire(import.meta.url)("playwright");
const typ = { ".html": "text/html", ".js": "text/javascript", ".wasm": "application/wasm", ".json": "application/json" };
const srv = createServer((q, a) => { let p, d; try { p = q.url === "/" ? "index.html" : decodeURIComponent(q.url.slice(1).split("?")[0]); d = readFileSync(join(dist, p)); } catch { a.writeHead(404); a.end(); return; } a.writeHead(200, { "content-type": typ[extname(p)] ?? "application/octet-stream" }); a.end(d); }).listen(+process.env.PORT || 8794);
let fehler = 0; const ok = (c, t) => { console.log(`${c ? "✓" : "✗"} ${t}`); if (!c) fehler++; };
const b = await chromium.launch(), s = await b.newPage({ viewport: { width: 1280, height: 800 } }), pr = []; s.on("pageerror", (e) => pr.push(e.message));
const pj = { objekt: "P", nr: "P-1", zaehler: 20, features: [
  { id: "sk", typ: "skizze", name: "Blech", ebene: "XY", elemente: [{ id: 1, art: "rechteck", a: [0, 0], b: [200, 100] }] },
  { id: "fl", typ: "flaeche", name: "Blech 1", skizze: "sk", material: "zink07", flaechen: [[10, 10]], kanten: { "0:0": "ortgang" } },
  { id: "k1", typ: "skizze", name: "Kasten A", ebene: "XZ", elemente: [{ id: 1, art: "rechteck", a: [300, 0], b: [350, 40] }] },
  { id: "e1", typ: "extrusion", name: "Kasten A", skizze: "k1", flaechen: [[310, 10]], abstand: 30, richtung: "eine", vorgang: "neu" },
  { id: "k2", typ: "skizze", name: "Kasten B", ebene: "XZ", elemente: [{ id: 1, art: "rechteck", a: [400, 0], b: [440, 25] }] },
  { id: "e2", typ: "extrusion", name: "Kasten B", skizze: "k2", flaechen: [[410, 10]], abstand: 20, richtung: "eine", vorgang: "neu", komponente: "Gruppe B" }] };
await s.addInitScript((d) => { localStorage.setItem("sdcad-doc-0.2", JSON.stringify(d)); localStorage.setItem("sdcad-einstellungen", JSON.stringify({ materialien: [{ id: "zink07", name: "Z", t: 0.7, ri: 1, k: 0.4, dichte: 7.2 }] })); }, pj);
await s.goto("http://localhost:" + (process.env.PORT || 8794) + "/index.html?test"); await s.waitForTimeout(1200);
// Abwickeln im Blech-Register: Blech wählen, Knopf drücken
ok(await s.evaluate(() => !!document.querySelector('[data-klapp="blech"] #wAbwickeln')), "«Abwickeln / Falten» steht im Blech-Register");
ok(await s.evaluate(() => !!document.getElementById("wTeilMenue") && !!document.querySelector('[data-klapp="aendern"] #wTeilMenue')), "«Teil-Funktionen …» (Komponente, Duplizieren, Darstellung …) steht im Register «Ändern»");
await s.evaluate(() => window.sdcadTest.waehle?.("fl")); await s.evaluate(() => document.getElementById("wAbwickeln").click()); await s.waitForTimeout(600);
let feats = await s.evaluate(() => window.sdcadTest.dok().features.map((f) => f.typ));
ok(feats.includes("abwickeln") && feats.at(-1) === "skizze", "Knopf legt den Schritt «Abwickeln» an und öffnet die Skizze auf dem flachen Blech");
await s.evaluate(() => window.sdcadTest.beendeSkizze());
// Plan: Ansicht vorne, einzelne Körper ausblenden
await s.evaluate(() => document.getElementById("wPlan").click()); await s.waitForTimeout(500);
await s.click("#plNeuAnsicht"); await s.click('[data-plansicht="vorne"]'); await s.waitForTimeout(600);
const striche = () => s.evaluate(() => (document.querySelector("#plFlaeche path.sichtbar")?.getAttribute("d").match(/M/g) || []).length);
const alle = await striche(); const sichtModell = await s.evaluate(() => window.sdcadTest.sichtbareKoerper());
ok(await s.isVisible('[data-plaug="e1"]') && await s.isVisible('[data-plkomp="Gruppe B"]'), "Plan hat einen Browser mit Körpern und Komponenten");
await s.click('[data-plaug="e1"]'); await s.waitForTimeout(500); const ohneA = await striche();
ok(ohneA < alle, `Kasten A im Plan ausgeblendet (${alle} → ${ohneA} Linien)`);
await s.click('[data-plkomp="Gruppe B"]'); await s.waitForTimeout(500); const ohneB = await striche();
ok(ohneB < ohneA, `Komponente «Gruppe B» im Plan ausgeblendet (${ohneA} → ${ohneB} Linien)`);
ok((await s.evaluate(() => window.sdcadTest.sichtbareKoerper())) === sichtModell, "Das Modell bleibt unverändert");
await s.click('[data-plaug="e1"]'); await s.click('[data-plkomp="Gruppe B"]'); await s.waitForTimeout(400); ok((await striche()) === alle, "Wieder einblenden stellt die Ansicht her");
// Abwicklung im Plan nach dem Zuschneiden: Randausklinkung ist aus dem Umriss herausgeschnitten, Biegelinie im Ausschnitt entfernt
const sB = await b.newPage({ viewport: { width: 1280, height: 800 } }); sB.on("pageerror", (e) => pr.push(e.message));
const fs = [
  { id: "sk", typ: "skizze", name: "Blech", ebene: "XY", elemente: [{ id: 1, art: "rechteck", a: [0, 0], b: [200, 100] }] },
  { id: "fl", typ: "flaeche", name: "Blech 1", skizze: "sk", material: "zink07", flaechen: [[10, 10]], kanten: { "0:0": "ortgang" } },
  { id: "ab", typ: "abwickeln", name: "Abwickeln", ziel: "fl" },
  { id: "s2", typ: "skizze", name: "Ausklinkung", ebene: "XY", elemente: [{ id: 1, art: "rechteck", a: [80, -40], b: [120, -10] }] },
  { id: "ex", typ: "extrusion", name: "Ausschnitt", skizze: "s2", flaechen: [[100, -20]], abstand: 10, richtung: "symmetrisch", vorgang: "ausschneiden", ziel: "fl" }];
await sB.addInitScript((d) => { localStorage.setItem("sdcad-doc-0.2", JSON.stringify({ objekt: "A", nr: "A-1", zaehler: 20, features: d, plaene: [{ id: "p1", name: "Plan 1", format: "A3", ansichten: [{ id: "a1", art: "oben", abwicklung: "fl:0", titel: "Abwicklung Blech 1", massstab: 1, verdeckt: false, x: 30, y: 25 }], details: [], masse: [], texte: [] }] })); localStorage.setItem("sdcad-einstellungen", JSON.stringify({ materialien: [{ id: "zink07", name: "Z", t: 0.7, ri: 1, k: 0.4, dichte: 7.2 }] })); }, fs);
await sB.goto("http://localhost:" + (process.env.PORT || 8794) + "/index.html?test"); await sB.waitForTimeout(1500);
await sB.evaluate(() => document.getElementById("wPlan").click()); await sB.waitForTimeout(700);
const d = await sB.evaluate(() => [...document.querySelectorAll("#plFlaeche path.sichtbar")].map((p) => p.getAttribute("d")).join(""));
const seg = [...d.matchAll(/M([\d.-]+) ([\d.-]+)L([\d.-]+) ([\d.-]+)/g)].map((m) => m.slice(1).map(Number));
// Blattbreite 200 → x 0..200; Ausklinkung der Breite 40 am unteren Rand (y ≈ Blatthöhe): dort darf es keine durchgehende Randlinie mehr geben
const unten = Math.max(...seg.map((q) => Math.max(q[1], q[3]))), randLinien = seg.filter((q) => Math.abs(q[1] - unten) < 0.05 && Math.abs(q[3] - unten) < 0.05 && Math.abs(q[0] - q[2]) > 1);
const ueber = randLinien.some((q) => Math.min(q[0], q[2]) < 95 && Math.max(q[0], q[2]) > 105);
ok(seg.length > 4 && !ueber, `Abwicklung im Plan ist zugeschnitten (Randausklinkung fehlt in der Randlinie, ${seg.length} Linien)`);
await sB.close();
ok(pr.length === 0, "keine Seitenfehler " + pr.join(" | "));
await b.close(); srv.close();
console.log(fehler ? `${fehler} Fehler` : "Plan: Sichtbarkeit/Abwickeln: alle Prüfungen bestanden"); process.exit(fehler ? 1 : 0);
