/**
 * ==========================================================================
 * FlowTodo - アプリケーションコアロジック (Vanilla JS)
 * ==========================================================================
 * スマホでの利用に特化したタスクおよび時間管理機能を提供します。
 * すべてのデータはlocalStorageに保存され、ページ遷移なしでスムーズに動作します。
 */

// --- 1. グローバルアプリケーション状態 (State) ---
let tasks = [];
let categories = [];
let activeTab = 'dashboard'; // 'dashboard', 'tasks', 'analytics'
let editTaskId = null; // 現在編集中のタスクID (新規作成時はnull)
let currentThemeColor = '#ff758c'; // 現在のテーマのアクセントカラー

// Chart.js のインスタンス保持用 (再描画時に古いグラフを破棄するため)
let completionChartInstance = null;
let categoryChartInstance = null;

// デフォルトのカテゴリ設定（カスタムカテゴリの初期値、ポップ＆キュートな配色）
const DEFAULT_CATEGORIES = [
  { id: 'work', name: '仕事', color: '#ff758c' },      // ピーチピンク
  { id: 'personal', name: 'プライベート', color: '#ffaa6b' }, // アプリコットオレンジ
  { id: 'shopping', name: '買い物', color: '#70d6ff' },   // ソーダブルー
  { id: 'health', name: '健康', color: '#06d6a0' },       // ミントグリーン
  { id: 'unclassified', name: '未分類', color: '#bda6ff' } // ラベンダーバイオレット
];

// --- 2. DOM要素の取得・キャッシュ ---
const elements = {
  currentDate: document.getElementById('current-date'),
  
  // ナビゲーション & タブ
  navItems: document.querySelectorAll('.nav-item'),
  tabs: document.querySelectorAll('.tab-content'),
  appMain: document.querySelector('.app-main'),
  
  // ダッシュボード要素
  dashboardWelcomeStatus: document.getElementById('dashboard-welcome-status'),
  statPendingCount: document.getElementById('stat-pending-count'),
  statCompletedCount: document.getElementById('stat-completed-count'),
  statTimeSummary: document.getElementById('stat-time-summary'),
  dashboardActiveList: document.getElementById('dashboard-active-list'),
  dashboardActiveBadge: document.getElementById('dashboard-active-badge'),
  
  // タスク画面要素
  taskSearchInput: document.getElementById('task-search-input'),
  searchClearBtn: document.getElementById('search-clear-btn'),
  filterCategorySelect: document.getElementById('filter-category-select'),
  filterPrioritySelect: document.getElementById('filter-priority-select'),
  activeTasksList: document.getElementById('active-tasks-list'),
  activeTasksBadge: document.getElementById('active-tasks-badge'),
  completedTasksList: document.getElementById('completed-tasks-list'),
  completedTasksBadge: document.getElementById('completed-tasks-badge'),
  toggleCompletedBtn: document.getElementById('toggle-completed-btn'),
  
  // アナリティクス要素
  categoryListSummary: document.getElementById('category-list-summary'),
  
  // ボタン
  fabAddTask: document.getElementById('fab-add-task'),
  addCategoryBtn: document.getElementById('add-category-btn'),
  
  // タスクモーダル要素
  taskModal: document.getElementById('task-modal'),
  taskModalClose: document.getElementById('task-modal-close'),
  taskModalCancel: document.getElementById('task-modal-cancel'),
  taskForm: document.getElementById('task-form'),
  modalTitle: document.getElementById('modal-title'),
  taskIdInput: document.getElementById('task-id'),
  taskTitleInput: document.getElementById('task-title'),
  taskCategorySelect: document.getElementById('task-category'),
  taskPrioritySelect: document.getElementById('task-priority'),
  taskDurationHours: document.getElementById('task-duration-hours'),
  taskDurationMinutes: document.getElementById('task-duration-minutes'),
  taskDueDateInput: document.getElementById('task-due-date'),
  taskNotesInput: document.getElementById('task-notes'),
  
  // カテゴリモーダル要素
  categoryModal: document.getElementById('category-modal'),
  categoryModalClose: document.getElementById('category-modal-close'),
  categoryForm: document.getElementById('category-form'),
  categoryNameInput: document.getElementById('category-name'),
  customCategoryList: document.getElementById('custom-category-list'),
  
  // テーマカスタマイザー要素
  themeMenuBtn: document.getElementById('theme-menu-btn'),
  themeModal: document.getElementById('theme-modal'),
  themeModalClose: document.getElementById('theme-modal-close'),
  themePresetBtns: document.querySelectorAll('.theme-preset-btn'),
  customThemeColor: document.getElementById('custom-theme-color'),
  customThemeVal: document.getElementById('custom-theme-val')
};

// --- 3. アプリ初期化処理 (Initialization) ---
document.addEventListener('DOMContentLoaded', () => {
  initApp();
});

/**
 * アプリの初期化とイベントリスナーの設定を行います。
 */
function initApp() {
  // 1. localStorage からデータを復元
  loadData();
  
  // 1.5. テーマカラーを適用
  initTheme();
  
  // 2. 日付表示を更新
  updateDateHeader();
  
  // 3. カテゴリプルダウンメニューの構築
  populateCategoryDropdowns();
  
  // 4. 初期描画処理 (ダッシュボード)
  renderAll();
  
  // 5. イベントハンドラーの登録
  registerEventListeners();
  
  // Lucideアイコンの描画
  if (window.lucide) {
    window.lucide.createIcons();
  }
}

