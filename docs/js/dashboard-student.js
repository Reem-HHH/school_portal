let currentUser = null;
let selectedStudentId = null;
let children = [];

function showTab(name) {
  document.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t.dataset.tab === name));
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.add('section-hidden'));
  document.getElementById(`panel-${name}`).classList.remove('section-hidden');
}

function renderScheduleTable(container, days, entries) {
  const slots = [...new Set(entries.map(e => e.time_slot))].sort();
  const lookup = {};
  entries.forEach(e => { lookup[`${e.time_slot}|${e.day}`] = e.subject; });
  container.innerHTML = `<table><thead><tr><th>Time</th>${days.map(d => `<th>${d}</th>`).join('')}</tr></thead><tbody>
    ${slots.map(time => `<tr><td>${time}</td>${days.map(d => `<td>${lookup[`${time}|${d}`] || '—'}</td>`).join('')}</tr>`).join('')}
  </tbody></table>`;
}

async function loadProfile() {
  if (currentUser.role === 'parent') {
    const { children: list } = await API.get('/api/students/me');
    children = list;
    if (!list.length) {
      document.getElementById('profile-card').innerHTML = '<p class="muted">No linked children. Contact admin.</p>';
      return;
    }
    document.getElementById('parent-picker').classList.remove('section-hidden');
    document.getElementById('portal-title').textContent = 'Parent Portal';
    const sel = document.getElementById('child-select');
    sel.innerHTML = list.map(c => `<option value="${c.id}">${escapeHtml(c.name)} (${c.grade} ${c.section})</option>`).join('');
    selectedStudentId = list[0].id;
    sel.onchange = () => { selectedStudentId = sel.value; refreshStudentData(); };
    await showStudentProfile(list[0]);
    return;
  }

  const { student } = await API.get('/api/students/me');
  if (!student) {
    document.getElementById('profile-card').innerHTML = '<p class="muted">No student profile linked to your account.</p>';
    return;
  }
  selectedStudentId = student.id;
  await showStudentProfile(student);
}

async function showStudentProfile(student) {
  document.getElementById('profile-card').innerHTML = `
    <p><strong>Name:</strong> ${escapeHtml(student.name)}</p>
    <p><strong>Grade:</strong> ${escapeHtml(student.grade)}</p>
    <p><strong>Section:</strong> ${escapeHtml(student.section)}</p>
    ${student.date_of_birth ? `<p><strong>Date of birth:</strong> ${escapeHtml(student.date_of_birth)}</p>` : ''}
    ${student.parent_name ? `<p><strong>Parent:</strong> ${escapeHtml(student.parent_name)}</p>` : ''}`;
}

async function loadSchedule() {
  if (!selectedStudentId && currentUser.role === 'parent') return;
  let url = '/api/schedules/class';
  if (currentUser.role === 'parent') url += `?studentId=${selectedStudentId}`;
  const { days, entries, grade, section } = await API.get(url);
  if (grade) {
    document.querySelector('#panel-schedule h2').textContent = `Timetable — ${grade} ${section}`;
  }
  renderScheduleTable(document.getElementById('schedule-view'), days, entries);
}

async function loadGrades() {
  if (!selectedStudentId && currentUser.role === 'parent') return;
  let url = '/api/gradebook';
  if (currentUser.role === 'parent') url += `?studentId=${selectedStudentId}`;
  const { grades } = await API.get(url);
  document.getElementById('grades-table').innerHTML = grades.map(g => `
    <tr>
      <td>${escapeHtml(g.subject)}</td>
      <td>${escapeHtml(g.assessment_type)}</td>
      <td>${escapeHtml(g.assessment_name)}</td>
      <td>${g.score}/${g.max_score}</td>
      <td>${escapeHtml(g.teacher_name || '—')}</td>
    </tr>`).join('') || '<tr><td colspan="5" class="muted">No grades yet</td></tr>';
}

async function refreshStudentData() {
  if (currentUser.role === 'parent') {
    const child = children.find(c => String(c.id) === String(selectedStudentId));
    if (child) await showStudentProfile(child);
  }
  await loadSchedule();
  await loadGrades();
}

async function init() {
  const user = await requireAuth();
  if (!user) return;
  if (user.role !== 'student' && user.role !== 'parent') {
    window.location.href = dashboardForRole(user.role);
    return;
  }
  currentUser = user;
  document.getElementById('user-label').textContent = user.full_name;

  document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
      showTab(tab.dataset.tab);
      if (tab.dataset.tab === 'schedule') loadSchedule();
      if (tab.dataset.tab === 'grades') loadGrades();
    });
  });

  document.getElementById('logout-btn').addEventListener('click', async () => {
    await API.post('/api/auth/logout');
    window.location.href = 'index.html';
  });

  await loadProfile();
}

init();
