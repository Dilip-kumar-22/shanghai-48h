import type { ScrollController } from './scroll';

/**
 * Smooth in-page navigation that keeps native semantics: the URL hash and history
 * entry update, and focus moves to the target once it is reached. The skip link,
 * modified clicks, and every link while scrolling is native keep the browser's own
 * behavior.
 */
export function initInPageLinks(scroll: ScrollController): void {
  document.addEventListener('click', (event) => {
    if (!scroll.smooth || event.defaultPrevented || event.button !== 0) return;
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const link = event.target instanceof Element ? event.target.closest('a') : null;
    if (!link || link.classList.contains('skip-link') || !link.hash) return;
    if (link.origin !== location.origin || link.pathname !== location.pathname) return;
    const target = document.getElementById(decodeURIComponent(link.hash.slice(1)));
    if (!target) return;

    event.preventDefault();
    if (location.hash !== link.hash) history.pushState(null, '', link.hash);
    scroll.scrollTo(target, () => {
      target.focus({ preventScroll: true });
    });
  });
}
