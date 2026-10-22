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

// ===== 桌面主题：应用外观页保存的壁纸与图标底色（写入方为 settings/appearance.html） =====
(function () {
  // 壁纸：Base64 dataURL，铺满手机屏幕；宫格/页面容器均为透明背景，图标与挂件卡片自带底色不受影响
  var screen = document.querySelector('.phone-screen');
  if (screen) {
    try {
      var wp = localStorage.getItem('home_custom_wallpaper');
      if (wp) {
        screen.style.backgroundImage = 'url("' + wp + '")';
        screen.style.backgroundSize = 'cover';
        screen.style.backgroundPosition = 'center';
        screen.style.backgroundRepeat = 'no-repeat';
      }
    } catch (e) {}
  }
  // 图标风格：毛玻璃(半透明底+背景模糊) / 纯净(实色底无模糊)。
  // 写入方为 appearance.html（home_icon_style / home_custom_icon_bg），消费方为 styles.css 的
  // .app-icon { background: var(--icon-bg); backdrop-filter: var(--icon-blur) }
  try {
    var root = document.documentElement;
    var customBg = localStorage.getItem('home_custom_icon_bg');
    var style = localStorage.getItem('home_icon_style') || 'glass';
    var isClean = style === 'clean';
    // 底色：自定义色卡优先，否则按风格推导
    root.style.setProperty('--icon-bg', customBg || (isClean ? '#F2F2F7' : 'rgba(255, 255, 255, 0.6)'));
    // 模糊：毛玻璃开 blur，纯净关掉（此前 CSS 写死 none，毛玻璃一直不生效）
    root.style.setProperty('--icon-blur', isClean ? 'none' : 'blur(14px)');
  } catch (e) {}
})();
