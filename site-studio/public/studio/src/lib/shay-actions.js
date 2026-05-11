/* shay-actions.js — local action contracts for Shay/right-pane actions.
   Orchestrator: add
   <script src="/studio/src/lib/shay-actions.js"></script>
   in studio.html between primitives and screens. */

window.ShayActions = (function () {

  function explainCurrentScreen(currentContext) {
    if (!currentContext) {
      return { ok: false, reason: 'no currentContext published yet' };
    }
    return {
      ok: true,
      explain: currentContext.explain,
      section: currentContext.section,
      activeId: currentContext.activeId,
    };
  }

  function whatNext(currentContext) {
    if (!currentContext) return { ok: false, reason: 'no currentContext' };
    if (!currentContext.nextAction) {
      return { ok: true, nextAction: null, note: 'no next action — section is at rest' };
    }
    return { ok: true, nextAction: currentContext.nextAction };
  }

  async function routeWithPayload(target, payload) {
    // payload is whatever stage info we want the destination section to see.
    window.__shayLastRoute = { target, payload, at: new Date().toISOString() };
    if (payload) {
      // sections agree by convention on a global per-section stash
      const stashKey = `__${target}StageFromShay`;
      window[stashKey] = payload;
    }
    let task = null;
    if (window.WorkflowAPI?.createTask) {
      const result = await window.WorkflowAPI.createTask({
        source_type: 'shay',
        source_id: `shay-${target}`,
        target_section: target,
        recommendation: payload?.recommendation || payload?.title || `Follow up in ${target}`,
        title: payload?.title || `Shay routed work to ${target}`,
        proof_needed: ['section follow-up', 'visible local artifact'],
        owner_section: target,
        metadata: payload || {},
      });
      task = result?.task || null;
    }
    window.__studioJump?.(target);
    return { ok: true, target, payload, task };
  }

  async function captureLearning(section, note, sourceId) {
    const entry = {
      section,
      note: String(note || ''),
      captured_at: new Date().toISOString(),
    };
    window.__shayLearningInbox = window.__shayLearningInbox || [];
    window.__shayLearningInbox.push(entry);
    try { console.info('[shay-learning]', entry); } catch (_e) {}
    let stored = null;
    if (window.WorkflowAPI?.captureLearning) {
      stored = await window.WorkflowAPI.captureLearning({ section, note, source_id: sourceId || '' });
    }
    return { ok: true, entry, stored };
  }

  function lastRoute() {
    return window.__shayLastRoute || null;
  }

  function learningInbox() {
    return window.__shayLearningInbox || [];
  }

  return { explainCurrentScreen, whatNext, routeWithPayload, captureLearning, lastRoute, learningInbox };
})();
