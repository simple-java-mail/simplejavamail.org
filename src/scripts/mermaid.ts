interface MermaidApi {
  initialize(config: Record<string, unknown>): void;
  run(options: { querySelector: string }): Promise<void>;
}

const mermaid = (window as Window & { mermaid?: MermaidApi }).mermaid;

// Sequence actors do not support image glyphs. Keep a normal actor in the
// editable source (and other Markdown viewers), then replace only its drawing.
function applyActorPortraits(element: HTMLElement, source: string): void {
  const svgNamespace = 'http://www.w3.org/2000/svg';
  const portraits = source.matchAll(/^\s*%% journal-portrait: ([\w-]+) (\/assets\/journal\/articles\/[a-z0-9-]+\/personas\/[\w-]+-portrait\.jpg)\s*$/gm);
  for (const [, actorId, imagePath] of portraits) {
    for (const actor of element.querySelectorAll<SVGGElement>('g.actor-man')) {
      if (actor.getAttribute('name') !== actorId) continue;
      const head = actor.querySelector<SVGCircleElement>('circle');
      const glyphs = Array.from(actor.querySelectorAll<SVGGraphicsElement>(':scope > circle, :scope > line'));
      if (!head || !glyphs.length) continue;
      const bounds = glyphs.map((glyph) => glyph.getBBox());
      const top = Math.min(...bounds.map((box) => box.y));
      const bottom = Math.max(...bounds.map((box) => box.y + box.height));
      const size = Math.min(60, bottom - top);
      const x = Number(head.getAttribute('cx')) - size / 2;
      const y = top + (bottom - top - size) / 2;
      const image = document.createElementNS(svgNamespace, 'image');
      const frame = document.createElementNS(svgNamespace, 'rect');
      for (const node of [image, frame]) {
        node.setAttribute('x', String(x));
        node.setAttribute('y', String(y));
        node.setAttribute('width', String(size));
        node.setAttribute('height', String(size));
        node.setAttribute('aria-hidden', 'true');
      }
      image.setAttribute('href', imagePath);
      image.setAttribute('preserveAspectRatio', 'xMidYMid slice');
      image.setAttribute('class', 'diagram-person-portrait');
      frame.setAttribute('class', 'diagram-person-frame');
      // Leave the actor's name, lifeline and message positions untouched.
      glyphs.forEach((glyph) => { glyph.style.visibility = 'hidden'; });
      image.addEventListener('error', () => {
        image.remove();
        frame.remove();
        glyphs.forEach((glyph) => { glyph.style.removeProperty('visibility'); });
      }, { once: true });
      actor.append(image, frame);
    }
  }
}

// Sequence participants keep native boxes in other Markdown viewers. On the
// website, use local node artwork inside the space reserved for their headers.
async function applySequenceNodeImages(element: HTMLElement, source: string): Promise<void> {
  const nodes = source.matchAll(/^\s*%% journal-node: ([\w-]+) (\/assets\/journal\/articles\/relaydesk\/nodes\/relaydesk-cyberpunk-[\w-]+-node\.png)\s*$/gm);
  for (const [, participantId, imagePath] of nodes) {
    const artwork = new Image();
    artwork.src = imagePath;
    try {
      await artwork.decode();
    } catch {
      // Keep the native participant when its artwork cannot be loaded.
      continue;
    }
    if (!artwork.naturalWidth || !artwork.naturalHeight) continue;
    const aspectRatio = artwork.naturalWidth / artwork.naturalHeight;
    for (const box of element.querySelectorAll<SVGRectElement>('rect.actor')) {
      if (box.getAttribute('name') !== participantId) continue;
      const label = box.parentElement?.querySelector<SVGTextElement>('text.actor');
      if (!label) continue;
      const bounds = box.getBBox();
      const height = Math.min(85, bounds.height - 32, bounds.width / aspectRatio);
      const width = height * aspectRatio;
      if (height <= 0) continue;
      const image = document.createElementNS('http://www.w3.org/2000/svg', 'image');
      image.setAttribute('x', String(bounds.x + (bounds.width - width) / 2));
      image.setAttribute('y', String(bounds.y + 4));
      image.setAttribute('width', String(width));
      image.setAttribute('height', String(height));
      image.setAttribute('href', imagePath);
      image.setAttribute('preserveAspectRatio', 'xMidYMid meet');
      image.setAttribute('aria-hidden', 'true');
      image.setAttribute('class', 'diagram-system-image');
      const originalLabelY = label.getAttribute('y');
      label.setAttribute('y', String(bounds.y + bounds.height - 16));
      box.style.visibility = 'hidden';
      image.addEventListener('error', () => {
        image.remove();
        box.style.removeProperty('visibility');
        if (originalLabelY === null) label.removeAttribute('y');
        else label.setAttribute('y', originalLabelY);
      }, { once: true });
      box.parentElement?.append(image);
    }
  }
}

