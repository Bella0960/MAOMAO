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
    else if (payOverlay && payOverlay.classList.contains('active')) closePayDrawer();
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
  // 功能 4 / 5：语音 / 视频通话
  // 语音跳 call-ui.html（白卡接听 UI）；视频跳 call.html（全屏模拟）
  // 不调用真实麦克风/摄像头；视频挂断后仅插入通话卡片，不发 AI 指令
  // ============================================================
  function featCall(mode) {
    // 语音：跳转白卡接听 UI（call-ui.html）；视频：跳转全屏模拟通话页（call.html）
    if (typeof currentCharacter === 'undefined' || !currentCharacter || !currentCharacter.id) return;
    var cid = encodeURIComponent(currentCharacter.id);
    if (mode === 'video') {
      window.location.href = 'call.html?id=' + cid + '&type=video';
    } else {
      window.location.href = 'call-ui.html?roleId=' + cid;
    }
  }

  // ---------- 通话返回：读取 sessionStorage 结果，插入一张通话卡（不发 AI 指令） ----------
  // 语音 call-ui.html 与视频 call.html 挂断时都会写 call_result_<roleId>，此处统一消费
  function formatCallDuration(sec) {
    function p(n) { return n < 10 ? '0' + n : '' + n; }
    return p(Math.floor(sec / 60)) + ':' + p(sec % 60);
  }
  function consumeCallResult() {
    if (typeof currentCharacter === 'undefined' || !currentCharacter || !currentCharacter.id) return;
    var key = 'call_result_' + currentCharacter.id;
    var raw = null;
    try { raw = sessionStorage.getItem(key); } catch (e) { return; }
    if (!raw) return;
    try { sessionStorage.removeItem(key); } catch (e) {} // 读完即清，刷新不重复插入
    var result = null;
    try { result = JSON.parse(raw); } catch (e) { return; }
    if (!result || (result.type !== 'voice' && result.type !== 'video')) return;
    var text = result.connected
      ? '通话时长 ' + formatCallDuration(result.duration || 0)
      : '已取消';
    insertChatMessage({ role: 'user', type: 'call', call: { type: result.type, text: text } });
  }
  window.addEventListener('load', consumeCallResult);

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

  // ---------- 重玩/重新生成 ----------
  const regenOverlay = document.getElementById('regenOverlay');
  const regenMask = document.getElementById('regenMask');
  const regenInput = document.getElementById('regenInput');
  const regenCancel = document.getElementById('regenCancel');
  const regenConfirm = document.getElementById('regenConfirm');

  function openRegen() {
    if (!regenOverlay) return;
    regenInput.value = '';
    regenOverlay.style.display = 'flex';
  }
  function closeRegen() {
    if (regenOverlay) regenOverlay.style.display = 'none';
  }
  if (regenMask) regenMask.addEventListener('click', closeRegen);
  if (regenCancel) regenCancel.addEventListener('click', closeRegen);
  if (regenConfirm) regenConfirm.addEventListener('click', function () {
    var dir = regenInput.value.trim();
    closeRegen();
    if (typeof window.regenerateReply === 'function') {
      window.regenerateReply(dir);
    }
  });

  // ---------- 分发 ----------
  function handleFeature(feat) {
    switch (feat) {
      case 'regenerate': openRegen(); break;
      case 'location': featLocation(); break;
      case 'anniversary': renderAnniversaryList(); break;
      case 'todo': featTodo(); break;
      case 'voice': featCall('voice'); break;
      case 'video': featCall('video'); break;
      case 'moment': featMoment(); break;
      case 'redpacket': featRedpacket(); break;
      case 'transfer': featTransfer(); break;
    }
  }

  // ============================================================
  // 功能 7 / 8：发红包 / 转账（第一阶段：UI 入口 + 消息数据结构，
  // 不调用 sendMsg、不发任何 AI 请求，下一轮再做专属气泡 UI）
  // ============================================================
  const payOverlay = document.getElementById('payDrawerOverlay');
  const payBackdrop = document.getElementById('payDrawerBackdrop');
  const payTitle = document.getElementById('payDrawerTitle');
  const payAmountInput = document.getElementById('payAmount');
  const payMessageInput = document.getElementById('payMessage');
  const payConfirmBtn = document.getElementById('payConfirmBtn');
  const PAY_DEFAULT_MESSAGE = '恭喜发财，大吉大利';
  let payMode = 'redpacket'; // 当前抽屉模式：'redpacket' | 'transfer'

  function openPayDrawer(mode) {
    payMode = mode === 'transfer' ? 'transfer' : 'redpacket';
    if (payTitle) payTitle.textContent = payMode === 'transfer' ? '转账' : '发红包';
    if (payAmountInput) payAmountInput.value = '';
    if (payMessageInput) payMessageInput.value = PAY_DEFAULT_MESSAGE;
    if (payConfirmBtn) payConfirmBtn.textContent = payMode === 'transfer' ? '确认转账' : '塞钱进红包';
    if (payOverlay) payOverlay.classList.add('active');
  }

  function closePayDrawer() {
    if (payOverlay) payOverlay.classList.remove('active');
  }

  // 金额输入框：只允许数字与一个小数点，小数最多两位
  if (payAmountInput) {
    payAmountInput.addEventListener('input', function () {
      var v = payAmountInput.value;
      v = String(v).replace(/[^\d.]/g, ''); // 清掉一切非数字/小数点字符
      var dotIdx = v.indexOf('.');
      if (dotIdx !== -1) {
        v = v.slice(0, dotIdx + 1) + v.slice(dotIdx + 1).replace(/\./g, ''); // 只保留第一个小数点
      }
      var parts = v.split('.');
      if (parts[1] && parts[1].length > 2) parts[1] = parts[1].slice(0, 2); // 小数位最多两位
      payAmountInput.value = parts.join('.');
    });
  }
  if (payBackdrop) payBackdrop.addEventListener('click', closePayDrawer);

  // 提交：构造特殊格式消息直接入历史，不走 sendMsg / 不发任何 API
  function submitPayMessage() {
    if (typeof loadMessages !== 'function' || typeof saveMessages !== 'function') return;
    var amountStr = String((payAmountInput && payAmountInput.value) || '').trim();
    var amountNum = parseFloat(amountStr);
    if (!amountStr || isNaN(amountNum) || amountNum <= 0) {
      if (typeof showToast === 'function') showToast('请输入金额');
      return;
    }
    var msgText = String((payMessageInput && payMessageInput.value) || PAY_DEFAULT_MESSAGE).trim();
    // 发送即扣款（修复资金漏洞）：余额不足阻止发送，绝不先发红包后扣款
    if (typeof getWorkData === 'function' && typeof saveWorkData === 'function') {
      var wd = getWorkData();
      if (!(wd.balance >= amountNum)) {
        if (typeof showToast === 'function') showToast('余额不足');
        return; // 不写消息、不关抽屉、不扣款
      }
      wd.balance = Math.round((wd.balance - amountNum) * 100) / 100; // 保留两位防浮点误差
      // 交易明细：支出记录（amountNum 已是 parseFloat 后的数字，与扣款同一次写入原子落盘）
      if (!Array.isArray(wd.history)) wd.history = [];
      wd.history.unshift({
        type: 'expense',
        category: payMode,                              // 'redpacket' | 'transfer'
        title: payMode === 'transfer' ? '发起转账' : '发出红包',
        amount: amountNum,
        time: Date.now()
      });
      if (!saveWorkData(wd)) return; // 扣款保存失败则中止发送
    }
    var specialMsg = {
      role: 'user',
      type: payMode,                    // 'redpacket' 或 'transfer'
      amount: amountNum.toFixed(2),     // 统一两位小数，如 '100.00'
      message: msgText,                 // 留言内容
      status: 'unopened',               // 初始状态为未领取
      timestamp: Date.now()
    };
    var list = loadMessages();
    list.push(specialMsg);
    saveMessages(list);
    closePayDrawer();
    // 立刻刷新聊天列表，让新消息以 [红包]/[转账] 占位文本渲染出来
    if (typeof renderAllMessages === 'function') {
      renderAllMessages();
    } else if (typeof appendMessageToDOM === 'function') {
      appendMessageToDOM(specialMsg);
      if (chatMessages) chatMessages.scrollTop = chatMessages.scrollHeight;
    }
  }
  if (payConfirmBtn) payConfirmBtn.addEventListener('click', submitPayMessage);

  function featRedpacket() { openPayDrawer('redpacket'); }
  function featTransfer() { openPayDrawer('transfer'); }
})();
