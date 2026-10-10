import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const ROUTES = ['/', '/about', '/contact', '/privacy', '/no-such-page'];

for (const route of ROUTES) {
  test(`no serious accessibility violations on ${route}`, async ({ page }) => {
    await page.goto(route);
    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
    const serious = results.violations.filter((v) => ['serious', 'critical'].includes(v.impact ?? ''));
    expect(serious, JSON.stringify(serious.map((v) => v.id), null, 2)).toEqual([]);
  });

  // axe tags heading-order as best-practice/moderate, so the scan above is blind to it.
  test(`headings stay in order on ${route}`, async ({ page }) => {
    await page.goto(route);
    const results = await new AxeBuilder({ page }).withRules(['heading-order']).analyze();
    const offenders = results.violations.flatMap((v) => v.nodes.map((n) => n.html));
    expect(offenders, JSON.stringify(offenders, null, 2)).toEqual([]);
  });
}

test('mobile width has no horizontal overflow', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 740 });
  for (const r of ROUTES) {
    await page.goto(r);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow, r).toBeLessThanOrEqual(0);
  }
});
