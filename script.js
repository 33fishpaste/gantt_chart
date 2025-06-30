// データ構造
let tasks = [
    {
        id: 1,
        name: '設計フェーズ',
        type: 'group',
        start: new Date('2024-01-15'),
        end: new Date('2024-02-15'),
        expanded: true,
        children: [
            {
                id: 2,
                name: '要件定義',
                type: 'task',
                start: new Date('2024-01-15'),
                end: new Date('2024-01-25'),
                parent: 1
            },
            {
                id: 3,
                name: '基本設計',
                type: 'task',
                start: new Date('2024-01-25'),
                end: new Date('2024-02-15'),
                parent: 1
            }
        ]
    },
    {
        id: 4,
        name: '製造フェーズ',
        type: 'group',
        start: new Date('2024-02-16'),
        end: new Date('2024-03-30'),
        expanded: true,
        children: [
            {
                id: 5,
                name: 'コーディング',
                type: 'task',
                start: new Date('2024-02-16'),
                end: new Date('2024-03-15'),
                parent: 4
            },
            {
                id: 6,
                name: '単体テスト',
                type: 'task',
                start: new Date('2024-03-10'),
                end: new Date('2024-03-30'),
                parent: 4
            }
        ]
    }
];

// 祝日管理
let holidays = new Set();

let nextTaskId = 7;
let draggedTask = null;
let isResizing = false;
let resizeDirection = null;
let startX = 0;
let originalStart = null;
let originalEnd = null;
let originalWorkDays = 0;

const startDate = new Date('2024-01-01');
const cellWidth = 30; // 1日あたりのピクセル幅

const weekdays = ['日', '月', '火', '水', '木', '金', '土'];

// 初期化
function init() {
    renderTimeline();
    renderTasks();
    setupEventListeners();
}

// 営業日判定
function isBusinessDay(date) {
    const dayOfWeek = date.getDay();
    const dateStr = date.toISOString().split('T')[0];
    return dayOfWeek !== 0 && dayOfWeek !== 6 && !holidays.has(dateStr);
}

// 営業日数計算
function calculateWorkDays(start, end) {
    let count = 0;
    const current = new Date(start);
    while (current <= end) {
        if (isBusinessDay(current)) {
            count++;
        }
        current.setDate(current.getDate() + 1);
    }
    return count;
}

// 指定営業日数後の日付を取得
function addWorkDays(start, workDays) {
    const result = new Date(start);
    let count = 0;
    
    while (count < workDays - 1) {
        result.setDate(result.getDate() + 1);
        if (isBusinessDay(result)) {
            count++;
        }
    }
    
    return result;
}

