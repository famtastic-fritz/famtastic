#!/usr/bin/env node
/**
 * Session 9 Phase 2 Tests — Anthropic SDK Migration
 * Verifies all 8 spawnClaude() call sites have been migrated to the SDK.
 * No live API calls — all tests use structural/grep checks on server.js.
 */

'use strict';
const assert = require('assert');
const fs     = require('fs');
const path   = require('path');

const SERVER = path.join(__dirname, '..', 'site-studio', 'server.js');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
    passed++;
  } catch (e) {
    console.error(`  ✗ ${name}`);
    console.error(`    ${e.message}`);
    failed++;
  }
}

// Read server.js once
const src = fs.readFileSync(SERVER, 'utf8');
const lines = src.split('\n');

// Helper: check if a string exists in source
function srcContains(str) {
  return src.includes(str);
}

// Helper: get line numbers where a pattern matches
function findLines(pattern) {
  const re = typeof pattern === 'string' ? new RegExp(pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')) : pattern;
  const found = [];
  lines.forEach((line, i) => {
    if (re.test(line)) found.push(i + 1);
  });
  return found;
}

// Helper: check context around a line number for a string
function nearLine(lineNum, str, range = 20) {
  const start = Math.max(0, lineNum - range);
  const end = Math.min(lines.length - 1, lineNum + range);
  const chunk = lines.slice(start, end).join('\n');
  return chunk.includes(str);
}

console.log('\nSession 9 Phase 2: Anthropic SDK Migration Tests\n');

// --- Infrastructure Tests ---
console.log('Infrastructure:');

test('Anthropic SDK require is in server.js', () => {
  assert(srcContains("require('@anthropic-ai/sdk')"), "Missing: require('@anthropic-ai/sdk')");
});

test('callSDK helper function exists', () => {
  assert(srcContains('async function callSDK('), 'Missing: async function callSDK(');
});

test('getAnthropicClient function is defined', () => {
  assert(srcContains('function getAnthropicClient()'), 'Missing: function getAnthropicClient()');
});

test('callSDK logs via logSDKCall', () => {
  assert(srcContains('logSDKCall({'), 'Missing: logSDKCall({ in callSDK');
});

test('logSDKCall is imported from api-telemetry', () => {
  assert(srcContains("logAPICall: logSDKCall"), "Missing: logAPICall: logSDKCall import");
});

test('resetBrainSessions is imported from brain-sessions', () => {
  assert(srcContains('resetSessions: resetBrainSessions'), 'Missing: resetSessions: resetBrainSessions import');
});

test('spawnClaudeModel function exists', () => {
  assert(srcContains('function spawnClaudeModel('), 'Missing: function spawnClaudeModel(');
});

test('spawnClaude has @deprecated notice', () => {
  assert(srcContains('@deprecated spawnClaude()'), 'Missing: @deprecated JSDoc on spawnClaude()');
});

test('spawnClaude default model is claude-sonnet-4-6 (not 4-5)', () => {
  // Find the spawnClaude function and check its default model
  const spawnClaudeIdx = lines.findIndex(l => l.includes('function spawnClaude(prompt)'));
  assert(spawnClaudeIdx !== -1, 'Could not find function spawnClaude(prompt)');
  const funcLines = lines.slice(spawnClaudeIdx, spawnClaudeIdx + 5).join('\n');
  assert(funcLines.includes('claude-sonnet-4-6'), 'spawnClaude default model should be claude-sonnet-4-6');
  assert(!funcLines.includes('claude-sonnet-4-5'), 'spawnClaude default model should not be claude-sonnet-4-5');
});

// --- Call Site Migration Tests ---
console.log('\nCall Site Migrations:');

// CS1: generateSessionSummary (originally line ~693)
test('CS1: generateSessionSummary — no spawnClaude at original call site', () => {
  const summaryLines = findLines(/const child = spawnClaude\(prompt\)/);
  // The original CS1 line was inside generateSessionSummary — check it's gone
  const generateSummaryIdx = lines.findIndex(l => l.includes('function generateSessionSummary('));
  assert(generateSummaryIdx !== -1, 'generateSessionSummary function not found');
  // No spawnClaude should appear within 60 lines of the function start
  const funcChunk = lines.slice(generateSummaryIdx, generateSummaryIdx + 60).join('\n');
  assert(!funcChunk.includes('spawnClaude(prompt)'), 'CS1: spawnClaude still present in generateSessionSummary');
});

test('CS1: generateSessionSummary — callSDK present', () => {
  const generateSummaryIdx = lines.findIndex(l => l.includes('function generateSessionSummary('));
  const funcChunk = lines.slice(generateSummaryIdx, generateSummaryIdx + 60).join('\n');
  assert(funcChunk.includes('callSDK('), 'CS1: callSDK not found in generateSessionSummary');
});

// CS2: POST /api/generate-image-prompt (originally line ~3821)
test('CS2: /api/generate-image-prompt — no spawnClaude at call site', () => {
  const routeIdx = lines.findIndex(l => l.includes('/api/generate-image-prompt'));
  assert(routeIdx !== -1, 'Route /api/generate-image-prompt not found');
  const funcChunk = lines.slice(routeIdx, routeIdx + 40).join('\n');
  assert(!funcChunk.includes('spawnClaude(prompt)'), 'CS2: spawnClaude still present in /api/generate-image-prompt');
});

test('CS2: /api/generate-image-prompt — callSDK present', () => {
  const routeIdx = lines.findIndex(l => l.includes('/api/generate-image-prompt'));
  const funcChunk = lines.slice(routeIdx, routeIdx + 60).join('\n');
  assert(funcChunk.includes('callSDK('), 'CS2: callSDK not found in /api/generate-image-prompt');
});

test('CS2: /api/generate-image-prompt handler is async', () => {
  assert(srcContains("app.post('/api/generate-image-prompt', async"), 'CS2: route handler should be async');
});

// CS3: handleDataModelPlanning (originally line ~6669)
test('CS3: handleDataModelPlanning — no spawnClaude at call site', () => {
  const fnIdx = lines.findIndex(l => l.includes('function handleDataModelPlanning('));
  assert(fnIdx !== -1, 'handleDataModelPlanning function not found');
  const funcChunk = lines.slice(fnIdx, fnIdx + 80).join('\n');
  assert(!funcChunk.includes('const child = spawnClaude'), 'CS3: spawnClaude still present in handleDataModelPlanning');
});

test('CS3: handleDataModelPlanning — callSDK present', () => {
  const fnIdx = lines.findIndex(l => l.includes('function handleDataModelPlanning('));
  const funcChunk = lines.slice(fnIdx, fnIdx + 80).join('\n');
  assert(funcChunk.includes('callSDK('), 'CS3: callSDK not found in handleDataModelPlanning');
});

test('CS3: handleDataModelPlanning is async', () => {
  assert(srcContains('async function handleDataModelPlanning('), 'CS3: handleDataModelPlanning should be async');
});

// CS4: generatePlan (originally line ~6763)
test('CS4: generatePlan — no spawnClaude at call site', () => {
  const fnIdx = lines.findIndex(l => l.includes('async function generatePlan('));
  assert(fnIdx !== -1, 'generatePlan function not found');
  const funcChunk = lines.slice(fnIdx, fnIdx + 30).join('\n');
  assert(!funcChunk.includes('const child = spawnClaude'), 'CS4: spawnClaude still present in generatePlan');
});

test('CS4: generatePlan — callSDK present', () => {
  const fnIdx = lines.findIndex(l => l.includes('async function generatePlan('));
  const funcChunk = lines.slice(fnIdx, fnIdx + 30).join('\n');
  assert(funcChunk.includes('callSDK('), 'CS4: callSDK not found in generatePlan');
});

// CS5: handlePlanning (originally line ~6867)
test('CS5: handlePlanning — no spawnClaude at call site', () => {
  const fnIdx = lines.findIndex(l => l.includes('async function handlePlanning('));
  assert(fnIdx !== -1, 'handlePlanning should now be async');
  const funcChunk = lines.slice(fnIdx, fnIdx + 120).join('\n');
  assert(!funcChunk.includes('const child = spawnClaude'), 'CS5: spawnClaude still present in handlePlanning');
});

test('CS5: handlePlanning — callSDK present', () => {
  const fnIdx = lines.findIndex(l => l.includes('async function handlePlanning('));
  const funcChunk = lines.slice(fnIdx, fnIdx + 120).join('\n');
  assert(funcChunk.includes('callSDK('), 'CS5: callSDK not found in handlePlanning');
});

test('CS5: handlePlanning is async', () => {
  assert(srcContains('async function handlePlanning('), 'CS5: handlePlanning should be async');
});

// CS6: spawnOnePage in parallelBuild (originally line ~7231)
test('CS6: parallelBuild — no spawnClaude for per-page spawn', () => {
  const fnIdx = lines.findIndex(l => l.includes('async function parallelBuild('));
  assert(fnIdx !== -1, 'parallelBuild should now be async');
  // Find spawnPage inner function
  const funcLines2 = lines.slice(fnIdx, fnIdx + 300);
  const spawnPageIdx = funcLines2.findIndex(l => l.includes('function spawnPage('));
  assert(spawnPageIdx !== -1, 'spawnPage inner function not found');
  const spawnPageChunk = funcLines2.slice(spawnPageIdx, spawnPageIdx + 20).join('\n');
  assert(!spawnPageChunk.includes('spawnClaude('), 'CS6: spawnClaude still present in spawnPage');
});

test('CS6: parallelBuild uses Promise.allSettled for page builds', () => {
  assert(srcContains('Promise.allSettled('), 'CS6: Promise.allSettled not found in parallelBuild');
});

test('CS6: per-page build uses max_tokens 16384', () => {
  const fnIdx = lines.findIndex(l => l.includes('async function spawnAllPages('));
  assert(fnIdx !== -1, 'async function spawnAllPages not found');
  const funcChunk = lines.slice(fnIdx, fnIdx + 80).join('\n');
  assert(funcChunk.includes('max_tokens: 16384'), 'CS6: max_tokens 16384 not found in spawnAllPages');
});

test('CS6: parallelBuild is async', () => {
  assert(srcContains('async function parallelBuild('), 'CS6: parallelBuild should be async');
});

// CS7: template build in parallelBuild (originally line ~7300)
test('CS7: parallelBuild template build — no spawnClaude', () => {
  const fnIdx = lines.findIndex(l => l.includes('async function parallelBuild('));
  assert(fnIdx !== -1, 'parallelBuild not found');
  const funcChunk = lines.slice(fnIdx, fnIdx + 400).join('\n');
  // Check that templateChild = spawnClaude() is gone
  assert(!funcChunk.includes('const templateChild = spawnClaude('), 'CS7: spawnClaude still used for template build');
});

test('CS7: template build uses SDK messages.create', () => {
  const fnIdx = lines.findIndex(l => l.includes('async function parallelBuild('));
  const funcChunk = lines.slice(fnIdx, fnIdx + 400).join('\n');
  assert(funcChunk.includes("callSite: 'template-build'"), "CS7: template-build callSite not found");
});

test('CS7: template build uses AbortController', () => {
  const fnIdx = lines.findIndex(l => l.includes('async function parallelBuild('));
  const funcChunk = lines.slice(fnIdx, fnIdx + 400).join('\n');
  assert(funcChunk.includes('templateController'), 'CS7: templateController (AbortController) not found');
});

// CS8: handleChatMessage (originally line ~8971)
test('CS8: handleChatMessage — no spawnClaude at call site', () => {
  const fnIdx = lines.findIndex(l => l.includes('async function handleChatMessage('));
  assert(fnIdx !== -1, 'handleChatMessage should now be async');
  const funcChunk = lines.slice(fnIdx, fnIdx + 50).join('\n');
  assert(!funcChunk.includes('let child = spawnClaude('), 'CS8: spawnClaude still present as main spawn in handleChatMessage');
});

test('CS8: handleChatMessage uses SDK streaming', () => {
  const fnIdx = lines.findIndex(l => l.includes('async function handleChatMessage('));
  // Search a broader range — streaming code is ~450 lines into the function
  const funcChunk = lines.slice(fnIdx, fnIdx + 500).join('\n');
  assert(funcChunk.includes('sdk.messages.stream('), 'CS8: sdk.messages.stream not found in handleChatMessage');
});

test('CS8: handleChatMessage uses AbortController', () => {
  const fnIdx = lines.findIndex(l => l.includes('async function handleChatMessage('));
  const funcChunk = lines.slice(fnIdx, fnIdx + 500).join('\n');
  assert(funcChunk.includes('sdkController'), 'CS8: sdkController (AbortController) not found in handleChatMessage');
});

test('CS8: handleChatMessage has resetSilenceTimer pattern', () => {
  const fnIdx = lines.findIndex(l => l.includes('async function handleChatMessage('));
  const funcChunk = lines.slice(fnIdx, fnIdx + 500).join('\n');
  assert(funcChunk.includes('resetSilenceTimer'), 'CS8: resetSilenceTimer not found in handleChatMessage');
});

test('CS8: handleChatMessage is async', () => {
  assert(srcContains('async function handleChatMessage('), 'CS8: handleChatMessage should be async');
});

test('CS8: runHaikuFallbackSDK helper exists', () => {
  assert(srcContains('async function runHaikuFallbackSDK('), 'CS8: runHaikuFallbackSDK helper not found');
});

// --- Telemetry endpoint ---
console.log('\nTelemetry Endpoint:');

test('/api/telemetry/sdk-cost-summary endpoint exists', () => {
  assert(srcContains("app.get('/api/telemetry/sdk-cost-summary'"), 'Missing /api/telemetry/sdk-cost-summary endpoint');
});

test('telemetry endpoint calls getSessionSummary', () => {
  const endpointIdx = lines.findIndex(l => l.includes('/api/telemetry/sdk-cost-summary'));
  const chunk = lines.slice(endpointIdx, endpointIdx + 8).join('\n');
  assert(chunk.includes('getSessionSummary()'), 'getSessionSummary() not called in telemetry endpoint');
});

test('telemetry endpoint calls readSiteLog', () => {
  const endpointIdx = lines.findIndex(l => l.includes('/api/telemetry/sdk-cost-summary'));
  const chunk = lines.slice(endpointIdx, endpointIdx + 8).join('\n');
  assert(chunk.includes('readSiteLog('), 'readSiteLog() not called in telemetry endpoint');
});

// --- Brain session reset on site switch ---
console.log('\nSite Switch:');

test('resetBrainSessions called on site switch', () => {
  const switchIdx = lines.findIndex(l => l.includes("app.post('/api/switch-site'"));
  assert(switchIdx !== -1, '/api/switch-site route not found');
  const routeChunk = lines.slice(switchIdx, switchIdx + 50).join('\n');
  assert(routeChunk.includes('resetBrainSessions()'), 'resetBrainSessions() not called on site switch');
});

// --- Summary ---
console.log(`\n${'─'.repeat(50)}`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) {
  console.error('\nSome tests failed. Review the migrations above.');
  process.exit(1);
} else {
  console.log('\nAll Session 9 Phase 2 tests passed.');
  process.exit(0);
}
