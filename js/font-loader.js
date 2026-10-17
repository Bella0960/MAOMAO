/* 全局字号加载器：所有页面在 <head> 中最先引入本文件。
   读取 localStorage['font_size_global']（12-20px），迁移旧键 font_size，
   写入根变量 --base-font-size；rem 依据根字号公式自动缩放。 */
(function () {
    /* 1. 注入根变量默认值与根字号公式：14px 基准时 1rem = 16px */
    var style = document.createElement('style');
    style.textContent = ':root { --base-font-size: 14px; }'
        + 'html { font-size: calc(var(--base-font-size, 14px) / 14 * 16); }';
    document.head.appendChild(style);

    /* 2. 读取字号并应用 */
    function clamp(n) { return Math.min(20, Math.max(12, n)); }
    var size = null;
    try {
        var raw = localStorage.getItem('font_size_global');
        if (raw === null) {
            /* 旧键迁移（旧范围 10-20，钳制到 12-20） */
            var old = parseInt(localStorage.getItem('font_size'), 10);
            if (!isNaN(old)) {
                size = clamp(old);
                try { localStorage.setItem('font_size_global', String(size)); } catch (e) { }
            }
        } else {
            var n = parseInt(raw, 10);
            if (!isNaN(n)) size = clamp(n);
        }
    } catch (e) { }

    if (size !== null) {
        document.documentElement.style.setProperty('--base-font-size', size + 'px');
    }
})();
