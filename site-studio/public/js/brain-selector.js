/**
 * brain-selector.js — Brain selector pill bar for FAMtastic Studio
 *
 * Manages: brain selection state, WS communication, usage limit display,
 * auto-fallback notification, brainstorm context injection flag.
 *
 * Server WS message contract:
 *   Send:    { type: 'set-brain', brain: 'claude'|'codex'|'gemini' }
 *   Send:    { type: 'get-brain-status' }
 *   Receive: { type: 'brain-changed', brain, limits, sessionCounts }
 *   Receive: { type: 'brain-status',  currentBrain, limits, sessionCounts }
 */

const BrainSelector = (() => {
  let currentBrain = 'claude';
  let autoFallback  = false;
  let limits = {
    claude:  { dailyLimit: null, currentUsage: 0, status: 'available' },
    codex:   { dailyLimit: 40,   currentUsage: 0, status: 'available' },
    gemini:  { dailyLimit: 1500, currentUsage: 0, status: 'available' },
  };
  let sessionCounts = { claude: 0, codex: 0, gemini: 0 };

  const BRAIN_META = {
    claude: { label: 'Claude', cost: 'Subscription' },
    codex:  { label: 'Codex',  cost: '$0.016/msg'   },
    gemini: { label: 'Gemini', cost: 'API quota'     },
  };

  function getWs() {
    // ws is a global defined by the main Studio script
    return typeof ws !== 'undefined' ? ws : null;
  }

  function select(brain) {
    if (!BRAIN_META[brain]) return;
    currentBrain = brain;
    _renderPills();
    const socket = getWs();
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ type: 'set-brain', brain }));
    }
  }

  function requestStatus() {
    const socket = getWs();
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ type: 'get-brain-status' }));
    }
  }

  function handleServerMessage(msg) {
    if (msg.type === 'brain-changed' || msg.type === 'brain-status') {
      if (msg.brain)         currentBrain  = msg.brain;
      if (msg.currentBrain)  currentBrain  = msg.currentBrain;
      if (msg.limits)        limits        = msg.limits;
      if (msg.sessionCounts) sessionCounts = msg.sessionCounts;
      _renderPills();
      _hideFallbackBar();
      return true; // consumed
    }
    if (msg.type === 'brain-fallback') {
      _showFallbackBar(msg.from, msg.to, msg.reason);
      return true;
    }
    return false;
  }

  function getCurrentBrain() { return currentBrain; }

  function _renderPills() {
    const bar = document.getElementById('brain-selector-bar');
    if (!bar) return;

    document.querySelectorAll('.brain-pill').forEach(pill => {
      const brain = pill.dataset.brain;
      const lim   = limits[brain] || {};
      const count = sessionCounts[brain] || 0;

      // Active state
      pill.classList.toggle('active', brain === currentBrain);
      pill.classList.toggle('has-messages', count > 0);

      // Status dot
      const dot = pill.querySelector('.brain-status-dot');
      if (dot) {
        dot.className = 'brain-status-dot ' + (lim.status || 'available');
        dot.title = lim.status || 'available';
      }

      // Message count
      const countEl = pill.querySelector('.brain-msg-count');
      if (countEl) countEl.textContent = count;
    });
  }

  function _showFallbackBar(fromBrain, toBrain, reason) {
    const bar = document.getElementById('brain-fallback-bar');
    if (!bar) return;
    const msg = document.getElementById('brain-fallback-msg');
    if (msg) {
      msg.textContent = `${BRAIN_META[fromBrain]?.label || fromBrain} is ${reason || 'rate-limited'} — routing to ${BRAIN_META[toBrain]?.label || toBrain}.`;
    }
    bar.classList.add('visible');
    // Auto-dismiss after 6s
    setTimeout(() => { bar.classList.remove('visible'); }, 6000);
  }

  function _hideFallbackBar() {
    const bar = document.getElementById('brain-fallback-bar');
    if (bar) bar.classList.remove('visible');
  }

  // Call after WS connect to sync state
  function onWsOpen() {
    setTimeout(requestStatus, 400);
  }

  return { select, handleServerMessage, getCurrentBrain, onWsOpen, requestStatus };
})();

// Expose globally for onclick handlers
window.BrainSelector = BrainSelector;
window.selectBrain = (brain) => BrainSelector.select(brain);
