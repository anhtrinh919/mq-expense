// MQ Expense service worker. Purpose: make the app installable (Chrome/Edge require a
// SW with a fetch handler) and usable offline (the shell + hashed bundles are cached;
// the actual data is already local-first in IndexedDB). Caching is deliberately
// conservative so a deploy is never served stale:
//   - navigations: network-first (always get the freshest index.html), cache only as
//     an offline fallback;
//   - /assets/* (content-hashed, immutable): cache-first;
//   - /api/*: never touched (encrypted, dynamic — straight to network);
//   - cross-origin (fonts): left to the browser.
const CACHE = "mqx-shell-v1";
const SHELL = "/index.html";

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(caches.open(CACHE).then((c) => c.add(SHELL)).catch(() => {}));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // fonts / 3rd-party → default handling
  if (url.pathname.startsWith("/api/")) return; // never cache API responses

  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(SHELL, copy)).catch(() => {});
          return res;
        })
        .catch(() => caches.match(SHELL)),
    );
    return;
  }

  if (url.pathname.startsWith("/assets/")) {
    event.respondWith(
      caches.match(req).then(
        (hit) =>
          hit ||
          fetch(req).then((res) => {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
            return res;
          }),
      ),
    );
    return;
  }

  event.respondWith(fetch(req).catch(() => caches.match(req)));
});
