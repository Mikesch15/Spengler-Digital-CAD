// Befehlssuche (Strg + K oder «/»): findet alle Werkzeuge der Oberfläche nach Name, Beschreibung und Stichwörtern und startet sie über denselben Knopf –
// keine doppelten Funktionen, nur ein zweiter Zugang. Die Liste wird bei jedem Öffnen aus dem DOM gelesen (neue Werkzeuge erscheinen automatisch).
const SYNONYME = {
  wSkizze: "zeichnen skizzieren linie 2d", w2D: "zeichnung dxf layer", wExtrusion: "extrusion ziehen pressen körper volumen", wDrehung: "rotation drehen rohr kugel",
  wBlech: "blechprofil linienzug abkanten profil", wVorlage: "vorlage falz traufe ortgang bibliothek", wRund: "rundblech kegel zylinder rohr trichter kaminhut",
  wFlaeche: "flächenblech abwicklung kanten", wKehle: "kehle grat", wDachAuto: "dach haus gebäude sparren ziegel neigung", wDachBleche: "traufblech ortgang first grat kehle spengler brücke",
  wEindeckung: "ziegel eindecken schuppen", wDachElement: "dachfenster velux kamin", wLukarne: "gaube lukarne", wEbene: "konstruktionsebene", wMessen: "abstand messen",
  wKollision: "kollision durchdringung", wSchnitt: "schnittanalyse schneiden", wPlan: "plan zeichnung blatt ansichten drucken pdf", wSpeichern: "sichern", wOeffnen: "laden projekt",
  wNeu: "neues projekt leer", wDrucken: "stückliste werkstattblatt", wAblage: "cloud ablage", wProjekte: "auftrag objekt projekte", wEinst: "einstellungen materialien", wHilfe: "hilfe anleitung tastenkürzel",
  wParameter: "formeln parameter variablen", w2D_: "",
};
const GRUPPEN = { koerper: "Körper", blech: "Blech", dach: "Dach", kanten: "Kanten", aendern: "Ändern", pruefen: "Prüfen", datei: "Datei", einfuegen: "Einfügen", formen: "Formen", skaendern: "Skizze ändern", werkstatt: "Werkstatt" };
const norm = (s) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/ß/g, "ss");
function befehle() {
  const l = [], gesehen = new Set();
  for (const b of document.querySelectorAll("#leiste button.wz")) {
    if (b.id === "wSuche" || b.classList.contains("klappknopf") || b.disabled || gesehen.has(b)) continue;
    let versteckt = b.hidden; for (let e = b.parentElement; e && !versteckt && e !== document.body; e = e.parentElement) if (e.hidden && !e.classList.contains("klappmenue")) versteckt = true; // eingeklappte Menüs zählen mit
    if (versteckt) continue;
    gesehen.add(b);
    const name = (b.querySelector("b")?.textContent || b.getAttribute("aria-label") || b.textContent || "").replace(/\s+/g, " ").trim(), tipp = b.title || b.querySelector("small")?.textContent || "";
    if (!name) continue;
    const g = b.closest("[data-klapp]")?.dataset.klapp, skizze = b.closest("#gSkizze");
    l.push({ b, name, tipp, gruppe: skizze ? "Skizze" : GRUPPEN[g] || "Werkzeug", icon: b.querySelector("svg")?.outerHTML || "", text: norm(`${name} ${tipp} ${SYNONYME[b.id] || ""}`) });
  }
  for (const z of zusatzBefehle) l.push({ ...z, icon: "", text: norm(`${z.name} ${z.tipp || ""}`) });
  return l;
}
// Zusätzliche Befehle ohne eigenen Knopf (z. B. Arbeitsbereich zurücksetzen): { name, tipp, gruppe, run }
export const zusatzBefehle = [];
// zuletzt benutzte Befehle (nur Namen, nur in diesem Browser) stehen bei leerer Suche oben
const ZUL = "sdcad-befehle-zuletzt"; // nicht «sdcad-zuletzt»: dort liegt die Liste der zuletzt geöffneten Projekte
const lesZuletzt = () => { try { return JSON.parse(localStorage.getItem(ZUL)) || []; } catch { return []; } };
const merkeZuletzt = (name) => { try { localStorage.setItem(ZUL, JSON.stringify([name, ...lesZuletzt().filter((n) => n !== name)].slice(0, 6))); } catch { /* Speicher gesperrt */ } };
let offen = null;
export function oeffneBefehlssuche() {
  if (offen) return schliesse();
  const alle = befehle(), hinter = document.createElement("div");
  hinter.className = "bs-hinter"; hinter.setAttribute("role", "dialog"); hinter.setAttribute("aria-label", "Befehlssuche");
  hinter.innerHTML = '<div class="bs"><input type="text" placeholder="Werkzeug suchen … (z. B. Extrusion, Dachfenster, Flansch)" aria-label="Werkzeug suchen" autocomplete="off"><ul role="listbox"></ul><div class="bs-fuss">↑ ↓ wählen · Enter starten · Esc schliessen</div></div>';
  document.body.appendChild(hinter);
  const eing = hinter.querySelector("input"), liste = hinter.querySelector("ul");
  let treffer = [], nr = 0;
  const zeige = () => {
    const w = norm(eing.value).split(/\s+/).filter(Boolean);
    const zul = lesZuletzt();
    treffer = (w.length ? alle : [...alle.filter((c) => zul.includes(c.name)).sort((a, b) => zul.indexOf(a.name) - zul.indexOf(b.name)), ...alle.filter((c) => !zul.includes(c.name))]).filter((c) => w.every((x) => c.text.includes(x))).sort((a, b) => (w.length ? (norm(a.name).startsWith(w[0]) ? 0 : 1) - (norm(b.name).startsWith(w[0]) ? 0 : 1) : 0)).slice(0, 40);
    nr = Math.min(nr, Math.max(0, treffer.length - 1));
    liste.innerHTML = treffer.length ? treffer.map((c, i) => `<li role="option" data-i="${i}" class="${i === nr ? "aktiv" : ""}">${c.icon}<span class="bs-name">${c.name.replace(/[<>&]/g, "")}</span><span class="bs-gruppe">${!w.length && zul.includes(c.name) ? "★ zuletzt benutzt" : c.gruppe}</span></li>`).join("") : '<li class="bs-leer">Kein Werkzeug gefunden.</li>';
    liste.querySelector(".aktiv")?.scrollIntoView({ block: "nearest" });
  };
  const starte = (c) => { if (!c) return; merkeZuletzt(c.name); schliesse(); setTimeout(() => (c.run ? c.run() : c.b.click()), 0); };
  eing.addEventListener("input", () => { nr = 0; zeige(); });
  eing.addEventListener("keydown", (e) => {
    if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); schliesse(); }
    else if (e.key === "ArrowDown") { e.preventDefault(); nr = Math.min(nr + 1, treffer.length - 1); zeige(); }
    else if (e.key === "ArrowUp") { e.preventDefault(); nr = Math.max(nr - 1, 0); zeige(); }
    else if (e.key === "Enter") { e.preventDefault(); e.stopPropagation(); starte(treffer[nr]); }
  });
  liste.addEventListener("click", (e) => { const li = e.target.closest("li[data-i]"); if (li) starte(treffer[+li.dataset.i]); });
  hinter.addEventListener("pointerdown", (e) => { if (e.target === hinter) schliesse(); });
  offen = hinter; zeige(); eing.focus();
}
function schliesse() { offen?.remove(); offen = null; }
addEventListener("keydown", (e) => {
  const tippt = e.target?.closest?.("input, select, textarea, [contenteditable]");
  if ((e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey && e.key.toLowerCase() === "k") { e.preventDefault(); oeffneBefehlssuche(); }
  else if (e.key === "/" && !tippt && !e.ctrlKey && !e.metaKey && !e.altKey && !offen) { e.preventDefault(); oeffneBefehlssuche(); }
}, true);
document.getElementById("wSuche")?.addEventListener("click", oeffneBefehlssuche);
