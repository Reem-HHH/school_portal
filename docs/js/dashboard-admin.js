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
  showToast(t('uploaded'));
  form.reset();
  loadUploadsList();
}

async function loadUploadsList() {
  const { uploads } = await API.get('/api/uploads');
  const el = document.getElementById('uploads-list');
  if (!uploads.length) { el.innerHTML = `<p class="muted">${t('noUploads')}</p>`; return; }
  el.innerHTML = `<table><thead><tr><th>${t('title')}</th><th>${t('type')}</th><th>Date</th><th></th></tr></thead><tbody>
    ${uploads.map(u => `<tr><td>${escapeHtml(u.title)}</td><td>${u.content_type}</td><td class="muted">${formatDate(u.created_at)}</td>
    <td><button class="btn btn-danger" data-delete="${u.id}">${t('delete')}</button></td></tr>`).join('')}
  </tbody></table>`;
  el.querySelectorAll('[data-delete]').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (!confirm(t('delete') + '?')) return;
      await API.delete(`/api/uploads/${btn.dataset.delete}`);
      loadUploadsList();
    });
  });
}

async function loadUsers() {
  const { users } = await API.get('/api/auth/users');
  document.getElementById('users-table').innerHTML = users.map(u => `
    <tr>
      <td>${escapeHtml(u.full_name)}</td>
      <td>${escapeHtml(u.email)}</td>
      <td><select data-user-id="${u.id}" ${u.id === currentUser.id ? 'disabled' : ''}>
        ${['admin','teacher','parent','student'].map(r => `<option value="${r}" ${u.role===r?'selected':''}>${r}</option>`).join('')}
      </select></td>
      <td><button data-toggle="${u.id}" data-active="${u.is_active}" ${u.id===currentUser.id?'disabled':''}>${u.is_active ? t('active') : t('inactive')}</button></td>
      <td>${u.id !== currentUser.id ? `<button data-del="${u.id}" class="btn btn-danger">${t('delete')}</button>` : ''}</td>
    </tr>`).join('');

  document.querySelectorAll('[data-user-id]').forEach(sel => {
    sel.addEventListener('change', async () => {
      await API.patch(`/api/auth/users/${sel.dataset.userId}`, { role: sel.value });
      showToast(t('updated'));
    });
  });
  document.querySelectorAll('[data-toggle]').forEach(btn => {
    btn.addEventListener('click', async () => {
      await API.patch(`/api/auth/users/${btn.dataset.toggle}`, { isActive: btn.dataset.active !== '1' });
      loadUsers();
    });
  });
  document.querySelectorAll('[data-del]').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (!confirm(t('delete') + '?')) return;
      await API.delete(`/api/auth/users/${btn.dataset.del}`);
      loadUsers();
    });
  });
}

async function loadTeachers() {
  const { teachers } = await API.get('/api/teachers');
  document.getElementById('teachers-list').innerHTML = teachers.map(teacher => `
    <div style="padding:0.75rem 0;border-bottom:1px solid #eee">
      <strong>${escapeHtml(teacher.full_name)}</strong> · ${escapeHtml(teacher.email)}
      <p class="muted" style="margin:0.25rem 0 0">${teacher.assignments?.map(a => `${a.subject} (${a.grade} ${a.section})`).join(' · ') || t('noTeachers')}</p>
    </div>`).join('') || `<p class="muted">${t('noTeachers')}</p>`;
}

async function loadStudents(grade = '', section = '') {
  let url = '/api/students';
  const params = new URLSearchParams();
  if (grade) params.set('grade', grade);
  if (section) params.set('section', section);
  if (params.toString()) url += '?' + params.toString();

  const { students } = await API.get(url);
  document.getElementById('students-table').innerHTML = students.map(s => `
    <tr>
      <td>${escapeHtml(s.name)}</td>
      <td>${escapeHtml(s.grade)}</td>
      <td>${escapeHtml(s.section)}</td>
      <td>${escapeHtml(s.parent_name || '—')}</td>
      <td>${escapeHtml(s.user_email || '—')}</td>
    </tr>`).join('') || `<tr><td colspan="5" class="muted">${t('noStudents')}</td></tr>`;
}

