/* memory-tail.js — client for the bottom MemoryStrip activity tail.

   Reads run-tail data from /api/intelligence/runs?tag=<tag>. When no
   site tag is available, returns an honest empty state with reason
   "no site context". When the API succeeds with zero runs, reason is
   "registry empty". On API error, returns { items: [], error }.

   Tail item shape:
     { t: <ISO time | 'just now'>, who: 'run' | 'capture',
       text: <one-line>, tone?: 'good' | 'warn' | 'crit' }

   Loaded by studio.html before screens. Orchestrator: add
     <script type="text/babel" src="/studio/src/lib/memory-tail.js"></script>
   in studio.html between primitives and screens (alongside recipes.js). */

(function () {
  function toneFor(run) {
    var verdict = (run && run.verdict) || "";
    var status  = (run && run.status)  || "";
    if (verdict === "fail" || status === "fail") return "crit";
    if (verdict === "warn" || status === "warn") return "warn";
    if (verdict === "pass" || status === "done" || status === "complete") return "good";
    return "";
  }

  function shortTime(iso) {
    if (!iso) return "—";
    try {
      var d = new Date(iso);
      if (isNaN(d.getTime())) return "—";
      // HH:MM in user's locale; if older than today, fall back to YYYY-MM-DD.
      var now = new Date();
      var sameDay = d.toDateString() === now.toDateString();
      if (sameDay) {
        var hh = String(d.getHours()).padStart(2, "0");
        var mm = String(d.getMinutes()).padStart(2, "0");
        return hh + ":" + mm;
      }
      return d.toISOString().slice(0, 10);
    } catch (_e) {
      return "—";
    }
  }

  function runToItem(run) {
    var status = (run && run.status) || "—";
    var verdict = (run && run.verdict) || "";
    var costUsd = (run && typeof run.cost_usd === "number") ? run.cost_usd : 0;
    var costStr = costUsd > 0 ? " · $" + costUsd.toFixed(2) : "";
    var label = run.run_id || "run";
    var text = label + " · " + (verdict || status) + costStr;
    return {
      t:    shortTime(run.started_at),
      who:  "run",
      text: text,
      tone: toneFor(run),
    };
  }

  async function getCaptureTail() {
    try {
      var r = await fetch("/api/think-tank/captures", { credentials: "same-origin" });
      var j = await r.json();
      if (!j || !Array.isArray(j.captures)) return { items: [] };
      var items = j.captures.slice(0, 5).map(function (c) {
        return {
          t:    c.captured_at || "—",
          who:  "capture",
          text: c.title || c.id,
        };
      });
      return { items: items };
    } catch (e) {
      return { items: [], error: String((e && e.message) || e) };
    }
  }

  async function getTail(opts) {
    opts = opts || {};
    var tag = opts.tag;
    if (window.WorkflowAPI && typeof window.WorkflowAPI.getState === 'function') {
      try {
        var state = await window.WorkflowAPI.getState(tag || null);
        if (state && Array.isArray(state.latest_actions) && state.latest_actions.length > 0) {
          return { items: state.latest_actions, reason: null };
        }
      } catch (_e) { /* fall through to legacy tails */ }
    }
    if (!tag) {
      /* No site context — fall back to capture inbox tail. */
      var capResult = await getCaptureTail();
      if (capResult.items && capResult.items.length > 0) {
        return { items: capResult.items, reason: null };
      }
      return { items: [], reason: "no site context" };
    }
    var url = "/api/intelligence/runs?tag=" + encodeURIComponent(tag);
    try {
      var res = await fetch(url, { credentials: "same-origin" });
      if (!res.ok) {
        return { items: [], reason: "registry empty", error: "http_" + res.status };
      }
      var body = await res.json();
      var runs = (body && Array.isArray(body.runs)) ? body.runs : [];
      if (runs.length === 0) {
        return { items: [], reason: "registry empty" };
      }
      var items = runs.map(runToItem);
      return { items: items, reason: null };
    } catch (e) {
      return { items: [], reason: "registry empty", error: String((e && e.message) || e) };
    }
  }

  window.MemoryTail = { getTail: getTail, getCaptureTail: getCaptureTail };
})();
