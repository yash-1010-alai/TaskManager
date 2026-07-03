/* ======================================================
   NexTask — dashboard.js
   Connects all protected FastAPI task/user endpoints.
   Handles: stats, task CRUD, user management, RBAC UI
   ====================================================== */

// ─── State ─────────────────────────────────────────────
let allTasks      = [];
let filteredTasks = [];
let currentUser   = null;
let editingTaskId = null;
let activeFilter  = 'all';

// ─── Pagination (Recent Tasks – Dashboard) ─────────────
const RECENT_PAGE_SIZE = 5;
let recentPage = 1;


// ─── Boot ──────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', async () => {
  currentUser = API.getUser();
  if (!currentUser) {
    window.location.href = '/login';
    return;
  }

  renderSidebar(currentUser);
  await loadTasks();

  // Show manager-only UI
  if (currentUser.role === 'manager') {
    document.querySelectorAll('.manager-only').forEach(el => el.style.display = '');
    document.querySelectorAll('.manager-field').forEach(el => el.style.display = '');
    const ownerCol = document.getElementById('ownerColH');
    if (ownerCol) ownerCol.style.display = '';
  }

  // Dashboard-specific
  if (document.getElementById('statsRow')) {
    renderStats();
  }

  // Logout
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      API.clearToken();
      showToast('Signed out successfully.', 'info');
      setTimeout(() => { window.location.href = '/login'; }, 700);
    });
  }

  // Task form submit
  const taskForm = document.getElementById('taskForm');
  if (taskForm) {
    taskForm.addEventListener('submit', handleTaskSubmit);
  }
});

// ─── Sidebar Render ────────────────────────────────────
function renderSidebar(user) {
  const avatarEl = document.getElementById('sidebarAvatar');
  const emailEl  = document.getElementById('sidebarEmail');
  const roleEl   = document.getElementById('sidebarRole');
  const welcomeEl = document.getElementById('welcomeMsg');

  if (avatarEl) avatarEl.textContent = user.email.charAt(0).toUpperCase();
  if (emailEl)  emailEl.textContent  = user.email;
  if (roleEl)   roleEl.textContent   = user.role.toUpperCase();
  if (welcomeEl) welcomeEl.textContent = `Welcome back, ${user.email.split('@')[0]}! Here's your overview.`;
}

// ─── Load Tasks ────────────────────────────────────────
async function loadTasks() {
  try {
    const res  = await API.get('/tasks/');
    if (!res) return;
    allTasks = await res.json();
    filteredTasks = [...allTasks];

    const badge = document.getElementById('taskCountBadge');
    if (badge) badge.textContent = allTasks.length;

    const totalBadge = document.getElementById('tasksTotalBadge');
    if (totalBadge) totalBadge.textContent = allTasks.length;

    // Update chips
    updateChips();

    // Render based on page
    if (document.getElementById('recentTasksBody')) {
      recentPage = 1;
      renderRecentTasks(allTasks);
    }
    if (document.getElementById('allTasksBody')) {
      renderTasksTable(filteredTasks);
    }
    if (document.getElementById('statsRow')) {
      renderStats();
    }
  } catch (err) {
    showToast('Failed to load tasks from server.', 'error');
  }
}

// ─── Stats ─────────────────────────────────────────────
function renderStats() {
  const todo     = allTasks.filter(t => t.status === 'todo').length;
  const progress = allTasks.filter(t => t.status === 'in_progress').length;
  const done     = allTasks.filter(t => t.status === 'done').length;
  const total    = allTasks.length;
  const pct      = total ? Math.round((done / total) * 100) : 0;

  setText('statTotal',    total);
  setText('statTodo',     todo);
  setText('statProgress', progress);
  setText('statDone',     done);

  const pctEl = document.getElementById('statDonePercent');
  if (pctEl) pctEl.textContent = total ? `${pct}% completion rate` : 'No tasks yet';

  const bar = document.getElementById('sprintProgressBar');
  if (bar) bar.style.width = pct + '%';

  const pctLabel = document.getElementById('progressPercent');
  if (pctLabel) pctLabel.textContent = `${pct}%`;
}

function updateChips() {
  const todo     = allTasks.filter(t => t.status === 'todo').length;
  const progress = allTasks.filter(t => t.status === 'in_progress').length;
  const done     = allTasks.filter(t => t.status === 'done').length;
  setText('chipTodo',     todo);
  setText('chipProgress', progress);
  setText('chipDone',     done);
}

