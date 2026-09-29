import { expect, test } from '@playwright/test';
import {
  CHAPTERS,
  activeElementId,
  eagerScenes,
  loaderGone,
  sceneImageRequests,
  stallSceneImages,
  viewportTop,
  watchForProblems,
} from './helpers';

test.describe('loading', () => {
  test('loads without errors and the loader leaves', async ({ page }) => {
    const problems = watchForProblems(page);
    await page.goto('./');
    await loaderGone(page);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.locator('.intro__title .kinetic').first()).toHaveCSS('opacity', '1');
    // No debug globals (the original leaked __frame and __lenis); ignore Playwright's own.
    const globals = await page.evaluate(() =>
      Object.keys(window).filter((key) => key.startsWith('__') && !key.startsWith('__playwright')),
    );
    expect(globals).toEqual([]);
    expect(problems).toEqual([]);
  });

  // How far ahead native lazy loading fetches is the browser's choice (Chromium 141 took
  // one scene below the fold, 153 takes up to three), so the tests below pin down what the
  // page itself does: it eagerly loads the first scene and the next one, nothing else.
  test('eagerly loads only the first scene and the next one', async ({ page }) => {
    await stallSceneImages(page);
    await page.goto('./', { waitUntil: 'domcontentloaded' });
    await loaderGone(page);
    await expect.poll(() => eagerScenes(page)).toEqual(['top', 'bund']);
  });

  test('never requests the last scenes up front', async ({ page }) => {
    const images = sceneImageRequests(page);
    await page.goto('./');
    await loaderGone(page);
    await page.waitForTimeout(1500);
    expect(images.some((file) => file.startsWith('hero-'))).toBe(true);
    expect(images.filter((file) => /^(food|outro)-/.test(file))).toEqual([]);
    expect(images.every((file) => file.endsWith('.avif'))).toBe(true);
  });

  test('warms the scene after the active chapter', async ({ page }) => {
    await stallSceneImages(page);
    await page.goto('./#pudong', { waitUntil: 'domcontentloaded' });
    await loaderGone(page);
    await expect.poll(() => eagerScenes(page)).toContain('alley');
    expect(await eagerScenes(page)).not.toContain('garden');
  });
});

