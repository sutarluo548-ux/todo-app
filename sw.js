// 极简 Service Worker：网络优先，断网时回退到缓存
// 网络优先的好处是每次部署新版本，用户下次打开拿到的就是最新代码，不会卡在旧缓存里。
const CACHE = "todo-app-v1";

self.addEventListener("install", () => {
  self.skipWaiting();
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
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    (async () => {
      try {
        const res = await fetch(req);
        if (res && res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
        }
        return res;
      } catch (err) {
        const cached = await caches.match(req);
        if (cached) return cached;
        // 离线且页面未缓存时，退回首页
        const fallback = await caches.match("./");
        if (fallback) return fallback;
        throw err;
      }
    })()
  );
});
