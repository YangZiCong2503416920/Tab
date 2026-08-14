import { state, commit, onRender } from '../state';
import { $, uid, todayStr, daysFromToday, debounce } from '../core/utils';
import { toast } from '../core/toast';
import { refreshWeather, renderWeatherLoading, renderWeatherError } from './weather';
import { todoDueDates } from './todos';

// ---------------- 小组件注册表 ----------------
interface WidgetDef {
  id: string;
  name: string;
  icon: string;
  render(el: HTMLElement): void;
}

const WIDGETS: WidgetDef[] = [
  { id: 'clock', name: '时钟', icon: '🕐', render: renderClockWidget },
  { id: 'calendar', name: '日历', icon: '📅', render: renderCalendarWidget },
  { id: 'weather', name: '天气', icon: '🌤️', render: renderWeatherWidget },
  { id: 'countdown', name: '倒数日', icon: '⏳', render: renderCountdownWidget },
  { id: 'notes', name: '便签', icon: '📝', render: renderNotesWidget }
];

export function widgetMeta(id: string): { name: string; icon: string } | undefined {
  const w = WIDGETS.find((x) => x.id === id);
  return w ? { name: w.name, icon: w.icon } : undefined;
}

// ---------------- 整体渲染 ----------------
export function renderWidgets(): void {
  const row = $('#widgets-row');
  if (!row) return;
  row.innerHTML = '';
  const order = state.settings.widgetOrder.filter((id) => state.settings.widgets[id]);
  if (!order.length) {
    const tip = document.createElement('div');
    tip.className = 'widgets-empty-tip';
    tip.textContent = '在设置中开启小组件 ✨';
    row.appendChild(tip);
    return;
  }
  order.forEach((id) => {
    const def = WIDGETS.find((w) => w.id === id);
    if (!def) return;
    const card = document.createElement('div');
    card.className = 'widget-card';
    card.dataset.widget = id;
    try {
      def.render(card);
    } catch (err) {
      console.error('[widget:' + id + ']', err);
      card.innerHTML = '<div class="widget-error">组件渲染失败</div>';
    }
    row.appendChild(card);
  });
}

// ---------------- 时钟组件 ----------------
function renderClockWidget(el: HTMLElement): void {
  const update = () => {
    const now = new Date();
    const hh = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    const ss = String(now.getSeconds()).padStart(2, '0');
    const week = ['日', '一', '二', '三', '四', '五', '六'][now.getDay()];
    el.innerHTML =
      '<div class="widget-clock-time">' + hh + ':' + mm + '</div>' +
      '<div class="widget-clock-sec">' + ss + '</div>' +
      '<div class="widget-clock-date">' + now.getMonth() + 1 + '月' + now.getDate() + '日 · 周' + week + '</div>';
  };
  update();
  const timer = window.setInterval(update, 1000);
  // 组件被移除时清理定时器
  observeRemoval(el, timer);
}

// ---------------- 日历组件 ----------------
interface CalendarView {
  year: number;
  month: number; // 0-11
}
let calendarView: CalendarView = (() => {
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() };
})();

function renderCalendarWidget(el: HTMLElement): void {
  const { year, month } = calendarView;
  const firstDay = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startWeekday = firstDay.getDay(); // 0=周日
  const today = todayStr();
  const dueMap = todoDueDates();

  const weekNames = ['日', '一', '二', '三', '四', '五', '六'];
  let html =
    '<div class="widget-header">' +
    '<button class="cal-nav" data-cal="-1">‹</button>' +
    '<span class="widget-title">' + year + '年' + (month + 1) + '月</span>' +
    '<button class="cal-nav" data-cal="1">›</button>' +
    '</div>' +
    '<div class="cal-week">' + weekNames.map((w) => '<span>' + w + '</span>').join('') + '</div>' +
    '<div class="cal-grid">';

  for (let i = 0; i < startWeekday; i++) {
    html += '<span class="cal-empty"></span>';
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const ds = year + '-' + String(month + 1).padStart(2, '0') + '-' + String(d).padStart(2, '0');
    const isToday = ds === today;
    const hasDue = dueMap.has(ds);
    html +=
      '<span class="cal-day' + (isToday ? ' today' : '') + (hasDue ? ' has-due' : '') + '"' +
      (hasDue ? ' title="' + dueMap.get(ds) + ' 个待办到期"' : '') + '>' + d +
      (hasDue ? '<i class="cal-dot"></i>' : '') + '</span>';
  }
  html += '</div>';
  el.innerHTML = html;

  el.querySelectorAll('[data-cal]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const delta = parseInt(btn.getAttribute('data-cal') || '0', 10);
      const next = new Date(year, month + delta, 1);
      calendarView = { year: next.getFullYear(), month: next.getMonth() };
      renderWidgets();
    });
  });
}

// ---------------- 天气组件 ----------------
function renderWeatherWidget(el: HTMLElement): void {
  el.innerHTML =
    '<div class="widget-header"><span class="widget-title">🌤️ 天气</span>' +
    '<button class="cal-nav" id="weather-refresh" title="刷新">↻</button></div>' +
    '<div class="weather-body"><span id="widget-weather-icon" class="widget-weather-icon"></span>' +
    '<span id="widget-weather-info" class="widget-weather-info"></span></div>';
  el.querySelector('#weather-refresh')?.addEventListener('click', () => {
    renderWeatherLoading();
    void refreshWeather();
  });
  if (!(state.settings.weatherCity || '').trim() && state.settings.weatherAutoTried) {
    renderWeatherError();
  } else {
    renderWeatherLoading();
    void refreshWeather();
  }
}

