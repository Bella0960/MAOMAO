/* ============================================================
 * phone_apps.js  —  App 注册表
 *
 * 职责：
 *   把所有 App 以统一结构注册到 PHONE_APPS。
 *   每个 App 只需定义：id / name / icon / description / prompt /
 *   getCount / renderList / renderDetail（后两者由各 App 页面自己实现，
 *   这里留占位，整机生成时只用到 prompt + getCount）。
 *
 * 依赖 phone_storage.js（读取数据）和 phone_api.js（AI 生成）。
 * 被 phone_engine.js / 各 App 入口页面引用。
 * ============================================================ */

(function (global) {
    'use strict';

    var Storage = global.PhoneStorage;
    var NS = global.PhoneApps = {};

    /* ========== App 定义模板 ==========
     *
     * {
     *   id:          // 唯一 id，同时是 phoneData[contactId][id] 的 key
     *   name:        // 显示名
     *   description: // 一句话说明
     *   icon:        // emoji 或 SVG 路径字符串，首页用
     *   page:        // 对应页面的 URL（可选，首页跳转用）
     *   prompt:      // AI 生成时的 App 专属规则
     *   jsonSchema:  // AI 应返回的 JSON 结构描述（字符串）
     *   getCount(data)     // 数据计数
     *   getData(contactId) // 从 storage 读数据（委托 PhoneStorage）
     * }
     */

    var PHONE_APPS = {

        /* ----- 朋友圈动态 ----- */
        moments: {
            id: 'moments',
            name: '朋友圈',
            description: '动态与评论',
            icon: '💬',
            page: '/chat/moments/moments.html',
            prompt: `根据提供的人物设定、记忆、聊天记录和其他 App 数据，
生成该角色的朋友圈动态。

要求：
1. 动态内容符合角色人设和语气风格。
2. 优先参考近期聊天中发生的事件，让动态和聊天内容呼应。
3. 内容可以是一句话、一段话，不超过 120 字。
4. 时间戳必须合理：第一条早于第二条，且不晚于当前设备时间。
5. 不要制造重大剧情转折，普通日常即可。
6. 不同动态之间要有一定时间间隔。`,
            jsonSchema: `{
  "items": [
    {
      "content": "动态正文文字（最多 120 字）",
      "image": "",
      "timestamp": 1714000000000
    }
  ]
}`,
            getCount: function (data) {
                return (data && data.items ? data.items : []).length;
            },
            getData: function (contactId) {
                if (!Storage) return [];
                return Storage.getMoments();
            }
        },

        /* ----- 论坛帖子 ----- */
        forum: {
            id: 'forum',
            name: '论坛',
            description: '帖子与讨论',
            icon: '📱',
            page: '/forum/forum.html',
            prompt: `根据提供的人物设定、记忆、聊天记录和其他 App 数据，
生成该角色在论坛上发过的帖子。

要求：
1. 帖子标题 10-25 字，内容 50-200 字。
2. 帖子主题要像真实论坛，不直接暴露内部设定。
3. 评论 2-5 条，语气自然，符合论坛氛围。
4. 帖子时间不晚于当前设备时间。
5. 尽量和聊天/动态中出现的事件有呼应。`,
            jsonSchema: `{
  "items": [
    {
      "title": "帖子标题",
      "content": "帖子正文",
      "timestamp": 1714000000000,
      "comments": [
        { "author": "角色名", "text": "评论内容", "timestamp": 1714000000000 }
      ]
    }
  ]
}`,
            getCount: function (data) {
                return (data && data.items ? data.items : []).length;
            },
            getData: function (contactId) {
                return []; // 论坛数据还没接入 storage
            }
        },

        /* ----- 钱包 / 财务记录 ----- */
        finance: {
            id: 'finance',
            name: '钱包',
            description: '消费与收支',
            icon: '💰',
            page: '/wallet/finance.html',
            prompt: `根据提供的人物设定、记忆、聊天记录和其他 App 数据，
生成该角色的钱包收支记录。

要求：
1. 每次记录包含金额、标题、分类（餐饮/交通/购物/娱乐/收入等）。
2. 金额方向：正数 = 收入，负数 = 支出。
3. 时间要和聊天/动态中提到的事件对应。比如聊天提到"去餐厅了"，钱包里应该有一笔餐饮消费。
4. 总量 5-20 条，时间跨度覆盖最近几天。
5. 不要出现明显不真实的数字（比如月薪几百万或一顿饭几元）。`,
            jsonSchema: `{
  "items": [
    {
      "amount": -86,
      "title": "餐厅晚餐",
      "category": "餐饮",
      "timestamp": 1714000000000
    }
  ]
}`,
            getCount: function (data) {
                return (data && data.items ? data.items : []).length;
            },
            getData: function (contactId) {
                if (!Storage) return [];
                return Storage.getFinanceRecords();
            }
        },

        /* ----- 赴约 · 线下沉浸式剧情 ----- */
        date: {
            id: 'date',
            name: '赴约',
            description: '线下沉浸式剧情模式',
            icon: '✉',
            page: '/chat/date/date.html',
            prompt: `根据提供的人物设定、记忆和聊天记录，为「赴约」线下剧情模式生成一段开场场景。

要求：
1. 场景是用户与该角色的线下面对面相遇（如咖啡馆、家里、公园）。
2. 以小说叙事体输出：环境、动作、神态、心理描写丰富，300-500 字。
3. 用第二人称"你"称呼用户，以角色的第一人称视角展开。
4. 结尾留出用户可以回应的空间，不要一次写完整个约会。`,
            jsonSchema: `{
  "items": [
    {
      "scene": "咖啡馆",
      "content": "小说叙事体的开场场景文本",
      "timestamp": 1714000000000
    }
  ]
}`,
            getCount: function (data) {
                return (data && data.items ? data.items : []).length;
            },
            getData: function (contactId) {
                return []; // 赴约剧情与聊天记录共用 chat_history_<id>，无需独立数据
            }
        }

        /* ----- 后续 App 注册示例（未实现，留占位） ----- */
        /*
        , wechat:   { id:'wechat',   name:'微信',   icon:'💚', page:'/chat/chat/chat-detail.html', ... }
        , gallery:  { id:'gallery',  name:'相册',   icon:'📷', page:'...', ... }
        , browser:  { id:'browser',  name:'浏览器', icon:'🌐', page:'...', ... }
        , notes:    { id:'notes',    name:'备忘录', icon:'📝', page:'...', ... }
        , music:    { id:'music',    name:'音乐',   icon:'🎵', page:'...', ... }
        */
    };

    /* ========== 对外 API ========== */

    NS.ALL = PHONE_APPS;

    NS.get = function (id) {
        return PHONE_APPS[id] || null;
    };

    NS.list = function () {
        return Object.keys(PHONE_APPS).map(function (id) {
            return PHONE_APPS[id];
        });
    };

    NS.register = function (app) {
        if (!app || !app.id) {
            console.warn('[PhoneApps] register 需要 id');
            return;
        }
        PHONE_APPS[app.id] = app;
    };

})(window);
