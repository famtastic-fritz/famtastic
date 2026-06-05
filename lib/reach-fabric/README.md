# Reach Fabric

One channel-agnostic outbound message service. Shay says **what** to send and
**how urgent** it is; the fabric decides **where** — trying channels in order,
falling back automatically, and never silently dropping a message.

This is the keystone from the Virtual Assistant Landscape research (§5): one
`reach.send` API behind per-channel adapters, generalizing Shay's working
Telegram delivery rather than scattering per-platform integrations.

## API

```js
const { sendReach } = require('./lib/reach-fabric');

const result = await sendReach({
  message: 'Backend deploy finished.',   // required
  title: 'Deploy',                        // optional title/subject
  urgency: 'high',                        // low | normal | high | critical (default normal)
  channels: ['telegram', 'email'],        // optional explicit order; overrides urgency policy
});
// -> { delivered_via, attempts:[{channel,status,reason}], fellback,
//      urgency, requested_channels, title, manual_required, audit_written }
```

`console` is always appended last, so `delivered_via` is effectively never
`null`. `fellback` is `true` when delivery happened on a channel other than the
caller's first choice.

## CLI

```
platform reach send "<message>" [--title=...] [--urgency=...] [--channels=a,b] [--json]
```

The shim `platform/capabilities/reach/send.sh` hydrates any vaulted secrets into
the environment, then runs `cli.js`. It prints the attempts table plus any
`manual_required` notes for unavailable channels. Every send appends one JSONL
line (`capability: "reach.send"`) to `platform/invocations/<date>.jsonl`.

## Channels — what's live today

| Channel  | Status            | Lights up when…                                                            |
|----------|-------------------|----------------------------------------------------------------------------|
| console  | **LIVE always**   | nothing — the guaranteed terminal fallback, proves the fabric with no creds |
| email    | **LIVE on key**   | `RESEND_API_KEY` present (Resend, sender `studio@send.mbsh96reunion.com`)   |
| telegram | **LIVE on keys**  | `TELEGRAM_BOT_TOKEN` + `TELEGRAM_CHAT_ID` present                           |
| sms      | manual_required   | Twilio number provisioned + `TWILIO_*` + `REACH_SMS_TO` vaulted            |
| push     | manual_required   | Shay app paired, VAPID keypair + subscription vaulted, `web-push` installed |

Adapters that lack credentials report `isAvailable() = false` and are skipped —
they never throw. `sms` and `push` additionally surface a `manual_required`
note describing exactly what to provision.

## Env / vault contract

Secrets are read from the environment at runtime (the CLI exports them from the
vault). Nothing is baked in.

| Channel  | Env vars                                                                              | Vault ids (via send.sh)                                                                 |
|----------|---------------------------------------------------------------------------------------|-----------------------------------------------------------------------------------------|
| email    | `RESEND_API_KEY`, `REACH_EMAIL_TO`, `REACH_EMAIL_FROM`, `REACH_EMAIL_REPLY_TO`        | `reach/resend.api_key` (falls back to `studio.resend.api_key`), `reach/email.to/.from`  |
| telegram | `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`                                               | `reach/telegram.bot_token`, `reach/telegram.chat_id`                                     |
| sms      | `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM_NUMBER`, `REACH_SMS_TO`        | `reach/twilio.account_sid/.auth_token/.from_number`, `reach/twilio.to`                   |
| push     | `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`, `REACH_PUSH_SUBSCRIPTION`    | `reach/vapid.public_key/.private_key/.subject`, `reach/push.subscription`                |

Email defaults (sender, recipient, reply-to) live in `config.js` and match the
repo's known Resend configuration, so email reach works the moment a key exists.

## Urgency → channel order

| Urgency  | Order (console always appended last)          |
|----------|-----------------------------------------------|
| low      | email → telegram → console                    |
| normal   | telegram → push → email → console             |
| high     | push → telegram → sms → console               |
| critical | push → telegram → sms → email → console       |

Defined in `config.js` (`URGENCY_ORDER`). An explicit `channels` array overrides
this entirely.

## Files

- `index.js` — core `sendReach()`, fallback walk, JSONL audit, `channelStatus()`
- `config.js` — urgency policy + env/vault contract (single source of truth)
- `adapters/` — `console.js`, `email.js`, `telegram.js`, `sms.js`, `push.js`
- `cli.js` — node entry the shell shim calls
- `selftest.js` — proves console fallback + audit line with zero creds

## Self-test

```
node lib/reach-fabric/selftest.js
```

Strips all channel secrets, asserts delivery falls back to `console`, and
asserts an audit line was written.
