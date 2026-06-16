'use strict';

/*
 * agents/lib/notify.js — agent alert channel.
 *
 * Sends to Telegram when TELEGRAM_BOT_TOKEN + TELEGRAM_CHAT_ID are set; always
 * also prints to stdout so runs are legible in cron logs. Severity tiers:
 *   info  → stdout only
 *   warn  → stdout + Telegram
 *   critical → stdout + Telegram (prefixed)
 */

async function notify(severity, text) {
  const line = `[${severity.toUpperCase()}] ${text}`;
  // eslint-disable-next-line no-console
  console.log(line);

  if (severity === 'info') return;

  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId || typeof fetch !== 'function') return;

  const prefix = severity === 'critical' ? '🚨 ' : '⚠️ ';
  try {
    const body = { chat_id: chatId, text: prefix + text };
    if (process.env.TELEGRAM_THREAD_ID) body.message_thread_id = Number(process.env.TELEGRAM_THREAD_ID);
    const r = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
    });
    if (!r.ok) console.log(`notify: telegram non-2xx ${r.status}`);
  } catch (err) {
    console.log('notify: telegram failed ' + (err && err.message));
  }
}

module.exports = { notify };
