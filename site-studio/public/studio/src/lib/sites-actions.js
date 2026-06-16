/* sites-actions.js — local action contracts for Sites + Site Builder.
   Loaded by studio.html before screens.

   Orchestrator: add
     <script src="/studio/src/lib/sites-actions.js"></script>
   in studio.html between primitives and screens (after site-context.js).

   Phase 2 (Lane A2): added _dispatch helper (delays navigation jumps so the
   feedback chip has time to render before unmount), and a one-time global
   listener that accumulates builder ack messages into window.__studioBuilderAcks. */

// One-time global listener for builder acks. Stores in window.__studioBuilderAcks (cap at 50).
if (typeof window !== 'undefined' && !window.__studioBuilderAckListenerInstalled) {
  window.__studioBuilderAckListenerInstalled = true;
  window.__studioBuilderAcks = [];
  window.addEventListener('message', function (ev) {
    var data = ev && ev.data;
    if (!data || data.source !== 'studio-builder') return;
    window.__studioBuilderAcks.push(data);
    if (window.__studioBuilderAcks.length > 50) {
      window.__studioBuilderAcks = window.__studioBuilderAcks.slice(-50);
    }
  });
}

window.SitesActions = (function () {
  // Stage-payload format used by Lane E routing and Lane F recipes.
  // { intent: 'new-site'|'continue'|'preview'|'inspect'|'refine'|'open-settings'|'open-platform-defaults',
  //   tag?: string,
  //   payload?: object,
  //   issued_at: ISO string }

  // Internal dispatch helper.
  // opts.postToBuilder  — boolean: whether to call __studioPostToBuilder
  // opts.jumpTo         — string: section name to jump to (if any)
  // opts.delayMs        — number: ms delay before jump (default 600 for actions that jump, 0 if not jumping)
  function _dispatch(contract, opts) {
    window.__studioLastAction = contract;
    try {
      document.dispatchEvent(new CustomEvent('studio-action-flash', { detail: contract }));
    } catch (_e) {}
    if (opts && opts.postToBuilder) {
      window.__studioPostToBuilder?.(contract);
    }
    if (opts && opts.jumpTo) {
      var t = (typeof opts.delayMs === 'number') ? opts.delayMs : 600;
      if (t > 0) {
        setTimeout(function () { window.__studioJump?.(opts.jumpTo); }, t);
      } else {
        window.__studioJump?.(opts.jumpTo);
      }
    }
    return contract;
  }

  function newSite() {
    // Honest local action: stage a New Site contract, route to builder,
    // emit a postMessage to the embedded /index.html in case future
    // wiring listens. NEVER creates a site on its own.
    // Phase 2: jump is delayed 600ms so the feedback chip can flash before
    // the Sites screen unmounts (chip-before-navigate race fix).
    var contract = {
      intent: 'new-site',
      payload: { source: 'studio-shell-rail' },
      issued_at: new Date().toISOString(),
    };
    return _dispatch(contract, { postToBuilder: true, jumpTo: 'builder', delayMs: 600 });
  }

  function continueSite(tag) {
    if (!tag) return null;
    var ok = window.SiteContext?.setLastActiveTag?.(tag);
    if (!ok) return null;
    var contract = { intent: 'continue', tag: tag, issued_at: new Date().toISOString() };
    // Phase 2: same 600ms delay so the feedback chip can render before unmount.
    return _dispatch(contract, { postToBuilder: true, jumpTo: 'builder', delayMs: 600 });
  }

  function preview(tag) {
    var t = tag || window.SiteContext?.getLastActiveTag?.();
    if (!t) return null;
    var contract = { intent: 'preview', tag: t, issued_at: new Date().toISOString() };
    // preview doesn't jump — no delay needed.
    return _dispatch(contract, { postToBuilder: true });
  }

  function inspect(target) {
    var tag = window.SiteContext?.getLastActiveTag?.() || null;
    var contract = {
      intent: 'inspect',
      tag: tag,
      payload: { target: target || null },
      issued_at: new Date().toISOString(),
    };
    // inspect doesn't jump.
    return _dispatch(contract, { postToBuilder: true });
  }

  function refine(intentText) {
    var tag = window.SiteContext?.getLastActiveTag?.() || null;
    var contract = {
      intent: 'refine',
      tag: tag,
      payload: { request: String(intentText || '') },
      issued_at: new Date().toISOString(),
    };
    // refine doesn't jump.
    return _dispatch(contract, { postToBuilder: true });
  }

  function openSiteSettings(tag) {
    if (tag) window.SiteContext?.setLastActiveTag?.(tag);
    var contract = { intent: 'open-settings', tag: tag || null, issued_at: new Date().toISOString() };
    // jump to siteset; no postToBuilder needed for settings navigation.
    return _dispatch(contract, { jumpTo: 'siteset', delayMs: 0 });
  }

  function openPlatformDefaults() {
    var contract = { intent: 'open-platform-defaults', issued_at: new Date().toISOString() };
    // jump to settings immediately; no postToBuilder needed.
    return _dispatch(contract, { jumpTo: 'settings', delayMs: 0 });
  }

  // Read-back helpers
  function lastAction() { return window.__studioLastAction || null; }

  return {
    newSite: newSite,
    continueSite: continueSite,
    preview: preview,
    inspect: inspect,
    refine: refine,
    openSiteSettings: openSiteSettings,
    openPlatformDefaults: openPlatformDefaults,
    lastAction: lastAction,
  };
})();
