import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

const source = readFileSync(new URL('../src/scripts/article-toc.ts', import.meta.url), 'utf8');
const script = ts.transpileModule(source, {
  compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS },
}).outputText;

function fixture(withArticle = true, pageOffset = 0, headingTops = [500, 1200, 1800]) {
  const listeners = new Map();
  const frames = [];
  const sections = headingTops.map((top, index) => ({
    id: `section-${index}`, top,
    matches: (selector) => selector === 'h2',
    getBoundingClientRect() { return { top: this.top }; },
  }));
  const links = sections.map((heading) => {
    const attributes = new Map();
    const classes = new Set();
    return {
      hash: `#${heading.id}`, attributes, classes,
      classList: { toggle: (name, enabled) => enabled ? classes.add(name) : classes.delete(name) },
      setAttribute: (name, value) => attributes.set(name, value),
      removeAttribute: (name) => attributes.delete(name),
    };
  });
  const article = { contains: (heading) => sections.includes(heading) };
  let resize;
  const context = {
    exports: {},
    document: {
      querySelector: (selector) => !withArticle ? null
        : selector === '.journal-prose' ? article : { querySelectorAll: () => links },
      getElementById: (id) => sections.find((heading) => heading.id === id),
    },
    window: {
      addEventListener: (name, callback, options) => listeners.set(name, { callback, options }),
      requestAnimationFrame: (callback) => frames.push(callback),
    },
    getComputedStyle: () => ({ scrollMarginTop: '104px', scrollPaddingTop: `${pageOffset}px` }),
    ResizeObserver: class {
      constructor(callback) { resize = callback; }
      observe(target) { assert.equal(target, article); }
    },
  };
  runInNewContext(script, context);
  context.exports.initializeArticleToc();
  return {
    ...context.exports, sections, links, listeners, frames,
    resize: () => resize(),
    flush: () => { while (frames.length) frames.shift()(); },
    active: () => links.findIndex((link) => link.attributes.get('aria-current') === 'location'),
  };
}

test('article sections remain current through long content and switch at the reading line', () => {
  const { activeArticleSection } = fixture();
  assert.equal(activeArticleSection([], 104), -1);
  assert.equal(activeArticleSection([500, 1200], 104), -1);
  assert.equal(activeArticleSection([-1500, 900], 104), 0);
  assert.equal(activeArticleSection([-1500, 104], 104), 1);
  assert.equal(activeArticleSection([-1500, -100], 104), 1);
});

test('scrolling changes one visible and accessible selection without rewriting navigation', () => {
  const state = fixture();
  assert.equal(state.active(), -1);
  state.sections[0].top = -100;
  state.listeners.get('scroll').callback();
  state.listeners.get('scroll').callback();
  assert.equal(state.frames.length, 1, 'Coalesce scroll work into one animation frame');
  assert.equal(state.listeners.get('scroll').options.passive, true);
  state.flush();
  assert.equal(state.active(), 0);
  assert.equal(state.links[0].classes.has('is-active'), true);
  state.sections[1].top = 104;
  state.listeners.get('scroll').callback();
  state.flush();
  assert.equal(state.active(), 1);
  assert.equal(state.links[0].classes.has('is-active'), false);
  assert.equal(state.links[0].attributes.has('aria-current'), false);
  assert.deepEqual(state.links.map((link) => link.hash), ['#section-0', '#section-1', '#section-2']);
  state.sections[0].top = 500;
  state.sections[1].top = 1200;
  state.listeners.get('scroll').callback();
  state.flush();
  assert.equal(state.active(), -1, 'Clear the selection on returning to the introduction');
});

test('article reflow, viewport changes, restored scrolling and anchor jumps refresh the selection', () => {
  for (const trigger of ['resize', 'hashchange', 'pageshow', 'article resize']) {
    const state = fixture();
    state.sections[0].top = -1000;
    state.sections[1].top = -300;
    if (trigger === 'article resize') state.resize();
    else state.listeners.get(trigger).callback();
    state.flush();
    assert.equal(state.active(), 1, trigger);
  }
});

test('pages without the shared article ToC do not install scroll tracking', () => {
  assert.equal(fixture(false).listeners.size, 0);
});

test('initial deep links use both page scroll padding and heading scroll margin', () => {
  assert.equal(fixture(true, 90, [-1000, 194, 900]).active(), 1);
});