/**
 * localStorageからタスクとカテゴリのデータを読み込みます。
 * データが存在しない場合はデフォルト値を適用します。
 */
function loadData() {
  const storedTasks = localStorage.getItem('flowtodo_tasks');
  const storedCategories = localStorage.getItem('flowtodo_categories');
  
  tasks = storedTasks ? JSON.parse(storedTasks) : [];
  categories = storedCategories ? JSON.parse(storedCategories) : [...DEFAULT_CATEGORIES];
}

/**
 * データをlocalStorageに書き込みます。
 */
function saveData() {
  localStorage.setItem('flowtodo_tasks', JSON.stringify(tasks));
  localStorage.setItem('flowtodo_categories', JSON.stringify(categories));
}

/**
 * 日本語形式で本日の日付をヘッダーに設定します。
 */
function updateDateHeader() {
  const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
  const today = new Date();
  elements.currentDate.textContent = today.toLocaleDateString('ja-JP', options);
}

// --- 4. カテゴリ操作関連 (Category Management) ---

/**
 * タスク作成フォームおよび検索フィルター内のカテゴリプルダウンメニューを動的に構築します。
 */
function populateCategoryDropdowns() {
  // 1. フィルター用プルダウン
  const filterSelect = elements.filterCategorySelect;
  filterSelect.innerHTML = '<option value="all">すべてのカテゴリ</option>';
  
  // 2. モーダルのタスク作成用プルダウン
  const taskSelect = elements.taskCategorySelect;
  taskSelect.innerHTML = '';

  categories.forEach(category => {
    // フィルターの追加
    const optFilter = document.createElement('option');
    optFilter.value = category.id;
    optFilter.textContent = category.name;
    filterSelect.appendChild(optFilter);

    // タスク入力用の追加
    const optTask = document.createElement('option');
    optTask.value = category.id;
    optTask.textContent = category.name;
    taskSelect.appendChild(optTask);
  });
}

/**
 * カテゴリ管理画面で、現在登録されているカテゴリ一覧を描画します。
 */
function renderCategoryList() {
  const listContainer = elements.customCategoryList;
  listContainer.innerHTML = '';

  categories.forEach(category => {
    const item = document.createElement('div');
    item.className = 'category-item';
    
    // 未分類カテゴリは削除不可にする
    const isUnclassified = category.id === 'unclassified';
    
    item.innerHTML = `
      <div class="category-info">
        <span class="category-dot" style="background-color: ${escapeHTML(category.color)};"></span>
        <span>${escapeHTML(category.name)}</span>
        ${isUnclassified ? '<span style="font-size: 10px; color: var(--text-muted);">(デフォルト)</span>' : ''}
      </div>
      ${!isUnclassified ? `
        <button class="task-action-btn btn-delete" onclick="handleDeleteCategory('${category.id}')" title="削除">
          <i data-lucide="trash-2" style="width: 14px; height: 14px;"></i>
        </button>
      ` : ''}
    `;
    listContainer.appendChild(item);
  });

  if (window.lucide) {
    window.lucide.createIcons();
  }
}

/**
 * 新規カテゴリを追加します。
 * @param {Event} e - フォーム送信イベント
 */
function handleAddCategory(e) {
  e.preventDefault();
  const name = elements.categoryNameInput.value.trim();
  const selectedColorInput = document.querySelector('input[name="category-color"]:checked');
  const color = selectedColorInput ? selectedColorInput.value : '#6b7280';

  if (!name) return;

  // 重複チェック (大文字小文字/全角半角を考慮)
  const isDuplicate = categories.some(cat => cat.name.toLowerCase() === name.toLowerCase());
  if (isDuplicate) {
    alert('同じ名前のカテゴリが既に存在します。');
    return;
  }

  // カテゴリオブジェクトの生成
  const newId = 'cat_' + Date.now();
  const newCategory = {
    id: newId,
    name: name,
    color: color
  };

  categories.push(newCategory);
  saveData();
  
  // プルダウンと一覧を更新
  populateCategoryDropdowns();
  renderCategoryList();
  
  // フォームリセット
  elements.categoryNameInput.value = '';
  
  // メイン画面の再描画 (カテゴリ名が追加されたため)
  renderAll();
}

/**
 * カテゴリを削除します。削除されたカテゴリに関連付けられていたタスクは「未分類」に移動します。
 * @param {string} categoryId - 削除対象カテゴリのID
 */
window.handleDeleteCategory = function(categoryId) {
  if (categoryId === 'unclassified') return;
  
  const targetCategory = categories.find(c => c.id === categoryId);
  if (!targetCategory) return;

  if (confirm(`カテゴリ「${targetCategory.name}」を削除しますか？\n※このカテゴリのタスクは「未分類」に変更されます。`)) {
    // 1. カテゴリを削除
    categories = categories.filter(c => c.id !== categoryId);
    
    // 2. 該当カテゴリに設定されていたタスクを「未分類」に再割り当て
    tasks = tasks.map(task => {
      if (task.categoryId === categoryId) {
        return { ...task, categoryId: 'unclassified' };
      }
      return task;
    });

    saveData();
    
    // 表示更新
    populateCategoryDropdowns();
    renderCategoryList();
    renderAll();
  }
};

