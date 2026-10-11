/* 悬浮胶囊底部导航 - 自动注入 + 自动高亮 */
(function () {
    // 不注入导航的页面（手机桌面、聊天详情、设置页、编辑资料、记忆空间）
    var SKIP_PAGES = ['index.html', 'chat-detail.html', 'settings.html', 'edit-profile.html', 'memory.html'];
    var path = location.pathname.toLowerCase();
    for (var i = 0; i < SKIP_PAGES.length; i++) {
        if (path.indexOf(SKIP_PAGES[i]) !== -1) return;
    }

    // Tab 配置（key 用于高亮匹配，href 为跳转目标）
    var TABS = [
        {
            key: 'chat',
            label: '聊天',
            href: 'chat.html',
            svg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>',
            badge: true
        },
        {
            key: 'characters',
            label: '联系人',
            href: 'characters.html',
            svg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
            badge: false
        },
        {
            key: 'moments',
            label: '空间',
            href: 'moments.html',
            svg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/></svg>',
            badge: false
        },
        {
            key: 'profile',
            label: '我的',
            href: 'profile.html',
            svg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>',
            badge: false
        }
    ];

    // 内联样式（韩系极简悬浮胶囊）
    var css = [
        '.floating-nav {',
        '    position: absolute;',
        '    bottom: 20px;',
        '    left: 16px;',
        '    right: 16px;',
        '    display: flex;',
        '    padding: 6px;',
        '    gap: 2px;',
        '    background: rgba(255, 255, 255, 0.8);',
        '    backdrop-filter: blur(20px);',
        '    -webkit-backdrop-filter: blur(20px);',
        '    border-radius: 28px;',
        '    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.06);',
        '    z-index: 500;',
        '}',
        '.nav-tab {',
        '    flex: 1;',
        '    display: flex;',
        '    flex-direction: column;',
        '    align-items: center;',
        '    justify-content: center;',
        '    gap: 2px;',
        '    height: 52px;',
        '    border-radius: 22px;',
        '    color: #8E8E93;',
        '    text-decoration: none;',
        '    font-size: 10px;',
        '    line-height: 1;',
        '    position: relative;',
        '    transition: background 0.2s ease, color 0.2s ease;',
        '}',
        '.nav-tab svg { width: 22px; height: 22px; display: block; }',
        '.nav-tab.active { background: #1C1C1E; color: #ffffff; }',
        '.nav-tab:active { transform: scale(0.96); }',
        '.nav-badge {',
        '    position: absolute;',
        '    top: 7px;',
        '    right: calc(50% - 14px);',
        '    width: 7px;',
        '    height: 7px;',
        '    background: #FF3B30;',
        '    border-radius: 50%;',
        '}'
    ].join('\n');

    var style = document.createElement('style');
    style.textContent = css;
    document.head.appendChild(style);

    // 生成导航 HTML 并根据当前页面高亮
    var currentPage = location.pathname.split('/').pop().toLowerCase();
    var tabsHTML = TABS.map(function (t) {
        var isActive = currentPage.indexOf(t.key) !== -1;
        return '<a class="nav-tab' + (isActive ? ' active' : '') + '" href="' + t.href + '">' +
            t.svg +
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
})();
