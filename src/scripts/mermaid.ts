interface MermaidApi {
  initialize(config: Record<string, unknown>): void;
  run(options: { querySelector: string }): Promise<void>;
}

const mermaid = (window as Window & { mermaid?: MermaidApi }).mermaid;

if (mermaid && document.querySelector('.mermaid')) {
  mermaid.initialize({
    startOnLoad: false,
    securityLevel: 'strict',
    // Mermaid 12 defaults to ELK and its new "neo" look. Keep the established
    // Journal diagrams visually stable.
    layout: 'dagre',
    look: 'classic',
    theme: 'base',
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
    },
    flowchart: {
      curve: 'basis',
      diagramPadding: 4,
      htmlLabels: true,
      nodeSpacing: 32,
      rankSpacing: 40,
      subGraphTitleMargin: { top: 8, bottom: 16 },
      useMaxWidth: true,
    },
  });

  // Mermaid measures labels during layout; wait for their web fonts to avoid clipping.
  void document.fonts.ready
    .then(() => mermaid.run({ querySelector: '.mermaid' }))
    .catch((error: unknown) => {
      console.error('Unable to render Mermaid diagram.', error);
    });
}
