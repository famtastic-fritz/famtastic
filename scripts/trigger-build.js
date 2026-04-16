#!/usr/bin/env node
// trigger-build.js — send a build WebSocket message to Studio and
// wait for BUILD_COMPLETED (or timeout). Used by Session 12 Phase 4
// to drive a fresh Altitude build from the terminal.

const WebSocket = require('/Users/famtasticfritz/famtastic/site-studio/node_modules/ws');

const MSG = process.argv[2] || 'Build the complete site now — home, experience, reserve pages. Use the full FAMtastic layered hero vocabulary.';
const TIMEOUT_MS = parseInt(process.argv[3] || '900000', 10); // 15 min default

const ws = new WebSocket('ws://localhost:3334');

let done = false;
const timer = setTimeout(() => {
  if (!done) {
    console.error(`[trigger-build] timed out after ${TIMEOUT_MS}ms`);
    process.exit(2);
  }
}, TIMEOUT_MS);

ws.on('open', () => {
  console.log('[trigger-build] connected — sending build message');
  ws.send(JSON.stringify({ type: 'message', content: MSG }));
});

ws.on('message', (buf) => {
  let msg;
  try { msg = JSON.parse(buf.toString()); } catch { return; }

  // Log everything with a one-line summary
  const preview = (msg.content || msg.message || msg.text || '').toString().slice(0, 120);
  console.log(`[${msg.type}] ${preview}`);

  // Studio signals build completion as an assistant message starting with "Site built!"
  // plus a subsequent reload-preview. We watch for the assistant string.
  if (msg.type === 'assistant' && /^Site built!/i.test(msg.content || '')) {
    done = true;
    clearTimeout(timer);
    console.log('[trigger-build] BUILD COMPLETED — waiting 3s for post-processing then closing');
    setTimeout(() => { ws.close(); process.exit(0); }, 3000);
  }
  if (msg.type === 'error') {
    console.error('[trigger-build] error:', msg.content || msg);
  }
});

ws.on('error', (err) => {
  console.error('[trigger-build] ws error:', err.message);
  process.exit(3);
});

ws.on('close', () => {
  if (!done) {
    console.error('[trigger-build] connection closed before build completed');
    process.exit(4);
  }
});
