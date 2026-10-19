import { defineConfig } from 'vite';
import { resolve } from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

// Auto-detect all HTML entry points (root + feature subfolders) for multi-page setup.
// 跳过构建产物/依赖/公共资源目录，避免把 dist 当成入口递归打包。
const SKIP_DIRS = new Set(['node_modules', 'dist', 'public', '.git', '.trae', 'docs']);
const htmlFiles = {};
(function collectHtml(dir, prefix) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.')) continue;
    const abs = resolve(dir, entry.name);
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue;
      collectHtml(abs, prefix + entry.name + '/');
    } else if (entry.name.endsWith('.html')) {
      htmlFiles[prefix + entry.name.replace(/\.html$/, '')] = abs;
    }
  }
})(__dirname, '');

/* 构建时把"非模块静态资源"原样复制到 dist。
 * Vite 默认不会输出 <script src> 引用的经典脚本、根级 sw.js/manifest.json、
 * 应用内自有的 js/css 等，这里统一补齐，保证 dist 是可直接部署/安装的完整 PWA。 */
function copyStaticAssets() {
  const APP_DIRS = ['chat', 'forum', 'wallet', 'worldbook', 'settings', 'profile',
    'music', 'diary', 'cafe', 'beauty', 'travel', 'games', 'tools'];
  const copy = (rel) => {
    const src = resolve(__dirname, rel);
    if (!fs.existsSync(src)) return;
    const dest = resolve(__dirname, 'dist', rel);
    fs.mkdirSync(resolve(dest, '..'), { recursive: true });
    fs.cpSync(src, dest, { recursive: true });
  };
  // 递归收集某个应用目录下所有名为 js / css 的子目录（含子模块嵌套）
  const collectDirs = (base, name, out) => {
    const abs = resolve(__dirname, base);
    if (!fs.existsSync(abs)) return;
    for (const e of fs.readdirSync(abs, { withFileTypes: true })) {
      if (!e.isDirectory()) continue;
      const rel = base + '/' + e.name;
      if (e.name === name) out.push(rel);
      collectDirs(rel, name, out);
    }
  };
  return {
    name: 'copy-static-assets',
    closeBundle() {
      copy('shared');
      copy('assets');
      copy('desktop');
      for (const app of APP_DIRS) {
        const jsDirs = [], cssDirs = [];
        collectDirs(app, 'js', jsDirs);
        collectDirs(app, 'css', cssDirs);
        jsDirs.forEach(copy);
        cssDirs.forEach(copy);
      }
      copy('sw.js');
      copy('manifest.json');
      copy('favicon.ico');
    }
  };
}

export default defineConfig({
  server: {
    host: '0.0.0.0',
    port: 3000,
    strictPort: true
  },
  preview: {
    host: '0.0.0.0',
    port: 3000
  },
  build: {
    rollupOptions: {
      input: htmlFiles
    }
  },
  plugins: [copyStaticAssets()]
});
