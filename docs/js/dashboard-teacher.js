let currentUser = null;
let assignments = [];
let activeAssessmentId = null;
let markingReadOnly = false;

function showTab(name) {
  document.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t.dataset.tab === name));
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.add('section-hidden'));
  document.getElementById(`panel-${name}`).classList.remove('section-hidden');
}

function uniqueSorted(values) {
  return [...new Set(values)].sort((a, b) => a.localeCompare(b));
}

function getClassFilters() {
  return {
    grade: document.getElementById('gb-grade')?.value || '',
    section: document.getElementById('gb-section')?.value || '',
    subject: document.getElementById('gb-subject')?.value || ''
  };
}

function classFiltersReady() {
  const { grade, section, subject } = getClassFilters();
  return !!(grade && section && subject);
}

function populateGradeSectionSelects(gradeSelectId, sectionSelectId, { grade = '', section = '' } = {}) {
  const grades = uniqueSorted(assignments.map(a => a.grade));
  const gradeEl = document.getElementById(gradeSelectId);
  const sectionEl = document.getElementById(sectionSelectId);

  gradeEl.innerHTML = `<option value="">${t('selectGrade')}</option>` +
    grades.map(g => `<option value="${escapeHtml(g)}"${g === grade ? ' selected' : ''}>${escapeHtml(g)}</option>`).join('');

  const selectedGrade = gradeEl.value;
  const sections = uniqueSorted(
    assignments.filter(a => a.grade === selectedGrade).map(a => a.section)
  );
  sectionEl.innerHTML = `<option value="">${t('selectSection')}</option>` +
    sections.map(s => `<option value="${escapeHtml(s)}"${s === section ? ' selected' : ''}>${escapeHtml(s)}</option>`).join('');
}

async function populateSubjectSelect(selectId, grade, section, saved = '') {
  const el = document.getElementById(selectId);
  if (!grade || !section) {
    el.innerHTML = `<option value="">${t('selectSubject')}</option>`;
    return;
  }
  const { subjects } = await API.get(
    `/api/assessments/subjects?grade=${encodeURIComponent(grade)}&section=${encodeURIComponent(section)}`
  );
  el.innerHTML = `<option value="">${t('selectSubject')}</option>` +
    subjects.map(s => `<option value="${escapeHtml(s)}"${s === saved ? ' selected' : ''}>${escapeHtml(s)}</option>`).join('');
}

function statusBadge(status) {
  const cls = status === 'open' ? 'status-open' : 'status-closed';
  const label = status === 'open' ? t('assessmentOpen') : t('assessmentClosed');
  return `<span class="status-badge ${cls}">${label}</span>`;
}

function clearGradebookMatrix() {
  document.getElementById('gradebook-matrix-wrap').innerHTML =
    emptyPanelPrompt('selectGradeSectionSubjectHint');
}

function showGradebookOverview() {
  activeAssessmentId = null;
  document.getElementById('gradebook-overview').classList.remove('section-hidden');
  document.getElementById('gradebook-marking').classList.add('section-hidden');
}

function showMarkingView() {
  document.getElementById('gradebook-overview').classList.add('section-hidden');
  document.getElementById('gradebook-marking').classList.remove('section-hidden');
}

async function loadAssignments() {
  const { assignments: list } = await API.get('/api/gradebook/assignments');
  assignments = list;

  const { grade, section, subject } = getClassFilters();
  populateGradeSectionSelects('gb-grade', 'gb-section', { grade, section });
  await populateSubjectSelect('gb-subject', document.getElementById('gb-grade').value, document.getElementById('gb-section').value, subject);

  const newGrade = document.getElementById('new-grade')?.value || grade;
  const newSection = document.getElementById('new-section')?.value || section;
  populateGradeSectionSelects('new-grade', 'new-section', { grade: newGrade, section: newSection });
  await populateSubjectSelect('new-subject', document.getElementById('new-grade').value, document.getElementById('new-section').value, document.getElementById('new-subject')?.value || subject);
}

