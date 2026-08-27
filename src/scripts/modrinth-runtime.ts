/* ============================================================
   Progressive browser-time hydration for public Modrinth data.

   Astro renders a complete reviewed snapshot first. This module
   validates public API responses, updates only safe DOM fields,
   and leaves the initial page untouched on every failure path.
   ============================================================ */

const API = 'https://api.modrinth.com/v2';
const CACHE_KEY = 'bearaujus:modrinth-catalog:v1';
const CACHE_TTL_MS = 5 * 60 * 1000;
const REQUEST_TIMEOUT_MS = 8000;
const VERSION_CHUNK_SIZE = 100;
const ID_PATTERN = /^[A-Za-z0-9]{8}$/;

type UnknownRecord = Record<string, unknown>;

export type ModrinthProjectSnapshot = Readonly<{
  id: string;
  slug: string;
  title: string | null;
  description: string | null;
  categories: readonly string[] | null;
  iconUrl: string | null;
  downloads: number | null;
  followers: number | null;
  versionIds: readonly string[];
}>;

export type ModrinthReleaseSnapshot = Readonly<{
  id: string;
  projectId: string;
  versionNumber: string;
  datePublished: string;
  versionType: string;
  status: string;
  gameVersions: readonly string[];
  loaders: readonly string[];
  environment: string;
}>;

type CatalogSnapshot = Readonly<{
  fetchedAt: number;
  projects: readonly ModrinthProjectSnapshot[];
  releases: readonly ModrinthReleaseSnapshot[];
}>;

export type EnvironmentCopy = Readonly<{
  short: string;
  title: string;
  description: string;
}>;

const ENVIRONMENT_COPY: Readonly<Record<string, EnvironmentCopy>> = {
  client_and_server: {
    short: 'Client + server',
    title: 'Client and server required',
    description: 'Install the current release on both the server and every joining client.',
  },
  client_only: {
    short: 'Client only',
    title: 'Client only',
    description: 'Install the current release only on clients; dedicated servers do not need it.',
  },
  client_only_server_optional: {
    short: 'Client-first',
    title: 'Client required · server optional',
    description: 'Clients require the mod; a server installation can add shared integration.',
  },
  singleplayer_only: {
    short: 'Single-player',
    title: 'Single-player only',
    description: 'The current release is intended for integrated single-player worlds.',
  },
  server_only: {
    short: 'Server only',
    title: 'Server only',
    description: 'Install the current release on the server; joining clients do not install it.',
  },
  server_only_client_optional: {
    short: 'Server-first',
    title: 'Server required · client optional',
    description:
      'Install it on the server. Optional client installs can add personal controls or presentation.',
  },
  dedicated_server_only: {
    short: 'Dedicated server',
    title: 'Dedicated server only',
    description: 'The current release is designed specifically for dedicated servers.',
  },
  client_or_server: {
    short: 'Client or server',
    title: 'Client or server',
    description: 'The current release can be installed independently on either side.',
  },
  client_or_server_prefers_both: {
    short: 'Both preferred',
    title: 'Client or server · both preferred',
    description: 'Either side can run it independently, while installing both provides the best fit.',
  },
  unknown: {
    short: 'See release',
    title: 'Check the release',
    description: 'Review the current Modrinth release for its installation environment.',
  },
};

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function cleanString(value: unknown, maximum = 300): string | null {
  if (typeof value !== 'string') return null;
  const cleaned = value.trim();
  return cleaned && cleaned.length <= maximum ? cleaned : null;
}

function safeId(value: unknown): string | null {
  return typeof value === 'string' && ID_PATTERN.test(value) ? value : null;
}

function safeMetric(value: unknown): number | null {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0
    ? value
    : null;
}

function cleanStringArray(value: unknown, maximumItems = 100): string[] | null {
  if (!Array.isArray(value) || value.length > maximumItems) return null;
  const items = value
    .map((item) => cleanString(item, 80))
    .filter((item): item is string => item !== null);
  return items.length === value.length ? [...new Set(items)] : null;
}

