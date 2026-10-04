// Runs in the head before styles paint: no flash of the wrong saved theme.
(() => {
  let preference = 'light';
  try {
    if (localStorage.getItem('sjm-theme') === 'dark') preference = 'dark';
  } catch {
    // Storage may be blocked; the toggle still works for this page.
  }
  const root = document.documentElement;
  root.dataset.themePreference = preference;
  root.classList.toggle('site-theme-dark', preference === 'dark' || root.classList.contains('journal-theme-cyberpunk'));
})();
