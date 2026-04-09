'use strict';
/**
 * BrainAdapterFactory — creates the correct adapter for the active brain.
 * Like a printer driver: the application sends a standard command,
 * the factory returns the right adapter to execute it.
 *
 * Supported brains: claude, gemini, codex
 * Unknown brain: returns ClaudeAdapter (safe fallback, logs warning)
 */

const { ClaudeAdapter } = require('./adapters/claude-adapter');
const { GeminiAdapter } = require('./adapters/gemini-adapter');
const { CodexAdapter }  = require('./adapters/codex-adapter');

const BrainAdapterFactory = {
  /**
   * @param {string} brain — 'claude' | 'gemini' | 'codex'
   * @returns {ClaudeAdapter|GeminiAdapter|CodexAdapter}
   */
  create(brain) {
    switch (brain) {
      case 'claude': return new ClaudeAdapter();
      case 'gemini': return new GeminiAdapter();
      case 'codex':  return new CodexAdapter();
      default:
        console.warn(`[brain-adapter-factory] Unknown brain "${brain}" — falling back to ClaudeAdapter`);
        return new ClaudeAdapter();
    }
  },

  /** List all supported brain names */
  supportedBrains: ['claude', 'gemini', 'codex'],
};

module.exports = { BrainAdapterFactory };
