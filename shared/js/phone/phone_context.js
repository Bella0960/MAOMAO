/* ============================================================
 * phone_context.js  —  统一角色上下文构建
 *
 * 职责：
 *   buildPhoneRoleContext(contactId, currentAppId)
 *   拼成一段标准 prompt 输入：
 *     【角色人设】
 *     【世界书】
 *     【长期记忆】
 *     【近期聊天】
 *     【其他 App 已有数据快照】
 *     【当前设备时间】
 *
 * 依赖 phone_storage.js。被 phone_engine / 各 App 调用。
 * ============================================================ */

(function (global) {
    'use strict';

    var Storage = global.PhoneStorage;
    var NS = global.PhoneContext = {};

    /* ========== 角色定位 ========== */

    function findCharacter(contactId) {
        if (!Storage) return null;
        var chars = Storage.getCharacters();
        for (var i = 0; i < chars.length; i++) {
            if (String(chars[i].id) === String(contactId)) return chars[i];
        }
        return null;
    }

    /* ========== 时间格式化 ========== */

    function nowLabel() {
        var d = new Date();
        var pad = function (n) { return n < 10 ? '0' + n : '' + n; };
        return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate())
            + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes()) + ' 星期' + '日一二三四五六'[d.getDay()];
    }

    function agoLabel(ts) {
        if (!ts) return '';
        var m = Math.floor((Date.now() - ts) / 60000);
        if (m < 1) return '刚刚';
        if (m < 60) return m + ' 分钟前';
        var h = Math.floor(m / 60);
        if (h < 24) return h + ' 小时前';
        return Math.floor(h / 24) + ' 天前';
    }

    /* ========== 段落拼接器 ========== */

    function section(title, body) {
        if (!body) return '';
        return '【' + title + '】\n' + body + '\n\n';
    }

    /* ========== 主函数 ========== */

    NS.buildPhoneRoleContext = function (contactId, currentAppId) {
        if (!Storage) return '';

        var parts = [];
        var role = findCharacter(contactId);
        if (!role) {
            return '（未找到角色 ID=' + contactId + '，无法构建上下文）';
        }

        // 1. 角色人设
        var persona = [];
        persona.push('姓名：' + (role.name || ''));
        if (role.age)   persona.push('年龄：' + role.age);
        if (role.gender) persona.push('性别：' + role.gender);
        if (role.persona) persona.push('人设：' + role.persona);
        if (role.prompt)  persona.push('系统提示：' + role.prompt);
        if (role.tone)    persona.push('语气风格：' + role.tone);
        parts.push(section('角色人设', persona.join('\n')));

        // 2. 世界书
        try {
            var wbs = Storage.getWorldbooks();
            if (wbs && wbs.length) {
                var wbText = wbs.map(function (w) {
                    return (w.category || '一般') + '：' + (w.content || '');
                }).join('\n');
                parts.push(section('世界书', wbText));
            }
        } catch (e) {}

        // 3. 长期记忆
        try {
            var memories = Storage.getMemories(contactId);
            if (memories && memories.length) {
                var memText = memories.map(function (m) {
                    if (typeof m === 'string') return m;
                    var t = m.time ? ('(' + agoLabel(m.time) + ') ') : '';
                    return t + (m.content || m.text || '');
                }).slice(0, 15).join('\n');
                parts.push(section('长期记忆', memText));
            }
        } catch (e) {}

        // 4. 近期聊天（和我）
        try {
            var history = Storage.getChatHistory(contactId);
            if (history && history.length) {
                // 取最近 30 条
                var recent = history.slice(-30).map(function (msg) {
                    var who = msg.role === 'assistant' ? (role.name || 'TA') : '我';
                    return who + '：' + (msg.content || msg.text || '');
                }).join('\n');
                parts.push(section('近期聊天', recent));
            }
        } catch (e) {}

        // 5. 其他 App 数据快照（排除当前 App）
        parts.push(section('其他 App 已有数据', gatherSnapshots(contactId, currentAppId)));

        // 6. 当前时间
        parts.push(section('当前设备时间', nowLabel()));

        return parts.join('');
    };

    /* ========== 快照收集 ========== */

    function gatherSnapshots(contactId, currentAppId) {
        var chunks = [];

        // 动态
        if (currentAppId !== 'moments') {
            try {
                var moments = Storage.getMoments();
                // 只保留属于该角色的动态（或所有人）
                var mine = moments.filter(function (m) {
                    return String(m.authorId || '') === String(contactId)
                        || String(m.authorId || '') === 'me';
                }).slice(-5);
                if (mine.length) {
                    chunks.push('【朋友圈动态】最近 ' + mine.length + ' 条：\n' + mine.map(function (m) {
                        return '• ' + (m.content || '[图片]') + ' (' + agoLabel(m.time) + ')';
                    }).join('\n'));
                }
            } catch (e) {}
        }

        // 财务
        if (currentAppId !== 'finance' && currentAppId !== 'wallet') {
            try {
                var fin = Storage.getFinanceRecords();
                if (fin.length) {
                    chunks.push('【钱包/财务】最近 ' + Math.min(fin.length, 5) + ' 条：\n'
                        + fin.slice(-5).map(function (r) {
                            return '• ' + (r.title || r.desc || '') + ' '
                                + (r.amount != null ? r.amount + '元' : '')
                                + ' (' + agoLabel(r.time) + ')';
                        }).join('\n'));
                }
            } catch (e) {}
        }

        // 记忆已经单独在上面列过，这里不要再重复

        return chunks.join('\n\n');
    }

})(window);
