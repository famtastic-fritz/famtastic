---
title: 01-chinese-frontier-providers
type: note
permalink: famtastic/08-revenue/flat-rate-research/01-chinese-frontier-providers
---

# Flat-Rate Brains — Chinese/Frontier Providers (agent 1 of 3)
> Background swarm 2026-06-05. Raw. Synthesized into FLAT-RATE-BRAINS.md once all 3 land.
> FLAT-RATE = fixed $/month with an allowance. Metered & free-capped excluded.

## The win: flat-rate brains DO exist — the Chinese "coding plans"
| Provider | Flat plan | Models | Real cap | Shay-usable? | OpenAI-compat? | Verdict |
|---|---|---|---|---|---|---|
| **GLM Coding Plan (Z.ai)** | Lite $18 · Pro $30 · Max $80/mo (quarterly bill) | GLM-5.1, 5-Turbo, 4.7 | 5h rolling: ~80/200/800 prompts + weekly cap | ✅ API key; Claude Code/Cursor/Cline/OpenCode | ✅ `api.z.ai/api/openai/v1` **+ Anthropic-compat `api.z.ai/api/anthropic`** | **FLAT & USABLE — best pick** |
| **Kimi Code (Moonshot)** | $19 / $39 / $99 / $199/mo | kimi-for-coding (K2.6) | 300–1,200 calls/5h, pooled | ✅ explicit 3rd-party-agent docs | ✅ `api.moonshot.ai/v1` + Anthropic-compat | **FLAT & USABLE** |
| **MiniMax Token Plan** | $10 / $20 / $50 (+HS $40–150)/mo | M2.7 (+ image/speech/video) | 1,500 / 4,500 / 15,000 req/5h | ✅ standard OAI endpoint; no autonomous ban | ✅ | **FLAT & USABLE** |
| **StepFun Step Plan** | $6.99 → $99/mo | Step 3.5/3.7 Flash | $6.99 ≈ 100 prompts/5h (1 prompt ≈ 15–20 calls) | ✅ `api.stepfun.ai/step_plan/v1` | ✅ | **FLAT & USABLE (cheapest, lower tier)** |
| ⚠️ **Qwen Coding Plan (Alibaba)** | Lite ~$10 (closed to new) · Pro ~$50/mo | Qwen3.5+Kimi+GLM bundle | Pro ~6,000 req/5h | ✅ endpoint exists BUT… | ✅ | **⚠️ ToS BANS automated/non-interactive/batch — risky for Shay's autonomous loops** |
| Doubao/Volcengine | Trae $5 / ArkClaw ~$5–28 | Doubao-Seed | — | ❌ coding credits IDE-locked | API is OAI-compat (PAYG) | **IDE-LOCKED — skip** |
| DeepSeek | **METERED, no flat plan** | V4 Flash/Pro, R2 | ~$0.14/M in | ✅ | ✅ | **METERED ONLY (but pennies)** |
| Baichuan | metered/enterprise | M3 | — | enterprise | ✅ | **METERED/ENTERPRISE** |

## Picks for Shay
- **Primary: GLM Coding Plan $18/mo** — Anthropic-compatible endpoint = zero-friction drop-in; GLM-5.1 strong. Endpoint `https://api.z.ai/api/anthropic`. ⚠️ pricing volatile (was $3 in Feb → $18 in Apr); quarterly billing.
- **Secondary: Kimi Code $19/mo** — explicit third-party-agent support, OpenAI + Anthropic protocols, model `kimi-for-coding`.
- **Cheapest volume: StepFun $6.99/mo** — OAI-compat, no interactive-only restriction; Step 3.x Flash (below GLM/Kimi quality).
- **AVOID for autonomous Shay: Qwen Coding Plan** — ToS bans automated/batch use.
- **Doubao**: IDE-locked, skip. **DeepSeek**: no flat plan, but metered is pennies-cheap if you want it.

## Caveats
Chinese coding-plan pricing is VOLATILE (GLM doubled in 8 wks; Qwen Lite closed to new users). Verify on the official page before buying: z.ai/subscribe · kimi.com/membership/pricing · platform.minimax.io/subscribe · platform.stepfun.ai/step-plan.
The subscription API key is SEPARATE from each provider's PAYG/metered API — don't confuse them.