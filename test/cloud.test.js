// Tests: Cloud-Client und Abgleich gegen einen Nachbau des Supabase-Servers (kein Netz nötig)
import { CloudClient } from "../kern/cloud/client.js";
import { abgleichen, pruefsumme } from "../kern/cloud/abgleich.js";
import { loescheImSpiegel, leererSpiegel, einstInSpiegel, spiegelInEinst, spiegelSpeicher } from "../kern/cloud/spiegel.js";
import { BAUSTEINE_STANDARD } from "../kern/flaechenblech.js";
import { MATERIALIEN } from "../kern/materialien.js";
import { zeilenAusSchenkel, schenkelAusZeilen, teilFuerApp } from "../kern/cloud/appformat.js";
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
    if (p === "/rest/v1/profiles") { if (q.get("select").includes("full_name")) return antwort(400, { message: "column profiles.full_name does not exist" }); return antwort(200, [{ id: "u1", company_id: s.firma, first_name: "Max", last_name: "Muster" }]); }
    if (p === "/rest/v1/companies") return antwort(200, [{ name: "Muster Spenglerei" }]);
    if (p === "/rest/v1/rpc/has_permission") return antwort(200, s.darf);
    if (p === "/rest/v1/cad_daten") {
      if (m === "GET") return antwort(200, zeilen.map((z) => ({ ...z })));
      if (m === "POST") { if (!s.darf) return antwort(403, { message: "RLS" }); if (zeilen.some((z) => z.typ === body.typ && z.record_id === body.record_id)) return antwort(409, { message: "duplicate" }); const z = { ...body }; zeilen.push(z); return antwort(201, [z]); }
      if (m === "PATCH") { if (!s.darf) return antwort(403, { message: "RLS" }); const id = decodeURIComponent(q.get("record_id").slice(3)), v = +q.get("version").slice(3), z = zeilen.find((x) => x.record_id === id && x.typ === q.get("typ").slice(3) && x.version === v); if (!z) return antwort(200, []); Object.assign(z, body); return antwort(200, [z]); }
    }
    if (p === "/rest/v1/cad_projekte") {
      s.proj = s.proj || [];
      if (m === "GET") { let r = s.proj.filter((x) => !x.geloescht); const id = q.get("id"); if (id) r = s.proj.filter((x) => x.id === id.slice(3)); const au = q.get("auftrag"); if (au) r = r.filter((x) => x.auftrag === decodeURIComponent(au.slice(3))); return antwort(200, r.map((x) => ({ ...x }))); }
      if (!s.darf) return antwort(403, {});
      if (m === "POST") { const z = { id: "p" + (s.proj.length + 1), ...body, besitzer: "u1" }; s.proj.push(z); return antwort(201, [z]); }
      if (m === "PATCH") { const z = s.proj.find((x) => x.id === q.get("id").slice(3) && x.version === +q.get("version").slice(3)); if (!z) return antwort(200, []); Object.assign(z, body); return antwort(200, [z]); }
    }
    if (p === "/rest/v1/cad_teile" && m === "POST") { s.teile = (s.teile || []).concat(body); return antwort(201, body); }
    if (p === "/rest/v1/cad_profil_auftraege") {
      s.pa = s.pa || [{ id: "a1", status: "offen", titel: "Ortbrett", laenge_mm: 3000, stueck: 2, project_id: "pr1", daten: { schenkel: [] } }];
      if (m === "GET") return antwort(200, s.pa.filter((x) => x.status === "offen"));
      const z = s.pa.find((x) => x.id === q.get("id").slice(3) && x.status === "offen"); if (!z) return antwort(200, []); Object.assign(z, body); return antwort(200, [z]);
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
{ const s0 = server(); s0.firma = null; let w = null; const c0 = kunde(s0); try { await c0.anmelden("Max.Muster", "geheim"); } catch (e) { w = e; }
  ok(w?.art === "recht" && !c0.angemeldet, "Konto ohne Firma: klare Meldung und kein halber Anmeldezustand"); }
// Cloud-Projekte
sv = server(); const cp = kunde(sv); await cp.anmelden("Max.Muster", "geheim");
const p1 = await cp.projektAnlegen({ name: "Dach Müller", auftrag: "2026-114", daten: { teile: [1, 2] } });
ok(p1.version === 1 && (await cp.projekte()).length === 1 && (await cp.projekte({ auftrag: "2026-114" })).length === 1 && (await cp.projekte({ auftrag: "x" })).length === 0, "Cloud-Projekt anlegen, nach Auftragsnummer filtern");
ok((await cp.projektLaden(p1.id)).daten.teile.length === 2, "Cloud-Projekt laden");
const s2 = await cp.projektSpeichern(p1.id, 1, { name: "Dach Müller", auftrag: "2026-114", daten: { teile: [1, 2, 3] } });
ok(s2.version === 2, "Speichern erhöht die Version");
ok((await cp.projektSpeichern(p1.id, 1, { name: "x", auftrag: null, daten: {} })) === null, "Veraltete Version → null (Konflikt erkannt, nichts überschrieben)");
ok((await cp.projektLaden(p1.id)).daten.teile.length === 3, "Konfliktversuch hat die Cloud-Fassung nicht verändert");
await cp.projektSpeichern(p1.id, 2, { name: "Dach Müller", auftrag: "2026-114", daten: {}, geloescht: true }); ok((await cp.projekte()).length === 0, "Löschen = geloescht (verschwindet aus der Liste)");
// App-Verbindung
const tr = await cp.teileSenden("2026-114", [{ name: "Ortbrett", material: "Zink 0.7", staerke: 0.7, breite: 333, laenge: 3000, stueck: 2, vorlage: "Freies Profil", appData: { schenkel: [] } }]);
ok(sv.teile.length === 1 && sv.teile[0].auftrag === "2026-114" && sv.teile[0].zuschnitt_breite_mm === 333 && !("company_id" in sv.teile[0]) && sv.teile[0].teil_nr === 1 && sv.teile[0].dokument === "" && sv.teile[0].addin_version === "Spengler Digital CAD" && sv.teile[0].operationen.length === 0, "Teile an die App senden (cad_teile: Auftrag, Zuschnitt, Stück)");
const pau = await cp.profilAuftraege(); ok(pau.length === 1 && pau[0].titel === "Ortbrett", "Offene Profilaufträge der App lesen");
ok((await cp.profilAuftragGebaut("a1")).status === "gebaut" && (await cp.profilAuftraege()).length === 0 && (await cp.profilAuftragGebaut("a1")) === null, "Profilauftrag als «gebaut» melden (nur einmal)");
// Spiegel ⇄ Einstellungen
{
  const sv4 = server(), cA = kunde(sv4), cB = kunde(sv4); await cA.anmelden("Max.Muster", "geheim"); await cB.anmelden("Max.Muster", "geheim");
  const einstA = { bausteine: BAUSTEINE_STANDARD.map((b) => ({ ...b })), materialien: MATERIALIEN.map((m) => ({ ...m })) };
  const spA = leererSpiegel(); einstInSpiegel(einstA, spA);
  ok(Object.keys(spA.kantenvorlage).length === 0 && Object.keys(spA.materialprofil).length === 0, "Unveränderter Startbestand wird nicht in die Firmenbibliothek hochgeladen");
  einstA.bausteine.push({ id: "eigen-1", name: "Wandanschluss 40", gruppe: "Eigene", folge: "90 40 135 15", versatz: 0 }); einstA.materialien.push({ id: "mx", name: "Kupfer 0.6", t: 0.6, ri: 1, k: 0.4, dichte: 8.9 });
  einstA.bausteine.find((b) => b.id === BAUSTEINE_STANDARD[0].id).folge = "90 30";
  einstInSpiegel(einstA, spA); const bA = await abgleichen(cA, spiegelSpeicher(spA));
  ok(bA.hochgeladen === 3 && sv4.zeilen.length === 3, "Neuer + geänderter Baustein und neues Material werden hochgeladen (3)");
  const einstB = { bausteine: BAUSTEINE_STANDARD.map((b) => ({ ...b })), materialien: MATERIALIEN.map((m) => ({ ...m })) }, spB = leererSpiegel();
  await abgleichen(cB, spiegelSpeicher(spB)); const eB = spiegelInEinst(einstB, spB);
  ok(eB.bausteine.some((b) => b.id === "eigen-1" && b.folge === "90 40 135 15") && eB.bausteine.find((b) => b.id === BAUSTEINE_STANDARD[0].id).folge === "90 30" && eB.materialien.some((m) => m.name === "Kupfer 0.6" && m.t === 0.6) && eB.bausteine.length === BAUSTEINE_STANDARD.length + 1, "Zweiter PC: Firmenvorlagen erscheinen als Bausteine/Materialien, Standard bleibt");
  einstInSpiegel(eB, spB); ok(Object.keys(spB.kantenvorlage).length === 2, "Rücklauf erzeugt keine Doppelten");
  // Löschen auf PC A → verschwindet auf PC B
  einstA.bausteine = einstA.bausteine.filter((b) => b.id !== "eigen-1"); delete spA.kantenvorlage[Object.values(spA.kantenvorlage).find((v) => v.metadata.appId === "eigen-1").id];
  await abgleichen(cA, spiegelSpeicher(spA)); await abgleichen(cB, spiegelSpeicher(spB)); const eB2 = spiegelInEinst(eB, spB);
  ok(!eB2.bausteine.some((b) => b.id === "eigen-1"), "Auf PC A gelöschter Baustein verschwindet auf PC B");
}
// Schenkelformat der App
{
  const sch = [{ laenge: 168, winkel: 0 }, { laenge: 25, winkel: 90 }, { laenge: 7, winkel: 180 }], z = zeilenAusSchenkel(sch);
  ok(JSON.stringify(z) === JSON.stringify([{ L: 168, winkel: 90, art: "abkanten" }, { L: 25, winkel: 180, art: "umschlag" }, { L: 7, winkel: 0, art: "abkanten" }]), "App-Schenkel → Zeilen des Freien Profils (Winkel nach dem Schenkel, 180 = Umschlag)");
  ok(JSON.stringify(schenkelAusZeilen(z)) === JSON.stringify(sch), "Zeilen → Schenkel: Hin und zurück identisch");
  const tt = teilFuerApp({ name: "Ortbrett", zeilen: z, laenge: 3000, stueck: 2 }, { zuschnitt: 200.456 }, { name: "Alu", t: 0.8 }, 1);
  ok(tt.breite === 200.46 && tt.appData.schenkel.length === 3 && tt.appData.cad.material_name === "Alu" && tt.stueck === 2, "Teil für die App: Zuschnitt, Schenkel, Material");
}
// 3D-Detailvorlagen und Löschung aus der App
{
  const { detailAusStep } = await import("../kern/vorlagen/detail3d.js");
  const sv5 = server(), cA = kunde(sv5), cB = kunde(sv5); await cA.anmelden("Max.Muster", "geheim"); await cB.anmelden("Max.Muster", "geheim");
  const dv = detailAusStep("Kehle 40", "ISO-10303-21;", Float32Array.from([0, 0, 0, 40, 0, 0, 0, 5, 0]), "k.step"), gross = { ...detailAusStep("Riese", "x".repeat(1.6e6), Float32Array.from([0, 0, 0, 1, 0, 0, 0, 1, 0])) };
  const einstA = { bausteine: [], materialien: [{ id: "m1", name: "X", t: 1, ri: 1, k: 0.4 }], detailvorlagen: [dv, gross] }, spA = leererSpiegel(); einstInSpiegel(einstA, spA);
  ok(Object.keys(spA.detailvorlage).length === 1 && spA.uebersprungen.includes("Riese"), "Detailvorlage geht in den Spiegel, über 1.5 MB bleibt lokal (gemeldet)");
  const bA = await abgleichen(cA, spiegelSpeicher(spA)); ok(bA.hochgeladen === 2 && sv5.zeilen.some((z) => z.typ === "detailvorlage" && z.daten.name === "Kehle 40"), "Detailvorlage wird als «detailvorlage» in cad_daten abgelegt");
  const spB = leererSpiegel(); await abgleichen(cB, spiegelSpeicher(spB)); const eB = spiegelInEinst({ bausteine: [], materialien: [], detailvorlagen: [] }, spB);
  ok(eB.detailvorlagen.length === 1 && eB.detailvorlagen[0].source.step === "ISO-10303-21;", "Zweiter PC erhält die 3D-Detailvorlage samt STEP-Text");
  // Löschen in der App: nur der Aufruf von loescheImSpiegel nötig
  loescheImSpiegel(spA, { baustein: [], material: [], detail: [{ id: dv.id }] }); const bA2 = await abgleichen(cA, spiegelSpeicher(spA));
  ok(bA2.geloescht === 1 && sv5.zeilen.find((z) => z.record_id === dv.id).geloescht === true, "Gelöschte Detailvorlage geht als «geloescht» an die Cloud");
  await abgleichen(cB, spiegelSpeicher(spB)); ok(spiegelInEinst(eB, spB).detailvorlagen.length === 0, "… und verschwindet auf dem zweiten PC");
  // Baustein/Material aus der App löschen
  const e1 = { bausteine: [{ id: "eigen-9", name: "Eigener", gruppe: "X", folge: "90 20", versatz: 0 }], materialien: [{ id: "mz", name: "Mat", t: 0.5, ri: 1, k: 0.4 }], detailvorlagen: [] }, sp1 = leererSpiegel(), sv6 = server(), c6 = kunde(sv6); await c6.anmelden("Max.Muster", "geheim");
  einstInSpiegel(e1, sp1); await abgleichen(c6, spiegelSpeicher(sp1)); ok(sv6.zeilen.length === 2, "Eigener Baustein und Material hochgeladen");
  loescheImSpiegel(sp1, { baustein: [e1.bausteine[0]], material: [e1.materialien[0]], detail: [] }); const b6 = await abgleichen(c6, spiegelSpeicher(sp1));
  ok(b6.geloescht === 2 && sv6.zeilen.every((z) => z.geloescht), "Lokal gelöschter Baustein und Material werden in der Cloud als gelöscht markiert (nicht mehr zurückgeholt)");
}
{ let w = null; try { await cp.teileSenden("", [{ name: "x" }]); } catch (e) { w = e; } ok(w?.message.includes("Auftragsnummer"), "Senden ohne Auftragsnummer wird verständlich abgelehnt");
  await cp.teileSenden("X".repeat(60), [{ name: "y" }]); ok(sv.teile.at(-1).auftrag.length === 40 && sv.teile.at(-1).material_name === "" && sv.teile.at(-1).vorlage_name === "", "Überlange Auftragsnummer wird gekürzt, Textspalten nie null (NOT NULL in der Tabelle)"); }
// Prüfsumme ignoriert version/modified/_-Felder
const h1 = await pruefsumme({ a: 1, version: 1, modified: "x", _z: 5 }), h2 = await pruefsumme({ version: 9, a: 1, modified: "y" });
ok(h1 === h2 && h1 !== (await pruefsumme({ a: 2 })), "Prüfsumme ignoriert version, modified und «_»-Felder");
if (fehler) { console.error(fehler + " Fehler"); process.exit(1); } else console.log("Cloud: alle Tests bestanden");
