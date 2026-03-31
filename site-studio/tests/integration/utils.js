'use strict';
const WebSocket = require('ws');

const DEFAULT_PORT = 3334;
const DEFAULT_BASE_URL = `http://localhost:${DEFAULT_PORT}`;

/**
 * Connect to Studio WebSocket. Returns an open ws instance.
 */
async function connect(port = DEFAULT_PORT) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(`ws://localhost:${port}`);
    const timer = setTimeout(() => {
      ws.terminate();
      reject(new Error(`Connection timeout to port ${port}`));
    }, 5000);
    ws.on('open', () => { clearTimeout(timer); resolve(ws); });
    ws.on('error', (err) => { clearTimeout(timer); reject(err); });
  });
}

/**
 * Send a chat message and wait for a terminal response.
 *
 * options:
 *   timeout        — ms before giving up (default 30000)
 *   waitForTypes   — message types that end the wait (default common terminal types)
 *   collectAll     — resolve with ALL messages received until timeout
 *   expectTimeout  — if true, a timeout resolves (not rejects) with collected messages
 */
async function sendChat(ws, message, options = {}) {
  const {
    timeout = 30000,
    waitForTypes = ['assistant', 'planning', 'brief', 'chat', 'error'],
    collectAll = false,
    expectTimeout = false,
  } = options;

  return new Promise((resolve, reject) => {
    const messages = [];

    const done = (result) => {
      clearTimeout(timer);
      ws.off('message', handler);
      resolve(result);
    };

    const fail = (err) => {
      clearTimeout(timer);
      ws.off('message', handler);
      if (expectTimeout) {
        resolve(messages);
      } else {
        reject(err);
      }
    };

    const timer = setTimeout(() => {
      if (collectAll || expectTimeout) {
        done(messages);
      } else {
        fail(new Error(`Timeout waiting for response to: "${String(message).slice(0, 50)}"`));
      }
    }, timeout);

    const handler = (data) => {
      let parsed;
      try { parsed = JSON.parse(data.toString()); } catch { return; }
      messages.push(parsed);
      if (!collectAll && waitForTypes.includes(parsed.type)) {
        done(parsed);
      }
    };

    ws.on('message', handler);
    ws.send(JSON.stringify({ type: 'chat', content: message }));
  });
}

/**
 * Send raw data (for malformed-JSON / protocol-abuse tests).
 */
function sendRaw(ws, data) {
  ws.send(data);
}

/**
 * Wait for a specific WS message type without sending anything.
 */
async function waitFor(ws, type, timeout = 10000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      ws.off('message', handler);
      reject(new Error(`Timeout waiting for message type "${type}"`));
    }, timeout);
    const handler = (data) => {
      let parsed;
      try { parsed = JSON.parse(data.toString()); } catch { return; }
      if (parsed.type === type) {
        clearTimeout(timer);
        ws.off('message', handler);
        resolve(parsed);
      }
    };
    ws.on('message', handler);
  });
}

/**
 * Ask Studio to switch to a site (or create it fresh).
 * Uses the switch-site WS message, which is what the UI does.
 */
async function switchSite(ws, tag) {
  ws.send(JSON.stringify({ type: 'switch-site', tag }));
  // Give it a moment to settle
  await sleep(800);
}

/**
 * POST to a REST endpoint. Returns parsed JSON (or raw text on failure).
 */
async function apiPost(path, body = {}) {
  const res = await fetch(`${DEFAULT_BASE_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  try { return await res.json(); } catch { return { status: res.status }; }
}

/**
 * GET from a REST endpoint. Returns parsed JSON.
 */
async function apiGet(path) {
  const res = await fetch(`${DEFAULT_BASE_URL}${path}`);
  try { return await res.json(); } catch { return { status: res.status }; }
}

/**
 * Get current spec from the running Studio.
 */
async function getSpec() {
  return apiGet('/api/spec');
}

/**
 * Sleep helper.
 */
function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

/**
 * Drain all pending WS messages for `ms` milliseconds (useful to clear noise).
 */
async function drain(ws, ms = 300) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Returns true if any message in `messages` has content matching `pattern`.
 */
function anyMatches(messages, pattern) {
  return messages.some(m => pattern.test(m.content || ''));
}

/**
 * Returns true if any message in `messages` is of the given type.
 */
function anyType(messages, type) {
  return messages.some(m => m.type === type);
}

module.exports = {
  connect,
  sendChat,
  sendRaw,
  waitFor,
  switchSite,
  apiPost,
  apiGet,
  getSpec,
  sleep,
  drain,
  anyMatches,
  anyType,
};
