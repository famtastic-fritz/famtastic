'use strict';
/**
 * brain-injector.js — Injects STUDIO-CONTEXT.md into each brain's session
 *
 * Each brain has its own injection mechanism:
 *   Claude Code — adds @STUDIO-CONTEXT.md reference to CLAUDE.md if not present
 *   Gemini      — reads context file content for prepending to prompts
 *   Codex       — reads context file content for passing as system context
 *
 * The context file (STUDIO-CONTEXT.md) is maintained by studio-context-writer.js.
 * This module provides helpers for reading and injecting it per-brain.
 *
 * Usage:
 *   const brainInjector = require('./brain-injector');
 *   brainInjector.inject('claude', contextFilePath);
 *   const context = brainInjector.readContext(contextFilePath);
 */

const fs   = require('fs');
const path = require('path');

const CLAUDE_MD_INCLUDE_MARKER = '<!-- studio-context-include -->';
const CLAUDE_MD_INCLUDE_LINE   = `\n${CLAUDE_MD_INCLUDE_MARKER}\n@STUDIO-CONTEXT.md\n`;

/**
 * Injects context for a specific brain.
 * @param {'claude'|'gemini'|'codex'} brain
 * @param {string} contextFilePath  Absolute path to STUDIO-CONTEXT.md
 * @param {object} options
 * @param {string} [options.claudeMdPath]  Path to CLAUDE.md (defaults to hubRoot/CLAUDE.md)
 */
function inject(brain, contextFilePath, options = {}) {
  if (!fs.existsSync(contextFilePath)) return { success: false, reason: 'context file not found' };

  switch (brain) {
    case 'claude':
      return injectClaude(contextFilePath, options);
    case 'gemini':
      return injectGeminiCodex('gemini', contextFilePath);
    case 'codex':
      return injectGeminiCodex('codex', contextFilePath);
    default:
      return { success: false, reason: `unknown brain: ${brain}` };
  }
}

/**
 * Claude Code injection: add @STUDIO-CONTEXT.md include to CLAUDE.md if not present.
 * Claude Code reads @-references in CLAUDE.md at session start.
 */
function injectClaude(contextFilePath, options) {
  const hubRoot     = path.dirname(contextFilePath);
  const claudeMdPath = options.claudeMdPath || path.join(hubRoot, 'CLAUDE.md');

  if (!fs.existsSync(claudeMdPath)) {
    return { success: false, reason: 'CLAUDE.md not found' };
  }

  const current = fs.readFileSync(claudeMdPath, 'utf8');
  if (current.includes(CLAUDE_MD_INCLUDE_MARKER)) {
    return { success: true, action: 'already_present' };
  }

  // Append the include at the end of CLAUDE.md
  fs.appendFileSync(claudeMdPath, CLAUDE_MD_INCLUDE_LINE, 'utf8');
  return { success: true, action: 'appended' };
}

/**
 * Gemini / Codex injection: write a small sidecar file that the adapter reads
 * and prepends to every prompt. This is the non-Claude-Code approach since those
 * CLIs don't natively support @-file references.
 */
function injectGeminiCodex(brain, contextFilePath) {
  const hubRoot   = path.dirname(contextFilePath);
  const sidecar   = path.join(hubRoot, `.brain-context-${brain}`);
  const relPath   = path.relative(hubRoot, contextFilePath);

  // Write sidecar pointing to the context file path
  fs.writeFileSync(sidecar, contextFilePath, 'utf8');
  return { success: true, action: 'sidecar_written', sidecar, relPath };
}

/**
 * Reads STUDIO-CONTEXT.md content. Used by adapters to prepend context to prompts.
 * Returns empty string if file doesn't exist.
 */
function readContext(contextFilePath) {
  if (!contextFilePath || !fs.existsSync(contextFilePath)) return '';
  try { return fs.readFileSync(contextFilePath, 'utf8'); } catch { return ''; }
}

/**
 * Returns the context file path from the brain's sidecar, if it exists.
 * Used by gemini/codex adapters.
 */
function getContextPathForBrain(brain, hubRoot) {
  const sidecar = path.join(hubRoot, `.brain-context-${brain}`);
  if (!fs.existsSync(sidecar)) return null;
  const p = fs.readFileSync(sidecar, 'utf8').trim();
  return fs.existsSync(p) ? p : null;
}

/**
 * Reinjects context when brain switches (G7).
 * Reads current STUDIO-CONTEXT.md and writes a brain-specific sidecar.
 * @param {'claude'|'gemini'|'codex'} brain
 * @param {string} tag — active site tag
 * @param {string} hubRoot — path to repo root
 */
function reinject(brain, tag, hubRoot) {
  const contextFile = path.join(hubRoot, 'STUDIO-CONTEXT.md');
  if (!fs.existsSync(contextFile)) {
    console.log(`[brain-injector] BRAIN_CONTEXT_INJECTED — switched to ${brain}, sidecar skipped (no context file)`);
    return { success: false, reason: 'STUDIO-CONTEXT.md not found' };
  }

  // Write brain-specific sidecar with current context
  const sidecarPath = path.join(hubRoot, `sites`, tag, `STUDIO-CONTEXT-${brain}.md`);
  try {
    const dir = path.dirname(sidecarPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const content = fs.readFileSync(contextFile, 'utf8');
    fs.writeFileSync(sidecarPath, content, 'utf8');
    console.log(`[brain-injector] BRAIN_CONTEXT_INJECTED — switched to ${brain}, sidecar updated`);
    return { success: true, sidecarPath };
  } catch (err) {
    console.error(`[brain-injector] reinject error:`, err.message);
    return { success: false, reason: err.message };
  }
}

module.exports = {
  inject,
  reinject,
  readContext,
  getContextPathForBrain,
  CLAUDE_MD_INCLUDE_MARKER,
};
