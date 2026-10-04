import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import Handlebars from 'handlebars';
import { journalCommentConfig, validateCommentsUrl } from '../src/_lib/journal-comments.mjs';

const data = {
  site: { url: 'https://www.simplejavamail.org', journal: { urlPrefix: '/journal/' } },
  journalComments: { host: 'https://comments.simplejavamail.org', siteId: 'simplejavamail' },
  page: { fileSlug: '2026-10-03-example' },
};
test('threads use the published canonical URL and can retain it after an article rename', () => {
  assert.equal(journalCommentConfig(data, 'build').url, 'https://www.simplejavamail.org/journal/2026-10-03-example.html');
  assert.equal(journalCommentConfig({ ...data, commentsUrl: 'https://www.simplejavamail.org/journal/old-title.html' }, 'build').url,
    'https://www.simplejavamail.org/journal/old-title.html');
});
test('a local endpoint override preserves the site and canonical thread identity', () => {
  const previousHost = process.env.JOURNAL_COMMENTS_HOST;
  try {
    process.env.JOURNAL_COMMENTS_HOST = 'http://127.0.0.1:8082';
    const config = journalCommentConfig(data);
    assert.equal(config.host, 'http://127.0.0.1:8082');
    assert.equal(config.siteId, 'simplejavamail');
    assert.equal(config.url, 'https://www.simplejavamail.org/journal/2026-10-03-example.html');
  } finally {
    if (previousHost === undefined) delete process.env.JOURNAL_COMMENTS_HOST;
    else process.env.JOURNAL_COMMENTS_HOST = previousHost;
  }
  assert.equal(journalCommentConfig(data).host, previousHost || data.journalComments.host);
});
test('discussion config is always present, including drafts and formerly disabled articles', () => {
  for (const article of [data, { ...data, draft: true }, { ...data, comments: false },
    { ...data, journalComments: { ...data.journalComments, enabled: false } }]) {
    assert.equal(journalCommentConfig(article).host, data.journalComments.host);
    assert.equal(journalCommentConfig(article).url, 'https://www.simplejavamail.org/journal/2026-10-03-example.html');
  }
});
test('thread overrides cannot redirect discussions to another origin or include tracking parameters', () => {
  for (const url of ['https://evil.example/journal/a.html', 'https://www.simplejavamail.org/a.html',
    'https://www.simplejavamail.org/journal/a.html?preview=1', 'https://www.simplejavamail.org/journal/a.html#x']) {
    assert.throws(() => validateCommentsUrl(url, data.site));
  }
});

