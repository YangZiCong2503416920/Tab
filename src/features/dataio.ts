import { state, commit } from '../state';
import { toast } from '../core/toast';
import { resetAllData } from '../core/storage';
import {
  repairBookmarks, repairGroups, repairEngines, repairTodos,
  repairCountdowns, repairSettings, repairHistory
} from '../core/storage';

export function exportData(): void {
  try {
    const payload = {
      app: 'starttab',
      version: 2,
      exportedAt: new Date().toISOString(),
      bookmarks: state.bookmarks,
      groups: state.groups,
      engines: state.engines,
      todos: state.todos,
      countdowns: state.countdowns,
      notes: state.notes,
      settings: state.settings,
      searchHistory: state.searchHistory
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    const d = new Date();
    a.href = URL.createObjectURL(blob);
    a.download = 'starttab-backup-' + d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0') + '.json';
    document.body.appendChild(a);
    a.click();
    window.setTimeout(() => {
      URL.revokeObjectURL(a.href);
      a.remove();
    }, 500);
    toast('数据已导出', 'success');
  } catch (err) {
    console.error('[export]', err);
    toast('导出失败', 'error');
  }
}

// 导入：严格走 repair 管线（不信任用户文件）
export function importData(file: File): void {
  const reader = new FileReader();
  reader.onerror = () => toast('读取文件失败', 'error');
  reader.onload = () => {
    try {
      const data = JSON.parse(String(reader.result));
      if (!data || typeof data !== 'object') throw new Error('bad json');
      if (!window.confirm('导入将覆盖当前全部数据，确定继续？')) return;

      const bookmarks = repairBookmarks(data.bookmarks);
      state.bookmarks = bookmarks;
      state.groups = repairGroups(data.groups, bookmarks);
      state.engines = repairEngines(data.engines);
      state.todos = repairTodos(data.todos);
      state.countdowns = repairCountdowns(data.countdowns);
      state.notes = typeof data.notes === 'string' ? data.notes.slice(0, 20000) : '';
      state.settings = repairSettings(data.settings);
      state.searchHistory = repairHistory(data.searchHistory);

      commit();
      toast('导入成功', 'success');
    } catch (err) {
      console.error('[import]', err);
      toast('导入失败：文件格式不正确', 'error');
    }
  };
  reader.readAsText(file);
}

export function resetAll(): void {
  if (!window.confirm('确定重置全部数据？书签、待办、设置、搜索历史都会被清空。')) return;
  if (!window.confirm('再次确认：此操作不可恢复。')) return;
  resetAllData();
  window.location.reload();
}
