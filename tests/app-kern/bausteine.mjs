// App-Test Kantenbausteine mit Parametern: Editor, Vorschau, Eignungsprüfung, Berechnung am Flächenblech
// node tests/app-kern/bausteine.mjs (nach node build.mjs; Playwright/Chromium)
import { createServer } from "node:http";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { extname, join, resolve } from "node:path";
const dist = resolve("dist"), { chromium } = createRequire(import.meta.url)("playwright");
const typ = { ".html": "text/html", ".js": "text/javascript", ".wasm": "application/wasm", ".json": "application/json" };
const srv = createServer((q, a) => { let p, d; try { p = q.url === "/" ? "index.html" : decodeURIComponent(q.url.slice(1).split("?")[0]); d = readFileSync(join(dist, p)); } catch { a.writeHead(404); a.end(); return; } a.writeHead(200, { "content-type": typ[extname(p)] ?? "application/octet-stream" }); a.end(d); }).listen(+process.env.PORT || 8770);
let fehler = 0; const ok = (b, t) => { console.log(`${b ? "✓" : "✗"} ${t}`); if (!b) fehler++; };
const b = await chromium.launch(), s = await b.newPage(), probleme = []; s.on("pageerror", (e) => probleme.push(e.message));
await s.addInitScript(() => {
  localStorage.setItem("sdcad-doc-0.2", JSON.stringify({ objekt: "B", nr: "B-1", zaehler: 5, features: [] }));
  localStorage.setItem("sdcad-einstellungen", JSON.stringify({ materialien: [{ id: "zink07", name: "Titanzink 0.70", t: 0.7, ri: 1.0, k: 0.4, dichte: 7.2 }],
    bausteine: [{ id: "pf", name: "Falz mit Parametern", gruppe: "Eigene", folge: "90 H U+ u+4*t", versatz: 0, parameter: [{ name: "H", label: "Höhe", standard: 25, min: 10, max: 60 }, { name: "u", label: "u", standard: 5, min: null, max: null }], bedingungen: { dickeMin: 0.5, dickeMax: 1, kantenMin: null } }] }));
});
await s.goto("http://localhost:" + (process.env.PORT || 8770) + "/index.html?test"); await s.waitForTimeout(600);
await s.evaluate(() => { document.getElementById("wEinst").click(); window.sdcadTest.einstSeite("bausteine"); });
const folgeFeld = await s.inputValue('[data-bk="folge"]');
ok(folgeFeld === "90 H U+ u+4*t", `Tabelle der Bausteine zeigt die Kurzschrift mit Parametern «${folgeFeld}»`);
ok(!(await s.evaluate(() => document.querySelector('[data-bk="folge"]').classList.contains("ungueltig"))), "Kurzschrift mit Parametern gilt als gültig");
await s.click('[data-bedit="0"]'); await s.waitForSelector("#bParam", { timeout: 4000 });
const z1 = await s.textContent("#bZugabe");
ok(/Zugabe/.test(z1) && !/⚠/.test(z1), `Editor rechnet mit Standardwerten: ${z1.slice(0, 80)}`);
ok(/H = 25 \[10-60\] Höhe/.test(await s.inputValue("#bParam")), "Parameter stehen als Text im Editor");
await s.fill("#bParam", "H = 80 [10-60] Höhe\nu = 5"); await s.waitForTimeout(150);
ok(/grösser als max/.test(await s.textContent("#bZugabe")), "Wert über dem Maximum → Eignungshinweis");
await s.fill("#bParam", "H = 30 [10-60] Höhe\nu = 5"); await s.waitForTimeout(150);
const z2 = await s.textContent("#bZugabe"), z3 = z1;
ok(/Zugabe/.test(z2) && z2 !== z3 && !/⚠/.test(z2), "Anderer Parameterwert ändert die Zugabe");
await s.fill("#bParam", "H = 25 [10-60]\nX 5"); ok(await s.evaluate(() => document.getElementById("bParam").classList.contains("ungueltig")), "Ungültige Parameterzeile wird markiert");
await s.fill("#bParam", "H = 25 [10-60] Höhe\nu = 5"); await s.fill("#bText", "90 Q U+ 7"); await s.waitForTimeout(150);
ok(/⚠/.test(await s.textContent("#bZugabe")), "Unbekannter Name in der Kurzschrift → Fehlermeldung statt Raten");
await s.fill("#bText", "90 H U+ u+4*t"); await s.waitForTimeout(100);
await s.click("#bOk"); await s.waitForTimeout(200);
await s.click("#eOk"); await s.waitForTimeout(300);
const gespeichert = await s.evaluate(() => JSON.parse(localStorage.getItem("sdcad-einstellungen")).bausteine.find((x) => x.id === "pf"));
ok(gespeichert?.parameter?.length === 2 && gespeichert.folge === "90 H U+ u+4*t" && gespeichert.bedingungen.dickeMax === 1, "Gespeichert mit Parametern und Bedingungen");
// Papierkorb und Sicherung
await s.evaluate(() => { document.getElementById("wEinst").click(); window.sdcadTest.einstSeite("bausteine"); });
const vorher = await s.evaluate(() => JSON.parse(localStorage.getItem("sdcad-einstellungen")).bausteine.length);
await s.click('[data-bweg="0"]'); await s.click("#eOk"); await s.waitForTimeout(300);
const sich = await s.evaluate(() => JSON.parse(localStorage.getItem("sdcad-sicherung")));
ok(sich.korb.some((x) => x.daten.id === "pf") && sich.liste.length >= 1 && sich.liste[0].einst.bausteine.some((x) => x.id === "pf"), "Gelöschter Baustein im Papierkorb, alter Stand gesichert");
await s.evaluate(() => { document.getElementById("wEinst").click(); window.sdcadTest.einstSeite("vorlagen"); });
ok(/Falz mit Parametern/.test(await s.textContent("#eInhalt")), "Register «Vorlagen & Sichern» zeigt den Papierkorb");
await s.click("[data-korb]"); await s.click("#eOk"); await s.waitForTimeout(300);
const nachher = await s.evaluate(() => JSON.parse(localStorage.getItem("sdcad-einstellungen")).bausteine.find((x) => x.id === "pf"));
ok(nachher?.parameter?.length === 2, "Zurückgeholt mit Parametern");
await s.evaluate(() => { document.getElementById("wEinst").click(); window.sdcadTest.einstSeite("vorlagen"); });
await s.click("[data-sich]"); await s.waitForTimeout(100); ok(/Sicherung geladen/.test(await s.textContent("#eMeldung")), "Sicherung lässt sich laden (erst mit «Übernehmen» gültig)");
await s.click("#eAbbrechen");
// Parameterwerte je Kante im Flächenblech
{
  const projekt = { objekt: "P", nr: "P-1", zaehler: 10, features: [
    { id: "sf", typ: "skizze", name: "Umriss", ebene: "XY", elemente: [{ id: 1, art: "rechteck", a: [0, 0], b: [1000, 500] }] },
    { id: "fl", typ: "flaeche", name: "Abdeckung", skizze: "sf", material: "zink07", profil: "alle", kanten: { "0:0": "pf" } }] };
  const p2 = await b.newPage(), pr2 = []; p2.on("pageerror", (e) => pr2.push(e.message));
  await p2.addInitScript((d) => { localStorage.setItem("sdcad-doc-0.2", JSON.stringify(d.doc));
    localStorage.setItem("sdcad-einstellungen", JSON.stringify({ materialien: [{ id: "zink07", name: "Titanzink 0.70", t: 0.7, ri: 1.0, k: 0.4, dichte: 7.2 }], bausteine: [{ id: "pf", name: "Falz mit Parametern", gruppe: "Eigene", folge: "90 H", versatz: 0, parameter: [{ name: "H", label: "Höhe", standard: 25, min: 10, max: 60 }] }] })); }, { doc: projekt });
  await p2.goto("http://localhost:" + (process.env.PORT || 8770) + "/index.html?test"); await p2.waitForTimeout(700);
  await p2.evaluate(() => window.sdcadTest.bearbeite("fl")); await p2.waitForSelector('[data-kw="0:0"]', { timeout: 5000 });
  const z0 = parseFloat(await p2.textContent('[data-z="0:0"]'));
  await p2.fill('[data-kw="0:0"]', "40"); await p2.dispatchEvent('[data-kw="0:0"]', "change"); await p2.waitForTimeout(400);
  const z1 = parseFloat(await p2.textContent('[data-z="0:0"]'));
  ok(z0 > 0 && Math.abs(z1 - z0 - 15) < 1e-6, `Parameter H=40 statt 25 an der Kante: Zugabe ${z0} → ${z1} (+15)`);
  await p2.fill('[data-kw="0:0"]', "99"); await p2.dispatchEvent('[data-kw="0:0"]', "change"); await p2.waitForTimeout(300);
  ok(/⚠/.test(await p2.textContent('[data-z="0:0"]')), "H = 99 über dem Maximum 60: Warnzeichen an der Kante");
  await p2.click("#dOk"); await p2.waitForTimeout(300);
  ok((await p2.evaluate(() => JSON.parse(localStorage.getItem("sdcad-doc-0.2")).features[1].kantenWerte?.["0:0"]?.H)) === 99, "Wert wird im Projekt gespeichert");
  ok(pr2.length === 0, "keine Seitenfehler (Flächenblech) " + pr2.join(" | "));
}
ok(probleme.length === 0, "keine Seitenfehler " + probleme.join(" | "));
await b.close(); srv.close();
console.log(fehler ? `${fehler} Fehler` : "Bausteine mit Parametern in der App: alle Prüfungen bestanden"); process.exit(fehler ? 1 : 0);
