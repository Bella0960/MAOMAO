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

// 服务商预设 Base URL 映射
const PROVIDER_PRESETS = {
    openai: 'https://api.openai.com/v1',
    deepseek: 'https://api.deepseek.com/v1',
    moonshot: 'https://api.moonshot.cn/v1',
    zhipu: 'https://open.bigmodel.cn/api/paas/v4',
    siliconflow: 'https://api.siliconflow.cn/v1'
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

// 服务商下拉联动 → 自动填 Base URL
if (apiProviderSelect) {
    apiProviderSelect.addEventListener('change', function() {
        const url = PROVIDER_PRESETS[this.value];
        if (url && apiUrlInput) {
            apiUrlInput.value = url;
        }
    });
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
            msgEl.innerText = '✅ 连接成功！';
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

        let label = 'HTTP ' + response.status;
        if (response.status === 401) label = '❌ Key 无效或余额不足';
        else if (response.status === 404) label = '❌ API 地址错误';
        else label = '❌ HTTP ' + response.status + ' (' + detail + ')';

        msgEl.innerText = label;
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
                apiTimeAwareInput.checked = parsed.timeAware !== false;
                // 根据 baseUrl 反推服务商
                let matchedProvider = 'custom';
                if (parsed.baseUrl) {
                    for (const key in PROVIDER_PRESETS) {
                        if (PROVIDER_PRESETS[key] === parsed.baseUrl) { matchedProvider = key; break; }
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

    const config = {
        name: apiNameInput.value.trim() || '默认配置',
        provider: apiProviderSelect.value,
        baseUrl: apiUrlInput.value.trim() || 'https://api.openai.com/v1',
        apiKey: apiKey,
        model: apiModelInput.value.trim() || 'gpt-3.5-turbo',
        prompt: apiPromptInput ? apiPromptInput.value.trim() : (window.__loadedPrompt || ''),
        memoryCount: parseInt(apiMemoryInput.value, 10) || 20,
        temperature: parseFloat(apiTemperatureInput.value) || 0.7,
        timeAware: apiTimeAwareInput.checked
    };
    try {
        localStorage.setItem(API_STORAGE_KEY, JSON.stringify(config));
        showToast('保存成功');
    } catch (err) {
        showToast('保存失败');
    }
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

// ======================= 美化设置面板逻辑 =======================
const WALLPAPER_KEY = 'home_custom_wallpaper';
const ICON_BG_KEY = 'home_custom_icon_bg';

const openCustomizeBtn = document.getElementById('openCustomizeBtn');
const closeCustomizeBtn = document.getElementById('closeCustomizeBtn');
const customizePanel = document.getElementById('customizePanel');

const wallpaperInput = document.getElementById('wallpaperInput');
const resetWallpaperBtn = document.getElementById('resetWallpaperBtn');
const wallpaperPreviewBox = document.getElementById('wallpaperPreviewBox');
const wallpaperEmptyText = document.getElementById('wallpaperEmptyText');
const colorChips = document.querySelectorAll('.color-chip');

// 打开/关闭面板
if (openCustomizeBtn && customizePanel) {
    openCustomizeBtn.addEventListener('click', () => {
        customizePanel.style.display = 'flex';
        initCustomizeUI();
    });
}

if (closeCustomizeBtn && customizePanel) {
    closeCustomizeBtn.addEventListener('click', () => {
        customizePanel.style.display = 'none';
    });
}

// 压缩图片并转为 Base64 (Canvas 压缩到最大 720px，质量 0.82 保证适配 localStorage)
function compressImage(file, callback) {
    const reader = new FileReader();
    reader.onload = function(e) {
        const img = new Image();
        img.onload = function() {
            const canvas = document.createElement('canvas');
            const MAX_WIDTH = 640;
            const MAX_HEIGHT = 1136;
            let width = img.width;
            let height = img.height;

            if (width > height) {
                if (width > MAX_WIDTH) {
                    height = Math.round((height * MAX_WIDTH) / width);
                    width = MAX_WIDTH;
                }
            } else {
                if (height > MAX_HEIGHT) {
                    width = Math.round((width * MAX_HEIGHT) / height);
                    height = MAX_HEIGHT;
                }
            }

            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);

            const compressedBase64 = canvas.toDataURL('image/jpeg', 0.82);
            callback(compressedBase64);
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

// 初始化美化 UI 状态
function initCustomizeUI() {
    // 1. 初始化壁纸预览
    const savedWallpaper = localStorage.getItem(WALLPAPER_KEY);
    if (savedWallpaper) {
        wallpaperPreviewBox.style.backgroundImage = `url("${savedWallpaper}")`;
        wallpaperEmptyText.style.display = 'none';
    } else {
        wallpaperPreviewBox.style.backgroundImage = 'none';
        wallpaperEmptyText.style.display = 'block';
    }

    // 2. 初始化图标底色选中态
    const savedColor = localStorage.getItem(ICON_BG_KEY) || 'rgba(255, 255, 255, 0.6)';
    colorChips.forEach(chip => {
        if (chip.dataset.color === savedColor) {
            chip.classList.add('active');
        } else {
            chip.classList.remove('active');
        }
    });
}

// 上传壁纸事件
if (wallpaperInput) {
    wallpaperInput.addEventListener('change', (e) => {
        const file = e.target.files && e.target.files[0];
        if (!file) return;

        compressImage(file, (base64) => {
            try {
                localStorage.setItem(WALLPAPER_KEY, base64);
                wallpaperPreviewBox.style.backgroundImage = `url("${base64}")`;
                wallpaperEmptyText.style.display = 'none';
                showToast('壁纸已更新');
            } catch (err) {
                console.error('存储壁纸失败:', err);
                showToast('壁纸保存失败，图片过大');
            }
        });
        wallpaperInput.value = '';
    });
}

// 恢复默认纯白壁纸
if (resetWallpaperBtn) {
    resetWallpaperBtn.addEventListener('click', () => {
        localStorage.removeItem(WALLPAPER_KEY);
        wallpaperPreviewBox.style.backgroundImage = 'none';
        wallpaperEmptyText.style.display = 'block';
        showToast('已恢复纯白壁纸');
    });
}

// 图标底色切换
colorChips.forEach(chip => {
    chip.addEventListener('click', () => {
        colorChips.forEach(c => c.classList.remove('active'));
        chip.classList.add('active');

        const color = chip.dataset.color;
        try {
            localStorage.setItem(ICON_BG_KEY, color);
            showToast('图标底色已更新');
        } catch (err) {
            console.error(err);
        }
    });
});

// ======================= 图标底色切换 (毛玻璃 / 纯净) =======================
const ICON_STYLE_STORAGE_KEY = 'home_icon_style';
const openIconStyleBtn = document.getElementById('openIconStyleBtn');
const iconStyleModal = document.getElementById('iconStyleModal');
const iconStyleBackdrop = document.getElementById('iconStyleBackdrop');
const btnCloseIconModal = document.getElementById('btnCloseIconModal');
const btnChoiceGlass = document.getElementById('btnChoiceGlass');
const btnChoiceClean = document.getElementById('btnChoiceClean');
const iconStyleStatus = document.getElementById('iconStyleStatus');

function applyIconStyle(style) {
    const isGlass = style !== 'clean';
    const bg = isGlass ? 'rgba(255, 255, 255, 0.6)' : '#F2F2F7';
    const blur = isGlass ? 'blur(12px)' : 'none';

    document.documentElement.style.setProperty('--icon-bg', bg);
    document.documentElement.style.setProperty('--icon-blur', blur);

    if (iconStyleStatus) {
        iconStyleStatus.textContent = isGlass ? '毛玻璃' : '纯净';
    }
    if (btnChoiceGlass) {
        btnChoiceGlass.classList.toggle('active', isGlass);
    }
    if (btnChoiceClean) {
        btnChoiceClean.classList.toggle('active', !isGlass);
    }
}

function setIconStyle(style) {
    try {
        localStorage.setItem(ICON_STYLE_STORAGE_KEY, style);
        // 同步兼顾原桌面 ICON_BG_KEY 变量
        const bg = style === 'clean' ? '#F2F2F7' : 'rgba(255, 255, 255, 0.6)';
        localStorage.setItem(ICON_BG_KEY, bg);
    } catch (e) {
        console.error(e);
    }
    applyIconStyle(style);
    if (iconStyleModal) iconStyleModal.style.display = 'none';
    showToast(style === 'clean' ? '已设置为纯净图标' : '已设置为毛玻璃图标');
}

// 初始化加载图标底色
const savedIconStyle = localStorage.getItem(ICON_STYLE_STORAGE_KEY) || 'glass';
applyIconStyle(savedIconStyle);

if (openIconStyleBtn && iconStyleModal) {
    openIconStyleBtn.addEventListener('click', () => {
        iconStyleModal.style.display = 'flex';
    });
}

if (btnCloseIconModal && iconStyleModal) {
    btnCloseIconModal.addEventListener('click', () => {
        iconStyleModal.style.display = 'none';
    });
}

if (iconStyleBackdrop && iconStyleModal) {
    iconStyleBackdrop.addEventListener('click', () => {
        iconStyleModal.style.display = 'none';
    });
}

if (btnChoiceGlass) {
    btnChoiceGlass.addEventListener('click', () => setIconStyle('glass'));
}

if (btnChoiceClean) {
    btnChoiceClean.addEventListener('click', () => setIconStyle('clean'));
}

