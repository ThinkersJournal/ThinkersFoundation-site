#!/usr/bin/env node
// The Cloudflare half of PRE-FILING-PLAN.md sections 1 and 2, as a script.
//
//   node ops/cloudflare/plan.mjs                 # PLAN mode (default): prints every call, makes NONE
//   node ops/cloudflare/plan.mjs --only dnssec   # plan one step
//   node ops/cloudflare/plan.mjs --apply         # makes the calls (needs the env below)
//
// PLAN mode needs no token and touches no network: it is what a human reads before
// saying "go". --apply is the only path that talks to Cloudflare, and it must not be run
// until the PM says so (see ops/cloudflare/RUNBOOK.md).
//
// Secrets: the API token is read from CLOUDFLARE_API_TOKEN and nothing else. It is never
// taken from argv (shell history), never printed, and never written to a file. The
// forwarding destination is read from FORWARD_TO for the same reason: this repo is meant
// to go public and the plan keeps the personal mailbox off public surfaces.
//
// Every step ends in a READ-BACK (a GET of the property that was just set). An exit code
// or a "success": true is not a state read; the readback is printed beside the request.

import { argv, env, exit } from 'node:process';

const CANONICAL = 'thinkersfoundation.net';
const ZONES = ['thinkersfoundation.net', 'thinkersfoundation.us', 'thinkers.foundation'];
const PROJECT = 'thinkersfoundation-site';
// Role mailboxes, PRE-FILING-PLAN.md section 0 item 2. Each exists on purpose; the
// catch-all then takes everything else.
const ROLES = ['admin', 'info', 'filings', 'security', 'abuse', 'postmaster', 'dmca', 'treasurer'];
const API = 'https://api.cloudflare.com/client/v4';

const apply = argv.includes('--apply');
const onlyArg = argv.find((a) => a.startsWith('--only='))?.slice(7)
  ?? (argv.includes('--only') ? argv[argv.indexOf('--only') + 1] : undefined);
const only = onlyArg ? onlyArg.split(',') : null;

const TOKEN = env.CLOUDFLARE_API_TOKEN;
// Plan mode prints placeholders even if the variable happens to be set in the shell.
const ACCOUNT = apply ? env.CLOUDFLARE_ACCOUNT_ID : '<CLOUDFLARE_ACCOUNT_ID>';
const FORWARD_TO = apply ? env.FORWARD_TO : '<FORWARD_TO>';

if (apply && (!TOKEN || !env.CLOUDFLARE_ACCOUNT_ID || !env.FORWARD_TO)) {
  console.error('--apply needs CLOUDFLARE_API_TOKEN, CLOUDFLARE_ACCOUNT_ID and FORWARD_TO in the environment.');
  exit(2);
}

// zone name -> id. Filled by the `zones` step in apply mode; placeholders in plan mode.
const zoneId = Object.fromEntries(ZONES.map((z) => [z, `<zone_id:${z}>`]));

