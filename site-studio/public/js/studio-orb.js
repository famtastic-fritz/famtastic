// studio-orb.js — FAMtastic Pip assistant orb
// Manages: idle pulse, active glow, notification badge, callout, mode popup,
// 5 proactive triggers, session-permanent dismiss, Show Me / Do It modes.

(function () {
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

  // ── Init ────────────────────────────────────────────────────────────────
  function init() {
    const orb = document.getElementById('pip-orb');
    if (!orb) return;

    // Left-click → toggle callout
    orb.addEventListener('click', (e) => {
      if (e.button !== 0) return;
      e.stopPropagation();
      toggleCallout();
    });

    // Right-click → mode selector popup
    orb.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      showModePopup();
    });

    // Close callout on backdrop click
    document.addEventListener('click', (e) => {
      const orbEl = document.getElementById('pip-orb');
      if (!orbEl || !orbEl.contains(e.target)) {
        closeCallout();
        closeModePopup();
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

    // Start idle pulse animation
    orb.classList.add('pip-idle');

    // Trigger 1: welcome message on first session connect (fires once per session)
    if (!isDismissed(TRIGGERS.welcome)) {
      setTimeout(() => {
        showMessage(
          'Ready. I have context from your previous sessions on this site.',
          [
            { label: 'Show brief', action: () => { StudioShell?.switchTab('brief'); closeCallout(); } },
            { label: 'Got it',  action: () => { dismiss(TRIGGERS.welcome); }, secondary: true },
          ]
        );
      }, 2500);
    }

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

  // ── Trigger: worker queue pending ───────────────────────────────────────
  function onWorkerQueueUpdate(e) {
    const count = (e.detail && e.detail.count) || 0;
    setBadge(count);
    if (count > 0 && !isDismissed(TRIGGERS.worker_queue)) {
      showMessage(
        count + ' task' + (count > 1 ? 's' : '') + ' pending in the worker queue. No worker is running — these need manual execution.',
        [
          { label: 'View queue', action: () => { window.StudioShell && StudioShell.switchRailItem('intelligence'); closeCallout(); } },
          { label: 'Dismiss', action: () => dismiss(TRIGGERS.worker_queue), secondary: true },
        ]
      );
    }
  }

  // ── Trigger: build complete with low score ───────────────────────────────
  function onBuildComplete(e) {
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
      if (window.hasUnsavedWork && !isDismissed(TRIGGERS.idle_unsaved)) {
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

  // ── Session-permanent dismiss ────────────────────────────────────────────
  function isDismissed(key) {
    return !!sessionStorage.getItem(key);
  }

  function dismiss(key) {
    if (key) sessionStorage.setItem(key, '1');
    closeCallout();
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
    const callout = document.getElementById('pip-callout');
    if (callout) callout.classList.add('hidden');
    const orb = document.getElementById('pip-orb');
    if (orb && !orb.classList.contains('pip-active')) {
      orb.classList.remove('pip-active');
      orb.classList.add('pip-idle');
    }
    // Clear message content so next open shows fresh content
    const msgEl    = document.getElementById('pip-callout-msg');
    const actionsEl = document.getElementById('pip-callout-actions');
    if (msgEl)     msgEl.textContent = '';
    if (actionsEl) actionsEl.innerHTML = '';
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

  // ── Public API ────────────────────────────────────────────────────────────
  window.PipOrb = {
    show:    showMessage,
    flash:   flashCallout,
    setBadge: setBadge,
    close:   closeCallout,
    showMe:  showMeElement,
    doIt:    doIt,
    dismiss: dismiss,
    send:    sendToChat,
    get mode() { return pipMode; },
  };

  // ── Init on DOM ready ─────────────────────────────────────────────────────
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
