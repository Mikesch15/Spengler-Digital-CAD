// Konto & Cloud: Anmeldung bei der Spengler-Digital-App, Abgleich der Vorlagen, Cloud-Projekte, Übergabe an die App
import { CloudClient } from "../kern/cloud/client.js";
import { abgleichen } from "../kern/cloud/abgleich.js";
import { leererSpiegel, einstInSpiegel, spiegelInEinst, spiegelSpeicher, loescheImSpiegel } from "../kern/cloud/spiegel.js";
import { teilFuerApp, zeilenAusSchenkel } from "../kern/cloud/appformat.js";

const KEY = "sdcad-cloud";
const lies = () => { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; } };
const schreibe = (z) => { try { localStorage.setItem(KEY, JSON.stringify(z)); } catch {} };

export function cloudModul(ctx) {
  const { esc } = ctx, client = new CloudClient(), z = lies(); // z: { sitzung (nur Token), spiegel, letzter }
  z.spiegel ||= leererSpiegel();
  const st = { meldung: "", appProjekte: null, projekte: null, auftraege: null, darf: null, laeuft: false };
  const sichern = () => schreibe({ sitzung: client.sitzungOeffentlich(), spiegel: z.spiegel, letzter: z.letzter });
  const fehlerText = (e) => e?.art === "netz" ? "Keine Verbindung – die Arbeit lokal geht weiter, abgleichen später." : e?.message || String(e);
  const fertig = (m) => { st.meldung = m; ctx.neuZeichnen(); };
  async function start() { if (z.sitzung && !z.sitzung.firma) { z.sitzung = null; sichern(); } // alte, unvollständige Sitzung (ohne Firma) verwerfen: neu anmelden
  if (z.sitzung) { try { await client.wiederherstellen(z.sitzung); sichern(); } catch { /* offline: Sitzung behalten */ client.sitzung = z.sitzung; } } }

  function html() {
    const s = client.sitzung, doc = ctx.getDoc();
    const kopf = `<h4>Konto der Spengler-Digital-App</h4>`;
    const login = s ? `<p>Angemeldet als <b>${esc(s.name || s.email)}</b>${s.firmaName ? ` · ${esc(s.firmaName)}` : ""}.
        ${st.darf === false ? ' <span class="hinweis">Ohne Recht «Vorlagen bearbeiten»: Vorlagen werden nur heruntergeladen, eigene bleiben auf diesem Gerät.</span>' : ""}</p>
      <div class="reihe ohnerand"><button class="knopf" data-cloud="abgleich" ${st.laeuft ? "disabled" : ""}>Jetzt abgleichen</button><button class="knopf" data-cloud="abmelden">Abmelden</button></div>
      <p class="hinweis">Letzter Abgleich: ${z.letzter ? esc(z.letzter) : "noch nie"}. Bausteine und Materialien werden mit der Firma geteilt; der Startbestand bleibt lokal, solange er unverändert ist.</p>`
      : `<p class="hinweis">Mit dem gleichen Namen wie in der App anmelden («Vorname.Nachname» oder E-Mail). Das Passwort wird nicht gespeichert. Ohne Anmeldung arbeitet das CAD wie bisher lokal.</p>
      <div class="reihe"><label>Name<input id="cName" autocomplete="username"></label><label>Passwort<input id="cPass" type="password" autocomplete="current-password"></label>
      <button class="knopf" data-cloud="anmelden" ${st.laeuft ? "disabled" : ""}>Anmelden</button></div>`;
    const proj = !s ? "" : `<h4>Projekte in der Cloud</h4>
      <div class="reihe ohnerand"><button class="knopf" data-cloud="speichern" ${st.laeuft ? "disabled" : ""}>${doc.cloud ? "Projekt in der Cloud aktualisieren" : "Aktuelles Projekt in die Cloud"}</button>
      <button class="knopf" data-cloud="liste">Liste laden</button></div>
      <p class="hinweis">Auftragsnummer: <b>${esc(doc.nr || "–")}</b> (Feld «Nr.» oben). ${doc.cloud ? "Dieses Projekt ist mit der Cloud verbunden." : ""}</p>
      ${st.projekte ? (st.projekte.length ? `<ul class="eigene">${st.projekte.map((p) => `<li>${esc(p.name)} <small class="hinweis">${esc(p.auftrag || "ohne Auftrag")} · ${esc(String(p.geaendert || "").slice(0, 16).replace("T", " "))}</small>
        <button class="knopf klein" data-cloud="oeffnen" data-id="${esc(p.id)}">Öffnen</button></li>`).join("")}</ul>` : '<p class="hinweis">Keine Cloud-Projekte.</p>') : ""}
      <h4>Spengler-Digital-App</h4>
      <p class="hinweis">${doc.appProjekt ? `Verbunden mit dem App-Projekt <b>${esc(doc.appProjekt.name)}</b>.` : "Noch mit keinem App-Projekt verbunden."}</p>
      <div class="reihe ohnerand"><button class="knopf" data-cloud="projekteoeffnen">Projekte der App … (anlegen, bearbeiten, zuordnen)</button></div>
      <div class="reihe ohnerand"><button class="knopf" data-cloud="senden" ${st.laeuft ? "disabled" : ""}>Teile an die App senden</button><button class="knopf" data-cloud="auftraege">Profilaufträge der App holen</button></div>
      <p class="hinweis">Gesendet wird als Auftrag «${esc(doc.nr || "–")}»: Zuschnitt, Material, Stück und Schenkel jedes Blechteils.</p>
      ${st.auftraege ? (st.auftraege.length ? `<ul class="eigene">${st.auftraege.map((a) => `<li>${esc(a.titel || "Profil")} <small class="hinweis">${a.laenge_mm || "?"} mm · ${a.stueck || 1} Stk</small>
        <button class="knopf klein" data-cloud="bauen" data-id="${esc(a.id)}">Als Teil bauen</button></li>`).join("")}</ul>` : '<p class="hinweis">Keine offenen Profilaufträge.</p>') : ""}`;
    return kopf + login + proj + (st.meldung ? `<p class="meldung" role="status">${esc(st.meldung)}</p>` : "");
  }

  async function abgleich() {
    st.laeuft = true; fertig("Gleiche ab …");
    try {
      let e = ctx.getEinst(); einstInSpiegel(e, z.spiegel);
      const b = await abgleichen(client, spiegelSpeicher(z.spiegel, sichern)); st.darf = !b.nur_lokal;
      ctx.setEinst(spiegelInEinst(ctx.getEinst(), z.spiegel)); ctx.einstSpeichern();
      z.letzter = new Date().toLocaleString("de-CH"); sichern(); ctx.projektAktualisieren?.();
      const t = [`${b.geladen} geladen`, `${b.hochgeladen} hochgeladen`, b.geloescht ? `${b.geloescht} gelöscht (Papierkorb)` : "", b.konflikte ? `${b.konflikte} Konflikt(e): lokale Fassung als Kopie behalten` : "", b.nur_lokal ? "nur lokal (kein Recht zum Hochladen)" : "", z.spiegel.uebersprungen?.length ? `zu gross für die Cloud, nur lokal: ${z.spiegel.uebersprungen.join(", ")}` : "", ...b.fehler].filter(Boolean).join(" · ");
      st.laeuft = false; ctx.regen(); fertig("Abgleich fertig: " + t);
    } catch (e) { st.laeuft = false; fertig("Abgleich nicht möglich: " + fehlerText(e)); }
  }
  async function aktion(a, id) {
    const doc = ctx.getDoc();
    try {
      if (a === "anmelden") { const n = document.getElementById("cName")?.value || "", pw = document.getElementById("cPass")?.value || ""; st.laeuft = true; fertig("Melde an …"); await client.anmelden(n, pw); st.darf = await client.darfBearbeiten("vorlagen"); sichern(); st.laeuft = false; return abgleich(); }
      if (a === "abmelden") { client.abmelden(); z.sitzung = null; schreibe({ spiegel: z.spiegel, letzter: z.letzter }); st.projekte = st.auftraege = null; return fertig("Abgemeldet."); }
      if (a === "abgleich") return abgleich();
      if (a === "liste") { st.projekte = await client.projekte(); return fertig(""); }
      if (a === "speichern") {
        st.laeuft = true; const daten = JSON.parse(ctx.projektText()), name = doc.objekt || doc.nr || "Projekt";
        if (doc.cloud) { const r = await client.projektSpeichern(doc.cloud.id, doc.cloud.version, { name, auftrag: doc.nr || null, daten }); st.laeuft = false; if (!r) return fertig("In der Cloud wurde das Projekt inzwischen geändert. Zuerst die Cloud-Fassung öffnen (Liste) – deine Fassung bleibt hier unverändert."); doc.cloud.version = r.version; return fertig("Projekt in der Cloud aktualisiert."); }
        const r = await client.projektAnlegen({ name, auftrag: doc.nr || null, daten }); doc.cloud = { id: r.id, version: r.version }; st.laeuft = false; st.projekte = null; return fertig("Projekt in der Cloud gespeichert.");
      }
      if (a === "oeffnen") { const p = await client.projektLaden(id); const d = p.daten; d.cloud = { id: p.id, version: p.version }; ctx.ladeProjektText(JSON.stringify(d)); return fertig(`«${p.name}» aus der Cloud geöffnet.`); }
      if (a === "senden") {
        if (!doc.nr) return fertig("Zuerst oben die Auftragsnummer (Nr.) eintragen.");
        const teile = ctx.teile().map((t, i) => ({ ...teilFuerApp(t.f, t.res, t.mat, i + 1), projectId: doc.appProjekt?.id ?? null })); if (!teile.length) return fertig("Keine Blechteile zum Senden.");
        st.laeuft = true; await client.teileSenden(doc.nr, teile); st.laeuft = false; return fertig(`${teile.length} Teil(e) an die App gesendet (Auftrag ${doc.nr}).`);
      }
      if (a === "projekteoeffnen") { ctx.projekteOeffnen(); return; }
      if (a === "appprojekte") { st.appProjekte = await client.appProjekte(); return fertig(""); }
      if (a === "appwahl") { const p = st.appProjekte.find((x) => String(x.id) === String(id)); if (!p) return; ctx.setzeAuftrag({ nr: String(p.order_no || p.name).slice(0, 40), objekt: [p.customer, p.object].filter(Boolean).join(", ") || p.name, appProjekt: { id: p.id, name: p.name } }); st.auftraege = null; return fertig(`Projekt «${p.name}» übernommen: Auftragsnummer und Objekt sind gesetzt.`); }
      if (a === "auftraege") { st.auftraege = await client.profilAuftraege(doc.appProjekt?.id ?? null); return fertig(""); }
      if (a === "bauen") {
        const p = st.auftraege.find((x) => x.id === id); if (!p) return;
        ctx.neuesProfil({ name: p.titel || "Profil", zeilen: zeilenAusSchenkel(p.daten?.schenkel || []), laenge: p.laenge_mm, stueck: p.stueck, staerke: p.staerke_mm });
        await client.profilAuftragGebaut(id); st.auftraege = st.auftraege.filter((x) => x.id !== id); return fertig("Profil gebaut und in der App als «gebaut» gemeldet.");
      }
    } catch (e) { st.laeuft = false; fertig("Nicht möglich: " + fehlerText(e)); }
  }
  const loeschungen = (g) => { loescheImSpiegel(z.spiegel, g); sichern(); }; // vom Programm aufgerufen, wenn Bausteine/Materialien/Details bewusst gelöscht wurden
  return { html, aktion, start, loeschungen, get client() { return client; }, get angemeldet() { return client.angemeldet; } };
}
