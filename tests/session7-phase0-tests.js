#!/usr/bin/env node
/**
 * Session 7 — Phase 0: Multi-Agent Skeleton Fix Tests
 *
 * Verifies all S7-0A through S7-0D fixes without calling live AI CLIs:
 *   0A — ORIG_PROMPT exported: log-jsonl records real user turn (not "unknown")
 *   0B — Adapters: correct HUB_ROOT path, history file support
 *   0C — fam-hub agent: proper subcommand routing + status + logs
 *   0D — generate-latest-convo: creates real data, no tts agent, recent timestamp
 */

'use strict';

const { spawnSync } = require('child_process');
const fs   = require('fs');
const path = require('path');
const os   = require('os');

const ROOT      = path.resolve(__dirname, '..');
const SOURCES   = path.join(os.homedir(), '.local', 'share', 'famtastic', 'agent-hub', 'sources');
const AGENTS_DIR= path.join(ROOT, 'agents');

let passed = 0;
let failed = 0;
const failures = [];

function assert(condition, name, detail = '') {
  if (condition) {
    console.log(`  ✓ ${name}`);
    passed++;
  } else {
    console.error(`  ✗ ${name}${detail ? ': ' + detail : ''}`);
    failed++;
    failures.push({ name, detail });
  }
}

// Runs a bash command safely via spawnSync (no string-interpolated shell exec)
function sh(args, opts = {}) {
  const result = spawnSync('/bin/bash', ['-c', args], {
    cwd: ROOT, encoding: 'utf8', env: { ...process.env }, ...opts
  });
  return (result.stdout || result.stderr || '').trim();
}

function seedJsonl(agent, tag, records) {
  const dir = path.join(SOURCES, agent);
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `${tag}.jsonl`);
  const lines = records.map(r => JSON.stringify(r));
  fs.writeFileSync(file, lines.join('\n') + '\n');
  return file;
}

function cleanJsonl(agent, tag) {
  const file = path.join(SOURCES, agent, `${tag}.jsonl`);
  try { fs.unlinkSync(file); } catch (_) {}
}

function mkHistory(messages) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'fam-p0hist-'));
  const file = path.join(tmp, 'history.json');
  fs.writeFileSync(file, JSON.stringify({ tag: 'test', messages }, null, 2));
  return { file, dir: tmp };
}

// ── GROUP S7-0A: User turn logging ──────────────────────────────────────────

console.log('\n── S7-0A: User turn logging ──────────────────────────────────────');

{
  const testTag = 'p0-orig-prompt-test';
  cleanJsonl('claude', testTag);
  const jsonlFile = path.join(SOURCES, 'claude', `${testTag}.jsonl`);
  fs.mkdirSync(path.join(SOURCES, 'claude'), { recursive: true });

  // Call log-jsonl directly — stdin is the "response", ORIG_PROMPT env is the user turn
  const result = spawnSync('/bin/bash', ['-c',
    `printf '%s' "mock-response" | ORIG_PROMPT="hello world" scripts/log-jsonl "claude" "${testTag}"`
  ], { cwd: ROOT, encoding: 'utf8', env: { ...process.env } });

  assert(result.status === 0, 'log-jsonl exits 0 with ORIG_PROMPT set', result.stderr);
  assert(fs.existsSync(jsonlFile), 'JSONL file created by log-jsonl');

  if (fs.existsSync(jsonlFile)) {
    const raw  = fs.readFileSync(jsonlFile, 'utf8').trim().split('\n').pop();
    let rec;
    try { rec = JSON.parse(raw); } catch (_) { rec = null; }

    assert(rec !== null, 'JSONL record is valid JSON');
    if (rec) {
      assert(Array.isArray(rec.messages) && rec.messages.length >= 2,
        'Record has messages array with ≥2 entries');

      const userTurn = rec.messages.find(m => m.role === 'user');
      assert(userTurn !== undefined, 'User turn exists');
      assert(userTurn?.content === 'hello world',
        'User turn content is actual prompt — not "unknown"',
        `got: "${userTurn?.content}"`);

      const asst = rec.messages.find(m => m.role === 'assistant');
      assert(asst?.content === 'mock-response',
        'Assistant turn content is the CLI response');

      assert(typeof rec.agent === 'string', 'Record has agent field');
      assert(typeof rec.at === 'string',    'Record has at (timestamp) field');
    }
  }

  cleanJsonl('claude', testTag);
}

// Verify agents script exports ORIG_PROMPT
{
  const src = fs.readFileSync(path.join(ROOT, 'scripts', 'agents'), 'utf8');
  assert(src.includes('export ORIG_PROMPT='),
    'scripts/agents: ORIG_PROMPT exported before pipeline');
  assert(src.includes('history_file='),
    'scripts/agents: action_run accepts history_file parameter');
}

// ── GROUP S7-0B: Multi-turn context ──────────────────────────────────────────

console.log('\n── S7-0B: Multi-turn context ─────────────────────────────────────');

