'use strict';
/**
 * research-registry.js — Provider-agnostic research source registry
 *
 * Every research source implements the same interface:
 *   name, type, status, costPerQuery, bestFor, query(vertical, question) → { answer, meta }
 *
 * Sources:
 *   gemini_loop    — Gemini Intelligence Loop (automated, free)
 *   build_patterns — FAMtastic Build Patterns (internal, free)
 *   manual         — Manual research docs (Fritz's direct knowledge)
 *   perplexity     — Perplexity API (external, $0.001/query, disabled by default)
 */

const fs   = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const HUB_ROOT = path.resolve(__dirname, '..', '..');

// ── Source: gemini_loop ───────────────────────────────────────────────────────

async function queryGeminiLoop(vertical, question) {
  if (!process.env.GEMINI_API_KEY) {
    return { answer: null, meta: { reason: 'GEMINI_API_KEY not set' } };
  }
  const geminiScript = path.join(HUB_ROOT, 'scripts', 'gemini-cli');
  if (!fs.existsSync(geminiScript)) {
    return { answer: null, meta: { reason: 'gemini-cli not found' } };
  }
  const prompt = `Research question about the ${vertical} industry: ${question}\n\nProvide a concise, factual answer (2-4 sentences) focused on what would help a web designer building a site for this vertical.`;
  const result = spawnSync(geminiScript, [], {
    input: prompt,
    encoding: 'utf8',
    timeout: 30000,
    env: { ...process.env, HUB_ROOT },
    cwd: HUB_ROOT,
  });
  if (result.status !== 0 || !result.stdout) {
    return { answer: null, meta: { reason: 'gemini-cli error', stderr: (result.stderr || '').slice(0, 200) } };
  }
  return { answer: result.stdout.trim(), meta: { source: 'gemini_loop' } };
}

// ── Source: build_patterns ────────────────────────────────────────────────────

async function queryBuildPatterns(vertical, question) {
  // Read SITE-LEARNINGS.md for patterns
  const learningsFile = path.join(HUB_ROOT, 'SITE-LEARNINGS.md');
  const learnings = fs.existsSync(learningsFile) ? fs.readFileSync(learningsFile, 'utf8') : '';

  // Read site specs to find same-vertical learnings
  const sitesDir = path.join(HUB_ROOT, 'sites');
  const verticalLower = vertical.toLowerCase();
  const relevantSnippets = [];

  if (fs.existsSync(sitesDir)) {
    const siteDirs = fs.readdirSync(sitesDir).filter(d => {
      const specFile = path.join(sitesDir, d, 'spec.json');
      if (!fs.existsSync(specFile)) return false;
      try {
        const spec = JSON.parse(fs.readFileSync(specFile, 'utf8'));
        const siteVertical = (spec.business_type || '').toLowerCase();
        return siteVertical.includes(verticalLower) || verticalLower.includes(siteVertical.split(' ')[0]);
      } catch { return false; }
    });

    for (const siteDir of siteDirs.slice(0, 3)) {
      const specFile = path.join(sitesDir, siteDir, 'spec.json');
      try {
        const spec = JSON.parse(fs.readFileSync(specFile, 'utf8'));
        const decisions = (spec.design_decisions || []).filter(d => d.status === 'approved').slice(0, 3);
        if (decisions.length) {
          relevantSnippets.push(`Site ${siteDir}: ${decisions.map(d => d.decision).join('; ')}`);
        }
      } catch {}
    }
  }

  if (!relevantSnippets.length && !learnings) {
    return { answer: null, meta: { reason: 'no build patterns found for vertical' } };
  }

  const answer = relevantSnippets.length
    ? `Build patterns for ${vertical}: ${relevantSnippets.join(' | ')}`
    : `No specific build patterns found for ${vertical}. See SITE-LEARNINGS.md for general patterns.`;

  return { answer, meta: { source: 'build_patterns', snippetCount: relevantSnippets.length } };
}

// ── Source: manual ────────────────────────────────────────────────────────────

