/* native-feel.js —— 全局"原生手感"增强
   1. 禁文本选择/长按菜单、去点按高亮、惯性滚动、防页面回弹
   2. 页面切换淡入淡出（掩盖跳转白屏；刷新与返回键不触发淡出）
   3. 点击震动反馈（安卓生效，iOS 自动跳过）
   引入方式：每个页面 <head> 中、font-loader.js 之后同步引入 */
(function () {
    'use strict';

    /* ---------- 一、全局原生 CSS（脚本在 head 同步执行，先于首屏绘制注入） ---------- */
    var css = [
        'html {',
        '    -webkit-user-select: none;',
        '    user-select: none;',
        '    -webkit-touch-callout: none;',            /* 长按不弹出系统复制菜单 */
        '    -webkit-tap-highlight-color: transparent;',
        '    overscroll-behavior-y: none;',            /* 防止页面橡皮筋回弹/下拉刷新 */
        '    -webkit-overflow-scrolling: touch;',      /* 继承属性，所有滚动容器获得 iOS 惯性滚动 */
        '    transition: opacity 0.15s ease;',         /* 淡入/淡出共用同一条过渡 */
        '    opacity: 1;',
        '}',
        '* { -webkit-tap-highlight-color: transparent; }',
        'html, body { overscroll-behavior-y: none; }',
        /* 内层滚动容器：阻止滚动到底后把回弹传给页面 */
        '[class*="scroll"], .chat-stage { overscroll-behavior-y: none; }',
        /* 输入类元素恢复可选中，否则无法打字/选字/粘贴 */
        'input, textarea, select, [contenteditable="true"] {',
        '    -webkit-user-select: text;',
        '    user-select: text;',
        '    -webkit-touch-callout: default;',
        '}',
        /* 启动淡入态（首屏绘制前）与跳转淡出态（点击链接后） */
        'html.nf-boot, html.nf-hide { opacity: 0 !important; }',
        /* 消除双击缩放延迟 */
        'a, button, [role="button"] { touch-action: manipulation; }',
        /* 按压反馈：瞬间缩放，最接近原生手感（不加过渡，避免覆盖各按钮已有 transition） */
        'a:active, button:active, [role="button"]:active { transform: scale(0.97); }'
    ].join('\n');
    var style = document.createElement('style');
    style.textContent = css;
    document.head.appendChild(style);

    /* ---------- 二、启动淡入：首屏绘制前先整页透明，加载完成后 150ms 淡入 ---------- */
    function showPage() {
        var de = document.documentElement;
        de.classList.remove('nf-boot');
        de.classList.remove('nf-hide');
    }
    document.documentElement.classList.add('nf-boot');
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', showPage);
    } else {
        showPage();
    }
    /* 安卓返回键/前进从缓存(bfcache)恢复页面时：强制立即显示，防止整页停在透明状态 */
    window.addEventListener('pageshow', function (e) {
        if (e.persisted) showPage();
    });

    /* ---------- 三、跳转淡出：仅点击链接/跳转按钮时触发，刷新与返回键不触发 ---------- */
    var FADE_MS = 150;
    var hideTimer = null;

    function startFadeOut() {
        document.documentElement.classList.add('nf-hide');
        /* 兜底：400ms 内页面没真正跳走（如条件跳转被拦截），自动恢复显示 */
        if (hideTimer) clearTimeout(hideTimer);
        hideTimer = setTimeout(function () {
            document.documentElement.classList.remove('nf-hide');
        }, 400);
    }

    function isPlainHref(href) {
        return !href || href.charAt(0) === '#' ||
            /^(javascript|mailto|tel):/i.test(href);
    }

    document.addEventListener('click', function (e) {
        if (e.defaultPrevented || e.button !== 0 ||
            e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

        /* 1. 普通 <a> 链接：接管跳转，先淡出 150ms 再真正跳转 */
        var link = (e.target.closest) ? e.target.closest('a[href]') : null;
        if (link && !isPlainHref(link.getAttribute('href')) &&
            link.target !== '_blank' && !link.hasAttribute('download') &&
            link.href !== location.href) {
            e.preventDefault();
            startFadeOut();
            setTimeout(function () { location.href = link.href; }, FADE_MS);
            return;
        }

        /* 2. onclick 里写了 location.href 的按钮：只加淡出，完全不干涉原逻辑 */
        var btn = (e.target.closest) ? e.target.closest('[onclick]') : null;
        if (btn) {
            var code = btn.getAttribute('onclick') || '';
            if (/location\s*\.\s*(href\s*=|replace\s*\(|assign\s*\()/i.test(code)) {
                startFadeOut();
            }
        }
    }, false);

    /* ---------- 四、触觉反馈：捕获阶段委托，覆盖按钮与链接 ---------- */
    var TAP_SELECTOR = 'button, a, [role="button"], .nav-tab, .nav-circle-btn, .dock-item, .tab-item, .app-card';
    document.addEventListener('click', function (e) {
        var el = (e.target.closest) ? e.target.closest(TAP_SELECTOR) : null;
        if (!el || el.disabled) return;
        if (navigator.vibrate) {
            try { navigator.vibrate(15); } catch (err) { /* 不支持时忽略 */ }
        }
    }, true);

    /* ---------- 五、Service Worker 更新后自动刷新一次 ----------
       本地开发改了代码，浏览器可能仍被旧 SW 缓存命中。
       新 SW 接管页面时 controllerchange 触发，自动刷新一次拿到最新版。
       sessionStorage 标记防循环刷新。 */
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.addEventListener('controllerchange', function () {
            try {
                if (sessionStorage.getItem('sw_reloaded')) return;
                sessionStorage.setItem('sw_reloaded', '1');
                location.reload();
            } catch (err) { /* 隐私模式等异常场景直接忽略 */ }
        });
    }
})();
