let currentLang = localStorage.getItem('lang') || 'en';
const langChangeListeners = [];

const translations = {
  en: {
    logo: 'Al Kharran Primary School',
    schoolSubtitle: 'Al Kharran · Grades 1–4',
    moeLogoAlt: 'UAE Ministry of Education',
    adminDashboard: 'Admin Dashboard',
    teacherDashboard: 'Teacher Dashboard',
    studentPortal: 'Student Portal',
    parentPortal: 'Parent Portal',
    home: 'Home',
    schedules: 'Schedules',
    grades: 'Grades',
    admin: 'Admin',
    logout: 'Logout',
    welcome: 'Welcome',
    selectSchedule: 'Select a schedule',
    selectGrades: 'Select a grade report',
    noUploads: 'Nothing published yet.',
    login: 'Sign in',
    email: 'Email',
    password: 'Password',
    name: 'Full name',
    role: 'Role',
    signIn: 'Sign in',
    adminCreatesAccounts: 'Accounts are created by your school administrator.',
    grade: 'Grade',
    section: 'Section',
    gradePlaceholder: 'e.g. Grade 1',
    sectionPlaceholder: 'e.g. Section A',
    tabUsers: 'Users',
    tabTeachers: 'Teachers',
    tabStudents: 'Students',
    tabGradebook: 'Gradebook',
    tabNewAssessment: 'New Assessment',
    tabMasterGradebook: 'Master Gradebook',
    tabUploads: 'Uploads',
    tabLogs: 'Activity Log',
    tabSampleData: 'Sample Data',
    tabProfile: 'Profile',
    tabSchedule: 'My Schedule',
    tabTimetable: 'Timetable',
    tabMyGrades: 'My Grades',
    createUser: 'Create user',
    createUserBtn: 'Create user',
    teacherDirectory: 'Teacher directory',
    studentDirectory: 'Student directory',
    masterGradebook: 'Master gradebook',
    formativeGradebook: 'Formative assessment gradebook',
    classGradebook: 'Class gradebook',
    selectSubject: 'Select subject',
    selectGradeSectionSubjectHint: 'Please select a grade, section, and subject to view the gradebook.',
    enterGrades: 'Enter grades',
    createAssessment: 'Create assessment',
    assessmentCreated: 'Assessment created',
    backToGradebook: 'Back to gradebook',
    markStudents: 'Mark students',
    maxScore: 'Maximum score',
    assessmentOpen: 'Open',
    assessmentClosed: 'Closed',
    closeAssessment: 'Close assessment',
    noAssessmentsYet: 'No assessments yet. Create one to start marking.',
    newAssessmentDesc: 'Set up a new assessment before entering student scores.',
    noneLinked: 'None',
    assignClass: 'Assign class',
    teacherAssignments: 'Teacher assignments',
    teacherAssignmentsDesc: 'Assign teachers to classes by subject, grade, and section.',
    selectTeacher: 'Select teacher',
    allTeachers: 'All teachers',
    allSubjects: 'All subjects',
    teacherRoster: 'Teacher roster',
    classesAssigned: 'classes',
    noAssignmentsYet: 'No assignments yet. Use the form above to assign a teacher to a class.',
    assignmentAdded: 'Assignment added',
    remove: 'Remove',
    removeAssignmentConfirm: 'Remove this teacher assignment?',
    viewGrades: 'View grades',
    reopenAssessment: 'Reopen assessment',
    deleteAssessment: 'Delete assessment',
    deleteAssessmentConfirm: 'Delete this assessment and all its grades?',
    personalInfo: 'Personal information',
    formativeGrades: 'Formative grades',
    mySchedule: 'My schedule',
    class: 'Class',
    assessmentType: 'Assessment type',
    assessmentName: 'Assessment name',
    student: 'Student',
    score: 'Score',
    outOf: 'Out of',
    saveGrades: 'Save grades',
    downloadGradebook: 'Download gradebook (Excel)',
    downloadSchedule: 'Download schedule (Excel)',
    downloadStudents: 'Download students (Excel)',
    downloadTeachers: 'Download teachers (Excel)',
    downloadGrades: 'Download grades (Excel)',
    downloadSchedules: 'Download class schedules (Excel)',
    previewStudents: 'Preview students',
    previewTeachers: 'Preview teachers',
    previewGrades: 'Preview grades',
    previewSchedules: 'Preview schedules',
    sampleDataTitle: 'Sample data',
    sampleDataDesc: 'Preview sample data in your browser, then download a branded Excel file when ready.',
    samplePreviewHint: 'Click Preview to view data below. Use Download to save a branded Excel file.',
    loadingPreview: 'Loading preview…',
    previewEmpty: 'No rows to display.',
    previewFailed: 'Preview failed',
    filter: 'Filter',
    sortBy: 'Sort by',
    sortNameAsc: 'Name (A–Z)',
    sortNameDesc: 'Name (Z–A)',
    sortEmailAsc: 'Email (A–Z)',
    sortRole: 'Role',
    sortNewest: 'Newest first',
    sortOldest: 'Oldest first',
    sortGrade: 'Grade',
    sortSection: 'Section',
    sortScoreHigh: 'Score (high to low)',
    sortScoreLow: 'Score (low to high)',
    sortSubject: 'Subject',
    sortStudent: 'Student (A–Z)',
    sortTimeNewest: 'Time (newest)',
    sortTimeOldest: 'Time (oldest)',
    sortUser: 'User (A–Z)',
    sortAction: 'Action',
    apply: 'Apply',
    addStudent: 'Add student',
    allGrades: 'All grades',
    allSections: 'All sections',
    selectGrade: 'Select grade',
    selectSection: 'Select section',
    selectClass: 'Select class',
    selectGradeSectionHint: 'Please select a grade and section above to view gradebook data.',
    selectGradeSectionStudentsHint: 'Please select a grade and section above to view students in that class.',
    selectClassGradebookHint: 'Please select a class above to view students and enter grades.',
    selectSamplePreviewHint: 'Choose a dataset above and click Preview to view sample data here.',
    selectChildHint: 'Please select a child above to view their timetable and grades.',
    subjectFilter: 'Subject filter',
    status: 'Status',
    active: 'Active',
    inactive: 'Inactive',
    delete: 'Delete',
    parent: 'Parent',
    linkedUser: 'Linked user',
    type: 'Type',
    assessment: 'Assessment',
    teacher: 'Teacher',
    subject: 'Subject',
    time: 'Time',
    viewingChild: 'Viewing child',
    uploadSchedule: 'Upload schedule',
    uploadGradesFile: 'Upload grades file',
    title: 'Title',
    label: 'Label',
    file: 'File',
    uploadScheduleBtn: 'Upload schedule',
    uploadGradesBtn: 'Upload grades',
    noStudents: 'No students in this class',
    noGrades: 'No grades yet',
    noTeachers: 'No teachers',
    noLinkedChildren: 'No linked children. Contact admin.',
    noStudentProfile: 'No student profile linked to your account.',
    enterAssessmentName: 'Enter assessment name',
    gradesSaved: 'Grades saved',
    uploaded: 'Uploaded',
    userCreated: 'User created',
    studentAdded: 'Student added',
    updated: 'Updated',
    noClasses: 'No classes assigned',
    quiz: 'Quiz',
    exam: 'Exam',
    assignment: 'Assignment',
    timetableFor: 'Timetable —',
    nameLabel: 'Name:',
    gradeLabel: 'Grade:',
    sectionLabel: 'Section:',
    dobLabel: 'Date of birth:',
    parentLabel: 'Parent:',
    teacherLoginHint: 'Teacher login: teacher@school.com / teacher123',
    daySun: 'Sun',
    dayMon: 'Mon',
    dayTue: 'Tue',
    dayWed: 'Wed',
    dayThu: 'Thu'
  },
  ar: {
    logo: 'مدرسة الخران الابتدائية',
    schoolSubtitle: 'الخران · الصفوف 1–4',
    moeLogoAlt: 'وزارة التربية والتعليم',
    adminDashboard: 'لوحة الإدارة',
    teacherDashboard: 'لوحة المعلم',
    studentPortal: 'بوابة الطالب',
    parentPortal: 'بوابة ولي الأمر',
    home: 'الرئيسية',
    schedules: 'الجداول',
    grades: 'الدرجات',
    admin: 'الإدارة',
    logout: 'خروج',
    welcome: 'مرحباً',
    selectSchedule: 'اختر جدولاً',
    selectGrades: 'اختر تقرير درجات',
    noUploads: 'لا يوجد محتوى منشور بعد.',
    login: 'تسجيل الدخول',
    email: 'البريد',
    password: 'كلمة المرور',
    name: 'الاسم',
    role: 'الدور',
    signIn: 'دخول',
    adminCreatesAccounts: 'يتم إنشاء الحسابات من قبل مسؤول المدرسة.',
    grade: 'الصف',
    section: 'الشعبة',
    gradePlaceholder: 'مثال: Grade 1',
    sectionPlaceholder: 'مثال: Section A',
    tabUsers: 'المستخدمون',
    tabTeachers: 'المعلمون',
    tabStudents: 'الطلاب',
    tabGradebook: 'سجل الدرجات',
    tabNewAssessment: 'تقييم جديد',
    tabMasterGradebook: 'سجل الدرجات الرئيسي',
    tabUploads: 'الرفع',
    tabLogs: 'سجل النشاط',
    tabSampleData: 'بيانات تجريبية',
    tabProfile: 'الملف الشخصي',
    tabSchedule: 'جدولي',
    tabTimetable: 'الجدول الدراسي',
    tabMyGrades: 'درجاتي',
    createUser: 'إنشاء مستخدم',
    createUserBtn: 'إنشاء مستخدم',
    teacherDirectory: 'دليل المعلمين',
    studentDirectory: 'دليل الطلاب',
    masterGradebook: 'سجل الدرجات الرئيسي',
    formativeGradebook: 'سجل التقييمات التكوينية',
    classGradebook: 'سجل درجات الصف',
    selectSubject: 'اختر المادة',
    selectGradeSectionSubjectHint: 'يرجى اختيار الصف والشعبة والمادة لعرض سجل الدرجات.',
    enterGrades: 'إدخال الدرجات',
    createAssessment: 'إنشاء تقييم',
    assessmentCreated: 'تم إنشاء التقييم',
    backToGradebook: 'العودة إلى سجل الدرجات',
    markStudents: 'تسجيل درجات الطلاب',
    maxScore: 'الدرجة القصوى',
    assessmentOpen: 'مفتوح',
    assessmentClosed: 'مغلق',
    closeAssessment: 'إغلاق التقييم',
    noAssessmentsYet: 'لا توجد تقييمات بعد. أنشئ تقييماً لبدء التسجيل.',
    newAssessmentDesc: 'قم بإعداد التقييم قبل إدخال درجات الطلاب.',
    noneLinked: 'لا أحد',
    assignClass: 'تعيين صف',
    teacherAssignments: 'تعيينات المعلمين',
    teacherAssignmentsDesc: 'عيّن المعلمين للصفوف حسب المادة والصف والشعبة.',
    selectTeacher: 'اختر المعلم',
    allTeachers: 'جميع المعلمين',
    allSubjects: 'جميع المواد',
    teacherRoster: 'قائمة المعلمين',
    classesAssigned: 'صفوف',
    noAssignmentsYet: 'لا توجد تعيينات بعد. استخدم النموذج أعلاه لتعيين معلم لصف.',
    assignmentAdded: 'تمت إضافة التعيين',
    remove: 'إزالة',
    removeAssignmentConfirm: 'إزالة تعيين المعلم هذا؟',
    viewGrades: 'عرض الدرجات',
    reopenAssessment: 'إعادة فتح التقييم',
    deleteAssessment: 'حذف التقييم',
    deleteAssessmentConfirm: 'حذف هذا التقييم وجميع درجاته؟',
    personalInfo: 'المعلومات الشخصية',
    formativeGrades: 'الدرجات التكوينية',
    mySchedule: 'جدولي',
    class: 'الصف',
    assessmentType: 'نوع التقييم',
    assessmentName: 'اسم التقييم',
    student: 'الطالب',
    score: 'الدرجة',
    outOf: 'من',
    saveGrades: 'حفظ الدرجات',
    downloadGradebook: 'تحميل سجل الدرجات (Excel)',
    downloadSchedule: 'تحميل الجدول (Excel)',
    downloadStudents: 'تحميل الطلاب (Excel)',
    downloadTeachers: 'تحميل المعلمين (Excel)',
    downloadGrades: 'تحميل الدرجات (Excel)',
    downloadSchedules: 'تحميل جداول الصفوف (Excel)',
    previewStudents: 'معاينة الطلاب',
    previewTeachers: 'معاينة المعلمين',
    previewGrades: 'معاينة الدرجات',
    previewSchedules: 'معاينة الجداول',
    sampleDataTitle: 'البيانات التجريبية',
    sampleDataDesc: 'اعرض البيانات التجريبية في المتصفح، ثم حمّل ملف Excel بالهوية البصرية للمدرسة.',
    samplePreviewHint: 'اضغط معاينة لعرض البيانات أدناه. استخدم تحميل لحفظ ملف Excel بالهوية البصرية.',
    loadingPreview: 'جاري تحميل المعاينة…',
    previewEmpty: 'لا توجد صفوف للعرض.',
    previewFailed: 'فشلت المعاينة',
    filter: 'تصفية',
    sortBy: 'ترتيب حسب',
    sortNameAsc: 'الاسم (أ–ي)',
    sortNameDesc: 'الاسم (ي–أ)',
    sortEmailAsc: 'البريد (أ–ي)',
    sortRole: 'الدور',
    sortNewest: 'الأحدث أولاً',
    sortOldest: 'الأقدم أولاً',
    sortGrade: 'الصف',
    sortSection: 'الشعبة',
    sortScoreHigh: 'الدرجة (الأعلى أولاً)',
    sortScoreLow: 'الدرجة (الأدنى أولاً)',
    sortSubject: 'المادة',
    sortStudent: 'الطالب (أ–ي)',
    sortTimeNewest: 'الوقت (الأحدث)',
    sortTimeOldest: 'الوقت (الأقدم)',
    sortUser: 'المستخدم (أ–ي)',
    sortAction: 'الإجراء',
    apply: 'تطبيق',
    addStudent: 'إضافة طالب',
    allGrades: 'كل الصفوف',
    allSections: 'كل الشعب',
    selectGrade: 'اختر الصف',
    selectSection: 'اختر الشعبة',
    selectClass: 'اختر الصف',
    selectGradeSectionHint: 'يرجى اختيار الصف والشعبة أعلاه لعرض بيانات سجل الدرجات.',
    selectGradeSectionStudentsHint: 'يرجى اختيار الصف والشعبة أعلاه لعرض طلاب هذه الشعبة.',
    selectClassGradebookHint: 'يرجى اختيار الصف أعلاه لعرض الطلاب وإدخال الدرجات.',
    selectSamplePreviewHint: 'اختر مجموعة بيانات أعلاه واضغط معاينة لعرضها هنا.',
    selectChildHint: 'يرجى اختيار ابن/ابنة أعلاه لعرض الجدول والدرجات.',
    subjectFilter: 'تصفية المادة',
    status: 'الحالة',
    active: 'نشط',
    inactive: 'غير نشط',
    delete: 'حذف',
    parent: 'ولي الأمر',
    linkedUser: 'المستخدم المرتبط',
    type: 'النوع',
    assessment: 'التقييم',
    teacher: 'المعلم',
    subject: 'المادة',
    time: 'الوقت',
    viewingChild: 'عرض الطالب',
    uploadSchedule: 'رفع جدول',
    uploadGradesFile: 'رفع ملف درجات',
    title: 'العنوان',
    label: 'التسمية',
    file: 'الملف',
    uploadScheduleBtn: 'رفع الجدول',
    uploadGradesBtn: 'رفع الدرجات',
    noStudents: 'لا يوجد طلاب في هذا الصف',
    noGrades: 'لا توجد درجات بعد',
    noTeachers: 'لا يوجد معلمون',
    noLinkedChildren: 'لا يوجد أبناء مرتبطون. تواصل مع الإدارة.',
    noStudentProfile: 'لا يوجد ملف طالب مرتبط بحسابك.',
    enterAssessmentName: 'أدخل اسم التقييم',
    gradesSaved: 'تم حفظ الدرجات',
    uploaded: 'تم الرفع',
    userCreated: 'تم إنشاء المستخدم',
    studentAdded: 'تمت إضافة الطالب',
    updated: 'تم التحديث',
    noClasses: 'لا توجد صفوف مسندة',
    quiz: 'اختبار قصير',
    exam: 'امتحان',
    assignment: 'واجب',
    timetableFor: 'الجدول —',
    nameLabel: 'الاسم:',
    gradeLabel: 'الصف:',
    sectionLabel: 'الشعبة:',
    dobLabel: 'تاريخ الميلاد:',
    parentLabel: 'ولي الأمر:',
    teacherLoginHint: 'دخول المعلم: teacher@school.com / teacher123',
    daySun: 'الأحد',
    dayMon: 'الإثنين',
    dayTue: 'الثلاثاء',
    dayWed: 'الأربعاء',
    dayThu: 'الخميس'
  }
};

