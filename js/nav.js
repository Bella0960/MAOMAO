/* 悬浮胶囊底部导航 - 自动注入 + 自动高亮 */
(function () {
    // 不注入导航的页面（手机桌面、聊天详情、设置页、编辑资料、记忆空间、角色管理）
    var SKIP_PAGES = ['index.html', 'chat-detail.html', 'settings.html', 'edit-profile.html', 'memory.html', 'characters.html', 'games/index.html', 'cafe/cafe.html'];
    var path = location.pathname.toLowerCase();
    for (var i = 0; i < SKIP_PAGES.length; i++) {
        if (path.indexOf(SKIP_PAGES[i]) !== -1) return;
    }

    // Tab 配置（key 用于高亮匹配，href 为跳转目标）
    var TABS = [
        {
            key: 'chat',
            label: '聊天',
            href: '/chat/chat.html',
            svg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>',
            badge: true
        },
        {
            key: 'games',
            label: '游戏',
            href: '/games/index.html',
            svg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9h12a4 4 0 0 1 3.8 5.2l-1 3.2a2 2 0 0 1-3.3 1l-2.2-2H8.7l-2.2 2a2 2 0 0 1-3.3-1l-1-3.2A4 4 0 0 1 6 9z"/><path d="M7 12v4M5 14h4M16.5 13h.01M19 15h.01"/></svg>',
            badge: false
        },
        {
            key: 'contacts',
            label: '联系人',
            href: '/chat/contacts.html',
            svg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
            badge: false
        },
        {
            key: 'moments',
            label: '空间',
            href: '/chat/moments.html',
            svg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/></svg>',
            badge: false
        },
        {
            key: 'profile',
            label: '我的',
            href: '/profile/profile.html',
            svg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>',
            badge: false
        }
    ];

    // 内联样式（极简毛玻璃 Dock 栏 · 紧凑居中自适应）
    var css = [
        '.floating-nav {',
        '    position: absolute;',
        '    bottom: 20px;',
        '    left: 0 !important;',
        '    right: 0 !important;',
        '    width: fit-content !important;',
        '    max-width: calc(100% - 32px);',
        '    margin: 0 auto !important;',
        '    display: flex;',
        '    align-items: center;',
        '    justify-content: center;',
        '    padding: 10px 12px 6px 12px !important;',
        '    gap: 8px !important;',
        '    background: rgba(255, 255, 255, 0.75) !important;',
        '    backdrop-filter: blur(12px) !important;',
        '    -webkit-backdrop-filter: blur(12px) !important;',
        '    border: 1px solid rgba(0, 0, 0, 0.05) !important;',
        '    border-radius: 24px;',
        '    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.05);',
        '    z-index: 500;',
        '}',
        '.nav-tab {',
        '    flex: 0 0 auto !important;',
        '    display: flex;',
        '    flex-direction: column;',
        '    align-items: center;',
        '    justify-content: center;',
        '    gap: 2px !important;',
        '    padding: 4px 6px !important;',
        '    border-radius: 999px;',
        '    color: #777777;',
        '    text-decoration: none;',
        '    font-size: 8px !important;',
        '    font-weight: 500;',
        '    line-height: 1;',
        '    white-space: nowrap;',
        '    position: relative;',
        '    transition: color 0.2s ease;',
        '    /* 手机端触摸优化：去掉点按灰光斑、禁止长按选中/呼出菜单、消除双击缩放延迟 */',
        '    -webkit-tap-highlight-color: transparent;',
        '    -webkit-touch-callout: none;',
        '    -webkit-user-select: none;',
        '    user-select: none;',
        '    touch-action: manipulation;',
        '}',
        '/* 图标背后的小圆底（仅选中时显示极淡浅灰圆，不使用大黑块） */',
        '.nav-ico {',
        '    width: 22px;',
        '    height: 22px;',
        '    border-radius: 50%;',
        '    display: flex;',
        '    align-items: center;',
        '    justify-content: center;',
        '    transform-origin: center bottom;',
        '    /* 松开手指：420ms 带过冲的回弹曲线，Q弹感来源 */',
        '    transition: transform 420ms cubic-bezier(0.34, 1.56, 0.64, 1), background 0.2s ease;',
        '}',
        '.nav-ico svg { width: 14px !important; height: 14px !important; display: block; stroke-width: 1.5 !important; }',
        '/* 选中态：图标轻微浮起放大 + 文字加粗变黑 */',
        '.nav-tab.active { color: #111111; font-weight: 700; }',
        '.nav-tab.active .nav-ico { background: rgba(0, 0, 0, 0.06); transform: translateY(-1px) scale(1.06); }',
        '/* 点按态：必须写在 .active 之后（两者优先级相同，靠书写顺序覆盖）。按下快速响应、不带过冲 */',
        '.nav-tab:active .nav-ico,',
        '.nav-tab.is-pressing .nav-ico {',
        '    transform: translateY(-5px) scale(1.12);',
        '    transition: transform 110ms ease-out, background 0.2s ease;',
        '}',
        '.nav-badge {',
        '    position: absolute;',
        '    top: 2px;',
        '    right: calc(50% - 12px);',
        '    width: 6px;',
        '    height: 6px;',
        '    background: rgba(0, 0, 0, 0.35);',
        '    border-radius: 50%;',
        '}'
    ].join('\n');

    var style = document.createElement('style');
    style.textContent = css;
    document.head.appendChild(style);

    // 生成导航 HTML 并根据当前页面高亮
    var currentPage = location.pathname.split('/').pop().toLowerCase();
    var tabsHTML = TABS.map(function (t) {
        var isActive = (t.key === 'games' ? location.pathname.toLowerCase().indexOf('/games/') !== -1 : currentPage.indexOf(t.key) !== -1);
        return '<a class="nav-tab' + (isActive ? ' active' : '') + '" href="' + t.href + '">' +
            '<span class="nav-ico">' + t.svg + '</span>' +
            '<span>' + t.label + '</span>' +
            (t.badge ? '<span class="nav-badge"></span>' : '') +
            '</a>';
    }).join('');
    var navHTML = '<nav class="floating-nav">' + tabsHTML + '</nav>';

    // 删除 chat.html 旧版底部导航
    var oldNav = document.querySelector('.bottom-nav');
    if (oldNav) oldNav.remove();

    // 注入到手机容器（优先 phone-mockup，保证 absolute 定位正确）
    var container = document.querySelector('.phone-mockup');
    if (container) {
        container.insertAdjacentHTML('beforeend', navHTML);
    } else {
        document.body.insertAdjacentHTML('beforeend', navHTML);
    }

    // 手机端触摸反馈：iOS 下 :active 可能延迟重绘，用类名保证按下立刻弹起
    var navEl = document.querySelector('.floating-nav');
    if (navEl) {
        var clearPress = function () {
            var pressed = navEl.querySelectorAll('.is-pressing');
            for (var i = 0; i < pressed.length; i++) pressed[i].classList.remove('is-pressing');
        };
        navEl.addEventListener('touchstart', function (e) {
            var tab = (e.target && e.target.closest) ? e.target.closest('.nav-tab') : null;
            if (!tab) return;
            clearPress(); // 防止多指同时按下时残留
            tab.classList.add('is-pressing');
        }, { passive: true });
        // 监听在 document 上：手指滑出 Dock 后松开也能复位
        document.addEventListener('touchend', clearPress, { passive: true });
        document.addEventListener('touchcancel', clearPress, { passive: true });
    }
})();
