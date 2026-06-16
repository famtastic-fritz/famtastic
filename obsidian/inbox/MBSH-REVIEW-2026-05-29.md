---
title: MBSH-REVIEW-2026-05-29
type: note
permalink: famtastic/00-inbox/mbsh-review-2026-05-29
---

# MBSH Reunion — Review & Open Tasks
*Created: 2026-05-29*

## Status
Swarm work committed. Branch: `swarm/premiere-revival`
Commit: `feat: swarm premiere revival — memorial grid, countdown, Harry avatar, UsherNote, hero spec, scene markers`

## What Was Done
- Memorial page names grid populated
- Countdown locked to 2026-10-10
- Hero spec written (HERO-SPEC.md) — prompts ready, images NOT generated yet
- Hi-Tide Harry avatar component built (harry.js, harry.css) — placeholder assets only
- UsherNote panel implemented
- Scene markers on all interior pages
- Memorial form with moderation queue

## Open Tasks
- [ ] Generate hero images via Media Studio (7 pages, prompts in HERO-SPEC.md)
- [ ] Source or generate actual Harry character assets (currently placeholder)
- [ ] Push to staging for Fritz visual inspection
- [ ] Fix API_BASE_URL null in prod config (blocks production deploy)
- [ ] Review and discuss direction — Fritz wants a full chat session captured here

## Discussion Needed
Fritz flagged this needs a sit-down conversation. Key topics:
- Overall creative direction + vibe check
- Harry character design decision
- Ticket/RSVP flow — is it wired or still mock?
- Production deploy timeline
- What "self-contained" means for this site (no external deps?)

## Notes
Everything on this site should be self-contained. No external dependencies.
A full planning chat should be captured and archived to this vault when it happens.