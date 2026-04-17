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
  function loadIntelligenceFeed() {
    const feed = document.getElementById('sidebar-intel-feed');
    if (!feed) return;
    feed.textContent = 'Loading...';
    fetch('/api/intel/findings').then(r => r.json()).then(data => {
      while (feed.firstChild) feed.removeChild(feed.firstChild);
      const findings = data.findings || [];
      if (!findings.length) {
        feed.textContent = 'No findings yet.';
        feed.style.cssText = 'padding:8px 12px;font-size:11px;color:var(--fam-text-3);';
        return;
      }
      const colors = { critical:'var(--fam-red)', high:'var(--fam-gold)', opportunity:'var(--fam-green)', info:'var(--fam-text-3)' };
      findings.slice(0, 10).forEach(function(f) {
        const item = document.createElement('div');
        item.style.cssText = 'padding:6px 12px;border-bottom:1px solid var(--fam-border-2);cursor:pointer;';
        item.onmouseenter = () => item.style.background = 'rgba(255,255,255,0.03)';
        item.onmouseleave = () => item.style.background = '';
        const badge = document.createElement('span');
        badge.style.cssText = 'font-size:9px;font-weight:700;color:' + (colors[f.severity] || 'var(--fam-text-3)') + ';text-transform:uppercase;';
        badge.textContent = f.severity || '';
        item.appendChild(badge);
        const msgEl = document.createElement('div');
        msgEl.style.cssText = 'font-size:11px;color:var(--fam-text-2);margin-top:2px;line-height:1.4;';
        msgEl.textContent = f.title || f.message || '';
        item.appendChild(msgEl);
        feed.appendChild(item);
      });
    }).catch(() => { if (feed) feed.textContent = ''; });
  }

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
