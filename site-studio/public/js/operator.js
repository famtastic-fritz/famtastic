// operator.js — Studio Operator Workspace
// Renders zones from /api/intelligence/{sites,brief,capability-truth,runs,runs/:runId}.
// All DOM mutations use createElement/textContent — no .innerHTML on dynamic content.
// Data sources are server-local JSON validated by intelligence-reader/writer.
'use strict';

(function () {
  // ── State ──────────────────────────────────────────────────
  var state = {
    sites: [],
    activeTag: null,
    refinementTag: 'site-mbsh-reunion',
    brief: null,
    capability: null,
    runs: [],
    selectedRunId: null,
    runDetail: null,
    readbackMode: 'short',
    consumedRoutes: new Set()
  };

  // ── DOM helpers (no innerHTML, no eval) ────────────────────
  function q(sel, root)  { return (root || document).querySelector(sel); }
  function qa(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  function clear(node)   { while (node && node.firstChild) node.removeChild(node.firstChild); }

  // h(tagName, attrs?, ...children) — creates an element safely.
  // children may be: string, number, Node, array of those, or null/undefined.
  function h(tag, attrs) {
    var el = document.createElement(tag);
    if (attrs && typeof attrs === 'object' && !attrs.nodeType && !Array.isArray(attrs)) {
      Object.keys(attrs).forEach(function (k) {
        var v = attrs[k];
        if (v == null || v === false) return;
        if (k === 'class') el.className = String(v);
        else if (k === 'dataset') Object.keys(v).forEach(function (dk) { el.dataset[dk] = String(v[dk]); });
        else if (k === 'on') Object.keys(v).forEach(function (ev) { el.addEventListener(ev, v[ev]); });
        else if (k === 'style' && typeof v === 'object') Object.keys(v).forEach(function (sk) { el.style[sk] = v[sk]; });
        else if (k === 'text') el.textContent = String(v);
        else el.setAttribute(k, String(v));
      });
    } else if (attrs != null) {
      appendChildSafe(el, attrs);
    }
    for (var i = 2; i < arguments.length; i++) appendChildSafe(el, arguments[i]);
    return el;
  }
  function appendChildSafe(parent, child) {
    if (child == null || child === false) return;
    if (Array.isArray(child)) { child.forEach(function (c) { appendChildSafe(parent, c); }); return; }
    if (child.nodeType) { parent.appendChild(child); return; }
    parent.appendChild(document.createTextNode(String(child)));
  }
  // Convenience: chip + dot
  function chip(tone, text) {
    return h('span', { class: 'op-chip ' + tone }, h('span', { class: 'dot' }), String(text));
  }

  function setStatus(text, tone) {
    var dot = q('#op-status-dot'); var t = q('#op-status-text');
    if (t) t.textContent = text;
    if (dot) { dot.classList.remove('live', 'warn', 'err'); dot.classList.add(tone || 'live'); }
  }
  function fmtTime(iso) {
    if (!iso) return '—';
    try { return new Date(iso).toLocaleString(); } catch (e) { return iso; }
  }

  async function fetchJson(url) {
    state.consumedRoutes.add(url.split('?')[0]);
    try {
      var res = await fetch(url, { headers: { Accept: 'application/json' } });
      if (!res.ok) {
        if (res.status === 404) return { __notFound: true };
        throw new Error('HTTP ' + res.status);
      }
      return await res.json();
    } catch (err) {
      console.warn('[operator] fetch failed', url, err.message);
      return { __error: err.message };
    }
  }

  // ── Zone routing ───────────────────────────────────────────
  function bindZoneTabs() {
    qa('.op-zone-tab').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var zone = btn.getAttribute('data-zone');
        switchZone(zone);
        history.replaceState(null, '', '#' + zone);
      });
    });
    var initial = (location.hash || '').replace('#', '') || 'intelligence';
    if (qa('.op-zone-tab').some(function (b) { return b.dataset.zone === initial; })) switchZone(initial);
  }
  function switchZone(zone) {
    qa('.op-zone-tab').forEach(function (b) { b.classList.toggle('active', b.dataset.zone === zone); });
    qa('.op-zone').forEach(function (el) { el.classList.toggle('active', el.dataset.zone === zone); });
  }
  function bindReadbackTabs() {
    qa('.op-readback-tab').forEach(function (btn) {
      btn.addEventListener('click', function () {
        qa('.op-readback-tab').forEach(function (b) { b.classList.toggle('active', b === btn); });
        state.readbackMode = btn.dataset.mode;
        renderReadback();
      });
    });
  }
  function bindSelectors() {
    q('#op-site-select').addEventListener('change', async function (e) {
      state.activeTag = e.target.value;
      setStatus('switching to ' + state.activeTag + '…', 'warn');
      await loadAllForActiveSite();
      setStatus('ready', 'live');
    });
    q('#op-target-select').addEventListener('change', function (e) {
      state.refinementTag = e.target.value;
      q('#op-target-pill-text').textContent = e.target.value + ' · refinement target';
      renderMbshReadiness();
    });
  }

  // ── Loaders ────────────────────────────────────────────────
  async function loadSites() {
    var data = await fetchJson('/api/intelligence/sites');
    state.sites = data && Array.isArray(data.sites) ? data.sites : [];
    var sel = q('#op-site-select');
    clear(sel);
    if (!state.sites.length) {
      sel.appendChild(h('option', { value: '' }, '(no sites)'));
      return;
    }
    state.sites.forEach(function (s) {
      var label = s.tag + (s.title ? ' — ' + s.title : '') + (s.has_intelligence ? '' : ' (no intel)');
      sel.appendChild(h('option', { value: s.tag }, label));
    });
  }
  async function loadAllForActiveSite() {
    if (!state.activeTag) return;
    var tag = encodeURIComponent(state.activeTag);
    var results = await Promise.all([
      fetchJson('/api/intelligence/brief?tag=' + tag),
      fetchJson('/api/intelligence/capability-truth?tag=' + tag),
      fetchJson('/api/intelligence/runs?tag=' + tag)
    ]);
    var brief = results[0], cap = results[1], runs = results[2];
    state.brief = brief && !brief.__notFound && !brief.__error ? brief : null;
    state.capability = cap && !cap.__notFound && !cap.__error ? cap : null;
    state.runs = runs && Array.isArray(runs.runs) ? runs.runs : [];
    if (state.runs.length) {
      state.selectedRunId = state.runs[0].run_id;
      var detail = await fetchJson('/api/intelligence/runs/' + encodeURIComponent(state.selectedRunId) + '?tag=' + tag);
      state.runDetail = detail && !detail.__error ? detail : null;
    } else {
      state.selectedRunId = null;
      state.runDetail = null;
    }
    renderAll();
  }
  async function selectRun(runId) {
    state.selectedRunId = runId;
    var tag = encodeURIComponent(state.activeTag);
    var detail = await fetchJson('/api/intelligence/runs/' + encodeURIComponent(runId) + '?tag=' + tag);
    state.runDetail = detail && !detail.__error ? detail : null;
    renderRunDetailPanels();
  }

  // ── Render orchestrator ────────────────────────────────────
  function renderAll() {
    renderBrief(); renderRecipe(); renderResearch(); renderReadinessSummary();
    renderCapability(); renderCost(); renderRuns(); renderRunDetailPanels();
    renderComponents(); renderMedia(); renderDesign(); renderGaps();
    renderReadback(); renderFlow(); renderMbshReadiness(); renderStatusbar();
  }
  function renderRunDetailPanels() {
    renderProof(); renderBlockers(); renderLearning();
    renderFrames(); renderProvenance(); renderReadback(); renderStatusbar();
  }

  function emptyMsg(msg) { return h('div', { class: 'op-empty' }, String(msg || '—')); }
  function smallText(text) { return h('div', { class: 'op-small' }, String(text)); }
  function divider() { return h('div', { class: 'op-section-divider' }); }
  function listFrom(arr, mapFn, emptyText) {
    var ul = h('ul', { class: 'op-list' });
    if (!arr || !arr.length) {
      ul.appendChild(h('li', { class: 'op-small' }, String(emptyText || 'none')));
    } else {
      arr.forEach(function (item) { ul.appendChild(mapFn(item)); });
    }
    return ul;
  }
  function kvRow(k, v) { return [h('div', { class: 'k' }, k), h('div', { class: 'v' }, v)]; }

  // ── Brief ──────────────────────────────────────────────────
  function renderBrief() {
    var el = q('#op-brief-body'); if (!el) return; clear(el);
    var b = state.brief;
    if (!b) { el.appendChild(emptyMsg('No intelligence brief found for this site.')); return; }
    var aud = (b.audience || []).map(function (a) { return chip('muted', a); });
    var kv = h('div', { class: 'op-kv' },
      kvRow('title', b.title),
      kvRow('site_tag', h('span', { class: 'op-mono' }, b.site_tag)),
      kvRow('vertical', b.vertical),
      kvRow('audience', aud)
    );
    el.appendChild(kv);
    el.appendChild(divider());
    el.appendChild(smallText('Goals'));
    el.appendChild(listFrom(b.goals, function (g) { return h('li', null, g); }, 'none recorded'));
    el.appendChild(smallText('Must-haves'));
    el.appendChild(listFrom(b.must_haves, function (g) { return h('li', null, g); }, 'none recorded'));
    if ((b.non_goals || []).length) {
      el.appendChild(smallText('Non-goals'));
      el.appendChild(listFrom(b.non_goals, function (g) { return h('li', null, g); }));
    }
  }

  // ── Recipe ─────────────────────────────────────────────────
  function renderRecipe() {
    var el = q('#op-recipe-body'); if (!el) return; clear(el);
    var ledger = state.runDetail && state.runDetail.ledger;
    if (!ledger || !ledger.intent) {
      el.appendChild(emptyMsg('No recipe decision recorded yet. Plan-Lite is implicit until a build run captures one.'));
      return;
    }
    el.appendChild(h('div', { class: 'op-kv' },
      kvRow('last intent', h('span', { class: 'op-mono' }, ledger.intent)),
      kvRow('recipe_id', h('span', { class: 'op-mono' }, ledger.recipe_id || '—'))
    ));
    el.appendChild(divider());
    el.appendChild(smallText('Plan-Lite is recorded as Run Ledger ledger.passes[]:'));
    el.appendChild(listFrom(ledger.passes, function (p) {
      return h('li', null, (p.label || p.pass_id), ' ', h('span', { class: 'op-small' }, p.ok ? '✓' : '✗'));
    }, 'no passes'));
  }

  // ── Research ───────────────────────────────────────────────
  function renderResearch() {
    var el = q('#op-research-body'); if (!el) return; clear(el);
    var slices = [
      ['Slice 1 — Execution Substrate Contracts + Fixtures', 'green', 'complete'],
      ['Slice 2 — Server Modularization (validators.js extracted)', 'green', 'landed'],
      ['Slice 3 — Artifact Reader + 4 routes', 'green', 'landed'],
      ['Slice 4 — Run Ledger Writer + cost cap', 'green', 'landed'],
      ['Slice 5 — MBSH V2 Readiness Gate', 'green', 'complete'],
      ['Operator Workspace UI', 'green', 'this surface']
    ];
    el.appendChild(listFrom(slices, function (s) {
      return h('li', null, s[0], ' ', chip(s[1], s[2]));
    }));
    el.appendChild(divider());
    el.appendChild(h('div', { class: 'op-small' }, 'Source map: ', h('span', { class: 'op-mono' }, 'docs/research/famtastic-studio-execution/RESEARCH-SOURCE-MAP.md')));
  }

  // ── Readiness summary ──────────────────────────────────────
  function renderReadinessSummary() {
    var el = q('#op-readiness-summary'); if (!el) return; clear(el);
    var caps = (state.capability && state.capability.capabilities) || [];
    var counts = caps.reduce(function (acc, c) { acc[c.state] = (acc[c.state] || 0) + 1; return acc; }, {});
    var ready = (counts.red || 0) === 0;
    el.appendChild(h('div', { class: 'op-chips', style: { marginBottom: '10px' } },
      chip('green', 'green ' + (counts.green || 0)),
      chip('yellow', 'yellow ' + (counts.yellow || 0)),
      chip('red', 'red ' + (counts.red || 0))
    ));
    var verdictNode = state.runDetail && state.runDetail.ledger
      ? chip(verdictTone(state.runDetail.ledger.verdict), state.runDetail.ledger.verdict || '—')
      : h('span', { class: 'op-small' }, 'no run');
    el.appendChild(h('div', { class: 'op-kv' },
      kvRow('ready for V2 refinement?', ready ? chip('green', 'yes') : chip('red', 'no — red caps')),
      kvRow('latest run verdict', verdictNode)
    ));
  }
  function verdictTone(v) {
    if (v === 'pass') return 'green';
    if (v === 'fail') return 'red';
    if (v === 'blocked') return 'yellow';
    if (v === 'parked') return 'blue';
    return 'muted';
  }

  // ── Capability matrix ──────────────────────────────────────
  function renderCapability() {
    var el = q('#op-capability-body'); if (!el) return; clear(el);
    var caps = (state.capability && state.capability.capabilities) || [];
    if (!caps.length) { el.appendChild(emptyMsg('No capability truth recorded.')); return; }
    var grid = h('div', { class: 'op-capability-grid' });
    caps.forEach(function (c) {
      grid.appendChild(h('div', { class: 'op-capability-row' },
        h('div', null,
          h('div', { class: 'name op-mono' }, c.name),
          h('div', { class: 'evidence' }, c.evidence || '')
        ),
        chip(c.state, c.state)
      ));
    });
    el.appendChild(grid);
  }

  // ── Cost ───────────────────────────────────────────────────
  function renderCost() {
    var el = q('#op-cost-body'); if (!el) return; clear(el);
    var ledger = state.runDetail && state.runDetail.ledger;
    var usd = (ledger && ledger.cost && ledger.cost.usd) || 0;
    var pct = Math.min(100, (usd / 50) * 100);
    var tone = usd >= 50 ? 'over' : (usd >= 25 ? 'warn' : '');
    var blocked = ledger && (ledger.blockers || []).some(function (b) { return b.kind === 'cost_cap_exceeded'; });
    el.appendChild(h('div', { class: 'op-kv' },
      kvRow('spent', h('span', { class: 'op-mono' }, '$' + usd.toFixed(2))),
      kvRow('cap', h('span', { class: 'op-mono' }, '$50.00')),
      kvRow('approval', blocked ? chip('red', 'required') : chip('green', 'auto'))
    ));
    var meter = h('div', { class: 'op-cost-meter' },
      h('div', { class: 'op-cost-meter-fill ' + tone, style: { width: pct + '%' } })
    );
    el.appendChild(meter);
    el.appendChild(h('div', { class: 'op-small' }, ledger ? 'cost rule: anything ≥ $50 stops automatically and routes to Fritz.' : 'no run selected'));
  }

  // ── Runs list ──────────────────────────────────────────────
  function renderRuns() {
    var el = q('#op-runs-body'); if (!el) return; clear(el);
    if (!state.runs.length) { el.appendChild(emptyMsg('No runs yet.')); return; }
    state.runs.forEach(function (r) {
      var row = h('div', { class: 'op-run-row' + (r.run_id === state.selectedRunId ? ' selected' : ''), dataset: { run: r.run_id } },
        h('div', { class: 'id' }, r.run_id),
        h('div', { class: 'meta' },
          h('span', null, 'status: ' + r.status),
          h('span', null, 'verdict: ' + (r.verdict || '—')),
          h('span', null, 'cost: $' + (r.cost_usd || 0).toFixed(2)),
          h('span', null, fmtTime(r.started_at))
        )
      );
      row.addEventListener('click', function () { selectRun(r.run_id); });
      el.appendChild(row);
    });
  }

  // ── Proof packet ───────────────────────────────────────────
  function renderProof() {
    var el = q('#op-proof-body'); if (!el) return; clear(el);
    var proof = state.runDetail && state.runDetail.proof;
    if (!proof || !Array.isArray(proof.packets) || !proof.packets.length) {
      el.appendChild(emptyMsg('No proof packet for this run yet.'));
      return;
    }
    proof.packets.forEach(function (packet) {
      (packet.proofs || []).forEach(function (p) {
        var target = p.path || p.command || p.target || JSON.stringify(p);
        var status = p.status != null ? '→ ' + p.status : (p.exit != null ? 'exit ' + p.exit : (p.note || 'ok'));
        el.appendChild(h('div', { class: 'op-proof-row' },
          h('span', { class: 'kind' }, p.kind),
          h('span', { class: 'target' }, target),
          h('span', { class: 'status' }, status)
        ));
      });
    });
  }

  // ── Blockers / non-blockers ────────────────────────────────
  function renderBlockers() {
    var el = q('#op-blockers-body'); if (!el) return; clear(el);
    var ledger = state.runDetail && state.runDetail.ledger;
    if (!ledger) { el.appendChild(emptyMsg('No run selected.')); return; }
    var blockers = ledger.blockers || [];
    var nonBlockers = ledger.non_blockers || [];
    var bColumn = h('div', null,
      h('div', { class: 'op-small', style: { marginBottom: '6px' } }, 'Blockers (' + blockers.length + ')')
    );
    if (blockers.length) {
      bColumn.appendChild(listFrom(blockers, function (b) {
        return h('li', null, chip('red', b.kind), ' ', h('span', { class: 'op-small' }, fmtTime(b.at)));
      }));
    } else { bColumn.appendChild(emptyMsg('No blockers.')); }
    var nbColumn = h('div', null,
      h('div', { class: 'op-small', style: { marginBottom: '6px' } }, 'Non-blockers (' + nonBlockers.length + ')')
    );
    if (nonBlockers.length) {
      nbColumn.appendChild(listFrom(nonBlockers, function (n) {
        return h('li', null, chip('muted', n.kind || 'note'), ' ', n.note || '');
      }));
    } else { nbColumn.appendChild(emptyMsg('No non-blockers logged.')); }
    el.appendChild(h('div', { class: 'op-grid cols-2' }, bColumn, nbColumn));
  }

  // ── Components ─────────────────────────────────────────────
  function renderComponents() {
    var el = q('#op-components-body'); if (!el) return; clear(el);
    el.appendChild(h('div', { class: 'op-small', style: { marginBottom: '8px' } }, 'Reusable from MBSH V1 + skeleton vocabulary:'));
    var reuse = [
      [['fam-hero-layered'], 'BEM layers --bg / --fx / --character / --content', 'green', 'protected'],
      [['NAV_SKELETON'], '.nav-links · .nav-cta · .nav-toggle-label · .nav-mobile-menu', 'green', 'protected'],
      [['multi-part-logo'], 'full / icon / wordmark SVG triplet', 'green', 'pipelined'],
      [['divider-svg'], 'wave / tilt / peak / arch', 'green', 'library'],
      [['live-countdown'], 'existing component', 'green', 'library'],
      [['starburst-badge'], 'existing component', 'green', 'library']
    ];
    el.appendChild(listFrom(reuse, function (r) {
      return h('li', null, h('span', { class: 'op-tag' }, r[0][0]), ' — ', r[1], ' ', chip(r[2], r[3]));
    }));
    el.appendChild(divider());
    el.appendChild(h('div', { class: 'op-small', style: { marginBottom: '8px' } }, 'New slot candidates for MBSH V2 refinement:'));
    var newslots = [
      [['committee-grid'], '6–12 cards, photo + name + role', 'yellow', 'candidate'],
      [['sponsor-wall'], 'tiered logo grid', 'yellow', 'candidate'],
      [['schedule-block'], 'day · time · location triplets', 'yellow', 'candidate'],
      [['rsvp-form'], 'wraps V1 endpoint', 'yellow', 'candidate'],
      [['harry-assistant'], 'interactive overlay', 'yellow', 'candidate'],
      [['gallery-then-now'], 'paired V1 → V2 photos', 'muted', 'optional']
    ];
    el.appendChild(listFrom(newslots, function (r) {
      return h('li', null, h('span', { class: 'op-tag' }, r[0][0]), ' — ', r[1], ' ', chip(r[2], r[3]));
    }));
    el.appendChild(divider());
    el.appendChild(h('div', { class: 'op-small' }, 'Mutation/replacement history is captured per-run via ledger.passes[]. Reuse-before-create rule: every new slot proposal lands as a non-blocker first.'));
  }

  // ── Media ──────────────────────────────────────────────────
  function renderMedia() {
    var el = q('#op-media-body'); if (!el) return; clear(el);
    var rows = [
      ['hero_bg', '1920+ wide', 'yellow', 'source from V1'],
      ['committee_photos', '12 × ≥600px sq', 'yellow', 'content sourcing'],
      ['sponsor_logos', 'SVG preferred', 'yellow', 'approvals pending'],
      ['venue_photo', 'landscape ≥1600px', 'yellow', 'content sourcing'],
      ['harry_variants', 'mascot art', 'yellow', 'existing assets'],
      ['og_image / favicon', 'auto-derived', 'green', 'pipeline']
    ];
    el.appendChild(listFrom(rows, function (r) {
      return h('li', null, h('span', { class: 'op-tag' }, r[0]), ' · ', r[1], ' ', chip(r[2], r[3]));
    }));
    el.appendChild(divider());
    el.appendChild(h('div', { class: 'op-small' }, 'Provider/prompt/cost lineage will populate ', h('span', { class: 'op-mono' }, 'sites/<tag>/media/registry.json'), ' at MBSH V2 build time. No paid generation runs without explicit Fritz approval.'));
  }

  // ── Design ─────────────────────────────────────────────────
  function renderDesign() {
    var el = q('#op-design-body'); if (!el) return; clear(el);
    el.appendChild(h('div', { class: 'op-kv' },
      kvRow('tokens', h('span', null, 'declared in ', h('span', { class: 'op-mono' }, 'famtastic-dna.md'))),
      kvRow('contrast / a11y', chip('yellow', 'WCAG 2.1 AA target — gate at QA')),
      kvRow('legibility', chip('yellow', 'min font + min hit-target — gate at QA')),
      kvRow('proof gates', chip('green', '13 gates declared in Slice 5 §6'))
    ));
    el.appendChild(divider());
    el.appendChild(h('div', { class: 'op-small' }, 'Critics fire as proof packet entries on each MBSH V2 build run. No silent passes.'));
  }

  // ── Gaps ───────────────────────────────────────────────────
  function renderGaps() {
    var el = q('#op-gaps-body'); if (!el) return; clear(el);
    var gaps = [
      ['yellow', 'medium', 'tests/unit.test.js loader — missing public/js/shay-bridge-client.js', 'studio handled: yes (test loader). workaround: skip suite. v2 backlog.'],
      ['yellow', 'medium', 'concurrent same-site run lock not implemented', 'studio handled: no. workaround: serial runs only in V1. v2 backlog.'],
      ['yellow', 'medium', 'provider-aware cost projection helper deferred', 'studio handled: no. workaround: caller checks cost cap pre-call. v2 backlog.'],
      ['muted', 'low', 'server.js still 20k+ lines', 'studio handled: yes (Slice 2 plan). workaround: Phase 1–4 extraction. v1 ongoing.']
    ];
    el.appendChild(listFrom(gaps, function (g) {
      return h('li', null,
        chip(g[0], g[1]), ' ', g[2],
        h('div', { class: 'op-small' }, g[3])
      );
    }));
  }

  // ── Shay readback ──────────────────────────────────────────
  function renderReadback() {
    var el = q('#op-readback-body'); if (!el) return;
    el.textContent = readbackText(state.readbackMode);
  }
  function readbackText(mode) {
    var tag = state.activeTag || '—';
    var briefTitle = state.brief && state.brief.title;
    var caps = (state.capability && state.capability.capabilities) || [];
    var greenCount  = caps.filter(function (c) { return c.state === 'green'; }).length;
    var yellowCount = caps.filter(function (c) { return c.state === 'yellow'; }).length;
    var redCount    = caps.filter(function (c) { return c.state === 'red'; }).length;
    var ledger = state.runDetail && state.runDetail.ledger;
    var verdict = ledger && ledger.verdict;
    var cost = ledger && ledger.cost ? ledger.cost.usd : 0;
    var next = ledger && ledger.next_action;

    if (mode === 'short') {
      if (!briefTitle) return 'No intelligence brief for ' + tag + '.';
      return briefTitle + '. Capability truth: ' + greenCount + ' green, ' + yellowCount + ' yellow, ' + redCount + ' red. Latest run: ' + (verdict || 'none') + '.';
    }
    if (mode === 'operator') {
      var lines = [];
      lines.push('SITE: ' + tag);
      lines.push('BRIEF: ' + (briefTitle || 'none'));
      lines.push('CAPABILITY TRUTH: ' + greenCount + ' green / ' + yellowCount + ' yellow / ' + redCount + ' red');
      lines.push('LATEST RUN: ' + (state.selectedRunId || 'none') + ' (' + (verdict || 'no verdict') + ')');
      lines.push('COST: $' + cost.toFixed(2) + ' of $50.00 cap');
      lines.push('BLOCKERS: ' + ((ledger && ledger.blockers && ledger.blockers.length) || 0));
      lines.push('NON-BLOCKERS: ' + ((ledger && ledger.non_blockers && ledger.non_blockers.length) || 0));
      return lines.join('\n');
    }
    if (mode === 'deep') {
      var d = [];
      d.push('Site: ' + tag);
      if (state.brief) {
        d.push('Brief: ' + state.brief.title + ' (' + state.brief.vertical + ')');
        if (state.brief.goals) d.push('Goals: ' + state.brief.goals.join('; '));
        if (state.brief.must_haves) d.push('Must-haves: ' + state.brief.must_haves.join('; '));
        if (state.brief.blockers_known) d.push('Known content blockers: ' + state.brief.blockers_known.join('; '));
      }
      d.push('');
      caps.forEach(function (c) { d.push('  [' + c.state + '] ' + c.name + ' — ' + (c.evidence || '')); });
      d.push('');
      if (ledger) {
        d.push('Run ' + ledger.run_id + ': ' + ledger.status + '/' + ledger.verdict + ', $' + ((ledger.cost && ledger.cost.usd) || 0).toFixed(2));
        (ledger.passes || []).forEach(function (p) { d.push('  ' + (p.ok ? '✓' : '✗') + ' ' + (p.label || p.pass_id)); });
      }
      return d.join('\n');
    }
    if (mode === 'next') return next ? 'NEXT: ' + next : 'NEXT: no next_action set on this run.';
    return '';
  }

  // ── Visual flow ────────────────────────────────────────────
  function renderFlow() {
    var el = q('#op-flow-body'); if (!el) return; clear(el);
    var caps = (state.capability && state.capability.capabilities) || [];
    function stateOf(name) {
      var c = caps.find(function (x) { return x.name === name; });
      if (!c) return 'pending';
      return c.state === 'green' ? 'done' : 'pending';
    }
    var nodes = [
      ['Brief',            'intelligence_brief.read'],
      ['Capability Truth', 'capability_truth.read'],
      ['Run Ledger',       'run_ledger.append'],
      ['Proof Packet',     'proof_packet.attach'],
      ['Cost Cap',         'cost.cap_at_50'],
      ['Learning',         'learning_candidate.capture'],
      ['Modularization',   'server.modularization_path'],
      ['MBSH V2 Refine',   'media_registry']
    ];
    nodes.forEach(function (n, i) {
      if (i) el.appendChild(h('span', { class: 'op-flow-arrow' }, '→'));
      var s = stateOf(n[1]);
      el.appendChild(h('div', { class: 'op-flow-node ' + s },
        h('div', { class: 'node-title' }, n[0]),
        h('div', { class: 'node-meta op-mono' }, n[1]),
        h('div', { class: 'node-meta' }, s === 'done' ? '✓ green' : '… pending/yellow')
      ));
    });
    renderFrames();
    renderProvenance();
  }
  function renderFrames() {
    var el = q('#op-frames-body'); if (!el) return; clear(el);
    var ledger = state.runDetail && state.runDetail.ledger;
    if (!ledger) { el.appendChild(emptyMsg('Select a run.')); return; }
    var passes = ledger.passes || [];
    if (!passes.length) { el.appendChild(emptyMsg('Run has no passes.')); return; }
    var ul = h('ul', { class: 'op-pass-list' });
    passes.forEach(function (p) {
      ul.appendChild(h('li', null,
        h('span', { class: 'ok-mark' + (p.ok ? '' : ' fail') }, p.ok ? '✓' : '✗'),
        h('span', { class: 'label' }, p.label || p.pass_id),
        h('span', { class: 'op-small' }, fmtTime(p.at))
      ));
    });
    el.appendChild(ul);
  }
  function renderProvenance() {
    var el = q('#op-provenance-body'); if (!el) return; clear(el);
    var proof = state.runDetail && state.runDetail.proof;
    if (!proof || !Array.isArray(proof.packets) || !proof.packets.length) {
      el.appendChild(emptyMsg('Select a run.'));
      return;
    }
    proof.packets.forEach(function (packet) {
      (packet.proofs || []).forEach(function (p) {
        var target = p.path || p.command || p.target || JSON.stringify(p);
        var status = p.status != null ? '→ ' + p.status : (p.exit != null ? 'exit ' + p.exit : (p.note || 'ok'));
        el.appendChild(h('div', { class: 'op-proof-row' },
          h('span', { class: 'kind' }, p.kind),
          h('span', { class: 'target' }, target),
          h('span', { class: 'status' }, status)
        ));
      });
    });
  }
  function renderLearning() {
    var el = q('#op-learning-body'); if (!el) return; clear(el);
    var candidates = (state.runDetail && state.runDetail.learning_candidates) || [];
    if (!candidates.length) { el.appendChild(emptyMsg('No learning candidates for this run.')); return; }
    var ul = h('ul', { class: 'op-list' });
    candidates.forEach(function (c) {
      var li = h('li', null,
        h('div', null, chip('blue', c.kind), ' ', c.summary)
      );
      if ((c.evidence || []).length) {
        li.appendChild(h('div', { class: 'op-small' }, 'evidence: ', c.evidence.join(' · ')));
      }
      if (c.promote_target) {
        li.appendChild(h('div', { class: 'op-small' }, 'promote → ', h('span', { class: 'op-mono' }, c.promote_target)));
      }
      ul.appendChild(li);
    });
    el.appendChild(ul);
  }

  // ── MBSH V2 readiness ──────────────────────────────────────
  function renderMbshReadiness() {
    var prod = q('#op-mbsh-prod-body');
    var v2 = q('#op-mbsh-v2-body');
    var deferred = q('#op-deferred-body');
    if (prod) {
      clear(prod);
      prod.appendChild(h('div', { class: 'op-kv' },
        kvRow('site', h('span', { class: 'op-mono' }, 'site-mbsh-reunion')),
        kvRow('state', [chip('green', 'built'), ' ', chip('green', 'shipped to production')]),
        kvRow('last build', '2026-04-30 (per famtastic-dna.md auto-log)'),
        kvRow('pages', h('span', { class: 'op-mono' }, 'index · about · schedule · rsvp · contact'))
      ));
    }
    if (v2) {
      clear(v2);
      var caps = (state.capability && state.capability.capabilities) || [];
      var greens  = caps.filter(function (c) { return c.state === 'green'; }).length;
      var yellows = caps.filter(function (c) { return c.state === 'yellow'; }).length;
      var reds    = caps.filter(function (c) { return c.state === 'red'; }).length;
      var ready = reds === 0;
      v2.appendChild(h('div', { class: 'op-chips', style: { marginBottom: '10px' } },
        chip('green', greens + ' green'),
        chip('yellow', yellows + ' yellow'),
        chip('red', reds + ' red')
      ));
      v2.appendChild(h('div', { class: 'op-kv' },
        kvRow('refinement scope', 'controlled visual / layout / functionality tweak — NOT a fresh build'),
        kvRow('proof target', 'first post-launch iteration with full Run Ledger + Proof Packet trail'),
        kvRow('handoff ready?', ready ? chip('green', 'yes — operator can begin refinement') : chip('red', 'no — red caps must clear first'))
      ));
      v2.appendChild(divider());
      v2.appendChild(h('div', { class: 'op-small' }, 'Yellow capabilities are allowed at gate-open per Slice 5 §3 and convert to blockers only at MBSH V2 launch — they do not block refinement work.'));
    }
    if (deferred) {
      clear(deferred);
      var items = [
        'Photography + bios for committee — content sourcing',
        'Sponsor logo approvals',
        'Final venue confirmation copy',
        'Hi-Tide Harry interactive integration (yellow capability)',
        'RSVP V2 schema confirmation (yellow capability)'
      ];
      deferred.appendChild(listFrom(items, function (t) { return h('li', null, chip('muted', 'deferred'), ' ', t); }));
    }
  }

  // ── Status bar ─────────────────────────────────────────────
  function renderStatusbar() {
    q('#op-status-site').textContent = state.activeTag || '—';
    q('#op-status-brief').textContent = state.brief ? '✓' : '—';
    var caps = (state.capability && state.capability.capabilities) || [];
    q('#op-status-caps').textContent = caps.length
      ? caps.filter(function (c) { return c.state === 'green'; }).length + '/' + caps.length
      : '—';
    q('#op-status-runs').textContent = state.runs.length || 0;
    var ledger = state.runDetail && state.runDetail.ledger;
    var cost = (ledger && ledger.cost && ledger.cost.usd) || 0;
    q('#op-status-cost').textContent = '$' + cost.toFixed(2);
    q('#op-status-verdict').textContent = (ledger && ledger.verdict) || '—';
  }

  function tickStatusClock() {
    setInterval(function () { q('#op-status-time').textContent = new Date().toLocaleTimeString(); }, 1000);
  }

  // ── Boot ───────────────────────────────────────────────────
  async function boot() {
    bindZoneTabs(); bindReadbackTabs(); bindSelectors(); tickStatusClock();
    setStatus('loading sites…', 'warn');
    await loadSites();
    state.activeTag = state.sites.find(function (s) { return s.tag === 'site-mbsh-reunion'; })
      ? 'site-mbsh-reunion'
      : (state.sites[0] && state.sites[0].tag) || null;
    if (state.activeTag) {
      q('#op-site-select').value = state.activeTag;
      await loadAllForActiveSite();
    }
    setStatus('ready', 'live');
  }

  document.addEventListener('DOMContentLoaded', boot);
  window.__operator = { state: state, consumed: function () { return Array.from(state.consumedRoutes); } };
})();
