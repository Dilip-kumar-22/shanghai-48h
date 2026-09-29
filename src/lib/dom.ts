export const clamp = (value: number, min = 0, max = 1): number => Math.min(max, Math.max(min, value));

type ElementType<T extends Element> = abstract new () => T;

/** The element with `id` if it is a `type` (defaults to any HTMLElement). */
export function byId<T extends HTMLElement = HTMLElement>(
  id: string,
  type: ElementType<T> = HTMLElement as unknown as ElementType<T>,
): T | null {
  const element = document.getElementById(id);
  return element instanceof type ? element : null;
}

/** Elements matching `selector` that are a `type` (defaults to any HTMLElement). */
export function all<T extends Element = HTMLElement>(
  selector: string,
  type: ElementType<T> = HTMLElement as unknown as ElementType<T>,
): T[] {
  return [...document.querySelectorAll(selector)].filter((element): element is T => element instanceof type);
}
