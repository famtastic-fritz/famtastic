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
