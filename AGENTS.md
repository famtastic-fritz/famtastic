# AGENTS.md

Rules that apply to every agent surface (Claude Code, Cowork, Codex) working
in this repo. Surface-specific guidance lives in CLAUDE.md, and inside each
plugin / adapter.

## Current Agent Startup Contract

Before non-trivial work, read `docs/agent-startup/AGENT-STARTUP-CONTRACT.md`.
It is the current orientation layer for Claude Code, Codex, Gemini, Cowork,
and other agent surfaces. It captures the current doctrine:
research-first, spec-shaped, proof-driven work; reuse before generate;
post-evaluation after meaningful jobs; Phase 2 priority is Visual Workflows &
Brand Systems.

## Agent Coordination (Paused by Default)

Agent check-in is paused by default because Fritz found the earlier mandatory
overlap detection too noisy during active FAMtastic work. Do **not** run
`node scripts/agent-checkin.js` as a mandatory prerequisite.

Only run check-in when Fritz explicitly says he is running multi-agent,
multi-session, parallel, or otherwise concurrent work and wants coordination
locks active. Otherwise, use lightweight human-readable notes in the active
plan/capture/report.

## Plan Closeout Rule (Non-Negotiable)

No plan may stay `status: active` with zero open tasks for more than one
session. Run `node scripts/plans/audit.js` at session end. Ship a closeout
packet (`completed`/`parked`/`superseded`), a checkpoint packet
(`checkpoint_complete`), or new tasks (`needs_tasking`) via
`node scripts/plans/closeout.js apply <packet.json>`. Schema:
`plans/CLOSEOUT-SCHEMA.md`.
