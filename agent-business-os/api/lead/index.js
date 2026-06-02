'use strict';

/*
 * Agent Business OS — lead capture function (Azure Static Web Apps / Functions).
 *
 * Anonymous HTTP POST at /api/lead. Accepts the qualification-form payload,
 * scores fit, persists to Azure Table Storage (when configured), and forwards
 * to a webhook and/or Telegram. Every integration is optional and fails soft:
 * a missing connection string or token logs a warning and never blocks the
 * 200 response, so the form keeps working before the backend is fully wired.
 *
 * Environment variables (all optional):
 *   LEADS_TABLE_CONNECTION_STRING   Azure Storage connection string (enables persistence)
 *   LEADS_TABLE_NAME                 table name (default "inboundleads")
 *   LEAD_WEBHOOK_URL                 POST a JSON copy of each lead here
 *   LEAD_WEBHOOK_TOKEN               optional bearer token for the webhook
 *   TELEGRAM_BOT_TOKEN               Telegram bot token for alerts
 *   TELEGRAM_CHAT_ID                 Telegram chat id for alerts
 *   TELEGRAM_THREAD_ID               optional Telegram topic/thread id
 */

const VALID_BOTTLENECKS = ['lead_volume', 'lead_quality', 'follow_up', 'close_rate', 'fulfillment'];

module.exports = async function (context, req) {
  const respond = (status, body) => {
    context.res = {
      status,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
      body
    };
  };

  if (!req || (req.method && req.method.toUpperCase() !== 'POST')) {
    return respond(405, { ok: false, error: 'method_not_allowed' });
  }

  let payload = req.body;
  if (typeof payload === 'string') {
    try { payload = JSON.parse(payload); } catch (_) { payload = {}; }
  }
  payload = payload || {};

  // ---- Validation ----
  const name = String(payload.name || '').trim();
  const email = String(payload.email || '').trim();
  const bottleneck = String(payload.bottleneck || payload.stack || '').trim();

  const errors = [];
  if (!name) errors.push('name');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.push('email');
  if (!bottleneck) errors.push('bottleneck');
  // Honeypot: bots fill hidden fields. If present and non-empty, accept silently.
  const trapped = !!String(payload.company_website || '').trim();
  if (errors.length) return respond(400, { ok: false, error: 'invalid', fields: errors });

  const num = (v) => { const n = parseFloat(v); return isNaN(n) ? 0 : n; };
  const revenue = num(payload.revenue);
  const desiredLift = num(payload.lift);
  const start7 = String(payload.start7 || '').toLowerCase() === 'yes';

  // ---- Fit scoring → priority + response SLA ----
  let fitScore = 40;
  if (start7) fitScore += 20;
  if (revenue >= 50000) fitScore += 20; else if (revenue >= 20000) fitScore += 12; else if (revenue >= 10000) fitScore += 6;
  if (desiredLift >= 30000) fitScore += 15; else if (desiredLift >= 10000) fitScore += 8;
  if (bottleneck && VALID_BOTTLENECKS.includes(bottleneck)) fitScore += 5;
  fitScore = Math.max(0, Math.min(100, fitScore));

  let priority = 'nurture', responseSlaMinutes = 240;
  if (fitScore >= 75) { priority = 'hot'; responseSlaMinutes = 15; }
  else if (fitScore >= 55) { priority = 'warm'; responseSlaMinutes = 60; }

  const now = new Date();
  const isoDate = now.toISOString().slice(0, 10);
  const rowKey = `${now.toISOString()}-${Math.random().toString(36).slice(2, 8)}`;

  const lead = {
    name,
    email,
    revenue,
    bottleneck,
    desiredLift,
    start7: start7 ? 'yes' : 'no',
    utm: payload.utm && typeof payload.utm === 'object' ? payload.utm : {},
    formType: 'qualification',
    fitScore,
    priority,
    responseSlaMinutes,
    stage: 'inbound',
    status: 'new',
    submittedAt: payload.submitted_at || now.toISOString(),
    receivedAt: now.toISOString()
  };

  if (trapped) {
    // Quietly drop spam — return success so the bot moves on.
    context.log.warn('lead honeypot triggered; dropping silently');
    return respond(200, { ok: true });
  }

  // ---- Persist + notify (all best-effort) ----
  await persist(context, lead, isoDate, rowKey);
  await forwardWebhook(context, lead);
  await notifyTelegram(context, lead);

  return respond(200, { ok: true, priority, fitScore });
};

async function persist(context, lead, isoDate, rowKey) {
  const conn = process.env.LEADS_TABLE_CONNECTION_STRING;
  if (!conn) { context.log.warn('LEADS_TABLE_CONNECTION_STRING unset — skipping table persist'); return; }
  try {
    // Lazy require so the function runs without the package when persistence is off.
    const { TableClient } = require('@azure/data-tables');
    const tableName = process.env.LEADS_TABLE_NAME || 'inboundleads';
    const client = TableClient.fromConnectionString(conn, tableName);
    await client.createTable().catch(() => {});
    await client.createEntity({
      partitionKey: isoDate,
      rowKey,
      ...lead,
      utm: JSON.stringify(lead.utm)
    });
  } catch (err) {
    context.log.error('table persist failed', err && err.message);
  }
}

async function forwardWebhook(context, lead) {
  const url = process.env.LEAD_WEBHOOK_URL;
  if (!url) return;
  try {
    const headers = { 'Content-Type': 'application/json' };
    if (process.env.LEAD_WEBHOOK_TOKEN) headers.Authorization = `Bearer ${process.env.LEAD_WEBHOOK_TOKEN}`;
    const r = await fetch(url, { method: 'POST', headers, body: JSON.stringify(lead) });
    if (!r.ok) context.log.warn('webhook non-2xx', r.status);
  } catch (err) {
    context.log.warn('webhook forward failed', err && err.message);
  }
}

async function notifyTelegram(context, lead) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return;
  const emoji = lead.priority === 'hot' ? '🔥' : lead.priority === 'warm' ? '⚡' : '🌱';
  const text = [
    `${emoji} New lead · ${lead.priority.toUpperCase()} (fit ${lead.fitScore}, SLA ${lead.responseSlaMinutes}m)`,
    `Name: ${lead.name}`,
    `Email: ${lead.email}`,
    `Revenue: $${lead.revenue} · Desired lift: $${lead.desiredLift}`,
    `Bottleneck: ${lead.bottleneck} · Start in 7d: ${lead.start7}`
  ].join('\n');
  try {
    const body = { chat_id: chatId, text };
    if (process.env.TELEGRAM_THREAD_ID) body.message_thread_id = Number(process.env.TELEGRAM_THREAD_ID);
    const r = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    if (!r.ok) context.log.warn('telegram non-2xx', r.status);
  } catch (err) {
    context.log.warn('telegram notify failed', err && err.message);
  }
}
