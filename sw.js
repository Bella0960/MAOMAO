/* 小手机 PWA Service Worker
 * 页面与静态资源均采用缓存优先+后台更新，断网/慢网时秒开。
 */
const CACHE_NAME = 'phone-app-pwa-v25';
const APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
  './favicon.ico',
  // 主要应用入口（安装后离线可用）
  './chat/chat/chat.html',
  './chat/moments/moments.html',
  './forum/forum.html',
  './wallet/wallet.html',
  './worldbook/worldbook/worldbook.html',
  './settings/settings.html',
  './profile/profile.html',
  './music/music.html',
  './diary/diary.html',
  './cafe/cafe.html',
  './beauty/beauty.html',
  './travel/dream-travel.html',
  './games/index.html',
  './tools/api-logs.html',
  // 公共样式
  './shared/css/mobile-fit.css',
  './desktop/css/styles.css',
  './settings/css/settings.css',
  // 公共脚本
  './shared/js/font-loader.js',
  './shared/js/native-feel.js',
  './shared/js/statusbar-control.js',
  './shared/js/nav.js',
  './shared/js/sound-system.js',
  './shared/js/custom-css.js',
  './shared/js/memory.js',
  './shared/js/mask.js',
  './shared/js/phone/phone_api.js',
  './shared/js/phone/phone_apps.js',
  './shared/js/phone/phone_context.js',
  './shared/js/phone/phone_engine.js',
  './shared/js/phone/phone_storage.js',
  './shared/js/phone/phone_ui.js',
  './desktop/js/script.js',
  './settings/js/settings.js',
  // 图标
  './assets/icon-192.png',
  './assets/icon-512.png'
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

  // HTML 导航缓存优先：有缓存立即秒开（不等网络），同时在后台悄悄更新缓存；
  // 首次访问无缓存时才走网络，断网兜底回退到首页缓存。
  if (req.mode === 'navigate') {
    const fresh = fetch(req).then(response => {
      if (response && response.ok) {
        const copy = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(req, copy));
      }
      return response;
    }).catch(() => null);
    event.waitUntil(fresh);
    event.respondWith(
      caches.match(req).then(cached =>
        cached ||
        fresh.then(r => r || caches.match('./index.html'))
      )
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
