// Build-time responsive image generation (Sharp).
//
// Every source JPEG in `sourceDir` becomes:
//   - landscape AVIF + WebP at several widths, plus JPEG fallbacks
//   - a centre-cropped 3:4 portrait set (AVIF + WebP) for portrait screens, where
//     `object-fit: cover` would show only that centre band of the landscape image
// Widths never exceed the source (no upscaling). Output is cached by source and
// settings hash, so unchanged images are not re-encoded.
import { createHash } from 'node:crypto';
import { access, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

export const SETTINGS = {
  landscapeWidths: [1280, 1920, 2560],
  jpegWidths: [1280, 1920],
  portraitWidths: [640, 960],
  portraitAspect: 3 / 4,
  avif: { quality: 55, effort: 3 },
  webp: { quality: 78, effort: 5, smartSubsample: true },
  jpeg: { quality: 80, mozjpeg: true, progressive: true },
  og: { width: 1200, height: 630, quality: 82 },
} as const;

export interface Variant {
  width: number;
  /** Root-relative URL, e.g. `/src/assets/generated/bund-1280.avif`. */
  file: string;
}

export interface ImageEntry {
  width: number;
  height: number;
  landscape: { avif: Variant[]; webp: Variant[]; jpeg: Variant[] };
  portrait: { avif: Variant[]; webp: Variant[] };
}

export type ImageManifest = Record<string, ImageEntry>;

interface CacheFile {
  settings: string;
  images: Record<string, { source: string; entry: ImageEntry }>;
  og?: { source: string; file: string };
}

export interface PipelineOptions {
  root: string;
  sourceDir: string;
  outDir: string;
  /** Source image (file name in `sourceDir`) for the 1200×630 social card. */
  ogSource: string;
  log?: (message: string) => void;
}

export interface PipelineResult {
  manifest: ImageManifest;
  /** Absolute path of the generated social card. */
  ogImage: string;
}

type Pipeline = ReturnType<typeof sharp>;

const settingsHash = createHash('sha256').update(JSON.stringify(SETTINGS)).digest('hex');
const sha256 = (data: Buffer) => createHash('sha256').update(data).digest('hex');
const exists = (file: string) =>
  access(file).then(
    () => true,
    () => false,
  );

/** Candidate widths below `max`, plus `max` itself: never wider than the source. */
const widthsUpTo = (max: number, candidates: readonly number[]) => [
  ...candidates.filter((w) => w < max),
  max,
];

export async function generateImages(options: PipelineOptions): Promise<PipelineResult> {
  const { root, sourceDir, outDir, log = () => undefined } = options;
  const toUrl = (file: string) => '/' + path.relative(root, file).split(path.sep).join('/');
  await mkdir(outDir, { recursive: true });

  const cachePath = path.join(outDir, 'manifest.json');
  const cache: CacheFile = await readFile(cachePath, 'utf8')
    .then((text) => JSON.parse(text) as CacheFile)
    .catch(() => ({ settings: '', images: {} }));
  const reusable = cache.settings === settingsHash ? cache.images : {};

  const next: CacheFile = { settings: settingsHash, images: {} };
  const sources = (await readdir(sourceDir)).filter((f) => /\.jpe?g$/i.test(f)).sort();

  for (const fileName of sources) {
    const name = path.parse(fileName).name;
    const buffer = await readFile(path.join(sourceDir, fileName));
    const source = sha256(buffer);
    const cached = reusable[name];
    if (cached?.source === source && (await allFilesExist(cached.entry, root))) {
      next.images[name] = cached;
      continue;
    }
    const started = Date.now();
    const entry = await renderImage(buffer, name, outDir, toUrl);
    next.images[name] = { source, entry };
    log(`images: ${name} encoded in ${String(Date.now() - started)} ms`);
  }

  const ogBuffer = await readFile(path.join(sourceDir, options.ogSource));
  const ogSource = sha256(ogBuffer);
  const ogImage = path.join(outDir, 'og-image.jpg');
  if (cache.settings !== settingsHash || cache.og?.source !== ogSource || !(await exists(ogImage))) {
    const { width, height, quality } = SETTINGS.og;
    await sharp(ogBuffer)
      .resize({ width, height, fit: 'cover', position: 'centre' })
      .jpeg({ quality, mozjpeg: true, progressive: true })
      .toFile(ogImage);
  }
  next.og = { source: ogSource, file: toUrl(ogImage) };

  await writeFile(cachePath, JSON.stringify(next, null, 2));
  await removeStale(outDir, next, toUrl);

  const manifest: ImageManifest = {};
  for (const [name, { entry }] of Object.entries(next.images)) manifest[name] = entry;
  return { manifest, ogImage };
}

async function renderImage(
  buffer: Buffer,
  name: string,
  outDir: string,
  toUrl: (file: string) => string,
): Promise<ImageEntry> {
  const image = sharp(buffer, { failOn: 'error' });
  const { width, height } = await image.metadata();
  if (!width || !height) throw new Error(`images: cannot read dimensions of ${name}`);

  const entry: ImageEntry = {
    width,
    height,
    landscape: { avif: [], webp: [], jpeg: [] },
    portrait: { avif: [], webp: [] },
  };
  const jobs: Promise<unknown>[] = [];
  const emit = (pipeline: Pipeline, format: 'avif' | 'webp' | 'jpeg', file: string) => {
    const encoded =
      format === 'avif'
        ? pipeline.avif(SETTINGS.avif)
        : format === 'webp'
          ? pipeline.webp(SETTINGS.webp)
          : pipeline.jpeg(SETTINGS.jpeg);
    jobs.push(encoded.toFile(path.join(outDir, file)));
    return toUrl(path.join(outDir, file));
  };
  const resized = (w: number) => image.clone().resize({ width: w, withoutEnlargement: true });

  for (const w of widthsUpTo(width, SETTINGS.landscapeWidths)) {
    entry.landscape.avif.push({ width: w, file: emit(resized(w), 'avif', `${name}-${String(w)}.avif`) });
    entry.landscape.webp.push({ width: w, file: emit(resized(w), 'webp', `${name}-${String(w)}.webp`) });
  }
  for (const w of SETTINGS.jpegWidths.filter((w) => w <= width)) {
    entry.landscape.jpeg.push({ width: w, file: emit(resized(w), 'jpeg', `${name}-${String(w)}.jpg`) });
  }

  // Portrait: the centre band that `object-fit: cover` shows on tall screens.
  const cropWidth = Math.min(width, Math.round(height * SETTINGS.portraitAspect));
  const crop = { left: Math.round((width - cropWidth) / 2), top: 0, width: cropWidth, height };
  for (const w of widthsUpTo(cropWidth, SETTINGS.portraitWidths)) {
    const portrait = () => image.clone().extract(crop).resize({ width: w, withoutEnlargement: true });
    entry.portrait.avif.push({ width: w, file: emit(portrait(), 'avif', `${name}-p${String(w)}.avif`) });
    entry.portrait.webp.push({ width: w, file: emit(portrait(), 'webp', `${name}-p${String(w)}.webp`) });
  }

  await Promise.all(jobs);
  return entry;
}

function filesOf(entry: ImageEntry): string[] {
  return [
    ...entry.landscape.avif,
    ...entry.landscape.webp,
    ...entry.landscape.jpeg,
    ...entry.portrait.avif,
    ...entry.portrait.webp,
  ].map((v) => v.file);
}

async function allFilesExist(entry: ImageEntry, root: string): Promise<boolean> {
  const checks = await Promise.all(filesOf(entry).map((url) => exists(path.join(root, url))));
  return checks.every(Boolean);
}

async function removeStale(outDir: string, cache: CacheFile, toUrl: (f: string) => string) {
  const keep = new Set(Object.values(cache.images).flatMap(({ entry }) => filesOf(entry)));
  if (cache.og) keep.add(cache.og.file);
  keep.add(toUrl(path.join(outDir, 'manifest.json')));
  for (const file of await readdir(outDir)) {
    const full = path.join(outDir, file);
    if (!keep.has(toUrl(full))) await rm(full, { force: true });
  }
}
