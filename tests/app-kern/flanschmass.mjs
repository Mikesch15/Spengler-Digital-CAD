// App-Test Flansch-Bemassung: Länge «Mass bis» und «Biegeposition» stimmen im 3D-Körper mit dem Profil überein
// node tests/app-kern/flanschmass.mjs (nach node build.mjs; Playwright/Chromium)
import { createServer } from "node:http"; import { readFileSync } from "node:fs"; import { createRequire } from "node:module"; import { join, resolve } from "node:path";
const dist = resolve("dist"), { chromium } = createRequire(import.meta.url)("playwright");
const typ = { ".html": "text/html", ".js": "text/javascript", ".wasm": "application/wasm", ".json": "application/json" };
const srv = createServer((q, a) => { let p, d; try { p = q.url === "/" ? "index.html" : decodeURIComponent(q.url.slice(1).split("?")[0]); d = readFileSync(join(dist, p)); } catch { a.writeHead(404); a.end(); return; } a.writeHead(200, { "content-type": typ[p.slice(p.lastIndexOf("."))] || "application/octet-stream" }); a.end(d); }).listen(+(process.env.PORT || 8797));
let fehler = 0; const ok = (c, t) => { if (!c) { console.log(`✗ ${t}`); fehler++; } };
const b = await chromium.launch(), pr = [];
const m = { t: 1.5, ri: 1, k: 0.4 };
const fall = async (w) => {
  const p = await b.newPage({ viewport: { width: 900, height: 600 } }); p.on("pageerror", (e) => pr.push(e.message));
  const feat = [{ id: "sk", typ: "skizze", name: "R", ebene: "XY", elemente: [{ id: 1, art: "rechteck", a: [0, 0], b: [200, 120] }], bedingungen: [] }, { id: "fl", typ: "flaeche", name: "B", skizze: "sk", material: "zink07", flaechen: [[10, 10]], kanten: { "0:0": { werkzeug: w } } }];
  await p.addInitScript(([d, mm]) => { localStorage.setItem("sdcad-einstellungen", JSON.stringify({ materialien: [{ id: "zink07", name: "Z", ...mm, dichte: 7.2 }] })); localStorage.setItem("sdcad-doc-0.2", JSON.stringify({ objekt: "T", nr: "1", zaehler: 20, features: d })); }, [feat, m]);
  await p.goto("http://localhost:" + (process.env.PORT || 8797) + "/index.html?test"); await p.waitForTimeout(1300);
  const r = await p.evaluate(() => { const P = window.sdcadTest.meshPunkte("fl");  let z1 = -1e9, y0 = 1e9; for (const q of P) { if (q[1] < 5) { z1 = Math.max(z1, q[2]); y0 = Math.min(y0, q[1]); } } return { zmax: z1, ymin: y0 }; });
  await p.close(); return r;
};
const sub = (a, c) => [a[0] - c[0], a[1] - c[1]], len = (a) => Math.hypot(a[0], a[1]);
const { bausteinProfil } = await import("../../kern/flaechenblech.js");
let n = 0;
for (const a of [90, 60]) for (const bezug of ["mitte", "aussen", "innen", "tangente"]) for (const pos of ["mitte", "aussen", "innen", "tangente"]) {
  const w = { typ: "flansch", winkel: a, laenge: 25, radius: 2, bezug, biegepos: pos, seite: 1 }, pf = bausteinProfil({ name: "t", werkzeug: w }, m);
  const q = pf.quer, zs = q.map((p) => p[1]), xs = q.map((p) => p[0]);
  const soll = { zmax: Math.max(...zs), ymin: -Math.max(...xs) }, ist = await fall(w); n++;
  ok(Math.abs(ist.zmax - soll.zmax) < 0.06, `${a}° bis ${bezug}/Pos ${pos}: Flanschhöhe ${ist.zmax.toFixed(2)} statt ${soll.zmax.toFixed(2)}`);
  ok(Math.abs(ist.ymin - soll.ymin) < 0.06, `${a}° bis ${bezug}/Pos ${pos}: Ausladung über die Kante ${ist.ymin.toFixed(2)} statt ${soll.ymin.toFixed(2)}`);
}
ok(pr.length === 0, "keine Seitenfehler " + pr.join(" | "));
await b.close(); srv.close();
console.log(fehler ? `${fehler} Fehler (${n} Fälle)` : `Flansch-Bemassung (App): ${n} Fälle stimmen`); process.exit(fehler ? 1 : 0);
