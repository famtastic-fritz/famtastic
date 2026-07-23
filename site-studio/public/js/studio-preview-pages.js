(function () {
  window.buildPreviewUrl = function buildPreviewUrl(page) {
    var targetPage = page || window.activePage || 'index.html';
    var cacheBust = '?t=' + Date.now();
    if (window.slotModeActive) return '/slot-preview/' + targetPage + cacheBust;
    return 'http://localhost:' + window.config.previewPort + '/' + targetPage + cacheBust;
  };

  window.reloadPreview = function reloadPreview() {
    var frame = document.getElementById('preview-frame');
    if (!frame) return;
    frame.src = window.buildPreviewUrl(window.activePage);
    if (typeof window.refreshStudioPanel === 'function') window.refreshStudioPanel();
  };

  window.navigateToPage = function navigateToPage(page, opts) {
    opts = opts || {};
    var frame = document.getElementById('preview-frame');
    if (!frame || !window.config.previewPort) return;
    frame.src = window.buildPreviewUrl(page);
    window.activePage = page;
    var pageEl = document.getElementById('ctx-active-page');
    if (pageEl) pageEl.textContent = page;
    window.renderPageTabs();
    if (window.updatePageTabs) window.updatePageTabs(window.sitePages, page);
    if (opts.switchToPreview !== false) window.setViewMode('preview');
    window.dispatchEvent(new CustomEvent('studio:page-selected', { detail: { page: page, source: opts.source || 'navigation' } }));
  };

  window.setPreviewDevice = function setPreviewDevice(device) {
    var frame = document.getElementById('preview-frame');
    if (!frame) return;
    if (device === 'mobile') {
      frame.style.maxWidth = '375px';
      frame.style.margin = '0 auto';
      frame.style.display = 'block';
    } else {
      frame.style.maxWidth = '';
      frame.style.margin = '';
      frame.style.display = '';
    }
    var desktopBtn = document.getElementById('preview-device-desktop');
    var mobileBtn = document.getElementById('preview-device-mobile');
    if (desktopBtn) desktopBtn.style.color = device === 'desktop' ? 'var(--fam-text)' : 'var(--fam-text-3)';
    if (mobileBtn) mobileBtn.style.color = device === 'mobile' ? 'var(--fam-text)' : 'var(--fam-text-3)';
  };

  window.toggleSlotMode = function toggleSlotMode() {
    window.slotModeActive = !window.slotModeActive;
    var btn = document.getElementById('slot-mode-btn');
    if (btn) btn.style.background = window.slotModeActive ? 'rgba(232,53,42,0.3)' : 'rgba(232,53,42,0.1)';
    window.reloadPreview();
  };

  window.renderPageTabs = function renderPageTabs() {
    var container = document.getElementById('preview-page-tabs');
    if (!container) return;
    while (container.firstChild) container.removeChild(container.firstChild);
    (window.sitePages || []).forEach(function(page) {
      var btn = document.createElement('button');
      var isActive = page === window.activePage;
      btn.style.cssText = 'padding:3px 8px;font-size:10px;background:' + (isActive ? 'rgba(232,53,42,0.15)' : 'transparent') + ';border:' + (isActive ? '1px solid rgba(232,53,42,0.3)' : '1px solid transparent') + ';border-radius:3px;color:' + (isActive ? 'var(--fam-red)' : 'var(--fam-text-3)') + ';cursor:pointer;';
      btn.textContent = page.replace('.html', '');
      var capturedPage = page;
      btn.onclick = function() {
        if (window.ws) window.ws.send(JSON.stringify({ type: 'set-page', page: capturedPage }));
        if (window.StudioShell && typeof window.StudioShell.selectContext === 'function') {
          StudioShell.selectContext({ type: 'page', page: capturedPage }, { source: 'preview-tabs' });
        } else {
          window.navigateToPage(capturedPage);
        }
      };
      container.appendChild(btn);
    });
  };

  window.updatePageTabs = function updatePageTabs(pages, currentPage) {
    window.sitePages = pages || [];
    if (currentPage) window.activePage = currentPage;
    window.renderPageTabs();
    var sidebarList = document.getElementById('sidebar-pages-list');
    if (sidebarList) {
      while (sidebarList.firstChild) sidebarList.removeChild(sidebarList.firstChild);
      window.sitePages.forEach(function(page) {
        var item = document.createElement('div');
        item.className = 'sidebar-item' + (page === window.activePage ? ' active' : '');
        item.textContent = page.replace('.html', '');
        var capturedPage = page;
        item.onclick = function() {
          if (window.ws) window.ws.send(JSON.stringify({ type: 'set-page', page: capturedPage }));
          if (window.StudioShell && typeof window.StudioShell.selectContext === 'function') {
            StudioShell.selectContext({ type: 'page', page: capturedPage }, { source: 'sidebar-pages' });
          } else {
            window.navigateToPage(capturedPage, { source: 'sidebar-pages' });
          }
        };
        sidebarList.appendChild(item);
      });
    }
    window.dispatchEvent(new CustomEvent('studio:pages-updated', {
      detail: { pages: window.sitePages.slice(), currentPage: window.activePage }
    }));
  };

  window.loadPages = function loadPages() {
    fetch('/api/pages').then(function(r) { return r.json(); }).then(function(data) {
      if (data.pages) window.updatePageTabs(data.pages, data.currentPage);
    }).catch(function() {});
  };
})();