// --- 5. タスク操作関連 (Task CRUD & Completion) ---

/**
 * タスク追加/編集モーダルを開きます。
 * @param {string|null} taskId - 編集するタスクのID。新規作成の場合は null
 */
function openTaskModal(taskId = null) {
  editTaskId = taskId;
  
  // カテゴリ一覧をプルダウンに最新化
  populateCategoryDropdowns();

  if (taskId) {
    // 編集モード
    elements.modalTitle.textContent = 'タスクを編集';
    const task = tasks.find(t => t.id === taskId);
    if (task) {
      elements.taskIdInput.value = task.id;
      elements.taskTitleInput.value = task.title;
      elements.taskCategorySelect.value = task.categoryId;
      elements.taskPrioritySelect.value = task.priority;
      
      // 見積もり時間の算出 (分から時間と分に分解)
      const hours = Math.floor(task.duration / 60);
      const minutes = task.duration % 60;
      elements.taskDurationHours.value = hours;
      elements.taskDurationMinutes.value = minutes;
      
      elements.taskDueDateInput.value = task.dueDate || '';
      elements.taskNotesInput.value = task.notes || '';
    }
  } else {
    // 新規作成モード
    elements.modalTitle.textContent = 'タスクを追加';
    elements.taskForm.reset();
    elements.taskIdInput.value = '';
    elements.taskCategorySelect.selectedIndex = 0;
    elements.taskPrioritySelect.value = 'medium';
    elements.taskDurationHours.value = 0;
    elements.taskDurationMinutes.value = 0;
    elements.taskDueDateInput.value = '';
    elements.taskNotesInput.value = '';
  }
  
  elements.taskModal.classList.add('active');
}

/**
 * タスクモーダルを閉じます。
 */
function closeTaskModal() {
  elements.taskModal.classList.remove('active');
  editTaskId = null;
}

/**
 * タスクフォームの送信処理 (作成または更新)
 * @param {Event} e - フォーム送信イベント
 */
function handleTaskSubmit(e) {
  e.preventDefault();
  
  const id = elements.taskIdInput.value;
  const title = elements.taskTitleInput.value.trim();
  const categoryId = elements.taskCategorySelect.value;
  const priority = elements.taskPrioritySelect.value;
  const hours = parseInt(elements.taskDurationHours.value) || 0;
  const minutes = parseInt(elements.taskDurationMinutes.value) || 0;
  const dueDate = elements.taskDueDateInput.value;
  const notes = elements.taskNotesInput.value.trim();

  if (!title) return;

  // 合計見積もり時間の算出 (単位: 分)
  const totalMinutes = (hours * 60) + minutes;

  if (id) {
    // 既存タスクの更新
    tasks = tasks.map(task => {
      if (task.id === id) {
        return {
          ...task,
          title,
          categoryId,
          priority,
          duration: totalMinutes,
          dueDate,
          notes
        };
      }
      return task;
    });
  } else {
    // 新規タスクの作成
    const newTask = {
      id: 'task_' + Date.now(),
      title,
      categoryId,
      priority,
      duration: totalMinutes,
      dueDate,
      notes,
      completed: false,
      completedDate: null,
      createdAt: new Date().toISOString()
    };
    tasks.push(newTask);
  }

  saveData();
  closeTaskModal();
  renderAll();
}

/**
 * タスクの完了ステータスを切り替えます (一ボタン完了切り替え)。
 * @param {string} taskId - 対象タスクのID
 */
window.toggleTaskComplete = function(taskId) {
  tasks = tasks.map(task => {
    if (task.id === taskId) {
      const isCompleted = !task.completed;
      return {
        ...task,
        completed: isCompleted,
        completedDate: isCompleted ? new Date().toISOString() : null
      };
    }
    return task;
  });

  saveData();
  
  // チェックボックスのアニメーション時間を確保して少し後に再描画
  setTimeout(() => {
    renderAll();
  }, 300);
};

/**
 * タスク編集ボタンが押された時の処理。
 * @param {Event} e - イベントオブジェクト
 * @param {string} taskId - 編集対象タスクのID
 */
window.handleEditTask = function(e, taskId) {
  // イベント伝播(カード展開)を防ぐ
  if (e) e.stopPropagation();
  openTaskModal(taskId);
};

/**
 * タスクを削除します。
 * @param {Event} e - イベントオブジェクト
 * @param {string} taskId - 削除対象タスクのID
 */
window.handleDeleteTask = function(e, taskId) {
  if (e) e.stopPropagation();
  
  const task = tasks.find(t => t.id === taskId);
  if (!task) return;

  if (confirm(`タスク「${task.title}」を削除しますか？`)) {
    tasks = tasks.filter(t => t.id !== taskId);
    saveData();
    renderAll();
  }
};

/**
 * タスクカードの展開/折りたたみをトグルします。
 * @param {string} cardId - トグル対象のタスクカードのDOM ID
 */
window.toggleCardExpand = function(cardId) {
  const card = document.getElementById(cardId);
  if (card) {
    card.classList.toggle('expanded');
  }
};

// --- 6. レンダリングロジック (Rendering Views) ---

/**
 * すべての表示領域を更新します。
 */
function renderAll() {
  renderDashboard();
  renderTaskList();
  renderAnalytics();
}

