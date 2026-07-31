/* ============================================================
   Source of truth for the four published Fabric mods.
   Copy is distilled from each mod's Modrinth README. Fallback
   download/follower counts are used when the live Modrinth API
   is unreachable at build time.
   ============================================================ */

export type Accent = 'ovr' | 'net' | 'end' | 'dawn';
export type InstallSide = 'required' | 'optional' | 'unsupported';

export type Mod = Readonly<{
  readonly id: string;
  readonly name: string;
  readonly slug: string;
  /** exact current Modrinth version number */
  readonly releaseVersion: string;
  /** Modrinth project id, used for the live stats API */
  readonly modrinthId: string;
  /** the mod's signature accent in the palette */
  readonly accent: Accent;
  readonly tagline: string;
  /** the lead feature bullets */
  readonly bullets: readonly string[];
  readonly categories: readonly string[];
  /** environment support */
  readonly env: Readonly<{ client: InstallSide; server: InstallSide }>;
  /** fallback metrics if the API is down */
  readonly fallback: Readonly<{ downloads: number; followers: number }>;
}>;

/** Exact release used for build and runtime validation. */
export const MC_VERSION = '26.2';
/** Patch-tolerant public compatibility line declared by every listed mod. */
export const MC_SERIES = '26.2.x';
export const MC_RANGE = '>=26.2 <26.3';
export const LOADER = 'Fabric';
export const LOADER_MIN_VERSION = '0.19.0';
export const FABRIC_API_MIN_VERSION = '0.147.1+26.2';
export const CATALOG_REVIEWED_AT = '2026-07-31';
export const MODRINTH_USER = 'https://modrinth.com/user/bearaujus';

export const MODS = [
  {
    id: 'dimension-notifier',
    name: 'Dimension Notifier',
    slug: 'dimension-notifier',
    releaseVersion: '0.2.4+26.2',
    modrinthId: 'kpwhwrp4',
    accent: 'end',
    tagline:
      "Never ask “where are you?” again — live dimension cues in the action bar, chat, and Tab list.",
    bullets: [
      'A short action bar cue the moment a player enters the Nether, the End, or the Overworld.',
      'An optional server-wide chat broadcast when anyone changes dimension.',
      'Live dimension labels next to player names in the vanilla Tab list.',
      'Server-first — players never have to install anything.',
    ],
    categories: ['social', 'technology', 'utility'],
    env: { client: 'optional', server: 'required' },
    fallback: { downloads: 127, followers: 3 },
  },
  {
    id: 'death-respawn-notifier',
    name: 'Death Respawn Notifier',
    slug: 'death-respawn-notifier',
    releaseVersion: '0.2.4+26.2',
    modrinthId: 'WmLlAWdJ',
    accent: 'net',
    tagline:
      'Die less lost — death coordinates, respawn broadcasts, and a dead-player marker in the Tab list.',
    bullets: [
      'Optional dimension and coordinates right in the death message.',
      'An optional respawn broadcast so the whole server knows a player is back.',
      'A dead-player marker in the vanilla Tab list for clients that opt in.',
      'Personal death-screen details and a respawn action bar reminder.',
    ],
    categories: ['social', 'technology', 'utility'],
    env: { client: 'optional', server: 'required' },
    fallback: { downloads: 141, followers: 3 },
  },
  {
    id: 'improved-sleep',
    name: 'Improved Sleep',
    slug: 'improved-sleep',
    releaseVersion: '0.1.3+26.2',
    modrinthId: 'q7ix822L',
    accent: 'end',
    tagline:
      'Sleep skips, tuned to your server — custom thresholds, day and storm rules, and sleeper rewards.',
    bullets: [
      'Skip the night on a percentage or a fixed sleeper count — not everyone.',
      'Separate rules and wake times for night, daytime, and thunderstorms.',
      'Optional buffs that reward the players who actually sleep.',
      'Server-first — every mechanic runs on the server.',
    ],
    categories: ['game-mechanics', 'utility'],
    env: { client: 'optional', server: 'required' },
    fallback: { downloads: 80, followers: 0 },
  },
  {
    id: 'sleep-wake-up-notifier',
    name: 'Sleep Wake-Up Notifier',
    slug: 'sleep-wake-up-notifier',
    releaseVersion: '0.1.3+26.2',
    modrinthId: 'DBW4p9Pt',
    accent: 'dawn',
    tagline:
      'Watch the night skip in real time — sleep progress, bed messages, and morning broadcasts.',
    bullets: [
      'A live sleep-progress action bar with the count still needed.',
      'A clear “sleep now” cue the moment the threshold is reached.',
      'Morning broadcasts for nobody-slept, partial, and full skips.',
      'Custom bed messages, and automatic Improved Sleep threshold integration.',
    ],
    categories: ['social', 'utility'],
    env: { client: 'optional', server: 'required' },
    fallback: { downloads: 170, followers: 0 },
  },
] satisfies readonly Mod[];
