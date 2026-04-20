// studio-shell.js — Activity rail, sidebar, tab system, mode switching

(function() {
  // --- State ---
  let activeRailItem = 'site';
  let sidebarCollapsed = false;
  let activeMode = 'build';
  let tabs = []; // [{id, label, paneId, closeable}]
  let activeTabId = 'chat';

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

  function switchRailItem(item) {
    activeRailItem = item;
    document.querySelectorAll('.rail-btn').forEach(b => b.classList.toggle('active', b.dataset.rail === item));
    document.querySelectorAll('.sidebar-pane').forEach(p => p.classList.toggle('hidden', p.dataset.pane !== item));
    // Trigger pane load hooks
    if (item === 'site') loadSiteTree();
    if (item === 'intelligence') loadIntelligenceFeed();
    if (item === 'research') loadResearchFeed();
  }

  // --- Sidebar ---
  function toggleSidebar() {
    sidebarCollapsed = !sidebarCollapsed;
    const sidebar = document.getElementById('sidebar');
    sidebar.classList.toggle('collapsed', sidebarCollapsed);
    localStorage.setItem('sidebar-collapsed', sidebarCollapsed ? '1' : '0');
  }

  function initSidebar() {
    const stored = localStorage.getItem('sidebar-collapsed');
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
    // Brief/Assets/Deploy moved to sidebar nav — tab bar now only shows Chat.
    tabs = [
      { id: 'chat',    label: 'Chat',    paneId: 'tab-pane-chat',    closeable: false },
      { id: 'brief',   label: 'Brief',   paneId: 'tab-pane-brief',   closeable: false },
      { id: 'assets',  label: 'Assets',  paneId: 'tab-pane-assets',  closeable: false },
      { id: 'deploy',  label: 'Deploy',  paneId: 'tab-pane-deploy',  closeable: false },
    ];
    // But only render Chat in the tab bar — others are accessible via sidebar
    // (renderTabs is overridden below to skip non-chat tabs)
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
    // Only render Chat + closeable dynamic tabs in the tab bar.
    // Brief/Assets/Deploy are accessible via sidebar nav items.
    const tabBarTabs = tabs.filter(t => t.id === 'chat' || t.closeable);
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
    // Focus chat input when switching to chat tab
    if (tabId === 'chat') setTimeout(() => document.getElementById('chat-input')?.focus(), 50);
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
    localStorage.setItem('active-tab', tabId);
    syncSidebarNavActive();
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
    localStorage.setItem('active-mode', mode);
    window.dispatchEvent(new CustomEvent('pip:mode-changed', { detail: { mode } }));
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

  // --- Public API ---
  window.StudioShell = {
    switchTab: switchTab,
    addTab: addTab,
    removeTab: removeTab,
    switchMode: switchMode,
    switchRailItem: switchRailItem,
    toggleSidebar: toggleSidebar,
    loadSiteTree: loadSiteTree,
    updateContextBar: updateContextBar,
    get activeMode() { return activeMode; },
    get activeTabId() { return activeTabId; },
  };

  // --- Init ---
  document.addEventListener('DOMContentLoaded', () => {
    initSidebar();
    initRail();
    initTabs();
    initModes();
    // Restore persisted state
    const savedMode = localStorage.getItem('active-mode');
    if (savedMode) switchMode(savedMode);
    const savedTab = localStorage.getItem('active-tab');
    if (savedTab && tabs.find(t => t.id === savedTab)) switchTab(savedTab);
    // Eagerly load the site tree so "Recent sites" populates without requiring
    // the user to click the Sites rail button first
    loadSiteTree();

    // Re-sync sidebar and dynamic area when site changes
    window.addEventListener('studio:site-changed', () => {
      loadSiteTree();
      syncSidebarNavActive();
    });

    // Keyboard shortcut: Cmd/Ctrl+B toggles sidebar
    document.addEventListener('keydown', e => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'b') { e.preventDefault(); toggleSidebar(); }
    });

    // No drag resizer needed — toggle layout switches full views
  });
})();