/**
 * ダッシュボード（ホーム）画面を描画します。
 * 進捗サマリーテキスト、統計値、およびやる必要のあるタスク一覧を更新します。
 */
function renderDashboard() {
  const totalCount = tasks.length;
  const completedCount = tasks.filter(t => t.completed).length;
  const pendingCount = totalCount - completedCount;

  // 1. ウェルカムステータス文言の更新
  if (pendingCount > 0) {
    elements.dashboardWelcomeStatus.innerHTML = `現在、やる必要のあるタスクが <strong style="color: var(--color-secondary); font-size: 16px;">${pendingCount}</strong> 件あります。`;
  } else if (totalCount > 0 && pendingCount === 0) {
    elements.dashboardWelcomeStatus.innerHTML = `すべてのタスクが完了しています！素晴らしい一日を✨`;
  } else {
    elements.dashboardWelcomeStatus.innerHTML = `登録されたタスクはありません。やることリストを作成しましょう！`;
  }

  // 2. 統計数の表示更新
  elements.statPendingCount.textContent = pendingCount;
  elements.statCompletedCount.textContent = completedCount;
  
  // 時間の計算 (予定時間の合計と完了した時間の合計)
  let totalMinutes = 0;
  let completedMinutes = 0;
  tasks.forEach(t => {
    totalMinutes += t.duration || 0;
    if (t.completed) {
      completedMinutes += t.duration || 0;
    }
  });

  const totalH = Math.floor(totalMinutes / 60);
  const totalM = totalMinutes % 60;
  const compH = Math.floor(completedMinutes / 60);
  const compM = completedMinutes % 60;
  
  elements.statTimeSummary.textContent = `${totalH}h ${totalM}m / ${compH}h ${compM}m`;

  // 3. やる必要のあるタスク一覧（未完了タスクすべて）の描画
  // 優先度が高い順（高 -> 中 -> 低）、その中で作成日の新しい順にソートして並べる
  const priorityOrder = { high: 3, medium: 2, low: 1 };
  const activeTasks = tasks.filter(t => !t.completed).sort((a, b) => {
    const pA = priorityOrder[a.priority] || 0;
    const pB = priorityOrder[b.priority] || 0;
    if (pB !== pA) return pB - pA;
    return new Date(b.createdAt) - new Date(a.createdAt);
  });

  elements.dashboardActiveBadge.textContent = activeTasks.length;
  
  const activeList = elements.dashboardActiveList;
  activeList.innerHTML = '';

  if (activeTasks.length > 0) {
    activeTasks.forEach(task => {
      // プレフィックス 'dash' を渡して ID衝突を回避
      activeList.appendChild(createTaskCardDOM(task, 'dash'));
    });
  } else {
    activeList.innerHTML = '<p class="empty-state">やる必要のあるタスクはありません。素晴らしい！</p>';
  }

  if (window.lucide) {
    window.lucide.createIcons();
  }
}

/**
 * メインのタスク一覧画面を描画します。検索・カテゴリフィルタ・優先度フィルタを適用します。
 */
function renderTaskList() {
  const searchQuery = elements.taskSearchInput.value.toLowerCase().trim();
  const selectedCategory = elements.filterCategorySelect.value;
  const selectedPriority = elements.filterPrioritySelect.value;

  // 1. フィルタ処理
  let filteredTasks = tasks.filter(task => {
    // 検索一致
    const matchSearch = task.title.toLowerCase().includes(searchQuery) || 
                        (task.notes && task.notes.toLowerCase().includes(searchQuery));
    
    // カテゴリ一致
    const matchCategory = selectedCategory === 'all' || task.categoryId === selectedCategory;
    
    // 優先度一致
    const matchPriority = selectedPriority === 'all' || task.priority === selectedPriority;
    
    return matchSearch && matchCategory && matchPriority;
  });

  // 2. ソート処理
  // 未完了：優先度（高->中->低）かつ作成日降順
  // 完了：完了日降順
  const priorityOrder = { high: 3, medium: 2, low: 1 };
  
  const activeTasks = filteredTasks.filter(t => !t.completed).sort((a, b) => {
    const pA = priorityOrder[a.priority] || 0;
    const pB = priorityOrder[b.priority] || 0;
    if (pB !== pA) return pB - pA;
    return new Date(b.createdAt) - new Date(a.createdAt);
  });

  const completedTasks = filteredTasks.filter(t => t.completed).sort((a, b) => {
    return new Date(b.completedDate || 0) - new Date(a.completedDate || 0);
  });

  // 3. バッジ件数の更新
  elements.activeTasksBadge.textContent = activeTasks.length;
  elements.completedTasksBadge.textContent = completedTasks.length;

  // 4. 未完了タスク一覧の描画
  const activeContainer = elements.activeTasksList;
  activeContainer.innerHTML = '';

  if (activeTasks.length > 0) {
    activeTasks.forEach(task => {
      activeContainer.appendChild(createTaskCardDOM(task, 'list'));
    });
  } else {
    activeContainer.innerHTML = '<p class="empty-state">該当する未完了タスクはありません</p>';
  }

  // 5. 完了タスク一覧の描画
  const completedContainer = elements.completedTasksList;
  completedContainer.innerHTML = '';

  if (completedTasks.length > 0) {
    completedTasks.forEach(task => {
      completedContainer.appendChild(createTaskCardDOM(task, 'list'));
    });
  } else {
    completedContainer.innerHTML = '<p class="empty-state">完了したタスクはここに格納されます</p>';
  }

  // アイコン生成
  if (window.lucide) {
    window.lucide.createIcons();
  }
}

