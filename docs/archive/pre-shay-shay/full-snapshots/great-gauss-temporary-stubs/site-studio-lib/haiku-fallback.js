'use strict';
/**
 * haiku-fallback.js — SDK-based Haiku fallback for silence timeouts.
 *
 * Called when the primary Sonnet stream produces no output for 30s.
 * Uses claude-haiku for fast completion.
 *
 * Usage:
 *   const { fallbackToHaiku } = require('./haiku-fallback');
 *   await fallbackToHaiku(messages, onChunk, ws);
 */

const Anthropic = require('@anthropic-ai/sdk');
const WebSocket = require('ws');

const HAIKU_MODEL = 'claude-haiku-4-5-20251001';

// Lazy singleton — shares client with server.js where possible
let _client = null;
function getClient() {
  if (!_client) _client = new Anthropic();
  return _client;
}

/**
 * Stream a Haiku response for the given messages array.
 * Called when silence timeout fires during main chat streaming.
 *
 * @param {Array}    messages  — full messages array (same format as SDK)
 * @param {Function} onChunk   — optional (text: string) => void callback
 * @param {object}   ws        — optional WebSocket for real-time chunk delivery
 * @param {object}   opts
 *   maxTokens       — default 4096
 *   wsMessageType   — ws message type key (default 'chunk')
 *   fallbackFlag    — if true, sends { fallback: true } marker in WS messages (default true)
 * @returns {Promise<{ content: string, usage: object|null }>}
 */
async function fallbackToHaiku(messages, onChunk, ws, opts = {}) {
  const {
    maxTokens    = 4096,
    wsMessageType = 'chunk',
    fallbackFlag  = true,
  } = opts;

  const client = getClient();
  let fullText = '';

  try {
    const stream = client.messages.stream({
      model:      HAIKU_MODEL,
      max_tokens: maxTokens,
      messages,
    });

    for await (const event of stream) {
      if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
        const text = event.delta.text;
        fullText += text;

        if (ws && ws.readyState === WebSocket.OPEN) {
          try {
            ws.send(JSON.stringify({
              type:     wsMessageType,
              content:  text,
              ...(fallbackFlag ? { fallback: true } : {}),
            }));
          } catch {}
        }

        if (onChunk) onChunk(text);
      }
    }

    const finalMessage = await stream.finalMessage().catch(() => null);
    return { content: fullText, usage: finalMessage?.usage || null };

  } catch (err) {
    console.error('[haiku-fallback] Error:', err.message);
    // If Haiku fallback also fails, send error to client
    if (ws && ws.readyState === WebSocket.OPEN) {
      try {
        ws.send(JSON.stringify({ type: 'error', message: 'Response timed out.' }));
      } catch {}
    }
    return { content: fullText, usage: null };
  }
}

module.exports = { fallbackToHaiku, HAIKU_MODEL };
