// Arbeitsbereich: verstellbare Breite der rechten Spalte (Teil/Auftrag bzw. Dialog), gespeichert im Browser; «Arbeitsbereich zurücksetzen» über die Befehlssuche
import { zusatzBefehle } from "./befehlssuche.js";
const SCHLUESSEL = "sdcad-layout", MIN = 260, MAX = 720;
const mitte = document.querySelector(".mitte");
const lies = () => { try { return JSON.parse(localStorage.getItem(SCHLUESSEL)) || {}; } catch { return {}; } };
const speichere = (o) => { try { localStorage.setItem(SCHLUESSEL, JSON.stringify(o)); } catch { /* Speicher gesperrt: Breite gilt nur für diese Sitzung */ } };
const setze = (w) => { if (w == null) mitte.style.removeProperty("--werk-w"); else mitte.style.setProperty("--werk-w", Math.round(w) + "px"); };
if (mitte) {
  const w0 = lies().werkW; if (Number.isFinite(w0)) setze(Math.min(MAX, Math.max(MIN, w0)));
  const teiler = document.createElement("div");
  teiler.className = "teiler"; teiler.id = "teilerWerk"; teiler.setAttribute("role", "separator"); teiler.setAttribute("aria-orientation", "vertical"); teiler.title = "Breite ziehen · Doppelklick: Standardbreite";
  mitte.appendChild(teiler);
  let zug = null;
  teiler.addEventListener("pointerdown", (e) => { if (e.button !== 0) return; teiler.setPointerCapture(e.pointerId); zug = true; e.preventDefault(); });
  teiler.addEventListener("pointermove", (e) => { if (!zug) return; const r = mitte.getBoundingClientRect(); setze(Math.min(MAX, Math.max(MIN, Math.min(r.width * 0.6, r.right - e.clientX - 4)))); dispatchEvent(new Event("resize")); });
  const ende = (e) => { if (!zug) return; zug = null; try { teiler.releasePointerCapture(e.pointerId); } catch { /* schon frei */ } const w = parseFloat(mitte.style.getPropertyValue("--werk-w")); speichere({ ...lies(), werkW: Number.isFinite(w) ? w : undefined }); };
  teiler.addEventListener("pointerup", ende); teiler.addEventListener("pointercancel", ende);
  const zuruecksetzen = () => { setze(null); speichere({}); dispatchEvent(new Event("resize")); };
  teiler.addEventListener("dblclick", zuruecksetzen);
  zusatzBefehle.push({ name: "Arbeitsbereich zurücksetzen", tipp: "Panelbreite auf Standard", gruppe: "Ansicht", run: zuruecksetzen });
}

// Werkzeugleiste: Hinweis (ausblendender Rand), wenn sich weitere Werkzeuge durch Wischen erreichen lassen
const leiste = document.getElementById("leiste");
if (leiste) {
  const pruefe = () => { leiste.classList.toggle("mehr", leiste.scrollLeft + leiste.clientWidth < leiste.scrollWidth - 4); leiste.classList.toggle("mehrLinks", leiste.scrollLeft > 4); };
  leiste.addEventListener("scroll", pruefe, { passive: true }); addEventListener("resize", pruefe);
  if (typeof ResizeObserver !== "undefined") new ResizeObserver(pruefe).observe(leiste);
  pruefe();
}
