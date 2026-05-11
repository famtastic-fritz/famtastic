/* research-actions.js — local action contracts for Research Center.
   Orchestrator: add
   <script src="/studio/src/lib/research-actions.js"></script>
   in studio.html between primitives and screens. */

window.ResearchActions = (function () {
  const DEPTH_META = {
    Fast:     { sources: '1–2',  duration: '~30s',  description: 'surface-level' },
    Standard: { sources: '5–10', duration: '~3min', description: 'balanced'      },
    Deep:     { sources: '15–25',duration: '~10min',description: 'evidence-rich' },
    Expert:   { sources: '30+',  duration: '~30min',description: 'gap-mapped'    },
  };

  function depthMeta(depth) { return DEPTH_META[depth] || null; }

  function newBriefContract(topic, depth, sources) {
    // No external research call. Stage a contract.
    return {
      intent: 'new-research-brief',
      payload: { topic: String(topic || ''), depth, sources: Array.isArray(sources) ? sources : [] },
      issued_at: new Date().toISOString(),
      status: 'contract_only',
      reason: 'research-router brain round-trip not wired',
    };
  }

  async function promoteFindings(briefId, to, task) {
    // Routes through Think-Tank's promote endpoint.
    if (!window.ThinkTankAPI?.promote) return { error: 'think-tank-api not loaded' };
    return await window.ThinkTankAPI.promote({
      from_capture_id: `brief-${briefId}`,
      to,
      task: { ...task, brief_id: briefId },
    });
  }

  return { DEPTH_META, depthMeta, newBriefContract, promoteFindings };
})();
