/** The current section continues until the next top-level heading reaches the reading line. */
export function activeArticleSection(headingTops: number[], readingLine: number): number {
  let active = -1;
  for (let index = 0; index < headingTops.length; index++) {
    if (headingTops[index] > readingLine + 1) break;
    active = index;
  }
  return active;
}

export function initializeArticleToc(): void {
  const article = document.querySelector<HTMLElement>('.journal-prose');
  const toc = document.querySelector<HTMLElement>('.journal-entry-toc');
  if (!article || !toc) return;

  const sections = Array.from(toc.querySelectorAll<HTMLAnchorElement>('a[href^="#"]')).flatMap((link) => {
    let id: string;
    try { id = decodeURIComponent(link.hash.slice(1)); } catch { return []; }
    const heading = document.getElementById(id);
    return heading?.matches('h2') && article.contains(heading) ? [{ link, heading }] : [];
  });
  if (!sections.length) return;

  let active = -1;
  let pendingFrame = false;
  const update = (): void => {
    pendingFrame = false;
    // Native anchor jumps apply both offsets; tracking must use the same reading line.
    const headingOffset = parseFloat(getComputedStyle(sections[0].heading).scrollMarginTop) || 0;
    const pageOffset = parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) || 0;
    const readingLine = headingOffset + pageOffset;
    const next = activeArticleSection(sections.map(({ heading }) => heading.getBoundingClientRect().top), readingLine);
    if (next === active) return;
    for (let index = 0; index < sections.length; index++) {
      const { link } = sections[index];
      link.classList.toggle('is-active', index === next);
      if (index === next) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    }
    active = next;
  };
  const scheduleUpdate = (): void => {
    if (pendingFrame) return;
    pendingFrame = true;
    window.requestAnimationFrame(update);
  };

  window.addEventListener('scroll', scheduleUpdate, { passive: true });
  window.addEventListener('resize', scheduleUpdate);
  window.addEventListener('hashchange', scheduleUpdate);
  window.addEventListener('pageshow', scheduleUpdate);
  // Images, Mermaid and expandable examples can move headings without a scroll event.
  if (typeof ResizeObserver !== 'undefined') new ResizeObserver(scheduleUpdate).observe(article);
  update();
}
