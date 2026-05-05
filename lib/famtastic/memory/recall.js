/**
 * recall — query the canonical memory store.
 *
 * Reads memory/INDEX.json (fast path) and optionally hydrates the markdown body
 * from memory/<type>/<id>.md when needed. Filters by facets, types, and lifecycle.
 *
 * Per chat-capture-learn-optimize plan, ws_retriever.
 */

const fs = require('fs');
const path = require('path');

const REPO_ROOT = path.resolve(__dirname, '..', '..', '..');
const MEMORY = path.join(REPO_ROOT, 'memory');
const INDEX = path.join(MEMORY, 'INDEX.json');
const USAGE = path.join(MEMORY, 'usage.jsonl');

function logSurfaced(memoryId, context = {}) {
  if (process.env.MEMORY_TELEMETRY === 'off') return;
  const line = JSON.stringify({
    ts: new Date().toISOString(),
    memory_id: memoryId,
    event: 'surfaced',
    context,
  }) + '\n';
  try { fs.appendFileSync(USAGE, line); } catch (_) {}
}

function loadIndex() {
  if (!fs.existsSync(INDEX)) return { entries: [] };
  try { return JSON.parse(fs.readFileSync(INDEX, 'utf8')); }
  catch (_) { return { entries: [] }; }
}

function score(entry, opts) {
  let s = 0;
  // Type match
  if (opts.types && opts.types.includes(entry.type)) s += 5;
  // Facet overlap
  const want = new Set(opts.facets || []);
  if (want.size && entry.facets) {
    const hits = entry.facets.filter(f => want.has(f)).length;
    s += hits * 3;
  }
  // Confidence weight
  s += (entry.confidence || 0) * 2;
  // Lifecycle (active > candidate > stale > retired/superseded)
  const lifeWeight = { active: 3, candidate: 2, stale: 1, retired: 0, superseded: 0 };
  s += lifeWeight[entry.lifecycle] ?? 0;
  return s;
}

function passesFilter(entry, opts) {
  if (opts.types && opts.types.length && !opts.types.includes(entry.type)) return false;
  if (opts.lifecycle && opts.lifecycle.length) {
    const list = Array.isArray(opts.lifecycle) ? opts.lifecycle : [opts.lifecycle];
    if (!list.includes(entry.lifecycle)) return false;
  }
  if (opts.facets && opts.facets.length) {
    const want = new Set(opts.facets);
    if (!entry.facets || !entry.facets.some(f => want.has(f))) return false;
  }
  return true;
}

/**
 * recall — synchronous query.
 * @param {object} opts
 * @param {string[]} [opts.facets] — match any of these facets
 * @param {string[]} [opts.types] — match any of these types
 * @param {string|string[]} [opts.lifecycle='active']
 * @param {number} [opts.limit=8]
 * @param {boolean} [opts.hydrateBody=false] — also read .md file body
 * @param {object} [opts.context] — context to include in telemetry
 * @returns {Array} entries sorted by relevance
 */
function recall(opts = {}) {
  const o = {
    facets: opts.facets || [],
    types: opts.types || null,
    lifecycle: opts.lifecycle || ['active', 'candidate'],
    limit: opts.limit ?? 8,
    hydrateBody: !!opts.hydrateBody,
    context: opts.context || {},
  };

  const idx = loadIndex();
  const filtered = idx.entries.filter(e => passesFilter(e, o));
  filtered.sort((a, b) => score(b, o) - score(a, o));
  const top = filtered.slice(0, o.limit);

  for (const e of top) {
    logSurfaced(e.canonical_id, o.context);
    if (o.hydrateBody) {
      try { e.body = fs.readFileSync(path.join(REPO_ROOT, e.path), 'utf8'); }
      catch (_) {}
    }
  }
  return top;
}

module.exports = { recall };
