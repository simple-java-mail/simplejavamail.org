export {};

type RemarkConfig = {
  host: string; site_id: string; url: string; page_title: string; theme: string; components: string[];
};

declare global {
  interface Window {
    remark_config?: RemarkConfig;
    REMARK42?: { changeTheme?: (theme: string) => void; destroy?: () => void };
  }
}

const section = document.querySelector<HTMLElement>('[data-comments-host]');
if (section) {
  const status = section.querySelector<HTMLElement>('[role="status"]')!;
  const widget = section.querySelector<HTMLElement>('#remark42')!;
  const theme = (): string => document.documentElement.classList.contains('site-theme-dark') ? 'dark' : 'light';
  const load = async (): Promise<void> => {
    status.textContent = 'Loading comments…';
    const controller = new AbortController();
    const requestTimeout = window.setTimeout(() => controller.abort(), 12000);
    let script: HTMLScriptElement | undefined;
    try {
      const endpoint = new URL(section.dataset.commentsHost!, window.location.href);
      const page = new URL(window.location.href);
      const loopback = (hostname: string): boolean => hostname === 'localhost' || hostname === '127.0.0.1';
      // Cookies cannot authenticate an HTTP iframe across localhost and
      // 127.0.0.1. Keep a configured local service on the page's hostname.
      if (loopback(endpoint.hostname) && loopback(page.hostname) && endpoint.protocol === page.protocol) {
        endpoint.hostname = page.hostname;
      }
      const host = endpoint.href.replace(/\/$/, '');
      const response = await fetch(`${host}/api/v1/config?site=${encodeURIComponent(section.dataset.commentsSite!)}`, {
        signal: controller.signal, credentials: 'omit', cache: 'no-store',
      });
      if (!response.ok) throw new Error('Comment service unavailable');
      await response.json();
      window.clearTimeout(requestTimeout);
      window.remark_config = {
        host, site_id: section.dataset.commentsSite!, url: section.dataset.commentsUrl!,
        page_title: section.dataset.commentsTitle!, theme: theme(), components: ['embed'],
      };
      await new Promise<void>((resolve, reject) => {
        const cleanup = (): void => {
          window.clearTimeout(widgetTimeout);
          window.removeEventListener('message', initialized);
        };
        const fail = (error: unknown): void => { cleanup(); reject(error); };
        const initialized = (event: MessageEvent): void => {
          const frame = widget.querySelector<HTMLIFrameElement>('iframe[data-remark42-iframe]');
          // v1.17.1 reports iframe readiness with {inited:true}. Script download
          // alone is not success: embedding may still be blocked or time out.
          if (event.origin !== new URL(host).origin || !frame || event.source !== frame.contentWindow
              || typeof event.data !== 'object' || event.data === null || Array.isArray(event.data)
              || event.data.inited !== true) return;
          cleanup(); resolve();
        };
        const widgetTimeout = window.setTimeout(() => fail(new Error('Widget unavailable')), 15000);
        window.addEventListener('message', initialized);
        script = document.createElement('script');
        script.type = 'module';
        script.src = `${host}/web/embed.mjs`;
        script.onerror = () => fail(new Error('Widget unavailable'));
        document.head.append(script);
      });
      status.hidden = true;
      window.REMARK42?.changeTheme?.(theme());
    } catch {
      script?.remove();
      window.REMARK42?.destroy?.();
      widget.replaceChildren();
      widget.hidden = true;
      status.textContent = 'Comments unavailable.';
    } finally {
      window.clearTimeout(requestTimeout);
    }
  };
  document.addEventListener('site-theme-change', () => window.REMARK42?.changeTheme?.(theme()));
  void load();
}
