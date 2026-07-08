let currentUser = null;

function showSection(name) {
  document.querySelectorAll('.app-section').forEach(s => s.classList.add('section-hidden'));
  document.getElementById(`section-${name}`).classList.remove('section-hidden');
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.section === name);
  });
}

async function buildPicker(containerId, type, viewId) {
  const container = document.getElementById(containerId);
  const view = document.getElementById(viewId);

  const { uploads } = await API.get(`/api/uploads?type=${type}`);

  if (!uploads.length) {
    container.innerHTML = `<p class="muted">${t('noUploads')}</p>`;
    view.innerHTML = '';
    return;
  }

  container.innerHTML = `
    <ul class="upload-list" id="${containerId}-list">
      ${uploads.map((u, i) => `
        <li>
          <button type="button" data-id="${u.id}" class="${i === 0 ? 'active' : ''}">
            ${u.title}${u.label ? ` · ${u.label}` : ''}
            <span class="badge">${u.display_format}</span>
          </button>
        </li>
      `).join('')}
    </ul>`;

  const load = async (id) => {
    const { upload } = await API.get(`/api/uploads/${id}`);
    if (upload.display_format === 'image') {
      view.innerHTML = `<img class="image-view" src="${assetUrl(upload.file_url)}" alt="${upload.title}">`;
    } else {
      renderDataTable(view, upload.parsed_data);
    }
  };

  container.querySelectorAll('button[data-id]').forEach(btn => {
    btn.addEventListener('click', () => {
      container.querySelectorAll('button').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      load(btn.dataset.id);
    });
  });

  load(uploads[0].id);
}

async function init() {
  initLanguageToggle();
  currentUser = await requireAuth();
  if (!currentUser) return;

  document.getElementById('welcome-heading').textContent = `${t('welcome')}, ${currentUser.full_name}`;
  document.getElementById('role-line').textContent = currentUser.role;

  if (currentUser.role === 'admin') {
    document.getElementById('admin-link').classList.remove('hidden');
  }

  document.querySelectorAll('[data-section]').forEach(el => {
    el.addEventListener('click', () => showSection(el.dataset.section));
  });

  document.getElementById('logout-btn').addEventListener('click', async () => {
    await API.post('/api/auth/logout');
    window.location.href = 'index.html';
  });

  await Promise.all([
    buildPicker('schedule-picker', 'schedule', 'schedule-view'),
    buildPicker('grades-picker', 'grades', 'grades-view')
  ]);
}

init();
