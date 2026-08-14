import { $ } from '../core/utils';
import { openModal, closeAllModals, hideSearchHistory } from '../ui/modals';
import { openBookmarkModal } from './bookmarks';

export function initShortcuts(): void {
  document.addEventListener('keydown', (e) => {
    const t = e.target as HTMLElement | null;
    const typing =
      !!t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT');

    if (e.key === 'Escape') {
      closeAllModals();
      hideSearchHistory();
      return;
    }

    const mod = e.ctrlKey || e.metaKey;
    if (mod && (e.key === 'k' || e.key === 'K')) {
      e.preventDefault();
      if (typing && t && t.id === 'search-input') return;
      focusSearch();
      return;
    }
    if (typing) return;

    if (e.key === '/') {
      e.preventDefault();
      focusSearch();
    } else if (e.key === 't' || e.key === 'T') {
      e.preventDefault();
      $('#todo-input')?.focus();
    } else if (e.key === 'n' || e.key === 'N') {
      e.preventDefault();
      openBookmarkModal();
    } else if (e.key === '?') {
      e.preventDefault();
      openModal('help-modal');
    }
  });
}

export function focusSearch(): void {
  hideSearchHistory();
  const input = $('#search-input');
  if (input) {
    input.focus();
    (input as HTMLInputElement).select();
  }
}