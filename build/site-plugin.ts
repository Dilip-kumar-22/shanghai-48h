// Vite plugin for the site's build-time concerns:
//   - responsive images: `<img data-picture="NAME">` becomes a <picture> element whose
//     sources point at the generated variants (Vite then hashes and emits them)
//   - `__SITE_URL__` placeholders for canonical/social metadata
//   - the 1200×630 social card, emitted at a stable path (`og-image.jpg`)
//   - a Content Security Policy <meta>, production build only (the dev server needs
//     inline HMR code)
//   - the bundled fonts' licenses, appended to Vite's third-party license file
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import type { Plugin, ResolvedConfig } from 'vite';
import { SETTINGS, generateImages, type ImageEntry, type PipelineResult, type Variant } from './images.ts';

export interface SiteOptions {
  /** Absolute production URL of the page, with trailing slash. */
  siteUrl: string;
}

// Geometry of the scene backgrounds, used to compute `sizes`:
//   `.chapter__bg { inset: -7% 0 }` makes the image box 114% of the viewport height,
//   and the parallax in src/modules/stage.ts scales it by 1.08.
const BG_HEIGHT = 1.14;
const PARALLAX_SCALE = 1.08;
// Portrait crops cover the image box whenever the viewport is at most 3:4.
const PORTRAIT_MEDIA = '(max-aspect-ratio: 3/4)';

export const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self'",
  "img-src 'self' data:",
  "font-src 'self'",
  "object-src 'none'",
  "frame-src 'none'",
  "base-uri 'self'",
  "form-action 'none'",
  "require-trusted-types-for 'script'",
].join('; ');

/** Vite writes bundled JavaScript dependencies' licenses here (`build.license`). */
export const LICENSE_FILE = 'third-party-licenses.md';
/** Fonts bundled through CSS, which Vite's license file does not cover. */
const FONT_PACKAGES = ['@fontsource-variable/space-grotesk', '@fontsource-variable/inter'];

const PLACEHOLDER = /<img\b([^>]*?)\s+data-picture="([\w-]+)"([^>]*?)\s*\/?>/g;

export function site(options: SiteOptions): Plugin[] {
  if (!/^https:\/\/.+\/$/.test(options.siteUrl)) {
    throw new Error(`site: siteUrl must be an absolute https URL ending in "/", got "${options.siteUrl}"`);
  }
  let config: ResolvedConfig | undefined;
  let pipeline: Promise<PipelineResult> | undefined;

  const images = () => {
    if (!config) throw new Error('site: config not resolved');
    const root = config.root;
    const logger = config.logger;
    pipeline ??= generateImages({
      root,
      sourceDir: path.join(root, 'src/assets/images'),
      outDir: path.join(root, 'src/assets/generated'),
      ogSource: 'hero.jpg',
      log: (message) => {
        logger.info(message);
      },
    });
    return pipeline;
  };

  return [
    {
      name: 'site:images-and-metadata',
      configResolved(resolved) {
        config = resolved;
      },
      async buildStart() {
        await images();
      },
      async configureServer() {
        await images();
      },
      transformIndexHtml: {
        order: 'pre',
        async handler(html) {
          const { manifest } = await images();
          return html
            .replace(PLACEHOLDER, (_tag, before: string, name: string, after: string) => {
              const entry = manifest[name];
              if (!entry) throw new Error(`site: no source image "${name}" in src/assets/images`);
              // collapse whitespace between attributes (never inside quoted values)
              const attributes = `${before}${after}`.replace(/\s+(?=(?:[^"]*"[^"]*")*[^"]*$)/g, ' ').trim();
              return renderPicture(entry, attributes);
            })
            .replaceAll('__SITE_URL__', options.siteUrl);
        },
      },
      async generateBundle() {
        const { ogImage } = await images();
        this.emitFile({ type: 'asset', fileName: 'og-image.jpg', source: await readFile(ogImage) });
      },
    },
    {
      name: 'site:font-licenses',
      apply: 'build',
      generateBundle: {
        order: 'post',
        async handler(_output, bundle) {
          const asset = bundle[LICENSE_FILE];
          if (asset?.type !== 'asset') throw new Error(`site: ${LICENSE_FILE} missing (build.license)`);
          const root = config?.root ?? process.cwd();
          const sections = await Promise.all(
            FONT_PACKAGES.map(async (name) => {
              const dir = path.join(root, 'node_modules', name);
              const pkg = JSON.parse(await readFile(path.join(dir, 'package.json'), 'utf8')) as {
                version: string;
                license: string;
              };
              const text = await readFile(path.join(dir, 'LICENSE'), 'utf8');
              return `## ${name} - ${pkg.version} (${pkg.license})\n\n${text.trim()}\n`;
            }),
          );
          asset.source = `${String(asset.source).trimEnd()}\n\n${sections.join('\n')}`;
        },
      },
    },
    {
      name: 'site:content-security-policy',
      apply: 'build',
      transformIndexHtml: {
        order: 'post',
        handler(html) {
          const meta = `<meta http-equiv="Content-Security-Policy" content="${CONTENT_SECURITY_POLICY}" />`;
          if (!/<meta charset="utf-8" \/>/i.test(html)) throw new Error('site: <meta charset> not found');
          return html.replace(/(<meta charset="utf-8" \/>)/i, `$1\n    ${meta}`);
        },
      },
    },
  ];
}

const srcset = (variants: Variant[]) => variants.map((v) => `${v.file} ${String(v.width)}w`).join(', ');

/** CSS width of a cover-fitted image whose box is 100vw × 114vh, scaled by the parallax. */
const coverSizes = (aspect: number) =>
  `max(100vw, ${String(Math.ceil(100 * BG_HEIGHT * aspect * PARALLAX_SCALE))}vh)`;

function renderPicture(entry: ImageEntry, attributes: string): string {
  const fallback = entry.landscape.jpeg.at(-1);
  if (!fallback) throw new Error('site: image has no JPEG fallback');
  const landscape = coverSizes(entry.width / entry.height);
  const portrait = coverSizes(SETTINGS.portraitAspect);
  return [
    '<picture>',
    `<source media="${PORTRAIT_MEDIA}" type="image/avif" srcset="${srcset(entry.portrait.avif)}" sizes="${portrait}" />`,
    `<source media="${PORTRAIT_MEDIA}" type="image/webp" srcset="${srcset(entry.portrait.webp)}" sizes="${portrait}" />`,
    `<source type="image/avif" srcset="${srcset(entry.landscape.avif)}" sizes="${landscape}" />`,
    `<source type="image/webp" srcset="${srcset(entry.landscape.webp)}" sizes="${landscape}" />`,
    `<img src="${fallback.file}" srcset="${srcset(entry.landscape.jpeg)}" sizes="${landscape}" width="${String(entry.width)}" height="${String(entry.height)}" ${attributes} />`,
    '</picture>',
  ].join('');
}
