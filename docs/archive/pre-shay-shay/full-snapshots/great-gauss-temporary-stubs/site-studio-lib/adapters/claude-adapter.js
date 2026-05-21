'use strict';
/**
 * ClaudeAdapter — wraps @anthropic-ai/sdk for the Brain Adapter Pattern.
 * Implements the standard Brain Adapter interface:
 *   execute(message, options)             → non-streaming call
 *   executeStreaming(messages, opts)      → streaming call with onChunk callback
 *
 * Multi-turn: true — history is passed as messages array to the SDK.
 * Summarization: always uses Claude regardless of active brain (see cerebrum.md SUMMARIZATION_ALWAYS_CLAUDE).
 *
 * Tool calling: CLAUDE-ONLY. STUDIO_TOOLS passed via opts.tools from BrainInterface.
 * Do NOT pass STUDIO_TOOLS to GeminiAdapter or CodexAdapter.
 * (DECISION: Tool calling is Claude-only, Session 10. Gemini/OpenAI deferred to Session 12.)
 *
 * ws flows through options only — NEVER stored as this.ws (C4).
 */

const Anthropic = require('@anthropic-ai/sdk');
const WebSocket = require('ws');
const { handleToolCall } = require('../tool-handlers');

// Lazy-initialize client so module can be required without ANTHROPIC_API_KEY set
let _client = null;
function getClient() {
  if (!_client) _client = new Anthropic();
  return _client;
}

// Default model — read from loadSettings() at call time; this is a fallback only.
const DEFAULT_MODEL  = 'claude-sonnet-4-6';
const HAIKU_MODEL    = 'claude-haiku-4-5-20251001';
const MAX_TOOL_DEPTH = 3; // recursion depth limit for _executeBlocking tool loops (C2)

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
   * Supports tool calling with recursion depth limit (C2).
   * ws flows through options only — never stored on instance (C4).
   *
   * @param {string} message  — The user message (context header already prepended)
   * @param {object} opts
   *   history    — array of { role, content } prior turns (last 20 used)
   *   maxTokens  — per-call-site value (see migration map Section 3)
   *   model      — override model string (C6: from ws.brainModels, falls back to DEFAULT_MODEL)
   *   tools      — Anthropic tool definitions array (CLAUDE-ONLY — do not pass from Gemini/Codex)
   *   ws         — WebSocket client (for tool notifications — NOT stored on this)
   *   signal     — AbortSignal for cancellation
   */
  async execute(message, opts = {}) {
    const { history = [], maxTokens = 8192, model = null, tools = [], ws = null, signal } = opts;

    const resolvedModel = model || DEFAULT_MODEL;

    const messages = [
      ...history.slice(-20).map(h => ({ role: h.role, content: h.content })),
      { role: 'user', content: message },
    ];

    return this._executeBlocking(messages, maxTokens, tools, 0, ws, resolvedModel, signal);
  }

  /**
   * Internal blocking executor with tool loop and recursion depth guard (C2).
   * ws flows through parameters only — never stored as this.ws (C4).
   *
   * @param {Array}   messages
   * @param {number}  maxTokens
   * @param {Array}   tools
   * @param {number}  depth       — current recursion depth (starts at 0)
   * @param {object}  ws          — WebSocket (optional, NOT stored on this)
   * @param {string}  model       — resolved model string
   * @param {object}  signal      — AbortSignal (optional)
   */
  async _executeBlocking(messages, maxTokens, tools, depth = 0, ws = null, model = DEFAULT_MODEL, signal = null) {
    // Depth limit guard (C2) — prevents infinite loops on tool errors
    if (depth >= MAX_TOOL_DEPTH) {
      return {
        content:           'I reached the maximum number of tool calls for this request.',
        usage:             null,
        stopReason:        'depth_limit_reached',
        depth_limit_reached: true,
      };
    }

    const client      = getClient();
    const requestOpts = signal ? { signal } : {};

    const response = await client.messages.create({
      model,
      max_tokens: maxTokens,
      messages,
      tools: tools.length > 0 ? tools : undefined,
    }, requestOpts);

    // Handle tool_use stop reason — execute tools and recurse
    if (response.stop_reason === 'tool_use') {
      const toolUseBlocks = response.content.filter(b => b.type === 'tool_use');
      const toolResults   = [];

      for (const block of toolUseBlocks) {
        console.log(`TOOL_CALL [depth=${depth}] — ${block.name}`);
        let result;
        try {
          result = await handleToolCall(block.name, block.input || {}, ws);
        } catch (e) {
          result = { error: `Tool execution error: ${e.message}` };
        }
        toolResults.push({
          type:       'tool_result',
          tool_use_id: block.id,
          content:    JSON.stringify(result),
        });
      }

      // Append assistant turn + tool results and recurse
      const nextMessages = [
        ...messages,
        { role: 'assistant', content: response.content },
        { role: 'user',      content: toolResults },
      ];

      return this._executeBlocking(nextMessages, maxTokens, tools, depth + 1, ws, model, signal);
    }

    return {
      content:    response.content.find(b => b.type === 'text')?.text || '',
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
      model        = null,         // C6: caller may pass ws.brainModels override
      onChunk      = null,
      ws           = null,         // C4: ws through options, never stored on this
      wsMessageType = 'chunk',
      silenceTimeout  = 30000,
      onSilence    = null,
      abortControllers = null,
    } = opts;

    const resolvedModel = model || DEFAULT_MODEL;

    const controller = new AbortController();
    if (abortControllers) abortControllers.push(controller);

    const messages = [
      ...history.slice(-20).map(h => ({ role: h.role, content: h.content })),
      { role: 'user', content: message },
    ];

    const client = getClient();
    const stream = client.messages.stream({
      model: resolvedModel,
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