// タイムラインヘッダーの描画
function renderTimeline() {
    const monthRow = document.getElementById('month-row');
    const weekdayRow = document.getElementById('weekday-row');
    const dateRow = document.getElementById('date-row');
    monthRow.innerHTML = '';
    weekdayRow.innerHTML = '';
    dateRow.innerHTML = '';

    // グリッド線をクリア
    document.querySelectorAll('.grid-line').forEach(line => line.remove());

    const endDate = new Date(startDate);
    endDate.setFullYear(endDate.getFullYear() + 1);

    let currentMonth = -1;
    let monthStartIndex = 0;
    let daysInCurrentMonth = 0;

    for (let d = new Date(startDate); d < endDate; d.setDate(d.getDate() + 1)) {
        const month = d.getMonth();
        const date = d.getDate();
        const dayOfWeek = d.getDay();
        const dateStr = d.toISOString().split('T')[0];

        // 月の表示
        if (month !== currentMonth) {
            if (currentMonth !== -1) {
                const monthCell = document.createElement('div');
                monthCell.className = 'month-cell';
                monthCell.style.width = (daysInCurrentMonth * cellWidth) + 'px';
                monthCell.textContent = new Date(d.getFullYear(), currentMonth).toLocaleDateString('ja-JP', { year: 'numeric', month: 'long' });
                monthRow.appendChild(monthCell);
            }
            currentMonth = month;
            monthStartIndex = dateRow.children.length;
            daysInCurrentMonth = 0;
        }
        daysInCurrentMonth++;

        // 曜日の表示
        const weekdayCell = document.createElement('div');
        weekdayCell.className = 'weekday-cell';
        if (dayOfWeek === 0) {
            weekdayCell.classList.add('sunday');
        } else if (dayOfWeek === 6) {
            weekdayCell.classList.add('saturday');
        }
        weekdayCell.textContent = weekdays[dayOfWeek];
        weekdayRow.appendChild(weekdayCell);

        // 日付の表示
        const dateCell = document.createElement('div');
        dateCell.className = 'date-cell';
        dateCell.dataset.date = dateStr;
        
        if (dayOfWeek === 0 || dayOfWeek === 6) {
            dateCell.classList.add('weekend');
        }
        if (holidays.has(dateStr)) {
            dateCell.classList.add('holiday');
        }
        
        dateCell.textContent = date;
        dateCell.onclick = () => toggleHoliday(dateStr);
        dateRow.appendChild(dateCell);

        // グリッド線
        const gridLine = document.createElement('div');
        gridLine.className = 'grid-line';
        gridLine.style.left = (dateRow.children.length - 1) * cellWidth + 'px';
        
        if (dayOfWeek === 0 || dayOfWeek === 6) {
            gridLine.classList.add('weekend');
        } else if (holidays.has(dateStr)) {
            gridLine.classList.add('holiday');
        }
        
        document.getElementById('task-rows').appendChild(gridLine);
    }

    // 最後の月を追加
    if (daysInCurrentMonth > 0) {
        const monthCell = document.createElement('div');
        monthCell.className = 'month-cell';
        monthCell.style.width = (daysInCurrentMonth * cellWidth) + 'px';
        monthCell.textContent = new Date(endDate.getFullYear(), currentMonth).toLocaleDateString('ja-JP', { year: 'numeric', month: 'long' });
        monthRow.appendChild(monthCell);
    }
}

// 祝日の切り替え
function toggleHoliday(dateStr) {
    if (holidays.has(dateStr)) {
        holidays.delete(dateStr);
    } else {
        holidays.add(dateStr);
    }
    renderTimeline();
    renderTasks();
}

// タスクの描画
function renderTasks() {
    const sidebar = document.getElementById('sidebar');
    const taskRows = document.getElementById('task-rows');
    sidebar.innerHTML = '';
    
    // グリッド線以外をクリア
    Array.from(taskRows.children).forEach(child => {
        if (!child.classList.contains('grid-line')) {
            child.remove();
        }
    });

    tasks.forEach(task => {
        renderTaskRecursive(task, 0);
    });
}

function renderTaskRecursive(task, level) {
    // サイドバーのタスク情報
    const taskInfo = document.createElement('div');
    taskInfo.className = 'task-info';
    if (task.type === 'group') {
        taskInfo.classList.add('group');
    }
    if (level > 0) {
        taskInfo.classList.add('subtask');
    }

    if (task.type === 'group') {
        const expandIcon = document.createElement('span');
        expandIcon.className = 'expand-icon';
        if (!task.expanded) {
            expandIcon.classList.add('collapsed');
        }
        expandIcon.textContent = '▼';
        expandIcon.onclick = () => toggleGroup(task.id);
        taskInfo.appendChild(expandIcon);
    }

    const nameSpan = document.createElement('span');
    nameSpan.textContent = task.name;
    taskInfo.appendChild(nameSpan);

    document.getElementById('sidebar').appendChild(taskInfo);

    // ガントチャートのタスクバー
    const taskRow = document.createElement('div');
    taskRow.className = 'task-row';
    if (task.type === 'group') {
        taskRow.classList.add('group');
    }

    const taskBar = createTaskBar(task);
    taskRow.appendChild(taskBar);
    document.getElementById('task-rows').appendChild(taskRow);

    // 子タスクの描画
    if (task.children && task.expanded) {
        task.children.forEach(child => {
            renderTaskRecursive(child, level + 1);
        });
    }
}

