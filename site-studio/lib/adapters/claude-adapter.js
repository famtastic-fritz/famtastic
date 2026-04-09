'use strict';
/**
 * ClaudeAdapter — wraps @anthropic-ai/sdk for the Brain Adapter Pattern.
 * Implements the standard Brain Adapter interface:
 *   execute(message, options)             → non-streaming call
 *   executeStreaming(messages, opts)      → streaming call with onChunk callback
 *
 * Multi-turn: true — history is passed as messages array to the SDK.
 * Summarization: always uses Claude regardless of active brain (see cerebrum.md SUMMARIZATION_ALWAYS_CLAUDE).
 */

const Anthropic = require('@anthropic-ai/sdk');
const WebSocket = require('ws');

// Lazy-initialize client so module can be required without ANTHROPIC_API_KEY set
let _client = null;
function getClient() {
  if (!_client) _client = new Anthropic();
  return _client;
}

// Default model — read from loadSettings() at call time; this is a fallback only.
const DEFAULT_MODEL = 'claude-sonnet-4-6';
const HAIKU_MODEL   = 'claude-haiku-4-5-20251001';

class ClaudeAdapter {
  constructor() {
    this.capabilities = {
      multiTurn:   true,
      streaming:   true,
      toolCalling: true,
      vision:      true,
      maxTokens:   64000,
    };
  }

  /**
   * Non-streaming call. Resolves with { content, usage, stopReason }.
   * @param {string} message  — The user message (context header already prepended)
   * @param {object} opts
   *   history    — array of { role, content } prior turns (last 20 used)
   *   maxTokens  — per-call-site value (see migration map Section 3)
   *   model      — override model string (defaults to DEFAULT_MODEL)
   *   tools      — Anthropic tool definitions array
   *   signal     — AbortSignal for cancellation
   */
  async execute(message, opts = {}) {
    const { history = [], maxTokens = 8192, model = DEFAULT_MODEL, tools = [], signal } = opts;

    const messages = [
      ...history.slice(-20).map(h => ({ role: h.role, content: h.content })),
      { role: 'user', content: message },
    ];

    const client = getClient();
    const requestOpts = signal ? { signal } : {};

    const response = await client.messages.create({
      model,
      max_tokens: maxTokens,
      messages,
      tools: tools.length > 0 ? tools : undefined,
    }, requestOpts);

    return {
      content:    response.content[0]?.text || '',
      usage:      response.usage,
      stopReason: response.stop_reason,
    };
  }

  /**
   * Streaming call. Streams chunks to onChunk callback and WS client.
   * Implements the silence-timer pattern from the migration map Section 3.
   * Returns { content, usage } after stream completes.
   *
   * @param {string} message
   * @param {object} opts
   *   history         — prior conversation turns
   *   maxTokens       — per-call-site value
   *   model           — model override
   *   onChunk         — (text: string) => void — called per text delta
   *   ws              — WebSocket client for real-time streaming
   *   wsMessageType   — ws message type key (default: 'chunk')
   *   silenceTimeout  — ms before Haiku fallback fires (default: 30000)
   *   onSilence       — callback fired when silence timeout trips
   *   abortControllers — array to push AbortController onto (for WS-close cancellation)
   */
  async executeStreaming(message, opts = {}) {
    const {
      history      = [],
      maxTokens    = 16384,
      model        = DEFAULT_MODEL,
      onChunk      = null,
      ws           = null,
      wsMessageType = 'chunk',
      silenceTimeout  = 30000,
      onSilence    = null,
      abortControllers = null,
    } = opts;

    const controller = new AbortController();
    if (abortControllers) abortControllers.push(controller);

    const messages = [
      ...history.slice(-20).map(h => ({ role: h.role, content: h.content })),
      { role: 'user', content: message },
    ];

    const client = getClient();
    const stream = client.messages.stream({
      model,
      max_tokens: maxTokens,
      messages,
    }, { signal: controller.signal });

    // Silence timer — resets on every received chunk, fires Haiku fallback if no output
    let silenceTimer = null;
    let retriedWithHaiku = false;
    let response = '';

    const resetSilenceTimer = () => {
      if (silenceTimer) clearTimeout(silenceTimer);
      if (retriedWithHaiku || !onSilence) return;
      silenceTimer = setTimeout(() => {
        if (response.length === 0 && !retriedWithHaiku) {
          retriedWithHaiku = true;
          controller.abort();
          if (onSilence) onSilence();
        }
      }, silenceTimeout);
    };

    resetSilenceTimer();

    try {
      for await (const event of stream) {
        if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
          const text = event.delta.text;
          response += text;
          resetSilenceTimer();

          if (onChunk) onChunk(text);
          if (ws && ws.readyState === WebSocket.OPEN) {
            try { ws.send(JSON.stringify({ type: wsMessageType, content: text })); } catch {}
          }
        }
      }
    } catch (err) {
      if (silenceTimer) clearTimeout(silenceTimer);
      // AbortError is expected on WS close or silence timeout — not a real error
      if (err.name !== 'AbortError' && err.name !== 'APIUserAbortError') throw err;
      return { content: response, usage: null, aborted: true };
    }

    if (silenceTimer) clearTimeout(silenceTimer);
    const finalMessage = await stream.finalMessage().catch(() => null);

    return {
      content: response,
      usage:   finalMessage?.usage || null,
    };
  }

  /**
   * Returns HAIKU_MODEL constant for fallback calls.
   */
  get haikuModel() { return HAIKU_MODEL; }
  get defaultModel() { return DEFAULT_MODEL; }
}

module.exports = { ClaudeAdapter, DEFAULT_MODEL, HAIKU_MODEL };
