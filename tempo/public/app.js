// app.js — Tempo frontend. Vanilla JS, talks to the /api endpoints.

const $ = (sel) => document.querySelector(sel);

const els = {
  statFocus: $('#stat-focus'),
  statDone: $('#stat-done'),
  statActive: $('#stat-active'),
  timerDisplay: $('#timer-display'),
  timerTask: $('#timer-task'),
  timerMinutes: $('#timer-minutes'),
  timerStart: $('#timer-start'),
  timerStop: $('#timer-stop'),
  timerHint: $('#timer-hint'),
  taskForm: $('#task-form'),
  taskInput: $('#task-input'),
  taskList: $('#task-list'),
  taskEmpty: $('#task-empty'),
  toast: $('#toast'),
};

// ---- API helpers ----
async function api(path, options = {}) {
  const res = await fetch(`/api${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

function toast(message, isError = false) {
  els.toast.textContent = message;
  els.toast.classList.toggle('error', isError);
  els.toast.classList.add('show');
  clearTimeout(toast._t);
  toast._t = setTimeout(() => els.toast.classList.remove('show'), 2600);
}

// ---- Tasks ----
let tasks = [];

function renderTasks() {
  els.taskList.innerHTML = '';
  els.taskEmpty.hidden = tasks.length > 0;

  for (const task of tasks) {
    const li = document.createElement('li');
    li.className = `task-item${task.done ? ' done' : ''}`;

    const check = document.createElement('input');
    check.type = 'checkbox';
    check.className = 'task-check';
    check.checked = task.done;
    check.setAttribute('aria-label', `Mark "${task.title}" done`);
    check.addEventListener('change', () => toggleTask(task, check.checked));

    const title = document.createElement('span');
    title.className = 'task-title';
    title.textContent = task.title;

    const del = document.createElement('button');
    del.className = 'task-del';
    del.textContent = '×';
    del.title = 'Delete task';
    del.setAttribute('aria-label', `Delete "${task.title}"`);
    del.addEventListener('click', () => deleteTask(task));

    li.append(check, title, del);
    els.taskList.append(li);
  }

  // Refresh the timer's task dropdown (preserve current selection).
  const current = els.timerTask.value;
  els.timerTask.innerHTML = '<option value="">— No specific task —</option>';
  for (const task of tasks.filter((t) => !t.done)) {
    const opt = document.createElement('option');
    opt.value = task.id;
    opt.textContent = task.title;
    els.timerTask.append(opt);
  }
  els.timerTask.value = tasks.some((t) => t.id === current && !t.done) ? current : '';
}

async function loadTasks() {
  const data = await api('/tasks');
  tasks = data.tasks;
  renderTasks();
}

async function addTask(title) {
  await api('/tasks', { method: 'POST', body: JSON.stringify({ title }) });
  await loadTasks();
  await loadStats();
}

async function toggleTask(task, done) {
  await api(`/tasks/${task.id}/done`, { method: 'PUT', body: JSON.stringify({ done }) });
  await loadTasks();
  await loadStats();
}

async function deleteTask(task) {
  await api(`/tasks/${task.id}`, { method: 'DELETE' });
  await loadTasks();
  await loadStats();
}

// ---- Stats ----
async function loadStats() {
  const s = await api('/stats');
  els.statFocus.textContent = s.focusMinutesToday;
  els.statDone.textContent = s.tasksCompletedToday;
  els.statActive.textContent = s.activeTasks;
}

// ---- Timer ----
const timer = {
  endAt: null,
  totalSeconds: 0,
  intervalId: null,
  taskId: null,
};

function fmt(totalSeconds) {
  const s = Math.max(0, Math.round(totalSeconds));
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

function tick() {
  const remaining = (timer.endAt - Date.now()) / 1000;
  if (remaining <= 0) {
    els.timerDisplay.textContent = '00:00';
    finishTimer(true);
    return;
  }
  els.timerDisplay.textContent = fmt(remaining);
}

function setRunning(running) {
  els.timerStart.disabled = running;
  els.timerStop.disabled = !running;
  els.timerMinutes.disabled = running;
  els.timerTask.disabled = running;
  els.timerDisplay.classList.toggle('running', running);
}

function startTimer() {
  const minutes = Number(els.timerMinutes.value);
  if (!Number.isFinite(minutes) || minutes <= 0) {
    toast('Enter a valid number of minutes', true);
    return;
  }
  timer.totalSeconds = minutes * 60;
  timer.endAt = Date.now() + timer.totalSeconds * 1000;
  timer.taskId = els.timerTask.value || null;
  setRunning(true);
  els.timerHint.textContent = 'Focus! The session logs automatically when it ends.';
  tick();
  timer.intervalId = setInterval(tick, 250);
}

async function finishTimer(completed) {
  clearInterval(timer.intervalId);
  timer.intervalId = null;
  setRunning(false);

  if (completed) {
    const minutes = timer.totalSeconds / 60;
    try {
      await api('/sessions', {
        method: 'POST',
        body: JSON.stringify({ minutes, taskId: timer.taskId }),
      });
      await loadStats();
      toast(`Logged ${minutes} focus min 🎉`);
      els.timerHint.textContent = 'Session logged. Start another whenever you like.';
    } catch (err) {
      toast(err.message, true);
    }
  } else {
    els.timerHint.textContent = 'Session stopped — nothing logged.';
    els.timerDisplay.textContent = fmt(Number(els.timerMinutes.value) * 60);
  }
}

// ---- Wire up ----
els.taskForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const title = els.taskInput.value.trim();
  if (!title) return;
  els.taskInput.value = '';
  try {
    await addTask(title);
  } catch (err) {
    toast(err.message, true);
  }
});

els.timerStart.addEventListener('click', startTimer);
els.timerStop.addEventListener('click', () => finishTimer(false));
els.timerMinutes.addEventListener('input', () => {
  if (!timer.intervalId) els.timerDisplay.textContent = fmt(Number(els.timerMinutes.value) * 60);
});

// Initial load.
(async () => {
  try {
    await Promise.all([loadTasks(), loadStats()]);
  } catch (err) {
    toast(`Could not reach server: ${err.message}`, true);
  }
})();