type DiagramPoint = { x: number; y: number };

function portraitLinkPath(start: DiagramPoint, end: DiagramPoint, startDirection: DiagramPoint, endDirection: DiagramPoint): string {
  const reach = Math.min(120, Math.max(24, Math.hypot(end.x - start.x, end.y - start.y) * 0.45));
  return `M${start.x},${start.y}C${start.x + startDirection.x * reach},${start.y + startDirection.y * reach} ${end.x + endDirection.x * reach},${end.y + endDirection.y * reach} ${end.x},${end.y}`;
}

// Mermaid reserves a rectangle for each portrait plus its adjacent text. Keep
// that layout space, but attach opted-in links to the visible hexagon instead.
function applyPortraitLinks(element: HTMLElement, source: string): void {
  const directions: Record<string, DiagramPoint> = {
    top: { x: 0, y: -1 }, bottom: { x: 0, y: 1 }, left: { x: -1, y: 0 }, right: { x: 1, y: 0 },
  };
  const links = source.matchAll(/^\s*%% journal-portrait-link: ([\w-]+) ([\w-]+) (source|target) (top|bottom|left|right)\s*$/gm);
  for (const [, edgeId, nodeId, endpoint, side] of links) {
    const edge = element.querySelector<SVGPathElement>(`path.flowchart-link[data-id="${edgeId}"]`);
    const node = Array.from(element.querySelectorAll<SVGGElement>('g.node'))
      .find((candidate) => candidate.id.match(/-flowchart-(.+)-\d+$/)?.[1] === nodeId);
    const portrait = node?.querySelector<HTMLElement>('.diagram-person-hex .diagram-person-portrait');
    const matrix = edge?.getScreenCTM();
    if (!edge || !portrait || !matrix) continue;
    const bounds = portrait.getBoundingClientRect();
    if (!bounds.width || !bounds.height) continue;
    const direction = directions[side];
    const inverse = matrix.inverse();
    const anchor = new DOMPoint(
      bounds.left + bounds.width * (1 + direction.x) / 2,
      bounds.top + bounds.height * (1 + direction.y) / 2,
    ).matrixTransform(inverse);
    const length = edge.getTotalLength();
    if (!length) continue;
    const start = edge.getPointAtLength(0);
    const end = edge.getPointAtLength(length);
    const tangent = (a: DiagramPoint, b: DiagramPoint): DiagramPoint => {
      const distance = Math.hypot(b.x - a.x, b.y - a.y) || 1;
      return { x: (b.x - a.x) / distance, y: (b.y - a.y) / distance };
    };
    let startDirection = tangent(start, edge.getPointAtLength(Math.min(1, length)));
    let endDirection = tangent(end, edge.getPointAtLength(Math.max(0, length - 1)));
    if (endpoint === 'source') {
      start.x = anchor.x;
      start.y = anchor.y;
      startDirection = direction;
    } else {
      // Mermaid's arrowhead extends four SVG units past the path endpoint.
      end.x = anchor.x + direction.x * 4;
      end.y = anchor.y + direction.y * 4;
      endDirection = direction;
    }
    edge.setAttribute('d', portraitLinkPath(start, end, startDirection, endDirection));
    const label = element.querySelector<SVGGElement>(`g.label[data-id="${edgeId}"]`)?.parentElement;
    if (label?.classList.contains('edgeLabel')) {
      const midpoint = edge.getPointAtLength(edge.getTotalLength() / 2);
      label.setAttribute('transform', `translate(${midpoint.x}, ${midpoint.y})`);
    }
  }
}

