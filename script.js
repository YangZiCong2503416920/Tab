// script.js

const bookmarks = [
    { name: "Google", url: "https://www.google.com", icon: "🌐" },
    { name: "Gmail", url: "https://mail.google.com", icon: "📧" },
    { name: "YouTube", url: "https://www.youtube.com", icon: "🎬" },
    { name: "GitHub", url: "https://github.com", icon: "💻" },
    { name: "知乎", url: "https://www.zhihu.com", icon: "📖" },
    { name: "微博", url: "https://weibo.com", icon: "📰" },
    { name: "Bilibili", url: "https://www.bilibili.com", icon: "📺" },
    { name: "天气", url: "https://weather.com/zh-CN/weather/today/l/CHXX0008:1:CH", icon: "🌤️" }
];

const searchEngines = {
    google: { name: "Google", url: "https://www.google.com/search", queryParam: "q" },
    bing: { name: "Bing", url: "https://www.bing.com/search", queryParam: "q" },
    baidu: { name: "百度", url: "https://www.baidu.com/s", queryParam: "wd" },
    duckduckgo: { name: "DuckDuckGo", url: "https://duckduckgo.com/", queryParam: "q" }
};

// --- 主题切换功能 ---
const THEME_KEY = 'userTheme';

function applyTheme(theme) {
    const root = document.documentElement;
    if (theme === 'light') {
        root.classList.add('light-theme');
        document.getElementById('theme-toggle').textContent = '☀️';
        document.getElementById('theme-toggle').setAttribute('title', '切换到深色模式');
    } else {
        root.classList.remove('light-theme');
        document.getElementById('theme-toggle').textContent = '🌙';
        document.getElementById('theme-toggle').setAttribute('title', '切换到浅色模式');
    }
    localStorage.setItem(THEME_KEY, theme);
}

function toggleTheme() {
    const currentTheme = document.documentElement.classList.contains('light-theme') ? 'light' : 'dark';
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    applyTheme(newTheme);
}

