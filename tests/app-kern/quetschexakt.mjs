// App-Test Quetschfalte exakt: Falte (Dreieck, Biegungen, Saum, Wulst) steckt als B-Rep im Blechkörper (ein Körper, gültig), Volumen > Blech ohne Falte
import { createServer } from "node:http"; import { readFileSync } from "node:fs"; import { createRequire } from "node:module"; import { extname, join, resolve } from "node:path";
const dist = resolve("dist"), { chromium } = createRequire(import.meta.url)("playwright");
const typ = { ".html": "text/html", ".js": "text/javascript", ".wasm": "application/wasm", ".json": "application/json" };
const srv = createServer((q, a) => { let p, d; try { p = q.url === "/" ? "index.html" : decodeURIComponent(q.url.slice(1).split("?")[0]); d = readFileSync(join(dist, p)); } catch { a.writeHead(404); a.end(); return; } a.writeHead(200, { "content-type": typ[extname(p)] || "application/octet-stream" }); a.end(d); }).listen(process.env.PORT || 8797);
let fehler = 0; const ok = (c, t) => { console.log(`${c ? "✓" : "✗"} ${t}`); if (!c) fehler++; };
const b = await chromium.launch(), pr = [];
const mk = (falte) => ({ objekt: "T", nr: "1", zaehler: 20, features: [
  { id: "sk", typ: "skizze", name: "Rechteck", ebene: "XY", elemente: [{ id: 1, art: "rechteck", a: [0, 0], b: [200, 120] }], bedingungen: [] },
  { id: "fl", typ: "flaeche", name: "Blech 1", skizze: "sk", material: "zink07", flaechen: [[10, 10]], kanten: { "0:0": "ortgang", "0:3": "ortgang" } },
  ...(falte ? [{ id: "q", typ: "quetschfalte", name: "Falte", ziel: "fl", ecke: "0:0", richtung: "links" }] : [])] });
const lauf = async (falte) => { const s = await b.newPage({ viewport: { width: 1280, height: 800 } }); s.on("pageerror", (e) => pr.push(e.message));
  await s.addInitScript(([d]) => { localStorage.setItem("sdcad-doc-0.2", JSON.stringify(d)); localStorage.setItem("sdcad-einstellungen", JSON.stringify({ programm: { kern: "occt" }, materialien: [{ id: "zink07", name: "Z", t: 0.7, ri: 1, k: 0.4, dichte: 7.2 }] })); }, [mk(falte)]);
  await s.goto("http://localhost:" + (process.env.PORT || 8797) + "/index.html?test");
  await s.waitForFunction(() => /Exakt aus dem CAD-Kern/.test(document.getElementById("status").textContent), null, { timeout: 90000 }); await s.waitForTimeout(800);
  const r = await s.evaluate(() => ({ st: document.getElementById("status").textContent, meshes: window.sdcadTest.meshListe("q").length, k: window.sdcadTest.koerper().filter((k) => String(k.fid).startsWith("fl")).map((k) => Math.abs(k.volumen)), q: document.querySelector('#baum li[data-id="q"] .gen')?.className || "" })); await s.close(); return r; };
const ohne = await lauf(false), mit = await lauf(true);
ok(mit.k.length === 1 && mit.k[0] > ohne.k[0] + 20, `Blech mit Quetschfalte exakt grösser: ${ohne.k[0]?.toFixed(0)} → ${mit.k[0]?.toFixed(0)} mm³ (${mit.st.slice(0, 90)})`);
ok(!/Quetschfalte/.test(mit.st) && mit.meshes === 0, `Falte ist Teil des exakten Körpers (Netz der Falte entfernt: ${mit.meshes}) – ${mit.st.slice(0, 90)}`);
ok(!/gen-mesh/.test(mit.q), `Genauigkeitsanzeige der Falte nicht «Näherung» (${mit.q})`);
ok(pr.length === 0, "keine Seitenfehler " + pr.join(" | "));
await b.close(); srv.close();
console.log(fehler ? `${fehler} Fehler` : "Quetschfalte exakt (App): alle Prüfungen bestanden"); process.exit(fehler ? 1 : 0);