test.describe('in-page navigation', () => {
  for (const chapter of CHAPTERS) {
    test(`the trail link to ${chapter.place} scrolls there, updates the URL and moves focus`, async ({
      page,
    }) => {
      await page.goto('./');
      await loaderGone(page);
      await page.locator(`.trail__dot[href="#${chapter.id}"]`).click();
      await expect.poll(() => activeElementId(page), { timeout: 5000 }).toBe(chapter.id);
      await expect(page).toHaveURL(new RegExp(`#${chapter.id}$`));
      expect(Math.abs(await viewportTop(page, `#${chapter.id}`))).toBeLessThanOrEqual(2);
      await expect(page.locator('#hud-no')).toHaveText(chapter.no);
      await expect(page.locator(`.trail__dot[href="#${chapter.id}"]`)).toHaveAttribute(
        'aria-current',
        'location',
      );
    });
  }

  test('"Scroll it again" returns to the top', async ({ page }) => {
    await page.goto('./#end');
    await loaderGone(page);
    await page.getByRole('link', { name: 'Scroll it again' }).click();
    await expect.poll(() => activeElementId(page), { timeout: 8000 }).toBe('top');
    await expect(page).toHaveURL(/#top$/);
    expect(await page.evaluate(() => window.scrollY)).toBeLessThanOrEqual(1);
  });

  test('a deep link lands on its chapter', async ({ page }) => {
    await page.goto('./#pudong');
    await loaderGone(page);
    expect(Math.abs(await viewportTop(page, '#pudong'))).toBeLessThanOrEqual(2);
    await expect(page.locator('#hud-no')).toHaveText('03');
    await expect(page.locator('#pudong .chapter__title')).toHaveCSS('opacity', '1');
  });

  test('the back button returns to the previous chapter', async ({ page }) => {
    await page.goto('./');
    await loaderGone(page);
    await page.locator('.trail__dot[href="#nanjing"]').click();
    await expect.poll(() => activeElementId(page), { timeout: 5000 }).toBe('nanjing');
    await page.locator('.trail__dot[href="#garden"]').click();
    await expect.poll(() => activeElementId(page), { timeout: 5000 }).toBe('garden');
    await page.goBack();
    await expect(page).toHaveURL(/#nanjing$/);
    await expect.poll(() => viewportTop(page, '#nanjing').then(Math.abs)).toBeLessThanOrEqual(2);
  });
});

test.describe('keyboard', () => {
  test.skip(({ isMobile }) => isMobile, 'keyboard navigation is a desktop flow');

  test('the skip link moves focus past the navigation to the content', async ({ page }) => {
    await page.goto('./');
    await loaderGone(page);
    await page.keyboard.press('Tab');
    const skip = page.getByRole('link', { name: 'Skip to content' });
    await expect(skip).toBeFocused();
    await expect.poll(async () => (await skip.boundingBox())?.y ?? -1).toBeGreaterThanOrEqual(0);
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/#main$/);
    await expect.poll(() => activeElementId(page)).toBe('main');
    await page.keyboard.press('Tab');
    await expect(page.getByRole('link', { name: 'Scroll it again' })).toBeFocused();
  });

  test('keyboard focus shows the chapter label', async ({ page }) => {
    await page.goto('./');
    await loaderGone(page);
    // Tab order: skip link, sound, then the chapter links.
    for (let i = 0; i < 3; i++) await page.keyboard.press('Tab');
    const first = page.locator('.trail__dot').first();
    await expect(first).toBeFocused();
    await expect(first.locator('.trail__label')).toHaveCSS('opacity', '1');
  });
});

test.describe('ambient sound', () => {
  test('toggles and reports its state', async ({ page }) => {
    const problems = watchForProblems(page);
    await page.goto('./');
    await loaderGone(page);
    const sound = page.getByRole('button', { name: 'Ambient sound' });
    await expect(sound).toHaveAttribute('aria-pressed', 'false');
    await sound.click();
    await expect(sound).toHaveAttribute('aria-pressed', 'true');
    await sound.click();
    await expect(sound).toHaveAttribute('aria-pressed', 'false');
    expect(problems).toEqual([]);
  });

  test('stays hidden when Web Audio is unavailable', async ({ page }) => {
    const problems = watchForProblems(page);
    await page.addInitScript(() => {
      Reflect.deleteProperty(window, 'AudioContext');
      Reflect.deleteProperty(window, 'webkitAudioContext');
    });
    await page.goto('./');
    await loaderGone(page);
    await expect(page.locator('#sound')).toBeHidden();
    expect(problems).toEqual([]);
  });
});

test.describe('resilience', () => {
  test('the page opens and stays usable when the script fails to load', async ({ page }) => {
    await page.route(/\/assets\/index-[\w-]+\.js$/, (route) => route.abort());
    await page.goto('./');
    await loaderGone(page, 8000); // CSS failsafe
    await expect(page.locator('#bund .chapter__text')).toHaveCSS('opacity', '1');
    const loaderIntercepts = await page.evaluate(
      () => document.elementFromPoint(innerWidth / 2, innerHeight / 2)?.closest('#loader') !== null,
    );
    expect(loaderIntercepts).toBe(false);
  });

  test('a stalled first image cannot hold the loader', async ({ page }) => {
    await page.route(/\/assets\/hero-[\w-]+\.(avif|webp|jpg)$/, () => undefined); // never answered
    await page.goto('./', { waitUntil: 'domcontentloaded' });
    await loaderGone(page, 6000);
  });

  test('a failed scene image falls back to the backdrop', async ({ page }) => {
    const problems = watchForProblems(page);
    await page.route(/\/assets\/nanjing-[\w-]+\.(avif|webp|jpg)$/, (route) => route.fulfill({ status: 404 }));
    await page.goto('./#nanjing');
    await loaderGone(page);
    await expect(page.locator('#nanjing .chapter__bg')).toHaveAttribute('data-state', 'error');
    await expect(page.locator('#nanjing .chapter__bg img')).toHaveCSS('visibility', 'hidden');
    await expect(page.locator('#nanjing .chapter__title')).toHaveCSS('opacity', '1');
    // The injected 404 is expected; nothing else may go wrong.
    expect(problems.filter((p) => !p.includes('nanjing') && !p.includes('404'))).toEqual([]);
  });
});

test.describe('reduced motion', () => {
  test.use({ reducedMotion: 'reduce' });

  test('uses native scrolling, shows all content and skips parallax', async ({ page }) => {
    await page.goto('./');
    await loaderGone(page, 3000);
    await expect(page.locator('html')).not.toHaveClass(/\blenis\b/);
    await expect(page.locator('#bund .chapter__text')).toHaveCSS('opacity', '1');
    await expect(page.locator('#bund .chapter__bg')).toHaveCSS('transform', 'none');
    await page.locator('.trail__dot[href="#garden"]').click();
    await expect(page).toHaveURL(/#garden$/);
    await expect.poll(() => viewportTop(page, '#garden').then(Math.abs)).toBeLessThanOrEqual(2);
  });
});

test.describe('layout', () => {
  test.skip(({ isMobile }) => isMobile, 'explicit viewport sizes');

  const sizes = [
    [375, 667],
    [390, 844],
    [430, 932],
    [768, 1024],
    [844, 390],
    [1440, 900],
    [1920, 1080],
  ] as const;

  for (const [width, height] of sizes) {
    test(`${String(width)}×${String(height)}: chapter navigation, no overflow, no overlap`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height });
      await page.goto('./#garden');
      await loaderGone(page);

      const links = page.locator('.trail__dot');
      await expect(links).toHaveCount(6);
      for (const link of await links.all()) {
        await expect(link).toBeVisible();
        const box = await link.boundingBox();
        expect(Math.min(box?.width ?? 0, box?.height ?? 0)).toBeGreaterThanOrEqual(24);
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBe(0);

      for (const text of await page.locator('#garden :is(.reveal, .kinetic)').all()) {
        await expect(text).toHaveCSS('opacity', '1');
      }
      const overlaps = await page.evaluate(() => {
        const visible = (el: Element) => getComputedStyle(el).display !== 'none' && !el.closest('[hidden]');
        const fixed = [...document.querySelectorAll('.hud, .sound')].filter(visible);
        const texts = [...document.querySelectorAll('#garden .chapter__inner > *')];
        const hit = (a: DOMRect, b: DOMRect) =>
          a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
        return fixed.flatMap((f) =>
          texts
            .filter((t) => hit(f.getBoundingClientRect(), t.getBoundingClientRect()))
            .map((t) => `${f.className} covers ${t.className}`),
        );
      });
      expect(overlaps).toEqual([]);
    });
  }
});

test('forced colors keep the gradient headline readable', async ({ page }) => {
  await page.emulateMedia({ forcedColors: 'active' });
  await page.goto('./');
  await loaderGone(page);
  await expect(page.locator('.intro__title .accent')).not.toHaveCSS(
    '-webkit-text-fill-color',
    'rgba(0, 0, 0, 0)',
  );
});
