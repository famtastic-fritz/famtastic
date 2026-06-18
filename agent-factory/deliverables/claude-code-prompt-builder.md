# The Ultimate Claude Code Prompt Builder (Reusable)

A reusable system for composing high-leverage Claude Code prompts. It is opinionated,
checklist-driven, and outputs a single well-structured prompt from a few inputs.

## Why
Ad-hoc prompts drift. A builder enforces the parts that consistently move quality:
role, hard constraints, research-first ordering, explicit success criteria, proof
requirements, and an output contract.

## The 9-slot template
1. **Role / stance** — who the agent is and its default operating mode.
2. **Mission** — the single outcome, in one sentence.
3. **Context to load first** — files/docs to read before acting (research-first).
4. **Hard constraints** — invariants that must never be violated (the "non-negotiables").
5. **Reuse-before-generate** — where to look for existing solutions first.
6. **Plan gate** — when to stop and confirm vs. proceed autonomously.
7. **Success criteria** — observable, testable definition of done.
8. **Proof** — what artifact/output proves it worked (logs, tests, screenshots).
9. **Output contract** — exact shape of the deliverable.

## Composition rules
- Constraints are *imperative and specific* ("Use `TAG`, never `process.env.SITE_TAG`"),
  never vague ("write good code").
- Order matters: context → constraints → task → proof. Models honor earlier framing.
- Prefer one mission per prompt. Multi-mission prompts dilute attention.
- Always include a proof requirement; "it runs" beats "it should run".
- Bound autonomy explicitly: say when to ask vs. when to assume-and-log.

## Model selection note
Default to the most capable current Claude models for build/design work and reserve a
cheaper tier for triage/classification. The factory's `src/router.py` encodes exactly
this tiering; the prompt builder should emit a suggested tier per prompt.

See the runnable companion `prompt_builder.py` to generate prompts from a dict of slots.
