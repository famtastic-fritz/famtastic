'use strict';
/**
 * CodexAdapter — wraps the openai package for the Brain Adapter Pattern.
 * Uses gpt-4o via OpenAI-compatible API (ChatGPT Plus OAuth or OPENAI_API_KEY).
 *
 * Multi-turn: true via messages array.
 * Note: Summarization always uses Claude regardless of active brain.
 * (cerebrum.md SUMMARIZATION_ALWAYS_CLAUDE)
 */

const OpenAI = require('openai');

const DEFAULT_MODEL = 'gpt-4o';

// Lazy-initialize — allows require() without OPENAI_API_KEY set
let _client = null;
function getClient() {
  if (!_client) _client = new OpenAI();
  return _client;
}

class CodexAdapter {
  constructor() {
    this.capabilities = {
      multiTurn:   true,
      streaming:   true,
      toolCalling: true,
      vision:      true,
      maxTokens:   16000,
    };
  }

  /**
   * Non-streaming call.
   * @param {string} message
   * @param {object} opts  — { history, maxTokens, model }
   */
  async execute(message, opts = {}) {
    const { history = [], maxTokens = 8192, model = DEFAULT_MODEL } = opts;

    const messages = [
      ...history.slice(-20).map(h => ({ role: h.role, content: h.content })),
      { role: 'user', content: message },
    ];

    const client   = getClient();
    const response = await client.chat.completions.create({
      model,
      messages,
      max_tokens: maxTokens,
    });

    return {
      content:    response.choices[0].message.content || '',
      usage:      response.usage || null,
      stopReason: response.choices[0].finish_reason,
    };
  }

  /**
   * Streaming call — iterates OpenAI stream chunks.
   */
  async executeStreaming(message, opts = {}) {
    const {
      history       = [],
      maxTokens     = 8192,
      model         = DEFAULT_MODEL,
      onChunk       = null,
      ws            = null,
      wsMessageType = 'chunk',
    } = opts;

    const WebSocket = require('ws');
    const messages = [
      ...history.slice(-20).map(h => ({ role: h.role, content: h.content })),
      { role: 'user', content: message },
    ];

    const client = getClient();
    const stream = await client.chat.completions.create({
      model,
      messages,
      max_tokens: maxTokens,
      stream: true,
    });

    let fullText = '';
    for await (const chunk of stream) {
      const text = chunk.choices[0]?.delta?.content || '';
      if (text) {
        fullText += text;
        if (onChunk) onChunk(text);
        if (ws && ws.readyState === WebSocket.OPEN) {
          try { ws.send(JSON.stringify({ type: wsMessageType, content: text })); } catch {}
        }
      }
    }

    return { content: fullText, usage: null };
  }

  get defaultModel() { return DEFAULT_MODEL; }
}

module.exports = { CodexAdapter, DEFAULT_MODEL };
