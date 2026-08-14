// ============================================================
//  Tab - 个人浏览器首页（重构版）
//  纯原生 JS，零依赖，数据全部保存在 localStorage
// ============================================================

'use strict';

// ---------------- 存储工具 ----------------
const store = {
    get(key, fallback) {
        try {
            const raw = localStorage.getItem(key);
            return raw === null ? fallback : JSON.parse(raw);
        } catch (e) {
            return fallback;
        }
    },
    set(key, value) {
        localStorage.setItem(key, JSON.stringify(value));
    },
    remove(key) {
        localStorage.removeItem(key);
    }
};

// ---------------- 默认数据 ----------------
const DEFAULT_BOOKMARKS = [
    { id: 'b1', name: 'Google',    url: 'https://www.google.com',       icon: '' },
    { id: 'b2', name: 'Gmail',     url: 'https://mail.google.com',      icon: '📧' },
    { id: 'b3', name: 'YouTube',   url: 'https://www.youtube.com',      icon: '🎬' },
    { id: 'b4', name: 'GitHub',    url: 'https://github.com',           icon: '' },
    { id: 'b5', name: '知乎',      url: 'https://www.zhihu.com',        icon: '' },
    { id: 'b6', name: '微博',      url: 'https://weibo.com',            icon: '' },
    { id: 'b7', name: 'Bilibili',  url: 'https://www.bilibili.com',     icon: '📺' },
    { id: 'b8', name: '天气',      url: 'https://weather.com/zh-CN/weather/today/l/CHXX0008:1:CH', icon: '🌤️' }
];

const DEFAULT_ENGINES = [
    { id: 'e1', name: 'Google',     url: 'https://www.google.com/search', query: 'q',  default: true },
    { id: 'e2', name: 'Bing',       url: 'https://www.bing.com/search',   query: 'q',  default: false },
    { id: 'e3', name: '百度',      url: 'https://www.baidu.com/s',        query: 'wd', default: false },
    { id: 'e4', name: 'DuckDuckGo', url: 'https://duckduckgo.com/',       query: 'q',  default: false }
];

const DEFAULT_SETTINGS = {
    theme: 'auto',              // auto | dark | light
    backgroundImage: '',
    weatherCity: '',            // 用户设置的城市
    weatherAutoTried: false,    // 是否已尝试过自动定位
    searchEngineId: ''
};

// ---------------- 全局状态 ----------------
const state = {
    bookmarks: store.get('tab.bookmarks', DEFAULT_BOOKMARKS),
    engines: store.get('tab.engines', DEFAULT_ENGINES),
    todos: store.get('tab.todos', []),
    settings: Object.assign({}, DEFAULT_SETTINGS, store.get('tab.settings', {})),
    searchHistory: store.get('tab.searchHistory', []),
    todoFilter: 'all',
    weatherTimer: null
};

// ---------------- 存储方法 ----------------
function saveBookmarks() { store.set('tab.bookmarks', state.bookmarks); renderBookmarks(); }
function saveEngines()   { store.set('tab.engines', state.engines); }
function saveTodos()     { store.set('tab.todos', state.todos); renderTodos(); }
function saveSettings()  { store.set('tab.settings', state.settings); }

