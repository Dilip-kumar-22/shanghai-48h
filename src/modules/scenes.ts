import { prefersReducedData } from '../lib/preferences';

type SceneState = 'loading' | 'loaded' | 'error';

export interface Scenes {
  /** Settles once the image of scene `index` is decoded, or has failed. */
  ready(index: number): Promise<void>;
  /** Fetches the image of scene `index` now instead of waiting for lazy loading. */
  prefetch(index: number): void;
}

/**
 * Tracks each scene image as loading / loaded / error (exposed as
 * `data-state` on its `.chapter__bg`, which CSS uses to fade it in or fall back to
 * the backdrop gradient) and lets the caller warm the next scene only.
 */
export function initScenes(hosts: readonly HTMLElement[]): Scenes {
  const images = hosts.map((host) => host.querySelector<HTMLImageElement>('.chapter__bg img'));
  for (const image of images) if (image) track(image);
  const saveData = prefersReducedData();

  return {
    ready(index) {
      const image = images[index];
      return image ? image.decode().catch(() => undefined) : Promise.resolve();
    },
    prefetch(index) {
      const image = images[index];
      if (saveData || !image || image.complete || image.loading !== 'lazy') return;
      image.loading = 'eager';
      // Decode ahead too, so the scene is paint-ready when it scrolls into view.
      image.decode().catch(() => undefined);
    },
  };
}

function track(image: HTMLImageElement): void {
  const backdrop = image.closest<HTMLElement>('.chapter__bg');
  if (!backdrop) return;
  const set = (state: SceneState) => {
    backdrop.dataset.state = state;
  };
  if (image.complete) {
    set(image.naturalWidth > 0 ? 'loaded' : 'error');
    return;
  }
  set('loading');
  image.addEventListener(
    'load',
    () => {
      set('loaded');
    },
    { once: true },
  );
  image.addEventListener(
    'error',
    () => {
      set('error');
    },
    { once: true },
  );
}
