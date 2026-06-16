---
title: stream-timeout-no-failover-2026-06-08
type: note
permalink: shay-memory/learnings/stream-timeout-no-failover-2026-06-08
---

# Learning: long-running orchestration must resume to completion (2026-06-08)

**Symptom:** Shay appeared to "write for a long time" but produced only tiny stubs. Root: glm-5.1 (Z.AI) streaming hit a flat 120s read timeout (`SHAY_STREAM_READ_TIMEOUT`, run_agent.py:7774). The read timeout measures the *gap between tokens*, not total length — a long reasoning pause >120s tripped it, then "not retrying" dead-ended the turn.

**Doctrine (Fritz):** Shay's role is ORCHESTRATION — long context/runtime is normal. The fix is NOT to switch models because a task is long. The fix is a mechanism that drives long tasks to **done on the same brain**.

**Immediate fix applied:** `SHAY_STREAM_READ_TIMEOUT=900` on the gateway plist + restart.

**Durable fix (rewrite REQ-14):** decompose long work into checkpointed idempotent steps; durable run-state so a dropped connection RESUMES (never restarts); heartbeat stall detection (distinguish "still reasoning" from "dead socket"); plan-aware compaction + retrieval so long context never naively truncates the plan; model-switch is an *availability* fallback only, never a response to length.

**Also found:** auxiliary `web_extract` sends model id `glm-5.1` to the **Gemini** endpoint → HTTP 404 (validate model-id-vs-provider, REQ-05).