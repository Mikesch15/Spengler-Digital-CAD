// App-Test Konto & Cloud: Anmeldung, Abgleich, Cloud-Projekt, Teile an die App – gegen einen Server-Nachbau (page.route)
// node tests/app-kern/cloud.mjs (nach node build.mjs; Playwright/Chromium)
import { createServer } from "node:http";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { extname, join, resolve } from "node:path";
const dist = resolve("dist"), { chromium } = createRequire(import.meta.url)("playwright");
const typ = { ".html": "text/html", ".js": "text/javascript", ".wasm": "application/wasm", ".json": "application/json" };
const srv = createServer((q, a) => { let p, d; try { p = q.url === "/" ? "index.html" : decodeURIComponent(q.url.slice(1).split("?")[0]); d = readFileSync(join(dist, p)); } catch { a.writeHead(404); a.end(); return; } a.writeHead(200, { "content-type": typ[extname(p)] ?? "application/octet-stream" }); a.end(d); }).listen(8769);
let fehler = 0; const ok = (b, t) => { console.log(`${b ? "✓" : "✗"} ${t}`); if (!b) fehler++; };
const b = await chromium.launch(), s = await b.newPage(), probleme = []; s.on("pageerror", (e) => probleme.push(e.message));
const db = { daten: [], proj: [], teile: [] };
await s.route("**/nfgryuzkpwjfmdlmevuy.supabase.co/**", async (r) => {
  const q = r.request(), u = new URL(q.url()), p = u.pathname, m = q.method(), body = q.postData() ? JSON.parse(q.postData()) : null, j = (st, d) => r.fulfill({ status: st, contentType: "application/json", headers: { "access-control-allow-origin": "*" }, body: JSON.stringify(d) });
  if (m === "OPTIONS") return r.fulfill({ status: 204, headers: { "access-control-allow-origin": "*", "access-control-allow-headers": "*", "access-control-allow-methods": "*" } });
  if (p === "/auth/v1/token") return body.password === "geheim" ? j(200, { access_token: "T", refresh_token: "R", expires_in: 3600, user: { id: "u1", email: body.email } }) : j(400, { error_description: "bad" });
  if (p === "/rest/v1/profiles") return u.searchParams.get("select").includes("full_name") ? j(400, { message: "column profiles.full_name does not exist" }) : j(200, [{ id: "u1", company_id: "f1", first_name: "Max", last_name: "Muster" }]);
  if (p === "/rest/v1/companies") return j(200, [{ name: "Muster AG" }]);
  if (p === "/rest/v1/rpc/has_permission") return j(200, true);
  if (p === "/rest/v1/cad_daten") { if (m === "GET") return j(200, db.daten); db.daten.push({ ...body }); return j(201, [body]); }
  if (p === "/rest/v1/cad_projekte") { if (m === "POST") { const z = { id: "p1", ...body }; db.proj.push(z); return j(201, [z]); } return j(200, db.proj.map((x) => ({ ...x, geaendert: "2026-11-20T10:00:00" }))); }
  if (p === "/rest/v1/cad_teile") { db.teile.push(...body); return j(201, body); }
  if (p === "/rest/v1/cad_profil_auftraege") return j(200, []);
  return j(404, {});
});
await s.addInitScript(() => { localStorage.setItem("sdcad-doc-0.2", JSON.stringify({ objekt: "Test", nr: "2026-114", zaehler: 5, features: [{ id: "f1", typ: "profil", name: "Ortbrett", start: 0, zeilen: [{ L: 100, winkel: 90, art: "abkanten" }, { L: 40, winkel: 0, art: "abkanten" }], material: "zink07", laenge: 2000, stueck: 2, richtung: "eine", ebene: "XY" }] }));
  const e = { materialien: [{ id: "zink07", name: "Titanzink 0.70", t: 0.7, ri: 1.0, k: 0.4, dichte: 7.2 }] }; localStorage.setItem("sdcad-einstellungen", JSON.stringify(e)); });
await s.goto("http://localhost:8769/index.html?test"); await s.waitForTimeout(600);
await s.evaluate(() => { document.getElementById("wEinst").click(); document.querySelector('[data-ereg="konto"]').click(); });
ok(/Konto der Spengler-Digital-App/.test(await s.textContent("#eInhalt")), "Register «Konto & Cloud» ist da");
await s.fill("#cName", "Max.Muster"); await s.fill("#cPass", "geheim"); await s.click('[data-cloud="anmelden"]');
await s.waitForFunction(() => /Abgleich fertig/.test(document.getElementById("eInhalt").textContent), null, { timeout: 8000 });
const t1 = await s.textContent("#eInhalt");
ok(/Max Muster/.test(t1) && /Muster AG/.test(t1) && /Abgleich fertig/.test(t1), `Angemeldet und abgeglichen: ${t1.match(/Abgleich fertig[^.]*/)?.[0]}`);
ok(!(await s.evaluate(() => JSON.stringify(localStorage))).includes("geheim"), "Passwort wird nirgends gespeichert");
await s.click('[data-cloud="speichern"]'); await s.waitForFunction(() => /in der Cloud gespeichert/.test(document.getElementById("eInhalt").textContent), null, { timeout: 5000 });
ok(db.proj.length === 1 && db.proj[0].auftrag === "2026-114" && db.proj[0].daten.features.length === 1, "Projekt in der Cloud gespeichert (Auftrag 2026-114)");
await s.click('[data-cloud="senden"]'); await s.waitForFunction(() => /an die App gesendet|Keine Blechteile/.test(document.getElementById("eInhalt").textContent), null, { timeout: 5000 });
const tl = db.teile[0];
ok(db.teile.length === 1 && tl.auftrag === "2026-114" && tl.stueck === 2 && tl.app_data.schenkel.length === 2 && tl.app_data.schenkel[1].winkel === 90 && tl.zuschnitt_breite_mm > 130, `Teil an die App: Zuschnitt ${tl?.zuschnitt_breite_mm}, Schenkel ${JSON.stringify(tl?.app_data.schenkel)}`);
await s.click('[data-cloud="liste"]'); await s.waitForSelector('[data-cloud="oeffnen"]', { timeout: 5000 });
ok(true, "Projektliste zeigt das Cloud-Projekt");
ok(probleme.length === 0, "keine Seitenfehler " + probleme.join(" | "));
await b.close(); srv.close();
console.log(fehler ? `${fehler} Fehler` : "Konto & Cloud in der App: alle Prüfungen bestanden"); process.exit(fehler ? 1 : 0);
