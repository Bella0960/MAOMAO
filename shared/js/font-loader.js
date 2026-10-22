/* 全局字体加载器：所有页面在 <head> 中最先引入本文件。
 * 职责：
 *   1. 字号：读 localStorage['font_size_global']（12-20px，迁移旧键 font_size），
 *      写入 --base-font-size；注入 html { font-size: calc(...) } 根字号公式，
 *      全站 rem 文本自动缩放。同时导出无单位倍率 --global-font-scale（px 消费方用）。
 *   2. 字体颜色：读 custom_font_color（font-settings.html 色卡），写入
 *      --global-font-color，并在非暗色模式下把 body 文字色设为该颜色
 *      （显式指定了颜色的元素不受影响，聊天气泡由聊天美化系统接管，属刻意设计）。
 *   3. 兜底默认值同时写在 shared/css/mobile-fit.css 的 :root，双保险。
 */
(function () {
    var DEFAULT_COLOR = '#111111';

    /* 1. 注入根变量默认值与根字号公式：14px 基准时 1rem = 16px */
    var style = document.createElement('style');
    style.textContent = ':root { --base-font-size: 14px; --global-font-scale: 1; --global-font-color: ' + DEFAULT_COLOR + '; }'
        + 'html { font-size: calc(var(--base-font-size, 14px) / 14 * 16); }';
    document.head.appendChild(style);

    /* 2. 字号：读取 + 迁移 + 应用 */
    function clamp(n) { return Math.min(20, Math.max(12, n)); }
    function validColor(c) { return /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(c); }
    var size = null;
    var color = '';
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
        var c = (localStorage.getItem('custom_font_color') || '').trim();
        if (validColor(c)) color = c;
    } catch (e) { }

    var root = document.documentElement;
    if (size !== null) {
        root.style.setProperty('--base-font-size', size + 'px');
        /* px 写死方的缩放倍率：calc(11px * var(--global-font-scale, 1)) */
        root.style.setProperty('--global-font-scale', String(Math.round(size / 14 * 1000) / 1000));
    }
    if (color) {
        root.style.setProperty('--global-font-color', color);
        /* body 文字色需等 body 存在后再以内联方式写入（内联 > 页面样式表的 body 色）。
           暗色模式页面跳过：黑白色卡在深底上会不可读。 */
        var applyBodyColor = function () {
            try {
                if (!root.classList.contains('dark')) {
                    document.body.style.color = color;
                }
            } catch (e) { }
        };
        if (document.body) applyBodyColor();
        else document.addEventListener('DOMContentLoaded', applyBodyColor);
    }
})();
