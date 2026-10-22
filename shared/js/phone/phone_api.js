/* ============================================================
 * phone_api.js  —  公共 AI 请求层
 *
 * 职责：
 *   1. 统一 fetch /chat/completions
 *   2. JSON 清洗（去 markdown 代码块、去解释前言、只留纯 JSON）
 *   3. 错误处理（HTTP 错误 / 超时 / 解析失败）
 *   4. logApiCall 记录（存入 api_call_logs）
 *
 * 依赖 phone_storage.js 的 getApiConfig / pushApiLog。
 * 被 phone_context / phone_engine / 各 App 调用。
 * ============================================================ */

(function (global) {
    'use strict';

    var Storage = global.PhoneStorage;
    if (!Storage) {
        console.warn('[PhoneAPI] PhoneStorage 未加载');
    }

    var NS = global.PhoneAPI = {};

    var DEFAULT_TIMEOUT = 15000;

    /* ========== 单次 completion ========== */

    NS.complete = function (opts) {
        // opts: { system, user, messages, temperature, model, timeoutMs }
        var config = Storage ? Storage.getApiConfig() : {};
        var apiKey = (config.apiKey || '').trim();
        if (!apiKey) {
            var err = new Error('未配置 API Key');
            log('error', opts.model || config.model, 0, err.message);
            return Promise.reject(err);
        }

        var baseUrl = (config.baseUrl || 'https://api.openai.com/v1').trim().replace(/\/+$/, '');
        var model = (opts.model || config.model || 'gpt-3.5-turbo').trim();
        var temperature = opts.temperature != null ? opts.temperature : (config.temperature != null ? config.temperature : 0.8);
        var timeoutMs = opts.timeoutMs || DEFAULT_TIMEOUT;

        var messages = opts.messages || [
            { role: 'system', content: opts.system || '' },
            { role: 'user',   content: opts.user   || '' }
        ];

        var body = {
            model: model,
            messages: messages,
            temperature: temperature,
            stream: false
        };
        // 高级参数（API 设置多方案升级）：仅在明确设置时发送，留空 = 用服务商默认值
        var maxTokens = Number(config.maxTokens);
        if (maxTokens > 0) body.max_tokens = Math.floor(maxTokens);
        var topP = Number(config.topP);
        if (topP > 0 && topP < 1) body.top_p = topP;

        var start = Date.now();
        var controller = new AbortController();
        var timer = setTimeout(function () { controller.abort(); }, timeoutMs);

        return fetch(baseUrl + '/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + apiKey
            },
            signal: controller.signal,
            body: JSON.stringify(body)
        }).then(function (response) {
            clearTimeout(timer);
            if (!response.ok) {
                return response.text().then(function (txt) {
                    var e = new Error('HTTP ' + response.status + ' ' + txt.slice(0, 200));
                    log('error', model, start, e.message);
                    throw e;
                });
            }
            return response.json();
        }).then(function (data) {
            var text = (((data || {}).choices || [])[0] || {}).message
                ? (data.choices[0].message.content || '') : '';
            log('success', model, start);
            return text;
        }).catch(function (err) {
            clearTimeout(timer);
            if (err && err.name === 'AbortError') {
                err = new Error('请求超时（' + timeoutMs + 'ms）');
            }
            log('error', model, start, err && err.message ? err.message : String(err));
            throw err;
        });
    };

    /* ========== JSON 输出请求 ========== */
    // 约定：prompt 里已经告诉 AI 只返回 JSON。
    // 这里负责清洗 + 解析 + 失败兜底。

    NS.completeJSON = function (opts) {
        return NS.complete(opts).then(function (raw) {
            return cleanJSON(raw);
        });
    };

    /* ========== JSON 清洗 ========== */

    function cleanJSON(raw) {
        var text = String(raw || '').trim();

        // 1. 去掉 markdown ```json ... ``` 包裹
        text = text.replace(/^```(?:json|JSON)?\s*/i, '').replace(/```\s*$/i, '');

        // 2. 找到第一个 { 或 [，最后一个 } 或 ]，截取中间
        var startObj = text.indexOf('{');
        var startArr = text.indexOf('[');
        var start = -1;
        if (startObj >= 0 && startArr >= 0) start = Math.min(startObj, startArr);
        else start = Math.max(startObj, startArr);

        var endObj = text.lastIndexOf('}');
        var endArr = text.lastIndexOf(']');
        var end = Math.max(endObj, endArr);

        if (start >= 0 && end > start) {
            text = text.slice(start, end + 1);
        }

        // 3. 尝试解析
        try {
            return { ok: true, data: JSON.parse(text), raw: text };
        } catch (parseErr) {
            return { ok: false, data: null, raw: text, error: parseErr.message };
        }
    }

    /* ========== 批量调用（整机刷新用） ========== */
    // 一次 system + 一次 user，要求 AI 返回多个 App 数据合并 JSON
    // 只发一次请求，内部 JSON 拆给各 App。

    NS.completeBundle = function (opts) {
        return NS.completeJSON(opts);
    };

    /* ========== 日志 ========== */

    function log(status, model, startMs, errorMsg) {
        if (!Storage) return;
        try {
            Storage.pushApiLog({
                id: Date.now().toString(36) + Math.floor(Math.random() * 1000),
                time: Date.now(),
                model: model || 'unknown',
                status: status,
                duration: Date.now() - startMs,
                errorMsg: (status === 'error' && errorMsg) ? String(errorMsg).slice(0, 200) : ''
            });
        } catch (e) {}
    }

})(window);
