import { state, commit } from '../state';
import { $, $$ } from '../core/utils';
import { toast } from '../core/toast';
import { openModal } from '../ui/modals';
import {
  renderEngineList, resetEngineForm, fillEnginePresets,
  applyEnginePreset, saveEngineFromForm, resetEngines
} from './search';
import { renderGroupList, addGroup } from './bookmarks';
import { applyWallpaper, renderWallpaperGallery } from './background';
import { renderWidgetSettings } from './widgets';
import { saveWeatherCity } from './weather';
import { exportData, importData, resetAll } from './dataio';
import { applyTheme } from './theme';

export function initSettings(): void {
  // Tabs 切换
  $('#settings-tabs')?.addEventListener('click', (e) => {
    const btn = (e.target as HTMLElement | null)?.closest('.tab-btn');
    if (btn) switchTab(btn.getAttribute('data-tab') || 'engines');
  });

  // 搜索引擎表单
  $('#engine-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    saveEngineFromForm();
  });
  $('#engine-reset-btn')?.addEventListener('click', resetEngines);
  $('#engine-preset')?.addEventListener('change', (e) => {
    const sel = e.target as HTMLSelectElement;
    const idx = parseInt(sel.value, 10);
    if (idx >= 0) applyEnginePreset(idx);
    sel.value = '-1';
  });

  // 分组
  $('#group-add-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const input = $('#group-add-input') as HTMLInputElement | null;
    if (input) {
      addGroup(input.value);
      input.value = '';
    }
  });

  // 外观
  $('#settings-theme')?.addEventListener('change', (e) => {
    state.settings.theme = (e.target as HTMLSelectElement).value as typeof state.settings.theme;
    commit();
    applyTheme();
  });
  $('#bg-url-btn')?.addEventListener('click', () => {
    const url = ($('#bg-url') as HTMLInputElement | null)?.value.trim() || '';
    if (!url) {
      toast('请输入图片 URL', 'error');
      return;
    }
    applyWallpaper('custom', url);
    ($('#bg-url') as HTMLInputElement | null)!.value = '';
  });
  $('#bg-file')?.addEventListener('change', (e) => {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      applyWallpaper('file', String(ev.target?.result || ''));
      (e.target as HTMLInputElement).value = '';
    };
    reader.readAsDataURL(file);
  });

  // 天气
  $('#weather-save-btn')?.addEventListener('click', () => {
    const city = ($('#weather-city') as HTMLInputElement | null)?.value || '';
    saveWeatherCity(city);
  });
  $('#weather-city')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      const city = ($('#weather-city') as HTMLInputElement | null)?.value || '';
      saveWeatherCity(city);
    }
  });

  // 数据
  $('#export-btn')?.addEventListener('click', exportData);
  $('#import-file')?.addEventListener('change', (e) => {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (file) importData(file);
    (e.target as HTMLInputElement).value = '';
  });
  $('#reset-btn')?.addEventListener('click', resetAll);
}

export function openSettings(tab?: string): void {
  switchTab(tab || 'engines');
  refreshSettingsUI();
  openModal('settings-modal');
}

function refreshSettingsUI(): void {
  fillEnginePresets();
  renderEngineList();
  renderGroupList();
  renderWidgetSettings();
  renderWallpaperGallery();
  const themeSel = $('#settings-theme') as HTMLSelectElement | null;
  if (themeSel) themeSel.value = state.settings.theme;
  const bgUrl = $('#bg-url') as HTMLInputElement | null;
  if (bgUrl) bgUrl.value = '';
  const city = $('#weather-city') as HTMLInputElement | null;
  if (city) city.value = state.settings.weatherCity || '';
  resetEngineForm();
}

export function switchTab(tab: string): void {
  $$('#settings-tabs .tab-btn').forEach((b) => b.classList.toggle('active', b.getAttribute('data-tab') === tab));
  $$('.tab-panel').forEach((p) => p.classList.toggle('active', p.id === 'tab-' + tab));
}