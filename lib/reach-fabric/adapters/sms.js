// sms.js — Twilio Programmable SMS adapter.
//
// Real Twilio REST shape (POST Messages.json with Basic auth = SID:token).
// Lights up when TWILIO_ACCOUNT_SID + TWILIO_AUTH_TOKEN + TWILIO_FROM_NUMBER +
// REACH_SMS_TO are present; otherwise isAvailable()=false and the adapter
// surfaces a manual_required note. Never throws on missing creds.
'use strict';

const name = 'sms';

// Human-facing note the CLI surfaces when this channel is requested but not
// yet wired. Matches the platform capability "manual_required" convention.
const manualRequired =
  'Twilio not configured. Provision a Twilio number and set TWILIO_ACCOUNT_SID, ' +
  'TWILIO_AUTH_TOKEN, TWILIO_FROM_NUMBER, and REACH_SMS_TO to enable SMS reach.';

function isAvailable() {
  return Boolean(
    process.env.TWILIO_ACCOUNT_SID &&
      process.env.TWILIO_AUTH_TOKEN &&
      process.env.TWILIO_FROM_NUMBER &&
      process.env.REACH_SMS_TO
  );
}

async function send({ message, title }) {
  if (!isAvailable()) {
    return { ok: false, reason: 'twilio env not set', manual_required: manualRequired };
  }

  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const body = title ? `${title}: ${message}` : message;

  const form = new URLSearchParams({
    To: process.env.REACH_SMS_TO,
    From: process.env.TWILIO_FROM_NUMBER,
    Body: body,
  });
  const auth = Buffer.from(`${sid}:${token}`).toString('base64');

  try {
    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`,
      {
        method: 'POST',
        headers: {
          Authorization: `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: form.toString(),
      }
    );
    const text = await response.text();
    if (!response.ok) {
      return { ok: false, reason: `Twilio HTTP ${response.status}: ${text.slice(0, 200)}` };
    }
    let id;
    try {
      id = JSON.parse(text).sid;
    } catch {
      /* ignore */
    }
    return { ok: true, id, detail: `sms to ${process.env.REACH_SMS_TO}` };
  } catch (err) {
    return { ok: false, reason: `sms send error: ${err.message}` };
  }
}

module.exports = { name, isAvailable, send, manualRequired };
