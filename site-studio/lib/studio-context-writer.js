'use strict';
/**
 * studio-context-writer.js — Generates STUDIO-CONTEXT.md
 *
 * Subscribes to all studio events and regenerates the context file.
 * Any brain (Claude Code, Gemini, Codex) reads this file at session start
 * to understand: active site, current brief, components, research, rules.
 *
 * Pinecone queries are gracefully degraded — if the package or API key
 * is absent, the research section emits a placeholder instead of erroring.
 *
 * Usage:
 *   const contextWriter = require('./studio-context-writer');
 *   contextWriter.init({ getTag, getSpec, getHubRoot });
 *   // The writer auto-subscribes to studioEvents after init()
 */

const fs   = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { studioEvents, STUDIO_EVENTS } = require('./studio-events');

const OUTPUT_FILENAME = 'STUDIO-CONTEXT.md';

let _ctx = null; // injected dependencies

// ── Pinecone result cache (30s TTL, invalidated on SITE_SWITCHED / BUILD_COMPLETED) ──

const CONTEXT_CACHE = {
  pineconeResult: null,
  lastVertical:   null,
  lastQueried:    null,
  TTL:            30 * 1000, // 30 seconds
};

// ── Pinecone query (graceful degradation) ────────────────────────────────────

async function queryPineconeVertical(vertical) {
  if (!process.env.PINECONE_API_KEY) return null;
  try {
    const { Pinecone } = require('@pinecone-database/pinecone');
    const pc    = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
    const index = pc.index('famtastic-intelligence');
    const result = await index.namespace(vertical).query({
      topK: 5,
      includeMetadata: true,
      vector: new Array(1536).fill(0.1), // placeholder — Phase 4 will replace with real embeddings
    });
    return (result.matches || [])
      .map(m => `- ${m.metadata?.question || 'Research finding'}: ${(m.metadata?.answer || m.metadata?.text || '').slice(0, 200)}`)
      .join('\n');
  } catch {
    return null;
  }
}

// ── Section builders ─────────────────────────────────────────────────────────

function buildBriefSummary(spec) {
  const brief = spec.design_brief || {};
  const name  = spec.site_name || brief.business_name || 'Unknown site';
  const desc  = brief.description || brief.one_liner || brief.tagline || '';
  const ind   = spec.business_type || brief.industry || '';
  return [name, desc, ind ? `Industry: ${ind}` : ''].filter(Boolean).join(' — ');
}

function buildSiteState(spec) {
  const pages  = Array.isArray(spec.pages) ? spec.pages : ['index'];
  const url    = spec.deployed_url || 'not deployed';
  const state  = spec.state || 'draft';
  const veri   = spec.last_verification;
  const buildTs = veri ? veri.verified_at : spec.updated_at || 'unknown';
  return [
    `- Pages: ${pages.join(', ')}`,
    `- Deployed URL: ${url}`,
    `- Last build: ${buildTs}`,
    `- Build status: ${state}`,
  ].join('\n');
}

function buildComponentLibrary(hubRoot) {
  const libFile = path.join(hubRoot, 'components', 'library.json');
  if (!fs.existsSync(libFile)) return '- Component library not found.';
  try {
    const raw   = JSON.parse(fs.readFileSync(libFile, 'utf8'));
    const comps = Array.isArray(raw) ? raw : (raw.components || []);
    const recent = comps
      .slice()
      .sort((a, b) => (b.last_updated || '').localeCompare(a.last_updated || ''))
      .slice(0, 5)
      .map(c => c.name || c.id || '?');
    return [
      `- Total components: ${comps.length}`,
      `- Recently updated: ${recent.join(', ') || 'none'}`,
    ].join('\n');
  } catch {
    return '- Component library parse error.';
  }
}

function buildIntelligenceFindings(hubRoot, tag) {
  const promoFile = path.join(hubRoot, 'sites', tag, 'intelligence-promotions.json');
  if (!fs.existsSync(promoFile)) return 'No promoted findings yet.';
  try {
    const data     = JSON.parse(fs.readFileSync(promoFile, 'utf8'));
    const findings = Array.isArray(data) ? data : (data.findings || []);
    if (!findings.length) return 'No promoted findings yet.';
    return findings.slice(0, 3).map(f =>
      `- [${f.category || 'general'}] ${f.finding || f.title || ''}`
    ).join('\n');
  } catch {
    return 'No promoted findings yet.';
  }
}

function buildAvailableTools() {
  const tools = ['- Claude Code CLI: active (subscription)'];

  if (process.env.GEMINI_API_KEY) {
    tools.push('- Gemini CLI: active (GEMINI_API_KEY set)');
  } else {
    tools.push('- Gemini CLI: unavailable (GEMINI_API_KEY not set)');
  }

  // Check codex using spawnSync (no shell injection risk)
  const codexResult = spawnSync('which', ['codex'], { timeout: 1000, encoding: 'utf8' });
  const hasCodex = codexResult.status === 0 && (codexResult.stdout || '').trim().length > 0;
  tools.push(`- Codex CLI: ${hasCodex ? 'active' : 'unavailable (not installed)'}`);

  if (process.env.PINECONE_API_KEY) {
    tools.push('- Pinecone: connected (famtastic-intelligence)');
  } else {
    tools.push('- Pinecone: not configured (PINECONE_API_KEY not set — Phase 4 required)');
  }

  return tools.join('\n');
}

