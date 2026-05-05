'use strict';

// lib/famtastic/research/index.js
// SHAY V2 (2026-05-02 iter 3): Shared research service (scaffold).
//
// Wraps the existing research-router (site-studio/lib/research-router.js) so
// any Studio can call it without coupling to Site Studio internals. Future
// iterations will move the underlying implementation into this directory.
//
// API:
//   research.query({ vertical, question, options }) → results
//   research.list({ vertical, limit }) → recent findings
//
// Status: SCAFFOLD. Real implementation lives in site-studio/lib/research-router.js
// for now; this module proxies to it. Iteration 4+ relocates the logic here.

const path = require('path');

let _underlying = null;
function load() {
  if (_underlying) return _underlying;
  try {
    _underlying = require(path.join(process.env.HOME || '/root', 'famtastic/site-studio/lib/research-router.js'));
  } catch (err) {
    console.warn('[famtastic/research] underlying router not available:', err.message);
    _underlying = null;
  }
  return _underlying;
}

async function query(opts) {
  const u = load();
  if (!u || typeof u.queryResearch !== 'function') {
    return { ok: false, error: 'research_router_not_loaded' };
  }
  try {
    const r = await u.queryResearch(opts.vertical, opts.question, opts.options || {});
    return { ok: true, result: r };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

function list(opts) {
  const u = load();
  if (!u || typeof u.listFindings !== 'function') {
    return { ok: false, error: 'research_router_not_loaded' };
  }
  try {
    const r = u.listFindings(opts || {});
    return { ok: true, findings: r };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

module.exports = { query, list };
