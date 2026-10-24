#!/usr/bin/env node
// Deploy command for Workers Builds NON-PRODUCTION (branch) builds: `npm run deploy:preview`.
//
// Why this exists: build 5125a872 (2026-10-24, wrangler 4.152.0) ran `npx wrangler preview` for a branch
// that had already been previewed and failed with
//   A preview with name 'spec-roadmap-audit' already exists. [code: 100338]
// wrangler's own source looks the preview up first and edits it when found (so a re-push should work), but
// the lookup missed it there. The previews API is beta and we cannot read it (HTTP 403 on both our
// tokens), so the cause is unconfirmed. This is the workaround: on exactly that error, delete the named
// preview and create it again, once. Any other failure is passed through untouched.
//
// The name to delete is read from the error text, so it is the name wrangler itself tried to create.
// Production (`npx wrangler deploy`, a merge to main) does not go through this script.

import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

const ALREADY_EXISTS = /\[code: 100338\]/;
const NAME_IN_ERROR = /A preview with name '([^']+)' already exists/;

// Real runner: echoes the child's output (so the build log is complete) and also returns it.
export function npxRunner(args) {
  const r = spawnSync('npx', ['wrangler', ...args], {
    encoding: 'utf8',
    shell: process.platform === 'win32',
  });
  if (r.stdout) process.stdout.write(r.stdout);
  if (r.stderr) process.stderr.write(r.stderr);
  return { status: r.status ?? 1, output: `${r.stdout ?? ''}\n${r.stderr ?? ''}` };
}

// run(args) -> { status, output }. Returns the exit code the build should use.
export function deployPreview(run, log = console.log) {
  const first = run(['preview']);
  if (first.status === 0) return 0;
  if (!ALREADY_EXISTS.test(first.output)) return first.status;

  const name = NAME_IN_ERROR.exec(first.output)?.[1];
  if (!name) {
    log('deploy-preview: error 100338 without a preview name in the message; not guessing which preview to delete.');
    return first.status;
  }
  log(`deploy-preview: preview '${name}' already exists (100338); deleting it and creating it again, once.`);
  const del = run(['preview', 'delete', '--name', name, '-y']);
  if (del.status !== 0) {
    log(`deploy-preview: delete failed (exit ${del.status}); not retrying.`);
    return del.status;
  }
  return run(['preview']).status;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  process.exit(deployPreview(npxRunner));
}
