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

  // ── COMPONENTS + MEDIA STUDIO WORKSPACES ────────────────────────────────
  var componentState = {
    siteTag: null,
    library: [],
    selectedComponentId: null,
    selectedComponent: null,
    activeTab: 'library',
    importDraft: '',
    importPreview: null,
    importMessage: '',
    importTone: 'info',
    exportDraftId: '',
    exportMessage: '',
    exportTone: 'info',
    selection: null,
    studioSpec: {}
  };

  var assetsState = {
    siteTag: null,
    slots: [],
    uploads: [],
    capabilities: null,
    selectedSlotId: null,
    selectedAssetFilename: null,
    selectedBrandFilename: null,
    search: '',
    roleFilter: 'all',
    returnContext: null,
    activeTab: 'home',
    usageSummary: null,
    history: [],
    generation: {
      prompt: '',
      assetType: 'slot-image',
      aspect: 'slot',
      count: 1,
      quality: 'balanced',
      destination: 'selected-slot',
      motionIntent: 'none',
      styleIntent: 'bold',
      providerMode: 'auto',
      showOptions: false,
      showAdvanced: false
    }
  };

  var assetsRefs = {};
  var componentRefs = {};

  function humanizeLabel(value) {
    return String(value || '')
      .replace(/[-_]+/g, ' ')
      .replace(/\.html$/i, '')
      .replace(/\b\w/g, function (m) { return m.toUpperCase(); });
  }

  function slugify(value) {
    return String(value || '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 64) || 'component';
  }

  function parseComponentVersion(ref) {
    var parts = String(ref || '').split('@');
    return { id: parts[0] || '', version: parts[1] || '1.0' };
  }

  function normalizeComponentSummary(item) {
    item = item || {};
    return {
      id: item.component_id || item.id || '',
      name: item.name || humanizeLabel(item.component_id || item.id || 'component'),
      type: item.type || 'generic',
      version: item.version || '1.0',
      description: item.description || '',
      field_count: item.field_count != null ? item.field_count : (item.content_fields || []).length,
      slot_count: item.slot_count != null ? item.slot_count : (item.slots || []).length,
      css_variables: item.css_variables || Object.keys((item.css && item.css.variables) || {}),
      used_in: item.used_in || item.sites_using || [],
      updated_at: item.updated_at || item.created_at || '',
      raw: item
    };
  }

  function resolveSelectionComponentId(selection) {
    if (!selection) return null;
    if (selection.component_id) return selection.component_id;
    if (selection.component_ref) return parseComponentVersion(selection.component_ref).id;
    return null;
  }

  function findCurrentSelection() {
    if (!window.StudioShell || typeof StudioShell.getWorkspaceState !== 'function') return null;
    var state = StudioShell.getWorkspaceState() || {};
    return state.active_selection || null;
  }

  function getSelectedSectionForExport(selection) {
    var ctx = selection || findCurrentSelection();
    if (!ctx) return null;
    if (ctx.type === 'section') return ctx;
    if (ctx.type === 'component') {
      return {
        type: 'section',
        page: ctx.page,
        section_id: ctx.section_id,
        component_id: ctx.component_id,
        component_ref: ctx.component_ref
      };
    }
    return null;
  }

  function mountComponents() {
    var pane = document.getElementById('tab-pane-components');
    if (!pane) return;
    clearEl(pane);
    pane.style.cssText = 'display:flex;flex-direction:column;height:100%;overflow:hidden;';

    var shell = mkEl('div', { className: 'assets-shell' });
    var topbar = mkEl('div', { className: 'assets-topbar' });
    var intro = mkEl('div', { className: 'assets-topbar-copy' });
    intro.appendChild(mkEl('div', { className: 'assets-topbar-title', text: 'Components Workspace' }));
    intro.appendChild(mkEl('div', {
      className: 'assets-topbar-sub',
      text: 'Library, import, export, dependency review, and previews now live inside Studio.'
    }));
    topbar.appendChild(intro);

    var toolbar = mkEl('div', { className: 'assets-topbar-actions' });
    var openSelectionBtn = mkEl('button', { className: 'media-action-btn', text: 'Use current selection' });
    var refreshBtn = mkEl('button', { className: 'media-action-btn', text: 'Refresh' });
    openSelectionBtn.addEventListener('click', function () {
      componentState.selection = findCurrentSelection();
      syncSelectedComponentFromSelection();
      renderComponentsWorkspace();
    });
    refreshBtn.addEventListener('click', refreshComponentsWorkspace);
    toolbar.appendChild(openSelectionBtn);
    toolbar.appendChild(refreshBtn);
    topbar.appendChild(toolbar);
    shell.appendChild(topbar);

    var tabsRow = buildWorkspaceTabRow(componentState.activeTab, [
      { id: 'library', label: 'Library' },
      { id: 'import', label: 'Import' },
      { id: 'export', label: 'Export' },
      { id: 'dependencies', label: 'Dependencies' },
      { id: 'previews', label: 'Previews' }
    ], function (tabId) {
      componentState.activeTab = tabId;
      renderComponentsWorkspace();
    });
    shell.appendChild(tabsRow);

    var view = mkEl('div', { className: 'screen-three-panel assets-workspace' });
    view.style.flex = '1';

    var left = mkEl('div', { className: 'screen-left assets-workspace-left' });
    left.appendChild(mkEl('div', { className: 'screen-header', text: 'Library' }));
    var summary = mkEl('div', { className: 'assets-slot-summary' });
    var list = mkEl('div', { className: 'assets-slot-list' });
    left.appendChild(summary);
    left.appendChild(list);
    view.appendChild(left);

    var center = mkEl('div', { className: 'screen-center assets-workspace-center' });
    var feedback = mkEl('div', { className: 'assets-feedback hidden' });
    var detail = mkEl('div', { className: 'assets-workspace-detail' });
    center.appendChild(feedback);
    center.appendChild(detail);
    view.appendChild(center);

    var right = mkEl('div', { className: 'screen-right assets-workspace-right' });
    right.appendChild(mkEl('div', { className: 'screen-header', text: 'Selection & Lineage' }));
    var side = mkEl('div', { className: 'media-library' });
    right.appendChild(side);
    view.appendChild(right);

    shell.appendChild(view);
    pane.appendChild(shell);

    componentRefs = {
      pane: pane,
      summary: summary,
      list: list,
      feedback: feedback,
      detail: detail,
      side: side
    };

    refreshComponentsWorkspace();
  }

  function refreshComponentsWorkspace() {
    if (!componentRefs.pane) return;
    Promise.all([
      fetch('/api/components').then(function (r) { return r.json(); }),
      fetch('/api/studio-state').then(function (r) { return r.json(); })
    ]).then(function (results) {
      var library = results[0] || {};
      var studio = results[1] || {};
      componentState.siteTag = studio.tag || null;
      componentState.library = (library.components || []).map(normalizeComponentSummary).sort(function (a, b) {
        return a.name.localeCompare(b.name);
      });
      componentState.studioSpec = studio.spec || {};
      componentState.selection = findCurrentSelection();
      syncSelectedComponentFromSelection();
      if (!findComponentById(componentState.selectedComponentId)) {
        componentState.selectedComponentId = componentState.library[0] ? componentState.library[0].id : null;
      }
      loadSelectedComponentDetail().then(renderComponentsWorkspace);
      renderComponentsSidebar();
    }).catch(function () {
      showComponentsFeedback('Could not load component library.', 'error');
    });
  }

  function renderComponentsSidebar() {
    var sidebar = document.getElementById('sidebar-components-list');
    if (!sidebar) return;
    clearEl(sidebar);
    if (!(componentState.library || []).length) {
      sidebar.appendChild(mkEl('div', {
        className: 'assets-empty-note',
        text: 'No component packages yet. Export a section or import a component package.'
      }));
      return;
    }
    componentState.library.slice(0, 12).forEach(function (component) {
      var item = mkEl('button', {
        className: 'assets-slot-item' + (component.id === componentState.selectedComponentId ? ' active' : '')
      });
      item.type = 'button';
      item.appendChild(mkEl('div', { className: 'assets-slot-item-name', text: component.name }));
      item.appendChild(mkEl('div', {
        className: 'assets-slot-item-meta',
        text: [component.type, 'v' + component.version].filter(Boolean).join(' · ')
      }));
      item.addEventListener('click', function () {
        componentState.selectedComponentId = component.id;
        componentState.activeTab = 'library';
        loadSelectedComponentDetail().then(renderComponentsWorkspace);
        if (window.StudioShell) StudioShell.switchTab('components');
      });
      sidebar.appendChild(item);
    });
  }

  function renderComponentsWorkspace() {
    renderComponentsSummary();
    renderComponentsList();
    renderComponentsDetail();
    renderComponentsSelectionRail();
    renderComponentsSidebar();
  }

  function renderComponentsSummary() {
    var summary = componentRefs.summary;
    if (!summary) return;
    clearEl(summary);
    summary.appendChild(mkEl('div', {
      className: 'assets-summary-site',
      text: componentState.siteTag || 'No active site'
    }));
    var cards = mkEl('div', { className: 'assets-summary-cards' });
    [
      { label: 'Library', value: String((componentState.library || []).length) },
      { label: 'Fields', value: String((componentState.library || []).reduce(function (sum, item) { return sum + (item.field_count || 0); }, 0)) },
      { label: 'Slots', value: String((componentState.library || []).reduce(function (sum, item) { return sum + (item.slot_count || 0); }, 0)) }
    ].forEach(function (item) {
      var card = mkEl('div', { className: 'assets-summary-card' });
      card.appendChild(mkEl('div', { className: 'assets-summary-value', text: item.value }));
      card.appendChild(mkEl('div', { className: 'assets-summary-label', text: item.label }));
      cards.appendChild(card);
    });
    summary.appendChild(cards);
  }

  function renderComponentsList() {
    var list = componentRefs.list;
    if (!list) return;
    clearEl(list);
    if (!(componentState.library || []).length) {
      list.appendChild(mkEl('div', {
        className: 'assets-empty-note',
        text: 'Export a section from Build Studio or import a package to seed the library.'
      }));
      return;
    }
    componentState.library.forEach(function (component) {
      var item = mkEl('button', {
        className: 'assets-slot-item' + (component.id === componentState.selectedComponentId ? ' active' : '')
      });
      item.type = 'button';
      var top = mkEl('div', { className: 'assets-slot-item-top' });
      top.appendChild(mkEl('div', { className: 'assets-slot-item-name', text: component.name }));
      top.appendChild(mkEl('span', { className: 'media-tag filled', text: component.type }));
      item.appendChild(top);
      item.appendChild(mkEl('div', {
        className: 'assets-slot-item-meta',
        text: ['v' + component.version, (component.field_count || 0) + ' fields', (component.slot_count || 0) + ' slots'].join(' · ')
      }));
      if (component.description) {
        item.appendChild(mkEl('div', { className: 'assets-slot-item-foot', text: component.description }));
      }
      item.addEventListener('click', function () {
        componentState.selectedComponentId = component.id;
        loadSelectedComponentDetail().then(renderComponentsWorkspace);
      });
      list.appendChild(item);
    });
  }

  function renderComponentsDetail() {
    var detail = componentRefs.detail;
    if (!detail) return;
    clearEl(detail);
    var selected = componentState.selectedComponent || findComponentById(componentState.selectedComponentId);

    if (componentState.activeTab === 'import') {
      detail.appendChild(buildComponentImportView());
      return;
    }
    if (componentState.activeTab === 'export') {
      detail.appendChild(buildComponentExportView());
      return;
    }
    if (!selected) {
      detail.appendChild(mkEl('div', {
        className: 'assets-welcome-card',
        text: 'Select a component package to inspect dependencies, lineage, and preview output.'
      }));
      return;
    }

    if (componentState.activeTab === 'dependencies') {
      detail.appendChild(buildComponentDependenciesView(selected));
      return;
    }
    if (componentState.activeTab === 'previews') {
      detail.appendChild(buildComponentPreviewView(selected));
      return;
    }

    detail.appendChild(buildComponentLibraryView(selected));
  }

  function renderComponentsSelectionRail() {
    var side = componentRefs.side;
    if (!side) return;
    clearEl(side);
    var selection = componentState.selection || findCurrentSelection();
    var selected = componentState.selectedComponent || findComponentById(componentState.selectedComponentId);
    var lineage = deriveComponentLineage(selection, selected);

    var card = mkEl('div', { className: 'assets-action-card' });
    card.appendChild(mkEl('div', { className: 'assets-section-label', text: 'Current selection' }));
    card.appendChild(mkEl('div', {
      className: 'assets-selected-name',
      text: selection ? [selection.type || 'selection', selection.section_id || selection.component_id || selection.page || ''].filter(Boolean).join(' · ') : 'No component selection'
    }));
    card.appendChild(mkEl('div', { className: 'assets-selected-meta', text: lineage.label }));
    side.appendChild(card);

    var contract = mkEl('div', { className: 'assets-action-card' });
    contract.appendChild(mkEl('div', { className: 'assets-section-label', text: 'Package contract' }));
    ['template HTML', 'local CSS', 'local JS', 'field schema', 'slot schema', 'dependency manifest', 'CSS variable requirements', 'preview assets'].forEach(function (label) {
      contract.appendChild(mkEl('div', { className: 'assets-help-text', text: '• ' + label }));
    });
    side.appendChild(contract);
  }

  function buildComponentLibraryView(component) {
    var wrap = mkEl('div', { className: 'assets-workspace-detail' });
    var hero = mkEl('div', { className: 'assets-detail-hero' });
    hero.appendChild(mkEl('div', { className: 'assets-detail-eyebrow', text: 'Library component' }));
    hero.appendChild(mkEl('div', { className: 'assets-detail-title', text: component.name }));
    hero.appendChild(mkEl('div', {
      className: 'assets-detail-meta',
      text: [component.id, component.type, 'v' + component.version].filter(Boolean).join(' · ')
    }));
    if (component.description) hero.appendChild(mkEl('div', { className: 'assets-help-text', text: component.description }));
    wrap.appendChild(hero);

    var stats = mkEl('div', { className: 'assets-action-card' });
    stats.appendChild(mkEl('div', { className: 'assets-section-label', text: 'Structure' }));
    [
      'Fields: ' + ((component.content_fields || []).length || component.field_count || 0),
      'Slots: ' + ((component.slots || []).length || component.slot_count || 0),
      'CSS vars: ' + Object.keys((component.css && component.css.variables) || component.css_variables || {}).length,
      'Used in: ' + ((component.used_in || []).length || 0) + ' site(s)'
    ].forEach(function (line) {
      stats.appendChild(mkEl('div', { className: 'assets-help-text', text: line }));
    });
    var actions = mkEl('div', { className: 'assets-action-row' });
    actions.appendChild(makeWorkspaceButton('Open Previews', function () {
      componentState.activeTab = 'previews';
      renderComponentsWorkspace();
    }, true));
    actions.appendChild(makeWorkspaceButton('Review Dependencies', function () {
      componentState.activeTab = 'dependencies';
      renderComponentsWorkspace();
    }, false));
    stats.appendChild(actions);
    wrap.appendChild(stats);

    var fields = mkEl('div', { className: 'assets-action-card' });
    fields.appendChild(mkEl('div', { className: 'assets-section-label', text: 'Field schema' }));
    if (!(component.content_fields || []).length) {
      fields.appendChild(mkEl('div', { className: 'assets-empty-note', text: 'No content fields declared.' }));
    } else {
      component.content_fields.forEach(function (field) {
        fields.appendChild(mkEl('div', {
          className: 'assets-help-text',
          text: [field.id || field.field_id, field.type || 'text', field.description || field.default || field.default_value || ''].filter(Boolean).join(' · ')
        }));
      });
    }
    wrap.appendChild(fields);

    var slots = mkEl('div', { className: 'assets-action-card' });
    slots.appendChild(mkEl('div', { className: 'assets-section-label', text: 'Slot schema' }));
    if (!(component.slots || []).length) {
      slots.appendChild(mkEl('div', { className: 'assets-empty-note', text: 'No slots declared.' }));
    } else {
      component.slots.forEach(function (slot) {
        slots.appendChild(mkEl('div', {
          className: 'assets-help-text',
          text: [slot.id || slot.slot_id, slot.type || slot.role || 'slot', slot.description || ''].filter(Boolean).join(' · ')
        }));
      });
    }
    wrap.appendChild(slots);

    return wrap;
  }

  function buildComponentDependenciesView(component) {
    var wrap = mkEl('div', { className: 'assets-workspace-detail' });
    var card = mkEl('div', { className: 'assets-action-card' });
    card.appendChild(mkEl('div', { className: 'assets-section-label', text: 'Dependency manifest' }));
    var deps = component.dependencies || component.dependency_manifest || {};
    ['css', 'js', 'external', 'fonts'].forEach(function (key) {
      var values = deps[key] || [];
      card.appendChild(mkEl('div', {
        className: 'assets-help-text',
        text: key.toUpperCase() + ': ' + (values.length ? values.join(', ') : 'none declared')
      }));
    });
    var cssVars = mkEl('div', { className: 'assets-action-card' });
    cssVars.appendChild(mkEl('div', { className: 'assets-section-label', text: 'Required CSS variables' }));
    var vars = (component.css && component.css.variables) || component.css_variables || {};
    var names = Object.keys(vars);
    if (!names.length) {
      cssVars.appendChild(mkEl('div', { className: 'assets-empty-note', text: 'No CSS variable requirements declared.' }));
    } else {
      names.forEach(function (name) {
        var value = vars[name];
        cssVars.appendChild(mkEl('div', {
          className: 'assets-help-text',
          text: name + ' · ' + (typeof value === 'object' ? (value.default || value.description || '') : value)
        }));
      });
    }
    wrap.appendChild(card);
    wrap.appendChild(cssVars);
    return wrap;
  }

  function buildComponentPreviewView(component) {
    var wrap = mkEl('div', { className: 'assets-workspace-detail' });
    var card = mkEl('div', { className: 'assets-action-card' });
    card.appendChild(mkEl('div', { className: 'assets-section-label', text: 'Preview' }));
    var preview = document.createElement('iframe');
    preview.className = 'component-preview-frame';
    preview.srcdoc = buildComponentPreviewMarkup(component);
    card.appendChild(preview);
    wrap.appendChild(card);

    var assets = mkEl('div', { className: 'assets-action-card' });
    assets.appendChild(mkEl('div', { className: 'assets-section-label', text: 'Preview / demo assets' }));
    var previewAssets = component.preview_assets || component.demo_assets || [];
    if (!previewAssets.length) {
      assets.appendChild(mkEl('div', { className: 'assets-empty-note', text: 'No preview assets declared. Demo assets stay separate from site media.' }));
    } else {
      previewAssets.forEach(function (asset) {
        assets.appendChild(mkEl('div', { className: 'assets-help-text', text: typeof asset === 'string' ? asset : JSON.stringify(asset) }));
      });
    }
    wrap.appendChild(assets);
    return wrap;
  }

  function buildComponentImportView() {
    var wrap = mkEl('div', { className: 'assets-workspace-detail' });
    var card = mkEl('div', { className: 'assets-action-card' });
    card.appendChild(mkEl('div', { className: 'assets-section-label', text: 'Import package' }));
    card.appendChild(mkEl('div', {
      className: 'assets-help-text',
      text: 'Paste a component package JSON or load a local manifest. Imports write the package into /components and update the library index.'
    }));

    var fileRow = mkEl('div', { className: 'assets-action-row' });
    var loadBtn = mkEl('button', { className: 'media-action-btn', text: 'Load JSON file' });
    var fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = '.json,application/json';
    fileInput.style.display = 'none';
    loadBtn.addEventListener('click', function () { fileInput.click(); });
    fileInput.addEventListener('change', function () {
      var file = fileInput.files && fileInput.files[0];
      if (!file) return;
      var reader = new FileReader();
      reader.onload = function () {
        componentState.importDraft = String(reader.result || '');
        tryBuildImportPreview();
        renderComponentsWorkspace();
      };
      reader.readAsText(file);
      fileInput.value = '';
    });
    fileRow.appendChild(loadBtn);
    fileRow.appendChild(fileInput);
    card.appendChild(fileRow);

    var textarea = document.createElement('textarea');
    textarea.className = 'assets-stock-input';
    textarea.rows = 14;
    textarea.placeholder = '{ "component_id": "feature-grid", "html_template": "<section>...</section>" }';
    textarea.value = componentState.importDraft || '';
    textarea.addEventListener('input', function () {
      componentState.importDraft = textarea.value;
      tryBuildImportPreview();
    });
    card.appendChild(textarea);

    if (componentState.importPreview) {
      var preview = mkEl('div', { className: 'assets-selected-copy' });
      preview.appendChild(mkEl('div', { className: 'assets-selected-name', text: componentState.importPreview.name || componentState.importPreview.component_id }));
      preview.appendChild(mkEl('div', {
        className: 'assets-selected-meta',
        text: [componentState.importPreview.component_id, componentState.importPreview.type || 'generic'].join(' · ')
      }));
      card.appendChild(preview);
    }

    var actions = mkEl('div', { className: 'assets-action-row' });
    actions.appendChild(makeWorkspaceButton('Import to library', submitComponentImport, true));
    card.appendChild(actions);
    wrap.appendChild(card);
    return wrap;
  }

  function buildComponentExportView() {
    var wrap = mkEl('div', { className: 'assets-workspace-detail' });
    var selection = getSelectedSectionForExport(componentState.selection);
    var card = mkEl('div', { className: 'assets-action-card' });
    card.appendChild(mkEl('div', { className: 'assets-section-label', text: 'Export from current site' }));
    card.appendChild(mkEl('div', {
      className: 'assets-help-text',
      text: selection
        ? 'Export the selected section into the shared component library.'
        : 'Select a section or component in Build Studio first, then return here to export.'
    }));

    var input = document.createElement('input');
    input.className = 'assets-stock-input';
    input.type = 'text';
    input.placeholder = 'component-id';
    input.value = componentState.exportDraftId || slugify((selection && (selection.component_id || selection.section_id)) || componentState.selectedComponentId || 'component');
    input.addEventListener('input', function () { componentState.exportDraftId = input.value || ''; });
    card.appendChild(input);

    var meta = mkEl('div', {
      className: 'assets-help-text',
      text: selection ? [selection.page, selection.section_id || 'section', selection.component_id || selection.component_ref || 'local instance'].filter(Boolean).join(' · ') : 'No eligible selection'
    });
    card.appendChild(meta);

    var actions = mkEl('div', { className: 'assets-action-row' });
    var exportBtn = makeWorkspaceButton('Export to library', function () { submitComponentExport(selection, input.value); }, true);
    exportBtn.disabled = !selection;
    actions.appendChild(exportBtn);
    card.appendChild(actions);
    wrap.appendChild(card);
    return wrap;
  }

  function submitComponentImport() {
    if (!componentState.importDraft.trim()) {
      showComponentsFeedback('Paste a component package first.', 'error');
      return;
    }
    var payload;
    try {
      payload = JSON.parse(componentState.importDraft);
    } catch (err) {
      showComponentsFeedback('Import JSON is invalid: ' + err.message, 'error');
      return;
    }
    showComponentsFeedback('Importing component package...', 'info');
    fetch('/api/components/import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ component: payload })
    }).then(function (r) { return r.json(); })
      .then(function (data) {
        if (!data || data.error) throw new Error((data && data.error) || 'Import failed');
        componentState.selectedComponentId = ((data.component || {}).component_id) || null;
        componentState.activeTab = 'library';
        showComponentsFeedback('Imported ' + (data.component.name || data.component.component_id) + '.', 'success');
        refreshComponentsWorkspace();
      })
      .catch(function (err) {
        showComponentsFeedback('Import failed: ' + err.message, 'error');
      });
  }

  function submitComponentExport(selection, componentId) {
    var target = selection || getSelectedSectionForExport(componentState.selection);
    if (!target) {
      showComponentsFeedback('Select a section or component before exporting.', 'error');
      return;
    }
    var finalId = slugify(componentId || target.component_id || target.section_id || 'component');
    showComponentsFeedback('Exporting ' + finalId + '...', 'info');
    fetch('/api/components/export', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        page: target.page,
        section_id: target.section_id || undefined,
        component_id: finalId
      })
    }).then(function (r) { return r.json(); })
      .then(function (data) {
        if (!data || data.error) throw new Error((data && data.error) || 'Export failed');
        componentState.selectedComponentId = finalId;
        componentState.activeTab = 'library';
        showComponentsFeedback('Exported ' + finalId + ' to the shared library.', 'success');
        refreshComponentsWorkspace();
      })
      .catch(function (err) {
        showComponentsFeedback('Export failed: ' + err.message, 'error');
      });
  }

  function tryBuildImportPreview() {
    try {
      componentState.importPreview = JSON.parse(componentState.importDraft);
      componentState.importMessage = '';
    } catch (_) {
      componentState.importPreview = null;
    }
  }

  function syncSelectedComponentFromSelection() {
    var selectionComponentId = resolveSelectionComponentId(componentState.selection);
    if (selectionComponentId && findComponentById(selectionComponentId)) {
      componentState.selectedComponentId = selectionComponentId;
    }
  }

  function loadSelectedComponentDetail() {
    if (!componentState.selectedComponentId) {
      componentState.selectedComponent = null;
      return Promise.resolve(null);
    }
    return fetch('/api/components/' + encodeURIComponent(componentState.selectedComponentId))
      .then(function (r) { return r.ok ? r.json() : findComponentById(componentState.selectedComponentId); })
      .then(function (component) {
        componentState.selectedComponent = component ? Object.assign({}, normalizeComponentSummary(component), component) : null;
        return componentState.selectedComponent;
      })
      .catch(function () {
        componentState.selectedComponent = findComponentById(componentState.selectedComponentId);
        return componentState.selectedComponent;
      });
  }

  function findComponentById(componentId) {
    return (componentState.library || []).find(function (item) { return item.id === componentId; }) || null;
  }

  function deriveComponentLineage(selection, selected) {
    if (!selection) return { status: 'unknown', label: 'No active component selection' };
    if (!selection.component_ref) return { status: 'local', label: 'Local instance — not library-backed yet' };
    var parsed = parseComponentVersion(selection.component_ref);
    if (!selected || selected.id !== parsed.id) return { status: 'library', label: 'Library-backed instance from ' + parsed.id };
    if (selected.version !== parsed.version) return { status: 'modified', label: 'Modified instance — selected site is on v' + parsed.version + ', library is v' + selected.version };
    return { status: 'library', label: 'Library-backed instance — aligned to v' + selected.version };
  }

  function buildComponentPreviewMarkup(component) {
    var cssText = ((component.css || {}).local) || '';
    var jsText = ((component.js || {}).local) || '';
    return '<!doctype html><html><head><style>body{margin:0;padding:24px;background:#111113;color:#e8e6e1;font-family:Inter,system-ui,sans-serif;}'
      + '.preview-shell{border:1px solid #1e1e20;border-radius:14px;padding:18px;background:#0f0f11;}' + cssText
      + '</style></head><body><div class="preview-shell">' + (component.html_template || '<section>Preview unavailable</section>') + '</div><script>' + jsText + '<\/script></body></html>';
  }

  function showComponentsFeedback(text, tone) {
    if (!componentRefs.feedback) return;
    componentRefs.feedback.textContent = text;
    componentRefs.feedback.className = 'assets-feedback ' + (tone || 'info');
    componentRefs.feedback.classList.remove('hidden');
  }

  function mountAssets() {
    var pane = document.getElementById('tab-pane-assets');
    if (!pane) return;
    clearEl(pane);
    pane.style.cssText = 'display:flex;flex-direction:column;height:100%;overflow:hidden;';

    var shell = mkEl('div', { className: 'assets-shell media-studio-shell' });
    var topbar = mkEl('div', { className: 'assets-topbar' });
    var intro = mkEl('div', { className: 'assets-topbar-copy' });
    intro.appendChild(mkEl('div', { className: 'assets-topbar-title', text: 'Media Studio' }));
    intro.appendChild(mkEl('div', {
      className: 'assets-topbar-sub',
      text: 'Prompt-first generation, cleaner slot routing, Brand Kit, and a calmer asset drawer in one studio surface.'
    }));
    topbar.appendChild(intro);

    var toolbar = mkEl('div', { className: 'assets-topbar-actions' });
    var returnBtn = mkEl('button', { className: 'media-action-btn', text: 'Return to selection' });
    var uploadBtn = mkEl('button', { className: 'media-action-btn primary', text: 'Upload Media' });
    var refreshBtn = mkEl('button', { className: 'media-action-btn', text: 'Refresh' });
    var fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/*,.svg';
    fileInput.style.display = 'none';
    returnBtn.addEventListener('click', function () {
      assetsState.returnContext = null;
      renderReturnState();
      if (window.StudioShell && typeof StudioShell.returnToPreviousContext === 'function') {
        StudioShell.returnToPreviousContext();
      }
    });
    uploadBtn.addEventListener('click', function () { fileInput.click(); });
    fileInput.addEventListener('change', function () {
      if (fileInput.files && fileInput.files[0]) handleAssetUpload(fileInput.files[0], assetsState.activeTab === 'brand' ? 'logo' : 'content');
      fileInput.value = '';
    });
    refreshBtn.addEventListener('click', refreshAssetsWorkspace);
    toolbar.appendChild(returnBtn);
    toolbar.appendChild(uploadBtn);
    toolbar.appendChild(refreshBtn);
    toolbar.appendChild(fileInput);
    topbar.appendChild(toolbar);
    shell.appendChild(topbar);

    var view = mkEl('div', { className: 'screen-three-panel assets-workspace media-studio-workspace' });
    view.style.flex = '1';

    var left = mkEl('div', { className: 'screen-left assets-workspace-left' });
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
    var rightHeader = mkEl('div', { className: 'screen-header', text: 'Studio Drawer' });
    var side = mkEl('div', { className: 'media-library media-studio-drawer' });
    right.appendChild(rightHeader);
    right.appendChild(side);
    view.appendChild(right);

    shell.appendChild(view);
    pane.appendChild(shell);

    assetsRefs = {
      pane: pane,
      summary: summary,
      slotList: slotList,
      detail: detail,
      feedback: feedback,
      side: side,
      rightHeader: rightHeader,
      returnBtn: returnBtn
    };

    refreshAssetsWorkspace();
  }

  function refreshAssetsWorkspace() {
    if (!assetsRefs.pane) return;
    Promise.all([
      fetch('/api/studio-state').then(function (r) { return r.json(); }),
      fetch('/api/uploads').then(function (r) { return r.json(); }),
      fetch('/api/media/usage').then(function (r) { return r.json(); }).catch(function () { return {}; }),
      fetch('/api/capability-manifest').then(function (r) { return r.json(); }).catch(function () { return {}; })
    ]).then(function (results) {
      var studio = results[0] || {};
      var uploadsRaw = results[1] || [];
      var usage = results[2] || {};
      var manifest = results[3] || {};
      var spec = studio.spec || {};
      var mappings = spec.slot_mappings || {};
      var usageMap = {};

      Object.keys(mappings).forEach(function (slotId) {
        var mapping = mappings[slotId] || {};
        var src = String(mapping.src || '');
        var filename = src.split('/').pop();
        if (!filename) return;
        if (!usageMap[filename]) usageMap[filename] = [];
        usageMap[filename].push({
          slot_id: slotId,
          page: ((spec.media_specs || []).find(function (slot) { return slot.slot_id === slotId; }) || {}).page || 'index.html',
          provider: mapping.provider || 'uploaded'
        });
      });

      assetsState.siteTag = studio.tag || null;
      assetsState.usageSummary = usage;
      assetsState.capabilities = manifest.capabilities || {};
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
        var filename = asset.filename || '';
        var usageEntries = usageMap[filename] || [];
        return {
          filename: filename,
          role: asset.role || 'content',
          type: asset.type || 'image',
          label: asset.label || '',
          notes: asset.notes || '',
          uploaded_at: asset.uploaded_at || '',
          exists: asset.exists !== false,
          src: filename ? ('assets/uploads/' + filename) : (asset.url || asset.path || ''),
          url: asset.url || asset.path || '',
          usage: usageEntries,
          asset_class: asset.role === 'logo' || asset.type === 'logo' ? 'logo' : (asset.role === 'brand' ? 'brand_asset' : 'image'),
          lifecycle_state: usageEntries.length ? 'approved' : 'uploaded'
        };
      });

      assetsState.history = buildMediaHistory(assetsState.slots, assetsState.uploads);
      if (!findSlotById(assetsState.selectedSlotId)) {
        var firstEmpty = assetsState.slots.find(function (slot) { return slot.status === 'empty'; });
        assetsState.selectedSlotId = firstEmpty ? firstEmpty.slot_id : (assetsState.slots[0] && assetsState.slots[0].slot_id) || null;
      }
      if (!findAssetByFilename(assetsState.selectedAssetFilename)) {
        assetsState.selectedAssetFilename = assetsState.uploads[0] ? assetsState.uploads[0].filename : null;
      }
      if (!findAssetByFilename(assetsState.selectedBrandFilename)) {
        var firstBrand = assetsState.uploads.find(function (asset) { return asset.role === 'logo' || asset.role === 'brand'; });
        assetsState.selectedBrandFilename = firstBrand ? firstBrand.filename : null;
      }
      var slot = findSlotById(assetsState.selectedSlotId);
      if (!assetsState.generation.prompt) assetsState.generation.prompt = defaultStockQuery(slot);

      renderAssetsWorkspace();
      renderAssetsSidebar();
    }).catch(function () {
      showAssetsFeedback('Could not load Media Studio data.', 'error');
    });
  }

  function renderAssetsSidebar() {
    var sidebar = document.getElementById('sidebar-assets-list');
    if (!sidebar) return;
    clearEl(sidebar);
    var slot = findSlotById(assetsState.selectedSlotId);
    if (slot) {
      sidebar.appendChild(mkEl('div', { className: 'assets-slot-item-name', text: formatSlotName(slot) }));
      sidebar.appendChild(mkEl('div', {
        className: 'assets-slot-item-meta',
        text: [slot.page, slot.role, slot.status].filter(Boolean).join(' · ')
      }));
    } else {
      sidebar.appendChild(mkEl('div', { className: 'assets-empty-note', text: 'Select a slot to route Media Studio back into Build.' }));
    }
    (assetsState.history || []).slice(0, 5).forEach(function (entry) {
      sidebar.appendChild(mkEl('div', { className: 'assets-slot-item-foot', text: entry.title }));
    });
  }

  function renderAssetsWorkspace() {
    renderReturnState();
    renderSlotSummary();
    renderSlotList();
    renderWorkspaceDetail();
    renderMediaLibrary();
    renderAssetsSidebar();
    syncMediaOverflowCue();
  }

  function renderReturnState() {
    if (!assetsRefs.returnBtn) return;
    assetsRefs.returnBtn.style.display = assetsState.returnContext ? '' : 'none';
  }

  function renderSlotSummary() {
    var summary = assetsRefs.summary;
    if (!summary) return;
    clearEl(summary);

    var slots = assetsState.slots || [];
    var uploads = assetsState.uploads || [];
    var selectedSlot = findSlotById(assetsState.selectedSlotId);
    var nav = mkEl('div', { className: 'media-studio-nav' });
    summary.appendChild(mkEl('div', {
      className: 'assets-summary-site',
      text: assetsState.siteTag || 'No active site'
    }));

    getMediaNavItems().forEach(function (item) {
      var btn = mkEl('button', {
        className: 'media-studio-nav-item' + (item.id === assetsState.activeTab ? ' active' : '')
      });
      btn.type = 'button';
      btn.appendChild(mkEl('div', { className: 'media-studio-nav-label', text: item.label }));
      btn.appendChild(mkEl('div', { className: 'media-studio-nav-sub', text: item.sub }));
      btn.addEventListener('click', function () {
        assetsState.activeTab = item.id;
        renderAssetsWorkspace();
      });
      nav.appendChild(btn);
    });
    summary.appendChild(nav);

    var context = mkEl('div', { className: 'media-context-card' });
    context.appendChild(mkEl('div', { className: 'assets-section-label', text: 'Current target' }));
    if (selectedSlot) {
      context.appendChild(mkEl('div', { className: 'assets-detail-title media-context-title', text: formatSlotName(selectedSlot) }));
      context.appendChild(mkEl('div', {
        className: 'assets-detail-meta',
        text: [selectedSlot.page || 'index.html', selectedSlot.role || 'image', selectedSlot.dimensions || ''].filter(Boolean).join(' · ')
      }));
      var statRow = mkEl('div', { className: 'assets-summary-cards media-context-stats' });
      [
        { label: 'Need media', value: String(slots.filter(function (slot) { return slot.status === 'empty'; }).length) },
        { label: 'Library', value: String(uploads.length) },
        { label: 'Status', value: selectedSlot.status || 'empty' }
      ].forEach(function (item) {
        var card = mkEl('div', { className: 'assets-summary-card media-context-stat' });
        card.appendChild(mkEl('div', { className: 'assets-summary-value', text: item.value }));
        card.appendChild(mkEl('div', { className: 'assets-summary-label', text: item.label }));
        statRow.appendChild(card);
      });
      context.appendChild(statRow);
    } else {
      context.appendChild(mkEl('div', {
        className: 'assets-help-text',
        text: 'Select a slot to route prompt-driven generation or replacement back into Build.'
      }));
    }
    summary.appendChild(context);
  }

  function renderSlotList() {
    var list = assetsRefs.slotList;
    if (!list) return;
    clearEl(list);

    if (assetsState.activeTab === 'brand') {
      renderBrandAssetList(list);
      return;
    }
    if (assetsState.activeTab === 'motion') {
      renderHistoryList(list);
      return;
    }
    if (assetsState.activeTab === 'provider') {
      renderProviderList(list);
      return;
    }
    if (assetsState.activeTab === 'queue') {
      renderHistoryList(list);
      return;
    }

    var slots = (assetsState.slots || []).slice().sort(function (a, b) {
      if (a.status === b.status) return formatSlotName(a).localeCompare(formatSlotName(b));
      if (a.status === 'empty') return -1;
      if (b.status === 'empty') return 1;
      return 0;
    });

    if (!slots.length) {
      list.appendChild(mkEl('div', {
        className: 'assets-empty-note',
        text: 'No media slots are registered on this site yet. Build or re-scan the site first.'
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
      item.appendChild(mkEl('div', {
        className: 'assets-slot-item-meta',
        text: [slot.page || 'index.html', slot.role || 'image'].filter(Boolean).join(' · ')
      }));
      item.appendChild(mkEl('div', {
        className: 'assets-slot-item-foot',
        text: slot.mapping && slot.mapping.src
          ? (slot.mapping.provider === 'stock' ? 'Generated and active' : 'Library asset applied')
          : (slot.dimensions || 'Needs media')
      }));
      item.addEventListener('click', function () {
        assetsState.selectedSlotId = slot.slot_id;
        if (!String(assetsState.generation.prompt || '').trim()) {
          assetsState.generation.prompt = defaultStockQuery(slot);
        }
        renderAssetsWorkspace();
      });
      list.appendChild(item);
    });
  }

  function renderBrandAssetList(list) {
    var brandAssets = (assetsState.uploads || []).filter(function (asset) {
      return asset.role === 'logo' || asset.role === 'brand';
    });
    if (!brandAssets.length) {
      list.appendChild(mkEl('div', { className: 'assets-empty-note', text: 'Upload a logo or brand asset to seed the Brand Kit.' }));
      return;
    }
    brandAssets.forEach(function (asset) {
      var item = mkEl('button', {
        className: 'assets-slot-item' + (asset.filename === assetsState.selectedBrandFilename ? ' active' : '')
      });
      item.type = 'button';
      item.appendChild(mkEl('div', { className: 'assets-slot-item-name', text: asset.label || asset.filename }));
      item.appendChild(mkEl('div', {
        className: 'assets-slot-item-meta',
        text: [asset.asset_class, asset.lifecycle_state, asset.uploaded_at ? new Date(asset.uploaded_at).toLocaleDateString() : ''].filter(Boolean).join(' · ')
      }));
      item.addEventListener('click', function () {
        assetsState.selectedBrandFilename = asset.filename;
        renderAssetsWorkspace();
      });
      list.appendChild(item);
    });
  }

  function renderProviderList(list) {
    var providers = (assetsState.usageSummary && assetsState.usageSummary.by_provider) || {};
    var names = Object.keys(providers);
    if (!names.length) {
      list.appendChild(mkEl('div', { className: 'assets-empty-note', text: 'No provider telemetry yet. Generate or import media to populate this view.' }));
      return;
    }
    names.forEach(function (name) {
      var data = providers[name];
      var item = mkEl('div', { className: 'assets-slot-item' });
      item.appendChild(mkEl('div', { className: 'assets-slot-item-name', text: name }));
      item.appendChild(mkEl('div', {
        className: 'assets-slot-item-meta',
        text: [String(data.operations || 0) + ' ops', '$' + Number(data.cost || 0).toFixed(2), (data.avg_speed_seconds || 0) + 's avg'].join(' · ')
      }));
      list.appendChild(item);
    });
  }

  function renderHistoryList(list) {
    var history = assetsState.history || [];
    if (!history.length) {
      list.appendChild(mkEl('div', { className: 'assets-empty-note', text: 'No media activity yet.' }));
      return;
    }
    history.forEach(function (entry) {
      var item = mkEl('div', { className: 'assets-slot-item' });
      item.appendChild(mkEl('div', { className: 'assets-slot-item-name', text: entry.title }));
      item.appendChild(mkEl('div', { className: 'assets-slot-item-meta', text: entry.meta }));
      list.appendChild(item);
    });
  }

  function renderWorkspaceDetail() {
    var detail = assetsRefs.detail;
    if (!detail) return;
    detail.dataset.userScrolled = '';
    clearEl(detail);

    if (assetsState.activeTab === 'home') {
      detail.appendChild(buildMediaHomeView());
      return;
    }
    if (assetsState.activeTab === 'generate') {
      detail.appendChild(buildMediaGenerateView());
      return;
    }
    if (assetsState.activeTab === 'motion') {
      detail.appendChild(buildMotionVideoView());
      return;
    }
    if (assetsState.activeTab === 'library') {
      detail.appendChild(buildMediaLibraryView());
      return;
    }
    if (assetsState.activeTab === 'brand') {
      detail.appendChild(buildBrandKitView());
      return;
    }
    if (assetsState.activeTab === 'queue') {
      detail.appendChild(buildQueueHistoryView());
      return;
    }
    if (assetsState.activeTab === 'provider') {
      detail.appendChild(buildProviderView());
      return;
    }

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

    detail.appendChild(mkEl('div', {
      className: 'assets-workflow-note',
      text: 'Library mode handles assignment and replacement. Switch to Generate for prompt-driven fills, or Brand Kit for logo management.'
    }));

    var preview = mkEl('div', { className: 'assets-current-preview' });
    preview.appendChild(mkEl('div', { className: 'assets-section-label', text: 'Current media' }));
    if (slot.mapping && slot.mapping.src) {
      preview.appendChild(buildMediaThumb(resolveSiteAssetUrl(slot.mapping.src), formatSlotName(slot), 'assets-current-image'));
      preview.appendChild(mkEl('div', {
        className: 'assets-current-caption',
        text: slot.mapping.provider === 'stock'
          ? 'Current source: stock/reference asset'
          : 'Current source: uploaded library asset'
      }));
    } else {
      preview.appendChild(mkEl('div', {
        className: 'assets-empty-preview',
        text: 'This slot is empty. Pick a library asset or switch to Generate to fill it.'
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
        text: [asset.role || 'content', asset.asset_class || asset.type || 'image', asset.lifecycle_state || 'uploaded'].join(' · ')
      }));
      selection.appendChild(info);
      actionCard.appendChild(selection);
    } else {
      actionCard.appendChild(mkEl('div', { className: 'assets-empty-note', text: 'No uploaded media selected yet.' }));
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
    var generateBtn = mkEl('button', { className: 'media-action-btn', text: 'Open Generate' });
    generateBtn.addEventListener('click', function () {
      assetsState.activeTab = 'generate';
      assetsState.generation.prompt = defaultStockQuery(slot);
      renderAssetsWorkspace();
    });
    assignRow.appendChild(generateBtn);
    actionCard.appendChild(assignRow);
    detail.appendChild(actionCard);
  }

  function renderMediaLibrary() {
    var side = assetsRefs.side;
    if (!side) return;
    clearEl(side);

    if (assetsRefs.rightHeader) {
      assetsRefs.rightHeader.textContent = assetsState.activeTab === 'home'
        ? 'Shay + Picks'
        : assetsState.activeTab === 'generate'
        ? 'Shay + Results'
        : assetsState.activeTab === 'motion'
        ? 'Motion + Shay'
        : assetsState.activeTab === 'brand'
          ? 'Brand Review'
          : assetsState.activeTab === 'provider'
            ? 'Provider Detail'
            : assetsState.activeTab === 'queue'
              ? 'Activity Detail'
              : 'Library Companion';
    }

    if (assetsState.activeTab === 'provider') {
      renderProviderRecommendations(side);
      return;
    }
    if (assetsState.activeTab === 'queue') {
      renderHistorySummaryGrid(side);
      return;
    }

    var slot = findSlotById(assetsState.selectedSlotId);
    var uploads = filteredUploads();
    var selectedAsset = findAssetByFilename(assetsState.activeTab === 'brand' ? assetsState.selectedBrandFilename : assetsState.selectedAssetFilename);

    var slotCard = mkEl('div', { className: 'media-side-card' });
    slotCard.appendChild(mkEl('div', {
      className: 'assets-section-label',
      text: (assetsState.activeTab === 'generate' || assetsState.activeTab === 'home') ? 'Selected destination' : 'Selection'
    }));
    if (slot) {
      slotCard.appendChild(mkEl('div', { className: 'assets-selected-name', text: formatSlotName(slot) }));
      slotCard.appendChild(mkEl('div', {
        className: 'assets-selected-meta',
        text: [slot.page || 'index.html', slot.role || 'image', slot.status || 'empty'].filter(Boolean).join(' · ')
      }));
      if (slot.mapping && slot.mapping.src) {
        slotCard.appendChild(buildMediaThumb(resolveSiteAssetUrl(slot.mapping.src), formatSlotName(slot), 'assets-current-image'));
      } else {
        slotCard.appendChild(mkEl('div', {
          className: 'assets-empty-preview media-side-empty',
          text: 'No asset is applied yet. Generate or pick one from the drawer.'
        }));
      }
    } else {
      slotCard.appendChild(mkEl('div', {
        className: 'assets-help-text',
        text: 'Pick a slot from the left queue to make assignment and generation destination-aware.'
      }));
    }
    side.appendChild(slotCard);

    if (assetsState.activeTab === 'library') {
      side.appendChild(buildMediaShayDock({
        compact: true,
        title: 'Shay Beside The Gallery',
        copy: 'Keep comparing assets without leaving the library. Shay can review the current selection or help route it.',
        prompt: selectedAsset
          ? 'Review this library asset: ' + (selectedAsset.label || selectedAsset.filename) + '.'
          : 'Help me choose the right asset from this library.',
        secondaryPrompt: selectedAsset
          ? 'Send this asset to Shay for review: ' + (selectedAsset.label || selectedAsset.filename) + '.'
          : 'Help me decide which library asset belongs in the active slot.'
      }));
      side.appendChild(mkEl('div', { className: 'screen-header media-side-subhead', text: 'Quick Picks' }));
      side.appendChild(buildMediaResultRail(uploads.slice(0, 4), { compact: true, allowAssign: true, allowBrand: true, allowShay: true }));
      return;
    }

    if (assetsState.activeTab === 'brand') {
      side.appendChild(buildMediaShayDock({
        compact: true,
        title: 'Shay On Brand',
        copy: 'Ask Shay whether the selected mark feels strong enough for a lockup, favicon, or navigation system.',
        prompt: selectedAsset
          ? 'Review this Brand Kit asset: ' + (selectedAsset.label || selectedAsset.filename) + '.'
          : 'Help me shape this Brand Kit.'
      }));
      side.appendChild(buildSelectedAssetDetail(selectedAsset));
      return;
    }

    side.appendChild(buildMediaShayDock({
      compact: true,
      title: assetsState.activeTab === 'generate' ? 'Shay In Generate' : 'Shay In Media',
      copy: assetsState.activeTab === 'generate'
        ? 'Use Shay to tighten prompts, compare results, or decide whether to iterate before you route anything.'
        : 'Shay stays available while you move between Home, Generate, and the rest of the studio.',
      prompt: assetsState.activeTab === 'generate'
        ? (buildGenerationPrompt(slot) || 'Help me improve this prompt.')
        : 'Help me decide the next media action for this site.'
    }));

    var recent = mkEl('div', { className: 'media-side-card' });
    recent.appendChild(mkEl('div', { className: 'assets-section-label', text: 'Recent Results' }));
    recent.appendChild(buildMediaResultRail(uploads.slice(0, 4), { compact: true, allowAssign: true, allowBrand: true, allowShay: true }));
    side.appendChild(recent);
  }

  function buildAssetsWelcome() {
    var wrap = mkEl('div', { className: 'assets-welcome-card' });
    wrap.appendChild(mkEl('div', { className: 'assets-detail-title', text: 'Start in Generate, then route the result anywhere' }));
    wrap.appendChild(mkEl('div', {
      className: 'assets-help-text',
      text: 'Media Studio now treats prompt-driven creation as the primary flow. Pick a destination on the left, create in the center, then refine, assign, or ask Shay from the companion panel.'
    }));
    return wrap;
  }

  function buildMediaHomeView() {
    var wrap = mkEl('div', { className: 'assets-workspace-detail media-home-view' });
    var slot = findSlotById(assetsState.selectedSlotId);
    var emptyCount = (assetsState.slots || []).filter(function (item) { return item.status === 'empty'; }).length;
    var heroAsset = findAssetByFilename(assetsState.selectedAssetFilename) || ((assetsState.uploads || [])[0] || null);
    var promptSeed = assetsState.generation.prompt || buildGenerationPrompt(slot) || defaultStockQuery(slot) || '';

    var hero = mkEl('div', { className: 'assets-action-card media-home-hero media-home-create-hero' });
    if (heroAsset && heroAsset.src) {
      hero.style.backgroundImage = 'linear-gradient(180deg, rgba(11,11,14,0.18), rgba(11,11,14,0.78)), url("' + resolveSiteAssetUrl(heroAsset.src) + '")';
    }
    hero.appendChild(mkEl('div', { className: 'assets-detail-eyebrow', text: 'Create' }));
    hero.appendChild(mkEl('div', { className: 'media-stage-title media-home-display-title', text: 'Prompt first. Results next. Everything else stays secondary.' }));
    hero.appendChild(mkEl('div', {
      className: 'media-stage-sub',
      text: slot
        ? 'Current destination: ' + formatSlotName(slot) + '. This Create screen should feel like the clean starting point, not a crowded tool wall.'
        : 'Start here with the prompt, then move downward row by row into image, video, library, provider, and Shay help.'
    }));

    var promptStage = mkEl('div', { className: 'media-home-prompt-stage' });
    var promptInput = document.createElement('textarea');
    promptInput.className = 'assets-stock-input media-home-prompt-input';
    promptInput.rows = 3;
    promptInput.value = promptSeed;
    promptInput.placeholder = 'Type a prompt for the next image, brand mark, or media concept...';
    promptInput.addEventListener('input', function () {
      assetsState.generation.prompt = promptInput.value;
    });
    promptStage.appendChild(promptInput);
    var promptActions = mkEl('div', { className: 'assets-action-row media-home-prompt-actions' });
    promptActions.appendChild(makeWorkspaceButton('Open Image Studio', function () {
      assetsState.generation.prompt = promptInput.value;
      assetsState.activeTab = 'generate';
      renderAssetsWorkspace();
    }, true));
    promptActions.appendChild(makeWorkspaceButton('Open Motion / Video', function () {
      assetsState.generation.prompt = promptInput.value;
      assetsState.activeTab = 'motion';
      renderAssetsWorkspace();
    }, false));
    promptActions.appendChild(makeWorkspaceButton('Ask Shay', function () {
      assetsState.generation.prompt = promptInput.value;
      askShayFromMedia(promptInput.value || 'Help me decide what to create next in Media Studio.');
    }, false));
    promptStage.appendChild(promptActions);
    hero.appendChild(promptStage);
    wrap.appendChild(hero);

    var stats = mkEl('div', { className: 'assets-summary-cards media-home-stats' });
    [
      { label: 'Open slots', value: String(emptyCount) },
      { label: 'Library assets', value: String((assetsState.uploads || []).length) },
      { label: 'History', value: String((assetsState.history || []).length) }
    ].forEach(function (item) {
      var card = mkEl('div', { className: 'assets-summary-card media-context-stat' });
      card.appendChild(mkEl('div', { className: 'assets-summary-value', text: item.value }));
      card.appendChild(mkEl('div', { className: 'assets-summary-label', text: item.label }));
      stats.appendChild(card);
    });
    wrap.appendChild(stats);

    wrap.appendChild(buildMediaModeRow([
      {
        title: 'Image',
        sub: 'Prompt-driven image creation with recipes, detail controls, and a recent-results flow.',
        action: 'Open Image',
        primary: true,
        onClick: function () {
          assetsState.activeTab = 'generate';
          renderAssetsWorkspace();
        }
      },
      {
        title: 'Video / Motion',
        sub: 'A separate screen for motion planning and future video generation. This keeps image creation clean.',
        action: 'Open Motion',
        onClick: function () {
          assetsState.activeTab = 'motion';
          renderAssetsWorkspace();
        }
      },
      {
        title: 'Library',
        sub: 'Visual gallery for browsing, comparing, assigning, and sending assets to Shay or Brand.',
        action: 'Open Library',
        onClick: function () {
          assetsState.activeTab = 'library';
          renderAssetsWorkspace();
        }
      }
    ]));

    var recent = mkEl('div', { className: 'assets-action-card' });
    recent.appendChild(mkEl('div', { className: 'assets-section-label', text: 'Recent Results' }));
    recent.appendChild(buildMediaResultRail((assetsState.uploads || []).slice(0, 6), { allowAssign: true, allowShay: true }));
    wrap.appendChild(recent);

    wrap.appendChild(buildProviderStatusRow());

    wrap.appendChild(buildMediaShayDock({
      title: 'Shay In Create',
      prompt: slot
        ? 'Help me decide what media to create for ' + formatSlotName(slot) + '.'
        : 'Help me decide what to create next in Media Studio.',
      sendLabel: 'Ask Shay'
    }));

    var below = mkEl('div', { className: 'assets-action-card' });
    below.appendChild(mkEl('div', { className: 'assets-section-label', text: 'Screen rhythm' }));
    ['Row 1: prompt stage', 'Row 2: one major function per card', 'Row 3: result review', 'Row 4: providers and Shay'].forEach(function (line) {
      below.appendChild(mkEl('div', { className: 'assets-help-text', text: line }));
    });
    wrap.appendChild(below);
    return wrap;
  }

  function buildMediaGenerateView() {
    var wrap = mkEl('div', { className: 'assets-workspace-detail' });
    var slot = findSlotById(assetsState.selectedSlotId);
    var stage = mkEl('div', { className: 'assets-action-card media-generate-stage' });
    stage.appendChild(mkEl('div', { className: 'assets-section-label', text: 'Image Studio' }));
    stage.appendChild(mkEl('div', { className: 'media-stage-title', text: 'Image generation stays focused: prompt, recipe, options, results' }));
    stage.appendChild(mkEl('div', {
      className: 'media-stage-sub',
      text: slot
        ? 'Destination ready: ' + formatSlotName(slot) + ' on ' + (slot.page || 'index.html') + '. Stay on image work here; motion and video live on their own screen.'
        : 'Start with a prompt. You can select a destination slot from the left, or generate a reusable asset for the library.'
    }));

    var prompt = document.createElement('textarea');
    prompt.className = 'assets-stock-input media-stage-prompt';
    prompt.rows = 7;
    prompt.value = assetsState.generation.prompt || defaultStockQuery(slot);
    prompt.placeholder = 'Describe what to create. Focus on shape language, composition, iconography, mood, brand tone, and what should feel premium instead of generic.';
    prompt.addEventListener('input', function () { assetsState.generation.prompt = prompt.value; });
    stage.appendChild(prompt);

    stage.appendChild(mkEl('div', { className: 'assets-section-label', text: 'Recipes' }));
    stage.appendChild(buildPromptChipRow([
      {
        label: 'Shay-Shay',
        value: 'Create a charismatic Shay-Shay assistant mascot: radiant orb energy, confident expression, premium brand glow, crisp silhouette, memorable enough for icons and motion.',
        patch: { assetType: 'illustration', styleIntent: 'playful' }
      },
      {
        label: 'FAM Icon Pack',
        value: 'Create a premium family of FAMtastic icons: bold geometric silhouettes, clear negative space, warm brand energy, scalable across product navigation and badges.',
        patch: { assetType: 'icon', styleIntent: 'refined' }
      },
      {
        label: 'Mascot',
        value: 'Create a bold mascot character with thick silhouette, expressive eyes, clean vector-style edges, and transparent-friendly background.',
        patch: { assetType: 'illustration', styleIntent: 'playful' }
      },
      {
        label: 'Icon set',
        value: 'Create a sharp SVG icon for this brand. Geometric, high-contrast, single focal silhouette, scalable at 16px to 64px.',
        patch: { assetType: 'icon', styleIntent: 'refined' }
      },
      {
        label: 'Logo mark',
        value: 'Create a vector-first logo mark with strong shape language, clean negative space, and brand-ready simplicity.',
        patch: { assetType: 'logo', styleIntent: 'refined' }
      },
      {
        label: 'Hero art',
        value: defaultStockQuery(slot) || 'Create a striking hero illustration with atmospheric depth, premium composition, and no generic stock-photo feel.',
        patch: { assetType: 'hero', styleIntent: 'editorial' }
      },
      {
        label: 'Favicon',
        value: 'Create a favicon-ready symbol: minimal, bold, single-shape identity, readable at tiny sizes.',
        patch: { assetType: 'favicon', styleIntent: 'bold' }
      },
      {
        label: 'Divider',
        value: 'Create a subtle decorative divider with elegant motion cues, light asymmetry, and restrained contrast.',
        patch: { assetType: 'divider', styleIntent: 'refined' }
      }
    ]));

    stage.appendChild(buildProviderStatusRow({ compact: true }));

    var primaryRow = mkEl('div', { className: 'assets-action-row media-stage-primary-row' });
    primaryRow.appendChild(buildSelectControl('Asset type', assetsState.generation.assetType, [
      { value: 'slot-image', label: 'Fill slot image' },
      { value: 'icon', label: 'SVG icon' },
      { value: 'logo', label: 'Logo' },
      { value: 'favicon', label: 'Favicon' },
      { value: 'hero', label: 'Hero art' },
      { value: 'divider', label: 'Divider' },
      { value: 'illustration', label: 'Illustration' }
    ], function (value) { assetsState.generation.assetType = value; }));
    if (assetsState.generation.assetType === 'slot-image') {
      primaryRow.appendChild(buildSelectControl('Destination', assetsState.generation.destination, [
        { value: 'selected-slot', label: 'Selected slot' },
        { value: 'empty-slot', label: 'First empty slot' }
      ], function (value) { assetsState.generation.destination = value; }));
    }
    var generateBtn = assetsState.generation.assetType === 'slot-image'
      ? makeWorkspaceButton('Generate for destination', function () {
        var targetSlot = resolveGenerationSlot();
        if (!targetSlot) {
          showAssetsFeedback('Select a destination slot before generating.', 'error');
          return;
        }
        generateStockForSlot(targetSlot, buildGenerationPrompt(slot));
      }, true)
      : makeWorkspaceButton('Generate asset', function () {
        generateStandaloneAsset();
      }, true);
    generateBtn.className += ' media-stage-generate-btn';
    primaryRow.appendChild(generateBtn);
    stage.appendChild(primaryRow);

    var advancedBtn = mkEl('button', {
      className: 'media-action-btn',
      text: assetsState.generation.showOptions ? 'Hide options' : 'Options'
    });
    advancedBtn.addEventListener('click', function () {
      assetsState.generation.showOptions = !assetsState.generation.showOptions;
      renderAssetsWorkspace();
    });
    stage.appendChild(advancedBtn);

    if (assetsState.generation.showOptions) {
      var options = mkEl('div', { className: 'assets-action-card media-generate-options' });
      options.appendChild(mkEl('div', { className: 'assets-section-label', text: 'Creative options' }));
      var optionsRow = mkEl('div', { className: 'assets-action-row' });
      optionsRow.appendChild(buildSelectControl('Aspect ratio', assetsState.generation.aspect, [
        { value: 'slot', label: 'Match slot' },
        { value: '16:9', label: '16:9' },
        { value: '1:1', label: '1:1' },
        { value: '4:5', label: '4:5' }
      ], function (value) { assetsState.generation.aspect = value; }));
      optionsRow.appendChild(buildSelectControl('Count', String(assetsState.generation.count), [
        { value: '1', label: '1 variant' }
      ], function (value) { assetsState.generation.count = Number(value) || 1; }));
      optionsRow.appendChild(buildSelectControl('Quality', assetsState.generation.quality, [
        { value: 'balanced', label: 'Balanced' },
        { value: 'brand-first', label: 'Brand-first' },
        { value: 'reference', label: 'Reference / stock' }
      ], function (value) { assetsState.generation.quality = value; }));
      optionsRow.appendChild(buildSelectControl('Style', assetsState.generation.styleIntent, [
        { value: 'bold', label: 'Bold' },
        { value: 'refined', label: 'Refined' },
        { value: 'playful', label: 'Playful' },
        { value: 'editorial', label: 'Editorial' }
      ], function (value) { assetsState.generation.styleIntent = value; }));
      optionsRow.appendChild(buildSelectControl('Preferred route', assetsState.generation.providerMode, [
        { value: 'auto', label: 'Auto' },
        { value: 'claude_svg', label: 'Claude SVG' },
        { value: 'gemini_imagen', label: 'Gemini / Imagen' },
        { value: 'openai', label: 'OpenAI' }
      ], function (value) { assetsState.generation.providerMode = value; }));
      optionsRow.appendChild(buildSelectControl('Motion pass', assetsState.generation.motionIntent, [
        { value: 'none', label: 'No motion' },
        { value: 'subtle-reveal', label: 'Subtle reveal' },
        { value: 'hover-lift', label: 'Hover lift' },
        { value: 'parallax-float', label: 'Parallax float' }
      ], function (value) { assetsState.generation.motionIntent = value; }));
      options.appendChild(optionsRow);
      wrap.appendChild(options);
    }

    var utilityRow = mkEl('div', { className: 'assets-action-row' });
    var providerBtn = mkEl('button', {
      className: 'media-action-btn',
      text: assetsState.generation.showAdvanced ? 'Hide provider detail' : 'Provider detail'
    });
    providerBtn.addEventListener('click', function () {
      assetsState.generation.showAdvanced = !assetsState.generation.showAdvanced;
      renderAssetsWorkspace();
    });
    utilityRow.appendChild(providerBtn);
    utilityRow.appendChild(makeWorkspaceButton('Send motion pass to Build', function () {
      routeMotionPassToBuild();
    }, false));
    stage.appendChild(utilityRow);

    wrap.appendChild(stage);

    if (assetsState.generation.showAdvanced) {
      var advanced = mkEl('div', { className: 'assets-action-card media-generate-options' });
      advanced.appendChild(mkEl('div', { className: 'assets-section-label', text: 'Provider detail' }));
      advanced.appendChild(mkEl('div', {
        className: 'assets-help-text',
        text: 'Provider routing is still automatic today. This drawer surfaces telemetry truth and leaves provider complexity optional instead of primary.'
      }));
      advanced.appendChild(mkEl('div', {
        className: 'assets-help-text',
        text: 'Known providers: ' + Object.keys((assetsState.usageSummary || {}).by_provider || {}).join(', ') || 'none yet'
      }));
      wrap.appendChild(advanced);
    }

    var results = mkEl('div', { className: 'assets-action-card media-results-stage' });
    results.appendChild(mkEl('div', { className: 'assets-section-label', text: 'Recent Results' }));
    results.appendChild(mkEl('div', {
      className: 'assets-help-text',
      text: 'Generate, review, iterate, then send the strongest result into the right slot or Brand Kit.'
    }));
    results.appendChild(buildMediaResultRail((assetsState.uploads || []).slice(0, 8), { allowAssign: true, allowShay: true }));
    wrap.appendChild(results);

    wrap.appendChild(buildMediaShayDock({
      title: 'Ask Shay About This Prompt',
      prompt: buildGenerationPrompt(slot) || 'Help me improve this media prompt.',
      sendLabel: 'Ask Shay'
    }));
    return wrap;
  }

  function buildMediaLibraryView() {
    var wrap = mkEl('div', { className: 'assets-workspace-detail media-library-view' });
    var selectedAsset = findAssetByFilename(assetsState.selectedAssetFilename) || (filteredUploads()[0] || null);
    if (selectedAsset && !assetsState.selectedAssetFilename) assetsState.selectedAssetFilename = selectedAsset.filename;

    var header = mkEl('div', { className: 'assets-action-card media-library-stage' });
    header.appendChild(mkEl('div', { className: 'assets-detail-eyebrow', text: 'Library' }));
    header.appendChild(mkEl('div', { className: 'media-stage-title', text: 'Browse media as a visual studio, not a utility drawer' }));
    header.appendChild(mkEl('div', {
      className: 'media-stage-sub',
      text: 'Search, filter, compare, route to slots, send to Brand Kit, or ask Shay without leaving the gallery flow.'
    }));
    var controls = mkEl('div', { className: 'media-library-toolbar' });
    var search = mkEl('input', { className: 'media-library-search media-library-search-large' });
    search.placeholder = 'Search library';
    search.type = 'text';
    search.value = assetsState.search || '';
    search.addEventListener('input', function () {
      assetsState.search = search.value || '';
      renderAssetsWorkspace();
    });
    controls.appendChild(search);
    ['all', 'logo', 'content', 'character', 'brand'].forEach(function (role) {
      var btn = mkEl('button', {
        className: 'media-filter-btn' + (assetsState.roleFilter === role ? ' active' : ''),
        text: role === 'all' ? 'All' : humanizeLabel(role)
      });
      btn.type = 'button';
      btn.addEventListener('click', function () {
        assetsState.roleFilter = role;
        renderAssetsWorkspace();
      });
      controls.appendChild(btn);
    });
    header.appendChild(controls);
    wrap.appendChild(header);

    var body = mkEl('div', { className: 'media-library-body' });
    var gridCard = mkEl('div', { className: 'assets-action-card media-library-grid-card' });
    gridCard.appendChild(buildMediaLibraryGrid(selectedAsset));
    body.appendChild(gridCard);

    var detailCard = mkEl('div', { className: 'assets-action-card media-library-detail-card' });
    detailCard.appendChild(buildSelectedAssetDetail(selectedAsset));
    body.appendChild(detailCard);
    wrap.appendChild(body);

    wrap.appendChild(buildMediaShayDock({
      title: 'Shay On Library',
      prompt: 'Help me choose the best asset from this library for the active slot or Brand Kit.',
      sendLabel: 'Ask Shay'
    }));
    return wrap;
  }

  function buildMotionVideoView() {
    var wrap = mkEl('div', { className: 'assets-workspace-detail media-motion-view' });

    var hero = mkEl('div', { className: 'assets-action-card media-motion-stage' });
    hero.appendChild(mkEl('div', { className: 'assets-detail-eyebrow', text: 'Motion / Video' }));
    hero.appendChild(mkEl('div', { className: 'media-stage-title', text: 'Video should live on its own screen, not hide inside image generation' }));
    hero.appendChild(mkEl('div', {
      className: 'media-stage-sub',
      text: 'The repo currently supports motion direction and image generation, but there is no direct video generation endpoint wired into Media Studio yet.'
    }));
    var heroActions = mkEl('div', { className: 'assets-action-row media-stage-primary-row' });
    heroActions.appendChild(makeWorkspaceButton('Send Motion Pass To Build', function () {
      routeMotionPassToBuild();
    }, true));
    heroActions.appendChild(makeWorkspaceButton('Ask Shay About Video', function () {
      askShayFromMedia('Help me plan a video or motion direction for this site. Tell me what is possible now and what still needs backend work.');
    }, false));
    hero.appendChild(heroActions);
    wrap.appendChild(hero);

    wrap.appendChild(buildMediaModeRow([
      {
        title: 'Direct video generation',
        sub: 'Not wired yet. There is no direct `/api/media/generate-video` route in the current codebase.',
        action: 'Missing Endpoint',
        disabled: true
      },
      {
        title: 'Motion pass to Build',
        sub: 'Available now. Send restrained animation direction into Build for the current page.',
        action: 'Send Motion',
        primary: true,
        onClick: function () { routeMotionPassToBuild(); }
      },
      {
        title: 'Storyboard with Shay',
        sub: 'Available now. Use Shay to outline pacing, scenes, prompts, and transition ideas.',
        action: 'Ask Shay',
        onClick: function () { askShayFromMedia('Storyboard a short branded video concept for this site.'); }
      }
    ]));

    var requirements = mkEl('div', { className: 'assets-action-card' });
    requirements.appendChild(mkEl('div', { className: 'assets-section-label', text: 'What video needs next' }));
    ['A direct server endpoint for video generation', 'Provider routing for long-running renders', 'Queue entries for video jobs', 'Review and playback UI for video outputs'].forEach(function (line) {
      requirements.appendChild(mkEl('div', { className: 'assets-help-text', text: line }));
    });
    wrap.appendChild(requirements);

    wrap.appendChild(buildProviderStatusRow());
    wrap.appendChild(buildMediaShayDock({
      title: 'Shay On Motion',
      prompt: 'Help me plan motion or video work for this site using the current Media Studio capabilities.',
      sendLabel: 'Ask Shay'
    }));
    return wrap;
  }

  function buildMediaModeRow(items) {
    var row = mkEl('div', { className: 'media-mode-row' });
    (items || []).forEach(function (item) {
      var card = mkEl('div', { className: 'assets-action-card media-mode-card' + (item.disabled ? ' disabled' : '') });
      card.appendChild(mkEl('div', { className: 'assets-section-label', text: item.title }));
      card.appendChild(mkEl('div', { className: 'media-mode-card-title', text: item.title }));
      card.appendChild(mkEl('div', { className: 'assets-help-text', text: item.sub }));
      var actionRow = mkEl('div', { className: 'assets-action-row', style: 'margin-top:auto;' });
      var btn = makeWorkspaceButton(item.action || 'Open', item.onClick || function () {}, !!item.primary);
      if (item.disabled) btn.disabled = true;
      actionRow.appendChild(btn);
      card.appendChild(actionRow);
      row.appendChild(card);
    });
    return row;
  }

  function buildProviderStatusRow(options) {
    options = options || {};
    var card = mkEl('div', { className: 'assets-action-card media-provider-row' + (options.compact ? ' compact' : '') });
    card.appendChild(mkEl('div', { className: 'assets-section-label', text: 'Providers' }));
    card.appendChild(mkEl('div', {
      className: 'assets-help-text',
      text: 'Multiple APIs exist in Studio, but not every provider is routed into every media flow yet. Preferred route is visible now, but some routes are still advisory instead of fully wired.'
    }));
    var strip = mkEl('div', { className: 'media-provider-strip' });
    [
      {
        label: 'Claude SVG',
        state: 'available',
        detail: 'Current asset generator for logo, icon, hero, divider, favicon, banner, illustration'
      },
      {
        label: 'Gemini / Imagen',
        state: capabilityStatus('gemini_api'),
        detail: 'Available for image-related flows when Gemini is configured'
      },
      {
        label: 'OpenAI',
        state: capabilityStatus('openai_api'),
        detail: 'API is present in Studio, not yet a first-class Media generation route'
      },
      {
        label: 'Video',
        state: 'partial',
        detail: 'Dedicated screen now exists, direct video generation route still missing'
      }
    ].forEach(function (provider) {
      var pill = mkEl('button', { className: 'media-provider-pill state-' + providerStateTone(provider.state) });
      pill.type = 'button';
      pill.appendChild(mkEl('span', { className: 'media-provider-pill-label', text: provider.label }));
      pill.appendChild(mkEl('span', { className: 'media-provider-pill-meta', text: provider.detail }));
      pill.addEventListener('click', function () {
        assetsState.activeTab = 'provider';
        renderAssetsWorkspace();
      });
      strip.appendChild(pill);
    });
    card.appendChild(strip);
    return card;
  }

  function capabilityStatus(key) {
    var caps = assetsState.capabilities || {};
    return caps[key] || 'unavailable';
  }

  function providerStateTone(state) {
    if (state === 'available') return 'available';
    if (state === 'partial') return 'partial';
    if (state === 'broken') return 'broken';
    return 'unavailable';
  }

  function filteredUploads() {
    return (assetsState.uploads || []).filter(function (asset) {
      var hay = [asset.filename, asset.label, asset.role, asset.notes, asset.asset_class].join(' ').toLowerCase();
      var matchesSearch = !assetsState.search || hay.indexOf((assetsState.search || '').toLowerCase()) !== -1;
      var matchesRole = assetsState.roleFilter === 'all' || asset.role === assetsState.roleFilter || asset.asset_class === assetsState.roleFilter;
      return matchesSearch && matchesRole;
    });
  }

  function askShayFromMedia(text, opts) {
    opts = opts || {};
    var prompt = String(text || '').trim();
    if (!prompt) return;
    if (window.PipOrb && typeof window.PipOrb.askLite === 'function') {
      window.PipOrb.askLite(prompt, { sendNow: opts.sendNow !== false });
      return;
    }
    if (window.StudioShell) StudioShell.switchTab('shay');
    showAssetsFeedback('Shay Lite is not ready yet. Open Shay Desk instead.', 'info');
  }

  function buildMediaShayDock(options) {
    options = options || {};
    var card = mkEl('div', { className: 'assets-action-card media-shay-dock' + (options.compact ? ' compact' : '') });
    card.appendChild(mkEl('div', { className: 'assets-section-label', text: options.eyebrow || 'Shay Shay' }));
    card.appendChild(mkEl('div', { className: 'media-shay-title', text: options.title || 'Keep Shay in the loop' }));
    card.appendChild(mkEl('div', {
      className: 'assets-help-text media-shay-copy',
      text: options.copy || 'Ask for prompt help, send the current asset for review, or let Shay show you the next move inside Media Studio.'
    }));

    var inputWrap = mkEl('div', { className: 'media-shay-input-wrap' });
    var input = mkEl('input', { className: 'media-library-search media-shay-input' });
    input.type = 'text';
    input.value = options.prompt || '';
    input.placeholder = options.placeholder || 'Ask Shay about this media task';
    inputWrap.appendChild(input);
    var sendBtn = makeWorkspaceButton(options.sendLabel || 'Ask Shay', function () {
      askShayFromMedia(input.value);
    }, true);
    sendBtn.className += ' media-shay-send-btn';
    inputWrap.appendChild(sendBtn);
    card.appendChild(inputWrap);

    var actions = mkEl('div', { className: 'assets-action-row media-shay-actions' });
    actions.appendChild(makeWorkspaceButton(options.showLabel || 'Show Me', function () {
      if (window.PipOrb && typeof window.PipOrb.quickShowMe === 'function') {
        window.PipOrb.quickShowMe();
      } else {
        askShayFromMedia('Show me how to use this part of Media Studio.');
      }
    }, false));
    actions.appendChild(makeWorkspaceButton(options.deskLabel || 'Open Desk', function () {
      if (window.StudioShell) StudioShell.switchTab('shay');
    }, false));
    if (options.secondaryPrompt) {
      actions.appendChild(makeWorkspaceButton(options.secondaryLabel || 'Send Context', function () {
        askShayFromMedia(options.secondaryPrompt);
      }, false));
    }
    card.appendChild(actions);
    return card;
  }

  function buildMediaResultRail(uploads, options) {
    options = options || {};
    uploads = uploads || [];
    var rail = mkEl('div', { className: 'media-result-rail' + (options.compact ? ' compact' : '') });
    if (!uploads.length) {
      rail.appendChild(mkEl('div', {
        className: 'assets-empty-note',
        text: 'No media results yet. Generate something or upload an asset to start the library.'
      }));
      return rail;
    }

    var slot = findSlotById(assetsState.selectedSlotId);
    uploads.forEach(function (asset) {
      var card = mkEl('button', {
        className: 'media-result-card' + (asset.filename === assetsState.selectedAssetFilename ? ' selected' : '')
      });
      card.type = 'button';
      card.appendChild(buildMediaThumb(resolveSiteAssetUrl(asset.src), asset.label || asset.filename, 'media-result-thumb'));

      var body = mkEl('div', { className: 'media-result-body' });
      body.appendChild(mkEl('div', { className: 'media-result-name', text: asset.label || asset.filename }));
      body.appendChild(mkEl('div', {
        className: 'media-result-meta',
        text: [asset.role || 'content', asset.lifecycle_state || 'uploaded', asset.usage.length ? (asset.usage.length + ' uses') : 'new'].join(' · ')
      }));

      var actions = mkEl('div', { className: 'media-result-actions' });
      if (options.allowAssign) {
        var assign = mkEl('button', { className: 'media-action-btn primary', text: 'Use' });
        assign.type = 'button';
        assign.disabled = !slot;
        assign.addEventListener('click', function (event) {
          event.stopPropagation();
          if (slot) assignAssetToSlot(slot, asset);
        });
        actions.appendChild(assign);
      }
      if (options.allowBrand) {
        var brand = mkEl('button', { className: 'media-action-btn', text: 'Brand Kit' });
        brand.type = 'button';
        brand.addEventListener('click', function (event) {
          event.stopPropagation();
          assetsState.selectedBrandFilename = asset.filename;
          assetsState.activeTab = 'brand';
          renderAssetsWorkspace();
        });
        actions.appendChild(brand);
      }
      if (options.allowShay) {
        var shay = mkEl('button', { className: 'media-action-btn', text: 'Ask Shay' });
        shay.type = 'button';
        shay.addEventListener('click', function (event) {
          event.stopPropagation();
          askShayFromMedia('Review this asset for Media Studio: ' + (asset.label || asset.filename) + '. Tell me where it fits best and whether it belongs in a slot, Brand Kit, or iteration loop.');
        });
        actions.appendChild(shay);
      }
      body.appendChild(actions);
      card.appendChild(body);

      card.addEventListener('click', function () {
        assetsState.selectedAssetFilename = asset.filename;
        renderAssetsWorkspace();
      });
      card.addEventListener('dblclick', function () {
        if (slot && options.allowAssign) assignAssetToSlot(slot, asset);
      });
      rail.appendChild(card);
    });
    return rail;
  }

  function buildMediaLibraryGrid(selectedAsset) {
    var uploads = filteredUploads();
    var slot = findSlotById(assetsState.selectedSlotId);
    var wrap = mkEl('div', { className: 'media-library-grid-wrap' });
    var meta = mkEl('div', { className: 'media-library-grid-meta' });
    meta.appendChild(mkEl('div', {
      className: 'assets-section-label',
      text: uploads.length + ' visible asset' + (uploads.length === 1 ? '' : 's')
    }));
    meta.appendChild(mkEl('div', {
      className: 'assets-help-text',
      text: slot
        ? 'Selected target: ' + formatSlotName(slot) + '. Click to review, double-click to apply.'
        : 'Choose a slot on the left to make assignment destination-aware.'
    }));
    wrap.appendChild(meta);

    var grid = mkEl('div', { className: 'media-library-gallery' });
    wrap.appendChild(grid);

    if (!uploads.length) {
      grid.appendChild(mkEl('div', {
        className: 'assets-empty-preview media-library-grid-empty',
        text: 'No assets match this view yet. Clear the search, switch filters, or generate something new.'
      }));
      return wrap;
    }

    uploads.forEach(function (asset) {
      var item = mkEl('button', {
        className: 'media-library-card' +
          (selectedAsset && selectedAsset.filename === asset.filename ? ' selected' : '') +
          (slot && asset.role === slot.role ? ' match' : '')
      });
      item.type = 'button';
      item.appendChild(buildMediaThumb(resolveSiteAssetUrl(asset.src), asset.label || asset.filename, 'media-library-card-thumb'));

      var copy = mkEl('div', { className: 'media-library-card-copy' });
      copy.appendChild(mkEl('div', { className: 'media-library-card-name', text: asset.label || asset.filename }));
      copy.appendChild(mkEl('div', {
        className: 'media-library-card-meta',
        text: [asset.role || 'content', asset.asset_class || asset.type || 'image', asset.usage.length ? (asset.usage.length + ' uses') : 'unused'].join(' · ')
      }));
      item.appendChild(copy);

      item.addEventListener('click', function () {
        assetsState.selectedAssetFilename = asset.filename;
        renderAssetsWorkspace();
      });
      item.addEventListener('dblclick', function () {
        if (slot) assignAssetToSlot(slot, asset);
      });
      grid.appendChild(item);
    });
    return wrap;
  }

  function buildSelectedAssetDetail(asset) {
    var wrap = mkEl('div', { className: 'media-selected-detail' });
    wrap.appendChild(mkEl('div', { className: 'assets-section-label', text: 'Selected Asset' }));

    if (!asset) {
      wrap.appendChild(mkEl('div', {
        className: 'assets-empty-preview media-library-grid-empty',
        text: 'Pick an asset from the gallery to review its details and actions.'
      }));
      return wrap;
    }

    wrap.appendChild(buildMediaThumb(resolveSiteAssetUrl(asset.src), asset.label || asset.filename, 'media-selected-detail-image'));
    wrap.appendChild(mkEl('div', { className: 'assets-detail-title media-selected-detail-title', text: asset.label || asset.filename }));
    wrap.appendChild(mkEl('div', {
      className: 'assets-detail-meta',
      text: [asset.role || 'content', asset.asset_class || asset.type || 'image', asset.lifecycle_state || 'uploaded'].join(' · ')
    }));
    if (asset.notes) {
      wrap.appendChild(mkEl('div', { className: 'assets-help-text', text: asset.notes }));
    }

    if (asset.usage && asset.usage.length) {
      var usage = mkEl('div', { className: 'media-selected-usage' });
      usage.appendChild(mkEl('div', { className: 'assets-section-label', text: 'Used In' }));
      asset.usage.slice(0, 4).forEach(function (entry) {
        usage.appendChild(mkEl('div', {
          className: 'assets-help-text',
          text: [entry.page || 'index.html', entry.slot_id || 'slot', entry.provider || 'uploaded'].join(' · ')
        }));
      });
      wrap.appendChild(usage);
    }

    var slot = findSlotById(assetsState.selectedSlotId);
    var actions = mkEl('div', { className: 'assets-action-row' });
    var assignBtn = makeWorkspaceButton(slot ? 'Use In Slot' : 'Select Slot To Use', function () {
      if (slot) assignAssetToSlot(slot, asset);
    }, true);
    assignBtn.disabled = !slot;
    actions.appendChild(assignBtn);
    actions.appendChild(makeWorkspaceButton('Ask Shay', function () {
      askShayFromMedia('Review this asset: ' + (asset.label || asset.filename) + '. Should I use it for the active slot, move it into Brand Kit, or iterate on it?');
    }, false));
    actions.appendChild(makeWorkspaceButton('Open In Brand Kit', function () {
      assetsState.selectedBrandFilename = asset.filename;
      assetsState.activeTab = 'brand';
      renderAssetsWorkspace();
    }, false));
    wrap.appendChild(actions);

    var refine = mkEl('div', { className: 'assets-action-row media-selected-refine-row' });
    refine.appendChild(makeWorkspaceButton('Iterate In Generate', function () {
      assetsState.generation.prompt = 'Create a stronger variation of this asset: ' + (asset.label || asset.filename) + '. Keep the best parts, improve silhouette clarity, and make it feel more FAMtastic and premium.';
      assetsState.activeTab = 'generate';
      renderAssetsWorkspace();
    }, false));
    refine.appendChild(makeWorkspaceButton('Show Me Fit', function () {
      if (window.PipOrb && typeof window.PipOrb.quickShowMe === 'function') {
        window.PipOrb.quickShowMe();
      } else {
        askShayFromMedia('Show me where this asset fits best in Media Studio.');
      }
    }, false));
    wrap.appendChild(refine);
    return wrap;
  }

  function buildBrandKitView() {
    var wrap = mkEl('div', { className: 'assets-workspace-detail' });
    var asset = findAssetByFilename(assetsState.selectedBrandFilename);
    var hero = mkEl('div', { className: 'assets-detail-hero' });
    hero.appendChild(mkEl('div', { className: 'assets-detail-eyebrow', text: 'Brand Kit' }));
    hero.appendChild(mkEl('div', { className: 'assets-detail-title', text: asset ? (asset.label || asset.filename) : 'Brand assets' }));
    hero.appendChild(mkEl('div', {
      className: 'assets-detail-meta',
      text: 'Logos, wordmarks, icon marks, favicon outputs, and export packs stay grouped as a brand surface instead of generic uploads.'
    }));
    wrap.appendChild(hero);

    var card = mkEl('div', { className: 'assets-action-card' });
    card.appendChild(mkEl('div', { className: 'assets-section-label', text: 'Selected asset' }));
    if (asset) {
      card.appendChild(buildMediaThumb(resolveSiteAssetUrl(asset.src), asset.label || asset.filename, 'assets-current-image'));
      card.appendChild(mkEl('div', {
        className: 'assets-help-text',
        text: [asset.asset_class, asset.lifecycle_state, asset.role].filter(Boolean).join(' · ')
      }));
      ['nav-left', 'centered header', 'oversized hero', 'split mark / wordmark', 'footer lockup'].forEach(function (placement) {
        card.appendChild(mkEl('div', { className: 'assets-help-text', text: 'Placement mode: ' + placement }));
      });
    } else {
      card.appendChild(mkEl('div', { className: 'assets-empty-note', text: 'Upload an SVG or logo asset to start the Brand Kit.' }));
    }
    wrap.appendChild(card);

    var outputs = mkEl('div', { className: 'assets-action-card' });
    outputs.appendChild(mkEl('div', { className: 'assets-section-label', text: 'Canonical + derived outputs' }));
    ['Vector master', 'PNG web export', 'App icon / favicon', 'Footer lockup', 'Print pack'].forEach(function (line) {
      outputs.appendChild(mkEl('div', { className: 'assets-help-text', text: line }));
    });
    wrap.appendChild(outputs);
    return wrap;
  }

  function buildQueueHistoryView() {
    var wrap = mkEl('div', { className: 'assets-workspace-detail' });
    var queue = mkEl('div', { className: 'assets-action-card' });
    queue.appendChild(mkEl('div', { className: 'assets-section-label', text: 'Queue / attention' }));
    var pending = (assetsState.slots || []).filter(function (slot) { return slot.status === 'empty'; });
    if (!pending.length) {
      queue.appendChild(mkEl('div', { className: 'assets-help-text', text: 'No empty slots. Media queue is clear.' }));
    } else {
      pending.forEach(function (slot) {
        queue.appendChild(mkEl('div', {
          className: 'assets-help-text',
          text: [formatSlotName(slot), slot.page, slot.role].join(' · ')
        }));
      });
    }
    wrap.appendChild(queue);

    var history = mkEl('div', { className: 'assets-action-card' });
    history.appendChild(mkEl('div', { className: 'assets-section-label', text: 'History' }));
    (assetsState.history || []).slice(0, 10).forEach(function (entry) {
      history.appendChild(mkEl('div', { className: 'assets-help-text', text: entry.title + ' · ' + entry.meta }));
    });
    wrap.appendChild(history);
    return wrap;
  }

  function buildProviderView() {
    var wrap = mkEl('div', { className: 'assets-workspace-detail' });
    var usage = assetsState.usageSummary || {};
    var providers = usage.by_provider || {};
    var capabilities = assetsState.capabilities || {};
    var card = mkEl('div', { className: 'assets-action-card' });
    card.appendChild(mkEl('div', { className: 'assets-section-label', text: 'Provider truth' }));
    card.appendChild(mkEl('div', {
      className: 'assets-help-text',
      text: 'Keep provider complexity compact by default, but surface cost, speed, and recommendations here when you need them.'
    }));
    Object.keys(providers).forEach(function (name) {
      var data = providers[name];
      card.appendChild(mkEl('div', {
        className: 'assets-help-text',
        text: [name, String(data.operations || 0) + ' ops', '$' + Number(data.cost || 0).toFixed(2), (data.avg_speed_seconds || 0) + 's avg'].join(' · ')
      }));
    });
    if (!Object.keys(providers).length) {
      card.appendChild(mkEl('div', { className: 'assets-empty-note', text: 'No provider telemetry yet.' }));
    }
    ['claude_api', 'gemini_api', 'openai_api'].forEach(function (key) {
      card.appendChild(mkEl('div', {
        className: 'assets-help-text',
        text: humanizeLabel(key) + ': ' + humanizeLabel(capabilities[key] || 'unavailable')
      }));
    });
    wrap.appendChild(card);

    var recs = mkEl('div', { className: 'assets-action-card' });
    recs.appendChild(mkEl('div', { className: 'assets-section-label', text: 'Recommendations' }));
    var recommendations = usage.recommendations || [];
    if (!recommendations.length) {
      recs.appendChild(mkEl('div', { className: 'assets-help-text', text: 'No provider recommendations yet.' }));
    } else {
      recommendations.forEach(function (rec) {
        recs.appendChild(mkEl('div', { className: 'assets-help-text', text: rec.message || JSON.stringify(rec) }));
      });
    }
    wrap.appendChild(recs);

    var gaps = mkEl('div', { className: 'assets-action-card' });
    gaps.appendChild(mkEl('div', { className: 'assets-section-label', text: 'Current gaps' }));
    gaps.appendChild(mkEl('div', {
      className: 'assets-help-text',
      text: 'Direct video generation is not wired yet, and provider switching is still more visible than fully routable in the current Media UI.'
    }));
    wrap.appendChild(gaps);
    return wrap;
  }

  function renderProviderRecommendations(grid) {
    var recommendations = ((assetsState.usageSummary || {}).recommendations) || [];
    if (!recommendations.length) {
      grid.appendChild(mkEl('div', { className: 'assets-empty-note', text: 'No provider recommendations yet.' }));
      return;
    }
    recommendations.forEach(function (rec) {
      var item = mkEl('div', { className: 'assets-action-card' });
      item.appendChild(mkEl('div', { className: 'assets-section-label', text: rec.type || 'recommendation' }));
      item.appendChild(mkEl('div', { className: 'assets-help-text', text: rec.message || JSON.stringify(rec) }));
      grid.appendChild(item);
    });
  }

  function renderHistorySummaryGrid(grid) {
    var history = assetsState.history || [];
    if (!history.length) {
      grid.appendChild(mkEl('div', { className: 'assets-empty-note', text: 'No history yet.' }));
      return;
    }
    history.slice(0, 8).forEach(function (entry) {
      var item = mkEl('div', { className: 'assets-action-card' });
      item.appendChild(mkEl('div', { className: 'assets-section-label', text: entry.kind }));
      item.appendChild(mkEl('div', { className: 'assets-help-text', text: entry.title }));
      item.appendChild(mkEl('div', { className: 'assets-help-text', text: entry.meta }));
      grid.appendChild(item);
    });
  }

  function handleAssetUpload(file, roleOverride) {
    var formData = new FormData();
    formData.append('file', file);
    formData.append('role', roleOverride || 'content');
    formData.append('label', file.name);

    showAssetsFeedback('Uploading ' + file.name + '...', 'info');
    fetch('/api/upload', { method: 'POST', body: formData })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (data && data.error) throw new Error(data.error);
        if (data && data.asset && data.asset.filename) {
          assetsState.selectedAssetFilename = data.asset.filename;
          if ((roleOverride || 'content') === 'logo') assetsState.selectedBrandFilename = data.asset.filename;
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

  function resolveGenerationSlot() {
    if (assetsState.generation.destination === 'empty-slot') {
      return (assetsState.slots || []).find(function (slot) { return slot.status === 'empty'; }) || null;
    }
    return findSlotById(assetsState.selectedSlotId);
  }

  function buildMediaHistory(slots, uploads) {
    var history = [];
    (slots || []).forEach(function (slot) {
      if (slot.mapping && slot.mapping.src) {
        history.push({
          kind: slot.mapping.provider === 'stock' ? 'generated' : 'assigned',
          title: formatSlotName(slot),
          meta: [slot.page, slot.mapping.provider || slot.status || 'mapped'].filter(Boolean).join(' · ')
        });
      }
    });
    (uploads || []).forEach(function (asset) {
      history.push({
        kind: 'upload',
        title: asset.label || asset.filename,
        meta: [asset.role || 'content', asset.uploaded_at ? new Date(asset.uploaded_at).toLocaleDateString() : ''].filter(Boolean).join(' · ')
      });
    });
    return history.slice(0, 30);
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

  function openSlotEditor(slotId, opts) {
    opts = opts || {};
    assetsState.selectedSlotId = slotId || assetsState.selectedSlotId;
    assetsState.returnContext = opts.returnContext || null;
    assetsState.activeTab = opts.tabId || 'library';
    mountOnce('assets', mountAssets);
    refreshAssetsWorkspace();
  }

  function openComponentsWorkspace(componentId, selection) {
    componentState.selectedComponentId = componentId || componentState.selectedComponentId;
    componentState.selection = selection || findCurrentSelection();
    mountOnce('components', mountComponents);
    refreshComponentsWorkspace();
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
    return humanizeLabel(slot.slot_id || 'image-slot');
  }

  function defaultStockQuery(slot) {
    if (!slot) return '';
    if (slot.mapping && slot.mapping.query) return slot.mapping.query;
    return [assetsState.siteTag ? assetsState.siteTag.replace(/^site-/, '').replace(/-/g, ' ') : '', slot.role || '', formatSlotName(slot)]
      .join(' ')
      .trim();
  }

  function buildWorkspaceTabRow(activeTab, items, onChange) {
    var row = mkEl('div', { className: 'workspace-subtabs' });
    items.forEach(function (item) {
      var btn = mkEl('button', {
        className: 'workspace-subtab' + (item.id === activeTab ? ' active' : ''),
        text: item.label
      });
      btn.type = 'button';
      btn.addEventListener('click', function () { onChange(item.id); });
      row.appendChild(btn);
    });
    return row;
  }

  function buildPromptChipRow(items) {
    var row = mkEl('div', { className: 'media-filter-row media-recipe-row' });
    items.forEach(function (item) {
      var btn = mkEl('button', { className: 'media-filter-btn media-recipe-chip', text: item.label });
      btn.type = 'button';
      btn.addEventListener('click', function () {
        assetsState.generation.prompt = item.value;
        if (item.patch) Object.assign(assetsState.generation, item.patch);
        renderAssetsWorkspace();
      });
      row.appendChild(btn);
    });
    return row;
  }

  function makeWorkspaceButton(label, onClick, primary) {
    var btn = mkEl('button', { className: 'media-action-btn' + (primary ? ' primary' : ''), text: label });
    btn.type = 'button';
    btn.addEventListener('click', onClick);
    return btn;
  }

  function buildSelectControl(label, currentValue, options, onChange) {
    var wrap = mkEl('label', { className: 'workspace-select-control' });
    wrap.appendChild(mkEl('span', { className: 'assets-section-label', text: label }));
    var select = document.createElement('select');
    select.className = 'workspace-select';
    options.forEach(function (option) {
      var node = document.createElement('option');
      node.value = option.value;
      node.textContent = option.label;
      node.selected = option.value === currentValue;
      select.appendChild(node);
    });
    select.addEventListener('change', function () { onChange(select.value); });
    wrap.appendChild(select);
    return wrap;
  }

  function buildGenerationPrompt(slot) {
    var prompt = String(assetsState.generation.prompt || '').trim();
    if (!prompt) prompt = defaultStockQuery(slot);
    var extras = [];
    if (assetsState.generation.styleIntent && assetsState.generation.styleIntent !== 'bold') {
      extras.push('style intent: ' + assetsState.generation.styleIntent);
    }
    if (assetsState.generation.motionIntent && assetsState.generation.motionIntent !== 'none') {
      extras.push('design for subtle motion cue: ' + assetsState.generation.motionIntent);
    }
    if (assetsState.generation.quality) {
      extras.push('quality intent: ' + assetsState.generation.quality);
    }
    if (assetsState.generation.providerMode && assetsState.generation.providerMode !== 'auto') {
      extras.push('preferred route: ' + assetsState.generation.providerMode);
    }
    return [prompt].concat(extras).join('. ');
  }

  function applyMediaGenerationPreset(preset) {
    preset = preset || {};
    assetsState.activeTab = 'generate';
    if (preset.assetType) assetsState.generation.assetType = preset.assetType;
    if (preset.prompt) assetsState.generation.prompt = preset.prompt;
    if (preset.motionIntent) assetsState.generation.motionIntent = preset.motionIntent;
    if (preset.styleIntent) assetsState.generation.styleIntent = preset.styleIntent;
    mountOnce('assets', mountAssets);
    renderAssetsWorkspace();
  }

  function routeMotionPassToBuild() {
    if (!window.ws || window.ws.readyState !== WebSocket.OPEN) {
      showAssetsFeedback('Studio chat is not connected yet.', 'error');
      return;
    }
    var message = 'Add a subtle motion pass to the current page: restrained reveal transitions, premium hover lift, and calm accent motion. Keep animation minimal and tasteful.';
    if (assetsState.generation.motionIntent && assetsState.generation.motionIntent !== 'none') {
      message = 'Add a ' + assetsState.generation.motionIntent + ' motion pass to the current page. Keep it subtle, premium, and lightweight.';
    }
    window.ws.send(JSON.stringify({ type: 'chat', content: message }));
    if (window.addMessage) window.addMessage('user', message);
    if (window.StudioShell) StudioShell.switchTab('chat');
  }

  function generateStandaloneAsset() {
    var description = buildGenerationPrompt(findSlotById(assetsState.selectedSlotId));
    showAssetsFeedback('Generating ' + assetsState.generation.assetType + '...', 'info');
    fetch('/api/media/generate-asset', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        asset_type: assetsState.generation.assetType,
        description: description
      })
    }).then(function (r) { return r.json(); })
      .then(function (data) {
        if (!data || data.error) throw new Error((data && data.error) || 'Asset generation failed');
        showAssetsFeedback('Generated ' + data.asset_type + ' asset.', 'success');
        refreshAssetsWorkspace();
        if (typeof window.reloadPreview === 'function') window.reloadPreview();
      })
      .catch(function (err) {
        showAssetsFeedback('Could not generate asset: ' + err.message, 'error');
      });
  }

  function mediaTabLabel(tabId) {
    var labels = {
      home: 'Create',
      library: 'Library',
      generate: 'Image',
      motion: 'Motion',
      brand: 'Brand',
      queue: 'Queue / History',
      provider: 'Providers'
    };
    return labels[tabId] || humanizeLabel(tabId);
  }

  function getMediaNavItems() {
    return [
      { id: 'home', label: 'Create', sub: 'Prompt-first landing screen with one major function per row.' },
      { id: 'generate', label: 'Image', sub: 'Focused image generation for icons, logos, hero art, and slot fills.' },
      { id: 'motion', label: 'Motion', sub: 'Separate surface for video, motion planning, and what is not wired yet.' },
      { id: 'library', label: 'Library', sub: 'Browse existing uploads and apply them with less clutter.' },
      { id: 'brand', label: 'Brand', sub: 'Keep logo marks, lockups, favicons, and exports together.' },
      { id: 'queue', label: 'Queue / History', sub: 'See what still needs attention and what was generated.' },
      { id: 'provider', label: 'Providers', sub: 'Inspect API state, routing truth, and what is actually wired.' }
    ];
  }

  function syncMediaOverflowCue() {
    var detail = assetsRefs.detail;
    if (!detail) return;
    var cue = detail.querySelector('.media-scroll-cue');
    if (!cue) {
      cue = mkEl('div', { className: 'media-scroll-cue', text: 'Scroll for more' });
      detail.appendChild(cue);
    }
    var overflow = detail.scrollHeight > detail.clientHeight + 12;
    var nearBottom = detail.scrollTop + detail.clientHeight >= detail.scrollHeight - 20;
    cue.classList.toggle('visible', overflow && !nearBottom && detail.dataset.userScrolled !== 'true');
    if (!detail.__mediaCueBound) {
      detail.addEventListener('scroll', function () {
        detail.dataset.userScrolled = 'true';
        var currentCue = detail.querySelector('.media-scroll-cue');
        if (currentCue) currentCue.classList.remove('visible');
      });
      detail.__mediaCueBound = true;
    }
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
    var subs   = { platform: 'API keys and Studio preferences. Never version-controlled.', workspace: 'Build defaults and feature flags. Committed with the repo.', site: 'Domain, deploy target, brand config for the active site.', assistant: 'Shay behavior, Developer Mode trust, scoped writes, and audit visibility.' };

    container.appendChild(mkEl('div', { className: 'settings-section-title', text: titles[tier] }));
    container.appendChild(mkEl('div', { className: 'settings-section-sub',   text: subs[tier] }));

    fetch('/api/settings').then(function (r) { return r.json(); }).then(function (settings) {
      var saveAction = null;
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
        saveAction = renderAssistantSettings(container, settings);
      }

      var saveBtn = mkEl('button', { className: 'settings-save-btn', text: 'Save changes' });
      saveBtn.addEventListener('click', function () {
        if (!saveAction) {
          saveBtn.textContent = 'Saved!';
          saveBtn.style.background = 'var(--fam-green)';
          setTimeout(function () { saveBtn.textContent = 'Save changes'; saveBtn.style.background = ''; }, 2000);
          return;
        }
        saveBtn.disabled = true;
        saveBtn.textContent = 'Saving...';
        saveAction().then(function () {
          saveBtn.textContent = 'Saved!';
          saveBtn.style.background = 'var(--fam-green)';
          if (typeof window.loadShaySessionInit === 'function') window.loadShaySessionInit();
          setTimeout(function () {
            saveBtn.disabled = false;
            saveBtn.textContent = 'Save changes';
            saveBtn.style.background = '';
          }, 1800);
        }).catch(function (err) {
          saveBtn.disabled = false;
          saveBtn.textContent = err && err.message ? err.message : 'Save failed';
          saveBtn.style.background = 'var(--fam-red)';
          setTimeout(function () {
            saveBtn.textContent = 'Save changes';
            saveBtn.style.background = '';
          }, 2400);
        });
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
    return toggle;
  }

  function renderSelectField(container, label, options, currentValue, onChange, hint) {
    var field = mkEl('div', { className: 'settings-field' });
    var labelEl = mkEl('div', { className: 'settings-label', text: label });
    if (hint) labelEl.appendChild(mkEl('span', { className: 'settings-hint', text: hint }));
    field.appendChild(labelEl);
    var select = document.createElement('select');
    select.className = 'settings-input';
    options.forEach(function (option) {
      var node = document.createElement('option');
      node.value = option.value;
      node.textContent = option.label;
      node.selected = option.value === currentValue;
      select.appendChild(node);
    });
    select.addEventListener('change', function () { onChange(select.value); });
    field.appendChild(select);
    container.appendChild(field);
    return select;
  }

  function renderTextareaField(container, label, value, onChange, hint) {
    var field = mkEl('div', { className: 'settings-field' });
    var labelEl = mkEl('div', { className: 'settings-label', text: label });
    if (hint) labelEl.appendChild(mkEl('span', { className: 'settings-hint', text: hint }));
    field.appendChild(labelEl);
    var input = document.createElement('textarea');
    input.className = 'settings-input settings-textarea';
    input.value = value || '';
    input.rows = 5;
    input.placeholder = '/Users/famtasticfritz/famtastic/sites\n/Users/famtasticfritz/famtastic/components';
    input.addEventListener('input', function () { onChange(input.value); });
    field.appendChild(input);
    container.appendChild(field);
    return input;
  }

  function renderAuditList(container, entries) {
    var card = mkEl('div', { className: 'settings-audit-card' });
    card.appendChild(mkEl('div', { className: 'settings-section-title', text: 'Developer Audit' }));
    card.appendChild(mkEl('div', {
      className: 'settings-section-sub',
      text: 'Every Shay write/build trigger is recorded here. Observe-only and blocked attempts are logged too.'
    }));
    if (!entries || !entries.length) {
      card.appendChild(mkEl('div', { className: 'assets-empty-note', text: 'No Developer Mode audit entries yet.' }));
      container.appendChild(card);
      return;
    }
    entries.slice(0, 8).forEach(function (entry) {
      var row = mkEl('div', { className: 'settings-audit-row' });
      row.appendChild(mkEl('div', {
        className: 'settings-audit-title',
        text: [entry.event || 'event', entry.status || 'status'].filter(Boolean).join(' · ')
      }));
      row.appendChild(mkEl('div', {
        className: 'settings-audit-meta',
        text: [entry.timestamp ? new Date(entry.timestamp).toLocaleString() : '', entry.target_site_tag || entry.site_tag || '', entry.trust_mode || ''].filter(Boolean).join(' · ')
      }));
      card.appendChild(row);
    });
    container.appendChild(card);
  }

  function renderDeveloperModeSettings(container, settings) {
    var dev = Object.assign({
      enabled: true,
      trust_mode: 'apply_with_approval',
      approved_paths: ['/Users/famtasticfritz/famtastic'],
      require_explicit_approval: true,
      allow_deploy_triggers: false,
      audit_log_limit: 200
    }, (settings && settings.developer_mode) || {});

    var trustCard = mkEl('div', { className: 'settings-devmode-card' });
    trustCard.appendChild(mkEl('div', { className: 'settings-section-title', text: 'Shay Developer Mode' }));
    trustCard.appendChild(mkEl('div', {
      className: 'settings-section-sub',
      text: 'Optional capability for repo/path writes. Off by default, scoped to approved paths, and never outside the audit trail.'
    }));
    container.appendChild(trustCard);

    var enabledToggle = renderToggleField(trustCard, 'Developer Mode enabled', dev.enabled);
    enabledToggle.addEventListener('click', function () {
      dev.enabled = !dev.enabled;
    });

    renderSelectField(trustCard, 'Trust mode', [
      { value: 'observe_only', label: 'Observe only' },
      { value: 'propose_changes', label: 'Propose changes' },
      { value: 'apply_with_approval', label: 'Apply with approval' },
      { value: 'trusted_auto_apply', label: 'Trusted auto-apply' }
    ], dev.trust_mode, function (value) { dev.trust_mode = value; }, 'Make the current trust truth explicit.');

    renderTextareaField(trustCard, 'Approved write paths', Array.isArray(dev.approved_paths) ? dev.approved_paths.join('\n') : '', function (value) {
      dev.approved_paths = String(value || '').split('\n').map(function (line) { return line.trim(); }).filter(Boolean);
    }, 'One absolute path per line. Shay writes only inside these scopes.');

    var approvalToggle = renderToggleField(trustCard, 'Require explicit approval for apply actions', dev.require_explicit_approval !== false);
    approvalToggle.addEventListener('click', function () {
      dev.require_explicit_approval = !dev.require_explicit_approval;
    });

    var deployToggle = renderToggleField(trustCard, 'Allow deploy triggers from Developer Mode', dev.allow_deploy_triggers === true);
    deployToggle.addEventListener('click', function () {
      dev.allow_deploy_triggers = !dev.allow_deploy_triggers;
    });

    renderTextField(trustCard, 'Audit log limit', String(dev.audit_log_limit || 200));
    trustCard.querySelector('.settings-field:last-of-type .settings-input').addEventListener('input', function (event) {
      dev.audit_log_limit = Number(event.target.value) || 200;
    });

    fetch('/api/shay-shay/developer-mode/audit?limit=8').then(function (r) { return r.json(); }).then(function (data) {
      renderAuditList(container, (data && data.entries) || []);
    }).catch(function () {});

    return function saveDeveloperMode() {
      return fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          developer_mode: {
            enabled: dev.enabled === true,
            trust_mode: dev.trust_mode,
            approved_paths: dev.approved_paths,
            require_explicit_approval: dev.require_explicit_approval !== false,
            allow_deploy_triggers: dev.allow_deploy_triggers === true,
            audit_log_limit: Number(dev.audit_log_limit) || 200
          }
        })
      }).then(function (r) { return r.json(); }).then(function (data) {
        if (data && data.error) throw new Error(data.error);
        return data;
      });
    };
  }

  function renderAssistantSettings(container, settings) {
    var lite = Object.assign({
      identity_mode: 'character',
      default_identity_mode: 'character',
      remember_last_identity: true,
      proactive_behavior: 'context_nudges',
      allow_proactive_messages: true,
      event_reaction_intensity: 'balanced',
      character_style: 'default',
      character_variant: 'shay-default'
    }, (settings && settings.shay_lite_settings) || {});

    var liteCard = mkEl('div', { className: 'settings-devmode-card' });
    liteCard.appendChild(mkEl('div', { className: 'settings-section-title', text: 'Shay Lite' }));
    liteCard.appendChild(mkEl('div', {
      className: 'settings-section-sub',
      text: 'Lite identities are mutually exclusive. Character is the default, Classic Orb stays preserved as fallback, and Mini Panel keeps quick ask open.'
    }));
    container.appendChild(liteCard);

    renderSelectField(liteCard, 'Active identity', [
      { value: 'character', label: 'Character Default' },
      { value: 'orb_classic', label: 'Classic Orb' },
      { value: 'mini_panel', label: 'Mini Panel' }
    ], lite.identity_mode, function (value) { lite.identity_mode = value; });

    renderSelectField(liteCard, 'First-run default', [
      { value: 'character', label: 'Character Default' },
      { value: 'orb_classic', label: 'Classic Orb' },
      { value: 'mini_panel', label: 'Mini Panel' }
    ], lite.default_identity_mode, function (value) { lite.default_identity_mode = value; });

    var rememberToggle = renderToggleField(liteCard, 'Remember last identity', lite.remember_last_identity !== false);
    rememberToggle.addEventListener('click', function () {
      lite.remember_last_identity = !lite.remember_last_identity;
    });

    renderSelectField(liteCard, 'Proactive behavior', [
      { value: 'off', label: 'Off' },
      { value: 'context_nudges', label: 'Context nudges' },
      { value: 'active_assist', label: 'Active assist' }
    ], lite.proactive_behavior, function (value) { lite.proactive_behavior = value; });

    var proactiveToggle = renderToggleField(liteCard, 'Allow proactive messages', lite.allow_proactive_messages !== false);
    proactiveToggle.addEventListener('click', function () {
      lite.allow_proactive_messages = !lite.allow_proactive_messages;
    });

    renderSelectField(liteCard, 'Event reaction intensity', [
      { value: 'quiet', label: 'Quiet' },
      { value: 'balanced', label: 'Balanced' },
      { value: 'expressive', label: 'Expressive' }
    ], lite.event_reaction_intensity, function (value) { lite.event_reaction_intensity = value; });

    renderTextField(liteCard, 'Character style', lite.character_style || 'default');
    liteCard.querySelector('.settings-field:last-of-type .settings-input').addEventListener('input', function (event) {
      lite.character_style = event.target.value || 'default';
    });
    renderTextField(liteCard, 'Character variant', lite.character_variant || 'shay-default');
    liteCard.querySelector('.settings-field:last-of-type .settings-input').addEventListener('input', function (event) {
      lite.character_variant = event.target.value || 'shay-default';
    });

    var saveDeveloperMode = renderDeveloperModeSettings(container, settings);

    return function saveAssistantSettings() {
      return Promise.all([
        saveDeveloperMode(),
        fetch('/api/settings', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ shay_lite_settings: lite })
        }).then(function (r) { return r.json(); }).then(function (data) {
          if (data && data.error) throw new Error(data.error);
          window.dispatchEvent(new CustomEvent('studio:shay-lite-settings-updated', { detail: lite }));
          return data;
        })
      ]);
    };
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
        if (tabId === 'components') {
          mountOnce('components', mountComponents);
          setTimeout(refreshComponentsWorkspace, 40);
        }
        if (tabId === 'assets') {
          mountOnce('assets', mountAssets);
          setTimeout(refreshAssetsWorkspace, 40);
        }
        if (tabId === 'mc') mountOnce('mc', mountMCTab);
        if (tabId === 'deploy') mountOnce('deploy', mountDeploy);
      };
    }

    // Also watch for click on tab buttons
    document.addEventListener('click', function (e) {
      var btn = e.target.closest && e.target.closest('.ws-tab');
      if (!btn) return;
      var tabId = btn.dataset.tabId;
      if (tabId === 'components') setTimeout(function () {
        mountOnce('components', mountComponents);
        refreshComponentsWorkspace();
      }, 80);
      if (tabId === 'assets') setTimeout(function () {
        mountOnce('assets', mountAssets);
        refreshAssetsWorkspace();
      }, 80);
      if (tabId === 'mc') setTimeout(function () { mountOnce('mc', mountMCTab); }, 80);
      if (tabId === 'deploy') setTimeout(function () { mountOnce('deploy', mountDeploy); }, 80);
    });

    window.addEventListener('studio:site-changed', function () {
      if (mounted.components) setTimeout(refreshComponentsWorkspace, 80);
      if (mounted.assets) setTimeout(refreshAssetsWorkspace, 80);
    });

    window.addEventListener('studio:workspace-chrome', function (event) {
      var detail = (event && event.detail) || {};
      if (assetsRefs.pane) {
        assetsRefs.pane.dataset.sidebarVisible = detail.sidebar_visible ? 'true' : 'false';
        assetsRefs.pane.dataset.inspectorOpen = detail.inspector_open ? 'true' : 'false';
        assetsRefs.pane.dataset.workspaceLayout = detail.workspace_layout || 'compose';
      }
    });

    window.addEventListener('studio:open-slot', function (event) {
      var detail = (event && event.detail) || {};
      openSlotEditor(detail.slotId, { returnContext: detail.returnContext || null });
    });

    window.addEventListener('studio:open-component', function (event) {
      var detail = (event && event.detail) || {};
      openComponentsWorkspace(detail.componentId || null, detail.selection || null);
    });

    // Open settings modal with new content
    var origOpenSettings = window.openSettings;
    window.openSettings = function () {
      if (origOpenSettings) origOpenSettings();
      setTimeout(mountSettingsScreen, 50);
    };

    // Expose MC
    window.openMissionControl = function () {
      if (window.StudioShell) StudioShell.switchTab('mc');
      setTimeout(function () { mountOnce('mc', mountMCTab); }, 100);
    };
  });

  window.StudioScreens = {
    mountComponents: mountComponents,
    mountAssets: mountAssets,
    mountDeploy: mountDeploy,
    mountMCTab: mountMCTab,
    mountSettingsScreen: mountSettingsScreen,
    openComponentsWorkspace: openComponentsWorkspace,
    openMediaGenerateWithPreset: applyMediaGenerationPreset,
    openSlotEditor: openSlotEditor,
    getWorkspaceState: function () {
      return {
        mounted: Object.assign({}, mounted),
        components: {
          site_tag: componentState.siteTag,
          active_tab: componentState.activeTab,
          selected_component_id: componentState.selectedComponentId,
          library_count: (componentState.library || []).length,
          selection: componentState.selection || null,
        },
        assets: {
          site_tag: assetsState.siteTag,
          active_tab: assetsState.activeTab,
          selected_slot_id: assetsState.selectedSlotId,
          selected_asset_filename: assetsState.selectedAssetFilename,
          selected_brand_filename: assetsState.selectedBrandFilename,
          search: assetsState.search,
          role_filter: assetsState.roleFilter,
          return_context: assetsState.returnContext || null,
          slot_count: (assetsState.slots || []).length,
          upload_count: (assetsState.uploads || []).length,
          empty_slot_count: (assetsState.slots || []).filter(function (slot) { return slot.status === 'empty'; }).length,
          history_count: (assetsState.history || []).length,
          generation: Object.assign({}, assetsState.generation),
        }
      };
    }
  };
})();