// ---------------- DOM 工具 ----------------
function $(sel) { return document.querySelector(sel); }
function $$(sel) { return Array.from(document.querySelectorAll(sel)); }
function uid() { return 'id-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8); }

// ============================================================
//  主题
// ============================================================
function applyTheme() {
    const root = document.documentElement;
    const t = state.settings.theme;
    root.classList.remove('light-theme', 'dark-theme');
    if (t === 'light') {
        root.classList.add('light-theme');
    } else if (t === 'dark') {
        root.classList.add('dark-theme');
    }
    // auto：不加类，由 CSS media query 决定
    const light = t === 'light' || (t === 'auto' && window.matchMedia('(prefers-color-scheme: light)').matches);
    $('#theme-toggle').textContent = light ? '☀️' : '🌙';
    $('#theme-toggle').title = light ? '切换到深色模式' : '切换到浅色模式';
}

function toggleTheme() {
    // 手动切换在 深/浅 之间，并覆盖 auto
    const isLight = document.documentElement.classList.contains('light-theme');
    state.settings.theme = isLight ? 'dark' : 'light';
    saveSettings();
    applyTheme();
}

// ============================================================
//  时钟与问候
// ============================================================
function updateClock() {
    const now = new Date();
    const hh = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    const ss = String(now.getSeconds()).padStart(2, '0');
    $('#current-time').textContent = hh + ':' + mm + ':' + ss;

    const h = now.getHours();
    let greet = '晚上好';
    if (h >= 5 && h < 12) greet = '早上好';
    else if (h >= 12 && h < 18) greet = '下午好';
    $('#welcome-message').textContent = greet + '！';
}

// ============================================================
//  搜索引擎（自定义管理）
// ============================================================
function renderEngineSelector() {
    const sel = $('#engine-selector');
    const saved = state.settings.searchEngineId;
    const hasSaved = state.engines.some(e => e.id === saved);
    const current = hasSaved ? saved : (state.engines.find(e => e.default) || state.engines[0] || {}).id;
    sel.innerHTML = '';
    state.engines.forEach(engine => {
        const opt = document.createElement('option');
        opt.value = engine.id;
        opt.textContent = engine.name;
        sel.appendChild(opt);
    });
    sel.value = current;
    state.settings.searchEngineId = current;
    saveSettings();
}

function renderEngineList() {
    const list = $('#engine-list');
    list.innerHTML = '';
    state.engines.forEach((engine, idx) => {
        const li = document.createElement('li');
        li.className = 'engine-item';

        const name = document.createElement('span');
        name.className = 'engine-name';
        name.textContent = engine.name;

        const url = document.createElement('span');
        url.className = 'engine-url';
        url.title = engine.url;
        url.textContent = engine.url;

        const actions = document.createElement('div');
        actions.className = 'engine-actions';
        if (idx === 0) {
            const tag = document.createElement('span');
            tag.className = 'engine-default';
            tag.textContent = '默认';
            li.appendChild(tag);
        }
        const setBtn = document.createElement('button');
        setBtn.textContent = '设为默认';
        setBtn.className = 'engine-set';
        setBtn.title = '将该引擎设为默认（移到第一位）';
        setBtn.onclick = () => {
            const [item] = state.engines.splice(idx, 1);
            state.engines.unshift(item);
            state.engines.forEach((e, i) => { e.default = i === 0; });
            saveEngines();
            renderEngineList();
            renderEngineSelector();
        };
        const editBtn = document.createElement('button');
        editBtn.textContent = '编辑';
        editBtn.className = 'engine-edit';
        editBtn.onclick = () => fillEngineForm(engine.id);
        const delBtn = document.createElement('button');
        delBtn.textContent = '删除';
        delBtn.className = 'engine-del';
        delBtn.onclick = () => {
            if (state.engines.length <= 1) { alert('至少保留一个搜索引擎'); return; }
            if (!confirm('删除搜索引擎「' + engine.name + '」？')) return;
            state.engines = state.engines.filter(e => e.id !== engine.id);
            saveEngines();
            renderEngineList();
            renderEngineSelector();
        };
        actions.appendChild(setBtn);
        actions.appendChild(editBtn);
        actions.appendChild(delBtn);

        li.appendChild(name);
        li.appendChild(url);
        li.appendChild(actions);
        list.appendChild(li);
    });
}

function fillEngineForm(id) {
    const engine = state.engines.find(e => e.id === id);
    if (!engine) return;
    $('#engine-edit-id').value = engine.id;
    $('#engine-name').value = engine.name;
    $('#engine-url').value = engine.url;
    $('#engine-query').value = engine.query;
    $('#engine-save-btn').textContent = '保存修改';
    $('#engine-form-tip').textContent = '正在编辑：' + engine.name;
}

function resetEngines() {
    if (!confirm('恢复默认搜索引擎列表？当前自定义列表将被替换。')) return;
    state.engines = DEFAULT_ENGINES.map(e => Object.assign({}, e));
    saveEngines();
    renderEngineList();
    renderEngineSelector();
    $('#engine-edit-id').value = '';
    $('#engine-name').value = '';
    $('#engine-url').value = '';
    $('#engine-query').value = '';
    $('#engine-save-btn').textContent = '添加';
    $('#engine-form-tip').textContent = '';
}

// ============================================================
//  搜索与历史
// ============================================================
function performSearch(query) {
    query = (query || '').trim();
    if (!query) { $('#search-input').focus(); return; }

    const engine = state.engines.find(e => e.id === $('#engine-selector').value);
    const isUrl = /^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([\/\w .-]*)*\/?$/i.test(query);

    if (isUrl) {
        const fullUrl = /^https?:\/\//i.test(query) ? query : 'https://' + query;
        window.open(fullUrl, '_blank');
    } else if (engine) {
        saveSearchHistory(query);
        window.open(engine.url + (engine.url.includes('?') ? '&' : '?') + engine.query + '=' + encodeURIComponent(query), '_blank');
    }
}

function renderSearchHistory() {
    const box = $('#search-history');
    box.innerHTML = '';
    if (!state.searchHistory.length) { box.style.display = 'none'; return; }
    state.searchHistory.slice(0, 8).forEach(item => {
        const div = document.createElement('div');
        div.className = 'history-item';
        div.textContent = item;
        div.onclick = () => {
            $('#search-input').value = item;
            box.style.display = 'none';
            performSearch(item);
        };
        box.appendChild(div);
    });
    box.style.display = 'block';
}

function saveSearchHistory(query) {
    let h = state.searchHistory.filter(x => x !== query);
    h.unshift(query);
    state.searchHistory = h.slice(0, 50);
    store.set('tab.searchHistory', state.searchHistory);
}

function hideSearchHistory() {
    $('#search-history').style.display = 'none';
}

// ============================================================
//  书签（增删改 / 拖拽排序 / 图标）
// ============================================================
function normalizeUrl(url) {
    url = (url || '').trim();
    if (!url) return '';
    return /^https?:\/\//i.test(url) ? url : 'https://' + url;
}

function faviconFor(url) {
    try {
        const u = new URL(normalizeUrl(url));
        return 'https://www.google.com/s2/favicons?domain=' + u.hostname + '&sz=64';
    } catch (e) {
        return null;
    }
}

function renderBookmarks() {
    const container = $('#bookmark-cards');
    container.innerHTML = '';
    $('#bookmark-empty').classList.toggle('hidden', state.bookmarks.length > 0);

    state.bookmarks.forEach(bookmark => {
        const card = document.createElement('a');
        card.href = normalizeUrl(bookmark.url);
        card.target = '_blank';
        card.rel = 'noopener';
        card.className = 'card';
        card.dataset.id = bookmark.id;
        card.draggable = true;

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
            img.onerror = () => { icon.textContent = (bookmark.name || '?').charAt(0); };
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
        editBtn.onclick = (e) => { e.preventDefault(); e.stopPropagation(); openBookmarkModal(bookmark.id); };
        const delBtn = document.createElement('button');
        delBtn.className = 'card-del-btn';
        delBtn.textContent = '🗑';
        delBtn.title = '删除';
        delBtn.onclick = (e) => {
            e.preventDefault(); e.stopPropagation();
            if (!confirm('删除书签「' + bookmark.name + '」？')) return;
            state.bookmarks = state.bookmarks.filter(b => b.id !== bookmark.id);
            saveBookmarks();
        };
        actions.appendChild(editBtn);
        actions.appendChild(delBtn);

        card.appendChild(icon);
        card.appendChild(name);
        card.appendChild(actions);
        container.appendChild(card);
    });

    bindBookmarkDrag(container);
}

// 拖拽排序
function bindBookmarkDrag(container) {
    let dragId = null;

    container.querySelectorAll('.card').forEach(card => {
        card.addEventListener('dragstart', (e) => {
            dragId = card.dataset.id;
            card.classList.add('dragging');
            e.dataTransfer.effectAllowed = 'move';
            try { e.dataTransfer.setData('text/plain', dragId); } catch (err) {}
        });
        card.addEventListener('dragend', () => {
            card.classList.remove('dragging');
            dragId = null;
            container.querySelectorAll('.card').forEach(c => c.classList.remove('drag-over'));
            commitDragOrder(container);
        });
        card.addEventListener('dragover', (e) => {
            e.preventDefault();
            if (!dragId || dragId === card.dataset.id) return;
            e.dataTransfer.dropEffect = 'move';
            const dragged = container.querySelector('.dragging');
            if (!dragged) return;
            container.querySelectorAll('.card').forEach(c => c.classList.remove('drag-over'));
            const rect = card.getBoundingClientRect();
            const after = (e.clientY - rect.top) > rect.height / 2;
            card.classList.add('drag-over');
            if (after) {
                container.insertBefore(dragged, card.nextSibling);
            } else {
                container.insertBefore(dragged, card);
            }
        });
        card.addEventListener('drop', (e) => e.preventDefault());
    });

    function commitDragOrder(container) {
        const ids = Array.from(container.querySelectorAll('.card')).map(c => c.dataset.id);
        const map = new Map(state.bookmarks.map(b => [b.id, b]));
        const reordered = ids.map(id => map.get(id)).filter(Boolean);
        if (reordered.length === state.bookmarks.length &&
            reordered.some((b, i) => b.id !== state.bookmarks[i].id)) {
            state.bookmarks = reordered;
            store.set('tab.bookmarks', state.bookmarks);
            renderBookmarks();
        }
    }
}

function openBookmarkModal(id) {
    const form = $('#bookmark-form');
    form.reset();
    $('#bookmark-edit-id').value = '';
    if (id) {
        const bm = state.bookmarks.find(b => b.id === id);
        if (!bm) return;
        $('#bookmark-modal-title').textContent = '编辑书签';
        $('#bookmark-edit-id').value = id;
        $('#bookmark-name').value = bm.name;
        $('#bookmark-url').value = bm.url;
        $('#bookmark-icon').value = bm.icon || '';
    } else {
        $('#bookmark-modal-title').textContent = '添加书签';
    }
    openModal('bookmark-modal');
    setTimeout(() => $('#bookmark-name').focus(), 50);
}

function saveBookmarkFromForm() {
    const id = $('#bookmark-edit-id').value;
    const name = $('#bookmark-name').value.trim();
    const url = normalizeUrl($('#bookmark-url').value);
    const icon = $('#bookmark-icon').value.trim();
    if (!name || !url) return;

    if (id) {
        const bm = state.bookmarks.find(b => b.id === id);
        if (bm) Object.assign(bm, { name, url, icon });
    } else {
        state.bookmarks.push({ id: uid(), name, url, icon });
    }
    saveBookmarks();
    closeModal('bookmark-modal');
}

// ============================================================
//  待办（增删改 / 优先级 / 截止日期 / 过滤）
// ============================================================
const PRIORITY_LABEL = { high: '高', medium: '中', low: '低' };

function dateStr(d) {
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}
function todayStr() { return dateStr(new Date()); }

function renderTodos() {
    const list = $('#todo-list');
    list.innerHTML = '';
    const filter = state.todoFilter;

    const visible = state.todos.filter(t =>
        filter === 'all' ? true : filter === 'completed' ? t.completed : !t.completed
    );

    $('#todo-empty').classList.toggle('hidden', visible.length > 0);
    $('#clear-completed-btn').classList.toggle('hidden', !state.todos.some(t => t.completed));

    visible.forEach(todo => {
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
            saveTodos();
        });

        const main = document.createElement('div');
        main.className = 'todo-main';
        const text = document.createElement('span');
        text.className = 'todo-text';
        text.textContent = todo.text;
        main.appendChild(text);

        // 副信息行：优先级 / 截止日期
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
            const diff = Math.round((new Date(todo.due + 'T00:00:00') - new Date(todayStr() + 'T00:00:00')) / 86400000);
            if (diff < 0) {
                due.classList.add('overdue');
                due.textContent = '⏰ 已逾期 ' + (-diff) + ' 天';
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
        editBtn.addEventListener('click', (e) => { e.stopPropagation(); openTodoModal(todo.id); });
        const delBtn = document.createElement('button');
        delBtn.className = 'todo-action-btn danger';
        delBtn.textContent = '🗑';
        delBtn.title = '删除';
        delBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (!confirm('删除这条待办？')) return;
            state.todos = state.todos.filter(t => t.id !== todo.id);
            saveTodos();
        });
        actions.appendChild(editBtn);
        actions.appendChild(delBtn);

        li.appendChild(checkbox);
        li.appendChild(main);
        li.appendChild(actions);

        li.addEventListener('click', () => openTodoModal(todo.id));
        list.appendChild(li);
    });
}

