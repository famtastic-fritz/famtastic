---
title: Shay Companion App — PRD (Shay builds it start-to-finish)
date: 2026-05-30
author: claude-code (Fritz directive)
tags:
- plan
- companion-app
- shay-phone
- prd
- instruction-intake
- feedback-loop
- self-update
permalink: shay-memory/plans/companion-app-prd-2026-05-30
---

# Shay Companion App — PRD

## Vision
Fritz's phone is the remote control for Shay: he gives instructions, watches her
work via heartbeats, gives feedback that she LEARNS from, and the app updates
itself safely. Builds ON the existing `shay-phone/` (640-line FastAPI-style
server + vanilla-JS PWA on :8787) — never from scratch.

## Current state (build ON this, do not duplicate)
- Server `shay-phone/server.py`: `/api/{chat,capture,ask,asks,answer,interview,
  dispatch,job,job/progress,job/complete,job/cancel,jobs,brains,recent,ping,v}`.
- PWA `web/{index.html,sw.js,manifest.webmanifest}` + icons; installed on Fritz's phone.
- `ask_shay.py`: blocking mid-run round-trip (agent asks → phone answers).
- Monitoring spine `shay-agent-os/notify.py`: heartbeat → `/api/job/progress`,
  sign-off → `/api/ask`, ledger `run-state.json`.

## Build approach (gates differ from the desktop)
The companion is Python + vanilla JS, NOT TypeScript. The ralph loop's TS
typecheck gate does not apply. Companion units gate on:
  - GATE-PY: `python3 -m py_compile server.py ask_shay.py` (+ any new .py) — 0 = pass.
  - GATE-BOOT: start server on a scratch port, `curl /api/ping` returns 200, then stop.
  - GATE-JS: `node --check web/*.js` for any new/edited JS.
These run through a companion-scoped ralph loop (`shay-phone/.ralph/`) reusing the
Phase-0 scoped-commit/rollback + heartbeat machinery, with `build_app`'s
test_cmd set to the python/boot gate instead of `npm run typecheck`.

## Units (Shay drives these with learning loops)

- **C1 — Instruction intake.** `/api/instruct` (POST {text}) → enqueue a Fritz
  instruction as a dispatch job with `source:"fritz-instruction"`; PWA gets an
  "Instruct Shay" input. Shay's job runner picks it up. GATE-PY + GATE-BOOT.
- **C2 — Feedback loop.** `/api/feedback` (POST {job_id, rating 1-5, note}) →
  append to `~/.shay/feedback.jsonl`; PWA shows 👍/👎 + note on each completed job.
  A nightly `reflect` reads feedback → writes a lesson into the vault learnings/
  (Retain/Recall/Reflect taxonomy). GATE-PY + GATE-BOOT.
- **C3 — Self-update pipeline (blackbox-poc pattern).** `/api/update` → tag
  current commit, `git pull --ff-only` in shay-phone, re-`py_compile`, restart
  server (launchd or exec), poll `/api/ping`; auto-rollback to the tag on boot
  failure. PWA "Update" button shows current `/api/v` + result. GATE-PY + GATE-BOOT.
- **C4 — Live heartbeat view.** PWA tab that polls `run-state.json` (exposed via
  `/api/arc`) → renders the current phase, last 20 events, and active job %. Turns
  the heartbeat stream into a watchable dashboard. GATE-JS + GATE-BOOT.
- **C5 — Sign-off inbox.** Promote `/api/asks` into a first-class PWA inbox with
  push-style polling + a badge count, so GO/NO-GO gates surface immediately on the
  phone. GATE-JS + GATE-BOOT.
- **C6 — Instruction → build bridge.** A Fritz instruction tagged `build:` routes
  to the desktop/companion ralph loop as a new PRD unit (Shay scaffolds it,
  gates it, reports back via heartbeat). Closes the loop: Fritz speaks → Shay builds.
  GATE-PY + GATE-BOOT.
- **C7 — End-to-end smoke.** Script that boots the server, posts an instruction,
  posts feedback, hits /api/arc, and asserts each returns 200 + expected shape.
  GATE-BOOT.

## Sequencing
Companion build is Phase 3-tier (runs AFTER the desktop arc Phases 0–2 are green
and a fresh cap window). C1→C2→C5 first (intake + feedback + sign-off inbox =
the "take instructions from Fritz" core), then C3 (self-update), C4 (dashboard),
C6 (build bridge), C7 (smoke). Each unit: heartbeat on start/finish, scoped
commit on pass, scoped rollback + prior-art on block, lesson captured.

## Done = Fritz can, from his phone:
instruct Shay → watch her work live → approve/reject at gates → rate the result →
trigger a safe self-update — and Shay gets measurably better each cycle from the
feedback.