/**
 * ひとつのタスクオブジェクトに対応するタスクカードDOM要素を生成します。
 * @param {Object} task - タスクオブジェクト
 * @param {string} prefix - DOM要素IDのプレフィックス (重複IDを回避するため)
 * @returns {HTMLElement} タスクカードのHTML要素
 */
function createTaskCardDOM(task, prefix = 'task') {
  const category = categories.find(c => c.id === task.categoryId) || DEFAULT_CATEGORIES[4];
  const card = document.createElement('div');
  card.className = `task-card ${task.completed ? 'completed' : ''}`;
  card.id = `${prefix}-card-${task.id}`;
  
  const timeStr = formatDuration(task.duration);
  const dueDateStr = formatDueDate(task.dueDate);
  const priorityLabel = task.priority === 'high' ? '高' : task.priority === 'medium' ? '中' : '低';

  card.innerHTML = `
    <div class="task-card-main">
      <!-- ワンタップ完了チェックボックス -->
      <label class="checkbox-container" onclick="event.stopPropagation()">
        <input type="checkbox" ${task.completed ? 'checked' : ''} onchange="toggleTaskComplete('${task.id}')">
        <span class="checkmark"></span>
      </label>
      
      <!-- タスク詳細部 (クリックでドロワー展開) -->
      <div class="task-details" onclick="toggleCardExpand('${prefix}-card-${task.id}')">
        <div class="task-title-row">
          <span class="task-title-text">${escapeHTML(task.title)}</span>
        </div>
        <div class="task-tags">
          <!-- 優先度バッジ -->
          <span class="badge badge-${escapeHTML(task.priority)}">${priorityLabel}</span>
          
          <!-- カテゴリバッジ -->
          <span class="badge category-badge">
            <span class="category-dot" style="background-color: ${escapeHTML(category.color)};"></span>
            ${escapeHTML(category.name)}
          </span>
          
          <!-- 見積もり時間バッジ -->
          ${task.duration > 0 ? `
            <span class="badge time-badge">
              <i data-lucide="clock"></i>
              ${timeStr}
            </span>
          ` : ''}
          
          <!-- 期限バッジ -->
          ${dueDateStr ? `
            <span class="badge" style="background: rgba(255,255,255,0.05); color: var(--text-muted);">
              ${dueDateStr}
            </span>
          ` : ''}
        </div>
      </div>
      
      <!-- アクションボタン -->
      <div class="task-actions">
        <button class="task-action-btn" onclick="handleEditTask(event, '${task.id}')" title="編集">
          <i data-lucide="edit-3" style="width: 14px; height: 14px;"></i>
        </button>
        <button class="task-action-btn btn-delete" onclick="handleDeleteTask(event, '${task.id}')" title="削除">
          <i data-lucide="trash-2" style="width: 14px; height: 14px;"></i>
        </button>
      </div>
    </div>
    
    <!-- メモ／詳細情報の展開エリア -->
    ${(task.notes || task.dueDate) ? `
      <div class="task-drawer">
        ${task.dueDate ? `<div class="drawer-date"><i data-lucide="calendar"></i>期限: ${escapeHTML(task.dueDate.replace('T', ' '))}</div>` : ''}
        ${task.notes ? `<div>${escapeHTML(task.notes)}</div>` : ''}
      </div>
    ` : ''}
  `;

  return card;
}

/**
 * 分析画面を描画します。
 * Chart.jsライブラリを使用してグラフ（タスク完了率、カテゴリ別作業時間）を表示・更新します。
 */
