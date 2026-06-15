---
title: Shay Phone PWA — service, auth, cutover
type: note
permalink: shay-memory/operational/shay-phone-pwa
tags: [shay-phone, pwa, launchd, tailscale, kanban, cutover, operational]
---

# Shay Phone PWA

Promoted from hot memory 2026-06-06. Recall when working on the phone surface,
its auth, or the jobs.json→kanban cutover.

- **Service:** launchd `com.famtastic.shay-phone` on `:8787`, HTTPS via
  `tailscale serve`.
- **Auth:** token at `~/famtastic/shay-phone/.token`, supplied via `?k=<token>`
  query param or `X-Shay-Token` header.
- **Brain:** GLM-5.1 via gateway `:8642` (fallbacks Codex / Ollama / Gemini).

## Cutover 2026-06-07
- `jobs.json` is **RETIRED**; `kanban.db` is the single store.
- `KANBAN_DISPATCH=1` env flag set in launchctl; plist has
  `PATH=/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin`.
- Event spine: `~/.shay/events.jsonl`.

## ⚠ Pending action
The launchd plist **`KeepAlive` should be `true`** — it was flipped `false`
during debugging and needs to be restored, or the phone service won't auto-
respawn.

Related: [[kanban-task-board]].
