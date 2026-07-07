"use strict";

const fs = require("fs");
const http = require("http");
const https = require("https");
const path = require("path");
const { spawnSync } = require("child_process");

const rootDir = path.resolve(__dirname, "..");
const distDir = path.join(rootDir, "dist");
const ownHosts = new Set(["simplejavamail.org", "www.simplejavamail.org"]);
const ignoredSchemes = /^(mailto|tel|javascript|data):/i;
const mode = process.argv[2] || "all";
const skipBuild = process.argv.includes("--no-build");
const failOnRedirect = process.argv.includes("--fail-on-redirect");
const requestTimeoutMs = 15000;
const maxConcurrentRequests = 6;
const acceptedRedirects = [
	/^https:\/\/javadoc\.io\/page\/org\.simplejavamail\/simple-java-mail\/latest\//,
	/^https?:\/\/(?:www\.)?bennybottema\.com\/?$/
];

if (!["all", "internal", "external"].includes(mode)) {
	console.error("Usage: node scripts/verify-links.js [all|internal|external] [--no-build] [--fail-on-redirect]");
	process.exit(2);
}

main().catch(error => {
	console.error(error && error.stack ? error.stack : error);
	process.exit(1);
});

async function main() {
	if (!skipBuild) {
		runBuild();
	}

	const htmlFiles = findHtmlFiles(distDir);
	if (htmlFiles.length === 0) {
		throw new Error(`No generated HTML files found in ${distDir}`);
	}

	const pages = htmlFiles.map(file => readPage(file));
	let failures = 0;

	if (mode === "all" || mode === "internal") {
		failures += verifyInternalLinks(pages);
	}

	if (mode === "all" || mode === "external") {
		failures += await verifyExternalLinks(pages);
	}

	if (failures > 0) {
		process.exit(1);
	}
}

function runBuild() {
	const gulpBinary = path.join(rootDir, "node_modules", "gulp", "bin", "gulp.js");
	const result = spawnSync(process.execPath, [gulpBinary, "build"], {
		cwd: rootDir,
		stdio: "inherit"
	});

	if (result.error) {
		throw result.error;
	}

	if (result.status !== 0) {
		process.exit(result.status || 1);
	}
}

function findHtmlFiles(dir) {
	const files = [];
	for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
		const entryPath = path.join(dir, entry.name);
		if (entry.isDirectory()) {
			files.push(...findHtmlFiles(entryPath));
		} else if (entry.isFile() && entry.name.endsWith(".html")) {
			files.push(entryPath);
		}
	}
	return files.sort();
}

function readPage(file) {
	const html = fs.readFileSync(file, "utf8");
	return {
		file,
		route: toRoute(file),
		html,
		links: extractLinks(html),
		anchors: extractAnchors(html)
	};
}

function extractLinks(html) {
	const links = [];
	const tagPattern = /<([a-z][a-z0-9:-]*)([^>]*)>/gi;
	let tagMatch;
	while ((tagMatch = tagPattern.exec(html)) !== null) {
		const tagName = tagMatch[1].toLowerCase();
		const attributes = tagMatch[2];
		const rel = getAttribute(attributes, "rel");
		const skipExternalHint = tagName === "link" && rel && /\b(preconnect|dns-prefetch)\b/i.test(rel);
		const linkPattern = /\b(href|src)=["']([^"']+)["']/gi;
		let linkMatch;

		while ((linkMatch = linkPattern.exec(attributes)) !== null) {
			if (skipExternalHint && linkMatch[1].toLowerCase() === "href") {
				continue;
			}

			const value = decodeHtml(linkMatch[2]).trim();
			if (value !== "" && !ignoredSchemes.test(value)) {
				links.push(value);
			}
		}
	}
	return links;
}

function extractAnchors(html) {
	const anchors = new Set();
	const anchorPattern = /\b(?:id|name)=["']([^"']+)["']/gi;
	let match;
	while ((match = anchorPattern.exec(html)) !== null) {
		anchors.add(decodeHtml(match[1]));
	}
	return anchors;
}

function getAttribute(attributes, name) {
	const match = new RegExp(`\\b${name}=["']([^"']+)["']`, "i").exec(attributes);
	return match ? decodeHtml(match[1]) : "";
}

