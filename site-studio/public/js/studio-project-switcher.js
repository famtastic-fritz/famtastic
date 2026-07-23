(function () {
  window.allProjects = window.allProjects || [];

  window.restartServer = function restartServer() {
    fetch('/api/restart', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Origin': window.location.origin } })
      .then(function() { window.addMessage('assistant', 'Server restarting…'); })
      .catch(function() {});
  };

  window.toggleProjectPicker = function toggleProjectPicker() {
    var picker = document.getElementById('project-picker');
    if (!picker) return;
    if (picker.style.display === 'none' || !picker.style.display) {
      picker.style.display = 'flex';
      window.loadProjects();
      var searchEl = document.getElementById('project-search');
      if (searchEl) searchEl.focus();
    } else {
      picker.style.display = 'none';
    }
  };

  window.loadProjects = function loadProjects() {
    fetch('/api/sites').then(function(r) { return r.json(); }).then(function(data) {
      window.allProjects = data.sites || data || [];
      window.renderProjectList(window.allProjects);
    }).catch(function() {});
  };

  window.renderProjectList = function renderProjectList(projects) {
    var list = document.getElementById('project-list');
    var empty = document.getElementById('project-empty');
    if (!list) return;
    while (list.firstChild) list.removeChild(list.firstChild);
    if (!projects.length) {
      if (empty) empty.style.display = '';
      return;
    }
    if (empty) empty.style.display = 'none';
    projects.forEach(function(site) {
      var tag = site.tag || site;
      var name = site.site_name || tag;
      var div = document.createElement('div');
      div.style.cssText = 'display:flex;align-items:center;gap:6px;padding:5px 6px;border-radius:4px;cursor:pointer;font-size:12px;';
      div.onmouseenter = function() { div.style.background = 'rgba(255,255,255,0.05)'; };
      div.onmouseleave = function() { div.style.background = ''; };
      var dot = document.createElement('span');
      var isDeployed = site.deployed_url;
      var isBuilt = site.state === 'built';
      dot.style.cssText = 'width:7px;height:7px;border-radius:50%;background:' + (isDeployed ? 'var(--fam-purple)' : isBuilt ? 'var(--fam-green)' : 'var(--fam-gold)') + ';flex-shrink:0;';
      div.appendChild(dot);
      var labelEl = document.createElement('span');
      labelEl.textContent = name;
      labelEl.style.cssText = 'flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--fam-text);';
      div.appendChild(labelEl);
      var delBtn = document.createElement('span');
      delBtn.textContent = '×';
      delBtn.style.cssText = 'color:rgba(232,53,42,0.4);font-size:14px;opacity:0;transition:opacity 0.1s;';
      delBtn.onmouseenter = function() { delBtn.style.opacity = '1'; };
      delBtn.onmouseleave = function() { delBtn.style.opacity = '0'; };
      var tagCaptured = tag;
      delBtn.onclick = function(e) { e.stopPropagation(); window.deleteProject(tagCaptured); };
      div.appendChild(delBtn);
      div.onclick = function() { window.switchSite(tagCaptured); };
      list.appendChild(div);
    });
  };

  window.filterProjects = function filterProjects() {
    var q = (document.getElementById('project-search') || {}).value || '';
    q = q.toLowerCase();
    window.renderProjectList(window.allProjects.filter(function(s) {
      var tag = (s.tag || s + '').toLowerCase();
      var name = (s.site_name || '').toLowerCase();
      return tag.indexOf(q) !== -1 || name.indexOf(q) !== -1;
    }));
  };

  window.showNewSiteDialog = function showNewSiteDialog() {
    if (window.StudioShell) StudioShell.switchTab('brief');
    setTimeout(function () {
      if (window.StudioBrief) StudioBrief.mountFresh();
    }, 80);
  };

  window.hideNewSiteDialog = function hideNewSiteDialog() {};

  window.createNewProject = function createNewProject() {
    var input = document.getElementById('new-project-tag');
    var tag = input ? input.value.trim() : '';
    if (!tag) { if (input) input.focus(); return; }
    fetch('/api/new-site', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Origin': window.location.origin }, body: JSON.stringify({ tag: tag }) })
      .then(function(r) { return r.json(); })
      .then(function(data) {
        if (data.tag) { window.hideNewSiteDialog(); window.switchSite(data.tag); }
        else window.addMessage('error', data.error || 'Create failed');
      }).catch(function(e) { window.addMessage('error', 'Error: ' + e.message); });
  };

  window.deleteProject = function deleteProject(tag) {
    if (!confirm('Delete site "' + tag + '"? This cannot be undone.')) return;
    fetch('/api/projects/' + encodeURIComponent(tag), { method: 'DELETE' })
      .then(function(r) { return r.json(); }).then(function(data) {
        if (data.success || data.deleted) {
          window.addMessage('status', 'Deleted ' + tag);
          window.loadProjects();
        } else window.addMessage('error', data.error || 'Delete failed');
      }).catch(function(e) { window.addMessage('error', 'Error: ' + e.message); });
  };

  window.switchSite = function switchSite(tag) {
    var picker = document.getElementById('project-picker');
    if (picker) picker.style.display = 'none';
    fetch('/api/switch-site', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tag: tag }) })
      .then(function(r) { return r.json(); })
      .then(function(data) {
        if (data.error) window.addMessage('error', data.error);
      }).catch(function() {});
  };

  window.handleSiteSwitch = function handleSiteSwitch(tag, pages, currentPage) {
    window.addChatSessionBreak(tag);
    window.config.tag = tag;
    document.title = 'Site Studio — ' + tag;
    try {
      var pf = document.getElementById('preview-frame');
      if (pf && window.config.previewPort) {
        pf.src = 'http://localhost:' + window.config.previewPort + '/' + (currentPage || 'index.html') + '?_switch=' + Date.now();
      }
    } catch (e) {}
    var topBtn = document.getElementById('top-bar-site-btn');
    if (topBtn) topBtn.textContent = tag + ' ▾';
    var sideBtn = document.getElementById('site-tag');
    if (sideBtn) sideBtn.textContent = tag + ' ▾';
    var ctxSite = document.getElementById('ctx-site-tag');
    if (ctxSite) ctxSite.textContent = tag;
    if (pages) window.updatePageTabs(pages, currentPage);
    window.navigateToPage(currentPage || 'index.html');
    window.loadPages();
    fetch('/api/studio-state').then(function(r) { return r.json(); }).then(window.updateEnvironmentBar).catch(function() {});
    window.loadShaySessionInit();
    window.dispatchEvent(new CustomEvent('studio:site-changed', { detail: { tag: tag, pages: pages } }));
    fetch('/api/interview/status')
      .then(function (r) { return r.json(); })
      .then(function (d) {
        if (d && !d.completed && window.StudioShell) {
          StudioShell.switchTab('brief');
          setTimeout(function () { if (window.StudioBrief) StudioBrief.mount(); }, 100);
        }
      }).catch(function () {});
  };

  window.refreshAssetBar = function refreshAssetBar() {
    fetch('/api/uploads').then(function(r) { return r.json(); }).then(function(data) {
      var assets = data.uploads || data || [];
      var list = document.getElementById('sidebar-assets-list');
      if (!list) return;
      while (list.firstChild) list.removeChild(list.firstChild);
      if (!assets.length) {
        var empty = document.createElement('div');
        empty.style.cssText = 'padding:8px 12px;font-size:11px;color:var(--fam-text-3);';
        empty.textContent = 'No assets yet.';
        list.appendChild(empty);
        return;
      }
      assets.forEach(function(a) {
        var item = document.createElement('div');
        item.className = 'sidebar-item';
        item.textContent = a.filename || a;
        list.appendChild(item);
      });
    }).catch(function() {});
  };

  window.addAssetPreview = function addAssetPreview() {
    window.refreshAssetBar();
  };
})();
