let currentUser = null;
let usersCache = [];
let studentsCache = [];
let gradebookCache = [];
let logsCache = [];

function showTab(name) {
  document.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t.dataset.tab === name));
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.add('section-hidden'));
  document.getElementById(`panel-${name}`).classList.remove('section-hidden');
}

function localeCompare(a, b) {
  return String(a ?? '').localeCompare(String(b ?? ''), undefined, { sensitivity: 'base' });
}

function sortItems(items, sortKey, getters) {
  const getter = getters[sortKey] || getters[Object.keys(getters)[0]];
  const desc = sortKey.endsWith('-desc');
  const asc = sortKey.endsWith('-asc');
  return [...items].sort((a, b) => {
    const av = getter(a);
    const bv = getter(b);
    if (typeof av === 'number' && typeof bv === 'number') {
      return desc ? bv - av : av - bv;
    }
    const cmp = localeCompare(av, bv);
    if (sortKey === 'newest' || sortKey === 'time-desc') return localeCompare(bv, av);
    if (sortKey === 'oldest' || sortKey === 'time-asc') return localeCompare(av, bv);
    return desc ? -cmp : asc ? cmp : cmp;
  });
}

function wireSortSelect(id, renderFn) {
  const el = document.getElementById(id);
  if (!el) return;
  el.addEventListener('change', renderFn);
}

function wireAutoApply(ids, applyFn) {
  ids.forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('change', applyFn);
    if (el.tagName === 'INPUT') {
      let timer;
      el.addEventListener('input', () => {
        clearTimeout(timer);
        timer = setTimeout(applyFn, 300);
      });
    }
  });
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

