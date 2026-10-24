# ThinkersFoundation roadmap

The lane's source of work. One row per item; the owner is who must act next. Facts are as of origin/main 671c3eaf
(0.1.15) on 2026-10-24; re-check before relying on a row. Portfolio-level priorities live in `C:\Projects\PORTFOLIO-ROADMAP.md`.

## Open

| # | Item | Owner | Waiting on / next step |
|---|---|---|---|
| 1 | Board-of-directors page content | CireSnave | "Not found yet" is the long pole (decision 176 e). The lane writes the page once he names directors; nothing to draft before that. |
| 2 | Brand-domain redirects: `persistant.io` to the PersistAnt repo, `authant.net` to `authframework.dev` (decision 251 A) | CireSnave, then PM, then lane | CireSnave adds both zones in Cloudflare and sets the nameservers at the registrar (`ops/cloudflare/RUNBOOK.md` 3b). The PM runs `--apply --only redirects-brands`. The lane curl-verifies: 301 on the apex and `www`, path and query dropped. |
| 3 | Make this repo public, then set branch protection | CireSnave (the yes), PM (protection) | CireSnave said the site may go public (decision 176 d); the PM waits on his first-hand yes before flipping it. |
| 4 | authframework.dev site: `ciresnave/authframework-site` PR #1 (`docs/DESIGN.md`) | PM (review) | Site PRs wait on that review: Astro scaffold, four hosted CI jobs, claims test, names in `src/config.ts` (the product is being renamed AuthAnt). |
| 5 | Brand one-page sites (decision 251 B) | CireSnave | "B when each project becomes ready"; not started. |

## Standing rules for this repo

- Every pushed change bumps the version and adds a `CHANGELOG.md` entry; the PM confirms the number at the gate.
- Never rerun `email-rules --apply`. A rerun of `redirects` replaces each zone's whole redirect ruleset.
- No "501(c)(3)" or "tax-exempt" wording before IRS recognition (a site test pins it).
- Applying anything to Cloudflare is the PM's, with the vault token; the lane plans, reads back and verifies.
- The advisory CodeRipper `portfolio` job is not a required check; bumping its pin means moving the SHA in `ci-pr.yml` and retesting on the runner.

## Done (for orientation)

Site, Workers deploy (board 234), mail and DNSSEC, the three-zone redirects (run 2026-10-23, read back in the runbook),
self-hosted runner CI with four required checks, advisory CodeRipper job.
