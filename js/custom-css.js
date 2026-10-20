// 聊天美化预设加载器：聊天列表和聊天详情共用「聊天全局」预设，角色预设只作用于对应角色详情页。
(function () {
  'use strict';
  try {
    var presets = JSON.parse(localStorage.getItem('beauty_presets') || '[]');
    var active = JSON.parse(localStorage.getItem('beauty_active') || '{}');
    if (!Array.isArray(presets) || !presets.length || !active || typeof active !== 'object') return;

    var path = (location.pathname || '').toLowerCase();
    var isChatDetail = /chat-detail\.html$/.test(path);
    var params = new URLSearchParams(location.search || '');
    var currentRole = params.get('id') || '';
    var cssToApply = [];

    // 「聊天全局」预设应用于聊天列表与聊天详情页。
    presets.forEach(function (preset) {
      if (preset && preset.target === 'all' &&
          active.all === preset.name && typeof preset.css === 'string') {
        cssToApply.push(preset.css);
      }
    });

    // 角色专属预设只在角色聊天详情页加载，避免串到列表或群聊。
    if (isChatDetail && currentRole && !/^g/i.test(currentRole)) {
      presets.forEach(function (preset) {
        if (preset && preset.target === currentRole &&
            active[currentRole] === preset.name && typeof preset.css === 'string') {
          cssToApply.push(preset.css);
        }
      });
    }

    if (!cssToApply.length) return;
    var style = document.getElementById('custom-beauty-css');
    if (!style) {
      style = document.createElement('style');
      style.id = 'custom-beauty-css';
      (document.head || document.documentElement).appendChild(style);
    }
    style.textContent = cssToApply.join('\n');
  } catch (error) {
    // 美化预设异常不能影响聊天页面本身的运行。
    console.warn('[聊天美化] 预设加载失败：', error);
  }
})();