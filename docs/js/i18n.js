let currentLang = localStorage.getItem('lang') || 'en';
const langChangeListeners = [];

const translations = {
  en: {
    logo: 'School Portal',
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
    register: 'Register',
    email: 'Email',
    password: 'Password',
    name: 'Full name',
    role: 'Role',
    signIn: 'Sign in',
    createAccount: 'Create account',
    noAccount: 'No account?',
    hasAccount: 'Have an account?',
    grade: 'Grade',
    section: 'Section',
    tabUsers: 'Users',
    tabTeachers: 'Teachers',
    tabStudents: 'Students',
    tabGradebook: 'Gradebook',
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
    downloadGradebook: 'Download gradebook (CSV)',
    downloadSchedule: 'Download schedule (CSV)',
    downloadStudents: 'Download students (CSV)',
    downloadTeachers: 'Download teachers (CSV)',
    downloadGrades: 'Download grades (CSV)',
    downloadSchedules: 'Download class schedules (CSV)',
    sampleDataTitle: 'Sample data downloads',
    sampleDataDesc: 'Download dummy data as CSV files. Use these for testing or as import templates.',
    filter: 'Filter',
    apply: 'Apply',
    addStudent: 'Add student',
    allGrades: 'All grades',
    allSections: 'All sections',
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
    logo: 'بوابة المدرسة',
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
    register: 'إنشاء حساب',
    email: 'البريد',
    password: 'كلمة المرور',
    name: 'الاسم',
    role: 'الدور',
    signIn: 'دخول',
    createAccount: 'إنشاء حساب',
    noAccount: 'ليس لديك حساب؟',
    hasAccount: 'لديك حساب؟',
    grade: 'الصف',
    section: 'الشعبة',
    tabUsers: 'المستخدمون',
    tabTeachers: 'المعلمون',
    tabStudents: 'الطلاب',
    tabGradebook: 'سجل الدرجات',
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
    downloadGradebook: 'تحميل سجل الدرجات (CSV)',
    downloadSchedule: 'تحميل الجدول (CSV)',
    downloadStudents: 'تحميل الطلاب (CSV)',
    downloadTeachers: 'تحميل المعلمين (CSV)',
    downloadGrades: 'تحميل الدرجات (CSV)',
    downloadSchedules: 'تحميل جداول الصفوف (CSV)',
    sampleDataTitle: 'تحميل البيانات التجريبية',
    sampleDataDesc: 'حمّل البيانات التجريبية كملفات CSV للاختبار أو كقوالب.',
    filter: 'تصفية',
    apply: 'تطبيق',
    addStudent: 'إضافة طالب',
    allGrades: 'كل الصفوف',
    allSections: 'كل الشعب',
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

function downloadCsv(url, filename) {
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
