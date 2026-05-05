/**
 * site-studio/public/js/ops-jobs.js
 *
 * Mounts the Ops Workspace inside the Workbench shell. Renders 11 sub-tabs;
 * only Jobs is functional in MVP. Polls /api/ops/jobs every 5s and renders
 * seven swimlanes plus the Stale Debt drawer.
 *
 * No WebSocket in MVP — see docs/ops/state-contract.md.
 *
 * All DOM construction goes through el() (createElement + appendChild). The
 * only innerHTML assignments are clearing operations (= '') with no user
 * data — never assignment of untrusted strings.
 */
(function () {
  'use strict';

  const SUBTABS = [
    { id: 'pulse',   label: 'Pulse' },
    { id: 'plans',   label: 'Plans' },
    { id: 'tasks',   label: 'Tasks' },
    { id: 'jobs',    label: 'Jobs' },
    { id: 'runs',    label: 'Runs' },
    { id: 'proofs',  label: 'Proofs' },
    { id: 'agents',  label: 'Agents' },
    { id: 'reviews', label: 'Reviews' },
    { id: 'gaps',    label: 'Gaps' },
    { id: 'memory',  label: 'Memory' },
    { id: 'debt',    label: 'Debt' },
  ];

  const LANES = [
    { id: 'queued',    label: 'Queued' },
    { id: 'approving', label: 'Approving' },
    { id: 'running',   label: 'Running' },
    { id: 'blocked',   label: 'Blocked' },
    { id: 'done',      label: 'Done' },
    { id: 'failed',    label: 'Failed' },
    { id: 'parked',    label: 'Parked' },
  ];

  let pollTimer = null;
  let activeSub = 'jobs';
  let lastJobsSnapshot = null;
  let mounted = false;

  function el(tag, attrs, children) {
    const node = document.createElement(tag);
    if (attrs) {
      for (const k in attrs) {
        if (k === 'class') node.className = attrs[k];
        else if (k === 'dataset') Object.assign(node.dataset, attrs[k]);
        else if (k.startsWith('on') && typeof attrs[k] === 'function') node.addEventListener(k.slice(2), attrs[k]);
        else node.setAttribute(k, attrs[k]);
      }
    }
    if (children) {
      const arr = Array.isArray(children) ? children : [children];
      for (const c of arr) {
        if (c == null || c === false) continue;
        node.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
      }
    }
    return node;
  }

  function clear(node) {
    while (node && node.firstChild) node.removeChild(node.firstChild);
  }

  function renderSubTabs(host) {
    const bar = el('div', { class: 'ops-subtabs', id: 'ops-subtabs' });
    for (const t of SUBTABS) {
      const b = el('button', {
        class: 'ops-subtab' + (t.id === activeSub ? ' active' : ''),
        dataset: { sub: t.id },
        onclick: () => switchSub(t.id),
      }, t.label);
      bar.appendChild(b);
    }
    host.appendChild(bar);
  }

  function renderPanes(host) {
    for (const t of SUBTABS) {
      const pane = el('div', { class: 'ops-pane' + (t.id === activeSub ? ' active' : ''), dataset: { sub: t.id } });
      pane.id = 'ops-pane-' + t.id;
      if (t.id === 'jobs') {
        pane.appendChild(buildJobsPane());
      } else {
        pane.appendChild(el('div', { class: 'ops-empty' }, t.label + ' — coming soon'));
      }
      host.appendChild(pane);
    }
  }

  function buildJobsPane() {
    const wrap = el('div', { class: 'ops-jobs-body' });
    const header = el('div', { class: 'ops-jobs-header' }, [
      el('span', { class: 'ops-chip ops-chip--job' }, [
        el('span', { class: 'ops-chip-glyph' }, '▶'),
        document.createTextNode(' JOBS'),
      ]),
      el('span', null, 'Polling every 5s'),
      el('span', { class: 'ops-spacer' }),
      el('span', { id: 'ops-jobs-updated' }, '—'),
      el('button', { class: 'ops-refresh', onclick: () => fetchJobs(true) }, 'Refresh now'),
    ]);
    const lanes = el('div', { class: 'ops-lanes', id: 'ops-jobs-lanes' });
    for (const lane of LANES) {
      const l = el('div', { class: 'ops-lane', dataset: { lane: lane.id } }, [
        el('div', { class: 'ops-lane-header' }, [
          document.createTextNode(lane.label),
          el('span', { class: 'ops-lane-count', id: 'ops-lane-count-' + lane.id }, '0'),
        ]),
        el('div', { class: 'ops-lane-body', id: 'ops-lane-body-' + lane.id }),
      ]);
      lanes.appendChild(l);
    }
    const debt = el('div', { class: 'ops-debt', id: 'ops-debt', dataset: { open: 'false' } }, [
      el('div', { class: 'ops-debt-header', onclick: toggleDebt }, [
        el('span', { class: 'caret' }, '▶'),
        document.createTextNode(' Stale Debt drawer'),
        el('span', { class: 'ops-debt-count', id: 'ops-debt-count' }, '0'),
        el('span', { style: 'flex:1' }),
        el('span', { id: 'ops-debt-source', style: 'font-size:10px;color:var(--ops-text-3);' }, ''),
      ]),
      el('div', { class: 'ops-debt-body' }, [
        el('div', null, 'Quarantined records from the legacy worker queue and any jobs whose freshness is stale, parked, or archived. These never enter live lanes.'),
        el('div', { class: 'ops-debt-actions' }, [
          el('button', { class: 'ops-btn', onclick: () => debtAction('migrate') }, 'Migrate'),
          el('button', { class: 'ops-btn', onclick: () => debtAction('archive') }, 'Archive'),
          el('button', { class: 'ops-btn ops-btn--danger', onclick: () => debtAction('purge', true) }, 'Purge'),
        ]),
        el('div', { class: 'ops-shay-line', id: 'ops-shay-line' }, 'Shay-Shay: gathering queue summary...'),
      ]),
    ]);
    const inspector = el('aside', { class: 'ops-inspector', id: 'ops-inspector', dataset: { open: 'false' } }, [
      el('div', { class: 'ops-inspector-header' }, [
        el('span', { class: 'ops-inspector-title', id: 'ops-inspector-title' }, 'Job inspector'),
        el('button', { class: 'ops-inspector-close', onclick: closeInspector }, '×'),
      ]),
      el('div', { class: 'ops-inspector-body', id: 'ops-inspector-body' }, 'Select a card to inspect.'),
      el('div', { class: 'ops-inspector-actions' }, [
        el('button', { class: 'ops-btn', onclick: () => inspectorAction('cancel') }, 'Cancel'),
        el('button', { class: 'ops-btn', onclick: () => inspectorAction('park') }, 'Park'),
        el('button', { class: 'ops-btn', onclick: () => inspectorAction('promote') }, 'Promote to Task'),
      ]),
    ]);
    wrap.appendChild(header);
    wrap.appendChild(lanes);
    wrap.appendChild(debt);
    wrap.appendChild(inspector);
    return wrap;
  }

  function switchSub(id) {
    activeSub = id;
    document.querySelectorAll('#ops-subtabs .ops-subtab').forEach(b => b.classList.toggle('active', b.dataset.sub === id));
    document.querySelectorAll('#tab-pane-ops .ops-pane').forEach(p => p.classList.toggle('active', p.dataset.sub === id));
    if (id === 'jobs') startPolling();
    else stopPolling();
  }

  function toggleDebt() {
    const d = document.getElementById('ops-debt');
    if (!d) return;
    d.dataset.open = d.dataset.open === 'true' ? 'false' : 'true';
  }

  function fmtAge(seconds) {
    if (!Number.isFinite(seconds)) return '—';
    if (seconds < 60) return seconds + 's';
    if (seconds < 3600) return Math.floor(seconds / 60) + 'm';
    if (seconds < 86400) return Math.floor(seconds / 3600) + 'h';
    return Math.floor(seconds / 86400) + 'd';
  }

  function renderCard(job) {
    const title = job.title || job.intent || job.target || job.id || job.job_id || 'untitled';
    const target = job.target || job.site_tag || '';
    const agent = job.agent || job.runner || job.brain || '';
    const needsApproval = job.status === 'pending' || job.requires_approval === true;
    const card = el('div', {
      class: 'ops-card',
      dataset: { jobId: job.id || job.job_id || '' },
      onclick: () => openInspector(job),
    }, [
      el('div', { class: 'ops-card-title' }, String(title)),
      el('div', { class: 'ops-card-meta' }, [
        el('span', { class: 'ops-freshness-dot ops-freshness-dot--' + (job._freshness || 'idle') }),
        agent ? el('span', null, agent) : null,
        target ? el('span', null, '· ' + target) : null,
        el('span', null, '· ' + fmtAge(job._age_seconds)),
        needsApproval ? el('span', { class: 'ops-pip' }, 'needs approval') : null,
      ].filter(Boolean)),
    ]);
    return card;
  }

  function renderJobs(snapshot) {
    lastJobsSnapshot = snapshot;
    const data = snapshot.data || {};
    const lanes = data.lanes || {};
    const counts = data.lane_counts || {};
    for (const lane of LANES) {
      const body = document.getElementById('ops-lane-body-' + lane.id);
      const cnt = document.getElementById('ops-lane-count-' + lane.id);
      if (cnt) cnt.textContent = String(counts[lane.id] || 0);
      if (body) {
        clear(body);
        const arr = lanes[lane.id] || [];
        if (arr.length === 0) {
          body.appendChild(el('div', { class: 'ops-empty', style: 'padding:18px 6px;font-size:10px;' }, '—'));
        } else {
          for (const j of arr) body.appendChild(renderCard(j));
        }
      }
    }
    const debt = data.stale_debt || {};
    const debtTotal = (debt.legacy_queue_count || 0) + (debt.stale_job_count || 0) + (debt.parked_job_count || 0);
    const debtCount = document.getElementById('ops-debt-count');
    if (debtCount) debtCount.textContent = String(debtTotal);
    const debtSource = document.getElementById('ops-debt-source');
    if (debtSource) debtSource.textContent = debt.inventory_file ? ('source: ' + debt.inventory_file) : '';
    const stamp = document.getElementById('ops-jobs-updated');
    if (stamp) stamp.textContent = 'updated ' + new Date(snapshot.generated_at).toLocaleTimeString();
    updateShayLine(counts, debtTotal);
  }

  function updateShayLine(counts, debtTotal) {
    const line = document.getElementById('ops-shay-line');
    if (!line) return;
    const queued  = counts.queued    || 0;
    const running = counts.running   || 0;
    const blocked = counts.blocked   || 0;
    line.textContent = `Shay-Shay: ${queued} queued, ${running} running, ${blocked} blocked, ${debtTotal} stale.`;
  }

  async function fetchJobs(force) {
    try {
      const r = await fetch('/api/ops/jobs', { headers: { 'cache-control': 'no-cache' } });
      if (!r.ok) throw new Error('http ' + r.status);
      const snap = await r.json();
      renderJobs(snap);
    } catch (e) {
      const stamp = document.getElementById('ops-jobs-updated');
      if (stamp) stamp.textContent = 'fetch failed: ' + e.message;
    }
  }

  function startPolling() {
    if (pollTimer) return;
    fetchJobs();
    pollTimer = setInterval(fetchJobs, 5000);
  }

  function stopPolling() {
    if (pollTimer) { clearInterval(pollTimer); pollTimer = null; }
  }

  function openInspector(job) {
    const ins = document.getElementById('ops-inspector');
    const title = document.getElementById('ops-inspector-title');
    const body = document.getElementById('ops-inspector-body');
    if (!ins || !body) return;
    ins.dataset.open = 'true';
    if (title) title.textContent = job.title || job.intent || job.id || 'Job';
    clear(body);
    const sec = (label, value) => el('div', { class: 'ops-inspector-section' }, [
      el('div', { class: 'ops-inspector-section-label' }, label),
      el('div', null, typeof value === 'string' ? value : (value || '—')),
    ]);
    body.appendChild(sec('Status', String(job.status || '—')));
    body.appendChild(sec('Freshness', String(job._freshness || '—')));
    body.appendChild(sec('Age', fmtAge(job._age_seconds)));
    body.appendChild(sec('Cost estimate', job.cost_estimate ? ('$' + job.cost_estimate) : '— (placeholder)'));
    body.appendChild(sec('Dependencies', Array.isArray(job.depends_on) && job.depends_on.length ? job.depends_on.join(', ') : '— (placeholder)'));
    body.appendChild(sec('Log tail', '— (placeholder; WS stream not in MVP)'));
    const pre = el('pre', { style: 'font-size:10px;white-space:pre-wrap;color:var(--ops-text-3);' });
    pre.textContent = JSON.stringify(job, null, 2);
    body.appendChild(el('div', { class: 'ops-inspector-section' }, [
      el('div', { class: 'ops-inspector-section-label' }, 'Raw record'),
      pre,
    ]));
    body.dataset.jobId = job.id || job.job_id || '';
  }

  function closeInspector() {
    const ins = document.getElementById('ops-inspector');
    if (ins) ins.dataset.open = 'false';
  }

  async function postCommand(action, payload, withGovToken) {
    const headers = { 'content-type': 'application/json' };
    if (withGovToken) headers['x-ops-governance-token'] = 'OPS_DEV_BYPASS_DO_NOT_SHIP';
    const r = await fetch('/api/ops/command/' + action, {
      method: 'POST', headers, body: JSON.stringify(payload || {}),
    });
    let body = null;
    try { body = await r.json(); } catch (_) { /* ignore */ }
    return { status: r.status, body };
  }

  async function inspectorAction(action) {
    const body = document.getElementById('ops-inspector-body');
    const jobId = body ? body.dataset.jobId : '';
    const isDestructive = action === 'cancel' || action === 'promote';
    const { status, body: resp } = await postCommand(action, { job_id: jobId }, isDestructive);
    if (status >= 400) {
      alert(`${action} blocked (${status}): ${resp?.error || 'unknown'}`);
    } else {
      alert(`${action}: ${resp?.message || 'ok'}`);
    }
  }

  async function debtAction(action, requireConfirm) {
    if (requireConfirm && !window.confirm('Purge legacy queue records? This cannot be undone.')) return;
    const { status, body } = await postCommand(action, {}, true);
    if (status >= 400) {
      alert(`${action} blocked (${status}): ${body?.error || 'unknown'}`);
    } else {
      alert(`${action}: ${body?.message || 'ok'}`);
      fetchJobs(true);
    }
  }

  function mount() {
    if (mounted) return;
    const host = document.getElementById('tab-pane-ops');
    if (!host) return;
    clear(host);
    renderSubTabs(host);
    renderPanes(host);
    mounted = true;
    if (activeSub === 'jobs') startPolling();
  }

  function unmount() { stopPolling(); }

  window.OpsJobs = { mount, unmount, switchSub };

  document.addEventListener('DOMContentLoaded', () => {
    const tryWatch = () => {
      const pane = document.getElementById('tab-pane-ops');
      if (!pane) return setTimeout(tryWatch, 200);
      const obs = new MutationObserver(() => {
        if (!pane.classList.contains('hidden')) mount();
      });
      obs.observe(pane, { attributes: true, attributeFilter: ['class'] });
      if (!pane.classList.contains('hidden')) mount();
    };
    tryWatch();
  });
})();
