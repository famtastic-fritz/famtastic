// email.js — Resend HTTP API adapter.
//
// Reuses the repo's known-good Resend shape (POST https://api.resend.com/emails
// with Bearer auth) from site-studio/lib/studio-mailer.js. Lights up the moment
// RESEND_API_KEY is present in the environment; otherwise isAvailable()=false
// and the channel is skipped. Never throws on missing creds.
'use strict';

const { DEFAULTS } = require('../config');

const name = 'email';

function isAvailable() {
  return Boolean(process.env.RESEND_API_KEY);
}

async function send({ message, title, urgency }) {
  if (!isAvailable()) {
    return { ok: false, reason: 'RESEND_API_KEY not set' };
  }

  const from = process.env.REACH_EMAIL_FROM || DEFAULTS.email.from;
  const to = process.env.REACH_EMAIL_TO || DEFAULTS.email.to;
  const replyTo = process.env.REACH_EMAIL_REPLY_TO || DEFAULTS.email.replyTo;
  const subject = title || `Shay reach (${urgency || 'normal'})`;

  const payload = {
    from,
    to: Array.isArray(to) ? to : [to],
    subject,
    text: message,
  };
  if (replyTo) payload.reply_to = replyTo;

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    const body = await response.text();
    if (!response.ok) {
      return { ok: false, reason: `Resend HTTP ${response.status}: ${body.slice(0, 200)}` };
    }
    let id;
    try {
      id = JSON.parse(body).id;
    } catch {
      /* non-JSON success body */
    }
    return { ok: true, id, detail: `emailed ${Array.isArray(to) ? to.join(',') : to}` };
  } catch (err) {
    return { ok: false, reason: `email send error: ${err.message}` };
  }
}

module.exports = { name, isAvailable, send };
