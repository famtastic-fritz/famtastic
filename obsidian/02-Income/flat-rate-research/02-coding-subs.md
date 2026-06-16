---
title: 02-coding-subs
type: note
permalink: famtastic/08-revenue/flat-rate-research/02-coding-subs
---

# Flat-Rate Brains — Western Coding Subs + Shay-usability (agent 2 of 3)
> Background swarm 2026-06-05. Raw. Key question: can Shay actually USE it (OpenAI-compat API), or is it IDE-locked?

## Flat & Shay-usable
| Product | Flat price | Models | Usable in Shay? | Verdict |
|---|---|---|---|---|
| **Poe** | $19.99 (1M pts) · $249.99 (12.5M) | Claude Opus 4.7, GPT-5.5, Gemini 3.5 + hundreds | ✅ **official** OpenAI-compat `api.poe.com/v1` (+ Anthropic), tool-calling + streaming | **BEST official multi-model flat (incl Claude)** — frontier burns points fast |
| **Claude Max 5x / 20x** | $100 / $200 | Claude Sonnet 4.5 / Opus 4.7 | ⚠️ **unofficial** — Meridian / claude-max-api-proxy bridges the Claude-Code OAuth to a local `/v1/chat/completions` (`127.0.0.1:3456`) | **Best Claude quality flat — but proxy is unofficial, could break on an Anthropic update** |
| Claude Pro | $20 | Sonnet 4.5 | same proxy, but rate-limits fast | too limited for agent loops |

## NOT usable for Shay (IDE-locked / no external API)
| Product | Price | Why not |
|---|---|---|
| **GitHub Copilot Pro/Pro+** | $10/$39 | **No official external API**; only reverse-eng proxies (ToS/ban risk). AND moving to **usage-based/credit billing June 2026.** ❌ (corrects earlier "use Copilot for flat Claude" — it can't be a real Shay provider) |
| Cursor Pro | $20 | SDK exposes Cursor's *agent runtime*, not a model endpoint. IDE-locked |
| Windsurf Pro | $20 | no external API, IDE-locked |
| Amazon Q Developer | $19 | AWS-walled, no OAI endpoint |
| JetBrains AI Ultimate | $30 | IDE-locked (BYOK = metered) |
| Perplexity Pro | $20 | API is metered; $5 credit removed |
| Tabnine | $59 | it's a BYOK *consumer*, not a provider |

## Picks
1. **Poe $19.99** — zero-setup, official API, multi-model incl Claude/GPT/Gemini. Start here.
2. **Claude Max via Meridian $100** — best Claude quality flat, unofficial proxy (treat as "good unofficial," not production SLA).
3. **Don't bother** wiring Copilot/Cursor/Windsurf into Shay — they're IDE platforms, not model APIs.