# 🚨 Security — Credential Exposure (2026-06-02)

**Found by:** second-in-command recon while locating the Resend key.
**Severity:** High. **No secret values are recorded in this file** — by design.

## What happened

A single Google Doc in Fritz's Drive — **"FAMtastic API's"** (last modified
2026-06-01) — contains a large set of **live production secrets in plaintext**.
Anyone who gains access to that Doc (a bad share link, a compromised Google
session, a synced device) gets the keys to the whole stack. Credentials also
appear in a second Drive doc and in `spec.json`/`capabilities.json` copies on
Drive.

This file does **not** reproduce any of the values. The repo was checked: none
of these secrets are committed in git (good — keep it that way).

## Exposed credential classes (rotate the high-risk ones today)

| Service | Risk if leaked | Rotate priority |
|---|---|---|
| Resend API key | Send mail as your domain | High |
| Anthropic / Claude API key | Billable LLM spend | High |
| OpenAI API key | Billable LLM spend | High |
| OpenRouter key | Billable spend | High |
| GitHub PAT (`ghp_…`) | Push to / read your repos | **Critical** |
| Netlify token | Deploy / take down sites | High |
| GoDaddy API key + secret, cPanel API | DNS / hosting / domains | **Critical** |
| MySQL DB password (reunion DB) | Read/alter production data | High |
| Gemini / Google AI keys (several) | Billable spend | Medium |
| Pinecone, Perplexity, fal.ai, ElevenLabs | Billable spend | Medium |
| Composio, 21st.dev magic key | Varies | Medium |
| Unsplash account password (`Football13`) | Account takeover; reused? | High |

## Rotation checklist

- [ ] **GitHub PAT** — revoke at github.com/settings/tokens, issue a fresh
      fine-grained token scoped to only the repos you need.
- [ ] **GoDaddy + cPanel** — regenerate API credentials; they control DNS and
      hosting for live sites.
- [ ] **Resend** — rotate the key, then re-register it in the vault
      (see `docs/runbooks/RESEND-REACH-GO-LIVE.md`).
- [ ] **Anthropic / OpenAI / OpenRouter / Gemini** — rotate; check usage
      dashboards for unexpected spend.
- [ ] **Netlify, DB password, ElevenLabs, Pinecone, Perplexity, fal.ai** — rotate.
- [ ] **Unsplash password** — change it, and change it anywhere `Football13`
      was reused.

## The fix going forward

Stop storing secrets in a Google Doc. The repo already has a Keychain-backed
vault (`platform/vault/vault.sh`). The new **`register-credential` skill**
(`.claude/skills/register-credential/`) is the one place to register a secret:
it writes to the vault, never echoes the value, and verifies the dependent
capability. After rotating, register each key through it and delete the
plaintext Doc.