function renderAnalytics() {
  const totalCount = tasks.length;
  const completedCount = tasks.filter(t => t.completed).length;
  const pendingCount = totalCount - completedCount;

  // --- 1. タスク完了率グラフ (Doughnut Chart) ---
  const compCtx = document.getElementById('completion-chart');
  if (compCtx) {
    if (completionChartInstance) {
      completionChartInstance.destroy();
    }

    if (totalCount === 0) {
      // タスク未登録時はダミーの表示
      completionChartInstance = new Chart(compCtx, {
        type: 'doughnut',
        data: {
          labels: ['データなし'],
          datasets: [{
            data: [1],
            backgroundColor: ['rgba(0, 0, 0, 0.04)'],
            borderWidth: 0
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: true, labels: { color: '#9c8e91', font: { family: 'Outfit' } } }
          }
        }
      });
    } else {
      completionChartInstance = new Chart(compCtx, {
        type: 'doughnut',
        data: {
          labels: ['完了済み', '未完了'],
          datasets: [{
            data: [completedCount, pendingCount],
            backgroundColor: ['#06d6a0', '#ff758c'], // ミントグリーン & ピーチピンク
            borderColor: '#ffffff',
            borderWidth: 2,
            hoverOffset: 4
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              display: true,
              position: 'bottom',
              labels: {
                color: '#9c8e91', // アッシュピンク
                font: { family: 'Outfit', size: 12, weight: 'bold' }
              }
            }
          },
          cutout: '65%'
        }
      });
    }
  }

  // --- 2. カテゴリ別の合計見積もり時間 (Bar Chart) ---
  const catCtx = document.getElementById('category-chart');
  if (catCtx) {
    if (categoryChartInstance) {
      categoryChartInstance.destroy();
    }

    // 各カテゴリごとの見積もり時間(時間単位)を集計
    const chartLabels = [];
    const chartData = [];
    const chartColors = [];
    
    categories.forEach(category => {
      // 該当カテゴリかつ未完了・完了すべてのタスクの時間合計(分)
      const totalMin = tasks
        .filter(t => t.categoryId === category.id)
        .reduce((sum, t) => sum + (t.duration || 0), 0);
      
      const hours = parseFloat((totalMin / 60).toFixed(1)); // 小数点第1位まで
      
      chartLabels.push(category.name);
      chartData.push(hours);
      chartColors.push(category.color);
    });

    const hasTimeData = chartData.some(h => h > 0);

    if (!hasTimeData) {
      // データがない場合の表示
      categoryChartInstance = new Chart(catCtx, {
        type: 'bar',
        data: {
          labels: ['登録データなし'],
          datasets: [{
            data: [0],
            backgroundColor: ['rgba(0, 0, 0, 0.04)'],
            borderWidth: 0
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            x: { grid: { display: false }, ticks: { color: '#9c8e91' } },
            y: { grid: { display: false }, ticks: { color: '#9c8e91' } }
          }
        }
      });
    } else {
      categoryChartInstance = new Chart(catCtx, {
        type: 'bar',
        data: {
          labels: chartLabels,
          datasets: [{
            label: '合計時間 (時間)',
            data: chartData,
            backgroundColor: chartColors, // 各カテゴリのポップカラー
            borderRadius: 10,
            borderWidth: 0
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          indexAxis: 'y', // 横棒グラフにする
          plugins: {
            legend: { display: false }
          },
          scales: {
            x: {
              grid: { color: 'rgba(61, 52, 54, 0.04)' }, // 薄いココアブラウンのグリッド
              ticks: { color: '#9c8e91', font: { family: 'Outfit', weight: 'bold' } }
            },
            y: {
              grid: { display: false },
              ticks: { color: '#3d3436', font: { family: 'Outfit', weight: 'bold' } } // カテゴリ名は少し濃く
            }
          }
        }
      });
    }
  }

  // --- 3. カテゴリ別タスク件数の集計テキストリストの描画 ---
  const summaryList = elements.categoryListSummary;
  summaryList.innerHTML = '';

  categories.forEach(category => {
    const catTasks = tasks.filter(t => t.categoryId === category.id);
    const total = catTasks.length;
    const completed = catTasks.filter(t => t.completed).length;
    const totalDur = catTasks.reduce((sum, t) => sum + (t.duration || 0), 0);
    const durStr = formatDuration(totalDur);

    const item = document.createElement('div');
    item.className = 'category-summary-item';
    item.innerHTML = `
      <div class="category-summary-left">
        <span class="category-dot" style="background-color: ${escapeHTML(category.color)};"></span>
        <span>${escapeHTML(category.name)}</span>
      </div>
      <div class="category-summary-right">
        <span>${completed} / ${total} 件</span>
        ${totalDur > 0 ? `<span style="font-size: 11px; color: var(--text-muted); margin-left: 8px;">(${durStr})</span>` : ''}
      </div>
    `;
    summaryList.appendChild(item);
  });
}

// --- 7. イベントリスナー登録 (Event Handlers) ---
function registerEventListeners() {
  
  // 1. ボトムナビゲーション切り替え
  elements.navItems.forEach(item => {
    item.addEventListener('click', () => {
      const tabName = item.getAttribute('data-tab');
      if (tabName) {
        switchTab(tabName);
      }
    });
  });

  // 2. モーダル起動ボタン (FAB & カテゴリ追加)
  elements.fabAddTask.addEventListener('click', () => openTaskModal());
  elements.addCategoryBtn.addEventListener('click', () => {
    renderCategoryList();
    elements.categoryModal.classList.add('active');
  });

  // 3. モーダルを閉じる処理
  elements.taskModalClose.addEventListener('click', closeTaskModal);
  elements.taskModalCancel.addEventListener('click', closeTaskModal);
  
  elements.categoryModalClose.addEventListener('click', () => {
    elements.categoryModal.classList.remove('active');
  });

  // 背景クリックでモーダルを閉じる
  elements.taskModal.addEventListener('click', (e) => {
    if (e.target === elements.taskModal) closeTaskModal();
  });
  elements.categoryModal.addEventListener('click', (e) => {
    if (e.target === elements.categoryModal) {
      elements.categoryModal.classList.remove('active');
    }
  });

  // 4. フォーム送信処理
  elements.taskForm.addEventListener('submit', handleTaskSubmit);
  elements.categoryForm.addEventListener('submit', handleAddCategory);

  // 5. 検索＆フィルター関連のイベント
  elements.taskSearchInput.addEventListener('input', () => {
    const value = elements.taskSearchInput.value;
    elements.searchClearBtn.style.display = value ? 'flex' : 'none';
    renderTaskList();
  });

  elements.searchClearBtn.addEventListener('click', () => {
    elements.taskSearchInput.value = '';
    elements.searchClearBtn.style.display = 'none';
    renderTaskList();
  });

  elements.filterCategorySelect.addEventListener('change', renderTaskList);
  elements.filterPrioritySelect.addEventListener('change', renderTaskList);

  // 6. 完了グループのアコーディオン展開
  elements.toggleCompletedBtn.addEventListener('click', () => {
    const list = elements.completedTasksList;
    const btn = elements.toggleCompletedBtn;
    
    list.classList.toggle('collapsed');
    btn.classList.toggle('open');
  });

  // 7. テーマカラーカスタマイザー関連のイベント
  if (elements.themeMenuBtn) {
    elements.themeMenuBtn.addEventListener('click', () => {
      elements.themeModal.classList.add('active');
    });
  }

  if (elements.themeModalClose) {
    elements.themeModalClose.addEventListener('click', () => {
      elements.themeModal.classList.remove('active');
    });
  }

  elements.themeModal.addEventListener('click', (e) => {
    if (e.target === elements.themeModal) {
      elements.themeModal.classList.remove('active');
    }
  });

  // プリセットボタンのクリックイベント
  if (elements.themePresetBtns) {
    elements.themePresetBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const color = btn.getAttribute('data-color');
        if (color) {
          applyThemeColor(color);
        }
      });
    });
  }

  // カラーピッカーの入力イベント (リアルタイム反映)
  if (elements.customThemeColor) {
    elements.customThemeColor.addEventListener('input', (e) => {
      applyThemeColor(e.target.value);
    });
  }

  // 8. プルダウン更新 (Pull-to-refresh) の制御
  let touchStartY = 0;
  let touchMoveY = 0;
  let isPulling = false;
  const pullThreshold = 75; // 引っ張るしきい値(px)
  
  const ptrIndicator = document.getElementById('pull-to-refresh-indicator');
  
  if (ptrIndicator && elements.appMain) {
    const ptrIcon = ptrIndicator.querySelector('.ptr-icon');
    const ptrText = ptrIndicator.querySelector('.ptr-text');
    
    elements.appMain.addEventListener('touchstart', (e) => {
      // 1点タッチで、メインエリアのスクロール位置が最上部のときのみ検知開始
      if (elements.appMain.scrollTop === 0 && e.touches.length === 1) {
        touchStartY = e.touches[0].pageY;
        isPulling = true;
      } else {
        isPulling = false;
      }
    }, { passive: true });
    
    elements.appMain.addEventListener('touchmove', (e) => {
      if (!isPulling) return;
      
      touchMoveY = e.touches[0].pageY;
      const dragDistance = touchMoveY - touchStartY;
      
      // 下方向への引っ張りのみ処理
      if (dragDistance > 0) {
        // インジケーター表示をオン
        ptrIndicator.classList.add('pulling');
        
        // 抵抗（引っ張り感）をつけてメインエリアを下にずらす
        const translateVal = Math.min(dragDistance * 0.4, 70);
        elements.appMain.style.transform = `translateY(${translateVal}px)`;
        elements.appMain.style.transition = 'none';
        
        // インジケーター自体の位置と透明度調整
        ptrIndicator.style.transform = `translateY(${Math.min(dragDistance * 0.35, 22)}px)`;
        ptrIndicator.style.opacity = Math.min(dragDistance / 80, 1);
        
        // アイコンを回転
        if (ptrIcon) {
          ptrIcon.style.transform = `rotate(${dragDistance * 3.5}deg)`;
        }
        
        // しきい値を超えたかどうかの表示変更
        if (dragDistance > pullThreshold) {
          ptrIndicator.classList.add('ready');
          if (ptrText) ptrText.textContent = 'はなして更新';
        } else {
          ptrIndicator.classList.remove('ready');
          if (ptrText) ptrText.textContent = 'ひっぱって更新...';
        }
        
        // 標準のバウンス等を制限
        if (e.cancelable) e.preventDefault();
      }
    }, { passive: false });
    
    elements.appMain.addEventListener('touchend', () => {
      if (!isPulling) return;
      isPulling = false;
      
      const dragDistance = touchMoveY - touchStartY;
      
      // メインエリアを元の位置に戻す
      elements.appMain.style.transform = 'translateY(0)';
      elements.appMain.style.transition = 'transform 0.35s cubic-bezier(0.25, 1, 0.5, 1)';
      
      if (dragDistance > pullThreshold) {
        // 更新実行アニメーション開始
        ptrIndicator.classList.add('refreshing');
        if (ptrText) ptrText.textContent = '更新中...';
        ptrIndicator.style.transform = 'translateY(12px)';
        ptrIndicator.style.opacity = '1';
        
        // 0.7秒後にブラウザをリロード
        setTimeout(() => {
          window.location.reload();
        }, 700);
      } else {
        // キャンセル
        ptrIndicator.classList.remove('pulling', 'ready');
        ptrIndicator.style.transform = 'translateY(-15px)';
        ptrIndicator.style.opacity = '0';
        ptrIndicator.style.transition = 'transform 0.3s ease, opacity 0.3s ease';
      }
      
      touchStartY = 0;
      touchMoveY = 0;
    });
  }
}