// ---------------- 倒数日组件 ----------------
function renderCountdownWidget(el: HTMLElement): void {
  // 摸鱼倒计时：下一个 18:00（周五则到周日 18:00 前？经典版是到周五 18:00）
  const now = new Date();
  const day = now.getDay(); // 0 周日
  let target = new Date(now);
  target.setHours(18, 0, 0, 0);
  if (day === 5 && now.getHours() >= 18) {
    // 周五晚已过 → 下周五
    target.setDate(target.getDate() + 7);
  } else if (day === 6) {
    target.setDate(target.getDate() + 6); // 周六 → 下周五
  } else if (day === 0) {
    target.setDate(target.getDate() + 5); // 周日 → 下周五
  } else if (day === 5) {
    // 周五 18 点前 → 今天 18 点
  } else if (now.getHours() >= 18) {
    target.setDate(target.getDate() + 1); // 已过今天 18 点 → 明天
    if (target.getDay() === 5) {
      /* 明天就是周五 */
    } else if (target.getDay() === 6) {
      target.setDate(target.getDate() + 6);
    } else if (target.getDay() === 0) {
      target.setDate(target.getDate() + 5);
    }
  }
  const diffMs = target.getTime() - now.getTime();
  const h = Math.floor(diffMs / 3600000);
  const m = Math.floor((diffMs % 3600000) / 60000);
  const s = Math.floor((diffMs % 60000) / 1000);

  let html =
    '<div class="widget-header"><span class="widget-title">⏳ 倒数日</span></div>' +
    '<div class="countdown-work">摸鱼倒计时 <b>' + h + ':' + String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0') + '</b></div>';

  // 用户自定义倒数
  state.countdowns.forEach((c) => {
    const diff = daysFromToday(c.date);
    const label = diff >= 0 ? '还有 ' + diff + ' 天' : '已过 ' + -diff + ' 天';
    html +=
      '<div class="countdown-item" title="' + c.date + '">' +
      '<span class="countdown-name">' + c.name + '</span>' +
      '<span class="countdown-days ' + (diff < 0 ? 'overdue' : '') + '">' + label + '</span>' +
      '<button class="countdown-del" data-cid="' + c.id + '">×</button>' +
      '</div>';
  });
  html +=
    '<div class="countdown-add">' +
    '<input type="date" id="cd-date" class="cd-date"><input type="text" id="cd-name" class="cd-name" placeholder="事件名称" maxlength="20">' +
    '<button id="cd-add" class="cd-add">＋</button></div>';

  el.innerHTML = html;

  el.querySelector('#cd-add')?.addEventListener('click', addCountdown);
  (el.querySelector('#cd-name') as HTMLInputElement | null)?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') addCountdown();
  });
  el.querySelectorAll('.countdown-del').forEach((btn) => {
    btn.addEventListener('click', () => {
      const cid = btn.getAttribute('data-cid') || '';
      state.countdowns = state.countdowns.filter((c) => c.id !== cid);
      commit();
    });
  });
}

function addCountdown(): void {
  const date = ($('#cd-date') as HTMLInputElement | null)?.value || '';
  const name = ($('#cd-name') as HTMLInputElement | null)?.value.trim() || '';
  if (!date || !name) {
    toast('请填写倒数日名称和日期', 'error');
    return;
  }
  state.countdowns.push({ id: uid('c'), name, date });
  commit();
  toast('已添加倒数日：' + name, 'success', 1500);
}

// ---------------- 便签组件 ----------------
const notesDebouncedSave = debounce(() => {
  const ta = $('#notes-text') as HTMLTextAreaElement | null;
  if (ta) {
    state.notes = ta.value.slice(0, 20000);
    commit();
  }
}, 600);

function renderNotesWidget(el: HTMLElement): void {
  el.innerHTML =
    '<div class="widget-header"><span class="widget-title">📝 便签</span></div>' +
    '<textarea id="notes-text" class="notes-text" placeholder="随手记点什么…" maxlength="20000">' +
    escapeHtml(state.notes) +
    '</textarea>';
  const ta = el.querySelector('#notes-text') as HTMLTextAreaElement | null;
  ta?.addEventListener('input', notesDebouncedSave);
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// ---------------- 组件设置 ----
export function renderWidgetSettings(): void {
  const box = $('#widget-settings');
  if (!box) return;
  box.innerHTML = '';
  WIDGETS.forEach((w) => {
    const row = document.createElement('div');
    row.className = 'widget-setting-row';
    const label = document.createElement('span');
    label.textContent = w.icon + ' ' + w.name;
    const toggle = document.createElement('input');
    toggle.type = 'checkbox';
    toggle.className = 'toggle';
    toggle.checked = !!state.settings.widgets[w.id];
    toggle.addEventListener('change', () => {
      state.settings.widgets[w.id] = toggle.checked;
      commit();
    });
    row.append(label, toggle);
    box.appendChild(row);
  });
}

// 组件被移除（重新渲染）时清理定时器
function observeRemoval(el: HTMLElement, timer: number): void {
  const observer = new MutationObserver(() => {
    if (!el.isConnected) {
      window.clearInterval(timer);
      observer.disconnect();
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });
}

// 初始化：注册渲染 + 定时刷新天气
export function initWidgets(): void {
  onRender(() => {
    renderWidgets();
    renderWidgetSettings();
  });
  // 每 30 分钟刷新天气
  window.setInterval(() => {
    if (state.settings.widgets.weather) void refreshWeather();
  }, 30 * 60 * 1000);
}
