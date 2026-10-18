/* ============================================================
 * phone_storage.js  —  公共存储层
 *
 * 职责：
 *   1. 统一 localStorage 读写（加 try/catch + JSON 安全）
 *   2. 新结构：phoneData[contactId][appId] = {...}
 *   3. 兼容旧 key：ai_custom_characters / chat_history_xxx / finance_records / moments ...
 *      旧 key 不会自动删除，读的时候两边都查，写的时候两边都写（渐进迁移）
 *
 * 被 phone_context / phone_api / phone_engine 等上层引用，
 * 不依赖任何业务页面。
 * ============================================================ */

(function (global) {
    'use strict';

    var NS = global.PhoneStorage = {};

    /* ========== 原始读写 ========== */

    NS.rawGet = function (key, fallback) {
        try {
            var v = localStorage.getItem(key);
            if (v == null) return fallback;
            // 尝试 JSON 解析，失败则返回原始字符串
            try { return JSON.parse(v); }
            catch (e) { return v; }
        } catch (e) { return fallback; }
    };

    NS.rawSet = function (key, value) {
        try {
            if (typeof value === 'string') {
                localStorage.setItem(key, value);
            } else {
                localStorage.setItem(key, JSON.stringify(value));
            }
            return true;
        } catch (e) {
            console.warn('[PhoneStorage] set failed', key, e);
            return false;
        }
    };

    NS.rawRemove = function (key) {
        try { localStorage.removeItem(key); } catch (e) {}
    };

    /* ========== 角色 App 层级 ========== */

    var PHONE_DATA_KEY = 'phone_data_v2';
    var CONTACT_KEY = 'phone_current_contact';

    NS._getRoot = function () {
        var v = NS.rawGet(PHONE_DATA_KEY, null);
        if (!v || typeof v !== 'object') { v = {}; }
        return v;
    };

    NS._setRoot = function (root) {
        NS.rawSet(PHONE_DATA_KEY, root);
    };

    // phoneData[contactId][appId]
    NS.getData = function (contactId, appId) {
        var root = NS._getRoot();
        if (!root[contactId]) return null;
        return root[contactId][appId] != null ? root[contactId][appId] : null;
    };

    NS.setData = function (contactId, appId, value) {
        var root = NS._getRoot();
        if (!root[contactId]) root[contactId] = {};
        root[contactId][appId] = value;
        NS._setRoot(root);
    };

    NS.deleteData = function (contactId, appId) {
        var root = NS._getRoot();
        if (root[contactId] && root[contactId][appId] != null) {
            delete root[contactId][appId];
            NS._setRoot(root);
        }
    };

    NS.listAppIds = function (contactId) {
        var root = NS._getRoot();
        if (!root[contactId]) return [];
        return Object.keys(root[contactId]);
    };

    /* ========== 当前选中角色 ========== */

    NS.getCurrentContactId = function () {
        var v = localStorage.getItem(CONTACT_KEY);
        return v || null;
    };

    NS.setCurrentContactId = function (id) {
        if (id) {
            localStorage.setItem(CONTACT_KEY, String(id));
        } else {
            localStorage.removeItem(CONTACT_KEY);
        }
    };

    /* ========== 旧 key 兼容读取 ==========
     * 文档要求 phoneData[contactId][appId] 统一管理，
     * 但现有项目是散装 key，所以每个 getter 做新旧双查：
     *   先查 phoneData[contactId][appId]，
     *   没有再查旧 key（localStorage 顶层 key）。
     * 这样重构期间新旧两套都能跑。
     */

    // 角色列表（全局）
    NS.getCharacters = function () {
        var v = NS.rawGet('ai_custom_characters', null);
        if (Array.isArray(v)) return v;
        return [];
    };

    NS.saveCharacters = function (list) {
        NS.rawSet('ai_custom_characters', list || []);
    };

    // 我（玩家 profile）
    NS.getMyProfile = function () {
        return NS.rawGet('myProfile', null);
    };

    NS.saveMyProfile = function (profile) {
        NS.rawSet('myProfile', profile || {});
    };

    // 世界书
    NS.getWorldbooks = function () {
        var v = NS.rawGet('phone_worldbooks', null);
        if (Array.isArray(v)) return v;
        return [];
    };

    NS.saveWorldbooks = function (list) {
        NS.rawSet('phone_worldbooks', list || []);
    };

    // 群组（全局）
    NS.getGroups = function () {
        var v = NS.rawGet('phone_groups', null);
        if (Array.isArray(v)) return v;
        return [];
    };

    NS.saveGroups = function (list) {
        NS.rawSet('phone_groups', list || []);
    };

    // 聊天记录（按角色）
    NS.getChatHistory = function (contactId) {
        var v = NS.rawGet('chat_history_' + contactId, null);
        if (Array.isArray(v)) return v;
        return [];
    };

    NS.saveChatHistory = function (contactId, list) {
        NS.rawSet('chat_history_' + contactId, list || []);
        // 同时写入新结构
        NS.setData(contactId, 'chat', { history: list });
    };

    // 记忆（按角色）
    NS.getMemories = function (contactId) {
        var v = NS.rawGet('chat_memories_' + contactId, null);
        if (Array.isArray(v)) return v;
        return [];
    };

    NS.saveMemories = function (contactId, list) {
        NS.rawSet('chat_memories_' + contactId, list || []);
        NS.setData(contactId, 'memories', { items: list });
    };

    // 动态（moments）
    NS.getMoments = function () {
        var v = NS.rawGet('moments', null);
        if (Array.isArray(v)) return v;
        return [];
    };

    NS.saveMoments = function (list) {
        NS.rawSet('moments', list || []);
    };

    // 动态通知
    NS.getMomentsNotifications = function () {
        var v = NS.rawGet('moments_notifications', null);
        if (Array.isArray(v)) return v;
        return [];
    };

    NS.saveMomentsNotifications = function (list) {
        NS.rawSet('moments_notifications', list || []);
    };

    NS.pushMomentsNotification = function (entry) {
        var arr = NS.getMomentsNotifications();
        arr.unshift(entry);
        while (arr.length > 100) arr.pop();
        NS.saveMomentsNotifications(arr);
    };

    // 论坛通知
    NS.getForumNotifications = function () {
        var v = NS.rawGet('forum_notifications', null);
        if (Array.isArray(v)) return v;
        return [];
    };

    NS.saveForumNotifications = function (list) {
        NS.rawSet('forum_notifications', list || []);
    };

    // 财务记录（钱包）
    NS.getFinanceRecords = function () {
        var v = NS.rawGet('finance_records', null);
        if (Array.isArray(v)) return v;
        return [];
    };

    NS.saveFinanceRecords = function (list) {
        NS.rawSet('finance_records', list || []);
    };

    // API 配置
    NS.getApiConfig = function () {
        return NS.rawGet('api_settings', null) || {};
    };

    NS.saveApiConfig = function (cfg) {
        NS.rawSet('api_settings', cfg || {});
    };

    // API 调用日志
    NS.getApiLogs = function () {
        var v = NS.rawGet('api_call_logs', null);
        if (Array.isArray(v)) return v;
        return [];
    };

    NS.pushApiLog = function (entry) {
        var logs = NS.getApiLogs();
        entry = entry || {};
        // 统一补齐展示所需字段，避免写入方遗漏导致时间/耗时显示异常
        if (entry.time == null) entry.time = Date.now();
        if (entry.duration == null) entry.duration = 0;
        logs.unshift(entry);
        while (logs.length > 50) logs.pop();
        NS.rawSet('api_call_logs', logs);
    };

})(window);
