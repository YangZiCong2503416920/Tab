// 全局数据类型定义

export type ThemeMode = 'auto' | 'dark' | 'light';
export type Priority = 'high' | 'medium' | 'low';
export type TodoFilter = 'all' | 'active' | 'completed';

export interface Bookmark {
  id: string;
  name: string;
  url: string;
  icon: string; // Emoji，空则自动抓取 favicon
  group: string; // 所属分组 id
}

export interface BookmarkGroup {
  id: string;
  name: string;
}

export interface Engine {
  id: string;
  name: string;
  url: string;
  query: string;
  default: boolean;
}

export interface Todo {
  id: string;
  text: string;
  completed: boolean;
  priority: Priority;
  due: string; // YYYY-MM-DD 或 ''
  createdAt: number;
}

export interface Countdown {
  id: string;
  name: string;
  date: string; // YYYY-MM-DD
}

export type WallpaperKind =
  | 'none'
  | 'gradient'
  | 'bing'
  | 'picsum'
  | 'custom'
  | 'file';

export interface Settings {
  theme: ThemeMode;
  wallpaperKind: WallpaperKind;
  wallpaperValue: string; // 渐变索引 / 图片 URL / dataURL
  weatherCity: string;
  weatherAutoTried: boolean;
  searchEngineId: string;
  widgets: Record<string, boolean>; // widgetId -> enabled
  widgetOrder: string[];
}

export interface AppState {
  bookmarks: Bookmark[];
  groups: BookmarkGroup[];
  engines: Engine[];
  todos: Todo[];
  countdowns: Countdown[];
  notes: string;
  settings: Settings;
  searchHistory: string[];
  todoFilter: TodoFilter;
}
