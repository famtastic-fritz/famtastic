---
title: OpenAI-Chronicle-Drain-Complaint
type: note
permalink: famtastic/05-captures/open-ai-chronicle-drain-complaint
---

# OpenAI Codex Chronicle — Subscription Drain Complaint

**Date:** 2026-06-12
**Status:** Pending — considering refund request or blog article
**Incidents:** 3 times in one week (week of 2026-06-06)

## What Happened

OpenAI's own feature — **Codex Chronicle** (built into the Codex desktop app) — silently drained the Codex subscription by running 24/7 in the background without clear user consent or visibility.

### The bug chain:
1. Codex.app installs and enables **Chronicle** (screen recording feature) automatically
2. Chronicle spawns `codex_chronicle` background process + periodic `codex exec --model gpt-5.5` jobs to summarize screen recordings into agent memories
3. These jobs run continuously, consuming Codex subscription quota silently — user has no dashboard visibility into Chronicle-specific usage
4. The volume of Chronicle API calls was high enough that **OpenAI's own auth system invalidated the session token** as a suspected security threat
5. This left the account **locked out AND quota-drained** — a double penalty for a feature the user never intentionally activated
6. User was forced to **purchase additional credits** to restore access

### Key evidence:
- Process: `/Applications/Codex.app/Contents/Resources/codex_chronicle` — running since app launch
- Process: `codex exec --json --model gpt-5.5` — live in-flight job running since 12:25AM, spawned by Chronicle
- Auth error: `HTTP 401: Your authentication token has been invalidated. Please try signing in again.`
- Required manual kill: `kill 52481 32646`
- Fix requires disabling Chronicle in Codex.app settings (not obvious to find)

## The Argument for a Refund

- **This happened 3 times in a single week** — this is not a one-time glitch, it is a repeating product defect
- Chronicle is an opt-in feature that behaves like an opt-out — it runs automatically with no clear disclosure of subscription cost
- The drain was caused by OpenAI's own software, not user behavior
- The auth invalidation (also triggered by Chronicle's call volume) compounded the damage — user lost access AND quota
- No usage alerts or warnings were shown before the subscription was exhausted
- User had to diagnose and kill the process manually with no help from OpenAI tooling
- Three separate purchases of credits were made to compensate for a bug in OpenAI's own product

## If No Refund → Blog Article

Working title: **"How OpenAI's Own App Silently Drained My Codex Subscription and Then Locked Me Out"**

Angle: Not a user error story — a product accountability story. OpenAI shipped a feature (Chronicle) that:
- Consumes paid API quota without clear disclosure
- Generates enough traffic to trigger their own fraud/abuse detection
- Leaves users locked out and out of pocket with no automated recourse

This is a strong story because it's reproducible, well-documented, and the irony is sharp — their own security system punished their own feature's behavior, at the user's expense.

## Next Steps
- [ ] Contact OpenAI support with the above evidence and request a refund
- [ ] If denied → write and publish the blog article
- [ ] Disable Chronicle permanently in Codex.app settings to prevent recurrence