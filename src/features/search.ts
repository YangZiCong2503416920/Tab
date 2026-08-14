import { state, commit } from '../state';
import { $, normalizeUrl, isUrlLike, hasChinese, fetchWithTimeout } from '../core/utils';
import { toast } from '../core/toast';
import { DEFAULT_ENGINES, ENGINE_PRESETS } from '../core/storage';
import type { Engine } from '../core/types';
import { uid } from '../core/utils';

// ---- 搜索引擎下拉 ----
export function renderEngineSelector(): void {
  const sel = $('#engine-selector');
  if (!sel) return;
  const saved = state.settings.searchEngineId;
  const hasSaved = state.engines.some((e) => e.id === saved);
  const current = hasSaved ? saved : ((state.engines.find((e) => e.default) || state.engines[0] || { id: '' }) as Engine).id;
  sel.innerHTML = '';
  state.engines.forEach((engine) => {
    const opt = document.createElement('option');
    opt.value = engine.id;
    opt.textContent = engine.name;
    sel.appendChild(opt);
  });
  (sel as HTMLSelectElement).value = current;
  if (state.settings.searchEngineId !== current) {
    state.settings.searchEngineId = current;
    commit();
  }
}

// ---- 搜索历史 ----
export function renderSearchHistory(): void {
  const box = $('#search-history');
  if (!box) return;
  box.innerHTML = '';
  if (!state.searchHistory.length) {
    box.classList.add('hidden');
    return;
  }
  state.searchHistory.slice(0, 8).forEach((item) => {
    const div = document.createElement('div');
    div.className = 'history-item';
    div.textContent = item;
    div.onclick = () => {
      const input = $('#search-input') as HTMLInputElement | null;
      if (input) input.value = item;
      box.classList.add('hidden');
      performSearch(item);
    };
    box.appendChild(div);
  });
  box.classList.remove('hidden');
}

export function hideSearchHistory(): void {
  $('#search-history')?.classList.add('hidden');
}

function saveSearchHistory(query: string): void {
  let h = state.searchHistory.filter((x) => x !== query);
  h.unshift(query);
  state.searchHistory = h.slice(0, 50);
}

// ---- 搜索执行 ----
export function performSearch(raw: string): void {
  const query = (raw || '').trim();
  if (!query) {
    $('#search-input')?.focus();
    return;
  }

  // 翻译前缀：译 xxx / fy xxx
  const translateMatch = query.match(/^(?:译|翻译|fy)\s+(.+)$/i);
  if (translateMatch) {
    openTranslate(translateMatch[1]);
    return;
  }

  const engine = state.engines.find((e) => e.id === ($('#engine-selector') as HTMLSelectElement | null)?.value);
  if (isUrlLike(query)) {
    window.open(normalizeUrl(query), '_blank');
    return;
  }
  if (engine) {
    saveSearchHistory(query);
    const sep = engine.url.includes('?') ? '&' : '?';
    const qs = engine.query ? sep + engine.query + '=' + encodeURIComponent(query) : '/' + encodeURIComponent(query);
    window.open(engine.url + qs, '_blank');
  } else {
    toast('没有可用的搜索引擎，请在设置中添加', 'error');
  }
}

// ---- 快速翻译（iTab 特性） ----
export function openTranslate(text: string): void {
  const t = text.trim();
  if (!t) return;
  const tl = hasChinese(t) ? 'en' : 'zh-CN';
  window.open('https://translate.google.com/?sl=auto&tl=' + tl + '&text=' + encodeURIComponent(t), '_blank');
  toast('已打开翻译：' + (hasChinese(t) ? '中→英' : '英→中'), 'success', 2000);
}

// ---- 搜索引擎管理（设置页） ----
export function renderEngineList(): void {
  const list = $('#engine-list');
  if (!list) return;
  list.innerHTML = '';
  state.engines.forEach((engine, idx) => {
    const li = document.createElement('li');
    li.className = 'engine-item';
    li.dataset.id = engine.id;

    if (idx === 0) {
      const tag = document.createElement('span');
      tag.className = 'engine-default';
      tag.textContent = '默认';
      li.appendChild(tag);
    }

    const name = document.createElement('span');
    name.className = 'engine-name';
    name.textContent = engine.name;
    li.appendChild(name);

    const url = document.createElement('span');
    url.className = 'engine-url';
    url.title = engine.url;
    url.textContent = engine.url;
    li.appendChild(url);

    const actions = document.createElement('div');
    actions.className = 'engine-actions';
    const setBtn = document.createElement('button');
    setBtn.textContent = '设为默认';
    setBtn.onclick = () => {
      const [item] = state.engines.splice(idx, 1);
      state.engines.unshift(item);
      state.engines.forEach((e, i) => (e.default = i === 0));
      commit();
      renderEngineList();
      renderEngineSelector();
    };
    const editBtn = document.createElement('button');
    editBtn.textContent = '编辑';
    editBtn.onclick = () => fillEngineForm(engine.id);
    const delBtn = document.createElement('button');
    delBtn.textContent = '删除';
    delBtn.onclick = () => {
      if (state.engines.length <= 1) {
        toast('至少保留一个搜索引擎', 'error');
        return;
      }
      if (!window.confirm('删除搜索引擎「' + engine.name + '」？')) return;
      state.engines = state.engines.filter((e) => e.id !== engine.id);
      commit();
      renderEngineList();
      renderEngineSelector();
    };
    actions.append(setBtn, editBtn, delBtn);
    li.appendChild(actions);
    list.appendChild(li);
  });
}

