---
title: interview-types-2026-05-31
type: note
permalink: shay-memory/research/interview-types-2026-05-31
---

# Interview Types Research for Shay's W6 Interview Feature
**Date:** 2026-05-31
**Purpose:** Define typed interview templates Shay should support for automated insight gathering and action generation.

## Prior Art Survey

Shay's interview system draws from established frameworks in structured interviewing, requirements elicitation, and coaching:

1. **Structured Interview Frameworks:**
   - STAR (Situation, Task, Action, Result) for behavioral interviewing
   - CAR (Context, Action, Result) for competency-based interviews
   - Funnel technique: broad → narrow → deep questioning
   - Source: ["The Structured Interview Handbook"](https://www.shrm.org/resourcesandtools/hr-topics/talent-acquisition/pages/structured-interview.aspx)

2. **Requirements Elicitation Frameworks:**
   - Use case interviews (Cockburn)
   - User story mapping (Patton)
   - Problem scenario interviews (Leonard & Rayport)
   - Source: ["Requirements Engineering Fundamentals"](https://www.iersb.org/)

3. **Coaching Question Frameworks:**
   - GROW (Goal, Reality, Options, Will)
   - FUEL (Frame, Understand, Explore, Layout)
   - CLEAR (Contract, Listen, Explore, Action, Review)
   - Source: ["Coaching for Performance"](https://www.johnwhitmore.co.uk/)

These inform Shay's typed interview design: each type has a specific purpose, ordered question sequence, synthesized artifact, and direct mapping to auto-created Kanban tasks via Shay's existing pipeline.

## Interview Type Templates

| Type | Purpose | Ordered Question Set (Shay asks one at a time) | Synthesized Artifact | Maps to Auto-Created Kanban Tasks |
|------|---------|-----------------------------------------------|----------------------|-----------------------------------|
| **Plan / Project Kickoff** | Align on vision, scope, success criteria, and initial work breakdown for a new project or initiative. | 1. What is the desired outcome or goal of this project?<br>2. What does success look like? How will we measure it?<br>3. What are the key deliverables or milestones?<br>4. What constraints (time, budget, resources) must we honor?<br>5. Who are the stakeholders and what are their roles?<br>6. What are the biggest risks or unknowns we need to address early?<br>7. What is the first concrete step we can take this week? | Project brief (markdown) containing: goal, success metrics, deliverables, constraints, stakeholder map, risk register, and initial task list. | Each deliverable/milestone → Kanban card in `Plans` list with label `project-kickoff`. Initial task list → Kanban cards in `To Do` list, linked to the project card via parent relationship. |
| **Needs Assessment** | Discover user/stakeholder problems, pain points, and desired outcomes to inform solution design. | 1. Describe a recent situation where you struggled with [topic].<br>2. What were you trying to accomplish in that moment?<br>3. What made it difficult or frustrating?<br>4. What would have made it easier or better?<br>5. If you could wave a magic wand, what would you change?<br>6. How often does this problem occur, and what impact does it have?<br>7. What have you tried so far to solve it?<br>8. What criteria would you use to evaluate a good solution? | Needs assessment report (markdown) containing: problem statements, user quotes, pain point severity/frequency, desired outcomes, and solution evaluation criteria. | Each distinct problem statement → Kanban card in `Discovery` list with label `needs-assessment`. Solution criteria → Kanban card in `Ready` list for design sprint planning. |
| **Retro / Post-Mortem** | Reflect on a completed effort to capture lessons learned, what worked, what didn't, and actionable improvements. | 1. What was the goal of this effort, and did we achieve it?<br>2. What went well? Give specific examples.<br>3. What did not go well? Where did we struggle?<br>4. What surprised us during the process?<br>5. What would we do differently if we could start over?<br>6. What is one concrete action we can take to improve next time?<br>7. What should we start, stop, or continue doing? | Retrospective document (markdown) containing: goals vs outcomes, wins, losses, surprises, and action items with owners and due dates. | Each action item → Kanban card in `Improvements` list with label `retro`. Wins/losses → Kanban cards in `Knowledge Base` list for future reference. |
| **Decision Brief** | Gather structured input to make a specific decision, capturing options, criteria, trade-offs, and recommendations. | 1. What decision needs to be made, and by when?<br>2. What are the available options or alternatives?<br>3. What criteria will we use to evaluate each option?<br>4. For each option, what are the pros and cons?<br>5. What data or evidence do we have for each option?<br>6. What are the risks or downsides of each option?<br>7. What is your recommendation, and why?<br>8. What additional information would help you feel more confident? | Decision record (markdown) containing: decision statement, options, evaluation criteria, pros/cons table, evidence summary, recommendation, and needed follow-up. | Each option → Kanban card in `Options` list with label `decision-brief`. Recommendation → Kanban card in `Ready` list for execution. Follow-up items → Kanban cards in `To Do` list. |
| **Idea Capture** | Flesh out a raw idea into a testable hypothesis, identifying assumptions, validation steps, and next experiments. | 1. What is the core idea or opportunity you see?<br>2. What problem does it solve, and for whom?<br>3. What assumptions are you making about the problem, solution, and users?<br>4. How could we test the riskiest assumption quickly and cheaply?<br>5. What would a minimal viable test (MVT) look like?<br>6. What metrics would tell us if the idea is working?<br>7. What resources do we need to run the test?<br>8. What is the first step to set up that test? | Idea blueprint (markdown) containing: problem statement, solution hypothesis, assumptions, validation plan, MVT design, success metrics, and resource list. | Each assumption → Kanban card in `Assumptions to Test` list with label `idea-capture`. Validation plan → Kanban card in `Experiments` list. MVT steps → Kanban cards in `To Do` list. |
| **Daily Standup** | Synchronize individual progress, identify blockers, and align on today's focus within a team context. | 1. What did you accomplish yesterday?<br>2. What are you working on today?<br>3. What blockers or impediments are you facing?<br>4. What support do you need to unblock?<br>5. What is your top priority for today?<br>6. Is there anything you need to coordinate with others? | Daily sync note (markdown) containing: yesterday's done, today's todo, blockers, support needed, and top priority. | Each blocker → Kanban card in `Blockers` list with label `daily-standup`. Today's todo items → Kanban cards in `In Progress` list. Support requests → Kanban cards in `To Do` list assigned to appropriate owner. |

## Recommended Default Template Set

For Shay's W6 launch, enable these six interview types as the core set. They cover the full lifecycle from discovery (needs assessment) through planning, execution (daily standup), reflection (retro), decision-making, and innovation (idea capture). Each template is designed to be completed in 5-10 minutes via Shay's conversational interface, with one question at a time to avoid cognitive overload.

## How the Cron 'Trigger' Message Opens an Interview

Shay's cron system can fire-and-forget an interview request via the existing proxy API, reusing the same mechanism that powers the Shay phone app interview feature.

### Desktop Trigger
1. Cron job executes `queue_interview()` in the Shay proxy (Python stdlib).
2. This creates an interview record in the proxy's backend and sends a notification to the Shay Desktop Electron app via IPC.
3. Desktop app displays a modal interview card with title, context, and first question.
4. User answers in the desktop app; each answer is POSTed to `/api/answer`.
5. After final answer, proxy returns the synthesized artifact and triggers Kanban task creation via the existing pipeline (`tasks/kanban` integration).

### Phone Trigger (Shay PWA)
1. Cron job executes `queue_interview()` (same as desktop).
2. Proxy sends a push notification (via service worker) to the Shay PWA on the user's phone.
3. PWA shows an interview card in the 🔔 Asks tab (or as a banner if app is open).
4. User taps to open, answers questions one at a time in the PWA interface.
5. Answers are POSTed to `/api/answer`; upon completion, PWA shows the synthesized artifact and can trigger Kanban task creation via the same desktop pipeline (the proxy handles the backend logic).

**Note:** No new APIs are invented; this reuses `/api/interview/create`, `/api/answer`, and the existing `ask_shay.interview()`/`queue_intervention()` functions from the Shay phone proxy (see `shay-phone/server.py` and `ask_shay.py` in the codebase).

## Integration with Shay's Pipeline & Tasks/Kanban

Each interview type's artifact synthesis step includes a call to the Kanban pipeline to auto-create tasks based on the interview output. This is implemented by extending the existing interview completion handler in the proxy to:

1. Parse the synthesized artifact for actionable items (using simple regex or markdown parsing).
2. For each item, call `kanban_create()` with appropriate title, assignee (default: user), and labels linking to the interview type.
3. Establish parent-child relationships where relevant (e.g., project kickoff deliverables parent the initial task list).
4. Return the created Kanban task IDs in the interview completion response for transparency.

This ensures every interview directly fuels actionable work in Shay's task system without manual transcription.

## Conclusion

By adopting these typed interview templates, Shay gains a structured yet conversational method to extract insights, decisions, and actions from users, seamlessly converting dialogue into trackable work via her Kanban system. The design leverages proven frameworks, reuses existing interview infrastructure, and maintains fidelity to Shay's principle of turning conversation into compounding systems.