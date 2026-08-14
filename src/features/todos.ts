import { state, commit, onRender } from '../state';
import { $, uid, daysFromToday } from '../core/utils';
import { toast } from '../core/toast';
import { openModal, closeModal } from '../ui/modals';
import type { Todo } from '../core/types';

const PRIORITY_LABEL: Record<string, string> = { high: '高', medium: '中', low: '低' };

export function renderTodos(): void {
  const list = $('#todo-list');
  const empty = $('#todo-empty');
  const clearBtn = $('#clear-completed-btn');
  if (!list) return;

  const filter = state.todoFilter;
  const visible = state.todos.filter((t) =>
    filter === 'all' ? true : filter === 'completed' ? t.completed : !t.completed
  );
  list.innerHTML = '';
  if (empty) empty.classList.toggle('hidden', visible.length > 0);
  if (clearBtn) clearBtn.classList.toggle('hidden', !state.todos.some((t) => t.completed));

  visible.forEach((todo) => {
    list.appendChild(createTodoItem(todo));
  });
}

function createTodoItem(todo: Todo): HTMLLIElement {
  const li = document.createElement('li');
  li.className = 'todo-item' + (todo.completed ? ' completed' : '');
  li.dataset.id = todo.id;

  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.className = 'todo-checkbox';
  checkbox.checked = !!todo.completed;
  checkbox.addEventListener('click', (e) => e.stopPropagation());
  checkbox.addEventListener('change', () => {
    todo.completed = checkbox.checked;
    commit();
  });

  const main = document.createElement('div');
  main.className = 'todo-main';
  const text = document.createElement('span');
  text.className = 'todo-text';
  text.textContent = todo.text;
  main.appendChild(text);

  const sub = document.createElement('div');
  sub.className = 'todo-sub hidden';
  if (todo.priority && todo.priority !== 'medium') {
    const badge = document.createElement('span');
    badge.className = 'priority-badge ' + todo.priority;
    badge.textContent = PRIORITY_LABEL[todo.priority] + ' 优先级';
    sub.appendChild(badge);
  }
  if (todo.due) {
    const due = document.createElement('span');
    due.className = 'due-date';
    const diff = daysFromToday(todo.due);
    if (diff < 0) {
      due.classList.add('overdue');
      due.textContent = '⏰ 已逾期 ' + -diff + ' 天';
    } else if (diff === 0) {
      due.classList.add('today');
      due.textContent = '⏰ 今天到期';
    } else if (diff === 1) {
      due.textContent = '⏰ 明天到期';
    } else {
      const parts = todo.due.split('-');
      due.textContent = '⏰ ' + parseInt(parts[1], 10) + '月' + parseInt(parts[2], 10) + '日';
    }
    sub.appendChild(due);
  }
  if (sub.children.length) sub.classList.remove('hidden');
  main.appendChild(sub);

  const actions = document.createElement('div');
  actions.className = 'todo-actions';
  const editBtn = document.createElement('button');
  editBtn.className = 'todo-action-btn';
  editBtn.textContent = '✏️';
  editBtn.title = '编辑';
  editBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    openTodoModal(todo.id);
  });
  const delBtn = document.createElement('button');
  delBtn.className = 'todo-action-btn danger';
  delBtn.textContent = '🗑';
  delBtn.title = '删除';
  delBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    if (!window.confirm('删除这条待办？')) return;
    state.todos = state.todos.filter((t) => t.id !== todo.id);
    commit();
  });
  actions.append(editBtn, delBtn);

  li.append(checkbox, main, actions);
  li.addEventListener('click', () => openTodoModal(todo.id));
  return li;
}

export function addTodoFromQuickInput(): void {
  const input = $('#todo-input') as HTMLInputElement | null;
  if (!input) return;
  const text = input.value.trim();
  if (!text) return;
  state.todos.push({ id: uid('t'), text, completed: false, priority: 'medium', due: '', createdAt: Date.now() });
  input.value = '';
  commit();
}

export function openTodoModal(id: string): void {
  const todo = state.todos.find((t) => t.id === id);
  if (!todo) return;
  ($('#todo-edit-id') as HTMLInputElement | null)!.value = id;
  ($('#todo-edit-text') as HTMLInputElement | null)!.value = todo.text;
  ($('#todo-edit-priority') as HTMLSelectElement | null)!.value = todo.priority;
  ($('#todo-edit-due') as HTMLInputElement | null)!.value = todo.due || '';
  openModal('todo-modal');
  window.setTimeout(() => ($('#todo-edit-text') as HTMLInputElement | null)?.focus(), 50);
}

export function saveTodoFromForm(): void {
  const id = ($('#todo-edit-id') as HTMLInputElement | null)?.value || '';
  const todo = state.todos.find((t) => t.id === id);
  if (!todo) return;
  todo.text = ($('#todo-edit-text') as HTMLInputElement | null)?.value.trim() || '';
  todo.priority = ($('#todo-edit-priority') as HTMLSelectElement | null)?.value as Todo['priority'] || 'medium';
  todo.due = ($('#todo-edit-due') as HTMLInputElement | null)?.value || '';
  if (!todo.text) {
    toast('待办内容不能为空', 'error');
    return;
  }
  commit();
  closeModal('todo-modal');
}

export function deleteTodoFromModal(): void {
  const id = ($('#todo-edit-id') as HTMLInputElement | null)?.value || '';
  if (!id) return;
  state.todos = state.todos.filter((t) => t.id !== id);
  commit();
  closeModal('todo-modal');
}

export function clearCompleted(): void {
  const count = state.todos.filter((t) => t.completed).length;
  if (!count) return;
  if (!window.confirm('清除 ' + count + ' 条已完成待办？')) return;
  state.todos = state.todos.filter((t) => !t.completed);
  commit();
}

export function setTodoFilter(filter: typeof state.todoFilter): void {
  state.todoFilter = filter;
  $$filterActive();
  renderTodos();
}

function $$filterActive(): void {
  const bar = $('#todo-filters');
  if (!bar) return;
  bar.querySelectorAll('.filter-btn').forEach((b) => {
    b.classList.toggle('active', b.getAttribute('data-filter') === state.todoFilter);
  });
}

// 日历组件需要：某天是否有待办到期
export function todoDueDates(): Map<string, number> {
  const map = new Map<string, number>();
  for (const t of state.todos) {
    if (t.due) map.set(t.due, (map.get(t.due) || 0) + 1);
  }
  return map;
}

export function initTodoRendering(): void {
  onRender(renderTodos);
}