// config.js — Reach Fabric channel policy + env/vault contract in one place.
//
// The fabric is channel-agnostic: Shay says WHAT and HOW URGENT; the fabric
// decides WHERE. This file owns that "where" decision (urgency -> channel
// order) and documents every env var an adapter may read at runtime.
//
// Secrets are NEVER baked in. Adapters read them from the environment (which
// is how the platform vault exports them at invocation time) and degrade to
// isAvailable()=false when absent. Nothing here ever throws.
'use strict';

// Per-urgency channel preference order. The fabric walks each list in order,
// skips any channel whose adapter reports isAvailable()=false, and stops at
// the first successful send. `console` is always last so the fabric can never
// silently drop a message — it is the guaranteed terminal fallback.
//
// Rationale (from VIRTUAL-ASSISTANT-LANDSCAPE.md §3/§5):
//   - low      : async, cheap, no interruption -> email first, telegram, console.
//   - normal   : the default control surface -> telegram (reference adapter),
//                then push, then email, then console.
//   - high     : get attention fast -> push, telegram, sms, then console.
//   - critical : reach him even with no internet on one channel -> escalate
//                push -> telegram -> sms -> email -> console.
const URGENCY_ORDER = {
  low: ['email', 'telegram', 'console'],
  normal: ['telegram', 'push', 'email', 'console'],
  high: ['push', 'telegram', 'sms', 'console'],
  critical: ['push', 'telegram', 'sms', 'email', 'console'],
};

const DEFAULT_URGENCY = 'normal';

// The full env/vault contract. Documented here so there is exactly one source
// of truth. The CLI/vault layer is responsible for exporting these into the
// process environment before invoking the fabric.
const ENV_CONTRACT = {
  console: [], // always available, zero credentials
  email: ['RESEND_API_KEY', 'REACH_EMAIL_TO', 'REACH_EMAIL_FROM'],
  telegram: ['TELEGRAM_BOT_TOKEN', 'TELEGRAM_CHAT_ID'],
  sms: ['TWILIO_ACCOUNT_SID', 'TWILIO_AUTH_TOKEN', 'TWILIO_FROM_NUMBER', 'REACH_SMS_TO'],
  push: ['VAPID_PUBLIC_KEY', 'VAPID_PRIVATE_KEY', 'VAPID_SUBJECT', 'REACH_PUSH_SUBSCRIPTION'],
};

// Sensible defaults that match the repo's known notification facts so the
// fabric "just works" the moment a key appears, without extra config.
const DEFAULTS = {
  email: {
    from: 'Shay <studio@send.mbsh96reunion.com>',
    to: 'fritz.medine@gmail.com',
    replyTo: 'fritz.medine@gmail.com',
  },
};

function normalizeUrgency(urgency) {
  const key = String(urgency || DEFAULT_URGENCY).toLowerCase();
  return URGENCY_ORDER[key] ? key : DEFAULT_URGENCY;
}

// Resolve the ordered channel list for a request. If the caller pins explicit
// channels, honor that order; otherwise use the urgency policy. `console` is
// always appended as the terminal guarantee if not already present.
function channelOrderFor({ urgency, channels } = {}) {
  let order;
  if (Array.isArray(channels) && channels.length) {
    order = channels.map((c) => String(c).toLowerCase());
  } else {
    order = URGENCY_ORDER[normalizeUrgency(urgency)].slice();
  }
  if (!order.includes('console')) order.push('console');
  return order;
}

module.exports = {
  URGENCY_ORDER,
  DEFAULT_URGENCY,
  ENV_CONTRACT,
  DEFAULTS,
  normalizeUrgency,
  channelOrderFor,
};
