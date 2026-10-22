const API_STORAGE_KEY = 'api_settings';

// ========== 一次性迁移旧键名 ==========
(function migrateOldKeys() {
    try {
        const existing = localStorage.getItem(API_STORAGE_KEY);
        if (existing) return; // 已有新键，跳过

        const candidates = ['ai_api_config', 'aiConfig', 'apiConfig', 'api-config'];
        for (const oldKey of candidates) {
            const raw = localStorage.getItem(oldKey);
            if (raw) {
                const parsed = JSON.parse(raw);
                if (parsed) {
                    localStorage.setItem(API_STORAGE_KEY, JSON.stringify(parsed));
                    localStorage.removeItem(oldKey);
                    console.log('[迁移] 旧配置 ' + oldKey + ' → ' + API_STORAGE_KEY);
                    return;
                }
            }
        }
    } catch (e) {
        console.error('迁移旧配置失败:', e);
    }
})();

// ========== API 多方案（profiles）：一次性迁移 + 数据层 + 镜像双写 ==========
// 结构：api_profiles_v1 = [{id, name, provider, baseUrl, apiKey, model, temperature,
//                          maxTokens, topP, prompt, createdAt, updatedAt }]
//       api_active_profile = 激活方案 id
//       api_settings = 激活方案的镜像 —— chat-detail / forum / memory 等全站消费者
//       继续直接读镜像，零改动兼容；本页保存/切换时由 saveActiveProfile 同步重写。
(function migrateApiProfiles() {
    try {
        if (localStorage.getItem('api_profiles_v1')) return; // 已迁移
        var legacy = null;
        try { legacy = JSON.parse(localStorage.getItem('api_settings') || 'null'); } catch (e) {}
        legacy = (legacy && typeof legacy === 'object') ? legacy : {};
        var now = Date.now();
        var profile = {
            id: 'p' + now.toString(36),
            name: legacy.name || '默认配置',
            provider: legacy.provider || 'openai',
            baseUrl: legacy.baseUrl || 'https://api.openai.com/v1',
            apiKey: legacy.apiKey || '',
            model: legacy.model || 'gpt-3.5-turbo',
            temperature: legacy.temperature != null ? legacy.temperature : 0.7,
            maxTokens: legacy.maxTokens != null ? legacy.maxTokens : '',
            topP: legacy.topP != null ? legacy.topP : '',
            prompt: legacy.prompt || '',
            createdAt: now,
            updatedAt: now
        };
        localStorage.setItem('api_profiles_v1', JSON.stringify([profile]));
        localStorage.setItem('api_active_profile', profile.id);
        console.log('[API 设置] 旧配置已迁移到多方案结构');
    } catch (e) {
        console.error('[API 设置] 多方案迁移失败:', e);
    }
})();

function getProfiles() {
    if (window.PhoneStorage) return PhoneStorage.getApiProfiles();
    try {
        var v = JSON.parse(localStorage.getItem('api_profiles_v1'));
        return Array.isArray(v) ? v : [];
    } catch (e) { return []; }
}
function saveProfiles(list) {
    if (window.PhoneStorage) { PhoneStorage.saveApiProfiles(list); return true; }
    try { localStorage.setItem('api_profiles_v1', JSON.stringify(list || [])); return true; }
    catch (e) { return false; }
}
function getActiveProfile() {
    var list = getProfiles();
    var activeId = '';
    try {
        activeId = window.PhoneStorage ? PhoneStorage.getActiveProfileId()
                                       : (localStorage.getItem('api_active_profile') || '');
    } catch (e) {}
    for (var i = 0; i < list.length; i++) {
        if (String(list[i].id) === String(activeId)) return list[i];
    }
    return list[0] || null;   // 指针丢失时自愈到第一个方案
}
// 收集当前表单为一份字段集（保存/切换/新建共用；apiKey 允许为空——切换场景不做强校验）
function collectFormFields() {
    return {
        name: apiNameInput.value.trim() || '默认配置',
        provider: apiProviderSelect.value,
        baseUrl: (apiUrlInput.value || '').trim() || 'https://api.openai.com/v1',
        apiKey: (apiKeyInput.value || '').trim(),
        model: (apiModelInput.value || '').trim() || 'gpt-3.5-turbo',
        prompt: apiPromptInput ? apiPromptInput.value.trim() : (window.__loadedPrompt || ''),
        temperature: parseFloat(apiTemperatureInput.value) || 0.7,
        maxTokens: apiMaxTokensInput ? apiMaxTokensInput.value.trim() : '',
        topP: apiTopPInput && apiTopPInput.value !== '' ? Number(apiTopPInput.value) : '',
        memoryCount: parseInt(apiMemoryInput.value, 10) || 20,
        timeAware: apiTimeAwareInput.checked
    };
}