function verifyInternalLinks(pages) {
	const pagesByRoute = new Map(pages.map(page => [page.route, page]));
	const failures = [];
	let checked = 0;

	for (const page of pages) {
		for (const link of page.links) {
			const target = resolveInternalTarget(page, link);
			if (target === null) {
				continue;
			}

			checked++;
			const targetPage = pagesByRoute.get(target.route);
			if (!targetPage) {
				const targetPath = path.join(distDir, target.route);
				if (fs.existsSync(targetPath) && fs.statSync(targetPath).isFile() && !target.anchor) {
					continue;
				}
				failures.push(`${formatPage(page.file)} -> ${link} (missing ${target.route})`);
				continue;
			}

			if (target.anchor && !targetPage.anchors.has(target.anchor)) {
				failures.push(`${formatPage(page.file)} -> ${link} (missing #${target.anchor})`);
			}
		}
	}

	if (failures.length === 0) {
		console.log(`Internal link check passed: ${checked} local links across ${pages.length} pages.`);
		return 0;
	}

	console.error(`Internal link check failed: ${failures.length} broken local links.`);
	for (const failure of failures) {
		console.error(`  - ${failure}`);
	}
	return failures.length;
}

async function verifyExternalLinks(pages) {
	const externalLinks = collectExternalLinks(pages);
	const urls = Array.from(externalLinks.keys()).sort();

	if (urls.length === 0) {
		console.log("External link check skipped: no external links found.");
		return 0;
	}

	console.log(`External link check: checking ${urls.length} unique external links with GET requests.`);

	const results = await runLimited(urls, maxConcurrentRequests, url => checkExternalUrl(url));
	const broken = [];
	const blocked = [];
	const warnings = [];
	const redirects = [];

	for (const result of results) {
		if (result.kind === "broken") {
			broken.push(result);
		} else if (result.kind === "blocked") {
			blocked.push(result);
		} else if (result.kind === "warning") {
			warnings.push(result);
		} else if (result.redirected && !isAcceptedRedirect(result.url)) {
			redirects.push(result);
		}
	}

	const reachable = results.length - broken.length - blocked.length - warnings.length;
	console.log(`External link check completed: ${reachable} reachable (${redirects.length} redirected), ${blocked.length} blocked, ${warnings.length} warnings, ${broken.length} broken.`);
	printExternalGroup("Redirected links to review", redirects, externalLinks);
	printExternalGroup("Blocked links, probably bot protection", blocked, externalLinks);
	printExternalGroup("Warnings, probably transient or TLS/tooling-related", warnings, externalLinks);
	printExternalGroup("Broken external links", broken, externalLinks);

	if (broken.length > 0 || (failOnRedirect && redirects.length > 0)) {
		return broken.length + (failOnRedirect ? redirects.length : 0);
	}
	return 0;
}

function collectExternalLinks(pages) {
	const externalLinks = new Map();

	for (const page of pages) {
		for (const link of page.links) {
			const url = resolveExternalUrl(link);
			if (url === null) {
				continue;
			}

			const withoutHash = stripHash(url);
			if (!externalLinks.has(withoutHash)) {
				externalLinks.set(withoutHash, new Set());
			}
			externalLinks.get(withoutHash).add(formatPage(page.file));
		}
	}

	return externalLinks;
}

function resolveInternalTarget(page, link) {
	if (link.startsWith("//")) {
		return null;
	}

	let url;
	try {
		url = new URL(link, `https://www.simplejavamail.org/${page.route}`);
	} catch (error) {
		return null;
	}

	if (url.protocol !== "http:" && url.protocol !== "https:") {
		return null;
	}

	if (!ownHosts.has(url.hostname)) {
		return null;
	}

	return {
		route: normalizeRoute(url.pathname),
		anchor: url.hash ? decodeURIComponent(url.hash.substring(1)) : ""
	};
}

function resolveExternalUrl(link) {
	let url;
	try {
		url = link.startsWith("//") ? new URL(`https:${link}`) : new URL(link);
	} catch (error) {
		return null;
	}

	if ((url.protocol !== "http:" && url.protocol !== "https:") || ownHosts.has(url.hostname)) {
		return null;
	}

	return url.toString();
}

