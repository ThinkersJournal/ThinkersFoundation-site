// Preloaded with `node --import` so ops/cloudflare/plan.mjs can be run with --apply
// against a stand-in for the Cloudflare API. plan.mjs itself is not modified and never
// sees a real token. Zone statuses come from MOCK_ZONE_STATUS, a JSON object of
// zone name -> status; a zone not listed is "active".
const status = JSON.parse(process.env.MOCK_ZONE_STATUS || '{}');

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
  return { status: 404, json: async () => ({ success: false, errors: [{ message: `mock has no route for ${method} ${u.pathname}` }] }) };
};