// 把方案对象写成 api_settings 镜像（extra 可覆盖 memoryCount/timeAware 等聊天行为项）
function writeMirrorFromProfile(profile, extra) {
    profile = profile || {};
    var mirror = {
        name: profile.name || '',
        provider: profile.provider || 'custom',
        baseUrl: profile.baseUrl || 'https://api.openai.com/v1',
        apiKey: profile.apiKey || '',
        model: profile.model || '',
        prompt: profile.prompt || '',
        temperature: profile.temperature != null ? profile.temperature : 0.7,
        maxTokens: profile.maxTokens != null ? profile.maxTokens : '',
        topP: profile.topP != null ? profile.topP : '',
        memoryCount: (extra && extra.memoryCount != null) ? extra.memoryCount : 20,
        timeAware: !(extra && extra.timeAware === false)
    };
    try { localStorage.setItem(API_STORAGE_KEY, JSON.stringify(mirror)); return true; }
    catch (e) { return false; }
}

// 把表单字段写入激活方案，并重写 api_settings 镜像；memoryCount/timeAware 是聊天行为项，仅进镜像不进方案
function saveActiveProfile(fields) {
    try {
        var list = getProfiles();
        var active = getActiveProfile();
        if (!active) {
            active = { id: 'p' + Date.now().toString(36), createdAt: Date.now() };
            list.push(active);
        }
        for (var k in fields) active[k] = fields[k];
        active.updatedAt = Date.now();
        if (!saveProfiles(list)) return false;
        if (window.PhoneStorage) PhoneStorage.setActiveProfileId(active.id);
        else try { localStorage.setItem('api_active_profile', active.id); } catch (e) {}
        return writeMirrorFromProfile(active, fields);
    } catch (e) {
        return false;
    }
}

let allModels = null;
const apiUrlInput = document.getElementById('api-url');
const apiKeyInput = document.getElementById('api-key');
const apiModelInput = document.getElementById('api-model');
const apiPromptInput = document.getElementById('api-prompt');
const keyError = document.getElementById('key-error');
const settingsForm = document.getElementById('settingsForm');
const toastMsg = document.getElementById('toastMsg');
const apiNameInput = document.getElementById('api-name');
const apiProviderSelect = document.getElementById('api-provider');
const apiMemoryInput = document.getElementById('api-memory');
const apiTemperatureInput = document.getElementById('api-temperature');
const apiTimeAwareInput = document.getElementById('api-time-aware');

// 服务商预设（url + 默认模型）——快捷预设与下拉联动共用
const PROVIDER_PRESETS = {
    openai:      { url: 'https://api.openai.com/v1',            model: 'gpt-4o-mini' },
    deepseek:    { url: 'https://api.deepseek.com/v1',          model: 'deepseek-chat' },
    moonshot:    { url: 'https://api.moonshot.cn/v1',           model: 'moonshot-v1-8k' },
    zhipu:       { url: 'https://open.bigmodel.cn/api/paas/v4', model: 'glm-4-flash' },
    siliconflow: { url: 'https://api.siliconflow.cn/v1',        model: 'deepseek-ai/DeepSeek-V3' }
};
const PRESET_LABELS = {
    openai: 'OpenAI', deepseek: 'DeepSeek', moonshot: 'Moonshot',
    zhipu: '智谱 GLM', siliconflow: '硅基流动'
};

function showToast(text) {
    toastMsg.textContent = text;
    toastMsg.classList.add('show');
    setTimeout(() => { toastMsg.classList.remove('show'); }, 1800);
}

function toggleKeyVisibility() {
    if (!apiKeyInput) return;
    apiKeyInput.type = apiKeyInput.type === 'password' ? 'text' : 'password';
}

// 服务商下拉联动 → 自动填 Base URL + 默认模型
if (apiProviderSelect) {
    apiProviderSelect.addEventListener('change', function() {
        const preset = PROVIDER_PRESETS[this.value];
        if (preset && apiUrlInput) {
            apiUrlInput.value = preset.url;
            if (preset.model && apiModelInput) apiModelInput.value = preset.model;
        }
    });
}

