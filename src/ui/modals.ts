import { $, $$ } from '../core/utils';

export function openModal(id: string): void {
  $('#'.concat(id))?.classList.add('open');
}

export function closeModal(id: string): void {
  $('#'.concat(id))?.classList.remove('open');
}

export function closeAllModals(): void {
  $$('.modal.open').forEach((m) => m.classList.remove('open'));
}

export function hideSearchHistory(): void {
  $('#search-history')?.classList.add('hidden');
}

// 模态框通用事件：关闭按钮 / 点击遮罩 / Esc
export function initModals(): void {
  document.addEventListener('click', (e) => {
    const target = e.target as HTMLElement | null;
    if (!target) return;
    const closer = target.closest('[data-close]');
    if (closer) {
      const id = closer.getAttribute('data-close');
      if (id) closeModal(id);
      return;
    }
    if (target.classList.contains('modal')) {
      closeModal(target.id);
    }
  });
}