async function loadClassGradebook() {
  if (!classFiltersReady()) {
    clearGradebookMatrix();
    return;
  }

  const { grade, section, subject } = getClassFilters();
  const { students, assessments, grades } = await API.get(
    `/api/gradebook/class-view?grade=${encodeURIComponent(grade)}&section=${encodeURIComponent(section)}&subject=${encodeURIComponent(subject)}`
  );

  const scoreMap = new Map();
  grades.forEach(g => scoreMap.set(`${g.student_id}:${g.assessment_id}`, g));

  if (!students.length) {
    document.getElementById('gradebook-matrix-wrap').innerHTML = `<p class="muted">${t('noStudents')}</p>`;
    return;
  }

  if (!assessments.length) {
    document.getElementById('gradebook-matrix-wrap').innerHTML = `<p class="empty-prompt">${t('noAssessmentsYet')}</p>`;
    return;
  }

  const header = `
    <table><thead><tr>
      <th>${t('student')}</th>
      ${assessments.map(a => `
        <th>
          <div>${escapeHtml(a.name)}</div>
          <div class="muted" style="font-size:0.85em">${tAssessment(a.assessment_type)} · ${a.max_score}</div>
          ${statusBadge(a.status)}
          <div class="mt-1">
            ${a.status === 'open'
              ? `<button class="btn btn-outline" data-mark="${a.id}">${t('enterGrades')}</button>`
              : `<button class="btn btn-outline" data-view="${a.id}">${t('viewGrades')}</button>`}
          </div>
        </th>`).join('')}
    </tr></thead><tbody>`;

  const body = students.map(student => `
    <tr>
      <td>${escapeHtml(student.name)}</td>
      ${assessments.map(a => {
        const entry = scoreMap.get(`${student.id}:${a.id}`);
        return `<td>${entry ? `${entry.score}/${entry.max_score}` : '—'}</td>`;
      }).join('')}
    </tr>`).join('');

  document.getElementById('gradebook-matrix-wrap').innerHTML = header + body + '</tbody></table>';

  document.querySelectorAll('[data-mark]').forEach(btn => {
    btn.addEventListener('click', () => openMarking(parseInt(btn.dataset.mark, 10), false));
  });
  document.querySelectorAll('[data-view]').forEach(btn => {
    btn.addEventListener('click', () => openMarking(parseInt(btn.dataset.view, 10), true));
  });
}

async function openMarking(assessmentId, readOnly = false) {
  activeAssessmentId = assessmentId;
  markingReadOnly = readOnly;
  showMarkingView();

  const { assessment, students, grades } = await API.get(`/api/assessments/${assessmentId}/marks`);
  const gradeMap = new Map(grades.map(g => [g.student_id, g]));
  const isOpen = assessment.status === 'open' && !readOnly;

  document.getElementById('marking-title').textContent = assessment.name;
  document.getElementById('marking-meta').innerHTML =
    `${tAssessment(assessment.assessment_type)} · ${escapeHtml(assessment.subject)} · ${escapeHtml(assessment.grade_level)} ${escapeHtml(assessment.section)} · ${t('maxScore')}: ${assessment.max_score} · ${statusBadge(assessment.status)}`;

  document.getElementById('marking-body').innerHTML = students.map(s => {
    const g = gradeMap.get(s.id);
    const scoreCell = isOpen
      ? `<input type="number" class="mark-input input-field" style="width:5rem"
          data-student-id="${s.id}" min="0" max="${assessment.max_score}" step="0.5"
          value="${g?.score ?? ''}" placeholder="—">`
      : (g ? g.score : '—');
    return `<tr>
      <td>${escapeHtml(s.name)}</td>
      <td>${scoreCell}</td>
      <td>${assessment.max_score}</td>
    </tr>`;
  }).join('') || `<tr><td colspan="3" class="muted">${t('noStudents')}</td></tr>`;

  document.getElementById('save-marks-btn').classList.toggle('section-hidden', !isOpen);
  document.getElementById('close-assessment-btn').classList.toggle('section-hidden', !isOpen);
  document.getElementById('delete-assessment-btn')?.classList.toggle('section-hidden', !isOpen);
}

