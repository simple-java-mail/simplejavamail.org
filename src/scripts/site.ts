const header = document.querySelector<HTMLElement>('[data-site-header]');
const navToggle = document.querySelector<HTMLButtonElement>('.nav-toggle');

navToggle?.addEventListener('click', () => {
  const open = header?.classList.toggle('nav-open') ?? false;
  navToggle.setAttribute('aria-expanded', String(open));
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && header?.classList.contains('nav-open')) {
    header.classList.remove('nav-open');
    navToggle?.setAttribute('aria-expanded', 'false');
    navToggle?.focus();
  }
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
