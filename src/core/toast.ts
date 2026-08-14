// 轻量 toast 提示系统
let container: HTMLElement | null = null;
let counter = 0;

function ensureContainer(): HTMLElement {
  if (container && document.body.contains(container)) return container;
  container = document.createElement('div');
  container.className = 'toast-container';
  document.body.appendChild(container);
  return container;
}

export type ToastType = 'info' | 'success' | 'error';

export function toast(message: string, type: ToastType = 'info', duration = 3000): void {
  try {
    const el = document.createElement('div');
    el.className = 'toast ' + type;
    el.textContent = message;
    el.dataset.tid = String(++counter);
    ensureContainer().appendChild(el);
    // 进场
    requestAnimationFrame(() => el.classList.add('show'));
    window.setTimeout(() => {
      el.classList.remove('show');
      window.setTimeout(() => el.remove(), 250);
    }, duration);
  } catch (err) {
    console.error('[toast]', err);
  }
}

// 全局异常兜底（稳定性）：不让任何未捕获错误影响页面
export function installGlobalErrorHandlers(): void {
  let lastErrorAt = 0;
  const onError = (_msg: string) => {
    const now = Date.now();
    if (now - lastErrorAt < 5000) return; // 防抖，避免刷屏
    lastErrorAt = now;
    toast('页面出现异常，已自动兜底，请刷新试试', 'error');
  };
  window.addEventListener('error', (e) => onError(e.message || 'unknown error'));
  window.addEventListener('unhandledrejection', (e) => {
    const reason = e.reason instanceof Error ? e.reason.message : String(e.reason);
    onError(reason);
  });
}