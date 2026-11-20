// App-Test für Phase C1: node tests/app-kern/pruefen.mjs  (vorher node build.mjs; Playwright/Chromium nötig)
// 1. Schalter aus (Standard): wie Version 0.2, kein Kern-Download, kein exakter STEP-Knopf
// 2. Schalter ein: Werkstatt «3D-Prüfung (exakt)» stimmt mit der Abwicklung, «STEP exakt» liefert B-Rep (AP242)
import { createServer } from "node:http";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { extname, join, resolve } from "node:path";
const dist = resolve("dist"), { chromium } = createRequire(import.meta.url)("playwright");
const typ = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".wasm": "application/wasm", ".json": "application/json", ".webmanifest": "application/manifest+json" };
const srv = createServer((q, a) => { let p, d; try { p = q.url === "/" ? "index.html" : decodeURIComponent(q.url.slice(1).split("?")[0]); d = readFileSync(join(dist, p)); } catch { a.writeHead(404); a.end(); return; } a.writeHead(200, { "content-type": typ[extname(p)] ?? "application/octet-stream" }); a.end(d); }).listen(8767);
let fehler = 0; const ok = (b, t) => { console.log(`${b ? "✓" : "✗"} ${t}`); if (!b) fehler++; };
const b = await chromium.launch();
async function seite(kern) {
  const s = await b.newPage({ acceptDownloads: true }), anfragen = [], probleme = [];
  s.on("request", (r) => anfragen.push(r.url())); s.on("pageerror", (e) => probleme.push(e.message)); s.on("console", (m) => m.type() === "error" && probleme.push(m.text()));
  // Einstellungen werden nur mit Materialliste übernommen (wie gespeicherte Einstellungen der App)
  if (kern) await s.addInitScript((k) => localStorage.setItem("sdcad-einstellungen", JSON.stringify({ materialien: [{ id: "zink07", name: "Titanzink 0.70", t: 0.7, ri: 1.0, k: 0.4, dichte: 7.2 }], programm: { kern: k } })), kern);
  await s.goto("http://localhost:8767/index.html?test");
  await s.waitForTimeout(800);
  return { s, anfragen, probleme };
}
{ // 1 Schalter aus
  const { s, anfragen, probleme } = await seite(null);
  ok(await s.evaluate(() => document.getElementById("wStepExakt").hidden), "Aus: Knopf «STEP exakt» verborgen");
  ok(!anfragen.some((u) => /\/cad\//.test(u)), "Aus: kein Laden des CAD-Kerns");
  ok(!(await s.$("#k3D")), "Aus: keine 3D-Prüfung in der Werkstatt");
  ok(probleme.length === 0, `Aus: keine Fehler in der Konsole ${probleme.join(" | ")}`);
  await s.close();
}
{ // 2 Schalter ein
  const { s, anfragen, probleme } = await seite("occt");
  ok(await s.evaluate(() => !document.getElementById("wStepExakt").hidden), "Ein: Knopf «STEP exakt» sichtbar");
  // Eingeschaltet baut die App das Modell exakt auf → der Kern wird sofort (im Worker) geladen; ausgeschaltet nie (Teil 1)
  await s.waitForSelector("#k3D", { timeout: 5000 });
  await s.click("#k3D");
  await s.waitForFunction(() => /^[✓⚠]|CAD-Kern/.test(document.getElementById("k3DErg").textContent), null, { timeout: 60000 });
  const erg = await s.textContent("#k3DErg");
  ok(erg.startsWith("✓") && /Δ -?0\.0000/.test(erg), `Ein: 3D-Prüfung Traufblech: ${erg}`);
  const [dl] = await Promise.all([s.waitForEvent("download", { timeout: 60000 }), s.evaluate(() => document.getElementById("wStepExakt").click())]);
  const text = readFileSync(await dl.path(), "utf8");
  ok(/exakt\)\.step$/.test(dl.suggestedFilename()) && /AP242/.test(text) && /MANIFOLD_SOLID_BREP/.test(text) && /CYLINDRICAL_SURFACE/.test(text), `Ein: STEP exakt «${dl.suggestedFilename()}» – AP242, Volumenkörper, exakte Biegezylinder`);
  ok(/STEP exakt \(B-Rep, AP242\): 1 Blechteil/.test(await s.textContent("#status")), "Ein: Statusmeldung nennt exportierte Teile");
  ok(probleme.length === 0, `Ein: keine Fehler in der Konsole ${probleme.join(" | ")}`);
  await s.close();
}
{ // 3 Exaktes Modell: Extrusion mit Loch, Ausschneiden, Drehung → Netze aus dem Kern
  const PI = Math.PI, projekt = { objekt: "Kerntest", nr: "T-1", zaehler: 20, features: [
    { id: "s1", typ: "skizze", name: "Skizze 1", ebene: "XY", elemente: [{ id: 1, art: "rechteck", a: [0, 0], b: [100, 50] }, { id: 2, art: "kreis", c: [25, 25], r: 10 }] },
    { id: "e1", typ: "extrusion", name: "Platte", skizze: "s1", abstand: 20, richtung: "eine", vorgang: "neu" },
    { id: "s2", typ: "skizze", name: "Skizze 2", ebene: "XY", elemente: [{ id: 1, art: "kreis", c: [75, 25], r: 8 }] },
    { id: "e2", typ: "extrusion", name: "Loch", skizze: "s2", abstand: 20, richtung: "eine", vorgang: "ausschneiden", ziel: "alle" },
    { id: "s3", typ: "skizze", name: "Skizze 3", ebene: "XZ", elemente: [{ id: 1, art: "rechteck", a: [200, 0], b: [220, 40] }] },
    { id: "d1", typ: "drehung", name: "Ring", skizze: "s3", achse: "V", winkel: 360, vorgang: "neu" },
    { id: "s5", typ: "skizze", name: "Skizze 5", ebene: "XY", elemente: [{ id: 1, art: "rechteck", a: [300, 0], b: [320, 30] }] },
    { id: "d2", typ: "drehung", name: "Segment 90°", skizze: "s5", achse: "V", winkel: 90, vorgang: "neu" },
    { id: "s4", typ: "skizze", name: "Skizze 4", ebene: "XY", elemente: [{ id: 1, art: "ellipse", c: [0, 200], a: [30, 200], r2: 10 }] },
    { id: "e3", typ: "extrusion", name: "Ellipse", skizze: "s4", abstand: 5, richtung: "eine", vorgang: "neu" },
    { id: "s6", typ: "skizze", name: "Skizze 6", ebene: "XY", elemente: [{ id: 1, art: "text", text: "SD", p: [0, 300], hoehe: 20 }] },
    { id: "e4", typ: "extrusion", name: "Schrift", skizze: "s6", abstand: 2, richtung: "eine", vorgang: "neu" },
  ] };
  let netzD2 = null;
  for (const kern of [null, "occt"]) {
    const s = await b.newPage(), probleme = []; s.on("pageerror", (e) => probleme.push(e.message));
    await s.addInitScript(([k, d]) => { localStorage.setItem("sdcad-doc-0.2", JSON.stringify(d)); if (k) localStorage.setItem("sdcad-einstellungen", JSON.stringify({ materialien: [{ id: "zink07", name: "Titanzink 0.70", t: 0.7, ri: 1.0, k: 0.4, dichte: 7.2 }], programm: { kern: k } })); }, [kern, projekt]);
    await s.goto("http://localhost:8767/index.html?test");
    if (kern) await s.waitForFunction(() => /Exakt aus dem CAD-Kern|CAD-Kern:/.test(document.getElementById("status").textContent), null, { timeout: 60000 });
    else await s.waitForTimeout(1500);
    const k = await s.evaluate(() => window.sdcadTest.koerperInfo()), st = await s.textContent("#status");
    const platte = k.find((o) => o.fid === "e1"), ring = k.find((o) => o.fid === "d1"), ell = k.find((o) => o.fid === "e3"), txt = k.find((o) => o.fid === "e4");
    const vP = 100 * 50 * 20 - PI * 100 * 20 - PI * 64 * 20, vR = PI * (220 ** 2 - 200 ** 2) * 40;
    const d2 = k.find((o) => o.fid === "d2");
    if (!kern) netzD2 = d2;
    else ok(d2.exakt && [0, 1, 2].every((i) => Math.abs(d2.min[i] - netzD2.min[i]) < 0.5 && Math.abs(d2.max[i] - netzD2.max[i]) < 0.5), `Ein: Drehung 90° liegt wie das Netz (Grenzen ${JSON.stringify(d2.min.map(Math.round))}…${JSON.stringify(d2.max.map(Math.round))} / Netz ${JSON.stringify(netzD2.min.map(Math.round))}…${JSON.stringify(netzD2.max.map(Math.round))})`);
    if (!kern) ok(!platte.exakt && !ring.exakt && probleme.length === 0, `Aus: Körper bleiben Netz wie 0.2 (Platte ${platte.volumen.toFixed(0)} mm³)`);
    else {
      ok(platte.exakt && ring.exakt && platte.flaechen >= 8, `Ein: Platte und Ring aus dem Kern (Platte ${platte.flaechen} Flächen) – ${st}`);
      ok(Math.abs(platte.volumen - vP) / vP < 0.002 && Math.abs(ring.volumen - vR) / vR < 0.002, `Ein: Netzvolumen ≈ exakt (Platte ${platte.volumen.toFixed(0)}/${vP.toFixed(0)}, Ring ${ring.volumen.toFixed(0)}/${vR.toFixed(0)})`);
      ok(ell.exakt && Math.abs(ell.volumen - PI * 30 * 10 * 5) / (PI * 1500) < 0.002, `Ein: Ellipse exakt aus dem Kern (V ${ell.volumen.toFixed(0)} ≈ ${(PI * 1500).toFixed(0)})`);
      ok(!txt.exakt && /Schrift \(Skizzentext noch nicht exakt\)/.test(st), "Ein: Skizzentext bleibt Netz und wird in der Statusmeldung genannt");
      // Prüfen → Eigenschaften (exakt)
      await s.evaluate(() => document.getElementById("wEigenschaften").click());
      const tab = await s.$$eval("#werkstatt table.liste tbody tr", (tr) => tr.map((r) => [...r.cells].map((c) => c.textContent)));
      const zp = tab.find((r) => r[0].startsWith("Platte")), zr = tab.find((r) => r[0].startsWith("Ring"));
      const zahl = (t) => +t.replace(/[’']/g, "").replace(",", ".");
      ok(zp && Math.abs(zahl(zp[1]) - vP / 1000) < 0.001 && zp[6] === "✓" && zr && Math.abs(zahl(zr[1]) - vR / 1000) < 0.001, `Ein: Eigenschaften exakt – Platte ${zp?.[1]} cm³ (soll ${(vP / 1000).toFixed(3)}), Ring ${zr?.[1]} cm³ (soll ${(vR / 1000).toFixed(3)}), gültig`);
      ok(zp && zp[5] === "100.00 × 50.00 × 20.00" && zp[4] === `${((250000 - PI * 100 * 25 - PI * 64 * 75) / (5000 - PI * 100 - PI * 64)).toFixed(2)} / 25.00 / 10.00`, `Ein: Abmessungen ${zp?.[5]}, Schwerpunkt ${zp?.[4]}`);
      const [dl] = await Promise.all([s.waitForEvent("download"), s.click("#kEigCsv")]);
      ok(/Eigenschaften\.csv$/.test(dl.suggestedFilename()) && /^Körper;Volumen mm3/.test(readFileSync(await dl.path(), "utf8")), "Ein: Eigenschaften als CSV exportierbar");
      ok(probleme.length === 0, `Ein: keine Seitenfehler ${probleme.join(" | ")}`);
    }
    await s.close();
  }
}
await b.close(); srv.close();
console.log(fehler ? `${fehler} Fehler` : "App mit CAD-Kern: alle Prüfungen bestanden"); process.exit(fehler ? 1 : 0);