export function fillEngineForm(id: string): void {
  const engine = state.engines.find((e) => e.id === id);
  if (!engine) return;
  const eid = $('#engine-edit-id') as HTMLInputElement | null;
  const name = $('#engine-name') as HTMLInputElement | null;
  const url = $('#engine-url') as HTMLInputElement | null;
  const query = $('#engine-query') as HTMLInputElement | null;
  const tip = $('#engine-form-tip');
  const saveBtn = $('#engine-save-btn');
  if (eid) eid.value = engine.id;
  if (name) name.value = engine.name;
  if (url) url.value = engine.url;
  if (query) query.value = engine.query;
  if (tip) tip.textContent = '正在编辑：' + engine.name;
  if (saveBtn) saveBtn.textContent = '保存修改';
}

export function saveEngineFromForm(): void {
  const eid = $('#engine-edit-id') as HTMLInputElement | null;
  const name = ($('#engine-name') as HTMLInputElement | null)?.value.trim() || '';
  const url = ($('#engine-url') as HTMLInputElement | null)?.value.trim() || '';
  const query = ($('#engine-query') as HTMLInputElement | null)?.value.trim() || '';
  if (!name || !url || !query) {
    toast('请填写完整的引擎信息', 'error');
    return;
  }
  const id = eid ? eid.value : '';
  if (id) {
    const eng = state.engines.find((x) => x.id === id);
    if (eng) Object.assign(eng, { name, url, query });
    resetEngineForm();
  } else {
    state.engines.push({ id: uid('e'), name, url, query, default: false });
    resetEngineForm();
  }
  commit();
  renderEngineList();
  renderEngineSelector();
}

export function resetEngineForm(): void {
  const eid = $('#engine-edit-id') as HTMLInputElement | null;
  const name = $('#engine-name') as HTMLInputElement | null;
  const url = $('#engine-url') as HTMLInputElement | null;
  const query = $('#engine-query') as HTMLInputElement | null;
  const tip = $('#engine-form-tip');
  const saveBtn = $('#engine-save-btn');
  if (eid) eid.value = '';
  if (name) name.value = '';
  if (url) url.value = '';
  if (query) query.value = '';
  if (tip) tip.textContent = '';
  if (saveBtn) saveBtn.textContent = '添加';
}

export function fillEnginePresets(): void {
  const sel = $('#engine-preset') as HTMLSelectElement | null;
  if (!sel || sel.options.length > 1) return;
  ENGINE_PRESETS.forEach((p, i) => {
    const opt = document.createElement('option');
    opt.value = String(i);
    opt.textContent = p.name + ' — ' + p.url;
    sel.appendChild(opt);
  });
}

export function applyEnginePreset(presetIndex: number): void {
  const preset = ENGINE_PRESETS[presetIndex];
  if (!preset) return;
  const url = $('#engine-url') as HTMLInputElement | null;
  const query = $('#engine-query') as HTMLInputElement | null;
  const name = $('#engine-name') as HTMLInputElement | null;
  if (name) name.value = preset.name;
  if (url) url.value = preset.url;
  if (query) query.value = preset.query;
}

export function resetEngines(): void {
  if (!window.confirm('恢复默认搜索引擎列表？当前自定义列表将被替换。')) return;
  state.engines = DEFAULT_ENGINES.map((e) => ({ ...e }));
  commit();
  renderEngineList();
  renderEngineSelector();
  resetEngineForm();
}

// 可选：拉取引擎的 favicon 域名（未使用保留给未来）
export async function checkEngineReachability(engine: Engine): Promise<boolean> {
  try {
    const res = await fetchWithTimeout(engine.url, 5000, 0, { method: 'HEAD' });
    return res.ok;
  } catch {
    return false;
  }
}