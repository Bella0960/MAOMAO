/* MAOMAO · iOS 26 Home Screen icon customization
   Changes only home-screen app icon tiles and the Dock. Layout, widgets and wallpaper remain untouched. */
(function () {
  'use strict';

  var STORAGE_KEY = 'maomao_liquid_glass_settings';
  var DEFAULTS = { style: 'clear', opacity: 28, blur: 24, tint: 'silver' };
  var STYLES = [
    { key: 'default', label: '默认', note: '原始图标' },
    { key: 'dark', label: '深色', note: '深色玻璃' },
    { key: 'clear', label: '透明', note: 'Clear' },
    { key: 'tinted', label: '色调', note: 'Tinted' }
  ];
  var TINTS = [
    { key: 'clear', label: '晶透白', rgb: '255,255,255', swatch: '#FFFFFF' },
    { key: 'ice', label: '冰雾白', rgb: '241,242,246', swatch: '#F1F2F6' },
    { key: 'silver', label: '月光银', rgb: '214,215,222', swatch: '#D6D7DE' },
    { key: 'smoke', label: '雾面灰', rgb: '174,175,183', swatch: '#AEAFB7' },
    { key: 'stone', label: '深雾灰', rgb: '122,123,132', swatch: '#7A7B84' }
  ];

  function clamp(value, min, max) {
    var number = Number(value);
    if (!Number.isFinite(number)) return min;
    return Math.max(min, Math.min(max, number));
  }

  function normalize(raw) {
    raw = raw && typeof raw === 'object' ? raw : {};
    return {
      style: STYLES.some(function (item) { return item.key === raw.style; }) ? raw.style : DEFAULTS.style,
      opacity: Math.round(clamp(raw.opacity, 0, 80)),
      blur: Math.round(clamp(raw.blur, 0, 40)),
      tint: TINTS.some(function (item) { return item.key === raw.tint; }) ? raw.tint : DEFAULTS.tint
    };
  }

  function readSettings() {
    try {
      var parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
      return normalize(parsed);
    } catch (error) {
      return normalize(DEFAULTS);
    }
  }

  var state = readSettings();

  function getTint(key) {
    for (var i = 0; i < TINTS.length; i++) {
      if (TINTS[i].key === key) return TINTS[i];
    }
    return TINTS[2];
  }

  function getOpacityVars() {
    var amount = state.opacity / 100;
    return {
      fill: (amount * 0.34).toFixed(3),
      highlight: (0.035 + amount * 0.62).toFixed(3),
      shadow: Math.max(0.008, amount * 0.13).toFixed(3),
      tint: (amount * 0.82).toFixed(3),
      dark: (0.18 + amount * 0.62).toFixed(3),
      dock: (0.035 + amount * 0.33).toFixed(3),
      dockHighlight: (0.10 + amount * 0.48).toFixed(3),
      dockShadow: (0.015 + amount * 0.12).toFixed(3)
    };
  }

  function applySettings(shouldPersist) {
    state = normalize(state);
    var tint = getTint(state.tint);
    var values = getOpacityVars();
    var root = document.documentElement;

    root.setAttribute('data-icon-style', state.style);
    root.setAttribute('data-glass-tint', tint.key);
    root.style.setProperty('--lg-glass-blur', state.blur + 'px');
    root.style.setProperty('--lg-glass-tint-rgb', tint.rgb);
    root.style.setProperty('--lg-icon-fill-alpha', values.fill);
    root.style.setProperty('--lg-icon-highlight-alpha', values.highlight);
    root.style.setProperty('--lg-icon-shadow-alpha', values.shadow);
    root.style.setProperty('--lg-icon-tint-alpha', values.tint);
    root.style.setProperty('--lg-icon-dark-alpha', values.dark);
    root.style.setProperty('--lg-dock-fill-alpha', values.dock);
    root.style.setProperty('--lg-dock-highlight-alpha', values.dockHighlight);
    root.style.setProperty('--lg-dock-shadow-alpha', values.dockShadow);

    document.querySelectorAll('[data-lg-opacity-value]').forEach(function (node) {
      node.textContent = state.opacity + '%';
    });
    document.querySelectorAll('[data-lg-blur-value]').forEach(function (node) {
      node.textContent = state.blur + ' px';
    });
    document.querySelectorAll('[data-lg-opacity]').forEach(function (node) {
      node.value = String(state.opacity);
    });
    document.querySelectorAll('[data-lg-blur]').forEach(function (node) {
      node.value = String(state.blur);
    });
    document.querySelectorAll('[data-lg-style]').forEach(function (node) {
      var active = node.getAttribute('data-lg-style') === state.style;
      node.classList.toggle('selected', active);
      node.setAttribute('aria-pressed', active ? 'true' : 'false');
    });
    document.querySelectorAll('[data-lg-tint]').forEach(function (node) {
      var active = node.getAttribute('data-lg-tint') === state.tint;
      node.classList.toggle('selected', active);
      node.setAttribute('aria-pressed', active ? 'true' : 'false');
    });
    document.querySelectorAll('[data-lg-preview]').forEach(function (node) {
      node.setAttribute('data-icon-style', state.style);
      node.style.setProperty('--preview-icon-fill-alpha', values.fill);
      node.style.setProperty('--preview-icon-highlight-alpha', values.highlight);
      node.style.setProperty('--preview-icon-tint-alpha', values.tint);
      node.style.setProperty('--preview-icon-dark-alpha', values.dark);
      node.style.setProperty('--preview-glass-blur', state.blur + 'px');
      node.style.setProperty('--preview-glass-tint-rgb', tint.rgb);
    });

    if (shouldPersist !== false) {
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (error) {}
    }
    try {
      window.dispatchEvent(new CustomEvent('maomao:glasssettingschange', { detail: { settings: state } }));
    } catch (error) {}
  }

  function activateGlassTheme() {
    if (window.MAOMAOTheme && typeof window.MAOMAOTheme.set === 'function') {
      window.MAOMAOTheme.set('liquid-glass');
    } else {
      try { localStorage.setItem('maomao_theme', 'liquid-glass'); } catch (error) {}
      document.documentElement.setAttribute('data-theme', 'liquid-glass');
    }
    applySettings(true);
  }

  function buildPanel() {
    if (document.getElementById('liquidGlassControls')) return;

    var styleButtons = STYLES.map(function (item) {
      return '<button class="lg-style-option" type="button" data-lg-style="' + item.key +
        '" aria-pressed="false"><span class="lg-style-icon lg-style-icon-' + item.key +
        '"><i></i><i></i><i></i></span><strong>' + item.label + '</strong><small>' +
        item.note + '</small></button>';
    }).join('');

    var tintButtons = TINTS.map(function (item) {
      return '<button class="lg-tint-option" type="button" data-lg-tint="' + item.key +
        '" aria-pressed="false"><span class="lg-tint-swatch" style="--lg-swatch:' + item.swatch +
        '"></span><span>' + item.label + '</span></button>';
    }).join('');

    var panel = document.createElement('div');
    panel.className = 'lg-controls-backdrop';
    panel.id = 'liquidGlassControls';
    panel.setAttribute('aria-hidden', 'true');
    panel.style.display = 'none';
    panel.style.pointerEvents = 'none';
    panel.innerHTML =
      '<section class="lg-controls-sheet" role="dialog" aria-modal="true" aria-labelledby="lgControlsTitle">' +
        '<div class="lg-sheet-grabber" aria-hidden="true"></div>' +
        '<header class="lg-controls-header">' +
          '<div><div class="lg-eyebrow">HOME SCREEN / CUSTOMIZE</div><h2 id="lgControlsTitle">自定义图标</h2>' +
          '<p>只调整桌面应用图标和底部 Dock，不改变挂件。</p></div>' +
          '<button class="lg-close-button" type="button" data-lg-close aria-label="关闭自定义面板">×</button>' +
        '</header>' +
        '<div class="lg-glass-preview" data-lg-preview data-icon-style="clear">' +
          '<div class="lg-preview-wallpaper"><span class="lg-preview-orb lg-preview-orb-a"></span><span class="lg-preview-orb lg-preview-orb-b"></span><span class="lg-preview-line"></span></div>' +
          '<div class="lg-preview-apps">' +
            '<span class="lg-preview-icon lg-preview-icon-a"><i></i></span>' +
            '<span class="lg-preview-icon lg-preview-icon-b"><i></i></span>' +
            '<span class="lg-preview-icon lg-preview-icon-c"><i></i></span>' +
            '<span class="lg-preview-icon lg-preview-icon-d"><i></i></span>' +
          '</div>' +
          '<div class="lg-preview-dock"><span class="lg-preview-dock-icon"></span><span class="lg-preview-dock-icon"></span><span class="lg-preview-dock-icon"></span><span class="lg-preview-dock-icon"></span></div>' +
        '</div>' +
        '<div class="lg-control-group">' +
          '<div class="lg-control-label"><span>图标外观</span><span class="lg-muted-label">IOS 26 STYLE</span></div>' +
          '<div class="lg-style-grid">' + styleButtons + '</div>' +
        '</div>' +
        '<div class="lg-control-group">' +
          '<div class="lg-control-label"><label for="lgOpacity">图标透明度</label><output data-lg-opacity-value>28%</output></div>' +
          '<input id="lgOpacity" class="lg-range" type="range" min="0" max="80" step="1" value="28" data-lg-opacity aria-label="应用图标透明度">' +
          '<div class="lg-range-captions"><span>更透明</span><span>更实</span></div>' +
        '</div>' +
        '<div class="lg-control-group">' +
          '<div class="lg-control-label"><label for="lgBlur">玻璃背景柔化</label><output data-lg-blur-value>24 px</output></div>' +
          '<input id="lgBlur" class="lg-range" type="range" min="0" max="40" step="1" value="24" data-lg-blur aria-label="图标玻璃模糊程度">' +
          '<div class="lg-range-captions"><span>清晰</span><span>柔化</span></div>' +
        '</div>' +
        '<div class="lg-control-group">' +
          '<div class="lg-control-label"><span>图标色调</span><span class="lg-muted-label">BLACK / WHITE / GREY</span></div>' +
          '<div class="lg-tint-grid">' + tintButtons + '</div>' +
        '</div>' +
        '<footer class="lg-controls-footer">' +
          '<button class="lg-reset-button" type="button" data-lg-reset>恢复默认</button>' +
          '<button class="lg-done-button" type="button" data-lg-close>完成</button>' +
        '</footer>' +
      '</section>';

    document.body.appendChild(panel);

    panel.addEventListener('click', function (event) {
      if (event.target === panel || (event.target.closest && event.target.closest('[data-lg-close]'))) {
        closePanel();
        return;
      }

      var styleButton = event.target.closest && event.target.closest('[data-lg-style]');
      if (styleButton) {
        state.style = styleButton.getAttribute('data-lg-style');
        activateGlassTheme();
        applySettings(true);
        return;
      }

      var tintButton = event.target.closest && event.target.closest('[data-lg-tint]');
      if (tintButton) {
        state.tint = tintButton.getAttribute('data-lg-tint');
        activateGlassTheme();
        applySettings(true);
        return;
      }

      if (event.target.closest && event.target.closest('[data-lg-reset]')) {
        state = normalize(DEFAULTS);
        activateGlassTheme();
        applySettings(true);
      }
    });

    panel.querySelector('[data-lg-opacity]').addEventListener('input', function (event) {
      state.opacity = clamp(event.target.value, 0, 80);
      applySettings(true);
    });
    panel.querySelector('[data-lg-blur]').addEventListener('input', function (event) {
      state.blur = clamp(event.target.value, 0, 40);
      applySettings(true);
    });
  }

  function openPanel() {
    if (!document.getElementById('liquidGlassControls')) buildPanel();
    activateGlassTheme();
    applySettings(false);
    var panel = document.getElementById('liquidGlassControls');
    if (!panel) return;
    panel.style.display = 'flex';
    panel.style.pointerEvents = 'auto';
    panel.classList.add('open');
    panel.setAttribute('aria-hidden', 'false');
    document.body.classList.add('lg-controls-open');
  }

  function closePanel() {
    var panel = document.getElementById('liquidGlassControls');
    if (!panel) return;
    panel.classList.remove('open');
    panel.setAttribute('aria-hidden', 'true');
    panel.style.pointerEvents = 'none';
    panel.style.display = 'none';
    document.body.classList.remove('lg-controls-open');
  }

  document.addEventListener('click', function (event) {
    var target = event.target && event.target.closest ? event.target : null;
    if (!target) return;

    var trigger = target.closest('#editGlassBtn, #customizeLiquidGlassBtn, [data-open-liquid-glass]');
    if (trigger) {
      event.preventDefault();
      event.stopPropagation();
      openPanel();
      return;
    }

    var settingsTile = target.closest('.app-tile[data-name="设置"], .app-tile[data-href="settings/settings.html"]');
    if (settingsTile) {
      event.preventDefault();
      event.stopPropagation();
      window.location.href = settingsTile.getAttribute('data-href') || 'settings/settings.html';
    }
  }, true);

  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape') closePanel();
  });

  document.addEventListener('DOMContentLoaded', function () {
    buildPanel();
    applySettings(false);
  });

  if (document.readyState !== 'loading') {
    buildPanel();
    applySettings(false);
  }
})();