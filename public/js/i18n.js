const translations = {
  en: {
    'logo-text': 'Digital School',
    'nav-dashboard': 'Dashboard',
    'nav-schedules': 'Schedules',
    'nav-grades': 'Grades',
    'nav-students': 'Students',
    'nav-admin': 'Admin',
    'nav-logout': 'Logout',
    'sidebar-role-label': 'Your Role',
    'sidebar-links-label': 'Quick Links',
    'link-overview': 'Overview',
    'link-calendar': 'Calendar',
    'link-reports': 'Reports',
    'link-settings': 'Settings',
    'welcome-sub': "Here's what's happening at your school today.",
    'stat-students-label': 'Total Students',
    'stat-classes-label': 'Active Classes',
    'stat-grades-label': 'Pending Grades',
    'announcement-title': '📢 School Announcement',
    'timetable-heading': '📅 Weekly Timetable',
    'grading-heading': '📝 Teacher Grading Portal',
    'form-heading': '➕ Add New Student',
    'form-name-label': 'Student Full Name',
    'form-grade-label': 'Grade Level',
    'form-section-label': 'Section',
    'form-phone-label': 'Parent Phone Number',
    'form-submit-btn': 'Save Student Record',
    'save-grades-btn': 'Save Grades',
    'grade-success': '✅ Grades saved successfully',
    'form-success': '✅ Student record saved successfully',
    'login-title': 'Welcome Back',
    'login-sub': 'Sign in to your school portal account',
    'register-title': 'Create Account',
    'register-sub': 'Join the digital school community',
    'email-label': 'Email Address',
    'password-label': 'Password',
    'name-label': 'Full Name',
    'role-label': 'Account Type',
    'login-btn': 'Sign In',
    'register-btn': 'Create Account',
    'no-account': "Don't have an account?",
    'has-account': 'Already have an account?',
    'register-link': 'Register here',
    'login-link': 'Sign in',
    'admin-title': 'Admin Panel',
    'admin-sub': 'Manage users and system access',
    'create-user-btn': 'Create User',
    'back-dashboard': 'Back to Dashboard'
  },
  ar: {
    'logo-text': 'المدرسة الرقمية',
    'nav-dashboard': 'لوحة التحكم',
    'nav-schedules': 'الجداول',
    'nav-grades': 'الدرجات',
    'nav-students': 'الطلاب',
    'nav-admin': 'الإدارة',
    'nav-logout': 'تسجيل الخروج',
    'sidebar-role-label': 'دورك',
    'sidebar-links-label': 'الروابط السريعة',
    'link-overview': 'نظرة عامة',
    'link-calendar': 'التقويم',
    'link-reports': 'التقارير',
    'link-settings': 'الإعدادات',
    'welcome-sub': 'إليك ما يحدث في مدرستك اليوم.',
    'stat-students-label': 'إجمالي الطلاب',
    'stat-classes-label': 'الفصول النشطة',
    'stat-grades-label': 'الدرجات المعلقة',
    'announcement-title': '📢 إعلان المدرسة',
    'timetable-heading': '📅 جدول الأسبوع',
    'grading-heading': '📝 بوابة تقييم المعلم',
    'form-heading': '➕ إضافة طالب جديد',
    'form-name-label': 'الاسم الكامل للطالب',
    'form-grade-label': 'المستوى الدراسي',
    'form-section-label': 'القسم',
    'form-phone-label': 'رقم هاتف ولي الأمر',
    'form-submit-btn': 'حفظ بيانات الطالب',
    'save-grades-btn': 'حفظ الدرجات',
    'grade-success': '✅ تم حفظ الدرجات بنجاح',
    'form-success': '✅ تم حفظ بيانات الطالب بنجاح',
    'login-title': 'مرحباً بعودتك',
    'login-sub': 'سجل الدخول إلى حسابك',
    'register-title': 'إنشاء حساب',
    'register-sub': 'انضم إلى مجتمع المدرسة الرقمية',
    'email-label': 'البريد الإلكتروني',
    'password-label': 'كلمة المرور',
    'name-label': 'الاسم الكامل',
    'role-label': 'نوع الحساب',
    'login-btn': 'تسجيل الدخول',
    'register-btn': 'إنشاء حساب',
    'no-account': 'ليس لديك حساب؟',
    'has-account': 'لديك حساب بالفعل؟',
    'register-link': 'سجل هنا',
    'login-link': 'تسجيل الدخول',
    'admin-title': 'لوحة الإدارة',
    'admin-sub': 'إدارة المستخدمين والصلاحيات',
    'create-user-btn': 'إنشاء مستخدم',
    'back-dashboard': 'العودة للوحة التحكم'
  }
};

let currentLang = localStorage.getItem('lang') || 'en';

function t(key) {
  return translations[currentLang][key] || translations.en[key] || key;
}

function setLanguage(lang) {
  currentLang = lang;
  localStorage.setItem('lang', lang);
  document.body.classList.toggle('arabic', lang === 'ar');
  document.documentElement.lang = lang;
  document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';

  document.querySelectorAll('[data-i18n]').forEach((el) => {
    const key = el.getAttribute('data-i18n');
    if (translations[lang][key]) {
      if (el.tagName === 'INPUT' && el.placeholder !== undefined) {
        /* skip inputs unless data-i18n-placeholder */
      } else {
        el.textContent = translations[lang][key];
      }
    }
  });

  document.querySelectorAll('[data-i18n-placeholder]').forEach((el) => {
    const key = el.getAttribute('data-i18n-placeholder');
    if (translations[lang][key]) el.placeholder = translations[lang][key];
  });

  const toggle = document.getElementById('lang-toggle');
  if (toggle) toggle.textContent = lang === 'en' ? 'العربية' : 'English';

  if (typeof lucide !== 'undefined') lucide.createIcons();
}

function initLanguageToggle() {
  setLanguage(currentLang);
  const toggle = document.getElementById('lang-toggle');
  if (toggle) {
    toggle.addEventListener('click', () => {
      setLanguage(currentLang === 'en' ? 'ar' : 'en');
    });
  }
}
