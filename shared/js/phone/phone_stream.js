/* ============================================================
 * phone_stream.js — 流式对话公共引擎
 *
 * 供 chat-detail.html（线上聊天）与 chat/date/date.html（赴约·线下剧情）
 * 等页面共用。把原本内联在 chat-detail sendMsg 里的流式核心
 * （三段式超时 / SSE 半包解析 / 残留收尾 / rAF 渲染节流 / 中断保文）
 * 抽离为无 UI 依赖的公共模块：调用方只提供「请求参数 + 渲染回调」。
 * ============================================================ */

(function (global) {
    'use strict';

    var NS = global.PhoneStream = {};

    /**
     * PhoneStream.chat(opts) → Promise<result>
     *
     * 发起一次 OpenAI 兼容的流式补全请求（POST <baseUrl>/chat/completions）。
     * 【永不 reject】所有失败（HTTP / 超时 / 网络 / 流内错误）都以
     * result.error 返回，且 result.fullText 保留中断前已收到的部分内容
     * （保命语义，调用方自行决定如何呈现）。
     *
     * @param {Object}  opts
     *   baseUrl     {String}          API 根地址（不以 / 结尾，如 https://api.openai.com/v1）
     *   apiKey      {String}          Bearer 凭证
     *   model       {String}          模型 ID
     *   messages    {Array}           OpenAI 格式消息 [{role, content}]
     *   temperature {Number?=0.7}     温度（总是发送）
     *   maxTokens   {*=undefined}     仅当 Number > 0 时发送 max_tokens（floor 取整）
     *   topP        {*=undefined}     仅当 0 < topP < 1 时发送 top_p；=1 或未设置不发送
     *   connectMs   {Number?=15000}   连接超时：等待响应头的最长时间
     *   watchdogMs  {Number?=30000}   流式无数据看门狗：每收到一个 chunk 重置
     *   totalMs     {Number?=120000}  流式硬性总上限（防无限流挂死页面）
     *   onPaint     {Function?}       渲染回调 onPaint(fullText)：
     *                                 requestAnimationFrame 节流（每帧最多一次），
     *                                 流结束时同步补调一次，保证最后一段增量上屏
     *
     * @returns {Promise<{ok:Boolean, fullText:String, error:Object|null}>}
     *   ok       Boolean      是否完整成功
     *   fullText String       累计正文（失败时 = 中断前已收到的部分）
     *   error    Object|null  { kind:'http'|'abort'|'network'|'stream'|'config',
     *                           status?, detail?, reason? }
     *   abort.reason ∈ 'connect'(连接超时) | 'watchdog'(无数据) | 'total'(总上限)
     */
    NS.chat = function (opts) {
        opts = opts || {};
        return new Promise(function (resolve) {

            /* ---------- 出参组装 ---------- */
            var fullText = '';
            var result = { ok: false, fullText: '', error: null };
            function finish(err) {
                result.ok = !err;
                result.fullText = fullText;
                result.error = err || null;
                resolve(result);
            }

            /* ---------- 入参防御 ---------- */
            var baseUrl = String(opts.baseUrl || '').trim().replace(/\/+$/, '');
            var apiKey = String(opts.apiKey || '').trim();
            if (!apiKey || !baseUrl) {
                finish({ kind: 'config', detail: !apiKey ? '未配置 API Key' : '未配置 Base URL' });
                return;
            }

            /* ---------- 请求体（高级参数条件发送，留空 = 服务商默认） ---------- */
            var body = {
                model: String(opts.model || 'gpt-3.5-turbo'),
                messages: Array.isArray(opts.messages) ? opts.messages : [],
                temperature: opts.temperature != null ? opts.temperature : 0.7,
                stream: true
            };
            var maxTokens = Number(opts.maxTokens);
            if (maxTokens > 0) body.max_tokens = Math.floor(maxTokens);
            var topP = Number(opts.topP);
            if (topP > 0 && topP < 1) body.top_p = topP;

            /* ---------- 三段式超时（R1） ----------
             *   连接阶段：connectMs 内未收到响应头 → abort（reason='connect'）
             *   流式阶段：响应头到达后解除连接超时；每收到一个 chunk 重置
             *             watchdogMs 看门狗；另设 totalMs 硬性总上限 */
            var CONNECT_MS = opts.connectMs != null ? opts.connectMs : 15000;
            var WATCHDOG_MS = opts.watchdogMs != null ? opts.watchdogMs : 30000;
            var TOTAL_MS = opts.totalMs != null ? opts.totalMs : 120000;
            var abortReason = 'connect';
            var watchdogId = null;
            var totalTimerId = null;
            var controller = new AbortController();
            var connectTimer = setTimeout(function () {
                abortReason = 'connect';
                controller.abort();
            }, CONNECT_MS);
            function armWatchdog() {
                if (watchdogId) clearTimeout(watchdogId);
                watchdogId = setTimeout(function () {
                    abortReason = 'watchdog';
                    controller.abort();
                }, WATCHDOG_MS);
            }
            function enterStreamMode() {
                clearTimeout(connectTimer);
                armWatchdog();
                totalTimerId = setTimeout(function () {
                    abortReason = 'total';
                    controller.abort();
                }, TOTAL_MS);
            }
            function clearAllTimers() {
                clearTimeout(connectTimer);
                if (watchdogId) clearTimeout(watchdogId);
                if (totalTimerId) clearTimeout(totalTimerId);
            }

            /* ---------- 渲染节流（R4）：onPaint 每帧最多一次 ----------
             * 调用方在 onPaint 里做正则清洗 / DOM 写入 / 滚动；
             * 高频 delta 在此被合并，长回复不再逐帧打满 CPU。 */
            var paintScheduled = false;
            var streamDone = false;
            function schedulePaint() {
                if (paintScheduled || streamDone) return;
                paintScheduled = true;
                requestAnimationFrame(function () {
                    paintScheduled = false;
                    if (!streamDone && fullText && typeof opts.onPaint === 'function') {
                        opts.onPaint(fullText);
                    }
                });
            }

            /* ---------- 主流程 ---------- */
            fetch(baseUrl + '/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + apiKey
                },
                signal: controller.signal,
                body: JSON.stringify(body)
            }).then(function (response) {

                /* -- HTTP 层错误（401/404/429/5xx 等）：读 body 提取详情，不进入流解析 -- */
                if (!response.ok || !response.body) {
                    clearAllTimers();
                    return response.text().catch(function () { return ''; }).then(function (bodyText) {
                        var detail = '';
                        try {
                            var parsed = JSON.parse(bodyText);
                            detail = (parsed.error && parsed.error.message) || bodyText;
                        } catch (e) { detail = bodyText; }
                        finish({ kind: 'http', status: response.status, detail: detail || response.statusText });
                    });
                }

                /* -- SSE 流式读取 -- */
                var reader = response.body.getReader();
                var decoder = new TextDecoder('utf-8');
                var buffer = '';

                // 响应头已到达：解除连接超时，切换为「无数据看门狗 + 总上限」
                enterStreamMode();

                // 处理一行 SSE 数据（主循环与收尾残留共用）：
                //   过滤空行与 `:` 心跳 → 提取 data: 载荷 → [DONE] 置结束标记 →
                //   JSON.parse 失败静默跳过（半包由 buffer 机制挡住，不会到这里） →
                //   流内 error 对象抛给统一 catch → delta 累计 + 节流渲染
                var processSseLine = function (rawLine) {
                    var line = rawLine.trim();
                    if (!line || line.charAt(0) === ':') return;
                    if (line.indexOf('data:') !== 0) return;

                    var payload = line.slice(5).trim();
                    if (payload === '[DONE]') { streamDone = true; return; }

                    var json;
                    try { json = JSON.parse(payload); }
                    catch (e) { return; }   // 碎片/非 JSON，忽略

                    if (json.error) {
                        var se = new Error((json.error && json.error.message) || JSON.stringify(json.error));
                        se.__streamError = true;   // 标记为流内错误，供 catch 分类
                        throw se;
                    }

                    var delta = json.choices && json.choices[0] && json.choices[0].delta && json.choices[0].delta.content;
                    if (delta) {
                        fullText += delta;
                        schedulePaint();
                    }
                };

                // 递归读取循环：每个 chunk 先重置看门狗，再解码 → 按 \n 切行 →
                // 尾段（可能不完整）留在 buffer，等下一个 chunk 拼接
                function pump() {
                    return reader.read().then(function (chunk) {
                        if (chunk.done) return;
                        armWatchdog();   // 收到新数据：重置 30s 无数据看门狗
                        buffer += decoder.decode(chunk.value, { stream: true });
                        var lines = buffer.split('\n');
                        buffer = lines.pop() || '';
                        for (var i = 0; i < lines.length; i++) {
                            processSseLine(lines[i]);
                            if (streamDone) break;
                        }
                        if (streamDone) return;
                        return pump();
                    });
                }

                return pump().then(function () {
                    clearAllTimers();
                    // R5：残留 buffer 收尾——服务器最后一条 data 行可能不带换行，
                    // 不补处理会静默丢字
                    if (buffer) {
                        buffer.split('\n').forEach(processSseLine);
                        buffer = '';
                    }
                    streamDone = true;
                    // 兜底：同步补一次渲染，保证最后一段增量上屏
                    if (fullText && typeof opts.onPaint === 'function') opts.onPaint(fullText);
                });

            }).then(function () {
                finish(null);
            }).catch(function (err) {
                clearAllTimers();
                streamDone = true;
                var e;
                if (err && err.name === 'AbortError') {
                    e = { kind: 'abort', reason: abortReason };
                } else if (err && err.__streamError) {
                    e = { kind: 'stream', detail: err.message || '流式响应异常' };
                } else {
                    e = { kind: 'network', detail: (err && err.message) || '' };
                }
                finish(e);
            });
        });
    };
})(window);
