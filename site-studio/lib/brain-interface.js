'use strict';
/**
 * BrainInterface — the universal Studio-to-Brain communication layer.
 *
 * Acts like a printer driver: Studio sends a standard command via execute(),
 * BrainInterface routes it to the active brain's adapter, maintains conversation
 * history, and injects a session context header on every message.
 *
 * Usage:
 *   const brain = new BrainInterface('claude', { tag: TAG, hubRoot: HUB_ROOT })
 *   const { content } = await brain.execute(userMessage, { maxTokens: 8192, mode: 'chat' })
 *
 * History management:
 *   - Conversation history is maintained per-instance
 *   - Brain switches preserve history (adapter reformats as needed)
 *   - `resetHistory()` clears on site switch or explicit clear
 *
 * Context header:
 *   Every message gets a header injected:
 *     [MODE: CHAT] [SITE: site-tag] [PAGE: about.html]
 *   This tells any brain it's inside FAMtastic Studio and what state is active.
 */

const { BrainAdapterFactory } = require('./brain-adapter-factory');
const fs  = require('fs');
const path = require('path');

// Modes that produce context headers
const VALID_MODES = ['chat', 'brainstorm', 'build', 'edit', 'deploy', 'inspect'];

class BrainInterface {
  /**
   * @param {string} brain       — Initial brain: 'claude' | 'gemini' | 'codex'
   * @param {object} opts
   *   tag      — Current site tag (TAG from server.js). Falls back to ws.currentSite.
   *   hubRoot  — Path to FAMtastic hub root
   *   page     — Current active page filename. Falls back to ws.currentPage.
   *   ws       — WebSocket connection (optional). When provided, context header
   *              reads site/page/mode from ws.currentSite, ws.currentPage, ws.currentMode
   *              so context is always live without manual opts updates.
   */
  constructor(brain = 'claude', opts = {}) {
    this.brain   = brain;
    this.ws      = opts.ws      || null;
    this.tag     = opts.tag     || null;
    this.hubRoot = opts.hubRoot || null;
    this.page    = opts.page    || null;
    this.adapter = BrainAdapterFactory.create(brain);
    this.conversationHistory = [];
  }

  /**
   * Send a message and get a response.
   * Prepends the session context header automatically.
   *
   * @param {string} message — User message
   * @param {object} opts
   *   stream          — bool: use streaming (default false)
   *   maxTokens       — per-call-site value
   *   mode            — 'chat' | 'brainstorm' | 'build' | 'edit' | 'deploy' | 'inspect'
   *   tools           — tool definitions array
   *   skipContextHeader — bool: skip header injection (for internal/system calls)
   *   ws              — WebSocket for streaming
   *   onChunk         — (text) => void for streaming
   *   wsMessageType   — ws message type key
   *   silenceTimeout  — ms before Haiku fallback (streaming only)
   *   onSilence       — callback fired on silence timeout (streaming only)
   *   abortControllers — array to register AbortController onto
   * @returns {{ content: string, usage, stopReason }}
   */
  async execute(message, opts = {}) {
    const {
      stream            = false,
      maxTokens         = 8192,
      mode              = 'chat',
      tools             = [],
      skipContextHeader = false,
      ws                = null,
      onChunk           = null,
      wsMessageType     = 'chunk',
      silenceTimeout    = 30000,
      onSilence         = null,
      abortControllers  = null,
      model             = null,
    } = opts;

    // Build context header and prepend to message
    const fullMessage = skipContextHeader
      ? message
      : this.buildContextHeader(mode) + message;

    // Add user turn to history (use original message, not header-prepended)
    this.conversationHistory.push({ role: 'user', content: message });

    const adapterOpts = {
      history:         this.conversationHistory.slice(0, -1), // history before this turn
      maxTokens,
      tools,
      ws,
      onChunk,
      wsMessageType,
      silenceTimeout,
      onSilence,
      abortControllers,
    };
    if (model) adapterOpts.model = model;

    let result;
    if (stream) {
      result = await this.adapter.executeStreaming(fullMessage, adapterOpts);
    } else {
      result = await this.adapter.execute(fullMessage, adapterOpts);
    }

    // Add assistant turn to history
    this.conversationHistory.push({ role: 'assistant', content: result.content || '' });

    return result;
  }

  /**
   * Build the context header injected at the start of every message.
   * Tells any brain it's inside FAMtastic Studio and what state is active.
   *
   * When a ws connection is attached, reads live state from ws.currentMode,
   * ws.currentSite, ws.currentPage — always current, never stale.
   * Falls back to opts-provided tag/page for non-WS usage.
   */
  buildContextHeader(mode) {
    // Prefer ws live state, fall back to opts-provided values
    const effectiveMode = mode || this.ws?.currentMode || 'chat';
    const effectiveSite = this.ws?.currentSite || this.tag;
    const effectivePage = this.ws?.currentPage || this.page;

    const modeLabel = VALID_MODES.includes(effectiveMode)
      ? `[MODE: ${effectiveMode.toUpperCase()}]`
      : '[MODE: CHAT]';

    const siteLabel = effectiveSite ? `[SITE: ${effectiveSite}]` : '[SITE: unknown]';
    const pageLabel = effectivePage ? `[PAGE: ${effectivePage}]` : '';

    const parts = [modeLabel, siteLabel, pageLabel].filter(Boolean);
    return parts.join(' ') + '\n\n';
  }

  /**
   * Update the active page (called when user switches pages in Studio).
   */
  setPage(page) { this.page = page; }

  /**
   * Update the active site tag (called on site switch — also resets history).
   */
  setSite(tag) {
    this.tag = tag;
    this.resetHistory();
  }

  /**
   * Clear conversation history.
   * Call on site switch or explicit session reset.
   */
  resetHistory() {
    this.conversationHistory = [];
  }

  /**
   * Return the active brain's capabilities.
   */
  getCapabilities() {
    return this.adapter.capabilities;
  }

  /**
   * Switch to a different brain mid-session.
   * History is preserved — the new adapter receives it on next execute().
   * Returns the preserved history for logging/inspection.
   *
   * @param {string} newBrain
   * @returns {Array} previous conversation history
   */
  switchBrain(newBrain) {
    const previousHistory = [...this.conversationHistory];
    this.brain   = newBrain;
    this.adapter = BrainAdapterFactory.create(newBrain);
    // History preserved — new adapter receives it on next execute()
    return previousHistory;
  }

  /**
   * Read the current STUDIO-CONTEXT.md for the active site.
   * Returns empty string if not found.
   */
  readStudioContext() {
    if (!this.hubRoot || !this.tag) return '';
    const contextPath = path.join(this.hubRoot, 'sites', this.tag, 'STUDIO-CONTEXT.md');
    try {
      return fs.readFileSync(contextPath, 'utf8');
    } catch {
      return '';
    }
  }

  /** How many turns (user + assistant) are in history */
  get historyLength() { return this.conversationHistory.length; }
}

module.exports = { BrainInterface };
