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
catalog cards present each mod as a compact, readable project panel.

## Stack

- **Astro 7** — static output, inlined per-page CSS, and small progressive
  client scripts for the first-visit transition, scroll reveals, and live data.
- **Fontsource** — self-hosted Silkscreen (pixel labels), Inter (body),
  JetBrains Mono (data/chips).
- **Modrinth API** — public project metadata, current stable releases, and
  metrics refreshed in the browser, with reviewed first-render fallbacks so
  builds and page rendering never depend on the API.

## Project layout

```
src/
  data/mods.ts            # release catalog mirror: versions, compatibility, discovery copy
  lib/modrinth.ts         # deterministic first-render metric snapshots
  lib/structured-data.ts  # shared Person and SoftwareApplication JSON-LD
  layouts/Base.astro      # head, fonts, meta, first-paint safeguards
  components/             # BootScreen, navigation, catalog cards, sections, footer
  pages/index.astro       # portfolio and catalog landing page
  pages/mods/[slug].astro # crawlable details and compatibility page per mod
  pages/catalog.json.ts   # machine-readable release and discovery catalog
  pages/404.astro         # branded GitHub Pages fallback
  scripts/                # scroll reveal + validated browser-time Modrinth hydration
  styles/                 # tokens.css, global.css
public/
  CNAME                   # modrinth.bearaujus.com
  mods/<slug>/icon.png    # first-render and API-failure mod icons
scripts/
  check-runtime.mjs       # fail-fast Node support check
  verify-built-site.mjs   # generated catalog, metadata, link, and asset checks
```

## Develop

Use Node 22.12+ on the Node 22 line; `.nvmrc`, `package.json`, npm scripts, and CI
all enforce that tested runtime. Unsupported runtimes now fail before a dev
server or production build starts. Newer Node lines are intentionally excluded
because the current Astro toolchain can trigger a Windows libuv shutdown
assertion after an otherwise successful build.

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
builds the production site, validates the generated HTML, and checks all four
mod landing pages, the machine-readable catalog, internal links, local asset
references, social-image dimensions, JSON-LD, manifest files, canonical
metadata, safe external-link attributes, the custom 404 page, and the
no-render-blocking-CSS/boot-screen first-paint contract.

The same workflow tests Modrinth response normalization and stable-release
selection with Node's built-in test runner.

The deploy workflow runs on pull requests as a build-only check. Pushes to
`main` and manual dispatches run the same checks before the GitHub Pages deploy.
Dependabot keeps npm packages and GitHub Actions visible through grouped weekly
update pull requests.

## Release catalog refresh

`src/data/mods.ts` mirrors the public release registry in the Minecraft addons
repository and drives every HTML page plus `/catalog.json`. For every mod
release, update the exact Modrinth project and version IDs, release number,
Minecraft compatibility line, runtime dependency minimums, user-facing summary,
categories, discovery queries, and offline fallback metrics. Keep the four icons
aligned with each addon's `release/icon.png`, update `public/og.png` only when
its visible catalog message changes, then run `npm run verify` before deployment.

Those fallback metrics power initial HTML, metadata, no-JS clients, and API
failure states. Browser hydration updates the four known projects between
deployments; adding a new project or static route still requires a catalog refresh.

The catalog intentionally links each mod's exact current release as well as its
stable Modrinth project page. This keeps user-facing pages useful immediately
after a release while giving launchers and search engines stable project URLs to
index.

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
