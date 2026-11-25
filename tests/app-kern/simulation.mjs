// App-Test Simulation: Studie am Flächenblech mit Flansch – Lager, Druck, Norm-Schnee, Rechnen, Ergebnis, Bericht
// node tests/app-kern/simulation.mjs (nach node build.mjs; Playwright/Chromium)
import { createServer } from "node:http"; import { readFileSync } from "node:fs"; import { createRequire } from "node:module"; import { join, resolve } from "node:path";
const dist = resolve("dist"), { chromium } = createRequire(import.meta.url)("playwright");
const typ = { ".html": "text/html", ".js": "text/javascript", ".wasm": "application/wasm", ".json": "application/json" };
const srv = createServer((q, a) => { let p, d; try { p = q.url === "/" ? "index.html" : decodeURIComponent(q.url.slice(1).split("?")[0]); d = readFileSync(join(dist, p)); } catch { a.writeHead(404); a.end(); return; } a.writeHead(200, { "content-type": typ[p.slice(p.lastIndexOf("."))] || "application/octet-stream" }); a.end(d); }).listen(+(process.env.PORT || 8797));
let fehler = 0; const ok = (c, t) => { console.log(`${c ? "✓" : "✗"} ${t}`); if (!c) fehler++; };
const b = await chromium.launch(), pr = [], p = await b.newPage({ viewport: { width: 1280, height: 800 } }); p.on("pageerror", (e) => pr.push(e.message));
const feat = [
  { id: "sk", typ: "skizze", name: "Rechteck", ebene: "XY", elemente: [{ id: 1, art: "rechteck", a: [0, 0], b: [400, 200] }], bedingungen: [] },
  { id: "fl", typ: "flaeche", name: "Blech 1", skizze: "sk", material: "stahl06", flaechen: [[10, 10]], kanten: { "0:0": "abk-o" } }];
