// shay-context-registry.js
// SHAY V2 (2026-05-02): Page-context registry for Shay-Shay.
//
// Each Studio page (Media Studio, Site Studio, future Studios) registers a
// context provider on mount. Shay-Shay PULLS context on demand — pages don't
// push it. This means Shay always has fresh state when the user asks her something.
//
// Usage from any page:
//   ShayContextRegistry.register({
//     page_id: 'media_studio.image_grid',
//     getContext: () => ({ visible_artifacts: [...], selected_item: '...', ... }),
//     onAction: (action_id, payload) => { /* execute action on the page */ }
//   });
//   ShayContextRegistry.setActive('media_studio.image_grid');  // when this page is shown
//
// On page unmount:
//   ShayContextRegistry.unregister('media_studio.image_grid');
//
// Shay-Shay reads via:
//   ShayContextRegistry.getContext()   // current active page's snapshot
//
// Action execution (Shay invoking an action on the page):
//   ShayContextRegistry.executeAction('regenerate', { item_id: 'img_002' });
//
// Architecture: see docs/shay-architecture-v2-proposal.md "page-context data model".

(function () {
  'use strict';

  var providers = {};       // page_id → { page_id, getContext, onAction, registered_at }
  var currentPageId = null;

  function register(opts) {
    if (!opts || typeof opts.page_id !== 'string' || !opts.page_id) {
      console.error('ShayContextRegistry.register: missing page_id');
      return false;
    }
    if (typeof opts.getContext !== 'function') {
      console.error('ShayContextRegistry.register: getContext must be a function');
      return false;
    }
    providers[opts.page_id] = {
      page_id: opts.page_id,
      getContext: opts.getContext,
      onAction: typeof opts.onAction === 'function' ? opts.onAction : null,
      registered_at: Date.now()
    };
    notify('register', { page_id: opts.page_id });
    return true;
  }

  function unregister(page_id) {
    if (providers[page_id]) {
      delete providers[page_id];
      if (currentPageId === page_id) currentPageId = null;
      notify('unregister', { page_id: page_id });
      return true;
    }
    return false;
  }

  function setActive(page_id) {
    if (!providers[page_id]) {
      console.warn('ShayContextRegistry.setActive: no provider for', page_id);
      return false;
    }
    currentPageId = page_id;
    notify('active-change', { page_id: page_id });
    return true;
  }

  function getActivePageId() {
    return currentPageId;
  }

  function getContext(page_id) {
    var target = page_id || currentPageId;
    if (!target) return null;
    var p = providers[target];
    if (!p) return null;
    var snap;
    try {
      snap = p.getContext() || {};
    } catch (err) {
      console.error('ShayContextRegistry.getContext failed for', target, err);
      return { page_id: target, error: String(err && err.message || err) };
    }
    // Always normalize: include page_id and captured_at, even if the provider forgot
    return Object.assign({}, snap, {
      page_id: p.page_id,
      captured_at: snap.captured_at || new Date().toISOString()
    });
  }

  function executeAction(action_id, payload, page_id) {
    var target = page_id || currentPageId;
    if (!target) return { ok: false, error: 'no_active_page' };
    var p = providers[target];
    if (!p) return { ok: false, error: 'no_provider' };
    if (!p.onAction) return { ok: false, error: 'no_action_handler' };
    try {
      var result = p.onAction(action_id, payload || {});
      return { ok: true, result: result };
    } catch (err) {
      console.error('ShayContextRegistry.executeAction failed', err);
      return { ok: false, error: String(err && err.message || err) };
    }
  }

  function listProviders() {
    return Object.keys(providers).map(function (k) {
      return { page_id: k, registered_at: providers[k].registered_at };
    });
  }

  function notify(event, detail) {
    try {
      window.dispatchEvent(new CustomEvent('shay:context:' + event, { detail: detail }));
    } catch (err) { /* noop */ }
  }

  // Self-test helper available in dev console:
  //   ShayContextRegistry.__debug.installFakeMediaStudio()
  //   ShayContextRegistry.getContext()
  var __debug = {
    installFakeMediaStudio: function () {
      register({
        page_id: 'media_studio.image_grid',
        getContext: function () {
          return {
            studio: 'media_studio',
            page_title: 'Generated Images (debug stub)',
            visible_artifacts: [
              { type: 'image', id: 'img_001', metadata: { prompt: 'warm tones, hazy', cost_usd: 0.004 } },
              { type: 'image', id: 'img_002', metadata: { prompt: 'cool tones, dusk', cost_usd: 0.004 } }
            ],
            selected_item: 'img_002',
            recent_actions: [{ action: 'selected', target: 'img_002', at: new Date().toISOString() }],
            available_actions: [
              { id: 'regenerate', label: 'Regenerate', applies_to: 'image' },
              { id: 'take_to_workshop', label: 'Take to Workshop', applies_to: 'any' }
            ]
          };
        },
        onAction: function (action_id, payload) {
          console.log('[ShayContext debug] action received:', action_id, payload);
          return { acknowledged: true };
        }
      });
      setActive('media_studio.image_grid');
      return 'media_studio.image_grid registered + active. Try: ShayContextRegistry.getContext()';
    }
  };

  window.ShayContextRegistry = {
    register: register,
    unregister: unregister,
    setActive: setActive,
    getActivePageId: getActivePageId,
    getContext: getContext,
    executeAction: executeAction,
    listProviders: listProviders,
    __debug: __debug
  };
})();
