// App-Test Cloud-Ablage: Projekt zuordnen → Ordner Projekte/<Jahr>/<Projekt>/{Modelle,Exporte,Pläne} entstehen (nur einmal); Modell, Export und Plan landen in den richtigen Ordnern
// node tests/app-kern/ablage.mjs (nach node build.mjs; Playwright/Chromium) – gegen einen Server-Nachbau (page.route)
import { createServer } from "node:http"; import { readFileSync } from "node:fs"; import { createRequire } from "node:module"; import { extname, join, resolve } from "node:path";
const dist = resolve("dist"), { chromium } = createRequire(import.meta.url)("playwright");
const typ = { ".html": "text/html", ".js": "text/javascript", ".wasm": "application/wasm", ".json": "application/json" };
const srv = createServer((q, a) => { let p, d; try { p = q.url === "/" ? "index.html" : decodeURIComponent(q.url.slice(1).split("?")[0]); d = readFileSync(join(dist, p)); } catch { a.writeHead(404); a.end(); return; } a.writeHead(200, { "content-type": typ[extname(p)] ?? "application/octet-stream" }); a.end(d); }).listen(+process.env.PORT || 8796);
let fehler = 0; const ok = (c, t) => { console.log(`${c ? "✓" : "✗"} ${t}`); if (!c) fehler++; };
const b = await chromium.launch(), s = await b.newPage({ viewport: { width: 1280, height: 800 } }), pr = []; s.on("pageerror", (e) => pr.push(e.message));
const db = { ordner: [], dateien: [] }, jahr = new Date().getFullYear();
await s.route("**/nfgryuzkpwjfmdlmevuy.supabase.co/**", async (r) => {
  const q = r.request(), u = new URL(q.url()), p = u.pathname, m = q.method(), body = q.postData() ? JSON.parse(q.postData()) : null, j = (st, d) => r.fulfill({ status: st, contentType: "application/json", headers: { "access-control-allow-origin": "*" }, body: JSON.stringify(d) });
  const f = (k) => { const v = u.searchParams.get(k); return v?.startsWith("eq.") ? v.slice(3) : null; };
  if (m === "OPTIONS") return r.fulfill({ status: 204, headers: { "access-control-allow-origin": "*", "access-control-allow-headers": "*", "access-control-allow-methods": "*" } });
  if (p === "/auth/v1/token") return j(200, { access_token: "T", refresh_token: "R", expires_in: 3600, user: { id: "u1", email: "x@y" } });
  if (p === "/rest/v1/profiles") return j(200, [{ id: "u1", company_id: "f1", first_name: "Max", last_name: "Muster" }]);
  if (p === "/rest/v1/companies") return j(200, [{ name: "Muster AG" }]);
  if (p === "/rest/v1/rpc/has_permission") return j(200, true);
  if (p === "/rest/v1/cad_daten") return m === "GET" ? j(200, []) : j(201, [body]);
  if (p === "/rest/v1/cad_ordner") { if (m === "GET") return j(200, db.ordner); const neu = body.filter((x) => !db.ordner.some((o) => o.pfad === x.pfad)); db.ordner.push(...neu); return j(201, neu); }
  if (p === "/rest/v1/cad_dateien") {
    if (m === "GET") { const id = f("id"); let l = db.dateien; if (id) l = l.filter((d) => d.id === id); if (f("ordner")) l = l.filter((d) => d.ordner === f("ordner")); if (f("name")) l = l.filter((d) => d.name === f("name")); return j(200, l); }
    if (m === "POST") { const d = { id: "d" + (db.dateien.length + 1), version: 1, geloescht: false, groesse: body.inhalt.length, geaendert: "2026-11-20T10:00:00", ...body }; db.dateien.push(d); return j(201, [d]); }
    if (m === "PATCH") { const d = db.dateien.find((x) => x.id === f("id")); Object.assign(d, body); return j(200, [d]); }
  }
  return j(404, {});
});
await s.addInitScript(() => { localStorage.setItem("sdcad-doc-0.2", JSON.stringify({ objekt: "Test", nr: "X", zaehler: 5, features: [{ id: "sk", typ: "skizze", name: "S", ebene: "XY", elemente: [{ id: 1, art: "rechteck", a: [0, 0], b: [50, 50] }] }] })); localStorage.setItem("sdcad-einstellungen", JSON.stringify({ materialien: [{ id: "zink07", name: "Z", t: 0.7, ri: 1, k: 0.4, dichte: 7.2 }] })); });
await s.goto("http://localhost:" + (process.env.PORT || 8796) + "/index.html?test"); await s.waitForTimeout(700);
await s.evaluate(() => { document.getElementById("wEinst").click(); document.querySelector('[data-ereg="konto"]').click(); });
await s.fill("#cName", "Max.Muster"); await s.fill("#cPass", "geheim"); await s.click('[data-cloud="anmelden"]');
await s.waitForFunction(() => /Abgleich fertig/.test(document.getElementById("eInhalt").textContent), null, { timeout: 8000 });
await s.evaluate(() => { document.getElementById("eZu")?.click(); });
// Projekt zuordnen → Ordner entstehen
await s.evaluate(() => window.sdcadTest.setzeAuftrag({ nr: "2026-114", objekt: "Müller, Test", appProjekt: { id: 7, name: "Dach Müller" } })); await s.waitForTimeout(800);
const pfade = () => db.ordner.map((o) => o.pfad), pr1 = `Projekte/${jahr}/2026-114 Dach Müller`;
ok(pfade().length === 6 && pfade().includes("Projekte") && pfade().includes(`Projekte/${jahr}`) && pfade().includes(pr1) && ["Modelle", "Exporte", "Pläne"].every((u) => pfade().includes(`${pr1}/${u}`)), `Zuordnung legt an: Projekte › ${jahr} › 2026-114 Dach Müller › Modelle/Exporte/Pläne (${pfade().length} Ordner)`);
ok(db.ordner.find((o) => o.pfad === pr1)?.project_id === "7", "Projektordner merkt sich das App-Projekt");
// nochmals zuordnen: nichts doppelt
await s.evaluate(() => window.sdcadTest.setzeAuftrag({ nr: "2026-114", objekt: "Müller, Test", appProjekt: { id: 7, name: "Dach Müller" } })); await s.waitForTimeout(600);
ok(pfade().length === 6, "Erneutes Zuordnen legt nichts doppelt an");
// Modell speichern: Dialog «Speichern» (Name + Ort Cloud); zweites Mal fragt vor dem Überschreiben
s.on("dialog", (d) => d.accept());
const cloudSpeichern = async () => { await s.evaluate(() => document.getElementById("wSpeichern").click()); await s.waitForSelector("#d_ort", { timeout: 4000 }); await s.selectOption("#d_ort", "cloud"); await s.evaluate(() => document.getElementById("dOk").click()); await s.waitForTimeout(1000); };
await cloudSpeichern();
const md = db.dateien.find((d) => d.art === "modell");
ok(md && md.ordner === `${pr1}/Modelle` && /^2026-114 /.test(md.name) && JSON.parse(md.inhalt).features.length === 1, `Modell liegt in «Modelle»: ${md?.name}`);
await cloudSpeichern();
ok(db.dateien.filter((d) => d.art === "modell").length === 1 && db.dateien[0].version === 2, "Nochmals speichern (nach Rückfrage) = neue Version derselben Datei (v2)");
await s.evaluate(() => document.getElementById("wAblage").click()); await s.waitForSelector('[data-ab="aktualisieren"]', { timeout: 4000 });
// Export und Plan
await s.evaluate(() => { window.sdcadTest.exportiere("Abwicklung.dxf", "0\nEOF\n", "export"); window.sdcadTest.exportiere("Plan 1.svg", "<svg/>", "plan"); }); await s.waitForTimeout(900);
ok(db.dateien.some((d) => d.art === "export" && d.name === "Abwicklung.dxf" && d.ordner === `${pr1}/Exporte`), "DXF-Export liegt in «Exporte»");
ok(db.dateien.some((d) => d.art === "plan" && d.name === "Plan 1.svg" && d.ordner === `${pr1}/Pläne`), "Plan liegt in «Pläne»");
// Anzeige
await s.click('[data-ab="aktualisieren"]'); await s.waitForTimeout(700);
const txt = await s.textContent("#abInhalt"); ok(/Modelle/.test(txt) && /Exporte/.test(txt) && /Pläne/.test(txt) && /2026-114 Dach Müller/.test(txt), "Ablage zeigt den Ordnerbaum");
ok(pr.length === 0, "keine Seitenfehler " + pr.join(" | "));
await b.close(); srv.close();
console.log(fehler ? `${fehler} Fehler` : "Cloud-Ablage: alle Prüfungen bestanden"); process.exit(fehler ? 1 : 0);
