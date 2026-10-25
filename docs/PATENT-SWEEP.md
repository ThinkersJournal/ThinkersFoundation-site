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
- Google Patents pages fetched for US11669364 and US12126493 (bibliographic data only; see Limitations).

## Hits
| # | patent | title | assignee | status | claim(s) read | overlap | our difference | verdict |
|---|---|---|---|---|---|---|---|---|
| 1 | US11669364 (also US11973647) | Validation of execution plan for configuring an IT infrastructure | IBM (orig. HashiCorp) | Active, exp. ~2039 | none (summary only) | Summary describes validating a plan before applying it | Ours validates nothing before apply; the plan is a print for a human to read. The check is a read-back AFTER each call | needs-claims-read (see Limitations); summary suggests clear |
| 2 | US12126493 | Network management apparatus, method and system | Rakuten Mobile | Active, exp. ~2041 | none (snippet only) | Dry-run, then production run of a script | Ours does not verify dry-run input parameters; read-back follows each real call | needs-claims-read; snippet suggests clear |
| 3 | US10419311 | Template-based declarative and composable configuration of network functions | not recorded | not recorded | none | Dry-run mode lists configuration objects without pushing | Different domain (network devices, templates) | not assessed beyond title and snippet |
| 4 | US12632306 | Infrastructure provisioning run pipelines | not recorded | not recorded | none | Plan-only runs vs plan-then-apply | Ours is a single script, not a pipeline service | not assessed beyond snippet |

Idea 2 and idea 3: no patent hit found. Q2 returned only open-source tools (git-barber, github-loppers, gitsweeper) using related squash-merge detection; prior art for the idea, not patents. Q3 returned vendor documentation only. Absence of a hit is weak: the search tool is not a patent database, and no positive control was run against it with a known patent for these topics (Q1 did return patents, so the tool can surface them).

## Needs review (to the PM)
No overlap found that needs CireSnave. But hits 1 and 2 have NOT been cleared claim by claim, so the process's `clear` verdict is not earned; they are recorded as claims-not-read.

## Limitations
- AI-assisted search with a general web-search tool, not Google Patents / USPTO / Espacenet queries run directly. Coverage is unknown.
- Claim text was not read for any hit: the Google Patents fetch returned truncated pages without the claims section. Overlap statements rest on summaries and search snippets. Hits 3 and 4 were not opened at all.
- Candidate ideas are conventional engineering practice (dry-run/apply, read-back, tree comparison). Nothing here is claimed as ours to patent; the sweep asks only whether we plainly overlap someone else.
- Retroactive: the site was live before this record existed.
- Not legal advice; a lawyer's freedom-to-operate review is a separate purchase.
