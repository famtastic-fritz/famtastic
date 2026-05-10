/* media-api.js — thin client for /api/media and /api/media/contract.
   Loaded by studio.html before screens. Orchestrator: add
     <script type="text/babel" src="/studio/src/lib/media-api.js"></script>
   in studio.html between primitives.jsx and the screens block.

   Surface (window.MediaAPI):
     getContract()        → Promise<contract|null>
     getRegistry(tag)     → Promise<{ registry, summary, error? }>

   Server contract (Lane D):
     GET /api/media/contract → { contract, asset_shape: {...} }
     GET /api/media?tag=<safe-tag> → { registry: { version, assets[] }, summary: { auto, pending, approved, deferred } }
     Without ?tag the server returns 400. We do not call without a tag.
*/

(function () {
  'use strict';

  const EMPTY_REGISTRY = Object.freeze({ version: 1, assets: [] });
  const EMPTY_SUMMARY = Object.freeze({ auto: 0, pending: 0, approved: 0, deferred: 0 });

  function emptyResult(error) {
    return {
      registry: { ...EMPTY_REGISTRY },
      summary: { ...EMPTY_SUMMARY },
      error: error || null,
    };
  }

  async function getContract() {
    try {
      const res = await fetch('/api/media/contract', { headers: { 'accept': 'application/json' } });
      if (!res.ok) return null;
      return await res.json();
    } catch (_err) {
      return null;
    }
  }

  async function getRegistry(tag) {
    // Honest gate — server requires ?tag and the route 400s without it.
    if (!tag || typeof tag !== 'string' || !tag.trim()) {
      return emptyResult('no site context');
    }
    try {
      const url = '/api/media?tag=' + encodeURIComponent(tag);
      const res = await fetch(url, { headers: { 'accept': 'application/json' } });
      if (!res.ok) {
        let serverErr = 'http ' + res.status;
        try {
          const body = await res.json();
          if (body && typeof body.error === 'string') serverErr = body.error;
        } catch (_e) { /* ignore body parse errors */ }
        return emptyResult(serverErr);
      }
      const body = await res.json();
      const registry = body && body.registry && Array.isArray(body.registry.assets)
        ? body.registry
        : { ...EMPTY_REGISTRY };
      const summary = body && body.summary && typeof body.summary === 'object'
        ? Object.assign({}, EMPTY_SUMMARY, body.summary)
        : { ...EMPTY_SUMMARY };
      return { registry, summary, error: null };
    } catch (err) {
      return emptyResult(err && err.message ? err.message : 'fetch failed');
    }
  }

  window.MediaAPI = { getContract, getRegistry };
})();
