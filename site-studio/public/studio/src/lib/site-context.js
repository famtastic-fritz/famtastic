/* site-context.js — last-active site tag persistence (localStorage).

   Exposes window.SiteContext with three functions:
     getLastActiveTag()    -> string | null
     setLastActiveTag(tag) -> boolean (true on success, false on invalid)
     clearLastActiveTag()  -> void

   Tag validation: /^[a-z0-9][a-z0-9-]*$/ — lowercase, dashes allowed,
   must start with alphanumeric. Invalid tags are silently rejected so
   a malicious page cannot poison localStorage.

   Loaded by studio.html before screens. Orchestrator: add
     <script type="text/babel" src="/studio/src/lib/site-context.js"></script>
   in studio.html between primitives and screens. */

(function () {
  var KEY = "studio.lastActiveTag";
  var TAG_RE = /^[a-z0-9][a-z0-9-]*$/;

  function getLastActiveTag() {
    try {
      var v = window.localStorage.getItem(KEY);
      if (typeof v === "string" && TAG_RE.test(v)) return v;
      return null;
    } catch (_e) {
      return null;
    }
  }

  function setLastActiveTag(tag) {
    if (typeof tag !== "string" || !TAG_RE.test(tag)) return false;
    try {
      window.localStorage.setItem(KEY, tag);
      return true;
    } catch (_e) {
      return false;
    }
  }

  function clearLastActiveTag() {
    try {
      window.localStorage.removeItem(KEY);
    } catch (_e) {
      /* ignore */
    }
  }

  window.SiteContext = {
    getLastActiveTag: getLastActiveTag,
    setLastActiveTag: setLastActiveTag,
    clearLastActiveTag: clearLastActiveTag,
  };
})();

// Helper used by SitesActions to post into the embedded /index.html
// iframe. Safe no-op if no iframe is mounted (Site Builder not active).
window.__studioPostToBuilder = function (msg) {
  try {
    var iframe = document.querySelector('.embed-wrap iframe[src*="index.html"]');
    if (!iframe || !iframe.contentWindow) return false;
    iframe.contentWindow.postMessage(Object.assign({ source: 'studio-shell' }, msg), '*');
    return true;
  } catch (_e) {
    return false;
  }
};