const dayKeys = { Sun: 'daySun', Mon: 'dayMon', Tue: 'dayTue', Wed: 'dayWed', Thu: 'dayThu' };
const assessmentKeys = { quiz: 'quiz', exam: 'exam', assignment: 'assignment' };

function t(key) {
  return translations[currentLang][key] || translations.en[key] || key;
}

function tDay(day) {
  return t(dayKeys[day] || day);
}

function tAssessment(type) {
  return t(assessmentKeys[type] || type);
}

function onLanguageChange(fn) {
  langChangeListeners.push(fn);
}

function setLanguage(lang) {
  currentLang = lang;
  localStorage.setItem('lang', lang);
  document.body.classList.toggle('arabic', lang === 'ar');
  document.documentElement.lang = lang;
  document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';

  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (translations[lang][key]) el.textContent = translations[lang][key];
  });

  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    const key = el.getAttribute('data-i18n-placeholder');
    if (translations[lang][key]) el.placeholder = translations[lang][key];
  });

  const subtitle = document.querySelector('[data-i18n-subtitle]');
  if (subtitle && translations[lang].schoolSubtitle) {
    subtitle.textContent = translations[lang].schoolSubtitle;
  }

  const moeLogo = document.querySelector('.moe-logo');
  if (moeLogo && translations[lang].moeLogoAlt) {
    moeLogo.alt = translations[lang].moeLogoAlt;
  }

  document.querySelectorAll('option[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (translations[lang][key]) el.textContent = translations[lang][key];
  });

  const toggle = document.getElementById('lang-toggle');
  if (toggle) toggle.textContent = lang === 'en' ? 'AR' : 'EN';

  langChangeListeners.forEach(fn => fn());
}

