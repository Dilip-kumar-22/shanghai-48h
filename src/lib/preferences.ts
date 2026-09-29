const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');

export const prefersReducedMotion = (): boolean => reducedMotion.matches;

export function onReducedMotionChange(listener: (reduced: boolean) => void): void {
  reducedMotion.addEventListener('change', (event) => {
    listener(event.matches);
  });
}

/** Save-Data (Chromium) or the proposed `prefers-reduced-data` media feature. */
export function prefersReducedData(): boolean {
  const { connection } = navigator as Navigator & { connection?: { saveData?: boolean } };
  return connection?.saveData === true || matchMedia('(prefers-reduced-data: reduce)').matches;
}
