const STORAGE_KEY = 'ai_custom_characters';
const CURRENT_CONTACT_KEY = 'phone_current_contact';
const LEGACY_CONTACT_KEY = 'currentPhoneContactId';

const DEFAULT_ROLES = [];

// 获取当前选中的角色 ID
function getCurrentPhoneContactId() {
    try {
        var v = localStorage.getItem(CURRENT_CONTACT_KEY);
        if (v) return v;
        // 兼容旧键（一次性迁移到与 PhoneStorage 一致的键名）
        var legacy = localStorage.getItem(LEGACY_CONTACT_KEY);
        if (legacy) {
            localStorage.setItem(CURRENT_CONTACT_KEY, legacy);
            localStorage.removeItem(LEGACY_CONTACT_KEY);
            return legacy;
        }
        return null;
    } catch (e) {
        return null;
    }
}

// 获取当前选中的角色对象
function getCurrentPhoneContact() {
    const roleId = getCurrentPhoneContactId();
    if (!roleId) return null;
    const roles = loadRoles();
    return roles.find(r => String(r.id) === String(roleId)) || null;
}

// 选择角色并进入小手机首页
function selectRoleAndEnterPhone(roleId) {
    if (!roleId) return;
    try {
        localStorage.setItem(CURRENT_CONTACT_KEY, roleId);
    } catch (e) {
        console.error('保存当前角色失败:', e);
    }
    // 尊重来源：from=contacts 回通讯录，否则回主页
    var params = new URLSearchParams(window.location.search);
    var from = params.get('from');
    window.location.href = from === 'contacts' ? '/chat/contacts/contacts.html' : '/index.html';
}

const AVATAR_COLORS = [
    '#FF6B81', '#3B9EFF', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#6366F1', '#14B8A6'
];

let selectedColor = AVATAR_COLORS[0];
let avatarDataUrl = ''; // 当前待保存头像
let selectedWorldBookIds = []; // 当前编辑会话中勾选的世界书 ID
let currentDraftKey = '';
let editorOriginalState = null;
let pendingDraftRecovery = null;
let cropSourceImage = null;
let cropBaseScale = 1;
let cropZoom = 1;
let cropOffsetX = 0;
let cropOffsetY = 0;
let cropPointer = null;
let saveStatusTimer = null;

// 读取世界书列表（phone_worldbooks），只读不写，异常/脏数据一律兜底为空数组
function loadWorldBooks() {
    try {
        const raw = localStorage.getItem('phone_worldbooks');
        if (!raw) return [];
        const arr = JSON.parse(raw);
        if (!Array.isArray(arr)) return [];
        return arr.filter(b => b && typeof b === 'object' && b.id != null && String(b.title || '').trim() !== '');
    } catch (e) {
        return [];
    }
}

// 渲染「绑定世界书」多选列表；selectedIds 为当前角色已勾选的世界书 ID 数组
function renderWorldBookBinder(selectedIds) {
    const container = document.getElementById('worldBookBindList');
    if (!container) return;
    const wanted = Array.isArray(selectedIds) ? selectedIds.map(String) : [];

    const books = loadWorldBooks();
    if (!books.length) {
        selectedWorldBookIds = [];
        container.innerHTML = '<div class="wb-bind-empty">暂无世界书，请先在世界书页面创建</div>';
        return;
    }

    // 仅保留「仍存在的世界书」ID，自动剔除已被删除的失效绑定
    const existingIds = books.map(b => String(b.id));
    selectedWorldBookIds = wanted.filter(id => existingIds.indexOf(id) !== -1);

    container.innerHTML = books.map(book => {
        const id = String(book.id);
        const checked = selectedWorldBookIds.indexOf(id) !== -1;
        const title = String(book.title || '未命名世界书');
        return `
            <div class="wb-bind-item${checked ? ' is-checked' : ''}" data-book-id="${escapeHtml(id)}" role="checkbox" aria-checked="${checked}" tabindex="0">
                <span class="wb-bind-name">${escapeHtml(title)}</span>
                <span class="wb-bind-circle" aria-hidden="true"></span>
            </div>
        `;
    }).join('');
}

