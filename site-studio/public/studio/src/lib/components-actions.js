/* components-actions.js — local action contracts for Component Studio.
   Orchestrator: add
   <script src="/studio/src/lib/components-actions.js"></script>
   in studio.html between primitives and screens. */

window.ComponentsActions = (function () {

  async function checkExistingNew(id) {
    // Wraps /api/components/check + adds a "should-create" recommendation.
    if (!id || !window.ComponentsAPI?.check) return null;
    const result = await window.ComponentsAPI.check(id);
    if (!result) return null;
    const recommend = result.exists
      ? 'reuse'
      : result.near
        ? 'consider-near-match'
        : 'create-new';
    return { ...result, recommend };
  }

  async function newComponentContract(spec) {
    // spec = { id, name, purpose, props[], slots[], variants[], media_needs[] }
    const contract = {
      intent: 'new-component',
      payload: spec,
      issued_at: new Date().toISOString(),
    };
    if (window.WorkflowAPI && typeof window.WorkflowAPI.createComponentDraft === 'function') {
      const result = await window.WorkflowAPI.createComponentDraft(spec);
      const live = result && result.ok
        ? { ...contract, status: 'stored_local', server_result: result }
        : { ...contract, status: 'contract_only', reason: result?.error || 'component draft failed', server_result: result };
      window.__componentLastAction = live;
      return live;
    }
    const fallback = {
      ...contract,
      status: 'contract_only',
      reason: 'component draft storage not wired',
    };
    window.__componentLastAction = fallback;
    return fallback;
  }

  function componentChat(componentId, text) {
    // Local-only echo. No backend brain call.
    const contract = {
      intent: 'component-chat',
      payload: { componentId, text: String(text || '') },
      issued_at: new Date().toISOString(),
      status: 'contract_only',
      reason: 'component-level brain integration not wired',
    };
    window.__componentLastAction = contract;
    return contract;
  }

  // Phase 2, Lane C2 — async; calls staged-insert endpoint, falls back to contract-only.
  async function insertionContract(componentId, version, site, page, slot) {
    const contract = {
      intent: 'insert-surgical',
      payload: { componentId, version, site, page, slot },
      issued_at: new Date().toISOString(),
    };

    // Try the real local staged insertion first.
    if (site && window.ComponentsAPI && typeof window.ComponentsAPI.insertStaged === 'function') {
      const result = await window.ComponentsAPI.insertStaged({
        tag: site,
        component_id: componentId,
        slot: slot || 'unknown',
        page: page || 'index.html',
      });
      if (result && result.ok) {
        const live = { ...contract, status: 'staged_local', server_result: result };
        window.__componentLastAction = live;
        return live;
      }
      // Fall through to contract-only with error info.
      const failed = {
        ...contract,
        status: 'contract_only',
        reason: (result && (result.error || (Array.isArray(result.errors) ? result.errors.join('; ') : null))) || 'insert failed',
        server_result: result,
      };
      window.__componentLastAction = failed;
      return failed;
    }

    // No site context or API unavailable — keep Phase 1 behavior.
    const fallback = {
      ...contract,
      status: 'contract_only',
      reason: site
        ? 'ComponentsAPI.insertStaged not available'
        : 'no site selected — staged locally only',
      contract_shape_ref: '/api/components/contract',
    };
    window.__componentLastAction = fallback;
    return fallback;
  }

  function mediaNeed(componentId, slot) {
    // Cross-lane: routes user to Media Studio with prefilled hint.
    const contract = {
      intent: 'media-need',
      payload: { componentId, slot },
      issued_at: new Date().toISOString(),
    };
    window.__componentLastAction = contract;
    // Stash a stage payload Lane B's routing can read on its way to media.
    window.__mediaStageFromComponent = { componentId, slot };
    window.__studioJump?.('media');
    return contract;
  }

  function lastAction() { return window.__componentLastAction || null; }

  return {
    checkExistingNew,
    newComponentContract,
    componentChat,
    insertionContract,
    mediaNeed,
    lastAction,
  };
})();