function createTaskBar(task) {
    const taskBar = document.createElement('div');
    taskBar.className = 'task-bar';
    if (task.type === 'group') {
        taskBar.classList.add('group');
    }
    taskBar.dataset.taskId = task.id;

    const daysDiff = Math.floor((task.start - startDate) / (1000 * 60 * 60 * 24));
    const duration = Math.floor((task.end - task.start) / (1000 * 60 * 60 * 24)) + 1;
    const workDays = calculateWorkDays(task.start, task.end);

    taskBar.style.left = (daysDiff * cellWidth) + 'px';
    taskBar.style.width = (duration * cellWidth) + 'px';

    // 工数表示
    const workDaysSpan = document.createElement('span');
    workDaysSpan.className = 'work-days';
    workDaysSpan.textContent = `${workDays}日`;
    taskBar.appendChild(workDaysSpan);

    // タスク名
    const taskNameSpan = document.createElement('span');
    taskNameSpan.className = 'task-name';
    taskNameSpan.textContent = task.name;
    taskBar.appendChild(taskNameSpan);

    // リサイズハンドル
    const leftHandle = document.createElement('div');
    leftHandle.className = 'resize-handle left';
    taskBar.appendChild(leftHandle);

    const rightHandle = document.createElement('div');
    rightHandle.className = 'resize-handle right';
    taskBar.appendChild(rightHandle);

    // イベントリスナー
    taskBar.addEventListener('mousedown', handleTaskMouseDown);
    leftHandle.addEventListener('mousedown', (e) => handleResizeStart(e, 'left'));
    rightHandle.addEventListener('mousedown', (e) => handleResizeStart(e, 'right'));

    return taskBar;
}

