let currentUser = null;
let filters = { grades: [], sections: [], combos: [] };

const roleIcons = {
  admin: '🛡️ Admin',
  teacher: '👨‍🏫 Teacher',
  parent: '👪 Parent',
  student: '🎓 Student'
};

function showSection(name) {
  document.querySelectorAll('.app-section').forEach(s => s.classList.add('section-hidden'));
  document.getElementById(`section-${name}`).classList.remove('section-hidden');

  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.classList.toggle('nav-active', btn.dataset.section === name);
  });

  document.getElementById('mobile-nav').classList.add('hidden');
}

async function loadDashboard() {
  const [{ stats }, { announcements }] = await Promise.all([
    API.get('/api/dashboard/stats'),
    API.get('/api/dashboard/announcements')
  ]);

  document.getElementById('stat-students-value').textContent = stats.totalStudents;
  document.getElementById('stat-classes-value').textContent = stats.classCombos;
  document.getElementById('stat-grades-value').textContent = stats.pendingGrades;

  const ann = announcements[0];
  document.getElementById('announcement-text').textContent = ann
    ? ann.body
    : 'No announcements at this time.';
}

async function loadFilters() {
  filters = await API.get('/api/students/filters');

  const gradeSelects = ['schedule-grade', 'student-grade'];
  const sectionSelects = ['schedule-section', 'student-section'];
  const classSelect = document.getElementById('grade-class');

  if (filters.grades.length) {
    gradeSelects.forEach(id => {
      const el = document.getElementById(id);
      if (!el) return;
      const current = el.value;
      el.innerHTML = (id === 'student-grade'
        ? ['Grade 5', 'Grade 6', 'Grade 7']
        : filters.grades
      ).map(g => `<option>${g}</option>`).join('');
      if (current) el.value = current;
    });
  }

  if (filters.sections.length) {
    sectionSelects.forEach(id => {
      const el = document.getElementById(id);
      if (!el) return;
      const opts = id === 'student-section'
        ? ['Section A', 'Section B', 'Section C']
        : filters.sections;
      el.innerHTML = opts.map(s => `<option>${s}</option>`).join('');
    });
  }

  if (classSelect && filters.combos.length) {
    classSelect.innerHTML = filters.combos.map(c =>
      `<option value="${c.grade}|${c.section}">${c.grade} - ${c.section}</option>`
    ).join('');
  }
}

async function loadSchedule() {
  const grade = document.getElementById('schedule-grade').value;
  const section = document.getElementById('schedule-section').value;
  const { days, rows } = await API.get(
    `/api/schedule?grade=${encodeURIComponent(grade)}&section=${encodeURIComponent(section)}`
  );

  document.getElementById('schedule-head').innerHTML =
    `<th class="px-4 py-3 text-left font-bold text-blue-700">Time</th>` +
    days.map(d => `<th class="px-4 py-3 text-center font-bold text-blue-700">${d}</th>`).join('');

  document.getElementById('schedule-body').innerHTML = rows.map(row => `
    <tr class="hover:bg-blue-50">
      <td class="px-4 py-3 text-blue-600 font-medium">${row.time}</td>
      ${days.map(d => `<td class="px-4 py-3 text-center text-blue-700">${row.days[d]}</td>`).join('')}
    </tr>
  `).join('');
}

async function loadGradesTable() {
  const classVal = document.getElementById('grade-class').value;
  if (!classVal) return;
  const [grade, section] = classVal.split('|');
  const examType = document.getElementById('grade-exam').value;

  const { grades } = await API.get(
    `/api/grades?grade=${encodeURIComponent(grade)}&section=${encodeURIComponent(section)}&examType=${encodeURIComponent(examType)}`
  );

  document.getElementById('grades-body').innerHTML = grades.map((g, i) => `
    <tr class="hover:bg-green-50">
      <td class="px-4 py-3 text-green-600">${i + 1}</td>
      <td class="px-4 py-3 text-green-700 font-medium">${g.name}</td>
      <td class="px-4 py-3 text-center">
        <input type="number" min="0" max="100" data-student-id="${g.id}"
          class="grade-input w-20 border-2 border-green-200 rounded-lg px-2 py-1 text-center text-sm focus:outline-none focus:ring-2 focus:ring-green-300 font-medium"
          value="${g.score ?? ''}" placeholder="—">
      </td>
    </tr>
  `).join('');
}

