// Kontextleiste: erkennt, was gerade gewählt ist (Skizze, Blech, Körper, Kante, Fläche, Dach …) und bietet die dazu passenden Werkzeuge an.
// Keine eigene Werkzeuglogik: jede Aktion löst denselben Knopf wie die Werkzeugleiste aus bzw. ruft eine vom Programm bereitgestellte Funktion auf.
// Die Dialoge übernehmen die Auswahl (gewählte Skizze, gewähltes Blech, gewähltes Dach, gewählte Kante/Fläche) als Vorgabe.
import { oeffneBefehlssuche } from "./befehlssuche.js";
let api = null, sig = "", zu = "";
const knopf = (sel) => document.querySelector(sel);
const KOERPER = ["extrusion", "drehung", "sweep", "loft", "import", "kantenrund", "schale", "bewegen", "kmuster", "kspiegel", "teilen", "kanten3d"];
const BLECH = ["blech", "vorlage", "profil"];
// Aktion: { sel: CSS-Selektor des Werkzeugknopfs } oder { fn: Funktion }; haupt = empfohlene Aktion
const A = (label, tipp, sel, haupt = false) => ({ label, tipp, sel, haupt });
const F = (label, tipp, fn, icon, haupt = false) => ({ label, tipp, fn, icon, haupt });
const fest = (a) => ({ ...a, fest: true }); // bleibt immer sichtbar (z. B. «Bearbeiten»)

export function aktionenFuer(k) {
  const f = k.feature, z = k.zeiger, l = [];
  if (!f && !z) return { titel: "", aktionen: l };
  if (z?.art === "kante" && KOERPER.includes(f?.typ) && ["extrusion", "drehung", "sweep", "loft", "import"].includes(f.typ)) {
    return { titel: `Kante von «${f.name}»`, aktionen: [F("Abrunden", "Diese Kante abrunden (Radius)", () => api.kanteAktion("rund"), '[data-kwz="kanten3d"]', true), F("Fasen", "Diese Kante fasen (Abstand)", () => api.kanteAktion("fase"), '[data-kwz="kanten3d"]'), A("Schale", "Körper aushöhlen", '[data-kwz="schale"]')] };
  }
  if (z?.art === "flaeche" && f && KOERPER.includes(f.typ)) {
    const a = [F("Skizze auf Fläche", "Auf dieser Fläche eine neue Skizze zeichnen", () => api.flaecheSkizze(z.ref), "#wSkizze", true), F("Blech auf Fläche", "Blech mit dem Umriss dieser Fläche anlegen", () => api.flaecheBlech(z.ref), "#wBlechAufFlaeche")];
    if (["extrusion", "drehung", "sweep", "loft", "import"].includes(f.typ)) a.push(A("Kanten abrunden / fasen", "Kanten des Körpers anklicken", '[data-kwz="kanten3d"]'));
    return { titel: `Fläche von «${f.name}»`, aktionen: a };
  }
  if (!f) return { titel: "", aktionen: l };
  const bearbeiten = fest(F("Bearbeiten", "Einstellungen und Masse dieses Schritts ändern (auch: Doppelklick)", () => api.bearbeite(f), "#wParameter"));
  switch (f.typ) {
    case "skizze": {
      const s = api.skizzeArt(f);
      if (s.leer) return { titel: `Skizze «${f.name}» (leer)`, aktionen: [F("Skizze bearbeiten", "Weiterzeichnen", () => api.bearbeite(f), "#wSkizze", true)] };
      if (s.geschlossen) l.push(A("Extrudieren", "Aus der Skizzenfläche einen Körper ziehen", "#wExtrusion", true), A("Flächenblech", "Aus der Skizzenfläche ein Blech mit Kantenbausteinen", "#wFlaeche"), A("Drehen", "Profil um eine Achse drehen", "#wDrehung"), F("Dach darauf", "Gebäude und Dach mit dieser Skizze als Grundriss", () => api.dachAusSkizze(f.id), "#wDachAuto"));
      if (s.offen) l.push(A("Blechprofil", "Aus dem Linienzug ein Blech abkanten", "#wBlech", !s.geschlossen), A("Sweep", "Profil entlang dieses Pfads ziehen", "#wSweep"));
      l.push(F("Skizze bearbeiten", "Weiterzeichnen", () => api.bearbeite(f), "#wSkizze"));
      return { titel: `Skizze «${f.name}»`, aktionen: l };
    }
    case "flaeche":
      return { titel: `Flächenblech «${f.name}»`, aktionen: [A("Flansch", "Einfacher Flansch an einer Kante", '[data-kantenwz="flansch"]', true), A("Umschlag", "Saum an einer Kante", '[data-kantenwz="umschlag"]'), A("Kantenbaustein", "Falz, Traufe, Ortgang … aus der Bibliothek", '[data-kantenwz="baustein"]'), A("Abwickeln / Falten", "Flach bearbeiten und wieder falten", "#wAbwickeln"), bearbeiten] };
    case "blech": case "vorlage": case "profil":
      return { titel: `Blechprofil «${f.name}»`, aktionen: [A("Flansch", "Flansch an Kante A oder B ansetzen", '[data-kantenwz="flansch"]', true), A("Umschlag", "Umschlag an Kante A oder B", '[data-kantenwz="umschlag"]'), A("Kantenbaustein", "Baustein aus der Bibliothek an Kante A oder B", '[data-kantenwz="baustein"]'), A("Muster", "Teil mehrfach anordnen", '[data-kwz="kmuster"]'), A("Spiegeln", "Teil spiegeln", '[data-kwz="kspiegel"]'), bearbeiten, A("Kollision prüfen", "Durchdringungen mit anderen Teilen finden", "#wKollision"), A("Plan", "Planblatt mit Ansichten und Bemassung", "#wPlan")] };
    case "rundblech":
      return { titel: `Rund-/Kegelblech «${f.name}»`, aktionen: [bearbeiten, A("Beurteilen", "Konstruierbar, abwickelbar, herstellbar?", "#wUmform")] };
    case "dach":
      return { titel: `Dach «${f.name}»`, aktionen: [A("Dachbleche", "Traufe, Ortgang, First, Grat, Kehle automatisch", "#wDachBleche", true), A("Fenster / Kamin", "Dachfenster oder Kamin auf der Dachfläche", "#wDachElement"), A("Lukarne", "Gaube auf der Dachfläche", "#wLukarne"), A("Ziegel eindecken", "Ziegel einzeln eindecken", "#wEindeckung"), bearbeiten] };
    case "gebaeude": return { titel: `Gebäude «${f.name}»`, aktionen: [bearbeiten] };
    case "dachbleche": return { titel: `Dachbleche «${f.name}»`, aktionen: [A("Ziegel eindecken", "Ziegel an den Blechen anschneiden", "#wEindeckung", true), A("Fenster / Kamin", "Weitere Öffnung auf der Dachfläche", "#wDachElement"), bearbeiten] };
    case "lukarne": case "dachelement": return { titel: `${f.name}`, aktionen: [bearbeiten, A("Dachbleche", "Anschlussbleche erzeugen", "#wDachBleche"), A("Ziegel eindecken", "Ziegel anschneiden", "#wEindeckung")] };
    case "ebene": return { titel: `Ebene «${f.name}»`, aktionen: [F("Skizze auf Ebene", "Auf dieser Ebene eine neue Skizze zeichnen", () => api.ebeneSkizze(f.id), "#wSkizze", true), bearbeiten] };
    default:
      if (KOERPER.includes(f.typ)) {
        const a = [];
        if (["extrusion", "drehung", "sweep", "loft", "import"].includes(f.typ)) a.push(A("Kanten abrunden / fasen", "Kanten des Körpers anklicken", '[data-kwz="kanten3d"]', true), A("Schale", "Körper aushöhlen", '[data-kwz="schale"]'));
        a.push(A("Verschieben / Kopieren", "Körper bewegen oder kopieren", '[data-kwz="bewegen"]'), A("Muster", "Mehrfach anordnen", '[data-kwz="kmuster"]'), A("Spiegeln", "An einer Ebene spiegeln", '[data-kwz="kspiegel"]'), A("Teilen", "An einer Ebene teilen", '[data-kwz="teilen"]'), A("Blech auf Körperfläche", "Fläche anklicken, Blech daraus", "#wBlechAufFlaeche"), bearbeiten, A("Schnittanalyse", "Körper an einer Ebene aufschneiden", "#wSchnitt"), A("Kollision prüfen", "Durchdringungen mit anderen Teilen finden", "#wKollision"), A("Plan", "Planblatt mit Ansichten und Bemassung", "#wPlan"));
        return { titel: `Körper «${f.name}»`, aktionen: a };
      }
      return { titel: f.name || "", aktionen: [bearbeiten] };
  }
}

