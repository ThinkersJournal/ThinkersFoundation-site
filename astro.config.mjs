import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  // Canonical host is the apex of thinkersfoundation.net (PRE-FILING-PLAN.md section 0,
  // item 1). thinkersfoundation.us, thinkers.foundation and www.* 301 to it with
  // Cloudflare Redirect Rules (ops/cloudflare/plan.mjs), so there is one site under three
  // names, not three copies. `site` drives canonical, og:url and the sitemap.
  site: 'https://thinkersfoundation.net',
  // Cloudflare Pages serves about/index.html at /about and redirects /about/ to it, so the
  // canonical URL has no trailing slash.
  trailingSlash: 'never',
  integrations: [sitemap()],
  // Ship every script and stylesheet as a FILE so the Content-Security-Policy in
  // public/_headers can ENFORCE `script-src 'self'; style-src 'self'` with no
  // 'unsafe-inline'. Vite inlines any asset under 4096 bytes; Astro inlines small
  // stylesheets by default. Both are turned off. tests/security.spec.ts pins the result.
  build: { inlineStylesheets: 'never' },
  vite: { build: { assetsInlineLimit: 0 } },
});
