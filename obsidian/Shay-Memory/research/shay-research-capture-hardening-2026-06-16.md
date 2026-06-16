---
title: Shay research capture hardening
type: note
permalink: shay-memory/research/shay-research-capture-hardening-2026-06-16
created_at: 2026-06-16T19:49:23.423614+00:00
summary: Hardened Shay's research loop so meaningful research leaves durable artifacts with source trace and capability notes instead of dying in chat residue.
question: How should Shay make future research reusable across sessions, especially GitHub scans and model audits?
resume_sentence: Open the Shay research capture hardening note and continue from the observations, interpretations, and next actions.
---

# Shay research capture hardening

## Summary
Hardened Shay's research loop so meaningful research leaves durable artifacts with source trace and capability notes instead of dying in chat residue.

## Research question
How should Shay make future research reusable across sessions, especially GitHub scans and model audits?

## Observations
- Existing automation reflected and mirrored memory, but the schedule audit documented no dedicated process-intelligence ledger and no middle layer for safe observation-to-review handling.
- Existing Shay research notes already lived under ~/famtastic/obsidian/Shay-Memory/research/, but there was no enforced protocol or helper for capturing new research artifacts consistently.
- Fritz explicitly stated that research should be treated as data whether or not it is useful today, because future solutions may depend on past scans and lessons.

## Interpretations
- The learning loop gap is not lack of storage alone; it is lack of a repeatable artifact contract that turns one-off research into reusable memory.
- The safest immediate fix is protocol + helper tooling + startup doctrine, not a risky runtime model switch or a fully autonomous watcher.
- The best cheap next-step integrations are reminder/surfacing layers, not heavyweight new storage. The current markdown + JSONL shape is already good enough to start compounding.

## Capability notes
- A new helper script now exists at shay-shay/scripts/research_capture.py to write markdown notes plus an append-only JSONL ledger entry.
- The shay-shay repo startup docs now state that meaningful research must leave durable artifacts with observation/interpretation separation and capability notes.

## Sources
- docs/agent-startup/AGENT-STARTUP-CONTRACT.md [doc] — local file — startup doctrine updated for all agent surfaces
- shay-shay/AGENTS.md [doc] — local file — repo-local enforcement rule for future sessions
- shay-shay/docs/shay-current-intelligence-schedule-audit-2026-06-13.md [doc] — local file — evidence of current automation gaps
- user directive in current chat [chat] — live conversation — research must be treated as durable data

## Next actions
- Adversarially review the new capture protocol and helper for missing major concerns.
- Fan out a research swarm for additional ideas on durable research capture and retrieval hardening.
- Consider a low-risk reminder layer inside proactive reflection or Command Center to surface uncaptured meaningful research without blocking fast work.

## Resume prompt
Open the Shay research capture hardening note and continue from the observations, interpretations, and next actions.
