// 音效系统：Web Audio 合成，零音频文件，全局默认 + 单角色覆盖
// 存储：sound_settings = {receive, send, push, voice, call}；sound_char_<id> = 角色单独收消息音效
var SoundSystem = {
    ctx: null,

    // 内置音效池（合成函数 key → 名称）
    SOUNDS: {
        none:    '静音',
        ding:    '叮',
        dong:    '咚',
        bubble:  '气泡',
        pop:     '啵',
        whoosh:  '咻',
        ring:    '铃',
        tri:     '三音'
    },

    DEFAULTS: {
        receive: 'bubble',
        send: 'ding',
        push: 'dong',
        voice: 'whoosh',
        call: 'ring'
    },

    getCtx: function () {
        if (!this.ctx) {
            try { this.ctx = new (window.AudioContext || window.webkitAudioContext)(); }
            catch (e) { return null; }
        }
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume().catch(function () {});
        }
        return this.ctx;
    },

    readConfig: function () {
        var cfg = {};
        try {
            var raw = localStorage.getItem('sound_settings');
            if (raw) cfg = JSON.parse(raw) || {};
        } catch (e) {}
        var out = {};
        var keys = ['receive', 'send', 'push', 'voice', 'call'];
        for (var i = 0; i < keys.length; i++) {
            out[keys[i]] = cfg[keys[i]] || this.DEFAULTS[keys[i]];
        }
        return out;
    },

    saveConfig: function (cfg) {
        try { localStorage.setItem('sound_settings', JSON.stringify(cfg)); } catch (e) {}
    },

    // 角色单独收消息音效（覆盖全局 receive）
    readCharSound: function (charId) {
        if (!charId) return null;
        try {
            var v = localStorage.getItem('sound_char_' + charId);
            return v && v !== 'default' ? v : null;
        } catch (e) { return null; }
    },
    saveCharSound: function (charId, soundKey) {
        try { localStorage.setItem('sound_char_' + charId, soundKey || 'default'); } catch (e) {}
    },

    // 基础音：freq(Hz) start(秒) dur(秒) type gain
    tone: function (freq, start, dur, type, gain) {
        var ctx = this.getCtx();
        if (!ctx) return;
        var t = ctx.currentTime + start;
        var o = ctx.createOscillator();
        var g = ctx.createGain();
        o.type = type || 'sine';
        o.frequency.setValueAtTime(freq, t);
        g.gain.setValueAtTime(0.0001, t);
        g.gain.linearRampToValueAtTime(gain || 0.12, t + 0.012);
        g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        o.connect(g); g.connect(ctx.destination);
        o.start(t); o.stop(t + dur + 0.02);
    },

    // 扫频（咻）
    sweep: function (from, to, dur, type, gain) {
        var ctx = this.getCtx();
        if (!ctx) return;
        var t = ctx.currentTime;
        var o = ctx.createOscillator();
        var g = ctx.createGain();
        o.type = type || 'sine';
        o.frequency.setValueAtTime(from, t);
        o.frequency.exponentialRampToValueAtTime(to, t + dur);
        g.gain.setValueAtTime(0.0001, t);
        g.gain.linearRampToValueAtTime(gain || 0.1, t + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        o.connect(g); g.connect(ctx.destination);
        o.start(t); o.stop(t + dur + 0.02);
    },

    // 播放某个音效 key
    playKey: function (key) {
        if (!key || key === 'none') return;
        switch (key) {
            case 'ding':   this.tone(880, 0, 0.18, 'sine', 0.12); break;
            case 'dong':   this.tone(330, 0, 0.3, 'sine', 0.14); break;
            case 'bubble': this.tone(620, 0, 0.1, 'sine', 0.1); this.tone(920, 0.09, 0.14, 'sine', 0.1); break;
            case 'pop':    this.tone(480, 0, 0.09, 'triangle', 0.12); break;
            case 'whoosh': this.sweep(500, 1400, 0.22, 'sine', 0.08); break;
            case 'ring':   this.tone(880, 0, 0.16, 'sine', 0.12); this.tone(880, 0.26, 0.16, 'sine', 0.12); break;
            case 'tri':    this.tone(523, 0, 0.1, 'sine', 0.1); this.tone(659, 0.1, 0.1, 'sine', 0.1); this.tone(784, 0.2, 0.16, 'sine', 0.1); break;
        }
    },

    // 播放事件音效（receive 时可传 charId 走角色覆盖）
    play: function (event, charId) {
        var cfg = this.readConfig();
        var key = cfg[event];
        if (event === 'receive' && charId) {
            var cs = this.readCharSound(charId);
            if (cs) key = cs;
        }
        this.playKey(key);
    }
};
