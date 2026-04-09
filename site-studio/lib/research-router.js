'use strict';
/**
 * research-router.js — Routes research queries through the registry
 *
 * Flow:
 *   1. Check Pinecone (if configured) for cached answer
 *   2. Select best source for the vertical/question
 *   3. Query the source
 *   4. Store result in Pinecone (if configured)
 *   5. Log for effectiveness tracking
 */

const fs   = require('fs');
const path = require('path');
const { RESEARCH_REGISTRY, saveEffectivenessScore } = require('./research-registry');

const HUB_ROOT = path.resolve(__dirname, '..', '..');

// ── Research call log ─────────────────────────────────────────────────────────

const RESEARCH_LOG_FILE = path.join(HUB_ROOT, '.local', 'research-calls.jsonl');

function logResearchCall(source, vertical, question, result, fromCache) {
  try {
    const dir = path.dirname(RESEARCH_LOG_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const entry = JSON.stringify({
      ts: new Date().toISOString(),
      source,
      vertical,
      question: question.slice(0, 200),
      fromCache,
      hasAnswer: !!result.answer,
      cost: RESEARCH_REGISTRY[source]?.costPerQuery || 0,
    });
    fs.appendFileSync(RESEARCH_LOG_FILE, entry + '\n', 'utf8');
  } catch {}
}

// ── Pinecone query/upsert (graceful degradation) ──────────────────────────────

async function pineconeQuery(vertical, question) {
  if (!process.env.PINECONE_API_KEY) return null;
  try {
    const { Pinecone } = require('@pinecone-database/pinecone');
    const pc    = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
    const index = pc.index('famtastic-intelligence');
    const result = await index.namespace(vertical).query({
      topK: 1,
      includeMetadata: true,
      vector: new Array(1536).fill(0.1),
      filter: { question: { $eq: question.slice(0, 100) } },
    });
    const match = result.matches?.[0];
    if (!match || match.score < 0.85) return null;

    // Check staleness (90 days)
    const ts = match.metadata?.timestamp;
    if (ts) {
      const age = (Date.now() - new Date(ts).getTime()) / (1000 * 60 * 60 * 24);
      if (age > 90) {
        console.log(`[research] Stale result (${Math.round(age)}d old) for ${vertical}`);
        return { stale: true, answer: match.metadata?.answer, source: match.metadata?.source };
      }
    }
    return { answer: match.metadata?.answer, source: match.metadata?.source, score: match.score };
  } catch { return null; }
}

async function pineconeUpsert(vertical, question, answer, source) {
  if (!process.env.PINECONE_API_KEY) return;
  try {
    const { Pinecone } = require('@pinecone-database/pinecone');
    const pc    = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
    const index = pc.index('famtastic-intelligence');
    const id = `${vertical}-${source}-${Date.now()}`;
    await index.namespace(vertical).upsert([{
      id,
      values: new Array(1536).fill(0.1),
      metadata: {
        question: question.slice(0, 100),
        answer: answer.slice(0, 1000),
        source,
        vertical,
        timestamp: new Date().toISOString(),
        cost: RESEARCH_REGISTRY[source]?.costPerQuery || 0,
      },
    }]);
  } catch {}
}

// ── Source selection ──────────────────────────────────────────────────────────

function selectSource(vertical, _question, options = {}) {
  if (options.forceSource && RESEARCH_REGISTRY[options.forceSource]) {
    return options.forceSource;
  }
  // Order: build_patterns → manual → gemini_loop → perplexity
  const order = ['build_patterns', 'manual', 'gemini_loop', 'perplexity'];
  return order.find(s => {
    const src = RESEARCH_REGISTRY[s];
    return src && (src.status === 'active' || (s === 'perplexity' && options.enablePerplexity));
  }) || 'build_patterns';
}

// ── Main query function ───────────────────────────────────────────────────────

async function queryResearch(vertical, question, options = {}) {
  // 1. Pinecone cache check
  const cached = await pineconeQuery(vertical, question);
  if (cached && !cached.stale) {
    logResearchCall(cached.source || 'pinecone_cache', vertical, question, { answer: cached.answer }, true);
    return { answer: cached.answer, source: cached.source || 'pinecone_cache', fromCache: true };
  }

  // If stale, we'll re-query but still have a fallback
  const fallbackAnswer = cached?.answer || null;

  // 2. Select source
  const source = selectSource(vertical, question, options);

  // 3. Query
  let result = { answer: null };
  try {
    result = await RESEARCH_REGISTRY[source].query(vertical, question);
  } catch (err) {
    console.error(`[research-router] ${source} error:`, err.message);
  }

  // 4. Store in Pinecone
  if (result.answer) {
    await pineconeUpsert(vertical, question, result.answer, source);
  }

  // 5. Log
  logResearchCall(source, vertical, question, result, false);

  // 6. Track effectiveness (deferred score — increments call count)
  saveEffectivenessScore(source, vertical, null);

  return {
    answer: result.answer || fallbackAnswer || `No research available for "${vertical}" vertical.`,
    source,
    fromCache: false,
    stale: !!cached?.stale,
  };
}

// ── Effectiveness rating (called after build completes) ───────────────────────

function rateResearch(source, vertical, score) {
  if (!source || !vertical || score < 1 || score > 5) return false;
  saveEffectivenessScore(source, vertical, score);
  return true;
}

module.exports = { queryResearch, rateResearch, selectSource, logResearchCall };