function addTodoFromQuickInput() {
    const input = $('#todo-input');
    const text = input.value.trim();
    if (!text) return;
    state.todos.push({ id: uid(), text, completed: false, priority: 'medium', due: '', createdAt: Date.now() });
    input.value = '';
    saveTodos();
}

function openTodoModal(id) {
    const todo = state.todos.find(t => t.id === id);
    if (!todo) return;
    $('#todo-edit-id').value = id;
    $('#todo-edit-text').value = todo.text;
    $('#todo-edit-priority').value = todo.priority || 'medium';
    $('#todo-edit-due').value = todo.due || '';
    openModal('todo-modal');
    setTimeout(() => $('#todo-edit-text').focus(), 50);
}

function saveTodoFromForm() {
    const id = $('#todo-edit-id').value;
    const todo = state.todos.find(t => t.id === id);
    if (!todo) return;
    todo.text = $('#todo-edit-text').value.trim();
    todo.priority = $('#todo-edit-priority').value;
    todo.due = $('#todo-edit-due').value;
    if (!todo.text) return;
    saveTodos();
    closeModal('todo-modal');
}

function clearCompleted() {
    const count = state.todos.filter(t => t.completed).length;
    if (!count) return;
    if (!confirm('清除 ' + count + ' 条已完成待办？')) return;
    state.todos = state.todos.filter(t => !t.completed);
    saveTodos();
}

