const API = {
  async request(path, options = {}) {
    const res = await fetch(path, {
      headers: { 'Content-Type': 'application/json', ...options.headers },
      credentials: 'same-origin',
      ...options
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      throw new Error(data.error || 'Request failed');
    }

    return data;
  },

  get(path) {
    return this.request(path);
  },

  post(path, body) {
    return this.request(path, { method: 'POST', body: JSON.stringify(body) });
  },

  patch(path, body) {
    return this.request(path, { method: 'PATCH', body: JSON.stringify(body) });
  },

  delete(path) {
    return this.request(path, { method: 'DELETE' });
  }
};

function showToast(message, type = 'success') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast fixed top-4 right-4 z-[100] px-5 py-3 rounded-xl shadow-lg text-sm font-semibold ${
    type === 'error' ? 'bg-red-500 text-white' : 'bg-emerald-500 text-white'
  }`;
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

async function requireAuth(redirectTo = '/login.html') {
  try {
    const { user } = await API.get('/api/auth/me');
    return user;
  } catch {
    window.location.href = redirectTo;
    return null;
  }
}

async function redirectIfAuthed(target = '/index.html') {
  try {
    await API.get('/api/auth/me');
    window.location.href = target;
  } catch {
    /* not logged in */
  }
}

function roleBadgeClass(role) {
  return `role-badge role-${role}`;
}

function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString(undefined, {
    year: 'numeric', month: 'short', day: 'numeric'
  });
}
