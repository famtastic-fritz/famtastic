/* site-settings-api.js — Phase 2 Lane D2 per-site overrides client.
   Exposes window.SiteSettingsAPI with three methods:
     get(tag)           — fetch overrides (or empty skeleton)
     put(tag, payload)  — write overrides
     reset(tag)         — delete overrides file (reset to platform defaults)

   Orchestrator: add
     <script src="/studio/src/lib/site-settings-api.js"></script>
   in studio.html between primitives and screens. */

window.SiteSettingsAPI = {
  /**
   * Fetch per-site overrides.
   * Returns the overrides object (or an empty skeleton with all-null values).
   * On network/parse error returns { error: string }.
   */
  async get(tag) {
    try {
      const r = await fetch(`/api/site-settings?tag=${encodeURIComponent(tag)}`);
      return await r.json();
    } catch (e) {
      return { error: String(e?.message || e) };
    }
  },

  /**
   * Write per-site overrides.
   * payload shape: { overrides: { <key>: <value|null>, ... } }
   * Returns { ok: true, file, body } on success, { error, errors? } on failure.
   */
  async put(tag, payload) {
    try {
      const r = await fetch(`/api/site-settings?tag=${encodeURIComponent(tag)}`, {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      });
      return await r.json();
    } catch (e) {
      return { error: String(e?.message || e) };
    }
  },

  /**
   * Delete the per-site overrides file (reset to platform defaults).
   * Returns { ok: true, deleted: boolean } on success.
   */
  async reset(tag) {
    try {
      const r = await fetch(`/api/site-settings?tag=${encodeURIComponent(tag)}`, {
        method: 'DELETE',
      });
      return await r.json();
    } catch (e) {
      return { error: String(e?.message || e) };
    }
  },
};
