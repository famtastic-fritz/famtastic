// shay-workshop.js
// SHAY V2 (2026-05-02): Workshop tool rail (Cowork-pattern, pluggable, additive).
//
// Registration API:
//   ShayWorkshop.registerTool({
//     id: 'memory-inspector',
//     name: 'Memory',
//     icon: '⊙',                     // unicode glyph, or HTML string
//     panel: function(container) { /* render into container */ },
//     appliesTo: ['handoff', 'chat', 'gap-capture', 'site_studio', 'media_studio'],
//     onActivate: function() { /* optional */ },
//     onDeactivate: function() { /* optional */ }
//   });
//
// Default tool: 'workbench' — the chat composer + transcript.
// Built-in tools shipped MVP: Active Job, Cost Tracker.
//
// Activate by id:  ShayWorkshop.activateTool('memory-inspector')
// List:            ShayWorkshop.listTools()

(function () {
  'use strict';

  const tools = new Map();   // id → tool record
  let activeId = null;
  let mounted = false;

  function el(tag, attrs, children) {
    const node = document.createElement(tag);
    if (attrs) for (const k of Object.keys(attrs)) {
      if (k === 'style') Object.assign(node.style, attrs[k]);
      else if (k === 'on') for (const evt of Object.keys(attrs[k])) node.addEventListener(evt, attrs[k][evt]);
      else node.setAttribute(k, attrs[k]);
    }
    if (children) for (const c of [].concat(children)) {
      if (c == null) continue;
      node.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
    }
    return node;
  }

  function registerTool(opts) {
    if (!opts || !opts.id) { console.error('[shay-workshop] registerTool: id required'); return false; }
    if (typeof opts.panel !== 'function') { console.error('[shay-workshop] registerTool: panel must be a function'); return false; }
    tools.set(opts.id, {
      id: opts.id,
      name: opts.name || opts.id,
      icon: opts.icon || '◌',
      panel: opts.panel,
      appliesTo: Array.isArray(opts.appliesTo) ? opts.appliesTo : ['*'],
      onActivate: typeof opts.onActivate === 'function' ? opts.onActivate : null,
      onDeactivate: typeof opts.onDeactivate === 'function' ? opts.onDeactivate : null
    });
    if (mounted) renderRail();
    return true;
  }

  function listTools() {
    return Array.from(tools.values()).map(t => ({ id: t.id, name: t.name, appliesTo: t.appliesTo }));
  }

  function activateTool(id) {
    if (!tools.has(id)) {
      console.warn('[shay-workshop] activateTool: unknown tool id', id);
      return false;
    }
    if (activeId === id) return true;
    if (activeId && tools.get(activeId)?.onDeactivate) {
      try { tools.get(activeId).onDeactivate(); } catch (e) { console.error(e); }
    }
    activeId = id;
    renderRail();
    renderActivePanel();
    const t = tools.get(id);
    if (t.onActivate) try { t.onActivate(); } catch (e) { console.error(e); }
    window.dispatchEvent(new CustomEvent('shay:workshop:tool-activated', { detail: { tool_id: id } }));
    return true;
  }

  function getActiveStudio() {
    if (window.ShayContextRegistry && window.ShayContextRegistry.getActivePageId) {
      const id = window.ShayContextRegistry.getActivePageId();
      if (id && id.includes('.')) return id.split('.')[0];
    }
    return 'site_studio'; // default
  }

  function isToolApplicable(tool) {
    if (tool.appliesTo.includes('*')) return true;
    const studio = getActiveStudio();
    return tool.appliesTo.some(scope => scope === studio || ['handoff', 'chat', 'gap-capture', 'workbench'].includes(scope));
  }

  function ensureMounted() {
    if (mounted) return;
    const shell = document.getElementById('shay-workshop-shell');
    if (!shell) return;
    // Wrap existing shell in a 2-column structure if not already
    if (shell.dataset.toolRailMounted === 'true') { mounted = true; return; }
    shell.dataset.toolRailMounted = 'true';
    shell.style.display = 'flex';
    shell.style.flexDirection = 'row';
    shell.style.gap = '0';
    shell.style.maxWidth = 'none';
    shell.style.padding = '0';

    // Move existing children into a content wrapper
    const existing = Array.from(shell.children).filter(c => c.id !== 'shay-workshop-rail' && c.id !== 'shay-workshop-tool-panel');
    const content = el('div', { id: 'shay-workshop-content', style: { flex: '1', minWidth: '0', overflow: 'hidden', display: 'flex', flexDirection: 'column' } });
    const innerWrap = el('div', { id: 'shay-workshop-workbench', style: { maxWidth: '920px', margin: '0 auto', padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: '14px', width: '100%', boxSizing: 'border-box' } });
    for (const child of existing) innerWrap.appendChild(child);
    content.appendChild(innerWrap);

    // Build rail
    const rail = el('div', {
      id: 'shay-workshop-rail',
      style: {
        width: '52px',
        flexShrink: '0',
        background: 'rgba(7,7,10,0.72)',
        borderRight: '1px solid var(--fam-border)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '12px 0',
        gap: '4px'
      }
    });

    // Build tool panel (initially hidden — workbench is default)
    const toolPanel = el('div', {
      id: 'shay-workshop-tool-panel',
      style: {
        position: 'absolute',
        top: '0',
        left: '52px',
        right: '0',
        bottom: '0',
        background: 'var(--fam-bg)',
        borderLeft: '1px solid var(--fam-border)',
        display: 'none',
        overflow: 'auto',
        padding: '20px 24px',
        zIndex: '10'
      }
    });

    shell.style.position = 'relative';
    shell.appendChild(rail);
    shell.appendChild(content);
    shell.appendChild(toolPanel);

    mounted = true;
    activeId = 'workbench'; // default — the existing workbench content is "the workbench tool"
    renderRail();
  }

  function renderRail() {
    const rail = document.getElementById('shay-workshop-rail');
    if (!rail) return;
    rail.innerHTML = '';
    const sortedTools = Array.from(tools.values()).filter(isToolApplicable);
    for (const tool of sortedTools) {
      const isActive = activeId === tool.id;
      const btn = el('button', {
        type: 'button',
        title: tool.name,
        'data-tool-id': tool.id,
        style: {
          width: '36px',
          height: '36px',
          borderRadius: '8px',
          border: 'none',
          background: isActive ? 'rgba(245,196,0,0.16)' : 'transparent',
          color: isActive ? 'var(--fam-gold)' : 'var(--fam-text-3)',
          fontSize: '15px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: '600',
          fontFamily: 'inherit',
          padding: '0',
          transition: 'all 0.15s'
        },
        on: {
          click: () => activateTool(tool.id),
          mouseenter: (e) => { if (!isActive) e.target.style.background = 'rgba(255,255,255,0.04)'; },
          mouseleave: (e) => { if (!isActive) e.target.style.background = 'transparent'; }
        }
      }, tool.icon);
      rail.appendChild(btn);
    }
  }

  function renderActivePanel() {
    const panel = document.getElementById('shay-workshop-tool-panel');
    const workbench = document.getElementById('shay-workshop-workbench');
    if (!panel || !workbench) return;

    if (activeId === 'workbench') {
      panel.style.display = 'none';
      workbench.style.display = 'flex';
      return;
    }
    workbench.style.display = 'none';
    panel.style.display = 'block';
    panel.innerHTML = '';
    const tool = tools.get(activeId);
    if (!tool) return;
    const wrap = el('div', { style: { maxWidth: '920px', margin: '0 auto' } });
    panel.appendChild(wrap);
    try {
      tool.panel(wrap);
    } catch (err) {
      console.error('[shay-workshop] panel render failed', err);
      wrap.appendChild(el('div', { style: { color: 'var(--fam-red,#f87171)', padding: '12px' } }, 'Tool panel failed: ' + err.message));
    }
  }

  // ── Built-in: Workbench (default) ─────────────────────────────────────────
  registerTool({
    id: 'workbench',
    name: 'Workbench',
    icon: '⚒',
    appliesTo: ['*'],
    panel: function () { /* workbench is the default content; renderActivePanel handles toggling */ }
  });

  // ── Built-in: Active Job Tracker ──────────────────────────────────────────
  // SHAY V2 (2026-05-02 iter 3): now fetches live data from /api/jobs.
  registerTool({
    id: 'active-job',
    name: 'Active Job',
    icon: '◌',
    appliesTo: ['*'],
    panel: async function (container) {
      container.appendChild(el('div', { style: { fontSize: '11px', color: 'var(--fam-gold)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: '700', marginBottom: '8px' } }, 'Active Job'));
      container.appendChild(el('h2', { style: { fontSize: '18px', fontWeight: '700', marginBottom: '4px', color: 'var(--fam-text)' } }, 'What Shay is doing right now'));
      container.appendChild(el('p', { style: { color: 'var(--fam-text-2)', fontSize: '12px', marginBottom: '16px' } }, 'Live from /api/jobs. Auto-refreshes every 5s while panel is open.'));
      const list = el('div', { id: 'shay-workshop-active-jobs', style: { display: 'flex', flexDirection: 'column', gap: '8px' } });
      container.appendChild(list);

      async function refresh() {
        list.innerHTML = '';
        try {
          const r = await fetch('/api/jobs?limit=20', { credentials: 'same-origin' });
          if (!r.ok) throw new Error(r.status + ' ' + r.statusText);
          const data = await r.json();
          const jobs = data.jobs || [];
          if (jobs.length === 0) {
            list.appendChild(el('div', { style: { padding: '14px', border: '1px dashed var(--fam-border)', borderRadius: '10px', color: 'var(--fam-text-3)', fontSize: '12px', textAlign: 'center' } }, 'No active jobs.'));
            return;
          }
          for (const j of jobs) {
            const statusColor = j.status === 'running' ? 'var(--fam-blue,#60a5fa)' : (j.status === 'done' ? 'var(--fam-green,#4ade80)' : (j.status === 'failed' ? 'var(--fam-red,#f87171)' : 'var(--fam-text-3)'));
            list.appendChild(el('div', { style: { padding: '10px 12px', background: 'var(--fam-bg-2)', border: '1px solid var(--fam-border)', borderRadius: '8px', fontSize: '12px', display: 'flex', gap: '12px', alignItems: 'center' } }, [
              el('span', { style: { fontFamily: 'monospace', fontSize: '10px', color: 'var(--fam-text-3)' } }, (j.id || '').slice(0, 8)),
              el('span', { style: { fontWeight: '600', color: 'var(--fam-text)' } }, j.type || '—'),
              el('span', { style: { fontSize: '11px', color: 'var(--fam-text-2)' } }, j.site_tag || '(global)'),
              el('span', { style: { marginLeft: 'auto', padding: '2px 8px', borderRadius: '99px', fontSize: '10px', fontWeight: '700', textTransform: 'uppercase', color: statusColor, border: '1px solid currentColor' } }, j.status || 'unknown')
            ]));
          }
        } catch (err) {
          list.appendChild(el('div', { style: { padding: '12px', background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.32)', borderRadius: '8px', color: 'var(--fam-red,#f87171)', fontSize: '12px' } }, '/api/jobs error: ' + err.message));
        }
      }

      await refresh();
      const interval = setInterval(() => {
        if (window.ShayWorkshop && window.ShayWorkshop.getActiveToolId() === 'active-job') refresh();
        else clearInterval(interval);
      }, 5000);
    }
  });

  // ── Built-in: Cost Tracker ────────────────────────────────────────────────
  registerTool({
    id: 'cost-tracker',
    name: 'Cost',
    icon: '$',
    appliesTo: ['*'],
    panel: function (container) {
      container.appendChild(el('div', { style: { fontSize: '11px', color: 'var(--fam-gold)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: '700', marginBottom: '8px' } }, 'Cost Tracker'));
      container.appendChild(el('h2', { style: { fontSize: '18px', fontWeight: '700', marginBottom: '4px', color: 'var(--fam-text)' } }, 'Session spend'));
      container.appendChild(el('p', { style: { color: 'var(--fam-text-2)', fontSize: '12px', marginBottom: '16px' } }, 'Live cost from window.cachedStudioState (Studio publishes session cost on every API call via lib/api-cost-tracker.js).'));
      const stats = el('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '16px' } });
      function statCard(label, value, color) {
        return el('div', { style: { padding: '14px', background: 'var(--fam-bg-2)', border: '1px solid var(--fam-border)', borderRadius: '10px' } }, [
          el('div', { style: { fontSize: '10px', color: 'var(--fam-text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: '700' } }, label),
          el('div', { style: { fontSize: '22px', fontWeight: '700', color: color || 'var(--fam-text)', marginTop: '4px', fontFamily: 'monospace' } }, value)
        ]);
      }
      // Read live state if present
      const state = window.cachedStudioState || {};
      const sessionCost = (state.session_cost != null) ? state.session_cost : 0;
      const tokensIn = (state.tokens_in != null) ? state.tokens_in : 0;
      const tokensOut = (state.tokens_out != null) ? state.tokens_out : 0;
      stats.appendChild(statCard('Session $', '$' + Number(sessionCost).toFixed(4), 'var(--fam-green,#4ade80)'));
      stats.appendChild(statCard('Tokens in', tokensIn.toLocaleString ? tokensIn.toLocaleString() : String(tokensIn)));
      stats.appendChild(statCard('Tokens out', tokensOut.toLocaleString ? tokensOut.toLocaleString() : String(tokensOut)));
      container.appendChild(stats);
      container.appendChild(el('div', { style: { padding: '10px 12px', background: 'rgba(245,196,0,0.08)', border: '1px solid rgba(245,196,0,0.2)', borderRadius: '8px', fontSize: '11px', color: 'var(--fam-text-2)' } }, 'Iteration 3: per-tool / per-job cost breakdown, model-by-model, with caps + alerts.'));
    }
  });

  // Mount as soon as the Workshop shell exists
  function tryMount() {
    if (document.getElementById('shay-workshop-shell')) {
      ensureMounted();
      activateTool('workbench');
    } else {
      setTimeout(tryMount, 200);
    }
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', tryMount);
  } else {
    tryMount();
  }

  window.ShayWorkshop = {
    registerTool: registerTool,
    activateTool: activateTool,
    listTools: listTools,
    getActiveToolId: () => activeId
  };
})();
