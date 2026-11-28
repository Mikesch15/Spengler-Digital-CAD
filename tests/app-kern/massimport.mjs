// App-Test Massaufnahmen-Import (App → CAD): Liste mit Status, Bauteil erzeugen, Herkunft, Abweichung. Screenshots: SHOT=<ordner>
// node tests/app-kern/massimport.mjs (nach node build.mjs; Playwright/Chromium)
import { createServer } from "node:http";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { extname, join, resolve } from "node:path";
const dist = resolve("dist"), { chromium } = createRequire(import.meta.url)("playwright");
const typ = { ".html": "text/html", ".js": "text/javascript", ".wasm": "application/wasm", ".json": "application/json" };
const srv = createServer((q, a) => { let p, d; try { p = q.url === "/" ? "index.html" : decodeURIComponent(q.url.slice(1).split("?")[0]); d = readFileSync(join(dist, p)); } catch { a.writeHead(404); a.end(); return; } a.writeHead(200, { "content-type": typ[extname(p)] ?? "application/octet-stream" }); a.end(d); }).listen(+process.env.PORT || 8775);
let fehler = 0; const ok = (b, t) => { console.log(`${b ? "✓" : "✗"} ${t}`); if (!b) fehler++; };
// Nachbau der Tabelle projects (id, name, order_no, customer, object, hinweis, status, archived, updated_at)
const db = { proj: [{ id: 7, name: "Dach Müller", order_no: "2026-114", customer: "Müller AG", object: "Haus 3, Bern", hinweis: null, status: "in_arbeit", archived: false, updated_at: "2026-11-20T10:00:00+00:00" }], n: 8, zeit: 1 };
const ref = JSON.parse(readFileSync("test/daten/app-freies-profil-111.json", "utf8"));
const MESS = [ref, { id: 112, project_id: 7, type: "freies_profil", title: "Defekt (1 Schenkel)", staerke_mm: "0.6", data: { schenkel: [{ laenge: 50, winkel: 0 }], segmente: [{ laenge: 1000 }] }, updated_at: "2026-11-02T08:00:00Z" },
  { id: 113, project_id: 7, type: "kamineinfassung", title: "Kamin Ost", staerke_mm: "0.7", data: { breiteVorne: 600 }, updated_at: "2026-11-03T08:00:00Z" }].map((z) => ({ ...z, project_id: 7 }));
