# Flat-Rate Brains for Shay — the 20, ranked & tagged (2026-06-05)

> Synthesis of a 3-agent swarm (Chinese providers · Western coding subs · Google/aggregators).
> Raw: `obsidian/08-Revenue/flat-rate-research/`. FLAT-RATE = fixed $/month with an allowance —
> NOT pay-per-token metered, NOT a daily-capped free tier. Verified + cited.

## The honest headline
Truly flat-rate LLM access is **rare** — and it does **not** exist for frontier models the way you'd hope.
But it DOES exist, and ~7 options are genuinely **flat AND wireable into Shay** (OpenAI-compatible). The
rest of the "20" are metered, IDE-locked, or scams — listed so you know what to ignore.

## Plain-English: what GLM & Poe are (+ the limits)
**GLM (Z.ai / Zhipu AI):** frontier model family from a major Chinese lab ("Z.ai" = its international brand).
GLM-5.1 is the flagship — ~Claude Opus 4.6 class for coding/agentic. The "GLM Coding Plan" is a flat sub with API
access that drops into Shay.
- **Limits:** Lite **$18/mo** ≈ ~80 prompts / rolling 5-hour window (+ weekly cap); Pro $30 ≈ ~200/5h; Max $80 ≈ ~800/5h. ("Prompt" ≈ one turn.)
- **Role:** the everyday FLAT workhorse brain — never metered, never 429s.
- **WIRING (verified 2026-06-05):** the Coding Plan subscription endpoint is **`https://api.z.ai/api/coding/paas/v4`** (NOT `/api/openai/v1` — that's the metered *general* API and 404s/needs a balance). Key in `~/.shay/.env` as `GLM_API_KEY`. **Flagship model id = `glm-5.1`** (also `glm-4.7`, `glm-5-turbo`; don't settle for `glm-4.6` — it's older). Lite includes all of them.

**Poe (by Quora):** one sub = access to MANY models (Claude Opus, GPT-5.5, Gemini, hundreds) via one app + one official API.
- **Limits:** **$19.99/mo = 1,000,000 points/month** (monthly reset). Cost per message varies by model: cheap (~50 pts) → thousands of calls; Claude Opus (~15,000 pts/msg) → ~60–70 messages. A wallet, not unlimited.
- **Role:** the "I need real Claude/GPT-5 today" wallet — use sparingly for frontier; burns fast on Opus.

**The combo ≈ $38/mo, fully flat:** GLM ($18) daily brain + Poe ($20) frontier-on-demand. No metering, no free-tier walls — the "stuck in the water" cure.

## TIER 1 — FLAT *and* Shay-usable (the real answer) ✅
| # | Provider | Flat $/mo | Models | Why it works for Shay |
|---|---|---|---|---|
| 1 | **GLM Coding Plan (Z.ai)** | **$18** | GLM-5.1 | **Best value.** OpenAI **+ Anthropic**-compat endpoints → zero-friction drop-in. Strong coding model. |
| 2 | **Poe** | **$19.99** | Claude Opus 4.7, GPT-5.5, Gemini 3.5 + 100s | **Best multi-model incl. CLAUDE.** Official OpenAI+Anthropic API. Allowance (1M pts) — frontier burns fast. |
| 3 | **Kimi Code (Moonshot)** | **$19** | kimi-for-coding (K2.6) | Official third-party-agent docs; OpenAI+Anthropic protocols. |
| 4 | **Featherless.ai** | **$10–25** | 36,800 OPEN models (Qwen/DeepSeek/Llama) | **Unlimited tokens**, OpenAI-compat. Only legit "unlimited." Cap = concurrency (2–4 parallel). No frontier. |
| 5 | **MiniMax Token Plan** | **$10** | M2.7 (+ media) | OpenAI-compat, no autonomous ban. |
| 6 | **StepFun Step Plan** | **$6.99** | Step 3.x Flash | Cheapest. OpenAI-compat. Lower quality tier. |
| 7 | **Claude Max 5x/20x** (via Meridian proxy) | **$100 / $200** | Claude Sonnet/Opus | **Best Claude quality flat** — but UNOFFICIAL proxy (could break on Anthropic update). The "flat Claude into Shay" path. |

## TIER 2 — flat but caveated ⚠️
| # | Provider | $/mo | Catch |
|---|---|---|---|
| 8 | **Qwen Coding Plan** | $10–50 | flat + bundles Qwen/Kimi/GLM — but **ToS BANS autonomous/script use** → risky for Shay |
| 9 | Poe Enterprise | $249.99 | 12.5M pts (volume) |
| 10 | Featherless Scale/Agent | $75–200 | higher concurrency for parallel agent loads |
| 11 | Doubao / Volcengine (Trae/ArkClaw) | ~$5 | coding credits **IDE-locked** |

## TIER 3 — NOT flat, or NOT usable in Shay (the "skip" list) ❌
| # | Provider | $/mo | Why skip |
|---|---|---|---|
| 12 | GitHub Copilot Pro/Pro+ | $10/$39 | **no official external API** + moving to credit/usage billing. (Can't be a real Shay provider) |
| 13 | Cursor Pro | $20 | IDE-locked; SDK ≠ model API |
| 14 | Windsurf Pro | $20 | IDE-locked, no API |
| 15 | Amazon Q Developer | $19 | AWS-walled |
| 16 | JetBrains AI Ultimate | $30 | IDE-locked |
| 17 | Perplexity Pro | $20 | API is metered |
| 18 | Google AI Pro / Ultra | $20 / $100–200 | GCP credits are **metered** spend, not flat API (+ billing bug). "Gemini **Spark**" — **doesn't exist** |
| 19 | Gemini Code Assist Std/Ent | $19 / $45 | IDE/CLI only; external API metered |
| 20 | DeepSeek / OpenRouter / Together / Fireworks / Groq / Cerebras | metered | all pay-per-token (DeepSeek is pennies-cheap though) |

## ⚠️ Scam warning
CISPA audit (Mar 2026): **~46% of "unlimited GPT-5/Claude API" resellers are FAKE** (serve 7B models). There is **no wholesale flat-rate tier for frontier models** — anyone selling "unlimited Claude for $20" is conning you. Featherless (open models only) is the one legit unlimited service.

## RECOMMENDATION for Shay
- **Daily flat brain → GLM Coding Plan $18/mo** (Anthropic-compat drop-in, never meters, never free-caps).
- **Claude/frontier on demand → Poe $19.99/mo** (official API; spend points on Opus/GPT-5 when you actually need them).
- **Together = ~$38/mo, fully flat, no metering, no free-tier walls** — exactly the "stuck in the water" cure.
- **Heavy Claude lifting (optional) → Claude Max via Meridian $100** (unofficial proxy; best quality if you accept the risk).
- **Cheap open-model bulk (optional) → Featherless $25** (unlimited tokens) or DeepSeek metered (pennies).
- Stop chasing flat *frontier* APIs — they don't exist; Poe's allowance is as close as it gets.
