// 聊天美化预设加载器：在页面原有 CSS 解析完成后注入，确保预设能覆盖默认样式。
(function () {
  'use strict';

  function applyPresetStyles() {
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

      var style = document.getElementById('custom-beauty-css');
      if (!cssToApply.length) {
        if (style) style.remove();
        return;
      }
      if (!style) {
        style = document.createElement('style');
        style.id = 'custom-beauty-css';
        (document.head || document.documentElement).appendChild(style);
      }
      // 放在原页面样式之后注入，避免默认 CSS 把美化覆盖掉。
      style.textContent = cssToApply.join('\n');
    } catch (error) {
      // 美化预设异常不能影响聊天页面本身的运行。
      console.warn('[聊天美化] 预设加载失败：', error);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', applyPresetStyles, { once: true });
  } else {
    applyPresetStyles();
  }
})();