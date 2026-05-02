// shay-handoff.js
// SHAY V2 (2026-05-02): Handoff contract between Shay-Shay (light) and Shay's Workshop (deep).
//
// This is the CLIENT-SIDE handoff handler. The handoff payload is built here, dispatched
// as a CustomEvent, and consumed by the Workshop tab UI.
//
// A future session will add server-side persistence at site-studio/lib/shay/handoff-contract.js
// (so handoffs survive page reload and feed the learning loop). For now everything is
// in-browser and ephemeral — proof of pattern, not production durability.
//
// Usage from Shay-Shay (light) when work needs the Workshop:
//   ShayHandoff.takeToWorkshop({
//     user_intent: 'regenerate with warmer sunset feel',
//     current_artifact: { type: 'image_set', selected: 'img_002', items: [...] },
//     success_criteria: ['warm sunset', 'approve in <=3 attempts'],
//     follow_up_jobs: [{ type: 'save_to_assets', trigger: 'on_user_approve' }]
//   });
//
// Usage from Workshop UI (auto-wired below to a handoff banner):
//   window.addEventListener('shay:handoff:received', function (e) { ... });
//
// Return path (Workshop → Shay-Shay):
//   ShayHandoff.returnToShayShay({ handoff_id: '...', result: { ... }, message: 'Done.' });
//
// Schema: see docs/shay-architecture-v2-proposal.md "the handoff contract".

