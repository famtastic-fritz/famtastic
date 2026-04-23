// studio-orb.js — FAMtastic Pip assistant orb
// Manages: idle pulse, active glow, notification badge, callout, mode popup,
// 5 proactive triggers, session-permanent dismiss, Show Me / Do It modes.

(function () {
  // Generate a stable UUID for per-surface conversation separation
  function generateConvId() {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
    return 'conv-' + Math.random().toString(36).slice(2) + '-' + Date.now().toString(36);
  }

  function createLocalShayBridgeClient(surfaceName) {
    var pendingResult = null;
    var convId = generateConvId();
    var inFlight = false;
    var queue = [];
    var surface = surfaceName || 'lite';

    function _drainQueue() {
      if (inFlight || queue.length === 0) return;
      var next = queue.shift();
      inFlight = true;
      next();
    }

    return {
      surface: surface,
      convId: convId,
      prepareRequestPayload: function (message, context) {
        var outgoingBridge = pendingResult;
        pendingResult = null;
        return {
          message: message,
          context: context || {},
          surface: surface,
          conversation_id: convId,
          bridge_result: outgoingBridge || null,
        };
      },
      storeResponseResult: function (data) {
        if (data && data.bridge_result && typeof data.bridge_result === 'object' && !Array.isArray(data.bridge_result)) {
          pendingResult = data.bridge_result;
        }
        return pendingResult;
      },
      getPendingResult: function () {
        return pendingResult;
      },
      // FIFO request serialization
      enqueue: function (fn) {
        queue.push(fn);
        _drainQueue();
      },
      markResponseReceived: function () {
        inFlight = false;
        _drainQueue();
      },
      isInFlight: function () { return inFlight; },
    };
  }

  const TRIGGERS = {
    welcome:      'pip-t-welcome',
    build_warn:   'pip-t-build-warn',
    worker_queue: 'pip-t-worker-queue',
    idle_unsaved: 'pip-t-idle-unsaved',
    briefed_idle: 'pip-t-briefed-idle',
  };

  let pipMode = 'idle'; // idle | show-me | do-it | tutorial
  let badgeCount = 0;
  let idleTimer = null;
  let highlightEl = null;
  let currentOrbState = 'IDLE'; // IDLE | BRIEF_PROGRESS | BRAINSTORM_ACTIVE | REVIEW_ACTIVE | SHAY_THINKING
  // Per-surface bridge clients — separate conversation histories
  let liteBridgeClient = createLocalShayBridgeClient('lite');
  let deskBridgeClient = createLocalShayBridgeClient('desk');
  let shayDeskHasTranscript = false;
  let liteTurnCount = 0; // track Lite turns for "Open in Desk" affordance
  let liteSurfaceState = 'idle'; // idle | prompting | thinking | responding | alerting | show_me
  let shayLiteSettings = {
    identity_mode: 'character',
    default_identity_mode: 'character',
    remember_last_identity: true,
    proactive_behavior: 'context_nudges',
    allow_proactive_messages: true,
    event_reaction_intensity: 'balanced',
    character_style: 'default',
    character_variant: 'shay-default'
  };
  const SHAY_LITE_IDENTITY_KEY = 'shay-lite-last-identity';
  const SHAY_LITE_POSITION_KEY = 'shay-lite-position';
  const SHAY_THINKING_MIN_MS = 800;
  let suppressNextOrbClick = false;
  let dragState = null;

  // ── Init ────────────────────────────────────────────────────────────────
  function init() {
    const orb = document.getElementById('pip-orb');
    if (!orb) return;

    loadShayLiteSettings();
    bindShayDeskControls();
    loadLitePosition();

    // Left-click orb → open the active Lite surface with quick ask ready
    orb.addEventListener('click', (e) => {
      if (e.button !== 0) return;
      if (suppressNextOrbClick) {
        suppressNextOrbClick = false;
        return;
      }
      e.stopPropagation();
      toggleLitePanel({ focusInput: true });
    });

    // Right-click → mode selector popup
    orb.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      showModePopup();
    });

    // Close floating callout on backdrop click
    document.addEventListener('click', (e) => {
      const orbEl = document.getElementById('pip-orb');
      const panelEl = document.getElementById('shay-lite-panel');
      if ((!orbEl || !orbEl.contains(e.target)) && (!panelEl || !panelEl.contains(e.target))) {
        closeModePopup();
        if (getIdentityMode() !== 'mini_panel') closeLitePanel();
      }
    });

    // Close callout button
    const closeBtn = document.getElementById('pip-callout-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        closeCallout();
      });
    }

    // Wire direct input in column
    initDirectInput();
    initLiteDragging();

    // Dynamic area starts in IDLE state — loads validation plan or placeholder
    setOrbState('IDLE');

    // Start idle pulse animation
    orb.classList.add('pip-idle');
    applyLiteSurfaceState('idle');
    closeLitePanel();

    // Trigger 1: welcome message — now only shows in the dynamic area placeholder,
    // not auto-populating the response column. Column stays clean on load.

    // Trigger 4: idle + unsaved work (5 min)
    document.addEventListener('keydown', resetIdleTimer);
    document.addEventListener('click',   resetIdleTimer);
    resetIdleTimer();

    // Trigger 5: briefed idle — site in briefed state for >2 min without build
    setTimeout(checkBriefedIdle, 120000);

    // Subscribe to build completion events (dispatched by inline script)
    window.addEventListener('pip:build-complete', onBuildComplete);

    // Subscribe to worker queue updates
    window.addEventListener('pip:worker-queue-updated', onWorkerQueueUpdate);
    window.addEventListener('studio:workspace-chrome', syncLiteShellPositioning);
    window.addEventListener('studio:shay-lite-settings-updated', function (event) {
      shayLiteSettings = normalizeShayLiteSettings(event && event.detail);
      applyIdentityMode(shayLiteSettings.identity_mode, { fromSettings: true, silent: true });
      renderIdentitySwitch();
      syncDeskModeSummary();
    });

    // Watch step-log appearance to toggle active glow
    const observer = new MutationObserver(() => {
      const log = document.getElementById('step-log');
      const orbEl = document.getElementById('pip-orb');
      if (!orbEl) return;
      if (log) {
        orbEl.classList.add('pip-active');
        orbEl.classList.remove('pip-idle');
      } else {
        orbEl.classList.remove('pip-active');
        orbEl.classList.add('pip-idle');
      }
    });
    const messages = document.getElementById('chat-messages');
    if (messages) observer.observe(messages, { childList: true });
  }

  function loadLitePosition() {
    try {
      var raw = localStorage.getItem(SHAY_LITE_POSITION_KEY);
      if (!raw) return;
      var parsed = JSON.parse(raw);
      if (!parsed || typeof parsed.x !== 'number' || typeof parsed.y !== 'number') return;
      applyLiteCustomPosition(parsed);
    } catch (_) {}
  }

  function saveLitePosition(pos) {
    try {
      if (!pos) localStorage.removeItem(SHAY_LITE_POSITION_KEY);
      else localStorage.setItem(SHAY_LITE_POSITION_KEY, JSON.stringify(pos));
    } catch (_) {}
  }

  function applyLiteCustomPosition(pos) {
    var shell = document.getElementById('shay-lite-shell');
    if (!shell) return;
    if (!pos) {
      shell.classList.remove('is-custom-position');
      shell.style.left = '';
      shell.style.top = '';
      shell.style.right = '';
      shell.style.bottom = '';
      saveLitePosition(null);
      return;
    }
    shell.classList.add('is-custom-position');
    shell.style.left = Math.round(pos.x) + 'px';
    shell.style.top = Math.round(pos.y) + 'px';
    shell.style.right = 'auto';
    shell.style.bottom = 'auto';
    saveLitePosition({ x: Math.round(pos.x), y: Math.round(pos.y) });
  }

  function resetLitePosition() {
    applyLiteCustomPosition(null);
  }

  function clampLitePosition(pos) {
    var shell = document.getElementById('shay-lite-shell');
    var orb = document.getElementById('pip-orb');
    var width = (shell && shell.getBoundingClientRect().width) || (orb && orb.getBoundingClientRect().width) || 74;
    var height = (shell && shell.getBoundingClientRect().height) || (orb && orb.getBoundingClientRect().height) || 74;
    var maxX = Math.max(8, window.innerWidth - width - 8);
    var maxY = Math.max(8, window.innerHeight - height - 8);
    return {
      x: Math.min(Math.max(8, pos.x), maxX),
      y: Math.min(Math.max(8, pos.y), maxY)
    };
  }

  function initLiteDragging() {
    var orb = document.getElementById('pip-orb');
    var shell = document.getElementById('shay-lite-shell');
    if (!orb || !shell) return;

    orb.addEventListener('pointerdown', function (event) {
      if (event.button !== 0) return;
      var shellRect = shell.getBoundingClientRect();
      dragState = {
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        originX: shell.classList.contains('is-custom-position') ? shellRect.left : event.clientX - 74,
        originY: shell.classList.contains('is-custom-position') ? shellRect.top : event.clientY - 74,
        dragging: false
      };
      orb.setPointerCapture(event.pointerId);
    });

    orb.addEventListener('pointermove', function (event) {
      if (!dragState || dragState.pointerId !== event.pointerId) return;
      var dx = event.clientX - dragState.startX;
      var dy = event.clientY - dragState.startY;
      if (!dragState.dragging && Math.abs(dx) + Math.abs(dy) < 8) return;
      dragState.dragging = true;
      var next = clampLitePosition({
        x: dragState.originX + dx,
        y: dragState.originY + dy
      });
      applyLiteCustomPosition(next);
    });

    function finishDrag(event) {
      if (!dragState || dragState.pointerId !== event.pointerId) return;
      if (dragState.dragging) suppressNextOrbClick = true;
      dragState = null;
    }

    orb.addEventListener('pointerup', finishDrag);
    orb.addEventListener('pointercancel', finishDrag);
    window.addEventListener('resize', function () {
      if (!shell.classList.contains('is-custom-position')) return;
      applyLiteCustomPosition(clampLitePosition({
        x: parseFloat(shell.style.left) || 8,
        y: parseFloat(shell.style.top) || 8
      }));
    });
  }

  function normalizeShayLiteSettings(raw) {
    raw = raw || {};
    var identityModes = ['character', 'orb_classic', 'mini_panel'];
    var proactiveModes = ['off', 'context_nudges', 'active_assist'];
    var reactionModes = ['quiet', 'balanced', 'expressive'];
    return {
      identity_mode: identityModes.indexOf(raw.identity_mode) !== -1 ? raw.identity_mode : 'character',
      default_identity_mode: identityModes.indexOf(raw.default_identity_mode) !== -1 ? raw.default_identity_mode : 'character',
      remember_last_identity: raw.remember_last_identity !== false,
      proactive_behavior: proactiveModes.indexOf(raw.proactive_behavior) !== -1 ? raw.proactive_behavior : 'context_nudges',
      allow_proactive_messages: raw.allow_proactive_messages !== false,
      event_reaction_intensity: reactionModes.indexOf(raw.event_reaction_intensity) !== -1 ? raw.event_reaction_intensity : 'balanced',
      character_style: raw.character_style || 'default',
      character_variant: raw.character_variant || 'shay-default'
    };
  }

  function loadShayLiteSettings() {
    fetch('/api/settings').then(function (r) { return r.json(); }).then(function (settings) {
      shayLiteSettings = normalizeShayLiteSettings(settings && settings.shay_lite_settings);
      var initialMode = shayLiteSettings.default_identity_mode || 'character';
      if (shayLiteSettings.remember_last_identity) {
        var remembered = localStorage.getItem(SHAY_LITE_IDENTITY_KEY);
        if (remembered) initialMode = remembered;
      }
      applyIdentityMode(initialMode, { fromSettings: true, silent: true });
      renderIdentitySwitch();
      syncDeskModeSummary();
    }).catch(function () {
      shayLiteSettings = normalizeShayLiteSettings(shayLiteSettings);
      applyIdentityMode(shayLiteSettings.default_identity_mode || 'character', { silent: true });
      renderIdentitySwitch();
      syncDeskModeSummary();
    });
  }

  function syncDeskModeSummary() {
    var summary = document.getElementById('shay-desk-mode-summary');
    if (!summary) return;
    summary.textContent = 'Current Lite identity: ' + identityLabel(getIdentityMode()) + '. Proactive behavior: ' + humanizeLabel(shayLiteSettings.proactive_behavior) + '. Drag Shay Lite to reposition, or switch identity from Lite or Assistant settings.';
  }

  function beginShayThinking() {
    applyLiteSurfaceState('thinking');
    setOrbState('SHAY_THINKING');
    return Date.now();
  }

  function completeShayThinkingWindow(startedAt, fn) {
    var elapsed = Date.now() - (startedAt || Date.now());
    var remaining = SHAY_THINKING_MIN_MS - elapsed;
    if (remaining > 0) {
      setTimeout(fn, remaining);
    } else if (typeof fn === 'function') {
      fn();
    }
  }

  function endShayThinking() {
    applyLiteSurfaceState('responding');
    setOrbState('IDLE');
  }

  function getShayDeskTranscriptArea() {
    return document.getElementById('shay-desk-transcript');
  }

  function updateShayDeskTranscriptState() {
    var area = getShayDeskTranscriptArea();
    var empty = document.getElementById('shay-desk-empty-state');
    if (!area) return;
    var hasMessages = !!area.querySelector('.shay-desk-msg');
    area.classList.toggle('has-messages', hasMessages);
    if (empty) empty.style.display = hasMessages ? 'none' : '';
  }

  function scrollShayDeskTranscriptToBottom() {
    var area = getShayDeskTranscriptArea();
    if (!area) return;
    area.scrollTop = area.scrollHeight;
  }

  function appendShayDeskMessage(role, text, opts) {
    var area = getShayDeskTranscriptArea();
    if (!area || !text) return null;
    var options = opts || {};
    var row = document.createElement('div');
    row.className = 'shay-desk-msg shay-desk-msg-' + (role || 'assistant') + (options.subtle ? ' is-subtle' : '');
    if (options.id) row.id = options.id;

    var bubble = document.createElement('div');
    bubble.className = 'shay-desk-bubble' + (options.typing ? ' shay-desk-bubble-typing' : '');
    if (options.typing) {
      var dots = document.createElement('div');
      dots.className = 'shay-thinking-dots';
      for (var i = 0; i < 3; i++) dots.appendChild(document.createElement('span'));
      var label = document.createElement('div');
      label.className = 'shay-thinking-label';
      label.textContent = text;
      bubble.appendChild(dots);
      bubble.appendChild(label);
    } else {
      bubble.textContent = text;
    }

    row.appendChild(bubble);
    area.appendChild(row);
    updateShayDeskTranscriptState();
    scrollShayDeskTranscriptToBottom();
    return row;
  }

  function showShayDeskTyping(on) {
    var existing = document.getElementById('shay-desk-typing-row');
    if (!on) {
      if (existing) existing.remove();
      updateShayDeskTranscriptState();
      return;
    }
    if (existing) {
      scrollShayDeskTranscriptToBottom();
      return;
    }
    appendShayDeskMessage('assistant', 'Shay is on it…', { id: 'shay-desk-typing-row', typing: true, subtle: true });
  }

  function bindShayDeskControls() {
    var input = document.getElementById('shay-desk-input');
    var sendBtn = document.getElementById('shay-desk-send-btn');
    var liteBtn = document.getElementById('shay-desk-lite-btn');
    var showMeBtn = document.getElementById('shay-desk-showme-btn');
    var chatBtn = document.getElementById('shay-desk-chat-btn');

    function setDeskThinking(on) {
      var btn = document.getElementById('shay-desk-send-btn');
      var indicator = document.getElementById('shay-desk-thinking');
      if (btn) { btn.disabled = on; btn.style.opacity = on ? '0.45' : ''; }
      if (indicator) indicator.style.display = on ? 'flex' : 'none';
    }

    function askFromDesk() {
      var text = input && input.value ? input.value.trim() : '';
      if (!text) {
        if (input) input.focus();
        return;
      }
      appendShayDeskMessage('user', text);
      if (input) input.value = '';

      function doRequest() {
        var thinkStart = beginShayThinking();
        setDeskThinking(true);
        showShayDeskTyping(true);
        var context = getShayShayContext();
        var payload = deskBridgeClient.prepareRequestPayload(text, context);
        // Attach handoff context if coming from Lite
        if (deskBridgeClient._pendingHandoff) {
          payload.handoff_context = deskBridgeClient._pendingHandoff;
          deskBridgeClient._pendingHandoff = null;
        }
        fetch('/api/shay-shay', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
          .then(function(r) { return r.json(); })
          .then(function(data) {
            deskBridgeClient.storeResponseResult(data);
            deskBridgeClient.markResponseReceived();
            // Show last bridge op hint if present
            if (data.bridge_result && data.bridge_result.op) {
              var bPath = data.bridge_result.path || data.bridge_result.command || '';
              setShayStatusHint('Last bridge: ' + data.bridge_result.op + (bPath ? ' ' + bPath : ''));
            }
            // Handle commit proposal
            if (data.commit_request && data.commit_request.message) {
              showCommitProposalBanner(data.commit_request.message);
            }
            completeShayThinkingWindow(thinkStart, function () {
              showShayDeskTyping(false);
              setDeskThinking(false);
              endShayThinking();
              appendShayDeskMessage('assistant', data.response || data.error || 'No response.');
              // Usage metadata
              if (data.usage) {
                var usageLine = '\u21b3 ' + (data.usage.input_tokens || 0) + '\u2192' + (data.usage.output_tokens || 0) + ' tokens' + (data.usage.cost_usd ? ' \u00b7 $' + Number(data.usage.cost_usd).toFixed(4) : '');
                appendShayDeskMessage('system', usageLine, { subtle: true });
              }
            });
          })
          .catch(function(err) {
            deskBridgeClient.markResponseReceived();
            completeShayThinkingWindow(thinkStart, function () {
              showShayDeskTyping(false);
              setDeskThinking(false);
              applyLiteSurfaceState('alerting');
              setOrbState('IDLE');
              appendShayDeskMessage('system', 'Error: ' + err.message, { subtle: true });
            });
          });
      }

      deskBridgeClient.enqueue(doRequest);
    }

    updateShayDeskTranscriptState();

    if (input && !input.dataset.boundDeskEnter) {
      input.dataset.boundDeskEnter = 'true';
      input.addEventListener('keydown', function (event) {
        if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
          event.preventDefault();
          askFromDesk();
        }
      });
    }
    if (sendBtn && !sendBtn.dataset.boundDeskClick) {
      sendBtn.dataset.boundDeskClick = 'true';
      sendBtn.addEventListener('click', askFromDesk);
    }
    [liteBtn].forEach(function (btn) {
      if (btn && !btn.dataset.boundDeskClick) {
        btn.dataset.boundDeskClick = 'true';
        btn.addEventListener('click', function () { openLitePanel({ focusInput: true }); });
      }
    });
    if (showMeBtn && !showMeBtn.dataset.boundDeskClick) {
      showMeBtn.dataset.boundDeskClick = 'true';
      showMeBtn.addEventListener('click', function () {
        if (window.PipOrb && typeof window.PipOrb.quickShowMe === 'function') window.PipOrb.quickShowMe();
      });
    }
    [chatBtn].forEach(function (btn) {
      if (btn && !btn.dataset.boundDeskClick) {
        btn.dataset.boundDeskClick = 'true';
        btn.addEventListener('click', function () {
          if (window.StudioShell && typeof window.StudioShell.switchTab === 'function') window.StudioShell.switchTab('chat');
        });
      }
    });
  }

  function renderIdentitySwitch() {
    var mount = document.getElementById('shay-lite-mode-switch');
    if (!mount) return;
    mount.innerHTML = '';
    ['character', 'orb_classic', 'mini_panel'].forEach(function (mode) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'shay-lite-mode-btn' + (mode === getIdentityMode() ? ' active' : '');
      btn.textContent = identityLabel(mode);
      btn.addEventListener('click', function () {
        applyIdentityMode(mode);
        renderIdentitySwitch();
        syncDeskModeSummary();
      });
      mount.appendChild(btn);
    });
  }

  function identityLabel(mode) {
    if (mode === 'orb_classic') return 'Classic Orb';
    if (mode === 'mini_panel') return 'Mini Panel';
    return 'Character';
  }

  function humanizeLabel(value) {
    return String(value || '').replace(/[_-]+/g, ' ').replace(/\b\w/g, function (m) { return m.toUpperCase(); });
  }

  function getIdentityMode() {
    return (shayLiteSettings && shayLiteSettings.identity_mode) || 'character';
  }

  function applyIdentityMode(mode, opts) {
    opts = opts || {};
    shayLiteSettings.identity_mode = mode;
    var shell = document.getElementById('shay-lite-shell');
    if (shell) shell.dataset.identity = mode;
    if (shayLiteSettings.remember_last_identity) {
      try { localStorage.setItem(SHAY_LITE_IDENTITY_KEY, mode); } catch (_) {}
    }
    if (mode === 'mini_panel') openLitePanel({ silent: true });
    else if (!opts.silent) closeLitePanel();
    if (!opts.fromSettings) {
      fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shay_lite_settings: shayLiteSettings })
      }).catch(function () {});
    }
    syncLiteShellPositioning();
  }

  function toggleLitePanel(opts) {
    var shell = document.getElementById('shay-lite-shell');
    if (!shell) return;
    if (shell.dataset.panelOpen === 'true' && getIdentityMode() !== 'mini_panel') {
      closeLitePanel();
      return;
    }
    openLitePanel(opts);
  }

  function openLitePanel(opts) {
    opts = opts || {};
    var shell = document.getElementById('shay-lite-shell');
    if (!shell) return;
    shell.dataset.panelOpen = 'true';
    if (!opts.silent) applyLiteSurfaceState(liteSurfaceState === 'idle' ? 'prompting' : liteSurfaceState);
    if (opts.focusInput) {
      setTimeout(function () {
        var input = document.getElementById('pip-direct-input');
        if (input) input.focus();
      }, 30);
    }
  }

  function closeLitePanel() {
    var shell = document.getElementById('shay-lite-shell');
    if (!shell || getIdentityMode() === 'mini_panel') return;
    shell.dataset.panelOpen = 'false';
    if (liteSurfaceState !== 'thinking') applyLiteSurfaceState('idle');
  }

  function syncLiteShellPositioning() {
    var shell = document.getElementById('shay-lite-shell');
    if (!shell) return;
    shell.dataset.reaction = shayLiteSettings.event_reaction_intensity || 'balanced';
  }

  function shouldShowProactiveMessages() {
    return !!(shayLiteSettings.allow_proactive_messages && shayLiteSettings.proactive_behavior !== 'off');
  }

  function applyLiteSurfaceState(state) {
    liteSurfaceState = state || 'idle';
    var shell = document.getElementById('shay-lite-shell');
    var orb = document.getElementById('pip-orb');
    if (shell) shell.dataset.state = liteSurfaceState;
    if (!orb) return;
    orb.classList.remove('pip-idle', 'pip-active', 'pip-thinking', 'pip-alerting', 'pip-show-me');
    if (liteSurfaceState === 'thinking') orb.classList.add('pip-thinking');
    else if (liteSurfaceState === 'alerting') orb.classList.add('pip-alerting');
    else if (liteSurfaceState === 'show_me') orb.classList.add('pip-show-me');
    else if (liteSurfaceState === 'responding' || liteSurfaceState === 'prompting') orb.classList.add('pip-active');
    else orb.classList.add('pip-idle');
  }

  // ── Trigger: worker queue pending ───────────────────────────────────────
  // Only updates the badge — does NOT auto-populate the column.
  // Column is reserved for validation plan, Show Me, and explicit Shay-Shay responses.
  function onWorkerQueueUpdate(e) {
    const count = (e.detail && e.detail.count) || 0;
    // Keep the queue event available for future UI affordances, but do not
    // present worker debt as an undismissable Shay notification badge.
    window.__pipWorkerQueueCount = count;
  }

  // ── Trigger: build complete with low score ───────────────────────────────
  function onBuildComplete(e) {
    if (!shouldShowProactiveMessages()) return;
    const score = e.detail && e.detail.score;
    const total = (e.detail && e.detail.total) || 5;
    if (score != null && score < total && !isDismissed(TRIGGERS.build_warn)) {
      const issues = total - score;
      showMessage(
        'FAMtastic Score: ' + score + '/' + total + ' — ' + issues + ' issue' + (issues > 1 ? 's' : '') + ' found.',
        [
          { label: 'Auto-fix', action: () => { sendToChat('fix the verification issues'); closeCallout(); } },
          { label: 'View details', action: () => { window.StudioShell && StudioShell.switchTab('deploy'); closeCallout(); } },
          { label: 'Dismiss', action: () => dismiss(TRIGGERS.build_warn), secondary: true },
        ]
      );
    } else if (score != null && score === total) {
      flashCallout('FAMtastic Score: ' + score + '/' + total + ' \u2713', 2500);
    }
  }

  // ── Trigger: idle + unsaved work ────────────────────────────────────────
  function resetIdleTimer() {
    clearTimeout(idleTimer);
    idleTimer = setTimeout(function () {
      if (shouldShowProactiveMessages() && window.hasUnsavedWork && !isDismissed(TRIGGERS.idle_unsaved)) {
        showMessage(
          'You have unsaved work. Deploy to staging for a checkpoint?',
          [
            { label: 'Deploy staging', action: () => { sendToChat('deploy to staging'); closeCallout(); } },
            { label: 'Later', action: () => dismiss(TRIGGERS.idle_unsaved), secondary: true },
          ]
        );
      }
    }, 5 * 60 * 1000);
  }

  // ── Trigger: briefed idle ────────────────────────────────────────────────
  function checkBriefedIdle() {
    if (isDismissed(TRIGGERS.briefed_idle)) return;
    if (!shouldShowProactiveMessages()) return;
    const state = window.cachedStudioState;
    if (state && state.state === 'briefed' && !window.buildInProgress) {
      showMessage(
        'Your brief is ready. Start the first build?',
        [
          { label: 'Build it \u2192', action: () => { sendToChat('Build from brief'); closeCallout(); } },
          { label: 'Not yet', action: () => dismiss(TRIGGERS.briefed_idle), secondary: true },
        ]
      );
    }
  }

  // ── Persistent dismiss (localStorage — survives page refresh) ─────────────
  var _suppressMessages = false;
  var _suppressTimer = null;

  function isDismissed(key) {
    return !!localStorage.getItem('pip-dismiss:' + key);
  }

  function dismiss(key) {
    if (key) localStorage.setItem('pip-dismiss:' + key, '1');
    closeCallout();
    // Suppress any follow-on message for 2 seconds (prevents validation
    // plan or other triggers from immediately re-populating the column)
    _suppressMessages = true;
    if (_suppressTimer) clearTimeout(_suppressTimer);
    _suppressTimer = setTimeout(function () { _suppressMessages = false; }, 2000);
    console.log('[shay-shay] dismissed:', key, '— messages suppressed for 2s');
  }

  // ── Callout ──────────────────────────────────────────────────────────────
  function showMessage(msg, actions) {
    const callout   = document.getElementById('pip-callout');
    const msgEl     = document.getElementById('pip-callout-msg');
    const actionsEl = document.getElementById('pip-callout-actions');
    if (!callout || !msgEl || !actionsEl) return;

    msgEl.textContent = msg;
    actionsEl.innerHTML = '';

    (actions || []).forEach(function (a) {
      const btn = document.createElement('button');
      btn.className = 'pip-action-btn ' + (a.secondary ? 'secondary' : 'primary');
      btn.textContent = a.label;
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        if (a.action) a.action();
      });
      actionsEl.appendChild(btn);
    });

    callout.classList.remove('hidden');
    const orb = document.getElementById('pip-orb');
    if (orb) {
      orb.classList.add('pip-active');
      orb.classList.remove('pip-idle');
    }
  }

  function flashCallout(msg, duration) {
    showMessage(msg, []);
    setTimeout(closeCallout, duration || 2000);
  }

  function toggleCallout() {
    const callout = document.getElementById('pip-callout');
    if (!callout) return;
    if (callout.classList.contains('hidden')) {
      // Show contextual status if no pending message
      const msgEl = document.getElementById('pip-callout-msg');
      if (msgEl && !msgEl.textContent) {
        const site = (window.config && window.config.tag) || '...';
        const state = window.cachedStudioState;
        msgEl.textContent = 'Active site: ' + site + '. ' + (state && state.state === 'built' ? 'Last build complete.' : 'Ready to build.');
        const actionsEl = document.getElementById('pip-callout-actions');
        if (actionsEl) actionsEl.innerHTML = '';
      }
      callout.classList.remove('hidden');
    } else {
      closeCallout();
    }
  }

  function closeCallout() {
    // Hide floating callout (used for Show Me mode)
    const callout = document.getElementById('pip-callout');
    if (callout) callout.classList.add('hidden');
    applyLiteSurfaceState('idle');
    const msgEl    = document.getElementById('pip-callout-msg');
    const actionsEl = document.getElementById('pip-callout-actions');
    if (msgEl) msgEl.textContent = '';
    if (actionsEl) while (actionsEl.firstChild) actionsEl.removeChild(actionsEl.firstChild);

    // Also clear the column response area — showMessage() was overridden to route
    // messages to the column, so dismiss must clear the column too
    const colArea = document.getElementById('pip-response-area');
    const colRow  = document.getElementById('pip-action-row');
    if (colArea) { while (colArea.firstChild) colArea.removeChild(colArea.firstChild); colArea.className = ''; }
    if (colRow)  { while (colRow.firstChild) colRow.removeChild(colRow.firstChild); colRow.style.display = 'none'; }
  }

  // ── Notification badge ───────────────────────────────────────────────────
  function setBadge(count) {
    badgeCount = count;
    const badge = document.getElementById('pip-badge');
    if (!badge) return;
    if (count > 0) {
      badge.textContent = count > 9 ? '9+' : String(count);
      badge.classList.remove('hidden');
    } else {
      badge.classList.add('hidden');
    }
  }

  // ── Mode popup ───────────────────────────────────────────────────────────
  function showModePopup() {
    closeModePopup();
    const orb = document.getElementById('pip-orb');
    if (!orb) return;

    const popup = document.createElement('div');
    popup.id = 'pip-mode-popup';
    popup.className = 'pip-mode-popup';

    const modes = [
      { id: 'idle',    icon: '\uD83D\uDCA4', label: 'Idle — quiet mode' },
      { id: 'show-me', icon: '\uD83D\uDC46', label: 'Show Me — guided' },
      { id: 'do-it',   icon: '\u26A1',       label: 'Do It — auto-execute' },
    ];

    modes.forEach(function (m) {
      const item = document.createElement('div');
      item.className = 'pip-mode-item' + (pipMode === m.id ? ' active' : '');
      const icon = document.createElement('span');
      icon.className = 'pip-mode-icon';
      icon.textContent = m.icon;
      item.appendChild(icon);
      item.appendChild(document.createTextNode(' ' + m.label));
      item.addEventListener('click', function () {
        pipMode = m.id;
        closeModePopup();
        if (pipMode === 'idle') closeCallout();
        if (pipMode === 'show-me') {
          showMessage('Show Me mode active. I\'ll highlight what to do next.', [
            { label: 'Got it', action: closeCallout },
          ]);
        }
      });
      popup.appendChild(item);
    });

    const dockItem = document.createElement('div');
    dockItem.className = 'pip-mode-item';
    dockItem.appendChild(document.createTextNode('\u21AA Dock Right'));
    dockItem.addEventListener('click', function () {
      resetLitePosition();
      closeModePopup();
    });
    popup.appendChild(dockItem);

    orb.appendChild(popup);

    setTimeout(function () {
      document.addEventListener('click', closeModePopup, { once: true });
    }, 50);
  }

  function closeModePopup() {
    const popup = document.getElementById('pip-mode-popup');
    if (popup) popup.remove();
  }

  // ── Show Me mode — highlight target element ───────────────────────────────
  function showMeElement(selector, message, actions) {
    if (pipMode !== 'show-me') return;
    const target = document.querySelector(selector);
    if (!target) return;

    if (!highlightEl) {
      highlightEl = document.createElement('div');
      highlightEl.className = 'pip-highlight-ring';
      document.body.appendChild(highlightEl);
    }

    const rect = target.getBoundingClientRect();
    highlightEl.style.top    = (rect.top  - 4 + window.scrollY) + 'px';
    highlightEl.style.left   = (rect.left - 4 + window.scrollX) + 'px';
    highlightEl.style.width  = (rect.width  + 8) + 'px';
    highlightEl.style.height = (rect.height + 8) + 'px';

    showMessage(message || 'Here\'s what to do next.', actions || [
      { label: 'Got it', action: function () { clearHighlight(); closeCallout(); } },
    ]);
  }

  function clearHighlight() {
    if (highlightEl) { highlightEl.remove(); highlightEl = null; }
  }

  // ── Do It mode — pre-fill chat input ─────────────────────────────────────
  function doIt(command) {
    const input = document.getElementById('chat-input');
    if (!input) return;
    input.value = command;
    input.style.borderColor = 'var(--fam-gold)';
    input.focus();
    setTimeout(function () { input.style.borderColor = ''; }, 1200);
  }

  // ── Helper: send command to chat ─────────────────────────────────────────
  function sendToChat(text) {
    if (window.ws && window.ws.readyState === WebSocket.OPEN) {
      if (window.addMessage) window.addMessage('user', text);
      window.ws.send(JSON.stringify({ type: 'chat', content: text }));
      if (window.steps !== undefined) {
        window.steps = [];
        window.stepStart = null;
        if (window.addStep) window.addStep('Processing...');
      }
    } else {
      const input = document.getElementById('chat-input');
      if (input) { input.value = text; input.focus(); }
    }
  }

  // ── Shay-Shay context builder (outer scope — used by both direct input and desk) ──
  function getShayShayContext() {
    var ctxPage = window.activePage || (document.getElementById('ctx-active-page') && document.getElementById('ctx-active-page').textContent) || null;
    var ctxTab = window.StudioShell && window.StudioShell.activeTabId ? window.StudioShell.activeTabId : null;
    var ctxRail = window.StudioShell && window.StudioShell.activeRailItemId ? window.StudioShell.activeRailItemId : null;
    var famScore = null;
    var clientSnapshot = typeof window.buildShayShayClientSnapshot === 'function'
      ? window.buildShayShayClientSnapshot()
      : {};
    if (window.cachedStudioState) {
      if (window.cachedStudioState.fam_score != null) famScore = window.cachedStudioState.fam_score;
      else if (window.cachedStudioState.spec && window.cachedStudioState.spec.fam_score != null) famScore = window.cachedStudioState.spec.fam_score;
    }
    return {
      active_site: (window.config && window.config.tag) || null,
      active_page: ctxPage,
      active_tab: ctxTab,
      fam_score: famScore,
      active_rail: ctxRail,
      ui_state: clientSnapshot.ui_state || null,
      workspace_state: clientSnapshot.workspace_state || null,
      component_state: clientSnapshot.component_state || null,
      preview_state: clientSnapshot.preview_state || null,
    };
  }

  // ── Column: direct input wiring ─────────────────────────────────────────
  function initDirectInput() {
    var input = document.getElementById('pip-direct-input');
    var sendBtn = document.getElementById('pip-send-btn');
    if (!input) return;

    function sendDirect(forcedText) {
      var text = String(forcedText != null ? forcedText : input.value).trim();
      if (!text) return;
      input.value = '';
      openLitePanel({ silent: true });
      applyLiteSurfaceState('prompting');
      appendDeskMessage('user', text);
      showColumnResponse(null, true); // show typing indicator
      sendToShayShay(text, beginShayThinking());
    }

    function sendToShayShay(message, thinkStart) {
      liteTurnCount++;
      var currentTurn = liteTurnCount;

      function doRequest() {
        var context = getShayShayContext();
        var payload = liteBridgeClient.prepareRequestPayload(message, context);

        fetch('/api/shay-shay', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
          .then(function (r) { return r.json(); })
          .then(function (data) {
            liteBridgeClient.storeResponseResult(data);
            liteBridgeClient.markResponseReceived();
            // Show last bridge op hint if present
            if (data.bridge_result && data.bridge_result.op) {
              var bPath = data.bridge_result.path || data.bridge_result.command || '';
              setShayStatusHint('Last bridge: ' + data.bridge_result.op + (bPath ? ' ' + bPath : ''));
            }
            completeShayThinkingWindow(thinkStart, function () {
              hideTyping();
              endShayThinking();
              if (data.action === 'route_to_chat') {
                // Route message to Studio chat — Shay-Shay is delegating
                if (window.ws && window.ws.readyState === WebSocket.OPEN) {
                  if (window.addMessage) window.addMessage('user', data.message || message);
                  window.ws.send(JSON.stringify({ type: 'chat', content: data.message || message }));
                }
                showColumnResponse('Sent to Studio: "' + (data.message || message) + '"', false);
              } else if (data.action === 'system_command') {
                showColumnResponse(data.response || 'Running command\u2026', false);
                if (data.command === 'restart' && window.ws) {
                  window.ws.send(JSON.stringify({ type: 'chat', content: 'restart studio' }));
                }
              } else if (data.action === 'show_me') {
                applyLiteSurfaceState('show_me');
                showColumnResponse(data.response || 'Opening Show Me\u2026', false);
              } else if (data.action === 'suggest_brainstorm') {
                showColumnResponse(data.response || 'Want to switch to brainstorm mode?', false);
                showColumnActions([
                  {
                    label: 'Switch to Brainstorm',
                    action: function () {
                      if (window.StudioShell && typeof StudioShell.switchMode === 'function') {
                        StudioShell.switchMode('brainstorm');
                      }
                      showColumnActions([]);
                    }
                  },
                  {
                    label: 'Stay Here',
                    action: function () { showColumnActions([]); },
                    secondary: true
                  }
                ]);
              } else if (data.action === 'job_plan') {
                showJobPlanCard(data.jobs || [], data.response || 'Job plan created.');
                showColumnActions([]);
              } else {
                showColumnResponse(data.response || data.error || 'No response.', false);
                showColumnActions([]);
              }
              // Usage metadata
              if (data.usage) {
                var usageLine = '\u21b3 ' + (data.usage.input_tokens || 0) + '\u2192' + (data.usage.output_tokens || 0) + ' tokens' + (data.usage.cost_usd ? ' \u00b7 $' + Number(data.usage.cost_usd).toFixed(4) : '');
                appendDeskMessage('system', usageLine, { subtle: true });
              }
              // After 3 Lite turns, show "Open in Desk" affordance
              if (currentTurn >= 3) {
                showOpenInDeskAffordance();
              }
            });
          })
          .catch(function (err) {
            liteBridgeClient.markResponseReceived();
            completeShayThinkingWindow(thinkStart, function () {
              hideTyping();
              applyLiteSurfaceState('alerting');
              setOrbState('IDLE');
              showColumnResponse('Error reaching Shay-Shay: ' + err.message, false);
            });
          });
      }

      liteBridgeClient.enqueue(doRequest);
    }

    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendDirect(); }
    });

    if (sendBtn) sendBtn.addEventListener('click', sendDirect);

    window.__pipSendDirect = sendDirect;
  }

  // ── Column: response area ───────────────────────────────────────────────
  function getDeskTranscriptArea() {
    return document.getElementById('pip-response-area');
  }

  function updateDeskTranscriptState() {
    var area = getDeskTranscriptArea();
    var dynamic = document.getElementById('pip-dynamic-area');
    if (!area) return;
    var hasMessages = !!area.querySelector('.pip-msg, .job-plan-card, .pip-typing');
    shayDeskHasTranscript = hasMessages;
    area.className = hasMessages ? 'has-content' : '';
    if (dynamic) dynamic.style.display = hasMessages ? 'none' : '';
  }

  function scrollDeskTranscriptToBottom() {
    var area = getDeskTranscriptArea();
    if (!area) return;
    area.scrollTop = area.scrollHeight;
  }

  function appendDeskMessage(role, text, opts) {
    var area = getDeskTranscriptArea();
    if (!area || !text) return null;
    var options = opts || {};
    var row = document.createElement('div');
    row.className = 'pip-msg pip-msg-' + (role || 'assistant') + (options.subtle ? ' is-subtle' : '');
    if (options.id) row.id = options.id;

    var bubble = document.createElement('div');
    bubble.className = 'pip-response-bubble';
    bubble.textContent = text;
    row.appendChild(bubble);

    area.appendChild(row);
    updateDeskTranscriptState();
    scrollDeskTranscriptToBottom();
    return row;
  }

  function showColumnResponse(text, isTyping) {
    var area = getDeskTranscriptArea();
    if (!area) return;

    if (isTyping) {
      hideTyping();
      var typing = document.createElement('div');
      typing.className = 'pip-typing';
      typing.id = 'pip-typing';
      for (var i = 0; i < 3; i++) { var dot = document.createElement('span'); typing.appendChild(dot); }
      area.appendChild(typing);
      updateDeskTranscriptState();
      scrollDeskTranscriptToBottom();
      return;
    }

    if (text) {
      applyLiteSurfaceState('responding');
      appendDeskMessage('assistant', text);
    } else {
      updateDeskTranscriptState();
    }
  }

  function hideTyping() {
    var typing = document.getElementById('pip-typing');
    if (typing) typing.remove();
    updateDeskTranscriptState();
  }

  function showColumnActions(actions) {
    var row = document.getElementById('pip-action-row');
    if (!row) return;
    row.innerHTML = '';
    if (!actions || !actions.length) { row.style.display = 'none'; return; }
    actions.forEach(function (a) {
      var btn = document.createElement('button');
      btn.className = 'pip-action-btn ' + (a.secondary ? 'secondary' : 'primary');
      btn.textContent = a.label;
      btn.addEventListener('click', function (e) { e.stopPropagation(); if (a.action) a.action(); });
      row.appendChild(btn);
    });
    row.style.display = 'flex';
  }

  // ── Job Plan Card ────────────────────────────────────────────────────────
  var STATUS_LABEL = { pending: 'Pending', blocked: 'Blocked', approved: 'Approved', parked: 'Parked', running: 'Running', done: 'Done', failed: 'Failed' };

  function showJobPlanCard(jobs, introText) {
    var area = getDeskTranscriptArea();
    if (!area) return;

    if (introText) {
      appendDeskMessage('assistant', introText);
    }

    var card = document.createElement('div');
    card.className = 'job-plan-card';

    jobs.forEach(function (job, idx) {
      var row = document.createElement('div');
      row.className = 'job-plan-row';
      row.id = 'job-row-' + job.id;

      var meta = document.createElement('div');
      meta.className = 'job-plan-meta';

      var label = document.createElement('span');
      label.className = 'job-plan-label';
      label.textContent = (idx + 1) + '. ' + (job.payload && job.payload.description ? job.payload.description : job.type);
      meta.appendChild(label);

      var badge = document.createElement('span');
      badge.className = 'job-plan-status job-status-' + (job.status || 'pending');
      badge.textContent = STATUS_LABEL[job.status] || job.status;
      badge.id = 'job-badge-' + job.id;
      meta.appendChild(badge);

      row.appendChild(meta);

      var btns = document.createElement('div');
      btns.className = 'job-plan-btns';
      btns.id = 'job-btns-' + job.id;

      var approveBtn = document.createElement('button');
      approveBtn.className = 'job-btn job-btn-approve';
      approveBtn.textContent = 'Approve';
      approveBtn.disabled = job.status !== 'pending';
      approveBtn.addEventListener('click', function () { jobAction('approve', job.id); });

      var parkBtn = document.createElement('button');
      parkBtn.className = 'job-btn job-btn-park';
      parkBtn.textContent = 'Park';
      parkBtn.disabled = job.status !== 'pending' && job.status !== 'blocked';
      parkBtn.addEventListener('click', function () { jobAction('park', job.id); });

      btns.appendChild(approveBtn);
      btns.appendChild(parkBtn);
      row.appendChild(btns);
      card.appendChild(row);
    });

    area.appendChild(card);
    updateDeskTranscriptState();
    scrollDeskTranscriptToBottom();
  }

  function jobAction(action, jobId) {
    fetch('/api/jobs/' + action + '/' + jobId, { method: 'POST' })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (data.job) {
          var badge = document.getElementById('job-badge-' + jobId);
          if (badge) {
            badge.textContent = STATUS_LABEL[data.job.status] || data.job.status;
            badge.className = 'job-plan-status job-status-' + data.job.status;
          }
          var btns = document.getElementById('job-btns-' + jobId);
          if (btns) {
            var approveBtn = btns.querySelector('.job-btn-approve');
            var parkBtn = btns.querySelector('.job-btn-park');
            if (approveBtn) approveBtn.disabled = data.job.status !== 'pending';
            if (parkBtn) parkBtn.disabled = data.job.status !== 'pending' && data.job.status !== 'blocked';
          }
        }
      })
      .catch(function (e) { console.error('[job-plan] action failed:', e.message); });
  }

  // ── Column: showMessage now targets the column, not floating callout ─────
  // Override: messages go to column response area, actions to action row
  var _origShowMessage = null; // capture original if needed

  // ── Column: dynamic area (todo / placeholder) ────────────────────────────
  function loadDynamicArea() {
    var area = document.getElementById('pip-dynamic-area');
    if (!area) return;

    fetch('/api/validation-plan')
      .then(function (r) { return r.json(); })
      .then(function (plan) {
        if (!plan || plan.status === 'no_plan') {
          showPlaceholder(area);
          return;
        }
        renderTodoList(area, plan);
      })
      .catch(function () { showPlaceholder(area); });
  }

  function showPlaceholder(area) {
    if (shayDeskHasTranscript) {
      area.innerHTML = '';
      area.style.display = 'none';
      return;
    }
    area.style.display = '';
    area.innerHTML = '';
    var wrap = document.createElement('div');
    wrap.className = 'pip-placeholder';
    var icon = document.createElement('div');
    icon.className = 'pip-placeholder-icon';
    icon.textContent = '\u2736'; // ✶
    wrap.appendChild(icon);
    var text = document.createElement('div');
    text.className = 'pip-placeholder-text';
    text.textContent = 'What can I help with?\n\nTell me what to build or ask me anything about the active site.';
    wrap.appendChild(text);
    area.appendChild(wrap);
  }

  function renderTodoList(area, plan) {
    if (shayDeskHasTranscript) {
      area.innerHTML = '';
      area.style.display = 'none';
      return;
    }
    area.style.display = '';
    area.innerHTML = '';

    var header = document.createElement('div');
    header.className = 'pip-dynamic-header';
    var total = plan.steps.length;
    var done  = plan.steps.filter(function (s) { return s.status !== 'pending'; }).length;
    header.textContent = plan.title || 'Validation';
    area.appendChild(header);

    // Progress bar
    var pct = total ? Math.round(done / total * 100) : 0;
    var progressWrap = document.createElement('div');
    progressWrap.className = 'pip-todo-progress';
    var fill = document.createElement('div');
    fill.className = 'pip-todo-progress-fill';
    fill.style.width = pct + '%';
    progressWrap.appendChild(fill);
    area.appendChild(progressWrap);

    var pctLabel = document.createElement('div');
    pctLabel.style.cssText = 'font-size:10px;color:var(--fam-text-3);padding:2px 4px 8px;';
    pctLabel.textContent = done + '/' + total + ' steps complete';
    area.appendChild(pctLabel);

    plan.steps.forEach(function (step) {
      var isCurrent = (step.id - 1 === plan.current_step && step.status === 'pending');
      var item = document.createElement('div');
      item.className = 'pip-todo-item' +
        (isCurrent ? ' active' : '') +
        (step.status === 'passed' || step.status === 'skipped' ? ' done' : '') +
        (step.status === 'failed' ? ' failed' : '');

      var num = document.createElement('div');
      num.className = 'pip-todo-num';
      if (step.status === 'passed') num.textContent = '\u2713';
      else if (step.status === 'failed') num.textContent = '\u2717';
      else if (step.status === 'skipped') num.textContent = '\u29B8';
      else num.textContent = String(step.id);
      item.appendChild(num);

      var label = document.createElement('span');
      label.textContent = step.title;
      item.appendChild(label);

      // Clicking a pending/current item prompts it in the column
      if (step.status === 'pending') {
        item.addEventListener('click', function () {
          showColumnResponse(step.description, false);
          showColumnActions([
            { label: '\uD83D\uDC46 Show Me', action: function () { triggerShowMe(step); } },
            { label: '\u2713 Passed', action: function () { markValidationStep(step.id, 'passed'); setOrbState('IDLE'); } },
            { label: '\u2717 Failed',  action: function () { markValidationStep(step.id, 'failed'); setOrbState('IDLE'); } },
          ]);
        });
      }

      area.appendChild(item);
    });
  }

  // ── Override showMessage to target column (not floating callout) ─────────
  // The original showMessage showed a floating callout near the orb.
  // Now messages go to the column response area so they're always visible.
  function showMessage(msg, actions) {
    if (_suppressMessages) return; // suppress follow-on messages after dismiss
    openLitePanel({ silent: true });
    applyLiteSurfaceState('alerting');
    appendDeskMessage('assistant', msg, { subtle: true });
    showColumnActions(actions || []);
  }

  // ── Orb state machine ─────────────────────────────────────────────────────
  // Single transition point for #pip-dynamic-area. All callers go through here.
  function setOrbState(state, data) {
    currentOrbState = state;
    var area = document.getElementById('pip-dynamic-area');
    if (!area) return;
    // Pre-clear so each renderer starts clean
    while (area.firstChild) area.removeChild(area.firstChild);
    if (state === 'IDLE') {
      loadDynamicArea();
    } else if (state === 'BRIEF_PROGRESS') {
      renderBriefInDynamic((data && data.answers) || {}, (data && data.pct) || 0);
    } else if (state === 'BRAINSTORM_ACTIVE') {
      renderDynamicModeContent('brainstorm');
    } else if (state === 'REVIEW_ACTIVE') {
      renderDynamicModeContent('review');
    } else if (state === 'SHAY_THINKING') {
      renderShayThinking();
    }
  }

  function renderShayThinking() {
    var area = document.getElementById('pip-dynamic-area');
    if (!area) return;
    var wrap = document.createElement('div');
    wrap.className = 'pip-shay-thinking';
    var dots = document.createElement('div');
    dots.className = 'shay-thinking-dots';
    for (var i = 0; i < 3; i++) { var d = document.createElement('span'); dots.appendChild(d); }
    var label = document.createElement('div');
    label.className = 'shay-thinking-label';
    label.textContent = 'Shay is on it\u2026';
    wrap.appendChild(dots);
    wrap.appendChild(label);
    area.appendChild(wrap);

    var orb = document.getElementById('pip-orb');
    if (orb) { orb.classList.remove('pip-idle', 'pip-active'); orb.classList.add('pip-thinking'); }
  }

  // ── Validation Mode ───────────────────────────────────────────────────────
  var validationPlan = null;

  function checkValidationPlan() {
    fetch('/api/validation-plan')
      .then(function (r) { return r.json(); })
      .then(function (plan) {
        if (!plan || plan.status === 'no_plan') return;
        validationPlan = plan;

        var currentStep = plan.steps[plan.current_step];
        if (!currentStep || currentStep.status !== 'pending') {
          if (plan.status === 'complete') {
            showValidationComplete(plan);
          }
          return;
        }

        // Show welcome on first step
        if (plan.current_step === 0 && plan.status === 'not_started') {
          showValidationWelcome(plan);
        } else {
          showStepPrompt(currentStep, plan);
        }
      })
      .catch(function () { /* no plan or server not running — silent */ });
  }

  function showValidationWelcome(plan) {
    showMessage(
      'Welcome back, Fritz. Let\'s validate the new Studio together. I have a ' + plan.steps.length + '-step plan. I\'ll guide you through each one, show you what to look for, and collect data as we go. Ready to start?',
      [
        { label: 'Let\'s go \u2192', action: function () { startValidationStep(plan.steps[0]); } },
        { label: 'Show me the plan', action: function () { showFullPlan(plan); } },
        { label: 'Not now', action: closeCallout, secondary: true },
      ]
    );
  }

  function startValidationStep(step) {
    closeCallout();
    setTimeout(function () { showStepPrompt(step, validationPlan); }, 300);
  }

  function showStepPrompt(step, plan) {
    var total = plan.steps.length;
    showMessage(
      'Step ' + step.id + ' of ' + total + ': ' + step.title + '\n\n' + step.description,
      [
        { label: '\uD83D\uDC46 Show Me', action: function () { triggerShowMe(step); } },
        { label: '\u2713 Passed', action: function () { markValidationStep(step.id, 'passed'); } },
        { label: '\u2717 Failed', action: function () { markValidationStep(step.id, 'failed'); } },
        { label: 'Skip', action: function () { markValidationStep(step.id, 'skipped'); }, secondary: true },
        { label: '\u00d7 Dismiss', action: function () { dismissStepPrompt(); }, secondary: true },
      ]
    );
  }

  function dismissStepPrompt() {
    // Hide column response + actions without marking any step outcome.
    // Step stays pending — next Studio load will re-show the prompt.
    var area = document.getElementById('pip-response-area');
    var row = document.getElementById('pip-action-row');
    if (area) { while (area.firstChild) area.removeChild(area.firstChild); area.className = ''; }
    if (row) { while (row.firstChild) row.removeChild(row.firstChild); row.style.display = 'none'; }
    applyLiteSurfaceState('idle');
  }

  function triggerShowMe(step) {
    applyLiteSurfaceState('show_me');
    var target = document.querySelector(step.show_me_target);
    if (target) {
      showMeElement(step.show_me_target, step.show_me_instruction, [
        { label: '\u2713 Passed', action: function () { clearHighlight(); markValidationStep(step.id, 'passed'); } },
        { label: '\u2717 Failed', action: function () { clearHighlight(); markValidationStep(step.id, 'failed'); } },
      ]);
    } else {
      showMessage(
        'Can\'t find \'' + step.show_me_target + '\' on the current screen. This is likely a gap.\n\nStep ' + step.id + ': ' + step.title,
        [
          { label: '\u2717 Mark failed', action: function () { markValidationStep(step.id, 'failed', { gap: 'element_not_found', selector: step.show_me_target }); } },
          { label: 'Skip', action: function () { markValidationStep(step.id, 'skipped'); }, secondary: true },
        ]
      );
    }
  }

  function markValidationStep(stepId, status, extraData) {
    var data = extraData || {};
    data.marked_at = new Date().toISOString();
    fetch('/api/validation-plan/step/' + stepId, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: status, data: data }),
    })
      .then(function (r) { return r.json(); })
      .then(function (result) {
        if (!result.ok) { console.error('[validation] step update failed', result); return; }
        // Reload plan and advance to next step
        return fetch('/api/validation-plan').then(function (r) { return r.json(); });
      })
      .then(function (plan) {
        if (!plan) return;
        validationPlan = plan;
        var nextStep = plan.steps[plan.current_step];
        if (plan.status === 'complete' || !nextStep) {
          showValidationComplete(plan);
        } else {
          showStepPrompt(nextStep, plan);
        }
      })
      .catch(function (e) { console.error('[validation] error:', e); });
  }

  function showFullPlan(plan) {
    var summary = plan.steps.map(function (s, i) {
      var icon = s.status === 'passed' ? '\u2713' : s.status === 'failed' ? '\u2717' : s.status === 'skipped' ? '\u29B8' : String(i + 1) + '.';
      return icon + ' ' + s.title;
    }).join('\n');
    showMessage('Validation Plan: ' + plan.title + '\n\n' + summary, [
      { label: 'Start step 1', action: function () { startValidationStep(plan.steps[0]); } },
      { label: 'Close', action: closeCallout, secondary: true },
    ]);
  }

  function showValidationComplete(plan) {
    var passed  = plan.steps.filter(function (s) { return s.status === 'passed'; }).length;
    var failed  = plan.steps.filter(function (s) { return s.status === 'failed'; }).length;
    var skipped = plan.steps.filter(function (s) { return s.status === 'skipped'; }).length;

    showMessage(
      'Validation complete! ' + passed + ' passed, ' + failed + ' failed, ' + skipped + ' skipped.\n\nGenerating gap report now\u2026',
      [
        { label: 'View report', action: function () {
          fetch('/api/validation-plan/report', { method: 'POST' })
            .then(function (r) { return r.json(); })
            .then(function (data) {
              closeCallout();
              if (window.addMessage) addMessage('assistant', 'Gap report written to docs/session15-validation-report.md. ' + data.passed + ' passed, ' + data.failed + ' failed.');
            });
        }},
        { label: 'Close', action: closeCallout, secondary: true },
      ]
    );
  }

  // ── Public API ────────────────────────────────────────────────────────────
  // ── Shay status hint ────────────────────────────────────────────────────
  function setShayStatusHint(text) {
    var hint = document.getElementById('shay-status-hint');
    if (!hint) {
      // Try to create it in the Desk panel if it doesn't exist
      var deskShell = document.getElementById('shay-desk-shell');
      if (deskShell) {
        hint = document.createElement('div');
        hint.id = 'shay-status-hint';
        hint.style.cssText = 'padding:4px 14px;font-size:10px;color:var(--fam-text-3,rgba(255,255,255,0.4));font-style:italic;flex:0 0 auto;';
        deskShell.insertBefore(hint, deskShell.firstChild);
      }
    }
    if (hint) hint.textContent = text || '';
  }

  // ── Open in Desk affordance ─────────────────────────────────────────────
  var _openInDeskShown = false;

  function showOpenInDeskAffordance() {
    if (_openInDeskShown) return;
    var area = getDeskTranscriptArea();
    if (!area) return;
    _openInDeskShown = true;

    var btn = document.createElement('button');
    btn.className = 'pip-open-desk-btn';
    btn.textContent = 'Open in Desk \u2192';
    btn.style.cssText = 'display:block;margin:8px auto 4px;padding:6px 14px;border-radius:8px;border:1px solid rgba(167,139,250,0.35);background:rgba(167,139,250,0.08);color:var(--fam-purple,#a78bfa);font-size:11px;cursor:pointer;';
    btn.addEventListener('click', function () {
      openShayDeskFromLite();
      btn.remove();
    });

    var wrapper = document.createElement('div');
    wrapper.className = 'pip-msg pip-msg-system';
    wrapper.appendChild(btn);
    area.appendChild(wrapper);
    scrollDeskTranscriptToBottom();
  }

  function openShayDeskFromLite() {
    // Reveal the Desk panel — switch to the Shay Desk tab or sidebar
    if (window.StudioShell && typeof StudioShell.switchTab === 'function') {
      StudioShell.switchTab('shay');
    } else {
      // Fallback: find and click the shay-desk rail button
      var rail = document.querySelector('[data-rail="shay"], [data-tab="shay"], [data-hook="shay-desk"]');
      if (rail) rail.click();
    }

    // Collect last 3 Lite turns from the response area
    var area = getDeskTranscriptArea();
    var turns = [];
    if (area) {
      var msgs = area.querySelectorAll('.pip-msg-user, .pip-msg-assistant');
      var recent = Array.from(msgs).slice(-6); // last 3 pairs
      recent.forEach(function (el) {
        var role = el.classList.contains('pip-msg-user') ? 'user' : 'assistant';
        var bubble = el.querySelector('.pip-response-bubble');
        if (bubble) turns.push({ role: role, content: bubble.textContent });
      });
    }

    // Store handoff context for next desk message
    deskBridgeClient._pendingHandoff = turns.length > 0 ? { turns: turns } : null;
  }

  // ── Commit proposal banner ──────────────────────────────────────────────
  function showCommitProposalBanner(commitMessage) {
    var area = getShayDeskTranscriptArea();
    if (!area) return;

    var banner = document.createElement('div');
    banner.className = 'shay-commit-proposal';
    banner.style.cssText = 'margin:8px 0;padding:10px 14px;border-radius:10px;border:1px solid rgba(245,196,0,0.3);background:rgba(245,196,0,0.07);display:flex;align-items:center;gap:10px;flex-wrap:wrap;';

    var label = document.createElement('span');
    label.style.cssText = 'flex:1;font-size:12px;color:var(--fam-text);';
    label.textContent = 'Commit proposed: ' + commitMessage;
    banner.appendChild(label);

    var approveBtn = document.createElement('button');
    approveBtn.textContent = 'Approve';
    approveBtn.style.cssText = 'padding:5px 12px;border-radius:6px;border:1px solid rgba(245,196,0,0.4);background:rgba(245,196,0,0.15);color:var(--fam-gold,#f5c400);font-size:11px;cursor:pointer;';
    approveBtn.addEventListener('click', function () {
      fetch('/api/bridge/exec', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command: 'git commit -am "' + commitMessage.replace(/"/g, '\\"') + '"' }),
      }).then(function (r) { return r.json(); }).then(function (data) {
        label.textContent = data.exitCode === 0 ? 'Committed: ' + commitMessage : 'Error: ' + (data.stderr || data.error || 'unknown');
        approveBtn.remove();
        dismissBtn.remove();
      }).catch(function (err) {
        label.textContent = 'Commit failed: ' + err.message;
      });
    });
    banner.appendChild(approveBtn);

    var dismissBtn = document.createElement('button');
    dismissBtn.textContent = 'Dismiss';
    dismissBtn.style.cssText = 'padding:5px 12px;border-radius:6px;border:1px solid var(--fam-border);background:transparent;color:var(--fam-text-2);font-size:11px;cursor:pointer;';
    dismissBtn.addEventListener('click', function () { banner.remove(); });
    banner.appendChild(dismissBtn);

    area.appendChild(banner);
    scrollShayDeskTranscriptToBottom();
  }

  /* STANDING RULE: Every new WebSocket event added to server.js MUST have a
     corresponding UI handler here that renders visible feedback in Shay Desk.
     No silent events. No unhandled message types. */
  function handlePipelineWsEvent(msg) {
    if (!msg || !msg.type) return;
    var ts = new Date().toTimeString().slice(0, 8);
    var t = msg.type;
    var label, detail;

    switch (t) {
      case 'character-pipeline-step':
        appendShayDeskMessage('system', '\u2699 [' + ts + '] ' + t + ': ' + (msg.label || msg.message || ''), { subtle: true });
        break;
      case 'character-pipeline-complete':
        appendShayDeskMessage('system', '\u2713 [' + ts + '] character pipeline complete — ' + (msg.assessment || ''), { subtle: true });
        break;
      case 'character-pipeline-error':
        appendShayDeskMessage('system', '\u2717 [' + ts + '] character pipeline error: ' + (msg.error || 'unknown'), { subtle: true });
        break;
      case 'pose-generated':
        appendShayDeskMessage('system', '\u2699 [' + ts + '] pose-generated: pose ' + (msg.pose_index || '') + ' saved', { subtle: true });
        break;
      case 'poses-complete':
        label = msg.results ? msg.results.length + ' pose(s)' : 'done';
        appendShayDeskMessage('system', '\u2713 [' + ts + '] poses-complete — ' + label, { subtle: true });
        break;
      case 'video-progress':
        appendShayDeskMessage('system', '\u2699 [' + ts + '] video-progress: ' + (msg.status || msg.message || 'generating'), { subtle: true });
        break;
      case 'video-complete':
        detail = msg.size ? ' (' + (msg.size / 1024).toFixed(0) + 'KB)' : '';
        appendShayDeskMessage('system', '\u2713 [' + ts + '] video-complete' + detail, { subtle: true });
        break;
      case 'video-error':
        appendShayDeskMessage('system', '\u2717 [' + ts + '] video error: ' + (msg.error || 'unknown'), { subtle: true });
        break;
      case 'promo-step':
        appendShayDeskMessage('system', '\u2699 [' + ts + '] promo-step: ' + (msg.step || msg.status || ''), { subtle: true });
        break;
      case 'promo-complete':
        appendShayDeskMessage('system', '\u2713 [' + ts + '] promo-complete', { subtle: true });
        break;
      case 'promo-error':
        appendShayDeskMessage('system', '\u2717 [' + ts + '] promo error: ' + (msg.error || 'unknown'), { subtle: true });
        break;
      case 'build-progress':
        appendShayDeskMessage('system', '\u2699 [' + ts + '] build-progress: ' + (msg.content || msg.message || ''), { subtle: true });
        break;
      case 'build-complete':
        appendShayDeskMessage('system', '\u2713 [' + ts + '] build-complete', { subtle: true });
        break;
      case 'deploy-progress':
        appendShayDeskMessage('system', '\u2699 [' + ts + '] deploy-progress: ' + (msg.content || msg.message || ''), { subtle: true });
        break;
      case 'deploy-complete':
        appendShayDeskMessage('system', '\u2713 [' + ts + '] deploy-complete', { subtle: true });
        break;
    }
  }

  window.PipOrb = {
    show:               showMessage,
    flash:              flashCallout,
    setBadge:           setBadge,
    close:              closeCallout,
    openLitePanel:      openLitePanel,
    askLite:            function (text, opts) {
      var input = document.getElementById('pip-direct-input');
      openLitePanel({ focusInput: !(opts && opts.skipFocus) });
      if (input) input.value = text || '';
      if (opts && opts.sendNow && window.__pipSendDirect) window.__pipSendDirect(text || '');
    },
    showMe:             showMeElement,
    quickShowMe:        function () {
      var plan = validationPlan;
      var currentStep = plan && plan.steps ? plan.steps[plan.current_step] : null;
      if (currentStep) triggerShowMe(currentStep);
      else showMessage('Show Me is ready once Shay has a current task or prompt for you.', []);
    },
    resetLitePosition:  resetLitePosition,
    doIt:               doIt,
    dismiss:            dismiss,
    send:               sendToChat,
    showColumnResponse: showColumnResponse,
    appendDeskMessage: appendDeskMessage,
    handlePipelineEvent: handlePipelineWsEvent,
    showColumnActions:  showColumnActions,
    reloadTodos:        function () { setOrbState('IDLE'); },
    setOrbState:        setOrbState,
    validation: {
      check:    checkValidationPlan,
      markStep: markValidationStep,
      showPlan: function () { if (validationPlan) showFullPlan(validationPlan); },
    },
    getState: function () {
      var workerCountEl = document.getElementById('worker-queue-count');
      var workerBadgeEl = document.getElementById('worker-queue-badge');
      return {
        mode: pipMode,
        identity_mode: getIdentityMode(),
        lite_state: liteSurfaceState,
        orb_state: currentOrbState,
        badge_count: badgeCount,
        worker_queue_pending_count: Number.parseInt(workerCountEl && workerCountEl.textContent, 10) || 0,
        worker_queue_badge_visible: !!(workerBadgeEl && !workerBadgeEl.classList.contains('hidden')),
        has_transcript: !!shayDeskHasTranscript,
        validation: validationPlan ? {
          status: validationPlan.status || null,
          current_step: validationPlan.current_step,
          total_steps: Array.isArray(validationPlan.steps) ? validationPlan.steps.length : 0,
          pending_steps: Array.isArray(validationPlan.steps) ? validationPlan.steps.filter(function (step) { return step.status === 'pending'; }).length : 0,
          failed_steps: Array.isArray(validationPlan.steps) ? validationPlan.steps.filter(function (step) { return step.status === 'failed'; }).length : 0,
        } : null,
        settings: Object.assign({}, shayLiteSettings),
      };
    },
    get mode() { return pipMode; },
    get orbState() { return currentOrbState; },
  };

  // ── Init on DOM ready ─────────────────────────────────────────────────────
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // ── Validation plan is shown in the dynamic area (todo list) via loadDynamicArea().
  // The response column stays clean on load — no auto-prompt.
  // Clicking a step in the todo list surfaces the step prompt in the response column.
  // window.addEventListener('pip:session-started', ...) removed intentionally.

  // ── Site changed → IDLE ───────────────────────────────────────────────────
  window.addEventListener('studio:site-changed', function () {
    // Clear response column
    var area = document.getElementById('pip-response-area');
    var row  = document.getElementById('pip-action-row');
    if (area) { while (area.firstChild) area.removeChild(area.firstChild); area.className = ''; }
    if (row)  { while (row.firstChild) row.removeChild(row.firstChild); row.style.display = 'none'; }

    setBadge(0);
    localStorage.removeItem('pip-dismiss:pip-t-build-warn');
    localStorage.removeItem('pip-dismiss:pip-t-briefed-idle');

    setOrbState('IDLE');
  });

  // ── Mode changed → state machine transition ───────────────────────────────
  window.addEventListener('pip:mode-changed', function (e) {
    var mode = e.detail && e.detail.mode;
    if (!mode) return;
    if (mode === 'brainstorm') {
      setOrbState('BRAINSTORM_ACTIVE');
    } else if (mode === 'review') {
      setOrbState('REVIEW_ACTIVE');
    } else {
      setOrbState('IDLE');
    }
  });

  // ── Brief updated → BRIEF_PROGRESS ───────────────────────────────────────
  window.addEventListener('pip:brief-updated', function (e) {
    var detail = e.detail || {};
    setOrbState('BRIEF_PROGRESS', { answers: detail.answers || {}, pct: detail.completionPct || 0 });
  });

  function renderBriefInDynamic(answers, pct) {
    var area = document.getElementById('pip-dynamic-area');
    if (!area) return;
    while (area.firstChild) area.removeChild(area.firstChild);

    // Header
    var hdr = document.createElement('div');
    hdr.className = 'pip-dynamic-header';
    hdr.textContent = 'Brief';
    area.appendChild(hdr);

    // Progress bar
    var wrap = document.createElement('div');
    wrap.className = 'pip-todo-progress';
    var fill = document.createElement('div');
    fill.className = 'pip-todo-progress-fill';
    fill.style.width = pct + '%';
    wrap.appendChild(fill);
    area.appendChild(wrap);

    var pctLbl = document.createElement('div');
    pctLbl.style.cssText = 'font-size:10px;color:var(--fam-text-3);padding:2px 4px 8px;';
    pctLbl.textContent = pct + '% complete';
    area.appendChild(pctLbl);

    // Answered fields
    var fieldMap = { q_business: 'Business', q_revenue: 'Revenue', q_customer: 'Audience', q_differentiator: 'Edge', q_cta: 'CTA', q_style: 'Style' };
    Object.keys(fieldMap).forEach(function (qId) {
      var val = answers[qId];
      if (!val) return;
      var row = document.createElement('div');
      row.style.cssText = 'padding:4px 6px;border-bottom:1px solid var(--fam-border-2);';
      var lbl = document.createElement('div');
      lbl.style.cssText = 'font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:var(--fam-text-3);';
      lbl.textContent = fieldMap[qId];
      row.appendChild(lbl);
      var vEl = document.createElement('div');
      vEl.style.cssText = 'font-size:11px;color:var(--fam-text);line-height:1.4;margin-top:1px;';
      vEl.textContent = val.length > 60 ? val.slice(0, 60) + '\u2026' : val;
      row.appendChild(vEl);
      area.appendChild(row);
    });

    // Build button (unlocked at 60%)
    if (pct >= 60) {
      var buildBtn = document.createElement('button');
      buildBtn.style.cssText = 'margin-top:10px;width:100%;padding:9px;background:var(--fam-red);color:white;border:none;border-radius:6px;font-size:12px;font-weight:600;cursor:pointer;';
      buildBtn.textContent = 'Build this site \u2192';
      buildBtn.addEventListener('click', function () {
        if (window.StudioBrief && StudioBrief.getAnswers) {
          // Trigger build via brief module
          var el = document.getElementById('brief-build-btn');
          if (el) el.click();
          else if (window.StudioShell) StudioShell.switchTab('brief');
        }
      });
      area.appendChild(buildBtn);
    }
  }

  function renderDynamicModeContent(mode) {
    var area = document.getElementById('pip-dynamic-area');
    if (!area) return;
    while (area.firstChild) area.removeChild(area.firstChild);

    var hdr = document.createElement('div');
    hdr.className = 'pip-dynamic-header';

    if (mode === 'brainstorm') {
      hdr.textContent = 'Brainstorm';
      area.appendChild(hdr);
      var hint = document.createElement('div');
      hint.style.cssText = 'padding:8px 6px;font-size:11px;color:var(--fam-text-2);line-height:1.5;';
      hint.textContent = 'Describe what you\'re thinking. Ideas are saved here as you go.';
      area.appendChild(hint);
    } else if (mode === 'review') {
      hdr.textContent = 'Review';
      area.appendChild(hdr);
      // Load verification score
      fetch('/api/verify').then(function (r) { return r.json(); }).then(function (data) {
        var checks = data.checks || {};
        var vals = Object.values(checks);
        var passing = vals.filter(function (v) { return v === true || (v && v.passed); }).length;
        var score = document.createElement('div');
        score.style.cssText = 'padding:8px 6px;font-size:12px;color:var(--fam-text);';
        score.textContent = 'FAMtastic Score: ' + passing + '/' + vals.length;
        area.appendChild(score);
        Object.entries(checks).forEach(function (pair) {
          var name = pair[0], val = pair[1];
          var row = document.createElement('div');
          var ok = val === true || (val && val.passed);
          row.style.cssText = 'padding:3px 6px;font-size:11px;color:' + (ok ? 'var(--fam-green)' : 'var(--fam-red)') + ';';
          row.textContent = (ok ? '\u2713 ' : '\u2717 ') + name.replace(/_/g, ' ');
          area.appendChild(row);
        });
      }).catch(function () {});
    }
  }
})();
