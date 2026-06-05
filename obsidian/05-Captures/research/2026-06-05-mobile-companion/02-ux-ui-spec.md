# Mobile Companion — UX/UI Spec (agent 2 of 3)
> Background swarm, 2026-06-05. Raw report (condensed). Full synthesis in SHAY-COMPANION-BUILD-BRIEF.md.

**Concept:** a dark-first **agent remote control** (not a chat app with an agent bolt-on). Mental model: "Shay is working on your Mac; this is the window into what she's doing and the mic to redirect her." Bar: above Telegram, level with Claude's app, distinct as a FAMtastic product.

## Information architecture — 5-tab bottom nav
`[ Brief ☀ ]  [ Tasks ⚡ ]  [ Chat ✦ ]  [ Dispatch ▷ ]  [ You ○ ]`
- **Brief** — morning digest (priorities + overnight summary + 1 pending CTA), auto-opens weekday mornings
- **Tasks** — the Claude-Code-"Code-tab" equivalent: filter bar (All/Working/Needs Input/Done), session cards w/ status dot (cyan=working, amber=blocked, rose=dead, gray=done), session detail w/ live activity log + diff viewer + inline approval
- **Chat** — conversation + the Interview Card
- **Dispatch** — pending approvals queue + new-task composer (voice/text/photo) + history
- **You** — autonomy level (Suggest/Copilot/Autopilot), notification budget, Mac health, quiet hours
- Badges: Tasks=amber when input needed; Dispatch=approval count; Brief=red dot if unread

## The Interview Card (Fritz's favorite — Claude's mobile fails to render it)
Renders `AskUserQuestion` (1–4 questions, 2–4 options, single/multi-select, optional preview) as a bottom-attached card: pill "SHAY IS ASKING", header + question, tappable option rows (radio/checkbox + description), "type your own" field, Submit, progress dots (Q 1 of 3). Multi-Q advances slide-up; prior Qs fade into thread. Ends with a read-only plan card → [Approve & Start] / [Let's adjust]. Remote: push "Shay has a question" → [Answer]/[Later] → deep-link to the card.

## 5 core jobs (flows)
1. **Monitor** — Tasks tab, live WebSocket stream, 5s refresh, connection health dot.
2. **Morning brief** — 7:30 push → Brief tab → priorities + overnight → open pending.
3. **Interview chat** — request → AskUserQuestion cards → plan card → approve → session spawns in Tasks.
4. **Dispatch/approve** — FAB composer (voice/text/photo) → task preview → dispatch; approvals w/ [Approve]/[Approve w/ note]/[Deny], bulk-approve via long-press, "auto-approve this tool this session".
5. **Notifications** — 4 types only (input needed / approval / job complete / morning brief); daily budget cap (default 5, then batch); quiet hours; **lock-screen approve/deny** (Codex pattern); grouped under one thread.

## Visual design
- **Color:** dark layered (#08090B→#2A2C2F), single accent **electric indigo #5B4FE8** (distinct from Claude teal); status cyan #00C2A8 / amber #F5A623 / rose #E84F4F.
- **Type:** **Space Grotesk** (display/headers/CTAs) + **Inter** (body/logs). Scale 28/20/15/12/10.
- **Components:** session card (12px radius, 3px status bar, amber warm-tint when blocked); interview card (56pt option rows); approval card (mono command preview, vertical buttons).
- **Motion:** purposeful only — interview slide-up 280ms, status crossfade 400ms, "thinking" = 3 breathing cyan dots (not a spinner).
- **Shay identity:** geometric glyph mark (animates while generating), no AI-avatar photo.

## Notable design decisions
5 tabs (Brief+Dispatch are distinct jobs) · interview as bottom sheet (keeps thread visible) · single accent (craft signal) · lock-screen approval (kills highest-friction moment) · notification budget (3–5/day ceiling from production research) · voice dispatch (walking/driving use case).

Sources: Claude Agent SDK user-input docs, Claude Code mobile issues #25115/#33625/#28508/#35125, Codex app features, Gemini Daily Brief, agentic-UX 2026 patterns.
