/* ============================================================
 * chat-beauty.js  —  聊天美化中心（结构化参数版）底层
 *
 * 职责：
 *   1. 统一存储聊天外观参数：全局默认 + 单聊覆盖（稀疏存储，未存的字段跟随全局）
 *        全局：beauty_chat_global_v1
 *        单聊：beauty_chat_<contactId>
 *   2. resolve(contactId)          合并最终参数：内置默认 < 全局 < 单聊
 *   3. applyVars(vars, rootEl)     把一份参数写成 CSS 变量，挂到聊天容器或预览容器上
 *      apply(contactId, rootEl)    = resolve + applyVars（聊天页加载时调用）
 *      双写新 --chat-* 变量与旧 --avatar-size/--my-bubble-* 变量（过渡期兼容）
 *   4. save(scope, partial)        稀疏保存；字段传 null 表示"恢复跟随全局"
 *   5. 加载时静默迁移旧 theme_bubble_* 配置（只跑一次，不删除旧 key）
 *   6. 未配置背景时回落旧 chat_bg_<id>（保持原有 72% 白遮罩观感）
 *
 * 无依赖，仅需 localStorage。被 chat-detail.html 与聊天美化中心（beauty.html）引用。
 * ============================================================ */

(function (global) {
    'use strict';

    var NS = global.ChatBeauty = {};

    var GLOBAL_KEY = 'beauty_chat_global_v1';
    var ROLE_PREFIX = 'beauty_chat_';
    var MIGRATED_FLAG = 'beauty_chat_migrated_v1';

    // 内置默认 = chat-detail 页面当前视觉（无任何配置时的效果）
    var DEFAULTS = {
        avatarSize: 30,          // px
        avatarRadius: 50,        // %，0 = 方形，50 = 正圆，中间值 = 圆角矩形
        bubbleGap: 13,           // px，消息行间距
        bubbleGapX: 0,           // px，气泡左右外边距（0 = 与旧版视觉一致）
        bubbleMaxWidth: 86,      // %，消息行最大宽度（限制气泡能有多宽）
        bubblePadding: 10,       // px，气泡内边距基准；实际 = (n-0.5px) 上下 / (n+3px) 左右，默认即 9.5px 13px
        myBubbleBg: '#111111',
        myBubbleColor: '#FFFFFF',
        myBubbleRadius: '15px 15px 4px 15px',
        partnerBubbleBg: '#FFFFFF',
        partnerBubbleColor: '#111111',
        partnerBubbleRadius: '15px 15px 15px 4px',
        chatBg: '',              // Base64 dataURL，空 = 默认渐变
        chatBgDim: 0             // 背景压暗遮罩 0-0.85（仅自定义背景时生效）
    };
    NS.DEFAULTS = DEFAULTS;

    function readJSON(key, fallback) {
        try {
            var raw = localStorage.getItem(key);
            if (raw == null) return fallback;
            var v = JSON.parse(raw);
            return (v && typeof v === 'object') ? v : fallback;
        } catch (e) { return fallback; }
    }

    function writeJSON(key, value) {
        try { localStorage.setItem(key, JSON.stringify(value)); return true; }
        catch (e) { return false; }
    }

    function num(v, fb) {
        var n = Number(v);
        return isNaN(n) ? fb : n;
    }

    function readScope(scope) {
        var key = scope === 'global' ? GLOBAL_KEY : ROLE_PREFIX + scope;
        var cfg = readJSON(key, null);
        return (cfg && cfg.vars && typeof cfg.vars === 'object') ? cfg.vars : {};
    }

    /* ========== 读取与合并 ========== */

    // 最终参数 = 内置默认 < 全局 < 单聊；null / 空串视为"未设置"，继续下沉
    NS.resolve = function (contactId) {
        var out = {};
        for (var k in DEFAULTS) out[k] = DEFAULTS[k];
        var layers = [readScope('global')];
        if (contactId != null && contactId !== '') layers.push(readScope(String(contactId)));
        layers.forEach(function (vars) {
            for (var k in vars) {
                if (k in DEFAULTS && vars[k] !== null && vars[k] !== '') out[k] = vars[k];
            }
        });
        return out;
    };

    /* ========== 应用到容器 ========== */

    // 把一份最终参数写成 CSS 变量。rootEl：聊天容器（.chat-stage）或美化中心的预览容器。
    // ta = 对方（partner）。双写：新 --chat-* 变量（预览/新 UI 消费）+ 旧变量（现有页面 CSS 消费）。
    NS.applyVars = function (v, rootEl) {
        if (!rootEl || !v) return v;
        var s = rootEl.style;

        s.setProperty('--chat-avatar-size', num(v.avatarSize, 30) + 'px');
        s.setProperty('--chat-avatar-radius', num(v.avatarRadius, 50) + '%');
        s.setProperty('--chat-bubble-gap', num(v.bubbleGap, 13) + 'px');
        s.setProperty('--chat-bubble-gap-x', num(v.bubbleGapX, 0) + 'px');
        s.setProperty('--chat-bubble-max-width', num(v.bubbleMaxWidth, 86) + '%');
        var pad = num(v.bubblePadding, 10);
        s.setProperty('--chat-bubble-padding', (pad - 0.5) + 'px ' + (pad + 3) + 'px');
        s.setProperty('--chat-bubble-my-bg', v.myBubbleBg);
        s.setProperty('--chat-bubble-my-color', v.myBubbleColor);
        s.setProperty('--chat-bubble-my-radius', v.myBubbleRadius);
        s.setProperty('--chat-bubble-ta-bg', v.partnerBubbleBg);
        s.setProperty('--chat-bubble-ta-color', v.partnerBubbleColor);
        s.setProperty('--chat-bubble-ta-radius', v.partnerBubbleRadius);

        // 过渡期双写：chat-detail 现有 CSS 仍消费这批旧变量名
        s.setProperty('--avatar-size', num(v.avatarSize, 30) + 'px');
        s.setProperty('--avatar-radius', num(v.avatarRadius, 50) + '%');
        s.setProperty('--my-bubble-bg', v.myBubbleBg);
        s.setProperty('--my-bubble-color', v.myBubbleColor);
        s.setProperty('--my-bubble-radius', v.myBubbleRadius);
        s.setProperty('--partner-bubble-bg', v.partnerBubbleBg);
        s.setProperty('--partner-bubble-color', v.partnerBubbleColor);
        s.setProperty('--partner-bubble-radius', v.partnerBubbleRadius);

        // 背景：有自定义图则按 chatBgDim 合成压暗遮罩；无则清掉变量、回落 CSS 默认渐变
        if (v.chatBg) {
            var dim = Math.min(Math.max(num(v.chatBgDim, 0), 0), 0.85);
            var img = 'url("' + v.chatBg + '")';
            var layers = dim > 0
                ? 'linear-gradient(rgba(0,0,0,' + dim + '), rgba(0,0,0,' + dim + ')),' + img
                : img;
            s.setProperty('--chat-bg-image', layers);
        } else {
            s.removeProperty('--chat-bg-image');
        }
        return v;
    };

    // 聊天页加载入口：resolve 出最终参数并应用。
    // 美化未配置背景时，回落旧单聊背景 chat_bg_<id>（72% 白遮罩，沿用原 applyChatBackground 观感）。
    NS.apply = function (contactId, rootEl) {
        if (!rootEl) return null;
        var v = NS.applyVars(NS.resolve(contactId), rootEl);
        if (v && !v.chatBg) {
            var legacyBg = '';
            try { legacyBg = localStorage.getItem('chat_bg_' + contactId) || ''; } catch (e) {}
            if (legacyBg) {
                rootEl.style.setProperty('--chat-bg-image',
                    'linear-gradient(rgba(255,255,255,0.72), rgba(255,255,255,0.72)),url("' + legacyBg + '")');
            }
        }
        return v;
    };

    /* ========== 保存（稀疏） ========== */

    // partial: { 字段: 值 }；字段传 null = 删除该字段（恢复跟随全局/内置默认）。scope: 'global' 或角色 id。
    NS.save = function (scope, partial) {
        if (!scope || !partial || typeof partial !== 'object') return false;
        var key = scope === 'global' ? GLOBAL_KEY : ROLE_PREFIX + scope;
        var cfg = readJSON(key, { v: 1, updatedAt: 0, vars: {} });
        if (!cfg.vars || typeof cfg.vars !== 'object') cfg.vars = {};
        for (var k in partial) {
            if (!(k in DEFAULTS)) continue;      // 白名单：拒绝未知字段，防脏数据进存储
            if (partial[k] === null) delete cfg.vars[k];
            else cfg.vars[k] = partial[k];
        }
        cfg.v = 1;
        cfg.updatedAt = Date.now();
        return writeJSON(key, cfg);
    };

    // 清空某个作用域的配置（恢复跟随上层）
    NS.reset = function (scope) {
        var key = scope === 'global' ? GLOBAL_KEY : ROLE_PREFIX + scope;
        try { localStorage.removeItem(key); } catch (e) {}
    };

    /* ========== 一次性迁移：theme_bubble_* → beauty_chat_* ========== */
    // 静默执行：仅在旧配置存在且新 key 尚未写入时转换；不删除旧 key；打标记防重放。
    (function migrate() {
        try {
            if (localStorage.getItem(MIGRATED_FLAG) === '1') return;

            // 旧字段名（bubble-theme.html）→ 新字段名
            var MAP = {
                myBg: 'myBubbleBg', myColor: 'myBubbleColor', myRadius: 'myBubbleRadius',
                partnerBg: 'partnerBubbleBg', partnerColor: 'partnerBubbleColor',
                partnerRadius: 'partnerBubbleRadius',
                avatarSize: 'avatarSize', avatarRadius: 'avatarRadius'
            };

            function convert(oldConf) {
                if (!oldConf || typeof oldConf !== 'object') return null;
                var vars = {};
                var hit = false;
                for (var old in MAP) {
                    if (oldConf[old] !== undefined && oldConf[old] !== null && oldConf[old] !== '') {
                        vars[MAP[old]] = oldConf[old];
                        hit = true;
                    }
                }
                return hit ? vars : null;
            }

            // 全局
            if (localStorage.getItem(GLOBAL_KEY) == null) {
                var gv = convert(readJSON('theme_bubble_global', null));
                if (gv) writeJSON(GLOBAL_KEY, { v: 1, updatedAt: Date.now(), vars: gv });
            }
            // 单聊：theme_bubble_role_<id> → beauty_chat_<id>
            var keys = [];
            try { keys = Object.keys(localStorage); } catch (e) {}
            keys.forEach(function (k) {
                var m = /^theme_bubble_role_(.+)$/.exec(k);
                if (!m) return;
                var newKey = ROLE_PREFIX + m[1];
                if (localStorage.getItem(newKey) != null) return;
                var rv = convert(readJSON(k, null));
                if (rv) writeJSON(newKey, { v: 1, updatedAt: Date.now(), vars: rv });
            });

            localStorage.setItem(MIGRATED_FLAG, '1');
        } catch (e) {}
    })();
})(window);
