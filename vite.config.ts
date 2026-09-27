import { defineConfig } from 'vite';
import { LICENSE_FILE, site } from './build/site-plugin.ts';

// Production URL: the GitHub Pages project site. Set SITE_URL for a fork or custom domain.
const siteUrl = process.env.SITE_URL ?? 'https://dilip-kumar-22.github.io/shanghai-48h/';

export default defineConfig({
  // Relative asset URLs: the same build works under a sub-path or at a domain root.
  base: './',
  // A static page, not an SPA: unknown paths 404 (as on GitHub Pages) instead of
  // falling back to index.html.
  appType: 'mpa',
  plugins: [site({ siteUrl })],
  build: {
    // Ship the licenses of bundled dependencies with the site (not in a dot-folder,
    // which the Pages artifact would skip).
    license: { fileName: LICENSE_FILE },
    // Every target browser supports <link rel="modulepreload">; there are no dynamic imports.
    modulePreload: { polyfill: false },
  },
  preview: { host: '127.0.0.1', port: 4173, strictPort: true },
});