async function saveMarks() {
  if (!activeAssessmentId) return;
  const entries = [...document.querySelectorAll('.mark-input')].map(input => ({
    studentId: parseInt(input.dataset.studentId, 10),
    score: input.value
  }));

  try {
    await API.post(`/api/assessments/${activeAssessmentId}/marks`, { entries });
    showToast(t('gradesSaved'));
    showGradebookOverview();
    await loadClassGradebook();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function deleteActiveAssessment() {
  if (!activeAssessmentId) return;
  if (!confirm(t('deleteAssessmentConfirm'))) return;
  try {
    await API.delete(`/api/assessments/${activeAssessmentId}`);
    showToast(t('updated'));
    showGradebookOverview();
    await loadClassGradebook();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function closeActiveAssessment() {
  if (!activeAssessmentId) return;
  try {
    await API.patch(`/api/assessments/${activeAssessmentId}`, { status: 'closed' });
    showToast(t('updated'));
    showGradebookOverview();
    await loadClassGradebook();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function renderScheduleTable(container, days, entries) {
  const slots = [...new Set(entries.map(e => e.time_slot))].sort();
  const lookup = {};
  entries.forEach(e => { lookup[`${e.time_slot}|${e.day}`] = e.subject; });

  container.innerHTML = `<table><thead><tr><th>${t('time')}</th>${days.map(d => `<th>${tDay(d)}</th>`).join('')}</tr></thead><tbody>
    ${slots.map(time => `<tr><td>${time}</td>${days.map(d => `<td>${lookup[`${time}|${d}`] || '—'}</td>`).join('')}</tr>`).join('')}
  </tbody></table>`;
}

async function loadSchedule() {
  const { days, entries } = await API.get('/api/schedules/teacher');
  renderScheduleTable(document.getElementById('schedule-view'), days, entries);
}

function syncNewAssessmentFromGradebook() {
  const { grade, section, subject } = getClassFilters();
  if (grade) document.getElementById('new-grade').value = grade;
  if (section) document.getElementById('new-section').value = section;
  populateGradeSectionSelects('new-grade', 'new-section', { grade, section });
  populateSubjectSelect('new-subject', grade, section, subject);
}

function wireDownloads() {
  document.getElementById('download-gradebook-btn')?.addEventListener('click', () => {
    downloadFile('/api/exports/grades', 'my-gradebook.xlsx').catch(err => showToast(err.message, 'error'));
  });
  document.getElementById('download-schedule-btn')?.addEventListener('click', () => {
    downloadFile('/api/exports/schedules', 'my-schedule.xlsx').catch(err => showToast(err.message, 'error'));
  });
  wireSampleDataPanel('panel-data');
}

async function init() {
  initLanguageToggle();
  currentUser = await requireRole('teacher');
  if (!currentUser) return;
  document.getElementById('user-label').textContent = currentUser.full_name;

  onLanguageChange(async () => {
    await loadAssignments();
    if (!document.getElementById('panel-schedule').classList.contains('section-hidden')) loadSchedule();
    if (!document.getElementById('panel-gradebook').classList.contains('section-hidden')) {
      if (activeAssessmentId) await openMarking(activeAssessmentId, markingReadOnly);
      else await loadClassGradebook();
    }
    if (!document.getElementById('panel-data').classList.contains('section-hidden')) {
      resetSampleDataPreview('panel-data');
    }
  });

  document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
      showTab(tab.dataset.tab);
      if (tab.dataset.tab === 'schedule') loadSchedule();
      if (tab.dataset.tab === 'gradebook') {
        showGradebookOverview();
        loadClassGradebook();
      }
      if (tab.dataset.tab === 'assessment') syncNewAssessmentFromGradebook();
      if (tab.dataset.tab === 'data') resetSampleDataPreview('panel-data');
    });
  });

  document.getElementById('gb-grade').addEventListener('change', async () => {
    populateGradeSectionSelects('gb-grade', 'gb-section');
    await populateSubjectSelect('gb-subject', document.getElementById('gb-grade').value, document.getElementById('gb-section').value);
    showGradebookOverview();
    loadClassGradebook();
  });

  document.getElementById('gb-section').addEventListener('change', async () => {
    await populateSubjectSelect('gb-subject', document.getElementById('gb-grade').value, document.getElementById('gb-section').value);
    showGradebookOverview();
    loadClassGradebook();
  });

  document.getElementById('gb-subject').addEventListener('change', () => {
    showGradebookOverview();
    loadClassGradebook();
  });

  document.getElementById('new-grade').addEventListener('change', async () => {
    populateGradeSectionSelects('new-grade', 'new-section');
    await populateSubjectSelect('new-subject', document.getElementById('new-grade').value, document.getElementById('new-section').value);
  });

  document.getElementById('new-section').addEventListener('change', async () => {
    await populateSubjectSelect('new-subject', document.getElementById('new-grade').value, document.getElementById('new-section').value);
  });

  document.getElementById('goto-new-assessment-btn').addEventListener('click', () => {
    syncNewAssessmentFromGradebook();
    showTab('assessment');
  });

  document.getElementById('back-to-gradebook-btn').addEventListener('click', () => {
    showGradebookOverview();
    loadClassGradebook();
  });

  document.getElementById('save-marks-btn').addEventListener('click', saveMarks);
  document.getElementById('close-assessment-btn').addEventListener('click', closeActiveAssessment);
  document.getElementById('delete-assessment-btn')?.addEventListener('click', deleteActiveAssessment);

  document.getElementById('create-assessment-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const grade = document.getElementById('new-grade').value;
    const section = document.getElementById('new-section').value;
    const subject = document.getElementById('new-subject').value;
    const assessmentType = document.getElementById('new-type').value;
    const name = document.getElementById('new-name').value.trim();
    const maxScore = document.getElementById('new-max').value;

    try {
      const { assessment } = await API.post('/api/assessments', {
        grade, section, subject, assessmentType, name, maxScore
      });
      showToast(t('assessmentCreated'));
      e.target.reset();
      document.getElementById('new-max').value = 100;

      document.getElementById('gb-grade').value = grade;
      populateGradeSectionSelects('gb-grade', 'gb-section', { grade, section });
      await populateSubjectSelect('gb-subject', grade, section, subject);
      document.getElementById('gb-subject').value = subject;

      showTab('gradebook');
      await openMarking(assessment.id);
    } catch (err) {
      showToast(err.message, 'error');
    }
  });

  document.getElementById('logout-btn').addEventListener('click', async () => {
    await API.post('/api/auth/logout');
    window.location.href = 'index.html';
  });

  wireDownloads();
  clearGradebookMatrix();
  await Promise.all([loadSchedule(), loadAssignments()]);
}

init();
