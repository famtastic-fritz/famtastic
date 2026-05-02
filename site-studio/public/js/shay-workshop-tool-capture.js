// shay-workshop-tool-capture.js
// SHAY V2 (2026-05-02 iter 3): Workshop tool — Capture Inspector.
// Registers with ShayWorkshop, fetches from /api/capture/*, renders summary +
// captures list + pattern candidates.

(function () {
  'use strict';

  function ready(fn) {
    if (window.ShayWorkshop && window.ShayWorkshop.registerTool) fn();
    else setTimeout(() => ready(fn), 200);
  }

  function el(tag, attrs, kids) {
    const n = document.createElement(tag);
    if (attrs) for (const k of Object.keys(attrs)) {
      if (k === 'style') Object.assign(n.style, attrs[k]);
      else if (k === 'on') for (const e of Object.keys(attrs[k])) n.addEventListener(e, attrs[k][e]);
      else n.setAttribute(k, attrs[k]);
    }
    if (kids) for (const c of [].concat(kids).filter(Boolean)) n.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
    return n;
  }

  async function fetchJson(path) {
    try {
      const r = await fetch(path, { credentials: 'same-origin' });
      if (!r.ok) throw new Error(r.status + ' ' + r.statusText);
      return await r.json();
    } catch (err) { return { __error: err.message }; }
  }

  ready(() => {
    window.ShayWorkshop.registerTool({
      id: 'capture-inspector',
      name: 'Capture',
      icon: '◉',
      appliesTo: ['*'],
      panel: async function (container) {
        container.appendChild(el('div', { style: { fontSize: '11px', color: 'var(--fam-gold)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: '700', marginBottom: '8px' } }, 'Capture Inspector'));
        container.appendChild(el('h2', { style: { fontSize: '18px', fontWeight: '700', marginBottom: '4px', color: 'var(--fam-text)' } }, 'Knowledge capture flywheel'));
        container.appendChild(el('p', { style: { color: 'var(--fam-text-2)', fontSize: '12px', marginBottom: '16px' } }, 'Live view of captured insights and pending promotions. Endpoints: /api/capture/*. Mount route in server.js if not already (lib/famtastic/capture/route.js).'));

        const statsRow = el('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', marginBottom: '16px' } });
        container.appendChild(statsRow);

        const capList = el('div', { style: { marginBottom: '20px' } });
        container.appendChild(el('h3', { style: { fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--fam-text-2)', fontWeight: '700', marginBottom: '8px' } }, 'Captures'));
        container.appendChild(capList);

        const patList = el('div', {});
        container.appendChild(el('h3', { style: { fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--fam-text-2)', fontWeight: '700', marginBottom: '8px' } }, 'Pattern candidates (3+ recurrences)'));
        container.appendChild(patList);

        function statCard(label, value, color) {
          return el('div', { style: { padding: '12px', background: 'var(--fam-bg-2)', border: '1px solid var(--fam-border)', borderRadius: '10px' } }, [
            el('div', { style: { fontSize: '10px', color: 'var(--fam-text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: '700' } }, label),
            el('div', { style: { fontSize: '20px', fontWeight: '700', color: color || 'var(--fam-text)', marginTop: '4px', fontFamily: 'monospace' } }, String(value))
          ]);
        }

        const summary = await fetchJson('/api/capture/summary');
        if (summary.__error) {
          container.appendChild(el('div', { style: { padding: '14px', background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.32)', borderRadius: '10px', color: 'var(--fam-red,#f87171)', fontSize: '12px' } },
            'Capture endpoints not mounted on server (' + summary.__error + '). Add to server.js: app.use(\'/api/capture\', require(\'./lib/famtastic/capture/route.js\'))'
          ));
          return;
        }

        statsRow.appendChild(statCard('Captures',     summary.existing_captures, 'var(--fam-gold)'));
        statsRow.appendChild(statCard('Web chats',    summary.imports.web_chats));
        statsRow.appendChild(statCard('Cowork sess.', summary.imports.cowork_sessions));
        statsRow.appendChild(statCard('Studio convos', summary.studio_conversations));

        const captures = await fetchJson('/api/capture/captures');
        if (Array.isArray(captures) && captures.length) {
          for (const c of captures) {
            const row = el('div', { style: { padding: '8px 12px', background: 'var(--fam-bg-2)', border: '1px solid var(--fam-border)', borderRadius: '8px', marginBottom: '6px', fontSize: '12px', fontFamily: 'monospace', color: 'var(--fam-text)', cursor: 'pointer' } }, c.name);
            row.addEventListener('click', () => window.open('/api/bridge/read?path=' + encodeURIComponent(c.relative), '_blank'));
            capList.appendChild(row);
          }
        } else {
          capList.appendChild(el('div', { style: { padding: '10px', color: 'var(--fam-text-3)', fontSize: '12px', textAlign: 'center', border: '1px dashed var(--fam-border)', borderRadius: '8px' } }, 'No captures yet.'));
        }

        const pats = await fetchJson('/api/capture/patterns');
        if (pats.__error) {
          patList.appendChild(el('div', { style: { color: 'var(--fam-text-3)', fontSize: '12px' } }, 'pattern endpoint error'));
        } else if (pats.patterns && pats.patterns.length) {
          for (const p of pats.patterns) {
            patList.appendChild(el('div', { style: { padding: '10px 12px', background: 'rgba(245,196,0,0.06)', border: '1px solid rgba(245,196,0,0.24)', borderRadius: '8px', marginBottom: '6px', fontSize: '12px', color: 'var(--fam-text)' } }, [
              el('div', { style: { fontWeight: '700', color: 'var(--fam-gold)' } }, '[' + p.count + '×] ' + p.signature),
              el('div', { style: { color: 'var(--fam-text-3)', fontSize: '11px', marginTop: '4px' } }, p.distinct_captures + ' distinct captures · type ' + p.type_prefix)
            ]));
          }
        } else {
          patList.appendChild(el('div', { style: { padding: '10px', color: 'var(--fam-text-3)', fontSize: '12px', textAlign: 'center', border: '1px dashed var(--fam-border)', borderRadius: '8px' } }, 'No patterns above threshold (need 3+ similar items across 2+ captures).'));
        }
      }
    });
  });
})();
