const API_BASE = (window.APP_CONFIG && window.APP_CONFIG.apiBase) || '';

function assetUrl(path) {
  if (!path.startsWith('/')) return path;
  return API_BASE + path;
}

const API = {
  async request(path, options = {}) {
    const res = await fetch(API_BASE + path, {
      credentials: 'include',
      ...options,
      headers: { ...options.headers }
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Request failed');
    return data;
  },

  get(path) { return this.request(path); },

  post(path, body) {
    return this.request(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
  },

  postForm(path, formData) {
    return this.request(path, { method: 'POST', body: formData });
  },

  patch(path, body) {
    return this.request(path, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
  },

  delete(path) { return this.request(path, { method: 'DELETE' }); }
};

function showToast(message, type = 'success') {
  const el = document.createElement('div');
  el.className = `toast${type === 'error' ? ' error' : ''}`;
  el.textContent = message;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 3000);
}

function showBackendNotice() {
  if (!location.hostname.endsWith('.github.io') || API_BASE) return;
  const box = document.createElement('div');
  box.className = 'card';
  box.style.cssText = 'margin-bottom:1rem;border-color:#b00020;color:#b00020;font-size:0.875rem';
  box.innerHTML = '<strong>Backend not connected.</strong> GitHub Pages only shows the frontend. Deploy the server to <a href="https://render.com" target="_blank">Render</a>, then add your Render URL to the <code>api-base</code> meta tag in index.html.';
  document.querySelector('.auth-box')?.prepend(box);
}

async function requireAuth() {
  try {
    const { user } = await API.get('/api/auth/me');
    return user;
  } catch {
    window.location.href = 'index.html';
    return null;
  }
}

async function redirectIfAuthed() {
  try {
    const { dashboard } = await API.get('/api/auth/me');
    window.location.href = dashboard || 'portal.html';
  } catch { /* not logged in */ }
}

function dashboardForRole(role) {
  const map = {
    admin: 'dashboard-admin.html',
    teacher: 'dashboard-teacher.html',
    student: 'dashboard-student.html',
    parent: 'dashboard-student.html'
  };
  return map[role] || 'index.html';
}

async function requireRole(...roles) {
  const { user, dashboard } = await API.get('/api/auth/me');
  if (!roles.includes(user.role)) {
    window.location.href = dashboard || 'index.html';
    return null;
  }
  return user;
}

function formatDate(iso) {
  if (!iso) return '—';
  const normalized = iso.includes('T') ? iso : iso.replace(' ', 'T') + 'Z';
  return new Date(normalized).toLocaleString(undefined, {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
}

function renderDataTable(container, parsed) {
  if (!parsed?.headers?.length) {
    container.innerHTML = '<div class="empty">No tabular data in this file.</div>';
    return;
  }

  container.innerHTML = `
    <div class="data-table-wrap">
      <table>
        <thead><tr>${parsed.headers.map(h => `<th>${escapeHtml(h)}</th>`).join('')}</tr></thead>
        <tbody>${parsed.rows.map(row =>
          `<tr>${parsed.headers.map(h => `<td>${escapeHtml(String(row[h] ?? ''))}</td>`).join('')}</tr>`
        ).join('')}</tbody>
      </table>
    </div>`;
}

function escapeHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
