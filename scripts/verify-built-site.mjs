import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';

const ROOT = process.cwd();
const DIST = path.join(ROOT, 'dist');
const SITE = 'https://modrinth.bearaujus.com';
const errors = [];

function check(condition, message) {
  if (!condition) errors.push(message);
}

async function collectFiles(directory) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await collectFiles(absolute)));
    else if (entry.isFile()) files.push(absolute);
  }
  return files;
}

function relativeFile(absolute) {
  return path.relative(DIST, absolute).split(path.sep).join('/');
}

function attributes(tag) {
  return Object.fromEntries(
    [...tag.matchAll(/([:\w-]+)="([^"]*)"/g)].map((match) => [match[1], match[2]]),
  );
}

function metaContent(html, key, value) {
  for (const match of html.matchAll(/<meta\b[^>]*>/g)) {
    const attrs = attributes(match[0]);
    if (attrs[key] === value) return attrs.content;
  }
  return undefined;
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function pngDimensions(bytes) {
  const signature = '89504e470d0a1a0a';
  check(bytes.length >= 24 && bytes.subarray(0, 8).toString('hex') === signature, 'og.png is not a valid PNG');
  return bytes.length >= 24
    ? { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) }
    : { width: 0, height: 0 };
}

const absoluteFiles = await collectFiles(DIST);
const files = new Set(absoluteFiles.map(relativeFile));
const htmlFiles = absoluteFiles.filter((file) => file.endsWith('.html'));
check(htmlFiles.length > 0, 'dist contains no HTML files');

const htmlDocuments = new Map(
  await Promise.all(
    htmlFiles.map(async (file) => [relativeFile(file), await readFile(file, 'utf8')]),
  ),
);