// ============================================================
//  天气（Open-Meteo 免费 API）
// ============================================================
const GEO_API = 'https://geocoding-api.open-meteo.com/v1/search';
const WX_API  = 'https://api.open-meteo.com/v1/forecast';

const WMO = {
    0:  ['☀️', '晴'],
    1:  ['🌤️', '晴间多云'],
    2:  ['⛅', '局部多云'],
    3:  ['☁️', '阴'],
    45: ['🌫️', '雾'],
    48: ['🌫️', '雾凇'],
    51: ['🌦️', '毛毛雨'],
    53: ['🌦️', '毛毛雨'],
    55: ['🌦️', '毛毛雨'],
    56: ['🌧️', '冻毛毛雨'],
    57: ['🌧️', '冻毛毛雨'],
    61: ['🌧️', '小雨'],
    63: ['🌧️', '中雨'],
    65: ['🌧️', '大雨'],
    66: ['🌧️', '冻雨'],
    67: ['🌧️', '冻雨'],
    71: ['❄️', '小雪'],
    73: ['❄️', '中雪'],
    75: ['❄️', '大雪'],
    77: ['❄️', '雪粒'],
    80: ['🌦️', '阵雨'],
    81: ['🌦️', '阵雨'],
    82: ['⛈️', '强阵雨'],
    85: ['🌨️', '阵雪'],
    86: ['🌨️', '阵雪'],
    95: ['⛈️', '雷阵雨'],
    96: ['⛈️', '雷阵雨伴冰雹'],
    99: ['⛈️', '雷阵雨伴冰雹']
};

