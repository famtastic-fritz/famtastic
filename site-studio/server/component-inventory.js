// Lane C — Component Inventory
// Reads site-studio/lib/famtastic-skeletons.js and enumerates exported
// skeletons/components into a normalized inventory shape that the Operator
// Workspace and the Studio's check-existing-before-creating gate can trust.
//
// Source-of-truth: only what the skeletons module actually exports.

'use strict';

const skeletons = require('../lib/famtastic-skeletons');

/**
 * Tiny Levenshtein distance — iterative DP, O(n*m) memory.
 * Kept under 30 lines per task contract.
 */
function levenshtein(a, b) {
  if (a === b) return 0;
  if (!a) return b.length;
  if (!b) return a.length;
  const m = a.length;
  const n = b.length;
  const prev = new Array(n + 1);
  const curr = new Array(n + 1);
  for (let j = 0; j <= n; j++) prev[j] = j;
  for (let i = 1; i <= m; i++) {
    curr[0] = i;
    for (let j = 1; j <= n; j++) {
      const cost = a.charCodeAt(i - 1) === b.charCodeAt(j - 1) ? 0 : 1;
      curr[j] = Math.min(
        curr[j - 1] + 1,
        prev[j] + 1,
        prev[j - 1] + cost
      );
    }
    for (let j = 0; j <= n; j++) prev[j] = curr[j];
  }
  return prev[n];
}

function classifyExport(key, value) {
  // String skeletons are the primary inventory items.
  if (typeof value === 'string') {
    if (/SKELETON|TEMPLATE|NOTE|PROHIBITION/i.test(key)) return 'skeleton';
    return 'component';
  }
  if (typeof value === 'function') return null; // helpers like extractLogoSVGs
  if (Array.isArray(value)) return 'component';
  if (value && typeof value === 'object') return 'component';
  return null;
}

function listInventory() {
  const out = [];
  for (const key of Object.keys(skeletons)) {
    const value = skeletons[key];
    const kind = classifyExport(key, value);
    if (!kind) continue;
    out.push({
      id: key.toLowerCase(),
      name: key,
      kind,
      state: 'green',
      evidence: 'famtastic-skeletons.js export',
      slots: [],
      props: [],
      content_required: []
    });
  }
  return out;
}

/**
 * checkExisting — diff-match a proposed id against current inventory.
 * Returns { exists, near, missing } where:
 *   exists  = true when proposal.id matches an inventory id exactly
 *   near    = closest id within Levenshtein distance <= 3, else null
 *   missing = [] for now (reserved for slot/prop diff in a later wave)
 */
function checkExisting(proposal) {
  const inv = listInventory();
  const id = String((proposal && proposal.id) || '').toLowerCase();
  if (!id) return { exists: false, near: null, missing: [] };

  let exact = false;
  let bestId = null;
  let bestDist = Infinity;
  for (const item of inv) {
    if (item.id === id) {
      exact = true;
      break;
    }
    const d = levenshtein(id, item.id);
    if (d < bestDist) {
      bestDist = d;
      bestId = item.id;
    }
  }
  if (exact) return { exists: true, near: null, missing: [] };
  return {
    exists: false,
    near: bestDist <= 3 ? bestId : null,
    missing: []
  };
}

/**
 * Surgical insertion contract — the schema every proposed mutation must
 * satisfy before Studio will write to a page. Frozen so callers cannot
 * mutate the canonical shape at runtime.
 */
const SURGICAL_INSERTION_CONTRACT = Object.freeze({
  page: 'string — relative page path, e.g. "index.html"',
  slot_id: 'string — stable slot identifier on the target page',
  intent: 'string — classifier intent, e.g. "content_update"',
  replaces_section_id: 'string|null — section to replace, null for insert',
  props: 'object — typed prop bag passed to the component',
  content_required: 'string[] — content keys that MUST be present'
});

module.exports = {
  listInventory,
  checkExisting,
  SURGICAL_INSERTION_CONTRACT,
  // exported for tests
  _levenshtein: levenshtein
};
