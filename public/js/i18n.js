let currentLang = localStorage.getItem('lang') || 'en';

const translations = {
  en: {
    logo: 'School Portal',
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
    hasAccount: 'Have an account?'
  },
  ar: {
    logo: 'بوابة المدرسة',
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
    hasAccount: 'لديك حساب؟'
  }
};

function t(key) {
  return translations[currentLang][key] || translations.en[key] || key;
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
  const toggle = document.getElementById('lang-toggle');
  if (toggle) toggle.textContent = lang === 'en' ? 'AR' : 'EN';
}

function initLanguageToggle() {
  setLanguage(currentLang);
  document.getElementById('lang-toggle')?.addEventListener('click', () => {
    setLanguage(currentLang === 'en' ? 'ar' : 'en');
  });
}
