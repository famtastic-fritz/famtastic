'use strict';
/**
 * Income ledger collector.
 *
 * Source of truth: data/revenue.jsonl — one JSON object per line, append-only.
 * Events arrive from real payment webhooks (Stripe / PayPal) or manual entry
 * (cash / CashApp / wire). Nothing here is a projection: every dollar shown
 * landed as a real event written to the ledger.
 *
 * Event shape:
 *   {
 *     id:            unique string (provider event id, dedupes replays),
 *     ts:            unix seconds,
 *     source:        "stripe" | "paypal" | "manual",
 *     amount_cents:  integer (net or gross as reported by provider),
 *     currency:      "usd",
 *     customer:      string | null,
 *     description:   string | null,
 *     verified:      bool   (signature verified at ingest time)
 *   }
 */
const fs = require('fs');
const path = require('path');

const REPO_ROOT = path.resolve(__dirname, '..', '..');
const LEDGER = path.join(__dirname, '..', 'data', 'revenue.jsonl');

function ensureLedger() {
  fs.mkdirSync(path.dirname(LEDGER), { recursive: true });
  if (!fs.existsSync(LEDGER)) fs.writeFileSync(LEDGER, '');
}

function readEvents() {
  ensureLedger();
  const seen = new Set();
  const events = [];
  for (const line of fs.readFileSync(LEDGER, 'utf8').split('\n')) {
    const t = line.trim();
    if (!t) continue;
    try {
      const e = JSON.parse(t);
      if (e.id && seen.has(e.id)) continue; // dedupe webhook replays
      if (e.id) seen.add(e.id);
      events.push(e);
    } catch {
      /* skip malformed line */
    }
  }
  return events;
}

function append(event) {
  ensureLedger();
  // dedupe against existing ids
  if (event.id) {
    const existing = readEvents().some((e) => e.id === event.id);
    if (existing) return { ok: true, duplicate: true };
  }
  fs.appendFileSync(LEDGER, JSON.stringify(event) + '\n');
  return { ok: true, duplicate: false };
}

function startOfDay(now) {
  const d = new Date(now * 1000);
  d.setHours(0, 0, 0, 0);
  return d.getTime() / 1000;
}

function collect(nowSec) {
  const now = nowSec || Date.now() / 1000;
  const events = readEvents();
  const dayStart = startOfDay(now);
  const weekStart = now - 7 * 86400;
  const monthStart = now - 30 * 86400;

  const sum = (pred) =>
    events.filter(pred).reduce((s, e) => s + (Number(e.amount_cents) || 0), 0);

  const bySource = {};
  for (const e of events) {
    const k = e.source || 'unknown';
    bySource[k] = (bySource[k] || 0) + (Number(e.amount_cents) || 0);
  }

  const recent = [...events]
    .sort((a, b) => (b.ts || 0) - (a.ts || 0))
    .slice(0, 25)
    .map((e) => ({
      ts: e.ts,
      source: e.source,
      amount: (Number(e.amount_cents) || 0) / 100,
      currency: e.currency || 'usd',
      customer: e.customer || null,
      description: e.description || null,
      verified: e.verified !== false
    }));

  return {
    today: sum((e) => (e.ts || 0) >= dayStart) / 100,
    week: sum((e) => (e.ts || 0) >= weekStart) / 100,
    month: sum((e) => (e.ts || 0) >= monthStart) / 100,
    allTime: sum(() => true) / 100,
    bySource: Object.fromEntries(Object.entries(bySource).map(([k, v]) => [k, v / 100])),
    count: events.length,
    recent,
    unverifiedCount: events.filter((e) => e.verified === false).length
  };
}

module.exports = { collect, append, readEvents, LEDGER };