function loadSavedTheme() {
    const savedTheme = localStorage.getItem(THEME_KEY);
    const preferredTheme = savedTheme || (window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark');
    applyTheme(preferredTheme);
}

// --- 功能函数 ---
function updateTime() {
    const now = new Date();
    const hours = now.getHours().toString().padStart(2, '0');
    const minutes = now.getMinutes().toString().padStart(2, '0');
    const seconds = now.getSeconds().toString().padStart(2, '0');
    const timeString = `${hours}:${minutes}:${seconds}`;
    document.getElementById('current-time').textContent = timeString;

    let greeting = "你好";
    if (hours >= 5 && hours < 12) {
        greeting = "早上好";
    } else if (hours >= 12 && hours < 18) {
        greeting = "下午好";
    } else {
        greeting = "晚上好";
    }
    document.getElementById('welcome-message').textContent = `${greeting}！`;
}

function createCards() {
    const container = document.getElementById('bookmark-cards');
    container.innerHTML = '';
    bookmarks.forEach(bookmark => {
        const cardLink = document.createElement('a');
        cardLink.href = bookmark.url;
        cardLink.className = 'card';
        cardLink.target = "_blank";

        const iconSpan = document.createElement('span');
        iconSpan.className = 'card-icon';
        iconSpan.textContent = bookmark.icon;

        const nameSpan = document.createElement('span');
        nameSpan.className = 'card-name';
        nameSpan.textContent = bookmark.name;

        cardLink.appendChild(iconSpan);
        cardLink.appendChild(nameSpan);
        container.appendChild(cardLink);
    });
}

function setBackgroundImage(src) {
    document.body.style.backgroundImage = `url('${src}')`;
    localStorage.setItem('backgroundImage', src);
}

function loadSavedBackground() {
    const savedImage = localStorage.getItem('backgroundImage');
    if (savedImage) {
        setBackgroundImage(savedImage);
    }
}

// --- 搜索历史功能 ---
function loadSearchHistory() {
    const historyList = document.getElementById('search-history');
    const history = JSON.parse(localStorage.getItem('searchHistory')) || [];
    historyList.innerHTML = '';

    if (history.length > 0) {
        history.slice(-5).reverse().forEach(item => {
            const div = document.createElement('div');
            div.className = 'history-item';
            div.textContent = item;
            div.onclick = () => {
                document.querySelector('.search-input').value = item;
                historyList.style.display = 'none';
                performSearch(item);
            };
            historyList.appendChild(div);
        });
        historyList.style.display = 'block';
    } else {
        historyList.style.display = 'none';
    }
}

function saveSearchHistory(query) {
    if (!query.trim()) return;

    let history = JSON.parse(localStorage.getItem('searchHistory')) || [];
    history = history.filter(item => item !== query);
    history.unshift(query);
    if (history.length > 50) {
        history = history.slice(0, 50);
    }
    localStorage.setItem('searchHistory', JSON.stringify(history));
    loadSearchHistory();
}

function showSearchHistory() {
    const historyList = document.getElementById('search-history');
    const query = document.querySelector('.search-input').value.trim();

    if (query === '') {
        loadSearchHistory();
    } else {
        loadSearchHistory(); // 简化处理
    }
}

function performSearch(query) {
    const selectedEngineKey = document.getElementById('engine-selector').value;
    const selectedEngine = searchEngines[selectedEngineKey];

    if (!query) {
        alert("请输入搜索内容！");
        document.querySelector('.search-input').focus();
        return;
    }

    if (selectedEngine) {
        const searchUrl = `${selectedEngine.url}?${selectedEngine.queryParam}=${encodeURIComponent(query)}`;
        const isUrl = /^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/.test(query);

        if (isUrl) {
            const fullUrl = query.startsWith('http') ? query : `https://${query}`;
            window.location.href = fullUrl;
        } else {
            saveSearchHistory(query);
            window.open(searchUrl, '_blank');
        }
    } else {
        alert("未知的搜索引擎配置！");
    }
}

// --- 新增：待办事项功能 ---
const TODO_KEY = 'todoList';

/**
 * 从 localStorage 加载待办事项列表并渲染
 */
function loadAndRenderTodos() {
    const todos = JSON.parse(localStorage.getItem(TODO_KEY)) || [];
    const listElement = document.getElementById('todo-list');
    listElement.innerHTML = ''; // 清空现有列表

    todos.forEach((todo, index) => {
        const li = createTodoElement(todo.text, todo.completed, index);
        listElement.appendChild(li);
    });
}

/**
 * 创建一个待办事项的 DOM 元素
 * @param {string} text - 任务文本
 * @param {boolean} completed - 是否已完成
 * @param {number} index - 任务在数组中的索引
 * @returns {HTMLLIElement} - 创建的列表项元素
 */
function createTodoElement(text, completed, index) {
    const li = document.createElement('li');
    li.className = 'todo-item';

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.className = 'todo-checkbox';
    checkbox.checked = completed;
    checkbox.addEventListener('change', () => toggleTodo(index));

    const span = document.createElement('span');
    span.className = `todo-text ${completed ? 'completed' : ''}`;
    span.textContent = text;

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'delete-btn';
    deleteBtn.textContent = '×';
    deleteBtn.addEventListener('click', () => deleteTodo(index));

    li.appendChild(checkbox);
    li.appendChild(span);
    li.appendChild(deleteBtn);

    return li;
}

/**
 * 切换指定索引的待办事项的完成状态
 * @param {number} index - 任务索引
 */
function toggleTodo(index) {
    const todos = JSON.parse(localStorage.getItem(TODO_KEY)) || [];
    if (index >= 0 && index < todos.length) {
        todos[index].completed = !todos[index].completed;
        localStorage.setItem(TODO_KEY, JSON.stringify(todos));
        loadAndRenderTodos(); // 重新渲染列表
    }
}

/**
 * 删除指定索引的待办事项
 * @param {number} index - 任务索引
 */
function deleteTodo(index) {
    const todos = JSON.parse(localStorage.getItem(TODO_KEY)) || [];
    if (index >= 0 && index < todos.length) {
        todos.splice(index, 1); // 从数组中移除
        localStorage.setItem(TODO_KEY, JSON.stringify(todos));
        loadAndRenderTodos(); // 重新渲染列表
    }
}

/**
 * 添加一个新的待办事项
 */
function addTodo() {
    const inputElement = document.getElementById('todo-input');
    const text = inputElement.value.trim();
    if (!text) return; // 不添加空任务

    const todos = JSON.parse(localStorage.getItem(TODO_KEY)) || [];
    todos.push({ text, completed: false }); // 添加新任务
    localStorage.setItem(TODO_KEY, JSON.stringify(todos));
    inputElement.value = ''; // 清空输入框
    loadAndRenderTodos(); // 重新渲染列表
}

// --- 事件监听和初始化 ---
document.addEventListener('DOMContentLoaded', () => {
    loadSavedTheme();
    updateTime();
    setInterval(updateTime, 1000);
    createCards();
    loadSavedBackground();
    loadAndRenderTodos(); // 初始化待办事项列表

    // --- 设置按钮和模态框逻辑 ---
    const modal = document.getElementById('bg-modal');
    const btn = document.getElementById("settings-btn");
    const span = document.getElementsByClassName("close")[0];
    const bgInput = document.getElementById('bg-url');
    const bgFileInput = document.getElementById('bg-file');
    const setBgBtn = document.getElementById('set-bg-btn');

    btn.onclick = function() {
        modal.style.display = "block";
        bgInput.focus();
    }

    span.onclick = function() {
        modal.style.display = "none";
    }

    window.onclick = function(event) {
        if (event.target == modal) {
            modal.style.display = "none";
        }
    }

    bgFileInput.addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function(event) {
                const imageUrl = event.target.result;
                setBackgroundImage(imageUrl);
                modal.style.display = "none";
                bgInput.value = '';
                bgFileInput.value = '';
            };
            reader.readAsDataURL(file);
        }
    });

    setBgBtn.onclick = function() {
        const url = bgInput.value.trim();
        if (url) {
            setBackgroundImage(url);
            modal.style.display = "none";
            bgInput.value = '';
        } else {
            alert("请输入有效的图片URL或选择一个文件");
        }
    };

    // --- 主题切换按钮事件监听 ---
    document.getElementById('theme-toggle').addEventListener('click', toggleTheme);

    // --- 待办事项事件监听 ---
    document.getElementById('add-todo-btn').addEventListener('click', addTodo);
    document.getElementById('todo-input').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            addTodo();
        }
    });

    // --- 搜索框和搜索历史逻辑 ---
    const searchInput = document.querySelector('.search-input');
    const searchForm = document.getElementById('search-form');
    const searchHistoryElement = document.getElementById('search-history');

    function handleSearchSubmit(event) {
        event.preventDefault();
        const query = searchInput.value.trim();
        performSearch(query);
        searchHistoryElement.style.display = 'none';
    }

    searchForm.addEventListener('submit', handleSearchSubmit);
    searchInput.addEventListener('focus', showSearchHistory);

    searchHistoryElement.addEventListener('click', function(e) {
        if (e.target.classList.contains('history-item')) {
            this.style.display = 'none';
        } else if (e.target.id === 'search-history') {
            this.style.display = 'none';
        }
    });

    document.addEventListener('click', function(e) {
        const searchFormElement = document.querySelector('.search-form');
        if (!searchFormElement.contains(e.target)) {
            searchHistoryElement.style.display = 'none';
        }
    });
});