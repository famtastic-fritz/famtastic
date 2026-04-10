'use strict';
/**
 * CodexAdapter — OpenAI SDK wrapper for the Brain Adapter Pattern.
 *
 * Session 10 upgrade: switched from CLI subprocess to OpenAI API SDK.
 * OPENAI_API_KEY is now available. Real multi-turn, streaming, tool calling enabled.
 *
 * Note: Summarization always uses Claude regardless of active brain.
 * (cerebrum.md SUMMARIZATION_ALWAYS_CLAUDE)
 */

const OpenAI = require('openai');
const WebSocket = require('ws');
const { logAPICall } = require('../api-cost-tracker');
const path = require('path');

const DEFAULT_MODEL = 'gpt-4o';

class CodexAdapter {
  constructor() {
    if (!process.env.OPENAI_API_KEY) {
      console.warn('[CodexAdapter] OPENAI_API_KEY not set — Codex adapter will fail on use');
    }
    this.client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || '__not_set__' });
    this.capabilities = {
      multiTurn:   true,
      streaming:   true,
      toolCalling: true,
      vision:      true,
      maxTokens:   16000,
      bestFor:     ['focused-tasks', 'adversarial-review', 'code-generation', 'chat'],
    };
  }

  async execute(message, opts = {}) {
    const { history = [], maxTokens = 8192, stream = false, onChunk = null, ws = null, model = null } = opts;
    const resolvedModel = model || DEFAULT_MODEL;

    const messages = [
      ...history.slice(-20).map(h => ({ role: h.role, content: h.content })),
      { role: 'user', content: message },
    ];

    if (stream && (onChunk || ws)) {
      return this._executeStreaming(messages, maxTokens, resolvedModel, onChunk, ws);
    }
    return this._executeBlocking(messages, maxTokens, resolvedModel);
  }

  async _executeBlocking(messages, maxTokens, model) {
    const response = await this.client.chat.completions.create({
      model,
      messages,
      max_tokens: maxTokens,
    });

    const usage = response.usage;
    if (usage) {
      await logAPICall('openai', model, {
        input_tokens: usage.prompt_tokens,
        output_tokens: usage.completion_tokens,
      }).catch(() => {});
    }

    return {
      content: response.choices[0].message.content,
      usage: usage ? { input_tokens: usage.prompt_tokens, output_tokens: usage.completion_tokens } : null,
    };
  }

  async _executeStreaming(messages, maxTokens, model, onChunk, ws) {
    const streamResponse = await this.client.chat.completions.create({
      model,
      messages,
      max_tokens: maxTokens,
      stream: true,
      stream_options: { include_usage: true },
    });

    let fullText = '';
    let usage = null;

    for await (const chunk of streamResponse) {
      const text = chunk.choices[0]?.delta?.content || '';
      fullText += text;
      if (chunk.usage) usage = chunk.usage;

      if (text) {
        if (onChunk) onChunk(text);
        if (ws && ws.readyState === WebSocket.OPEN) {
          try { ws.send(JSON.stringify({ type: 'stream', content: text })); } catch {}
        }
      }
    }

    if (usage) {
      await logAPICall('openai', model, {
        input_tokens: usage.prompt_tokens,
        output_tokens: usage.completion_tokens,
      }).catch(() => {});
    }

    return {
      content: fullText,
      usage: usage ? { input_tokens: usage.prompt_tokens, output_tokens: usage.completion_tokens } : null,
    };
  }

  async executeStreaming(message, opts = {}) {
    return this.execute(message, { ...opts, stream: true });
  }

  get defaultModel() { return DEFAULT_MODEL; }
}

module.exports = { CodexAdapter };