// Image nodes include their captions in Mermaid's routing outline. For opted-in
// left-to-right branches, use the artwork's right edge and keep elbows in the
// gap between the icons, not in the source caption. A center modifier removes
// the vertical source offset used to separate outgoing branches. Inlets retain the native
// source anchor (below its caption) and enter the target artwork from the left.
function applyImageBranchLinks(element: HTMLElement, source: string): void {
  const nodes = Array.from(element.querySelectorAll<SVGGElement>('g.image-shape'));
  const imageFor = (id: string): SVGImageElement | null | undefined => nodes
    .find((node) => node.id.match(/-flowchart-(.+)-\d+$/)?.[1] === id)
    ?.querySelector<SVGImageElement>('image');
  const branches = source.matchAll(/^\s*%% journal-image-branch: ([\w-]+) ([\w-]+) ([\w-]+)(?: (center))?\s*$/gm);
  for (const [, edgeId, sourceId, targetId, alignment] of branches) {
    const edge = element.querySelector<SVGPathElement>(`path.flowchart-link[data-id="${edgeId}"]`);
    const sourceImage = imageFor(sourceId);
    const targetImage = imageFor(targetId);
    const matrix = edge?.getScreenCTM();
    if (!edge || !sourceImage || !targetImage || !matrix) continue;
    const from = sourceImage.getBoundingClientRect();
    const to = targetImage.getBoundingClientRect();
    if (!from.width || !from.height || !to.width || !to.height || to.left <= from.right) continue;
    const sourceMiddle = from.top + from.height / 2;
    const targetMiddle = to.top + to.height / 2;
    const inverse = matrix.inverse();
    const sourceOffset = alignment === 'center' ? 0 : Math.sign(targetMiddle - sourceMiddle) * from.height * 0.2;
    const start = new DOMPoint(from.right, sourceMiddle + sourceOffset)
      .matrixTransform(inverse);
    const end = new DOMPoint(to.left, targetMiddle).matrixTransform(inverse);
    // Stop short of the target image by the arrowhead's four SVG units.
    end.x -= 4;
    const elbowX = (start.x + end.x) / 2;
    edge.setAttribute('d', `M${start.x},${start.y}L${elbowX},${start.y}L${elbowX},${end.y}L${end.x},${end.y}`);
  }
  const inlets = source.matchAll(/^\s*%% journal-image-inlet: ([\w-]+) ([\w-]+)\s*$/gm);
  for (const [, edgeId, targetId] of inlets) {
    const edge = element.querySelector<SVGPathElement>(`path.flowchart-link[data-id="${edgeId}"]`);
    const targetImage = imageFor(targetId);
    const matrix = edge?.getScreenCTM();
    if (!edge || !targetImage || !matrix || !edge.getTotalLength()) continue;
    const bounds = targetImage.getBoundingClientRect();
    if (!bounds.width || !bounds.height) continue;
    const start = edge.getPointAtLength(0);
    const end = new DOMPoint(bounds.left, bounds.top + bounds.height / 2).matrixTransform(matrix.inverse());
    end.x -= 4; // Leave room for Mermaid's arrowhead.
    if (start.x >= end.x || start.y >= end.y) continue;
    edge.setAttribute('d', `M${start.x},${start.y}L${start.x},${end.y}L${end.x},${end.y}`);
  }
}

