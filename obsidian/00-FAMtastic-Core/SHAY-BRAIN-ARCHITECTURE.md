# Shay Brain & Worker Architecture — the locked reference (2026-06-04)

> One place for the whole brain/cost setup, so it survives a restore and nobody
> (Shay, Fritz, or any agent) has to reconstruct it. Decisions made via a 5-question
> interview with Fritz on 2026-06-04. Source of truth for runtime config:
> `~/.shay/config.yaml` (+ this doc for the *why* and the worker lanes that live
> outside Shay).

## The two layers (Fritz's directive)

Shay is an **ORCHESTRATOR, not a worker.** Her brain thinks, plans, and *assigns*.
The actual work is **delegated** to cheaper lanes so expensive brain tokens are
spent only on decisions.

```
        ┌─────────────────────────────────────────────┐
        │  SHAY (orchestrator) — thinks + assigns       │
        │  brain: Gemini 3.1 Pro  →  fallbacks below    │
        └───────────────┬───────────────────────────────┘
                        │ delegates
        ┌───────────────┴───────────────┐
        ▼                               ▼
  complex / quality            high-volume / simple
  → CLAUDE CODE (Claude sub)   → OPENCODE GO ($10 open models)
                        │ overflow when caps hit
                        ▼
            free OpenRouter `:free` / local Ollama
```

## Brain chain (orchestration) — `~/.shay/config.yaml`

| Order | Provider / Model | Why | Cost |
|---|---|---|---|
| **Primary** | `gemini` / `gemini-3.1-pro-preview` | smartest brain | metered (cheap; Flash even cheaper) |
| Fallback 1 | `gemini` / `gemini-2.5-pro` | same key, stable GA (preview-breakage insurance) | metered |
| Fallback 2 | `copilot` / `claude-sonnet-4.6` | different provider+family (quota/outage insurance) | **Copilot Pro $9 flat** |
| Fallback 3 | `openai-codex` | another flat-rate brain (rejoins June 7) | sub (flat) |

Reasoning effort: **medium**. Max turns: 90.

## Worker lanes (delegated — NOT in Shay's config; configured in each agent's own tool)

| Lane | Tool | For | Cost |
|---|---|---|---|
| **Claude Code** | `claude` CLI (must be on Claude **subscription**, not API key) | complex / high-stakes bulk | sub (flat) |
| **OpenCode Go** | `opencode auth login` → Go key → `/models` | high-volume / simple bulk | **$10/mo** ($60/mo-equiv cap) |
| Overflow | OpenRouter `:free`, local Ollama, Gemini Flash | when a lane caps | $0 / pennies |

## Cost policy (why this is cheap)

- **Subscription-first, metered-API last.** Flat-rate subs (Copilot, Codex, OpenCode
  Go, Claude Code) carry the load; the metered Gemini key is overflow.
- **Root cause of the old "API is killing me":** Shay was defaulting to **OpenRouter
  pay-per-use** as her brain. That's gone — direct Gemini key now.
- **Caps trigger downshift, not surprise bills.** OpenCode Go "use balance after
  limits" = **OFF**; a cap returns a 429 → Shay falls to a cheaper lane.
- **Gemini API has no flat rate** (pay-per-token); flat-rate = the subs above.
  Default routine to **Flash** (~5-10x cheaper than Pro); reserve Pro for hard work.
- **Privacy:** Gemini free tier + GitHub "use my data for training" both train on
  your data → kept OFF / avoided. Paid Gemini key doesn't train on you.

## The 5 decisions (2026-06-04)

1. **Copilot → Pro** ($9-10). Upgrade at https://github.com/github-copilot/signup
2. **Add Codex** as a 4th brain fallback (auto-rejoins June 7)
3. **Bulk routing:** Claude Code = complex, OpenCode Go = simple
4. **Web research:** Tavily free tier (Shay's web tool); Perplexity kept for deep research
5. **First-job order:** (1) finish + verify setup → (2) recover June 2 research → (3) build the digital business card

## SOUL delegation directive (paste into `~/.shay/SOUL.md`)

This is what makes the delegation *actually happen* at runtime — without it, Shay may
grind bulk work on the paid brain. Add this block to her SOUL:

```markdown
## Delegation & cost discipline
I am an ORCHESTRATOR, not a grunt. My brain (Gemini 3.1 Pro) is for thinking,
planning, and assigning — never for bulk or repetitive work. Before I execute a
large or repeated task myself, I delegate it:
- Complex / high-stakes / quality-critical → delegate to **Claude Code**.
- High-volume / simple / repetitive → delegate to **OpenCode Go** (cheap open models).
- I do work directly on my own brain only when it's small, interactive, or part of
  reasoning/planning.
When a worker lane hits its cap, I downshift to the next cheaper lane (free models /
local) instead of escalating cost. Spend premium brain tokens on decisions, not labor.
```

## Setup checklist — to "finish + verify" (priority 1)

- [ ] Upgrade Copilot Pro → github.com/github-copilot/signup
- [ ] `shay fallback add` → **OpenAI Codex** (4th brain lane)
- [ ] `opencode auth login` → select opencode → paste Go key → `opencode` → `/models` pick a Go model
- [ ] Confirm Claude Code on subscription: `echo $ANTHROPIC_API_KEY` (empty) + `claude` shows your account
- [ ] `shay setup` → add **TAVILY_API_KEY** (research back on)
- [ ] Paste the **SOUL delegation directive** into `~/.shay/SOUL.md`
- [ ] OpenCode Go: turn **OFF** "Use your available balance after reaching the usage limits"
- [ ] *(optional)* Copilot privacy → "Suggestions matching public code" = **Blocked**
- [ ] **Verify:** `shay doctor` · `shay chat "say hi in five words"` · `shay fallback list`

Then → priority 2: `scripts/recover-codex-research.sh 2026-06-02`. Then → priority 3: the digital business card.
