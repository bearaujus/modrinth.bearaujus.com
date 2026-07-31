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

let catalog = null;
try {
  catalog = JSON.parse(await readFile(path.join(DIST, 'catalog.json'), 'utf8'));
} catch (error) {
  errors.push(
    `catalog.json is missing or invalid (${error instanceof Error ? error.message : String(error)})`,
  );
}

const catalogMods = Array.isArray(catalog?.mods) ? catalog.mods : [];
const publicModEntries = await readdir(path.join(ROOT, 'public', 'mods'), {
  withFileTypes: true,
});
const publicModSlugs = publicModEntries
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .sort();

check(catalog?.schemaVersion === 1, 'catalog.json has an unsupported schema version');
check(/^\d{4}-\d{2}-\d{2}$/.test(catalog?.reviewedAt ?? ''), 'catalog.json reviewedAt is invalid');
check(catalog?.website === SITE, 'catalog.json website does not match production');
check(
  catalog?.support === 'https://github.com/bearaujus-dungeon/minecraft-addons/issues',
  'catalog.json support URL is missing or stale',
);
check(catalog?.compatibility?.minecraft === '26.2', 'catalog.json Minecraft version is stale');
check(catalog?.compatibility?.series === '26.2.x', 'catalog.json Minecraft series is stale');
check(catalog?.compatibility?.range === '>=26.2 <26.3.0', 'catalog.json Minecraft range is stale');
check(catalog?.compatibility?.loader === 'Fabric', 'catalog.json loader is stale');
check(catalogMods.length === publicModSlugs.length, 'catalog mod count does not match public icon folders');

const catalogSlugs = catalogMods.map((mod) => mod.slug).sort();
check(
  JSON.stringify(catalogSlugs) === JSON.stringify(publicModSlugs),
  'catalog slugs do not match public icon folders',
);

const projectIds = new Set();
const versionIds = new Set();
for (const mod of catalogMods) {
  const label = typeof mod?.slug === 'string' ? mod.slug : '<invalid mod>';
  check(typeof mod?.name === 'string' && mod.name.length >= 3, `${label}: catalog name is invalid`);
  check(typeof mod?.summary === 'string' && mod.summary.length >= 40, `${label}: catalog summary is too short`);
  check(/^\d+\.\d+\.\d+\+26\.2$/.test(mod?.version ?? ''), `${label}: catalog version is invalid`);
  check(/^[A-Za-z0-9]{8}$/.test(mod?.projectId ?? ''), `${label}: project id is invalid`);
  check(/^[A-Za-z0-9]{8}$/.test(mod?.versionId ?? ''), `${label}: version id is invalid`);
  check(!projectIds.has(mod?.projectId), `${label}: duplicate project id`);
  check(!versionIds.has(mod?.versionId), `${label}: duplicate version id`);
  projectIds.add(mod?.projectId);
  versionIds.add(mod?.versionId);
  check(mod?.page === `${SITE}/mods/${label}/`, `${label}: canonical page URL is invalid`);
  check(mod?.project === `https://modrinth.com/mod/${label}`, `${label}: project URL is invalid`);
  check(
    mod?.release === `${mod?.project}/version/${mod?.versionId}`,
    `${label}: exact release URL is invalid`,
  );
  check(Array.isArray(mod?.categories) && mod.categories.length > 0, `${label}: categories are missing`);
  check(
    Array.isArray(mod?.discoveryQueries) && mod.discoveryQueries.length > 0,
    `${label}: discovery queries are missing`,
  );
  check(mod?.environment?.client === 'optional', `${label}: client environment is stale`);
  check(mod?.environment?.server === 'required', `${label}: server environment is stale`);
  check(files.has(`mods/${label}/icon.png`), `${label}: public icon is missing`);
  check(files.has(`mods/${label}/index.html`), `${label}: generated landing page is missing`);
}

check(
  htmlFiles.length === catalogMods.length + 2,
  `expected ${catalogMods.length + 2} HTML pages for the catalog, home, and 404`,
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
  check(
    links.some(
      (attrs) =>
        attrs.rel === 'alternate' &&
        attrs.type === 'application/json' &&
        attrs.href === '/catalog.json',
    ),
    `${relative}: machine-readable catalog discovery link is missing`,
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
  if (relative !== '404.html') check(Boolean(jsonLdMatch), `${relative}: JSON-LD is missing`);
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
  'catalog.json',
  'og.png',
  'robots.txt',
  'site.webmanifest',
  'sitemap-index.xml',
]) {
  check(files.has(required), `dist/${required} is missing`);
}

const indexHtml = htmlDocuments.get('index.html') ?? '';
for (const mod of catalogMods) {
  const pageFile = `mods/${mod.slug}/index.html`;
  const pageHtml = htmlDocuments.get(pageFile) ?? '';
  const pageLinks = [...pageHtml.matchAll(/<link\b[^>]*>/g)].map((match) => attributes(match[0]));
  check(indexHtml.includes(`href="/mods/${mod.slug}/"`), `index.html: missing internal link to ${mod.slug}`);
  check(pageHtml.includes(mod.summary), `${pageFile}: current summary is missing`);
  check(pageHtml.includes(mod.version), `${pageFile}: current release number is missing`);
  check(pageHtml.includes(`href="${mod.project}"`), `${pageFile}: Modrinth project link is missing`);
  check(pageHtml.includes(`href="${mod.release}"`), `${pageFile}: exact release link is missing`);
  check(pageHtml.includes(`src="/mods/${mod.slug}/icon.png"`), `${pageFile}: canonical icon is missing`);
  check(pageHtml.includes(`href="${catalog.support}"`), `${pageFile}: support link is missing`);
  check(
    pageLinks.some((attrs) => attrs.rel === 'canonical' && attrs.href === mod.page),
    `${pageFile}: canonical mod URL is missing or incorrect`,
  );
}

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
check(!sitemap.includes(`${SITE}/catalog.json`), 'sitemap must not list the machine-readable catalog as a page');
check(sitemap.includes(`<loc>${SITE}/</loc>`), 'sitemap is missing the homepage');
for (const mod of catalogMods) {
  check(sitemap.includes(`<loc>${mod.page}</loc>`), `sitemap is missing ${mod.slug}`);
}

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
