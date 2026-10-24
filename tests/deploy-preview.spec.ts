import { test, expect } from '@playwright/test';
import { spawnSync } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
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

// The script drives a real, logged-in wrangler. These run it with PATH pointing at an empty directory, so
// even a bug cannot reach wrangler: anything that tries to spawn `npx` fails with a non-zero exit.
test.describe('deploy-preview.mjs never deploys on --help, a typo, or import', () => {
  const emptyBin = mkdtempSync(join(tmpdir(), 'no-npx-'));
  const run = (args: string[]) =>
    spawnSync(process.execPath, [resolve('scripts/deploy-preview.mjs'), ...args], {
      encoding: 'utf8',
      env: { ...process.env, PATH: emptyBin, Path: emptyBin },
    });

  test('control: with that PATH, a real spawn of npx fails', async () => {
    const { npxRunner } = await import(SCRIPT);
    const saved = { PATH: process.env.PATH, Path: process.env.Path };
    process.env.PATH = emptyBin;
    process.env.Path = emptyBin;
    try {
      expect(npxRunner(['--version']).status).not.toBe(0);
    } finally {
      if (saved.PATH !== undefined) process.env.PATH = saved.PATH;
      if (saved.Path !== undefined) process.env.Path = saved.Path;
    }
  });

  test('--help prints usage and exits 0 without spawning', () => {
    const r = run(['--help']);
    expect(r.status, r.stderr).toBe(0);
    expect(r.stdout).toContain('usage: npm run deploy:preview');
  });

  test('an unknown argument exits 2 without spawning', () => {
    const r = run(['--hlep']);
    expect(r.status).toBe(2);
    expect(r.stderr).toContain('unknown argument');
  });

  test('importing the module runs nothing', async () => {
    const m = await import(SCRIPT);
    expect(typeof m.deployPreview).toBe('function');
    expect(m.parseArgs([])).toEqual({ action: 'deploy' });
  });
});
