import { test, expect } from '@playwright/test';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';

// dns-pages and pages-domains only make sense for a Cloudflare PAGES project. A Workers project gets its
// DNS from Custom Domains and is invisible to the /pages/projects API, so a bare `plan.mjs --apply` must not
// run them. They stay available with --only, which is how RUNBOOK.md calls them. Plan mode sends nothing.

const PLAN = resolve('ops/cloudflare/plan.mjs');
const plan = (...args: string[]) =>
  spawnSync(process.execPath, [PLAN, ...args], { encoding: 'utf8' }).stdout;

test.describe('plan.mjs step selection', () => {
  test('default plan skips the Pages-only steps but keeps the others (control: redirects, dmarc present)', () => {
    const out = plan();
    expect(out).toContain('== redirects:');
    expect(out).toContain('== dmarc:');
    expect(out).not.toContain('== dns-pages:');
    expect(out).not.toContain('== pages-domains:');
  });

  test('--only dns-pages,pages-domains still runs them', () => {
    const out = plan('--only', 'dns-pages,pages-domains');
    expect(out).toContain('== dns-pages: PAGES ONLY');
    expect(out).toContain('== pages-domains: PAGES ONLY');
  });
});
