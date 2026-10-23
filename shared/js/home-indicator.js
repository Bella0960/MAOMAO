/* MAOMAO · tappable Home Indicator
   On app pages, tap the bottom line to return to the home screen.
   On the home screen, it closes edit/popup UI and returns to the first desktop page.
   Visibility shares the Appearance setting: settings_home_indicator_visible. */
(function (window, document) {
  'use strict';

  var PREF_KEY = 'settings_home_indicator_visible';
  var HOME_URL = '';
  var STYLE_ID = 'maomao-home-indicator-style';

  function getPreference() {
    try { return window.localStorage.getItem(PREF_KEY) !== '0'; }
    catch (error) { return true; }
  }

  function findHomeUrl() {
    var script = document.currentScript;
    if (!script || !script.src) {
      script = document.querySelector('script[data-maomao-home-indicator], script[src*="home-indicator.js"]');
    }
    if (!script || !script.src) {
      var native = document.querySelector('script[src*="native-feel.js"]');
      if (native && native.src) {
        try { return new URL('../../index.html', native.src).href; } catch (error) {}
      }
      return 'index.html';
    }
    try { return new URL('../../index.html', script.src).href; }
    catch (error) { return 'index.html'; }
  }

  function addStyles() {
    if (document.getElementById(STYLE_ID)) return;
    var style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = '.maomao-global-home-indicator {' +
      'appearance:none!important;-webkit-appearance:none!important;position:fixed!important;' +
      'left:50%!important;bottom:calc(3px + env(safe-area-inset-bottom,0px))!important;' +
      'transform:translateX(-50%)!important;display:flex!important;align-items:center!important;' +
      'justify-content:center!important;width:140px!important;min-width:140px!important;' +
      'max-width:140px!important;height:30px!important;min-height:30px!important;margin:0!important;' +
      'padding:0!important;border:0!important;outline:0!important;border-radius:0!important;' +
      'background:transparent!important;background-image:none!important;box-shadow:none!important;' +
      'color:transparent!important;z-index:2147483000!important;cursor:pointer!important;' +
      'pointer-events:auto!important;touch-action:manipulation!important;-webkit-tap-highlight-color:transparent!important;}' +
      '.maomao-global-home-indicator::before {' +
      'content:""!important;display:block!important;width:84px!important;height:4px!important;' +
      'border:0!important;outline:0!important;border-radius:999px!important;' +
      'background:rgba(28,28,33,.76)!important;box-shadow:0 1px 0 rgba(255,255,255,.32)!important;' +
      'pointer-events:none!important;transition:opacity .16s ease,transform .16s ease!important;}' +
      '.maomao-global-home-indicator:active::before {opacity:.56!important;transform:scaleX(.9)!important;}' +
      '@media(prefers-color-scheme:dark){.maomao-global-home-indicator::before{' +
      'background:rgba(255,255,255,.88)!important;box-shadow:0 1px 0 rgba(0,0,0,.18)!important;}}' +
      'body.maomao-home .phone-screen .gesture-bar {position:relative!important;cursor:pointer!important;' +
      'pointer-events:auto!important;touch-action:manipulation!important;-webkit-tap-highlight-color:transparent!important;z-index:60!important;}' +
      'body.maomao-home .phone-screen .gesture-bar::after {content:""!important;position:absolute!important;' +
      'left:-18px!important;right:-18px!important;top:-10px!important;bottom:-10px!important;' +
      'border:0!important;background:transparent!important;pointer-events:auto!important;}' +
      'html[data-theme="liquid-glass"] body.maomao-home .phone-screen .gesture-bar {' +
      'border:0!important;outline:0!important;box-shadow:none!important;}';
    (document.head || document.documentElement).appendChild(style);
  }

  function returnToHome() {
    if (!document.body.classList.contains('maomao-home')) {
      window.location.href = HOME_URL || 'index.html';
      return;
    }

    var menu = document.getElementById('homeActionMenu');
    if (menu) menu.remove();
    document.body.classList.remove('home-action-open');

    var glassPanel = document.getElementById('liquidGlassControls');
    if (glassPanel && glassPanel.classList.contains('open')) {
      var closeButton = glassPanel.querySelector('[data-lg-close]');
      if (closeButton) closeButton.click();
      else {
        glassPanel.classList.remove('open');
        glassPanel.style.display = 'none';
        glassPanel.setAttribute('aria-hidden', 'true');
      }
    }

    if (document.body.classList.contains('home-editing')) {
      var doneButton = document.getElementById('editDoneBtn');
      if (doneButton) doneButton.click();
    }

    var homeScreen = document.getElementById('homeScreen');
    if (homeScreen) {
      if (typeof homeScreen.scrollTo === 'function') homeScreen.scrollTo({ left: 0, top: 0, behavior: 'smooth' });
      else { homeScreen.scrollLeft = 0; homeScreen.scrollTop = 0; }
    }
  }

  function configureExistingBar(bar) {
    if (bar.dataset.maomaoHomeIndicatorReady === '1') return;
    bar.dataset.maomaoHomeIndicatorReady = '1';
    bar.setAttribute('role', 'button');
    bar.setAttribute('tabindex', '0');
    bar.setAttribute('aria-label', '返回桌面');
    bar.removeAttribute('aria-hidden');
    bar.title = '点击返回桌面';
    bar.style.display = getPreference() ? '' : 'none';
    bar.addEventListener('click', function (event) {
      event.preventDefault();
      event.stopPropagation();
      returnToHome();
    });
    bar.addEventListener('keydown', function (event) {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        returnToHome();
      }
    });
  }

  function createAppBar() {
    if (document.querySelector('.maomao-global-home-indicator')) return;
    var button = document.createElement('button');
    button.type = 'button';
    button.className = 'gesture-bar maomao-global-home-indicator';
    button.setAttribute('aria-label', '返回桌面');
    button.setAttribute('title', '返回桌面');
    button.setAttribute('data-maomao-global-home-indicator', '1');
    button.style.display = getPreference() ? 'flex' : 'none';
    button.addEventListener('click', function (event) {
      event.preventDefault();
      event.stopPropagation();
      returnToHome();
    });
    document.body.appendChild(button);
  }

  function applyPreference() {
    var visible = getPreference();
    document.querySelectorAll('.gesture-bar').forEach(function (bar) {
      bar.style.display = visible ? '' : 'none';
    });
    var appBar = document.querySelector('.maomao-global-home-indicator');
    if (appBar) appBar.style.display = visible ? 'flex' : 'none';
  }

  function init() {
    HOME_URL = findHomeUrl();
    addStyles();
    if (document.body.classList.contains('maomao-home')) {
      document.querySelectorAll('.gesture-bar').forEach(configureExistingBar);
    } else {
      createAppBar();
    }
    applyPreference();
    window.addEventListener('pageshow', applyPreference);
    window.addEventListener('storage', function (event) {
      if (!event.key || event.key === PREF_KEY) applyPreference();
    });
    window.addEventListener('maomao:home-indicator-change', applyPreference);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})(window, document);