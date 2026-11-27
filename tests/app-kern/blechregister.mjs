// App-Test: Blech-Register in einer Reihe, Kantenbaustein im Fenster wählen, eigene Spengler-Vorlagen, Fenstergrösse ändern,
// verwendete Skizzen ausgeblendet, Hinweisblase am Näherungs-Kennzeichen im Browser
import { createServer } from "node:http"; import { readFileSync } from "node:fs"; import { createRequire } from "node:module"; import { extname, join, resolve } from "node:path";
const dist = resolve("dist"), { chromium } = createRequire(import.meta.url)("playwright");
const typ = { ".html": "text/html", ".js": "text/javascript", ".wasm": "application/wasm", ".json": "application/json" };
const srv = createServer((q, a) => { let p, d; try { p = q.url === "/" ? "index.html" : decodeURIComponent(q.url.slice(1).split("?")[0]); d = readFileSync(join(dist, p)); } catch { a.writeHead(404); a.end(); return; } a.writeHead(200, { "content-type": typ[extname(p)] ?? "application/octet-stream" }); a.end(d); }).listen(+(process.env.PORT || 8798));
let fehler = 0; const ok = (c, t) => { console.log(`${c ? "✓" : "✗"} ${t}`); if (!c) fehler++; };
const b = await chromium.launch(), s = await b.newPage({ viewport: { width: 1280, height: 800 } }), pr = []; s.on("pageerror", (e) => pr.push(e.message));
const projekt = { objekt: "R", nr: "1", zaehler: 10, features: [
  { id: "sk", typ: "skizze", name: "Rechteck", ebene: "XY", elemente: [{ id: 1, art: "rechteck", a: [0, 0], b: [100, 60] }] },
  { id: "sf", typ: "skizze", name: "Blechumriss", ebene: "XY", elemente: [{ id: 2, art: "rechteck", a: [200, 0], b: [400, 120] }] },
  { id: "fl", typ: "flaeche", name: "Blech", skizze: "sf", material: "zink07", flaechen: [[250, 50]], kanten: {} } ] };
