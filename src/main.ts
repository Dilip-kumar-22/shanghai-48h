// 48 Hours in Shanghai - cinematic scroll engine (progressive enhancement).
//
// The HTML is complete and readable on its own. This script: takes over the
// preloader, applies the enhanced start states, then wires momentum scroll,
// parallax/crossfade, reveals, the chapter HUD and trail, in-page navigation and
// the optional ambient sound. Any failure falls back to the plain page.
import { all, byId } from './lib/dom';
import { prefersReducedMotion } from './lib/preferences';
import { initAmbient } from './modules/ambient';
import { initChapterUi } from './modules/chapters';
import { startLoader } from './modules/loader';
import { initInPageLinks } from './modules/navigation';
import { observeReveals, revealNow } from './modules/reveals';
import { initScenes } from './modules/scenes';
import { startScroll } from './modules/scroll';
import { createStage } from './modules/stage';

const root = document.documentElement;
const hosts = all('.intro, .chapter, .outro');
const chapters = hosts.filter((host) => host.classList.contains('chapter'));
const onLoad = all('.on-load');
const onScroll = all('.reveal:not(.on-load), .kinetic:not(.on-load)');

// The loader starts first: whatever happens below, it is guaranteed to leave.
const scenes = initScenes(hosts);
const loader = startLoader([fontsReady(), scenes.ready(sceneInView())]);

try {
  enhance();

  const chapterUi = initChapterUi(chapters, all('.trail__dot', HTMLAnchorElement));
  let activeScene = -1;
  const stage = createStage({
    hosts,
    progressBar: byId('progress-bar'),
    trailFill: byId('trail-fill'),
    onActive(index) {
      if (index === activeScene) return;
      activeScene = index;
      chapterUi.setActive(Math.min(index - 1, chapters.length - 1)); // hosts[0] is the intro
      scenes.prefetch(index + 1); // warm only the next scene
    },
  });
  const scroll = startScroll(
    (y) => {
      stage.render(y, !prefersReducedMotion());
    },
    () => {
      stage.measure();
    },
  );
  initInPageLinks(scroll);
  initAmbient(byId('sound', HTMLButtonElement));

  void loader.exited.then(() => {
    revealNow(onLoad);
    if (prefersReducedMotion()) revealNow(onScroll);
    else observeReveals(onScroll);
  });
} catch (error) {
  // Fail open: without the enhanced start states the page reads as plain HTML.
  delete root.dataset.enhanced;
  throw error;
}

/** Commits the hidden start states without animating them (they sit under the loader). */
function enhance(): void {
  root.classList.add('is-booting');
  root.dataset.enhanced = '';
  // The CSS failsafe already revealed the page: nothing may disappear now.
  if (loader.late) revealNow([...onLoad, ...onScroll]);
  root.getBoundingClientRect(); // flush styles so the start states apply un-animated
  root.classList.remove('is-booting');
}

function fontsReady(): Promise<unknown> {
  return Promise.all([
    document.fonts.load('700 1em "Space Grotesk Variable"'),
    document.fonts.load('400 1em "Inter Variable"'),
  ]);
}

/** Index of the scene at the middle of the viewport (a deep link may land mid-page). */
function sceneInView(): number {
  const middle = window.innerHeight / 2;
  const index = hosts.findIndex((host) => {
    const { top, bottom } = host.getBoundingClientRect();
    return top <= middle && bottom > middle;
  });
  return Math.max(0, index);
}
