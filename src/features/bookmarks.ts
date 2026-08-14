import { state, commit, onRender } from '../state';
import { $, uid, normalizeUrl, faviconFor } from '../core/utils';
import { toast } from '../core/toast';
import { openModal, closeModal } from '../ui/modals';
import type { Bookmark } from '../core/types';

let currentGroup = 'all'; // all 或分组 id

// ---- 渲染 ----
export function renderBookmarks(): void {
  const container = $('#bookmark-cards');
  const empty = $('#bookmark-empty');
  if (!container) return;

  const list = currentGroup === 'all' ? state.bookmarks : state.bookmarks.filter((b) => b.group === currentGroup);
  container.innerHTML = '';
  if (empty) empty.classList.toggle('hidden', list.length > 0);

  list.forEach((bookmark) => {
    container.appendChild(createCard(bookmark));
  });
  bindBookmarkDrag(container);
}

function createCard(bookmark: Bookmark): HTMLAnchorElement {
  const card = document.createElement('a');
  card.href = normalizeUrl(bookmark.url);
  card.target = '_blank';
  card.rel = 'noopener';
  card.className = 'card';
  card.dataset.id = bookmark.id;
  card.draggable = true;
  card.title = bookmark.url;

  const icon = document.createElement('span');
  icon.className = 'card-icon';
  const emoji = (bookmark.icon || '').trim();
  if (emoji) {
    icon.textContent = emoji;
  } else {
    const img = document.createElement('img');
    img.alt = '';
    img.loading = 'lazy';
    img.src = faviconFor(bookmark.url) || '';
    img.onerror = () => {
      icon.textContent = (bookmark.name || '?').charAt(0).toUpperCase();
    };
    icon.appendChild(img);
  }

  const name = document.createElement('span');
  name.className = 'card-name';
  name.textContent = bookmark.name;

  const actions = document.createElement('div');
  actions.className = 'card-actions';
  const editBtn = document.createElement('button');
  editBtn.className = 'card-edit-btn';
  editBtn.textContent = '✏️';
  editBtn.title = '编辑';
  editBtn.onclick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    openBookmarkModal(bookmark.id);
  };
  const delBtn = document.createElement('button');
  delBtn.className = 'card-del-btn';
  delBtn.textContent = '🗑';
  delBtn.title = '删除';
  delBtn.onclick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!window.confirm('删除书签「' + bookmark.name + '」？')) return;
    state.bookmarks = state.bookmarks.filter((b) => b.id !== bookmark.id);
    commit();
  };
  actions.append(editBtn, delBtn);

  card.append(icon, name, actions);
  return card;
}

function bindBookmarkDrag(container: HTMLElement): void {
  let dragId: string | null = null;
  const cards = container.querySelectorAll<HTMLAnchorElement>('.card');
  cards.forEach((card) => {
    card.addEventListener('dragstart', (e) => {
      dragId = card.dataset.id || null;
      card.classList.add('dragging');
      if (e.dataTransfer) e.dataTransfer.effectAllowed = 'move';
      try {
        if (e.dataTransfer) e.dataTransfer.setData('text/plain', dragId || '');
      } catch {
        /* ignore */
      }
    });
    card.addEventListener('dragend', () => {
      card.classList.remove('dragging');
      dragId = null;
      container.querySelectorAll('.card').forEach((c) => c.classList.remove('drag-over'));
      commitDragOrder(container);
    });
    card.addEventListener('dragover', (e) => {
      e.preventDefault();
      if (!dragId || dragId === card.dataset.id) return;
      if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
      const dragged = container.querySelector<HTMLElement>('.dragging');
      if (!dragged) return;
      container.querySelectorAll('.card').forEach((c) => c.classList.remove('drag-over'));
      const rect = card.getBoundingClientRect();
      const after = rect.height > 0 && e.clientY - rect.top > rect.height / 2;
      card.classList.add('drag-over');
      if (after) container.insertBefore(dragged, card.nextSibling);
      else container.insertBefore(dragged, card);
    });
    card.addEventListener('drop', (e) => e.preventDefault());
  });

  function commitDragOrder(c: HTMLElement): void {
    const ids = Array.from(c.querySelectorAll('.card')).map((x) => (x as HTMLElement).dataset.id || '');
    const map = new Map(state.bookmarks.map((b) => [b.id, b]));
    const reordered = ids.map((id) => map.get(id)).filter((b): b is Bookmark => !!b);
    if (
      reordered.length === state.bookmarks.length &&
      reordered.some((b, i) => b.id !== state.bookmarks[i].id)
    ) {
      state.bookmarks = reordered;
      commit();
    }
  }
}

// ---- 分组标签 ----
export function renderGroupChips(): void {
  const bar = $('#group-chips');
  if (!bar) return;
  bar.innerHTML = '';
  const groups = [{ id: 'all', name: '全部' }, ...state.groups];
  groups.forEach((g) => {
    const chip = document.createElement('button');
    chip.className = 'group-chip' + (currentGroup === g.id ? ' active' : '');
    chip.textContent = g.name;
    chip.dataset.group = g.id;
    chip.onclick = () => {
      currentGroup = g.id;
      renderGroupChips();
      renderBookmarks();
    };
    bar.appendChild(chip);
  });
}

