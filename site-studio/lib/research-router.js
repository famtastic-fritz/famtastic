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
const os   = require('os');
const { RESEARCH_REGISTRY, saveEffectivenessScore } = require('./research-registry');
const { studioEvents, STUDIO_EVENTS } = require('./studio-events');

const HUB_ROOT = path.resolve(__dirname, '..', '..');

// ── Pinecone threshold (configurable, default 0.75) ──────────────────────────

function getThreshold() {
  try {
    const configPath = path.join(os.homedir(), '.config', 'famtastic', 'studio-config.json');
    if (fs.existsSync(configPath)) {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      if (config.research && typeof config.research.pinecone_threshold === 'number') {
        return config.research.pinecone_threshold;
      }
    }
  } catch {}
  return 0.75; // default
}

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

// ── Staleness re-query queue (single worker, prevents parallel flood) ─────────
// Correction 4 (Session 8 addendum): when multiple stale verticals are detected
// in rapid succession, queue them rather than firing simultaneous background calls.
const REQUERY_QUEUE = {
  pending:    new Set(),  // verticals awaiting refresh (Set deduplicates)
  processing: false,      // single-worker flag — at most 1 background call at a time
};

function enqueueRequery(vertical, question) {
  REQUERY_QUEUE.pending.add(JSON.stringify({ vertical, question }));
  console.log(`REQUERY_QUEUED — ${vertical} added to refresh queue (${REQUERY_QUEUE.pending.size} pending)`);
  if (!REQUERY_QUEUE.processing) processRequeryQueue();
}

async function processRequeryQueue() {
  if (REQUERY_QUEUE.processing || REQUERY_QUEUE.pending.size === 0) return;
  REQUERY_QUEUE.processing = true;
  const entry = REQUERY_QUEUE.pending.values().next().value;
  REQUERY_QUEUE.pending.delete(entry);
  try {
    const { vertical, question } = JSON.parse(entry);
    await backgroundRefresh(vertical, question, null);
  } catch {}
  REQUERY_QUEUE.processing = false;
  // Continue processing remaining queue entries
  if (REQUERY_QUEUE.pending.size > 0) setImmediate(processRequeryQueue);
}

// ── Pinecone query/upsert (graceful degradation) ──────────────────────────────

async function pineconeQuery(vertical, question) {
  if (!process.env.PINECONE_API_KEY) return null;
  try {
    const { Pinecone } = require('@pinecone-database/pinecone');
    const pc    = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
    const index = pc.index('famtastic-intelligence');
    const threshold = getThreshold();

    let result;
    try {
      // Attempt text-based search (integrated embeddings — Pinecone serverless)
      result = await index.namespace(vertical).searchRecords({
        query: { topK: 1, inputs: { text: question } },
        filter: { source: { $ne: 'placeholder' } },
      });
      const hits = result.result?.hits || [];
      const match = hits[0];
      if (!match) return null;

      const score = match._score || 0;
      // Log actual similarity score
      logSimilarityScore(vertical, question, score);
      if (score < threshold) return null;

      const ts = match.metadata?.timestamp;
      if (ts) {
        const age = (Date.now() - new Date(ts).getTime()) / (1000 * 60 * 60 * 24);
        if (age > 90) {
          console.log(`STALE_RESEARCH — ${vertical} last updated ${Math.round(age)} days ago, refreshing in background`);
          const staleResult = { stale: true, answer: match.fields?.answer || match.metadata?.answer, source: match.metadata?.source, score };
          // Queue background refresh (Correction 4: single-worker queue prevents flood)
          enqueueRequery(vertical, question);
          return staleResult;
        }
      }
      return { answer: match.fields?.answer || match.metadata?.answer, source: match.metadata?.source, score };
    } catch (_searchErr) {
      // Fallback: legacy query with zero-vectors
      result = await index.namespace(vertical).query({
        topK: 1,
        includeMetadata: true,
        vector: new Array(1536).fill(0.1),
        filter: { question: { $eq: question.slice(0, 100) } },
      });
      const match = result.matches?.[0];
      if (!match || match.score < threshold) return null;

      logSimilarityScore(vertical, question, match.score);

      const ts = match.metadata?.timestamp;
      if (ts) {
        const age = (Date.now() - new Date(ts).getTime()) / (1000 * 60 * 60 * 24);
        if (age > 90) {
          console.log(`STALE_RESEARCH — ${vertical} last updated ${Math.round(age)} days ago, refreshing in background`);
          const staleResult = { stale: true, answer: match.metadata?.answer, source: match.metadata?.source };
          // Queue background refresh (Correction 4: single-worker queue prevents flood)
          enqueueRequery(vertical, question);
          return staleResult;
        }
      }
      return { answer: match.metadata?.answer, source: match.metadata?.source, score: match.score };
    }
  } catch { return null; }
}

function logSimilarityScore(vertical, question, score) {
  try {
    const entry = JSON.stringify({ ts: new Date().toISOString(), vertical, question: question.slice(0, 100), score });
    const dir = path.dirname(RESEARCH_LOG_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.appendFileSync(RESEARCH_LOG_FILE, entry + '\n', 'utf8');
  } catch {}
}

async function backgroundRefresh(vertical, question, _staleResult) {
  try {
    const source = selectSource(vertical, question, {});
    const freshResult = await RESEARCH_REGISTRY[source].query(vertical, question);
    if (freshResult.answer) {
      await pineconeUpsert(vertical, question, freshResult.answer, source);
      studioEvents.emit(STUDIO_EVENTS.RESEARCH_UPDATED || 'research:updated', { vertical, question });
    }
  } catch {}
}

async function pineconeUpsert(vertical, question, answer, source) {
  if (!process.env.PINECONE_API_KEY) return;
  try {
    const { Pinecone } = require('@pinecone-database/pinecone');
    const pc    = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
    const index = pc.index('famtastic-intelligence');
    const id = `${vertical}-${source}-${Date.now()}`;
    const text = `${question} ${answer}`.slice(0, 1000);

    try {
      // Use integrated embedding — send text, Pinecone handles embedding via text-embedding-3-small
      await index.namespace(vertical).upsertRecords([{
        id,
        text,
        source,
        vertical,
        timestamp: new Date().toISOString(),
        question: question.slice(0, 100),
        answer: answer.slice(0, 1000),
      }]);
    } catch (_upsertErr) {
      // Fallback: legacy upsert with zero-vectors (graceful fallback if SDK version differs)
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
    }
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

module.exports = { queryResearch, rateResearch, selectSource, logResearchCall, getThreshold };
