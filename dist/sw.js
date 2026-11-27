// Service Worker der Web-Version (Platzhalter __…__ setzt build.mjs; ohne Build ist die Datei nicht lauffähig).
//
// Ziele
//  • Offline-Kaltstart: die Programmdateien liegen vollständig im Zwischenspeicher dieser Programmversion.
//  • Keine Versionsmischung: jede Programmversion hat einen eigenen Zwischenspeicher («sdcad-<Version>-<Prüfsumme>»). HTML, Kern-Worker und alle
//    Ressourcen einer Sitzung stammen aus derselben Version.
//  • Kontrolliertes Update: eine neue Version wird im Hintergrund vollständig geladen (alles-oder-nichts für die «kritischen» Dateien) und wartet.
//    Sie wird erst aktiv, wenn die Seite es verlangt («Jetzt neu laden») oder alle Fenster geschlossen sind. Schlägt der Download fehl,
//    bleibt die bisherige, lauffähige Version unverändert aktiv.
//  • Grosse Dateien (CAD-Kern als WebAssembly, STEP-Leser, PDF-Leser, Hilfebilder) werden nach dem Start nachgeladen; die Seite erfährt, ob der
//    Offline-Betrieb vollständig ist.
//  • Online gilt weiter «Netz zuerst» (GitHub Pages erlaubt sonst bis zu 10 Minuten HTTP-Zwischenspeicher).
const VERSION = "0.2.0-d8e5a3c7";
const CACHE = "sdcad-" + VERSION;
const KRITISCH = ["./","index.html","manifest.webmanifest","icon-192.png","icon-512.png","logo.png","startbanner.jpg","cad/cad-worker.js"];
const GROSS = ["cad/replicad_single.wasm","occt/occt-import-js.js","occt/occt-import-js.wasm","pdfjs/pdf.min.mjs","pdfjs/pdf.worker.min.mjs","startbanner.svg","hilfe/sim-01-reiter.jpg","hilfe/sim-02-fenster-oben.jpg","hilfe/sim-03-lager-formular.jpg","hilfe/sim-04-lager-gesetzt.jpg","hilfe/sim-05-last-formular.jpg","hilfe/sim-06-last-gesetzt.jpg","hilfe/sim-07-spannung.jpg","hilfe/sim-08-verschiebung.jpg","hilfe/sim-09-ergebnisfenster.jpg","hilfe/sim-10-normlast-formular.jpg","hilfe/sim-11-kombinationen.jpg","hilfe/sim-12-bericht.jpg"];

const antwortOk = (a) => a && a.ok && a.status === 200 && (a.type === "basic" || a.type === "default");
const senden = async (nachricht) => { for (const c of await self.clients.matchAll({ includeUncontrolled: true })) c.postMessage({ sdcad: true, ...nachricht }); };

self.addEventListener("install", (e) => {
  // kritische Dateien: alles oder nichts – bei einem Fehler schlägt die Installation fehl, die alte Version bleibt aktiv
  e.waitUntil((async () => {
    const c = await caches.open(CACHE);
    await metaSchreiben(CACHE); // Entstehungszeit merken: ein älterer Service Worker darf nur Zwischenspeicher entfernen, die VOR seinem eigenen entstanden sind
    await Promise.all(KRITISCH.map(async (u) => {
      const a = await fetch(new Request(u, { cache: "reload" }));
      if (!antwortOk(a)) throw new Error("Download unvollständig: " + u + " (" + a.status + ")");
      await c.put(u, a);
    }));
  })().catch(async (fehler) => { console.warn("sdcad-sw: Installation fehlgeschlagen:", fehler && fehler.message); await caches.delete(CACHE); await metaLoeschen(CACHE); throw fehler; }));
});

self.addEventListener("message", (e) => {
  if (e.data?.typ === "aktivieren") self.skipWaiting();
  if (e.data?.typ === "status") e.waitUntil(offlineStatus().then((st) => e.source?.postMessage({ sdcad: true, typ: "offline-status", ...st })));
  if (e.data?.typ === "nachladen") e.waitUntil(grossNachladen().then(bereinigen).catch((f) => console.warn("sdcad-sw: Nachladen fehlgeschlagen:", f))); // hält den Service Worker während des Ladens am Leben
});

self.addEventListener("activate", (e) => {
  e.waitUntil(self.clients.claim()); // die Aktivierung selbst bleibt kurz; die grossen Dateien lädt die Seite per Nachricht «nachladen» (zusätzlich hier ein Versuch im Hintergrund)
  grossNachladen().then(bereinigen).catch((f) => console.warn("sdcad-sw: Nachladen fehlgeschlagen:", f));
});

// Zwischenspeicher älterer Versionen erst entfernen, wenn die neue Version ihre grossen Dateien selbst vollständig hat
const META = "sdcad-meta", metaUrl = (n) => "/__meta/" + n;
const metaSchreiben = async (n) => (await caches.open(META)).put(metaUrl(n), new Response(String(Date.now())));
const metaLoeschen = async (n) => (await caches.open(META)).delete(metaUrl(n));
const metaZeit = async (n) => { const r = await (await caches.open(META)).match(metaUrl(n)); return r ? +(await r.text()) : 0; }; // ohne Eintrag (Altbestand): ältester Stand
async function bereinigen(fertig) {
  if (!fertig) return;
  const eigen = await metaZeit(CACHE);
  if (!eigen) return; // eigener Eintrag fehlt: nichts löschen
  for (const n of await caches.keys()) {
    if (n === CACHE || n === META) continue;
    if ((await metaZeit(n)) < eigen) { await caches.delete(n); await metaLoeschen(n); } // nur ältere Stände; neuere (wartende) Versionen bleiben unberührt
  }
}

async function offlineStatus() {
  const c = await caches.open(CACHE), fehlt = [];
  for (const u of [...KRITISCH, ...GROSS]) if (!(await c.match(u, { ignoreSearch: true }))) fehlt.push(u);
  return { version: VERSION, vollstaendig: fehlt.length === 0, fehlt };
}

// grosse Dateien: vorhandene Kopien aus älteren Versionen übernehmen (damit der Offline-Betrieb während des Updates nie schlechter wird), dann frisch laden
async function grossNachladen() {
  const c = await caches.open(CACHE);
  let alleFrisch = true;
  for (const u of GROSS) {
    try {
      const a = await fetch(new Request(u, { cache: "reload" }));
      if (!antwortOk(a)) throw new Error(String(a.status));
      await c.put(u, a);
    } catch {
      alleFrisch = false;
      if (!(await c.match(u))) { const alt = await caches.match(u, { ignoreSearch: true }); if (alt) await c.put(u, alt.clone()); }
    }
  }
  const s = await offlineStatus();
  await senden({ typ: "offline-status", ...s });
  return alleFrisch && s.vollstaendig;
}

self.addEventListener("fetch", (e) => {
  const q = e.request;
  if (q.method !== "GET" || new URL(q.url).origin !== location.origin) return;
  const pfad = new URL(q.url).pathname;
  if (pfad.endsWith("/version.json") || pfad.endsWith("/sw.js")) return; // Versionsprüfung und Service Worker nie aus dem Zwischenspeicher
  e.respondWith(
    fetch(q, { cache: "no-cache" })
      .then((a) => { if (antwortOk(a) && q.headers.get("range") === null) { const k = a.clone(); caches.open(CACHE).then((c) => c.put(q, k)); } return a; })
      .catch(async () => {
        const c = await caches.open(CACHE);
        return (await c.match(q, { ignoreSearch: true })) || (q.mode === "navigate" ? await c.match("index.html") : null) || Response.error();
      })
  );
});
