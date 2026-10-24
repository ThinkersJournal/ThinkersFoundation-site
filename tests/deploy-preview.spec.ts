import { test, expect } from '@playwright/test';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

// scripts/deploy-preview.mjs is the deploy command for Workers Builds branch builds. These tests drive it
// with a fake `wrangler` runner, so no Cloudflare call is made. They prove the retry logic, not that
// Cloudflare accepts the delete: that is only proven by pushing one branch twice.

const SCRIPT = pathToFileURL(resolve('scripts/deploy-preview.mjs')).href;
const EXISTS = (n: string) =>
  `✘ [ERROR] A request to the Cloudflare API (/accounts/a/workers/workers/w/previews) failed.\n  A preview with name '${n}' already exists. [code: 100338]`;

type Result = { status: number; output: string };
async function drive(script: Result[]) {
  const { deployPreview } = await import(SCRIPT);
  const calls: string[][] = [];
  const logs: string[] = [];
  const code = deployPreview(
    (args: string[]) => {
      calls.push(args);
      const next = script[calls.length - 1];
      if (!next) throw new Error(`unexpected call #${calls.length}: ${args.join(' ')}`);
      return next;
    },
    (m: string) => logs.push(m),
  );
  return { code, calls, logs };
}

test.describe('deploy-preview.mjs', () => {
  test('first preview succeeds: one call, no delete (control)', async () => {
    const r = await drive([{ status: 0, output: 'ok' }]);
    expect(r.code).toBe(0);
    expect(r.calls).toEqual([['preview']]);
  });

  test('100338: deletes the named preview, then creates it again once', async () => {
    const r = await drive([
      { status: 1, output: EXISTS('spec-roadmap-audit') },
      { status: 0, output: 'deleted' },
      { status: 0, output: 'ok' },
    ]);
    expect(r.code).toBe(0);
    expect(r.calls).toEqual([
      ['preview'],
      ['preview', 'delete', '--name', 'spec-roadmap-audit', '-y'],
      ['preview'],
    ]);
  });

  test('100338 again after the retry: fails, and does not loop', async () => {
    const r = await drive([
      { status: 1, output: EXISTS('b') },
      { status: 0, output: 'deleted' },
      { status: 1, output: EXISTS('b') },
    ]);
    expect(r.code).toBe(1);
    expect(r.calls.length).toBe(3);
  });

  test('any other error passes through untouched: no delete', async () => {
    const r = await drive([{ status: 7, output: '✘ [ERROR] something else [code: 10000]' }]);
    expect(r.code).toBe(7);
    expect(r.calls).toEqual([['preview']]);
  });

  test('delete fails: its code is returned and the preview is not recreated', async () => {
    const r = await drive([
      { status: 1, output: EXISTS('b') },
      { status: 9, output: 'denied' },
    ]);
    expect(r.code).toBe(9);
    expect(r.calls.length).toBe(2);
  });

  test('100338 with no name in the message: nothing is deleted', async () => {
    const r = await drive([{ status: 1, output: 'failed [code: 100338]' }]);
    expect(r.code).toBe(1);
    expect(r.calls).toEqual([['preview']]);
    expect(r.logs.join('\n')).toContain('not guessing');
  });
});
