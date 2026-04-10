#!/usr/bin/env node
/**
 * session11-approve-and-build.js
 *
 * Opens a WS to the running studio, sends `approve-brief` (which the
 * server uses to trigger a real build), and streams frames until
 * verification-result fires.
 */
'use strict';

const WS_URL  = process.env.STUDIO_WS || 'ws://127.0.0.1:3334';
const TIMEOUT = parseInt(process.env.BUILD_TIMEOUT_MS || '900000', 10); // 15 min

const WebSocket = require(require.resolve('ws', {
  paths: ['/Users/famtasticfritz/famtastic/site-studio'],
}));

const ws = new WebSocket(WS_URL);
const start = Date.now();
let lastFrameAt = Date.now();
let done = false;

const watchdog = setInterval(() => {
  if (Date.now() - start > TIMEOUT) {
    console.error(`\n[driver] timeout after ${Math.round(TIMEOUT/1000)}s`);
    ws.close(); setTimeout(() => process.exit(2), 500);
  }
  if (Date.now() - lastFrameAt > 180000 && !done) {
    console.error(`\n[driver] no frames for 180s — assuming stalled`);
    ws.close(); setTimeout(() => process.exit(3), 500);
  }
}, 5000);

function ts() {
  const s = Math.round((Date.now() - start) / 1000);
  return `[+${String(s).padStart(4)}s]`;
}

ws.on('open', () => {
  console.log(`${ts()} [driver] connected → ${WS_URL}`);
  console.log(`${ts()} [driver] sending approve-brief`);
  ws.send(JSON.stringify({ type: 'approve-brief' }));
});

ws.on('message', (data) => {
  lastFrameAt = Date.now();
  let msg;
  try { msg = JSON.parse(data); } catch { return; }
  const t = msg.type || '<no-type>';
  if (t === 'token' || t === 'stream' || t === 'thinking') {
    process.stdout.write('.');
    return;
  }
  let preview = '';
  if (msg.content)      preview = String(msg.content).slice(0, 240);
  else if (msg.message) preview = String(msg.message).slice(0, 240);
  else if (msg.status)  preview = String(msg.status).slice(0, 240);
  console.log(`\n${ts()} [${t}] ${preview}`);
  if (t === 'verification-result') {
    console.log(`${ts()} [driver] BUILD DONE — passed=${msg.passed} failed=${msg.failed}`);
    done = true;
    setTimeout(() => ws.close(), 1500);
  }
  if (t === 'error') console.error(`${ts()} [driver] server error`);
});

ws.on('close', () => {
  clearInterval(watchdog);
  console.log(`\n${ts()} [driver] socket closed (done=${done})`);
  process.exit(done ? 0 : 1);
});

ws.on('error', (err) => {
  console.error(`${ts()} [driver] socket error: ${err.message}`);
  process.exit(4);
});
