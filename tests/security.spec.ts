import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

// public/_headers enforces `script-src 'self'; style-src 'self'`. That is only true of the
// site if the built HTML needs neither an inline script nor an inline style. This pins it:
// the day an inline <style> or style="" appears, Cloudflare would silently drop it in a
// browser, and the page would look broken only there.
const DIST = join(process.cwd(), 'dist');
const walk = (d: string): string[] =>
  readdirSync(d).flatMap((n) => {
    const p = join(d, n);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
const pages = walk(DIST).filter((p) => p.endsWith('.html'));

test('the CSP header file has no unsafe-inline and no unsafe-eval', () => {
  const h = readFileSync('public/_headers', 'utf8');
  const csp = h.split('\n').find((l) => /^\s*Content-Security-Policy:/.test(l)) ?? '';
  expect(csp).not.toBe('');
  expect(csp).not.toMatch(/unsafe-inline|unsafe-eval/);
  expect(csp).toMatch(/script-src 'self'/);
});

for (const p of pages) {
  test(`${p.replace(DIST, '')} has no inline <script>, <style> or style attribute`, () => {
    const html = readFileSync(p, 'utf8');
    expect(html).not.toMatch(/<script\b/i);
    expect(html).not.toMatch(/<style\b/i);
    expect(html).not.toMatch(/\sstyle="/i);
  });
}

test('no CSP-violating console messages while browsing every page', async ({ page }) => {
  const problems: string[] = [];
  page.on('console', (m) => {
    if (/content security policy|refused to/i.test(m.text())) problems.push(m.text());
  });
  for (const r of ['/', '/about', '/contact', '/privacy']) await page.goto(r);
  expect(problems).toEqual([]);
});