function safeCdnUrl(value: unknown): string | null {
  const candidate = cleanString(value, 2000);
  if (!candidate) return null;

  try {
    const url = new URL(candidate);
    return url.protocol === 'https:' && url.hostname === 'cdn.modrinth.com'
      ? url.href
      : null;
  } catch {
    return null;
  }
}

export function normalizeProject(
  value: unknown,
  knownIds?: ReadonlySet<string>,
): ModrinthProjectSnapshot | null {
  if (!isRecord(value)) return null;
  const id = safeId(value.id);
  if (!id || (knownIds && !knownIds.has(id))) return null;

  const featured = cleanStringArray(value.categories, 30);
  const additional = cleanStringArray(value.additional_categories, 30);
  const categories = featured && additional
    ? [...new Set([...featured, ...additional])]
    : featured ?? additional;
  const rawVersionIds = cleanStringArray(value.versions, 1000) ?? [];

  return {
    id,
    slug: cleanString(value.slug, 100) ?? id,
    title: cleanString(value.title, 120),
    description: cleanString(value.description, 500),
    categories,
    iconUrl: safeCdnUrl(value.raw_icon_url) ?? safeCdnUrl(value.icon_url),
    downloads: safeMetric(value.downloads),
    followers: safeMetric(value.followers),
    versionIds: rawVersionIds.filter((versionId) => ID_PATTERN.test(versionId)),
  };
}

export function normalizeRelease(
  value: unknown,
  knownProjectIds?: ReadonlySet<string>,
): ModrinthReleaseSnapshot | null {
  if (!isRecord(value)) return null;
  const id = safeId(value.id);
  const projectId = safeId(value.project_id);
  const versionNumber = cleanString(value.version_number, 120);
  const datePublished = cleanString(value.date_published, 80);
  const versionType = cleanString(value.version_type, 30);
  const status = cleanString(value.status, 30);
  const gameVersions = cleanStringArray(value.game_versions, 100);
  const loaders = cleanStringArray(value.loaders, 30);
  const environment = cleanString(value.environment, 80) ?? 'unknown';

  if (
    !id ||
    !projectId ||
    (knownProjectIds && !knownProjectIds.has(projectId)) ||
    !versionNumber ||
    !datePublished ||
    !Number.isFinite(Date.parse(datePublished)) ||
    !versionType ||
    !status ||
    !gameVersions?.length ||
    !loaders?.length
  ) {
    return null;
  }

  return {
    id,
    projectId,
    versionNumber,
    datePublished,
    versionType,
    status,
    gameVersions,
    loaders,
    environment,
  };
}

export function selectLatestStableRelease(
  projectId: string,
  releases: readonly ModrinthReleaseSnapshot[],
): ModrinthReleaseSnapshot | null {
  return (
    releases
      .filter(
        (release) =>
          release.projectId === projectId &&
          release.status === 'listed' &&
          release.versionType === 'release' &&
          release.loaders.some((loader) => loader.toLowerCase() === 'fabric'),
      )
      .sort((left, right) => Date.parse(right.datePublished) - Date.parse(left.datePublished))[0] ??
    null
  );
}

export function environmentCopy(environment: string): EnvironmentCopy {
  return ENVIRONMENT_COPY[environment] ?? ENVIRONMENT_COPY.unknown!;
}

function normalizeCachedProject(value: unknown, knownIds: ReadonlySet<string>) {
  if (!isRecord(value)) return null;
  return normalizeProject(
    {
      id: value.id,
      slug: value.slug,
      title: value.title,
      description: value.description,
      categories: value.categories,
      additional_categories: [],
      raw_icon_url: value.iconUrl,
      downloads: value.downloads,
      followers: value.followers,
      versions: value.versionIds,
    },
    knownIds,
  );
}

