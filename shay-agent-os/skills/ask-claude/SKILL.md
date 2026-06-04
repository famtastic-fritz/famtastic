---
name: ask-claude
description: |
  Phone-a-friend line to Claude (Opus/Sonnet). Use when you (Shay) — or any
  non-Claude brain — hit a hard or high-stakes decision and want a decisive second
  opinion: architecture forks, risky/irreversible actions, gnarly debugging, plan
  trade-offs, "am I about to do something dumb?" checks. Especially valuable while
  the brain is running on Gemini/Ollama and you want Claude's reasoning in the loop.
  Triggers: "ask claude", "consult claude", "second opinion", "get advice", "what
  would claude do", "escalate this decision".
metadata:
  author: famtastic
  version: "1.0"
  installed: 2026-06-04
---

# ask-claude — consult Claude for advice

A standing capability for the swarm: when the call is hard, ask the second-in-command.

## How to use

```bash
scripts/ask-claude "Should the financial-agents wallet be a Safe or an EOA, and why?"
echo "long multi-paragraph question…" | scripts/ask-claude
scripts/ask-claude --context plans/financial-agents/README.md "What's the biggest risk in this plan?"
```

Claude answers as your trusted advisor: recommendation first, then the reasoning,
concise. If context is missing it states an assumption and answers anyway.

## When to reach for it

- **Architecture forks** — two viable designs, you want a tiebreaker.
- **Irreversible / high-blast-radius actions** — before you delete, deploy, send,
  or pay, get a sanity check.
- **Stuck debugging** — you've looped twice with no progress.
- **Plan trade-offs** — sequencing, scope, what to cut.
- **Self-check** — "is this antithetical to what Fritz asked?"

## When NOT to

- Trivial/conversational turns — just answer.
- Things the brain (`.wolf/cerebrum.md`, `obsidian/`) already answers — recall first.
- Bulk/low-stakes work — that's what local models are for; don't burn a cloud call.

## How it works

`scripts/ask-claude` wraps the existing Claude adapter (`scripts/claude-cli` → the
authenticated `claude` CLI), falling back to `scripts/agents run claude`. It frames
your input as a second-opinion consult and leaves a brain trace. **Dependency:** an
authenticated `claude` CLI on the host (or `ANTHROPIC_API_KEY` for the fam-hub path).
No new credentials beyond what `fam-hub agent run claude` already uses.
