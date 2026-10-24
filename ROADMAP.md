# ThinkersFoundation roadmap

The lane's source of work. One row per item; the owner is who must act next. Facts are as of origin/main (0.1.15) on 2026-10-24; re-check before relying on a row. Portfolio-level priorities live in `C:\Projects\PORTFOLIO-ROADMAP.md`.

## Open

| # | Item | Owner | Waiting on / next step |
|---|---|---|---|
| 1 | Board-of-directors page content | CireSnave | "Not found yet" is the long pole (decision 176 e). The lane writes the page once he names directors; nothing to draft before that. |
| 2 | Brand-domain redirects (decision 251 A, ruled 2026-10-22: "A for now and B when each project becomes ready"): `persistant.io` to the PersistAnt repo, `authant.net` to `authframework.dev` | PM, then CireSnave, then PM, then lane | NOT done. PM read 2026-10-24: the Cloudflare account holds exactly the three foundation zones; these two are not in it. Lane read the same day: public NS for both is still the registrar's `ns1.dyna-ns.net`/`ns2.dyna-ns.net`, apexes resolve to parking `185.53.179.149`, `http://<name>/x?y=1` is `410 Gone`. Order (RUNBOOK 3b): PM `--apply --only brand-zones` (Zone Edit token; prints each zone's nameserver pair) > CireSnave sets those pairs at the registrar > PM `--apply --only redirects-brands` > lane curl-verifies 301 on apex and `www`, path and query dropped. |
| 3 | authframework.dev site: `ciresnave/authframework-site` PR #1 (`docs/DESIGN.md`) | PM (review) | Site PRs wait on that review: Astro scaffold, four hosted CI jobs, claims test, names in `src/config.ts` (the product is being renamed AuthAnt). |
| 4 | Brand one-page sites (decision 251 B) | Lane, when the PM says each project is ready | "B when each project becomes ready" (PM reading: PersistAnt 1.0, AuthAnt after the rename). Not started. |

## Standing rules for this repo

- Every pushed change bumps the version and adds a `CHANGELOG.md` entry; the PM confirms the number at the gate.
- Never rerun `email-rules --apply`. A rerun of `redirects` replaces each zone's whole redirect ruleset.
- No "501(c)(3)" or "tax-exempt" wording before IRS recognition (a site test pins it).
- Applying anything to Cloudflare is the PM's, with the vault token; the lane plans, reads back and verifies.
- The advisory CodeRipper `portfolio` job is not a required check; bumping its pin means moving the SHA in `ci-pr.yml` and retesting on the runner.

## Done (for orientation)

Site, Workers deploy (board 234), mail and DNSSEC, the three foundation-zone redirects (PM run 2026-10-23; PM re-read 2026-10-24: all three zones `active`, `http://thinkers.foundation/x?y=1` answers 301 to `https://thinkersfoundation.net/x?y=1`, the lane's read-back is in the runbook),
self-hosted runner CI with four required checks, advisory CodeRipper job.
- Public repo and branch protection (PM, 2026-10-23). Read 2026-10-24: `gh repo view` says `PUBLIC`; `branches/main/protection` requires four checks (Tree-freshness guard, Type check (astro check), Playwright + axe, Build (astro build)), `enforce_admins` false, no required reviews.
