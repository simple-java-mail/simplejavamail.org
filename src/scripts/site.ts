const header = document.querySelector<HTMLElement>('[data-site-header]');
const navToggle = document.querySelector<HTMLButtonElement>('.nav-toggle');
const navToggleLabel = navToggle?.querySelector<HTMLElement>('[data-nav-toggle-label]');
const navSubmenus = Array.from(header?.querySelectorAll<HTMLElement>('.nav-has-submenu') ?? []);

const setSubmenuOpen = (submenu: HTMLElement, open: boolean): void => {
  const toggle = submenu.querySelector<HTMLButtonElement>('.nav-submenu-toggle');
  const submenuLabel = toggle?.dataset.submenuLabel ?? 'submenu';
  submenu.classList.toggle('submenu-open', open);
  toggle?.setAttribute('aria-expanded', String(open));
  const accessibleLabel = `${open ? 'Hide' : 'Show'} ${submenuLabel}`;
  const label = toggle?.querySelector<HTMLElement>('.visually-hidden');
  if (label) label.textContent = accessibleLabel;
};

const closeSubmenus = (except?: HTMLElement): void => {
  for (const submenu of navSubmenus) {
    if (submenu !== except) setSubmenuOpen(submenu, false);
  }
};

const setNavigationOpen = (open: boolean): void => {
  header?.classList.toggle('nav-open', open);
  document.documentElement.classList.toggle('nav-menu-open', open);
  navToggle?.setAttribute('aria-expanded', String(open));
  if (navToggleLabel) navToggleLabel.textContent = open ? 'Close' : 'Menu';
  if (!open) closeSubmenus();
};

navToggle?.addEventListener('click', () => {
  setNavigationOpen(!header?.classList.contains('nav-open'));
});

for (const submenu of navSubmenus) {
  const toggle = submenu.querySelector<HTMLButtonElement>('.nav-submenu-toggle');
  toggle?.addEventListener('click', () => {
    const open = !submenu.classList.contains('submenu-open');
    closeSubmenus(submenu);
    setSubmenuOpen(submenu, open);
  });
}

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

const archiveDialog = document.querySelector<HTMLDialogElement>('[data-archive-dialog]');
const archiveDialogViewport = archiveDialog?.querySelector<HTMLElement>('[data-archive-dialog-viewport]');
const archiveDialogContent = archiveDialog?.querySelector<HTMLElement>('[data-archive-dialog-content]');
const archiveDialogStatus = archiveDialog?.querySelector<HTMLElement>('[data-archive-dialog-status]');
const archiveDialogLabel = archiveDialog?.querySelector<HTMLElement>('[data-archive-dialog-label]');
const archiveDialogTitle = archiveDialog?.querySelector<HTMLElement>('[data-archive-dialog-title]');
const archiveDialogOpen = archiveDialog?.querySelector<HTMLAnchorElement>('[data-archive-dialog-open]');
const archiveDialogClose = archiveDialog?.querySelector<HTMLButtonElement>('[data-archive-dialog-close]');
const archiveSourcePath = /^\/sources\/(?:google-code|project-nibble|sourceforge)\/(?:[a-z0-9]+(?:-[a-z0-9]+)*\/)*[a-z0-9]+(?:-[a-z0-9]+)*\.html$/;

