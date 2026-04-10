#!/usr/bin/env node
/**
 * session11-drive-build.js — Session 11 fresh-build driver
 *
 * Opens a WebSocket to the running Studio (default ws://127.0.0.1:3334),
 * issues a build chat message, and streams the responses to stdout until
 * the build finishes (verification-result frame) or the timeout fires.
 *
 * Usage:  node scripts/session11-drive-build.js "<chat message>"
 */

'use strict';

const WS_URL  = process.env.STUDIO_WS || 'ws://127.0.0.1:3334';
const TIMEOUT = parseInt(process.env.BUILD_TIMEOUT_MS || '600000', 10); // 10 min default
const message = process.argv.slice(2).join(' ').trim() ||
  'Build the site based on the design brief. Generate index.html, services.html, and contact.html.';

const WebSocket = require(require.resolve('ws', { paths: ['/Users/famtasticfritz/famtastic/site-studio'] }));

const ws = new WebSocket(WS_URL);
const start = Date.now();
let lastFrameAt = Date.now();
let done = false;

const watchdog = setInterval(() => {
  if (Date.now() - start > TIMEOUT) {
    console.error(`\n[driver] timeout after ${Math.round(TIMEOUT/1000)}s — closing`);
    ws.close();
    setTimeout(() => process.exit(2), 500);
  }
  if (Date.now() - lastFrameAt > 90000 && !done) {
    console.error(`\n[driver] no frames for 90s — assuming stalled, closing`);
    ws.close();
    setTimeout(() => process.exit(3), 500);
  }
}, 5000);

function ts() {
  const s = Math.round((Date.now() - start) / 1000);
  return `[+${String(s).padStart(4)}s]`;
}

ws.on('open', () => {
  console.log(`${ts()} [driver] connected to ${WS_URL}`);
  console.log(`${ts()} [driver] sending build message: ${message}`);
  ws.send(JSON.stringify({ type: 'chat', content: message }));
});

ws.on('message', (data) => {
  lastFrameAt = Date.now();
  let msg;
  try { msg = JSON.parse(data); } catch { console.log(`${ts()} <raw> ${String(data).slice(0,200)}`); return; }
  const t = msg.type || '<no-type>';
  // Compress noisy frames
  if (t === 'token' || t === 'stream' || t === 'thinking') {
    process.stdout.write('.');
    return;
  }
  let preview = '';
  if (msg.content)         preview = String(msg.content).slice(0, 200);
  else if (msg.message)    preview = String(msg.message).slice(0, 200);
  else if (msg.status)     preview = String(msg.status).slice(0, 200);
  else if (msg.text)       preview = String(msg.text).slice(0, 200);
  console.log(`\n${ts()} [${t}] ${preview}`);

  if (t === 'verification-result') {
    console.log(`${ts()} [driver] BUILD DONE — checks=${(msg.checks||[]).length} ok=${msg.passed} fail=${msg.failed}`);
    done = true;
    setTimeout(() => { ws.close(); }, 1500);
  }
  if (t === 'error') {
    console.error(`${ts()} [driver] server error: ${preview}`);
  }
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
