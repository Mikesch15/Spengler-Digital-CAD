// App-Test Phase E: Planblatt-Ansichten aus dem exakten Modell (Kern ein) gegen das Netz (Kern aus)
// node tests/app-kern/plan.mjs (nach node build.mjs; Playwright/Chromium)
import { createServer } from "node:http";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { extname, join, resolve } from "node:path";
const dist = resolve("dist"), { chromium } = createRequire(import.meta.url)("playwright");
const typ = { ".html": "text/html", ".js": "text/javascript", ".wasm": "application/wasm", ".json": "application/json" };
const srv = createServer((q, a) => { let p, d; try { p = q.url === "/" ? "index.html" : decodeURIComponent(q.url.slice(1).split("?")[0]); d = readFileSync(join(dist, p)); } catch { a.writeHead(404); a.end(); return; } a.writeHead(200, { "content-type": typ[extname(p)] ?? "application/octet-stream" }); a.end(d); }).listen(8769);
let fehler = 0; const ok = (b, t) => { console.log(`${b ? "✓" : "✗"} ${t}`); if (!b) fehler++; };
const b = await chromium.launch(), PI = Math.PI;
const projekt = { objekt: "Plan", nr: "P-1", zaehler: 20, features: [
  { id: "s1", typ: "skizze", name: "S1", ebene: "XY", elemente: [{ id: 1, art: "rechteck", a: [0, 0], b: [100, 50] }] },
  { id: "e1", typ: "extrusion", name: "Platte", skizze: "s1", abstand: 20, richtung: "eine", vorgang: "neu" },
  { id: "s2", typ: "skizze", name: "S2", ebene: "XY", elemente: [{ id: 1, art: "kreis", c: [50, 25], r: 10 }] },
  { id: "e2", typ: "extrusion", name: "Loch", skizze: "s2", abstand: 20, richtung: "eine", vorgang: "ausschneiden", ziel: "alle" },
] };
const laenge = (l) => l.reduce((s, [x1, y1, x2, y2]) => s + Math.hypot(x2 - x1, y2 - y1), 0);
async function seite(kern) {
  const s = await b.newPage(), probleme = []; s.on("pageerror", (e) => probleme.push(e.message)); s.on("console", (m) => m.type() === "error" && probleme.push(m.text()));
  await s.addInitScript(([k, d]) => { localStorage.setItem("sdcad-doc-0.2", JSON.stringify(d));
    localStorage.setItem("sdcad-einstellungen", JSON.stringify({ materialien: [{ id: "zink07", name: "Titanzink 0.70", t: 0.7, ri: 1.0, k: 0.4, dichte: 7.2 }], programm: { kern: k || "netz" } })); }, [kern, projekt]);
  await s.goto("http://localhost:8769/index.html?test");
  if (kern) await s.waitForFunction(() => /Exakt aus dem CAD-Kern|CAD-Kern:/.test(document.getElementById("status").textContent), null, { timeout: 60000 }); else await s.waitForTimeout(1500);
  return { s, probleme };
}
{ // Kern aus: Netzansicht wie 0.2, kein Kernzugriff
  const { s, probleme } = await seite(null);
  const e = await s.evaluate(() => window.sdcadTest.exaktAnsicht("vorne"));
  ok(e.stand === "aus" && !e.exakt, "Aus: keine exakte Ansicht, Netz wie 0.2");
  await s.evaluate(() => document.getElementById("wPlan").click()); await s.click("#plNeuAnsicht"); await s.click('[data-plansicht="vorne"]');
  ok(await s.$eval("#plFlaeche", (el) => el.querySelectorAll("line,path,polyline").length > 3), "Aus: Planblatt zeigt die Vorderansicht");
  ok(probleme.length === 0, `Aus: keine Seitenfehler ${probleme.join(" | ")}`); await s.close();
}
{ // Kern ein
  const { s, probleme } = await seite("occt");
  let e; for (let i = 0; i < 100; i++) { e = await s.evaluate(() => window.sdcadTest.exaktAnsicht("vorne", 1)); if (e.stand === "fertig") break; await s.waitForTimeout(200); }
  ok(e.stand === "fertig" && e.exakt, `Ein: Vorderansicht kommt aus dem exakten Modell (Stand ${e.stand})`);
  ok(Math.abs(laenge(e.sichtbar) - (300 + 2 * PI * 10)) < 0.1 && e.verdeckt.length === 0, `Ein: sichtbare Linien ${laenge(e.sichtbar).toFixed(2)} mm = Umriss + Lochkreis ${(300 + 2 * PI * 10).toFixed(2)}, keine doppelten verdeckten Linien`);
  ok(Math.abs(e.breite - 102) < 1e-6 && Math.abs(e.hoehe - 52) < 1e-6, `Ein: Blattgrösse ${e.breite.toFixed(1)} × ${e.hoehe.toFixed(1)} mm`);
  let o; for (let i = 0; i < 100; i++) { o = await s.evaluate(() => window.sdcadTest.exaktAnsicht("oben", 1)); if (o.stand === "fertig") break; await s.waitForTimeout(200); }
  ok(o.stand === "fertig" && o.verdeckt.length > 0 && Math.abs(o.breite - 102) < 1e-6 && Math.abs(o.hoehe - 22) < 1e-6, `Ein: Draufsicht ${o.breite.toFixed(1)} × ${o.hoehe.toFixed(1)} mm mit verdecktem Lochmantel (${o.verdeckt.length} Segmente)`);
  // Schnittansicht (Blick von vorne, Ebene z = 10): halbe Plattenhöhe, Loch Ø20 durch die Schnittfläche
  let sc; for (let i = 0; i < 100; i++) { sc = await s.evaluate(() => window.sdcadTest.exaktAnsicht("vorne", 1, true, 10)); if (sc.stand === "fertig") break; await s.waitForTimeout(200); }
  const fl = (p) => Math.abs(p.reduce((a, [x1, y1], i) => { const [x2, y2] = p[(i + 1) % p.length]; return a + x1 * y2 - x2 * y1; }, 0) / 2);
  const fa = sc.flaechen?.map(fl).sort((m, n) => n - m) ?? [], summe = fa.length === 2 ? fa[0] - fa[1] : null; // aussen − Loch (evenodd-Füllung)
  ok(sc.stand === "fertig" && sc.exakt && sc.flaechen?.length === 2 && Math.abs(summe - (5000 - PI * 100)) < 2, `Ein: Schnittansicht aus dem Kern – ${sc.flaechen?.length} Schnittflächen (aussen + Loch), Fläche ${summe?.toFixed(1)} mm² ≈ ${(5000 - PI * 100).toFixed(1)}`);
  await s.evaluate(() => document.getElementById("wPlan").click()); await s.click("#plNeuAnsicht"); await s.click('[data-plansicht="schnitt:vorne"]'); await s.waitForTimeout(800);
  ok(await s.$eval("#plFlaeche", (el) => !!el.querySelector(".schnittflaeche")), "Ein: Planblatt zeigt die Schnittansicht mit schraffierter Schnittfläche");
  await s.evaluate(() => document.getElementById("plZu").click());
  await s.evaluate(() => document.getElementById("wPlan").click()); await s.click("#plNeuAnsicht"); await s.click('[data-plansicht="vorne"]'); await s.waitForTimeout(500);
  ok(await s.$eval("#plFlaeche", (el) => el.querySelectorAll("line,path,polyline").length > 3), "Ein: Planblatt zeigt die exakte Vorderansicht");
  // Modelländerung: Ansicht fällt auf das Netz zurück und wird danach wieder exakt
  // Automatisch bemassen: Gesamtmasse und Ø20 am Loch (exakte Ansicht)
  await s.click('[data-modus="auswahl"]'); const stufe = await s.$('[data-pl="automass"], #plAutoMass, [data-pl="auto"]');
  if (stufe) { await stufe.click(); await s.waitForTimeout(500); const txt = await s.$$eval("#plFlaeche .masstext", (t) => t.map((x) => x.textContent)); ok(txt.includes("Ø20"), `Ein: automatische Bemassung enthält «Ø20» (${txt.join(", ")})`); } else ok(false, "Ein: Knopf für automatische Bemassung nicht gefunden");
  await s.evaluate(() => document.getElementById("plZu").click());
  const vor = await s.evaluate(() => window.sdcadTest.exaktAnsicht("vorne", 1));
  ok(vor.stand === "fertig", "Ein: Ansicht bleibt nach dem Schliessen des Plans gültig");
  ok(probleme.length === 0, `Ein: keine Seitenfehler ${probleme.join(" | ")}`); await s.close();
}
await b.close(); srv.close();
console.log(fehler ? `${fehler} Fehler` : "Planblatt mit exaktem Modell: alle Prüfungen bestanden"); process.exit(fehler ? 1 : 0);