function symbol(a) { const q = knopf(a.sel || a.icon); const s = q?.querySelector("svg"); return s ? s.outerHTML : ""; }
function verfuegbar(a) { if (a.fn) return true; const q = knopf(a.sel); return !!q && !q.disabled; }

function zeichne() {
  const bar = document.getElementById("kontextBar"); if (!bar) return;
  const k = api.kontext(), frei = api.frei();
  const e = frei ? aktionenFuer(k) : { aktionen: [] };
  const alle = e.aktionen.filter(verfuegbar), feste = alle.filter((a) => a.fest), lose = alle.filter((a) => !a.fest);
  const MAX = 6, sichtbar = [...lose.slice(0, Math.max(1, MAX - feste.length)), ...feste]; const mehr = lose.length > MAX - feste.length;
  if (!frei || !sichtbar.length || zu === sig) { bar.hidden = true; bar.innerHTML = ""; return; }
  bar.hidden = false;
  bar.innerHTML = `<span class="kk-titel">${(e.titel || "").replace(/[<>&]/g, "")}</span>` + sichtbar.map((a, i) => `<button type="button" class="kk-knopf${a.haupt ? " haupt" : ""}" data-i="${i}" title="${a.tipp.replace(/"/g, "&quot;")}">${symbol(a)}<span>${a.label}</span></button>`).join("") + (mehr ? '<button type="button" class="kk-knopf kk-mehr" title="Weitere Werkzeuge suchen (Strg + K)"><span>Mehr …</span></button>' : '') + '<button type="button" class="kk-zu" aria-label="Ausblenden" title="Ausblenden">×</button>';
  bar.querySelectorAll(".kk-knopf[data-i]").forEach((b) => (b.onclick = () => { const a = sichtbar[+b.dataset.i]; bar.hidden = true; if (a.fn) a.fn(); else knopf(a.sel)?.click(); }));
  bar.querySelector(".kk-mehr")?.addEventListener("click", () => { bar.hidden = true; oeffneBefehlssuche(); });
  bar.querySelector(".kk-zu").onclick = () => { zu = sig; bar.hidden = true; };
}

export function initKontext(a) {
  api = a;
  setInterval(() => { const s = api.signatur(); if (s !== sig) { sig = s; zeichne(); } }, 200);
}
export const kontextAktionen = () => { const k = api.kontext(); const e = api.frei() ? aktionenFuer(k) : { titel: "", aktionen: [] }; return { titel: e.titel, aktionen: e.aktionen.filter(verfuegbar).map((x) => x.label) }; };