{
  const { file: histFile, dir: histDir } = mkHistory([
    { role: 'user',      content: 'What business is this for?' },
    { role: 'assistant', content: 'Auntie Gale\'s Garage Sales.' },
    { role: 'user',      content: 'What is the primary color?' },
    { role: 'assistant', content: '#E8420A burnt orange.' },
    { role: 'user',      content: 'Is the site deployed?' },
    { role: 'assistant', content: 'Yes — effortless-tiramisu-ed9345.netlify.app' }
  ]);

  assert(fs.existsSync(histFile), 'History file created for test');

  // jq can parse it
  const jqResult = spawnSync('jq', ['-r', '.messages[] | "\\(.role): \\(.content)"', histFile],
    { cwd: ROOT, encoding: 'utf8' });
  const jqOut = (jqResult.stdout || '').trim();
  assert(jqResult.status === 0, 'History file parseable by jq');
  assert(jqOut.includes('user: What business is this for?'),  'jq reads user messages');
  assert(jqOut.includes('assistant: Auntie Gale\'s Garage Sales.'), 'jq reads assistant messages');

  // Simulate prompt construction — what adapters do with history
  const ctxResult = spawnSync('/bin/bash', ['-c',
    `CONTEXT="$(jq -r '.messages[] | "\\(.role): \\(.content)"' "${histFile}" | tail -20)"; ` +
    `printf '%s\\n\\nuser: %s' "$CONTEXT" "what is the color scheme?"`
  ], { cwd: ROOT, encoding: 'utf8', env: { ...process.env } });
  const built = (ctxResult.stdout || '').trim();

  assert(built.includes('user: What business is this for?'),       'Built prompt includes prior user messages');
  assert(built.includes('assistant: Auntie Gale\'s Garage Sales.'), 'Built prompt includes prior assistant messages');
  assert(built.includes('user: what is the color scheme?'),         'Built prompt includes new user message');
  assert(built.trim().endsWith('user: what is the color scheme?'),  'New message is last in built prompt');

  // Check all 3 adapters for correctness
  for (const adapter of ['claude', 'gemini', 'codex']) {
    const src = fs.readFileSync(
      path.join(ROOT, 'adapters', adapter, `cj-get-convo-${adapter}`), 'utf8');

    assert(!src.includes('famtastic-agent-hub'),
      `${adapter} adapter: no old archived path reference`);
    assert(src.includes('HISTORY_FILE'),
      `${adapter} adapter: HISTORY_FILE variable present`);
    assert(src.includes('HUB_ROOT'),
      `${adapter} adapter: uses HUB_ROOT (not hardcoded path)`);
    assert(src.includes("jq -r '.messages[]"),
      `${adapter} adapter: reads history using jq .messages[]`);
    assert(src.includes('export ORIG_PROMPT='),
      `${adapter} adapter: exports ORIG_PROMPT`);
  }

  fs.rmSync(histDir, { recursive: true, force: true });
}

// ── GROUP S7-0C: fam-hub agent routing ──────────────────────────────────────

console.log('\n── S7-0C: fam-hub agent routing ──────────────────────────────────');

{
  const famHubSrc = fs.readFileSync(path.join(ROOT, 'scripts', 'fam-hub'), 'utf8');

  assert(famHubSrc.includes('AGENTCMD="${2:-help}"'),
    'fam-hub: agent uses AGENTCMD for subcommand dispatch');
  assert(famHubSrc.includes('AGENT="${3:-}"') && famHubSrc.includes('TAG="${4:-}"'),
    'fam-hub agent run: AGENT=$3, TAG=$4 (correct positions)');
  assert(famHubSrc.includes('status)') && famHubSrc.includes("scripts/agents status"),
    'fam-hub: status subcommand dispatches to scripts/agents');
  assert(famHubSrc.includes('logs)') && famHubSrc.includes("scripts/agents logs"),
    'fam-hub: logs subcommand dispatches to scripts/agents');

  // scripts/agents source checks
  const agentsSrc = fs.readFileSync(path.join(ROOT, 'scripts', 'agents'), 'utf8');
  assert(agentsSrc.includes('action_status()'), 'scripts/agents: action_status() function exists');
  assert(agentsSrc.includes('action_logs()'),   'scripts/agents: action_logs() function exists');
  assert(agentsSrc.includes("status)") && agentsSrc.includes("action_status"),
    'scripts/agents: case dispatches status to action_status');
  assert(agentsSrc.includes("logs)") && agentsSrc.includes("action_logs"),
    'scripts/agents: case dispatches logs to action_logs');

  // Test status command with seeded data
  const statusTag = 'p0-status-test';
  cleanJsonl('claude', statusTag);
  const rec = {
    agent: 'claude', at: new Date().toISOString(),
    messages: [
      { role: 'user',      content: 'Build me a site.' },
      { role: 'assistant', content: 'Site built successfully.' }
    ]
  };
  seedJsonl('claude', statusTag, [rec, rec]);

  try {
    const statusOut = sh(`scripts/fam-hub agent status "${statusTag}"`);
    assert(statusOut.includes('claude'), 'agent status: shows claude');
    assert(statusOut.includes('gemini'), 'agent status: shows gemini');
    assert(statusOut.includes('codex'),  'agent status: shows codex');
    assert(statusOut.includes('calls:') || statusOut.includes('call'), 'agent status: shows call info');
  } finally {
    cleanJsonl('claude', statusTag);
  }

  // Test logs command with seeded data
  const logsTag = 'p0-logs-test';
  cleanJsonl('claude', logsTag);
  const logsRec = {
    agent: 'claude', at: new Date().toISOString(),
    messages: [
      { role: 'user',      content: 'What is the site for?' },
      { role: 'assistant', content: 'Lawn care services.' }
    ]
  };
  seedJsonl('claude', logsTag, [logsRec]);

  try {
    const logsOut = sh(`scripts/fam-hub agent logs "${logsTag}" claude`);
    assert(logsOut.includes('claude'),                 'agent logs: shows agent name');
    assert(logsOut.includes('What is the site for?'),  'agent logs: shows user message content');
  } finally {
    cleanJsonl('claude', logsTag);
  }
}

