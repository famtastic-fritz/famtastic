// studio-screens.js — Assets/Components, Settings, Mission Control, Deploy
// Mounts into their respective tab panes on first activation.

(function () {
  'use strict';

  function clearEl(el) { while (el.firstChild) el.removeChild(el.firstChild); }

  function mkEl(tag, opts) {
    var el = document.createElement(tag);
    if (opts) {
      if (opts.className) el.className = opts.className;
      if (opts.text) el.textContent = opts.text;
      if (opts.style) el.style.cssText = opts.style;
      if (opts.title) el.title = opts.title;
    }
    return el;
  }

  // ── Lazy mount helper ────────────────────────────────────────────────────
  var mounted = {};

  function mountOnce(tabId, fn) {
    if (mounted[tabId]) return;
    mounted[tabId] = true;
    fn();
  }

  // ── ASSETS TAB: Component tree + media library ───────────────────────────
  function mountAssets() {
    var pane = document.getElementById('tab-pane-assets');
    if (!pane) return;
    clearEl(pane);
    pane.style.cssText = 'display:flex;flex-direction:column;height:100%;overflow:hidden;';

    var view = mkEl('div', { className: 'screen-three-panel' });
    view.style.flex = '1';

    // Left: component tree
    var left = mkEl('div', { className: 'screen-left' });
    left.appendChild(mkEl('div', { className: 'screen-header', text: 'Components' }));
    var tree = mkEl('div');
    tree.id = 'component-tree';
    tree.style.cssText = 'flex:1;overflow-y:auto;';
    left.appendChild(tree);
    view.appendChild(left);

    // Center: component detail
    var center = mkEl('div', { className: 'screen-center' });
    var detail = mkEl('div', { className: 'component-detail' });
    detail.id = 'component-detail';
    var placeholder = mkEl('div', { style: 'color:var(--fam-text-3);font-size:12px;padding:20px 0;text-align:center;', text: 'Select a component from the tree' });
    detail.appendChild(placeholder);
    center.appendChild(detail);
    view.appendChild(center);

    // Right: media library
    var right = mkEl('div', { className: 'screen-right' });
    right.appendChild(mkEl('div', { className: 'screen-header', text: 'Media Library' }));
    var lib = mkEl('div', { className: 'media-library' });
    lib.id = 'media-library';
    var search = mkEl('input', { className: 'media-library-search' });
    search.placeholder = 'Search assets...';
    search.type = 'text';
    lib.appendChild(search);
    var grid = mkEl('div', { className: 'media-library-grid' });
    grid.id = 'media-grid';
    lib.appendChild(grid);
    right.appendChild(lib);
    view.appendChild(right);

    pane.appendChild(view);

    loadComponentTree(tree);
    loadMediaGrid(grid);
  }

  function loadComponentTree(container) {
    fetch('/api/components')
      .then(function (r) { return r.json(); })
      .then(function (data) {
        clearEl(container);
        var components = (data && data.components) || data || [];
        if (!components.length) {
          container.appendChild(mkEl('div', { style: 'padding:12px;font-size:11px;color:var(--fam-text-3);', text: 'No components yet.' }));
          return;
        }
        components.forEach(function (comp) {
          var item = mkEl('div', { className: 'tree-item depth-1' });
          var dot = mkEl('span', { className: 'tree-status-dot' });
          dot.style.background = 'var(--fam-green)';
          item.appendChild(dot);
          item.appendChild(mkEl('span', { text: comp.name || comp.id || 'Component' }));
          item.addEventListener('click', function () {
            container.querySelectorAll('.tree-item').forEach(function (i) { i.classList.remove('active'); });
            item.classList.add('active');
            loadComponentDetail(comp);
          });
          container.appendChild(item);
        });
      })
      .catch(function () {
        container.appendChild(mkEl('div', { style: 'padding:12px;font-size:11px;color:var(--fam-text-3);', text: 'Could not load components.' }));
      });
  }

  function loadComponentDetail(comp) {
    var detail = document.getElementById('component-detail');
    if (!detail) return;
    clearEl(detail);

    var name = mkEl('div', { style: 'font-size:14px;font-weight:600;color:var(--fam-text);margin-bottom:4px;', text: comp.name || comp.id });
    detail.appendChild(name);

    var meta = mkEl('div', { style: 'font-size:11px;color:var(--fam-text-3);margin-bottom:14px;', text: 'Type: ' + (comp.type || 'component') + ' · Version: ' + (comp.version || '1.0') });
    detail.appendChild(meta);

    if (comp.html_template) {
      var preview = mkEl('div', { className: 'component-preview-strip' });
      var prev = mkEl('div', { style: 'font-size:11px;color:var(--fam-text-3);text-align:center;padding:20px;', text: 'Preview available when Studio is running' });
      preview.appendChild(prev);
      detail.appendChild(preview);
    }

    var slots = comp.image_slots || [];
    if (slots.length) {
      detail.appendChild(mkEl('div', { style: 'font-size:11px;font-weight:700;text-transform:uppercase;color:var(--fam-text-3);letter-spacing:0.06em;margin-bottom:8px;', text: 'Media Needs' }));
      slots.forEach(function (slot) {
        var card = mkEl('div', { className: 'media-need-card' });
        var thumb = mkEl('div', { className: 'media-need-thumb', text: '\uD83D\uDDBC\uFE0F' });
        card.appendChild(thumb);
        var info = mkEl('div', { className: 'media-need-info' });
        info.appendChild(mkEl('div', { className: 'media-need-name', text: slot.alt || slot.slot_id || 'Image slot' }));
        var tags = mkEl('div', { className: 'media-need-tags' });
        var roleTag = mkEl('span', { className: 'media-tag', text: slot.role || 'image' });
        tags.appendChild(roleTag);
        var statusTag = mkEl('span', { className: 'media-tag ' + (slot.status === 'empty' ? 'empty' : 'filled'), text: slot.status || 'empty' });
        tags.appendChild(statusTag);
        info.appendChild(tags);
        var actions = mkEl('div', { className: 'media-need-actions' });
        var genBtn = mkEl('button', { className: 'media-action-btn primary', text: 'Generate' });
        actions.appendChild(genBtn);
        var swapBtn = mkEl('button', { className: 'media-action-btn', text: 'Swap' });
        actions.appendChild(swapBtn);
        info.appendChild(actions);
        card.appendChild(info);
        detail.appendChild(card);
      });
    }
  }

  function loadMediaGrid(grid) {
    fetch('/api/uploads')
      .then(function (r) { return r.json(); })
      .then(function (data) {
        clearEl(grid);
        var uploads = (data && data.uploads) || data || [];
        uploads.forEach(function (u) {
          var item = mkEl('div', { className: 'media-grid-item' });
          if (u.url || u.path) {
            var img = document.createElement('img');
            img.src = u.url || ('/sites/current/dist/assets/uploaded/' + u.filename);
            img.alt = u.filename || '';
            item.appendChild(img);
          } else {
            item.appendChild(mkEl('div', { style: 'width:100%;height:100%;display:flex;align-items:center;justify-content:center;color:var(--fam-text-3);font-size:18px;', text: '\uD83D\uDDBC\uFE0F' }));
          }
          grid.appendChild(item);
        });
        if (!uploads.length) {
          grid.parentElement.appendChild(mkEl('div', { style: 'font-size:11px;color:var(--fam-text-3);text-align:center;padding:12px;', text: 'No uploads yet.' }));
        }
      })
      .catch(function () {});
  }

  // ── SETTINGS TAB ────────────────────────────────────────────────────────
  function mountSettings() {
    var pane = document.getElementById('tab-pane-deploy');
    // Settings uses the rail, not a workspace tab — handled by openSettings()
    // This mounts the deploy tab instead (see below)
    mountDeploy();
  }

  function mountSettingsScreen() {
    var modal = document.getElementById('settings-modal');
    if (!modal) return;
    var content = document.getElementById('settings-content');
    if (!content) return;
    clearEl(content);

    var wrap = mkEl('div', { className: 'screen-two-panel', style: 'height:400px;' });

    // Left nav
    var nav = mkEl('div', { className: 'settings-nav', style: 'width:160px;min-width:160px;border-right:1px solid var(--fam-border);background:var(--fam-bg-2);' });
    var tiers = [
      { id: 'platform',  label: 'Platform',  dot: 'var(--fam-red)' },
      { id: 'workspace', label: 'Workspace', dot: 'var(--fam-gold)' },
      { id: 'site',      label: 'Site',      dot: 'var(--fam-green)' },
      { id: 'assistant', label: 'Assistant', dot: 'var(--fam-purple)' },
    ];
    var body = mkEl('div', { className: 'settings-body', style: 'flex:1;overflow-y:auto;' });
    body.id = 'settings-body';

    var activeTier = 'platform';

    tiers.forEach(function (t) {
      var item = mkEl('div', { className: 'settings-nav-item' + (t.id === activeTier ? ' active' : '') });
      var dot = mkEl('span', { className: 'settings-tier-dot' });
      dot.style.background = t.dot;
      item.appendChild(dot);
      item.appendChild(document.createTextNode(t.label));
      item.addEventListener('click', function () {
        nav.querySelectorAll('.settings-nav-item').forEach(function (i) { i.classList.remove('active'); });
        item.classList.add('active');
        activeTier = t.id;
        renderSettingsTier(body, t.id);
      });
      nav.appendChild(item);
    });

    wrap.appendChild(nav);
    wrap.appendChild(body);
    content.appendChild(wrap);

    renderSettingsTier(body, 'platform');
  }

  function renderSettingsTier(container, tier) {
    clearEl(container);
    var titles = { platform: 'Platform Settings', workspace: 'Workspace', site: 'Site Settings', assistant: 'Assistant (Pip)' };
    var subs   = { platform: 'API keys and Studio preferences. Never version-controlled.', workspace: 'Build defaults and feature flags. Committed with the repo.', site: 'Domain, deploy target, brand config for the active site.', assistant: 'Pip behavior, proactive triggers, and preferences.' };

    container.appendChild(mkEl('div', { className: 'settings-section-title', text: titles[tier] }));
    container.appendChild(mkEl('div', { className: 'settings-section-sub',   text: subs[tier] }));

    fetch('/api/settings').then(function (r) { return r.json(); }).then(function (settings) {
      if (tier === 'platform') {
        renderAPIKeyField(container, 'Anthropic API Key', settings._configured && settings._configured.anthropic_api_key ? '••••••••' : '');
        renderAPIKeyField(container, 'Gemini API Key', settings._configured && settings._configured.gemini_api_key ? '••••••••' : '');
        renderAPIKeyField(container, 'OpenAI API Key', settings._configured && settings._configured.openai_api_key ? '••••••••' : '');
      } else if (tier === 'workspace') {
        renderToggleField(container, 'Surgical edits (90% token reduction)', true);
        renderToggleField(container, 'Revenue-first brief', true);
        renderToggleField(container, 'Auto-run intelligence after build', false);
      } else if (tier === 'site') {
        renderTextField(container, 'Site name', settings.site_name || '');
        renderTextField(container, 'Business type', settings.business_type || '');
        renderTextField(container, 'Netlify Site ID', (settings.netlify && settings.netlify.site_id) || '');
        renderTextField(container, 'Deployed URL', settings.deployed_url || '');
      } else if (tier === 'assistant') {
        renderToggleField(container, 'Proactive suggestions', true);
        renderToggleField(container, 'Show Me mode available', true);
        renderToggleField(container, 'Do It mode available', false);
        renderToggleField(container, 'Welcome message on session start', !sessionStorage.getItem('pip-t-welcome'));
      }

      var saveBtn = mkEl('button', { className: 'settings-save-btn', text: 'Save changes' });
      saveBtn.addEventListener('click', function () {
        saveBtn.textContent = 'Saved!';
        saveBtn.style.background = 'var(--fam-green)';
        setTimeout(function () { saveBtn.textContent = 'Save changes'; saveBtn.style.background = ''; }, 2000);
      });
      container.appendChild(saveBtn);
    }).catch(function () {});
  }

  function renderAPIKeyField(container, label, value) {
    var field = mkEl('div', { className: 'settings-field' });
    var lbl = mkEl('div', { className: 'settings-label', text: label });
    field.appendChild(lbl);
    var row = mkEl('div', { className: 'settings-input-row' });
    var input = mkEl('input', { className: 'settings-input' });
    input.type = 'password';
    input.value = value;
    input.placeholder = 'Not configured';
    row.appendChild(input);
    var btn = mkEl('button', { className: 'settings-reveal-btn', text: 'Reveal' });
    btn.addEventListener('click', function () { input.type = input.type === 'password' ? 'text' : 'password'; btn.textContent = input.type === 'password' ? 'Reveal' : 'Hide'; });
    row.appendChild(btn);
    field.appendChild(row);
    container.appendChild(field);
  }

  function renderTextField(container, label, value) {
    var field = mkEl('div', { className: 'settings-field' });
    field.appendChild(mkEl('div', { className: 'settings-label', text: label }));
    var input = mkEl('input', { className: 'settings-input' });
    input.value = value;
    input.placeholder = label + '...';
    field.appendChild(input);
    container.appendChild(field);
  }

  function renderToggleField(container, label, on) {
    var row = mkEl('div', { className: 'settings-toggle-row' });
    row.appendChild(mkEl('span', { className: 'settings-toggle-label', text: label }));
    var toggle = mkEl('button', { className: 'settings-toggle' + (on ? ' on' : '') });
    toggle.type = 'button';
    toggle.addEventListener('click', function () { toggle.classList.toggle('on'); });
    row.appendChild(toggle);
    container.appendChild(row);
  }

  // ── MISSION CONTROL (Intelligence tab) ──────────────────────────────────
  function mountMissionControl() {
    var pane = document.getElementById('tab-pane-assets');
    // MC is in the intelligence sidebar pane — handled by sidebar pane load
    // Assets tab has the component tree already
    // MC is mounted via the intelligence pane in the sidebar
    loadMissionControlSidebar();
  }

  function loadMissionControlSidebar() {
    var feed = document.getElementById('sidebar-intel-feed');
    if (!feed) return;
    // Already handled in studio-shell.js — this extends it with a "View all" link
    var viewAll = mkEl('div', { style: 'padding:8px 12px;' });
    var btn = mkEl('button', { style: 'font-size:11px;padding:4px 10px;background:rgba(232,53,42,0.1);border:1px solid rgba(232,53,42,0.2);border-radius:4px;color:var(--fam-red);cursor:pointer;width:100%;', text: 'View Mission Control \u2192' });
    btn.addEventListener('click', function () {
      window.StudioShell && StudioShell.addTab('Mission Control', 'tab-pane-mc', { id: 'mc' });
      setTimeout(function () { mountMCTab(); }, 100);
    });
    viewAll.appendChild(btn);
    feed.appendChild(viewAll);
  }

  function mountMCTab() {
    var paneId = 'tab-pane-mc';
    var existing = document.getElementById(paneId);
    if (existing) {
      if (!existing.querySelector('.mc-metrics-row')) renderMCContent(existing);
      return;
    }
    var canvasArea = document.getElementById('canvas-area');
    if (!canvasArea) return;
    var pane = mkEl('div', { className: 'ws-tab-pane hidden' });
    pane.id = paneId;
    pane.style.cssText = 'height:100%;overflow:hidden;display:flex;flex-direction:column;';
    canvasArea.appendChild(pane);
    renderMCContent(pane);
  }

  function renderMCContent(pane) {
    clearEl(pane);

    // Metrics row
    var metrics = mkEl('div', { className: 'mc-metrics-row' });
    var metricData = [
      { label: 'Sites', val: '—', id: 'mc-total-sites' },
      { label: 'Avg Score', val: '—', id: 'mc-avg-score' },
      { label: 'Running', val: '0', id: 'mc-running' },
      { label: 'Alerts', val: '—', id: 'mc-alerts' },
      { label: 'Session $', val: '$0.00', id: 'mc-cost' },
    ];
    metricData.forEach(function (m) {
      var card = mkEl('div', { className: 'mc-metric-card' });
      var val = mkEl('div', { className: 'mc-metric-value', text: m.val });
      val.id = m.id;
      card.appendChild(val);
      card.appendChild(mkEl('div', { className: 'mc-metric-label', text: m.label }));
      metrics.appendChild(card);
    });
    pane.appendChild(metrics);

    // Three-column body
    var body = mkEl('div', { className: 'mc-body' });

    // Job queue
    var jobs = mkEl('div', { className: 'mc-jobs' });
    jobs.appendChild(mkEl('div', { className: 'screen-header', text: 'Jobs' }));
    var jobList = mkEl('div');
    jobList.id = 'mc-job-list';
    jobList.appendChild(mkEl('div', { style: 'padding:12px;font-size:11px;color:var(--fam-text-3);', text: 'No active jobs.' }));
    jobs.appendChild(jobList);
    body.appendChild(jobs);

    // Site grid
    var sites = mkEl('div', { className: 'mc-sites' });
    sites.appendChild(mkEl('div', { className: 'screen-header', style: 'margin-bottom:10px;', text: 'Portfolio' }));
    var grid = mkEl('div', { className: 'mc-sites-grid' });
    grid.id = 'mc-sites-grid';
    sites.appendChild(grid);
    body.appendChild(sites);

    // Intel feed
    var intel = mkEl('div', { className: 'mc-intel' });
    var intelHeader = mkEl('div', { className: 'screen-header' });
    var liveDot = mkEl('span', { className: 'intel-live-dot' });
    intelHeader.appendChild(liveDot);
    intelHeader.appendChild(document.createTextNode('Intelligence'));
    intel.appendChild(intelHeader);
    var intelFeed = mkEl('div');
    intelFeed.id = 'mc-intel-feed';
    intel.appendChild(intelFeed);
    body.appendChild(intel);

    pane.appendChild(body);

    // Load data
    loadMCSites(grid);
    loadMCIntel(intelFeed);
    loadMCMetrics();
  }

  function loadMCSites(grid) {
    fetch('/api/sites').then(function (r) { return r.json(); }).then(function (data) {
      clearEl(grid);
      var sites = (data && data.sites) || data || [];

      // Update total sites metric
      var totalEl = document.getElementById('mc-total-sites');
      if (totalEl) totalEl.textContent = String(sites.length);

      sites.forEach(function (site) {
        var card = mkEl('div', { className: 'mc-site-card' });
        var thumb = mkEl('div', { className: 'mc-site-thumb', text: '\uD83C\uDFDB\uFE0F' });
        card.appendChild(thumb);
        var info = mkEl('div', { className: 'mc-site-info' });
        info.appendChild(mkEl('div', { className: 'mc-site-name', text: site.site_name || site.tag || site }));
        var meta = mkEl('div', { className: 'mc-site-meta' });
        var score = mkEl('span', { className: 'mc-fam-score high', text: '\u2022 ' + (site.state || 'new') });
        meta.appendChild(score);
        var status = mkEl('span', { className: 'mc-site-status', text: site.deployed_url ? 'Live' : 'Local' });
        meta.appendChild(status);
        info.appendChild(meta);
        card.appendChild(info);
        card.addEventListener('click', function () {
          var tag = site.tag || site;
          if (window.switchSite) switchSite(tag);
        });
        grid.appendChild(card);
      });

      // New site card
      var newCard = mkEl('div', { className: 'mc-new-site-card' });
      var plus = mkEl('div', { text: '+' });
      newCard.appendChild(plus);
      var newLabel = mkEl('div', { style: 'font-size:11px;color:var(--fam-text-3);margin-top:4px;', text: 'New site' });
      newCard.appendChild(newLabel);
      newCard.addEventListener('click', function () { if (window.createNewProject) createNewProject(); });
      grid.appendChild(newCard);
    }).catch(function () {});
  }

  function loadMCIntel(feed) {
    fetch('/api/intel/findings').then(function (r) { return r.json(); }).then(function (data) {
      clearEl(feed);
      var findings = (data && data.findings) || [];
      var alertEl = document.getElementById('mc-alerts');
      if (alertEl) alertEl.textContent = String(findings.filter(function (f) { return f.severity === 'critical' || f.severity === 'high'; }).length);

      if (!findings.length) {
        feed.appendChild(mkEl('div', { style: 'padding:12px;font-size:11px;color:var(--fam-text-3);', text: 'No findings.' }));
        return;
      }
      var colors = { critical: 'var(--fam-red)', high: 'var(--fam-gold)', opportunity: 'var(--fam-green)', info: 'var(--fam-text-3)' };
      findings.slice(0, 12).forEach(function (f) {
        var item = mkEl('div', { className: 'intel-finding' });
        var badge = mkEl('div', { className: 'intel-finding-badge' });
        badge.style.color = colors[f.severity] || 'var(--fam-text-3)';
        badge.textContent = f.severity;
        item.appendChild(badge);
        item.appendChild(mkEl('div', { className: 'intel-finding-msg', text: f.title || f.message || '' }));
        if (f.site) item.appendChild(mkEl('div', { className: 'intel-finding-site', text: f.site }));
        feed.appendChild(item);
      });
    }).catch(function () {});
  }

  function loadMCMetrics() {
    fetch('/api/telemetry/sdk-cost-summary').then(function (r) { return r.json(); }).then(function (data) {
      var costEl = document.getElementById('mc-cost');
      if (costEl && data.total_cost_usd != null) costEl.textContent = '$' + Number(data.total_cost_usd).toFixed(2);
    }).catch(function () {});
  }

  // ── DEPLOY TAB ───────────────────────────────────────────────────────────
  function mountDeploy() {
    var pane = document.getElementById('tab-pane-deploy');
    if (!pane) return;
    clearEl(pane);
    pane.style.cssText = 'display:flex;flex-direction:column;height:100%;overflow:hidden;';

    var body = mkEl('div', { className: 'screen-three-panel', style: 'flex:1;' });

    // Left: pre-flight checks
    var left = mkEl('div', { className: 'screen-left' });
    left.appendChild(mkEl('div', { className: 'screen-header', text: 'Pre-flight' }));
    var checks = mkEl('div', { style: 'padding:10px 12px;flex:1;overflow-y:auto;' });
    checks.id = 'deploy-preflight';
    left.appendChild(checks);
    body.appendChild(left);

    // Center: pipeline + log
    var center = mkEl('div', { className: 'screen-center', style: 'display:flex;flex-direction:column;gap:10px;' });

    var envSwitcher = mkEl('div', { className: 'env-switcher' });
    var envProd = mkEl('button', { className: 'env-btn active', text: 'Production' });
    var envStaging = mkEl('button', { className: 'env-btn', text: 'Staging' });
    envProd.addEventListener('click', function () { envProd.classList.add('active'); envStaging.classList.remove('active'); });
    envStaging.addEventListener('click', function () { envStaging.classList.add('active'); envProd.classList.remove('active'); });
    envSwitcher.appendChild(envProd);
    envSwitcher.appendChild(envStaging);
    center.appendChild(envSwitcher);

    center.appendChild(mkEl('div', { style: 'font-size:13px;font-weight:500;color:var(--fam-text);', text: 'Deploy Pipeline' }));

    var pipeline = mkEl('div');
    pipeline.id = 'deploy-pipeline';
    center.appendChild(pipeline);

    var logLabel = mkEl('div', { style: 'font-size:11px;font-weight:600;color:var(--fam-text-2);margin-top:8px;', text: 'Deploy Log' });
    center.appendChild(logLabel);
    var log = mkEl('div', { className: 'deploy-log' });
    log.id = 'deploy-log';
    log.appendChild(mkEl('div', { className: 'deploy-log-line info', text: 'Ready. Run pre-flight checks before deploying.' }));
    center.appendChild(log);

    var liveUrlCard = mkEl('div', { className: 'deploy-live-url', style: 'display:none;' });
    liveUrlCard.id = 'deploy-live-url';
    center.appendChild(liveUrlCard);

    var goLiveBtn = mkEl('button', { className: 'go-live-btn', text: 'Go Live \u2192' });
    goLiveBtn.id = 'deploy-go-live-btn';
    goLiveBtn.addEventListener('click', function () { triggerDeploy(envStaging.classList.contains('active') ? 'staging' : 'production', goLiveBtn, log); });
    center.appendChild(goLiveBtn);

    body.appendChild(center);

    // Right: deploy history
    var right = mkEl('div', { className: 'screen-right' });
    right.appendChild(mkEl('div', { className: 'screen-header', text: 'History' }));
    var history = mkEl('div');
    history.id = 'deploy-history';
    history.appendChild(mkEl('div', { style: 'padding:10px 12px;font-size:11px;color:var(--fam-text-3);', text: 'No deploys yet.' }));
    right.appendChild(history);
    body.appendChild(right);

    pane.appendChild(body);

    loadPreflightChecks(checks);
    loadDeployPipeline(pipeline);
    loadDeployHistory(history);
  }

  function loadPreflightChecks(container) {
    fetch('/api/verify').then(function (r) { return r.json(); }).then(function (data) {
      clearEl(container);
      var checks = (data && data.checks) || [];
      if (!checks.length) {
        container.appendChild(mkEl('div', { style: 'font-size:11px;color:var(--fam-text-3);', text: 'No verification data. Run a build first.' }));
        return;
      }
      checks.forEach(function (check) {
        var row = mkEl('div', { className: 'preflight-check' });
        var iconEl = mkEl('div', { className: 'preflight-icon ' + (check.passed ? 'pass' : 'fail') });
        iconEl.textContent = check.passed ? '\u2713' : '\u2717';
        row.appendChild(iconEl);
        row.appendChild(mkEl('span', { className: 'preflight-label', text: check.check || check.name || 'Check' }));
        container.appendChild(row);
      });
    }).catch(function () {
      container.appendChild(mkEl('div', { style: 'font-size:11px;color:var(--fam-text-3);', text: 'Run a build to see pre-flight checks.' }));
    });
  }

  function loadDeployPipeline(container) {
    clearEl(container);
    var steps = ['Build verified', 'Assets optimized', 'Files bundled', 'CDN pushed', 'DNS updated', 'Live'];
    steps.forEach(function (label, i) {
      var row = mkEl('div', { className: 'deploy-pipeline-step' });
      var icon = mkEl('div', { className: 'pipeline-step-icon pending', text: String(i + 1) });
      row.appendChild(icon);
      var info = mkEl('div', { className: 'pipeline-step-info' });
      info.appendChild(mkEl('div', { className: 'pipeline-step-label', text: label }));
      info.appendChild(mkEl('div', { className: 'pipeline-step-time', text: 'Waiting' }));
      row.appendChild(info);
      container.appendChild(row);
    });
  }

  function loadDeployHistory(container) {
    fetch('/api/studio-state').then(function (r) { return r.json(); }).then(function (data) {
      if (!data || !data.deploy_history || !data.deploy_history.length) return;
      clearEl(container);
      data.deploy_history.slice(0, 8).forEach(function (entry) {
        var row = mkEl('div', { className: 'deploy-history-item' });
        var env = mkEl('span', { className: 'deploy-env-badge ' + (entry.env || 'staging'), text: entry.env || 'staging' });
        row.appendChild(env);
        row.appendChild(mkEl('span', { style: 'color:var(--fam-text-2);font-size:11px;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;', text: entry.message || entry.url || 'Deployed' }));
        var rbBtn = mkEl('button', { className: 'deploy-rollback-btn', text: 'Rollback' });
        rbBtn.addEventListener('click', function () { if (window.rollbackVersion) rollbackVersion(entry.version || entry.hash); });
        row.appendChild(rbBtn);
        container.appendChild(row);
      });
    }).catch(function () {});
  }

  function triggerDeploy(env, btn, log) {
    btn.disabled = true;
    btn.textContent = 'Deploying\u2026';
    addLogLine(log, 'Deploying to ' + env + '\u2026', 'info');
    var cmd = env === 'staging' ? 'deploy to staging' : 'deploy';
    if (window.ws && window.ws.readyState === WebSocket.OPEN) {
      if (window.addMessage) window.addMessage('user', cmd);
      window.ws.send(JSON.stringify({ type: 'chat', content: cmd }));
      if (window.StudioShell) StudioShell.switchTab('chat');
    }
    setTimeout(function () { btn.disabled = false; btn.textContent = 'Go Live \u2192'; }, 5000);
  }

  function addLogLine(logEl, text, type) {
    var line = mkEl('div', { className: 'deploy-log-line ' + (type || 'info'), text: text });
    logEl.appendChild(line);
    logEl.scrollTop = logEl.scrollHeight;
  }

  // ── Tab activation hooks ─────────────────────────────────────────────────
  document.addEventListener('DOMContentLoaded', function () {
    // Patch StudioShell.switchTab to trigger lazy mounts
    var origSwitch = window.StudioShell && StudioShell.switchTab;
    if (origSwitch) {
      var wrapped = StudioShell.switchTab;
      StudioShell.switchTab = function (tabId) {
        wrapped(tabId);
        if (tabId === 'assets') mountOnce('assets', mountAssets);
        if (tabId === 'deploy') mountOnce('deploy', mountDeploy);
      };
    }

    // Also watch for click on tab buttons
    document.addEventListener('click', function (e) {
      var btn = e.target.closest && e.target.closest('.ws-tab');
      if (!btn) return;
      var tabId = btn.dataset.tabId;
      if (tabId === 'assets') setTimeout(function () { mountOnce('assets', mountAssets); }, 80);
      if (tabId === 'deploy') setTimeout(function () { mountOnce('deploy', mountDeploy); }, 80);
    });

    // Open settings modal with new content
    var origOpenSettings = window.openSettings;
    window.openSettings = function () {
      if (origOpenSettings) origOpenSettings();
      setTimeout(mountSettingsScreen, 50);
    };

    // Expose MC
    window.openMissionControl = function () {
      if (window.StudioShell) StudioShell.addTab('Mission Control', 'tab-pane-mc', { id: 'mc' });
      setTimeout(mountMCTab, 100);
    };
  });

  window.StudioScreens = { mountAssets: mountAssets, mountDeploy: mountDeploy, mountMCTab: mountMCTab, mountSettingsScreen: mountSettingsScreen };
})();
