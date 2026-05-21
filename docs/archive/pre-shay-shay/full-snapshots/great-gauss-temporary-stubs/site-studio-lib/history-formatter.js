'use strict';
/**
 * history-formatter.js — Per-brain conversation history formatting
 *
 * Each brain expects conversation history in a different format.
 * Summarization always uses Claude regardless of the active brain.
 *
 * Usage:
 *   const { HISTORY_FORMATS, formatHistoryForBrain, summarizeHistory } = require('./history-formatter');
 *   const formatted = formatHistoryForBrain('gemini', history);
 */

const { spawnSync } = require('child_process');
const path = require('path');
const os   = require('os');

const HUB_ROOT = path.resolve(__dirname, '..', '..');

// ── Format functions per brain ────────────────────────────────────────────────

const HISTORY_FORMATS = {
  claude: (history) => JSON.stringify({
    messages: history.map(h => ({ role: h.role, content: h.content }))
  }),
  gemini: (history) => history
    .map(h => `${h.role === 'user' ? 'Human' : 'Assistant'}: ${h.content}`)
    .join('\n\n') + '\n\nHuman:',
  codex: (history) => '### Prior conversation:\n' +
    history.map(h => `${h.role}: ${h.content}`).join('\n') +
    '\n### Current request:'
};

/**
 * Format history for a specific brain.
 * @param {'claude'|'gemini'|'codex'} brain
 * @param {Array<{role: string, content: string}>} history
 * @returns {string}
 */
function formatHistoryForBrain(brain, history) {
  if (!Array.isArray(history) || history.length === 0) return '';
  const formatter = HISTORY_FORMATS[brain];
  if (!formatter) return '';
  return formatter(history);
}

/**
 * Summarize the oldest N turns of history using Claude.
 * Summarization ALWAYS uses Claude regardless of the active brain.
 * Logged with source: 'summarization' in telemetry.
 *
 * When history > 20 turns, summarizes oldest 10 using Claude.
 *
 * @param {Array<{role: string, content: string}>} history
 * @param {object} [opts]
 * @param {number} [opts.threshold=20]  — trigger summarization when history exceeds this
 * @param {number} [opts.summarizeCount=10]  — how many oldest turns to summarize
 * @returns {{ history: Array, summarized: boolean }}
 */
function summarizeHistory(history, opts = {}) {
  const threshold = opts.threshold || 20;
  const summarizeCount = opts.summarizeCount || 10;

  if (!Array.isArray(history) || history.length <= threshold) {
    return { history, summarized: false };
  }

  // Split: oldest summarizeCount turns + remaining
  const toSummarize = history.slice(0, summarizeCount);
  const remaining   = history.slice(summarizeCount);

  // Build a prompt for Claude to summarize
  // Summarization always uses Claude regardless of active brain
  const conversationText = toSummarize
    .map(h => `${h.role}: ${h.content}`)
    .join('\n');

  const summaryPrompt = `Summarize the following conversation excerpt in 3-5 sentences. Focus on key decisions, context, and facts established:\n\n${conversationText}\n\nSummary:`;

  let summaryContent = `[Summary of ${summarizeCount} earlier turns]`;

  // Call Claude CLI for summarization
  const claudeCli = path.join(HUB_ROOT, 'scripts', 'claude-cli');
  try {
    // source: 'summarization' — always Claude, logged for telemetry
    const result = spawnSync(claudeCli, [], {
      input: summaryPrompt,
      encoding: 'utf8',
      timeout: 30000,
      cwd: os.tmpdir(), // per cerebrum.md: spawnClaude must use os.tmpdir()
      env: { ...process.env },
    });
    if (result.status === 0 && result.stdout && result.stdout.trim()) {
      summaryContent = result.stdout.trim();
    }
  } catch {
    // graceful fallback — keep placeholder summary
  }

  // Create a single assistant turn representing the summarized content
  const summaryTurn = {
    role: 'assistant',
    content: summaryContent,
    meta: { source: 'summarization', summarized_turns: summarizeCount }
  };

  const newHistory = [summaryTurn, ...remaining];

  return { history: newHistory, summarized: true, originalLength: history.length };
}

module.exports = { HISTORY_FORMATS, formatHistoryForBrain, summarizeHistory };
