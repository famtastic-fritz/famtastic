/* media-actions.js — local action contracts for Media Studio + Library.
   Orchestrator: add
     <script src="/studio/src/lib/media-actions.js"></script>
   in studio.html between primitives and screens. */

window.MediaActions = (function () {
  'use strict';

  const STATUS = Object.freeze(['draft', 'approved', 'rejected', 'used', 'deferred']);

  /**
   * generate(prompt, provider, ratio, variations)
   * Honest action contract — NEVER calls a provider. Returns a contract object
   * and stores it on window.__mediaLastAction.
   */
  function generate(prompt, provider, ratio, variations) {
    const contract = {
      intent: 'generate',
      payload: {
        prompt: String(prompt || ''),
        provider,
        ratio,
        variations: Number(variations) || 1,
      },
      issued_at: new Date().toISOString(),
      status: 'contract_only',
      reason: 'provider round-trip not wired; see STUDIO-FUNCTIONAL-WORKSPACE-RUN-REPORT gaps',
    };
    window.__mediaLastAction = contract;
    return contract;
  }

  /**
   * reviewVariant(seed, decision)
   * decision: 'approve' | 'reject'
   * Contract only — no write until provider round-trip lands.
   */
  function reviewVariant(seed, decision) {
    const contract = {
      intent: 'review-variant',
      payload: { seed, decision },
      issued_at: new Date().toISOString(),
      status: 'contract_only',
      reason: 'variant review requires real generation output; provider round-trip not wired',
    };
    window.__mediaLastAction = contract;
    return contract;
  }

  /**
   * saveLocalTestAsset(tag, partial)
   * partial = { id, slot, prompt }. Server fills source/provider/cost/etc.
   * This is the ONE live action in Phase 1 — hits POST /api/media/test-asset.
   */
  async function saveLocalTestAsset(tag, partial) {
    if (!window.MediaAPI || typeof window.MediaAPI.saveTestAsset !== 'function') {
      return { error: 'media-api not loaded' };
    }
    const result = await window.MediaAPI.saveTestAsset(tag, partial);
    return result;
  }

  /**
   * assignToComponentSlot(assetId, componentId, slot)
   * Contract only — component-routes assign endpoint pending (Lane C).
   */
  async function updateAssetStatus(tag, assetId, approval, note) {
    if (!window.MediaAPI || typeof window.MediaAPI.updateAssetStatus !== 'function') {
      return { ok: false, error: 'media-api not loaded' };
    }
    return await window.MediaAPI.updateAssetStatus(tag, assetId, approval, note);
  }

  async function assignToComponentSlot(tag, assetId, componentId, slot) {
    const contract = {
      intent: 'assign-to-component-slot',
      payload: { assetId, componentId, slot },
      issued_at: new Date().toISOString(),
    };
    if (!window.MediaAPI || typeof window.MediaAPI.assignAsset !== 'function') {
      const fallback = { ...contract, status: 'contract_only', reason: 'media-api not loaded' };
      window.__mediaLastAction = fallback;
      return fallback;
    }
    const result = await window.MediaAPI.assignAsset(tag, {
      asset_id: assetId,
      target_type: 'component-slot',
      component_id: componentId,
      slot,
      site_tag: tag,
    });
    const live = result && result.ok
      ? { ...contract, status: 'recorded_local', server_result: result }
      : { ...contract, status: 'contract_only', reason: result?.error || result?.errors?.join('; ') || 'assign failed', server_result: result };
    window.__mediaLastAction = live;
    return live;
  }

  /**
   * assignToSiteSlot(assetId, tag, page, slot)
   * Contract only — surgical-editor assign endpoint pending (Lane C).
   */
  async function assignToSiteSlot(tag, assetId, page, slot) {
    const contract = {
      intent: 'assign-to-site-slot',
      payload: { assetId, tag, page, slot },
      issued_at: new Date().toISOString(),
    };
    if (!window.MediaAPI || typeof window.MediaAPI.assignAsset !== 'function') {
      const fallback = { ...contract, status: 'contract_only', reason: 'media-api not loaded' };
      window.__mediaLastAction = fallback;
      return fallback;
    }
    const result = await window.MediaAPI.assignAsset(tag, {
      asset_id: assetId,
      target_type: 'site-slot',
      page,
      slot,
      site_tag: tag,
    });
    const live = result && result.ok
      ? { ...contract, status: 'recorded_local', server_result: result }
      : { ...contract, status: 'contract_only', reason: result?.error || result?.errors?.join('; ') || 'assign failed', server_result: result };
    window.__mediaLastAction = live;
    return live;
  }

  /** lastAction() — returns the most recent action contract, or null. */
  function lastAction() {
    return window.__mediaLastAction || null;
  }

  return {
    STATUS,
    generate,
    reviewVariant,
    saveLocalTestAsset,
    updateAssetStatus,
    assignToComponentSlot,
    assignToSiteSlot,
    lastAction,
  };
})();
