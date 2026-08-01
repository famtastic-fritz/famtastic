(function () {
  window.lastVerifyResult = window.lastVerifyResult || null;

  window.rebuildSite = function rebuildSite() {
    window.addMessage('user', 'Rebuild the site');
    window.steps = [];
    window.stepStart = null;
    window.addStep('Preparing runtime-vnext rebuild...');
    fetch('/api/rebuild-runtime-vnext', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{}'
    })
      .then(function(r) { return r.json().then(function(data) { return { ok: r.ok, data: data }; }); })
      .then(function(result) {
        if (!result.ok) throw new Error(result.data && result.data.error ? result.data.error : 'Rebuild failed');
        var proof = result.data && result.data.proof_report ? result.data.proof_report : null;
        var pagesBuilt = proof && typeof proof.pages_built === 'number' ? proof.pages_built : 0;
        var issues = proof && typeof proof.total_issues === 'number' ? proof.total_issues : 0;
        var overall = proof && proof.overall_status ? proof.overall_status : (result.data.status || 'unknown');
        window.addStep('Refreshing studio state...');
        window.refreshStudioPanel();
        window.refreshVerification();
        if (typeof window.loadPages === 'function') window.loadPages();
        window.reloadPreview();
        window.hideStepLog();
        window.addMessage('assistant', 'runtime-vnext rebuild complete. Pages: ' + pagesBuilt + '. Issues: ' + issues + '. Overall: ' + overall + '.');
      })
      .catch(function(err) {
        window.hideStepLog();
        window.addMessage('error', 'runtime-vnext rebuild failed: ' + (err && err.message ? err.message : err));
      });
  };

  window.updateVerifyIndicator = function updateVerifyIndicator(msg) {
    var checks = msg.checks || {};
    var vals = Object.values(checks);
    if (vals.length) {
      var passing = vals.filter(function(v) { return v === true || (v && v.passed); }).length;
      window.dispatchEvent(new CustomEvent('pip:build-complete', { detail: { score: passing, total: vals.length } }));
    }
    window.lastVerifyResult = msg;
    var indicator = document.getElementById('verify-indicator');
    if (!indicator) return;
    if (!vals.length) {
      indicator.style.background = 'var(--fam-text-3)';
      return;
    }
    var passingCount = vals.filter(function(v) { return v === true || (v && v.passed); }).length;
    var total = vals.length;
    if (passingCount === total) indicator.style.background = 'var(--fam-green)';
    else if (passingCount >= total * 0.6) indicator.style.background = 'var(--fam-gold)';
    else indicator.style.background = 'var(--fam-red)';
  };

  window.refreshVerification = function refreshVerification() {
    // Explicit site authority: /api/verify 400s (site_tag_required) without it.
    var tag = (window.config && window.config.tag) || null;
    if (!tag) return;
    fetch('/api/verify?siteTag=' + encodeURIComponent(tag))
      .then(function(r) { return r.json(); })
      .then(function(data) { window.updateVerifyIndicator(data); })
      .catch(function() {});
  };
})();
