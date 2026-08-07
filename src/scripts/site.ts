const header = document.querySelector<HTMLElement>('[data-site-header]');
const navToggle = document.querySelector<HTMLButtonElement>('.nav-toggle');
const navToggleLabel = navToggle?.querySelector<HTMLElement>('[data-nav-toggle-label]');
const navSubmenuToggle = header?.querySelector<HTMLButtonElement>('.nav-submenu-toggle');
const navSubmenu = navSubmenuToggle?.closest<HTMLElement>('.nav-has-submenu');

const setSubmenuOpen = (open: boolean): void => {
  navSubmenu?.classList.toggle('submenu-open', open);
  navSubmenuToggle?.setAttribute('aria-expanded', String(open));
  const accessibleLabel = open ? 'Hide documentation sections' : 'Show documentation sections';
  const label = navSubmenuToggle?.querySelector<HTMLElement>('.visually-hidden');
  if (label) label.textContent = accessibleLabel;
};

const setNavigationOpen = (open: boolean): void => {
  header?.classList.toggle('nav-open', open);
  document.documentElement.classList.toggle('nav-menu-open', open);
  navToggle?.setAttribute('aria-expanded', String(open));
  if (navToggleLabel) navToggleLabel.textContent = open ? 'Close' : 'Menu';
  if (!open) setSubmenuOpen(false);
};

navToggle?.addEventListener('click', () => {
  setNavigationOpen(!header?.classList.contains('nav-open'));
});

navSubmenuToggle?.addEventListener('click', () => {
  setSubmenuOpen(!navSubmenu?.classList.contains('submenu-open'));
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && header?.classList.contains('nav-open')) {
    setNavigationOpen(false);
    navToggle?.focus();
  }
});

window.matchMedia('(max-width: 1080px)').addEventListener('change', (event) => {
  if (!event.matches) setNavigationOpen(false);
});

const docsSidebar = document.querySelector<HTMLElement>('[data-docs-sidebar]');
const sidebarToggle = docsSidebar?.querySelector<HTMLButtonElement>('.sidebar-toggle');

sidebarToggle?.addEventListener('click', () => {
  const open = docsSidebar?.classList.toggle('is-open') ?? false;
  sidebarToggle.setAttribute('aria-expanded', String(open));
});

const activeDocsLink = docsSidebar?.querySelector<HTMLAnchorElement>('.docs-nav a.is-active');
window.addEventListener('load', () => {
  if (!docsSidebar || !activeDocsLink || getComputedStyle(docsSidebar).overflowY === 'visible') return;

  const sidebarBounds = docsSidebar.getBoundingClientRect();
  const linkBounds = activeDocsLink.getBoundingClientRect();
  const centeredOffset = linkBounds.top - sidebarBounds.top - (sidebarBounds.height - linkBounds.height) / 2;
  docsSidebar.scrollTop = Math.max(0, docsSidebar.scrollTop + centeredOffset);
}, { once: true });

const copyLabel = (button: HTMLButtonElement, value: string): void => {
  button.textContent = value;
  button.setAttribute('aria-label', value === 'Copied' ? 'Code copied to clipboard' : 'Copy code');
};

for (const pre of document.querySelectorAll<HTMLPreElement>('pre')) {
  const code = pre.querySelector('code');
  if (!code || pre.closest('.smtp-receipt')) continue;

  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'copy-code';
  copyLabel(button, 'Copy');
  button.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(code.textContent ?? '');
      copyLabel(button, 'Copied');
      window.setTimeout(() => copyLabel(button, 'Copy'), 1600);
    } catch {
      copyLabel(button, 'Select code');
      const selection = window.getSelection();
      const range = document.createRange();
      range.selectNodeContents(code);
      selection?.removeAllRanges();
      selection?.addRange(range);
    }
  });
  pre.classList.add('has-copy-control');
  pre.append(button);
}

const route = document.querySelector<HTMLElement>('.delivery-route');
if (route) {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    route.classList.add('is-visible');
  } else {
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        route.classList.add('is-visible');
        observer.disconnect();
      }
    }, { threshold: 0.25 });
    observer.observe(route);
  }
}