function normalizeCachedRelease(value: unknown, knownIds: ReadonlySet<string>) {
  if (!isRecord(value)) return null;
  return normalizeRelease(
    {
      id: value.id,
      project_id: value.projectId,
      version_number: value.versionNumber,
      date_published: value.datePublished,
      version_type: value.versionType,
      status: value.status,
      game_versions: value.gameVersions,
      loaders: value.loaders,
      environment: value.environment,
    },
    knownIds,
  );
}

function readCache(knownIds: ReadonlySet<string>): CatalogSnapshot | null {
  try {
    const parsed: unknown = JSON.parse(sessionStorage.getItem(CACHE_KEY) ?? 'null');
    if (!isRecord(parsed) || !Array.isArray(parsed.projects) || !Array.isArray(parsed.releases)) {
      return null;
    }

    const fetchedAt = safeMetric(parsed.fetchedAt);
    if (fetchedAt === null || Date.now() - fetchedAt >= CACHE_TTL_MS) return null;

    const projects = parsed.projects
      .map((project) => normalizeCachedProject(project, knownIds))
      .filter((project): project is ModrinthProjectSnapshot => project !== null);
    const releases = parsed.releases
      .map((release) => normalizeCachedRelease(release, knownIds))
      .filter((release): release is ModrinthReleaseSnapshot => release !== null);

    if (
      ![...knownIds].every((id) => projects.some((project) => project.id === id)) ||
      ![...knownIds].every((id) => releases.some((release) => release.projectId === id))
    ) {
      return null;
    }

    return { fetchedAt, projects, releases };
  } catch {
    return null;
  }
}

function writeCache(snapshot: CatalogSnapshot) {
  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify(snapshot));
  } catch {
    // Storage can be unavailable in hardened browsing modes. The live page
    // remains complete; it simply revalidates on the next navigation.
  }
}

async function fetchJson(url: string): Promise<unknown> {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      cache: 'no-store',
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`Modrinth API ${response.status}`);
    return await response.json();
  } finally {
    window.clearTimeout(timer);
  }
}

function chunks<T>(values: readonly T[], size: number): T[][] {
  const output: T[][] = [];
  for (let index = 0; index < values.length; index += size) {
    output.push(values.slice(index, index + size));
  }
  return output;
}

async function fetchCatalog(ids: readonly string[]) {
  const knownIds = new Set(ids);
  const projectUrl = `${API}/projects?ids=${encodeURIComponent(JSON.stringify(ids))}`;
  const projectData = await fetchJson(projectUrl);
  if (!Array.isArray(projectData)) throw new Error('Invalid Modrinth project response');

  const projects = projectData
    .map((project) => normalizeProject(project, knownIds))
    .filter((project): project is ModrinthProjectSnapshot => project !== null);
  const versionIds = [
    ...new Set(projects.flatMap((project) => [...project.versionIds])),
  ];

  const versionResponses = await Promise.allSettled(
    chunks(versionIds, VERSION_CHUNK_SIZE).map((group) =>
      fetchJson(`${API}/versions?ids=${encodeURIComponent(JSON.stringify(group))}`),
    ),
  );
  const releases = versionResponses
    .flatMap((result) => (result.status === 'fulfilled' && Array.isArray(result.value) ? result.value : []))
    .map((release) => normalizeRelease(release, knownIds))
    .filter((release): release is ModrinthReleaseSnapshot => release !== null);
  const selected = ids
    .map((id) => selectLatestStableRelease(id, releases))
    .filter((release): release is ModrinthReleaseSnapshot => release !== null);
  const complete =
    versionResponses.every(
      (result) => result.status === 'fulfilled' && Array.isArray(result.value),
    ) &&
    ids.every((id) => projects.some((project) => project.id === id)) &&
    ids.every((id) => selected.some((release) => release.projectId === id));

  return {
    snapshot: { fetchedAt: Date.now(), projects, releases: selected } satisfies CatalogSnapshot,
    complete,
  };
}

function projectWrappers(projectId: string): HTMLElement[] {
  return Array.from(document.querySelectorAll<HTMLElement>('[data-modrinth-project]')).filter(
    (element) => element.dataset.modrinthProject === projectId,
  );
}

