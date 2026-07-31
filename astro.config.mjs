// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// Site lives on the custom subdomain (GitHub Pages + CNAME).
export default defineConfig({
  site: 'https://modrinth.bearaujus.com',
  base: '/',
  trailingSlash: 'ignore',
  integrations: [sitemap()],
  build: {
    format: 'directory',
    // This is a single-page site with a small stylesheet. Inlining it removes
    // the render-blocking HTML -> CSS request from the critical render path.
    inlineStylesheets: 'always',
  },
});
