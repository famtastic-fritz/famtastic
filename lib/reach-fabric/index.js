// index.js — Reach Fabric core.
//
// One channel-agnostic outbound service. Shay calls sendReach({ message, title,
// urgency, channels }); the fabric picks an order (explicit channels, else the
// urgency policy in config.js), tries each available adapter in turn, stops at
// the first success, and ALWAYS falls back to console so a message is never
// silently dropped. Every send appends one JSONL audit line to
// platform/invocations/<date>.jsonl, reusing the platform audit convention.
//
// Adapters declare availability from env/vault presence; missing creds mean the
// channel is skipped, never a crash.
'use strict';

const fs = require('fs');
const path = require('path');

const { channelOrderFor } = require('./config');

const consoleAdapter = require('./adapters/console');
const emailAdapter = require('./adapters/email');
const telegramAdapter = require('./adapters/telegram');
const smsAdapter = require('./adapters/sms');
const pushAdapter = require('./adapters/push');

const REPO_ROOT = path.resolve(__dirname, '..', '..');
const INVOCATIONS_DIR = path.join(REPO_ROOT, 'platform', 'invocations');

const ADAPTERS = {
  console: consoleAdapter,
  email: emailAdapter,
  telegram: telegramAdapter,
  sms: smsAdapter,
  push: pushAdapter,
};

function isoDay(d = new Date()) {
  return d.toISOString().slice(0, 10);
}

// Append one audit line to platform/invocations/<date>.jsonl, matching the
// shape the capability scripts write. Creates the dir if needed. Never throws
// out of the fabric — an audit failure must not lose the delivery result.
function appendAudit(record) {
  try {
    fs.mkdirSync(INVOCATIONS_DIR, { recursive: true });
    const line = JSON.stringify({
      ts: new Date().toISOString().replace(/\.\d+Z$/, 'Z'),
      capability: 'reach.send',
      args: {
        urgency: record.urgency,
        channels: record.requested_channels,
        title: record.title || null,
      },
      result: record.delivered_via ? 'delivered' : 'undeliverable',
      delivered_via: record.delivered_via,
      fellback: record.fellback,
      attempts: record.attempts,
    });
    fs.appendFileSync(path.join(INVOCATIONS_DIR, `${isoDay()}.jsonl`), line + '\n');
    return true;
  } catch {
    return false;
  }
}

// Collect the manual_required notes for any requested-but-unavailable channels,
// so callers/CLI can surface honest "do this to enable it" guidance.
function manualNotesFor(order) {
  const notes = [];
  for (const ch of order) {
    const adapter = ADAPTERS[ch];
    if (adapter && !adapter.isAvailable() && adapter.manualRequired) {
      notes.push({ channel: ch, note: adapter.manualRequired });
    }
  }
  return notes;
}

/**
 * sendReach — try channels in order until one delivers.
 *
 * @param {object} opts
 * @param {string} opts.message   required body text
 * @param {string} [opts.title]   optional title/subject
 * @param {string} [opts.urgency] low|normal|high|critical (default normal)
 * @param {string[]} [opts.channels] explicit ordered channel pin (overrides urgency)
 * @returns {Promise<{delivered_via, attempts, fellback, urgency, manual_required, audit_written}>}
 */
async function sendReach({ message, title, urgency = 'normal', channels } = {}) {
  if (!message || typeof message !== 'string') {
    throw new Error('sendReach requires a non-empty `message` string');
  }

  const order = channelOrderFor({ urgency, channels });
  const attempts = [];
  let deliveredVia = null;

  for (const ch of order) {
    const adapter = ADAPTERS[ch];
    if (!adapter) {
      attempts.push({ channel: ch, status: 'skipped', reason: 'unknown channel' });
      continue;
    }
    if (!adapter.isAvailable()) {
      attempts.push({ channel: ch, status: 'skipped', reason: 'unavailable (no creds)' });
      continue;
    }
    let result;
    try {
      result = await adapter.send({ message, title, urgency });
    } catch (err) {
      // Belt-and-suspenders: an adapter should never throw, but if it does the
      // fabric keeps walking the fallback chain rather than failing the call.
      result = { ok: false, reason: `adapter threw: ${err.message}` };
    }
    if (result && result.ok) {
      attempts.push({ channel: ch, status: 'delivered', reason: result.detail || 'ok' });
      deliveredVia = ch;
      break;
    }
    attempts.push({ channel: ch, status: 'failed', reason: result?.reason || 'unknown failure' });
  }

  // `fellback` = delivered, but not on the caller's first-choice channel.
  const fellback = Boolean(deliveredVia) && deliveredVia !== order[0];

  const out = {
    delivered_via: deliveredVia,
    attempts,
    fellback,
    urgency,
    requested_channels: order,
    title: title || null,
    manual_required: manualNotesFor(order),
  };
  out.audit_written = appendAudit(out);
  return out;
}

// Snapshot of which channels are live right now (used by the CLI/README/status).
function channelStatus() {
  return Object.fromEntries(
    Object.entries(ADAPTERS).map(([ch, a]) => [ch, a.isAvailable()])
  );
}

module.exports = { sendReach, channelStatus, ADAPTERS, INVOCATIONS_DIR };
