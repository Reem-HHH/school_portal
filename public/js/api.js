const API = {
  async request(path, options = {}) {
    const res = await fetch(path, {
      credentials: 'same-origin',
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

async function requireAuth() {
  try {
    const { user } = await API.get('/api/auth/me');
    return user;
  } catch {
    window.location.href = '/login.html';
    return null;
  }
}

async function redirectIfAuthed() {
  try {
    await API.get('/api/auth/me');
    window.location.href = '/index.html';
  } catch { /* not logged in */ }
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
