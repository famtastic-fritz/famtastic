'use strict';

// lib/famtastic/memory/index.js
// SHAY V2 (2026-05-02 iter 3): Shared memory service (scaffold).
//
// Three-layer memory model from shay-shay-architecture.md:
//   - Episodic: events (builds, edits, corrections, dismissals)
//   - Semantic: learned patterns (preferences, vertical rules, brand voice)
//   - Procedural: how-to rules (BEM vocabulary, logo flow, pipeline order)
//
// Status: SCAFFOLD. Wraps the existing site-studio/lib/memory.js for now.
// Iteration 4+ moves Mem0 + Kuzu integration here as the canonical layer.

const path = require('path');

let _underlying = null;
function load() {
  if (_underlying) return _underlying;
  try {
    _underlying = require(path.join(process.env.HOME || '/root', 'famtastic/site-studio/lib/memory.js'));
  } catch (err) {
    console.warn('[famtastic/memory] underlying memory module not available:', err.message);
    _underlying = null;
  }
  return _underlying;
}

// Shape of a memory entry (proposed; iteration 4 formalizes):
//   { id, layer, scope, key, value, attribution, created_at, decay_weight }
//   layer  = 'episodic' | 'semantic' | 'procedural'
//   scope  = 'global' | 'studio:<id>' | 'site:<tag>' | 'session:<id>'

function remember(entry) {
  const u = load();
  if (!u || typeof u.remember !== 'function') {
    return { ok: false, error: 'memory_underlying_not_loaded' };
  }
  return { ok: true, result: u.remember(entry) };
}

function recall(opts) {
  const u = load();
  if (!u || typeof u.recall !== 'function') {
    return { ok: false, error: 'memory_underlying_not_loaded' };
  }
  return { ok: true, result: u.recall(opts) };
}

module.exports = { remember, recall };