function wmoInfo(code) {
    const hit = WMO[code];
    return hit || ['🌡️', '未知'];
}

function showWeatherLoading() {
    const w = $('#weather-widget');
    w.classList.remove('hidden');
    $('#weather-icon').textContent = '';
    $('#weather-info').innerHTML = '<span class="weather-loading">天气加载中…</span>';
}

function showWeatherError() {
    const w = $('#weather-widget');
    w.classList.remove('hidden');
    $('#weather-icon').textContent = '🌐';
    $('#weather-info').innerHTML = '<span class="weather-loading">点击设置城市</span>';
}

function renderWeather(data) {
    const [icon, label] = wmoInfo(data.current.weather_code);
    const temp = Math.round(data.current.temperature_2m);
    const humidity = data.current.relative_humidity_2m;
    $('#weather-icon').textContent = icon;
    $('#weather-info').innerHTML =
        '<span class="weather-temp">' + temp + '°C · ' + label + '</span>' +
        '<span class="weather-meta">' + data.cityName + ' · 湿度 ' + humidity + '%</span>';
}

async function fetchWeatherFor(city) {
    const geoRes = await fetch(GEO_API + '?name=' + encodeURIComponent(city) + '&count=1&language=zh&format=json');
    if (!geoRes.ok) throw new Error('geo failed');
    const geo = await geoRes.json();
    if (!geo.results || !geo.results.length) throw new Error('city not found');
    const loc = geo.results[0];

    const wxRes = await fetch(WX_API + '?latitude=' + loc.latitude + '&longitude=' + loc.longitude +
        '&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m' +
        '&timezone=auto');
    if (!wxRes.ok) throw new Error('wx failed');
    const wx = await wxRes.json();
    return {
        cityName: (loc.name || city) + (loc.country_code ? ', ' + loc.country_code : ''),
        current: wx.current
    };
}

