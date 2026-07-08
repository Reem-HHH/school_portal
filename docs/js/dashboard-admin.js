let currentUser = null;
let usersCache = [];
let studentsCache = [];
let teachersCache = [];
let logsCache = [];
let adminActiveAssessmentId = null;

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
  });
}

function studentFiltersReady() {
  return !!(document.getElementById('filter-grade')?.value && document.getElementById('filter-section')?.value);
}

function gradebookFiltersReady() {
  return !!(document.getElementById('gb-grade')?.value &&
    document.getElementById('gb-section')?.value &&
    document.getElementById('gb-subject')?.value);
}

function usersByRole(role) {
  return usersCache.filter(u => u.role === role && u.is_active);
}

function userOptions(role, selectedId) {
  const none = `<option value="">${t('noneLinked')}</option>`;
  const opts = usersByRole(role).map(u =>
    `<option value="${u.id}"${String(u.id) === String(selectedId) ? ' selected' : ''}>${escapeHtml(u.full_name)} (${escapeHtml(u.email)})</option>`
  ).join('');
  return none + opts;
}

function statusBadge(status) {
  const cls = status === 'open' ? 'status-open' : 'status-closed';
  const label = status === 'open' ? t('assessmentOpen') : t('assessmentClosed');
  return `<span class="status-badge ${cls}">${label}</span>`;
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
      loadUsers();
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
  if (!document.getElementById('panel-students').classList.contains('section-hidden') && studentFiltersReady()) {
    renderStudents();
  }
}

async function loadTeachers() {
  const { teachers } = await API.get('/api/teachers');
  teachersCache = teachers;
  const { grades, sections } = await API.get('/api/students/filters');

  document.getElementById('teachers-list').innerHTML = teachers.map(teacher => `
    <div class="card mb-1 teacher-card">
      <strong>${escapeHtml(teacher.full_name)}</strong> · ${escapeHtml(teacher.email)}
      <ul class="assignment-list mt-1">
        ${(teacher.assignments || []).map(a => `
          <li>
            ${escapeHtml(a.subject)} — ${escapeHtml(a.grade)} ${escapeHtml(a.section)}
            <button class="btn btn-danger btn-inline" data-rm-assignment="${a.id}" data-teacher-id="${teacher.id}">${t('delete')}</button>
          </li>`).join('') || `<li class="muted">${t('noClasses')}</li>`}
      </ul>
      <form class="form-grid form-grid-3 mt-1" data-assign-teacher="${teacher.id}">
        <div class="form-row">
          <label data-i18n="subject">Subject</label>
          <input name="subject" required placeholder="Math">
        </div>
        <div class="form-row">
          <label data-i18n="grade">Grade</label>
          <select name="grade" required>${grades.map(g => `<option>${escapeHtml(g)}</option>`).join('')}</select>
        </div>
        <div class="form-row">
          <label data-i18n="section">Section</label>
          <select name="section" required>${sections.map(s => `<option>${escapeHtml(s)}</option>`).join('')}</select>
        </div>
        <div class="align-end">
          <button type="submit" class="btn btn-outline" data-i18n="assignClass">Assign class</button>
        </div>
      </form>
    </div>`).join('') || `<p class="muted">${t('noTeachers')}</p>`;

  document.querySelectorAll('[data-assign-teacher]').forEach(form => {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const fd = new FormData(form);
      try {
        await API.post(`/api/teachers/${form.dataset.assignTeacher}/assignments`, {
          subject: fd.get('subject'),
          grade: fd.get('grade'),
          section: fd.get('section')
        });
        showToast(t('updated'));
        loadTeachers();
      } catch (err) { showToast(err.message, 'error'); }
    });
  });

  document.querySelectorAll('[data-rm-assignment]').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (!confirm(t('delete') + '?')) return;
      try {
        await API.delete(`/api/teachers/${btn.dataset.teacherId}/assignments/${btn.dataset.rmAssignment}`);
        showToast(t('updated'));
        loadTeachers();
      } catch (err) { showToast(err.message, 'error'); }
    });
  });
}

function clearStudentsTable() {
  studentsCache = [];
  document.getElementById('students-table').innerHTML =
    emptyTablePrompt(5, 'selectGradeSectionStudentsHint');
}

