// Spengler Digital CAD – CAD-Kern im Web Worker. Lädt OpenCascade (WASM) erst beim ersten Kommando.
// Nachricht rein:  { nr, kommando, wasmUrl? }
// Nachricht raus:  { nr, ok: true, ergebnis, ms } | { nr, ok: false, fehler: { code, nachricht } } | { nr, status: "laden"|"bereit", ms? }
import { occtKern } from "./occt.js";
import { KernFehler, CODES } from "./schnittstelle.js";

let laden = null;

// Grosse Zahlenfelder ohne Kopie zurückgeben (Transfer)
function puffer(o, out = []) {
  if (!o || typeof o !== "object") return out;
  if (ArrayBuffer.isView(o)) { out.push(o.buffer); return out; }
  for (const v of Object.values(o)) puffer(v, out);
  return out;
}

self.onmessage = async ({ data }) => {
  const { nr, kommando, wasmUrl } = data;
  try {
    if (!laden) {
      self.postMessage({ nr, status: "laden" });
      const t = performance.now();
      laden = occtKern({ wasmUrl });
      laden.then(() => self.postMessage({ nr, status: "bereit", ms: performance.now() - t }), () => {});
    }
    let kern;
    try { kern = await laden; } catch (e) { laden = null; throw KernFehler.aus(e); } // nächster Versuch lädt neu
    const t = performance.now(), ergebnis = await kern.ausfuehren(kommando);
    self.postMessage({ nr, ok: true, ergebnis, ms: performance.now() - t }, puffer(ergebnis));
  } catch (e) {
    const f = e instanceof KernFehler ? e : new KernFehler(CODES.FEHLGESCHLAGEN, e?.message ?? String(e));
    self.postMessage({ nr, ok: false, fehler: f.toJSON() });
  }
};
