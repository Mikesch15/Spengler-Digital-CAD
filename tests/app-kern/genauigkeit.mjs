  ok(!r.z.fl?.klasse && !/gen-mesh/.test(r.z.q?.klasse), `Kern an: Flächenblech mit Quetschfalte ist exakt – die Falte steckt im B-Rep-Körper (Blech «${r.z.fl?.klasse}», Falte «${r.z.q?.klasse}»)`);
import { createServer } from "node:http"; import { readFileSync } from "node:fs"; import { createRequire } from "node:module"; import { extname, join, resolve } from "node:path";
const dist = resolve("dist"), { chromium } = createRequire(import.meta.url)("playwright");
const typ = { ".html": "text/html", ".js": "text/javascript", ".wasm": "application/wasm", ".json": "application/json" };
const srv = createServer((q, a) => { let p, d; try { p = q.url === "/" ? "index.html" : decodeURIComponent(q.url.slice(1).split("?")[0]); d = readFileSync(join(dist, p)); } catch { a.writeHead(404); a.end(); return; } a.writeHead(200, { "content-type": typ[extname(p)] ?? "application/octet-stream" }); a.end(d); }).listen(+(process.env.PORT || 8793));
let fehler = 0; const ok = (c, t) => { console.log(`${c ? "✓" : "✗"} ${t}`); if (!c) fehler++; };
const b = await chromium.launch();
const mat = { id: "zink07", name: "Z", t: 0.7, ri: 1.0, k: 0.4, dichte: 7.2 };
const projekt = { objekt: "G", nr: "1", zaehler: 10, features: [
  { id: "sk", typ: "skizze", name: "Rechteck", ebene: "XY", elemente: [{ id: 1, art: "rechteck", a: [0, 0], b: [100, 60] }] },
  { id: "ex", typ: "extrusion", name: "Quader", skizze: "sk", abstand: 20, richtung: "eine", vorgang: "neu", flaechen: [[50, 30]] },
  { id: "sf", typ: "skizze", name: "Blechumriss", ebene: "XY", elemente: [{ id: 2, art: "rechteck", a: [200, 0], b: [400, 120] }] },
  { id: "fl", typ: "flaeche", name: "Blech", skizze: "sf", material: "zink07", profil: "alle", kanten: { "0:0": "ortgang", "0:3": "ortgang" } },
  { id: "q", typ: "quetschfalte", name: "Falte", ziel: "fl", ecke: "0:0", richtung: "links" } ] };
const lauf = async (kern) => {
  const s = await b.newPage({ viewport: { width: 1280, height: 800 } }), pr = []; s.on("pageerror", (e) => pr.push(e.message));
  await s.addInitScript(([d, k, m]) => { localStorage.setItem("sdcad-doc-0.2", JSON.stringify(d)); localStorage.setItem("sdcad-einstellungen", JSON.stringify({ materialien: [m], ...(k ? { programm: { kern: "occt" } } : {}) })); }, [projekt, kern, mat]);
  await s.goto("http://localhost:" + (process.env.PORT || 8793) + "/index.html?test");
  if (kern) await s.waitForFunction(() => /Exakt aus dem CAD-Kern/.test(document.getElementById("status").textContent), null, { timeout: 90000 }); else await s.waitForTimeout(1500);
  await s.waitForTimeout(500);
  const z = await s.evaluate(() => Object.fromEntries([...document.querySelectorAll("#baum li[data-id]")].map((li) => [li.dataset.id, li.querySelector(".gen")?.className || "", li.querySelector(".gen")?.dataset.hinweis || ""]).map(([i, c, t]) => [i, { klasse: c, titel: t }])));
  return { z, pr, s };
};
{
  const r = await lauf(false);
  ok(/gen-mesh/.test(r.z.ex?.klasse) && /Näherung/.test(r.z.ex?.titel), `Kern aus: Quader als Näherung gekennzeichnet (${r.z.ex?.titel})`);
  ok(!r.z.sk?.klasse, "Skizze trägt keine Kennzeichnung");
  ok(r.pr.length === 0, "keine Seitenfehler (Kern aus) " + r.pr.join("|"));
  await r.s.close();
}
{
  const r = await lauf(true);
  ok(!r.z.ex?.klasse, `Kern an: exakter Quader ohne Kennzeichnung (${r.z.ex?.klasse})`);
  ok(/gen-hybrid/.test(r.z.fl?.klasse) && /Quetschfalte/.test(r.z.fl?.titel), `Kern an: Flächenblech mit Quetschfalte «teilweise exakt» (${r.z.fl?.titel})`);
  ok(r.pr.length === 0, "keine Seitenfehler (Kern an) " + r.pr.join("|"));
  await r.s.close();
}
await b.close(); srv.close(); process.exit(fehler ? 1 : 0);
