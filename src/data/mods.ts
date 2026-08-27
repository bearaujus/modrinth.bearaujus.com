/* ============================================================
   Source of truth for the four published Fabric mods.
   Copy is distilled from each mod's Modrinth README. Fallback
   download/follower counts are used for the first render and
   whenever browser-time Modrinth hydration is unavailable.
   ============================================================ */

export type Accent = 'ovr' | 'net' | 'end' | 'dawn';
export type InstallSide = 'required' | 'optional' | 'unsupported';

export type Mod = Readonly<{
  readonly id: string;
  readonly name: string;
  readonly slug: string;
  /** exact current Modrinth version number */
  readonly releaseVersion: string;
  /** stable Modrinth version id for the current release */
  readonly modrinthVersionId: string;
  /** Modrinth project id, used for the live stats API */
  readonly modrinthId: string;
  /** the mod's signature accent in the palette */
  readonly accent: Accent;
  /** exact short description shared with Fabric and Modrinth */
  readonly summary: string;
  /** the lead feature bullets */
  readonly bullets: readonly string[];
  readonly categories: readonly string[];
  readonly additionalCategories: readonly string[];
  /** natural-language queries covered by the public project copy */
  readonly discoveryQueries: readonly string[];
  /** environment support */
  readonly env: Readonly<{ client: InstallSide; server: InstallSide }>;
  /** fallback metrics if the API is down */
  readonly fallback: Readonly<{ downloads: number; followers: number }>;
}>;

/** Exact release used for build and runtime validation. */
export const MC_VERSION = '26.2';
/** Patch-tolerant public compatibility line declared by every listed mod. */
export const MC_SERIES = '26.2.x';
export const MC_RANGE = '>=26.2 <26.3.0';
export const LOADER = 'Fabric';
export const LOADER_MIN_VERSION = '0.19.0';
export const FABRIC_API_MIN_VERSION = '0.147.1+26.2';
export const CATALOG_REVIEWED_AT = '2026-08-27';
export const SITE_URL = 'https://modrinth.bearaujus.com';
export const MODRINTH_USER = 'https://modrinth.com/user/bearaujus';
export const SUPPORT_URL =
  'https://github.com/bearaujus-dungeon/minecraft-addons/issues';

export function modrinthProjectUrl(mod: Mod): string {
  return `https://modrinth.com/mod/${mod.slug}`;
}

export function modrinthVersionUrl(mod: Mod): string {
  return `${modrinthProjectUrl(mod)}/version/${mod.modrinthVersionId}`;
}

export function localModUrl(mod: Mod): string {
  return `/mods/${mod.slug}/`;
}

export const MODS = [
  {
    id: 'dimension-notifier',
    name: 'Dimension Notifier',
    slug: 'dimension-notifier',
    releaseVersion: '0.2.5+26.2',
    modrinthVersionId: 'NgieY3xU',
    modrinthId: 'kpwhwrp4',
    accent: 'end',
    summary:
      'Server-side dimension change notifications with action bar coordinates, chat broadcasts, and live Tab list labels.',
    bullets: [
      'Action bar dimension cues with optional coordinates when players move between worlds.',
      'An optional server-wide chat broadcast when anyone changes dimension.',
      'Live dimension labels next to player names in the vanilla Tab list.',
      'Server-first — players never have to install anything.',
    ],
    categories: ['social', 'utility'],
    additionalCategories: ['management'],
    discoveryQueries: ['dimension change notifier', 'dimension coordinates'],
    env: { client: 'optional', server: 'required' },
    fallback: { downloads: 198, followers: 3 },
  },
  {
    id: 'death-respawn-notifier',
    name: 'Death Respawn Notifier',
    slug: 'death-respawn-notifier',
    releaseVersion: '0.2.5+26.2',
    modrinthVersionId: 'bDagsVnx',
    modrinthId: 'WmLlAWdJ',
    accent: 'net',
    summary:
      'Server-side death coordinates, respawn notifications, personal death-screen details, and live Tab list dead markers.',
    bullets: [
      'Optional dimension and coordinates right in the death message.',
      'An optional respawn broadcast so the whole server knows a player is back.',
      'A dead-player marker in the vanilla Tab list for clients that opt in.',
      'Personal death-screen details and a respawn action bar reminder.',
    ],
    categories: ['adventure', 'social', 'utility'],
    additionalCategories: ['management'],
    discoveryQueries: ['death coordinates', 'respawn notifier'],
    env: { client: 'optional', server: 'required' },
    fallback: { downloads: 233, followers: 3 },
  },
  {
    id: 'improved-sleep',
    name: 'Improved Sleep',
    slug: 'improved-sleep',
    releaseVersion: '0.1.4+26.2',
    modrinthVersionId: '2eNsfgd0',
    modrinthId: 'q7ix822L',
    accent: 'end',
    summary:
      'Multiplayer sleep percentage or fixed-player thresholds, daytime and storm rules, wake times, and sleeper rewards.',
    bullets: [
      'Skip the night on a percentage or a fixed sleeper count — not everyone.',
      'Separate rules and wake times for night, daytime, and thunderstorms.',
      'Optional buffs that reward the players who actually sleep.',
      'Server-first — every mechanic runs on the server.',
    ],
    categories: ['game-mechanics', 'utility'],
    additionalCategories: ['management'],
    discoveryQueries: ['sleep threshold', 'sleep percentage'],
    env: { client: 'optional', server: 'required' },
    fallback: { downloads: 201, followers: 0 },
  },
  {
    id: 'sleep-wake-up-notifier',
    name: 'Sleep Wake-Up Notifier',
    slug: 'sleep-wake-up-notifier',
    releaseVersion: '0.1.4+26.2',
    modrinthVersionId: 'TX21fbWC',
    modrinthId: 'DBW4p9Pt',
    accent: 'dawn',
    summary:
      'Live multiplayer sleep progress, wake-up notifications, custom bed messages, and morning broadcasts with Improved Sleep integration.',
    bullets: [
      'A live sleep-progress action bar with the count still needed.',
      'A clear “sleep now” cue the moment the threshold is reached.',
      'Morning broadcasts for nobody-slept, partial, and full skips.',
      'Custom bed messages, and automatic Improved Sleep threshold integration.',
    ],
    categories: ['game-mechanics', 'social', 'utility'],
    additionalCategories: ['management'],
    discoveryQueries: ['sleep progress', 'wake up notifier'],
    env: { client: 'optional', server: 'required' },
    fallback: { downloads: 304, followers: 3 },
  },
] satisfies readonly Mod[];
