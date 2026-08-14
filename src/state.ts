import { loadState, saveState } from './core/storage';
import { toast } from './core/toast';
import type { AppState } from './core/types';

// 全局状态：从 localStorage 加载（含迁移/修复）
export const state: AppState = loadState();

// 渲染订阅：各模块注册自己的渲染函数，数据变更后统一通知
type RenderFn = () => void;
const renderers = new Set<RenderFn>();

export function onRender(fn: RenderFn): void {
  renderers.add(fn);
}

// 可重入的渲染通知：渲染过程中若再次触发（如异步组件提交），
  // 排队到本轮结束后再执行一轮，避免 DOM 重复渲染。
let rendering = false;
let pending = false;

export function emitRender(): void {
  if (rendering) {
    pending = true;
    return;
  }
  rendering = true;
  try {
    do {
      pending = false;
      for (const fn of [...renderers]) fn();
    } while (pending);
  } finally {
    rendering = false;
  }
}

// 立即持久化 + 通知渲染（同步写，避免丢数据）
export function commit(): void {
  const ok = saveState(state);
  if (!ok) {
    toast('保存失败：本地存储不可用或空间已满', 'error');
  }
  emitRender();
}