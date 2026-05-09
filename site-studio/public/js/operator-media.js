// Operator Media panel client — Lane D
// Fetches /api/media?tag=<activeTag> and replaces the #op-media-body slot list
// with honest data from the real registry. No innerHTML on dynamic content.
//
// The six known V1 slots match the existing operator.js deferred slot set:
//   hero_bg, committee_photos, sponsor_logos, venue_photo,
//   harry_variants, og_image
//
// Approval chip mapping:
//   approved  -> green
//   auto      -> green
//   pending   -> yellow
//   deferred  -> muted
//   (missing) -> muted

(function () {
  'use strict';

  const KNOWN_SLOTS = [
    'hero_bg',
    'committee_photos',
    'sponsor_logos',
    'venue_photo',
    'harry_variants',
    'og_image',
  ];

  const CHIP_CLASS = {
    approved: 'op-chip op-chip--green',
    auto: 'op-chip op-chip--green',
    pending: 'op-chip op-chip--yellow',
    deferred: 'op-chip op-chip--muted',
    missing: 'op-chip op-chip--muted',
  };

  function getActiveTag() {
    const op = window.__operator || {};
    return op.activeTag || op.tag || null;
  }

  function chipFor(state) {
    const span = document.createElement('span');
    span.className = CHIP_CLASS[state] || CHIP_CLASS.missing;
    span.textContent = state;
    return span;
  }

  function rowFor(slot, asset, deferredReason) {
    const row = document.createElement('div');
    row.className = 'op-media-row';
    row.dataset.slot = slot;

    const label = document.createElement('span');
    label.className = 'op-media-slot';
    label.textContent = slot;
    row.appendChild(label);

    let state = 'missing';
    let detail = '';
    if (asset && asset.approval) {
      state = asset.approval;
      detail = asset.id || asset.provider || '';
    } else if (deferredReason) {
      state = 'deferred';
      detail = deferredReason;
    }

    row.appendChild(chipFor(state));

    if (detail) {
      const meta = document.createElement('span');
      meta.className = 'op-media-meta';
      meta.textContent = detail;
      row.appendChild(meta);
    }

    return row;
  }

  function render(container, payload) {
    while (container.firstChild) container.removeChild(container.firstChild);

    const registry = (payload && payload.registry) || { assets: [] };
    const assets = Array.isArray(registry.assets) ? registry.assets : [];
    const deferredSlots = Array.isArray(registry.deferred_slots) ? registry.deferred_slots : [];

    const bySlot = {};
    for (const a of assets) {
      if (a && a.slot && !bySlot[a.slot]) bySlot[a.slot] = a;
    }
    const deferredBySlot = {};
    for (const d of deferredSlots) {
      if (d && d.slot) deferredBySlot[d.slot] = d.reason || 'deferred';
    }

    const slotsToShow = new Set(KNOWN_SLOTS);
    for (const a of assets) if (a && a.slot) slotsToShow.add(a.slot);
    for (const d of deferredSlots) if (d && d.slot) slotsToShow.add(d.slot);

    if (slotsToShow.size === 0) {
      const empty = document.createElement('div');
      empty.className = 'op-media-empty';
      empty.textContent = 'No media slots tracked yet.';
      container.appendChild(empty);
      return;
    }

    const summary = (payload && payload.summary) || {};
    const head = document.createElement('div');
    head.className = 'op-media-summary';
    head.textContent =
      `assets: ${assets.length}` +
      `  approved: ${summary.approved || 0}` +
      `  pending: ${summary.pending || 0}` +
      `  auto: ${summary.auto || 0}` +
      `  deferred: ${summary.deferred || 0}`;
    container.appendChild(head);

    for (const slot of slotsToShow) {
      container.appendChild(rowFor(slot, bySlot[slot], deferredBySlot[slot]));
    }
  }

  function renderError(container, message) {
    while (container.firstChild) container.removeChild(container.firstChild);
    const err = document.createElement('div');
    err.className = 'op-media-error';
    err.textContent = message;
    container.appendChild(err);
  }

  async function refresh() {
    const container = document.getElementById('op-media-body');
    if (!container) return;
    const tag = getActiveTag();
    if (!tag) {
      renderError(container, 'No active site selected.');
      return;
    }
    try {
      const res = await fetch('/api/media?tag=' + encodeURIComponent(tag));
      if (!res.ok) {
        renderError(container, 'Media API returned ' + res.status);
        return;
      }
      const payload = await res.json();
      render(container, payload);
    } catch (err) {
      renderError(container, 'Media fetch failed: ' + (err && err.message ? err.message : 'unknown'));
    }
  }

  function whenReady(fn) {
    if (window.__operator) return fn();
    let tries = 0;
    const iv = setInterval(function () {
      tries += 1;
      if (window.__operator || tries > 50) {
        clearInterval(iv);
        fn();
      }
    }, 100);
  }

  window.OperatorMedia = { refresh: refresh, render: render };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { whenReady(refresh); });
  } else {
    whenReady(refresh);
  }
})();
