// Empty on Render/local (same origin). Set on GitHub Pages via meta tag.
window.APP_CONFIG = {
  apiBase: document.querySelector('meta[name="api-base"]')?.content?.replace(/\/$/, '') || ''
};
