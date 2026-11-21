// App-Test Responsive/Hell-Dunkel/Touch: kein Überlauf, Dialoge erreichbar
// node tests/app-kern/responsive.mjs (nach node build.mjs; Playwright/Chromium)
import { createServer } from "node:http"; import { readFileSync } from "node:fs"; import { createRequire } from "node:module"; import { extname, join, resolve } from "node:path";
const dist = resolve("dist"), { chromium } = createRequire(import.meta.url)("playwright");
const typ = { ".html": "text/html", ".js": "text/javascript", ".wasm": "application/wasm", ".json": "application/json" };
const srv = createServer((q, a) => { let p, d; try { p = q.url === "/" ? "index.html" : decodeURIComponent(q.url.slice(1).split("?")[0]); d = readFileSync(join(dist, p)); } catch { a.writeHead(404); a.end(); return; } a.writeHead(200, { "content-type": typ[extname(p)] ?? "application/octet-stream" }); a.end(d); }).listen(8797);
let fehler = 0; const ok = (c, t) => { console.log(`${c ? "✓" : "✗"} ${t}`); if (!c) fehler++; };
const b = await chromium.launch(), pr = [];
const FENSTER = [["Handy hoch", 390, 800, true], ["Handy quer", 800, 390, true], ["Tablet hoch", 820, 1180, true], ["Tablet quer", 1180, 820, true], ["Desktop klein", 1024, 640, false], ["Desktop gross", 1600, 900, false]];
for (const th of ["light", "dark"]) for (const [name, w, h, touch] of FENSTER) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, colorScheme: th, hasTouch: touch, isMobile: touch && w < 900 });
  const s = await ctx.newPage(); s.on("pageerror", (e) => pr.push(name + ": " + e.message));
  await s.goto("http://localhost:8797/index.html?test"); await s.waitForTimeout(1200);
  const tag = `${name} · ${th}`;
  ok(await s.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `${tag}: kein horizontaler Seitenüberlauf`);
  ok(await s.evaluate(() => { const r = document.getElementById("wSuche").getBoundingClientRect(); return r.left >= 0 && r.right <= innerWidth && r.width >= 40; }), `${tag}: «Suchen» sichtbar und gross genug`);
  // Suche per Antippen/Klick, Werkzeug starten
  await s.evaluate(() => document.getElementById("wSuche").click()); await s.waitForSelector(".bs input"); await s.keyboard.type("dach auto"); await s.keyboard.press("Enter");
  await s.waitForSelector("#d_name", { state: "attached" }); await s.waitForTimeout(500);
  const g = await s.evaluate(() => { const d = document.getElementById("dialog").getBoundingClientRect(), ok = document.getElementById("dOk").getBoundingClientRect(), v = document.getElementById("leinwand").getBoundingClientRect(); const el = document.elementFromPoint(ok.left + ok.width / 2, ok.top + ok.height / 2); return { dl: d.left, dr: d.right, dt: d.top, db: d.bottom, okSichtbar: ok.top >= 0 && ok.bottom <= innerHeight && ok.left >= 0 && ok.right <= innerWidth, okTreffer: el?.id === "dOk", ansichtH: v.height, ansichtBreite: v.width, W: innerWidth, H: innerHeight }; });
  ok(g.dl >= -1 && g.dr <= g.W + 1 && g.dt >= -1 && g.db <= g.H + 1, `${tag}: Dialog liegt im Fenster (${Math.round(g.dl)}…${Math.round(g.dr)} × ${Math.round(g.dt)}…${Math.round(g.db)} von ${g.W}×${g.H})`);
  ok(g.okSichtbar && g.okTreffer, `${tag}: OK im Dialog sichtbar und antippbar`);
  if (h <= 520) ok(g.dr - g.dl <= 0.5 * g.W, `${tag}: Dialog nimmt höchstens die halbe Breite (${Math.round(g.dr - g.dl)} px), 3D-Ansicht bleibt sichtbar`);
  if (w > 1000) ok(g.ansichtBreite > 0.55 * g.W, `${tag}: 3D-Ansicht behält mehr als 55 % der Breite (${Math.round(g.ansichtBreite)} px)`);
  await s.evaluate(() => document.getElementById("dAbbrechen").click()); await s.waitForTimeout(200);
  ok(await s.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `${tag}: nach dem Dialog weiterhin kein Überlauf`);
  // Modale Fenster: Einstellungen und Hilfe passen ins Fenster
  for (const id of ["wEinst", "wHilfe"]) {
    await s.evaluate((i) => document.getElementById(i).click(), id); await s.waitForTimeout(300);
    ok(await s.evaluate(() => { const m = [...document.querySelectorAll(".modalbox")].find((e) => e.offsetParent); if (!m) return false; const r = m.getBoundingClientRect(); return r.left >= -1 && r.right <= innerWidth + 1 && r.bottom <= innerHeight + 1; }), `${tag}: Fenster ${id} liegt im Bildschirm`);
    await s.keyboard.press("Escape"); await s.waitForTimeout(200);
  }
  await ctx.close();
}
ok(pr.length === 0, "keine Seitenfehler " + pr.join(" | "));
await b.close(); srv.close();
console.log(fehler ? `${fehler} Fehler` : "Responsive (App): alle Prüfungen bestanden"); process.exit(fehler ? 1 : 0);