await p.addInitScript((d) => { localStorage.setItem("sdcad-doc-0.2", JSON.stringify({ objekt: "T", nr: "1", zaehler: 60, features: d })); }, feat);
await p.goto("http://localhost:" + (process.env.PORT || 8797) + "/index.html?test"); await p.waitForTimeout(1800);
await p.evaluate(() => { window.print = () => { window.__druck = document.getElementById("druck").innerHTML; }; });
// Fenster öffnen
await p.evaluate(() => document.getElementById("wSimFenster").click()); await p.waitForTimeout(300);
ok(await p.evaluate(() => !document.getElementById("simFenster").hidden), "Simulationsfenster offen");
const m = await p.evaluate(() => { const M = window.sdcadTest.sim.modell(); return { n: M.nodes.length, e: M.tris.length, hoch: Math.max(...M.nodes.map((q) => q[2])) }; });
ok(m.n > 100 && m.e > 100, `Schalennetz erzeugt (${m.n} Knoten, ${m.e} Elemente)`); ok(m.hoch > 10, "Flansch steht im Modell");
// Lager: Einspannung an der oberen Kante (y = 200)
await p.evaluate(() => { window.sdcadTest.simApi.formStart("lager", { art: "eingespannt" }); window.sdcadTest.sim.setzeSel({ art: "kante", p: [200, 200, 0] }, [0, 0, 1]); window.sdcadTest.sim.formOk(); });
// Flächenlast 1 kN/m² nach unten auf die ebene Fläche
await p.evaluate(() => { window.sdcadTest.simApi.formStart("druck"); window.sdcadTest.sim.setzeSel({ art: "flaeche", p: [200, 100, 0] }, [0, 0, 1]); window.sdcadTest.sim.setzeForm("p", "1"); window.sdcadTest.sim.formOk(); });
const st = await p.evaluate(() => { const s = window.sdcadTest.sim.st(); return { lager: s.lager.length, lasten: s.lasten.length, art: s.lasten[0]?.art, pm: s.lasten[0]?.p }; });
ok(st.lager === 1 && st.lasten === 1 && st.art === "druck" && Math.abs(st.pm - 0.001) < 1e-9, "Lager und Flächenlast eingetragen");
await p.evaluate(() => window.sdcadTest.simApi.rechnen());
const r = await p.evaluate(() => { const R = window.sdcadTest.sim.erg(), m = R.massgebend; return { rz: m.summeReaktion[2], smax: m.smax, u: m.umax, h: m.hoechstlast, vis: !document.getElementById("simLegende").hidden, kind: window.sdcadTest.sim.ergGruppe.children.length, koerperAus: window.sdcadTest.sim.zeige.koerper === false }; });
ok(Math.abs(r.rz - 80) < 4, `Reaktion = Last 1 kN/m² × 0.08 m² = 80 N (${r.rz.toFixed(1)})`);
ok(r.smax > 0 && r.u > 0 && r.h > 0, `Spannung ${r.smax.toFixed(1)} N/mm², Verschiebung ${r.u.toFixed(2)} mm, Höchstlast ×${r.h.toFixed(1)}`);
ok(r.vis && r.kind > 0, "Ergebnis farbig dargestellt mit Legende");
// Klick auf das Ergebnis zeigt Werte am Knoten
const mid = await p.evaluate(() => { const r = document.getElementById("leinwand").getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; });
await p.mouse.click(mid[0], mid[1]); await p.waitForTimeout(200);
ok(/σ_v .* N\/mm²/.test(await p.evaluate(() => document.getElementById("status").textContent)), "Klick auf das Ergebnis zeigt Spannung, Verschiebung, Sicherheit");
// Norm: Schnee auf die Fläche → eigener Lastfall + Normkombinationen
await p.evaluate(() => { window.sdcadTest.simApi.formStart("norm"); window.sdcadTest.sim.setzeSel({ art: "flaeche", p: [200, 100, 0] }, [0, 0, 1]); window.sdcadTest.sim.setzeForm("norm", "schnee"); window.sdcadTest.sim.formOk(); });
await p.evaluate(() => { window.sdcadTest.sim.st().beulen = true; return window.sdcadTest.simApi.rechnen(); });
const n = await p.evaluate(() => { const R = window.sdcadTest.sim.erg(), s = window.sdcadTest.sim.st(); return { k: R.ergebnisse.length, modus: s.kombiModus, lf: s.lastfaelle.length, beul: R.ergebnisse.some((e) => e.beul), norm: s.norm.length }; });
ok(n.lf === 2 && n.modus === "norm" && n.norm === 1, "Schnee als Lastfall mit Normkombinationen");
ok(n.k >= 2 && n.beul, `${n.k} Kombinationen gerechnet (inkl. Beulen)`);
// Klick-Auswahl in der Ansicht
await p.evaluate(() => { window.sdcadTest.simApi.formStart("kraft"); });
const box = await p.evaluate(() => { const r = document.getElementById("leinwand").getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; });
await p.mouse.click(box[0], box[1]); await p.waitForTimeout(200);
ok(await p.evaluate(() => !!window.sdcadTest.sim.form()?.sel), "Punkt im Blech angeklickt → Auswahl gesetzt");
await p.evaluate(() => document.getElementById("simFAbbr").click());
// Bericht
await p.evaluate(() => window.sdcadTest.sim.bericht());
const html = await p.evaluate(() => window.__druck || "");
ok(/E = 210000 N\/mm²/.test(html) && !/E = 21 N/.test(html), "Bericht: Werkstoffwerte ohne abgeschnittene Nullen (E = 210000 N/mm²)");
ok(/kein statischer Nachweis/.test(html) && /Einspannung/.test(html) && /Schnee/.test(html), "Bericht mit Hinweis, Lagern, Lasten und Normlast");
ok(await p.evaluate(() => window.sdcadTest.sim.sim().studien[0].lager.length === 1), "Studie im Dokument gespeichert");
// Profil (Traufblech): Stirn fest, Kraft am anderen Ende
const q = await b.newPage({ viewport: { width: 1280, height: 800 } }); q.on("pageerror", (e) => pr.push(e.message));
await q.addInitScript(() => { localStorage.setItem("sdcad-doc-0.2", JSON.stringify({ objekt: "T", nr: "1", zaehler: 60, features: [{ id: "tr", typ: "vorlage", name: "Traufblech", vorlage: "traufe", params: { dach: 120, neigung: 25, stirn: 50, tropf: 15, umschlag: 10 }, material: "stahl06", laenge: 800, richtung: "eine", ebene: "XY" }] })); });
await q.goto("http://localhost:" + (process.env.PORT || 8797) + "/index.html?test"); await q.waitForTimeout(1800);
await q.evaluate(() => document.getElementById("wSimFenster").click());
const pr2 = await q.evaluate(async () => { const T = window.sdcadTest, M = T.sim.modell(), A = M.nodes.find((n) => Math.abs(n[2]) < 1e-6), B = M.nodes.find((n) => Math.abs(n[2] - 800) < 1e-6);
  T.simApi.formStart("lager", { art: "eingespannt" }); T.sim.setzeSel({ art: "ebene", p: A, n: [0, 0, 1] }); T.sim.formOk();
  T.simApi.formStart("kraft"); T.sim.setzeSel({ art: "ebene", p: B, n: [0, 0, 1] }); T.sim.setzeForm("F", "50"); T.sim.setzeForm("richtung", "-y"); T.sim.formOk();
  await T.simApi.rechnen(); const m = T.sim.erg()?.massgebend; return m ? { ry: m.summeReaktion[1], u: m.umax, n: M.nodes.length } : null; });
ok(!!pr2 && Math.abs(pr2.ry - 50) < 1, `Profil (Traufblech): Reaktion = Kraft (${pr2?.ry?.toFixed(1)} N), Verschiebung ${pr2?.u?.toFixed(2)} mm`);
await p.evaluate(() => window.sdcadTest.simApi.oeffnen(false));
ok(await p.evaluate(() => document.getElementById("simLegende").hidden), "Schliessen blendet Ergebnis aus");
ok(pr.length === 0, "keine Seitenfehler " + pr.join(" | "));
await b.close(); srv.close();
console.log(fehler ? `${fehler} Fehler` : "Simulation (App): alle Prüfungen bestanden"); process.exit(fehler ? 1 : 0);
