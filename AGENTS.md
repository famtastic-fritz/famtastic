# AGENTS.md

Rules that apply to every agent surface (Claude Code, Cowork, Codex) working
in this repo. Surface-specific guidance lives in CLAUDE.md, and inside each
plugin / adapter.

## Agent Coordination (Non-Negotiable)

Before scaffolding any new system, capability, or non-trivial workstream,
run `node scripts/agent-checkin.js --intent "<short description>"` from the
repo root. If it reports overlapping in-flight work, either coordinate
with the other agent (read its branch, propose merge) or pick a different
scope. Respect scope-locks declared in AGENT-COORDINATION.md.

This rule prevents the parallel-implementation problem where two agent
surfaces independently solve the same problem in incompatible ways
(observed 2026-05-05 with the .brain/ vs memory/ duplication).

## Plan Closeout Rule (Non-Negotiable)

No plan may stay `status: active` with zero open tasks for more than one
session. Run `node scripts/plans/audit.js` at session end. Ship a closeout
packet (`completed`/`parked`/`superseded`), a checkpoint packet
(`checkpoint_complete`), or new tasks (`needs_tasking`) via
`node scripts/plans/closeout.js apply <packet.json>`. Schema:
`plans/CLOSEOUT-SCHEMA.md`.
