#!/usr/bin/env node
'use strict';

/**
 * Session 16 Tests — Surgical Editor, Layer 0 Data Sources, Shay-Shay Seed
 */

const fs = require('fs');
const path = require('path');

const PASS = '  ✅ PASS:';
const FAIL = '  ✗ FAIL:';
let passed = 0;
let failed = 0;
const failures = [];

function check(label, condition) {
  if (condition) {
    console.log(`${PASS} ${label}`);
    passed++;
  } else {
    console.log(`${FAIL} ${label}`);
    failed++;
    failures.push(label);
  }
}

const SERVER = path.join(__dirname, '../site-studio/server.js');
const serverSrc = fs.readFileSync(SERVER, 'utf8');

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('Session 16 — Layer 0 + Shay-Shay Seed Tests');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

// ── PHASE 0: Surgical editor wiring ─────────────────────────────────────────
console.log('## Phase 0: Surgical Editor Wiring');

check('gap-logger required in server.js',
  serverSrc.includes("require('./lib/gap-logger')"));

check('suggestion-logger required in server.js',
  serverSrc.includes("require('./lib/suggestion-logger')"));

check('brand-tracker required in server.js',
  serverSrc.includes("require('./lib/brand-tracker')"));

check('capability-manifest required in server.js',
  serverSrc.includes("require('./lib/capability-manifest')"));

check('STRUCTURAL_HINTS block exists in tryDeterministicHandler',
  serverSrc.includes('STRUCTURAL_HINTS'));

check('structural index field lookup uses hintKey',
  serverSrc.includes('f.field_id.includes(hintKey)'));

check('surgicalEditor.trySurgicalEdit called in tryDeterministicHandler',
  /STRUCTURAL_HINTS[\s\S]{0,2000}surgicalEditor\.trySurgicalEdit/.test(serverSrc));

check('surgical edit writes to mutations.jsonl',
  serverSrc.includes("action: 'surgical_edit'") && serverSrc.includes("source: 'surgical_index'"));

check('brand-tracker.extractAndSaveBrand called in runPostProcessing',
  serverSrc.includes('brandTracker.extractAndSaveBrand'));

check('structural index built per page in runPostProcessing',
  serverSrc.includes('surgicalEditor.buildStructuralIndex'));

// ── PHASE 1A: Gap logger ────────────────────────────────────────────────────
console.log('\n## Phase 1A: Gap Logger');

const GAP_LOGGER = path.join(__dirname, '../site-studio/lib/gap-logger.js');
check('gap-logger.js exists', fs.existsSync(GAP_LOGGER));

if (fs.existsSync(GAP_LOGGER)) {
  const src = fs.readFileSync(GAP_LOGGER, 'utf8');
  check('logGap exported', src.includes('module.exports') && src.includes('logGap'));
  check('GAP_CATEGORIES defined', src.includes('NOT_BUILT') && src.includes('NOT_CONNECTED') && src.includes('BROKEN'));
  check('promotion threshold defined', src.includes('PROMOTION_THRESHOLD'));
  check('promoteGap function exists', src.includes('function promoteGap'));
  check('gaps.jsonl path uses HOME', src.includes('process.env.HOME'));
}

// ── PHASE 1B: Suggestion logger ─────────────────────────────────────────────
console.log('\n## Phase 1B: Suggestion Logger');

const SUGGESTION_LOGGER = path.join(__dirname, '../site-studio/lib/suggestion-logger.js');
check('suggestion-logger.js exists', fs.existsSync(SUGGESTION_LOGGER));

if (fs.existsSync(SUGGESTION_LOGGER)) {
  const src = fs.readFileSync(SUGGESTION_LOGGER, 'utf8');
  check('logSuggestion exported', src.includes('logSuggestion'));
  check('logOutcome exported', src.includes('logOutcome'));
  check('OUTCOMES scores defined', src.includes('SHIPPED') && src.includes('DISMISSED'));
  check('promotion threshold defined', src.includes('PROMOTION_THRESHOLD'));
  check('loadPendingSuggestions exported', src.includes('loadPendingSuggestions'));
}

// ── PHASE 1C: Brand tracker ──────────────────────────────────────────────────
console.log('\n## Phase 1C: Brand Tracker');

const BRAND_TRACKER = path.join(__dirname, '../site-studio/lib/brand-tracker.js');
check('brand-tracker.js exists', fs.existsSync(BRAND_TRACKER));

if (fs.existsSync(BRAND_TRACKER)) {
  const src = fs.readFileSync(BRAND_TRACKER, 'utf8');
  check('extractBrandTokens exported', src.includes('extractBrandTokens'));
  check('extractAndSaveBrand exported', src.includes('extractAndSaveBrand'));
  check('detectDrift exported', src.includes('detectDrift'));
  check('extracts primary_color', src.includes('--color-primary'));
  check('extracts heading_font', src.includes('--font-heading'));
}

// ── PHASE 1D: Deploy history ─────────────────────────────────────────────────
console.log('\n## Phase 1D: Deploy History');

check('deploy_history pushed in runDeploy',
  serverSrc.includes('deploy_history.push'));
check('deploy_history includes environment',
  serverSrc.includes('environment: env') || serverSrc.includes('environment:env'));
check('deploy_history includes url',
  serverSrc.includes("url: urlMatch[0]") && serverSrc.includes('deploy_history'));

// ── PHASE 1E: Agent Cards ────────────────────────────────────────────────────
console.log('\n## Phase 1E: Agent Cards');

