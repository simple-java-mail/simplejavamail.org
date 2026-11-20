type LegacyLinks = { targets: Record<string, string>; defaultTarget?: string };

export function legacyDestination(hash: string, search: string, config: LegacyLinks): string | undefined {
  let id: string;
  try { id = decodeURIComponent(hash.replace(/^#/, '')); } catch { return undefined; }
  const target = Object.prototype.hasOwnProperty.call(config.targets, id) ? config.targets[id] : config.defaultTarget;
  if (!target || !/^\/[a-z0-9/-]+\.html(?:#[a-z0-9-]+)?$/.test(target)) return undefined;
  const [path, fragment] = target.split('#');
  return `${path}${search}${fragment ? `#${fragment}` : ''}`;
}

const element = document.querySelector<HTMLScriptElement>('#legacy-documentation-links');
if (element) {
  try {
    const config = JSON.parse(element.textContent || '{}') as LegacyLinks;
    if (config.targets && typeof config.targets === 'object') {
      const redirect = (): void => {
        const target = legacyDestination(window.location.hash, window.location.search, config);
        if (target) window.location.replace(target);
      };
      redirect();
      window.addEventListener('hashchange', redirect);
    }
  } catch { /* The ordinary fallback links remain usable if configuration is unavailable. */ }
}
