// App-Test: Drehpunkt = Stelle unter dem Zeiger bei Beginn der Drehung (Umschalt + Mausrad)
// node tests/app-kern/drehpunkt.mjs (nach node build.mjs; Playwright/Chromium)
import { createServer } from "node:http"; import { readFileSync } from "node:fs"; import { createRequire } from "node:module"; import { extname, join, resolve } from "node:path";
const dist = resolve("dist"), { chromium } = createRequire(import.meta.url)("playwright");
const typ = { ".html": "text/html", ".js": "text/javascript", ".wasm": "application/wasm", ".json": "application/json" };
const srv = createServer((q, a) => { let p, d; try { p = q.url === "/" ? "index.html" : decodeURIComponent(q.url.slice(1).split("?")[0]); d = readFileSync(join(dist, p)); } catch { a.writeHead(404); a.end(); return; } a.writeHead(200, { "content-type": typ[extname(p)] ?? "application/octet-stream" }); a.end(d); }).listen(8784);
let fehler = 0; const ok = (c, t) => { console.log(`${c ? "✓" : "✗"} ${t}`); if (!c) fehler++; };
const b = await chromium.launch(), s = await b.newPage({ viewport: { width: 1280, height: 800 } }), pr = []; s.on("pageerror", (e) => pr.push(e.message));
const pj = { objekt: "D", nr: "D-1", zaehler: 10, features: [{ id: "sk", typ: "skizze", name: "S", ebene: "XY", elemente: [{ id: 1, art: "rechteck", a: [0, 0], b: [100, 100] }] },
  { id: "ex", typ: "extrusion", name: "E", skizze: "sk", flaechen: [[50, 50]], abstand: 50, richtung: "eine", vorgang: "neu" }] };
await s.addInitScript((d) => localStorage.setItem("sdcad-doc-0.2", JSON.stringify(d)), pj);
await s.goto("http://localhost:8784/index.html?test"); await s.waitForTimeout(900);
const bx = await s.locator("#leinwand").boundingBox(), px = bx.x + bx.width * 0.35, py = bx.y + bx.height * 0.6;
await s.keyboard.down("Shift"); await s.mouse.move(px, py); await s.mouse.down({ button: "middle" }); await s.mouse.move(px + 10, py + 4, { steps: 2 });
const P = await s.evaluate(() => window.sdcadTest.pivot()); const a0 = P && await s.evaluate((p) => window.sdcadTest.schirm(p), P);
await s.mouse.move(px + 160, py + 50, { steps: 10 }); await s.waitForTimeout(100);
const a1 = P && await s.evaluate((p) => window.sdcadTest.schirm(p), P); await s.mouse.up({ button: "middle" }); await s.keyboard.up("Shift");
ok(!!P, "Drehpunkt wird bei Beginn der Drehung gesetzt");
ok(P && Math.hypot(a1[0] - a0[0], a1[1] - a0[1]) < 3, `Drehpunkt bleibt beim Drehen an derselben Bildschirmstelle (Abweichung ${P ? Math.hypot(a1[0] - a0[0], a1[1] - a0[1]).toFixed(2) : "–"} px)`);
const k = await s.evaluate(() => window.sdcadTest.kamera()); ok(Number.isFinite(k.pos[0]), "Kamera gültig");
ok(pr.length === 0, "keine Seitenfehler " + pr.join(" | "));
await b.close(); srv.close();
console.log(fehler ? `${fehler} Fehler` : "Drehpunkt: alle Prüfungen bestanden"); process.exit(fehler ? 1 : 0);
