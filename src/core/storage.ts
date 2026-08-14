import type { AppState, Bookmark, BookmarkGroup, Countdown, Engine, Priority, Settings, Todo } from './types';
import { uid } from './utils';

export const SCHEMA_VERSION = 2;

const K = {
  schema: 'tab.schemaVersion',
  bookmarks: 'tab.bookmarks',
  groups: 'tab.groups',
  engines: 'tab.engines',
  todos: 'tab.todos',
  countdowns: 'tab.countdowns',
  notes: 'tab.notes',
  settings: 'tab.settings',
  history: 'tab.searchHistory'
};

export const KEYS = K;

export const DEFAULT_ENGINES: Engine[] = [
  { id: 'e1', name: 'Google', url: 'https://www.google.com/search', query: 'q', default: true },
  { id: 'e2', name: 'Bing', url: 'https://www.bing.com/search', query: 'q', default: false },
  { id: 'e3', name: '百度', url: 'https://www.baidu.com/s', query: 'wd', default: false },
  { id: 'e4', name: 'DuckDuckGo', url: 'https://duckduckgo.com/', query: 'q', default: false }
];

export const ENGINE_PRESETS: { name: string; url: string; query: string }[] = [
  { name: 'GitHub', url: 'https://github.com/search', query: 'q' },
  { name: '知乎', url: 'https://www.zhihu.com/search', query: 'q' },
  { name: 'Bilibili', url: 'https://search.bilibili.com/all', query: 'keyword' },
  { name: '微博', url: 'https://s.weibo.com/weibo', query: 'q' },
  { name: '淘宝', url: 'https://s.taobao.com/search', query: 'q' },
  { name: '京东', url: 'https://search.jd.com/Search', query: 'keyword' },
  { name: 'Wikipedia', url: 'https://en.wikipedia.org/w/index.php', query: 'search' },
  { name: '谷歌学术', url: 'https://scholar.google.com/scholar', query: 'q' },
  { name: '抖音', url: 'https://www.douyin.com/search/', query: '' },
  { name: '百度百科', url: 'https://baike.baidu.com/item/', query: '' }
];

export const DEFAULT_SETTINGS: Settings = {
  theme: 'auto',
  wallpaperKind: 'none',
  wallpaperValue: '',
  weatherCity: '',
  weatherAutoTried: false,
  searchEngineId: '',
  widgets: { clock: true, calendar: true, weather: true, notes: false, countdown: true },
  widgetOrder: ['clock', 'calendar', 'weather', 'countdown', 'notes']
};

export const DEFAULT_GROUPS: BookmarkGroup[] = [{ id: 'g-default', name: '常用' }];

export const DEFAULT_BOOKMARKS: Bookmark[] = [
  { id: 'b1', name: 'Google', url: 'https://www.google.com', icon: '', group: 'g-default' },
  { id: 'b2', name: 'Gmail', url: 'https://mail.google.com', icon: '📧', group: 'g-default' },
  { id: 'b3', name: 'YouTube', url: 'https://www.youtube.com', icon: '🎬', group: 'g-default' },
  { id: 'b4', name: 'GitHub', url: 'https://github.com', icon: '', group: 'g-default' },
  { id: 'b5', name: '知乎', url: 'https://www.zhihu.com', icon: '', group: 'g-default' },
  { id: 'b6', name: 'Bilibili', url: 'https://www.bilibili.com', icon: '📺', group: 'g-default' },
  { id: 'b7', name: '天气', url: 'https://weather.com/zh-CN/weather/today/l/CHXX0008:1:CH', icon: '🌤️', group: 'g-default' }
];

// ---------- 安全读写 ----------
function readRaw(key: string): unknown {
  try {
    const raw = localStorage.getItem(key);
    return raw === null ? undefined : JSON.parse(raw);
  } catch {
    return undefined;
  }
}

function writeRaw(key: string, value: unknown): boolean {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (err) {
    console.error('[storage] 写入失败', key, err);
    return false;
  }
}

// ---------- 数据修复（不信任任何来源，包括用户导入） ----------
function repairString(v: unknown, fallback: string, maxLen = 500): string {
  if (typeof v !== 'string') return fallback;
  const s = v.slice(0, maxLen).trim();
  return s || fallback;
}

