// ===== 状态栏时间 =====
(function () {
  var el = document.querySelector('#status-time');
  function tick() {
    if (!el) return;
    var now = new Date();
    el.textContent = now.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false });
  }
  tick();
  setInterval(tick, 1000);
})();

// ===== Toast =====
var toastEl = document.querySelector('#toast');
var toastTimer = null;
function showToast(msg) {
  if (!toastEl) return;
  toastEl.textContent = msg;
  toastEl.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(function () { toastEl.classList.remove('show'); }, 1800);
}

// ===== 统一事件委托：所有 data-href 点击跳转 =====
document.addEventListener('click', function (e) {
  if (document.body.classList.contains('home-editing')) {
    e.preventDefault();
    e.stopPropagation();
    return;
  }
  var target = e.target.closest('[data-href]');
  if (!target) return;
  var href = target.dataset.href;
  if (!href) return;
  e.preventDefault();
  if (e.button === 2) return; // 右键不跳转
  window.location.href = href;
});

/* ===== PWA 安装入口 =====
   捕获 beforeinstallprompt，在桌面显示一个「安装」按钮；
   点击后弹出系统安装对话框，安装后按钮自动隐藏。 */
(function () {
  if (!('BeforeInstallPromptEvent' in window) && !window.BeforeInstallPromptEvent) {
    // 部分浏览器没有该构造函数，但仍会触发事件，下面照常监听
  }
  var deferredPrompt = null;

  function showInstallBtn() {
    var btn = document.getElementById('pwa-install-btn');
    if (btn) { btn.style.display = ''; return; }
    btn = document.createElement('button');
    btn.id = 'pwa-install-btn';
    btn.type = 'button';
    btn.textContent = '⬇ 安装';
    btn.setAttribute('aria-label', '安装到主屏幕');
    btn.style.cssText = 'position:absolute;top:12px;right:14px;z-index:50;' +
      'font-size:12px;padding:5px 10px;border-radius:999px;border:1px solid rgba(0,0,0,.12);' +
      'background:rgba(255,255,255,.85);color:#222;cursor:pointer;backdrop-filter:blur(8px);';
    btn.addEventListener('click', function () {
      if (!deferredPrompt) return;
      deferredPrompt.prompt();
      deferredPrompt.userChoice.then(function () { deferredPrompt = null; btn.style.display = 'none'; });
    });
    document.body.appendChild(btn);
  }

  window.addEventListener('beforeinstallprompt', function (e) {
    e.preventDefault();
    deferredPrompt = e;
    showInstallBtn();
  });

  window.addEventListener('appinstalled', function () {
    deferredPrompt = null;
    var btn = document.getElementById('pwa-install-btn');
    if (btn) btn.style.display = 'none';
  });
})();
