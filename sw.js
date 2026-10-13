// Service Worker v4：所有资源网络优先（本地开发永远最新），失败回退缓存（离线可用）
const CACHE_NAME = 'phone-app-v4';

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

  // 一律网络优先：先拿最新的，失败再回退缓存（本地开发保证改动即时生效）
  e.respondWith(
    fetch(e.request).then((res) => {
      if (res && res.status === 200) {
        const clone = res.clone();
        caches.open(CACHE_NAME).then((c) => c.put(e.request, clone));
      }
      return res;
    }).catch(() => caches.match(e.request))
  );
});
