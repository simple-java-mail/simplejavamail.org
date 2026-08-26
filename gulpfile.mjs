/**
 * Simple Java Mail website build pipeline.
 *
 * Static Handlebars pages, manifest-driven routes/navigation/sitemap,
 * route-sized LESS, native ESM TypeScript, and a local Pagefind index.
 */
import gulp from 'gulp';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import http from 'node:http';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import Handlebars from 'handlebars';
import less from 'gulp-less';
import autoprefixer from 'gulp-autoprefixer';
import { loadJournalEntries, renderJournalFeed } from './scripts/journal-content.mjs';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.join(ROOT, 'src');
const DIST = path.join(ROOT, 'dist');
const MANIFEST = path.join(ROOT, 'manifest');
const JOURNAL_ROOT = path.join(SRC, 'journal');
const JOURNAL_ENTRY_TEMPLATE = path.join(SRC, 'templates', 'journal-entry.hbs');
const SITE_BASE = 'https://www.simplejavamail.org';
let previewJournalDrafts = process.env.JOURNAL_INCLUDE_DRAFTS === 'true';

function readJSON(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function readSite({ includeDrafts = previewJournalDrafts } = {}) {
  const site = readJSON(path.join(MANIFEST, 'site.json'));
  if (!site.journal?.author || !site.journal?.indexUrl || !site.journal?.feedUrl) {
    throw new Error('[journal] site.json must define journal.author, journal.indexUrl, and journal.feedUrl');
  }

  const entries = loadJournalEntries({
    directory: JOURNAL_ROOT,
    defaultAuthor: site.journal.author,
    includeDrafts,
    urlPrefix: site.journal.urlPrefix,
  }).map((entry) => ({
    ...entry,
    schema: journalEntrySchema(site, entry),
  }));
  const journalPages = entries.map((entry) => ({
    title: entry.title,
    url: entry.url,
    out: entry.out,
    chrome: 'journal',
    style: 'journal',
    description: entry.description,
    breadcrumbParent: site.journal.indexUrl,
    generated: 'journal-entry',
    ogType: 'article',
    author: entry.author,
    publishedIso: entry.publishedIso,
    updatedIso: entry.updatedIso,
    draft: entry.draft,
    journalEntry: entry,
  }));

  return {
    ...site,
    journal: { ...site.journal, entries },
    pages: [...site.pages, ...journalPages],
  };
}

function journalEntrySchema(site, entry) {
  const absoluteUrl = new URL(entry.url, site.url).toString();
  return {
    '@context': 'https://schema.org',
    '@type': 'TechArticle',
    headline: entry.title,
    description: entry.description,
    datePublished: entry.publishedIso,
    dateModified: entry.updatedIso || entry.publishedIso,
    author: { '@type': 'Person', name: entry.author },
    publisher: { '@type': 'Organization', name: site.name, url: site.url },
    mainEntityOfPage: absoluteUrl,
    isPartOf: new URL(site.journal.indexUrl, site.url).toString(),
  };
}

function journalCollectionSchema(site) {
  return {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: site.journal.title,
    description: site.journal.description,
    url: new URL(site.journal.indexUrl, site.url).toString(),
    hasPart: site.journal.entries.filter((entry) => !entry.draft).map((entry) => ({
      '@type': 'TechArticle',
      headline: entry.title,
      url: new URL(entry.url, site.url).toString(),
    })),
  };
}

function* walk(dir) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(full);
    else yield full;
  }
}

function writeDist(relativePath, contents) {
  const output = path.join(DIST, relativePath);
  fs.mkdirSync(path.dirname(output), { recursive: true });
  const html = relativePath.endsWith('.html') ? externalLinks(String(contents)) : contents;
  fs.writeFileSync(output, html);
}

