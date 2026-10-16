/* ============================================================
 * phone_engine.js  —  公共手机引擎调度层
 *
 * 职责：
 *   1. 角色选择 / 切换（保存到 localStorage）
 *   2. 单 App 刷新（刷新某一个 App 的数据）
 *   3. 整机刷新（一次 AI 调用生成所有 App 的数据）
 *   4. 提供全局生成规则 prompt（跨 App 一致性）
 *
 * 依赖：
 *   - PhoneStorage   （读写数据 / 角色 / API 配置 / 日志）
 *   - PhoneAPI       （AI 请求 + JSON 清洗）
 *   - PhoneContext   （buildPhoneRoleContext 拼上下文）
 *   - PhoneApps      （PHONE_APPS 注册表）
 *
 * 不依赖任何业务页面。被各 App 入口页 / 整机控制页引用。
 * ============================================================ */

(function (global) {
    'use strict';

    var Storage  = global.PhoneStorage;
    var API      = global.PhoneAPI;
    var Context  = global.PhoneContext;
    var Apps     = global.PhoneApps;

    var NS = global.PhoneEngine = {};

    /* ========== 全局生成规则（所有 App 共用） ========== */

    var GLOBAL_RULES = `
【全局生成规则】
1. 必须符合角色人设。
2. 必须参考长期记忆和近期聊天，让生成内容和已经发生的事情有呼应。
3. 不要把玩家（用户）和角色当成同一个人。
4. 可以合理补全普通日常细节。
5. 不得无缘无故制造重大剧情转折。
6. 已明确发生或明确否定的事情不能随意修改。
7. 所有时间戳必须合理，且不晚于当前设备时间。
8. 不同 App 之间必须尽量保持内容一致（同一件事在不同 App 中应该对得上）。
9. 生成时间戳使用毫秒级 Unix 时间戳（13 位整数）。
10. 只返回合法 JSON，不要任何解释、前言、Markdown、代码块标记。
`.trim();

    /* ========== 角色选择 ========== */

    NS.getCurrentContactId = function () {
        return Storage ? Storage.getCurrentContactId() : null;
    };

    NS.setCurrentContact = function (contactId) {
        if (Storage) Storage.setCurrentContactId(contactId);
    };

    NS.listAvailableContacts = function () {
        if (!Storage) return [];
        return Storage.getCharacters();
    };

    /* ========== 单 App 刷新 ==========
     *
     * 流程：
     *   buildPhoneRoleContext(contactId, appId)
     *   + global rules
     *   + app prompt
     *   + app jsonSchema
     *   → 调 AI → 解析 JSON → 保存
     *
     * 返回 Promise<{ ok: true/false, data, error }>
     */

    NS.refreshApp = function (opts) {
        opts = opts || {};
        var contactId = opts.contactId || Storage.getCurrentContactId();
        var appId     = opts.appId;
        var app       = Apps && Apps.get ? Apps.get(appId) : null;

        if (!contactId) return Promise.reject(new Error('未选择角色'));
        if (!app)       return Promise.reject(new Error('未注册的 App：' + appId));
        if (!API)       return Promise.reject(new Error('PhoneAPI 未加载'));

        // 1. 上下文
        var roleContext = Context.buildPhoneRoleContext(contactId, appId);

        // 2. 最终 prompt
        var finalUserPrompt = roleContext
            + '\n' + GLOBAL_RULES
            + '\n\n【当前 App：' + app.name + '】\n' + (app.prompt || '')
            + '\n\n【必须返回的 JSON 结构】\n' + (app.jsonSchema || '')
            + '\n\n现在直接返回 JSON，不要任何解释。';

        return API.completeJSON({ user: finalUserPrompt });
    };

    /* ========== 整机刷新 ==========
     *
     * 一次 AI 调用生成所有已注册 App 的数据。
     * 让 AI 在内部先构统一生活事件时间线，再让各 App 从同一条时间线选内容。
     *
     * 返回 Promise<{ ok: true/false, data: { appId: {...}, ... }, error }>
     */

    NS.refreshAll = function (opts) {
        opts = opts || {};
        var contactId = opts.contactId || Storage.getCurrentContactId();

        if (!contactId) return Promise.reject(new Error('未选择角色'));
        if (!API)       return Promise.reject(new Error('PhoneAPI 未加载'));

        // 1. 上下文
        var roleContext = Context.buildPhoneRoleContext(contactId, null);

        // 2. 各 App 的 schema 列表
        var appIds = Apps.list().map(function (a) { return a.id; });
        var appSchemas = Apps.list().map(function (a) {
            return '- ' + a.id + '（' + a.name + '）:\n' + (a.jsonSchema || '');
        }).join('\n\n');

        var finalUserPrompt = roleContext
            + '\n' + GLOBAL_RULES
            + '\n\n【整机刷新指令】'
            + '\n请先在内部构建一条统一的生活事件时间线（几点/在哪里/和谁/做了什么/花了多少钱），'
            + '\n然后根据这条时间线，为每个 App 生成对应的数据。'
            + '\n不同 App 的内容必须互相呼应：比如聊天提到"去餐厅了"，钱包里要有餐饮消费，'
            + '\n朋友圈可以有"刚吃饱回来"。'
            + '\n\n【各 App 的 JSON 结构】\n' + appSchemas
            + '\n\n【最外层 JSON 结构】'
            + '\n{'
            + appIds.map(function (id) { return '\n  "' + id + '": { ...上面对应的结构... }'; }).join(',')
            + '\n}'
            + '\n\n现在直接返回最外层 JSON，不要任何解释或 markdown。';

        return API.completeJSON({ user: finalUserPrompt });
    };

    /* ========== 保存解析结果到 storage ==========
     * 整机刷新返回 { ok:true, data:{ moments:{...}, finance:{...}, ... } } 后，
     * 逐个 App 调这个函数存进去。
     */

    NS.saveAppResult = function (appId, rawResult) {
        var app = Apps.get(appId);
        if (!app) return false;
        if (!Storage) return false;

        // 统一结构：{ items: [...] }
        var items = (rawResult && Array.isArray(rawResult.items)) ? rawResult.items
                  : (Array.isArray(rawResult) ? rawResult : []);

        // 保存到 storage（委托给 PhoneStorage 的对应方法）
        switch (appId) {
            case 'moments':
                // 整机生成的 moments 要合并进现有列表（而不是覆盖）
                var existingMoments = Storage.getMoments();
                var merged = items.concat(existingMoments);
                Storage.saveMoments(merged);
                break;
            case 'finance':
                var existingFin = Storage.getFinanceRecords();
                var mergedFin = items.concat(existingFin);
                Storage.saveFinanceRecords(mergedFin);
                break;
            default:
                // 新 App：直接存 phoneData 层级
                Storage.setData(Storage.getCurrentContactId(), appId, { items: items });
        }
        return true;
    };

    /* ========== 解析一次整机刷新结果 ==========
     * 把 { moments:{...}, finance:{...} } 拆成各 App 的结果并调用 saveAppResult。
     * 返回每个 App 的保存结果状态对象。
     */

    NS.applyBundle = function (bundleData) {
        var results = {};
        if (!bundleData || typeof bundleData !== 'object') return results;
        var appIds = Apps.list().map(function (a) { return a.id; });
        for (var i = 0; i < appIds.length; i++) {
            var id = appIds[i];
            if (bundleData[id] != null) {
                results[id] = NS.saveAppResult(id, bundleData[id]);
            }
        }
        return results;
    };

    /* ========== 工具：AI 角色快速发言（被 @ 触发的回复等） ==========
     * 简化版：不需要完整上下文，只需要角色 persona + 触发内容
     */

    NS.quickReply = function (opts) {
        opts = opts || {};
        if (!API) return Promise.reject(new Error('PhoneAPI 未加载'));

        var systemPrompt = '你是' + (opts.roleName || '一个 AI 角色') + '。'
            + (opts.persona || '')
            + (opts.tone ? '语气：' + opts.tone + '。' : '');
        var userPrompt = (opts.prompt || '请说一句话。')
            + '口语化、自然真实，20-50 字，只输出正文本身。';

        return API.complete({ system: systemPrompt, user: userPrompt });
    };

})(window);
