(function () {
  function ensureGlobals() {
    window.config = window.config || {};
    if (typeof window.wsReconnectDelay !== 'number') window.wsReconnectDelay = 2000;
  }

  function handleVerificationWarning(msg) {
    var vContainer = document.getElementById('chat-messages');
    if (!vContainer) return;
    var warnDiv = document.createElement('div');
    warnDiv.style.cssText = 'margin:4px 0;padding:8px 12px;font-size:12px;border-left:3px solid var(--fam-gold);background:rgba(245,196,0,0.08);border-radius:3px;color:#fbbf24;';
    warnDiv.textContent = msg.content;
    vContainer.appendChild(warnDiv);
    vContainer.scrollTop = vContainer.scrollHeight;
  }

  function handleBuildPlan(msg) {
    var planCard = document.createElement('div');
    planCard.className = 'plan-card';
    planCard.dataset.planId = msg.planId;
    planCard.style.cssText = 'background:var(--fam-bg-3);border:1px solid var(--fam-border);border-radius:8px;padding:14px;max-width:95%;margin:4px 0;';

    var header = document.createElement('div');
    header.style.cssText = 'display:flex;align-items:center;gap:6px;margin-bottom:8px;font-size:13px;font-weight:600;color:var(--fam-text);';
    var scopeSpan = document.createElement('span');
    scopeSpan.style.cssText = 'font-size:11px;padding:1px 6px;border-radius:10px;background:rgba(232,53,42,0.15);color:var(--fam-red);';
    scopeSpan.textContent = (msg.plan && msg.plan.estimated_scope) ? msg.plan.estimated_scope : 'small';
    header.textContent = '📋 Here\'s what I\'ll do: ';
    header.appendChild(scopeSpan);
    planCard.appendChild(header);

    var summary = document.createElement('p');
    summary.style.cssText = 'font-size:12px;color:var(--fam-text-2);margin-bottom:10px;line-height:1.5;';
    summary.textContent = (msg.plan && msg.plan.summary) ? msg.plan.summary : '';
    planCard.appendChild(summary);

    var changes = document.createElement('div');
    changes.style.cssText = 'margin-bottom:10px;';
    ((msg.plan && msg.plan.changes) || []).forEach(function(c) {
      var row = document.createElement('div');
      row.style.cssText = 'display:flex;align-items:center;gap:6px;font-size:11px;color:var(--fam-text-2);padding:2px 0;';
      var areaSpan = document.createElement('span');
      areaSpan.style.cssText = 'color:var(--fam-red);font-size:10px;font-weight:600;';
      areaSpan.textContent = c.area || '';
      var arrowSpan = document.createElement('span');
      arrowSpan.style.cssText = 'color:var(--fam-text-3);';
      arrowSpan.textContent = '→';
      var actionSpan = document.createElement('span');
      actionSpan.textContent = c.action || '';
      row.appendChild(areaSpan);
      row.appendChild(arrowSpan);
      row.appendChild(actionSpan);
      changes.appendChild(row);
    });
    planCard.appendChild(changes);

    var editArea = document.createElement('textarea');
    editArea.rows = 2;
    editArea.style.cssText = 'width:100%;background:var(--fam-bg);border:1px solid var(--fam-border);border-radius:5px;padding:6px 10px;font-size:12px;color:var(--fam-text);resize:none;outline:none;margin-bottom:8px;';
    editArea.placeholder = 'Edit your request...';
    editArea.value = msg.originalMessage || '';
    planCard.appendChild(editArea);

    var footer = document.createElement('div');
    footer.style.cssText = 'display:flex;gap:6px;';

    var approveBtn = document.createElement('button');
    approveBtn.style.cssText = 'flex:1;padding:7px;background:var(--fam-red);color:white;border:none;border-radius:5px;font-size:12px;cursor:pointer;font-weight:500;';
    approveBtn.textContent = '✓ Looks good, build it';
    var capturedPlanId = msg.planId;
    approveBtn.onclick = function() { window.approvePlan(capturedPlanId, approveBtn); };
    footer.appendChild(approveBtn);

    var cancelBtn2 = document.createElement('button');
    cancelBtn2.style.cssText = 'padding:7px 12px;background:var(--fam-bg);color:var(--fam-text-2);border:1px solid var(--fam-border);border-radius:5px;font-size:12px;cursor:pointer;';
    cancelBtn2.textContent = '✕ Cancel';
    cancelBtn2.onclick = function() { window.cancelPlan(capturedPlanId, cancelBtn2); };
    footer.appendChild(cancelBtn2);

    planCard.appendChild(footer);
    var pContainer = document.getElementById('chat-messages');
    if (pContainer) {
      pContainer.appendChild(planCard);
      pContainer.scrollTop = 99999;
    }
  }

  function handleSessionStatus(msg) {
    var mdl = msg.model || '';
    var modelEl = document.getElementById('status-model');
    if (modelEl) {
      var isHaiku = mdl.indexOf('haiku') !== -1;
      var isOpus = mdl.indexOf('opus') !== -1;
      modelEl.textContent = isHaiku ? 'Haiku' : isOpus ? 'Opus' : 'Sonnet';
      modelEl.className = 'status-pill ' + (isHaiku ? 'pill-green' : isOpus ? 'pill-purple' : 'pill-blue');
      var pill = document.getElementById('model-pill');
      if (pill) pill.textContent = isHaiku ? 'Haiku' : isOpus ? 'Opus' : 'Sonnet';
      if (window.StudioShell && typeof window.StudioShell.setComposerModel === 'function') {
        var currentModel = isHaiku ? 'claude-haiku-4-5-20251001' : isOpus ? 'claude-opus-4-5' : 'claude-sonnet-4-6';
        var options = document.querySelectorAll('.model-menu-option');
        options.forEach(function(opt) { opt.classList.toggle('active', opt.dataset.model === currentModel); });
      }
    }
    var used = (msg.inputTokens || 0) + (msg.outputTokens || 0);
    var ctxSize = msg.contextWindowSize || 200000;
    var pct = Math.min(Math.round(used / ctxSize * 100), 100);
    var colorClass = pct < 50 ? 'context-green' : pct < 80 ? 'context-amber' : 'context-red';
    var pctEl = document.getElementById('status-context-pct');
    if (pctEl) pctEl.textContent = pct + '%';
    var fill = document.getElementById('status-context-bar-fill');
    if (fill) {
      fill.style.width = pct + '%';
      fill.className = colorClass;
    }
    var costEl = document.getElementById('status-cost');
    if (costEl) costEl.textContent = '$' + (msg.estimatedCostUsd || 0).toFixed(2);
    if (msg.sessionStartedAt && !window._statusTimerStarted) {
      window._statusStartTime = new Date(msg.sessionStartedAt);
      window._statusTimerStarted = true;
      setInterval(function() {
        var mins = Math.floor((Date.now() - window._statusStartTime) / 60000);
        var durEl = document.getElementById('status-duration');
        if (durEl) durEl.textContent = mins + ' min';
      }, 10000);
    }
  }

  window.connectWS = function connectWS() {
    ensureGlobals();
    window.ws = new WebSocket('ws://localhost:' + window.config.studioPort);
    window.ws.onopen = function() {
      console.log('[ws] connected');
      window.wsReconnectDelay = 2000;
      window.wsConnected = true;
      window.showConnectionBanner(false);
      window.loadShaySessionInit();
      fetch('/api/pages').then(function(r) { return r.json(); }).then(function(data) {
        if (data.pages) window.updatePageTabs(data.pages, data.currentPage);
      }).catch(function() {});
      fetch('/api/config').then(function(r) { return r.json(); }).then(function(data) {
        if (data.tag) {
          document.title = 'Studio — ' + data.tag;
          var ctxSite = document.getElementById('ctx-site-tag');
          if (ctxSite) ctxSite.textContent = data.tag;
          window.addChatSessionBreak(data.tag, { force: true, dedupeKey: 'ws-open-' + Date.now() });
        }
      }).catch(function() {});
      window.refreshVerification();
      var preview = document.getElementById('preview-frame');
      if (preview && preview.src && preview.src.indexOf('about:blank') === -1) preview.src = preview.src;
      var restartBanner = document.getElementById('restart-banner');
      if (restartBanner) {
        restartBanner.classList.add('hidden');
        restartBanner.style.display = 'none';
        restartBanner.style.pointerEvents = 'none';
      }
      if (typeof BrainSelector !== 'undefined') BrainSelector.init(window.ws);
      if (typeof WorkerQueueBadge !== 'undefined') WorkerQueueBadge.refresh();
      window.dispatchEvent(new CustomEvent('pip:session-started'));
    };
    window.ws.onclose = function() {
      console.log('[ws] disconnected, reconnecting in ' + window.wsReconnectDelay + 'ms...');
      window.wsConnected = false;
      window.showConnectionBanner(true);
      setTimeout(window.connectWS, window.wsReconnectDelay);
      window.wsReconnectDelay = Math.min(window.wsReconnectDelay * 2, 30000);
    };
    window.ws.onmessage = function(event) {
      var msg;
      try { msg = JSON.parse(event.data); } catch (e) { return; }
      switch (msg.type) {
        case 'assistant':
          window.flushStream();
          window.addMessage('assistant', msg.content);
          if (typeof PipOrb !== 'undefined' && PipOrb.showColumnResponse) PipOrb.showColumnResponse(msg.content, false);
          break;
        case 'status':
          window.addStep(msg.content);
          break;
        case 'error':
          window.hideStepLog();
          window.addMessage('error', msg.content);
          break;
        case 'stream':
          window.streamBuffer += msg.content;
          break;
        case 'reload-preview':
          window.hasUnsavedWork = false;
          window.expandPreviewIfHidden({ isBuild: msg.isBuild === true });
          window.reloadPreview();
          window.refreshStudioPanel();
          break;
        case 'asset-created':
          window.addAssetPreview(msg.filename, msg.path);
          break;
        case 'spec-updated':
          window.refreshStudioPanel();
          break;
        case 'brief':
          window.hideStepLog();
          window.showBriefCard(msg.brief, msg.techRecommendations);
          break;
        case 'pages-updated':
          window.updatePageTabs(msg.pages, msg.currentPage);
          break;
        case 'runtime-vnext-build-complete':
          window.refreshStudioPanel();
          window.refreshVerification();
          if (typeof window.loadPages === 'function') window.loadPages();
          window.reloadPreview();
          break;
        case 'page-changed':
          window.activePage = msg.page;
          window.renderPageTabs();
          window.navigateToPage(msg.page);
          break;
        case 'mode-changed':
          window.updateModeIndicator(msg.mode);
          break;
        case 'brainstorm-actions':
          window.addBrainstormActions();
          break;
        case 'site-switched':
          window.handleSiteSwitch(msg.tag, msg.pages, msg.currentPage);
          break;
        case 'chat':
          window.hideStepLog();
          window.addMessage('assistant', msg.content);
          break;
        case 'restart-needed': {
          var rBanner = document.getElementById('restart-banner');
          var rMsg = document.getElementById('restart-banner-msg');
          if (rBanner && rMsg) {
            var fileLabel = msg.file === 'index.html' ? 'Studio UI' : msg.file === 'server.js' ? 'Studio backend' : (msg.file || 'A Studio file');
            rMsg.textContent = fileLabel + ' changed — restart recommended';
            rBanner.classList.remove('hidden');
            rBanner.style.display = 'flex';
            rBanner.style.pointerEvents = 'auto';
          }
          break;
        }
        case 'server-restarting':
          window.addMessage('assistant', 'Server restarting... reconnecting automatically.');
          break;
        case 'build_cancelled':
          window.hideStepLog();
          var cBtn = document.getElementById('chat-cancel-btn');
          if (cBtn) cBtn.style.display = 'none';
          window.addMessage('assistant', 'Build was cancelled.');
          break;
        case 'character-pipeline-step':
        case 'character-pipeline-complete':
        case 'character-pipeline-error':
        case 'pose-generated':
        case 'poses-complete':
        case 'video-progress':
        case 'video-complete':
        case 'video-error':
        case 'promo-step':
        case 'promo-complete':
        case 'promo-error':
        case 'build-progress':
        case 'build-complete':
        case 'deploy-progress':
        case 'deploy-complete':
          if (typeof window.charPipelineHandleWS === 'function') window.charPipelineHandleWS(msg);
          if (typeof PipOrb !== 'undefined' && PipOrb.handlePipelineEvent) PipOrb.handlePipelineEvent(msg);
          break;
        case 'deploy-updated':
          window.refreshDeployInfo();
          break;
        case 'verification-result':
          window.updateVerifyIndicator(msg);
          break;
        case 'shay-shay-progress':
          if (typeof PipOrb !== 'undefined' && PipOrb.handleShayShayProgress) {
            PipOrb.handleShayShayProgress(msg);
          }
          break;
        case 'patch-applied':
          if (typeof PipOrb !== 'undefined' && PipOrb.handlePatchApplied) {
            PipOrb.handlePatchApplied(msg);
          }
          break;
        case 'verification-warning':
          handleVerificationWarning(msg);
          break;
        case 'build-plan':
          handleBuildPlan(msg);
          break;
        case 'session-status':
          handleSessionStatus(msg);
          break;
        case 'phase_update':
          if (msg.phase && msg.status) window.addStep(msg.phase + ': ' + msg.status);
          break;
        case 'brain-changed':
        case 'brain-status':
        case 'brain-api-status':
        case 'brain-fallback':
          if (typeof BrainSelector !== 'undefined') BrainSelector.handleMessage(msg);
          break;
      }
    };
  };

  window.bindStudioChatForm = function bindStudioChatForm() {
    var form = document.getElementById('chat-form');
    if (form && !form.dataset.boundStudioChat) {
      form.dataset.boundStudioChat = '1';
      form.addEventListener('submit', function(e) {
        e.preventDefault();
        var input = document.getElementById('chat-input');
        var text = input ? input.value.trim() : '';
        if (!text) return;
        if (!window.ws || window.ws.readyState !== WebSocket.OPEN) {
          window.addMessage('error', 'Not connected to server. Waiting for reconnection...');
          return;
        }
        window.hasUnsavedWork = true;
        document.querySelectorAll('.brainstorm-actions').forEach(function(el) { el.remove(); });
        window.addMessage('user', text);
        window.ws.send(JSON.stringify({ type: 'chat', content: text }));
        input.value = '';
        input.style.height = 'auto';
        window.steps = [];
        window.stepStart = null;
        window.addStep('Processing...');
      });
    }

    var chatInput = document.getElementById('chat-input');
    if (chatInput && !chatInput.dataset.boundStudioChatInput) {
      chatInput.dataset.boundStudioChatInput = '1';
      chatInput.addEventListener('input', function() {
        chatInput.style.height = 'auto';
        chatInput.style.height = Math.min(chatInput.scrollHeight, 120) + 'px';
      });
      chatInput.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          var f = document.getElementById('chat-form');
          if (f) f.dispatchEvent(new Event('submit'));
        }
      });
    }

    if (!document.body.dataset.boundStudioGlobalKeys) {
      document.body.dataset.boundStudioGlobalKeys = '1';
      document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
          var picker = document.getElementById('project-picker');
          if (picker) picker.style.display = 'none';
          window.closeSettings();
        }
      });
      document.addEventListener('click', function(e) {
        var picker = document.getElementById('project-picker');
        var siteTag = document.getElementById('site-tag');
        if (picker && picker.style.display !== 'none' && !picker.contains(e.target) && e.target !== siteTag) {
          picker.style.display = 'none';
        }
      });
    }
  };

  window.initStudioRuntime = async function initStudioRuntime() {
    try {
      var r = await fetch('/api/config');
      window.config = await r.json();
    } catch (e) {
      window.config = { tag: 'unknown', previewPort: 3333, studioPort: 3334 };
    }
    var _tag = window.config.tag || 'loading';
    var _topBtn = document.getElementById('top-bar-site-btn');
    if (_topBtn) _topBtn.textContent = _tag + ' ▾';
    var _sideBtn = document.getElementById('site-tag');
    if (_sideBtn) _sideBtn.textContent = _tag + ' ▾';
    document.title = 'Site Studio — ' + (window.config.tag || '...');
    var ctxSite = document.getElementById('ctx-site-tag');
    if (ctxSite) ctxSite.textContent = window.config.tag || '—';

    var history = [];
    try {
      var hr = await fetch('/api/history');
      history = await hr.json();
    } catch (e2) {
      history = [];
    }
    if (Array.isArray(history)) {
      history.forEach(function(msg) {
        if (msg.role === 'user' || msg.role === 'assistant') window.addMessage(msg.role, msg.content, false);
      });
    }

    var frame = document.getElementById('preview-frame');
    if (frame && window.config.previewPort) frame.src = 'http://localhost:' + window.config.previewPort + '/';
    var previewStatus = document.getElementById('preview-status');
    if (previewStatus && window.config.previewPort) previewStatus.textContent = 'localhost:' + window.config.previewPort;

    window.refreshAssetBar();
    window.loadPages();
    fetch('/api/studio-state').then(function(r) { return r.json(); }).then(window.updateEnvironmentBar).catch(function() {});

    window.bindStudioChatForm();
    window.connectWS();
    setTimeout(window.initPreviewSplit, 200);
  };

  window.addEventListener('beforeunload', function(e) {
    if (window.hasUnsavedWork) e.preventDefault();
  });
})();