function repairBool(v: unknown, fallback = false): boolean {
  return typeof v === 'boolean' ? v : fallback;
}

function repairPriority(v: unknown): Priority {
  return v === 'high' || v === 'low' ? v : 'medium';
}

export function repairBookmarks(raw: unknown): Bookmark[] {
  if (!Array.isArray(raw)) return [];
  const out: Bookmark[] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const b = item as Record<string, unknown>;
    const name = repairString(b.name, '', 60);
    const url = repairString(b.url, '', 1000);
    if (!name || !url) continue;
    out.push({
      id: repairString(b.id, uid('b'), 50),
      name,
      url,
      icon: repairString(b.icon, '', 20),
      group: repairString(b.group, 'g-default', 50)
    });
  }
  return out;
}

export function repairGroups(raw: unknown, bookmarks: Bookmark[]): BookmarkGroup[] {
  const arr = Array.isArray(raw) ? raw : [];
  const seen = new Set<string>();
  const groups: BookmarkGroup[] = [];
  for (const item of arr) {
    if (!item || typeof item !== 'object') continue;
    const g = item as Record<string, unknown>;
    const id = repairString(g.id, '', 50);
    const name = repairString(g.name, '', 30);
    if (!id || !name || seen.has(id)) continue;
    seen.add(id);
    groups.push({ id, name });
  }
  if (!seen.has('g-default')) {
    groups.unshift({ id: 'g-default', name: '常用' });
  }
  // 书签引用的分组若不存在，归入默认分组
  for (const b of bookmarks) {
    if (!seen.has(b.group)) b.group = 'g-default';
  }
  return groups;
}

export function repairEngines(raw: unknown): Engine[] {
  if (!Array.isArray(raw)) return DEFAULT_ENGINES.map((e) => ({ ...e }));
  if (raw.length === 0) return DEFAULT_ENGINES.map((e) => ({ ...e }));
  const out: Engine[] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const e = item as Record<string, unknown>;
    const name = repairString(e.name, '', 30);
    const url = repairString(e.url, '', 500);
    const query = repairString(e.query, 'q', 30);
    if (!name || !url) continue;
    out.push({
      id: repairString(e.id, uid('e'), 50),
      name,
      url,
      query,
      default: repairBool(e.default, false)
    });
  }
  if (out.length === 0) return DEFAULT_ENGINES.map((e) => ({ ...e }));
  out[0].default = true;
  return out;
}

export function repairTodos(raw: unknown): Todo[] {
  if (!Array.isArray(raw)) return [];
  const out: Todo[] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const t = item as Record<string, unknown>;
    const text = repairString(t.text, '', 200);
    if (!text) continue;
    out.push({
      id: repairString(t.id, uid('t'), 50),
      text,
      completed: repairBool(t.completed, false),
      priority: repairPriority(t.priority),
      due: typeof t.due === 'string' ? t.due.slice(0, 10) : '',
      createdAt: typeof t.createdAt === 'number' ? t.createdAt : Date.now()
    });
  }
  return out;
}

export function repairCountdowns(raw: unknown): Countdown[] {
  if (!Array.isArray(raw)) return [];
  const out: Countdown[] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const c = item as Record<string, unknown>;
    const name = repairString(c.name, '', 50);
    const date = repairString(c.date, '', 10);
    if (!name || !/^\d{4}-\d{2}-\d{2}$/.test(date)) continue;
    out.push({ id: repairString(c.id, uid('c'), 50), name, date });
  }
  return out;
}

