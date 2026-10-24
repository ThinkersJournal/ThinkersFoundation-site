# Changelog

Versions follow the portfolio rule: every pushed change bumps the version; pre-1.0 the second number is the
breaking-change number.

## 0.1.15 - 2026-10-24

CI only; number provisional until the PM confirms at the gate.

- `.github/workflows/ci-pr.yml`: the advisory `portfolio` job is repinned from `789b0122` to `30e012b7` (PM request). Still advisory, not a required check.

## 0.1.14 - 2026-10-24

Dependency only; number provisional until the PM confirms at the gate.

- `package-lock.json`: zod 4.6.5 -> 4.6.7 (Dependabot #17, lockfile only; redone here so the version and changelog move with it).

## 0.1.13 - 2026-10-23

CI only; number provisional until the PM confirms at the gate.

- `.github/workflows/ci-pr.yml`: the advisory `portfolio` job is repinned from `c665210a` to `789b0122` (coderipper#125: Git Bash on Windows self-hosted runners, empty `RUSTC_WRAPPER`, default-branch guard). Retested at `8567004f` and `61ae0fbc` on this runner (runs 40008610765, 40010422512): the job passes and CodeRipper reports no issues. Still advisory, not a required check.

## 0.1.12 - 2026-10-23

CI only; number provisional until the PM confirms at the gate. CireSnave 2026-10-23: "Roll out advisory-only, non-blocking CodeRipper checks everywhere."

- `.github/workflows/ci-pr.yml`: new job `portfolio` ("Portfolio checks (advisory)") calling `ciresnave/coderipper` `portfolio.yml` at `c665210a`, `runs-on: self-hosted`. Pull requests only; NOT a required check, so branch protection is unchanged. Its Rust-only rules report "no Rust crate at this path" here. Unmeasured: the first run installs coderipper with `cargo install` on the Windows runner.

## 0.1.11 - 2026-10-23

Docs only (number provisional until the PM confirms at the gate).

- `ops/cloudflare/RUNBOOK.md`: step 8 (`--only redirects`) recorded as run 2026-10-23 with its curl read-back; the "rule JSON untested" caveat and the `html_handling` and `_headers` unknowns are resolved (`/about` 307s to `/about/`; `_headers` is honoured).

## 0.1.10 - 2026-10-23

Ops tooling. Number is provisional until the PM confirms at the gate. Decision 251 A (CireSnave: "A for now and B when each project becomes ready").

- `ops/cloudflare/plan.mjs`: new opt-in step `redirects-brands`: `persistant.io` -> `https://github.com/ciresnave/PersistAnt`, `authant.net` -> `https://authframework.dev`; apex and `www`, 301, path and query not carried. Adds proxied placeholder A records (192.0.2.1) where no A record exists, so the rule can fire. Plan mode only so far; unrun against the live API. `tests/plan-steps.spec.ts` pins it.
- `ops/cloudflare/RUNBOOK.md`: section 3b, CireSnave's steps and the read-back.

## 0.1.9 - 2026-10-22

CI only; no change to the site or to `ops/`.

- `.github/workflows/ci.yml` is split into `ci-pr.yml` (pull_request only; every job `if: head.repo.full_name == github.repository`)
  and `ci-main.yml` (push to main, workflow_dispatch; no `if`). All eight jobs `runs-on: [self-hosted, windows]` (hosted jobs die
  on billing for this private repo). Job names are unchanged, so the required checks keep their names. Duplicated, not a reusable
  workflow: the lint rejects `workflow_call`.
- Playwright job: the Linux-only browser cache and `--with-deps` steps are replaced by `npx playwright install chromium`.
- Measured 2026-10-23 on the `self-hosted, windows` runner (PR #11, run 39957809088): all four required jobs passed (astro build 2m22s, Playwright + axe 1m37s, freshness guard 1m9s, astro check 53s). The Windows unknowns (Chromium install, `setup-node`, `npm ci`/`astro build`, freshness git fixtures) all passed.
- `runner-lint --private` (agentlife origin/main, v0.16.8): 0 findings on both files; the earlier single-file `||` form and a PR job with no `if` each give 4 findings.

## 0.1.8 - 2026-10-21

Ops tooling and docs. CireSnave ruled Workers (board 234: "234: Workers"). Number is provisional until the PM confirms at the gate.

- `wrangler.jsonc` (new): Workers static-assets config for `./dist`, `"previews": {}` (non-production builds run `npx wrangler preview`, which errors without it) and Custom Domains for the six hostnames. Unrun.
- `ops/cloudflare/plan.mjs`: the Pages-only steps `dns-pages` and `pages-domains` are removed. `tests/plan-steps.spec.ts` pins that they are gone and that `--only` rejects them.
- `ops/cloudflare/RUNBOOK.md`: section 3 is now the Workers project; the nine placeholder DNS records (apex, `www` and `*` in each zone; PM correction 2026-10-22, was six) must be deleted before the merge that deploys the custom domains.
- `src/consts.ts`: `MAILING_ADDRESS` set to CireSnave's chosen public address (PRE-FILING-PLAN.md section 0 item 3; confirmed by him directly 2026-10-22). `/contact` renders it; `tests/site.spec.ts` pins it and asserts no "501(c)(3)"/"tax-exempt" wording on any route.
- `ops/cloudflare/plan.mjs`: new opt-in read-only step `dns-preflight` fails while any A/AAAA/CNAME remains on the apex, `www` or `*` of a zone. It never deletes and does not look at MX/TXT/DS. Unrun against the live API.

## 0.1.5 - 2026-10-16

Docs plus one printed string in `ops/cloudflare/plan.mjs` (the `pages-domains` plan line); no behaviour change.

- `ops/cloudflare/RUNBOOK.md` section 3: Pages option P2 (Git integration) is decided (board 226, CireSnave); P1 removed. Adds the
  dashboard field table (project name must be exactly `thinkersfoundation-site`) and a predicted read-back checklist for steps 6 to 8,
  including the A/AAAA-versus-CNAME trap in `dns-pages`. Nothing in it has run.

## 0.1.4 - 2026-10-16

`ops/cloudflare/plan.mjs`: `email-rules` now asserts the catch-all after its PUT.

- The named-rule listing does not include the catch-all, and the old read-back printed its GET without checking it, so a catch-all
  that never took effect passed silently (a made-up address at one domain bounced, 2026-10-16). The step now fails unless the
  catch-all is enabled, matches all, and forwards to `FORWARD_TO`, per zone.
- `tests/plan-catchall.spec.ts` plus a stateful email mock: a zone whose PUT is skipped must fail the run (control: all stored passes).
- Do not rerun `email-rules --apply` to check: it duplicates named rules. Read the catch-all in the dashboard or GET it.

## 0.1.3 - 2026-10-16

Docs only; no change to `ops/cloudflare/plan.mjs`.

- `ops/cloudflare/RUNBOOK.md`, `docs/CLOUDFLARE-PLAN.md` row 1.5: the token is vault entry
  `CLOUDFLARE_THINKERSFOUNDATION_API_TOKEN` with `--env CLOUDFLARE_API_TOKEN`; real commands run through
  `with-secret`, one secret per command; never a generic `CLOUDFLARE_API_TOKEN` entry.
- `docs/CLOUDFLARE-PLAN.md`: header carries the copy date (2026-10-16).

## 0.1.2 - 2026-10-16

Docs and one test; no change to `ops/cloudflare/plan.mjs`.

- `ops/cloudflare/RUNBOOK.md`: the DNSSEC order of operations (check for an existing DS, remove it and wait its TTL,
  change nameservers, wait for Active, then enable DNSSEC in Cloudflare and add the DS), replacing the unordered
  "enable DNSSEC at the registrar" wording. Source: Cloudflare's DNSSEC docs page.
- `docs/CLOUDFLARE-PLAN.md`: a tracked copy of section 1 of the private pre-filing plan, with the same ordered rows.
- `tests/plan-dnssec.spec.ts`: pins that `plan.mjs --apply --only dnssec` refuses a zone that is not Active and makes
  no DNSSEC PATCH (runs `plan.mjs` unmodified against a stand-in for the API, `tests/helpers/`).
- `docs/VERIFY-FINDINGS.md` row 7: points at that order.

## 0.1.1 - 2026-10-11

Covers PRs #1 and #2 (which shipped without a bump) and this change.

- Initial site, CI gates and Cloudflare runbook (#1).
- DS check result for `.us` and `.foundation`; fix the Windows DS command (#2).
- CI: every `uses:` pinned to a full commit SHA (checkout v7.0.1, setup-node v7.1.0, cache v6.1.0,
  upload-artifact v7.0.2), replacing mutable `@v4` refs.
- Add `.github/CODEOWNERS`.
- `docs/VERIFY-FINDINGS.md`: the deliberate 404 citation is plain text with a note, not a link.
