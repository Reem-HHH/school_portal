let currentUser = null;

function showTab(name) {
  document.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t.dataset.tab === name));
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.add('section-hidden'));
  document.getElementById(`panel-${name}`).classList.remove('section-hidden');
}

async function uploadContent(form, contentType) {
  const fd = new FormData(form);
  fd.append('contentType', contentType);
  await API.postForm('/api/uploads', fd);
  showToast('Uploaded');
  form.reset();
  loadUploadsList();
}

async function loadUploadsList() {
  const { uploads } = await API.get('/api/uploads');
  const el = document.getElementById('uploads-list');

  if (!uploads.length) {
    el.innerHTML = '<p class="muted">No uploads yet.</p>';
    return;
  }

  el.innerHTML = `
    <table>
      <thead><tr><th>Title</th><th>Type</th><th>Format</th><th>Date</th><th></th></tr></thead>
      <tbody>${uploads.map(u => `
        <tr>
          <td>${u.title}${u.label ? ` <span class="muted">· ${u.label}</span>` : ''}</td>
          <td>${u.content_type}</td>
          <td><span class="badge">${u.display_format}</span></td>
          <td class="muted">${formatDate(u.created_at)}</td>
          <td><button class="btn btn-danger btn-sm" data-delete="${u.id}">Remove</button></td>
        </tr>
      `).join('')}</tbody>
    </table>`;

  el.querySelectorAll('[data-delete]').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (!confirm('Remove this upload?')) return;
      await API.delete(`/api/uploads/${btn.dataset.delete}`);
      showToast('Removed');
      loadUploadsList();
    });
  });
}

async function loadUsers() {
  const { users } = await API.get('/api/auth/users');
  document.getElementById('users-table').innerHTML = users.map(u => `
    <tr>
      <td>${u.full_name}</td>
      <td>${u.email}</td>
      <td>
        <select data-user-id="${u.id}" ${u.id === currentUser.id ? 'disabled' : ''}>
          ${['admin','teacher','parent','student'].map(r =>
            `<option value="${r}" ${u.role === r ? 'selected' : ''}>${r}</option>`
          ).join('')}
        </select>
      </td>
      <td>
        <button data-toggle="${u.id}" data-active="${u.is_active}" ${u.id === currentUser.id ? 'disabled' : ''}>
          ${u.is_active ? 'Active' : 'Inactive'}
        </button>
      </td>
      <td class="muted">${formatDate(u.created_at)}</td>
      <td>${u.id !== currentUser.id ? `<button data-del-user="${u.id}" class="btn btn-danger">Delete</button>` : ''}</td>
    </tr>
  `).join('');

  document.querySelectorAll('[data-user-id]').forEach(sel => {
    sel.addEventListener('change', async () => {
      await API.patch(`/api/auth/users/${sel.dataset.userId}`, { role: sel.value });
      showToast('Updated');
      loadLogs();
    });
  });

  document.querySelectorAll('[data-toggle]').forEach(btn => {
    btn.addEventListener('click', async () => {
      await API.patch(`/api/auth/users/${btn.dataset.toggle}`, {
        isActive: btn.dataset.active !== '1'
      });
      loadUsers();
      loadLogs();
    });
  });

  document.querySelectorAll('[data-del-user]').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (!confirm('Delete user?')) return;
      await API.delete(`/api/auth/users/${btn.dataset.delUser}`);
      loadUsers();
      loadLogs();
    });
  });
}

async function loadLogs() {
  const { logs } = await API.get('/api/audit?limit=200');
  document.getElementById('logs-table').innerHTML = logs.map(log => `
    <tr>
      <td class="muted">${formatDate(log.created_at)}</td>
      <td>${log.user_name || log.user_email}</td>
      <td><code>${log.action}</code></td>
      <td><span class="log-details" title="${escapeHtml(JSON.stringify(log.details))}">${escapeHtml(JSON.stringify(log.details))}</span></td>
      <td class="muted">${log.ip_address || '—'}</td>
    </tr>
  `).join('');
}

async function init() {
  initLanguageToggle();
  currentUser = await requireAuth();
  if (!currentUser || currentUser.role !== 'admin') {
    window.location.href = '/index.html';
    return;
  }

  document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
      showTab(tab.dataset.tab);
      if (tab.dataset.tab === 'logs') loadLogs();
    });
  });

  document.getElementById('schedule-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      await uploadContent(e.target, 'schedule');
    } catch (err) {
      showToast(err.message, 'error');
    }
  });

  document.getElementById('grades-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      await uploadContent(e.target, 'grades');
    } catch (err) {
      showToast(err.message, 'error');
    }
  });

  document.getElementById('create-user-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      await API.post('/api/auth/users', {
        fullName: document.getElementById('new-name').value,
        email: document.getElementById('new-email').value,
        password: document.getElementById('new-password').value,
        role: document.getElementById('new-role').value
      });
      showToast('User created');
      e.target.reset();
      loadUsers();
      loadLogs();
    } catch (err) {
      showToast(err.message, 'error');
    }
  });

  document.getElementById('logout-btn').addEventListener('click', async () => {
    await API.post('/api/auth/logout');
    window.location.href = '/login.html';
  });

  await Promise.all([loadUploadsList(), loadUsers(), loadLogs()]);
}

init();