// 面板级事件委托：点击行切换勾选（容器在脚本执行时已存在，直接绑定一次）
const worldBookBindListEl = document.getElementById('worldBookBindList');
if (worldBookBindListEl) {
    worldBookBindListEl.addEventListener('click', function (e) {
        const item = e.target.closest ? e.target.closest('.wb-bind-item') : null;
        if (!item || !worldBookBindListEl.contains(item)) return;
        const id = item.getAttribute('data-book-id');
        const idx = selectedWorldBookIds.indexOf(id);
        if (idx === -1) {
            selectedWorldBookIds.push(id);
        } else {
            selectedWorldBookIds.splice(idx, 1);
        }
        item.classList.toggle('is-checked', idx === -1);
        item.setAttribute('aria-checked', idx === -1 ? 'true' : 'false');
    });
}

function getRandomColor() {
    return AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)];
}

function loadRoles() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
    } catch (e) {
        console.error('读取角色数据异常:', e);
    }
    saveRoles(DEFAULT_ROLES);
    return DEFAULT_ROLES;
}

function saveRoles(roles) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(roles));
        return true;
    } catch (e) {
        console.error('保存角色数据异常:', e);
        return false;
    }
}

function escapeHtml(str) {
    return (str || '').replace(/[&<>"']/g, m => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    })[m]);
}

function renderRoleList() {
    const container = document.getElementById('roleListContainer');
    const roles = loadRoles();

    if (!roles || roles.length === 0) {
        container.innerHTML = '<div class="empty-tip">暂无角色，点击右上角"+ 添加角色"</div>';
        return;
    }

    const currentId = getCurrentPhoneContactId();

    container.innerHTML = roles.map(role => {
        const isCurrent = String(role.id) === String(currentId);
        const avatarHTML = role.avatar
            ? `<img class="slim-avatar" src="${role.avatar}" style="object-fit: cover;" alt="">`
            : `<div class="slim-avatar"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#555" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg></div>`;

        return `
            <div class="role-slim-bar ${isCurrent ? 'active-role' : ''}" data-id="${role.id}" onclick="openEditRole('${role.id}')">
                <div class="bar-left">
                    ${avatarHTML}
                    <div class="slim-meta">
                        <div class="slim-name-row">
                            <span class="slim-name">${escapeHtml(role.name)}</span>
                            ${isCurrent ? '<span class="slim-tag">使用中</span>' : ''}
                        </div>
                        <span class="slim-desc">${escapeHtml(role.persona || '暂无角色卡资料')}</span>
                    </div>
                </div>
                <div class="bar-right">
                    ${isCurrent ? '' : '<button class="act-opt btn-use" onclick="event.stopPropagation(); selectRoleAndEnterPhone(\'' + role.id + '\')" type="button">使用</button>'}
                    <button class="act-opt del btn-delete" onclick="event.stopPropagation(); handleDeleteRole('${role.id}')" type="button">删除</button>
                </div>
            </div>
        `;
    }).join('');
}

function handleRoleCardClick(event, roleId) {
    selectRoleAndEnterPhone(roleId);
}

// ====== 头像上传与 Canvas 压缩 ======
function handleAvatarUpload(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    e.target.value = '';
    if (!/^image\//i.test(file.type || '')) {
        setSaveStatus('这不是可识别的图片文件，请重新选择。', 'error');
        return;
    }
    if (file.size > 12 * 1024 * 1024) {
        setSaveStatus('图片超过 12MB，请选择较小的图片。', 'error');
        return;
    }
    const reader = new FileReader();
    reader.onerror = function() {
        setSaveStatus('图片读取失败，请重试。', 'error');
    };
    reader.onload = function(ev) {
        const img = new Image();
        img.onerror = function() {
            setSaveStatus('图片无法读取，请换一张照片。', 'error');
        };
        img.onload = function() {
            cropSourceImage = img;
            cropZoom = 1;
            cropOffsetX = 0;
            cropOffsetY = 0;
            cropBaseScale = Math.max(260 / img.naturalWidth, 260 / img.naturalHeight);
            const zoom = document.getElementById('portraitZoom');
            if (zoom) zoom.value = '100';
            updateCropZoomLabel();
            drawPortraitCrop();
            const studio = document.getElementById('portraitStudio');
            if (studio) studio.classList.remove('hidden');
        };
        img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
}

function updateCropZoomLabel() {
    const output = document.getElementById('portraitZoomValue');
    if (output) output.textContent = Math.round(cropZoom * 100) + '%';
}

function drawPortraitCrop() {
    const canvas = document.getElementById('portraitCropCanvas');
    if (!canvas || !cropSourceImage) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const logicalSize = 300;
    ctx.setTransform(2, 0, 0, 2, 0, 0);
    ctx.clearRect(0, 0, logicalSize, logicalSize);
    ctx.fillStyle = '#E7E6E2';
    ctx.fillRect(0, 0, logicalSize, logicalSize);
    const scale = cropBaseScale * cropZoom * (logicalSize / 260);
    const width = cropSourceImage.naturalWidth * scale;
    const height = cropSourceImage.naturalHeight * scale;
    ctx.drawImage(cropSourceImage, (logicalSize - width) / 2 + cropOffsetX * (logicalSize / 260),
        (logicalSize - height) / 2 + cropOffsetY * (logicalSize / 260), width, height);
}

function confirmPortraitCrop() {
    const canvas = document.getElementById('portraitCropCanvas');
    if (!canvas || !cropSourceImage) return;
    try {
        const output = document.createElement('canvas');
        output.width = 200;
        output.height = 200;
        const ctx = output.getContext('2d');
        if (!ctx) throw new Error('canvas unavailable');
        ctx.drawImage(canvas, 0, 0, 600, 600, 0, 0, 200, 200);
        avatarDataUrl = output.toDataURL('image/jpeg', 0.88);
        updateAvatarPreview();
        const studio = document.getElementById('portraitStudio');
        if (studio) studio.classList.add('hidden');
        cropSourceImage = null;
        persistEditorDraft();
        setSaveStatus('头像已加入待保存资料', 'info');
    } catch (err) {
        console.error('头像裁切失败:', err);
        setSaveStatus('头像处理失败，原头像未更改。请重试。', 'error');
    }
}

function cancelPortraitCrop() {
    const studio = document.getElementById('portraitStudio');
    if (studio) studio.classList.add('hidden');
    cropSourceImage = null;
    const input = document.getElementById('avatarFileInput');
    if (input) input.value = '';
}

function updateAvatarPreview() {
    const preview = document.getElementById('editAvatarPreview');
    if (!preview) return;

    if (avatarDataUrl) {
        preview.innerHTML = '';
        preview.style.backgroundImage = `url(${avatarDataUrl})`;
        preview.style.backgroundSize = 'cover';
        preview.style.backgroundPosition = 'center';
        preview.style.backgroundColor = '';
    } else {
        preview.innerHTML = '<svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#A0A0A0" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 4-6 8-6s8 2 8 6"/></svg>';
        preview.style.backgroundImage = '';
        preview.style.backgroundColor = '#EDEDF2';
    }
}

// 切换视图
function showView(view) {
    const listView = document.getElementById('listView');
    const editorView = document.getElementById('editorView');
    if (view === 'editor') {
        listView.classList.add('hidden');
        editorView.classList.remove('hidden');
    } else {
        editorView.classList.add('hidden');
        listView.classList.remove('hidden');
        renderRoleList();
    }
}

// 打开添加角色
function openAddRole() {
    document.getElementById('editorTitle').textContent = 'New Character';
    document.getElementById('editRoleId').value = '';
    document.getElementById('editRoleName').value = '';
    document.getElementById('editRolePersona').value = '';
    document.getElementById('editRoleTone').value = '';
    selectedColor = getRandomColor();
    avatarDataUrl = '';
    updateAvatarPreview();
    renderWorldBookBinder([]);   // 新角色默认不绑定任何世界书
    currentDraftKey = getDraftKey('');
    editorOriginalState = captureEditorState();
    showView('editor');
    offerDraftRecovery();
}

// 打开编辑旧角色
function openEditRole(id) {
    const roles = loadRoles();
    const target = roles.find(r => r.id === id);
    if (!target) return;

    document.getElementById('editorTitle').textContent = 'Edit Character';
    document.getElementById('editRoleId').value = target.id;
    document.getElementById('editRoleName').value = target.name || '';
    document.getElementById('editRolePersona').value = target.persona || '';
    document.getElementById('editRoleTone').value = target.tone || '';
    selectedColor = target.avatarBg || AVATAR_COLORS[0];
    avatarDataUrl = target.avatar || '';
    updateAvatarPreview();
    // 回填已绑定的世界书：老角色无该字段时按空数组处理；已被删除的书因不在列表中不会被勾选
    renderWorldBookBinder(Array.isArray(target.worldBookIds) ? target.worldBookIds : []);
    currentDraftKey = getDraftKey(target.id);
    editorOriginalState = captureEditorState();
    showView('editor');
    offerDraftRecovery();
}

// 保存角色：仅在本地存储确认成功后显示成功状态，并留在当前编辑页
function handleSaveRole() {
    const roleId = document.getElementById('editRoleId').value.trim();
    const nameVal = document.getElementById('editRoleName').value.trim();
    const personaVal = document.getElementById('editRolePersona').value;
    const toneVal = document.getElementById('editRoleTone').value;

    if (!nameVal) {
        setSaveStatus('请先填写角色名称。', 'error');
        document.getElementById('editRoleName').focus();
        return;
    }

    const roles = loadRoles();
    let savedRoleId = roleId;

    if (roleId) {
        const target = roles.find(r => String(r.id) === String(roleId));
        if (!target) {
            setSaveStatus('找不到当前角色，未保存任何修改。', 'error');
            return;
        }
        target.name = nameVal;
        target.persona = personaVal;
        target.tone = toneVal;
        target.avatar = avatarDataUrl || '';
        target.avatarBg = selectedColor;
        target.worldBookIds = selectedWorldBookIds.slice();
    } else {
        savedRoleId = 'role_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
        roles.unshift({
            id: savedRoleId,
            name: nameVal,
            avatar: avatarDataUrl || '',
            avatarBg: selectedColor,
            persona: personaVal,
            tone: toneVal,
            worldBookIds: selectedWorldBookIds.slice()
        });
    }

    if (!saveRoles(roles)) {
        setSaveStatus('保存失败：浏览器可能没有可用存储空间。修改仍保留，请重试。', 'error');
        persistEditorDraft(true);
        return;
    }

    const oldDraftKey = currentDraftKey;
    document.getElementById('editRoleId').value = savedRoleId;
    document.getElementById('editorTitle').textContent = 'Edit Character';
    currentDraftKey = getDraftKey(savedRoleId);
    if (oldDraftKey && oldDraftKey !== currentDraftKey) {
        try { localStorage.removeItem(oldDraftKey); } catch (e) {}
    }
    if (currentDraftKey) {
        try { localStorage.removeItem(currentDraftKey); } catch (e) {}
    }
    editorOriginalState = captureEditorState();
    setSaveStatus('已保存', 'success');
}


// 删除角色
function handleDeleteRole(id) {
    const roles = loadRoles();
    const target = roles.find(r => r.id === id);
    if (!target) return;

    const confirmed = confirm(`确定要删除角色"${target.name}"吗？`);
    if (!confirmed) return;

    const updatedRoles = roles.filter(r => r.id !== id);
    saveRoles(updatedRoles);

    if (getCurrentPhoneContactId() === id) {
        localStorage.removeItem(CURRENT_CONTACT_KEY);
        localStorage.removeItem(LEGACY_CONTACT_KEY);
    }

    renderRoleList();
}

// ====== 草稿、保存反馈与编辑状态 ======
function getDraftKey(roleId) {
    return 'maomao_character_draft_v1:' + (roleId ? String(roleId) : 'new');
}

function captureEditorState() {
    return {
        roleId: document.getElementById('editRoleId').value.trim(),
        name: document.getElementById('editRoleName').value,
        persona: document.getElementById('editRolePersona').value,
        tone: document.getElementById('editRoleTone').value,
        avatar: avatarDataUrl || '',
        avatarBg: selectedColor,
        worldBookIds: selectedWorldBookIds.slice()
    };
}

function editorStatesEqual(a, b) {
    return JSON.stringify(a) === JSON.stringify(b);
}

function setSaveStatus(message, state) {
    const el = document.getElementById('saveStatus');
    if (!el) return;
    if (saveStatusTimer) clearTimeout(saveStatusTimer);
    el.textContent = message || '';
    el.dataset.state = state || 'info';
    el.style.opacity = message ? '1' : '0';
    if (state === 'success' || (state === 'info' && message !== '未保存')) {
        saveStatusTimer = setTimeout(() => {
            if (el.textContent === message) {
                el.style.opacity = '0';
                setTimeout(() => { if (el.style.opacity === '0') el.textContent = ''; }, 280);
            }
        }, 2200);
    }
}

function persistEditorDraft(force) {
    if (!currentDraftKey) return;
    const state = captureEditorState();
    if (!force && editorOriginalState && editorStatesEqual(state, editorOriginalState)) {
        try { localStorage.removeItem(currentDraftKey); } catch (e) {}
        return;
    }
    const draft = { version: 1, savedAt: Date.now(), state: state };
    try {
        localStorage.setItem(currentDraftKey, JSON.stringify(draft));
    } catch (e) {
        console.warn('角色草稿暂存失败:', e);
        setSaveStatus('草稿暂存失败，请尽快手动保存。', 'error');
    }
}

function applyEditorState(state) {
    if (!state || typeof state !== 'object') return;
    document.getElementById('editRoleName').value = state.name || '';
    document.getElementById('editRolePersona').value = state.persona || '';
    document.getElementById('editRoleTone').value = state.tone || '';
    avatarDataUrl = state.avatar || '';
    selectedColor = state.avatarBg || AVATAR_COLORS[0];
    selectedWorldBookIds = Array.isArray(state.worldBookIds) ? state.worldBookIds.map(String) : [];
    updateAvatarPreview();
    renderWorldBookBinder(selectedWorldBookIds);
}

function offerDraftRecovery() {
    if (!currentDraftKey) return false;
    let draft = null;
    try {
        const raw = localStorage.getItem(currentDraftKey);
        if (raw) draft = JSON.parse(raw);
    } catch (e) {
        console.warn('读取角色草稿失败:', e);
        try { localStorage.removeItem(currentDraftKey); } catch (_) {}
    }
    if (!draft || draft.version !== 1 || !draft.state) return false;
    const base = editorOriginalState || captureEditorState();
    if (editorStatesEqual(draft.state, base)) {
        try { localStorage.removeItem(currentDraftKey); } catch (e) {}
        return false;
    }
    pendingDraftRecovery = { draft: draft, base: base };
    const dialog = document.getElementById('recoveryDialog');
    const copy = document.getElementById('recoveryCopy');
    if (copy) {
        const parts = [];
        if (draft.state.name !== base.name || draft.state.persona !== base.persona || draft.state.tone !== base.tone) parts.push('文字资料');
        if ((draft.state.avatar || '') !== (base.avatar || '')) parts.push('待确认头像');
        if (JSON.stringify(draft.state.worldBookIds || []) !== JSON.stringify(base.worldBookIds || [])) parts.push('世界书绑定');
        copy.textContent = '检测到上次未正式保存的' + (parts.length ? parts.join('、') : '角色资料') + '。是否恢复这份草稿？';
    }
    if (dialog) dialog.classList.remove('hidden');
    return true;
}

function closeRecoveryDialog() {
    const dialog = document.getElementById('recoveryDialog');
    if (dialog) dialog.classList.add('hidden');
    pendingDraftRecovery = null;
}

function recoverPendingDraft() {
    if (!pendingDraftRecovery) return;
    applyEditorState(pendingDraftRecovery.draft.state);
    closeRecoveryDialog();
    persistEditorDraft(true);
    setSaveStatus('草稿已恢复，保存后才会正式生效。', 'info');
}

function discardPendingDraft() {
    if (!currentDraftKey) return;
    try { localStorage.removeItem(currentDraftKey); } catch (e) {}
    if (pendingDraftRecovery) applyEditorState(pendingDraftRecovery.base);
    closeRecoveryDialog();
    setSaveStatus('', 'info');
}

function handleCancelEdit() {
    const current = captureEditorState();
    const dirty = editorOriginalState && !editorStatesEqual(current, editorOriginalState);
    if (dirty) {
        const shouldDiscard = confirm('当前有尚未保存的修改。放弃本次全部修改并返回角色列表吗？');
        if (!shouldDiscard) return;
    }
    if (currentDraftKey) {
        try { localStorage.removeItem(currentDraftKey); } catch (e) {}
    }
    closeRecoveryDialog();
    showView('list');
}

document.getElementById('btnAddRole').addEventListener('click', openAddRole);
document.getElementById('btnCancelEdit').addEventListener('click', handleCancelEdit);
document.getElementById('btnSaveRole').addEventListener('click', handleSaveRole);
['editRoleName', 'editRolePersona', 'editRoleTone'].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('input', function() {
        if (!avatarDataUrl) updateAvatarPreview();
        setSaveStatus('未保存', 'info');
        persistEditorDraft();
    });
});
document.getElementById('worldBookBindList').addEventListener('click', function() {
    persistEditorDraft();
    setSaveStatus('未保存', 'info');
});
document.getElementById('avatarBubbleWrapper').addEventListener('click', function() {
    document.getElementById('avatarFileInput').click();
});
document.getElementById('avatarFileInput').addEventListener('change', handleAvatarUpload);
document.getElementById('portraitZoom').addEventListener('input', function() {
    cropZoom = Number(this.value) / 100;
    updateCropZoomLabel();
    drawPortraitCrop();
});
document.getElementById('btnCancelPortrait').addEventListener('click', cancelPortraitCrop);
document.getElementById('btnConfirmPortrait').addEventListener('click', confirmPortraitCrop);
document.getElementById('btnRecoverDraft').addEventListener('click', recoverPendingDraft);
document.getElementById('btnDiscardDraft').addEventListener('click', discardPendingDraft);

const cropCanvas = document.getElementById('portraitCropCanvas');
if (cropCanvas) {
    cropCanvas.addEventListener('pointerdown', function(e) {
        if (!cropSourceImage) return;
        cropPointer = { x: e.clientX, y: e.clientY };
        if (cropCanvas.setPointerCapture) cropCanvas.setPointerCapture(e.pointerId);
    });
    cropCanvas.addEventListener('pointermove', function(e) {
        if (!cropPointer) return;
        cropOffsetX += e.clientX - cropPointer.x;
        cropOffsetY += e.clientY - cropPointer.y;
        cropPointer = { x: e.clientX, y: e.clientY };
        drawPortraitCrop();
    });
    const stopCropDrag = () => { cropPointer = null; };
    cropCanvas.addEventListener('pointerup', stopCropDrag);
    cropCanvas.addEventListener('pointercancel', stopCropDrag);
    cropCanvas.addEventListener('lostpointercapture', stopCropDrag);
}

// 页面初始化
renderRoleList();

// ====== 列表页返回按钮：根据来源决定去哪 ======
// from=contacts → 回通讯录；其他情况（从桌面点进来）→ 回主页 index.html
(function setupBackButton() {
    var backBtn = document.querySelector('.back-circle');
    if (!backBtn) return;
    var params = new URLSearchParams(window.location.search);
    var from = params.get('from');
    if (from === 'contacts') {
        backBtn.setAttribute('href', '/chat/contacts/contacts.html');
    }
})();
