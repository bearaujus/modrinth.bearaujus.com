// @ts-check
import { defineConfig } from 'astro/config';

// Site lives on the custom subdomain (GitHub Pages + CNAME).
export default defineConfig({
  site: 'https://modrinth.bearaujus.com',
  base: '/',
  trailingSlash: 'ignore',
  build: {
    format: 'directory',
  },
});
