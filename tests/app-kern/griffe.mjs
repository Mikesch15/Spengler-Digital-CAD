// App-Test Ziehpfeile für Dachfenster/Kamin/Lukarne
// node tests/app-kern/griffe.mjs (nach node build.mjs; Playwright/Chromium)
import { createServer } from "node:http"; import { readFileSync } from "node:fs"; import { createRequire } from "node:module"; import { extname, join, resolve } from "node:path";
const dist = resolve("dist"), { chromium } = createRequire(import.meta.url)("playwright");
const typ = { ".html": "text/html", ".js": "text/javascript", ".wasm": "application/wasm", ".json": "application/json" };
const srv = createServer((q, a) => { let p, d; try { p = q.url === "/" ? "index.html" : decodeURIComponent(q.url.slice(1).split("?")[0]); d = readFileSync(join(dist, p)); } catch { a.writeHead(404); a.end(); return; } a.writeHead(200, { "content-type": typ[extname(p)] ?? "application/octet-stream" }); a.end(d); }).listen(8797);
let fehler = 0; const ok = (c, t) => { console.log(`${c ? "✓" : "✗"} ${t}`); if (!c) fehler++; };
const b = await chromium.launch(), s = await b.newPage({ viewport: { width: 1280, height: 800 } }), pr = []; s.on("pageerror", (e) => pr.push(e.message));
await s.goto("http://localhost:8797/index.html?test"); await s.waitForTimeout(1200);

await s.goto("http://localhost:8797/index.html?test"); await s.waitForTimeout(1200);
await s.evaluate(() => document.getElementById("wDachAuto").click()); await s.waitForSelector("#d_neigung", { state: "attached", timeout: 4000 }); await s.waitForTimeout(400);
await s.evaluate(() => document.getElementById("dOk").click()); await s.waitForTimeout(400);
await s.evaluate(() => document.getElementById("zoomAlles").click()); await s.waitForTimeout(300);
for (const [knopf, name] of [["wDachElement", "Dachfenster"], ["wLukarne", "Lukarne"]]) {
  await s.evaluate((k) => document.getElementById(k).click(), knopf); await s.waitForSelector("#d_x", { state: "attached", timeout: 4000 }); await s.waitForTimeout(600);
  const g = await s.evaluate(() => window.sdcadTest.griffe());
  ok(g.length === 4 && g.filter((q) => q.feld === "x").length === 2 && g.filter((q) => q.feld === "y").length === 2, `${name}: 4 Pfeile (±quer, ±Fallinie)`);
  for (const feld of ["x", "y"]) {
    const q = (await s.evaluate(() => window.sdcadTest.griffe())).find((k) => k.feld === feld && k.faktor === 1);
    const v0 = +(await s.inputValue("#d_" + feld)), dx = q.schirm.b[0] - q.schirm.a[0], dy = q.schirm.b[1] - q.schirm.a[1], L = Math.hypot(dx, dy) || 1;
    await s.mouse.move(q.schirm.b[0], q.schirm.b[1]); await s.mouse.down(); await s.mouse.move(q.schirm.b[0] + dx / L * 40, q.schirm.b[1] + dy / L * 40, { steps: 4 }); await s.mouse.up(); await s.waitForTimeout(400);
    const v1 = +(await s.inputValue("#d_" + feld)); ok(v1 > v0, `${name}: Pfeil ${feld} ziehen vergrössert den Wert (${v0} → ${v1})`);
    const q2 = (await s.evaluate(() => window.sdcadTest.griffe())).find((k) => k.feld === feld && k.faktor === -1);
    const dx2 = q2.schirm.b[0] - q2.schirm.a[0], dy2 = q2.schirm.b[1] - q2.schirm.a[1], L2 = Math.hypot(dx2, dy2) || 1;
    await s.mouse.move(q2.schirm.b[0], q2.schirm.b[1]); await s.mouse.down(); await s.mouse.move(q2.schirm.b[0] + dx2 / L2 * 30, q2.schirm.b[1] + dy2 / L2 * 30, { steps: 4 }); await s.mouse.up(); await s.waitForTimeout(400);
    const v2 = +(await s.inputValue("#d_" + feld)); ok(v2 < v1, `${name}: Gegenpfeil verkleinert (${v1} → ${v2})`);
  }
  await s.evaluate(() => document.getElementById("dOk").click()); await s.waitForTimeout(300);
}
ok(pr.length === 0, "keine Seitenfehler " + pr.join(" | "));
await b.close(); srv.close();
console.log(fehler ? `${fehler} Fehler` : "Ziehpfeile Dach (App): alle Prüfungen bestanden"); process.exit(fehler ? 1 : 0);
