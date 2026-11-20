// Prüfseite für den CAD-Kern im Web Worker (Browser, Edge, Tauri/WebView2). Ergebnis: window.__ergebnis
import { cadKlient } from "../../kern/cad/klient.js";
import { CODES } from "../../kern/cad/schnittstelle.js";
import { blechQuerschnitt, profilGrenzen, verschiebeProfil, zuschnittAusVolumen } from "../../kern/cad/blech.js";
import { berechne } from "../../kern/geometrie.js";

const aus = document.getElementById("aus"), zeilen = [];
const ok = (b, text, wert) => { zeilen.push({ ok: !!b, text, wert }); aus.textContent += `${b ? "✓" : "✗"} ${text}${wert !== undefined ? "  " + JSON.stringify(wert) : ""}\n`; };
const nahe = (a, b, rel = 1e-9) => Math.abs(a - b) <= Math.abs(b) * rel + 1e-6;
const umgebung = { ua: navigator.userAgent, tauri: !!window.__TAURI__, worker: typeof Worker, wasm: typeof WebAssembly, speicher: performance.memory ? Math.round(performance.memory.usedJSHeapSize / 2 ** 20) : null };

async function lauf() {
  const K = cadKlient({ workerUrl: "./cad-worker.js", wasmUrl: new URL("./replicad_single.wasm", location.href).href, zeitLimit: 60000 });
  const x = (k, o) => K.ausfuehren(k, o), eig = (id) => x({ op: "eigenschaften", ziel: id });
  let t = performance.now();
  const q = await x({ op: "quader", min: [0, 0, 0], max: [100, 50, 20] });
  ok(true, "Kern im Worker geladen (WASM + erstes Kommando)", { ms: Math.round(performance.now() - t) });
  ok(nahe((await eig(q.id)).volumen, 100000), "Quader 100×50×20: V 100000");
  const b = await x({ op: "bohrung", ziel: q.id, punkt: [50, 25, 20], richtung: [0, 0, -1], d: 10, durch: true, senkung: { d: 20, winkel: 90 } });
  ok(nahe((await eig(b.id)).volumen, 100000 - Math.PI * 25 * 20 - (Math.PI * 5 / 3 * 175 - Math.PI * 125)), "Senkbohrung: V exakt");
  // Rinne aus der Spenglerlogik, Zuschnitt aus 3D = Abwicklung
  const sch = (L) => ({ typ: "schenkel", L }), bg = (w, r = null, m = "sharp") => ({ typ: "biegung", winkel: w, ri: r, modus: m });
  const res = berechne(180, [sch(0), bg(-270, 8, "tangent"), sch(0), bg(180, 62.5, "tangent"), sch(20), bg(-90), sch(15)], 0.7, 1, 0.4), rq = blechQuerschnitt(res, 0.7);
  const rinne = await x({ op: "extrusion", profil: rq.profil, hoehe: 1000 }), rv = (await eig(rinne.id)).volumen;
  ok(Math.abs(zuschnittAusVolumen(rv, 0.7, 1000, 0.4, rq.theta) - res.zuschnitt) < 1e-6, "Rinne: Zuschnitt aus 3D = Abwicklung", +res.zuschnitt.toFixed(4));
  // Gehrung (schwer, ~0.5–1 s) – währenddessen muss der Hauptthread frei bleiben
  const g = profilGrenzen(rq.profil), roh = (await x({ op: "extrusion", profil: verschiebeProfil(rq.profil, -g.u0, 0), hoehe: 400 })).id;
  let tick = performance.now(), maxLuecke = 0, ticks = 0; const iv = setInterval(() => { const n = performance.now(); maxLuecke = Math.max(maxLuecke, n - tick); tick = n; ticks++; }, 10);
  t = performance.now();
  const A = (await x({ op: "transformieren", ziel: roh, verschieben: [0, 0, -400] })).id, B = (await x({ op: "transformieren", ziel: roh, drehen: { winkel: 90, punkt: [0, 0, 0], achse: [0, 1, 0] } })).id;
  const H = (await x({ op: "transformieren", ziel: (await x({ op: "quader", min: [-1600, -1600, 0], max: [1600, 1600, 3200] })).id, drehen: { winkel: 45, punkt: [0, 0, 0], achse: [0, 1, 0] } })).id;
  const Am = (await x({ op: "boolesch", art: "abziehen", a: A, b: H })).id, Bm = (await x({ op: "boolesch", art: "schneiden", a: B, b: H })).id;
  const U = await eig((await x({ op: "boolesch", art: "vereinigen", a: Am, b: Bm })).id), ue = await x({ op: "ueberschneidung", a: Am, b: Bm });
  clearInterval(iv);
  ok(U.gueltig && ue.volumen === 0, "Rinnenwinkel 90° im Worker: gültig, Überschneidung 0", { ms: Math.round(performance.now() - t) });
  ok(maxLuecke < 150, "Oberfläche bleibt bedienbar während der Berechnung (grösste Lücke im Hauptthread)", { ms: Math.round(maxLuecke), ticks });
  const n = await x({ op: "tessellieren", ziel: b.id });
  ok(n.positionen instanceof Float32Array && n.flaechen.every((f) => f.index >= 0), "Tessellierung übertragen (Float32Array, Flächen-IDs)", { dreiecke: n.indizes.length / 3 });
  const st = await x({ op: "stepExport", ziele: [b.id] }), im = await x({ op: "stepImport", text: st.text });
  ok(/Open CASCADE STEP processor 8\.0/.test(st.text) && /AP242/.test(st.text) && nahe((await eig(im.ids[0])).volumen, (await eig(b.id)).volumen), "STEP AP242 (OCCT 8.0) hin und zurück im Browser");
  // Speicher: 100 Zyklen erzeugen/freigeben
  const h0 = (await x({ op: "speicher" })).heapBytes;
  for (let i = 0; i < 100; i++) { const a = (await x({ op: "quader", min: [0, 0, 0], max: [10, 10, 10] })).id, c = (await x({ op: "boolesch", art: "abziehen", a, b: (await x({ op: "zylinder", r: 3, h: 20, basis: [5, 5, -5] })).id })).id; await x({ op: "freigeben", ziele: [a, c] }); }
  const sp = await x({ op: "speicher" });
  ok(sp.heapBytes - h0 <= 16 * 2 ** 20, "Speicher stabil über 100 Zyklen", { heapMB: Math.round(sp.heapBytes / 2 ** 20), handles: sp.handles });
  // Zeitlimit → Neustart; alte Kennungen ungültig, neue Kommandos funktionieren
  let neustart = 0; K.on("neustart", () => neustart++);
  let code = null; try { await x({ op: "boolesch", art: "vereinigen", a: Am, b: Bm }, { zeit: 1 }); } catch (e) { code = e.code; }
  ok(code === CODES.ZEIT && neustart === 1, "Zeitüberschreitung → Fehler ZEIT, Worker neu gestartet", code);
  code = null; try { await eig(q.id); } catch (e) { code = e.code; }
  ok(code === CODES.UNBEKANNT_ID, "Nach Neustart: alte Kennungen sauber ungültig", code);
  ok(nahe((await eig((await x({ op: "kugel", r: 10 })).id)).volumen, 4 / 3 * Math.PI * 1000), "Nach Neustart: Kern arbeitet wieder");
  const ac = new AbortController(); const p = x({ op: "kugel", r: 5 }, { signal: ac.signal }); ac.abort();
  code = null; try { await p; } catch (e) { code = e.code; }
  ok(code === CODES.ABGEBROCHEN, "Abbruch durch Benutzer → ABGEBROCHEN", code);
  // Ausfall: WASM nicht auffindbar → Fehler statt Absturz
  const kaputt = cadKlient({ workerUrl: "./cad-worker.js", wasmUrl: new URL("./gibt-es-nicht.wasm", location.href).href, zeitLimit: 30000 });
  code = null; try { await kaputt.ausfuehren({ op: "quader", min: [0, 0, 0], max: [1, 1, 1] }); } catch (e) { code = e.code; }
  ok(code === CODES.NICHT_GELADEN || code === CODES.ZEIT, "Kern-Ausfall (WASM fehlt) → sauberer Fehler, Seite läuft weiter", code);
  kaputt.beenden(); K.beenden();
}

lauf().catch((e) => ok(false, "Unerwarteter Fehler: " + (e?.message ?? e))).finally(() => {
  const erg = { umgebung, zeilen, fehler: zeilen.filter((z) => !z.ok).length };
  window.__ergebnis = erg;
  if (window.__TAURI__?.core?.invoke) window.__TAURI__.core.invoke("ergebnis", { json: JSON.stringify(erg) }).catch(() => {});
});
