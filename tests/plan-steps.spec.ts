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

  test('redirects-brands is opt-in and plans one redirect per brand zone (control: default plan omits it)', () => {
    expect(plan().stdout).not.toContain('== redirects-brands:');
    const r = plan('--only', 'redirects-brands');
    expect(r.status).toBe(0);
    expect(r.stdout).toContain('"target_url":{"value":"https://authframework.dev"}');
    expect(r.stdout).toContain('"target_url":{"value":"https://github.com/ciresnave/PersistAnt"}');
    expect(r.stdout.split('\n').filter((l) => l.includes('PUT ') && l.includes('/rulesets/'))).toHaveLength(2);
    expect(r.stdout).not.toContain('zone_id:thinkersfoundation');
  });

  test('dns-preflight is opt-in, read-only, and plans 9 lookups (control: default plan omits it)', () => {
    expect(plan().stdout).not.toContain('== dns-preflight:');
    const r = plan('--only', 'dns-preflight');
    expect(r.status).toBe(0);
    const gets = r.stdout.split('\n').filter((l) => l.includes('/dns_records?name='));
    expect(gets).toHaveLength(9);
    expect(gets.every((l) => l.trim().startsWith('GET '))).toBe(true);
    expect(r.stdout).toContain('dns_records?name=*.thinkers.foundation');
    expect(r.stdout).not.toMatch(/\b(POST|PUT|PATCH|DELETE)\b/);
  });
});
