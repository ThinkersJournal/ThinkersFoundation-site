# Cloudflare runbook: three domains, one site, mail forwarded

Implements `PRE-FILING-PLAN.md` sections 1 and 2. **Nothing in this file has been run.** No call has been made to
Cloudflare or to any registrar. `plan.mjs` is the executable form of the API steps; run in its default mode it
prints every call and sends none.

**Do not run `--apply` or any command marked REAL until the PM says so.**

## 0. What is needed, and from whom

| Need | Who | Where it goes |
|---|---|---|
| Zones added, nameservers set (plan 1.1, 1.2) | CireSnave | dashboard and registrars. Not scriptable from here: the registrar logins are his |
| API token (plan 1.5) with the permissions in section 1 | CireSnave | the vault; reaches the shell only as `CLOUDFLARE_API_TOKEN` |
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
export CLOUDFLARE_API_TOKEN=...           # from the vault, never typed into history
export FORWARD_TO=...                     # the destination mailbox

node ops/cloudflare/plan.mjs                      # PLAN: read what it will do. No network.
node ops/cloudflare/plan.mjs --apply --only zones # REAL, read-only: proves the token sees 3 active zones
```

Then, step by step, reading each read-back before the next (the script stops on the first failure and says that later
steps did not run):

| # | Command (all REAL) | Plan item | Human work around it |
|---|---|---|---|
| 1 | `--apply --only email-destination` | 2.2 | CireSnave clicks the emailed verification link. Until he does, rules stay disabled |
| 2 | `--apply --only email-enable` | 2.1 | none |
| 3 | `--apply --only email-rules` | 2.3 | refuses to run until the destination is verified |
| 4 | `--apply --only dmarc` | 2.5 | see "SPF" below |
| 5 | `--apply --only dnssec` | 1.3 | **only once every zone reads Active** (DNSSEC order above, step 4); the script prints the DS record; CireSnave enters it at each registrar |
| 6 | Pages project, below (P1 or P2) | 1.6 | P2 needs a dashboard click-through |
| 7 | `--apply --only dns-pages,pages-domains` | 1.6 | none |
| 8 | `--apply --only redirects` | 1.7 | none |
| 9 | optional: `--apply --only hsts` | n/a | the founder's call, after steps 1 to 8 are verified |

## 3. The Pages project (plan 1.6)

Two ways. **This is a decision for CireSnave, not for the lane**, because Direct Upload cannot be switched to Git
integration later (Cloudflare Pages docs, as read second-hand on 2026-10-10).

**P1. Direct Upload (fully scriptable, no dashboard).** Deploys are manual or from a CI job that holds the token.
Nothing in this repo's CI deploys today.

```
npx wrangler pages project create thinkersfoundation-site --production-branch main     # REAL
npm ci && npm run build
npx wrangler pages deploy dist --project-name thinkersfoundation-site --branch main    # REAL
```

**P2. Git integration (what plan 1.6 describes).** The GitHub link is made in the dashboard: Workers & Pages, Create,
Pages, Connect to Git, authorize the Cloudflare GitHub app on the `ThinkersJournal` org (an org owner must approve the
install), choose `ThinkersFoundation-site`. Build command `npm run build`, output directory `dist`, production branch
`main`, Node version from `.nvmrc`. After that, a merge to `main` deploys, as with ThinkersJournal.com. Everything
below the project creation is the same either way.

I could not confirm from the docs that the API can create a Git-integrated project without that interactive
authorization (the dashboard flow requires it). Assume it cannot.

**Recommend P2**: it matches the sibling site and keeps the token out of CI. The cost is one 5-minute click-through and an
org-owner approval.

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
  DNSKEY records, read from its docs page 2026-10-16. Not read: Cloudflare's DNSSEC-states page. `plan.mjs` does not
  itself refuse `--only dnssec` on a zone that is not Active; that check is the human's.
- **Pages is not necessarily Cloudflare's long-term product.** Their docs steer new projects at Workers static assets
  in places. If the PM prefers that, `wrangler deploy` with `[assets]` replaces section 3 and the DNS and redirect
  steps are unchanged.
