# Cloudflare runbook: three domains, one site, mail forwarded

Implements `PRE-FILING-PLAN.md` sections 1 and 2. **Nothing in this file has been run.** No call has been made to
Cloudflare or to any registrar. `plan.mjs` is the executable form of the API steps; run in its default mode it
prints every call and sends none.

**Do not run `--apply` or any command marked REAL until the PM says so.**

## 0. What is needed, and from whom

| Need | Who | Where it goes |
|---|---|---|
| Zones added, nameservers set (plan 1.1, 1.2) | CireSnave | dashboard and registrars. Not scriptable from here: the registrar logins are his |
| API token (plan 1.5) with the permissions in section 1 | CireSnave | the vault, entry `CLOUDFLARE_THINKERSFOUNDATION_API_TOKEN`, created with `--env CLOUDFLARE_API_TOKEN` (the name `plan.mjs` and wrangler read). Never a generic `CLOUDFLARE_API_TOKEN` entry: other projects have their own per-purpose entries |
| Account id | CireSnave or the dashboard | `CLOUDFLARE_ACCOUNT_ID` (not secret) |
| Forwarding mailbox | CireSnave | `FORWARD_TO`. Kept out of the repo on purpose; this repo is meant to go public |

The token is never put in a file, an argument, a commit or a chat. `plan.mjs` reads it from the environment only and
never prints it.

## 1. Token permissions

Names are as Cloudflare's API reference lists them; the dashboard wording differs slightly (Edit for Write). Scope the
token to **this account** and **these three zones** only.

| Step | Permission |
|---|---|
| `zones` (read the three zones) | Zone: Read |
| `dnssec` | Zone: DNS Write ("DNS Edit") |
| `email-destination` | Account: Email Routing Addresses Write |
| `email-enable` | Zone: Zone Settings Write (the `/email/routing/dns` enable call) |
| `email-rules` | Zone: Email Routing Rules Write |
| `dmarc`, `dns-pages` | Zone: DNS Write |
| `pages-domains`, and `wrangler pages` | Account: Cloudflare Pages Write ("Pages Edit") |
| `redirects` | Zone: Single Redirect Write ("Dynamic URL Redirects Write") |
| `hsts` (opt-in) | Zone: Zone Settings Write |

Zone creation (plan 1.1) needs Zone Edit, which this token should **not** carry: CireSnave adds the zones himself.

**Findings from checking these against the docs (2026-10-10, second-hand, see `docs/VERIFY-FINDINGS.md`):** the
permission names above come from the API reference pages, not from a token that was created and used. The first real
run is the test. If a step returns an authorization error, widen only that one permission and record which.

## 2. Order

### DNSSEC order (human steps at each registrar, before and after the script)

DNSSEC must be **off** at the registrar when the nameservers change and **on** again only after Cloudflare serves the
zone. Do these in order, per domain. Source: <https://developers.cloudflare.com/dns/dnssec/> ("Last updated Jun 24,
2026"), read 2026-10-16.

0. Check whether a DS record already exists: `dig DS <domain> @1.1.1.1` (not `nslookup`, which cannot query DS). A fresh
   domain usually has none (general knowledge, unverified here); if none, skip step 1.
1. If a DS exists: remove it at the registrar and wait at least its TTL (read it from the `dig` answer; Cloudflare says
   "commonly 24–48 hours for most TLDs"). Changing nameservers first makes validating resolvers return SERVFAIL.
2. Set the registrar's nameservers to the two Cloudflare ones (plan 1.2); wait for the old NS TTL ("typically one hour
   or less").
3. Wait until the zone reads **Active** (`--apply --only zones` below proves it).
4. Only then: `--apply --only dnssec` (table row 5) and add the DS record it prints at the registrar (plan 1.3). Domains
   at Cloudflare Registrar: the DS is automatic (CDS/CDNSKEY scanning, one to two days).
5. Verify with the `dig +dnssec` commands in section 5.