function renderUsers() {
  const sortKey = document.getElementById('users-sort')?.value || 'name-asc';
  const users = sortItems(usersCache, sortKey, {
    'name-asc': u => u.full_name,
    'name-desc': u => u.full_name,
    'email-asc': u => u.email,
    'role-asc': u => u.role,
    newest: u => u.created_at,
    oldest: u => u.created_at
  });

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

async function loadUsers() {
  const { users } = await API.get('/api/auth/users');
  usersCache = users;
  renderUsers();
}

async function loadTeachers() {
  const { teachers } = await API.get('/api/teachers');
  document.getElementById('teachers-list').innerHTML = teachers.map(teacher => `
    <div style="padding:0.75rem 0;border-bottom:1px solid var(--border, #ECECEC)">
      <strong>${escapeHtml(teacher.full_name)}</strong> · ${escapeHtml(teacher.email)}
      <p class="muted" style="margin:0.25rem 0 0">${teacher.assignments?.map(a => `${a.subject} (${a.grade} ${a.section})`).join(' · ') || t('noTeachers')}</p>
    </div>`).join('') || `<p class="muted">${t('noTeachers')}</p>`;
}

function renderStudents() {
  const sortKey = document.getElementById('students-sort')?.value || 'name-asc';
  const students = sortItems(studentsCache, sortKey, {
    'name-asc': s => s.name,
    'name-desc': s => s.name,
    'grade-asc': s => s.grade,
    'section-asc': s => s.section
  });

  document.getElementById('students-table').innerHTML = students.map(s => `
    <tr>
      <td>${escapeHtml(s.name)}</td>
      <td>${escapeHtml(s.grade)}</td>
      <td>${escapeHtml(s.section)}</td>
      <td>${escapeHtml(s.parent_name || '—')}</td>
      <td>${escapeHtml(s.user_email || '—')}</td>
    </tr>`).join('') || `<tr><td colspan="5" class="muted">${t('noStudents')}</td></tr>`;
}

async function loadStudents() {
  let url = '/api/students';
  const grade = document.getElementById('filter-grade')?.value || '';
  const section = document.getElementById('filter-section')?.value || '';
  const params = new URLSearchParams();
  if (grade) params.set('grade', grade);
  if (section) params.set('section', section);
  if (params.toString()) url += '?' + params.toString();

  const { students } = await API.get(url);
  studentsCache = students;
  renderStudents();
}

function clearMasterGradebook(message) {
  gradebookCache = [];
  document.getElementById('gradebook-table').innerHTML =
    `<tr><td colspan="6" class="muted">${escapeHtml(message || t('selectGradeSectionHint'))}</td></tr>`;
}

function gradebookFiltersReady() {
  return !!(document.getElementById('gb-grade')?.value && document.getElementById('gb-section')?.value);
}

function renderMasterGradebook() {
  if (!gradebookFiltersReady()) {
    clearMasterGradebook();
    return;
  }

  const sortKey = document.getElementById('gradebook-sort')?.value || 'student-asc';
  const grades = sortItems(gradebookCache, sortKey, {
    'student-asc': g => g.student_name,
    'score-desc': g => Number(g.score),
    'score-asc': g => Number(g.score),
    'subject-asc': g => g.subject,
    'grade-asc': g => `${g.grade_level} ${g.section}`
  });

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

async function loadMasterGradebook() {
  const grade = document.getElementById('gb-grade')?.value || '';
  const section = document.getElementById('gb-section')?.value || '';

  if (!grade || !section) {
    clearMasterGradebook();
    return;
  }

  const subject = document.getElementById('gb-subject')?.value.trim() || '';
  const params = new URLSearchParams({ grade, section });
  if (subject) params.set('subject', subject);

  const { grades } = await API.get('/api/gradebook?' + params.toString());
  gradebookCache = grades;
  renderMasterGradebook();
}

async function loadFilters() {
  const gradeVal = document.getElementById('filter-grade')?.value || '';
  const sectionVal = document.getElementById('filter-section')?.value || '';
  const gbGradeVal = document.getElementById('gb-grade')?.value || '';
  const gbSectionVal = document.getElementById('gb-section')?.value || '';

  const { grades, sections } = await API.get('/api/students/filters');
  ['filter-grade', 'gb-grade'].forEach(id => {
    const el = document.getElementById(id);
    const saved = id === 'filter-grade' ? gradeVal : gbGradeVal;
    const placeholder = id === 'gb-grade' ? t('selectGrade') : t('allGrades');
    el.innerHTML = `<option value="">${placeholder}</option>` + grades.map(g =>
      `<option${g === saved ? ' selected' : ''}>${g}</option>`
    ).join('');
  });
  ['filter-section', 'gb-section'].forEach(id => {
    const el = document.getElementById(id);
    const saved = id === 'filter-section' ? sectionVal : gbSectionVal;
    const placeholder = id === 'gb-section' ? t('selectSection') : t('allSections');
    el.innerHTML = `<option value="">${placeholder}</option>` + sections.map(s =>
      `<option${s === saved ? ' selected' : ''}>${s}</option>`
    ).join('');
  });
}

function renderLogs() {
  const sortKey = document.getElementById('logs-sort')?.value || 'time-desc';
  const logs = sortItems(logsCache, sortKey, {
    'time-desc': l => l.created_at,
    'time-asc': l => l.created_at,
    'user-asc': l => l.user_name || l.user_email,
    'action-asc': l => l.action
  });

  document.getElementById('logs-table').innerHTML = logs.map(log => `
    <tr>
      <td class="muted">${formatDate(log.created_at)}</td>
      <td>${escapeHtml(log.user_name || log.user_email)}</td>
      <td><code>${log.action}</code></td>
      <td class="log-details">${escapeHtml(JSON.stringify(log.details))}</td>
    </tr>`).join('');
}

async function loadLogs() {
  const { logs } = await API.get('/api/audit?limit=100');
  logsCache = logs;
  renderLogs();
}

function wireDownloads() {
  wireSampleDataPanel('panel-sample');
}

async function init() {
  initLanguageToggle();
  currentUser = await requireRole('admin');
  if (!currentUser) return;
  document.getElementById('user-label').textContent = currentUser.full_name;

  onLanguageChange(() => {
    loadFilters();
    renderUsers();
    if (!document.getElementById('panel-teachers').classList.contains('section-hidden')) loadTeachers();
    if (!document.getElementById('panel-students').classList.contains('section-hidden')) renderStudents();
    if (!document.getElementById('panel-gradebook').classList.contains('section-hidden')) {
      if (gradebookFiltersReady()) {
        renderMasterGradebook();
      } else {
        clearMasterGradebook();
      }
    }
    if (!document.getElementById('panel-logs').classList.contains('section-hidden')) renderLogs();
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

  wireSortSelect('users-sort', renderUsers);
  wireSortSelect('students-sort', renderStudents);
  wireSortSelect('gradebook-sort', renderMasterGradebook);
  wireSortSelect('logs-sort', renderLogs);

  wireAutoApply(['filter-grade', 'filter-section'], loadStudents);
  wireAutoApply(['gb-grade', 'gb-section', 'gb-subject'], loadMasterGradebook);

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
  clearMasterGradebook();
  await Promise.all([loadUsers(), loadUploadsList()]);
}

init();
