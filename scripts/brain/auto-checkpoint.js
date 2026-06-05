#!/usr/bin/env node
/**
 * auto-checkpoint.js — periodic mid-session brain checkpoint (the "every ~5
 * turns" safety net for the Brain Sync Contract).
 *
 * Wired as a Claude Code UserPromptSubmit hook. Most turns it does nothing but
 * bump a per-session counter; every Nth user turn it fires a note-bearing
 * `progress` checkpoint through session-checkpoint.js so mid-session work isn't
 * lost between start and stop — even if the agent forgets to checkpoint by hand.
 * The agent still supplies the *substantive* notes; this only guarantees cadence.
 *
 * HARD CONSTRAINT: UserPromptSubmit hook stdout is injected into the model's
 * context. This script must therefore print NOTHING to stdout, ever. It also
 * never throws and always exits 0 — a brain-write must not block a prompt.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const cp = require('child_process');

const EVERY_N = Number(process.env.BRAIN_AUTOCHECKPOINT_EVERY || 5);

function main() {
  let hook = {};
  try {
    const raw = fs.readFileSync(0, 'utf8');
    hook = raw ? JSON.parse(raw) : {};
  } catch { /* no/invalid stdin — proceed with env fallbacks */ }

  const root = process.env.CLAUDE_PROJECT_DIR
    || path.resolve(__dirname, '..', '..');   // scripts/brain -> repo root
  const writer = path.join(root, 'scripts', 'brain', 'session-checkpoint.js');
  if (!fs.existsSync(writer)) return;

  const sessionId = hook.session_id || process.env.CLAUDE_CODE_SESSION_ID
    || process.env.BRAIN_SESSION_ID;
  if (!sessionId) return;                      // nothing to tie a trace to
  const shortId = sessionId.slice(0, 8);

  // Per-session turn counter in the OS temp dir (survives across prompts, never
  // pollutes the repo). Keyed by short id so concurrent sessions don't collide.
  const counterFile = path.join(require('os').tmpdir(), `brain-turns-${shortId}`);
  let n = 0;
  try { n = parseInt(fs.readFileSync(counterFile, 'utf8'), 10) || 0; } catch { /* first turn */ }
  n += 1;
  try { fs.writeFileSync(counterFile, String(n)); } catch { /* best effort */ }

  if (n % EVERY_N !== 0) return;               // not a checkpoint turn

  // Fire a note-bearing progress checkpoint. stdout/stderr fully ignored so no
  // hook output reaches the model context; detached so it can't delay the turn.
  try {
    cp.execFileSync('node', [writer, 'progress'], {
      cwd: root,
      env: { ...process.env,
             BRAIN_SESSION_ID: sessionId,
             BRAIN_NOTE: `auto checkpoint — ${n} user turns (mid-session safety net)` },
      stdio: ['ignore', 'ignore', 'ignore'],
      timeout: 7000,
    });
  } catch { /* never block a prompt */ }
}

try { main(); } catch { /* never block a prompt */ }
process.exit(0);