```
export CLOUDFLARE_ACCOUNT_ID=...          # from the dashboard
export FORWARD_TO=...                     # the destination mailbox

node ops/cloudflare/plan.mjs                      # PLAN: read what it will do. No network, no token.

# REAL commands: the token comes from the vault, one secret per command, never exported or typed.
# Every `--apply` below is wrapped the same way:
with-secret CLOUDFLARE_THINKERSFOUNDATION_API_TOKEN --reason "plan.mjs zones" -- \
  node ops/cloudflare/plan.mjs --apply --only zones   # read-only: proves the token sees 3 active zones
```

The vault entry is set once by CireSnave: `with-secret vault set CLOUDFLARE_THINKERSFOUNDATION_API_TOKEN --env
CLOUDFLARE_API_TOKEN --access read`, scoped to the three zones and this account only (section 1). The entry name is
per purpose; `--env` is what the process sees.

Then, step by step, reading each read-back before the next (the script stops on the first failure and says that later
steps did not run):

| # | Command (all REAL) | Plan item | Human work around it |
|---|---|---|---|
| 1 | `--apply --only email-destination` | 2.2 | CireSnave clicks the emailed verification link. Until he does, rules stay disabled |
| 2 | `--apply --only email-enable` | 2.1 | none |
| 3 | `--apply --only email-rules` | 2.3 | refuses to run until the destination is verified |
| 4 | `--apply --only dmarc` | 2.5 | see "SPF" below |
| 5 | `--apply --only dnssec` | 1.3 | **only once every zone reads Active** (DNSSEC order above, step 4); the script prints the DS record; CireSnave enters it at each registrar |
| 6 | Pages project, section 3 (P2 chosen) | 1.6 | CireSnave's dashboard click-through |
| 7 | `--apply --only dns-pages,pages-domains` (Pages only; a Workers project skips this, section 3W) | 1.6 | none |
| 8 | `--apply --only redirects` | 1.7 | none |
| 9 | optional: `--apply --only hsts` | n/a | the founder's call, after steps 1 to 8 are verified |

## 3. The Pages project (plan 1.6)

**Decided 2026-10-16 (board 226): P2, Git integration.** CireSnave chose it; the PM relayed the ruling. P1 (Direct Upload via
`wrangler pages project create`) is not used, and Direct Upload cannot be switched to Git integration later (Cloudflare Pages
docs, as read second-hand on 2026-10-10), so do not create the project any other way first.

**The dashboard click-through (CireSnave):** Workers & Pages, Create, Pages, Connect to Git, authorize the Cloudflare GitHub
app on the `ThinkersJournal` org (an org owner must approve the install; the repo is private, so grant the app access to
`ThinkersFoundation-site`), choose `ThinkersFoundation-site`, then:

| Field | Value |
|---|---|
| Project name | **`thinkersfoundation-site` exactly**: `plan.mjs` addresses the project by that name (`PROJECT`), and a different name makes `pages-domains` fail at its first GET |
| Production branch | `main` |
| Build command | `npm run build` |
| Build output directory | `dist` |
| Node version | from `.nvmrc` (Pages reads it; if the dashboard shows a `NODE_VERSION` field, leave it empty) |

After that, a merge to `main` deploys, as with ThinkersJournal.com. The API cannot create a Git-integrated project without
that interactive authorization (not confirmed from the docs; assumed). Steps 7 and 8 below are the same either way.

### Read-back checklist for steps 6 to 8

Predictions first, so a wrong shape is visible. Nothing here has run. Steps 7 and 8 are run by CireSnave in his shell, as
every `--apply` is; the lane reads what he pastes.

**Step 6, after the click-through (no token):**

- [ ] The first build is green in the dashboard (Deployments). Paste its last lines. A failure here is a build problem, not a DNS one.
- [ ] `curl -sI https://thinkersfoundation-site.pages.dev/` -> `HTTP/2 200` and a `content-security-policy` header with `script-src 'self'`.
  This proves the project and the build before any domain is attached.
- [ ] Project name in the dashboard reads `thinkersfoundation-site` (the table above).

**Step 7, `--apply --only dns-pages,pages-domains` (runs `zones` first):**