function setText(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

// ─── Task Table Render ─────────────────────────────────
function renderRecentTasks(tasks) {
  const tbody = document.getElementById('recentTasksBody');
  if (!tbody) return;

  const totalPages = Math.max(1, Math.ceil(tasks.length / RECENT_PAGE_SIZE));
  if (recentPage > totalPages) recentPage = totalPages;

  const start  = (recentPage - 1) * RECENT_PAGE_SIZE;
  const slice  = tasks.slice(start, start + RECENT_PAGE_SIZE);

  renderTableBody(tbody, slice);
  renderRecentPagination(tasks.length, totalPages);
}

function renderRecentPagination(totalItems, totalPages) {
  const container = document.getElementById('recentPagination');
  if (!container) return;

  if (totalItems === 0 || totalPages <= 1) {
    container.innerHTML = '';
    return;
  }

  const info = `<span class="page-info">${(recentPage - 1) * RECENT_PAGE_SIZE + 1}–${Math.min(recentPage * RECENT_PAGE_SIZE, totalItems)} of ${totalItems}</span>`;

  const prevDisabled = recentPage === 1 ? 'disabled' : '';
  const nextDisabled = recentPage === totalPages ? 'disabled' : '';

  // Build page number buttons (show at most 5)
  let pageButtons = '';
  const delta = 2;
  const left  = Math.max(1, recentPage - delta);
  const right = Math.min(totalPages, recentPage + delta);

  if (left > 1) {
    pageButtons += `<button class="page-btn" onclick="goRecentPage(1)">1</button>`;
    if (left > 2) pageButtons += `<span class="page-ellipsis">…</span>`;
  }
  for (let i = left; i <= right; i++) {
    pageButtons += `<button class="page-btn${i === recentPage ? ' active' : ''}" onclick="goRecentPage(${i})">${i}</button>`;
  }
  if (right < totalPages) {
    if (right < totalPages - 1) pageButtons += `<span class="page-ellipsis">…</span>`;
    pageButtons += `<button class="page-btn" onclick="goRecentPage(${totalPages})">${totalPages}</button>`;
  }

  container.innerHTML = `
    <div class="pagination-wrap">
      ${info}
      <div class="pagination-controls">
        <button class="page-btn page-nav" onclick="goRecentPage(${recentPage - 1})" ${prevDisabled}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 18 9 12 15 6"/></svg>
        </button>
        ${pageButtons}
        <button class="page-btn page-nav" onclick="goRecentPage(${recentPage + 1})" ${nextDisabled}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"/></svg>
        </button>
      </div>
    </div>`;
}

window.goRecentPage = function(page) {
  const totalPages = Math.max(1, Math.ceil(allTasks.length / RECENT_PAGE_SIZE));
  if (page < 1 || page > totalPages) return;
  recentPage = page;
  renderRecentTasks(allTasks);
};

function renderTasksTable(tasks) {
  const tbody = document.getElementById('allTasksBody');
  if (!tbody) return;
  renderTableBody(tbody, tasks);
}

function renderTableBody(tbody, tasks) {
  if (!tasks.length) {
    tbody.innerHTML = `
      <tr><td colspan="6">
        <div class="empty-state">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>
          <p>No tasks yet. Click <strong>+ New Task</strong> to get started.</p>
        </div>
      </td></tr>`;
    return;
  }
  tbody.innerHTML = tasks.map(task => `
    <tr data-id="${task.id}">
      <td style="color:var(--text-muted);font-size:0.78rem;">#${task.id}</td>
      <td class="task-title-cell">${escHtml(task.title)}</td>
      <td class="task-desc-cell">${escHtml(task.description || '—')}</td>
      <td>${statusBadge(task.status)}</td>
      <td class="${currentUser?.role !== 'manager' ? 'owner-col-hidden' : ''}" style="${currentUser?.role !== 'manager' ? 'display:none;' : ''}">${escHtml(task.owner_email || '—')}</td>
      <td>
        <div class="task-actions">
          <button class="action-btn" title="Edit task" onclick="editTask(${task.id})">✏</button>
          <button class="action-btn" title="Cycle status" onclick="cycleStatus(${task.id}, '${task.status}')">⟳</button>
          <button class="action-btn del" title="Delete task" onclick="deleteTask(${task.id})">✕</button>
        </div>
      </td>
    </tr>`).join('');
}

function statusBadge(status) {
  const map = {
    'todo':        ['status-todo',     '◻ To Do'],
    'in_progress': ['status-progress', '● In Progress'],
    'done':        ['status-done',     '✓ Done']
  };
  const [cls, label] = map[status] || ['status-todo', status];
  return `<span class="status-badge ${cls}"><span class="status-dot"></span>${label}</span>`;
}

function escHtml(str) {
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ─── Filter & Search ───────────────────────────────────
window.applyFilter = function(status, btn) {
  activeFilter = status;
  document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');

  filteredTasks = status === 'all'
    ? [...allTasks]
    : allTasks.filter(t => t.status === status);

  renderTasksTable(filteredTasks);
};

window.searchTasks = function(query) {
  const q = query.toLowerCase();
  const source = activeFilter === 'all' ? allTasks : allTasks.filter(t => t.status === activeFilter);
  filteredTasks = source.filter(t =>
    t.title.toLowerCase().includes(q) ||
    (t.description || '').toLowerCase().includes(q)
  );
  renderTasksTable(filteredTasks);
};

// ─── Create Task Modal ─────────────────────────────────
window.openCreateModal = function() {
  editingTaskId = null;
  const modal = document.getElementById('taskModal');
  const form  = document.getElementById('taskForm');
  const lbl   = document.getElementById('modalTitle');
  const submitLbl = document.getElementById('taskSubmitLabel');
  if (!modal) return;

  form.reset();
  document.getElementById('editTaskId').value = '';
  if (lbl) lbl.textContent = 'New Task';
  if (submitLbl) submitLbl.textContent = 'Create Task';
  modal.classList.add('open');
};

window.closeModal = function() {
  const modal = document.getElementById('taskModal');
  if (modal) modal.classList.remove('open');
};

// Close on overlay click
document.addEventListener('click', (e) => {
  if (e.target.classList.contains('modal-overlay')) closeModal();
});

// ─── Edit Task ─────────────────────────────────────────
window.editTask = function(taskId) {
  const task = allTasks.find(t => t.id === taskId);
  if (!task) return;
  editingTaskId = taskId;

  document.getElementById('editTaskId').value   = taskId;
  document.getElementById('taskTitle').value     = task.title;
  document.getElementById('taskDesc').value      = task.description || '';
  document.getElementById('taskStatus').value    = task.status;

  const ownerField = document.getElementById('taskOwnerId');
  if (ownerField) ownerField.value = task.owner_id || '';

  const lbl = document.getElementById('modalTitle');
  const submitLbl = document.getElementById('taskSubmitLabel');
  if (lbl) lbl.textContent = 'Edit Task';
  if (submitLbl) submitLbl.textContent = 'Save Changes';

  document.getElementById('taskModal').classList.add('open');
};

// ─── Submit Task (Create / Update) ─────────────────────
async function handleTaskSubmit(e) {
  e.preventDefault();

  const title    = document.getElementById('taskTitle').value.trim();
  const desc     = document.getElementById('taskDesc').value.trim();
  const status   = document.getElementById('taskStatus').value;
  const ownerIn  = document.getElementById('taskOwnerId');
  const ownerId  = ownerIn ? (ownerIn.value ? parseInt(ownerIn.value) : null) : null;

  if (!title) { showToast('Task title is required.', 'error'); return; }

  const btn = e.target.querySelector('button[type="submit"]');
  if (btn) { btn.disabled = true; btn.classList.add('btn-loading'); }

  try {
    let res, data;

    if (editingTaskId) {
      // UPDATE
      const body = { title, description: desc || null, status };
      if (ownerId && currentUser.role === 'manager') body.owner_id = ownerId;
      res  = await API.put(`/tasks/${editingTaskId}`, body);
      data = await res.json();
      if (res.ok) {
        const idx = allTasks.findIndex(t => t.id === editingTaskId);
        if (idx !== -1) allTasks[idx] = data;
        showToast('Task updated! ✓', 'success');
      } else {
        showToast(data.detail || 'Update failed.', 'error');
        return;
      }
    } else {
      // CREATE
      const body = { title, description: desc || null, status };
      if (ownerId && currentUser.role === 'manager') body.owner_id = ownerId;
      res  = await API.post('/tasks/', body);
      data = await res.json();
      if (res.ok) {
        allTasks.unshift(data);
        showToast('Task created! 🚀', 'success');
      } else {
        showToast(data.detail || 'Create failed.', 'error');
        return;
      }
    }

    closeModal();
    filteredTasks = [...allTasks];
    if (document.getElementById('recentTasksBody')) renderRecentTasks(allTasks);
    if (document.getElementById('allTasksBody'))    renderTasksTable(filteredTasks);
    if (document.getElementById('statsRow'))        renderStats();
    updateChips();
    const badge = document.getElementById('taskCountBadge');
    if (badge) badge.textContent = allTasks.length;

  } catch (err) {
    showToast('Network error — check if FastAPI is running.', 'error');
  } finally {
    if (btn) { btn.disabled = false; btn.classList.remove('btn-loading'); }
  }
}

// ─── Cycle Task Status ─────────────────────────────────
window.cycleStatus = async function(taskId, currentStatus) {
  const cycle = { 'todo': 'in_progress', 'in_progress': 'done', 'done': 'todo' };
  const next  = cycle[currentStatus] || 'todo';

  try {
    const res  = await API.put(`/tasks/${taskId}`, { status: next });
    const data = await res.json();
    if (res.ok) {
      const idx = allTasks.findIndex(t => t.id === taskId);
      if (idx !== -1) allTasks[idx] = data;
      filteredTasks = [...allTasks];
      if (document.getElementById('recentTasksBody')) renderRecentTasks(allTasks);
      if (document.getElementById('allTasksBody'))    renderTasksTable(filteredTasks);
      if (document.getElementById('statsRow'))        renderStats();
      updateChips();
      showToast(`Status → ${next.replace('_', ' ')} ✓`, 'success');
    } else {
      showToast(data.detail || 'Status update failed.', 'error');
    }
  } catch { showToast('Network error.', 'error'); }
};

// ─── Delete Task ───────────────────────────────────────
window.deleteTask = async function(taskId) {
  if (!confirm('Delete this task? This cannot be undone.')) return;
  try {
    const res = await API.delete(`/tasks/${taskId}`);
    if (res.ok) {
      allTasks = allTasks.filter(t => t.id !== taskId);
      filteredTasks = filteredTasks.filter(t => t.id !== taskId);
      if (document.getElementById('recentTasksBody')) renderRecentTasks(allTasks);
      if (document.getElementById('allTasksBody'))    renderTasksTable(filteredTasks);
      if (document.getElementById('statsRow'))        renderStats();
      updateChips();
      const badge = document.getElementById('taskCountBadge');
      if (badge) badge.textContent = allTasks.length;
      showToast('Task deleted.', 'info');
    } else {
      const data = await res.json();
      showToast(data.detail || 'Delete failed.', 'error');
    }
  } catch { showToast('Network error.', 'error'); }
};

// ─── Manager: Load Users Panel ─────────────────────────
window.loadUsersPanel = async function() {
  const panel = document.getElementById('usersPanel');
  const tbody = document.getElementById('usersTableBody');
  if (!panel || !tbody) return;

  panel.style.display = 'block';
  tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;padding:30px;color:var(--text-muted);">Loading…</td></tr>';

  try {
    const res   = await API.get('/users/');
    const users = await res.json();

    if (!res.ok || !users.length) {
      tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;padding:30px;color:var(--text-muted);">No users found.</td></tr>';
      return;
    }

    tbody.innerHTML = users.map(u => `
      <tr>
        <td style="color:var(--text-muted);">#${u.id}</td>
        <td class="task-title-cell">${escHtml(u.email)}</td>
        <td>
          <span class="status-badge ${u.role === 'manager' ? 'status-done' : 'status-todo'}">
            <span class="status-dot"></span>${u.role}
          </span>
        </td>
        <td>
          <div class="task-actions">
            <button class="action-btn" title="Toggle role" onclick="toggleUserRole(${u.id}, '${u.role}')">⇄</button>
          </div>
        </td>
      </tr>`).join('');

  } catch { showToast('Failed to load users.', 'error'); }
};

// ─── Toggle User Role (Manager) ────────────────────────
window.toggleUserRole = async function(userId, currentRole) {
  const newRole = currentRole === 'manager' ? 'member' : 'manager';
  if (!confirm(`Change this user's role to ${newRole}?`)) return;

  try {
    const res  = await API.put(`/users/${userId}/role`, { role: newRole });
    const data = await res.json();
    if (res.ok) {
      showToast(`Role changed to ${newRole} ✓`, 'success');
      loadUsersPanel();
    } else {
      showToast(data.detail || 'Role update failed.', 'error');
    }
  } catch { showToast('Network error.', 'error'); }
};
