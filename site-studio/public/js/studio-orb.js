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

    // Left-click orb → toggle floating callout (Show Me mode only now)
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

    // Close floating callout on backdrop click
    document.addEventListener('click', (e) => {
      const orbEl = document.getElementById('pip-orb');
      if (!orbEl || !orbEl.contains(e.target)) {
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

    // Wire direct input in column
    initDirectInput();

    // Load todo items into dynamic area
    loadDynamicArea();

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

  // ── Column: direct input wiring ─────────────────────────────────────────
  function initDirectInput() {
    var input = document.getElementById('pip-direct-input');
    var sendBtn = document.getElementById('pip-send-btn');
    if (!input) return;

    function sendDirect() {
      var text = input.value.trim();
      if (!text) return;
      input.value = '';
      showColumnResponse(null, true); // show typing indicator
      // If connected to WS, send as chat message
      if (window.ws && window.ws.readyState === WebSocket.OPEN) {
        if (window.addMessage) window.addMessage('user', text);
        window.ws.send(JSON.stringify({ type: 'chat', content: text }));
        if (window.steps !== undefined) {
          window.steps = [];
          window.stepStart = null;
          if (window.addStep) window.addStep('Processing...');
        }
        // Hide typing after a beat — real response will come via WS
        setTimeout(function () { hideTyping(); }, 800);
      } else {
        showColumnResponse('Not connected — try refreshing.', false);
      }
    }

    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendDirect(); }
    });

    if (sendBtn) sendBtn.addEventListener('click', sendDirect);
  }

  // ── Column: response area ───────────────────────────────────────────────
  function showColumnResponse(text, isTyping) {
    var area = document.getElementById('pip-response-area');
    if (!area) return;
    area.innerHTML = '';

    if (isTyping) {
      var typing = document.createElement('div');
      typing.className = 'pip-typing';
      typing.id = 'pip-typing';
      for (var i = 0; i < 3; i++) { var dot = document.createElement('span'); typing.appendChild(dot); }
      area.appendChild(typing);
      area.className = 'has-content';
      return;
    }

    if (text) {
      var bubble = document.createElement('div');
      bubble.className = 'pip-response-bubble';
      bubble.textContent = text;
      area.appendChild(bubble);
      area.className = 'has-content';
    } else {
      area.className = '';
    }
  }

  function hideTyping() {
    var typing = document.getElementById('pip-typing');
    if (typing) typing.remove();
    var area = document.getElementById('pip-response-area');
    if (area && !area.querySelector('.pip-response-bubble')) area.className = '';
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
            { label: '\u2713 Passed', action: function () { markValidationStep(step.id, 'passed'); loadDynamicArea(); } },
            { label: '\u2717 Failed',  action: function () { markValidationStep(step.id, 'failed'); loadDynamicArea(); } },
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
    showColumnResponse(msg, false);
    showColumnActions(actions || []);
    // Also ensure the orb is in active state
    var orb = document.getElementById('pip-orb');
    if (orb) { orb.classList.add('pip-active'); orb.classList.remove('pip-idle'); }
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
      ]
    );
  }

  function triggerShowMe(step) {
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
  window.PipOrb = {
    show:               showMessage,
    flash:              flashCallout,
    setBadge:           setBadge,
    close:              closeCallout,
    showMe:             showMeElement,
    doIt:               doIt,
    dismiss:            dismiss,
    send:               sendToChat,
    showColumnResponse: showColumnResponse,
    showColumnActions:  showColumnActions,
    reloadTodos:        loadDynamicArea,
    validation: {
      check:    checkValidationPlan,
      markStep: markValidationStep,
      showPlan: function () { if (validationPlan) showFullPlan(validationPlan); },
    },
    get mode() { return pipMode; },
  };

  // ── Init on DOM ready ─────────────────────────────────────────────────────
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // ── Check for active validation plan after WS connects ───────────────────
  // Fires 3s after session start so the WS welcome message lands first.
  // If a validation plan exists, it takes over from the standard welcome.
  window.addEventListener('pip:session-started', function () {
    setTimeout(checkValidationPlan, 3000);
  });
})();
