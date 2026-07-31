/* ============================================================
   Build-time fetch of live Modrinth stats.
   Runs once per `astro build` or development process.
   Never throws — if the API is unreachable, callers fall back
   to the static counts in src/data/mods.ts so the build still
   succeeds offline.
   ============================================================ */

import { MODS } from '../data/mods';

export type Stat = { downloads: number; followers: number };

const API = 'https://api.modrinth.com/v2/projects';
const REQUEST_TIMEOUT_MS = 8000;
// Modrinth asks API consumers to identify themselves.
const UA =
  'modrinth.bearaujus.com (portfolio site; github.com/bearaujus/modrinth.bearaujus.com)';
const KNOWN_PROJECT_IDS = new Set(MODS.map((mod) => mod.modrinthId));

export type StatsMap = Record<string, Stat>;
let statsPromise: Promise<StatsMap> | undefined;

function validMetric(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0
    ? value
    : fallback;
}

function fallbackMap(): StatsMap {
  const out: StatsMap = {};
  for (const m of MODS) out[m.modrinthId] = { ...m.fallback };
  return out;
}

/**
 * Returns a map of Modrinth project id -> { downloads, followers }.
 * Live values when reachable, otherwise the static fallback.
 */
async function fetchStats(): Promise<StatsMap> {
  const ids = MODS.map((m) => m.modrinthId);
  const url = `${API}?ids=${encodeURIComponent(JSON.stringify(ids))}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': UA, Accept: 'application/json' },
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`Modrinth API ${res.status}`);

    const data: unknown = await res.json();
    if (!Array.isArray(data)) throw new Error('Modrinth API returned an invalid project list');

    const out = fallbackMap();
    for (const project of data) {
      if (!project || typeof project !== 'object') continue;
      const record = project as Record<string, unknown>;
      const id = record.id;
      if (typeof id !== 'string' || !KNOWN_PROJECT_IDS.has(id)) continue;

      const fallback = out[id];
      if (!fallback) continue;
      out[id] = {
        downloads: validMetric(record.downloads, fallback.downloads),
        followers: validMetric(record.followers, fallback.followers),
      };
    }
    return out;
  } catch (err) {
    console.warn(
      `[modrinth] live stats unavailable, using fallback counts: ${
        err instanceof Error ? err.message : String(err)
      }`,
    );
    return fallbackMap();
  } finally {
    clearTimeout(timer);
  }
}

export function getStats(): Promise<StatsMap> {
  statsPromise ??= fetchStats();
  return statsPromise;
}

/** Aggregate totals across all mods. */
export function totals(stats: StatsMap) {
  let downloads = 0;
  let followers = 0;
  for (const m of MODS) {
    downloads += stats[m.modrinthId]?.downloads ?? m.fallback.downloads;
    followers += stats[m.modrinthId]?.followers ?? m.fallback.followers;
  }
  return { downloads, followers, mods: MODS.length };
}