const b = await chromium.launch(), s = await b.newPage({ viewport: { width: 1280, height: 800 } }), probleme = []; s.on("pageerror", (e) => probleme.push(e.message));
await s.route("**/nfgryuzkpwjfmdlmevuy.supabase.co/**", async (r) => {
  const q = r.request(), u = new URL(q.url()), p = u.pathname, m = q.method(), body = q.postData() ? JSON.parse(q.postData()) : null, j = (st, d) => r.fulfill({ status: st, contentType: "application/json", headers: { "access-control-allow-origin": "*" }, body: JSON.stringify(d) });
  if (m === "OPTIONS") return r.fulfill({ status: 204, headers: { "access-control-allow-origin": "*", "access-control-allow-headers": "*", "access-control-allow-methods": "*" } });
  if (p === "/auth/v1/token") return body.password === "geheim" ? j(200, { access_token: "T", refresh_token: "R", expires_in: 3600, user: { id: "u1", email: body.email } }) : j(400, { error_description: "bad" });
  if (p === "/rest/v1/profiles") return j(200, [{ id: "u1", company_id: "f1", first_name: "Max", last_name: "Muster" }]);
  if (p === "/rest/v1/companies") return j(200, [{ name: "Muster AG" }]);
  if (p === "/rest/v1/rpc/has_permission") return j(200, true);
  if (p === "/rest/v1/cad_daten") return m === "GET" ? j(200, []) : j(201, [body]);
  if (p === "/rest/v1/measurements") return j(200, MESS);
  if (p === "/rest/v1/projects") {
    const id = u.searchParams.get("id");
    if (m === "GET") { let l = db.proj.map((x) => ({ ...x })); if (id) l = l.filter((x) => String(x.id) === id.slice(3)); else if (u.searchParams.get("archived")) l = l.filter((x) => !x.archived); return j(200, l); }
    if (m === "POST") { if (db.proj.some((x) => x.order_no.trim().toLowerCase() === body.order_no.trim().toLowerCase())) return j(409, { code: "23505", message: 'duplicate key value violates unique constraint "projects_firma_auftragsnr_eindeutig"' }); const z = { id: db.n++, hinweis: null, status: "offen", archived: false, updated_at: `2026-11-20T11:00:0${db.zeit++}+00:00`, ...body }; db.proj.push(z); return j(201, [z]); }
    if (m === "PATCH") { const z = db.proj.find((x) => String(x.id) === id.slice(3) && x.updated_at === decodeURIComponent(u.searchParams.get("updated_at")).slice(3)); if (!z) return j(200, []); Object.assign(z, body, { updated_at: `2026-11-20T12:00:0${db.zeit++}+00:00` }); return j(200, [z]); }
  }
  return j(404, {});
});
await s.addInitScript(() => { localStorage.setItem("sdcad-doc-0.2", JSON.stringify({ objekt: "Muster, Bern", nr: "2026-001", zaehler: 5, features: [] })); localStorage.setItem("sdcad-einstellungen", JSON.stringify({ materialien: [{ id: "zink07", name: "Titanzink 0.70", t: 0.7, ri: 1.0, k: 0.4, dichte: 7.2 }] })); });
await s.goto("http://localhost:" + (process.env.PORT || 8775) + "/index.html?test"); await s.waitForTimeout(800);
// ohne Anmeldung
await s.click("#aProjektWahl"); ok(/Anmeldung nötig/.test(await s.textContent("#pjInhalt")), "Ohne Anmeldung: Hinweis und Weg zum Konto");
await s.click('[data-pj-aktion="anmelden"]'); await s.waitForSelector("#cName", { timeout: 4000 });
await s.fill("#cName", "Max.Muster"); await s.fill("#cPass", "geheim"); await s.click('[data-cloud="anmelden"]');
await s.waitForFunction(() => /Abgleich fertig/.test(document.getElementById("eInhalt").textContent), null, { timeout: 8000 }); await s.click("#eAbbrechen");
const SHOT = process.env.SHOT, bild = async (n) => { if (SHOT) await s.screenshot({ path: `${SHOT}/${n}.png` }); };
await s.click("#aProjektWahl"); await s.waitForSelector("#pjListe li", { timeout: 4000 });
await s.click('#pjListe li[data-pj="7"]'); await s.click('[data-pj-aktion="mass"]'); await s.waitForSelector('[data-pj-aktion="bauteil"]', { timeout: 4000 });
const liste = await s.textContent("#pjForm");
ok(/Referenz|Freies Profil/.test(liste) && /fehlerhaft/.test(liste) && /noch kein Generator/.test(liste), "Importliste: bereit/Warnung, fehlerhaft und «noch kein Generator» sichtbar");
ok(await s.locator('[data-pj-aktion="bauteil"]').count() === 1 && await s.locator('[data-pj-aktion="uebernehmen"]').count() === 2, "Knöpfe: «Bauteil erzeugen» nur bei Generator, «Übernehmen» nur bei gültigen Aufnahmen");
await bild("1-importliste");
await s.click('[data-pj-aktion="bauteil"]'); await s.waitForTimeout(1500);
const d = await s.evaluate(() => window.sdcadTest.dok());
const pf = d.features.filter((f) => f.typ === "profil");
ok(pf.length === 2 && pf.some((f) => f.laenge === 1940 && f.stueck === 3) && pf.every((f) => f.herkunft?.messaufnahmeId === 111), "2 Profile mit Herkunft (Messaufnahme 111) erzeugt");
ok(d.massaufnahmen?.length === 1 && d.massaufnahmen[0].quelle.id === 111, "Originalaufnahme im Modell gesichert");
await s.evaluate((id) => window.sdcadTest.bearbeite(id), pf[0].id); await s.waitForSelector(".messung", { timeout: 4000 });
ok(/wie gemessen/.test(await s.textContent(".messung")), "Dialog: «wie gemessen»");
await bild("2-dialog-wie-gemessen");
await s.fill('tr[data-i="1"] input[data-k="L"]', "31"); await s.waitForTimeout(300);
ok(/im CAD geändert/.test(await s.textContent(".messung")) && /Schenkel 2/.test(await s.textContent(".messung")), "Dialog: Änderung wird als Abweichung gezeigt");
await bild("3-dialog-abweichung");
await s.click("[data-messung-zurueck]"); await s.waitForTimeout(500);
ok(/wie gemessen/.test(await s.textContent(".messung")), "Zurücksetzen auf Messwerte");
// Werkstattblatt trägt die Messaufnahme-ID und meldet Änderungen
const blatt = (id) => s.evaluate((i) => window.sdcadTest.blatt(i), id);
ok(/Messung<\/dt><dd>Nr\. 111<\/dd>/.test(await blatt(pf[0].id)) && !/Gegenüber der Messung/.test(await blatt(pf[0].id)), "Werkstattblatt: Messung Nr. 111, unverändert ohne Hinweis");
await s.evaluate((id) => { const f = window.sdcadTest.dok().features.find((x) => x.id === id); return f; }, pf[0].id);
// Aus App aktualisieren: App-Stand ändert sich (Schenkel 2: 25 → 28), Bauteil ist unverändert → ohne Rückfrage
MESS[0] = { ...MESS[0], data: { ...MESS[0].data, schenkel: MESS[0].data.schenkel.map((x, i) => (i === 1 ? { ...x, laenge: 28 } : x)) } };
await s.click("[data-messung-neu]"); await s.waitForFunction(() => document.querySelector('tr[data-i="1"] input[data-k="L"]')?.value === "28", null, { timeout: 5000 });
ok(/wie gemessen/.test(await s.textContent(".messung")), "Aus App aktualisiert: Schenkel 2 = 28, Anzeige «wie gemessen»");
await s.click("[data-messung-neu]"); await s.waitForFunction(() => /unverändert/.test(document.querySelector("[data-messung-text]")?.textContent || ""), null, { timeout: 5000 });
ok(true, "Zweites Aktualisieren: «Stand der App ist unverändert»");
await bild("4-aus-app-aktualisiert");
await s.evaluate(() => { document.getElementById("druck").innerHTML = window.sdcadTest.blatt(window.sdcadTest.dok().features.find((f) => f.typ === "profil").id); });
ok(!probleme.length, "Keine Skriptfehler " + probleme.join("|"));
await b.close(); srv.close(); console.log(fehler ? `${fehler} Fehler` : "Massimport: alle Tests bestanden"); process.exit(fehler ? 1 : 0);