async function loadMasterGradebook() {
  const grade = document.getElementById('gb-grade').value;
  const section = document.getElementById('gb-section').value;
  const subject = document.getElementById('gb-subject').value;
  const params = new URLSearchParams();
  if (grade) params.set('grade', grade);
  if (section) params.set('section', section);
  if (subject) params.set('subject', subject);

  const { grades } = await API.get('/api/gradebook?' + params.toString());
  document.getElementById('gradebook-table').innerHTML = grades.map(g => `
    <tr>
      <td>${escapeHtml(g.student_name)}</td>
      <td>${escapeHtml(g.grade_level)} ${escapeHtml(g.section)}</td>
      <td>${escapeHtml(g.subject)}</td>
      <td>${tAssessment(g.assessment_type)}</td>
      <td>${escapeHtml(g.assessment_name)}</td>
      <td>${g.score}/${g.max_score}</td>
    </tr>`).join('') || `<tr><td colspan="6" class="muted">${t('noGrades')}</td></tr>`;
}

async function loadFilters() {
  const { grades, sections } = await API.get('/api/students/filters');
  ['filter-grade', 'gb-grade'].forEach(id => {
    const el = document.getElementById(id);
    el.innerHTML = `<option value="">${t('allGrades')}</option>` + grades.map(g => `<option>${g}</option>`).join('');
  });
  ['filter-section', 'gb-section'].forEach(id => {
    const el = document.getElementById(id);
    el.innerHTML = `<option value="">${t('allSections')}</option>` + sections.map(s => `<option>${s}</option>`).join('');
  });
}

async function loadLogs() {
  const { logs } = await API.get('/api/audit?limit=100');
  document.getElementById('logs-table').innerHTML = logs.map(log => `
    <tr>
      <td class="muted">${formatDate(log.created_at)}</td>
      <td>${escapeHtml(log.user_name || log.user_email)}</td>
      <td><code>${log.action}</code></td>
      <td class="log-details">${escapeHtml(JSON.stringify(log.details))}</td>
    </tr>`).join('');
}

function wireDownloads() {
  document.querySelectorAll('[data-download]').forEach(btn => {
    btn.addEventListener('click', () => {
      const type = btn.dataset.download;
      downloadCsv(`/api/exports/${type}`, `${type}.csv`).catch(err => showToast(err.message, 'error'));
    });
  });
}

async function init() {
  initLanguageToggle();
  currentUser = await requireRole('admin');
  if (!currentUser) return;
  document.getElementById('user-label').textContent = currentUser.full_name;

  onLanguageChange(() => {
    loadFilters();
    loadUsers();
    if (!document.getElementById('panel-teachers').classList.contains('section-hidden')) loadTeachers();
    if (!document.getElementById('panel-students').classList.contains('section-hidden')) loadStudents();
    if (!document.getElementById('panel-gradebook').classList.contains('section-hidden')) loadMasterGradebook();
    loadUploadsList();
  });

  document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
      showTab(tab.dataset.tab);
      if (tab.dataset.tab === 'teachers') loadTeachers();
      if (tab.dataset.tab === 'students') loadStudents();
      if (tab.dataset.tab === 'gradebook') loadMasterGradebook();
      if (tab.dataset.tab === 'logs') loadLogs();
    });
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
      showToast(t('userCreated'));
      e.target.reset();
      loadUsers();
    } catch (err) { showToast(err.message, 'error'); }
  });

  document.getElementById('create-student-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      await API.post('/api/students', {
        name: document.getElementById('stu-name').value,
        grade: document.getElementById('stu-grade').value,
        section: document.getElementById('stu-section').value
      });
      showToast(t('studentAdded'));
      e.target.reset();
      loadStudents();
    } catch (err) { showToast(err.message, 'error'); }
  });

  document.getElementById('filter-students-btn').addEventListener('click', () => {
    loadStudents(document.getElementById('filter-grade').value, document.getElementById('filter-section').value);
  });

  document.getElementById('gb-filter-btn').addEventListener('click', loadMasterGradebook);

  document.getElementById('schedule-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    try { await uploadContent(e.target, 'schedule'); } catch (err) { showToast(err.message, 'error'); }
  });
  document.getElementById('grades-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    try { await uploadContent(e.target, 'grades'); } catch (err) { showToast(err.message, 'error'); }
  });

  document.getElementById('logout-btn').addEventListener('click', async () => {
    await API.post('/api/auth/logout');
    window.location.href = 'index.html';
  });

  wireDownloads();
  await loadFilters();
  await Promise.all([loadUsers(), loadUploadsList()]);
}

init();
