// Meldungen (Toasts): wichtige Warnungen/Fehler bleiben einige Sekunden sichtbar, auch wenn die Statuszeile von Koordinaten überschrieben wird.
// Jede Meldung ist per Klick oder Esc schliessbar; Screenreader erhalten sie als role="alert".
let box = null, letzte = "", letzteZeit = 0;
export function zeigeMeldung(text, art = "warn", dauer = 7000, aktion = null) { // aktion: { text, fn } = Knopf in der Meldung
  if (!text || typeof document === "undefined") return;
  const jetzt = Date.now(); if (text === letzte && jetzt - letzteZeit < 1500) return; letzte = text; letzteZeit = jetzt; // gleiche Meldung nicht mehrfach stapeln
  if (!box) { box = document.createElement("div"); box.id = "meldungen"; box.setAttribute("aria-live", "assertive"); document.body.appendChild(box); }
  const m = document.createElement("div"); m.className = "meldung-toast " + art; m.setAttribute("role", art === "warn" ? "alert" : "status");
  const t = document.createElement("span"); t.textContent = text; const x = document.createElement("button"); x.type = "button"; x.setAttribute("aria-label", "Meldung schliessen"); x.textContent = "×";
  m.append(t); if (aktion) { const a = document.createElement("button"); a.type = "button"; a.className = "aktion"; a.textContent = aktion.text; a.onclick = (e) => { e.stopPropagation(); aktion.fn(); }; m.append(a); } m.append(x); box.appendChild(m);
  while (box.children.length > 3) box.firstChild.remove();
  const weg = () => m.remove(); x.onclick = weg; m.onclick = weg; if (dauer) setTimeout(weg, dauer);
}
