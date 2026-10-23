/* MAOMAO · Liquid Glass controls
   Live tuning for the mobile home screen. Settings are stored separately from layout and wallpaper. */
(function () {
  'use strict';

  var STORAGE_KEY = 'maomao_liquid_glass_settings';
  var DEFAULTS = { opacity: 26, blur: 28, tint: 'silver' };
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
    var tint = TINTS.some(function (item) { return item.key === raw.tint; }) ? raw.tint : DEFAULTS.tint;
    return {
      opacity: Math.round(clamp(raw.opacity, 8, 65)),
      blur: Math.round(clamp(raw.blur, 8, 40)),
      tint: tint
    };
  }

  function readSettings() {
    try {
      var parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
      return normalize(parsed && typeof parsed === 'object' ? parsed : DEFAULTS);
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

  function applySettings(shouldPersist) {
    state = normalize(state);
    var tint = getTint(state.tint);
    var root = document.documentElement;
    root.style.setProperty('--lg-glass-alpha', String(state.opacity / 100));
    root.style.setProperty('--lg-glass-blur', state.blur + 'px');
    root.style.setProperty('--lg-glass-tint-rgb', tint.rgb);
    root.setAttribute('data-glass-tint', tint.key);

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
    document.querySelectorAll('[data-lg-preview]').forEach(function (node) {
      node.style.setProperty('--preview-glass-alpha', String(state.opacity / 100));
      node.style.setProperty('--preview-glass-blur', state.blur + 'px');
      node.style.setProperty('--preview-glass-tint-rgb', tint.rgb);
    });
    document.querySelectorAll('[data-lg-tint]').forEach(function (node) {
      var active = node.getAttribute('data-lg-tint') === state.tint;
      node.classList.toggle('selected', active);
      node.setAttribute('aria-pressed', active ? 'true' : 'false');
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

    var colorButtons = TINTS.map(function (tint) {
      return '<button class="lg-tint-option" type="button" data-lg-tint="' + tint.key +
        '" aria-pressed="false"><span class="lg-tint-swatch" style="--lg-swatch:' + tint.swatch +
        '"></span><span>' + tint.label + '</span></button>';
    }).join('');

    var panel = document.createElement('div');
    panel.className = 'lg-controls-backdrop';
    panel.id = 'liquidGlassControls';
    panel.setAttribute('aria-hidden', 'true');
    panel.innerHTML =
      '<section class="lg-controls-sheet" role="dialog" aria-modal="true" aria-labelledby="lgControlsTitle">' +
        '<div class="lg-sheet-grabber" aria-hidden="true"></div>' +
        '<header class="lg-controls-header">' +
          '<div><div class="lg-eyebrow">MAOMAO / APPEARANCE</div><h2 id="lgControlsTitle">Liquid Glass</h2>' +
          '<p>把玻璃调成喜欢的通透程度。</p></div>' +
          '<button class="lg-close-button" type="button" data-lg-close aria-label="关闭设置">×</button>' +
        '</header>' +
        '<div class="lg-glass-preview" data-lg-preview>' +
          '<div class="lg-preview-wallpaper"><span class="lg-preview-orb lg-preview-orb-a"></span><span class="lg-preview-orb lg-preview-orb-b"></span><span class="lg-preview-line"></span><span class="lg-preview-type">GLASS<br><b>26</b></span></div>' +
          '<div class="lg-preview-surface"><span>MAOMAO</span><strong>Liquid Glass</strong><i></i></div>' +
        '</div>' +
        '<div class="lg-control-group">' +
          '<div class="lg-control-label"><label for="lgOpacity">玻璃透明度</label><output data-lg-opacity-value>26%</output></div>' +
          '<input id="lgOpacity" class="lg-range" type="range" min="8" max="65" step="1" value="26" data-lg-opacity aria-label="玻璃透明度">' +
          '<div class="lg-range-captions"><span>更通透</span><span>更厚实</span></div>' +
        '</div>' +
        '<div class="lg-control-group">' +
          '<div class="lg-control-label"><label for="lgBlur">背景折射 / 模糊</label><output data-lg-blur-value>28 px</output></div>' +
          '<input id="lgBlur" class="lg-range" type="range" min="8" max="40" step="1" value="28" data-lg-blur aria-label="背景折射模糊强度">' +
          '<div class="lg-range-captions"><span>清晰</span><span>柔化</span></div>' +
        '</div>' +
        '<div class="lg-control-group">' +
          '<div class="lg-control-label"><span>玻璃色调</span><span class="lg-muted-label">MONOCHROME</span></div>' +
          '<div class="lg-tint-grid">' + colorButtons + '</div>' +
        '</div>' +
        '<footer class="lg-controls-footer">' +
          '<button class="lg-reset-button" type="button" data-lg-reset>恢复默认</button>' +
          '<button class="lg-done-button" type="button" data-lg-close>完成</button>' +
        '</footer>' +
      '</section>';

    document.body.appendChild(panel);

    panel.addEventListener('click', function (event) {
      if (event.target === panel || event.target.closest('[data-lg-close]')) {
        closePanel();
        return;
      }

      var tintButton = event.target.closest('[data-lg-tint]');
      if (tintButton) {
        state.tint = tintButton.getAttribute('data-lg-tint');
        applySettings(true);
      }

      if (event.target.closest('[data-lg-reset]')) {
        state = normalize(DEFAULTS);
        activateGlassTheme();
        applySettings(true);
      }
    });

    panel.querySelector('[data-lg-opacity]').addEventListener('input', function (event) {
      state.opacity = clamp(event.target.value, 8, 65);
      activateGlassTheme();
      applySettings(true);
    });
    panel.querySelector('[data-lg-blur]').addEventListener('input', function (event) {
      state.blur = clamp(event.target.value, 8, 40);
      activateGlassTheme();
      applySettings(true);
    });
  }

  function openPanel() {
    if (!document.getElementById('liquidGlassControls')) buildPanel();
    activateGlassTheme();
    applySettings(false);
    var panel = document.getElementById('liquidGlassControls');
    if (!panel) return;
    panel.classList.add('open');
    panel.setAttribute('aria-hidden', 'false');
    document.body.classList.add('lg-controls-open');
  }

  function closePanel() {
    var panel = document.getElementById('liquidGlassControls');
    if (!panel) return;
    panel.classList.remove('open');
    panel.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('lg-controls-open');
  }

  document.addEventListener('click', function (event) {
    var trigger = event.target.closest('#editGlassBtn, #customizeLiquidGlassBtn, [data-open-liquid-glass]');
    if (!trigger) return;
    event.preventDefault();
    event.stopPropagation();
    openPanel();
  }, true);

  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape') closePanel();
  });

  document.addEventListener('DOMContentLoaded', function () {
    buildPanel();
    applySettings(false);
  });

  /* This file is loaded near the end of index.html and Appearance, after the DOM exists. */
  if (document.readyState !== 'loading') {
    buildPanel();
    applySettings(false);
  }
})();