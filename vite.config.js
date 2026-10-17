import { defineConfig } from 'vite';
import { resolve } from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

// Auto-detect all HTML entry points (root + feature subfolders) for multi-page setup
const htmlFiles = {};
(function collectHtml(dir, prefix) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.')) continue;
    const abs = resolve(dir, entry.name);
    if (entry.isDirectory()) {
      collectHtml(abs, prefix + entry.name + '/');
    } else if (entry.name.endsWith('.html')) {
      htmlFiles[prefix + entry.name.replace(/\.html$/, '')] = abs;
    }
  }
})(__dirname, '');

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
  }
});
