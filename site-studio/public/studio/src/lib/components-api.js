/* Loaded by studio.html before screens. Orchestrator: add
   <script type="text/babel" src="/studio/src/lib/components-api.js"></script>
   in studio.html between primitives and screens. */

window.ComponentsAPI = {
  async list() {
    try {
      const res = await fetch("/api/components");
      if (!res.ok) {
        return { components: [], error: `HTTP ${res.status}` };
      }
      const data = await res.json();
      return { components: Array.isArray(data && data.components) ? data.components : [] };
    } catch (err) {
      return { components: [], error: String(err && err.message || err) };
    }
  },
  async check(id) {
    try {
      const q = encodeURIComponent(String(id || ""));
      const res = await fetch(`/api/components/check?id=${q}`);
      if (!res.ok) {
        return { exists: false, near: null, missing: [], error: `HTTP ${res.status}` };
      }
      const data = await res.json();
      return {
        exists: !!(data && data.exists),
        near: (data && data.near) || null,
        missing: Array.isArray(data && data.missing) ? data.missing : []
      };
    } catch (err) {
      return { exists: false, near: null, missing: [], error: String(err && err.message || err) };
    }
  },
  async getContract() {
    try {
      const res = await fetch("/api/components/contract");
      if (!res.ok) return null;
      const data = await res.json();
      return (data && data.contract) || null;
    } catch (err) {
      return null;
    }
  },

  // Phase 2, Lane C2 — staged sandbox insertion
  async insertStaged({ tag, component_id, slot, page }) {
    try {
      const r = await fetch("/api/components/insert", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ tag, component_id, slot, page }),
      });
      return await r.json();
    } catch (e) {
      return { ok: false, error: String(e && e.message || e) };
    }
  },

  // Phase 2, Lane C2 — list insertion history for a site tag (last 50)
  async listInsertions(tag) {
    try {
      const r = await fetch(`/api/components/insertions?tag=${encodeURIComponent(String(tag || ""))}`);
      return await r.json();
    } catch (e) {
      return { insertions: [], error: String(e && e.message || e) };
    }
  },
};
