/* ============================================================
 * chat-extras.js —— 聊天页「＋」互动面板（纯前端文本模拟版）
 * 铁律：不调用任何真实系统硬件 API（无 geolocation / 无 getUserMedia）
 * 依赖 chat-detail.html 全局函数：loadMessages / saveMessages /
 *   appendMessageToDOM / sendMsg / showToast /
 *   currentCharacter / chatMessages
 * ============================================================ */
(function () {
  'use strict';

  // ---------- 通用：向聊天插入一条展示消息（不触发 AI 请求） ----------
  function insertChatMessage(msg) {
    if (!msg || typeof msg !== 'object') return;
    if (!msg.time) msg.time = Date.now();
    if (!msg.role) msg.role = 'user';
    const list = loadMessages();
    list.push(msg);
    saveMessages(list);
    appendMessageToDOM(msg);
    if (chatMessages) chatMessages.scrollTop = chatMessages.scrollHeight;
  }

  // 隐藏指令：作为 user 消息进入 AI 上下文，但不在界面渲染气泡（sendMsg silent 模式）
  function sendSilentInstruction(text) {
    if (typeof sendMsg === 'function') {
      sendMsg({ text: text, silent: true });
    }
  }

  // ---------- localStorage 小工具 ----------
  function lsGet(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      if (raw == null) return fallback;
      return JSON.parse(raw);
    } catch (e) { return fallback; }
  }
  function lsSet(key, val) {
    try {
      localStorage.setItem(key, JSON.stringify(val));
      return true;
    } catch (e) {
      // 写入失败（如存储空间已满）时给出可见反馈，避免「以为存了其实没存」
      if (typeof showToast === 'function') showToast('保存失败：本地存储空间不足');
      return false;
    }
  }
  function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
  function escapeHtml(s) {
    if (s == null) return '';
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  // ---------- 通用弹窗 ----------
  const modalOverlay = document.getElementById('xModalOverlay');
  const modalTitle = document.getElementById('xModalTitle');
  const modalBody = document.getElementById('xModalBody');

  function openModal(title, bodyHTML) {
    if (modalTitle) modalTitle.textContent = title;
    if (modalBody) modalBody.innerHTML = bodyHTML;
    if (modalOverlay) modalOverlay.classList.add('active');
  }
  function closeModal() {
    if (modalOverlay) modalOverlay.classList.remove('active');
  }
  if (modalOverlay) {
    document.getElementById('xModalBackdrop').addEventListener('click', closeModal);
    document.getElementById('xModalClose').addEventListener('click', closeModal);
  }

  // ---------- 加号面板 ----------
  const panelOverlay = document.getElementById('plusPanelOverlay');
  const plusBtn = document.getElementById('plus-action-btn');

  function openPlusPanel() {
    if (panelOverlay) panelOverlay.classList.add('active');
  }
  function closePlusPanel() {
    if (panelOverlay) panelOverlay.classList.remove('active');
  }
  function togglePlusPanel() {
    if (panelOverlay && panelOverlay.classList.contains('active')) closePlusPanel();
    else openPlusPanel();
  }
  window.togglePlusPanel = togglePlusPanel;
  window.closePlusPanel = closePlusPanel;

  if (plusBtn) plusBtn.addEventListener('click', togglePlusPanel);
  if (panelOverlay) {
    document.getElementById('plusPanelBackdrop').addEventListener('click', closePlusPanel);
    panelOverlay.querySelectorAll('.plus-item').forEach(function (btn) {
      btn.addEventListener('click', function () {
        const feat = btn.getAttribute('data-feat');
        closePlusPanel();
        handleFeature(feat);
      });
    });
  }

  // 手机返回键（popstate）关闭顶层弹层
  window.addEventListener('popstate', function () {
    if (modalOverlay && modalOverlay.classList.contains('active')) closeModal();
    else if (panelOverlay && panelOverlay.classList.contains('active')) closePlusPanel();
  });

  // ============================================================
  // 功能 1：位置 —— 纯文本模拟（无任何真实定位调用）
  // 地点保存在 localStorage.myLocation，默认「宇宙尽头」
  // ============================================================
  function featLocation() {
    let saved = '宇宙尽头';
    try { saved = localStorage.getItem('myLocation') || '宇宙尽头'; } catch (e) {}

    openModal('所在位置',
      '<input class="x-input" id="locPlace" placeholder="输入你所在的地方" value="' + escapeHtml(saved) + '" />' +
      '<div class="x-row">' +
      '<button class="x-btn x-btn-ghost" id="locCancel">取消</button>' +
      '<button class="x-btn x-btn-primary" id="locSend">发送到聊天</button>' +
      '</div>'
    );
    document.getElementById('locCancel').onclick = closeModal;
    document.getElementById('locSend').onclick = function () {
      const place = document.getElementById('locPlace').value.trim() || '宇宙尽头';
      try { localStorage.setItem('myLocation', place); } catch (e) {}
      closeModal();
      // 展示：右侧位置卡片气泡
      insertChatMessage({ role: 'user', type: 'location', location: { label: place } });
      // 演绎：把「我在xxx」作为隐藏消息发给 AI，由 AI 按人设回应
      sendSilentInstruction('我在' + place);
    };
  }

  // ============================================================
  // 功能 2：纪念日
  // ============================================================
  const ANNIV_KEY = 'anniversaries';

  function daysUntil(dateStr) {
    if (!dateStr) return '';
    const target = new Date(dateStr + 'T00:00:00');
    if (isNaN(target.getTime())) return '';
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diff = Math.round((target - today) / 86400000);
    if (diff > 0) return '还有 ' + diff + ' 天';
    if (diff < 0) return '已过去 ' + Math.abs(diff) + ' 天';
    return '就是今天';
  }

  function renderAnniversaryList() {
    const list = lsGet(ANNIV_KEY, []);
    let html = '<div class="x-list">';
    if (!list.length) html += '<div class="x-empty">还没有纪念日</div>';
    list.forEach(function (a) {
      html += '<div class="x-list-item" data-id="' + a.id + '">' +
        '<div class="x-main"><div class="x-title">' + escapeHtml(a.name) + '</div>' +
        '<div class="x-sub">' + a.date + ' · ' + daysUntil(a.date) + '</div></div>' +
        '<button class="x-icon-btn anniv-send" title="发送到聊天"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg></button>' +
        '<button class="x-icon-btn anniv-del" title="删除"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg></button>' +
        '</div>';
    });
    html += '</div>' +
      '<input class="x-input" id="annivName" placeholder="纪念日名称" />' +
      '<input class="x-input" id="annivDate" type="date" />' +
      '<button class="x-btn x-btn-primary" id="annivAdd">新增纪念日</button>';
    openModal('纪念日', html);

    document.getElementById('annivAdd').onclick = function () {
      const name = document.getElementById('annivName').value.trim();
      const date = document.getElementById('annivDate').value;
      if (!name || !date) { showToast('请填写名称和日期'); return; }
      const list = lsGet(ANNIV_KEY, []);
      list.push({ id: uid(), name: name, date: date });
      lsSet(ANNIV_KEY, list);
      insertChatMessage({ role: 'user', type: 'anniversary', anniversary: { name: name, date: date, daysText: daysUntil(date) } });
      sendSilentInstruction('[系统动作：我标记了一个纪念日「' + name + '」（' + date + '，' + daysUntil(date) + '）]');
      renderAnniversaryList();
    };
    modalBody.querySelectorAll('.anniv-del').forEach(function (b) {
      b.onclick = function () {
        const id = b.closest('[data-id]').getAttribute('data-id');
        lsSet(ANNIV_KEY, lsGet(ANNIV_KEY, []).filter(function (a) { return a.id !== id; }));
        renderAnniversaryList();
      };
    });
    modalBody.querySelectorAll('.anniv-send').forEach(function (b) {
      b.onclick = function () {
        const id = b.closest('[data-id]').getAttribute('data-id');
        const a = lsGet(ANNIV_KEY, []).find(function (x) { return x.id === id; });
        if (!a) return;
        closeModal();
        insertChatMessage({ role: 'user', type: 'anniversary', anniversary: { name: a.name, date: a.date, daysText: daysUntil(a.date) } });
        sendSilentInstruction('[系统动作：我向你提到了纪念日「' + a.name + '」（' + a.date + '，' + daysUntil(a.date) + '）]');
      };
    });
  }

  // ============================================================
  // 功能 3：共享待办（按角色独立存储）
  // ============================================================
  function featTodo() {
    const key = 'todos_' + currentCharacter.id;

    function render() {
      const items = lsGet(key, []);
      let html = '<div class="x-list">';
      if (!items.length) html += '<div class="x-empty">暂无共享待办</div>';
      items.forEach(function (t) {
        html += '<div class="x-list-item" data-id="' + t.id + '">' +
          '<div class="x-check ' + (t.done ? 'done' : '') + '" data-act="toggle">' +
          (t.done ? '<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>' : '') +
          '</div>' +
          '<div class="x-main"><div class="x-title" style="' + (t.done ? 'text-decoration:line-through;color:#999;' : '') + '">' + escapeHtml(t.text) + '</div></div>' +
          '<button class="x-icon-btn todo-del" title="删除"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg></button>' +
          '</div>';
      });
      html += '</div>' +
        '<div class="x-row"><input class="x-input" id="todoText" placeholder="添加待办事项" />' +
        '<button class="x-btn x-btn-primary" id="todoAdd" style="flex:none;width:70px;">添加</button></div>' +
        '<button class="x-btn x-btn-ghost" id="todoSend">将当前待办发送到聊天</button>';
      openModal('共享待办', html);

      document.getElementById('todoAdd').onclick = add;
      const todoInput = document.getElementById('todoText');
      todoInput.addEventListener('keydown', function (e) { if (e.key === 'Enter') add(); });

      modalBody.querySelectorAll('[data-act="toggle"]').forEach(function (c) {
        c.onclick = function () {
          const id = c.closest('[data-id]').getAttribute('data-id');
          const items = lsGet(key, []).map(function (t) { return t.id === id ? Object.assign({}, t, { done: !t.done }) : t; });
          lsSet(key, items);
          render();
        };
      });
      modalBody.querySelectorAll('.todo-del').forEach(function (b) {
        b.onclick = function () {
          const id = b.closest('[data-id]').getAttribute('data-id');
          lsSet(key, lsGet(key, []).filter(function (t) { return t.id !== id; }));
          render();
        };
      });
      document.getElementById('todoSend').onclick = function () {
        const items = lsGet(key, []);
        if (!items.length) { showToast('暂无待办可发送'); return; }
        closeModal();
        insertChatMessage({ role: 'user', type: 'todo', todo: { items: items } });
        const doneCount = items.filter(function (i) { return i.done; }).length;
        sendSilentInstruction('[系统动作：我 shared 了我们的待办清单（共 ' + items.length + ' 项，已完成 ' + doneCount + ' 项）：' + items.map(function (i) { return (i.done ? '✓' : '○') + i.text; }).join('、') + ']');
      };
    }

    function add() {
      const text = document.getElementById('todoText').value.trim();
      if (!text) return;
      const items = lsGet(key, []);
      items.push({ id: uid(), text: text, done: false });
      lsSet(key, items);
      render();
    }

    render();
  }

  // ============================================================
  // 功能 4 / 5：语音 / 视频通话 —— 纯文本角色扮演演绎
  // 不请求麦克风/摄像头，不弹出通话界面，无任何真实硬件调用
  // ============================================================
  function featCall(mode) {
    const label = mode === 'video' ? '视频通话' : '语音通话';
    // 展示：右侧通话卡片气泡（纯 SVG 图标 + 文字）
    insertChatMessage({ role: 'user', type: 'call', call: { type: mode, text: '我发起了' + label } });
    // 演绎：隐藏指令发给 AI，由 AI 按人设决定接不接、怎么接
    sendSilentInstruction('[系统动作：我向你发起了' + label + '，请根据你的人设和当前关系自然地回应这个通话邀请]');
  }

  // ============================================================
  // 功能 6：特别时刻
  // ============================================================
  // 特别时刻使用专属键：不能与「空间」页(moments.html)的朋友圈动态共用 'moments'
  // （两者数据结构不同：{title,content,date} vs {author,content,image,time...}，共用会互相污染）
  const MOMENT_KEY = 'chat_special_moments';
  const LEGACY_MOMENT_KEY = 'moments'; // 旧冲突键，仅用于一次性数据迁移

  function loadMomentList() {
    const list = lsGet(MOMENT_KEY, null);
    if (Array.isArray(list)) return list;
    // 一次性迁移：把此前误存进空间页 moments 键里的特别时刻（按 title 字段识别）搬到专属键
    const legacy = lsGet(LEGACY_MOMENT_KEY, []);
    if (Array.isArray(legacy) && legacy.length && legacy.some(function (m) { return m && m.title; })) {
      const migrated = legacy.filter(function (m) { return m && m.title; });
      lsSet(MOMENT_KEY, migrated);
      return migrated;
    }
    return [];
  }

  function featMoment() {
    function render() {
      const list = loadMomentList();
      let html = '<div class="x-list">';
      if (!list.length) html += '<div class="x-empty">还没有特别时刻</div>';
      list.forEach(function (m) {
        html += '<div class="x-list-item" data-id="' + m.id + '">' +
          '<div class="x-main"><div class="x-title">' + escapeHtml(m.title) + '</div>' +
          '<div class="x-sub">' + (m.date || '') + ' · ' + escapeHtml(m.content || '').slice(0, 20) + '</div></div>' +
          '<button class="x-icon-btn mom-send" title="发送到聊天"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg></button>' +
          '<button class="x-icon-btn mom-del" title="删除"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg></button>' +
          '</div>';
      });
      html += '</div>' +
        '<input class="x-input" id="momTitle" placeholder="标题" />' +
        '<input class="x-input" id="momDate" type="date" />' +
        '<textarea class="x-textarea" id="momContent" placeholder="内容..."></textarea>' +
        '<button class="x-btn x-btn-primary" id="momAdd">记录这个时刻</button>';
      openModal('特别时刻', html);

      document.getElementById('momAdd').onclick = function () {
        const title = document.getElementById('momTitle').value.trim();
        const content = document.getElementById('momContent').value.trim();
        const date = document.getElementById('momDate').value;
        if (!title) { showToast('请填写标题'); return; }
        const list = loadMomentList();
        list.push({ id: uid(), title: title, content: content, date: date });
        lsSet(MOMENT_KEY, list);
        closeModal();
        insertChatMessage({ role: 'user', type: 'moment', moment: { title: title, content: content, date: date } });
        sendSilentInstruction('[系统动作：我记录了一个特别时刻「' + title + '」' + (content ? '：' + content : '') + (date ? '（' + date + '）' : '') + ']');
      };
      modalBody.querySelectorAll('.mom-del').forEach(function (b) {
        b.onclick = function () {
          const id = b.closest('[data-id]').getAttribute('data-id');
          lsSet(MOMENT_KEY, loadMomentList().filter(function (m) { return m.id !== id; }));
          render();
        };
      });
      modalBody.querySelectorAll('.mom-send').forEach(function (b) {
        b.onclick = function () {
          const id = b.closest('[data-id]').getAttribute('data-id');
          const m = loadMomentList().find(function (x) { return x.id === id; });
          if (!m) return;
          closeModal();
          insertChatMessage({ role: 'user', type: 'moment', moment: { title: m.title, content: m.content, date: m.date } });
          sendSilentInstruction('[系统动作：我向你分享了特别时刻「' + m.title + '」' + (m.content ? '：' + m.content : '') + ']');
        };
      });
    }
    render();
  }

  // ---------- 分发 ----------
  function handleFeature(feat) {
    switch (feat) {
      case 'location': featLocation(); break;
      case 'anniversary': renderAnniversaryList(); break;
      case 'todo': featTodo(); break;
      case 'voice': featCall('voice'); break;
      case 'video': featCall('video'); break;
      case 'moment': featMoment(); break;
    }
  }
})();
