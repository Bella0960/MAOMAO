const STORAGE_KEY = 'ai_custom_characters';
const CURRENT_CONTACT_KEY = 'currentPhoneContactId';

// 美化设置 LocalStorage 键名
const WALLPAPER_KEY = 'home_custom_wallpaper';
const ICON_BG_KEY = 'home_custom_icon_bg';
const WIDGETS_KEY = 'home_custom_widgets';

// 加载并应用美化设置
function applyHomeTheme() {
  try {
    // 1. 壁纸
    const wallpaper = localStorage.getItem(WALLPAPER_KEY);
    if (wallpaper) {
      document.documentElement.style.setProperty('--desktop-bg-img', `url("${wallpaper}")`);
    } else {
      document.documentElement.style.setProperty('--desktop-bg-img', 'none');
    }

    // 2. 图标底色（默认纯净灰底，无玻璃拟态）
    const iconStyle = localStorage.getItem('home_icon_style');
    if (iconStyle === 'glass') {
      document.documentElement.style.setProperty('--icon-bg', 'rgba(255, 255, 255, 0.6)');
      document.documentElement.style.setProperty('--icon-blur', 'blur(12px)');
    } else {
      const iconBg = localStorage.getItem(ICON_BG_KEY);
      if (iconBg) {
        document.documentElement.style.setProperty('--icon-bg', iconBg);
      } else {
        document.documentElement.style.setProperty('--icon-bg', '#F8F8FA');
      }
      document.documentElement.style.setProperty('--icon-blur', 'none');
    }

    // 3. 挂件文字
    const widgetsRaw = localStorage.getItem(WIDGETS_KEY);
    if (widgetsRaw) {
      const widgets = JSON.parse(widgetsRaw);
      const leftEl = document.getElementById('widget-kaomoji-text');
      const rightEl = document.getElementById('widget-motto-text');
      if (leftEl && widgets.left) leftEl.textContent = widgets.left;
      if (rightEl && widgets.right) rightEl.textContent = widgets.right;
    }
  } catch (e) {
    console.error('应用桌面美化失败:', e);
  }
}

// 挂件弹窗编辑逻辑
let currentEditingWidget = null;
const widgetModal = document.getElementById('widgetModal');
const widgetModalTitle = document.getElementById('widgetModalTitle');
const widgetModalInput = document.getElementById('widgetModalInput');
const widgetModalCancel = document.getElementById('widgetModalCancel');
const widgetModalSave = document.getElementById('widgetModalSave');

function initWidgetEditor() {
  const leftWidget = document.getElementById('widget-left-btn');
  const rightWidget = document.getElementById('widget-right-btn');
  const leftTextEl = document.getElementById('widget-kaomoji-text');
  const rightTextEl = document.getElementById('widget-motto-text');

  if (leftWidget) {
    leftWidget.addEventListener('click', () => {
      currentEditingWidget = 'left';
      if (widgetModalTitle) widgetModalTitle.textContent = '修改左侧挂件';
      if (widgetModalInput) widgetModalInput.value = leftTextEl ? leftTextEl.textContent : 'HELLO';
      if (widgetModal) widgetModal.style.display = 'flex';
      setTimeout(() => widgetModalInput?.focus(), 50);
    });
  }

  if (rightWidget) {
    rightWidget.addEventListener('click', () => {
      currentEditingWidget = 'right';
      if (widgetModalTitle) widgetModalTitle.textContent = '修改右侧挂件';
      if (widgetModalInput) widgetModalInput.value = rightTextEl ? rightTextEl.textContent : 'MONOCHROME';
      if (widgetModal) widgetModal.style.display = 'flex';
      setTimeout(() => widgetModalInput?.focus(), 50);
    });
  }

  if (widgetModalCancel) {
    widgetModalCancel.addEventListener('click', () => {
      if (widgetModal) widgetModal.style.display = 'none';
      currentEditingWidget = null;
    });
  }

  if (widgetModalSave) {
    widgetModalSave.addEventListener('click', () => {
      const text = (widgetModalInput?.value || '').trim();
      if (!text) {
        showToast('内容不能为空');
        return;
      }

      let widgets = { left: '( ˃ ᵕ ˂ )', right: '행운이🤍' };
      try {
        const raw = localStorage.getItem(WIDGETS_KEY);
        if (raw) widgets = Object.assign(widgets, JSON.parse(raw));
      } catch (e) {}

      if (currentEditingWidget === 'left') {
        widgets.left = text;
        if (leftTextEl) leftTextEl.textContent = text;
      } else if (currentEditingWidget === 'right') {
        widgets.right = text;
        if (rightTextEl) rightTextEl.textContent = text;
      }

      localStorage.setItem(WIDGETS_KEY, JSON.stringify(widgets));
      if (widgetModal) widgetModal.style.display = 'none';
      currentEditingWidget = null;
      showToast('挂件已更新');
    });
  }
}

// 获取当前小手机角色 ID
function getCurrentPhoneContactId() {
  try {
    return localStorage.getItem(CURRENT_CONTACT_KEY) || null;
  } catch (e) {
    return null;
  }
}

// 获取当前小手机角色对象
function getCurrentPhoneContact() {
  const roleId = getCurrentPhoneContactId();
  if (!roleId) return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const roles = JSON.parse(raw);
      if (Array.isArray(roles)) {
        return roles.find(r => String(r.id) === String(roleId)) || null;
      }
    }
  } catch (e) {
    console.error('获取当前角色失败:', e);
  }
  return null;
}

const timeElement = document.querySelector('#status-time');
const largeClockElement = document.querySelector('#large-clock');
const toast = document.querySelector('#toast');
let toastTimer;

// 更新主屏幕欢迎语为当前角色
function renderHomeScreenRole() {
  const currentContact = getCurrentPhoneContact();
  const titleSpan = document.querySelector('.welcome-copy h1 span');
  if (titleSpan) {
    if (currentContact && currentContact.name) {
      titleSpan.textContent = currentContact.name;
    } else {
      titleSpan.textContent = '朋友';
    }
  }
}

function updateTime() {
  const now = new Date();
  const timeStr = now.toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  if (timeElement) timeElement.textContent = timeStr;
  if (largeClockElement) largeClockElement.textContent = timeStr;
}

function showToast(message) {
  toast.textContent = `${message} · UI 预览`;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 1800);
}

// 统一绑定桌面与Dock栏图标点击
document.querySelectorAll('.app-card, .dock-item').forEach((app) => {
  app.addEventListener('click', () => {
    if (app.dataset.app === '消息') {
      window.location.href = 'chat.html';
      return;
    }
    if (app.dataset.app === '角色管理' || app.dataset.app === '联系人') {
      window.location.href = 'characters.html';
      return;
    }
    if (app.dataset.app === '设置') {
      window.location.href = 'settings.html';
      return;
    }
    if (app.dataset.app === '记忆') {
      window.location.href = 'memory.html';
      return;
    }
    if (app.dataset.app === '钱包') {
      window.location.href = 'wallet.html';
      return;
    }

    showToast(app.dataset.app);
  });
});

document.querySelectorAll('.nav-item').forEach((item) => {
  item.addEventListener('click', () => {
    document.querySelector('.nav-item.active')?.classList.remove('active');
    item.classList.add('active');
    showToast(item.dataset.nav);
  });
});

updateTime();
setInterval(updateTime, 1000);
renderHomeScreenRole();
applyHomeTheme();
initWidgetEditor();