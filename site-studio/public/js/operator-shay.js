// operator-shay.js — Lane E augmentation for the Operator Shay Desk.
// UI-only: never modifies operator.js or operator.html. Polls window.__operator
// state every 1.5s after binding. All readback is deterministic — no LLM calls.
(function () {
  'use strict';

  var BIND_TIMEOUT_MS = 3000;
  var POLL_MS = 1500;

  function $(id) { return document.getElementById(id); }
  function el(tag, attrs, text) {
    var n = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (k) {
        if (k === 'class') n.className = attrs[k];
        else n.setAttribute(k, attrs[k]);
      });
    }
    if (text != null) n.textContent = text;
    return n;
  }
  function clear(node) { while (node && node.firstChild) node.removeChild(node.firstChild); }

  function getOperator() { return (typeof window !== 'undefined') ? window.__operator : null; }
  function getState() {
    var op = getOperator();
    return (op && op.state) ? op.state : null;
  }
  function getRunDetail() {
    var op = getOperator();
    if (op && typeof op.getRunDetail === 'function') {
      try { return op.getRunDetail(); } catch (e) { /* fall through */ }
    }
    var st = getState();
    return st ? st.runDetail : null;
  }
  function callRefresh() {
    var op = getOperator();
    if (op && typeof op.refresh === 'function') {
      try { op.refresh(); return true; } catch (e) { return false; }
    }
    return false;
  }

  // ── 1. Group Learning by promote_target ─────────────────────────────────
  function findLearningCandidates() {
    var detail = getRunDetail();
    if (!detail) return [];
    var ledger = detail.ledger || {};
    var fromLedger = ledger.learning_candidates || ledger.learning || [];
    if (Array.isArray(fromLedger) && fromLedger.length) return fromLedger;
    if (Array.isArray(detail.learning_candidates)) return detail.learning_candidates;
    return [];
  }

  function injectLearningGroupButton() {
    var body = $('op-learning-body');
    if (!body || body.parentNode.querySelector('[data-shay-learning-group]')) return;
    var btn = el('button', {
      type: 'button',
      'data-shay-learning-group': '1',
      class: 'op-shay-btn'
    }, 'Group learning by promote_target');
    btn.style.margin = '8px 0';
    btn.style.padding = '4px 10px';
    btn.style.fontSize = '12px';
    btn.style.cursor = 'pointer';
    btn.addEventListener('click', renderGroupedLearning);
    body.parentNode.insertBefore(btn, body);
  }

  function renderGroupedLearning() {
    var body = $('op-learning-body');
    if (!body) return;
    var cands = findLearningCandidates();
    var container = body.querySelector('[data-shay-grouped]') || el('div', { 'data-shay-grouped': '1' });
    clear(container);
    if (!cands.length) {
      container.appendChild(el('div', { class: 'op-empty' }, 'No learning candidates on selected run.'));
    } else {
      var groups = {};
      cands.forEach(function (c) {
        var key = (c && c.promote_target) ? String(c.promote_target) : '(unset)';
        (groups[key] = groups[key] || []).push(c);
      });
      Object.keys(groups).sort().forEach(function (k) {
        var det = el('details', { 'data-shay-group': k });
        det.open = true;
        var sum = el('summary', null, k + ' (' + groups[k].length + ')');
        det.appendChild(sum);
        var ul = el('ul');
        groups[k].forEach(function (c) {
          var note = (c && (c.note || c.text || c.title)) || JSON.stringify(c);
          ul.appendChild(el('li', null, String(note)));
        });
        det.appendChild(ul);
        container.appendChild(det);
      });
    }
    if (!container.parentNode) body.appendChild(container);
  }

  // ── 2. "What should Fritz do next?" panel in guide zone ─────────────────
  function injectWhatNextPanel() {
    if ($('op-shay-whatnext-panel')) return;
    var guide = document.querySelector('section[data-zone="guide"]');
    if (!guide) return;
    var grid = guide.querySelector('.op-zone-grid') || guide;

    var panel = el('div', { id: 'op-shay-whatnext-panel', class: 'op-panel' });
    var hdr = el('div', { class: 'op-panel-header' });
    hdr.appendChild(el('h2', { class: 'op-panel-title' }, 'What should Fritz do next?'));
    var meta = el('span', { class: 'op-panel-meta op-mono' }, 'ledger.next_action + topmost yellow');
    hdr.appendChild(meta);
    panel.appendChild(hdr);

    var body = el('div', { id: 'op-shay-whatnext-body' });
    panel.appendChild(body);

    var refreshBtn = el('button', {
      type: 'button',
      id: 'op-shay-whatnext-refresh',
      class: 'op-shay-btn'
    }, 'Refresh');
    refreshBtn.style.marginTop = '8px';
    refreshBtn.style.padding = '4px 10px';
    refreshBtn.style.fontSize = '12px';
    refreshBtn.style.cursor = 'pointer';
    refreshBtn.addEventListener('click', function () {
      callRefresh();
      renderWhatNext();
    });
    panel.appendChild(refreshBtn);

    grid.appendChild(panel);
  }

  function renderWhatNext() {
    var body = $('op-shay-whatnext-body');
    if (!body) return;
    clear(body);

    var detail = getRunDetail();
    if (!detail) {
      body.appendChild(el('div', { class: 'op-empty' }, 'no run selected'));
    } else {
      var ledger = detail.ledger || {};
      var next = ledger.next_action;
      if (!next) {
        body.appendChild(el('div', { class: 'op-empty' }, 'no next_action set'));
      } else {
        body.appendChild(el('div', { class: 'op-shay-next-action' }, String(next)));
      }
    }

    var st = getState();
    var caps = (st && st.capability && st.capability.capabilities) || [];
    var firstYellow = null;
    for (var i = 0; i < caps.length; i++) {
      if (caps[i] && caps[i].state === 'yellow') { firstYellow = caps[i]; break; }
    }
    if (firstYellow) {
      var name = firstYellow.name || firstYellow.id || firstYellow.capability || 'unnamed';
      var chip = el('span', { class: 'op-shay-watch-chip' }, 'watch this next: ' + name);
      chip.style.display = 'inline-block';
      chip.style.marginTop = '8px';
      chip.style.padding = '2px 8px';
      chip.style.borderRadius = '10px';
      chip.style.background = '#3a2d10';
      chip.style.color = '#f5c451';
      chip.style.fontSize = '11px';
      body.appendChild(chip);
    }
  }

  // ── 3. Deep readback evidence footer ────────────────────────────────────
  function injectDeepEvidenceFooter() {
    var rb = $('op-readback-body');
    if (!rb) return;
    var existing = document.getElementById('op-shay-deep-evidence');
    var st = getState();
    var mode = st ? st.readbackMode : null;
    if (mode !== 'deep') {
      if (existing && existing.parentNode) existing.parentNode.removeChild(existing);
      return;
    }
    var detail = getRunDetail();
    var ledger = (detail && detail.ledger) || {};
    var caps = (st && st.capability && st.capability.capabilities) || [];
    var passes = Array.isArray(ledger.passes) ? ledger.passes.length : 0;
    var blockers = Array.isArray(ledger.blockers) ? ledger.blockers.length : 0;
    var nonBlockers = Array.isArray(ledger.non_blockers) ? ledger.non_blockers.length : 0;
    var msg = 'evidence: ' + caps.length + ' capabilities · ' + passes + ' passes · ' +
              blockers + ' blockers · ' + nonBlockers + ' non-blockers';

    if (!existing) {
      existing = el('div', { id: 'op-shay-deep-evidence' });
      existing.style.marginTop = '6px';
      existing.style.fontSize = '11px';
      existing.style.opacity = '0.75';
      rb.parentNode.insertBefore(existing, rb.nextSibling);
    }
    existing.textContent = msg;
  }

  // ── 4. Training reserved-placeholder note ───────────────────────────────
  function injectTrainingPlaceholder() {
    if (document.getElementById('op-shay-training-note')) return;
    var trainingBody = $('op-training-body');
    if (!trainingBody) return;
    var note = el('div', { id: 'op-shay-training-note' });
    note.style.marginTop = '8px';
    note.style.padding = '6px 8px';
    note.style.borderLeft = '3px solid #5a4a1a';
    note.style.fontSize = '11px';
    note.textContent = 'V2 backlog. Hook reserved at /api/operator/training (not implemented in V1).';
    trainingBody.parentNode.insertBefore(note, trainingBody.nextSibling);
  }

  // ── Boot / poll ─────────────────────────────────────────────────────────
  function bootBindings() {
    injectLearningGroupButton();
    injectWhatNextPanel();
    injectTrainingPlaceholder();
    renderWhatNext();
    injectDeepEvidenceFooter();
  }

  function startPolling() {
    setInterval(function () {
      try {
        injectLearningGroupButton();
        injectWhatNextPanel();
        injectTrainingPlaceholder();
        renderWhatNext();
        injectDeepEvidenceFooter();
      } catch (e) {
        // log; continue
        if (window && window.console) console.warn('[operator-shay] poll error', e);
      }
    }, POLL_MS);
  }

  function waitForOperator(deadline) {
    if (getOperator()) {
      bootBindings();
      startPolling();
      return;
    }
    if (Date.now() >= deadline) {
      if (window && window.console) {
        console.warn('[operator-shay] window.__operator not present after ' +
                     BIND_TIMEOUT_MS + 'ms — exiting gracefully.');
      }
      return;
    }
    setTimeout(function () { waitForOperator(deadline); }, 100);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      waitForOperator(Date.now() + BIND_TIMEOUT_MS);
    });
  } else {
    waitForOperator(Date.now() + BIND_TIMEOUT_MS);
  }
})();
