import { expect, type Page } from '@playwright/test';

export const CHAPTERS = [
  { id: 'bund', no: '01', place: 'The Bund' },
  { id: 'nanjing', no: '02', place: 'Nanjing Road' },
  { id: 'pudong', no: '03', place: 'Lujiazui' },
  { id: 'alley', no: '04', place: 'Old City' },
  { id: 'garden', no: '05', place: 'Yu Garden' },
  { id: 'food', no: '06', place: 'Night Market' },
] as const;

/** Records everything that should never happen on a healthy page load. */
export function watchForProblems(page: Page) {
  const problems: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error' || message.type() === 'warning') {
      problems.push(`console.${message.type()}: ${message.text()}`);
    }
  });
  page.on('pageerror', (error) => problems.push(`pageerror: ${error.message}`));
  page.on('requestfailed', (request) => {
    problems.push(`requestfailed: ${request.url()} (${request.failure()?.errorText ?? ''})`);
  });
  page.on('response', (response) => {
    if (response.status() >= 400) problems.push(`HTTP ${String(response.status())}: ${response.url()}`);
  });
  return problems;
}

/** Resolves once the preloader has fully left (by the script or the CSS failsafe). */
export async function loaderGone(page: Page, timeout = 6000) {
  await expect(page.locator('#loader')).toHaveCSS('visibility', 'hidden', { timeout });
}

/** Distance of an element's top from the top of the viewport. */
export function viewportTop(page: Page, selector: string) {
  return page.locator(selector).evaluate((element) => element.getBoundingClientRect().top);
}

export function activeElementId(page: Page) {
  return page.evaluate(() => document.activeElement?.id ?? '');
}

const SCENE_IMAGE = /\/assets\/[a-z]+-p?\d+-[\w-]+\.(avif|webp|jpg)$/;

/**
 * Holds every scene image response open, so no image completes and the page's own
 * loading decisions stay observable whatever the browser's lazy-load distance.
 */
export async function stallSceneImages(page: Page) {
  await page.route(SCENE_IMAGE, () => undefined);
}

/** Ids of the scenes whose image is not left to lazy loading, in story order. */
export function eagerScenes(page: Page) {
  return page.evaluate(() =>
    [...document.querySelectorAll<HTMLImageElement>('.chapter__bg img')]
      .filter((image) => image.loading !== 'lazy')
      .map((image) => image.closest('[id]')?.id ?? ''),
  );
}

/** Scene image requests (hashed build assets), excluding icons and fonts. */
export function sceneImageRequests(page: Page) {
  const urls: string[] = [];
  page.on('request', (request) => {
    if (request.resourceType() === 'image' && SCENE_IMAGE.test(request.url())) {
      urls.push(new URL(request.url()).pathname.split('/').pop() ?? '');
    }
  });
  return urls;
}