- [ ] `dns-pages`: for each of the 6 names (apex and `www` in 3 zones) a `GET .../dns_records?type=CNAME&name=...` -> `HTTP 200`, then
  either `POST ... -> HTTP 200, success=true` or `exists: CNAME <name> -> <content> (left alone)`.
  **Trap:** `ensureDns` looks only for a record of the *same type*. If a zone scan imported an `A`/`AAAA` at an apex or `www`, the
  `POST` of the CNAME is refused (a CNAME cannot share a name with another record), the run stops at `dns-pages`, and
  `pages-domains` did not run. Fix by reading the zone's records in the dashboard and deleting the stale one by hand; do not
  loosen the script.
- [ ] A rerun that finds `exists: CNAME ... -> <something other than thinkersfoundation-site.pages.dev>` is a finding: the script
  leaves it alone and says so.
- [ ] `pages-domains`: `GET .../pages/projects/thinkersfoundation-site` -> `HTTP 200`, three `POST .../domains` -> `HTTP 200`, then three
  lines `<zone>: status=...`. A status other than active right after the POST (certificate validation still pending) is
  expected and is not a failure; re-read the domain list later. **Not measured:** the exact status strings and whether a
  second `POST` of an attached domain errors. Do not rerun `pages-domains` to "check"; read the project's domains in the dashboard.
- [ ] After DNS settles, `curl -sI https://thinkersfoundation.net/` -> `HTTP/2 200` (section 5).

**Step 8, `--apply --only redirects`:**

- [ ] Per zone: `PUT .../rulesets/phases/http_request_dynamic_redirect/entrypoint -> HTTP 200, success=true`, then a `GET` -> `HTTP 200`.
  The rule JSON is untested against the live API (section 6), so a 4xx on the first `PUT` is a script finding, not a user error.
- [ ] Run the section 5 `for h in ...` loop: five lines each `HTTP/2 301` with `location: https://thinkersfoundation.net/about`.
- [ ] `curl -sI "https://thinkersfoundation.us/about?x=1"` -> `location: https://thinkersfoundation.net/about?x=1` (query preserved).

### 3W. If the project turns out to be a Workers project (DRAFT, not decided)

Why this exists: on PR #7 the check "Workers Builds: thinkersfoundation-site" failed, and its link points at
`dash.cloudflare.com/.../workers/services/view/thinkersfoundation-site/...`, which is the Workers product, not Pages. Section 3
and the `dns-pages`/`pages-domains` steps assume Pages. **CireSnave's answer is pending (his board item 234):** which product the
project is, and the build log. Until then this section is a draft and nothing in it has run.

| | Pages (section 3) | Workers static assets (this section) |
|---|---|---|
| Config | dashboard fields | `wrangler.jsonc` at the repo root (`assets.directory` `./dist`) |
| Domains and DNS | `plan.mjs --only dns-pages,pages-domains` | `routes` with `custom_domain: true` in `wrangler.jsonc`; Cloudflare creates the DNS records and certificates when `wrangler deploy` runs |
| Redirects, mail, DMARC, DNSSEC | unchanged | unchanged (`plan.mjs --only redirects` etc.) |

What the docs say (read 2026-10-18, developers.cloudflare.com/workers/static-assets and `.../routing/custom-domains`): a static site
needs only `assets.directory`; a Custom Domain attaches an apex or subdomain and "will create DNS records and issue necessary
certificates"; **an existing CNAME on the hostname blocks it.** The six apex and `www` names already hold proxied records
(DoH, 2026-10-17), whose types are not known, so before the first deploy CireSnave reads and deletes those placeholder records in
each zone's DNS page.

Steps if Workers is the answer: (1) merge the `wrangler.jsonc` PR, (2) delete the placeholder records, (3) the Workers build's
deploy command is `npx wrangler deploy`, (4) read the build log: expect `Uploaded ... assets` and the six custom domains, (5)
`--apply --only redirects`, (6) section 5.

Not known: whether a Pages-project build fails on a root `wrangler.jsonc` that carries `routes` (so merge it only after the
answer); whether `public/_headers` is honoured for Workers assets (the docs page read did not say; section 5's header check
decides); the `html_handling` default (the page read did not document it; `/about` must be curled).

## 4. SPF: do not add a second record

