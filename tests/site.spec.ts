import { test, expect } from '@playwright/test';

const ROUTES = ['/', '/about', '/contact', '/privacy'];

test('home responds with the name, tagline and the incorporation status', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/Thinker's Foundation/);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Thinkers helping thinkers.');
  await expect(page.getByTestId('status')).toContainText('Incorporation in progress');
});

for (const route of ROUTES) {
  test(`${route} has one h1, a canonical on the apex, and a mailto role address`, async ({ page }) => {
    await page.goto(route);
    await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);
    const expected = new URL(route, 'https://thinkersfoundation.net').href;
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', expected);
    await expect(page.locator('meta[property="og:url"]')).toHaveAttribute('content', expected);
    await expect(page.locator('a[href="mailto:admin@thinkersfoundation.net"]').first()).toBeVisible();
  });
}

test('unknown route serves the branded 404', async ({ page }) => {
  const res = await page.goto('/no-such-page');
  expect(res?.status()).toBe(404);
  await expect(page.getByRole('heading', { level: 1 })).toContainText('not here');
});

test('contact publishes no postal address while none is decided', async ({ page }) => {
  await page.goto('/contact');
  await expect(page.locator('address')).toHaveCount(0);
});

test('no page loads anything from another origin', async ({ page }) => {
  const foreign: string[] = [];
  page.on('request', (r) => {
    const u = new URL(r.url());
    if (u.hostname !== 'localhost') foreign.push(r.url());
  });
  for (const route of [...ROUTES, '/no-such-page']) await page.goto(route);
  expect(foreign).toEqual([]);
});
