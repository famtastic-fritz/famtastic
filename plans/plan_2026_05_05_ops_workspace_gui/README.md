# Plan: FAMtastic Studio Operations Workspace GUI

- **ID:** `plan_2026_05_05_ops_workspace_gui`
- **Label:** `ops-workspace-gui`
- **Tags:** `platform-upgrades`, `studio-ui`, `ops`, `shay-shay`, `agent-management`
- **Status:** proposed
- **Created:** 2026-05-05
- **Owner:** Fritz

## Summary

Add an Operations workspace inside the existing Workbench shell that unifies
agent, job, plan, task, run, proof, gap, memory, review, and debt surfaces
behind an 11-tab sub-nav (Pulse · Plans · Tasks · Jobs · Runs · Proofs ·
Agents · Reviews · Gaps · Memory · Debt). Every record type has a distinct
visual language. Shay-Shay narrates state, never replaces it.

## MVP

**Jobs Tab first.** Six lanes (Queued · Approving · Running · Blocked · Done ·
Parked) plus a Stale Debt drawer that quarantines the 448 legacy worker-queue
items, with Migrate/Archive/Purge actions. WebSocket live updates. Job
inspector with Cancel/Park/Promote-to-Task. Shay-Shay one-sentence queue
summary in the drawer.

## Why this plan exists

A recent debug session revealed the UI showed "agents waiting" while the real
task ledger had no active work — 448 stale pending jobs from an old
worker-queue format were inflating the picture. This plan establishes a GUI
that distinguishes real work from execution jobs from stale debt, with
freshness as a first-class signal.

## Deliverables already produced (in design conversation)

- UX strategy (5 operating laws)
- Information architecture (11-tab Ops sub-nav inside Workbench)
- Per-screen specs for all 11 tabs (regions, panels, components, sample
  content, empty states, actions, Shay-Shay role)
- CLI/ledger/job-data seam diagram
- Record-type visual language table (PLAN ◇ indigo, TASK ☐ slate,
  JOB ▶ amber, RUN ● cyan, PROOF ▣ emerald, GAP △ coral, MEMORY ✦ violet,
  REVIEW ⛔ red-orange)
- ASCII wireframes for Pulse, Jobs, Tasks
- MVP recommendation (Jobs Tab first)

See `plan.json` for the full workstream breakdown.