async function call(method, path, body) {
  const url = `${API}${path}`;
  if (!apply) {
    console.log(`  ${method} ${path}`);
    if (body !== undefined) console.log('    ' + JSON.stringify(body));
    return { success: true, result: null, planned: true };
  }
  const res = await fetch(url, {
    method,
    headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({ success: false, errors: [{ message: `HTTP ${res.status}, body not JSON` }] }));
  console.log(`  ${method} ${path} -> HTTP ${res.status}, success=${json.success}`);
  if (!json.success) {
    console.error('    errors:', JSON.stringify(json.errors));
    throw new Error(`${method} ${path} failed`);
  }
  return json;
}

// Create a DNS record unless one of the same type and name already exists; either way
// read it back.
async function ensureDns(zone, record) {
  const q = `type=${record.type}&name=${encodeURIComponent(record.name)}`;
  const existing = await call('GET', `/zones/${zoneId[zone]}/dns_records?${q}`);
  if (apply && existing.result.length > 0) {
    console.log(`    exists: ${record.type} ${record.name} -> ${existing.result[0].content} (left alone)`);
    return;
  }
  await call('POST', `/zones/${zoneId[zone]}/dns_records`, record);
}

const STEPS = [
  {
    id: 'zones',
    plan: '1.5 read-back: the token can list the three zones, and they are active',
    async run() {
      for (const z of ZONES) {
        const r = await call('GET', `/zones?name=${z}&account.id=${ACCOUNT}`);
        if (!apply) continue;
        const hit = r.result.find((x) => x.name === z);
        if (!hit) throw new Error(`zone ${z} not visible to this token`);
        zoneId[z] = hit.id;
        console.log(`    ${z}: status=${hit.status}`);
        if (hit.status !== 'active') throw new Error(`zone ${z} is ${hit.status}, not active (steps 1.1/1.2 are not done)`);
      }
    },
  },
  {
    id: 'dnssec',
    plan: '1.3 enable DNSSEC in each zone; the DS record is then added at the REGISTRAR by a human',
    async run() {
      for (const z of ZONES) {
        await call('PATCH', `/zones/${zoneId[z]}/dnssec`, { status: 'active' });
        const r = await call('GET', `/zones/${zoneId[z]}/dnssec`);
        if (apply) {
          const d = r.result;
          console.log(`    ${z}: status=${d.status}`);
          console.log(`      DS to add at the registrar: ${d.ds}`);
          console.log(`      (key_tag=${d.key_tag} algorithm=${d.algorithm} digest_type=${d.digest_type} digest=${d.digest})`);
        }
      }
    },
  },
  {
    id: 'email-destination',
    plan: '2.2 register the forwarding destination; Cloudflare emails it a link that a HUMAN must click',
    async run() {
      await call('POST', `/accounts/${ACCOUNT}/email/routing/addresses`, { email: FORWARD_TO });
      const r = await call('GET', `/accounts/${ACCOUNT}/email/routing/addresses`);
      if (apply) {
        const a = r.result.find((x) => x.email.toLowerCase() === FORWARD_TO.toLowerCase());
        console.log(`    destination verified: ${a?.verified ? a.verified : 'NOT YET (click the emailed link, then rerun)'}`);
      }
    },
  },
  {
    id: 'email-enable',
    plan: '2.1 enable Email Routing in each zone (Cloudflare adds the MX and SPF records itself)',
    async run() {
      for (const z of ZONES) {
        await call('POST', `/zones/${zoneId[z]}/email/routing/dns`, {});
        const r = await call('GET', `/zones/${zoneId[z]}/email/routing`);
        if (apply) console.log(`    ${z}: enabled=${r.result.enabled} status=${r.result.status}`);
        await call('GET', `/zones/${zoneId[z]}/dns_records?type=MX`);
      }
    },
  },
  {
    id: 'email-rules',
    plan: '2.3 named role rules first, then the catch-all, in each zone (needs the destination VERIFIED)',
    async run() {
      if (apply) {
        const r = await call('GET', `/accounts/${ACCOUNT}/email/routing/addresses`);
        const a = r.result.find((x) => x.email.toLowerCase() === FORWARD_TO.toLowerCase());
        if (!a?.verified) throw new Error('destination is not verified; rules would be created disabled. Finish step email-destination.');
      }
      for (const z of ZONES) {
        let priority = 1;
        for (const role of ROLES) {
          await call('POST', `/zones/${zoneId[z]}/email/routing/rules`, {
            name: `${role}@ -> forward`,
            enabled: true,
            priority: priority++,
            matchers: [{ type: 'literal', field: 'to', value: `${role}@${z}` }],
            actions: [{ type: 'forward', value: [FORWARD_TO] }],
          });
        }
        await call('PUT', `/zones/${zoneId[z]}/email/routing/rules/catch_all`, {
          name: 'catch-all -> forward',
          enabled: true,
          matchers: [{ type: 'all' }],
          actions: [{ type: 'forward', value: [FORWARD_TO] }],
        });
        const r = await call('GET', `/zones/${zoneId[z]}/email/routing/rules`);
        if (apply) console.log(`    ${z}: ${r.result.length} named rule(s): ${r.result.map((x) => x.matchers[0].value).join(', ')}`);
        // The named-rule listing above does not include the catch-all, so read it back on its own
        // and assert it: a 2xx PUT that left it disabled is how a made-up name bounces.
        const c = await call('GET', `/zones/${zoneId[z]}/email/routing/rules/catch_all`);
        if (apply) {
          const fwd = c.result?.actions?.[0]?.value ?? [];
          const ok = c.result?.enabled === true
            && c.result?.matchers?.[0]?.type === 'all'
            && c.result?.actions?.[0]?.type === 'forward'
            && fwd.some((v) => String(v).toLowerCase() === FORWARD_TO.toLowerCase());
          console.log(`    ${z}: catch-all enabled=${c.result?.enabled} matcher=${c.result?.matchers?.[0]?.type} action=${c.result?.actions?.[0]?.type}`);
          if (!ok) throw new Error(`catch-all for ${z} is not enabled and forwarding to FORWARD_TO after the PUT`);
        }
      }
    },
  },
  {
    id: 'dmarc',
    plan: '2.5 DMARC p=reject in each zone. SPF is NOT added here: see RUNBOOK.md "SPF", Cloudflare adds one at 2.1 and a second would be a permerror',
    async run() {
      for (const z of ZONES) {
        await ensureDns(z, {
          type: 'TXT',
          name: `_dmarc.${z}`,
          content: 'v=DMARC1; p=reject; sp=reject; adkim=s; aspf=s',
          ttl: 3600,
        });
        await call('GET', `/zones/${zoneId[z]}/dns_records?type=TXT`);
      }
    },
  },
  {
    id: 'dns-pages',
    plan: '1.6 proxied CNAMEs (apex and www) to the Pages project, in each zone',
    async run() {
      for (const z of ZONES) {
        for (const name of [z, `www.${z}`]) {
          await ensureDns(z, { type: 'CNAME', name, content: `${PROJECT}.pages.dev`, proxied: true, ttl: 1 });
        }
      }
    },
  },
  {
    id: 'pages-domains',
    plan: '1.6 attach the three apex hostnames to the Pages project (the project must exist: RUNBOOK.md step P1)',
    async run() {
      await call('GET', `/accounts/${ACCOUNT}/pages/projects/${PROJECT}`);
      for (const z of ZONES) {
        await call('POST', `/accounts/${ACCOUNT}/pages/projects/${PROJECT}/domains`, { name: z });
      }
      const r = await call('GET', `/accounts/${ACCOUNT}/pages/projects/${PROJECT}/domains`);
      if (apply) for (const d of r.result) console.log(`    ${d.name}: status=${d.status}`);
    },
  },
  {
    id: 'redirects',
    plan: '1.7 single redirects, 301, path and query preserved: .us and .foundation and every www go to the canonical apex',
    async run() {
      for (const z of ZONES) {
        const hosts = z === CANONICAL ? [`www.${z}`] : [z, `www.${z}`];
        const expression = hosts.map((h) => `(http.host eq "${h}")`).join(' or ');
        await call('PUT', `/zones/${zoneId[z]}/rulesets/phases/http_request_dynamic_redirect/entrypoint`, {
          rules: [
            {
              description: `${hosts.join(', ')} -> https://${CANONICAL} (301)`,
              expression,
              action: 'redirect',
              action_parameters: {
                from_value: {
                  status_code: 301,
                  target_url: { expression: `concat("https://${CANONICAL}", http.request.uri.path)` },
                  preserve_query_string: true,
                },
              },
            },
          ],
        });
        await call('GET', `/zones/${zoneId[z]}/rulesets/phases/http_request_dynamic_redirect/entrypoint`);
      }
    },
  },
  {
    id: 'hsts',
    optIn: true,
    plan: 'OPT-IN, founder\'s call (public/_headers says so): HSTS, one year, no includeSubDomains, no preload. Runs only with --only hsts',
    async run() {
      for (const z of ZONES) {
        await call('PATCH', `/zones/${zoneId[z]}/settings/security_header`, {
          value: { strict_transport_security: { enabled: true, max_age: 31536000, include_subdomains: false, preload: false, nosniff: true } },
        });
        await call('GET', `/zones/${zoneId[z]}/settings/security_header`);
      }
    },
  },
];

const chosen = STEPS.filter((s) => (only ? only.includes(s.id) : !s.optIn));
if (only) {
  const unknown = only.filter((o) => !STEPS.some((s) => s.id === o));
  if (unknown.length) { console.error(`unknown step(s): ${unknown.join(', ')}. Known: ${STEPS.map((s) => s.id).join(', ')}`); exit(2); }
}
// Every step after `zones` needs the zone ids, so `zones` always runs first in apply mode.
if (apply && !chosen.some((s) => s.id === 'zones')) chosen.unshift(STEPS[0]);

console.log(apply ? 'MODE: APPLY (calls are real)' : 'MODE: PLAN (no network, no token needed)');
console.log(`account: ${apply ? '(from env)' : ACCOUNT}; zones: ${ZONES.join(', ')}; canonical: ${CANONICAL}\n`);
for (const s of chosen) {
  console.log(`== ${s.id}: ${s.plan}`);
  try {
    await s.run();
  } catch (e) {
    console.error(`\nSTOPPED at step ${s.id}: ${e.message}`);
    console.error('Later steps did not run, and assert nothing.');
    exit(1);
  }
  console.log('');
}
console.log(apply ? 'Done. Now run the read-back checks in RUNBOOK.md section "Verify".' : 'Plan only; nothing was sent.');
