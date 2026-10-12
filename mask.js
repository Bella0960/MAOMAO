// 用户身份面具（切换设定）：不同设定是不同的人，头像/昵称/人设/记忆全隔离
var MaskSystem = {
    MASKS_KEY: 'user_masks',
    ACTIVE_KEY: 'active_mask_id',

    getMasks: function () {
        try {
            var raw = localStorage.getItem(this.MASKS_KEY);
            if (raw) {
                var arr = JSON.parse(raw);
                if (Array.isArray(arr) && arr.length) return arr;
            }
        } catch (e) {}
        return [];
    },

    saveMasks: function (arr) {
        try { localStorage.setItem(this.MASKS_KEY, JSON.stringify(arr)); } catch (e) {}
    },

    getActiveId: function () {
        try { return localStorage.getItem(this.ACTIVE_KEY) || ''; } catch (e) { return ''; }
    },

    getActiveMask: function () {
        var id = this.getActiveId();
        var masks = this.getMasks();
        for (var i = 0; i < masks.length; i++) {
            if (String(masks[i].id) === String(id)) return masks[i];
        }
        return masks[0] || null;
    },

    // 首次使用：从现有 myProfile 生成默认面具（名称不写死，用昵称）
    ensureDefault: function () {
        var masks = this.getMasks();
        // 迁移：旧版写死的"日常小桃"默认面具，改名成当前昵称
        if (masks.length === 1 && masks[0].name === '日常小桃') {
            var p0 = {};
            try { p0 = JSON.parse(localStorage.getItem('myProfile')) || {}; } catch (e) {}
            masks[0].name = (p0.nickname || p0.name || '我的设定').trim();
            this.saveMasks(masks);
        }
        if (masks.length) return masks;
        var profile = {};
        try { profile = JSON.parse(localStorage.getItem('myProfile')) || {}; } catch (e) {}
        var nick = (profile.nickname || profile.name || '').trim();
        var m = {
            id: 'mask_default_' + Date.now(),
            name: nick || '我的设定',
            avatar: profile.avatar || '',
            nickname: nick || '未命名',
            persona: profile.about || '一个普通用户'
        };
        this.saveMasks([m]);
        try { localStorage.setItem(this.ACTIVE_KEY, m.id); } catch (e) {}
        return [m];
    },

    // 切换：把面具的头像/昵称/人设写入 myProfile
    applyMask: function (id) {
        var masks = this.getMasks();
        var target = null;
        for (var i = 0; i < masks.length; i++) {
            if (String(masks[i].id) === String(id)) { target = masks[i]; break; }
        }
        if (!target) return false;
        try { localStorage.setItem(this.ACTIVE_KEY, target.id); } catch (e) {}
        var profile = {};
        try { profile = JSON.parse(localStorage.getItem('myProfile')) || {}; } catch (e) {}
        profile.avatar = target.avatar;
        profile.nickname = target.nickname;
        profile.name = target.nickname;
        profile.about = target.persona;
        try { localStorage.setItem('myProfile', JSON.stringify(profile)); } catch (e) {}
        return true;
    },

    removeMask: function (id) {
        var masks = this.getMasks();
        if (masks.length <= 1) return false; // 至少保留 1 个
        var next = [];
        for (var i = 0; i < masks.length; i++) {
            if (String(masks[i].id) !== String(id)) next.push(masks[i]);
        }
        this.saveMasks(next);
        // 删的是当前在用的，切到第一个
        if (String(this.getActiveId()) === String(id) && next.length) {
            this.applyMask(next[0].id);
        }
        return true;
    }
};
