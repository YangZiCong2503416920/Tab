import { describe, it, expect, beforeEach } from 'vitest';
import {
  repairBookmarks, repairEngines, repairTodos, repairCountdowns,
  repairSettings, repairHistory, loadState, saveState, resetAllData,
  SCHEMA_VERSION, KEYS, DEFAULT_ENGINES
} from '../src/core/storage';

beforeEach(() => {
  localStorage.clear();
});

describe('repairBookmarks', () => {
  it('丢弃非法条目，保留合法条目', () => {
    const out = repairBookmarks([
      { id: 'a', name: 'OK', url: 'https://a.com', icon: '' },
      { id: 'b', name: '', url: 'https://b.com' },       // 无名称
      { id: 'c', name: 'C', url: '' },                   // 无网址
      null,
      'junk',
      { name: 'D', url: 'https://d.com' }                // 无 id → 生成
    ]);
    expect(out.length).toBe(2);
    expect(out[0].name).toBe('OK');
    expect(out[1].id).toMatch(/^b-/);
    expect(out[1].group).toBe('g-default');
  });
  it('非数组返回空数组', () => {
    expect(repairBookmarks(undefined)).toEqual([]);
    expect(repairBookmarks('x')).toEqual([]);
    expect(repairBookmarks({})).toEqual([]);
  });
  it('类型强制：icon 非字符串时兜底', () => {
    const out = repairBookmarks([{ id: 'a', name: 'X', url: 'https://x.com', icon: 123 }]);
    expect(out[0].icon).toBe('');
  });
});

describe('repairEngines', () => {
  it('空输入回退默认引擎', () => {
    expect(repairEngines(undefined).length).toBe(DEFAULT_ENGINES.length);
    expect(repairEngines([]).length).toBe(DEFAULT_ENGINES.length);
  });
  it('首项强制为默认', () => {
    const out = repairEngines([{ id: 'x', name: 'X', url: 'https://x.com', query: 'q', default: false }]);
    expect(out[0].default).toBe(true);
  });
});

describe('repairTodos', () => {
  it('修复优先级与类型', () => {
    const out = repairTodos([
      { id: 'a', text: '任务', completed: 'yes', priority: 'weird', due: 123 },
      { text: '' }
    ]);
    expect(out.length).toBe(1);
    expect(out[0].completed).toBe(false);
    expect(out[0].priority).toBe('medium');
    expect(out[0].due).toBe('');
  });
});

describe('repairCountdowns', () => {
  it('校验日期格式', () => {
    const out = repairCountdowns([
      { id: 'a', name: '春节', date: '2030-01-01' },
      { id: 'b', name: '坏日期', date: 'not-a-date' }
    ]);
    expect(out.length).toBe(1);
    expect(out[0].name).toBe('春节');
  });
});

describe('repairSettings', () => {
  it('合并默认组件配置', () => {
    const s = repairSettings({ theme: 'light' });
    expect(s.theme).toBe('light');
    expect(s.widgets.clock).toBe(true);
    expect(s.widgets.notes).toBe(false);
    expect(s.widgetOrder.length).toBeGreaterThanOrEqual(5);
  });
  it('非法主题回退 auto', () => {
    expect(repairSettings({ theme: 'red' }).theme).toBe('auto');
  });
});

describe('repairHistory', () => {
  it('过滤非字符串并限制长度', () => {
    const big = Array.from({ length: 80 }, (_, i) => 'q' + i);
    const out = repairHistory([...big, 42, '', null]);
    expect(out.length).toBe(50);
    expect(out.every((x) => typeof x === 'string')).toBe(true);
  });
});

describe('loadState / saveState 往返', () => {
  it('全新环境加载默认数据并写版本号', () => {
    const s = loadState();
    expect(s.bookmarks.length).toBeGreaterThan(0);
    expect(s.engines.length).toBe(4);
    expect(s.groups.length).toBe(1);
    expect(localStorage.getItem(KEYS.schema)).toBe(String(SCHEMA_VERSION));
  });
  it('保存后重新加载保持一致', () => {
    const s = loadState();
    s.todos.push({ id: 't1', text: '写测试', completed: false, priority: 'high', due: '', createdAt: 1 });
    s.bookmarks[0].name = '改名';
    saveState(s);
    const s2 = loadState();
    expect(s2.todos.length).toBe(1);
    expect(s2.todos[0].text).toBe('写测试');
    expect(s2.bookmarks[0].name).toBe('改名');
  });
  it('v1 老数据自动迁移（书签补 group）', () => {
    // 模拟 v1 结构：无 group 字段、无 schemaVersion
    localStorage.setItem(KEYS.bookmarks, JSON.stringify([{ id: 'a', name: '老', url: 'https://old.com', icon: '' }]));
    localStorage.setItem(KEYS.settings, JSON.stringify({ theme: 'dark', weatherCity: '上海' }));
    const s = loadState();
    expect(s.bookmarks[0].group).toBe('g-default');
    expect(s.settings.theme).toBe('dark');
    expect(s.settings.weatherCity).toBe('上海');
    // 修复后的数据已落盘
    expect(localStorage.getItem(KEYS.schema)).toBe(String(SCHEMA_VERSION));
  });
  it('损坏的 JSON 不崩溃，回退默认', () => {
    localStorage.setItem(KEYS.bookmarks, '{bad json');
    const s = loadState();
    expect(s.bookmarks.length).toBeGreaterThan(0);
  });
});

describe('resetAllData', () => {
  it('清空所有 tab.* 键', () => {
    loadState();
    resetAllData();
    for (const key of Object.values(KEYS)) {
      expect(localStorage.getItem(key)).toBeNull();
    }
  });
});