// Email sender — reuses FAMtastic's existing Resend setup (vault key
// `studio.resend.api_key`, verified sender domain send.mbsh96reunion.com).
//
// Default posture is SAFE: sends to the operator (you) for one-click review +
// forward, not blasting clients directly — unless you opt into to_client mode
// and a client contact address is known. Without a Resend key it never sends;
// the caller stages an email.txt draft instead.

import { readSecret } from "./vault.mjs";

const RESEND_ENDPOINT = "https://api.resend.com/emails";

export function hasEmailCreds() {
  return !!readSecret("resend");
}

// Resolve the From address. Prefers explicit config/env; falls back to the
// only currently-verified FAMtastic Resend sender so live send works day one.
export function defaultSender(config = {}) {
  return (
    config.client_from_email ||
    process.env.CLIENT_FROM_EMAIL ||
    "FAMtastic <studio@send.mbsh96reunion.com>"
  );
}

export function buildPayload({ from, to, subject, body, reply_to }) {
  const payload = { from, to: Array.isArray(to) ? to : [to], subject, text: body };
  if (reply_to) payload.reply_to = reply_to;
  return payload;
}

// Send via Resend. Returns { sent, id?, reason?/error? } — never throws, so a
// send failure can't crash an unattended run.
export async function sendEmail({ from, to, subject, body, reply_to }) {
  const key = readSecret("resend");
  if (!key) return { sent: false, reason: "no resend key (vault studio.resend.api_key / RESEND_API_KEY)" };
  if (!to) return { sent: false, reason: "no recipient" };
  try {
    const res = await fetch(RESEND_ENDPOINT, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify(buildPayload({ from, to, subject, body, reply_to })),
    });
    if (!res.ok) {
      return { sent: false, error: `Resend HTTP ${res.status}` };
    }
    const data = await res.json().catch(() => ({}));
    return { sent: true, id: data.id || null };
  } catch (err) {
    return { sent: false, error: err.message };
  }
}
