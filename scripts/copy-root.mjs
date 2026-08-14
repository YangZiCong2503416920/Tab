// 把 dist/index.html（单文件产物）复制到仓库根目录 index.html，
// 保证浏览器直接打开仓库 index.html 即可用（file:// 兼容）。
import { copyFileSync, statSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = join(root, 'dist', 'index.html');
const dest = join(root, 'index.html');
mkdirSync(dirname(dest), { recursive: true });
copyFileSync(src, dest);
console.log('[copy-root] dist/index.html -> index.html (' + statSync(dest).size + ' bytes)');
