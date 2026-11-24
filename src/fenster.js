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