// ── GROUP S7-0D: generate-latest-convo ──────────────────────────────────────

console.log('\n── S7-0D: generate-latest-convo ──────────────────────────────────');

{
  const genScript = path.join(ROOT, 'scripts', 'generate-latest-convo');
  assert(fs.existsSync(genScript), 'generate-latest-convo script exists');
  assert(!!(fs.statSync(genScript).mode & 0o111), 'generate-latest-convo is executable');

  const outFile = path.join(AGENTS_DIR, 'latest-convo.json');

  // Verify fake file does not exist pre-generation (was deleted in S7-0D)
  // (If a previous run created it, delete before testing)
  const wasPresent = fs.existsSync(outFile);

  // Seed a real call record for claude
  const genTag = 'p0-gen-test';
  cleanJsonl('claude', genTag);
  const genRec = {
    agent: 'claude', at: new Date().toISOString(),
    messages: [
      { role: 'user',      content: 'Generate homepage.' },
      { role: 'assistant', content: 'Here is your homepage.' }
    ]
  };
  seedJsonl('claude', genTag, [genRec]);

  // Remove output file to ensure clean generation
  try { fs.unlinkSync(outFile); } catch (_) {}

  try {
    const genOut = sh('scripts/generate-latest-convo');
    assert(genOut.includes('latest-convo.json'), 'generate-latest-convo reports output file path');
    assert(fs.existsSync(outFile), 'agents/latest-convo.json created after script runs');

    if (fs.existsSync(outFile)) {
      let data;
      try { data = JSON.parse(fs.readFileSync(outFile, 'utf8')); } catch (_) { data = null; }
      assert(data !== null, 'agents/latest-convo.json is valid JSON');

      if (data) {
        assert(typeof data.generated_at === 'string', 'generated_at field present');

        const ageMs = Date.now() - new Date(data.generated_at).getTime();
        assert(ageMs < 60 * 60 * 1000,
          'generated_at is within last hour (fresh generation)',
          `age: ${Math.round(ageMs / 1000)}s`);

        assert(Array.isArray(data.agents), 'agents array present');
        assert(data.agents.length === 3, 'exactly 3 agents', `got ${data.agents.length}`);

        const names = data.agents.map(a => a.name);
        assert(names.includes('claude'),  'agents includes claude');
        assert(names.includes('gemini'),  'agents includes gemini');
        assert(names.includes('codex'),   'agents includes codex');
        assert(!names.includes('tts'),    'agents does NOT include tts (fake agent removed)');

        assert(typeof data.total_calls === 'number', 'total_calls is a number');
        assert(data.total_calls >= 1, 'total_calls ≥ 1 (seeded data counted)');

        const claudeEntry = data.agents.find(a => a.name === 'claude');
        assert(claudeEntry && claudeEntry.call_count >= 1,
          'claude call_count ≥ 1 (seeded record counted)');
      }
    }
  } finally {
    cleanJsonl('claude', genTag);
  }

  // Verify cj-reconcile-convo calls generate-latest-convo
  const reconcileSrc = fs.readFileSync(path.join(ROOT, 'scripts', 'cj-reconcile-convo'), 'utf8');
  assert(
    reconcileSrc.includes('generate-latest-convo'),
    'cj-reconcile-convo calls generate-latest-convo at end'
  );

  // Verify the static fake file is permanently gone (replaced by generated)
  // (After generate-latest-convo ran, the file exists but was generated — not static from git)
  if (fs.existsSync(outFile)) {
    const data = JSON.parse(fs.readFileSync(outFile, 'utf8'));
    assert(!data.id || !data.interactions,
      'latest-convo.json has new format (no old static id/interactions fields)');
  }
}

// ── Results ───────────────────────────────────────────────────────────────

console.log(`\n${'─'.repeat(60)}`);
console.log(`Session 7 Phase 0: ${passed + failed} tests — ${passed} passed, ${failed} failed`);

if (failures.length > 0) {
  console.log('\nFailures:');
  failures.forEach(f => console.log(`  ✗ ${f.name}${f.detail ? ' — ' + f.detail : ''}`));
}

process.exit(failed > 0 ? 1 : 0);