async function checkExternalUrl(url) {
	const response = await requestUrl(url);

	if (response.error) {
		return classifyError(url, response.error);
	}

	const redirected = normalizeUrl(response.url) !== normalizeUrl(url);
	const base = {
		url,
		status: response.status,
		finalUrl: response.url,
		redirected
	};

	if (response.status >= 200 && response.status < 400) {
		return { ...base, kind: "ok" };
	}

	if ([401, 403, 429].includes(response.status)) {
		return { ...base, kind: "blocked", reason: `HTTP ${response.status}` };
	}

	return { ...base, kind: "broken", reason: `HTTP ${response.status}` };
}

function requestUrl(url) {
	return new Promise(resolve => {
		const urlObj = new URL(url);
		const client = urlObj.protocol === "http:" ? http : https;
		const requestOptions = {
			method: "GET",
			timeout: requestTimeoutMs,
			headers: {
				"User-Agent": "Mozilla/5.0 SimpleJavaMailLinkAudit/1.0",
				"Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
			}
		};

		if (urlObj.protocol === "https:") {
			// This audit is about moved or missing content. Local AV/TLS proxies make certificate validation noisy on developer machines.
			requestOptions.rejectUnauthorized = false;
		}

		const request = client.request(urlObj, requestOptions, response => {
			const location = response.headers.location;
			response.resume();

			if (location && response.statusCode >= 300 && response.statusCode < 400) {
				const redirectedUrl = new URL(location, url).toString();
				resolve(requestUrl(redirectedUrl));
				return;
			}

			resolve({
				status: response.statusCode || 0,
				url
			});
		});

		request.on("timeout", () => {
			request.destroy(new Error(`Timeout after ${requestTimeoutMs}ms`));
		});

		request.on("error", error => {
			resolve({ error });
		});

		request.end();
	});
}

function classifyError(url, error) {
	const code = error.code || (error.cause && error.cause.code) || "";
	const reason = code ? `${code}: ${error.message}` : error.message;

	if (["ENOTFOUND", "ECONNREFUSED", "EAI_AGAIN"].includes(code)) {
		return { url, kind: "broken", reason };
	}

	return { url, kind: "warning", reason };
}

async function runLimited(items, concurrency, worker) {
	const results = [];
	let next = 0;

	async function runWorker() {
		while (next < items.length) {
			const index = next++;
			results[index] = await worker(items[index]);
		}
	}

	await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, runWorker));
	return results;
}

function printExternalGroup(title, results, referrersByUrl) {
	if (results.length === 0) {
		return;
	}

	console.log(`\n${title}: ${results.length}`);
	for (const result of results) {
		const suffix = result.redirected ? ` -> ${result.finalUrl}` : "";
		const reason = result.reason ? ` (${result.reason})` : "";
		console.log(`  - ${result.url}${suffix}${reason}`);
		for (const referrer of referrersByUrl.get(result.url) || []) {
			console.log(`      from ${referrer}`);
		}
	}
}

function isAcceptedRedirect(url) {
	return acceptedRedirects.some(pattern => pattern.test(url));
}

function toRoute(file) {
	return normalizeRoute(path.relative(distDir, file).replace(/\\/g, "/"));
}

function normalizeRoute(route) {
	let normalized = decodeURIComponent(route || "/");
	if (normalized.startsWith("/")) {
		normalized = normalized.substring(1);
	}
	if (normalized === "") {
		return "index.html";
	}
	if (normalized.endsWith("/")) {
		return `${normalized}index.html`;
	}
	return normalized;
}

function stripHash(url) {
	const parsed = new URL(url);
	parsed.hash = "";
	return parsed.toString();
}

function normalizeUrl(url) {
	const parsed = new URL(url);
	parsed.hash = "";
	if ((parsed.protocol === "http:" && parsed.port === "80") || (parsed.protocol === "https:" && parsed.port === "443")) {
		parsed.port = "";
	}
	return parsed.toString().replace(/\/$/, "");
}

function decodeHtml(value) {
	return value
		.replace(/&amp;/g, "&")
		.replace(/&quot;/g, "\"")
		.replace(/&#39;/g, "'")
		.replace(/&lt;/g, "<")
		.replace(/&gt;/g, ">");
}

function formatPage(file) {
	return path.relative(rootDir, file).replace(/\\/g, "/");
}