export function getCurrentGroup(): string {
  return currentGroup === 'all' ? state.groups[0]?.id || 'g-default' : currentGroup;
}

// ---- 书签编辑弹窗 ----
export function openBookmarkModal(id?: string): void {
  const form = $('#bookmark-form') as HTMLFormElement | null;
  form?.reset();
  const editId = $('#bookmark-edit-id') as HTMLInputElement | null;
  const title = $('#bookmark-modal-title');
  const name = $('#bookmark-name') as HTMLInputElement | null;
  const url = $('#bookmark-url') as HTMLInputElement | null;
  const icon = $('#bookmark-icon') as HTMLInputElement | null;
  const groupSel = $('#bookmark-group') as HTMLSelectElement | null;

  if (editId) editId.value = '';
  // 分组下拉
  if (groupSel) {
    groupSel.innerHTML = '';
    state.groups.forEach((g) => {
      const opt = document.createElement('option');
      opt.value = g.id;
      opt.textContent = g.name;
      groupSel.appendChild(opt);
    });
  }
  if (id) {
    const bm = state.bookmarks.find((b) => b.id === id);
    if (!bm) return;
    if (title) title.textContent = '编辑书签';
    if (editId) editId.value = id;
    if (name) name.value = bm.name;
    if (url) url.value = bm.url;
    if (icon) icon.value = bm.icon || '';
    if (groupSel) groupSel.value = bm.group;
  } else {
    if (title) title.textContent = '添加书签';
    if (groupSel) groupSel.value = getCurrentGroup();
  }
  openModal('bookmark-modal');
  window.setTimeout(() => name?.focus(), 50);
}

export function saveBookmarkFromForm(): void {
  const editId = ($('#bookmark-edit-id') as HTMLInputElement | null)?.value || '';
  const name = ($('#bookmark-name') as HTMLInputElement | null)?.value.trim() || '';
  const url = normalizeUrl(($('#bookmark-url') as HTMLInputElement | null)?.value || '');
  const icon = ($('#bookmark-icon') as HTMLInputElement | null)?.value.trim() || '';
  const group = ($('#bookmark-group') as HTMLSelectElement | null)?.value || state.groups[0]?.id || 'g-default';
  if (!name || !url) {
    toast('请填写名称和网址', 'error');
    return;
  }
  if (editId) {
    const bm = state.bookmarks.find((b) => b.id === editId);
    if (bm) Object.assign(bm, { name, url, icon, group });
  } else {
    state.bookmarks.push({ id: uid('b'), name, url, icon, group });
  }
  commit();
  closeModal('bookmark-modal');
}

// ---- 分组管理（设置页） ----
export function renderGroupList(): void {
  const list = $('#group-list');
  if (!list) return;
  list.innerHTML = '';
  state.groups.forEach((g, idx) => {
    const li = document.createElement('li');
    li.className = 'group-item';
    const name = document.createElement('span');
    name.className = 'group-name';
    name.textContent = g.name;
    const count = document.createElement('span');
    count.className = 'group-count';
    count.textContent = state.bookmarks.filter((b) => b.group === g.id).length + ' 个书签';
    const actions = document.createElement('div');
    actions.className = 'engine-actions';

    const renameBtn = document.createElement('button');
    renameBtn.textContent = '重命名';
    renameBtn.onclick = () => {
      const next = window.prompt('分组名称：', g.name);
      if (next && next.trim() && next.trim() !== g.name) {
        g.name = next.trim();
        commit();
        renderGroupList();
        renderGroupChips();
      }
    };
    const delBtn = document.createElement('button');
    delBtn.textContent = '删除';
    delBtn.className = 'engine-del';
    delBtn.onclick = () => {
      if (state.groups.length <= 1) {
        toast('至少保留一个分组', 'error');
        return;
      }
      const n = state.bookmarks.filter((b) => b.group === g.id).length;
      if (!window.confirm('删除分组「' + g.name + '」？' + (n ? '其中的 ' + n + ' 个书签将移入「' + (idx === 0 ? state.groups[1]?.name : state.groups[0]?.name) + '」。' : ''))) return;
      const target = idx === 0 ? state.groups[1]?.id : state.groups[0]?.id;
      state.bookmarks.forEach((b) => {
        if (b.group === g.id) b.group = target || 'g-default';
      });
      state.groups = state.groups.filter((x) => x.id !== g.id);
      if (currentGroup === g.id) currentGroup = 'all';
      commit();
      renderGroupList();
      renderGroupChips();
    };
    actions.append(renameBtn, delBtn);
    li.append(name, count, actions);
    list.appendChild(li);
  });
}

export function addGroup(name: string): void {
  const n = name.trim();
  if (!n) return;
  if (state.groups.some((g) => g.name === n)) {
    toast('分组已存在', 'error');
    return;
  }
  state.groups.push({ id: uid('g'), name: n });
  commit();
  renderGroupList();
  renderGroupChips();
}

// 让外部在数据变化时刷新分组/书签
export function initBookmarkRendering(): void {
  onRender(() => {
    renderGroupChips();
    renderBookmarks();
    renderGroupList();
  });
}