for (const [relative, html] of htmlDocuments) {
  const idValues = [...html.matchAll(/\bid="([^"]+)"/g)].map((match) => match[1]);
  const ids = new Set(idValues);
  const htmlTag = html.match(/<html\b[^>]*>/)?.[0] ?? '';
  const rootStyle = attributes(htmlTag).style ?? '';
  const links = [...html.matchAll(/<link\b[^>]*>/g)].map((match) => attributes(match[0]));

  check(/<html\b[^>]*\blang="en"/.test(html), `${relative}: missing English document language`);
  check(
    /(?:^|;)\s*background-color\s*:\s*#0b0d10\s*(?:;|$)/i.test(rootStyle),
    `${relative}: missing the inline dark canvas color that prevents a white first-paint flash`,
  );
  check(
    /(?:^|;)\s*color-scheme\s*:\s*dark\s*(?:;|$)/i.test(rootStyle),
    `${relative}: missing the inline dark root color scheme`,
  );
  check(metaContent(html, 'name', 'color-scheme') === 'dark', `${relative}: missing dark color-scheme metadata`);
  check(
    !links.some((attrs) => attrs.rel?.split(/\s+/).includes('stylesheet')),
    `${relative}: contains a render-blocking external stylesheet`,
  );
  check(
    links.some((attrs) => attrs.rel === 'preload' && attrs.as === 'font' && attrs.type === 'font/woff2'),
    `${relative}: critical body font is not preloaded`,
  );
  check(html.includes('data-boot-screen'), `${relative}: progressive boot screen is missing`);
  check(html.includes('dataset.boot'), `${relative}: fail-safe boot initializer is missing`);
  check((html.match(/<h1\b/g) ?? []).length === 1, `${relative}: expected exactly one h1`);
  check(idValues.length === ids.size, `${relative}: duplicate element id found`);
  check(ids.has('main-content'), `${relative}: skip-link target #main-content is missing`);
  check(!/26\.1(?:\.|x|\b)/.test(html), `${relative}: stale Minecraft 26.1 reference found`);
  check(!/\b(?:href|src)="http:\/\//i.test(html), `${relative}: insecure HTTP asset or link found`);

  const robots = metaContent(html, 'name', 'robots') ?? '';
  if (relative === '404.html') check(/\bnoindex\b/.test(robots), '404.html: missing noindex directive');
  else check(/\bindex\b/.test(robots), `${relative}: missing index directive`);

  for (const match of html.matchAll(/\bhref="#([^"]+)"/g)) {
    check(ids.has(match[1]), `${relative}: fragment #${match[1]} has no matching id`);
  }

  for (const match of html.matchAll(/<(?:a|link|img|script)\b[^>]*\b(?:href|src)="(\/[^"]*)"[^>]*>/g)) {
    const url = new URL(match[1], SITE);
    let target = decodeURIComponent(url.pathname).replace(/^\//, '');
    if (!target) target = 'index.html';
    const candidates = [target, `${target.replace(/\/$/, '')}/index.html`];
    const candidate = candidates.find((file) => files.has(file));
    check(Boolean(candidate), `${relative}: local target ${url.pathname} is missing`);

    if (candidate?.endsWith('.html') && url.hash) {
      const targetHtml = htmlDocuments.get(candidate);
      const id = decodeURIComponent(url.hash.slice(1));
      check(
        targetHtml ? new RegExp(`\\bid="${escapeRegExp(id)}"`).test(targetHtml) : false,
        `${relative}: fragment ${url.hash} has no matching id in ${candidate}`,
      );
    }
  }

  for (const match of html.matchAll(/<img\b[^>]*>/g)) {
    const attrs = attributes(match[0]);
    check(Object.hasOwn(attrs, 'alt'), `${relative}: image is missing an alt attribute`);
    check(/^\d+$/.test(attrs.width ?? '') && /^\d+$/.test(attrs.height ?? ''), `${relative}: image lacks numeric dimensions`);
  }

  for (const match of html.matchAll(/<a\b[^>]*\btarget="_blank"[^>]*>/g)) {
    const rel = attributes(match[0]).rel?.split(/\s+/) ?? [];
    check(rel.includes('noopener') && rel.includes('noreferrer'), `${relative}: target=_blank link lacks safe rel tokens`);
  }

  const canonical = links.find((attrs) => attrs.rel === 'canonical')?.href;
  check(canonical?.startsWith(`${SITE}/`) === true, `${relative}: canonical URL is missing or off-site`);

  const jsonLdMatch = html.match(/<script\b[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/);
  if (relative === 'index.html') check(Boolean(jsonLdMatch), `${relative}: JSON-LD is missing`);
  if (jsonLdMatch) {
    try {
      JSON.parse(jsonLdMatch[1]);
    } catch (error) {
      errors.push(`${relative}: JSON-LD is invalid (${error instanceof Error ? error.message : String(error)})`);
    }
  }
}

for (const required of [
  '404.html',
  'CNAME',
  'favicon.svg',
  'icon-192.png',
  'icon-512.png',
  'apple-touch-icon.png',
  'og.png',
  'robots.txt',
  'site.webmanifest',
  'sitemap-index.xml',
]) {
  check(files.has(required), `dist/${required} is missing`);
}

const indexHtml = htmlDocuments.get('index.html') ?? '';
const ogBytes = await readFile(path.join(DIST, 'og.png'));
const og = pngDimensions(ogBytes);
check(metaContent(indexHtml, 'property', 'og:image:width') === String(og.width), 'og:image:width does not match og.png');
check(metaContent(indexHtml, 'property', 'og:image:height') === String(og.height), 'og:image:height does not match og.png');
check(Boolean(metaContent(indexHtml, 'name', 'twitter:image:alt')), 'twitter:image:alt is missing');

const cname = (await readFile(path.join(DIST, 'CNAME'), 'utf8')).trim();
check(cname === 'modrinth.bearaujus.com', 'CNAME does not match the production domain');

const robots = await readFile(path.join(DIST, 'robots.txt'), 'utf8');
check(robots.includes(`${SITE}/sitemap-index.xml`), 'robots.txt does not reference the production sitemap');

const sitemapFiles = [...files].filter((file) => /^sitemap.*\.xml$/.test(file));
const sitemap = (await Promise.all(sitemapFiles.map((file) => readFile(path.join(DIST, file), 'utf8')))).join('\n');
check(!sitemap.includes(`${SITE}/404`), 'sitemap must not include the 404 page');

const manifest = JSON.parse(await readFile(path.join(DIST, 'site.webmanifest'), 'utf8'));
check(manifest.id === '/' && manifest.start_url === '/' && manifest.scope === '/', 'web manifest navigation scope is incomplete');
for (const icon of manifest.icons ?? []) {
  const iconPath = String(icon.src ?? '').replace(/^\//, '');
  check(files.has(iconPath), `web manifest icon ${icon.src} is missing`);
}

if (errors.length) {
  console.error(`Built-site verification failed with ${errors.length} issue(s):`);
  for (const error of errors) console.error(`- ${error}`);
  process.exitCode = 1;
} else {
  console.log(`Built-site verification passed (${htmlFiles.length} HTML page, ${files.size} generated files).`);
}
