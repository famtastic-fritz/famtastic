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

// ---------------------------------------------------------------------------
// Sandbox helpers — Phase 2 Lane C2
// ---------------------------------------------------------------------------

'use strict';

const fs_io = require('fs');
const path_io = require('path');

// Tag allowlist: requires "site-" prefix per isSafeTag convention.
// Also allow bare tags (no "site-" prefix) that appear in the legacy
// SITES list so Component Studio can stage insertions without crashing.
// In both cases we run a strict allowlist regex to prevent path traversal.
const SAFE_TAG_RE = /^[a-z0-9][a-z0-9_-]{0,80}$/i;
const SAFE_SLOT_PAGE_RE = /^[a-zA-Z0-9._-]{1,64}$/;
const SAFE_COMPONENT_ID_RE = /^[a-z0-9][a-z0-9_-]{0,64}$/;

function _escapeHtmlAttr(s) {
  return String(s || '').replace(/[<>"&]/g, '');
}

/**
 * stagedInsert — write a safe HTML placeholder to the test sandbox.
 * The caller (route handler) has already validated inputs; we re-validate
 * here as defense-in-depth.
 *
 * @param {object} opts
 * @param {string} opts.sitesRoot  — absolute path to the sites/ directory
 * @param {string} opts.tag        — site directory name (e.g. "site-mbsh-reunion")
 * @param {string} opts.componentId
 * @param {string} opts.slot
 * @param {string} opts.page
 * @returns {{ ok: boolean, written?: string, history_entry?: object, error?: string }}
 */
function stagedInsert({ sitesRoot, tag, componentId, slot, page }) {
  // --- defense-in-depth validation ---
  if (!sitesRoot || typeof sitesRoot !== 'string') {
    return { ok: false, error: 'sitesRoot required' };
  }
  if (!SAFE_TAG_RE.test(tag) || tag.includes('..')) {
    return { ok: false, error: 'invalid tag' };
  }
  if (!SAFE_COMPONENT_ID_RE.test(componentId) || componentId.includes('..')) {
    return { ok: false, error: 'invalid componentId' };
  }
  if (!SAFE_SLOT_PAGE_RE.test(slot) || slot.includes('..')) {
    return { ok: false, error: 'invalid slot' };
  }
  if (!SAFE_SLOT_PAGE_RE.test(page) || page.includes('..')) {
    return { ok: false, error: 'invalid page' };
  }

  // --- resolve and contain sandbox dir ---
  const sandboxDir = path_io.resolve(
    path_io.join(sitesRoot, tag, '_test', 'inserts')
  );
  const expectedPrefix = path_io.resolve(path_io.join(sitesRoot, tag, '_test'));
  if (!sandboxDir.startsWith(expectedPrefix)) {
    return { ok: false, error: 'path containment check failed' };
  }

  try {
    fs_io.mkdirSync(sandboxDir, { recursive: true });
  } catch (err) {
    return { ok: false, error: `mkdirSync failed: ${err.message}` };
  }

  const ts = new Date().toISOString();
  const filename = `${_escapeHtmlAttr(componentId)}--${_escapeHtmlAttr(slot)}--${Date.now()}.html`;
  const filePath = path_io.join(sandboxDir, filename);

  // Containment: confirm resolved output path is under sandboxDir.
  if (!path_io.resolve(filePath).startsWith(sandboxDir)) {
    return { ok: false, error: 'output path containment check failed' };
  }

  // Escape user-influenced strings before embedding in HTML.
  const safeId   = _escapeHtmlAttr(componentId);
  const safeSlot = _escapeHtmlAttr(slot);
  const safePage = _escapeHtmlAttr(page);
  const safeTag  = _escapeHtmlAttr(tag);

  const html = [
    `<!-- staged insertion: ${safeId} @ ${safeSlot} on ${safePage} -->`,
    `<!-- generated ${ts} by /api/components/insert (test sandbox) -->`,
    `<!-- site: ${safeTag} -->`,
    `<div data-component="${safeId}" data-slot="${safeSlot}" data-page="${safePage}" data-staged="true">`,
    `  <!-- This is a sandbox staging marker. Real surgical insertion via`,
    `       lib/surgical-editor.js writes to <dist>/<page>.html and is wired`,
    `       in a later phase. -->`,
    `</div>`,
  ].join('\n');

  try {
    fs_io.writeFileSync(filePath, html, 'utf8');
  } catch (err) {
    return { ok: false, error: `writeFileSync failed: ${err.message}` };
  }

  // Relative path for the history record (relative to sitesRoot).
  const relPath = path_io.relative(sitesRoot, filePath);

  const history_entry = {
    ts,
    target_site: tag,
    target_page: page,
    target_slot: slot,
    component_id: componentId,
    original_fragment_ref: `${tag}:${page}:${slot}`,
    inserted_fragment_path: relPath,
    written: relPath,
    status: 'staged_local',
  };

  const historyFile = path_io.join(
    path_io.resolve(path_io.join(sitesRoot, tag, '_test')),
    'insertion-history.jsonl'
  );

  try {
    fs_io.appendFileSync(historyFile, JSON.stringify(history_entry) + '\n', 'utf8');
  } catch (err) {
    // Non-fatal — return ok but note the append failure.
    return { ok: true, written: relPath, history_entry, history_append_error: err.message };
  }

  return { ok: true, written: relPath, history_entry };
}

/**
 * listInsertions — read insertion-history.jsonl, return last 50 entries.
 * Fail-soft: returns [] on missing file or parse errors.
 */
function listInsertions({ sitesRoot, tag }) {
  if (!sitesRoot || typeof sitesRoot !== 'string') return [];
  if (!SAFE_TAG_RE.test(tag) || tag.includes('..')) return [];

  const historyFile = path_io.resolve(
    path_io.join(sitesRoot, tag, '_test', 'insertion-history.jsonl')
  );

  // Containment check.
  const expectedPrefix = path_io.resolve(path_io.join(sitesRoot, tag, '_test'));
  if (!historyFile.startsWith(expectedPrefix)) return [];

  try {
    if (!fs_io.existsSync(historyFile)) return [];
    const raw = fs_io.readFileSync(historyFile, 'utf8');
    const lines = raw.split('\n').filter(l => l.trim());
    const entries = lines.map(l => {
      try { return JSON.parse(l); } catch { return null; }
    }).filter(Boolean);
    // Last 50 lines.
    return entries.slice(-50);
  } catch {
    return [];
  }
}

module.exports = {
  listInventory,
  checkExisting,
  SURGICAL_INSERTION_CONTRACT,
  stagedInsert,
  listInsertions,
  // exported for tests
  _levenshtein: levenshtein
};
