/* ============================================================
 * backup.js — 全量数据备份与恢复（设置页 DATA 分组）
 *
 * 导出：localStorage 全部键打包为 JSON 下载（排除临时缓存）
 * 导入：严格 schema 校验 → 自动下载当前数据作安全备份 →
 *       清空 → 写入 → 刷新；任一步失败自动回滚到导入前状态
 *
 * 文件格式：
 * {
 *   __backup: { app: 'phone-app', schema: 1, exportedAt, count },
 *   data: { key: 原始字符串值 }   // 与 localStorage 原样一致，零序列化损耗
 * }
 * ============================================================ */
(function () {
    'use strict';

    var BACKUP_APP = 'phone-app';
    var BACKUP_SCHEMA = 1;

    // 临时缓存排除表：不进备份（导入时它们也会被清掉，由系统自动重建）
    var EXCLUDE_KEYS = ['api_call_logs'];
    // 核心键抽样前缀：快速判断"这像不像本应用的备份"
    var CORE_HINTS = ['ai_custom_characters', 'phone_data_v2', 'myProfile', 'chat_history_'];

    function $(id) { return document.getElementById(id); }

    function toast(msg) {
        var t = $('toastMsg');
        if (!t) { alert(msg); return; }
        t.textContent = msg;
        t.classList.add('show');
        setTimeout(function () { t.classList.remove('show'); }, 2200);
    }

    // 快照：{ key: 原始字符串值 }，exclude=true 时跳过临时缓存
    function snapshot(exclude) {
        var out = {};
        var keys = [];
        try { keys = Object.keys(localStorage); } catch (e) {}
        keys.forEach(function (k) {
            if (exclude && EXCLUDE_KEYS.indexOf(k) !== -1) return;
            try { out[k] = localStorage.getItem(k); } catch (e) {}
        });
        return out;
    }

    function fmtSize(chars) {
        if (chars < 1024) return chars + ' B';
        if (chars < 1024 * 1024) return (chars / 1024).toFixed(1) + ' KB';
        return (chars / 1024 / 1024).toFixed(2) + ' MB';
    }

    function downloadSnapshot(snap, tag) {
        var keys = Object.keys(snap);
        var text = JSON.stringify({
            __backup: {
                app: BACKUP_APP,
                schema: BACKUP_SCHEMA,
                exportedAt: new Date().toISOString(),
                count: keys.length
            },
            data: snap
        });
        var d = new Date();
        function p2(n) { return n < 10 ? '0' + n : '' + n; }
        var name = 'phone-app-backup-' + d.getFullYear() + p2(d.getMonth() + 1) + p2(d.getDate())
            + '-' + p2(d.getHours()) + p2(d.getMinutes()) + p2(d.getSeconds())
            + (tag ? '-' + tag : '') + '.json';
        var blob = new Blob([text], { type: 'application/json' });
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = name;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(function () { URL.revokeObjectURL(url); }, 1500);
        return { name: name, chars: text.length, count: keys.length };
    }

    function doExport() {
        try {
            var snap = snapshot(true);
            if (!Object.keys(snap).length) { toast('没有可导出的数据'); return; }
            var r = downloadSnapshot(snap, '');
            toast('已导出 ' + r.count + ' 项（' + fmtSize(r.chars) + '）');
        } catch (e) {
            toast('导出失败：' + ((e && e.message) || '未知错误'));
        }
    }

    // 严格校验：结构 → 应用标识 → schema 版本 → data 段 → 核心键抽样
    function validateBackup(obj) {
        if (!obj || typeof obj !== 'object') return '文件不是有效的 JSON 对象';
        var meta = obj.__backup;
        if (!meta || typeof meta !== 'object') return '缺少 __backup 元信息，不是本应用的备份文件';
        if (meta.app !== BACKUP_APP) return '应用标识不符（' + meta.app + '），拒绝导入';
        if (typeof meta.schema !== 'number') return '备份缺少 schema 版本号，拒绝导入';
        if (meta.schema > BACKUP_SCHEMA) return '备份版本（schema ' + meta.schema + '）比当前应用更新，请先升级应用再导入';
        if (meta.schema < 1) return 'schema 版本号异常，拒绝导入';
        if (!obj.data || typeof obj.data !== 'object' || Array.isArray(obj.data)) return 'data 段缺失或格式错误';
        if (!Object.keys(obj.data).length) return '备份内容为空';
        var looksLikeOurs = Object.keys(obj.data).some(function (k) {
            return CORE_HINTS.some(function (h) { return k.indexOf(h) === 0; });
        });
        if (!looksLikeOurs) return '文件中找不到任何本应用核心数据，疑似选错了文件';
        return '';
    }

    // 清空后整份写入；逐键 try/catch，任一键失败即视为整体失败
    function restore(snap) {
        localStorage.clear();
        var failed = false;
        Object.keys(snap).forEach(function (k) {
            try { localStorage.setItem(k, String(snap[k])); }
            catch (e) { failed = true; }
        });
        return !failed;
    }

    function handleImportFile(file) {
        if (!file) return;
        var reader = new FileReader();
        reader.onload = function (ev) {
            var obj;
            try { obj = JSON.parse(String(ev.target.result)); }
            catch (e) { toast('导入失败：文件不是合法 JSON'); return; }
            var err = validateBackup(obj);
            if (err) { toast('导入失败：' + err); return; }

            var incoming = obj.data;
            var count = Object.keys(incoming).length;
            var label = obj.__backup.exportedAt ? '（导出于 ' + String(obj.__backup.exportedAt).slice(0, 10) + '）' : '';
            if (!confirm('将用备份覆盖当前全部数据（' + count + ' 项）' + label + '。\n\n当前数据会先自动导出一份安全备份，导入失败会自动回滚。确定继续？')) return;

            // 1. 保命备份：导入前把当前数据（含临时缓存）完整下载一份
            var current = snapshot(false);
            try { downloadSnapshot(current, 'auto-before-restore'); } catch (e) {}

            // 2. 覆盖写入；失败则用内存中的快照原样回滚
            var ok = restore(incoming);
            if (!ok) {
                restore(current);
                toast('导入失败（存储空间不足），已回滚到导入前状态');
                return;
            }
            toast('导入成功，正在刷新…');
            setTimeout(function () { location.reload(); }, 700);
        };
        reader.onerror = function () { toast('导入失败：文件读取失败'); };
        reader.readAsText(file);
    }

    // 绑定 DATA 分组两个入口
    var exp = $('rowExportData');
    var imp = $('rowImportData');
    var file = $('importFileInput');
    if (exp) exp.addEventListener('click', doExport);
    if (imp && file) {
        imp.addEventListener('click', function () { file.click(); });
        file.addEventListener('change', function () {
            var f = file.files && file.files[0];
            file.value = '';
            handleImportFile(f);
        });
    }
})();
