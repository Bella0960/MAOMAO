/* 小手机 PWA Service Worker
 * 页面采用网络优先，静态资源采用缓存回退，避免旧 HTML 长期锁住不更新。
 */
const CACHE_NAME = 'phone-app-pwa-v8';
const APP_SHELL = [
  './',
  './index.html',
  './diary.html',
  './manifest.json',
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
  './mask.js',
  './settings.js',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(APP_SHELL).catch(() => Promise.all(
        APP_SHELL.map(url => cache.add(url).catch(() => undefined))
      )))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key.startsWith('phone-app-') && key !== CACHE_NAME)
        .map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // HTML 导航网络优先：尽量拿到最新版；断网时回退缓存。
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req).then(response => {
        if (response && response.ok) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(req, copy));
        }
        return response;
      }).catch(() => caches.match(req).then(cached => cached || caches.match('./index.html')))
    );
    return;
  }

  // 静态文件缓存优先，并在后台更新缓存。
  event.respondWith(
    caches.match(req).then(cached => {
      const fresh = fetch(req).then(response => {
        if (response && response.ok) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(req, copy));
        }
        return response;
      }).catch(() => cached);
      return cached || fresh;
    })
  );
});
