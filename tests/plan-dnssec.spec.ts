import { test, expect } from '@playwright/test';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

// RUNBOOK section 2 says DNSSEC is enabled only once the zone reads Active: the order is
// the safety, because enabling it earlier can leave validating resolvers failing. This
// pins that `plan.mjs --apply --only dnssec` REFUSES a zone that is not Active, and that
// it does not make the PATCH first. plan.mjs runs unmodified, with a stand-in for
// fetch (tests/helpers/mock-cloudflare-fetch.mjs), so no token or network is involved.

const PLAN = resolve('ops/cloudflare/plan.mjs');
const MOCK = pathToFileURL(resolve('tests/helpers/mock-cloudflare-fetch.mjs')).href;
const ZONES = ['thinkersfoundation.net', 'thinkersfoundation.us', 'thinkers.foundation'];

function run(zoneStatus: Record<string, string>) {
  const r = spawnSync(process.execPath, ['--import', MOCK, PLAN, '--apply', '--only', 'dnssec'], {
    encoding: 'utf8',
    env: {
      ...process.env,
      CLOUDFLARE_API_TOKEN: 'test-token-not-real',
      CLOUDFLARE_ACCOUNT_ID: 'test-account',
      FORWARD_TO: 'nobody@example.invalid',
      MOCK_ZONE_STATUS: JSON.stringify(zoneStatus),
    },
  });
  const out = `${r.stdout}\n${r.stderr}`;
  return { code: r.status, out, patches: (out.match(/PATCH \/zones\/[^ ]+\/dnssec/g) ?? []).length };
}

test.describe('plan.mjs --only dnssec and zone status', () => {
  // Positive control: the harness really drives the dnssec step, so "0 PATCH" below is
  // a refusal and not a mock that never reached the step.
  test('all three zones active: DNSSEC is enabled in each (control)', () => {
    const r = run({});
    expect(r.code, r.out).toBe(0);
    expect(r.patches).toBe(ZONES.length);
    expect(r.out).toContain('DS to add at the registrar: MOCK-DS');
  });

  for (const pending of ZONES) {
    test(`${pending} pending: refused, and no DNSSEC PATCH is made to ANY zone`, () => {
      const r = run({ [pending]: 'pending' });
      expect(r.code, r.out).toBe(1);
      expect(r.out).toContain(`zone ${pending} is pending, not active`);
      expect(r.out).toContain('STOPPED at step zones');
      expect(r.patches).toBe(0);
    });
  }

  test('a zone in any other non-active state is refused too', () => {
    const r = run({ 'thinkersfoundation.us': 'moved' });
    expect(r.code, r.out).toBe(1);
    expect(r.patches).toBe(0);
  });
});
