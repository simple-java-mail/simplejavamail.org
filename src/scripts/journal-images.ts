const imageDialog = document.querySelector<HTMLDialogElement>('[data-image-dialog]');
const imagePreview = imageDialog?.querySelector<HTMLImageElement>('[data-image-preview]');
const imageTitle = imageDialog?.querySelector<HTMLElement>('[data-image-title]');
const imageViewport = imageDialog?.querySelector<HTMLElement>('[data-image-viewport]');
const imageOriginal = imageDialog?.querySelector<HTMLAnchorElement>('[data-image-original]');
const imageZoom = imageDialog?.querySelector<HTMLButtonElement>('[data-image-zoom]');
const imageClose = imageDialog?.querySelector<HTMLButtonElement>('[data-image-close]');

if (imageDialog && typeof imageDialog.showModal === 'function'
    && imagePreview && imageTitle && imageViewport && imageOriginal && imageZoom && imageClose) {
  let activeImageLink: HTMLAnchorElement | null = null;

  const setImageZoom = (zoomed: boolean): void => {
    imageDialog.classList.toggle('is-zoomed', zoomed);
    imageZoom.setAttribute('aria-pressed', String(zoomed));
    imageZoom.textContent = zoomed ? 'Fit to screen' : 'Actual size';
    imageViewport.scrollTo(0, 0);
  };

  // A Markdown image linked to its own file opts in; other image links keep their destination.
  for (const link of document.querySelectorAll<HTMLAnchorElement>('.journal-prose a[href]')) {
    const thumbnail = link.firstElementChild;
    if (link.childElementCount !== 1 || !(thumbnail instanceof HTMLImageElement)
        || link.target || link.hasAttribute('download')) continue;
    const url = new URL(link.href);
    if (url.origin !== window.location.origin || !url.pathname.startsWith('/assets/journal/')
        || url.href !== thumbnail.src) continue;

    link.dataset.imageLightbox = '';
    link.setAttribute('aria-haspopup', 'dialog');
    link.setAttribute('aria-label', `Enlarge image: ${thumbnail.title || thumbnail.alt || 'Article image'}`);
    link.addEventListener('click', (event) => {
      if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      activeImageLink = link;
      imagePreview.src = url.href;
      imagePreview.alt = thumbnail.alt;
      imageTitle.textContent = thumbnail.title || 'Image preview';
      imageOriginal.href = url.href;
      setImageZoom(false);
      imageDialog.showModal();
      document.documentElement.classList.add('journal-image-open');
    });
  }

  imageZoom.addEventListener('click', () => setImageZoom(!imageDialog.classList.contains('is-zoomed')));
  imageClose.addEventListener('click', () => imageDialog.close());
  imageDialog.addEventListener('click', (event) => {
    if (event.target === imageDialog) imageDialog.close();
  });
  imageDialog.addEventListener('close', () => {
    document.documentElement.classList.remove('journal-image-open');
    imagePreview.removeAttribute('src');
    activeImageLink?.focus({ preventScroll: true });
    activeImageLink = null;
  });
}
