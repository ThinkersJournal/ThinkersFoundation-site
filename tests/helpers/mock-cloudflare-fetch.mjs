// Preloaded with `node --import` so ops/cloudflare/plan.mjs can be run with --apply
// against a stand-in for the Cloudflare API. plan.mjs itself is not modified and never
// sees a real token. Zone statuses come from MOCK_ZONE_STATUS, a JSON object of
// zone name -> status; a zone not listed is "active".
// Email routing is stateful: MOCK_SKIP_CATCHALL_PUT=<zone> makes that zone's catch-all PUT
// return success without storing anything (the catch-all then reads back disabled).
const status = JSON.parse(process.env.MOCK_ZONE_STATUS || '{}');
const skipPut = process.env.MOCK_SKIP_CATCHALL_PUT || '';
const catchAll = {}; // zone id -> stored catch-all rule

globalThis.fetch = async (url, init = {}) => {
  const u = new URL(url);
  const method = init.method || 'GET';
  const ok = (result) => ({ status: 200, json: async () => ({ success: true, errors: [], result }) });

  if (method === 'GET' && u.pathname === '/client/v4/zones') {
    const name = u.searchParams.get('name');
    return ok([{ id: `id-${name}`, name, status: status[name] ?? 'active' }]);
  }
  if (u.pathname.endsWith('/dnssec')) {
    return ok({
      status: 'pending', ds: 'MOCK-DS', key_tag: 1, algorithm: '13', digest_type: '2', digest: 'MOCK',
    });
  }
  if (u.pathname.endsWith('/email/routing/addresses')) {
    return ok([{ email: process.env.FORWARD_TO, verified: '2026-01-01T00:00:00Z' }]);
  }
  const m = u.pathname.match(/\/zones\/(id-[^/]+)\/email\/routing\/rules(\/catch_all)?$/);
  if (m) {
    const [, zid, isCatchAll] = m;
    if (!isCatchAll) return method === 'POST' ? ok({}) : ok([]);
    if (method === 'PUT') {
      if (zid !== `id-${skipPut}`) catchAll[zid] = JSON.parse(init.body);
      return ok(catchAll[zid] ?? {});
    }
    return ok(catchAll[zid] ?? { enabled: false, matchers: [{ type: 'all' }], actions: [{ type: 'drop' }] });
  }
  return { status: 404, json: async () => ({ success: false, errors: [{ message: `mock has no route for ${method} ${u.pathname}` }] }) };
};
