import Lenis from 'lenis';
import { onReducedMotionChange, prefersReducedMotion } from '../lib/preferences';

export interface ScrollController {
  /** True while Lenis drives scrolling; false means native scrolling. */
  readonly smooth: boolean;
  /** Smooth-scrolls to `target`, then calls `done`. */
  scrollTo(target: HTMLElement, done: () => void): void;
}

// Touch scrolling stays native (Lenis leaves touch alone unless `syncTouch` is set).
const LENIS_OPTIONS = { autoRaf: true, lerp: 0.085, smoothWheel: true, wheelMultiplier: 1 };
const JUMP_DURATION = 1.4; // seconds, for in-page navigation

/**
 * Lenis momentum scrolling when motion is allowed, native scrolling when the user
 * prefers reduced motion (switching live if that preference changes).
 * `onFrame(y)` runs during the frame in which the scroll position changed, before
 * paint; `onResize()` runs when the viewport or document size changes.
 */
export function startScroll(onFrame: (y: number) => void, onResize: () => void): ScrollController {
  let lenis: Lenis | null = null;
  const position = () => (lenis ? lenis.scroll : window.scrollY);
  const nativeScroll = () => {
    onFrame(window.scrollY);
  };

  const useLenis = () => {
    if (lenis) return;
    window.removeEventListener('scroll', nativeScroll);
    lenis = new Lenis(LENIS_OPTIONS);
    lenis.on('scroll', (instance) => {
      onFrame(instance.scroll);
    });
  };
  const useNative = () => {
    lenis?.destroy();
    lenis = null;
    window.addEventListener('scroll', nativeScroll, { passive: true });
  };

  if (prefersReducedMotion()) useNative();
  else useLenis();

  onReducedMotionChange((reduced) => {
    if (reduced) useNative();
    else useLenis();
    onFrame(position());
  });

  const resize = () => {
    onResize();
    onFrame(position());
  };
  window.addEventListener('resize', resize, { passive: true });
  new ResizeObserver(resize).observe(document.body);
  resize();

  return {
    get smooth() {
      return lenis !== null;
    },
    scrollTo(target, done) {
      if (!lenis) {
        target.scrollIntoView();
        done();
        return;
      }
      lenis.scrollTo(target, { duration: JUMP_DURATION, onComplete: done });
    },
  };
}