(function () {
  'use strict';

  function nowIso() {
    return new Date().toISOString();
  }

  function newId() {
    var t = Date.now().toString(36);
    var r = Math.random().toString(36).slice(2, 8);
    return 'hf_' + t + '_' + r;
  }

  function readPageContext() {
    if (window.ShayContextRegistry && typeof window.ShayContextRegistry.getContext === 'function') {
      return window.ShayContextRegistry.getContext() || null;
    }
    return null;
  }

  function buildPayload(opts) {
    opts = opts || {};
    var page = readPageContext();
    var sourcePage = page
      ? { studio: page.studio || null, page_id: page.page_id, url: window.location.pathname }
      : { studio: null, page_id: null, url: window.location.pathname };

    return {
      handoff_id: opts.handoff_id || newId(),
      source_surface: 'shay-shay',
      destination_surface: 'workshop',
      originated_at: nowIso(),
      source_page: sourcePage,
      current_artifact: opts.current_artifact || (page && page.selected_item
        ? { type: 'inferred', selected: page.selected_item }
        : null),
      user_intent: opts.user_intent || null,
      user_context: opts.user_context || {
        recent_actions: (page && page.recent_actions) || [],
        prior_attempts: opts.prior_attempts || 0,
        frustration_signal: !!opts.frustration_signal
      },
      success_criteria: opts.success_criteria || [],
      expected_outputs: opts.expected_outputs || [],
      follow_up_jobs: opts.follow_up_jobs || [],
      return_path: opts.return_path || {
        to_surface: 'shay-shay',
        as_message: null
      }
    };
  }

  // In-flight handoffs, keyed by handoff_id.
  var inflight = {};

  function takeToWorkshop(opts) {
    var payload = buildPayload(opts);
    inflight[payload.handoff_id] = payload;

    // Switch to the Workshop tab (internal id stays 'shay' for backwards compat).
    if (window.StudioShell && typeof window.StudioShell.switchTab === 'function') {
      window.StudioShell.switchTab('shay');
    }

    // Notify the Workshop UI that a handoff has arrived.
    window.dispatchEvent(new CustomEvent('shay:handoff:received', { detail: payload }));

    // Mirror to console for inspection during dev.
    console.log('[shay] handoff → Workshop', payload);
    return payload;
  }

  function returnToShayShay(opts) {
    opts = opts || {};
    var hf = opts.handoff_id ? inflight[opts.handoff_id] : null;
    var ret = {
      handoff_id: opts.handoff_id || (hf && hf.handoff_id) || null,
      source_surface: 'workshop',
      destination_surface: 'shay-shay',
      returned_at: nowIso(),
      result: opts.result || null,
      message: opts.message || (hf && hf.return_path && hf.return_path.as_message) || 'Done.',
      ok: opts.ok !== false
    };
    if (ret.handoff_id) delete inflight[ret.handoff_id];
    window.dispatchEvent(new CustomEvent('shay:handoff:returned', { detail: ret }));
    console.log('[shay] handoff → Shay-Shay', ret);
    return ret;
  }

  function listInflight() {
    return Object.keys(inflight).map(function (k) {
      return inflight[k];
    });
  }

  // ── Workshop receiver UI ──────────────────────────────────────────────────
  // Renders an "Active handoff" banner inside the Workshop shell when a handoff arrives.
  // Banner shows: source page, intent, prior attempts, success criteria.
  // Buttons: Send back to Shay-Shay, Park.
  function renderHandoffBanner(payload) {
    var shell = document.getElementById('shay-workshop-shell');
    if (!shell) return;

    var existing = document.getElementById('shay-handoff-banner');
    if (existing) existing.remove();

    var banner = document.createElement('div');
    banner.id = 'shay-handoff-banner';
    banner.style.cssText = [
      'margin: 12px 16px 0',
      'padding: 12px 14px',
      'border: 1px solid rgba(245,196,0,0.32)',
      'border-radius: 12px',
      'background: linear-gradient(180deg, rgba(245,196,0,0.10), rgba(245,196,0,0.02))',
      'font-size: 12px',
      'color: var(--fam-text)',
      'display: flex',
      'flex-direction: column',
      'gap: 8px'
    ].join(';');

    var head = document.createElement('div');
    head.style.cssText = 'display:flex;align-items:center;gap:10px;flex-wrap:wrap;';
    head.innerHTML =
      '<span style="background:rgba(245,196,0,0.16);color:var(--fam-gold);' +
      'padding:3px 9px;border-radius:99px;font-size:10px;font-weight:700;' +
      'text-transform:uppercase;letter-spacing:.06em;">↩ Handoff from Shay-Shay</span>' +
      '<span style="color:var(--fam-text-2);font-size:11px;">' +
      escapeHtml((payload.source_page && payload.source_page.studio) || 'unknown') + ' · ' +
      escapeHtml((payload.source_page && payload.source_page.page_id) || '—') +
      '</span>' +
      '<span style="margin-left:auto;color:var(--fam-text-3);font-size:10px;font-family:monospace;">' +
      escapeHtml(payload.handoff_id) +
      '</span>';

    var intent = document.createElement('div');
    intent.style.cssText = 'color:var(--fam-text);font-size:13px;line-height:1.5;';
    intent.innerHTML =
      '<strong style="color:var(--fam-gold);">Intent:</strong> ' +
      escapeHtml(payload.user_intent || '—');

    var meta = document.createElement('div');
    meta.style.cssText = 'color:var(--fam-text-2);font-size:11px;line-height:1.55;';
    var artifactStr = payload.current_artifact
      ? (payload.current_artifact.type + (payload.current_artifact.selected ? ' · ' + payload.current_artifact.selected : ''))
      : 'none';
    var critsStr = (payload.success_criteria && payload.success_criteria.length)
      ? payload.success_criteria.join(' · ')
      : '—';
    meta.innerHTML =
      '<span style="color:var(--fam-text-3);">artifact:</span> ' + escapeHtml(artifactStr) +
      ' &nbsp;·&nbsp; <span style="color:var(--fam-text-3);">criteria:</span> ' + escapeHtml(critsStr) +
      ' &nbsp;·&nbsp; <span style="color:var(--fam-text-3);">prior attempts:</span> ' +
      ((payload.user_context && payload.user_context.prior_attempts) || 0);

    var actions = document.createElement('div');
    actions.style.cssText = 'display:flex;gap:8px;margin-top:4px;';
    actions.innerHTML =
      '<button type="button" data-shay-handoff-action="return" style="' +
      'padding:6px 12px;border-radius:8px;border:1px solid rgba(245,196,0,0.32);' +
      'background:rgba(245,196,0,0.14);color:var(--fam-gold);font-size:11px;cursor:pointer;font-weight:600;">' +
      'Send back to Shay-Shay</button>' +
      '<button type="button" data-shay-handoff-action="park" style="' +
      'padding:6px 12px;border-radius:8px;border:1px solid var(--fam-border);' +
      'background:transparent;color:var(--fam-text-2);font-size:11px;cursor:pointer;">Park</button>';

    banner.appendChild(head);
    banner.appendChild(intent);
    banner.appendChild(meta);
    banner.appendChild(actions);

    // Insert at top of the workshop shell, after the header
    var firstChild = shell.firstElementChild;
    if (firstChild && firstChild.nextSibling) {
      shell.insertBefore(banner, firstChild.nextSibling);
    } else {
      shell.insertBefore(banner, firstChild);
    }

    // Wire buttons
    banner.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-shay-handoff-action]');
      if (!btn) return;
      var action = btn.getAttribute('data-shay-handoff-action');
      if (action === 'return') {
        returnToShayShay({
          handoff_id: payload.handoff_id,
          message: 'Workshop finished. Returning control.',
          result: { acknowledged: true }
        });
        banner.remove();
      } else if (action === 'park') {
        banner.remove();
        console.log('[shay] handoff parked', payload.handoff_id);
      }
    });
  }

  function escapeHtml(s) {
    if (s == null) return '';
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  window.addEventListener('shay:handoff:received', function (e) {
    if (e && e.detail) renderHandoffBanner(e.detail);
  });

  // Self-test from console:
  //   ShayHandoff.__debug.demoHandoff()
  var __debug = {
    demoHandoff: function () {
      return takeToWorkshop({
        user_intent: 'regenerate with warmer sunset feel; current is too bright',
        current_artifact: { type: 'image_set', selected: 'img_002' },
        user_context: { recent_actions: ['selected img_002', 'asked Shay-Shay which looks best'], prior_attempts: 2 },
        success_criteria: ['image matches warm sunset description', 'approve in <=3 attempts'],
        expected_outputs: [{ type: 'image', name: 'final_image_uri' }],
        follow_up_jobs: [{ type: 'save_to_assets', trigger: 'on_user_approve' }],
        return_path: { to_surface: 'shay-shay', as_message: 'Done. New image saved.' }
      });
    }
  };

  window.ShayHandoff = {
    takeToWorkshop: takeToWorkshop,
    returnToShayShay: returnToShayShay,
    listInflight: listInflight,
    buildPayload: buildPayload,
    __debug: __debug
  };
})();
