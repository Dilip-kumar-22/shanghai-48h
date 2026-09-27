import { byId } from '../lib/dom';

/** Longest the loader may hold the page once the script runs, whatever is still loading. */
export const LOADER_TIMEOUT_MS = 3000;

export interface Loader {
  /** Resolves when the loader starts to leave. */
  readonly exited: Promise<void>;
  /** The CSS failsafe had already removed the loader before the script ran. */
  readonly late: boolean;
}

/**
 * Takes over the loader that CSS shows by default. Progress is the share of real
 * milestones that have settled (the running script counts as the first one). The
 * loader leaves once every milestone has settled, or after LOADER_TIMEOUT_MS.
 */
export function startLoader(milestones: readonly Promise<unknown>[]): Loader {
  const loader = byId('loader');
  if (!loader) return { exited: Promise.resolve(), late: false };

  // The CSS failsafe has started: the page is already showing, so step aside.
  if (Number(getComputedStyle(loader).opacity) < 1) {
    loader.classList.add('is-done');
    return { exited: Promise.resolve(), late: true };
  }
  // From here the script guarantees the exit (timeout below), so drop the failsafe.
  loader.classList.add('is-controlled');

  const pct = byId('loader-pct');
  const bar = byId('loader-bar');
  const total = milestones.length + 1;
  let settled = 1;
  const render = () => {
    const share = settled / total;
    if (pct) pct.textContent = String(Math.round(share * 100));
    if (bar) bar.style.transform = `scaleX(${share.toFixed(3)})`;
  };
  render();

  const exited = new Promise<void>((resolve) => {
    const leave = () => {
      loader.classList.add('is-done');
      resolve();
    };
    const timer = window.setTimeout(leave, LOADER_TIMEOUT_MS);
    const tick = () => {
      settled += 1;
      render();
    };
    void Promise.allSettled(milestones.map((milestone) => milestone.then(tick, tick))).then(() => {
      window.clearTimeout(timer);
      leave();
    });
  });
  return { exited, late: false };
}
