// Delegated clicks also work for images added by the local Article Workbench.
const initializedDialogs = new WeakSet<HTMLDialogElement>();
export function initializeJournalImages(root: ParentNode = document): void {
  const dialog = document.querySelector<HTMLDialogElement>('[data-image-dialog]');
  const preview = dialog?.querySelector<HTMLImageElement>('[data-image-preview]');
  const title = dialog?.querySelector<HTMLElement>('[data-image-title]');
  const viewport = dialog?.querySelector<HTMLElement>('[data-image-viewport]');
  const original = dialog?.querySelector<HTMLAnchorElement>('[data-image-original]');
  const zoom = dialog?.querySelector<HTMLButtonElement>('[data-image-zoom]');
  const close = dialog?.querySelector<HTMLButtonElement>('[data-image-close]');
  if (!dialog || typeof dialog.showModal !== 'function' || !preview || !title || !viewport || !original || !zoom || !close) return;
  for (const link of root.querySelectorAll<HTMLAnchorElement>('.journal-prose a[href]')) {
    const thumbnail = link.firstElementChild;
    if (link.childElementCount !== 1 || !(thumbnail instanceof HTMLImageElement) || link.target || link.hasAttribute('download')) continue;
    const url = new URL(link.href);
    if (url.origin !== location.origin || !url.pathname.startsWith('/assets/journal/') || url.href !== thumbnail.src) continue;
    link.dataset.imageLightbox = '';
    link.setAttribute('aria-haspopup', 'dialog');
    link.setAttribute('aria-label', `Enlarge image: ${thumbnail.title || thumbnail.alt || 'Article image'}`);
  }
  if (initializedDialogs.has(dialog)) return;
  initializedDialogs.add(dialog);
  let active: HTMLAnchorElement | null = null;
  const setZoom = (zoomed: boolean): void => {
    dialog.classList.toggle('is-zoomed', zoomed);
    zoom.setAttribute('aria-pressed', String(zoomed));
    zoom.textContent = zoomed ? 'Fit to screen' : 'Actual size';
    viewport.scrollTo(0, 0);
  };
  document.addEventListener('click', (event) => {
    const link = (event.target as Element | null)?.closest<HTMLAnchorElement>('a[data-image-lightbox]');
    const thumbnail = link?.firstElementChild;
    if (!link || !(thumbnail instanceof HTMLImageElement) || event.defaultPrevented || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    active = link;
    preview.src = link.href;
    preview.alt = thumbnail.alt;
    title.textContent = thumbnail.title || 'Image preview';
    original.href = link.href;
    setZoom(false);
    dialog.showModal();
    document.documentElement.classList.add('journal-image-open');
  });
  zoom.addEventListener('click', () => setZoom(!dialog.classList.contains('is-zoomed')));
  close.addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });
  dialog.addEventListener('close', () => {
    document.documentElement.classList.remove('journal-image-open');
    preview.removeAttribute('src');
    active?.focus({ preventScroll: true });
    active = null;
  });
}
initializeJournalImages();