if (
  archiveDialog
  && archiveDialogViewport
  && archiveDialogContent
  && archiveDialogStatus
  && archiveDialogLabel
  && archiveDialogTitle
  && archiveDialogOpen
  && archiveDialogClose
) {
  const sourceCache = new Map<string, Promise<HTMLElement>>();
  let activeCitation: HTMLAnchorElement | null = null;
  let activeSourceUrl: URL | null = null;

  const loadArchivedSource = (url: URL): Promise<HTMLElement> => {
    const pageUrl = new URL(url);
    pageUrl.hash = '';
    const key = pageUrl.href;
    const cached = sourceCache.get(key);
    if (cached) return cached;

    const request = fetch(key, { headers: { Accept: 'text/html' } }).then(async (response) => {
      if (!response.ok) throw new Error(`Archived source returned HTTP ${response.status}`);
      const source = new DOMParser().parseFromString(await response.text(), 'text/html');
      const content = source.querySelector<HTMLElement>('[data-archived-source]');
      if (!content) throw new Error('Archived source page did not contain recoverable content');
      return content;
    });
    request.catch(() => sourceCache.delete(key));
    sourceCache.set(key, request);
    return request;
  };

  const findTarget = (container: HTMLElement, hash: string): HTMLElement | null => {
    if (!hash.startsWith('#')) return null;
    const id = decodeURIComponent(hash.slice(1));
    return Array.from(container.querySelectorAll<HTMLElement>('[id]')).find((element) => element.id === id) ?? null;
  };

  const revealTarget = (target: HTMLElement | null, animate = false): void => {
    archiveDialogContent.querySelector('.is-citation-target')?.classList.remove('is-citation-target');
    if (!target) {
      archiveDialogViewport.scrollTop = 0;
      return;
    }
    target.classList.add('is-citation-target');
    window.requestAnimationFrame(() => {
      const viewportBounds = archiveDialogViewport.getBoundingClientRect();
      const targetBounds = target.getBoundingClientRect();
      const offset = Math.max(24, (archiveDialogViewport.clientHeight - Math.min(targetBounds.height, 240)) / 3);
      archiveDialogViewport.scrollTo({
        top: archiveDialogViewport.scrollTop + targetBounds.top - viewportBounds.top - offset,
        behavior: animate && !window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'smooth' : 'auto',
      });
    });
  };

  const showArchivedSource = async (sourceUrl: URL, citation: HTMLAnchorElement | null = null): Promise<void> => {
    try {
      if (citation) activeCitation = citation;
      activeSourceUrl = sourceUrl;
      archiveDialogOpen.href = sourceUrl.href;
      archiveDialogLabel.textContent = 'Recovered source';
      archiveDialogTitle.textContent = '';
      archiveDialogStatus.hidden = false;
      archiveDialogViewport.setAttribute('aria-busy', 'true');
      archiveDialogContent.replaceChildren();
      if (!archiveDialog.open) archiveDialog.showModal();
      document.documentElement.classList.add('archive-dialog-open');
      const sourceContent = await loadArchivedSource(sourceUrl);
      if (activeSourceUrl?.href !== sourceUrl.href) return;
      const content = document.importNode(sourceContent, true);
      const pageUrl = new URL(sourceUrl);
      pageUrl.hash = '';
      for (const link of content.querySelectorAll<HTMLAnchorElement>('a[href]')) {
        if (link.getAttribute('href')?.startsWith('#')) {
          link.href = `${pageUrl.href}${link.getAttribute('href')}`;
        } else {
          const linkUrl = new URL(link.href, pageUrl);
          if (linkUrl.origin !== window.location.origin || !archiveSourcePath.test(linkUrl.pathname)) {
            link.target = '_blank';
            link.rel = 'noopener noreferrer';
          }
        }
      }
      archiveDialogContent.replaceChildren(content);
      archiveDialogLabel.textContent = content.dataset.sourceLabel ?? 'Recovered source';
      archiveDialogTitle.textContent = content.dataset.sourceTitle ?? '';
      archiveDialogStatus.hidden = true;
      archiveDialogViewport.setAttribute('aria-busy', 'false');
      revealTarget(findTarget(content, sourceUrl.hash));
    } catch (error) {
      console.warn('[journal] Could not open the recovered source viewer; following the source link instead.', error);
      window.location.assign(sourceUrl.href);
    }
  };

  document.querySelector('.journal-prose')?.addEventListener('click', (event) => {
    if (!(event instanceof MouseEvent) || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    const target = event.target instanceof Element ? event.target.closest<HTMLAnchorElement>('a[href]') : null;
    if (!target || target.target || target.hasAttribute('download')) return;
    const sourceUrl = new URL(target.href, window.location.href);
    if (sourceUrl.origin !== window.location.origin || !archiveSourcePath.test(sourceUrl.pathname)) return;
    event.preventDefault();
    void showArchivedSource(sourceUrl, target);
  });

  archiveDialogContent.addEventListener('click', (event) => {
    const target = event.target instanceof Element ? event.target.closest<HTMLAnchorElement>('a[href]') : null;
    if (!target || !activeSourceUrl || target.target || target.hasAttribute('download')) return;
    const sourceUrl = new URL(target.href, window.location.href);
    if (sourceUrl.origin !== window.location.origin || !archiveSourcePath.test(sourceUrl.pathname)) return;
    event.preventDefault();
    if (sourceUrl.pathname !== activeSourceUrl.pathname) {
      void showArchivedSource(sourceUrl);
      return;
    }
    activeSourceUrl.hash = sourceUrl.hash;
    archiveDialogOpen.href = activeSourceUrl.href;
    revealTarget(findTarget(archiveDialogContent, sourceUrl.hash), true);
  });

  archiveDialogClose.addEventListener('click', () => archiveDialog.close());
  archiveDialog.addEventListener('click', (event) => {
    if (event.target === archiveDialog) archiveDialog.close();
  });
  archiveDialog.addEventListener('close', () => {
    document.documentElement.classList.remove('archive-dialog-open');
    archiveDialogContent.replaceChildren();
    archiveDialogStatus.hidden = false;
    archiveDialogViewport.setAttribute('aria-busy', 'false');
    activeSourceUrl = null;
    activeCitation?.focus();
    activeCitation = null;
  });
}
