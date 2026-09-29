export function revealNow(elements: readonly Element[]): void {
  for (const element of elements) element.classList.add('is-visible');
}

/**
 * Reveals each element once, when its top rises above 88% of the viewport height.
 * Text pinned near the bottom of a short viewport may never cross that line, so an
 * element is also revealed once its (untransformed) container is entirely on screen.
 */
export function observeReveals(elements: readonly Element[]): void {
  const groups = new Map<Element, Element[]>();
  for (const element of elements) {
    const container = element.parentElement;
    if (container) groups.set(container, [...(groups.get(container) ?? []), element]);
  }

  const crossing = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.classList.add('is-visible');
        crossing.unobserve(entry.target);
      }
    },
    { rootMargin: '0px 0px -12% 0px' },
  );
  // Containers carry no start-state transform (or overflow clipping of one), so
  // "entirely on screen" is measurable for them.
  const onScreen = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.intersectionRatio < 0.99) continue;
        revealNow(groups.get(entry.target) ?? []);
        onScreen.unobserve(entry.target);
      }
    },
    { threshold: 1 },
  );

  for (const element of elements) crossing.observe(element);
  for (const container of groups.keys()) onScreen.observe(container);
}
