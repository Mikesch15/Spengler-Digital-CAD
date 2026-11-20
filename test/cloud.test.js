// Tests: Cloud-Client und Abgleich gegen einen Nachbau des Supabase-Servers (kein Netz nötig)
import { CloudClient } from "../kern/cloud/client.js";
import { abgleichen, pruefsumme } from "../kern/cloud/abgleich.js";
import { neueKantenvorlage, neuesMaterialprofil } from "../kern/vorlagen/modelle.js";
let fehler = 0; const ok = (b, t) => { if (!b) { fehler++; console.error("✗", t); } else console.log("✓", t); };

// ---- Nachbau Supabase ----
function server({ darf = true, offline = false } = {}) {
  const zeilen = [], log = []; let tokenOk = true;
  const s = { zeilen, log, darf, offline, firma: "f1" };
  const antwort = (st, d) => ({ ok: st < 300, status: st, text: async () => (d === undefined ? "" : JSON.stringify(d)) });
  s.abruf = async (url, o) => {
    if (s.offline) throw new Error("netz");
    const u = new URL(url), p = u.pathname, q = u.searchParams, m = o.method || "GET", body = o.body ? JSON.parse(o.body) : null; log.push(`${m} ${p}`);
    if (p === "/auth/v1/token") {
      if (q.get("grant_type") === "password") return body.email === "max.muster@nfgryuzkpwjfmdlmevuy.supabase.co" && body.password === "geheim" ? antwort(200, { access_token: "T", refresh_token: "R", expires_in: 3600, user: { id: "u1", email: body.email } }) : antwort(400, { error_description: "Invalid login" });
      return body.refresh_token === "R" ? antwort(200, { access_token: "T2", refresh_token: "R2", expires_in: 3600, user: { id: "u1", email: "x" } }) : antwort(400, {});
    }
    if (p === "/functions/v1/resolve-login-email") return body.username === "anna.test" ? antwort(200, { email: "anna@firma.ch" }) : antwort(404, {});
    if (p === "/rest/v1/profiles") return antwort(200, [{ id: "u1", company_id: s.firma, full_name: "Max Muster" }]);
    if (p === "/rest/v1/companies") return antwort(200, [{ name: "Muster Spenglerei" }]);
    if (p === "/rest/v1/rpc/has_permission") return antwort(200, s.darf);
    if (p === "/rest/v1/cad_daten") {
      if (m === "GET") return antwort(200, zeilen.map((z) => ({ ...z })));
      if (m === "POST") { if (!s.darf) return antwort(403, { message: "RLS" }); if (zeilen.some((z) => z.typ === body.typ && z.record_id === body.record_id)) return antwort(409, { message: "duplicate" }); const z = { ...body }; zeilen.push(z); return antwort(201, [z]); }
      if (m === "PATCH") { if (!s.darf) return antwort(403, { message: "RLS" }); const id = decodeURIComponent(q.get("record_id").slice(3)), v = +q.get("version").slice(3), z = zeilen.find((x) => x.record_id === id && x.typ === q.get("typ").slice(3) && x.version === v); if (!z) return antwort(200, []); Object.assign(z, body); return antwort(200, [z]); }
    }
    return antwort(404, {});
  };
  return s;
}
const speicher = () => { const d = { kantenvorlage: new Map(), detailvorlage: new Map(), materialprofil: new Map() }, pk = []; return { d, pk, stand: {}, lesen: async (t) => [...d[t].values()].map((x) => JSON.parse(JSON.stringify(x))), schreiben: async (t, x) => { d[t].set(x.id, JSON.parse(JSON.stringify(x))); }, papierkorb: async (t, id) => { pk.push(`${t}/${id}`); d[t].delete(id); } }; };
const kunde = (sv) => new CloudClient({ abruf: sv.abruf });

// Anmeldung
let sv = server(), c = kunde(sv);
const se = await c.anmelden("Max.Muster", "geheim");
ok(se.firma === "f1" && se.name === "Max Muster" && se.firmaName === "Muster Spenglerei" && !JSON.stringify(se).includes("geheim"), "Anmeldung «Vorname.Nachname»: Firma/Name, kein Passwort in der Sitzung");
let fe = null; try { await kunde(sv).anmelden("Max.Muster", "falsch"); } catch (e) { fe = e; } ok(fe?.art === "recht" && /falsch/.test(fe.message), "Falsches Passwort → verständliche Meldung");
sv.log.length = 0; try { await kunde(sv).anmelden("anna.test", "x"); } catch {} ok(sv.log.some((l) => l.includes("resolve-login-email")), "Rückfall auf Edge Function bei unbekannter Adresse");
sv.offline = true; fe = null; try { await kunde(sv).anmelden("Max.Muster", "geheim"); } catch (e) { fe = e; } sv.offline = false; ok(fe?.art === "netz", "Offline → Fehlerart «netz»");
const w = kunde(sv); ok((await w.wiederherstellen({ ...se, ablauf: Date.now() - 1 })).zugriff === "T2", "Abgelaufene Sitzung wird mit Refresh-Token erneuert");