// ======================= 方案条 / 快捷预设 / 参数滑块（API 面板升级） =======================
const apiMaxTokensInput = document.getElementById('api-max-tokens');
const apiTopPInput = document.getElementById('api-top-p');
const temperatureValEl = document.getElementById('api-temperature-val');
const topPValEl = document.getElementById('api-top-p-val');
const btnProfileNew = document.getElementById('btnProfileNew');
const btnProfileDelete = document.getElementById('btnProfileDelete');

// 滑块数值实时显示
function syncParamLabels() {
    if (temperatureValEl && apiTemperatureInput) temperatureValEl.textContent = apiTemperatureInput.value;
    if (topPValEl && apiTopPInput) topPValEl.textContent = apiTopPInput.value;
}

// 方案胶囊：渲染 + 点击切换（切走前静默自动保存当前表单，不弹确认）
function renderProfilePills() {
    var box = document.getElementById('profilePills');
    if (!box) return;
    var list = getProfiles();
    var active = getActiveProfile() || {};
    box.innerHTML = '';
    list.forEach(function (p) {
        var pill = document.createElement('button');
        pill.type = 'button';
        pill.className = 'profile-pill' + (String(p.id) === String(active.id) ? ' on' : '');
        pill.textContent = p.name || '未命名';
        pill.addEventListener('click', function () { switchProfile(p.id); });
        box.appendChild(pill);
    });
}

function switchProfile(id) {
    var current = getActiveProfile();
    if (!id || (current && String(current.id) === String(id))) return;
    // 静默自动保存：当前表单写回当前方案，改动不丢
    saveActiveProfile(collectFormFields());
    // 切换指针 → 重写镜像 → 回填表单
    if (window.PhoneStorage) PhoneStorage.setActiveProfileId(id);
    else try { localStorage.setItem('api_active_profile', id); } catch (e) {}
    var next = getActiveProfile();
    if (next) {
        writeMirrorFromProfile(next, {
            memoryCount: parseInt(apiMemoryInput.value, 10) || 20,
            timeAware: apiTimeAwareInput.checked
        });
    }
    loadConfig();
    syncParamLabels();
    renderProfilePills();
    resetTestMsg();
    showToast('已切换到「' + (next && next.name ? next.name : '方案') + '」');
}

// 快捷预设：一键填地址 + 模型 + 服务商，绝不动 API Key
function renderPresetChips() {
    var box = document.getElementById('presetChips');
    if (!box) return;
    box.innerHTML = '';
    Object.keys(PROVIDER_PRESETS).forEach(function (key) {
        var chip = document.createElement('button');
        chip.type = 'button';
        chip.className = 'preset-chip';
        chip.textContent = PRESET_LABELS[key] || key;
        chip.addEventListener('click', function () {
            var preset = PROVIDER_PRESETS[key];
            if (apiProviderSelect) apiProviderSelect.value = key;
            if (apiUrlInput) apiUrlInput.value = preset.url;
            if (apiModelInput && preset.model) apiModelInput.value = preset.model;
            showToast('已填入 ' + (PRESET_LABELS[key] || key) + ' 预设，Key 请自行填写');
        });
        box.appendChild(chip);
    });
}

// 新建方案：以当前表单为模板复制一份，自动切换过去
function createProfile() {
    var fields = collectFormFields();
    var list = getProfiles();
    var now = Date.now();
    var p = {
        id: 'p' + now.toString(36),
        name: (fields.name || '方案') + ' 副本',
        provider: fields.provider,
        baseUrl: fields.baseUrl,
        apiKey: fields.apiKey,
        model: fields.model,
        temperature: fields.temperature,
        maxTokens: fields.maxTokens,
        topP: fields.topP,
        prompt: fields.prompt,
        createdAt: now,
        updatedAt: now
    };
    list.push(p);
    if (!saveProfiles(list)) { showToast('新建失败：存储空间不足'); return; }
    if (window.PhoneStorage) PhoneStorage.setActiveProfileId(p.id);
    else try { localStorage.setItem('api_active_profile', p.id); } catch (e) {}
    writeMirrorFromProfile(p, { memoryCount: fields.memoryCount, timeAware: fields.timeAware });
    loadConfig();
    syncParamLabels();
    renderProfilePills();
    showToast('已新建「' + p.name + '」');
}

