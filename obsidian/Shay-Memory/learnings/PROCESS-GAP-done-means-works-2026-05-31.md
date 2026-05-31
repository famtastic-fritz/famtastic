---
title: Process gap — "passes my gates" ≠ "works for the user" (do-not-repeat)
date: 2026-05-31
tags:
- process
- do-not-repeat
- qa
- definition-of-done
- gates
- self-attestation
permalink: shay-memory/learnings/process-gap-done-means-works-2026-05-31
---

# Hard process rule: "done" = runs + reachable + looks right + usable

## What kept happening (2026-05-31)
A string of issues shipped as "done" that were actually broken: dead IPC bridge
(white error screen), typed-but-unimplemented methods, white/unstyled UI, 20
screens built but UNREACHABLE (no nav), 4 real methods mis-stubbed, two-app
confusion. EVERY one passed typecheck/build/jsdom. Fritz caught them by eye.

## Root cause (one line)
Gates tested a LOWER layer than where the failure lived, and "done" was defined
as "compiles" not "works." Plus self-attested success (claimed green from gates I
wrote) instead of an independent check.

## DO-NOT-REPEAT rules
1. "Done" for ANY UI/feature unit = ALL of: typecheck → build → LAUNCH the real
   app → CONTRACT check (every typed method is a real function at runtime) →
   RENDER each touched screen → VISION score >= 8 → REACHABLE in nav. Not just typecheck.
2. The QA gate (.ralph/qa_gate.mjs contract + .ralph/visual_qa.py vision, `npm run qa`)
   is a REQUIRED gate in the ralph loop — not a hand-run tool.
3. Run adversarial code-review EVERY phase (it caught the mis-stubbed methods),
   not on-demand.
4. CONFIRM THE TARGET before touching a component/app (see DESKTOP-CANONICAL note).
   Never assume which app/file; verify (the space-vs-no-space trap).
5. Never trust generated code or a .d.ts as ground truth — verify against runtime.
6. NO self-attested "done." Require an independent signal: vision gate, reviewer,
   or human, before claiming complete.

## The tell
If a human can spot it in one glance (white screen, no nav, error text) but our
gates said "green," the gates are testing the wrong layer. Push gates UP to the
experience layer.