# modrinth.bearaujus.com

Portfolio site for **bearaujus'** Minecraft Fabric mods, published on
[Modrinth](https://modrinth.com/user/bearaujus). Built as a static
[Astro](https://astro.build) site and deployed to GitHub Pages at
`https://modrinth.bearaujus.com`.

## Design

An **in-game HUD** direction: the visual language is borrowed from what the mods
actually do — write to Minecraft's action bar, chat, and Tab list. Color carries
meaning: Overworld green, Nether red, End purple, and a dawn gold for the
wake-up/morning mods. Pixel labels and HUD-style chips reinforce the theme; the
mod showcases present each mod as a clean icon badge.

## Stack

- **Astro 7** — static output, inlined one-page CSS, and near-zero client JS
  (a fail-safe boot transition plus resilient scroll reveals).
- **Fontsource** — self-hosted Silkscreen (pixel labels), Inter (body),
  JetBrains Mono (data/chips).
- **Modrinth API** — live download/follower counts fetched at build time, with a
  static fallback so the build never fails offline (`src/lib/modrinth.ts`).

## Project layout

```
src/
  data/mods.ts          # release catalog mirror: versions, compatibility, copy, fallback stats
  lib/modrinth.ts       # build-time live stats (with fallback)
  layouts/Base.astro    # head, fonts, meta, first-paint safeguards
  components/           # BootScreen, Nav, Hero, cards, showcases, sections, Footer
  pages/404.astro       # branded GitHub Pages fallback
  scripts/              # reveal.ts (scroll reveal)
  styles/               # tokens.css, global.css
public/
  CNAME                 # modrinth.bearaujus.com
  mods/<slug>/icon.png  # mod icons (used everywhere; no external images)
```

## Develop

Use Node 22.12+ on the Node 22 line; `.nvmrc`, `package.json`, and CI all enforce
that tested runtime. Newer Node lines are intentionally excluded because the
current Astro toolchain can trigger a Windows libuv shutdown assertion after an
otherwise successful build.

```bash
npm ci
npm run dev      # http://localhost:4321
npm run check    # Astro + TypeScript diagnostics
npm run verify   # diagnostics + build + HTML/output integrity checks
npm test         # same complete verification workflow
npm run preview  # serve the built site
```

## Quality gates

`npm run verify` is the local and CI source of truth. It type-checks Astro,
builds the production site, validates the generated HTML, and checks internal
fragment links, local asset references, social-image dimensions, JSON-LD,
manifest files, canonical metadata, safe external-link attributes, the custom
404 page, and the no-render-blocking-CSS/boot-screen first-paint contract.

The deploy workflow runs on pull requests as a build-only check. Pushes to
`main` and manual dispatches run the same checks before the GitHub Pages deploy.
Dependabot keeps npm packages and GitHub Actions visible through grouped weekly
update pull requests.

## Release catalog refresh

`src/data/mods.ts` mirrors the public release registry in the Minecraft addons
repository. For every mod release, update the exact Modrinth version number,
Minecraft compatibility line, runtime dependency minimums, user-facing copy,
and offline fallback metrics. Keep the four icons aligned with each addon's
`release/icon.png`, update `public/og.png` when its footer changes, then run
`npm run verify` before deployment.

## Deploy (GitHub Pages + custom domain)

Pushing to `main` runs `.github/workflows/deploy.yml`, which verifies and
publishes `dist/` to GitHub Pages. One-time setup:

1. **GitHub → Settings → Pages → Source = GitHub Actions.**
2. After the first deploy, set **Custom domain = `modrinth.bearaujus.com`** and
   enable **Enforce HTTPS**.
3. At the `bearaujus.com` DNS provider, add a **CNAME** record:
   `modrinth` → `bearaujus.github.io`.

DNS propagation can take a little while; GitHub then issues the TLS certificate
automatically.

---

Not affiliated with Mojang or Microsoft.
