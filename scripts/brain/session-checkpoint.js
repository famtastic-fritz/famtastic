#!/usr/bin/env node
/**
 * session-checkpoint.js — Brain Sync enforcement.
 *
 * Writes/updates a per-session note in the Obsidian brain so EVERY agent
 * session leaves a trace tied to its session id. Wired into Claude Code hooks
 * (SessionStart / PreCompact / Stop) in .claude/settings.json, so the trace is
 * created and updated automatically — periodically (at every compaction) and at
 * session end — without the agent having to remember.
 *
 * It also leaves a "fill me in" substance section that the agent is expected to
 * complete per the Brain Sync Contract in CLAUDE.md. The hook guarantees the
 * scaffold + timestamps + git delta; the agent supplies the narrative.
 *
 * Contract: never throws, never blocks, always exit 0. Hooks must not break a
 * session if the brain write fails.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const cp = require('child_process');

function sh(cmd) {
  try { return cp.execSync(cmd, { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim(); }
  catch { return ''; }
}
function readStdin() {
  try {
    const raw = fs.readFileSync(0, 'utf8');
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

function main() {
  const hook = readStdin();
  const event = (hook.hook_event_name || process.argv[2] || 'checkpoint').toLowerCase();
  const root = process.env.CLAUDE_PROJECT_DIR || sh('git rev-parse --show-toplevel') || process.cwd();
  // Session id resolves from (in order): hook payload, Claude Code's env, a
  // generic BRAIN_SESSION_ID any agent surface can set (Codex/Gemini/Cowork/Shay).
  const sessionId = hook.session_id || process.env.CLAUDE_CODE_SESSION_ID
                 || process.env.BRAIN_SESSION_ID || 'unknown-session';
  const shortId = sessionId.slice(0, 8);
  // One git call for branch + short head (line 1 = branch, line 2 = sha).
  const rp = sh(`git -C "${root}" rev-parse --abbrev-ref HEAD --short HEAD`).split('\n');
  const branch = rp[0] || 'detached';
  const head = rp[1] || '0000000';
  const now = new Date();
  const date = now.toISOString().slice(0, 10);
  const stamp = now.toISOString().slice(0, 16).replace('T', ' ') + ' UTC';

  const dir = path.join(root, 'obsidian', '05-Captures', 'sessions', date);
  const file = path.join(dir, `SESSION-${shortId}.md`);
  fs.mkdirSync(dir, { recursive: true });

  const exists = fs.existsSync(file);
  if (!exists) {
    // First touch (SessionStart) — write the scaffold, record start SHA.
    const body =
`---
session_id: ${sessionId}
short_id: ${shortId}
branch: ${branch}
date: ${date}
start_sha: ${head}
started: ${stamp}
agent: ${process.env.AI_AGENT || 'claude-code'}
status: active
---

# Session ${shortId} — ${date}

> Auto-scaffolded by the Brain Sync Contract. The timeline + git delta below are
> filled automatically. **The agent must complete "What this session did".**

## What this session did
_(agent: replace this line — 2–6 sentences on goals, what shipped, what's deferred)_

## Timeline
- ${stamp} — session started on \`${branch}\` @ ${head}

## Git delta
_(filled on stop)_
`;
    fs.writeFileSync(file, body);
    process.stdout.write(`[brain] session ${shortId} registered → obsidian/05-Captures/sessions/${date}/SESSION-${shortId}.md\n`);
    return;
  }

  let content = fs.readFileSync(file, 'utf8');

  // Append a timeline entry for this event.
  const label = event === 'precompact' ? 'context compaction checkpoint'
              : event === 'stop' ? 'session stop'
              : event;
  content = content.replace(/(## Timeline\n(?:.*\n)*?)(\n## )/m,
    (m, tl, tail) => `${tl}- ${stamp} — ${label} @ ${head}\n${tail}`);

  // On stop, compute the git delta since start and mark the note ended.
  if (event === 'stop') {
    const startSha = (content.match(/start_sha:\s*(\w+)/) || [])[1] || head;
    const range = `${startSha}..${head}`;
    const commits = sh(`git -C "${root}" log --no-merges --pretty=format:'- %h %s' ${range}`) || '- (no commits recorded this session)';
    const files = sh(`git -C "${root}" diff --shortstat ${range}`) || '';
    const delta = `## Git delta\n**Range:** \`${range}\`\n\n${commits}\n\n${files ? '**Files:** ' + files + '\n' : ''}`;
    content = content.replace(/## Git delta\n[\s\S]*$/m, delta + `\n_ended: ${stamp}_\n`);
    content = content.replace(/status: active/, 'status: ended');
  }

  fs.writeFileSync(file, content);
  process.stdout.write(`[brain] session ${shortId} checkpoint (${label})\n`);
}

try { main(); } catch (e) { /* never block a session */ }
process.exit(0);