const AGENT_CARDS_DIR = path.join(__dirname, '../site-studio/agent-cards');
check('agent-cards directory exists', fs.existsSync(AGENT_CARDS_DIR));

['claude', 'codex', 'gemini'].forEach(id => {
  const cardPath = path.join(AGENT_CARDS_DIR, `${id}.agent-card.json`);
  check(`${id}.agent-card.json exists`, fs.existsSync(cardPath));
  if (fs.existsSync(cardPath)) {
    const card = JSON.parse(fs.readFileSync(cardPath, 'utf8'));
    check(`${id} card has id field`, card.id === id);
    check(`${id} card has best_for array`, Array.isArray(card.best_for));
    check(`${id} card has tier`, typeof card.tier === 'number');
  }
});

// ── PHASE 1G: Capability Manifest ───────────────────────────────────────────
console.log('\n## Phase 1G: Capability Manifest');

const CAP_MANIFEST = path.join(__dirname, '../site-studio/lib/capability-manifest.js');
check('capability-manifest.js exists', fs.existsSync(CAP_MANIFEST));

if (fs.existsSync(CAP_MANIFEST)) {
  const src = fs.readFileSync(CAP_MANIFEST, 'utf8');
  check('buildCapabilityManifest exported', src.includes('buildCapabilityManifest'));
  check('diffStateVsManifest exported', src.includes('diffStateVsManifest'));
  check('surgical_editor marked available', src.includes("surgical_editor: 'available'"));
}

check('/api/capability-manifest endpoint exists',
  serverSrc.includes("'/api/capability-manifest'"));

check('buildCapabilityManifest called on startup',
  serverSrc.includes('buildCapabilityManifest().then'));

// ── PHASE 2: Shay-Shay Seed ──────────────────────────────────────────────────
console.log('\n## Phase 2: Shay-Shay Seed');

const SHAY_DIR = path.join(__dirname, '../site-studio/shay-shay');
check('shay-shay directory exists', fs.existsSync(SHAY_DIR));
check('skill.json exists', fs.existsSync(path.join(SHAY_DIR, 'skill.json')));
check('instructions.md exists', fs.existsSync(path.join(SHAY_DIR, 'instructions.md')));

if (fs.existsSync(path.join(SHAY_DIR, 'skill.json'))) {
  const skill = JSON.parse(fs.readFileSync(path.join(SHAY_DIR, 'skill.json'), 'utf8'));
  check('skill has 8 capabilities', skill.capabilities.length === 8);
  check('studio_command capability exists', skill.capabilities.some(c => c.id === 'studio_command'));
  check('capture_gap capability exists', skill.capabilities.some(c => c.id === 'capture_gap'));
  check('general_reasoning is tier 3', skill.capabilities.find(c => c.id === 'general_reasoning')?.tier === 3);
}

check('/api/shay-shay POST endpoint exists', serverSrc.includes("'/api/shay-shay'"));
check('/api/shay-shay/gap endpoint exists', serverSrc.includes("'/api/shay-shay/gap'"));
check('/api/shay-shay/outcome endpoint exists', serverSrc.includes("'/api/shay-shay/outcome'"));

check('classifyShayShayTier0 function exists', serverSrc.includes('classifyShayShayTier0'));
check('handleShayShayTier0 function exists', serverSrc.includes('handleShayShayTier0'));

check('Tier 0: route_to_chat intent handled',
  serverSrc.includes("action: 'route_to_chat'"));
check('Tier 0: system_command intent handled',
  serverSrc.includes("action: 'system_command'"));
check('Tier 0: system_status reports manifest',
  serverSrc.includes('diffStateVsManifest'));

check('Shay-Shay endpoint uses callSDK with model override',
  serverSrc.includes("callSDK(\n") || serverSrc.includes("callSDK("));
check('callSDK supports systemPrompt option',
  serverSrc.includes('systemPrompt = null') || serverSrc.includes('systemPrompt }'));

check('sendToShayShay function in studio-orb.js', (() => {
  const orbSrc = fs.readFileSync(path.join(__dirname, '../site-studio/public/js/studio-orb.js'), 'utf8');
  return orbSrc.includes('sendToShayShay');
})());

check('orb routes to /api/shay-shay not WS', (() => {
  const orbSrc = fs.readFileSync(path.join(__dirname, '../site-studio/public/js/studio-orb.js'), 'utf8');
  return orbSrc.includes("'/api/shay-shay'") && orbSrc.includes('route_to_chat');
})());

// ── Phase 1F: Brief corrections ──────────────────────────────────────────────
console.log('\n## Phase 1F: Brief Corrections');

check('brief-corrections.jsonl capture in interview completion',
  serverSrc.includes('brief-corrections.jsonl'));
check('brief corrections log outcome as suggestions',
  serverSrc.includes("intent: 'brief_correction'"));

// ── Summary ───────────────────────────────────────────────────────────────────
console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log(`Session 16 Results: ${passed} PASS | ${failed} FAIL | ${passed + failed} total`);
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
if (failures.length > 0) {
  console.log('\nFailures:');
  failures.forEach(f => console.log(`  ✗ ${f}`));
}

const results = {
  passed, failed, total: passed + failed, failures,
  timestamp: new Date().toISOString(),
};
const logPath = path.join(__dirname, 'automation/logs/session16-results.json');
fs.mkdirSync(path.dirname(logPath), { recursive: true });
fs.writeFileSync(logPath, JSON.stringify(results, null, 2));
console.log(`\nResults saved to ${logPath}`);
process.exit(failed > 0 ? 1 : 0);
