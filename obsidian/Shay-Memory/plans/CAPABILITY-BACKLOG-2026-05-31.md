---
title: Shay Capability Backlog — Fritz's forward-looking gaps (recorded, NOT built)
date: 2026-05-31
author: claude-code (Fritz directive — "no changes yet")
tags:
- backlog
- capability-gap
- v2
- v3
- phone-control
- briefs
- credentials
- autonomy
permalink: shay-memory/plans/capability-backlog-2026-05-31
---

# Capability Backlog — recorded for Shay, not yet built

Fritz flagged these as future capabilities. NO changes made — this is the
standing record so Shay's brain carries them into future planning.

## 1. Phone-side task execution (V2)
Eventually Shay should DO things on the phone itself — open apps, read the
phone's files, automate the device — not just remote-control Shay-on-the-Mac.
- Requires a NATIVE Android app (Kotlin) with permissions: Android Intents
  (open apps), Storage Access Framework / MediaStore (files), Accessibility
  Service (UI automation), or Termux for shell.
- Android ALLOWS this (iOS hard-blocks it) → Android is the target platform.
- Status: V2. The installed PWA (current) is the remote-control layer; the
  native app is the "hands on the device" layer.

## 2. Brief-reading + triage surface (NEAR-TERM, low risk) — clear gap
Shay produces research (vault plans/reports) but there's NO mechanism to READ
them, especially from the phone, and ACT on them.
- Fritz's desired flow: read a brief on the phone → from there create a TODO,
  trigger FURTHER research, dispatch a job, or file it. (Read + triage, not edit.)
- Natural companion unit: a "Briefs" tab in the PWA that lists vault research
  docs (obsidian/Shay-Memory/plans + reports) → open to read → action buttons:
  [Make Todo] [Deeper Research] [Dispatch Job] [Archive]. Ties to existing
  /api/dispatch + a new /api/todo. Read-mostly → low risk.
- Status: strong candidate for the next companion phase (C-series). High value,
  low risk — closes the "research with no reader" loop.

## 3. Autonomous identity + credentials + provisioning (V2/V3 — HIGH value, HIGHEST risk)
Fritz's idea: give Shay a DEFAULT EMAIL + DEFAULT CREDITS she can use to do
things automatically — sign up for services, obtain/rotate API keys, pay for
things — so she can close loops without Fritz manually provisioning.

This is the "agent with its own identity + wallet" frontier. Real and powerful,
but it is the single highest-risk capability. It MUST be built guards-first:

- **Dedicated agent identity** — a Shay-only email (e.g. shay@<fritzdomain>),
  NOT Fritz's personal email. Isolates her actions, gives a recovery/notify
  channel, keeps an audit trail. (This part is a clean best practice — do first.)
- **Credential vault** — keychain-backed (NEVER plaintext; standing rule), with
  scoped, named credentials + a rotation routine. API-key rotation is itself
  valuable and ties to the brain-cap problem (rotate across keys/accounts).
- **Spend/provisioning policy layer** (non-negotiable before any wallet):
  - Hard budget cap (daily/total).
  - Service allowlist — Shay may only sign up to / pay pre-approved services.
  - Approval gate — anything over $X or any NEW service requires a phone
    sign-off (reuse the existing /api/ask mid-run round-trip).
  - Virtual-card pattern (Privacy.com / Stripe Issuing style) — per-vendor
    cards with limits, never the real card.
- **Audit ledger** — every credential use / signup / spend / rotation logged
  immutably (like the snapshot-ledger pattern).
- **Kill switch** — one command revokes all agent credentials.

Status: V2/V3. Design the guardrails (policy + audit + kill switch + virtual
cards) BEFORE granting any real credential or spend ability. The dedicated
agent email + keychain credential vault + API-key rotation are the safe first
slice; autonomous spend is the last, most-guarded slice.

## Sequencing recommendation
Near-term: #2 (brief-reader) — low risk, high value, fits companion phase.
V2: #1 (native phone control) + #3 first slice (agent email + cred vault + key rotation, no spend).
V3: #3 full (policy-gated autonomous provisioning + spend with virtual cards).