function externalLinks(html) {
  return html.replace(/<a\b([^>]*?)\bhref=(["'])(https?:\/\/[^"']+)\2([^>]*)>/gi, (match, before, quote, href, after) => {
    let parsed;
    try {
      parsed = new URL(href);
    } catch {
      return match;
    }
    if (parsed.origin === new URL(SITE_BASE).origin) return match;

    let tag = `<a${before}href=${quote}${href}${quote}${after}>`;
    if (!/\btarget=/i.test(tag)) tag = tag.replace(/>$/, ' target="_blank">');
    if (!/\brel=/i.test(tag)) tag = tag.replace(/>$/, ' rel="noopener noreferrer">');
    return tag;
  });
}

function setupHandlebars(site) {
  const hb = Handlebars.create();
  const pagesByUrl = new Map(site.pages.map((page) => [page.url, page]));

  hb.registerHelper('eq', (a, b) => a === b);
  hb.registerHelper('year', () => new Date().getFullYear());
  hb.registerHelper('activeClass', (href, current) => href === current ? 'is-active' : '');
  hb.registerHelper('docsActiveClass', (href, current) => {
    const currentPage = pagesByUrl.get(current);
    return href === current || currentPage?.breadcrumbParent === href ? 'is-active' : '';
  });
  hb.registerHelper('pageForUrl', (url) => pagesByUrl.get(url));
  hb.registerHelper('json', (value) => JSON.stringify(value).replace(/</g, '\\u003c'));

  hb.registerPartial('html-head-block', '');
  hb.registerPartial('header-block', '');
  hb.registerPartial('body-block', '');
  hb.registerPartial('scripts-block', '');

  const partialRoot = path.join(SRC, 'partials');
  for (const file of walk(partialRoot)) {
    if (!file.endsWith('.hbs')) continue;
    const relativeName = path.relative(partialRoot, file).replace(/\\/g, '/').replace(/\.hbs$/, '');
    const source = fs.readFileSync(file, 'utf8');
    hb.registerPartial(relativeName, source);
    hb.registerPartial(path.basename(file, '.hbs'), source);
  }
  return hb;
}

function styleHrefs(page) {
  const hrefs = ['/assets/main.css'];
  if (page.style) hrefs.push(`/assets/${page.style}.css`);
  return hrefs;
}

async function clean() {
  await fsp.rm(DIST, { recursive: true, force: true });
}

function html(done) {
  try {
    const site = readSite();
    const nav = readJSON(path.join(MANIFEST, 'nav.json'));
    const hb = setupHandlebars(site);

    for (const page of site.pages) {
      const sourcePath = page.generated === 'journal-entry'
        ? JOURNAL_ENTRY_TEMPLATE
        : path.join(SRC, 'pages', page.src);
      if (!fs.existsSync(sourcePath)) {
        done(new Error(`[manifest] Missing page source: ${page.src || sourcePath}`));
        return;
      }
      const template = hb.compile(fs.readFileSync(sourcePath, 'utf8'));
      const rendered = template({
        site,
        nav,
        page,
        entry: page.journalEntry,
        currentUrl: page.url,
        styleHrefs: styleHrefs(page),
        journalEntries: site.journal.entries,
        journalCollectionSchema: journalCollectionSchema(site),
        docsGroups: site.docsGroups.map((group) => ({
          ...group,
          pages: group.urls.map((url) => pagesByUrl(site, url)).filter(Boolean),
        })),
      });
      writeDist(page.out, rendered);
    }
    done();
  } catch (error) {
    done(error);
  }
}

function pagesByUrl(site, url) {
  return site.pages.find((page) => page.url === url);
}

function styles(done) {
  let settled = false;
  const finish = (error) => {
    if (settled) return;
    settled = true;
    done(error);
  };

  gulp.src([
    path.join(SRC, 'styles', 'main.less'),
    path.join(SRC, 'styles', 'home.less'),
    path.join(SRC, 'styles', 'compare.less'),
    path.join(SRC, 'styles', 'journal.less'),
    path.join(SRC, 'styles', 'pooling.less'),
    path.join(SRC, 'styles', 'start.less'),
  ])
    .pipe(less())
    .on('error', finish)
    .pipe(autoprefixer())
    .pipe(gulp.dest(path.join(DIST, 'assets')))
    .on('error', finish)
    .on('end', () => finish());
}

function scripts(done) {
  const result = spawnSync(process.execPath, [path.join(ROOT, 'node_modules', 'typescript', 'bin', 'tsc'), '-p', 'tsconfig.json'], {
    cwd: ROOT,
    stdio: 'inherit',
  });
  if (result.status !== 0) {
    done(new Error('TypeScript compilation failed.'));
    return;
  }
  done();
}

function assets() {
  return gulp.src(path.join(SRC, 'assets', '**/*'), { encoding: false, allowEmpty: true })
    .pipe(gulp.dest(path.join(DIST, 'assets')));
}

function legacyLibraries() {
  return gulp.src(path.join(SRC, 'lib', '**/*'), { encoding: false, allowEmpty: true })
    .pipe(gulp.dest(path.join(DIST, 'assets', 'lib')));
}

function staticFiles() {
  return gulp.src(path.join(SRC, 'static', '**/*'), { dot: true, allowEmpty: true })
    .pipe(gulp.dest(DIST));
}

function sitemap(done) {
  const site = readSite();
  const urls = site.pages
    .filter((page) => !page.internal && !page.draft)
    .map((page) => `  <url><loc>${SITE_BASE}${page.url === '/' ? '/' : page.url}</loc></url>`)
    .join('\n');
  writeDist('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`);
  done();
}

function journalFeed(done) {
  try {
    const site = readSite({ includeDrafts: false });
    writeDist('journal/feed.xml', renderJournalFeed({
      siteUrl: site.url,
      indexUrl: site.journal.indexUrl,
      feedUrl: site.journal.feedUrl,
      title: `${site.journal.title} | ${site.name}`,
      description: site.journal.description,
      entries: site.journal.entries,
    }));
    done();
  } catch (error) {
    done(error);
  }
}

function searchIndex(done) {
  const runner = path.join(ROOT, 'node_modules', 'pagefind', 'lib', 'runner', 'bin.cjs');
  const result = spawnSync(process.execPath, [runner, '--site', 'dist'], { cwd: ROOT, stdio: 'inherit' });
  if (result.status !== 0) console.warn('[pagefind] Search index generation failed (non-fatal).');
  done();
}

function checkManifest(done) {
  try {
    const site = readSite({ includeDrafts: true });
    const sources = new Set(site.pages.filter((page) => page.src).map((page) => page.src));
    const outputs = new Set();
    const urls = new Set();
    const errors = [];

    for (const page of site.pages) {
      if (outputs.has(page.out)) errors.push(`duplicate output ${page.out}`);
      if (urls.has(page.url)) errors.push(`duplicate URL ${page.url}`);
      outputs.add(page.out);
      urls.add(page.url);
    }
    for (const page of site.pages) {
      if (page.breadcrumbParent === page.url) errors.push(`page cannot be its own breadcrumb parent: ${page.url}`);
      if (page.breadcrumbParent && !urls.has(page.breadcrumbParent)) {
        errors.push(`breadcrumb parent references missing URL ${page.breadcrumbParent}`);
      }
    }
    for (const file of fs.readdirSync(path.join(SRC, 'pages'))) {
      if (file.endsWith('.hbs') && !sources.has(file)) errors.push(`unregistered page ${file}`);
    }
    for (const group of site.docsGroups) {
      for (const url of group.urls) {
        if (!urls.has(url)) errors.push(`docs navigation references missing URL ${url}`);
      }
    }

    done(errors.length ? new Error(`[manifest] ${errors.join('; ')}`) : undefined);
  } catch (error) {
    done(error);
  }
}

function serve(done) {
  const server = http.createServer((request, response) => {
    const requestUrl = new URL(request.url || '/', 'http://localhost');
    let relative = decodeURIComponent(requestUrl.pathname).replace(/^\/+/, '');
    if (!relative || relative.endsWith('/')) relative += 'index.html';
    const requested = path.resolve(DIST, relative);
    if (!requested.startsWith(path.resolve(DIST))) {
      response.writeHead(403).end('Forbidden');
      return;
    }
    fs.readFile(requested, (error, data) => {
      if (error) {
        response.writeHead(404).end('Not found');
        return;
      }
      const extension = path.extname(requested);
      const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.xml': 'application/xml' };
      response.writeHead(200, { 'Content-Type': types[extension] || 'application/octet-stream' });
      response.end(data);
    });
  });
  server.listen(3000, () => console.log('Simple Java Mail site: http://localhost:3000'));
  done();
}

function watchFiles() {
  gulp.watch([path.join(SRC, '**/*'), path.join(MANIFEST, '*.json')], gulp.series(build));
}

function enableJournalDrafts(done) {
  previewJournalDrafts = true;
  done();
}

const compile = gulp.parallel(html, styles, scripts, assets, legacyLibraries, staticFiles, sitemap, journalFeed);
const build = gulp.series(clean, checkManifest, compile, searchIndex);

gulp.task('clean', clean);
gulp.task('check', checkManifest);
gulp.task('build', build);
gulp.task('dev', gulp.series(enableJournalDrafts, build, gulp.parallel(watchFiles, serve)));
gulp.task('default', build);

export { clean, checkManifest as check, build };
