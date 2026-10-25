# Patent sweep: ThinkersFoundation-site 0.1.25 @ cfa3b2c
Date: 2026-10-25; Run by: ThinkersFoundation lane, Claude Sonnet 5.5; Method: AI-assisted web search and read; NOT legal advice; NOT a freedom-to-operate opinion.

Standing instruction: PATENT-SWEEP-PROCESS.md (CireSnave, board 286 item 1). The site was already live, so this sweep is retroactive. Covers the 0.1.x line.

## What was looked at
The whole tracked tree: `src/` (static Astro pages, layouts, CSS tokens), `public/`, `tests/`, `.github/workflows/`, `ops/cloudflare/plan.mjs`, `scripts/check-tree-freshness.mjs`, `wrangler.jsonc`. The site pages are ordinary static content and are not mechanisms. Only the three items below were treated as candidate ideas.

## Ideas swept
1. A provisioning script that prints every API call in a default PLAN mode (no token, no network), makes calls only under `--apply`, and ends each step by reading back the property it just set, printing the readback beside the request (`ops/cloudflare/plan.mjs`).
2. A freshness guard that decides whether a checked-out branch misrepresents the mainline: on `main`, behind `origin/main` is a defect; on a branch, the "behind" exemption holds only if a tree comparison (`merge-tree` against `origin/main^{tree}`) shows the branch still contributes something, which survives squash merges (`scripts/check-tree-freshness.mjs`).
3. A set of role mailboxes plus a catch-all forwarding rule, and whole-zone redirect rulesets, configured through the Cloudflare API (`ops/cloudflare/plan.mjs`). This uses Cloudflare's own Email Routing and Rulesets features; the idea is configuration, not a new mechanism.

## Queries (source, query, date)
All 2026-10-25, via a general web-search tool restricted to US results (not a direct patent-office query interface).
- Q1: `patent "dry-run" plan then apply infrastructure configuration read-back verification of each change claim` (ideas 1)
- Q2: `patent detecting stale local branch behind remote squash merge tree comparison no net change version control` (idea 2)
- Q3: `patent email routing role-based addresses catch-all forwarding domain redirect provisioning DNS zone automated` (idea 3)
- Claims: `python tools/patent-claims.py US11669364 US12126493 US10419311 US12632306`, 2026-10-25.

## Hits
Claims read in full with `tools/patent-claims.py` (all independent claims, 2026-10-25).
| # | patent | title | assignee | status | claim(s) read | overlap | our difference | verdict |
|---|---|---|---|---|---|---|---|---|
| 1 | US11669364 (family: US11973647) | Validation of execution plan for configuring an IT infrastructure | IBM (orig. HashiCorp) | Active, exp. ~2039 | 1, 15, 29 (all independent) | Plan, validate, then apply | Every independent claim requires a validation engine that checks syntactic and semantic validity of the configurations, then a policy check, then a running-cost-versus-quota check, before applying. `plan.mjs` does none of the three; its plan mode only prints the calls | clear: no validation engine, policy check or cost-quota check |
| 2 | US12126493 | Network management apparatus, method and system | Rakuten Mobile | Active, exp. ~2041 | 1, 8, 9 (all independent) | Dry-run mode that skips configuration-changing steps (dependent claim 6 names DNS changes) | Every independent claim requires that the skipped steps are "determined according to a corresponding decision strength included in the script". `plan.mjs` skips every call in plan mode, with no per-step strength in the script. Also claims a network-operations script and run-mode inputs | clear: no per-step decision strength. Closest hit; a narrower reading by a court is not assessed here |
| 3 | US10419311 | Template-based declarative and composable configuration of network functions | Citrix | not recorded | 1, 11 (all independent) | Dry-run listing was only the snippet; the claims are about templates | Claims require a declarative template with a configuration declaration and a monitor declaration, instantiated, then monitors established. We have no templates or monitors | clear: different subject |
| 4 | US12632306 | Infrastructure provisioning run pipelines | Scalr | not recorded | 1, 5 (all independent) | Plan step then apply step | Claims require a run pipeline linking three external applications, each conditioning one step. We run a single script with no external applications | clear: no external-application pipeline |

Idea 2 and idea 3: no patent hit found. Q2 returned only open-source tools (git-barber, github-loppers, gitsweeper) using related squash-merge detection; prior art for the idea, not patents. Q3 returned vendor documentation only. Absence of a hit is weak: the search tool is not a patent database, and no positive control was run against it with a known patent for these topics (Q1 did return patents, so the tool can surface them).

## Needs review (to the PM)
None. Hit 2 (Rakuten) is the closest; it is clear on the "decision strength" element, which every independent claim requires.

## Limitations
- AI-assisted search with a general web-search tool, not Google Patents / USPTO / Espacenet queries run directly. Coverage is unknown; only four patents surfaced, all for idea 1.
- Ideas 2 and 3 produced no patent hits, which is weak evidence: no positive control was run for those topics.
- Claims were read for the four hits only; assignee, status and expiry for hits 3 and 4 were taken from the claims tool or not recorded. Equivalents are not analysed.
- Candidate ideas are conventional engineering practice (dry-run/apply, read-back, tree comparison). Nothing here is claimed as ours to patent; the sweep asks only whether we plainly overlap someone else.
- Retroactive: the site was live before this record existed.
- Not legal advice; a lawyer's freedom-to-operate review is a separate purchase.