await s.addInitScript((d) => { if (!localStorage.getItem("sdcad-doc-0.2")) localStorage.setItem("sdcad-doc-0.2", JSON.stringify(d)); localStorage.setItem("sdcad-einstellungen", JSON.stringify({ materialien: [{ id: "zink07", name: "Z", t: 0.7, ri: 1, k: 0.4, dichte: 7.2 }] })); }, projekt);
await s.goto("http://localhost:" + (process.env.PORT || 8798) + "/index.html?test"); await s.waitForTimeout(1800);
// 1 Blech-Register: alle Werkzeuge in einer Reihe
await s.click(".klappknopf:visible:has-text('Blech')"); await s.waitForTimeout(400);
const reihen = await s.evaluate(() => { const t = [...document.querySelectorAll('[data-klapp="blech"] .klappmenue .wz')].filter((e) => e.offsetParent).map((e) => Math.round(e.getBoundingClientRect().top / 10)); return { n: t.length, versch: new Set(t).size, breite: document.documentElement.scrollWidth <= innerWidth + 1 }; });
ok(reihen.n >= 15 && reihen.versch <= 2, `Blech-Register: ${reihen.n} Werkzeuge in einer Reihe (${reihen.versch} Höhenstufe(n))`);
ok(reihen.breite, "Blech-Register: Seite wird nicht breiter als der Bildschirm");
// 2 Kantenbaustein: Fenster öffnet zuerst, Baustein wird darin gewählt
await s.evaluate(() => window.sdcadTest.waehle("fl"));
await s.click('[data-kantenwz="baustein"]'); await s.waitForTimeout(500);
const kb = await s.evaluate(() => ({ bar: !document.getElementById("kantenBar").hidden, feld: !!document.getElementById("kbBaustein") && !document.getElementById("kbBausteinL").hidden, n: document.querySelectorAll("#kbBaustein option").length, menue: !document.getElementById("kantenMenue").hidden }));
ok(kb.bar && kb.feld && kb.n > 3 && !kb.menue, `Kantenbaustein: Fenster mit Auswahlfeld (${kb.n} Bausteine), kein vorgeschaltetes Menü`);
await s.selectOption("#kbBaustein", { index: 2 }); await s.waitForTimeout(200);
ok((await s.textContent("#kbTitel")).startsWith("Baustein:"), "Kantenbaustein: gewählter Baustein steht im Titel (" + (await s.textContent("#kbTitel")) + ")");
await s.click("#kbAbbr"); await s.waitForTimeout(200);
// 3 eigene Vorlagen: speichern aus der Vorlage, in der Liste wählbar
await s.click('[data-klapp="blech"] #wVorlage'); await s.waitForTimeout(500);
ok(await s.evaluate(() => !!document.querySelector('#dZusatz [data-vorlage="speichern"]') && !!document.querySelector('#dZusatz [data-vorlage="neu"]')), "Spengler-Vorlage: Schaltflächen «Als eigene Vorlage speichern» und «Neue Vorlage anlegen …»");
await s.click('#dZusatz [data-vorlage="speichern"]'); await s.waitForTimeout(400);
const ev = await s.evaluate(() => JSON.parse(localStorage.getItem("sdcad-einstellungen") || "{}").vorlagen?.length || 0);
ok(ev === 1, "Eigene Vorlage ist in den Einstellungen gespeichert");
ok(await s.evaluate(() => [...document.querySelectorAll("#d_vorlage option")].some((o) => /\(eigene\)/.test(o.textContent))), "Eigene Vorlage erscheint in der Liste «Vorlage»");
// 4 Fenstergrösse ändern
const g0 = await s.evaluate(() => document.getElementById("dialog").getBoundingClientRect().width);
const gr = await s.evaluate(() => { const r = document.querySelector("#dialog > .groessengriff")?.getBoundingClientRect(); return r ? [r.left + r.width / 2, r.top + r.height / 2] : null; });
ok(!!gr, "Dialog hat einen Griff zum Ändern der Grösse");
if (gr) { await s.mouse.move(gr[0], gr[1]); await s.mouse.down(); await s.mouse.move(gr[0] + 120, gr[1] + 60, { steps: 6 }); await s.mouse.up(); await s.waitForTimeout(200); }
const g1 = await s.evaluate(() => document.getElementById("dialog").getBoundingClientRect().width);
ok(g1 > g0 + 80, `Dialog lässt sich vergrössern (${Math.round(g0)} → ${Math.round(g1)} px)`);
await s.click("#dAbbrechen"); await s.waitForTimeout(200);
// 5 verwendete Skizze wird ausgeblendet
await s.click(".klappknopf:visible:has-text('Körper')"); await s.waitForTimeout(300); await s.click("#wExtrusion"); await s.waitForTimeout(500);
await s.evaluate(() => { const sel = document.getElementById("d_skizze"); if (sel) { sel.value = "sk"; sel.dispatchEvent(new Event("change", { bubbles: true })); } });
await s.evaluate(() => document.getElementById("zoomAlles").click()); await s.waitForTimeout(500);
const qp = await s.evaluate(() => window.sdcadTest.schirmUV("XY", [50, 30])); await s.mouse.click(qp[0], qp[1]); await s.waitForTimeout(500);
await s.click("#dOk"); await s.waitForTimeout(600);
const dok = await s.evaluate(() => window.sdcadTest.dok().features.find((f) => f.id === "sk"));
ok(dok?.versteckt === true, "Extrusion aus Skizze: die verwendete Skizze ist ausgeblendet");
// 6 Hinweisblase am «≈»
const bad = await s.evaluate(() => { const g = document.querySelector("#baum .gen"); if (!g) return null; const r = g.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2, g.dataset.hinweis]; });
ok(!!bad, "Browser zeigt «≈» bei Näherungen (Kern aus)");
if (bad) { await s.mouse.move(bad[0], bad[1]); await s.waitForTimeout(300); ok(await s.evaluate(() => /Näherung/.test(document.querySelector(".hinweisblase")?.textContent || "")), "Beim Darüberfahren erscheint die Erklärung"); }
ok(pr.length === 0, "keine Seitenfehler " + pr.join("|"));
await b.close(); srv.close(); process.exit(fehler ? 1 : 0);
