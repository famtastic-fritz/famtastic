---
title: escalation-ladder-design-2026-05-31
type: note
permalink: shay-memory/research/escalation-ladder-design-2026-05-31
tags: [memory/l2, self-heal, repair-loop]
---

# Escalation Ladder — "Try harder until she genuinely can't" (Fritz directive, 2026-05-31)

## Principle
Replace "retry N times then give up" with a **graduated escalation ladder**: each failure
escalates EFFORT and pulls in MORE resources. Shay keeps climbing rungs — looping back with
any new information — and only stops at a true terminal ("she just can't"), with Fritz as the
last rung before she quits. Builds ON the H1 repair loop (which makes protocol-violations
retryable at all).

## The rungs (each failure climbs; new info resets to re-attempt with it)
0. **Retry** — transient? re-run once as-is.
1. **Diagnose** — read the ACTUAL error; form one hypothesis (systematic-debugging Phase 1). No blind fixes.
2. **Check TOOLS / capabilities** — does this role have the tool the task needs? (ties to H2 cap-check). If a required tool is missing → acquire/enable it, or this becomes the terminal reason (can't without it) → rung 8.
3. **Check MEMORY** — search buglog + lessons + prior session memos for this error signature (semantic recall; the memory backbone makes this strong). Has she solved this before?
4. **Check REPOS (prior art)** — grep the codebase for a WORKING example of the same pattern (reuse-before-generate).
5. **Check INTERNET** — web-search the exact error / the approach. Pull a known fix.
6. **Escalate BRAIN** — re-attempt on a stronger/different model (provider spread).
7. **DECOMPOSE** — break the task into smaller sub-units (synthesize_sections-style) and climb the ladder per-unit.
8. **Ask FRITZ** — signoff/ask with the FULL trail of what was tried at each rung. Human is the final escalation, not silent death.
9. **TERMINAL ("can't")** — only when: all rungs exhausted + no new information surfaced + the same failure repeats. STOP and block with the complete escalation trail.

## "Run forever" — bounded so it can't burn infinitely on an impossible task
- The ladder is the loop; it terminates at rung 9 (genuine can't), or when the
  `tool_loop_guardrails` hard-stop trips, or when Fritz says stop.
- **NOTE:** `tool_loop_guardrails.hard_stop_enabled` is currently **FALSE** — the absolute
  backstop is OFF. The ladder's terminal detector (rung 9) must serve as the real stop, and
  enabling a sane hard_stop is recommended so "run forever" ≠ "burn forever".
- **Budget:** Fritz wants no caps, only a low-funds notification. So escalate freely; the
  cost-telemetry/budget signal (B1) just NOTIFIES near a low-funds threshold — it does not cap.
- **No-progress detector:** if two full ladder climbs produce identical failure + zero new
  info, that IS the "can't" signal → rung 9.

## Where it lives
Extends the H1 repair loop in the dispatcher (kanban_db.py) + the worker self-heal path. The
"check memory/repos/internet" rungs reuse existing capabilities (buglog/lessons search = task
#56; vault/semantic recall; grep; web search) — wired as escalation steps, not new infra.
