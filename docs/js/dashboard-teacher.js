let currentUser = null;
let assignments = [];

function showTab(name) {
  document.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t.dataset.tab === name));
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.add('section-hidden'));
  document.getElementById(`panel-${name}`).classList.remove('section-hidden');
}

function parseClassSelect(val) {
  const [subject, grade, section] = val.split('|');
  return { subject, grade, section };
}

async function loadAssignments() {
  const { assignments: list } = await API.get('/api/gradebook/assignments');
  assignments = list;
  const sel = document.getElementById('class-select');
  sel.innerHTML = list.map(a =>
    `<option value="${a.subject}|${a.grade}|${a.section}">${a.subject} — ${a.grade} ${a.section}</option>`
  ).join('') || '<option value="">No classes assigned</option>';
  if (list.length) loadGradebook();
}

async function loadGradebook() {
  const val = document.getElementById('class-select').value;
  if (!val) return;
  const { subject, grade, section } = parseClassSelect(val);

  const { grades } = await API.get(
    `/api/gradebook?grade=${encodeURIComponent(grade)}&section=${encodeURIComponent(section)}&subject=${encodeURIComponent(subject)}`
  );

  const byStudent = new Map();
  grades.forEach(g => {
    const sid = g.student_id;
    if (sid && !byStudent.has(sid)) byStudent.set(sid, g);
  });
  const students = [...byStudent.values()];

  document.getElementById('gradebook-body').innerHTML = students.map(g => `
    <tr>
      <td>${escapeHtml(g.student_name || g.name || '—')}</td>
      <td><input type="number" class="grade-input input-field" style="width:5rem"
          data-student-id="${g.student_id || g.id}" min="0" step="0.5"
          value="${g.score ?? ''}" placeholder="—"></td>
      <td><input type="number" class="max-input input-field" style="width:5rem"
          data-student-id="${g.student_id || g.id}" min="1"
          value="${g.max_score ?? 100}"></td>
    </tr>`).join('') || '<tr><td colspan="3" class="muted">No students in this class</td></tr>';
}

function renderScheduleTable(container, days, entries) {
  const slots = [...new Set(entries.map(e => e.time_slot))].sort();
  const lookup = {};
  entries.forEach(e => { lookup[`${e.time_slot}|${e.day}`] = e.subject; });

  container.innerHTML = `<table><thead><tr><th>Time</th>${days.map(d => `<th>${d}</th>`).join('')}</tr></thead><tbody>
    ${slots.map(time => `<tr><td>${time}</td>${days.map(d => `<td>${lookup[`${time}|${d}`] || '—'}</td>`).join('')}</tr>`).join('')}
  </tbody></table>`;
}

async function loadSchedule() {
  const { days, entries } = await API.get('/api/schedules/teacher');
  renderScheduleTable(document.getElementById('schedule-view'), days, entries);
}

async function init() {
  currentUser = await requireRole('teacher');
  if (!currentUser) return;
  document.getElementById('user-label').textContent = currentUser.full_name;

  document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
      showTab(tab.dataset.tab);
      if (tab.dataset.tab === 'schedule') loadSchedule();
    });
  });

  document.getElementById('class-select').addEventListener('change', loadGradebook);

  document.getElementById('save-grades-btn').addEventListener('click', async () => {
    const val = document.getElementById('class-select').value;
    if (!val) return;
    const { subject, grade, section } = parseClassSelect(val);
    const assessmentType = document.getElementById('assessment-type').value;
    const assessmentName = document.getElementById('assessment-name').value.trim();
    if (!assessmentName) { showToast('Enter assessment name', 'error'); return; }

    const entries = [...document.querySelectorAll('.grade-input')].map(input => ({
      studentId: parseInt(input.dataset.studentId, 10),
      score: input.value,
      maxScore: document.querySelector(`.max-input[data-student-id="${input.dataset.studentId}"]`)?.value || 100
    }));

    try {
      await API.post('/api/gradebook/bulk', { subject, grade, section, assessmentType, assessmentName, entries });
      showToast('Grades saved');
      loadGradebook();
    } catch (err) { showToast(err.message, 'error'); }
  });

  document.getElementById('logout-btn').addEventListener('click', async () => {
    await API.post('/api/auth/logout');
    window.location.href = 'index.html';
  });

  await loadAssignments();
}

init();
