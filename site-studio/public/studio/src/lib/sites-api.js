/* sites-api.js — minimal browser client for /api/intelligence routes.

   Exposes window.SitesAPI with two async functions:
     listSites()    -> { sites: [...] } or { sites: [], error: <string> }
     getBrief(tag)  -> brief object | null (404) | { error } (other failure)

   Loaded by studio.html before screens. Orchestrator: add
     <script type="text/babel" src="/studio/src/lib/sites-api.js"></script>
   in studio.html between primitives and screens.

   No external libraries, browser-friendly. Pure JS, but emitted under
   <script type="text/babel"> is fine — Babel is a no-op for plain ES. */

(function () {
  async function listSites() {
    try {
      const res = await fetch("/api/intelligence/sites", { credentials: "same-origin" });
      if (!res.ok) {
        return { sites: [], error: "http_" + res.status };
      }
      const data = await res.json();
      return { sites: Array.isArray(data && data.sites) ? data.sites : [] };
    } catch (err) {
      return { sites: [], error: (err && err.message) || "fetch_failed" };
    }
  }

  async function getBrief(tag) {
    try {
      const url = "/api/intelligence/brief" + (tag ? ("?tag=" + encodeURIComponent(tag)) : "");
      const res = await fetch(url, { credentials: "same-origin" });
      if (res.status === 404) return null;
      if (!res.ok) return { error: "http_" + res.status };
      return await res.json();
    } catch (err) {
      return { error: (err && err.message) || "fetch_failed" };
    }
  }

  window.SitesAPI = { listSites, getBrief };
})();
