// Projekte der Spengler-Digital-App: anlegen, bearbeiten, archivieren und dem aktuellen Modell zuordnen.
// Die Daten liegen nur in der App-Datenbank (Tabelle projects) – so sind CAD und App immer synchron.
import { erzeuge } from "../kern/generator/freiesProfil.js";
import { ausAppZeile, status as impStatus } from "../kern/austausch.js";
import { pruefeProjekt, suche, modellFelder, geaendert, STATUS } from "../kern/cloud/projekte.js";

export function projekteModul(ctx) {
  const { esc } = ctx, $ = (id) => document.getElementById(id);
  const st = { liste: [], wahl: null, form: null, archiv: false, suche: "", meldung: "", laeuft: false, geladen: false, mass: null, massFür: null };
  const leer = () => ({ name: "", order_no: "", customer: "", object: "", hinweis: "", status: "offen", archived: false });
  const fehlerText = (e) => e?.art === "netz" ? "Keine Verbindung zur App – bitte später erneut versuchen." : e?.message || String(e);
  const ausgewaehlt = () => (st.wahl && st.wahl !== "neu" ? st.liste.find((p) => String(p.id) === String(st.wahl)) : null);

  function listeHtml() {
    const doc = ctx.getDoc(), l = suche(st.liste, st.suche);
    if (!l.length) return `<p class="hinweis">${st.liste.length ? "Keine Treffer." : "Keine Projekte."}</p>`;
    return `<ul class="pjliste">${l.map((p) => `<li data-pj="${esc(p.id)}" class="${String(p.id) === String(st.wahl) ? "aktiv" : ""}${p.archived ? " archiv" : ""}">
      <b>${esc(p.name)}</b>${doc.appProjekt && String(doc.appProjekt.id) === String(p.id) ? ' <span class="pjmarke">zugeordnet</span>' : ""}${p.archived ? ' <span class="pjmarke grau">archiviert</span>' : ""}
      <small>${esc([p.order_no, p.customer, p.object].filter(Boolean).join(" · "))}</small></li>`).join("")}</ul>`;
  }
  const STUFE = { bereit: ["✔ bereit", "ok"], warnung: ["⚠ Warnung", "warn"], fehler: ["✖ fehlerhaft", "fehler"], ohneGenerator: ["○ noch kein Generator", "grau"] };
  function massHtml() {
    const p = ausgewaehlt(); if (!p) return "";
    if (st.massFür !== String(p.id) || !st.mass) return `<div class="reihe ohnerand"><button class="knopf klein" data-pj-aktion="mass">Massaufnahmen aus der App laden</button></div>`;
    const doc = ctx.getDoc(), da = new Set((doc.massaufnahmen || []).map((u) => u.quelle.id));
    if (!st.mass.length) return '<p class="hinweis">Dieses Projekt hat keine Massaufnahmen.</p>';
    return `<h4>Massaufnahmen aus der App</h4><ul class="pjliste">${st.mass.map((u) => { const s = impStatus(u), [t] = STUFE[s.stufe];
      return `<li><b>${esc(u.titel || u.art)}</b> <span class="pjmarke">${t}</span>${da.has(u.quelle.id) ? ' <span class="pjmarke">im Modell</span>' : ""}
        <small>${esc(u.art)} · ID ${esc(u.quelle.id)}${s.cad ? ` · ${s.cad.schenkel.length} Schenkel, ${s.cad.dicke_mm ?? "?"} mm` : ""}</small>
        ${[...s.fehler, ...s.warnungen].map((x) => `<small>${esc(x)}</small>`).join("")}
        ${s.cad ? `<button class="knopf klein haupt" data-pj-aktion="bauteil" data-mid="${esc(u.quelle.id)}">Bauteil erzeugen</button>` : ""}
        ${s.ok ? `<button class="knopf klein" data-pj-aktion="uebernehmen" data-mid="${esc(u.quelle.id)}">${da.has(u.quelle.id) ? "Aktualisieren" : "Ins Modell übernehmen"}</button>` : ""}</li>`; }).join("")}</ul>`;
  }
  function formHtml() {
    const f = st.form, doc = ctx.getDoc(), neu = st.wahl === "neu", p = ausgewaehlt();
    if (!f) return '<p class="hinweis">Ein Projekt links wählen oder «Neues Projekt» antippen.</p>';
    const zugeordnet = p && doc.appProjekt && String(doc.appProjekt.id) === String(p.id);
    const feld = (k, l, typ = "text") => `<label class="feld"><span>${l}</span><input data-pf="${k}" type="${typ}" value="${esc(f[k] ?? "")}"></label>`;
    return `<h4>${neu ? "Neues Projekt" : "Projekt bearbeiten"}</h4>
      ${feld("name", "Projektname *")}${feld("order_no", "Auftrags-Nr. *")}${feld("customer", "Auftraggeber")}${feld("object", "Adresse *")}
      <label class="feld"><span>Hinweis</span><textarea data-pf="hinweis" rows="2">${esc(f.hinweis ?? "")}</textarea></label>
      ${neu ? "" : massHtml()}
      ${neu ? "" : `<label class="feld"><span>Status</span><select data-pf="status">${STATUS.map(([v, t]) => `<option value="${v}" ${f.status === v ? "selected" : ""}>${t}</option>`).join("")}</select></label>`}
      <div class="reihe"><button class="knopf haupt" data-pj-aktion="speichern" ${st.laeuft ? "disabled" : ""}>${neu ? "Projekt anlegen" : "Änderungen speichern"}</button>
        ${neu ? "" : `<button class="knopf" data-pj-aktion="${zugeordnet ? "loesen" : "zuordnen"}">${zugeordnet ? "Zuordnung lösen" : "Diesem Modell zuordnen"}</button><button class="knopf" data-pj-aktion="archiv">${p?.archived ? "Wieder öffnen" : "Archivieren"}</button>`}</div>
      ${neu ? '<p class="hinweis">Das Projekt wird sofort in der App angelegt und erscheint dort in der Projektliste.</p>' : '<p class="hinweis">Änderungen gelten sofort auch in der App. Wird das Projekt zugeordnet, übernimmt das Modell Auftragsnummer und Objekt.</p>'}`;
  }
  function html() {
    if (!ctx.angemeldet()) return '<p>Für die Projekte der App ist die Anmeldung nötig.</p><div class="reihe ohnerand"><button class="knopf haupt" data-pj-aktion="anmelden">Zum Konto …</button></div>';
    const doc = ctx.getDoc();
    return `<p class="hinweis">${doc.appProjekt ? `Dieses Modell gehört zum Projekt <b>${esc(doc.appProjekt.name)}</b> (Auftrag ${esc(doc.nr)}).` : "Dieses Modell ist noch keinem Projekt zugeordnet."}</p>
      <div class="pjgitter"><div><div class="reihe ohnerand"><input id="pjSuche" type="search" placeholder="Suchen: Name, Auftrags-Nr., Kunde, Adresse" value="${esc(st.suche)}" aria-label="Suchen">
        <button class="knopf haupt" data-pj-aktion="neu">+ Neues Projekt</button></div>
        <label class="janein"><input type="checkbox" id="pjArchiv" ${st.archiv ? "checked" : ""}> auch archivierte zeigen</label>
        <div id="pjListe">${st.geladen ? listeHtml() : '<p class="hinweis">Lade Projekte …</p>'}</div>
        <div class="reihe ohnerand"><button class="knopf klein" data-pj-aktion="laden">Liste aktualisieren</button></div></div>
      <div id="pjForm">${formHtml()}</div></div>`;
  }
  const zeichne = () => { $("pjInhalt").innerHTML = html(); $("pjMeldung").textContent = st.meldung; };
  async function laden() { try { st.liste = await ctx.client().appProjekte({ archiviert: st.archiv }); st.geladen = true; st.meldung = ""; } catch (e) { st.meldung = fehlerText(e); st.geladen = true; } zeichne(); }
  async function oeffnen() { $("projekte").hidden = false; st.geladen = false; st.meldung = ""; zeichne(); if (ctx.angemeldet()) { await laden(); await aktualisiere(); } }
  const zu = () => { $("projekte").hidden = true; };

  async function speichern() {
    const f = st.form, neu = st.wahl === "neu", p = ausgewaehlt(), fehler = pruefeProjekt(f, st.liste, neu ? null : st.wahl);
    if (fehler.length) { st.meldung = fehler.join(" "); return zeichne(); }
    st.laeuft = true; st.meldung = "Speichere …"; zeichne();
    try {
      let r;
      if (neu) r = await ctx.client().appProjektNeu(f);
      else { r = await ctx.client().appProjektAendern(p.id, p.updated_at, f); if (!r) { st.laeuft = false; await laden(); st.meldung = "Das Projekt wurde in der App inzwischen geändert. Die Liste ist neu geladen – bitte nochmals bearbeiten."; st.wahl = null; st.form = null; return zeichne(); } }
      st.laeuft = false; await laden(); st.wahl = r.id; st.form = { ...(st.liste.find((x) => String(x.id) === String(r.id)) || r) };
      const doc = ctx.getDoc(); if (doc.appProjekt && String(doc.appProjekt.id) === String(r.id)) ctx.setzeAuftrag(modellFelder(r)); // zugeordnetes Modell zieht nach
      st.meldung = neu ? "Projekt in der App angelegt." : "Gespeichert – auch in der App."; zeichne();
    } catch (e) { st.laeuft = false; st.meldung = fehlerText(e); zeichne(); }
  }
  async function archivieren() {
    const p = ausgewaehlt(); if (!p) return; st.laeuft = true;
    try { const r = await ctx.client().appProjektAendern(p.id, p.updated_at, { ...p, archived: !p.archived }); st.laeuft = false; const text = !r ? "Das Projekt wurde in der App inzwischen geändert – Liste neu geladen." : r.archived ? "Archiviert." : "Wieder geöffnet."; await laden(); st.meldung = text; const q = st.liste.find((x) => String(x.id) === String(p.id)); if (q) st.form = { ...q }; else { st.wahl = null; st.form = null; } zeichne(); }
    catch (e) { st.laeuft = false; st.meldung = fehlerText(e); zeichne(); }
  }
  // Zugeordnetes Projekt mit der App abgleichen (Name, Auftrags-Nr., Auftraggeber, Adresse)
  async function aktualisiere() {
    const doc = ctx.getDoc(); if (!doc.appProjekt || !ctx.angemeldet()) return false;
    try { const p = await ctx.client().appProjekt(doc.appProjekt.id); if (!p) { ctx.status(`Das Projekt «${doc.appProjekt.name}» gibt es in der App nicht mehr.`); return false; }
      if (geaendert(doc, p)) { ctx.setzeAuftrag(modellFelder(p)); ctx.status(`Projektdaten aus der App aktualisiert: ${p.name}.`); zeichne(); return true; } } catch { /* offline: Stand bleibt */ }
    return false;
  }

  function binden() {
    $("projekte").addEventListener("click", async (e) => {
      const li = e.target.closest("li[data-pj]");
      if (li) { st.wahl = li.dataset.pj; st.mass = null; st.form = { ...ausgewaehlt() }; st.meldung = ""; return zeichne(); }
      const a = e.target.closest("[data-pj-aktion]")?.dataset.pjAktion; if (!a) return;
      if (a === "neu") { st.wahl = "neu"; st.form = leer(); st.meldung = ""; return zeichne(); }
      if (a === "laden") { st.geladen = false; zeichne(); return laden(); }
      if (a === "speichern") return speichern();
      if (a === "archiv") return archivieren();
      if (a === "mass") { const p = ausgewaehlt(); if (!p) return; try { st.mass = (await ctx.client().appMassaufnahmen(p.id)).map((z) => ausAppZeile(z, p)); st.massFür = String(p.id); st.meldung = ""; } catch (x) { st.meldung = fehlerText(x); } return zeichne(); }
      if (a === "bauteil") { const u = st.mass?.find((x) => String(x.quelle.id) === e.target.dataset.mid); if (!u) return; const r = erzeuge(u); if (!r.ok) { st.meldung = r.fehler.join(" "); return zeichne(); }
        const d = ctx.getDoc(); d.massaufnahmen = [...(d.massaufnahmen || []).filter((x) => x.quelle.id !== u.quelle.id), u];
        r.teile.forEach((t) => ctx.neuesProfil(t)); zu(); ctx.status(`${r.teile.length} Bauteil(e) aus Massaufnahme «${u.titel || u.art}» erzeugt.` + (r.warnungen.length ? " Hinweis: " + r.warnungen.join(" ") : "")); return; }
      if (a === "uebernehmen") { const u = st.mass?.find((x) => String(x.quelle.id) === e.target.dataset.mid); if (!u || !impStatus(u).ok) return; const d = ctx.getDoc(); d.massaufnahmen = [...(d.massaufnahmen || []).filter((x) => x.quelle.id !== u.quelle.id), u]; ctx.speichern?.(); st.meldung = `Massaufnahme «${u.titel || u.art}» ins Modell übernommen (Originalwerte unverändert gesichert).`; return zeichne(); }
      if (a === "zuordnen") { const p = ausgewaehlt(); if (!p) return; ctx.setzeAuftrag(modellFelder(p)); st.meldung = `Modell dem Projekt «${p.name}» zugeordnet: Auftragsnummer und Objekt sind übernommen.`; return zeichne(); }
      if (a === "loesen") { const d = ctx.getDoc(); ctx.setzeAuftrag({ nr: d.nr, objekt: d.objekt, appProjekt: null }); st.meldung = "Zuordnung gelöst."; return zeichne(); }
      if (a === "anmelden") { zu(); ctx.zumKonto(); }
    });
    $("projekte").addEventListener("input", (e) => {
      const t = e.target;
      if (t.dataset.pf) { st.form[t.dataset.pf] = t.value; return; }
      if (t.id === "pjSuche") { st.suche = t.value; $("pjListe").innerHTML = listeHtml(); }
    });
    $("projekte").addEventListener("change", async (e) => { if (e.target.id === "pjArchiv") { st.archiv = e.target.checked; st.geladen = false; zeichne(); await laden(); } if (e.target.dataset.pf === "status") st.form.status = e.target.value; });
    $("pjZu").onclick = zu;
  }
  return { oeffnen, aktualisiere, binden };
}
