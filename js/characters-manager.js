const STORAGE_KEY = 'ai_custom_characters';
const CURRENT_CONTACT_KEY = 'currentPhoneContactId';

const DEFAULT_ROLES = [];

// 获取当前选中的角色 ID
function getCurrentPhoneContactId() {
    try {
        return localStorage.getItem(CURRENT_CONTACT_KEY) || null;
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
    window.location.href = from === 'contacts' ? 'contacts.html' : 'index.html';
}

const AVATAR_COLORS = [
    '#FF6B81', '#3B9EFF', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#6366F1', '#14B8A6'
];

let selectedColor = AVATAR_COLORS[0];
let avatarDataUrl = ''; // 头像 base64（空串表示无图）
let selectedWorldBookIds = []; // 当前编辑会话中勾选的世界书 ID

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
    } catch (e) {
        console.error('保存角色数据异常:', e);
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
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(ev) {
        const img = new Image();
        img.onload = function() {
            // Canvas 200x200 居中裁剪 (cover)
            const canvas = document.createElement('canvas');
            canvas.width = 200;
            canvas.height = 200;
            const ctx = canvas.getContext('2d');
            const scale = Math.max(200 / img.width, 200 / img.height);
            const w = img.width * scale;
            const h = img.height * scale;
            const dx = (200 - w) / 2;
            const dy = (200 - h) / 2;
            ctx.drawImage(img, dx, dy, w, h);
            avatarDataUrl = canvas.toDataURL('image/jpeg', 0.85);
            updateAvatarPreview();
        };
        img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
    // 清空 input 允许重复选择同一文件
    e.target.value = '';
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
    showView('editor');
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
    showView('editor');
}

// 保存角色
function handleSaveRole() {
    const roleId = document.getElementById('editRoleId').value.trim();
    const nameVal = document.getElementById('editRoleName').value.trim();
    const personaVal = document.getElementById('editRolePersona').value;
    const toneVal = document.getElementById('editRoleTone').value;

    if (!nameVal) {
        alert('请输入角色名称！');
        document.getElementById('editRoleName').focus();
        return;
    }

    const roles = loadRoles();

    if (roleId) {
        // 编辑：保持 ID 不变
        const target = roles.find(r => r.id === roleId);
        if (target) {
            target.name = nameVal;
            target.persona = personaVal;
            target.tone = toneVal;
            if (avatarDataUrl) {
                target.avatar = avatarDataUrl;
            } else {
                target.avatar = '';
            }
            target.avatarBg = selectedColor;
            target.worldBookIds = selectedWorldBookIds.slice();
        }
    } else {
        // 新增
        const newRole = {
            id: 'role_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
            name: nameVal,
            avatar: avatarDataUrl || '',
            avatarBg: selectedColor,
            persona: personaVal,
            tone: toneVal,
            worldBookIds: selectedWorldBookIds.slice()
        };
        roles.unshift(newRole);
    }

    saveRoles(roles);

    // 尊重来源：from=contacts 时，保存后直接回通讯录（省一次点击）
    var params = new URLSearchParams(window.location.search);
    if (params.get('from') === 'contacts') {
        window.location.href = 'contacts.html';
        return;
    }
    showView('list');
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
    }

    renderRoleList();
}

// ====== 绑定事件 ======
document.getElementById('btnAddRole').addEventListener('click', openAddRole);
document.getElementById('btnCancelEdit').addEventListener('click', () => showView('list'));
document.getElementById('btnSaveRole').addEventListener('click', handleSaveRole);
document.getElementById('editRoleName').addEventListener('input', function() {
    if (!avatarDataUrl) updateAvatarPreview();
});

// 头像点击触发文件选择
document.getElementById('avatarBubbleWrapper').addEventListener('click', function() {
    document.getElementById('avatarFileInput').click();
});
document.getElementById('avatarFileInput').addEventListener('change', handleAvatarUpload);

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
        backBtn.setAttribute('href', 'contacts.html');
    }
})();
