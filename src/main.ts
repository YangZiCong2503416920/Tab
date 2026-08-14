import './styles.css';
import { state, commit, emitRender } from './state';
import { $ } from './core/utils';
import { installGlobalErrorHandlers } from './core/toast';
import { initModals, openModal } from './ui/modals';
import { initTheme, applyTheme } from './features/theme';
import { initClock } from './features/clock';
import { initShortcuts } from './features/shortcuts';
import {
  renderEngineSelector, renderSearchHistory, performSearch, hideSearchHistory,
  openTranslate
} from './features/search';
import { initBookmarkRendering, openBookmarkModal, saveBookmarkFromForm } from './features/bookmarks';
import {
  initTodoRendering, addTodoFromQuickInput, setTodoFilter, clearCompleted,
  deleteTodoFromModal, saveTodoFromForm
} from './features/todos';
import { initWidgets } from './features/widgets';
import { loadBackground } from './features/background';
import { initSettings, openSettings } from './features/settings';

function initEvents(): void {
  // 顶栏
  $('#settings-btn')?.addEventListener('click', () => openSettings());
  $('#help-btn')?.addEventListener('click', () => openModal('help-modal'));

  // 搜索
  $('#search-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    hideSearchHistory();
    performSearch(($('#search-input') as HTMLInputElement | null)?.value || '');
  });
  const searchInput = $('#search-input') as HTMLInputElement | null;
  searchInput?.addEventListener('focus', renderSearchHistory);
  searchInput?.addEventListener('input', () => {
    if ((searchInput.value || '').trim()) renderSearchHistory();
  });
  $('#engine-selector')?.addEventListener('change', () => {
    state.settings.searchEngineId = ($('#engine-selector') as HTMLSelectElement | null)?.value || '';
    commit();
  });
  $('#translate-btn')?.addEventListener('click', () => {
    const q = ($('#search-input') as HTMLInputElement | null)?.value.trim() || '';
    openTranslate(q);
  });
  document.addEventListener('click', (e) => {
    if (!(e.target as HTMLElement | null)?.closest('.search-form')) hideSearchHistory();
  });

  // 待办
  $('#add-todo-btn')?.addEventListener('click', addTodoFromQuickInput);
  $('#todo-input')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') addTodoFromQuickInput();
  });
  $('#todo-filters')?.addEventListener('click', (e) => {
    const btn = (e.target as HTMLElement | null)?.closest('.filter-btn');
    if (!btn) return;
    setTodoFilter(btn.getAttribute('data-filter') as typeof state.todoFilter);
  });
  $('#clear-completed-btn')?.addEventListener('click', clearCompleted);
  $('#todo-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    saveTodoFromForm();
  });
  $('#todo-delete-btn')?.addEventListener('click', deleteTodoFromModal);

  // 书签
  $('#add-bookmark-btn')?.addEventListener('click', () => openBookmarkModal());
  $('#bookmark-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    saveBookmarkFromForm();
  });
}

function init(): void {
  installGlobalErrorHandlers();
  initModals();
  loadBackground();
  applyTheme();
  initClock();

  renderEngineSelector();
  renderSearchHistory();
  initBookmarkRendering();
  initTodoRendering();
  initWidgets();

  initEvents();
  initTheme();
  initSettings();
  initShortcuts();

  // 触发全部订阅者进行首次渲染
  emitRender();
}

document.addEventListener('DOMContentLoaded', init);