/**
 * 指定されたタブに表示を切り替えます。
 * @param {string} tabName - タブの名称 ('dashboard', 'tasks', 'analytics')
 */
function switchTab(tabName) {
  activeTab = tabName;

  // ナビゲーションボタンのアクティブクラス更新
  elements.navItems.forEach(btn => {
    const dataTab = btn.getAttribute('data-tab');
    if (dataTab === tabName) {
      btn.classList.add('active-nav');
    } else {
      btn.classList.remove('active-nav');
    }
  });

  // コンテンツの表示・非表示更新
  elements.tabs.forEach(tab => {
    const id = tab.getAttribute('id');
    if (id === `tab-${tabName}`) {
      tab.classList.add('active-tab');
    } else {
      tab.classList.remove('active-tab');
    }
  });

  // タブに応じた初期化／再描画
  if (tabName === 'analytics') {
    renderAnalytics();
  } else if (tabName === 'dashboard') {
    renderDashboard();
  } else if (tabName === 'tasks') {
    renderTaskList();
  }
}

// --- 8. ユーティリティ・ヘルパー関数 (Helper Functions) ---

/**
 * 分単位の時間を「○時間○分」または「○分」の文字列にフォーマットします。
 * @param {number} totalMinutes - 総時間（分）
 * @returns {string} フォーマットされた文字列
 */
