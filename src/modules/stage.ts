import { clamp } from '../lib/dom';

// Keep PARALLAX_SCALE in sync with build/site-plugin.ts, which sizes images for it.
const PARALLAX_RANGE = 6; // % of the backdrop height, each direction
const PARALLAX_SCALE = 1.08;
const CROSSFADE = 0.62; // share of a viewport over which a chapter fades in
const NEAR = 1; // viewports on either side that keep compositor layers (will-change)

interface Scene {
  host: HTMLElement;
  backdrop: HTMLElement | null;
  /** Chapters only: the pinned frame that crossfades in. */
  sticky: HTMLElement | null;
  top: number;
  height: number;
  near: boolean;
  shift: number;
  opacity: number;
}

export interface StageOptions {
  /** Intro, chapters and outro, in document order. */
  hosts: readonly HTMLElement[];
  progressBar: HTMLElement | null;
  trailFill: HTMLElement | null;
  /** Receives the index of the scene at the middle of the viewport, every render. */
  onActive: (index: number) => void;
}

export interface Stage {
  /** Re-reads layout. Call when the viewport or document size changes. */
  measure(): void;
  /** Applies the scroll-driven effects for scroll position `y` without reading layout. */
  render(y: number, motion: boolean): void;
}

/**
 * Parallax drift, chapter crossfade, progress bars and active-scene tracking.
 * Geometry is cached by `measure()`, so a frame costs arithmetic plus the style
 * writes that actually changed, and only on-screen scenes are touched.
 */
export function createStage({ hosts, progressBar, trailFill, onActive }: StageOptions): Stage {
  const scenes: Scene[] = hosts.map((host) => ({
    host,
    backdrop: host.querySelector<HTMLElement>('[data-parallax]'),
    sticky: host.classList.contains('chapter') ? host.querySelector<HTMLElement>('.chapter__sticky') : null,
    top: 0,
    height: 0,
    near: false,
    shift: Number.NaN,
    opacity: Number.NaN,
  }));
  let viewport = 0;
  let maxScroll = 0;
  let progress = Number.NaN;
  // The trail is vertical on wide screens and a horizontal rail on narrow ones (CSS).
  let railAxis: 'X' | 'Y' = 'Y';

  return {
    measure() {
      viewport = window.innerHeight;
      maxScroll = Math.max(0, document.documentElement.scrollHeight - viewport);
      const y = window.scrollY;
      for (const scene of scenes) {
        const rect = scene.host.getBoundingClientRect();
        scene.top = rect.top + y;
        scene.height = rect.height;
      }
      const rail = trailFill?.parentElement;
      if (rail) railAxis = rail.clientWidth > rail.clientHeight ? 'X' : 'Y';
      progress = Number.NaN; // rewrite the bars on the next render
    },

    render(y, motion) {
      let active = 0;
      scenes.forEach((scene, index) => {
        const top = scene.top - y;
        const bottom = top + scene.height;
        if (top <= viewport * 0.5) active = index;

        const near = bottom > -viewport * NEAR && top < viewport * (1 + NEAR);
        if (near !== scene.near) {
          scene.near = near;
          scene.host.classList.toggle('is-near', near);
        }
        if (!motion) return;

        // ken-burns parallax drift, only while the scene is on screen
        if (scene.backdrop && bottom > 0 && top < viewport) {
          const t = (clamp((viewport - top) / (viewport + scene.height)) - 0.5) * 2;
          const shift = Math.round(t * PARALLAX_RANGE * 100) / 100;
          if (shift !== scene.shift) {
            scene.shift = shift;
            scene.backdrop.style.transform = `translate(0, ${String(shift)}%) scale(${String(PARALLAX_SCALE)})`;
          }
        }
        // crossfade: each chapter melts in as it rises into the frame
        if (scene.sticky) {
          const opacity = Math.round(clamp((viewport - top) / (viewport * CROSSFADE)) * 1000) / 1000;
          if (opacity !== scene.opacity) {
            scene.opacity = opacity;
            scene.sticky.style.opacity = String(opacity);
          }
        }
      });

      const share = maxScroll > 0 ? Math.round(clamp(y / maxScroll) * 10_000) / 10_000 : 0;
      if (share !== progress) {
        progress = share;
        // Plain inline transforms keep the browser's cheap inline-style update path.
        if (progressBar) progressBar.style.transform = `scaleX(${String(share)})`;
        if (trailFill) trailFill.style.transform = `scale${railAxis}(${String(share)})`;
      }
      onActive(active);
    },
  };
}
