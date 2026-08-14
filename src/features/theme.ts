import { state, commit } from '../state';
import { $ } from '../core/utils';

export function applyTheme(): void {
  const root = document.documentElement;
  root.classList.remove('light-theme', 'dark-theme');
  const t = state.settings.theme;
  if (t === 'light') root.classList.add('light-theme');
  else if (t === 'dark') root.classList.add('dark-theme');

  const isLight =
    t === 'light' || (t === 'auto' && window.matchMedia('(prefers-color-scheme: light)').matches);
  const btn = $('#theme-toggle');
  if (btn) {
    btn.textContent = isLight ? '☀️' : '🌙';
    btn.title = isLight ? '切换到深色模式' : '切换到浅色模式';
  }
}

export function toggleTheme(): void {
  const isLight = document.documentElement.classList.contains('light-theme');
  state.settings.theme = isLight ? 'dark' : 'light';
  commit();
  applyTheme();
}

export function initTheme(): void {
  applyTheme();
  $('#theme-toggle')?.addEventListener('click', toggleTheme);
}
