---
title: 2026-06-05-claude-findings-for-brief
type: note
permalink: famtastic/inbox/2026-06-05-claude-findings-for-brief
---

# Claude's findings for Fritz's morning brief (2026-06-05)

> Source block for Shay to fold into the daily brief. Concise + action-first.

## 📱 Push-to-phone — code is fine, it's a runtime issue
Run one command to pinpoint it:
`curl -s -X POST http://localhost:8787/api/push -H 'content-type: application/json' -d '{"title":"test","body":"hi"}'`
- `no keys or no subscriptions` → phone never subscribed → app **You → Enable lock-screen alerts**.
- `pywebpush missing` → `~/famtastic/shay-phone/.venv/bin/pip install pywebpush py-vapid`.
- `sent:0, subs:1+` → **stale subscription after the VAPID regen** (most likely) → delete
  `~/.shay/webpush-subs.json`, toggle alerts off→on to re-subscribe.
- `sent:1` → server's fine; it's device-side (reinstall PWA / allow notifications).

## 🧠 Brain memory — frequent + session-id-tied (rule applied)
Writer now captures a substance note per checkpoint (committed: `BRAIN_NOTE`). Remaining (Shay runtime):
export your REAL session id as `BRAIN_SESSION_ID`, and call `checkpoint("progress", note="…")` every
~5 turns / before compaction / on surface switch — so nothing's lost when Fritz switches mid-session.

## 🔧 Other open loops
- Model safety-net: set Gemini default, add Copilot-Claude (non-default) + MiniMax + local Ollama floor;
  **fix the `/model` crash** (`resolve_runtime_provider()` got unexpected `user_providers`).
- Claude "extra usage" capped → running on Gemini fallback; check claude.ai/settings/usage for reset.
- Income: the hands-off plan is ready → `obsidian/08-Revenue/FRITZ-HANDS-OFF-INCOME-PLAY.md`
  (START: list 3–5 existing sites on Creative Market).