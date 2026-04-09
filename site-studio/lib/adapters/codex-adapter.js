'use strict';
/**
 * CodexAdapter — wraps the Codex CLI subprocess for the Brain Adapter Pattern.
 *
 * Codex is authenticated via ChatGPT Plus subscription through the Codex CLI.
 * It does NOT use the OpenAI API or OPENAI_API_KEY — they are separate billing systems.
 *
 * This adapter is best for: focused single-task execution, adversarial review,
 * code generation. Best-effort multi-turn via text formatting (documented CLI limitation).
 *
 * Note: Summarization always uses Claude regardless of active brain.
 * (cerebrum.md SUMMARIZATION_ALWAYS_CLAUDE)
 */

const { spawn } = require('child_process');
const path = require('path');

class CodexAdapter {
  constructor() {
    // CLI subprocess — ChatGPT Plus OAuth, no OPENAI_API_KEY needed
    this.capabilities = {
      multiTurn:   false,       // subprocess, best-effort text formatting only
      streaming:   false,       // single-shot response
      toolCalling: false,       // not available via CLI
      vision:      false,       // not available via CLI
      maxTokens:   16000,
      bestFor:     ['focused-tasks', 'adversarial-review', 'code-generation'],
    };
  }

  /**
   * Execute a prompt via fam-convo-get-codex CLI subprocess.
   * @param {string} message
   * @param {object} opts  — { history, maxTokens }
   */
  async execute(message, opts = {}) {
    const { history = [], maxTokens = 8192 } = opts;

    // Format history as best-effort text (documented CLI limitation — no structured API)
    const formattedHistory = history.slice(-10)
      .map(h => `${h.role === 'user' ? 'Human' : 'Assistant'}: ${h.content}`)
      .join('\n\n');

    const fullPrompt = formattedHistory
      ? `### Prior conversation:\n${formattedHistory}\n\n### Current task:\n${message}`
      : message;

    // Resolve adapter path — HUB_ROOT may not be available in lib context
    const hubRoot = process.env.HUB_ROOT || path.join(__dirname, '..', '..', '..');
    const adapterPath = path.join(hubRoot, 'adapters', 'codex', 'fam-convo-get-codex');
    const tag = process.env.SITE_TAG || 'default';

    return new Promise((resolve, reject) => {
      const child = spawn(adapterPath, [tag], {
        env:   { ...process.env, HUB_ROOT: hubRoot },
        cwd:   hubRoot,
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      let output = '';
      let errOutput = '';

      child.stdout.on('data', d => { output += d.toString(); });
      child.stderr.on('data', d => { errOutput += d.toString(); });

      child.stdin.write(fullPrompt);
      child.stdin.end();

      child.on('error', err => {
        reject(new Error(`Codex CLI spawn error: ${err.message}`));
      });

      child.on('close', code => {
        if (code === 0 || output.trim()) {
          // Try to extract content from JSONL output
          try {
            const lines = output.trim().split('\n').filter(Boolean);
            // fam-convo-get-codex writes a status line; look for JSONL record
            for (let i = lines.length - 1; i >= 0; i--) {
              try {
                const record = JSON.parse(lines[i]);
                const assistantMsg = record.messages?.find(m => m.role === 'assistant');
                if (assistantMsg) {
                  resolve({ content: assistantMsg.content, usage: null });
                  return;
                }
              } catch { /* skip non-JSON lines */ }
            }
          } catch { /* fall through */ }
          resolve({ content: output.trim(), usage: null });
        } else {
          reject(new Error(`Codex CLI failed (exit ${code}): ${errOutput.slice(0, 200)}`));
        }
      });
    });
  }

  /**
   * Streaming not supported via CLI — delegates to execute() and streams the single chunk.
   * The onChunk callback receives the complete response as one chunk on completion.
   */
  async executeStreaming(message, opts = {}) {
    const { onChunk = null, ws = null, wsMessageType = 'chunk' } = opts;
    const WebSocket = require('ws');

    const result = await this.execute(message, opts);
    const text = result.content || '';

    // Deliver as single chunk
    if (onChunk) onChunk(text);
    if (ws && ws.readyState === WebSocket.OPEN) {
      try { ws.send(JSON.stringify({ type: wsMessageType, content: text })); } catch {}
    }

    return result;
  }

  get defaultModel() { return 'codex-cli'; }
}

module.exports = { CodexAdapter };
