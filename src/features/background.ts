import { state, commit } from '../state';
import { $, fetchWithTimeout } from '../core/utils';
import { toast } from '../core/toast';

// 内置渐变预设（离线可用）
export const GRADIENTS: { name: string; css: string }[] = [
  { name: '深蓝夜', css: 'linear-gradient(135deg, #0f172a 0%, #1e3a8a 55%, #0f172a 100%)' },
  { name: '紫罗兰', css: 'linear-gradient(135deg, #2e1065 0%, #6d28d9 60%, #1e1b4b 100%)' },
  { name: '森林绿', css: 'linear-gradient(135deg, #022c22 0%, #065f46 60%, #022c22 100%)' },
  { name: '晚霞橙', css: 'linear-gradient(135deg, #431407 0%, #c2410c 60%, #450a0a 100%)' },
  { name: '深海蓝', css: 'linear-gradient(135deg, #082f49 0%, #0e7490 60%, #082f49 100%)' },
  { name: '樱花粉', css: 'linear-gradient(135deg, #4c1d95 0%, #db2777 55%, #831843 100%)' }
];

const BING_API = 'https://bing.biturl.top/?resolution=1920&format=json&index=0&mkt=zh-CN';

export function applyWallpaper(kind: typeof state.settings.wallpaperKind, value: string): void {
  const body = document.body;
  state.settings.wallpaperKind = kind;
  state.settings.wallpaperValue = value;
  commit();

  if (kind === 'gradient') {
    body.style.backgroundImage = GRADIENTS[parseInt(value, 10)]?.css || '';
    body.classList.toggle('has-bg', false);
  } else if (kind === 'none') {
    body.style.backgroundImage = '';
    body.classList.toggle('has-bg', false);
  } else {
    // custom / file / bing / picsum 都是图片 URL
    body.style.backgroundImage = value ? "url('" + value + "')" : '';
    body.classList.toggle('has-bg', !!value);
  }
}

export function loadBackground(): void {
  const { wallpaperKind, wallpaperValue } = state.settings;
  if (wallpaperKind === 'none') {
    applyWallpaper('none', '');
  } else if (wallpaperKind === 'gradient') {
    applyWallpaper('gradient', wallpaperValue);
  } else {
    applyWallpaper(wallpaperKind, wallpaperValue);
  }
}

// Bing 每日壁纸（尽力而为：失败静默回退到渐变）
export async function fetchBingWallpaper(): Promise<string> {
  const res = await fetchWithTimeout(BING_API, 8000, 1);
  const json = await res.json();
  if (!json.url) throw new Error('bing wallpaper no url');
  return json.url;
}

export async function applyBingWallpaper(): Promise<void> {
  try {
    const url = await fetchBingWallpaper();
    applyWallpaper('bing', url);
    toast('已应用 Bing 每日壁纸', 'success', 2000);
  } catch (err) {
    console.warn('[wallpaper] bing failed:', err);
    toast('Bing 壁纸获取失败，已切换为默认', 'error');
    applyWallpaper('none', '');
  }
}

// 随机图库（picsum，background-image 不依赖 CORS）
export function applyRandomPicsum(): void {
  const id = Math.floor(Math.random() * 1000);
  applyWallpaper('picsum', 'https://picsum.photos/id/' + id + '/1920/1080');
  toast('已应用随机壁纸 #' + id, 'success', 2000);
}

// 壁纸库渲染（设置页）
export function renderWallpaperGallery(): void {
  const box = $('#wallpaper-gallery');
  if (!box) return;

  // 渐变
  const gradWrap = document.createElement('div');
  gradWrap.className = 'wallpaper-section';
  const gradTitle = document.createElement('p');
  gradTitle.className = 'wallpaper-title';
  gradTitle.textContent = '渐变预设（离线）';
  gradWrap.appendChild(gradTitle);
  const gradGrid = document.createElement('div');
  gradGrid.className = 'wallpaper-grid';
  GRADIENTS.forEach((g, i) => {
    const item = document.createElement('button');
    item.className = 'wallpaper-item' + (state.settings.wallpaperKind === 'gradient' && state.settings.wallpaperValue === String(i) ? ' active' : '');
    item.style.background = g.css;
    item.title = g.name;
    item.onclick = () => applyWallpaper('gradient', String(i));
    gradGrid.appendChild(item);
  });
  gradWrap.appendChild(gradGrid);
  box.appendChild(gradWrap);

  // 在线壁纸
  const onlineWrap = document.createElement('div');
  onlineWrap.className = 'wallpaper-section';
  const onlineTitle = document.createElement('p');
  onlineTitle.className = 'wallpaper-title';
  onlineTitle.textContent = '在线壁纸';
  onlineWrap.appendChild(onlineTitle);
  const onlineGrid = document.createElement('div');
  onlineGrid.className = 'wallpaper-grid';
  const bingItem = document.createElement('button');
  bingItem.className = 'wallpaper-item action-item' + (state.settings.wallpaperKind === 'bing' ? ' active' : '');
  bingItem.textContent = '🖼️ Bing 每日壁纸';
  bingItem.onclick = () => void applyBingWallpaper();
  const picsumItem = document.createElement('button');
  picsumItem.className = 'wallpaper-item action-item' + (state.settings.wallpaperKind === 'picsum' ? ' active' : '');
  picsumItem.textContent = '🎲 随机图片';
  picsumItem.onclick = applyRandomPicsum;
  const noneItem = document.createElement('button');
  noneItem.className = 'wallpaper-item action-item' + (state.settings.wallpaperKind === 'none' ? ' active' : '');
  noneItem.textContent = '🚫 无壁纸';
  noneItem.onclick = () => applyWallpaper('none', '');
  onlineGrid.append(bingItem, picsumItem, noneItem);
  onlineWrap.appendChild(onlineGrid);
  box.appendChild(onlineWrap);
}
