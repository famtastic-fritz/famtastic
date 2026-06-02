# Fritz Companion App ⭐ (Fritz priority)

> The same way you talk to your second-in-command right now — but in your pocket.

A mobile-first chat app that talks to Shay the way this session works: you ask,
it answers, it can act. It also surfaces the Command Center daily briefing and
lets Shay reach you first via push. This is the **phone companion** already named
in `SHAY-MASTER-PLAN-2026-05-28.md` (Phase 3).

## The idea in one line

Thin client, Shay is the brain. The app sends your message to the Shay gateway
and streams back the answer — plus a "what needs you today" view fed by
`command-center/state.json`.

## First decisions

- **Stack** — PWA (fastest, installable, works on any device) vs React Native
  (best native push/widgets) vs reuse the existing `shay-desktop` Electron shell.
- **Transport/auth** — how the phone reaches the Shay gateway when you're off
  your home network (the master plan flags `API_SERVER_KEY` before any exposure).
- **Proactivity** — what Shay may message you unprompted vs what waits for you.

## Path

1. Architecture brief (chat client ↔ gateway).
2. Pick the stack.
3. MVP: phone chat that reaches Shay + shows the briefing.
4. Push, so Shay can reach you first — shared with `shay-omnipresent-assistant`'s
   reach fabric.
