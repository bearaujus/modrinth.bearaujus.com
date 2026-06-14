/* ============================================================
   Source of truth for the four published Fabric mods.
   Copy is distilled from each mod's Modrinth README. Fallback
   download/follower counts are used when the live Modrinth API
   is unreachable at build time.
   ============================================================ */

export type Accent = 'ovr' | 'net' | 'end' | 'dawn';

export type Mod = {
  id: string;
  name: string;
  slug: string;
  /** Modrinth project id, used for the live stats API */
  modrinthId: string;
  /** the mod's signature accent in the palette */
  accent: Accent;
  tagline: string;
  /** the lead feature bullets */
  bullets: string[];
  categories: string[];
  /** environment support */
  env: { client: string; server: string };
  /** fallback metrics if the API is down */
  fallback: { downloads: number; followers: number };
};

export const MC_VERSION = '26.1.2';
export const LOADER = 'Fabric';
export const MODRINTH_USER = 'https://modrinth.com/user/bearaujus';

export const MODS: Mod[] = [
  {
    id: 'dimension-notifier',
    name: 'Dimension Notifier',
    slug: 'dimension-notifier',
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
    fallback: { downloads: 88, followers: 3 },
  },
  {
    id: 'death-respawn-notifier',
    name: 'Death Respawn Notifier',
    slug: 'death-respawn-notifier',
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
    fallback: { downloads: 63, followers: 2 },
  },
  {
    id: 'improved-sleep',
    name: 'Improved Sleep',
    slug: 'improved-sleep',
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
    fallback: { downloads: 28, followers: 0 },
  },
  {
    id: 'sleep-wake-up-notifier',
    name: 'Sleep Wake-Up Notifier',
    slug: 'sleep-wake-up-notifier',
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
    fallback: { downloads: 43, followers: 0 },
  },
];
