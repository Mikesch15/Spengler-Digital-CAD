// Spengler Digital CAD – Klient für den CAD-Kern im Web Worker (für die Oberfläche)
// - Kommandos laufen nacheinander im Worker; die Oberfläche bleibt bedienbar.
// - Zeitlimit und Abbruch: OCCT lässt sich mitten in einer Operation nicht unterbrechen → der Worker wird beendet und beim
//   nächsten Kommando neu gestartet. Alle Körper-Kennungen sind danach ungültig: Ereignis «neustart» → Modell neu aufbauen.
// - Fällt der Kern aus (WASM lädt nicht), meldet ausfuehren() KernFehler NICHT_GELADEN; die Anwendung bleibt nutzbar (Rückfall).
import { KernFehler, CODES } from "./schnittstelle.js";

export function cadKlient({ workerUrl, wasmUrl, zeitLimit = 120000, Worker: W = globalThis.Worker } = {}) {
  let worker = null, nr = 0, generation = 0;
  const offen = new Map(); // nr → { ok, nein, timer }
  const hoerer = { status: new Set(), neustart: new Set() };
  const melde = (art, d) => hoerer[art].forEach((f) => { try { f(d); } catch {} });

  const start = () => {
    worker = new W(workerUrl, { type: "module" });
    worker.onmessage = ({ data }) => {
      if (data.status) { melde("status", data); return; }
      const o = offen.get(data.nr); if (!o) return;
      offen.delete(data.nr); clearTimeout(o.timer);
      data.ok ? o.ok({ ...data.ergebnis, _ms: data.ms }) : o.nein(KernFehler.aus(data.fehler));
    };
    worker.onerror = (e) => { e.preventDefault?.(); stopp(CODES.NICHT_GELADEN, `CAD-Kern abgestürzt: ${e.message || "unbekannter Fehler"}`); };
  };
  // Worker beenden, alle offenen Kommandos mit Fehler abschliessen
  const stopp = (code, nachricht) => {
    if (worker) { worker.terminate(); worker = null; generation++; melde("neustart", { generation, grund: code }); }
    for (const [, o] of offen) { clearTimeout(o.timer); o.nein(new KernFehler(code, nachricht)); }
    offen.clear();
  };

  return {
    // kommando: siehe schnittstelle.js; optionen: { zeit (ms), signal (AbortSignal) }
    ausfuehren(kommando, { zeit = zeitLimit, signal } = {}) {
      if (signal?.aborted) return Promise.reject(new KernFehler(CODES.ABGEBROCHEN, "Abgebrochen"));
      if (!worker) start();
      const n = ++nr;
      return new Promise((ok, nein) => {
        const timer = setTimeout(() => stopp(CODES.ZEIT, `Zeitüberschreitung nach ${(zeit / 1000).toFixed(0)} s – Kern neu gestartet`), zeit);
        offen.set(n, { ok, nein, timer });
        signal?.addEventListener("abort", () => stopp(CODES.ABGEBROCHEN, "Vom Benutzer abgebrochen – Kern neu gestartet"), { once: true });
        worker.postMessage({ nr: n, kommando, wasmUrl });
      });
    },
    beenden() { stopp(CODES.ABGEBROCHEN, "Kern beendet"); },
    on(art, f) { hoerer[art].add(f); return () => hoerer[art].delete(f); },
    get generation() { return generation; },
    get beschaeftigt() { return offen.size > 0; },
  };
}
