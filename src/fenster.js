// Alle Fenster des Programms (Dialoge, Einstellungen, Hilfe, Ablage …, Layer-Leiste) lassen sich zusätzlich an der Ecke unten rechts in der Grösse ändern (Doppelklick auf die Ecke = Standardgrösse; die Grösse wird je Fenster gemerkt).
// Alle Fenster des Programms (Dialoge, Einstellungen, Hilfe, Ablage …, Layer-Leiste, Browser) lassen sich am Titel frei verschieben.
// Doppelklick auf den Titel setzt die Lage zurück. Verschoben wird mit der CSS-Eigenschaft «translate» (stört das übrige Layout nicht).
const KOPF = ".dialog > h3, .modalbox > h3, .layerbox > .ltitel, .browser > .ptitel";
const FENSTER = ".dialog, .modalbox, .layerbox, .browser";
export function fensterVerschieben() {
  let zug = null, ende = 0;
  const setze = (f, x, y) => { f._versatz = [x, y]; f.style.translate = x || y ? `${x}px ${y}px` : ""; };
  document.addEventListener("pointerdown", (e) => {
    zug = null; if (e.button > 0 || !e.isPrimary || e.target.closest("button, input, select, textarea, a")) return;
    const kopf = e.target.closest(KOPF), f = kopf?.closest(FENSTER); if (!f) return;
    zug = { f, kopf, x: e.clientX, y: e.clientY, alt: f._versatz || [0, 0], id: e.pointerId, bewegt: false };
  }, true);
  document.addEventListener("pointermove", (e) => {
    if (!zug || e.pointerId !== zug.id) return;
    const dx = e.clientX - zug.x, dy = e.clientY - zug.y;
    if (!zug.bewegt) { if (Math.hypot(dx, dy) < 6) return; zug.bewegt = true; try { zug.kopf.setPointerCapture(e.pointerId); } catch {} }
    const f = zug.f, cur = f._versatz || [0, 0], r = f.getBoundingClientRect();
    let nx = zug.alt[0] + dx, ny = zug.alt[1] + dy;
    const links = r.left + (nx - cur[0]), oben = r.top + (ny - cur[1]); // der Titel bleibt im Bild greifbar
    if (links + r.width < 70) nx += 70 - (links + r.width); if (links > innerWidth - 70) nx -= links - (innerWidth - 70);
    if (oben < 0) ny -= oben; if (oben > innerHeight - 40) ny -= oben - (innerHeight - 40);
    setze(f, nx, ny); e.preventDefault();
  }, true);
  const aus = (e) => { if (zug?.bewegt) { ende = performance.now(); try { zug.kopf.releasePointerCapture(e.pointerId); } catch {} } zug = null; };
  document.addEventListener("pointerup", aus, true); document.addEventListener("pointercancel", aus, true);
  document.addEventListener("click", (e) => { if (performance.now() - ende < 350 && e.target.closest(KOPF)) { e.stopPropagation(); e.preventDefault(); } }, true); // Loslassen nach dem Verschieben klappt nichts ein
  document.addEventListener("dblclick", (e) => { const kopf = e.target.closest(KOPF), f = kopf?.closest(FENSTER); if (f && !e.target.closest("button, input, select")) setze(f, 0, 0); });
}

// Grösse ändern: Griff unten rechts an jedem Fenster; Mindestgrösse 240 × 120, höchstens die Bildschirmgrösse
const GROESSE_FENSTER = ".dialog, .modalbox, .layerbox";
const SPEICHER = "sdcad-fenster-groesse";
function gespeichert() { try { return JSON.parse(localStorage.getItem(SPEICHER) || "{}"); } catch { return {}; } }
function merke(f) { if (!f.id) return; try { const g = gespeichert(); if (f.dataset.groesse) g[f.id] = [parseInt(f.style.width), parseInt(f.style.height)]; else delete g[f.id]; localStorage.setItem(SPEICHER, JSON.stringify(g)); } catch { /* Speicher nicht verfügbar */ } }
const groesseSetzen = (f, w, h) => { f.dataset.groesse = "1"; f.style.width = Math.round(w) + "px"; f.style.height = Math.round(h) + "px"; };
function griff(f) {
  if (f.querySelector(":scope > .groessengriff")) return;
  const g = document.createElement("div"); g.className = "groessengriff"; g.setAttribute("role", "separator"); g.setAttribute("aria-label", "Fenstergrösse ändern"); g.title = "Grösse ändern (Doppelklick: Standardgrösse)";
  f.appendChild(g);
  const alt = f.id ? gespeichert()[f.id] : null; if (alt) groesseSetzen(f, alt[0], alt[1]);
  let zug = null;
  g.addEventListener("pointerdown", (e) => { if (e.button > 0) return; const r = f.getBoundingClientRect(); if (getComputedStyle(f).position === "absolute" && (getComputedStyle(f).right !== "auto" || getComputedStyle(f).bottom !== "auto")) { f.style.left = f.offsetLeft + "px"; f.style.top = f.offsetTop + "px"; f.style.right = "auto"; f.style.bottom = "auto"; } /* an ein Ende gebundene Fenster werden von links/oben aus positioniert, damit sich die Ecke unten rechts mit dem Zeiger bewegt */ zug = { x: e.clientX, y: e.clientY, w: r.width, h: r.height, id: e.pointerId }; try { g.setPointerCapture(e.pointerId); } catch {} e.preventDefault(); e.stopPropagation(); });
  g.addEventListener("pointermove", (e) => {
    if (!zug || e.pointerId !== zug.id) return; const r = f.getBoundingClientRect();
    const w = Math.max(240, Math.min(zug.w + e.clientX - zug.x, innerWidth - 12)), h = Math.max(120, Math.min(zug.h + e.clientY - zug.y, innerHeight - 12));
    if (getComputedStyle(f).position === "absolute") { // am Bildschirmrand wird das Fenster nach links/oben geschoben, statt am Rand zu stoppen
      const ueberR = r.left + w - (innerWidth - 6), ueberU = r.top + h - (innerHeight - 6);
      if (ueberR > 0) f.style.left = f.offsetLeft - ueberR + "px"; if (ueberU > 0) f.style.top = f.offsetTop - ueberU + "px";
    }
    groesseSetzen(f, w, h); e.preventDefault();
  });
  const ende = (e) => { if (zug && e.pointerId === zug.id) { zug = null; merke(f); try { g.releasePointerCapture(e.pointerId); } catch {} } };
  g.addEventListener("pointerup", ende); g.addEventListener("pointercancel", ende);
  g.addEventListener("dblclick", () => { delete f.dataset.groesse; f.style.width = f.style.height = ""; merke(f); });
}
export function fensterGroesse() {
  const alle = (wurzel) => { if (wurzel.matches?.(GROESSE_FENSTER)) griff(wurzel); wurzel.querySelectorAll?.(GROESSE_FENSTER).forEach(griff); };
  alle(document);
  new MutationObserver((ms) => { for (const m of ms) for (const n of m.addedNodes) if (n.nodeType === 1) alle(n); }).observe(document.body, { childList: true, subtree: true });
}