export function repairSettings(raw: unknown): Settings {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const s: Settings = {
    theme: r.theme === 'dark' || r.theme === 'light' ? r.theme : 'auto',
    wallpaperKind: ['none', 'gradient', 'bing', 'picsum', 'custom', 'file'].includes(String(r.wallpaperKind)) ? (r.wallpaperKind as Settings['wallpaperKind']) : 'none',
    wallpaperValue: repairString(r.wallpaperValue, '', 5000),
    weatherCity: repairString(r.weatherCity, '', 50),
    weatherAutoTried: repairBool(r.weatherAutoTried, false),
    searchEngineId: repairString(r.searchEngineId, '', 50),
    widgets: {},
    widgetOrder: []
  };
  // widgets 合并默认值
  for (const key of Object.keys(DEFAULT_SETTINGS.widgets)) {
    const w = (r.widgets && typeof r.widgets === 'object' ? r.widgets : {}) as Record<string, unknown>;
    s.widgets[key] = repairBool(w[key], DEFAULT_SETTINGS.widgets[key]);
  }
  if (Array.isArray(r.widgetOrder) && r.widgetOrder.length) {
    const order: string[] = [];
    for (const id of r.widgetOrder) {
      if (typeof id === 'string' && s.widgets[id] !== undefined && !order.includes(id)) order.push(id);
    }
    for (const id of Object.keys(s.widgets)) if (!order.includes(id)) order.push(id);
    s.widgetOrder = order;
  } else {
    s.widgetOrder = [...DEFAULT_SETTINGS.widgetOrder];
  }
  return s;
}

export function repairHistory(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const out: string[] = [];
  for (const item of raw) {
    if (typeof item === 'string' && item.trim() && out.length < 50) out.push(item.trim());
  }
  return out;
}

// ---------- 版本迁移 ----------
// v1（上一版）→ v2：书签加 group 字段；settings 增加壁纸/组件配置
function migrateV1toV2(partial: Partial<AppState>): void {
  if (partial.bookmarks) {
    for (const b of partial.bookmarks) {
      if (!b.group) b.group = 'g-default';
    }
  }
  if (partial.settings) {
    const s = partial.settings as unknown as Record<string, unknown>;
    if (s.wallpaperKind === undefined) s.wallpaperKind = 'none';
    if (s.wallpaperValue === undefined) s.wallpaperValue = '';
    if (s.widgets === undefined) s.widgets = { ...DEFAULT_SETTINGS.widgets };
    if (s.widgetOrder === undefined) s.widgetOrder = [...DEFAULT_SETTINGS.widgetOrder];
  }
}

// ---------- 加载全部（含迁移 + 修复） ----------
export function loadState(): AppState {
  let version: number = typeof readRaw(K.schema) === 'number' ? (readRaw(K.schema) as number) : 0;

  // 旧版裸键迁移（最早版本使用的键）
  const legacy: Partial<AppState> = {
    bookmarks: readRaw(K.bookmarks) as Bookmark[] | undefined,
    engines: readRaw(K.engines) as Engine[] | undefined,
    todos: readRaw(K.todos) as Todo[] | undefined,
    settings: readRaw(K.settings) as Settings | undefined,
    searchHistory: readRaw(K.history) as string[] | undefined
  };

  if (version < 2) {
    migrateV1toV2(legacy);
  }

  const rawBookmarks = legacy.bookmarks === undefined ? DEFAULT_BOOKMARKS.map((b) => ({ ...b })) : legacy.bookmarks;
  const bookmarks = repairBookmarks(rawBookmarks);
  const state: AppState = {
    bookmarks,
    groups: repairGroups(readRaw(K.groups), bookmarks),
    engines: repairEngines(legacy.engines),
    todos: repairTodos(legacy.todos),
    countdowns: repairCountdowns(readRaw(K.countdowns)),
    notes: repairString(readRaw(K.notes), '', 20000),
    settings: repairSettings(legacy.settings),
    searchHistory: repairHistory(legacy.searchHistory),
    todoFilter: 'all'
  };

  // 版本号提升 + 一次性回写（修复后的数据落盘）
  writeRaw(K.schema, SCHEMA_VERSION);
  return state;
}

// ---------- 保存全部 ----------
export function saveState(state: AppState): boolean {
  let ok = true;
  ok = writeRaw(K.bookmarks, state.bookmarks) && ok;
  ok = writeRaw(K.groups, state.groups) && ok;
  ok = writeRaw(K.engines, state.engines) && ok;
  ok = writeRaw(K.todos, state.todos) && ok;
  ok = writeRaw(K.countdowns, state.countdowns) && ok;
  ok = writeRaw(K.notes, state.notes) && ok;
  ok = writeRaw(K.settings, state.settings) && ok;
  ok = writeRaw(K.history, state.searchHistory) && ok;
  return ok;
}

export function resetAllData(): void {
  for (const key of Object.values(K)) {
    try {
      localStorage.removeItem(key);
    } catch {
      /* ignore */
    }
  }
}