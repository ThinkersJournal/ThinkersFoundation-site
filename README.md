# Thinker's Foundation: website

The public page for Thinker's Foundation, which is **being formed and does not yet exist as a legal entity**. It is a
static [Astro](https://astro.build) site, meant for Cloudflare Workers (static assets), under three hostnames that all land on one
canonical: `thinkersfoundation.net` (canonical), `thinkersfoundation.us` and `thinkers.foundation` (301 to it).

Built to the same shape as [ThinkersJournal.com](https://github.com/ThinkersJournal/ThinkersJournal.com): same fonts and
tokens, same four CI gates, same zero-JS discipline, but smaller.

## Pages

`/` (status and what it will support), `/about`, `/contact`, `/privacy`, and a 404.

## The rules the site is built to (PRE-FILING-PLAN.md section 3)

- It may say only true things. The status line is one constant, `STATUS` in `src/consts.ts`.
- It must not say or imply a tax-exempt or charitable status, and must not ask for money, until the IRS has recognised
  the organization. `tests/claims.spec.ts` reads the **built** HTML and fails on those words, with a positive control.
- No analytics, no cookies, no third-party scripts or hosts. `tests/site.spec.ts` and `tests/claims.spec.ts` pin that;
  `tests/security.spec.ts` pins that the enforced CSP in `public/_headers` needs no `'unsafe-inline'`.
- No postal address is published until one is chosen (`MAILING_ADDRESS`), and no board member until they agree
  (`BOARD`).

## Develop

```
npm ci
npm run dev       # astro dev
npm run build     # astro build -> dist/
npm run check     # astro check
npx playwright install chromium
npm test          # freshness guard, then Playwright + axe against the built site
```

## CI

Four required checks, one job each, named as in ThinkersJournal.com so branch protection can require them by name:
`Tree-freshness guard`, `Type check (astro check)`, `Build (astro build)`, `Playwright + axe`.

The jobs run on the self-hosted Windows runner, because hosted Actions on a private repo fail on the account's billing.
They run on push to `main`, manual dispatch, and pull requests from this repo only (never a fork). See the header of
`.github/workflows/ci-pr.yml` (pull requests) and `ci-main.yml` (push, dispatch); keep their jobs identical.

## Operations

`ops/cloudflare/` holds the Cloudflare side of the plan: `RUNBOOK.md` and `plan.mjs`. **Nothing there has been
run.** `plan.mjs` prints what it would do and sends nothing unless given `--apply`. No secret lives in this repo.
`docs/VERIFY-FINDINGS.md` records what was found when the plan's unverified items were checked.

## Licence

Code: MIT OR Apache-2.0 (see `LICENSE.md`). The copyright holder line names "Thinker's Foundation" as a placeholder;
`PRE-FILING-PLAN.md` item 5.9 says to assign the work to the corporation once it exists and then update it to the exact
legal name.