async function refreshWeather() {
    const city = (state.settings.weatherCity || '').trim();
    if (!city) {
        // 没有配置城市：尝试自动定位一次
        if (!state.settings.weatherAutoTried) {
            state.settings.weatherAutoTried = true;
            saveSettings();
            tryAutoLocate();
        } else {
            showWeatherError();
        }
        return;
    }
    showWeatherLoading();
    try {
        const data = await fetchWeatherFor(city);
        renderWeather(data);
    } catch (e) {
        console.warn('天气获取失败:', e);
        showWeatherError();
    }
}

function tryAutoLocate() {
    showWeatherLoading();
    if (!navigator.geolocation) { showWeatherError(); return; }
    navigator.geolocation.getCurrentPosition(
        async (pos) => {
            try {
                const res = await fetch(GEO_API + '?latitude=' + pos.coords.latitude + '&longitude=' + pos.coords.longitude + '&count=1&language=zh&format=json');
                const geo = await res.json();
                const city = geo.results && geo.results[0] ? geo.results[0].name : '';
                if (city) {
                    state.settings.weatherCity = city;
                    saveSettings();
                    $('#weather-city').value = city;
                }
                const data = await fetchWeatherFor(city || pos.coords.latitude + ',' + pos.coords.longitude);
                renderWeather(data);
            } catch (e) {
                showWeatherError();
            }
        },
        () => showWeatherError(),
        { timeout: 8000, maximumAge: 600000 }
    );
}

function saveWeatherCity() {
    const city = $('#weather-city').value.trim();
    state.settings.weatherCity = city;
    saveSettings();
    refreshWeather();
    alert('已保存城市：' + (city || '（将尝试自动定位）'));
}

// ============================================================
//  背景壁纸
// ============================================================
function applyBackground(src) {
    const body = document.body;
    if (src) {
        body.style.backgroundImage = "url('" + src + "')";
        body.classList.add('has-bg');
    } else {
        body.style.backgroundImage = '';
        body.classList.remove('has-bg');
    }
    state.settings.backgroundImage = src;
    saveSettings();
}

function loadBackground() {
    applyBackground(state.settings.backgroundImage || '');
}

// ============================================================
//  数据导入 / 导出 / 重置
// ============================================================
function exportData() {
    const payload = {
        app: 'tab-homepage',
        version: 1,
        exportedAt: new Date().toISOString(),
        bookmarks: state.bookmarks,
        engines: state.engines,
        todos: state.todos,
        settings: state.settings,
        searchHistory: state.searchHistory
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    const d = new Date();
    a.href = URL.createObjectURL(blob);
    a.download = 'tab-backup-' + d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0') + '.json';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
        URL.revokeObjectURL(a.href);
        a.remove();
    }, 500);
    alert('数据已导出为 JSON 文件');
}