Plan item 2.5 says to publish a null SPF if nothing sends mail. Plan item 2.1 says enabling Email Routing adds the SPF
record itself. A domain may have **exactly one** SPF record; two make every receiver return `permerror`. So `plan.mjs`
publishes DMARC only. After step 2, read what Cloudflare added and tighten **that** record if it should be tightened:

```
nslookup -type=TXT thinkersfoundation.net 1.1.1.1
```

## 5. Verify (the PM's read-back; plan section 7 step 4)

None of these use the token. Predicted results are written first so a wrong shape is visible.

```
# nameservers are Cloudflare's (expect *.ns.cloudflare.com, per domain)
nslookup -type=NS thinkersfoundation.net 1.1.1.1
nslookup -type=NS thinkersfoundation.us 1.1.1.1
nslookup -type=NS thinkers.foundation 1.1.1.1

# the canonical serves (expect HTTP/2 200)
curl -sI https://thinkersfoundation.net/ | head -1

# every other hostname 301s to the canonical, path preserved
# (expect: HTTP/2 301 and  location: https://thinkersfoundation.net/about)
for h in thinkersfoundation.us www.thinkersfoundation.us thinkers.foundation www.thinkers.foundation www.thinkersfoundation.net; do
  echo "== $h"; curl -sI "https://$h/about" | grep -iE '^(HTTP|location)'
done

# the headers shipped from public/_headers (expect a content-security-policy with script-src 'self')
curl -sI https://thinkersfoundation.net/ | grep -iE 'content-security-policy|x-frame-options|strict-transport'

# mail: MX points at Cloudflare (expect route{1,2,3}.mx.cloudflare.net)
nslookup -type=MX thinkersfoundation.net 1.1.1.1

# DMARC (expect v=DMARC1; p=reject ...)
nslookup -type=TXT _dmarc.thinkersfoundation.net 1.1.1.1

# DNSSEC (expect an RRSIG and the ad flag once the DS is at the registrar)
# Windows nslookup has no DS type ("unknown query type: DS"); use dig, or DNS-over-HTTPS:
dig +dnssec DS thinkersfoundation.net @1.1.1.1
curl -s -H "accept: application/dns-json" "https://cloudflare-dns.com/dns-query?name=thinkersfoundation.net&type=DS&do=1"
```

A mail test is plan item 2.4 and is CireSnave's: from a different mailbox, send to `admin@` and to a made-up name at
**each** domain; both must arrive; keep the headers. A `200` on the site says nothing about mail, and the reverse.

## 6. Things this runbook knows it does not know

- **The redirect-rule JSON** (`from_value.target_url.expression` with `concat(...)`, `status_code: 301`,
  `preserve_query_string`) is assembled from the docs' API examples and the dashboard's described behaviour, not
  copied from one worked example. The first `redirects` run is a test; `GET` the entrypoint back and `curl` it.
- **Idempotency.** `dns` steps skip a record that already exists. `email-rules` does **not** skip existing rules; a
  second run creates duplicates. If a run stops half-way, delete the partial rules in the dashboard or read them back
  first.
- **`.us` and `.foundation` DS records.** Both TLDs are DNSSEC-signed (root DS present, AD=true, read 2026-10-10 via
  DNS-over-HTTPS; `com.` as positive control), so a DS at the registry is possible. Whether each *registrar* offers a DS
  field is still unconfirmed and is CireSnave's to see at step 1.3.
- **DNSSEC order.** The sequence in section 2 is Cloudflare's own migration procedure for a provider that cannot add
  DNSKEY records, read from its docs page 2026-10-16. Not read: Cloudflare's DNSSEC-states page. `plan.mjs --apply` always
  prepends the `zones` step, which stops the run when any zone is not `active`, so `--only dnssec` makes no PATCH on a
  pending zone. This is pinned by `tests/plan-dnssec.spec.ts` (a mock stands in for the API; with the check removed,
  four of its five tests fail). An earlier draft of this note said the opposite; it was wrong.
- **Pages is not necessarily Cloudflare's long-term product.** Their docs steer new projects at Workers static assets
  in places. If the PM prefers that, `wrangler deploy` with `[assets]` replaces section 3 and the DNS and redirect
  steps are unchanged.
