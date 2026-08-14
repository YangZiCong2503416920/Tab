import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { normalizeUrl, isUrlLike, daysFromToday, debounce, hasChinese, fetchWithTimeout } from '../src/core/utils';

describe('normalizeUrl', () => {
  it('补全缺失协议', () => {
    expect(normalizeUrl('example.com')).toBe('https://example.com');
    expect(normalizeUrl('www.a.b')).toBe('https://www.a.b');
  });
  it('保留已有协议', () => {
    expect(normalizeUrl('http://a.b')).toBe('http://a.b');
    expect(normalizeUrl('https://a.b/x?y=1')).toBe('https://a.b/x?y=1');
  });
  it('处理空与空白', () => {
    expect(normalizeUrl('')).toBe('');
    expect(normalizeUrl('   ')).toBe('');
  });
  it('容忍前后空格', () => {
    expect(normalizeUrl('  example.com  ')).toBe('https://example.com');
  });
});

describe('isUrlLike', () => {
  it('识别网址', () => {
    expect(isUrlLike('github.com')).toBe(true);
    expect(isUrlLike('https://www.baidu.com/s')).toBe(true);
    expect(isUrlLike('a.b.c/def')).toBe(true);
  });
  it('不误判普通文本', () => {
    expect(isUrlLike('hello world')).toBe(false);
    expect(isUrlLike('我的搜索词')).toBe(false);
    expect(isUrlLike('foo')).toBe(false);
  });
});

describe('daysFromToday', () => {
  const today = new Date();
  const fmt = (d: Date) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  it('今天为 0', () => {
    expect(daysFromToday(fmt(today))).toBe(0);
  });
  it('明天为 1，昨天为 -1', () => {
    const t = new Date(today);
    t.setDate(today.getDate() + 1);
    expect(daysFromToday(fmt(t))).toBe(1);
    const y = new Date(today);
    y.setDate(today.getDate() - 1);
    expect(daysFromToday(fmt(y))).toBe(-1);
  });
});

describe('hasChinese', () => {
  it('识别中文', () => {
    expect(hasChinese('你好')).toBe(true);
    expect(hasChinese('hello 世界')).toBe(true);
  });
  it('纯英文为 false', () => {
    expect(hasChinese('hello world')).toBe(false);
  });
});

describe('debounce', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('合并多次调用', () => {
    const fn = vi.fn();
    const d = debounce(fn, 100);
    d();
    d();
    d();
    expect(fn).not.toHaveBeenCalled();
    vi.advanceTimersByTime(150);
    expect(fn).toHaveBeenCalledTimes(1);
  });
  it('携带参数', () => {
    const fn = vi.fn();
    const d = debounce(fn, 50);
    d('a');
    vi.advanceTimersByTime(60);
    expect(fn).toHaveBeenCalledWith('a');
  });
});

describe('fetchWithTimeout', () => {
  it('成功时返回响应', async () => {
    const res = { ok: true } as Response;
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(res));
    await expect(fetchWithTimeout('http://x', 1000, 0)).resolves.toBe(res);
    vi.unstubAllGlobals();
  });
  it('失败后重试一次', async () => {
    const fail = vi.fn().mockRejectedValueOnce(new Error('net')).mockResolvedValueOnce({ ok: true } as Response);
    vi.stubGlobal('fetch', fail);
    const out = await fetchWithTimeout('http://x', 500, 1);
    expect(out.ok).toBe(true);
    expect(fail).toHaveBeenCalledTimes(2);
    vi.unstubAllGlobals();
  });
  it('HTTP 错误抛出', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 500 }));
    await expect(fetchWithTimeout('http://x', 500, 0)).rejects.toThrow(/HTTP 500/);
    vi.unstubAllGlobals();
  });
  it('超时中止', async () => {
    let aborted = false;
    vi.stubGlobal('fetch', vi.fn((_u: string, opts: RequestInit) => {
      return new Promise((_res, rej) => {
        opts.signal?.addEventListener('abort', () => { aborted = true; rej(new Error('aborted')); });
      });
    }));
    const p = fetchWithTimeout('http://x', 30, 0); // 真实计时器，30ms 超时
    await expect(p).rejects.toThrow();
    expect(aborted).toBe(true);
    // 让可能残留的 rejection 在本用例内消化
    await new Promise((r) => setTimeout(r, 50));
    vi.unstubAllGlobals();
  });
});