// Abgleich
const k1 = neueKantenvorlage("Falz A", { operations: [{ typ: "flansch", winkel: 90, laenge: 25, radius: null }] }), m1 = neuesMaterialprofil("Zink 0.7", 0.7);
let sp = speicher(); sp.d.kantenvorlage.set(k1.id, k1); sp.d.materialprofil.set(m1.id, m1);
let b = await abgleichen(c, sp);
ok(b.hochgeladen === 2 && sv.zeilen.length === 2 && sv.zeilen[0].version === 1 && !b.nur_lokal, "Neue lokale Vorlagen werden hochgeladen (version 1)");
b = await abgleichen(c, sp); ok(b.hochgeladen === 0 && b.geladen === 0 && b.konflikte === 0, "Zweiter Abgleich ohne Änderung: nichts zu tun");
// zweiter PC lädt
let sp2 = speicher(), c2 = kunde(sv); await c2.anmelden("Max.Muster", "geheim");
b = await abgleichen(c2, sp2); ok(b.geladen === 2 && sp2.d.kantenvorlage.get(k1.id).name === "Falz A" && b.neuer.includes("Falz A"), "Zweiter PC lädt beide Vorlagen herunter");
// Änderung lokal → Cloud version 2
const g = sp.d.kantenvorlage.get(k1.id); g.name = "Falz A neu"; await sp.schreiben("kantenvorlage", g);
b = await abgleichen(c, sp); ok(b.hochgeladen === 1 && sv.zeilen.find((z) => z.record_id === k1.id).version === 2, "Geänderte Vorlage: Cloud-Version 2 (optimistische Sperre)");
b = await abgleichen(c2, sp2); ok(b.geladen === 1 && sp2.d.kantenvorlage.get(k1.id).name === "Falz A neu" && sp2.d.kantenvorlage.get(k1.id).version === 2, "Zweiter PC erhält die Änderung");
// Konflikt: beide ändern
const a1 = sp.d.kantenvorlage.get(k1.id); a1.description = "PC1"; await sp.schreiben("kantenvorlage", a1);
const a2 = sp2.d.kantenvorlage.get(k1.id); a2.description = "PC2"; await sp2.schreiben("kantenvorlage", a2);
await abgleichen(c, sp); b = await abgleichen(c2, sp2);
const kf = [...sp2.d.kantenvorlage.values()].find((x) => /Konflikt/.test(x.name));
ok(b.konflikte === 1 && kf && kf.description === "PC2" && sp2.d.kantenvorlage.get(k1.id).description === "PC1", "Konflikt: Cloud-Fassung gilt, lokale bleibt als «… (Konflikt TT.MM.)»");
b = await abgleichen(c2, sp2); ok(sv.zeilen.some((z) => z.record_id === kf.id), "Konfliktkopie wird beim nächsten Abgleich hochgeladen");
// Löschen
sp.d.kantenvorlage.delete(k1.id); b = await abgleichen(c, sp);
ok(sv.zeilen.find((z) => z.record_id === k1.id).geloescht === true && b.geloescht === 1, "Lokal gelöscht → Cloud geloescht=true (nie endgültig)");
b = await abgleichen(c2, sp2); ok(sp2.pk.includes(`kantenvorlage/${k1.id}`) && !sp2.d.kantenvorlage.has(k1.id), "Zweiter PC: Papierkorb statt endgültigem Löschen");
// Ohne Recht
sv = server({ darf: false }); const c3 = kunde(sv); await c3.anmelden("Max.Muster", "geheim"); sv.zeilen.push({ typ: "materialprofil", record_id: "mat-x", daten: { ...neuesMaterialprofil("Fremd", 1), id: "mat-x" }, version: 3, schema_version: 1, geloescht: false });
let sp3 = speicher(); sp3.d.kantenvorlage.set(k1.id, k1);
b = await abgleichen(c3, sp3); ok(b.nur_lokal && b.geladen === 1 && b.hochgeladen === 0 && sv.zeilen.length === 1 && sp3.d.materialprofil.get("mat-x").version === 3, "Ohne Recht «vorlagen edit»: nur herunterladen, nichts hochladen, Bericht «nur lokal»");
// Offline
sv.offline = true; fe = null; try { await abgleichen(c3, sp3); } catch (e) { fe = e; } ok(fe?.art === "netz" && sp3.d.kantenvorlage.size === 1, "Offline: Fehler «netz», lokale Daten unverändert");
// Prüfsumme ignoriert version/modified/_-Felder
const h1 = await pruefsumme({ a: 1, version: 1, modified: "x", _z: 5 }), h2 = await pruefsumme({ version: 9, a: 1, modified: "y" });
ok(h1 === h2 && h1 !== (await pruefsumme({ a: 2 })), "Prüfsumme ignoriert version, modified und «_»-Felder");
if (fehler) { console.error(fehler + " Fehler"); process.exit(1); } else console.log("Cloud: alle Tests bestanden");
