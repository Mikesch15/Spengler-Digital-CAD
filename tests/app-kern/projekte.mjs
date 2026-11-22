// App-Test Projekte der App: anlegen, bearbeiten, archivieren, dem Modell zuordnen, Änderungen aus der App übernehmen
// node tests/app-kern/projekte.mjs (nach node build.mjs; Playwright/Chromium)
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
const b = await chromium.launch(), s = await b.newPage({ viewport: { width: 1280, height: 800 } }), probleme = []; s.on("pageerror", (e) => probleme.push(e.message));
await s.route("**/nfgryuzkpwjfmdlmevuy.supabase.co/**", async (r) => {
  const q = r.request(), u = new URL(q.url()), p = u.pathname, m = q.method(), body = q.postData() ? JSON.parse(q.postData()) : null, j = (st, d) => r.fulfill({ status: st, contentType: "application/json", headers: { "access-control-allow-origin": "*" }, body: JSON.stringify(d) });
  if (m === "OPTIONS") return r.fulfill({ status: 204, headers: { "access-control-allow-origin": "*", "access-control-allow-headers": "*", "access-control-allow-methods": "*" } });
  if (p === "/auth/v1/token") return body.password === "geheim" ? j(200, { access_token: "T", refresh_token: "R", expires_in: 3600, user: { id: "u1", email: body.email } }) : j(400, { error_description: "bad" });
  if (p === "/rest/v1/profiles") return j(200, [{ id: "u1", company_id: "f1", first_name: "Max", last_name: "Muster" }]);
  if (p === "/rest/v1/companies") return j(200, [{ name: "Muster AG" }]);
  if (p === "/rest/v1/rpc/has_permission") return j(200, true);
  if (p === "/rest/v1/cad_daten") return m === "GET" ? j(200, []) : j(201, [body]);
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
// Liste, Suche, Zuordnen
await s.click("#aProjektWahl"); await s.waitForSelector("#pjListe li", { timeout: 4000 });
ok(/Dach Müller/.test(await s.textContent("#pjListe")), "Projekte der App werden geladen");
await s.click('#pjListe li[data-pj="7"]'); await s.click('[data-pj-aktion="zuordnen"]');
const d1 = await s.evaluate(() => window.sdcadTest.dok());
ok(d1.nr === "2026-114" && d1.objekt === "Müller AG, Haus 3, Bern" && d1.appProjekt.id === 7 && /Dach Müller/.test(await s.textContent("#aProjektName")), "Modell dem Projekt zugeordnet: Auftragsnummer, Objekt und Anzeige");
ok(await s.evaluate(() => document.getElementById("aNr").readOnly && document.getElementById("aObjekt").readOnly), "Auftragsfelder sind gesperrt (kommen aus der App)");
// Neues Projekt: Pflichtfelder, Doppelte Auftrags-Nr., Anlegen
await s.click('[data-pj-aktion="neu"]'); await s.click('[data-pj-aktion="speichern"]');
ok(/Projektnamen/.test(await s.textContent("#pjMeldung")), "Pflichtfelder werden geprüft (wie in der App)");
await s.fill('[data-pf="name"]', "Fassade Meier"); await s.fill('[data-pf="order_no"]', "2026-114"); await s.fill('[data-pf="object"]', "Weg 2"); await s.click('[data-pj-aktion="speichern"]');
ok(/gibt es schon/.test(await s.textContent("#pjMeldung")) && db.proj.length === 1, "Doppelte Auftrags-Nr. wird abgelehnt, nichts angelegt");
await s.fill('[data-pf="order_no"]', "2026-200"); await s.fill('[data-pf="customer"]', "Meier GmbH"); await s.click('[data-pj-aktion="speichern"]');
await s.waitForFunction(() => /in der App angelegt/.test(document.getElementById("pjMeldung").textContent), null, { timeout: 4000 });
ok(db.proj.length === 2 && db.proj[1].name === "Fassade Meier" && db.proj[1].customer === "Meier GmbH" && db.proj[1].order_no === "2026-200", "Neues Projekt in der App-Tabelle angelegt");
// Bearbeiten des zugeordneten Projekts zieht das Modell nach
await s.click('#pjListe li[data-pj="7"]'); await s.fill('[data-pf="name"]', "Dach Müller NEU"); await s.fill('[data-pf="object"]', "Haus 5, Bern"); await s.click('[data-pj-aktion="speichern"]');
await s.waitForFunction(() => /Gespeichert/.test(document.getElementById("pjMeldung").textContent), null, { timeout: 4000 });
const d2 = await s.evaluate(() => window.sdcadTest.dok());
ok(db.proj[0].name === "Dach Müller NEU" && d2.objekt === "Müller AG, Haus 5, Bern" && d2.appProjekt.name === "Dach Müller NEU", "Bearbeitet: Änderung steht in der App, das zugeordnete Modell zieht nach");
// Änderung in der App (anderer Benutzer) → Konflikt beim Speichern erkannt
db.proj[0].customer = "Müller AG (neu)"; db.proj[0].updated_at = "2026-11-20T13:00:00+00:00";
await s.fill('[data-pf="hinweis"]', "Eigener Hinweis"); await s.click('[data-pj-aktion="speichern"]');
await s.waitForFunction(() => /inzwischen geändert/.test(document.getElementById("pjMeldung").textContent), null, { timeout: 4000 });
ok(db.proj[0].hinweis !== "Eigener Hinweis", "Gleichzeitige Änderung in der App: nichts überschrieben, Liste neu geladen");
// Archivieren, Zuordnung lösen
await s.click('#pjListe li[data-pj="8"]'); await s.click('[data-pj-aktion="archiv"]');
await s.waitForFunction(() => /Archiviert/.test(document.getElementById("pjMeldung").textContent), null, { timeout: 4000 });
ok(db.proj[1].archived === true, "Archivieren: in der App archiviert");
await s.click('#pjListe li[data-pj="7"]'); await s.click('[data-pj-aktion="loesen"]');
ok(await s.evaluate(() => !window.sdcadTest.dok().appProjekt && !document.getElementById("aNr").readOnly), "Zuordnung gelöst: Felder wieder frei, Werte bleiben");
ok(probleme.length === 0, "keine Seitenfehler " + probleme.join(" | "));
await b.close(); srv.close();
console.log(fehler ? `${fehler} Fehler` : "Projekte der App: alle Prüfungen bestanden"); process.exit(fehler ? 1 : 0);
