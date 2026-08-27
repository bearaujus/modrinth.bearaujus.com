/* ============================================================
   Reviewed Modrinth metric snapshots used for the first render,
   no-JS clients, metadata, and runtime API failures.

   Live project data is intentionally fetched in the browser by
   src/scripts/modrinth-runtime.ts. Keeping this module synchronous
   makes production builds deterministic and network-independent.
   ============================================================ */

import { MODS } from '../data/mods';

export type Stat = { downloads: number; followers: number };

export type StatsMap = Record<string, Stat>;

export function fallbackStats(): StatsMap {
  const out: StatsMap = {};
  for (const m of MODS) out[m.modrinthId] = { ...m.fallback };
  return out;
}

/** Aggregate totals across all mods. */
export function totals(stats: StatsMap = fallbackStats()) {
  let downloads = 0;
  let followers = 0;
  for (const m of MODS) {
    downloads += stats[m.modrinthId]?.downloads ?? m.fallback.downloads;
    followers += stats[m.modrinthId]?.followers ?? m.fallback.followers;
  }
  return { downloads, followers, mods: MODS.length };
}