function setField(wrapper: HTMLElement, field: string, value: string | null) {
  if (value === null) return;
  wrapper
    .querySelectorAll<HTMLElement>(`[data-modrinth-field="${field}"]`)
    .forEach((element) => {
      element.textContent = value;
    });
}

function formatMetric(value: number): string {
  return value.toLocaleString('en-US');
}

function formatLoader(loader: string): string {
  const normalized = loader.toLowerCase();
  if (normalized === 'fabric') return 'Fabric';
  if (normalized === 'neoforge') return 'NeoForge';
  if (normalized === 'quilt') return 'Quilt';
  return loader.charAt(0).toUpperCase() + loader.slice(1);
}

function formatList(values: readonly string[]): string {
  return values.join(', ');
}

function projectHref(project: ModrinthProjectSnapshot): string {
  return `https://modrinth.com/mod/${encodeURIComponent(project.slug)}`;
}

function releaseHref(
  project: ModrinthProjectSnapshot,
  release: ModrinthReleaseSnapshot,
): string {
  return `${projectHref(project)}/version/${encodeURIComponent(release.id)}`;
}

function updateCategories(wrapper: HTMLElement, categories: readonly string[] | null) {
  if (!categories?.length) return;

  wrapper.querySelectorAll<HTMLElement>('[data-modrinth-categories]').forEach((container) => {
    const template = container.querySelector<HTMLElement>('[data-modrinth-category-item]');
    if (!template) return;
    const variant = container.dataset.categoryVariant;
    const items = categories.map((category) => {
      const item = template.cloneNode(false) as HTMLElement;
      item.textContent = variant === 'chip' ? `#${category}` : category;
      return item;
    });
    container.replaceChildren(...items);
  });
}

function updateIcon(wrapper: HTMLElement, project: ModrinthProjectSnapshot) {
  if (!project.iconUrl) return;

  wrapper.querySelectorAll<HTMLImageElement>('img[data-modrinth-icon]').forEach((image) => {
    const fallback = image.dataset.fallbackSrc;
    image.addEventListener(
      'error',
      () => {
        if (fallback) image.src = fallback;
      },
      { once: true },
    );
    image.src = project.iconUrl!;
    if (image.hasAttribute('data-modrinth-icon-descriptive') && project.title) {
      image.alt = `${project.title} mod icon`;
    }
  });
}

function applyProject(project: ModrinthProjectSnapshot) {
  for (const wrapper of projectWrappers(project.id)) {
    setField(wrapper, 'title', project.title);
    setField(wrapper, 'description', project.description);
    setField(wrapper, 'downloads', project.downloads === null ? null : formatMetric(project.downloads));
    setField(wrapper, 'followers', project.followers === null ? null : formatMetric(project.followers));
    updateCategories(wrapper, project.categories);
    updateIcon(wrapper, project);

    wrapper.querySelectorAll<HTMLAnchorElement>('[data-modrinth-href="project"]').forEach((link) => {
      link.href = projectHref(project);
    });
  }
}

function applyRelease(
  project: ModrinthProjectSnapshot,
  release: ModrinthReleaseSnapshot,
) {
  const environment = environmentCopy(release.environment);
  const loaders = release.loaders.map(formatLoader);

  for (const wrapper of projectWrappers(project.id)) {
    setField(wrapper, 'version', release.versionNumber);
    setField(wrapper, 'game-versions', formatList(release.gameVersions));
    setField(wrapper, 'loaders', formatList(loaders));
    setField(wrapper, 'environment-short', environment.short);
    setField(wrapper, 'environment-title', environment.title);
    setField(wrapper, 'environment-description', environment.description);

    wrapper.querySelectorAll<HTMLAnchorElement>('[data-modrinth-href="release"]').forEach((link) => {
      link.href = releaseHref(project, release);
    });

    if (wrapper.dataset.fallbackVersion && wrapper.dataset.fallbackVersion !== release.id) {
      setField(
        wrapper,
        'dependency-note',
        'Dependency requirements may have changed; review this release on Modrinth.',
      );
    }
  }
}