function importData(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const data = JSON.parse(e.target.result);
            if (!data || typeof data !== 'object') throw new Error('bad');
            if (!confirm('导入将覆盖当前全部数据，确定继续？')) return;
            if (Array.isArray(data.bookmarks)) {
                state.bookmarks = data.bookmarks.map(b => ({
                    id: b.id || uid(), name: b.name || '未命名', url: b.url || '', icon: b.icon || ''
                }));
            }
            if (Array.isArray(data.engines) && data.engines.length) {
                state.engines = data.engines.map(eng => ({
                    id: eng.id || uid(), name: eng.name || '引擎', url: eng.url || '', query: eng.query || 'q', default: false
                }));
                state.engines[0].default = true;
            }
            if (Array.isArray(data.todos)) {
                state.todos = data.todos.map(t => ({
                    id: t.id || uid(), text: t.text || '', completed: !!t.completed,
                    priority: t.priority || 'medium', due: t.due || '', createdAt: t.createdAt || Date.now()
                }));
            }
            if (data.settings && typeof data.settings === 'object') {
                Object.assign(state.settings, data.settings);
            }
            if (Array.isArray(data.searchHistory)) state.searchHistory = data.searchHistory.slice(0, 50);
            persistAll();
            alert('导入成功！');
        } catch (err) {
            alert('导入失败：文件格式不正确');
        }
    };
    reader.readAsText(file);
}

function persistAll() {
    store.set('tab.bookmarks', state.bookmarks);
    store.set('tab.engines', state.engines);
    store.set('tab.todos', state.todos);
    store.set('tab.settings', state.settings);
    store.set('tab.searchHistory', state.searchHistory);
    loadBackground();
    applyTheme();
    renderEngineSelector();
    renderEngineList();
    renderBookmarks();
    renderTodos();
    renderSearchHistory();
}

function resetAll() {
    if (!confirm('确定重置全部数据？书签、待办、设置、搜索历史都会被清空。')) return;
    if (!confirm('再次确认：此操作不可恢复。')) return;
    ['tab.bookmarks', 'tab.engines', 'tab.todos', 'tab.settings', 'tab.searchHistory'].forEach(k => store.remove(k));
    location.reload();
}

// ============================================================
//  模态框
// ============================================================
function openModal(id) { $('#' + id).classList.add('open'); }
function closeModal(id) { $('#' + id).classList.remove('open'); }
function closeAllModals() { $$('.modal.open').forEach(m => m.classList.remove('open')); }

// ============================================================
//  快捷键
// ============================================================
function focusSearch() {
    hideSearchHistory();
    const input = $('#search-input');
    input.focus();
    input.select();
}
function focusTodoInput() { $('#todo-input').focus(); }

function handleShortcuts(e) {
    const t = e.target;
    const typing = t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT');

    if (e.key === 'Escape') { closeAllModals(); hideSearchHistory(); return; }

    const mod = e.ctrlKey || e.metaKey;
    if (mod && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        if (typing && t.id === 'search-input') return;
        focusSearch();
        return;
    }
    if (typing) return;

    if (e.key === '/') { e.preventDefault(); focusSearch(); }
    else if (e.key === 't' || e.key === 'T') { e.preventDefault(); focusTodoInput(); }
    else if (e.key === 'n' || e.key === 'N') { e.preventDefault(); openBookmarkModal(); }
    else if (e.key === '?') { e.preventDefault(); openModal('help-modal'); }
}

