/* MAOMAO · iOS 26 home screen customization
   Styles only app icon tiles and the dock; it never edits or restyles home widgets. */
(function () {
  'use strict';

  var STORAGE_KEY = 'maomao_liquid_glass_settings';
  var DEFAULTS = { style: 'clear', hue: 180, tone: 9, appearance: 'light', blur: 24 };
  var STYLES = [
    { key: 'default', label: '默认', note: 'Default' },
    { key: 'dark', label: '深色', note: 'Dark' },
    { key: 'clear', label: '透明', note: 'Clear' },
    { key: 'tinted', label: '色调', note: 'Tinted' }
  ];

  function clamp(value, min, max) {
    var number = Number(value);
    if (!Number.isFinite(number)) return min;
    return Math.max(min, Math.min(max, number));
  }

  function normalize(raw) {
    raw = raw && typeof raw === 'object' ? raw : {};
    var appearance = ['light', 'dark', 'auto'].indexOf(raw.appearance) >= 0 ? raw.appearance : DEFAULTS.appearance;
    var style = STYLES.some(function (item) { return item.key === raw.style; }) ? raw.style : DEFAULTS.style;
    return {
      style: style,
      hue: Math.round(clamp(raw.hue == null ? DEFAULTS.hue : raw.hue, 0, 360)),
      tone: Math.round(clamp(raw.tone == null ? DEFAULTS.tone : raw.tone, 0, 100)),
      appearance: appearance,
      blur: Math.round(clamp(raw.blur == null ? DEFAULTS.blur : raw.blur, 0, 40))
    };
  }

  function readSettings() {
    try {
      var raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
      return normalize(raw);
    } catch (error) {
      return normalize(DEFAULTS);
    }
  }

  var state = readSettings();

  function hslToRgb(h, s, l) {
    s /= 100;
    l /= 100;
    var c = (1 - Math.abs(2 * l - 1)) * s;
    var x = c * (1 - Math.abs((h / 60) % 2 - 1));
    var m = l - c / 2;
    var r = 0, g = 0, b = 0;
    if (h < 60) { r = c; g = x; }
    else if (h < 120) { r = x; g = c; }
    else if (h < 180) { g = c; b = x; }
    else if (h < 240) { g = x; b = c; }
    else if (h < 300) { r = x; b = c; }
    else { r = c; b = x; }
    return [r, g, b].map(function (v) { return Math.round((v + m) * 255); }).join(',');
  }

  function getTintRgb() {
    var saturation = 18 + state.tone * 0.54;
    var lightness = 97 - state.tone * 0.48;
    return hslToRgb(state.hue, saturation, lightness);
  }

  function syncControls() {
    document.querySelectorAll('[data-lg-style]').forEach(function (node) {
      var active = node.getAttribute('data-lg-style') === state.style;
      node.classList.toggle('selected', active);
      node.setAttribute('aria-pressed', active ? 'true' : 'false');
    });
    document.querySelectorAll('[data-lg-appearance]').forEach(function (node) {
      var active = node.getAttribute('data-lg-appearance') === state.appearance;
      node.classList.toggle('selected', active);
      node.setAttribute('aria-pressed', active ? 'true' : 'false');
    });
    document.querySelectorAll('[data-lg-hue]').forEach(function (node) { node.value = String(state.hue); });
    document.querySelectorAll('[data-lg-tone]').forEach(function (node) { node.value = String(state.tone); });
    document.querySelectorAll('[data-lg-preview]').forEach(function (node) {
      node.setAttribute('data-icon-style', state.style);
      node.setAttribute('data-icon-appearance', state.appearance);
      node.style.setProperty('--preview-glass-tint-rgb', getTintRgb());
      node.style.setProperty('--preview-glass-blur', state.blur + 'px');
      node.style.setProperty('--preview-icon-fill-alpha', state.style === 'clear' ? '.035' : '.20');
      node.style.setProperty('--preview-icon-highlight-alpha', state.style === 'clear' ? '.12' : '.28');
      node.style.setProperty('--preview-icon-tint-alpha', (.12 + state.tone * .0035).toFixed(3));
    });
    document.querySelectorAll('[data-lg-tone-value]').forEach(function (node) {
      node.style.setProperty('--lg-current-tint-rgb', getTintRgb());
    });
  }

  function syncLiquidGlassIcons() {
    var root = document.documentElement;
    var liquidTheme = root.getAttribute('data-theme') === 'liquid-glass';
    var shouldUseGlass = liquidTheme && state.style !== 'default';
    var icons = document.querySelectorAll('body.maomao-home .desktop-grid .app-icon, body.maomao-home .dock-bar .app-icon');
    var addedGlass = false;
    var rgb = getTintRgb();
    var toneAmount = state.tone / 100;

    icons.forEach(function (icon) {
      if (!shouldUseGlass) {
        if (icon.classList.contains('maomao-liquid-glass-icon')) {
          icon.classList.remove('glass', 'maomao-liquid-glass-icon');
          icon.removeAttribute('data-glass');
          icon.removeAttribute('data-glass-dim');
          icon.removeAttribute('data-glass-tone');
          icon.removeAttribute('data-lg-tone');
          icon.removeAttribute('data-glass-interactive');
          icon.style.removeProperty('--glass-fill-opacity');
          icon.style.removeProperty('--glass-fill-opacity-dark');
          icon.style.removeProperty('--glass-blur');
          icon.style.removeProperty('--_lg-fill');
        }
        return;
      }

      if (!icon.classList.contains('maomao-liquid-glass-icon')) addedGlass = true;
      icon.classList.add('glass', 'maomao-liquid-glass-icon');
      icon.setAttribute('data-glass-interactive', '');

      /* Clear is the intended desktop look: near-zero fill, live iPhone backdrop blur and lens rim. */
      icon.removeAttribute('data-glass');
      icon.removeAttribute('data-glass-dim');
      icon.removeAttribute('data-glass-tone');
      icon.removeAttribute('data-lg-tone');

      if (state.style === 'clear') {
        icon.setAttribute('data-glass', 'clear');
        icon.setAttribute('data-glass-dim', 'none');
        icon.style.setProperty('--glass-fill-opacity', '0.015');
        icon.style.setProperty('--glass-fill-opacity-dark', '0.018');
        icon.style.setProperty('--glass-blur', '3px');
        icon.style.setProperty('--_lg-fill', 'rgba(255,255,255,0.015)');
      } else if (state.style === 'dark') {
        icon.setAttribute('data-glass-tone', 'dark');
        icon.setAttribute('data-lg-tone', 'dark');
        icon.style.setProperty('--glass-fill-opacity', '0.12');
        icon.style.setProperty('--glass-fill-opacity-dark', '0.20');
        icon.style.setProperty('--glass-blur', '8px');
        icon.style.setProperty('--_lg-fill', 'rgba(22,22,28,0.38)');
      } else {
        var tintAlpha = (0.06 + toneAmount * 0.20).toFixed(3);
        icon.style.setProperty('--glass-fill-opacity', tintAlpha);
        icon.style.setProperty('--glass-fill-opacity-dark', (0.10 + toneAmount * 0.22).toFixed(3));
        icon.style.setProperty('--glass-blur', '6px');
        icon.style.setProperty('--_lg-fill', 'rgba(' + rgb + ',' + tintAlpha + ')');
      }
    });

    /* The selector restricts the vendor runtime to app icons; never upgrades widgets. */
    if (shouldUseGlass && addedGlass && window.LiquidGlass && typeof window.LiquidGlass.init === 'function' &&
        window.LiquidGlass.capabilities && window.LiquidGlass.capabilities.engine === 'unknown') {
      window.LiquidGlass.init({
        selector: '.maomao-liquid-glass-icon',
        preset: 'ios26',
        refraction: 'auto',
        observe: true,
        debug: false
      });
    }
  }

  function applySettings(shouldPersist) {
    state = normalize(state);
    var root = document.documentElement;
    var rgb = getTintRgb();
    var toneAmount = state.tone / 100;

    root.setAttribute('data-icon-style', state.style);
    root.setAttribute('data-icon-appearance', state.appearance);
    root.setAttribute('data-glass-tint', 'hue-' + state.hue);
    root.style.setProperty('--lg-glass-tint-rgb', rgb);
    root.style.setProperty('--lg-glass-blur', state.blur + 'px');

    /* Clear is genuinely transparent; its value is not a frosted white square. */
    root.style.setProperty('--lg-icon-fill-alpha', state.style === 'clear' ? '.025' : (state.style === 'tinted' ? (.10 + toneAmount * .28).toFixed(3) : '.20'));
    root.style.setProperty('--lg-icon-highlight-alpha', state.style === 'clear' ? '.15' : '.28');
    root.style.setProperty('--lg-icon-shadow-alpha', state.style === 'clear' ? '.018' : '.075');
    root.style.setProperty('--lg-icon-tint-alpha', (.10 + toneAmount * .32).toFixed(3));
    root.style.setProperty('--lg-icon-dark-alpha', '.62');
    root.style.setProperty('--lg-dock-fill-alpha', state.style === 'clear' ? '.065' : '.16');
    root.style.setProperty('--lg-dock-highlight-alpha', state.style === 'clear' ? '.17' : '.30');
    root.style.setProperty('--lg-dock-shadow-alpha', '.055');
    root.style.setProperty('--lg-hue', String(state.hue));

    syncLiquidGlassIcons();

    var hue = document.querySelector('[data-lg-hue]');
    var tone = document.querySelector('[data-lg-tone]');
    if (hue) hue.style.setProperty('--lg-hue', String(state.hue));
    if (tone) tone.style.setProperty('--lg-current-tint-rgb', rgb);

    syncControls();
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

  function weatherIcon(kind) {
    var sun = '<circle cx="43" cy="19" r="13" fill="#FFC52E"/><g stroke="#FFD54A" stroke-width="3" stroke-linecap="round"><path d="M43 1v5M43 32v5M25 19h5M56 19h5M30 6l4 4M52 28l4 4M56 6l-4 4"/></g>';
    var background = kind === 'default' ? '#2f9af7' : kind === 'dark' ? '#101014' : kind === 'tinted' ? 'rgba(var(--preview-glass-tint-rgb,214,215,222),.32)' : 'rgba(255,255,255,.045)';
    var sunMarkup = kind === 'clear' ? '<circle cx="43" cy="19" r="13" fill="rgba(255,255,255,.94)"/>' : sun;
    return '<span class="lg-mode-weather lg-mode-weather-' + kind + '" style="--lg-weather-background:' + background + '">' +
      '<svg viewBox="0 0 64 52" aria-hidden="true">' + sunMarkup +
      '<path d="M15 42C6 42 2 36 4 29c2-7 8-10 15-9C22 9 31 6 39 12c4 3 6 8 5 12 8-2 15 4 15 11 0 5-5 8-13 8H15Z" fill="rgba(255,255,255,.94)" stroke="rgba(255,255,255,.8)" stroke-width="1.5"/>' +
      '</svg></span>';
  }

  function buildPanel() {
    if (document.getElementById('liquidGlassControls')) return;
    var styleButtons = STYLES.map(function (item) {
      return '<button class="lg-style-option" type="button" data-lg-style="' + item.key +
        '" aria-pressed="false">' + weatherIcon(item.key) +
        '<strong>' + item.label + '</strong></button>';
    }).join('');

    var panel = document.createElement('div');
    panel.className = 'lg-controls-backdrop';
    panel.id = 'liquidGlassControls';
    panel.setAttribute('aria-hidden', 'true');
    panel.style.display = 'none';
    panel.style.pointerEvents = 'none';
    panel.innerHTML =
      '<section class="lg-controls-sheet" role="dialog" aria-modal="true" aria-labelledby="lgControlsTitle">' +
        '<div class="lg-sheet-topbar">' +
          '<span class="lg-control-symbol" aria-hidden="true"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M2 12h2m16 0h2M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42"/></svg></span>' +
          '<h2 id="lgControlsTitle">自定义</h2>' +
          '<button class="lg-control-symbol lg-control-layout" type="button" data-lg-close aria-label="完成自定义"><svg viewBox="0 0 24 24"><rect x="3" y="8" width="7" height="12" rx="2"/><rect x="13" y="3" width="8" height="17" rx="2"/></svg></button>' +
        '</div>' +
        '<div class="lg-style-grid" role="group" aria-label="图标外观">' + styleButtons + '</div>' +
        '<div class="lg-spectrum-row"><input type="range" min="0" max="360" step="1" value="' + state.hue + '" data-lg-hue aria-label="图标色调" class="lg-spectrum-slider"></div>' +
        '<div class="lg-tone-row" data-lg-tone-value><input type="range" min="0" max="100" step="1" value="' + state.tone + '" data-lg-tone aria-label="图标色调明暗" class="lg-tone-slider"></div>' +
        '<div class="lg-appearance-row" role="group" aria-label="图标明暗模式">' +
          '<button class="lg-appearance-option" type="button" data-lg-appearance="light" aria-pressed="false"><span class="lg-appearance-disc lg-light-disc"><svg viewBox="0 0 24 24"><rect x="7" y="3" width="10" height="18" rx="2"/><path d="M10 6h4"/></svg></span><span>浅色</span></button>' +
          '<button class="lg-appearance-option" type="button" data-lg-appearance="dark" aria-pressed="false"><span class="lg-appearance-disc lg-dark-disc"><svg viewBox="0 0 24 24"><rect x="7" y="3" width="10" height="18" rx="2"/><path d="M10 6h4"/></svg></span><span>深色</span></button>' +
          '<button class="lg-appearance-option" type="button" data-lg-appearance="auto" aria-pressed="false"><span class="lg-appearance-disc lg-auto-disc"><svg viewBox="0 0 24 24"><path d="M12 3a9 9 0 1 0 0 18V3Z"/><path d="M12 3a9 9 0 0 1 0 18"/></svg></span><span>自动</span></button>' +
          '<button class="lg-current-tint" type="button" data-lg-style="tinted" aria-label="使用当前色调"><span></span></button>' +
        '</div>' +
      '</section>';
    document.body.appendChild(panel);

    panel.addEventListener('click', function (event) {
      var target = event.target && event.target.closest ? event.target : null;
      if (!target) return;
      if (target === panel || target.closest('[data-lg-close]')) {
        closePanel();
        return;
      }
      var styleButton = target.closest('[data-lg-style]');
      if (styleButton) {
        state.style = styleButton.getAttribute('data-lg-style');
        applySettings(true);
        return;
      }
      var appearanceButton = target.closest('[data-lg-appearance]');
      if (appearanceButton) {
        state.appearance = appearanceButton.getAttribute('data-lg-appearance');
        applySettings(true);
      }
    });

    panel.querySelector('[data-lg-hue]').addEventListener('input', function (event) {
      state.hue = clamp(event.target.value, 0, 360);
      if (state.style === 'default' || state.style === 'dark' || state.style === 'clear') state.style = 'tinted';
      applySettings(true);
    });
    panel.querySelector('[data-lg-tone]').addEventListener('input', function (event) {
      state.tone = clamp(event.target.value, 0, 100);
      if (state.style === 'default' || state.style === 'dark' || state.style === 'clear') state.style = 'tinted';
      applySettings(true);
    });
  }

  function openPanel() {
    if (!document.getElementById('liquidGlassControls')) buildPanel();
    activateGlassTheme();
    var panel = document.getElementById('liquidGlassControls');
    if (!panel) return;
    panel.style.display = 'flex';
    panel.style.pointerEvents = 'auto';
    panel.classList.add('open');
    panel.setAttribute('aria-hidden', 'false');
    document.body.classList.add('lg-controls-open');
    applySettings(false);
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

  /* Expose one explicit entry point for the long-press menu and edit toolbar. */
  window.MAOMAOOpenIconCustomize = openPanel;

  document.addEventListener('click', function (event) {
    var target = event.target && event.target.closest ? event.target : null;
    if (!target) return;
    var trigger = target.closest('#editGlassBtn, #customizeLiquidGlassBtn');
    if (trigger) {
      event.preventDefault();
      event.stopPropagation();
      openPanel();
    }
  }, true);

  window.addEventListener('maomao:themechange', function () {
    applySettings(false);
  });
  window.addEventListener('pageshow', function () {
    applySettings(false);
  });

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