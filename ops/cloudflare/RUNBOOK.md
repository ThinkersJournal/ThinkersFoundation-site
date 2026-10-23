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
| `dmarc` | Zone: DNS Write |
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
| 6 | Workers project, section 3 (Workers chosen) | 1.6 | CireSnave deletes the nine placeholder DNS records first, then the merge deploys |
| 7 | (none: was `dns-pages,pages-domains`, Pages only) | 1.6 | none |
| 8 | `--apply --only redirects` | 1.7 | none |
| 9 | optional: `--apply --only hsts` | n/a | the founder's call, after steps 1 to 8 are verified |

## 3. The Workers project (plan 1.6)

**Decided 2026-10-21 (board 234): Workers.** CireSnave's ruling, relayed by the PM, verbatim: "234: Workers". The project
`thinkersfoundation-site` is a Cloudflare Workers project (its dashboard URL is `workers/services/view/...`, and the check
"Workers Builds: thinkersfoundation-site" comes from it). This supersedes the 2026-10-16 Pages choice (P2, board 226). The
`dns-pages` and `pages-domains` steps are gone from `plan.mjs`: the `/pages/projects` API does not see a Workers project, and
Custom Domains create their own DNS records.

| | Where it lives |
|---|---|
| Config | `wrangler.jsonc` at the repo root: `assets.directory` `./dist`, `previews`, `routes` |
| Production deploy | Workers Builds on a merge to `main`: build `npm run build`, deploy `npx wrangler deploy` |
| Non-production (PR) builds | `npx wrangler preview`, which errors without `"previews": {}` in `wrangler.jsonc` (read from the PR #9 build log, relayed by the PM 2026-10-21) |
| Domains and DNS | `routes` with `custom_domain: true`; Cloudflare creates the DNS records and certificates when `wrangler deploy` runs |
| Redirects, mail, DMARC, DNSSEC | `plan.mjs` (`redirects`, `dmarc`, ...), unchanged |

What the docs say (read 2026-10-18, developers.cloudflare.com/workers/static-assets and `.../routing/custom-domains`): a static
site needs only `assets.directory`; a Custom Domain attaches an apex or subdomain and "will create DNS records and issue
necessary certificates"; **an existing CNAME on the hostname blocks it.**

**Before the first production deploy (CireSnave, dashboard): delete the nine placeholder proxied DNS records** (apex, `www` and the
wildcard `*` in each of the three zones; all point at 185.53.179.128 and resolve to Cloudflare proxy IPs; a random subdomain resolves
in all three zones, DoH probe 2026-10-22; the wildcard count is from PM's relay of CireSnave's screenshot of thinkers.foundation, the other two zones are inferred from the DoH probe). **Do not merge the PR that carries `routes` before they are gone**: the merge triggers
the production deploy, which tries to attach the six custom domains. Delete only those nine names; **leave every MX, TXT and DS
record, and any CNAME not on those three names, alone.** Then check: `node ops/cloudflare/plan.mjs --apply --only zones,dns-preflight` (read-only; CireSnave runs it, the
lane reads the paste) must end with no "STOPPED", and a DoH query for the apex, `www` and a random subdomain of each zone must return no A.

### Read-back checklist for steps 6 to 8

Predictions first, so a wrong shape is visible. Nothing here has run. Step 8 is run by CireSnave in his shell, as every
`--apply` is; the lane reads what he pastes.

**Step 6, the deploy (no token):**

- [ ] The placeholder records are deleted (see above); his paste of each zone's DNS page shows none of the nine names.
- [ ] The Workers Build for the merge is green. Paste its last lines: expect `Uploaded ... assets` and the six custom domains.
  A failure here is a build or config problem, not DNS.
- [ ] `curl -sI https://thinkersfoundation.net/` -> `HTTP/2 200` and a `content-security-policy` header with `script-src 'self'`.
- [ ] After DNS settles, the other five names answer from Cloudflare (a `301` only once step 8 has run; before it, `200`).

**Step 7:** none (it was `dns-pages,pages-domains`, Pages only).

**Step 8, `--apply --only redirects`:**

- [ ] Per zone: `PUT .../rulesets/phases/http_request_dynamic_redirect/entrypoint -> HTTP 200, success=true`, then a `GET` -> `HTTP 200`.
  **Run 2026-10-23 (PM, `--apply --only redirects`): `PUT` and `GET` HTTP 200 on all three zones.** The rule JSON is now proven against the live API.
  Read-back by `curl` (lane, 2026-10-23, `/about?x=1`): the five non-canonical names each answer `301` with `Location: https://thinkersfoundation.net/about?x=1` (query kept); the canonical `/` answers `200` with a `content-security-policy` (so `public/_headers` IS honoured for Workers assets).
  The canonical `/about` answers `307` to `/about/` (the Workers assets `html_handling` default adds the trailing slash), so a redirected visitor takes 301 then 307 then 200; harmless, but the rule could target `/about/` form if the extra hop ever matters.
  The `PUT` replaces a zone's whole redirect ruleset, so any rule added later by hand in the dashboard is lost by a rerun.
- [ ] Run the section 5 `for h in ...` loop: five lines each `HTTP/2 301` with `location: https://thinkersfoundation.net/about`.
- [ ] `curl -sI "https://thinkersfoundation.us/about?x=1"` -> `location: https://thinkersfoundation.net/about?x=1` (query preserved).

Not known: whether `routes` is also
read by the `wrangler preview` build (a failure there is a finding).

## 3b. Brand-domain redirects (decision 251 A)

`persistant.io` -> the PersistAnt repo, `authant.net` -> `authframework.dev`. Option B (one-page sites) comes later.

CireSnave's steps, in order (nothing here is automated; the token must not carry Zone Edit):

1. Cloudflare dashboard -> Add a domain -> `persistant.io`, then again for `authant.net`; pick the plan he uses for the other zones. If it offers to import existing DNS records, accept.
2. Cloudflare shows two nameservers per zone (`<name>.ns.cloudflare.com`; the exact pair is shown only after step 1). At each registrar, replace the domain's nameservers with exactly those two. Paste both pairs back.
3. Wait for each zone to read "Active" (minutes to hours).

Then, with the same token and env as step 8 (the token needs Zone: DNS Write and Single Redirect Write on the two new zones):

- `node ops/cloudflare/plan.mjs --only redirects-brands` (plan, no network), then `--apply --only redirects-brands` once the PM says so. The step fails loudly if a zone is not visible or not active.
- Read-back: `curl -sI https://persistant.io/x?y=1` -> `HTTP/2 301`, `location: https://github.com/ciresnave/PersistAnt`; `curl -sI https://www.authant.net/` -> `301`, `location: https://authframework.dev`. Query and path are deliberately dropped.
- The A records at 192.0.2.1 are placeholders; nothing is served from them.

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

- **The redirect-rule JSON** was assembled from the docs and is now PROVEN for the three thinkersfoundation zones (run and curl read-back in section 3, step 8). The `redirects-brands` rule (`target_url.value`, static target) is a different shape and is still unrun.
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
- **Pages vs Workers is decided (Workers, 2026-10-21, section 3).** Cloudflare's docs steer new projects at Workers static assets.
