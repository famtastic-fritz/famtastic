/* Loaded by studio.html before screens. Orchestrator: add
   <script type="text/babel" src="/studio/src/lib/research-api.js"></script>
   in studio.html between primitives and screens. */

window.ResearchAPI = {
  async listBriefs() {
    try {
      const r = await fetch('/api/research/briefs', { credentials: 'same-origin' });
      if (!r.ok) return { briefs: [], error: `http_${r.status}` };
      const data = await r.json();
      return { briefs: Array.isArray(data.briefs) ? data.briefs : [] };
    } catch (err) {
      return { briefs: [], error: String(err && err.message || err) };
    }
  },
  async getBrief(id) {
    try {
      const r = await fetch(`/api/research/brief/${encodeURIComponent(id)}`, { credentials: 'same-origin' });
      if (r.status === 404) return null;
      if (!r.ok) return { error: `http_${r.status}` };
      return await r.json();
    } catch (err) {
      return { error: String(err && err.message || err) };
    }
  },
};
