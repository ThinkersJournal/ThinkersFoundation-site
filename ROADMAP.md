# ThinkersFoundation roadmap

The lane's source of work. One row per item; the owner is who must act next. Facts are as of origin/main (0.1.20) on 2026-10-24; rows 5 to 13 come from the spec-to-roadmap audit of README, `docs/` and the RUNBOOK; re-check before relying on a row. Portfolio-level priorities live in `C:\Projects\PORTFOLIO-ROADMAP.md`.

## Open

| # | Item | Owner | Waiting on / next step |
|---|---|---|---|
| 1 | Board-of-directors page content | CireSnave | "Not found yet" is the long pole (decision 176 e). The lane writes the page once he names directors; nothing to draft before that. |
| 2 | Brand-domain redirects (decision 251 A, ruled 2026-10-22: "A for now and B when each project becomes ready"): `persistant.io` to the PersistAnt repo, `authant.net` to `authframework.dev` | PM, then CireSnave, then PM, then lane | NOT done. PM read 2026-10-24: the Cloudflare account holds exactly the three foundation zones; these two are not in it. Lane read the same day: public NS for both is still the registrar's `ns1.dyna-ns.net`/`ns2.dyna-ns.net`, apexes resolve to parking `185.53.179.149`, `http://<name>/x?y=1` is `410 Gone`. Order (RUNBOOK 3b): PM `--apply --only brand-zones` (Zone Edit token; prints each zone's nameserver pair) > CireSnave sets those pairs at the registrar > PM `--apply --only redirects-brands` > lane curl-verifies 301 on apex and `www`, path and query dropped. |
| 3 | authframework.dev site: `ciresnave/authframework-site` PR #1 (`docs/DESIGN.md`) | PM (review) | Site PRs wait on that review: Astro scaffold, four hosted CI jobs, claims test, names in `src/config.ts` (the product is being renamed AuthAnt). |
| 4 | Brand one-page sites (decision 251 B) | Lane, when the PM says each project is ready | "B when each project becomes ready" (PM reading: PersistAnt 1.0, AuthAnt after the rename). Not started. |
| 5 | Registrar hygiene on all three foundation domains (plan 1.4): transfer lock, auto-renew, 2FA, registrant email | CireSnave | DONE, ruled done by CireSnave 2026-10-28 for all domains (relayed by the PM; no read-back in the repo). |
| 6 | HSTS (`--only hsts`, opt-in, plan.mjs) | CireSnave, PM runs | DONE 2026-10-28. Ruled yes (CireSnave, first-hand, verbatim: "HSTS yes."); applied by the PM (one year, no includeSubDomains, no preload). Lane read-back by curl the same day: `Strict-Transport-Security: max-age=31536000` on thinkersfoundation.net, .us and thinkers.foundation. |
| 7 | Mail test (plan 2.4): send from another mailbox to `admin@` and a made-up name at each domain, keep headers | CireSnave | DONE 2026-10-28. CireSnave, first-hand, verbatim: "6 separate emails sent and received.  All worked." (An earlier batch was merged by Gmail and proved nothing per address; this one did.) SPF/DKIM/DMARC header results were NOT reported, so authentication is not recorded. |
| 8 | `.us` registrant data is public (CLOUDFLARE-PLAN, VERIFY-FINDINGS 6): which contact to publish | CireSnave | DONE 2026-10-28. Ruled by CireSnave, first-hand, verbatim: "Use my home address and phone for the .us contact.  I already registered the domain with that anyway." Recorded here only as: home contact, as registered by CireSnave (the address and phone are deliberately not in this public repo). |
| 9 | Lighthouse check (plan 1.8 said "Lighthouse and axe pass") | Lane | DONE 2026-10-25 (PM ruled "strike the claim"): plan 1.8 now says axe only; axe runs in CI (`tests/a11y.spec.ts`). A Lighthouse job would add a dev dependency and runner load; reopen only if CireSnave wants it. |
| 10 | Refresh `docs/VERIFY-FINDINGS.md`: row 3 (ACC name reservation fee, COULD-NOT-VERIFY) and row 7 (registrar DS field unchecked, though DNSSEC is now enabled) | Lane | PARTLY DONE 2026-10-25: row 7 closed (DS live for all three, DoH read); row 3 duration confirmed by ARS 10-3402(A). STILL OPEN: the nonprofit name-reservation fee (azcc.gov page 404s; not in any text read), needed only if a name is reserved. |
| 11 | Licence holder line: assign the work to the corporation and use its exact legal name (README, plan item 5.9) | Lane | HELD by incorporation: the entity does not exist yet. |
| 12 | Google Workspace for Nonprofits (VERIFY-FINDINGS 8) | CireSnave | HELD by IRS 501(c)(3) recognition; not before the IRS letter. Nothing to do now. |
| 13 | Canonical `/about` answers `307` to `/about/`, so a redirected visitor takes 301, 307, 200 (RUNBOOK 3, step 8) | Lane | CLOSED, WON'T DO (PM ruling 2026-10-25): the extra hop costs a few milliseconds on rarely hit non-canonical hostnames, and fixing it means a PM `--apply --only redirects`, which replaces each zone's whole redirect ruleset; not worth that risk. Reopen only if the hop is shown to matter. |
| 14 | `wrangler preview` error 100338 on Workers Builds: seen once, not reproduced | Lane (watch) | Build 5125a872 (2026-10-24, wrangler 4.152.0, PR #27) deploy command `npx wrangler preview` failed after ~2 s: `A request to the Cloudflare API (/accounts/<acct>/workers/workers/thinkersfoundation-site/previews) failed. A preview with name 'spec-roadmap-audit' already exists. [code: 100338]`, no line between the beta warning and the error. NOT reproduced by re-push: PR #28 was pushed twice and both builds passed. Suspected, unverified: two builds racing on one branch name. wrangler 4.141.0 and 4.152.0 both look the preview up and edit it when found (source read); the previews API is 403 to our tokens. If it recurs: script drafted in branch `deploy-preview-retry` (c633a36, delete-and-recreate once, 10 tests; PR #28 closed unmerged). No dashboard change wanted. Reported upstream (CireSnave OK'd 2026-10-25, filed by the PM): <https://github.com/cloudflare/workers-sdk/issues/16464>. |

## Standing rules for this repo

- Every pushed change bumps the version and adds a `CHANGELOG.md` entry; the PM confirms the number at the gate.
- Never rerun `email-rules --apply`. A rerun of `redirects` replaces each zone's whole redirect ruleset.
- No "501(c)(3)" or "tax-exempt" wording before IRS recognition (a site test pins it).
- Applying anything to Cloudflare is the PM's, with the vault token; the lane plans, reads back and verifies.
- The advisory CodeRipper `portfolio` job is not a required check; bumping its pin means moving the SHA in `ci-pr.yml` and retesting on the runner.

## Done (for orientation)

Plan 1.6 to 1.8 (Workers project, redirects, the site itself; Pages was superseded by Workers, board 234), mail rules and DNSSEC are done and are not rows above. Site, Workers deploy (board 234), mail and DNSSEC, the three foundation-zone redirects (PM run 2026-10-23; PM re-read 2026-10-24: all three zones `active`, `http://thinkers.foundation/x?y=1` answers 301 to `https://thinkersfoundation.net/x?y=1`, the lane's read-back is in the runbook),
self-hosted runner CI with four required checks, advisory CodeRipper job.
- Public repo and branch protection (PM, 2026-10-23). Read 2026-10-24: `gh repo view` says `PUBLIC`; `branches/main/protection` requires four checks (Tree-freshness guard, Type check (astro check), Playwright + axe, Build (astro build)), `enforce_admins` false, no required reviews.
