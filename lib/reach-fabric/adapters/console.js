// console.js — the guaranteed terminal fallback adapter.
//
// Always available, needs zero credentials. Its job is to prove the fabric
// works end-to-end with nothing configured, and to ensure the fabric can
// NEVER silently drop a message: if every other channel is unavailable or
// fails, the message still lands here.
'use strict';

const name = 'console';

function isAvailable() {
  return true;
}

async function send({ message, title, urgency }) {
  const stamp = new Date().toISOString();
  const head = title ? `${title} ` : '';
  // Single structured line on stdout so it is greppable and audit-friendly.
  process.stdout.write(
    `[reach:console ${stamp}] (${urgency || 'normal'}) ${head}${message}\n`
  );
  return { ok: true, id: `console-${Date.now()}`, detail: 'printed to stdout' };
}

module.exports = { name, isAvailable, send };
