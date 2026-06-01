---
title: completion-watcher-design-2026-05-31
type: note
permalink: shay-memory/research/completion-watcher-design-2026-05-31
tags: [memory/l2, self-heal, verification, dispatcher]
---

# Completion Watcher / Reconciler — outcome from EVIDENCE, not self-report (Fritz, 2026-05-31)

## The hypothesis it addresses
Workers exit rc=0 without calling kanban_complete/block (A1, B3-v3, H1 — across Gemini AND
Claude). The dispatcher (kanban_db.py:3360-3393) ALREADY detects this and even names the cause:
"worker answered conversationally without calling kanban_complete." So the tool is likely
PRESENT — the model just narrates "done" in prose instead of invoking the tool. A cap-check
(H2) alone won't fix that. The robust fix: stop depending on the worker to self-report.

## The watcher already has a home
The dispatcher's protocol-violation handler IS the watcher point. Today it = "give up."
Change it to = "RECONCILE FROM EVIDENCE."

## What the reconciler does (on EVERY worker exit, not just violations)
1. **Gather evidence:** worker's final conversational output (it usually narrates what it did),
   workspace/repo diff (changed_files), and the task's declared GATE (import check + pytest).
2. **Run the gate** — objective truth, independent of what the worker said/called.
3. **Derive the outcome from evidence (override self-report both ways):**
   - **No tool call + gate GREEN + real changes** → auto-`kanban_complete` on the worker's
     behalf, tagged "reconciled-from-evidence: gate passed". (Fixes the protocol-violation.)
   - **Called kanban_complete BUT gate RED** → OVERRIDE to blocked/retry, tagged
     "self-attested done rejected: gate failed". (Fixes the B3 false-done.)
   - **Gate RED / no changes** → feed the ESCALATION LADDER (H3): retry harder, up to
     failure_limit; then block with the real reason + full trail.
   - **Gate GREEN + tool call** → complete normally.

## Why this is the unifying fix
It makes task outcome **evidence-determined**, never self-report-determined. One component
collapses three problems:
- protocol-violation (no call)        → reconciled by gate
- false-"done" (call but gate fails)  → overridden by gate  (this is D0, the verification gate)
- give-up brittleness                 → routed into the escalation ladder (H3)

So the Watcher SUPERSEDES H1 (basic retry) — H1's "retry protocol-violations" is just one branch
of the reconciler — and embodies D0 (no self-attested done) at the dispatcher level.

## Sequencing
- **W (this) supersedes H1.** Build it at kanban_db.py:3360 (the existing detection point).
- **H3 (escalation ladder)** becomes the "retry harder" branch the Watcher routes failures into
  → re-parent H3 onto W.
- **H2 (cap-check)** stays (guarantees the tool is at least present; complementary).
- Gate for W: a worker that exits WITHOUT calling kanban_complete but leaves a green gate is
  auto-completed (test it); a worker that calls complete with a red gate is overridden (test it).
- HAZARD: edits the live dispatcher — clean import + pytest gate; supervisor verifies read-only.