// ============================================================
//  设置弹窗 Tabs
// ============================================================
function switchTab(tab) {
    $$('#settings-tabs .tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
    $$('.tab-panel').forEach(p => p.classList.toggle('active', p.id === 'tab-' + tab));
}

function openSettings(tab) {
    switchTab(tab || 'engines');
    renderEngineList();
    $('#settings-theme').value = state.settings.theme;
    $('#bg-url').value = '';
    $('#weather-city').value = state.settings.weatherCity || '';
    openModal('settings-modal');
}

// ============================================================
//  初始化
// ============================================================
function initEvents() {
    // 顶栏
    $('#theme-toggle').addEventListener('click', toggleTheme);
    $('#settings-btn').addEventListener('click', () => openSettings());

    // 搜索
    $('#search-form').addEventListener('submit', (e) => {
        e.preventDefault();
        hideSearchHistory();
        performSearch($('#search-input').value);
    });
    $('#search-input').addEventListener('focus', renderSearchHistory);
    $('#search-input').addEventListener('input', () => {
        if ($('#search-input').value.trim()) renderSearchHistory();
    });
    $('#engine-selector').addEventListener('change', () => {
        state.settings.searchEngineId = $('#engine-selector').value;
        saveSettings();
    });
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.search-form')) hideSearchHistory();
    });

    // 待办
    $('#add-todo-btn').addEventListener('click', addTodoFromQuickInput);
    $('#todo-input').addEventListener('keydown', (e) => { if (e.key === 'Enter') addTodoFromQuickInput(); });
    $('#todo-filters').addEventListener('click', (e) => {
        const btn = e.target.closest('.filter-btn');
        if (!btn) return;
        state.todoFilter = btn.dataset.filter;
        $$('#todo-filters .filter-btn').forEach(b => b.classList.toggle('active', b === btn));
        renderTodos();
    });
    $('#clear-completed-btn').addEventListener('click', clearCompleted);
    $('#todo-form').addEventListener('submit', (e) => { e.preventDefault(); saveTodoFromForm(); });
    $('#todo-delete-btn').addEventListener('click', () => {
        const id = $('#todo-edit-id').value;
        if (!id) return;
        state.todos = state.todos.filter(t => t.id !== id);
        closeModal('todo-modal');
        saveTodos();
    });

    // 书签
    $('#add-bookmark-btn').addEventListener('click', () => openBookmarkModal());
    $('#bookmark-form').addEventListener('submit', (e) => { e.preventDefault(); saveBookmarkFromForm(); });

    // 天气组件点击 → 打开设置的外观页
    $('#weather-widget').addEventListener('click', () => openSettings('appearance'));
    $('#weather-widget').addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openSettings('appearance'); }
    });

    // 设置 Tabs
    $('#settings-tabs').addEventListener('click', (e) => {
        const btn = e.target.closest('.tab-btn');
        if (btn) switchTab(btn.dataset.tab);
    });

    // 设置-搜索引擎
    $('#engine-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const id = $('#engine-edit-id').value;
        const name = $('#engine-name').value.trim();
        const url = $('#engine-url').value.trim();
        const query = $('#engine-query').value.trim();
        if (!name || !url || !query) return;
        if (id) {
            const eng = state.engines.find(x => x.id === id);
            if (eng) Object.assign(eng, { name, url, query });
            $('#engine-edit-id').value = '';
            $('#engine-form-tip').textContent = '';
            $('#engine-save-btn').textContent = '添加';
        } else {
            state.engines.push({ id: uid(), name, url, query, default: false });
        }
        $('#engine-name').value = ''; $('#engine-url').value = ''; $('#engine-query').value = '';
        saveEngines();
        renderEngineList();
        renderEngineSelector();
    });
    $('#engine-reset-btn').addEventListener('click', resetEngines);

    // 设置-外观
    $('#settings-theme').addEventListener('change', (e) => {
        state.settings.theme = e.target.value;
        saveSettings();
        applyTheme();
    });
    $('#bg-url-btn').addEventListener('click', () => {
        const url = $('#bg-url').value.trim();
        if (url) { applyBackground(url); $('#bg-url').value = ''; }
        else alert('请输入图片 URL');
    });
    $('#bg-file').addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
            applyBackground(ev.target.result);
            e.target.value = '';
        };
        reader.readAsDataURL(file);
    });
    $('#bg-reset-btn').addEventListener('click', () => { applyBackground(''); });
    $('#weather-save-btn').addEventListener('click', saveWeatherCity);
    $('#weather-city').addEventListener('keydown', (e) => { if (e.key === 'Enter') saveWeatherCity(); });

    // 设置-数据
    $('#export-btn').addEventListener('click', exportData);
    $('#import-file').addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) importData(file);
        e.target.value = '';
    });
    $('#reset-btn').addEventListener('click', resetAll);

    // 模态框通用：关闭按钮 / 点击遮罩
    document.addEventListener('click', (e) => {
        const closer = e.target.closest('[data-close]');
        if (closer) closeModal(closer.dataset.close);
        if (e.target.classList.contains('modal')) closeModal(e.target.id);
    });

    // 快捷键
    document.addEventListener('keydown', handleShortcuts);
}

function init() {
    loadBackground();
    applyTheme();
    updateClock();
    setInterval(updateClock, 1000);

    renderEngineSelector();
    renderBookmarks();
    renderTodos();
    initEvents();

    // 天气：立即刷新 + 每 30 分钟刷新
    refreshWeather();
    state.weatherTimer = setInterval(refreshWeather, 30 * 60 * 1000);
}

document.addEventListener('DOMContentLoaded', init);
