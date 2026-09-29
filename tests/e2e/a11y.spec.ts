import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { loaderGone } from './helpers';

const WCAG_22_AA = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

async function violations(page: Page) {
  const results = await new AxeBuilder({ page }).withTags(WCAG_22_AA).analyze();
  return results.violations.map((v) => ({
    rule: v.id,
    impact: v.impact,
    targets: v.nodes.map((node) => node.target.join(' ')),
  }));
}

test.describe('accessibility @a11y', () => {
  for (const [name, path] of [
    ['intro', './'],
    ['a chapter', './#garden'],
    ['the outro', './#end'],
  ] as const) {
    test(`${name} has no WCAG 2.2 AA violations`, async ({ page }) => {
      await page.goto(path);
      await loaderGone(page);
      await page.waitForTimeout(1200); // let reveal transitions settle
      expect(await violations(page)).toEqual([]);
    });
  }

  test('reduced motion has no WCAG 2.2 AA violations', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('./#food');
    await loaderGone(page);
    expect(await violations(page)).toEqual([]);
  });

  test('forced colors have no WCAG 2.2 AA violations', async ({ page }) => {
    await page.emulateMedia({ forcedColors: 'active' });
    await page.goto('./');
    await loaderGone(page);
    await page.waitForTimeout(1200);
    expect(await violations(page)).toEqual([]);
  });
});
