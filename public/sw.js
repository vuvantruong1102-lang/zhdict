// Service worker tối thiểu để app Tra cứu Tiếng Trung cài được như PWA.
// Chiến lược: network-first cho file same-origin (luôn ưu tiên nội dung mới),
// fallback cache khi offline. KHÔNG đụng tới /api/ và request khác origin.
const CACHE = "zh-tracuu-v1";

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;                 // bỏ qua POST/PUT (API)
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;  // chỉ xử lý same-origin
  if (url.pathname.startsWith("/api/")) return;      // không cache API
  event.respondWith(
    fetch(req)
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(req, copy));
        return res;
      })
      .catch(() => caches.match(req))
  );
});
