# Shay Gateway Resume Repair

Date: 2026-06-16

## What broke

Current Shay session shells stopped responding because the gateway daemon was not staying up long enough to own and resume those sessions.

Two verified runtime issues were involved:

1. The live gateway process was stale relative to the rebuilt `shay-shay/.venv`, which caused earlier OpenAI client initialization failures.
2. Shay startup was repeatedly tripping the identity guard because `~/.shay/memories/USER.md` no longer contained the required authority snippets expected by `identity_guard.py`.

## What fixed it

The working recovery path was:

1. Restart Shay onto the current `shay-shay/.venv`.
2. Restore the supported desktop dependency profile in the venv so Telegram and gateway adapters could load again.
3. Repair `~/.shay/memories/USER.md` so it again included the identity-guard-required wording:
   - `nothing supersedes Fritz or his direct directives`
   - `dynamic ultra-brief responses`
4. Reload the launchd gateway service after the identity file was repaired.

## Verified end state

After the repair:

- `shay` direct prompt execution worked again.
- `shay gateway status` reported the service as loaded and running.
- `shay status` reported:
  - Python `3.12.13`
  - provider `OpenAI Codex`
  - Telegram configured
  - gateway service running under launchd
  - 1 active session
- `gateway.log` showed Telegram connected, API server connected, and `Gateway running with 2 platform(s)`.

## Operational note

If shells stop responding again after a merge or env rebuild, check these first:

1. Whether the running gateway PID predates the current `.venv`.
2. Whether `~/.shay/memories/USER.md` still satisfies `identity_guard.py` required snippets.
3. Whether the gateway service is actually loaded and staying up after restart.
