(function () {
  window.openSettings = function openSettings() {
    var modal = document.getElementById('settings-modal');
    if (modal) { modal.style.display = 'flex'; window.loadSettingsContent(); }
  };

  window.closeSettings = function closeSettings() {
    var modal = document.getElementById('settings-modal');
    if (modal) modal.style.display = 'none';
  };

  window.loadSettingsContent = function loadSettingsContent() {
    fetch('/api/settings').then(function(r) { return r.json(); }).then(function(data) {
      var content = document.getElementById('settings-content');
      if (!content) return;
      var intro = document.createElement('div');
      intro.style.cssText = 'font-size:12px;color:var(--fam-text-2);';
      intro.textContent = 'Settings loaded. Full settings UI coming in Phase 4.';
      content.appendChild(intro);
      var pre = document.createElement('pre');
      pre.style.cssText = 'font-size:10px;color:var(--fam-text-3);margin-top:12px;overflow-x:auto;';
      pre.textContent = JSON.stringify(data, null, 2);
      content.appendChild(pre);
    }).catch(function() {});
  };

  window.toggleAutoAccept = function toggleAutoAccept(val) {
    if (window.ws && window.ws.readyState === WebSocket.OPEN) window.ws.send(JSON.stringify({ type: 'set-auto-accept', value: val }));
  };

  window.refreshStudioPanel = function refreshStudioPanel() {
    fetch('/api/studio-state').then(function(r) { return r.json(); }).then(function(data) {
      window.cachedStudioState = data;
      window.dispatchEvent(new CustomEvent('studio:state-refreshed', { detail: data }));
      if (data.design_brief) {
        var briefContent = document.getElementById('brief-content');
        if (briefContent) {
          while (briefContent.firstChild) briefContent.removeChild(briefContent.firstChild);
          var grid = document.createElement('div');
          grid.style.cssText = 'display:grid;gap:8px;';
          var goalDiv = document.createElement('div');
          goalDiv.innerHTML = '<span style="color:var(--fam-text-3);">Goal:</span> ' + window.escapeHtml(data.design_brief.goal || '');
          grid.appendChild(goalDiv);
          var audDiv = document.createElement('div');
          audDiv.innerHTML = '<span style="color:var(--fam-text-3);">Audience:</span> ' + window.escapeHtml(data.design_brief.audience || '');
          grid.appendChild(audDiv);
          briefContent.appendChild(grid);
        }
      }
    }).catch(function() {});
  };

  window.getPreviewState = function getPreviewState() {
    var frame = document.getElementById('preview-frame');
    var mobileBtn = document.getElementById('preview-device-mobile');
    var previewSection = document.getElementById('canvas-preview-section');
    return {
      active_page: window.activePage || 'index.html',
      current_view_mode: window._currentViewMode,
      slot_mode_active: !!window.slotModeActive,
      current_slot_target: window.currentSlotTarget || null,
      preview_src: frame ? frame.src : null,
      preview_visible: !!(previewSection && previewSection.style.display !== 'none'),
      device_mode: mobileBtn && mobileBtn.style.color === 'var(--fam-text)' ? 'mobile' : 'desktop',
      preview_port: window.config.previewPort || null
    };
  };

  window.getLiveUiState = function getLiveUiState() {
    var pipBadge = document.getElementById('pip-badge');
    var workerBadge = document.getElementById('worker-queue-badge');
    var workerCount = document.getElementById('worker-queue-count');
    var ctxJobCount = document.getElementById('ctx-job-count');
    var ctxDiffCount = document.getElementById('ctx-diff-count');
    var stepLog = document.getElementById('step-log');
    var intelFeed = document.getElementById('sidebar-intel-feed');
    var researchFeed = document.getElementById('research-feed-list');
    var activeDismissKeys = [];
    try {
      Object.keys(localStorage).forEach(function (key) {
        if (key.indexOf('pip-dismiss:') === 0 && localStorage.getItem(key)) activeDismissKeys.push(key.replace(/^pip-dismiss:/, ''));
      });
    } catch (e) {}
    return {
      pip_badge_count: pipBadge && !pipBadge.classList.contains('hidden') ? (Number.parseInt(pipBadge.textContent, 10) || 0) : 0,
      worker_queue_pending_count: workerBadge && !workerBadge.classList.contains('hidden') ? (Number.parseInt(workerCount && workerCount.textContent, 10) || 0) : 0,
      worker_queue_badge_visible: !!(workerBadge && !workerBadge.classList.contains('hidden')),
      context_job_count: ctxJobCount && ctxJobCount.style.display !== 'none' ? (ctxJobCount.textContent || null) : null,
      context_diff_count: ctxDiffCount && ctxDiffCount.style.display !== 'none' ? (ctxDiffCount.textContent || null) : null,
      step_log_visible: !!stepLog,
      step_log_items: Array.isArray(window.steps) ? window.steps.map(function (step) {
        return { text: step.text, status: step.status };
      }) : [],
      intelligence_finding_cards_visible: intelFeed ? intelFeed.querySelectorAll('button').length : 0,
      research_items_visible: researchFeed ? researchFeed.children.length : 0,
      dismissed_prompt_keys: activeDismissKeys
    };
  };

  window.buildShayShayClientSnapshot = function buildShayShayClientSnapshot() {
    var workspaceState = window.StudioShell && typeof window.StudioShell.getWorkspaceState === 'function'
      ? window.StudioShell.getWorkspaceState()
      : null;
    var screenState = window.StudioScreens && typeof window.StudioScreens.getWorkspaceState === 'function'
      ? window.StudioScreens.getWorkspaceState()
      : null;
    var orbState = window.PipOrb && typeof window.PipOrb.getState === 'function'
      ? window.PipOrb.getState()
      : null;
    var briefState = window.StudioBrief && typeof window.StudioBrief.getAnswers === 'function'
      ? {
          answers: window.StudioBrief.getAnswers(),
          completion_pct: Math.min(100, Math.round((Object.keys(window.StudioBrief.getAnswers() || {}).length / 6) * 100))
        }
      : null;

    return {
      ui_state: Object.assign({}, window.getLiveUiState(), orbState ? {
        shay_mode: orbState.mode,
        shay_orb_state: orbState.orb_state,
        shay_desk_has_transcript: orbState.has_transcript,
        validation: orbState.validation || null
      } : {}),
      workspace_state: workspaceState,
      component_state: {
        selected_context: workspaceState ? workspaceState.selected_context : null,
        return_stack: workspaceState ? workspaceState.return_stack : [],
        media_workspace: screenState ? screenState.assets : null,
        brief_workspace: briefState,
      },
      preview_state: window.getPreviewState()
    };
  };
})();