function formatDuration(totalMinutes) {
  if (!totalMinutes || totalMinutes <= 0) return '';
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours > 0 && minutes > 0) {
    return `${hours}時間 ${minutes}分`;
  } else if (hours > 0) {
    return `${hours}時間`;
  } else {
    return `${minutes}分`;
  }
}

/**
 * 期限日時を「月/日 時:分」のわかりやすい形式にフォーマットします。
 * @param {string} dateString - ISO日時文字列 (または 'YYYY-MM-DDTHH:mm')
 * @returns {string} フォーマットされた文字列、または期限が切れている場合は警告表示
 */
function formatDueDate(dateString) {
  if (!dateString) return '';
  
  const dueDate = new Date(dateString);
  const now = new Date();
  
  const month = dueDate.getMonth() + 1;
  const date = dueDate.getDate();
  const hours = String(dueDate.getHours()).padStart(2, '0');
  const minutes = String(dueDate.getMinutes()).padStart(2, '0');

  let formatted = `${month}/${date} ${hours}:${minutes}`;

  // 期限切れかどうかの簡易チェック (未完了の場合に赤字などで警告するための布石)
  if (dueDate < now) {
    formatted += ' (期限切れ)';
  }
  
  return formatted;
}

/**
 * HTML文字をエスケープしてXSSを防止します。
 * @param {string} str - 対象の文字列
 * @returns {string} エスケープ済みの安全な文字列
 */
function escapeHTML(str) {
  if (typeof str !== 'string') return str;
  return str.replace(/[&<>'"]/g, tag => {
    const chars = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#39;',
      '"': '&quot;'
    };
    return chars[tag] || tag;
  });
}

/**
 * テーマカラーを初期化し、適用します。
 */
function initTheme() {
  const storedTheme = localStorage.getItem('flowtodo_theme_color');
  if (storedTheme) {
    currentThemeColor = storedTheme;
  }
  applyThemeColor(currentThemeColor);
}

/**
 * 指定されたカラーをアプリ全体のテーマ色（アクセントカラー）として適用します。
 * CSS変数を書き換え、localStorageに保存します。
 * @param {string} color - HEXカラーコード (例: '#ff758c')
 */
function applyThemeColor(color) {
  currentThemeColor = color;
  localStorage.setItem('flowtodo_theme_color', color);
  
  // 1. CSSのメインアクセント変数を更新
  document.documentElement.style.setProperty('--color-primary', color);
  
  // 2. グラデーションの作成 (メインカラーから明度を上げたカラーとの組み合わせ)
  const lightColor = adjustColorBrightness(color, 25);
  document.documentElement.style.setProperty('--color-accent-grad', `linear-gradient(135deg, ${color}, ${lightColor})`);
  
  // 3. プリセットボタンのアクティブ状態を更新
  if (elements.themePresetBtns) {
    elements.themePresetBtns.forEach(btn => {
      if (btn.getAttribute('data-color') === color) {
        btn.classList.add('active-theme');
      } else {
        btn.classList.remove('active-theme');
      }
    });
  }
  
  // 4. カラーピッカーおよび値表示テキストを更新
  if (elements.customThemeColor) {
    elements.customThemeColor.value = color;
  }
  if (elements.customThemeVal) {
    elements.customThemeVal.textContent = color.toUpperCase();
  }
}

/**
 * カラーコードの明度をパーセント指定で調整します（グラデーションカラーの生成に利用）。
 * @param {string} hex - HEXカラーコード (例: '#ff758c')
 * @param {number} percent - 調整割合（正の値で明るく、負の値で暗く）
 * @returns {string} 調整後のHEXカラーコード
 */
function adjustColorBrightness(hex, percent) {
  let R = parseInt(hex.substring(1, 3), 16);
  let G = parseInt(hex.substring(3, 5), 16);
  let B = parseInt(hex.substring(5, 7), 16);
  
  R = parseInt(R * (100 + percent) / 100);
  G = parseInt(G * (100 + percent) / 100);
  B = parseInt(B * (100 + percent) / 100);
  
  R = (R < 255) ? R : 255;
  G = (G < 255) ? G : 255;
  B = (B < 255) ? B : 255;
  
  const rHex = String(R.toString(16)).padStart(2, '0');
  const gHex = String(G.toString(16)).padStart(2, '0');
  const bHex = String(B.toString(16)).padStart(2, '0');
  
  return `#${rHex}${gHex}${bHex}`;
}
