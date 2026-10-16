# Changelog

Versions follow the portfolio rule: every pushed change bumps the version; pre-1.0 the second number is the
breaking-change number.

## 0.1.6 - 2026-10-16

CI only; no change to the site or to `ops/`. DRAFT: do not merge until a runner is registered, or every job queues forever.

- `.github/workflows/ci.yml` is split into `ci-pr.yml` (pull_request only; every job `if: head.repo.full_name == github.repository`)
  and `ci-main.yml` (push to main, workflow_dispatch; no `if`). All eight jobs `runs-on: [self-hosted, windows]` (hosted jobs die
  on billing for this private repo). Job names are unchanged, so the required checks keep their names. Duplicated, not a reusable
  workflow: the lint rejects `workflow_call`.
- Playwright job: the Linux-only browser cache and `--with-deps` steps are replaced by `npx playwright install chromium`.
- Not measured: nothing has run on `gh-runner`. Unknown until it does: Playwright browser install under that account, Node via
  `setup-node`, `npm ci` and `astro build` on Windows, and the freshness spec's git fixtures on Windows.
- `runner-lint --private` (agentlife origin/main, v0.16.8): 0 findings on both files; the earlier single-file `||` form and a PR job with no `if` each give 4 findings.

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
