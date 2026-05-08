# AGENTS.md

Rules that apply to every agent surface (Claude Code, Cowork, Codex) working
in this repo. Surface-specific guidance lives in CLAUDE.md, and inside each
plugin / adapter.

## Agent Coordination (Conditional)

The automatic check-in requirement is paused by default.

Run `node scripts/agent-checkin.js --intent "<short description>"` from the
repo root only when Fritz explicitly says he is running multi-brain,
multi-agent, multi-session, parallel, or otherwise concurrent work.

When the check-in condition is active and the script reports overlapping
in-flight work, either coordinate with the other agent (read its branch,
propose merge) or pick a different scope. Respect scope-locks declared in
AGENT-COORDINATION.md.

Even while the automatic check-in requirement is paused, agents should still
avoid obvious known scope locks and should not knowingly overwrite another
agent's active work.

This rule exists to prevent the parallel-implementation problem where two
agent surfaces independently solve the same problem in incompatible ways
(observed 2026-05-05 with the .brain/ vs memory/ duplication), without
making every ordinary single-agent task pay the noise cost.

## Plan Closeout Rule (Non-Negotiable)

No plan may stay `status: active` with zero open tasks for more than one
session. Run `node scripts/plans/audit.js` at session end. Ship a closeout
packet (`completed`/`parked`/`superseded`), a checkpoint packet
(`checkpoint_complete`), or new tasks (`needs_tasking`) via
`node scripts/plans/closeout.js apply <packet.json>`. Schema:
`plans/CLOSEOUT-SCHEMA.md`.
