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
  var target = e.target.closest('[data-href]');
  if (!target) return;
  var href = target.dataset.href;
  if (!href) return;
  e.preventDefault();
  if (e.button === 2) return; // 右键不跳转
  window.location.href = href;
});
