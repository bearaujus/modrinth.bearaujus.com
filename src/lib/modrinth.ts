/* ============================================================
   Build-time fetch of live Modrinth stats.
   Runs once during `astro build` (and on each dev request).
   Never throws — if the API is unreachable, callers fall back
   to the static counts in src/data/mods.ts so the build still
   succeeds offline.
   ============================================================ */

import { MODS } from '../data/mods';

export type Stat = { downloads: number; followers: number };

const API = 'https://api.modrinth.com/v2/projects';
// Modrinth asks API consumers to identify themselves.
const UA = 'modrinth.bearaujus.com (portfolio site; github.com/bearaujus)';

export type StatsMap = Record<string, Stat>;

function fallbackMap(): StatsMap {
  const out: StatsMap = {};
  for (const m of MODS) out[m.modrinthId] = { ...m.fallback };
  return out;
}

/**
 * Returns a map of Modrinth project id -> { downloads, followers }.
 * Live values when reachable, otherwise the static fallback.
 */
export async function getStats(): Promise<StatsMap> {
  const ids = MODS.map((m) => m.modrinthId);
  const url = `${API}?ids=${encodeURIComponent(JSON.stringify(ids))}`;

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    const res = await fetch(url, {
      headers: { 'User-Agent': UA, Accept: 'application/json' },
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!res.ok) throw new Error(`Modrinth API ${res.status}`);

    const data = (await res.json()) as Array<{
      id: string;
      downloads: number;
      followers: number;
    }>;

    const out = fallbackMap();
    for (const p of data) {
      if (p && typeof p.id === 'string') {
        out[p.id] = {
          downloads: p.downloads ?? out[p.id]?.downloads ?? 0,
          followers: p.followers ?? out[p.id]?.followers ?? 0,
        };
      }
    }
    return out;
  } catch (err) {
    console.warn(
      `[modrinth] live stats unavailable, using fallback counts: ${
        err instanceof Error ? err.message : String(err)
      }`,
    );
    return fallbackMap();
  }
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
