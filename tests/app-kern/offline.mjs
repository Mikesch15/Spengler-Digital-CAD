// App-Test Offline/Service Worker: Kaltstart ohne Netz, versionskonsistenter Zwischenspeicher, kontrolliertes Update, fehlgeschlagenes Update behält die alte Version
import { createServer } from "node:http"; import { readFileSync } from "node:fs"; import { createRequire } from "node:module"; import { extname, join, resolve } from "node:path";
const dist = resolve("dist"), { chromium } = createRequire(import.meta.url)("playwright");
const typ = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".wasm": "application/wasm", ".json": "application/json", ".jpg": "image/jpeg", ".png": "image/png", ".svg": "image/svg+xml", ".webmanifest": "application/manifest+json" };
let stufe = 1; // 1 = Stand wie gebaut, 2 = «neue Version» (geänderte HTML und sw.js), 3 = neue Version mit fehlender kritischer Datei
const PORT = +(process.env.PORT || 8794);
const srv = createServer((q, a) => {
  let p, d; try { p = q.url === "/" ? "index.html" : decodeURIComponent(q.url.slice(1).split("?")[0]); d = readFileSync(join(dist, p)); } catch { a.writeHead(404); a.end(); return; }
  if (stufe >= 2 && p === "index.html") d = Buffer.from(d.toString("utf8").replace("</html>", `<!-- v${stufe} --></html>`));
  if (stufe >= 2 && p === "sw.js") d = Buffer.from(d.toString("utf8").replace(/const VERSION = "[^"]*"/, `const VERSION = "test-v${stufe}"`));
  if (stufe === 3 && p === "cad/cad-worker.js") { a.writeHead(404); a.end(); return; }
  a.writeHead(200, { "content-type": typ[extname(p)] ?? "application/octet-stream", "cache-control": "no-store" }); a.end(d);
}).listen(PORT);
let fehler = 0; const ok = (c, t) => { console.log(`${c ? "✓" : "✗"} ${t}`); if (!c) fehler++; };
const b = await chromium.launch(), ctx = await b.newContext({ viewport: { width: 1280, height: 800 } }), s = await ctx.newPage(), pr = [];
s.on("pageerror", (e) => pr.push(e.message)); ctx.on("serviceworker", (w) => w.on("console", (m) => { if (/sdcad-sw/.test(m.text())) console.log("SW-LOG", m.text().slice(0, 200)); }));
const URL0 = `http://localhost:${PORT}/index.html?test`;
const warte = async (fn, ms = 60000) => { const t = Date.now(); while (Date.now() - t < ms) { if (await s.evaluate(fn).catch(() => false)) return true; await s.waitForTimeout(300); } return false; }; // eigene Abfrage: asynchrone Bedingungen sicher abwarten
const keys = () => s.evaluate(async () => (await caches.keys()).filter((k) => k !== "sdcad-meta").sort()); // sdcad-meta: interne Liste der Entstehungszeiten
await s.goto(URL0);
await s.waitForFunction(() => navigator.serviceWorker.controller || false, null, { timeout: 30000 }).catch(() => {});
await s.reload(); // der erste Aufruf wird erst nach der Aktivierung kontrolliert
await s.waitForFunction(() => window.sdcadTest?.offlineStatus?.().vollstaendig === true, null, { timeout: 90000 }).catch(() => {});
const st1 = await s.evaluate(() => window.sdcadTest.offlineStatus());
ok(st1.vollstaendig && st1.fehlt.length === 0, `Offline-Status vollständig (fehlt: ${st1.fehlt.join(", ") || "nichts"})`);
const k1 = await keys();
ok(k1.length === 1 && /^sdcad-.+-[0-9a-f]{8}$/.test(k1[0]), `genau ein versionierter Zwischenspeicher: ${k1.join(", ")}`);
const inhalt = await s.evaluate(async () => { const c = await caches.open((await caches.keys())[0]); return (await c.keys()).map((r) => new URL(r.url).pathname); });
ok(["/index.html", "/cad/cad-worker.js", "/cad/replicad_single.wasm", "/occt/occt-import-js.wasm"].every((u) => inhalt.includes(u)), "Zwischenspeicher enthält HTML, CAD-Kern (Worker und WASM) und STEP-Leser");
// 1 Kaltstart ohne Netz
await ctx.setOffline(true);
await s.goto(URL0); await s.waitForFunction(() => !!window.sdcadTest, null, { timeout: 30000 }).catch(() => {});
ok(await s.evaluate(() => !!window.sdcadTest && !!document.getElementById("leinwand")), "Offline-Kaltstart: Programm startet ohne Netz");
const wasmOffline = await s.evaluate(async () => { try { const r = await fetch("cad/replicad_single.wasm"); const n = (await r.arrayBuffer()).byteLength; return n > 1e7; } catch { return false; } });
ok(wasmOffline, "Offline: CAD-Kern (WASM) kommt aus dem Zwischenspeicher");
const ver = await s.evaluate(async () => { try { await fetch("version.json?t=1", { cache: "no-store" }); return "geladen"; } catch { return "nicht erreichbar"; } });
ok(ver === "nicht erreichbar", "Offline: version.json wird nicht aus dem Zwischenspeicher vorgetäuscht");
await ctx.setOffline(false);
// 2 kontrolliertes Update: neue Version wartet, bis sie verlangt wird
stufe = 2;
await s.goto(URL0); await s.waitForTimeout(500);
await s.evaluate(async () => { const r = await navigator.serviceWorker.getRegistration(); await r.update(); });
await warte(async () => !!(await navigator.serviceWorker.getRegistration()).waiting);
const w2 = await s.evaluate(async () => { const r = await navigator.serviceWorker.getRegistration(); return { wartet: !!r.waiting, aktiv: !!r.active, caches: (await caches.keys()).filter((k) => k !== "sdcad-meta").sort() }; });
ok(w2.wartet && w2.aktiv, "Update: neue Version wartet, die laufende bleibt aktiv (kein stilles Umschalten)");
ok(w2.caches.length === 2, `Update: beide Zwischenspeicher vorhanden (${w2.caches.join(", ")})`);
await s.evaluate(async () => { const r = await navigator.serviceWorker.getRegistration(); r.waiting.postMessage({ typ: "aktivieren" }); });
await warte(async () => !(await navigator.serviceWorker.getRegistration()).waiting, 30000);
await s.reload(); await s.waitForFunction(() => window.sdcadTest?.offlineStatus?.().vollstaendig === true, null, { timeout: 90000 }).catch(() => {});
await warte(async () => (await caches.keys()).filter((k) => k !== "sdcad-meta").length === 1, 90000); // der neue Zwischenspeicher lädt die grossen Dateien selbst, erst danach entfällt der alte
const k2 = await keys();
ok(k2.length === 1 && /test-v2/.test(k2[0]), `nach Aktivierung und vollständigem Nachladen bleibt nur der neue Zwischenspeicher: ${k2.join(", ")}`);
// 3 fehlgeschlagenes Update (kritische Datei fehlt) behält die laufende Version
stufe = 3;
await s.evaluate(async () => { const r = await navigator.serviceWorker.getRegistration(); try { await r.update(); } catch { /* Installationsfehler erwartet */ } });
await s.waitForTimeout(3000);
const w3 = await s.evaluate(async () => { const r = await navigator.serviceWorker.getRegistration(); return { wartet: !!r.waiting, installiert: !!r.installing, caches: (await caches.keys()).filter((k) => k !== "sdcad-meta").sort() }; });
ok(!w3.wartet && w3.caches.length === 1 && /test-v2/.test(w3.caches[0]), `fehlgeschlagenes Update: laufende Version und ihr Zwischenspeicher bleiben (${w3.caches.join(", ")})`);
await ctx.setOffline(true);
await s.goto(URL0); await s.waitForFunction(() => !!window.sdcadTest, null, { timeout: 30000 }).catch(() => {});
ok(await s.evaluate(() => !!window.sdcadTest), "nach fehlgeschlagenem Update startet das Programm offline weiterhin");
ok(pr.length === 0, "keine Seitenfehler " + pr.join("|"));
await b.close(); srv.close(); process.exit(fehler ? 1 : 0);
