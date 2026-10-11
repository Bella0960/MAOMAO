const STORAGE_KEY = 'ai_custom_characters';
const CURRENT_CONTACT_KEY = 'currentPhoneContactId';

const DEFAULT_ROLES = [
    { id: 'role_1', name: '宝宝', avatarBg: '#FF6B81', avatar: '', persona: '可爱的恋人，说话温柔软萌，喜欢撒娇', tone: '软萌、撒娇、喜欢用颜文字' },
    { id: 'role_2', name: '苏格拉底', avatarBg: '#3B9EFF', avatar: '', persona: '古希腊哲学家，喜欢用启发式提问引导思考', tone: '沉稳、反问式、富有哲理' },
    { id: 'role_3', name: '灵感助手', avatarBg: '#10B981', avatar: '', persona: '创意策划专家，擅长头脑风暴与文字创作', tone: '热情、条理清晰、善于鼓励' }
];

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
    window.location.href = 'index.html';
}

const AVATAR_COLORS = [
    '#FF6B81', '#3B9EFF', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#6366F1', '#14B8A6'
];

let selectedColor = AVATAR_COLORS[0];
let avatarDataUrl = ''; // 头像 base64（空串表示无图）

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
            <div class="role-slim-bar ${isCurrent ? 'active-role' : ''}" data-id="${role.id}" onclick="handleRoleCardClick(event, '${role.id}')">
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
                    <button class="act-opt btn-edit" onclick="event.stopPropagation(); openEditRole('${role.id}')" type="button">编辑</button>
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
    document.getElementById('editorTitle').textContent = '添加角色';
    document.getElementById('editRoleId').value = '';
    document.getElementById('editRoleName').value = '';
    document.getElementById('editRolePersona').value = '';
    document.getElementById('editRoleTone').value = '';
    selectedColor = getRandomColor();
    avatarDataUrl = '';
    updateAvatarPreview();
    showView('editor');
}

// 打开编辑旧角色
function openEditRole(id) {
    const roles = loadRoles();
    const target = roles.find(r => r.id === id);
    if (!target) return;

    document.getElementById('editorTitle').textContent = '编辑角色卡';
    document.getElementById('editRoleId').value = target.id;
    document.getElementById('editRoleName').value = target.name || '';
    document.getElementById('editRolePersona').value = target.persona || '';
    document.getElementById('editRoleTone').value = target.tone || '';
    selectedColor = target.avatarBg || AVATAR_COLORS[0];
    avatarDataUrl = target.avatar || '';
    updateAvatarPreview();
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
        }
    } else {
        // 新增
        const newRole = {
            id: 'role_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
            name: nameVal,
            avatar: avatarDataUrl || '',
            avatarBg: selectedColor,
            persona: personaVal,
            tone: toneVal
        };
        roles.unshift(newRole);
    }

    saveRoles(roles);
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
