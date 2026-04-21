// studio-shell.js — Activity rail, sidebar, tab system, mode switching

(function() {
  // --- State ---
  let activeRailItem = 'site';
  let sidebarCollapsed = false;
  let activeMode = 'build';
  let tabs = []; // [{id, label, paneId, closeable}]
  let activeTabId = 'chat';
  let hierarchyTree = [];
  let selectedContext = null;
  let returnStack = [];
  const fieldCache = {};
  let workspaceLayoutMode = 'compose';
  let inspectorPinned = false;
  let isResizingInspector = false;
  const WORKSPACE_SESSION_KEY_PREFIX = 'studio-workspace-state:';
  let workspaceState = null;
  const composerModelLabels = {
    'claude-sonnet-4-6': 'Sonnet',
    'claude-opus-4-5': 'Opus',
    'claude-haiku-4-5-20251001': 'Haiku',
  };

  function getActiveSiteTag() {
    return (window.config && window.config.tag) || 'default';
  }

  function getWorkspaceSessionKey(tag) {
    return WORKSPACE_SESSION_KEY_PREFIX + (tag || getActiveSiteTag());
  }

  function getInspectorMode() {
    return selectedContext ? (selectedContext.type || 'selection') : 'inspect';
  }

  function deriveActiveWorkspace() {
    if (activeRailItem === 'assets') return 'media';
    if (activeRailItem === 'mission-control') return 'mission-control';
    if (activeRailItem === 'components') return 'components';
    if (activeRailItem === 'research') return 'research';
    if (activeRailItem === 'deploy') return 'deploy';
    if (activeRailItem === 'mission-control' || activeTabId === 'mc') return 'mission-control';
    if (activeRailItem === 'shay' || activeTabId === 'shay') return 'shay';
    return 'build';
  }

  function exportWorkspaceState() {
    const widthRaw = getComputedStyle(document.documentElement).getPropertyValue('--inspector-width').trim();
    return {
      active_site: getActiveSiteTag(),
      active_workspace: deriveActiveWorkspace(),
      active_rail: activeRailItem,
      active_mode: activeMode,
      active_tab: activeTabId,
      active_page: getActivePage(),
      active_selection: cloneContext(selectedContext),
      active_inspector_mode: getInspectorMode(),
      active_layout_preset: workspaceLayoutMode,
      return_stack: returnStack.map(cloneContext),
      sidebar_collapsed: !!sidebarCollapsed,
      inspector_pinned: !!inspectorPinned,
      inspector_width: parseInt(widthRaw, 10) || 320,
    };
  }

  function persistWorkspaceState(tagOverride) {
    workspaceState = exportWorkspaceState();
    try {
      sessionStorage.setItem(getWorkspaceSessionKey(tagOverride), JSON.stringify(workspaceState));
    } catch (_) {}
    return workspaceState;
  }

  function readPersistedWorkspaceState(tagOverride) {
    try {
      const raw = sessionStorage.getItem(getWorkspaceSessionKey(tagOverride));
      return raw ? JSON.parse(raw) : null;
    } catch (_) {
      return null;
    }
  }

  function applyPersistedWorkspaceState(saved) {
    if (!saved || typeof saved !== 'object') return false;
    activeRailItem = saved.active_rail || activeRailItem;
    activeMode = saved.active_mode || activeMode;
    activeTabId = saved.active_tab || activeTabId;
    workspaceLayoutMode = saved.active_layout_preset || workspaceLayoutMode;
    selectedContext = cloneContext(saved.active_selection);
    returnStack = Array.isArray(saved.return_stack) ? saved.return_stack.map(cloneContext).filter(Boolean) : [];
    sidebarCollapsed = !!saved.sidebar_collapsed;
    inspectorPinned = !!saved.inspector_pinned;
    if (saved.inspector_width) {
      document.documentElement.style.setProperty('--inspector-width', saved.inspector_width + 'px');
    }
    workspaceState = saved;
    return true;
  }

  // --- Activity Rail ---
  function initRail() {
    document.querySelectorAll('.rail-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const item = btn.dataset.rail;
        if (activeRailItem === item && !sidebarCollapsed) {
          toggleSidebar();
          return;
        }
        switchRailItem(item);
        if (sidebarCollapsed) toggleSidebar();
      });
    });
  }

  function switchRailItem(item, opts) {
    opts = opts || {};
    activeRailItem = item;
    document.querySelectorAll('.rail-btn').forEach(b => b.classList.toggle('active', b.dataset.rail === item));
    document.querySelectorAll('.sidebar-pane').forEach(p => p.classList.toggle('hidden', p.dataset.pane !== item));
    // Trigger pane load hooks
    if (item === 'site') loadSiteTree();
    if (!opts.fromTabSync) {
      if (item === 'components') switchTab('components');
      if (item === 'assets') switchTab('assets');
      if (item === 'mission-control') switchTab('mc');
      if (item === 'shay') switchTab('shay');
      if (item === 'deploy') switchTab('deploy');
    }
    if (item === 'intelligence') loadIntelligenceFeed();
    if (item === 'research') loadResearchFeed();
    persistWorkspaceState();
  }

  // --- Sidebar ---
  function toggleSidebar() {
    sidebarCollapsed = !sidebarCollapsed;
    const sidebar = document.getElementById('sidebar');
    sidebar.classList.toggle('collapsed', sidebarCollapsed);
    persistWorkspaceState();
    broadcastWorkspaceChrome();
  }

  function initSidebar() {
    const saved = readPersistedWorkspaceState();
    const stored = saved ? (saved.sidebar_collapsed ? '1' : '0') : localStorage.getItem('sidebar-collapsed');
    if (stored === '1') {
      sidebarCollapsed = true;
      document.getElementById('sidebar')?.classList.add('collapsed');
    }
  }

  // --- Site Tree ---
  function loadSiteTree() {
    fetch('/api/sites').then(r => r.json()).then(data => {
      const list = document.getElementById('sidebar-site-list');
      if (!list) return;
      list.innerHTML = '';
      const sites = data.sites || data || [];
      sites.forEach(site => {
        const item = document.createElement('div');
        item.className = 'sidebar-item';
        item.dataset.tag = site.tag || site;
        const dot = document.createElement('span');
        const isDeployed = site.deployed_url;
        const isBuilt = site.state === 'built';
        dot.style.cssText = 'width:6px;height:6px;border-radius:50%;background:' + (isDeployed ? 'var(--fam-purple)' : isBuilt ? 'var(--fam-green)' : 'var(--fam-gold)') + ';flex-shrink:0;';
        item.appendChild(dot);
        const label = document.createElement('span');
        label.textContent = site.site_name || site.tag || site;
        label.style.cssText = 'overflow:hidden;text-overflow:ellipsis;white-space:nowrap;';
        item.appendChild(label);
        item.addEventListener('click', () => switchToSite(site.tag || site));
        list.appendChild(item);
      });
    }).catch(() => {});
  }

  function switchToSite(tag) {
    // Call switchSite directly — don't rely on clicking a button
    if (window.switchSite) window.switchSite(tag);
  }

  // --- Tab System ---
  function initTabs() {
    // Default tabs
    // Brief/Media/Deploy stay sidebar-first. Chat and Shay are visible in the tab row.
    tabs = [
      { id: 'chat',    label: 'Chat',    paneId: 'tab-pane-chat',    closeable: false },
      { id: 'brief',   label: 'Brief',   paneId: 'tab-pane-brief',   closeable: false },
      { id: 'components', label: 'Components', paneId: 'tab-pane-components', closeable: false },
      { id: 'assets',  label: 'Media',   paneId: 'tab-pane-assets',  closeable: false },
      { id: 'mc',      label: 'Mission Control', paneId: 'tab-pane-mc', closeable: false },
      { id: 'shay',    label: 'Shay',    paneId: 'tab-pane-shay',    closeable: false },
      { id: 'deploy',  label: 'Deploy',  paneId: 'tab-pane-deploy',  closeable: false },
    ];
    renderTabs();
    switchTab('chat');

    // + button
    const addBtn = document.getElementById('tab-add');
    if (addBtn) addBtn.addEventListener('click', showTabAddMenu);
  }

  function renderTabs() {
    const bar = document.getElementById('tab-bar');
    const addBtn = document.getElementById('tab-add');
    // Remove all tab buttons (keep add button)
    bar.querySelectorAll('.ws-tab').forEach(b => b.remove());
    // Keep the desk-visible tabs in the bar and let sidebar-first workspaces stay sidebar-only.
    const tabBarTabs = tabs.filter(t => t.id === 'chat' || t.id === 'shay' || t.id === 'mc' || t.closeable);
    tabBarTabs.forEach(tab => {
      const btn = document.createElement('button');
      btn.className = 'ws-tab' + (tab.id === activeTabId ? ' active' : '');
      btn.dataset.tabId = tab.id;
      btn.textContent = tab.label;
      if (tab.closeable) {
        const close = document.createElement('span');
        close.className = 'ws-tab-close';
        close.textContent = '\u00d7';
        close.addEventListener('click', e => { e.stopPropagation(); removeTab(tab.id); });
        btn.appendChild(close);
      }
      btn.addEventListener('click', () => switchTab(tab.id));
      bar.insertBefore(btn, addBtn);
    });
    // Sync sidebar nav item active states
    syncSidebarNavActive();
  }

  function syncSidebarNavActive() {
    document.querySelectorAll('.sidebar-nav-item[data-tab]').forEach(el => {
      el.classList.toggle('active', el.dataset.tab === activeTabId);
    });
  }

  function syncRailForTab(tabId) {
    const targetRail = tabId === 'mc'
      ? 'mission-control'
      : (tabId === 'components' || tabId === 'assets' || tabId === 'shay' || tabId === 'deploy') ? tabId : 'site';
    if (activeRailItem !== targetRail) switchRailItem(targetRail, { fromTabSync: true });
  }

  function switchTab(tabId) {
    activeTabId = tabId;
    const tab = tabs.find(t => t.id === tabId);
    if (!tab) return;
    // Update tab button active state
    document.querySelectorAll('.ws-tab').forEach(b => b.classList.toggle('active', b.dataset.tabId === tabId));
    // Show/hide panes — only target panes inside canvas-tabs-area (live preview is outside)
    const tabsArea = document.getElementById('canvas-tabs-area');
    if (tabsArea) tabsArea.querySelectorAll('.ws-tab-pane').forEach(p => p.classList.add('hidden'));
    const pane = document.getElementById(tab.paneId);
    if (pane) pane.classList.remove('hidden');
    syncWorkspaceChrome();
    // Focus chat input when switching to chat tab
    if (tabId === 'chat') setTimeout(() => document.getElementById('chat-input')?.focus(), 50);
    if (tabId === 'shay') setTimeout(() => document.getElementById('pip-direct-input')?.focus(), 50);
    if (window.StudioScreens) {
      if (tabId === 'components' && typeof window.StudioScreens.mountComponents === 'function') {
        setTimeout(() => window.StudioScreens.mountComponents(), 20);
      }
      if (tabId === 'assets' && typeof window.StudioScreens.mountAssets === 'function') {
        setTimeout(() => window.StudioScreens.mountAssets(), 20);
      }
      if (tabId === 'mc' && typeof window.StudioScreens.mountMCTab === 'function') {
        setTimeout(() => window.StudioScreens.mountMCTab(), 20);
      }
      if (tabId === 'deploy' && typeof window.StudioScreens.mountDeploy === 'function') {
        setTimeout(() => window.StudioScreens.mountDeploy(), 20);
      }
    }
    // Mount brief interview when switching to brief tab
    if (tabId === 'brief') {
      setTimeout(() => {
        if (window.StudioBrief) {
          StudioBrief.mount();
          // Sync current brief answers to Shay-Shay dynamic area
          if (StudioBrief.getAnswers) {
            const a = StudioBrief.getAnswers();
            const pct = Math.min(100, Math.round((Object.keys(a).length / 6) * 100));
            window.dispatchEvent(new CustomEvent('pip:brief-updated', { detail: { answers: a, completionPct: pct } }));
          }
        }
      }, 60);
    }
    // Refresh deploy pane when switching to deploy tab — the static markup
    // used to show all ✗ because nothing populated live check results.
    if (tabId === 'deploy' && typeof window.refreshDeployInfo === 'function') {
      setTimeout(window.refreshDeployInfo, 60);
    }
    syncRailForTab(tabId);
    syncSidebarNavActive();
    persistWorkspaceState();
  }

  function addTab(label, paneId, options) {
    options = options || {};
    const id = options.id || ('tab-' + Date.now());
    if (tabs.find(t => t.id === id)) { switchTab(id); return id; }
    tabs.push(Object.assign({ id, label, paneId, closeable: true }, options));
    renderTabs();
    switchTab(id);
    return id;
  }

  function removeTab(tabId) {
    const idx = tabs.findIndex(t => t.id === tabId);
    if (idx === -1) return;
    tabs.splice(idx, 1);
    if (activeTabId === tabId) {
      const fallback = tabs[Math.max(0, idx - 1)];
      switchTab(fallback ? fallback.id : 'chat');
    } else {
      renderTabs();
    }
  }

  function showTabAddMenu() {
    // For now, switch to a useful tab
    switchTab('brief');
  }

  // --- Mode Switching ---
  function initModes() {
    document.querySelectorAll('.mode-btn').forEach(btn => {
      btn.addEventListener('click', () => switchMode(btn.dataset.mode));
    });
  }

  function switchMode(mode) {
    activeMode = mode;
    document.querySelectorAll('.mode-btn').forEach(b => b.classList.toggle('active', b.dataset.mode === mode));
    document.querySelectorAll('.tools-group').forEach(g => {
      g.classList.toggle('hidden', g.dataset.mode !== mode);
    });
    // Notify body for CSS mode classes
    document.body.className = document.body.className.replace(/mode-\w+/g, '').trim();
    document.body.classList.add('mode-' + mode);
    window.dispatchEvent(new CustomEvent('pip:mode-changed', { detail: { mode } }));
    persistWorkspaceState();
  }

  // --- Intelligence Feed ---
  const INTEL_SEVERITY_COLOR = {
    critical: 'var(--fam-red)',
    major: 'var(--fam-gold)',
    minor: 'var(--fam-text-3)',
    opportunity: 'var(--fam-green)',
  };

  function makeIntelBtn(label, bg, color) {
    const btn = document.createElement('button');
    btn.textContent = label;
    btn.style.cssText = 'font-size:10px;padding:2px 7px;border-radius:3px;border:1px solid rgba(255,255,255,0.1);background:' + bg + ';color:' + color + ';cursor:pointer;white-space:nowrap;';
    return btn;
  }

  function dismissFinding(item, f) {
    fetch('/api/intel/dismiss', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ severity: f.severity, title: f.title, category: f.category }),
    }).then(() => {
      item.style.transition = 'opacity 0.2s';
      item.style.opacity = '0';
      setTimeout(() => { if (item.parentNode) item.parentNode.removeChild(item); }, 220);
    }).catch(() => {});
  }

  function logFindingToBacklog(btn, f) {
    btn.textContent = '...';
    btn.disabled = true;
    fetch('/api/intel/backlog', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ severity: f.severity, title: f.title, description: f.description, category: f.category }),
    }).then(r => r.json()).then(() => {
      btn.textContent = 'Logged \u2713';
      btn.style.color = 'var(--fam-green)';
    }).catch(() => {
      btn.textContent = 'Failed';
      btn.disabled = false;
    });
  }

  function runIntelDiagnostic(item, f) {
    const existing = item.querySelector('.intel-diag');
    if (existing) { existing.style.display = existing.style.display === 'none' ? '' : 'none'; return; }
    const box = document.createElement('div');
    box.className = 'intel-diag';
    box.style.cssText = 'margin-top:5px;padding:5px 7px;background:rgba(0,0,0,0.35);border-radius:4px;font-size:10px;color:var(--fam-text-3);font-family:monospace;white-space:pre;';
    box.textContent = 'Running\u2026';
    item.appendChild(box);
    fetch('/api/brain-status').then(r => r.json()).then(d => {
      const lines = ['claude','gemini','openai','codex'].filter(k => d[k]).map(k =>
        (d[k].status === 'connected' ? '\u2705' : '\u274C') + ' ' + k + ': ' + (d[k].model || d[k].status)
      );
      box.textContent = lines.join('\n') || 'No data';
    }).catch(() => { box.textContent = 'Diagnostic failed'; });
  }

  function toggleFindingDetail(item, f, btn) {
    const existing = item.querySelector('.intel-detail');
    if (existing) {
      const hidden = existing.style.display === 'none';
      existing.style.display = hidden ? '' : 'none';
      btn.textContent = hidden ? 'Hide details' : 'View details';
      return;
    }
    const box = document.createElement('div');
    box.className = 'intel-detail';
    box.style.cssText = 'margin-top:5px;padding:6px 8px;background:rgba(0,0,0,0.2);border-radius:4px;font-size:10px;color:var(--fam-text-2);line-height:1.5;';
    if (f.description) {
      const d = document.createElement('div');
      d.style.marginBottom = '4px';
      d.textContent = f.description;
      box.appendChild(d);
    }
    if (f.recommendation) {
      const r = document.createElement('div');
      r.style.color = 'var(--fam-green)';
      r.textContent = '\u2192 ' + f.recommendation;
      box.appendChild(r);
    }
    if (f.data && Object.keys(f.data).length) {
      const dEl = document.createElement('div');
      dEl.style.cssText = 'margin-top:4px;font-family:monospace;color:var(--fam-text-3);font-size:9px;word-break:break-all;';
      dEl.textContent = JSON.stringify(f.data, null, 2);
      box.appendChild(dEl);
    }
    item.appendChild(box);
    btn.textContent = 'Hide details';
  }

  function loadIntelligenceFeed() {
    const feed = document.getElementById('sidebar-intel-feed');
    if (!feed) return;
    feed.textContent = 'Loading...';
    fetch('/api/intel/findings').then(r => r.json()).then(data => {
      while (feed.firstChild) feed.removeChild(feed.firstChild);
      const findings = data.findings || [];
      if (!findings.length) {
        const msg = document.createElement('div');
        msg.style.cssText = 'padding:8px 12px;font-size:11px;color:var(--fam-text-3);';
        msg.textContent = 'No findings.';
        feed.appendChild(msg);
        return;
      }
      findings.slice(0, 10).forEach(f => {
        const item = document.createElement('div');
        item.style.cssText = 'padding:6px 12px 8px;border-bottom:1px solid var(--fam-border-2);';

        // Severity badge
        const badge = document.createElement('span');
        badge.style.cssText = 'font-size:9px;font-weight:700;color:' + (INTEL_SEVERITY_COLOR[f.severity] || 'var(--fam-text-3)') + ';text-transform:uppercase;display:block;margin-bottom:2px;';
        badge.textContent = f.severity || '';
        item.appendChild(badge);

        // Title
        const title = document.createElement('div');
        title.style.cssText = 'font-size:11px;color:var(--fam-text-2);margin-bottom:5px;line-height:1.4;';
        title.textContent = f.title || '';
        item.appendChild(title);

        // Action buttons
        const actions = document.createElement('div');
        actions.style.cssText = 'display:flex;gap:4px;flex-wrap:wrap;';
        const sev = f.severity;

        if (sev === 'critical' || sev === 'major') {
          const diagBtn = makeIntelBtn('Run diagnostic', 'rgba(127,119,221,0.12)', 'var(--fam-purple)');
          diagBtn.addEventListener('click', () => runIntelDiagnostic(item, f));
          actions.appendChild(diagBtn);
          const backlogBtn = makeIntelBtn('Log to backlog', 'rgba(255,193,53,0.1)', 'var(--fam-gold)');
          backlogBtn.addEventListener('click', () => logFindingToBacklog(backlogBtn, f));
          actions.appendChild(backlogBtn);
        }

        if (sev === 'opportunity') {
          const detailBtn = makeIntelBtn('View details', 'rgba(255,255,255,0.05)', 'var(--fam-text-2)');
          detailBtn.addEventListener('click', () => toggleFindingDetail(item, f, detailBtn));
          actions.appendChild(detailBtn);
          const dismissBtn = makeIntelBtn('Dismiss', 'rgba(255,255,255,0.03)', 'var(--fam-text-3)');
          dismissBtn.addEventListener('click', () => dismissFinding(item, f));
          actions.appendChild(dismissBtn);
        }

        if (sev === 'minor') {
          const dismissBtn = makeIntelBtn('Dismiss', 'rgba(255,255,255,0.03)', 'var(--fam-text-3)');
          dismissBtn.addEventListener('click', () => dismissFinding(item, f));
          actions.appendChild(dismissBtn);
        }

        item.appendChild(actions);
        feed.appendChild(item);
      });
    }).catch(() => { if (feed) feed.textContent = ''; });
  }

  // --- Research Feed ---

  const RESEARCH_CAT_COLOR = {
    trends:     'var(--fam-purple)',
    conversion: 'var(--fam-green)',
    ux:         'var(--fam-gold)',
    seo:        '#5ba3f5',
    trust:      'var(--fam-text-2)',
    general:    'var(--fam-text-3)',
  };

  function loadResearchFeed() {
    const list = document.getElementById('research-feed-list');
    if (!list) return;
    list.textContent = 'Loading\u2026';

    const cfg = window.currentSiteConfig || {};
    const vertical = cfg.business_type || '';
    const qs = vertical ? `?vertical=${encodeURIComponent(vertical)}&limit=8` : '?limit=8';

    fetch('/api/research/feed' + qs).then(r => r.json()).then(data => {
      while (list.firstChild) list.removeChild(list.firstChild);
      const findings = data.findings || [];
      if (!findings.length) {
        const msg = document.createElement('div');
        msg.style.cssText = 'padding:6px 12px;font-size:11px;color:var(--fam-text-3);';
        msg.textContent = 'No research yet \u2014 run research above.';
        list.appendChild(msg);
        return;
      }
      findings.forEach(f => {
        const item = document.createElement('div');
        item.style.cssText = 'padding:5px 12px 6px;border-bottom:1px solid var(--fam-border-2);';

        const badge = document.createElement('span');
        badge.style.cssText = 'font-size:9px;font-weight:700;color:' + (RESEARCH_CAT_COLOR[f.category] || 'var(--fam-text-3)') + ';text-transform:uppercase;display:block;margin-bottom:2px;letter-spacing:.04em;';
        badge.textContent = f.category || f.source || '';
        item.appendChild(badge);

        const title = document.createElement('div');
        title.style.cssText = 'font-size:11px;color:var(--fam-text-2);line-height:1.4;margin-bottom:2px;';
        title.textContent = f.title || f.question || '';
        item.appendChild(title);

        if (f.recommendation) {
          const rec = document.createElement('div');
          rec.style.cssText = 'font-size:10px;color:var(--fam-text-3);line-height:1.4;';
          rec.textContent = f.recommendation;
          item.appendChild(rec);
        }
        list.appendChild(item);
      });
    }).catch(() => {
      if (list) {
        while (list.firstChild) list.removeChild(list.firstChild);
        const msg = document.createElement('div');
        msg.style.cssText = 'padding:6px 12px;font-size:11px;color:var(--fam-text-3);';
        msg.textContent = 'Error loading feed.';
        list.appendChild(msg);
      }
    });
  }

  // ResearchPane: button handlers for the research sidebar pane
  window.ResearchPane = {
    runResearch: function() {
      const source = document.getElementById('research-source-select')?.value || 'gemini_loop';
      const question = (document.getElementById('research-question-input')?.value || '').trim();
      const btn = document.getElementById('research-run-btn');
      const status = document.getElementById('research-run-status');
      if (!status) return;
      if (btn) btn.disabled = true;
      status.textContent = 'Running\u2026';
      status.style.color = 'var(--fam-text-3)';
      fetch('/api/intel/run-research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source, question: question || undefined }),
      }).then(r => r.json()).then(data => {
        if (btn) btn.disabled = false;
        if (data.status === 'ok') {
          status.textContent = '\u2713 ' + (data.title || 'Done');
          status.style.color = 'var(--fam-green)';
          loadResearchFeed();
        } else if (data.status === 'no_answer') {
          status.textContent = 'No answer: ' + (data.reason || 'source returned nothing');
          status.style.color = 'var(--fam-gold)';
        } else {
          status.textContent = data.error || 'Error';
          status.style.color = 'var(--fam-red)';
        }
      }).catch(() => {
        if (btn) btn.disabled = false;
        if (status) { status.textContent = 'Request failed'; status.style.color = 'var(--fam-red)'; }
      });
    },

    manualIngest: function() {
      const content = (document.getElementById('research-ingest-content')?.value || '').trim();
      const status = document.getElementById('research-ingest-status');
      if (!content) {
        if (status) { status.textContent = 'Content required'; status.style.color = 'var(--fam-red)'; }
        return;
      }
      if (status) { status.textContent = 'Ingesting\u2026'; status.style.color = 'var(--fam-text-3)'; }
      fetch('/api/research/manual-ingest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      }).then(r => r.json()).then(data => {
        if (data.status === 'ok') {
          const cls = data.classification || {};
          if (status) {
            status.textContent = '\u2713 ' + (cls.category || '') + (cls.title ? ' \u2014 ' + cls.title : '');
            status.style.color = 'var(--fam-green)';
          }
          const inp = document.getElementById('research-ingest-content');
          if (inp) inp.value = '';
          loadResearchFeed();
        } else {
          if (status) { status.textContent = data.error || 'Error'; status.style.color = 'var(--fam-red)'; }
        }
      }).catch(() => {
        if (status) { status.textContent = 'Request failed'; status.style.color = 'var(--fam-red)'; }
      });
    },
  };

  // --- Context Bar Updates ---
  function updateContextBar(cfg, activePage) {
    const siteEl = document.getElementById('ctx-site-tag');
    const pageEl = document.getElementById('ctx-active-page');
    if (siteEl && cfg) siteEl.textContent = cfg.tag || '\u2014';
    if (pageEl) pageEl.textContent = activePage || 'index.html';
  }

  function syncWorkspaceChrome() {
    const toolsRow = document.getElementById('tools-row');
    const chatRow = document.getElementById('chat-input-row');
    const viewToggle = document.getElementById('view-toggle-group');
    const showBuildControls = activeTabId === 'chat' || activeTabId === 'brief';
    const showBuildComposer = activeTabId === 'chat';

    if (activeTabId !== 'chat' && typeof window.setViewMode === 'function') {
      window.setViewMode('chat');
    }

    if (toolsRow) toolsRow.style.display = showBuildControls ? '' : 'none';
    if (chatRow) chatRow.style.display = showBuildComposer ? '' : 'none';
    if (viewToggle) viewToggle.style.display = showBuildControls ? 'flex' : 'none';
    applyWorkspaceLayout();
    broadcastWorkspaceChrome();
  }

  function broadcastWorkspaceChrome() {
    const toolbar = document.getElementById('toolbar');
    const panel = document.getElementById('inspector-panel');
    const sidebar = document.getElementById('sidebar');
    const toolbarHeight = toolbar ? toolbar.getBoundingClientRect().height : 0;
    const inspectorOpen = !!(panel && panel.classList.contains('open'));
    const inspectorWidth = inspectorOpen ? (panel.getBoundingClientRect().width || 0) : 0;
    const sidebarVisible = !!(sidebar && !sidebar.classList.contains('collapsed'));
    document.documentElement.style.setProperty('--shay-lite-bottom-offset', Math.max(132, Math.round(toolbarHeight + 28)) + 'px');
    document.documentElement.style.setProperty('--shay-lite-right-offset', Math.max(24, Math.round(inspectorWidth + 24)) + 'px');
    document.documentElement.style.setProperty('--shay-lite-safe-area', Math.max(120, Math.round(inspectorWidth + 120)) + 'px');
    window.dispatchEvent(new CustomEvent('studio:workspace-chrome', {
      detail: {
        toolbar_height: toolbarHeight,
        inspector_open: inspectorOpen,
        inspector_width: inspectorWidth,
        sidebar_visible: sidebarVisible,
        sidebar_collapsed: !!sidebarCollapsed,
        active_tab: activeTabId,
        active_rail: activeRailItem,
        workspace_layout: workspaceLayoutMode,
      }
    }));
  }

  function getStudioState() {
    return window.cachedStudioState || null;
  }

  function getStudioSpec() {
    return getStudioState()?.spec || {};
  }

  function getSitePages() {
    return Array.isArray(window.sitePages) ? window.sitePages : [];
  }

  function getActivePage() {
    return window.activePage || 'index.html';
  }

  function makeContextKey(ctx) {
    if (!ctx) return '';
    return [
      ctx.type || '',
      ctx.page || '',
      ctx.section_id || '',
      ctx.component_ref || ctx.component_id || '',
      ctx.field_id || '',
      ctx.slot_id || '',
    ].join(':');
  }

  function cloneContext(ctx) {
    return ctx ? JSON.parse(JSON.stringify(ctx)) : null;
  }

  function parseComponentRef(ref) {
    if (!ref) return null;
    const parts = String(ref).split('@');
    return { id: parts[0], version: parts[1] || '1.0' };
  }

  function titleize(value) {
    return String(value || '')
      .replace(/[_-]+/g, ' ')
      .replace(/\.html$/i, '')
      .replace(/\b\w/g, c => c.toUpperCase());
  }

  function slugify(value) {
    return String(value || '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 64) || 'component';
  }

  function escapeHtml(text) {
    return String(text || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function loadPageFields(page, force) {
    if (!page) return Promise.resolve([]);
    if (!force && fieldCache[page]) return Promise.resolve(fieldCache[page]);
    return fetch('/api/content-fields/' + encodeURIComponent(page))
      .then(r => r.json())
      .then(data => {
        fieldCache[page] = Array.isArray(data.fields) ? data.fields : [];
        return fieldCache[page];
      })
      .catch(() => {
        fieldCache[page] = fieldCache[page] || [];
        return fieldCache[page];
      });
  }

  function getPageSections(page) {
    return getStudioSpec().content?.[page]?.sections || [];
  }

  function getPageSlots(page) {
    return (getStudioSpec().media_specs || []).filter(slot => {
      const slotPage = slot.page || 'index.html';
      return slotPage === page || slotPage === page.replace(/\.html$/i, '');
    });
  }

  function renderHierarchyTree() {
    const sidebarList = document.getElementById('sidebar-pages-list');
    if (!sidebarList) return;
    const pages = getSitePages();
    const activePage = getActivePage();

    loadPageFields(activePage).then(fields => {
      hierarchyTree = pages.map(page => ({
        type: 'page',
        page,
        label: titleize(page),
        meta: page,
        children: page === activePage ? derivePageChildren(page, fields) : [],
      }));
      drawHierarchyTree(sidebarList, hierarchyTree);
    });
  }

  function derivePageChildren(page, fields) {
    const sections = getPageSections(page);
    const slots = getPageSlots(page);
    const children = [];

    sections.forEach((section, index) => {
      const label = titleize(section.section_label || section.section_type || section.section_id || ('section-' + (index + 1)));
      const sectionNode = {
        type: 'section',
        page,
        section_id: section.section_id || '',
        section_type: section.section_type || 'section',
        component_ref: section.component_ref || '',
        label,
        meta: section.section_type || section.component_ref || 'Section',
        children: [],
      };

      if (section.component_ref) {
        const component = parseComponentRef(section.component_ref);
        sectionNode.children.push({
          type: 'component',
          page,
          section_id: section.section_id || '',
          component_ref: section.component_ref,
          component_id: component?.id || section.component_ref,
          label: titleize(component?.id || section.component_ref),
          meta: 'Library component',
          children: [],
        });
      }

      children.push(sectionNode);
    });

    fields.forEach(field => {
      children.push({
        type: 'field',
        page,
        field_id: field.field_id,
        field_type: field.type || field.scope || 'text',
        label: titleize(field.label || field.field_id),
        meta: field.type || 'Field',
        value: field.value,
        children: [],
      });
    });

    slots.forEach(slot => {
      children.push({
        type: 'media',
        page,
        slot_id: slot.slot_id,
        role: slot.role || 'image',
        status: slot.status || 'empty',
        mapping: getStudioSpec().slot_mappings?.[slot.slot_id] || null,
        label: titleize(slot.slot_id),
        meta: (slot.role || 'image') + ' · ' + (slot.status || 'empty'),
        children: [],
      });
    });

    return children;
  }

  function drawHierarchyTree(container, nodes) {
    while (container.firstChild) container.removeChild(container.firstChild);
    nodes.forEach(node => {
      container.appendChild(createHierarchyNode(node, 0));
      node.children.forEach(child => appendHierarchyChild(container, child, 1));
    });
  }

  function appendHierarchyChild(container, node, level) {
    container.appendChild(createHierarchyNode(node, level));
    (node.children || []).forEach(child => appendHierarchyChild(container, child, level + 1));
  }

  function createHierarchyNode(node, level) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'page-tree-node ' + (node.type || 'node');
    if (node.page === getActivePage() && node.type === 'page') btn.classList.add('active');
    if (selectedContext && makeContextKey(selectedContext) === makeContextKey(node)) btn.classList.add('active');
    btn.style.paddingLeft = (12 + level * 18) + 'px';

    const icon = document.createElement('span');
    icon.className = 'page-tree-icon';
    icon.textContent = node.type === 'page'
      ? '◻'
      : node.type === 'section'
        ? '▤'
        : node.type === 'component'
          ? '◫'
          : node.type === 'field'
            ? '✎'
            : '◈';
    btn.appendChild(icon);

    const body = document.createElement('span');
    body.style.display = 'flex';
    body.style.flexDirection = 'column';
    body.style.minWidth = '0';

    const label = document.createElement('span');
    label.textContent = node.label;
    body.appendChild(label);

    if (node.meta) {
      const meta = document.createElement('span');
      meta.className = 'page-tree-meta';
      meta.textContent = node.meta;
      body.appendChild(meta);
    }

    btn.appendChild(body);
    btn.addEventListener('click', () => selectContext(node, { source: 'hierarchy' }));
    return btn;
  }

  function ensureInspectorOpen() {
    const panel = document.getElementById('inspector-panel');
    const workspaceMain = document.getElementById('workspace-main');
    if (!panel) return;
    panel.classList.add('open');
    panel.classList.remove('collapsed');
    if (workspaceMain) workspaceMain.classList.add('inspect-active');
    persistWorkspaceState();
  }

  function closeInspector() {
    const panel = document.getElementById('inspector-panel');
    const workspaceMain = document.getElementById('workspace-main');
    if (!panel) return;
    panel.classList.remove('open');
    panel.classList.add('collapsed');
    if (workspaceMain && !inspectorPinned) workspaceMain.classList.remove('inspect-active');
    persistWorkspaceState();
  }

  function setInspectorHeader(title, eyebrow) {
    const eyebrowEl = document.getElementById('inspector-eyebrow');
    const titleEl = document.getElementById('inspector-title');
    if (eyebrowEl) eyebrowEl.textContent = eyebrow || 'Inspector';
    if (titleEl) titleEl.textContent = title || 'Selection';
  }

  function renderInspectorBody(renderFn) {
    const body = document.getElementById('inspector-body');
    if (!body) return null;
    while (body.firstChild) body.removeChild(body.firstChild);
    if (renderFn) renderFn(body);
    return body;
  }

  function appendInspectorMeta(container, label, value) {
    const row = document.createElement('div');
    row.className = 'inspector-meta-row';
    const labelEl = document.createElement('div');
    labelEl.className = 'inspector-meta-label';
    labelEl.textContent = label;
    const valueEl = document.createElement('div');
    valueEl.className = 'inspector-meta-value';
    valueEl.textContent = value || '—';
    row.appendChild(labelEl);
    row.appendChild(valueEl);
    container.appendChild(row);
  }

  function appendInspectorStatus(container, text, tone) {
    const note = document.createElement('div');
    note.className = 'inspector-status ' + (tone || 'info');
    note.textContent = text;
    container.appendChild(note);
    return note;
  }

  function makeInspectorButton(label, onClick, tone) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'inspector-btn' + (tone ? ' ' + tone : '');
    btn.textContent = label;
    btn.addEventListener('click', onClick);
    return btn;
  }

  function renderInspector(ctx) {
    if (!ctx) {
      setInspectorHeader('Nothing selected', 'Inspector');
      renderInspectorBody(body => {
        body.innerHTML = '<div class="inspector-empty"><div class="inspector-empty-title">Selection-aware editing</div><div class="inspector-empty-copy">Click a page, section, component, field, or image to inspect and edit it here.</div></div>';
      });
      return;
    }

    ensureInspectorOpen();

    if (ctx.type === 'page') return renderPageInspector(ctx);
    if (ctx.type === 'section') return renderSectionInspector(ctx);
    if (ctx.type === 'component') return renderComponentInspector(ctx);
    if (ctx.type === 'field') return renderFieldInspector(ctx);
    if (ctx.type === 'media') return renderMediaInspector(ctx);
  }

  function renderPageInspector(ctx) {
    const spec = getStudioSpec();
    const pageConfig = spec.content?.[ctx.page] || {};
    setInspectorHeader(titleize(ctx.page), 'Page');
    renderInspectorBody(body => {
      appendInspectorMeta(body, 'Path', ctx.page);
      appendInspectorMeta(body, 'Sections', String((pageConfig.sections || []).length));
      appendInspectorMeta(body, 'Editable fields', String((fieldCache[ctx.page] || []).length));
      appendInspectorMeta(body, 'Media slots', String(getPageSlots(ctx.page).length));
      const actions = document.createElement('div');
      actions.className = 'inspector-actions';
      actions.appendChild(makeInspectorButton('Open preview', () => {
        if (window.navigateToPage) window.navigateToPage(ctx.page, { source: 'inspector-page' });
      }, 'primary'));
      actions.appendChild(makeInspectorButton('Open build chat', () => switchTab('chat')));
      body.appendChild(actions);
    });
  }

  function renderSectionInspector(ctx) {
    const section = getPageSections(ctx.page).find(item => item.section_id === ctx.section_id) || ctx;
    setInspectorHeader(titleize(section.section_label || section.section_id || 'Section'), 'Section');
    renderInspectorBody(body => {
      appendInspectorMeta(body, 'Page', ctx.page);
      appendInspectorMeta(body, 'Section id', section.section_id || '—');
      appendInspectorMeta(body, 'Type', section.section_type || 'section');
      appendInspectorMeta(body, 'Component ref', section.component_ref || 'Local section');
      const actions = document.createElement('div');
      actions.className = 'inspector-actions';
      actions.appendChild(makeInspectorButton('Open preview', () => selectContext({ type: 'page', page: ctx.page }, { source: 'section-preview' }), 'primary'));
      actions.appendChild(makeInspectorButton('Export to library', () => exportSectionToLibrary(section)));
      body.appendChild(actions);
    });
  }

  function renderComponentInspector(ctx) {
    const component = parseComponentRef(ctx.component_ref) || { id: ctx.component_id || 'component', version: '1.0' };
    setInspectorHeader(titleize(component.id), 'Component');
    renderInspectorBody(body => {
      appendInspectorMeta(body, 'Page', ctx.page);
      appendInspectorMeta(body, 'Section id', ctx.section_id || '—');
      appendInspectorMeta(body, 'Component', component.id);
      appendInspectorMeta(body, 'Version', component.version);
      const actions = document.createElement('div');
      actions.className = 'inspector-actions';
      actions.appendChild(makeInspectorButton('Open in Components', () => openComponentsWorkspaceForSelection(ctx), 'primary'));
      actions.appendChild(makeInspectorButton('Export update', () => exportSectionToLibrary(ctx)));
      body.appendChild(actions);
    });
  }

  function renderFieldInspector(ctx) {
    setInspectorHeader(titleize(ctx.label || ctx.field_id), 'Editable field');
    renderInspectorBody(body => {
      appendInspectorMeta(body, 'Page', ctx.page);
      appendInspectorMeta(body, 'Field id', ctx.field_id);
      appendInspectorMeta(body, 'Type', ctx.field_type || 'text');

      const label = document.createElement('label');
      label.className = 'inspector-field-label';
      label.textContent = 'Value';
      body.appendChild(label);

      const input = document.createElement((String(ctx.value || '').length > 80) ? 'textarea' : 'input');
      input.className = 'inspector-field-input';
      if (input.tagName === 'TEXTAREA') input.rows = 5;
      input.value = typeof ctx.value === 'string' ? ctx.value : (ctx.value?.text || '');
      body.appendChild(input);

      const status = appendInspectorStatus(body, 'Changes save directly into the built HTML and spec.', 'info');
      const actions = document.createElement('div');
      actions.className = 'inspector-actions';
      actions.appendChild(makeInspectorButton('Save field', () => saveFieldValue(ctx, input.value, status), 'primary'));
      actions.appendChild(makeInspectorButton('Open preview', () => selectContext({ type: 'page', page: ctx.page }, { source: 'field-preview' })));
      body.appendChild(actions);
    });
  }

  function renderMediaInspector(ctx) {
    const mapping = ctx.mapping || getStudioSpec().slot_mappings?.[ctx.slot_id] || null;
    setInspectorHeader(titleize(ctx.label || ctx.slot_id), 'Media slot');
    renderInspectorBody(body => {
      appendInspectorMeta(body, 'Page', ctx.page);
      appendInspectorMeta(body, 'Slot id', ctx.slot_id);
      appendInspectorMeta(body, 'Role', ctx.role || 'image');
      appendInspectorMeta(body, 'Status', ctx.status || 'empty');
      appendInspectorMeta(body, 'Mapped asset', mapping?.filename || mapping?.asset || 'Unassigned');
      const status = appendInspectorStatus(body, 'Send this slot into Media Studio and return here when you are done.', 'info');
      const actions = document.createElement('div');
      actions.className = 'inspector-actions';
      actions.appendChild(makeInspectorButton('Open in Media Studio', () => openMediaStudioForSlot(ctx.slot_id, ctx), 'primary'));
      actions.appendChild(makeInspectorButton('Return to parent', () => returnToPreviousContext()));
      body.appendChild(actions);
      if (!returnStack.length) status.textContent = 'Use Media Studio for slot assignment, generation, or replacement.';
    });
  }

  function exportSectionToLibrary(ctx) {
    const sectionId = ctx.section_id || '';
    const defaultId = slugify(ctx.component_id || ctx.section_id || ctx.section_type || ctx.label || 'component');
    const componentId = window.prompt('Component ID for library export:', defaultId);
    if (!componentId) return;
    fetch('/api/components/export', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        page: ctx.page,
        section_id: sectionId || undefined,
        component_id: componentId,
      }),
    }).then(r => r.json()).then(data => {
      if (data.success) {
        renderInspectorBody(body => {
          appendInspectorStatus(body, 'Component exported to library as ' + componentId + '.', 'success');
          appendInspectorMeta(body, 'Fields', String(data.field_count || 0));
          appendInspectorMeta(body, 'Slots', String(data.slot_count || 0));
          const actions = document.createElement('div');
          actions.className = 'inspector-actions';
          actions.appendChild(makeInspectorButton('Open in Components', () => openComponentsWorkspaceForSelection({
            type: 'component',
            page: ctx.page,
            section_id: sectionId || '',
            component_id: componentId,
            component_ref: componentId + '@' + (((data.component || {}).version) || '1.0'),
          }), 'primary'));
          body.appendChild(actions);
        });
      }
    }).catch(() => {
      renderInspectorBody(body => {
        appendInspectorStatus(body, 'Component export failed.', 'error');
      });
    });
  }

  function saveFieldValue(ctx, value, statusEl) {
    if (statusEl) {
      statusEl.textContent = 'Saving…';
      statusEl.className = 'inspector-status info';
    }
    fetch('/api/content-field', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ page: ctx.page, field_id: ctx.field_id, new_value: value }),
    }).then(r => r.json()).then(data => {
      if (data.error) throw new Error(data.error);
      fieldCache[ctx.page] = (fieldCache[ctx.page] || []).map(field =>
        field.field_id === ctx.field_id ? { ...field, value } : field
      );
      if (statusEl) {
        statusEl.textContent = 'Saved directly into the page.';
        statusEl.className = 'inspector-status success';
      }
      if (typeof window.reloadPreview === 'function') window.reloadPreview();
      if (typeof window.refreshStudioPanel === 'function') window.refreshStudioPanel();
      renderHierarchyTree();
    }).catch(err => {
      if (statusEl) {
        statusEl.textContent = err.message || 'Save failed.';
        statusEl.className = 'inspector-status error';
      }
    });
  }

  function openMediaStudioForSlot(slotId, returnContextOverride) {
    const returnContext = cloneContext(returnContextOverride || selectedContext);
    if (returnContext) returnStack.push(returnContext);
    switchTab('assets');
    window.dispatchEvent(new CustomEvent('studio:open-slot', {
      detail: {
        slotId,
        returnContext,
      },
    }));
    persistWorkspaceState();
  }

  function openComponentsWorkspaceForSelection(ctx) {
    const nextContext = cloneContext(ctx || selectedContext);
    switchTab('components');
    window.dispatchEvent(new CustomEvent('studio:open-component', {
      detail: {
        selection: nextContext,
        componentId: nextContext && (nextContext.component_id || parseComponentRef(nextContext.component_ref)?.id) || null,
      },
    }));
    persistWorkspaceState();
  }

  function returnToPreviousContext() {
    const ctx = returnStack.pop();
    if (!ctx) return;
    selectContext(ctx, { source: 'return-stack' });
    persistWorkspaceState();
  }

  function selectContext(ctx, opts) {
    opts = opts || {};
    selectedContext = cloneContext(ctx);
    const page = ctx.page || getActivePage();
    if (activeTabId !== 'chat' && ctx.type !== 'media-only') switchTab('chat');
    if (typeof window.navigateToPage === 'function' && page) {
      if (getActivePage() !== page) {
        window.navigateToPage(page, { source: opts.source || 'selection' });
      } else if (typeof window.setViewMode === 'function') {
        window.setViewMode('preview');
      }
    }
    renderHierarchyTree();
    renderInspector(selectedContext);
    syncSelectionToPreview(selectedContext);
    persistWorkspaceState();
  }

  function handlePreviewMessage(event) {
    if (!event || !event.data || typeof event.data !== 'object') return;
    const data = event.data;
    if (data.type === 'preview-ready') {
      if (selectedContext) syncSelectionToPreview(selectedContext);
      return;
    }
    if (data.type === 'slot-mode-navigate' && data.page) {
      if (window.ws && window.ws.readyState === WebSocket.OPEN) {
        window.ws.send(JSON.stringify({ type: 'set-page', page: data.page }));
      }
      selectContext({ type: 'page', page: data.page }, { source: 'preview-nav' });
      return;
    }
    if (data.type === 'preview-select' && data.selection) {
      selectContext(data.selection, { source: data.source || 'preview-select' });
      return;
    }
    if (data.type === 'slot-click' && data.slotId) {
      const slot = getPageSlots(getActivePage()).find(item => item.slot_id === data.slotId) || {};
      selectContext({
        type: 'media',
        page: getActivePage(),
        slot_id: data.slotId,
        role: data.role || slot.role || 'image',
        status: data.status || slot.status || 'empty',
        mapping: getStudioSpec().slot_mappings?.[data.slotId] || null,
        label: data.slotId,
      }, { source: 'slot-click' });
    }
  }

  function syncSelectionToPreview(ctx) {
    const frame = document.getElementById('preview-frame');
    if (!frame || !frame.contentWindow || !ctx) return;
    try {
      frame.contentWindow.postMessage({ type: 'studio-selection-sync', selection: cloneContext(ctx) }, '*');
    } catch (_) {}
  }

  function updateLayoutButtons() {
    document.querySelectorAll('.layout-preset-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.layout === workspaceLayoutMode);
    });
  }

  function applyWorkspaceLayout() {
    const canvasArea = document.getElementById('canvas-area');
    const tabsArea = document.getElementById('canvas-tabs-area');
    const previewSection = document.getElementById('canvas-preview-section');
    const workspaceMain = document.getElementById('workspace-main');
    const panel = document.getElementById('inspector-panel');
    if (!canvasArea || !tabsArea || !previewSection || !workspaceMain || !panel) return;

    canvasArea.classList.remove('layout-compose', 'layout-inspect', 'layout-dual', 'layout-focus');
    canvasArea.classList.add('layout-' + workspaceLayoutMode);
    workspaceMain.classList.toggle('inspector-pinned', inspectorPinned || workspaceLayoutMode === 'inspect');

    if (workspaceLayoutMode === 'dual' && activeTabId === 'chat') {
      tabsArea.style.display = 'flex';
      previewSection.style.display = 'flex';
      if (window._currentViewMode !== 'preview') {
        const chatBtn = document.getElementById('view-toggle-chat');
        const previewBtn = document.getElementById('view-toggle-preview');
        if (chatBtn) { chatBtn.style.background = 'var(--fam-bg-3)'; chatBtn.style.color = 'var(--fam-text-2)'; chatBtn.style.fontWeight = '500'; }
        if (previewBtn) { previewBtn.style.background = 'rgba(232,53,42,0.15)'; previewBtn.style.color = 'var(--fam-red)'; previewBtn.style.fontWeight = '600'; }
      }
      if (panel.classList.contains('open')) workspaceMain.classList.add('inspect-active');
    } else if (workspaceLayoutMode === 'focus') {
      tabsArea.style.display = 'none';
      previewSection.style.display = 'flex';
      inspectorPinned = false;
      closeInspector();
      if (window._currentViewMode !== 'preview' && typeof window.setViewMode === 'function') {
        window.setViewMode('preview');
      }
    } else {
      if (window._currentViewMode === 'preview') {
        tabsArea.style.display = 'none';
        previewSection.style.display = 'flex';
      } else {
        tabsArea.style.display = '';
        previewSection.style.display = 'none';
      }
    }

    if (workspaceLayoutMode === 'inspect') {
      inspectorPinned = true;
      ensureInspectorOpen();
    } else if (!selectedContext) {
      inspectorPinned = false;
      closeInspector();
    }

    updateLayoutButtons();
  }

  function setWorkspaceLayout(mode) {
    workspaceLayoutMode = ['compose', 'inspect', 'dual', 'focus'].includes(mode) ? mode : 'compose';
    if (workspaceLayoutMode !== 'inspect') inspectorPinned = false;
    applyWorkspaceLayout();
    persistWorkspaceState();
  }

  function syncComposerModelMenu(model) {
    const current = model || 'claude-sonnet-4-6';
    document.querySelectorAll('.model-menu-option').forEach(option => {
      option.classList.toggle('active', option.dataset.model === current);
    });
    const pill = document.getElementById('model-pill');
    if (pill) pill.textContent = composerModelLabels[current] || 'Sonnet';
  }

  function toggleModelMenu(event) {
    if (event) event.stopPropagation();
    const menu = document.getElementById('model-menu');
    if (!menu) return;
    menu.classList.toggle('hidden');
  }

  function setComposerModel(model, event) {
    if (event) event.stopPropagation();
    fetch('/api/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model }),
    }).then(r => r.json()).then(() => {
      syncComposerModelMenu(model);
      if (window.BrainSelector && typeof BrainSelector.setModel === 'function') {
        BrainSelector.setModel('claude', model);
      }
      const menu = document.getElementById('model-menu');
      if (menu) menu.classList.add('hidden');
    }).catch(() => {});
  }

  function beginInspectorResize(event) {
    const panel = document.getElementById('inspector-panel');
    const workspaceMain = document.getElementById('workspace-main');
    if (!panel || !workspaceMain) return;
    isResizingInspector = true;
    workspaceMain.classList.add('resizing', 'inspect-active');
    ensureInspectorOpen();
    inspectorPinned = true;
    const onMove = moveEvent => {
      const width = Math.max(260, Math.min(520, window.innerWidth - moveEvent.clientX));
      panel.style.setProperty('--inspector-width', width + 'px');
      document.documentElement.style.setProperty('--inspector-width', width + 'px');
      broadcastWorkspaceChrome();
    };
    const onUp = () => {
      isResizingInspector = false;
      workspaceMain.classList.remove('resizing');
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      persistWorkspaceState();
      broadcastWorkspaceChrome();
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }

  function summarizeHierarchy(nodes) {
    const summary = { pages: 0, sections: 0, components: 0, fields: 0, media: 0 };
    function walk(list) {
      (list || []).forEach(node => {
        if (!node || !node.type) return;
        if (node.type === 'page') summary.pages += 1;
        else if (node.type === 'section') summary.sections += 1;
        else if (node.type === 'component') summary.components += 1;
        else if (node.type === 'field') summary.fields += 1;
        else if (node.type === 'media') summary.media += 1;
        walk(node.children || []);
      });
    }
    walk(nodes || []);
    return summary;
  }

  function getWorkspaceState() {
    const panel = document.getElementById('inspector-panel');
    const sidebar = document.getElementById('sidebar');
    return {
      active_rail: activeRailItem,
      sidebar_collapsed: !!sidebarCollapsed,
      sidebar_visible: !!(sidebar && !sidebar.classList.contains('collapsed')),
      active_mode: activeMode,
      active_tab: activeTabId,
      active_page: getActivePage(),
      workspace_layout: workspaceLayoutMode,
      inspector_pinned: !!inspectorPinned,
      inspector_open: !!(panel && panel.classList.contains('open')),
      selected_context: cloneContext(selectedContext),
      return_stack: returnStack.map(cloneContext),
      open_tabs: tabs.map(tab => ({
        id: tab.id,
        label: tab.label,
        pane_id: tab.paneId,
        closeable: !!tab.closeable,
      })),
      hierarchy_summary: summarizeHierarchy(hierarchyTree),
    };
  }

  // --- Public API ---
  window.StudioShell = {
    switchTab: switchTab,
    addTab: addTab,
    removeTab: removeTab,
    switchMode: switchMode,
    switchRailItem: switchRailItem,
    setWorkspaceLayout: setWorkspaceLayout,
    applyWorkspaceLayout: applyWorkspaceLayout,
    toggleModelMenu: toggleModelMenu,
    setComposerModel: setComposerModel,
    toggleSidebar: toggleSidebar,
    loadSiteTree: loadSiteTree,
    updateContextBar: updateContextBar,
    renderHierarchyTree: renderHierarchyTree,
    selectContext: selectContext,
    openMediaForSlot: openMediaStudioForSlot,
    openComponentsForSelection: openComponentsWorkspaceForSelection,
    returnToPreviousContext: returnToPreviousContext,
    getWorkspaceState: getWorkspaceState,
    get activeMode() { return activeMode; },
    get activeTabId() { return activeTabId; },
    get activeRailItemId() { return activeRailItem; },
  };

  // --- Init ---
  document.addEventListener('DOMContentLoaded', () => {
    initSidebar();
    initRail();
    initTabs();
    initModes();
    applyPersistedWorkspaceState(readPersistedWorkspaceState());
    syncWorkspaceChrome();
    renderHierarchyTree();
    updateLayoutButtons();
    switchRailItem(activeRailItem, { fromTabSync: true });
    if (activeMode) switchMode(activeMode);
    if (activeTabId && tabs.find(t => t.id === activeTabId)) switchTab(activeTabId);
    else switchTab('chat');
    applyWorkspaceLayout();
    broadcastWorkspaceChrome();
    if (selectedContext) renderInspector(selectedContext);
    // Eagerly load the site tree so "Recent sites" populates without requiring
    // the user to click the Sites rail button first
    loadSiteTree();

    fetch('/api/settings').then(r => r.json()).then(settings => {
      syncComposerModelMenu(settings.model || 'claude-sonnet-4-6');
    }).catch(() => {});

    // Re-sync sidebar and dynamic area when site changes
    window.addEventListener('studio:site-changed', (event) => {
      const saved = readPersistedWorkspaceState(event && event.detail && event.detail.tag);
      selectedContext = null;
      returnStack = [];
      Object.keys(fieldCache).forEach(key => delete fieldCache[key]);
      if (saved) applyPersistedWorkspaceState(saved);
      loadSiteTree();
      syncSidebarNavActive();
      renderHierarchyTree();
      if (selectedContext) {
        renderInspector(selectedContext);
        syncSelectionToPreview(selectedContext);
      } else {
        renderInspector(null);
      }
      syncWorkspaceChrome();
      persistWorkspaceState(event && event.detail && event.detail.tag);
    });

    window.addEventListener('studio:pages-updated', renderHierarchyTree);
    window.addEventListener('studio:state-refreshed', () => {
      Object.keys(fieldCache).forEach(key => delete fieldCache[key]);
      renderHierarchyTree();
    });
    window.addEventListener('studio:page-selected', () => {
      renderHierarchyTree();
      persistWorkspaceState();
    });
    window.addEventListener('message', handlePreviewMessage);
    document.querySelectorAll('.layout-preset-btn').forEach(btn => {
      btn.addEventListener('click', () => setWorkspaceLayout(btn.dataset.layout));
    });
    const resizer = document.getElementById('inspector-resizer');
    if (resizer) resizer.addEventListener('mousedown', beginInspectorResize);
    document.addEventListener('click', event => {
      const menu = document.getElementById('model-menu');
      const pill = document.getElementById('model-pill');
      if (!menu || menu.classList.contains('hidden')) return;
      if (menu.contains(event.target) || (pill && pill.contains(event.target))) return;
      menu.classList.add('hidden');
    });

    const inspectorClose = document.getElementById('inspector-close-btn');
    if (inspectorClose) inspectorClose.addEventListener('click', () => {
      inspectorPinned = false;
      if (workspaceLayoutMode === 'inspect') setWorkspaceLayout('compose');
      closeInspector();
    });

    // Keyboard shortcut: Cmd/Ctrl+B toggles sidebar
    document.addEventListener('keydown', e => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'b') { e.preventDefault(); toggleSidebar(); }
    });
    window.addEventListener('resize', broadcastWorkspaceChrome);

    // No drag resizer needed — toggle layout switches full views
  });
})();
