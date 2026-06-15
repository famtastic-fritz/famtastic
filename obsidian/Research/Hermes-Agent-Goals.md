---
title: Hermes-Agent-Goals
type: note
permalink: famtastic/research/hermes-agent-goals
---

# Hermes Agent — Persistent Goals (/goal) — Full Documentation

Extracted from: https://hermes-agent.nousresearch.com/docs/user-guide/features/goals
Date: 2026-05-27

---

## What is /goal?

`/goal` gives Hermes a standing objective that survives across turns. After every turn a lightweight judge model checks whether the goal is satisfied by the assistant's last response. If not, Hermes automatically feeds a continuation prompt back into the same session and keeps working — until the goal is achieved, you pause or clear it, or the turn budget runs out.

Inspired by Codex CLI 0.128.0's /goal by Eric Traut (OpenAI). The core idea — keep a goal alive across turns and don't stop until it's achieved — is theirs. Hermes' implementation is independent.

## When to Use It

Use `/goal` for tasks where you want Hermes to iterate on its own without you re-prompting every turn:
- "Fix every lint error in src/ and verify ruff check passes"
- "Port feature X from repo Y, including tests, and get CI green"
- "Investigate why session IDs sometimes drift and write up a report"
- "Build a small CLI to rename files by EXIF dates, then test it"

Tasks where you'd otherwise have to say "keep going" three times are where this shines.

## How It Works (The Ralph Loop)

1. **Goal accepted** — ⊙ Goal set (20-turn budget): <your goal>
2. **Turn 1 runs** — Hermes starts working as if you'd sent the goal as a normal message
3. **Judge runs** — after the turn, the judge model decides `done` or `continue`
4. **Loop fires if needed** — if `continue`, you'll see ↻ Continuing toward goal (1/20): <judge's reason>
5. **Terminates** — eventually you see either ✓ Goal achieved: <reason> or ⏸ Goal paused — N/20 turns used

## Commands

| Command | Action |
|---------|--------|
| `/goal <text>` | Set a standing objective |
| `/goal status` | Show current goal state |
| `/goal pause` | Pause the loop |
| `/goal resume` | Resume (resets counter to 0) |
| `/goal clear` | Clear the goal |

Works identically on CLI and all gateway platforms (Telegram, Discord, Slack, Matrix, Signal, WhatsApp, SMS, iMessage, Webhook, API server, web dashboard).

## Subgoals (/subgoal)

While a goal is active, append extra acceptance criteria:
- `/subgoal <text>` — adds numbered criteria
- `/subgoal remove <N>` — remove by number
- `/subgoal clear` — clear all subgoals

The judge must consider every subgoal before declaring done.

## The Judge Model

After every turn, an auxiliary model receives:
- The standing goal text
- The agent's most recent response (last ~4 KB)
- System prompt requiring strict JSON: `{"done": <bool>, "reason": "<rationale>"}`

The judge is deliberately conservative. False positives (done when not) are rarer than false negatives (continue when done).

**Fail-open semantics:** If the judge errors, verdict = `continue`. Broken judge never wedges progress.

**Choosing the judge model:** Configurable via `auxiliary.goal_judge` in config.yaml. Cheap fast model recommended (e.g., google/gemini-3-flash-preview on OpenRouter). ~200 output tokens per call.

## Turn Budget

- Default: 20 continuation turns (`goals.max_turns` in config.yaml)
- When budget hits: ⏸ Goal paused — N/20 turns used. Use `/goal resume` to reset counter.
- User messages always preempt the continuation loop

## Persistence

Goal state lives in `SessionDB.state_meta` keyed by `goal:<session_id>`. `/resume` picks up exactly where you left off — even across days.

## Configuration

```yaml
goals:
  max_turns: 20

auxiliary:
  goal_judge:
    provider: openrouter
    model: google/gemini-3-flash-preview
```

## Prompt Cache

The continuation prompt is appended as a plain user-role message. It does not mutate the system prompt or invalidate prompt cache. A 20-turn goal costs the same cache-wise as 20 normal turns.

## Key Takeaways for FAMtastic Agent OS

1. **Persistent goals** should be a core feature — not just a CLI command
2. **Judge model pattern** — lightweight evaluator that decides done/continue
3. **Turn budget** — prevents infinite loops, gives user control
4. **Subgoals** — allows mid-run refinement without resetting
5. **Fail-open** — broken judge never blocks progress
6. **Persistence** — goals survive session restarts
7. **Cheap judge** — use small fast models to keep costs down
8. **Preemption** — user messages always take priority over continuation