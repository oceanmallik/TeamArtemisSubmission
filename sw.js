// sw.js — AEGIS Service Worker
const CACHE_NAME = "aegis-v1";
const APP_FILES = [
  "./",
  "index.html",
  "css/style.css",
  "js/charts.js",
  "js/baseline.js",
  "js/detect.js",
  "js/store.js",
  "js/comms.js",
  "js/app.js",
  "data/crew.json",
  "manifest.webmanifest",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => {
        return cache.addAll(APP_FILES);
      })
      .then(() => {
        return self.skipWaiting();
      })
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((name) => name !== CACHE_NAME)
            .map((name) => caches.delete(name))
        );
      })
      .then(() => {
        return self.clients.claim();
      })
      .then(() => {
        return self.clients.matchAll({ includeUncontrolled: true });
      })
      .then((clients) => {
        clients.forEach((client) => {
          client.postMessage({ type: "OFFLINE_READY" });
        });
      })
  );
});

self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(event.request);
    })
  );
});
