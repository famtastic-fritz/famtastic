/* think-tank-actions.js — local action contracts for Think-Tank.
   Orchestrator: add
   <script src="/studio/src/lib/think-tank-actions.js"></script>
   in studio.html between primitives and screens. */

window.ThinkTankActions = (function () {
  async function capture(title, body, tags) {
    if (!title || !title.trim()) return { error: 'title required' };
    // Generate a safe id from the title; cap at 60 chars.
    const id = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'capture';
    const stamped = `${id}-${Date.now().toString(36)}`.slice(0, 60);
    if (!window.ThinkTankAPI?.createCapture) return { error: 'think-tank-api not loaded' };
    return await window.ThinkTankAPI.createCapture({ id: stamped, title, body: body || '', tags: tags || [] });
  }

  async function promote(captureId, to, task) {
    if (!window.ThinkTankAPI?.promote) return { error: 'think-tank-api not loaded' };
    return await window.ThinkTankAPI.promote({ from_capture_id: captureId, to, task: task || {} });
  }

  return { capture, promote };
})();