function fallbackMetric(projectId: string, metric: 'downloads' | 'followers'): number {
  for (const wrapper of projectWrappers(projectId)) {
    const raw = metric === 'downloads'
      ? wrapper.dataset.fallbackDownloads
      : wrapper.dataset.fallbackFollowers;
    const value = raw ? Number(raw) : Number.NaN;
    if (Number.isSafeInteger(value) && value >= 0) return value;
  }
  return 0;
}

function setStatus(state: 'live' | 'partial' | 'fallback') {
  const text =
    state === 'live'
      ? 'Live from Modrinth · cached for 5 minutes.'
      : state === 'partial'
        ? 'Live where available · published fallbacks elsewhere.'
        : 'Showing the published snapshot.';

  document.querySelectorAll<HTMLElement>('[data-modrinth-status]').forEach((element) => {
    element.dataset.state = state;
    element.textContent = text;
  });
}

function applyCatalog(snapshot: CatalogSnapshot, ids: readonly string[]) {
  const projects = new Map(snapshot.projects.map((project) => [project.id, project]));
  const releases = new Map(snapshot.releases.map((release) => [release.projectId, release]));

  for (const id of ids) {
    const project = projects.get(id);
    if (!project) continue;
    applyProject(project);
    const release = releases.get(id);
    if (release) applyRelease(project, release);
  }

  const totalDownloads = ids.reduce(
    (total, id) => total + (projects.get(id)?.downloads ?? fallbackMetric(id, 'downloads')),
    0,
  );
  const totalFollowers = ids.reduce(
    (total, id) => total + (projects.get(id)?.followers ?? fallbackMetric(id, 'followers')),
    0,
  );
  document.querySelectorAll<HTMLElement>('[data-modrinth-total-downloads]').forEach((element) => {
    element.textContent = formatMetric(totalDownloads);
  });
  document.querySelectorAll<HTMLElement>('[data-modrinth-total-followers]').forEach((element) => {
    element.textContent = formatMetric(totalFollowers);
  });

  if (ids.every((id) => releases.has(id))) {
    const gameVersions = [
      ...new Set(ids.flatMap((id) => [...(releases.get(id)?.gameVersions ?? [])])),
    ];
    const currentVersions = formatList(gameVersions);
    document
      .querySelectorAll<HTMLElement>('[data-modrinth-current-game-versions]')
      .forEach((element) => {
        element.textContent = currentVersions;
      });
  }

  document.querySelectorAll<HTMLElement>('[data-modrinth-page-project]').forEach((page) => {
    const project = projects.get(page.dataset.modrinthPageProject ?? '');
    if (!project) return;
    if (project.title) document.title = `${project.title} | Minecraft Fabric Mod`;
    if (project.description) {
      document.querySelector<HTMLMetaElement>('meta[name="description"]')?.setAttribute(
        'content',
        project.description,
      );
    }
  });
}

function collectProjectIds(): string[] {
  return [
    ...new Set(
      Array.from(document.querySelectorAll<HTMLElement>('[data-modrinth-project]'))
        .map((element) => element.dataset.modrinthProject ?? '')
        .filter((id) => ID_PATTERN.test(id)),
    ),
  ];
}

export async function initModrinthRuntime() {
  const ids = collectProjectIds();
  if (!ids.length) return;
  const knownIds = new Set(ids);
  const cached = readCache(knownIds);
  if (cached) {
    applyCatalog(cached, ids);
    setStatus('live');
    return;
  }

  try {
    const { snapshot, complete } = await fetchCatalog(ids);
    applyCatalog(snapshot, ids);
    setStatus(complete ? 'live' : 'partial');
    if (complete) writeCache(snapshot);
  } catch (error) {
    console.warn(
      `[modrinth] runtime refresh unavailable: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
    setStatus('fallback');
  }
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => void initModrinthRuntime(), { once: true });
  } else {
    void initModrinthRuntime();
  }
}
