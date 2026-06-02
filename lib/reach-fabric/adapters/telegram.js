// telegram.js — Telegram Bot API adapter.
//
// Generalizes Shay's working Telegram delivery into a fabric adapter. Lights
// up when TELEGRAM_BOT_TOKEN + TELEGRAM_CHAT_ID are present; otherwise
// isAvailable()=false. Never throws on missing creds.
'use strict';

const name = 'telegram';

function isAvailable() {
  return Boolean(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID);
}

async function send({ message, title, urgency }) {
  if (!isAvailable()) {
    return { ok: false, reason: 'TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID not set' };
  }

  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  const head = title ? `*${title}*\n` : '';
  const tail = urgency && urgency !== 'normal' ? `\n_(${urgency})_` : '';
  const text = `${head}${message}${tail}`;

  try {
    const response = await fetch(
      `https://api.telegram.org/bot${token}/sendMessage`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'Markdown' }),
      }
    );
    const body = await response.text();
    if (!response.ok) {
      return { ok: false, reason: `Telegram HTTP ${response.status}: ${body.slice(0, 200)}` };
    }
    let id;
    try {
      id = JSON.parse(body).result?.message_id;
    } catch {
      /* ignore */
    }
    return { ok: true, id, detail: `telegram chat ${chatId}` };
  } catch (err) {
    return { ok: false, reason: `telegram send error: ${err.message}` };
  }
}

module.exports = { name, isAvailable, send };