function deleteActiveProfile() {
    var list = getProfiles();
    if (list.length <= 1) { showToast('至少保留一个方案'); return; }
    var active = getActiveProfile();
    if (!active) return;
    if (!confirm('确定删除方案「' + (active.name || '未命名') + '」？不可恢复。')) return;
    var rest = list.filter(function (p) { return String(p.id) !== String(active.id); });
    saveProfiles(rest);
    var next = rest[0] || null;
    if (window.PhoneStorage) PhoneStorage.setActiveProfileId(next ? next.id : '');
    else try { localStorage.setItem('api_active_profile', next ? next.id : ''); } catch (e) {}
    if (next) {
        writeMirrorFromProfile(next, {
            memoryCount: parseInt(apiMemoryInput.value, 10) || 20,
            timeAware: apiTimeAwareInput.checked
        });
    }
    loadConfig();
    syncParamLabels();
    renderProfilePills();
    resetTestMsg();
    showToast('方案已删除');
}

function resetTestMsg() {
    var msgEl = document.getElementById('test-msg');
    if (msgEl) msgEl.innerText = '';
}

// ========== HTTP 状态码 → 友好中文提示（与 chat-detail 的同名函数语义一致） ==========
function friendlyHttpError(status, detail) {
    var map = {
        400: '请求格式有误',
        401: 'API Key 错误或已失效',
        403: '没有访问权限',
        404: 'API 地址或模型名不存在',
        429: '请求太频繁或额度已用尽',
        500: '服务器繁忙，请稍后再试',
        502: '服务器繁忙（网关错误）',
        503: '服务暂不可用',
        504: '服务器响应超时'
    };
    var tip = map[status] || ('HTTP ' + status);
    detail = String(detail || '').trim();
    return detail ? (tip + '｜' + detail.slice(0, 100)) : tip;
}

// ========== 测试连接 ==========
async function testConnection() {
    const apiKey = (apiKeyInput.value || '').trim();
    let baseUrl = (apiUrlInput.value || '').trim();
    const model = (apiModelInput.value || '').trim();
    const msgEl = document.getElementById('test-msg');

    if (!msgEl) return;

    if (!apiKey) { msgEl.innerText = '❌ 请先填写 API Key'; msgEl.style.color = '#ff3b30'; return; }
    if (!baseUrl) { msgEl.innerText = '❌ 请先填写 Base URL'; msgEl.style.color = '#ff3b30'; return; }
    if (!model) { msgEl.innerText = '❌ 请先填写模型名称'; msgEl.style.color = '#ff3b30'; return; }

    if (!baseUrl.endsWith('/')) baseUrl += '/';
    const testUrl = baseUrl + 'chat/completions';
    const t0 = Date.now();

    msgEl.innerText = '⏳ 正在测试连接...';
    msgEl.style.color = '#007aff';

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    try {
        const response = await fetch(testUrl, {
            method: 'POST',
            headers: {
                'Authorization': 'Bearer ' + apiKey,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: model,
                messages: [{ role: 'user', content: 'hi' }],
                max_tokens: 5
            }),
            signal: controller.signal
        });
        clearTimeout(timeoutId);

        if (response.status === 200) {
            msgEl.innerText = '✅ 连接成功 · ' + (Date.now() - t0) + 'ms · ' + model;
            msgEl.style.color = '#34c759';
            return;
        }

        let detail = '';
        try {
            const body = await response.text();
            const parsed = JSON.parse(body);
            detail = (parsed.error && parsed.error.message) ? parsed.error.message : response.statusText;
        } catch (e) {
            detail = response.statusText;
        }

        msgEl.innerText = '❌ ' + friendlyHttpError(response.status, detail);
        msgEl.style.color = '#ff3b30';
    } catch (error) {
        clearTimeout(timeoutId);
        if (error.name === 'AbortError') {
            msgEl.innerText = '❌ 请求超时，请检查网络或 API 地址';
        } else if (error.message && error.message.includes('Failed to fetch')) {
            msgEl.innerText = '❌ 网络错误（可能是跨域或地址不正确）';
        } else {
            msgEl.innerText = '❌ ' + (error.message || '未知错误');
        }
        msgEl.style.color = '#ff3b30';
    }
}

// 绑定测试连接按钮点击
const btnTestConnection = document.getElementById('btn-test-connection');
if (btnTestConnection) {
    btnTestConnection.addEventListener('click', testConnection);
}

