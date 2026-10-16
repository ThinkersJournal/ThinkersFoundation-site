import { test, expect } from '@playwright/test';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

// `--only email-rules` PUTs the catch-all and must then read it back and assert it is enabled
// and forwarding to FORWARD_TO. The named-rule listing does not include the catch-all, so
// without that assertion a catch-all that never took effect passes silently and a made-up
// address bounces. plan.mjs runs unmodified against tests/helpers/mock-cloudflare-fetch.mjs.

const PLAN = resolve('ops/cloudflare/plan.mjs');
const MOCK = pathToFileURL(resolve('tests/helpers/mock-cloudflare-fetch.mjs')).href;
const FORWARD = 'nobody@example.invalid';

function run(skipPutZone = '') {
  const r = spawnSync(process.execPath, ['--import', MOCK, PLAN, '--apply', '--only', 'email-rules'], {
    encoding: 'utf8',
    env: {
      ...process.env,
      CLOUDFLARE_API_TOKEN: 'test-token-not-real',
      CLOUDFLARE_ACCOUNT_ID: 'test-account',
      FORWARD_TO: FORWARD,
      MOCK_SKIP_CATCHALL_PUT: skipPutZone,
    },
  });
  return { code: r.status, out: `${r.stdout}\n${r.stderr}` };
}

test.describe('plan.mjs --only email-rules catch-all read-back', () => {
  test('catch-all stored in every zone: passes and prints enabled=true (control)', () => {
    const r = run();
    expect(r.code, r.out).toBe(0);
    expect((r.out.match(/catch-all enabled=true matcher=all action=forward/g) ?? []).length).toBe(3);
  });

  for (const zone of ['thinkersfoundation.net', 'thinkersfoundation.us', 'thinkers.foundation']) {
    test(`${zone}: PUT reports success but catch-all stays disabled: the run fails`, () => {
      const r = run(zone);
      expect(r.code, r.out).toBe(1);
      expect(r.out).toContain(`catch-all for ${zone} is not enabled`);
    });
  }
});
