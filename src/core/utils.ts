import { toast } from './toast';

export function $(sel: string): HTMLElement | null {
  return document.querySelector(sel);
}

export function $$<T extends Element = Element>(sel: string): T[] {
  return Array.from(document.querySelectorAll<T>(sel));
}

export function uid(prefix = 'id'): string {
  return prefix + '-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);
}

export function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v));
}

// 规范化 URL：无协议时补 https://
export function normalizeUrl(url: string): string {
  url = (url || '').trim();
  if (!url) return '';
  return /^https?:\/\//i.test(url) ? url : 'https://' + url;
}

// 简单 URL 判断（用于搜索框输入网址直达）
export function isUrlLike(input: string): boolean {
  return /^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([\/\w .-]*)*\/?$/i.test(input.trim());
}

export function hasChinese(text: string): boolean {
  return /[\u4e00-\u9fa5]/.test(text);
}

export function domainOf(url: string): string {
  try {
    return new URL(normalizeUrl(url)).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}

export function faviconFor(url: string): string {
  const d = domainOf(url);
  return d ? 'https://www.google.com/s2/favicons?domain=' + d + '&sz=64' : '';
}

// 带超时与一次重试的 fetch（稳定性关键）
export async function fetchWithTimeout(
  url: string,
  timeoutMs = 8000,
  retries = 1,
  opts: RequestInit = {}
): Promise<Response> {
  let lastErr: unknown = null;
  for (let attempt = 0; attempt <= retries; attempt++) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      const res = await fetch(url, { ...opts, signal: ctrl.signal });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return res;
    } catch (err) {
      lastErr = err;
      // 重试前短暂等待
      if (attempt < retries) await new Promise((r) => setTimeout(r, 400));
    } finally {
      clearTimeout(timer);
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error('fetch failed: ' + url);
}

export function debounce<T extends (...args: never[]) => void>(fn: T, ms: number): (...args: Parameters<T>) => void {
  let timer: number | undefined;
  return (...args: Parameters<T>) => {
    window.clearTimeout(timer);
    timer = window.setTimeout(() => fn(...args), ms);
  };
}

// 日期工具
export function dateStr(d: Date): string {
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

export function todayStr(): string {
  return dateStr(new Date());
}

// 与今天相差的天数（负数=已过期）
export function daysFromToday(dateStrValue: string): number {
  const target = new Date(dateStrValue + 'T00:00:00').getTime();
  const today = new Date(todayStr() + 'T00:00:00').getTime();
  return Math.round((target - today) / 86400000);
}

// 兜底日志 + 轻提示
export function reportError(context: string, err: unknown): void {
  console.error('[' + context + ']', err);
  toast('操作失败：' + context + '，请稍后重试', 'error');
}
