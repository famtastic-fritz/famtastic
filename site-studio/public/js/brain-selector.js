/**
 * brain-selector.js — Brain/Worker split selector for FAMtastic Studio.
 *
 * Manages: brain selection, model selection per brain, WS communication,
 * API status dot updates.
 *
 * WS protocol:
 *   Send:    { type: 'set-brain', brain: 'claude'|'gemini'|'openai' }
 *            { type: 'set-brain-model', brain, model }
 *   Receive: { type: 'brain-changed', brain, limits, sessionCounts }
 *            { type: 'brain-status', currentBrain, limits, sessionCounts }
 *            { type: 'brain-api-status', results }  ← new in Phase 0
 */

const BrainSelector = (() => {
  let currentBrain = 'claude';
  let socket = null;

  // Per-brain selected models (defaults)
  const brainModels = {
    claude: 'claude-sonnet-4-6',
    gemini: 'gemini-2.5-flash',
    openai: 'gpt-4o',
  };

  function init(ws) {
    socket = ws;
    _updatePills();
    _fetchAPIStatus();
  }

  function select(brain) {
    if (!['claude', 'gemini', 'openai'].includes(brain)) return;

    // Close any open model selectors
    document.querySelectorAll('.brain-model-selector.open').forEach(el => el.classList.remove('open'));

    currentBrain = brain;
    _updatePills();

    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ type: 'set-brain', brain }));
    }
  }

  function setModel(brain, model, optionEl) {
    brainModels[brain] = model;

    // Update selected state in dropdown
    const selector = document.getElementById(`model-selector-${brain}`);
    if (selector) {
      selector.querySelectorAll('.brain-model-option').forEach(el => el.classList.remove('selected'));
      if (optionEl) optionEl.classList.add('selected');
    }

    // Update model tag in pill
    const tag = document.getElementById(`brain-model-tag-${brain}`);
    if (tag) {
      const shortName = model.replace('claude-', '').replace('-20251001', '').replace('gemini-', '').replace('gpt-', '');
      tag.textContent = shortName;
    }

    // Close dropdown
    document.querySelectorAll('.brain-model-selector.open').forEach(el => el.classList.remove('open'));

    // Notify server
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ type: 'set-brain-model', brain, model }));
    }
  }

  function toggleModelSelector(brain, event) {
    event.stopPropagation();
    const selector = document.getElementById(`model-selector-${brain}`);
    if (!selector) return;
    const isOpen = selector.classList.contains('open');
    document.querySelectorAll('.brain-model-selector.open').forEach(el => el.classList.remove('open'));
    if (!isOpen) selector.classList.add('open');
  }

  function handleMessage(msg) {
    if (msg.brain) currentBrain = msg.brain;
    if (msg.currentBrain) currentBrain = msg.currentBrain;
    if (msg.type === 'brain-api-status' && msg.results) {
      _updateStatusDots(msg.results);
    }
    if (msg.type === 'brain-changed' || msg.type === 'brain-status') {
      _updatePills();
    }
  }

  // Legacy alias for backward compatibility with index.html onWsOpen call
  function handleServerMessage(msg) {
    return handleMessage(msg);
  }

  // Called after WS connect to sync state
  function onWsOpen() {
    setTimeout(_fetchAPIStatus, 400);
  }

  function _fetchAPIStatus() {
    fetch('/api/brain-status')
      .then(r => r.json())
      .then(data => _updateStatusDots(data))
      .catch(() => {});
  }

  function _updateStatusDots(results) {
    ['claude', 'gemini', 'openai'].forEach(brain => {
      const dot = document.getElementById(`brain-dot-${brain}`);
      if (!dot) return;
      const status = results[brain]?.status;
      dot.className = 'brain-status-dot ' + (
        status === 'connected' ? 'connected' :
        status === 'failed'    ? 'failed'    :
        status === 'pending'   ? 'pending'   : 'unavailable'
      );
    });
  }

  function _updatePills() {
    document.querySelectorAll('.brain-pill').forEach(pill => {
      pill.classList.toggle('active', pill.dataset.brain === currentBrain);
    });
  }

  function getCurrentBrain() { return currentBrain; }
  function getBrainModels()  { return { ...brainModels }; }

  // Close model selectors when clicking outside
  document.addEventListener('click', () => {
    document.querySelectorAll('.brain-model-selector.open').forEach(el => el.classList.remove('open'));
  });

  return { init, select, setModel, toggleModelSelector, handleMessage, handleServerMessage, onWsOpen, getCurrentBrain, getBrainModels };
})();

window.selectBrain = (brain) => BrainSelector.select(brain);
window.BrainSelector = BrainSelector;
