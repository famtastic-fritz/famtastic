// site-studio/public/js/operator-refinement.js
//
// Lane F — small DOM module that fetches /api/refinement/contract and
// inserts a "Refinement contract" panel into the Visual Map zone listing
// the allowlists. Pure DOM (no innerHTML on dynamic data).

(function () {
  'use strict';

  function el(tag, attrs, children) {
    const node = document.createElement(tag);
    if (attrs) {
      for (const k of Object.keys(attrs)) {
        if (k === 'class') node.className = attrs[k];
        else if (k === 'text') node.textContent = attrs[k];
        else node.setAttribute(k, attrs[k]);
      }
    }
    if (children) {
      for (const c of children) {
        if (c) node.appendChild(c);
      }
    }
    return node;
  }

  function findVisualMapZone() {
    return (
      document.querySelector('[data-zone="visual-map"]') ||
      document.querySelector('#visual-map') ||
      document.querySelector('.visual-map') ||
      document.body
    );
  }

  function buildPanel(contract) {
    const panel = el('section', {
      class: 'fam-refinement-contract',
      'data-component': 'refinement-contract',
    });
    panel.appendChild(el('h3', { text: 'Refinement contract' }));

    const guarantee = el('p', { class: 'fam-refinement-guarantee' });
    guarantee.textContent = contract.guarantee || '';
    panel.appendChild(guarantee);

    const varsTitle = el('h4', { text: 'Allowed CSS variable prefixes' });
    panel.appendChild(varsTitle);
    const varsList = el('ul', { class: 'fam-refinement-vars' });
    (contract.allowed_var_prefixes || []).forEach((p) => {
      varsList.appendChild(el('li', { text: p }));
    });
    panel.appendChild(varsList);

    const classesTitle = el('h4', { text: 'Allowed class toggles' });
    panel.appendChild(classesTitle);
    const classesList = el('ul', { class: 'fam-refinement-classes' });
    (contract.allowed_class_toggles || []).forEach((c) => {
      classesList.appendChild(el('li', { text: c }));
    });
    panel.appendChild(classesList);

    return panel;
  }

  function mount() {
    const zone = findVisualMapZone();
    if (!zone) return;
    if (zone.querySelector('[data-component="refinement-contract"]')) return;
    fetch('/api/refinement/contract', { credentials: 'same-origin' })
      .then((r) => r.json())
      .then((data) => {
        if (!data || !data.ok || !data.contract) return;
        zone.appendChild(buildPanel(data.contract));
      })
      .catch(() => {
        /* non-blocker: log; continue */
      });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mount);
  } else {
    mount();
  }

  if (typeof window !== 'undefined') {
    window.OperatorRefinement = { mount };
  }
})();
