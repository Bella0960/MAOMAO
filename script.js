// ===== 状态栏时间 =====
const timeElement = document.querySelector('#status-time');
const toast = document.querySelector('#toast');
let toastTimer;

function updateTime() {
  const now = new Date();
  const timeStr = now.toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  if (timeElement) timeElement.textContent = timeStr;
}

// ===== Toast 提示 =====
function showToast(message) {
  toast.textContent = `${message} · UI 预览`;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 1800);
}

// ===== 桌面 / Dock 栏图标点击 → 页面跳转 =====
document.querySelectorAll('.app-card, .dock-item').forEach((app) => {
  app.addEventListener('click', () => {
    switch (app.dataset.app) {
      case '消息':       window.location.href = 'chat.html'; break;
      case '角色管理':   window.location.href = 'characters.html'; break;
      case '设置':       window.location.href = 'settings.html'; break;
      case '记忆':       window.location.href = 'memory.html'; break;
      case '钱包':       window.location.href = 'wallet.html'; break;
      case '音乐':       window.location.href = 'music.html'; break;
      default: showToast(app.dataset.app);
    }
  });
});

// ===== 启动 =====
updateTime();
setInterval(updateTime, 1000);
