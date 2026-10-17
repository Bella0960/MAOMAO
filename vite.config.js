import { defineConfig } from 'vite';
import { resolve } from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

// Auto-detect all HTML entry points in the root directory for multi-page setup
const htmlFiles = fs.readdirSync(__dirname)
  .filter(file => file.endsWith('.html'))
  .reduce((acc, file) => {
    const name = file.replace(/\.html$/, '');
    acc[name] = resolve(__dirname, file);
    return acc;
  }, {});

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