async function queryManual(vertical, question) {
  // Read docs/research/ directory for vertical-specific manual research
  const researchDir = path.join(HUB_ROOT, 'docs', 'research');
  if (!fs.existsSync(researchDir)) {
    return { answer: null, meta: { reason: 'docs/research directory not found' } };
  }

  const verticalSlug = vertical.toLowerCase().replace(/\s+/g, '-');
  const candidates = fs.readdirSync(researchDir)
    .filter(f => f.endsWith('.md') && (f.includes(verticalSlug) || f.includes('general')));

  if (!candidates.length) {
    return { answer: null, meta: { reason: `no manual research for ${vertical}` } };
  }

  // Read the best match (most specific first, then general)
  const best = candidates.find(f => f.includes(verticalSlug)) || candidates[0];
  const content = fs.readFileSync(path.join(researchDir, best), 'utf8');
  const snippet = content.split('\n').slice(0, 20).join('\n');
  return { answer: snippet, meta: { source: 'manual', file: best } };
}

// ── Source: perplexity ────────────────────────────────────────────────────────

async function queryPerplexity(vertical, question) {
  if (!process.env.PERPLEXITY_API_KEY) {
    return { answer: null, meta: { reason: 'PERPLEXITY_API_KEY not set' } };
  }
  // Real implementation would call https://api.perplexity.ai/chat/completions
  // Using placeholder for Phase 4 — Phase 5 wires real Perplexity calls
  try {
    const https = require('https');
    const body = JSON.stringify({
      model: 'sonar',
      messages: [
        { role: 'system', content: 'Be concise. Focus on actionable insights for web designers.' },
        { role: 'user', content: `${vertical} industry: ${question}` },
      ],
    });
    return new Promise((resolve) => {
      const req = https.request({
        hostname: 'api.perplexity.ai',
        path: '/chat/completions',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.PERPLEXITY_API_KEY}`,
          'Content-Length': Buffer.byteLength(body),
        },
        timeout: 20000,
      }, (res) => {
        let data = '';
        res.on('data', chunk => { data += chunk; });
        res.on('end', () => {
          try {
            const parsed = JSON.parse(data);
            const answer = parsed.choices?.[0]?.message?.content || null;
            resolve({ answer, meta: { source: 'perplexity', model: 'sonar' } });
          } catch {
            resolve({ answer: null, meta: { reason: 'parse error' } });
          }
        });
      });
      req.on('error', (err) => resolve({ answer: null, meta: { reason: err.message } }));
      req.on('timeout', () => { req.destroy(); resolve({ answer: null, meta: { reason: 'timeout' } }); });
      req.write(body);
      req.end();
    });
  } catch (err) {
    return { answer: null, meta: { reason: err.message } };
  }
}

// ── Registry definition ───────────────────────────────────────────────────────

const RESEARCH_REGISTRY = {
  gemini_loop: {
    name: 'Gemini Intelligence Loop',
    type: 'automated',
    status: process.env.GEMINI_API_KEY ? 'active' : 'unavailable',
    costPerQuery: 0,
    query: queryGeminiLoop,
    schedule: 'weekly',
    bestFor: ['tool-changes', 'api-updates', 'competitive-intel'],
    note: 'Weekly automated loop — queries Gemini for industry trends',
  },
  build_patterns: {
    name: 'FAMtastic Build Patterns',
    type: 'internal',
    status: 'active',
    costPerQuery: 0,
    query: queryBuildPatterns,
    bestFor: ['what-worked', 'component-performance', 'brief-accuracy'],
    note: 'Reads site specs and SITE-LEARNINGS.md for real build history',
  },
  manual: {
    name: 'Manual Research',
    type: 'manual',
    status: 'active',
    costPerQuery: 0,
    query: queryManual,
    bestFor: ['deep-vertical-knowledge', 'domain-expertise'],
    note: 'Fritz\'s direct knowledge — highest quality, limited quantity',
  },
  perplexity: {
    name: 'Perplexity',
    type: 'api',
    status: process.env.PERPLEXITY_API_KEY ? 'active' : 'disabled',
    model: 'sonar',
    costPerQuery: 0.001,
    query: queryPerplexity,
    bestFor: ['unknown-verticals', 'current-web-research', 'competitor-analysis'],
    enableCondition: 'vertical not in Pinecone AND no manual research exists',
    evaluationNote: 'Disabled by default. Enable per-query when needed.',
  },
};

// Effectiveness scores — loaded from disk, persisted across restarts
const EFFECTIVENESS_SCORES_FILE = path.join(HUB_ROOT, '.local', 'research-effectiveness.json');

function loadEffectivenessScores() {
  if (!fs.existsSync(EFFECTIVENESS_SCORES_FILE)) return {};
  try { return JSON.parse(fs.readFileSync(EFFECTIVENESS_SCORES_FILE, 'utf8')); } catch { return {}; }
}

function saveEffectivenessScore(source, vertical, score) {
  const scores = loadEffectivenessScores();
  if (!scores[source]) scores[source] = {};
  if (!scores[source][vertical]) scores[source][vertical] = { total: 0, count: 0, calls: 0 };
  if (score !== null && score !== undefined) {
    scores[source][vertical].total += score;
    scores[source][vertical].count++;
  }
  scores[source][vertical].calls++;
  try {
    const dir = path.dirname(EFFECTIVENESS_SCORES_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(EFFECTIVENESS_SCORES_FILE, JSON.stringify(scores, null, 2), 'utf8');
  } catch {}
  return scores;
}

function getEffectivenessReport() {
  const scores = loadEffectivenessScores();
  return Object.entries(RESEARCH_REGISTRY).map(([key, src]) => {
    const sourceScores = scores[key] || {};
    const verticals = Object.entries(sourceScores).map(([v, s]) => ({
      vertical: v,
      avgScore: s.count > 0 ? (s.total / s.count).toFixed(2) : null,
      calls: s.calls,
    }));
    const totalCalls = verticals.reduce((sum, v) => sum + v.calls, 0);
    const scores2 = verticals.filter(v => v.avgScore !== null).map(v => parseFloat(v.avgScore));
    const overallAvg = scores2.length > 0 ? (scores2.reduce((a, b) => a + b, 0) / scores2.length).toFixed(2) : null;
    return {
      source: key,
      name: src.name,
      type: src.type,
      status: src.status,
      costPerQuery: src.costPerQuery,
      totalCalls,
      overallAvgScore: overallAvg,
      verticals,
    };
  });
}

/**
 * Compute effectiveness score from build metrics (C5 — rebalanced per Session 8 addendum).
 * Two signals only — iterations_to_approval removed (requires plan revision tracking
 * infrastructure that doesn't exist. Add in Session 9+ if needed).
 *
 * @param {string} source — research source key
 * @param {string} vertical — business vertical
 * @param {object} buildMetrics — { healthDelta, briefReuseRate }
 *   healthDelta: -1 to +1 (delta in site health score; 0 = neutral, 1 = max improvement)
 *   briefReuseRate: 0 to 1 (fraction of brief sections using research content)
 * @returns {number} score 0-100
 */
function computeEffectivenessFromBuild(source, vertical, buildMetrics) {
  const { healthDelta = 0, briefReuseRate = 0 } = buildMetrics || {};
  // Weights sum to 1.0: build_health_delta (0.6) + brief_reuse_rate (0.4)
  const score = (
    Math.min(100, Math.max(0, healthDelta * 50 + 50)) * 0.6 +
    (briefReuseRate * 100) * 0.4
  );
  const rounded = Math.round(score);
  saveEffectivenessScore(source, vertical, rounded);
  return rounded;
}

module.exports = {
  RESEARCH_REGISTRY,
  loadEffectivenessScores,
  saveEffectivenessScore,
  getEffectivenessReport,
  computeEffectivenessFromBuild,
};
