/* Loaded by studio.html before screens. Orchestrator: add
   <script type="text/babel" src="/studio/src/lib/think-tank-api.js"></script>
   in studio.html between primitives and screens. */

window.ThinkTankAPI = {
  async listCaptures() {
    try {
      const r = await fetch('/api/think-tank/captures', { credentials: 'same-origin' });
      if (!r.ok) return { captures: [], error: `http_${r.status}` };
      const data = await r.json();
      return { captures: Array.isArray(data.captures) ? data.captures : [] };
    } catch (err) {
      return { captures: [], error: String(err && err.message || err) };
    }
  },
  async getContract() {
    try {
      const r = await fetch('/api/think-tank/contract', { credentials: 'same-origin' });
      if (!r.ok) return { contract: null, error: `http_${r.status}` };
      return await r.json();
    } catch (err) {
      return { contract: null, error: String(err && err.message || err) };
    }
  },
  async createCapture(payload) {
    try {
      const r = await fetch('/api/think-tank/captures', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      });
      return await r.json();
    } catch (e) { return { error: String(e?.message || e) }; }
  },
  async promote(payload) {
    try {
      const r = await fetch('/api/think-tank/promote', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      });
      return await r.json();
    } catch (e) { return { error: String(e?.message || e) }; }
  },
};