async function fetchModels() {
    const apiKey = (apiKeyInput.value || '').trim();
    let baseUrl = (apiUrlInput.value || '').trim() || 'https://api.openai.com/v1';
    const msgEl = document.getElementById('model-fetch-msg');
    const datalist = document.getElementById('model-list');
    const fetchBtn = document.getElementById('btn-fetch-models');

    if (!apiKey) {
        if (msgEl) {
            msgEl.innerText = "❌ 请先输入 API Key";
            msgEl.style.color = "#ff3b30";
        }
        return;
    }

    // 格式化 Base URL：确保以 / 结尾
    if (!baseUrl.endsWith('/')) baseUrl += '/';
    const fetchUrl = baseUrl + 'models';

    if (msgEl) {
        msgEl.innerText = "⏳ 正在拉取模型列表...";
        msgEl.style.color = "#007aff";
        msgEl.classList.add('fetching');
    }

    if (fetchBtn) {
        fetchBtn.disabled = true;
        fetchBtn.innerText = "拉取中...";
    }

    // 15 秒超时控制
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    try {
        const response = await fetch(fetchUrl, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
            let detail = response.statusText || '请求错误';
            try {
                const body = await response.text();
                const parsed = JSON.parse(body);
                if (parsed.error && parsed.error.message) detail = parsed.error.message;
            } catch (e) {}
            throw new Error(`HTTP ${response.status} (${detail})`);
        }

        const data = await response.json();

        // 提取模型 ID 并排序
        if (data && data.data && Array.isArray(data.data)) {
            if (datalist) datalist.innerHTML = '';
            const models = data.data.map(m => m.id).filter(Boolean).sort();
            allModels = models;

            if (datalist) {
                models.forEach(modelId => {
                    const option = document.createElement('option');
                    option.value = modelId;
                    datalist.appendChild(option);
                });
            }

            if (msgEl) {
                msgEl.innerText = `✅ 获取成功，共 ${models.length} 个模型`;
                msgEl.style.color = "#34c759";
            }
        } else {
            throw new Error("返回数据缺少 data 列表");
        }
    } catch (error) {
        clearTimeout(timeoutId);
        console.error('拉取模型失败:', error);
        if (msgEl) {
            if (error.name === 'AbortError') {
                msgEl.innerText = "❌ 获取失败: 请求超时，请检查网络或 API 地址";
            } else if (error.message && error.message.includes('Failed to fetch')) {
                msgEl.innerText = "❌ 获取失败: 网络错误 (可能是跨域或地址不正确)";
            } else {
                msgEl.innerText = `❌ 获取失败: ${error.message || '网络连接异常'}`;
            }
            msgEl.style.color = "#ff3b30";
        }
    } finally {
        if (msgEl) msgEl.classList.remove('fetching');
        if (fetchBtn) {
            fetchBtn.disabled = false;
            fetchBtn.innerText = "获取";
        }
    }
}

function loadConfig() {
    try {
        const raw = localStorage.getItem(API_STORAGE_KEY);
        if (raw) {
            const parsed = JSON.parse(raw);
            if (parsed) {
                apiNameInput.value = parsed.name || '默认配置';
                apiUrlInput.value = parsed.baseUrl || 'https://api.openai.com/v1';
                apiKeyInput.value = parsed.apiKey || '';
                apiModelInput.value = parsed.model || 'gpt-3.5-turbo';
                window.__loadedPrompt = parsed.prompt || '';
                if (apiPromptInput) apiPromptInput.value = parsed.prompt || '';
                apiMemoryInput.value = parsed.memoryCount != null ? parsed.memoryCount : 20;
                apiTemperatureInput.value = parsed.temperature != null ? parsed.temperature : 0.7;
                if (apiMaxTokensInput) apiMaxTokensInput.value = parsed.maxTokens != null ? parsed.maxTokens : '';
                if (apiTopPInput) apiTopPInput.value = (parsed.topP != null && parsed.topP !== '') ? Number(parsed.topP) : 1;
                apiTimeAwareInput.checked = parsed.timeAware !== false;
                // 根据 baseUrl 反推服务商
                let matchedProvider = 'custom';
                if (parsed.baseUrl) {
                    for (const key in PROVIDER_PRESETS) {
                        if (PROVIDER_PRESETS[key].url === parsed.baseUrl) { matchedProvider = key; break; }
                    }
                }
                apiProviderSelect.value = parsed.provider || matchedProvider;
                return;
            }
        }
    } catch (e) {
        console.error('加载 API 配置异常:', e);
    }
    // 默认值
    apiNameInput.value = '默认配置';
    apiProviderSelect.value = 'openai';
    apiUrlInput.value = 'https://api.openai.com/v1';
    apiKeyInput.value = '';
    apiModelInput.value = 'gpt-3.5-turbo';
    if (apiPromptInput) apiPromptInput.value = '';
    apiMemoryInput.value = 20;
    apiTemperatureInput.value = 0.7;
    if (apiMaxTokensInput) apiMaxTokensInput.value = '';
    if (apiTopPInput) apiTopPInput.value = 1;
    apiTimeAwareInput.checked = true;
}

