// Lane C — Operator Components panel client
// Renders /api/components into #op-components-body using DOM APIs only
// (no innerHTML on dynamic content). Waits up to 3s for window.__operator
// before fetching, so it stays cooperative with operator.js bootstrap.

(function () {
  'use strict';

  function waitForOperator(timeoutMs) {
    return new Promise(function (resolve) {
      const start = Date.now();
      (function tick() {
        if (window.__operator || Date.now() - start >= timeoutMs) {
          return resolve(window.__operator || null);
        }
        setTimeout(tick, 50);
      })();
    });
  }

  function makeRow(component) {
    const row = document.createElement('div');
    row.className = 'op-component-row';
    row.setAttribute('data-component-id', component.id);

    const name = document.createElement('div');
    name.className = 'op-component-name';
    name.textContent = component.name;
    row.appendChild(name);

    const evidence = document.createElement('div');
    evidence.className = 'op-component-evidence';
    evidence.textContent = component.evidence;
    row.appendChild(evidence);

    const chip = document.createElement('span');
    chip.className = 'op-component-chip op-component-chip--' + component.state;
    chip.textContent = component.state;
    row.appendChild(chip);

    return row;
  }

  function clearChildren(node) {
    while (node.firstChild) node.removeChild(node.firstChild);
  }

  function renderError(host, message) {
    clearChildren(host);
    const err = document.createElement('div');
    err.className = 'op-component-error';
    err.textContent = message;
    host.appendChild(err);
  }

  async function loadAndRender() {
    const host = document.getElementById('op-components-body');
    if (!host) return;
    try {
      const res = await fetch('/api/components', { credentials: 'same-origin' });
      if (!res.ok) {
        renderError(host, 'Component inventory unavailable (HTTP ' + res.status + ')');
        return;
      }
      const data = await res.json();
      const components = (data && Array.isArray(data.components)) ? data.components : [];
      clearChildren(host);
      if (components.length === 0) {
        const empty = document.createElement('div');
        empty.className = 'op-component-empty';
        empty.textContent = 'No components registered.';
        host.appendChild(empty);
        return;
      }
      const frag = document.createDocumentFragment();
      components.forEach(function (c) { frag.appendChild(makeRow(c)); });
      host.appendChild(frag);
    } catch (err) {
      renderError(host, 'Component inventory error: ' + (err && err.message ? err.message : 'unknown'));
    }
  }

  document.addEventListener('DOMContentLoaded', function () {
    waitForOperator(3000).then(loadAndRender);
  });
})();
