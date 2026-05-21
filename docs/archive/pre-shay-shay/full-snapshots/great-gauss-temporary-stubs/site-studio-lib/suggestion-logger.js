'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const SUGGESTIONS_PATH = path.join(process.env.HOME, '.local', 'share', 'famtastic', 'suggestions.jsonl');
const PROMOTIONS_PATH = path.join(process.env.HOME, '.local', 'share', 'famtastic', 'suggestion-promotions.jsonl');

const OUTCOMES = {
  SHIPPED: 1.5,   // accepted + build succeeded + deployed
  ACCEPTED: 1.0,  // Fritz approved the plan card / used the suggestion
  EDITED: 0.7,    // accepted but modified before use
  DISMISSED: 0.3, // explicitly dismissed
  IGNORED: 0.1,   // no response within session
};

const PROMOTION_THRESHOLD = 3;
const PROMOTION_MIN_SCORE = 1.0;

function ensureDir() {
  fs.mkdirSync(path.dirname(SUGGESTIONS_PATH), { recursive: true });
}

function loadSuggestions() {
  if (!fs.existsSync(SUGGESTIONS_PATH)) return [];
  return fs.readFileSync(SUGGESTIONS_PATH, 'utf8')
    .split('\n').filter(Boolean)
    .map(l => { try { return JSON.parse(l); } catch { return null; } })
    .filter(Boolean);
}

function logSuggestion(suggestion, context = {}) {
  ensureDir();
  const entry = {
    id: crypto.randomBytes(6).toString('hex'),
    timestamp: new Date().toISOString(),
    suggestion: typeof suggestion === 'string' ? suggestion.slice(0, 300) : JSON.stringify(suggestion).slice(0, 300),
    context: {
      active_site: context.active_site || null,
      intent: context.intent || null,
      source: context.source || 'unknown',
      weight: context.weight || 1.0,
    },
    outcome: null,
    score: null,
  };
  fs.appendFileSync(SUGGESTIONS_PATH, JSON.stringify(entry) + '\n');
  return entry.id;
}

function logOutcome(id, outcomeKey) {
  if (!OUTCOMES[outcomeKey]) return;
  const score = OUTCOMES[outcomeKey];
  const suggestions = loadSuggestions().map(s => {
    if (s.id === id) return { ...s, outcome: outcomeKey, score, resolved_at: new Date().toISOString() };
    return s;
  });
  rewrite(suggestions);
  checkPromotion(suggestions, id);
}

function rewrite(suggestions) {
  ensureDir();
  fs.writeFileSync(SUGGESTIONS_PATH, suggestions.map(s => JSON.stringify(s)).join('\n') + '\n');
}

function checkPromotion(suggestions, resolvedId) {
  const resolved = suggestions.find(s => s.id === resolvedId);
  if (!resolved || !resolved.score || resolved.score < PROMOTION_MIN_SCORE) return;

  // Find similar suggestions by source + intent pattern
  const pattern = `${resolved.context.source}::${resolved.context.intent}`;
  const matches = suggestions.filter(s =>
    s.score >= PROMOTION_MIN_SCORE &&
    `${s.context.source}::${s.context.intent}` === pattern
  );

  if (matches.length >= PROMOTION_THRESHOLD) {
    ensureDir();
    const promotion = {
      timestamp: new Date().toISOString(),
      pattern,
      source: resolved.context.source,
      intent: resolved.context.intent,
      active_site: resolved.context.active_site,
      high_score_count: matches.length,
      avg_score: matches.reduce((a, s) => a + s.score, 0) / matches.length,
      suggestion_ids: matches.map(s => s.id),
    };
    fs.appendFileSync(PROMOTIONS_PATH, JSON.stringify(promotion) + '\n');
    console.log(`[suggestion-logger] pattern promoted: ${pattern} (${matches.length} high-score matches)`);
  }
}

function loadPendingSuggestions(since = null) {
  return loadSuggestions().filter(s => {
    if (s.outcome !== null) return false;
    if (since) return new Date(s.timestamp) > new Date(since);
    return true;
  });
}

module.exports = { logSuggestion, logOutcome, loadPendingSuggestions, OUTCOMES };
