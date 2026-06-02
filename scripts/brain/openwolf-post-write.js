#!/usr/bin/env node
/**
 * openwolf-post-write.js — OpenWolf memory trail (PostToolUse: Write|Edit|MultiEdit).
 *
 * Honors OPENWOLF.md rule 1: "After every significant action, append a one-line
 * entry to .wolf/memory.md."
 *
 * Lives in scripts/brain/ (TRACKED) — NOT in .wolf/hooks/, which is gitignored
 * (.gitignore: ".wolf/hooks/"). That gitignore is exactly why the original
 * settings.json hooks were dead: they referenced .wolf/hooks/*.js files that are
 * never committed and so absent on every fresh clone. Wiring the hook from a
 * tracked path fixes that for good.
 *
 * Cheap by design: a single append. It does NOT rewrite anatomy.md (~99 KB) on
 * every edit — anatomy regeneration stays a periodic/manual action. The trail
 * itself (.wolf/memory.md) is gitignored local runtime state. Contract: never
 * throw, never block, exit 0.
 */
'use strict';
const fs = require('fs');
const path = require('path');

try {
  let hook = {};
  try { hook = JSON.parse(fs.readFileSync(0, 'utf8') || '{}'); } catch {}

  const root = process.env.CLAUDE_PROJECT_DIR || process.cwd();
  const memory = path.join(root, '.wolf', 'memory.md');

  const tool = hook.tool_name || 'edit';
  const fp = (hook.tool_input && hook.tool_input.file_path) || '';
  const rel = fp.startsWith(root) ? fp.slice(root.length + 1) : fp;
  const stamp = new Date().toISOString().slice(0, 16).replace('T', ' ') + ' UTC';

  if (!rel) process.exit(0); // nothing identifiable to log

  if (!fs.existsSync(path.dirname(memory))) process.exit(0); // no .wolf/ → bail
  if (!fs.existsSync(memory)) {
    fs.writeFileSync(memory,
`# OpenWolf memory trail

One line per significant file action, appended automatically by
\`scripts/brain/openwolf-post-write.js\`. Newest at the bottom. This is the
lightweight chronological log (gitignored, local); durable knowledge still goes
to cerebrum.md / buglog.json.

`);
  }
  fs.appendFileSync(memory, `- ${stamp} — ${tool} ${rel}\n`);
} catch (e) {
  // never block a session
}
process.exit(0);
