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
  },
});
