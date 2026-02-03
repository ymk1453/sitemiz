// sw.js

const CACHE = "mm-cache-v4";

/**
 * Notlar:
 * - sw.js'i de cache’e ekledim (güncellemelerde daha tutarlı davranır).
 * - install: addAll başarısız olursa SW kurulumu fail etmesin diye try/catch yaklaşımı.
 * - fetch:
 *    - Navigasyon isteklerinde (HTML sayfa) offline fallback: index_plus.html
 *    - Diğer isteklerde: cache-first + network fallback
 *    - Başarılı network response'ları cache'e yaz (GET + 200 + basic/opaque)
 */

const ASSETS = [
  "./",
  "./index_plus.html",
  "./style_plus.css",
  "./script_plus.js",
  "./manifest.json",
  "./sw.js"
];


self.addEventListener("message", (e) => {
  if (e?.data?.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

self.addEventListener("install", (e) => {
  e.waitUntil((async () => {
    try {
      const cache = await caches.open(CACHE);
      await cache.addAll(ASSETS);
    } catch (err) {
      // Offline ilk yükleme gibi senaryolarda addAll patlayabilir; SW yine de kurulsun.
    } finally {
      self.skipWaiting();
    }
  })());
});

self.addEventListener("activate", (e) => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.map((k) => (k === CACHE ? null : caches.delete(k))));
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", (e) => {
  const req = e.request;

  // Sadece GET istekleri cache stratejisine dahil (POST vb. cache'lenmez)
  if (req.method !== "GET") return;

  const url = new URL(req.url);

  // Aynı origin dışı isteklerde de aşırı agresif cache yapmayalım (CDN vb.)
  const isSameOrigin = url.origin === self.location.origin;

  // Navigasyon (sayfa) istekleri: network-first, offline fallback index_plus.html
  if (req.mode === "navigate") {
    e.respondWith((async () => {
      try {
        const res = await fetch(req);
        // HTML yanıtını cache'e yaz
        if (res && res.ok) {
          const cache = await caches.open(CACHE);
          cache.put(req, res.clone()).catch(() => {});
        }
        return res;
      } catch (err) {
        const cached = await caches.match("./index_plus.html");
        return cached || new Response("Offline", { status: 503, statusText: "Offline" });
      }
    })());
    return;
  }

  // Diğer istekler: cache-first, sonra network
  e.respondWith((async () => {
    const cached = await caches.match(req);
    if (cached) return cached;

    try {
      const res = await fetch(req);

      // Cache'e sadece mantıklı response'ları yaz
      const okToCache =
        res &&
        (res.status === 200 || res.status === 0) && // 0 => opaque
        (res.type === "basic" || res.type === "opaque");

      if (okToCache && isSameOrigin) {
        const cache = await caches.open(CACHE);
        cache.put(req, res.clone()).catch(() => {});
      }

      return res;
    } catch (err) {
      // Son çare: index (özellikle assetler kaçarsa)
      const fallback = await caches.match("./index_plus.html");
      return fallback || new Response("Offline", { status: 503, statusText: "Offline" });
    }
  })());
});
