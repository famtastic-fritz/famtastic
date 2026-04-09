'use strict';
/**
 * GeminiAdapter — wraps @google/generative-ai for the Brain Adapter Pattern.
 *
 * Multi-turn: true via Gemini chat history (startChat with history).
 * Note: Gemini uses 'model' role where Claude uses 'assistant'.
 *
 * Important: Summarization always uses Claude regardless of active brain.
 * Do not call Gemini for summarization. (cerebrum.md SUMMARIZATION_ALWAYS_CLAUDE)
 */

const { GoogleGenerativeAI } = require('@google/generative-ai');

const DEFAULT_MODEL = 'gemini-2.0-flash';

// Lazy-initialize so module loads without GEMINI_API_KEY
let _client = null;
function getClient() {
  if (!_client) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) throw new Error('GEMINI_API_KEY not set');
    _client = new GoogleGenerativeAI(key);
  }
  return _client;
}

class GeminiAdapter {
  constructor() {
    this.capabilities = {
      multiTurn:   true,
      streaming:   true,
      toolCalling: true,
      vision:      true,
      maxTokens:   32000,
    };
  }

  /**
   * Non-streaming call.
   * @param {string} message
   * @param {object} opts  — { history, maxTokens, model }
   */
  async execute(message, opts = {}) {
    const { history = [], maxTokens = 8192, model = DEFAULT_MODEL } = opts;

    const client = getClient();
    const genModel = client.getGenerativeModel({
      model,
      generationConfig: { maxOutputTokens: maxTokens },
    });

    // Build Gemini-format history (last 20 turns)
    const geminiHistory = history.slice(-20).map(h => ({
      role:  h.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: h.content }],
    }));

    const chat   = genModel.startChat({ history: geminiHistory });
    const result = await chat.sendMessage(message);
    const text   = result.response.text();

    return { content: text, usage: null };
  }

  /**
   * Streaming call — iterates Gemini stream, calls onChunk per chunk.
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
    const client = getClient();
    const genModel = client.getGenerativeModel({
      model,
      generationConfig: { maxOutputTokens: maxTokens },
    });

    const geminiHistory = history.slice(-20).map(h => ({
      role:  h.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: h.content }],
    }));

    const chat   = genModel.startChat({ history: geminiHistory });
    const result = await chat.sendMessageStream(message);

    let fullText = '';
    for await (const chunk of result.stream) {
      const text = chunk.text();
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

module.exports = { GeminiAdapter, DEFAULT_MODEL };
