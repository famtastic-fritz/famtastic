/**
 * worker-queue-badge.js — Session 11 Fix 8
 *
 * Polls GET /api/worker-queue on a 15s interval and updates the
 * "Pending manual execution" badge in the brain/worker panel.
 *
 * Badge visibility:
 *   - hidden when pending_count === 0
 *   - visible with count when pending_count > 0
 *
 * Tooltip: includes a per-worker breakdown + oldest_pending timestamp
 * so it's clear WHY the badge is on and which worker is backed up.
 */
(function () {
  'use strict';

  var POLL_MS = 15000;
  var timer = null;

  function fmt(ts) {
    if (!ts) return '';
    try {
      var d = new Date(ts);
      var ageSec = Math.round((Date.now() - d.getTime()) / 1000);
      if (ageSec < 60)   return ageSec + 's ago';
      if (ageSec < 3600) return Math.round(ageSec / 60) + 'm ago';
      return Math.round(ageSec / 3600) + 'h ago';
    } catch (e) { return ''; }
  }

  function updateBadge(data) {
    var badge = document.getElementById('worker-queue-badge');
    var countEl = document.getElementById('worker-queue-count');
    if (!badge || !countEl) return;

    var pending = (data && typeof data.pending_count === 'number') ? data.pending_count : 0;

    // Notify Pip orb of queue changes
    window.dispatchEvent(new CustomEvent('pip:worker-queue-updated', { detail: { count: pending } }));

    if (pending === 0) {
      badge.classList.add('hidden');
      return;
    }

    badge.classList.remove('hidden');
    countEl.textContent = String(pending);

    // Build a detailed tooltip
    var lines = ['Worker queue: ' + pending + ' task(s) pending manual execution'];
    if (data.by_worker) {
      var workers = Object.keys(data.by_worker);
      if (workers.length) {
        lines.push('');
        lines.push('By worker:');
        workers.forEach(function (w) {
          lines.push('  ' + w + ': ' + data.by_worker[w]);
        });
      }
    }
    if (data.oldest_pending) {
      lines.push('');
      lines.push('Oldest: ' + fmt(data.oldest_pending));
    }
    lines.push('');
    lines.push('No worker process is currently polling this queue.');
    lines.push('Click to open the queue file: ' + (data.queue_path || ''));
    badge.title = lines.join('\n');
  }

  function poll() {
    fetch('/api/worker-queue')
      .then(function (r) { return r.json(); })
      .then(updateBadge)
      .catch(function () { /* silent */ });
  }

  function start() {
    poll();
    if (timer) clearInterval(timer);
    timer = setInterval(poll, POLL_MS);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }

  // Expose a manual refresh hook for other modules (e.g. post-build)
  window.WorkerQueueBadge = { refresh: poll };
})();