async function loadStudentsList() {
  const { students } = await API.get('/api/students');
  document.getElementById('students-list').innerHTML = students.length
    ? students.map(s => `
      <tr class="hover:bg-gray-50">
        <td class="px-4 py-3 font-medium text-gray-800">${s.name}</td>
        <td class="px-4 py-3 text-gray-600">${s.grade}</td>
        <td class="px-4 py-3 text-gray-600">${s.section}</td>
        <td class="px-4 py-3 text-gray-500">${s.parent_phone || '—'}</td>
      </tr>
    `).join('')
    : '<tr><td colspan="4" class="px-4 py-8 text-center text-gray-400">No students yet</td></tr>';
}

function setupRoleUI() {
  document.getElementById('role-display').textContent =
    roleIcons[currentUser.role] || currentUser.role;

  document.getElementById('welcome-heading').textContent =
    `Welcome back, ${currentUser.full_name} 👋`;

  const isAdmin = currentUser.role === 'admin';
  document.getElementById('admin-link').classList.toggle('hidden', !isAdmin);
  document.getElementById('admin-link-mobile').classList.toggle('hidden', !isAdmin);

  const canEdit = ['admin', 'teacher'].includes(currentUser.role);
  document.getElementById('student-form').classList.toggle('hidden', !canEdit);
  document.getElementById('grades-actions').classList.toggle('hidden', !canEdit);
}

function bindEvents() {
  document.querySelectorAll('[data-section]').forEach(el => {
    el.addEventListener('click', () => showSection(el.dataset.section));
  });

  document.getElementById('mobile-menu-btn').addEventListener('click', () => {
    document.getElementById('mobile-nav').classList.toggle('hidden');
  });

  const logout = async () => {
    await API.post('/api/auth/logout');
    window.location.href = '/login.html';
  };
  document.getElementById('logout-btn').addEventListener('click', logout);
  document.getElementById('logout-btn-mobile').addEventListener('click', logout);

  document.getElementById('schedule-grade').addEventListener('change', loadSchedule);
  document.getElementById('schedule-section').addEventListener('change', loadSchedule);
  document.getElementById('grade-class').addEventListener('change', loadGradesTable);
  document.getElementById('grade-exam').addEventListener('change', loadGradesTable);

  document.getElementById('save-grades-btn').addEventListener('click', async () => {
    const examType = document.getElementById('grade-exam').value;
    const entries = [...document.querySelectorAll('.grade-input')].map(input => ({
      studentId: parseInt(input.dataset.studentId, 10),
      score: input.value
    }));

    try {
      await API.post('/api/grades/bulk', { examType, entries });
      showToast(t('grade-success'));
      loadDashboard();
    } catch (err) {
      showToast(err.message, 'error');
    }
  });

  document.getElementById('student-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      await API.post('/api/students', {
        name: document.getElementById('student-name').value,
        grade: document.getElementById('student-grade').value,
        section: document.getElementById('student-section').value,
        parentPhone: document.getElementById('parent-phone').value
      });
      showToast(t('form-success'));
      e.target.reset();
      await Promise.all([loadStudentsList(), loadFilters(), loadDashboard()]);
    } catch (err) {
      showToast(err.message, 'error');
    }
  });
}

async function init() {
  lucide.createIcons();
  initLanguageToggle();

  currentUser = await requireAuth();
  if (!currentUser) return;

  setupRoleUI();
  bindEvents();

  await loadFilters();
  await Promise.all([
    loadDashboard(),
    loadSchedule(),
    loadGradesTable(),
    loadStudentsList()
  ]);
}

init();
