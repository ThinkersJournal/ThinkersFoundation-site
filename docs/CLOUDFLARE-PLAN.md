# Cloudflare plan: domains, DNSSEC order, redirects (section 1 of the pre-filing plan)

This is a tracked copy of **section 1 only** of `PRE-FILING-PLAN.md`. The full plan is deliberately untracked (it holds
a home address, a personal mailbox and CireSnave's own words), so the rest of it is not here. If the two ever differ,
the private plan is the one CireSnave reads; update both. The commands that carry this out are in
`ops/cloudflare/RUNBOOK.md`.

## 1. Cloudflare: the three domains and the one page

**Who does what.** CireSnave owns the Cloudflare account and the registrar logins, so the four steps marked **(you)**
are his. Everything else the ThinkersFoundation agent prepares as files and exact commands, and runs once he has put a
scoped API token in the vault (never in a repo, never in a chat).

| # | Step | Who | Check |
|---|---|---|---|
| 1.1 | Add each domain to Cloudflare as a zone (Free plan): thinkersfoundation.net, thinkersfoundation.us, thinkers.foundation | you | three zones, status "Pending nameserver update" |
| 1.2a | **Check first, per domain, at the registrar: is DNSSEC / a DS record already on?** A freshly bought domain usually has none (general knowledge, not verified for these three). Read it, do not assume: `dig DS <domain> @1.1.1.1` (Windows `nslookup` cannot query DS). No DS: go to 1.2c. Bought at Cloudflare Registrar: go to 1.2c, then 1.3a is automatic | you | `dig DS` is empty, or the DS and its TTL are written down |
| 1.2b | **Only if a DS exists:** remove it at the registrar, then wait at least its TTL (the number in the `dig DS <domain>` answer; Cloudflare's page says "commonly 24–48 hours for most TLDs"). Do NOT change nameservers yet: validating resolvers still hold the old DS and answer SERVFAIL for the new Cloudflare keys | you | `dig DS <domain> @1.1.1.1` is empty and the TTL has passed |
| 1.2c | At the registrar, set the nameservers to the two Cloudflare ones shown in the zone (automatic at Cloudflare Registrar). Wait for the previous NS TTL (Cloudflare: "typically one hour or less") | you | zone reads **Active**; `nslookup -type=NS <domain>` shows Cloudflare |
| 1.3a | **Only after the zone reads Active:** enable DNSSEC in the Cloudflare zone (DNS, Settings), then add the DS record Cloudflare shows at the registrar (if the registrar lacks "Algorithm 13" it may call it "ECDSA Curve P-256 with SHA-256"). **VERIFY** the `.us` and `.foundation` registrars accept a DS through the web UI. At Cloudflare Registrar the DS is submitted automatically (CDS/CDNSKEY scanning, "one to two days", timing not controllable) | you | Cloudflare shows the DS record; registrar shows it saved |
| 1.3b | Verify | agent | `dig +dnssec DS <domain> @1.1.1.1` shows the DS; `dig +dnssec A <domain> @1.1.1.1` shows an RRSIG and the `ad` flag; Cloudflare's DNSSEC card reads Active |
| 1.4 | Registrar hygiene on all three: transfer lock on, auto-renew on, 2FA on the registrar login, registrant email = a mailbox that will exist (section 2) | you | each setting read back from the registrar page |
| 1.5 | Create an API token, scoped narrowly to these three zones and this account, with the permission list in `ThinkersFoundation-site/ops/cloudflare/RUNBOOK.md` section 1 (my short list here was incomplete: it also needs DNSSEC, Single Redirect, Zone Settings and the account-level Email Routing Addresses permission) and store it in the vault under a name the agent is told | you | agent runs `wrangler whoami` and lists the three zones |
| 1.6 | Create the Pages project `thinkersfoundation-site` (static, from a git repo, see 1.8) and attach custom domains: the canonical one plus the two others | agent | all three hostnames resolve to the site (HTTPS, valid certs) |
| 1.7 | Redirect Rules: the two non-canonical hostnames 301 to the canonical one, preserving path. Redirect `www` to the apex | agent | `curl -sI` on each shows 301 and the canonical Location |
| 1.8 | The site itself: a small static page set built like ThinkersJournal.com (Astro on Pages, same lint and CI gates): one page, plus About, Contact, Privacy | agent | CI green; page loads; Lighthouse and axe pass |

**Why 1.2 and 1.3 look contradictory but are not (CireSnave hit this, 2026-10-16).** DNSSEC has to be OFF at the
registrar when the nameservers change, and ON again only once Cloudflare is serving the zone. Both statements are on
Cloudflare's page; they apply at different times, which is what the order above encodes.

**Verified vs not (2026-10-16).** *Read byte-for-byte from the page:* `https://developers.cloudflare.com/dns/dnssec/` ("Last updated Jun 24, 2026", fetched
raw with curl, tags stripped): "If you are onboarding an existing domain to Cloudflare, make sure DNSSEC is disabled
at your registrar (where you purchased your domain name). Otherwise, your domain will experience connectivity errors
when you change your nameservers." And, under "Migrate to Cloudflare with DNSSEC active": "Remove the DS record at your
registrar. Wait for the DS record TTL to fully expire at the parent zone. Verify with dig DS example.com — commonly
24–48 hours for most TLDs. Change your nameservers to Cloudflare. Wait for the previous NS record TTL to expire
(typically one hour or less). Enable DNSSEC in Cloudflare and add the new DS record at your registrar." plus "If you
change nameservers before the old DS TTL has fully expired, validating resolvers will return SERVFAIL because the
cached DS records will not match Cloudflare's DNSSEC keys." and "Cloudflare automatically adds DS records for domains
using Cloudflare Registrar". *From general knowledge, not verified:* that a fresh domain usually has no DS; the `ad`
flag as the success signal (it is from RUNBOOK section 5, not Cloudflare's page); what each registrar's screen looks
like. *Not read:* Cloudflare's DNSSEC-states page, so "Active" in 1.3b is the RUNBOOK's word, not a quoted state name.

**`.us` warning (VERIFY with the registrar):** `.us` requires a US nexus (a US citizen, resident or organisation) and
does not allow hiding the registrant's details behind a privacy service. The registrant data for that domain is
therefore public. Use the same public contact choice as in section 0 (item 3) of the private plan.

**Canonical redirect, not three copies.** Serving the same page under three hostnames splits links, cookies and search
standing, and invites the confusion we are trying to avoid. Three names, one site.