test('comment markup escapes titles and keeps configuration out of executable inline code', () => {
  const hbs = Handlebars.create();
  hbs.registerHelper('json', JSON.stringify);
  const render = hbs.compile(readFileSync(new URL('../src/_includes/components/journal-comments.hbs', import.meta.url), 'utf8'));
  assert.match(render({}), /<h2[^>]*>Discussion<\/h2>/);
  assert.match(render({}), /Comments unavailable\./);
  assert.doesNotMatch(render({}), /<button|data-comments-origins/);
  const html = render({ title: '\"><script>alert(1)</script>', commentConfig: {
    ...data.journalComments, url: 'https://www.simplejavamail.org/journal/example.html',
  } });
  assert.match(html, /data-comments-title="&quot;&gt;&lt;script&gt;/);
  assert.doesNotMatch(html, /<script>alert/);
});

const clientCode = ts.transpileModule(readFileSync(new URL('../src/scripts/journal-comments.ts', import.meta.url), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText;
const flush = () => new Promise((resolve) => setImmediate(resolve));

function browserFixture(origin = 'https://www.simplejavamail.org', controls = {}) {
  const events = {}, calls = [], scripts = [], listeners = new Set(), timers = new Map();
  const status = { hidden: false, textContent: 'Comments unavailable.' };
  const widget = { hidden: false, frame: null, querySelector: () => widget.frame,
    replaceChildren: () => { widget.frame = null; } };
  const section = { hidden: false, dataset: {
    commentsHost: controls.host || data.journalComments.host, commentsSite: 'simplejavamail',
    commentsUrl: 'https://www.simplejavamail.org/journal/example.html', commentsTitle: 'Example' },
    querySelector: (selector) => selector === '#remark42' ? widget : status };
  const root = { dark: false, classList: { contains: () => root.dark } };
  const host = new URL(section.dataset.commentsHost, origin).href.replace(/\/$/, '');
  let timerId = 0;
  const window = { location: { origin, href: origin + '/journal/example.html', hash: '' },
    setTimeout: (fn) => { timers.set(++timerId, fn); return timerId; },
    clearTimeout: (id) => { timers.delete(id); },
    addEventListener: (name, fn) => { assert.equal(name, 'message'); listeners.add(fn); },
    removeEventListener: (name, fn) => { listeners.delete(fn); } };
  const message = (changes = {}) => {
    const event = { origin: new URL(controls.widgetOrigin || host).origin, source: widget.frame?.contentWindow,
      data: { inited: true }, ...changes };
    for (const listener of listeners) listener(event);
  };
  const context = {
    exports: {}, window, AbortController, URL,
    document: { querySelector: () => section, documentElement: root,
      addEventListener: (event, fn) => { events[event] = fn; },
      createElement: () => ({ remove() { this.removed = true; } }),
      head: { append: (script) => {
        scripts.push(script);
        if (controls.scriptError) { script.onerror(); return; }
        widget.frame = { contentWindow: {} };
        window.REMARK42 = {
          changeTheme: (theme) => calls.push(['theme', theme]),
          destroy: () => { widget.frame = null; },
        };
        if (!controls.waitForReady) message();
      } } },
    fetch: async (...args) => {
      calls.push(['fetch', ...args]);
      if (controls.offline) throw new Error('Network unavailable');
      if (controls.hang) return new Promise((_, reject) => args[1].signal.addEventListener('abort', () => reject(new Error('Request timeout'))));
      return { ok: !controls.httpError, json: async () => {
        if (controls.invalidJson) throw new Error('Invalid JSON');
        return {};
      } };
    },
  };
  vm.runInNewContext(clientCode, context);
  return { context, calls, scripts, section, status, widget, root, window, events, message, listeners, timers,
    expire: () => { for (const callback of [...timers.values()]) callback(); } };
}

test('localhost and other page origins attempt the configured service without hiding the section', async () => {
  for (const origin of ['http://localhost:3000', 'https://preview.example']) {
    const fixture = browserFixture(origin);
    await flush();
    assert.equal(fixture.section.hidden, false);
    assert.equal(fixture.calls[0][1], 'https://comments.simplejavamail.org/api/v1/config?site=simplejavamail');
    assert.equal(fixture.scripts.length, 1);
    assert.equal(fixture.status.hidden, true);
  }
});

test('discussion loads immediately and follows theme changes', async () => {
  const fixture = browserFixture();
  assert.equal(fixture.calls.length, 1);
  await flush();
  assert.equal(fixture.scripts.length, 1);
  assert.equal(fixture.window.remark_config.url, fixture.section.dataset.commentsUrl);
  assert.equal(fixture.status.hidden, true);
  fixture.root.dark = true;
  fixture.events['site-theme-change']();
  assert.deepEqual(fixture.calls.at(-1), ['theme', 'dark']);
});

test('local service requests and iframe readiness use the page hostname for guest cookies', async () => {
  for (const [origin, host, expected] of [
    ['http://localhost:3000', 'http://127.0.0.1:8082', 'http://localhost:8082'],
    ['http://127.0.0.1:3000', 'http://localhost:8082', 'http://127.0.0.1:8082'],
  ]) {
    const fixture = browserFixture(origin, { host, widgetOrigin: expected, waitForReady: true });
    await flush();
    assert.equal(fixture.calls[0][1], `${expected}/api/v1/config?site=simplejavamail`);
    assert.equal(fixture.scripts[0].src, `${expected}/web/embed.mjs`);
    assert.equal(fixture.window.remark_config.host, expected);
    assert.equal(fixture.window.remark_config.url, 'https://www.simplejavamail.org/journal/example.html');
    fixture.message({ origin: host });
    await flush();
    assert.equal(fixture.status.hidden, false);
    fixture.message();
    await flush();
    assert.equal(fixture.status.hidden, true);
    assert.equal(fixture.section.hidden, false);
  }
});

test('network, HTTP and malformed-response failures leave the unavailable message without retries', async () => {
  for (const controls of [{ offline: true }, { httpError: true }, { invalidJson: true }]) {
    const fixture = browserFixture('http://localhost:3000', controls);
    await flush();
    assert.equal(fixture.section.hidden, false);
    assert.equal(fixture.status.textContent, 'Comments unavailable.');
    assert.equal(fixture.status.hidden, false);
    assert.equal(fixture.scripts.length, 0);
    assert.equal(fixture.timers.size, 0);
    assert.equal(fixture.calls.length, 1);
  }
});

test('script failure and blocked iframe initialization degrade without leaving a blank widget', async () => {
  for (const controls of [{ scriptError: true }, { waitForReady: true }]) {
    const fixture = browserFixture(undefined, controls);
    await flush();
    fixture.expire(); await flush();
    assert.equal(fixture.status.textContent, 'Comments unavailable.');
    assert.equal(fixture.status.hidden, false);
    assert.equal(fixture.widget.hidden, true);
    assert.equal(fixture.widget.frame, null);
    assert.equal(fixture.listeners.size, 0);
    assert.equal(fixture.timers.size, 0);
    assert.equal(fixture.scripts[0].removed, true);
  }
});

test('a request that never answers times out and keeps the section visible', async () => {
  const fixture = browserFixture(undefined, { hang: true });
  fixture.expire(); await flush();
  assert.equal(fixture.section.hidden, false);
  assert.equal(fixture.status.textContent, 'Comments unavailable.');
  assert.equal(fixture.calls.length, 1);
  assert.equal(fixture.timers.size, 0);
});

test('only readiness from the actual Remark42 iframe can hide the fallback', async () => {
  const fixture = browserFixture(undefined, { waitForReady: true });
  await flush();
  for (const forged of [{ origin: 'https://evil.example' }, { source: {} },
    { data: null }, { data: [] }, { data: { inited: false } }]) {
    fixture.message(forged); await flush();
    assert.equal(fixture.status.hidden, false);
  }
  fixture.message(); await flush();
  assert.equal(fixture.status.hidden, true);
  assert.equal(fixture.listeners.size, 0);
  assert.equal(fixture.timers.size, 0);
});

test('relative service bases resolve against the page root and retain the canonical thread identity', async () => {
  const fixture = browserFixture(undefined, { host: '/comments/' });
  await flush();
  assert.equal(fixture.calls[0][1], 'https://www.simplejavamail.org/comments/api/v1/config?site=simplejavamail');
  assert.equal(fixture.scripts[0].src, 'https://www.simplejavamail.org/comments/web/embed.mjs');
  assert.equal(fixture.window.remark_config.url, 'https://www.simplejavamail.org/journal/example.html');
});
