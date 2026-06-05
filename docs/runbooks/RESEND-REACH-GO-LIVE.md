# Runbook: Bring the Reach Fabric EMAIL channel live via Resend

**Audience:** Fritz, running on his Mac (open network, Keychain available).
**Goal:** Register the Resend API key into the vault, then get a *real* email
(and optionally Telegram) ping from the Reach Fabric.
**Time:** ~3 minutes.

---

## Why this CANNOT be done from the cloud sandbox

This runbook is Mac-only by design. The cloud agent sandbox cannot complete it:

1. **The vault is macOS Keychain-backed.** `platform/vault/vault.sh` writes via
   `security add-generic-password` (service `famtastic-platform`). That command
   only exists on macOS and only reaches *your* login Keychain. In the sandbox
   it silently falls back to a throwaway file vault that your Mac never sees.
2. **Provider APIs are firewalled from the sandbox.** The email adapter POSTs to
   `https://api.resend.com/emails` and Telegram to `api.telegram.org`. The
   sandbox has no outbound network to these hosts, so no real ping can leave it.
3. **Secrets must never transit the agent.** You paste the key from your own
   *FAMtastic API's* doc directly into your Mac terminal. It never appears in
   chat, in this repo, in git history, or in any agent transcript.

So: the agent built and verified the *plumbing* (script syntax, fabric selftest,
audit trail). **You** perform the live registration + send on your Mac.

---

## Prerequisites

- You are on your Mac, in the repo: `cd ~/famtastic`
- You have your Resend API key open in your *FAMtastic API's* doc (starts with `re_...`).
- (Optional, for Telegram too) your Telegram bot token and chat id.

---

## Step 1 — Register the Resend key into the vault

Paste the key from your doc in place of `<PASTE_RESEND_KEY>`. The secret goes in
via **stdin**, not as a command argument, so it never lands in shell history or
the process table. Nothing echoes the value back.

```bash
cd ~/famtastic
printf '%s' '<PASTE_RESEND_KEY>' | ./platform/capabilities/vault/register-credential.sh resend
```

Expected output (no secret shown):

```
register-credential: service 'resend' -> vault key 'studio.resend.api_key'
register-credential: stored studio.resend.api_key (value not shown)
Next step — verify the dependent capability/channel:
  Channel:  Reach Fabric EMAIL (via Resend) — goes LIVE once the key is vaulted.
  ...
```

Confirm it landed (this lists the key name only, never the value):

```bash
./platform/vault/vault.sh list
```

> Alternative (interactive): run the script with no pipe and it will prompt
> `Paste secret for studio.resend.api_key (input hidden):` and read it silently.

### (Optional) Telegram, for a second live channel

```bash
printf '%s' '<PASTE_TELEGRAM_BOT_TOKEN>' | ./platform/capabilities/vault/register-credential.sh telegram
printf '%s' '<PASTE_TELEGRAM_CHAT_ID>'   | ./platform/capabilities/vault/register-credential.sh telegram-chat
```

---

## Step 2 — Prove the fabric + audit trail (no creds needed)

This runs the fabric with all channel secrets stripped, asserts the console
fallback works, and asserts an audit line was appended. It should print
`ALL SELFTEST ASSERTIONS PASSED`.

```bash
node lib/reach-fabric/selftest.js
```

---

## Step 3 — Set the env and send a REAL high-urgency ping

`platform reach send` hydrates the vaulted key into `RESEND_API_KEY` for you, but
you must tell it where to deliver. Set the recipient (and Telegram, if you
vaulted it) then send:

```bash
# Email recipient (Reach Fabric defaults to fritz.medine@gmail.com if unset)
export REACH_EMAIL_TO="fritz.medine@gmail.com"

# (Optional) if you vaulted Telegram, send.sh will pick those up from the vault
# automatically — no export needed.

./platform/capabilities/reach/send.sh "Reach Fabric live — test from Shay" --urgency=high
```

What `--urgency=high` does: the fabric tries `push → telegram → sms → console`
and stops at the first available channel. With only Resend vaulted, push/sms are
skipped; if you also vaulted Telegram it delivers there. To force email
specifically:

```bash
./platform/capabilities/reach/send.sh "Reach Fabric live — email proof" --channels=email
```

Expected: a block ending in `delivered_via: email` (or `telegram`) and
`fellback: false`, plus a real message in your inbox / Telegram.

---

## Verification checklist

- [ ] `./platform/vault/vault.sh list` shows `studio.resend.api_key` (value never printed).
- [ ] `node lib/reach-fabric/selftest.js` prints `ALL SELFTEST ASSERTIONS PASSED`.
- [ ] `register-credential` printed `stored studio.resend.api_key (value not shown)` — and never the key itself.
- [ ] A value-free audit line with `"capability":"vault.register-credential"` exists in
      `platform/invocations/$(date +%Y-%m-%d).jsonl`.
- [ ] `platform reach send ... --channels=email` returns `delivered_via: email`, `fellback: false`.
- [ ] A real email titled **"Reach Fabric live — test from Shay"** arrived at `REACH_EMAIL_TO`.
- [ ] (If Telegram vaulted) `--urgency=high` with no `--channels` delivered via Telegram and a message arrived.
- [ ] No `re_...` secret string appears anywhere in the repo (`git grep -n 're_'` returns nothing meaningful).

---

## Troubleshooting

- **`delivered_via: console`, `fellback: true`** — the key wasn't hydrated. Re-run
  Step 1, confirm with `vault list`, then `./platform/vault/vault.sh read studio.resend.api_key | head -c 4`
  should print `re_` (only the first 4 chars — do not paste the whole value anywhere).
- **`Resend HTTP 403`** — the sending domain isn't verified. Run
  `platform email verify-resend-domain <site>` and add the DKIM/SPF records to GoDaddy DNS.
- **`Resend HTTP 422` on `from`** — `REACH_EMAIL_FROM` uses an unverified domain.
  Use a verified sender or set `REACH_EMAIL_FROM` to one Resend has verified.