const STANDING_RULES = [
  '- Always use TAG (mutable runtime variable) not process.env.SITE_TAG (startup-only env var)',
  '- Register static Express routes BEFORE parameterized routes (e.g. /api/research/verticals before /api/research/:filename)',
  '- library.json is { version, components[], last_updated } — always extract .components, never use root array',
  '- Default classifier intent is content_update (not layout_update) — surgical edits bypass plan gate',
  '- Do NOT modify lib/fam-motion.js, lib/fam-shapes.css, lib/character-branding.js',
  '- Every HTML write path must go through runPostProcessing — no exceptions including fallback paths',
].join('\n');

// ── Main generator ────────────────────────────────────────────────────────────

async function generate(eventType, payload) {
  if (!_ctx) return; // not initialised yet

  const { getTag, getSpec, getHubRoot } = _ctx;
  const tag     = (payload && payload.tag) || getTag();
  const hubRoot = getHubRoot();
  const specFile = path.join(hubRoot, 'sites', tag, 'spec.json');

  let spec = {};
  if (fs.existsSync(specFile)) {
    try { spec = JSON.parse(fs.readFileSync(specFile, 'utf8')); } catch {}
  } else if (typeof getSpec === 'function') {
    try { spec = getSpec() || {}; } catch {}
  }

  const vertical = spec.business_type || (spec.design_brief || {}).industry || 'general';

  // Pinecone cache check (30s TTL, invalidated on SITE_SWITCHED / BUILD_COMPLETED)
  let pineResult = null;
  const cacheAge = CONTEXT_CACHE.lastQueried ? Date.now() - CONTEXT_CACHE.lastQueried : Infinity;
  if (CONTEXT_CACHE.lastQueried && cacheAge < CONTEXT_CACHE.TTL && CONTEXT_CACHE.lastVertical === vertical) {
    console.log('[context-writer] Pinecone cache HIT');
    pineResult = CONTEXT_CACHE.pineconeResult;
  } else {
    console.log('[context-writer] Pinecone cache MISS');
    pineResult = await queryPineconeVertical(vertical);
    CONTEXT_CACHE.pineconeResult = pineResult;
    CONTEXT_CACHE.lastVertical   = vertical;
    CONTEXT_CACHE.lastQueried    = Date.now();
  }

  const researchSection = pineResult
    ? pineResult
    : `No Pinecone research available yet for vertical: "${vertical}". Run Phase 4 (fam-hub research seed-from-sites) to seed knowledge base.`;

  const sections = [
    `# FAMtastic Studio — Current Context`,
    `## Generated: ${new Date().toISOString()}`,
    `## Active Site: ${tag}`,
    `## Event: ${eventType}`,
    '',
    `## Current Site Brief`,
    buildBriefSummary(spec),
    '',
    `## Current Site State`,
    buildSiteState(spec),
    '',
    `## Component Library`,
    buildComponentLibrary(hubRoot),
    '',
    `## What We Know About This Vertical (${vertical})`,
    researchSection,
    '',
    `## Intelligence Findings`,
    buildIntelligenceFindings(hubRoot, tag),
    '',
    `## Available Tools (This Session)`,
    buildAvailableTools(),
    '',
    `## Standing Rules`,
    STANDING_RULES,
    '',
  ];

  const outFile = path.join(hubRoot, OUTPUT_FILENAME);
  try {
    fs.writeFileSync(outFile, sections.join('\n'), 'utf8');
  } catch (err) {
    console.error('[studio-context-writer] write failed:', err.message);
  }
}

// ── Init / subscription ────────────────────────────────────────────────────────

function init(ctx) {
  _ctx = ctx;

  // Invalidate Pinecone cache on site switch or build completion
  studioEvents.on(STUDIO_EVENTS.SITE_SWITCHED, () => { CONTEXT_CACHE.lastQueried = null; });
  studioEvents.on(STUDIO_EVENTS.BUILD_COMPLETED, () => { CONTEXT_CACHE.lastQueried = null; });

  // Subscribe to all studio events — each fires an async context regeneration
  Object.values(STUDIO_EVENTS).forEach(eventName => {
    studioEvents.on(eventName, (payload) => {
      generate(eventName, payload).catch(err =>
        console.error('[studio-context-writer] async error:', err.message)
      );
    });
  });

  // Generate immediately on init (catches SESSION_STARTED equivalent for require-time boot)
  generate('init', null).catch(() => {});
}

module.exports = { init, generate, OUTPUT_FILENAME };
