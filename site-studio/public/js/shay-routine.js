// shay-routine.js
// SHAY V2 (2026-05-02 iter 3): Show-Me-How routine engine.
//
// API:
//   ShayRoutine.register({ id, name, intent, steps: [...] })
//   ShayRoutine.run(id)              — start routine
//   ShayRoutine.next()               — advance to next step
//   ShayRoutine.stop()               — abort
//   ShayRoutine.list()               — list registered routines
//
// Step shape:
//   { action: 'navigate' | 'spotlight' | 'wait_for_user' | 'click' | 'fill',
//     target: '<css selector>' (for spotlight/click/fill),
//     value: '<text>' (for fill),
//     narration: '<what Shay says about this step>',
//     callout: '<extra text in spotlight callout>',
//     auto_advance_ms: 1500 (optional; auto-continue after delay) }
//
// Comes with one starter routine: 'show-me-how:settings.domain'.
// Future routines registered by other modules / studios.

(function () {
  'use strict';

  const routines = new Map();
  let active = null;

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

  function register(opts) {
    if (!opts || !opts.id) { console.error('[shay-routine] register: id required'); return false; }
    if (!Array.isArray(opts.steps) || !opts.steps.length) { console.error('[shay-routine] register: steps[] required'); return false; }
    routines.set(opts.id, {
      id: opts.id,
      name: opts.name || opts.id,
      intent: opts.intent || '',
      steps: opts.steps
    });
    return true;
  }

  function list() {
    return Array.from(routines.values()).map(r => ({ id: r.id, name: r.name, steps: r.steps.length }));
  }

  function run(id) {
    const r = routines.get(id);
    if (!r) { console.error('[shay-routine] unknown routine:', id); return false; }
    if (active) stop();
    active = { routine: r, step_idx: 0 };
    renderPanel();
    setStatusBar(true, r.id);
    executeStep();
    window.dispatchEvent(new CustomEvent('shay:routine:started', { detail: { routine_id: id } }));
    return true;
  }

  function stop() {
    clearSpotlight();
    closePanel();
    setStatusBar(false);
    if (active) window.dispatchEvent(new CustomEvent('shay:routine:stopped', { detail: { routine_id: active.routine.id } }));
    active = null;
  }

  function next() {
    if (!active) return;
    active.step_idx++;
    if (active.step_idx >= active.routine.steps.length) {
      window.dispatchEvent(new CustomEvent('shay:routine:complete', { detail: { routine_id: active.routine.id } }));
      stop();
      return;
    }
    executeStep();
  }

  function userTakesOver() {
    if (active) window.dispatchEvent(new CustomEvent('shay:routine:handed-back', { detail: { routine_id: active.routine.id, at_step: active.step_idx } }));
    stop();
  }

  function executeStep() {
    if (!active) return;
    const step = active.routine.steps[active.step_idx];
    clearSpotlight();
    updatePanel();

    switch (step.action) {
      case 'navigate':
        if (step.target) {
          const link = document.querySelector(step.target);
          if (link) link.click();
        }
        if (step.auto_advance_ms) setTimeout(() => { if (active && active.step_idx === thisStepIdx()) next(); }, step.auto_advance_ms);
        break;

      case 'spotlight':
        spotlight(step.target, step.callout || '');
        // wait for user advance
        break;

      case 'click':
        if (step.target) {
          const elNode = document.querySelector(step.target);
          if (elNode) elNode.click();
        }
        if (step.auto_advance_ms) setTimeout(() => { if (active && active.step_idx === thisStepIdx()) next(); }, step.auto_advance_ms);
        break;

      case 'fill':
        if (step.target) {
          const elNode = document.querySelector(step.target);
          if (elNode) {
            elNode.focus();
            if ('value' in elNode) {
              elNode.value = step.value || '';
              elNode.dispatchEvent(new Event('input', { bubbles: true }));
              elNode.dispatchEvent(new Event('change', { bubbles: true }));
            }
          }
        }
        break;

      case 'wait_for_user':
      default:
        // panel waits for Continue / Hand-back
        break;
    }
  }

  function thisStepIdx() { return active ? active.step_idx : -1; }

  // ── Spotlight overlay ────────────────────────────────────────────────────
  let spotlightEl = null;
  let calloutEl = null;
  let dimEl = null;

  function clearSpotlight() {
    if (spotlightEl) { spotlightEl.remove(); spotlightEl = null; }
    if (calloutEl) { calloutEl.remove(); calloutEl = null; }
    if (dimEl) { dimEl.remove(); dimEl = null; }
  }

  function spotlight(selector, calloutText) {
    if (!selector) return;
    const target = document.querySelector(selector);
    if (!target) {
      console.warn('[shay-routine] spotlight target not found:', selector);
      return;
    }
    target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setTimeout(() => doSpotlight(target, calloutText), 250);
  }

  function doSpotlight(target, calloutText) {
    const r = target.getBoundingClientRect();
    const pad = 6;

    // Dim layer
    dimEl = el('div', { style: {
      position: 'fixed', top: '0', left: '0', right: '0', bottom: '0',
      background: 'rgba(0,0,0,0.55)', zIndex: '99000', pointerEvents: 'none'
    } });
    document.body.appendChild(dimEl);

    // Spotlight ring
    spotlightEl = el('div', { style: {
      position: 'fixed',
      top: (r.top - pad) + 'px',
      left: (r.left - pad) + 'px',
      width: (r.width + pad * 2) + 'px',
      height: (r.height + pad * 2) + 'px',
      border: '2px solid #f5c400',
      borderRadius: '10px',
      boxShadow: '0 0 0 4px rgba(245,196,0,0.18), 0 0 60px rgba(245,196,0,0.55), 0 0 9999px rgba(0,0,0,0.7)',
      zIndex: '99001', pointerEvents: 'none',
      animation: 'shay-routine-pulse 2s ease-in-out infinite'
    } });
    if (!document.getElementById('shay-routine-keyframes')) {
      const styleNode = document.createElement('style');
      styleNode.id = 'shay-routine-keyframes';
      styleNode.textContent = '@keyframes shay-routine-pulse{0%,100%{box-shadow:0 0 0 4px rgba(245,196,0,0.18),0 0 60px rgba(245,196,0,0.55),0 0 9999px rgba(0,0,0,0.7)}50%{box-shadow:0 0 0 6px rgba(245,196,0,0.25),0 0 80px rgba(245,196,0,0.7),0 0 9999px rgba(0,0,0,0.7)}}';
      document.head.appendChild(styleNode);
    }
    document.body.appendChild(spotlightEl);

    // Callout
    if (calloutText) {
      const callRight = window.innerWidth - r.right > 320;
      calloutEl = el('div', { style: {
        position: 'fixed',
        top: Math.max(12, r.top) + 'px',
        [callRight ? 'left' : 'right']: callRight ? (r.right + 18) + 'px' : (window.innerWidth - r.left + 18) + 'px',
        width: '320px',
        background: '#14141a', color: '#f0f0f5',
        border: '1px solid rgba(245,196,0,0.32)',
        borderRadius: '12px', padding: '14px 16px',
        boxShadow: '0 16px 40px rgba(0,0,0,0.6)',
        zIndex: '99002', fontSize: '13px', lineHeight: '1.55',
        fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif'
      } }, calloutText);
      document.body.appendChild(calloutEl);
    }
  }

  // ── Routine panel (bottom-right) ─────────────────────────────────────────
  let panelEl = null;

  function renderPanel() {
    closePanel();
    panelEl = el('div', { id: 'shay-routine-panel', style: {
      position: 'fixed', bottom: '60px', right: '24px', width: '360px',
      background: '#14141a', border: '1px solid rgba(245,196,0,0.32)',
      borderRadius: '14px',
      boxShadow: '0 16px 50px rgba(0,0,0,0.7), 0 0 0 1px rgba(245,196,0,0.18)',
      zIndex: '99100', overflow: 'hidden',
      fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
      color: '#f0f0f5'
    } });
    document.body.appendChild(panelEl);
    updatePanel();
  }

  function closePanel() { if (panelEl) { panelEl.remove(); panelEl = null; } }

  function updatePanel() {
    if (!panelEl || !active) return;
    panelEl.innerHTML = '';
    const r = active.routine;
    const step = r.steps[active.step_idx];
    const total = r.steps.length;
    const cur = active.step_idx + 1;

    panelEl.appendChild(el('div', { style: { padding: '12px 14px', background: 'linear-gradient(180deg,rgba(245,196,0,0.14),transparent)', borderBottom: '1px solid rgba(255,255,255,0.06)' } }, [
      el('div', { style: { fontSize: '13px', fontWeight: '600' } }, 'Shay-Shay · running routine'),
      el('div', { style: { fontSize: '10px', color: '#a0a0aa', textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: '2px' } }, r.id)
    ]));

    const body = el('div', { style: { padding: '14px' } });
    const counter = el('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' } });
    counter.appendChild(el('span', { style: { fontSize: '11px', color: '#606068', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.06em' } }, 'Step ' + cur + ' of ' + total));
    const progress = el('div', { style: { display: 'flex', gap: '4px' } });
    for (let i = 0; i < total; i++) {
      progress.appendChild(el('div', { style: { width: '24px', height: '4px', borderRadius: '2px', background: i < cur ? '#f5c400' : (i === active.step_idx ? '#f5c400' : '#25252f'), boxShadow: i === active.step_idx ? '0 0 8px rgba(245,196,0,0.55)' : 'none' } }));
    }
    counter.appendChild(progress);
    body.appendChild(counter);

    body.appendChild(el('div', { style: { background: '#1c1c24', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', padding: '11px 12px', fontSize: '13px', lineHeight: '1.55', marginBottom: '12px' } }, step.narration || ''));

    const ctrls = el('div', { style: { display: 'flex', gap: '6px' } });
    const btnContinue = el('button', { type: 'button', style: { flex: '1', padding: '8px 10px', borderRadius: '8px', border: '1px solid #f5c400', background: '#f5c400', color: '#1a1a00', fontSize: '12px', fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit' }, on: { click: next } }, cur < total ? 'Continue' : 'Done');
    const btnHandback = el('button', { type: 'button', style: { flex: '1', padding: '8px 10px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.16)', background: 'transparent', color: '#a0a0aa', fontSize: '12px', fontWeight: '500', cursor: 'pointer', fontFamily: 'inherit' }, on: { click: userTakesOver } }, "I'll take it from here");
    const btnStop = el('button', { type: 'button', style: { padding: '8px 10px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.16)', background: 'transparent', color: '#606068', fontSize: '12px', cursor: 'pointer', fontFamily: 'inherit' }, on: { click: stop } }, 'Stop');
    ctrls.appendChild(btnContinue);
    ctrls.appendChild(btnHandback);
    ctrls.appendChild(btnStop);
    body.appendChild(ctrls);

    if (r.intent) body.appendChild(el('div', { style: { padding: '10px 14px', background: '#1c1c24', borderTop: '1px solid rgba(255,255,255,0.06)', marginTop: '12px', marginLeft: '-14px', marginRight: '-14px', marginBottom: '-14px', fontSize: '11px', color: '#606068', fontStyle: 'italic' } }, ['Original intent: ', el('strong', { style: { color: '#a0a0aa', fontStyle: 'normal' } }, '"' + r.intent + '"')]));

    panelEl.appendChild(body);
  }

  function setStatusBar(active, routineId) {
    let bar = document.getElementById('shay-routine-status-pill');
    if (active) {
      if (!bar) {
        bar = el('div', { id: 'shay-routine-status-pill', style: { position: 'fixed', bottom: '8px', left: '70px', padding: '4px 10px', background: 'rgba(245,196,0,0.14)', border: '1px solid rgba(245,196,0,0.32)', borderRadius: '99px', color: '#f5c400', fontSize: '11px', fontWeight: '600', zIndex: '99050', fontFamily: 'monospace' } });
        document.body.appendChild(bar);
      }
      bar.textContent = '★ ' + routineId;
    } else if (bar) {
      bar.remove();
    }
  }

  // ── Built-in routine: change site domain ─────────────────────────────────
  // Uses defensive selectors. If the underlying DOM changes, the routine warns
  // (via console) and the panel still renders so the user can hand back.
  register({
    id: 'show-me-how:settings.domain',
    name: 'Change site domain',
    intent: "I don't know how to change the site domain, can you show me where?",
    steps: [
      { action: 'navigate', target: '[data-rail="settings"], [data-tab="settings"]', narration: 'Opening Settings for you…', auto_advance_ms: 600 },
      { action: 'spotlight', target: 'input[name="custom_domain"], #site-config-domain, [data-field="domain"], input[placeholder*="domain"i]', narration: 'Brought you to Settings. The Custom Domain field is highlighted.', callout: 'This is where you change it. Type the new domain here, then click Save.' },
      { action: 'wait_for_user', narration: "Type your new domain, then save. I'll wait." }
    ]
  });

  window.ShayRoutine = { register, list, run, next, stop };
})();
