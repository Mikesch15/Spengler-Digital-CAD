// Cloud-Ablage wie in Fusion: Modelle, Exporte und Pläne liegen in der Cloud unter Projekte / <Jahr> / <Projekt> / { Modelle, Exporte, Pläne }.
// Die Projektordner werden automatisch angelegt, sobald dem Modell ein Projekt zugeordnet wird (nur wenn es sie noch nicht gibt).
import { zuordnung, baum, modellDateiName, dateiName } from "../kern/cloud/ablage.js";

const KEY = "sdcad-ablage";
const lies = () => { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; } };
const schreibe = (z) => { try { localStorage.setItem(KEY, JSON.stringify(z)); } catch {} };
const MIME = { dxf: "application/dxf", svg: "image/svg+xml", step: "application/step", stp: "application/step", stl: "model/stl", json: "application/json", sdcad: "application/json", csv: "text/csv" };

export function ablageModul(ctx) {
  const { esc } = ctx, $ = (id) => document.getElementById(id), z = lies();
  z.auto = z.auto !== false; // Standard: Speichern und Exportieren legt auch eine Kopie in der Cloud ab (wenn angemeldet und Projekt zugeordnet)
  const st = { ordner: [], dateien: [], meldung: "", laeuft: false, offen: new Set() };
  const client = () => ctx.client();
  const bereit = () => ctx.angemeldet() && !!ctx.getDoc().appProjekt;
  const fehlerText = (e) => e?.art === "netz" ? "Keine Verbindung – die Cloud-Ablage ist später wieder erreichbar." : /cad_ordner|cad_dateien|relation|schema cache/i.test(e?.message || "") ? "Die Tabellen der Cloud-Ablage fehlen noch – einmal docs/cad/cad_ablage.sql in Supabase ausführen." : e?.message || String(e);
  const meldung = (m) => { st.meldung = m; ctx.status(m); if (!$("ablage").hidden) zeige(); };

  // Zuordnung eines Projekts: Ordner Projekte/<Jahr>/<Projekt>/{Modelle,Exporte,Pläne} anlegen, falls es sie noch nicht gibt
  async function sicherstellen(still = false) {
    const doc = ctx.getDoc(); if (!bereit()) return null;
    try {
      const ordner = await client().ordnerListe(), p = zuordnung(ordner, { projectId: doc.appProjekt.id, auftrag: doc.nr, name: doc.appProjekt.name });
      if (p.neu.length) await client().ordnerAnlegen(p.neu, p.projekt, doc.appProjekt.id);
      doc.ablage = { projekt: p.projekt }; st.ordner = ordner.concat(p.neu.map((pfad) => ({ pfad })));
      if (!still) meldung(p.neu.length ? `Cloud-Ordner angelegt: ${p.projekt} (${p.neu.length} neu).` : `Cloud-Ordner «${p.projekt}» gibt es schon.`);
      return p;
    } catch (e) { meldung("Cloud-Ordner nicht möglich: " + fehlerText(e)); return null; }
  }
  async function speichern(art, name, inhalt, { mime = null, kodierung = "text", still = false } = {}) {
    const doc = ctx.getDoc(); if (!bereit()) return null;
    let p = doc.ablage?.projekt ? zuordnung(st.ordner, { projectId: doc.appProjekt.id, auftrag: doc.nr, name: doc.appProjekt.name }) : null;
    if (!p || !doc.ablage?.projekt) p = await sicherstellen(true); if (!p) return null;
    const ordner = art === "modell" ? p.modelle : art === "plan" ? p.plaene : p.exporte;
    try {
      const r = await client().dateiSpeichern({ ordner, name: dateiName(name).replace(/\.\.+/g, "."), art, mime, inhalt, kodierung });
      if (!r) { meldung(`«${name}» wurde in der Cloud inzwischen von jemand anderem geändert – bitte erneut speichern.`); return null; }
      meldung(`In der Cloud gespeichert: ${ordner.split("/").slice(2).join(" › ")} › ${name} (Version ${r.version}).`); return r;
    } catch (e) { if (!still) meldung("Cloud-Speichern nicht möglich: " + fehlerText(e)); else ctx.status("Cloud: " + fehlerText(e)); return null; }
  }
  const modellSpeichern = (still = false) => speichern("modell", modellDateiName(ctx.getDoc()), ctx.projektText(), { mime: MIME.sdcad, still });
  // Kopie einer exportierten oder gedruckten Datei (DXF, STEP, STL, SVG …) automatisch in «Exporte» bzw. «Pläne» ablegen
  function kopie(name, inhalt, art = "export") {
    if (!z.auto || !bereit() || typeof inhalt !== "string") return; const e = String(name).split(".").pop().toLowerCase();
    speichern(art, name, inhalt, { mime: MIME[e] || "text/plain", still: true });
  }
  // Modell nach dem lokalen Speichern auch in der Cloud ablegen
  function nachSpeichern() { if (z.auto && bereit()) modellSpeichern(true); }

  async function laden() {
    if (!ctx.angemeldet()) return meldung("Zuerst anmelden (Einstellungen › Konto & Cloud).");
    st.laeuft = true; zeige();
    try { const [o, d] = await Promise.all([client().ordnerListe(), client().dateiListe()]); st.ordner = o; st.dateien = d; st.laeuft = false; st.meldung = ""; if (!st.offen.size) { const pr = ctx.getDoc().ablage?.projekt; (pr ? [pr, pr.split("/").slice(0, 2).join("/"), "Projekte"] : ["Projekte"]).forEach((p) => st.offen.add(p)); } zeige(); }
    catch (e) { st.laeuft = false; meldung(fehlerText(e)); }
  }
  function zeige() {
    const doc = ctx.getDoc();
    const kopf = `<p class="hinweis">${ctx.angemeldet() ? "" : "Nicht angemeldet. "}Modelle, Exporte und Pläne liegen in der Cloud: <b>Projekte › Jahr › Projekt › Modelle · Exporte · Pläne</b>. Die Ordner entstehen automatisch, wenn dem Modell ein Projekt zugeordnet wird.</p>
      <div class="reihe ohnerand"><button class="knopf" data-ab="aktualisieren" ${st.laeuft ? "disabled" : ""}>Aktualisieren</button>
      <button class="knopf haupt" data-ab="modell" ${bereit() && !st.laeuft ? "" : "disabled"} title="${bereit() ? "" : "Erst anmelden und ein App-Projekt zuordnen (Datei › Projekte)"}">Modell in die Cloud speichern</button>
      <label class="auto"><input type="checkbox" data-ab="auto" ${z.auto ? "checked" : ""}> Beim Speichern und Exportieren automatisch in die Cloud</label></div>
      <p class="hinweis">Aktuelles Projekt: <b>${doc.appProjekt ? esc(doc.appProjekt.name) : "keines zugeordnet"}</b>${doc.ablage?.projekt ? ` · Ordner <b>${esc(doc.ablage.projekt)}</b>` : ""}</p>`;
    const b = baum(st.ordner, st.dateien), sichtbar = (o) => { const teile = o.pfad.split("/"); return teile.slice(0, -1).every((_, i) => st.offen.has(teile.slice(0, i + 1).join("/"))); };
    const zeilen = b.filter(sichtbar).map((o) => {
      const hatKinder = b.some((x) => x.pfad.startsWith(o.pfad + "/")), offen = st.offen.has(o.pfad);
      const dat = o.dateien.map((d) => `<li class="abdatei" style="padding-left:${(o.tiefe + 1) * 16 + 6}px"><span>${d.art === "modell" ? "◧" : d.art === "plan" ? "▤" : "⬇"} ${esc(d.name)} <small class="hinweis">v${d.version} · ${Math.max(1, Math.round((d.groesse || 0) / 1024))} kB · ${esc(String(d.geaendert || "").slice(0, 16).replace("T", " "))}</small></span>
        <span>${d.art === "modell" ? `<button class="knopf klein" data-ab="oeffnen" data-id="${esc(d.id)}">Öffnen</button>` : ""}<button class="knopf klein" data-ab="laden" data-id="${esc(d.id)}">Herunterladen</button><button class="knopf klein weg" data-ab="weg" data-id="${esc(d.id)}" aria-label="Löschen">✕</button></span></li>`).join("");
      return `<li class="abordner" style="padding-left:${o.tiefe * 16}px"><button class="abknopf" data-ab="auf" data-pfad="${esc(o.pfad)}">${hatKinder || o.dateien.length ? (offen ? "▾" : "▸") : "·"} 📁 ${esc(o.name)}</button></li>${offen ? dat : ""}`;
    }).join("");
    $("abInhalt").innerHTML = kopf + (st.laeuft ? '<p class="hinweis">Lade …</p>' : zeilen ? `<ul class="abbaum">${zeilen}</ul>` : '<p class="hinweis">Noch keine Ordner. Ein Projekt zuordnen (Datei › Projekte) legt sie an.</p>');
    $("abMeldung").textContent = st.meldung;
  }
  const binaer = (d) => d.kodierung === "base64" ? Uint8Array.from(atob(d.inhalt), (c) => c.charCodeAt(0)) : d.inhalt;
  function binden() {
    $("abZu").onclick = () => { $("ablage").hidden = true; };
    $("ablage").addEventListener("click", async (e) => {
      const b = e.target.closest("[data-ab]"); if (!b) return; const a = b.dataset.ab;
      if (a === "auto") { z.auto = b.checked; schreibe(z); return; }
      if (a === "aktualisieren") return laden();
      if (a === "auf") { const p = b.dataset.pfad; st.offen.has(p) ? st.offen.delete(p) : st.offen.add(p); return zeige(); }
      if (a === "modell") { await modellSpeichern(); return laden(); }
      try {
        if (a === "oeffnen") { const d = await client().dateiLaden(b.dataset.id); ctx.ladeProjektText(typeof binaer(d) === "string" ? d.inhalt : new TextDecoder().decode(binaer(d))); $("ablage").hidden = true; return ctx.status(`«${d.name}» aus der Cloud geöffnet.`); }
        if (a === "laden") { const d = await client().dateiLaden(b.dataset.id); return ctx.herunterladen(d.name, d.kodierung === "base64" ? new TextDecoder("latin1").decode(binaer(d)) : d.inhalt, d.mime || "application/octet-stream", null, null, true); }
        if (a === "weg") { if (!confirm("Datei in der Cloud löschen?")) return; await client().dateiLoeschen(b.dataset.id); return laden(); }
      } catch (err) { meldung(fehlerText(err)); }
    });
  }
  function oeffnen() { $("ablage").hidden = false; zeige(); laden(); }
  return { oeffnen, binden, sicherstellen, modellSpeichern, kopie, nachSpeichern, get auto() { return z.auto; } };
}
