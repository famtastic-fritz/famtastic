// site-studio/public/js/operator-actions.js
//
// Lane B client. Pure-DOM (no innerHTML on dynamic data) action toolbar
// for the Operator Workspace. Waits up to 3s for window.__operator (owned
// by Lane A) before attaching. Mounts buttons into #op-actions-toolbar.

(function () {
  'use strict';

  var ACTIONS_BASE = '/api/intelligence/actions';
  var WAIT_MS = 3000;
  var POLL_MS = 100;

  function $(id) { return document.getElementById(id); }

  function setStatus(node, text, kind) {
    if (!node) return;
    node.textContent = text || '';
    node.dataset.kind = kind || 'info';
  }

  function getCurrentRunId() {
    var op = window.__operator;
    if (op && typeof op.currentRunId === 'function') {
      try { return op.currentRunId(); } catch (_) { return null; }
    }
    if (op && op.state && op.state.runId) return op.state.runId;
    return null;
  }

  function getCurrentTag() {
    var op = window.__operator;
    if (op && typeof op.currentTag === 'function') {
      try { return op.currentTag(); } catch (_) { return null; }
    }
    if (op && op.state && op.state.tag) return op.state.tag;
    return null;
  }

  function actionUrl(suffix) {
    var tag = getCurrentTag();
    var qs = tag ? ('?tag=' + encodeURIComponent(tag)) : '';
    return ACTIONS_BASE + suffix + qs;
  }

  function postJson(url, body) {
    return fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body || {}),
    }).then(function (r) {
      return r.json().then(function (data) { return { ok: r.ok, status: r.status, data: data }; })
        .catch(function () { return { ok: r.ok, status: r.status, data: null }; });
    });
  }

  function refreshOperator() {
    var op = window.__operator;
    if (op && typeof op.refresh === 'function') {
      try { op.refresh(); } catch (_) {}
    }
  }

  function makeButton(label, onClick) {
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = label;
    btn.className = 'op-action-btn';
    btn.addEventListener('click', onClick);
    return btn;
  }

  function buildToolbar(host) {
    // Clear (no innerHTML)
    while (host.firstChild) host.removeChild(host.firstChild);

    var status = document.createElement('span');
    status.id = 'op-actions-status';
    status.className = 'op-actions-status';
    status.textContent = '';

    var btnStart = makeButton('Start Refinement Run', function () {
      var runId = window.prompt('Run ID (lowercase, hyphens, 3-80 chars):');
      if (!runId) return;
      setStatus(status, 'Starting run ' + runId + '...', 'info');
      postJson(actionUrl('/runs/start'), {
        run_id: runId,
        intent: 'mbsh_v2_visual_refinement',
      }).then(function (r) {
        if (r.ok) {
          setStatus(status, 'Run ' + runId + ' started.', 'ok');
          refreshOperator();
        } else {
          setStatus(status, 'Start failed: ' + (r.data && r.data.error ? r.data.error : r.status), 'err');
        }
      });
    });

    var btnPass = makeButton('Append Pass', function () {
      var runId = getCurrentRunId();
      if (!runId) {
        setStatus(status, 'No run selected.', 'err');
        return;
      }
      var label = window.prompt('Pass label:');
      if (!label) return;
      setStatus(status, 'Appending pass...', 'info');
      postJson(actionUrl('/runs/' + encodeURIComponent(runId) + '/passes'), {
        label: label,
        ok: true,
      }).then(function (r) {
        if (r.ok) {
          setStatus(status, 'Pass appended.', 'ok');
          refreshOperator();
        } else {
          setStatus(status, 'Append failed: ' + (r.data && r.data.error ? r.data.error : r.status), 'err');
        }
      });
    });

    var btnNonBlocker = makeButton('Record Non-blocker', function () {
      var runId = getCurrentRunId();
      if (!runId) {
        setStatus(status, 'No run selected.', 'err');
        return;
      }
      var note = window.prompt('Non-blocker note:');
      if (!note) return;
      setStatus(status, 'Recording non-blocker...', 'info');
      postJson(actionUrl('/runs/' + encodeURIComponent(runId) + '/non-blockers'), {
        note: note,
      }).then(function (r) {
        if (r.ok) {
          setStatus(status, 'Non-blocker recorded.', 'ok');
          refreshOperator();
        } else {
          setStatus(status, 'Record failed: ' + (r.data && r.data.error ? r.data.error : r.status), 'err');
        }
      });
    });

    var btnFinalize = makeButton('Finalize as PASS', function () {
      var runId = getCurrentRunId();
      if (!runId) {
        setStatus(status, 'No run selected.', 'err');
        return;
      }
      if (!window.confirm('Finalize run ' + runId + ' as PASS?')) return;
      setStatus(status, 'Finalizing...', 'info');
      postJson(actionUrl('/runs/' + encodeURIComponent(runId) + '/finalize'), {
        verdict: 'pass',
      }).then(function (r) {
        if (r.ok) {
          setStatus(status, 'Run finalized: pass.', 'ok');
          refreshOperator();
        } else {
          setStatus(status, 'Finalize failed: ' + (r.data && r.data.error ? r.data.error : r.status), 'err');
        }
      });
    });

    // Track pass/non-blocker/finalize disabled state when no run selected
    function syncEnabled() {
      var hasRun = !!getCurrentRunId();
      btnPass.disabled = !hasRun;
      btnNonBlocker.disabled = !hasRun;
      btnFinalize.disabled = !hasRun;
    }
    syncEnabled();
    // Re-sync periodically since Lane A owns the run-selector state
    setInterval(syncEnabled, 1000);

    host.appendChild(btnStart);
    host.appendChild(btnPass);
    host.appendChild(btnNonBlocker);
    host.appendChild(btnFinalize);
    host.appendChild(status);
  }

  function attach() {
    var host = $('op-actions-toolbar');
    if (!host) {
      console.warn('[operator-actions] #op-actions-toolbar not found');
      return;
    }
    buildToolbar(host);
  }

  function waitForOperator(deadline) {
    if (window.__operator) {
      attach();
      return;
    }
    if (Date.now() >= deadline) {
      console.warn('[operator-actions] window.__operator not present after 3s; exiting.');
      return;
    }
    setTimeout(function () { waitForOperator(deadline); }, POLL_MS);
  }

  function init() {
    waitForOperator(Date.now() + WAIT_MS);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
