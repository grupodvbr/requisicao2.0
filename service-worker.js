const CACHE_NAME = "requisicao-delicia-v1";

const FILES_TO_CACHE = [
  "/",
  "/index.html",
  "/manifest.json",
  "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2",
  "https://unpkg.com/@ericblade/quagga2/dist/quagga.min.js",
  "https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(FILES_TO_CACHE);
    })
  );
  self.skipWaiting();
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.map(key => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", event => {
  event.respondWith(
    caches.match(event.request).then(response => {
      return response || fetch(event.request);
    })
  );
});
