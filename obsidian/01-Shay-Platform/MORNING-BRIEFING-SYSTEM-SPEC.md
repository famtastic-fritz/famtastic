---
title: MORNING-BRIEFING-SYSTEM-SPEC
type: note
permalink: famtastic/01-shay-platform/morning-briefing-system-spec
---

# Morning Briefing System Spec

## Goal
Create a daily operating rhythm that reduces Fritz’s stress by:
- gathering truth instead of relying on ambient pressure
- updating plans instead of only moving tasks
- surfacing what matters today
- preserving what matters even when it is not today’s direct focus
- allowing any new session to pick up the current map cleanly

## System components
1. DEEP-DIVE-CONVERSATION-PLAN-PARSE.md
   - broad map and initial project/plan extraction
2. ACTIVE-PLAN-REGISTRY.md
   - current active/parked plan index
3. LATEST-BRIEFING.md
   - current briefing artifact
4. MORNING-BRIEF-INTERVIEW.md
   - interactive process for fresh sessions

## Morning cadence
1. scheduled Telegram notification fires
2. Fritz opens a fresh session and says one of:
   - start my morning briefing
   - show me my latest briefing
   - show me the plans we have
3. session reads:
   - ACTIVE-PLAN-REGISTRY.md
   - LATEST-BRIEFING.md
   - MORNING-BRIEF-INTERVIEW.md
4. session runs interactive briefing
5. session updates plan state and latest briefing artifact

## Non-negotiable behaviors
- not a reminder-only system
- not a flat task-shuffle system
- not a one-way cron summary pretending to be a briefing
- must gather human state, fires, new obligations, and blockers
- must preserve emotional-weight items without letting them dominate today’s direct action list
- must keep active plans visible by state

## Default morning output shape
- Headspace summary
- Today’s fires
- Active plans and states
- Today’s direct actions
- Decisions needed from Fritz
- Queue-ready items
- Swarm candidates
- Blocked items
- Emotional weight / don’t lose
- Seed bank consciously parked

## Session command rules
- "show me my latest briefing" -> return latest briefing artifact
- "show me the plans we have" -> return active plans first, then parked on request
- "start my morning briefing" -> run interactive interview and write back latest briefing
- "continue my morning briefing" -> resume from latest state if available, else restart compactly

## Stress-relief rule
If the briefing increases cognitive load instead of reducing it, it is failing.
The brief should compress reality into command, not expand it into more noise.