function renderStudents() {
  if (!studentFiltersReady()) {
    clearStudentsTable();
    return;
  }

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
      <td><select class="input-field" data-link-parent="${s.id}">${userOptions('parent', s.parent_user_id)}</select></td>
      <td><select class="input-field" data-link-user="${s.id}">${userOptions('student', s.user_id)}</select></td>
    </tr>`).join('') || `<tr><td colspan="5" class="muted">${t('noStudents')}</td></tr>`;

  document.querySelectorAll('[data-link-parent]').forEach(sel => {
    sel.addEventListener('change', async () => {
      try {
        await API.patch(`/api/students/${sel.dataset.linkParent}`, {
          parentUserId: sel.value ? parseInt(sel.value, 10) : null
        });
        showToast(t('updated'));
        loadStudents();
      } catch (err) { showToast(err.message, 'error'); }
    });
  });

  document.querySelectorAll('[data-link-user]').forEach(sel => {
    sel.addEventListener('change', async () => {
      try {
        await API.patch(`/api/students/${sel.dataset.linkUser}`, {
          userId: sel.value ? parseInt(sel.value, 10) : null
        });
        showToast(t('updated'));
        loadStudents();
      } catch (err) { showToast(err.message, 'error'); }
    });
  });
}

async function loadStudents() {
  const grade = document.getElementById('filter-grade')?.value || '';
  const section = document.getElementById('filter-section')?.value || '';
  if (!grade || !section) {
    clearStudentsTable();
    return;
  }
  const { students } = await API.get(`/api/students?grade=${encodeURIComponent(grade)}&section=${encodeURIComponent(section)}`);
  studentsCache = students;
  renderStudents();
}

async function populateGbSubjects() {
  const grade = document.getElementById('gb-grade')?.value || '';
  const section = document.getElementById('gb-section')?.value || '';
  const sel = document.getElementById('gb-subject');
  const saved = sel.value;
  if (!grade || !section) {
    sel.innerHTML = `<option value="">${t('selectSubject')}</option>`;
    return;
  }
  const { subjects } = await API.get(
    `/api/assessments/subjects?grade=${encodeURIComponent(grade)}&section=${encodeURIComponent(section)}`
  );
  sel.innerHTML = `<option value="">${t('selectSubject')}</option>` +
    subjects.map(s => `<option value="${escapeHtml(s)}"${s === saved ? ' selected' : ''}>${escapeHtml(s)}</option>`).join('');
}

function clearAdminGradebook() {
  document.getElementById('admin-gradebook-matrix').innerHTML =
    emptyPanelPrompt('selectGradeSectionSubjectHint');
}

function showAdminGradebookOverview() {
  adminActiveAssessmentId = null;
  document.getElementById('admin-gradebook-overview').classList.remove('section-hidden');
  document.getElementById('admin-gradebook-marking').classList.add('section-hidden');
}

async function adminViewMarks(assessmentId, readOnly = true) {
  adminActiveAssessmentId = assessmentId;
  document.getElementById('admin-gradebook-overview').classList.add('section-hidden');
  document.getElementById('admin-gradebook-marking').classList.remove('section-hidden');

  const { assessment, students, grades } = await API.get(`/api/assessments/${assessmentId}/marks`);
  const gradeMap = new Map(grades.map(g => [g.student_id, g]));

  document.getElementById('admin-marking-title').textContent = assessment.name;
  document.getElementById('admin-marking-meta').innerHTML =
    `${tAssessment(assessment.assessment_type)} · ${escapeHtml(assessment.subject)} · ${escapeHtml(assessment.grade_level)} ${escapeHtml(assessment.section)} · ${t('maxScore')}: ${assessment.max_score} · ${statusBadge(assessment.status)}`;

  document.getElementById('admin-marking-body').innerHTML = students.map(s => {
    const g = gradeMap.get(s.id);
    return `<tr>
      <td>${escapeHtml(s.name)}</td>
      <td>${g ? g.score : '—'}</td>
      <td>${assessment.max_score}</td>
    </tr>`;
  }).join('') || `<tr><td colspan="3" class="muted">${t('noStudents')}</td></tr>`;
}

async function loadMasterGradebook() {
  if (!gradebookFiltersReady()) {
    clearAdminGradebook();
    return;
  }

  const grade = document.getElementById('gb-grade').value;
  const section = document.getElementById('gb-section').value;
  const subject = document.getElementById('gb-subject').value;

  const { students, assessments, grades } = await API.get(
    `/api/gradebook/class-view?grade=${encodeURIComponent(grade)}&section=${encodeURIComponent(section)}&subject=${encodeURIComponent(subject)}`
  );

  const scoreMap = new Map();
  grades.forEach(g => scoreMap.set(`${g.student_id}:${g.assessment_id}`, g));

  if (!students.length) {
    document.getElementById('admin-gradebook-matrix').innerHTML = `<p class="muted">${t('noStudents')}</p>`;
    return;
  }
  if (!assessments.length) {
    document.getElementById('admin-gradebook-matrix').innerHTML = `<p class="empty-prompt">${t('noAssessmentsYet')}</p>`;
    return;
  }

  const header = `<table><thead><tr><th>${t('student')}</th>${assessments.map(a => `
    <th>
      <div>${escapeHtml(a.name)}</div>
      <div class="muted" style="font-size:0.85em">${tAssessment(a.assessment_type)} · ${a.max_score}</div>
      ${statusBadge(a.status)}
      <div class="mt-1">
        <button class="btn btn-outline" data-view="${a.id}">${t('viewGrades')}</button>
        ${a.status === 'open'
          ? `<button class="btn btn-outline" data-close="${a.id}">${t('closeAssessment')}</button>`
          : `<button class="btn btn-outline" data-reopen="${a.id}">${t('reopenAssessment')}</button>`}
        <button class="btn btn-danger" data-del-assessment="${a.id}">${t('delete')}</button>
      </div>
    </th>`).join('')}</tr></thead><tbody>`;

  const body = students.map(student => `
    <tr>
      <td>${escapeHtml(student.name)}</td>
      ${assessments.map(a => {
        const entry = scoreMap.get(`${student.id}:${a.id}`);
        return `<td>${entry ? `${entry.score}/${entry.max_score}` : '—'}</td>`;
      }).join('')}
    </tr>`).join('');

  document.getElementById('admin-gradebook-matrix').innerHTML = header + body + '</tbody></table>';

  document.querySelectorAll('[data-view]').forEach(btn => {
    btn.addEventListener('click', () => adminViewMarks(parseInt(btn.dataset.view, 10)));
  });
  document.querySelectorAll('[data-close]').forEach(btn => {
    btn.addEventListener('click', async () => {
      await API.patch(`/api/assessments/${btn.dataset.close}`, { status: 'closed' });
      showToast(t('updated'));
      loadMasterGradebook();
    });
  });
  document.querySelectorAll('[data-reopen]').forEach(btn => {
    btn.addEventListener('click', async () => {
      await API.patch(`/api/assessments/${btn.dataset.reopen}`, { status: 'open' });
      showToast(t('updated'));
      loadMasterGradebook();
    });
  });
  document.querySelectorAll('[data-del-assessment]').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (!confirm(t('deleteAssessmentConfirm'))) return;
      try {
        await API.delete(`/api/assessments/${btn.dataset.delAssessment}`);
        showToast(t('updated'));
        loadMasterGradebook();
      } catch (err) { showToast(err.message, 'error'); }
    });
  });
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
    el.innerHTML = `<option value="">${t('selectGrade')}</option>` + grades.map(g =>
      `<option${g === saved ? ' selected' : ''}>${g}</option>`
    ).join('');
  });
  ['filter-section', 'gb-section'].forEach(id => {
    const el = document.getElementById(id);
    const saved = id === 'filter-section' ? sectionVal : gbSectionVal;
    el.innerHTML = `<option value="">${t('selectSection')}</option>` + sections.map(s =>
      `<option${s === saved ? ' selected' : ''}>${s}</option>`
    ).join('');
  });
  await populateGbSubjects();
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

async function init() {
  initLanguageToggle();
  currentUser = await requireRole('admin');
  if (!currentUser) return;
  document.getElementById('user-label').textContent = currentUser.full_name;

  onLanguageChange(() => {
    loadFilters();
    renderUsers();
    if (!document.getElementById('panel-teachers').classList.contains('section-hidden')) loadTeachers();
    if (!document.getElementById('panel-students').classList.contains('section-hidden')) {
      if (studentFiltersReady()) renderStudents();
      else clearStudentsTable();
    }
    if (!document.getElementById('panel-gradebook').classList.contains('section-hidden')) {
      if (adminActiveAssessmentId) adminViewMarks(adminActiveAssessmentId);
      else if (gradebookFiltersReady()) loadMasterGradebook();
      else clearAdminGradebook();
    }
    if (!document.getElementById('panel-logs').classList.contains('section-hidden')) renderLogs();
    if (!document.getElementById('panel-sample').classList.contains('section-hidden')) {
      resetSampleDataPreview('panel-sample');
    }
  });

  document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
      showTab(tab.dataset.tab);
      if (tab.dataset.tab === 'teachers') loadTeachers();
      if (tab.dataset.tab === 'students') loadStudents();
      if (tab.dataset.tab === 'gradebook') {
        showAdminGradebookOverview();
        loadMasterGradebook();
      }
      if (tab.dataset.tab === 'sample') resetSampleDataPreview('panel-sample');
      if (tab.dataset.tab === 'logs') loadLogs();
    });
  });

  wireSortSelect('users-sort', renderUsers);
  wireSortSelect('students-sort', renderStudents);
  wireSortSelect('logs-sort', renderLogs);

  wireAutoApply(['filter-grade', 'filter-section'], loadStudents);
  document.getElementById('gb-grade').addEventListener('change', async () => {
    await populateGbSubjects();
    showAdminGradebookOverview();
    loadMasterGradebook();
  });
  document.getElementById('gb-section').addEventListener('change', async () => {
    await populateGbSubjects();
    showAdminGradebookOverview();
    loadMasterGradebook();
  });
  document.getElementById('gb-subject').addEventListener('change', () => {
    showAdminGradebookOverview();
    loadMasterGradebook();
  });

  document.getElementById('admin-back-gradebook').addEventListener('click', () => {
    showAdminGradebookOverview();
    loadMasterGradebook();
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

  document.getElementById('logout-btn').addEventListener('click', async () => {
    await API.post('/api/auth/logout');
    window.location.href = 'index.html';
  });

  wireSampleDataPanel('panel-sample');
  await loadFilters();
  clearStudentsTable();
  clearAdminGradebook();
  await loadUsers();
}

init();