if (mermaid && document.querySelector('.mermaid')) {
  const cyberpunk = document.documentElement.classList.contains('journal-theme-cyberpunk');
  const sources = Array.from(document.querySelectorAll<HTMLElement>('.mermaid')).map((element) => ({
    element,
    source: element.textContent ?? '',
  }));
  const initialize = (): void => mermaid.initialize({
    startOnLoad: false,
    securityLevel: 'strict',
    // Mermaid 12 defaults to ELK and its new "neo" look. Keep the established
    // Journal diagrams visually stable.
    layout: 'dagre',
    look: 'classic',
    theme: 'base',
    // Sequence layout measures with these top-level font settings too.
    ...(cyberpunk ? { fontFamily: '"IBM Plex Mono", monospace', fontSize: 13 } : {}),
    themeVariables: {
      background: '#FFFFFF',
      primaryColor: '#E4F2F2',
      primaryBorderColor: '#087E8B',
      primaryTextColor: '#13212B',
      secondaryColor: '#FFF2D8',
      tertiaryColor: '#F6F7F3',
      lineColor: '#5B6872',
      textColor: '#13212B',
      fontFamily: '"IBM Plex Sans", "Segoe UI", sans-serif',
      fontSize: '14px',
      ...(document.documentElement.classList.contains('site-theme-dark') ? {
        darkMode: true,
        background: '#191F2B',
        primaryColor: '#20343F',
        primaryBorderColor: '#7BCBD6',
        primaryTextColor: '#D2D7DF',
        secondaryColor: '#252332',
        tertiaryColor: '#191F2B',
        lineColor: '#9DA9B8',
        textColor: '#D2D7DF',
        clusterBkg: '#141A24',
        clusterBorder: '#354354',
        edgeLabelBackground: '#191F2B',
        actorBkg: '#20343F',
        actorBorder: '#7BCBD6',
        actorTextColor: '#D2D7DF',
        actorLineColor: '#9DA9B8',
        signalColor: '#9DA9B8',
        signalTextColor: '#D2D7DF',
        labelBoxBkgColor: '#252332',
        labelBoxBorderColor: '#354354',
        labelTextColor: '#D2D7DF',
        loopTextColor: '#D2D7DF',
        noteBkgColor: '#252332',
        noteBorderColor: '#B99AC8',
        noteTextColor: '#D2D7DF',
        activationBkgColor: '#252332',
        activationBorderColor: '#B99AC8',
      } : {}),
      ...(cyberpunk ? {
        darkMode: true,
        background: '#08171D',
        primaryColor: '#20251A',
        primaryBorderColor: '#F6CB43',
        primaryTextColor: '#E4E9EE',
        secondaryColor: '#221C30',
        tertiaryColor: '#0D232C',
        lineColor: '#35D9EF',
        textColor: '#E4E9EE',
        fontFamily: '"IBM Plex Mono", monospace',
        fontSize: '13px',
        clusterBkg: '#0B1D25',
        clusterBorder: '#35D9EF',
        edgeLabelBackground: '#08171D',
        actorBkg: '#20251A',
        actorBorder: '#F6CB43',
        actorTextColor: '#E4E9EE',
        actorLineColor: '#718D99',
        signalColor: '#35D9EF',
        signalTextColor: '#E4E9EE',
        labelBoxBkgColor: '#221C30',
        labelBoxBorderColor: '#BB80E9',
        labelTextColor: '#E4E9EE',
        loopTextColor: '#E4E9EE',
        noteBkgColor: '#221C30',
        noteBorderColor: '#BB80E9',
        noteTextColor: '#E4E9EE',
        activationBkgColor: '#0D232C',
        activationBorderColor: '#35D9EF',
      } : {}),
    },
    flowchart: {
      curve: cyberpunk ? 'stepBefore' : 'basis',
      diagramPadding: 4,
      htmlLabels: true,
      nodeSpacing: 32,
      rankSpacing: 40,
      subGraphTitleMargin: { top: 8, bottom: 16 },
      useMaxWidth: true,
    },
  });

  // Mermaid measures labels during layout; wait for their web fonts to avoid clipping.
  let rendering: Promise<void> = Promise.resolve();
  const render = (): void => {
    // Serialize redraws, including clicks while the initial render is in flight.
    rendering = rendering.then(async () => {
      await document.fonts.ready;
      initialize();
      for (const { element, source } of sources) {
        element.removeAttribute('data-processed');
        element.textContent = source;
      }
      await mermaid.run({ querySelector: '.mermaid' });
      for (const { element, source } of sources) {
        applyPortraitLinks(element, source);
        applyImageBranchLinks(element, source);
        applyActorPortraits(element, source);
        await applySequenceNodeImages(element, source);
      }
    }).catch((error: unknown) => {
      console.error('Unable to render Mermaid diagram.', error);
    });
  };
  document.addEventListener('site-theme-change', render);
  render();
}