function initLanguageToggle() {
  setLanguage(currentLang);
  document.getElementById('lang-toggle')?.addEventListener('click', () => {
    setLanguage(currentLang === 'en' ? 'ar' : 'en');
  });
}

function downloadFile(url, filename) {
  return fetch((window.APP_CONFIG?.apiBase || '') + url, { credentials: 'include' })
    .then(res => {
      if (!res.ok) throw new Error('Download failed');
      return res.blob();
    })
    .then(blob => {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = filename;
      a.click();
      URL.revokeObjectURL(a.href);
    });
}

function downloadCsv(url, filename) {
  return downloadFile(url, filename);
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let current = '';
  let inQuotes = false;

  const normalized = text.replace(/^\uFEFF/, '');
  for (let i = 0; i < normalized.length; i++) {
    const char = normalized[i];
    if (inQuotes) {
      if (char === '"') {
        if (normalized[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += char;
      }
    } else if (char === '"') {
      inQuotes = true;
    } else if (char === ',') {
      row.push(current);
      current = '';
    } else if (char === '\n') {
      row.push(current);
      rows.push(row);
      row = [];
      current = '';
    } else if (char !== '\r') {
      current += char;
    }
  }

  if (current.length || row.length) {
    row.push(current);
    rows.push(row);
  }

  return rows.filter(r => r.some(cell => cell !== ''));
}

function emptyTablePrompt(colspan, messageKey) {
  return `<tr><td colspan="${colspan}" class="empty-prompt">${escapeHtml(t(messageKey))}</td></tr>`;
}

function emptyPanelPrompt(messageKey) {
  return `<p class="empty-prompt">${escapeHtml(t(messageKey))}</p>`;
}

function resetSampleDataPreview(panelId) {
  const panel = document.getElementById(panelId);
  const previewWrap = panel?.querySelector('[data-sample-preview-wrap]');
  const previewTable = panel?.querySelector('[data-sample-preview]');
  const previewTitle = panel?.querySelector('[data-sample-preview-title]');
  if (!panel || !previewWrap || !previewTable) return;

  previewWrap.classList.remove('section-hidden');
  if (previewTitle) previewTitle.textContent = '';
  previewTable.innerHTML = emptyPanelPrompt('selectSamplePreviewHint');
  panel.querySelectorAll('[data-preview]').forEach(btn => btn.classList.remove('active'));
}

async function previewSampleCsv(type, panelId) {
  const panel = document.getElementById(panelId);
  const previewWrap = panel?.querySelector('[data-sample-preview-wrap]');
  const previewTable = panel?.querySelector('[data-sample-preview]');
  const previewTitle = panel?.querySelector('[data-sample-preview-title]');
  if (!panel || !previewWrap || !previewTable) return;

  previewWrap.classList.remove('section-hidden');
  previewTable.innerHTML = `<p class="muted">${t('loadingPreview')}</p>`;
  if (previewTitle) {
    const previewKey = {
      students: 'previewStudents',
      teachers: 'previewTeachers',
      grades: 'previewGrades',
      schedules: 'previewSchedules'
    }[type];
    previewTitle.textContent = previewKey ? t(previewKey) : type;
  }

  panel.querySelectorAll('[data-preview]').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.preview === type);
  });

  try {
    const res = await fetch((window.APP_CONFIG?.apiBase || '') + `/api/exports/${type}?format=csv`, { credentials: 'include' });
    if (!res.ok) throw new Error(t('previewFailed') || 'Preview failed');
    const rows = parseCsv(await res.text());
    if (!rows.length) {
      previewTable.innerHTML = `<p class="muted">${t('previewEmpty')}</p>`;
      return;
    }

    const [headers, ...dataRows] = rows;
    previewTable.innerHTML = `
      <table>
        <thead><tr>${headers.map(h => `<th>${escapeHtml(h)}</th>`).join('')}</tr></thead>
        <tbody>${dataRows.map(cells => `<tr>${cells.map(cell => `<td>${escapeHtml(cell)}</td>`).join('')}</tr>`).join('')}</tbody>
      </table>`;
  } catch (err) {
    previewTable.innerHTML = `<p class="muted">${escapeHtml(err.message)}</p>`;
  }
}

function wireSampleDataPanel(panelId) {
  const panel = document.getElementById(panelId);
  if (!panel) return;

  resetSampleDataPreview(panelId);

  panel.addEventListener('click', (e) => {
    const previewBtn = e.target.closest('[data-preview]');
    if (previewBtn && panel.contains(previewBtn)) {
      previewSampleCsv(previewBtn.dataset.preview, panelId).catch(err => showToast(err.message, 'error'));
      return;
    }

    const downloadBtn = e.target.closest('[data-download]');
    if (downloadBtn && panel.contains(downloadBtn)) {
      const type = downloadBtn.dataset.download;
      downloadFile(`/api/exports/${type}`, `${type}.xlsx`).catch(err => showToast(err.message, 'error'));
    }
  });
}
