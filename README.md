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

- **Astro 6** — static output, near-zero client JS (one small scroll-reveal script).
- **Fontsource** — self-hosted Silkscreen (pixel labels), Inter (body),
  JetBrains Mono (data/chips).
- **Modrinth API** — live download/follower counts fetched at build time, with a
  static fallback so the build never fails offline (`src/lib/modrinth.ts`).

## Project layout

```
src/
  data/mods.ts          # source of truth for mod copy + fallback stats
  lib/modrinth.ts       # build-time live stats (with fallback)
  layouts/Base.astro    # head, fonts, meta
  components/           # Nav, Hero, ModCard, ModShowcase, Principles, About, Footer
  scripts/              # reveal.ts (scroll reveal)
  styles/               # tokens.css, global.css
public/
  CNAME                 # modrinth.bearaujus.com
  mods/<slug>/icon.png  # mod icons (used everywhere; no external images)
```

## Develop

```bash
npm install
npm run dev      # http://localhost:4321
npm run build    # static output -> dist/
npm run preview  # serve the built site
```

## Deploy (GitHub Pages + custom domain)

Pushing to `main` runs `.github/workflows/deploy.yml`, which builds and publishes
`dist/` to GitHub Pages. One-time setup:

1. **GitHub → Settings → Pages → Source = GitHub Actions.**
2. After the first deploy, set **Custom domain = `modrinth.bearaujus.com`** and
   enable **Enforce HTTPS**.
3. At the `bearaujus.com` DNS provider, add a **CNAME** record:
   `modrinth` → `bearaujus.github.io`.

DNS propagation can take a little while; GitHub then issues the TLS certificate
automatically.

---

Not affiliated with Mojang or Microsoft.
