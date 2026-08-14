import { defineConfig } from 'vitest/config';
import { viteSingleFile } from 'vite-plugin-singlefile';

// 单文件构建：产出 dist/index.html（所有 JS/CSS 内联），
// 再由 scripts/copy-root.mjs 复制到仓库根目录 index.html，
// 这样浏览器 file:// 直接打开仓库里的 index.html 即可使用。
export default defineConfig({
  root: 'src',
  plugins: [viteSingleFile()],
  build: {
    outDir: '../dist',
    emptyOutDir: true,
    target: 'es2019',
    cssCodeSplit: false,
    assetsInlineLimit: 100000000,
    chunkSizeWarningLimit: 10000,
    reportCompressedSize: false
  },
  server: {
    port: 5173,
    open: false
  },
  test: {
    environment: 'jsdom',
    include: ['../tests/**/*.test.ts'],
    globals: true
  }
});