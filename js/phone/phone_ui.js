/* ============================================================
 * phone_ui.js  —  公共 UI 工具
 *
 * 职责：
 *   1. Toast 提示（不依赖任何 DOM 结构，动态插入）
 *   2. Loading 遮罩（单 App 刷新 / 整机刷新时显示）
 *   3. Confirm 确认弹窗（统一样式）
 *   4. 返回按钮（保持统一交互）
 *
 * 不依赖 phone_storage/api/context/apps 任何模块，可单独引用。
 * ============================================================ */

(function (global) {
    'use strict';

    var NS = global.PhoneUI = {};

    /* ========== Toast ========== */

    var _toastEl = null;
    var _toastTimer = null;

    function ensureToast() {
        if (_toastEl && document.body.contains(_toastEl)) return _toastEl;
        _toastEl = document.createElement('div');
        _toastEl.style.cssText =
            'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);' +
            'z-index:99999;background:rgba(28,28,30,0.92);color:#fff;' +
            'font-size:13px;padding:12px 22px;border-radius:12px;' +
            'pointer-events:none;opacity:0;transition:opacity 0.2s ease;' +
            'max-width:80vw;text-align:center;line-height:1.4;';
        document.body.appendChild(_toastEl);
        return _toastEl;
    }

    NS.showToast = function (text, durationMs) {
        var el = ensureToast();
        el.textContent = String(text == null ? '' : text);
        el.style.opacity = '1';
        if (_toastTimer) clearTimeout(_toastTimer);
        _toastTimer = setTimeout(function () {
            el.style.opacity = '0';
        }, durationMs || 1500);
    };

    /* ========== Loading 遮罩 ========== */

    var _loadingEl = null;
    var _loadingText = '';

    function ensureLoading() {
        if (_loadingEl && document.body.contains(_loadingEl)) return _loadingEl;

        var wrap = document.createElement('div');
        wrap.style.cssText =
            'position:fixed;inset:0;background:rgba(0,0,0,0.45);' +
            'z-index:99998;display:flex;align-items:center;justify-content:center;' +
            'flex-direction:column;gap:12px;';

        var box = document.createElement('div');
        box.style.cssText =
            'background:rgba(28,28,30,0.95);border-radius:16px;padding:24px 32px;' +
            'display:flex;flex-direction:column;align-items:center;gap:14px;';

        var spinner = document.createElement('div');
        spinner.style.cssText =
            'width:32px;height:32px;border:3px solid rgba(255,255,255,0.2);' +
            'border-top-color:#fff;border-radius:50%;' +
            'animation:phoneui-spin 0.9s linear infinite;';

        var text = document.createElement('div');
        text.style.cssText = 'color:#fff;font-size:13px;';
        text.id = 'phoneui-loading-text';

        box.appendChild(spinner);
        box.appendChild(text);
        wrap.appendChild(box);

        // 注入动画 keyframes（只注入一次）
        if (!document.getElementById('phoneui-style')) {
            var style = document.createElement('style');
            style.id = 'phoneui-style';
            style.textContent = '@keyframes phoneui-spin { to { transform: rotate(360deg); } }';
            document.head.appendChild(style);
        }

        wrap.style.display = 'none';
        document.body.appendChild(wrap);
        _loadingEl = wrap;
        return wrap;
    }

    NS.showLoading = function (text) {
        var wrap = ensureLoading();
        _loadingText = text || '加载中...';
        var t = wrap.querySelector('#phoneui-loading-text');
        if (t) t.textContent = _loadingText;
        wrap.style.display = 'flex';
    };

    NS.hideLoading = function () {
        if (!_loadingEl) return;
        _loadingEl.style.display = 'none';
    };

    NS.updateLoading = function (text) {
        if (!_loadingEl) return;
        var t = _loadingEl.querySelector('#phoneui-loading-text');
        if (t) t.textContent = text;
    };

    /* ========== Confirm 弹窗 ========== */

    NS.confirm = function (opts) {
        opts = opts || {};
        var title   = opts.title   || '提示';
        var message = opts.message || '';
        var okText  = opts.okText  || '确定';
        var cancelText = opts.cancelText || '取消';

        return new Promise(function (resolve) {
            // backdrop
            var backdrop = document.createElement('div');
            backdrop.style.cssText =
                'position:fixed;inset:0;background:rgba(0,0,0,0.45);z-index:99997;' +
                'display:flex;align-items:center;justify-content:center;';

            var card = document.createElement('div');
            card.style.cssText =
                'background:#fff;border-radius:16px;padding:20px 24px;' +
                'min-width:260px;max-width:80vw;text-align:center;';

            var h = document.createElement('div');
            h.style.cssText = 'font-size:15px;font-weight:600;color:#111;margin-bottom:10px;';
            h.textContent = title;

            var m = document.createElement('div');
            m.style.cssText = 'font-size:13px;color:#666;margin-bottom:18px;line-height:1.5;white-space:pre-wrap;';
            m.textContent = message;

            var btnRow = document.createElement('div');
            btnRow.style.cssText = 'display:flex;gap:10px;justify-content:center;';

            var mkBtn = function (text, primary) {
                var b = document.createElement('button');
                b.textContent = text;
                b.style.cssText =
                    'padding:8px 20px;border-radius:10px;border:none;font-size:13px;' +
                    'cursor:pointer;font-family:inherit;' +
                    (primary ? 'background:#1C1C1E;color:#fff;' : 'background:#F2F2F7;color:#333;');
                return b;
            };

            var okBtn = mkBtn(okText, true);
            var cancelBtn = mkBtn(cancelText, false);

            var cleanup = function () {
                document.body.removeChild(backdrop);
            };

            okBtn.addEventListener('click', function () { cleanup(); resolve(true); });
            cancelBtn.addEventListener('click', function () { cleanup(); resolve(false); });
            backdrop.addEventListener('click', function (e) {
                if (e.target === backdrop) { cleanup(); resolve(false); }
            });

            btnRow.appendChild(cancelBtn);
            btnRow.appendChild(okBtn);
            card.appendChild(h);
            card.appendChild(m);
            card.appendChild(btnRow);
            backdrop.appendChild(card);
            document.body.appendChild(backdrop);
        });
    };

    /* ========== 返回按钮 ==========
     * 约定：页面上带 data-phone-back="1" 的元素点击时，
     * 如果有 history.length > 1 就 history.back()，
     * 否则跳回指定 fallback（或上一级列表页）。
     */

    NS.bindBackButtons = function (fallbackUrl) {
        document.addEventListener('click', function (e) {
            var btn = e.target.closest('[data-phone-back="1"], [data-phone-back="true"], [data-phone-back=""]');
            if (!btn) return;
            e.preventDefault();
            if (history.length > 1) {
                history.back();
            } else if (fallbackUrl) {
                location.href = fallbackUrl;
            } else {
                history.back();
            }
        });
    };

    /* ========== 安全设置（可选） ========== */

    NS.init = function (opts) {
        opts = opts || {};
        if (opts.bindBack !== false) NS.bindBackButtons(opts.fallbackUrl);
    };

})(window);
