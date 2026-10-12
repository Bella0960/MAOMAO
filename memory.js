//  记忆空间全局系统（零侵入，独立封装）
//  存储键名：phone_memory_data（与主项目数据隔离）

const memorySystem = {

    data: {
        memories: [],
        mood: "",
        dailyEvent: "",
        lastUpdate: ""
    },

    config: {
        moods: [
            "今天心情温软", "有一点点想你", "期待着什么",
            "想听听你的声音", "安静地注视世界", "心里很踏实",
            "被阳光晒得很舒服", "有点小雀跃"
        ],
        events: [
            "翻看了以前的聊天记录", "在窗边坐了很久",
            "脑海里闪过一个关于你的画面", "写下了一段没发出的文字",
            "听了一首很温柔的歌", "看着天空发了一会儿呆"
        ]
    },

    init() {
        const saved = (() => {
            try { return JSON.parse(localStorage.getItem('phone_memory_data')); }
            catch (e) { return null; }
        })();
        if (saved) {
            this.data = { ...this.data, ...saved };
        }
        this.dailyRefresh();
        this.renderMemoryPage();
    },

    dailyRefresh() {
        const today = new Date().toDateString();
        if (this.data.lastUpdate !== today) {
            this.data.lastUpdate = today;
            let newMood = this.config.moods[Math.floor(Math.random() * this.config.moods.length)];
            let newEvent = this.config.events[Math.floor(Math.random() * this.config.events.length)];
            if (newMood === this.data.mood && this.config.moods.length > 1) {
                const idx = this.config.moods.indexOf(newMood);
                newMood = this.config.moods[(idx + 1) % this.config.moods.length];
            }
            if (newEvent === this.data.dailyEvent && this.config.events.length > 1) {
                const idx = this.config.events.indexOf(newEvent);
                newEvent = this.config.events[(idx + 1) % this.config.events.length];
            }
            this.data.mood = newMood;
            this.data.dailyEvent = newEvent;
            this.save();
        }
    },

    addMemory(text) {
        if (!text || !text.trim()) return;
        const newMem = {
            id: Date.now(),
            date: new Date().toDateString(),
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            content: text.trim()
        };
        this.data.memories.unshift(newMem);
        if (this.data.memories.length > 60) {
            this.data.memories.pop();
        }
        this.save();
        this.renderMemoryPage();
    },

    deleteMemory(id) {
        this.data.memories = this.data.memories.filter(m => m.id !== id);
        this.save();
        this.renderMemoryPage();
    },

    save() {
        localStorage.setItem('phone_memory_data', JSON.stringify(this.data));
    },

    escapeHtml(s) {
        return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
            return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
        });
    },

    renderMemoryPage() {
        const moodEl = document.getElementById('mem-daily-mood');
        const eventEl = document.getElementById('mem-daily-event');
        const listEl = document.getElementById('mem-list');
        if (moodEl) moodEl.innerText = this.data.mood;
        if (eventEl) eventEl.innerText = this.data.dailyEvent;
        if (!listEl) return;

        if (this.data.memories.length === 0) {
            listEl.innerHTML = '<div style="text-align:center;color:#c7c7cc;padding:30px 0;font-size:13px;">还没有记忆<br>聊天时会自动沉淀</div>';
            return;
        }

        // 按日期分组（旧数据用 id 时间戳推断日期）
        const groups = {};
        this.data.memories.forEach(m => {
            const d = m.date || (m.id ? new Date(m.id).toDateString() : '未知');
            if (!groups[d]) groups[d] = [];
            groups[d].push(m);
        });
        const dates = Object.keys(groups).sort((a, b) => new Date(b) - new Date(a));
        const todayStr = new Date().toDateString();
        const yestStr = new Date(Date.now() - 86400000).toDateString();

        listEl.innerHTML = dates.map(date => {
            const items = groups[date];
            const label = date === todayStr ? '今天'
                : (date === yestStr ? '昨天'
                    : (function () { const d = new Date(date); return (d.getMonth() + 1) + '月' + d.getDate() + '日'; })());
            const visible = items.slice(0, 3);
            const more = items.length - 3;
            return `
            <div class="mem-group">
                <div class="mem-group-head">
                    <span class="mem-group-date">${this.escapeHtml(label)}</span>
                    <span class="mem-group-count">${items.length} 条</span>
                </div>
                ${visible.map(m => this.memLineHTML(m)).join('')}
                ${more > 0
                    ? '<div class="mem-group-more" onclick="memorySystem.toggleGroupRest(this)">展开其余 ' + more + ' 条</div>'
                    + '<div class="mem-group-rest" style="display:none;">' + items.slice(3).map(m => this.memLineHTML(m)).join('') + '</div>'
                    : ''}
            </div>`;
        }).join('');
        this.bindLineDelete();
    },

    memLineHTML(m) {
        return `
            <div class="mem-line">
                <span class="mem-line-time">${this.escapeHtml(m.time)}</span>
                <span class="mem-line-content">${this.escapeHtml(m.content)}</span>
                <button class="mem-line-del" data-id="${m.id}" aria-label="删除">×</button>
            </div>`;
    },

    bindLineDelete() {
        const listEl = document.getElementById('mem-list');
        if (!listEl) return;
        listEl.querySelectorAll('.mem-line-del').forEach(btn => {
            btn.onclick = function (e) {
                e.stopPropagation();
                const id = parseInt(this.getAttribute('data-id'), 10);
                if (confirm('删除这条记忆？')) memorySystem.deleteMemory(id);
            };
        });
    },

    toggleGroupRest(el) {
        const rest = el.nextElementSibling;
        if (!rest) return;
        if (rest.style.display === 'none') {
            rest.style.display = 'block';
            el.textContent = '收起';
        } else {
            rest.style.display = 'none';
            el.textContent = '展开其余 ' + (rest.children.length) + ' 条';
        }
    },

    getAIContext() {
        return `当前心情：${this.data.mood}；今日事件：${this.data.dailyEvent}。请在对话中自然体现这种状态。`;
    }
};

// 页面加载初始化（每日心情刷新 + 渲染，元素判空保证多页面安全）
document.addEventListener('DOMContentLoaded', () => memorySystem.init());
