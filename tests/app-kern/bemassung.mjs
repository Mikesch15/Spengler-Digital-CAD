// App-Test Bemassung in der Skizze: Linie → Länge, Linie zu Linie → Abstand (parallel) bzw. Winkel, Punkt zu Linie
// node tests/app-kern/bemassung.mjs (nach node build.mjs; Playwright/Chromium)
import { createServer } from "node:http";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { extname, join, resolve } from "node:path";
const dist = resolve("dist"), { chromium } = createRequire(import.meta.url)("playwright");
const typ = { ".html": "text/html", ".js": "text/javascript", ".wasm": "application/wasm", ".json": "application/json" };
const srv = createServer((q, a) => { let p, d; try { p = q.url === "/" ? "index.html" : decodeURIComponent(q.url.slice(1).split("?")[0]); d = readFileSync(join(dist, p)); } catch { a.writeHead(404); a.end(); return; } a.writeHead(200, { "content-type": typ[extname(p)] ?? "application/octet-stream" }); a.end(d); }).listen(8777);
let fehler = 0; const ok = (b, t) => { console.log(`${b ? "✓" : "✗"} ${t}`); if (!b) fehler++; };
const b = await chromium.launch(), s = await b.newPage({ viewport: { width: 1280, height: 800 } }), probleme = []; s.on("pageerror", (e) => probleme.push(e.message));
// zwei parallele Linien (Abstand 60), eine schräge Linie, ein Punkt
await s.addInitScript(() => localStorage.setItem("sdcad-doc-0.2", JSON.stringify({ objekt: "B", nr: "B-1", zaehler: 9, features: [{ id: "sk", typ: "skizze", name: "Skizze 1", ebene: "XY", elemente: [
  { id: 1, art: "linie", pts: [[0, 0], [200, 0]] }, { id: 2, art: "linie", pts: [[0, 60], [200, 60]] }, { id: 3, art: "linie", pts: [[0, 150], [150, 220]] }, { id: 4, art: "kreis", c: [260, 30], r: 20 }] }] })));
await s.goto("http://localhost:8777/index.html?test"); await s.waitForTimeout(800);
await s.evaluate(() => window.sdcadTest.bearbeite("sk")); await s.waitForTimeout(800);
const pos = (uv) => s.evaluate((u) => window.sdcadTest.schirmUV("XY", u), uv);
await s.click("#tMass"); await s.waitForTimeout(200);
const klick = async (uv) => { const p = await pos(uv); await s.mouse.click(p[0], p[1]); await s.waitForTimeout(250); };
const feld = () => s.evaluate(() => { const i = document.querySelector(".massbox input"); return i ? { wert: parseFloat(i.value), sel: document.querySelector(".massbox select")?.value ?? null } : null; });
// 1) einzelne Linie: Länge
await klick([100, 0]); let f = await feld(); ok(f && Math.abs(f.wert - 200) < 1e-6, `Eine Linie: Länge ${f?.wert}`);
// 2) zweite parallele Linie angeklickt, solange das Feld offen ist: Abstand der Linien
await klick([100, 60]); f = await feld(); ok(f && Math.abs(f.wert - 60) < 1e-6, `Linie zu Linie (parallel): Abstand ${f?.wert}`);
await s.fill(".massbox input", "80"); await s.keyboard.press("Enter"); await s.waitForTimeout(500);
const d = await s.evaluate(() => window.sdcadTest.dok().features.find((x) => x.id === "sk")); const e1 = d.elemente.find((e) => e.id === 1), e2 = d.elemente.find((e) => e.id === 2);
ok(Math.abs(Math.abs(e2.pts[0][1] - e1.pts[0][1]) - 80) < 1e-6 && d.bedingungen?.some((c) => c.typ === "punktLinie"), `Abstand 80 gesetzt: Linien liegen ${(e2.pts[0][1] - e1.pts[0][1]).toFixed(2)} auseinander`);
// 3) nicht parallele Linien: Winkel
await klick([100, 0]); await klick([75, 185]); f = await feld(); ok(f && f.wert > 5 && f.wert < 90, `Linie zu Linie (nicht parallel): Winkel ${f?.wert?.toFixed(2)}°`);
await s.keyboard.press("Escape"); await s.waitForTimeout(200);
// 4) Punkt zu Linie
await klick([0, 150]); await klick([100, 0]); f = await feld(); ok(f && Math.abs(f.wert - 150) < 1e-6 || f && f.wert > 100, `Punkt zu Linie: Abstand ${f?.wert}`);
// 5) Kreis + Linie: Abstand der Kreismitte zur Linie; Kreis + Kreis/Punkt: Mittelpunktabstand
await s.keyboard.press("Escape"); await s.waitForTimeout(150);
await klick([260 + 14.14, 30 + 14.14]); f = await feld(); ok(f && Math.abs(f.wert - 40) < 1e-6, `Kreis angeklickt: Durchmesser ${f?.wert}`);
await klick([150, 0]); f = await feld(); ok(f && Math.abs(f.wert - 30) < 1e-6, `Kreis + Linie: Mitte zur Linie ${f?.wert?.toFixed(2)}`);
await s.fill(".massbox input", "50"); await s.keyboard.press("Enter"); await s.waitForTimeout(400);
ok(await s.evaluate(() => window.sdcadTest.dok().features[0].bedingungen.some((c) => c.typ === "punktLinie" && c.p.k === "c")), "Mitte-zu-Linie-Mass als Abhängigkeit gespeichert (punktLinie an der Kreismitte)");
ok(probleme.length === 0, "keine Seitenfehler " + probleme.join(" | "));
await b.close(); srv.close();
console.log(fehler ? `${fehler} Fehler` : "Bemassung: alle Prüfungen bestanden"); process.exit(fehler ? 1 : 0);
