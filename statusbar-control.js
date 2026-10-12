/* ============================================================
 * statusbar-control.js
 * 全局状态栏控制：根据 localStorage 开关隐藏/显示 时间 与 电量图标
 *   settings_statusbar_time    = '0' 时隐藏时间
 *   settings_statusbar_battery = '0' 时隐藏电量/状态图标
 * 所有页面在 </body> 前引入本脚本即可自动生效。
 * ============================================================ */
(function () {
    'use strict';

    function getPref(key) {
        try { return localStorage.getItem(key); } catch (e) { return null; }
    }

    function apply() {
        var hideTime = getPref('settings_statusbar_time') === '0';
        var hideBattery = getPref('settings_statusbar_battery') === '0';
        var bars = document.querySelectorAll('.status-bar');
        for (var i = 0; i < bars.length; i++) {
            var sb = bars[i];
            /* ---- 时间元素：优先 .status-time / time / 无 class 的第一个 span ---- */
            var timeEl = sb.querySelector('.status-time') || sb.querySelector('time');
            if (!timeEl && sb.children && sb.children.length) {
                var c0 = sb.children[0];
                if (c0.tagName === 'SPAN' && !c0.className) timeEl = c0;
            }
            if (timeEl) {
                timeEl.style.display = hideTime ? 'none' : '';
            }
            /* ---- 电量/状态图标组 ---- */
            var icons = sb.querySelector('.status-icons');
            if (icons) {
                icons.style.display = hideBattery ? 'none' : '';
            }
            var bat = sb.querySelector('.battery-icon');
            if (bat) {
                bat.style.display = hideBattery ? 'none' : '';
            }
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', apply);
    } else {
        apply();
    }
    /* 暴露给设置页开关联动 */
    window.__statusbarControlApply = apply;
})();
