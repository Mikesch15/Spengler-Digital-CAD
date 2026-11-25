// Service Worker der Web-Version: zuerst das Netz (immer die neueste Version, ohne HTTP-Zwischenspeicher), ohne Netz aus dem Zwischenspeicher.
const CACHE = "sdcad-v5";
const DATEIEN = ["./", "./index.html", "./manifest.webmanifest", "./icon-192.png", "./icon-512.png", "./logo.png", "./startbanner.svg"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(DATEIEN)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((k) => Promise.all(k.filter((n) => n !== CACHE).map((n) => caches.delete(n)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET" || new URL(e.request.url).origin !== location.origin) return;
  e.respondWith(
    fetch(e.request, { cache: "no-cache" }) // immer beim Server nachfragen: GitHub Pages erlaubt sonst bis zu 10 Minuten HTTP-Zwischenspeicher
      .then((antwort) => { const kopie = antwort.clone(); caches.open(CACHE).then((c) => c.put(e.request, kopie)); return antwort; })
      .catch(() => caches.match(e.request, { ignoreSearch: true })
        .then((a) => a || (e.request.mode === "navigate" ? caches.match("./index.html") : Response.error())))
  );
});
