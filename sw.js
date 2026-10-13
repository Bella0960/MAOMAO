// Service Worker v5：缓存优先 + 后台静默更新（页面秒开，最新版本下次打开自动生效）
const CACHE_NAME = 'phone-app-v5';

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((c) =>
      c.addAll([
        './styles.css',
        './settings.css',
        './mobile-fit.css',
        './font-loader.js',
        './native-feel.js',
        './script.js',
        './statusbar-control.js',
        './nav.js',
        './sound-system.js',
        './memory.js',
        './characters.js',
        './mask.js',
        './settings.js'
      ])
    ).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  if (url.origin !== location.origin) return;

  // 缓存优先：先秒开缓存版本，同时后台静默拉取最新版供下次使用（网络失败仍用缓存，离线可用）
  e.respondWith(
    caches.match(e.request).then((cached) => {
      const network = fetch(e.request).then((res) => {
        if (res && res.status === 200) {
          const clone = res.clone();
          caches.open(CACHE_NAME).then((c) => c.put(e.request, clone));
        }
        return res;
      }).catch(() => cached);
      return cached || network;
    })
  );
});
