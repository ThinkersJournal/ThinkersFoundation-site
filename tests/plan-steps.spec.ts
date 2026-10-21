import { test, expect } from '@playwright/test';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';

// The project is a Cloudflare WORKERS project (board 234). Its DNS comes from Custom Domains and the
// /pages/projects API cannot see it, so the Pages-only steps dns-pages and pages-domains no longer exist.
// Plan mode sends nothing.

const PLAN = resolve('ops/cloudflare/plan.mjs');
const plan = (...args: string[]) => spawnSync(process.execPath, [PLAN, ...args], { encoding: 'utf8' });

test.describe('plan.mjs step selection', () => {
  test('default plan lists no Pages step (control: redirects, dmarc present)', () => {
    const out = plan().stdout;
    expect(out).toContain('== redirects:');
    expect(out).toContain('== dmarc:');
    expect(out).not.toContain('dns-pages');
    expect(out).not.toContain('pages-domains');
  });

  test('--only rejects the removed steps (control: --only dmarc runs)', () => {
    expect(plan('--only', 'dmarc').status).toBe(0);
    const r = plan('--only', 'dns-pages,pages-domains');
    expect(r.status).toBe(2);
    expect(r.stderr).toContain('unknown step(s): dns-pages, pages-domains');
  });
});
