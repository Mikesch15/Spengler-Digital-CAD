// Tablet-Bedienung: Langdruck ersetzt den Rechtsklick, Bildschirmtastatur schiebt das Feld ins Bild, Wertblase über dem Finger.
export const grob = () => { try { return matchMedia("(pointer: coarse)").matches; } catch { return false; } };
export const maus = () => { try { return matchMedia("(pointer: fine)").matches; } catch { return true; } };

// Langdruck (Finger, ~0,55 s ohne Verschieben) löst das Kontextmenü von `el` aus – falls der Browser es nicht schon selbst auslöst.
export function langdruck(el, wahl, ms = 550) {
  let t = null, x0 = 0, y0 = 0, nativ = false, ziel = null, verschluckt = 0;
  el.addEventListener("contextmenu", () => { nativ = true; setTimeout(() => (nativ = false), 900); }, true);
  const ab = () => { clearTimeout(t); t = null; };
  el.addEventListener("pointerdown", (e) => {
    verschluckt = 0; ab(); if (e.pointerType !== "touch" || !e.isPrimary || !e.target.closest(wahl)) return;
    ziel = e.target; x0 = e.clientX; y0 = e.clientY; nativ = false;
    t = setTimeout(() => { t = null; if (nativ || !ziel?.isConnected) return; verschluckt = Date.now(); navigator.vibrate?.(15);
      ziel.dispatchEvent(new MouseEvent("contextmenu", { bubbles: true, cancelable: true, clientX: x0, clientY: y0, button: 2 })); }, ms);
  });
  el.addEventListener("pointermove", (e) => { if (t && Math.hypot(e.clientX - x0, e.clientY - y0) > 10) ab(); });
  el.addEventListener("pointerup", ab); el.addEventListener("pointercancel", ab);
  el.addEventListener("click", (e) => { if (verschluckt && Date.now() - verschluckt < 2000) { e.stopPropagation(); e.preventDefault(); verschluckt = 0; } }, true); // das Loslassen nach dem Langdruck soll nichts auswählen
}

// Eingabefelder in Dialogen bleiben über der Bildschirmtastatur sichtbar
export function tastaturSichtbar() {
  addEventListener("focusin", (e) => {
    if (!grob() || !e.target.matches?.("input,select,textarea") || !e.target.closest(".dialog,.modal,#werkstatt,.panel")) return;
    setTimeout(() => { try { e.target.scrollIntoView({ block: "center", behavior: "smooth" }); } catch {} }, 320);
  });
}

// Blase mit dem Wert über dem Finger beim Ziehen an einem Pfeil (der Finger verdeckt sonst die Zahl)
export function wertBlase() {
  const el = document.body.appendChild(Object.assign(document.createElement("div"), { className: "griffWert", hidden: true }));
  return { zeige(text, x, y) { el.textContent = text; el.hidden = false; el.style.left = Math.max(40, Math.min(innerWidth - 40, x)) + "px"; el.style.top = Math.max(8, y - 84) + "px"; }, weg() { el.hidden = true; } };
}