settingsForm.addEventListener('submit', function(e) {
    e.preventDefault();
    const apiKey = apiKeyInput.value.trim();
    if (!apiKey) {
        keyError.style.display = 'block';
        return;
    }
    keyError.style.display = 'none';

    // Max Tokens 校验：填了必须是正整数，留空 = 不限制（不发送该参数）
    var maxTokRaw = apiMaxTokensInput ? apiMaxTokensInput.value.trim() : '';
    var maxTokVal = '';
    if (maxTokRaw !== '') {
        var mtNum = Number(maxTokRaw);
        if (!isFinite(mtNum) || mtNum <= 0) {
            showToast('Max Tokens 需为正整数，或留空表示不限制');
            return;
        }
        maxTokVal = Math.floor(mtNum);
    }

    const config = {
        name: apiNameInput.value.trim() || '默认配置',
        provider: apiProviderSelect.value,
        baseUrl: apiUrlInput.value.trim() || 'https://api.openai.com/v1',
        apiKey: apiKey,
        model: apiModelInput.value.trim() || 'gpt-3.5-turbo',
        prompt: apiPromptInput ? apiPromptInput.value.trim() : (window.__loadedPrompt || ''),
        temperature: parseFloat(apiTemperatureInput.value) || 0.7,
        maxTokens: maxTokVal,
        topP: apiTopPInput && apiTopPInput.value !== '' ? Number(apiTopPInput.value) : '',
        memoryCount: parseInt(apiMemoryInput.value, 10) || 20,
        timeAware: apiTimeAwareInput.checked
    };
    // 双写：写入激活方案 + 重写 api_settings 镜像（chat-detail / forum 等读取方零改动）
    var ok = saveActiveProfile(config);
    showToast(ok === false ? '保存失败' : '保存成功');
});

// ======================= 模型选择弹窗逻辑 =======================
const modelModalOverlay = document.getElementById('modelModalOverlay');
const modelModalBackdrop = document.getElementById('modelModalBackdrop');
const modelModalClose = document.getElementById('modelModalClose');
const modelListScroll = document.getElementById('modelListScroll');

function openModelModal() {
    if (!allModels || !allModels.length) {
        const msgEl = document.getElementById('model-fetch-msg');
        if (msgEl) {
            msgEl.innerText = '请先点击"获取"拉取模型列表';
            msgEl.style.color = '#ff3b30';
        }
        return;
    }
    // 渲染列表
    modelListScroll.innerHTML = '';
    allModels.forEach(function(name) {
        var item = document.createElement('div');
        item.className = 'model-item';
        item.textContent = name;
        item.addEventListener('click', function() {
            selectModel(name);
        });
        modelListScroll.appendChild(item);
    });
    modelModalOverlay.style.display = 'flex';
}

function closeModelModal() {
    modelModalOverlay.style.display = 'none';
}

function selectModel(name) {
    apiModelInput.value = name;
    closeModelModal();
}

// 点击输入框 → 弹出列表
apiModelInput.addEventListener('click', function() {
    openModelModal();
});
// 点击遮罩关闭
if (modelModalBackdrop) {
    modelModalBackdrop.addEventListener('click', closeModelModal);
}
// 取消按钮关闭
if (modelModalClose) {
    modelModalClose.addEventListener('click', closeModelModal);
}

loadConfig();
syncParamLabels();
renderProfilePills();
renderPresetChips();

// 滑块实时数值 + 方案条按钮
if (apiTemperatureInput) apiTemperatureInput.addEventListener('input', syncParamLabels);
if (apiTopPInput) apiTopPInput.addEventListener('input', syncParamLabels);
if (btnProfileNew) btnProfileNew.addEventListener('click', createProfile);
if (btnProfileDelete) btnProfileDelete.addEventListener('click', deleteActiveProfile);

