(function () {
  window.refreshDeployInfo = function refreshDeployInfo() {
    var area = document.getElementById('deploy-status-area');
    if (!area) return;
    area.textContent = 'Loading deploy status…';

    var verifyP = fetch('/api/verify').then(function(r){ return r.json(); }).catch(function(){ return null; });
    var stateP  = fetch('/api/studio-state').then(function(r){ return r.json(); }).catch(function(){ return null; });

    Promise.all([verifyP, stateP]).then(function(results) {
      var verify = results[0];
      var state  = results[1];
      var spec   = (state && state.spec) || {};
      window.renderDeployPane(area, verify, spec);
    });
  };

  window.renderDeployPane = function renderDeployPane(area, verify, spec) {
    while (area.firstChild) area.removeChild(area.firstChild);

    var scoreWrap = document.createElement('div');
    scoreWrap.style.cssText = 'margin-bottom:16px;padding:12px;background:var(--fam-bg-3);border:1px solid var(--fam-border);border-radius:8px;';
    var scoreTitle = document.createElement('div');
    scoreTitle.style.cssText = 'font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:var(--fam-text-3);margin-bottom:8px;';
    scoreTitle.textContent = 'FAMtastic Score';
    scoreWrap.appendChild(scoreTitle);

    var checks = (verify && Array.isArray(verify.checks)) ? verify.checks : [];
    var passed = checks.filter(function(c){ return c.status === 'passed'; }).length;
    var warned = checks.filter(function(c){ return c.status === 'warned'; }).length;
    var failed = checks.filter(function(c){ return c.status === 'failed'; }).length;
    var total = checks.length;

    var scoreLine = document.createElement('div');
    scoreLine.style.cssText = 'display:flex;align-items:baseline;gap:10px;margin-bottom:10px;';
    var big = document.createElement('span');
    big.style.cssText = 'font-size:24px;font-weight:700;color:' + (failed ? 'var(--fam-red)' : warned ? 'var(--fam-gold)' : 'var(--fam-green)') + ';';
    big.textContent = total ? (passed + '/' + total) : '—';
    scoreLine.appendChild(big);
    var sub = document.createElement('span');
    sub.style.cssText = 'font-size:11px;color:var(--fam-text-3);';
    sub.textContent = total ? (passed + ' passed, ' + warned + ' warned, ' + failed + ' failed') : 'Run a build to generate verification';
    scoreLine.appendChild(sub);
    scoreWrap.appendChild(scoreLine);

    if (total) {
      checks.forEach(function(c) {
        var row = document.createElement('div');
        row.style.cssText = 'display:flex;align-items:flex-start;gap:8px;padding:4px 0;font-size:12px;';
        var icon = document.createElement('span');
        var color = c.status === 'passed' ? 'var(--fam-green)'
                  : c.status === 'warned' ? 'var(--fam-gold)'
                  : c.status === 'failed' ? 'var(--fam-red)'
                  : 'var(--fam-text-3)';
        icon.style.cssText = 'color:' + color + ';font-weight:700;width:14px;flex-shrink:0;';
        icon.textContent = c.status === 'passed' ? '✓'
                         : c.status === 'warned' ? '⚠'
                         : c.status === 'failed' ? '✗'
                         : '•';
        row.appendChild(icon);
        var name = document.createElement('span');
        name.style.cssText = 'color:var(--fam-text);flex:1;';
        name.textContent = (c.check || '').replace(/_/g, ' ').replace(/-/g, ' ');
        row.appendChild(name);
        if (c.issues && c.issues.length) {
          var count = document.createElement('span');
          count.style.cssText = 'font-size:10px;color:' + color + ';';
          count.textContent = c.issues.length + ' issue' + (c.issues.length > 1 ? 's' : '');
          row.appendChild(count);
        }
        scoreWrap.appendChild(row);

        if (c.issues && c.issues.length && c.status !== 'passed') {
          c.issues.forEach(function(issue) {
            var detail = document.createElement('div');
            detail.style.cssText = 'padding:2px 0 2px 22px;font-size:11px;color:var(--fam-text-2);line-height:1.4;';
            detail.textContent = '— ' + issue;
            scoreWrap.appendChild(detail);
          });
        }
      });
    }

    var refreshBtn = document.createElement('button');
    refreshBtn.style.cssText = 'margin-top:10px;font-size:11px;padding:4px 10px;background:var(--fam-bg);border:1px solid var(--fam-border);border-radius:4px;color:var(--fam-text-2);cursor:pointer;';
    refreshBtn.textContent = '↻ Re-verify';
    refreshBtn.addEventListener('click', function() {
      refreshBtn.disabled = true;
      refreshBtn.textContent = 'Verifying…';
      fetch('/api/verify', { method: 'POST' }).then(function(r){ return r.json(); }).then(function() {
        window.refreshDeployInfo();
      }).catch(function() {
        refreshBtn.disabled = false;
        refreshBtn.textContent = '↻ Re-verify';
      });
    });
    scoreWrap.appendChild(refreshBtn);
    area.appendChild(scoreWrap);

    var envs = (spec && spec.environments) || {};
    var envWrap = document.createElement('div');
    envWrap.style.cssText = 'margin-bottom:16px;padding:12px;background:var(--fam-bg-3);border:1px solid var(--fam-border);border-radius:8px;';
    var envTitle = document.createElement('div');
    envTitle.style.cssText = 'font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:var(--fam-text-3);margin-bottom:8px;';
    envTitle.textContent = 'Environments';
    envWrap.appendChild(envTitle);

    [
      { key: 'local', label: 'Local', url: 'http://localhost:3333', color: 'var(--fam-text-2)' },
      { key: 'staging', label: 'Staging', url: (envs.staging && envs.staging.url) || null, color: 'var(--fam-gold)' },
      { key: 'production', label: 'Production', url: (envs.production && envs.production.url) || spec.deployed_url || null, color: 'var(--fam-green)' },
    ].forEach(function(env) {
      var row = document.createElement('div');
      row.style.cssText = 'display:flex;align-items:center;gap:10px;padding:4px 0;font-size:12px;';
      var dot = document.createElement('span');
      dot.style.cssText = 'width:8px;height:8px;border-radius:50%;background:' + (env.url ? env.color : 'var(--fam-text-3)') + ';flex-shrink:0;';
      row.appendChild(dot);
      var label = document.createElement('span');
      label.style.cssText = 'width:92px;color:var(--fam-text);';
      label.textContent = env.label;
      row.appendChild(label);
      if (env.url) {
        var a = document.createElement('a');
        a.href = env.url;
        a.target = '_blank';
        a.style.cssText = 'color:' + env.color + ';text-decoration:none;';
        a.textContent = env.url.replace(/^https?:\/\//, '');
        row.appendChild(a);
      } else {
        var placeholder = document.createElement('span');
        placeholder.style.cssText = 'color:var(--fam-text-3);';
        placeholder.textContent = 'not deployed';
        row.appendChild(placeholder);
      }
      envWrap.appendChild(row);
    });
    area.appendChild(envWrap);

    var actionsWrap = document.createElement('div');
    actionsWrap.style.cssText = 'display:flex;gap:8px;margin-bottom:16px;';
    var stagingBtn = document.createElement('button');
    stagingBtn.style.cssText = 'flex:1;padding:8px;font-size:12px;font-weight:600;background:rgba(127,119,221,0.15);border:1px solid rgba(127,119,221,0.3);border-radius:5px;color:var(--fam-purple);cursor:pointer;';
    stagingBtn.textContent = '→ Staging';
    stagingBtn.addEventListener('click', window.deployToStaging);
    actionsWrap.appendChild(stagingBtn);
    var prodBtn = document.createElement('button');
    prodBtn.style.cssText = 'flex:1;padding:8px;font-size:12px;font-weight:600;background:rgba(232,53,42,0.15);border:1px solid rgba(232,53,42,0.3);border-radius:5px;color:var(--fam-red);cursor:pointer;';
    prodBtn.textContent = '→ Production';
    prodBtn.addEventListener('click', window.deployToProduction);
    actionsWrap.appendChild(prodBtn);
    area.appendChild(actionsWrap);

    var history = Array.isArray(spec.deploy_history) ? spec.deploy_history.slice().reverse().slice(0, 5) : [];
    var histWrap = document.createElement('div');
    histWrap.style.cssText = 'padding:12px;background:var(--fam-bg-3);border:1px solid var(--fam-border);border-radius:8px;';
    var histTitle = document.createElement('div');
    histTitle.style.cssText = 'font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:var(--fam-text-3);margin-bottom:8px;';
    histTitle.textContent = 'Recent deploys';
    histWrap.appendChild(histTitle);
    if (!history.length) {
      var emptyHist = document.createElement('div');
      emptyHist.style.cssText = 'font-size:12px;color:var(--fam-text-3);';
      emptyHist.textContent = 'No deploys yet.';
      histWrap.appendChild(emptyHist);
    } else {
      history.forEach(function(d) {
        var row = document.createElement('div');
        row.style.cssText = 'display:flex;align-items:baseline;gap:8px;padding:4px 0;font-size:11px;border-bottom:1px solid var(--fam-border-2);';
        var when = document.createElement('span');
        when.style.cssText = 'color:var(--fam-text-3);font-family:var(--font-mono, monospace);';
        when.textContent = (d.deployed_at || '').replace('T', ' ').slice(0, 16);
        row.appendChild(when);
        var env = document.createElement('span');
        env.style.cssText = 'color:var(--fam-text-2);text-transform:uppercase;letter-spacing:0.04em;width:64px;';
        env.textContent = d.environment || '';
        row.appendChild(env);
        if (d.fam_score != null) {
          var score = document.createElement('span');
          score.style.cssText = 'color:var(--fam-text);';
          score.textContent = 'score ' + d.fam_score;
          row.appendChild(score);
        }
        if (d.url) {
          var a = document.createElement('a');
          a.href = d.url;
          a.target = '_blank';
          a.style.cssText = 'color:var(--fam-green);text-decoration:none;margin-left:auto;';
          a.textContent = d.url.replace(/^https?:\/\//, '').slice(0, 30);
          row.appendChild(a);
        }
        histWrap.appendChild(row);
      });
    }
    area.appendChild(histWrap);
  };

  window.renderVerifyResults = function renderVerifyResults(msg) {
    updateVerifyIndicator(msg);
    window.refreshDeployInfo();
  };

  window.deployVia = async function deployVia(env) {
    const label = env === 'production' ? 'production' : 'staging';
    window.addMessage('user', `Deploy to ${label}`);
    window.steps = [];
    window.stepStart = null;
    window.addStep(`Deploying to ${label}...`);
    try {
      const resp = await fetch('/api/deploy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ env: label }),
      });
      const body = await resp.json().catch(() => ({}));
      if (!resp.ok || !body.ok) {
        const reason = body.reason || `http_${resp.status}`;
        const details = body.details || 'Deploy preflight failed.';
        window.addMessage('assistant', `${label.charAt(0).toUpperCase() + label.slice(1)} deploy failed: ${details} (reason: ${reason})`);
      }
    } catch (err) {
      window.addMessage('assistant', `${label} deploy request failed: ${err.message}`);
    }
  };

  window.deployToStaging = function deployToStaging() { window.deployVia('staging'); };
  window.deployToProduction = function deployToProduction() { window.deployVia('production'); };

  window.refreshBlueprint = function refreshBlueprint() {};
  window.refreshMetrics = function refreshMetrics() {};
  window.refreshServerInfo = function refreshServerInfo() {};
})();
