interface MermaidApi {
  initialize(config: Record<string, unknown>): void;
  run(options: { querySelector: string }): Promise<void>;
}

const mermaid = (window as Window & { mermaid?: MermaidApi }).mermaid;

if (mermaid && document.querySelector('.mermaid')) {
  mermaid.initialize({
    startOnLoad: false,
    securityLevel: 'strict',
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
      nodeSpacing: 24,
      rankSpacing: 28,
      useMaxWidth: true,
    },
  });

  void mermaid.run({ querySelector: '.mermaid' }).catch((error: unknown) => {
    console.error('Unable to render Mermaid diagram.', error);
  });
}
