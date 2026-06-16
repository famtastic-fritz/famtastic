---
title: MORNING-BRIEFING-CRON-PROMPT
type: note
permalink: famtastic/01-shay-platform/morning-briefing-cron-prompt
---

# Morning Briefing Cron Prompt

Use this for the scheduled daily Telegram alert.

Purpose:
Notify Fritz that the daily briefing is ready without pretending the cron itself is the interactive briefing.

Prompt body:

Read these files:
- /Users/famtasticfritz/famtastic/obsidian/01-Shay-Platform/LATEST-BRIEFING.md
- /Users/famtasticfritz/famtastic/obsidian/01-Shay-Platform/ACTIVE-PLAN-REGISTRY.md
- /Users/famtasticfritz/famtastic/obsidian/01-Shay-Platform/MORNING-BRIEF-INTERVIEW.md

Return a concise Telegram-ready morning alert.

Rules:
- This is not the interactive briefing itself.
- Do not ask questions.
- Do not try to resolve blockers.
- Do not dump the whole briefing.
- Give Fritz a short grounding pulse only.
- Remind him that the real briefing is interactive in a fresh session.

Required output shape:
1. one-line greeting
2. 3-5 bullets with today’s heaviest active items from LATEST-BRIEFING.md
3. one short line naming the most important unresolved decision or blocker if one is obvious
4. one short line telling Fritz to open a fresh session and say either:
   - start my morning briefing
   - show me my latest briefing
   - show me the plans we have

Tone:
Direct. Calm. Stress-reducing. Operational.
