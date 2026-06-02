---
name: register-credential
description: Register a service credential into the FAMtastic vault and verify the dependent capability/channel goes live
user-invocable: true
---

Register ANY service credential into the macOS-Keychain-backed vault, then verify
the capability or reach channel it unlocks. The secret value is NEVER echoed,
logged, or passed as a CLI argument.

1. Parse arguments from $ARGUMENTS — expects `<service> [vault-key-override]`
   (e.g., "resend", "telegram", or "myservice studio.myservice.api_key").
2. If no service given, ask the user which service to register. Map the friendly
   service name to its canonical vault key using the allowlist in
   `platform/capabilities/vault/register-credential.sh` (resend → studio.resend.api_key,
   godaddy → studio.godaddy.api_key, netlify → netlify.auth_token,
   telegram → reach/telegram.bot_token, twilio-sid/token/from/to,
   jira → jira.api_token, github → github.token, cpanel → cpanel.api_token, etc.).
3. NEVER ask the user to paste the secret into chat, and never put it on the
   command line. Instruct them to supply it via env var or stdin:
   - `CRED_VALUE='<paste>' ./platform/capabilities/vault/register-credential.sh <service>`
   - `printf '%s' '<paste>' | ./platform/capabilities/vault/register-credential.sh <service>`
   - or run it interactively so it prompts and reads silently from the TTY.
4. Run: `cd ~/famtastic && ./platform/capabilities/vault/register-credential.sh "$SERVICE"`
   (add `--key <vault-key>` for services not in the allowlist). The script writes
   via `vault.sh write`, appends a value-free audit line to
   `platform/invocations/<date>.jsonl`, and prints next-step verification.
5. Run the verification step the script prints for that capability and report
   the outcome as **live** or **manual_required** — never claim live without proof.

## Worked example — Resend (Reach Fabric EMAIL channel)

`resend` maps to `studio.resend.api_key`, which `platform/capabilities/reach/send.sh`
hydrates into `RESEND_API_KEY` (with `reach/resend.api_key` as an override). Once
vaulted, `lib/reach-fabric/adapters/email.js` reports `isAvailable()=true` and the
EMAIL channel goes live.

```
# 1. Register (secret via stdin — never on argv, never echoed)
printf '%s' '<PASTE_RESEND_KEY>' | ./platform/capabilities/vault/register-credential.sh resend

# 2. Verify the fabric + audit trail (works with zero creds, console fallback)
node lib/reach-fabric/selftest.js

# 3. Send a real high-urgency ping (email lights up from the vaulted key)
RESEND_API_KEY="$(./platform/vault/vault.sh read studio.resend.api_key)" \
  REACH_EMAIL_TO="you@example.com" \
  ./platform/capabilities/reach/send.sh "Reach Fabric live — test from Shay" --urgency=high
```

Report: EMAIL is **live** if `delivered_via=email` and a real inbox ping arrives.
Telegram/SMS/Push stay **manual_required** until their keys are vaulted/provisioned.

## Hard rules

- NEVER echo, print, or log the secret value. The helper script enforces this;
  do not work around it.
- NEVER pass the secret as a positional CLI argument (shell history + `ps` leak).
- Vaulting and verification must run on Fritz's Mac — the vault is Keychain-backed
  and provider APIs are firewalled from the cloud sandbox.
