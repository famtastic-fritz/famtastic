// push.js — Web Push (VAPID) adapter.
//
// Pairs with the companion Shay app (which registers a Web Push subscription).
// Lights up when VAPID_PUBLIC_KEY + VAPID_PRIVATE_KEY + VAPID_SUBJECT and a
// REACH_PUSH_SUBSCRIPTION (the JSON PushSubscription from the app) are present;
// otherwise isAvailable()=false and surfaces a manual_required note.
//
// The actual encrypted-payload delivery uses the `web-push` library when it is
// installed. We require() it lazily so a missing dependency degrades to a
// reason string rather than crashing the fabric. Never throws on missing creds.
'use strict';

const name = 'push';

const manualRequired =
  'Web Push not configured. Pair the Shay companion app, generate a VAPID ' +
  'keypair, and set VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT, and ' +
  'REACH_PUSH_SUBSCRIPTION (the device PushSubscription JSON). The `web-push` ' +
  'npm package must also be installed for encrypted delivery.';

function isAvailable() {
  return Boolean(
    process.env.VAPID_PUBLIC_KEY &&
      process.env.VAPID_PRIVATE_KEY &&
      process.env.VAPID_SUBJECT &&
      process.env.REACH_PUSH_SUBSCRIPTION
  );
}

async function send({ message, title, urgency }) {
  if (!isAvailable()) {
    return { ok: false, reason: 'vapid env not set', manual_required: manualRequired };
  }

  let webpush;
  try {
    // Optional dependency — only needed when push is actually wired.
    webpush = require('web-push');
  } catch {
    return {
      ok: false,
      reason: 'web-push package not installed',
      manual_required: 'Run `npm install web-push` to enable Web Push delivery.',
    };
  }

  let subscription;
  try {
    subscription = JSON.parse(process.env.REACH_PUSH_SUBSCRIPTION);
  } catch {
    return { ok: false, reason: 'REACH_PUSH_SUBSCRIPTION is not valid JSON' };
  }

  try {
    webpush.setVapidDetails(
      process.env.VAPID_SUBJECT,
      process.env.VAPID_PUBLIC_KEY,
      process.env.VAPID_PRIVATE_KEY
    );
    const payload = JSON.stringify({
      title: title || 'Shay',
      body: message,
      urgency: urgency || 'normal',
    });
    const result = await webpush.sendNotification(subscription, payload);
    return { ok: true, id: undefined, detail: `web push ${result.statusCode || 'sent'}` };
  } catch (err) {
    return { ok: false, reason: `push send error: ${err.message}` };
  }
}

module.exports = { name, isAvailable, send, manualRequired };
