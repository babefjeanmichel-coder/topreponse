// Service worker TopRéponse : précache + réseau d'abord, cache en secours (hors connexion).
const CACHE = "topreponse-v2";
const CORE = ["./", "./index.html", "./manifest.json", "./icons/icon-192.png", "./icons/icon-512.png", "./icons/apple-touch-icon.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE);
      await cache.addAll(CORE);
      try {
        const res = await fetch("./asset-manifest.json", { cache: "no-store" });
        const files = Object.values((await res.json()).files || {}).filter((u) => !u.endsWith(".map"));
        await cache.addAll(files.map((u) => new URL(u, self.registration.scope).href));
      } catch (_) {
        /* les ressources seront mises en cache à la première utilisation */
      }
      await self.skipWaiting();
    })()
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
      await self.clients.claim();
    })()
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);
  if (req.method !== "GET" || url.origin !== self.location.origin) return;
  if (url.pathname.includes("hot-update") || url.pathname.includes("sockjs") || url.pathname.startsWith("/ws")) return;
  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE);
      try {
        const res = await fetch(req);
        if (res.ok) cache.put(req, res.clone());
        return res;
      } catch (_) {
        const hit = await cache.match(req, { ignoreSearch: req.mode === "navigate" });
        if (hit) return hit;
        if (req.mode === "navigate") return (await cache.match("./index.html")) || (await cache.match("./"));
        return Response.error();
      }
    })()
  );
});
