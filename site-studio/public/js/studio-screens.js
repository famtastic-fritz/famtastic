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

  // ── ASSETS TAB: slot-aware media workspace ───────────────────────────────
  var assetsState = {
    siteTag: null,
    slots: [],
    uploads: [],
    selectedSlotId: null,
    selectedAssetFilename: null,
    search: '',
    roleFilter: 'all'
  };

  var assetsRefs = {};

  function mountAssets() {
    var pane = document.getElementById('tab-pane-assets');
    if (!pane) return;
    clearEl(pane);
    pane.style.cssText = 'display:flex;flex-direction:column;height:100%;overflow:hidden;';

    var shell = mkEl('div', { className: 'assets-shell' });

    var topbar = mkEl('div', { className: 'assets-topbar' });
    var intro = mkEl('div', { className: 'assets-topbar-copy' });
    intro.appendChild(mkEl('div', { className: 'assets-topbar-title', text: 'Media Workspace' }));
    intro.appendChild(mkEl('div', {
      className: 'assets-topbar-sub',
      text: 'Pick a slot, choose or upload an image, and apply it without leaving Studio.'
    }));
    topbar.appendChild(intro);

    var toolbar = mkEl('div', { className: 'assets-topbar-actions' });
    var uploadBtn = mkEl('button', { className: 'media-action-btn primary', text: 'Upload Media' });
    var refreshBtn = mkEl('button', { className: 'media-action-btn', text: 'Refresh' });
    var fileInput = mkEl('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/*,.svg';
    fileInput.style.display = 'none';
    uploadBtn.addEventListener('click', function () { fileInput.click(); });
    fileInput.addEventListener('change', function () {
      if (fileInput.files && fileInput.files[0]) handleAssetUpload(fileInput.files[0]);
      fileInput.value = '';
    });
    refreshBtn.addEventListener('click', refreshAssetsWorkspace);
    toolbar.appendChild(uploadBtn);
    toolbar.appendChild(refreshBtn);
    toolbar.appendChild(fileInput);
    topbar.appendChild(toolbar);
    shell.appendChild(topbar);

    var view = mkEl('div', { className: 'screen-three-panel assets-workspace' });
    view.style.flex = '1';

    var left = mkEl('div', { className: 'screen-left assets-workspace-left' });
    left.appendChild(mkEl('div', { className: 'screen-header', text: 'Site Media Needs' }));
    var summary = mkEl('div', { className: 'assets-slot-summary' });
    var slotList = mkEl('div', { className: 'assets-slot-list' });
    left.appendChild(summary);
    left.appendChild(slotList);
    view.appendChild(left);

    var center = mkEl('div', { className: 'screen-center assets-workspace-center' });
    var feedback = mkEl('div', { className: 'assets-feedback hidden' });
    var detail = mkEl('div', { className: 'assets-workspace-detail' });
    center.appendChild(feedback);
    center.appendChild(detail);
    view.appendChild(center);

    var right = mkEl('div', { className: 'screen-right assets-workspace-right' });
    right.appendChild(mkEl('div', { className: 'screen-header', text: 'Library' }));
    var lib = mkEl('div', { className: 'media-library' });
    var search = mkEl('input', { className: 'media-library-search' });
    search.placeholder = 'Search filename, label, role...';
    search.type = 'text';
    search.addEventListener('input', function () {
      assetsState.search = search.value || '';
      renderMediaLibrary();
    });
    lib.appendChild(search);

    var filterRow = mkEl('div', { className: 'media-filter-row' });
    ['all', 'logo', 'content', 'character'].forEach(function (role) {
      var btn = mkEl('button', {
        className: 'media-filter-btn' + (role === 'all' ? ' active' : ''),
        text: role === 'all' ? 'All' : role
      });
      btn.dataset.role = role;
      btn.addEventListener('click', function () {
        assetsState.roleFilter = role;
        filterRow.querySelectorAll('.media-filter-btn').forEach(function (b) { b.classList.remove('active'); });
        btn.classList.add('active');
        renderMediaLibrary();
      });
      filterRow.appendChild(btn);
    });
    lib.appendChild(filterRow);

    var grid = mkEl('div', { className: 'media-library-grid' });
    lib.appendChild(grid);
    right.appendChild(lib);
    view.appendChild(right);

    shell.appendChild(view);
    pane.appendChild(shell);

    assetsRefs = {
      pane: pane,
      summary: summary,
      slotList: slotList,
      detail: detail,
      feedback: feedback,
      grid: grid,
      search: search
    };

    refreshAssetsWorkspace();
  }

  function refreshAssetsWorkspace() {
    if (!assetsRefs.pane) return;
    Promise.all([
      fetch('/api/studio-state').then(function (r) { return r.json(); }),
      fetch('/api/uploads').then(function (r) { return r.json(); })
    ]).then(function (results) {
      var studio = results[0] || {};
      var uploadsRaw = results[1] || [];
      var spec = studio.spec || {};
      var mappings = spec.slot_mappings || {};

      assetsState.siteTag = studio.tag || null;
      assetsState.slots = (spec.media_specs || []).map(function (slot) {
        return {
          slot_id: slot.slot_id,
          role: slot.role || 'image',
          status: slot.status || 'empty',
          page: slot.page || 'index.html',
          dimensions: slot.dimensions || '',
          alt: slot.alt || '',
          mapping: mappings[slot.slot_id] || null
        };
      });
      assetsState.uploads = (uploadsRaw.uploads || uploadsRaw || []).map(function (asset) {
        return {
          filename: asset.filename,
          role: asset.role || 'content',
          type: asset.type || 'image',
          label: asset.label || '',
          notes: asset.notes || '',
          uploaded_at: asset.uploaded_at || '',
          exists: asset.exists !== false,
          src: asset.filename ? `assets/uploads/${asset.filename}` : (asset.url || asset.path || ''),
          url: asset.url || asset.path || ''
        };
      });

      if (!findSlotById(assetsState.selectedSlotId)) {
        var firstEmpty = assetsState.slots.find(function (slot) { return slot.status === 'empty'; });
        assetsState.selectedSlotId = firstEmpty ? firstEmpty.slot_id : (assetsState.slots[0] && assetsState.slots[0].slot_id) || null;
      }
      if (!findAssetByFilename(assetsState.selectedAssetFilename)) {
        assetsState.selectedAssetFilename = assetsState.uploads[0] ? assetsState.uploads[0].filename : null;
      }

      renderAssetsWorkspace();
    }).catch(function () {
      showAssetsFeedback('Could not load media workspace data.', 'error');
    });
  }

  function renderAssetsWorkspace() {
    renderSlotSummary();
    renderSlotList();
    renderWorkspaceDetail();
    renderMediaLibrary();
  }

  function renderSlotSummary() {
    var summary = assetsRefs.summary;
    if (!summary) return;
    clearEl(summary);

    var slots = assetsState.slots || [];
    var counts = {
      total: slots.length,
      empty: slots.filter(function (slot) { return slot.status === 'empty'; }).length,
      filled: slots.filter(function (slot) { return slot.status !== 'empty'; }).length
    };

    var siteLine = mkEl('div', { className: 'assets-summary-site', text: assetsState.siteTag || 'No active site' });
    summary.appendChild(siteLine);

    var cards = mkEl('div', { className: 'assets-summary-cards' });
    [
      { label: 'Total slots', value: String(counts.total) },
      { label: 'Need media', value: String(counts.empty) },
      { label: 'Filled', value: String(counts.filled) }
    ].forEach(function (item) {
      var card = mkEl('div', { className: 'assets-summary-card' });
      card.appendChild(mkEl('div', { className: 'assets-summary-value', text: item.value }));
      card.appendChild(mkEl('div', { className: 'assets-summary-label', text: item.label }));
      cards.appendChild(card);
    });
    summary.appendChild(cards);
  }

  function renderSlotList() {
    var list = assetsRefs.slotList;
    if (!list) return;
    clearEl(list);

    var slots = (assetsState.slots || []).slice().sort(function (a, b) {
      if (a.status === b.status) return formatSlotName(a).localeCompare(formatSlotName(b));
      if (a.status === 'empty') return -1;
      if (b.status === 'empty') return 1;
      return 0;
    });

    if (!slots.length) {
      list.appendChild(mkEl('div', {
        className: 'assets-empty-note',
        text: 'No image slots are registered on this site yet. Build or re-scan the site first.'
      }));
      return;
    }

    slots.forEach(function (slot) {
      var item = mkEl('button', {
        className: 'assets-slot-item' + (slot.slot_id === assetsState.selectedSlotId ? ' active' : '')
      });
      item.type = 'button';

      var top = mkEl('div', { className: 'assets-slot-item-top' });
      top.appendChild(mkEl('div', { className: 'assets-slot-item-name', text: formatSlotName(slot) }));
      top.appendChild(mkEl('span', {
        className: 'media-tag ' + (slot.status === 'empty' ? 'empty' : 'filled'),
        text: slot.status
      }));
      item.appendChild(top);

      var meta = mkEl('div', {
        className: 'assets-slot-item-meta',
        text: [slot.page || 'index.html', slot.role || 'image', slot.dimensions || ''].filter(Boolean).join(' · ')
      });
      item.appendChild(meta);

      if (slot.mapping && slot.mapping.src) {
        item.appendChild(mkEl('div', {
          className: 'assets-slot-item-foot',
          text: slot.mapping.provider === 'stock' ? 'Using stock image' : 'Using uploaded asset'
        }));
      }

      item.addEventListener('click', function () {
        assetsState.selectedSlotId = slot.slot_id;
        renderAssetsWorkspace();
      });
      list.appendChild(item);
    });
  }

  function renderWorkspaceDetail() {
    var detail = assetsRefs.detail;
    if (!detail) return;
    clearEl(detail);

    var slot = findSlotById(assetsState.selectedSlotId);
    var asset = findAssetByFilename(assetsState.selectedAssetFilename);

    if (!slot) {
      detail.appendChild(buildAssetsWelcome());
      return;
    }

    var hero = mkEl('div', { className: 'assets-detail-hero' });
    hero.appendChild(mkEl('div', { className: 'assets-detail-eyebrow', text: 'Selected slot' }));
    hero.appendChild(mkEl('div', { className: 'assets-detail-title', text: formatSlotName(slot) }));
    hero.appendChild(mkEl('div', {
      className: 'assets-detail-meta',
      text: [slot.slot_id, slot.page, slot.role, slot.dimensions].filter(Boolean).join(' · ')
    }));
    detail.appendChild(hero);

    var workflow = mkEl('div', { className: 'assets-workflow-note' });
    workflow.textContent = '1. Pick a slot. 2. Select or upload an asset. 3. Apply it to the selected slot.';
    detail.appendChild(workflow);

    var preview = mkEl('div', { className: 'assets-current-preview' });
    var previewTitle = mkEl('div', { className: 'assets-section-label', text: 'Current media' });
    preview.appendChild(previewTitle);
    if (slot.mapping && slot.mapping.src) {
      preview.appendChild(buildMediaThumb(resolveSiteAssetUrl(slot.mapping.src), formatSlotName(slot), 'assets-current-image'));
      preview.appendChild(mkEl('div', {
        className: 'assets-current-caption',
        text: slot.mapping.provider === 'stock'
          ? 'Current source: stock photo'
          : 'Current source: uploaded asset'
      }));
    } else {
      preview.appendChild(mkEl('div', {
        className: 'assets-empty-preview',
        text: 'This slot is empty. Upload media or pick an existing asset to fill it.'
      }));
    }
    detail.appendChild(preview);

    var actionCard = mkEl('div', { className: 'assets-action-card' });
    actionCard.appendChild(mkEl('div', { className: 'assets-section-label', text: 'Apply uploaded asset' }));
    if (asset) {
      var selection = mkEl('div', { className: 'assets-selected-asset' });
      selection.appendChild(buildMediaThumb(resolveSiteAssetUrl(asset.src), asset.label || asset.filename, 'assets-selected-image'));
      var info = mkEl('div', { className: 'assets-selected-copy' });
      info.appendChild(mkEl('div', { className: 'assets-selected-name', text: asset.label || asset.filename }));
      info.appendChild(mkEl('div', {
        className: 'assets-selected-meta',
        text: [asset.role || 'content', asset.type || 'image'].join(' · ')
      }));
      selection.appendChild(info);
      actionCard.appendChild(selection);
    } else {
      actionCard.appendChild(mkEl('div', {
        className: 'assets-empty-note',
        text: 'No uploaded media selected yet.'
      }));
    }
    var assignRow = mkEl('div', { className: 'assets-action-row' });
    var assignBtn = mkEl('button', {
      className: 'media-action-btn primary',
      text: asset ? 'Use selected asset' : 'Select an asset first'
    });
    assignBtn.disabled = !asset;
    assignBtn.addEventListener('click', function () {
      if (asset) assignAssetToSlot(slot, asset);
    });
    assignRow.appendChild(assignBtn);
    var clearBtn = mkEl('button', { className: 'media-action-btn', text: 'Clear slot' });
    clearBtn.disabled = !slot.mapping;
    clearBtn.addEventListener('click', function () { clearSlot(slot); });
    assignRow.appendChild(clearBtn);
    actionCard.appendChild(assignRow);
    detail.appendChild(actionCard);

    var stockCard = mkEl('div', { className: 'assets-action-card' });
    stockCard.appendChild(mkEl('div', { className: 'assets-section-label', text: 'Generate stock image' }));
    var stockHelp = mkEl('div', {
      className: 'assets-help-text',
      text: 'Use the slot role as a starting point, then add product, scene, or mood details.'
    });
    stockCard.appendChild(stockHelp);
    var stockInput = mkEl('input', { className: 'assets-stock-input' });
    stockInput.type = 'text';
    stockInput.value = defaultStockQuery(slot);
    stockInput.placeholder = 'Describe the image to generate...';
    stockCard.appendChild(stockInput);
    var stockRow = mkEl('div', { className: 'assets-action-row' });
    var stockBtn = mkEl('button', { className: 'media-action-btn primary', text: 'Generate for this slot' });
    stockBtn.addEventListener('click', function () {
      generateStockForSlot(slot, stockInput.value);
    });
    stockRow.appendChild(stockBtn);
    stockCard.appendChild(stockRow);
    detail.appendChild(stockCard);
  }

  function renderMediaLibrary() {
    var grid = assetsRefs.grid;
    if (!grid) return;
    clearEl(grid);

    var slot = findSlotById(assetsState.selectedSlotId);
    var uploads = (assetsState.uploads || []).filter(function (asset) {
      var hay = [asset.filename, asset.label, asset.role, asset.notes].join(' ').toLowerCase();
      var matchesSearch = !assetsState.search || hay.indexOf((assetsState.search || '').toLowerCase()) !== -1;
      var matchesRole = assetsState.roleFilter === 'all' || asset.role === assetsState.roleFilter;
      return matchesSearch && matchesRole;
    });

    if (!uploads.length) {
      grid.appendChild(mkEl('div', {
        className: 'assets-empty-note',
        text: 'No uploads match this filter yet. Upload media to start building your library.'
      }));
      return;
    }

    uploads.forEach(function (asset) {
      var item = mkEl('button', {
        className: 'media-grid-item' +
          (asset.filename === assetsState.selectedAssetFilename ? ' selected' : '') +
          (slot && asset.role === slot.role ? ' match' : '')
      });
      item.type = 'button';
      item.title = asset.label || asset.filename || 'Asset';
      item.appendChild(buildMediaThumb(resolveSiteAssetUrl(asset.src), asset.label || asset.filename, 'media-grid-thumb'));

      var footer = mkEl('div', { className: 'media-grid-footer' });
      footer.appendChild(mkEl('div', { className: 'media-grid-name', text: asset.label || asset.filename }));
      footer.appendChild(mkEl('div', { className: 'media-grid-meta', text: asset.role || 'content' }));
      item.appendChild(footer);

      item.addEventListener('click', function () {
        assetsState.selectedAssetFilename = asset.filename;
        renderAssetsWorkspace();
      });
      item.addEventListener('dblclick', function () {
        if (slot) assignAssetToSlot(slot, asset);
      });
      grid.appendChild(item);
    });
  }

  function buildAssetsWelcome() {
    var wrap = mkEl('div', { className: 'assets-welcome-card' });
    wrap.appendChild(mkEl('div', { className: 'assets-detail-title', text: 'Media workflow, finally in one place' }));
    wrap.appendChild(mkEl('div', {
      className: 'assets-help-text',
      text: 'Choose a site slot on the left, select a library item on the right, then apply it here. You can also upload new media or generate a stock image for the selected slot.'
    }));
    return wrap;
  }

  function handleAssetUpload(file) {
    var formData = new FormData();
    formData.append('file', file);
    formData.append('role', 'content');
    formData.append('label', file.name);

    showAssetsFeedback('Uploading ' + file.name + '...', 'info');
    fetch('/api/upload', { method: 'POST', body: formData })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (data && data.error) throw new Error(data.error);
        if (data && data.asset && data.asset.filename) {
          assetsState.selectedAssetFilename = data.asset.filename;
        }
        showAssetsFeedback('Uploaded ' + file.name + '.', 'success');
        refreshAssetsWorkspace();
        if (window.refreshAssetBar) window.refreshAssetBar();
      })
      .catch(function (err) {
        showAssetsFeedback('Upload failed: ' + err.message, 'error');
      });
  }

  function assignAssetToSlot(slot, asset) {
    if (!slot || !asset) return;
    showAssetsFeedback('Applying ' + (asset.label || asset.filename) + ' to ' + formatSlotName(slot) + '...', 'info');
    fetch('/api/replace-slot', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slot_id: slot.slot_id, newSrc: asset.src })
    }).then(function (r) { return r.json(); })
      .then(function (data) {
        if (!data || data.success !== true) throw new Error((data && data.error) || 'Slot update failed');
        showAssetsFeedback('Applied asset to ' + formatSlotName(slot) + '.', 'success');
        refreshAssetsWorkspace();
      })
      .catch(function (err) {
        showAssetsFeedback('Could not apply asset: ' + err.message, 'error');
      });
  }

  function clearSlot(slot) {
    if (!slot) return;
    showAssetsFeedback('Clearing ' + formatSlotName(slot) + '...', 'info');
    fetch('/api/clear-slot-mapping', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slot_id: slot.slot_id })
    }).then(function (r) { return r.json(); })
      .then(function (data) {
        if (!data || data.success !== true) throw new Error((data && data.error) || 'Clear failed');
        showAssetsFeedback('Cleared ' + formatSlotName(slot) + '.', 'success');
        refreshAssetsWorkspace();
      })
      .catch(function (err) {
        showAssetsFeedback('Could not clear slot: ' + err.message, 'error');
      });
  }

  function generateStockForSlot(slot, query) {
    if (!slot) return;
    var finalQuery = (query || '').trim() || defaultStockQuery(slot);
    showAssetsFeedback('Generating stock image for ' + formatSlotName(slot) + '...', 'info');
    fetch('/api/stock-photo', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slot_id: slot.slot_id, query: finalQuery })
    }).then(function (r) { return r.json(); })
      .then(function (data) {
        if (!data || data.success !== true) throw new Error((data && data.error) || 'Stock generation failed');
        showAssetsFeedback('Generated stock image for ' + formatSlotName(slot) + '.', 'success');
        refreshAssetsWorkspace();
      })
      .catch(function (err) {
        showAssetsFeedback('Could not generate stock image: ' + err.message, 'error');
      });
  }

  function showAssetsFeedback(text, type) {
    var feedback = assetsRefs.feedback;
    if (!feedback) return;
    feedback.textContent = text;
    feedback.className = 'assets-feedback ' + (type || 'info');
    feedback.classList.remove('hidden');
  }

  function findSlotById(slotId) {
    return (assetsState.slots || []).find(function (slot) { return slot.slot_id === slotId; }) || null;
  }

  function findAssetByFilename(filename) {
    return (assetsState.uploads || []).find(function (asset) { return asset.filename === filename; }) || null;
  }

  function resolveSiteAssetUrl(src) {
    if (!src) return '';
    if (/^https?:\/\//i.test(src)) return src;
    var base = 'http://localhost:' + (((window.config || {}).previewPort) || 3333);
    if (src.indexOf('/assets/') === 0) return base + src;
    if (src.indexOf('assets/') === 0) return base + '/' + src;
    return src;
  }

  function buildMediaThumb(src, alt, className) {
    var wrap = mkEl('div', { className: className || '' });
    if (src) {
      var img = document.createElement('img');
      img.src = src;
      img.alt = alt || '';
      wrap.appendChild(img);
    } else {
      wrap.appendChild(mkEl('div', {
        className: 'assets-thumb-empty',
        text: '\uD83D\uDDBC\uFE0F'
      }));
    }
    return wrap;
  }

  function formatSlotName(slot) {
    if (!slot) return 'Image slot';
    if (slot.alt) return slot.alt;
    return String(slot.slot_id || 'image-slot')
      .replace(/[-_]+/g, ' ')
      .replace(/\b\w/g, function (m) { return m.toUpperCase(); });
  }

  function defaultStockQuery(slot) {
    if (!slot) return '';
    if (slot.mapping && slot.mapping.query) return slot.mapping.query;
    return [assetsState.siteTag ? assetsState.siteTag.replace(/^site-/, '').replace(/-/g, ' ') : '', slot.role || '', formatSlotName(slot)]
      .join(' ')
      .trim();
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
        renderTextField(container, 'Custom domain', settings.custom_domain || '');
        renderTextField(container, 'Monthly rate ($)', settings.monthly_rate ? String(settings.monthly_rate) : '');
        renderTextField(container, 'Client name', settings.client_name || '');
        renderTextField(container, 'PayPal handle', settings.paypal_handle || 'famtasticfritz');
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

    // Center: Approve Site button
    var approveBtn = mkEl('button', { className: 'approve-site-btn', text: 'Mark as Client Approved' });
    approveBtn.id = 'approve-site-btn';
    approveBtn.addEventListener('click', function () { approveSite(approveBtn); });
    center.appendChild(approveBtn);

    body.appendChild(center);

    // Right: revenue card + DNS card + deploy history
    var right = mkEl('div', { className: 'screen-right' });
    right.appendChild(mkEl('div', { className: 'screen-header', text: 'Revenue & DNS' }));

    var revenueCard = mkEl('div', { className: 'revenue-card' });
    revenueCard.id = 'deploy-revenue-card';
    right.appendChild(revenueCard);

    var dnsCard = mkEl('div', { className: 'dns-card' });
    dnsCard.id = 'deploy-dns-card';
    right.appendChild(dnsCard);

    right.appendChild(mkEl('div', { className: 'screen-header', text: 'History', style: 'margin-top:12px;' }));
    var history = mkEl('div');
    history.id = 'deploy-history';
    history.appendChild(mkEl('div', { style: 'padding:10px 12px;font-size:11px;color:var(--fam-text-3);', text: 'No deploys yet.' }));
    right.appendChild(history);
    body.appendChild(right);

    pane.appendChild(body);

    loadPreflightChecks(checks);
    loadDeployPipeline(pipeline);
    loadDeployHistory(history);
    loadRevenueCard(revenueCard);
    loadDnsCard(dnsCard);
    syncApproveSiteBtn(approveBtn);
  }

  function loadRevenueCard(container) {
    clearEl(container);
    fetch('/api/revenue-card').then(function (r) { return r.json(); }).then(function (data) {
      clearEl(container);
      if (!data.monthly_rate && data.state !== 'client_approved') {
        var hint = mkEl('div', { className: 'revenue-hint' });
        hint.textContent = 'Set a monthly rate to generate a PayPal payment link.';

        var rateRow = mkEl('div', { className: 'revenue-rate-row' });
        var rateInput = mkEl('input', { className: 'revenue-rate-input' });
        rateInput.type = 'number';
        rateInput.placeholder = '$0 / mo';
        rateInput.min = '0';
        rateRow.appendChild(rateInput);

        var saveBtn = mkEl('button', { className: 'revenue-save-btn', text: 'Save Rate' });
        saveBtn.addEventListener('click', function () {
          var val = parseFloat(rateInput.value);
          if (!val || val <= 0) return;
          fetch('/api/patch-spec', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ monthly_rate: val }) })
            .then(function () { loadRevenueCard(container); })
            .catch(function () {});
        });
        rateRow.appendChild(saveBtn);

        container.appendChild(hint);
        container.appendChild(rateRow);
        return;
      }

      if (data.monthly_rate) {
        var rateLabel = mkEl('div', { className: 'revenue-rate-label' });
        rateLabel.textContent = '$' + data.monthly_rate + ' / month';
        container.appendChild(rateLabel);
      }

      if (data.paypal_link) {
        var linkWrap = mkEl('div', { className: 'revenue-paypal-wrap' });
        var linkLabel = mkEl('div', { className: 'revenue-paypal-label', text: 'Payment Link' });
        var link = mkEl('a', { className: 'revenue-paypal-link' });
        link.href = data.paypal_link;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        link.textContent = data.paypal_link;
        var copyBtn = mkEl('button', { className: 'revenue-copy-btn', text: 'Copy' });
        copyBtn.addEventListener('click', function () {
          navigator.clipboard.writeText(data.paypal_link).then(function () {
            copyBtn.textContent = 'Copied!';
            setTimeout(function () { copyBtn.textContent = 'Copy'; }, 1500);
          }).catch(function () {});
        });
        linkWrap.appendChild(linkLabel);
        linkWrap.appendChild(link);
        linkWrap.appendChild(copyBtn);
        container.appendChild(linkWrap);
      }

      if (data.state === 'client_approved') {
        var approvedBadge = mkEl('div', { className: 'revenue-approved-badge', text: '\u2713 Client Approved' });
        if (data.approved_at) {
          var ts = mkEl('div', { className: 'revenue-approved-ts', text: new Date(data.approved_at).toLocaleDateString() });
          container.appendChild(ts);
        }
        container.appendChild(approvedBadge);
      }
    }).catch(function () {
      container.appendChild(mkEl('div', { style: 'font-size:11px;color:var(--fam-text-3);padding:8px;', text: 'Revenue data unavailable.' }));
    });
  }

  function loadDnsCard(container) {
    clearEl(container);
    fetch('/api/studio-state').then(function (r) { return r.json(); }).then(function (data) {
      var deployedUrl = (data && data.spec && data.spec.deployed_url) || null;
      var customDomain = (data && data.spec && data.spec.custom_domain) || null;
      if (!deployedUrl) return;

      var netlifyHost = deployedUrl.replace(/^https?:\/\//, '').replace(/\/$/, '');

      var card = mkEl('div', { className: 'dns-card-inner' });
      card.appendChild(mkEl('div', { className: 'dns-card-title', text: 'GoDaddy DNS Setup' }));

      var steps = [
        'Log into GoDaddy \u2192 My Products \u2192 Domains',
        'Select your domain \u2192 DNS',
        'Add CNAME: Name=www, Value=' + netlifyHost,
        'Add A record: Name=@, Value=75.2.60.5',
        customDomain ? 'Add domain in Netlify: Site Settings \u2192 Domain' : 'Add custom domain in Netlify Site Settings',
        'Wait 24\u201348h for DNS propagation',
      ];

      var list = mkEl('ol', { className: 'dns-steps' });
      steps.forEach(function (s) {
        var li = document.createElement('li');
        li.textContent = s;
        list.appendChild(li);
      });
      card.appendChild(list);

      if (customDomain) {
        var domainNote = mkEl('div', { className: 'dns-domain-note', text: 'Target domain: ' + customDomain });
        card.appendChild(domainNote);
      }

      container.appendChild(card);
    }).catch(function () {});
  }

  function syncApproveSiteBtn(btn) {
    fetch('/api/revenue-card').then(function (r) { return r.json(); }).then(function (data) {
      if (data.state === 'client_approved') {
        btn.textContent = '\u2713 Approved';
        btn.disabled = true;
        btn.classList.add('approved');
      }
    }).catch(function () {});
  }

  function approveSite(btn) {
    btn.disabled = true;
    btn.textContent = 'Approving\u2026';
    fetch('/api/approve-site', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (data.ok) {
          btn.textContent = '\u2713 Approved';
          btn.classList.add('approved');
          var card = document.getElementById('deploy-revenue-card');
          if (card) loadRevenueCard(card);
        } else {
          btn.disabled = false;
          btn.textContent = 'Mark as Client Approved';
        }
      })
      .catch(function () {
        btn.disabled = false;
        btn.textContent = 'Mark as Client Approved';
      });
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
        if (tabId === 'assets') {
          mountOnce('assets', mountAssets);
          setTimeout(refreshAssetsWorkspace, 40);
        }
        if (tabId === 'deploy') mountOnce('deploy', mountDeploy);
      };
    }

    // Also watch for click on tab buttons
    document.addEventListener('click', function (e) {
      var btn = e.target.closest && e.target.closest('.ws-tab');
      if (!btn) return;
      var tabId = btn.dataset.tabId;
      if (tabId === 'assets') setTimeout(function () {
        mountOnce('assets', mountAssets);
        refreshAssetsWorkspace();
      }, 80);
      if (tabId === 'deploy') setTimeout(function () { mountOnce('deploy', mountDeploy); }, 80);
    });

    window.addEventListener('studio:site-changed', function () {
      if (mounted.assets) setTimeout(refreshAssetsWorkspace, 80);
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