// ドラッグ&ドロップ処理
function handleTaskMouseDown(e) {
    if (e.target.classList.contains('resize-handle')) return;

    const taskBar = e.currentTarget;
    const taskId = parseInt(taskBar.dataset.taskId);
    draggedTask = findTaskById(taskId);

    if (!draggedTask) return;

    startX = e.clientX;
    const rect = taskBar.getBoundingClientRect();
    originalWorkDays = calculateWorkDays(draggedTask.start, draggedTask.end);

    taskBar.classList.add('dragging');

    const handleMouseMove = (e) => {
        const deltaX = e.clientX - startX;
        const newLeft = Math.max(0, rect.left - document.querySelector('.gantt-container').getBoundingClientRect().left + deltaX);
        taskBar.style.left = newLeft + 'px';
    };

    const handleMouseUp = (e) => {
        taskBar.classList.remove('dragging');
        
        const deltaX = e.clientX - startX;
        const daysMoved = Math.round(deltaX / cellWidth);
        
        if (daysMoved !== 0) {
            moveTaskWithWorkDays(draggedTask, daysMoved, originalWorkDays);
        }

        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        draggedTask = null;
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
}

// リサイズ処理
function handleResizeStart(e, direction) {
    e.stopPropagation();
    
    const taskBar = e.currentTarget.parentElement;
    const taskId = parseInt(taskBar.dataset.taskId);
    const task = findTaskById(taskId);

    if (!task) return;

    isResizing = true;
    resizeDirection = direction;
    startX = e.clientX;
    originalStart = new Date(task.start);
    originalEnd = new Date(task.end);

    const handleMouseMove = (e) => {
        const deltaX = e.clientX - startX;
        const daysDelta = Math.round(deltaX / cellWidth);

        if (resizeDirection === 'left') {
            const newStart = new Date(originalStart);
            newStart.setDate(newStart.getDate() + daysDelta);
            
            if (newStart < task.end) {
                task.start = newStart;
                updateTaskBar(task);
            }
        } else {
            const newEnd = new Date(originalEnd);
            newEnd.setDate(newEnd.getDate() + daysDelta);
            
            if (newEnd > task.start) {
                task.end = newEnd;
                updateTaskBar(task);
            }
        }
    };

    const handleMouseUp = () => {
        isResizing = false;
        resizeDirection = null;
        
        if (task.type === 'group') {
            updateGroupDates(task);
        }

        renderTasks();

        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
}

// 営業日を保持したタスクの移動
function moveTaskWithWorkDays(task, daysDelta, workDays) {
    const newStart = new Date(task.start);
    newStart.setDate(newStart.getDate() + daysDelta);
    
    // 開始日が非営業日の場合、次の営業日に調整
    while (!isBusinessDay(newStart)) {
        newStart.setDate(newStart.getDate() + 1);
    }
    
    const newEnd = addWorkDays(newStart, workDays);
    
    task.start = newStart;
    task.end = newEnd;

    if (task.type === 'group' && task.children) {
        task.children.forEach(child => {
            const childWorkDays = calculateWorkDays(child.start, child.end);
            moveTaskWithWorkDays(child, daysDelta, childWorkDays);
        });
    }

    renderTasks();
}

// タスクバーの更新
function updateTaskBar(task) {
    const taskBar = document.querySelector(`[data-task-id="${task.id}"]`);
    if (taskBar) {
        const daysDiff = Math.floor((task.start - startDate) / (1000 * 60 * 60 * 24));
        const duration = Math.floor((task.end - task.start) / (1000 * 60 * 60 * 24)) + 1;
        const workDays = calculateWorkDays(task.start, task.end);

        taskBar.style.left = (daysDiff * cellWidth) + 'px';
        taskBar.style.width = (duration * cellWidth) + 'px';
        
        const workDaysSpan = taskBar.querySelector('.work-days');
        if (workDaysSpan) {
            workDaysSpan.textContent = `${workDays}日`;
        }
    }
}

// グループの日付更新
function updateGroupDates(group) {
    if (!group.children || group.children.length === 0) return;

    let minStart = group.children[0].start;
    let maxEnd = group.children[0].end;

    group.children.forEach(child => {
        if (child.start < minStart) minStart = child.start;
        if (child.end > maxEnd) maxEnd = child.end;
    });

    group.start = new Date(minStart);
    group.end = new Date(maxEnd);
}

// グループの展開/折りたたみ
function toggleGroup(groupId) {
    const group = findTaskById(groupId);
    if (group && group.type === 'group') {
        group.expanded = !group.expanded;
        renderTasks();
    }
}

// タスクの検索
function findTaskById(id) {
    for (let task of tasks) {
        if (task.id === id) return task;
        if (task.children) {
            for (let child of task.children) {
                if (child.id === id) return child;
            }
        }
    }
    return null;
}

// モーダル表示
function showAddTaskModal() {
    const modal = document.getElementById('taskModal');
    const parentSelect = document.getElementById('parentGroup');
    
    // 親グループの選択肢を更新
    parentSelect.innerHTML = '<option value="">なし</option>';
    tasks.forEach(task => {
        if (task.type === 'group') {
            const option = document.createElement('option');
            option.value = task.id;
            option.textContent = task.name;
            parentSelect.appendChild(option);
        }
    });

    // デフォルト日付を設定
    const today = new Date();
    document.getElementById('startDate').value = today.toISOString().split('T')[0];
    const endDate = new Date(today);
    endDate.setDate(endDate.getDate() + 7);
    document.getElementById('endDate').value = endDate.toISOString().split('T')[0];

    modal.style.display = 'flex';
}

function closeModal() {
    document.getElementById('taskModal').style.display = 'none';
    document.getElementById('taskName').value = '';
    document.getElementById('taskType').value = 'task';
    document.getElementById('parentGroup').value = '';
}

// タスクの追加
function addTask() {
    const name = document.getElementById('taskName').value;
    const type = document.getElementById('taskType').value;
    const parentId = document.getElementById('parentGroup').value;
    const start = new Date(document.getElementById('startDate').value);
    const end = new Date(document.getElementById('endDate').value);

    if (!name || !start || !end) {
        alert('すべての項目を入力してください');
        return;
    }

    const newTask = {
        id: nextTaskId++,
        name: name,
        type: type,
        start: start,
        end: end,
        expanded: true
    };

    if (type === 'group') {
        newTask.children = [];
    }

    if (parentId) {
        const parent = findTaskById(parseInt(parentId));
        if (parent && parent.children) {
            newTask.parent = parent.id;
            parent.children.push(newTask);
            updateGroupDates(parent);
        }
    } else {
        tasks.push(newTask);
    }

    renderTasks();
    closeModal();
}

// イベントリスナーの設定
function setupEventListeners() {
    // モーダルの外側クリックで閉じる
    document.getElementById('taskModal').addEventListener('click', (e) => {
        if (e.target.id === 'taskModal') {
            closeModal();
        }
    });
}

// 初期化実行
init();
